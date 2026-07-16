# ERouter CI/CD

## Что уже настроено

| Workflow | Когда | Что делает |
|---|---|---|
| **CI** (`.github/workflows/ci.yml`) | push / PR → `main` | `npm ci`, unit tests, на `main` ещё Next.js build |
| **Version bump** (`version-bump.yml`) | каждый push → `main` | patch-версия +1, commit `chore(release): vX.Y.Z`, tag `vX.Y.Z` |
| **Release** (`release.yml`) | tag `v*` или вручную | сборка CLI standalone + GitHub Release |
| **Docker** (`docker-publish.yml`) | tag `v*` | образ в GHCR (+ Docker Hub при secrets) |
| **GitBook pages** | как было | docs site |

## Авто-версия после каждого коммита

После пуша в `main` (не PR):

1. CI гоняет тесты  
2. `version-bump` делает **patch** (`1.0.0` → `1.0.1`) в:
   - `package.json`
   - `cli/package.json`
   - `tests/package.json`
3. Пушит commit: `chore(release): v1.0.1 [skip version]`

**Тег / Docker / GitHub Release** — отдельно (чтобы не публиковать образ на каждый commit):

```bash
# после того как version уже 1.0.5 в package.json
git checkout main && git pull
git tag v1.0.5
git push origin v1.0.5
# → release.yml + docker-publish.yml
```

Чтобы **не** бампить версию:

```bash
git commit -m "docs: fix typo [skip version]"
# или
git commit -m "wip [skip ci]"
```

### Локально

```bash
# patch / minor / major
node scripts/bump-version.mjs patch
node scripts/bump-version.mjs minor
node scripts/bump-version.mjs 1.4.0
```

## Secrets (Settings → Secrets and variables → Actions)

| Secret | Нужен для |
|---|---|
| `GITHUB_TOKEN` | уже есть (packages + contents) |
| `DOCKERHUB_USERNAME` | Docker Hub push (опционально) |
| `DOCKERHUB_TOKEN` | Docker Hub push (опционально) |
| `NPM_TOKEN` | если позже публиковать CLI на npm (сейчас **не** в workflow — имя `erouter` занято) |

### Docker Hub (опционально)

1. Создай access token на hub.docker.com  
2. Добавь secrets `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`  
3. На push tag `v*` workflow `docker-publish.yml` соберёт multi-arch образ  

Без Docker Hub всё равно уйдёт в:

```text
ghcr.io/awhite0030/ERouter:1.0.1
ghcr.io/awhite0030/ERouter:latest
```

## Права репозитория

**Settings → Actions → General:**

- Workflow permissions: **Read and write** (нужно для version-bump push)  
- Allow GitHub Actions to create and approve pull requests: optional  

## Рекомендуемый поток

```text
feature branch → PR → CI (tests)
       ↓ merge main
  version-bump patch + tag vX.Y.Z
       ↓
  Release (CLI tarball) + Docker image
```

### Важно про npm CLI

`npm install -g erouter` с registry — **чужой** пакет.  
Свой CLI:

```bash
# после Release скачать tarball из GitHub Releases
npm install -g ./erouter-1.0.1.tgz

# или из исходников
cd cli && npm install -g .
```

Публикация на npm потребует **другого имени** (`@awhite0030/erouter` и т.п.).

## Если version-bump зациклился

Коммиты с `chore(release):` и `[skip version]` игнорируются.  
Если всё же loop — Actions → отмени workflow → поправь `if:` в `version-bump.yml`.

## Тяжёлый build

Полный `next build` только на push в `main`.  
PR ограничиваются unit tests, чтобы CI был быстрее.
