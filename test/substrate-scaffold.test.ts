import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { COMMAND_IDS } from '@asha/command-registry';
import { buildDevtoolsProtocolGoldenFixtures, createDevtoolsFixtureEndpoint } from '@asha/devtools';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  addReferenceRenderableReadModel,
  attachStudioGameWorkspaceDevtools,
  applySelectedEntityReadModel,
  buildStudioGameWorkspaceHandshakeRequest,
  buildAssetBrowserCategories,
  buildInitialWorkspaceReadModel,
  buildStudioGameWorkspaceReadout,
  buildStudioCommandProposalPanel,
  buildStudioGameWorkspaceCommandProposalReadModel,
  buildStudioProofSceneList,
  buildStudioRuntimeSessionList,
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
  createLoadReferenceAssetIntent,
  createLoadScenarioIntent,
  applySceneObjectCommandReadModel,
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
  loadScenarioReadModel,
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
  updateStudioRenderSetting,
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

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = join(repoRoot, '../asha-demo');

function loadDemoPackageScripts(): Record<string, string> {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).scripts;
}

function loadDemoPackageName(): string {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).name;
}

test('selection intent maps through the public command identity before read model update', () => {
  const initialReadModel = buildInitialWorkspaceReadModel();
  const modelEntity = initialReadModel.entities.find(
    entity => entity.renderableId === 'model-preview-crate',
  );

  assert.ok(modelEntity);
  const intent = createSelectEntityIntent(initialReadModel, modelEntity.id);
  const dispatchResult = mapStudioIntentToCommand(intent);

  assert.equal(dispatchResult.accepted, true);
  assert.equal(dispatchResult.proposal?.commandId, 'selection.set_active_entity');
  assert.equal(initialReadModel.session.sessionId, 'session-preview-0001');
  assert.equal(initialReadModel.scene.renderables.length, 4);
  assert.equal(initialReadModel.timeline.length, initialReadModel.commandResults.length);

  const updatedReadModel = applySelectedEntityReadModel(
    initialReadModel,
    dispatchResult.proposal?.entityId ?? '',
  );

  assert.equal(updatedReadModel.selectedEntityId, modelEntity.id);
  assert.equal(updatedReadModel.scene.selectedRenderableId, 'model-preview-crate');
  assert.equal(updatedReadModel.timelineSequence, 5);
  assert.equal(updatedReadModel.timeline.at(-1)?.commandId, 'selection.set_active_entity');
});

test('viewport adapter marks the shared selected renderable without owning state', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const adapter = buildStudioViewportAdapterReadModel({
    scene: readModel.scene,
    camera: buildStudioViewportCameraReadModel(),
    tool: buildStudioViewportToolReadModel(),
  });
  const selectedRenderable = adapter.renderables.find(renderable => renderable.selected);

  assert.equal(adapter.adapterVersion, 'studio-viewport-adapter.v0');
  assert.equal(adapter.renderables.length, readModel.scene.renderables.length);
  assert.equal(selectedRenderable?.renderableId, 'selected-voxel:0,0,0');
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
  const readModel = buildInitialWorkspaceReadModel();
  const initialCamera = buildStudioViewportCameraReadModel();
  const orbited = orbitStudioViewportCamera(initialCamera, { deltaX: 24, deltaY: -12 });
  const panned = panStudioViewportCamera(orbited, { deltaX: 16, deltaY: 8 });
  const zoomed = zoomStudioViewportCamera(panned, -120);
  const framed = frameStudioViewportCamera(readModel.scene);

  assert.notEqual(orbited.cameraHash, initialCamera.cameraHash);
  assert.notEqual(panned.cameraHash, orbited.cameraHash);
  assert.notEqual(zoomed.cameraHash, panned.cameraHash);
  assert.match(framed.cameraHash, /^viewport-camera-/);
  assert.equal(framed.target.x, 1.5);
  assert.equal(framed.target.y, 1.5);
});

test('selected viewport framing targets the selected renderable bounds', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const framed = frameStudioViewportCameraOnRenderable(readModel.scene, 'selected-voxel:0,0,0');

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
  const readModel = buildInitialWorkspaceReadModel();
  const renderable = readModel.scene.renderables.find(
    item => item.renderableId === 'selected-voxel:0,0,0',
  );

  assert.ok(renderable);
  const hit = buildStudioViewportHitReadModel({
    renderable,
    face: 'z_max',
    worldPosition: { x: 0.25, y: 0.75, z: 0.99 },
  });

  assert.equal(hit.renderableId, 'selected-voxel:0,0,0');
  assert.equal(hit.face, 'z_max');
  assert.deepEqual(hit.voxelCoord, { x: 0, y: 0, z: 0 });
  assert.match(hit.hitHash, /^viewport-hit-/);
});

