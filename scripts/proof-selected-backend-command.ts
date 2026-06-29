#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { buildDevtoolsProtocolGoldenFixtures, type DevtoolsAttachServerMessage } from '@asha/devtools';
import {
  attachStudioGameWorkspaceDevtools,
  buildStudioRuntimeSessionList,
  loadStudioGameWorkspaceManifest,
  proposeStudioGameWorkspaceCommand,
  refreshStudioGameWorkspaceLiveReadModel,
  type StudioDevtoolsAttachTransport,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-demo');
const outDir = join(repoRoot, 'artifacts/selected-backend-command-proof/latest');
const artifactPath = join(outDir, 'index.json');

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function encodeClientText(text: string): Buffer {
  const payload = Buffer.from(text);
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const masked = Buffer.from(payload);
  for (let index = 0; index < masked.length; index += 1) {
    masked[index] ^= mask[index % 4];
  }
  if (payload.length < 126) {
    return Buffer.concat([Buffer.from([0x81, 0x80 | payload.length]), mask, masked]);
  }
  const header = Buffer.alloc(4);
  header[0] = 0x81;
  header[1] = 0x80 | 126;
  header.writeUInt16BE(payload.length, 2);
  return Buffer.concat([header, mask, masked]);
}

function decodeServerText(buffer: Buffer): string {
  const first = buffer[0];
  const second = buffer[1];
  if (first === undefined || second === undefined || (first & 0x0f) !== 0x1) {
    throw new Error('Expected a text websocket frame from devtools endpoint.');
  }
  let length = second & 0x7f;
  let offset = 2;
  if (length === 126) {
    length = buffer.readUInt16BE(offset);
    offset += 2;
  }
  if (length === 127) {
    throw new Error('Studio selected-backend command proof does not support oversized devtools frames.');
  }
  return buffer.subarray(offset, offset + length).toString('utf8');
}

async function exchangeJsonWebSocket(endpoint: string, message: unknown): Promise<unknown> {
  const url = new URL(endpoint);
  const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
  await once(socket, 'connect');
  socket.write([
    `GET ${url.pathname || '/'} HTTP/1.1`,
    `Host: ${url.host}`,
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Key: YXNoYS1zdHVkaW8tY29tbWFuZA==',
    'Sec-WebSocket-Version: 13',
    '',
    '',
  ].join('\r\n'));
  let buffered = Buffer.alloc(0);
  socket.on('data', (chunk: Buffer) => {
    buffered = Buffer.concat([buffered, chunk]);
  });
  while (!buffered.includes('\r\n\r\n')) {
    await once(socket, 'data');
  }
  const headerEnd = buffered.indexOf('\r\n\r\n');
  const header = buffered.subarray(0, headerEnd).toString('utf8');
  if (!header.includes('101 Switching Protocols')) {
    socket.destroy();
    throw new Error(`Devtools websocket upgrade failed: ${header}`);
  }
  buffered = buffered.subarray(headerEnd + 4);
  socket.write(encodeClientText(JSON.stringify(message)));
  while (buffered.length === 0) {
    await once(socket, 'data');
  }
  const response = JSON.parse(decodeServerText(buffered));
  socket.destroy();
  return response;
}

function loadDemoPackageScripts(): Record<string, string> {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).scripts;
}

function waitForListening(runtime: ChildProcessWithoutNullStreams, logs: { stdout: string; stderr: string }) {
  return new Promise<{ endpoint: string; runtimeMode: string; launcherName: string }>((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`asha-demo dev runtime did not start\nstdout:\n${logs.stdout}\nstderr:\n${logs.stderr}`));
    }, 8000);
    runtime.stdout.on('data', () => {
      const firstLine = logs.stdout.trim().split('\n')[0];
      if (firstLine.length === 0) return;
      clearTimeout(timer);
      try {
        resolvePromise(JSON.parse(firstLine));
      } catch (error) {
        reject(error);
      }
    });
    runtime.on('exit', (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`asha-demo dev runtime exited before listening: code=${code} signal=${signal}`));
    });
  });
}

async function stopRuntime(runtime: ChildProcessWithoutNullStreams): Promise<void> {
  if (runtime.exitCode !== null || runtime.signalCode !== null) return;
  runtime.kill('SIGTERM');
  await once(runtime, 'exit');
}

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

