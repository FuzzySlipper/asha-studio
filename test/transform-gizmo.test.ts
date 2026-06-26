import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { COMMAND_MANIFEST, requireKnownCommand, validateExampleAgainstSchema } from '@asha/command-registry';

import {
  computeGizmoHash,
  createStudioTransformGizmoModel,
  validateGizmoEdit,
  validateGizmoHandles,
  validateGizmoMutationSource,
  validateGizmoPreview,
  validateGizmoSelection,
} from '../src/transform-gizmo';
import { createStudioWorkspaceModel } from '../src/session-workspace';
import { buildStudioViewport3dReadback } from '../src/viewport3d-host';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('gizmo projects the selected entity with three handles and one active axis', () => {
  const workspace = createStudioWorkspaceModel();
  const gizmo = workspace.transformGizmo;
  assert.equal(gizmo.artifactKind, 'transform_gizmo');
  assert.equal(gizmo.readiness, 'ready');
  assert.equal(gizmo.operation, 'translate');
  assert.equal(gizmo.selectedEntityId, workspace.sceneView.selection.selectedRenderableId);
  assert.deepEqual(gizmo.handles.map((handle) => handle.axis), ['x', 'y', 'z']);
  assert.ok(gizmo.handles.every((handle) => handle.visible));
  const active = gizmo.handles.filter((handle) => handle.active);
  assert.deepEqual(active.map((handle) => handle.axis), ['x']);
  assert.equal(active[0]?.commandId, 'transform.translate_entity');
  // Non-active axis handles are visible but not yet command-wired in this slice.
  assert.ok(gizmo.handles.filter((handle) => !handle.active).every((handle) => handle.commandId === null));
  assert.equal(gizmo.diagnostics.length, 0);
});

test('gizmo translate flows through preview + apply on the shared timeline and updates the viewport readback', () => {
  const workspace = createStudioWorkspaceModel();
  const gizmo = workspace.transformGizmo;
  assert.equal(gizmo.edit.commandId, 'transform.translate_entity');
  assert.equal(gizmo.edit.applied, true);
  assert.equal(gizmo.edit.inSync, true);
  assert.equal(gizmo.edit.mutationSource, 'transform.translate_entity_command');
  assert.notDeepEqual(gizmo.transform.after, gizmo.transform.before);
  assert.deepEqual(gizmo.transform.before, [0.5, 0.5, 0.5]);
  assert.deepEqual(gizmo.transform.after, [2.5, 0.5, 0.5]);

  // Both preview and apply are recorded as typed commands on the shared timeline (distinct sequences).
  const translateEntries = workspace.timeline.filter((entry) => entry.commandId === 'transform.translate_entity');
  assert.equal(translateEntries.length, 2);
  assert.equal(gizmo.edit.previewSequenceId, translateEntries[0]?.sequenceId);
  assert.equal(gizmo.edit.applySequenceId, translateEntries[1]?.sequenceId);
  assert.notEqual(gizmo.edit.previewSequenceId, gizmo.edit.applySequenceId);

  // transformHash is sourced from the typed apply command result output.
  const applyResult = workspace.commandResults.find((entry) => entry.commandId === 'transform.translate_entity' && entry.output && 'mode' in entry.output && entry.output.mode === 'apply');
  assert.ok(applyResult?.output && 'transformHash' in applyResult.output);
  if (applyResult?.output && 'transformHash' in applyResult.output) {
    assert.equal(gizmo.edit.transformHash, applyResult.output.transformHash);
  }

  // Viewport readback: the 3D readback surfaces the gizmo before/after translation and handles.
  const viewport = buildStudioViewport3dReadback(workspace.sceneView, gizmo);
  assert.ok(viewport.transformGizmo);
  assert.equal(viewport.transformGizmo?.activeAxis, 'x');
  assert.equal(viewport.transformGizmo?.applied, true);
  assert.deepEqual(viewport.transformGizmo?.translationBefore, gizmo.transform.before);
  assert.deepEqual(viewport.transformGizmo?.translationAfter, gizmo.transform.after);
  assert.ok(viewport.semanticMarkers.includes('gizmo-handle-x'));
  assert.ok(viewport.semanticMarkers.includes(`gizmo-translate:x:${gizmo.transform.delta}`));
  // Without a gizmo argument the readback stays gizmo-free (backwards compatible).
  assert.equal(buildStudioViewport3dReadback(workspace.sceneView).transformGizmo, null);
});

