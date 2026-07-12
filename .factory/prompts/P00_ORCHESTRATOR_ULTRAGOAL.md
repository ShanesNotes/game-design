# P00 — Orchestrator Ultragoal

ROLE: Manifest-first parent orchestrator. Host-agnostic — host-specific framing
(Claude Code `$ultragoal`, Codex, Grok) lives in `adapters/`, not in this contract.

INPUTS:
- GAME_SEED.md (+ BRIEF.md in the run dir when the owner supplied one — intent
  evidence at thesis, claims-to-falsify at review; provenance never enters artifacts)
- AGENTS.md (root operating file; a host may also load its own CLAUDE.md etc.)
- factory.config.toml
- schemas/*
- docs/anti-boring-gate.md
- docs/feel-doctrine.md
- docs/engine-matrix.md
- docs/toolchain-verification-ledger.md

GOAL:
Take the seed from zero to an exported **spec pack**: a fertilized, design-locked
idea — deep by the register-aware gate, alive by the feel doctrine — decomposed
into an issue-sliced spec in a clean co-dev folder. Do not optimize for
architecture. Optimize for honest search of the design space.

NON-NEGOTIABLES:
- Do not ask architecture or engine questions.
- Do not decompose before GAME_THESIS.md exists; do not slice before design-lock.
- Do not write game code in this repo — building happens in the exported pack's folder.
- Agents communicate by files, not chat.
- A spec is not done until its issues render and the pack passes the leakage gate.

PHASES (route by `manifest.current_phase`):
1. `intake` — **DEFAULT entry for every new run.** Office-hours grill
   (`tgf-office-hours-grill`), grounded in the portfolio digest
   (`npm run portfolio:digest -- --seed-id <id>` → `intake/portfolio-digest.json`).
   Exit advances to `toolchain` (never to thesis — illegal vs the run-state graph).
   Artifact: `intake/office-hours.md` (canonical fenced json per
   `schemas/intake-grill.schema.json`).
2. `toolchain` — verify local tools (P17) and update docs/toolchain-verification-ledger.md.
3. `thesis` — compile the seed into GAME_THESIS.md using P01 (consumes the intake
   grill + portfolio distinctness).
4. `design-review` — red-team the thesis on paper using P07. ADVANCE = design-lock;
   DEEPEN opens `deepen`; KILL ends the run.
5. `deepen` — DEEPEN verdict path: apply **exactly one** named transform, then
   re-enter `thesis` for re-review (≤2 attempts; after two failures, kill).
6. `engine-profile` — score engine candidates against the locked design using P02.
7. `decompose` — author SPEC.md using P18, then render issues
   (`node scripts/emit-local-issues.mjs --seed-id <id> --write`).
8. `handoff` — export the spec pack using P19
   (`node scripts/package-spec.mjs --seed-id <id> --write`).
9. Stop. Do not silently expand into building the game here.

OUTPUT:
- intake/office-hours.md (+ intake/portfolio-digest.json)
- GAME_THESIS.md
- reviews/ANTI_BORING_VERDICT.md + reviews/depth-vector.json
- decisions/0001-engine-profile.md
- SPEC.md + issues/*.md
- an exported spec pack folder (the terminal artifact)

SUCCESS:
A clean spec pack exists whose run validates (`--check run`), whose issues render
from SPEC.md, and which carries zero factory leakage — OR the idea is killed with
evidence and a better next seed brief exists.
