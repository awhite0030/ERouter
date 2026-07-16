/**
 * ECompress — ERouter's built-in token saver for agent tool outputs.
 *
 * Inspired by RTK/9router ideas (compress tool_result before the LLM),
 * but pure TypeScript, zero deps, fail-open, and emits measurable savings.
 */

import type { ChatMessage, EcompressConfig } from "./types.js";

const DEFAULTS = {
  enabled: true,
  maxToolResultChars: 4_000,
  minCharsToCompress: 800,
} as const;

export interface EcompressResult {
  messages: ChatMessage[];
  originalChars: number;
  compressedChars: number;
  tokensSavedEstimate: number;
  blocksCompressed: number;
}

function asText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text ?? "");
        }
        return JSON.stringify(part);
      })
      .join("\n");
  }
  if (content == null) return "";
  return typeof content === "object" ? JSON.stringify(content) : String(content);
}

function looksLikeGitDiff(s: string): boolean {
  return /^diff --git /m.test(s) || /^\+\+\+ |^--- |^@@ /m.test(s);
}

function looksLikeGrep(s: string): boolean {
  return /^[^:\n]+:\d+:/m.test(s) || /\bgrep\b/i.test(s.slice(0, 200));
}

function looksLikeTreeOrLs(s: string): boolean {
  const lines = s.split("\n");
  if (lines.length < 8) return false;
  const pathish = lines.filter((l) => /^[\s|`\\-]*[\w./-]+$/.test(l.trim())).length;
  return pathish / lines.length > 0.5;
}

function compressGitDiff(s: string, max: number): string {
  const lines = s.split("\n");
  const kept: string[] = [];
  let files = 0;
  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      files += 1;
      kept.push(line);
    } else if (line.startsWith("@@") || line.startsWith("+") || line.startsWith("-")) {
      if (!line.startsWith("+++") && !line.startsWith("---")) kept.push(line);
    } else if (line.startsWith("index ") || line.startsWith("new file") || line.startsWith("deleted")) {
      kept.push(line);
    }
  }
  let out = kept.join("\n");
  if (out.length > max) {
    out = out.slice(0, max) + `\n… [ecompress: truncated git-diff, ~${files} files]`;
  } else {
    out += `\n… [ecompress: git-diff condensed, ${files} files]`;
  }
  return out;
}

function compressLineList(s: string, max: number, label: string): string {
  const lines = s.split("\n").filter((l) => l.trim().length > 0);
  const unique = [...new Set(lines)];
  let out = unique.join("\n");
  if (out.length > max) {
    const head = out.slice(0, Math.floor(max * 0.7));
    const tail = out.slice(-Math.floor(max * 0.2));
    out = `${head}\n…\n${tail}\n… [ecompress: ${label} ${lines.length}→${unique.length} lines, truncated]`;
  } else if (unique.length < lines.length) {
    out += `\n… [ecompress: ${label} dedup ${lines.length}→${unique.length}]`;
  }
  return out;
}

function smartTruncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = s.slice(0, Math.floor(max * 0.65));
  const tail = s.slice(-Math.floor(max * 0.25));
  return `${head}\n…\n${tail}\n… [ecompress: smart-truncate ${s.length}→${max} chars]`;
}

export function compressToolText(text: string, cfg: EcompressConfig = {}): string {
  const max = cfg.maxToolResultChars ?? DEFAULTS.maxToolResultChars;
  const min = cfg.minCharsToCompress ?? DEFAULTS.minCharsToCompress;
  if (text.length < min) return text;

  let out: string;
  if (looksLikeGitDiff(text)) out = compressGitDiff(text, max);
  else if (looksLikeGrep(text)) out = compressLineList(text, max, "grep");
  else if (looksLikeTreeOrLs(text)) out = compressLineList(text, max, "tree/ls");
  else out = smartTruncate(text, max);

  // Fail-open: never grow the payload
  if (out.length >= text.length) return text;
  return out;
}

function isToolResultMessage(m: ChatMessage): boolean {
  if (m.role === "tool") return true;
  if (m.role === "function") return true;
  // Anthropic-style content blocks sometimes land as user with tool_result
  const c = m.content;
  if (Array.isArray(c)) {
    return c.some(
      (p) => p && typeof p === "object" && (p as { type?: string }).type === "tool_result",
    );
  }
  return false;
}

export function ecompressMessages(
  messages: ChatMessage[],
  cfg: EcompressConfig = {},
): EcompressResult {
  const enabled = cfg.enabled ?? DEFAULTS.enabled;
  let originalChars = 0;
  let compressedChars = 0;
  let blocksCompressed = 0;

  if (!enabled) {
    const chars = messages.reduce((n, m) => n + asText(m.content).length, 0);
    return {
      messages,
      originalChars: chars,
      compressedChars: chars,
      tokensSavedEstimate: 0,
      blocksCompressed: 0,
    };
  }

  const out: ChatMessage[] = messages.map((m) => {
    const text = asText(m.content);
    originalChars += text.length;

    if (!isToolResultMessage(m) || text.length < (cfg.minCharsToCompress ?? DEFAULTS.minCharsToCompress)) {
      compressedChars += text.length;
      return m;
    }

    const compressed = compressToolText(text, cfg);
    if (compressed !== text) blocksCompressed += 1;
    compressedChars += compressed.length;

    // Preserve structured content shape when possible
    if (typeof m.content === "string") {
      return { ...m, content: compressed };
    }
    return { ...m, content: compressed };
  });

  const charSaved = Math.max(0, originalChars - compressedChars);
  // Rough OpenAI-ish estimate: ~4 chars / token
  const tokensSavedEstimate = Math.round(charSaved / 4);

  return {
    messages: out,
    originalChars,
    compressedChars,
    tokensSavedEstimate,
    blocksCompressed,
  };
}
