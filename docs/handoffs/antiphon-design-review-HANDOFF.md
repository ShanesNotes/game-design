# Handoff — ANTIPHON seed run, held at the design-review checkpoint

**Date:** 2026-06-13
**Run:** seed-id `antiphon` · phase `design-review` (NOT advanced)
**Why this exists:** the anti-boring gate passed mechanically (19/24) but surfaced one
convergent, fixable weakness. The owner (Shane) is **holding the verdict** to get a
**second-model opinion** before locking **ADVANCE** vs **DEEPEN**. Nothing is locked.

> This is the committed durable record. The run state itself lives on disk at
> `.tgf/seeds/antiphon/` (gitignored by factory design — see the `.gitignore` note:
> run evidence lives on disk + a committed handoff report, not factory history).

---

## The decision to make (the whole point of this handoff)

The gate found that ANTIPHON's **interaction grammar** may be under-specified: five
independent attackers + a completeness critic converged on the same root — **the
systems can play themselves** (NAME'd motes self-route, HOST can auto-fire, TUNE is a
toggled aura), and **TUNE's only specified skill is audio-perception** ("true harmony
vs. mechanical regularity"), which is not a *mechanical* skill once theme is stripped.
So the per-second, hands-on mastery verb is missing, risking low-APM positional drift.

It is **fixable on paper** and it is the gate's highest-leverage finding. Two paths:

