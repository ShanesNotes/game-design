import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { validate } from "./validate-json-schema.mjs";
import { extractFencedJson, isValidSeedId } from "./run-artifact-identity.mjs";
import { resolveContractsRoot, resolveDesignRoot, resolveGamesRoot } from "./studio-paths.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schema = (name) => JSON.parse(fs.readFileSync(path.join(REPO, "schemas", `${name}.schema.json`), "utf8"));
const PORTFOLIO_SNAPSHOT = Symbol("portfolio-snapshot");

export const PORTFOLIO_FACTORY_VERSION = "0.3.0";
export const DEPTH_AXES = [
  "meaningful_choice", "tradeoff", "pressure", "uncertainty", "progression", "mastery",
  "combinatorial", "emergence", "replayable_variation", "failure_recovery", "expression",
  "expansion_headroom"
];

export function isPortfolioRun(manifest) {
  return manifest?.factory_version === PORTFOLIO_FACTORY_VERSION;
}

export function enumeratePriorTheses(seedsRoot, seedId, containment = null) {
  const priors = [];
  const skipped = [];
  if (!seedsRoot || !fs.existsSync(seedsRoot)) return { priors, skipped };
  const realContainmentRoot = containment ? fs.realpathSync(containment.root) : null;
  const containmentPrefix = realContainmentRoot ? `${realContainmentRoot}${path.sep}` : null;
  for (const priorId of fs.readdirSync(seedsRoot).sort()) {
    if (seedId && priorId === seedId) continue;
    const runDir = path.join(seedsRoot, priorId);
    const thesisPath = path.join(runDir, "GAME_THESIS.md");
    if (!fs.existsSync(thesisPath)) continue;
    if (containmentPrefix) {
      let realRunDir;
      try { realRunDir = fs.realpathSync(runDir); }
      catch (error) {
        skipped.push({ seedId: priorId, error: `${containment.entry} directory is unreadable: ${error.message}` });
        continue;
      }
      if (!realRunDir.startsWith(containmentPrefix)) {
        skipped.push({ seedId: priorId, error: `${containment.entry} directory escapes ${containment.rootLabel}` });
        continue;
      }
      let realThesisPath;
      try { realThesisPath = fs.realpathSync(thesisPath); }
      catch (error) {
        skipped.push({ seedId: priorId, error: `${containment.entry} thesis is unreadable: ${error.message}` });
        continue;
      }
      if (!realThesisPath.startsWith(containmentPrefix)) {
        skipped.push({ seedId: priorId, error: `${containment.entry} thesis escapes ${containment.rootLabel}` });
        continue;
      }
    }
    const { obj: thesis, error } = extractFencedJson(fs.readFileSync(thesisPath, "utf8"));
    if (error) {
      skipped.push({ seedId: priorId, error });
      continue;
    }
    priors.push({ seedId: priorId, runDir, thesis });
  }
  return { priors, skipped };
}

const lifecycles = new Set(["skeleton", "active", "candidate", "done", "archived"]);
const sealedVerdictFields = [
  "schema_version", "ts", "verdict", "by", "game_commit", "manifest_digest", "lock_digest", "report"
];

function markdownCells(line) {
  if (!line.trimStart().startsWith("|")) return null;
  return line.trim().split("|").slice(1, -1).map((cell) => cell.trim());
}

function canonicalGameRows(markdown) {
  const lines = markdown.split("\n");
  const headerIndex = lines.findIndex((line) => {
    const cells = markdownCells(line);
    return cells && cells.map((cell) => cell.toLowerCase()).join("|") === "game|lifecycle|origin|note";
  });
  if (headerIndex < 0) return [];
  const separator = markdownCells(lines[headerIndex + 1] || "");
  if (!separator || separator.length !== 4 || separator.some((cell) => !/^:?-{3,}:?$/.test(cell))) return [];
  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    const cells = markdownCells(line);
    if (!cells) break;
    if (cells.length >= 2 && lifecycles.has(cells[1])) rows.push({ gameId: cells[0], lifecycle: cells[1] });
  }
  return rows.sort((a, b) => a.gameId.localeCompare(b.gameId));
}

