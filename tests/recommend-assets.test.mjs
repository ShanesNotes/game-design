// recommend-assets.mjs — shopping surface scaffold (injectable finder stub).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  classifyFinderResult,
  createMemoryAdapter,
  findForRequest,
  queriesForRequest,
  requestLabel
} from "../scripts/lib/asset-finder.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(REPO, "scripts", "recommend-assets.mjs");

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "recommend-assets-"));
}

/** Write a stub finder that answers based on query text. */
function writeStubFinder(dir, behavior = "match") {
  const stub = path.join(dir, "stub-finder.mjs");
  // argv: node stub-finder.mjs find <query> --limit N --check-local
  const body = `#!/usr/bin/env node
const args = process.argv.slice(2);
const qi = args.indexOf("find");
const query = qi >= 0 ? args[qi + 1] : "";
const behavior = ${JSON.stringify(behavior)};
if (behavior === "fail" || query.includes("NOMATCH") || behavior === "no_match") {
  console.log(JSON.stringify({ no_match: true, query, nearest: [] }));
  process.exit(1);
}
if (behavior === "empty_ok") {
  process.exit(0);
}
// Default: one match with bytes_present false, one with true when query says LOCAL
const local = query.includes("LOCAL");
const row = {
  pack_id: "fixture-pack",
  name: "Fixture Pack",
  score: 42,
  license: "CC0",
  path: "/tmp/fixture-pack",
  preview_images: local ? ["/tmp/fixture-preview.png"] : ["/tmp/missing-preview.png"],
  vendor: "kenney",
  store_url: "https://kenney.nl/assets",
  bytes_present: local,
  previews_present: local,
};
console.log(JSON.stringify(row));
process.exit(0);
`;
  fs.writeFileSync(stub, body, "utf8");
  return stub;
}

function runCli(specPath, { out, limit, env = {} } = {}) {
  const args = [SCRIPT, specPath];
  if (out) args.push("--out", out);
  if (limit != null) args.push("--limit", String(limit));
  return spawnSync(process.execPath, args, {
    encoding: "utf8",
    cwd: REPO,
    env: { ...process.env, ...env },
  });
}

test("canonical exact {pack_id, name} stays exact (not name-only)", () => {
  const req = { request_id: "x", kind: "model", pack_id: "nature", name: "Tree", query: "tree model" };
  assert.deepEqual(queriesForRequest(req), ["nature Tree", "tree model"]);
  assert.equal(requestLabel(req), "nature Tree");

  const adapter = createMemoryAdapter(({ query }) => {
    if (query === "nature Tree") {
      return {
        status: 0,
        stdout: JSON.stringify({
          pack_id: "nature",
          score: 99,
          license: "CC0",
          bytes_present: false,
          preview_images: []
        }) + "\n"
      };
    }
    return {
      status: 1,
      stdout: JSON.stringify({ no_match: true, query, nearest: [] }) + "\n"
    };
  });
  const result = findForRequest(adapter, req, { limit: 5, checkLocal: true });
  assert.equal(result.status, "matches");
  assert.equal(result.query, "nature Tree");
  assert.equal(result.rows[0].pack_id, "nature");
});

test("classifyFinderResult treats malformed non-JSONL stdout as error", () => {
  // Exit 0 with garbage must not classify as successful empty matches (false zero availability).
  const result = classifyFinderResult({
    status: 0,
    stdout: "not-json\n",
    stderr: "",
    error: null
  });
  assert.equal(result.status, "error");
  assert.equal(result.rows.length, 0);
  assert.match(result.note || "", /invalid finder JSONL/i);
});

