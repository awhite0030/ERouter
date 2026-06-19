import { test } from "node:test";
import assert from "node:assert/strict";
import { Metrics } from "../src/gateway/metrics.js";

test("Metrics counts statuses by class", () => {
  const m = new Metrics();
  m.observeRequest(200);
  m.observeRequest(200);
  m.observeRequest(404);
  m.observeRequest(429);
  m.observeRequest(503);
  const s = m.snapshot();
  assert.equal(s.requests.total, 5);
  assert.equal(s.requests.ok, 2);
  assert.equal(s.requests.noRoute, 1);
  assert.equal(s.requests.rateLimited, 1);
  assert.equal(s.requests.serverError, 1);
});

test("Metrics computes per-route p95 from samples", () => {
  const m = new Metrics();
  for (let i = 1; i <= 100; i += 1) m.observeRoute("r1", i);
  const s = m.snapshot();
  assert.equal(s.perRoute.r1?.count, 100);
  assert.ok((s.perRoute.r1?.p95Ms ?? 0) >= 95);
});

test("Metrics tracks source ok/fail", () => {
  const m = new Metrics();
  m.observeSource("s1", true, 10);
  m.observeSource("s1", false, 5);
  const s = m.snapshot();
  assert.equal(s.perSource.s1?.ok, 1);
  assert.equal(s.perSource.s1?.fail, 1);
  assert.equal(s.perSource.s1?.avgMs, 7.5);
});
