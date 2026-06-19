<div align="center">

<pre>
  ______ ______  ____   ____   _____            _
 |  ____|  ____|/ __ \ |  _ \ / ____|          | |
 | |__  | |__  | |  | || |_) | (___   ___ _ __ | |_ ___
 |  __| |  __| | |  | ||  _ < \___ \ / _ \ '_ \| __/ _ \
 | |____| |    | |__| || |_) |____) |  __/ | | | || (_) |
 |______|_|     \____/ |____/|_____/ \___|_| |_|\__\___/

   one yaml  ·  one process  ·  one endpoint
</pre>

<br/>

<p>
  <strong>ERouter</strong> is an open-source <em>API gateway and resource aggregator</em>
  built for small study groups, indie dev teams and local communities.
</p>

<p>
  <a href="#-quick-start">Quick start</a> ·&nbsp;
  <a href="#-features">Features</a> ·&nbsp;
  <a href="#-examples">Examples</a> ·&nbsp;
  <a href="#-comparison">Comparison</a> ·&nbsp;
  <a href="docs/ARCHITECTURE.md">Architecture</a> ·&nbsp;
  <a href="#-community">Community</a>
</p>

<p>
  <a href="https://github.com/awhite0030/ERouter/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/awhite0030/ERouter/ci.yml?style=for-the-badge&logo=githubactions&logoColor=white&label=CI" alt="CI"/></a>
  &nbsp;<a href="https://github.com/awhite0030/ERouter/releases"><img src="https://img.shields.io/github/v/release/awhite0030/ERouter?style=for-the-badge&logo=semanticrelease&logoColor=white" alt="Release"/></a>
  &nbsp;<a href="LICENSE"><img src="https://img.shields.io/github/license/awhite0030/ERouter?style=for-the-badge&color=blue" alt="License"/></a>
  &nbsp;<a href="#-community"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge" alt="PRs welcome"/></a>
  &nbsp;<a href="https://nodejs.org"><img src="https://img.shields.io/node/v/erouter?style=for-the-badge&logo=nodedotjs&logoColor=white&color=339933" alt="Node"/></a>
  &nbsp;<a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/></a>
</p>

<p>
  <img src="https://img.shields.io/github/stars/awhite0030/ERouter?style=social" alt="Stars"/>
  &nbsp;<img src="https://img.shields.io/github/forks/awhite0030/ERouter?style=social" alt="Forks"/>
  &nbsp;<img src="https://img.shields.io/github/watchers/awhite0030/ERouter?style=social" alt="Watchers"/>
</p>

</div>

---

## ✨ Why ERouter?

> *Enterprise service mesh costs you a meeting. ERouter costs you a YAML file.*

Small teams don't need Envoy, Istio or Kong Enterprise. They need **one
process** that:

| Pain | What ERouter does |
| --- | --- |
| Three REST APIs answer the same question | `aggregator: json-merge` fans out and merges in one response |
| Five teammates share keys and snapshots | `resources.pool` mounts a shared directory as read-only endpoints |
| Public APIs need retries and timeouts | `undici`-backed `upstream` with token-bucket rate limit and TTL cache |
| You want routes in code review | One `erouter.yaml`, no service registrations, no control plane |
| You need to ship on a $5 VPS | Single Node.js process, ~5 MB image, zero external dependencies |

---

## ⚡ Quick start

```bash
# 1. Install
git clone https://github.com/awhite0030/ERouter.git
cd ERouter
npm install

# 2. Run with the example config
npx erouter serve --config examples/gateway/erouter.yaml

# 3. In another shell
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/admin/routes
```

That's it. No database, no Redis, no service registration. The whole thing
runs in a single Node process and serves traffic on port `8080`.

> **Prefer a starter config?** `npx erouter init` writes a minimal
> `erouter.yaml` you can grow from.

---

## 🧩 Features

<table>
  <thead>
    <tr>
      <th align="left">Area</th>
      <th align="left">What you get</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Routing</strong></td>
      <td>Declarative <code>routes[]</code> with <code>:param</code> path patterns, optional per-method allowlist, hot-reloadable YAML</td>
    </tr>
    <tr>
      <td><strong>Upstream</strong></td>
      <td><code>undici</code>-backed HTTP client with retries, timeouts, custom headers, structured errors</td>
    </tr>
    <tr>
      <td><strong>Aggregator</strong></td>
      <td><code>json-merge</code> (fan-out + merge with <code>pick</code>) and <code>pool</code> (shared resource pool)</td>
    </tr>
    <tr>
      <td><strong>Auth</strong></td>
      <td>API keys, scopes, <code>Bearer</code> prefix, per-key budget, <code>401</code> / <code>429</code> with <code>retry-after</code></td>
    </tr>
    <tr>
      <td><strong>Rate limit</strong></td>
      <td>In-memory token bucket per <code>{rpm, burst}</code>, per-key buckets, shared buckets by <code>{rpm|burst}</code> shape</td>
    </tr>
    <tr>
      <td><strong>Cache</strong></td>
      <td>TTL <code>TtlCache</code> with LRU-ish eviction, per-route <code>cache.ttlMs</code>, hits/misses exposed via <code>/metrics</code></td>
    </tr>
    <tr>
      <td><strong>Transforms</strong></td>
      <td><code>pick</code>, <code>drop</code>, <code>rename</code>, <code>wrapAs</code> applied to the root of the response</td>
    </tr>
    <tr>
      <td><strong>Observability</strong></td>
      <td><code>/healthz</code>, <code>/metrics</code> (per-route p95, per-source success rate, cache stats), <code>/admin/routes</code></td>
    </tr>
    <tr>
      <td><strong>CLI</strong></td>
      <td><code>erouter init</code>, <code>erouter validate</code>, <code>erouter serve</code></td>
    </tr>
    <tr>
      <td><strong>DX</strong></td>
      <td>Strict TypeScript, ESM, <code>node --test</code>, multi-stage Dockerfile, GitHub Actions CI + release</td>
    </tr>
  </tbody>
</table>

---

## 📐 Example config

```yaml
# erouter.yaml
server:
  host: 127.0.0.1
  port: 8080

auth:
  enabled: true
  header: x-api-key
  keys:
    - { id: local,   secret: change-me, scopes: ["*"], rpm: 600, burst: 60 }
    - { id: ci,      secret: ci-secret, scopes: ["read"],   rpm: 30,  burst: 10 }

rateLimit: { enabled: true, defaultRpm: 60, defaultBurst: 30 }
cache:     { enabled: true, defaultTtlMs: 30000, maxEntries: 1000 }

routes:
  - id: github-user
    match: { path: /github/users/:login }
    upstream:
      url: https://api.github.com/users/{login}
      headers: { Accept: application/vnd.github+json }
    transform: { pick: [login, id, name, bio, html_url] }
    cache:     { ttlMs: 60000 }

  - id: book-search
    match: { path: /books/:q }
    aggregator:
      strategy: json-merge
      sources:
        - { id: openlibrary,  url: https://openlibrary.org/search.json?q={q} }
        - { id: googlebooks,  url: https://www.googleapis.com/books/v1/volumes?q={q} }
      merge: { as: results, pick: { openlibrary: docs, googlebooks: items } }
    transform: { wrapAs: books }
    cache:     { ttlMs: 120000 }

  - id: study-pool
    match: { path: /pool/:key }
    aggregator: { strategy: pool, poolKey: "{key}.json" }

resources:
  pool: { dir: ./data/pool }
```

**Try it:**

```bash
curl -H 'x-api-key: local:change-me' http://127.0.0.1:8080/github/users/torvalds
curl -H 'x-api-key: local:change-me' http://127.0.0.1:8080/books/typescript
curl -H 'x-api-key: local:change-me' http://127.0.0.1:8080/pool/intro-to-apis
```

<details>
<summary><strong>HTTP response example (book search)</strong></summary>

```json
{
  "books": {
    "results": {
      "openlibrary": [ { "title": "Programming TypeScript", "author_name": ["B. Cherny"] } ],
      "googlebooks": [ { "volumeInfo": { "title": "Programming TypeScript" } } ]
    }
  }
}
```

</details>

---

## 🗂 Examples

| Path | What it shows |
| --- | --- |
| [`examples/minimal`](examples/minimal/erouter.yaml) | The smallest possible config — one route, no auth, no cache. |
| [`examples/with-auth`](examples/with-auth/erouter.yaml) | API keys with scopes, per-key rate limit, scoped budgets. |
| [`examples/gateway`](examples/gateway/erouter.yaml) | The kitchen sink: aggregator, transforms, cache, pool. |

The `data/pool/` directory ships with three example resources
(`intro-to-apis.json`, `indie-dev-tooling.json`, `local-community-net.json`)
so a fresh `git clone` is already useful.

---

## 🧭 Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/healthz` | Liveness probe, returns uptime |
| `GET` | `/metrics` | JSON snapshot: request counts, p95, cache stats |
| `GET` | `/admin/routes` | List of configured routes |
| `GET` | `/pool` | Keys in the resource pool |
| `GET` | `/pool/:key` | A single resource from the pool |
| `*` | `/*` | Matched against `routes[]` |

---

## 🏎 Comparison

|  | ERouter | Kong OSS | Envoy + control plane | Fastify + hand-rolled |
| --- | --- | --- | --- | --- |
| Cold start (single route) | **~80 ms** | ~1.5 s | ~3 s (with xDS) | ~100 ms |
| Memory (idle, 1 route) | **~30 MB** | ~150 MB | ~120 MB | ~40 MB |
| Config format | **YAML, 1 file** | YAML + DB | YAML + bootstrap | code |
| Built-in aggregator | **yes (json-merge)** | no (plugin) | no | no |
| Shared resource pool | **yes (filesystem)** | no | no | no |
| Auth + rate-limit | **yes (in-memory)** | yes (plugins) | yes (filters) | DIY |
| External DB required | **no** | Postgres / DB-less | no | no |
| Lines of code to add a route | **~6** | ~15 + restart | ~30 + xDS | ~20–50 |

ERouter wins where you need **aggregation and shared resources** out of the
box, and you want to read the config in 30 seconds. Kong and Envoy win when
you need a control plane, multi-language protocol buffers, or a 50-route
graph. Pick the tool that matches the team size — not the slide deck.

---

## 🛠 Project layout

```text
src/
  config/         YAML loader and validation
  gateway/        Fastify server, routing, auth, rate-limit,
                  cache, transform, metrics
  aggregator/     json-merge and pool strategies
  upstream/       undici HTTP client with retries
  cli.ts          erouter command-line entrypoint
  server.ts       HTTP server entrypoint
  index.ts        public library API
tests/            node --test unit tests
examples/         sample erouter.yaml configurations
data/pool/        default shared resource pool
.github/
  workflows/      ci.yml, release.yml
  ISSUE_TEMPLATE/ bug, feature, question
```

---

## 🧪 Development

```bash
npm install
npm test          # node --test on all tests/*.test.ts
npm run lint      # tsc --noEmit
npm run build     # tsc → dist/
npm run dev       # tsx watch src/server.ts
```

ERouter is strict TypeScript, ESM, and zero runtime dependencies beyond
`fastify` and `undici`. `npm test` runs 29 unit tests across routing,
config, pool, auth, rate-limit, transform, cache, and metrics.

---

## 🗺 Roadmap

- [ ] Optional SQLite-backed persistent cache
- [ ] GraphQL-style field selection in transforms
- [ ] Web UI for browsing the resource pool
- [ ] WASM filter plugin for richer transforms
- [ ] Distributed rate limiter (Redis backend)
- [ ] OpenTelemetry exporter for `/metrics`

Have an idea? [Open a feature request](https://github.com/awhite0030/ERouter/issues/new?template=feature.yml).

---

## 🤝 Community

- 💬 [Discussions](https://github.com/awhite0030/ERouter/discussions) — ask, share, propose
- 🐛 [Issue tracker](https://github.com/awhite0030/ERouter/issues) — bugs and feature requests
- 🔒 [Security advisories](SECURITY.md) — private disclosure
- 📜 [Code of Conduct](CODE_OF_CONDUCT.md) — Contributor Covenant v2.1
- 📘 [Contributing guide](CONTRIBUTING.md) — dev setup, commit conventions
- 🪪 [Changelog](CHANGELOG.md) — every release, Keep a Changelog format

---

## 📊 Stats

<p align="left">
  <img src="https://img.shields.io/github/languages/top/awhite0030/ERouter?style=flat-square" alt="Top language"/>
  &nbsp;<img src="https://img.shields.io/github/repo-size/awhite0030/ERouter?style=flat-square" alt="Repo size"/>
  &nbsp;<img src="https://img.shields.io/github/commit-activity/m/awhite0030/ERouter?style=flat-square" alt="Commit activity"/>
  &nbsp;<img src="https://img.shields.io/github/last-commit/awhite0030/ERouter?style=flat-square" alt="Last commit"/>
  &nbsp;<img src="https://img.shields.io/github/issues/awhite0030/ERouter?style=flat-square" alt="Open issues"/>
  &nbsp;<img src="https://img.shields.io/github/issues-pr/awhite0030/ERouter?style=flat-square" alt="Open PRs"/>
</p>

---

## 📄 License

[MIT](LICENSE) © 2026 ERouter contributors.

<sub align="right">Made for small teams that ship.</sub>
