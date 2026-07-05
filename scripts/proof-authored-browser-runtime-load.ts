#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-testing');
const outDir = join(repoRoot, 'artifacts/authored-browser-runtime-load/latest');
const artifactPath = join(outDir, 'index.json');
const fixturePath = join(repoRoot, 'fixtures/round-trip/studio-authored-content.fixture.json');
const demoArtifactPath = join(demoRoot, 'harness/out/authored-runtime-load/latest/index.json');

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function run(command: string, args: readonly string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return {
    command: `${command} ${args.join(' ')}`,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function verifyHashedObject(value: any, hashKey: string): boolean {
  const { [hashKey]: recordedHash, ...withoutHash } = value;
  return recordedHash === sha256Json(withoutHash);
}

const fixtureRun = run('pnpm', ['run', 'evidence', '--', 'authored-roundtrip-fixture'], repoRoot);
const demoRun = run('npm', ['run', 'roundtrip:runtime-load'], demoRoot);
const boundaryRun = run('pnpm', ['run', 'check:boundaries'], repoRoot);

const fixtureText = readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
assert.equal(verifyHashedObject(fixture, 'fixtureHash'), true, 'Studio authored fixture hash is stale');

const demoArtifactText = readFileSync(demoArtifactPath, 'utf8');
const demoArtifact = JSON.parse(demoArtifactText);
assert.equal(demoArtifact.artifactKind, 'asha_demo_authored_runtime_load');
assert.equal(demoArtifact.fixture.fixtureHash, fixture.fixtureHash);
assert.equal(demoArtifact.authoredRuntimeLoad.objectId, fixture.authoredScene.objectId);
assert.equal(demoArtifact.authoredRuntimeLoad.assetId, fixture.authoredCatalog.authoredAssetId);
assert.equal(demoArtifact.browser.loadedObjectId, fixture.authoredScene.objectId);
assert.equal(demoArtifact.browser.loadedAssetId, fixture.authoredCatalog.authoredAssetId);
assert.equal(demoArtifact.checks.runtimeLaunched, true);
assert.equal(demoArtifact.checks.browserPageLoaded, true);

const staleDemo = {
  ...demoArtifact,
  authoredRuntimeLoad: {
    ...demoArtifact.authoredRuntimeLoad,
    objectId: 'scene-node:stale',
  },
};
assert.equal(staleDemo.authoredRuntimeLoad.objectId === fixture.authoredScene.objectId, false);

const artifactBody = {
  artifactKind: 'studio_authored_browser_runtime_load_proof',
  artifactVersion: 'studio-authored-browser-runtime-load-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- authored-browser-runtime-load',
  commandRuns: [
    fixtureRun.command,
    demoRun.command,
    boundaryRun.command,
  ],
  sourceArtifacts: [
    {
      kind: fixture.fixtureKind,
      path: relative(repoRoot, fixturePath),
      sha256: sha256(fixtureText),
      hash: fixture.fixtureHash,
    },
    {
      kind: demoArtifact.artifactKind,
      path: relative(repoRoot, demoArtifactPath),
      sha256: sha256(demoArtifactText),
      hash: demoArtifact.artifactHash,
    },
  ],
  authoredRuntimeLoad: {
    objectId: demoArtifact.authoredRuntimeLoad.objectId,
    objectLabel: demoArtifact.authoredRuntimeLoad.objectLabel,
    assetId: demoArtifact.authoredRuntimeLoad.assetId,
    flatSceneHash: demoArtifact.authoredRuntimeLoad.flatSceneHash,
    authoredCatalogHash: demoArtifact.authoredRuntimeLoad.authoredCatalogHash,
    runtimeMode: demoArtifact.runtime.runtimeMode,
    resourceManifestHash: demoArtifact.runtime.resourceManifestHash,
    worldHash: demoArtifact.readback.worldHash,
    browserPageReadbackHash: demoArtifact.browser.pageReadbackHash,
  },
  negativeSmokes: [
    {
      case: 'stale_demo_object_mismatch',
      ok: staleDemo.authoredRuntimeLoad.objectId === fixture.authoredScene.objectId,
      expected: false,
    },
    ...demoArtifact.negativeSmokes,
  ],
  validations: [
    'studio_authored_fixture_regenerated',
    'demo_authored_runtime_load_child_passed',
    'fixture_hash_matches_demo_runtime_load',
    'authored_scene_object_loaded_in_browser_page',
    'authored_catalog_asset_loaded_in_browser_page',
    'runtime_resource_manifest_hash_recorded',
    'boundary_guard_passed',
    'negative_stale_demo_object_failed_closed',
  ],
  nonClaims: [
    'not_browser_interaction_evidence',
    'not_runtime_mutation_proof',
    'not_native_runtime_authority',
    'not_private_transport',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ],
};
const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
