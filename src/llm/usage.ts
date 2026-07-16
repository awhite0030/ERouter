import type { UsageSnapshot } from "./types.js";

export class UsageTracker {
  private snap: UsageSnapshot = {
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    tokensSaved: 0,
    estimatedCostUsd: 0,
    byProvider: {},
    byCombo: {},
    fallbackHops: 0,
  };

  record(opts: {
    providerId: string;
    comboId?: string | undefined;
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    tokensSaved?: number | undefined;
    estimatedCostUsd?: number | undefined;
    fallbackHops?: number | undefined;
  }): void {
    this.snap.requests += 1;
    this.snap.promptTokens += opts.promptTokens ?? 0;
    this.snap.completionTokens += opts.completionTokens ?? 0;
    this.snap.tokensSaved += opts.tokensSaved ?? 0;
    this.snap.estimatedCostUsd += opts.estimatedCostUsd ?? 0;
    this.snap.fallbackHops += opts.fallbackHops ?? 0;

    const p = this.snap.byProvider[opts.providerId] ?? {
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
    };
    p.requests += 1;
    p.promptTokens += opts.promptTokens ?? 0;
    p.completionTokens += opts.completionTokens ?? 0;
    p.estimatedCostUsd += opts.estimatedCostUsd ?? 0;
    this.snap.byProvider[opts.providerId] = p;

    if (opts.comboId) {
      this.snap.byCombo[opts.comboId] = (this.snap.byCombo[opts.comboId] ?? 0) + 1;
    }
  }

  snapshot(): UsageSnapshot {
    return structuredClone(this.snap);
  }
}
