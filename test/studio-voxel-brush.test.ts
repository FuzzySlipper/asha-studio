import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkspaceAuthoringProjectionSummary } from '@asha/runtime-session';
import {
  compileStudioVoxelBrushStroke,
  compactStudioWorkspaceProjectionFrame,
  retainStudioWorkspaceProjection,
} from '@asha-studio/store';

test('voxel pointer strokes deduplicate and sort authority commands deterministically', () => {
  const batch = compileStudioVoxelBrushStroke({
    tool: 'paint',
    centers: [
      { x: 3, y: 2, z: 1 },
      { x: 1, y: 2, z: 1 },
      { x: 3, y: 2, z: 1 },
    ],
    grid: 7,
    material: 4,
    size: 1,
  });
  assert.deepEqual(batch.commands, [
    { op: 'setVoxel', grid: 7, coord: { x: 1, y: 2, z: 1 }, value: { kind: 'solid', material: 4 } },
    { op: 'setVoxel', grid: 7, coord: { x: 3, y: 2, z: 1 }, value: { kind: 'solid', material: 4 } },
  ]);
});

test('erase uses canonical empty voxel commands and a bounded cube brush', () => {
  const batch = compileStudioVoxelBrushStroke({
    tool: 'erase',
    centers: [{ x: 4, y: 5, z: 6 }],
    grid: 1,
    material: 2,
    size: 3,
  });
  assert.equal(batch.commands.length, 27);
  assert.deepEqual(batch.commands.at(0), {
    op: 'setVoxel',
    grid: 1,
    coord: { x: 3, y: 4, z: 5 },
    value: { kind: 'empty' },
  });
  assert.deepEqual(batch.commands.at(-1), {
    op: 'setVoxel',
    grid: 1,
    coord: { x: 5, y: 6, z: 7 },
    value: { kind: 'empty' },
  });
});

test('voxel brush rejects invalid product inputs before authority invocation', () => {
  assert.throws(
    () => compileStudioVoxelBrushStroke({
      tool: 'add',
      centers: [{ x: 0, y: 0, z: 0 }],
      grid: Number.NaN,
      material: 1,
      size: 1,
    }),
    /grid must be a safe integer/,
  );
  assert.throws(
    () => compileStudioVoxelBrushStroke({
      tool: 'paint',
      centers: [{ x: 0, y: 0, z: 0 }],
      grid: 1,
      material: 0,
      size: 1,
    }),
    /material must be an integer in 1\.\.255/,
  );
});

test('coalesced authoring updates retain only unacknowledged Rust diffs and compact recovery state', () => {
  const base: WorkspaceAuthoringProjectionSummary = {
    kind: 'workspace_authoring.projection.v0',
    workspaceId: 'studio-test',
    generation: 4,
    workingRevision: 1,
    cursor: 1,
    delivery: 'replace',
    frame: {
      ops: [{
        op: 'create',
        handle: 1 as never,
        parent: null,
        node: {
          geometry: { shape: 'cube' },
          material: { color: [1, 1, 1, 1], wireframe: false },
          transform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
          visible: true,
          layer: 'scene',
          metadata: { source: null, tags: [], label: 'temporary default' },
        },
      }],
    },
    renderDiffCount: 1,
    projectionHash: 'old',
  };
  const first = retainStudioWorkspaceProjection(null, base, null);
  const retained = retainStudioWorkspaceProjection(first, {
    ...base,
    workingRevision: 2,
    cursor: 2,
    delivery: 'apply',
    projectionHash: 'destroy-temporary',
    frame: { ops: [{ op: 'destroy', handle: 1 as never }] },
  }, null);
  assert.equal(retained.delivery, 'replace');
  assert.deepEqual(retained.frame.ops.map(operation => operation.op), ['create', 'destroy']);
  assert.equal(retained.renderDiffCount, 2);
  assert.equal(retained.recoveryFrame.ops.length, 0);
  assert.equal(retained.studioMetrics.coalescedFrameCount, 2);

  const next = retainStudioWorkspaceProjection(retained, {
    ...base,
    workingRevision: 3,
    cursor: 3,
    delivery: 'apply',
    projectionHash: 'create-authoritative',
    frame: base.frame,
  }, retained.projectionHash);
  assert.equal(next.delivery, 'apply');
  assert.deepEqual(next.frame.ops.map(operation => operation.op), ['create']);
  assert.equal(next.studioMetrics.coalescedFrameCount, 1);
});

test('two hundred acknowledged transform commits stay one-op incremental with bounded recovery', () => {
  const base: WorkspaceAuthoringProjectionSummary = {
    kind: 'workspace_authoring.projection.v0',
    workspaceId: 'studio-transform-performance',
    generation: 1,
    workingRevision: 1,
    cursor: 1,
    delivery: 'replace',
    frame: {
      ops: [{
        op: 'create',
        handle: 10 as never,
        parent: null,
        node: {
          geometry: { shape: 'cube' },
          material: { color: [1, 1, 1, 1], wireframe: false },
          transform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
          visible: true,
          layer: 'scene',
          metadata: { source: null, tags: [], label: 'voxel instance root' },
        },
      }],
    },
    renderDiffCount: 1,
    projectionHash: 'initial',
  };
  let retained = retainStudioWorkspaceProjection(null, base, null);
  let acknowledged = retained.projectionHash;
  for (let index = 1; index <= 200; index += 1) {
    retained = retainStudioWorkspaceProjection(retained, {
      ...base,
      workingRevision: index + 1,
      cursor: index + 1,
      delivery: 'apply',
      projectionHash: `move-${index}`,
      frame: {
        ops: [{
          op: 'update',
          handle: 10 as never,
          transform: { translation: [index, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
          material: null,
          visible: null,
          metadata: null,
        }],
      },
    }, acknowledged);
    assert.equal(retained.delivery, 'apply');
    assert.equal(retained.frame.ops.length, 1);
    assert.equal(retained.recoveryFrame.ops.length, 1);
    assert.equal(retained.studioMetrics.meshPayloadOpCount, 0);
    acknowledged = retained.projectionHash;
  }
  const operation = retained.recoveryFrame.ops[0];
  assert.equal(operation?.op, 'create');
  if (operation?.op === 'create') assert.deepEqual(operation.node.transform.translation, [200, 0, 0]);
});

test('recovery compaction removes destroyed parents and descendants without retaining stale geometry', () => {
  const compacted = compactStudioWorkspaceProjectionFrame({
    ops: [{
      op: 'create', handle: 1 as never, parent: null,
      node: {
        geometry: { shape: 'cube' }, material: { color: [1, 1, 1, 1], wireframe: false },
        transform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        visible: true, layer: 'scene', metadata: { source: null, tags: [], label: 'root' },
      },
    }, {
      op: 'create', handle: 2 as never, parent: 1 as never,
      node: {
        geometry: { shape: 'cube' }, material: { color: [1, 1, 1, 1], wireframe: false },
        transform: { translation: [1, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        visible: true, layer: 'scene', metadata: { source: null, tags: [], label: 'child' },
      },
    }],
  }, { ops: [{ op: 'destroy', handle: 1 as never }] });
  assert.deepEqual(compacted, { ops: [] });
});
