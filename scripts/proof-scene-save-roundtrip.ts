#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseAshaGameManifestToml,
  resolveAshaAuthoringWriteTarget,
  type AshaAuthoringDiagnostic,
} from '@asha/game-workspace';
import {
  buildStudioWorkspaceOpenReadModel,
  loadStudioGameWorkspaceManifest,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-demo');
const outDir = join(repoRoot, 'artifacts/scene-save-roundtrip-proof/latest');
const artifactPath = join(outDir, 'index.json');
const manifestPath = 'asha.game.toml';
const savePath = 'scenes/studio-roundtrip.scene.json';

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

function sceneDiagnostics(payloadText: string): readonly AshaAuthoringDiagnostic[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadText);
  } catch {
    return [{ code: 'invalid_schema', path: 'payloadText', message: 'scene source payload must be valid JSON' }];
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return [{ code: 'invalid_schema', path: 'payloadText', message: 'scene source payload must be an object' }];
  }
  const record = parsed as Record<string, unknown>;
  const diagnostics: AshaAuthoringDiagnostic[] = [];
  if (record.schemaVersion !== 1) diagnostics.push({ code: 'invalid_schema', path: 'schemaVersion', message: 'scene source schemaVersion must be 1' });
  if (typeof record.sceneId !== 'number' && typeof record.sceneId !== 'string') diagnostics.push({ code: 'invalid_schema', path: 'sceneId', message: 'scene source sceneId is required' });
  if (typeof record.name !== 'string' || record.name.length === 0) diagnostics.push({ code: 'invalid_schema', path: 'name', message: 'scene source name is required' });
  if (!Array.isArray(record.catalogAssetIds)) diagnostics.push({ code: 'invalid_schema', path: 'catalogAssetIds', message: 'scene source catalogAssetIds must be an array' });
  return diagnostics;
}

async function saveSceneThroughBoundedGateway(input: {
  readonly manifestText: string;
  readonly relativePath: string;
  readonly expectedPreviousHash: string | null;
  readonly payloadText: string;
}): Promise<{
  readonly ok: boolean;
  readonly diagnostics: readonly AshaAuthoringDiagnostic[];
  readonly readback: {
    readonly normalizedPath: string;
    readonly previousFileHash: string | null;
    readonly nextFileHash: string | null;
    readonly semanticDiffHash: string | null;
    readonly validationDiagnosticsHash: string;
  } | null;
}> {
  const parsed = parseAshaGameManifestToml(input.manifestText);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error('manifest should parse');
  const resolution = resolveAshaAuthoringWriteTarget(parsed.manifest, {
    operationKind: 'authoring.scene.save_source',
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
      diagnostics: [{ code: 'stale_file_hash', path: resolution.normalizedPath, message: 'scene source previous hash did not match expectedPreviousHash' }],
      readback: {
        normalizedPath: resolution.normalizedPath,
        previousFileHash,
        nextFileHash: null,
        semanticDiffHash: null,
        validationDiagnosticsHash: sha256Json(['stale_file_hash']),
      },
    };
  }

  const validationDiagnostics = sceneDiagnostics(input.payloadText);
  if (validationDiagnostics.length > 0) {
    return {
      ok: false,
      diagnostics: validationDiagnostics,
      readback: {
        normalizedPath: resolution.normalizedPath,
        previousFileHash,
        nextFileHash: null,
        semanticDiffHash: null,
        validationDiagnosticsHash: sha256Json(validationDiagnostics),
      },
    };
  }

  await writeFile(absolutePath, input.payloadText);
  const readbackText = readFileSync(absolutePath, 'utf8');
  const nextFileHash = sha256(readbackText);
  const afterDiagnostics = sceneDiagnostics(readbackText);
  return {
    ok: afterDiagnostics.length === 0 && nextFileHash === sha256(input.payloadText),
    diagnostics: afterDiagnostics,
    readback: {
      normalizedPath: resolution.normalizedPath,
      previousFileHash,
      nextFileHash,
      semanticDiffHash: sha256Json({
        path: resolution.normalizedPath,
        before: previousText === null ? null : JSON.parse(previousText),
        after: JSON.parse(readbackText),
      }),
      validationDiagnosticsHash: sha256Json(afterDiagnostics),
    },
  };
}

