# CONTEXT.md — Tiny Game Factory

This is the domain dictionary and single source of truth for what the Tiny Game
Factory *is*. Prompts, skills, ADRs, and validators all defer to the language here.
If a term is used elsewhere in the repo, it is defined here.

## What this repo is

The **Tiny Game Factory (TGF)** is a local-first, evidence-first agentic
game-development **meta-factory**. It converts a one-sentence game *seed* — or an
inherited game repo — into a playable, bot-tested, anti-boring-gated **first
slice**, while refusing to commit to an engine, content, or art before evidence
earns it.

TGF is **not** a game engine, an asset generator, a content platform, or a
multi-agent framework. It is an orchestration harness for *finding playable
loops* and recording proof.

## Meta-factory, not a game (ADR 0001)

`/home/ark/tiny-game-factory` is the **meta-factory repository**. It owns reusable
doctrine, prompts, schemas, hooks, adapters, validators, and run ledgers. It is
**never** the first generated game. Generated games are disposable, searchable
prototypes; the factory is durable process memory.

## Three location strata (ADR 0003)

| Stratum | Path | Holds | Lifecycle |
|---|---|---|---|
| Factory repo | `/home/ark/tiny-game-factory/` | reusable doctrine, prompts, schemas, hooks, scripts, skills | durable |
| Per-seed run state | `.tgf/seeds/{seed-id}/` | one seed's manifest, ledger, thesis, decisions, playtests, reviews, handoffs | durable temporal truth |
| Child game repo | `/home/ark/tgf-games/{seed-id}/` (default) | the actual game | disposable prototype |

The child game root is a **declared default, not a created path**. Nothing creates
`/home/ark/tgf-games/` until an explicit child-game phase. An opt-in
`runs/{seed-id}/game/` bundled mode exists but is not the default.

**Separation is absolute:** factory state — `.tgf/`/`.omx/`/`.sandcastle/` paths,
GStack/Pocock/OMX/Sandcastle markers, ledgers, handoffs, skill docs, source-product
terms, and absolute `/home/ark/...` paths — must never leak into a generated child
game. The `generated-leakage` validator forbids these across every generated-game
surface (child-repo templates and example seeds).

## Manifest beats memory

Every phase reads and writes `.tgf/seeds/{seed-id}/manifest.json`. The manifest's
`current_phase` is the resumption source of truth — never a chat summary. Agents
coordinate through artifacts (manifest, ledger, playtest reports, reviews), not
through conversation.

## Phase vocabulary

`manifest.current_phase` is exactly one of:

```
intake · toolchain · thesis · engine-profile · prototype-dispatch · first-slice ·
depth-review · bakeoff · deepen · fun-lock · content · art · polish · qa ·
release-candidate · handoff · blocked · failed · killed · complete
```

`blocked`, `failed`, `killed`, and `complete` are terminal: resuming from them
requires an evidence-backed ledger transition. A run is **initialized at
`toolchain`** (the standard sentence-seed entry); **`intake`** is the entry phase
only when a raw/vague seed or an inherited repo needs office-hours grilling before
the thesis. `deepen` and `fun-lock` are gate *states*, not prompts: `deepen` is
driven by a `DEEPEN` depth verdict (one transform, ≤2 attempts), and `fun-lock` is
the state entered when the anti-boring gate + depth minimum pass, recorded by a
ledger transition (owned by P08 — see the workflow contract). The ≤2-attempt cap is
tracked by `manifest.deepen_attempt_count` and enforced by
`validate-artifacts --check run`; applying the named transform is owned by the depth
red-team / first-slice re-entry (a dedicated `deepen-apply` wrapper is deferred until
a real run needs it). Legal phase transitions are the machine-readable graph in
`scripts/lib/run-state.mjs` (derived from `docs/doctrine.md`), checked against each
run's ledger.

## Workflow contract (P00–P17)

`P00_ORCHESTRATOR_ULTRAGOAL` (`tgf-harness`) is a **router**, not a phase: it reads
`manifest.current_phase` and dispatches to the skills below. `orchestrate` is therefore
not in the § Phase vocabulary. Canonical machine-readable lists of phases, prompts,
skills, schemas, and hooks live in `scripts/lib/factory-contract.mjs`; this table is the
human-friendly view.

