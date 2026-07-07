#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createNativeRuntimeBridge, type RuntimeBridge } from '@asha/runtime-bridge';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const engineRoot = resolve(repoRoot, '../asha-engine');
const nativeCrateRoot = join(engineRoot, 'engine-rs', 'crates', 'bridge', 'native-bridge');
const nativeAddonDest = join(engineRoot, 'ts/packages/native-bridge/dist/native-bridge.node');
const staticRoot = join(repoRoot, 'dist/apps/studio-app/browser');
const outDir = join(repoRoot, 'artifacts/native-voxel-runtime-launch/latest');
const artifactPath = join(outDir, 'index.json');
const bindHost = '0.0.0.0';
const browserHost = '127.0.0.1';
const rpcPath = '/__asha_native_bridge_rpc';
const chromium = '/usr/bin/chromium';

const rpcMethods = [
  'initializeEngine',
  'loadWorldBundle',
  'saveCurrentWorld',
  'unloadWorld',
  'step',
  'readRenderDiffs',
  'getCompositionStatus',
  'submitCommands',
  'pickVoxel',
  'readVoxelMeshEvidence',
  'createCamera',
  'readCameraProjection',
  'screenPointToPickRay',
  'applyFirstPersonCameraInput',
  'applyCollisionConstrainedCameraInput',
  'readModelMaterialPreview',
  'readSceneObjectSnapshot',
  'applySceneObjectCommand',
  'loadFpsRuntimeSession',
  'readFpsRuntimeSession',
  'applyFpsPrimaryFire',
  'restartFpsRuntimeSession',
  'readFpsEncounterDirector',
  'applyFpsEncounterTransition',
  'applyEnemyDirectNavMovement',
  'planVoxelConversion',
  'previewVoxelConversion',
  'applyVoxelConversion',
  'exportVoxelConversionEvidence',
] as const;
const allowedRpcMethods = new Set<string>(rpcMethods);

interface BrowserProof {
  readonly mode: 'native' | 'missing' | 'invalid';
  readonly status: 'complete' | 'failed_closed' | 'error';
  readonly message: string;
  readonly runtimeMessage: string;
  readonly storeRuntimeMessage: string;
  readonly attachState: string;
  readonly actionStates: readonly { readonly commandId: string; readonly accepted: string | null; readonly disabled: boolean }[];
  readonly evidenceKinds: readonly string[];
  readonly timelineStatuses: readonly string[];
  readonly textSample: string;
}