test('transform.translate_entity command results match the public output schema for preview and apply', () => {
  const workspace = createStudioWorkspaceModel();
  const command = requireKnownCommand('transform.translate_entity', COMMAND_MANIFEST);
  const results = workspace.commandResults.filter((entry) => entry.commandId === 'transform.translate_entity');
  assert.equal(results.length, 2);
  for (const result of results) {
    assert.deepEqual(validateExampleAgainstSchema('transform.translate_entity', 'typedOutputExample', result.output ?? {}, command.outputSchema.shape), []);
    assert.ok(result.output && 'mode' in result.output);
  }
  const preview = results.find((entry) => entry.output && 'mode' in entry.output && entry.output.mode === 'preview');
  const apply = results.find((entry) => entry.output && 'mode' in entry.output && entry.output.mode === 'apply');
  assert.ok(preview?.output && 'applied' in preview.output ? preview.output.applied === false : false);
  assert.ok(apply?.output && 'applied' in apply.output ? apply.output.applied === true : false);
  // The apply command records the translated entity selection in state.selectedAfter.
  assert.equal(apply?.state.selectedAfter?.kind, 'object');
  assert.equal(apply?.state.selectedAfter?.objectId, workspace.sceneView.selection.selectedRenderableId);
});

test('gizmo fails closed when the apply command moved a different entity than the gizmo readback', () => {
  const workspace = createStudioWorkspaceModel();
  const mismatched = workspace.commandResults.map((result) =>
    result.commandId === 'transform.translate_entity' && result.output && 'translationAfter' in result.output && result.output.mode === 'apply'
      ? { ...result, output: { ...result.output, translationAfter: [9, 9, 9] as const } }
      : result,
  );
  const gizmo = createStudioTransformGizmoModel({ sceneView: workspace.sceneView, timeline: workspace.timeline, commandResults: mismatched });
  assert.equal(gizmo.readiness, 'failed_closed');
  assert.equal(gizmo.edit.inSync, false);
  assert.ok(gizmo.diagnostics.some((diagnostic) => diagnostic.code === 'transform_readback_mismatch'));
});

test('gizmo fails closed when the apply command reports a stale before-translation', () => {
  const workspace = createStudioWorkspaceModel();
  const staleBefore = workspace.commandResults.map((result) =>
    result.commandId === 'transform.translate_entity' && result.output && 'translationBefore' in result.output && result.output.mode === 'apply'
      ? { ...result, output: { ...result.output, translationBefore: [99, 99, 99] as const } }
      : result,
  );
  const gizmo = createStudioTransformGizmoModel({ sceneView: workspace.sceneView, timeline: workspace.timeline, commandResults: staleBefore });
  assert.equal(gizmo.readiness, 'failed_closed');
  assert.equal(gizmo.edit.inSync, false);
  assert.ok(gizmo.diagnostics.some((diagnostic) => diagnostic.code === 'transform_readback_mismatch'));
});

test('gizmo fails closed when the preview command previews a different translation than expected', () => {
  const workspace = createStudioWorkspaceModel();
  const stalePreview = workspace.commandResults.map((result) =>
    result.commandId === 'transform.translate_entity' && result.output && 'translationAfter' in result.output && result.output.mode === 'preview'
      ? { ...result, output: { ...result.output, translationAfter: [99, 99, 99] as const } }
      : result,
  );
  const gizmo = createStudioTransformGizmoModel({ sceneView: workspace.sceneView, timeline: workspace.timeline, commandResults: stalePreview });
  assert.equal(gizmo.readiness, 'failed_closed');
  assert.equal(gizmo.edit.inSync, false);
  assert.deepEqual(gizmo.transform.preview, [99, 99, 99]);
  assert.notDeepEqual(gizmo.transform.after, gizmo.transform.preview);
  assert.ok(gizmo.diagnostics.some((diagnostic) => diagnostic.code === 'transform_readback_mismatch'));
});

test('gizmo fails closed when the apply command is absent (no committed public transform)', () => {
  const workspace = createStudioWorkspaceModel();
  const withoutApply = workspace.commandResults.filter((result) => !(result.commandId === 'transform.translate_entity' && result.output && 'mode' in result.output && result.output.mode === 'apply'));
  const gizmo = createStudioTransformGizmoModel({ sceneView: workspace.sceneView, timeline: workspace.timeline, commandResults: withoutApply });
  assert.equal(gizmo.readiness, 'failed_closed');
  assert.equal(gizmo.edit.applied, false);
  // Nothing was committed through the public command, so the mutation source is not the command result.
  assert.equal(gizmo.edit.mutationSource, 'private_ui_callback');
  assert.ok(gizmo.diagnostics.some((diagnostic) => diagnostic.code === 'transform_readback_mismatch'));
  // The private_mutation_path classification is exercised by the negative smoke (applied via a private path).
  const privateSmoke = gizmo.negativeSmokes.find((smoke) => smoke.code === 'private_mutation_path');
  assert.equal(privateSmoke?.actualOutcome, 'failed_closed');
});

