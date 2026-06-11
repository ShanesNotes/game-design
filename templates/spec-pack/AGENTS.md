# AGENTS.md — Co-developing this spec pack

## North star

Build the game this spec argues for, slice by slice, with the human as
co-developer. Optimize for evidence the game is worth playing — not for
architecture, screenshots, or file count.

## Boot sequence

1. `README.md` — what this pack is.
2. `SPEC.md` — the slice plan; it is the backlog's source of truth.
3. `GAME_THESIS.md` — why this loop should be fun; its kill conditions still apply.
4. `decisions/0001-engine-profile.md` — the recommended engine and when to abandon it.
5. `issues/` — work them in `order`. An issue with `depends_on` stays blocked until
   the dependency's evidence exists.

## Co-development style

The human is here to learn and build, not to watch. For each issue: explain the
approach before writing code, let the human drive where they want to, and review
the result together against the issue's acceptance list. Keep slices thin — the
tracer bullet comes first and proves the verbs fit together end to end.

## Learning workspace

This folder doubles as a teaching workspace. `MISSION.md` (seeded from the thesis)
is the compass — refine it with the human before slice 1 and keep it current.
`RESOURCES.md` tracks trusted sources; fill its gaps before trusting parametric
knowledge about the engine. If a teaching skill is in use, its artifacts
(`lessons/`, `learning-records/`, `reference/`, `NOTES.md`) live here too — treat
them as first-class: a learning record about why a mechanic works is evidence,
the same as a playtest report.

## Non-negotiables (inherited from the spec)

- The engine decision is recorded; migrating engines requires a new file in `decisions/`.
- A change touching gameplay must emit `playtests/<branch>/playtest_report.json`
  (see `schemas/playtest-report.schema.json`).
- A slice is not alive until a bot or scripted run has played it for at least 60 seconds.
- No content expansion, opaque/high-fidelity assets, or multiplayer backend before
  the loop passes the falsifiers in `PLAYTEST_PLAN.md` (fun-lock).
- Out-of-scope items listed in `SPEC.md` stay out of scope until the spec is revised.
- No copyrighted IP cloning.

## Where evidence lives

- `playtests/` — bot and scripted playthrough reports.
- `reviews/` — depth and anti-boring verdicts.
- `decisions/` — recorded choices and their rationale.

## Guards

`guards/` holds optional dependency-free checks. Run one directly
(`node guards/playtest_report_required.mjs`) or wire them as pre-commit hooks.
They block the unsafe case and exit 0 on the safe one.

## Updating issue state

When an issue's acceptance holds and its evidence exists, set its `state` to done
by recording the evidence path in the issue's `evidence` list, then unblock any
issue that `depends_on` it (flip `needs-info` to `ready-for-agent`).