test('viewport hit read model leaves non-voxel assets without voxel coordinates', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const renderable = readModel.scene.renderables.find(
    item => item.renderableId === 'model-preview-crate',
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
  assert.equal(cleared.scenarios.find(scenario => scenario.scenarioId === 'voxel-basic')?.label, 'Basic Voxel Scenario');
});

test('scenario load projects selected scenario scene through the timeline', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const dispatchResult = mapStudioIntentToCommand(
    createLoadScenarioIntent(readModel, 'scenario-placeholder'),
  );

  assert.equal(dispatchResult.accepted, true);
  assert.equal(dispatchResult.proposal?.commandId, 'session.load_scenario');
  const loaded = loadScenarioReadModel(readModel, dispatchResult.proposal?.scenarioId ?? '');

  assert.equal(loaded.ok, true);
  assert.equal(loaded.workspace.session.scenarioId, 'scenario-placeholder');
  assert.equal(loaded.workspace.session.scenarioLabel, 'Placeholder Scenario');
  assert.equal(loaded.workspace.scene.sceneId, 'scene-view:scenario-placeholder:v1');
  assert.equal(loaded.workspace.scene.renderables.length, 3);
  assert.equal(loaded.workspace.scene.selectedRenderableId, 'placeholder-ground-grid');
  assert.equal(loaded.workspace.timeline.at(-1)?.commandId, 'session.load_scenario');
  assert.equal(
    loaded.workspace.scenarios.find(scenario => scenario.scenarioId === 'scenario-placeholder')?.status,
    'loaded',
  );
});

test('scenario load fails closed for unknown scenario ids', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const loaded = loadScenarioReadModel(readModel, 'scenario-missing');

  assert.equal(loaded.ok, false);
  assert.equal(loaded.workspace, readModel);
  assert.equal(loaded.diagnostics.at(0)?.code, 'scenario_load_unknown');
});

