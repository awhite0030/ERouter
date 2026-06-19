export interface TransformConfig {
  pick?: string[];
  drop?: string[];
  rename?: Record<string, string>;
  wrapAs?: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function projectRoot(value: Record<string, unknown>, t: TransformConfig): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  const drop = new Set(t.drop ?? []);
  const pick = t.pick && t.pick.length > 0 ? new Set(t.pick) : null;
  for (const [k, v] of Object.entries(value)) {
    if (drop.has(k)) continue;
    if (pick && !pick.has(k)) continue;
    const target = t.rename?.[k] ?? k;
    next[target] = v;
  }
  return next;
}

function walk(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => walk(v));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = walk(v);
    }
    return out;
  }
  return value;
}

export function applyTransform(value: unknown, t: TransformConfig | undefined): unknown {
  if (!t) return value;
  const root = isPlainObject(value) ? projectRoot(value, t) : value;
  const projected = walk(root);
  if (t.wrapAs) {
    return { [t.wrapAs]: projected };
  }
  return projected;
}
