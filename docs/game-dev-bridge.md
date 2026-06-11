# Game-dev bridge — idea factory to build backlog

## Context

The intended merge path is: Tiny Game Factory becomes the **game idea factory** MVP.
It teases a raw game seed into a falsifiable core premise, then decomposes the
proven idea into local issues and tracer-bullet slices that a game-development
workspace can build.

Local evidence from `/home/ark/game-dev` on 2026-06-11: that workspace is a Godot
4.6.2/GDScript learning repo. Its method is hands-on and lesson-driven: the AI
teaches, the human builds. Treat it as vocabulary and craft evidence, not as a
child repo to mutate from here.

## Boundary rules

- TGF keeps owning seeds, theses, engine ADRs, gates, playtest evidence, and local
  backlog emission.
- `/game-dev` stays a separate learning/build workspace unless a future explicit
  integration task says otherwise.
- No Godot default: a seed can target Godot only after `GAME_THESIS.md` exists and
  an engine-profile decision earns that surface.
- No remote issue publishing by default. Backlog output lands as local markdown
  under `.tgf/issues/` or seed-run artifacts under `.tgf/seeds/{seed-id}/`.
- A reusable “lego brick” is a documented primitive with provenance and test
  hooks; it is not copied code unless a scout pass proves license, fit, and smoke.

## MVP bridge shape

1. **Seed premise** — `scripts/walk-game-idea.mjs` is the user-facing entrypoint; it initializes/resumes the run and writes `IDEA_WALKTHROUGH.md`. `tgf-seed-compile` turns the raw idea into a schema-valid
   `GAME_THESIS.md`: fantasy, loop candidates, depth mechanisms, first slice,
   bot criteria, and kill conditions.
2. **Evidence gate** — the normal engine/profile/slice/depth pipeline decides
   whether the premise deserves development work.
3. **Backlog translation** — after thesis + engine ADR, emit local issues using
   `docs/agents/issue-tracker.md`: independently grabbable tasks with falsifiable
   acceptance and evidence links. The first safe bridge command is
   `node scripts/emit-local-issues.mjs --seed-id <id>`, which dry-runs by default.
   Its current MVP registry emits the first-slice and depth-review issue templates;
   future module-card-driven templates should extend that registry rather than
   mixing ad-hoc backlog shapes into the command body.
4. **Module archive** — harvested primitives become schema-valid module cards
   (`schemas/module-card.schema.json`) before code: name, problem solved, engine
   fit, inputs/outputs, deterministic test hook, bot hook, source/provenance,
   adoption guard, and slice acceptance.
5. **Game-dev handoff** — if Godot/GDScript is earned, create a human-readable
   build order that matches `/game-dev`’s one-win lesson cadence without leaking
   factory ledgers or agent vocabulary into the game project.

## Backlog vocabulary mapping

| TGF artifact | Backlog meaning | `/game-dev` analogue |
|---|---|---|
| `GAME_THESIS.md` | Product premise and constraints | Mission/quest arc for one game idea |
| Engine ADR | Chosen build surface and reversibility triggers | Godot/version/tool constraint when earned |
| First playable slice | Tracer bullet proving the loop | One playable checkpoint |
| Depth verdict | Fun/depth quality gate | “Is this worth learning/building next?” audit |
| Module card | Reusable primitive candidate | Lesson-sized mechanic or reusable scene pattern |
| Local issue | AFK agent task or human build task | Next one-win lesson/build step |

## First AFK candidates

- Add a module-card schema and fixture.
- Add a seed-to-local-issues dry-run emitter after thesis + engine ADR.
- Add a bridge handoff template for Godot-earned seeds.
- Scout one `/game-dev` mechanic as a module card without copying project code.
