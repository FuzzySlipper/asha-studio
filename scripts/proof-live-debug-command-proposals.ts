#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  buildStudioCommandProposalPanel,
  buildInitialWorkspaceReadModel,
  buildStudioLiveDebugSessionIdentity,
  buildStudioLiveDebugCommandProposalSurface,
  buildStudioLiveRuntimeTelemetryDebugInspector,
  buildStudioLiveSceneEntityDebugInspector,
  loadStudioGameWorkspaceManifest,
  type StudioGameWorkspaceCommandProposalReadModel,
  type StudioGameWorkspaceLiveReadModel,
  type StudioLiveDebugSessionIdentityReadModel,
  type StudioLiveRuntimeTelemetryDebugInspectorReadModel,
  type StudioLiveSceneEntityDebugInspectorReadModel,
  type StudioRuntimeSessionListReadModel,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-demo');
const outDir = join(repoRoot, 'artifacts/live-debug-command-proposals-proof/latest');
const artifactPath = join(outDir, 'index.json');

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function run(command: string, args: readonly string[]) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return {
    command: `${command} ${args.join(' ')}`,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function loadDemoPackageScripts(): Record<string, string> {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).scripts;
}

const identityRun = run('pnpm', ['run', 'proof:live-debug-session-identity']);
const sceneRun = run('pnpm', ['run', 'proof:live-scene-entity-debug-inspector']);
const runtimeRun = run('pnpm', ['run', 'proof:live-runtime-telemetry-debug-inspector']);
const commandRun = run('pnpm', ['run', 'proof:selected-backend-command']);
const boundaryRun = run('pnpm', ['run', 'check:boundaries']);

const workspaceResult = loadStudioGameWorkspaceManifest({
  workspaceRoot: demoRoot,
  manifestPath: 'asha.game.toml',
  gameId: 'asha-demo',
  manifestText: readFileSync(join(demoRoot, 'asha.game.toml'), 'utf8'),
  packageScripts: loadDemoPackageScripts(),
  pathExists: path => existsSync(join(demoRoot, path)),
});
assert.equal(workspaceResult.ok, true);
if (!workspaceResult.ok) throw new Error('asha-demo workspace failed to load');

const identityArtifactPath = join(repoRoot, 'artifacts/live-debug-session-identity-proof/latest/index.json');
const sceneArtifactPath = join(repoRoot, 'artifacts/live-scene-entity-debug-inspector-proof/latest/index.json');
const runtimeArtifactPath = join(repoRoot, 'artifacts/live-runtime-telemetry-debug-inspector-proof/latest/index.json');
const commandArtifactPath = join(repoRoot, 'artifacts/selected-backend-command-proof/latest/index.json');

const identityArtifact = readJson(identityArtifactPath) as { artifactHash: string; identity: StudioLiveDebugSessionIdentityReadModel };
const sceneArtifact = readJson(sceneArtifactPath) as {
  artifactHash: string;
  inspector: StudioLiveSceneEntityDebugInspectorReadModel;
};
const runtimeArtifact = readJson(runtimeArtifactPath) as {
  artifactHash: string;
  inspector: StudioLiveRuntimeTelemetryDebugInspectorReadModel;
};
const commandArtifact = readJson(commandArtifactPath) as {
  artifactHash: string;
  commandProposals: readonly StudioGameWorkspaceCommandProposalReadModel[];
  runtimeSessions: StudioRuntimeSessionListReadModel;
  afterRejectedLive: StudioGameWorkspaceLiveReadModel;
  evidenceRefs: readonly { kind: string; path: string; sha256?: string | null }[];
  replayRef: { path?: string; sha256?: string | null };
};

const commandIdentity = buildStudioLiveDebugSessionIdentity({
  runtimeSessions: commandArtifact.runtimeSessions,
  childArtifacts: [
    {
      kind: 'studio-live-debug-session-identity-proof',
      path: relative(repoRoot, identityArtifactPath),
      artifactHash: identityArtifact.artifactHash,
      fileHash: sha256(identityArtifact),
    },
    {
      kind: 'studio-selected-backend-command-proof',
      path: relative(repoRoot, commandArtifactPath),
      artifactHash: commandArtifact.artifactHash,
      fileHash: sha256(commandArtifact),
    },
  ],
});
assert.equal(commandIdentity.ok, true, commandIdentity.diagnostics.map(diagnostic => diagnostic.message).join('\n'));
const commandSceneInspector = buildStudioLiveSceneEntityDebugInspector({
  workspace: buildInitialWorkspaceReadModel(),
  liveSessionIdentity: commandIdentity.identity,
});
assert.equal(commandSceneInspector.ok, true, commandSceneInspector.diagnostics.map(diagnostic => diagnostic.message).join('\n'));
const commandRuntimeInspector = buildStudioLiveRuntimeTelemetryDebugInspector({
  liveSessionIdentity: commandIdentity.identity,
  live: commandArtifact.afterRejectedLive,
});
assert.equal(commandRuntimeInspector.ok, true, commandRuntimeInspector.diagnostics.map(diagnostic => diagnostic.message).join('\n'));

