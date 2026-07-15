import assert from 'node:assert/strict';
import test from 'node:test';
import { sceneId, sceneNodeId, type FlatSceneDocument } from '@asha/contracts';
import {
  buildStudioVoxelProjectionBindingPlan,
  buildStudioVoxelRendererPickEvidence,
  worldTransformForSceneNode,
} from '@asha-studio/store';

const identity = {
  translation: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
} as const;

function document(): FlatSceneDocument {
  return {
    schemaVersion: 1,
    id: sceneId(42),
    metadata: { name: 'Two houses', authoringFormatVersion: 1 },
    dependencies: [{ id: 'voxel/house', version: { req: 'any' }, hash: null }],
    nodes: [
      {
        id: sceneNodeId(1),
        parent: null,
        childOrder: 0,
        label: 'Root',
        tags: [],
        transform: { ...identity, translation: [3, 0, 0] },
        kind: { kind: 'emptyGroup' },
      },
      {
        id: sceneNodeId(2),
        parent: sceneNodeId(1),
        childOrder: 0,
        label: 'House A',
        tags: [],
        transform: identity,
        kind: { kind: 'voxelVolume', asset: { id: 'voxel/house', version: { req: 'any' }, hash: null } },
      },
      {
        id: sceneNodeId(3),
        parent: sceneNodeId(1),
        childOrder: 1,
        label: 'House B',
        tags: [],
        transform: { ...identity, translation: [8, 0, 0], scale: [2, 1, 1] },
        kind: { kind: 'voxelVolume', asset: { id: 'voxel/house', version: { req: 'any' }, hash: null } },
      },
    ],
  };
}

test('scene voxel nodes become distinct public bindings over one active asset', () => {
  const plan = buildStudioVoxelProjectionBindingPlan(document(), 'voxel/house');
  assert.equal(plan.instances.length, 2);
  assert.deepEqual(plan.instances.map(instance => instance.instanceId), ['scene-node:2', 'scene-node:3']);
  assert.deepEqual(plan.instances[0]?.transform.translation, [3, 0, 0]);
  assert.deepEqual(plan.instances[1]?.transform.translation, [11, 0, 0]);
  assert.deepEqual(plan.instances[1]?.transform.scale, [2, 1, 1]);
  assert.match(plan.registryDigest, /^fnv1a64:/);
});

test('world transform composition follows SceneDocument hierarchy', () => {
  assert.deepEqual(worldTransformForSceneNode(document(), sceneNodeId(3)), {
    translation: [11, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [2, 1, 1],
  });
});

test('renderer observation becomes a local hint while Rust remains the pick authority', () => {
  const evidence = buildStudioVoxelRendererPickEvidence({
    cameraOrigin: [20, 2.5, 3.5],
    instanceTransform: {
      translation: [10, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [2, 1, 1],
    },
    worldPosition: [14, 2.5, 3.5],
    worldNormal: [1, 0, 0],
  });
  assert.ok(evidence !== null);
  assert.deepEqual(evidence.rendererHint, {
    localVoxel: { x: 1, y: 2, z: 3 },
    localFace: 'posX',
  });
  assert.deepEqual(evidence.direction, [-1, 0, 0]);
  assert.equal(evidence.maxDistance, 7);
});
