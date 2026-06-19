import { fetch, Agent, type RequestInit } from "undici";

export interface UpstreamRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface UpstreamResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface UpstreamClientOptions {
  retries?: number;
  baseTimeoutMs?: number;
}

const agent = new Agent({ keepAliveTimeout: 5_000, keepAliveMaxTimeout: 10_000 });

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export class UpstreamClient {
  private readonly retries: number;
  private readonly baseTimeoutMs: number;

  constructor(opts: UpstreamClientOptions = {}) {
    this.retries = opts.retries ?? 2;
    this.baseTimeoutMs = opts.baseTimeoutMs ?? 5_000;
  }

  async send(req: UpstreamRequest): Promise<UpstreamResult> {
    const method = req.method ?? "GET";
    const timeoutMs = req.timeoutMs ?? this.baseTimeoutMs;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.retries) {
      const init: RequestInit = {
        method,
        headers: req.headers,
        dispatcher: agent,
        body: req.body,
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
      };
      try {
        const res = await fetch(req.url, init);
        const body = await res.body.text();
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (typeof v === "string") headers[k] = v;
          else if (Array.isArray(v)) headers[k] = v.join(", ");
        }
        if (isRetryable(res.status) && attempt < this.retries) {
          attempt += 1;
          await delay(2 ** attempt * 100);
          continue;
        }
        return { status: res.status, headers, body };
      } catch (err) {
        lastError = err;
        if (attempt < this.retries) {
          attempt += 1;
          await delay(2 ** attempt * 100);
          continue;
        }
        throw err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("upstream failed");
  }
}
