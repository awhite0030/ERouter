#!/usr/bin/env node
/**
 * Bump version in root package.json + cli/package.json (keep in sync).
 *
 * Usage:
 *   node scripts/bump-version.mjs            # patch (default)
 *   node scripts/bump-version.mjs patch|minor|major
 *   node scripts/bump-version.mjs 1.2.3      # set exact
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  join(root, "package.json"),
  join(root, "cli", "package.json"),
  join(root, "tests", "package.json"),
];

const arg = (process.argv[2] || "patch").toLowerCase();

function parseSemver(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!m) throw new Error(`Invalid semver: ${v}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function bump(v, kind) {
  const s = parseSemver(v);
  if (kind === "major") return `${s.major + 1}.0.0`;
  if (kind === "minor") return `${s.major}.${s.minor + 1}.0`;
  if (kind === "patch") return `${s.major}.${s.minor}.${s.patch + 1}`;
  // exact version
  parseSemver(kind);
  return kind.replace(/^v/, "");
}

const rootPkg = JSON.parse(readFileSync(files[0], "utf8"));
const next = bump(rootPkg.version || "0.0.0", arg);

for (const file of files) {
  try {
    const pkg = JSON.parse(readFileSync(file, "utf8"));
    const prev = pkg.version;
    pkg.version = next;
    writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    console.log(`${file.replace(root + "/", "")}: ${prev} → ${next}`);
  } catch (e) {
    if (e && e.code === "ENOENT") continue;
    throw e;
  }
}

// machine-readable for CI
console.log(`::set-output name=version::${next}`);
console.log(`VERSION=${next}`);
