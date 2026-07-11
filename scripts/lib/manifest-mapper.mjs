// Map design run artifacts → forge-manifest v1 (SPEC §3.4).
// Three sources only: game-thesis, spec-decomposition, engine-profile-decision.
// No silent defaults: underivable fields are listed in `missing`; caller aborts
// before staging when missing is non-empty. Pins are computed by the caller
// (git SHAs + contracts version) and passed in.
//
// Field source map (complete):
//   thesis.golden_moment          ← thesis (optional in schema; required here)
//   thesis.register               ← thesis.design_register (rename)
//   thesis.feel_targets[]         ← thesis
//   thesis.kill_conditions[]      ← thesis
//   thesis.out_of_scope[]         ← thesis.out_of_scope, else spec.out_of_scope
//   thesis.chosen_loop_id         ← spec
//   slices[] + acceptance[]       ← spec (evidence_requirements → evidence_required)
//   engine                        ← engine decision (status=accepted, profile/version fields)
//   asset_requests, lore_refs,
//   verify_plan, capabilities     ← spec authored sections (P18)
//   ext.disciplines               ← spec.ext.disciplines (optional; validated enum)
//   pins                          ← computed (caller)
//   schema_version, game_id,
//   producer, created, pack_digest, ext ← export metadata (caller) + spec.ext overlay
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

export const GODOT_PROFILE = "godot-4";
export const FORGE_MANIFEST_SCHEMA_VERSION = "1.0.0";
export const FORGE_GATE_TOKEN = "FORGE-GATE:ENGINE";

/** Build-phase discipline enum (SPEC game-build §2 / DISCIPLINES.md owners subset). */
export const BUILD_DISCIPLINES = Object.freeze([
  "engineering",
  "level-content",
  "ui-ux",
  "game-feel",
  "art-integration",
  "audio-sourcing",
  "world-gen",
  "qa"
]);

const BUILD_DISCIPLINE_SET = new Set(BUILD_DISCIPLINES);

