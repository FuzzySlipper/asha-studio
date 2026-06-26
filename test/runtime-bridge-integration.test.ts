import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  buildStudioRuntimeBridgeIntegrationProof,
  runtimeBridgeTimelineCorrelation,
  validateRuntimeBridgeIntegration,
  type StudioRuntimeBridgeIntegrationEvidence,
} from '../src/runtime-bridge-integration';
import { createStudioWorkspaceModel } from '../src/session-workspace';

const root = process.cwd();

function sampleEvidence(): StudioRuntimeBridgeIntegrationEvidence {
  return {
    metadata: {
      packageName: '@asha/runtime-bridge',
      compatibilityVersion: 'runtime-bridge.v0',
      packageVersion: '0.1.0',
      ashaCommit: 'asha-head',
      importedFromPackageRoot: true,
    },
    operations: {
      stableOperationCount: 18,
      manifestOperations: [
        { manifestName: 'initialize_engine', facadeMethod: 'initializeEngine', surface: 'stable' },
        { manifestName: 'submit_commands', facadeMethod: 'submitCommands', surface: 'stable' },
        { manifestName: 'read_render_diffs', facadeMethod: 'readRenderDiffs', surface: 'stable' },
        { manifestName: 'load_replay_fixture', facadeMethod: 'loadReplayFixture', surface: 'quarantined' },
        { manifestName: 'run_replay_step', facadeMethod: 'runReplayStep', surface: 'quarantined' },
      ],
      requiredOperationNames: ['initialize_engine', 'submit_commands', 'read_render_diffs', 'load_replay_fixture', 'run_replay_step'],
    },
    command: {
      commandId: 'authority.voxel.apply_brush',
      sequenceId: 'seq-0008',
      runtimeSessionId: 'native-engine-1',
      snapshotBeforeId: 'snapshot:before',
      snapshotAfterId: 'snapshot:after',
      authorityBeforeHash: 'before',
      authorityAfterHash: 'after',
      commandBatch: { commands: [{ op: 'setVoxel', grid: 0, coord: { x: 1, y: 0, z: 0 }, value: { kind: 'solid', material: 1 } }] },
      commandResult: { accepted: 1, rejected: 0, rejections: [] },
    },
    render: {
      snapshotId: 'snapshot:after',
      frameCursor: 0,
      renderDiff: { ops: [] },
      renderReadbackHash: 'runtime-render-00000001',
    },
    replay: {
      replayMode: 'quarantined_runtime_facade',
      replayRecordId: 'runtime-replay-00000001',
      replayStep: { step: 1, hash: 'mock-0-1', diverged: false },
      expectedHash: 'mock-0-1',
    },
    rawTransportImports: [],
  };
}

test('runtime bridge integration proof accepts package-root facade evidence', () => {
  const proof = buildStudioRuntimeBridgeIntegrationProof(sampleEvidence());
  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.artifactKind, 'studio_runtime_bridge_integration_proof');
  assert.equal(proof.taskId, 3220);
  assert.equal(proof.readiness, 'ready');
  assert.equal(proof.runtimeMode, 'native');
  assert.equal(proof.authoritySource, 'rust_native_runtime_bridge');
  assert.equal(proof.summary.runtimeBridgeVersion, 'runtime-bridge.v0');
  assert.equal(proof.summary.authorityHashChanged, true);
  assert.equal(proof.summary.acceptedCommandCount, 1);
  assert.equal(proof.diagnostics.length, 0);
  assert.equal(proof.negativeSmokes.length, 6);
  assert.ok(proof.negativeSmokes.every((smoke) => smoke.actualOutcome === 'failed_closed'));
});

test('runtime bridge integration validation fails closed on required negative cases', () => {
  const base = sampleEvidence();
  assert.deepEqual(validateRuntimeBridgeIntegration({ ...base, metadata: { ...base.metadata, compatibilityVersion: null } }).map((item) => item.code), ['missing_runtime_bridge_metadata']);
  assert.ok(validateRuntimeBridgeIntegration({ ...base, metadata: { ...base.metadata, compatibilityVersion: 'runtime-bridge.v999' } }).some((item) => item.code === 'runtime_bridge_version_mismatch'));
  assert.ok(validateRuntimeBridgeIntegration({ ...base, operations: { ...base.operations, manifestOperations: [] } }).some((item) => item.code === 'missing_facade_operation'));
  assert.ok(validateRuntimeBridgeIntegration({ ...base, command: { ...base.command, authorityAfterHash: base.command.authorityBeforeHash, snapshotAfterId: base.command.snapshotBeforeId } }).some((item) => item.code === 'stale_runtime_snapshot'));
  assert.ok(validateRuntimeBridgeIntegration({ ...base, replay: { ...base.replay, expectedHash: 'different' } }).some((item) => item.code === 'replay_mismatch'));
  assert.ok(validateRuntimeBridgeIntegration({ ...base, rawTransportImports: ['@asha/native-bridge'] }).some((item) => item.code === 'raw_transport_bypass'));
});

test('runtime bridge proof correlates to the shared Studio timeline', () => {
  const workspace = createStudioWorkspaceModel({ runtimeMode: 'native' });
  const apply = workspace.commandResults.find((result) => result.commandId === 'authority.voxel.apply_brush');
  assert.ok(apply);
  const evidence = {
    ...sampleEvidence(),
    command: { ...sampleEvidence().command, sequenceId: apply.sequenceId },
  };
  const proof = buildStudioRuntimeBridgeIntegrationProof(evidence);
  assert.equal(runtimeBridgeTimelineCorrelation(proof, workspace.timeline), true);
});

test('sample runtime bridge proof fixture records runtime-bridge.v0 metadata', () => {
  const proof = JSON.parse(readFileSync(join(root, 'fixtures', 'studio-runtime-bridge-proof.sample.json'), 'utf8')) as ReturnType<typeof buildStudioRuntimeBridgeIntegrationProof>;
  assert.equal(proof.readiness, 'ready');
  assert.equal(proof.evidence.metadata.compatibilityVersion, 'runtime-bridge.v0');
  assert.equal(proof.evidence.command.commandId, 'authority.voxel.apply_brush');
  assert.equal(proof.evidence.command.commandResult.rejected, 0);
  assert.equal(proof.evidence.replay.replayStep.diverged, false);
});
