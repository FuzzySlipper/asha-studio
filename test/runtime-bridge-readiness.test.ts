import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCurrentCompatibilityEvidence } from '../src/compatibility';
import type { StudioCompatibilityEvidence } from '../src/compatibility';
import {
  evaluateRuntimeBridgeReadinessGate,
  REQUIRED_RUNTIME_BRIDGE_DTOS,
  REQUIRED_RUNTIME_BRIDGE_OPERATIONS,
  REQUIRED_RUNTIME_BRIDGE_PROOF_UPDATES,
} from '../src/runtime-bridge-readiness';

function runtimeReadyEvidence(overrides: Partial<StudioCompatibilityEvidence> = {}): StudioCompatibilityEvidence {
  return {
    ...buildCurrentCompatibilityEvidence(),
    runtimeBridgeVersion: 'runtime-bridge.v0',
    supportedRuntimeModes: ['reference', 'native'],
    ashaPackageVersions: [
      ...buildCurrentCompatibilityEvidence().ashaPackageVersions,
      { packageName: '@asha/runtime-bridge', version: '0.1.0', commit: null },
    ],
    ...overrides,
  };
}

test('runtime bridge readiness gate is deferred and non-blocking for current reference workflows', () => {
  const gate = evaluateRuntimeBridgeReadinessGate(buildCurrentCompatibilityEvidence(), 'reference');
  assert.equal(gate.schemaVersion, 1);
  assert.equal(gate.artifactKind, 'studio_runtime_bridge_readiness_gate');
  assert.equal(gate.taskId, 3047);
  assert.equal(gate.status, 'deferred');
  assert.equal(gate.requiredCompatibility.packageName, '@asha/runtime-bridge');
  assert.equal(gate.requiredCompatibility.compatibilityVersion, 'runtime-bridge.v0');
  assert.equal(gate.requiredCompatibility.approvedStudioImport, true);
  assert.deepEqual(gate.diagnostics, []);
  assert.ok(gate.nonClaimsUntilReady.includes('browser_projection_only_until_runtime_snapshot_and_replay_evidence_exist'));
});

test('runtime bridge readiness gate fails closed for native mode when bridge metadata is absent', () => {
  const gate = evaluateRuntimeBridgeReadinessGate({ ...buildCurrentCompatibilityEvidence(), runtimeBridgeVersion: null, supportedRuntimeModes: ['mock', 'reference', 'unavailable'] }, 'native');
  assert.equal(gate.status, 'failed_closed');
  assert.ok(gate.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.runtime_bridge_missing' && diagnostic.severity === 'error'));
  assert.ok(gate.diagnostics.some((diagnostic) => diagnostic.code === 'asha.runtime_bridge_readiness.runtime_bridge_absent' && diagnostic.severity === 'error'));
  assert.ok(gate.diagnostics.some((diagnostic) => diagnostic.code === 'asha.runtime_bridge_readiness.runtime_mode_not_enabled' && diagnostic.severity === 'error'));
});

test('runtime bridge readiness gate fails closed for mismatched runtime bridge compatibility', () => {
  const gate = evaluateRuntimeBridgeReadinessGate(runtimeReadyEvidence({ runtimeBridgeVersion: 'runtime-bridge.v999' }), 'native');
  assert.equal(gate.status, 'failed_closed');
  assert.ok(gate.diagnostics.some((diagnostic) => diagnostic.code === 'asha.runtime_bridge_readiness.runtime_bridge_mismatch' && diagnostic.message.includes('runtime-bridge.v999')));
});

test('runtime bridge readiness gate can become ready only with matching bridge metadata and enabled runtime mode', () => {
  const gate = evaluateRuntimeBridgeReadinessGate(buildCurrentCompatibilityEvidence(), 'native');
  assert.equal(gate.status, 'ready');
  assert.equal(gate.diagnostics.length, 0);
});

test('runtime bridge readiness gate records public DTO, operation, and proof obligations for future runtime tasks', () => {
  const gate = evaluateRuntimeBridgeReadinessGate(buildCurrentCompatibilityEvidence(), 'reference');
  assert.deepEqual(gate.requiredPublicDtos.map((item) => item.id), REQUIRED_RUNTIME_BRIDGE_DTOS.map((item) => item.id));
  assert.ok(gate.requiredPublicDtos.some((item) => item.id === 'runtime_scene_snapshot_dto'));
  assert.ok(gate.requiredPublicDtos.some((item) => item.id === 'runtime_command_application_result_dto'));
  assert.ok(gate.requiredPublicDtos.some((item) => item.id === 'runtime_render_readback_evidence_dto'));
  assert.deepEqual(gate.requiredOperations.map((item) => item.id), REQUIRED_RUNTIME_BRIDGE_OPERATIONS.map((item) => item.id));
  assert.ok(gate.requiredOperations.some((item) => item.id === 'runtime_replay_export'));
  assert.deepEqual(gate.requiredProofUpdates.map((item) => item.id), REQUIRED_RUNTIME_BRIDGE_PROOF_UPDATES.map((item) => item.id));
  assert.ok(gate.requiredProofUpdates.some((item) => item.id === 'negative_smokes_runtime_incompatibility'));
  assert.ok(gate.checklist.some((item) => item.includes('raw transport bypass')));
  assert.ok(gate.sourceDocs.includes('docs/runtime-bridge-readiness-gate.md'));
});
