# VoxelForge Voxel Authoring Adaptation

Status: task #4550 live-test comparison note.

Studio adapts selected VoxelForge agent affordances as bounded input adapters over Asha public command/session surfaces. The adapter does not expose VoxelForge MCP transport, raw method dispatch, private Studio state mutation, or a parallel voxel model.

| VoxelForge affordance | Asha Studio decision | Task #4550 proof status | Rationale |
| --- | --- | --- | --- |
| `set_voxels` | Adapted as `submit_compact_voxel_edit` with `kind: "set_voxels"`. | Supported and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records a two-command compact edit accepted by native `RuntimeSessionFacade.submitCommands`. | Compiles caller voxels into generated `VoxelCommand` `setVoxel` entries and routes through public runtime command submission. |
| `set_voxels_runs` | Adapted as `submit_compact_voxel_edit` with `kind: "set_voxels_runs"`. | Supported and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records a three-command horizontal run accepted by native authority. | Preserves the token-efficient horizontal run shape while expanding to bounded `setVoxel` commands before authority submission. |
| `fill_box` | Adapted as `submit_compact_voxel_edit` with `kind: "fill_box"`. | Supported and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records an accepted cuboid edit and an oversized cuboid rejected before runtime submission. | Inclusive cuboids compile into generated `setVoxel` command batches under the compact edit cap. |
| `apply_voxel_primitives` | Adapted for block, box, and line primitives under the same compact edit cap. | Supported and live-tested by `pnpm run evidence -- native-voxel-runtime-launch`; the proof records block and line primitives accepted by native authority after compilation. | Keeps primitive generation deterministic and local to proposal construction, then submits only generated Asha `VoxelCommand` values. |
| Static mesh conversion | Adapted through Studio voxel-conversion plan/preview/apply/export proposals. | Supported for the committed small synthetic static-mesh case in `pnpm run evidence -- native-voxel-runtime-launch`; readback records output voxel count, bounds, material rows, evidence refs, and session hash changes. | Conversion runs through public `RuntimeSessionFacade` operations backed by the native Rust bridge provider. |
| `get_model_info` | Deferred to existing `inspect` readout and runtime inspection surfaces. | Partially covered by the `inspect` operation and native launch artifact, which records attach state, conversion status, command counts, output voxel count/bounds, material mapping, evidence refs, and session hashes. Rich per-model statistics remain deferred. | Asha readback already reports the live authority signals needed for this proof; richer model statistics need an upstream readout if required. |
| `view_from_angle` | Deferred. | Not covered by #4550. | Studio has viewport/render evidence surfaces, but no public agent camera-capture command equivalent is part of this slice. Add an `asha-studio` task when live visual capture becomes required. |
| `new_model` | Rejected for the live runtime edit surface. | Rejected by design, not run as a live mutation. | Asha separates stored ProjectBundle authoring from live RuntimeSession authority; replacing the active model belongs in workspace/project commands, not voxel edit proposals. |
| `publish_preview` | Deferred to Studio evidence/export flows. | Deferred; #4550 records authority evidence artifacts, not a VoxelForge-style preview writer. | Asha evidence is emitted through Studio proof/readout artifacts and runtime/session evidence; a VoxelForge-style preview file writer would be a separate bounded workspace export task. |

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
- static mesh registration, conversion plan, preview, apply, and evidence export;
- readbacks for session hash changes, accepted/rejected command counts, output voxel count/bounds, material mapping, and evidence refs;
- accepted `set_voxels`, `set_voxels_runs`, `fill_box`, and `apply_voxel_primitives` compact edits;
- fail-closed missing/invalid provider paths, unsupported raw voxel edit op, invalid material runtime rejection, and oversized `fill_box` compact rejection.
