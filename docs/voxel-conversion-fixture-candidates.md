# Voxel Conversion Fixture Candidates

Task: #4313
Date: 2026-07-07

This note records the Phase 4 fixture selection for Asha Studio voxel
conversion proof work. VoxelForge is predecessor evidence only: it can inform
coverage, edge cases, and review expectations, but Phase 4 should not introduce
`.vforge` compatibility requirements, VoxelForge runtime dependencies, or
copied predecessor art assets into Asha Studio.

## Selection Posture

- Prefer small Asha-native synthetic sources for committed fixtures and goldens.
- Use VoxelForge artifacts as behavioral references and rejected/deferred
  provenance notes.
- Keep browser preview proof as projection/readback evidence only; Rust runtime
  conversion authority remains tracked separately.
- Do not copy external-looking art-derived assets unless their source and asset
  license are explicit enough for redistribution.

The predecessor repo is MIT-licensed, but the reviewed art candidates include
external-looking source paths such as
`../../../../stash/models/old/AM Golem/GOLEM.FBX` and texture overrides. That
is not enough asset provenance for public Asha fixtures, even when the
VoxelForge repository itself is usable as reference material.

## Selected Phase 4 Fixture Set

These fixtures should be authored in Asha Studio, not copied from VoxelForge.

| Fixture | Purpose | License/source posture |
| --- | --- | --- |
| `synthetic_quad_surface_shell` | Proves surface-shell conversion from a tiny quad/two-triangle mesh, including bounds and occupied voxel diagnostics. | New Asha-authored fixture under this repo's license. |
| `synthetic_colored_cube_solid` | Proves solid conversion for a closed mesh with deterministic voxel counts and bounds. | New Asha-authored fixture under this repo's license. |
| `synthetic_two_material_slots` | Proves material-slot to voxel/material mapping without depending on external textures. | New Asha-authored fixture under this repo's license. |
| `synthetic_transform_fit` | Proves transform/fit handling for scale, offset, centered bounds, and output diagnostics. | New Asha-authored fixture under this repo's license. |
| `bad_source_unsupported` | Proves classified rejection for unsupported or malformed source data. | New Asha-authored negative fixture. |
| `oversized_output_rejection` | Proves fail-closed output limit handling, preferably `output_limit_exceeded` or the current public equivalent. | New Asha-authored negative fixture. |
| `stale_source_hash_rejection` | Proves apply-time rejection when a preview/apply pair no longer matches the source hash. | New Asha-authored negative fixture. |

This set covers the Phase 4 target surface shell, solid conversion, material
mapping, transform/fit, bad source, and oversized rejection cases while keeping
the initial proof independent of asset provenance review.

## VoxelForge Reference Candidates

| Candidate | Useful lesson | Phase 4 decision |
| --- | --- | --- |
| `content/mcp/am-golem-textured-32h-surface-preview.vforge` | Surface-shell style output; preview manifest reports 992 voxels. | Reference only. Do not copy until AM Golem source and texture rights are explicit. |
| `content/mcp/am-golem-textured-64h-solid.vforge` | Textured solid conversion and material behavior. | Reference only. Large art-derived output; use synthetic material fixture instead. |
| `content/mcp/am-golem-normalrock-64h-solid.vforge` | High-volume solid conversion; preview manifest reports 83,665 voxels. | Reference only. Too large for first committed proof and tied to unclear source asset provenance. |
| `content/mcp/am-golem-normal-rock-64h.refmeta` | Transform, scale, texture override, and fit settings. | Reference only. Metadata points to stash-hosted FBX and texture paths outside the repo. |
| `content/mcp/imports/Watcher.glb` | Real glTF import path and transform/fit lesson. | Deferred. Binary art asset provenance is not explicit enough for copying. |
| `content/mcp/oh-watcher-fbx2gltf-scale10-r64*.vforge` | Watcher scale and resolution tuning. | Reference only. Use synthetic transform fixture instead. |
| `content/mcp/oh-watcher-fit-task1629-final.vforge` | Fit/suggested-scale behavior. | Reference only. Covered by synthetic transform/fit fixture. |
| `content/mcp/oh-watcher-conversion-test.vforge` | Tiny predecessor voxel output smoke. | Reference only. It proves VoxelForge output shape, not the Asha conversion source contract. |
| `content/mcp/task1603-live-smoke-voxelized.vforge` | Minimal voxelized smoke output. | Reference only for expected compact proof size. |
| `content/mcp/task1632-post-merge-smoke.vforge` | Post-merge viewer/preview smoke output. | Reference only for regression scale and diagnostics shape. |

## Rejected Or Deferred Candidates

- Direct `.vforge` compatibility fixtures: rejected for Phase 4. Asha should not
  inherit VoxelForge's file format as an input contract.
- Direct AM Golem fixture copies: deferred until the FBX, textures, and any
  generated derivatives have explicit redistribution posture.
- Direct Watcher GLB fixture copies: deferred until the binary model provenance
  and license are explicit.
- Large art-derived voxel outputs: rejected for the first proof because they add
  review cost without proving more than the synthetic solid/material cases.
- Region labels, frame-swap animation, and editor-authority examples: deferred
  because Phase 4 is scoped to voxel conversion proof, not the broader
  VoxelForge authoring model.

## Handoff To Phase 4.2

Phase 4.2 should create the selected Asha-native synthetic fixtures and goldens,
then cite the VoxelForge files above only as predecessor evidence. The fixture
implementation should preserve the current Asha authority boundary: Studio
preview/readback may demonstrate projected conversion state, while native Rust
conversion authority remains blocked until the upstream runtime session work is
available.
