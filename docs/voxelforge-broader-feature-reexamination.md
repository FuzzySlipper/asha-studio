# VoxelForge Broader Feature Reexamination

Status: Den task #4785 planning record.

This note inventories VoxelForge features that were deliberately outside the
#4550 Asha Studio voxel conversion and compact-edit proof slice. VoxelForge is
predecessor evidence, not a shape to preserve. Asha should carry forward only
features that have a clear Asha-native reason, fit the ProjectBundle,
RuntimeSession, and projection taxonomy, and can be exposed through public Asha
surfaces.

## Current Baseline

#4550 and its completed child tasks cover live agent testing for:

- compact voxel edits through `submit_compact_voxel_edit`;
- static mesh conversion through RuntimeSessionFacade source registration,
  conversion plan/preview/apply, and evidence export;
- model-info readback through Rust-owned RuntimeSession model info;
- projection-only view readbacks and bounded preview publication artifacts.

That slice intentionally rejects VoxelForge MCP transport, raw method dispatch,
private generated-contract imports, `.vforge` compatibility claims, C# sidecar
packaging, and browser screenshot authority.

## Product Decision From #4785

Asha does need a serialized voxel storage format for creations, edits, and
converted voxel volumes. It does not need to be `.vforge`, and there is no
current import-compatibility promise for VoxelForge project files.

Recommended direction:

- define an Asha-native, versioned voxel volume asset format owned upstream by
  `codex-asha-engine`;
- treat `.voxel` only as a product-facing placeholder name until the engine
  task chooses the final file extension and media type;
- store it as durable ProjectBundle asset/catalog content, not live
  RuntimeSession authority;
- require Rust-side validation, canonical hashing, diagnostics, and generated
  public DTO/facade surfaces before Studio writes or reads it;
- make Studio persistence an explicit authoring/runtime-to-stored workflow over
  the public format, never a silent promotion from live SessionState.

The old VoxelForge serializer is useful only as field inventory. It stored a
versioned JSON project with metadata, palette entries, sparse voxels, semantic
regions, and frame-swap animation clips. Asha should not copy the `.vforge`
lifecycle or VoxelForge project envelope.

## Decision Matrix

| VoxelForge feature | Evidence in predecessor | Asha recommendation | Owner | Next step |
| --- | --- | --- | --- | --- |
| `.vforge` project save/load | `ProjectSerializer`, `SaveLoadCommands`, and lifecycle service serialize metadata, palette, voxels, regions, and animation clips to `content/<name>.vforge`. | Adapt the storage need, reject the format. Create a new Asha-native voxel volume asset format for ProjectBundles. | `codex-asha-engine` | Create upstream storage-format task. |
| Studio voxel asset persistence | VoxelForge save/load replaces the editor document directly. | Adapt as explicit Studio authoring and runtime-to-stored save/load over the engine-owned format after public DTOs exist. | `codex-asha-studio` | Create dependent Studio task. |
| MCP transport and MCP tool registry | VoxelForge exposes model editing, lifecycle, visual, region, reference, spatial, and console command tools through MCP. | Reject as inherited structure. Asha already has Den/Studio agent surfaces; add typed Studio operations or upstream facades only when needed. | None | No task. |
| C# sidecar, bridge, and Electron packaging | VoxelForge uses a C# bridge sidecar and Electron/WebGL renderer packaging path. | Reject for Asha parity. Studio already owns its UI/runtime attach path and should not inherit sidecar packaging. | None | No task. |
| Compact voxel edits | `set_voxels`, `set_voxels_runs`, `fill_box`, primitive tools. | Already adapted in #4550 as bounded compact edits over generated `VoxelCommand` batches. | Done | No new task. |
| Model info and voxel area reads | LLM/MCP tools expose model info and area reads. | Model info is adapted. Area/window reads may be useful later as a bounded query view, but need product need and upstream read-set design. | `codex-asha-engine` if revived | Defer. |
| Static/reference model conversion | Reference model load, transform, diagnostics, fit, raycast, voxelize, and texture sampling tools. | Static mesh conversion is adapted. Rich reference-model authoring should be considered only as Asha asset/import tooling, not VoxelForge session state. | Mixed | Defer pending product workflow. |
| Texture/material sampling overrides | Manual reference material and texture sampling tools. | Keep upstream authority. Any richer material sampling should be engine-owned and projected by Studio. | `codex-asha-engine` | Defer unless current texture/UV tasks show gaps. |
| Semantic region labels | Region creation, hierarchy, assignment, bounds, tree, and region voxel queries. | Potentially useful, but needs Asha vocabulary: typed voxel selection/annotation capability or ProjectBundle metadata, not VoxelForge labels. | `codex-asha-engine` with Studio projection | Product decision needed. |
| Spatial query tools | Neighbors, interfaces, distance, cross section, and collision checks. | Potentially useful as typed read-only query views over Rust authority. Do not port console/MCP commands directly. | `codex-asha-engine` | Product decision needed. |
| Frame-swap animation | Animation clips and frame voxel overrides are serialized in VoxelForge. | Potentially useful, but should be designed as Asha animation/asset capability after storage basics land. | `codex-asha-engine` | Product decision needed. |
| Undo/redo and editor command stack | VoxelForge has document command objects and undo stack. | Do not port. Studio should use its own workspace action model and Asha command/event history. | `codex-asha-studio` if gaps are found | No task now. |
| Screenshot/viewer capture | MCP visual tools and browser viewer capture. | Keep projection-only evidence. Do not treat screenshots or Three.js buffers as authority. | `codex-asha-studio` | No task now. |
| Palette tools and material editing | Palette list/set/map/reduce commands. | Asha storage format should reference engine-owned material/catalog data. Studio can add palette UX after storage/material contracts are clear. | Mixed | Defer. |
| Bake tools | AO, edge darkening, and lighting console commands. | Not part of current Asha voxel parity. Could become engine asset-processing tasks if product rendering needs it. | `codex-asha-engine` | Product decision needed. |
| Import/replay tooling | VoxelForge has an import/replay project for LLM tool calls. | Reject as compatibility work. If Asha needs replay, build it around Asha commands/events/evidence. | Mixed | No task now. |

## Created Follow-Up Scope

Two follow-ups are warranted now because persisted voxel creations and edits are
needed for live Asha Studio testing:

- `codex-asha-engine`: define the upstream Asha-native serialized voxel volume
  asset format, including validation, canonical hashing, diagnostics,
  ProjectBundle integration, and public DTO/facade surfaces.
- `codex-asha-studio`: after the engine format lands, add Studio workflows to
  save/load/export voxel creations and conversions through public Asha surfaces
  and prove a persisted round trip in the voxel live-testing runbook.

Other VoxelForge features should remain product-decision candidates. They
should not block closing #4550 or #4785, and they should not be smuggled into
Studio as private state, raw transports, or predecessor compatibility layers.

## Boundary Rules For Future Tasks

- Engine/Rust owns authority, validation, serialization, generated DTOs, and
  stored/runtime transition rules.
- Studio owns projection, agent workflow adapters, authoring UX, and proof
  scripts over public Asha surfaces.
- RuntimeSession state and ProjectBundle assets are different planes. Promotion
  from runtime voxel edits to stored voxel assets must be explicit, diffed,
  validated, and saved.
- No new task should promise `.vforge` import/export unless a later product
  decision explicitly asks for VoxelForge compatibility.
- No new task should use MCP merely because VoxelForge used MCP.
