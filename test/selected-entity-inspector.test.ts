import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { COMMAND_MANIFEST, requireKnownCommand, validateExampleAgainstSchema } from '@asha/command-registry';

import {
  computeInspectorHash,
  createStudioSelectedEntityInspectorModel,
  validateInspectorEdit,
  validateSelectedEntityInspector,
} from '../src/selected-entity-inspector';
import { createStudioWorkspaceModel } from '../src/session-workspace';
import { buildStudioViewport3dReadback } from '../src/viewport3d-host';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('inspector projects the selected entity identity, provenance, and read-only transform', () => {
  const workspace = createStudioWorkspaceModel();
  const inspector = workspace.selectedEntityInspector;
  assert.equal(inspector.artifactKind, 'selected_entity_inspector');
  assert.equal(inspector.readiness, 'ready');
  assert.equal(inspector.selectedEntityId, workspace.sceneView.selection.selectedRenderableId);
  assert.equal(inspector.identity.entityId, workspace.sceneView.selection.selectedRenderableId);
  assert.equal(inspector.identity.kind, 'voxel_cell');
  assert.equal(inspector.identity.sourceState, 'authoritative_rust_state');
  assert.deepEqual(inspector.transform, workspace.sceneView.renderables.find((r) => r.renderableId === inspector.selectedEntityId)?.transform);
  // Exactly one editable field (name), routed through the public command; all others are read-only.
  const editable = inspector.fields.filter((field) => field.editable);
  assert.deepEqual(editable.map((field) => field.key), ['name']);
  assert.equal(editable[0]?.commandId, 'entity.set_name');
  assert.ok(inspector.fields.filter((field) => !field.editable).every((field) => field.commandId === null && field.supported));
  assert.equal(inspector.diagnostics.length, 0);
});

test('inspector name edit flows through entity.set_name on the shared timeline and updates the viewport readback', () => {
  const workspace = createStudioWorkspaceModel();
  const inspector = workspace.selectedEntityInspector;
  assert.equal(inspector.edit.commandId, 'entity.set_name');
  assert.equal(inspector.edit.fieldKey, 'name');
  assert.equal(inspector.edit.applied, true);
  assert.equal(inspector.edit.inSync, true);
  assert.notEqual(inspector.edit.nameAfter, inspector.edit.nameBefore);
  assert.equal(inspector.identity.displayName, inspector.edit.nameAfter);

  // The edit is recorded as a typed command on the shared GUI/agent timeline.
  const renameEntry = workspace.timeline.find((entry) => entry.commandId === 'entity.set_name');
  assert.ok(renameEntry);
  assert.equal(inspector.edit.sequenceId, renameEntry.sequenceId);
  assert.match(renameEntry.inputSummary, /name=Primary terrain voxel/);

  // nameHash is sourced from the typed command result output.
  const renameResult = workspace.commandResults.find((entry) => entry.commandId === 'entity.set_name');
  assert.ok(renameResult?.output && 'name' in renameResult.output);
  if (renameResult?.output && 'name' in renameResult.output) {
    assert.equal(inspector.edit.nameHash, renameResult.output.nameHash);
  }

  // Readback update: the viewport 3D readback surfaces the applied display name for the selected entity.
  assert.equal(workspace.sceneView.selectedEntityDisplayName, inspector.edit.nameAfter);
  const viewport = buildStudioViewport3dReadback(workspace.sceneView);
  assert.equal(viewport.selectedEntityName, inspector.edit.nameAfter);
  assert.ok(viewport.semanticMarkers.includes(`selected-entity-name:${inspector.edit.nameAfter}`));
});