test('validateGizmoSelection flags missing, drift, and stale gizmo selection', () => {
  const ids = ['selected-voxel:0,0,0', 'scene-asset:mesh/demo-crate:1'];
  const hash = computeGizmoHash({ entityId: 'selected-voxel:0,0,0', axis: 'x', translationBefore: [0.5, 0.5, 0.5], translationAfter: [2.5, 0.5, 0.5], handleAxes: ['x', 'y', 'z'] });
  assert.deepEqual(validateGizmoSelection({ selectedEntityId: 'selected-voxel:0,0,0', sceneRenderableIds: ids, viewportSelectedRenderableId: 'selected-voxel:0,0,0', recordedHash: hash, recomputedHash: hash }), []);
  assert.ok(validateGizmoSelection({ selectedEntityId: 'nope', sceneRenderableIds: ids, viewportSelectedRenderableId: 'nope', recordedHash: hash, recomputedHash: hash }).some((d) => d.code === 'missing_selected_entity'));
  assert.ok(validateGizmoSelection({ selectedEntityId: 'selected-voxel:0,0,0', sceneRenderableIds: ids, viewportSelectedRenderableId: 'scene-asset:mesh/demo-crate:1', recordedHash: hash, recomputedHash: hash }).some((d) => d.code === 'stale_gizmo_selection'));
  assert.ok(validateGizmoSelection({ selectedEntityId: 'selected-voxel:0,0,0', sceneRenderableIds: ids, viewportSelectedRenderableId: 'selected-voxel:0,0,0', recordedHash: 'stale', recomputedHash: hash }).some((d) => d.code === 'stale_gizmo_selection'));
});

test('validateGizmoHandles, validateGizmoEdit, and validateGizmoMutationSource fail closed', () => {
  const handles = [{ axis: 'x' as const, visible: true, commandId: 'transform.translate_entity' }, { axis: 'y' as const, visible: true, commandId: null }];
  assert.deepEqual(validateGizmoHandles({ handles, activeAxis: 'x' }), []);
  assert.ok(validateGizmoHandles({ handles, activeAxis: 'y' }).some((d) => d.code === 'missing_gizmo_handle'));
  assert.ok(validateGizmoHandles({ handles: handles.filter((h) => h.axis !== 'x'), activeAxis: 'x' }).some((d) => d.code === 'missing_gizmo_handle'));

  const ok = validateGizmoEdit({ commandPresent: true, commandEntityId: 'e', commandRenderableId: 'e', commandAxis: 'x', commandApplied: true, commandTranslationBefore: [0.5, 0.5, 0.5], commandTranslationAfter: [2.5, 0.5, 0.5], recordedAxis: 'x', recordedTranslationBefore: [0.5, 0.5, 0.5], recordedTranslationAfter: [2.5, 0.5, 0.5], viewportSelectedRenderableId: 'e' });
  assert.deepEqual(ok, []);
  assert.ok(validateGizmoEdit({ commandPresent: false, commandEntityId: null, commandRenderableId: null, commandAxis: null, commandApplied: false, commandTranslationBefore: null, commandTranslationAfter: null, recordedAxis: 'x', recordedTranslationBefore: [0.5, 0.5, 0.5], recordedTranslationAfter: [2.5, 0.5, 0.5], viewportSelectedRenderableId: 'e' }).some((d) => d.code === 'transform_readback_mismatch'));
  assert.ok(validateGizmoEdit({ commandPresent: true, commandEntityId: 'e', commandRenderableId: 'e', commandAxis: 'x', commandApplied: true, commandTranslationBefore: [0.5, 0.5, 0.5], commandTranslationAfter: [9, 0.5, 0.5], recordedAxis: 'x', recordedTranslationBefore: [0.5, 0.5, 0.5], recordedTranslationAfter: [2.5, 0.5, 0.5], viewportSelectedRenderableId: 'e' }).some((d) => d.code === 'transform_readback_mismatch'));
  // A stale before-translation fails closed even when the after-translation is correct.
  assert.ok(validateGizmoEdit({ commandPresent: true, commandEntityId: 'e', commandRenderableId: 'e', commandAxis: 'x', commandApplied: true, commandTranslationBefore: [99, 99, 99], commandTranslationAfter: [2.5, 0.5, 0.5], recordedAxis: 'x', recordedTranslationBefore: [0.5, 0.5, 0.5], recordedTranslationAfter: [2.5, 0.5, 0.5], viewportSelectedRenderableId: 'e' }).some((d) => d.code === 'transform_readback_mismatch'));

  // Preview must target the same entity/axis, preview the expected after, and stay uncommitted (applied=false).
  const previewOk = validateGizmoPreview({ previewPresent: true, commandEntityId: 'e', commandRenderableId: 'e', commandAxis: 'x', commandApplied: false, commandTranslationAfter: [2.5, 0.5, 0.5], recordedAxis: 'x', expectedPreviewAfter: [2.5, 0.5, 0.5], viewportSelectedRenderableId: 'e' });
  assert.deepEqual(previewOk, []);
  assert.ok(validateGizmoPreview({ previewPresent: false, commandEntityId: null, commandRenderableId: null, commandAxis: null, commandApplied: null, commandTranslationAfter: null, recordedAxis: 'x', expectedPreviewAfter: [2.5, 0.5, 0.5], viewportSelectedRenderableId: 'e' }).some((d) => d.code === 'transform_readback_mismatch'));
  assert.ok(validateGizmoPreview({ previewPresent: true, commandEntityId: 'e', commandRenderableId: 'e', commandAxis: 'x', commandApplied: true, commandTranslationAfter: [2.5, 0.5, 0.5], recordedAxis: 'x', expectedPreviewAfter: [2.5, 0.5, 0.5], viewportSelectedRenderableId: 'e' }).some((d) => d.code === 'transform_readback_mismatch'));
  assert.ok(validateGizmoPreview({ previewPresent: true, commandEntityId: 'e', commandRenderableId: 'e', commandAxis: 'x', commandApplied: false, commandTranslationAfter: [9, 0.5, 0.5], recordedAxis: 'x', expectedPreviewAfter: [2.5, 0.5, 0.5], viewportSelectedRenderableId: 'e' }).some((d) => d.code === 'transform_readback_mismatch'));

  assert.deepEqual(validateGizmoMutationSource({ applied: true, mutationSource: 'transform.translate_entity_command' }), []);
  assert.ok(validateGizmoMutationSource({ applied: true, mutationSource: 'private_ui_callback' }).some((d) => d.code === 'private_mutation_path'));
});

