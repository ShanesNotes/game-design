# CONTEXT.md — game-design

This is the domain dictionary and single source of truth for what **game-design**
*is* (formerly tiny-game-factory). Prompts, skills, ADRs, and validators all defer
to the language here. If a term is used elsewhere in the repo, it is defined here.

## What this repo is

**game-design** is a local-first, evidence-first agentic **spec harness** for games.
It fertilizes a one-sentence game *seed* — or an inherited game repo — into a
depth-gated **`GAME_THESIS.md`**, decomposes it into an issue-sliced **`SPEC.md`**,
and exports the result as a **spec pack** for human+AI co-development elsewhere.
**No game is built in this repo** (ADR 0006).

game-design is **not** a game engine, an asset generator, a content platform, or a
multi-agent framework. It is an orchestration harness for *finding deep,
falsifiable game premises* and recording proof.

## Meta-factory, not a game (ADR 0001)

`/home/ark/game-studio/design` is the **game-design** repository (the meta-factory
in ADR terms). It owns reusable doctrine, prompts, schemas, hooks, adapters,
validators, and run ledgers. It is **never** the game. The harness's terminal
artifact is the exported spec pack; games are co-developed downstream from the
pack. The harness is durable process memory.

## Three location strata (ADR 0003)

| Stratum | Path | Holds | Lifecycle |
|---|---|---|---|
| Design repo | `/home/ark/game-studio/design/` | reusable doctrine, prompts, schemas, hooks, scripts, skills | durable |
| Per-seed run state | `.tgf/seeds/{seed-id}/` | one seed's manifest, ledger, thesis, decisions, SPEC, issues, reviews, intake | durable temporal truth |
| Spec pack | `$STUDIO_ROOT/games/_export-{seed-id}/` (default; `--to` wins) | the exported spec + backlog; forge intake then births `games/{seed-id}` | durable deliverable |

The spec pack root is a **declared default, not a created path**
(`manifest.default_spec_pack_root` → `$STUDIO_ROOT/games/_export-{seed-id}`;
pre-DES-C runs may still carry the legacy `$STUDIO_ROOT/games/{seed-id}`).
Nothing creates that folder until the handoff phase exports the pack via
`scripts/package-spec.mjs --write` (`--to` overrides the default); the export
destination is recorded as `manifest.spec_pack_path`.

**Separation is absolute:** factory state — `.tgf/`/`.omx/`/`.sandcastle/` paths,
GStack/Pocock/OMX/Sandcastle markers, ledgers, handoffs, skill docs, source-product
terms, and absolute `/home/ark/...` paths — must never leak into an exported spec
pack. The `generated-leakage` validator forbids these across every generated
surface (`templates/spec-pack/` and `examples/seeds/`; the forbidden tokens live in
`scripts/lib/leakage.mjs`), and `package-spec.mjs` re-runs the scan before export.

## Manifest beats memory

Every phase reads and writes `.tgf/seeds/{seed-id}/manifest.json`. The manifest's
`current_phase` is the resumption source of truth — never a chat summary. Agents
coordinate through artifacts (manifest, ledger, thesis, reviews, SPEC), not
through conversation. Key manifest paths: `game_thesis_path`, `spec_path`,
`default_spec_pack_root`, `spec_pack_path`.

## Phase vocabulary

`manifest.current_phase` is exactly one of:

```
intake · toolchain · thesis · design-review · deepen · engine-profile · decompose ·
handoff · blocked · failed · killed · complete
```

`blocked`, `failed`, `killed`, and `complete` are terminal: resuming from them
requires an evidence-backed ledger transition. A run is **initialized at
`intake`** (default entry for every new seed — ADR 0011): office-hours grill
grounded in the portfolio digest, then advance to `toolchain` (never to thesis).
`deepen` is driven by a `DEEPEN` depth verdict at `design-review`: the thesis
re-enters `thesis` with **exactly one** named transform applied, then re-reviews
(≤2 attempts, tracked by `manifest.deepen_attempt_count` and enforced by
`validate-artifacts --check run`; after two failed attempts the run is killed).
**Design-lock** is not a phase: it is the `ADVANCE` verdict from the design
red-team at `design-review` (depth vector total ≥16/24 with the thesis's
register-mandated six axes nonzero — ADR 0007; mechanics-first default: Choice,
Tradeoff, Pressure, Uncertainty, Mastery, Replayable Variation; narrative-first
swaps Replayable Variation for Progression) — it opens
`engine-profile → decompose`. Design-lock replaces fun-lock *in the factory*;
fun-lock remains downstream doctrine inside the spec pack. Legal phase transitions
are the machine-readable graph in `scripts/lib/run-state.mjs` (derived from
`docs/doctrine.md`), checked against each run's ledger.

