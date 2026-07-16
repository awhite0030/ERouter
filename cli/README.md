# ERouter - FREE AI Router & Token Saver

**Never stop coding. Save 20-40% tokens with RTK + auto-fallback to FREE & cheap AI models.**

**Connect All AI Code Tools (Claude Code, Cursor, Antigravity, Copilot, Codex, Gemini, OpenCode, Cline, OpenClaw...) to 40+ AI Providers & 100+ Models.**

[![npm](https://img.shields.io/npm/v/erouter.svg)](https://www.npmjs.com/package/erouter)
[![Downloads](https://img.shields.io/npm/dm/erouter.svg)](https://www.npmjs.com/package/erouter)
[![Docker Pulls](https://img.shields.io/docker/pulls/awhite0030/ERouter.svg?logo=docker&label=Docker%20pulls)](https://hub.docker.com/r/awhite0030/ERouter)
[![GHCR](https://img.shields.io/badge/GHCR-decolua%2Ferouter-blue?logo=github)](https://github.com/awhite0030/ERouter/pkgs/container/erouter)
[![License](https://img.shields.io/npm/l/erouter.svg)](https://github.com/awhite0030/ERouter/blob/main/LICENSE)

<a href="https://trendshift.io/repositories/22628" target="_blank"><img src="https://trendshift.io/api/badge/repositories/22628" alt="decolua%2Ferouter | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

[🌐 Website](https://github.com/awhite0030/ERouter) • [📖 Full Docs](https://github.com/awhite0030/ERouter)

---

## 🤔 Why ERouter?

**Stop wasting money, tokens and hitting limits:**

- ❌ Subscription quota expires unused every month
- ❌ Rate limits stop you mid-coding
- ❌ Tool outputs (git diff, grep, ls...) burn tokens fast
- ❌ Expensive APIs ($20-50/month per provider)

**ERouter solves this:**

- ✅ **RTK Token Saver** - Auto-compress tool_result, save 20-40% tokens
- ✅ **Maximize subscriptions** - Track quota, use every bit before reset
- ✅ **Auto fallback** - Subscription → Cheap → Free, zero downtime
- ✅ **Multi-account** - Round-robin between accounts per provider
- ✅ **Universal** - Works with any OpenAI/Claude-compatible CLI

---

## ⚡ Quick Start

**Option 1 — npm (recommended for desktop):**

```bash
npm install -g erouter
erouter

# Or run directly with npx
npx erouter
```

**Option 2 — Docker (server/VPS):**

```bash
docker run -d --name erouter -p 20128:20128 \
  -v "$HOME/.erouter:/app/data" -e DATA_DIR=/app/data \
  awhite0030/ERouter:latest
```

Published images: [Docker Hub](https://hub.docker.com/r/awhite0030/ERouter) • [GHCR](https://github.com/awhite0030/ERouter/pkgs/container/erouter) (multi-platform amd64/arm64).

🎉 Dashboard opens at `http://localhost:20128`

**2. Connect a FREE provider (no signup needed):**

Dashboard → Providers → Connect **Kiro AI** (free Claude unlimited) or **OpenCode Free** (no auth) → Done!

**3. Use in your CLI tool:**

```
Claude Code/Codex/OpenClaw/Cursor/Cline Settings:
  Endpoint: http://localhost:20128/v1
  API Key:  [copy from dashboard]
  Model:    kr/claude-sonnet-4.5
```

That's it! Start coding with FREE AI models.

---

## 🚀 CLI Options

```bash
erouter                    # Start with default settings
erouter --port 8080        # Custom port
erouter --no-browser       # Don't open browser
erouter --skip-update      # Skip auto-update check
erouter --help             # Show all options
```

**Dashboard**: `http://localhost:20128/dashboard`

---

## 🛠️ Supported CLI Tools

Claude-Code • OpenClaw • Codex • OpenCode • Cursor • Antigravity • Cline • Continue • Droid • Roo • Copilot • Kilo Code • Gemini CLI • Qwen Code • iFlow • Crush • Crusher • Aider

Any tool supporting OpenAI/Claude-compatible API works.

---

## 💾 Data Location

- **macOS/Linux**: `~/.erouter/db/data.sqlite`
- **Windows**: `%APPDATA%/erouter/db/data.sqlite`
- **Docker**: `/app/data/db/data.sqlite` (mount `$HOME/.erouter` to persist)

---

## 📚 Documentation

Full docs, advanced setup, video tutorials & development guide:

- **GitHub**: https://github.com/awhite0030/ERouter
- **Full README**: https://github.com/awhite0030/ERouter/blob/main/app/README.md
- **Website**: https://github.com/awhite0030/ERouter

---

## 🙏 Acknowledgments

- **[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)** - Original Go implementation

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