| Option | What it does | Cost |
|---|---|---|
| **DEEPEN (one transform)** *(this session's recommendation)* | Re-enter `thesis`, apply exactly one transform: **specify TUNE as a theme-free active mechanical skill** (e.g. an on-beat phase-matching + aim window with a non-audio readout). Re-run a focused review, then ADVANCE on the hardened thesis. | 1 thesis iteration (factory allows ≤2 deepen attempts). |
| **ADVANCE (carry obligations)** | Lock the thesis as-is (it clears the bar) and bake the TUNE-active-skill spec + sharpened bot falsifiers into `SPEC.md` as hardened acceptance criteria at decompose. | 0 extra thesis passes; fixes land at spec level. |

**A second opinion should weigh:** is the TUNE/autopilot issue a *thesis-level shallowness*
(→ DEEPEN) or a *spec-level detail* the thesis rightly leaves open (→ ADVANCE)? And are
the four deferred empirical findings (below) correctly carried to the two-bot test, or
do any need closing on paper first?

---

## Gate evidence (decision-critical summary)

Full evidence — every per-axis citation/argument/falsifier, every attacker's full
argument, the knock-downs, the completeness critic — is on disk at
**`.tgf/seeds/antiphon/reviews/GATE_FINDINGS.md`** (93 KB). Summary:

**Depth vector — 19/24, all six mandatory axes nonzero (design-lock bar = ≥16 with the six nonzero).**
Each "2" was handed to a skeptic who tried to knock it down a point; three fell — the system working, not a flaw.

| Axis | Score | | Axis | Score |
|---|---|---|---|---|
| meaningful_choice* | 1 | | combinatorial | 2 |
| tradeoff* | 1 (↓ from 2) | | emergence | 2 |
| pressure* | 2 | | replayable_variation* | 1 (↓ from 2) |
| uncertainty* | 1 (↓ from 2) | | failure_recovery | 2 |
| progression | 2 | | expression | 1 |
| mastery* | 2 | | expansion_headroom | 2 |

<sub>*mandatory-nonzero axis · zero blockers · zero "fail" verdicts · all six attackers returned "major"</sub>

**The six convergent findings:**

1. **naked-mechanics (major):** TUNE has no theme-free mechanical skill → naked loop risks
   reducing to convert-aura + fear-aura survivor-like. *On-paper fixable.* ← the DEEPEN target.
2. **completeness-critic / "autopilot" (major):** what do your hands do each second? NAME
   self-routes, HOST auto-fires, TUNE toggles → near-zero-APM drift. *Same root as #1.*
3. **dominant-move (major):** the D1 shifting-target verdict moves *deterministically on the
   player's own choices*, so a bot pegs target-per-path; only the (deferred, unproven) *hidden
   portion* carries non-solvability. *Owned by kill #3; empirical (two-bot).*
4. **second-session (major):** the remnant-capstone *converges* to a fixed maximal tree
   late-campaign, so late-game replay leans almost entirely on the shifting target. *Partly
   on-paper (don't let the remnant fully converge), partly empirical.*
5. **bot-criteria-audit (major):** criterion #5 (decision-trace convergence) names no
   similarity *metric* — two repos could score it oppositely. *One-sentence fix; fold into spec.*
6. **fix-audit (major):** D2 (forcing-function budget) is the weakest fix — "building buys
   slack" is circular against the grind-floor; "staggered pressures" is asserted, not
   architected. *Partly on-paper.*

Findings #1–#2 share a single fix (TUNE as active skill). #3 is the seed's own flagged
hazard (kill #3), correctly deferred. #5 is trivial and should land in the spec regardless.

---

## What's been done this session (the pipeline so far)

| Phase | Status | Artifact (on disk) |
|---|---|---|
| **toolchain (P17)** | ✅ passed | real probes: node 22, npm 11, Playwright 1.60, Godot 4.6.2-mono, cargo 1.95, phaser 4.1, three 0.184. Deterministic-sim satisfiable everywhere. |
| **thesis (P01)** | ✅ schema-valid | `.tgf/seeds/antiphon/GAME_THESIS.md` — covert (no biblical proper nouns), leak-clean (no factory terms), validates `schemas/game-thesis`. |
| **design-review (P07)** | ⏸ evidence done, **verdict HELD** | `.tgf/seeds/antiphon/reviews/GATE_FINDINGS.md` |

Ledger: `.tgf/seeds/antiphon/execution-ledger.jsonl`. Manifest: `.tgf/seeds/antiphon/manifest.json`
(`current_phase` is the resume source of truth — **manifest beats memory/chat**).

The seed itself is a rich, pre-built architecture at `/home/ark/language-of-creation/game-seed/`
(`GAME_SEED.md` + `LEXICON.md` + `design/` substrate + `research/`); its factory-facing
`GAME_SEED.md` was copied into the run dir as the canonical seed. It even ran its *own*
offline red-team (DEEPEN → fixes D1–D5); this session ran the **real, independent** gate.

---

## Remaining directions (after the verdict is settled)

1. **Resolve the verdict** (ADVANCE or DEEPEN) per owner + second opinion.
   - If DEEPEN: `advance-run --to deepen` (auto-increments `deepen_attempt_count`), re-author
     `GAME_THESIS.md` with the one TUNE-as-active-skill transform, `--to thesis`, then re-review.
   - If ADVANCE: `advance-run --to engine-profile` and carry the findings into the spec.
2. **engine-profile (P02):** score candidates against the design-locked thesis. **Binding
   constraint: a deterministic sim** (two-bot test + seventh-beat verdict must run). Candidates
   already in the thesis: raw-canvas-ts (cheapest reversible 2D), bevy-rust (sim-is-game),
   godot-4. Write `decisions/0001-engine-profile.md` (`schemas/engine-profile-decision`,
   status `accepted`). **No engine may be named before this phase.**
3. **decompose (P18):** author `SPEC.md` (`schemas/spec-decomposition`) — tracer-bullet first
   (order 1, type `slice`), contiguous orders, deps point earlier, every chosen-loop verb
   covered. Candidate tracer (from thesis): the Act-I HOLD + primitive-NAME room, < 5 min,
   bot-testable (binding stabilizes vs collapses). Then `emit-local-issues.mjs --write`.
4. **handoff (P19):** export the spec pack via `package-spec.mjs` (dry-run → review → `--write`).
   Leakage-gated. **This is the owner's stated objective: the game-dev-ready spec pack.**

---

## Binding discipline (carry forward — do not drop)

- **Covert lexicon is KEPT** (owner decision). All player-facing strings use
  `/home/ark/language-of-creation/game-seed/LEXICON.md` surface names ("the Grasping King",
  "the Hollow Champion", "the Sounding", "the Floor"). **No biblical proper nouns** in any
  packaged artifact. The factory leakage gate does **not** enforce this — it is applied by hand.
- **Leak-clean:** no factory terms (`TGF`, `.tgf`, `OMX`, `/home/ark/…`, etc.) in any artifact
  that ships in the spec pack (thesis, spec, issues). The leakage scan runs at export.
- **Deterministic sim** is the one binding forward constraint.
- **No game code in the factory.** Completion is verifier evidence, not prose.
- Advance phases only via `scripts/advance-run.mjs` (never hand-edit manifest + ledger).

## Suggested skills for the continuing agent

- **`tgf-depth-redteam`** — if re-running the gate after a DEEPEN transform.
- **`tgf-engine-profile`** — for P02 (score engines vs the deterministic-sim constraint).
- **`tgf-decompose`** — for P18 (SPEC.md tracer-bullet slicing).
- **`tgf-handoff`** — for P19 (the spec-pack export, the owner's objective).
- Read order on boot: factory `AGENTS.md` → `CONTEXT.md` → `.tgf/seeds/antiphon/manifest.json`.

## Key paths

- Run state: `.tgf/seeds/antiphon/` (manifest, ledger, `GAME_SEED.md`, `GAME_THESIS.md`, `reviews/GATE_FINDINGS.md`)
- Seed substrate: `/home/ark/language-of-creation/game-seed/` (`GAME_SEED.md`, `LEXICON.md`, `design/`, `research/`)
- Gate workflow script: `~/.claude/projects/-home-ark-tiny-game-factory/.../workflows/scripts/antiphon-design-redteam-wf_887a21f3-b14.js` (re-runnable)
- Memory: `~/.claude/projects/-home-ark-tiny-game-factory/memory/antiphon-run.md`