test('game workspace loader opens the asha-demo manifest without path guessing', () => {
  const result = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('asha-demo workspace should load');
  assert.equal(result.workspace.workspaceVersion, 'studio-game-workspace.v0');
  assert.equal(result.workspace.gameId, 'asha-demo');
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
  assert.match(result.workspace.workspaceHash, /^studio-game-workspace-/);

  const readout = buildStudioGameWorkspaceReadout(result.workspace);
  assert.equal(readout.readoutVersion, 'studio-game-workspace-readout.v0');
  assert.deepEqual(readout.commandIds, {
    openWorkspace: 'workspace.open_game_manifest',
    validateManifest: 'workspace.validate_game_manifest',
  });
  assert.equal(readout.gameId, 'asha-demo');
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
    localRoots: ['assets', 'packages/game-catalogs'],
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const handshake = buildStudioGameWorkspaceHandshakeRequest(result.workspace);
  assert.equal(handshake.type, 'handshake.request');
  assert.equal(handshake.clientName, 'asha-studio');
  assert.equal(handshake.requestedWorkspaceId, 'asha-demo');
  assert.equal(handshake.protocolVersion, result.workspace.manifest.asha.devtoolsProtocolVersion);

  const attached = await attachStudioGameWorkspaceDevtools(
    result.workspace,
    createDevtoolsFixtureEndpoint(),
  );

  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error('devtools attach should succeed');
  assert.equal(attached.attach.attachVersion, 'studio-game-workspace-attach.v0');
  assert.equal(attached.attach.status, 'attached');
  assert.equal(attached.attach.endpoint, 'ws://127.0.0.1:7391');
  assert.equal(attached.attach.runtime.gameId, 'asha-demo');
  assert.equal(attached.attach.runtime.workspaceId, 'asha-demo');
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const attached = await attachStudioGameWorkspaceDevtools(
    result.workspace,
    createDevtoolsFixtureEndpoint({ forceProtocolVersion: 'devtools-protocol.v999' }),
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const transport = createDevtoolsFixtureEndpoint();
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
  assert.equal(live.live.projection.worldHash, 'world:demo:1');
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const transport = createDevtoolsFixtureEndpoint();
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
  assert.equal(activeSession.projection?.worldHash, 'world:demo:1');
  assert.equal(activeSession.evidenceRefs.some(ref => ref.kind === 'runtime-attach'), true);
  assert.equal(activeSession.evidenceRefs.some(ref => ref.kind === 'runtime-live'), true);
  assert.equal(activeSession.nonClaims.includes('not_native_runtime_authority'), true);
  assert.equal(activeSession.nonClaims.includes('not_wasm_authority'), true);
  assert.match(activeSession.sessionHash, /^studio-runtime-session-/);
  assert.match(sessions.sessionListHash, /^studio-runtime-session-list-/);
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const transport = createDevtoolsFixtureEndpoint();
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const fixture = createDevtoolsFixtureEndpoint();
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const transport = createDevtoolsFixtureEndpoint();
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const transport = createDevtoolsFixtureEndpoint({ commandProposalSupported: false });
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const command = buildDevtoolsProtocolGoldenFixtures().commandProposal;
  const attached = await attachStudioGameWorkspaceDevtools(result.workspace, createDevtoolsFixtureEndpoint());
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
    createDevtoolsFixtureEndpoint(),
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
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
  if (!result.ok) throw new Error('asha-demo workspace should load');
  const transport = createDevtoolsFixtureEndpoint();
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
  assert.equal(artifact.workspace.gameId, 'asha-demo');
  assert.equal(artifact.generatedFrom.workspaceHash, result.workspace.workspaceHash);
  assert.equal(artifact.generatedFrom.attachHash, attached.attach.attachHash);
  assert.equal(artifact.generatedFrom.liveHash, live.live.liveHash);
  assert.deepEqual(artifact.generatedFrom.commandProposalHashes, [proposal.proposal.proposalHash]);
  assert.equal(artifact.attach.runtime.gameId, 'asha-demo');
  assert.equal(artifact.live?.projection.worldHash, 'world:demo:1');
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

test('hierarchy add action projects a reference renderable through scene.load_asset', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const dispatchResult = mapStudioIntentToCommand(createLoadReferenceAssetIntent(readModel));

  assert.equal(dispatchResult.accepted, true);
  assert.equal(dispatchResult.proposal?.commandId, 'scene.load_asset');
  assert.equal(dispatchResult.proposal?.assetId, 'static-mesh:reference-placeholder');
  const updated = addReferenceRenderableReadModel(readModel);

  assert.equal(updated.scene.renderables.length, readModel.scene.renderables.length + 1);
  assert.equal(updated.scene.selectedRenderableId, 'reference-placeholder-1');
  assert.equal(
    updated.entities.find(entity => entity.id === updated.selectedEntityId)?.renderableId,
    'reference-placeholder-1',
  );
  assert.equal(updated.timeline.at(-1)?.commandId, 'scene.load_asset');
  assert.equal(updated.commandResults.at(-1)?.changedScene, true);
  assert.equal(updated.entities.some(entity => entity.renderableId === 'reference-placeholder-1'), true);
});

test('hierarchy expansion can be updated without changing scene state', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const collapsed = setHierarchyExpansionReadModel(readModel, false);

  assert.equal(collapsed.scene.sceneHash, readModel.scene.sceneHash);
  assert.equal(collapsed.timelineSequence, readModel.timelineSequence);
  assert.equal(collapsed.entities.every(entity => !entity.expanded), true);
});

test('scene hierarchy projects canonical scene objects distinct from renderables', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const selectedEntity = readModel.entities.find(entity => entity.id === readModel.selectedEntityId);

  assert.equal(readModel.flatSceneDocument.nodes.at(0)?.label, 'Scene Root');
  assert.equal(readModel.sceneObjectSnapshot.snapshotVersion, 'scene-object-snapshot.v0');
  assert.equal(readModel.sceneObjectSnapshot.objects.length, readModel.scene.renderables.length + 1);
  assert.equal(selectedEntity?.id.startsWith('scene-node:'), true);
  assert.equal(selectedEntity?.renderableId, 'selected-voxel:0,0,0');
  assert.equal(
    readModel.sceneObjectSnapshot.objects.some(
      object => object.objectId === selectedEntity?.sceneObjectId,
    ),
    true,
  );
  assert.ok(readModel.sceneObjectSnapshot.nonClaims.includes('not_authority_validation'));
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
  const readModel = buildInitialWorkspaceReadModel();
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
  const readModel = buildInitialWorkspaceReadModel();
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
  const readModel = buildInitialWorkspaceReadModel();
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
  const readModel = buildInitialWorkspaceReadModel();
  const categories = buildAssetBrowserCategories(readModel.scene.renderables);

  assert.equal(categories.find(category => category.category === 'all')?.count, 4);
  assert.equal(categories.find(category => category.category === 'static_meshes')?.count, 1);
  assert.equal(categories.find(category => category.category === 'materials')?.count, 4);
  assert.equal(categories.find(category => category.category === 'generated')?.count, 3);
  assert.deepEqual(
    filterAssetBrowserRenderables(readModel.scene.renderables, 'preview').map(
      renderable => renderable.renderableId,
    ),
    ['preview-ghost:1,0,0'],
  );
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

test('proof scene read model ties named scenes to catalog ids and evidence status', () => {
  const workspaceResult = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(workspaceResult.ok, true);
  if (!workspaceResult.ok) throw new Error('workspace should load');
  const inventoryResult = loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: { path: 'asha.game.toml', hash: 'sha256:manifest' },
    catalog: { path: 'packages/game-catalogs/catalog.json', hash: 'sha256:catalog' },
    diagnostics: [],
    dependencyOrder: ['texture.demo-checker', 'material.demo-copper', 'mesh.demo-cube'],
    entries: ['mesh.demo-cube', 'material.demo-copper', 'texture.demo-checker'].map(assetId => ({
      assetId,
      kind: assetId.startsWith('mesh') ? 'static_mesh' : assetId.startsWith('material') ? 'material' : 'texture',
      sourcePath: `assets/${assetId}.json`,
      dependencies: [],
      devResolution: {
        sourceHash: `sha256:${assetId}`,
        devCacheKey: `dev-cache/${assetId}`,
        generatedArtifactVersion: 'asset-import.v1',
        importStatus: 'clean',
        publishOutputKey: `${assetId}.json`,
      },
      publishResolution: {
        outputKey: `${assetId}.json`,
        packedPath: `harness/out/publish/resources/${assetId}.json`,
        packedHash: `sha256:packed-${assetId}`,
        packedBytes: 1,
      },
      diagnostics: [],
      evidenceRefs: [],
    })),
  });
  assert.equal(inventoryResult.ok, true);
  if (!inventoryResult.ok) throw new Error('inventory should load');

  const proofScenes = buildStudioProofSceneList({
    workspace: workspaceResult.workspace,
    assetInventory: inventoryResult.inventory,
    scenes: [
      {
        path: 'scenes/material-proof.scene.json',
        schemaVersion: 1,
        sceneId: 1002,
        name: 'ASHA Demo Material Proof',
        description: 'Proof scene that references mesh, material, and texture catalog assets together.',
        catalogAssetIds: ['mesh.demo-cube', 'material.demo-copper', 'texture.demo-checker'],
        runtimeFixture: 'harness/conformance/fixtures/minimal-world.json',
      },
    ],
    evidence: {
      proofSceneCommandStatus: 'passed',
      proofSceneCommand: '/usr/bin/node scripts/check-proof-scenes.mjs',
      assetInventoryArtifactPath: 'harness/out/asset-inventory/latest/index.json',
      assetInventoryArtifactHash: 'sha256:inventory',
    },
  });

  assert.equal(proofScenes.ok, true);
  if (!proofScenes.ok) throw new Error('proof scenes should load');
  assert.equal(proofScenes.proofScenes.scenes.at(0)?.name, 'ASHA Demo Material Proof');
  assert.deepEqual(proofScenes.proofScenes.scenes.at(0)?.catalogAssetIds, [
    'mesh.demo-cube',
    'material.demo-copper',
    'texture.demo-checker',
  ]);
  assert.equal(proofScenes.proofScenes.scenes.at(0)?.catalogStatus, 'resolved');
  assert.equal(proofScenes.proofScenes.scenes.at(0)?.evidenceStatus, 'passed');
  assert.match(proofScenes.proofScenes.proofSceneListHash, /^studio-proof-scene-list-/);
});

