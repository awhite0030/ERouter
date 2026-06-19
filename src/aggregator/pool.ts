import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface PoolEntry {
  key: string;
  path: string;
  type: "json" | "text";
  body: unknown;
}

export class ResourcePool {
  private readonly baseDir: string;
  private readonly cache = new Map<string, PoolEntry>();

  constructor(baseDir: string) {
    this.baseDir = resolve(baseDir);
  }

  private safeKey(key: string): string {
    if (key.includes("..") || key.includes("/") || key.includes("\\")) {
      throw new Error(`invalid pool key '${key}'`);
    }
    return key;
  }

  async load(key: string): Promise<PoolEntry | null> {
    const safe = this.safeKey(key);
    const cached = this.cache.get(safe);
    if (cached) return cached;
    const path = join(this.baseDir, safe);
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
    const isJson = safe.endsWith(".json");
    const entry: PoolEntry = {
      key: safe,
      path,
      type: isJson ? "json" : "text",
      body: isJson ? JSON.parse(raw) : raw,
    };
    this.cache.set(safe, entry);
    return entry;
  }

  async list(): Promise<string[]> {
    try {
      return (await readdir(this.baseDir)).sort();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  invalidate(key?: string): void {
    if (key) this.cache.delete(this.safeKey(key));
    else this.cache.clear();
  }
}
