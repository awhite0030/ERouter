import type { AggregatorConfig, AggregatorSource } from "../config/loader.js";
import type { UpstreamClient } from "../upstream/client.js";
import { interpolate } from "./routing.js";

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
): Promise<{ id: string; ok: boolean; status: number; json: unknown }> {
  const url = interpolate(src.url, params);
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
  return { id: src.id, ok: res.status >= 200 && res.status < 300, status: res.status, json };
}

export async function aggregateJson(
  client: UpstreamClient,
  cfg: AggregatorConfig,
  params: Record<string, string>,
): Promise<AggregationResult> {
  const settled = await Promise.all(
    cfg.sources.map((s) => fetchOne(client, s, params).catch((err) => ({
      id: s.id,
      ok: false,
      status: 0,
      json: { error: err instanceof Error ? err.message : String(err) },
    }))),
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
  return { status: 200, body: merged, perSource };
}