const panel = buildStudioCommandProposalPanel({
  workspace: workspaceResult.workspace,
  runtimeSessions: commandArtifact.runtimeSessions,
  commandProposals: commandArtifact.commandProposals,
});
const surface = buildStudioLiveDebugCommandProposalSurface({
  liveSessionIdentity: commandIdentity.identity,
  sceneEntityInspector: commandSceneInspector.inspector,
  runtimeTelemetryInspector: commandRuntimeInspector.inspector,
  commandProposalPanel: panel,
  evidenceRefs: [
    {
      kind: 'studio-selected-backend-command-proof',
      path: relative(repoRoot, commandArtifactPath),
      sha256: commandArtifact.artifactHash,
    },
    ...commandArtifact.evidenceRefs.map(ref => ({
      kind: ref.kind,
      path: ref.path,
      sha256: ref.sha256 ?? null,
    })),
    {
      kind: 'devtools-replay',
      path: commandArtifact.replayRef.path ?? 'missing',
      sha256: commandArtifact.replayRef.sha256 ?? null,
    },
  ],
});
assert.equal(surface.ok, true, surface.diagnostics.map(diagnostic => diagnostic.message).join('\n'));

const unsupported = buildStudioLiveDebugCommandProposalSurface({
  liveSessionIdentity: commandIdentity.identity,
  sceneEntityInspector: commandSceneInspector.inspector,
  runtimeTelemetryInspector: commandRuntimeInspector.inspector,
  commandProposalPanel: {
    ...panel,
    actions: [
      {
        ...panel.actions[0],
        actionId: 'set_voxel_reference',
        commandOperation: 'debug.rawJson',
      },
    ],
  },
});
assert.equal(unsupported.ok, false);
assert.equal(unsupported.diagnostics.at(0)?.code, 'unsupported_debug_command');

const missingResult = buildStudioLiveDebugCommandProposalSurface({
  liveSessionIdentity: commandIdentity.identity,
  sceneEntityInspector: commandSceneInspector.inspector,
  runtimeTelemetryInspector: commandRuntimeInspector.inspector,
  commandProposalPanel: {
    ...panel,
    proposals: panel.proposals.filter(proposal => proposal.status === 'accepted'),
  },
});
assert.equal(missingResult.ok, false);
assert.equal(missingResult.diagnostics.at(0)?.code, 'missing_command_result_evidence');

const staleScope = buildStudioLiveDebugCommandProposalSurface({
  liveSessionIdentity: {
    ...commandIdentity.identity,
    attachHash: 'stale-live-debug-command-attach',
  },
  sceneEntityInspector: commandSceneInspector.inspector,
  runtimeTelemetryInspector: commandRuntimeInspector.inspector,
  commandProposalPanel: panel,
});
assert.equal(staleScope.ok, false);
assert.equal(staleScope.diagnostics.at(0)?.code, 'debug_command_scope_mismatch');

const artifact = {
  artifactKind: 'studio_live_debug_command_proposals',
  artifactVersion: 'studio-live-debug-command-proposals-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:live-debug-command-proposals',
  generatedFrom: {
    liveDebugSessionIdentityArtifactHash: identityArtifact.artifactHash,
    sceneEntityInspectorArtifactHash: sceneArtifact.artifactHash,
    runtimeTelemetryInspectorArtifactHash: runtimeArtifact.artifactHash,
    selectedBackendCommandArtifactHash: commandArtifact.artifactHash,
  },
  commandRuns: [
    identityRun.command,
    sceneRun.command,
    runtimeRun.command,
    commandRun.command,
    boundaryRun.command,
  ],
  liveSessionIdentity: commandIdentity.identity,
  prerequisiteInspectors: {
    sceneEntityInspector: sceneArtifact.inspector.inspectorHash,
    runtimeTelemetryInspector: runtimeArtifact.inspector.inspectorHash,
  },
  surface: surface.surface,
  commandProposalPanel: panel,
  negativeSmokes: [
    {
      case: 'unsupported_debug_command',
      ok: unsupported.ok,
      diagnostics: unsupported.diagnostics,
    },
    {
      case: 'missing_command_result_evidence',
      ok: missingResult.ok,
      diagnostics: missingResult.diagnostics,
    },
    {
      case: 'stale_command_scope',
      ok: staleScope.ok,
      diagnostics: staleScope.diagnostics,
    },
  ],
  validations: [
    'debug_actions_are_bounded_to_known_command_ids',
    'command_proposals_reuse_shared_command_panel_readout',
    'accepted_and_rejected_runtime_results_are_present',
    'proposal_scope_matches_live_session_identity',
    'no_freeform_json_command_hatch',
  ],
  nonClaims: [
    'studio_not_runtime_authority',
    'not_private_runtime_mutation',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ],
};
const artifactWithHash = { ...artifact, artifactHash: sha256(artifact) };
await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifactWithHash, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