test('entity.set_name command result matches its public output schema and carries the applied name', () => {
  const workspace = createStudioWorkspaceModel();
  const result = workspace.commandResults.find((entry) => entry.commandId === 'entity.set_name');
  assert.ok(result);
  const command = requireKnownCommand('entity.set_name', COMMAND_MANIFEST);
  // The actual Studio command-result output validates against the registry output schema.
  assert.deepEqual(validateExampleAgainstSchema('entity.set_name', 'typedOutputExample', result.output ?? {}, command.outputSchema.shape), []);
  assert.ok(result.output && 'name' in result.output);
  if (result.output && 'name' in result.output) {
    assert.equal(result.output.entityId, workspace.sceneView.selection.selectedRenderableId);
    assert.equal(result.output.renderableId, workspace.sceneView.selection.selectedRenderableId);
    assert.equal(result.output.applied, true);
  }
  // The command result records the renamed entity selection in state.selectedAfter.
  assert.equal(result.state.selectedAfter?.kind, 'object');
  assert.equal(result.state.selectedAfter?.objectId, workspace.sceneView.selection.selectedRenderableId);
});

test('inspector fails closed when entity.set_name renamed a different entity than the inspected one', () => {
  const workspace = createStudioWorkspaceModel();
  const mismatchedResults = workspace.commandResults.map((result) =>
    result.commandId === 'entity.set_name' && result.output && 'name' in result.output
      ? { ...result, output: { ...result.output, entityId: 'scene-asset:mesh/demo-crate:1', renderableId: 'scene-asset:mesh/demo-crate:1' } }
      : result,
  );
  const inspector = createStudioSelectedEntityInspectorModel({
    sceneView: workspace.sceneView,
    entityBrowser: workspace.entityBrowser,
    timeline: workspace.timeline,
    commandResults: mismatchedResults,
  });
  assert.equal(inspector.readiness, 'failed_closed');
  assert.equal(inspector.edit.inSync, false);
  assert.ok(inspector.diagnostics.some((diagnostic) => diagnostic.code === 'edit_command_mismatch'));
});

test('inspector fails closed when the rename command is absent', () => {
  const workspace = createStudioWorkspaceModel();
  const withoutRename = workspace.commandResults.filter((result) => result.commandId !== 'entity.set_name');
  const inspector = createStudioSelectedEntityInspectorModel({
    sceneView: workspace.sceneView,
    entityBrowser: workspace.entityBrowser,
    timeline: workspace.timeline.filter((entry) => entry.commandId !== 'entity.set_name'),
    commandResults: withoutRename,
  });
  assert.equal(inspector.readiness, 'failed_closed');
  assert.equal(inspector.edit.applied, false);
  assert.ok(inspector.diagnostics.some((diagnostic) => diagnostic.code === 'missing_edit_command'));
});

test('validateSelectedEntityInspector flags missing, drift, stale, and unsupported fields', () => {
  const ids = ['selected-voxel:0,0,0', 'scene-asset:mesh/demo-crate:1'];
  const hash = computeInspectorHash({ entityId: 'selected-voxel:0,0,0', displayName: 'n', sourceState: 'authoritative_rust_state', transform: { translation: { x: 0, y: 0, z: 0 }, rotationQuat: [0, 0, 0, 1], scale: { x: 1, y: 1, z: 1 } }, fieldKeys: ['name'] });
  assert.deepEqual(validateSelectedEntityInspector({ selectedEntityId: 'selected-voxel:0,0,0', sceneRenderableIds: ids, viewportSelectedRenderableId: 'selected-voxel:0,0,0', recordedHash: hash, recomputedHash: hash, fieldKeys: ['name'] }), []);
  assert.ok(validateSelectedEntityInspector({ selectedEntityId: 'nope', sceneRenderableIds: ids, viewportSelectedRenderableId: 'nope', recordedHash: hash, recomputedHash: hash, fieldKeys: ['name'] }).some((d) => d.code === 'missing_selected_entity'));
  assert.ok(validateSelectedEntityInspector({ selectedEntityId: 'selected-voxel:0,0,0', sceneRenderableIds: ids, viewportSelectedRenderableId: 'scene-asset:mesh/demo-crate:1', recordedHash: hash, recomputedHash: hash, fieldKeys: ['name'] }).some((d) => d.code === 'inspector_readback_drift'));
  assert.ok(validateSelectedEntityInspector({ selectedEntityId: 'selected-voxel:0,0,0', sceneRenderableIds: ids, viewportSelectedRenderableId: 'selected-voxel:0,0,0', recordedHash: 'stale', recomputedHash: hash, fieldKeys: ['name'] }).some((d) => d.code === 'stale_inspector_state'));
  assert.ok(validateSelectedEntityInspector({ selectedEntityId: 'selected-voxel:0,0,0', sceneRenderableIds: ids, viewportSelectedRenderableId: 'selected-voxel:0,0,0', recordedHash: hash, recomputedHash: hash, fieldKeys: ['ecsComponentBlob'] }).some((d) => d.code === 'unsupported_field_edit'));
});

