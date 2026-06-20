import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createStudioCommandBatchModel, validateCommandBatchModel } from '../src/command-batch';
import { createStudioWorkspaceModel } from '../src/session-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('atomic command batch records transaction mode and per-command result shape', () => {
  const workspace = createStudioWorkspaceModel();
  const batch = workspace.commandBatch;
  assert.equal(batch.invocation.mode, 'atomic');
  assert.equal(batch.invocation.commands.length, 2);
  assert.equal(batch.result.commandResults.length, batch.invocation.commands.length);
  assert.equal(batch.result.status, 'ok');
  assert.equal(batch.result.failureClassification, 'none');
  assert.deepEqual(batch.result.commandResults.map((result) => result.commandId), ['preview.voxel_brush', 'authority.voxel.apply_brush']);
  assert.ok(batch.result.commandResults.every((result) => result.retryClassification.length > 0));
  assert.equal(validateCommandBatchModel(batch).length, 0);
});

test('best-effort failure example classifies partial stale-state failure', () => {
  const workspace = createStudioWorkspaceModel();
  const partial = workspace.commandBatch.bestEffortFailureExample;
  assert.equal(partial.mode, 'best_effort');
  assert.equal(partial.status, 'partial');
  assert.equal(partial.failureClassification, 'state_hash_mismatch');
  assert.ok(partial.commandResults.some((result) => result.status === 'rejected'));
  assert.ok(partial.diagnostics.some((diagnostic) => diagnostic.code === 'asha-studio.batch.partial_state_hash_mismatch'));
  assert.match(partial.retrySummary, /fresh state readback/);
});

test('rejected stale-state command has no executed inverse obligation', () => {
  const workspace = createStudioWorkspaceModel();
  const partial = workspace.commandBatch.bestEffortFailureExample;
  const rejected = partial.commandResults.find((result) => result.status === 'rejected');
  assert.ok(rejected);
  assert.equal(rejected.failureClassification, 'state_hash_mismatch');
  assert.equal(rejected.changedAuthority, false);
  assert.equal(rejected.undoPosture, 'not_undoable');
  assert.deepEqual(rejected.inverseDataRequirements, []);
});

test('V1 voxel edit exposes typed safe revert metadata', () => {
  const workspace = createStudioWorkspaceModel();
  const revert = workspace.commandBatch.revertWorkflow;
  assert.equal(revert.status, 'available');
  assert.equal(revert.inverseCommand?.op, 'setVoxel');
  assert.equal(revert.inverseCommand?.value.kind, 'empty');
  assert.equal(revert.requiredSameStateHash, workspace.voxelWorkflow.evidence.authorityAfterHash);
  assert.equal(revert.expectedRevertedAuthorityHash, workspace.voxelWorkflow.evidence.authorityBeforeHash);
});

test('command batch model can be constructed from the voxel workflow without hidden command path', () => {
  const workspace = createStudioWorkspaceModel();
  const batch = createStudioCommandBatchModel({ sessionId: workspace.session.sessionId, voxelWorkflow: workspace.voxelWorkflow });
  assert.equal(batch.invocation.commands[0]?.input.kind, 'voxel_command');
  assert.equal(batch.invocation.commands[1]?.input.kind, 'voxel_command');
  assert.ok(batch.invocation.commands.every((command) => command.commandId === 'preview.voxel_brush' || command.commandId === 'authority.voxel.apply_brush'));
  assert.equal(batch.validationSummary.transactionModeRequired, true);
  assert.equal(batch.validationSummary.undoMetadataRequiredForMutatingCommands, true);
});

test('sample command batch fixture records batch result and revert workflow', () => {
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-command-batch.sample.json'), 'utf8')) as {
    readonly invocation?: { readonly mode?: string; readonly commands?: readonly object[] };
    readonly result?: { readonly status?: string; readonly commandResults?: readonly { readonly undoPosture?: string }[] };
    readonly bestEffortFailureExample?: { readonly status?: string; readonly failureClassification?: string; readonly commandResults?: readonly { readonly status?: string; readonly undoPosture?: string; readonly inverseDataRequirements?: readonly string[] }[] };
    readonly revertWorkflow?: { readonly status?: string; readonly inverseCommand?: { readonly op?: string } };
  };
  assert.equal(fixture.invocation?.mode, 'atomic');
  assert.equal(fixture.invocation?.commands?.length, 2);
  assert.equal(fixture.result?.status, 'ok');
  assert.ok(fixture.result?.commandResults?.some((result) => result.undoPosture === 'authority_reversing'));
  assert.equal(fixture.bestEffortFailureExample?.status, 'partial');
  assert.equal(fixture.bestEffortFailureExample?.failureClassification, 'state_hash_mismatch');
  const rejected = fixture.bestEffortFailureExample?.commandResults?.find((result) => result.status === 'rejected');
  assert.equal(rejected?.undoPosture, 'not_undoable');
  assert.deepEqual(rejected?.inverseDataRequirements, []);
  assert.equal(fixture.revertWorkflow?.status, 'available');
  assert.equal(fixture.revertWorkflow?.inverseCommand?.op, 'setVoxel');
});
