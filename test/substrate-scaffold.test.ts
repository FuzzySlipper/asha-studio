import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  addReferenceRenderableReadModel,
  applySelectedEntityReadModel,
  buildAssetBrowserCategories,
  buildInitialWorkspaceReadModel,
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
  createSceneObjectCommandIntent,
  createSelectEntityIntent,
  frameStudioViewportCamera,
  frameStudioViewportCameraOnRenderable,
  filterAssetBrowserRenderables,
  loadScenarioReadModel,
  orbitStudioViewportCamera,
  panStudioViewportCamera,
  recordStudioWorkspaceUiCommand,
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
  assert.match(adapter.renderSettings.renderSettingsHash, /^render-settings-/);
  assert.match(adapter.readbackHash, /^viewport-readback-/);
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
    menuMessage: 'Assets filter selected.',
    savedWorkspaceAvailable: true,
  });

  assert.equal(uiState.artifactKind, 'studio_ui_state');
  assert.equal(uiState.activeMenu, 'view');
  assert.equal(uiState.bottomPanelTab, 'assets');
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
