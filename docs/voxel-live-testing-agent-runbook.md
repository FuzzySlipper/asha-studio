# Voxel Live Testing Agent Runbook

Status: current for tasks #4550, #4778, and #4779.

This runbook is the agent entry point for VoxelForge-ish voxel conversion and
compact-edit testing in Asha Studio. It is intentionally narrower than original
VoxelForge. VoxelForge is predecessor evidence; Asha Studio exercises public
Asha RuntimeSession and Studio workflow surfaces.

## Ownership Boundary

- `codex-asha-studio` owns Studio workflow/readout/proof surfaces in this repo.
- `codex-asha-engine` owns Rust authority, generated DTOs, RuntimeSessionFacade,
  native bridge, conversion service behavior, model-info authority, topology,
  quotas, and texture/UV sampling authority.
- Create new tasks in Den project `asha`; include `codex-asha-studio` or
  `codex-asha-engine` in the assignee and description.
- Do not patch `/home/dev/asha-engine` from this Studio task lane.

## Main Live Proof

Run from `/home/dev/asha-studio`:

```bash
pnpm run evidence -- native-voxel-runtime-launch
```

The command builds Studio, rebuilds the native Rust bridge addon, serves the
built app on `0.0.0.0`, injects a native Rust RuntimeBridge provider, attaches a
Rust RuntimeSession, and drives
`StudioWorkspaceStore.runAgentVoxelWorkflowOperation`.

Current ignored output:

- `artifacts/native-voxel-runtime-launch/latest/index.json`
- `artifacts/native-voxel-runtime-launch/latest/voxel-preview-publication.json`
- `artifacts/native-voxel-runtime-launch/latest/converted-voxel-volume.avxl.json`
- `artifacts/native-voxel-runtime-launch/latest/authored-voxel-volume.avxl.json`
- `artifacts/native-voxel-runtime-launch/latest/native-provider-dom.html`
- `artifacts/native-voxel-runtime-launch/latest/missing-provider-dom.html`
- `artifacts/native-voxel-runtime-launch/latest/invalid-provider-dom.html`

The latest #4778 proof artifact hash was
`sha256:856c455275730e52735a38a06ed72371b46d15975db5b22eeb89883528e0064c`.
This native proof output is regenerated/ignored evidence; record the current
hash in Den task packets rather than committing the `latest` native artifact.

## Expected Native Readbacks

The native proof should record:

- provider contract `asha_studio.native_runtime_bridge_provider.v1`;
- backend `native_rust`;
- `referenceFallback: false`;
- RuntimeSession attach state `attached`;
- conversion source registration through RuntimeSessionFacade;
- unsupported source registration rejected with `unsupported_source_asset`;
- plan, preview, apply, and export evidence refs;
- output voxel count `3`;
- output bounds `[0,0,0] to [7,7,0]`;
- material row slot `0` to voxel material `1`;
- model-info resident readback for `voxel/generated`;
- model-info material counts `material 1 -> 3 voxels`;
- missing model-info diagnostic `voxel_conversion_unavailable`;
- converted voxel asset persistence as `.avxl.json` with asset id
  `voxel-volume/generated`;
- authored command-batch voxel asset persistence as `.avxl.json` with asset id
  `voxel-volume/agent-authored-edit`;
- Rust `svc-voxel-asset` authority validation for both emitted `.avxl.json`
  files with no diagnostics and matching canonical/voxel-data hashes;
- reopen readbacks whose canonical hashes match the persisted voxel assets;
- accepted command counts changing from `0` to `11` after compact edits;
- rejected command count changing to `1` after invalid material edit smoke;
- fail-closed missing-provider and invalid-provider browser paths.

## Agent Workflow Operations

Use `runAgentVoxelWorkflowOperation`; do not call private store state, component
callbacks, raw RuntimeBridge methods, native bridge imports, or generated
contract internals.

| Operation | Status | Evidence posture |
| --- | --- | --- |
| `inspect` | supported | Agent surface/readout only. |
| `register_conversion_source` | supported | RuntimeSessionFacade source registration. |
| `configure_conversion` | supported | Studio settings patch for public conversion proposals. |
| `run_conversion` | supported | Plan, preview, apply, and evidence export command ids. |
| `get_model_info` | supported | RuntimeSessionFacade model-info readback. |
| `submit_voxel_edit` | supported | Low-level bounded `setVoxel` command batch. |
| `submit_compact_voxel_edit` | supported | VoxelForge-shaped compact adapter over generated `setVoxel` commands. |
| `view_from_angle` | projection-supported | Camera/readout evidence, not runtime authority or screenshot truth. |
| `publish_preview` | projection-supported | Bounded JSON evidence artifact, not `.vforge` output. |
| `persist_voxel_asset` | ProjectBundle asset proposal-supported | Emits Asha-native `.avxl.json` voxel-volume assets over public DTOs; the live proof validates emitted files with Rust `svc-voxel-asset` authority. |
| `reopen_voxel_asset` | ProjectBundle asset readback-supported | Reopens a supplied `VoxelVolumeAsset` DTO and verifies schema/media/id/hash round trip without mutating RuntimeSession authority. |

