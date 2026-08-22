# ERouter — FREE AI router & token saver

Connect Claude Code, Cursor, Codex, Cline to 40+ providers. Auto-fallback, RTK, dashboard.

## Features
- Multi-provider routing with smart fallback
- Token optimization and basic cost tracking
- Interactive dashboard for monitoring usage
- Open-source and fully self-hostable
- OpenAI-compatible `/v1` endpoint — point most existing clients at it with zero code changes

When the primary provider is rate-limited or unavailable the router automatically tries the next one in your list — no manual intervention needed. Provider order in the config is the fallback priority (first = preferred).

If every configured provider is rate-limited at the same time the router returns a clear error so the client knows nothing is currently available.

Tip: start with 2–3 providers in your config; the first one is used by default and the rest act as automatic fallbacks. You can always re-order them later in the dashboard or config file.

## Quick Start
See the [docs](docs/) for detailed setup.

Quick smoke test after starting the server:
```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'
```

## TODO
- [ ] Add more provider examples
- [ ] Improve error handling in router
- [ ] Consider adding support for more AI IDEs

## Recent Changes
- Added note about behavior when all providers are rate-limited.
- Added a minimal curl example for the OpenAI-compatible endpoint.
- Mentioned OpenAI-compatible `/v1` endpoint for easier client integration.
- Updated TODO list for clarity.
- Minor doc improvements for better readability.
- Added note about community contributions.
- Small tweak to intro for better flow.
- Tiny wording polish in the intro.
- Another small clarity pass on the feature list.
- Tiny wording polish in features list.
- Small clarification on cost tracking wording.
- Clarified auto-fallback behavior for rate-limited providers.
- Tiny wording polish in features list.
- Added short note that provider order is the fallback priority.
- Tiny clarification that first provider is preferred.
- Added a short tip about starting with 2–3 providers.
- Extra note that you can re-order providers later in the dashboard.
- Tiny wording polish in recent changes section.
- Small clarity tweak: mentioned config file as alternative place to re-order providers.
- Quick note that dashboard changes take effect after a short refresh.

🚀 Keeping the project alive and kicking! Let's build better AI tools together. 💡

## Community
Star if you find it useful! Contributions welcome.
