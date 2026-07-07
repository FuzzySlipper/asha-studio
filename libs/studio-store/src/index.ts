import { computed, inject, Injectable, signal } from '@angular/core';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  addReferenceRenderableReadModel,
  attachStudioGameWorkspaceDevtools,
  buildStudioUiStateReadModel,
  applySceneObjectCommandReadModel,
  applySelectedEntityReadModel,
  buildAssetBrowserCategories,
  buildStudioPreferencesReadModel,
  buildStudioProofSceneList,
  buildStudioAshaDemoProductPathReadModel,
  buildStudioRuntimeSessionList,
  buildStudioCommandProposalPanel,
  buildStudioCatalogWorkflowReadModel,
  buildDefaultStudioFpsGameplayPresetDraft,
  buildStudioGameWorkspaceCommandProposalReadModel,
  buildStudioGameWorkspaceReadout,
  buildStudioRuntimeSessionInspectionReadModel,
  buildStudioSceneFileList,
  buildStudioSceneFileSaveReadback,
  buildStudioRunningProjectDiscovery,
  loadStudioAssetInventory,
  loadStudioPublishEvidence,
  buildStudioViewportReadout,
  buildInitialWorkspaceReadModel,
  buildStudioViewportAdapterReadModel,
  buildStudioViewportCameraReadModel,
  buildStudioViewportToolReadModel,
  clearStudioWorkspaceReadModel,
  createLoadReferenceAssetIntent,
  createLoadScenarioIntent,
  createOpenSceneFileIntent,
  createSaveSceneFileIntent,
  createSelectEntityIntent,
  createRenameSceneObjectRequest,
  createReparentSceneObjectRequest,
  createRotateSceneObjectRequest,
  createSceneObjectCommandIntent,
  createTranslateSceneObjectRequest,
  createStudioCompactAgentReadout,
  exportStudioWorkspaceCockpitEvidence,
  frameStudioViewportCamera,
  frameStudioViewportCameraOnRenderable,
  filterAssetBrowserRenderables,
  applyOpenSceneFileReadModel,
  applyStudioCatalogAuthoringOperation,
  loadScenarioReadModel,
  loadStudioGameWorkspaceManifest,
  orbitStudioViewportCamera,
  panStudioViewportCamera,
  refreshStudioGameWorkspaceLiveReadModel,
  recordStudioWorkspaceUiCommand,
  restoreStudioWorkspaceArtifact,
  serializeWorkspaceSceneSource,
  serializeStudioWorkspaceArtifact,
  setHierarchyExpansionReadModel,
  studioCatalogAuthoringBaseHash,
  updateStudioRenderSetting,
  zoomStudioViewportCamera,
  type StudioAssetBrowserCategory,
  type StudioApplicationMenu,
  type StudioBottomPanelTab,
  type StudioGameWorkspaceLoadResult,
  type StudioGameWorkspaceAttachReadModel,
  type StudioGameWorkspaceLiveReadModel,
  type StudioGameWorkspaceReadModel,
  type StudioGameWorkspaceReadout,
  type StudioDevtoolsAttachTransport,
  type StudioFpsGameplayPresetDraft,
  type StudioFpsGameplayPresetDraftField,
  type StudioGeneratedLevelPresetDraft,
  type StudioAshaDemoProductPathReadModel,
  type StudioRunningProjectDiscoveryReadModel,
  type StudioRuntimeSessionInspectionReadModel,
  type StudioSceneFileListReadModel,
  type StudioSceneFileSourceInput,
  type StudioAssetInventoryEntryReadModel,
  type StudioAssetInventoryLoadResult,
  type StudioCatalogSourceEvidenceInput,
  type StudioCatalogWorkflowReadModel,
  type StudioProofSceneListLoadResult,
  type StudioPreferencesReadModel,
  type StudioRenderSettingKey,
  type StudioViewportCameraControlDelta,
  type StudioViewportCameraReadModel,
  type StudioViewportHitReadModel,
  type StudioViewportToolMode,
  type StudioViewportToolReadModel,
  type StudioWorkspaceReadModel,
} from '@asha-studio/domain';
import type { SceneObjectId } from '@asha/editor-tools';
import type {
  VoxelConversionFitPolicy,
  VoxelConversionMaterialMap,
  VoxelConversionMode,
  VoxelConversionOriginPolicy,
  VoxelConversionSettings,
  VoxelConversionSourceRef,
  VoxelConversionTargetRef,
} from '@asha/contracts';
import type { AshaGameAssetCatalog, AshaGameAssetCatalogEntry, AshaGameAssetKind } from '@asha/game-workspace';
import {
  RuntimeBridgeError,
  createRuntimeSessionFacade,
  type CameraCreateRequest,
  type CombatFeedbackProjection,
  type EncounterDirectorReadout,
  type GeneratedTunnelReadout,
  type NavProjectionReadout,
  type RuntimeBridge,
  type RuntimeSessionAutonomousPolicyTickReadout,
  type RuntimeSessionEncounterTransitionReceipt,
  type RuntimeSessionFacade,
  type RuntimeSessionGeneratedTunnelOperationReceipt,
  type RuntimeSessionLifecycleRestartReceipt,
  type RuntimeSessionLifecycleStatusReadout,
  type RuntimeSessionProjectionSummary,
  type RuntimeSessionStateSummary,
  type RuntimeSessionTelemetrySummary,
  type WorldLoadRequest,
} from '@asha/runtime-bridge';
import {
  buildStudioVoxelConversionPlanProposal,
  buildStudioVoxelConversionReadoutModel,
  buildStudioVoxelConversionWorkspaceReadModel,
  type StudioVoxelConversionCommandId,
  type StudioVoxelConversionProposalResult,
  type StudioVoxelConversionReadoutModel,
  type StudioVoxelConversionWorkspaceReadModel,
} from '@asha-studio/voxel-conversion';

const WORKSPACE_STORAGE_KEY = 'asha-studio.workspace.v1';

export interface StudioProjectFileEntry {
  readonly path: string;
  readonly name: string;
  readonly kind: 'file' | 'directory';
  readonly size: number | null;
  readonly mtimeMs: number | null;
}

export interface StudioProjectFileDialogReadModel {
  readonly backend: 'project-server' | 'fallback';
  readonly connected: boolean;
  readonly projectRoot: string | null;
  readonly currentDir: string;
  readonly entries: readonly StudioProjectFileEntry[];
  readonly selectedPath: string | null;
  readonly message: string;
}

export interface StudioVoxelConversionWorkspaceShellRegion {
  readonly id: 'source' | 'settings' | 'preview' | 'diagnostics' | 'timeline' | 'evidence';
  readonly label: string;
  readonly status: string;
  readonly disabled: boolean;
  readonly message: string;
}

export interface StudioVoxelConversionWorkspaceShellAction {
  readonly commandId: StudioVoxelConversionCommandId;
  readonly label: string;
  readonly disabled: boolean;
  readonly reason: string;
}

export interface StudioVoxelConversionSourceOption {
  readonly assetId: string;
  readonly label: string;
  readonly kind: string;
  readonly sourceHash: string | null;
  readonly supported: boolean;
  readonly selected: boolean;
}

export interface StudioVoxelConversionSettingsDraftReadModel {
  readonly selectedSourceAssetId: string | null;
  readonly mode: VoxelConversionMode;
  readonly fitPolicy: VoxelConversionFitPolicy;
  readonly originPolicy: VoxelConversionOriginPolicy;
  readonly resolution: readonly [number, number, number];
  readonly voxelSize: number;
  readonly maxOutputVoxels: number;
  readonly targetGrid: number;
  readonly targetVolumeAssetId: string;
  readonly targetOrigin: readonly [number, number, number];
  readonly meshPrimitive: string | null;
  readonly materialMap: VoxelConversionMaterialMap;
}

export interface StudioVoxelConversionWorkspaceShellState {
  readonly id: 'empty_inputs' | 'missing_capability' | 'ready';
  readonly label: string;
  readonly active: boolean;
  readonly status: string;
  readonly message: string;
}

export interface StudioVoxelConversionPreviewState {
  readonly id: 'unavailable' | 'projection_only' | 'stale';
  readonly label: string;
  readonly active: boolean;
  readonly message: string;
}

export interface StudioVoxelConversionMaterialReadout {
  readonly sourceMaterialSlot: number;
  readonly sourceMaterialId: string | null;
  readonly voxelMaterial: number;
}

export interface StudioVoxelConversionPreviewProjectionReadModel {
  readonly status: 'unavailable' | 'projection_only' | 'stale';
  readonly viewportLabel: string;
  readonly inputReadoutHash: string;
  readonly previewHash: string | null;
  readonly outputVoxelCount: number | null;
  readonly outputBoundsLabel: string;
  readonly materialMapStatus: string;
  readonly materialRows: readonly StudioVoxelConversionMaterialReadout[];
  readonly states: readonly StudioVoxelConversionPreviewState[];
}

export interface StudioVoxelConversionWorkspaceShellReadModel {
  readonly shellVersion: 'voxel-conversion-shell.v0';
  readonly workspace: StudioVoxelConversionWorkspaceReadModel;
  readonly readout: StudioVoxelConversionReadoutModel;
  readonly sourceOptions: readonly StudioVoxelConversionSourceOption[];
  readonly settingsDraft: StudioVoxelConversionSettingsDraftReadModel;
  readonly planProposal: StudioVoxelConversionProposalResult<unknown>;
  readonly previewProjection: StudioVoxelConversionPreviewProjectionReadModel;
  readonly states: readonly StudioVoxelConversionWorkspaceShellState[];
  readonly regions: readonly StudioVoxelConversionWorkspaceShellRegion[];
  readonly actions: readonly StudioVoxelConversionWorkspaceShellAction[];
  readonly shellHash: string;
}

interface StudioVoxelConversionSettingsDraft {
  readonly selectedSourceAssetId: string | null;
  readonly mode: VoxelConversionMode;
  readonly fitPolicy: VoxelConversionFitPolicy;
  readonly originPolicy: VoxelConversionOriginPolicy;
  readonly resolution: readonly [number, number, number];
  readonly voxelSize: number;
  readonly maxOutputVoxels: number;
  readonly targetGrid: number;
  readonly targetVolumeAssetId: string;
  readonly targetOrigin: readonly [number, number, number];
  readonly meshPrimitive: string | null;
  readonly materialMap: VoxelConversionMaterialMap;
}

const DEMO_GAME_WORKSPACE_MANIFEST = `[asha]
engine_version = "0.1.0"
contracts_version = "0.1.0"
runtime_bridge_version = "0.1.0"
devtools_protocol_version = "devtools-protocol.v0"
publish_artifact_format_version = "publish-artifact.v0"
engine_source = "../asha"

[workspace]
scene_roots = ["levels/presets", "levels/scenes"]
asset_roots = ["assets"]
replay_roots = ["replays"]
catalog_packages = ["catalogs/actors", "catalogs/gameplay", "catalogs/materials", "catalogs/spawns", "catalogs/weapons"]
policy_packages = []

[runtime]
dev_command = "npm run dev"
devtools_endpoint = "ws://127.0.0.1:7391"
wasm_or_native_entry = "dist/runtime/index.js"
backend_mode = "native"
backend_profile = "native.napi.launcher.v1"
backend_proof_refs = ["artifacts/4217/generated-tunnel-room.png"]

[studio]
workspace_mode = true
attach_enabled = false
allowed_source_writes = ["levels/presets", "levels/scenes", "assets", "catalogs/actors", "catalogs/gameplay", "catalogs/materials", "catalogs/spawns", "catalogs/weapons"]

[publish]
command = "npm run build"
artifact_dir = "dist"
verify_command = "npm run typecheck"

[dev_resource_profile]
local_roots = ["assets", "catalogs/actors", "catalogs/gameplay", "catalogs/materials", "catalogs/spawns", "catalogs/weapons"]
cache_dir = "dist/dev-cache"
resolution_policy = "prefer-source"

[publish_resource_profile]
output_dir = "dist/resources"
archive_dir = "dist/archive"
resolution_policy = "locked"
`;

const DEMO_GAME_WORKSPACE_SCRIPTS: Readonly<Record<string, string>> = {
  dev: 'node scripts/serve-ui.mjs',
  build: 'node scripts/build-ui.mjs',
  typecheck: 'node scripts/check-ui-assets.mjs',
};

const DEMO_GAME_WORKSPACE_PATHS = new Set([
  'levels/presets',
  'levels/scenes',
  'assets',
  'replays',
  'catalogs/actors',
  'catalogs/gameplay',
  'catalogs/materials',
  'catalogs/spawns',
  'catalogs/weapons',
]);

const DEMO_RUNTIME_PROJECT_BUNDLE: WorldLoadRequest = {
  bundleSchemaVersion: 1,
  protocolVersion: 1,
  sceneId: 4103,
};

const STUDIO_PLAYABLE_LOOP_POLICY_SOURCE = 'export const policy = (view) => view;';

const STUDIO_PLAYABLE_LOOP_CAMERA_REQUEST: CameraCreateRequest = {
  initialPose: {
    position: [1, 1.5, 1],
    yawDegrees: 180,
    pitchDegrees: 0,
  },
  projection: {
    fovYDegrees: 60,
    near: 0.1,
    far: 100,
  },
  viewport: {
    width: 1280,
    height: 720,
  },
};

