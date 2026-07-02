#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applySceneObjectCommandReadModel,
  applyStudioCatalogAuthoringOperation,
  buildInitialWorkspaceReadModel,
  buildStudioAuthoredStatePanelReflection,
  createRenameSceneObjectRequest,
  createTranslateSceneObjectRequest,
  loadStudioAssetInventory,
  studioCatalogAuthoringBaseHash,
  type StudioAssetInventoryReadModel,
} from '@asha-studio/domain';
import type { AshaGameAssetCatalog, AshaGameAssetCatalogEntry } from '@asha/game-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-testing');
const catalogPath = 'packages/game-catalogs/catalog.json';
const outDir = join(repoRoot, 'artifacts/authored-state-panel-reflection-proof/latest');
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

function inventoryFromCatalog(catalog: AshaGameAssetCatalog, catalogHash: string): StudioAssetInventoryReadModel {
  const loaded = loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: {
      path: 'asha.game.toml',
      hash: sha256(readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8')),
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
      evidenceRefs: [{ kind: 'catalog-authoring', path: catalogPath, sha256: catalogHash }],
    })),
  });
  assert.equal(loaded.ok, true);
  if (!loaded.ok) throw new Error('asset inventory should load');
  return loaded.inventory;
}

const initial = buildInitialWorkspaceReadModel();
const targetId = initial.selectedEntityId;
assert.ok(targetId?.startsWith('scene-node:'));
const authoredSceneObjectLabel = 'Panel-reflected authoring object';
const renamed = applySceneObjectCommandReadModel(
  initial,
  createRenameSceneObjectRequest(initial, targetId, authoredSceneObjectLabel),
);
assert.equal(renamed.ok, true);
const transformed = applySceneObjectCommandReadModel(
  renamed.workspace,
  createTranslateSceneObjectRequest(renamed.workspace, targetId, [0.25, 0, 0]),
);
assert.equal(transformed.ok, true);
const reopenedSceneDocument = JSON.parse(JSON.stringify(transformed.workspace.flatSceneDocument));
assert.deepEqual(reopenedSceneDocument, transformed.workspace.flatSceneDocument);

const originalText = readFileSync(join(demoRoot, catalogPath), 'utf8');
const originalCatalog = loadCatalog(originalText);
const authoredEntry: AshaGameAssetCatalogEntry = {
  id: 'material.studio-panel-reflection',
  kind: 'material',
  source: 'assets/materials/demo-copper.material.json',
  importProfile: 'inline-material.v0',
  importMetadata: {
    sourceHash: sha256(readFileSync(join(demoRoot, 'assets/materials/demo-copper.material.json'), 'utf8')),
    cacheKey: 'dev-cache/material/material.studio-panel-reflection',
    generatedArtifactVersion: 'asset-import.v1',
  },
  dependencies: ['texture.demo-checker'],
  publish: {
    include: false,
    outputKey: 'materials/studio-panel-reflection.material.json',
  },
  diagnostics: {
    owner: 'asha-studio',
    notes: ['temporary panel reflection proof entry'],
  },
};

let catalogOperation: ReturnType<typeof applyStudioCatalogAuthoringOperation> | null = null;
let inventory: StudioAssetInventoryReadModel | null = null;
try {
  catalogOperation = applyStudioCatalogAuthoringOperation(originalCatalog, {
    actor: 'agent',
    expectedBaseHash: studioCatalogAuthoringBaseHash(originalCatalog),
    operation: { kind: 'create_catalog_entry', entry: authoredEntry },
  });
  assert.equal(catalogOperation.ok, true);
  await writeFile(join(demoRoot, catalogPath), `${JSON.stringify(catalogOperation.catalog, null, 2)}\n`);
  const reopenedText = readFileSync(join(demoRoot, catalogPath), 'utf8');
  inventory = inventoryFromCatalog(loadCatalog(reopenedText), sha256(reopenedText));
} finally {
  await writeFile(join(demoRoot, catalogPath), originalText);
}
assert.ok(inventory);

const visiblePanelMarkers = [
  'studio-hierarchy-panel',
  'studio-viewport-top-panel',
  'studio-inspector-panel',
  'studio-assets-panel',
];
const reflection = buildStudioAuthoredStatePanelReflection({
  workspace: transformed.workspace,
  assetInventory: inventory,
  authoredSceneObjectId: targetId,
  authoredSceneObjectLabel,
  authoredCatalogAssetId: authoredEntry.id,
  visiblePanelMarkers,
});
assert.equal(reflection.ok, true);

const missingAssetReflection = buildStudioAuthoredStatePanelReflection({
  workspace: transformed.workspace,
  assetInventory: inventory,
  authoredSceneObjectId: targetId,
  authoredSceneObjectLabel,
  authoredCatalogAssetId: 'material.missing-panel-reflection',
  visiblePanelMarkers,
});
const missingMarkerReflection = buildStudioAuthoredStatePanelReflection({
  workspace: transformed.workspace,
  assetInventory: inventory,
  authoredSceneObjectId: targetId,
  authoredSceneObjectLabel,
  authoredCatalogAssetId: authoredEntry.id,
  visiblePanelMarkers: visiblePanelMarkers.filter(marker => marker !== 'studio-inspector-panel'),
});
assert.equal(missingAssetReflection.ok, false);
assert.equal(missingMarkerReflection.ok, false);

const artifactBody = {
  artifactKind: 'studio_authored_state_panel_reflection_proof',
  artifactVersion: 'studio-authored-state-panel-reflection-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:authored-state-panel-reflection',
  scene: {
    objectId: targetId,
    savedDocumentHash: sha256Json(transformed.workspace.flatSceneDocument),
    reopenedDocumentHash: sha256Json(reopenedSceneDocument),
    timelineCommandIds: transformed.workspace.timeline.slice(-2).map(entry => entry.commandId),
  },
  catalog: {
    assetId: authoredEntry.id,
    operationHash: catalogOperation?.operation.operationHash ?? 'missing',
    restoredCatalogHash: sha256(originalText),
    inventoryHash: inventory.inventoryHash,
  },
  reflection: reflection.reflection,
  negativeSmokes: [
    {
      name: 'missing authored asset panel entry',
      ok: missingAssetReflection.ok,
      diagnostics: missingAssetReflection.diagnostics,
    },
    {
      name: 'missing inspector panel marker',
      ok: missingMarkerReflection.ok,
      diagnostics: missingMarkerReflection.diagnostics,
    },
  ],
  validations: [
    'saved_scene_document_reopened',
    'saved_catalog_reopened',
    'hierarchy_panel_reflects_authored_scene_object',
    'viewport_panel_reflects_authored_selection',
    'inspector_panel_reflects_authored_scene_object_and_asset',
    'assets_panel_reflects_authored_catalog_entry',
    'negative_missing_asset_failed_closed',
    'negative_missing_marker_failed_closed',
  ],
  nonClaims: [
    'not_runtime_authority',
    'not_private_ui_mutation',
    'not_dom_screenshot',
  ],
};
const artifact = { ...artifactBody, artifactHash: sha256Json(artifactBody) };

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
