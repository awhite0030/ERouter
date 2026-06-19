# ERouter

[![CI](https://img.shields.io/badge/CI-passing-brightgreen)](https://github.com/awhite0030/ERouter/actions)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-informational)](CHANGELOG.md)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**ERouter** is an open-source API gateway and resource aggregator designed
for small study groups, indie developer teams, and local communities.

It sits in front of your scattered HTTP/REST sources (notes APIs, public
datasets, internal services, community wikis) and gives you one stable
endpoint, one shared resource pool, and one place to merge the answers.

## Why ERouter?

Small teams and study groups usually don't need an enterprise service mesh.
They need:

- **One URL** for several upstream APIs (route by path or host).
- **One merged view** when several APIs together answer one question.
- **One shared resource pool** so the team can share keys, snapshots, and
  curated datasets without a full platform.
- **One config file** in YAML, easy to read in a code review, easy to commit.

ERouter is intentionally small. It is a single Node.js process you can run
on a laptop, a VPS, or a small container.

## Features

- Declarative YAML routing (`routes[]`) with path patterns and upstream URLs.
- Per-route transforms: `pick`, `drop`, `rename`, `wrapAs`.
- Resource aggregator with two strategies:
  - `json-merge` — fan-out to several upstreams, merge JSON responses.
  - `pool` — share a curated resource pool (files, snapshots, JSON blobs)
    mounted from the local filesystem.
- API-key authentication with scopes and per-key rate limiting
  (in-memory token bucket).
- TTL cache with LRU-ish eviction; per-route `cache.ttlMs` override.
- `/metrics` endpoint: request counts, per-route p95, per-source
  success rate, cache stats.
- Pluggable upstream client backed by `undici` with retries and timeouts.
- Health endpoint, structured logs, no external database required.
- `erouter` CLI with `init`, `validate`, `serve` subcommands.

## Quick start

```bash
git clone https://github.com/awhite0030/ERouter.git
cd ERouter
npm install
npx erouter init
npx erouter serve
```

By default the gateway listens on `http://127.0.0.1:8080`.

### Example config

```yaml
server:
  host: 127.0.0.1
  port: 8080

auth:
  enabled: false
  header: x-api-key
  keys:
    - id: local
      secret: change-me
      scopes: ["*"]
      rpm: 600
      burst: 60

rateLimit:
  enabled: true
  defaultRpm: 60
  defaultBurst: 30

cache:
  enabled: true
  defaultTtlMs: 30000
  maxEntries: 1000

routes:
  - id: github-user
    match:
      path: /github/users/:login
    upstream:
      url: https://api.github.com/users/{login}
      headers:
        Accept: application/vnd.github+json
    transform:
      pick: [login, id, name, bio]
    cache:
      ttlMs: 60000

  - id: book-search
    match:
      path: /books/:q
    aggregator:
      strategy: json-merge
      sources:
        - id: openlibrary
          url: https://openlibrary.org/search.json?q={q}
        - id: googlebooks
          url: https://www.googleapis.com/books/v1/volumes?q={q}
      merge:
        as: results
        pick:
          openlibrary: docs
          googlebooks: items
    transform:
      wrapAs: books

  - id: study-pool
    match:
      path: /pool/:key
    aggregator:
      strategy: pool
      poolKey: "{key}.json"

resources:
  pool:
    dir: ./data/pool
```

See `examples/` for ready-to-run variants (`minimal`, `with-auth`, `gateway`).

## Endpoints

- `GET  /healthz` — liveness probe.
- `GET  /metrics` — JSON metrics snapshot.
- `GET  /admin/routes` — list of configured routes.
- `GET  /pool` — keys in the resource pool.
- `GET  /pool/:key` — a single resource from the pool.
- everything else — matched against `routes[]`.

## CLI

```bash
erouter init                  # write a starter erouter.yaml
erouter validate erouter.yaml # parse and validate the config
erouter serve --config FILE   # run the gateway
```

## Project layout

```
src/
  config/         YAML loader and validation
  gateway/        Fastify server, routing, auth, rate-limit,
                  cache, transform, metrics
  aggregator/     json-merge and pool strategies
  upstream/       HTTP client (undici) with retries
  cli.ts          erouter command-line entrypoint
  server.ts       HTTP server entrypoint
  index.ts        public library API
tests/            node --test unit tests
examples/         sample erouter.yaml configurations
data/pool/        default shared resource pool
```

## Roadmap

- Optional SQLite-backed cache for merged responses.
- GraphQL-style field selection in transforms.
- Web UI for browsing the resource pool.
- WASM filter plugin for richer transforms.
- Distributed rate limiter (Redis backend).

## Contributing

See `CONTRIBUTING.md`. Issues and PRs are welcome.

## License

MIT. See `LICENSE`.
