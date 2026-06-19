import type { AggregatorConfig, AggregatorSource } from "../config/loader.js";
import type { UpstreamClient } from "../upstream/client.js";
import { interpolate } from "../gateway/routing.js";
import type { Metrics } from "../gateway/metrics.js";

export interface AggregationResult {
  status: number;
  body: unknown;
  perSource: Record<string, { status: number; ok: boolean }>;
}

function pickByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

async function fetchOne(
  client: UpstreamClient,
  src: AggregatorSource,
  params: Record<string, string>,
  metrics?: Metrics,
): Promise<{ id: string; ok: boolean; status: number; json: unknown }> {
  const url = interpolate(src.url, params);
  const start = Date.now();
  try {
    const res = await client.send({
      url,
      method: "GET",
      ...(src.headers ? { headers: src.headers } : {}),
      ...(src.timeoutMs ? { timeoutMs: src.timeoutMs } : {}),
    });
    let json: unknown = null;
    try {
      json = res.body.length > 0 ? JSON.parse(res.body) : null;
    } catch {
      json = res.body;
    }
    if (metrics) {
      metrics.observeSource(src.id, res.status >= 200 && res.status < 300, Date.now() - start);
    }
    return { id: src.id, ok: res.status >= 200 && res.status < 300, status: res.status, json };
  } catch (err) {
    if (metrics) {
      metrics.observeSource(src.id, false, Date.now() - start);
    }
    return {
      id: src.id,
      ok: false,
      status: 0,
      json: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

export async function aggregateJson(
  client: UpstreamClient,
  cfg: AggregatorConfig,
  params: Record<string, string>,
  metrics?: Metrics,
): Promise<AggregationResult> {
  const settled = await Promise.all(
    cfg.sources.map((s) => fetchOne(client, s, params, metrics)),
  );
  const perSource: Record<string, { status: number; ok: boolean }> = {};
  const picked: Record<string, unknown> = {};
  for (const s of settled) {
    perSource[s.id] = { status: s.status, ok: s.ok };
    if (cfg.merge?.pick && s.id in cfg.merge.pick) {
      const path = cfg.merge.pick[s.id];
      if (path) picked[s.id] = pickByPath(s.json, path);
    } else {
      picked[s.id] = s.json;
    }
  }
  const merged = cfg.merge?.as
    ? { [cfg.merge.as]: picked }
    : picked;
  const status = settled.every((s) => s.ok) ? 200 : settled.some((s) => s.ok) ? 207 : 502;
  return { status, body: merged, perSource };
}
