import Fastify, { type FastifyInstance } from "fastify";
import type { ErouterConfig, RouteConfig } from "../config/loader.js";
import { matchPath } from "./routing.js";
import { UpstreamClient } from "../upstream/client.js";
import { aggregateJson } from "../aggregator/json-merge.js";
import { ResourcePool } from "../aggregator/pool.js";

export interface GatewayOptions {
  config: ErouterConfig;
  logger?: boolean;
  upstream?: UpstreamClient;
  pool?: ResourcePool;
}

export interface BuiltGateway {
  app: FastifyInstance;
  routes: RouteConfig[];
  upstream: UpstreamClient;
  pool: ResourcePool;
}

function pickRoute(
  routes: RouteConfig[],
  method: string,
  url: string,
): { route: RouteConfig; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.match.methods && !route.match.methods.includes(method)) continue;
    const params = matchPath(route.match.path, url);
    if (params) return { route, params };
  }
  return null;
}

export function buildGateway(opts: GatewayOptions): BuiltGateway {
  const app = Fastify({ logger: opts.logger ?? true });
  const upstream = opts.upstream ?? new UpstreamClient();
  const pool = opts.pool ?? new ResourcePool(opts.config.resources.pool.dir);

  app.get("/healthz", async () => ({ status: "ok" }));

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

  app.route({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    url: "/*",
    handler: async (req, reply) => {
      const found = pickRoute(opts.config.routes, req.method, req.url);
      if (!found) {
        void reply.code(404);
        return { error: "no_route", path: req.url };
      }
      const { route, params } = found;

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
        void reply.code(result.status).headers(result.headers);
        return result.body;
      }

      if (route.aggregator?.strategy === "json-merge") {
        const agg = await aggregateJson(upstream, route.aggregator, params);
        void reply.code(agg.status);
        return agg;
      }

      if (route.aggregator?.strategy === "pool" && route.aggregator.poolKey) {
        const key = route.aggregator.poolKey.replace(/\{([a-zA-Z_][\w]*)\}/g, (_, k) => {
          if (!(k in params)) throw new Error(`missing param '${k}'`);
          return params[k] ?? "";
        });
        const entry = await pool.load(key);
        if (!entry) {
          void reply.code(404);
          return { error: "pool_miss", key };
        }
        return { key: entry.key, type: entry.type, body: entry.body };
      }

      void reply.code(501);
      return { error: "route_not_implemented", id: route.id };
    },
  });

  return { app, routes: opts.config.routes, upstream, pool };
}
