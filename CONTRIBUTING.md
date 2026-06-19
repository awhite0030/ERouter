# Contributing

Thanks for your interest in ERouter. Small, focused PRs are the easiest to
review and the easiest to merge.

## Development setup

```bash
git clone https://github.com/awhite0030/ERouter.git
cd ERouter
npm install
npm test          # unit tests
npm run dev       # run the gateway with examples/gateway/erouter.yaml
npm run lint      # tsc --noEmit
```

## Project layout

```
src/
  aggregator/     json-merge and pool strategies
  config/         YAML loading and validation
  gateway/        server, routing, auth, rate-limit, cache, transform, metrics
  upstream/       undici-based client
  cli.ts          `erouter` command-line entrypoint
  server.ts       HTTP server entrypoint
  index.ts        public library API
tests/            node --test unit tests
examples/         ready-to-run erouter.yaml configurations
data/pool/        default shared resource pool
```

## Commit conventions

Use a Conventional Commits prefix:

- `feat:` for new features
- `fix:` for bug fixes
- `chore:` for tooling, deps, refactors with no user-facing change
- `docs:` for documentation only
- `test:` for test-only changes
- `ci:` for CI/workflow changes

## Coding style

- TypeScript strict mode is on; please keep it that way.
- No `any` in new code unless there is a clear reason.
- Keep modules small and side-effect free when possible.
- Public API lives in `src/index.ts` — re-export from there.

## Reporting issues

Please include:

- the exact `erouter.yaml` (or a minimal reproduction)
- the command you ran
- the full output (logs, error messages)
- the expected vs. actual behaviour

Security issues: see `SECURITY.md`.
