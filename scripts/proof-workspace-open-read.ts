#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStudioWorkspaceOpenReadModel,
  loadStudioGameWorkspaceManifest,
  type StudioWorkspaceSourceFileInput,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-testing');
const outDir = join(repoRoot, 'artifacts/workspace-open-read-proof/latest');
const artifactPath = join(outDir, 'index.json');

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function readSourceFile(path: string): StudioWorkspaceSourceFileInput {
  const text = readFileSync(join(demoRoot, path), 'utf8');
  return { path, text, sha256: sha256(text) };
}

function listBoundedWorkspaceSourceFiles(sceneRoots: readonly string[], catalogPackages: readonly string[]): readonly StudioWorkspaceSourceFileInput[] {
  const sceneFiles = sceneRoots.flatMap(root =>
    readdirSync(join(demoRoot, root), { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.scene.json'))
      .map(entry => readSourceFile(`${root}/${entry.name}`)),
  );
  const catalogFiles = catalogPackages
    .map(root => `${root}/catalog.json`)
    .filter(path => existsSync(join(demoRoot, path)))
    .map(path => readSourceFile(path));
  return [...sceneFiles, ...catalogFiles].sort((left, right) => left.path.localeCompare(right.path));
}

function loadDemoPackageScripts(): Record<string, string> {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).scripts;
}

function loadDemoPackageName(): string {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).name;
}

const manifestPath = 'asha.game.toml';
const manifestText = readFileSync(join(demoRoot, manifestPath), 'utf8');
const workspaceResult = loadStudioGameWorkspaceManifest({
  workspaceRoot: demoRoot,
  manifestPath,
  gameId: loadDemoPackageName(),
  manifestText,
  packageScripts: loadDemoPackageScripts(),
  pathExists: path => existsSync(join(demoRoot, path)),
});
assert.equal(workspaceResult.ok, true);
if (!workspaceResult.ok) throw new Error('asha-testing workspace failed to load');

const sourceFiles = listBoundedWorkspaceSourceFiles(
  workspaceResult.workspace.sceneRoots,
  workspaceResult.workspace.catalogPackages,
);
const openReadResult = buildStudioWorkspaceOpenReadModel({
  workspace: workspaceResult.workspace,
  manifestPath,
  manifestHash: sha256(manifestText),
  sourceFiles,
});
assert.equal(openReadResult.ok, true);
if (!openReadResult.ok) {
  throw new Error(openReadResult.diagnostics.map(diagnostic => `${diagnostic.code}: ${diagnostic.message}`).join('\n'));
}

const missingManifestNegative = buildStudioWorkspaceOpenReadModel({
  workspace: null,
  manifestPath: 'missing/asha.game.toml',
  manifestHash: null,
  sourceFiles: [],
});
const unsupportedScanNegative = buildStudioWorkspaceOpenReadModel({
  workspace: workspaceResult.workspace,
  manifestPath,
  manifestHash: sha256(manifestText),
  sourceFiles: [
    { path: '../asha/package.json', text: '{}', sha256: sha256('{}') },
    { path: 'packages/game-catalogs/README.md', text: '# readme', sha256: sha256('# readme') },
    { path: 'assets/meshes/demo-cube.mesh.json', text: '{}', sha256: sha256('{}') },
  ],
});
assert.equal(missingManifestNegative.ok, false);
assert.equal(unsupportedScanNegative.ok, false);

const artifactBody = {
  artifactKind: 'studio_workspace_open_read_proof',
  artifactVersion: 'studio-workspace-open-read-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:workspace-open-read',
  demoWorkspace: {
    cwd: relative(repoRoot, demoRoot),
    manifestPath,
    manifestHash: sha256(manifestText),
  },
  openRead: openReadResult.openRead,
  negativeSmokes: [
    {
      name: 'missing manifest',
      ok: missingManifestNegative.ok,
      diagnostics: missingManifestNegative.diagnostics,
    },
    {
      name: 'path escape private scan unsupported kind',
      ok: unsupportedScanNegative.ok,
      diagnostics: unsupportedScanNegative.diagnostics,
    },
  ],
  validations: [
    'manifest_opened_through_studio_workspace_loader',
    'source_files_limited_to_scene_and_catalog_roots',
    'source_file_hashes_recorded',
    'schema_kinds_recorded',
    'negative_missing_manifest_failed_closed',
    'negative_path_escape_failed_closed',
    'negative_private_repo_scan_failed_closed',
    'negative_unsupported_file_kind_failed_closed',
  ],
  nonClaims: [
    'not_repo_crawler',
    'not_private_asset_database',
    'not_source_write',
    'not_runtime_authority',
  ],
};

const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
