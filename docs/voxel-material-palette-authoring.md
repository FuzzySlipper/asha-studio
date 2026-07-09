# Voxel Material And Palette Authoring

Status: post-#5266 inventory and Studio UX plan.

## Public ASHA Fields Available To Studio

- `VoxelConversionSettings.materialMap.entries[]`: source material slot, optional source material id, and numeric voxel material id for conversion.
- `VoxelConversionSettings.materialMap.defaultVoxelMaterial`: fallback numeric voxel material id.
- `VoxelConversionSettings.materialMap.textureAssets[]` and `textureBindings[]`: texture sampling evidence for conversion readouts, including texture id/hash, UV attribute, sample UV, sampling policy, wrap policy, and material mode.
- `VoxelConversionPreview.sampleVoxels[].material`: sampled output voxel material ids for projection evidence.
- `VoxelModelInfoReadout.materialCounts`: RuntimeSession material counts for resident voxel models when requested.
- `VoxelVolumeAsset.materialPalette[]`: stored voxel material bindings of numeric voxel material id to material asset id.
- `VoxelVolumeAssetLoadReceipt.materialCounts`: material counts after loading a stored voxel asset into RuntimeSession.

These fields are public through `@asha/contracts` and runtime facade receipts. Studio can safely project them, validate that save/load preserved bindings/counts, and let compact edits choose a numeric voxel material id.

## Studio UX Added In This Slice

Studio now exposes a `studio-voxel-material-authoring.v0` read model and panel section that combines:

- conversion material-map rows;
- texture sampling readout details already present in conversion projection;
- stored voxel asset material-palette bindings from the last exported/saved asset;
- RuntimeSession material counts when model info/load receipts have provided them;
- the current compact edit material index.

This is intentionally a projection/readout surface. It helps agents see which numeric voxel material they are about to write, how conversion slots map to voxel materials, and which material bindings survived asset persistence.

## Proposed Next UX

- Add multi-row conversion material-map controls once source metadata can enumerate material slots.
- Add a material chooser that filters available ASHA catalog material assets and writes public conversion-map fields.
- Add compact edit presets that select a named material binding while still submitting numeric palette/material ids to the current public command surface.
- In save/load proofs, display material preservation as a first-class pass/fail item rather than only a summary string.

## Engine-Owned Gaps

Do not solve these with Studio-local shims:

- material catalog binding mutation for voxel assets;
- named voxel palette entries beyond numeric material ids;
- a public multi-material compact edit transaction/readback shape;
- source mesh material-slot metadata rich enough to build the conversion map automatically.

Engine follow-up #5295 tracks this upstream surface. Keep Studio on public ASHA contracts until that work lands.
