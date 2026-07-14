import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { COMMAND_IDS } from '@asha/command-registry';
import { sceneId, sceneNodeId } from '@asha/contracts';
import { buildDevtoolsProtocolGoldenFixtures, createDevtoolsFixtureEndpoint } from '@asha/devtools';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  ASHA_STUDIO_PROJECT_WORKSPACE_PATH,
  applyCanonicalSceneDocumentReadModel,
  attachStudioGameWorkspaceDevtools,
  applySelectedEntityReadModel,
  buildStudioGameWorkspaceHandshakeRequest,
  buildAssetBrowserCategories,
  buildInitialWorkspaceReadModel,
  buildStudioGameWorkspaceReadout,
  buildStudioWorkspaceOpenReadModel,
  buildStudioSceneAuthoringOperation,
  buildStudioCatalogAuthoringOperation,
  buildStudioCatalogWorkflowReadModel,
  buildStudioCommandProposalPanel,
  buildStudioAuthoredBrowserDebugReadModel,
  buildStudioGameWorkspaceCommandProposalReadModel,
  buildStudioLiveDebugCommandProposalSurface,
  buildStudioAuthoredStatePanelReflection,
  buildStudioLiveDebugSessionIdentity,
  buildStudioLiveAssetResourceDebugInspector,
  buildStudioLiveRuntimeTelemetryDebugInspector,
  buildStudioLiveSceneEntityDebugInspector,
  buildStudioRuntimeSessionList,
  buildStudioRunningProjectDiscovery,
  buildStudioViewportHitReadModel,
  buildStudioPreferencesReadModel,
  buildStudioCompatibilityEvidence,
  buildStudioUiStateReadModel,
  buildStudioViewportAdapterReadModel,
  buildStudioViewportCameraReadModel,
  buildStudioViewportReadout,
  buildStudioViewportToolReadModel,
  clearStudioWorkspaceReadModel,
  computeEntityListHash,
  createStudioAgentReadout,
  createStudioCompactAgentReadout,
  createCreateSceneObjectRequest,
  applySceneObjectCommandReadModel,
  applyStudioCatalogAuthoringOperation,
  createRenameSceneObjectRequest,
  createReparentSceneObjectRequest,
  createRotateSceneObjectRequest,
  createSceneObjectCommandIntent,
  createSelectEntityIntent,
  createTranslateSceneObjectRequest,
  exportStudioWorkspaceCockpitEvidence,
  exportStudioGameWorkspaceAttachEvidence,
  frameStudioViewportCamera,
  frameStudioViewportCameraOnRenderable,
  filterAssetBrowserRenderables,
  findUnresolvedSceneAssetIds,
  loadStudioAssetInventory,
  loadStudioGameWorkspaceManifest,
  loadStudioPublishEvidence,
  orbitStudioViewportCamera,
  panStudioViewportCamera,
  proposeStudioGameWorkspaceCommand,
  recordStudioWorkspaceUiCommand,
  refreshStudioGameWorkspaceLiveReadModel,
  restoreStudioWorkspaceArtifact,
  serializeStudioWorkspaceArtifact,
  setHierarchyExpansionReadModel,
  stageStudioProjectWorkspaceLoad,
  studioSceneAuthoringBaseHash,
  studioCatalogAuthoringBaseHash,
  updateStudioRenderSetting,
  validateStudioWorkspaceArtifactSceneReference,
  validateEntityProjection,
  validateSelectionCommandSync,
  zoomStudioViewportCamera,
  type StudioAgentReadoutArtifact,
  type StudioPackageJsonLike,
} from '@asha-studio/domain';
import {
  ASHA_STUDIO_THEME_TOKENS,
  ashaStudioThemeMarker,
  themeTokenCssVariables,
} from '@asha-studio/theme';
import generateStudioFeatureSlice from '../libs/studio-workspace-generators/src/generators/studio-feature-slice/generator';
import {
  readStudioProjectFile,
  writeStudioProjectFile,
} from '../scripts/studio-project-file-service';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = join(repoRoot, '../asha-testing');
const runEvidenceProcessTests = process.env.ASHA_STUDIO_RUN_EVIDENCE_PROCESS_TESTS === '1';
const evidenceProcessSkipReason = 'process-level evidence generators are opt-in; set ASHA_STUDIO_RUN_EVIDENCE_PROCESS_TESTS=1';

function evidenceProcessTest(name: string, fn: () => void): void {
  test(name, { skip: runEvidenceProcessTests ? false : evidenceProcessSkipReason }, fn);
}

function loadDemoPackageScripts(): Record<string, string> {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).scripts;
}

function buildAuthoredWorkspaceReadModel() {
  const workspace = buildInitialWorkspaceReadModel();
  return applyCanonicalSceneDocumentReadModel(workspace, {
    schemaVersion: 1,
    id: sceneId(81),
    metadata: { name: 'Authored Test Scene', authoringFormatVersion: 1 },
    dependencies: [
      { id: 'voxel.authored', version: { req: 'any' }, hash: null },
      { id: 'mesh.authored', version: { req: 'any' }, hash: null },
      { id: 'sprite.authored-a', version: { req: 'any' }, hash: null },
      { id: 'sprite.authored-b', version: { req: 'any' }, hash: null },
    ],
    nodes: [
      {
        id: sceneNodeId(1),
        parent: null,
        childOrder: 0,
        label: 'Scene Root',
        tags: [],
        transform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        kind: { kind: 'emptyGroup' },
      },
      {
        id: sceneNodeId(2),
        parent: sceneNodeId(1),
        childOrder: 0,
        label: 'Authored Voxel Volume',
        tags: ['authored'],
        transform: { translation: [0.5, 0.5, 0.5], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        kind: { kind: 'voxelVolume', asset: { id: 'voxel.authored', version: { req: 'any' }, hash: null } },
      },
      ...[
        { id: 3, order: 1, label: 'Authored Mesh', kind: 'staticMesh' as const, assetId: 'mesh.authored', x: 2 },
        { id: 4, order: 2, label: 'Authored Sprite A', kind: 'sprite' as const, assetId: 'sprite.authored-a', x: 3 },
        { id: 5, order: 3, label: 'Authored Sprite B', kind: 'sprite' as const, assetId: 'sprite.authored-b', x: 4 },
      ].map(item => ({
        id: sceneNodeId(item.id),
        parent: sceneNodeId(1),
        childOrder: item.order,
        label: item.label,
        tags: ['authored'],
        transform: { translation: [item.x, 0.5, 0.5] as const, rotation: [0, 0, 0, 1] as const, scale: [1, 1, 1] as const },
        kind: { kind: item.kind, asset: { id: item.assetId, version: { req: 'any' as const }, hash: null } },
      })),
    ],
  }, '/tmp/asha-studio-authored-test.scene.json');
}

function loadDemoPackageName(): string {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).name;
}

function createStudioDevtoolsFixtureEndpoint(
  options: Parameters<typeof createDevtoolsFixtureEndpoint>[0] = {},
): ReturnType<typeof createDevtoolsFixtureEndpoint> {
  const endpoint = createDevtoolsFixtureEndpoint(options);
  return {
    exchange(message) {
      const response = endpoint.exchange(message);
      if (message.type !== 'handshake.request'
        || response.type !== 'handshake.response'
        || !response.accepted) {
        return response;
      }

      return {
        ...response,
        runtime: {
          ...response.runtime,
          gameId: message.requestedWorkspaceId,
          workspaceId: message.requestedWorkspaceId,
        },
      };
    },
  };
}

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sampleCatalog() {
  return {
    schemaVersion: 1 as const,
    entries: [
      {
        id: 'texture.demo-checker',
        kind: 'texture' as const,
        source: 'assets/textures/demo-checker.texture.json',
        importProfile: 'inline-texture.v0',
        importMetadata: {
          sourceHash: 'sha256:texture',
          cacheKey: 'dev-cache/texture/texture.demo-checker',
          generatedArtifactVersion: 'asset-import.v1',
        },
        dependencies: [],
        publish: {
          include: true,
          outputKey: 'textures/demo-checker.texture.json',
        },
        diagnostics: {
          owner: 'asha-demo',
          notes: [],
        },
      },
      {
        id: 'material.demo-copper',
        kind: 'material' as const,
        source: 'assets/materials/demo-copper.material.json',
        importProfile: 'inline-material.v0',
        importMetadata: {
          sourceHash: 'sha256:material',
          cacheKey: 'dev-cache/material/material.demo-copper',
          generatedArtifactVersion: 'asset-import.v1',
        },
        dependencies: ['texture.demo-checker'],
        publish: {
          include: true,
          outputKey: 'materials/demo-copper.material.json',
        },
        diagnostics: {
          owner: 'asha-demo',
          notes: [],
        },
      },
    ],
  };
}

function sampleAssetInventoryArtifact() {
  return {
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: {
      path: 'asha.game.toml',
      hash: 'sha256:manifest',
    },
    catalog: {
      path: 'packages/game-catalogs/catalog.json',
      hash: 'sha256:catalog',
    },
    diagnostics: [],
    dependencyOrder: ['texture.demo-checker', 'material.demo-copper', 'mesh.demo-cube'],
    entries: [
      {
        assetId: 'mesh.demo-cube',
        kind: 'static_mesh',
        sourcePath: 'assets/meshes/demo-cube.mesh.json',
        dependencies: ['material.demo-copper'],
        devResolution: {
          sourceHash: 'sha256:mesh',
          devCacheKey: 'dev-cache/static_mesh/mesh.demo-cube/mesh',
          generatedArtifactVersion: 'asset-import.v1',
          importStatus: 'clean',
          publishOutputKey: 'meshes/demo-cube.mesh.json',
        },
        publishResolution: {
          outputKey: 'meshes/demo-cube.mesh.json',
          packedPath: 'harness/out/publish/resources/meshes/demo-cube.mesh.json',
          packedHash: 'sha256:packed-mesh',
          packedBytes: 702,
        },
        diagnostics: [],
        evidenceRefs: [{ kind: 'source', path: 'assets/meshes/demo-cube.mesh.json', sha256: 'sha256:mesh' }],
      },
      {
        assetId: 'material.demo-copper',
        kind: 'material',
        sourcePath: 'assets/materials/demo-copper.material.json',
        dependencies: ['texture.demo-checker'],
        devResolution: {
          sourceHash: 'sha256:material',
          devCacheKey: 'dev-cache/material/material.demo-copper/material',
          generatedArtifactVersion: 'asset-import.v1',
          importStatus: 'clean',
          publishOutputKey: 'materials/demo-copper.material.json',
        },
        publishResolution: {
          outputKey: 'materials/demo-copper.material.json',
          packedPath: 'harness/out/publish/resources/materials/demo-copper.material.json',
          packedHash: 'sha256:packed-material',
          packedBytes: 214,
        },
        diagnostics: [],
        evidenceRefs: [{ kind: 'source', path: 'assets/materials/demo-copper.material.json', sha256: 'sha256:material' }],
      },
      {
        assetId: 'texture.demo-checker',
        kind: 'texture',
        sourcePath: 'assets/textures/demo-checker.texture.json',
        dependencies: [],
        devResolution: {
          sourceHash: 'sha256:texture',
          devCacheKey: 'dev-cache/texture/texture.demo-checker/texture',
          generatedArtifactVersion: 'asset-import.v1',
          importStatus: 'clean',
          publishOutputKey: 'textures/demo-checker.texture.json',
        },
        publishResolution: {
          outputKey: 'textures/demo-checker.texture.json',
          packedPath: 'harness/out/publish/resources/textures/demo-checker.texture.json',
          packedHash: 'sha256:packed-texture',
          packedBytes: 367,
        },
        diagnostics: [],
        evidenceRefs: [{ kind: 'source', path: 'assets/textures/demo-checker.texture.json', sha256: 'sha256:texture' }],
      },
    ],
  };
}

function samplePublishEvidenceArtifact() {
  const packedResources = [
    {
      assetId: 'mesh.demo-cube',
      outputKey: 'meshes/demo-cube.mesh.json',
      sourceHash: 'sha256:mesh',
      packedHash: 'sha256:packed-mesh',
      runnableHash: 'sha256:runnable-mesh',
    },
    {
      assetId: 'material.demo-copper',
      outputKey: 'materials/demo-copper.material.json',
      sourceHash: 'sha256:material',
      packedHash: 'sha256:packed-material',
      runnableHash: 'sha256:runnable-material',
    },
    {
      assetId: 'texture.demo-checker',
      outputKey: 'textures/demo-checker.texture.json',
      sourceHash: 'sha256:texture',
      packedHash: 'sha256:packed-texture',
      runnableHash: 'sha256:runnable-texture',
    },
  ];
  return {
    evidenceKind: 'asha_demo_publish_evidence_manifest',
    evidenceVersion: 'publish-evidence.v1',
    evidenceId: 'asha-demo-publish-evidence:sha256:evidence',
    evidenceHash: 'sha256:evidence',
    publishArtifact: {
      path: 'harness/out/publish/latest/index.json',
      fileHash: 'sha256:publish-file',
      artifactId: 'asha-demo-publish:sha256:publish',
      artifactHash: 'sha256:publish',
      artifactVersion: 'publish-artifact.v0',
      compiledAssetCount: 3,
      publishAssetCount: 3,
      runnableTarget: 'asha-demo-static-reference.v1',
      runnableEntrypointPath: 'harness/out/publish/runnable/latest/index.html',
      runnableEntrypointHash: 'sha256:entrypoint',
      resourcePackManifestPath: 'harness/out/publish/resources/manifest.json',
      resourcePackManifestHash: 'sha256:manifest',
    },
    publishSmoke: {
      path: 'harness/out/publish-smoke/latest/index.json',
      fileHash: 'sha256:publish-smoke',
      checks: ['runnable_dependency_guard_passed'],
      readback: {
        status: 'ok',
        artifactPath: 'harness/out/publish/latest/index.json',
        artifactHash: 'sha256:publish',
        publishDependencyGuard: 'no-studio-dev-only-fragments',
        compiledAssetCount: 3,
        publishAssetCount: 3,
        packedResources,
        dependencyGuard: {
          inspectedRunnableFiles: ['index.html'],
          forbiddenFragments: [],
        },
      },
    },
    publishRunSmoke: {
      path: 'harness/out/publish-run-smoke/latest/index.json',
      fileHash: 'sha256:publish-run-smoke',
      runtime: {
        runtimeMode: 'reference',
        launcherName: 'reference-game-runtime-launcher',
      },
      projection: {
        worldHash: 'runtime-session:reference',
      },
      commandProof: {
        acceptedCommand: { status: 'accepted' },
        rejectedCommand: { status: 'rejected' },
      },
      resolvedResourceCount: 3,
      checks: ['runtime_projection_readback_present', 'packaged_command_proof_present'],
    },
    validations: [
      'runtime_projection_readback_present',
      'packaged_command_proof_present',
    ],
    nonClaims: ['not_store_submission'],
  };
}

test('selection intent maps through the public command identity before read model update', () => {
  const initialReadModel = buildAuthoredWorkspaceReadModel();
  const modelEntity = initialReadModel.entities.find(
    entity => entity.renderableId === 'scene-node-renderable:3',
  );

  assert.ok(modelEntity);
  const intent = createSelectEntityIntent(initialReadModel, modelEntity.id);
  const dispatchResult = mapStudioIntentToCommand(intent);

  assert.equal(dispatchResult.accepted, true);
  assert.equal(dispatchResult.proposal?.commandId, 'selection.set_active_entity');
  assert.equal(initialReadModel.session.sessionId, 'studio-authoring');
  assert.equal(initialReadModel.scene.renderables.length, 4);
  assert.equal(initialReadModel.timeline.length, initialReadModel.commandResults.length);

  const updatedReadModel = applySelectedEntityReadModel(
    initialReadModel,
    dispatchResult.proposal?.entityId ?? '',
  );

  assert.equal(updatedReadModel.selectedEntityId, modelEntity.id);
  assert.equal(updatedReadModel.scene.selectedRenderableId, 'scene-node-renderable:3');
  assert.equal(updatedReadModel.timelineSequence, initialReadModel.timelineSequence + 1);
  assert.equal(updatedReadModel.timeline.at(-1)?.commandId, 'selection.set_active_entity');
});

test('viewport adapter marks the shared selected renderable without owning state', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const adapter = buildStudioViewportAdapterReadModel({
    scene: readModel.scene,
    camera: buildStudioViewportCameraReadModel(),
    tool: buildStudioViewportToolReadModel(),
  });
  const selectedRenderable = adapter.renderables.find(renderable => renderable.selected);

  assert.equal(adapter.adapterVersion, 'studio-viewport-adapter.v0');
  assert.equal(adapter.renderables.length, readModel.scene.renderables.length);
  assert.equal(selectedRenderable?.renderableId, 'scene-node-renderable:2');
  assert.equal(adapter.tool.activeTool, 'select');
  assert.match(adapter.camera.cameraHash, /^viewport-camera-/);
  assert.match(adapter.readbackHash, /^viewport-readback-/);
  assert.ok(adapter.nonClaims.includes('not_native_runtime_authority'));
});

test('viewport adapter includes render settings in deterministic readback', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const preferences = updateStudioRenderSetting(
    buildStudioPreferencesReadModel(),
    'wireframeEnabled',
    true,
  );
  const adapter = buildStudioViewportAdapterReadModel({
    scene: readModel.scene,
    renderSettings: preferences.render,
  });

  assert.equal(adapter.renderSettings.wireframeEnabled, true);
  assert.equal(adapter.renderSettings.showRaycastHitDebug, false);
  assert.match(adapter.renderSettings.renderSettingsHash, /^render-settings-/);
  assert.match(adapter.readbackHash, /^viewport-readback-/);
});

test('raycast hit debug is a hashed render setting for viewport diagnostics', () => {
  const preferences = updateStudioRenderSetting(
    buildStudioPreferencesReadModel(),
    'showRaycastHitDebug',
    true,
  );

  assert.equal(preferences.render.showRaycastHitDebug, true);
  assert.match(preferences.render.renderSettingsHash, /^render-settings-/);
});

test('viewport camera controls produce deterministic camera read-model updates', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const initialCamera = buildStudioViewportCameraReadModel();
  const orbited = orbitStudioViewportCamera(initialCamera, { deltaX: 24, deltaY: -12 });
  const panned = panStudioViewportCamera(orbited, { deltaX: 16, deltaY: 8 });
  const zoomed = zoomStudioViewportCamera(panned, -120);
  const framed = frameStudioViewportCamera(readModel.scene);

  assert.notEqual(orbited.cameraHash, initialCamera.cameraHash);
  assert.notEqual(panned.cameraHash, orbited.cameraHash);
  assert.notEqual(zoomed.cameraHash, panned.cameraHash);
  assert.match(framed.cameraHash, /^viewport-camera-/);
  assert.equal(framed.target.x, 2.25);
  assert.equal(framed.target.y, 0.5);
});

test('selected viewport framing targets the selected renderable bounds', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const framed = frameStudioViewportCameraOnRenderable(readModel.scene, 'scene-node-renderable:2');

  assert.match(framed.cameraHash, /^viewport-camera-/);
  assert.equal(framed.target.x, 0.5);
  assert.equal(framed.target.y, 0.5);
  assert.equal(framed.target.z, 0.5);
});

test('selected viewport framing falls back to the full scene when selection is missing', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const sceneFramed = frameStudioViewportCamera(readModel.scene);
  const fallbackFramed = frameStudioViewportCameraOnRenderable(readModel.scene, 'missing-renderable');

  assert.equal(fallbackFramed.cameraHash, sceneFramed.cameraHash);
  assert.equal(fallbackFramed.target.x, sceneFramed.target.x);
  assert.equal(fallbackFramed.target.y, sceneFramed.target.y);
});

test('viewport hit read model records face and voxel detail deterministically', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const renderable = readModel.scene.renderables.find(
    item => item.renderableId === 'scene-node-renderable:2',
  );

  assert.ok(renderable);
  const hit = buildStudioViewportHitReadModel({
    renderable,
    face: 'z_max',
    worldPosition: { x: 0.25, y: 0.75, z: 0.99 },
  });

  assert.equal(hit.renderableId, 'scene-node-renderable:2');
  assert.equal(hit.face, 'z_max');
  assert.deepEqual(hit.voxelCoord, { x: 0, y: 0, z: 0 });
  assert.match(hit.hitHash, /^viewport-hit-/);
});

test('viewport hit read model leaves non-voxel assets without voxel coordinates', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const renderable = readModel.scene.renderables.find(
    item => item.renderableId === 'scene-node-renderable:3',
  );

  assert.ok(renderable);
  const hit = buildStudioViewportHitReadModel({
    renderable,
    face: 'x_max',
    worldPosition: { x: 1.4, y: 1.4, z: 0.4 },
  });

  assert.equal(hit.voxelCoord, null);
  assert.equal(hit.face, 'x_max');
});

test('workspace new clears scene through a recorded read-model command', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const cleared = clearStudioWorkspaceReadModel(readModel);

  assert.equal(cleared.scene.renderables.length, 0);
  assert.equal(cleared.selectedEntityId, null);
  assert.equal(cleared.scene.selectedRenderableId, null);
  assert.equal(cleared.timelineSequence, readModel.timelineSequence + 1);
  assert.equal(cleared.timeline.at(-1)?.commandId, 'workspace.new');
  assert.equal(cleared.commandResults.at(-1)?.changedScene, true);
  assert.equal(cleared.session.scenarioLabel, 'Empty Scene');
});

test('canonical scene documents project by authored node identity without runtime state', () => {
  const initial = buildInitialWorkspaceReadModel();
  const document = {
    schemaVersion: 1,
    id: sceneId(77),
    metadata: { name: 'Host Scene', authoringFormatVersion: 1 },
    dependencies: [{ id: 'mesh.host-cube', version: { req: 'any' as const }, hash: null }],
    nodes: [
      {
        id: sceneNodeId(90),
        parent: null,
        childOrder: 0,
        label: 'Root',
        tags: [],
        transform: { translation: [0, 0, 0] as const, rotation: [0, 0, 0, 1] as const, scale: [1, 1, 1] as const },
        kind: { kind: 'emptyGroup' as const },
      },
      {
        id: sceneNodeId(450),
        parent: sceneNodeId(90),
        childOrder: 0,
        label: 'Host Cube',
        tags: ['authored'],
        transform: { translation: [4, 2, -1] as const, rotation: [0, 0, 0, 1] as const, scale: [2, 4, 6] as const },
        kind: {
          kind: 'staticMesh' as const,
          asset: { id: 'mesh.host-cube', version: { req: 'any' as const }, hash: null },
        },
      },
    ],
  };

  const projected = applyCanonicalSceneDocumentReadModel(initial, document, '/tmp/host.scene.json');

  assert.equal(projected.flatSceneDocument, document);
  assert.equal(projected.scene.sceneId, 'scene-document:77');
  assert.equal(projected.scene.renderables[0]?.renderableId, 'scene-node-renderable:450');
  assert.equal(projected.sceneObjectSnapshot.objects.some(object => object.sceneNodeId === sceneNodeId(450)), true);
  assert.equal(projected.session.scenarioLabel, 'Host Scene');
  assert.deepEqual(findUnresolvedSceneAssetIds(document, []), ['mesh.host-cube']);
  assert.deepEqual(findUnresolvedSceneAssetIds(document, ['mesh.host-cube']), []);
});

