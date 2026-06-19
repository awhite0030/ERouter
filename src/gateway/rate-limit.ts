export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * Simple in-memory token bucket per key id.
 * `rpm` is steady-state requests per minute; `burst` is bucket size.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly rpm: number;
  private readonly burst: number;
  private readonly sweepEveryMs = 60_000;
  private lastSweep = Date.now();

  constructor(opts: { rpm: number; burst?: number }) {
    this.rpm = opts.rpm;
    this.burst = opts.burst ?? opts.rpm;
  }

  private refill(b: Bucket, now: number): void {
    const elapsedMin = (now - b.updatedAt) / 60_000;
    if (elapsedMin <= 0) return;
    b.tokens = Math.min(this.burst, b.tokens + elapsedMin * this.rpm);
    b.updatedAt = now;
  }

  take(keyId: string, cost = 1): RateLimitDecision {
    const now = Date.now();
    this.maybeSweep(now);
    const b = this.buckets.get(keyId) ?? { tokens: this.burst, updatedAt: now };
    this.refill(b, now);
    if (b.tokens >= cost) {
      b.tokens -= cost;
      this.buckets.set(keyId, b);
      return { allowed: true, remaining: Math.floor(b.tokens), resetMs: 0 };
    }
    const deficit = cost - b.tokens;
    const resetMs = Math.ceil((deficit / this.rpm) * 60_000);
    this.buckets.set(keyId, b);
    return { allowed: false, remaining: 0, resetMs };
  }

  private maybeSweep(now: number): void {
    if (now - this.lastSweep < this.sweepEveryMs) return;
    this.lastSweep = now;
    for (const [k, b] of this.buckets) {
      this.refill(b, now);
      if (b.tokens >= this.burst) this.buckets.delete(k);
    }
  }

  size(): number {
    return this.buckets.size;
  }
}
