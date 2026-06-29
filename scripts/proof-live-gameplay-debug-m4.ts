#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/live-gameplay-debug-m4/latest');
const artifactPath = join(outDir, 'index.json');
const sourcePaths = {
  identity: 'artifacts/live-debug-session-identity-proof/latest/index.json',
  sceneEntity: 'artifacts/live-scene-entity-debug-inspector-proof/latest/index.json',
  assetResource: 'artifacts/live-asset-resource-debug-inspector-proof/latest/index.json',
  runtimeTelemetry: 'artifacts/live-runtime-telemetry-debug-inspector-proof/latest/index.json',
  commandProposals: 'artifacts/live-debug-command-proposals-proof/latest/index.json',
} as const;

function sha256Buffer(buffer: Buffer): string {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function sha256(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(value)));
}

function run(command: string, args: readonly string[]): string {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 300000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return `${command} ${args.join(' ')}`;
}

function verifyArtifactHash(artifact: any): boolean {
  const { artifactHash, ...withoutHash } = artifact;
  return artifactHash === sha256(withoutHash);
}

function readArtifact(path: string): any {
  const absolute = join(repoRoot, path);
  assert.equal(existsSync(absolute), true, `missing source artifact: ${path}`);
  const artifact = JSON.parse(readFileSync(absolute, 'utf8'));
  assert.equal(verifyArtifactHash(artifact), true, `stale source artifact hash: ${path}`);
  return artifact;
}

const commandRuns = [
  run('pnpm', ['run', 'proof:live-debug-session-identity']),
  run('pnpm', ['run', 'proof:live-scene-entity-debug-inspector']),
  run('pnpm', ['run', 'proof:live-asset-resource-debug-inspector']),
  run('pnpm', ['run', 'proof:live-runtime-telemetry-debug-inspector']),
  run('pnpm', ['run', 'proof:live-debug-command-proposals']),
  run('pnpm', ['run', 'check:boundaries']),
];

const identity = readArtifact(sourcePaths.identity);
const sceneEntity = readArtifact(sourcePaths.sceneEntity);
const assetResource = readArtifact(sourcePaths.assetResource);
const runtimeTelemetry = readArtifact(sourcePaths.runtimeTelemetry);
const commandProposals = readArtifact(sourcePaths.commandProposals);

assert.equal(identity.artifactKind, 'studio_live_debug_session_identity_proof');
assert.equal(sceneEntity.artifactKind, 'studio_live_scene_entity_debug_inspector_proof');
assert.equal(assetResource.artifactKind, 'studio_live_asset_resource_debug_inspector_proof');
assert.equal(runtimeTelemetry.artifactKind, 'studio_live_runtime_telemetry_debug_inspector_proof');
assert.equal(commandProposals.artifactKind, 'studio_live_debug_command_proposals');
assert.equal(identity.identity.attachStatus, 'attached');
assert.equal(identity.identity.liveFreshness.readAfterAttach, true);
assert.equal(sceneEntity.inspector.entity.entityId !== null, true);
assert.equal(assetResource.inspector.asset.assetId !== null, true);
assert.equal(runtimeTelemetry.inspector.telemetry.sampleCount > 0, true);
assert.deepEqual(commandProposals.surface.proposalStatuses, ['accepted', 'rejected']);
assert.equal(commandProposals.commandProposalPanel.panelVersion, 'studio-command-proposal-panel.v0');
assert.equal(commandProposals.surface.actions.at(0)?.actionId, 'set_voxel_reference');
assert.equal(commandProposals.surface.actions.at(0)?.commandMessageType, 'command.propose');
assert.equal(commandProposals.surface.actions.at(0)?.commandOperation, 'setVoxel');
assert.equal(commandProposals.surface.acceptedProposalHash !== null, true);
assert.equal(commandProposals.surface.rejectedProposalHash !== null, true);

const staleClone = {
  ...commandProposals,
  surface: {
    ...commandProposals.surface,
    proposalStatuses: ['accepted'],
  },
};
assert.equal(verifyArtifactHash(staleClone), false, 'negative stale aggregate source should fail hash validation');

