import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  applySelectedEntityReadModel,
  buildInitialWorkspaceReadModel,
  buildStudioCompatibilityEvidence,
  computeEntityListHash,
  createStudioAgentReadout,
  createSelectEntityIntent,
  validateEntityProjection,
  validateSelectionCommandSync,
  type StudioAgentReadoutArtifact,
  type StudioPackageJsonLike,
} from '@asha-studio/domain';
import { projectViewportRenderables } from '@asha-studio/viewport';

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

test('viewport projection marks the shared selected renderable without owning state', () => {
  const readModel = buildInitialWorkspaceReadModel();
  const projections = projectViewportRenderables(readModel.scene);
  const selectedProjection = projections.find(projection => projection.selected);

  assert.equal(projections.length, readModel.scene.renderables.length);
  assert.equal(selectedProjection?.renderable.renderableId, 'selected-voxel:0,0,0');
  assert.equal(selectedProjection?.leftPercent, 26.666666666666664);
  assert.ok(projections.every(projection => projection.leftPercent >= 4));
  assert.ok(projections.every(projection => projection.topPercent <= 96));
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
