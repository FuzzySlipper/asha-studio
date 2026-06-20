import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createStudioWorkspaceModel } from '../src/session-workspace';
import { createStudioViewportEditorPanelModel } from '../src/viewport-editor-panel';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('viewport editor panel projects selected target, preview state, and applied authority evidence', () => {
  const workspace = createStudioWorkspaceModel();
  const panel = workspace.viewportEditor;
  assert.equal(panel.artifactKind, 'viewport_editor_panel');
  assert.equal(panel.readiness, 'ready');
  assert.equal(panel.projectionMode, 'software_snapshot_reference');
  assert.equal(panel.selectedTarget.kind, 'voxel_with_model_material_context');
  assert.equal(panel.selectedTarget.selectedVoxel, '(0, 0, 0)');
  assert.equal(panel.selectedTarget.editAnchor, '(1, 0, 0)');
  assert.equal(panel.selectedTarget.modelAsset, workspace.modelMaterialPreview.artifact.selectedModelAsset);
  assert.equal(panel.selectedTarget.materialAsset, workspace.modelMaterialPreview.artifact.selectedMaterialAsset);
  assert.equal(panel.previewState.editState, 'preview_pending_apply');
  assert.equal(panel.appliedState.editState, 'applied_with_authority_delta');
  assert.notEqual(panel.previewState.authorityHash, panel.appliedState.authorityHash);
  assert.notEqual(panel.previewState.renderHash, panel.appliedState.renderHash);
  assert.ok(panel.evidenceRefs.some((ref) => ref.artifactId === workspace.modelMaterialPreview.artifact.artifactId));
});

test('viewport editor panel correlates with the shared command timeline and agent readout', () => {
  const workspace = createStudioWorkspaceModel();
  const roles = workspace.viewportEditor.timelineCorrelation.map((entry) => entry.role);
  assert.deepEqual(roles, ['inspect', 'select', 'preview', 'apply', 'capture', 'export']);
  assert.deepEqual(
    workspace.viewportEditor.timelineCorrelation.map((entry) => entry.sequenceId),
    workspace.timeline.filter((entry) => ['inspection.voxel', 'selection.voxel_from_screen_point', 'preview.voxel_brush', 'authority.voxel.apply_brush', 'render.capture_before_after', 'export.agent_readout'].includes(entry.commandId)).map((entry) => entry.sequenceId),
  );
  assert.equal(workspace.exportedReadout.viewportEditor.panelId, 'viewport');
  assert.equal(workspace.exportedReadout.viewportEditor.appliedState.authorityHash, workspace.viewportEditor.appliedState.authorityHash);
  assert.ok(workspace.exportedReadout.viewportEditor.automationMarkers.includes('viewport-timeline-correlation-readout'));
});

test('viewport editor panel fails closed when visual evidence is absent', () => {
  const workspace = createStudioWorkspaceModel();
  const panel = createStudioViewportEditorPanelModel({
    voxelWorkflow: workspace.voxelWorkflow,
    modelMaterialPreview: workspace.modelMaterialPreview,
    timeline: workspace.timeline,
    visualEvidence: [],
  });
  assert.equal(panel.readiness, 'failed_closed');
  assert.equal(panel.previewState.renderHash, workspace.voxelWorkflow.evidence.renderEvidence.beforeRenderHash);
  assert.equal(panel.appliedState.renderHash, workspace.voxelWorkflow.evidence.renderEvidence.afterRenderHash);
  assert.ok(panel.knownLimitations.some((limitation) => limitation.includes('software_snapshot')));
});

test('sample viewport editor fixture records shared panel state for agent/reviewer readback', () => {
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-viewport-editor-panel.sample.json'), 'utf8')) as {
    readonly artifactKind?: string;
    readonly readiness?: string;
    readonly selectedTarget?: { readonly selectedVoxel?: string; readonly materialAsset?: string };
    readonly timelineCorrelation?: readonly { readonly role?: string; readonly commandId?: string }[];
    readonly automationMarkers?: readonly string[];
  };
  assert.equal(fixture.artifactKind, 'viewport_editor_panel');
  assert.equal(fixture.readiness, 'ready');
  assert.equal(fixture.selectedTarget?.selectedVoxel, '(0, 0, 0)');
  assert.equal(fixture.selectedTarget?.materialAsset, 'material/studio-brushed-copper');
  assert.ok(fixture.timelineCorrelation?.some((entry) => entry.role === 'preview' && entry.commandId === 'preview.voxel_brush'));
  assert.ok(fixture.automationMarkers?.includes('studio-viewport-editor-panel'));
});
