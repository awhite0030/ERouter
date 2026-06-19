# Changelog

All notable changes to ERouter are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `auth` block in `erouter.yaml` with API-key authentication and optional scopes.
- `rateLimit` block with per-key in-memory token bucket.
- `cache` block with TTL and LRU-ish eviction; per-route `cache.ttlMs` override.
- Response transforms on routes: `pick`, `drop`, `rename`, `wrapAs`.
- `/metrics` endpoint exposing request counts, per-route p95, per-source
  success rate, and cache stats.
- `/admin/routes` endpoint listing configured routes.
- CLI with `init`, `validate`, `serve` subcommands.
- More examples: `examples/minimal`, `examples/with-auth`, `examples/gateway`.
- Extra unit tests for auth, rate-limit, transform, cache, metrics.

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
