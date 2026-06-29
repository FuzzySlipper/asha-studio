#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applySceneObjectCommandReadModel,
  applyStudioCatalogAuthoringOperation,
  buildInitialWorkspaceReadModel,
  buildStudioSceneAuthoringOperation,
  createCreateSceneObjectRequest,
  studioCatalogAuthoringBaseHash,
  studioSceneAuthoringBaseHash,
} from '@asha-studio/domain';
import type { AshaGameAssetCatalog, AshaGameAssetCatalogEntry } from '@asha/game-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-demo');
const catalogPath = 'packages/game-catalogs/catalog.json';
const fixtureDir = join(repoRoot, 'fixtures/round-trip');
const fixturePath = join(fixtureDir, 'studio-authored-content.fixture.json');
const outDir = join(repoRoot, 'artifacts/authored-roundtrip-fixture/latest');
const artifactPath = join(outDir, 'index.json');

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function loadCatalog(text: string): AshaGameAssetCatalog {
  return JSON.parse(text) as AshaGameAssetCatalog;
}

const before = buildInitialWorkspaceReadModel();
const authoredSceneRecord = {
  id: 9401,
  parent: 1,
  childOrder: 40,
  label: 'Studio Authored Runtime Target',
  tags: ['round-trip', 'studio-authored'],
  transform: {
    translation: [3, 0.5, -1] as const,
    rotation: [0, 0, 0, 1] as const,
    scale: [1, 1, 1] as const,
  },
  kind: { kind: 'emptyGroup' as const },
};
const sceneOperation = buildStudioSceneAuthoringOperation(before.flatSceneDocument, {
  actor: 'agent',
  expectedBaseHash: studioSceneAuthoringBaseHash(before.flatSceneDocument),
  operation: { kind: 'create_scene_object', record: authoredSceneRecord },
});
assert.equal(sceneOperation.ok, true);
if (!sceneOperation.ok) throw new Error('round-trip scene create should validate');

const appliedScene = applySceneObjectCommandReadModel(
  before,
  createCreateSceneObjectRequest(before, authoredSceneRecord),
);
assert.equal(appliedScene.ok, true);
if (!appliedScene.ok) throw new Error('round-trip scene create should apply');

const originalCatalogText = readFileSync(join(demoRoot, catalogPath), 'utf8');
const originalCatalog = loadCatalog(originalCatalogText);
const authoredCatalogEntry: AshaGameAssetCatalogEntry = {
  id: 'material.studio-authored-roundtrip',
  kind: 'material',
  source: 'assets/materials/demo-copper.material.json',
  importProfile: 'inline-material.v0',
  importMetadata: {
    sourceHash: sha256(readFileSync(join(demoRoot, 'assets/materials/demo-copper.material.json'), 'utf8')),
    cacheKey: 'dev-cache/material/material.studio-authored-roundtrip',
    generatedArtifactVersion: 'asset-import.v1',
  },
  dependencies: ['texture.demo-checker'],
  publish: {
    include: false,
    outputKey: 'materials/studio-authored-roundtrip.material.json',
  },
  diagnostics: {
    owner: 'asha-studio',
    notes: ['round-trip proof fixture entry produced by Studio authoring'],
  },
};
const catalogOperation = applyStudioCatalogAuthoringOperation(originalCatalog, {
  actor: 'agent',
  expectedBaseHash: studioCatalogAuthoringBaseHash(originalCatalog),
  operation: { kind: 'create_catalog_entry', entry: authoredCatalogEntry },
});
assert.equal(catalogOperation.ok, true);
if (!catalogOperation.ok) throw new Error('round-trip catalog entry should validate');

const staleScene = applySceneObjectCommandReadModel(before, {
  ...createCreateSceneObjectRequest(before, { ...authoredSceneRecord, id: 9402, label: 'Stale Round Trip' }),
  expectedDocumentHash: -1,
});
const invalidCatalog = applyStudioCatalogAuthoringOperation(originalCatalog, {
  actor: 'agent',
  expectedBaseHash: studioCatalogAuthoringBaseHash(originalCatalog),
  operation: {
    kind: 'create_catalog_entry',
    entry: { ...authoredCatalogEntry, id: 'material.studio-authored-invalid', dependencies: ['missing.asset'] },
  },
});
assert.equal(staleScene.ok, false);
assert.equal(invalidCatalog.ok, false);

