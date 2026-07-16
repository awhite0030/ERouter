import Fastify, { type FastifyInstance } from "fastify";
import type {
  ErouterConfig,
  RouteConfig,
  RouteMatch,
} from "../config/loader.js";
import { matchPath } from "./routing.js";
import { UpstreamClient } from "../upstream/client.js";
import { aggregateJson } from "../aggregator/json-merge.js";
import { ResourcePool } from "../aggregator/pool.js";
import { resolveKey } from "./auth.js";
import { RateLimiter } from "./rate-limit.js";
import { TtlCache } from "./cache.js";
import { Metrics } from "./metrics.js";
import { applyTransform } from "./transform.js";
import { handleChatCompletions, handleListModels } from "../llm/proxy.js";
import { UsageTracker } from "../llm/usage.js";
import type { ChatCompletionRequest } from "../llm/types.js";

export interface GatewayOptions {
  config: ErouterConfig;
  logger?: boolean;
  upstream?: UpstreamClient;
  pool?: ResourcePool;
  metrics?: Metrics;
  usage?: UsageTracker;
}

export interface BuiltGateway {
  app: FastifyInstance;
  routes: RouteConfig[];
  upstream: UpstreamClient;
  pool: ResourcePool;
  metrics: Metrics;
  usage: UsageTracker;
}

function pickRoute(
  routes: RouteConfig[],
  method: string,
  url: string,
): { route: RouteConfig; params: Record<string, string> } | null {
  for (const route of routes) {
    const m = route.match as RouteMatch;
    if (m.methods && !m.methods.includes(method)) continue;
    const params = matchPath(m.path, url);
    if (params) return { route, params };
  }
  return null;
}

function cacheKey(route: RouteConfig, params: Record<string, string>, method: string): string {
  return `${method}|${route.id}|${JSON.stringify(params)}`;
}

