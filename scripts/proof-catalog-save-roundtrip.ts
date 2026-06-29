#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseAshaGameManifestToml,
  resolveAshaAuthoringWriteTarget,
  validateAshaGameAssetCatalog,
  type AshaAuthoringDiagnostic,
  type AshaGameAssetCatalog,
} from '@asha/game-workspace';
import {
  buildStudioWorkspaceOpenReadModel,
  loadStudioGameWorkspaceManifest,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-demo');
const outDir = join(repoRoot, 'artifacts/catalog-save-roundtrip-proof/latest');
const artifactPath = join(outDir, 'index.json');
const manifestPath = 'asha.game.toml';
const catalogPath = 'packages/game-catalogs/catalog.json';

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function loadDemoPackageScripts(): Record<string, string> {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).scripts;
}

function loadDemoPackageName(): string {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).name;
}

function loadCatalog(text: string): AshaGameAssetCatalog {
  return JSON.parse(text) as AshaGameAssetCatalog;
}

function catalogWithRoundtripEntry(originalText: string): string {
  const catalog = loadCatalog(originalText);
  const next: AshaGameAssetCatalog = {
    schemaVersion: 1,
    entries: [
      ...catalog.entries,
      {
        id: 'material.studio-roundtrip',
        kind: 'material',
        source: 'assets/materials/demo-copper.material.json',
        importProfile: 'inline-material.v0',
        importMetadata: {
          sourceHash: sha256(readFileSync(join(demoRoot, 'assets/materials/demo-copper.material.json'), 'utf8')),
          cacheKey: 'dev-cache/material/material.studio-roundtrip',
          generatedArtifactVersion: 'asset-import.v1',
        },
        dependencies: ['texture.demo-checker'],
        publish: {
          include: false,
          outputKey: 'materials/studio-roundtrip.material.json',
        },
        diagnostics: {
          owner: 'asha-studio',
          notes: ['temporary catalog roundtrip proof entry'],
        },
      },
    ],
  };
  return `${JSON.stringify(next, null, 2)}\n`;
}

async function saveCatalogThroughBoundedGateway(input: {
  readonly manifestText: string;
  readonly relativePath: string;
  readonly expectedPreviousHash: string | null;
  readonly payloadText: string;
}): Promise<{
  readonly ok: boolean;
  readonly diagnostics: readonly (AshaAuthoringDiagnostic | { readonly code: string; readonly path: string; readonly message: string })[];
  readonly readback: {
    readonly normalizedPath: string;
    readonly previousFileHash: string | null;
    readonly nextFileHash: string | null;
    readonly semanticDiffHash: string | null;
    readonly validationDiagnosticsHash: string;
    readonly dependencyDiagnostics: readonly string[];
  } | null;
}> {
  const parsed = parseAshaGameManifestToml(input.manifestText);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error('manifest should parse');
  const resolution = resolveAshaAuthoringWriteTarget(parsed.manifest, {
    operationKind: 'authoring.catalog.save_source',
    relativePath: input.relativePath,
  });
  if (!resolution.ok) {
    return { ok: false, diagnostics: resolution.diagnostics, readback: null };
  }

  const absolutePath = join(demoRoot, resolution.normalizedPath);
  const previousText = existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : null;
  const previousFileHash = previousText === null ? null : sha256(previousText);
  if (previousFileHash !== input.expectedPreviousHash) {
    return {
      ok: false,
      diagnostics: [{ code: 'stale_file_hash', path: resolution.normalizedPath, message: 'catalog previous hash did not match expectedPreviousHash' }],
      readback: {
        normalizedPath: resolution.normalizedPath,
        previousFileHash,
        nextFileHash: null,
        semanticDiffHash: null,
        validationDiagnosticsHash: sha256Json(['stale_file_hash']),
        dependencyDiagnostics: [],
      },
    };
  }

  let catalog: AshaGameAssetCatalog;
  try {
    catalog = loadCatalog(input.payloadText);
  } catch {
    return {
      ok: false,
      diagnostics: [{ code: 'invalid_schema', path: 'payloadText', message: 'catalog payload must be valid JSON' }],
      readback: {
        normalizedPath: resolution.normalizedPath,
        previousFileHash,
        nextFileHash: null,
        semanticDiffHash: null,
        validationDiagnosticsHash: sha256Json(['invalid_schema']),
        dependencyDiagnostics: [],
      },
    };
  }
  const validation = validateAshaGameAssetCatalog(
    catalog,
    parsed.manifest,
    path => existsSync(join(demoRoot, path)),
    { sourceHash: path => existsSync(join(demoRoot, path)) ? sha256(readFileSync(join(demoRoot, path), 'utf8')) : null },
  );
  if (!validation.ok) {
    return {
      ok: false,
      diagnostics: validation.diagnostics,
      readback: {
        normalizedPath: resolution.normalizedPath,
        previousFileHash,
        nextFileHash: null,
        semanticDiffHash: null,
        validationDiagnosticsHash: sha256Json(validation.diagnostics),
        dependencyDiagnostics: validation.diagnostics.map(diagnostic => diagnostic.code),
      },
    };
  }

  await writeFile(absolutePath, input.payloadText);
  const readbackText = readFileSync(absolutePath, 'utf8');
  const nextFileHash = sha256(readbackText);
  const reopenedValidation = validateAshaGameAssetCatalog(loadCatalog(readbackText), parsed.manifest, path => existsSync(join(demoRoot, path)));
  const dependencyDiagnostics = reopenedValidation.ok ? [] : reopenedValidation.diagnostics.map(diagnostic => diagnostic.code);
  return {
    ok: reopenedValidation.ok && nextFileHash === sha256(input.payloadText),
    diagnostics: reopenedValidation.ok ? [] : reopenedValidation.diagnostics,
    readback: {
      normalizedPath: resolution.normalizedPath,
      previousFileHash,
      nextFileHash,
      semanticDiffHash: sha256Json({
        path: resolution.normalizedPath,
        beforeEntryCount: previousText === null ? 0 : loadCatalog(previousText).entries.length,
        afterEntryCount: loadCatalog(readbackText).entries.length,
        addedAssetIds: ['material.studio-roundtrip'],
      }),
      validationDiagnosticsHash: sha256Json(reopenedValidation.ok ? [] : reopenedValidation.diagnostics),
      dependencyDiagnostics,
    },
  };
}

