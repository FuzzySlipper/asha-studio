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
import {
  attachStudioGameWorkspaceDevtools,
  buildStudioRuntimeSessionList,
  exportStudioGameWorkspaceAttachEvidence,
  loadStudioGameWorkspaceManifest,
  refreshStudioGameWorkspaceLiveReadModel,
  type StudioDevtoolsAttachTransport,
} from '@asha-studio/domain';
import type { DevtoolsAttachServerMessage } from '@asha/devtools';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-testing');
const outDir = join(repoRoot, 'artifacts/selected-backend-attach-proof/latest');
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
    throw new Error('Studio selected-backend attach proof does not support oversized devtools frames.');
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
    'Sec-WebSocket-Key: YXNoYS1zdHVkaW8tZGV2dG9vbHM=',
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
      reject(new Error(`asha-testing dev runtime did not start\nstdout:\n${logs.stdout}\nstderr:\n${logs.stderr}`));
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
      reject(new Error(`asha-testing dev runtime exited before listening: code=${code} signal=${signal}`));
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
if (!workspaceResult.ok) throw new Error('asha-testing workspace failed to load');

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
  assert.match(listening.endpoint, /^ws:\/\/127\.0\.0\.1:\d+$/);
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
  const live = await refreshStudioGameWorkspaceLiveReadModel(proofWorkspace, attached.attach, transport);
  assert.equal(live.ok, true);
  if (!live.ok) throw new Error(live.diagnostics.map(diagnostic => diagnostic.message).join('\n'));

  const sessions = buildStudioRuntimeSessionList({
    workspace: proofWorkspace,
    attach: attached.attach,
    live: live.live,
  });
  const activeSession = sessions.sessions.find(session => session.sessionId === sessions.activeSessionId);
  assert.ok(activeSession);
  assert.equal(activeSession.status, 'attached');
  assert.equal(activeSession.runtimeMode, 'native');
  assert.equal(activeSession.backendMode, 'native');
  assert.equal(activeSession.backendCompatibilityState, 'compatible');
  assert.deepEqual(activeSession.backendProofRefs, ['proof:dev-authority-smoke']);
  assert.equal(attached.attach.runtimeBackendEvidence.backendMode, 'native');
  assert.deepEqual(attached.attach.runtimeBackendEvidence.backendProofRefs, ['proof:dev-authority-smoke']);
  assert.equal(attached.attach.runtimeBackendEvidence.nativeProofRef, 'proof:dev-authority-smoke');
  assert.equal(attached.attach.runtimeBackendEvidence.launcherName, 'native-game-runtime-launcher');
  assert.equal(attached.attach.runtimeBackendEvidence.source, 'devtools.handshake.runtime');

  const attachEvidence = exportStudioGameWorkspaceAttachEvidence({
    workspace: proofWorkspace,
    attach: attached.attach,
    live: live.live,
    diagnostics: sessions.diagnostics,
  });
  const artifact = {
    artifactKind: 'studio_selected_backend_attach_proof',
    artifactVersion: 'studio-selected-backend-attach-proof.v0',
    generatedAt: 'deterministic-as-structure-only',
    command: 'pnpm run proof:selected-backend-attach',
    demoRuntime: {
      cwd: relative(repoRoot, demoRoot),
      endpoint: listening.endpoint,
      runtimeMode: listening.runtimeMode,
      launcherName: listening.launcherName,
    },
    backendEvidenceSource: attached.attach.runtimeBackendEvidence.source,
    backend: attached.attach.runtimeBackendEvidence,
    workspace: {
      gameId: workspaceResult.workspace.gameId,
      attachEndpoint: proofWorkspace.attachEndpoint,
      backendMode: workspaceResult.workspace.manifest.runtime.backendMode,
      backendProfile: workspaceResult.workspace.manifest.runtime.backendProfile,
      backendProofRefs: workspaceResult.workspace.manifest.runtime.backendProofRefs,
      workspaceHash: workspaceResult.workspace.workspaceHash,
    },
    attach: attached.attach,
    live: live.live,
    runtimeSessions: sessions,
    attachEvidence,
    validations: [
      'demo_runtime_started_on_ephemeral_endpoint',
      'typed_studio_devtools_attach_succeeded',
      'projection_render_diff_and_telemetry_readouts_present',
      'backend_mode_from_devtools_runtime_handshake',
      'backend_proof_refs_from_devtools_runtime_handshake',
      'reference_mode_fallback_rejected_for_selected_backend',
    ],
    nonClaims: [
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
      'not_publish_artifact',
      'not_wasm_authority',
    ],
  };
  const artifactWithHash = {
    ...artifact,
    artifactHash: sha256(artifact),
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifactWithHash, null, 2)}\n`);
  console.log(`wrote ${relative(repoRoot, artifactPath)}`);
} finally {
  await stopRuntime(runtime);
}
