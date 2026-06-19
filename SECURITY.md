# Security

If you discover a security issue in ERouter, please **do not** open a public
issue. Instead, contact the maintainers privately via GitHub Security
Advisories for this repository:

`https://github.com/awhite0030/ERouter/security/advisories/new`

Please include:

- a clear description of the issue and the affected versions,
- steps to reproduce,
- the impact (what an attacker can do),
- any proposed mitigation if you have one.

We will acknowledge the report within 7 days and aim to ship a fix or
mitigation in a follow-up release.

## Notes for operators

- ERouter does not store secrets at rest. API keys live in `erouter.yaml`
  for local development; in production, mount the file from a secret
  manager (Kubernetes Secret, Docker Secret, Vault, etc.).
- The shared resource pool reads files from `resources.pool.dir`. Do not
  point it at a directory that contains untrusted writable content.
- Reverse-proxy ERouter behind TLS (Caddy, nginx, Cloudflare, etc.) for
  any non-local use.
