import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultStudioHostUserSettings } from '@asha-studio/domain';
import {
  hasStudioCameraMovement,
  isStudioCameraMovementCode,
  resolveStudioCameraMovementAxes,
} from '../libs/studio-viewport/src/scene-camera-controls.js';

test('configurable held keys resolve into movement axes without browser repeat state', () => {
  const bindings = buildDefaultStudioHostUserSettings('test').keyboard;
  const axes = resolveStudioCameraMovementAxes(
    new Set([bindings.moveForward, bindings.moveLeft, bindings.moveUp, bindings.boost]),
    bindings,
  );
  assert.deepEqual(axes, { forward: 1, right: -1, up: 1, boosted: true });
  assert.equal(hasStudioCameraMovement(axes), true);
  assert.equal(isStudioCameraMovementCode('KeyW', bindings), true);
  assert.equal(isStudioCameraMovementCode('Enter', bindings), false);
});

test('opposing configured movement keys cancel each axis', () => {
  const bindings = buildDefaultStudioHostUserSettings('test').keyboard;
  const axes = resolveStudioCameraMovementAxes(new Set([
    bindings.moveForward,
    bindings.moveBackward,
    bindings.moveDown,
    bindings.moveUp,
  ]), bindings);
  assert.deepEqual(axes, { forward: 0, right: 0, up: 0, boosted: false });
  assert.equal(hasStudioCameraMovement(axes), false);
});
