# Changelog

All notable changes to ERouter are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] — 2026-07-16

### Added
- **LLM router** (OpenAI-compatible): `GET /v1/models`, `POST /v1/chat/completions`.
- YAML `llm` block: providers, combos, ECompress, lean mode, ensemble, usage.
- **ECompress** — fail-open tool_result compression (git-diff / grep / tree / truncate).
- **Tiered fallback** chains: subscription → cheap → free via combos.
- **Ensemble** mode (`ensemble:<combo>`): first-ok | concat | vote-longest.
- Transparent response headers: `X-ERouter-Provider`, `X-ERouter-Model`,
  `X-ERouter-Tier`, `X-ERouter-Tokens-Saved`, `X-ERouter-Cost-Estimate-Usd`, …
- `/metrics` includes `llm` usage snapshot when enabled.
- Example: `examples/llm/erouter.yaml` for Cursor / Cline / Codex / Ollama / OpenRouter.
- Unit tests: `ecompress`, `llm-resolve`.

### Notes
- Concepts inspired by [9router](https://github.com/decolua/9router) (multi-provider
  routing, token saving, fallback), redesigned as **YAML-first single process** —
  no dashboard/SQLite required; classic REST gateway + resource pool stay first-class.

## [0.1.0] — 2026-06-20

### Added
- Initial scaffold.
- Declarative YAML routing with `:param` path patterns.
- Upstream proxy mode via `undici` with retries and timeouts.
- `json-merge` aggregator: fan-out to several sources, merge by `pick`.
- `pool` aggregator: shared resource pool from the local filesystem.
- Health endpoint, Fastify-based server, structured logging.
- Multi-stage Dockerfile, `docker-compose.yml`.
- GitHub Actions CI (lint + test + build).
