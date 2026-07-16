import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type { TransformConfig } from "../gateway/transform.js";
import type { ApiKey } from "../gateway/auth.js";
import type {
  ComboModelRef,
  LlmComboConfig,
  LlmConfig,
  LlmProviderConfig,
  ProviderTier,
} from "../llm/types.js";

export interface RouteMatch {
  path: string;
  methods?: string[];
}

export interface UpstreamConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

export interface AggregatorSource {
  id: string;
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface AggregatorConfig {
  strategy: "json-merge" | "pool";
  sources: AggregatorSource[];
  merge?: {
    as: string;
    pick?: Record<string, string>;
  };
  poolKey?: string;
}

export interface RouteConfig {
  id: string;
  match: RouteMatch;
  upstream?: UpstreamConfig;
  aggregator?: AggregatorConfig;
  transform?: TransformConfig;
  cache?: {
    ttlMs: number;
  };
}

export interface PoolConfig {
  dir: string;
}

export interface ResourcesConfig {
  pool: PoolConfig;
}

export interface AuthConfig {
  enabled: boolean;
  header: string;
  keys: ApiKey[];
}

export interface RateLimitConfig {
  enabled: boolean;
  defaultRpm: number;
  defaultBurst: number;
}

export interface CacheConfig {
  enabled: boolean;
  defaultTtlMs: number;
  maxEntries: number;
}

export interface ErouterConfig {
  server: {
    host: string;
    port: number;
  };
  auth?: AuthConfig;
  rateLimit?: RateLimitConfig;
  cache?: CacheConfig;
  routes: RouteConfig[];
  resources: ResourcesConfig;
  /** OpenAI-compatible LLM router (9router-inspired, YAML-first) */
  llm?: LlmConfig;
}

function required(obj: Record<string, unknown>, key: string, path: string): unknown {
  if (!(key in obj)) {
    throw new Error(`missing required field '${key}' at ${path}`);
  }
  return obj[key];
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`expected non-empty string at ${path}`);
  }
  return value;
}

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`expected object at ${path}`);
  }
  return value as Record<string, unknown>;
}

function parseAuth(value: unknown): AuthConfig | undefined {
  if (!value) return undefined;
  const a = asObject(value, "$.auth");
  const keysRaw = a["keys"];
  if (!Array.isArray(keysRaw)) {
    throw new Error("expected array at $.auth.keys");
  }
  const keys: ApiKey[] = keysRaw.map((k, i) => {
    const o = asObject(k, `$.auth.keys[${i}]`);
    return {
      id: asString(o["id"], `$.auth.keys[${i}].id`),
      secret: asString(o["secret"], `$.auth.keys[${i}].secret`),
      ...(Array.isArray(o["scopes"]) ? { scopes: o["scopes"] as string[] } : {}),
      ...(typeof o["rpm"] === "number" ? { rpm: o["rpm"] } : {}),
      ...(typeof o["burst"] === "number" ? { burst: o["burst"] } : {}),
    };
  });
  return {
    enabled: Boolean(a["enabled"] ?? true),
    header: typeof a["header"] === "string" ? (a["header"] as string) : "x-api-key",
    keys,
  };
}

function parseRateLimit(value: unknown): RateLimitConfig | undefined {
  if (!value) return undefined;
  const r = asObject(value, "$.rateLimit");
  return {
    enabled: Boolean(r["enabled"] ?? true),
    defaultRpm: typeof r["defaultRpm"] === "number" ? (r["defaultRpm"] as number) : 60,
    defaultBurst: typeof r["defaultBurst"] === "number" ? (r["defaultBurst"] as number) : 60,
  };
}

function parseCache(value: unknown): CacheConfig | undefined {
  if (!value) return undefined;
  const c = asObject(value, "$.cache");
  return {
    enabled: Boolean(c["enabled"] ?? true),
    defaultTtlMs: typeof c["defaultTtlMs"] === "number" ? (c["defaultTtlMs"] as number) : 30_000,
    maxEntries: typeof c["maxEntries"] === "number" ? (c["maxEntries"] as number) : 1_000,
  };
}

function asTier(value: unknown, path: string): ProviderTier | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === "subscription" || value === "cheap" || value === "free") return value;
  throw new Error(`expected tier subscription|cheap|free at ${path}`);
}

