export interface ApiKey {
  id: string;
  secret: string;
  scopes?: string[];
  rpm?: number;
  burst?: number;
}

export interface AuthConfig {
  enabled: boolean;
  header: string;
  keys: ApiKey[];
}

export interface ResolvedKey {
  id: string;
  scopes: Set<string>;
  rpm: number;
  burst: number;
}

export function resolveKey(req: { headers: Record<string, unknown> }, cfg: AuthConfig): ResolvedKey | null {
  if (!cfg.enabled) {
    return defaultKey();
  }
  const raw = req.headers[cfg.header.toLowerCase()];
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value) return null;
  const trimmed = value.startsWith("Bearer ") ? value.slice("Bearer ".length) : value;
  const [id, secret] = trimmed.split(":", 2);
  if (!id || !secret) return null;
  const match = cfg.keys.find((k) => k.id === id && k.secret === secret);
  if (!match) return null;
  return {
    id: match.id,
    scopes: new Set(match.scopes ?? ["*"]),
    rpm: match.rpm ?? 60,
    burst: match.burst ?? match.rpm ?? 60,
  };
}

function defaultKey(): ResolvedKey {
  return { id: "anonymous", scopes: new Set(["*"]), rpm: Infinity, burst: Infinity };
}

export function hasScope(key: ResolvedKey, scope: string): boolean {
  return key.scopes.has("*") || key.scopes.has(scope);
}