test('proof scene read model fails closed on missing catalog references', () => {
  const workspaceResult = loadStudioGameWorkspaceManifest({
    workspaceRoot: demoRoot,
    manifestPath: 'asha.game.toml',
    gameId: loadDemoPackageName(),
    manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
    packageScripts: loadDemoPackageScripts(),
    pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
  });
  assert.equal(workspaceResult.ok, true);
  if (!workspaceResult.ok) throw new Error('workspace should load');
  const inventoryResult = loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: { path: 'asha.game.toml', hash: 'sha256:manifest' },
    catalog: { path: 'packages/game-catalogs/catalog.json', hash: 'sha256:catalog' },
    diagnostics: [],
    dependencyOrder: ['mesh.demo-cube'],
    entries: [
      {
        assetId: 'mesh.demo-cube',
        kind: 'static_mesh',
        sourcePath: 'assets/meshes/demo-cube.mesh.json',
        dependencies: [],
        devResolution: {
          sourceHash: 'sha256:mesh',
          devCacheKey: 'dev-cache/static_mesh/mesh.demo-cube',
          generatedArtifactVersion: 'asset-import.v1',
          importStatus: 'clean',
          publishOutputKey: 'meshes/demo-cube.mesh.json',
        },
        publishResolution: {
          outputKey: 'meshes/demo-cube.mesh.json',
          packedPath: 'harness/out/publish/resources/meshes/demo-cube.mesh.json',
          packedHash: 'sha256:packed',
          packedBytes: 1,
        },
        diagnostics: [],
        evidenceRefs: [],
      },
    ],
  });
  assert.equal(inventoryResult.ok, true);
  if (!inventoryResult.ok) throw new Error('inventory should load');

  const proofScenes = buildStudioProofSceneList({
    workspace: workspaceResult.workspace,
    assetInventory: inventoryResult.inventory,
    scenes: [
      {
        path: 'scenes/broken.scene.json',
        schemaVersion: 1,
        sceneId: 'broken',
        name: 'Broken Proof',
        catalogAssetIds: ['mesh.demo-cube', 'material.missing'],
        runtimeFixture: 'harness/conformance/fixtures/minimal-world.json',
      },
    ],
    evidence: { proofSceneCommandStatus: 'passed' },
  });

  assert.equal(proofScenes.ok, false);
  assert.equal(proofScenes.proofScenes.scenes.at(0)?.catalogStatus, 'missing');
  assert.deepEqual(proofScenes.proofScenes.scenes.at(0)?.missingCatalogAssetIds, ['material.missing']);
  assert.equal(proofScenes.diagnostics.at(0)?.code, 'proof_scene_missing_catalog_reference');
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
  if (!workspaceResult.ok) throw new Error('asha-demo workspace should load');
  const evidencePath = 'harness/out/publish-evidence/latest/index.json';
  const evidence = JSON.parse(readFileSync(join(demoRoot, evidencePath), 'utf8')) as unknown;

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
  if (!workspaceResult.ok) throw new Error('asha-demo workspace should load');
  const evidencePath = 'harness/out/publish-evidence/latest/index.json';
  const staleEvidence = JSON.parse(readFileSync(join(demoRoot, evidencePath), 'utf8')) as {
    publishArtifact: { artifactVersion: string };
  };
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
  if (!workspaceResult.ok) throw new Error('asha-demo workspace should load');
  const inventory = loadStudioAssetInventory(
    JSON.parse(readFileSync(join(demoRoot, 'harness/out/asset-inventory/latest/index.json'), 'utf8')),
  );
  assert.equal(inventory.ok, true);
  if (!inventory.ok) throw new Error('inventory should load');
  const proofScenes = buildStudioProofSceneList({
    workspace: workspaceResult.workspace,
    assetInventory: inventory.inventory,
    scenes: [
      {
        path: 'scenes/material-proof.scene.json',
        schemaVersion: 1,
        sceneId: 1002,
        name: 'ASHA Demo Material Proof',
        catalogAssetIds: ['mesh.demo-cube', 'material.demo-copper', 'texture.demo-checker'],
        runtimeFixture: 'harness/conformance/fixtures/minimal-world.json',
      },
    ],
    evidence: { proofSceneCommandStatus: 'passed' },
  });
  assert.equal(proofScenes.ok, true);
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
    JSON.parse(readFileSync(join(demoRoot, 'harness/out/publish-evidence/latest/index.json'), 'utf8')),
    {
      workspace: workspaceResult.workspace,
      evidencePath: 'harness/out/publish-evidence/latest/index.json',
    },
  );
  assert.equal(publishEvidence.ok, true);

  const markers = [
    'studio-game-workspace-overview',
    'studio-assets-panel',
    'studio-proof-scene-panel',
    'studio-runtime-session-panel',
    'studio-command-proposal-panel',
    'studio-publish-evidence-panel',
  ];
  const artifact = exportStudioWorkspaceCockpitEvidence({
    studioWorkspace: buildInitialWorkspaceReadModel(),
    gameWorkspace: workspaceResult.workspace,
    assetInventory: inventory.inventory,
    proofScenes: proofScenes.proofScenes,
    runtimeSessions,
    commandProposalPanel: commandPanel,
    publishEvidence: publishEvidence.publishEvidence,
    visiblePanelMarkers: markers,
  });
  const missingMarker = exportStudioWorkspaceCockpitEvidence({
    studioWorkspace: buildInitialWorkspaceReadModel(),
    gameWorkspace: workspaceResult.workspace,
    assetInventory: inventory.inventory,
    proofScenes: proofScenes.proofScenes,
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

test('asset browser categories include newly loaded reference placeholders', () => {
  const readModel = addReferenceRenderableReadModel(buildInitialWorkspaceReadModel());

  assert.equal(
    filterAssetBrowserRenderables(readModel.scene.renderables, 'static_meshes').some(
      renderable => renderable.renderableId === 'reference-placeholder-1',
    ),
    true,
  );
  assert.equal(buildAssetBrowserCategories(readModel.scene.renderables).at(0)?.count, 5);
});

test('workspace artifact serializes and restores Studio read models', () => {
  const workspace = clearStudioWorkspaceReadModel(buildInitialWorkspaceReadModel());
  const preferences = updateStudioRenderSetting(
    buildStudioPreferencesReadModel(),
    'showGrid',
    false,
  );
  const text = serializeStudioWorkspaceArtifact({
    workspace,
    viewportCamera: buildStudioViewportCameraReadModel(),
    viewportTool: buildStudioViewportToolReadModel('pan'),
    preferences,
    savedAtIso: '2026-06-27T00:00:00.000Z',
  });
  const restored = restoreStudioWorkspaceArtifact(text);

  assert.equal(restored.ok, true);
  assert.equal(restored.artifact?.workspace.scene.renderables.length, 0);
  assert.equal(restored.artifact?.viewportTool.activeTool, 'pan');
  assert.equal(restored.artifact?.preferences.render.showGrid, false);
  assert.equal(restored.artifact?.flatSceneDocument.nodes.length, 1);
  assert.equal(restored.artifact?.serializationNotes.some(note => note.includes('runtime')), true);
});

test('workspace persistence and render preferences are timeline-observable UI commands', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const saved = recordStudioWorkspaceUiCommand(readModel, {
    commandId: 'workspace.save_browser_slot',
    label: 'Save Workspace Slot',
    inputSummary: `sceneHash=${readModel.scene.sceneHash}`,
    outputSummary: 'Workspace artifact saved to browser slot.',
  }).workspace;
  const preference = recordStudioWorkspaceUiCommand(saved, {
    commandId: 'preferences.set_render_setting',
    label: 'Set Render Preference',
    inputSummary: 'showGrid=false',
    outputSummary: 'Render setting showGrid updated.',
  }).workspace;
  const rejectedLoad = recordStudioWorkspaceUiCommand(preference, {
    commandId: 'workspace.load_browser_slot',
    label: 'Load Workspace Slot',
    inputSummary: 'source=browser-slot',
    outputSummary: 'Saved Studio workspace artifact is not valid JSON.',
    status: 'rejected',
  }).workspace;

  assert.equal(saved.timeline.at(-1)?.commandId, 'workspace.save_browser_slot');
  assert.equal(preference.timeline.at(-1)?.commandId, 'preferences.set_render_setting');
  assert.equal(rejectedLoad.timeline.at(-1)?.status, 'rejected');
  assert.equal(rejectedLoad.scene.sceneHash, readModel.scene.sceneHash);
  assert.equal(rejectedLoad.timelineSequence, readModel.timelineSequence + 3);
});

test('studio UI state readout classifies non-authoritative affordance state', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const uiState = buildStudioUiStateReadModel({
    activeMenu: 'view',
    bottomPanelTab: 'assets',
    assetBrowserCategory: 'materials',
    entities: readModel.entities,
    selectedScenarioDraftId: 'scenario-placeholder',
    hierarchyFilter: 'scenario-placeholder',
    menuMessage: 'Assets filter selected.',
    savedWorkspaceAvailable: true,
  });

  assert.equal(uiState.artifactKind, 'studio_ui_state');
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
        '@asha/contracts': 'link:../asha/ts/packages/contracts',
        '@asha/command-registry': 'link:../asha/ts/packages/command-registry/src',
        '@asha/editor-tools': 'link:../asha/ts/packages/editor-tools',
      },
    },
  });

  assert.equal(evidence.commandRegistryVersion, 'missing');
  assert.equal(evidence.diagnostics.at(0)?.code, 'asha.compatibility.required_package_link_mismatch');
});

