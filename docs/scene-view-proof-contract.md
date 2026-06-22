# Studio 3D scene-view proof contract

Task: `asha#3041`, extended by `asha#3043`

This document describes the Studio-owned `StudioSceneViewModel` proof contract in
`src/scene-view-model.ts`. It is intentionally a deterministic readback model for
agents and reviewers, not renderer implementation code.

## Purpose

`StudioSceneViewModel` defines the minimum browser scene-view evidence a future
3D renderer must be able to project and read back before ASHA Studio introduces
Three.js/WebGL code. It gives runner tasks a stable target for renderer work
without moving this draft schema across the ASHA Rust/TypeScript generated
contract border prematurely.

## Included fields

The model includes:

- `sceneId`, `sessionId`, and `scenarioId`;
- deterministic `viewport` dimensions (`1920x1080`) and pick coordinate space;
- `camera` pose, target, up vector, perspective projection fields, and projection
  hash;
- `interactionProof` with GUI/agent camera-tool actions, before/after camera
  hashes, active tool state, shared command timeline sequence IDs, and
  fail-closed stale-readback guards for camera, selection, and preview ghost
  mismatches;
- `renderables` with IDs, source-state classification, material refs, mesh refs,
  transforms, bounds, render hashes, visibility, and pickability (including
  selected voxel, editor-local preview ghost, and applied authority-state voxel);
- `selection` proof with selected voxel/object IDs, selected renderable, pick
  screen point, expected world point, pick-ray hash, canonical selection hash,
  and camera projection hash;
- `preview` proof with preview ghost ID, edit anchor, material ref, and explicit
  editor-local authority state;
- `expectedPickPoints` for deterministic picker-readback tests;
- `pickEvidence` with positive selected-target hit metadata, structured background
  no-hit evidence, viewport/camera hashes, selection/timeline cross-checks, and
  fail-closed stale guards for camera, projection, viewport, selection, and hit
  identity drift;
- `hashes` linking authority-before, authority-after, render-before,
  render-after, and the derived `sceneViewHash`;
- `futurePublicContractCandidates` for fields that may later graduate into
  generated ASHA contracts;
- `knownLimitations` preserving the boundary between browser projection evidence
  and ASHA authoritative runtime evidence.

## Source-state distinction

Every renderable declares one of three source states:

- `authoritative_rust_state` — derived from existing authoritative/editor evidence
  hashes in the Studio workspace model;
- `editor_preview_state` — projected preview ghost state that is not applied to
  authority until the typed `authority.voxel.apply_brush` command succeeds;
- `browser_projection_reference` — browser-side reference projection such as the
  model/material preview crate, not ASHA authority.

The hash linkage explicitly records:

`rust_authority_hashes_are_inputs_browser_projection_hashes_are_reference_outputs`

## Camera/tool interaction proof

Task `asha#3043` extends the model from static scene proof to deterministic
camera/tool interaction proof. The readout records a GUI-originated
`inspection.editor_state` frame-selected action, the existing agent-originated
`selection.voxel_from_screen_point` action, and the GUI-originated
`preview.voxel_brush` action in the same shared command timeline used by the rest
of Studio. `interactionProof.toolState` carries active tool and camera-before / camera-after
hashes; `staleReadbackGuard` requires the browser readback to match the camera,
canonical selection hash, selected renderable, and preview ghost or report `failed_closed`.

## Pick/hit-test evidence

Task `asha#3044` extends the readback with `viewport_pick_hit_test_evidence`.
The scene-view model stores the expected pick contract; the viewport readback then
builds the same Three.js scene/camera used by the browser host and runs
`THREE.Raycaster` against pickable renderables. The resulting evidence records the
selected target screen point, viewport dimensions/hash, camera pose/projection
hash, raycast hit renderable/voxel/face/normal/world point, and a structured
background no-hit proof. The browser readback cross-checks that pick evidence
still matches the selected target, selected-target inspector voxel, hierarchy
selected node, selection timeline command, canonical selection hash, current camera
hash, current viewport hash, and the selected face/edit-anchor relationship. Any
mismatch reports `failed_closed` rather than allowing stale pick evidence to
remain ready.

That distinction is the core non-claim: the scene-view model is a target proof
contract for future renderer work; it does not claim WASM/native runtime,
Agora/compositor, GPU, or performance evidence.

## Checked-in fixtures

- `fixtures/studio-scene-view.sample.json` — standalone scene-view readback.
- `fixtures/studio-agent-readout.sample.json` — embeds `sceneView` so agents can
  inspect it through the general readout path.

Regenerate with:

```bash
pnpm exec tsx scripts/generate-scene-view-fixture.ts
```

## Verification

- `pnpm run test`
- `pnpm run verify`
- `git diff --check`
