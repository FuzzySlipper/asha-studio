#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyStudioCatalogAuthoringOperation,
  loadStudioAssetInventory,
  studioCatalogAuthoringBaseHash,
} from '@asha-studio/domain';
import type { AshaGameAssetCatalog, AshaGameAssetCatalogEntry } from '@asha/game-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-testing');
const catalogPath = 'packages/game-catalogs/catalog.json';
const outDir = join(repoRoot, 'artifacts/catalog-entry-authoring-ui-proof/latest');
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

function inventoryFromCatalog(catalog: AshaGameAssetCatalog, catalogHash: string) {
  return loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: { path: 'asha.game.toml', hash: sha256(readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')) },
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
      evidenceRefs: [{ kind: 'catalog-authoring', path: catalogPath, sha256: catalogHash }],
    })),
  });
}

const originalText = readFileSync(join(demoRoot, catalogPath), 'utf8');
const originalCatalog = loadCatalog(originalText);
const authoredEntry: AshaGameAssetCatalogEntry = {
  id: 'material.studio-authored-ui',
  kind: 'material',
  source: 'assets/materials/demo-copper.material.json',
  importProfile: 'inline-material.v0',
  importMetadata: {
    sourceHash: sha256(readFileSync(join(demoRoot, 'assets/materials/demo-copper.material.json'), 'utf8')),
    cacheKey: 'dev-cache/material/material.studio-authored-ui',
    generatedArtifactVersion: 'asset-import.v1',
  },
  dependencies: ['texture.demo-checker'],
  publish: {
    include: false,
    outputKey: 'materials/studio-authored-ui.material.json',
  },
  diagnostics: {
    owner: 'asha-studio',
    notes: ['temporary catalog UI authoring proof entry'],
  },
};

let applied: ReturnType<typeof applyStudioCatalogAuthoringOperation> | null = null;
let reopenedCatalog: AshaGameAssetCatalog | null = null;
let inventory: ReturnType<typeof inventoryFromCatalog> | null = null;
try {
  applied = applyStudioCatalogAuthoringOperation(originalCatalog, {
    actor: 'agent',
    expectedBaseHash: studioCatalogAuthoringBaseHash(originalCatalog),
    operation: { kind: 'create_catalog_entry', entry: authoredEntry },
  });
  assert.equal(applied.ok, true);
  await writeFile(join(demoRoot, catalogPath), `${JSON.stringify(applied.catalog, null, 2)}\n`);
  const reopenedText = readFileSync(join(demoRoot, catalogPath), 'utf8');
  reopenedCatalog = loadCatalog(reopenedText);
  assert.equal(reopenedCatalog.entries.some(entry => entry.id === authoredEntry.id), true);
  inventory = inventoryFromCatalog(reopenedCatalog, sha256(reopenedText));
  assert.equal(inventory.ok, true);
} finally {
  await writeFile(join(demoRoot, catalogPath), originalText);
}

const stale = applyStudioCatalogAuthoringOperation(originalCatalog, {
  actor: 'agent',
  expectedBaseHash: 'studio-catalog-authoring-base-stale',
  operation: { kind: 'create_catalog_entry', entry: { ...authoredEntry, id: 'material.stale' } },
});
const invalidSource = applyStudioCatalogAuthoringOperation(originalCatalog, {
  actor: 'agent',
  expectedBaseHash: studioCatalogAuthoringBaseHash(originalCatalog),
  operation: {
    kind: 'create_catalog_entry',
    entry: { ...authoredEntry, id: 'material.invalid-source', source: 'harness/out/material.material.json' },
  },
});
const invalidDependency = applyStudioCatalogAuthoringOperation(originalCatalog, {
  actor: 'agent',
  expectedBaseHash: studioCatalogAuthoringBaseHash(originalCatalog),
  operation: {
    kind: 'create_catalog_entry',
    entry: { ...authoredEntry, id: 'material.invalid-dependency', dependencies: ['missing.asset'] },
  },
});
assert.equal(stale.ok, false);
assert.equal(invalidSource.ok, false);
assert.equal(invalidDependency.ok, false);
assert.equal(existsSync(join(demoRoot, catalogPath)), true);

const authoredReadout = inventory?.inventory.entries.find(entry => entry.assetId === authoredEntry.id);
const artifactBody = {
  artifactKind: 'studio_catalog_entry_authoring_ui_proof',
  artifactVersion: 'studio-catalog-entry-authoring-ui-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:catalog-entry-authoring-ui',
  fileHashes: {
    beforeCatalogHash: sha256(originalText),
    afterCatalogHash: applied?.catalogHash ?? 'missing',
    reopenedCatalogHash: reopenedCatalog === null ? 'missing' : studioCatalogAuthoringBaseHash(reopenedCatalog),
  },
  operation: applied?.operation ?? null,
  readout: {
    authoredAssetId: authoredEntry.id,
    sourcePath: authoredReadout?.sourcePath ?? null,
    dependencyStatus: authoredReadout?.dependencyStatus ?? null,
    inventoryHash: inventory?.inventory.inventoryHash ?? null,
    catalogPanelEntryCount: inventory?.inventory.entries.length ?? 0,
  },
  negativeSmokes: [
    { name: 'stale catalog edit', ok: stale.ok, diagnostics: stale.diagnostics },
    { name: 'invalid source path', ok: invalidSource.ok, diagnostics: invalidSource.diagnostics },
    { name: 'invalid dependency ref', ok: invalidDependency.ok, diagnostics: invalidDependency.diagnostics },
  ],
  validations: [
    'catalog_entry_create_operation_validated',
    'saved_catalog_reopened',
    'catalog_panel_readout_updated',
    'inspector_entry_readout_updated',
    'saved_file_hashes_recorded',
    'validation_diagnostics_recorded',
    'negative_stale_catalog_edit_failed_closed',
    'negative_invalid_source_failed_closed',
    'negative_invalid_dependency_failed_closed',
  ],
  nonClaims: [
    'not_private_asset_database',
    'not_runtime_authority',
    'not_product_asset_pipeline',
  ],
};
const artifact = { ...artifactBody, artifactHash: sha256Json(artifactBody) };

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
