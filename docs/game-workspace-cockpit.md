# Game workspace cockpit design

Task: `asha#3675`

The game workspace cockpit is the first Studio surface for inspecting an ASHA
game workspace end to end. It is a read-model cockpit first: panels project
public ASHA package DTOs and reproducible evidence artifacts, and user actions
must flow through named public command/session operations. Studio must not become
the game asset database, runtime authority, or publish tool of record.

## Layout regions

The cockpit fits inside the existing Studio shell without replacing the scene
viewport. The left hierarchy can keep entity/scene selection; the bottom asset
area becomes the natural home for game workspace assets/proof scenes; the right
inspector shows detail for the selected workspace/readout row; the top strips
show workspace, runtime, and publish status.

1. **Workspace overview**
   - Purpose: show the current ASHA game manifest, compatibility status, and
     active resource profiles.
   - Public inputs:
     - `@asha/game-workspace` `parseAshaGameManifestToml(...)`
     - `@asha/game-workspace` `validateAshaConsumerCompatibility(...)`
     - `@asha/game-workspace` `ASHA_GAME_WORKSPACE_COMPATIBILITY`
     - `@asha/game-workspace` `AshaGameManifest`,
       `AshaConsumerCompatibilityMetadata`, and diagnostics DTOs.
   - Read model fields: engine/contracts/runtime/devtools/publish versions,
     scene roots, asset roots, replay roots, catalog packages, dev runtime
     command, devtools endpoint, Studio attach/write-scope flags, dev resource
     profile, publish resource profile, and classified diagnostics.
   - Actions: none in V1 beyond selecting/copying visible evidence refs.

2. **Asset catalog inventory**
   - Purpose: show every catalog asset with kind, source, dependency order,
     dev resolution, publish resolution, and diagnostics.
   - Public inputs:
     - `@asha/game-workspace` `AshaGameAssetCatalog`,
       `AshaGameAssetCatalogEntry`, `AshaGameAssetDevResolution`,
       `AshaGamePublishAssetManifest`, `validateAshaGameAssetCatalog(...)`,
       `resolveAshaGameAssetForDev(...)`, and
       `buildAshaGamePublishAssetManifest(...)`.
     - Reproducible evidence artifact
       `harness/out/asset-inventory/latest/index.json` with
       `artifactKind: "asha_demo_asset_inventory"` and
       `artifactVersion: "asset-inventory.v1"` until this read model is promoted
       into a dedicated public package.
   - Read model fields: `assetId`, `kind`, `sourcePath`, `dependencies`,
     `devResolution`, `publishResolution`, per-asset diagnostics, and
     `evidenceRefs`.
   - Actions: select asset row and project details into the inspector. Loading a
     scene asset must continue through `scene.load_asset` rather than direct
     component mutation.

3. **Proof scenes and replays**
   - Purpose: show named proof scenes and replay/proof evidence tied back to
     catalog asset ids.
   - Public inputs:
     - Scene files listed by `AshaGameManifest.workspace.sceneRoots`.
     - Proof-scene evidence emitted by `asha-demo` `scene:proof`,
       `dev:smoke`, and `verify:assets-v1`, including
       `artifactKind: "asha_demo_assets_v1_verification"`.
     - Existing Studio evidence/readout fixtures for visual capability,
       viewport editor, entity browser, inspector, transform gizmo, and demo
       asset load when they are shown as Studio-side proof refs.
   - Read model fields: scene id/name/path, referenced catalog asset ids,
     diagnostic status, associated replay/evidence artifact refs, and stale or
     missing evidence classifications.
   - Actions: select proof scene, show referenced assets, and request a future
     public load/preview operation. V1 does not read arbitrary scene roots from
     the browser at runtime.

4. **Runtime session and attach status**
   - Purpose: make the active reference/native/degraded runtime session visible,
     including compatibility, resource profile, projection hash, render diff,
     telemetry, and non-claims.
   - Public inputs:
     - `@asha/runtime-bridge` `GameRuntimeLauncher`,
       `GameRuntimeSession`, `GameRuntimeConfig`,
       `GameRuntimeLaunchResult`, `GameRuntimeIdentity`,
       `GameRuntimeProfile`, `GameRuntimeResourceProfile`,
       `GameRuntimeProjectionSummary`, `GameRuntimeRenderDiffSnapshot`,
       `GameRuntimeTelemetrySnapshot`, `GameRuntimeDiagnostic`, and
       `GameRuntimeEvidenceRef`.
     - `@asha/runtime-bridge` `createReferenceGameRuntimeLauncher()` for the
       reference runtime path.
     - `@asha/devtools` package-root protocol when attaching to a running dev
       endpoint is implemented in Studio.
   - Session operations:
     - `GameRuntimeLauncher.launch(config)`
     - `GameRuntimeSession.pullProjection()`
     - `GameRuntimeSession.pullRenderDiff(cursor?)`
     - `GameRuntimeSession.pullTelemetry()`
     - `GameRuntimeSession.exportReplay({ replayId })`
     - `GameRuntimeSession.exportEvidence({ evidenceId })`
     - `GameRuntimeSession.shutdown()`
   - Read model fields: launch status, runtime mode, workspace/game id,
     runtime entry, world bundle id, compatibility versions, sequence id,
     world hash, authority hash, loaded world, diagnostic counts, telemetry
     counts, evidence refs, and non-claims.

