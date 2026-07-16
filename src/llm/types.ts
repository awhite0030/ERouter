/** LLM / OpenAI-compatible layer — inspired by 9router, redesigned for ERouter YAML-first DNA. */

export type ProviderTier = "subscription" | "cheap" | "free";

export interface LlmProviderConfig {
  id: string;
  /** OpenAI-compatible base, e.g. https://api.openai.com/v1 or http://127.0.0.1:11434/v1 */
  baseUrl: string;
  /** Literal API key (prefer apiKeyEnv in production) */
  apiKey?: string;
  /** Resolve key from process.env[apiKeyEnv] */
  apiKeyEnv?: string;
  /** Default Authorization header style */
  authHeader?: "bearer" | "x-api-key" | "none";
  /** Models this provider can serve (logical names, may include provider/model) */
  models: string[];
  /** Cost/reliability tier for fallback ordering */
  tier?: ProviderTier;
  /** Optional cost estimate USD per 1M input tokens (display only) */
  costInPer1M?: number;
  /** Optional cost estimate USD per 1M output tokens (display only) */
  costOutPer1M?: number;
  timeoutMs?: number;
  retries?: number;
  /** Extra headers sent to the provider */
  headers?: Record<string, string>;
}

export interface ComboModelRef {
  /** Provider id from llm.providers */
  provider: string;
  /** Model id sent upstream (may strip combo prefix) */
  model: string;
  tier?: ProviderTier;
  /** Weight for ensemble vote (default 1) */
  weight?: number;
}

export interface LlmComboConfig {
  id: string;
  /** Ordered fallback chain (or ensemble members) */
  models: ComboModelRef[];
  description?: string;
}

export interface EcompressConfig {
  enabled?: boolean;
  /** Max chars kept for a single tool_result after compression */
  maxToolResultChars?: number;
  /** Only compress tool_result blocks larger than this */
  minCharsToCompress?: number;
}

export interface PromptPoolConfig {
  enabled: boolean;
  /** Pool key prefix, default "prompts/" */
  prefix?: string;
}

export interface EnsembleConfig {
  /** Default strategy when model id is ensemble:<combo> */
  defaultStrategy?: "first-ok" | "concat" | "vote-longest";
  /** Max parallel members */
  maxParallel?: number;
}

export interface LlmUsageConfig {
  enabled: boolean;
}

export interface LlmConfig {
  enabled: boolean;
  /** Mount path for OpenAI-compatible API (default /v1) */
  basePath?: string;
  /** Require gateway auth for /v1 */
  requireAuth?: boolean;
  ecompress?: EcompressConfig;
  promptPool?: PromptPoolConfig;
  ensemble?: EnsembleConfig;
  usage?: LlmUsageConfig;
  providers: LlmProviderConfig[];
  combos: LlmComboConfig[];
  /** Optional system prompt injected into every chat request */
  defaultSystemPrompt?: string;
  /** Inject terse coding bias (ERouter "lean mode", inspired by caveman/ponytail ideas) */
  leanMode?: "off" | "lite" | "full";
}

export interface ChatMessage {
  role: string;
  content?: unknown;
  name?: string;
  tool_calls?: unknown;
  tool_call_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

export interface LlmHopResult {
  status: number;
  body: unknown;
  providerId: string;
  model: string;
  tier: ProviderTier;
  latencyMs: number;
  tokensSaved?: number;
  estimatedCostUsd?: number;
}

export interface UsageSnapshot {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  tokensSaved: number;
  estimatedCostUsd: number;
  byProvider: Record<
    string,
    { requests: number; promptTokens: number; completionTokens: number; estimatedCostUsd: number }
  >;
  byCombo: Record<string, number>;
  fallbackHops: number;
}
