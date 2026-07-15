import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkspaceAuthoringProjectionSummary } from '@asha/runtime-session';
import {
  compileStudioVoxelBrushStroke,
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

test('coalesced authoring updates retain the Rust diff journal as one replayable replacement', () => {
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
  const retained = retainStudioWorkspaceProjection(base, {
    ...base,
    workingRevision: 2,
    cursor: 2,
    delivery: 'apply',
    frame: { ops: [{ op: 'destroy', handle: 1 as never }] },
  });
  assert.equal(retained.delivery, 'replace');
  assert.deepEqual(retained.frame.ops.map(operation => operation.op), ['create', 'destroy']);
  assert.equal(retained.renderDiffCount, 2);
  assert.notEqual(retained.projectionHash, 'old');
});
