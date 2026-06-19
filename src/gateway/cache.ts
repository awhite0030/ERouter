interface Entry<T> {
  expiresAt: number;
  value: T;
}

export interface CacheOptions {
  maxEntries?: number;
  defaultTtlMs?: number;
  sweepEveryMs?: number;
}

export class TtlCache<T> {
  private readonly store = new Map<string, Entry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;
  private readonly sweepEveryMs: number;
  private lastSweep = Date.now();
  private hits = 0;
  private misses = 0;
  private sets = 0;

  constructor(opts: CacheOptions = {}) {
    this.maxEntries = opts.maxEntries ?? 1_000;
    this.defaultTtlMs = opts.defaultTtlMs ?? 30_000;
    this.sweepEveryMs = opts.sweepEveryMs ?? 15_000;
  }

  get(key: string): T | undefined {
    this.maybeSweep();
    const e = this.store.get(key);
    if (!e) {
      this.misses += 1;
      return undefined;
    }
    if (e.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return e.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.maybeSweep();
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    this.sets += 1;
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  stats(): { size: number; hits: number; misses: number; sets: number } {
    return { size: this.store.size, hits: this.hits, misses: this.misses, sets: this.sets };
  }

  private maybeSweep(): void {
    const now = Date.now();
    if (now - this.lastSweep < this.sweepEveryMs) return;
    this.lastSweep = now;
    for (const [k, e] of this.store) {
      if (e.expiresAt <= now) this.store.delete(k);
    }
  }
}
