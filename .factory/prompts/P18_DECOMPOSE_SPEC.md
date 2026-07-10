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
  fit together before anything is elaborated (checker enforces full coverage).
- **Vertical, not horizontal.** Every slice yields something playable or testable;
  no "set up the architecture" slices.
- **Falsifiable acceptance.** Each acceptance criterion is checkable by running
  the game or a bot — not "feels good". Carry the thesis bot_success_criteria
  into the slices that earn them.
- **Evidence requirements.** Every slice/feature names the playtest evidence it must
  produce (checker enforces at least one entry) (see PLAYTEST_PLAN falsifiers — the Two-Bot test deferred at
  design-review lands here as a slice obligation).
- **Feel is sliced first-class** (docs/feel-doctrine.md). The tracer slice's
  acceptance includes the golden moment's full feedback chain (anticipation →
  action → impact → aftermath, readable in one play), and every thesis
  `feel_target` lands in some slice as acceptance or evidence. A slice that
  adds a verb without its feedback chain is incomplete. Feel is never a
  late-order "game-feel pass" slice.
- **Seams are honest stubs.** Type `seam` = a growth system's data model and
  persistence surface, schema'd but not built: acceptance must include (a) the
  data shape exists and round-trips through save/load, and (b) at least one
  live slice reads or writes it. A seam never adds UI, content, or systems —
  it exists so later iteration extends instead of rewrites. Pair every
  `out_of_scope` system the thesis intends to build later with either a seam
  or an explicit "no seam — will rewrite" note. Seams are cheap; more than a
  handful means the spec is an architecture fantasy, not a game.
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
