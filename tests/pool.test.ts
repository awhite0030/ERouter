import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ResourcePool } from "../src/aggregator/pool.js";

test("ResourcePool loads JSON entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "erouter-pool-"));
  try {
    await writeFile(join(dir, "alpha.json"), JSON.stringify({ hello: "world" }));
    const pool = new ResourcePool(dir);
    const entry = await pool.load("alpha.json");
    assert.ok(entry);
    assert.equal(entry?.type, "json");
    assert.deepEqual(entry?.body, { hello: "world" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("ResourcePool rejects path traversal", async () => {
  const pool = new ResourcePool("/tmp");
  await assert.rejects(() => pool.load("../etc/passwd"));
});

test("ResourcePool.list returns sorted keys", async () => {
  const dir = await mkdtemp(join(tmpdir(), "erouter-pool-"));
  try {
    await writeFile(join(dir, "b.json"), "{}");
    await writeFile(join(dir, "a.json"), "{}");
    const pool = new ResourcePool(dir);
    const keys = await pool.list();
    assert.deepEqual(keys, ["a.json", "b.json"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