const manifestText = readFileSync(join(demoRoot, manifestPath), 'utf8');
const payload = `${JSON.stringify({
  schemaVersion: 1,
  sceneId: 'studio-roundtrip',
  name: 'Studio Roundtrip Scene',
  description: 'Temporary scene source written by the bounded Studio save proof.',
  catalogAssetIds: ['mesh.demo-cube'],
  runtimeFixture: 'harness/conformance/fixtures/minimal-world.json',
}, null, 2)}\n`;

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

await rm(join(demoRoot, savePath), { force: true });
let saveResult: Awaited<ReturnType<typeof saveSceneThroughBoundedGateway>> | null = null;
let reopened = null;
try {
  saveResult = await saveSceneThroughBoundedGateway({
    manifestText,
    relativePath: savePath,
    expectedPreviousHash: null,
    payloadText: payload,
  });
  assert.equal(saveResult.ok, true);
  assert.ok(saveResult.readback);

  const reopenedText = readFileSync(join(demoRoot, savePath), 'utf8');
  reopened = buildStudioWorkspaceOpenReadModel({
    workspace: workspaceResult.workspace,
    manifestPath,
    manifestHash: sha256(manifestText),
    sourceFiles: [{ path: savePath, text: reopenedText, sha256: sha256(reopenedText) }],
  });
  assert.equal(reopened.ok, true);
} finally {
  await rm(join(demoRoot, savePath), { force: true });
}

const staleNegative = await saveSceneThroughBoundedGateway({
  manifestText,
  relativePath: savePath,
  expectedPreviousHash: 'sha256:stale',
  payloadText: payload,
});
const invalidNegative = await saveSceneThroughBoundedGateway({
  manifestText,
  relativePath: savePath,
  expectedPreviousHash: null,
  payloadText: `${JSON.stringify({ schemaVersion: 1, name: '' })}\n`,
});
const disallowedNegative = await saveSceneThroughBoundedGateway({
  manifestText,
  relativePath: 'harness/out/studio-roundtrip.scene.json',
  expectedPreviousHash: null,
  payloadText: payload,
});
assert.equal(staleNegative.ok, false);
assert.equal(invalidNegative.ok, false);
assert.equal(disallowedNegative.ok, false);

const artifactBody = {
  artifactKind: 'studio_scene_save_roundtrip_proof',
  artifactVersion: 'studio-scene-save-roundtrip-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:scene-save-roundtrip',
  demoWorkspace: {
    cwd: relative(repoRoot, demoRoot),
    manifestPath,
    manifestHash: sha256(manifestText),
  },
  save: saveResult,
  reopened,
  diffSummary: {
    path: savePath,
    beforeHash: saveResult?.readback?.previousFileHash ?? null,
    afterHash: saveResult?.readback?.nextFileHash ?? null,
    changedFields: ['created', 'schemaVersion', 'sceneId', 'name', 'catalogAssetIds', 'runtimeFixture'],
  },
  negativeSmokes: [
    { name: 'stale base hash', ok: staleNegative.ok, diagnostics: staleNegative.diagnostics },
    { name: 'invalid scene shape', ok: invalidNegative.ok, diagnostics: invalidNegative.diagnostics },
    { name: 'disallowed path', ok: disallowedNegative.ok, diagnostics: disallowedNegative.diagnostics },
  ],
  validations: [
    'scene_written_under_allowed_root',
    'saved_file_reopened_to_same_hash',
    'scene_shape_validated',
    'before_after_hashes_recorded',
    'semantic_diff_hash_recorded',
    'negative_stale_base_hash_failed_closed',
    'negative_invalid_scene_shape_failed_closed',
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