test("findForRequest falls through when exact rows lack requested-kind hits", () => {
  // Exact pair returning only audio_matches for a model request must not suppress free-text fallback.
  const calls = [];
  const adapter = createMemoryAdapter(({ query }) => {
    calls.push(query);
    if (query === "nature Tree") {
      return {
        status: 0,
        stdout: JSON.stringify({
          pack_id: "unrelated",
          audio_matches: [{ name: "Noise" }]
        }) + "\n"
      };
    }
    return {
      status: 0,
      stdout: JSON.stringify({
        pack_id: "nature",
        model_matches: [{ name: "Tree" }]
      }) + "\n"
    };
  });
  const result = findForRequest(adapter, {
    kind: "model",
    pack_id: "nature",
    name: "Tree",
    query: "fallback-tree"
  });
  assert.deepEqual(calls, ["nature Tree", "fallback-tree"]);
  assert.equal(result.status, "matches");
  assert.equal(result.query, "fallback-tree");
  const modelHits = result.rows.flatMap((r) => r.model_matches || []).length;
  assert.equal(modelHits, 1);
});

test("maps finder cards correctly into asset-recommendations.json", () => {
  const dir = tmp();
  const stub = writeStubFinder(dir, "match");
  const spec = {
    seed_id: "t",
    asset_requests: [
      { request_id: "hero-tool", kind: "model", query: "pickaxe LOCAL" },
    ],
  };
  const specPath = path.join(dir, "spec.json");
  fs.writeFileSync(specPath, JSON.stringify(spec));
  const out = path.join(dir, "out");
  const r = runCli(specPath, {
    out,
    env: { RECOMMEND_FINDER_CMD: JSON.stringify([process.execPath, stub]) },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const doc = JSON.parse(fs.readFileSync(path.join(out, "asset-recommendations.json"), "utf8"));
  assert.equal(doc.schema, "asset-recommendations/0.1");
  assert.equal(doc.requests.length, 1);
  const c = doc.requests[0].candidates[0];
  assert.equal(c.pack_id, "fixture-pack");
  assert.equal(c.score, 42);
  assert.equal(c.license, "CC0");
  assert.equal(c.vendor, "kenney");
  assert.equal(c.store_url, "https://kenney.nl/assets");
  assert.equal(c.bytes_present, true);
  assert.equal(c.path, "/tmp/fixture-pack");
  assert.equal(c.preview, "/tmp/fixture-preview.png");
});

test("no_match / exit-1 yields empty candidates + note", () => {
  const dir = tmp();
  const stub = writeStubFinder(dir, "no_match");
  const spec = {
    seed_id: "t",
    asset_requests: [
      { request_id: "missing", kind: "sprite", query: "NOMATCH thing" },
    ],
  };
  const specPath = path.join(dir, "spec.json");
  fs.writeFileSync(specPath, JSON.stringify(spec));
  const out = path.join(dir, "out");
  const r = runCli(specPath, {
    out,
    env: { RECOMMEND_FINDER_CMD: JSON.stringify([process.execPath, stub]) },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const doc = JSON.parse(fs.readFileSync(path.join(out, "asset-recommendations.json"), "utf8"));
  assert.equal(doc.requests[0].candidates.length, 0);
  assert.equal(doc.requests[0].note, "no_match");
});

test("empty asset_requests writes honest empty artifacts, exit 0", () => {
  const dir = tmp();
  const stub = writeStubFinder(dir, "match");
  const spec = { seed_id: "t", asset_requests: [] };
  const specPath = path.join(dir, "spec.json");
  fs.writeFileSync(specPath, JSON.stringify(spec));
  const out = path.join(dir, "out");
  const r = runCli(specPath, {
    out,
    env: { RECOMMEND_FINDER_CMD: JSON.stringify([process.execPath, stub]) },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const doc = JSON.parse(fs.readFileSync(path.join(out, "asset-recommendations.json"), "utf8"));
  assert.deepEqual(doc.requests, []);
  const html = fs.readFileSync(path.join(out, "asset-recommendations.html"), "utf8");
  assert.match(html, /No asset_requests|Asset recommendations/);
});

test("HTML has a section per request and no img when bytes_present false", () => {
  const dir = tmp();
  const stub = writeStubFinder(dir, "match");
  const spec = {
    seed_id: "t",
    asset_requests: [
      { request_id: "a", kind: "model", query: "remote only" },
      { request_id: "b", kind: "sprite", query: "LOCAL sprite" },
    ],
  };
  const specPath = path.join(dir, "spec.json");
  fs.writeFileSync(specPath, JSON.stringify(spec));
  const out = path.join(dir, "out");
  const r = runCli(specPath, {
    out,
    env: { RECOMMEND_FINDER_CMD: JSON.stringify([process.execPath, stub]) },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const html = fs.readFileSync(path.join(out, "asset-recommendations.html"), "utf8");
  assert.match(html, /id="a"/);
  assert.match(html, /id="b"/);
  // request a: no local bytes → no <img>, buy-at card
  const sectionA = html.slice(html.indexOf('id="a"'), html.indexOf('id="b"'));
  assert.ok(!/<img\b/i.test(sectionA), "section a must not have img");
  assert.match(sectionA, /no local bytes/);
  // request b: local → may have img
  const sectionB = html.slice(html.indexOf('id="b"'));
  assert.match(sectionB, /<img\b/i);
});

test("unreadable / invalid spec exits 1 loudly", () => {
  const dir = tmp();
  const r1 = runCli(path.join(dir, "missing.json"), { out: dir });
  assert.equal(r1.status, 1);
  assert.match(r1.stderr, /unreadable|ERROR/i);

  const bad = path.join(dir, "bad.json");
  fs.writeFileSync(bad, "{not json");
  const r2 = runCli(bad, { out: dir });
  assert.equal(r2.status, 1);
  assert.match(r2.stderr, /invalid|ERROR/i);
});

test("non-array asset_requests exits 1 loudly", () => {
  const dir = tmp();
  const stub = writeStubFinder(dir, "match");
  const cases = [
    { seed_id: "t" }, // missing key
    { seed_id: "t", asset_requests: null },
    { seed_id: "t", asset_requests: { request_id: "x" } },
    { seed_id: "t", asset_requests: "hero" },
  ];
  for (const spec of cases) {
    const specPath = path.join(dir, `bad-ar-${Math.random().toString(16).slice(2)}.json`);
    fs.writeFileSync(specPath, JSON.stringify(spec));
    const r = runCli(specPath, {
      out: dir,
      env: { RECOMMEND_FINDER_CMD: JSON.stringify([process.execPath, stub]) },
    });
    assert.equal(r.status, 1, JSON.stringify(spec));
    assert.match(r.stderr, /spec\.asset_requests must be an array/);
  }
});

test("CLI exact pack_id+name uses the pair as the finder query", () => {
  const dir = tmp();
  // Stub echoes the query into pack_id so we can observe which query was used.
  const stub = path.join(dir, "echo-query.mjs");
  fs.writeFileSync(stub, `#!/usr/bin/env node
const args = process.argv.slice(2);
const qi = args.indexOf("find");
const query = qi >= 0 ? args[qi + 1] : "";
console.log(JSON.stringify({
  pack_id: "echo:" + query,
  score: 1,
  license: "CC0",
  bytes_present: false,
  preview_images: [],
  vendor: "t",
  store_url: null,
  path: null
}));
process.exit(0);
`);
  const spec = {
    seed_id: "t",
    asset_requests: [
      {
        request_id: "exact-tree",
        kind: "model",
        pack_id: "nature",
        name: "Tree",
        query: "should-not-be-first"
      }
    ]
  };
  const specPath = path.join(dir, "spec.json");
  fs.writeFileSync(specPath, JSON.stringify(spec));
  const out = path.join(dir, "out");
  const r = runCli(specPath, {
    out,
    env: { RECOMMEND_FINDER_CMD: JSON.stringify([process.execPath, stub]) }
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const doc = JSON.parse(fs.readFileSync(path.join(out, "asset-recommendations.json"), "utf8"));
  assert.equal(doc.requests[0].request, "nature Tree");
  assert.equal(doc.requests[0].candidates[0].pack_id, "echo:nature Tree");
});
