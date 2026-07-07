# Voxel Conversion Phase 4 Proof Posture

Task: #4317
Date: 2026-07-07

This note closes the Phase 4 successor proof posture for Asha Studio voxel
conversion. It explains what the archived Phase 4 fixture proof demonstrates,
what remains projection-only, and which VoxelForge concepts were adapted without
inheriting the predecessor runtime or file format.

## Proven

- Fixture selection is documented in
  `docs/voxel-conversion-fixture-candidates.md`.
- Asha-authored conversion fixtures live in
  `fixtures/voxel-conversion/phase4-cases.json`.
- The golden summary in
  `test/fixtures/studio-voxel-conversion-phase4-cases.golden.json` proves the
  selected fixtures through the Studio voxel conversion workspace/readout
  helpers.
- The reproducible product proof command is
  `pnpm run evidence -- voxel-conversion-phase4-product-proof`.
- The product proof artifact is
  `artifacts/voxel-conversion-phase4-product-proof/latest/index.json`.
- The before/after comparison artifacts are
  `artifacts/voxel-conversion-phase4-product-proof/latest/compare.json` and
  `artifacts/voxel-conversion-phase4-product-proof/latest/compare.md`.

The proof demonstrates an Asha-native plan, preview, apply, and evidence-export
flow for the `synthetic_colored_cube_solid` fixture. It captures source
identity/hash, settings, material map, authority version, plan hash, preview
hash, receipt output hash, output voxel count, output bounds, diagnostics,
evidence refs, and a stale-source negative smoke.

Task #4550 adds the follow-on live native proof command:
`pnpm run evidence -- native-voxel-runtime-launch`. That proof builds Studio,
rebuilds the native Rust addon, attaches a native Rust `RuntimeSession`, runs a
small static-mesh conversion, submits VoxelForge-shaped compact voxel edits, and
records live readbacks in ignored output at
`artifacts/native-voxel-runtime-launch/latest/index.json`.

## Fixture-Backed Or Projection-Only

- The Phase 4 product proof is fixture-backed authority evidence. It verifies Studio
  command proposal/readout behavior over public Asha contracts and runtime
  facade method requirements, but it does not claim live Rust voxelization.
- The #4550 native launch proof now covers the small live Rust static-mesh
  conversion and compact edit smoke. It does not retroactively change the
  committed Phase 4 fixture artifact's non-claims.
- Browser/Three preview remains display/readback evidence only. The Phase 4
  comparison uses fixture sample voxels and receipt metadata, not hardware GPU
  capture, performance evidence, or browser-rendered truth.
- Neither proof claims production readiness for arbitrary meshes, external art
  assets, high-volume conversions, texture sampling, or conversion performance.

## VoxelForge Lessons Preserved

- Separate surface-shell and solid conversion cases.
- Explicit material-slot to voxel-material mapping.
- Transform/fit coverage for scale, offset, centered bounds, and target origin.
- Bounded output limits with `output_limit_exceeded`-style fail-closed behavior.
- Typed diagnostics for unsupported sources, invalid material maps, stale source
  hashes, and stale preview/apply guards.
- Plan/preview/apply/evidence refs tied together with hashes and deterministic
  receipts.

## VoxelForge Structure Not Inherited

- No `.vforge` compatibility promise.
- No VoxelForge runtime, MCP API, C# sidecar, bridge protocol, or viewer
  dependency.
- No copied AM Golem, Watcher, or other predecessor art-derived assets.
- No predecessor editor authority model, region-label system, frame-swap
  animation path, or file watcher workflow.

VoxelForge remains predecessor evidence only. The committed Phase 4 fixtures and
artifacts are Asha-authored successor proof data.

## Deferred Work

- Add external asset fixtures only after source provenance and redistribution
  posture are explicit.
- Add production-grade conversion coverage for larger meshes, ambiguous solids,
  non-manifold geometry, texture sampling, and performance limits.
- Add browser visual capture only as labeled projection evidence, not authority
  truth.
- Promote any new required Asha capability through public package surfaces
  before Studio consumes it.

## Closeout Statement

Phase 4 now proves the successor workflow shape and review evidence contract
without relying on VoxelForge runtime APIs or implying `.vforge` product
compatibility. Treat the Phase 4 artifact as deterministic fixture-backed
evidence, and use the #4550 native launch artifact when the question is live
Rust runtime conversion/edit authority.