const DEMO_ASSET_INVENTORY_ARTIFACT = {
  artifactKind: 'asha_demo_asset_inventory',
  artifactVersion: 'asset-inventory.v1',
  generatedAt: 'deterministic-as-structure-only',
  sourceManifest: {
    path: 'asha.game.toml',
    hash: 'sha256:8dea305570a722c40d5e046b11197476c4d9e9674ce83f537dc803ada6bb9703',
  },
  catalog: {
    path: 'packages/game-catalogs/catalog.json',
    hash: 'sha256:d51427117af9d7eefb673cec1a9a555fcb2f7f772950325cc7117d2dc61d1540',
  },
  status: 'ok',
  diagnostics: [],
  dependencyOrder: [
    'texture.demo-checker',
    'material.demo-copper',
    'mesh.demo-cube',
  ],
  entries: [
    {
      assetId: 'mesh.demo-cube',
      kind: 'static_mesh',
      sourcePath: 'assets/meshes/demo-cube.mesh.json',
      dependencies: ['material.demo-copper'],
      devResolution: {
        assetId: 'mesh.demo-cube',
        sourcePath: 'assets/meshes/demo-cube.mesh.json',
        sourceHash: 'sha256:22b58100010034f72eb504d7722aec14b819438bce47e80bf361b3444e238117',
        devCacheKey: 'dev-cache/static_mesh/mesh.demo-cube/22b581000100',
        generatedArtifactVersion: 'asset-import.v1',
        importStatus: 'clean',
        publishOutputKey: 'meshes/demo-cube.mesh.json',
      },
      publishResolution: {
        outputKey: 'meshes/demo-cube.mesh.json',
        packedPath: 'harness/out/publish/resources/meshes/demo-cube.mesh.json',
        packedHash: 'sha256:277860798a59f8bf7a06e28ad60988799b6d63768d43094ba9537a03108b787e',
        packedBytes: 702,
      },
      diagnostics: [],
      evidenceRefs: [
        {
          kind: 'source',
          path: 'assets/meshes/demo-cube.mesh.json',
          sha256: 'sha256:22b58100010034f72eb504d7722aec14b819438bce47e80bf361b3444e238117',
        },
        {
          kind: 'packed-resource',
          path: 'harness/out/publish/resources/meshes/demo-cube.mesh.json',
          sha256: 'sha256:277860798a59f8bf7a06e28ad60988799b6d63768d43094ba9537a03108b787e',
        },
      ],
    },
    {
      assetId: 'material.demo-copper',
      kind: 'material',
      sourcePath: 'assets/materials/demo-copper.material.json',
      dependencies: ['texture.demo-checker'],
      devResolution: {
        assetId: 'material.demo-copper',
        sourcePath: 'assets/materials/demo-copper.material.json',
        sourceHash: 'sha256:0190cf1f6ec702431fd1e37e38503b9002978681a989d6382830d92e586ccd6d',
        devCacheKey: 'dev-cache/material/material.demo-copper/0190cf1f6ec7',
        generatedArtifactVersion: 'asset-import.v1',
        importStatus: 'clean',
        publishOutputKey: 'materials/demo-copper.material.json',
      },
      publishResolution: {
        outputKey: 'materials/demo-copper.material.json',
        packedPath: 'harness/out/publish/resources/materials/demo-copper.material.json',
        packedHash: 'sha256:89b73b140332526f3b6c63a9b4f26a78ca657ca764ae87262cfbff4b36fb55b2',
        packedBytes: 214,
      },
      diagnostics: [],
      evidenceRefs: [
        {
          kind: 'source',
          path: 'assets/materials/demo-copper.material.json',
          sha256: 'sha256:0190cf1f6ec702431fd1e37e38503b9002978681a989d6382830d92e586ccd6d',
        },
        {
          kind: 'packed-resource',
          path: 'harness/out/publish/resources/materials/demo-copper.material.json',
          sha256: 'sha256:89b73b140332526f3b6c63a9b4f26a78ca657ca764ae87262cfbff4b36fb55b2',
        },
      ],
    },
    {
      assetId: 'texture.demo-checker',
      kind: 'texture',
      sourcePath: 'assets/textures/demo-checker.texture.json',
      dependencies: [],
      devResolution: {
        assetId: 'texture.demo-checker',
        sourcePath: 'assets/textures/demo-checker.texture.json',
        sourceHash: 'sha256:46f863709c0cf4f2d5d03b560f492f5556c3482640b69dddcc6a2ac56b8963d3',
        devCacheKey: 'dev-cache/texture/texture.demo-checker/46f863709c0c',
        generatedArtifactVersion: 'asset-import.v1',
        importStatus: 'clean',
        publishOutputKey: 'textures/demo-checker.texture.json',
      },
      publishResolution: {
        outputKey: 'textures/demo-checker.texture.json',
        packedPath: 'harness/out/publish/resources/textures/demo-checker.texture.json',
        packedHash: 'sha256:033fc8ad02986bbf46064607c516f8ce1fe77714d136712297d9d35414a2473d',
        packedBytes: 367,
      },
      diagnostics: [],
      evidenceRefs: [
        {
          kind: 'source',
          path: 'assets/textures/demo-checker.texture.json',
          sha256: 'sha256:46f863709c0cf4f2d5d03b560f492f5556c3482640b69dddcc6a2ac56b8963d3',
        },
        {
          kind: 'packed-resource',
          path: 'harness/out/publish/resources/textures/demo-checker.texture.json',
          sha256: 'sha256:033fc8ad02986bbf46064607c516f8ce1fe77714d136712297d9d35414a2473d',
        },
      ],
    },
  ],
} as const;

const DEMO_PROOF_SCENES = [
  {
    path: 'scenes/material-proof.scene.json',
    schemaVersion: 1,
    sceneId: 1002,
    name: 'ASHA Demo Material Proof',
    description: 'Proof scene that references mesh, material, and texture catalog assets together.',
    catalogAssetIds: ['mesh.demo-cube', 'material.demo-copper', 'texture.demo-checker'],
    runtimeFixture: 'harness/conformance/fixtures/minimal-world.json',
  },
] as const;

const DEMO_MINIMAL_SCENE_SOURCE = {
  schemaVersion: 1,
  sceneId: 1001,
  name: 'ASHA Demo Minimal Cube',
  description: 'Minimal game-workflow scene that loads through the public ASHA runtime path.',
  catalogAssetIds: ['mesh.demo-cube'],
  runtimeFixture: 'harness/conformance/fixtures/minimal-world.json',
} as const;

function stableBrowserHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `sha256:browser-${hash.toString(16).padStart(8, '0')}`;
}

function demoSceneSource(path: string, scene: (typeof DEMO_PROOF_SCENES)[number]): StudioSceneFileSourceInput {
  const text = `${JSON.stringify({
    schemaVersion: scene.schemaVersion,
    sceneId: scene.sceneId,
    name: scene.name,
    description: scene.description,
    catalogAssetIds: scene.catalogAssetIds,
    runtimeFixture: scene.runtimeFixture,
  }, null, 2)}\n`;
  return {
    path,
    text,
    sha256: stableBrowserHash(text),
  };
}

const DEMO_SCENE_FILE_SOURCES: readonly StudioSceneFileSourceInput[] = [
  demoSceneSource('scenes/material-proof.scene.json', DEMO_PROOF_SCENES[0]),
  {
    path: 'scenes/minimal.scene.json',
    text: `${JSON.stringify(DEMO_MINIMAL_SCENE_SOURCE, null, 2)}\n`,
    sha256: stableBrowserHash(`${JSON.stringify(DEMO_MINIMAL_SCENE_SOURCE, null, 2)}\n`),
  },
];

const DEMO_PUBLISH_EVIDENCE = {
  evidenceKind: 'asha_demo_publish_evidence_manifest',
  evidenceVersion: 'publish-evidence.v1',
  generatedAt: 'deterministic-as-structure-only',
  publishArtifact: {
    path: 'harness/out/publish/latest/index.json',
    fileHash: 'sha256:85b942e5df6f30184fc16355d25d362fa06af26878a4fd21c7e274f0e747762a',
    artifactId: 'asha-demo-publish:sha256:0b62e2e4e86bc1c0ab4ad5930599a068646c1048642bab88d1fb4b601f5f1256',
    artifactHash: 'sha256:0b62e2e4e86bc1c0ab4ad5930599a068646c1048642bab88d1fb4b601f5f1256',
    artifactVersion: 'publish-artifact.v0',
    compiledAssetCount: 3,
    publishAssetCount: 3,
    runnableTarget: 'asha-demo-static-reference.v1',
    runnableEntrypointPath: 'harness/out/publish/runnable/latest/index.html',
    runnableEntrypointHash: 'sha256:740b5e8836e7e923ef19f3b78c3e4195ab19cc503ba5fce7fda222772e7345a2',
    resourcePackManifestPath: 'harness/out/publish/resources/manifest.json',
    resourcePackManifestHash: 'sha256:eb88d4443d0556db892b1f8371523462de0bd994d3c10dba3a1cf88e3828dd68',
  },
  publishSmoke: {
    path: 'harness/out/publish-smoke/latest/index.json',
    fileHash: 'sha256:95a795c9a2af139e15806bc35a658129cbcceb3e06a8d2bff2a7dadfa9ee08f1',
    checks: [
      'publish_artifact_built',
      'artifact_hash_recomputed',
      'compiled_assets_match_sources',
      'packed_resources_match_publish_profile',
      'no_dev_local_resource_reads',
      'runnable_dependency_guard_passed',
      'non_claims_preserved',
    ],
    readback: {
      status: 'ok',
      artifactPath: 'harness/out/publish/latest/index.json',
      artifactHash: 'sha256:0b62e2e4e86bc1c0ab4ad5930599a068646c1048642bab88d1fb4b601f5f1256',
      publishDependencyGuard: 'no-studio-dev-only-fragments',
      sceneCount: 2,
      catalogCount: 1,
      compiledAssetCount: 3,
      publishAssetCount: 3,
      packedResources: [
        {
          assetId: 'mesh.demo-cube',
          outputKey: 'meshes/demo-cube.mesh.json',
          sourceHash: 'sha256:22b58100010034f72eb504d7722aec14b819438bce47e80bf361b3444e238117',
          packedHash: 'sha256:277860798a59f8bf7a06e28ad60988799b6d63768d43094ba9537a03108b787e',
          runnableHash: 'sha256:277860798a59f8bf7a06e28ad60988799b6d63768d43094ba9537a03108b787e',
        },
        {
          assetId: 'material.demo-copper',
          outputKey: 'materials/demo-copper.material.json',
          sourceHash: 'sha256:0190cf1f6ec702431fd1e37e38503b9002978681a989d6382830d92e586ccd6d',
          packedHash: 'sha256:89b73b140332526f3b6c63a9b4f26a78ca657ca764ae87262cfbff4b36fb55b2',
          runnableHash: 'sha256:89b73b140332526f3b6c63a9b4f26a78ca657ca764ae87262cfbff4b36fb55b2',
        },
        {
          assetId: 'texture.demo-checker',
          outputKey: 'textures/demo-checker.texture.json',
          sourceHash: 'sha256:46f863709c0cf4f2d5d03b560f492f5556c3482640b69dddcc6a2ac56b8963d3',
          packedHash: 'sha256:033fc8ad02986bbf46064607c516f8ce1fe77714d136712297d9d35414a2473d',
          runnableHash: 'sha256:033fc8ad02986bbf46064607c516f8ce1fe77714d136712297d9d35414a2473d',
        },
      ],
      dependencyGuard: {
        inspectedRunnableFiles: [
          'harness/out/publish/runnable/latest/index.html',
          'harness/out/publish/runnable/latest/resources/manifest.json',
          'harness/out/publish/runnable/latest/resources/materials/demo-copper.material.json',
          'harness/out/publish/runnable/latest/resources/meshes/demo-cube.mesh.json',
          'harness/out/publish/runnable/latest/resources/textures/demo-checker.texture.json',
          'harness/out/publish/runnable/latest/runtime/reference-runtime.json',
        ],
        forbiddenFragments: [
          '@asha-studio/',
          'asha-studio',
          '../asha-studio',
          'studio-game-workspace',
          'harness/out/dev-smoke',
          'harness/out/publish-smoke',
          'devtools_endpoint',
          'ws://127.0.0.1',
          'ws://localhost',
        ],
      },
    },
  },
  publishRunSmoke: {
    path: 'harness/out/publish-run-smoke/latest/index.json',
    fileHash: 'sha256:ce809ae83fc0d4f6867c230b1950dbed5d802c90e3f654c9e69b5b563e4d8c8c',
    runtime: {
      runtimeMode: 'reference',
      launcherName: 'reference-game-runtime-launcher',
      nonClaims: [
        'not_native_runtime',
        'not_hardware_gpu',
        'not_performance_evidence',
        'not_publish_artifact',
        'not_wasm_authority',
      ],
    },
    projection: {
      worldHash: 'reference-world:asha-demo:1002:accepted:0',
    },
    commandProof: {
      acceptedCommand: { status: 'accepted' },
      rejectedCommand: { status: 'rejected' },
    },
    resolvedResourceCount: 3,
    checks: [
      'entrypoint_exists_without_dev_server',
      'runtime_metadata_loaded',
      'packed_resources_resolved',
      'reference_runtime_projection_pulled',
      'packaged_runtime_accepted_command_mutated_projection',
      'packaged_runtime_rejected_command_preserved_projection',
      'no_devtools_endpoint_required',
    ],
  },
  validations: [
    'publish_artifact_hash_matches_readback',
    'publish_smoke_references_publish_artifact',
    'publish_run_smoke_references_runnable_artifact',
    'runnable_entrypoint_hash_recorded',
    'packed_resource_manifest_hash_recorded',
    'runtime_projection_readback_present',
    'packaged_command_proof_present',
    'compiled_asset_count_matches_readback',
    'studio_dev_only_dependency_guard_passed',
  ],
  nonClaims: [
    'not_native_runtime_authority',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
    'not_store_submission',
  ],
  evidenceId: 'asha-demo-publish-evidence:sha256:95da5f3787aa4a97bc21ff998305ab2a8ffd6d8b02081cc8b00f410880ad842e',
  evidenceHash: 'sha256:95da5f3787aa4a97bc21ff998305ab2a8ffd6d8b02081cc8b00f410880ad842e',
} as const;

function loadDemoGameWorkspace(): StudioGameWorkspaceLoadResult {
  return loadStudioGameWorkspaceManifest({
    workspaceRoot: '../asha-demo',
    manifestPath: 'asha.game.toml',
    gameId: 'asha-demo',
    manifestText: DEMO_GAME_WORKSPACE_MANIFEST,
    packageScripts: DEMO_GAME_WORKSPACE_SCRIPTS,
    pathExists: relativePath => DEMO_GAME_WORKSPACE_PATHS.has(relativePath),
  });
}

function loadDemoAssetInventory(): StudioAssetInventoryLoadResult {
  return loadStudioAssetInventory(DEMO_ASSET_INVENTORY_ARTIFACT, {
    referencedRenderableIds: demoReferencedRenderableIds(),
  });
}

function demoReferencedRenderableIds(): Readonly<Record<string, readonly string[]>> {
  return {
    'mesh.demo-cube': ['model-preview-crate'],
    'material.demo-copper': ['model-preview-crate'],
  };
}

function importProfileForKind(kind: string): string {
  if (kind === 'static_mesh') {
    return 'inline-static-mesh.v0';
  }
  if (kind === 'material') {
    return 'inline-material.v0';
  }
  return 'inline-texture.v0';
}

function catalogFromInventoryArtifact(): AshaGameAssetCatalog {
  return {
    schemaVersion: 1,
    entries: DEMO_ASSET_INVENTORY_ARTIFACT.entries.map((entry): AshaGameAssetCatalogEntry => ({
      id: entry.assetId,
      kind: entry.kind as AshaGameAssetKind,
      source: entry.sourcePath,
      importProfile: importProfileForKind(entry.kind),
      importMetadata: {
        sourceHash: entry.devResolution.sourceHash,
        cacheKey: entry.devResolution.devCacheKey,
        generatedArtifactVersion: entry.devResolution.generatedArtifactVersion,
      },
      dependencies: entry.dependencies ?? [],
      publish: {
        include: true,
        outputKey: entry.publishResolution.outputKey,
      },
      diagnostics: {
        owner: 'asha-studio',
        notes: [],
      },
    })),
  };
}

function inventoryFromCatalog(
  catalog: AshaGameAssetCatalog,
  catalogPath: string,
  catalogHash: string,
  referencedRenderableIds: Readonly<Record<string, readonly string[]>>,
): StudioAssetInventoryLoadResult {
  return loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: DEMO_ASSET_INVENTORY_ARTIFACT.sourceManifest,
    catalog: { path: catalogPath, hash: catalogHash },
    diagnostics: [],
    dependencyOrder: catalog.entries.map(entry => entry.id),
    entries: catalog.entries.map(entry => ({
      assetId: entry.id,
      kind: entry.kind,
      sourcePath: entry.source,
      dependencies: entry.dependencies ?? [],
      devResolution: {
        sourceHash: entry.importMetadata?.sourceHash ?? null,
        devCacheKey: entry.importMetadata?.cacheKey ?? `dev-cache/${entry.kind}/${entry.id}`,
        generatedArtifactVersion: entry.importMetadata?.generatedArtifactVersion ?? null,
        importStatus: 'catalog-linked',
        publishOutputKey: entry.publish.outputKey,
      },
      publishResolution: {
        outputKey: entry.publish.outputKey,
        packedPath: `harness/out/publish/resources/${entry.publish.outputKey}`,
        packedHash: null,
        packedBytes: null,
      },
      diagnostics: [],
      evidenceRefs: [
        {
          kind: 'catalog-source',
          path: entry.source,
          sha256: entry.importMetadata?.sourceHash ?? null,
        },
      ],
    })),
  }, { referencedRenderableIds });
}

