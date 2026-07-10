// Mechanical consistency checks for the anti-boring gate artifacts.
//
// This does NOT decide a verdict — the design red-team (P07) owns that judgment, and
// the schemas stay pure data-shape. This only catches a gate artifact that
// contradicts ITS OWN numbers, which is data corruption, not a judgment call:
//   - a depth vector whose `total` != the sum of its axes;
//   - an ADVANCE depth verdict that doesn't actually clear the documented gate
//     (>=16/24 with the six required axes nonzero — design-lock);
//   - a playtest whose `dominant_move` boolean disagrees with its own
//     `action_distribution` (the >70% threshold). Playtests are produced by the
//     co-dev repo, not the factory; the checker stays so spec-pack evidence can be
//     brought back and validated here.
// Keeping gate POLICY here (not in the JSON schema) keeps the artifact stratum and
// the orchestration stratum uncoupled, per docs/doctrine.md and ADR 0005.
// feel-target-required-for-ADVANCE (SPEC §3.3 / ADR 0005): schema allows zero
// feel_targets; ADVANCE does not.
import { THRESHOLDS, DESIGN_REGISTERS, REQUIRED_NONZERO_AXES_BY_REGISTER } from "./factory-contract.mjs";

/** Stable rule id for the ADVANCE feel-target policy (tests + diagnostics). */
export const FEEL_TARGET_REQUIRED_FOR_ADVANCE = "feel-target-required-for-ADVANCE";

export function depthVectorConsistencyErrors(dv) {
  if (!dv || typeof dv !== "object" || !dv.scores) return ["depth vector missing scores"];
  const errors = [];
  // The mandatory-nonzero set is register-specific (ADR 0007); the vector records
  // its register (default mechanics-first) and must be judged by that set.
  const register = dv.register ?? "mechanics-first";
  const requiredAxes = REQUIRED_NONZERO_AXES_BY_REGISTER[register];
  if (!requiredAxes) return [`unknown register '${dv.register}' (expected ${DESIGN_REGISTERS.join(" | ")})`];
  const sum = Object.values(dv.scores).reduce((a, b) => a + (Number(b) || 0), 0);
  if (dv.total !== sum) errors.push(`total ${dv.total} != sum of axes ${sum}`);
  if (dv.verdict === "ADVANCE") {
    if (sum < THRESHOLDS.depth_vector_min_total) {
      errors.push(`verdict ADVANCE but total ${sum} < ${THRESHOLDS.depth_vector_min_total}`);
    }
    for (const axis of requiredAxes) {
      if (!(Number(dv.scores[axis]) > 0)) errors.push(`verdict ADVANCE but required axis '${axis}' is 0 (register ${register})`);
    }
  }
  return errors;
}

// ADVANCE design-lock requires ≥1 structured feel_target on the thesis.
// Policy lives here (checker), not in game-thesis.schema (ADR 0005 / SPEC §3.3).
export function feelTargetRequiredForAdvanceErrors(thesis, verdict) {
  if (verdict !== "ADVANCE") return [];
  const targets = thesis && Array.isArray(thesis.feel_targets) ? thesis.feel_targets : [];
  if (targets.length < 1) {
    return [
      `${FEEL_TARGET_REQUIRED_FOR_ADVANCE}: ADVANCE requires ≥1 feel_target on the thesis (policy in checker, not schema; re-run thesis phase if missing)`
    ];
  }
  return [];
}

export function playtestConsistencyErrors(pt) {
  if (!pt || typeof pt !== "object" || !pt.anti_boring) return ["playtest report missing anti_boring"];
  const errors = [];
  const dist = pt.action_distribution;
  if (dist && typeof dist === "object") {
    const counts = Object.values(dist).map(Number).filter((n) => !Number.isNaN(n));
    const sum = counts.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      const maxShare = Math.max(...counts) / sum;
      const derivedDominant = maxShare > THRESHOLDS.dominant_move_max_action_share;
      if (typeof pt.anti_boring.dominant_move === "boolean" && derivedDominant !== pt.anti_boring.dominant_move) {
        errors.push(`anti_boring.dominant_move=${pt.anti_boring.dominant_move} but action_distribution max share ${Math.round(maxShare * 100)}% implies ${derivedDominant}`);
      }
    }
  }
  return errors;
}

// Dispatch by artifact shape (depth-vector | playtest-report).
export function gateConsistencyErrors(data) {
  if (data && data.scores && "verdict" in data) return depthVectorConsistencyErrors(data);
  if (data && data.anti_boring) return playtestConsistencyErrors(data);
  return ["not a recognizable gate artifact (expected depth-vector or playtest-report)"];
}