/** Stable Godot-gate stdout token line: `FORGE-GATE:ENGINE <profile>`. */
export function forgeGateLine(profile) {
  return `${FORGE_GATE_TOKEN} ${profile}`;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/**
 * Validate optional spec.ext.disciplines (game-build SPEC §2).
 * Absent is fine (protocol defaults at read time; no injection at export).
 * Unknown discipline or malformed shape → errors listing valid values.
 *
 * @returns {{ ok: boolean, disciplines: object|null, errors: string[] }}
 */
export function validateSpecDisciplines(specExt) {
  const validList = BUILD_DISCIPLINES.join(", ");
  const errors = [];

  // No ext at all — ok
  if (specExt === undefined || specExt === null) {
    return { ok: true, disciplines: null, errors: [] };
  }
  if (!isPlainObject(specExt)) {
    return {
      ok: false,
      disciplines: null,
      errors: [`spec.ext: expected object (valid disciplines: ${validList})`]
    };
  }

  // ext present but no disciplines key — ok (other ext keys ignored at map time)
  if (!("disciplines" in specExt) || specExt.disciplines === undefined || specExt.disciplines === null) {
    return { ok: true, disciplines: null, errors: [] };
  }

  const d = specExt.disciplines;
  if (!isPlainObject(d) || Array.isArray(d)) {
    return {
      ok: false,
      disciplines: null,
      errors: [
        `spec.ext.disciplines: expected object keyed by slice_id (valid disciplines: ${validList})`
      ]
    };
  }

  const out = {};
  for (const [sliceId, tags] of Object.entries(d)) {
    if (!isNonEmptyString(sliceId)) {
      errors.push(
        `spec.ext.disciplines: slice keys must be non-empty strings (valid disciplines: ${validList})`
      );
      continue;
    }
    if (!isPlainObject(tags) || Array.isArray(tags)) {
      errors.push(
        `spec.ext.disciplines.${sliceId}: expected object of acceptance-key → discipline (valid disciplines: ${validList})`
      );
      continue;
    }
    const row = {};
    for (const [accKey, disc] of Object.entries(tags)) {
      if (!isNonEmptyString(accKey)) {
        errors.push(
          `spec.ext.disciplines.${sliceId}: acceptance keys must be non-empty strings (valid disciplines: ${validList})`
        );
        continue;
      }
      if (typeof disc !== "string" || !BUILD_DISCIPLINE_SET.has(disc)) {
        errors.push(
          `spec.ext.disciplines.${sliceId}.${accKey}: unknown or invalid discipline ${JSON.stringify(disc)} (valid: ${validList})`
        );
        continue;
      }
      row[accKey] = disc;
    }
    out[sliceId] = row;
  }

  if (errors.length) return { ok: false, disciplines: null, errors };
  return { ok: true, disciplines: out, errors: [] };
}

/**
 * Build a forge-manifest object from the three source artifacts + computed pins/meta.
 *
 * @returns {{ ok: boolean, missing: string[], manifest: object|null, errors: string[] }}
 */
export function mapForgeManifest({ thesis, spec, engine, pins, meta }) {
  const missing = [];
  const errors = [];

  if (!isPlainObject(thesis)) errors.push("thesis: expected object");
  if (!isPlainObject(spec)) errors.push("spec: expected object");
  if (!isPlainObject(engine)) errors.push("engine: expected object");
  if (!isPlainObject(pins)) errors.push("pins: expected object");
  if (!isPlainObject(meta)) errors.push("meta: expected object");
  if (errors.length) {
    return {
      ok: false,
      missing: ["thesis", "spec", "engine", "pins", "meta"].filter((k) => {
        const v = { thesis, spec, engine, pins, meta }[k];
        return !isPlainObject(v);
      }),
      manifest: null,
      errors
    };
  }

  // Optional acceptance-level discipline tags (GB01 / game-build SPEC §2).
  // Validated here (ADR-0005: gate policy in checkers, not schemas).
  const discResult = validateSpecDisciplines(spec.ext);
  if (!discResult.ok) {
    for (const e of discResult.errors) missing.push(e);
  }

  // Only emit godot-4 profile in the manifest body (schema enum). Caller must
  // Godot-gate before calling when engine.profile !== godot-4.
  if (engine.profile !== GODOT_PROFILE) {
    return {
      ok: false,
      missing: [`engine.profile must be ${GODOT_PROFILE} for manifest export (got ${JSON.stringify(engine.profile)})`],
      manifest: null,
      errors
    };
  }

  // --- engine (accepted only) ---
  if (engine.status !== "accepted") missing.push("engine.status=accepted");
  if (!isNonEmptyString(engine.profile)) missing.push("engine.profile");
  for (const f of ["godot_min", "godot_max", "renderer", "language"]) {
    if (!isNonEmptyString(engine[f])) missing.push(`engine.${f}`);
  }

  // --- thesis subset ---
  if (!isNonEmptyString(thesis.golden_moment)) missing.push("thesis.golden_moment");
  if (!isNonEmptyString(thesis.design_register)) missing.push("thesis.design_register→register");
  if (!Array.isArray(thesis.feel_targets) || thesis.feel_targets.length < 1) {
    missing.push("thesis.feel_targets");
  } else {
    thesis.feel_targets.forEach((ft, i) => {
      if (!isPlainObject(ft)) {
        missing.push(`thesis.feel_targets[${i}]`);
        return;
      }
      for (const k of ["id", "statement", "metric", "unit"]) {
        if (!isNonEmptyString(ft[k])) missing.push(`thesis.feel_targets[${i}].${k}`);
      }
      if (typeof ft.budget !== "number") missing.push(`thesis.feel_targets[${i}].budget`);
    });
  }
  if (!isStringArray(thesis.kill_conditions) || thesis.kill_conditions.length < 1) {
    missing.push("thesis.kill_conditions");
  }

  // out_of_scope: prefer thesis (SPEC §3.4); fall back to spec (DERIVATION / david)
  let outOfScope = null;
  if (isStringArray(thesis.out_of_scope) && thesis.out_of_scope.length) {
    outOfScope = thesis.out_of_scope;
  } else if (isStringArray(spec.out_of_scope) && spec.out_of_scope.length) {
    outOfScope = spec.out_of_scope;
  } else {
    missing.push("thesis.out_of_scope");
  }

  // --- spec ---
  if (!isNonEmptyString(spec.chosen_loop_id)) missing.push("spec.chosen_loop_id");
  if (!Array.isArray(spec.slices) || spec.slices.length < 1) missing.push("spec.slices");

  const slices = [];
  if (Array.isArray(spec.slices)) {
    for (let i = 0; i < spec.slices.length; i++) {
      const s = spec.slices[i];
      const prefix = `spec.slices[${i}]`;
      if (!isPlainObject(s)) {
        missing.push(prefix);
        continue;
      }
      if (!isNonEmptyString(s.id)) missing.push(`${prefix}.id`);
      if (!isNonEmptyString(s.title)) missing.push(`${prefix}.title`);
      if (!Number.isInteger(s.order)) missing.push(`${prefix}.order`);
      if (!Array.isArray(s.acceptance) || s.acceptance.length < 1) {
        missing.push(`${prefix}.acceptance`);
      } else {
        s.acceptance.forEach((ac, j) => {
          const ap = `${prefix}.acceptance[${j}]`;
          if (!isPlainObject(ac)) {
            missing.push(ap);
            return;
          }
          if (!isNonEmptyString(ac.kind)) missing.push(`${ap}.kind`);
          if (!isNonEmptyString(ac.statement)) missing.push(`${ap}.statement`);
          if (!isNonEmptyString(ac.check)) missing.push(`${ap}.check`);
        });
      }
      // evidence_requirements (source) → evidence_required (manifest)
      const evidence = Array.isArray(s.evidence_requirements)
        ? s.evidence_requirements
        : Array.isArray(s.evidence_required)
          ? s.evidence_required
          : null;
      if (!isStringArray(evidence)) {
        missing.push(`${prefix}.evidence_requirements→evidence_required`);
      }

      if (
        isNonEmptyString(s.id) &&
        isNonEmptyString(s.title) &&
        Number.isInteger(s.order) &&
        Array.isArray(s.acceptance) &&
        s.acceptance.length >= 1 &&
        isStringArray(evidence) &&
        s.acceptance.every(
          (ac) =>
            isPlainObject(ac) &&
            isNonEmptyString(ac.kind) &&
            isNonEmptyString(ac.statement) &&
            isNonEmptyString(ac.check)
        )
      ) {
        slices.push({
          id: s.id,
          title: s.title,
          order: s.order,
          depends_on: Array.isArray(s.depends_on) ? s.depends_on : [],
          acceptance: s.acceptance.map((ac) => ({
            kind: ac.kind,
            statement: ac.statement,
            check: ac.check
          })),
          evidence_required: evidence
        });
      }
    }
  }

  // --- authored SPEC sections (new in T06 / P18) ---
  if (!Array.isArray(spec.asset_requests)) missing.push("spec.asset_requests");
  if (!Array.isArray(spec.lore_refs)) missing.push("spec.lore_refs");
  if (!isPlainObject(spec.capabilities)) {
    missing.push("spec.capabilities");
  } else {
    for (const k of [
      "persistence",
      "localization",
      "accessibility",
      "multiplayer",
      "world_gen",
      "modding",
      "telemetry"
    ]) {
      if (typeof spec.capabilities[k] !== "boolean") missing.push(`spec.capabilities.${k}`);
    }
  }
  if (!isPlainObject(spec.verify_plan)) {
    missing.push("spec.verify_plan");
  } else {
    if (!Array.isArray(spec.verify_plan.golden_cameras)) {
      missing.push("spec.verify_plan.golden_cameras");
    }
    if (typeof spec.verify_plan.frame_budget_ms !== "number") {
      missing.push("spec.verify_plan.frame_budget_ms");
    }
    if (typeof spec.verify_plan.load_budget_s !== "number") {
      missing.push("spec.verify_plan.load_budget_s");
    }
  }

  // --- pins (caller-computed; still listed if incomplete) ---
  for (const k of ["contracts_version", "assets_index", "lore_index"]) {
    if (!isNonEmptyString(pins[k])) missing.push(`pins.${k}`);
  }
  if (!("forge_template" in pins)) missing.push("pins.forge_template");
  else if (pins.forge_template !== null && !isNonEmptyString(pins.forge_template)) {
    missing.push("pins.forge_template");
  }

  // --- export metadata ---
  if (!isNonEmptyString(meta.game_id)) missing.push("meta.game_id");
  if (!isNonEmptyString(meta.seed_id)) missing.push("meta.seed_id");
  if (
    !isPlainObject(meta.producer) ||
    !isNonEmptyString(meta.producer.name) ||
    !isNonEmptyString(meta.producer.version)
  ) {
    missing.push("meta.producer");
  }
  if (!isNonEmptyString(meta.created)) missing.push("meta.created");
  // pack_digest may be filled after staging; if provided must be 64 hex
  if (meta.pack_digest !== undefined && meta.pack_digest !== null) {
    if (typeof meta.pack_digest !== "string" || !/^[a-f0-9]{64}$/.test(meta.pack_digest)) {
      missing.push("meta.pack_digest");
    }
  }

  if (missing.length) {
    return { ok: false, missing: [...new Set(missing)], manifest: null, errors };
  }

  const manifest = {
    schema_version: FORGE_MANIFEST_SCHEMA_VERSION,
    game_id: meta.game_id,
    seed_id: meta.seed_id,
    producer: { name: meta.producer.name, version: meta.producer.version },
    created: meta.created,
    pack_digest: meta.pack_digest ?? "0".repeat(64),
    engine: {
      profile: GODOT_PROFILE,
      godot_min: engine.godot_min,
      godot_max: engine.godot_max,
      renderer: engine.renderer,
      language: engine.language
    },
    thesis: {
      golden_moment: thesis.golden_moment,
      chosen_loop_id: spec.chosen_loop_id,
      register: thesis.design_register,
      feel_targets: thesis.feel_targets.map((ft) => ({
        id: ft.id,
        statement: ft.statement,
        metric: ft.metric,
        budget: ft.budget,
        unit: ft.unit
      })),
      kill_conditions: [...thesis.kill_conditions],
      out_of_scope: [...outOfScope]
    },
    slices,
    asset_requests: spec.asset_requests.map((r) => ({ ...r })),
    lore_refs: spec.lore_refs.map((r) => ({ ...r })),
    capabilities: { ...spec.capabilities },
    verify_plan: {
      golden_cameras: (spec.verify_plan.golden_cameras || []).map((c) => ({ ...c })),
      frame_budget_ms: spec.verify_plan.frame_budget_ms,
      load_budget_s: spec.verify_plan.load_budget_s
    },
    pins: {
      contracts_version: pins.contracts_version,
      assets_index: pins.assets_index,
      lore_index: pins.lore_index,
      forge_template: pins.forge_template
    },
    // meta.ext (caller) + validated spec.ext.disciplines (no default injection)
    ext: {
      ...(isPlainObject(meta.ext) ? { ...meta.ext } : {}),
      ...(discResult.disciplines
        ? { disciplines: discResult.disciplines }
        : {})
    }
  };

  return { ok: true, missing: [], manifest, errors };
}

/**
 * Compute pins for a forge-manifest export.
 * assets_index / lore_index are real git SHAs of the assets/lore roots; never paths.
 */
export function computePins({ assetsRoot, loreRoot, contractsVersion, forgeTemplate = null }) {
  const missing = [];
  const assets_index = gitHeadAt(assetsRoot);
  const lore_index = gitHeadAt(loreRoot);
  if (!assets_index) missing.push("pins.assets_index");
  if (!lore_index) missing.push("pins.lore_index");
  if (!isNonEmptyString(contractsVersion)) missing.push("pins.contracts_version");
  if (forgeTemplate !== null && !isNonEmptyString(forgeTemplate)) {
    missing.push("pins.forge_template");
  }
  if (missing.length) return { ok: false, missing, pins: null };
  return {
    ok: true,
    missing: [],
    pins: {
      contracts_version: contractsVersion,
      assets_index,
      lore_index,
      forge_template: forgeTemplate
    }
  };
}

function gitHeadAt(repoRoot) {
  if (!repoRoot) return null;
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  if (r.status !== 0) return null;
  const sha = String(r.stdout || "").trim();
  return /^[0-9a-f]{40}$/i.test(sha) ? sha : null;
}

/** sha256 over the canonical pack file list (sorted relative paths + contents). */
export function computePackDigest(fileEntries) {
  // fileEntries: Array<{ rel: string, contents: Buffer|string }>
  const h = crypto.createHash("sha256");
  const sorted = [...fileEntries].sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  for (const { rel, contents } of sorted) {
    h.update(rel);
    h.update("\0");
    h.update(typeof contents === "string" ? contents : contents);
    h.update("\0");
  }
  return h.digest("hex");
}