function loadDemoProofScenes(
  workspace: StudioGameWorkspaceLoadResult,
  inventory: StudioAssetInventoryLoadResult,
): StudioProofSceneListLoadResult {
  if (!workspace.ok || !inventory.ok) {
    const fallbackWorkspace = workspace.ok ? workspace.workspace : null;
    const fallbackInventory = inventory.inventory;
    if (fallbackWorkspace !== null && fallbackInventory !== null) {
      return buildStudioProofSceneList({
        workspace: fallbackWorkspace,
        assetInventory: fallbackInventory,
        scenes: [],
        evidence: { proofSceneCommandStatus: 'missing' },
      });
    }
    return {
      ok: false,
      proofScenes: {
        proofSceneListVersion: 'studio-proof-scene-list.v0',
        sceneRoots: [],
        scenes: [],
        diagnostics: [
          {
            severity: 'error',
            code: 'proof_scene_missing',
            message: 'Proof scenes require a valid workspace and asset inventory.',
            source: null,
            remediation: null,
          },
        ],
        proofSceneListHash: 'studio-proof-scene-list-unavailable',
      },
      diagnostics: [
        {
          severity: 'error',
          code: 'proof_scene_missing',
          message: 'Proof scenes require a valid workspace and asset inventory.',
          source: null,
          remediation: null,
        },
      ],
    };
  }

  return buildStudioProofSceneList({
    workspace: workspace.workspace,
    assetInventory: inventory.inventory,
    scenes: DEMO_PROOF_SCENES,
    evidence: {
      proofSceneCommandStatus: 'passed',
      proofSceneCommand: '/usr/bin/node scripts/check-proof-scenes.mjs',
      assetInventoryArtifactPath: 'harness/out/asset-inventory/latest/index.json',
      assetInventoryArtifactHash: 'sha256:87d9ba8eb31307e0ded564e456f3721275e481fdbfeb29e6ec267ac7c64c3894',
    },
  });
}

function buildDemoCommandProposalRows(workspace: StudioGameWorkspaceReadModel) {
  const batch = {
    commands: [
      {
        op: 'setVoxel',
        grid: 0,
        coord: { x: 0, y: 0, z: 0 },
        value: { kind: 'solid', material: 1 },
      },
    ],
  } as const;
  const rejectedBatch = {
    commands: [
      {
        op: 'setVoxel',
        grid: 0,
        coord: { x: 1, y: 0, z: 0 },
        value: { kind: 'solid', material: 999 },
      },
    ],
  } as const;
  return [
    buildStudioGameWorkspaceCommandProposalReadModel({
      workspace,
      attachHash: 'fixture:devtools-attach:asha-demo',
      sequenceId: 'seq-1',
      batch,
      status: 'accepted',
      result: {
        accepted: 1,
        rejected: 0,
        rejections: [],
      },
      authorityHashAfter: 'authority:after:accepted',
    }),
    buildStudioGameWorkspaceCommandProposalReadModel({
      workspace,
      attachHash: 'fixture:devtools-attach:asha-demo',
      sequenceId: 'seq-2',
      batch: rejectedBatch,
      status: 'rejected',
      result: {
        accepted: 0,
        rejected: 1,
        rejections: [{ reason: 'unknownMaterial', material: 999 }],
      },
      authorityHashAfter: 'authority:after:rejected',
      rejectionReason: 'authority_rejected',
    }),
  ];
}

function firstDiagnosticMessage(
  diagnostics: readonly { readonly message: string }[],
  fallback: string,
): string {
  return diagnostics[0]?.message ?? fallback;
}

const SUPPORTED_VOXEL_CONVERSION_SOURCE_KINDS = ['static_mesh'] as const;

const DEFAULT_VOXEL_CONVERSION_DRAFT: StudioVoxelConversionSettingsDraft = {
  selectedSourceAssetId: null,
  mode: 'solid',
  fitPolicy: 'contain',
  originPolicy: 'target_min',
  resolution: [8, 8, 8],
  voxelSize: 0.25,
  maxOutputVoxels: 1024,
  targetGrid: 1,
  targetVolumeAssetId: 'volume.studio-voxel-preview',
  targetOrigin: [0, 0, 0],
  meshPrimitive: 'primitive-0',
  materialMap: {
    defaultVoxelMaterial: 1,
    entries: [
      {
        sourceMaterialSlot: 0,
        sourceMaterialId: 'material.demo-copper',
        voxelMaterial: 1,
      },
    ],
  },
};

function voxelConversionSourceOptions(
  entries: readonly StudioAssetInventoryEntryReadModel[],
  selectedSourceAssetId: string | null,
): readonly StudioVoxelConversionSourceOption[] {
  return entries.map(entry => ({
    assetId: entry.assetId,
    label: `${entry.assetId} · ${entry.kind}`,
    kind: entry.kind,
    sourceHash: entry.devResolution?.sourceHash ?? null,
    supported: SUPPORTED_VOXEL_CONVERSION_SOURCE_KINDS.includes(entry.kind as 'static_mesh'),
    selected: entry.assetId === selectedSourceAssetId,
  }));
}

function voxelConversionSourceRef(
  selectedSource: StudioAssetInventoryEntryReadModel | null,
  draft: StudioVoxelConversionSettingsDraft,
): VoxelConversionSourceRef | null {
  if (selectedSource === null) {
    return null;
  }
  return {
    assetId: selectedSource.assetId,
    assetKind: selectedSource.kind,
    assetVersion: 1,
    sourceHash: selectedSource.devResolution?.sourceHash ?? '',
    meshPrimitive: draft.meshPrimitive,
  };
}

function voxelConversionTargetRef(draft: StudioVoxelConversionSettingsDraft): VoxelConversionTargetRef {
  return {
    grid: draft.targetGrid,
    volumeAssetId: draft.targetVolumeAssetId.trim().length === 0 ? null : draft.targetVolumeAssetId,
    origin: {
      x: draft.targetOrigin[0],
      y: draft.targetOrigin[1],
      z: draft.targetOrigin[2],
    },
  };
}

function voxelConversionSettings(draft: StudioVoxelConversionSettingsDraft): VoxelConversionSettings {
  return {
    mode: draft.mode,
    fitPolicy: draft.fitPolicy,
    originPolicy: draft.originPolicy,
    resolution: draft.resolution,
    voxelSize: draft.voxelSize,
    maxOutputVoxels: draft.maxOutputVoxels,
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    materialMap: draft.materialMap,
  };
}

function boundsLabel(
  bounds: {
    readonly min: { readonly x: number; readonly y: number; readonly z: number };
    readonly max: { readonly x: number; readonly y: number; readonly z: number };
  } | null,
): string {
  if (bounds === null) {
    return 'no preview bounds';
  }
  return `[${bounds.min.x},${bounds.min.y},${bounds.min.z}] to [${bounds.max.x},${bounds.max.y},${bounds.max.z}]`;
}

function buildVoxelConversionPreviewProjection(
  workspace: StudioVoxelConversionWorkspaceReadModel,
): StudioVoxelConversionPreviewProjectionReadModel {
  const status: StudioVoxelConversionPreviewProjectionReadModel['status'] =
    workspace.operations.preview.status === 'stale'
      ? 'stale'
      : workspace.preview === null
        ? 'unavailable'
        : 'projection_only';
  const previewHash = workspace.preview?.outputHash ?? null;
  const materialRows = workspace.settings.materialMap?.entries.map(entry => ({
    sourceMaterialSlot: entry.sourceMaterialSlot,
    sourceMaterialId: entry.sourceMaterialId,
    voxelMaterial: entry.voxelMaterial,
  })) ?? [];
  const states: readonly StudioVoxelConversionPreviewState[] = [
    {
      id: 'unavailable',
      label: 'Unavailable',
      active: status === 'unavailable',
      message: 'No upstream voxel preview evidence is available for the current inputs.',
    },
    {
      id: 'projection_only',
      label: 'Projection Only',
      active: status === 'projection_only',
      message: 'Browser/Three preview is display evidence only and is not conversion authority.',
    },
    {
      id: 'stale',
      label: 'Stale',
      active: status === 'stale',
      message: 'Preview evidence does not match the current source, settings, or material map.',
    },
  ];

  return {
    status,
    viewportLabel: status === 'projection_only'
      ? 'voxel preview projection only'
      : status === 'stale'
        ? 'stale voxel preview projection'
        : 'voxel preview unavailable',
    inputReadoutHash: workspace.readoutHash,
    previewHash,
    outputVoxelCount: workspace.preview?.outputVoxelCount ?? null,
    outputBoundsLabel: boundsLabel(workspace.preview?.outputBounds ?? null),
    materialMapStatus: workspace.settings.status,
    materialRows,
    states,
  };
}

function buildVoxelConversionWorkspaceShellReadModel(options: {
  readonly draft: StudioVoxelConversionSettingsDraft;
  readonly sourceOptions: readonly StudioVoxelConversionSourceOption[];
  readonly selectedSource: StudioAssetInventoryEntryReadModel | null;
  readonly sessionId: string;
  readonly expectedTimelineSequence: number;
}): StudioVoxelConversionWorkspaceShellReadModel {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: voxelConversionSourceRef(options.selectedSource, options.draft),
    target: voxelConversionTargetRef(options.draft),
    settings: voxelConversionSettings(options.draft),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const readout = buildStudioVoxelConversionReadoutModel({ workspace });
  const planProposal = buildStudioVoxelConversionPlanProposal({
    workspace,
    sessionId: options.sessionId,
    expectedTimelineSequence: options.expectedTimelineSequence,
    runtimeSession: null,
  });
  const previewProjection = buildVoxelConversionPreviewProjection(workspace);
  const operations = [
    workspace.operations.plan,
    workspace.operations.preview,
    workspace.operations.apply,
    workspace.operations.exportEvidence,
  ];
  const readinessReason = (commandId: StudioVoxelConversionCommandId): string => {
    const boundaryDiagnostic = readout.readiness.diagnostics.find(
      diagnostic => diagnostic.commandId === commandId,
    );
    if (boundaryDiagnostic !== undefined) {
      return boundaryDiagnostic.message;
    }
    const operation = operations.find(entry => entry.commandId === commandId);
    return operation === undefined
      ? 'Upstream voxel conversion capability is unavailable.'
      : firstDiagnosticMessage(operation.diagnostics, 'Operation is waiting for authority evidence.');
  };

  const states: readonly StudioVoxelConversionWorkspaceShellState[] = [
    {
      id: 'empty_inputs',
      label: 'Empty',
      active: workspace.status === 'incomplete',
      status: workspace.status,
      message: 'No source asset, target grid, or conversion settings are selected.',
    },
    {
      id: 'missing_capability',
      label: 'Missing capability',
      active: readout.status === 'failed_closed',
      status: readout.status,
      message: firstDiagnosticMessage(
        readout.readiness.diagnostics,
        'Asha runtime conversion operations are not available.',
      ),
    },
    {
      id: 'ready',
      label: 'Ready',
      active: workspace.status === 'ready' && readout.status === 'ready',
      status: workspace.status === 'ready' ? readout.status : 'pending',
      message: 'Enabled only after valid inputs and upstream authority operations are present.',
    },
  ];

  const regions: readonly StudioVoxelConversionWorkspaceShellRegion[] = [
    {
      id: 'source',
      label: 'Source',
      status: workspace.source.status,
      disabled: false,
      message: firstDiagnosticMessage(workspace.source.diagnostics, 'Source asset selected.'),
    },
    {
      id: 'settings',
      label: 'Settings',
      status: workspace.settings.status,
      disabled: false,
      message: firstDiagnosticMessage(workspace.settings.diagnostics, 'Conversion settings are valid.'),
    },
    {
      id: 'preview',
      label: 'Preview',
      status: workspace.operations.preview.status,
      disabled: true,
      message: firstDiagnosticMessage(
        workspace.operations.preview.diagnostics,
        'Preview awaits upstream authority evidence.',
      ),
    },
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      status: readout.status,
      disabled: false,
      message: `${readout.diagnostics.length} diagnostics, authority posture ${readout.authorityPosture}.`,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      status: operations.map(operation => operation.status).join(' / '),
      disabled: true,
      message: 'Plan, preview, apply, and export rows are reserved until proposals are enabled.',
    },
    {
      id: 'evidence',
      label: 'Evidence',
      status: workspace.operations.exportEvidence.status,
      disabled: true,
      message: firstDiagnosticMessage(
        workspace.operations.exportEvidence.diagnostics,
        'Evidence export awaits authority-produced refs.',
      ),
    },
  ];

  const actions: readonly StudioVoxelConversionWorkspaceShellAction[] = [
    {
      commandId: 'voxel_conversion.plan',
      label: 'Plan',
      disabled: true,
      reason: readinessReason('voxel_conversion.plan'),
    },
    {
      commandId: 'voxel_conversion.preview',
      label: 'Preview',
      disabled: true,
      reason: readinessReason('voxel_conversion.preview'),
    },
    {
      commandId: 'voxel_conversion.apply',
      label: 'Apply',
      disabled: true,
      reason: readinessReason('voxel_conversion.apply'),
    },
    {
      commandId: 'voxel_conversion.export_evidence',
      label: 'Export',
      disabled: true,
      reason: readinessReason('voxel_conversion.export_evidence'),
    },
  ];

  return {
    shellVersion: 'voxel-conversion-shell.v0',
    workspace,
    readout,
    sourceOptions: options.sourceOptions,
    settingsDraft: options.draft,
    planProposal,
    previewProjection,
    states,
    regions,
    actions,
    shellHash: `${workspace.readoutHash}:${readout.readoutHash}:${planProposal.accepted}:${previewProjection.status}`,
  };
}

function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function projectFileApiBase(): string {
  const configured = browserStorage()?.getItem('asha-studio.project-file-api') ?? null;
  if (configured !== null && configured.length > 0) {
    return configured.replace(/\/$/, '');
  }
  const locationLike = globalThis.location;
  const protocol = locationLike?.protocol ?? 'http:';
  const hostname = locationLike?.hostname ?? '127.0.0.1';
  return `${protocol}//${hostname}:4300`;
}

function normalizeProjectFilePath(path: string): string {
  return path
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function parentProjectDir(path: string): string {
  const normalized = normalizeProjectFilePath(path).replace(/\/$/, '');
  const slashIndex = normalized.lastIndexOf('/');
  return slashIndex <= 0 ? '' : normalized.slice(0, slashIndex);
}

function projectFileEntrySort(left: StudioProjectFileEntry, right: StudioProjectFileEntry): number {
  if (left.kind !== right.kind) {
    return left.kind === 'directory' ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
}

function browserReachableWebSocketEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      const pageHost = globalThis.location?.hostname;
      if (pageHost !== undefined && pageHost.length > 0 && pageHost !== '127.0.0.1' && pageHost !== 'localhost') {
        url.hostname = pageHost;
      }
    }
    return url.toString();
  } catch {
    return endpoint;
  }
}

