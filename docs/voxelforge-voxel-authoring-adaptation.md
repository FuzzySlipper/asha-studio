# VoxelForge Voxel Authoring Adaptation

Status: task #4550 live-test comparison note.

Studio adapts selected VoxelForge agent affordances as bounded input adapters over Asha public command/session surfaces. The adapter does not expose VoxelForge MCP transport, raw method dispatch, private Studio state mutation, or a parallel voxel model.

| VoxelForge affordance | Asha Studio decision | Task #4550 proof status | Rationale |
| --- | --- | --- | --- |
| `set_voxels` | Adapted as `submit_compact_voxel_edit` with `kind: "set_voxels"`. | Supported and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records a two-command compact edit accepted by native `RuntimeSessionFacade.submitCommands`. | Compiles caller voxels into generated `VoxelCommand` `setVoxel` entries and routes through public runtime command submission. |
| `set_voxels_runs` | Adapted as `submit_compact_voxel_edit` with `kind: "set_voxels_runs"`. | Supported and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the current resident-chunk proof records a deduped two-command run accepted by native authority. | Preserves the token-efficient horizontal run shape while expanding to bounded `setVoxel` commands before authority submission. |
| `fill_box` | Adapted as `submit_compact_voxel_edit` with `kind: "fill_box"`. | Supported and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records an accepted cuboid edit and an oversized cuboid rejected before runtime submission. | Inclusive cuboids compile into generated `setVoxel` command batches under the compact edit cap. |
| `apply_voxel_primitives` | Adapted for block, box, and line primitives under the same compact edit cap. | Supported and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the current resident-chunk proof records deduped block and line primitive commands accepted by native authority after compilation. | Keeps primitive generation deterministic and local to proposal construction, then submits only generated Asha `VoxelCommand` values. |
| Static mesh conversion | Adapted through Studio voxel-conversion source registration plus plan/preview/apply/export proposals. | Supported for the committed small synthetic static-mesh case in `pnpm run evidence -- native-voxel-runtime-launch`; readback records facade source registration, output voxel count, bounds, material rows, evidence refs, and session hash changes. | Conversion runs through public `RuntimeSessionFacade` operations backed by the native Rust bridge provider. |
| Complete voxel-volume export | Adapted through `runAgentVoxelWorkflowOperation({ kind: "export_voxel_volume_asset" })` over public `RuntimeSessionFacade.exportVoxelVolumeAsset`. | Supported by #5061 and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records `voxel-volume/generated`, canonical JSON hash, voxel-data hash, validation diagnostics, and full asset payload posture. | Preview samples are not treated as complete assets; RuntimeSession authority produces the stored asset DTO. |
| Explicit voxel asset save | Adapted through `runAgentVoxelWorkflowOperation({ kind: "save_voxel_volume_asset" })` over public `RuntimeSessionFacade.saveVoxelVolumeAsset`. | Supported by #5062 and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records a create diff for `assets/voxels/generated.avxl.json`, expected hashes, next hashes, material/provenance counts, and full payload posture. | Runtime-to-stored promotion is explicit, diffed, and hash-checked; Studio does not silently mutate ProjectBundle data. |
| Saved voxel asset load | Adapted through `runAgentVoxelWorkflowOperation({ kind: "load_voxel_volume_asset" })` over public `RuntimeSessionFacade.loadVoxelVolumeAsset`. | Supported by #5063 and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records load success, resident model id, material counts, canonical/voxel-data hashes, session hash, replay hash, and validation diagnostics. | Stored Asha voxel assets are validated by engine authority before becoming live RuntimeSession state. |
| `get_model_info` | Adapted as `runAgentVoxelWorkflowOperation({ kind: "get_model_info" })` over public `RuntimeSessionFacade.readVoxelModelInfo`. | Supported by #4778 and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records resident model id, volume asset id, voxel count, material counts, source asset, evidence refs, diagnostics, and a missing-model fail-closed readback. | Studio does not infer per-model authority state locally; it relays Rust-owned RuntimeSession model-info readouts through the bounded agent workflow surface. |
| `view_from_angle` | Adapted as `runAgentVoxelWorkflowOperation({ kind: "view_from_angle" })` with bounded angle presets. | Supported by #4551 and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records the selected target, session/scene/readback markers, camera hash, viewport readback hash, capture hash, and projection-only non-claims. | Provides camera/readout evidence over Studio's viewport projection surfaces without screenshots, hardware GPU claims, VoxelForge viewer dependency, or runtime authority mutation. |
| `new_model` | Rejected for the live runtime edit surface. | Rejected by design, not run as a live mutation. | Asha separates stored ProjectBundle authoring from live RuntimeSession authority; replacing the active model belongs in workspace/project commands, not voxel edit proposals. |
| `publish_preview` | Adapted as `runAgentVoxelWorkflowOperation({ kind: "publish_preview" })` over existing Studio evidence/export flows. | Supported by #4552 and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof writes `artifacts/native-voxel-runtime-launch/latest/voxel-preview-publication.json` and records its hash from the main artifact. | Emits a bounded JSON evidence artifact with preview/readout refs and projection-vs-authority posture; it is not a `.vforge` file, arbitrary filesystem writer, browser screenshot, or hardware/GPU capture. |

## Compact Edit Contract

The agent-facing operation is `submit_compact_voxel_edit`. It accepts VoxelForge-shaped compact edits, compiles them to a `CommandBatch` of generated `VoxelCommand` `setVoxel` entries, and reuses the existing `submit_voxel_edit` authority path.

Limits:

- Maximum generated commands: 64.
- Coordinate absolute limit: 1024.
- Palette/material index: integer `0..255`; `0` compiles to `{ kind: "empty" }`, non-zero values compile to `{ kind: "solid", material }`.
- All generated commands are preflighted before runtime submission.
- Oversized, malformed, or unsupported compact requests fail closed without mutating Studio state or runtime authority.

The direct `submit_voxel_edit` operation remains intentionally low-level and setVoxel-only. Compact operations are adapters that produce the same generated command contract rather than a second mutation API.

## Task #4550 Evidence

Run:

```bash
pnpm run evidence -- native-voxel-runtime-launch
```

The live proof builds Studio, rebuilds the native Rust bridge addon, serves the built app with the native provider prelude, and drives the public `StudioWorkspaceStore.runAgentVoxelWorkflowOperation` surface from the browser. The generated live artifact is ignored output at `artifacts/native-voxel-runtime-launch/latest/index.json`; the task handoff should record its `artifactHash`.

The proof covers:

- native RuntimeSession attach without reference/mock fallback;
- static mesh registration through RuntimeSessionFacade, conversion plan, preview, apply, and evidence export;
- complete converted voxel-volume export through `export_voxel_volume_asset`;
- explicit ProjectBundle save transaction through `save_voxel_volume_asset`;
- validated saved-asset load through `load_voxel_volume_asset`;
- `get_model_info` resident and missing-model RuntimeSession readbacks;
- `view_from_angle` isometric camera/readout capture for the selected voxel target;
- `publish_preview` bounded preview publication artifact;
- readbacks for session hash changes, accepted/rejected command counts, output voxel count/bounds, material mapping, and evidence refs;
- accepted `set_voxels`, `set_voxels_runs`, `fill_box`, and `apply_voxel_primitives` compact edits;
- fail-closed missing/invalid provider paths, unsupported raw voxel edit op, invalid material runtime rejection, and oversized `fill_box` compact rejection.
