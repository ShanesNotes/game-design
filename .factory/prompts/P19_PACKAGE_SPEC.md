# P19 — Package Spec (handoff)

ROLE: Release engineer for the factory's terminal artifact. You export a clean,
self-contained spec pack a fresh session can open cold and start co-developing from.

INPUT:
- a seed run at phase `decompose` or `handoff` whose `--check run` passes
- SPEC.md + rendered issues/
- templates/spec-pack/ (co-dev README, AGENTS, PLAYTEST_PLAN, MISSION/RESOURCES, guards)

TASK:
1. Dry-run the export and review the file list:
   `node scripts/package-spec.mjs --seed-id <id>`
2. If the leakage gate fails, redact the offending run artifacts (no `.tgf` paths,
   orchestrator names, or absolute source paths may travel) and re-run. Never
   weaken the gate.
3. Export: `node scripts/package-spec.mjs --seed-id <id> --write`
   (default target: the run's `default_spec_pack_root` =
   `$STUDIO_ROOT/games/_export-<id>`; forge intake then births `games/<id>`).
   - **Godot-4:** also emits `forge-manifest.json` (schema-valid against studio
     `contracts/forge-manifest.schema.json`). Mapping requires golden_moment,
     structured feel_targets/acceptance, engine version fields
     (`godot_min`/`godot_max`/`renderer`/`language`), and the SPEC authored
     sections (`asset_requests`, `lore_refs`, `capabilities`, `verify_plan`).
     Mapping failure aborts before staging and lists every missing field.
     For any `lore_refs` row: resolve `motif_id` from sibling `lore/` (or
     `<STUDIO_ROOT>/lore`) via `python3 _tools/find_lore.py find "<free text>"`
     at that repo root; take `motif_id` from a hit; read `_pages/<motif_id>.md`
     before any affordance claim. `no_match` → report the gap, never invent.
     Ids must exist in `lore/_indexes/motifs.jsonl`.
   - **Non-godot:** pack exports without a manifest; stdout contains the stable
     token `FORGE-GATE:ENGINE <profile>`. Pass `--require-manifest` to hard-fail
     non-godot exports (CI gate for forge-bound seeds).
4. Advance the run: `decompose -> handoff -> complete` with the export ledger row
   as evidence.

REVISION EXPORT (phase `complete` only — not a phase transition):
When packaging a post-complete design change against a live game, pass
`--revise-of <game-dir>` (`npm run spec:revise -- --seed-id <id> --revise-of
<game-dir> --to <export-dir> --write`). The run stays at `complete`. Emits a
full immutable forge-manifest **v1.1.0** with `parent_digest` = sha256 of the
raw bytes of `<game-dir>/forge-manifest.json` and **freshly computed pins**
(pin-refresh path). The revised pack lands at the neutral `--to` target
(e.g. `games/_export-<id>-r2`), never the game dir itself — without `--to`,
package-spec refuses when the default target is an intaken game dir
(`forge-template-stamp.json` present) and names `--to` as the fix, leaving
the game untouched for `forge intake --revise` to apply. Plain export
without `--revise-of` still refuses at `complete`. Godot-gate still applies
(non-godot → no manifest + `FORGE-GATE:ENGINE` token). Same mapper +
validation as plain export — no delta language (SPEC §6-B).

THE PACK MUST STAND ALONE:
- Its AGENTS.md explains the co-dev loop without referencing this factory.
- Its issues reference only pack-relative paths (SPEC.md, GAME_THESIS.md,
  decisions/…).
- Its guards run with zero dependencies (`node guards/<name>.mjs`).
- The anti-boring falsifiers travel as PLAYTEST_PLAN obligations, not as prose memories.

OUTPUT:
- exported spec pack folder (the terminal artifact)
- `forge-manifest.json` when engine profile is godot-4 (else Godot-gate line only)
- ledger row `spec-pack-exported` + manifest `spec_pack_path`
- run advanced to `complete`

SUCCESS:
Opening the exported folder in a fresh session with no factory context is enough
to start building the order-1 tracer bullet.
