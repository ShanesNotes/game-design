# Toolchain Verification Ledger

This ledger is the truth source for what agents may assume.

Legend:
- `ACCEPT`: safe to use if installed.
- `ACCEPT_IF_INSTALLED`: safe to use when installed; never assume presence on a new machine.
- `ACCEPT_IF_AVAILABLE`: use when available; absence must not block the core loop.
- `ACCEPT_AFTER_PIN`: candidate only after a version probe/pin.
- `ACCEPT_FOR_EXPLORATION`: exploration and capture only, never the default runner.
- `PROBE`: must run the local probe or current-doc harvest before use.
- `OFF_BY_DEFAULT`: useful only after a gate unlocks it.

| Surface | Status | What agents may assume | Probe / guard |
|---|---:|---|---|
| Claude Code `CLAUDE.md`, Skills, Subagents, Agent Teams, Hooks, Plugins, MCP | ACCEPT | Use as orchestration substrate when present. | Run `claude --version`; check docs if command names differ. |
| Claude Code Plugin packaging | ACCEPT | Factory can be packaged as skills + hooks + subagents + MCP config. | Local install must succeed before relying on plugin names. |
| Codex `AGENTS.md`, Skills, Plugins, Subagents, Hooks, MCP | ACCEPT | Use `AGENTS.md`; invoke skills explicitly. | Codex subagents should be explicitly requested; do not assume silent parallelism. |
| OMX `$autopilot`, `$ralplan`, `$ultragoal`, `$ultraqa` | ACCEPT_IF_INSTALLED | Use as acceleration layer for Codex; not required for factory. | `omx doctor`; `omx exec` smoke. |
| Grok Build | PROBE | Optional third lane; useful competitor if account/provisioning exists. | `grok-build --version`; verify headless `-p`, worktrees, and any Arena-like scoring locally. |
| Grok Build “Arena Mode” | PROBE | Do not depend on it for selection. | If present, feed gameplay falsifier results, never code taste alone. |
| Phaser 4.1+ | ACCEPT_AFTER_PIN | Candidate 2D engine; avoid Phaser 3 APIs. | `npm view phaser version`; scaffold with current official tool. |
| Three.js r184+ | ACCEPT_AFTER_PIN | Candidate when 3D is intrinsic. | `npm view three version`; verify browser support for target. |
| Godot 4.6.3+ | ACCEPT_AFTER_PIN | Candidate when engine scene/export tooling pays off. | `godot --headless`; require `.tscn` / `.tres` text resources. |
| Bevy 0.18+ | ACCEPT_AFTER_PIN | Candidate only when sim is the game. | `cargo search bevy`; expect Rust tax. |
| Kaplay / Excalibur | PROBE | Potentially faster 2D slices. | Harvest protocol before dependency. |
| Playwright CLI | ACCEPT | Default committed browser harness. | `npx playwright --version`; install browser. |
| Playwright MCP | ACCEPT_FOR_EXPLORATION | Explore browser and generate scripts. | Do not use as nightly runner by default. |
| Chrome DevTools MCP | ACCEPT_IF_AVAILABLE | Perf traces, screenshots, network/console. | Chromium-only; do not block core loop if absent. |
| Godot MCP (godot-runtime) | ACCEPT_IF_AVAILABLE | Headless scene ops, autoloads, screenshots, input simulation, runtime scripts — locally verified 2026-07 on a sibling Godot project. | Only on Godot lane; mutations must emit diffable text; re-probe per machine. |
| Engine skill suites (e.g. godot-prompter: 40+ Godot 4.x skills + specialist agents) | ACCEPT_IF_INSTALLED | Deep per-engine craft guidance for the co-dev agent; counts as agent-tooling evidence at P02. | Check the host's skill listing; never assume a suite exists on a new machine. |
| Blender MCP | OFF_BY_DEFAULT | Asset scout/rung-3 only. | Must export glTF + commit prompt/script. |
| Meshy/Tripo/Rodin style 3D gen | OFF_BY_DEFAULT | Asset rung-3 only unless used as low-poly greybox after gate. | Asset-provenance required. |
| Ludo.ai style game-concept gen | PROBE | Optional ideation/reference scan at seed or thesis time; never a substitute for the depth gate or feel targets. | Account required; outputs are references, not evidence. |
| AI audio/image assets | OFF_BY_DEFAULT | No opaque assets before G1+G2. | Asset-provenance required. |

## Harvest protocol

Before promoting any `PROBE` item:

1. Clone/install in a clean temp directory.
2. Run one documented command.
3. Identify the primitive to borrow.
4. Build a tiny adapter inside the factory.
5. Run a 60s smoke or equivalent.
6. Append result to `docs/borrowed-patterns.md`.
7. Only then add it to `factory.config.toml`.

<!-- TGF:PROBE:START -->

## Local probe results (generated)

_Probed 2026-07-20T01:07:05.255Z by `scripts/verify-local-tools.mjs`; generated — do not hand-edit._

| Category | Probe | Available | First line |
|---|---|---|---|
| base | `node --version` | yes | v22.23.1 |
| base | `npm --version` | yes | 11.13.0 |
| base | `pnpm --version` | yes | 10.33.0 |
| base | `git --version` | yes | git version 2.43.0 |
| builder | `claude --version` | yes | 2.1.215 (Claude Code) |
| builder | `codex --version` | yes | codex-cli 0.144.6 |
| builder | `omx --version` | yes | oh-my-codex v0.18.15 |
| builder | `grok-build --version` | no (PROBE) |  |
| harness | `npx playwright --version` | yes | Version 1.61.1 |
| engine | `godot --version` | yes | 4.7.stable.official.5b4e0cb0f |
| engine | `godot4 --version` | no (PROBE) |  |
| engine | `cargo --version` | yes | cargo 1.95.0 (f2d3ce0bd 2026-03-21) |

<!-- TGF:PROBE:END -->
