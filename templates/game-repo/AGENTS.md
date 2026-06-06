# AGENTS.md — Game Repo

## North star

Build playable, deep, verifiable game slices from a seed. Do not optimize for architecture, screenshots, file count, or prompt compliance. Optimize for evidence that a game is worth playing.

## Non-negotiables

- Do not ask architecture or engine questions.
- Do not code before `GAME_THESIS.md` exists.
- Treat existing code as evidence, not destiny.
- Current engine is an option, not a constraint.
- A change touching gameplay must emit a playtest report.
- A branch cannot advance unless a bot played it for at least 60 seconds.
- No content expansion before fun-lock.
- No opaque/high-fidelity assets before G1 and G2.
- No multiplayer backend before solo/hot-seat/sim fun-lock.
- No copyrighted IP cloning.
- No engine migration without ADR in `decisions/`.

## Work style

Agents coordinate through artifacts, not chat.

Write:
- decisions in `decisions/`
- playtest evidence in `playtests/`
- reviews in `reviews/`
- branch notes in `reviews/<branch>/`

## Required gates

Before reporting done:
- typecheck, if applicable
- unit/sim tests, if applicable
- build/export, if applicable
- 60s bot or scripted playthrough
- anti-boring verdict
- update README_NEXT_ACTIONS.md

## Subagents

Use specialized subagents for:
- gameplay/depth red-team
- engine/profile recommendation
- branch implementation
- QA/playtest
- performance
- accessibility
- IP/originality
- repo scout

Subagents may not alter each other's branch/worktree or pack unless explicitly assigned.
