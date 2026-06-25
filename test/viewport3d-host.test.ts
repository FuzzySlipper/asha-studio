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
  assert.equal(readback.visibleRenderableCount, 6);
  assert.equal(readback.selectedRenderableId, 'selected-voxel:0,0,0');
  assert.equal(readback.selectionHash, workspace.sceneView.selection.selectionHash);
  assert.equal(readback.previewGhostId, 'preview-ghost:1,0,0');
  assert.equal(readback.appliedRenderableId, 'applied-voxel:1,0,0');
  assert.equal(readback.interactionProof.readiness, 'ready');
  assert.equal(readback.interactionProof.toolState.activeTool, 'voxel_brush');
  assert.equal(readback.interactionProof.toolState.cameraChanged, true);
  assert.notEqual(readback.interactionProof.toolState.cameraBeforeHash, readback.interactionProof.toolState.cameraAfterHash);
  assert.equal(readback.pickEvidence.artifactKind, 'viewport_pick_hit_test_evidence');
  assert.equal(readback.pickEvidence.readiness, 'ready');
  assert.equal(readback.pickEvidence.hit.outcome, 'hit');
  assert.equal(readback.pickEvidence.hit.renderableId, 'selected-voxel:0,0,0');
  assert.equal(readback.pickEvidence.hit.voxelId, 'voxel:0,0,0');
  assert.equal(readback.pickEvidence.hit.face, 'posX');
  assert.equal(readback.pickEvidence.backgroundNoHit.outcome, 'no_hit');
  assert.equal(readback.pickEvidence.crossChecks.timelineCommandId, 'selection.voxel_from_screen_point');
  assert.equal(readback.pickEvidence.crossChecks.editAnchorVoxelId, 'voxel:1,0,0');
  assert.equal(readback.pickEvidence.staleReadbackGuard.requiredCameraHash, readback.pickEvidence.cameraHash);
  assert.equal(readback.pickEvidence.staleReadbackGuard.requiredViewportHash, readback.pickEvidence.viewportHash);
  assert.equal(readback.pickEvidence.staleReadbackGuard.requiredSelectionHash, readback.selectionHash);
  assert.deepEqual(readback.interactionProof.scriptedActions.map((action) => action.actionId), ['gui.frame_selected_target', 'agent.select_visible_voxel', 'gui.toggle_preview_ghost']);
  assert.ok(readback.semanticMarkers.includes('viewport_camera_tool_interaction_proof'));
  assert.ok(readback.semanticMarkers.includes('viewport_pick_hit_test_evidence'));
  assert.ok(readback.semanticMarkers.includes('pick:selected-voxel-center'));
  assert.ok(readback.semanticMarkers.includes('pick:background-no-hit'));
  assert.ok(readback.semanticMarkers.includes('pick_hit_stale_readback_guard'));
  assert.ok(readback.semanticMarkers.includes('camera_tool_stale_readback_guard'));
  assert.ok(readback.semanticMarkers.includes('agent.select_visible_voxel'));
  assert.ok(readback.semanticMarkers.includes('gui.toggle_preview_ghost'));
  assert.ok(readback.semanticMarkers.includes('selected-target-highlight'));
  assert.ok(readback.semanticMarkers.includes('preview-ghost-renderable'));
  assert.ok(readback.semanticMarkers.includes('applied-state-renderable'));
  assert.ok(readback.semanticMarkers.includes('demo-asset-loaded-renderable'));
  assert.ok(readback.semanticMarkers.includes('scene-asset:mesh/demo-crate:1'));
  assert.ok(readback.renderables.some((renderable) => renderable.renderableId === 'scene-asset:mesh/demo-crate:1' && renderable.kind === 'static_mesh'));
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

test('viewport 3D readback fails closed when camera or selection interaction proof is stale', () => {
  const workspace = createStudioWorkspaceModel();
  const staleInteraction = {
    ...workspace.sceneView,
    interactionProof: {
      ...workspace.sceneView.interactionProof,
      selectedRenderableId: 'selected-voxel:stale',
      staleReadbackGuard: {
        ...workspace.sceneView.interactionProof.staleReadbackGuard,
        requiredCameraAfterHash: 'camera-fnv1a-stale',
      },
    },
  };
  const readback = buildStudioViewport3dReadback(staleInteraction);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(readback.selectedRenderableId, 'selected-voxel:0,0,0');
  assert.equal(readback.interactionProof.staleReadbackGuard.mismatchPolicy, 'failed_closed');
});