## Workflow contract (P00–P19)

`P00_ORCHESTRATOR_ULTRAGOAL` (`tgf-harness`) is a **router**, not a phase: it reads
`manifest.current_phase` and dispatches to the skills below. `orchestrate` is therefore
not in the § Phase vocabulary. Canonical machine-readable lists of phases, prompts,
skills, schemas, and hooks live in `scripts/lib/factory-contract.mjs`; this table is the
human-friendly view.

| Phase | Prompt | Skill (id) | Output |
|---|---|---|---|
| intake | (P00 router; default entry) | `tgf-office-hours-grill` | `intake/office-hours.md` + `intake/portfolio-digest.json`, ≤1 question; exit → `toolchain` |
| deepen | (P00/P07 path) | — (one named transform, then re-enter thesis) | deepened thesis; ≤2 attempts |
| toolchain | `P17_VERIFY_TOOLCHAIN` | `tgf-verify-toolchain` | toolchain ledger from real probes |
| thesis | `P01_SEED_COMPILE` | `tgf-seed-compile` | `GAME_THESIS.md` (`schema_version: "2.0.0"` + digest-backed `portfolio_distinctness`) |
| design-review | `P07_DEPTH_RED_TEAM` | `tgf-depth-redteam` | `reviews/ANTI_BORING_VERDICT.md` (incl. distinctness disposition naming the nearest prior seed, or `none`) + `reviews/depth-vector.json` (`schema_version: "2.0.0"`: per-axis evidence as real thesis field-paths + `review_provenance`) |
| engine-profile | `P02_ENGINE_PROFILE` | `tgf-engine-profile` | `decisions/0001-engine-profile.md` |
| decompose | `P18_DECOMPOSE_SPEC` | `tgf-decompose` | `SPEC.md` + `issues/*.md` (via `scripts/emit-local-issues.mjs --write`) |
| handoff | `P19_PACKAGE_SPEC` | `tgf-handoff` | exported spec pack (`scripts/package-spec.mjs`) |
| (rescue) | `P13_EXISTING_PROJECT_RESCUE` | `tgf-existing-project-rescue` | read-only rescue verdict |
| (scout) | `P16_REPO_SCOUT` | `tgf-repo-scout` | `docs/borrowed-patterns.md` entry |
| (kill/restart) | `P14_KILL_RESTART` | — | evidence-backed kill + new seed brief |

Retired build prompts (P03–P06, P08–P12, P15) were culled in the T04 doctrine
audit (see `docs/doctrine-audit-ledger.md`) and are not registered in the
contract (ADR 0006).

## Verdict vocabulary

- **Depth verdict** (`tgf-depth-redteam`): `ADVANCE` | `DEEPEN` (name exactly one
  transform) | `KILL`. An `ADVANCE` at `design-review` **is design-lock**.

## The anti-boring gate

The gate runs **on paper, against the thesis**, at `design-review` (P07). A thesis
cannot be design-locked — and nothing may be decomposed — until it passes:

1. **Naked Mechanics Test** — strip theme/art; is the bare system interesting?
   (argued analytically against the thesis)
2. **Dominant-Move Test** — fail if one action/sequence dominates (>70% of
   meaningful actions across varied states). (argued analytically)
3. **Second-Session Test** — is there a reason to replay after understanding the
   loop once? "More levels" and "better art" do not count. (argued analytically)
4. **Two-Bot Test** — cannot run on paper. It is **deferred into the spec** as
   `bot_success_criteria` obligations carried by the slices; the co-dev repo must
   prove a random vs heuristic/skilled bot diverge materially.

Plus a **depth vector**: twelve named axes, each scored 0/1/2 — all twelve are
required (`schemas/depth-vector`). **Minimum for design-lock: total ≥ 16/24 with
the register's six mandatory axes nonzero** (ADR 0007): the thesis declares a
**design register** (`design_register`: `mechanics-first` default |
`narrative-first` | `hybrid` | `world-first`), the vector records it, and the
mandatory set is register-specific — narrative-first swaps Replayable Variation
for Progression; world-first (ADR 0008) requires Progression and Expansion
Headroom instead of Mastery and Replayable Variation — with the falsifiers
re-aimed per `docs/anti-boring-gate.md` § Design registers. The ≥16 total and
nonzero-axes rule is applied by the depth red-team (P07), not by the schema,
which only checks the axes are present and in range. Alongside depth, the
thesis carries **feel** (`golden_moment`, `feel_targets`) and optionally a
**design canon** pointer (distinct from the reference-game canon in
`docs/reference-games/CANON.md`) — attacked at P07 as findings, sliced at P18,
stamped into the pack's guard-config; see `docs/feel-doctrine.md` (ADR 0010).

## Spec decomposition

