#!/usr/bin/env node
// Seed-time asset recommendations scaffold (shopping surface data layer).
// Reads a spec-decomposition.json, queries the assets finder per asset_request,
// writes asset-recommendations.json + self-contained HTML contact sheet.
//
// Usage: node scripts/recommend-assets.mjs <spec-decomposition.json>
//          [--out <dir>] [--limit N]
//
// RECOMMEND_FINDER_CMD env overrides the finder argv (space-separated or JSON
// array). Tests inject a stub; default shells out via resolveAssetsRoot.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveAssetsRoot } from "./lib/studio-paths.mjs";

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "asset-recommendations/0.1";

function fail(msg) {
  console.error(`[recommend-assets] ERROR: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  let out = null;
  let limit = 5;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") {
      out = argv[++i];
      if (!out) fail("--out requires a directory");
    } else if (a === "--limit") {
      const raw = argv[++i];
      limit = Number(raw);
      if (!Number.isInteger(limit) || limit < 1) fail(`--limit must be a positive integer, got ${raw}`);
    } else if (a.startsWith("-")) {
      fail(`unknown option: ${a}`);
    } else {
      positional.push(a);
    }
  }
  if (positional.length !== 1) {
    fail("usage: node scripts/recommend-assets.mjs <spec-decomposition.json> [--out <dir>] [--limit N]");
  }
  return { specPath: path.resolve(positional[0]), out, limit };
}

function requestQueryText(entry) {
  if (typeof entry.request === "string" && entry.request.trim()) return entry.request.trim();
  if (typeof entry.query === "string" && entry.query.trim()) return entry.query.trim();
  if (typeof entry.name === "string" && entry.name.trim()) return entry.name.trim();
  if (typeof entry.pack_id === "string" && entry.pack_id.trim()) return entry.pack_id.trim();
  return "";
}

function cardFromFinderRow(row) {
  const previews = Array.isArray(row.preview_images) ? row.preview_images : [];
  const preview = previews.length > 0 ? previews[0] : null;
  return {
    pack_id: row.pack_id,
    score: row.score,
    license: row.license ?? null,
    vendor: row.vendor ?? null,
    store_url: row.store_url ?? null,
    bytes_present: Boolean(row.bytes_present),
    path: row.path ?? null,
    preview,
  };
}

/** Resolve finder command argv. Injectable via RECOMMEND_FINDER_CMD. */
export function resolveFinderCmd(startDir = process.cwd()) {
  const override = process.env.RECOMMEND_FINDER_CMD;
  if (override && override.trim()) {
    const trimmed = override.trim();
    if (trimmed.startsWith("[")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) return arr;
      } catch {
        // fall through to shell-ish split
      }
    }
    // Simple whitespace split for "node /tmp/stub.mjs" etc.
    return trimmed.split(/\s+/);
  }
  const assetsRoot = resolveAssetsRoot(startDir);
  if (!assetsRoot) return null;
  const finder = path.join(assetsRoot, "_tools", "find_assets.py");
  return ["python3", finder];
}

/**
 * Invoke finder for free text. Returns { candidates, note? }.
 * Never throws on finder failure — empty candidates + note.
 */
export function queryFinder(finderCmd, queryText, limit) {
  if (!finderCmd || !finderCmd.length) {
    return { candidates: [], note: "assets root / finder unavailable" };
  }
  if (!queryText) {
    return { candidates: [], note: "empty request text" };
  }

  const args = [...finderCmd.slice(1), "find", queryText, "--limit", String(limit), "--check-local"];
  const bin = finderCmd[0];
  let proc;
  try {
    proc = spawnSync(bin, args, {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      env: process.env,
    });
  } catch (err) {
    return {
      candidates: [],
      note: `finder spawn failed: ${err && err.message ? err.message : "error"}`,
    };
  }
  if (proc.error) {
    return {
      candidates: [],
      note: `finder error: ${proc.error.message || "spawn error"}`,
    };
  }

  const stdout = String(proc.stdout || "").trim();
  if (proc.status !== 0) {
    let note = "no_match";
    if (stdout) {
      try {
        const first = JSON.parse(stdout.split("\n")[0]);
        if (first && first.no_match) note = "no_match";
        else note = `finder exit ${proc.status}`;
      } catch {
        note = `finder exit ${proc.status}`;
      }
    } else {
      note = `finder exit ${proc.status}`;
    }
    return { candidates: [], note };
  }

  const candidates = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row && row.no_match) continue;
      if (row && row.pack_id != null) candidates.push(cardFromFinderRow(row));
    } catch {
      // skip
    }
  }
  return { candidates: candidates.slice(0, limit) };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCard(c) {
  const title = escapeHtml(c.pack_id || "unknown");
  const score = c.score != null ? escapeHtml(String(c.score)) : "—";
  const license = escapeHtml(c.license || "—");
  const vendor = escapeHtml(c.vendor || "unknown");
  const store = c.store_url
    ? `<a href="${escapeHtml(c.store_url)}">${escapeHtml(c.store_url)}</a>`
    : "—";

  // Show img only when local bytes/previews present; else buy-at card.
  let media;
  if (c.bytes_present && c.preview) {
    // file:// absolute path — only when we believe bytes are local
    const src = c.preview.startsWith("file:")
      ? c.preview
      : `file://${c.preview}`;
    media = `<img src="${escapeHtml(src)}" alt="${title}" loading="lazy" />`;
  } else {
    media = `<div class="no-bytes">no local bytes — buy at <strong>${vendor}</strong></div>`;
  }

  return `<article class="card">
  ${media}
  <h3>${title}</h3>
  <dl>
    <dt>score</dt><dd>${score}</dd>
    <dt>license</dt><dd>${license}</dd>
    <dt>vendor</dt><dd>${vendor}</dd>
    <dt>store</dt><dd>${store}</dd>
  </dl>
</article>`;
}

