#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, 'artifacts', 'runtime-bridge', 'latest', 'index.json');

function fail(message) {
  console.error(`asha-studio runtime bridge proof readback: FAIL: ${message}`);
  process.exit(1);
}

if (!existsSync(artifactPath)) fail('missing artifacts/runtime-bridge/latest/index.json; run pnpm run proof:runtime-bridge first');
const proof = JSON.parse(readFileSync(artifactPath, 'utf8'));

if (proof.schemaVersion !== 1) fail(`schemaVersion must be 1, got ${proof.schemaVersion}`);
if (proof.artifactKind !== 'studio_runtime_bridge_integration_proof') fail(`artifactKind mismatch: ${proof.artifactKind}`);
if (proof.taskId !== 3220) fail(`taskId must be 3220, got ${proof.taskId}`);
if (proof.proofCommand !== 'pnpm run proof:runtime-bridge') fail(`proofCommand mismatch: ${proof.proofCommand}`);
if (proof.readiness !== 'ready') fail(`readiness is ${proof.readiness}`);
if (proof.runtimeMode !== 'native') fail(`runtimeMode must be native, got ${proof.runtimeMode}`);
if (proof.authoritySource !== 'rust_native_runtime_bridge') fail(`authoritySource mismatch: ${proof.authoritySource}`);
if (proof.evidence?.metadata?.compatibilityVersion !== 'runtime-bridge.v0') fail(`runtime bridge compatibility mismatch: ${proof.evidence?.metadata?.compatibilityVersion}`);
if (proof.evidence?.metadata?.packageVersion !== '0.1.0') fail(`runtime bridge package version mismatch: ${proof.evidence?.metadata?.packageVersion}`);
if (proof.evidence?.metadata?.importedFromPackageRoot !== true) fail('runtime bridge must be imported from package root');

const required = ['initialize_engine', 'submit_commands', 'read_render_diffs', 'load_replay_fixture', 'run_replay_step'];
const manifestNames = new Set((proof.evidence?.operations?.manifestOperations ?? []).map((operation) => operation.manifestName));
for (const operation of required) {
  if (!manifestNames.has(operation)) fail(`missing manifest operation ${operation}`);
}
if (!(proof.evidence?.operations?.stableOperationCount >= 1)) fail('stable operation count missing');

const command = proof.evidence?.command;
if (command?.commandId !== 'authority.voxel.apply_brush') fail(`command id mismatch: ${command?.commandId}`);
if (!String(command?.sequenceId ?? '').startsWith('seq-')) fail(`command sequence id malformed: ${command?.sequenceId}`);
if (command?.commandResult?.accepted !== command?.commandBatch?.commands?.length) fail('runtime command did not accept every typed VoxelCommand');
if (command?.commandResult?.rejected !== 0) fail(`runtime command rejected ${command?.commandResult?.rejected}`);
if (command?.authorityBeforeHash === command?.authorityAfterHash) fail('authority hashes did not change');
if (command?.snapshotBeforeId === command?.snapshotAfterId) fail('snapshot ids did not change');

const render = proof.evidence?.render;
if (!Array.isArray(render?.renderDiff?.ops)) fail('renderDiff must carry an ops array');
if (typeof render?.renderReadbackHash !== 'string' || !render.renderReadbackHash.startsWith('runtime-render-')) fail('render readback hash missing');
if (render?.snapshotId !== command?.snapshotAfterId) fail('render readback snapshot must match command after snapshot');

const replay = proof.evidence?.replay;
if (replay?.replayMode !== 'quarantined_runtime_facade') fail(`replay mode mismatch: ${replay?.replayMode}`);
if (replay?.replayStep?.diverged !== false) fail('replay step diverged');
if (replay?.replayStep?.hash !== replay?.expectedHash) fail('replay hash mismatch');
if (typeof replay?.replayRecordId !== 'string' || !replay.replayRecordId.startsWith('runtime-replay-')) fail('replay record id missing');

if ((proof.diagnostics ?? []).length !== 0) fail(`unexpected diagnostics: ${proof.diagnostics.map((item) => item.code).join(', ')}`);
const expectedSmokes = {
  negative_missing_runtime_bridge_metadata: 'missing_runtime_bridge_metadata',
  negative_runtime_bridge_version_mismatch: 'runtime_bridge_version_mismatch',
  negative_missing_facade_operation: 'missing_facade_operation',
  negative_stale_runtime_snapshot: 'stale_runtime_snapshot',
  negative_replay_mismatch: 'replay_mismatch',
  negative_raw_transport_bypass: 'raw_transport_bypass',
};
const smokeById = new Map((proof.negativeSmokes ?? []).map((smoke) => [smoke.smokeId, smoke]));
for (const [smokeId, code] of Object.entries(expectedSmokes)) {
  const smoke = smokeById.get(smokeId);
  if (smoke === undefined) fail(`missing negative smoke ${smokeId}`);
  if (smoke.actualOutcome !== 'failed_closed') fail(`${smokeId} did not fail closed`);
  if (!smoke.diagnosticCodes?.includes(code)) fail(`${smokeId} missing diagnostic ${code}`);
}

if ((proof.evidence?.rawTransportImports ?? []).length !== 0) fail('proof referenced raw transport imports');

console.log(`asha-studio runtime bridge proof readback: OK (${proof.summary.stableOperationCount} stable op(s), ${proof.negativeSmokes.length} negative smoke(s))`);
