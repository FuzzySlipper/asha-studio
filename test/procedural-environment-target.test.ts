import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sceneNodeId,
  type FlatSceneDocument,
  type SceneNodeRecord,
} from '@asha/contracts';
import { buildInitialWorkspaceReadModel } from '@asha-studio/domain';
import {
  readStudioStoredProceduralEnvironmentRecipe,
  selectStudioProceduralEnvironmentTarget,
} from '@asha-studio/store';

const IDENTITY_TRANSFORM = {
  translation: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
} as const;

function committedEnvironmentScene(): FlatSceneDocument {
  const base = buildInitialWorkspaceReadModel().flatSceneDocument;
  const environment = {
    id: sceneNodeId(23),
    parent: null,
    childOrder: 2,
    label: 'Generated tunnel environment',
    tags: ['procedural-environment'],
    transform: { ...IDENTITY_TRANSFORM, translation: [-4, -1, -5.5] },
    kind: {
      kind: 'voxelVolume',
      asset: { id: 'voxel-volume/generated-tunnel', version: { req: 'any' }, hash: null },
    },
  } as unknown as SceneNodeRecord;
  const marker = (
    id: number,
    childOrder: number,
    markerId: string,
  ) => ({
    id: sceneNodeId(id),
    parent: sceneNodeId(23),
    childOrder,
    label: markerId,
    tags: ['generated-marker'],
    transform: IDENTITY_TRANSFORM,
    kind: { kind: 'marker', markerId },
  }) as unknown as SceneNodeRecord;
  return {
    ...base,
    nodes: [
      ...base.nodes,
      environment,
      marker(24, 0, 'spawn/player-start'),
      marker(25, 1, 'navigation/exit-hint'),
    ],
  };
}

test('committed procedural environment reuses its voxel and marker identities', () => {
  const target = selectStudioProceduralEnvironmentTarget(
    committedEnvironmentScene(),
    'voxel-volume/generated-tunnel',
  );
  assert.equal(target.ok, true);
  if (!target.ok) return;
  assert.equal(target.mode, 'replace');
  assert.equal(target.voxelNodeId, sceneNodeId(23));
  assert.deepEqual(
    target.markerTargets.map(marker => marker.nodeId),
    [sceneNodeId(24), sceneNodeId(25)],
  );
});

test('stored generated asset without a management tag reuses its exact voxel identity', () => {
  const document = committedEnvironmentScene();
  const nodes = document.nodes.map(node => node.id === sceneNodeId(23)
    ? { ...node, tags: [] }
    : node);
  const target = selectStudioProceduralEnvironmentTarget(
    { ...document, nodes },
    'voxel-volume/generated-tunnel',
  );
  assert.equal(target.ok, true);
  if (!target.ok) return;
  assert.equal(target.mode, 'replace');
  assert.equal(target.voxelNodeId, sceneNodeId(23));
});

test('scene without a managed environment allocates one collision-free subtree', () => {
  const document = buildInitialWorkspaceReadModel().flatSceneDocument;
  const target = selectStudioProceduralEnvironmentTarget(
    document,
    'voxel-volume/generated-tunnel',
  );
  assert.equal(target.ok, true);
  if (!target.ok) return;
  assert.equal(target.mode, 'create');
  const allocated = [target.voxelNodeId, ...target.markerTargets.map(marker => marker.nodeId)];
  assert.equal(new Set(allocated).size, 3);
  assert.ok(allocated.every(id => !document.nodes.some(node => node.id === id)));
});

test('duplicate managed environments reject replacement instead of selecting the first', () => {
  const document = committedEnvironmentScene();
  const duplicate = {
    ...document.nodes.find(node => node.id === sceneNodeId(23)),
    id: sceneNodeId(26),
    childOrder: 3,
  } as SceneNodeRecord;
  const target = selectStudioProceduralEnvironmentTarget(
    { ...document, nodes: [...document.nodes, duplicate] },
    'voxel-volume/generated-tunnel',
  );
  assert.equal(target.ok, false);
  if (target.ok) return;
  assert.match(target.diagnostic, /ambiguous/);
});

test('stored generated provenance restores editable provider and seed defaults', () => {
  const recipe = readStudioStoredProceduralEnvironmentRecipe({
    provenance: [{
      kind: 'generated',
      uri: 'asha-generator://asha.tunnel.enclosed.v2/tiny-enclosed/v2?seed=23&configHash=fnv1a64:abc',
      contentHash: 'fnv1a64:def',
    }],
  } as never);
  assert.deepEqual(recipe, {
    providerId: 'asha.tunnel.enclosed.v2',
    presetId: 'tiny-enclosed',
    providerVersion: 2,
    seed: 23,
  });
});

test('ambiguous or malformed provenance does not invent editable recipe defaults', () => {
  assert.equal(readStudioStoredProceduralEnvironmentRecipe({
    provenance: [{
      kind: 'authored',
      uri: 'asha-generator://asha.tunnel.enclosed.v2/tiny-enclosed/v2?seed=23&configHash=fnv1a64:abc',
      contentHash: 'fnv1a64:def',
    }],
  } as never), null);
  assert.equal(readStudioStoredProceduralEnvironmentRecipe({
    provenance: [{
      kind: 'generated',
      uri: 'asha-generator://asha.tunnel.enclosed.v2/tiny-enclosed/v2?seed=23',
      contentHash: 'fnv1a64:def',
    }],
  } as never), null);
});
