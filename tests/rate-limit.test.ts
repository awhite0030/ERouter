import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "../src/gateway/rate-limit.js";

test("RateLimiter allows up to burst", () => {
  const rl = new RateLimiter({ rpm: 60, burst: 3 });
  assert.equal(rl.take("k1").allowed, true);
  assert.equal(rl.take("k1").allowed, true);
  assert.equal(rl.take("k1").allowed, true);
  const d = rl.take("k1");
  assert.equal(d.allowed, false);
  assert.ok(d.resetMs > 0);
});

test("RateLimiter is per-key", () => {
  const rl = new RateLimiter({ rpm: 60, burst: 1 });
  assert.equal(rl.take("a").allowed, true);
  assert.equal(rl.take("a").allowed, false);
  assert.equal(rl.take("b").allowed, true);
});
