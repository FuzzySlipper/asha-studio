#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildInitialWorkspaceReadModel,
  buildStudioLiveSceneEntityDebugInspector,
  type StudioLiveDebugSessionIdentityReadModel,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/live-scene-entity-debug-inspector-proof/latest');
const artifactPath = join(outDir, 'index.json');
const identityArtifactPath = 'artifacts/live-debug-session-identity-proof/latest/index.json';

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

const identityRun = run('pnpm', ['run', 'proof:live-debug-session-identity']);
const identityText = readFileSync(join(repoRoot, identityArtifactPath), 'utf8');
const identityArtifact = JSON.parse(identityText);
assert.equal(identityArtifact.artifactKind, 'studio_live_debug_session_identity_proof');
assert.equal(existsSync(join(repoRoot, identityArtifactPath)), true);
const identity = identityArtifact.identity as StudioLiveDebugSessionIdentityReadModel;

const workspace = buildInitialWorkspaceReadModel();
const inspector = buildStudioLiveSceneEntityDebugInspector({
  workspace,
  liveSessionIdentity: identity,
});
assert.equal(inspector.ok, true);
if (!inspector.ok) throw new Error(JSON.stringify(inspector.diagnostics));

const noSelection = buildStudioLiveSceneEntityDebugInspector({
  workspace: { ...workspace, selectedEntityId: null },
  liveSessionIdentity: identity,
});
const staleSession = buildStudioLiveSceneEntityDebugInspector({
  workspace,
  liveSessionIdentity: {
    ...identity,
    attachStatus: 'not_attached',
    liveFreshness: { ...identity.liveFreshness, readAfterAttach: false },
  },
});
assert.equal(noSelection.ok, false);
assert.ok(noSelection.diagnostics.some(diagnostic => diagnostic.code === 'missing_selected_entity'));
assert.equal(staleSession.ok, false);
assert.ok(staleSession.diagnostics.some(diagnostic => diagnostic.code === 'missing_live_session'));

const artifactBody = {
  artifactKind: 'studio_live_scene_entity_debug_inspector_proof',
  artifactVersion: 'studio-live-scene-entity-debug-inspector-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:live-scene-entity-debug-inspector',
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
  ],
  inspector: inspector.inspector,
  negativeSmokes: [
    { name: 'missing selected entity', ok: noSelection.ok, diagnostics: noSelection.diagnostics },
    { name: 'stale live session', ok: staleSession.ok, diagnostics: staleSession.diagnostics },
  ],
  validations: [
    'live_debug_session_identity_child_passed',
    'scene_id_hash_and_renderable_count_present',
    'selected_entity_readback_present',
    'scene_object_snapshot_hash_present',
    'selected_entity_transform_projected',
    'negative_missing_selection_failed_closed',
    'negative_stale_live_session_failed_closed',
  ],
  nonClaims: [
    'not_runtime_authority',
    'not_private_ecs_read',
    'not_source_authoring_write',
  ],
};
const artifact = { ...artifactBody, artifactHash: sha256Json(artifactBody) };

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