test('hierarchy projection validation detects drift, stale hashes, and missing selection', () => {
  const readModel = buildInitialWorkspaceReadModel();
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
  const readModel = buildInitialWorkspaceReadModel();
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
  assert.equal(fixture.entities.some(entity => entity.renderableId === 'selected-voxel:0,0,0'), true);
  assert.equal(fixture.entityListHash, computeEntityListHash(readModel.entities));
  assert.equal(fixture.viewport?.readoutVersion, 'studio-viewport-readout.v0');
  assert.equal(fixture.renderSettings?.renderSettingsHash.startsWith('render-settings-'), true);
  assert.equal(fixture.uiState?.artifactKind, 'studio_ui_state');
});

test('compact agent readout summarizes shared Studio state without proof harness sprawl', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const renderSettings = buildStudioPreferencesReadModel().render;
  const selectedRenderable = readModel.scene.renderables.find(
    renderable => renderable.renderableId === 'selected-voxel:0,0,0',
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
  assert.equal(readout.session.scenarioId, 'voxel-basic');
  assert.equal(readout.scene.selectedRenderableId, 'selected-voxel:0,0,0');
  assert.equal(readout.selectedEntity?.label, 'Voxel (0, 0, 0)');
  assert.equal(readout.latestViewportHit?.face, 'z_max');
  assert.equal(readout.viewport.tool.activeTool, 'orbit');
  assert.match(readout.viewport.cameraHash, /^viewport-camera-/);
  assert.equal(readout.uiState?.artifactKind, 'studio_ui_state');
  assert.equal(readout.latestCommand?.commandId, 'selection.set_active_entity');
  assert.equal(readout.latestCommandResult?.commandId, 'selection.set_active_entity');
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

test('viewport raycast debug draws temporary hit markers from view render setting', () => {
  const viewportSource = readFileSync(
    join(repoRoot, 'libs', 'studio-viewport', 'src', 'index.ts'),
    'utf8',
  );
  const shellSource = readFileSync(
    join(repoRoot, 'libs', 'studio-shell', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(shellSource.includes('showRaycastHitDebug'), true);
  assert.equal(viewportSource.includes('createRaycastDebugMarker'), true);
  assert.equal(viewportSource.includes('showRaycastHitDebug'), true);
  assert.equal(viewportSource.includes('10_000'), true);
  assert.equal(viewportSource.includes('raycastDebugGroup'), true);
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
  const browserSmokeSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-selected-backend-browser-smoke.ts'),
    'utf8',
  );
  const aggregateSource = readFileSync(
    join(repoRoot, 'scripts', 'proof-v2-live-backend-evidence.ts'),
    'utf8',
  );

  assert.equal(
    packageJson.scripts['proof:selected-backend-attach'],
    'tsx scripts/proof-selected-backend-attach.ts',
  );
  assert.equal(
    packageJson.scripts['proof:selected-backend-command'],
    'tsx scripts/proof-selected-backend-command.ts',
  );
  assert.equal(
    packageJson.scripts['proof:selected-backend-browser-smoke'],
    'tsx scripts/proof-selected-backend-browser-smoke.ts',
  );
  assert.equal(
    packageJson.scripts['proof:v2-live-backend-evidence'],
    'tsx scripts/proof-v2-live-backend-evidence.ts',
  );
  assert.equal(browserSmokeSource.includes('structured readout JSON is required'), true);
  assert.equal(browserSmokeSource.includes('marker_strings_without_json_readout_rejected'), true);
  assert.equal(aggregateSource.includes("artifactKind: 'studio_v2_live_backend_evidence'"), true);
  assert.equal(aggregateSource.includes('stale source artifact hash'), true);
  assert.equal(aggregateSource.includes('browser smoke must consume the current command proof'), true);
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
