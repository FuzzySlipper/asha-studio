#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStudioLiveDebugSessionIdentity,
  type StudioLiveDebugSessionChildArtifactRef,
  type StudioRuntimeSessionListReadModel,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-testing');
const outDir = join(repoRoot, 'artifacts/live-debug-session-identity-proof/latest');
const artifactPath = join(outDir, 'index.json');

function sha256Text(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256Text(JSON.stringify(value));
}

function run(command: string, args: readonly string[], cwd = repoRoot): {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
} {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 180000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return { command: [command, ...args].join(' '), stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function readArtifact(path: string, root = repoRoot): {
  readonly path: string;
  readonly text: string;
  readonly artifact: Record<string, unknown>;
  readonly fileHash: string;
  readonly artifactHash: string;
} {
  const absolutePath = join(root, path);
  assert.equal(existsSync(absolutePath), true, `missing artifact: ${absolutePath}`);
  const text = readFileSync(absolutePath, 'utf8');
  const artifact = JSON.parse(text) as Record<string, unknown>;
  assert.equal(typeof artifact.artifactHash, 'string');
  return { path, text, artifact, fileHash: sha256Text(text), artifactHash: artifact.artifactHash as string };
}

const attachRun = run('pnpm', ['run', 'evidence', '--', 'selected-backend-attach']);
const browserRun = run('npm', ['run', 'browser:interactive-proof'], demoRoot);
const boundaryRun = run('pnpm', ['run', 'check:boundaries']);

const attach = readArtifact('artifacts/selected-backend-attach-proof/latest/index.json');
const browser = readArtifact('harness/out/browser-interactive-proof/latest/index.json', demoRoot);
assert.equal(attach.artifact.artifactKind, 'studio_selected_backend_attach_proof');
assert.equal(browser.artifact.artifactKind, 'asha_demo_browser_interactive_proof');

const childArtifacts: readonly StudioLiveDebugSessionChildArtifactRef[] = [
  {
    kind: attach.artifact.artifactKind as string,
    path: attach.path,
    artifactHash: attach.artifactHash,
    fileHash: attach.fileHash,
    expectedArtifactHash: attach.artifactHash,
    expectedFileHash: attach.fileHash,
  },
  {
    kind: browser.artifact.artifactKind as string,
    path: `../asha-testing/${browser.path}`,
    artifactHash: browser.artifactHash,
    fileHash: browser.fileHash,
    expectedArtifactHash: browser.artifactHash,
    expectedFileHash: browser.fileHash,
  },
];

const identity = buildStudioLiveDebugSessionIdentity({
  runtimeSessions: attach.artifact.runtimeSessions as StudioRuntimeSessionListReadModel,
  childArtifacts,
});
assert.equal(identity.ok, true);
if (!identity.ok) throw new Error(JSON.stringify(identity.diagnostics));

const staleChild = buildStudioLiveDebugSessionIdentity({
  runtimeSessions: attach.artifact.runtimeSessions as StudioRuntimeSessionListReadModel,
  childArtifacts: [{
    ...childArtifacts[0]!,
    expectedArtifactHash: 'sha256:stale',
  }],
});
assert.equal(staleChild.ok, false);
assert.ok(staleChild.diagnostics.some(diagnostic => diagnostic.code === 'stale_child_artifact'));

const fixtureOnlySessions: StudioRuntimeSessionListReadModel = {
  ...(attach.artifact.runtimeSessions as StudioRuntimeSessionListReadModel),
  activeSessionId: 'runtime-fixture:asha-demo',
};
const fixtureOnly = buildStudioLiveDebugSessionIdentity({
  runtimeSessions: fixtureOnlySessions,
  childArtifacts,
});
assert.equal(fixtureOnly.ok, false);
assert.ok(fixtureOnly.diagnostics.some(diagnostic => diagnostic.code === 'missing_live_session'));
assert.ok(fixtureOnly.diagnostics.some(diagnostic => diagnostic.code === 'stale_fixture_readback'));

const artifactBody = {
  artifactKind: 'studio_live_debug_session_identity_proof',
  artifactVersion: 'studio-live-debug-session-identity-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- live-debug-session-identity',
  commandOutputs: [
    { command: attachRun.command, stdout: attachRun.stdout, stderr: attachRun.stderr },
    { command: browserRun.command, stdout: browserRun.stdout, stderr: browserRun.stderr },
    { command: boundaryRun.command, stdout: boundaryRun.stdout, stderr: boundaryRun.stderr },
  ],
  identity: identity.identity,
  sourceArtifacts: childArtifacts,
  negativeSmokes: [
    { name: 'stale child artifact', ok: staleChild.ok, diagnostics: staleChild.diagnostics },
    { name: 'fixture-only readback', ok: fixtureOnly.ok, diagnostics: fixtureOnly.diagnostics },
  ],
  validations: [
    'selected_backend_attach_child_passed',
    'browser_interactive_child_passed',
    'live_session_identity_projected',
    'live_freshness_read_after_attach',
    'child_artifact_hashes_recorded',
    'negative_stale_child_failed_closed',
    'negative_fixture_readback_failed_closed',
    'boundary_guard_passed',
  ],
  nonClaims: [
    'not_studio_runtime_authority',
    'not_private_transport',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ],
};
const artifact = { ...artifactBody, artifactHash: sha256Json(artifactBody) };

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