function buildPortfolioDigestContentForRoots(seedId, roots) {
  const content = {
    schema_version: "1.0.0",
    sources: [],
    prior_theses: [],
    games: [],
    skipped: []
  };
  const skip = (source, reason, id = null) => {
    content.skipped.push({ source, ...(id ? { id } : {}), reason });
  };
  // Secondary reads under a contained root (proposals) must not follow
  // symlinks out of it — same rule as sealed verdict files under games/.
  const escapesRoot = (file, realRootPrefix) => {
    if (!realRootPrefix) return false;
    try { return !fs.realpathSync(file).startsWith(realRootPrefix); }
    catch { return true; }
  };
  const readDepthVector = (runDir, priorId, containRealRoot = null) => {
    const file = path.join(runDir, "reviews", "depth-vector.json");
    if (!fs.existsSync(file)) {
      skip("depth-vector", "reviews/depth-vector.json is missing", priorId);
      return { verdict: "UNKNOWN", scores: null };
    }
    if (escapesRoot(file, containRealRoot)) {
      skip("depth-vector", "depth vector escapes games root", priorId);
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
  };
  const readChosenLoop = (runDir, thesis, priorId, containRealRoot = null) => {
    const specFile = path.join(runDir, "SPEC.md");
    if (!fs.existsSync(specFile)) {
      skip("chosen-loop", "SPEC.md is missing; no chosen loop is recorded", priorId);
      return null;
    }
    if (escapesRoot(specFile, containRealRoot)) {
      skip("chosen-loop", "SPEC.md escapes games root", priorId);
      return null;
    }
    const { obj: spec, error } = extractFencedJson(fs.readFileSync(specFile, "utf8"));
    if (error || typeof spec?.chosen_loop_id !== "string") {
      skip("chosen-loop", error || "SPEC.md has no chosen_loop_id", priorId);
      return null;
    }
    const chosen = thesis.core_loop_candidates?.find((candidate) => candidate.id === spec.chosen_loop_id);
    if (!chosen || !(typeof chosen.verbs === "string" || Array.isArray(chosen.verbs))) {
      skip("chosen-loop", `chosen_loop_id '${spec.chosen_loop_id}' does not resolve to a thesis candidate`, priorId);
      return null;
    }
    return {
      id: chosen.id,
      verbs: chosen.verbs,
      ...(typeof chosen.description === "string" ? { description: chosen.description } : {})
    };
  };
  const thesisRow = (runDir, priorId, thesis, parked = false, containRealRoot = null) => ({
    seed_id: priorId,
    pitch: typeof thesis.pitch === "string" ? thesis.pitch : "UNKNOWN",
    chosen_loop: readChosenLoop(runDir, thesis, priorId, containRealRoot),
    design_register: thesis.design_register ?? "UNKNOWN",
    golden_moment: thesis.golden_moment ?? "UNKNOWN",
    depth_vector: readDepthVector(runDir, priorId, containRealRoot),
    ...(parked ? {
      parked: true,
      candidate_loop_verbs: [...new Set((thesis.core_loop_candidates || [])
        .flatMap((candidate) => Array.isArray(candidate.verbs)
          ? candidate.verbs
          : (typeof candidate.verbs === "string" ? candidate.verbs.split(",") : []))
        .map((verb) => String(verb).trim())
        .filter(Boolean))]
    } : {})
  });

  const designRoot = roots.design;
  const seedsRoot = designRoot && path.join(designRoot, ".tgf", "seeds");
  if (!seedsRoot || !fs.existsSync(seedsRoot)) {
    content.sources.push({ source: "design-runs", status: "skipped", reason: "design seed root is missing" });
    skip("design-runs", "design seed root is missing");
  } else {
    content.sources.push({ source: "design-runs", status: "read" });
    const enumeration = enumeratePriorTheses(seedsRoot, seedId);
    for (const row of enumeration.skipped) skip("game-thesis", row.error, row.seedId);
    for (const { seedId: priorId, runDir, thesis } of enumeration.priors) {
      content.prior_theses.push(thesisRow(runDir, priorId, thesis));
    }
  }

  const contractsRoot = roots.contracts;
  const verdictSchemaFile = contractsRoot && path.join(contractsRoot, "verdict-record.schema.json");
  let verdictSchema = null;
  if (!verdictSchemaFile || !fs.existsSync(verdictSchemaFile)) {
    skip("verdict-contract", "contracts/verdict-record.schema.json is missing");
  } else {
    try { verdictSchema = JSON.parse(fs.readFileSync(verdictSchemaFile, "utf8")); }
    catch (error) { skip("verdict-contract", `verdict schema is unreadable: ${error.message}`); }
  }
  const sealedVerdictErrors = (record) => {
    const errors = verdictSchema ? validate(verdictSchema, record) : ["sealed verdict contract unavailable"];
    if (sealedVerdictFields.some((field) => !(field in record))) errors.push("required sealed fields are missing");
    for (const field of ["ts", "by", "game_commit", "manifest_digest", "lock_digest"]) {
      if (typeof record[field] !== "string" || !record[field].trim()) errors.push(`${field} must be non-empty`);
    }
    if (typeof record.ts === "string" && Number.isNaN(Date.parse(record.ts))) errors.push("ts must be a date-time");
    if (typeof record.report?.digest !== "string" || !record.report.digest.trim()) errors.push("report.digest must be non-empty");
    return errors;
  };

  const gamesRoot = roots.games;
  const proposalsRoot = gamesRoot && path.join(gamesRoot, "_proposals");
  if (!proposalsRoot || !fs.existsSync(proposalsRoot)) {
    content.sources.push({ source: "proposals", status: "skipped", reason: "games/_proposals is missing" });
    skip("proposals", "games/_proposals is missing");
  } else {
    content.sources.push({ source: "proposals", status: "read" });
    const enumeration = enumeratePriorTheses(proposalsRoot, null, {
      root: gamesRoot,
      rootLabel: "games root",
      entry: "proposal"
    });
    for (const row of enumeration.skipped) skip("proposal-thesis", row.error, row.seedId);
    const realGamesPrefixForProposals = `${fs.realpathSync(gamesRoot)}${path.sep}`;
    for (const { seedId: proposalId, runDir, thesis } of enumeration.priors) {
      content.prior_theses.push(thesisRow(runDir, proposalId, thesis, true, realGamesPrefixForProposals));
    }
    content.prior_theses.sort((a, b) => a.seed_id.localeCompare(b.seed_id));
  }
  const indexFile = gamesRoot && path.join(gamesRoot, "INDEX.md");
  if (!indexFile || !fs.existsSync(indexFile)) {
    content.sources.push({ source: "games-index", status: "skipped", reason: "games/INDEX.md is missing" });
    skip("games-index", "games/INDEX.md is missing");
  } else {
    content.sources.push({ source: "games-index", status: "read" });
    const realGamesRootPrefix = `${fs.realpathSync(gamesRoot)}${path.sep}`;
    const rows = canonicalGameRows(fs.readFileSync(indexFile, "utf8"));
    for (const { gameId, lifecycle } of rows) {
      const gameDir = path.resolve(gamesRoot, gameId);
      const gamesRootPrefix = `${path.resolve(gamesRoot)}${path.sep}`;
      let invalidGameDir = !isValidSeedId(gameId) || !gameDir.startsWith(gamesRootPrefix);
      if (!invalidGameDir && fs.existsSync(gameDir)) {
        try { invalidGameDir = !fs.realpathSync(gameDir).startsWith(realGamesRootPrefix); }
        catch { invalidGameDir = true; }
      }
      if (invalidGameDir) {
        skip("games-index", "invalid game id", gameId);
        continue;
      }
      const verdictDir = path.join(gameDir, "playtests", "verdicts");
      let humanVerdict = { verdict: "UNKNOWN" };
      if (!fs.existsSync(verdictDir)) {
        skip("human-verdict", "no sealed verdict record", gameId);
      } else {
        const files = fs.readdirSync(verdictDir).filter((name) => name.endsWith(".json")).sort().reverse();
        if (!files.length) {
          skip("human-verdict", "no sealed verdict record", gameId);
        } else {
          let record = null;
          for (const file of files) {
            try {
              const verdictFile = path.join(verdictDir, file);
              if (!fs.realpathSync(verdictFile).startsWith(realGamesRootPrefix)) {
                throw new Error("verdict path escapes games root");
              }
              const candidate = JSON.parse(fs.readFileSync(verdictFile, "utf8"));
              const errors = sealedVerdictErrors(candidate);
              if (errors.length) throw new Error(errors.join("; "));
              record = candidate;
              break;
            } catch (error) {
              skip("human-verdict", `invalid sealed verdict ${file}: ${error.message}`, gameId);
            }
          }
          if (record) {
            humanVerdict = {
              verdict: record.verdict,
              ...(typeof record.ts === "string" ? { ts: record.ts } : {}),
              ...(typeof record.by === "string" ? { by: record.by } : {}),
              ...(typeof record.notes_rel === "string" ? { notes_rel: record.notes_rel } : {})
            };
          } else {
            skip("human-verdict", "no schema-valid sealed verdict record", gameId);
          }
        }
      }
      content.games.push({ game_id: gameId, lifecycle, human_verdict: humanVerdict });
    }
  }
  return content;
}

function readIntakeEvidenceFor(portfolio, runDir, seedId) {
  const errors = [];
  const digestPath = path.join(runDir, "intake", "portfolio-digest.json");
  const officePath = path.join(runDir, "intake", "office-hours.md");
  let digest = null;
  let office = null;

  if (!fs.existsSync(digestPath)) {
    errors.push("intake/portfolio-digest.json is missing");
  } else {
    try {
      digest = JSON.parse(fs.readFileSync(digestPath, "utf8"));
      Object.defineProperty(digest, PORTFOLIO_SNAPSHOT, { value: portfolio });
      validate(schema("portfolio-digest"), digest).forEach((error) => errors.push(`intake portfolio digest ${error}`));
      if (digest.seed_id !== seedId) errors.push(`intake portfolio digest seed_id '${digest.seed_id}' does not match '${seedId}'`);
      const storedContent = {
        schema_version: digest.schema_version,
        sources: digest.sources,
        prior_theses: digest.prior_theses,
        games: digest.games,
        skipped: digest.skipped
      };
      if (!isDeepStrictEqual(storedContent, portfolio.buildDigestContent(seedId))) {
        errors.push("intake portfolio digest stale/dishonest — regenerate via npm run portfolio:digest");
      }
    } catch (error) {
      errors.push(`intake portfolio digest is not parseable JSON: ${error.message}`);
    }
  }

  if (!fs.existsSync(officePath)) {
    errors.push("intake/office-hours.md is missing");
  } else {
    const parsed = extractFencedJson(fs.readFileSync(officePath, "utf8"));
    if (parsed.error) errors.push(`intake office-hours ${parsed.error}`);
    else {
      office = parsed.obj;
      validate(schema("intake-grill"), office).forEach((error) => errors.push(`intake office-hours ${error}`));
      if (office.seed_id !== seedId) errors.push(`intake office-hours seed_id '${office.seed_id}' does not match '${seedId}'`);
      const expected = `.tgf/seeds/${seedId}/intake/portfolio-digest.json`;
      if (office.portfolio_digest_ref !== expected) {
        errors.push(`intake office-hours portfolio_digest_ref must equal '${expected}'`);
      }
    }
  }
  return { digest, office, errors };
}

export function thesisDistinctnessErrors(thesis, digest) {
  const errors = [];
  if (thesis?.schema_version !== "2.0.0") errors.push("thesis schema_version must be '2.0.0' for portfolio-enabled runs");
  const disposition = thesis?.portfolio_distinctness;
  if (!disposition || typeof disposition !== "object") {
    return [...errors, "thesis portfolio_distinctness is required for portfolio-enabled runs"];
  }
  const priorIds = new Set((digest?.prior_theses || []).map((row) => row.seed_id));
  if (priorIds.size === 0) {
    if (disposition.nearest_prior_seed !== "none") {
      errors.push("thesis nearest_prior_seed must be 'none' when the digest lists zero prior theses");
    }
  } else if (!priorIds.has(disposition.nearest_prior_seed)) {
    errors.push(`thesis nearest_prior_seed '${disposition.nearest_prior_seed}' is not present in the portfolio digest`);
  }
  if (typeof disposition.falsifying_difference !== "string" || !disposition.falsifying_difference.trim()) {
    errors.push("thesis falsifying_difference must name a concrete checkable difference");
  }
  if (disposition.digest_generated_at !== digest?.generated_at) {
    errors.push("thesis digest_generated_at must equal the portfolio digest generated_at");
  }
  return errors;
}

function thesisPathExists(thesis, fieldPath) {
  if (typeof fieldPath !== "string" || !fieldPath.trim()) return false;
  let value = thesis;
  for (const part of fieldPath.split(".")) {
    const match = part.match(/^([A-Za-z_][A-Za-z0-9_-]*)(?:\[(\d+)\])?$/);
    if (!match || value === null || typeof value !== "object"
        || !Object.prototype.hasOwnProperty.call(value, match[1])) return false;
    value = value[match[1]];
    if (match[2] !== undefined) {
      const index = Number(match[2]);
      if (!Array.isArray(value) || index >= value.length) return false;
      value = value[index];
    }
  }
  return true;
}

export function depthVectorPortfolioErrors(vector, thesis, digest, verdictText) {
  const errors = [];
  const hasDistinctnessDisposition = (seedId) => {
    const escapedId = seedId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const namedSeed = new RegExp(`(^|[^a-z0-9-])${escapedId}([^a-z0-9-]|$)`, "i");
    return String(verdictText || "").split("\n")
      .some((line) => /distinctness/i.test(line) && namedSeed.test(line));
  };
  if (vector?.schema_version !== "2.0.0") errors.push("depth vector schema_version must be '2.0.0' for portfolio-enabled runs");
  if (!vector?.evidence || Array.isArray(vector.evidence) || typeof vector.evidence !== "object") {
    errors.push("depth vector requires per-axis evidence field paths");
  } else {
    for (const axis of DEPTH_AXES) {
      const fieldPath = vector.evidence[axis];
      if (!thesisPathExists(thesis, fieldPath)) {
        errors.push(`depth vector evidence '${fieldPath}' for '${axis}' does not reference an existing thesis field path`);
      }
    }
  }
  if (!vector?.review_provenance || typeof vector.review_provenance !== "object") {
    errors.push("depth vector review_provenance is required");
  }
  const nearestPrior = thesis?.portfolio_distinctness?.nearest_prior_seed;
  if (typeof nearestPrior === "string" && !hasDistinctnessDisposition(nearestPrior)) {
    errors.push(`ANTI_BORING_VERDICT.md needs a distinctness disposition naming nearest prior seed '${nearestPrior}'`);
  }

  const scoreSignature = DEPTH_AXES.map((axis) => vector?.scores?.[axis]).join(",");
  for (const prior of digest?.prior_theses || []) {
    if (prior.depth_vector?.verdict !== "ADVANCE") continue;
    const priorSignature = DEPTH_AXES.map((axis) => prior.depth_vector.scores?.[axis]).join(",");
    if (scoreSignature !== priorSignature) continue;
    if (!hasDistinctnessDisposition(prior.seed_id)) {
      errors.push(`depth vector exactly matches prior ADVANCE seed '${prior.seed_id}'; ANTI_BORING_VERDICT.md needs a distinctness disposition naming that seed`);
    }
  }
  return errors;
}

export function openPortfolio(startDir) {
  if (typeof startDir !== "string" || !startDir.trim()) {
    throw new Error("openPortfolio requires an explicit startDir");
  }
  const root = path.resolve(startDir);
  const roots = Object.freeze({
    design: resolveDesignRoot(root),
    games: resolveGamesRoot(root),
    contracts: resolveContractsRoot(root)
  });
  const portfolio = {
    root,
    roots,
    buildDigestContent(seedId) {
      return buildPortfolioDigestContentForRoots(seedId, roots);
    },
    readIntakeEvidence(runDir, seedId) {
      return readIntakeEvidenceFor(portfolio, runDir, seedId);
    },
    thesisDistinctnessErrors,
    depthVectorErrors: depthVectorPortfolioErrors
  };
  return Object.freeze(portfolio);
}

export function portfolioForDigest(digest, startDir) {
  return digest?.[PORTFOLIO_SNAPSHOT] ?? openPortfolio(startDir);
}

// Compatibility exports for validators outside this slice. New call sites should
// keep one open portfolio so root discovery is explicit and shared.
export function buildPortfolioDigestContent(seedId, startDir) {
  return openPortfolio(startDir).buildDigestContent(seedId);
}

export function readIntakeEvidence(runDir, seedId) {
  return openPortfolio(runDir).readIntakeEvidence(runDir, seedId);
}
