import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createStudioShellModel, getVisibleCommands } from '../src/studio-model';

test('studio shell exposes editor dock frame regions for the Unity-ish layout slice', () => {
  const model = createStudioShellModel();
  assert.deepEqual(model.editorShellRegions.map((region) => region.automationLabel), [
    'studio-editor-app-status-bar',
    'studio-editor-left-scene-hierarchy-dock',
    'studio-editor-central-viewport-dock',
    'studio-editor-right-inspector-dock',
    'studio-editor-bottom-command-evidence-dock',
  ]);
  assert.equal(model.editorShellRegions.find((region) => region.id === 'centralViewportDock')?.status, 'implemented_frame');
  assert.equal(model.editorShellRegions.find((region) => region.id === 'leftHierarchyDock')?.status, 'implemented_frame');
  assert.equal(model.editorShellRegions.find((region) => region.id === 'rightInspectorDock')?.status, 'implemented_frame');
});

test('studio shell exposes every required V1 panel', () => {
  const model = createStudioShellModel();
  assert.deepEqual(model.panels.map((panel) => panel.id), ['scenario', 'viewport', 'palette', 'timeline', 'inspector', 'evidence', 'modelMaterial', 'batchUndo']);
  assert.equal(model.panels.find((panel) => panel.id === 'viewport')?.status, 'ready');
  assert.equal(model.panels.find((panel) => panel.id === 'viewport')?.title, 'Viewport Editor Panel');
  for (const panel of model.panels) {
    assert.ok(panel.title.length > 0, panel.id);
    assert.ok(panel.summary.length > 0, panel.id);
    assert.match(panel.automationLabel, /^studio-panel-/);
  }
});

test('studio shell consumes the ASHA command registry catalog as visible command source', () => {
  const model = createStudioShellModel();
  assert.equal(model.commandCatalog.generatedFrom, 'COMMAND_MANIFEST');
  assert.ok(model.visibleCommands.length >= 10);
  assert.equal(model.visibleCommands.length, getVisibleCommands(model.commandCatalog).length);
  assert.ok(model.visibleCommands.some((command) => command.id === 'authority.voxel.apply_brush'));
  for (const command of model.visibleCommands) {
    assert.equal(command.guiMirror.required, true, command.id);
    assert.ok(command.guiMirror.argumentSummary.length > 0, command.id);
    assert.ok(command.guiMirror.resultSummary.length > 0, command.id);
    assert.ok(command.menuPath.length > 0, command.id);
  }
});

test('studio boundary model forbids internals and records deferred public packages', () => {
  const model = createStudioShellModel();
  assert.deepEqual(model.ashaBoundary.allowedImports, ['@asha/command-registry', '@asha/contracts', '@asha/editor-tools']);
  assert.ok(model.ashaBoundary.deferredPublicPackages.includes('@asha/studio-evidence'));
  assert.ok(model.ashaBoundary.forbiddenImportExamples.includes('@asha/native-bridge'));
  assert.ok(model.knownLimitations.some((limitation) => limitation.includes('software_snapshot')));
});

test('timeline preview reflects executed workspace commands', () => {
  const model = createStudioShellModel();
  assert.ok(model.timelinePreview.length > 0);
  assert.ok(model.timelinePreview.every((entry) => entry.startsWith('seq-')));
  assert.equal(model.workspace.timeline.length, model.timelinePreview.length);
  assert.ok(model.workspace.exportedReadout.commandTimeline.length > 0);
});

test('studio shell exposes model/material public-surface preview readout', () => {
  const model = createStudioShellModel();
  assert.equal(model.workspace.modelMaterialPreview.artifact.selectedModelAsset, 'mesh/studio-preview-crate');
  assert.equal(model.workspace.modelMaterialPreview.artifact.selectedMaterialAsset, 'material/studio-brushed-copper');
  assert.equal(model.workspace.modelMaterialPreview.artifact.rendererClassification, 'contract_render_diff_reference');
  assert.ok(model.workspace.modelMaterialPreview.artifact.surfaceFindings.some((finding) => finding.surface === '@asha/command-registry' && finding.status === 'available_public'));
  assert.equal(model.workspace.modelMaterialPreview.artifact.blockingFeatureRequests.length, 0);
});

test('studio shell exposes command batch and revert metadata readout', () => {
  const model = createStudioShellModel();
  assert.equal(model.workspace.commandBatch.invocation.mode, 'atomic');
  assert.equal(model.workspace.commandBatch.result.commandResults.length, model.workspace.commandBatch.invocation.commands.length);
  assert.equal(model.workspace.commandBatch.bestEffortFailureExample.failureClassification, 'state_hash_mismatch');
  assert.equal(model.workspace.commandBatch.revertWorkflow.status, 'available');
});
