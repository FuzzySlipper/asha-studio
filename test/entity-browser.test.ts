import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { COMMAND_MANIFEST, requireKnownCommand, validateExampleAgainstSchema } from '@asha/command-registry';

import { computeEntityListHash, createStudioEntityBrowserModel, validateEntityBrowser, validateSelectionSync } from '../src/entity-browser';
import { createStudioWorkspaceModel } from '../src/session-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('entity browser projects every scene-view renderable as a deterministic entity', () => {
  const workspace = createStudioWorkspaceModel();
  const browser = workspace.entityBrowser;
  assert.equal(browser.artifactKind, 'entity_browser_projection');
  assert.equal(browser.readiness, 'ready');
  assert.equal(browser.entityCount, workspace.sceneView.renderables.length);
  assert.deepEqual(browser.entities.map((entity) => entity.entityId), workspace.sceneView.renderables.map((renderable) => renderable.renderableId));
  assert.deepEqual(browser.entities.map((entity) => entity.order), browser.entities.map((_, index) => index));
  // The loaded demo asset entity carries asset + material badges and a mesh ref.
  const loaded = browser.entities.find((entity) => entity.entityId === 'scene-asset:mesh/demo-crate:1');
  assert.ok(loaded);
  assert.equal(loaded.meshRef, 'mesh/demo-crate');
  assert.ok(loaded.badges.includes('asset'));
  assert.ok(loaded.badges.includes('material'));
  assert.equal(browser.diagnostics.length, 0);
});

test('entity browser selection syncs to the viewport renderable through the shared command path', () => {
  const workspace = createStudioWorkspaceModel();
  const browser = workspace.entityBrowser;
  assert.equal(browser.selection.commandId, 'selection.set_active_entity');
  assert.equal(browser.selection.selectedEntityId, workspace.sceneView.selection.selectedRenderableId);
  assert.equal(browser.selection.viewportRenderableId, workspace.sceneView.selection.selectedRenderableId);
  assert.equal(browser.selection.inSync, true);
  // selectionHash is sourced from the typed selection.set_active_entity command result output.
  const selectResult = workspace.commandResults.find((entry) => entry.commandId === 'selection.set_active_entity');
  assert.ok(selectResult?.output && 'selectionHash' in selectResult.output);
  if (selectResult?.output && 'selectionHash' in selectResult.output) {
    assert.equal(browser.selection.selectionHash, selectResult.output.selectionHash);
  }
  // The selection command is recorded in the shared GUI/agent timeline.
  const selectEntry = workspace.timeline.find((entry) => entry.commandId === 'selection.set_active_entity');
  assert.ok(selectEntry);
  assert.equal(browser.selection.sequenceId, selectEntry.sequenceId);
  assert.match(selectEntry.inputSummary, /entityId=selected-voxel:0,0,0/);
  const selected = browser.entities.find((entity) => entity.selected);
  assert.equal(selected?.entityId, workspace.sceneView.selection.selectedRenderableId);
  assert.ok(selected?.badges.includes('selected'));
});

test('entity browser fails closed on drift, missing selection, stale list, and private sources', () => {
  const entities = [
    { entityId: 'a', sourceState: 'authoritative_rust_state', selected: true },
    { entityId: 'b', sourceState: 'browser_projection_reference', selected: false },
  ];
  const sceneIds = ['a', 'b'];
  const hash = computeEntityListHash(entities);
  assert.deepEqual(validateEntityBrowser({ entities, selectedEntityId: 'a', sceneRenderableIds: sceneIds, recordedHash: hash, recomputedHash: hash }), []);

  const drift = validateEntityBrowser({ entities: entities.slice(0, 1), selectedEntityId: 'a', sceneRenderableIds: sceneIds, recordedHash: hash, recomputedHash: hash });
  assert.ok(drift.some((diagnostic) => diagnostic.code === 'hierarchy_readback_drift'));

  const missing = validateEntityBrowser({ entities, selectedEntityId: 'missing', sceneRenderableIds: sceneIds, recordedHash: hash, recomputedHash: hash });
  assert.ok(missing.some((diagnostic) => diagnostic.code === 'missing_selected_entity'));

  const stale = validateEntityBrowser({ entities, selectedEntityId: 'a', sceneRenderableIds: sceneIds, recordedHash: 'entity-list-stale', recomputedHash: hash });
  assert.ok(stale.some((diagnostic) => diagnostic.code === 'stale_entity_list'));

  const privateSource = validateEntityBrowser({
    entities: [...entities, { entityId: 'c', sourceState: 'private_ecs_internal', selected: false }],
    selectedEntityId: 'a',
    sceneRenderableIds: [...sceneIds, 'c'],
    recordedHash: hash,
    recomputedHash: hash,
  });
  assert.ok(privateSource.some((diagnostic) => diagnostic.code === 'unsupported_private_entity_source'));
});

