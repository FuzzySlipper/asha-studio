#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStudioLiveRuntimeTelemetryDebugInspector,
  type StudioGameWorkspaceLiveReadModel,
  type StudioLiveDebugSessionIdentityReadModel,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const identityArtifactPath = 'artifacts/live-debug-session-identity-proof/latest/index.json';
const attachArtifactPath = 'artifacts/selected-backend-attach-proof/latest/index.json';
const outDir = join(repoRoot, 'artifacts/live-runtime-telemetry-debug-inspector-proof/latest');
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

const identityRun = run('pnpm', ['run', 'evidence', '--', 'live-debug-session-identity']);
const identityText = readFileSync(join(repoRoot, identityArtifactPath), 'utf8');
const attachText = readFileSync(join(repoRoot, attachArtifactPath), 'utf8');
const identityArtifact = JSON.parse(identityText);
const attachArtifact = JSON.parse(attachText);
assert.equal(identityArtifact.artifactKind, 'studio_live_debug_session_identity_proof');
assert.equal(attachArtifact.artifactKind, 'studio_selected_backend_attach_proof');
const identity = identityArtifact.identity as StudioLiveDebugSessionIdentityReadModel;
const live = attachArtifact.live as StudioGameWorkspaceLiveReadModel;

const inspector = buildStudioLiveRuntimeTelemetryDebugInspector({
  liveSessionIdentity: identity,
  live,
});
assert.equal(inspector.ok, true);
if (!inspector.ok) throw new Error(JSON.stringify(inspector.diagnostics));

const missingTelemetry = buildStudioLiveRuntimeTelemetryDebugInspector({
  liveSessionIdentity: identity,
  live: { ...live, telemetry: [] },
});
const mismatchedLive = buildStudioLiveRuntimeTelemetryDebugInspector({
  liveSessionIdentity: identity,
  live: { ...live, liveHash: 'studio-game-workspace-live-stale' },
});
assert.equal(missingTelemetry.ok, false);
assert.ok(missingTelemetry.diagnostics.some(diagnostic => diagnostic.code === 'telemetry_readback_missing'));
assert.equal(mismatchedLive.ok, false);
assert.ok(mismatchedLive.diagnostics.some(diagnostic => diagnostic.code === 'runtime_readback_mismatch'));

const artifactBody = {
  artifactKind: 'studio_live_runtime_telemetry_debug_inspector_proof',
  artifactVersion: 'studio-live-runtime-telemetry-debug-inspector-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- live-runtime-telemetry-debug-inspector',
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
      kind: attachArtifact.artifactKind,
      path: attachArtifactPath,
      artifactHash: attachArtifact.artifactHash,
      fileHash: sha256Text(attachText),
    },
  ],
  inspector: inspector.inspector,
  negativeSmokes: [
    { name: 'missing telemetry', ok: missingTelemetry.ok, diagnostics: missingTelemetry.diagnostics },
    { name: 'mismatched live hash', ok: mismatchedLive.ok, diagnostics: mismatchedLive.diagnostics },
  ],
  validations: [
    'live_debug_session_identity_child_passed',
    'runtime_mode_backend_profile_present',
    'projection_world_hash_present',
    'telemetry_samples_present',
    'command_count_metrics_present',
    'negative_missing_telemetry_failed_closed',
    'negative_mismatched_live_hash_failed_closed',
  ],
  nonClaims: [
    'not_runtime_authority',
    'not_private_transport',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ],
};
const artifact = { ...artifactBody, artifactHash: sha256Json(artifactBody) };

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