test('game workspace loader opens the asha-testing manifest without path guessing', () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  assert.equal(result.workspace.workspaceVersion, 'studio-game-workspace.v0');
  assert.equal(result.workspace.gameId, loadDemoPackageName());
  assert.equal(result.workspace.manifestPath, 'asha.game.toml');
  assert.equal(result.workspace.attachEndpoint, 'ws://127.0.0.1:7391');
  assert.equal(result.workspace.devCommand, 'npm run dev');
  assert.equal(result.workspace.runtimeEntry, 'harness/conformance/fixtures/minimal-world.json');
  assert.equal(result.workspace.publishCommand, 'npm run publish:artifact');
  assert.equal(result.workspace.publishVerifyCommand, 'npm run conformance');
  assert.deepEqual(result.workspace.sceneRoots, ['scenes']);
  assert.deepEqual(result.workspace.assetRoots, ['assets']);
  assert.deepEqual(result.workspace.catalogPackages, ['packages/game-catalogs']);
  assert.deepEqual(result.workspace.policyPackages, ['packages/game-policy']);
  assert.ok(result.workspace.allowedSourceWrites.includes('packages/game-catalogs'));
  assert.ok(result.workspace.allowedSourceWrites.includes('prefabs'));
  assert.match(result.workspace.workspaceHash, /^studio-game-workspace-/);

  const readout = buildStudioGameWorkspaceReadout(result.workspace);
  assert.equal(readout.readoutVersion, 'studio-game-workspace-readout.v0');
  assert.deepEqual(readout.commandIds, {
    openWorkspace: 'workspace.open_game_manifest',
    validateManifest: 'workspace.validate_game_manifest',
  });
  assert.equal(readout.gameId, loadDemoPackageName());
  assert.equal(readout.compatibility.engineVersion, '0.1.0');
  assert.equal(readout.compatibility.contractsVersion, '0.1.0');
  assert.equal(readout.compatibility.runtimeBridgeVersion, '0.1.0');
  assert.equal(readout.compatibility.devtoolsProtocolVersion, 'devtools-protocol.v0');
  assert.equal(readout.attachEndpoint, 'ws://127.0.0.1:7391');
  assert.equal(readout.devCommand, 'npm run dev');
  assert.equal(readout.runtimeEntry, 'harness/conformance/fixtures/minimal-world.json');
  assert.equal(readout.publishCommand, 'npm run publish:artifact');
  assert.equal(readout.publishVerifyCommand, 'npm run conformance');
  assert.deepEqual(readout.devResourceProfile, {
    localRoots: ['prefabs', 'assets', 'packages/game-catalogs'],
    cacheDir: 'harness/out/dev-cache',
    resolutionPolicy: 'prefer-source',
  });
  assert.deepEqual(readout.publishResourceProfile, {
    outputDir: 'harness/out/publish/resources',
    archiveDir: 'harness/out/publish/archive',
    resolutionPolicy: 'locked',
  });
  assert.deepEqual(readout.sceneRoots, ['scenes']);
  assert.deepEqual(readout.assetRoots, ['assets']);
  assert.deepEqual(readout.catalogPackages, ['packages/game-catalogs']);
  assert.deepEqual(readout.policyPackages, ['packages/game-policy']);
  assert.ok(COMMAND_IDS.includes('workspace.open_game_manifest'));
  assert.ok(COMMAND_IDS.includes('workspace.validate_game_manifest'));
});

test('workspace open/read model enumerates catalog refs without owning scene files', () => {
  const manifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8');
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText,
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');

  const sourcePaths = ['packages/game-catalogs/catalog.json'];
  const openRead = buildStudioWorkspaceOpenReadModel({
    workspace: result.workspace,
    manifestPath: 'asha.game.toml',
    manifestHash: sha256(manifestText),
    sourceFiles: sourcePaths.map(path => {
      const text = readFileSync(join(demoRoot, path), 'utf8');
      return { path, text, sha256: sha256(text) };
    }),
  });

  assert.equal(openRead.ok, true);
  if (!openRead.ok) throw new Error('workspace source files should read');
  assert.equal(openRead.openRead.openReadVersion, 'studio-workspace-open-read.v0');
  assert.equal(openRead.openRead.manifestPath, 'asha.game.toml');
  assert.equal(openRead.openRead.authoringPersistenceVersion, 'authoring-persistence.v0');
  assert.deepEqual(openRead.openRead.allowedCatalogRoots, ['packages/game-catalogs']);
  assert.deepEqual(openRead.openRead.sourceFiles.map(file => file.path), sourcePaths);
  assert.deepEqual(openRead.openRead.sourceFiles.map(file => file.schemaKind), ['asset-catalog-json.v1']);
  assert.ok(openRead.openRead.sourceFiles.every(file => file.hash.startsWith('sha256:')));
  assert.ok(openRead.openRead.nonClaims.includes('not_repo_crawler'));
  assert.ok(openRead.openRead.nonClaims.includes('not_source_write'));
  assert.match(openRead.openRead.openReadHash, /^studio-workspace-open-read-/);
});

test('workspace open/read model fails closed on missing manifest and unsupported scans', () => {
  const missingManifest = buildStudioWorkspaceOpenReadModel({
    workspace: null,
    manifestPath: 'missing/asha.game.toml',
    manifestHash: null,
    sourceFiles: [],
  });
  assert.equal(missingManifest.ok, false);
  assert.equal(missingManifest.diagnostics.at(0)?.code, 'missing_manifest');

  const manifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8');
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText,
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');

  const failed = buildStudioWorkspaceOpenReadModel({
    workspace: result.workspace,
    manifestPath: 'asha.game.toml',
    manifestHash: sha256(manifestText),
    sourceFiles: [
      { path: '../asha-engine/package.json', text: '{}', sha256: sha256('{}') },
      { path: 'packages/game-catalogs/README.md', text: '# no', sha256: sha256('# no') },
      { path: 'assets/meshes/demo-cube.mesh.json', text: '{}', sha256: sha256('{}') },
    ],
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.openRead.sourceFiles.length, 0);
  assert.ok(failed.diagnostics.some(diagnostic => diagnostic.code === 'workspace_source_path_escape'));
  assert.ok(failed.diagnostics.some(diagnostic => diagnostic.code === 'private_repo_scan'));
  assert.ok(failed.diagnostics.some(diagnostic => diagnostic.code === 'unsupported_file_kind'));
});

evidenceProcessTest('catalog save roundtrip proof command writes validates reopens and restores', () => {
  const beforeCatalog = readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8');
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'catalog-save-roundtrip'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/catalog-save-roundtrip-proof\/latest\/index\.json/);
  assert.equal(readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8'), beforeCatalog);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/catalog-save-roundtrip-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_catalog_save_roundtrip_proof');
  assert.equal(artifact.save.ok, true);
  assert.equal(artifact.save.readback.normalizedPath, 'packages/game-catalogs/catalog.json');
  assert.match(artifact.save.readback.previousFileHash, /^sha256:/);
  assert.match(artifact.save.readback.nextFileHash, /^sha256:/);
  assert.deepEqual(artifact.diffSummary.addedAssetIds, ['material.studio-roundtrip']);
  assert.deepEqual(artifact.diffSummary.dependencyDiagnostics, []);
  assert.equal(artifact.reopened.ok, true);
  assert.ok(artifact.validations.includes('negative_duplicate_ids_failed_closed'));
  assert.ok(artifact.validations.includes('negative_stale_base_hash_failed_closed'));
  assert.ok(artifact.validations.includes('negative_invalid_asset_refs_failed_closed'));
  assert.ok(artifact.validations.includes('negative_disallowed_path_failed_closed'));
});

test('game workspace attach client performs typed devtools handshake', async () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const handshake = buildStudioGameWorkspaceHandshakeRequest(result.workspace);
  assert.equal(handshake.type, 'handshake.request');
  assert.equal(handshake.clientName, 'asha-studio');
  assert.equal(handshake.requestedWorkspaceId, loadDemoPackageName());
  assert.equal(handshake.protocolVersion, result.workspace.manifest.asha.devtoolsProtocolVersion);

  const attached = await attachStudioGameWorkspaceDevtools(
    result.workspace,
    createStudioDevtoolsFixtureEndpoint(),
  );

  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  assert.equal(attached.attach.attachVersion, 'studio-game-workspace-attach.v0');
  assert.equal(attached.attach.status, 'attached');
  assert.equal(attached.attach.endpoint, 'ws://127.0.0.1:7391');
  assert.equal(attached.attach.runtime.gameId, loadDemoPackageName());
  assert.equal(attached.attach.runtime.workspaceId, loadDemoPackageName());
  assert.equal(attached.attach.runtimeBackendEvidence.source, 'devtools.handshake.runtime');
  assert.equal(attached.attach.runtimeBackendEvidence.backendMode, null);
  assert.deepEqual(attached.attach.runtimeBackendEvidence.backendProofRefs, []);
  assert.equal(attached.attach.compatibility.protocolVersion, 'devtools-protocol.v0');
  assert.equal(attached.attach.compatibility.contractsCompatibility, 'contracts.v0');
  assert.equal(attached.attach.compatibility.runtimeBridgeCompatibility, 'runtime-bridge.v0');
  assert.equal(attached.attach.compatibility.publishArtifactFormat, 'publish-artifact.v0');
  assert.equal(attached.attach.workspaceHash, result.workspace.workspaceHash);
  assert.match(attached.attach.attachHash, /^studio-game-workspace-attach-/);
});

test('game workspace attach client fails closed on incompatible protocol', async () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const attached = await attachStudioGameWorkspaceDevtools(
    result.workspace,
    createStudioDevtoolsFixtureEndpoint({ forceProtocolVersion: 'devtools-protocol.v999' }),
  );

  assert.equal(attached.ok, false);
  if (attached.ok) throw new Error('incompatible protocol should fail');
  assert.equal(attached.diagnostics.at(0)?.code, 'attach_protocol_mismatch');
});

test('game workspace live readout pulls projection render diff and telemetry through attach transport', async () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const transport = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');

  const live = await refreshStudioGameWorkspaceLiveReadModel(
    result.workspace,
    attached.attach,
    transport,
  );

  assert.equal(live.ok, true);
  if (!live.ok) throw new Error('live readout should refresh');
  assert.equal(live.live.liveVersion, 'studio-game-workspace-live.v0');
  assert.equal(live.live.endpoint, 'ws://127.0.0.1:7391');
  assert.equal(live.live.workspaceHash, result.workspace.workspaceHash);
  assert.equal(live.live.attachHash, attached.attach.attachHash);
  assert.equal(live.live.projection.runtimeSessionSummaryHash, 'runtime-session:demo:1');
  assert.equal(live.live.projection.entityCount, 1);
  assert.equal(live.live.renderDiffHash, 'render:demo:1');
  assert.equal(live.live.renderDiff.ops.length, 0);
  assert.equal(live.live.telemetry.some(sample => sample.metric === 'frame_ms'), true);
  assert.equal(live.live.telemetry.some(sample => sample.metric === 'command_queue_depth'), true);
  assert.match(live.live.liveHash, /^studio-game-workspace-live-/);
});

test('runtime session list turns attach and live evidence into an explicit session row', async () => {
  const referenceManifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')
    .replace('backend_mode = "native"', 'backend_mode = "reference"')
    .replace('backend_profile = "native.napi.launcher.v1"', 'backend_profile = "reference"')
    .replace('backend_proof_refs = ["proof:dev-authority-smoke"]', 'backend_proof_refs = []');
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: referenceManifestText,
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const transport = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  const live = await refreshStudioGameWorkspaceLiveReadModel(result.workspace, attached.attach, transport);
  assert.equal(live.ok, true);
  if (!live.ok) throw new Error('live readout should refresh');

  const sessions = buildStudioRuntimeSessionList({
    workspace: result.workspace,
    attach: attached.attach,
    live: live.live,
  });
  const activeSession = sessions.sessions.find(session => session.sessionId === sessions.activeSessionId);

  assert.equal(sessions.runtimeSessionListVersion, 'studio-runtime-session-list.v0');
  assert.ok(activeSession);
  assert.equal(activeSession.sessionType, 'attached');
  assert.equal(activeSession.status, 'attached');
  assert.equal(activeSession.runtimeMode, 'reference');
  assert.equal(activeSession.backendMode, 'reference');
  assert.equal(activeSession.backendProfile, 'reference');
  assert.deepEqual(activeSession.backendProofRefs, []);
  assert.equal(activeSession.backendCompatibilityState, 'compatible');
  assert.equal(activeSession.attachStatus, 'attached');
  assert.equal(activeSession.attachHash, attached.attach.attachHash);
  assert.equal(activeSession.liveHash, live.live.liveHash);
  assert.equal(activeSession.projection?.runtimeSessionSummaryHash, 'runtime-session:demo:1');
  assert.equal(activeSession.evidenceRefs.some(ref => ref.kind === 'runtime-attach'), true);
  assert.equal(activeSession.evidenceRefs.some(ref => ref.kind === 'runtime-live'), true);
  assert.equal(activeSession.nonClaims.includes('not_native_runtime_authority'), true);
  assert.equal(activeSession.nonClaims.includes('not_wasm_authority'), true);
  assert.match(activeSession.sessionHash, /^studio-runtime-session-/);
  assert.match(sessions.sessionListHash, /^studio-runtime-session-list-/);
});

test('running project discovery projects connect refresh disconnect affordances', async () => {
  const referenceManifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')
    .replace('backend_mode = "native"', 'backend_mode = "reference"')
    .replace('backend_profile = "native.napi.launcher.v1"', 'backend_profile = "reference"')
    .replace('backend_proof_refs = ["proof:dev-authority-smoke"]', 'backend_proof_refs = []');
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: referenceManifestText,
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');

  const previewSessions = buildStudioRuntimeSessionList({ workspace: result.workspace });
  const previewDiscovery = buildStudioRunningProjectDiscovery({
    workspace: result.workspace,
    runtimeSessions: previewSessions,
  });
  assert.equal(previewDiscovery.canConnect, true);
  assert.equal(previewDiscovery.canDisconnect, false);
  assert.ok(previewDiscovery.diagnostics.some(diagnostic => diagnostic.code === 'running_project_not_attached'));
  assert.ok(previewDiscovery.nonClaims.includes('not_network_scan'));

  const transport = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  const live = await refreshStudioGameWorkspaceLiveReadModel(result.workspace, attached.attach, transport);
  assert.equal(live.ok, true);
  if (!live.ok) throw new Error('live readout should refresh');

  const connectedSessions = buildStudioRuntimeSessionList({
    workspace: result.workspace,
    attach: attached.attach,
    live: live.live,
  });
  const connectedDiscovery = buildStudioRunningProjectDiscovery({
    workspace: result.workspace,
    runtimeSessions: connectedSessions,
  });
  assert.equal(connectedDiscovery.discoveryVersion, 'studio-running-project-discovery.v0');
  assert.equal(connectedDiscovery.canConnect, false);
  assert.equal(connectedDiscovery.canDisconnect, true);
  assert.equal(connectedDiscovery.commandIds.connect, 'project.connect_running');
  assert.equal(connectedDiscovery.sessions.at(0)?.runtimeSessionSummaryHash, 'runtime-session:demo:1');
  assert.match(connectedDiscovery.discoveryHash, /^studio-running-project-discovery-/);

  const staleSessions = buildStudioRuntimeSessionList({
    workspace: result.workspace,
    attach: attached.attach,
  });
  const staleDiscovery = buildStudioRunningProjectDiscovery({
    workspace: result.workspace,
    runtimeSessions: staleSessions,
    attemptedPrivateTransport: true,
  });
  assert.ok(staleDiscovery.diagnostics.some(diagnostic => diagnostic.code === 'running_project_stale_live_readback'));
  assert.ok(staleDiscovery.diagnostics.some(diagnostic => diagnostic.code === 'running_project_private_transport'));
});

test('live debug session identity records attached session freshness and child evidence', async () => {
  const referenceManifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')
    .replace('backend_mode = "native"', 'backend_mode = "reference"')
    .replace('backend_profile = "native.napi.launcher.v1"', 'backend_profile = "reference"')
    .replace('backend_proof_refs = ["proof:dev-authority-smoke"]', 'backend_proof_refs = []');
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: referenceManifestText,
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const transport = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  const live = await refreshStudioGameWorkspaceLiveReadModel(result.workspace, attached.attach, transport);
  assert.equal(live.ok, true);
  if (!live.ok) throw new Error('live readout should refresh');
  const sessions = buildStudioRuntimeSessionList({
    workspace: result.workspace,
    attach: attached.attach,
    live: live.live,
  });

  const identity = buildStudioLiveDebugSessionIdentity({
    runtimeSessions: sessions,
    childArtifacts: [{
      kind: 'studio-selected-backend-attach-proof',
      path: 'artifacts/selected-backend-attach-proof/latest/index.json',
      artifactHash: 'sha256:attach',
      fileHash: 'sha256:file',
      expectedArtifactHash: 'sha256:attach',
      expectedFileHash: 'sha256:file',
    }],
  });

  assert.equal(identity.ok, true);
  assert.equal(identity.identity.identityVersion, 'studio-live-debug-session-identity.v0');
  assert.equal(identity.identity.attachStatus, 'attached');
  assert.equal(identity.identity.liveFreshness.readAfterAttach, true);
  assert.equal(identity.identity.liveFreshness.runtimeSessionSummaryHash, 'runtime-session:demo:1');
  assert.equal(identity.identity.liveFreshness.projectionTick, 1);
  assert.equal(identity.identity.liveFreshness.telemetrySampleCount, 1);
  assert.equal(identity.identity.childArtifacts.length, 1);
  assert.ok(identity.identity.nonClaims.includes('not_studio_runtime_authority'));
  assert.match(identity.identity.identityHash, /^studio-live-debug-session-identity-/);

  const stale = buildStudioLiveDebugSessionIdentity({
    runtimeSessions: sessions,
    childArtifacts: [{
      kind: 'studio-selected-backend-attach-proof',
      path: 'artifacts/selected-backend-attach-proof/latest/index.json',
      artifactHash: 'sha256:attach',
      fileHash: 'sha256:file',
      expectedArtifactHash: 'sha256:stale',
    }],
  });
  assert.equal(stale.ok, false);
  assert.ok(stale.diagnostics.some(diagnostic => diagnostic.code === 'stale_child_artifact'));

  const fixtureOnly = buildStudioLiveDebugSessionIdentity({
    runtimeSessions: {
      ...sessions,
      activeSessionId: `runtime-fixture:${loadDemoPackageName()}`,
    },
  });
  assert.equal(fixtureOnly.ok, false);
  assert.ok(fixtureOnly.diagnostics.some(diagnostic => diagnostic.code === 'missing_live_session'));
  assert.ok(fixtureOnly.diagnostics.some(diagnostic => diagnostic.code === 'stale_fixture_readback'));
});

test('live scene/entity debug inspector projects selected scene readback without private ECS state', async () => {
  const workspace = buildAuthoredWorkspaceReadModel();
  const identityResult = buildStudioLiveDebugSessionIdentity({
    runtimeSessions: {
      runtimeSessionListVersion: 'studio-runtime-session-list.v0',
      activeSessionId: 'runtime-attached:asha-demo:attach-1',
      diagnostics: [],
      sessionListHash: 'runtime-session-list-test',
      sessions: [{
        runtimeSessionVersion: 'studio-runtime-session.v0',
        sessionId: 'runtime-attached:asha-demo:attach-1',
        sessionType: 'attached',
        status: 'attached',
        endpoint: 'ws://127.0.0.1:7391',
        profileId: 'prefer-source',
        runtimeMode: 'reference',
        backendMode: 'reference',
        backendProfile: 'reference',
        backendProofRefs: [],
        backendCompatibilityState: 'compatible',
        attachStatus: 'attached',
        workspaceHash: 'workspace-test',
        attachHash: 'attach-1',
        liveHash: 'live-2',
        compatibility: {
          contractsVersion: '0.1.0',
          runtimeBridgeVersion: '0.1.0',
          devtoolsProtocolVersion: 'devtools-protocol.v0',
          publishArtifactVersion: 'publish-artifact.v0',
        },
        projection: {
          runtimeSessionSummaryHash: 'runtime-session:debug',
          renderDiffHash: 'render:debug',
          entityCount: 1,
          tick: 2,
        },
        evidenceRefs: [{ kind: 'runtime-live', path: 'devtools:projection', sha256: 'live-2' }],
        nonClaims: ['not_native_runtime_authority'],
        diagnostics: [],
        sessionHash: 'session-debug',
      }],
    },
  });
  assert.equal(identityResult.ok, true);
  if (!identityResult.ok) throw new Error('identity should validate');

  const inspector = buildStudioLiveSceneEntityDebugInspector({
    workspace,
    liveSessionIdentity: identityResult.identity,
  });
  assert.equal(inspector.ok, true);
  assert.equal(inspector.inspector.inspectorVersion, 'studio-live-scene-entity-debug-inspector.v0');
  assert.equal(inspector.inspector.scene.sceneId, workspace.scene.sceneId);
  assert.equal(inspector.inspector.scene.renderableCount, workspace.scene.renderables.length);
  assert.equal(inspector.inspector.scene.selectedRenderableId, workspace.scene.selectedRenderableId);
  assert.equal(inspector.inspector.entity.entityId, workspace.selectedEntityId);
  assert.equal(inspector.inspector.entity.label, 'Authored Voxel Volume');
  assert.equal(inspector.inspector.entity.provenance?.renderableId, workspace.scene.selectedRenderableId);
  assert.deepEqual(inspector.inspector.entity.transform?.translation, [0.5, 0.5, 0.5]);
  assert.ok(inspector.inspector.nonClaims.includes('not_private_ecs_read'));
  assert.match(inspector.inspector.inspectorHash, /^studio-live-scene-entity-debug-inspector-/);

  const missingSelection = buildStudioLiveSceneEntityDebugInspector({
    workspace: { ...workspace, selectedEntityId: null },
    liveSessionIdentity: identityResult.identity,
  });
  assert.equal(missingSelection.ok, false);
  assert.ok(missingSelection.diagnostics.some(diagnostic => diagnostic.code === 'missing_selected_entity'));

  const staleSession = buildStudioLiveSceneEntityDebugInspector({
    workspace,
    liveSessionIdentity: {
      ...identityResult.identity,
      attachStatus: 'not_attached',
      liveFreshness: { ...identityResult.identity.liveFreshness, readAfterAttach: false },
    },
  });
  assert.equal(staleSession.ok, false);
  assert.ok(staleSession.diagnostics.some(diagnostic => diagnostic.code === 'missing_live_session'));
});

