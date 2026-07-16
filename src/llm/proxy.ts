import { UpstreamClient } from "../upstream/client.js";
import { ecompressMessages } from "./ecompress.js";
import { injectSystemPrompt, leanSystemPrompt } from "./lean.js";
import { listVirtualModels, resolveApiKey, resolveModelChain, type ResolvedTarget } from "./resolve.js";
import { UsageTracker } from "./usage.js";
import type {
  ChatCompletionRequest,
  ChatMessage,
  LlmConfig,
  LlmHopResult,
  ProviderTier,
} from "./types.js";

export interface LlmProxyDeps {
  config: LlmConfig;
  upstream: UpstreamClient;
  usage: UsageTracker;
}

function estimateCost(
  target: ResolvedTarget,
  promptTokens: number,
  completionTokens: number,
): number {
  const cin = target.provider.costInPer1M ?? 0;
  const cout = target.provider.costOutPer1M ?? 0;
  return (promptTokens / 1_000_000) * cin + (completionTokens / 1_000_000) * cout;
}

function extractUsage(body: unknown): { prompt: number; completion: number } {
  if (!body || typeof body !== "object") return { prompt: 0, completion: 0 };
  const u = (body as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
  return {
    prompt: Number(u?.prompt_tokens ?? 0),
    completion: Number(u?.completion_tokens ?? 0),
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function callProvider(
  upstream: UpstreamClient,
  target: ResolvedTarget,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown; latencyMs: number }> {
  const key = resolveApiKey(target.provider);
  const authStyle = target.provider.authHeader ?? "bearer";
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    ...(target.provider.headers ?? {}),
  };
  if (authStyle === "bearer" && key) headers.authorization = `Bearer ${key}`;
  if (authStyle === "x-api-key" && key) headers["x-api-key"] = key;

  const url = joinUrl(target.provider.baseUrl, "chat/completions");
  const started = Date.now();
  const res = await upstream.send({
    url,
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, model: target.model, stream: false }),
    timeoutMs: target.provider.timeoutMs ?? 60_000,
  });
  let body: unknown;
  try {
    body = res.body ? JSON.parse(res.body) : null;
  } catch {
    body = { raw: res.body };
  }
  return { status: res.status, body, latencyMs: Date.now() - started };
}

function prepareMessages(
  cfg: LlmConfig,
  messages: ChatMessage[],
): { messages: ChatMessage[]; tokensSaved: number; blocksCompressed: number } {
  const lean = leanSystemPrompt(cfg.leanMode);
  const withDefault = injectSystemPrompt(messages, cfg.defaultSystemPrompt);
  const withLean = injectSystemPrompt(withDefault, lean);
  const compressed = ecompressMessages(withLean, cfg.ecompress ?? { enabled: true });
  return {
    messages: compressed.messages,
    tokensSaved: compressed.tokensSavedEstimate,
    blocksCompressed: compressed.blocksCompressed,
  };
}

function contentText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const choices = (body as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const c = choices?.[0]?.message?.content;
  return typeof c === "string" ? c : c == null ? "" : JSON.stringify(c);
}

