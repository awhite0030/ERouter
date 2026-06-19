import { test } from "node:test";
import assert from "node:assert/strict";
import { matchPath, compilePath, interpolate } from "../src/gateway/routing.js";

test("compilePath matches simple param", () => {
  const { pattern, keys } = compilePath("/users/:id");
  assert.deepEqual(keys, ["id"]);
  assert.ok(pattern.test("/users/42"));
  assert.ok(!pattern.test("/users/42/posts"));
});

test("matchPath decodes params", () => {
  const m = matchPath("/users/:id", "/users/abc%20def");
  assert.deepEqual(m, { id: "abc def" });
});

test("matchPath returns null on miss", () => {
  assert.equal(matchPath("/users/:id", "/orders/1"), null);
});

test("interpolate encodes values", () => {
  const out = interpolate("/u/{name}", { name: "a b" });
  assert.equal(out, "/u/a%20b");
});

test("interpolate throws on missing param", () => {
  assert.throws(() => interpolate("/u/{name}", {}));
});
