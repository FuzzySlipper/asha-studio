import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ASHA_COMPATIBILITY_REQUIREMENTS,
  buildCurrentCompatibilityEvidence,
  checkCompatibility,
  createStudioSessionMetadata,
} from '../src/compatibility';
import type { StudioCompatibilityEvidence } from '../src/compatibility';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const ashaPackageLinkRoot = ['link:..', 'asha', 'ts', 'packages'].join('/');

function cloneEvidence(overrides: Partial<StudioCompatibilityEvidence> = {}): StudioCompatibilityEvidence {
  return {
    ...buildCurrentCompatibilityEvidence(),
    ...overrides,
  };
}

test('current Studio compatibility metadata records ASHA public surfaces', () => {
  const evidence = buildCurrentCompatibilityEvidence();
  assert.equal(evidence.contractsVersion, 'contracts.v0');
  assert.equal(evidence.commandRegistryVersion, 'command-registry.v0');
  assert.equal(evidence.studioEvidenceVersion, 'studio-evidence.deferred-v0');
  assert.equal(evidence.runtimeBridgeVersion, null);
  assert.deepEqual(evidence.supportedRuntimeModes, ['mock', 'reference', 'unavailable']);
  assert.deepEqual(
    evidence.ashaPackageVersions.map((item) => `${item.packageName}@${item.version}`),
    ['@asha/contracts@0.1.0', '@asha/command-registry@0.1.0'],
  );
});

test('mock runtime mode is compatible but records deferred runtime bridge diagnostic', () => {
  const result = checkCompatibility(buildCurrentCompatibilityEvidence(), 'mock');
  assert.equal(result.ok, true);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.runtime_bridge_deferred'));
  assert.ok(result.diagnostics.every((diagnostic) => diagnostic.severity !== 'error'));
});

test('contract compatibility mismatch fails closed with explicit diagnostic', () => {
  const result = checkCompatibility(cloneEvidence({ contractsVersion: 'contracts.v999' }), 'mock');
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.contracts_mismatch' && diagnostic.severity === 'error'));
});

test('command registry compatibility mismatch fails closed with explicit diagnostic', () => {
  const result = checkCompatibility(cloneEvidence({ commandRegistryVersion: 'command-registry.v999' }), 'mock');
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.command_registry_mismatch' && diagnostic.severity === 'error'));
});

test('native runtime mode fails closed until runtime bridge metadata is present', () => {
  const result = checkCompatibility(buildCurrentCompatibilityEvidence(), 'native');
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.unsupported_runtime_mode'));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.runtime_bridge_missing'));
});

test('missing required package surface fails closed in generated evidence', () => {
  const evidence = buildCurrentCompatibilityEvidence({
    packageJson: {
      dependencies: {
        '@asha/command-registry': `${ashaPackageLinkRoot}/command-registry`,
      },
    },
  });
  assert.equal(evidence.contractsVersion, 'missing');
  assert.deepEqual(
    evidence.ashaPackageVersions.map((item) => item.packageName),
    ['@asha/command-registry'],
  );
  const result = checkCompatibility(evidence, 'mock');
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.required_surface_missing'));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.contracts_mismatch'));
});

test('session metadata fails closed when required package surface is absent', () => {
  const metadata = createStudioSessionMetadata({
    sessionId: 'session-missing-contracts',
    scenarioId: 'scenario-test',
    scenarioLabel: 'Test scenario',
    runtimeMode: 'mock',
    startedAtIso: '1970-01-01T00:00:00.000Z',
    packageJson: {
      dependencies: {
        '@asha/command-registry': `${ashaPackageLinkRoot}/command-registry`,
      },
    },
  });
  assert.ok(metadata.capabilities.every((capability) => !capability.available));
  assert.ok(metadata.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.required_surface_missing'));
});

test('required package version mismatch fails closed', () => {
  const evidence = cloneEvidence({
    ashaPackageVersions: [
      { packageName: '@asha/contracts', version: '0.0.0', commit: null },
      { packageName: '@asha/command-registry', version: '0.1.0', commit: null },
    ],
  });
  const result = checkCompatibility(evidence, 'mock', ASHA_COMPATIBILITY_REQUIREMENTS);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.package_version_mismatch'));
});

test('session metadata projects compatibility diagnostics into artifact readback', () => {
  const metadata = createStudioSessionMetadata({
    sessionId: 'session-test-0001',
    scenarioId: 'scenario-test',
    scenarioLabel: 'Test scenario',
    runtimeMode: 'mock',
    startedAtIso: '1970-01-01T00:00:00.000Z',
  });
  assert.equal(metadata.schemaVersion, 1);
  assert.equal(metadata.artifactKind, 'session_metadata');
  assert.equal(metadata.compatibility.commandRegistryVersion, 'command-registry.v0');
  assert.ok(metadata.capabilities.length > 0);
  assert.ok(metadata.capabilities.every((capability) => capability.available));
  assert.ok(metadata.diagnostics.some((diagnostic) => diagnostic.code === 'asha.compatibility.runtime_bridge_deferred'));
});

test('sample session metadata artifact readback carries compatibility fields', () => {
  const artifact = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-session-metadata.sample.json'), 'utf8')) as { compatibility?: StudioCompatibilityEvidence; runtimeMode?: string };
  assert.equal(artifact.runtimeMode, 'mock');
  assert.equal(artifact.compatibility?.contractsVersion, 'contracts.v0');
  assert.equal(artifact.compatibility?.commandRegistryVersion, 'command-registry.v0');
  assert.equal(artifact.compatibility?.runtimeBridgeVersion, null);
  const result = checkCompatibility(artifact.compatibility as StudioCompatibilityEvidence, 'mock');
  assert.equal(result.ok, true);
});
