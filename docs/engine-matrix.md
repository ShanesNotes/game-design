# Engine / Profile Matrix

The factory chooses the cheapest surface for the spec's tracer-bullet slice to target and verify headlessly. Engine choice is reversible and must be recorded in `decisions/0001-engine-profile.md`. The "required proof" column lists downstream obligations carried by the spec — the proofs run in the co-dev repo, not in the factory.

| Profile | Use when | Avoid when | Required proof |
|---|---|---|---|
| raw Canvas + TS | 2D, deterministic, custom loop, maximal headless testability. | Need editor-native animation/scenes or serious 3D. | 60s Playwright bot + sim tests. |
| Phaser + TS | 2D arcade/action, collisions, tweens, input, fast juice. | Current docs/pin unavailable or agents emit stale Phaser 3 APIs. | Version pin + smoke + no deprecated API scan. |
| Kaplay / Excalibur | Tiny 2D tracer-slice exploration. | Long-term engine risk unprobed. | Harvest protocol + 60s smoke. |
| React + Canvas | UI-heavy management/card/town/strategy shell with Canvas game surface. | React starts owning 60fps simulation. | Sim core outside React + Playwright smoke. |
| Three.js / R3F | 3D is the fantasy: spatial reasoning, occlusion, terrain, vehicles, embodied camera. | 3D is decorative wow. | Programmer-art 3D slice passes anti-boring before shader/art pass. |
| Godot 4 | Scene tooling/export/presentation genuinely pays off. | Agents need opaque editor manipulation to proceed. | Headless launch + text `.tscn/.tres` resources + sim tests. |
| Bevy / sim-first Rust | Simulation is the game and ECS/determinism pays off. | Arcade slices or when compile tax kills iteration. | Headless sim/bot proof before renderer investment. |
| Multiplayer web | Other people are the fantasy. | Solo/hot-seat loop not fun-locked yet. | Solo/hot-seat fun-lock, then authoritative server prototype. |

## Reversal triggers

- Bot cannot drive the game reliably because of engine/editor constraints.
- Core loop needs capabilities the surface cannot provide.
- Agent time is spent fighting toolchain instead of testing fun.
- Debugging requires unrecorded GUI state.
- The fastest route to a better loop is a fresh fidelity-0 prototype elsewhere.
