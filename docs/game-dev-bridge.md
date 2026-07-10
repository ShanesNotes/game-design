# Game-dev bridge — design to co-dev / forge

## Context

The bridge is the design discipline's main pipeline (ADR 0006; DESIGN-RECORD §3).
**game-design** teases a raw game seed into a falsifiable, design-locked premise,
decomposes it into ordered tracer-bullet issues, and exports the result as a
**spec pack**. That pack is the handoff unit and this repo's terminal artifact.
Downstream: plain co-dev for any decided engine, or **forge** intake when the
accepted engine profile is godot-4 (DESIGN-RECORD §3 forge gate).

Local evidence from `/home/ark/game-dev` (learning notes) and sibling studio
repos (`forge/`, `games/`, `assets/`, `lore/`, `generation/`) is craft evidence,
not a target to mutate from here.

## Downstream agentic tooling

The co-dev or forge workspace that opens a spec pack is increasingly an AI coding
agent with game-dev leverage: engine runtime MCPs, per-engine skill suites, and
asset-generation services. Design acknowledges this in three places and no more:
P02 scores a *verified* agent-tooling surface as engine-fit evidence, the
toolchain ledger tracks each surface's trust status, and the pack's RESOURCES.md
hands the possibility to the build agent with the guards that govern it. No
spec may *require* such tooling — packs must remain buildable by an agent with
nothing but the engine and a shell.

## Boundary rules

- game-design keeps owning seeds, theses, design reviews, engine decisions, spec
  decomposition, local issue emission, and pack export.
- No Godot default before thesis: a seed can target Godot only after
  `GAME_THESIS.md` exists and an engine-profile decision earns that surface.
  **Manifest export** (T06) is Godot-gated for forge; other engines may still
  export plain packs (DESIGN-RECORD §3).
- No remote issue publishing by default. Backlog output lands as local markdown
  under `.tgf/seeds/{seed-id}/issues/`; pack export is only via
  `scripts/package-spec.mjs` (`--to` or the configured default), never by hand.
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
   human+AI co-development without leaking design ledgers or agent vocabulary.
   Forge-manifest emission is T06.

## Backlog vocabulary mapping

| game-design artifact | Backlog meaning | Co-dev / forge analogue |
|---|---|---|
| `GAME_THESIS.md` | Product premise and constraints | Mission/quest arc for one game idea |
| Engine decision | Chosen build surface and reversibility triggers | Godot/version/tool constraint when earned |
| `SPEC.md` | Ordered, falsifiable build plan | The backlog’s table of contents; 1:1 with forge slices |
| Tracer-bullet slice (order 1) | Thinnest end-to-end proof of the loop | One playable checkpoint |
| Depth verdict (design-lock) | Fun/depth quality gate, on paper | “Is this worth building?” audit |
| Module card | Reusable primitive candidate | Lesson-sized mechanic or reusable scene pattern |
| Local issue | AFK agent task or human build task | Next one-win lesson/build step |
