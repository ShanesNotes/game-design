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
- **Falsifiable acceptance.** Each acceptance criterion is a structured object
  `{kind, statement, check}` (all required). `kind` is exactly one of
  `mechanical | visual | feel_budget | animation_cycle | performance`.
  `statement` is the human-checkable claim; `check` is a machine-invocable
  command or harness hook id. Not "feels good". Carry the thesis
  bot_success_criteria into the slices that earn them. Worked example:
  ```json
  {
    "kind": "feel_budget",
    "statement": "Asteroid rotation settles within the rotate-snap budget (120ms)",
    "check": "feel:rotate-snap"
  }
  ```
  Pre-refresh free-string `acceptance` arrays fail validation; re-run this
  phase, do not migrate (SPEC §3.3).
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
- **Forge-authoring sections (required for godot-4 manifest export, SPEC §3.4).**
  Author these on the SPEC.json block during decompose (empty arrays / false flags
  are valid; the mapper requires the keys, not content):
  - `asset_requests[]` — semantic asset needs
    `{request_id, role, kind ∈ sprite|model|animation|audio, query and/or
    {pack_id,name}, constraints, substitution_policy ∈ allow|report|block}`.
    Never resolved filesystem paths.
  - `lore_refs[]` — `{motif_id, affordance_claim, required: false}` (v1 always false).
    Resolve each `motif_id` from sibling `lore/` (or `<STUDIO_ROOT>/lore`): from
    that repo root run `python3 _tools/find_lore.py find "<free text>"`; take
    `motif_id` from a result row; read `_pages/<motif_id>.md` before any
    `affordance_claim`. A `no_match` result → report the gap, never invent an
    id. Values must exist in `lore/_indexes/motifs.jsonl`. After authoring the
    asset requests and lore refs, run `npm run spec:probe -- --seed-id <id>` and
    read `reviews/availability-report.json`; its findings are advisory, never a
    gate.
  - `capabilities` — booleans for
    `persistence | localization | accessibility | multiplayer | world_gen |
    modding | telemetry`.
  - `verify_plan` — `{golden_cameras[] {id, position, target}, frame_budget_ms,
    load_budget_s}`.
- **Discipline tags (optional; game-build protocol).** When the game will be
  built under the studio game-build protocol, author acceptance-level discipline
  tags so each work-unit routes to the right packet. Shape on the SPEC.json
  block (carried into forge-manifest `ext.disciplines` at export):
  `ext.disciplines = { "<slice_id>": { "<acceptance index-or-check-id>":
  "<discipline>", "_default": "<discipline>" } }`. Enum is exactly:
  `engineering | level-content | ui-ux | game-feel | art-integration |
  audio-sourcing | world-gen | qa`. Absent tags are fine (protocol defaults to
  `engineering` at read time — do not invent defaults in the SPEC). Unknown
  values fail export mapping. Mixed slices (e.g. tracer spanning ui-ux +
  game-feel + art) use per-acceptance keys; `_default` covers untagged rows.
  Worked example:
  ```json
  "ext": {
    "disciplines": {
      "tracer-loop": {
        "_default": "engineering",
        "0": "ui-ux",
        "feel:rotate-snap": "game-feel"
      },
      "sunlight-pressure": {
        "_default": "level-content",
        "screenshot:wither-timer": "art-integration"
      }
    }
  }
  ```

VERIFY (completion is evidence, not prose):
1. `node scripts/validate-artifacts.mjs --check spec --seed-id <id>` passes.
2. `node scripts/emit-local-issues.mjs --seed-id <id>` dry-runs cleanly.
3. Then render: `node scripts/emit-local-issues.mjs --seed-id <id> --write` and
   advance the run with the changed paths in the ledger row.

OUTPUT:
- `SPEC.md` (manifest.spec_path)
- `issues/*.md` (one per slice, rendered, validator-clean)
