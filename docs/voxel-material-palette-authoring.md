# Voxel Material And Palette Authoring

Status: implemented public Studio palette authoring.

## Public ASHA Fields Available To Studio

- `VoxelConversionSettings.materialMap.entries[]`: source material slot, optional source material id, and numeric voxel material id for conversion.
- `VoxelConversionSettings.materialMap.defaultVoxelMaterial`: fallback numeric voxel material id.
- `VoxelConversionSettings.materialMap.textureAssets[]` and `textureBindings[]`: texture sampling evidence for conversion readouts, including texture id/hash, UV attribute, sample UV, sampling policy, wrap policy, and material mode.
- `VoxelConversionPreview.sampleVoxels[].material`: sampled output voxel material ids for projection evidence.
- `VoxelModelInfoReadout.materialCounts`: RuntimeSession material counts for resident voxel models when requested.
- `VoxelVolumeAsset.materialPalette[]`: stored voxel material bindings of numeric voxel material id to material asset id.
- `RuntimeSessionFacade.updateVoxelVolumeAssetPalette(...)`: a bounded stored-only palette replacement with required canonical and voxel-data optimistic hashes, Rust validation diagnostics, and a ProjectBundle diff/receipt.
- `VoxelVolumeAssetLoadReceipt.materialCounts`: material counts after loading a stored voxel asset into RuntimeSession.

These fields are public through `@asha/contracts` and runtime facade receipts. Studio can safely project them, validate that save/load preserved bindings/counts, and let compact edits choose a numeric voxel material id.

## Studio UX Added In This Slice

Studio now exposes a `studio-voxel-material-authoring.v0` read model and panel section that combines:

- conversion material-map rows;
- texture sampling readout details already present in conversion projection;
- stored voxel asset material-palette bindings from the last exported/saved asset;
- RuntimeSession material counts when model info/load receipts have provided them;
- the current compact edit material index.

The panel also lets an editor select one stored palette entry and propose changes to its entry id, display name, material asset id, and optional catalog binding id. Studio submits the full replacement palette and current optimistic hashes through the public RuntimeSession facade; Rust validates the candidate and returns the durable replacement asset and ProjectBundle receipt. Studio does not validate material ids, catalog binding ids, duplicate entries, or hashes locally.

## Proposed Next UX

- Add multi-row conversion material-map controls once source metadata can enumerate material slots.
- Add compact edit presets that select a named material binding while still submitting numeric palette/material ids to the current public command surface.
- Display save/reopen material preservation directly in the editor rather than only as a diagnostic summary.

## Engine-Owned Gaps

Do not solve these with Studio-local shims:

- a public multi-material compact edit transaction/readback shape;
- source mesh material-slot metadata rich enough to build the conversion map automatically.

The remaining items require engine surfaces. Keep Studio on public ASHA contracts and typed receipts.