test('live asset/resource debug inspector projects catalog and resource readback', () => {
  const identityResult = buildStudioLiveDebugSessionIdentity({
    runtimeSessions: {
      runtimeSessionListVersion: 'studio-runtime-session-list.v0',
      activeSessionId: 'runtime-attached:asha-demo:attach-1',
      diagnostics: [],
      sessionListHash: 'runtime-session-list-test',
      sessions: [{
        runtimeSessionVersion: 'studio-runtime-session.v0',
        sessionId: 'runtime-attached:asha-demo:attach-1',
        sessionType: 'attached',
        status: 'attached',
        endpoint: 'ws://127.0.0.1:7391',
        profileId: 'prefer-source',
        runtimeMode: 'reference',
        backendMode: 'reference',
        backendProfile: 'reference',
        backendProofRefs: [],
        backendCompatibilityState: 'compatible',
        attachStatus: 'attached',
        workspaceHash: 'workspace-test',
        attachHash: 'attach-1',
        liveHash: 'live-2',
        compatibility: {
          contractsVersion: '0.1.0',
          runtimeBridgeVersion: '0.1.0',
          devtoolsProtocolVersion: 'devtools-protocol.v0',
          publishArtifactVersion: 'publish-artifact.v0',
        },
        projection: {
          runtimeSessionSummaryHash: 'runtime-session:debug',
          renderDiffHash: 'render:debug',
          entityCount: 1,
          tick: 2,
        },
        evidenceRefs: [{ kind: 'runtime-live', path: 'devtools:projection', sha256: 'live-2' }],
        nonClaims: ['not_native_runtime_authority'],
        diagnostics: [],
        sessionHash: 'session-debug',
      }],
    },
  });
  assert.equal(identityResult.ok, true);
  if (!identityResult.ok) throw new Error('identity should validate');
  const catalog = sampleCatalog();
  const inventory = loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: { path: 'asha.game.toml', hash: 'sha256:manifest' },
    catalog: { path: 'packages/game-catalogs/catalog.json', hash: 'sha256:catalog' },
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
        importStatus: 'clean',
        publishOutputKey: entry.publish.outputKey,
      },
      publishResolution: {
        outputKey: entry.publish.outputKey,
        packedPath: `harness/out/publish/resources/${entry.publish.outputKey}`,
        packedHash: `sha256:${entry.id}`,
        packedBytes: 1,
      },
      diagnostics: [],
      evidenceRefs: [],
    })),
  }, {
    referencedRenderableIds: { 'material.demo-copper': ['model-preview-crate'] },
  });
  assert.equal(inventory.ok, true);
  if (!inventory.ok) throw new Error('inventory should load');

  const inspector = buildStudioLiveAssetResourceDebugInspector({
    assetInventory: inventory.inventory,
    liveSessionIdentity: identityResult.identity,
    selectedAssetId: 'material.demo-copper',
  });
  assert.equal(inspector.ok, true);
  assert.equal(inspector.inspector.inspectorVersion, 'studio-live-asset-resource-debug-inspector.v0');
  assert.equal(inspector.inspector.asset.assetId, 'material.demo-copper');
  assert.equal(inspector.inspector.asset.kind, 'material');
  assert.equal(inspector.inspector.asset.sourceHash, 'sha256:material');
  assert.equal(inspector.inspector.asset.importStatus, 'clean');
  assert.deepEqual(inspector.inspector.asset.referencedRenderableIds, ['model-preview-crate']);
  assert.match(inspector.inspector.inspectorHash, /^studio-live-asset-resource-debug-inspector-/);

  const missing = buildStudioLiveAssetResourceDebugInspector({
    assetInventory: inventory.inventory,
    liveSessionIdentity: identityResult.identity,
    selectedAssetId: 'material.missing',
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.diagnostics.some(diagnostic => diagnostic.code === 'missing_asset_resource'));
});

test('live runtime/telemetry debug inspector projects runtime and command metrics', async () => {
  const referenceManifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')
    .replace('backend_mode = "native"', 'backend_mode = "reference"')
    .replace('backend_profile = "native.napi.launcher.v1"', 'backend_profile = "reference"')
    .replace('backend_proof_refs = ["proof:dev-authority-smoke"]', 'backend_proof_refs = []');
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: referenceManifestText,
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const transport = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  const live = await refreshStudioGameWorkspaceLiveReadModel(result.workspace, attached.attach, transport);
  assert.equal(live.ok, true);
  if (!live.ok) throw new Error('live readout should refresh');
  const sessions = buildStudioRuntimeSessionList({
    workspace: result.workspace,
    attach: attached.attach,
    live: live.live,
  });
  const identity = buildStudioLiveDebugSessionIdentity({ runtimeSessions: sessions });
  assert.equal(identity.ok, true);
  if (!identity.ok) throw new Error('identity should validate');

  const inspector = buildStudioLiveRuntimeTelemetryDebugInspector({
    liveSessionIdentity: identity.identity,
    live: live.live,
  });
  assert.equal(inspector.ok, true);
  assert.equal(inspector.inspector.inspectorVersion, 'studio-live-runtime-telemetry-debug-inspector.v0');
  assert.equal(inspector.inspector.runtime.runtimeMode, 'reference');
  assert.equal(inspector.inspector.projection?.runtimeSessionSummaryHash, 'runtime-session:demo:1');
  assert.equal(inspector.inspector.telemetry.sampleCount, live.live.telemetry.length);
  assert.ok(inspector.inspector.telemetry.sampleMetrics.includes('command_queue_depth'));
  assert.equal(inspector.inspector.telemetry.commandQueueDepth, 0);
  assert.match(inspector.inspector.inspectorHash, /^studio-live-runtime-telemetry-debug-inspector-/);

  const missingTelemetry = buildStudioLiveRuntimeTelemetryDebugInspector({
    liveSessionIdentity: identity.identity,
    live: { ...live.live, telemetry: [] },
  });
  assert.equal(missingTelemetry.ok, false);
  assert.ok(missingTelemetry.diagnostics.some(diagnostic => diagnostic.code === 'telemetry_readback_missing'));
});

test('live debug command proposal surface bounds actions to shared command evidence', async () => {
  const referenceManifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')
    .replace('backend_mode = "native"', 'backend_mode = "reference"')
    .replace('backend_profile = "native.napi.launcher.v1"', 'backend_profile = "reference"')
    .replace('backend_proof_refs = ["proof:dev-authority-smoke"]', 'backend_proof_refs = []');
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: referenceManifestText,
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const transport = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  const live = await refreshStudioGameWorkspaceLiveReadModel(result.workspace, attached.attach, transport);
  assert.equal(live.ok, true);
  if (!live.ok) throw new Error('live readout should refresh');
  const sessions = buildStudioRuntimeSessionList({
    workspace: result.workspace,
    attach: attached.attach,
    live: live.live,
  });
  const identity = buildStudioLiveDebugSessionIdentity({ runtimeSessions: sessions });
  assert.equal(identity.ok, true);
  if (!identity.ok) throw new Error('identity should validate');
  const sceneInspector = buildStudioLiveSceneEntityDebugInspector({
    workspace: buildAuthoredWorkspaceReadModel(),
    liveSessionIdentity: identity.identity,
  });
  assert.equal(sceneInspector.ok, true);
  const runtimeInspector = buildStudioLiveRuntimeTelemetryDebugInspector({
    liveSessionIdentity: identity.identity,
    live: live.live,
  });
  assert.equal(runtimeInspector.ok, true);
  const command = buildDevtoolsProtocolGoldenFixtures().commandProposal;
  const accepted = buildStudioGameWorkspaceCommandProposalReadModel({
    workspace: result.workspace,
    attachHash: attached.attach.attachHash,
    sequenceId: command.sequenceId,
    batch: command.batch,
    status: 'accepted',
    result: { accepted: 1, rejected: 0, rejections: [] },
    authorityHashAfter: 'authority:after:accepted',
  });
  const rejected = buildStudioGameWorkspaceCommandProposalReadModel({
    workspace: result.workspace,
    attachHash: attached.attach.attachHash,
    sequenceId: 'seq-2',
    batch: command.batch,
    status: 'rejected',
    result: { accepted: 0, rejected: 1, rejections: [{ reason: 'runtime_unavailable' }] },
    authorityHashBefore: 'authority:after:accepted',
    authorityHashAfter: 'authority:after:accepted',
    rejectionReason: 'runtime_unavailable',
  });
  const panel = buildStudioCommandProposalPanel({
    workspace: result.workspace,
    runtimeSessions: sessions,
    commandProposals: [accepted, rejected],
  });

  const surface = buildStudioLiveDebugCommandProposalSurface({
    liveSessionIdentity: identity.identity,
    sceneEntityInspector: sceneInspector.inspector,
    runtimeTelemetryInspector: runtimeInspector.inspector,
    commandProposalPanel: panel,
    evidenceRefs: [{ kind: 'studio-selected-backend-command-proof', path: 'artifacts/proof.json', sha256: 'sha256:proof' }],
  });

  assert.equal(surface.ok, true);
  assert.equal(surface.surface.surfaceVersion, 'studio-live-debug-command-proposals.v0');
  assert.deepEqual(surface.surface.allowedActionIds, ['set_voxel_reference']);
  assert.deepEqual(surface.surface.proposalStatuses, ['accepted', 'rejected']);
  assert.equal(surface.surface.acceptedProposalHash, accepted.proposalHash);
  assert.equal(surface.surface.rejectedProposalHash, rejected.proposalHash);
  assert.ok(surface.surface.nonClaims.includes('not_freeform_json_method_call'));
  assert.match(surface.surface.surfaceHash, /^studio-live-debug-command-proposals-/);

  const unsupported = buildStudioLiveDebugCommandProposalSurface({
    liveSessionIdentity: identity.identity,
    sceneEntityInspector: sceneInspector.inspector,
    runtimeTelemetryInspector: runtimeInspector.inspector,
    commandProposalPanel: {
      ...panel,
      actions: [{ ...panel.actions[0], commandOperation: 'debug.rawJson' }],
    },
  });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.diagnostics.at(0)?.code, 'unsupported_debug_command');

  const missingRejected = buildStudioLiveDebugCommandProposalSurface({
    liveSessionIdentity: identity.identity,
    sceneEntityInspector: sceneInspector.inspector,
    runtimeTelemetryInspector: runtimeInspector.inspector,
    commandProposalPanel: { ...panel, proposals: [accepted] },
  });
  assert.equal(missingRejected.ok, false);
  assert.equal(missingRejected.diagnostics.at(0)?.code, 'missing_command_result_evidence');
});

test('runtime session list fails closed when backend evidence is missing or incompatible', async () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const transport = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');

  const mismatched = buildStudioRuntimeSessionList({
    workspace: result.workspace,
    attach: attached.attach,
  });
  const activeSession = mismatched.sessions.find(session => session.sessionId === mismatched.activeSessionId);
  assert.ok(activeSession);
  assert.equal(activeSession.status, 'degraded');
  assert.equal(activeSession.runtimeMode, 'reference');
  assert.equal(activeSession.backendMode, 'native');
  assert.equal(activeSession.backendProfile, 'native.napi.launcher.v1');
  assert.deepEqual(activeSession.backendProofRefs, []);
  assert.equal(activeSession.backendCompatibilityState, 'missing_evidence');
  assert.equal(activeSession.evidenceRefs.some(ref => ref.kind === 'runtime-backend-proof'), false);
  assert.equal(activeSession.diagnostics.some(diagnostic => diagnostic.code === 'runtime_session_missing_backend_evidence'), true);
  assert.equal(activeSession.diagnostics.some(diagnostic => diagnostic.code === 'runtime_session_backend_incompatible'), true);
  assert.equal(activeSession.nonClaims.includes('not_hardware_gpu_evidence'), true);

  const missingProofWorkspace = {
    ...result.workspace,
    manifest: {
      ...result.workspace.manifest,
      runtime: {
        ...result.workspace.manifest.runtime,
        backendProofRefs: [],
      },
    },
    workspaceHash: 'studio-game-workspace-test-missing-backend-proof',
  };
  const missingProof = buildStudioRuntimeSessionList({ workspace: missingProofWorkspace });
  const preview = missingProof.sessions.find(session => session.sessionId === missingProof.activeSessionId);
  assert.ok(preview);
  assert.equal(preview.status, 'degraded');
  assert.equal(preview.backendCompatibilityState, 'missing_evidence');
  assert.equal(preview.diagnostics.some(diagnostic => diagnostic.code === 'runtime_session_missing_backend_evidence'), true);
});

test('runtime session list does not infer native wasm or gpu authority from marker text', () => {
  const referenceManifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')
    .replace('backend_mode = "native"', 'backend_mode = "reference"')
    .replace('backend_profile = "native.napi.launcher.v1"', 'backend_profile = "reference"')
    .replace('backend_proof_refs = ["proof:dev-authority-smoke"]', 'backend_proof_refs = []');
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: 'native-wasm-gpu-marker-text-only',
    manifestPath: 'asha.game.toml',
    gameId: 'native-wasm-gpu-marker-text-only',
    manifestText: referenceManifestText,
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('reference workspace should load');
  const sessions = buildStudioRuntimeSessionList({ workspace: result.workspace });
  const activeSession = sessions.sessions.find(session => session.sessionId === sessions.activeSessionId);
  assert.ok(activeSession);
  assert.equal(activeSession.backendMode, 'reference');
  assert.equal(activeSession.runtimeMode, 'reference');
  assert.equal(activeSession.backendProofRefs.length, 0);
  assert.equal(activeSession.nonClaims.includes('not_native_runtime_authority'), true);
  assert.equal(activeSession.nonClaims.includes('not_wasm_authority'), true);
  assert.equal(activeSession.nonClaims.includes('not_hardware_gpu_evidence'), true);
});

test('runtime session list reserves fixture and replay sessions honestly before live launch', () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const sessions = buildStudioRuntimeSessionList({ workspace: result.workspace });
  const preview = sessions.sessions.find(session => session.sessionType === 'preview');
  const fixture = sessions.sessions.find(session => session.sessionType === 'fixture_reserved');
  const replay = sessions.sessions.find(session => session.sessionType === 'replay_reserved');

  assert.ok(preview);
  assert.equal(preview.status, 'available');
  assert.equal(preview.attachStatus, 'not_attached');
  assert.equal(preview.runtimeMode, 'native');
  assert.equal(preview.backendMode, 'native');
  assert.equal(preview.backendCompatibilityState, 'pending_attach');
  assert.ok(fixture);
  assert.equal(fixture.status, 'reserved');
  assert.equal(fixture.profileId, 'harness/conformance/fixtures/minimal-world.json');
  assert.equal(fixture.diagnostics.at(0)?.code, 'runtime_session_reserved');
  assert.ok(replay);
  assert.equal(replay.status, 'reserved');
  assert.equal(replay.profileId, 'replays');
  assert.equal(replay.diagnostics.at(0)?.code, 'runtime_session_reserved');
});

test('game workspace live readout fails closed when telemetry is unavailable', async () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const fixture = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, fixture);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');

  const live = await refreshStudioGameWorkspaceLiveReadModel(
    result.workspace,
    attached.attach,
    {
      async exchange(message) {
        if (message.type === 'telemetry.pull') {
          return { type: 'telemetry.snapshot', samples: [] };
        }
        return fixture.exchange(message);
      },
    },
  );

  assert.equal(live.ok, false);
  if (live.ok) throw new Error('missing telemetry should fail');
  assert.equal(live.diagnostics.at(0)?.code, 'live_telemetry_unavailable');
});

test('game workspace command proposal flows through typed attach transport', async () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const transport = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  const command = buildDevtoolsProtocolGoldenFixtures().commandProposal;

  const proposal = await proposeStudioGameWorkspaceCommand(
    result.workspace,
    attached.attach,
    transport,
    { sequenceId: command.sequenceId, batch: command.batch },
  );

  assert.equal(proposal.ok, true);
  if (!proposal.ok) throw new Error('command proposal should succeed');
  assert.equal(proposal.proposal.proposalVersion, 'studio-game-workspace-command.v0');
  assert.equal(proposal.proposal.status, 'accepted');
  assert.equal(proposal.proposal.sequenceId, 'seq-1');
  assert.equal(proposal.proposal.backendMode, null);
  assert.equal(proposal.proposal.result.accepted, 1);
  assert.equal(proposal.proposal.result.rejected, 0);
  assert.equal(proposal.proposal.authorityHashBefore, null);
  assert.equal(proposal.proposal.authorityHashAfter, 'authority:after:accepted');
  assert.equal(proposal.proposal.rejectionReason, null);
  assert.equal(proposal.proposal.workspaceHash, result.workspace.workspaceHash);
  assert.equal(proposal.proposal.attachHash, attached.attach.attachHash);
  assert.match(proposal.proposal.proposalHash, /^studio-game-workspace-command-/);
});

test('game workspace command proposal records runtime rejections without private retry path', async () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const transport = createStudioDevtoolsFixtureEndpoint({ commandProposalSupported: false });
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  const command = buildDevtoolsProtocolGoldenFixtures().commandProposal;

  const proposal = await proposeStudioGameWorkspaceCommand(
    result.workspace,
    attached.attach,
    transport,
    { sequenceId: command.sequenceId, batch: command.batch },
  );

  assert.equal(proposal.ok, true);
  if (!proposal.ok) throw new Error('runtime rejection is still a typed command result');
  assert.equal(proposal.proposal.status, 'rejected');
  assert.equal(proposal.proposal.backendMode, null);
  assert.equal(proposal.proposal.result.accepted, 0);
  assert.equal(proposal.proposal.result.rejected, 1);
  assert.equal(proposal.proposal.rejectionReason, 'runtime_unavailable');
  assert.equal(proposal.proposal.diagnostics.at(0)?.code, 'command_runtime_rejected');
});

test('game workspace command proposal fails closed on missing command result evidence and stale attach state', async () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const command = buildDevtoolsProtocolGoldenFixtures().commandProposal;
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, createStudioDevtoolsFixtureEndpoint());
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  const missingResult = await proposeStudioGameWorkspaceCommand(
    result.workspace,
    attached.attach,
    { exchange: () => ({ type: 'telemetry.snapshot', samples: [] }) },
    { sequenceId: command.sequenceId, batch: command.batch },
  );

  assert.equal(missingResult.ok, false);
  if (missingResult.ok) throw new Error('missing command result evidence should fail');
  assert.equal(missingResult.diagnostics.at(0)?.code, 'command_unexpected_response');

  const staleWorkspace = {
    ...result.workspace,
    workspaceHash: 'studio-game-workspace-stale-command-proof',
  };
  const stale = await proposeStudioGameWorkspaceCommand(
    staleWorkspace,
    attached.attach,
    createStudioDevtoolsFixtureEndpoint(),
    { sequenceId: command.sequenceId, batch: command.batch },
  );

  assert.equal(stale.ok, false);
  if (stale.ok) throw new Error('stale workspace should fail');
  assert.equal(stale.diagnostics.at(0)?.code, 'command_attach_workspace_mismatch');
});

test('command proposal panel exposes known actions and accepted rejected evidence rows', () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const sessions = buildStudioRuntimeSessionList({ workspace: result.workspace });
  const command = buildDevtoolsProtocolGoldenFixtures().commandProposal;
  const accepted = buildStudioGameWorkspaceCommandProposalReadModel({
    workspace: result.workspace,
    attachHash: 'fixture:devtools-attach:asha-demo',
    sequenceId: command.sequenceId,
    batch: command.batch,
    status: 'accepted',
    result: {
      accepted: 1,
      rejected: 0,
      rejections: [],
    },
    authorityHashAfter: 'authority:after:accepted',
  });
  const rejected = buildStudioGameWorkspaceCommandProposalReadModel({
    workspace: result.workspace,
    attachHash: 'fixture:devtools-attach:asha-demo',
    sequenceId: 'seq-2',
    batch: command.batch,
    status: 'rejected',
    result: {
      accepted: 0,
      rejected: 1,
      rejections: [{ reason: 'unknownMaterial', material: 999 }],
    },
    authorityHashAfter: 'authority:after:rejected',
    rejectionReason: 'authority_rejected',
  });

  const panel = buildStudioCommandProposalPanel({
    workspace: result.workspace,
    runtimeSessions: sessions,
    commandProposals: [accepted, rejected],
  });

  assert.equal(panel.panelVersion, 'studio-command-proposal-panel.v0');
  assert.equal(panel.actions.at(0)?.commandMessageType, 'command.propose');
  assert.equal(panel.actions.at(0)?.commandOperation, 'setVoxel');
  assert.equal(panel.actions.at(0)?.available, true);
  assert.deepEqual(panel.proposals.map(proposal => proposal.status), ['accepted', 'rejected']);
  assert.deepEqual(panel.proposals.map(proposal => proposal.backendMode), ['native', 'native']);
  assert.equal(panel.proposals.at(0)?.authorityHashBefore, null);
  assert.equal(panel.proposals.at(1)?.diagnostics.at(0)?.code, 'command_runtime_rejected');
  assert.ok(panel.nonClaims.includes('not_freeform_json_method_call'));
  assert.match(panel.panelHash, /^studio-command-proposal-panel-/);
});

test('game workspace attach evidence artifact correlates attach live and command readouts', async () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-testing workspace should load');
  const transport = createStudioDevtoolsFixtureEndpoint();
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  const live = await refreshStudioGameWorkspaceLiveReadModel(result.workspace, attached.attach, transport);
  assert.equal(live.ok, true);
  if (!live.ok) throw new Error('live readout should refresh');
  const command = buildDevtoolsProtocolGoldenFixtures().commandProposal;
  const proposal = await proposeStudioGameWorkspaceCommand(
    result.workspace,
    attached.attach,
    transport,
    { sequenceId: command.sequenceId, batch: command.batch },
  );
  assert.equal(proposal.ok, true);
  if (!proposal.ok) throw new Error('command proposal should succeed');

  const artifact = exportStudioGameWorkspaceAttachEvidence({
    workspace: result.workspace,
    attach: attached.attach,
    live: live.live,
    commandProposals: [proposal.proposal],
  });

  assert.equal(artifact.artifactKind, 'studio_game_workspace_attach_evidence');
  assert.equal(artifact.artifactVersion, 'studio-game-workspace-attach-evidence.v0');
  assert.equal(artifact.workspace.gameId, loadDemoPackageName());
  assert.equal(artifact.generatedFrom.workspaceHash, result.workspace.workspaceHash);
  assert.equal(artifact.generatedFrom.attachHash, attached.attach.attachHash);
  assert.equal(artifact.generatedFrom.liveHash, live.live.liveHash);
  assert.deepEqual(artifact.generatedFrom.commandProposalHashes, [proposal.proposal.proposalHash]);
  assert.equal(artifact.attach.runtime.gameId, loadDemoPackageName());
  assert.equal(artifact.live?.projection.runtimeSessionSummaryHash, 'runtime-session:demo:1');
  assert.equal(artifact.commandProposals.at(0)?.status, 'accepted');
  assert.deepEqual(artifact.nonClaims, [
    'not_native_runtime_authority',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
    'not_publish_artifact',
  ]);
  assert.match(artifact.artifactId, /^studio-game-workspace-attach:studio-game-workspace-attach-evidence-/);
  assert.match(artifact.artifactHash, /^studio-game-workspace-attach-evidence-/);
});

