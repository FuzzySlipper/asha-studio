import assert from 'node:assert/strict';
import test from 'node:test';
import { sceneId, sceneNodeId, type FlatSceneDocument } from '@asha/contracts';
import {
  applyCanonicalSceneDocumentReadModel,
  applySelectedEntityReadModel,
  applySceneObjectCommandReadModel,
  buildInitialWorkspaceReadModel,
  buildStudioViewportAdapterReadModel,
  createRotateSceneObjectRequest,
  createTranslateSceneObjectRequest,
  validateSelectionCommandSync,
} from '@asha-studio/domain';
import { projectStudioAuthoredRenderableTransform } from '../libs/studio-viewport/src/authored-scene-projection.js';

const SQRT_HALF = Math.SQRT1_2;

function asymmetricParentChildScene(): FlatSceneDocument {
  return {
    schemaVersion: 2,
    id: sceneId(5880),
    metadata: { name: 'Asymmetric parent-child projection', authoringFormatVersion: 2 },
    dependencies: [{ id: 'mesh.child', version: { req: 'any' }, hash: null }],
    nodes: [
      {
        id: sceneNodeId(1),
        parent: null,
        childOrder: 0,
        label: 'Root',
        tags: [],
        transform: {
          translation: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
        kind: { kind: 'emptyGroup' },
      },
      {
        id: sceneNodeId(2),
        parent: sceneNodeId(1),
        childOrder: 0,
        label: 'Rotated asymmetric parent',
        tags: [],
        transform: {
          translation: [10, 0, 0],
          rotation: [0, SQRT_HALF, 0, SQRT_HALF],
          scale: [2, 1, 1],
        },
        kind: { kind: 'emptyGroup' },
      },
      {
        id: sceneNodeId(3),
        parent: sceneNodeId(2),
        childOrder: 0,
        label: 'Visible child',
        tags: [],
        transform: {
          translation: [1, 2, 3],
          rotation: [SQRT_HALF, 0, 0, SQRT_HALF],
          scale: [1, 2, 3],
        },
        kind: {
          kind: 'staticMesh',
          asset: { id: 'mesh.child', version: { req: 'any' }, hash: null },
        },
      },
    ],
  };
}

function canonicalEntityInstanceScene(): FlatSceneDocument {
  const identity = {
    translation: [0, 0, 0] as const,
    rotation: [0, 0, 0, 1] as const,
    scale: [1, 1, 1] as const,
  };
  return {
    schemaVersion: 3,
    id: sceneId(5904),
    metadata: { name: 'Generated tunnel room', authoringFormatVersion: 3 },
    dependencies: [],
    nodes: [
      {
        id: sceneNodeId(1),
        parent: null,
        childOrder: 0,
        label: 'Runtime Inputs',
        tags: [],
        transform: identity,
        kind: {
          kind: 'bootstrap',
          bindings: {
            generator: { providerId: 'asha.generated-tunnel', presetId: 'tiny-enclosed', seed: 17 },
            catalogs: [
              { bindingId: 'materials', catalogId: 'asha.demo.materials.v1', sourcePath: 'catalogs/materials.json' },
              { bindingId: 'spawns', catalogId: 'asha.demo.spawns.v1', sourcePath: 'catalogs/spawns.json' },
            ],
          },
        },
      },
      {
        id: sceneNodeId(10),
        parent: null,
        childOrder: 1,
        label: 'Actors',
        tags: [],
        transform: { ...identity, translation: [10, 0, 0] },
        kind: { kind: 'emptyGroup' },
      },
      {
        id: sceneNodeId(101),
        parent: sceneNodeId(10),
        childOrder: 0,
        label: 'Player Start',
        tags: [],
        transform: { ...identity, translation: [1, 1.62, 2] },
        kind: {
          kind: 'entityInstance',
          instance: {
            instanceId: 'player.start',
            reference: { kind: 'entityDefinition', stableId: 'actor/demo-player' },
            spawnMarkerId: 'spawn.player.start',
          },
        },
      },
      {
        id: sceneNodeId(202),
        parent: sceneNodeId(10),
        childOrder: 1,
        label: 'Tunnel Enemy',
        tags: [],
        transform: { ...identity, translation: [4, 1.2, -6] },
        kind: {
          kind: 'entityInstance',
          instance: {
            instanceId: 'enemy.primary',
            reference: { kind: 'entityDefinition', stableId: 'actor/generated-tunnel-enemy' },
            spawnMarkerId: 'spawn.enemy.primary',
          },
        },
      },
    ],
  };
}

function assertTupleClose(
  actual: readonly number[],
  expected: readonly number[],
): void {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => {
    assert.ok(Math.abs(value - (expected[index] ?? Number.NaN)) < 1e-9);
  });
}

