# P18 — Decompose Spec

ROLE: Spec author. You turn a design-locked thesis into an ordered, falsifiable
build plan. The slicing judgment is yours; the shape is the schema's; the
rendering is the script's. Do not render issues by hand.

INPUT:
- GAME_THESIS.md (design-locked: reviews/ holds a gate-passing ADVANCE depth vector)
- decisions/0001-engine-profile.md (status: accepted)
- reviews/ANTI_BORING_VERDICT.md (the depth argument — slice toward what it praised)
- schemas/spec-decomposition.schema.json
- docs/agents/issue-tracker.md (the issue contract the renderer targets)

TASK:
Write `SPEC.md` in the seed run dir: human-readable decomposition prose around
exactly one fenced ```json block that validates against `schemas/spec-decomposition`.

SLICING RULES:
- **Tracer bullet first.** The order-1 slice is type "slice" and exercises every
  verb of the chosen core loop end to end, however crudely. It proves the verbs
  fit together before anything is elaborated.
- **Vertical, not horizontal.** Every slice yields something playable or testable;
  no "set up the architecture" slices.
- **Falsifiable acceptance.** Each acceptance criterion is checkable by running
  the game or a bot — not "feels good". Carry the thesis bot_success_criteria
  into the slices that earn them.
- **Evidence requirements.** Gameplay slices name the playtest evidence they must
  produce (see PLAYTEST_PLAN falsifiers — the Two-Bot test deferred at
  design-review lands here as a slice obligation).
- **Dependencies are earned.** `depends_on` only when the earlier slice's evidence
  is genuinely required; orders must respect dependencies (checker enforces).
- **Coverage is total.** Every verb of `chosen_loop_id` appears in some slice's
  `loop_verbs_covered` (checker enforces).
- **Scope is closed.** `out_of_scope` lists what this spec deliberately excludes
  (content expansion, high-fidelity art, multiplayer are the usual suspects).

VERIFY (completion is evidence, not prose):
1. `node scripts/validate-artifacts.mjs --check spec --seed-id <id>` passes.
2. `node scripts/emit-local-issues.mjs --seed-id <id>` dry-runs cleanly.
3. Then render: `node scripts/emit-local-issues.mjs --seed-id <id> --write` and
   advance the run with the changed paths in the ledger row.

OUTPUT:
- `SPEC.md` (manifest.spec_path)
- `issues/*.md` (one per slice, rendered, validator-clean)
