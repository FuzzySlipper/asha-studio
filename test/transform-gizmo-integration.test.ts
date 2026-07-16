import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  DEFAULT_TRANSFORM_MANIPULATOR_SNAPPING,
  beginTransformManipulatorDrag,
  cancelTransformManipulatorDrag,
  projectTransformManipulator,
  transformManipulatorHandleFromId,
  updateTransformManipulatorDrag,
} from '@asha/editor-tools';

const repoRoot = process.cwd();
const sourceTransform = {
  translation: [0, 0, 0] as const,
  rotation: [0, 0, 0, 1] as const,
  scale: [1, 1, 1] as const,
};
const camera = {
  position: [4, 4, 4] as const,
  basis: {
    forward: [-0.577350269, -0.577350269, -0.577350269] as const,
    right: [0.707106781, -0.707106781, 0] as const,
    up: [-0.40824829, -0.40824829, 0.816496581] as const,
  },
  fovYDegrees: 42,
  viewport: { width: 800, height: 600 },
};

test('Studio consumes the public camera-aware manipulator candidate contract', () => {
  const frame = projectTransformManipulator({
    active: null,
    hovered: null,
    mode: 'translate',
    orientation: 'world',
    transform: sourceTransform,
    visible: true,
  });
  const xHandle = frame.ops.flatMap(op => {
    if (op.op !== 'create') return [];
    const handle = transformManipulatorHandleFromId(op.handle);
    return handle?.kind === 'axis' && handle.axis === 'x' ? [handle] : [];
  }).at(0);
  assert.notEqual(xHandle, undefined);
  if (xHandle === undefined) return;

  const drag = beginTransformManipulatorDrag({
    camera,
    handle: xHandle,
    orientation: 'world',
    pointer: [400, 300],
    revision: 'scene-revision-7',
    snapping: { ...DEFAULT_TRANSFORM_MANIPULATOR_SNAPPING, enabled: false },
    source: sourceTransform,
  });
  const coarse = updateTransformManipulatorDrag(drag, camera, [520, 300]);
  const fine = updateTransformManipulatorDrag(drag, camera, [520, 300], { fine: true });

  assert.equal(coarse.previewOnly, true);
  assert.equal(coarse.revision, 'scene-revision-7');
  assert.ok(Math.abs(coarse.transform.translation[0]) > Math.abs(fine.transform.translation[0]));
  assert.deepEqual(cancelTransformManipulatorDrag(drag).transform, sourceTransform);
});

test('Studio gizmo path previews per frame and settles through one revision-bound command', () => {
  const viewportSource = readFileSync(
    join(repoRoot, 'libs', 'studio-viewport', 'src', 'index.ts'),
    'utf8',
  );
  const storeSource = readFileSync(
    join(repoRoot, 'libs', 'studio-store', 'src', 'index.ts'),
    'utf8',
  );
  const panelSource = readFileSync(
    join(repoRoot, 'libs', 'studio-panels', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(viewportSource.includes('requestAnimationFrame'), true);
  assert.equal(viewportSource.includes('previewSelectedSceneObjectTransform'), true);
  assert.equal(viewportSource.includes('commitSelectedSceneObjectTransform'), true);
  assert.equal(viewportSource.includes('totalDeltaX / 160'), false);
  assert.equal(storeSource.includes('buildStudioSceneAuthoringOperation'), true);
  assert.equal(storeSource.includes('expectedBaseHash: expectedRevision'), true);
  assert.equal(storeSource.includes('candidateDocument'), false);
  assert.equal(storeSource.includes("kind: 'setTransform'"), true);
  assert.equal(storeSource.includes("kind: 'retargetVoxelAsset'"), true);
  assert.equal(storeSource.includes('currentProjectId: STUDIO_STORED_SCENE_PROJECT_ID'), true);
  assert.equal(panelSource.includes("id: 'scale_object'"), true);
  assert.equal(panelSource.includes('data-transform-orientation="local"'), true);
  assert.equal(panelSource.includes('data-transform-snapping'), true);
});
