# VoxelForge Voxel Authoring Adaptation

Status: task #4499 implementation note.

Studio adapts selected VoxelForge agent affordances as bounded input adapters over Asha public command/session surfaces. The adapter does not expose VoxelForge MCP transport, raw method dispatch, private Studio state mutation, or a parallel voxel model.

| VoxelForge affordance | Asha Studio decision | Rationale |
| --- | --- | --- |
| `set_voxels` | Adapted as `submit_compact_voxel_edit` with `kind: "set_voxels"`. | Compiles caller voxels into generated `VoxelCommand` `setVoxel` entries and routes through `RuntimeSessionFacade.submitCommands`. |
| `set_voxels_runs` | Adapted as `submit_compact_voxel_edit` with `kind: "set_voxels_runs"`. | Preserves the token-efficient horizontal run shape while expanding to bounded `setVoxel` commands before authority submission. |
| `fill_box` | Adapted as `submit_compact_voxel_edit` with `kind: "fill_box"`. | Provides the first compact edit path for live testing; inclusive cuboids compile into generated `setVoxel` command batches. |
| `apply_voxel_primitives` | Adapted for block, box, and line primitives under the same compact edit cap. | Keeps primitive generation deterministic and local to proposal construction, then submits only generated Asha `VoxelCommand` values. |
| `get_model_info` | Deferred to existing `inspect` readout and runtime inspection surfaces. | Asha readback already reports runtime attach state, conversion status, evidence, and command counts; richer model statistics need an upstream readout if required. |
| `view_from_angle` | Deferred. | Studio has viewport/render evidence surfaces, but no public agent camera-capture command equivalent is part of this slice. Add an `asha-studio` task when live visual capture becomes required. |
| `new_model` | Rejected for the live runtime edit surface. | Asha separates stored ProjectBundle authoring from live RuntimeSession authority; replacing the active model belongs in workspace/project commands, not voxel edit proposals. |
| `publish_preview` | Deferred to Studio evidence/export flows. | Asha evidence is emitted through Studio proof/readout artifacts and runtime/session evidence; a VoxelForge-style preview file writer would be a separate bounded workspace export task. |

## Compact Edit Contract

The agent-facing operation is `submit_compact_voxel_edit`. It accepts VoxelForge-shaped compact edits, compiles them to a `CommandBatch` of generated `VoxelCommand` `setVoxel` entries, and reuses the existing `submit_voxel_edit` authority path.

Limits:

- Maximum generated commands: 64.
- Coordinate absolute limit: 1024.
- Palette/material index: integer `0..255`; `0` compiles to `{ kind: "empty" }`, non-zero values compile to `{ kind: "solid", material }`.
- All generated commands are preflighted before runtime submission.
- Oversized, malformed, or unsupported compact requests fail closed without mutating Studio state or runtime authority.

The direct `submit_voxel_edit` operation remains intentionally low-level and setVoxel-only. Compact operations are adapters that produce the same generated command contract rather than a second mutation API.
