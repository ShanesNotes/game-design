# ADR 0013 — Playable baseline at the design→forge handoff

- Status: **Accepted.** Owner-directed (Shane, 2026-07-20: controls and UI are
  the explicit order; boot and outcome are the kingdoms defect-return lessons;
  final floor ratified at merge review).
- Date: 2026-07-20
- Extends: ADR 0006 (spec pack is the terminal artifact), ADR 0005 (gate policy
  in checkers, not schemas)
- Evidence: the pinned playable-baseline interface (contracts 1.4.0 slice) and
  the kingdoms defect returns that traced to undeclared boot/outcome surfaces

## Context

A spec pack could reach forge with no declared boot scene, no input contract,
no UI floor, and no outcome signaling. Those four absences are the recurring
defect-return class from built games: controls and UI are the owner's explicit
minimum; boot and outcome are the lessons kingdoms paid for. The pack is the
terminal artifact (ADR 0006) and the last design-side door — whatever the
handoff does not refuse, forge must rediscover.

## Decision

1. **The four-system floor is declared on every new SPEC.** `playable_baseline`
   on the spec-decomposition JSON block carries `boot` (`entry_scene`, `slice`),
   `controls` (`actions[] {action, verb}`, `consumer_paths[]`, `slice`), `ui`
   (`surfaces[] {id, provides, path}`, `slice`), and `outcome` (`states[]` ≥ 2,
   `communicated_by`, `path`, `slice`). Each system's `slice` must resolve to a
   declared `slices[].id` — the baseline is slice-covered, not aspirational.
2. **The handoff refuses, before staging.** The forge-manifest mapper validates
   the baseline for every godot-4 export regardless of contracts version;
   `package-spec` aborts before staging and names each missing or uncovered
   system. The schema carries the shape as an optional key (recorded legacy
   runs keep validating); presence, slice resolution, and the pause-surface
   rule live in the checker (ADR 0005). One `ui.surfaces` entry must be
   `id: "pause"` whose `provides` covers pause/quit.
3. **Manifest emission is contracts-version-conditional.** The mapper emits
   `playable_baseline` only when the live-read contracts version is ≥ 1.4.0
   (1.3.0 manifests must not carry it) and floors both `schema_version` and
   `pins.contracts_version` to 1.4.0 when emitted, on plain and revision
   exports — the existing feature-floor ladder gains a top rung.
4. **No new acceptance kind.** Baseline enforcement is a manifest block plus
   forge static checks (`FORGE-BASELINE:<CHECK>`), not an acceptance `kind`;
   the kind enum stays untouched.
5. **Baseline slices are ordinary slices.** They render as issues like any
   other slice; the backlog needs no special shape.

## Alternatives rejected

- **Require the key in the spec-decomposition schema.** Would wedge recorded
  legacy runs at revalidation; policy belongs in checkers (ADR 0005). The
  refusal bites at package/export time for packs not yet exported, never
  retroactively on old run state.
- **Enforce as a new acceptance `kind`.** Rejected with the interface: the
  baseline is a whole-pack floor, not per-slice falsifiable acceptance, and the
  kind enum is a contracts surface that stays frozen in this slice.
- **Gate at decompose→handoff advance instead of package.** P18 already
  dry-runs `spec:package --require-manifest` at decompose, surfacing the same
  failure early; the single hard gate stays at the export door, where the
  manifest is actually built.
- **Emit the block unconditionally.** A 1.3.0 manifest must not carry it; the
  design repo live-reads the contracts enum tail, so emission follows the live
  tip and stays correct while a checkout still reads 1.3.0.

## Consequences

- P18 teaches the baseline as a forge-authoring section; the worked-example
  fixture carries it, so new runs inherit a passing shape.
- Forge intake at contracts ≥ 1.4.0 receives a machine-checkable floor
  (`FORGE-BASELINE:BOOT_STUB / ACTION_UNBOUND / ACTION_UNCONSUMED /
  PATH_MISSING / SLICE_UNRESOLVED` are the forge-side checks; this repo only
  declares and maps the block).
- Legacy runs summarize and revise untouched; the refusal applies only when a
  pack is exported.
- Reversal trigger: if the four systems drift (a fifth becomes universal), the
  change is a new contracts version plus a mapper floor rung — not a schema
  edit alone.
