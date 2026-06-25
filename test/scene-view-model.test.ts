import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createStudioWorkspaceModel } from '../src/session-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

type SceneViewRenderable = ReturnType<typeof createStudioWorkspaceModel>['sceneView']['renderables'][number];

function requireRenderable(renderables: readonly SceneViewRenderable[], renderableId: string): SceneViewRenderable {
  const renderable = renderables.find((candidate) => candidate.renderableId === renderableId);
  assert.ok(renderable, `expected renderable ${renderableId}`);
  return renderable;
}

test('scene-view model defines deterministic camera, viewport, renderables, and pick proof', () => {
  const workspace = createStudioWorkspaceModel();
  const sceneView = workspace.sceneView;

  assert.equal(sceneView.artifactKind, 'scene_view_model');
  assert.equal(sceneView.sceneId, 'scene-view:voxel-basic:v1');
  assert.deepEqual(sceneView.viewport, {
    widthPx: 1920,
    heightPx: 1080,
    devicePixelRatio: 1,
    coordinateSpace: 'screen_px_and_normalized_pick_points',
  });
  assert.deepEqual(sceneView.camera.pose.position, { x: 4.25, y: 0.75, z: 1.5 });
  assert.deepEqual(sceneView.camera.pose.target, { x: 0.5, y: 0.5, z: 0.5 });
  assert.equal(sceneView.camera.projection.kind, 'perspective');
  assert.equal(sceneView.camera.projection.projectionHash, workspace.voxelWorkflow.selection.pickRay.cameraProjectionHash);
  assert.equal(sceneView.interactionProof.artifactKind, 'viewport_camera_tool_interaction_proof');
  assert.equal(sceneView.interactionProof.readiness, 'ready');
  assert.equal(sceneView.interactionProof.cameraBefore.pose.position.x, 4.5);
  assert.equal(sceneView.interactionProof.cameraAfter.pose.position.x, sceneView.camera.pose.position.x);
  assert.equal(sceneView.interactionProof.toolState.activeTool, 'voxel_brush');
  assert.equal(sceneView.interactionProof.toolState.cameraChanged, true);
  assert.notEqual(sceneView.interactionProof.toolState.cameraBeforeHash, sceneView.interactionProof.toolState.cameraAfterHash);
  assert.deepEqual(sceneView.interactionProof.scriptedActions.map((action) => action.actionId), ['gui.frame_selected_target', 'agent.select_visible_voxel', 'gui.toggle_preview_ghost']);
  assert.deepEqual(sceneView.interactionProof.sharedTimelineSequenceIds, ['seq-0004', 'seq-0006', 'seq-0007']);
  assert.equal(sceneView.interactionProof.staleReadbackGuard.mismatchPolicy, 'failed_closed');

  assert.deepEqual(sceneView.renderables.map((renderable) => renderable.renderableId), [
    'terrain-test-grid',
    'selected-voxel:0,0,0',
    'preview-ghost:1,0,0',
    'applied-voxel:1,0,0',
    'model-preview-crate',
    'scene-asset:mesh/demo-crate:1',
  ]);
  const terrainGrid = requireRenderable(sceneView.renderables, 'terrain-test-grid');
  const selectedVoxel = requireRenderable(sceneView.renderables, 'selected-voxel:0,0,0');
  const previewGhost = requireRenderable(sceneView.renderables, 'preview-ghost:1,0,0');
  const appliedVoxel = requireRenderable(sceneView.renderables, 'applied-voxel:1,0,0');
  const modelPreviewCrate = requireRenderable(sceneView.renderables, 'model-preview-crate');
  const loadedDemoAsset = requireRenderable(sceneView.renderables, 'scene-asset:mesh/demo-crate:1');

  assert.equal(selectedVoxel.sourceState, 'authoritative_rust_state');
  assert.equal(previewGhost.sourceState, 'editor_preview_state');
  assert.equal(modelPreviewCrate.sourceState, 'browser_projection_reference');
  assert.equal(loadedDemoAsset.kind, 'static_mesh');
  assert.equal(loadedDemoAsset.sourceState, 'browser_projection_reference');
  assert.equal(loadedDemoAsset.pickable, false);
  assert.equal(loadedDemoAsset.meshRef, 'mesh/demo-crate');
  assert.equal(loadedDemoAsset.materialRef, 'material/demo-brushed-copper');
  assert.equal(loadedDemoAsset.renderHash, workspace.demoAssetLoad.loadedRenderables[0]?.renderHash);
  assert.equal(modelPreviewCrate.materialRef, workspace.modelMaterialPreview.artifact.selectedMaterialAsset);
  assert.equal(modelPreviewCrate.meshRef, workspace.modelMaterialPreview.artifact.selectedModelAsset);

  assert.deepEqual(terrainGrid.bounds, { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 3, z: 1 } });
  assert.deepEqual(terrainGrid.transform.translation, { x: 0, y: 0, z: 0 });
  assert.deepEqual(terrainGrid.transform.scale, { x: 1, y: 1, z: 1 });

  assert.deepEqual(selectedVoxel.transform.translation, { x: 0.5, y: 0.5, z: 0.5 });
  assert.deepEqual(selectedVoxel.transform.rotationQuat, [0, 0, 0, 1]);
  assert.deepEqual(selectedVoxel.transform.scale, { x: 1, y: 1, z: 1 });
  assert.deepEqual(selectedVoxel.bounds, { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } });

  assert.deepEqual(previewGhost.transform.translation, { x: 1.5, y: 0.5, z: 0.5 });
  assert.deepEqual(previewGhost.transform.rotationQuat, [0, 0, 0, 1]);
  assert.deepEqual(previewGhost.transform.scale, { x: 1, y: 1, z: 1 });
  assert.deepEqual(previewGhost.bounds, { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 1, z: 1 } });

  assert.equal(appliedVoxel.sourceState, 'authoritative_rust_state');
  assert.equal(appliedVoxel.renderHash, workspace.viewportEditor.appliedState.renderHash);
  assert.deepEqual(appliedVoxel.transform.translation, { x: 1.5, y: 0.5, z: 0.5 });
  assert.deepEqual(appliedVoxel.transform.rotationQuat, [0, 0, 0, 1]);
  assert.deepEqual(appliedVoxel.transform.scale, { x: 1, y: 1, z: 1 });
  assert.deepEqual(appliedVoxel.bounds, { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 1, z: 1 } });

  assert.deepEqual(modelPreviewCrate.transform.translation, { x: 1.5, y: 1.5, z: 0.65 });
  assert.deepEqual(modelPreviewCrate.transform.rotationQuat, [0, 0.258819, 0, 0.965926]);
  assert.deepEqual(modelPreviewCrate.transform.scale, { x: 0.75, y: 0.75, z: 0.75 });
  assert.deepEqual(modelPreviewCrate.bounds, { min: { x: 1.125, y: 1.125, z: 0.275 }, max: { x: 1.875, y: 1.875, z: 1.025 } });

  assert.equal(sceneView.selection.selectedObjectId, 'voxel:0,0,0');
  assert.equal(sceneView.selection.selectedRenderableId, 'selected-voxel:0,0,0');
  assert.deepEqual(sceneView.selection.screenPoint, { x: 0.5, y: 0.5, space: 'normalized_0_1' });
  assert.equal(sceneView.expectedPickPoints[0]?.expectedRenderableId, 'selected-voxel:0,0,0');
  assert.equal(sceneView.expectedPickPoints[0]?.rayHash, workspace.voxelWorkflow.selection.pickRay.rayHash);
  assert.equal(sceneView.expectedPickPoints[1]?.expectedOutcome, 'no_hit');
  assert.equal(sceneView.pickEvidence.artifactKind, 'viewport_pick_hit_test_evidence');
  assert.equal(sceneView.pickEvidence.readiness, 'ready');
  assert.equal(sceneView.pickEvidence.hit.outcome, 'hit');
  assert.equal(sceneView.pickEvidence.hit.renderableId, 'selected-voxel:0,0,0');
  assert.equal(sceneView.pickEvidence.hit.voxelId, 'voxel:0,0,0');
  assert.equal(sceneView.pickEvidence.hit.face, 'posX');
  assert.deepEqual(sceneView.pickEvidence.hit.normal, { x: 1, y: 0, z: 0 });
  assert.equal(sceneView.pickEvidence.backgroundNoHit.outcome, 'no_hit');
  assert.equal(sceneView.pickEvidence.crossChecks.selectedRenderableId, sceneView.selection.selectedRenderableId);
  assert.equal(sceneView.pickEvidence.crossChecks.timelineCommandId, 'selection.voxel_from_screen_point');
  assert.equal(sceneView.pickEvidence.staleReadbackGuard.requiredSelectionHash, sceneView.selection.selectionHash);
  assert.equal(sceneView.pickEvidence.staleReadbackGuard.requiredHitRenderableId, sceneView.selection.selectedRenderableId);
});

