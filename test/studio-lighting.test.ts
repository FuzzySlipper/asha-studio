import assert from 'node:assert/strict';
import test from 'node:test';
import { sceneId, sceneNodeId, type FlatSceneDocument } from '@asha/contracts';
import {
  buildStudioLightingProjection,
  proposeStudioLightAddition,
  proposeStudioLightUpdate,
} from '@asha-studio/domain';

function scene(): FlatSceneDocument {
  return {
    schemaVersion: 1,
    id: sceneId(83),
    metadata: { name: 'Lighting test', authoringFormatVersion: 1 },
    dependencies: [],
    nodes: [{
      id: sceneNodeId(1),
      parent: null,
      childOrder: 0,
      label: 'Root',
      tags: [],
      transform: {
        translation: [2, 0, 0],
        rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2],
        scale: [1, 1, 1],
      },
      kind: { kind: 'emptyGroup' },
    }],
  };
}

test('work-light projection is visible editor state and does not mutate stored scene data', () => {
  const document = scene();
  const before = JSON.stringify(document);
  const projection = buildStudioLightingProjection(document, 'work_light');
  assert.equal(projection.workLightActive, true);
  assert.equal(projection.activeLightCount, 2);
  assert.deepEqual(projection.frame.ops.map(op => op.op), ['createLight', 'createLight']);
  assert.equal(JSON.stringify(document), before);
});

test('typed additions upgrade storage explicitly and authored projection follows hierarchy orientation', () => {
  const added = proposeStudioLightAddition(scene(), 'directional');
  assert.equal(added.document.schemaVersion, 2);
  assert.equal(added.document.metadata.authoringFormatVersion, 2);
  const light = added.document.nodes.find(node => node.id === added.nodeId);
  assert.equal(light?.kind.kind, 'light');

  const projection = buildStudioLightingProjection(added.document, 'authored_lights');
  assert.equal(projection.authoredLightCount, 1);
  const operation = projection.frame.ops[0];
  assert.equal(operation?.op, 'createLight');
  if (operation?.op !== 'createLight' || operation.light.kind !== 'directional') return;
  assert.ok(Math.abs(operation.light.direction[0] + 1) < 0.000001);
  assert.ok(Math.abs(operation.light.direction[2]) < 0.000001);
});

test('typed light updates retain node pose and identity', () => {
  const added = proposeStudioLightAddition(scene(), 'point');
  const before = added.document.nodes.find(node => node.id === added.nodeId);
  assert.ok(before?.kind.kind === 'light' && before.kind.sceneLight.kind === 'point');
  if (before?.kind.kind !== 'light' || before.kind.sceneLight.kind !== 'point') return;
  const updated = proposeStudioLightUpdate(added.document, added.nodeId, {
    ...before.kind.sceneLight,
    intensity: 9,
    range: 22,
  });
  const after = updated.nodes.find(node => node.id === added.nodeId);
  assert.deepEqual(after?.transform, before.transform);
  assert.equal(after?.kind.kind, 'light');
  if (after?.kind.kind === 'light' && after.kind.sceneLight.kind === 'point') {
    assert.equal(after.kind.sceneLight.intensity, 9);
    assert.equal(after.kind.sceneLight.range, 22);
  }
});
