# Game Repo

This is a generated game repo. It holds one game: its seed, its thesis, its slices,
and the evidence that the game is worth playing.

## Agent boot sequence

If you are an agent picking up this repo, do this in order:

1. Read `AGENTS.md` — the north star, non-negotiables, and required gates.
2. Read `GAME_SEED.md` — the premise this game grows from.
3. Verify your local toolchain before relying on any tool.
4. Set or confirm the game thesis (`GAME_THESIS.md`) before writing any code.

## Doctrine

search > codegen, fun > polish, evidence > sunk cost.

## Where evidence lives

- `playtests/` — bot and scripted playthrough reports.
- `reviews/` — depth, QA, and anti-boring verdicts.
- `decisions/` — recorded choices and their rationale.

## The rule

No code before `GAME_THESIS.md`. A game is an argument that it is fun, and the
thesis is that argument. Write it first, then build the smallest slice that
tests it, then let the evidence say whether to continue.
