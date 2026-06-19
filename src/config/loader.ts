import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

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
}

export interface PoolConfig {
  dir: string;
}

export interface ResourcesConfig {
  pool: PoolConfig;
}

export interface ErouterConfig {
  server: {
    host: string;
    port: number;
  };
  routes: RouteConfig[];
  resources: ResourcesConfig;
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
    return {
      id,
      match: { path, ...(typeof r.match === "object" && "methods" in match
        ? { methods: match.methods as string[] }
        : {}) },
      ...(r.upstream ? { upstream: r.upstream as UpstreamConfig } : {}),
      ...(r.aggregator ? { aggregator: r.aggregator as AggregatorConfig } : {}),
    };
  });

  return {
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
}

export async function loadConfig(path: string): Promise<ErouterConfig> {
  const text = await readFile(path, "utf8");
  return parseConfig(parseYaml(text));
}
