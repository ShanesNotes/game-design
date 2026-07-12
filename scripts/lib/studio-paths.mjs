// Studio root + discipline roots per game-studio/docs/path-registry.md.
// Discovery: CLI env overrides first, then STUDIO_ROOT, then walk-up for DISCIPLINES.md.
// Never hard-code absolute product paths; pins use git rev-parse of resolved roots.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/** Walk up from startDir until a directory containing DISCIPLINES.md is found. */
export function findStudioRoot(startDir = process.cwd()) {
  if (process.env.STUDIO_ROOT) return path.resolve(process.env.STUDIO_ROOT);
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, "DISCIPLINES.md"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function resolveAssetsRoot(startDir = process.cwd()) {
  if (process.env.GAME_ASSETS_ROOT) return path.resolve(process.env.GAME_ASSETS_ROOT);
  const studio = findStudioRoot(startDir);
  return studio ? path.join(studio, "assets") : null;
}

export function resolveLoreRoot(startDir = process.cwd()) {
  if (process.env.GAME_LORE_ROOT) return path.resolve(process.env.GAME_LORE_ROOT);
  const studio = findStudioRoot(startDir);
  return studio ? path.join(studio, "lore") : null;
}

export function resolveContractsRoot(startDir = process.cwd()) {
  if (process.env.GAME_CONTRACTS_ROOT) return path.resolve(process.env.GAME_CONTRACTS_ROOT);
  const studio = findStudioRoot(startDir);
  return studio ? path.join(studio, "contracts") : null;
}

/** git rev-parse HEAD in a repo root; returns null if not a git work tree. */
export function gitHead(repoRoot) {
  if (!repoRoot || !fs.existsSync(repoRoot)) return null;
  const r = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  if (r.status !== 0) return null;
  const sha = String(r.stdout || "").trim();
  return /^[0-9a-f]{40}$/i.test(sha) ? sha : null;
}

/** contracts_version for pins — current forge-manifest schema_version (last enum = current; earlier = N-1). */
export function contractsVersion(startDir = process.cwd()) {
  const root = resolveContractsRoot(startDir);
  if (!root) return null;
  const schemaPath = path.join(root, "forge-manifest.schema.json");
  if (!fs.existsSync(schemaPath)) return null;
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const versions = schema?.properties?.schema_version?.enum;
    if (!Array.isArray(versions) || versions.length === 0) return null;
    const ver = versions[versions.length - 1];
    return typeof ver === "string" ? ver : null;
  } catch {
    return null;
  }
}

export function forgeManifestSchemaPath(startDir = process.cwd()) {
  const root = resolveContractsRoot(startDir);
  if (!root) return null;
  const p = path.join(root, "forge-manifest.schema.json");
  return fs.existsSync(p) ? p : null;
}