function createBrowserDevtoolsTransport(endpoint: string): StudioDevtoolsAttachTransport {
  const browserEndpoint = browserReachableWebSocketEndpoint(endpoint);
  return {
    exchange: message => new Promise((resolveExchange, reject) => {
      const socket = new WebSocket(browserEndpoint);
      const timer = globalThis.setTimeout(() => {
        socket.close();
        reject(new Error(`Devtools websocket timed out: ${browserEndpoint}`));
      }, 5000);
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify(message));
      }, { once: true });
      socket.addEventListener('message', event => {
        globalThis.clearTimeout(timer);
        socket.close();
        try {
          resolveExchange(JSON.parse(String(event.data)));
        } catch (error) {
          reject(error);
        }
      }, { once: true });
      socket.addEventListener('error', () => {
        globalThis.clearTimeout(timer);
        reject(new Error(`Devtools websocket failed: ${browserEndpoint}`));
      }, { once: true });
    }),
  };
}

function tupleWithIndex(
  tuple: readonly [number, number, number],
  index: number,
  value: number,
): readonly [number, number, number] {
  return tuple.map((entry, entryIndex) => entryIndex === index ? value : entry) as [number, number, number];
}

function asVoxelConversionMode(value: string): VoxelConversionMode {
  return value === 'surface' ? 'surface' : 'solid';
}

function asVoxelConversionFitPolicy(value: string): VoxelConversionFitPolicy {
  if (value === 'cover' || value === 'stretch') {
    return value;
  }
  return 'contain';
}

function asVoxelConversionOriginPolicy(value: string): VoxelConversionOriginPolicy {
  if (value === 'source_origin' || value === 'centered') {
    return value;
  }
  return 'target_min';
}

@Injectable({ providedIn: 'root' })
export class StudioPreferencesStore {
  private readonly preferencesState = signal<StudioPreferencesReadModel>(
    buildStudioPreferencesReadModel(),
  );

  readonly preferences = this.preferencesState.asReadonly();
  readonly renderSettings = computed(() => this.preferencesState().render);

  setPreferences(preferences: StudioPreferencesReadModel): void {
    this.preferencesState.set(preferences);
  }

  setRenderSetting(key: StudioRenderSettingKey, value: boolean): void {
    this.preferencesState.set(updateStudioRenderSetting(this.preferencesState(), key, value));
  }
}

@Injectable({ providedIn: 'root' })
export class StudioWorkspaceStore {
  private readonly preferencesStore = inject(StudioPreferencesStore);
  private readonly workspaceState = signal<StudioWorkspaceReadModel>(
    buildInitialWorkspaceReadModel(),
  );
  private readonly viewportCameraState = signal<StudioViewportCameraReadModel>(
    buildStudioViewportCameraReadModel(),
  );
  private readonly viewportToolState = signal<StudioViewportToolReadModel>(
    buildStudioViewportToolReadModel(),
  );
  private readonly savedWorkspaceState = signal<string | null>(
    browserStorage()?.getItem(WORKSPACE_STORAGE_KEY) ?? null,
  );
  private readonly sceneFileSourcesState = signal<readonly StudioSceneFileSourceInput[]>(
    DEMO_SCENE_FILE_SOURCES,
  );
  private readonly activeSceneFilePathState = signal<string | null>(null);
  private readonly saveAsPathState = signal('scenes/studio-save-as.scene.json');
  private readonly projectFileEntriesState = signal<readonly StudioProjectFileEntry[]>([]);
  private readonly projectFileCurrentDirState = signal('');
  private readonly projectFileSelectedPathState = signal<string | null>(null);
  private readonly projectFileConnectedState = signal(false);
  private readonly projectFileRootState = signal<string | null>(null);
  private readonly projectFileMessageState = signal('Project file server not connected.');
  private readonly assetBrowserCategoryState = signal<StudioAssetBrowserCategory>('all');
  private readonly activeMenuState = signal<StudioApplicationMenu | null>(null);
  private readonly bottomPanelTabState = signal<StudioBottomPanelTab>('timeline');
  private readonly selectedScenarioDraftIdState = signal(this.workspaceState().session.scenarioId);
  private readonly hierarchyFilterState = signal('');
  private readonly viewportHitState = signal<StudioViewportHitReadModel | null>(null);
  private readonly menuMessageState = signal('Workspace ready.');
  private readonly gameWorkspaceState = signal<StudioGameWorkspaceLoadResult>(
    loadDemoGameWorkspace(),
  );
  private readonly runtimeAttachState = signal<StudioGameWorkspaceAttachReadModel | null>(null);
  private readonly runtimeLiveState = signal<StudioGameWorkspaceLiveReadModel | null>(null);
  private readonly runtimeSessionFacadeState = signal<RuntimeSessionFacade | null>(null);
  private readonly runtimeSessionStateSummaryState = signal<RuntimeSessionStateSummary | null>(null);
  private readonly runtimeSessionProjectionState = signal<RuntimeSessionProjectionSummary | null>(null);
  private readonly runtimeSessionTelemetryState = signal<RuntimeSessionTelemetrySummary | null>(null);
  private readonly runtimeSessionPausedState = signal(false);
  private readonly generatedLevelPresetDraftState = signal<StudioGeneratedLevelPresetDraft>({
    presetId: 'tiny-enclosed',
    seed: 17,
  });
  private readonly generatedTunnelReadoutState = signal<GeneratedTunnelReadout | null>(null);
  private readonly generatedTunnelRegenerateReceiptState = signal<RuntimeSessionGeneratedTunnelOperationReceipt | null>(null);
  private readonly generatedTunnelNavProjectionState = signal<NavProjectionReadout | null>(null);
  private readonly gameplayPresetDraftState = signal<StudioFpsGameplayPresetDraft>(
    buildDefaultStudioFpsGameplayPresetDraft(),
  );
  private readonly playableLoopEncounterDirectorState = signal<EncounterDirectorReadout | null>(null);
  private readonly playableLoopEncounterTransitionReceiptState = signal<RuntimeSessionEncounterTransitionReceipt | null>(null);
  private readonly playableLoopCombatFeedbackProjectionState = signal<CombatFeedbackProjection | null>(null);
  private readonly playableLoopPolicyTickState = signal<RuntimeSessionAutonomousPolicyTickReadout | null>(null);
  private readonly playableLoopLifecycleState = signal<RuntimeSessionLifecycleStatusReadout | null>(null);
  private readonly playableLoopRestartReceiptState = signal<RuntimeSessionLifecycleRestartReceipt | null>(null);
  private readonly runtimeConnectionMessageState = signal('No running project connected.');
  private readonly catalogPathState = signal('packages/game-catalogs/catalog.json');
  private readonly catalogSourceState = signal<AshaGameAssetCatalog>(catalogFromInventoryArtifact());
  private readonly selectedCatalogWorkflowAssetIdState = signal<string | null>('mesh.demo-cube');
  private readonly catalogSourceEvidenceState = signal<readonly StudioCatalogSourceEvidenceInput[]>(
    DEMO_ASSET_INVENTORY_ARTIFACT.entries.map(entry => ({
      path: entry.sourcePath,
      exists: true,
      hash: entry.devResolution.sourceHash,
    })),
  );
  private readonly catalogWorkflowMessageState = signal('Catalog workflow ready.');
  private readonly assetInventoryState = signal<StudioAssetInventoryLoadResult>(
    loadDemoAssetInventory(),
  );
  private readonly proofScenesState = signal<StudioProofSceneListLoadResult>(
    loadDemoProofScenes(this.gameWorkspaceState(), this.assetInventoryState()),
  );
  private readonly voxelConversionDraftState = signal<StudioVoxelConversionSettingsDraft>(
    DEFAULT_VOXEL_CONVERSION_DRAFT,
  );

  readonly workspace = this.workspaceState.asReadonly();
  readonly viewportCamera = this.viewportCameraState.asReadonly();
  readonly viewportTool = this.viewportToolState.asReadonly();
  readonly preferences = this.preferencesStore.preferences;
  readonly renderSettings = this.preferencesStore.renderSettings;
  readonly savedWorkspace = this.savedWorkspaceState.asReadonly();
  readonly activeSceneFilePath = this.activeSceneFilePathState.asReadonly();
  readonly saveAsPath = this.saveAsPathState.asReadonly();
  readonly projectFileDialog = computed<StudioProjectFileDialogReadModel>(() => {
    const fallbackFiles = this.sceneFiles().files.map((file): StudioProjectFileEntry => ({
      path: file.path,
      name: file.path.split('/').at(-1) ?? file.path,
      kind: 'file',
      size: null,
      mtimeMs: null,
    }));
    return {
      backend: this.projectFileConnectedState() ? 'project-server' : 'fallback',
      connected: this.projectFileConnectedState(),
      projectRoot: this.projectFileRootState(),
      currentDir: this.projectFileCurrentDirState(),
      entries: this.projectFileConnectedState() ? this.projectFileEntriesState() : fallbackFiles,
      selectedPath: this.projectFileSelectedPathState(),
      message: this.projectFileMessageState(),
    };
  });
  readonly assetBrowserCategory = this.assetBrowserCategoryState.asReadonly();
  readonly activeMenu = this.activeMenuState.asReadonly();
  readonly bottomPanelTab = this.bottomPanelTabState.asReadonly();
  readonly selectedScenarioDraftId = this.selectedScenarioDraftIdState.asReadonly();
  readonly hierarchyFilter = this.hierarchyFilterState.asReadonly();
  readonly viewportHit = this.viewportHitState.asReadonly();
  readonly menuMessage = this.menuMessageState.asReadonly();
  readonly gameWorkspaceOverview = this.gameWorkspaceState.asReadonly();
  readonly runtimeConnectionMessage = this.runtimeConnectionMessageState.asReadonly();
  readonly catalogWorkflowMessage = this.catalogWorkflowMessageState.asReadonly();
  readonly assetInventory = this.assetInventoryState.asReadonly();
  readonly proofScenes = this.proofScenesState.asReadonly();
  readonly gameWorkspace = computed(() => {
    const overview = this.gameWorkspaceState();
    return overview.ok ? overview.workspace : null;
  });
  readonly sceneFiles = computed<StudioSceneFileListReadModel>(() => {
    const result = buildStudioSceneFileList({
      workspace: this.gameWorkspace(),
      manifestPath: 'asha.game.toml',
      manifestHash: this.gameWorkspace()?.workspaceHash ?? null,
      sourceFiles: this.sceneFileSourcesState(),
      allowProjectRoot: this.projectFileConnectedState(),
    });
    return result.sceneFiles;
  });
  readonly publishEvidence = computed(() =>
    loadStudioPublishEvidence(DEMO_PUBLISH_EVIDENCE, {
      workspace: this.gameWorkspace(),
      evidencePath: 'harness/out/publish-evidence/latest/index.json',
    }),
  );
  readonly runtimeSessions = computed(() => {
    const workspace = this.gameWorkspace();
    return workspace === null
      ? null
      : buildStudioRuntimeSessionList({
          workspace,
          attach: this.runtimeAttachState(),
          live: this.runtimeLiveState(),
        });
  });
  readonly runtimeSessionInspection = computed<StudioRuntimeSessionInspectionReadModel>(() =>
    buildStudioRuntimeSessionInspectionReadModel({
      workspace: this.workspaceState(),
      gameWorkspace: this.gameWorkspace(),
      runtimeSessions: this.runtimeSessions(),
      state: this.runtimeSessionStateSummaryState(),
      projection: this.runtimeSessionProjectionState(),
      telemetry: this.runtimeSessionTelemetryState(),
      autonomousPolicyTick: this.playableLoopPolicyTickState(),
      lifecycleStatus: this.playableLoopLifecycleState(),
      restartReceipt: this.playableLoopRestartReceiptState(),
      generatedLevelPreset: this.generatedLevelPresetDraftState(),
      generatedTunnelReadout: this.generatedTunnelReadoutState(),
      generatedTunnelRegenerateReceipt: this.generatedTunnelRegenerateReceiptState(),
      navProjection: this.generatedTunnelNavProjectionState(),
      gameplayPresetDraft: this.gameplayPresetDraftState(),
      encounterDirector: this.playableLoopEncounterDirectorState(),
      encounterTransitionReceipt: this.playableLoopEncounterTransitionReceiptState(),
      combatFeedbackProjection: this.playableLoopCombatFeedbackProjectionState(),
      paused: this.runtimeSessionPausedState(),
    }),
  );
  readonly ashaDemoProductPath = computed<StudioAshaDemoProductPathReadModel>(() =>
    buildStudioAshaDemoProductPathReadModel({
      gameWorkspace: this.gameWorkspace(),
      runtimeInspection: this.runtimeSessionInspection(),
    }),
  );
  readonly runningProjectDiscovery = computed<StudioRunningProjectDiscoveryReadModel>(() =>
    buildStudioRunningProjectDiscovery({
      workspace: this.gameWorkspace(),
      runtimeSessions: this.runtimeSessions(),
    }),
  );
  readonly catalogWorkflow = computed<StudioCatalogWorkflowReadModel>(() =>
    buildStudioCatalogWorkflowReadModel({
      workspace: this.gameWorkspace(),
      catalogPath: this.catalogPathState(),
      catalog: this.catalogSourceState(),
      catalogHash: studioCatalogAuthoringBaseHash(this.catalogSourceState()),
      selectedAssetId: this.selectedCatalogWorkflowAssetIdState(),
      sourceEvidence: this.catalogSourceEvidenceState(),
      referencedRenderableIds: demoReferencedRenderableIds(),
    }),
  );
  readonly commandProposalPanel = computed(() => {
    const workspace = this.gameWorkspace();
    const runtimeSessions = this.runtimeSessions();
    return workspace === null || runtimeSessions === null
      ? null
      : buildStudioCommandProposalPanel({
          workspace,
          runtimeSessions,
          commandProposals: buildDemoCommandProposalRows(workspace),
        });
  });
  readonly voxelConversionWorkspaceShell = computed<StudioVoxelConversionWorkspaceShellReadModel>(() => {
    const draft = this.voxelConversionDraftState();
    const assetInventory = this.assetInventoryState().inventory;
    const assetEntries = assetInventory?.entries ?? [];
    const sourceOptions = voxelConversionSourceOptions(assetEntries, draft.selectedSourceAssetId);
    const selectedSource = assetEntries.find(entry => entry.assetId === draft.selectedSourceAssetId) ?? null;
    return buildVoxelConversionWorkspaceShellReadModel({
      draft,
      sourceOptions,
      selectedSource,
      sessionId: this.workspaceState().session.sessionId,
      expectedTimelineSequence: this.workspaceState().timelineSequence + 1,
    });
  });
  readonly workspaceCockpitEvidence = computed(() => {
    const assetInventory = this.assetInventoryState().inventory;
    const proofScenes = this.proofScenesState().proofScenes;
    return exportStudioWorkspaceCockpitEvidence({
      studioWorkspace: this.workspaceState(),
      gameWorkspace: this.gameWorkspace(),
      assetInventory,
      proofScenes,
      runtimeSessions: this.runtimeSessions(),
      commandProposalPanel: this.commandProposalPanel(),
      publishEvidence: this.publishEvidence().publishEvidence,
      visiblePanelMarkers: [
        'studio-game-workspace-overview',
        'studio-assets-panel',
        'studio-proof-scene-panel',
        'studio-runtime-session-panel',
        'studio-command-proposal-panel',
        'studio-publish-evidence-panel',
      ],
    });
  });