test('game workspace loader fails closed for invalid manifests and missing commands', () => {
  const manifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')
    .replace('engine_version = "0.1.0"', 'engine_version = "latest"');

  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText,
    packageScripts: {},
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, false);
  if (result.ok) throw new Error('invalid workspace should fail');
  assert.equal(result.diagnostics.some(diagnostic => diagnostic.code === 'manifest_invalid'), true);
});

test('hierarchy expansion can be updated without changing scene state', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const collapsed = setHierarchyExpansionReadModel(readModel, false);

  assert.equal(collapsed.scene.sceneHash, readModel.scene.sceneHash);
  assert.equal(collapsed.timelineSequence, readModel.timelineSequence);
  assert.equal(collapsed.entities.every(entity => !entity.expanded), true);
});

test('scene hierarchy projects canonical scene objects distinct from renderables', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const selectedEntity = readModel.entities.find(entity => entity.id === readModel.selectedEntityId);

  assert.equal(readModel.flatSceneDocument.nodes.at(0)?.label, 'Scene Root');
  assert.equal(readModel.sceneObjectSnapshot.snapshotVersion, 'scene-object-snapshot.v0');
  assert.equal(readModel.sceneObjectSnapshot.objects.length, readModel.scene.renderables.length + 1);
  assert.equal(selectedEntity?.id.startsWith('scene-node:'), true);
  assert.equal(selectedEntity?.renderableId, 'scene-node-renderable:2');
  assert.equal(
    readModel.sceneObjectSnapshot.objects.some(
      object => object.objectId === selectedEntity?.sceneObjectId,
    ),
    true,
  );
  assert.ok(readModel.sceneObjectSnapshot.nonClaims.includes('not_authority_validation'));
});

test('scene authoring operation model hashes typed create update and delete requests', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const baseHash = studioSceneAuthoringBaseHash(readModel.flatSceneDocument);
  const firstObjectId = readModel.sceneObjectSnapshot.objects[0]?.objectId ?? 'scene-node:1';
  const create = buildStudioSceneAuthoringOperation(readModel.flatSceneDocument, {
    actor: 'agent',
    expectedBaseHash: baseHash,
    operation: {
      kind: 'create_scene_object',
      record: {
        id: 9001,
        parent: null,
        childOrder: 10,
        label: 'Authored object',
        tags: ['proof'],
        transform: {
          translation: [0, 1, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
        kind: { kind: 'emptyGroup' },
      },
    },
  });
  const update = buildStudioSceneAuthoringOperation(readModel.flatSceneDocument, {
    actor: 'gui',
    expectedBaseHash: baseHash,
    operation: {
      kind: 'update_scene_object',
      objectId: firstObjectId,
      patch: { label: 'Updated label' },
    },
  });
  const remove = buildStudioSceneAuthoringOperation(readModel.flatSceneDocument, {
    actor: 'agent',
    expectedBaseHash: baseHash,
    operation: {
      kind: 'delete_scene_object',
      objectId: firstObjectId,
    },
  });

  assert.equal(create.ok, true);
  assert.equal(update.ok, true);
  assert.equal(remove.ok, true);
  assert.match(create.operation.operationHash, /^studio-scene-authoring-operation-/);
  assert.notEqual(create.operation.operationHash, update.operation.operationHash);
  assert.notEqual(update.operation.operationHash, remove.operation.operationHash);
  assert.deepEqual(create.operation.nonClaims, [
    'not_runtime_authority',
    'not_private_ui_mutation',
    'not_source_write_until_save_operation',
  ]);
});

test('scene authoring operation model fails closed on stale invalid operations', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const duplicate = readModel.flatSceneDocument.nodes[0];
  assert.ok(duplicate);
  const stale = buildStudioSceneAuthoringOperation(readModel.flatSceneDocument, {
    actor: 'agent',
    expectedBaseHash: 'studio-scene-authoring-base-stale',
    operation: {
      kind: 'update_scene_object',
      objectId: 'scene-node:999999',
      patch: { label: 'Missing target' },
    },
  });
  const invalidCreate = buildStudioSceneAuthoringOperation(readModel.flatSceneDocument, {
    actor: 'gui',
    expectedBaseHash: studioSceneAuthoringBaseHash(readModel.flatSceneDocument),
    operation: {
      kind: 'create_scene_object',
      record: {
        ...duplicate,
        label: '   ',
        transform: {
          ...duplicate.transform,
          scale: [1, 0, 1],
        },
      },
    },
  });

  assert.equal(stale.ok, false);
  assert.ok(stale.diagnostics.some(diagnostic => diagnostic.code === 'stale_scene_source_hash'));
  assert.ok(stale.diagnostics.some(diagnostic => diagnostic.code === 'missing_scene_object'));
  assert.equal(invalidCreate.ok, false);
  assert.ok(invalidCreate.diagnostics.some(diagnostic => diagnostic.code === 'duplicate_scene_object'));
  assert.ok(invalidCreate.diagnostics.some(diagnostic => diagnostic.code === 'blank_scene_object_label'));
  assert.ok(invalidCreate.diagnostics.some(diagnostic => diagnostic.code === 'invalid_scene_object_transform'));
});

test('scene object create authoring workflow projects saved object into hierarchy and inspector readout', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const record = {
    id: 9101,
    parent: 1,
    childOrder: 20,
    label: 'Created authoring object',
    tags: ['authoring-proof'],
    transform: {
      translation: [2, 0, 0] as const,
      rotation: [0, 0, 0, 1] as const,
      scale: [1, 1, 1] as const,
    },
    kind: { kind: 'emptyGroup' as const },
  };
  const operation = buildStudioSceneAuthoringOperation(readModel.flatSceneDocument, {
    actor: 'agent',
    expectedBaseHash: studioSceneAuthoringBaseHash(readModel.flatSceneDocument),
    operation: {
      kind: 'create_scene_object',
      record,
    },
  });
  assert.equal(operation.ok, true);
  if (!operation.ok) throw new Error('create operation should validate');

  const request = createCreateSceneObjectRequest(readModel, record);
  const applied = applySceneObjectCommandReadModel(readModel, request);

  assert.equal(applied.ok, true);
  assert.equal(applied.result.accepted, true);
  assert.equal(applied.workspace.flatSceneDocument.nodes.some(node => node.id === 9101), true);
  assert.equal(
    applied.workspace.sceneObjectSnapshot.objects.find(object => object.objectId === 'scene-node:9101')?.displayName,
    'Created authoring object',
  );
  assert.equal(applied.workspace.selectedEntityId, 'scene-node:9101');
  assert.equal(applied.workspace.timeline.at(-1)?.commandId, 'scene.apply_object_command');
  assert.match(operation.operation.operationHash, /^studio-scene-authoring-operation-/);
});

test('scene object create authoring workflow rejects duplicate and stale creation', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const duplicate = readModel.flatSceneDocument.nodes[0];
  assert.ok(duplicate);

  const staleRequest = {
    ...createCreateSceneObjectRequest(readModel, {
      ...duplicate,
      id: 9301,
      label: 'Stale create',
    }),
    expectedDocumentHash: -1,
  };
  const stale = applySceneObjectCommandReadModel(readModel, staleRequest);
  const duplicateResult = applySceneObjectCommandReadModel(
    readModel,
    createCreateSceneObjectRequest(readModel, duplicate),
  );

  assert.equal(stale.ok, false);
  assert.equal(stale.result.rejection?.code, 'stale-scene-object-snapshot');
  assert.equal(duplicateResult.ok, false);
  assert.equal(duplicateResult.result.rejection?.code, 'duplicate-scene-object');
});

evidenceProcessTest('scene object create authoring proof command records operation and readout hashes', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'scene-object-create-authoring'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/scene-object-create-authoring-proof\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/scene-object-create-authoring-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_scene_object_create_authoring_proof');
  assert.equal(artifact.operation.operationKind, 'create_scene_object');
  assert.match(artifact.operation.operationHash, /^studio-scene-authoring-operation-/);
  assert.match(artifact.fileHashes.beforeDocumentHash, /^sha256:/);
  assert.match(artifact.fileHashes.afterDocumentHash, /^sha256:/);
  assert.equal(artifact.readout.selectedEntityId, 'scene-node:9201');
  assert.match(artifact.readout.readoutHash, /^sha256:/);
  assert.ok(artifact.validations.includes('negative_duplicate_create_failed_closed'));
  assert.ok(artifact.validations.includes('negative_stale_create_failed_closed'));
});

test('scene object edit authoring workflow rejects unsupported fields', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const targetId = readModel.selectedEntityId;
  assert.ok(targetId?.startsWith('scene-node:'));
  const result = buildStudioSceneAuthoringOperation(readModel.flatSceneDocument, {
    actor: 'agent',
    expectedBaseHash: studioSceneAuthoringBaseHash(readModel.flatSceneDocument),
    operation: {
      kind: 'update_scene_object',
      objectId: targetId,
      patch: {
        materialId: 'material.demo-copper',
      },
    },
  } as Parameters<typeof buildStudioSceneAuthoringOperation>[1]);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(diagnostic => diagnostic.code === 'unsupported_scene_authoring_field'));
});

evidenceProcessTest('scene object edit authoring proof command records edit hashes and diagnostics', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'scene-object-edit-authoring'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/scene-object-edit-authoring-proof\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/scene-object-edit-authoring-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_scene_object_edit_authoring_proof');
  assert.deepEqual(artifact.operations.map((operation: { operationKind: string }) => operation.operationKind), [
    'update_scene_object',
    'update_scene_object',
  ]);
  assert.ok(artifact.operations.every((operation: { operationHash: string }) =>
    operation.operationHash.startsWith('studio-scene-authoring-operation-'),
  ));
  assert.match(artifact.fileHashes.beforeDocumentHash, /^sha256:/);
  assert.equal(artifact.fileHashes.afterDocumentHash, artifact.fileHashes.reopenedDocumentHash);
  assert.equal(artifact.readout.hierarchyName, 'Edited authoring object');
  assert.ok(artifact.validations.includes('negative_stale_edit_failed_closed'));
  assert.ok(artifact.validations.includes('negative_unsupported_field_failed_closed'));
});

test('scene hierarchy root selection clears viewport renderable without private UI mutation', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const root = readModel.entities.find(entity => entity.sceneObjectId === 'scene-node:1');

  assert.ok(root);
  const updated = applySelectedEntityReadModel(readModel, root.id);

  assert.equal(updated.selectedEntityId, 'scene-node:1');
  assert.equal(updated.scene.selectedRenderableId, null);
  assert.equal(updated.timeline.at(-1)?.commandId, 'selection.set_active_entity');
});

test('scene object rename flows through public apply command and updates canonical hierarchy', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const selectedObjectId = readModel.selectedEntityId;

  assert.ok(selectedObjectId?.startsWith('scene-node:'));
  const request = createRenameSceneObjectRequest(readModel, selectedObjectId, 'Renamed voxel');
  const dispatchResult = mapStudioIntentToCommand(createSceneObjectCommandIntent(readModel, request));

  assert.equal(dispatchResult.accepted, true);
  assert.equal(dispatchResult.proposal?.commandId, 'scene.apply_object_command');
  const applied = applySceneObjectCommandReadModel(readModel, dispatchResult.proposal?.request ?? request);

  assert.equal(applied.ok, true);
  assert.equal(applied.result.accepted, true);
  assert.equal(applied.workspace.timeline.at(-1)?.commandId, 'scene.apply_object_command');
  assert.equal(applied.workspace.commandResults.at(-1)?.changedScene, true);
  assert.equal(
    applied.workspace.sceneObjectSnapshot.objects.find(object => object.objectId === selectedObjectId)?.displayName,
    'Renamed voxel',
  );
  assert.equal(
    applied.workspace.flatSceneDocument.nodes.find(node => `scene-node:${node.id as number}` === selectedObjectId)?.label,
    'Renamed voxel',
  );
});

test('scene object command rejects stale expected document hashes without private mutation', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const selectedObjectId = readModel.selectedEntityId;

  assert.ok(selectedObjectId?.startsWith('scene-node:'));
  const request = {
    ...createReparentSceneObjectRequest(readModel, selectedObjectId, null, 0),
    expectedDocumentHash: -1,
  };
  const rejected = applySceneObjectCommandReadModel(readModel, request);

  assert.equal(rejected.ok, false);
  assert.equal(rejected.result.rejection?.code, 'stale-scene-object-snapshot');
  assert.equal(rejected.workspace.flatSceneDocument, readModel.flatSceneDocument);
  assert.equal(rejected.workspace.timeline.at(-1)?.commandId, 'scene.apply_object_command');
  assert.equal(rejected.workspace.commandResults.at(-1)?.status, 'rejected');
});

test('scene object translate and rotate flow through public apply command readout', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const selectedObjectId = readModel.selectedEntityId;

  assert.ok(selectedObjectId?.startsWith('scene-node:'));
  const selectedNode = readModel.flatSceneDocument.nodes.find(
    node => `scene-node:${node.id as number}` === selectedObjectId,
  );
  const selectedRenderable = readModel.scene.renderables.find(
    renderable => renderable.renderableId === readModel.scene.selectedRenderableId,
  );
  assert.ok(selectedNode);
  assert.ok(selectedRenderable);

  const translateRequest = createTranslateSceneObjectRequest(readModel, selectedObjectId, [0.5, -0.25, 0]);
  const translateDispatch = mapStudioIntentToCommand(createSceneObjectCommandIntent(readModel, translateRequest));
  assert.equal(translateDispatch.proposal?.commandId, 'scene.apply_object_command');
  const translated = applySceneObjectCommandReadModel(
    readModel,
    translateDispatch.proposal?.request ?? translateRequest,
  );

  assert.equal(translated.ok, true);
  assert.equal(translated.workspace.timeline.at(-1)?.commandId, 'scene.apply_object_command');
  assert.equal(translated.workspace.commandResults.at(-1)?.changedScene, true);
  const translatedNode = translated.workspace.flatSceneDocument.nodes.find(
    node => `scene-node:${node.id as number}` === selectedObjectId,
  );
  const translatedObject = translated.workspace.sceneObjectSnapshot.objects.find(
    object => object.objectId === selectedObjectId,
  );
  assert.deepEqual(translatedNode?.transform.translation, [
    selectedNode.transform.translation[0] + 0.5,
    selectedNode.transform.translation[1] - 0.25,
    selectedNode.transform.translation[2],
  ]);
  assert.deepEqual(translatedObject?.transform.translation, translatedNode?.transform.translation);
  assert.notEqual(translated.workspace.scene.sceneHash, readModel.scene.sceneHash);

  const rotateRequest = createRotateSceneObjectRequest(
    translated.workspace,
    selectedObjectId,
    [0, 0.38268343, 0, 0.9238795],
  );
  const rotated = applySceneObjectCommandReadModel(translated.workspace, rotateRequest);
  const rotatedNode = rotated.workspace.flatSceneDocument.nodes.find(
    node => `scene-node:${node.id as number}` === selectedObjectId,
  );

  assert.equal(rotated.ok, true);
  assert.ok(rotatedNode);
  assert.ok(Math.abs(rotatedNode.transform.rotation[1] - 0.38268343) < 0.000001);
  assert.ok(Math.abs(rotatedNode.transform.rotation[3] - 0.9238795) < 0.000001);
  assert.equal(rotated.workspace.timeline.at(-1)?.commandId, 'scene.apply_object_command');
});

test('scene object transform command rejects readonly root transforms', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const rootObjectId = 'scene-node:1';
  const request = createTranslateSceneObjectRequest(readModel, rootObjectId, [1, 0, 0]);
  const rejected = applySceneObjectCommandReadModel(readModel, request);

  assert.equal(rejected.ok, false);
  assert.equal(rejected.result.rejection?.code, 'readonly-scene-object-transform');
  assert.equal(rejected.workspace.scene.sceneHash, readModel.scene.sceneHash);
  assert.equal(
    rejected.workspace.sceneObjectSnapshot.objects.find(object => object.objectId === rootObjectId)?.editability.transform,
    false,
  );
});

test('asset browser categories filter scene renderables deterministically', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const categories = buildAssetBrowserCategories(readModel.scene.renderables);

  assert.equal(categories.find(category => category.category === 'all')?.count, 4);
  assert.equal(categories.find(category => category.category === 'static_meshes')?.count, 1);
  assert.equal(categories.find(category => category.category === 'materials')?.count, 0);
  assert.equal(categories.find(category => category.category === 'generated')?.count, 1);
  assert.deepEqual(
    filterAssetBrowserRenderables(readModel.scene.renderables, 'preview').map(
      renderable => renderable.renderableId,
    ),
    ['scene-node-renderable:4', 'scene-node-renderable:5'],
  );
});

test('catalog authoring operation model hashes create update and remove requests', () => {
  const catalog = sampleCatalog();
  const baseHash = studioCatalogAuthoringBaseHash(catalog);
  const create = buildStudioCatalogAuthoringOperation(catalog, {
    actor: 'agent',
    expectedBaseHash: baseHash,
    operation: {
      kind: 'create_catalog_entry',
      entry: {
        id: 'material.authored',
        kind: 'material',
        source: 'assets/materials/authored.material.json',
        importProfile: 'inline-material.v0',
        importMetadata: {
          sourceHash: 'sha256:authored',
          cacheKey: 'dev-cache/material/material.authored',
          generatedArtifactVersion: 'asset-import.v1',
        },
        dependencies: ['texture.demo-checker'],
        publish: {
          include: false,
          outputKey: 'materials/authored.material.json',
        },
        diagnostics: {
          owner: 'asha-studio',
          notes: ['typed authoring test'],
        },
      },
    },
  });
  const update = buildStudioCatalogAuthoringOperation(catalog, {
    actor: 'gui',
    expectedBaseHash: baseHash,
    operation: {
      kind: 'update_catalog_entry',
      assetId: 'material.demo-copper',
      patch: {
        dependencies: ['texture.demo-checker'],
        diagnostics: {
          owner: 'asha-demo',
          notes: ['updated from Studio'],
        },
      },
    },
  });
  const remove = buildStudioCatalogAuthoringOperation(catalog, {
    actor: 'agent',
    expectedBaseHash: baseHash,
    operation: {
      kind: 'remove_catalog_entry',
      assetId: 'material.demo-copper',
    },
  });

  assert.equal(create.ok, true);
  assert.equal(update.ok, true);
  assert.equal(remove.ok, true);
  assert.match(create.operation.operationHash, /^studio-catalog-authoring-operation-/);
  assert.notEqual(create.operation.operationHash, update.operation.operationHash);
  assert.notEqual(update.operation.operationHash, remove.operation.operationHash);
  assert.deepEqual(create.operation.nonClaims, [
    'not_private_asset_database',
    'not_source_write_until_save_operation',
    'not_runtime_authority',
  ]);
});

test('catalog authoring operation model fails closed on invalid refs and hatches', () => {
  const catalog = sampleCatalog();
  const baseHash = studioCatalogAuthoringBaseHash(catalog);
  const duplicate = buildStudioCatalogAuthoringOperation(catalog, {
    actor: 'agent',
    expectedBaseHash: baseHash,
    operation: {
      kind: 'create_catalog_entry',
      entry: catalog.entries[0],
    },
  });
  const unsupportedKind = buildStudioCatalogAuthoringOperation(catalog, {
    actor: 'agent',
    expectedBaseHash: baseHash,
    operation: {
      kind: 'create_catalog_entry',
      entry: {
        ...catalog.entries[0],
        id: 'scene.unsupported',
        kind: 'scene',
        source: 'scenes/minimal.scene.json',
        importProfile: 'flat-scene.v0',
        publish: {
          include: false,
          outputKey: 'scenes/minimal.scene.json',
        },
      },
    },
  });
  const missingDependency = buildStudioCatalogAuthoringOperation(catalog, {
    actor: 'gui',
    expectedBaseHash: baseHash,
    operation: {
      kind: 'update_catalog_entry',
      assetId: 'material.demo-copper',
      patch: {
        dependencies: ['missing.asset'],
        freeformJson: true,
      },
    },
  } as Parameters<typeof buildStudioCatalogAuthoringOperation>[1]);
  const stale = buildStudioCatalogAuthoringOperation(catalog, {
    actor: 'agent',
    expectedBaseHash: 'studio-catalog-authoring-base-stale',
    operation: {
      kind: 'remove_catalog_entry',
      assetId: 'material.demo-copper',
    },
  });

  assert.equal(duplicate.ok, false);
  assert.ok(duplicate.diagnostics.some(diagnostic => diagnostic.code === 'duplicate_catalog_asset_id'));
  assert.equal(unsupportedKind.ok, false);
  assert.ok(unsupportedKind.diagnostics.some(diagnostic => diagnostic.code === 'unsupported_catalog_asset_kind'));
  assert.ok(unsupportedKind.diagnostics.some(diagnostic => diagnostic.code === 'invalid_catalog_asset_source'));
  assert.equal(missingDependency.ok, false);
  assert.ok(missingDependency.diagnostics.some(diagnostic => diagnostic.code === 'missing_catalog_dependency'));
  assert.ok(missingDependency.diagnostics.some(diagnostic => diagnostic.code === 'unsupported_catalog_authoring_field'));
  assert.equal(stale.ok, false);
  assert.ok(stale.diagnostics.some(diagnostic => diagnostic.code === 'stale_catalog_source_hash'));
});

test('catalog entry authoring workflow projects saved entry into asset inventory readout', () => {
  const catalog = sampleCatalog();
  const applied = applyStudioCatalogAuthoringOperation(catalog, {
    actor: 'agent',
    expectedBaseHash: studioCatalogAuthoringBaseHash(catalog),
    operation: {
      kind: 'create_catalog_entry',
      entry: {
        id: 'material.authored',
        kind: 'material',
        source: 'assets/materials/authored.material.json',
        importProfile: 'inline-material.v0',
        importMetadata: {
          sourceHash: 'sha256:authored',
          cacheKey: 'dev-cache/material/material.authored',
          generatedArtifactVersion: 'asset-import.v1',
        },
        dependencies: ['texture.demo-checker'],
        publish: {
          include: false,
          outputKey: 'materials/authored.material.json',
        },
        diagnostics: {
          owner: 'asha-studio',
          notes: ['typed authoring test'],
        },
      },
    },
  });
  assert.equal(applied.ok, true);
  assert.match(applied.catalogHash, /^studio-catalog-authoring-base-/);

  const inventory = loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: { path: 'asha.game.toml', hash: 'sha256:manifest' },
    catalog: { path: 'packages/game-catalogs/catalog.json', hash: applied.catalogHash },
    diagnostics: [],
    dependencyOrder: applied.catalog.entries.map(entry => entry.id),
    entries: applied.catalog.entries.map(entry => ({
      assetId: entry.id,
      kind: entry.kind,
      sourcePath: entry.source,
      dependencies: entry.dependencies ?? [],
      devResolution: {
        sourceHash: entry.importMetadata?.sourceHash ?? null,
        devCacheKey: entry.importMetadata?.cacheKey ?? `dev-cache/${entry.kind}/${entry.id}`,
        generatedArtifactVersion: entry.importMetadata?.generatedArtifactVersion ?? null,
        importStatus: 'clean',
        publishOutputKey: entry.publish.outputKey,
      },
      publishResolution: {
        outputKey: entry.publish.outputKey,
        packedPath: `harness/out/publish/resources/${entry.publish.outputKey}`,
        packedHash: `sha256:${entry.id}`,
        packedBytes: 1,
      },
      diagnostics: [],
      evidenceRefs: [],
    })),
  });
  assert.equal(inventory.ok, true);
  if (!inventory.ok) throw new Error('inventory should load');
  const authored = inventory.inventory.entries.find(entry => entry.assetId === 'material.authored');
  assert.equal(authored?.sourcePath, 'assets/materials/authored.material.json');
  assert.equal(authored?.dependencyStatus, 'resolved');
});

