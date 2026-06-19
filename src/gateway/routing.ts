export function compilePath(template: string): {
  pattern: RegExp;
  keys: string[];
} {
  const keys: string[] = [];
  const parts = template.split("/").map((seg) => {
    if (seg.startsWith(":")) {
      keys.push(seg.slice(1));
      return "([^/]+)";
    }
    return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  const pattern = new RegExp("^" + parts.join("/") + "/?$");
  return { pattern, keys };
}

export function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z_][\w]*)\}/g, (_, key: string) => {
    if (!(key in params)) {
      throw new Error(`missing template parameter '${key}'`);
    }
    return encodeURIComponent(params[key] ?? "");
  });
}

export function matchPath(template: string, url: string): Record<string, string> | null {
  const { pattern, keys } = compilePath(template);
  const m = pattern.exec(url);
  if (!m) return null;
  const out: Record<string, string> = {};
  keys.forEach((k, i) => {
    out[k] = decodeURIComponent(m[i + 1] ?? "");
  });
  return out;
}
