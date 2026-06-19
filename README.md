# ERouter

**ERouter** is an open-source API gateway and resource aggregator designed for
small study groups, indie developer teams, and local communities.

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

## Features (MVP)

- Declarative YAML routing (`routes[]`) with path patterns and upstream URLs.
- Per-route transforms: rename, drop, merge, JSONata-style projection.
- Resource aggregator with two strategies:
  - `json-merge` — fan-out to several upstreams, merge JSON responses.
  - `pool` — share a curated resource pool (files, snapshots, JSON blobs)
    mounted from the local filesystem.
- Pluggable upstream client backed by `undici` with simple timeouts and
  retries.
- Health endpoint, structured logs, no external database required.

## Quick start

```bash
git clone https://github.com/awhite0030/ERouter.git
cd ERouter
npm install
npm run dev
```

By default the gateway listens on `http://127.0.0.1:8080` and reads
`./erouter.yaml` from the working directory.

### Example config

```yaml
server:
  host: 127.0.0.1
  port: 8080

routes:
  - id: github-user
    match:
      path: /github/users/:login
    upstream:
      url: https://api.github.com/users/{login}
      headers:
        Accept: application/vnd.github+json

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

resources:
  pool:
    dir: ./data/pool
```

## Project layout

```
src/
  config/         YAML loader and validation
  gateway/        Fastify server, routing, transforms
  aggregator/     json-merge and pool strategies
  upstream/       HTTP client (undici) with retries
  server.ts       entrypoint
tests/            node --test unit tests
examples/         sample erouter.yaml and data
```

## Roadmap

- Optional SQLite-backed cache for merged responses.
- API key authentication and per-key rate limiting.
- Web UI for browsing the resource pool.
- WASM filter plugin for richer transforms.

## License

MIT. See `LICENSE`.