test('catalog workflow read model exposes bounded human commands and preview non-claims', () => {
  const catalog = sampleCatalog();
  const workspace = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: path => existsSync(join(demoRoot, path)),
  });
  assert.equal(workspace.ok, true);
  if (!workspace.ok) throw new Error('workspace fixture failed');

  const workflow = buildStudioCatalogWorkflowReadModel({
    workspace: workspace.workspace,
    catalogPath: 'packages/game-catalogs/catalog.json',
    catalog,
    catalogHash: studioCatalogAuthoringBaseHash(catalog),
    selectedAssetId: 'material.demo-copper',
    sourceEvidence: [
      { path: 'assets/textures/demo-checker.texture.json', exists: true, hash: 'sha256:texture' },
      { path: 'assets/materials/demo-copper.material.json', exists: true, hash: 'sha256:material' },
      { path: 'assets/meshes/demo-cube.mesh.json', exists: true, hash: 'sha256:mesh' },
    ],
    referencedRenderableIds: { 'material.demo-copper': ['model-preview-crate'] },
  });

  assert.equal(workflow.commandIds.create, 'catalog.create_source');
  assert.equal(workflow.commandIds.linkAsset, 'catalog.link_asset');
  assert.equal(workflow.selectedAsset?.assetId, 'material.demo-copper');
  assert.ok(workflow.selectedAsset?.referencedRenderableIds.includes('model-preview-crate'));
  assert.ok(workflow.previewStrategy.now.includes('source_hash'));
  assert.ok(workflow.previewStrategy.deferred.includes('mesh_preview'));
  assert.ok(workflow.nonClaims.includes('not_mesh_material_texture_preview'));

  const missingSource = buildStudioCatalogWorkflowReadModel({
    workspace: workspace.workspace,
    catalogPath: 'packages/game-catalogs/catalog.json',
    catalog,
    catalogHash: studioCatalogAuthoringBaseHash(catalog),
    sourceEvidence: [
      { path: 'assets/textures/demo-checker.texture.json', exists: false, hash: null },
    ],
  });
  assert.ok(missingSource.diagnostics.some(diagnostic => diagnostic.code === 'catalog_workflow_source_missing'));

  const privatePath = buildStudioCatalogWorkflowReadModel({
    workspace: workspace.workspace,
    catalogPath: '../outside/catalog.json',
    catalog,
    catalogHash: studioCatalogAuthoringBaseHash(catalog),
  });
  assert.ok(privatePath.diagnostics.some(diagnostic => diagnostic.code === 'catalog_workflow_path_not_allowed'));
});

test('authored state panel reflection proves saved scene and catalog readouts are visible', () => {
  const workspace = buildAuthoredWorkspaceReadModel();
  const selectedObjectId = workspace.selectedEntityId;
  assert.ok(selectedObjectId?.startsWith('scene-node:'));
  const renamed = applySceneObjectCommandReadModel(
    workspace,
    createRenameSceneObjectRequest(workspace, selectedObjectId, 'Panel reflected object'),
  );
  assert.equal(renamed.ok, true);
  const catalog = sampleCatalog();
  const applied = applyStudioCatalogAuthoringOperation(catalog, {
    actor: 'agent',
    expectedBaseHash: studioCatalogAuthoringBaseHash(catalog),
    operation: {
      kind: 'create_catalog_entry',
      entry: {
        id: 'material.panel-reflection',
        kind: 'material',
        source: 'assets/materials/panel-reflection.material.json',
        importProfile: 'inline-material.v0',
        importMetadata: {
          sourceHash: 'sha256:panel-reflection',
          cacheKey: 'dev-cache/material/material.panel-reflection',
          generatedArtifactVersion: 'asset-import.v1',
        },
        dependencies: ['texture.demo-checker'],
        publish: {
          include: false,
          outputKey: 'materials/panel-reflection.material.json',
        },
      },
    },
  });
  assert.equal(applied.ok, true);
  const inventory = loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: { path: 'asha.game.toml', hash: 'sha256:manifest' },
    catalog: { path: 'packages/game-catalogs/catalog.json', hash: applied.catalogHash },
    diagnostics: [],
    dependencyOrder: applied.catalog.entries.map(entry => entry.id),
    entries: applied.catalog.entries.map(entry => ({
      assetId: entry.id,
      kind: entry.kind,
      sourcePath: entry.source,
      dependencies: entry.dependencies ?? [],
      devResolution: {
        sourceHash: entry.importMetadata?.sourceHash ?? null,
        devCacheKey: entry.importMetadata?.cacheKey ?? `dev-cache/${entry.kind}/${entry.id}`,
        generatedArtifactVersion: entry.importMetadata?.generatedArtifactVersion ?? null,
        importStatus: 'clean',
        publishOutputKey: entry.publish.outputKey,
      },
      publishResolution: {
        outputKey: entry.publish.outputKey,
        packedPath: `harness/out/publish/resources/${entry.publish.outputKey}`,
        packedHash: `sha256:${entry.id}`,
        packedBytes: 1,
      },
      diagnostics: [],
      evidenceRefs: [],
    })),
  });
  assert.equal(inventory.ok, true);
  if (!inventory.ok) throw new Error('inventory should load');

  const reflection = buildStudioAuthoredStatePanelReflection({
    workspace: renamed.workspace,
    assetInventory: inventory.inventory,
    authoredSceneObjectId: selectedObjectId,
    authoredSceneObjectLabel: 'Panel reflected object',
    authoredCatalogAssetId: 'material.panel-reflection',
    visiblePanelMarkers: [
      'studio-hierarchy-panel',
      'studio-viewport-top-panel',
      'studio-inspector-panel',
      'studio-assets-panel',
    ],
  });
  assert.equal(reflection.ok, true);
  assert.equal(reflection.reflection.hierarchyPanel.displayName, 'Panel reflected object');
  assert.equal(reflection.reflection.inspectorPanel.selectedObjectName, 'Panel reflected object');
  assert.equal(reflection.reflection.assetsPanel.assetId, 'material.panel-reflection');
  assert.match(reflection.reflection.reflectionHash, /^studio-authored-state-panel-reflection-/);

  const stale = buildStudioAuthoredStatePanelReflection({
    workspace: renamed.workspace,
    assetInventory: inventory.inventory,
    authoredSceneObjectId: selectedObjectId,
    authoredSceneObjectLabel: 'Missing label',
    authoredCatalogAssetId: 'material.panel-reflection',
    visiblePanelMarkers: ['studio-hierarchy-panel', 'studio-viewport-top-panel', 'studio-assets-panel'],
  });
  assert.equal(stale.ok, false);
  assert.ok(stale.diagnostics.some(diagnostic => diagnostic.code === 'authored_scene_object_missing_from_hierarchy'));
  assert.ok(stale.diagnostics.some(diagnostic => diagnostic.code === 'authored_panel_marker_missing'));
});

evidenceProcessTest('catalog entry authoring UI proof command records persisted readout and negatives', () => {
  const beforeCatalog = readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8');
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'catalog-entry-authoring-ui'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/catalog-entry-authoring-ui-proof\/latest\/index\.json/);
  assert.equal(readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8'), beforeCatalog);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/catalog-entry-authoring-ui-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_catalog_entry_authoring_ui_proof');
  assert.equal(artifact.operation.operationKind, 'create_catalog_entry');
  assert.match(artifact.operation.operationHash, /^studio-catalog-authoring-operation-/);
  assert.equal(artifact.readout.authoredAssetId, 'material.studio-authored-ui');
  assert.equal(artifact.readout.dependencyStatus, 'resolved');
  assert.match(artifact.readout.inventoryHash, /^studio-asset-inventory-/);
  assert.ok(artifact.validations.includes('negative_stale_catalog_edit_failed_closed'));
  assert.ok(artifact.validations.includes('negative_invalid_source_failed_closed'));
  assert.ok(artifact.validations.includes('negative_invalid_dependency_failed_closed'));
});

evidenceProcessTest('authored state panel reflection proof command records visible saved panel readouts', () => {
  const beforeCatalog = readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8');
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'authored-state-panel-reflection'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/authored-state-panel-reflection-proof\/latest\/index\.json/);
  assert.equal(readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8'), beforeCatalog);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/authored-state-panel-reflection-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_authored_state_panel_reflection_proof');
  assert.equal(artifact.reflection.hierarchyPanel.displayName, 'Panel-reflected authoring object');
  assert.equal(artifact.reflection.inspectorPanel.selectedObjectName, 'Panel-reflected authoring object');
  assert.equal(artifact.reflection.assetsPanel.assetId, 'material.studio-panel-reflection');
  assert.match(artifact.reflection.reflectionHash, /^studio-authored-state-panel-reflection-/);
  assert.ok(artifact.validations.includes('hierarchy_panel_reflects_authored_scene_object'));
  assert.ok(artifact.validations.includes('assets_panel_reflects_authored_catalog_entry'));
  assert.ok(artifact.validations.includes('negative_missing_asset_failed_closed'));
});

evidenceProcessTest('authoring UX M2 aggregate proof gate records child evidence and guards', () => {
  const beforeCatalog = readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8');
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'authoring-ux-m2'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/authoring-ux-m2-proof\/latest\/index\.json/);
  assert.equal(readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8'), beforeCatalog);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/authoring-ux-m2-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_authoring_ux_m2_proof');
  assert.equal(artifact.childArtifacts.length, 4);
  assert.match(artifact.authoringCoverage.sceneCreateOperationHash, /^studio-scene-authoring-operation-/);
  assert.match(artifact.authoringCoverage.catalogCreateOperationHash, /^studio-catalog-authoring-operation-/);
  assert.match(artifact.authoringCoverage.panelReflectionHash, /^studio-authored-state-panel-reflection-/);
  assert.equal(artifact.visibleReadouts.reflectedAssetId, 'material.studio-panel-reflection');
  assert.ok(artifact.validations.includes('studio_domain_typecheck_passed'));
  assert.ok(artifact.validations.includes('boundary_guard_passed'));
});

test('Studio authoring M2 closeout doc points at the aggregate proof gate', () => {
  const doc = readFileSync(join(repoRoot, 'docs/studio-authoring-m2.md'), 'utf8');
  assert.match(doc, /pnpm run evidence -- authoring-ux-m2/);
  assert.match(doc, /artifacts\/authoring-ux-m2-proof\/latest\/index\.json/);
  assert.match(doc, /not claim runtime authority/);
});

evidenceProcessTest('authored round-trip fixture proof writes deterministic scene and catalog fixture', () => {
  const beforeCatalog = readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8');
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'authored-roundtrip-fixture'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/authored-roundtrip-fixture\/latest\/index\.json/);
  assert.match(result.stdout, /fixtures\/round-trip\/studio-authored-content\.fixture\.json/);
  assert.equal(readFileSync(join(demoRoot, 'packages/game-catalogs/catalog.json'), 'utf8'), beforeCatalog);

  const fixture = JSON.parse(readFileSync(
    join(repoRoot, 'fixtures/round-trip/studio-authored-content.fixture.json'),
    'utf8',
  ));
  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/authored-roundtrip-fixture/latest/index.json'),
    'utf8',
  ));
  assert.equal(fixture.fixtureKind, 'studio_authored_roundtrip_fixture');
  assert.equal(fixture.authoredScene.objectId, 'scene-node:9401');
  assert.equal(fixture.authoredCatalog.authoredAssetId, 'material.studio-authored-roundtrip');
  assert.equal(fixture.runtimeHints.expectedRenderableLabel, 'Studio Authored Runtime Target');
  assert.equal(artifact.artifactKind, 'studio_authored_roundtrip_fixture_proof');
  assert.equal(artifact.authoredRefs.sceneObjectId, fixture.authoredScene.objectId);
  assert.equal(artifact.authoredRefs.assetId, fixture.authoredCatalog.authoredAssetId);
  assert.ok(artifact.validations.includes('committed_fixture_written_and_reopened'));
  assert.ok(artifact.nonClaims.includes('not_runtime_loaded'));
  assert.equal(artifact.negativeSmokes.at(0)?.ok, false);
  assert.equal(artifact.negativeSmokes.at(1)?.ok, false);
});

evidenceProcessTest('authored browser runtime load proof consumes demo browser readback', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'authored-browser-runtime-load'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 300000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/authored-browser-runtime-load\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/authored-browser-runtime-load/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_authored_browser_runtime_load_proof');
  assert.equal(artifact.authoredRuntimeLoad.objectId, 'scene-node:9401');
  assert.equal(artifact.authoredRuntimeLoad.assetId, 'material.studio-authored-roundtrip');
  assert.equal(artifact.authoredRuntimeLoad.runtimeMode, 'reference');
  assert.match(artifact.authoredRuntimeLoad.resourceManifestHash, /^sha256:/);
  assert.match(artifact.authoredRuntimeLoad.browserPageReadbackHash, /^sha256:/);
  assert.ok(artifact.validations.includes('demo_authored_runtime_load_child_passed'));
  assert.ok(artifact.validations.includes('authored_scene_object_loaded_in_browser_page'));
  assert.equal(artifact.negativeSmokes.at(0)?.ok, false);
  assert.ok(artifact.nonClaims.includes('not_browser_interaction_evidence'));
});

evidenceProcessTest('authored browser interaction proof records DOM input against loaded content', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'authored-browser-interaction'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 360000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/authored-browser-interaction\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/authored-browser-interaction/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_authored_browser_interaction_proof');
  assert.equal(artifact.authoredInteraction.objectId, 'scene-node:9401');
  assert.equal(artifact.authoredInteraction.assetId, 'material.studio-authored-roundtrip');
  assert.equal(artifact.authoredInteraction.inputEventCount, 3);
  assert.equal(artifact.authoredInteraction.typedRequestCount, artifact.authoredInteraction.inputEventCount);
  assert.equal(artifact.authoredInteraction.readbackCount, artifact.authoredInteraction.typedRequestCount);
  assert.equal(artifact.authoredInteraction.finalSelectedObjectId, artifact.authoredInteraction.objectId);
  assert.ok(artifact.validations.includes('dom_input_events_recorded_for_authored_content'));
  assert.ok(artifact.validations.includes('authored_selection_readback_matches_runtime_load'));
  assert.equal(artifact.negativeSmokes.at(0)?.ok, false);
  assert.ok(artifact.nonClaims.includes('not_runtime_mutation_proof'));
});

test('authored browser debug read model projects browser selection into Studio debug readback', () => {
  const fixture = {
    fixtureKind: 'studio_authored_roundtrip_fixture' as const,
    fixtureHash: 'sha256:fixture',
    authoredScene: {
      objectId: 'scene-node:9401',
      record: {
        label: 'Studio Authored Runtime Target',
        transform: {
          translation: [3, 0.5, -1] as const,
          rotation: [0, 0, 0, 1] as const,
          scale: [1, 1, 1] as const,
        },
      },
    },
    authoredCatalog: {
      authoredAssetId: 'material.studio-authored-roundtrip',
      authoredCatalogHash: 'studio-catalog-authoring-catalog-after',
      entry: {
        source: 'assets/materials/demo-copper.material.json',
      },
    },
  };
  const browserInteraction = {
    artifactKind: 'studio_authored_browser_interaction_proof' as const,
    artifactHash: 'sha256:interaction',
    authoredInteraction: {
      objectId: 'scene-node:9401',
      assetId: 'material.studio-authored-roundtrip',
      inputEventCount: 3,
      typedRequestCount: 3,
      readbackCount: 3,
      finalSelectedObjectId: 'scene-node:9401',
      finalSelectedAssetId: 'material.studio-authored-roundtrip',
      interactionHash: 'sha256:browser-input',
      runtimeWorldHash: 'reference-world:asha-demo:9401:accepted:0',
    },
  };

  const debug = buildStudioAuthoredBrowserDebugReadModel({
    fixture,
    browserInteraction,
    studioDebugEvidenceHash: 'sha256:studio-live-debug',
  });

  assert.equal(debug.ok, true);
  assert.equal(debug.debug.debugVersion, 'studio-authored-browser-debug.v0');
  assert.equal(debug.debug.selected.objectId, 'scene-node:9401');
  assert.equal(debug.debug.selected.assetId, 'material.studio-authored-roundtrip');
  assert.equal(debug.debug.browserReadback.inputEventCount, 3);
  assert.equal(debug.debug.studioCorrelation.authoredObjectMatchesBrowserSelection, true);
  assert.equal(debug.debug.studioCorrelation.authoredAssetMatchesBrowserSelection, true);
  assert.match(debug.debug.debugHash, /^studio-authored-browser-debug-/);

  const stale = buildStudioAuthoredBrowserDebugReadModel({
    fixture,
    browserInteraction: {
      ...browserInteraction,
      authoredInteraction: {
        ...browserInteraction.authoredInteraction,
        finalSelectedObjectId: 'scene-node:stale',
      },
    },
    studioDebugEvidenceHash: 'sha256:studio-live-debug',
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.diagnostics.at(0)?.code, 'selected_authored_object_mismatch');

  const missingEvidence = buildStudioAuthoredBrowserDebugReadModel({
    fixture,
    browserInteraction,
  });
  assert.equal(missingEvidence.ok, false);
  assert.equal(missingEvidence.diagnostics.at(0)?.code, 'missing_studio_debug_evidence');
});

evidenceProcessTest('authored Studio debug readback proof inspects browser-mutated authored content', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'authored-studio-debug-readback'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 480000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/authored-studio-debug-readback\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/authored-studio-debug-readback/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_authored_studio_debug_readback_proof');
  assert.equal(artifact.debug.debugVersion, 'studio-authored-browser-debug.v0');
  assert.equal(artifact.debug.selected.objectId, 'scene-node:9401');
  assert.equal(artifact.debug.selected.assetId, 'material.studio-authored-roundtrip');
  assert.equal(artifact.debug.selected.finalSelectedObjectId, 'scene-node:9401');
  assert.equal(artifact.debug.browserReadback.inputEventCount, 3);
  assert.equal(artifact.debug.studioCorrelation.authoredObjectMatchesBrowserSelection, true);
  assert.ok(artifact.validations.includes('browser_selected_authored_object_projected_to_studio_debug'));
  assert.ok(artifact.validations.includes('studio_live_debug_m4_child_passed'));
  assert.equal(artifact.negativeSmokes.at(0)?.diagnostics.at(0)?.code, 'missing_studio_debug_evidence');
  assert.equal(artifact.negativeSmokes.at(1)?.diagnostics.at(0)?.code, 'selected_authored_object_mismatch');
  assert.ok(artifact.nonClaims.includes('not_private_runtime_transport'));
});

evidenceProcessTest('author-to-runtime round-trip evidence index records current child proof chain', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'author-runtime-roundtrip-index'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 600000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/author-runtime-roundtrip-index\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/author-runtime-roundtrip-index/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_author_runtime_roundtrip_evidence_index');
  assert.equal(artifact.authoredRefs.objectId, 'scene-node:9401');
  assert.equal(artifact.authoredRefs.assetId, 'material.studio-authored-roundtrip');
  assert.equal(artifact.sourceArtifacts.length, 5);
  assert.equal(artifact.roundTrip.browserInteraction.inputEventCount, 3);
  assert.equal(artifact.roundTrip.studioDebugReadback.authoredObjectMatchesBrowserSelection, true);
  assert.equal(artifact.correlations.sourceArtifactChainCurrent, true);
  assert.ok(artifact.validations.includes('authored_object_correlated_across_studio_browser_and_debug'));
  assert.ok(artifact.validations.includes('source_artifact_hashes_verified'));
  assert.equal(artifact.negativeSmokes.at(0)?.diagnostic, 'stale_source_artifact_hash');
  assert.equal(artifact.negativeSmokes.at(0)?.ok, false);
  assert.ok(artifact.nonClaims.includes('not_publish_readiness'));
});

evidenceProcessTest('author-to-runtime round-trip M5 aggregate proof gate records milestone coverage', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'author-runtime-roundtrip-m5'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 660000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/author-runtime-roundtrip-m5\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/author-runtime-roundtrip-m5/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_author_runtime_roundtrip_m5');
  assert.equal(artifact.authoredRefs.objectId, 'scene-node:9401');
  assert.equal(artifact.authoredRefs.assetId, 'material.studio-authored-roundtrip');
  assert.equal(artifact.evidenceIndex.kind, 'studio_author_runtime_roundtrip_evidence_index');
  assert.equal(artifact.coverage.sourceArtifactChainCurrent, true);
  assert.equal(artifact.coverage.browserInputCountsCorrelated, true);
  assert.equal(artifact.roundTripReadout.finalSelectedObjectId, 'scene-node:9401');
  assert.ok(artifact.validations.includes('author_runtime_roundtrip_index_child_passed'));
  assert.ok(artifact.validations.includes('authored_object_round_trips_from_studio_to_browser_back_to_studio_debug'));
  assert.equal(artifact.negativeSmokes.at(0)?.diagnostic, 'stale_source_artifact_hash');
  assert.equal(artifact.negativeSmokes.at(0)?.ok, false);
  assert.ok(artifact.nonClaims.includes('not_runtime_authority'));
});

test('Author-to-runtime M5 closeout doc points at aggregate proof gate', () => {
  const doc = readFileSync(join(repoRoot, 'docs/author-runtime-roundtrip-m5.md'), 'utf8');
  assert.match(doc, /Task: `asha#3733`/);
  assert.match(doc, /pnpm run evidence -- author-runtime-roundtrip-m5/);
  assert.match(doc, /artifacts\/author-runtime-roundtrip-m5\/latest\/index\.json/);
  assert.match(doc, /artifacts\/author-runtime-roundtrip-index\/latest\/index\.json/);
  assert.match(doc, /does not claim Studio runtime authority/);
  assert.match(doc, /private runtime mutation/);
});

