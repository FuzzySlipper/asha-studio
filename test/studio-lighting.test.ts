import assert from 'node:assert/strict';
import test from 'node:test';
import { renderHandle, sceneId, sceneNodeId, type FlatSceneDocument, type RenderFrameDiff } from '@asha/contracts';
import {
  buildStudioLightingProjection,
  projectStudioAuthoredLightTransformPreview,
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
  const projection = buildStudioLightingProjection(document, 'work_light', { ops: [] });
  assert.equal(projection.workLightActive, true);
  assert.equal(projection.activeLightCount, 2);
  assert.deepEqual(projection.frame.ops.map(op => op.op), ['createLight', 'createLight']);
  assert.equal(JSON.stringify(document), before);
});

test('typed additions upgrade storage explicitly and authored preview consumes the engine frame verbatim', () => {
  const added = proposeStudioLightAddition(scene(), 'directional');
  assert.equal(added.document.schemaVersion, 2);
  assert.equal(added.document.metadata.authoringFormatVersion, 2);
  const light = added.document.nodes.find(node => node.id === added.nodeId);
  assert.equal(light?.kind.kind, 'light');

  const engineFrame: RenderFrameDiff = { ops: [{
    op: 'createLight',
    handle: renderHandle(41),
    parent: null,
    light: {
      kind: 'directional',
      color: [1, 1, 1],
      intensity: 1.2,
      enabled: true,
      direction: [-0.25, -0.5, -0.75],
      shadowIntent: 'disabled',
    },
  }] };
  const projection = buildStudioLightingProjection(added.document, 'authored_lights', engineFrame);
  assert.equal(projection.authoredLightCount, 1);
  assert.equal(projection.frame, engineFrame);
  const operation = projection.frame.ops[0];
  assert.equal(operation?.op, 'createLight');
  if (operation?.op !== 'createLight' || operation.light.kind !== 'directional') return;
  assert.deepEqual(operation.light.direction, [-0.25, -0.5, -0.75]);
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

test('authored light transform preview derives one disposable update from Rust projection', () => {
  const added = proposeStudioLightAddition(scene(), 'spot');
  const authoritativeFrame: RenderFrameDiff = { ops: [{
    op: 'createLight',
    handle: renderHandle(41),
    parent: null,
    light: {
      kind: 'spot',
      color: [0.8, 0.7, 0.6],
      intensity: 5,
      enabled: true,
      position: [6, 4, -4],
      direction: [-1, 0, 0],
      range: 18,
      decay: 2,
      outerAngleRadians: 0.7,
      penumbra: 0.25,
      shadowIntent: 'disabled',
    },
  }] };
  const original = JSON.stringify(authoritativeFrame);
  const preview = projectStudioAuthoredLightTransformPreview(
    added.document,
    added.nodeId,
    {
      translation: [8, 7, 3],
      rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2],
      scale: [1, 1, 1],
    },
    authoritativeFrame,
  );
  const update = preview.ops[0];
  assert.equal(update?.op, 'updateLight');
  if (update?.op !== 'updateLight' || update.light.kind !== 'spot') return;
  assert.equal(update.handle, renderHandle(41));
  assert.notDeepEqual(update.light.position, [6, 4, -4]);
  assert.notDeepEqual(update.light.direction, [-1, 0, 0]);
  assert.equal(update.light.intensity, 5);
  assert.equal(JSON.stringify(authoritativeFrame), original);
});
