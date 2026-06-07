# End-to-end harness + factory test, with Karpathy-style autoresearch — RESULT

**Date:** 2026-06-07 · **Mission:** `.omx/goals/autoresearch/dolphin-tgf-e2e/`
(durable omx state: mission, rubric, ledger of verdicts).

## What this was

A full end-to-end exercise of the Tiny Game Factory harness + runtime: drive a real
seed — *"a beautiful ocean explorer game in which the user controls a dolphin"* — from
a one-line prompt to a bot-tested, anti-boring-gated, fun-locked first slice, **and**
use the run as a validator-gated autoresearch loop to find and fix every factory gap
the run exposed, then prove the fixes generalize with a second contrasting seed.

## Outcome: PASS on all rubric criteria

| # | Criterion | Result |
|---|---|---|
| C1 | End-to-end completeness | ✅ dolphin traversed toolchain→thesis→engine→dispatch→first-slice→depth-review→bakeoff→fun-lock; every phase gated by a real artifact; `--check run` green throughout |
| C2 | Honest playtest evidence | ✅ real deterministic sims + bots, executed 60s sessions; schema-valid, gate-consistent reports; metrics reproducible |
| C3 | Outcome | ✅ **fun-lock** on the `sonar` lane (depth 19/24, all 4 falsifiers) |
| C4 | Factory improvement | ✅ 4 gaps fixed + 1 new tool, each with regression tests; `npm run verify` green (11→44 tests) |
| C5 | Generalization | ✅ `vault-cracker` (turn-based deduction, solo path) reached fun-lock via the same pipeline + fixes |
| C6 | Separation / no leakage | ✅ games live in `/home/ark/tgf-games/{id}/`; run state in `.tgf/seeds/{id}/`; child repos leakage-clean |

## The dolphin game (winning mechanic)

`sonar` — a **partially-observable echolocation reveal-vs-risk economy**. The dolphin
sees only its current cell plus what a recent ping revealed (knowledge decays in ~4
turns); a ping spends breath and emits noise that wakes (half-speed, escapable)
predators; a hidden exit forces a minimum information spend.

Adversarially verified (the red-team independently re-ran the sim, 1000-seed sweeps):
- heuristic 31.2 vs random 1.85 (**~15× skill gap**); 5 distinct outcomes, none dominant.
- max action share 32.2% → **no dominant move**.
- the thesis bet holds: conditional pinging **helps on 725/1000 seeds, hurts on 154** —
  genuinely contested — and beats both always-ping (8.6) and silent (13.9).
- ablation: **non-decaying memory scores worse** (10.2 vs 31.2) → perishable knowledge
  is load-bearing, not cosmetic.

The contrast lane `current` (deterministic flow-field routing) was eliminated at the
hard gate: ride = 78% (**dominant-move fail**), exactly as the design panel predicted
— a clean demonstration of the anti-boring gate falsifying a degenerate loop.

Games: `/home/ark/tgf-games/dolphin-ocean-explorer/` and `/home/ark/tgf-games/vault-cracker/`
(each its own git repo; vanilla JS ESM, pure deterministic sims, bot harnesses, sim tests).

## Factory improvements shipped (the autoresearch deliverable)

Each gap was surfaced by the run, fixed with a regression test, and logged as an omx verdict.

1. **GAP #1 — run validator only saw freshly-initialized runs.** `--check run`
   hard-clamped `current_phase` to `toolchain|intake`, making the phase machine and
   phase-artifact constraints unreachable for real runs, and forbade `GAME_THESIS.md`
   in the run dir despite the skill declaring it lives there. Fix: split `checkRun`
   into whole-life invariants (manifest schema, path policy, phase-artifact
   constraints, **manifest↔ledger phase agreement**, legal ledger transitions,
   artifact-file existence) vs init-only invariants gated on a not-yet-progressed run.

2. **GAP #2 — no supported way to advance a run.** Agents hand-edited `manifest.json`
   + `execution-ledger.jsonl` and could desync them. Added `scripts/advance-run.mjs`:
   refuses illegal transitions (via the run-state phase machine), appends a
   schema-valid ledger row, updates the manifest, and re-validates before writing.

3. **GAP #3 — thesis/engine "must validate against schema" was never enforced.** The
   schemas are JSON, the templates were markdown, and nothing validated a real run's
   artifact. Convention: each artifact is markdown carrying a canonical fenced `json`
   block; added `run-state.validateEmbeddedJson`, wired it into `--check run`, added
   on-demand `--check thesis` / `--check engine`, and updated templates + P01/P02 +
   the two skills.

4. **GAP #4 — fun-lock was not evidence-gated.** Nothing stopped `current_phase:
   fun-lock` with no gate evidence. `--check run` now requires, at/past fun-lock, a
   `reviews/**/depth-vector.json` with verdict `ADVANCE` that clears the gate
   (≥16/24, six required axes nonzero). Gate policy in the checker (ADR 0005).

**Observation (not a gap):** the dominant-move check assumes a small action
vocabulary; for large-combinatorial-action games (deduction) a symbol-frequency proxy
is the honest representation. Documented in the vault-cracker verdict; no code change.

## How to reproduce

```bash
npm run verify                                   # factory: lint, validators, gate sandbox, 44 tests
node scripts/summarize-run.mjs --seed-id dolphin-ocean-explorer
node scripts/validate-artifacts.mjs --check run --seed-id dolphin-ocean-explorer
( cd /home/ark/tgf-games/dolphin-ocean-explorer && npm test && node lanes/sonar/harness.mjs --smoke )
( cd /home/ark/tgf-games/vault-cracker && npm test && node game/harness.mjs --smoke )
```

Run state (gitignored, on disk): `.tgf/seeds/{dolphin-ocean-explorer,vault-cracker}/`.
