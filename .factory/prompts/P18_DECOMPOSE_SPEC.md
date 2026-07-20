# P18 — Decompose Spec

ROLE: Spec author. You turn a design-locked thesis into an ordered, falsifiable
build plan. The slicing judgment is yours; the shape is the schema's; the
rendering is the script's. Do not render issues by hand.

INPUT:
- GAME_THESIS.md (design-locked: reviews/ holds a gate-passing ADVANCE depth vector)
- decisions/0001-engine-profile.md (status: accepted)
- reviews/ANTI_BORING_VERDICT.md (the depth argument — slice toward what it praised)
- intake/office-hours.md (named near-references from the grill — disposition with thesis)
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
- **Evidence requirements (a forge-enforced contract, not prose).** Every
  slice/feature names at least one `evidence_requirements` entry (the decompose
  checker enforces presence; forge verify enforces satisfaction per built slice —
  `applyEvidenceRequired`). Each entry is exactly one of:
  1. a **game-relative path glob** (`*`, `?`, `**` segments; never absolute,
     never `..`) — satisfied when at least one file in the game repo or one
     produced evidence path matches it; or
  2. an exact **produced-evidence type token** — `log`, `metric`, or
     `screenshot` — satisfied when the slice's verify results include evidence
     of that type.
  Anything else is prose, and prose never matches: the requirement fails verify
  with `missing_evidence_required`. Author new specs with globs/type tokens
  only. Convention: per-slice build evidence lands under
  `docs/evidence/<slice-id>/` in the game repo, so the worked requirement for
  the tracer slice is:
  ```json
  "evidence_requirements": ["docs/evidence/tracer-loop/**", "log"]
  ```
  (see PLAYTEST_PLAN falsifiers — the Two-Bot test deferred at
  design-review lands here as a slice obligation, expressed in this same
  glob/token form).
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
- **Reference packaging + system-BOM checklist** (docs/reference-games/;
  audited cards only). For every canon id named as near by the thesis or intake
  and present in `docs/reference-games/index.jsonl` with `status` exactly
  `audited`, read `docs/reference-games/cards/<id>.json` and:
  1. Use `packaging_lessons[]` to inform pack boundaries and slice order
     (constraints — never silently imported features).
  2. Treat each `system_bom[]` row as a dependency the SPEC must disposition:
     map `system` to a slice id or seam id, **or** put it in `out_of_scope` as a
     CUT DECISION sentence that names the system and why it is cut (the cut list
     is design). A BOM system with neither a map nor a cut sentence is incomplete;
     never import a BOM row silently.
  Zero named-and-audited cards → write exactly one SPEC.md prose line:
  `Reference packaging: SKIPPED (reference canon empty)`. Draft/fixture/unknown
  ids are non-citable.
- **Forge-authoring sections (required for godot-4 manifest export, SPEC §3.4).**
  Author these on the SPEC.json block during decompose (empty arrays / false flags
  are valid; the mapper requires the keys, not content):
  - `asset_source_policy` ∈ `local` | `imagine` | `combo` — **default `local`**
    when omitted. This is the single design taste gate for *where* art may come
    from after fun-lock (docs/doctrine.md § Asset source policy). Set it once
    here on the SPEC; do not invent a parallel policy elsewhere.
    - **`local` (default)** — purchased library only. Catalog miss → open
      sourcing / purchase. **No** Grok Imagine.
    - **`imagine`** — prefer Grok Imagine for generatable 2D (`kind: sprite`);
      other kinds still use the library. Landings under
      `games/<id>/generated/imagine/`.
    - **`combo`** — library first; on catalog miss for sprites, authorized
      Imagine landings may fill the lock.
    Choose `imagine` or `combo` only for 2D-sprite games where generated art is
    acceptable. Those values **arm the Imagine track** downstream
    (`studio sourcing` → Grok generate → forge resolve consume). Under `local`,
    forge ignores Imagine landings even if present.
  - `asset_requests[]` — semantic asset needs
    `{request_id, role, kind ∈ sprite|model|animation|audio, query and/or
    {pack_id,name}, constraints, substitution_policy ∈ allow|report|block,
    optional derive}`.
    Never resolved filesystem paths.
    - **Optional `derive` block** (forge-manifest **1.3.0**; orthogonal to
      `asset_source_policy` which is the Imagine/sprite axis only):
      ```json
      "derive": {
        "base": { "pack_id": "<purchased pack_id>", "name": "<model stem>" },
        "recipe": "blender-derive/palette-remap@1",
        "params": { "palette": { "Armor": "#4a7c59" } }
      }
      ```
      Shape: required `base` (`pack_id` + `name`) + `recipe` (string); optional
      `params` (object). Recipe ids come from the assets library registry
      (`_tools/derive/` README) — D1 ships `blender-derive/palette-remap@1`.
      Params are design-owned (palette maps, etc.). **Presence of the block IS
      authorization** (Shane 2026-07-19): no separate human generate gate for
      derive. Human gates remain recipe code review, promotion into the shared
      library, purchases, and ship veto. Forge resolves a request WITH `derive`
      only from `games/<id>/generated/derived/<request_id>/` (catalog base is
      recipe input, never the resolution). Export floors `schema_version` and
      `pins.contracts_version` to **1.3.0** when any request carries `derive`
      (plain and revision paths).
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

REVISION AUTHORING (post-complete; export-surface only — not a new phase):
When a completed seed needs a design change (Shane, or a mission whose prompt
explicitly authorizes it — same governance class as verdict `done`), re-author
only the SPEC surface: slices + forge-authoring sections (`asset_source_policy`,
`asset_requests` including optional per-request `derive`, `lore_refs`,
`capabilities`, `verify_plan`, optional `ext.disciplines`).
Re-render issues. Do not reopen thesis/engine unless the change requires it.
Revisions may retire never-dispatched slices; built slices stay immutable
(forge intake enforces). Revisions may change `asset_requests` (add/remove
`derive`, retarget bases) — that is why the revision export can claim **1.3.0**
when any request carries `derive`. Export via P19's revision path
(`--revise-of`), not plain `package-spec` — `complete` stays absorbing for plain
packs (SPEC §6-B).

VERIFY (completion is evidence, not prose):
1. `node scripts/validate-artifacts.mjs --check spec --seed-id <id>` passes.
2. `node scripts/emit-local-issues.mjs --seed-id <id>` dry-runs cleanly.
3. Then render: `node scripts/emit-local-issues.mjs --seed-id <id> --write`.
4. **Fail-fast package dry-run (after issues render):**  
   `npm run spec:package -- --seed-id <id> --require-manifest`  
   (dry-run is the default — no `--write`). Surfaces
   `mapForgeManifest` / manifest-mapping failures at decompose, not at P19
   export. Keep `npm run spec:probe` as the advisory availability step above;
   do not invent a second lint script.
5. Advance the run with the changed paths in the ledger row.

OUTPUT:
- `SPEC.md` (manifest.spec_path)
- `issues/*.md` (one per slice, rendered, validator-clean)
