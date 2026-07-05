#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/author-runtime-roundtrip-m5/latest');
const artifactPath = join(outDir, 'index.json');
const indexPath = 'artifacts/author-runtime-roundtrip-index/latest/index.json';

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function run(command: string, args: readonly string[]) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 600000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return `${command} ${args.join(' ')}`;
}

function verifyArtifactHash(artifact: any): boolean {
  const { artifactHash, ...withoutHash } = artifact;
  return artifactHash === sha256Json(withoutHash);
}

const indexRun = run('pnpm', ['run', 'evidence', '--', 'author-runtime-roundtrip-index']);
const boundaryRun = run('pnpm', ['run', 'check:boundaries']);

const absoluteIndexPath = join(repoRoot, indexPath);
assert.equal(existsSync(absoluteIndexPath), true, `missing source artifact: ${indexPath}`);
const indexText = readFileSync(absoluteIndexPath, 'utf8');
const index = JSON.parse(indexText) as any;
assert.equal(index.artifactKind, 'studio_author_runtime_roundtrip_evidence_index');
assert.equal(verifyArtifactHash(index), true, `stale source artifact hash: ${indexPath}`);
assert.equal(index.correlations.fixtureProofMatchesFixture, true);
assert.equal(index.correlations.runtimeLoadMatchesFixture, true);
assert.equal(index.correlations.interactionMatchesRuntimeLoad, true);
assert.equal(index.correlations.studioDebugMatchesInteraction, true);
assert.equal(index.correlations.sourceArtifactChainCurrent, true);
assert.equal(index.roundTrip.browserInteraction.inputEventCount > 0, true);
assert.equal(index.roundTrip.browserInteraction.inputEventCount, index.roundTrip.browserInteraction.typedRequestCount);
assert.equal(index.roundTrip.browserInteraction.readbackCount, index.roundTrip.browserInteraction.typedRequestCount);
assert.equal(index.roundTrip.studioDebugReadback.authoredObjectMatchesBrowserSelection, true);
assert.equal(index.roundTrip.studioDebugReadback.authoredAssetMatchesBrowserSelection, true);
assert.equal(
  index.sourceArtifacts.map((source: { readonly kind: string }) => source.kind).includes('studio_authored_studio_debug_readback_proof'),
  true,
);

const staleIndex = {
  ...index,
  correlations: {
    ...index.correlations,
    sourceArtifactChainCurrent: false,
  },
};
const missingValidation = !index.validations.includes('source_artifact_chain_current');

const artifactBody = {
  artifactKind: 'studio_author_runtime_roundtrip_m5',
  artifactVersion: 'studio-author-runtime-roundtrip-m5.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- author-runtime-roundtrip-m5',
  commandRuns: [indexRun, boundaryRun],
  milestone: {
    parentTask: 'asha#3733',
    sequence: ['asha#3772', 'asha#3773', 'asha#3774', 'asha#3775', 'asha#3776', 'asha#3777'],
    proofStage: 'author-to-runtime-round-trip',
  },
  authoredRefs: index.authoredRefs,
  evidenceIndex: {
    kind: index.artifactKind,
    path: indexPath,
    sha256: sha256(indexText),
    hash: index.artifactHash,
    sourceArtifactCount: index.sourceArtifacts.length,
  },
  coverage: {
    authoredFixtureIndexed: index.validations.includes('authored_roundtrip_fixture_child_passed'),
    browserRuntimeLoadIndexed: index.validations.includes('authored_browser_runtime_load_child_passed'),
    browserInteractionIndexed: index.validations.includes('authored_browser_interaction_child_passed'),
    studioDebugReadbackIndexed: index.validations.includes('authored_studio_debug_readback_child_passed'),
    sourceArtifactChainCurrent: index.correlations.sourceArtifactChainCurrent,
    browserInputCountsCorrelated:
      index.roundTrip.browserInteraction.inputEventCount === index.roundTrip.browserInteraction.typedRequestCount
      && index.roundTrip.browserInteraction.readbackCount === index.roundTrip.browserInteraction.typedRequestCount,
  },
  roundTripReadout: {
    objectId: index.authoredRefs.objectId,
    assetId: index.authoredRefs.assetId,
    runtimeMode: index.roundTrip.browserRuntimeLoad.runtimeMode,
    runtimeWorldHash: index.roundTrip.browserRuntimeLoad.worldHash,
    interactionHash: index.roundTrip.browserInteraction.interactionHash,
    finalSelectedObjectId: index.roundTrip.browserInteraction.finalSelectedObjectId,
    finalSelectedAssetId: index.roundTrip.browserInteraction.finalSelectedAssetId,
    studioDebugHash: index.roundTrip.studioDebugReadback.debugHash,
  },
  negativeSmokes: [
    {
      case: 'stale_index_hash',
      ok: verifyArtifactHash(staleIndex),
      expected: false,
      diagnostic: 'stale_source_artifact_hash',
    },
    {
      case: 'missing_index_validation',
      ok: missingValidation,
      expected: false,
      diagnostic: 'missing_source_artifact_chain_validation',
    },
    ...index.negativeSmokes,
  ],
  validations: [
    'author_runtime_roundtrip_index_child_passed',
    'source_artifact_hashes_verified',
    'authored_fixture_runtime_load_interaction_and_studio_debug_indexed',
    'authored_object_round_trips_from_studio_to_browser_back_to_studio_debug',
    'authored_asset_round_trips_from_studio_to_browser_back_to_studio_debug',
    'browser_input_counts_correlated',
    'boundary_guard_passed',
    'negative_stale_index_failed_closed',
  ],
  nonClaims: [
    'not_runtime_authority',
    'not_private_runtime_transport',
    'not_source_write',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
    'not_publish_readiness',
  ],
};
const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
