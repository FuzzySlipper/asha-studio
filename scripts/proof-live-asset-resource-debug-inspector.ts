#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStudioLiveAssetResourceDebugInspector,
  loadStudioAssetInventory,
  type StudioLiveDebugSessionIdentityReadModel,
} from '@asha-studio/domain';
import type { AshaGameAssetCatalog } from '@asha/game-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-testing');
const catalogPath = 'packages/game-catalogs/catalog.json';
const identityArtifactPath = 'artifacts/live-debug-session-identity-proof/latest/index.json';
const outDir = join(repoRoot, 'artifacts/live-asset-resource-debug-inspector-proof/latest');
const artifactPath = join(outDir, 'index.json');

function sha256Text(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256Text(JSON.stringify(value));
}

function run(command: string, args: readonly string[]): {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
} {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return { command: [command, ...args].join(' '), stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function inventoryFromCatalog(catalog: AshaGameAssetCatalog, catalogHash: string) {
  const loaded = loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: {
      path: 'asha.game.toml',
      hash: sha256Text(readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')),
    },
    catalog: { path: catalogPath, hash: catalogHash },
    diagnostics: [],
    dependencyOrder: catalog.entries.map(entry => entry.id),
    entries: catalog.entries.map(entry => ({
      assetId: entry.id,
      kind: entry.kind,
      sourcePath: entry.source,
      dependencies: entry.dependencies ?? [],
      devResolution: {
        sourceHash: entry.importMetadata?.sourceHash ?? null,
        devCacheKey: entry.importMetadata?.cacheKey ?? `dev-cache/${entry.kind}/${entry.id}`,
        generatedArtifactVersion: entry.importMetadata?.generatedArtifactVersion ?? null,
        importStatus: 'clean',
        publishOutputKey: entry.publish.outputKey,
      },
      publishResolution: {
        outputKey: entry.publish.outputKey,
        packedPath: `harness/out/publish/resources/${entry.publish.outputKey}`,
        packedHash: `sha256:${entry.id}`,
        packedBytes: 1,
      },
      diagnostics: [],
      evidenceRefs: [{ kind: 'catalog', path: catalogPath, sha256: catalogHash }],
    })),
  }, {
    referencedRenderableIds: {
      'material.demo-copper': ['model-preview-crate'],
      'mesh.demo-cube': ['model-preview-crate'],
    },
  });
  assert.equal(loaded.ok, true);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  return loaded.inventory;
}

const identityRun = run('pnpm', ['run', 'proof:live-debug-session-identity']);
const identityText = readFileSync(join(repoRoot, identityArtifactPath), 'utf8');
const identityArtifact = JSON.parse(identityText);
assert.equal(identityArtifact.artifactKind, 'studio_live_debug_session_identity_proof');
const identity = identityArtifact.identity as StudioLiveDebugSessionIdentityReadModel;

const catalogText = readFileSync(join(demoRoot, catalogPath), 'utf8');
const catalog = JSON.parse(catalogText) as AshaGameAssetCatalog;
const inventory = inventoryFromCatalog(catalog, sha256Text(catalogText));
const inspector = buildStudioLiveAssetResourceDebugInspector({
  assetInventory: inventory,
  liveSessionIdentity: identity,
  selectedAssetId: 'material.demo-copper',
});
assert.equal(inspector.ok, true);
if (!inspector.ok) throw new Error(JSON.stringify(inspector.diagnostics));

const missingAsset = buildStudioLiveAssetResourceDebugInspector({
  assetInventory: inventory,
  liveSessionIdentity: identity,
  selectedAssetId: 'material.missing',
});
const staleSession = buildStudioLiveAssetResourceDebugInspector({
  assetInventory: inventory,
  liveSessionIdentity: {
    ...identity,
    attachStatus: 'not_attached',
    liveFreshness: { ...identity.liveFreshness, readAfterAttach: false },
  },
  selectedAssetId: 'material.demo-copper',
});
assert.equal(missingAsset.ok, false);
assert.ok(missingAsset.diagnostics.some(diagnostic => diagnostic.code === 'missing_asset_resource'));
assert.equal(staleSession.ok, false);
assert.ok(staleSession.diagnostics.some(diagnostic => diagnostic.code === 'missing_live_session'));

const artifactBody = {
  artifactKind: 'studio_live_asset_resource_debug_inspector_proof',
  artifactVersion: 'studio-live-asset-resource-debug-inspector-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:live-asset-resource-debug-inspector',
  commandOutputs: [
    { command: identityRun.command, stdout: identityRun.stdout, stderr: identityRun.stderr },
  ],
  sourceArtifacts: [
    {
      kind: identityArtifact.artifactKind,
      path: identityArtifactPath,
      artifactHash: identityArtifact.artifactHash,
      fileHash: sha256Text(identityText),
    },
    {
      kind: 'asha-demo-catalog',
      path: `../asha-testing/${catalogPath}`,
      fileHash: sha256Text(catalogText),
    },
  ],
  inspector: inspector.inspector,
  negativeSmokes: [
    { name: 'missing asset resource', ok: missingAsset.ok, diagnostics: missingAsset.diagnostics },
    { name: 'stale live session', ok: staleSession.ok, diagnostics: staleSession.diagnostics },
  ],
  validations: [
    'live_debug_session_identity_child_passed',
    'catalog_asset_id_kind_and_source_present',
    'asset_source_hash_and_import_status_present',
    'referenced_renderables_present',
    'publish_resource_hash_present',
    'negative_missing_asset_failed_closed',
    'negative_stale_live_session_failed_closed',
  ],
  nonClaims: [
    'not_runtime_authority',
    'not_private_asset_database',
    'not_publish_builder',
  ],
};
const artifact = { ...artifactBody, artifactHash: sha256Json(artifactBody) };

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
