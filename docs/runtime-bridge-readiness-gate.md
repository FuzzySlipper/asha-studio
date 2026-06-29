# Studio runtime bridge readiness gate

Task: `asha#3047`

This gate defines what must be true before ASHA Studio may claim authoritative
runtime evidence beside its browser-reference `StudioSceneViewModel` / Three.js
projection state. It is a readiness contract for the narrow runtime facade path,
not permission to import raw transports or make browser projection authoritative.

## Current status

Current Studio keeps browser/reference projection evidence separate from the V2
selected-backend runtime-authority proof path:

- `@asha/contracts`, `@asha/command-registry`, `@asha/editor-tools`, and
  `@asha/runtime-bridge` are approved ASHA package roots in Studio source.
- `@asha/runtime-bridge` is approved only as the public facade package root for
  selected-backend/native proof paths.
- `native` runtime mode is enabled/ready only when Studio records
  `runtime-bridge.v0` metadata, backend proof refs, accepted/rejected command
  evidence, and satisfies the proof obligations in this gate.
- `wasm` remains fail-closed until a future task proves an equivalent public
  facade path and metadata.
- `@asha/native-bridge` and `@asha/wasm-replay-bridge` remain forbidden Studio
  imports.
- Browser/Three.js evidence is useful projection/readback proof, not runtime
  authority by itself, Agora compositor capture, hardware GPU evidence, or
  performance evidence.

The machine-readable Studio-side gate lives in
`src/runtime-bridge-readiness.ts` and can be inspected with
`evaluateRuntimeBridgeReadinessGate(...)`. The matching Den document handle is
`asha/asha-studio-runtime-bridge-readiness-gate`.

## Required compatibility surface

Before Studio can claim runtime authority, it must record all of the following in
session/readout/proof artifacts:

| Surface | Required marker | Required package version | Notes |
|---|---:|---:|---|
| `@asha/contracts` | `contracts.v0` | `0.1.0` | Generated semantic DTO/type border. Import root only. |
| `@asha/command-registry` | `command-registry.v0` | `0.1.0` | Public command identity/catalog surface. Import root only. |
| `@asha/runtime-bridge` | `runtime-bridge.v0` | `0.1.0` | Public runtime facade for the narrow post-`asha#3220` authority path. Import root only. |

`@asha/native-bridge` and `@asha/wasm-replay-bridge` remain forbidden Studio
imports. Runtime/native/replay details must be hidden behind the
`@asha/runtime-bridge` facade.

## Required public DTOs

The runtime integration path must provide or identify public DTOs for:

1. runtime bridge compatibility metadata (`runtime-bridge.v0`);
2. authoritative scene snapshots: object ids, transforms, material refs,
   selection, and authority hashes;
3. typed command application results: accepted/rejected effects, diagnostics,
   correlation ids, and before/after authority hashes;
4. replay/golden records: command sequence provenance and snapshot replay
   evidence without direct Studio import of replay transports;
5. render/readback evidence: camera state, render hashes, pick evidence, visual
   proof artifact refs, and runtime snapshot ids;
6. classified runtime bridge errors such as `native_unavailable`,
   `operation_unimplemented`, `incompatible_surface`, `stale_snapshot`, and
   `replay_mismatch`.

These DTOs must be consumed through `@asha/contracts` and/or the
`@asha/runtime-bridge` package root only. No generated file paths, package
`src/**` paths, raw transports, engine Rust paths, or arbitrary JSON hatches are
allowed.

## Required facade operations

The runtime integration path must prove the public facade supports bounded, typed
operations for:

- starting or attaching to an authoritative runtime session;
- reading an authoritative scene snapshot;
- applying a typed public command;
- exporting a replay/golden record for the command sequence;
- reading render evidence that can be linked to runtime snapshot ids.

The operation vocabulary should come from the runtime bridge manifest/facade and
must not be invented as `call(methodName, json)` or an untyped request/response
blob inside Studio.

## Required proof updates

When Studio claims runtime authority, proof artifacts must distinguish browser
projection from runtime authority:

- session metadata records `runtimeBridgeVersion: "runtime-bridge.v0"`, the
  runtime mode, ASHA commit, package versions, and operation/facade evidence;
- command timeline rows link public command ids to runtime session id, snapshot
  ids, replay record ids, and before/after authority hashes;
- `studio_visual_capability_proof` gains a runtime-authority capability group
  that complements existing scene/camera/pick/visual-delta/browser/layout groups;
- negative smokes cover missing runtime bridge metadata, mismatched
  `runtime-bridge.v0`, missing operation, stale snapshot, replay mismatch, and
  raw transport import attempts;
- browser/Three.js projection evidence remains labeled projection-only unless it
  is backed by authoritative runtime snapshot and replay/readback evidence.

## Fail-closed diagnostics

`evaluateRuntimeBridgeReadinessGate(...)` emits these readiness-specific
diagnostics in addition to the existing compatibility diagnostics:

- `asha.runtime_bridge_readiness.deferred_for_reference_mode` — warning for
  current mock/reference workflows; runtime authority is deferred but non-blocking.
- `asha.runtime_bridge_readiness.runtime_bridge_absent` — error when `native` or
  `wasm` is requested without a runtime bridge compatibility marker.
- `asha.runtime_bridge_readiness.runtime_bridge_mismatch` — error when Studio
  records a runtime bridge marker other than `runtime-bridge.v0`.
- `asha.runtime_bridge_readiness.runtime_mode_not_enabled` — error when a runtime
  mode is requested before `supportedRuntimeModes` includes it.

The gate status is:

- `deferred` for current reference/mock workflows with no runtime authority claim;
- `failed_closed` for absent/mismatched runtime bridge surfaces or unsupported
  runtime modes;
- `ready` only when `runtimeBridgeVersion === "runtime-bridge.v0"`, the requested
  runtime mode is enabled, and compatibility diagnostics contain no errors.

## Checklist for runtime-integration tasks

1. Keep `@asha/runtime-bridge` as the approved Studio package root in
   `boundary-policy.json` and `package.json` only while the public facade reports
   `runtime-bridge.v0`.
2. Record `contracts.v0`, `command-registry.v0`, `runtime-bridge.v0`, ASHA commit,
   and package versions in session/readout artifacts.
3. Consume scene snapshots, command application results, replay records,
   render/readback evidence, and `RuntimeBridgeError` only from public package
   roots.
4. Update visual capability proof/readback with a runtime-authority group and the
   runtime negative smokes listed above.
5. Keep browser/Three.js projection and visual-contract evidence as
   complementary proof channels, not substitutes for runtime authority evidence.

## Verification

```bash
pnpm exec tsc --noEmit && pnpm exec tsx --test test/compatibility.test.ts test/runtime-bridge-readiness.test.ts
pnpm run verify
git diff --check
```
