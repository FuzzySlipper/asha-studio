import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createStudioWorkspaceModel } from '../src/session-workspace';
import { buildStudioViewport3dReadback } from '../src/viewport3d-host';

test('viewport 3D readback proves canvas host, selected target, preview ghost, and applied state', () => {
  const workspace = createStudioWorkspaceModel();
  const readback = buildStudioViewport3dReadback(workspace.sceneView);

  assert.equal(readback.artifactKind, 'viewport_3d_readback');
  assert.equal(readback.hostKind, 'three_local_browser_projection');
  assert.equal(readback.canvasMarker, 'studio-3d-webgl-canvas');
  assert.equal(readback.readiness, 'ready');
  assert.equal(readback.sceneId, 'scene-view:voxel-basic:v1');
  assert.equal(readback.cameraId, 'studio-camera-main');
  assert.equal(readback.projectionAuthority, 'browser_projection_reference');
  assert.equal(readback.dependencyDecision, 'direct_three_local_browser_projection_dependency');
  assert.equal(readback.visibleRenderableCount, 5);
  assert.equal(readback.selectedRenderableId, 'selected-voxel:0,0,0');
  assert.equal(readback.previewGhostId, 'preview-ghost:1,0,0');
  assert.equal(readback.appliedRenderableId, 'applied-voxel:1,0,0');
  assert.ok(readback.semanticMarkers.includes('selected-target-highlight'));
  assert.ok(readback.semanticMarkers.includes('preview-ghost-renderable'));
  assert.ok(readback.semanticMarkers.includes('applied-state-renderable'));
  assert.ok(readback.limitations.some((limitation) => limitation.includes('does not claim native runtime, Agora compositor, hardware GPU, or performance evidence')));
});

test('viewport 3D readback fails closed when required renderables are absent', () => {
  const workspace = createStudioWorkspaceModel();
  const missingPreview = {
    ...workspace.sceneView,
    renderables: workspace.sceneView.renderables.filter((renderable) => renderable.renderableId !== workspace.sceneView.preview.previewGhostId),
  };
  const readback = buildStudioViewport3dReadback(missingPreview);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(readback.previewGhostId, null);
  assert.equal(readback.selectedRenderableId, 'selected-voxel:0,0,0');
  assert.equal(readback.appliedRenderableId, 'applied-voxel:1,0,0');
});
