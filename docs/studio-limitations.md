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
- Studio no longer reserves a permanent top strip for session fixtures and
  proof-oriented runtime rows. The top-bar **Runtime** menu groups the current
  session, workspace identity, public RuntimeSession controls, and the detailed
  gameplay inspector. Static proof-session inventories remain in tests and
  readouts rather than normal product chrome.
- `Basic Voxel Scenario` and `Placeholder Scenario` are temporary fixture
  switcher entries, not the unified scene-loading model. They remain explicitly
  labelled under Runtime for development compatibility; bounded scene open,
  save, and save-as live under **File** and will supersede this switcher.

## Visual Evidence

- Concrete rendering is engine-owned behind the public, backend-neutral
  `@asha/renderer-host` root. Studio has no direct renderer dependency and may
  not import a backend package or subpath.
- Studio owns interaction policy and renderer-neutral authored/overlay
  `RenderFrameDiff` content. It never receives backend scene objects, camera
  matrices, GPU resources, or disposal handles.
- Stored preview, current runtime projection, and editor/debug overlay are
  isolated host channels. Picks are disposable projection hints; runtime edits
  require Rust revalidation.
- Browser screenshots, layout markers, scene readbacks, visual deltas, and
  checked-in fixture proofs are useful reviewer evidence, but they do not claim
  native runtime execution, WASM authority, Agora compositor capture, hardware
  GPU behavior, or performance.
- Agora compositor capture is optional/deferred and environment-gated. It is not
  part of `pnpm run verify`.

## Voxel Conversion

- Voxel workflows are product-operable in the normal Studio workspace: bounded
  GLB import, conversion, scratch initialization/editing, model/window readback,
  explicit save/unload/load, and strict external-agent transcript replay all use
  public RuntimeSession operations. `globalThis.ashaStudioVoxelWorkflow` exposes
  a bounded product API without exposing the Store or RuntimeBridge.
- Human voxel workflows live under the top-bar **Voxel** menu and are grouped by
  use: Convert, Edit, Asset, Metadata, History, and Automation. The archived
  conversion proof shell, state cards, evidence rows, and raw diagnostic hashes
  are not part of the normal product layout. Viewport readback/probe overlays are
  also off by default and remain an explicit View-menu diagnostic aid.
- The Phase 4 voxel conversion proof artifacts remain fixture-backed successor
  evidence for Studio proposal/readout behavior, Asha-authored fixture goldens,
  deterministic receipts, and before/after comparison readouts.
- The native launch proof, `pnpm run evidence -- native-voxel-runtime-launch`,
  covers live Rust RuntimeSession source registration, static-mesh conversion,
  complete voxel-volume export, explicit save/load transactions, model-info
  readback, Asha-native `.avxl.json` artifact validation, and bounded compact
  voxel edit smoke through public Studio/runtime surfaces.
- Current voxel product and regression evidence do not claim hardware GPU evidence, conversion
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
- Renderer backend packages remain forbidden Studio dependencies. Studio has
  adopted the public `@asha/renderer-host` root and must request any missing
  realization capability upstream rather than creating a local backend.