| Phase | Prompt | TGF skill | Output |
|---|---|---|---|
| intake | (P00/P01 prelude) | `tgf-office-hours-grill` | `intake/office-hours.md`, ≤1 question |
| toolchain | `P17_VERIFY_TOOLCHAIN` | `tgf-verify-toolchain` | toolchain ledger from real probes |
| thesis | `P01_SEED_COMPILE` | `tgf-seed-compile` | `GAME_THESIS.md` |
| engine-profile | `P02_ENGINE_PROFILE` | `tgf-engine-profile` | `decisions/0001-engine-profile.md` |
| prototype-dispatch | `P03_BRANCH_BAKEOFF_DISPATCH` | `tgf-prototype-dispatch` (router) | lane plan |
| first-slice | `P04_FIRST_PLAYABLE_SLICE` | `tgf-first-slice` | runnable slice + playtest report |
| depth-review | `P07_DEPTH_RED_TEAM` | `tgf-depth-redteam` | `reviews/<branch>/ANTI_BORING_VERDICT.md` |
| bakeoff | `P08_BRANCH_BAKEOFF` | `tgf-branch-bakeoff` | `reviews/BRANCH_BAKEOFF.md` |
| (rescue) | `P13_EXISTING_PROJECT_RESCUE` | `tgf-existing-project-rescue` | read-only rescue verdict |
| (scout) | `P16_REPO_SCOUT` | `tgf-repo-scout` | `docs/borrowed-patterns.md` entry |
| handoff | `P15_RELEASE_CANDIDATE` / handoff contract | `tgf-handoff` | `handoffs/{seed-id}.md` |

Post-fun-lock prompts `P05`, `P06`, `P09`–`P12`, `P14` exist as contracts; their
wrappers are deferred until gameplay proof exists.

## Verdict vocabulary

- **Depth verdict** (`tgf-depth-redteam`): `ADVANCE` | `DEEPEN` (name exactly one
  transform) | `KILL`.
- **Branch verdict** (`tgf-branch-bakeoff`): `WINNER` | `ADVANCE` | `DEEPEN` |
  `KILL` | `DISCARD_ALL`. The winning *mechanic* is merged, not necessarily the
  winning branch.

## The anti-boring gate

A slice cannot advance to content/art/polish/multiplayer until it passes:

1. **Naked Mechanics Test** — strip theme/art; is the bare system interesting?
2. **Two-Bot Test** — random vs heuristic/skilled bot must diverge materially.
3. **Dominant-Move Test** — fail if one action/sequence dominates (>70% of
   meaningful actions across varied states).
4. **Second-Session Test** — is there a reason to replay after understanding the
   loop once? "More levels" and "better art" do not count.

Plus a **depth vector**: twelve named axes, each scored 0/1/2 — all twelve are
required (`schemas/depth-vector`). **Minimum for fun-lock: total ≥ 16/24 with
nonzero Choice, Tradeoff, Pressure, Uncertainty, Mastery, and Replayable
Variation.** The ≥16 total and nonzero-axes rule is applied by the depth red-team
(P07), not by the schema, which only checks the axes are present and in range.

## No default engine (ADR 0002 / `docs/engine-matrix.md`)

There is **no default engine before `GAME_THESIS.md`**. Raw Canvas + TypeScript is
a strong common candidate, not a default. Engine choice is scored after the thesis
(headless testability, iteration speed, fantasy/loop fit, deterministic sim,
migration cost, visual-wow-no-game risk, editor opacity, toolchain-verified) and
recorded as a reversible **per-seed engine decision** (`decisions/0001-engine-profile.md`
— a seed-scoped, ADR-style record, distinct from the factory `docs/adr/`). Engine
migration always requires a new decision file.

## Lane policy

Default to **solo parent orchestration**. Dispatch 2–3 isolated prototype lanes
only when uncertainty is high (close core-loop candidates, uncertain engine fit,
cheap programmer-art prototypes can answer the fun question faster than debate).
Lanes must be isolated with disjoint touch sets; the parent integrator owns
manifest updates, branch selection, and final verification.


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

At most **one** direction-changing taste question before the first slice, always
with a recommended default. **Never** ask the user architecture/engine/art/lane
questions before `GAME_THESIS.md`.

## Borrowed skills

Matt Pocock-style skills (`grill-me`, `grill-with-docs`, `to-prd`, `to-issues`,
`triage`, `tdd`, `diagnose`, `zoom-out`, `improve-codebase-architecture`,
`prototype`, `handoff`, `review`) are **wrapped or referenced, never vendored**.
Generic issue/PRD skills must route through local artifacts and never publish
remotely by default. The shared contract every `.codex/skills/` wrapper inherits —
read order, manifest-first routing, run-dir confinement, no-leakage, completion-is-
evidence — lives in `docs/agents/skill-wrapper-doctrine.md`, so a wrapper carries
only its phase-specific difference. See `docs/agents/` and `docs/adr/0004`.

## Completion is evidence, not prose

A phase is done when its verifier output exists — a passing validator, a playtest
report, an anti-boring verdict — not when an agent says it is done.
