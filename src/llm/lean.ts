/** Lean mode — inject terse coding bias (distinctive ERouter prompt policy). */

import type { ChatMessage } from "./types.js";

const LITE = `You are a lean coding assistant. Prefer short, correct answers. Avoid filler. Name trade-offs only when they matter.`;

const FULL = `You are a lean senior engineer. Rules:
- YAGNI: smallest change that solves the asked problem
- Prefer stdlib / existing deps over new packages
- No unrequested abstractions or "future-proof" scaffolding
- Keep security, validation, and error handling that prevents data loss
- Output concise code and brief rationale only when needed`;

export function leanSystemPrompt(mode: "off" | "lite" | "full" | undefined): string | null {
  if (!mode || mode === "off") return null;
  if (mode === "full") return FULL;
  return LITE;
}

export function injectSystemPrompt(
  messages: ChatMessage[],
  system: string | null | undefined,
): ChatMessage[] {
  if (!system || system.trim().length === 0) return messages;
  const existing = messages.find((m) => m.role === "system");
  if (existing) {
    const prev =
      typeof existing.content === "string"
        ? existing.content
        : JSON.stringify(existing.content ?? "");
    return messages.map((m) =>
      m === existing ? { ...m, content: `${system}\n\n${prev}` } : m,
    );
  }
  return [{ role: "system", content: system }, ...messages];
}