test('entity browser negative smokes all fail closed with their classified code', () => {
  const smokes = createStudioWorkspaceModel().entityBrowser.negativeSmokes;
  assert.equal(smokes.length, 5);
  for (const code of ['hierarchy_readback_drift', 'missing_selected_entity', 'stale_entity_list', 'unsupported_private_entity_source', 'selection_sync_mismatch'] as const) {
    const smoke = smokes.find((entry) => entry.code === code);
    assert.ok(smoke, `missing smoke ${code}`);
    assert.equal(smoke.actualOutcome, 'failed_closed');
    assert.ok(smoke.diagnosticCodes.includes(code));
  }
});

test('selection.set_active_entity command result matches its public output schema and carries the selection', () => {
  const workspace = createStudioWorkspaceModel();
  const result = workspace.commandResults.find((entry) => entry.commandId === 'selection.set_active_entity');
  assert.ok(result);
  const command = requireKnownCommand('selection.set_active_entity', COMMAND_MANIFEST);
  // Finding 1 regression: the actual Studio command result output validates against the registry schema.
  assert.deepEqual(validateExampleAgainstSchema('selection.set_active_entity', 'typedOutputExample', result.output ?? {}, command.outputSchema.shape), []);
  assert.ok(result.output && 'entityId' in result.output);
  if (result.output && 'entityId' in result.output) {
    assert.equal(result.output.entityId, workspace.sceneView.selection.selectedRenderableId);
    assert.equal(result.output.renderableId, workspace.sceneView.selection.selectedRenderableId);
    assert.equal(result.output.selected, true);
  }
  // And the command result records the active selection in state.selectedAfter.
  assert.equal(result.state.selectedAfter?.kind, 'object');
  assert.equal(result.state.selectedAfter?.objectId, workspace.sceneView.selection.selectedRenderableId);
});

test('entity browser fails closed when the selection command selected a different entity than the viewport', () => {
  const workspace = createStudioWorkspaceModel();
  // Finding 2 regression: a selection command that selected a different entity must NOT report ready.
  const mismatchedResults = workspace.commandResults.map((result) =>
    result.commandId === 'selection.set_active_entity' && result.output && 'entityId' in result.output
      ? { ...result, output: { ...result.output, entityId: 'scene-asset:mesh/demo-crate:1', renderableId: 'scene-asset:mesh/demo-crate:1' } }
      : result,
  );
  const browser = createStudioEntityBrowserModel({ sceneView: workspace.sceneView, timeline: workspace.timeline, commandResults: mismatchedResults });
  assert.equal(browser.readiness, 'failed_closed');
  assert.equal(browser.selection.inSync, false);
  assert.ok(browser.diagnostics.some((diagnostic) => diagnostic.code === 'selection_sync_mismatch'));
});

test('validateSelectionSync flags missing and mismatched selection commands', () => {
  const ids = ['selected-voxel:0,0,0', 'scene-asset:mesh/demo-crate:1'];
  assert.deepEqual(validateSelectionSync({ commandPresent: true, commandEntityId: 'selected-voxel:0,0,0', commandRenderableId: 'selected-voxel:0,0,0', commandSelected: true, viewportSelectedRenderableId: 'selected-voxel:0,0,0', entityIds: ids }), []);
  assert.ok(validateSelectionSync({ commandPresent: false, commandEntityId: null, commandRenderableId: null, commandSelected: false, viewportSelectedRenderableId: 'selected-voxel:0,0,0', entityIds: ids }).some((d) => d.code === 'missing_selection_command'));
  assert.ok(validateSelectionSync({ commandPresent: true, commandEntityId: 'scene-asset:mesh/demo-crate:1', commandRenderableId: 'scene-asset:mesh/demo-crate:1', commandSelected: true, viewportSelectedRenderableId: 'selected-voxel:0,0,0', entityIds: ids }).some((d) => d.code === 'selection_sync_mismatch'));
});

test('entity browser is exported through the agent readout and sample fixture', () => {
  const workspace = createStudioWorkspaceModel();
  assert.equal(workspace.exportedReadout.entityBrowser.artifactKind, 'entity_browser_projection');
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-entity-browser.sample.json'), 'utf8')) as {
    readonly artifactKind?: string;
    readonly readiness?: string;
    readonly entityCount?: number;
    readonly selection?: { readonly inSync?: boolean; readonly commandId?: string };
    readonly negativeSmokes?: readonly unknown[];
  };
  assert.equal(fixture.artifactKind, 'entity_browser_projection');
  assert.equal(fixture.readiness, 'ready');
  assert.equal(fixture.entityCount, 6);
  assert.equal(fixture.selection?.inSync, true);
  assert.equal(fixture.selection?.commandId, 'selection.set_active_entity');
  assert.equal(fixture.negativeSmokes?.length, 5);
});
