import assert from 'node:assert/strict';
import test from 'node:test';
import { sceneId, sceneNodeId, type FlatSceneDocument } from '@asha/contracts';
import {
  applyCanonicalSceneDocumentReadModel,
  applySceneObjectCommandReadModel,
  buildInitialWorkspaceReadModel,
  buildStudioViewportAdapterReadModel,
  createRotateSceneObjectRequest,
  createTranslateSceneObjectRequest,
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