evidenceProcessTest('proper demo capstone verifier records end-to-end milestone coverage', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'proper-demo-capstone-verifier'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 720000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/proper-demo-capstone-verifier\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/proper-demo-capstone-verifier/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_proper_demo_capstone_verifier');
  assert.deepEqual(artifact.campaign.verifiedMilestones, ['M1', 'M2', 'M3', 'M4', 'M5']);
  assert.equal(artifact.milestoneCoverage.workspacePersistenceM1, true);
  assert.equal(artifact.milestoneCoverage.authoringUxM2, true);
  assert.equal(artifact.milestoneCoverage.browserInteractiveM3, true);
  assert.equal(artifact.milestoneCoverage.liveDebugM4, true);
  assert.equal(artifact.milestoneCoverage.authorRuntimeRoundTripM5, true);
  assert.equal(artifact.milestoneCoverage.v2HandlesPresent, true);
  assert.equal(artifact.milestoneCoverage.privateTransportHintsAbsent, true);
  assert.equal(artifact.capstoneReadout.authoredObjectId, 'scene-node:9401');
  assert.equal(artifact.capstoneReadout.authoredAssetId, 'material.studio-authored-roundtrip');
  assert.ok(artifact.validations.includes('m5_author_runtime_roundtrip_gate_passed'));
  assert.equal(artifact.negativeSmokes.at(1)?.diagnostic, 'browser_event_log_missing_or_marker_only');
  assert.equal(artifact.negativeSmokes.at(1)?.ok, false);
  assert.ok(artifact.nonClaims.includes('not_runtime_den_dependency'));
});

evidenceProcessTest('proper demo evidence index records final capstone source artifact graph', () => {
  const verifier = spawnSync('pnpm', ['run', 'evidence', '--', 'proper-demo-capstone-verifier'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 720000,
  });
  assert.equal(verifier.status, 0, verifier.stdout + verifier.stderr);

  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'proper-demo-evidence-index'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/proper-demo-evidence-index\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/proper-demo-evidence-index/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_proper_demo_evidence_index');
  assert.equal(artifact.coverage.allRequiredKindsIndexed, true);
  assert.equal(artifact.coverage.verifierHashFresh, true);
  assert.equal(artifact.evidenceMap.browserInteractive.kind, 'asha_demo_browser_interactive_proof');
  assert.equal(artifact.evidenceMap.authorRuntimeRoundTrip.kind, 'studio_author_runtime_roundtrip_m5');
  assert.equal(artifact.capstoneReadout.authoredObjectId, 'scene-node:9401');
  assert.ok(artifact.validations.includes('m1_through_m5_evidence_kinds_indexed'));
  assert.equal(artifact.negativeSmokes.at(0)?.diagnostic, 'stale_capstone_verifier_hash');
  assert.equal(artifact.negativeSmokes.at(0)?.ok, false);
  assert.ok(artifact.nonClaims.includes('not_product_readiness'));
});

evidenceProcessTest('proper demo capstone guard enforces final boundary and non-claim checks', () => {
  const index = spawnSync('pnpm', ['run', 'evidence', '--', 'proper-demo-evidence-index'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(index.status, 0, index.stdout + index.stderr);

  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'proper-demo-capstone-guard'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 180000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/proper-demo-capstone-guard\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/proper-demo-capstone-guard/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_proper_demo_capstone_guard');
  assert.equal(artifact.guard.nonClaimsPresent, true);
  assert.equal(artifact.guard.privateTransportHintsAbsent, true);
  assert.equal(artifact.guard.generatedArtifactsNotAuthoredSource, true);
  assert.equal(artifact.guard.studioBoundaryPassed, true);
  assert.equal(artifact.guard.demoBoundaryPassed, true);
  assert.ok(artifact.validations.includes('required_non_claims_present'));
  assert.ok(artifact.validations.includes('private_transport_and_freeform_command_hints_absent'));
  assert.equal(artifact.negativeSmokes.at(0)?.diagnostic, 'missing_required_non_claim');
  assert.equal(artifact.negativeSmokes.at(0)?.ok, false);
  assert.ok(artifact.nonClaims.includes('not_private_transport'));
});

test('proper demo M6 workflow doc points at capstone proof commands', () => {
  const doc = readFileSync(join(repoRoot, 'docs/proper-demo-proof-m6.md'), 'utf8');
  assert.match(doc, /Task: `asha#3734`/);
  assert.match(doc, /pnpm run evidence -- proper-demo-capstone-verifier/);
  assert.match(doc, /pnpm run evidence -- proper-demo-evidence-index/);
  assert.match(doc, /pnpm run evidence -- proper-demo-capstone-guard/);
  assert.match(doc, /artifacts\/proper-demo-capstone-verifier\/latest\/index\.json/);
  assert.match(doc, /artifacts\/proper-demo-evidence-index\/latest\/index\.json/);
  assert.match(doc, /artifacts\/proper-demo-capstone-guard\/latest\/index\.json/);
  assert.match(doc, /must not claim/);
  assert.match(doc, /Generated proof artifacts are evidence, not authored source/);
});

test('game asset inventory read model loads multi-kind asha-demo catalog evidence', () => {
  const inventory = loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: {
      path: 'asha.game.toml',
      hash: 'sha256:manifest',
    },
    catalog: {
      path: 'packages/game-catalogs/catalog.json',
      hash: 'sha256:catalog',
    },
    diagnostics: [],
    dependencyOrder: ['texture.demo-checker', 'material.demo-copper', 'mesh.demo-cube'],
    entries: [
      {
        assetId: 'mesh.demo-cube',
        kind: 'static_mesh',
        sourcePath: 'assets/meshes/demo-cube.mesh.json',
        dependencies: ['material.demo-copper'],
        devResolution: {
          sourceHash: 'sha256:mesh',
          devCacheKey: 'dev-cache/static_mesh/mesh.demo-cube/mesh',
          generatedArtifactVersion: 'asset-import.v1',
          importStatus: 'clean',
          publishOutputKey: 'meshes/demo-cube.mesh.json',
        },
        publishResolution: {
          outputKey: 'meshes/demo-cube.mesh.json',
          packedPath: 'harness/out/publish/resources/meshes/demo-cube.mesh.json',
          packedHash: 'sha256:packed-mesh',
          packedBytes: 702,
        },
        diagnostics: [],
        evidenceRefs: [{ kind: 'source', path: 'assets/meshes/demo-cube.mesh.json', sha256: 'sha256:mesh' }],
      },
      {
        assetId: 'material.demo-copper',
        kind: 'material',
        sourcePath: 'assets/materials/demo-copper.material.json',
        dependencies: ['texture.demo-checker'],
        devResolution: {
          sourceHash: 'sha256:material',
          devCacheKey: 'dev-cache/material/material.demo-copper/material',
          generatedArtifactVersion: 'asset-import.v1',
          importStatus: 'clean',
          publishOutputKey: 'materials/demo-copper.material.json',
        },
        publishResolution: {
          outputKey: 'materials/demo-copper.material.json',
          packedPath: 'harness/out/publish/resources/materials/demo-copper.material.json',
          packedHash: 'sha256:packed-material',
          packedBytes: 214,
        },
        diagnostics: [],
        evidenceRefs: [{ kind: 'source', path: 'assets/materials/demo-copper.material.json', sha256: 'sha256:material' }],
      },
      {
        assetId: 'texture.demo-checker',
        kind: 'texture',
        sourcePath: 'assets/textures/demo-checker.texture.json',
        dependencies: [],
        devResolution: {
          sourceHash: 'sha256:texture',
          devCacheKey: 'dev-cache/texture/texture.demo-checker/texture',
          generatedArtifactVersion: 'asset-import.v1',
          importStatus: 'clean',
          publishOutputKey: 'textures/demo-checker.texture.json',
        },
        publishResolution: {
          outputKey: 'textures/demo-checker.texture.json',
          packedPath: 'harness/out/publish/resources/textures/demo-checker.texture.json',
          packedHash: 'sha256:packed-texture',
          packedBytes: 367,
        },
        diagnostics: [],
        evidenceRefs: [{ kind: 'source', path: 'assets/textures/demo-checker.texture.json', sha256: 'sha256:texture' }],
      },
    ],
  }, {
    referencedRenderableIds: {
      'mesh.demo-cube': ['model-preview-crate'],
    },
  });

  assert.equal(inventory.ok, true);
  if (!inventory.ok) throw new Error('asset inventory should load');
  assert.equal(inventory.inventory.inventoryVersion, 'studio-asset-inventory.v0');
  assert.equal(inventory.inventory.entries.length, 3);
  assert.deepEqual(inventory.inventory.dependencyOrder, [
    'texture.demo-checker',
    'material.demo-copper',
    'mesh.demo-cube',
  ]);
  assert.equal(inventory.inventory.entries.find(asset => asset.assetId === 'mesh.demo-cube')?.dependencyStatus, 'resolved');
  assert.deepEqual(
    inventory.inventory.entries.find(asset => asset.assetId === 'mesh.demo-cube')?.referencedRenderableIds,
    ['model-preview-crate'],
  );
  assert.match(inventory.inventory.inventoryHash, /^studio-asset-inventory-/);
});

test('game asset inventory fails closed for broken assets instead of directory scans', () => {
  const inventory = loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'diagnostics',
    sourceManifest: { path: 'asha.game.toml', hash: 'sha256:manifest' },
    catalog: { path: 'packages/game-catalogs/catalog.json', hash: 'sha256:catalog' },
    diagnostics: [],
    dependencyOrder: ['mesh.broken'],
    entries: [
      {
        assetId: 'mesh.broken',
        kind: 'static_mesh',
        sourcePath: 'assets/meshes/broken.mesh.json',
        dependencies: ['material.missing'],
        devResolution: null,
        publishResolution: null,
        diagnostics: [{ code: 'missing_asset_file', path: 'entries[0]', message: 'asset file missing' }],
        evidenceRefs: [],
      },
    ],
  });

  assert.equal(inventory.ok, false);
  assert.ok(inventory.inventory);
  assert.equal(inventory.inventory.status, 'diagnostics');
  assert.equal(inventory.diagnostics.some(diagnostic => diagnostic.code === 'asset_inventory_missing_resolution'), true);
  assert.equal(inventory.diagnostics.some(diagnostic => diagnostic.code === 'asset_inventory_dependency_mismatch'), true);
  assert.equal(inventory.diagnostics.some(diagnostic => diagnostic.message === 'asset file missing'), true);
});

test('publish evidence read model loads latest asha-demo publish proof status', () => {
  const workspaceResult = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(workspaceResult.ok, true);
  if (!workspaceResult.ok) throw new Error('asha-testing workspace should load');
  const evidencePath = 'harness/out/publish-evidence/latest/index.json';
  const evidence = samplePublishEvidenceArtifact();

  const result = loadStudioPublishEvidence(evidence, {
    workspace: workspaceResult.workspace,
    evidencePath,
  });

  assert.equal(result.ok, true);
  assert.equal(result.publishEvidence.status, 'ready');
  assert.equal(result.publishEvidence.evidenceVersion, 'publish-evidence.v1');
  assert.equal(result.publishEvidence.artifactPath, 'harness/out/publish/latest/index.json');
  assert.equal(result.publishEvidence.dependencyGuard.status, 'no-studio-dev-only-fragments');
  assert.equal(result.publishEvidence.runSmoke.runtimeMode, 'reference');
  assert.equal(result.publishEvidence.runSmoke.acceptedCommandStatus, 'accepted');
  assert.equal(result.publishEvidence.runSmoke.rejectedCommandStatus, 'rejected');
  assert.equal(result.publishEvidence.packedResources.length, 3);
  assert.ok(result.publishEvidence.validations.includes('packaged_command_proof_present'));
  assert.ok(result.publishEvidence.nonClaims.includes('not_store_submission'));
  assert.match(result.publishEvidence.publishEvidenceHash, /^studio-publish-evidence-/);
});

test('publish evidence read model fails closed for stale or missing evidence', () => {
  const workspaceResult = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(workspaceResult.ok, true);
  if (!workspaceResult.ok) throw new Error('asha-testing workspace should load');
  const evidencePath = 'harness/out/publish-evidence/latest/index.json';
  const staleEvidence = samplePublishEvidenceArtifact();
  staleEvidence.publishArtifact.artifactVersion = 'publish-artifact.old';

  const stale = loadStudioPublishEvidence(staleEvidence, {
    workspace: workspaceResult.workspace,
    evidencePath,
  });
  const missing = loadStudioPublishEvidence(null, { evidencePath });

  assert.equal(stale.ok, false);
  assert.equal(stale.publishEvidence.status, 'stale');
  assert.equal(stale.diagnostics.at(0)?.code, 'publish_evidence_stale');
  assert.equal(missing.ok, false);
  assert.equal(missing.publishEvidence.status, 'missing');
  assert.equal(missing.diagnostics.at(0)?.code, 'publish_evidence_missing');
});

test('workspace cockpit evidence export covers panel readouts and fails closed on missing markers', () => {
  const workspaceResult = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(workspaceResult.ok, true);
  if (!workspaceResult.ok) throw new Error('asha-testing workspace should load');
  const inventory = loadStudioAssetInventory(sampleAssetInventoryArtifact());
  assert.equal(inventory.ok, true);
  if (!inventory.ok) throw new Error('inventory should load');
  const runtimeSessions = buildStudioRuntimeSessionList({ workspace: workspaceResult.workspace });
  const command = buildDevtoolsProtocolGoldenFixtures().commandProposal;
  const commandProposal = buildStudioGameWorkspaceCommandProposalReadModel({
    workspace: workspaceResult.workspace,
    attachHash: 'fixture:devtools-attach:asha-demo',
    sequenceId: command.sequenceId,
    batch: command.batch,
    status: 'accepted',
    result: { accepted: 1, rejected: 0, rejections: [] },
    authorityHashAfter: 'authority:after:accepted',
  });
  const commandPanel = buildStudioCommandProposalPanel({
    workspace: workspaceResult.workspace,
    runtimeSessions,
    commandProposals: [commandProposal],
  });
  const publishEvidence = loadStudioPublishEvidence(
    samplePublishEvidenceArtifact(),
    {
      workspace: workspaceResult.workspace,
      evidencePath: 'harness/out/publish-evidence/latest/index.json',
    },
  );
  assert.equal(publishEvidence.ok, true);

  const markers = [
    'studio-game-workspace-overview',
    'studio-assets-panel',
    'studio-runtime-session-panel',
    'studio-command-proposal-panel',
    'studio-publish-evidence-panel',
  ];
  const artifact = exportStudioWorkspaceCockpitEvidence({
    studioWorkspace: buildInitialWorkspaceReadModel(),
    gameWorkspace: workspaceResult.workspace,
    assetInventory: inventory.inventory,
    runtimeSessions,
    commandProposalPanel: commandPanel,
    publishEvidence: publishEvidence.publishEvidence,
    visiblePanelMarkers: markers,
  });
  const missingMarker = exportStudioWorkspaceCockpitEvidence({
    studioWorkspace: buildInitialWorkspaceReadModel(),
    gameWorkspace: workspaceResult.workspace,
    assetInventory: inventory.inventory,
    runtimeSessions,
    commandProposalPanel: commandPanel,
    publishEvidence: publishEvidence.publishEvidence,
    visiblePanelMarkers: markers.filter(marker => marker !== 'studio-publish-evidence-panel'),
  });

  assert.equal(artifact.ok, true);
  assert.equal(artifact.artifact.artifactKind, 'studio_workspace_cockpit_evidence');
  assert.equal(artifact.artifact.panels.assetInventory.entryCount, 3);
  assert.deepEqual(artifact.artifact.panels.commandProposals.statuses, ['accepted']);
  assert.equal(artifact.artifact.panels.publishEvidence.dependencyGuard, 'no-studio-dev-only-fragments');
  assert.ok(artifact.artifact.nonClaims.includes('not_publish_builder'));
  assert.match(artifact.artifact.artifactHash, /^studio-workspace-cockpit-evidence-/);
  assert.equal(missingMarker.ok, false);
  assert.equal(missingMarker.diagnostics.at(0)?.code, 'cockpit_missing_panel_marker');
});

test('project workspace artifact serializes only hash-pinned authored content', () => {
  const project = {
    gameId: 'asha-demo',
    manifestPath: 'asha.game.toml',
    manifestSha256: `sha256:${'c'.repeat(64)}`,
  };
  const sceneFile = {
    path: '/tmp/asha-scenes/minimal.scene.json',
    sha256: `sha256:${'a'.repeat(64)}`,
  };
  const text = serializeStudioWorkspaceArtifact({
    project,
    sceneFile,
    savedAtIso: '2026-06-27T00:00:00.000Z',
  });
  const restored = restoreStudioWorkspaceArtifact(text, { expectedProject: project });

  assert.equal(restored.ok, true);
  if (!restored.ok || restored.artifact === null) throw new Error('project workspace should restore');
  assert.equal(restored.artifact.artifactKind, 'studio_project_workspace');
  assert.deepEqual(restored.artifact.authoredContent.sceneFile, sceneFile);
  assert.equal(restored.artifact.stateClassification.editorPreferences, 'browser_local_not_serialized');
  assert.equal(restored.artifact.stateClassification.attachedRuntime, 'disconnect_and_reconnect_not_serialized');
  assert.equal(text.includes('viewportCamera'), false);
  assert.equal(text.includes('commandResults'), false);
  assert.equal(text.includes('runtimeAttachState'), false);

  const currentReference = validateStudioWorkspaceArtifactSceneReference(restored.artifact, {
    ...sceneFile,
  });
  const staleReference = validateStudioWorkspaceArtifactSceneReference(restored.artifact, {
    ...sceneFile,
    sha256: `sha256:${'b'.repeat(64)}`,
  });
  assert.equal(currentReference.ok, true);
  assert.equal(staleReference.ok, false);
  assert.equal(staleReference.diagnostics.at(0)?.code, 'workspace_artifact_scene_hash_mismatch');
});

test('project workspace artifact rejects malformed and foreign inputs while allowing arbitrary host scene paths', () => {
  const project = {
    gameId: 'asha-demo',
    manifestPath: 'asha.game.toml',
    manifestSha256: `sha256:${'c'.repeat(64)}`,
  };
  const text = serializeStudioWorkspaceArtifact({
    project,
    sceneFile: {
      path: '../outside.scene.json',
      sha256: `sha256:${'a'.repeat(64)}`,
    },
  });
  const malformed = restoreStudioWorkspaceArtifact(text.replace(`sha256:${'a'.repeat(64)}`, 'not-a-digest'));
  const foreign = restoreStudioWorkspaceArtifact(text, {
    expectedProject: { ...project, gameId: 'other-game' },
  });

  assert.equal(malformed.ok, false);
  assert.equal(malformed.diagnostics.at(0)?.code, 'workspace_artifact_shape_mismatch');
  assert.equal(foreign.ok, false);
  assert.equal(foreign.diagnostics.at(0)?.code, 'workspace_artifact_foreign_project');
  assert.doesNotThrow(() => serializeStudioWorkspaceArtifact({
    project,
    sceneFile: {
      path: '../outside.scene.json',
      sha256: `sha256:${'a'.repeat(64)}`,
    },
  }));
});

test('project workspace canonical fixture matches inspectable serialization', () => {
  const serialized = serializeStudioWorkspaceArtifact({
    project: {
      gameId: 'asha-testing',
      manifestPath: 'asha.game.toml',
      manifestSha256: 'sha256:eff8415dc697c49b3936671c7c6d0a50c81490347d44c954a197bb438653dfdc',
    },
    sceneFile: {
      path: '/tmp/asha-scenes/minimal.scene.json',
      sha256: 'sha256:9bce31bf50692b7afc36151ac3b2fe1488fb00e0ce916a2de06ba9ee2579bdc8',
    },
    savedAtIso: '1970-01-01T00:00:00.000Z',
  });

  assert.equal(
    serialized,
    readFileSync(join(repoRoot, 'fixtures', 'studio-project-workspace.sample.json'), 'utf8'),
  );
});

test('host file service supports arbitrary paths with stale-safe atomic writes', async () => {
  const startDirectory = await mkdtemp(join(tmpdir(), 'asha-studio-host-files-'));
  const outsideDirectory = await mkdtemp(join(tmpdir(), 'asha-studio-host-files-outside-'));
  try {
    const first = await writeStudioProjectFile(startDirectory, {
      path: 'studio/asha-studio-workspace.json',
      text: '{"version":1}\n',
      expectedHash: null,
    }) as { readonly ok: boolean; readonly sha256?: string };
    assert.equal(first.ok, true);
    assert.match(first.sha256 ?? '', /^sha256:[0-9a-f]{64}$/);

    const stale = await writeStudioProjectFile(startDirectory, {
      path: 'studio/asha-studio-workspace.json',
      text: '{"version":2}\n',
      expectedHash: `sha256:${'0'.repeat(64)}`,
    }) as { readonly ok: boolean; readonly diagnostic?: string; readonly previousHash?: string | null };
    assert.equal(stale.ok, false);
    assert.equal(stale.diagnostic, 'stale_file_hash');
    assert.equal(stale.previousHash, first.sha256);

    const outsidePath = join(outsideDirectory, 'arbitrary.scene.json');
    const outsideWrite = await writeStudioProjectFile(startDirectory, {
      path: outsidePath,
      text: '{"outside":true}\n',
      expectedHash: null,
    }) as { readonly ok: boolean; readonly path?: string };
    assert.equal(outsideWrite.ok, true);
    const outsideRead = await readStudioProjectFile(startDirectory, outsidePath) as {
      readonly ok: boolean;
      readonly path?: string;
      readonly text?: string;
    };
    assert.equal(outsideRead.ok, true);
    assert.equal(outsideRead.path, outsidePath);
    assert.equal(outsideRead.text, '{"outside":true}\n');

    const second = await writeStudioProjectFile(startDirectory, {
      path: 'studio/asha-studio-workspace.json',
      text: '{"version":2}\n',
      expectedHash: first.sha256,
    }) as { readonly ok: boolean; readonly sha256?: string };
    const readback = await readStudioProjectFile(
      startDirectory,
      'studio/asha-studio-workspace.json',
    ) as { readonly ok: boolean; readonly text?: string; readonly sha256?: string };
    assert.equal(second.ok, true);
    assert.equal(readback.text, '{"version":2}\n');
    assert.equal(readback.sha256, second.sha256);

    const concurrent = await Promise.all([
      writeStudioProjectFile(startDirectory, {
        path: 'studio/asha-studio-workspace.json',
        text: '{"version":3,"writer":"a"}\n',
        expectedHash: second.sha256,
      }),
      writeStudioProjectFile(startDirectory, {
        path: 'studio/asha-studio-workspace.json',
        text: '{"version":3,"writer":"b"}\n',
        expectedHash: second.sha256,
      }),
    ]) as readonly { readonly ok: boolean; readonly diagnostic?: string }[];
    assert.equal(concurrent.filter(result => result.ok).length, 1);
    assert.equal(concurrent.filter(result => result.diagnostic === 'stale_file_hash').length, 1);
    assert.deepEqual(
      (await readdir(join(startDirectory, 'studio'))).filter(path => path.endsWith('.tmp')),
      [],
    );
  } finally {
    await rm(startDirectory, { recursive: true, force: true });
    await rm(outsideDirectory, { recursive: true, force: true });
  }
});