function sha256Buffer(buffer: Buffer | string): string {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function sha256(value: unknown): string {
  return sha256Buffer(JSON.stringify(value));
}

function contentType(path: string): string {
  const ext = extname(path);
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

async function run(command: string, args: readonly string[], cwd: string, timeoutMs: number): Promise<void> {
  const child = spawn(command, [...args], {
    cwd,
    stdio: 'inherit',
  });
  const timer = setTimeout(() => {
    child.kill('SIGTERM');
  }, timeoutMs);
  const [code, signal] = await once(child, 'exit') as [number | null, NodeJS.Signals | null];
  clearTimeout(timer);
  assert.equal(signal, null, `${command} ${args.join(' ')} was terminated by ${signal}`);
  assert.equal(code, 0, `${command} ${args.join(' ')} exited with ${code}`);
}

async function ensureNativeAddon(): Promise<{ readonly artifact: string; readonly destination: string }> {
  await run('cargo', ['build', '--release'], nativeCrateRoot, 120000);
  const artifact = join(nativeCrateRoot, 'target/release/libnative_bridge.so');
  assert.equal(existsSync(artifact), true, `native bridge cdylib missing at ${artifact}`);
  await mkdir(dirname(nativeAddonDest), { recursive: true });
  await copyFile(artifact, nativeAddonDest);
  return {
    artifact,
    destination: nativeAddonDest,
  };
}

function providerPrelude(token: string): string {
  const methodList = JSON.stringify(rpcMethods);
  return `
(() => {
  globalThis.ashaStudioNativeVoxelLaunchProof = { enabled: true };
  const endpoint = '${rpcPath}?token=${token}';
  const methods = ${methodList};
  function callNative(method, args) {
    const request = new XMLHttpRequest();
    request.open('POST', endpoint, false);
    request.setRequestHeader('content-type', 'application/json');
    request.send(JSON.stringify({ method, args }));
    let response = null;
    try {
      response = JSON.parse(request.responseText);
    } catch {
      throw new Error('Native bridge RPC returned non-JSON response: ' + request.status);
    }
    if (request.status !== 200 || response.ok !== true) {
      const message = response && response.error && response.error.message
        ? response.error.message
        : 'Native bridge RPC failed';
      throw new Error(message);
    }
    return response.value;
  }
  const bridge = {};
  for (const method of methods) {
    bridge[method] = (...args) => callNative(method, args);
  }
  globalThis.ashaStudioRuntimeBridge = {
    kind: 'asha_studio.native_runtime_bridge_provider.v1',
    backend: 'native_rust',
    productAuthority: true,
    referenceFallback: false,
    createRuntimeBridge: () => bridge,
  };
})();
`;
}

function invalidProviderPrelude(): string {
  return `
(() => {
  globalThis.ashaStudioNativeVoxelLaunchProof = { enabled: true };
  globalThis.ashaStudioRuntimeBridge = {
    kind: 'asha_studio.invalid_provider.v0',
    backend: 'reference_bridge',
    productAuthority: false,
    referenceFallback: true,
  };
})();
`;
}

function automationPrelude(): string {
  return `
(() => {
  const mode = new URL(location.href).searchParams.get('provider') || 'native';
  globalThis.ashaStudioNativeVoxelLaunchProof = globalThis.ashaStudioNativeVoxelLaunchProof || { enabled: true };
  globalThis.ashaStudioNativeVoxelLaunchProof.enabled = true;
  const proof = {
    mode,
    status: 'error',
    message: 'not started',
    runtimeMessage: '',
    storeRuntimeMessage: '',
    attachState: '',
    actionStates: [],
    evidenceKinds: [],
    timelineStatuses: [],
    textSample: '',
  };

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function text() {
    return document.body ? document.body.innerText : '';
  }

  async function waitFor(predicate, label, timeoutMs = 8000) {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      const value = predicate();
      if (value) return value;
      await delay(50);
    }
    throw new Error('Timed out waiting for ' + label);
  }

  async function proofStore() {
    return waitFor(
      () => globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store,
      'Studio proof store',
    );
  }

  function collect() {
    const runtimeText = text();
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    const storeRuntimeMessage = store && typeof store.runtimeConnectionMessage === 'function'
      ? store.runtimeConnectionMessage()
      : '';
    proof.storeRuntimeMessage = storeRuntimeMessage;
    const diagnosticText = runtimeText + '\\n' + storeRuntimeMessage;
    proof.runtimeMessage = runtimeText.includes('Rust RuntimeSession attached') || storeRuntimeMessage.includes('Rust RuntimeSession attached')
      ? 'Rust RuntimeSession attached'
      : diagnosticText.includes('globalThis.ashaStudioRuntimeBridge')
        ? diagnosticText.match(/globalThis\\.ashaStudioRuntimeBridge[^\\n]*/)?.[0] || 'provider rejected'
        : 'runtime message unavailable';
    proof.attachState = store && typeof store.runtimeSessionInspection === 'function'
      ? store.runtimeSessionInspection().attachState
      : '';
    proof.actionStates = Array.from(document.querySelectorAll('[data-voxel-action]')).map(button => ({
      commandId: button.getAttribute('data-voxel-action'),
      accepted: button.getAttribute('data-voxel-action-accepted'),
      disabled: button.disabled === true,
    }));
    proof.evidenceKinds = Array.from(new Set(
      Array.from(document.querySelectorAll('[data-voxel-evidence-kind]')).map(row => row.getAttribute('data-voxel-evidence-kind')),
    ));
    proof.timelineStatuses = Array.from(document.querySelectorAll('[data-voxel-timeline-status]')).map(row => row.getAttribute('data-voxel-timeline-status'));
    proof.textSample = runtimeText.slice(0, 8000);
  }

  function storeShell() {
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    return store && typeof store.voxelConversionWorkspaceShell === 'function'
      ? store.voxelConversionWorkspaceShell()
      : null;
  }

  function acceptedAction(commandId) {
    const shell = storeShell();
    const action = shell && shell.actions
      ? shell.actions.find(candidate => candidate.commandId === commandId)
      : null;
    return action && action.accepted === true;
  }

  function attachedStore() {
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    const inspection = store && typeof store.runtimeSessionInspection === 'function'
      ? store.runtimeSessionInspection()
      : null;
    return inspection && inspection.attachState === 'attached';
  }

  function failClosedProviderDiagnostic() {
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    const storeMessage = store && typeof store.runtimeConnectionMessage === 'function'
      ? store.runtimeConnectionMessage()
      : '';
    return (text() + '\\n' + storeMessage).includes('globalThis.ashaStudioRuntimeBridge');
  }

  function finish() {
    collect();
    const script = document.createElement('script');
    script.id = 'asha-native-voxel-launch-proof';
    script.type = 'application/json';
    script.textContent = JSON.stringify(proof);
    document.body.appendChild(script);
    document.documentElement.setAttribute('data-asha-native-voxel-proof', proof.status);
  }

  async function runProof() {
    try {
      const store = await proofStore();
      await store.attachRuntimeSessionInspection();
      if (mode === 'native') {
        await waitFor(() => attachedStore(), 'native RuntimeSession attach');
        await waitFor(() => acceptedAction('voxel_conversion.plan'), 'plan proposal readiness');
        store.submitVoxelConversionCommand('voxel_conversion.plan');
        await waitFor(() => acceptedAction('voxel_conversion.preview'), 'preview proposal readiness');
        store.submitVoxelConversionCommand('voxel_conversion.preview');
        await waitFor(() => acceptedAction('voxel_conversion.apply'), 'apply proposal readiness');
        store.submitVoxelConversionCommand('voxel_conversion.apply');
        await waitFor(() => acceptedAction('voxel_conversion.export_evidence'), 'evidence export proposal readiness');
        store.submitVoxelConversionCommand('voxel_conversion.export_evidence');
        await waitFor(() => document.querySelector('[data-voxel-evidence-kind="apply_receipt"]'), 'apply receipt evidence');
        proof.status = 'complete';
        proof.message = 'native provider attached and voxel conversion commands completed';
      } else {
        await waitFor(() => failClosedProviderDiagnostic(), 'fail-closed provider diagnostic');
        proof.status = 'failed_closed';
        proof.message = 'provider rejection stayed visible in Studio diagnostics';
      }
    } catch (error) {
      proof.status = 'error';
      proof.message = error instanceof Error ? error.message : String(error);
    } finally {
      finish();
    }
  }

  window.addEventListener('load', () => {
    setTimeout(() => void runProof(), 0);
  });
})();
`;
}

function injectScripts(indexHtml: string, mode: string, token: string): string {
  const scripts = [
    mode === 'native' ? providerPrelude(token) : '',
    mode === 'invalid' ? invalidProviderPrelude() : '',
    automationPrelude(),
  ].filter(script => script.length > 0)
    .map(script => `<script>${script}</script>`)
    .join('\n');
  return indexHtml.replace('</head>', `${scripts}\n</head>`);
}

function readBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolvePromise, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', chunk => chunks.push(Buffer.from(chunk)));
    request.on('end', () => resolvePromise(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

async function handleRpc(bridge: RuntimeBridge, request: IncomingMessage, response: ServerResponse, token: string): Promise<void> {
  const url = new URL(request.url ?? '/', `http://${browserHost}`);
  if (url.searchParams.get('token') !== token) {
    response.writeHead(403, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: { message: 'invalid native bridge RPC token' } }));
    return;
  }
  const body = JSON.parse((await readBody(request)).toString('utf8')) as { readonly method?: unknown; readonly args?: unknown };
  if (typeof body.method !== 'string' || !allowedRpcMethods.has(body.method) || !Array.isArray(body.args)) {
    response.writeHead(400, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: { message: 'invalid native bridge RPC request' } }));
    return;
  }
  const method = (bridge as unknown as Record<string, unknown>)[body.method];
  if (typeof method !== 'function') {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: { message: `native bridge method not available: ${body.method}` } }));
    return;
  }
  try {
    const value = method.apply(bridge, body.args);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, value }));
  } catch (error) {
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      ok: false,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
      },
    }));
  }
}

