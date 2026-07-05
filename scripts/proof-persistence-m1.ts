#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/persistence-m1-proof/latest');
const artifactPath = join(outDir, 'index.json');

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function run(command: string, args: readonly string[]): { readonly command: string; readonly stdout: string; readonly stderr: string } {
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
  if (!existsSync(join(repoRoot, path))) {
    throw new Error(`missing child artifact: ${path}`);
  }
  const text = readFileSync(join(repoRoot, path), 'utf8');
  const artifact = JSON.parse(text) as Record<string, unknown>;
  assert.equal(artifact.artifactKind, expectedKind);
  assert.equal(typeof artifact.artifactHash, 'string');
  return { path, artifact, fileHash: sha256(text), artifactHash: artifact.artifactHash as string };
}

const openRun = run('pnpm', ['run', 'evidence', '--', 'workspace-open-read']);
const sceneRun = run('pnpm', ['run', 'evidence', '--', 'scene-save-roundtrip']);
const catalogRun = run('pnpm', ['run', 'evidence', '--', 'catalog-save-roundtrip']);
const boundaryRun = run('pnpm', ['run', 'check:boundaries']);

const open = loadArtifact('artifacts/workspace-open-read-proof/latest/index.json', 'studio_workspace_open_read_proof');
const scene = loadArtifact('artifacts/scene-save-roundtrip-proof/latest/index.json', 'studio_scene_save_roundtrip_proof');
const catalog = loadArtifact('artifacts/catalog-save-roundtrip-proof/latest/index.json', 'studio_catalog_save_roundtrip_proof');

assert.equal((open.artifact.openRead as { diagnostics: readonly unknown[] }).diagnostics.length, 0);
assert.equal((scene.artifact.save as { ok: boolean }).ok, true);
assert.equal((catalog.artifact.save as { ok: boolean }).ok, true);

const artifactBody = {
  artifactKind: 'studio_persistence_m1_proof',
  artifactVersion: 'studio-persistence-m1-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- persistence-m1',
  childArtifacts: [
    { kind: open.artifact.artifactKind, path: open.path, fileHash: open.fileHash, artifactHash: open.artifactHash },
    { kind: scene.artifact.artifactKind, path: scene.path, fileHash: scene.fileHash, artifactHash: scene.artifactHash },
    { kind: catalog.artifact.artifactKind, path: catalog.path, fileHash: catalog.fileHash, artifactHash: catalog.artifactHash },
  ],
  commandOutputs: [
    { command: openRun.command, stdout: openRun.stdout.trim(), stderr: openRun.stderr.trim() },
    { command: sceneRun.command, stdout: sceneRun.stdout.trim(), stderr: sceneRun.stderr.trim() },
    { command: catalogRun.command, stdout: catalogRun.stdout.trim(), stderr: catalogRun.stderr.trim() },
    { command: boundaryRun.command, stdout: boundaryRun.stdout.trim(), stderr: boundaryRun.stderr.trim() },
  ],
  workspaceOpen: {
    allowedSceneRoots: (open.artifact.openRead as { allowedSceneRoots: readonly string[] }).allowedSceneRoots,
    allowedCatalogRoots: (open.artifact.openRead as { allowedCatalogRoots: readonly string[] }).allowedCatalogRoots,
    sourceFileCount: (open.artifact.openRead as { sourceFiles: readonly unknown[] }).sourceFiles.length,
  },
  saveHashes: {
    sceneBefore: ((scene.artifact.save as { readback: { previousFileHash: string | null } }).readback).previousFileHash,
    sceneAfter: ((scene.artifact.save as { readback: { nextFileHash: string } }).readback).nextFileHash,
    catalogBefore: ((catalog.artifact.save as { readback: { previousFileHash: string | null } }).readback).previousFileHash,
    catalogAfter: ((catalog.artifact.save as { readback: { nextFileHash: string } }).readback).nextFileHash,
  },
  diagnostics: {
    openNegativeCount: (open.artifact.negativeSmokes as readonly { diagnostics: readonly unknown[] }[]).reduce((total, smoke) => total + smoke.diagnostics.length, 0),
    sceneNegativeCount: (scene.artifact.negativeSmokes as readonly { diagnostics: readonly unknown[] }[]).reduce((total, smoke) => total + smoke.diagnostics.length, 0),
    catalogNegativeCount: (catalog.artifact.negativeSmokes as readonly { diagnostics: readonly unknown[] }[]).reduce((total, smoke) => total + smoke.diagnostics.length, 0),
  },
  validations: [
    'workspace_open_child_passed',
    'scene_save_roundtrip_child_passed',
    'catalog_save_roundtrip_child_passed',
    'boundary_guard_passed',
    'child_artifacts_present',
    'child_artifact_hashes_recorded',
    'negative_smokes_present',
  ],
  nonClaims: [
    'not_repo_crawler',
    'not_private_asset_database',
    'not_runtime_authority',
    'not_generated_artifact_source',
    'not_product_readiness',
  ],
};

const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
