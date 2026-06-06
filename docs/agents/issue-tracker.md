# issue-tracker.md — Local issue convention for borrowed skills

This is the issue-tracker convention the borrowed Matt Pocock skills (`to-issues`,
`to-prd`, `triage`, `review`/`qa`) **must route through**. It grounds those skills
so they operate on the factory's own files instead of an external service. For term
definitions see `CONTEXT.md`; for issue states see `triage-labels.md`.

## Hard rule: local files, never remote

Issues and slices are **local markdown files**, not remote GitHub/Linear/Jira
issues. Factory-level work lives under `.tgf/issues/`; ad-hoc or pre-triage notes
may live under `.scratch/`. Per-seed run artifacts stay under
`.tgf/seeds/{seed-id}/` (ADR 0003) and are **not** issues.

**Generic issue/PRD/QA skills MUST NOT publish to any remote tracker by default.**
No `gh issue create`, no API calls, no remote sync — ever — unless the human
explicitly asks in that turn. The default sink is always a local file. This is a
doctrine-level guarantee (ADR 0004), enforced like a gate, not a preference.

## Local issue file format

One issue per file: `.tgf/issues/{id}.md` with YAML front matter, where `{id}` is a
kebab-case slug (e.g. `add-afk-heartbeat-guard`).

```yaml
---
id: add-afk-heartbeat-guard      # kebab-case, matches filename
title: AFK heartbeat guard blocks idle runs
type: bug | feature | chore | slice
state: needs-triage              # vocabulary owned by triage-labels.md
afk: ready-for-agent | needs-human   # AFK/HITL readiness (see triage-labels.md)
acceptance:                      # falsifiable criteria; completion is evidence
  - run-gates proves afk_heartbeat_required blocks the no-heartbeat case
evidence:                        # links to proof, filled as work lands
  - .tgf/seeds/<id>/execution-ledger.jsonl#<row>
---
```

`type` values: `bug`, `feature`, `chore`, `slice`. `state` and the `afk`
readiness flag both draw their vocabulary from `triage-labels.md` — do not invent
new states here. **Completion is evidence, not prose** (CONTEXT.md): an issue
closes when its `evidence` links point at a passing validator, gate, playtest
report, or verdict — not when an agent says "done".

`scripts/validate-artifacts.mjs --check issues` enforces this format: every
`.tgf/issues/*.md` must have front matter with a kebab-case `id` matching its
filename, a `title`, a `type` from the set above, and `state` + `afk`. The check is
a no-op until `.tgf/issues/` exists, so the convention activates the moment the
borrowed skills first write a local issue.

## Tracer-bullet vertical slices

A `slice` is a **tracer-bullet vertical slice**: the thinnest end-to-end cut that
proves a path works, top to bottom, over breadth-first stubs. `to-issues` breaks a
plan into independently-grabbable slices, each disjoint in touch set (mirroring the
lane policy in `CONTEXT.md`) so they can be claimed without collision. Prefer one
runnable slice that produces real evidence over many horizontal stubs.

## Factory PRD vs per-seed GAME_THESIS.md

These are different artifacts and must not be conflated:

- **Factory PRD** — a *factory-level* plan (doctrine, tooling, harness, schema
  work) authored by `to-prd` and landed as a local markdown PRD under
  `.tgf/issues/` or `.scratch/`. It is about evolving the meta-factory itself.
- **Per-seed `GAME_THESIS.md`** — the compiled, schema-valid thesis for one game
  seed (P01 output under `.tgf/seeds/{seed-id}/`). A seed's planning output is the
  **thesis, never a generic PRD**. `to-prd` MUST NOT emit a PRD in place of a
  thesis, and MUST NOT overwrite a seed's `GAME_THESIS.md`.