export function renderHtml(doc) {
  const sections = (doc.requests || [])
    .map((req) => {
      const cards = (req.candidates || []).map(renderCard).join("\n");
      const note = req.note
        ? `<p class="note">${escapeHtml(req.note)}</p>`
        : "";
      const empty =
        !(req.candidates && req.candidates.length) && !req.note
          ? `<p class="note">no candidates</p>`
          : "";
      return `<section id="${escapeHtml(req.request_id)}">
  <h2>${escapeHtml(req.request_id)} <span class="kind">${escapeHtml(req.kind || "")}</span></h2>
  <p class="request">${escapeHtml(typeof req.request === "string" ? req.request : JSON.stringify(req.request))}</p>
  ${note}${empty}
  <div class="cards">${cards || ""}</div>
</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Asset recommendations</title>
<style>
  :root { font-family: system-ui, sans-serif; color: #1a1a1a; background: #f6f6f4; }
  body { max-width: 1100px; margin: 1.5rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.1rem; margin-top: 1.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
  h2 .kind { font-weight: normal; color: #666; font-size: 0.9rem; }
  .meta { color: #555; font-size: 0.85rem; }
  .request { font-style: italic; }
  .note { color: #666; }
  .cards { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.75rem; }
  .card { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 0.75rem; width: 220px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  .card img { display: block; max-width: 100%; height: auto; max-height: 140px; object-fit: contain; margin-bottom: 0.5rem; background: #eee; }
  .card h3 { font-size: 0.95rem; margin: 0 0 0.4rem; word-break: break-word; }
  .card dl { margin: 0; font-size: 0.8rem; }
  .card dt { font-weight: 600; display: inline; }
  .card dd { display: inline; margin: 0 0 0 0.25rem; }
  .card dt::before { content: ""; display: block; }
  .no-bytes { background: #f0e6d8; padding: 1rem 0.5rem; text-align: center; font-size: 0.85rem; min-height: 4rem; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; border-radius: 4px; }
</style>
</head>
<body>
<h1>Asset recommendations</h1>
<p class="meta">schema ${escapeHtml(doc.schema)} · generated ${escapeHtml(doc.generated_at)} · source ${escapeHtml(doc.source_spec)}</p>
${sections || "<p class=\"note\">No asset_requests in this spec.</p>"}
</body>
</html>
`;
}

export function buildRecommendations(spec, sourceSpecPath, limit, finderCmd) {
  if (!Array.isArray(spec.asset_requests)) {
    throw new Error("spec.asset_requests must be an array");
  }
  const requests = spec.asset_requests;
  const outRequests = [];
  for (const entry of requests) {
    const requestId = entry.request_id || entry.id || "unknown";
    const kind = entry.kind || "";
    const requestText =
      typeof entry.request === "string"
        ? entry.request
        : typeof entry.query === "string"
          ? entry.query
          : requestQueryText(entry);
    const query = requestQueryText({ ...entry, request: requestText });
    const { candidates, note } = queryFinder(finderCmd, query, limit);
    const row = {
      request_id: requestId,
      kind,
      request: requestText || query || "",
      candidates,
    };
    if (note) row.note = note;
    outRequests.push(row);
  }
  return {
    schema: SCHEMA,
    generated_at: new Date().toISOString(),
    source_spec: sourceSpecPath,
    requests: outRequests,
  };
}

function main() {
  const { specPath, out, limit } = parseArgs(process.argv.slice(2));
  let raw;
  try {
    raw = fs.readFileSync(specPath, "utf8");
  } catch (err) {
    fail(`unreadable spec: ${specPath}: ${err.message}`);
  }
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (err) {
    fail(`invalid JSON in ${specPath}: ${err.message}`);
  }
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    fail(`spec must be a JSON object: ${specPath}`);
  }
  if (!Array.isArray(spec.asset_requests)) {
    fail("spec.asset_requests must be an array");
  }

  const outDir = out ? path.resolve(out) : path.dirname(specPath);
  const finderCmd = resolveFinderCmd(FACTORY_ROOT);
  const doc = buildRecommendations(spec, specPath, limit, finderCmd);
  const html = renderHtml(doc);

  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "asset-recommendations.json");
  const htmlPath = path.join(outDir, "asset-recommendations.html");
  fs.writeFileSync(jsonPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  fs.writeFileSync(htmlPath, html, "utf8");
  console.log(`wrote ${jsonPath}`);
  console.log(`wrote ${htmlPath}`);
  console.log(`requests=${doc.requests.length}`);
}

// Allow import from tests without running main.
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
