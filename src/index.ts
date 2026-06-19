export { parseConfig, loadConfig } from "./config/loader.js";
export type {
  ErouterConfig,
  RouteConfig,
  AggregatorConfig,
  UpstreamConfig,
  AuthConfig,
  RateLimitConfig,
  CacheConfig,
} from "./config/loader.js";
export { buildGateway } from "./gateway/server.js";
export type { GatewayOptions, BuiltGateway } from "./gateway/server.js";
export { UpstreamClient } from "./upstream/client.js";
export { ResourcePool } from "./aggregator/pool.js";
export { aggregateJson } from "./aggregator/json-merge.js";
export type { AggregationResult } from "./aggregator/json-merge.js";
export { matchPath, compilePath, interpolate } from "./gateway/routing.js";
export { resolveKey, hasScope } from "./gateway/auth.js";
export type { ApiKey, ResolvedKey } from "./gateway/auth.js";
export { RateLimiter } from "./gateway/rate-limit.js";
export type { RateLimitDecision } from "./gateway/rate-limit.js";
export { TtlCache } from "./gateway/cache.js";
export type { CacheOptions } from "./gateway/cache.js";
export { Metrics } from "./gateway/metrics.js";
export type { MetricsSnapshot } from "./gateway/metrics.js";
export { applyTransform } from "./gateway/transform.js";
export type { TransformConfig } from "./gateway/transform.js";
export { runCli } from "./cli.js";
