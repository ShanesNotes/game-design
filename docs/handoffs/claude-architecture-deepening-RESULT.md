# Architecture Deepening — Result

Branch: `deepen-architecture` (off `main`). `npm run verify` green throughout; one
verify-green commit per slice. All six findings from
`claude-architecture-deepening.md` plus an adversarially-verified `/improve-codebase-
architecture` pass were addressed. **ADR 0004 is untouched (still Proposed)** — its
ratification is the one decision left to the owner.

## What changed, by finding

| Finding | Outcome |
|---|---|
| 1. Run-state module | `scripts/lib/run-state.mjs` — paths, owned files, manifest/ledger read + schema validation, path policy, symlink guard, **phase state machine** (legal transitions from doctrine + phase-gated artifact rules). `init-game-run`/`summarize-run`/`validate-artifacts` route through it. |
| 2. Factory-contract registry | `scripts/lib/factory-contract.mjs` — one source for phases/skills/schemas/hooks/fixtures/thresholds; validators + tests import it; `run-gates` proves every registered guard has a scenario. |
| 3. Guard-policy module | `hooks/lib/guard.mjs` — shared zero-import plumbing; 7 hooks now carry only their rule (14 scenarios still green = behavior preserved). |
| 4. Toolchain module | Probes are self-describing (`{cmd,args,category}`); the generated ledger renders grouped. Kept in place (single consumer — no premature extraction). |
| 5. Skill-wrapper pack | `docs/agents/skill-wrapper-doctrine.md` — the shared contract every wrapper inherits, so wrappers stay shallow-by-design. |
| 6. Local issue validation | `validate-artifacts --check issues` — structural check of `.tgf/issues/*.md` per `issue-tracker.md`; no-op until the dir exists. |

## `/improve-codebase-architecture` items (workflow-verified)

- **LEV-001 (HIGH):** `init-game-run` no longer records `verification.status:"passed"`
  for a run-check it never ran — now honest `"not-run"` ("completion is evidence").
- **mcp_mutation_must_emit_text, no_content_before_fun_lock, minimum_bot_session_gate,
  two_bot_spread_gate:** four config-declared-but-unenforced guards now ship as
  executables (11 guards, 31 scenarios).
- **Anti-boring gate consistency checker (OP-003):** `--check gate` rejects
  self-contradicting artifacts; see ADR 0005.
- **Phase state machine + phase-gated artifacts (O1/O3), question budget (OP-002),
  deepen cap (OC-003):** manifest/ledger self-consistency, enforced by `--check run`.
- **LEV-002:** `additionalProperties:false` on all 8 schemas. **dx-verify-ci-2/3/4:**
  expanded gate coverage, lint `.codex/skills`, crash-safe summarize.
- **OC-001/OC-002:** P00-is-a-router fix; bakeoff→fun-lock transition ownership.

## Architect overrides (judgment applied over raw verdicts)

- **Rejected** `OPP-MANIFEST-ARTIFACT-PATH-VALIDATION` and `OPP-LEDGER-PATH-VALIDATION`
  (verified IMPLEMENT, but wrong): they would forbid `.tgf`/`/home/ark/` tokens
  *inside* the manifest/ledger — which are factory **run-state**, required to contain
  those paths (`seed_path`, `execution_ledger_path`, `default_child_game_root`).
  Applying them would break verify. This is the same flaw the pass used to correctly
  reject `OPP-RESUME-POINT`; the pass was internally inconsistent here.
- **Declined as speculative:** `OP-005` (playtime/codegen-ratio gate — mechanizes a
  soft principle into a brittle metric), `skill_null` hook (vague). `dx-verify-ci-5`
  (CI/CD) is out of scope (local-first, no credentials).
- **Deferred the implementation approach, kept the goal:** the phase-transition
  "matrix" was deferred as a `previous_phase` manifest field (would duplicate the
  ledger's authority); implemented instead by validating the **ledger's** phase
  sequence. The depth-minimum schema-encoding (OP-001) was deferred in favor of the
  checker (ADR 0005).

## Why this increases Depth (Ousterhout sense)

A run-state bug, a contract change, or a guard rule now has **one home** behind a
small interface, instead of being re-derived across three scripts, two test files,
and the config. The gate, the phase machine, and the guards moved from prose
assertions to mechanical checks, so the factory now **enforces its own doctrine**
rather than merely asserting it.

## Verification

```
npm run verify     # lint 25/25 + validate-artifacts (7 checks) + run-gates (31, 11 guards) + tests 33
```

All green. No child game repo, no `/home/ark/tgf-games`, no engine scaffolded; source
repos untouched; zero new dependencies.

## Remaining risks / deferred

- ADR 0004 unratified (owner decision; nothing else blocks on it).
- `deepen-apply` wrapper deferred until a real run needs it (only the
  `deepen_attempt_count` invariant ships now).
- `--check issues`/`--check gate --file` and the phase-transition/question/deepen
  guards are inert until runs/issues exist; unit-tested with synthetic data.
- The toolchain ledger's generated block is machine-specific; re-probe per machine.
