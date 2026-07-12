#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { arg } from "./lib/argv.mjs";
import { extractFencedJson, isValidSeedId } from "./lib/run-state.mjs";
import { resolveDesignRoot, resolveGamesRoot } from "./lib/studio-paths.mjs";
import { validate } from "./lib/validate-json-schema.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedId = arg("seed-id");

function fail(message) {
  console.error(`[portfolio-digest] ERROR: ${message}`);
  process.exit(1);
}

if (!seedId || !isValidSeedId(seedId)) {
  fail("usage: node scripts/build-portfolio-digest.mjs --seed-id <kebab-id>");
}

const digest = {
  schema_version: "1.0.0",
  seed_id: seedId,
  generated_at: new Date().toISOString(),
  sources: [],
  prior_theses: [],
  games: [],
  skipped: []
};

function skip(source, reason, id = null) {
  digest.skipped.push({ source, ...(id ? { id } : {}), reason });
}

function readDepthVector(runDir, priorId) {
  const file = path.join(runDir, "reviews", "depth-vector.json");
  if (!fs.existsSync(file)) {
    skip("depth-vector", "reviews/depth-vector.json is missing", priorId);
    return { verdict: "UNKNOWN", scores: null };
  }
  try {
    const vector = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!["ADVANCE", "DEEPEN", "KILL"].includes(vector.verdict) || !vector.scores) {
      throw new Error("verdict or scores missing");
    }
    return { verdict: vector.verdict, scores: vector.scores };
  } catch (error) {
    skip("depth-vector", `unreadable depth vector: ${error.message}`, priorId);
    return { verdict: "UNKNOWN", scores: null };
  }
}

const designRoot = resolveDesignRoot(process.cwd());
const seedsRoot = designRoot && path.join(designRoot, ".tgf", "seeds");
if (!seedsRoot || !fs.existsSync(seedsRoot)) {
  digest.sources.push({ source: "design-runs", status: "skipped", reason: "design seed root is missing" });
  skip("design-runs", "design seed root is missing");
} else {
  digest.sources.push({ source: "design-runs", status: "read" });
  for (const priorId of fs.readdirSync(seedsRoot).sort()) {
    if (priorId === seedId) continue;
    const runDir = path.join(seedsRoot, priorId);
    const thesisFile = path.join(runDir, "GAME_THESIS.md");
    if (!fs.existsSync(thesisFile)) continue;
    const { obj: thesis, error } = extractFencedJson(fs.readFileSync(thesisFile, "utf8"));
    if (error) {
      skip("game-thesis", error, priorId);
      continue;
    }
    const chosen = thesis.core_loop_candidates?.[0];
    if (!chosen || typeof chosen.id !== "string" || !(typeof chosen.verbs === "string" || Array.isArray(chosen.verbs))) {
      skip("game-thesis", "first core_loop_candidates row cannot serve as the thesis-local chosen loop", priorId);
      continue;
    }
    digest.prior_theses.push({
      seed_id: priorId,
      pitch: typeof thesis.pitch === "string" ? thesis.pitch : "UNKNOWN",
      chosen_loop: {
        id: chosen.id,
        verbs: chosen.verbs,
        ...(typeof chosen.description === "string" ? { description: chosen.description } : {})
      },
      design_register: thesis.design_register ?? "UNKNOWN",
      golden_moment: thesis.golden_moment ?? "UNKNOWN",
      depth_vector: readDepthVector(runDir, priorId)
    });
  }
}

const lifecycles = new Set(["skeleton", "active", "candidate", "done", "archived"]);
const sealedVerdictFields = [
  "schema_version", "ts", "verdict", "by", "game_commit", "manifest_digest", "lock_digest", "report"
];
const gamesRoot = resolveGamesRoot(process.cwd());
const indexFile = gamesRoot && path.join(gamesRoot, "INDEX.md");
if (!indexFile || !fs.existsSync(indexFile)) {
  digest.sources.push({ source: "games-index", status: "skipped", reason: "games/INDEX.md is missing" });
  skip("games-index", "games/INDEX.md is missing");
} else {
  digest.sources.push({ source: "games-index", status: "read" });
  const rows = fs.readFileSync(indexFile, "utf8").split("\n")
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 2 && lifecycles.has(cells[1]))
    .map(([gameId, lifecycle]) => ({ gameId, lifecycle }))
    .sort((a, b) => a.gameId.localeCompare(b.gameId));
  for (const { gameId, lifecycle } of rows) {
    const verdictDir = path.join(gamesRoot, gameId, "playtests", "verdicts");
    let humanVerdict = { verdict: "UNKNOWN" };
    if (!fs.existsSync(verdictDir)) {
      skip("human-verdict", "no sealed verdict record", gameId);
    } else {
      const files = fs.readdirSync(verdictDir).filter((name) => name.endsWith(".json")).sort();
      if (!files.length) {
        skip("human-verdict", "no sealed verdict record", gameId);
      } else {
        try {
          const record = JSON.parse(fs.readFileSync(path.join(verdictDir, files.at(-1)), "utf8"));
          if (sealedVerdictFields.some((field) => !(field in record))
              || !["done", "notes", "hold"].includes(record.verdict)
              || !record.report || !["pass", "fail"].includes(record.report.overall)) {
            throw new Error("record does not match the sealed human-verdict shape");
          }
          humanVerdict = {
            verdict: record.verdict,
            ...(typeof record.ts === "string" ? { ts: record.ts } : {}),
            ...(typeof record.by === "string" ? { by: record.by } : {}),
            ...(typeof record.notes_rel === "string" ? { notes_rel: record.notes_rel } : {})
          };
        } catch (error) {
          skip("human-verdict", `unreadable sealed verdict: ${error.message}`, gameId);
        }
      }
    }
    digest.games.push({ game_id: gameId, lifecycle, human_verdict: humanVerdict });
  }
}

const schema = JSON.parse(fs.readFileSync(path.join(REPO, "schemas", "portfolio-digest.schema.json"), "utf8"));
const errors = validate(schema, digest);
if (errors.length) fail(`generated digest is invalid:\n  ${errors.join("\n  ")}`);

const output = path.join(process.cwd(), ".tgf", "seeds", seedId, "intake", "portfolio-digest.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(digest, null, 2) + "\n");
console.log(`[portfolio-digest] wrote ${path.relative(process.cwd(), output)} (${digest.prior_theses.length} prior theses, ${digest.games.length} games)`);