test('scene-view proof links preview, authority, and render hashes without claiming runtime authority', () => {
  const workspace = createStudioWorkspaceModel();
  const sceneView = workspace.sceneView;

  assert.equal(sceneView.preview.previewGhostId, 'preview-ghost:1,0,0');
  assert.equal(sceneView.preview.authorityState, 'editor_local_not_applied');
  assert.equal(sceneView.hashes.authorityBeforeHash, workspace.voxelWorkflow.evidence.authorityBeforeHash);
  assert.equal(sceneView.hashes.authorityAfterHash, workspace.voxelWorkflow.evidence.authorityAfterHash);
  assert.equal(sceneView.hashes.renderBeforeHash, workspace.viewportEditor.previewState.renderHash);
  assert.equal(sceneView.hashes.renderAfterHash, workspace.viewportEditor.appliedState.renderHash);
  assert.notEqual(sceneView.hashes.authorityBeforeHash, sceneView.hashes.authorityAfterHash);
  assert.notEqual(sceneView.hashes.renderBeforeHash, sceneView.hashes.renderAfterHash);
  assert.match(sceneView.hashes.sceneViewHash, /^scene-view-fnv1a-[a-f0-9]{8}$/);
  assert.equal(sceneView.hashes.distinction, 'rust_authority_hashes_are_inputs_browser_projection_hashes_are_reference_outputs');
  assert.ok(sceneView.knownLimitations.some((limitation) => limitation.includes('not a Three.js/WebGL implementation')));
  assert.ok(sceneView.futurePublicContractCandidates.some((candidate) => candidate.includes('belongs in ASHA Studio')));
});

