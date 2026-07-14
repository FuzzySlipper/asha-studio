# Canonical scene persistence cleanup

Task `asha#5803` removed the Studio-only scene descriptor and scenario fixture
path. Studio now starts empty and obtains authored scene content only by New or
by decoding a canonical engine scene document selected through File Open.

## Deleted compatibility surface

- scenario switcher state, commands, panels, and synthesized demo renderables;
- Studio proof-scene descriptor parsing, catalog correlation, and product tab;
- legacy scene-source open/save intents, serializers, and bounded-root lists;
- project-workspace Save/Load product buttons that duplicated ordinary scene
  persistence;
- `proof-scene-file-menu-workflow.ts`, `proof-scene-save-roundtrip.ts`,
  `proof-persistence-m1.ts`, and `proof-workspace-open-read.ts`, plus their
  evidence-catalog entries and tests.

No compatibility adapter preserves these formats. Existing files must be
converted to the engine canonical scene document before Studio opens them.

## Retained authored/resource fixtures

The catalog, GLB/OBJ import, prefab, voxel asset, and RuntimeSession fixtures are
retained because they exercise real typed product formats. The optional
`studio-project-workspace.v1` fixture remains as an inspectable pointer to an
ordinary host scene file; it neither contains nor substitutes for scene data.

Missing catalog resources produce a visible unresolved-asset diagnostic. The
canonical scene document and its asset references remain unchanged, and Studio
does not fabricate fallback cubes or other placeholder content.