  constructor() {
    void this.refreshProjectFiles('');
  }

  readonly selectedEntity = computed(() => {
    const workspace = this.workspaceState();
    return (
      workspace.entities.find(entity => entity.id === workspace.selectedEntityId) ??
      null
    );
  });

  readonly selectedRenderable = computed(() => {
    const workspace = this.workspaceState();
    return (
      workspace.scene.renderables.find(
        renderable => renderable.renderableId === workspace.scene.selectedRenderableId,
      ) ?? null
    );
  });

  readonly selectedSceneObjectTransformEditable = computed(() => {
    const workspace = this.workspaceState();
    const selectedEntity = workspace.entities.find(entity => entity.id === workspace.selectedEntityId);
    if (selectedEntity?.sceneObjectId === null || selectedEntity?.sceneObjectId === undefined) {
      return false;
    }
    return (
      workspace.sceneObjectSnapshot.objects.find(
        object => object.objectId === selectedEntity.sceneObjectId,
      )?.editability.transform ?? false
    );
  });

  readonly assetRenderables = computed(() => {
    const workspace = this.workspaceState();
    return filterAssetBrowserRenderables(
      workspace.scene.renderables,
      this.assetBrowserCategoryState(),
    );
  });

  readonly assetBrowserCategories = computed(() =>
    buildAssetBrowserCategories(this.workspaceState().scene.renderables).map(category => {
      const inventory = this.assetInventoryState();
      if (!inventory.ok || category.category === 'generated' || category.category === 'preview') {
        return category;
      }
      const count = category.category === 'all'
        ? inventory.inventory.entries.length
        : inventory.inventory.entries.filter(entry => {
            if (category.category === 'static_meshes') {
              return entry.kind === 'static_mesh';
            }
            if (category.category === 'materials') {
              return entry.kind === 'material';
            }
            return entry.kind === 'texture';
          }).length;
      return { ...category, count };
    }),
  );

  readonly assetBrowserSummary = computed(() => {
    const category = this.assetBrowserCategoryState();
    const matchingCategory = this.assetBrowserCategories().find(item => item.category === category);
    return `${matchingCategory?.label ?? 'Assets'} · ${this.assetRenderables().length}`;
  });

  readonly catalogAssetEntries = computed(() => {
    const inventory = this.assetInventoryState();
    if (!inventory.ok && inventory.inventory === null) {
      return [];
    }
    const entries = inventory.inventory?.entries ?? [];
    return entries.filter(entry => this.catalogAssetMatchesCategory(entry));
  });

  readonly latestTimelineEntry = computed(() => {
    const workspace = this.workspaceState();
    return workspace.timeline.at(-1) ?? null;
  });

  readonly readbackMarker = computed(() => {
    const workspace = this.workspaceState();
    return `${workspace.session.sessionId}:${workspace.scene.sceneHash}:${workspace.timelineSequence}`;
  });

  readonly viewportAdapter = computed(() =>
    buildStudioViewportAdapterReadModel({
      scene: this.workspaceState().scene,
      camera: this.viewportCameraState(),
      tool: this.viewportToolState(),
      renderSettings: this.preferencesStore.renderSettings(),
    }),
  );

  readonly compactAgentReadout = computed(() =>
    createStudioCompactAgentReadout({
      workspace: this.workspaceState(),
      renderSettings: this.preferencesStore.renderSettings(),
      viewportCamera: this.viewportCameraState(),
      viewportTool: this.viewportToolState(),
      uiState: this.uiState(),
      latestViewportHit: this.viewportHitState(),
    }),
  );

  readonly viewportReadout = computed(() =>
    buildStudioViewportReadout({
      camera: this.viewportCameraState(),
      tool: this.viewportToolState(),
    }),
  );

  readonly gameWorkspaceReadout = computed<StudioGameWorkspaceReadout | null>(() => {
    const workspace = this.gameWorkspace();
    return workspace === null ? null : buildStudioGameWorkspaceReadout(workspace);
  });

  readonly uiState = computed(() =>
    buildStudioUiStateReadModel({
      activeMenu: this.activeMenuState(),
      bottomPanelTab: this.bottomPanelTabState(),
      assetBrowserCategory: this.assetBrowserCategoryState(),
      entities: this.workspaceState().entities,
      selectedScenarioDraftId: this.selectedScenarioDraftIdState(),
      hierarchyFilter: this.hierarchyFilterState(),
      menuMessage: this.menuMessageState(),
      savedWorkspaceAvailable: this.savedWorkspaceState() !== null,
    }),
  );

  selectEntity(entityId: string): void {
    const workspace = this.workspaceState();
    const intent = createSelectEntityIntent(workspace, entityId);
    const dispatchResult = mapStudioIntentToCommand(intent);

    if (!dispatchResult.accepted || dispatchResult.proposal === null) {
      return;
    }
    if (dispatchResult.proposal.commandId !== 'selection.set_active_entity' || dispatchResult.proposal.entityId === undefined) {
      return;
    }

    this.workspaceState.set(
      applySelectedEntityReadModel(workspace, dispatchResult.proposal.entityId),
    );
  }