test('project workspace load stages a decoded canonical scene before state replacement', () => {
  const manifestText = readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8');
  const manifestSha256 = sha256(manifestText);
  const projectResult = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText,
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(projectResult.ok, true);
  if (!projectResult.ok) throw new Error('asha-testing workspace should load');

  const scenePath = '/tmp/asha-scenes/minimal.scene.json';
  const sceneDocument = buildInitialWorkspaceReadModel().flatSceneDocument;
  const sceneFile = { path: scenePath, sha256: `sha256:${'a'.repeat(64)}` };
  const artifactText = serializeStudioWorkspaceArtifact({
    project: {
      gameId: projectResult.workspace.gameId,
      manifestPath: projectResult.workspace.manifestPath,
      manifestSha256,
    },
    sceneFile,
  });
  const currentWorkspace = buildInitialWorkspaceReadModel();
  const currentWorkspaceSnapshot = JSON.stringify(currentWorkspace);
  const staged = stageStudioProjectWorkspaceLoad({
    currentWorkspace,
    project: projectResult.workspace,
    manifestSha256,
    artifactText,
    sceneFile,
    sceneDocument,
  });
  const stale = stageStudioProjectWorkspaceLoad({
    currentWorkspace,
    project: projectResult.workspace,
    manifestSha256,
    artifactText,
    sceneFile: { ...sceneFile, sha256: `sha256:${'b'.repeat(64)}` },
    sceneDocument,
  });
  const malformed = stageStudioProjectWorkspaceLoad({
    currentWorkspace,
    project: projectResult.workspace,
    manifestSha256,
    artifactText: '{not-json',
    sceneFile,
    sceneDocument,
  });

  assert.equal(staged.ok, true);
  if (!staged.ok) throw new Error('valid project workspace should stage');
  assert.equal(staged.workspace.flatSceneDocument, sceneDocument);
  assert.equal(staged.sceneDocument, sceneDocument);
  assert.equal(stale.ok, false);
  assert.equal(stale.diagnostics.at(0)?.code, 'workspace_artifact_scene_hash_mismatch');
  assert.equal(malformed.ok, false);
  assert.equal(malformed.diagnostics.at(0)?.code, 'workspace_artifact_invalid_json');
  assert.equal(JSON.stringify(currentWorkspace), currentWorkspaceSnapshot);
});

test('ordinary scene persistence does not depend on browser storage profile data', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs', 'studio-store', 'src', 'index.ts'), 'utf8');
  const shellSource = readFileSync(join(repoRoot, 'libs', 'studio-shell', 'src', 'index.ts'), 'utf8');

  assert.equal(storeSource.includes('asha-studio.workspace.v1'), false);
  assert.equal(storeSource.includes('WORKSPACE_STORAGE_KEY'), false);
  assert.equal(storeSource.includes('browserStorage()?.setItem'), false);
  assert.equal(storeSource.includes('ASHA_STUDIO_PROJECT_WORKSPACE_PATH'), false);
  assert.equal(shellSource.includes('Save Project Workspace'), false);
  assert.equal(shellSource.includes('Load Project Workspace'), false);
});

test('render preferences are timeline-observable UI commands', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const preference = recordStudioWorkspaceUiCommand(readModel, {
    commandId: 'preferences.set_render_setting',
    label: 'Set Render Preference',
    inputSummary: 'showGrid=false',
    outputSummary: 'Render setting showGrid updated.',
  }).workspace;
  assert.equal(preference.timeline.at(-1)?.commandId, 'preferences.set_render_setting');
  assert.equal(preference.scene.sceneHash, readModel.scene.sceneHash);
  assert.equal(preference.timelineSequence, readModel.timelineSequence + 1);
});

test('studio UI state readout classifies non-authoritative affordance state', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const uiState = buildStudioUiStateReadModel({
    activeMenu: 'view',
    bottomPanelTab: 'assets',
    assetBrowserCategory: 'materials',
    entities: readModel.entities,
    hierarchyFilter: 'scenario-placeholder',
    menuMessage: 'Assets filter selected.',
    projectWorkspaceAvailable: true,
  });

  assert.equal(uiState.artifactKind, 'studio_ui_state');
  assert.equal(uiState.uiStateVersion, 'studio-ui-state.v1');
  assert.equal(uiState.activeMenu, 'view');
  assert.equal(uiState.bottomPanelTab, 'assets');
  assert.equal(uiState.hierarchyFilter, 'scenario-placeholder');
  assert.equal(uiState.hierarchy.totalCount, readModel.entities.length);
  assert.match(uiState.uiStateHash, /^studio-ui-state-/);
  assert.ok(uiState.nonClaims.includes('does_not_change_scene_hash'));
});

test('compatibility evidence records approved public ASHA package roots', () => {
  const packageJson = JSON.parse(
    readFileSync(join(repoRoot, 'package.json'), 'utf8'),
  ) as StudioPackageJsonLike;
  const evidence = buildStudioCompatibilityEvidence({ packageJson });

  assert.equal(evidence.contractsVersion, 'contracts.v0');
  assert.equal(evidence.commandRegistryVersion, 'command-registry.v0');
  assert.equal(evidence.editorToolsVersion, 'editor-tools.v0');
  assert.equal(evidence.runtimeBridgeVersion, 'runtime-bridge.v0');
  assert.deepEqual(evidence.diagnostics, []);
});

test('compatibility evidence fails closed on required package link drift', () => {
  const evidence = buildStudioCompatibilityEvidence({
    packageJson: {
      dependencies: {
        '@asha/contracts': 'link:../asha-engine/ts/packages/contracts',
        '@asha/command-registry': 'link:../asha-engine/ts/packages/command-registry/src',
        '@asha/editor-tools': 'link:../asha-engine/ts/packages/editor-tools',
      },
    },
  });

  assert.equal(evidence.commandRegistryVersion, 'missing');
  assert.equal(evidence.diagnostics.at(0)?.code, 'asha.compatibility.required_package_link_mismatch');
});

test('hierarchy projection validation detects drift, stale hashes, and missing selection', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const entityListHash = computeEntityListHash(readModel.entities);
  const sceneRenderableIds = readModel.scene.renderables.map(renderable => renderable.renderableId);
  const diagnostics = validateEntityProjection({
    entities: readModel.entities.slice(0, -1),
    selectedEntityId: 'entity:missing',
    sceneRenderableIds,
    recordedHash: 'entity-list-stale',
    recomputedHash: entityListHash,
  });

  assert.deepEqual(
    diagnostics.map(diagnostic => diagnostic.code),
    ['hierarchy_readback_drift', 'missing_selected_entity', 'stale_entity_list'],
  );
});

test('selection sync validation keeps hierarchy and viewport on the shared command path', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const selectableIds = readModel.entities
    .filter(entity => entity.selectable)
    .map(entity => entity.id);
  const selectedEntityId = readModel.selectedEntityId;
  const entityRenderableLinks = Object.fromEntries(
    readModel.entities.map(entity => [entity.id, entity.renderableId]),
  );

  assert.ok(selectedEntityId);
  assert.deepEqual(
    validateSelectionCommandSync({
      commandPresent: true,
      commandEntityId: selectedEntityId,
      commandSelected: true,
      viewportSelectedRenderableId: readModel.scene.selectedRenderableId,
      selectableEntityIds: selectableIds,
      entityRenderableLinks,
    }),
    [],
  );
  assert.equal(
    validateSelectionCommandSync({
      commandPresent: false,
      commandEntityId: null,
      commandSelected: false,
      viewportSelectedRenderableId: readModel.scene.selectedRenderableId,
      selectableEntityIds: selectableIds,
    }).at(0)?.code,
    'missing_selection_command',
  );
});

test('agent readout fixture reflects the current Angular substrate model', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const readout = createStudioAgentReadout(readModel);
  const fixture = JSON.parse(
    readFileSync(join(repoRoot, 'fixtures', 'studio-agent-readout.sample.json'), 'utf8'),
  ) as StudioAgentReadoutArtifact;

  assert.equal(readout.artifactKind, 'agent_readout');
  assert.equal(fixture.compatibilityMarker, readModel.compatibilityMarker);
  assert.equal(fixture.commandTimeline.length, readModel.timeline.length);
  assert.equal(fixture.commandResults.length, readModel.commandResults.length);
  assert.equal(fixture.entities.length, readModel.entities.length);
  assert.equal(fixture.entityListHash, computeEntityListHash(readModel.entities));
  assert.equal(fixture.viewport?.readoutVersion, 'studio-viewport-readout.v0');
  assert.equal(fixture.renderSettings?.renderSettingsHash.startsWith('render-settings-'), true);
  assert.equal(fixture.uiState?.artifactKind, 'studio_ui_state');
});

test('compact agent readout summarizes shared Studio state without proof harness sprawl', () => {
  const readModel = buildAuthoredWorkspaceReadModel();
  const renderSettings = buildStudioPreferencesReadModel().render;
  const selectedRenderable = readModel.scene.renderables.find(
    renderable => renderable.renderableId === 'scene-node-renderable:2',
  );

  assert.ok(selectedRenderable);
  const latestViewportHit = buildStudioViewportHitReadModel({
    renderable: selectedRenderable,
    face: 'z_max',
    worldPosition: { x: 0.2, y: 0.3, z: 0.9 },
  });
  const readout = createStudioCompactAgentReadout({
    workspace: readModel,
    renderSettings,
    viewportCamera: buildStudioViewportCameraReadModel({ position: { x: 6, y: 4, z: 3 } }),
    viewportTool: buildStudioViewportToolReadModel('orbit'),
    uiState: buildStudioUiStateReadModel({ entities: readModel.entities }),
    latestViewportHit,
  });

  assert.equal(readout.artifactKind, 'compact_agent_readout');
  assert.equal(readout.readoutVersion, 'studio-compact-readout.v0');
  assert.equal(readout.session.scenarioId, 'untitled');
  assert.equal(readout.scene.selectedRenderableId, 'scene-node-renderable:2');
  assert.equal(readout.selectedEntity?.label, 'Authored Voxel Volume');
  assert.equal(readout.latestViewportHit?.face, 'z_max');
  assert.equal(readout.viewport.tool.activeTool, 'orbit');
  assert.match(readout.viewport.cameraHash, /^viewport-camera-/);
  assert.equal(readout.uiState?.artifactKind, 'studio_ui_state');
  assert.equal(readout.latestCommand?.commandId, 'scene.open_document');
  assert.equal(readout.latestCommandResult?.commandId, 'scene.open_document');
  assert.ok(readout.nonClaims.includes('not_proof_harness'));
});

test('full agent readout can carry viewport preferences and UI state without proof sprawl', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const viewport = buildStudioViewportReadout({
    camera: buildStudioViewportCameraReadModel({ target: { x: 1, y: 2, z: 3 } }),
    tool: buildStudioViewportToolReadModel('pan'),
  });
  const renderSettings = updateStudioRenderSetting(
    buildStudioPreferencesReadModel(),
    'wireframeEnabled',
    true,
  ).render;
  const uiState = buildStudioUiStateReadModel({
    bottomPanelTab: 'evidence',
    entities: readModel.entities,
  });
  const readout = createStudioAgentReadout(readModel, {
    viewport,
    renderSettings,
    uiState,
  });

  assert.equal(readout.viewport?.tool.activeTool, 'pan');
  assert.equal(readout.renderSettings?.wireframeEnabled, true);
  assert.equal(readout.uiState?.bottomPanelTab, 'evidence');
  assert.equal(readout.commandTimeline.length, readModel.timeline.length);
});

test('secondary evidence surface is present without occupying the primary viewport', () => {
  const panelSource = readFileSync(
    join(repoRoot, 'libs', 'studio-panels', 'src', 'index.ts'),
    'utf8',
  );
  const viewportSource = readFileSync(
    join(repoRoot, 'libs', 'studio-viewport', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(panelSource.includes('store.setBottomPanelTab(\'evidence\')'), true);
  assert.equal(panelSource.includes('data-visual-id="studio-secondary-evidence"'), true);
  assert.equal(panelSource.includes('compactAgentReadout()'), true);
  assert.equal(viewportSource.includes('studio-secondary-evidence'), false);
});

test('runtime tools are menu-scoped without a permanent proof session strip', () => {
  const panelSource = readFileSync(
    join(repoRoot, 'libs', 'studio-panels', 'src', 'index.ts'),
    'utf8',
  );
  const shellSource = readFileSync(
    join(repoRoot, 'libs', 'studio-shell', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(panelSource.includes("selector: 'asha-runtime-tools-menu'"), true);
  assert.equal(panelSource.includes('data-visual-id="studio-runtime-tools-menu"'), true);
  assert.equal(panelSource.includes('Temporary scenarios'), false);
  assert.equal(panelSource.includes('Project scene open/save is under File'), false);
  assert.equal(panelSource.includes('data-visual-id="studio-runtime-session-panel"'), false);
  assert.equal(shellSource.includes("store.activeMenu() === 'runtime'"), true);
  assert.equal(shellSource.includes('<asha-runtime-tools-menu />'), true);
  assert.equal(shellSource.includes('<asha-session-top-panel'), false);
  assert.equal(shellSource.includes('"top top top"'), false);
});

test('hierarchy panel exposes compact drag and filter affordances over scene objects', () => {
  const panelSource = readFileSync(
    join(repoRoot, 'libs', 'studio-panels', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(panelSource.includes('store.setHierarchyFilter'), true);
  assert.equal(panelSource.includes('draggable="true"'), true);
  assert.equal(panelSource.includes('data-scene-object-id'), true);
  assert.equal(panelSource.includes('dropOnEntity'), true);
  assert.equal(panelSource.includes('store.reparentSceneObject'), true);
});

test('viewport toolbar exposes compact backed camera and object transform tools', () => {
  const panelSource = readFileSync(
    join(repoRoot, 'libs', 'studio-panels', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(panelSource.includes('data-visual-id="studio-viewport-top-panel"'), true);
  assert.equal(panelSource.includes('data-tool-id'), true);
  assert.equal(panelSource.includes("id: 'pan'"), true);
  assert.equal(panelSource.includes("id: 'orbit'"), true);
  assert.equal(panelSource.includes("id: 'move_object'"), true);
  assert.equal(panelSource.includes("id: 'rotate_object'"), true);
  assert.equal(panelSource.includes("backedTool: 'move_object'"), true);
  assert.equal(panelSource.includes("backedTool: 'rotate_object'"), true);
  assert.equal(panelSource.includes('selectedSceneObjectTransformEditable'), true);
  assert.equal(panelSource.includes('data-toolbar-readout="grid"'), true);
  assert.equal(panelSource.includes('data-toolbar-readout="shading"'), true);
});

test('asset browser entries project catalog assets and referenced renderables for inspector details', () => {
  const panelSource = readFileSync(
    join(repoRoot, 'libs', 'studio-panels', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(panelSource.includes('data-asset-id'), true);
  assert.equal(panelSource.includes('store.selectCatalogAsset(asset.assetId)'), true);
  assert.equal(panelSource.includes('referencedRenderableIds'), true);
  assert.equal(panelSource.includes('asset-entry--selected'), true);
  assert.equal(panelSource.includes('data-inspector-section="asset-details"'), true);
  assert.equal(panelSource.includes('assetTypeLabel(renderable)'), true);
});

test('catalog bottom panel exposes human catalog workflow without preview overclaims', () => {
  const panelSource = readFileSync(
    join(repoRoot, 'libs', 'studio-panels', 'src', 'index.ts'),
    'utf8',
  );
  const doc = readFileSync(join(repoRoot, 'docs', 'catalog-preview-strategy-m3.md'), 'utf8');

  assert.equal(panelSource.includes("store.setBottomPanelTab('catalog')"), true);
  assert.equal(panelSource.includes('data-visual-id="studio-catalog-workflow-panel"'), true);
  assert.equal(panelSource.includes('store.linkCatalogAsset'), true);
  assert.equal(panelSource.includes('store.validateCatalogSource'), true);
  assert.equal(panelSource.includes('data-catalog-source-exists'), true);
  assert.equal(doc.includes('Previewable Now'), true);
  assert.equal(doc.includes('not_mesh_material_texture_preview'), true);
  assert.equal(doc.includes('pnpm run evidence -- catalog-workflow-m3'), true);
});

test('viewport pick debug sends temporary renderer-neutral overlay markers through the public host', () => {
  const viewportSource = readFileSync(
    join(repoRoot, 'libs', 'studio-viewport', 'src', 'index.ts'),
    'utf8',
  );
  const shellSource = readFileSync(
    join(repoRoot, 'libs', 'studio-shell', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(shellSource.includes('showRaycastHitDebug'), true);
  assert.equal(viewportSource.includes('showPickDebugHint'), true);
  assert.equal(viewportSource.includes('showRaycastHitDebug'), true);
  assert.equal(viewportSource.includes('10_000'), true);
  assert.equal(viewportSource.includes('channels.overlay.replace'), true);
  assert.equal(viewportSource.includes('buildViewportOverlayFrame'), true);
});

test('verification tiers document keeps proof escalation secondary', () => {
  const doc = readFileSync(
    join(repoRoot, 'docs', 'studio-agent-observability-verification.md'),
    'utf8',
  );
  const projectBootstrap = readFileSync(join(repoRoot, 'agents-project.md'), 'utf8');

  assert.equal(doc.includes('Tier 1: domain/store tests'), true);
  assert.equal(doc.includes('Tier 2: `pnpm run verify`'), true);
  assert.equal(doc.includes('Tier 4: compositor/runtime proof'), true);
  assert.equal(doc.includes('Do not add browser/compositor proof for a small domain helper'), true);
  assert.equal(projectBootstrap.includes('studio-agent-observability-verification.md'), true);
});

test('selected backend attach proof command has a stable reviewer artifact path', () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  const evidenceCatalog = JSON.parse(readFileSync(join(repoRoot, 'scripts/studio-evidence-catalog.json'), 'utf8')) as {
    defaultListStatuses: readonly string[];
    runnableStatuses: readonly string[];
    retiredStatuses: readonly string[];
    entries: readonly {
      name: string;
      status: string;
      lane: string;
      scriptPath: string;
      replacement?: string;
    }[];
  };
  const browserSmokeSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-selected-backend-browser-smoke.ts'),
    'utf8',
  );
  const projectFileServerSource = readFileSync(
    join(repoRoot, 'scripts', 'studio-project-file-server.ts'),
    'utf8',
  );
  const projectFileServiceSource = readFileSync(
    join(repoRoot, 'scripts', 'studio-project-file-service.ts'),
    'utf8',
  );
  const shellSource = readFileSync(
    join(repoRoot, 'libs', 'studio-shell', 'src', 'index.ts'),
    'utf8',
  );
  const storeSource = readFileSync(
    join(repoRoot, 'libs', 'studio-store', 'src', 'index.ts'),
    'utf8',
  );
  const aggregateSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-v2-live-backend-evidence.ts'),
    'utf8',
  );
  const authoredRoundtripFixtureSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-authored-roundtrip-fixture.ts'),
    'utf8',
  );
  const authoredBrowserRuntimeLoadSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-authored-browser-runtime-load.ts'),
    'utf8',
  );
  const authoredBrowserInteractionSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-authored-browser-interaction.ts'),
    'utf8',
  );
  const authoredStudioDebugReadbackSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-authored-studio-debug-readback.ts'),
    'utf8',
  );
  const authorRuntimeRoundtripIndexSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-author-runtime-roundtrip-index.ts'),
    'utf8',
  );
  const authorRuntimeRoundtripM5Source = readFileSync(
    join(repoRoot, 'scripts', 'proof-author-runtime-roundtrip-m5.ts'),
    'utf8',
  );
  const properDemoCapstoneVerifierSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-proper-demo-capstone-verifier.ts'),
    'utf8',
  );
  const properDemoEvidenceIndexSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-proper-demo-evidence-index.ts'),
    'utf8',
  );
  const properDemoCapstoneGuardSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-proper-demo-capstone-guard.ts'),
    'utf8',
  );
  const liveDebugIdentitySource = readFileSync(
    join(repoRoot, 'scripts', 'proof-live-debug-session-identity.ts'),
    'utf8',
  );
  const liveSceneEntitySource = readFileSync(
    join(repoRoot, 'scripts', 'proof-live-scene-entity-debug-inspector.ts'),
    'utf8',
  );
  const liveAssetResourceSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-live-asset-resource-debug-inspector.ts'),
    'utf8',
  );
  const liveRuntimeTelemetrySource = readFileSync(
    join(repoRoot, 'scripts', 'proof-live-runtime-telemetry-debug-inspector.ts'),
    'utf8',
  );
  const liveDebugCommandSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-live-debug-command-proposals.ts'),
    'utf8',
  );
  const liveGameplayDebugM4Source = readFileSync(
    join(repoRoot, 'scripts', 'proof-live-gameplay-debug-m4.ts'),
    'utf8',
  );
  const runningProjectConnectionSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-running-project-connection.ts'),
    'utf8',
  );
  const catalogWorkflowM3Source = readFileSync(
    join(repoRoot, 'scripts', 'proof-catalog-workflow-m3.ts'),
    'utf8',
  );
  const nativeVoxelLaunchSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-native-voxel-runtime-launch.ts'),
    'utf8',
  );

  assert.equal(Object.keys(packageJson.scripts).some(scriptName => scriptName.startsWith('proof:')), false);
  assert.equal(packageJson.scripts.evidence, 'node scripts/studio-evidence.mjs run');
  assert.equal(packageJson.scripts['evidence:list'], 'node scripts/studio-evidence.mjs list');
  assert.equal(packageJson.scripts['check:evidence-catalog'], 'node scripts/check-evidence-catalog.mjs');
  assert.equal(packageJson.scripts.verify.includes('pnpm run check:evidence-catalog'), true);
  assert.equal(
    packageJson.scripts['evidence:v2-live-backend'],
    'node scripts/studio-evidence.mjs run v2-live-backend-evidence',
  );
  assert.equal(packageJson.scripts['studio:dev'], 'pnpm run dev');
  assert.equal(
    packageJson.scripts['studio:dev:native-voxel'],
    'pnpm exec tsx scripts/proof-native-voxel-runtime-launch.ts --serve',
  );
  assert.equal(
    packageJson.scripts['studio:proof:native-voxel'],
    'pnpm run evidence -- native-voxel-runtime-launch',
  );
  assert.equal(packageJson.scripts.check, 'pnpm run lint && pnpm run typecheck && pnpm run test');
  assert.equal(
    packageJson.scripts['dev:files'],
    'tsx scripts/studio-project-file-server.ts',
  );
  for (const evidenceName of [
    'selected-backend-attach',
    'selected-backend-command',
    'selected-backend-browser-smoke',
    'v2-live-backend-evidence',
    'authored-roundtrip-fixture',
    'authored-browser-runtime-load',
    'authored-browser-interaction',
    'authored-studio-debug-readback',
    'author-runtime-roundtrip-index',
    'author-runtime-roundtrip-m5',
    'proper-demo-capstone-verifier',
    'proper-demo-evidence-index',
    'proper-demo-capstone-guard',
    'live-debug-session-identity',
    'live-scene-entity-debug-inspector',
    'live-asset-resource-debug-inspector',
    'live-runtime-telemetry-debug-inspector',
    'live-debug-command-proposals',
    'live-gameplay-debug-m4',
    'running-project-connection',
    'catalog-workflow-m3',
    'native-voxel-runtime-launch',
  ]) {
    assert.equal(existsSync(join(repoRoot, 'scripts', `proof-${evidenceName}.ts`)), true);
  }
  const catalogEntries = new Map(evidenceCatalog.entries.map(entry => [entry.name, entry]));
  assert.deepEqual(evidenceCatalog.defaultListStatuses, ['current_product']);
  assert.deepEqual(evidenceCatalog.runnableStatuses, ['current_product', 'current_milestone']);
  assert.deepEqual(evidenceCatalog.retiredStatuses, ['delegated_to_testing', 'legacy_retired']);
  assert.equal(catalogEntries.get('v2-live-backend-evidence')?.status, 'current_product');
  assert.equal(catalogEntries.get('live-debug-session-identity')?.lane, 'studio_live_inspection');
  assert.equal(catalogEntries.get('catalog-workflow-m3')?.lane, 'studio_authoring');
  assert.equal(catalogEntries.get('native-voxel-runtime-launch')?.status, 'current_product');
  assert.equal(catalogEntries.get('authoring-ux-m2')?.status, 'current_milestone');
  assert.equal(catalogEntries.get('runtime-session-inspection')?.status, 'legacy_retired');
  assert.equal(catalogEntries.get('playable-loop-inspection')?.status, 'delegated_to_testing');
  assert.match(catalogEntries.get('playable-loop-inspection')?.replacement ?? '', /asha-demo playable loop/);
  assert.equal(browserSmokeSource.includes('structured readout JSON is required'), true);
  assert.equal(browserSmokeSource.includes('marker_strings_without_json_readout_rejected'), true);
  assert.equal(projectFileServerSource.includes('/api/host-files/list'), true);
  assert.equal(projectFileServerSource.includes('/api/host-files/file'), true);
  assert.equal(projectFileServerSource.includes('ASHA_STUDIO_PROJECT_ROOT'), false);
  assert.equal(projectFileServiceSource.includes("flag: 'wx'"), true);
  assert.equal(projectFileServiceSource.includes('await rename(temporaryPath, resolved.absolutePath)'), true);
  assert.equal(projectFileServiceSource.includes("segment === '..'"), false);
  assert.equal(shellSource.includes('projectFileDialog()'), true);
  assert.equal(shellSource.includes('Save Project Workspace'), false);
  assert.equal(shellSource.includes('Browser Slot'), false);
  assert.equal(shellSource.includes('data-visual-id="studio-host-file-dialog"'), true);
  assert.equal(shellSource.includes("openSceneFileDialog('open')"), true);
  assert.equal(shellSource.includes("openSceneFileDialog('save-as')"), true);
  assert.equal(shellSource.includes('Files on the Studio host'), true);
  assert.equal(shellSource.includes('project-file-browser'), false);
  assert.equal(storeSource.includes('refreshProjectFiles'), true);
  assert.equal(storeSource.includes("StudioSceneFileDialogMode = 'open' | 'save-as'"), true);
  assert.equal(storeSource.includes("this.openSceneFileDialog('save-as')"), true);
  assert.equal(storeSource.includes('projectFileApiBase'), true);
  assert.equal(storeSource.includes('asha-studio.workspace.v1'), false);
  assert.equal(storeSource.includes('setItem(WORKSPACE_STORAGE_KEY'), false);
  assert.equal(aggregateSource.includes("artifactKind: 'studio_v2_live_backend_evidence'"), true);
  assert.equal(aggregateSource.includes('stale source artifact hash'), true);
  assert.equal(aggregateSource.includes('browser smoke must consume the current command proof'), true);
  assert.equal(authoredRoundtripFixtureSource.includes("artifactKind: 'studio_authored_roundtrip_fixture_proof'"), true);
  assert.equal(authoredRoundtripFixtureSource.includes('studio-authored-content.fixture.json'), true);
  assert.equal(authoredRoundtripFixtureSource.includes('not_runtime_loaded'), true);
  assert.equal(authoredBrowserRuntimeLoadSource.includes("artifactKind: 'studio_authored_browser_runtime_load_proof'"), true);
  assert.equal(authoredBrowserRuntimeLoadSource.includes('roundtrip:runtime-load'), true);
  assert.equal(authoredBrowserRuntimeLoadSource.includes('fixture_hash_matches_demo_runtime_load'), true);
  assert.equal(authoredBrowserInteractionSource.includes("artifactKind: 'studio_authored_browser_interaction_proof'"), true);
  assert.equal(authoredBrowserInteractionSource.includes('roundtrip:browser-interaction'), true);
  assert.equal(authoredBrowserInteractionSource.includes('authored_selection_readback_matches_runtime_load'), true);
  assert.equal(authoredStudioDebugReadbackSource.includes("artifactKind: 'studio_authored_studio_debug_readback_proof'"), true);
  assert.equal(authoredStudioDebugReadbackSource.includes("'evidence', '--', 'live-gameplay-debug-m4'"), true);
  assert.equal(authoredStudioDebugReadbackSource.includes('browser_selected_authored_object_projected_to_studio_debug'), true);
  assert.equal(authorRuntimeRoundtripIndexSource.includes("artifactKind: 'studio_author_runtime_roundtrip_evidence_index'"), true);
  assert.equal(authorRuntimeRoundtripIndexSource.includes('source_artifact_chain_current'), true);
  assert.equal(authorRuntimeRoundtripIndexSource.includes('stale_source_artifact_hash'), true);
  assert.equal(authorRuntimeRoundtripM5Source.includes("artifactKind: 'studio_author_runtime_roundtrip_m5'"), true);
  assert.equal(authorRuntimeRoundtripM5Source.includes("'evidence', '--', 'author-runtime-roundtrip-index'"), true);
  assert.equal(authorRuntimeRoundtripM5Source.includes('authored_object_round_trips_from_studio_to_browser_back_to_studio_debug'), true);
  assert.equal(properDemoCapstoneVerifierSource.includes("artifactKind: 'studio_proper_demo_capstone_verifier'"), true);
  assert.equal(properDemoCapstoneVerifierSource.includes('pnpm run evidence -- proper-demo-capstone-verifier'), true);
  assert.equal(properDemoCapstoneVerifierSource.includes('negative_marker_only_browser_interaction_failed_closed'), true);
  assert.equal(properDemoEvidenceIndexSource.includes("artifactKind: 'studio_proper_demo_evidence_index'"), true);
  assert.equal(properDemoEvidenceIndexSource.includes('m1_through_m5_evidence_kinds_indexed'), true);
  assert.equal(properDemoEvidenceIndexSource.includes('generated_artifact_is_not_authored_source'), true);
  assert.equal(properDemoCapstoneGuardSource.includes("artifactKind: 'studio_proper_demo_capstone_guard'"), true);
  assert.equal(properDemoCapstoneGuardSource.includes('required_non_claims_present'), true);
  assert.equal(properDemoCapstoneGuardSource.includes('negative_private_hint_failed_closed'), true);
  assert.equal(liveDebugIdentitySource.includes("artifactKind: 'studio_live_debug_session_identity_proof'"), true);
  assert.equal(liveDebugIdentitySource.includes('stale_child_artifact'), true);
  assert.equal(liveDebugIdentitySource.includes('fixture-only readback'), true);
  assert.equal(liveSceneEntitySource.includes("artifactKind: 'studio_live_scene_entity_debug_inspector_proof'"), true);
  assert.equal(liveSceneEntitySource.includes('selected_entity_transform_projected'), true);
  assert.equal(liveSceneEntitySource.includes('missing selected entity'), true);
  assert.equal(liveAssetResourceSource.includes("artifactKind: 'studio_live_asset_resource_debug_inspector_proof'"), true);
  assert.equal(liveAssetResourceSource.includes('referenced_renderables_present'), true);
  assert.equal(liveAssetResourceSource.includes('missing asset resource'), true);
  assert.equal(liveRuntimeTelemetrySource.includes("artifactKind: 'studio_live_runtime_telemetry_debug_inspector_proof'"), true);
  assert.equal(liveRuntimeTelemetrySource.includes('telemetry_samples_present'), true);
  assert.equal(liveRuntimeTelemetrySource.includes('mismatched live hash'), true);
  assert.equal(liveDebugCommandSource.includes("artifactKind: 'studio_live_debug_command_proposals'"), true);
  assert.equal(liveDebugCommandSource.includes('unsupported_debug_command'), true);
  assert.equal(liveDebugCommandSource.includes('no_freeform_json_command_hatch'), true);
  assert.equal(liveGameplayDebugM4Source.includes("artifactKind: 'studio_live_gameplay_debug_m4'"), true);
  assert.equal(liveGameplayDebugM4Source.includes('source_artifact_hashes_verified'), true);
  assert.equal(liveGameplayDebugM4Source.includes('stale_source_artifact_hash'), true);
  assert.equal(runningProjectConnectionSource.includes("artifactKind: 'studio_running_project_connection_browser_proof'"), true);
  assert.equal(runningProjectConnectionSource.includes('structured running project readout JSON is required'), true);
  assert.equal(runningProjectConnectionSource.includes('negative_private_transport_failed_closed'), true);
  assert.equal(catalogWorkflowM3Source.includes("artifactKind: 'studio_catalog_workflow_m3_browser_proof'"), true);
  assert.equal(nativeVoxelLaunchSource.includes("process.argv.includes('--serve')"), true);
  assert.equal(nativeVoxelLaunchSource.includes('function injectBrowserHostScripts'), true);
  assert.equal(nativeVoxelLaunchSource.includes('automationPrelude(referenceMeshImport)'), true);
  assert.equal(nativeVoxelLaunchSource.includes('launchNativeBrowserHost'), true);
  assert.equal(nativeVoxelLaunchSource.includes('ASHA Studio native voxel server is running.'), true);
  assert.equal(catalogWorkflowM3Source.includes('structured catalog workflow readout JSON is required'), true);
  assert.equal(catalogWorkflowM3Source.includes('negative_private_catalog_path_failed_closed'), true);
});