test('viewport 3D readback fails closed when only the required selection hash is stale', () => {
  const workspace = createStudioWorkspaceModel();
  const staleSelectionHash = {
    ...workspace.sceneView,
    interactionProof: {
      ...workspace.sceneView.interactionProof,
      staleReadbackGuard: {
        ...workspace.sceneView.interactionProof.staleReadbackGuard,
        requiredSelectionHash: 'selection-hash-stale',
      },
    },
  };
  const readback = buildStudioViewport3dReadback(staleSelectionHash);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(readback.selectionHash, workspace.sceneView.selection.selectionHash);
  assert.equal(readback.interactionProof.staleReadbackGuard.requiredSelectionHash, 'selection-hash-stale');
});

test('viewport 3D readback fails closed when pick camera evidence is stale', () => {
  const workspace = createStudioWorkspaceModel();
  const staleCamera = {
    ...workspace.sceneView,
    camera: {
      ...workspace.sceneView.camera,
      pose: {
        ...workspace.sceneView.camera.pose,
        position: { x: 9, y: 9, z: 9 },
      },
    },
  };
  const readback = buildStudioViewport3dReadback(staleCamera);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(workspace.sceneView.pickEvidence.staleReadbackGuard.requiredCameraHash, workspace.sceneView.pickEvidence.cameraHash);
});

test('viewport 3D readback fails closed when pick viewport evidence is stale', () => {
  const workspace = createStudioWorkspaceModel();
  const staleViewport = {
    ...workspace.sceneView,
    viewport: {
      ...workspace.sceneView.viewport,
      widthPx: 1280,
    },
  };
  const readback = buildStudioViewport3dReadback(staleViewport);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(workspace.sceneView.pickEvidence.staleReadbackGuard.requiredViewportHash, workspace.sceneView.pickEvidence.viewportHash);
});

test('viewport 3D readback fails closed when pick inspector cross-check is stale', () => {
  const workspace = createStudioWorkspaceModel();
  const staleInspector = {
    ...workspace.sceneView,
    pickEvidence: {
      ...workspace.sceneView.pickEvidence,
      crossChecks: {
        ...workspace.sceneView.pickEvidence.crossChecks,
        inspectorSelectedVoxelId: 'voxel:stale-inspector',
      },
    },
  };
  const readback = buildStudioViewport3dReadback(staleInspector);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(readback.pickEvidence.crossChecks.inspectorSelectedVoxelId, 'voxel:stale-inspector');
});

test('viewport 3D readback fails closed when pick hierarchy cross-check is stale', () => {
  const workspace = createStudioWorkspaceModel();
  const staleHierarchy = {
    ...workspace.sceneView,
    pickEvidence: {
      ...workspace.sceneView.pickEvidence,
      crossChecks: {
        ...workspace.sceneView.pickEvidence.crossChecks,
        hierarchyNodeId: 'voxel:stale-hierarchy-node',
      },
    },
  };
  const readback = buildStudioViewport3dReadback(staleHierarchy);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(readback.pickEvidence.crossChecks.hierarchyNodeId, 'voxel:stale-hierarchy-node');
});

test('viewport 3D readback fails closed when raycast face disagrees with selected face', () => {
  const workspace = createStudioWorkspaceModel();
  const staleFace = {
    ...workspace.sceneView,
    selection: {
      ...workspace.sceneView.selection,
      selectedFace: 'posZ',
    },
  };
  const readback = buildStudioViewport3dReadback(staleFace);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(readback.pickEvidence.hit.face, 'posX');
});

test('viewport 3D readback fails closed when edit anchor disagrees with raycast face', () => {
  const workspace = createStudioWorkspaceModel();
  const staleEditAnchor = {
    ...workspace.sceneView,
    preview: {
      ...workspace.sceneView.preview,
      editAnchorVoxelId: 'voxel:0,0,1',
    },
  };
  const readback = buildStudioViewport3dReadback(staleEditAnchor);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(readback.pickEvidence.hit.face, 'posX');
});

test('viewport 3D readback fails closed when pick edit-anchor cross-check is stale', () => {
  const workspace = createStudioWorkspaceModel();
  const staleEditAnchorCrossCheck = {
    ...workspace.sceneView,
    pickEvidence: {
      ...workspace.sceneView.pickEvidence,
      crossChecks: {
        ...workspace.sceneView.pickEvidence.crossChecks,
        editAnchorVoxelId: 'voxel:0,0,1',
      },
    },
  };
  const readback = buildStudioViewport3dReadback(staleEditAnchorCrossCheck);

  assert.equal(readback.readiness, 'failed_closed');
  assert.equal(readback.pickEvidence.crossChecks.editAnchorVoxelId, 'voxel:0,0,1');
});