5. **Command proposal**
   - Purpose: show the exact accepted/rejected command path used by GUI and
     agent surfaces.
   - Public inputs:
     - `@asha/runtime-bridge` `GameRuntimeSession.proposeCommands(batch)`
       returning `GameRuntimeCommandProposalResult`.
     - `@asha/contracts` `CommandBatch` and `CommandResult`.
     - Command identities already used by Studio proofs, including
       `scene.load_asset`, `selection.set_active_entity`, `entity.set_name`,
       `transform.translate_entity`, `render.capture_before_after`, and the V1
       voxel command identities carried by `CommandBatch`.
   - Read model fields: proposal sequence id, command id, accepted/rejected/failed
     status, before and after authority hashes, diagnostics, retry/undo metadata
     when present, and evidence refs.
   - Actions: propose a typed command batch through the active public session.
     There is no `call(methodName, json)`, private callback, or freeform
     mutation hatch.

6. **Publish and evidence status**
   - Purpose: show whether the workspace has a runnable publish artifact and
     whether the publish/run/evidence checks all agree.
   - Public inputs:
     - Publish artifact evidence
       `harness/out/publish/latest/index.json` with
       `artifactKind: "asha_demo_publish_artifact"`.
     - Publish run smoke evidence
       `harness/out/publish-run-smoke/latest/index.json` with
       `artifactKind: "asha_demo_publish_run_smoke"`.
     - Publish evidence manifest
       `harness/out/publish-evidence/latest/index.json` with
       `evidenceVersion: "publish-evidence.v1"`.
     - Asset V1 aggregate evidence
       `harness/out/assets-v1/latest/index.json` with
       `artifactKind: "asha_demo_assets_v1_verification"`.
   - Read model fields: runnable entrypoint, reference runtime metadata, resource
     manifest hash, packed resources, dependency guard result, run-smoke
     projection and command proof, publish evidence id/hash, non-claims, and
     classified diagnostics.
   - Actions: select evidence refs and show detail. Running publish commands from
     Studio is deferred until there is an explicit public workflow operation and
     evidence contract for it.

## Shared read-model contract

Future implementation tasks should introduce a small Studio-side read model
rather than letting panels parse unrelated shapes independently:

```ts
interface StudioGameWorkspaceCockpitReadModel {
  readonly workspace: WorkspaceOverviewReadModel;
  readonly assets: AssetInventoryReadModel;
  readonly proofScenes: ProofSceneListReadModel;
  readonly runtime: RuntimeSessionReadModel;
  readonly commands: CommandProposalReadModel;
  readonly publish: PublishEvidenceReadModel;
  readonly diagnostics: readonly StudioGameWorkspaceCockpitDiagnostic[];
}
```

Each panel should be deterministic from explicit inputs supplied by the host
application or proof harness. Browser runtime code may fetch committed fixtures
or uploaded evidence blobs, but it must not crawl `/home/dev`, read ASHA package
internals, or infer state from unversioned local directories.

## Non-goals and fail-closed rules

- No private ASHA imports, generated-file imports, engine Rust paths, raw native
  transports, or package `src/**` subpaths.
- No arbitrary JSON command hatches, untyped `payload:any` protocol, or UI-only
  mutation callbacks.
- No private repo scans for asset, scene, or publish state. Directory walking
  belongs in reproducible scripts that emit typed artifacts.
- No mock-only panel data. Placeholder UI is allowed only when the read model is
  explicitly absent and diagnostics say why.
- No Studio authority claim for scene, command, runtime, publish, hardware GPU,
  Agora compositor, WASM, or performance evidence unless the corresponding
  public proof artifact and non-claim rules say it is available.
- Missing/stale/incompatible artifacts produce visible diagnostics and keep the
  panel in a failed-closed state rather than silently rendering fallback data.

## Implementation sequence

The follow-up tasks should land in this order:

1. Workspace overview and compatibility read model.
2. Asset catalog inventory panel consuming `asha_demo_asset_inventory`.
3. Proof scene/replay list tied to catalog IDs.
4. Runtime session/attach read model using `GameRuntimeSession`.
5. Command proposal panel using `proposeCommands(...)`.
6. Publish/evidence status panel consuming publish V1 artifacts.
7. Cockpit evidence export that records panel hashes, stale checks, and
   non-claims for agent review.