evidenceProcessTest('live debug session identity proof command records freshness and child artifacts', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'live-debug-session-identity'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/live-debug-session-identity-proof\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/live-debug-session-identity-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_live_debug_session_identity_proof');
  assert.equal(artifact.identity.identityVersion, 'studio-live-debug-session-identity.v0');
  assert.equal(artifact.identity.attachStatus, 'attached');
  assert.equal(artifact.identity.liveFreshness.readAfterAttach, true);
  assert.match(artifact.identity.identityHash, /^studio-live-debug-session-identity-/);
  assert.equal(artifact.sourceArtifacts.length, 2);
  assert.ok(artifact.validations.includes('live_session_identity_projected'));
  assert.ok(artifact.validations.includes('negative_stale_child_failed_closed'));
  assert.ok(artifact.nonClaims.includes('not_private_transport'));
});

evidenceProcessTest('live scene/entity debug inspector proof command records selected scene readback', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'live-scene-entity-debug-inspector'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/live-scene-entity-debug-inspector-proof\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/live-scene-entity-debug-inspector-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_live_scene_entity_debug_inspector_proof');
  assert.equal(artifact.inspector.inspectorVersion, 'studio-live-scene-entity-debug-inspector.v0');
  assert.equal(artifact.inspector.entity.label, 'Voxel (0, 0, 0)');
  assert.equal(artifact.inspector.scene.renderableCount > 0, true);
  assert.match(artifact.inspector.inspectorHash, /^studio-live-scene-entity-debug-inspector-/);
  assert.ok(artifact.validations.includes('selected_entity_transform_projected'));
  assert.ok(artifact.validations.includes('negative_missing_selection_failed_closed'));
  assert.ok(artifact.nonClaims.includes('not_private_ecs_read'));
});

evidenceProcessTest('live asset/resource debug inspector proof command records selected asset readback', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'live-asset-resource-debug-inspector'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/live-asset-resource-debug-inspector-proof\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/live-asset-resource-debug-inspector-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_live_asset_resource_debug_inspector_proof');
  assert.equal(artifact.inspector.inspectorVersion, 'studio-live-asset-resource-debug-inspector.v0');
  assert.equal(artifact.inspector.asset.assetId, 'material.demo-copper');
  assert.equal(artifact.inspector.asset.importStatus, 'clean');
  assert.ok(artifact.inspector.asset.referencedRenderableIds.includes('model-preview-crate'));
  assert.match(artifact.inspector.inspectorHash, /^studio-live-asset-resource-debug-inspector-/);
  assert.ok(artifact.validations.includes('referenced_renderables_present'));
  assert.ok(artifact.validations.includes('negative_missing_asset_failed_closed'));
  assert.ok(artifact.nonClaims.includes('not_private_asset_database'));
});

evidenceProcessTest('live runtime/telemetry debug inspector proof command records live metrics', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'live-runtime-telemetry-debug-inspector'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/live-runtime-telemetry-debug-inspector-proof\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/live-runtime-telemetry-debug-inspector-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_live_runtime_telemetry_debug_inspector_proof');
  assert.equal(artifact.inspector.inspectorVersion, 'studio-live-runtime-telemetry-debug-inspector.v0');
  assert.equal(artifact.inspector.telemetry.sampleCount > 0, true);
  assert.ok(artifact.inspector.telemetry.sampleMetrics.includes('command_queue_depth'));
  assert.match(artifact.inspector.inspectorHash, /^studio-live-runtime-telemetry-debug-inspector-/);
  assert.ok(artifact.validations.includes('telemetry_samples_present'));
  assert.ok(artifact.validations.includes('negative_missing_telemetry_failed_closed'));
  assert.ok(artifact.nonClaims.includes('not_performance_evidence'));
});

evidenceProcessTest('live debug command proposals proof command records bounded shared command evidence', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'live-debug-command-proposals'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 300000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/live-debug-command-proposals-proof\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/live-debug-command-proposals-proof/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_live_debug_command_proposals');
  assert.equal(artifact.surface.surfaceVersion, 'studio-live-debug-command-proposals.v0');
  assert.equal(artifact.surface.allowedActionIds.at(0), 'set_voxel_reference');
  assert.equal(artifact.surface.actions.at(0)?.commandMessageType, 'command.propose');
  assert.equal(artifact.surface.actions.at(0)?.commandOperation, 'setVoxel');
  assert.deepEqual(artifact.surface.proposalStatuses, ['accepted', 'rejected']);
  assert.match(artifact.surface.acceptedProposalHash, /^studio-game-workspace-command-/);
  assert.match(artifact.surface.rejectedProposalHash, /^studio-game-workspace-command-/);
  assert.equal(artifact.commandProposalPanel.panelVersion, 'studio-command-proposal-panel.v0');
  assert.ok(artifact.validations.includes('debug_actions_are_bounded_to_known_command_ids'));
  assert.ok(artifact.surface.nonClaims.includes('not_freeform_json_method_call'));
  assert.equal(artifact.negativeSmokes.at(0)?.diagnostics.at(0)?.code, 'unsupported_debug_command');
  assert.equal(artifact.negativeSmokes.at(1)?.diagnostics.at(0)?.code, 'missing_command_result_evidence');
  assert.equal(artifact.negativeSmokes.at(2)?.diagnostics.at(0)?.code, 'debug_command_scope_mismatch');
});

evidenceProcessTest('live gameplay debug M4 aggregate proof gate records all child surfaces', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'live-gameplay-debug-m4'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 420000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/live-gameplay-debug-m4\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/live-gameplay-debug-m4/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_live_gameplay_debug_m4');
  assert.equal(artifact.sourceArtifacts.length, 5);
  assert.equal(artifact.liveSession.attachStatus, 'attached');
  assert.equal(artifact.liveSession.liveFreshness.readAfterAttach, true);
  assert.match(artifact.debugSurfaces.commandProposalSurfaceHash, /^studio-live-debug-command-proposals-/);
  assert.deepEqual(artifact.readouts.commandProposalStatuses, ['accepted', 'rejected']);
  assert.ok(artifact.validations.includes('bounded_command_proposals_present'));
  assert.ok(artifact.validations.includes('missing_or_stale_child_artifact_fails_closed'));
  assert.equal(artifact.negativeSmokes.at(0)?.case, 'stale_source_artifact_hash');
  assert.equal(artifact.negativeSmokes.at(0)?.ok, false);
  assert.ok(artifact.nonClaims.includes('not_private_runtime_mutation'));
});

evidenceProcessTest('running project connection browser proof captures human connect readout', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'running-project-connection'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/running-project-connection\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/running-project-connection/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_running_project_connection_browser_proof');
  assert.equal(artifact.readout.discovery.canDisconnect, true);
  assert.equal(artifact.readout.discovery.sessions[0].status, 'attached');
  assert.ok(artifact.validations.includes('browser_dom_contains_structured_running_project_readout'));
  assert.ok(artifact.validations.includes('negative_private_transport_failed_closed'));
  assert.ok(artifact.nonClaims.includes('not_network_scan'));
  assert.match(artifact.browser.screenshotHash, /^sha256:/);
});

evidenceProcessTest('catalog workflow M3 browser proof captures human catalog readout', () => {
  const result = spawnSync('pnpm', ['run', 'evidence', '--', 'catalog-workflow-m3'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /artifacts\/catalog-workflow-m3\/latest\/index\.json/);

  const artifact = JSON.parse(readFileSync(
    join(repoRoot, 'artifacts/catalog-workflow-m3/latest/index.json'),
    'utf8',
  ));
  assert.equal(artifact.artifactKind, 'studio_catalog_workflow_m3_browser_proof');
  assert.equal(artifact.readout.workflow.commandIds.linkAsset, 'catalog.link_asset');
  assert.ok(artifact.validations.includes('browser_dom_contains_structured_catalog_readout'));
  assert.ok(artifact.validations.includes('negative_private_catalog_path_failed_closed'));
  assert.ok(artifact.nonClaims.includes('not_mesh_material_texture_preview'));
  assert.match(artifact.browser.screenshotHash, /^sha256:/);
});

test('Studio live gameplay debug M4 closeout doc points at aggregate proof gate', () => {
  const doc = readFileSync(join(repoRoot, 'docs', 'live-gameplay-debug-m4.md'), 'utf8');

  assert.match(doc, /pnpm run evidence -- live-gameplay-debug-m4/);
  assert.match(doc, /artifacts\/live-gameplay-debug-m4\/latest\/index\.json/);
  assert.match(doc, /evidence -- live-debug-session-identity/);
  assert.match(doc, /evidence -- live-debug-command-proposals/);
  assert.match(doc, /no `call\(methodName, json\)` path/);
});

test('unused placeholder viewport panel is retired from studio panels', () => {
  const panelSource = readFileSync(
    join(repoRoot, 'libs', 'studio-panels', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(panelSource.includes('StudioViewportScenePanelComponent'), false);
  assert.equal(panelSource.includes('asha-viewport-scene-panel'), false);
});

test('theme package exports the CSS token catalog used by the app', () => {
  const tokenCss = readFileSync(
    join(repoRoot, 'libs', 'studio-theme', 'src', 'styles', 'tokens.css'),
    'utf8',
  );
  const cssVariables = themeTokenCssVariables();

  assert.equal(ashaStudioThemeMarker, 'asha-studio-theme.tokens.v1');
  assert.ok(cssVariables.includes('--asha-color-accent'));
  assert.ok(cssVariables.includes('--asha-font-ui'));
  assert.equal(new Set(cssVariables).size, ASHA_STUDIO_THEME_TOKENS.length);

  for (const cssVariable of cssVariables) {
    assert.equal(tokenCss.includes(cssVariable), true);
  }
});

test('studio feature-slice generator creates domain store panel and test paths', async () => {
  const tree = createTreeWithEmptyWorkspace();
  tree.write('libs/studio-domain/src/index.ts', 'export const domainRoot = true;\n');
  tree.write('libs/studio-store/src/index.ts', 'export const storeRoot = true;\n');
  tree.write('libs/studio-panels/src/index.ts', 'export const panelsRoot = true;\n');

  await generateStudioFeatureSlice(tree, {
    name: 'agent-proof-marker',
    visualId: 'studio-agent-proof-marker',
  });

  const domainPath =
    'libs/studio-domain/src/scaffolded/agent-proof-marker/agent-proof-marker.read-model.ts';
  const storePath =
    'libs/studio-store/src/scaffolded/agent-proof-marker/agent-proof-marker.store-hook.ts';
  const panelPath =
    'libs/studio-panels/src/scaffolded/agent-proof-marker/agent-proof-marker.component.ts';
  const testPath = 'test/scaffolded/agent-proof-marker/agent-proof-marker.test.ts';

  assert.equal(tree.exists(domainPath), true);
  assert.equal(tree.exists(storePath), true);
  assert.equal(tree.exists(panelPath), true);
  assert.equal(tree.exists(testPath), true);
  assert.match(tree.read(domainPath, 'utf8') ?? '', /buildAgentProofMarkerReadModel/);
  assert.match(tree.read(storePath, 'utf8') ?? '', /createAgentProofMarkerStoreHook/);
  assert.match(tree.read(panelPath, 'utf8') ?? '', /studio-agent-proof-marker/);
  assert.match(
    tree.read('libs/studio-domain/src/index.ts', 'utf8') ?? '',
    /scaffolded\/agent-proof-marker\/agent-proof-marker\.read-model/,
  );
  assert.match(
    tree.read('libs/studio-store/src/index.ts', 'utf8') ?? '',
    /scaffolded\/agent-proof-marker\/agent-proof-marker\.store-hook/,
  );
});

test('studio feature-slice generator readout template keeps agent proof secondary', async () => {
  const tree = createTreeWithEmptyWorkspace();
  tree.write('libs/studio-domain/src/index.ts', '');
  tree.write('libs/studio-store/src/index.ts', '');

  await generateStudioFeatureSlice(tree, {
    name: 'compact-readout-check',
    includePanel: false,
  });

  const domain = tree.read(
    'libs/studio-domain/src/scaffolded/compact-readout-check/compact-readout-check.read-model.ts',
    'utf8',
  );
  const store = tree.read(
    'libs/studio-store/src/scaffolded/compact-readout-check/compact-readout-check.store-hook.ts',
    'utf8',
  );

  assert.equal(
    tree.exists(
      'libs/studio-panels/src/scaffolded/compact-readout-check/compact-readout-check.component.ts',
    ),
    false,
  );
  assert.match(domain ?? '', /StudioCompactAgentReadout/);
  assert.match(domain ?? '', /not_proof_harness/);
  assert.match(domain ?? '', /compactReadoutVersion/);
  assert.match(store ?? '', /compactReadout: Signal<StudioCompactAgentReadout>/);
  assert.match(store ?? '', /readoutContribution/);
});

test('studio workspace generator package ships schemas and template assets', () => {
  const projectJson = readFileSync(
    join(repoRoot, 'libs', 'studio-workspace-generators', 'project.json'),
    'utf8',
  );
  const generatorsJson = readFileSync(
    join(repoRoot, 'libs', 'studio-workspace-generators', 'generators.json'),
    'utf8',
  );

  assert.equal(generatorsJson.includes('studio-feature-slice'), true);
  assert.equal(generatorsJson.includes('studio-panel'), true);
  assert.equal(projectJson.includes('src/generators/**/*.json'), true);
  assert.equal(projectJson.includes('src/generators/**/*.template'), true);
});
