# README_NEXT_ACTIONS.md — Seed Run {{SEED_ID}}

Status: initialized (phase: `toolchain`).

Next agent action:

1. Read `README_AGENT_BOOT.md`.
2. `node scripts/summarize-run.mjs --seed-id {{SEED_ID}}` — manifest beats memory.
3. Run `.factory/prompts/P17_VERIFY_TOOLCHAIN.md` and update the toolchain ledger
   from real local probes (not memory).
4. Run `.factory/prompts/P01_SEED_COMPILE.md` to compile `GAME_SEED.md` into
   `GAME_THESIS.md`, then `.factory/prompts/P07_DEPTH_RED_TEAM.md` for the paper
   design review (design-lock opens engine-profile → decompose → handoff).
5. Record phase transitions with `node scripts/advance-run.mjs` (do not hand-edit
   `manifest.json` and `execution-ledger.jsonl` separately).

Do not:

- write game code (the factory ships a spec pack, not a game);
- create the default spec pack root by hand (only `scripts/package-spec.mjs`
  exports it, at handoff);
- pick an engine before the thesis exists and is design-locked;
- ask the user architecture/engine questions.