const fixtureBody = {
  fixtureKind: 'studio_authored_roundtrip_fixture',
  fixtureVersion: 'studio-authored-roundtrip-fixture.v0',
  generatedAt: 'deterministic-as-structure-only',
  producedBy: 'pnpm run proof:authored-roundtrip-fixture',
  workspace: {
    sceneId: appliedScene.workspace.scene.sceneId,
    selectedEntityId: appliedScene.workspace.selectedEntityId,
    beforeFlatSceneHash: sha256Json(before.flatSceneDocument),
    afterFlatSceneHash: sha256Json(appliedScene.workspace.flatSceneDocument),
  },
  authoredScene: {
    objectId: `scene-node:${authoredSceneRecord.id}`,
    record: authoredSceneRecord,
    operation: sceneOperation.operation,
    flatSceneDocument: appliedScene.workspace.flatSceneDocument,
    sceneObjectSnapshot: appliedScene.workspace.sceneObjectSnapshot,
  },
  authoredCatalog: {
    catalogPath,
    sourceCatalogHash: sha256(originalCatalogText),
    authoredCatalogHash: catalogOperation.catalogHash,
    authoredAssetId: authoredCatalogEntry.id,
    entry: authoredCatalogEntry,
    catalog: catalogOperation.catalog,
    operation: catalogOperation.operation,
  },
  runtimeHints: {
    expectedRenderableLabel: authoredSceneRecord.label,
    expectedAssetId: authoredCatalogEntry.id,
    expectedMaterialSource: authoredCatalogEntry.source,
  },
  nonClaims: [
    'not_runtime_loaded',
    'not_browser_interaction_evidence',
    'not_private_asset_database',
    'not_source_write_to_asha_demo',
  ],
};
const fixture = {
  ...fixtureBody,
  fixtureHash: sha256Json(fixtureBody),
};

await mkdir(fixtureDir, { recursive: true });
await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
const reopenedFixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
assert.equal(reopenedFixture.fixtureHash, fixture.fixtureHash);
assert.equal(existsSync(join(demoRoot, catalogPath)), true);

const artifactBody = {
  artifactKind: 'studio_authored_roundtrip_fixture_proof',
  artifactVersion: 'studio-authored-roundtrip-fixture-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:authored-roundtrip-fixture',
  fixture: {
    path: relative(repoRoot, fixturePath),
    fixtureHash: fixture.fixtureHash,
    fileHash: sha256(readFileSync(fixturePath, 'utf8')),
  },
  authoredRefs: {
    sceneObjectId: `scene-node:${authoredSceneRecord.id}`,
    selectedEntityId: appliedScene.workspace.selectedEntityId,
    assetId: authoredCatalogEntry.id,
    catalogHash: catalogOperation.catalogHash,
  },
  fileHashes: {
    beforeFlatSceneHash: sha256Json(before.flatSceneDocument),
    afterFlatSceneHash: sha256Json(appliedScene.workspace.flatSceneDocument),
    sourceCatalogHash: sha256(originalCatalogText),
    authoredCatalogHash: catalogOperation.catalogHash,
  },
  negativeSmokes: [
    { name: 'stale scene create', ok: staleScene.ok, diagnostics: staleScene.diagnostics },
    { name: 'invalid catalog dependency', ok: invalidCatalog.ok, diagnostics: invalidCatalog.diagnostics },
  ],
  validations: [
    'typed_scene_create_operation_validated',
    'typed_catalog_create_operation_validated',
    'committed_fixture_written_and_reopened',
    'authored_scene_and_catalog_hashes_recorded',
    'negative_stale_scene_failed_closed',
    'negative_invalid_catalog_dependency_failed_closed',
  ],
  nonClaims: fixture.nonClaims,
};
const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)} and ${relative(repoRoot, fixturePath)}`);
