# Studio Catalog Preview Strategy M3

Human UI M3 adds a bottom-panel Catalog workflow for catalog source work. The preview surface is intentionally a metadata readout in this slice.

## Previewable Now

- Catalog entry identity, kind, source path, publish output key, and dependency list.
- Dependency status from the loaded catalog.
- Source existence and source SHA-256 evidence when the project file server is connected.
- Referenced Studio renderable ids when an asset is already projected into the current scene read model.
- Typed catalog create/update/remove operation hashes and validation diagnostics.

## Deferred

- Mesh, material, and texture visual thumbnails.
- Runtime-loaded asset preview.
- Renderer-backed material sampling.
- Hardware GPU, Agora compositor, or performance evidence.

## Non-Claims

The Catalog tab must preserve these non-claims until a later renderer/runtime preview lane owns them:

- `not_mesh_material_texture_preview`
- `not_private_asset_database`
- `not_runtime_authority`
- `not_publish_builder`
- `not_hardware_gpu_evidence`
- `not_performance_evidence`

## Evidence

The workflow proof is `pnpm run evidence -- catalog-workflow-m3`. It must show the human-visible Catalog tab, create/load/link/validate affordances, bounded project-root file readback, and fail-closed diagnostics for missing source evidence and invalid/private catalog paths.
