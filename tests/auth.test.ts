import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveKey, hasScope } from "../src/gateway/auth.js";

const cfg = {
  enabled: true,
  header: "x-api-key",
  keys: [
    { id: "alice", secret: "s1", scopes: ["read"] },
    { id: "bob", secret: "s2", scopes: ["*"] },
  ],
};

test("resolveKey returns null on missing header", () => {
  assert.equal(resolveKey({ headers: {} }, cfg), null);
});

test("resolveKey parses id:secret", () => {
  const r = resolveKey({ headers: { "x-api-key": "alice:s1" } }, cfg);
  assert.ok(r);
  assert.equal(r?.id, "alice");
  assert.ok(r?.scopes.has("read"));
});

test("resolveKey rejects bad secret", () => {
  assert.equal(resolveKey({ headers: { "x-api-key": "alice:wrong" } }, cfg), null);
});

test("resolveKey accepts Bearer prefix", () => {
  const r = resolveKey({ headers: { "x-api-key": "Bearer bob:s2" } }, cfg);
  assert.equal(r?.id, "bob");
});

test("hasScope honours wildcard", () => {
  const r = resolveKey({ headers: { "x-api-key": "bob:s2" } }, cfg);
  assert.ok(r && hasScope(r, "anything"));
});
