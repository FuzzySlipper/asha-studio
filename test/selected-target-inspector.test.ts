import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createStudioWorkspaceModel } from '../src/session-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('selected target inspector derives selected target fields from shared viewport and voxel evidence', () => {
  const workspace = createStudioWorkspaceModel();
  const inspector = workspace.selectedTargetInspector;
  assert.equal(inspector.artifactKind, 'selected_target_inspector');
  assert.equal(inspector.selectedTarget.selectedVoxel, workspace.viewportEditor.selectedTarget.selectedVoxel);
  assert.equal(inspector.selectedTarget.editAnchor, workspace.viewportEditor.selectedTarget.editAnchor);
  assert.equal(inspector.selectedTarget.materialAsset, workspace.modelMaterialPreview.artifact.selectedMaterialAsset);
  assert.equal(inspector.fields.find((field) => field.label === 'Selected voxel')?.value, '(0, 0, 0)');
  assert.equal(inspector.fields.find((field) => field.label === 'Edit anchor / face')?.value, '(1, 0, 0) · posX');
});

test('selected target inspector separates preview projection from applied authority state', () => {
  const inspector = createStudioWorkspaceModel().selectedTargetInspector;
  assert.equal(inspector.previewCard.posture, 'proposed_by_studio_ts');
  assert.equal(inspector.previewCard.commandId, 'preview.voxel_brush');
  assert.equal(inspector.previewCard.sequenceId, 'seq-0006');
  assert.equal(inspector.appliedCard.posture, 'validated_by_authority_rust');
  assert.equal(inspector.appliedCard.commandId, 'authority.voxel.apply_brush');
  assert.equal(inspector.appliedCard.sequenceId, 'seq-0007');
  assert.notEqual(inspector.previewCard.authorityHash, inspector.appliedCard.authorityHash);
  assert.notEqual(inspector.previewCard.renderHash, inspector.appliedCard.renderHash);
});

test('selected target inspector records authority transition and render-projection limitation', () => {
  const inspector = createStudioWorkspaceModel().selectedTargetInspector;
  assert.equal(inspector.transition.acceptedCommandCount, 1);
  assert.equal(inspector.transition.rejectedCommandCount, 0);
  assert.match(inspector.transition.authorityBeforeHash, /^grid-fnv1a-/);
  assert.match(inspector.transition.authorityAfterHash, /^grid-fnv1a-/);
  assert.equal(inspector.renderProjection.mode, 'software_snapshot_reference');
  assert.equal(inspector.renderProjection.visualEvidenceArtifactId, 'artifact-visual-before-after-0001');
  assert.match(inspector.renderProjection.limitation, /no native runtime, Agora, GPU, or performance claim/);
});

test('sample agent readout fixture carries selected target inspector', () => {
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-agent-readout.sample.json'), 'utf8')) as {
    readonly selectedTargetInspector?: {
      readonly artifactKind?: string;
      readonly previewCard?: { readonly commandId?: string };
      readonly appliedCard?: { readonly commandId?: string };
      readonly automationMarkers?: readonly string[];
    };
  };
  assert.equal(fixture.selectedTargetInspector?.artifactKind, 'selected_target_inspector');
  assert.equal(fixture.selectedTargetInspector?.previewCard?.commandId, 'preview.voxel_brush');
  assert.equal(fixture.selectedTargetInspector?.appliedCard?.commandId, 'authority.voxel.apply_brush');
  assert.ok(fixture.selectedTargetInspector?.automationMarkers?.includes('selected-target-render-projection-readout'));
});
