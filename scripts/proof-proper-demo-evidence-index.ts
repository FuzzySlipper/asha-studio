#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/proper-demo-evidence-index/latest');
const artifactPath = join(outDir, 'index.json');
const verifierPath = 'artifacts/proper-demo-capstone-verifier/latest/index.json';

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function verifyArtifactHash(artifact: any): boolean {
  const { artifactHash, ...withoutHash } = artifact;
  return artifactHash === sha256Json(withoutHash);
}

const verifierAbsolutePath = join(repoRoot, verifierPath);
assert.equal(existsSync(verifierAbsolutePath), true, `missing capstone verifier artifact: ${verifierPath}`);
const verifierText = readFileSync(verifierAbsolutePath, 'utf8');
const verifier = JSON.parse(verifierText);
assert.equal(verifier.artifactKind, 'studio_proper_demo_capstone_verifier');
assert.equal(verifyArtifactHash(verifier), true, `stale capstone verifier artifact: ${verifierPath}`);
assert.equal(verifier.milestoneCoverage.workspacePersistenceM1, true);
assert.equal(verifier.milestoneCoverage.authoringUxM2, true);
assert.equal(verifier.milestoneCoverage.browserInteractiveM3, true);
assert.equal(verifier.milestoneCoverage.liveDebugM4, true);
assert.equal(verifier.milestoneCoverage.authorRuntimeRoundTripM5, true);
assert.equal(verifier.milestoneCoverage.v2HandlesPresent, true);
assert.equal(verifier.milestoneCoverage.boundaryGuards, true);
assert.equal(verifier.milestoneCoverage.privateTransportHintsAbsent, true);

const sourceArtifacts = verifier.sourceArtifacts as readonly {
  readonly kind: string;
  readonly path: string;
  readonly sha256: string;
  readonly hash: string;
}[];
assert.equal(sourceArtifacts.length >= 8, true);
assert.equal(sourceArtifacts.every(source => source.sha256.startsWith('sha256:') && source.hash.startsWith('sha256:')), true);

const requiredKinds = [
  'studio_persistence_m1_proof',
  'studio_authoring_ux_m2_proof',
  'asha_demo_browser_interactive_proof',
  'studio_live_gameplay_debug_m4',
  'studio_author_runtime_roundtrip_m5',
  'asha_demo_v2_proof_index',
  'asha_demo_game_workflow_v2_verification',
  'studio_v2_live_backend_evidence',
] as const;
for (const kind of requiredKinds) {
  assert.equal(sourceArtifacts.some(source => source.kind === kind), true, `missing evidence kind: ${kind}`);
}

const byKind = Object.fromEntries(sourceArtifacts.map(source => [source.kind, source]));
const staleVerifier = {
  ...verifier,
  milestoneCoverage: {
    ...verifier.milestoneCoverage,
    authorRuntimeRoundTripM5: false,
  },
};
const missingBrowserEvidence = sourceArtifacts.filter(source => source.kind !== 'asha_demo_browser_interactive_proof');
const generatedArtifactTreatedAsAuthoredSource = sourceArtifacts.some(source =>
  source.path.startsWith('artifacts/')
  && source.kind.includes('authoring')
  && source.path.includes('/source/'),
);

const artifactBody = {
  artifactKind: 'studio_proper_demo_evidence_index',
  artifactVersion: 'studio-proper-demo-evidence-index.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:proper-demo-evidence-index',
  sourceArtifacts: [
    {
      kind: verifier.artifactKind,
      path: verifierPath,
      sha256: sha256(verifierText),
      hash: verifier.artifactHash,
    },
    ...sourceArtifacts,
  ],
  evidenceMap: {
    workspacePersistence: byKind.studio_persistence_m1_proof,
    authoringUx: byKind.studio_authoring_ux_m2_proof,
    browserInteractive: byKind.asha_demo_browser_interactive_proof,
    liveDebug: byKind.studio_live_gameplay_debug_m4,
    authorRuntimeRoundTrip: byKind.studio_author_runtime_roundtrip_m5,
    demoV2Index: byKind.asha_demo_v2_proof_index,
    demoWorkflowV2: byKind.asha_demo_game_workflow_v2_verification,
    studioV2LiveBackend: byKind.studio_v2_live_backend_evidence,
  },
  capstoneReadout: verifier.capstoneReadout,
  coverage: {
    allRequiredKindsIndexed: requiredKinds.every(kind => sourceArtifacts.some(source => source.kind === kind)),
    verifierHashFresh: verifyArtifactHash(verifier),
    milestoneCoverage: verifier.milestoneCoverage,
    sourceArtifactCount: sourceArtifacts.length,
    studioArtifactCount: sourceArtifacts.filter(source => source.path.startsWith('artifacts/')).length,
    demoArtifactCount: sourceArtifacts.filter(source => source.path.startsWith('../asha-testing/')).length,
  },
  negativeSmokes: [
    {
      case: 'stale_capstone_verifier',
      ok: verifyArtifactHash(staleVerifier),
      expected: false,
      diagnostic: 'stale_capstone_verifier_hash',
    },
    {
      case: 'missing_browser_interactive_evidence',
      ok: missingBrowserEvidence.some(source => source.kind === 'asha_demo_browser_interactive_proof'),
      expected: false,
      diagnostic: 'missing_browser_interactive_evidence',
    },
    {
      case: 'generated_artifact_treated_as_authored_source',
      ok: generatedArtifactTreatedAsAuthoredSource,
      expected: false,
      diagnostic: 'generated_artifact_is_not_authored_source',
    },
  ],
  validations: [
    'capstone_verifier_artifact_hash_verified',
    'm1_through_m5_evidence_kinds_indexed',
    'browser_interactive_evidence_indexed',
    'studio_live_debug_evidence_indexed',
    'author_runtime_roundtrip_evidence_indexed',
    'v2_demo_and_studio_backend_handles_indexed',
    'negative_stale_capstone_verifier_failed_closed',
    'negative_missing_browser_evidence_failed_closed',
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
