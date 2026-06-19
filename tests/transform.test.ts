import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTransform } from "../src/gateway/transform.js";

test("applyTransform picks fields", () => {
  const out = applyTransform({ a: 1, b: 2, c: 3 }, { pick: ["a", "c"] });
  assert.deepEqual(out, { a: 1, c: 3 });
});

test("applyTransform drops fields", () => {
  const out = applyTransform({ a: 1, b: 2 }, { drop: ["b"] });
  assert.deepEqual(out, { a: 1 });
});

test("applyTransform renames fields", () => {
  const out = applyTransform({ a: 1 }, { rename: { a: "alpha" } });
  assert.deepEqual(out, { alpha: 1 });
});

test("applyTransform wraps result", () => {
  const out = applyTransform({ a: 1 }, { wrapAs: "data" });
  assert.deepEqual(out, { data: { a: 1 } });
});

test("applyTransform walks arrays and objects", () => {
  const out = applyTransform(
    { items: [{ a: 1, b: 2 }, { a: 3, b: 4 }] },
    { pick: ["items"] },
  );
  assert.deepEqual(out, { items: [{ a: 1, b: 2 }, { a: 3, b: 4 }] });
});