test('scene-view model is exported through workspace and agent readout fixtures', () => {
  const workspace = createStudioWorkspaceModel();
  assert.equal(workspace.exportedReadout.sceneView.sceneId, workspace.sceneView.sceneId);
  assert.equal(workspace.exportedReadout.sceneView.hashes.sceneViewHash, workspace.sceneView.hashes.sceneViewHash);

  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-scene-view.sample.json'), 'utf8')) as {
    readonly artifactKind?: string;
    readonly sceneId?: string;
    readonly camera?: { readonly cameraId?: string };
    readonly renderables?: readonly { readonly renderableId?: string; readonly materialRef?: unknown }[];
    readonly selection?: { readonly selectedObjectId?: string };
    readonly preview?: { readonly previewGhostId?: string };
    readonly hashes?: { readonly distinction?: string; readonly sceneViewHash?: string };
  };
  assert.equal(fixture.artifactKind, 'scene_view_model');
  assert.equal(fixture.sceneId, workspace.sceneView.sceneId);
  assert.equal(fixture.camera?.cameraId, 'studio-camera-main');
  assert.equal(fixture.renderables?.length, 6);
  assert.equal(fixture.renderables?.find((renderable) => renderable.renderableId === 'model-preview-crate')?.materialRef, 'material/studio-brushed-copper');
  assert.equal(fixture.renderables?.find((renderable) => renderable.renderableId === 'scene-asset:mesh/demo-crate:1')?.materialRef, 'material/demo-brushed-copper');
  assert.equal(fixture.selection?.selectedObjectId, 'voxel:0,0,0');
  assert.equal(fixture.preview?.previewGhostId, 'preview-ghost:1,0,0');
  assert.equal(fixture.hashes?.distinction, 'rust_authority_hashes_are_inputs_browser_projection_hashes_are_reference_outputs');
  assert.match(fixture.hashes?.sceneViewHash ?? '', /^scene-view-fnv1a-[a-f0-9]{8}$/);
});