Compact edit affordances currently supported:

- `set_voxels`
- `set_voxels_runs`
- `fill_box`
- `apply_voxel_primitives` for block, box, and line primitives

Compact edit limits:

- maximum generated commands: `64`;
- coordinate absolute limit: `1024`;
- palette/material index: integer `0..255`;
- unsupported or oversized requests fail closed before runtime submission.

## Fixture-Backed Proof

Run:

```bash
pnpm run evidence -- voxel-conversion-phase4-product-proof
```

This is not live native Rust execution. It verifies deterministic
fixture-backed Studio proposal/readout behavior over Asha-authored fixtures.
Unlike the native proof, the Phase 4 `latest` artifacts are tracked
golden/current evidence and should be committed when intentionally refreshed:

- `artifacts/voxel-conversion-phase4-product-proof/latest/index.json`
- `artifacts/voxel-conversion-phase4-product-proof/latest/compare.json`
- `artifacts/voxel-conversion-phase4-product-proof/latest/compare.md`

## Normal Validation

For voxel workflow changes, run the focused test first:

```bash
pnpm exec tsx --test test/voxel-conversion-boundary.test.ts
```

For implementation changes, also run:

```bash
pnpm run evidence -- native-voxel-runtime-launch
pnpm run typecheck
pnpm run check:boundaries
pnpm run check:docs-scripts
pnpm run check:evidence-catalog
git diff --check
```

Use broader `pnpm run verify` only when the task needs the full Studio gate.

## Parity Table

| VoxelForge concept | Current Asha Studio posture |
| --- | --- |
| Compact voxel writes | Adapted through bounded `submit_compact_voxel_edit`. |
| Static mesh conversion | Adapted through RuntimeSessionFacade source registration and conversion proposals. |
| `get_model_info` | Adapted through RuntimeSessionFacade model-info readback. |
| `view_from_angle` | Adapted as projection-only camera/readout evidence. |
| `publish_preview` | Adapted as bounded JSON preview evidence. |
| `new_model` | Rejected for live runtime edit surface; belongs to stored ProjectBundle/workspace flows if needed. |
| `.vforge` save/load | Out of #4550 scope; no compatibility promise. |
| Asha-native serialized voxel storage | Adapted under #4817 as `.avxl.json` ProjectBundle/asset proposal and reopen workflow over public `VoxelVolumeAsset` DTOs, not `.vforge` inheritance. |
| VoxelForge MCP transport | Rejected for current successor shape; Asha/Studio already expose agent tools without carrying MCP. |
| C# sidecar/viewer/Electron packaging | Out of #4550 scope. |
| Region labels, frame-swap animation, spatial queries, texture tools | Out of #4550 scope; reexamine under Den task #4785. |

## File And Task Map

- `docs/voxelforge-voxel-authoring-adaptation.md`: parity decisions for the
  current adapted surface.
- `docs/voxel-conversion-phase4-proof-posture.md`: fixture-backed versus native
  proof posture.
- `docs/voxel-conversion-fixture-candidates.md`: fixture selection and
  predecessor-asset provenance notes.
- `docs/voxelforge-broader-feature-reexamination.md`: #4785 broader
  VoxelForge feature matrix and follow-up routing.
- `docs/studio-limitations.md`: durable non-claims.
- `scripts/proof-native-voxel-runtime-launch.ts`: live native proof.
- `scripts/proof-voxel-conversion-phase4-product.ts`: fixture-backed product
  proof.
- `test/voxel-conversion-boundary.test.ts`: boundary and parity regression
  coverage.
- Den #4785: broader VoxelForge feature reexamination outside #4550.

## Do Not

- Do not import `@asha/contracts/src/**` or generated contract internals.
- Do not import `@asha/native-bridge`, Rust crates, or private engine paths.
- Do not add raw JSON command hatches or method-name dispatch.
- Do not treat browser preview, screenshots, or Three.js buffers as authority.
- Do not claim `.vforge` compatibility.
- Do not copy VoxelForge art-derived assets without explicit source/provenance
  approval.
- Do not move upstream authority into Studio; create `codex-asha-engine` tasks
  for missing public RuntimeSession or Rust capability.
