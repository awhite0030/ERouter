import { test } from "node:test";
import assert from "node:assert/strict";
import { TtlCache } from "../src/gateway/cache.js";

test("TtlCache set/get hit", () => {
  const c = new TtlCache<number>({ defaultTtlMs: 1_000 });
  c.set("a", 1);
  assert.equal(c.get("a"), 1);
});

test("TtlCache misses after ttl", async () => {
  const c = new TtlCache<number>({ defaultTtlMs: 10 });
  c.set("a", 1);
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(c.get("a"), undefined);
});

test("TtlCache evicts LRU-ish oldest when over capacity", () => {
  const c = new TtlCache<number>({ defaultTtlMs: 10_000, maxEntries: 2 });
  c.set("a", 1);
  c.set("b", 2);
  c.set("c", 3);
  assert.equal(c.get("a"), undefined);
  assert.equal(c.get("b"), 2);
  assert.equal(c.get("c"), 3);
});

test("TtlCache stats count hits/misses", () => {
  const c = new TtlCache<number>({ defaultTtlMs: 10_000 });
  c.set("a", 1);
  c.get("a");
  c.get("missing");
  const s = c.stats();
  assert.equal(s.hits, 1);
  assert.equal(s.misses, 1);
  assert.equal(s.sets, 1);
});
