// Spec-pack materialization helpers for package-spec.mjs (ADR 0006 sole entry).
// Owns staging lifecycle, exact target write, and cleanup so dry-run / fail paths
// cannot leak temp dirs or leave a "passed" receipt that does not match the tree.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { leakageErrors, listFiles } from "./leakage.mjs";

const STAGING_PREFIX = "tgf-spec-pack-";

/** Relative POSIX-style paths of every file under root, sorted. */
export function relativeFileSet(root) {
  return listFiles(root)
    .map((abs) => path.relative(root, abs).split(path.sep).join("/"))
    .sort();
}

/**
 * Create a staging dir, run work(staging), always remove staging (including on throw).
 * Never calls process.exit — callers map results to exit codes after return.
 */
export function withStaging(work, { prefix = STAGING_PREFIX, tmpdir = os.tmpdir() } = {}) {
  const staging = fs.mkdtempSync(path.join(tmpdir, prefix));
  try {
    return work(staging);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

/**
 * Copy staged pack files into target, then delete any target files not in the pack set
 * so the final tree is exactly equal to the verified pack file set (--force exact replace).
 * Returns the sorted relative file list of the target after write.
 */
export function materializeExact(staging, target, packFiles) {
  fs.mkdirSync(target, { recursive: true });
  const want = new Set(packFiles);
  for (const rel of packFiles) {
    const from = path.join(staging, rel);
    const to = path.join(target, ...rel.split("/"));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  // Remove stale files not in the verified pack set.
  for (const abs of listFiles(target)) {
    const rel = path.relative(target, abs).split(path.sep).join("/");
    if (!want.has(rel)) fs.rmSync(abs, { force: true });
  }
  // Prune empty directories left behind by stale removals (deepest first).
  pruneEmptyDirs(target, target);

  const finalFiles = relativeFileSet(target);
  if (finalFiles.length !== packFiles.length || finalFiles.some((f, i) => f !== packFiles[i])) {
    const extra = finalFiles.filter((f) => !want.has(f));
    const missing = packFiles.filter((f) => !finalFiles.includes(f));
    throw new Error(
      `target tree does not match verified pack set` +
        (missing.length ? `; missing: ${missing.join(", ")}` : "") +
        (extra.length ? `; extra: ${extra.join(", ")}` : "")
    );
  }
  return finalFiles;
}

function pruneEmptyDirs(dir, root) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) pruneEmptyDirs(path.join(dir, ent.name), root);
  }
  if (dir === root) return;
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

/**
 * Leakage gate over a pack root (staging or final target). Returns error strings.
 */
export function packLeakageErrors(root) {
  return leakageErrors([root], root);
}

/**
 * Full handoff: build staging via fillStaging(staging), leakage-check staging,
 * dry-run report or exact materialize + final-tree leakage check.
 *
 * @param {object} opts
 * @param {(staging: string) => void} opts.fillStaging - write pack contents into staging
 * @param {string} opts.target
 * @param {boolean} opts.write
 * @param {boolean} opts.force
 * @param {(msg: string) => void} [opts.log]
 * @param {string} [opts.seedId]
 * @returns {{
 *   ok: boolean,
 *   mode: 'dry-run'|'exported'|'blocked',
 *   packFiles?: string[],
 *   target?: string,
 *   error?: string,
 *   receipt?: { packFiles: string[], target: string, fileCount: number }
 * }}
 */
export function runSpecPackHandoff({
  fillStaging,
  target,
  write,
  force,
  log = console.log,
  seedId = ""
}) {
  return withStaging((staging) => {
    fillStaging(staging);

    const leaks = packLeakageErrors(staging);
    if (leaks.length) {
      return {
        ok: false,
        mode: "blocked",
        error:
          `spec pack failed leakage gate; redact these in the run artifacts and re-export:\n  ${leaks.join("\n  ")}`
      };
    }

    const packFiles = relativeFileSet(staging);

    if (!write) {
      log(`# Dry-run spec pack for ${seedId}`);
      log(`# Target: ${target}`);
      log(`# Re-run with --write to export.`);
      for (const f of packFiles) log(`- ${f}`);
      return { ok: true, mode: "dry-run", packFiles, target };
    }

    if (fs.existsSync(target) && fs.readdirSync(target).length && !force) {
      return {
        ok: false,
        mode: "blocked",
        error: `${target} exists and is not empty; pass --force to overwrite its pack files`
      };
    }

    const finalFiles = materializeExact(staging, target, packFiles);

    // Terminal artifact is the gate that matters: re-scan the written tree.
    const finalLeaks = packLeakageErrors(target);
    if (finalLeaks.length) {
      return {
        ok: false,
        mode: "blocked",
        packFiles: finalFiles,
        target,
        error:
          `spec pack failed leakage gate on final target; redact these in the run artifacts and re-export:\n  ${finalLeaks.join("\n  ")}`
      };
    }

    return {
      ok: true,
      mode: "exported",
      packFiles: finalFiles,
      target,
      receipt: {
        packFiles: finalFiles,
        target,
        fileCount: finalFiles.length
      }
    };
  });
}
