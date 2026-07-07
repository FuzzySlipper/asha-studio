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
  'registerVoxelConversionSource',
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
  readonly agentSurface: {
    readonly operationStatuses: readonly string[];
    readonly compactVoxelEdits: readonly {
      readonly affordance: string;
      readonly accepted: boolean;
      readonly generatedCommandCount: number | null;
      readonly diagnostic: string | null;
    }[];
    readonly acceptedVoxelEdit: boolean | null;
    readonly rejectedCompactVoxelEdit: boolean | null;
    readonly rejectedVoxelEdit: boolean | null;
    readonly unsupportedVoxelEdit: boolean | null;
    readonly viewCapture: {
      readonly angle: string;
      readonly target: string;
      readonly targetRenderableId: string | null;
      readonly sessionId: string;
      readonly sceneHash: string;
      readonly readbackMarker: string;
      readonly cameraHash: string;
      readonly viewportReadbackHash: string;
      readonly captureHash: string;
      readonly nonClaims: readonly string[];
    } | null;
    readonly previewPublication: {
      readonly artifactKind: string;
      readonly artifactVersion: string;
      readonly label: string;
      readonly artifactPath: string;
      readonly sessionId: string;
      readonly sceneHash: string;
      readonly readbackMarker: string;
      readonly conversion: {
        readonly readoutHash: string;
        readonly status: string;
        readonly authorityPosture: string;
        readonly outputVoxelCount: number | null;
        readonly outputBoundsLabel: string;
        readonly evidenceKinds: readonly string[];
        readonly sourceEvidenceRefs: readonly {
          readonly source: string;
          readonly kind: string;
          readonly uri: string;
          readonly contentHash: string;
        }[];
      };
      readonly viewport: {
        readonly cameraHash: string;
        readonly readbackHash: string;
        readonly selectedRenderableId: string | null;
      };
      readonly nonClaims: readonly string[];
      readonly publicationHash: string;
    } | null;
    readonly surfaceHash: string;
  };
  readonly nativeSmoke: {
    readonly sessionHashBeforeVoxelEdits: string | null;
    readonly sessionHashAfterAcceptedVoxelEdits: string | null;
    readonly sessionHashAfterRejectedVoxelEdit: string | null;
    readonly commandCountsBeforeVoxelEdits: { readonly accepted: number | null; readonly rejected: number | null };
    readonly commandCountsAfterAcceptedVoxelEdits: { readonly accepted: number | null; readonly rejected: number | null };
    readonly commandCountsAfterRejectedVoxelEdit: { readonly accepted: number | null; readonly rejected: number | null };
    readonly conversion: {
      readonly outputVoxelCount: number | null;
      readonly outputBoundsLabel: string;
      readonly materialRows: readonly {
        readonly sourceMaterialSlot: number;
        readonly sourceMaterialId: string | null;
        readonly voxelMaterial: number;
      }[];
      readonly exportedEvidenceRefs: readonly {
        readonly kind: string;
        readonly uri: string;
        readonly contentHash: string;
      }[];
    };
  };
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
    agentSurface: {
      operationStatuses: [],
      compactVoxelEdits: [],
      acceptedVoxelEdit: null,
      rejectedCompactVoxelEdit: null,
      rejectedVoxelEdit: null,
      unsupportedVoxelEdit: null,
      viewCapture: null,
      previewPublication: null,
      surfaceHash: '',
    },
    nativeSmoke: {
      sessionHashBeforeVoxelEdits: null,
      sessionHashAfterAcceptedVoxelEdits: null,
      sessionHashAfterRejectedVoxelEdit: null,
      commandCountsBeforeVoxelEdits: { accepted: null, rejected: null },
      commandCountsAfterAcceptedVoxelEdits: { accepted: null, rejected: null },
      commandCountsAfterRejectedVoxelEdit: { accepted: null, rejected: null },
      conversion: {
        outputVoxelCount: null,
        outputBoundsLabel: '',
        materialRows: [],
        exportedEvidenceRefs: [],
      },
    },
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

  function nativeRuntimeBridge() {
    const provider = globalThis.ashaStudioRuntimeBridge || globalThis.ashaRuntimeBridge;
    return provider && typeof provider.createRuntimeBridge === 'function'
      ? provider.createRuntimeBridge()
      : null;
  }

  function commandCounts(inspection) {
    return {
      accepted: inspection && inspection.commandSummary ? inspection.commandSummary.acceptedCommandCount : null,
      rejected: inspection && inspection.commandSummary ? inspection.commandSummary.rejectedCommandCount : null,
    };
  }

  function recordCompactVoxelEditResult(affordance, result) {
    proof.agentSurface.operationStatuses.push('submit_compact_voxel_edit.' + affordance + ':' + result.accepted);
    proof.agentSurface.compactVoxelEdits.push({
      affordance,
      accepted: result.accepted === true,
      generatedCommandCount: result.compiledVoxelEditBatch && Array.isArray(result.compiledVoxelEditBatch.commands)
        ? result.compiledVoxelEditBatch.commands.length
        : null,
      diagnostic: result.diagnostic || null,
    });
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
        const runtimeBridge = nativeRuntimeBridge();
        if (!runtimeBridge || typeof runtimeBridge.registerVoxelConversionSource !== 'function') {
          throw new Error('native RuntimeBridge did not expose registerVoxelConversionSource');
        }
        const registration = runtimeBridge.registerVoxelConversionSource({
          source: {
            assetId: 'mesh.demo-cube',
            assetKind: 'mesh',
            assetVersion: 1,
            sourceHash: 'sha256:22b58100010034f72eb504d7722aec14b819438bce47e80bf361b3444e238117',
            meshPrimitive: 'default',
          },
          positions: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
          triangles: [{ indices: [0, 1, 2], sourceMaterialSlot: 0 }],
          materialSlots: [{ sourceMaterialSlot: 0, sourceMaterialId: 'material.demo-copper' }],
        });
        proof.agentSurface.operationStatuses.push('register_conversion_source:' + registration.registered);
        const rejectedRegistration = runtimeBridge.registerVoxelConversionSource({
          source: {
            assetId: 'mesh.demo-missing-geometry',
            assetKind: 'mesh',
            assetVersion: 1,
            sourceHash: 'sha256:mesh-demo-missing-geometry',
            meshPrimitive: 'default',
          },
          positions: [],
          triangles: [{ indices: [0, 1, 2], sourceMaterialSlot: 0 }],
          materialSlots: [{ sourceMaterialSlot: 0, sourceMaterialId: 'material.demo-copper' }],
        });
        proof.agentSurface.operationStatuses.push(
          'reject_conversion_source:' + (rejectedRegistration.registered === false && rejectedRegistration.diagnostics[0]?.code === 'unsupported_source_asset'),
        );
        const inspectResult = store.runAgentVoxelWorkflowOperation({ kind: 'inspect' });
        proof.agentSurface.operationStatuses.push('inspect:' + inspectResult.accepted);
        const viewResult = store.runAgentVoxelWorkflowOperation({
          kind: 'view_from_angle',
          view: { angle: 'isometric', target: 'selected' },
        });
        proof.agentSurface.operationStatuses.push('view_from_angle.isometric:' + viewResult.accepted);
        proof.agentSurface.viewCapture = viewResult.viewCapture === null || viewResult.viewCapture === undefined
          ? null
          : {
              angle: viewResult.viewCapture.angle,
              target: viewResult.viewCapture.target,
              targetRenderableId: viewResult.viewCapture.targetRenderableId,
              sessionId: viewResult.viewCapture.sessionId,
              sceneHash: viewResult.viewCapture.sceneHash,
              readbackMarker: viewResult.viewCapture.readbackMarker,
              cameraHash: viewResult.viewCapture.viewport.cameraHash,
              viewportReadbackHash: viewResult.viewCapture.viewport.readbackHash,
              captureHash: viewResult.viewCapture.captureHash,
              nonClaims: viewResult.viewCapture.nonClaims,
            };
        const configureResult = store.runAgentVoxelWorkflowOperation({
          kind: 'configure_conversion',
          patch: {
            sourceAssetId: 'mesh.demo-cube',
            mode: 'surface',
            fitPolicy: 'contain',
            originPolicy: 'target_min',
            resolution: [8, 8, 8],
            voxelSize: 0.25,
            maxOutputVoxels: 1024,
            targetGrid: 1,
            targetVolumeAssetId: 'voxel/generated',
            targetOrigin: [0, 0, 0],
            meshPrimitive: 'default',
            materialSourceSlot: 0,
            materialSourceId: 'material.demo-copper',
            materialVoxelId: 1,
            defaultMaterial: '1',
          },
        });
        proof.agentSurface.operationStatuses.push('configure_conversion:' + configureResult.accepted);
        await waitFor(() => acceptedAction('voxel_conversion.plan'), 'plan proposal readiness');
        const planResult = store.runAgentVoxelWorkflowOperation({ kind: 'run_conversion', commandId: 'voxel_conversion.plan' });
        proof.agentSurface.operationStatuses.push('run_conversion.plan:' + planResult.accepted);
        await waitFor(() => acceptedAction('voxel_conversion.preview'), 'preview proposal readiness');
        const previewResult = store.runAgentVoxelWorkflowOperation({ kind: 'run_conversion', commandId: 'voxel_conversion.preview' });
        proof.agentSurface.operationStatuses.push('run_conversion.preview:' + previewResult.accepted);
        await waitFor(() => acceptedAction('voxel_conversion.apply'), 'apply proposal readiness');
        const applyResult = store.runAgentVoxelWorkflowOperation({ kind: 'run_conversion', commandId: 'voxel_conversion.apply' });
        proof.agentSurface.operationStatuses.push('run_conversion.apply:' + applyResult.accepted);
        await waitFor(() => acceptedAction('voxel_conversion.export_evidence'), 'evidence export proposal readiness');
        const exportResult = store.runAgentVoxelWorkflowOperation({ kind: 'run_conversion', commandId: 'voxel_conversion.export_evidence' });
        proof.agentSurface.operationStatuses.push('run_conversion.export_evidence:' + exportResult.accepted);
        const publishPreviewResult = store.runAgentVoxelWorkflowOperation({
          kind: 'publish_preview',
          publication: {
            artifactPath: 'artifacts/native-voxel-runtime-launch/latest/voxel-preview-publication.json',
            label: 'Native voxel runtime launch preview',
          },
        });
        proof.agentSurface.operationStatuses.push('publish_preview:' + publishPreviewResult.accepted);
        proof.agentSurface.previewPublication = publishPreviewResult.previewPublication ?? null;
        const conversionShell = store.voxelConversionWorkspaceShell();
        const inspectionBeforeVoxelEdits = store.runtimeSessionInspection();
        const exportedEvidenceRows = Array.from(new Map(
          conversionShell.evidenceRows
            .filter(row => row.source === 'export' && row.status === 'available')
            .map(row => [row.kind + ':' + row.uri, row]),
        ).values());
        proof.nativeSmoke.sessionHashBeforeVoxelEdits = inspectionBeforeVoxelEdits.sessionHash;
        proof.nativeSmoke.commandCountsBeforeVoxelEdits = commandCounts(inspectionBeforeVoxelEdits);
        proof.nativeSmoke.conversion = {
          outputVoxelCount: conversionShell.previewProjection.outputVoxelCount,
          outputBoundsLabel: conversionShell.previewProjection.outputBoundsLabel,
          materialRows: conversionShell.previewProjection.materialRows,
          exportedEvidenceRefs: exportedEvidenceRows.map(row => ({ kind: row.kind, uri: row.uri, contentHash: row.contentHash })),
        };
        const acceptedEdit = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_voxel_edit',
          batch: {
            commands: [{
              op: 'setVoxel',
              grid: 1,
              coord: { x: 2, y: 0, z: 0 },
              value: { kind: 'solid', material: 1 },
            }],
          },
        });
        proof.agentSurface.acceptedVoxelEdit = acceptedEdit.accepted;
        const compactSetVoxels = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_compact_voxel_edit',
          edit: {
            kind: 'set_voxels',
            grid: 1,
            voxels: [
              { x: 0, y: 0, z: 0, i: 1 },
              { x: 1, y: 0, z: 0, i: 1 },
            ],
          },
        });
        recordCompactVoxelEditResult('set_voxels', compactSetVoxels);
        const compactSetVoxelRuns = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_compact_voxel_edit',
          edit: {
            kind: 'set_voxels_runs',
            grid: 1,
            runs: [{ x1: 0, x2: 2, y: 0, z: 0, i: 1 }],
          },
        });
        recordCompactVoxelEditResult('set_voxels_runs', compactSetVoxelRuns);
        const compactFillBox = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_compact_voxel_edit',
          edit: {
            kind: 'fill_box',
            grid: 1,
            x1: 0,
            y1: 1,
            z1: 0,
            x2: 0,
            y2: 1,
            z2: 0,
            palette_index: 1,
          },
        });
        recordCompactVoxelEditResult('fill_box', compactFillBox);
        const compactPrimitives = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_compact_voxel_edit',
          edit: {
            kind: 'apply_voxel_primitives',
            grid: 1,
            primitives: [
              { kind: 'block', at: { x: 2, y: 0, z: 0 }, palette_index: 1 },
              { kind: 'line', from: { x: 0, y: 1, z: 0 }, to: { x: 2, y: 1, z: 0 }, palette_index: 1 },
            ],
          },
        });
        recordCompactVoxelEditResult('apply_voxel_primitives', compactPrimitives);
        const inspectionAfterAcceptedVoxelEdits = store.runtimeSessionInspection();
        proof.nativeSmoke.sessionHashAfterAcceptedVoxelEdits = inspectionAfterAcceptedVoxelEdits.sessionHash;
        proof.nativeSmoke.commandCountsAfterAcceptedVoxelEdits = commandCounts(inspectionAfterAcceptedVoxelEdits);
        const rejectedCompactEdit = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_compact_voxel_edit',
          edit: {
            kind: 'fill_box',
            grid: 1,
            x1: 0,
            y1: 0,
            z1: 0,
            x2: 8,
            y2: 8,
            z2: 0,
            palette_index: 1,
          },
        });
        recordCompactVoxelEditResult('fill_box_oversized', rejectedCompactEdit);
        proof.agentSurface.rejectedCompactVoxelEdit = rejectedCompactEdit.accepted === false
          && rejectedCompactEdit.voxelEditReceipt === null
          && typeof rejectedCompactEdit.diagnostic === 'string'
          && rejectedCompactEdit.diagnostic.includes('exceeds 64 generated commands');
        const rejectedEdit = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_voxel_edit',
          batch: {
            commands: [{
              op: 'setVoxel',
              grid: 1,
              coord: { x: 3, y: 0, z: 0 },
              value: { kind: 'solid', material: 999 },
            }],
          },
        });
        proof.agentSurface.rejectedVoxelEdit = rejectedEdit.accepted === false && rejectedEdit.voxelEditReceipt !== null;
        const inspectionAfterRejectedVoxelEdit = store.runtimeSessionInspection();
        proof.nativeSmoke.sessionHashAfterRejectedVoxelEdit = inspectionAfterRejectedVoxelEdit.sessionHash;
        proof.nativeSmoke.commandCountsAfterRejectedVoxelEdit = commandCounts(inspectionAfterRejectedVoxelEdit);
        const unsupportedEdit = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_voxel_edit',
          batch: {
            commands: [{
              op: 'fillRegion',
              grid: 1,
              min: { x: 0, y: 0, z: 0 },
              max: { x: 1, y: 1, z: 1 },
              value: { kind: 'solid', material: 1 },
            }],
          },
        });
        proof.agentSurface.unsupportedVoxelEdit = unsupportedEdit.accepted === false && unsupportedEdit.voxelEditReceipt === null;
        proof.agentSurface.surfaceHash = unsupportedEdit.surface.surfaceHash;
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
    assert.deepEqual(nativeProof.agentSurface.compactVoxelEdits, [
      { affordance: 'set_voxels', accepted: true, generatedCommandCount: 2, diagnostic: null },
      { affordance: 'set_voxels_runs', accepted: true, generatedCommandCount: 3, diagnostic: null },
      { affordance: 'fill_box', accepted: true, generatedCommandCount: 1, diagnostic: null },
      { affordance: 'apply_voxel_primitives', accepted: true, generatedCommandCount: 4, diagnostic: null },
      {
        affordance: 'fill_box_oversized',
        accepted: false,
        generatedCommandCount: null,
        diagnostic: 'compact voxel edit exceeds 64 generated commands',
      },
    ], JSON.stringify(nativeProof.agentSurface.compactVoxelEdits, null, 2));
    assert.deepEqual(nativeProof.agentSurface.operationStatuses, [
      'register_conversion_source:true',
      'reject_conversion_source:true',
      'inspect:true',
      'view_from_angle.isometric:true',
      'configure_conversion:true',
      'run_conversion.plan:true',
      'run_conversion.preview:true',
      'run_conversion.apply:true',
      'run_conversion.export_evidence:true',
      'publish_preview:true',
      'submit_compact_voxel_edit.set_voxels:true',
      'submit_compact_voxel_edit.set_voxels_runs:true',
      'submit_compact_voxel_edit.fill_box:true',
      'submit_compact_voxel_edit.apply_voxel_primitives:true',
      'submit_compact_voxel_edit.fill_box_oversized:false',
    ]);
    assert.deepEqual(nativeProof.agentSurface.viewCapture, {
      angle: 'isometric',
      target: 'selected',
      targetRenderableId: 'selected-voxel:0,0,0',
      sessionId: 'session-preview-0001',
      sceneHash: 'scene-view-57349d34',
      readbackMarker: 'session-preview-0001:scene-view-57349d34:4',
      cameraHash: nativeProof.agentSurface.viewCapture?.cameraHash,
      viewportReadbackHash: nativeProof.agentSurface.viewCapture?.viewportReadbackHash,
      captureHash: nativeProof.agentSurface.viewCapture?.captureHash,
      nonClaims: [
        'not_runtime_authority',
        'not_hardware_gpu_capture',
        'not_voxelforge_viewer',
        'not_browser_screenshot',
      ],
    });
    assert.match(nativeProof.agentSurface.viewCapture?.cameraHash ?? '', /^viewport-camera-/);
    assert.match(nativeProof.agentSurface.viewCapture?.viewportReadbackHash ?? '', /^viewport-readback-/);
    assert.match(nativeProof.agentSurface.viewCapture?.captureHash ?? '', /^studio-agent-voxel-view-capture-/);
    assert.equal(nativeProof.agentSurface.previewPublication?.artifactKind, 'studio_agent_voxel_preview_publication');
    assert.equal(
      nativeProof.agentSurface.previewPublication?.artifactPath,
      'artifacts/native-voxel-runtime-launch/latest/voxel-preview-publication.json',
    );
    assert.equal(nativeProof.agentSurface.previewPublication?.conversion.authorityPosture, 'authority_backed');
    assert.equal(nativeProof.agentSurface.previewPublication?.conversion.outputVoxelCount, 3);
    assert.equal(nativeProof.agentSurface.previewPublication?.conversion.outputBoundsLabel, '[0,0,0] to [7,7,0]');
    assert.deepEqual(nativeProof.agentSurface.previewPublication?.conversion.evidenceKinds, [
      'plan',
      'preview',
      'apply_receipt',
    ]);
    assert.match(nativeProof.agentSurface.previewPublication?.publicationHash ?? '', /^studio-agent-voxel-preview-publication-/);
    assert.ok(nativeProof.agentSurface.previewPublication?.nonClaims.includes('not_vforge_file'));
    assert.ok(nativeProof.agentSurface.previewPublication?.nonClaims.includes('not_arbitrary_filesystem_write'));
    assert.equal(nativeProof.agentSurface.acceptedVoxelEdit, true);
    assert.equal(nativeProof.agentSurface.rejectedCompactVoxelEdit, true);
    assert.equal(nativeProof.agentSurface.rejectedVoxelEdit, true);
    assert.equal(nativeProof.agentSurface.unsupportedVoxelEdit, true);
    assert.match(nativeProof.agentSurface.surfaceHash, /^studio-agent-voxel-workflow-/);
    assert.match(nativeProof.nativeSmoke.sessionHashBeforeVoxelEdits ?? '', /^fnv1a64:/);
    assert.match(nativeProof.nativeSmoke.sessionHashAfterAcceptedVoxelEdits ?? '', /^fnv1a64:/);
    assert.notEqual(
      nativeProof.nativeSmoke.sessionHashAfterAcceptedVoxelEdits,
      nativeProof.nativeSmoke.sessionHashBeforeVoxelEdits,
      'accepted voxel edits must change the authority session hash',
    );
    assert.deepEqual(nativeProof.nativeSmoke.commandCountsBeforeVoxelEdits, { accepted: 0, rejected: 0 });
    assert.deepEqual(nativeProof.nativeSmoke.commandCountsAfterAcceptedVoxelEdits, { accepted: 11, rejected: 0 });
    assert.deepEqual(nativeProof.nativeSmoke.commandCountsAfterRejectedVoxelEdit, { accepted: 11, rejected: 1 });
    assert.equal(nativeProof.nativeSmoke.conversion.outputVoxelCount, 3);
    assert.equal(nativeProof.nativeSmoke.conversion.outputBoundsLabel, '[0,0,0] to [7,7,0]');
    assert.deepEqual(nativeProof.nativeSmoke.conversion.materialRows, [
      { sourceMaterialSlot: 0, sourceMaterialId: 'material.demo-copper', voxelMaterial: 1 },
    ]);
    assert.deepEqual(
      nativeProof.nativeSmoke.conversion.exportedEvidenceRefs.map(ref => ref.kind),
      ['plan', 'preview', 'apply_receipt'],
    );
    for (const ref of nativeProof.nativeSmoke.conversion.exportedEvidenceRefs) {
      assert.match(ref.uri, /^asha:\/\/voxel-conversion\//);
      assert.match(ref.contentHash, /^fnv1a64:/);
    }

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
    const previewPublicationPath = join(outDir, 'voxel-preview-publication.json');
    assert.ok(nativeProof.agentSurface.previewPublication, 'preview publication was not produced');
    const previewPublication = {
      ...nativeProof.agentSurface.previewPublication,
      artifactHash: sha256(nativeProof.agentSurface.previewPublication),
    };
    await writeFile(nativeDomPath, nativeDom);
    await writeFile(missingDomPath, missingDom);
    await writeFile(invalidDomPath, invalidDom);
    await writeFile(previewPublicationPath, `${JSON.stringify(previewPublication, null, 2)}\n`);

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
      previewPublicationArtifact: {
        path: relative(repoRoot, previewPublicationPath),
        hash: previewPublication.artifactHash,
        publicationHash: previewPublication.publicationHash,
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
        'studio_catalog_static_mesh_registered_as_authority_conversion_source',
        'voxel_conversion_plan_preview_apply_export_used_native_runtime_facade',
        'view_from_angle_recorded_projection_camera_readout_without_screenshot_authority',
        'publish_preview_emitted_bounded_projection_evidence_artifact',
        'agent_voxel_workflow_surface_drove_conversion_and_bounded_voxel_edits',
        'all_adapted_voxelforge_compact_affordances_submitted_through_public_surface',
        'oversized_voxelforge_style_compact_edit_failed_closed_before_runtime_submission',
        'missing_provider_remained_fail_closed',
        'invalid_provider_remained_fail_closed',
      ],
      nonClaims: [
        'not_hardware_gpu_evidence',
        'not_hardware_gpu_capture',
        'not_performance_evidence',
        'not_vforge_file',
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
