#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/author-runtime-roundtrip-index/latest');
const artifactPath = join(outDir, 'index.json');

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
    timeout: 540000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return `${command} ${args.join(' ')}`;
}

function verifyHashedObject(value: any, hashKey: string): boolean {
  const { [hashKey]: recordedHash, ...withoutHash } = value;
  return recordedHash === sha256Json(withoutHash);
}

function readHashedArtifact(path: string, expectedKind: string) {
  const absolute = join(repoRoot, path);
  assert.equal(existsSync(absolute), true, `missing source artifact: ${path}`);
  const text = readFileSync(absolute, 'utf8');
  const artifact = JSON.parse(text) as any;
  assert.equal(artifact.artifactKind, expectedKind);
  assert.equal(verifyHashedObject(artifact, 'artifactHash'), true, `stale source artifact hash: ${path}`);
  return {
    kind: artifact.artifactKind as string,
    path,
    sha256: sha256(text),
    hash: artifact.artifactHash as string,
    artifact,
  };
}

function sourceHashMatches(source: { readonly hash?: string }, expectedHash: string): boolean {
  return source.hash === expectedHash;
}

const debugRun = run('pnpm', ['run', 'evidence', '--', 'authored-studio-debug-readback']);
const typecheckRun = run('pnpm', ['exec', 'nx', 'typecheck', 'studio-domain']);
const boundaryRun = run('pnpm', ['run', 'check:boundaries']);

const fixtureText = readFileSync(join(repoRoot, 'fixtures/round-trip/studio-authored-content.fixture.json'), 'utf8');
const fixture = JSON.parse(fixtureText);
assert.equal(verifyHashedObject(fixture, 'fixtureHash'), true, 'Studio authored fixture hash is stale');

const fixtureProof = readHashedArtifact(
  'artifacts/authored-roundtrip-fixture/latest/index.json',
  'studio_authored_roundtrip_fixture_proof',
);
const runtimeLoad = readHashedArtifact(
  'artifacts/authored-browser-runtime-load/latest/index.json',
  'studio_authored_browser_runtime_load_proof',
);
const browserInteraction = readHashedArtifact(
  'artifacts/authored-browser-interaction/latest/index.json',
  'studio_authored_browser_interaction_proof',
);
const studioDebug = readHashedArtifact(
  'artifacts/authored-studio-debug-readback/latest/index.json',
  'studio_authored_studio_debug_readback_proof',
);

const objectId = fixture.authoredScene.objectId as string;
const assetId = fixture.authoredCatalog.authoredAssetId as string;

assert.equal(fixtureProof.artifact.authoredRefs.sceneObjectId, objectId);
assert.equal(fixtureProof.artifact.authoredRefs.assetId, assetId);
assert.equal(runtimeLoad.artifact.authoredRuntimeLoad.objectId, objectId);
assert.equal(runtimeLoad.artifact.authoredRuntimeLoad.assetId, assetId);
assert.equal(browserInteraction.artifact.authoredInteraction.objectId, objectId);
assert.equal(browserInteraction.artifact.authoredInteraction.assetId, assetId);
assert.equal(studioDebug.artifact.debug.selected.objectId, objectId);
assert.equal(studioDebug.artifact.debug.selected.assetId, assetId);
assert.equal(studioDebug.artifact.debug.selected.finalSelectedObjectId, objectId);
assert.equal(studioDebug.artifact.debug.selected.finalSelectedAssetId, assetId);
assert.equal(sourceHashMatches(runtimeLoad.artifact.sourceArtifacts.at(0), fixture.fixtureHash), true);
assert.equal(sourceHashMatches(browserInteraction.artifact.sourceArtifacts.at(0), runtimeLoad.hash), true);
assert.equal(sourceHashMatches(studioDebug.artifact.sourceArtifacts.at(1), browserInteraction.hash), true);

const staleChildHash = sourceHashMatches({ hash: 'sha256:stale' }, browserInteraction.hash);
const staleRuntimeObject = runtimeLoad.artifact.authoredRuntimeLoad.objectId === 'scene-node:stale';
const missingStudioDebugSource = sourceHashMatches({}, studioDebug.hash);

