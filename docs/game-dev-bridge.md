# Game-dev bridge — idea factory to co-dev backlog

## Context

The bridge is no longer a future seam — **it is the factory's main pipeline**
(ADR 0006). The Tiny Game Factory teases a raw game seed into a falsifiable,
design-locked premise, decomposes it into ordered tracer-bullet issues, and
exports the result as a **spec pack** that a game-development workspace builds.
The spec pack is the handoff unit and the factory's terminal artifact.

Local evidence from `/home/ark/game-dev` on 2026-06-11: that workspace is a Godot
4.6.2/GDScript learning repo. Its method is hands-on and lesson-driven: the AI
teaches, the human builds. Treat it as vocabulary and craft evidence, not as a
target to mutate from here.

## Boundary rules

- TGF keeps owning seeds, theses, design reviews, engine decisions, spec
  decomposition, local issue emission, and pack export.
- `/game-dev` stays a separate learning/build workspace unless a future explicit
  integration task says otherwise.
- No Godot default: a seed can target Godot only after `GAME_THESIS.md` exists and
  an engine-profile decision earns that surface.
- No remote issue publishing by default. Backlog output lands as local markdown
  under `.tgf/seeds/{seed-id}/issues/`; the pack export goes to
  `/home/ark/tgf-games/{seed-id}` (or `--to`), never anywhere else by default.
- A reusable “lego brick” is a documented primitive with provenance and test
  hooks; it is not copied code unless a scout pass proves license, fit, and smoke.

## Bridge shape (the pipeline)

1. **Seed premise** — `scripts/walk-game-idea.mjs` is the user-facing entrypoint; it initializes/resumes the run and writes `IDEA_WALKTHROUGH.md`. `tgf-seed-compile` turns the raw idea into a schema-valid
   `GAME_THESIS.md`: fantasy, loop candidates, depth mechanisms, first slice,
   bot criteria, and kill conditions.
2. **Design gate** — the depth red-team runs the anti-boring gate on paper;
   `ADVANCE` is design-lock and the only door to decomposition.
3. **Backlog translation** — after design-lock + engine decision, `tgf-decompose`
   (P18) authors `SPEC.md` (schema `spec-decomposition`): ordered slices with
   falsifiable acceptance and evidence links, tracer bullet first.
   `node scripts/emit-local-issues.mjs --seed-id <id>` renders `SPEC.md` into
   `issues/*.md` — one issue per slice; dry-run by default, `--write` to emit.
4. **Module archive** — harvested primitives become schema-valid module cards
   (`schemas/module-card.schema.json`) before code: name, problem solved, engine
   fit, inputs/outputs, deterministic test hook, bot hook, source/provenance,
   adoption guard, and slice acceptance.
5. **Spec-pack handoff** — `npm run spec:package` exports the pack (thesis, spec,
   issues, PLAYTEST_PLAN, guards, evidence schemas) into a clean folder for
   human+AI co-development — e.g. matching `/game-dev`’s one-win lesson cadence —
   without leaking factory ledgers or agent vocabulary into the game project.

## Backlog vocabulary mapping

| TGF artifact | Backlog meaning | Co-dev analogue |
|---|---|---|
| `GAME_THESIS.md` | Product premise and constraints | Mission/quest arc for one game idea |
| Engine decision | Chosen build surface and reversibility triggers | Godot/version/tool constraint when earned |
| `SPEC.md` | Ordered, falsifiable build plan | The backlog’s table of contents |
| Tracer-bullet slice (order 1) | Thinnest end-to-end proof of the loop | One playable checkpoint |
| Depth verdict (design-lock) | Fun/depth quality gate, on paper | “Is this worth building?” audit |
| Module card | Reusable primitive candidate | Lesson-sized mechanic or reusable scene pattern |
| Local issue | AFK agent task or human build task | Next one-win lesson/build step |
