export interface MetricsSnapshot {
  uptimeMs: number;
  startedAt: number;
  requests: {
    total: number;
    ok: number;
    clientError: number;
    serverError: number;
    rateLimited: number;
    noRoute: number;
  };
  perRoute: Record<string, { count: number; avgMs: number; p95Ms: number }>;
  perSource: Record<string, { ok: number; fail: number; avgMs: number }>;
  cache: { size: number; hits: number; misses: number; sets: number };
}

interface RouteBucket {
  count: number;
  totalMs: number;
  samples: number[];
}
interface SourceBucket {
  ok: number;
  fail: number;
  totalMs: number;
}

const P95_SAMPLE_CAP = 200;

export class Metrics {
  readonly startedAt: number = Date.now();
  private total = 0;
  private ok = 0;
  private clientError = 0;
  private serverError = 0;
  private rateLimited = 0;
  private noRoute = 0;
  private readonly routes = new Map<string, RouteBucket>();
  private readonly sources = new Map<string, SourceBucket>();

  observeRequest(status: number): void {
    this.total += 1;
    if (status === 429) this.rateLimited += 1;
    else if (status === 404) this.noRoute += 1;
    else if (status >= 500) this.serverError += 1;
    else if (status >= 400) this.clientError += 1;
    else this.ok += 1;
  }

  observeRoute(routeId: string, durationMs: number): void {
    const b = this.routes.get(routeId) ?? { count: 0, totalMs: 0, samples: [] };
    b.count += 1;
    b.totalMs += durationMs;
    b.samples.push(durationMs);
    if (b.samples.length > P95_SAMPLE_CAP) b.samples.shift();
    this.routes.set(routeId, b);
  }

  observeSource(sourceId: string, ok: boolean, durationMs: number): void {
    const b = this.sources.get(sourceId) ?? { ok: 0, fail: 0, totalMs: 0 };
    if (ok) b.ok += 1; else b.fail += 1;
    b.totalMs += durationMs;
    this.sources.set(sourceId, b);
  }

  uptimeMs(): number {
    return Date.now() - this.startedAt;
  }

  snapshot(): MetricsSnapshot {
    const perRoute: MetricsSnapshot["perRoute"] = {};
    for (const [k, b] of this.routes) {
      const sorted = [...b.samples].sort((a, c) => a - c);
      const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      perRoute[k] = {
        count: b.count,
        avgMs: b.count > 0 ? Number((b.totalMs / b.count).toFixed(2)) : 0,
        p95Ms: sorted[idx] ?? 0,
      };
    }
    const perSource: MetricsSnapshot["perSource"] = {};
    for (const [k, b] of this.sources) {
      const n = b.ok + b.fail;
      perSource[k] = {
        ok: b.ok,
        fail: b.fail,
        avgMs: n > 0 ? Number((b.totalMs / n).toFixed(2)) : 0,
      };
    }
    return {
      uptimeMs: Date.now() - this.startedAt,
      startedAt: this.startedAt,
      requests: {
        total: this.total,
        ok: this.ok,
        clientError: this.clientError,
        serverError: this.serverError,
        rateLimited: this.rateLimited,
        noRoute: this.noRoute,
      },
      perRoute,
      perSource,
      cache: { size: 0, hits: 0, misses: 0, sets: 0 },
    };
  }
}