async function handleStatic(request: IncomingMessage, response: ServerResponse, token: string): Promise<void> {
  const url = new URL(request.url ?? '/', `http://${browserHost}`);
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = join(staticRoot, path);
  if (!filePath.startsWith(staticRoot) || !existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('not found');
    return;
  }
  if (path === '/index.html') {
    const html = await readFile(filePath, 'utf8');
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(injectScripts(html, url.searchParams.get('provider') ?? 'native', token));
    return;
  }
  response.writeHead(200, { 'content-type': contentType(filePath) });
  createReadStream(filePath).pipe(response);
}

async function createLaunchServer(bridge: RuntimeBridge, token: string): Promise<{ readonly port: number; close(): Promise<void> }> {
  const server = createServer((request, response) => {
    void (async () => {
      if (request.url?.startsWith(rpcPath) === true && request.method === 'POST') {
        await handleRpc(bridge, request, response, token);
        return;
      }
      await handleStatic(request, response, token);
    })().catch(error => {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(error instanceof Error ? error.message : String(error));
    });
  });
  server.listen(0, bindHost);
  await once(server, 'listening');
  const address = server.address();
  assert.equal(typeof address, 'object');
  assert.ok(address);
  return {
    port: address.port,
    close: async () => {
      server.close();
      await once(server, 'close');
    },
  };
}