function parseLlm(value: unknown): LlmConfig | undefined {
  if (!value) return undefined;
  const root = asObject(value, "$.llm");
  const providersRaw = root["providers"];
  if (!Array.isArray(providersRaw)) {
    throw new Error("expected array at $.llm.providers");
  }
  const providers: LlmProviderConfig[] = providersRaw.map((p, i) => {
    const o = asObject(p, `$.llm.providers[${i}]`);
    const modelsRaw = o["models"];
    if (!Array.isArray(modelsRaw) || modelsRaw.length === 0) {
      throw new Error(`expected non-empty models at $.llm.providers[${i}].models`);
    }
    const tier = asTier(o["tier"], `$.llm.providers[${i}].tier`);
    const authHeader = o["authHeader"];
    const out: LlmProviderConfig = {
      id: asString(o["id"], `$.llm.providers[${i}].id`),
      baseUrl: asString(o["baseUrl"], `$.llm.providers[${i}].baseUrl`),
      models: modelsRaw.map(String),
    };
    if (typeof o["apiKey"] === "string") out.apiKey = o["apiKey"] as string;
    if (typeof o["apiKeyEnv"] === "string") out.apiKeyEnv = o["apiKeyEnv"] as string;
    if (authHeader === "bearer" || authHeader === "x-api-key" || authHeader === "none") {
      out.authHeader = authHeader;
    }
    if (tier) out.tier = tier;
    if (typeof o["costInPer1M"] === "number") out.costInPer1M = o["costInPer1M"] as number;
    if (typeof o["costOutPer1M"] === "number") out.costOutPer1M = o["costOutPer1M"] as number;
    if (typeof o["timeoutMs"] === "number") out.timeoutMs = o["timeoutMs"] as number;
    if (typeof o["retries"] === "number") out.retries = o["retries"] as number;
    if (o["headers"] && typeof o["headers"] === "object") {
      out.headers = o["headers"] as Record<string, string>;
    }
    return out;
  });

  const combosRaw = root["combos"];
  const combos: LlmComboConfig[] = [];
  if (combosRaw !== undefined) {
    if (!Array.isArray(combosRaw)) throw new Error("expected array at $.llm.combos");
    for (let i = 0; i < combosRaw.length; i++) {
      const o = asObject(combosRaw[i], `$.llm.combos[${i}]`);
      const modelsRaw = o["models"];
      if (!Array.isArray(modelsRaw) || modelsRaw.length === 0) {
        throw new Error(`expected non-empty models at $.llm.combos[${i}].models`);
      }
      const models: ComboModelRef[] = modelsRaw.map((m, j) => {
        const mo = asObject(m, `$.llm.combos[${i}].models[${j}]`);
        const tier = asTier(mo["tier"], `$.llm.combos[${i}].models[${j}].tier`);
        const ref: ComboModelRef = {
          provider: asString(mo["provider"], `$.llm.combos[${i}].models[${j}].provider`),
          model: asString(mo["model"], `$.llm.combos[${i}].models[${j}].model`),
        };
        if (tier) ref.tier = tier;
        if (typeof mo["weight"] === "number") ref.weight = mo["weight"] as number;
        return ref;
      });
      const combo: LlmComboConfig = {
        id: asString(o["id"], `$.llm.combos[${i}].id`),
        models,
      };
      if (typeof o["description"] === "string") combo.description = o["description"] as string;
      combos.push(combo);
    }
  }

  const ecompressRaw = root["ecompress"];
  let ecompress: LlmConfig["ecompress"];
  if (ecompressRaw && typeof ecompressRaw === "object") {
    const e = ecompressRaw as Record<string, unknown>;
    ecompress = {
      enabled: Boolean(e["enabled"] ?? true),
      ...(typeof e["maxToolResultChars"] === "number"
        ? { maxToolResultChars: e["maxToolResultChars"] as number }
        : {}),
      ...(typeof e["minCharsToCompress"] === "number"
        ? { minCharsToCompress: e["minCharsToCompress"] as number }
        : {}),
    };
  }

  const leanMode = root["leanMode"];
  const llm: LlmConfig = {
    enabled: Boolean(root["enabled"] ?? true),
    providers,
    combos,
  };
  if (typeof root["basePath"] === "string") llm.basePath = root["basePath"] as string;
  if (typeof root["requireAuth"] === "boolean") llm.requireAuth = root["requireAuth"] as boolean;
  if (ecompress) llm.ecompress = ecompress;
  if (root["promptPool"] && typeof root["promptPool"] === "object") {
    const p = root["promptPool"] as Record<string, unknown>;
    llm.promptPool = {
      enabled: Boolean(p["enabled"] ?? true),
      ...(typeof p["prefix"] === "string" ? { prefix: p["prefix"] as string } : {}),
    };
  }
  if (root["ensemble"] && typeof root["ensemble"] === "object") {
    const e = root["ensemble"] as Record<string, unknown>;
    const strategy = e["defaultStrategy"];
    llm.ensemble = {
      ...(strategy === "first-ok" || strategy === "concat" || strategy === "vote-longest"
        ? { defaultStrategy: strategy }
        : {}),
      ...(typeof e["maxParallel"] === "number" ? { maxParallel: e["maxParallel"] as number } : {}),
    };
  }
  if (root["usage"] && typeof root["usage"] === "object") {
    llm.usage = { enabled: Boolean((root["usage"] as { enabled?: boolean }).enabled ?? true) };
  }
  if (typeof root["defaultSystemPrompt"] === "string") {
    llm.defaultSystemPrompt = root["defaultSystemPrompt"] as string;
  }
  if (leanMode === "off" || leanMode === "lite" || leanMode === "full") {
    llm.leanMode = leanMode;
  }
  return llm;
}

