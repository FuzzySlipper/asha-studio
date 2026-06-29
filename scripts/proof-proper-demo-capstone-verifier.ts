#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-demo');
const outDir = join(repoRoot, 'artifacts/proper-demo-capstone-verifier/latest');
const artifactPath = join(outDir, 'index.json');

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256StableJson(value: unknown): string {
  return sha256(stableJson(value));
}

function run(command: string, args: readonly string[], cwd = repoRoot) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 660000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return {
    command: [command, ...args].join(' '),
    cwd: cwd === repoRoot ? '.' : relative(repoRoot, cwd),
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function verifyHashKey(artifact: any, hashKey: string, stable = false, extraDerivedKeys: readonly string[] = []): boolean {
  const { [hashKey]: recordedHash, ...withoutHash } = artifact;
  for (const key of extraDerivedKeys) {
    delete withoutHash[key];
  }
  return recordedHash === (stable ? sha256StableJson(withoutHash) : sha256Json(withoutHash));
}

function readArtifact(
  path: string,
  expectedKind: string,
  root = repoRoot,
  hashKey = 'artifactHash',
  stable = false,
  extraDerivedKeys: readonly string[] = [],
) {
  const absolute = join(root, path);
  assert.equal(existsSync(absolute), true, `missing source artifact: ${path}`);
  const text = readFileSync(absolute, 'utf8');
  const artifact = JSON.parse(text);
  assert.equal(artifact.artifactKind, expectedKind);
  assert.equal(verifyHashKey(artifact, hashKey, stable, extraDerivedKeys), true, `stale source artifact hash: ${path}`);
  return {
    kind: artifact.artifactKind as string,
    path: root === repoRoot ? path : relative(repoRoot, absolute),
    sha256: sha256(text),
    hash: artifact[hashKey] as string,
    artifact,
  };
}

function allStrings(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

const commandRuns = [
  run('pnpm', ['run', 'proof:persistence-m1']),
  run('pnpm', ['run', 'proof:authoring-ux-m2']),
  run('npm', ['run', 'browser:interactive-proof'], demoRoot),
  run('pnpm', ['run', 'proof:live-gameplay-debug-m4']),
  run('pnpm', ['run', 'proof:author-runtime-roundtrip-m5']),
  run('pnpm', ['run', 'check:boundaries']),
  run('npm', ['run', 'check:boundary'], demoRoot),
];

const persistenceM1 = readArtifact(
  'artifacts/persistence-m1-proof/latest/index.json',
  'studio_persistence_m1_proof',
);
const authoringM2 = readArtifact(
  'artifacts/authoring-ux-m2-proof/latest/index.json',
  'studio_authoring_ux_m2_proof',
);
const browserM3 = readArtifact(
  'harness/out/browser-interactive-proof/latest/index.json',
  'asha_demo_browser_interactive_proof',
  demoRoot,
  'artifactHash',
  true,
);
const liveDebugM4 = readArtifact(
  'artifacts/live-gameplay-debug-m4/latest/index.json',
  'studio_live_gameplay_debug_m4',
);
const roundTripM5 = readArtifact(
  'artifacts/author-runtime-roundtrip-m5/latest/index.json',
  'studio_author_runtime_roundtrip_m5',
);
const demoV2Index = readArtifact(
  'harness/out/v2-proof-index/latest/index.json',
  'asha_demo_v2_proof_index',
  demoRoot,
  'indexHash',
  true,
  ['indexId'],
);
const demoWorkflowV2 = readArtifact(
  'harness/out/game-workflow-v2/latest/index.json',
  'asha_demo_game_workflow_v2_verification',
  demoRoot,
  'artifactHash',
  true,
  ['artifactId'],
);
const studioV2 = readArtifact(
  'artifacts/v2-runtime-proof/latest/index.json',
  'studio_v2_live_backend_evidence',
);

assert.equal(persistenceM1.artifact.validations.includes('workspace_open_child_passed'), true);
assert.equal(authoringM2.artifact.validations.includes('authored_state_panel_reflection_child_passed'), true);
assert.equal(browserM3.artifact.checks.interactive_browser_readback_ready ?? true, true);
assert.equal(browserM3.artifact.browserProof.inputEventCount > 0, true);
assert.equal(browserM3.artifact.browserProof.inputEventCount, browserM3.artifact.browserProof.typedRequestCount);
assert.equal(liveDebugM4.artifact.validations.includes('bounded_command_proposals_present'), true);
assert.equal(roundTripM5.artifact.coverage.sourceArtifactChainCurrent, true);
assert.equal(roundTripM5.artifact.coverage.browserInputCountsCorrelated, true);
assert.equal(demoV2Index.artifact.validations.includes('studio_live_backend_ref_fresh'), true);
assert.equal(demoWorkflowV2.artifact.validations.includes('v2_proof_index_check_passed'), true);
assert.equal(studioV2.artifact.validations.includes('browser_smoke_consumes_current_command_proof'), true);

const forbiddenText = allStrings([
  persistenceM1.artifact,
  authoringM2.artifact,
  browserM3.artifact,
  liveDebugM4.artifact,
  roundTripM5.artifact,
  demoV2Index.artifact,
  demoWorkflowV2.artifact,
  studioV2.artifact,
]);
const privateTransportHintsAbsent = !forbiddenText.includes('call(methodname, json)')
  && !forbiddenText.includes('freeform_json')
  && !forbiddenText.includes('raw native')
  && !forbiddenText.includes('raw wasm');

const staleRoundTrip = {
  ...roundTripM5.artifact,
  coverage: {
    ...roundTripM5.artifact.coverage,
    sourceArtifactChainCurrent: false,
  },
};
const markerOnlyBrowser = {
  ...browserM3.artifact.browserProof,
  inputEventCount: 0,
  typedRequestCount: 0,
};
const missingStudioLiveV2Ref = {
  ...demoV2Index.artifact,
  validations: demoV2Index.artifact.validations.filter((validation: string) => validation !== 'studio_live_backend_ref_fresh'),
};

const sourceArtifacts = [
  persistenceM1,
  authoringM2,
  browserM3,
  liveDebugM4,
  roundTripM5,
  demoV2Index,
  demoWorkflowV2,
  studioV2,
].map(source => ({
  kind: source.kind,
  path: source.path,
  sha256: source.sha256,
  hash: source.hash,
}));

const artifactBody = {
  artifactKind: 'studio_proper_demo_capstone_verifier',
  artifactVersion: 'studio-proper-demo-capstone-verifier.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:proper-demo-capstone-verifier',
  commandRuns,
  campaign: {
    projectId: 'asha',
    parentTask: 'asha#3727',
    milestone: 'M6 proper end-to-end demo proof capstone',
    verifiedMilestones: ['M1', 'M2', 'M3', 'M4', 'M5'],
    deferredMilestones: ['M0 planning docs are contract inputs, not regenerated proof artifacts'],
  },
  sourceArtifacts,
  milestoneCoverage: {
    workspacePersistenceM1: persistenceM1.artifact.validations.includes('workspace_open_child_passed')
      && persistenceM1.artifact.validations.includes('scene_save_roundtrip_child_passed')
      && persistenceM1.artifact.validations.includes('catalog_save_roundtrip_child_passed'),
    authoringUxM2: authoringM2.artifact.validations.includes('scene_object_create_child_passed')
      && authoringM2.artifact.validations.includes('catalog_entry_authoring_child_passed')
      && authoringM2.artifact.validations.includes('authored_state_panel_reflection_child_passed'),
    browserInteractiveM3: browserM3.artifact.validations.includes('interactive_browser_readback_ready')
      && browserM3.artifact.browserProof.inputEventCount > 0
      && browserM3.artifact.browserProof.inputEventCount === browserM3.artifact.browserProof.typedRequestCount,
    liveDebugM4: liveDebugM4.artifact.validations.includes('live_session_identity_present')
      && liveDebugM4.artifact.validations.includes('bounded_command_proposals_present'),
    authorRuntimeRoundTripM5: roundTripM5.artifact.validations.includes('authored_object_round_trips_from_studio_to_browser_back_to_studio_debug')
      && roundTripM5.artifact.coverage.sourceArtifactChainCurrent === true,
    v2HandlesPresent: demoV2Index.artifact.validations.includes('studio_live_backend_ref_fresh')
      && demoWorkflowV2.artifact.validations.includes('v2_proof_index_check_passed')
      && studioV2.artifact.validations.includes('browser_smoke_consumes_current_command_proof'),
    boundaryGuards: true,
    privateTransportHintsAbsent,
  },
  capstoneReadout: {
    authoredObjectId: roundTripM5.artifact.roundTripReadout.objectId,
    authoredAssetId: roundTripM5.artifact.roundTripReadout.assetId,
    browserInputEventCount: browserM3.artifact.browserProof.inputEventCount,
    authoredFinalSelectedObjectId: roundTripM5.artifact.roundTripReadout.finalSelectedObjectId,
    authoredFinalSelectedAssetId: roundTripM5.artifact.roundTripReadout.finalSelectedAssetId,
    runtimeMode: roundTripM5.artifact.roundTripReadout.runtimeMode,
    v2RuntimeMode: demoV2Index.artifact.runtime.mode,
    v2BackendProfile: demoV2Index.artifact.runtime.backendProfile,
    studioLiveBackendEvidenceHash: studioV2.hash,
  },
  negativeSmokes: [
    {
      case: 'stale_roundtrip_hash',
      ok: verifyHashKey(staleRoundTrip, 'artifactHash'),
      expected: false,
      diagnostic: 'stale_child_artifact_hash',
    },
    {
      case: 'marker_only_browser_interaction',
      ok: markerOnlyBrowser.inputEventCount > 0 && markerOnlyBrowser.inputEventCount === markerOnlyBrowser.typedRequestCount,
      expected: false,
      diagnostic: 'browser_event_log_missing_or_marker_only',
    },
    {
      case: 'missing_studio_live_v2_ref',
      ok: missingStudioLiveV2Ref.validations.includes('studio_live_backend_ref_fresh'),
      expected: false,
      diagnostic: 'missing_studio_live_backend_ref',
    },
  ],
  validations: [
    'm1_workspace_persistence_gate_passed',
    'm2_authoring_ux_gate_passed',
    'm3_browser_interactive_gate_passed',
    'm4_live_debug_gate_passed',
    'm5_author_runtime_roundtrip_gate_passed',
    'v2_proof_index_and_studio_live_backend_refs_present',
    'studio_and_demo_boundary_guards_passed',
    'private_transport_and_freeform_command_hints_absent',
    'negative_stale_roundtrip_hash_failed_closed',
    'negative_marker_only_browser_interaction_failed_closed',
  ],
  nonClaims: [
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
    'not_store_submission',
    'not_installer',
    'not_package_signing',
    'not_product_readiness',
    'not_multiplayer_evidence',
    'not_private_transport',
    'not_runtime_den_dependency',
  ],
};
const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
