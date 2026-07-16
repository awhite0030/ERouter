import type {
  ComboModelRef,
  LlmComboConfig,
  LlmConfig,
  LlmProviderConfig,
  ProviderTier,
} from "./types.js";

export interface ResolvedTarget {
  provider: LlmProviderConfig;
  model: string;
  tier: ProviderTier;
  comboId?: string;
  weight: number;
}

const TIER_ORDER: ProviderTier[] = ["subscription", "cheap", "free"];

export function resolveApiKey(p: LlmProviderConfig): string | undefined {
  if (p.apiKey && p.apiKey.length > 0) return p.apiKey;
  if (p.apiKeyEnv) {
    const v = process.env[p.apiKeyEnv];
    if (v && v.length > 0) return v;
  }
  return undefined;
}

export function findProvider(cfg: LlmConfig, id: string): LlmProviderConfig | undefined {
  return cfg.providers.find((p) => p.id === id);
}

export function findCombo(cfg: LlmConfig, id: string): LlmComboConfig | undefined {
  return cfg.combos.find((c) => c.id === id);
}

/**
 * Resolve a client-facing model string into an ordered fallback chain.
 *
 * Forms:
 *  - combo:<id>           → combo models in order
 *  - ensemble:<id>        → same members (caller may fan-out)
 *  - provider/model       → single hop if provider exists
 *  - bare model id        → first provider that lists it
 *  - combo id without prefix if it matches a combo
 */
export function resolveModelChain(cfg: LlmConfig, model: string): ResolvedTarget[] {
  const raw = model.trim();
  if (!raw) return [];

  if (raw.startsWith("combo:") || raw.startsWith("ensemble:")) {
    const id = raw.slice(raw.indexOf(":") + 1);
    const combo = findCombo(cfg, id);
    if (!combo) return [];
    return expandCombo(cfg, combo);
  }

  const asCombo = findCombo(cfg, raw);
  if (asCombo) return expandCombo(cfg, asCombo);

  if (raw.includes("/")) {
    const [providerId, ...rest] = raw.split("/");
    const modelId = rest.join("/");
    const provider = findProvider(cfg, providerId ?? "");
    if (provider && modelId) {
      return [
        {
          provider,
          model: modelId,
          tier: provider.tier ?? "cheap",
          weight: 1,
        },
      ];
    }
  }

  // bare model: providers that list it, ordered by tier
  const hits: ResolvedTarget[] = [];
  for (const p of cfg.providers) {
    if (p.models.includes(raw) || p.models.includes("*")) {
      hits.push({
        provider: p,
        model: raw,
        tier: p.tier ?? "cheap",
        weight: 1,
      });
    }
  }
  return hits.sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
  );
}

function expandCombo(cfg: LlmConfig, combo: LlmComboConfig): ResolvedTarget[] {
  const out: ResolvedTarget[] = [];
  for (const ref of combo.models) {
    const t = expandRef(cfg, ref, combo.id);
    if (t) out.push(t);
  }
  return out;
}

function expandRef(
  cfg: LlmConfig,
  ref: ComboModelRef,
  comboId: string,
): ResolvedTarget | null {
  const provider = findProvider(cfg, ref.provider);
  if (!provider) return null;
  return {
    provider,
    model: ref.model,
    tier: ref.tier ?? provider.tier ?? "cheap",
    comboId,
    weight: ref.weight ?? 1,
  };
}

export function listVirtualModels(cfg: LlmConfig): Array<{ id: string; owned_by: string }> {
  const models: Array<{ id: string; owned_by: string }> = [];
  for (const c of cfg.combos) {
    models.push({ id: c.id, owned_by: "erouter-combo" });
    models.push({ id: `combo:${c.id}`, owned_by: "erouter-combo" });
    models.push({ id: `ensemble:${c.id}`, owned_by: "erouter-ensemble" });
  }
  for (const p of cfg.providers) {
    for (const m of p.models) {
      if (m === "*") continue;
      models.push({ id: `${p.id}/${m}`, owned_by: p.id });
      models.push({ id: m, owned_by: p.id });
    }
  }
  // dedupe by id
  const seen = new Set<string>();
  return models.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}
