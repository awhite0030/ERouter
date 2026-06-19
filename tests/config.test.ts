import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/config/loader.js";

test("parseConfig accepts a minimal route", () => {
  const cfg = parseConfig({
    server: { host: "127.0.0.1", port: 8080 },
    routes: [
      {
        id: "demo",
        match: { path: "/x/:y" },
        upstream: { url: "https://example.org/{y}" },
      },
    ],
    resources: { pool: { dir: "./data/pool" } },
  });
  assert.equal(cfg.routes[0]?.id, "demo");
  assert.equal(cfg.server.port, 8080);
});

test("parseConfig rejects a route with both upstream and aggregator", () => {
  assert.throws(() =>
    parseConfig({
      server: { host: "127.0.0.1", port: 8080 },
      routes: [
        {
          id: "bad",
          match: { path: "/x" },
          upstream: { url: "https://example.org" },
          aggregator: { strategy: "json-merge", sources: [] },
        },
      ],
      resources: { pool: { dir: "./data/pool" } },
    }),
  );
});
