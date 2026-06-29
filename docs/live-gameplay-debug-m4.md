# Studio Live Gameplay Debug M4 Proof Gate

Task: `asha#3732`

This milestone closes the first live gameplay debug surface for Studio. It
keeps the debug UI agent-observable and evidence-backed without turning Studio
into runtime authority or adding private command hatches.

## Scope

- Live session identity and freshness metadata: `pnpm run proof:live-debug-session-identity`
- Live scene/entity debug inspector: `pnpm run proof:live-scene-entity-debug-inspector`
- Live asset/resource debug inspector: `pnpm run proof:live-asset-resource-debug-inspector`
- Live runtime/telemetry debug inspector: `pnpm run proof:live-runtime-telemetry-debug-inspector`
- Bounded live debug command proposals: `pnpm run proof:live-debug-command-proposals`
- Milestone aggregate gate: `pnpm run proof:live-gameplay-debug-m4`

## Reviewer Artifact

`pnpm run proof:live-gameplay-debug-m4` regenerates:

`artifacts/live-gameplay-debug-m4/latest/index.json`

The aggregate artifact records child artifact paths and hashes, the attached
live session identity, scene/entity and asset/resource inspector hashes,
runtime telemetry counts, bounded command proposal action ids/statuses, negative
smokes, boundary check execution, and source artifact hash validation.

## Boundaries

The M4 debug surfaces are read-model and proof surfaces. They do not claim
Studio runtime authority, private runtime mutation, hardware GPU evidence,
performance evidence, publish readiness, or a private ECS/asset database.
Command proposals stay bounded to known `command.propose` actions and visible
accepted/rejected result evidence; there is no `call(methodName, json)` path or
UI-only mutation callback.