`SPEC.md` is the decompose-phase artifact: markdown carrying a canonical fenced
`json` block that validates against `schemas/spec-decomposition`. It declares a
`chosen_loop_id` (from the thesis), an `out_of_scope` list, and ordered **slices**
— each with `id`, `title`, `type` (`slice` | `feature` | `chore` | `seam`),
`order`, `goal`, `acceptance`, `evidence_requirements`, `depends_on`, and
`loop_verbs_covered`. A **seam** (ADR 0008) is an honest stub: a growth system's
data model + persistence surface, schema'd but deliberately not built —
acceptance proves a save/load round-trip and one live reader. The consistency
policy lives in `scripts/lib/spec-decomposition.mjs`: the **tracer bullet comes
first** (order 1 must be type `slice`, and P18 requires its acceptance to play
the thesis's golden moment with a full feedback chain), orders are contiguous,
dependencies must point earlier, and every chosen-loop verb must be covered
across the slices.
`scripts/emit-local-issues.mjs` is the **only renderer** of
`.tgf/seeds/{seed-id}/issues/*.md` — one issue per slice, with pack-relative
evidence links (dry-run by default; `--write`/`--force`).

## Spec pack

The **spec pack** is the factory's **terminal artifact** (ADR 0006): a clean
folder containing the spec, the issue backlog, the thesis, the design review, a
`PLAYTEST_PLAN.md` of falsifiers, the 8 build-time guards, the evidence
schemas, and a learning workspace (`MISSION.md`/`RESOURCES.md`, seeded from the
thesis so a teaching skill boots grounded) — everything a co-dev repo needs to
build the game, learn from it, and prove it is fun.
It is produced **only** by `scripts/package-spec.mjs` (`npm run spec:package`),
which is dry-run by default and gated by run validation plus the leakage scan.
Completion is the verifier-clean pack, not prose. Fun-lock, playtesting, content,
art, and release are **downstream doctrine inside the pack**, not factory phases.

## No default engine (ADR 0002 / `docs/engine-matrix.md`)

There is **no default engine before `GAME_THESIS.md`**. Raw Canvas + TypeScript is
a strong common candidate, not a default. Engine choice is scored after the thesis
(headless testability, iteration speed, fantasy/loop fit, deterministic sim,
migration cost, visual-wow-no-game risk, editor opacity, toolchain-verified) and
recorded as a reversible **per-seed engine decision** (`decisions/0001-engine-profile.md`
— a seed-scoped, ADR-style record, distinct from the factory `docs/adr/`). Engine
migration always requires a new decision file.

## Lane policy

**Solo orchestration.** One parent agent walks one seed through the spine. Lanes
(parallel prototype branches and bakeoffs) were a build-era concept; they were
retired with the build phases per ADR 0006. Subagents may still be used for
disjoint research/review work, but the parent owns manifest updates and final
verification.

## Module archive vocabulary

A **module card** is a schema-valid description of a reusable game primitive
candidate: what problem it solves, where it came from, which engines it may fit,
its inputs/outputs, deterministic and bot hooks, adoption guard, and slice
acceptance. A module card is evidence for future reuse; it is not permission to
copy code, choose an engine, skip `GAME_THESIS.md`, or bypass the engine ADR.

A future **module archive** can collect module cards as lego-brick game primitives,
but adoption still follows the scout protocol: borrow the primitive, prove license
and smoke, and reject cargo-culting impressive repos.

## Human interaction

At most **one** direction-changing taste question before the spec is decomposed
(`human_questions_max_before_decompose = 1`), always with a recommended default.
**Never** ask the user architecture/engine/art questions before `GAME_THESIS.md`.

## Borrowed skills

Matt Pocock-style skills (`grill-me`, `grill-with-docs`, `to-prd`, `to-issues`,
`triage`, `tdd`, `diagnose`, `zoom-out`, `improve-codebase-architecture`,
`prototype`, `handoff`, `review`) are **wrapped or referenced, never vendored**.
Generic issue/PRD skills must route through local artifacts and never publish
remotely by default. The shared contract every `.codex/skills/` wrapper inherits —
read order, manifest-first routing, run-dir confinement, no-leakage, completion-is-
evidence — lives in `docs/agents/skill-wrapper-doctrine.md`, so a wrapper carries
only its phase-specific difference. The build-phase wrappers (`tgf-first-slice`,
`tgf-prototype-dispatch`, `tgf-branch-bakeoff`) were deleted with the pivot
(ADR 0006); ten wrappers remain. See `docs/agents/` and `docs/adr/0004`.

## Completion is evidence, not prose

A phase is done when its verifier output exists — a passing validator, a
gate-passing depth vector, an exported verifier-clean spec pack — not when an
agent says it is done.
