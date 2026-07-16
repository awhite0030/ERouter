import { test } from "node:test";
import assert from "node:assert/strict";
import { compressToolText, ecompressMessages } from "../src/llm/ecompress.js";

test("compressToolText short-circuits small payloads", () => {
  const s = "hello world";
  assert.equal(compressToolText(s, { enabled: true, minCharsToCompress: 100 }), s);
});

test("compressToolText shrinks large git-ish diffs", () => {
  const lines = ["diff --git a/x b/x", "index 111..222", "--- a/x", "+++ b/x", "@@ -1 +1 @@"];
  for (let i = 0; i < 200; i++) {
    lines.push(`+added line ${i} lorem ipsum dolor sit amet`);
    lines.push(`-removed line ${i} lorem ipsum dolor sit amet`);
  }
  const input = lines.join("\n");
  const out = compressToolText(input, {
    enabled: true,
    minCharsToCompress: 100,
    maxToolResultChars: 1500,
  });
  assert.ok(out.length < input.length);
  assert.match(out, /ecompress/i);
});

test("ecompressMessages only rewrites tool roles", () => {
  const big = "x".repeat(5000);
  const { messages, tokensSavedEstimate, blocksCompressed } = ecompressMessages(
    [
      { role: "user", content: "please review" },
      { role: "tool", content: big },
      { role: "assistant", content: "ok" },
    ],
    { enabled: true, minCharsToCompress: 100, maxToolResultChars: 1000 },
  );
  assert.equal(messages[0]?.content, "please review");
  assert.ok(String(messages[1]?.content).length < big.length);
  assert.equal(messages[2]?.content, "ok");
  assert.ok(tokensSavedEstimate > 0);
  assert.equal(blocksCompressed, 1);
});

test("ecompress fail-open when disabled", () => {
  const big = "y".repeat(3000);
  const { messages, tokensSavedEstimate } = ecompressMessages(
    [{ role: "tool", content: big }],
    { enabled: false },
  );
  assert.equal(messages[0]?.content, big);
  assert.equal(tokensSavedEstimate, 0);
});