const manifestText = readFileSync(join(demoRoot, manifestPath), 'utf8');
const originalCatalogText = readFileSync(join(demoRoot, catalogPath), 'utf8');
const originalCatalogHash = sha256(originalCatalogText);
const payload = catalogWithRoundtripEntry(originalCatalogText);
const workspaceResult = loadStudioGameWorkspaceManifest({
  workspaceRoot: demoRoot,
  manifestPath,
  gameId: loadDemoPackageName(),
  manifestText,
  packageScripts: loadDemoPackageScripts(),
  pathExists: path => existsSync(join(demoRoot, path)),
});
assert.equal(workspaceResult.ok, true);
if (!workspaceResult.ok) throw new Error('asha-demo workspace failed to load');

let saveResult: Awaited<ReturnType<typeof saveCatalogThroughBoundedGateway>> | null = null;
let reopened = null;
try {
  saveResult = await saveCatalogThroughBoundedGateway({
    manifestText,
    relativePath: catalogPath,
    expectedPreviousHash: originalCatalogHash,
    payloadText: payload,
  });
  assert.equal(saveResult.ok, true);
  assert.ok(saveResult.readback);
  const reopenedText = readFileSync(join(demoRoot, catalogPath), 'utf8');
  reopened = buildStudioWorkspaceOpenReadModel({
    workspace: workspaceResult.workspace,
    manifestPath,
    manifestHash: sha256(manifestText),
    sourceFiles: [{ path: catalogPath, text: reopenedText, sha256: sha256(reopenedText) }],
  });
  assert.equal(reopened.ok, true);
} finally {
  await writeFile(join(demoRoot, catalogPath), originalCatalogText);
}

const duplicateCatalog = loadCatalog(originalCatalogText);
const duplicatePayload = `${JSON.stringify({
  schemaVersion: 1,
  entries: [...duplicateCatalog.entries, duplicateCatalog.entries[0]],
}, null, 2)}\n`;
const invalidRefPayload = `${JSON.stringify({
  schemaVersion: 1,
  entries: [{
    ...duplicateCatalog.entries[0],
    id: 'mesh.invalid-ref',
    source: 'assets/meshes/missing.mesh.json',
    dependencies: ['missing.asset'],
  }],
}, null, 2)}\n`;
const staleNegative = await saveCatalogThroughBoundedGateway({
  manifestText,
  relativePath: catalogPath,
  expectedPreviousHash: 'sha256:stale',
  payloadText: payload,
});
const duplicateNegative = await saveCatalogThroughBoundedGateway({
  manifestText,
  relativePath: catalogPath,
  expectedPreviousHash: originalCatalogHash,
  payloadText: duplicatePayload,
});
const invalidRefNegative = await saveCatalogThroughBoundedGateway({
  manifestText,
  relativePath: catalogPath,
  expectedPreviousHash: originalCatalogHash,
  payloadText: invalidRefPayload,
});
const disallowedNegative = await saveCatalogThroughBoundedGateway({
  manifestText,
  relativePath: 'harness/out/catalog.json',
  expectedPreviousHash: null,
  payloadText: payload,
});
assert.equal(staleNegative.ok, false);
assert.equal(duplicateNegative.ok, false);
assert.equal(invalidRefNegative.ok, false);
assert.equal(disallowedNegative.ok, false);

const artifactBody = {
  artifactKind: 'studio_catalog_save_roundtrip_proof',
  artifactVersion: 'studio-catalog-save-roundtrip-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:catalog-save-roundtrip',
  demoWorkspace: {
    cwd: relative(repoRoot, demoRoot),
    manifestPath,
    manifestHash: sha256(manifestText),
  },
  save: saveResult,
  reopened,
  diffSummary: {
    path: catalogPath,
    beforeHash: saveResult?.readback?.previousFileHash ?? null,
    afterHash: saveResult?.readback?.nextFileHash ?? null,
    addedAssetIds: ['material.studio-roundtrip'],
    dependencyDiagnostics: saveResult?.readback?.dependencyDiagnostics ?? [],
  },
  negativeSmokes: [
    { name: 'stale base hash', ok: staleNegative.ok, diagnostics: staleNegative.diagnostics },
    { name: 'duplicate ids', ok: duplicateNegative.ok, diagnostics: duplicateNegative.diagnostics },
    { name: 'invalid asset refs', ok: invalidRefNegative.ok, diagnostics: invalidRefNegative.diagnostics },
    { name: 'disallowed path', ok: disallowedNegative.ok, diagnostics: disallowedNegative.diagnostics },
  ],
  validations: [
    'catalog_written_under_allowed_root',
    'saved_catalog_reopened_to_same_hash',
    'catalog_shape_validated',
    'stable_asset_ids_recorded',
    'before_after_hashes_recorded',
    'dependency_diagnostics_recorded',
    'negative_duplicate_ids_failed_closed',
    'negative_stale_base_hash_failed_closed',
    'negative_invalid_asset_refs_failed_closed',
    'negative_disallowed_path_failed_closed',
  ],
  nonClaims: [
    'not_repo_crawler',
    'not_private_asset_database',
    'not_runtime_authority',
    'not_generated_artifact_source',
  ],
};

const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