test('authored parent rotation and scale survive editing, serialization, and visible projection', () => {
  const initial = applyCanonicalSceneDocumentReadModel(
    buildInitialWorkspaceReadModel(),
    asymmetricParentChildScene(),
    '/tmp/asymmetric.scene.json',
  );
  const initialRenderable = initial.scene.renderables.find(item => item.sceneNodeId === sceneNodeId(3));
  assert.ok(initialRenderable);
  assert.equal(initialRenderable.parentSceneNodeId, sceneNodeId(2));
  assertTupleClose(initialRenderable.localTransform.translation, [1, 2, 3]);
  assertTupleClose(initialRenderable.parentWorldTransform?.translation ?? [], [10, 0, 0]);
  assertTupleClose(initialRenderable.worldTransform.translation, [13, 2, -2]);
  assertTupleClose(
    projectStudioAuthoredRenderableTransform(
      buildStudioViewportAdapterReadModel({ scene: initial.scene }).renderables[0]!,
    ).translation,
    [13, 2, -2],
  );

  const childEntity = initial.entities.find(entity => entity.label === 'Visible child');
  assert.ok(childEntity?.sceneObjectId);
  const edited = applySceneObjectCommandReadModel(
    initial,
    createTranslateSceneObjectRequest(initial, childEntity.sceneObjectId, [1, 0, 0]),
  );
  assert.equal(edited.ok, true);
  const editedRenderable = edited.workspace.scene.renderables[0]!;
  assertTupleClose(editedRenderable.localTransform.translation, [2, 2, 3]);
  assertTupleClose(editedRenderable.worldTransform.translation, [13, 2, -4]);
  assertTupleClose([
    (editedRenderable.bounds.min.x + editedRenderable.bounds.max.x) / 2,
    (editedRenderable.bounds.min.y + editedRenderable.bounds.max.y) / 2,
    (editedRenderable.bounds.min.z + editedRenderable.bounds.max.z) / 2,
  ], editedRenderable.worldTransform.translation);

  const parentEntity = edited.workspace.entities.find(entity => entity.label === 'Rotated asymmetric parent');
  assert.ok(parentEntity?.sceneObjectId);
  const parentEdited = applySceneObjectCommandReadModel(
    edited.workspace,
    createRotateSceneObjectRequest(
      edited.workspace,
      parentEntity.sceneObjectId,
      [0, 0, 0, 1],
    ),
  );
  assert.equal(parentEdited.ok, true);
  const descendantAfterParentEdit = parentEdited.workspace.scene.renderables[0]!;
  assertTupleClose(descendantAfterParentEdit.worldTransform.translation, [14, 2, 3]);

  const serialized = JSON.stringify(parentEdited.workspace.flatSceneDocument);
  const reopened = applyCanonicalSceneDocumentReadModel(
    buildInitialWorkspaceReadModel(),
    JSON.parse(serialized) as FlatSceneDocument,
    '/tmp/asymmetric.scene.json',
  );
  const reopenedRenderable = reopened.scene.renderables[0]!;
  assert.deepEqual(reopenedRenderable.localTransform, descendantAfterParentEdit.localTransform);
  assertTupleClose(
    reopenedRenderable.worldTransform.translation,
    descendantAfterParentEdit.worldTransform.translation,
  );
  assert.deepEqual(
    projectStudioAuthoredRenderableTransform(
      buildStudioViewportAdapterReadModel({ scene: reopened.scene }).renderables[0]!,
    ),
    reopenedRenderable.worldTransform,
  );
});

test('canonical entity instances and bootstrap bindings remain ordinary editable scene data', () => {
  const opened = applyCanonicalSceneDocumentReadModel(
    buildInitialWorkspaceReadModel(),
    canonicalEntityInstanceScene(),
    '/tmp/generated-tunnel-room.scene.json',
  );
  assert.deepEqual(opened.scene.renderables.map(renderable => renderable.label), [
    'Player Start',
    'Tunnel Enemy',
  ]);
  assert.deepEqual(
    opened.entities
      .filter(entity => entity.sceneObjectId !== null)
      .map(entity => [entity.label, entity.kind]),
    [
      ['Runtime Inputs', 'scene_bootstrap'],
      ['Actors', 'empty_group'],
      ['Player Start', 'entity_instance'],
      ['Tunnel Enemy', 'entity_instance'],
    ],
  );

  const bootstrap = opened.entities.find(entity => entity.kind === 'scene_bootstrap');
  assert.ok(bootstrap);
  const bootstrapSelected = applySelectedEntityReadModel(opened, bootstrap.id);
  assert.equal(bootstrapSelected.selectedEntityId, bootstrap.id);
  assert.equal(bootstrapSelected.scene.selectedRenderableId, null);
  assert.equal(bootstrapSelected.entities.find(entity => entity.id === bootstrap.id)?.selected, true);
  assert.deepEqual(validateSelectionCommandSync({
    commandPresent: true,
    commandEntityId: bootstrap.id,
    commandSelected: true,
    viewportSelectedRenderableId: null,
    selectableEntityIds: bootstrapSelected.entities.filter(entity => entity.selectable).map(entity => entity.id),
    entityRenderableLinks: Object.fromEntries(
      bootstrapSelected.entities.map(entity => [entity.id, entity.renderableId]),
    ),
  }), []);

  const player = opened.entities.find(entity => entity.label === 'Player Start');
  assert.ok(player?.sceneObjectId);
  const edited = applySceneObjectCommandReadModel(
    opened,
    createTranslateSceneObjectRequest(opened, player.sceneObjectId, [2, 0, 0]),
  );
  assert.equal(edited.ok, true);
  const saved = JSON.stringify(edited.workspace.flatSceneDocument);
  const reopened = applyCanonicalSceneDocumentReadModel(
    buildInitialWorkspaceReadModel(),
    JSON.parse(saved) as FlatSceneDocument,
    '/tmp/generated-tunnel-room.scene.json',
  );
  const reopenedPlayer = reopened.flatSceneDocument.nodes.find(node => node.id === sceneNodeId(101));
  assert.deepEqual(reopenedPlayer?.transform.translation, [3, 1.62, 2]);
  assert.equal(
    reopened.flatSceneDocument.nodes.find(node => node.kind.kind === 'bootstrap')?.kind.kind,
    'bootstrap',
  );
});