async function ensemble(
  deps: LlmProxyDeps,
  chain: ResolvedTarget[],
  basePayload: Record<string, unknown>,
  tokensSaved: number,
): Promise<LlmHopResult> {
  const strategy = deps.config.ensemble?.defaultStrategy ?? "first-ok";
  const max = deps.config.ensemble?.maxParallel ?? 3;
  const members = chain.slice(0, max);

  if (strategy === "first-ok") {
    // parallel race: first successful 2xx wins
    const errors: string[] = [];
    const promises = members.map(async (t) => {
      const r = await callProvider(deps.upstream, t, basePayload);
      return { t, r };
    });
    const settled = await Promise.all(promises);
    for (const { t, r } of settled) {
      if (r.status >= 200 && r.status < 300) {
        const usage = extractUsage(r.body);
        const cost = estimateCost(t, usage.prompt, usage.completion);
        deps.usage.record({
          providerId: t.provider.id,
          comboId: t.comboId,
          promptTokens: usage.prompt,
          completionTokens: usage.completion,
          tokensSaved,
          estimatedCostUsd: cost,
        });
        return {
          status: r.status,
          body: r.body,
          providerId: t.provider.id,
          model: t.model,
          tier: t.tier,
          latencyMs: r.latencyMs,
          tokensSaved,
          estimatedCostUsd: cost,
        };
      }
      errors.push(`${t.provider.id}/${t.model}: ${r.status}`);
    }
    return {
      status: 502,
      body: { error: "ensemble_all_failed", errors },
      providerId: members[0]?.provider.id ?? "none",
      model: members[0]?.model ?? "none",
      tier: (members[0]?.tier ?? "free") as ProviderTier,
      latencyMs: 0,
      tokensSaved,
    };
  }

  // concat / vote-longest: wait for all ok responses
  const results: Array<{ t: ResolvedTarget; text: string; body: unknown; latencyMs: number; status: number }> =
    [];
  await Promise.all(
    members.map(async (t) => {
      const r = await callProvider(deps.upstream, t, basePayload);
      if (r.status >= 200 && r.status < 300) {
        results.push({ t, text: contentText(r.body), body: r.body, latencyMs: r.latencyMs, status: r.status });
      }
    }),
  );

  if (results.length === 0) {
    return {
      status: 502,
      body: { error: "ensemble_all_failed" },
      providerId: members[0]?.provider.id ?? "none",
      model: members[0]?.model ?? "none",
      tier: "free",
      latencyMs: 0,
      tokensSaved,
    };
  }

  if (strategy === "vote-longest") {
    results.sort((a, b) => b.text.length * (b.t.weight || 1) - a.text.length * (a.t.weight || 1));
    const best = results[0]!;
    const usage = extractUsage(best.body);
    const cost = estimateCost(best.t, usage.prompt, usage.completion);
    deps.usage.record({
      providerId: best.t.provider.id,
      comboId: best.t.comboId,
      promptTokens: usage.prompt,
      completionTokens: usage.completion,
      tokensSaved,
      estimatedCostUsd: cost,
    });
    return {
      status: 200,
      body: best.body,
      providerId: best.t.provider.id,
      model: best.t.model,
      tier: best.t.tier,
      latencyMs: best.latencyMs,
      tokensSaved,
      estimatedCostUsd: cost,
    };
  }

  // concat
  const merged = results
    .map((r) => `### ${r.t.provider.id}/${r.t.model}\n${r.text}`)
    .join("\n\n");
  const primary = results[0]!;
  const body = {
    id: `erouter-ensemble-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: `ensemble:${primary.t.comboId ?? "custom"}`,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: merged },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    erouter: {
      ensemble: results.map((r) => ({
        provider: r.t.provider.id,
        model: r.t.model,
        latencyMs: r.latencyMs,
      })),
    },
  };
  deps.usage.record({
    providerId: primary.t.provider.id,
    comboId: primary.t.comboId,
    tokensSaved,
  });
  return {
    status: 200,
    body,
    providerId: primary.t.provider.id,
    model: primary.t.model,
    tier: primary.t.tier,
    latencyMs: Math.max(...results.map((r) => r.latencyMs)),
    tokensSaved,
  };
}

/**
 * Execute chat completion with tiered fallback (9router idea) or ensemble (ERouter exclusive).
 */
export async function handleChatCompletions(
  deps: LlmProxyDeps,
  req: ChatCompletionRequest,
): Promise<LlmHopResult & { headers: Record<string, string> }> {
  const cfg = deps.config;
  const model = String(req.model ?? "");
  const chain = resolveModelChain(cfg, model);
  if (chain.length === 0) {
    return {
      status: 404,
      body: {
        error: {
          message: `Unknown model '${model}'. Use GET /v1/models or define providers/combos in erouter.yaml`,
          type: "invalid_request_error",
        },
      },
      providerId: "none",
      model,
      tier: "free",
      latencyMs: 0,
      headers: { "x-erouter-error": "unknown_model" },
    };
  }

  const prepared = prepareMessages(cfg, req.messages ?? []);
  const basePayload: Record<string, unknown> = { ...req, messages: prepared.messages };
  delete basePayload.stream; // streaming can be added later; non-stream first

  const isEnsemble = model.startsWith("ensemble:");
  if (isEnsemble) {
    const hop = await ensemble(deps, chain, basePayload, prepared.tokensSaved);
    return {
      ...hop,
      headers: {
        "x-erouter-provider": hop.providerId,
        "x-erouter-model": hop.model,
        "x-erouter-tier": hop.tier,
        "x-erouter-mode": "ensemble",
        "x-erouter-tokens-saved": String(hop.tokensSaved ?? 0),
        "x-erouter-blocks-compressed": String(prepared.blocksCompressed),
        "x-erouter-cost-estimate-usd": String((hop.estimatedCostUsd ?? 0).toFixed(6)),
      },
    };
  }

  // Sequential tiered fallback (subscription → cheap → free)
  const errors: Array<{ provider: string; model: string; status: number; message: string }> = [];
  let hops = 0;
  for (const target of chain) {
    hops += 1;
    try {
      const r = await callProvider(deps.upstream, target, basePayload);
      if (r.status >= 200 && r.status < 300) {
        const usage = extractUsage(r.body);
        const cost = estimateCost(target, usage.prompt, usage.completion);
        deps.usage.record({
          providerId: target.provider.id,
          comboId: target.comboId,
          promptTokens: usage.prompt,
          completionTokens: usage.completion,
          tokensSaved: prepared.tokensSaved,
          estimatedCostUsd: cost,
          fallbackHops: hops - 1,
        });
        return {
          status: r.status,
          body: r.body,
          providerId: target.provider.id,
          model: target.model,
          tier: target.tier,
          latencyMs: r.latencyMs,
          tokensSaved: prepared.tokensSaved,
          estimatedCostUsd: cost,
          headers: {
            "x-erouter-provider": target.provider.id,
            "x-erouter-model": target.model,
            "x-erouter-tier": target.tier,
            "x-erouter-mode": "fallback",
            "x-erouter-fallback-hop": String(hops - 1),
            "x-erouter-tokens-saved": String(prepared.tokensSaved),
            "x-erouter-blocks-compressed": String(prepared.blocksCompressed),
            "x-erouter-cost-estimate-usd": cost.toFixed(6),
            ...(target.comboId ? { "x-erouter-combo": target.comboId } : {}),
          },
        };
      }
      const msg =
        r.body && typeof r.body === "object" && "error" in (r.body as object)
          ? JSON.stringify((r.body as { error: unknown }).error)
          : `status ${r.status}`;
      errors.push({
        provider: target.provider.id,
        model: target.model,
        status: r.status,
        message: msg,
      });
      if (!isRetryableStatus(r.status) && r.status !== 401 && r.status !== 403) {
        // non-retryable client error on primary — still try next tier for 402/429-like
        if (r.status < 500 && r.status !== 402 && r.status !== 429) {
          // continue fallback for quota-ish; for 400 bad request stop
          if (r.status === 400) break;
        }
      }
    } catch (err) {
      errors.push({
        provider: target.provider.id,
        model: target.model,
        status: 0,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  deps.usage.record({
    providerId: chain[0]?.provider.id ?? "none",
    comboId: chain[0]?.comboId,
    tokensSaved: prepared.tokensSaved,
    fallbackHops: hops,
  });

  return {
    status: 502,
    body: {
      error: {
        message: "All providers in the fallback chain failed",
        type: "erouter_fallback_exhausted",
        attempts: errors,
      },
    },
    providerId: chain[0]?.provider.id ?? "none",
    model,
    tier: chain[0]?.tier ?? "free",
    latencyMs: 0,
    tokensSaved: prepared.tokensSaved,
    headers: {
      "x-erouter-error": "fallback_exhausted",
      "x-erouter-fallback-hop": String(Math.max(0, hops - 1)),
      "x-erouter-tokens-saved": String(prepared.tokensSaved),
    },
  };
}

export function handleListModels(cfg: LlmConfig): unknown {
  const data = listVirtualModels(cfg).map((m) => ({
    id: m.id,
    object: "model",
    created: 0,
    owned_by: m.owned_by,
  }));
  return { object: "list", data };
}
