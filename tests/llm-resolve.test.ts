import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/config/loader.js";
import { listVirtualModels, resolveModelChain } from "../src/llm/resolve.js";
import type { LlmConfig } from "../src/llm/types.js";

const sample = {
  server: { host: "127.0.0.1", port: 8080 },
  routes: [],
  resources: { pool: { dir: "./data/pool" } },
  llm: {
    enabled: true,
    providers: [
      {
        id: "ollama",
        baseUrl: "http://127.0.0.1:11434/v1",
        authHeader: "none",
        tier: "free",
        models: ["llama3.2"],
      },
      {
        id: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKeyEnv: "OPENAI_API_KEY",
        tier: "subscription",
        models: ["gpt-4o-mini"],
      },
    ],
    combos: [
      {
        id: "coding-stack",
        models: [
          { provider: "openai", model: "gpt-4o-mini", tier: "subscription" },
          { provider: "ollama", model: "llama3.2", tier: "free" },
        ],
      },
    ],
  },
};

test("parseConfig accepts llm block", () => {
  const cfg = parseConfig(sample);
  assert.equal(cfg.llm?.enabled, true);
  assert.equal(cfg.llm?.providers.length, 2);
  assert.equal(cfg.llm?.combos.length, 1);
});

test("resolveModelChain expands combos in order", () => {
  const llm = parseConfig(sample).llm as LlmConfig;
  const chain = resolveModelChain(llm, "combo:coding-stack");
  assert.equal(chain.length, 2);
  assert.equal(chain[0]?.provider.id, "openai");
  assert.equal(chain[1]?.provider.id, "ollama");
  assert.equal(chain[0]?.comboId, "coding-stack");
});

test("resolveModelChain supports provider/model form", () => {
  const llm = parseConfig(sample).llm as LlmConfig;
  const chain = resolveModelChain(llm, "ollama/llama3.2");
  assert.equal(chain.length, 1);
  assert.equal(chain[0]?.model, "llama3.2");
});

test("listVirtualModels includes ensemble aliases", () => {
  const llm = parseConfig(sample).llm as LlmConfig;
  const ids = listVirtualModels(llm).map((m) => m.id);
  assert.ok(ids.includes("coding-stack"));
  assert.ok(ids.includes("ensemble:coding-stack"));
  assert.ok(ids.includes("openai/gpt-4o-mini"));
});