const logs = { stdout: '', stderr: '' };
const runtime = spawn(process.execPath, ['scripts/dev-runtime.mjs', '--port', '0'], {
  cwd: demoRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
});
runtime.stdout.setEncoding('utf8');
runtime.stderr.setEncoding('utf8');
runtime.stdout.on('data', chunk => {
  logs.stdout += chunk;
});
runtime.stderr.on('data', chunk => {
  logs.stderr += chunk;
});

let listening: { endpoint: string; runtimeMode: string; launcherName: string } | null = null;
try {
  listening = await waitForListening(runtime, logs);
  assert.equal(listening.runtimeMode, 'native');
  const proofWorkspace = {
    ...workspaceResult.workspace,
    attachEndpoint: listening.endpoint,
  };
  const transport: StudioDevtoolsAttachTransport = {
    exchange: message => exchangeJsonWebSocket(listening?.endpoint ?? '', message) as Promise<DevtoolsAttachServerMessage>,
  };
  const attached = await attachStudioGameWorkspaceDevtools(proofWorkspace, transport);
  assert.equal(attached.ok, true);
  if (!attached.ok) throw new Error(attached.diagnostics.map(diagnostic => diagnostic.message).join('\n'));
  assert.equal(attached.attach.runtimeBackendEvidence.backendMode, 'native');

  const before = await refreshStudioGameWorkspaceLiveReadModel(proofWorkspace, attached.attach, transport);
  assert.equal(before.ok, true);
  if (!before.ok) throw new Error(before.diagnostics.map(diagnostic => diagnostic.message).join('\n'));

  const fixtures = buildDevtoolsProtocolGoldenFixtures();
  const accepted = await proposeStudioGameWorkspaceCommand(proofWorkspace, attached.attach, transport, {
    sequenceId: fixtures.commandProposal.sequenceId,
    batch: fixtures.commandProposal.batch,
  });
  if (!accepted.ok) throw new Error(accepted.diagnostics.map(diagnostic => diagnostic.message).join('\n'));
  assert.equal(accepted.ok, true);
  assert.equal(accepted.proposal.status, 'accepted');
  assert.equal(accepted.proposal.backendMode, 'native');
  assert.match(accepted.proposal.authorityHashBefore ?? '', /^native-authority:/);
  assert.match(accepted.proposal.authorityHashAfter ?? '', /^native-authority:/);
  assert.notEqual(accepted.proposal.authorityHashBefore, accepted.proposal.authorityHashAfter);

  const afterAccepted = await refreshStudioGameWorkspaceLiveReadModel(proofWorkspace, attached.attach, transport);
  assert.equal(afterAccepted.ok, true);
  if (!afterAccepted.ok) throw new Error(afterAccepted.diagnostics.map(diagnostic => diagnostic.message).join('\n'));
  assert.notEqual(before.live.projection.worldHash, afterAccepted.live.projection.worldHash);

  const rejectedBatch = {
    commands: [{
      op: 'setVoxel',
      grid: 1,
      coord: { x: 0, y: 0, z: 0 },
      value: { kind: 'solid', material: 999 },
    }],
  } as const;
  const rejected = await proposeStudioGameWorkspaceCommand(proofWorkspace, attached.attach, transport, {
    sequenceId: 'seq-2',
    batch: rejectedBatch,
  });
  assert.equal(rejected.ok, true);
  if (!rejected.ok) throw new Error(rejected.diagnostics.map(diagnostic => diagnostic.message).join('\n'));
  assert.equal(rejected.proposal.status, 'rejected');
  assert.equal(rejected.proposal.backendMode, 'native');
  assert.equal(rejected.proposal.authorityHashBefore, accepted.proposal.authorityHashAfter);
  assert.equal(rejected.proposal.authorityHashAfter, accepted.proposal.authorityHashAfter);

  const afterRejected = await refreshStudioGameWorkspaceLiveReadModel(proofWorkspace, attached.attach, transport);
  assert.equal(afterRejected.ok, true);
  if (!afterRejected.ok) throw new Error(afterRejected.diagnostics.map(diagnostic => diagnostic.message).join('\n'));
  assert.equal(afterRejected.live.projection.worldHash, afterAccepted.live.projection.worldHash);

  const replay = await transport.exchange({ type: 'replay.export', replayId: 'studio-selected-backend-command-proof' });
  assert.equal(replay.type, 'replay.exported');
  const evidence = await transport.exchange({ type: 'evidence.export', sequenceId: 'seq-2', includeRenderDiff: true });
  assert.equal(evidence.type, 'evidence.exported');
  const evidenceRef = evidence.artifacts[0];
  assert.ok(evidenceRef);
  const runtimeEvidence = JSON.parse(readFileSync(join(demoRoot, evidenceRef.path), 'utf8'));
  assert.equal(runtimeEvidence.runtime.runtimeMode, 'native');
  assert.deepEqual(runtimeEvidence.runtime.backendProofRefs, ['proof:dev-authority-smoke']);
  assert.equal(runtimeEvidence.commandReceipts.length, 2);
  assert.equal(runtimeEvidence.commandReceipts[0].status, 'accepted');
  assert.equal(runtimeEvidence.commandReceipts[1].status, 'rejected');
  assert.equal(runtimeEvidence.projectionDiffSummary.acceptedCommandChangedAuthority, true);
  assert.equal(runtimeEvidence.projectionDiffSummary.rejectedCommandPreservedAuthority, true);

  const runtimeSessions = buildStudioRuntimeSessionList({
    workspace: proofWorkspace,
    attach: attached.attach,
    live: afterRejected.live,
  });
  const artifact = {
    artifactKind: 'studio_selected_backend_command_proof',
    artifactVersion: 'studio-selected-backend-command-proof.v0',
    generatedAt: 'deterministic-as-structure-only',
    command: 'pnpm run proof:selected-backend-command',
    backend: attached.attach.runtimeBackendEvidence,
    workspace: {
      gameId: proofWorkspace.gameId,
      manifestPath: proofWorkspace.manifestPath,
      workspaceHash: proofWorkspace.workspaceHash,
      backendMode: proofWorkspace.manifest.runtime.backendMode,
      backendProfile: proofWorkspace.manifest.runtime.backendProfile,
      backendProofRefs: proofWorkspace.manifest.runtime.backendProofRefs,
      devtoolsProtocolVersion: proofWorkspace.manifest.asha.devtoolsProtocolVersion,
      runtimeBridgeVersion: proofWorkspace.manifest.asha.runtimeBridgeVersion,
    },
    attach: attached.attach,
    beforeLive: before.live,
    afterAcceptedLive: afterAccepted.live,
    afterRejectedLive: afterRejected.live,
    commandProposals: [accepted.proposal, rejected.proposal],
    runtimeSessions,
    replayRef: replay.artifact,
    evidenceRefs: evidence.artifacts,
    runtimeEvidenceSummary: {
      path: evidenceRef.path,
      runtimeMode: runtimeEvidence.runtime.runtimeMode,
      backendMode: runtimeEvidence.runtime.backendMode,
      backendProofRefs: runtimeEvidence.runtime.backendProofRefs,
      acceptedBefore: runtimeEvidence.commandReceipts[0].authorityHashBefore,
      acceptedAfter: runtimeEvidence.commandReceipts[0].authorityHashAfter,
      rejectedBefore: runtimeEvidence.commandReceipts[1].authorityHashBefore,
      rejectedAfter: runtimeEvidence.commandReceipts[1].authorityHashAfter,
    },
    validations: [
      'gui_and_agent_share_typed_command_proposal_readout',
      'accepted_command_changed_backend_authority_hash',
      'accepted_command_changed_projection_hash',
      'rejected_command_preserved_backend_authority_hash',
      'rejected_command_preserved_projection_hash',
      'runtime_replay_and_evidence_refs_exported',
    ],
    nonClaims: [
      'studio_not_authoritative',
      'not_private_runtime_mutation',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
    ],
  };
  const artifactWithHash = { ...artifact, artifactHash: sha256(artifact) };
  await mkdir(outDir, { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifactWithHash, null, 2)}\n`);
  console.log(`wrote ${relative(repoRoot, artifactPath)}`);
} finally {
  await stopRuntime(runtime);
}
