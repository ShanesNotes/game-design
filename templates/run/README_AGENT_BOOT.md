# README_AGENT_BOOT.md — Seed Run {{SEED_ID}}

You are resuming a Tiny Game Factory seed run. State lives in this folder; the
`manifest.json` is the source of truth, never the chat history.

## Boot sequence

1. Read the factory `AGENTS.md`, `CONTEXT.md`, and this run's `manifest.json`.
2. Summarize state: `node scripts/summarize-run.mjs --seed-id {{SEED_ID}}`.
3. Run `.factory/prompts/P17_VERIFY_TOOLCHAIN.md` (or an equivalent toolchain probe)
   before any other phase.
4. Do not write game code — the factory produces a spec pack, never a game.
   `GAME_THESIS.md` is generated from `GAME_SEED.md` (P01) and must pass the paper
   design review (P07) before anything is decomposed.
5. Do not create the default spec pack root (`$STUDIO_ROOT/games/{{SEED_ID}}`)
   by hand — only `scripts/package-spec.mjs` exports there, at the handoff phase.
6. Do not ask the user architecture or engine questions.
7. Advance phases with `node scripts/advance-run.mjs` (never hand-edit manifest +
   ledger separately); it appends `execution-ledger.jsonl` and re-validates before writing.

## This run

- Seed: {{SEED}}
- Current phase: see `manifest.json` → `current_phase`.
- Next action: see `README_NEXT_ACTIONS.md`.