  renameSceneObject(objectId: SceneObjectId, label: string): void {
    const workspace = this.workspaceState();
    const request = createRenameSceneObjectRequest(workspace, objectId, label);
    const dispatchResult = mapStudioIntentToCommand(createSceneObjectCommandIntent(workspace, request));
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.apply_object_command'
      || dispatchResult.proposal.request === undefined
    ) {
      return;
    }
    const applyResult = applySceneObjectCommandReadModel(workspace, dispatchResult.proposal.request);
    this.workspaceState.set(applyResult.workspace);
    this.menuMessageState.set(
      applyResult.ok ? `Renamed ${objectId}.` : applyResult.diagnostics.at(0)?.message ?? 'Rename rejected.',
    );
  }

  reparentSceneObject(objectId: SceneObjectId, parentObjectId: SceneObjectId | null, childOrder = 0): void {
    const workspace = this.workspaceState();
    const request = createReparentSceneObjectRequest(workspace, objectId, parentObjectId, childOrder);
    const dispatchResult = mapStudioIntentToCommand(createSceneObjectCommandIntent(workspace, request));
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.apply_object_command'
      || dispatchResult.proposal.request === undefined
    ) {
      return;
    }
    const applyResult = applySceneObjectCommandReadModel(workspace, dispatchResult.proposal.request);
    this.workspaceState.set(applyResult.workspace);
    this.menuMessageState.set(
      applyResult.ok ? `Reparented ${objectId}.` : applyResult.diagnostics.at(0)?.message ?? 'Reparent rejected.',
    );
  }

  translateSelectedSceneObject(delta: readonly [number, number, number]): void {
    const workspace = this.workspaceState();
    const objectId = workspace.selectedEntityId;
    if (objectId === null || !objectId.startsWith('scene-node:')) {
      this.menuMessageState.set('Select a scene object before moving it.');
      return;
    }
    const request = createTranslateSceneObjectRequest(workspace, objectId as SceneObjectId, delta);
    const dispatchResult = mapStudioIntentToCommand(createSceneObjectCommandIntent(workspace, request));
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.apply_object_command'
      || dispatchResult.proposal.request === undefined
    ) {
      return;
    }
    const applyResult = applySceneObjectCommandReadModel(workspace, dispatchResult.proposal.request);
    this.workspaceState.set(applyResult.workspace);
    this.menuMessageState.set(
      applyResult.ok ? `Moved ${objectId}.` : applyResult.diagnostics.at(0)?.message ?? 'Move rejected.',
    );
  }

  rotateSelectedSceneObject(rotation: readonly [number, number, number, number]): void {
    const workspace = this.workspaceState();
    const objectId = workspace.selectedEntityId;
    if (objectId === null || !objectId.startsWith('scene-node:')) {
      this.menuMessageState.set('Select a scene object before rotating it.');
      return;
    }
    const request = createRotateSceneObjectRequest(workspace, objectId as SceneObjectId, rotation);
    const dispatchResult = mapStudioIntentToCommand(createSceneObjectCommandIntent(workspace, request));
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.apply_object_command'
      || dispatchResult.proposal.request === undefined
    ) {
      return;
    }
    const applyResult = applySceneObjectCommandReadModel(workspace, dispatchResult.proposal.request);
    this.workspaceState.set(applyResult.workspace);
    this.menuMessageState.set(
      applyResult.ok ? `Rotated ${objectId}.` : applyResult.diagnostics.at(0)?.message ?? 'Rotate rejected.',
    );
  }

  selectViewportHit(hit: StudioViewportHitReadModel): void {
    this.viewportHitState.set(hit);
    const workspace = this.workspaceState();
    const linkedEntity = workspace.entities.find(entity => entity.renderableId === hit.renderableId);
    this.selectEntity(linkedEntity?.id ?? hit.renderableId);
    const voxelLabel =
      hit.voxelCoord === null
        ? 'no voxel'
        : `voxel ${hit.voxelCoord.x},${hit.voxelCoord.y},${hit.voxelCoord.z}`;
    this.menuMessageState.set(`Selected ${hit.renderableId} · ${hit.face} · ${voxelLabel}.`);
  }

  selectAssetRenderable(renderableId: string): void {
    const workspace = this.workspaceState();
    const linkedEntity = workspace.entities.find(entity => entity.renderableId === renderableId);
    if (linkedEntity === undefined) {
      this.menuMessageState.set(`Asset ${renderableId} is not linked to a selectable scene entity.`);
      return;
    }
    this.selectEntity(linkedEntity.id);
    this.menuMessageState.set(`Asset ${renderableId} selected for inspection.`);
  }

  selectCatalogAsset(assetId: string): void {
    const asset = this.catalogAssetEntries().find(entry => entry.assetId === assetId) ?? null;
    if (asset === null) {
      this.menuMessageState.set(`Catalog asset ${assetId} is not available.`);
      return;
    }
    const renderableId = asset.referencedRenderableIds.at(0) ?? null;
    if (renderableId !== null) {
      this.selectAssetRenderable(renderableId);
      this.menuMessageState.set(`Catalog asset ${assetId} selected with renderable ${renderableId}.`);
      return;
    }
    this.menuMessageState.set(`Catalog asset ${assetId} selected; no scene renderable reference.`);
  }

  selectCatalogWorkflowAsset(assetId: string): void {
    this.selectedCatalogWorkflowAssetIdState.set(assetId);
    this.catalogWorkflowMessageState.set(`Catalog asset ${assetId} selected.`);
  }

  createCatalogSource(path = 'packages/game-catalogs/catalog.json'): void {
    const normalizedPath = normalizeProjectFilePath(path);
    const catalog: AshaGameAssetCatalog = { schemaVersion: 1, entries: [] };
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: 'catalog.create_source',
      label: 'Create Catalog Source',
      inputSummary: `path=${normalizedPath}`,
      outputSummary: 'Empty catalog source created locally.',
    });
    this.workspaceState.set(recorded.workspace);
    this.catalogPathState.set(normalizedPath);
    this.catalogSourceState.set(catalog);
    this.selectedCatalogWorkflowAssetIdState.set(null);
    this.catalogSourceEvidenceState.set([]);
    this.syncAssetInventoryFromCatalog();
    this.catalogWorkflowMessageState.set(`Created catalog ${normalizedPath}.`);
  }

  async loadCatalogSource(path = this.catalogPathState()): Promise<void> {
    const normalizedPath = normalizeProjectFilePath(path);
    try {
      const readback = await this.readProjectText(normalizedPath);
      const parsed = JSON.parse(readback.text) as AshaGameAssetCatalog;
      if (!Array.isArray(parsed.entries) || parsed.schemaVersion !== 1) {
        throw new Error('invalid catalog schema');
      }
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'catalog.load_source',
        label: 'Load Catalog Source',
        inputSummary: `path=${normalizedPath}`,
        outputSummary: `Catalog source ${normalizedPath} loaded.`,
      });
      this.workspaceState.set(recorded.workspace);
      this.catalogPathState.set(normalizeProjectFilePath(readback.path));
      this.catalogSourceState.set(parsed);
      this.selectedCatalogWorkflowAssetIdState.set(parsed.entries.at(0)?.id ?? null);
      this.syncAssetInventoryFromCatalog();
      this.catalogWorkflowMessageState.set(`Loaded catalog ${normalizedPath}.`);
    } catch {
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'catalog.load_source',
        label: 'Load Catalog Source',
        inputSummary: `path=${normalizedPath}`,
        outputSummary: `Catalog source ${normalizedPath} could not be loaded.`,
        status: 'rejected',
      });
      this.workspaceState.set(recorded.workspace);
      this.catalogWorkflowMessageState.set(`Could not load catalog ${normalizedPath}.`);
    }
  }

  async saveCatalogSource(): Promise<void> {
    const path = this.catalogPathState();
    const text = `${JSON.stringify(this.catalogSourceState(), null, 2)}\n`;
    try {
      let persistedHash = stableBrowserHash(text);
      if (this.projectFileConnectedState()) {
        const response = await fetch(`${projectFileApiBase()}/api/project/file`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path, text }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json() as { readonly ok?: boolean; readonly sha256?: string; readonly diagnostic?: string };
        if (payload.ok === false) {
          throw new Error(payload.diagnostic ?? 'catalog write rejected');
        }
        persistedHash = payload.sha256 ?? persistedHash;
        await this.refreshProjectFiles(parentProjectDir(path));
      }
      this.syncAssetInventoryFromCatalog(persistedHash);
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'catalog.save_source',
        label: 'Save Catalog Source',
        inputSummary: `path=${path}`,
        outputSummary: `Catalog source ${path} saved.`,
      });
      this.workspaceState.set(recorded.workspace);
      this.catalogWorkflowMessageState.set(`Saved catalog ${path}.`);
    } catch {
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'catalog.save_source',
        label: 'Save Catalog Source',
        inputSummary: `path=${path}`,
        outputSummary: `Catalog source ${path} could not be saved.`,
        status: 'rejected',
      });
      this.workspaceState.set(recorded.workspace);
      this.catalogWorkflowMessageState.set(`Could not save catalog ${path}.`);
    }
  }

  linkCatalogAsset(kind: AshaGameAssetKind = 'material'): void {
    const catalog = this.catalogSourceState();
    const suffix = catalog.entries.length + 1;
    const assetId = `${kind === 'static_mesh' ? 'mesh' : kind}.studio-linked-${suffix}`;
    const sourceSuffix = kind === 'static_mesh' ? 'mesh' : kind;
    const entry: AshaGameAssetCatalogEntry = {
      id: assetId,
      kind,
      source: `assets/${kind === 'static_mesh' ? 'meshes' : `${kind}s`}/studio-linked-${suffix}.${sourceSuffix}.json`,
      importProfile: importProfileForKind(kind),
      importMetadata: {
        sourceHash: 'sha256:pending',
        cacheKey: `dev-cache/${kind}/${assetId}`,
        generatedArtifactVersion: 'asset-import.v1',
      },
      dependencies: kind === 'static_mesh' && catalog.entries.some(candidate => candidate.kind === 'material')
        ? [catalog.entries.find(candidate => candidate.kind === 'material')?.id ?? '']
        : [],
      publish: {
        include: false,
        outputKey: `${kind === 'static_mesh' ? 'meshes' : `${kind}s`}/studio-linked-${suffix}.${sourceSuffix}.json`,
      },
      diagnostics: {
        owner: 'asha-studio',
        notes: ['linked from Studio catalog workflow'],
      },
    };
    this.applyCatalogOperation('catalog.link_asset', {
      kind: 'create_catalog_entry',
      entry: { ...entry, dependencies: (entry.dependencies ?? []).filter(Boolean) },
    });
  }

  updateSelectedCatalogAssetSource(sourcePath: string): void {
    const assetId = this.catalogWorkflow().selectedAssetId;
    if (assetId === null) {
      this.catalogWorkflowMessageState.set('Select a catalog asset before updating it.');
      return;
    }
    this.applyCatalogOperation('catalog.update_asset', {
      kind: 'update_catalog_entry',
      assetId,
      patch: { source: normalizeProjectFilePath(sourcePath) },
    });
  }

  removeSelectedCatalogAsset(): void {
    const assetId = this.catalogWorkflow().selectedAssetId;
    if (assetId === null) {
      this.catalogWorkflowMessageState.set('Select a catalog asset before removing it.');
      return;
    }
    this.applyCatalogOperation('catalog.remove_asset', { kind: 'remove_catalog_entry', assetId });
  }

  async validateCatalogSource(): Promise<void> {
    const evidence: StudioCatalogSourceEvidenceInput[] = [];
    if (this.projectFileConnectedState()) {
      for (const entry of this.catalogSourceState().entries) {
        try {
          const readback = await this.readProjectText(entry.source);
          evidence.push({ path: entry.source, exists: true, hash: readback.sha256 });
        } catch {
          evidence.push({ path: entry.source, exists: false, hash: null });
        }
      }
    } else {
      evidence.push(...this.catalogSourceEvidenceState());
    }
    this.catalogSourceEvidenceState.set(evidence);
    const workflow = buildStudioCatalogWorkflowReadModel({
      workspace: this.gameWorkspace(),
      catalogPath: this.catalogPathState(),
      catalog: this.catalogSourceState(),
      catalogHash: studioCatalogAuthoringBaseHash(this.catalogSourceState()),
      selectedAssetId: this.selectedCatalogWorkflowAssetIdState(),
      sourceEvidence: evidence,
      referencedRenderableIds: demoReferencedRenderableIds(),
    });
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: 'catalog.validate_source',
      label: 'Validate Catalog Source',
      inputSummary: `path=${this.catalogPathState()};entries=${workflow.entryCount}`,
      outputSummary: workflow.diagnostics.length === 0
        ? 'Catalog validation passed.'
        : `${workflow.diagnostics.length} catalog diagnostics.`,
      status: workflow.diagnostics.length === 0 ? 'ok' : 'rejected',
    });
    this.workspaceState.set(recorded.workspace);
    this.catalogWorkflowMessageState.set(
      workflow.diagnostics.length === 0 ? 'Catalog validation passed.' : `${workflow.diagnostics.length} catalog diagnostics.`,
    );
  }

  setViewportTool(activeTool: StudioViewportToolMode): void {
    this.viewportToolState.set(buildStudioViewportToolReadModel(activeTool));
  }

  setViewportCamera(camera: StudioViewportCameraReadModel): void {
    this.viewportCameraState.set(camera);
  }

  orbitViewportCamera(delta: StudioViewportCameraControlDelta): void {
    this.viewportCameraState.set(orbitStudioViewportCamera(this.viewportCameraState(), delta));
  }

  panViewportCamera(delta: StudioViewportCameraControlDelta): void {
    this.viewportCameraState.set(panStudioViewportCamera(this.viewportCameraState(), delta));
  }

  zoomViewportCamera(wheelDeltaY: number): void {
    this.viewportCameraState.set(zoomStudioViewportCamera(this.viewportCameraState(), wheelDeltaY));
  }

  frameViewportCamera(): void {
    this.viewportCameraState.set(frameStudioViewportCamera(this.workspaceState().scene));
  }

  frameSelectedRenderable(): void {
    const workspace = this.workspaceState();
    const selectedRenderable =
      workspace.scene.selectedRenderableId === null
        ? null
        : workspace.scene.renderables.find(
            renderable =>
              renderable.renderableId === workspace.scene.selectedRenderableId && renderable.visible,
          ) ?? null;
    this.viewportCameraState.set(
      frameStudioViewportCameraOnRenderable(workspace.scene, workspace.scene.selectedRenderableId),
    );
    this.menuMessageState.set(
      selectedRenderable === null ? 'Scene framed; no selected renderable.' : 'Selected renderable framed.',
    );
  }

  addReferenceRenderable(): void {
    const intent = createLoadReferenceAssetIntent(this.workspaceState());
    const dispatchResult = mapStudioIntentToCommand(intent);
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.load_asset'
      || dispatchResult.proposal.assetId !== 'static-mesh:reference-placeholder'
    ) {
      this.menuMessageState.set(dispatchResult.diagnostic ?? 'Reference asset load rejected.');
      return;
    }
    const workspace = addReferenceRenderableReadModel(this.workspaceState());
    this.workspaceState.set(workspace);
    this.viewportCameraState.set(
      frameStudioViewportCameraOnRenderable(workspace.scene, workspace.scene.selectedRenderableId),
    );
    this.menuMessageState.set('Reference placeholder added.');
  }

  setHierarchyExpanded(expanded: boolean): void {
    this.workspaceState.set(setHierarchyExpansionReadModel(this.workspaceState(), expanded));
    this.menuMessageState.set(expanded ? 'Hierarchy expanded.' : 'Hierarchy collapsed.');
  }

  setAssetBrowserCategory(category: StudioAssetBrowserCategory): void {
    this.assetBrowserCategoryState.set(category);
    const matchingCategory = this.assetBrowserCategories().find(item => item.category === category);
    this.menuMessageState.set(`${matchingCategory?.label ?? 'Assets'} filter selected.`);
  }

  setActiveMenu(menu: StudioApplicationMenu | null): void {
    this.activeMenuState.set(menu);
  }

  toggleActiveMenu(menu: StudioApplicationMenu): void {
    this.activeMenuState.set(this.activeMenuState() === menu ? null : menu);
  }

  setBottomPanelTab(tab: StudioBottomPanelTab): void {
    this.bottomPanelTabState.set(tab);
  }

  setVoxelConversionSourceAsset(assetId: string): void {
    const selectedSourceAssetId = assetId.length === 0 ? null : assetId;
    this.voxelConversionDraftState.update(draft => ({ ...draft, selectedSourceAssetId }));
    this.menuMessageState.set(
      selectedSourceAssetId === null
        ? 'Voxel conversion source cleared.'
        : `Voxel conversion source set to ${selectedSourceAssetId}.`,
    );
  }

  setVoxelConversionMode(mode: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      mode: asVoxelConversionMode(mode),
    }));
  }

  setVoxelConversionFitPolicy(fitPolicy: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      fitPolicy: asVoxelConversionFitPolicy(fitPolicy),
    }));
  }

  setVoxelConversionOriginPolicy(originPolicy: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      originPolicy: asVoxelConversionOriginPolicy(originPolicy),
    }));
  }

  setVoxelConversionResolutionAxis(axis: number, value: number): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      resolution: tupleWithIndex(draft.resolution, axis, value),
    }));
  }

  setVoxelConversionTargetOriginAxis(axis: number, value: number): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      targetOrigin: tupleWithIndex(draft.targetOrigin, axis, value),
    }));
  }

  setVoxelConversionVoxelSize(voxelSize: number): void {
    this.voxelConversionDraftState.update(draft => ({ ...draft, voxelSize }));
  }

  setVoxelConversionMaxOutputVoxels(maxOutputVoxels: number): void {
    this.voxelConversionDraftState.update(draft => ({ ...draft, maxOutputVoxels }));
  }

  setVoxelConversionTargetGrid(targetGrid: number): void {
    this.voxelConversionDraftState.update(draft => ({ ...draft, targetGrid }));
  }

  setVoxelConversionTargetVolumeAssetId(targetVolumeAssetId: string): void {
    this.voxelConversionDraftState.update(draft => ({ ...draft, targetVolumeAssetId }));
  }

  setVoxelConversionMeshPrimitive(meshPrimitive: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      meshPrimitive: meshPrimitive.trim().length === 0 ? null : meshPrimitive,
    }));
  }

  setVoxelConversionDefaultMaterial(value: string): void {
    const defaultVoxelMaterial = value.trim().length === 0 ? null : Number(value);
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      materialMap: { ...draft.materialMap, defaultVoxelMaterial },
    }));
  }

  setVoxelConversionMaterialSourceSlot(sourceMaterialSlot: number): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      materialMap: {
        ...draft.materialMap,
        entries: [
          {
            ...(draft.materialMap.entries[0] ?? {
              sourceMaterialId: null,
              voxelMaterial: 1,
            }),
            sourceMaterialSlot,
          },
        ],
      },
    }));
  }

  setVoxelConversionMaterialSourceId(sourceMaterialId: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      materialMap: {
        ...draft.materialMap,
        entries: [
          {
            ...(draft.materialMap.entries[0] ?? {
              sourceMaterialSlot: 0,
              voxelMaterial: 1,
            }),
            sourceMaterialId: sourceMaterialId.trim().length === 0 ? null : sourceMaterialId,
          },
        ],
      },
    }));
  }

  setVoxelConversionMaterialVoxelId(voxelMaterial: number): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      materialMap: {
        ...draft.materialMap,
        entries: [
          {
            ...(draft.materialMap.entries[0] ?? {
              sourceMaterialSlot: 0,
              sourceMaterialId: null,
            }),
            voxelMaterial,
          },
        ],
      },
    }));
  }

  setSelectedScenarioDraft(scenarioId: string): void {
    this.selectedScenarioDraftIdState.set(scenarioId);
  }

  async attachRuntimeSessionInspection(): Promise<void> {
    const workspace = this.gameWorkspace();
    if (workspace === null) {
      this.runtimeConnectionMessageState.set('Open a game workspace before attaching RuntimeSession.');
      return;
    }

    try {
      const attach = await createStudioRustRuntimeSessionFacade();
      const facade = attach.facade;
      const initialized = facade.initialize({
        sessionId: `runtime-session:${workspace.gameId}:studio-rust`,
        seed: 17,
        project: {
          gameId: workspace.gameId,
          workspaceId: workspace.workspaceHash,
        },
        projectBundle: DEMO_RUNTIME_PROJECT_BUNDLE,
      });
      assertNativeRustRuntimeAuthority(facade, attach.bridge);
      this.runtimeSessionFacadeState.set(facade);
      this.runtimeSessionStateSummaryState.set(initialized);
      this.runtimeSessionPausedState.set(false);
      this.playableLoopPolicyTickState.set(null);
      this.playableLoopRestartReceiptState.set(null);
      this.playableLoopEncounterTransitionReceiptState.set(null);
      this.playableLoopCombatFeedbackProjectionState.set(null);
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(`Rust RuntimeSession attached: ${initialized.sessionHash}.`);
      this.menuMessageState.set('Live Runtime Inspection attached through the public Rust backend.');
    } catch (error) {
      this.clearRuntimeSessionInspection();
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'RuntimeSession attach failed.',
      );
    }
  }

  tickRuntimeSessionInspection(): void {
    const facade = this.runtimeSessionFacadeState();
    if (facade === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before ticking.');
      return;
    }
    if (this.runtimeSessionPausedState()) {
      this.runtimeConnectionMessageState.set('RuntimeSession is paused; restart or resume is not public yet.');
      return;
    }

    try {
      const tick = facade.tick();
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            composition: tick.composition,
            sequenceId: tick.sequenceId,
            tick: tick.tick,
            sessionHash: tick.sessionHash,
          });
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(`RuntimeSession tick ${tick.tick}.`);
      this.menuMessageState.set(`Live Runtime Inspection tick ${tick.tick}.`);
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'RuntimeSession tick failed.',
      );
    }
  }

  restartRuntimeSessionInspection(): void {
    const facade = this.runtimeSessionFacadeState();
    if (facade === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before restarting.');
      return;
    }

    try {
      const restarted = facade.restart();
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            composition: restarted.composition,
            sequenceId: restarted.sequenceId,
            tick: restarted.tick,
            sessionHash: restarted.sessionHash,
          });
      this.runtimeSessionPausedState.set(false);
      this.playableLoopPolicyTickState.set(null);
      this.playableLoopRestartReceiptState.set(null);
      this.playableLoopEncounterTransitionReceiptState.set(null);
      this.playableLoopCombatFeedbackProjectionState.set(null);
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(`RuntimeSession restarted: ${restarted.sessionHash}.`);
      this.menuMessageState.set('Live Runtime Inspection restarted.');
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'RuntimeSession restart failed.',
      );
    }
  }

  runPlayableLoopInspectionTick(): void {
    const facade = this.runtimeSessionFacadeState();
    if (facade === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before running the playable loop.');
      return;
    }
    if (this.runtimeSessionPausedState()) {
      this.runtimeConnectionMessageState.set('RuntimeSession is paused; playable-loop tick is unavailable.');
      return;
    }

    try {
      const encounterBefore = facade.readEncounterDirector();
      let encounterTransitionReceipt: RuntimeSessionEncounterTransitionReceipt | null = null;
      if (encounterBefore.state.status === 'pending') {
        encounterTransitionReceipt = facade.requestEncounterTransition({
          kind: 'runtime_session.encounter_transition_request.v0',
          presetId: 'generated-tunnel-small-encounter',
          action: 'activate',
        });
      }
      const camera = facade.createCamera(STUDIO_PLAYABLE_LOOP_CAMERA_REQUEST).snapshot.camera;
      const readout = facade.runAutonomousPolicyTick({
        targetCamera: camera,
        policySource: STUDIO_PLAYABLE_LOOP_POLICY_SOURCE,
      });
      const feedbackProjection = facade.readCombatFeedbackProjection({
        camera,
        viewport: STUDIO_PLAYABLE_LOOP_CAMERA_REQUEST.viewport,
      });
      encounterTransitionReceipt = facade.requestEncounterTransition({
        kind: 'runtime_session.encounter_transition_request.v0',
        presetId: 'generated-tunnel-small-encounter',
        action: 'sync_lifecycle',
      });
      this.playableLoopPolicyTickState.set(readout);
      this.playableLoopRestartReceiptState.set(null);
      this.playableLoopCombatFeedbackProjectionState.set(feedbackProjection);
      this.playableLoopEncounterTransitionReceiptState.set(encounterTransitionReceipt);
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            composition: readout.step.composition,
            sequenceId: encounterTransitionReceipt?.sequenceId ?? readout.sequenceIdAfter,
            tick: readout.tick,
            sessionHash: encounterTransitionReceipt?.hashes.sessionHashAfter ?? readout.sessionHashAfter,
          });
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(
        `Playable loop tick ${readout.tick}: ${readout.proposalSummary.acceptedProposalCount} accepted, ${readout.proposalSummary.unsupportedProposalCount} unsupported.`,
      );
      this.menuMessageState.set('Live playable-loop inspection used public RuntimeSession policy/combat/lifecycle surfaces.');
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'Playable-loop policy tick failed.',
      );
    }
  }

  restartPlayableLoopInspection(): void {
    const facade = this.runtimeSessionFacadeState();
    const lifecycle = this.playableLoopLifecycleState();
    if (facade === null || lifecycle === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before restarting the playable loop.');
      return;
    }

    try {
      const receipt = facade.requestSessionRestart({
        kind: 'runtime.restart_session_intent',
        source: 'programmatic',
        requireTerminal: true,
        expectedSessionHash: lifecycle.sessionHash,
      });
      this.playableLoopRestartReceiptState.set(receipt);
      if (receipt.accepted) {
        this.playableLoopPolicyTickState.set(null);
        this.playableLoopCombatFeedbackProjectionState.set(null);
        this.playableLoopEncounterTransitionReceiptState.set(null);
      }
      const telemetry = facade.readTelemetry();
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            composition: telemetry.composition,
            sequenceId: telemetry.sequenceId,
            tick: telemetry.tick,
            sessionHash: telemetry.sessionHash,
          });
      this.runtimeSessionPausedState.set(false);
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(
        `Playable-loop restart ${receipt.status}: ${receipt.statusBefore.outcome.kind} -> ${receipt.statusAfter.outcome.kind}.`,
      );
      this.menuMessageState.set('Live playable-loop restart used the public typed lifecycle intent.');
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'Playable-loop restart failed.',
      );
    }
  }

  setGeneratedLevelPresetField(field: 'presetId' | 'seed', value: string): void {
    this.generatedLevelPresetDraftState.update(draft => {
      if (field === 'seed') {
        return {
          ...draft,
          seed: Number(value),
        };
      }
      return {
        ...draft,
        presetId: value,
      };
    });
    this.generatedTunnelRegenerateReceiptState.set(null);
    this.menuMessageState.set('Generated-level preset draft updated in Definition Authoring.');
  }

  validateGeneratedLevelPreset(): void {
    const generatedLevel = this.runtimeSessionInspection().generatedLevel;
    this.menuMessageState.set(
      generatedLevel.definitionAuthoring.validationStatus === 'valid'
        ? 'Generated-level preset draft validates against the public readout surface.'
        : generatedLevel.definitionAuthoring.validationErrors.join(' '),
    );
  }

  setGameplayPresetField(field: StudioFpsGameplayPresetDraftField, value: string): void {
    this.gameplayPresetDraftState.update(draft => {
      switch (field) {
        case 'displayName':
          return { ...draft, displayName: value };
        case 'moveSpeedUnitsPerSecond':
          return { ...draft, moveSpeedUnitsPerSecond: Number(value) };
        case 'lookSensitivityDegreesPerPixel':
          return { ...draft, lookSensitivityDegreesPerPixel: Number(value) };
        case 'weaponDamage':
          return { ...draft, weaponDamage: Number(value) };
        case 'weaponAmmo':
          return { ...draft, weaponAmmo: Number(value) };
        case 'enemyCount':
          return { ...draft, enemyCount: Number(value) };
        case 'desiredRangeUnits':
          return { ...draft, desiredRangeUnits: Number(value) };
      }
    });
    this.menuMessageState.set('Gameplay preset draft updated in Definition Authoring.');
  }

  validateGameplayPreset(): void {
    const authoring = this.runtimeSessionInspection().playableLoopTuning.definitionAuthoring;
    this.menuMessageState.set(
      authoring.validation.status === 'valid'
        ? 'Gameplay preset draft validates through the public catalog-core schema.'
        : `${authoring.validation.diagnosticCount} gameplay preset diagnostic(s).`,
    );
  }

  requestGeneratedLevelRegenerate(): void {
    const facade = this.runtimeSessionFacadeState();
    const draft = this.generatedLevelPresetDraftState();
    if (facade === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before requesting generated-level regenerate.');
      return;
    }
    if (draft.presetId !== 'tiny-enclosed' || draft.seed !== 17) {
      this.runtimeConnectionMessageState.set('Generated-level preset draft must validate before regenerate.');
      return;
    }

    try {
      const receipt = facade.requestGeneratedTunnelOperation({
        operation: 'regenerate',
        presetId: draft.presetId,
        seed: draft.seed,
      });
      this.generatedTunnelRegenerateReceiptState.set(receipt);
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            sequenceId: receipt.sequenceId,
            sessionHash: receipt.sessionHashAfter,
          });
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(`Generated-level regenerate ${receipt.status}: ${receipt.reason}.`);
      this.menuMessageState.set('Generated-level regenerate used typed public RuntimeSession control.');
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'Generated-level regenerate request failed.',
      );
    }
  }

  setHierarchyFilter(filter: string): void {
    this.hierarchyFilterState.set(filter);
  }

  private clearRuntimeSessionInspection(): void {
    this.runtimeSessionFacadeState.set(null);
    this.runtimeSessionStateSummaryState.set(null);
    this.runtimeSessionProjectionState.set(null);
    this.runtimeSessionTelemetryState.set(null);
    this.runtimeSessionPausedState.set(false);
    this.generatedTunnelReadoutState.set(null);
    this.generatedTunnelRegenerateReceiptState.set(null);
    this.generatedTunnelNavProjectionState.set(null);
    this.playableLoopEncounterDirectorState.set(null);
    this.playableLoopEncounterTransitionReceiptState.set(null);
    this.playableLoopCombatFeedbackProjectionState.set(null);
    this.playableLoopPolicyTickState.set(null);
    this.playableLoopLifecycleState.set(null);
    this.playableLoopRestartReceiptState.set(null);
  }

  private refreshRuntimeSessionInspectionReadout(facade: RuntimeSessionFacade): void {
    this.runtimeSessionProjectionState.set(facade.readProjection());
    this.runtimeSessionTelemetryState.set(facade.readTelemetry());
    this.playableLoopLifecycleState.set(facade.readLifecycleStatus());
    this.playableLoopEncounterDirectorState.set(facade.readEncounterDirector());
    const draft = this.generatedLevelPresetDraftState();
    try {
      if (draft.presetId !== 'tiny-enclosed' || draft.seed !== 17) {
        throw new Error('Generated-level preset draft is outside the public fixture surface.');
      }
      this.generatedTunnelReadoutState.set(facade.readGeneratedTunnelReadout({
        presetId: 'tiny-enclosed',
        seed: 17,
      }));
      this.generatedTunnelNavProjectionState.set(facade.readNavProjection());
    } catch {
      this.generatedTunnelReadoutState.set(null);
      this.generatedTunnelNavProjectionState.set(null);
    }
  }

  async refreshRunningProjectSessions(): Promise<void> {
    const workspace = this.gameWorkspace();
    if (workspace === null) {
      this.runtimeConnectionMessageState.set('Open a game workspace before refreshing sessions.');
      return;
    }
    if (this.runtimeAttachState() === null) {
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'project.refresh_sessions',
        label: 'Refresh Running Project Sessions',
        inputSummary: `endpoint=${workspace.attachEndpoint}`,
        outputSummary: 'No attached running project session.',
      });
      this.workspaceState.set(recorded.workspace);
      this.runtimeConnectionMessageState.set('No running project connected.');
      return;
    }
    await this.connectRunningProject('refresh');
  }

  async connectRunningProject(mode: 'connect' | 'refresh' = 'connect'): Promise<void> {
    const workspace = this.gameWorkspace();
    if (workspace === null) {
      this.runtimeConnectionMessageState.set('Open a game workspace before connecting.');
      return;
    }
    const commandId = mode === 'connect' ? 'project.connect_running' : 'project.refresh_sessions';
    const transport = createBrowserDevtoolsTransport(workspace.attachEndpoint);
    try {
      const attached = await attachStudioGameWorkspaceDevtools(workspace, transport);
      if (!attached.ok) {
        this.runtimeAttachState.set(null);
        this.runtimeLiveState.set(null);
        this.recordRuntimeConnectionCommand(commandId, workspace.attachEndpoint, attached.diagnostics.at(0)?.message ?? 'Attach rejected.', 'rejected');
        return;
      }
      const live = await refreshStudioGameWorkspaceLiveReadModel(workspace, attached.attach, transport);
      if (!live.ok) {
        this.runtimeAttachState.set(attached.attach);
        this.runtimeLiveState.set(null);
        this.recordRuntimeConnectionCommand(commandId, workspace.attachEndpoint, live.diagnostics.at(0)?.message ?? 'Live readback failed.', 'rejected');
        return;
      }
      this.runtimeAttachState.set(attached.attach);
      this.runtimeLiveState.set(live.live);
      this.runtimeConnectionMessageState.set(`Connected to ${workspace.gameId} at ${workspace.attachEndpoint}.`);
      this.recordRuntimeConnectionCommand(commandId, workspace.attachEndpoint, `Connected liveHash=${live.live.liveHash}.`);
    } catch (error) {
      this.runtimeAttachState.set(null);
      this.runtimeLiveState.set(null);
      this.recordRuntimeConnectionCommand(
        commandId,
        workspace.attachEndpoint,
        error instanceof Error ? error.message : 'Running project connection failed.',
        'rejected',
      );
    }
  }

  disconnectRunningProject(): void {
    const workspace = this.gameWorkspace();
    const endpoint = workspace?.attachEndpoint ?? 'missing';
    this.runtimeAttachState.set(null);
    this.runtimeLiveState.set(null);
    this.runtimeConnectionMessageState.set('Running project disconnected.');
    this.recordRuntimeConnectionCommand('project.disconnect_running', endpoint, 'Disconnected running project.');
  }

  private recordRuntimeConnectionCommand(
    commandId: 'project.refresh_sessions' | 'project.connect_running' | 'project.disconnect_running',
    endpoint: string,
    outputSummary: string,
    status: 'ok' | 'rejected' = 'ok',
  ): void {
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId,
      label: commandId === 'project.connect_running'
        ? 'Connect Running Project'
        : commandId === 'project.disconnect_running'
          ? 'Disconnect Running Project'
          : 'Refresh Running Project Sessions',
      inputSummary: `endpoint=${endpoint}`,
      outputSummary,
      status,
    });
    this.workspaceState.set(recorded.workspace);
    this.menuMessageState.set(outputSummary);
    this.runtimeConnectionMessageState.set(outputSummary);
  }

  loadScenario(scenarioId: string): void {
    const intent = createLoadScenarioIntent(this.workspaceState(), scenarioId);
    const dispatchResult = mapStudioIntentToCommand(intent);
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'session.load_scenario'
      || dispatchResult.proposal.scenarioId === undefined
    ) {
      this.menuMessageState.set(dispatchResult.diagnostic ?? 'Scenario load rejected.');
      return;
    }
    const loadResult = loadScenarioReadModel(this.workspaceState(), scenarioId);
    if (!loadResult.ok) {
      this.menuMessageState.set(loadResult.diagnostics.at(0)?.message ?? 'Scenario load failed.');
      return;
    }

    this.workspaceState.set(loadResult.workspace);
    this.viewportHitState.set(null);
    this.viewportCameraState.set(frameStudioViewportCamera(loadResult.workspace.scene));
    this.viewportToolState.set(buildStudioViewportToolReadModel());
    this.assetBrowserCategoryState.set('all');
    this.selectedScenarioDraftIdState.set(scenarioId);
    this.menuMessageState.set(`Loaded ${loadResult.workspace.session.scenarioLabel}.`);
  }

  newWorkspace(): void {
    this.workspaceState.set(clearStudioWorkspaceReadModel(this.workspaceState()));
    this.activeSceneFilePathState.set(null);
    this.viewportHitState.set(null);
    this.viewportCameraState.set(buildStudioViewportCameraReadModel());
    this.viewportToolState.set(buildStudioViewportToolReadModel());
    this.menuMessageState.set('New scene created.');
  }

  openSceneFile(path: string): void {
    const sceneFile = this.sceneFiles().files.find(file => file.path === path);
    if (sceneFile === undefined) {
      this.menuMessageState.set(`Scene source not available: ${path}.`);
      return;
    }
    const source = this.sceneFileSourcesState().find(file => file.path === path);
    if (source === undefined || source.sha256 !== sceneFile.hash) {
      this.menuMessageState.set(`Scene source changed before open: ${path}.`);
      return;
    }
    const dispatchResult = mapStudioIntentToCommand(
      createOpenSceneFileIntent(this.workspaceState(), sceneFile),
    );
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.open_source'
      || dispatchResult.proposal.path !== path
      || dispatchResult.proposal.expectedHash !== source.sha256
    ) {
      this.menuMessageState.set(dispatchResult.diagnostic ?? 'Scene open rejected.');
      return;
    }

    const workspace = applyOpenSceneFileReadModel(this.workspaceState(), sceneFile);
    this.workspaceState.set(workspace);
    this.activeSceneFilePathState.set(path);
    this.viewportHitState.set(null);
    this.viewportCameraState.set(frameStudioViewportCamera(workspace.scene));
    this.viewportToolState.set(buildStudioViewportToolReadModel());
    this.assetBrowserCategoryState.set('all');
    this.menuMessageState.set(`Opened ${sceneFile.name}.`);
  }

  async refreshProjectFiles(dir = this.projectFileCurrentDirState()): Promise<void> {
    const normalizedDir = normalizeProjectFilePath(dir);
    try {
      const response = await fetch(`${projectFileApiBase()}/api/project/list?dir=${encodeURIComponent(normalizedDir)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json() as {
        readonly projectRoot?: string;
        readonly dir?: string;
        readonly entries?: readonly StudioProjectFileEntry[];
      };
      this.projectFileConnectedState.set(true);
      this.projectFileRootState.set(payload.projectRoot ?? null);
      this.projectFileCurrentDirState.set(normalizeProjectFilePath(payload.dir ?? normalizedDir));
      this.projectFileEntriesState.set([...(payload.entries ?? [])].sort(projectFileEntrySort));
      this.projectFileMessageState.set('Project file server connected.');
    } catch {
      this.projectFileConnectedState.set(false);
      this.projectFileRootState.set(null);
      this.projectFileEntriesState.set([]);
      this.projectFileMessageState.set('Using fallback scene list. Start the project file server for full project-root open/save.');
    }
  }

  selectProjectFile(path: string): void {
    const normalizedPath = normalizeProjectFilePath(path);
    const entry = this.projectFileDialog().entries.find(item => item.path === normalizedPath);
    if (entry?.kind === 'directory') {
      void this.refreshProjectFiles(entry.path);
      return;
    }
    this.projectFileSelectedPathState.set(normalizedPath);
    this.saveAsPathState.set(normalizedPath);
  }

  openProjectParentDir(): void {
    void this.refreshProjectFiles(parentProjectDir(this.projectFileCurrentDirState()));
  }

  openSelectedProjectFile(): void {
    const path = this.projectFileSelectedPathState();
    if (path === null) {
      this.menuMessageState.set('Select a scene file to open.');
      return;
    }
    void this.openSceneFileFromProject(path);
  }

  private async openSceneFileFromProject(path: string): Promise<void> {
    if (!this.projectFileConnectedState()) {
      this.openSceneFile(path);
      return;
    }
    const normalizedPath = normalizeProjectFilePath(path);
    try {
      const response = await fetch(`${projectFileApiBase()}/api/project/file?path=${encodeURIComponent(normalizedPath)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json() as {
        readonly ok?: boolean;
        readonly path: string;
        readonly text: string;
        readonly sha256: string;
      };
      if (payload.ok === false || typeof payload.text !== 'string' || typeof payload.sha256 !== 'string') {
        throw new Error('invalid project file readback');
      }
      const nextSource: StudioSceneFileSourceInput = {
        path: normalizeProjectFilePath(payload.path),
        text: payload.text,
        sha256: payload.sha256,
      };
      this.sceneFileSourcesState.set([
        ...this.sceneFileSourcesState().filter(file => file.path !== nextSource.path),
        nextSource,
      ].sort((left, right) => left.path.localeCompare(right.path)));
      this.openSceneFile(nextSource.path);
      this.projectFileSelectedPathState.set(nextSource.path);
    } catch {
      this.menuMessageState.set(`Could not open ${normalizedPath} from the project file server.`);
    }
  }

  saveSceneFile(): void {
    const path = this.activeSceneFilePathState();
    if (path === null) {
      this.saveSceneFileAs(this.saveAsPathState());
      return;
    }
    void this.writeSceneFile(path, false);
  }

  saveSceneFileAs(path = this.saveAsPathState()): void {
    this.saveAsPathState.set(path);
    void this.writeSceneFile(path, true);
  }

  setSaveAsPath(path: string): void {
    const normalizedPath = normalizeProjectFilePath(path);
    this.saveAsPathState.set(normalizedPath);
    this.projectFileSelectedPathState.set(normalizedPath);
  }

  saveWorkspaceToSlot(): void {
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: 'workspace.save_browser_slot',
      label: 'Save Workspace Slot',
      inputSummary: `sceneHash=${this.workspaceState().scene.sceneHash}`,
      outputSummary: 'Workspace artifact saved to browser slot.',
    });
    this.workspaceState.set(recorded.workspace);
    const artifactText = serializeStudioWorkspaceArtifact({
      workspace: recorded.workspace,
      viewportCamera: this.viewportCameraState(),
      viewportTool: this.viewportToolState(),
      preferences: this.preferencesStore.preferences(),
      savedAtIso: new Date().toISOString(),
    });
    this.savedWorkspaceState.set(artifactText);
    browserStorage()?.setItem(WORKSPACE_STORAGE_KEY, artifactText);
    this.menuMessageState.set('Workspace saved to browser slot.');
  }

  private async writeSceneFile(path: string, saveAs: boolean): Promise<void> {
    const normalizedPath = normalizeProjectFilePath(path);
    const previous = this.sceneFileSourcesState().find(file => file.path === normalizedPath) ?? null;
    const expectedPreviousHash = saveAs ? null : previous?.sha256 ?? null;
    const dispatchResult = mapStudioIntentToCommand(
      createSaveSceneFileIntent(this.workspaceState(), {
        path: normalizedPath,
        expectedPreviousHash,
        saveAs,
      }),
    );
    const expectedCommandId = saveAs ? 'scene.save_source_as' : 'scene.save_source';
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== expectedCommandId
      || dispatchResult.proposal.path !== normalizedPath
    ) {
      this.menuMessageState.set(dispatchResult.diagnostic ?? 'Scene save rejected.');
      return;
    }

    const nextText = serializeWorkspaceSceneSource(this.workspaceState());
    const nextHash = stableBrowserHash(nextText);
    const saveReadback = buildStudioSceneFileSaveReadback({
      commandId: expectedCommandId,
      path: normalizedPath,
      previousHash: previous?.sha256 ?? null,
      expectedPreviousHash,
      nextText,
      nextHash,
      workspace: this.gameWorkspace(),
      allowProjectRoot: this.projectFileConnectedState(),
    });
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: expectedCommandId,
      label: saveAs ? 'Save Scene Source As' : 'Save Scene Source',
      inputSummary: `path=${normalizedPath};previousHash=${previous?.sha256 ?? 'none'}`,
      outputSummary: saveReadback.diagnostics.length === 0
        ? `Scene source ${normalizedPath} saved.`
        : saveReadback.diagnostics.at(0)?.message ?? 'Scene save failed.',
      status: saveReadback.diagnostics.length === 0 ? 'ok' : 'rejected',
    });
    this.workspaceState.set(recorded.workspace);
    if (saveReadback.diagnostics.length > 0) {
      this.menuMessageState.set(saveReadback.diagnostics.at(0)?.message ?? 'Scene save failed.');
      return;
    }

    let persistedHash = nextHash;
    if (this.projectFileConnectedState()) {
      try {
        const response = await fetch(`${projectFileApiBase()}/api/project/file`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            path: normalizedPath,
            text: nextText,
            expectedHash: expectedPreviousHash,
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json() as { readonly ok?: boolean; readonly sha256?: string; readonly diagnostic?: string };
        if (payload.ok === false) {
          throw new Error(payload.diagnostic ?? 'project file write rejected');
        }
        persistedHash = payload.sha256 ?? nextHash;
        await this.refreshProjectFiles(parentProjectDir(normalizedPath));
      } catch {
        this.menuMessageState.set(`Could not write ${normalizedPath} through the project file server.`);
        return;
      }
    }

    const nextSource = { path: normalizedPath, text: nextText, sha256: persistedHash };
    this.sceneFileSourcesState.set([
      ...this.sceneFileSourcesState().filter(file => file.path !== normalizedPath),
      nextSource,
    ].sort((left, right) => left.path.localeCompare(right.path)));
    this.activeSceneFilePathState.set(normalizedPath);
    this.projectFileSelectedPathState.set(normalizedPath);
    this.menuMessageState.set(saveAs ? `Saved scene as ${normalizedPath}.` : `Saved scene ${normalizedPath}.`);
  }

  loadWorkspaceFromSlot(): void {
    const artifactText =
      this.savedWorkspaceState() ?? browserStorage()?.getItem(WORKSPACE_STORAGE_KEY) ?? null;
    if (artifactText === null) {
      this.menuMessageState.set('No saved workspace slot found.');
      return;
    }

    const restoreResult = restoreStudioWorkspaceArtifact(artifactText);
    if (!restoreResult.ok || restoreResult.artifact === null) {
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'workspace.load_browser_slot',
        label: 'Load Workspace Slot',
        inputSummary: 'source=browser-slot',
        outputSummary: restoreResult.diagnostics.at(0)?.message ?? 'Workspace load failed.',
        status: 'rejected',
      });
      this.workspaceState.set(recorded.workspace);
      this.menuMessageState.set(restoreResult.diagnostics.at(0)?.message ?? 'Workspace load failed.');
      return;
    }

    const recorded = recordStudioWorkspaceUiCommand(restoreResult.artifact.workspace, {
      commandId: 'workspace.load_browser_slot',
      label: 'Load Workspace Slot',
      inputSummary: 'source=browser-slot',
      outputSummary: 'Workspace artifact restored from browser slot.',
    });
    this.workspaceState.set(recorded.workspace);
    this.viewportCameraState.set(restoreResult.artifact.viewportCamera);
    this.viewportToolState.set(restoreResult.artifact.viewportTool);
    this.preferencesStore.setPreferences(restoreResult.artifact.preferences);
    this.selectedScenarioDraftIdState.set(restoreResult.artifact.workspace.session.scenarioId);
    this.menuMessageState.set('Workspace loaded from browser slot.');
  }

  setRenderSetting(key: StudioRenderSettingKey, value: boolean): void {
    this.preferencesStore.setRenderSetting(key, value);
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: 'preferences.set_render_setting',
      label: 'Set Render Preference',
      inputSummary: `${key}=${value}`,
      outputSummary: `Render setting ${key} updated.`,
    });
    this.workspaceState.set(recorded.workspace);
    this.menuMessageState.set('View preference updated.');
  }

  private async readProjectText(path: string): Promise<{ readonly path: string; readonly text: string; readonly sha256: string }> {
    const normalizedPath = normalizeProjectFilePath(path);
    if (!this.projectFileConnectedState()) {
      throw new Error('project file server is not connected');
    }
    const response = await fetch(`${projectFileApiBase()}/api/project/file?path=${encodeURIComponent(normalizedPath)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json() as {
      readonly ok?: boolean;
      readonly path?: string;
      readonly text?: string;
      readonly sha256?: string;
      readonly diagnostic?: string;
    };
    if (payload.ok === false || typeof payload.path !== 'string' || typeof payload.text !== 'string' || typeof payload.sha256 !== 'string') {
      throw new Error(payload.diagnostic ?? 'invalid project file readback');
    }
    return { path: normalizeProjectFilePath(payload.path), text: payload.text, sha256: payload.sha256 };
  }

  private applyCatalogOperation(
    commandId: 'catalog.link_asset' | 'catalog.update_asset' | 'catalog.remove_asset',
    operation: Parameters<typeof applyStudioCatalogAuthoringOperation>[1]['operation'],
  ): void {
    const catalog = this.catalogSourceState();
    const result = applyStudioCatalogAuthoringOperation(catalog, {
      actor: 'gui',
      expectedBaseHash: studioCatalogAuthoringBaseHash(catalog),
      operation,
    });
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId,
      label: commandId === 'catalog.link_asset'
        ? 'Link Catalog Asset'
        : commandId === 'catalog.update_asset'
          ? 'Update Catalog Asset'
          : 'Remove Catalog Asset',
      inputSummary: `operation=${operation.kind}`,
      outputSummary: result.ok
        ? `Catalog operation ${operation.kind} applied.`
        : result.diagnostics.at(0)?.message ?? 'Catalog operation rejected.',
      status: result.ok ? 'ok' : 'rejected',
    });
    this.workspaceState.set(recorded.workspace);
    if (!result.ok) {
      this.catalogWorkflowMessageState.set(result.diagnostics.at(0)?.message ?? 'Catalog operation rejected.');
      return;
    }
    this.catalogSourceState.set(result.catalog);
    if (operation.kind === 'create_catalog_entry') {
      this.selectedCatalogWorkflowAssetIdState.set(operation.entry.id);
    } else if (operation.kind === 'remove_catalog_entry') {
      this.selectedCatalogWorkflowAssetIdState.set(result.catalog.entries.at(0)?.id ?? null);
    }
    this.syncAssetInventoryFromCatalog(result.catalogHash);
    this.catalogWorkflowMessageState.set(`Catalog operation ${operation.kind} applied.`);
  }

  private syncAssetInventoryFromCatalog(catalogHash = studioCatalogAuthoringBaseHash(this.catalogSourceState())): void {
    this.assetInventoryState.set(
      inventoryFromCatalog(
        this.catalogSourceState(),
        this.catalogPathState(),
        catalogHash,
        demoReferencedRenderableIds(),
      ),
    );
  }

  private catalogAssetMatchesCategory(asset: StudioAssetInventoryEntryReadModel): boolean {
    const category = this.assetBrowserCategoryState();
    if (category === 'all') {
      return true;
    }
    if (category === 'static_meshes') {
      return asset.kind === 'static_mesh';
    }
    if (category === 'materials') {
      return asset.kind === 'material';
    }
    if (category === 'textures') {
      return asset.kind === 'texture';
    }
    return false;
  }
}

interface StudioNativeRustRuntimeBridgeProvider {
  readonly kind: 'asha_studio.native_runtime_bridge_provider.v1';
  readonly backend: 'native_rust';
  readonly productAuthority: true;
  readonly referenceFallback: false;
  readonly bridge?: RuntimeBridge | Promise<RuntimeBridge>;
  createRuntimeBridge?: () => RuntimeBridge | Promise<RuntimeBridge>;
}

type StudioRuntimeBridgeProvider = StudioNativeRustRuntimeBridgeProvider;

type StudioRuntimeBridgeGlobal = typeof globalThis & {
  readonly ashaStudioRuntimeBridge?: StudioRuntimeBridgeProvider;
  readonly ashaRuntimeBridge?: StudioRuntimeBridgeProvider;
};

interface StudioRuntimeSessionAttach {
  readonly facade: RuntimeSessionFacade;
  readonly bridge: RuntimeBridge;
}

async function createStudioRustRuntimeSessionFacade(): Promise<StudioRuntimeSessionAttach> {
  const bridge = await readInjectedStudioRuntimeBridge();
  if (bridge === null) {
    throw new RuntimeBridgeError(
      'native_unavailable',
      'Studio live RuntimeSession inspection requires globalThis.ashaStudioRuntimeBridge with asha_studio.native_runtime_bridge_provider.v1 native_rust authority metadata; reference/mock RuntimeSession is not used for live attach.',
    );
  }
  return {
    facade: createRuntimeSessionFacade({ bridge, mode: 'rust' }),
    bridge,
  };
}

async function readInjectedStudioRuntimeBridge(): Promise<RuntimeBridge | null> {
  const runtimeGlobal = globalThis as StudioRuntimeBridgeGlobal;
  const provider = runtimeGlobal.ashaStudioRuntimeBridge ?? runtimeGlobal.ashaRuntimeBridge ?? null;
  if (provider === null) {
    return null;
  }
  if (!isNativeRustRuntimeBridgeProvider(provider)) {
    throw new RuntimeBridgeError(
      'invalid_input',
      'globalThis.ashaStudioRuntimeBridge must be an asha_studio.native_runtime_bridge_provider.v1 provider with native_rust authority metadata; raw RuntimeBridge/reference providers are rejected.',
    );
  }

  const candidate = readRuntimeBridgeProviderValue(provider);
  const bridge = await candidate;
  if (isRuntimeBridge(bridge)) {
    return bridge;
  }
  throw new RuntimeBridgeError(
    'invalid_input',
    'globalThis.ashaStudioRuntimeBridge must provide the public RuntimeBridge interface',
  );
}

function readRuntimeBridgeProviderValue(
  provider: StudioRuntimeBridgeProvider,
): RuntimeBridge | Promise<RuntimeBridge> {
  if (typeof provider.createRuntimeBridge === 'function') {
    return provider.createRuntimeBridge();
  }
  if (provider.bridge !== undefined) {
    return provider.bridge;
  }
  throw new RuntimeBridgeError(
    'invalid_input',
    'globalThis.ashaStudioRuntimeBridge native provider must expose bridge or createRuntimeBridge',
  );
}

function isNativeRustRuntimeBridgeProvider(value: unknown): value is StudioNativeRustRuntimeBridgeProvider {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<StudioNativeRustRuntimeBridgeProvider>;
  return candidate.kind === 'asha_studio.native_runtime_bridge_provider.v1'
    && candidate.backend === 'native_rust'
    && candidate.productAuthority === true
    && candidate.referenceFallback === false;
}

function assertNativeRustRuntimeAuthority(
  facade: RuntimeSessionFacade,
  bridge: RuntimeBridge,
): void {
  const readout = facade.readEcrpRuntimeReadout();
  const snapshot = bridge.readFpsRuntimeSession();
  if (
    readout.authority.mode !== 'rust'
    || readout.authority.source !== 'rust_bridge'
    || snapshot.backend !== 'native_rust'
  ) {
    throw new RuntimeBridgeError(
      'invalid_input',
      `Studio rejected non-native RuntimeBridge provider: ECRP source=${readout.authority.source}, FPS backend=${snapshot.backend}`,
    );
  }
}

function isRuntimeBridge(value: unknown): value is RuntimeBridge {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<Record<keyof RuntimeBridge, unknown>>;
  return typeof candidate.initializeEngine === 'function'
    && typeof candidate.loadWorldBundle === 'function'
    && typeof candidate.loadFpsRuntimeSession === 'function'
    && typeof candidate.readFpsRuntimeSession === 'function'
    && typeof candidate.applyFpsPrimaryFire === 'function'
    && typeof candidate.restartFpsRuntimeSession === 'function';
}
