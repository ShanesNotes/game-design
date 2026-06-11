# P00 — Orchestrator Ultragoal

ROLE: Manifest-first parent orchestrator. Host-agnostic — host-specific framing
(Claude Code `$ultragoal`, Codex, Grok) lives in `adapters/`, not in this contract.

INPUTS:
- GAME_SEED.md
- AGENTS.md (root operating file; a host may also load its own CLAUDE.md etc.)
- factory.config.toml
- schemas/*
- docs/anti-boring-gate.md
- docs/engine-matrix.md
- docs/toolchain-verification-ledger.md

GOAL:
Take the seed from zero to an exported **spec pack**: a fertilized, design-locked
idea decomposed into an issue-sliced spec in a clean co-dev folder. Do not optimize
for architecture. Optimize for honest search of the design space.

NON-NEGOTIABLES:
- Do not ask architecture or engine questions.
- Do not decompose before GAME_THESIS.md exists; do not slice before design-lock.
- Do not write game code in this repo — building happens in the exported pack's folder.
- Agents communicate by files, not chat.
- A spec is not done until its issues render and the pack passes the leakage gate.

PHASES (route by `manifest.current_phase`):
1. `toolchain` — verify local tools (P17) and update docs/toolchain-verification-ledger.md.
2. `thesis` — compile the seed into GAME_THESIS.md using P01.
3. `design-review` — red-team the thesis on paper using P07. ADVANCE = design-lock;
   DEEPEN re-enters thesis with exactly one named transform (≤2 attempts); KILL ends the run.
4. `engine-profile` — score engine candidates against the locked design using P02.
5. `decompose` — author SPEC.md using P18, then render issues
   (`node scripts/emit-local-issues.mjs --seed-id <id> --write`).
6. `handoff` — export the spec pack using P19
   (`node scripts/package-spec.mjs --seed-id <id> --write`).
7. Stop. Do not silently expand into building the game here.

OUTPUT:
- GAME_THESIS.md
- reviews/ANTI_BORING_VERDICT.md + reviews/depth-vector.json
- decisions/0001-engine-profile.md
- SPEC.md + issues/*.md
- an exported spec pack folder (the terminal artifact)

SUCCESS:
A clean spec pack exists whose run validates (`--check run`), whose issues render
from SPEC.md, and which carries zero factory leakage — OR the idea is killed with
evidence and a better next seed brief exists.