test('validateInspectorEdit flags non-editable fields, missing commands, and mismatches', () => {
  const ok = validateInspectorEdit({ fieldKey: 'name', commandPresent: true, commandEntityId: 'e', commandRenderableId: 'e', commandName: 'New', commandApplied: true, recordedNameAfter: 'New', viewportSelectedRenderableId: 'e' });
  assert.deepEqual(ok, []);
  assert.ok(validateInspectorEdit({ fieldKey: 'authorityObjectId', commandPresent: true, commandEntityId: 'e', commandRenderableId: 'e', commandName: 'New', commandApplied: true, recordedNameAfter: 'New', viewportSelectedRenderableId: 'e' }).some((d) => d.code === 'unsupported_field_edit'));
  assert.ok(validateInspectorEdit({ fieldKey: 'name', commandPresent: false, commandEntityId: null, commandRenderableId: null, commandName: null, commandApplied: false, recordedNameAfter: 'New', viewportSelectedRenderableId: 'e' }).some((d) => d.code === 'missing_edit_command'));
  assert.ok(validateInspectorEdit({ fieldKey: 'name', commandPresent: true, commandEntityId: 'other', commandRenderableId: 'other', commandName: 'New', commandApplied: true, recordedNameAfter: 'New', viewportSelectedRenderableId: 'e' }).some((d) => d.code === 'edit_command_mismatch'));
});

test('inspector negative smokes all fail closed with their classified code', () => {
  const smokes = createStudioWorkspaceModel().selectedEntityInspector.negativeSmokes;
  assert.equal(smokes.length, 5);
  for (const code of ['missing_selected_entity', 'inspector_readback_drift', 'stale_inspector_state', 'unsupported_field_edit', 'edit_command_mismatch'] as const) {
    const smoke = smokes.find((entry) => entry.code === code);
    assert.ok(smoke, `missing smoke ${code}`);
    assert.equal(smoke.actualOutcome, 'failed_closed');
    assert.ok(smoke.diagnosticCodes.includes(code));
  }
});

test('inspector is exported through the agent readout and sample fixture', () => {
  const workspace = createStudioWorkspaceModel();
  assert.equal(workspace.exportedReadout.selectedEntityInspector.artifactKind, 'selected_entity_inspector');
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-selected-entity-inspector.sample.json'), 'utf8')) as {
    readonly artifactKind?: string;
    readonly readiness?: string;
    readonly edit?: { readonly applied?: boolean; readonly inSync?: boolean; readonly commandId?: string };
    readonly negativeSmokes?: readonly unknown[];
    readonly fields?: readonly { readonly editable?: boolean }[];
  };
  assert.equal(fixture.artifactKind, 'selected_entity_inspector');
  assert.equal(fixture.readiness, 'ready');
  assert.equal(fixture.edit?.applied, true);
  assert.equal(fixture.edit?.inSync, true);
  assert.equal(fixture.edit?.commandId, 'entity.set_name');
  assert.equal(fixture.negativeSmokes?.length, 5);
  assert.equal(fixture.fields?.filter((field) => field.editable).length, 1);
});
