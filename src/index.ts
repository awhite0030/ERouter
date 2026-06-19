export { parseConfig, loadConfig } from "./config/loader.js";
export type { ErouterConfig, RouteConfig, AggregatorConfig, UpstreamConfig } from "./config/loader.js";
export { buildGateway } from "./gateway/server.js";
export { UpstreamClient } from "./upstream/client.js";
export { ResourcePool } from "./aggregator/pool.js";
export { aggregateJson } from "./aggregator/json-merge.js";
export { matchPath, compilePath, interpolate } from "./gateway/routing.js";
