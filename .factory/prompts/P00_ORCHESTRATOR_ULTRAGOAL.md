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
Take the seed from zero to a playable, bot-tested, anti-boring-gated first slice. Do not optimize for architecture. Optimize for honest search.

NON-NEGOTIABLES:
- Do not ask architecture or engine questions.
- Do not code before GAME_THESIS.md exists.
- Do not preserve an incumbent stack by default.
- Do not add content, polish, multiplayer, or opaque assets before fun-lock.
- Agents communicate by files, not chat.
- A branch is not alive until a bot has played it.

PHASES:
1. Verify local tools and update docs/toolchain-verification-ledger.md.
2. Compile seed into GAME_THESIS.md using P01.
3. Pre-mortem GAME_THESIS.md against docs/anti-boring-gate.md as a design check before coding. (P07/P08 are evidence-gated and run only after a slice exists.)
4. Select 2–3 prototype lanes using P02 and P03. Use Grok only if available.
5. Dispatch isolated worktrees/branches.
6. Each branch builds only the first playable slice using P04.
7. Each branch emits playtest report, capture, replay/golden, and anti-boring verdict.
8. Judge gameplay, not code. Merge the winning idea, not necessarily the winning branch.
9. If none pass: deepen, pivot, or throw away. Do not drift.
10. Stop after fun-lock with a written next-step plan. Do not silently expand.

OUTPUT:
- GAME_THESIS.md
- decisions/0001-engine-profile.md
- playtests/<branch>/playtest_report.json
- reviews/<branch>/ANTI_BORING_VERDICT.md
- reviews/BRANCH_BAKEOFF.md
- README_NEXT_ACTIONS.md

SUCCESS:
At least one slice is playable for ≥60 seconds by bot and passes the anti-boring gate, OR all branches are killed with evidence and a better next seed brief exists.
