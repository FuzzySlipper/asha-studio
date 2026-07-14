# Demo asset loading (task asha#3215)

Script status: `proof:asset-load`, `proof:browser`, and
`proof:visual-capability` are historical or deferred proof command names, not
current package scripts. Their status is tracked by
`docs/script-reference-policy.json`.

> Current renderer ownership: the historical asset-load proof described below
> now feeds renderer-neutral diffs to `@asha/renderer-host`. Concrete rendering
> is exclusively engine-owned; the removed local viewport implementation and
> its file names are historical references only.

ASHA Studio loads a real demo asset package through public ASHA surfaces and projects it into
the engine-owned viewport host as reference evidence. This is the first capability lane of the
`asha-studio-asset-entity-editor-next-roadmap` series.

## Demo asset package layout

The canonical package is committed on disk under
`public-fixtures/demo-assets/asha-studio-demo-pack/`:

```
catalog.json                              # Catalog
asset-lock.json                           # AssetLock
scene.json                                # FlatSceneDocument
models/demo-crate.mesh.json               # StaticMeshAsset payload
materials/demo-brushed-copper.material.json   # MaterialProjection
materials/demo-matte-slate.material.json      # MaterialProjection
```

`src/demo-asset-loading.ts#createDemoAssetPackage()` builds the same package in memory (the loader is
browser-safe and cannot read the filesystem at runtime), and `demoAssetPackageFiles()` exposes the
on-disk file list. `pnpm run proof:asset-load` verifies every committed file exists, matches the
in-memory package, and is hashed — so missing or stale source files fail closed. Regenerate the files
with `pnpm exec tsx scripts/generate-demo-asset-package.ts`. The package uses only `@asha/contracts`
DTOs:

- **Catalog** (`Catalog`/`CatalogEntry`): one static mesh (`mesh/demo-crate`) plus two material
  variants (`material/demo-brushed-copper`, `material/demo-matte-slate`). The mesh slot binds the
  copper material; the slate variant demonstrates a second selectable material.
- **Asset lock** (`AssetLock`): pins the resolved id/kind/version/hash/dependencies a save would
  record, so catalog drift is detectable rather than silently re-locked.
- **Scene document** (`FlatSceneDocument`): a flat node list with one `staticMesh` node carrying an
  `AssetReference` to the mesh and an initial placement transform.

## Loading through a shared command/timeline path

`loadDemoSceneAsset()` validates the package and emits a retained-mode `RenderFrameDiff`
(`defineMaterial` → `defineStaticMesh` → `createStaticMeshInstance`) with named renderable ids of the
form `scene-asset:<assetId>:<sceneNodeId>`. The load is invoked through the public
`scene.load_asset` command identity (owned by `@asha/command-registry`) and recorded on the shared
GUI/agent command timeline in `src/session-workspace.ts`. The recorded command input carries the
typed `assetId` / `materialId` / `placement` (validated against the public `LoadSceneAssetInput`
schema), so the timeline/evidence dock shows the exact loaded asset, material, and placement rather
than a bare session marker. The loaded renderable is appended to
`StudioSceneViewModel.renderables`; the current renderer-neutral adapter sends
the corresponding diff through `@asha/renderer-host` for realization and
readback.

## Structured provenance / readback

`StudioDemoAssetLoadArtifact` (exported in the agent readout) reports: loaded asset id, package id
and path, source path, mesh ref, material refs, renderable ids, scene id and entity placement node
ids, material variants, the load render diff, evidence/metadata hashes, surface findings, and
known limitations.

## Negative smokes (fail closed)

Four negative smokes classify failures with public contract codes and must all fail closed:

| case | trigger | classified code(s) |
| --- | --- | --- |
| `missing_asset` | lock pins a mesh absent from the catalog | `missing` (`LockIssueCode`) |
| `unsupported_format` | scene node references a `script`-kind asset | `asset-kind-mismatch` (`SceneValidationCode`) |
| `material_mismatch` | mesh slot binds a non-material asset | `wrong-kind-reference` (`CatalogValidationCode`) |
| `stale_catalog_lock_drift` | catalog version advances past the lock | `stale-version` (`LockIssueCode`) |

## Verification

- `pnpm run verify`
- `pnpm run proof:asset-load` (`scripts/asset-load-proof.ts` + `scripts/readback-asset-load-proof.mjs`) —
  Node-only proof of catalog/lock/scene validity, shared-timeline load, render diff, viewport
  projection, provenance, and fail-closed negative smokes.
- `pnpm run proof:browser` / `pnpm run proof:visual-capability` — refresh in a Chromium environment to
  recapture the viewport screenshots with the loaded asset.

## Non-claims

Demo asset placement is browser/reference render-diff projection only. It does not claim Rust/WASM
authority, native runtime execution, Agora compositor capture, hardware GPU, or performance
evidence; runtime authority bootstrap of the scene document remains behind the `asha#3047`
runtime-bridge readiness gate.