test('gizmo negative smokes all fail closed with their classified code', () => {
  const smokes = createStudioWorkspaceModel().transformGizmo.negativeSmokes;
  assert.equal(smokes.length, 7);
  assert.ok(smokes.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.diagnosticCodes.includes(smoke.code)));
  for (const code of ['missing_selected_entity', 'stale_gizmo_selection', 'missing_gizmo_handle', 'transform_readback_mismatch', 'private_mutation_path'] as const) {
    assert.ok(smokes.some((smoke) => smoke.code === code), `missing smoke ${code}`);
  }
  // transform_readback_mismatch is covered for after, before, and preview evidence.
  for (const id of ['negative:transform-readback-mismatch-after', 'negative:transform-readback-mismatch-before', 'negative:preview-readback-mismatch'] as const) {
    assert.ok(smokes.some((smoke) => smoke.id === id), `missing smoke ${id}`);
  }
});

test('gizmo is exported through the agent readout and sample fixture', () => {
  const workspace = createStudioWorkspaceModel();
  assert.equal(workspace.exportedReadout.transformGizmo.artifactKind, 'transform_gizmo');
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-transform-gizmo.sample.json'), 'utf8')) as {
    readonly artifactKind?: string;
    readonly readiness?: string;
    readonly activeAxis?: string;
    readonly edit?: { readonly applied?: boolean; readonly inSync?: boolean; readonly commandId?: string; readonly mutationSource?: string };
    readonly handles?: readonly { readonly axis?: string; readonly visible?: boolean }[];
    readonly negativeSmokes?: readonly unknown[];
  };
  assert.equal(fixture.artifactKind, 'transform_gizmo');
  assert.equal(fixture.readiness, 'ready');
  assert.equal(fixture.activeAxis, 'x');
  assert.equal(fixture.edit?.applied, true);
  assert.equal(fixture.edit?.inSync, true);
  assert.equal(fixture.edit?.commandId, 'transform.translate_entity');
  assert.equal(fixture.edit?.mutationSource, 'transform.translate_entity_command');
  assert.equal(fixture.handles?.length, 3);
  assert.equal(fixture.negativeSmokes?.length, 7);
});
