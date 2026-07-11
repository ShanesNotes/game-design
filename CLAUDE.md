# CLAUDE.md — game-design (Claude Code entry)

**game-design** under **game-studio** — spec-only; builds no game.

Read `AGENTS.md` first — it is the operating procedure. Then `CONTEXT.md` for
vocabulary. Studio map: `../README.md` + `../CLAUDE.md`. This file exists because
`factory.config.toml` lists it as a required Claude Code bootstrap path; it adds
no separate doctrine.

```bash
npm run verify   # lint + validate-artifacts + run-gates + tests
```

To start or resume a seed run:

```bash
node scripts/init-game-run.mjs --seed-id <kebab-id> --seed "<one-line seed>"
node scripts/walk-game-idea.mjs --seed-id <kebab-id>   # all-in-one: init/resume + walkthrough + issue dry-run
node scripts/summarize-run.mjs --seed-id <kebab-id>
node scripts/advance-run.mjs --seed-id <kebab-id> --to <phase> --event <event> --status passed
```

At `decompose`, render `SPEC.md` into the issue backlog; at `handoff`, export the
spec pack (both dry-run by default). For studio work **always pass `--to`** under
`games/`:

```bash
node scripts/emit-local-issues.mjs --seed-id <kebab-id> --write
npm run spec:package -- --seed-id <kebab-id> \
  --to ../games/_export-<kebab-id> --write --require-manifest
```

Then from studio root: `node forge/bin/forge.mjs intake games/_export-<kebab-id>`.
E2e proof: `../forge/docs/walking-skeleton.md`.
