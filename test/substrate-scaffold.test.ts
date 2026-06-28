import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  addReferenceRenderableReadModel,
  applySelectedEntityReadModel,
  buildAssetBrowserCategories,
  buildInitialWorkspaceReadModel,
  buildStudioViewportHitReadModel,
  buildStudioPreferencesReadModel,
  buildStudioCompatibilityEvidence,
  buildStudioViewportAdapterReadModel,
  buildStudioViewportCameraReadModel,
  buildStudioViewportToolReadModel,
  clearStudioWorkspaceReadModel,
  computeEntityListHash,
  createStudioAgentReadout,
  createSelectEntityIntent,
  frameStudioViewportCamera,
  frameStudioViewportCameraOnRenderable,
  filterAssetBrowserRenderables,
  loadScenarioReadModel,
  orbitStudioViewportCamera,
  panStudioViewportCamera,
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

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('selection intent maps through the public command identity before read model update', () => {
  const initialReadModel = buildInitialWorkspaceReadModel();
  const intent = createSelectEntityIntent(initialReadModel, 'model-preview-crate');
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

  assert.equal(updatedReadModel.selectedEntityId, 'model-preview-crate');
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
  const loaded = loadScenarioReadModel(readModel, 'scenario-placeholder');

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
  const updated = addReferenceRenderableReadModel(readModel);

  assert.equal(updated.scene.renderables.length, readModel.scene.renderables.length + 1);
  assert.equal(updated.scene.selectedRenderableId, 'reference-placeholder-1');
  assert.equal(updated.selectedEntityId, 'reference-placeholder-1');
  assert.equal(updated.timeline.at(-1)?.commandId, 'scene.load_asset');
  assert.equal(updated.commandResults.at(-1)?.changedScene, true);
  assert.equal(updated.entities.some(entity => entity.id === 'reference-placeholder-1'), true);
});

test('hierarchy expansion can be updated without changing scene state', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const collapsed = setHierarchyExpansionReadModel(readModel, false);

  assert.equal(collapsed.scene.sceneHash, readModel.scene.sceneHash);
  assert.equal(collapsed.timelineSequence, readModel.timelineSequence);
  assert.equal(collapsed.entities.every(entity => !entity.expanded), true);
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
  assert.equal(restored.artifact?.flatSceneDocument.nodes.length, 0);
  assert.equal(restored.artifact?.serializationNotes.some(note => note.includes('runtime')), true);
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

  assert.deepEqual(
    validateSelectionCommandSync({
      commandPresent: true,
      commandEntityId: 'selected-voxel:0,0,0',
      commandSelected: true,
      viewportSelectedRenderableId: readModel.scene.selectedRenderableId,
      selectableEntityIds: selectableIds,
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
  assert.equal(fixture.entities.some(entity => entity.id === 'selected-voxel:0,0,0'), true);
  assert.equal(fixture.entityListHash, computeEntityListHash(readModel.entities));
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