async function runChromiumDump(url: string): Promise<string> {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--virtual-time-budget=12000',
    '--dump-dom',
    url,
  ];
  const child = spawn(chromium, args, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as ChildProcessWithoutNullStreams;
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    stdout += chunk;
  });
  child.stderr.on('data', chunk => {
    stderr += chunk;
  });
  const timer = setTimeout(() => child.kill('SIGTERM'), 20000);
  const [code, signal] = await once(child, 'exit') as [number | null, NodeJS.Signals | null];
  clearTimeout(timer);
  assert.equal(signal, null, `chromium terminated by ${signal}\n${stderr}`);
  assert.equal(code, 0, stderr);
  return stdout;
}

function readProofFromDom(dom: string): BrowserProof {
  const markerPattern = new RegExp('<script id="asha-native-voxel-launch-proof" type="application/json">([^<]+)</script>');
  const match = dom.match(markerPattern);
  assert.ok(match, 'browser proof JSON marker was not written');
  return JSON.parse(match[1]) as BrowserProof;
}

async function main(): Promise<void> {
  await run('pnpm', ['exec', 'nx', 'build', 'studio-app', '--configuration=development'], repoRoot, 120000);
  const nativeAddon = await ensureNativeAddon();
  const bridge = createNativeRuntimeBridge();
  const token = randomBytes(16).toString('hex');
  const launchServer = await createLaunchServer(bridge, token);
  const baseUrl = `http://${browserHost}:${launchServer.port}/`;
  await mkdir(outDir, { recursive: true });

  try {
    const nativeDom = await runChromiumDump(`${baseUrl}?provider=native`);
    const nativeProof = readProofFromDom(nativeDom);
    assert.equal(nativeProof.status, 'complete', JSON.stringify(nativeProof, null, 2));
    assert.equal(nativeProof.runtimeMessage, 'Rust RuntimeSession attached');
    assert.deepEqual(nativeProof.evidenceKinds, ['plan', 'preview', 'apply_receipt']);
    assert.deepEqual(nativeProof.timelineStatuses, ['complete', 'complete', 'complete', 'ready']);

    const missingDom = await runChromiumDump(`${baseUrl}?provider=missing`);
    const missingProof = readProofFromDom(missingDom);
    assert.equal(missingProof.status, 'failed_closed', JSON.stringify(missingProof, null, 2));
    assert.match(missingProof.runtimeMessage, /globalThis\.ashaStudioRuntimeBridge/);

    const invalidDom = await runChromiumDump(`${baseUrl}?provider=invalid`);
    const invalidProof = readProofFromDom(invalidDom);
    assert.equal(invalidProof.status, 'failed_closed', JSON.stringify(invalidProof, null, 2));
    assert.match(invalidProof.runtimeMessage, /globalThis\.ashaStudioRuntimeBridge/);

    const nativeDomPath = join(outDir, 'native-provider-dom.html');
    const missingDomPath = join(outDir, 'missing-provider-dom.html');
    const invalidDomPath = join(outDir, 'invalid-provider-dom.html');
    await writeFile(nativeDomPath, nativeDom);
    await writeFile(missingDomPath, missingDom);
    await writeFile(invalidDomPath, invalidDom);

    const artifact = {
      artifactKind: 'studio_native_voxel_runtime_launch_proof',
      artifactVersion: 'studio-native-voxel-runtime-launch-proof.v0',
      generatedAt: 'deterministic-as-structure-only',
      command: 'pnpm run evidence -- native-voxel-runtime-launch',
      launch: {
        bindHost,
        browserUrl: baseUrl,
        staticRoot: relative(repoRoot, staticRoot),
        providerContract: 'asha_studio.native_runtime_bridge_provider.v1',
        backend: 'native_rust',
        productAuthority: true,
        referenceFallback: false,
      },
      nativeAddon: {
        sourceArtifact: relative(repoRoot, nativeAddon.artifact),
        installedAddon: relative(repoRoot, nativeAddon.destination),
        installedAddonHash: sha256Buffer(await readFile(nativeAddon.destination)),
      },
      domArtifacts: {
        nativeProvider: {
          path: relative(repoRoot, nativeDomPath),
          hash: sha256Buffer(nativeDom),
        },
        missingProvider: {
          path: relative(repoRoot, missingDomPath),
          hash: sha256Buffer(missingDom),
        },
        invalidProvider: {
          path: relative(repoRoot, invalidDomPath),
          hash: sha256Buffer(invalidDom),
        },
      },
      proofs: {
        nativeProvider: nativeProof,
        missingProvider: missingProof,
        invalidProvider: invalidProof,
      },
      validations: [
        'studio_app_built_and_served_with_native_provider_prelude',
        'native_addon_rebuilt_and_accepted_by_createNativeRuntimeBridge',
        'attachRuntimeSessionInspection_succeeded_with_native_rust_authority',
        'voxel_conversion_plan_preview_apply_export_used_native_runtime_facade',
        'missing_provider_remained_fail_closed',
        'invalid_provider_remained_fail_closed',
      ],
      nonClaims: [
        'not_hardware_gpu_evidence',
        'not_performance_evidence',
        'not_packaged_electron_evidence',
        'not_public_remote_rpc_api',
      ],
    };
    const artifactWithHash = {
      ...artifact,
      artifactHash: sha256(artifact),
    };
    await writeFile(artifactPath, `${JSON.stringify(artifactWithHash, null, 2)}\n`);
    console.log(`wrote ${relative(repoRoot, artifactPath)}`);
  } finally {
    await launchServer.close();
  }
}

await main();
