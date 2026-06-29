#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/v2-runtime-proof/latest');
const artifactPath = join(outDir, 'index.json');
const sourcePaths = {
  attach: 'artifacts/selected-backend-attach-proof/latest/index.json',
  command: 'artifacts/selected-backend-command-proof/latest/index.json',
  browser: 'artifacts/selected-backend-browser-smoke/latest/index.json',
} as const;

function sha256Buffer(buffer: Buffer): string {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function sha256(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(value)));
}

function run(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 45000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

function readArtifact(path: string): any {
  const absolute = join(repoRoot, path);
  assert.equal(existsSync(absolute), true, `missing source artifact: ${path}`);
  const artifact = JSON.parse(readFileSync(absolute, 'utf8'));
  const { artifactHash, ...withoutHash } = artifact;
  assert.equal(artifactHash, sha256(withoutHash), `stale source artifact hash: ${path}`);
  return artifact;
}

run('pnpm', ['run', 'proof:selected-backend-attach']);
run('pnpm', ['run', 'proof:selected-backend-browser-smoke']);

const attach = readArtifact(sourcePaths.attach);
const command = readArtifact(sourcePaths.command);
const browser = readArtifact(sourcePaths.browser);

assert.equal(attach.artifactKind, 'studio_selected_backend_attach_proof');
assert.equal(command.artifactKind, 'studio_selected_backend_command_proof');
assert.equal(browser.artifactKind, 'studio_live_backend_browser_smoke');
assert.equal(command.backend.backendMode, 'native');
assert.equal(command.workspace.backendMode, 'native');
assert.equal(command.attach.runtimeBackendEvidence.backendMode, 'native');
assert.deepEqual(command.attach.runtimeBackendEvidence.backendProofRefs, ['proof:dev-authority-smoke']);
assert.equal(browser.sourceArtifact.hash, command.artifactHash, 'browser smoke must consume the current command proof');
assert.equal(browser.readout.sourceArtifactHash, command.artifactHash, 'browser readout must consume the current command proof');
assert.equal(browser.readout.runtimeSession.backendCompatibilityState, 'compatible');

const accepted = command.commandProposals.find((proposal: any) => proposal.status === 'accepted');
const rejected = command.commandProposals.find((proposal: any) => proposal.status === 'rejected');
assert.ok(accepted, 'accepted command proposal required');
assert.ok(rejected, 'rejected command proposal required');
assert.notEqual(accepted.authorityHashBefore, accepted.authorityHashAfter);
assert.equal(rejected.authorityHashBefore, rejected.authorityHashAfter);
assert.ok(command.evidenceRefs.length > 0, 'command evidence refs required');
assert.ok(browser.readout.evidenceRefs.length > 0, 'browser evidence refs required');

const diagnostics = [
  ...attach.runtimeSessions.diagnostics,
  ...command.runtimeSessions.diagnostics,
  ...browser.readout.commandResults.flatMap((proposal: any) => proposal.diagnostics ?? []),
];

const aggregate = {
  artifactKind: 'studio_v2_live_backend_evidence',
  artifactVersion: 'studio-v2-live-backend-evidence.v0',
  command: 'pnpm run proof:v2-live-backend-evidence',
  generatedAt: 'deterministic-as-structure-only',
  workspace: {
    gameId: command.workspace.gameId,
    manifestPath: command.workspace.manifestPath,
    workspaceHash: command.workspace.workspaceHash,
    backendMode: command.workspace.backendMode,
    backendProfile: command.workspace.backendProfile,
    backendProofRefs: command.workspace.backendProofRefs,
    devtoolsProtocolVersion: command.workspace.devtoolsProtocolVersion,
    runtimeBridgeVersion: command.workspace.runtimeBridgeVersion,
  },
  runtimeSession: {
    backendMode: command.runtimeSessions.sessions[0].backendMode,
    backendCompatibilityState: command.runtimeSessions.sessions[0].backendCompatibilityState,
    attachStatus: command.runtimeSessions.sessions[0].attachStatus,
    sessionHash: command.runtimeSessions.sessions[0].sessionHash,
    evidenceRefs: command.runtimeSessions.sessions[0].evidenceRefs,
  },
  attachHandshake: {
    request: command.attach.handshakeRequest,
    compatibility: command.attach.compatibility,
    runtime: command.attach.runtime,
    runtimeBackendEvidence: command.attach.runtimeBackendEvidence,
    attachHash: command.attach.attachHash,
  },
  commandEvidence: {
    proposals: command.commandProposals,
    beforeLiveHash: command.beforeLive.liveHash,
    afterAcceptedLiveHash: command.afterAcceptedLive.liveHash,
    afterRejectedLiveHash: command.afterRejectedLive.liveHash,
    runtimeEvidenceSummary: command.runtimeEvidenceSummary,
    replayRef: command.replayRef,
    evidenceRefs: command.evidenceRefs,
  },
  browserEvidence: {
    readout: browser.readout,
    domPath: browser.browser.domPath,
    domHash: browser.browser.domHash,
    screenshotPath: browser.browser.screenshotPath,
    screenshotHash: browser.browser.screenshotHash,
  },
  sourceArtifacts: [
    {
      kind: attach.artifactKind,
      path: sourcePaths.attach,
      hash: attach.artifactHash,
    },
    {
      kind: command.artifactKind,
      path: sourcePaths.command,
      hash: command.artifactHash,
    },
    {
      kind: browser.artifactKind,
      path: sourcePaths.browser,
      hash: browser.artifactHash,
    },
  ],
  diagnostics,
  validations: [
    'source_artifact_hashes_verified',
    'workspace_manifest_summary_present',
    'runtime_session_backend_mode_present',
    'attach_handshake_present',
    'accepted_and_rejected_command_evidence_present',
    'browser_smoke_consumes_current_command_proof',
    'missing_or_stale_runtime_evidence_fails_closed',
  ],
  nonClaims: [
    'studio_not_authoritative',
    'not_private_runtime_mutation',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
    'not_publish_artifact',
  ],
};
const artifactWithHash = {
  ...aggregate,
  artifactHash: sha256(aggregate),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifactWithHash, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
