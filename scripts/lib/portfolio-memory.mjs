import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate-json-schema.mjs";
import { extractFencedJson } from "./run-state.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schema = (name) => JSON.parse(fs.readFileSync(path.join(REPO, "schemas", `${name}.schema.json`), "utf8"));

export const PORTFOLIO_FACTORY_VERSION = "0.3.0";
export const DEPTH_AXES = [
  "meaningful_choice", "tradeoff", "pressure", "uncertainty", "progression", "mastery",
  "combinatorial", "emergence", "replayable_variation", "failure_recovery", "expression",
  "expansion_headroom"
];

export function isPortfolioRun(manifest) {
  return manifest?.factory_version === PORTFOLIO_FACTORY_VERSION;
}

export function readIntakeEvidence(runDir, seedId) {
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
      validate(schema("portfolio-digest"), digest).forEach((error) => errors.push(`intake portfolio digest ${error}`));
      if (digest.seed_id !== seedId) errors.push(`intake portfolio digest seed_id '${digest.seed_id}' does not match '${seedId}'`);
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

  const scoreSignature = DEPTH_AXES.map((axis) => vector?.scores?.[axis]).join(",");
  for (const prior of digest?.prior_theses || []) {
    if (prior.depth_vector?.verdict !== "ADVANCE") continue;
    const priorSignature = DEPTH_AXES.map((axis) => prior.depth_vector.scores?.[axis]).join(",");
    if (scoreSignature !== priorSignature) continue;
    const escapedId = prior.seed_id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const namedSeed = new RegExp(`(^|[^a-z0-9-])${escapedId}([^a-z0-9-]|$)`, "i");
    const disposition = String(verdictText || "").split("\n")
      .some((line) => /distinctness/i.test(line) && namedSeed.test(line));
    if (!disposition) {
      errors.push(`depth vector exactly matches prior ADVANCE seed '${prior.seed_id}'; ANTI_BORING_VERDICT.md needs a distinctness disposition naming that seed`);
    }
  }
  return errors;
}