const sourceArtifacts = [
  {
    kind: identity.artifactKind,
    path: sourcePaths.identity,
    hash: identity.artifactHash,
    readModelHash: identity.identity.identityHash,
  },
  {
    kind: sceneEntity.artifactKind,
    path: sourcePaths.sceneEntity,
    hash: sceneEntity.artifactHash,
    readModelHash: sceneEntity.inspector.inspectorHash,
  },
  {
    kind: assetResource.artifactKind,
    path: sourcePaths.assetResource,
    hash: assetResource.artifactHash,
    readModelHash: assetResource.inspector.inspectorHash,
  },
  {
    kind: runtimeTelemetry.artifactKind,
    path: sourcePaths.runtimeTelemetry,
    hash: runtimeTelemetry.artifactHash,
    readModelHash: runtimeTelemetry.inspector.inspectorHash,
  },
  {
    kind: commandProposals.artifactKind,
    path: sourcePaths.commandProposals,
    hash: commandProposals.artifactHash,
    readModelHash: commandProposals.surface.surfaceHash,
  },
];

const aggregate = {
  artifactKind: 'studio_live_gameplay_debug_m4',
  artifactVersion: 'studio-live-gameplay-debug-m4.v0',
  command: 'pnpm run proof:live-gameplay-debug-m4',
  generatedAt: 'deterministic-as-structure-only',
  commandRuns,
  liveSession: {
    sessionId: commandProposals.liveSessionIdentity.sessionId,
    attachStatus: commandProposals.liveSessionIdentity.attachStatus,
    runtimeMode: commandProposals.liveSessionIdentity.runtimeMode,
    backendMode: commandProposals.liveSessionIdentity.backendMode,
    backendProfile: commandProposals.liveSessionIdentity.backendProfile,
    attachHash: commandProposals.liveSessionIdentity.attachHash,
    liveHash: commandProposals.liveSessionIdentity.liveHash,
    liveFreshness: commandProposals.liveSessionIdentity.liveFreshness,
  },
  debugSurfaces: {
    identityHash: identity.identity.identityHash,
    sceneEntityInspectorHash: sceneEntity.inspector.inspectorHash,
    assetResourceInspectorHash: assetResource.inspector.inspectorHash,
    runtimeTelemetryInspectorHash: runtimeTelemetry.inspector.inspectorHash,
    commandProposalSurfaceHash: commandProposals.surface.surfaceHash,
    commandProposalPanelHash: commandProposals.commandProposalPanel.panelHash,
  },
  readouts: {
    selectedEntityId: sceneEntity.inspector.entity.entityId,
    selectedAssetId: assetResource.inspector.selectedAssetId,
    telemetrySampleCount: runtimeTelemetry.inspector.telemetry.sampleCount,
    commandActionIds: commandProposals.surface.actions.map((action: any) => action.actionId),
    commandProposalStatuses: commandProposals.surface.proposalStatuses,
  },
  sourceArtifacts,
  negativeSmokes: [
    {
      case: 'stale_source_artifact_hash',
      ok: verifyArtifactHash(staleClone),
      expected: false,
    },
    ...commandProposals.negativeSmokes,
  ],
  validations: [
    'source_artifact_hashes_verified',
    'live_session_identity_present',
    'scene_entity_debug_inspector_present',
    'asset_resource_debug_inspector_present',
    'runtime_telemetry_debug_inspector_present',
    'bounded_command_proposals_present',
    'live_command_surface_reuses_shared_panel',
    'missing_or_stale_child_artifact_fails_closed',
  ],
  diagnostics: [
    ...identity.identity.diagnostics,
    ...sceneEntity.inspector.diagnostics,
    ...assetResource.inspector.diagnostics,
    ...runtimeTelemetry.inspector.diagnostics,
    ...commandProposals.surface.diagnostics,
  ],
  nonClaims: [
    'studio_not_runtime_authority',
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
