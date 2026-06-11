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
   (default target: the run's `default_spec_pack_root`).
4. Advance the run: `decompose -> handoff -> complete` with the export ledger row
   as evidence.

THE PACK MUST STAND ALONE:
- Its AGENTS.md explains the co-dev loop without referencing this factory.
- Its issues reference only pack-relative paths (SPEC.md, GAME_THESIS.md,
  decisions/…).
- Its guards run with zero dependencies (`node guards/<name>.mjs`).
- The anti-boring falsifiers travel as PLAYTEST_PLAN obligations, not as prose memories.

OUTPUT:
- exported spec pack folder (the terminal artifact)
- ledger row `spec-pack-exported` + manifest `spec_pack_path`
- run advanced to `complete`

SUCCESS:
Opening the exported folder in a fresh session with no factory context is enough
to start building the order-1 tracer bullet.