export function parseConfig(raw: unknown): ErouterConfig {
  const root = asObject(raw, "$");
  const server = asObject(required(root, "server", "$.server"), "$.server");
  const routesRaw = required(root, "routes", "$.routes");
  if (!Array.isArray(routesRaw)) {
    throw new Error("expected array at $.routes");
  }
  const resources = asObject(
    required(root, "resources", "$.resources"),
    "$.resources",
  );
  const pool = asObject(
    required(resources, "pool", "$.resources.pool"),
    "$.resources.pool",
  );

  const routes: RouteConfig[] = routesRaw.map((entry, i) => {
    const r = asObject(entry, `$.routes[${i}]`);
    const match = asObject(
      required(r, "match", `$.routes[${i}].match`),
      `$.routes[${i}].match`,
    );
    const path = asString(
      required(match, "path", `$.routes[${i}].match.path`),
      `$.routes[${i}].match.path`,
    );
    const id = asString(
      required(r, "id", `$.routes[${i}].id`),
      `$.routes[${i}].id`,
    );
    if (r.upstream && r.aggregator) {
      throw new Error(`route '${id}' cannot have both upstream and aggregator`);
    }
    const out: RouteConfig = {
      id,
      match: {
        path,
        ...(Array.isArray(match["methods"]) ? { methods: match["methods"] as string[] } : {}),
      },
    };
    if (r.upstream) out.upstream = r.upstream as UpstreamConfig;
    if (r.aggregator) out.aggregator = r.aggregator as AggregatorConfig;
    if (r.transform) out.transform = r.transform as TransformConfig;
    if (r.cache) {
      const c = asObject(r.cache, `$.routes[${i}].cache`);
      out.cache = { ttlMs: Number(c["ttlMs"]) };
    }
    return out;
  });

  const cfg: ErouterConfig = {
    server: {
      host: asString(server.host, "$.server.host"),
      port: Number(server.port),
    },
    routes,
    resources: {
      pool: {
        dir: asString(pool.dir, "$.resources.pool.dir"),
      },
    },
  };
  const auth = parseAuth(root["auth"]);
  if (auth) cfg.auth = auth;
  const rl = parseRateLimit(root["rateLimit"]);
  if (rl) cfg.rateLimit = rl;
  const cc = parseCache(root["cache"]);
  if (cc) cfg.cache = cc;
  const llm = parseLlm(root["llm"]);
  if (llm) cfg.llm = llm;
  return cfg;
}

export async function loadConfig(path: string): Promise<ErouterConfig> {
  const text = await readFile(path, "utf8");
  return parseConfig(parseYaml(text));
}