const artifactBody = {
  artifactKind: 'studio_author_runtime_roundtrip_evidence_index',
  artifactVersion: 'studio-author-runtime-roundtrip-evidence-index.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- author-runtime-roundtrip-index',
  commandRuns: [debugRun, typecheckRun, boundaryRun],
  authoredRefs: {
    objectId,
    objectLabel: fixture.authoredScene.record.label,
    assetId,
    materialSource: fixture.authoredCatalog.entry.source,
    fixtureHash: fixture.fixtureHash,
  },
  sourceArtifacts: [
    {
      kind: fixture.fixtureKind,
      path: 'fixtures/round-trip/studio-authored-content.fixture.json',
      sha256: sha256(fixtureText),
      hash: fixture.fixtureHash,
    },
    {
      kind: fixtureProof.kind,
      path: fixtureProof.path,
      sha256: fixtureProof.sha256,
      hash: fixtureProof.hash,
    },
    {
      kind: runtimeLoad.kind,
      path: runtimeLoad.path,
      sha256: runtimeLoad.sha256,
      hash: runtimeLoad.hash,
    },
    {
      kind: browserInteraction.kind,
      path: browserInteraction.path,
      sha256: browserInteraction.sha256,
      hash: browserInteraction.hash,
    },
    {
      kind: studioDebug.kind,
      path: studioDebug.path,
      sha256: studioDebug.sha256,
      hash: studioDebug.hash,
    },
  ],
  roundTrip: {
    authoredFixture: {
      beforeFlatSceneHash: fixture.authoredScene.beforeFlatSceneHash,
      afterFlatSceneHash: fixture.authoredScene.afterFlatSceneHash,
      authoredCatalogHash: fixture.authoredCatalog.authoredCatalogHash,
    },
    browserRuntimeLoad: {
      runtimeMode: runtimeLoad.artifact.authoredRuntimeLoad.runtimeMode,
      worldHash: runtimeLoad.artifact.authoredRuntimeLoad.worldHash,
      resourceManifestHash: runtimeLoad.artifact.authoredRuntimeLoad.resourceManifestHash,
      browserPageReadbackHash: runtimeLoad.artifact.authoredRuntimeLoad.browserPageReadbackHash,
    },
    browserInteraction: {
      inputEventCount: browserInteraction.artifact.authoredInteraction.inputEventCount,
      typedRequestCount: browserInteraction.artifact.authoredInteraction.typedRequestCount,
      readbackCount: browserInteraction.artifact.authoredInteraction.readbackCount,
      interactionHash: browserInteraction.artifact.authoredInteraction.interactionHash,
      finalSelectedObjectId: browserInteraction.artifact.authoredInteraction.finalSelectedObjectId,
      finalSelectedAssetId: browserInteraction.artifact.authoredInteraction.finalSelectedAssetId,
    },
    studioDebugReadback: {
      debugHash: studioDebug.artifact.debug.debugHash,
      studioDebugEvidenceHash: studioDebug.artifact.debug.studioCorrelation.studioDebugEvidenceHash,
      authoredObjectMatchesBrowserSelection:
        studioDebug.artifact.debug.studioCorrelation.authoredObjectMatchesBrowserSelection,
      authoredAssetMatchesBrowserSelection:
        studioDebug.artifact.debug.studioCorrelation.authoredAssetMatchesBrowserSelection,
    },
  },
  correlations: {
    fixtureProofMatchesFixture: fixtureProof.artifact.authoredRefs.sceneObjectId === objectId
      && fixtureProof.artifact.authoredRefs.assetId === assetId,
    runtimeLoadMatchesFixture: runtimeLoad.artifact.authoredRuntimeLoad.objectId === objectId
      && runtimeLoad.artifact.authoredRuntimeLoad.assetId === assetId,
    interactionMatchesRuntimeLoad:
      browserInteraction.artifact.authoredInteraction.objectId === runtimeLoad.artifact.authoredRuntimeLoad.objectId
      && browserInteraction.artifact.authoredInteraction.assetId === runtimeLoad.artifact.authoredRuntimeLoad.assetId,
    studioDebugMatchesInteraction:
      studioDebug.artifact.debug.selected.finalSelectedObjectId
        === browserInteraction.artifact.authoredInteraction.finalSelectedObjectId
      && studioDebug.artifact.debug.selected.finalSelectedAssetId
        === browserInteraction.artifact.authoredInteraction.finalSelectedAssetId,
    sourceArtifactChainCurrent:
      sourceHashMatches(runtimeLoad.artifact.sourceArtifacts.at(0), fixture.fixtureHash)
      && sourceHashMatches(browserInteraction.artifact.sourceArtifacts.at(0), runtimeLoad.hash)
      && sourceHashMatches(studioDebug.artifact.sourceArtifacts.at(1), browserInteraction.hash),
  },
  negativeSmokes: [
    {
      case: 'stale_child_hash',
      ok: staleChildHash,
      expected: false,
      diagnostic: 'stale_source_artifact_hash',
    },
    {
      case: 'runtime_object_mismatch',
      ok: staleRuntimeObject,
      expected: false,
      diagnostic: 'roundtrip_object_mismatch',
    },
    {
      case: 'missing_studio_debug_source',
      ok: missingStudioDebugSource,
      expected: false,
      diagnostic: 'missing_source_artifact',
    },
  ],
  validations: [
    'authored_roundtrip_fixture_child_passed',
    'authored_browser_runtime_load_child_passed',
    'authored_browser_interaction_child_passed',
    'authored_studio_debug_readback_child_passed',
    'source_artifact_hashes_verified',
    'source_artifact_chain_current',
    'authored_object_correlated_across_studio_browser_and_debug',
    'authored_asset_correlated_across_studio_browser_and_debug',
    'browser_input_counts_indexed',
    'studio_domain_typecheck_passed',
    'boundary_guard_passed',
    'negative_stale_child_hash_failed_closed',
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
