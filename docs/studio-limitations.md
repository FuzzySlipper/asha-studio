# ASHA Studio Limitations

This document keeps durable Studio limitations out of `package.json`. The
manifest points here, while `boundary-policy.json` remains the machine-readable
import and local-link policy.

## Boundary Truth

- Studio source may consume only ASHA package roots approved in
  `boundary-policy.json`.
- Do not import ASHA generated internals, package `src/**` paths, raw native or
  WASM transports, engine Rust paths, or freeform JSON command hatches.
- New ASHA capabilities should first land as public or unstable ASHA package
  surfaces, then be added to `boundary-policy.json`.

## Runtime Authority

- Browser/reference Studio state is projection evidence, not Rust authority.
- Native runtime authority remains fail-closed unless the runtime bridge
  compatibility metadata, public facade operations, selected-backend evidence,
  replay references, and negative smokes are present.
- Direct `@asha/native-bridge` and `@asha/wasm-replay-bridge` imports remain
  forbidden.
- WASM authority is still deferred until an equivalent public facade and
  readiness gate exist.

## Visual Evidence

- Three.js is a Studio renderer binding over public ASHA projection/contracts; it
  does not own authority and is not the engine public render contract.
- Browser screenshots, layout markers, scene readbacks, visual deltas, and
  checked-in fixture proofs are useful reviewer evidence, but they do not claim
  native runtime execution, WASM authority, Agora compositor capture, hardware
  GPU behavior, or performance.
- Agora compositor capture is optional/deferred and environment-gated. It is not
  part of `pnpm run verify`.

## Voxel Conversion

- The Phase 4 voxel conversion proof artifacts remain fixture-backed successor
  evidence for Studio proposal/readout behavior, Asha-authored fixture goldens,
  deterministic receipts, and before/after comparison readouts.
- The native launch proof, `pnpm run evidence -- native-voxel-runtime-launch`,
  covers live Rust RuntimeSession source registration, static-mesh conversion,
  model-info readback, and bounded compact voxel edit smoke through public
  Studio/runtime surfaces.
- Current voxel proof does not claim hardware GPU evidence, conversion
  performance, arbitrary mesh support, external art asset provenance, VoxelForge
  runtime/API dependency, `.vforge` compatibility, or a VoxelForge-style preview
  file writer.
- Detailed scope accounting lives in
  `docs/voxel-conversion-phase4-proof-posture.md` and
  `docs/voxelforge-voxel-authoring-adaptation.md`. The current agent runbook is
  `docs/voxel-live-testing-agent-runbook.md`.

## Proof Commands And Historical Names

- Runnable commands live in `package.json` scripts.
- Supported evidence generators are classified in
  `scripts/studio-evidence-catalog.json`; `scripts/proof-*.ts` files are not
  auto-discovered as supported Studio checks.
- `docs/script-reference-policy.json` records old proof command names that remain
  in historical docs as retired or deferred references.
- `pnpm run check:docs-scripts` fails when docs cite a missing command without
  that explicit status record.
- `pnpm run check:evidence-catalog` fails when a proof implementation file is
  uncategorized, points at a missing script, or duplicates another evidence
  entry.

## Deferred Public Surfaces

- `@asha/studio-evidence` remains deferred; Studio-owned proof/review artifact
  schemas are reference evidence until that package lands.
- `@asha/renderer-three` is still not a Studio source dependency. Studio uses
  its local Three.js binding unless the engine promotes a public renderer package
  and Studio explicitly adopts it through the boundary policy.
