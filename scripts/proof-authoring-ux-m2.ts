#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/authoring-ux-m2-proof/latest');
const artifactPath = join(outDir, 'index.json');

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function run(command: string, args: readonly string[]): {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
} {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 180000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return { command: [command, ...args].join(' '), stdout: result.stdout, stderr: result.stderr };
}

function loadArtifact(path: string, expectedKind: string): {
  readonly path: string;
  readonly artifact: Record<string, unknown>;
  readonly fileHash: string;
  readonly artifactHash: string;
} {
  const absolutePath = join(repoRoot, path);
  if (!existsSync(absolutePath)) {
    throw new Error(`missing child artifact: ${path}`);
  }
  const text = readFileSync(absolutePath, 'utf8');
  const artifact = JSON.parse(text) as Record<string, unknown>;
  assert.equal(artifact.artifactKind, expectedKind);
  assert.equal(typeof artifact.artifactHash, 'string');
  return { path, artifact, fileHash: sha256(text), artifactHash: artifact.artifactHash as string };
}

const createRun = run('pnpm', ['run', 'proof:scene-object-create-authoring']);
const editRun = run('pnpm', ['run', 'proof:scene-object-edit-authoring']);
const catalogRun = run('pnpm', ['run', 'proof:catalog-entry-authoring-ui']);
const reflectionRun = run('pnpm', ['run', 'proof:authored-state-panel-reflection']);
const typecheckRun = run('pnpm', ['exec', 'nx', 'typecheck', 'studio-domain']);
const boundaryRun = run('pnpm', ['run', 'check:boundaries']);

const create = loadArtifact(
  'artifacts/scene-object-create-authoring-proof/latest/index.json',
  'studio_scene_object_create_authoring_proof',
);
const edit = loadArtifact(
  'artifacts/scene-object-edit-authoring-proof/latest/index.json',
  'studio_scene_object_edit_authoring_proof',
);
const catalog = loadArtifact(
  'artifacts/catalog-entry-authoring-ui-proof/latest/index.json',
  'studio_catalog_entry_authoring_ui_proof',
);
const reflection = loadArtifact(
  'artifacts/authored-state-panel-reflection-proof/latest/index.json',
  'studio_authored_state_panel_reflection_proof',
);

assert.equal((create.artifact.operation as { operationKind: string }).operationKind, 'create_scene_object');
assert.equal((edit.artifact.operations as readonly { operationKind: string }[]).some(operation => operation.operationKind === 'update_scene_object'), true);
assert.equal((catalog.artifact.operation as { operationKind: string }).operationKind, 'create_catalog_entry');
assert.match(((reflection.artifact.reflection as { reflectionHash: string }).reflectionHash), /^studio-authored-state-panel-reflection-/);

const createNegatives = create.artifact.negativeSmokes as readonly { diagnostics: readonly unknown[] }[];
const editNegatives = edit.artifact.negativeSmokes as readonly { diagnostics: readonly unknown[] }[];
const catalogNegatives = catalog.artifact.negativeSmokes as readonly { diagnostics: readonly unknown[] }[];
const reflectionNegatives = reflection.artifact.negativeSmokes as readonly { diagnostics: readonly unknown[] }[];

const artifactBody = {
  artifactKind: 'studio_authoring_ux_m2_proof',
  artifactVersion: 'studio-authoring-ux-m2-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:authoring-ux-m2',
  childArtifacts: [
    { kind: create.artifact.artifactKind, path: create.path, fileHash: create.fileHash, artifactHash: create.artifactHash },
    { kind: edit.artifact.artifactKind, path: edit.path, fileHash: edit.fileHash, artifactHash: edit.artifactHash },
    { kind: catalog.artifact.artifactKind, path: catalog.path, fileHash: catalog.fileHash, artifactHash: catalog.artifactHash },
    { kind: reflection.artifact.artifactKind, path: reflection.path, fileHash: reflection.fileHash, artifactHash: reflection.artifactHash },
  ],
  commandOutputs: [
    { command: createRun.command, stdout: createRun.stdout.trim(), stderr: createRun.stderr.trim() },
    { command: editRun.command, stdout: editRun.stdout.trim(), stderr: editRun.stderr.trim() },
    { command: catalogRun.command, stdout: catalogRun.stdout.trim(), stderr: catalogRun.stderr.trim() },
    { command: reflectionRun.command, stdout: reflectionRun.stdout.trim(), stderr: reflectionRun.stderr.trim() },
    { command: typecheckRun.command, stdout: typecheckRun.stdout.trim(), stderr: typecheckRun.stderr.trim() },
    { command: boundaryRun.command, stdout: boundaryRun.stdout.trim(), stderr: boundaryRun.stderr.trim() },
  ],
  authoringCoverage: {
    sceneCreateOperationHash: (create.artifact.operation as { operationHash: string }).operationHash,
    sceneEditOperationHashes: (edit.artifact.operations as readonly { operationHash: string }[]).map(operation => operation.operationHash),
    catalogCreateOperationHash: (catalog.artifact.operation as { operationHash: string }).operationHash,
    panelReflectionHash: (reflection.artifact.reflection as { reflectionHash: string }).reflectionHash,
  },
  visibleReadouts: {
    createdHierarchyObjectId: (create.artifact.readout as { hierarchyObjectId: string }).hierarchyObjectId,
    editedHierarchyName: (edit.artifact.readout as { hierarchyName: string }).hierarchyName,
    authoredCatalogAssetId: (catalog.artifact.readout as { authoredAssetId: string }).authoredAssetId,
    reflectedAssetId: ((reflection.artifact.reflection as { assetsPanel: { assetId: string | null } }).assetsPanel).assetId,
    reflectedInspectorName: ((reflection.artifact.reflection as { inspectorPanel: { selectedObjectName: string | null } }).inspectorPanel).selectedObjectName,
  },
  diagnostics: {
    createNegativeCount: createNegatives.reduce((total, smoke) => total + smoke.diagnostics.length, 0),
    editNegativeCount: editNegatives.reduce((total, smoke) => total + smoke.diagnostics.length, 0),
    catalogNegativeCount: catalogNegatives.reduce((total, smoke) => total + smoke.diagnostics.length, 0),
    reflectionNegativeCount: reflectionNegatives.reduce((total, smoke) => total + smoke.diagnostics.length, 0),
  },
  validations: [
    'scene_object_create_child_passed',
    'scene_object_edit_child_passed',
    'catalog_entry_authoring_child_passed',
    'authored_state_panel_reflection_child_passed',
    'studio_domain_typecheck_passed',
    'boundary_guard_passed',
    'child_artifact_hashes_recorded',
    'negative_smokes_present',
  ],
  nonClaims: [
    'not_runtime_authority',
    'not_private_ui_mutation',
    'not_product_asset_pipeline',
    'not_dom_screenshot',
    'not_publish_readiness',
  ],
};
const artifact = { ...artifactBody, artifactHash: sha256Json(artifactBody) };

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