export function buildGateway(opts: GatewayOptions): BuiltGateway {
  const app = Fastify({ logger: opts.logger ?? true });
  const upstream = opts.upstream ?? new UpstreamClient();
  const pool = opts.pool ?? new ResourcePool(opts.config.resources.pool.dir);
  const metrics = opts.metrics ?? new Metrics();
  const usage = opts.usage ?? new UsageTracker();

  const authCfg = opts.config.auth;
  const rlCfg = opts.config.rateLimit;
  const cacheCfg = opts.config.cache;
  const llmCfg = opts.config.llm;
  const cache = new TtlCache<unknown>({
    defaultTtlMs: cacheCfg?.defaultTtlMs ?? 30_000,
    maxEntries: cacheCfg?.maxEntries ?? 1_000,
  });

  app.get("/healthz", async () => ({
    status: "ok",
    uptimeMs: metrics.uptimeMs(),
    llm: Boolean(llmCfg?.enabled),
  }));

  app.get("/metrics", async () => {
    const snap: Record<string, unknown> = { ...metrics.snapshot() };
    snap.cache = cache.stats();
    if (llmCfg?.enabled && (llmCfg.usage?.enabled ?? true)) {
      snap.llm = usage.snapshot();
    }
    return snap;
  });

  app.get("/admin/routes", async () => ({
    routes: opts.config.routes.map((r) => ({ id: r.id, match: r.match })),
    llm: llmCfg?.enabled
      ? {
          basePath: llmCfg.basePath ?? "/v1",
          providers: llmCfg.providers.map((p) => p.id),
          combos: llmCfg.combos.map((c) => c.id),
        }
      : null,
  }));

  app.get("/pool", async () => ({ keys: await pool.list() }));
  app.get("/pool/:key", async (req, reply) => {
    const { key } = req.params as { key: string };
    const entry = await pool.load(key);
    if (!entry) {
      void reply.code(404);
      return { error: "not_found", key };
    }
    return { key: entry.key, type: entry.type, body: entry.body };
  });

  const perKeyLimiters = new Map<string, RateLimiter>();
  function limiterFor(rpm: number, burst: number): RateLimiter {
    const key = `${rpm}|${burst}`;
    let l = perKeyLimiters.get(key);
    if (!l) {
      l = new RateLimiter({ rpm, burst });
      perKeyLimiters.set(key, l);
    }
    return l;
  }

  function enforceAuth(req: { headers: Record<string, unknown> }, reply: {
    header: (k: string, v: string) => void;
    code: (n: number) => void;
  }): { ok: true } | { ok: false; body: unknown; status: number } {
    if (!authCfg?.enabled) return { ok: true };
    const key = resolveKey({ headers: req.headers }, authCfg);
    if (!key) {
      metrics.observeRequest(401);
      return { ok: false, status: 401, body: { error: "unauthorized" } };
    }
    if (rlCfg?.enabled) {
      const limiter = limiterFor(key.rpm, key.burst);
      const decision = limiter.take(key.id);
      reply.header("x-ratelimit-remaining", String(decision.remaining));
      if (!decision.allowed) {
        reply.header("retry-after", String(Math.ceil(decision.resetMs / 1000)));
        metrics.observeRequest(429);
        return {
          ok: false,
          status: 429,
          body: { error: "rate_limited", retryAfterMs: decision.resetMs },
        };
      }
    }
    return { ok: true };
  }

  // --- OpenAI-compatible LLM surface (9router-inspired) ---
  if (llmCfg?.enabled) {
    const base = (llmCfg.basePath ?? "/v1").replace(/\/+$/, "") || "/v1";
    const llmAuth = llmCfg.requireAuth ?? Boolean(authCfg?.enabled);

    app.get(`${base}/models`, async (req, reply) => {
      if (llmAuth) {
        const gate = enforceAuth(req as { headers: Record<string, unknown> }, reply);
        if (!gate.ok) {
          void reply.code(gate.status);
          return gate.body;
        }
      }
      metrics.observeRequest(200);
      return handleListModels(llmCfg);
    });

    app.post(`${base}/chat/completions`, async (req, reply) => {
      if (llmAuth) {
        const gate = enforceAuth(req as { headers: Record<string, unknown> }, reply);
        if (!gate.ok) {
          void reply.code(gate.status);
          return gate.body;
        }
      }
      const body = (req.body ?? {}) as ChatCompletionRequest;
      if (!body.model || !Array.isArray(body.messages)) {
        metrics.observeRequest(400);
        void reply.code(400);
        return {
          error: {
            message: "body must include model and messages[]",
            type: "invalid_request_error",
          },
        };
      }
      if (body.stream === true) {
        metrics.observeRequest(501);
        void reply.code(501);
        return {
          error: {
            message: "stream=true is not implemented yet; set stream=false",
            type: "not_implemented",
          },
        };
      }
      const result = await handleChatCompletions(
        { config: llmCfg, upstream, usage },
        body,
      );
      for (const [k, v] of Object.entries(result.headers)) {
        reply.header(k, v);
      }
      metrics.observeRequest(result.status);
      void reply.code(result.status);
      return result.body;
    });
  }

  app.route({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    url: "/*",
    handler: async (req, reply) => {
      const startedAt = Date.now();

      const gate = enforceAuth(req as { headers: Record<string, unknown> }, reply);
      if (!gate.ok) {
        void reply.code(gate.status);
        return gate.body;
      }

      const found = pickRoute(opts.config.routes, req.method, req.url);
      if (!found) {
        metrics.observeRequest(404);
        void reply.code(404);
        return { error: "no_route", path: req.url };
      }
      const { route, params } = found;

      const useCache = Boolean(cacheCfg?.enabled && route.cache && req.method === "GET");
      const cKey = useCache ? cacheKey(route, params, req.method) : null;
      if (cKey) {
        const hit = cache.get(cKey);
        if (hit !== undefined) {
          metrics.observeRoute(route.id, Date.now() - startedAt);
          metrics.observeRequest(200);
          void reply.code(200);
          return hit;
        }
      }

      try {
        let payload: unknown;
        let status = 200;

        if (route.upstream) {
          const url = route.upstream.url.replace(/\{([a-zA-Z_][\w]*)\}/g, (_, k) => {
            if (!(k in params)) throw new Error(`missing param '${k}'`);
            return encodeURIComponent(params[k] ?? "");
          });
          const result = await upstream.send({
            url,
            method: route.upstream.method ?? req.method,
            ...(route.upstream.headers ? { headers: route.upstream.headers } : {}),
            ...(route.upstream.timeoutMs ? { timeoutMs: route.upstream.timeoutMs } : {}),
          });
          status = result.status;
          try {
            payload = result.body.length > 0 ? JSON.parse(result.body) : null;
          } catch {
            payload = { raw: result.body };
          }
        } else if (route.aggregator?.strategy === "json-merge") {
          const agg = await aggregateJson(upstream, route.aggregator, params, metrics);
          status = agg.status;
          payload = agg;
        } else if (route.aggregator?.strategy === "pool" && route.aggregator.poolKey) {
          const key = route.aggregator.poolKey.replace(/\{([a-zA-Z_][\w]*)\}/g, (_, k) => {
            if (!(k in params)) throw new Error(`missing param '${k}'`);
            return params[k] ?? "";
          });
          const entry = await pool.load(key);
          if (!entry) {
            metrics.observeRequest(404);
            void reply.code(404);
            return { error: "pool_miss", key };
          }
          status = 200;
          payload = { key: entry.key, type: entry.type, body: entry.body };
        } else {
          metrics.observeRequest(501);
          void reply.code(501);
          return { error: "route_not_implemented", id: route.id };
        }

        const transformed = applyTransform(payload, route.transform);
        if (cKey && status === 200) cache.set(cKey, transformed, route.cache?.ttlMs);

        metrics.observeRoute(route.id, Date.now() - startedAt);
        metrics.observeRequest(status);
        void reply.code(status);
        return transformed;
      } catch (err) {
        metrics.observeRequest(502);
        void reply.code(502);
        return {
          error: "upstream_failure",
          message: err instanceof Error ? err.message : String(err),
        };
      }
    },
  });

  return { app, routes: opts.config.routes, upstream, pool, metrics, usage };
}
