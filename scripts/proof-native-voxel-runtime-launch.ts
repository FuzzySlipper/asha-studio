#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { tmpdir } from 'node:os';
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
const serveMode = process.argv.includes('--serve');

const rpcMethods = [
  'initializeEngine',
  'loadProjectBundle',
  'saveProjectBundle',
  'getProjectBundleCompositionStatus',
  'unloadProjectBundle',
  'stepSimulation',
  'readRenderDiffs',
  'submitCommands',
  'pickVoxel',
  'selectVoxel',
  'readVoxelMeshEvidence',
  'readVoxelModelInfo',
  'createCamera',
  'readCameraProjection',
  'applyFirstPersonCameraInput',
  'applyCollisionConstrainedCameraInput',
  'readModelMaterialPreview',
  'readSceneObjectSnapshot',
  'applySceneObjectCommand',
  'loadFpsRuntimeSession',
  'readFpsRuntimeSession',
  'applyFpsPrimaryFire',
  'invokeGameExtensionWeaponEffect',
  'validateGameRuleCatalog',
  'submitGameRuleEffectIntent',
  'readGameRuleRuntimeReadout',
  'restartFpsRuntimeSession',
  'readFpsEncounterDirector',
  'applyFpsEncounterTransition',
  'applyEnemyDirectNavMovement',
  'planVoxelConversion',
  'registerVoxelConversionSource',
  'registerVoxelConversionMeshAsset',
  'previewVoxelConversion',
  'applyVoxelConversion',
  'exportVoxelConversionEvidence',
  'exportVoxelVolumeAsset',
  'saveVoxelVolumeAsset',
  'loadVoxelVolumeAsset',
  'readVoxelEditHistory',
  'previewVoxelEditRevert',
  'applyVoxelEditRevert',
  'undoVoxelEdit',
  'redoVoxelEdit',
  'getBuffer',
  'releaseBuffer',
  'loadReplayFixture',
  'runReplayStep',
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
    readonly operationDiagnostics: readonly string[];
    readonly compactVoxelEdits: readonly {
      readonly affordance: string;
      readonly accepted: boolean;
      readonly generatedCommandCount: number | null;
      readonly diagnostic: string | null;
    }[];
    readonly compactVoxelEditControls: {
      readonly block: {
        readonly status: string;
        readonly lastAction: string | null;
        readonly preflightAction: string | null;
        readonly preflightGeneratedCommandCount: number | null;
        readonly preflightAccepted: boolean | null;
        readonly preflightDiagnostic: string | null;
        readonly generatedCommandCount: number | null;
        readonly acceptedCommandCount: number | null;
        readonly rejectedCommandCount: number | null;
        readonly diagnostic: string | null;
      } | null;
      readonly fillBox: {
        readonly status: string;
        readonly lastAction: string | null;
        readonly preflightAction: string | null;
        readonly preflightGeneratedCommandCount: number | null;
        readonly preflightAccepted: boolean | null;
        readonly preflightDiagnostic: string | null;
        readonly generatedCommandCount: number | null;
        readonly acceptedCommandCount: number | null;
        readonly rejectedCommandCount: number | null;
        readonly diagnostic: string | null;
      } | null;
      readonly primitiveBoxShell: {
        readonly status: string;
        readonly lastAction: string | null;
        readonly preflightAction: string | null;
        readonly preflightGeneratedCommandCount: number | null;
        readonly preflightAccepted: boolean | null;
        readonly preflightDiagnostic: string | null;
        readonly generatedCommandCount: number | null;
        readonly acceptedCommandCount: number | null;
        readonly rejectedCommandCount: number | null;
        readonly diagnostic: string | null;
      } | null;
      readonly primitiveLineRadius: {
        readonly status: string;
        readonly lastAction: string | null;
        readonly preflightAction: string | null;
        readonly preflightGeneratedCommandCount: number | null;
        readonly preflightAccepted: boolean | null;
        readonly preflightDiagnostic: string | null;
        readonly generatedCommandCount: number | null;
        readonly acceptedCommandCount: number | null;
        readonly rejectedCommandCount: number | null;
        readonly diagnostic: string | null;
      } | null;
      readonly primitiveLineOverMax: {
        readonly status: string;
        readonly lastAction: string | null;
        readonly preflightAction: string | null;
        readonly preflightGeneratedCommandCount: number | null;
        readonly preflightAccepted: boolean | null;
        readonly preflightDiagnostic: string | null;
        readonly generatedCommandCount: number | null;
        readonly acceptedCommandCount: number | null;
        readonly rejectedCommandCount: number | null;
        readonly diagnostic: string | null;
      } | null;
      readonly oversizedFillBox: {
        readonly status: string;
        readonly lastAction: string | null;
        readonly preflightAction: string | null;
        readonly preflightGeneratedCommandCount: number | null;
        readonly preflightAccepted: boolean | null;
        readonly preflightDiagnostic: string | null;
        readonly generatedCommandCount: number | null;
        readonly acceptedCommandCount: number | null;
        readonly rejectedCommandCount: number | null;
        readonly diagnostic: string | null;
      } | null;
    };
    readonly compactVoxelPlacement: {
      readonly start: {
        readonly status: string;
        readonly canUseViewportHit: boolean;
        readonly sourceRenderableId: string | null;
        readonly sourceFace: string | null;
        readonly sourceVoxelCoord: { readonly x: number; readonly y: number; readonly z: number } | null;
        readonly targetStart: { readonly x: number; readonly y: number; readonly z: number };
        readonly targetEnd: { readonly x: number; readonly y: number; readonly z: number };
        readonly previewLabel: string;
        readonly readoutHash: string;
      } | null;
      readonly end: {
        readonly status: string;
        readonly canUseViewportHit: boolean;
        readonly sourceRenderableId: string | null;
        readonly sourceFace: string | null;
        readonly sourceVoxelCoord: { readonly x: number; readonly y: number; readonly z: number } | null;
        readonly targetStart: { readonly x: number; readonly y: number; readonly z: number };
        readonly targetEnd: { readonly x: number; readonly y: number; readonly z: number };
        readonly previewLabel: string;
        readonly readoutHash: string;
      } | null;
    };
    readonly voxelHistory: {
      readonly status: string;
      readonly runtimeAttached: boolean;
      readonly message: string;
      readonly diagnostic: string | null;
      readonly historyHash: string | null;
      readonly cursorHash: string | null;
      readonly entryCount: number;
      readonly retainedRedoCount: number;
      readonly diffStatus: string;
      readonly diagnosticCodes: readonly string[];
      readonly readoutHash: string;
      readonly nonClaims: readonly string[];
    } | null;
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
    readonly voxelAssetPersistence: {
      readonly converted: {
        readonly artifactPath: string;
        readonly assetId: string;
        readonly mediaType: string;
        readonly schemaVersion: number;
        readonly voxelCount: number;
        readonly boundsLabel: string;
        readonly canonicalJsonHash: string;
        readonly voxelDataHash: string;
        readonly validationDiagnosticCodes: readonly string[];
        readonly nonClaims: readonly string[];
        readonly serializedAsset: string;
      } | null;
      readonly authored: {
        readonly artifactPath: string;
        readonly assetId: string;
        readonly mediaType: string;
        readonly schemaVersion: number;
        readonly voxelCount: number;
        readonly boundsLabel: string;
        readonly canonicalJsonHash: string;
        readonly voxelDataHash: string;
        readonly validationDiagnosticCodes: readonly string[];
        readonly nonClaims: readonly string[];
        readonly serializedAsset: string;
      } | null;
      readonly convertedReopen: {
        readonly roundTripMatches: boolean;
        readonly reopenedHash: string;
        readonly expectedHash: string | null;
        readonly voxelCount: number;
        readonly boundsLabel: string;
      } | null;
      readonly authoredReopen: {
        readonly roundTripMatches: boolean;
        readonly reopenedHash: string;
        readonly expectedHash: string | null;
        readonly voxelCount: number;
        readonly boundsLabel: string;
      } | null;
    };
    readonly transcriptReplay: {
      readonly artifactKind: string;
      readonly artifactVersion: string;
      readonly transcriptHash: string;
      readonly replayed: boolean;
      readonly accepted: boolean;
      readonly diagnostic: string | null;
      readonly producerId: string | null;
      readonly operationCount: number;
      readonly acceptedOperationCount: number;
      readonly rejectedOperationCount: number;
      readonly operations: readonly {
        readonly operationId: string;
        readonly kind: string;
        readonly accepted: boolean;
        readonly expectedAccepted: boolean | null;
        readonly expectationMatched: boolean;
        readonly diagnostic: string | null;
        readonly surfaceHash: string;
        readonly resultHash: string;
      }[];
      readonly nonClaims: readonly string[];
      readonly receiptHash: string;
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
    readonly sourceRegistration: {
      readonly registered: boolean | null;
      readonly meshAssetRegistered: boolean | null;
      readonly rejectedUnsupported: boolean | null;
      readonly sourceAssetId: string | null;
      readonly meshAssetId: string | null;
      readonly materialSlotCount: number | null;
      readonly meshAssetMaterialSlotCount: number | null;
    };
    readonly conversion: {
      readonly outputVoxelCount: number | null;
      readonly outputBoundsLabel: string;
      readonly materialRows: readonly {
        readonly sourceMaterialSlot: number;
        readonly sourceMaterialId: string | null;
        readonly voxelMaterial: number;
        readonly samplingStatus: string;
        readonly textureAssetId: string | null;
        readonly textureContentHash: string | null;
        readonly uvAttributeName: string | null;
        readonly uvAttributeHash: string | null;
        readonly sampleUv: readonly [number, number] | null;
        readonly samplingPolicy: string | null;
        readonly wrapPolicy: string | null;
        readonly materialMode: string | null;
      }[];
      readonly exportedEvidenceRefs: readonly {
        readonly kind: string;
        readonly uri: string;
        readonly contentHash: string;
      }[];
      readonly exportedVolumeAsset: {
        readonly exported: boolean;
        readonly assetId: string | null;
        readonly mediaType: string | null;
        readonly schemaVersion: number | null;
        readonly voxelCount: number | null;
        readonly boundsLabel: string | null;
        readonly canonicalJsonHash: string | null;
        readonly voxelDataHash: string | null;
        readonly validationDiagnosticCodes: readonly string[];
        readonly fullAssetPayload: boolean;
      } | null;
      readonly savedVolumeAsset: {
        readonly saved: boolean;
        readonly assetId: string | null;
        readonly projectBundle: string;
        readonly assetPath: string;
        readonly operation: string | null;
        readonly previousCanonicalJsonHash: string | null;
        readonly nextCanonicalJsonHash: string | null;
        readonly nextVoxelDataHash: string | null;
        readonly expectedCanonicalJsonHash: string | null;
        readonly expectedVoxelDataHash: string | null;
        readonly voxelCount: number | null;
        readonly materialCount: number | null;
        readonly provenanceCount: number | null;
        readonly validationDiagnosticCodes: readonly string[];
        readonly fullAssetPayload: boolean;
      } | null;
      readonly loadedVolumeAsset: {
        readonly loaded: boolean;
        readonly requestAssetId: string;
        readonly modelId: string;
        readonly volumeAssetId: string | null;
        readonly grid: number;
        readonly voxelCount: number;
        readonly materialCounts: readonly { readonly material: number; readonly voxelCount: number }[];
        readonly provenanceKinds: readonly string[];
        readonly canonicalJsonHash: string | null;
        readonly voxelDataHash: string | null;
        readonly sessionHash: string;
        readonly replayHash: string;
        readonly validationDiagnosticCodes: readonly string[];
      } | null;
    };
    readonly modelInfo: {
      readonly resident: boolean | null;
      readonly modelId: string | null;
      readonly volumeAssetId: string | null;
      readonly voxelCount: number | null;
      readonly materialCounts: readonly { readonly material: number; readonly voxelCount: number }[];
      readonly sourceAssetId: string | null;
      readonly evidenceRefs: readonly {
        readonly kind: string;
        readonly uri: string;
        readonly contentHash: string;
      }[];
      readonly diagnosticCodes: readonly string[];
    };
    readonly missingModelInfo: {
      readonly resident: boolean | null;
      readonly diagnosticCodes: readonly string[];
    };
  };
  readonly textSample: string;
}

interface VoxelAssetAuthorityValidation {
  readonly path: string;
  readonly isValid: boolean;
  readonly canonicalJsonHash: string;
  readonly voxelDataHash: string;
  readonly diagnosticCodes: readonly string[];
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

async function runCapture(command: string, args: readonly string[], cwd: string, timeoutMs: number): Promise<string> {
  const child = spawn(command, [...args], {
    cwd,
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
  const timer = setTimeout(() => {
    child.kill('SIGTERM');
  }, timeoutMs);
  const [code, signal] = await once(child, 'exit') as [number | null, NodeJS.Signals | null];
  clearTimeout(timer);
  assert.equal(signal, null, `${command} ${args.join(' ')} was terminated by ${signal}\n${stderr}`);
  assert.equal(code, 0, `${command} ${args.join(' ')} exited with ${code}\n${stdout}\n${stderr}`);
  return stdout;
}

async function validateVoxelAssetsWithRustAuthority(
  assetPaths: readonly string[],
): Promise<readonly VoxelAssetAuthorityValidation[]> {
  const harnessRoot = await mkdtemp(join(tmpdir(), 'asha-studio-voxel-asset-authority-'));
  try {
    await mkdir(join(harnessRoot, 'src'), { recursive: true });
    await writeFile(
      join(harnessRoot, 'Cargo.toml'),
      [
        '[package]',
        'name = "validate-studio-voxel-assets"',
        'version = "0.1.0"',
        'edition = "2021"',
        '',
        '[dependencies]',
        `svc-voxel-asset = { path = ${
          JSON.stringify(join(engineRoot, 'engine-rs', 'crates', 'services', 'svc-voxel-asset'))
        } }`,
        'serde_json = "1"',
        '',
      ].join('\n'),
    );
    await writeFile(
      join(harnessRoot, 'src/main.rs'),
      String.raw`
use std::{env, fs};

use serde_json::json;
use svc_voxel_asset::{decode_asset, validate_asset, VoxelAssetDecodeError};

fn diagnostic_codes(report: &svc_voxel_asset::VoxelAssetValidationReport) -> Vec<serde_json::Value> {
    report
        .diagnostics
        .iter()
        .map(|diagnostic| serde_json::to_value(&diagnostic.code).expect("diagnostic code serializes"))
        .collect()
}

fn main() {
    let mut reports = Vec::new();
    for path in env::args().skip(1) {
        let text = fs::read_to_string(&path).expect("voxel asset can be read");
        let report = match decode_asset(&text) {
            Ok(asset) => validate_asset(&asset),
            Err(VoxelAssetDecodeError::Invalid(report)) => report,
            Err(error) => panic!("{path}: {error}"),
        };
        reports.push(json!({
            "path": path,
            "isValid": report.is_valid(),
            "canonicalJsonHash": report.canonical_json_hash.clone(),
            "voxelDataHash": report.voxel_data_hash.clone(),
            "diagnosticCodes": diagnostic_codes(&report),
        }));
    }
    println!("{}", serde_json::to_string_pretty(&reports).expect("reports serialize"));
}
`,
    );
    const stdout = await runCapture(
      'cargo',
      ['run', '--quiet', '--manifest-path', join(harnessRoot, 'Cargo.toml'), '--', ...assetPaths],
      harnessRoot,
      120000,
    );
    return JSON.parse(stdout) as readonly VoxelAssetAuthorityValidation[];
  } finally {
    await rm(harnessRoot, { recursive: true, force: true });
  }
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
      operationDiagnostics: [],
      compactVoxelEdits: [],
      compactVoxelEditControls: {
        block: null,
        fillBox: null,
        primitiveBoxShell: null,
        primitiveLineRadius: null,
        primitiveLineOverMax: null,
        oversizedFillBox: null,
      },
      compactVoxelPlacement: {
        start: null,
        end: null,
      },
      voxelHistory: null,
      acceptedVoxelEdit: null,
      rejectedCompactVoxelEdit: null,
      rejectedVoxelEdit: null,
      unsupportedVoxelEdit: null,
      viewCapture: null,
      previewPublication: null,
      voxelAssetPersistence: {
        converted: null,
        authored: null,
        convertedReopen: null,
        authoredReopen: null,
      },
      transcriptReplay: null,
      surfaceHash: '',
    },
    nativeSmoke: {
      sessionHashBeforeVoxelEdits: null,
      sessionHashAfterAcceptedVoxelEdits: null,
      sessionHashAfterRejectedVoxelEdit: null,
      commandCountsBeforeVoxelEdits: { accepted: null, rejected: null },
      commandCountsAfterAcceptedVoxelEdits: { accepted: null, rejected: null },
      commandCountsAfterRejectedVoxelEdit: { accepted: null, rejected: null },
      sourceRegistration: {
        registered: null,
        meshAssetRegistered: null,
        rejectedUnsupported: null,
        sourceAssetId: null,
        meshAssetId: null,
        materialSlotCount: null,
        meshAssetMaterialSlotCount: null,
      },
      conversion: {
        outputVoxelCount: null,
        outputBoundsLabel: '',
        materialRows: [],
        exportedEvidenceRefs: [],
        exportedVolumeAsset: null,
        savedVolumeAsset: null,
        loadedVolumeAsset: null,
      },
      modelInfo: {
        resident: null,
        modelId: null,
        volumeAssetId: null,
        voxelCount: null,
        materialCounts: [],
        sourceAssetId: null,
        evidenceRefs: [],
        diagnosticCodes: [],
      },
      missingModelInfo: {
        resident: null,
        diagnosticCodes: [],
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

  function compactVoxelEditControlReadout() {
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    const control = store && typeof store.voxelCompactEditControl === 'function'
      ? store.voxelCompactEditControl()
      : null;
    if (!control) {
      throw new Error('Compact voxel edit control readout unavailable');
    }
    return {
      status: control.status,
      lastAction: control.lastAction,
      preflightAction: control.preflightAction,
      preflightGeneratedCommandCount: control.preflightGeneratedCommandCount,
      preflightAccepted: control.preflightAccepted,
      preflightDiagnostic: control.preflightDiagnostic,
      generatedCommandCount: control.generatedCommandCount,
      acceptedCommandCount: control.acceptedCommandCount,
      rejectedCommandCount: control.rejectedCommandCount,
      diagnostic: control.diagnostic,
    };
  }

  function compactVoxelEditPlacementReadout() {
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    const placement = store && typeof store.voxelCompactEditPlacement === 'function'
      ? store.voxelCompactEditPlacement()
      : null;
    if (!placement) {
      throw new Error('Compact voxel edit placement readout unavailable');
    }
    return {
      status: placement.status,
      canUseViewportHit: placement.canUseViewportHit,
      sourceRenderableId: placement.sourceRenderableId,
      sourceFace: placement.sourceFace,
      sourceVoxelCoord: placement.sourceVoxelCoord,
      targetStart: placement.targetStart,
      targetEnd: placement.targetEnd,
      previewLabel: placement.previewLabel,
      readoutHash: placement.readoutHash,
    };
  }

  function voxelHistoryPanelReadout() {
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    const panel = store && typeof store.voxelHistoryPanel === 'function'
      ? store.voxelHistoryPanel()
      : null;
    if (!panel) {
      throw new Error('Voxel history panel readout unavailable');
    }
    return {
      status: panel.control.status,
      runtimeAttached: panel.runtimeAttached,
      message: panel.control.message,
      diagnostic: panel.control.diagnostic,
      historyHash: panel.historyHash,
      cursorHash: panel.cursorHash,
      entryCount: panel.entryCount,
      retainedRedoCount: panel.retainedRedoCount,
      diffStatus: panel.diff.status,
      diagnosticCodes: Array.isArray(panel.diagnostics)
        ? panel.diagnostics.map(diagnostic => diagnostic.code)
        : [],
      readoutHash: panel.readoutHash,
      nonClaims: panel.nonClaims,
    };
  }

  function readVoxelHistoryPanel() {
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    if (!store || typeof store.runVoxelHistoryControl !== 'function') {
      throw new Error('Voxel history store method unavailable');
    }
    store.runVoxelHistoryControl('read');
    return voxelHistoryPanelReadout();
  }

  function setViewportVoxelHit(coord, face) {
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    if (!store || typeof store.selectViewportHit !== 'function') {
      throw new Error('Viewport hit store method unavailable');
    }
    store.selectViewportHit({
      renderableId: 'selected-voxel:0,0,0',
      face,
      worldPosition: { x: coord.x + 0.25, y: coord.y + 0.25, z: coord.z + 0.25 },
      voxelCoord: coord,
      hitHash: 'viewport-hit-proof-' + coord.x + '-' + coord.y + '-' + coord.z + '-' + face,
    });
  }

  async function useViewportHitForCompactVoxelEdit(endpoint) {
    const button = document.querySelector('[data-voxel-edit-placement-action="use_' + endpoint + '"]');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing compact voxel edit placement action ' + endpoint);
    }
    const store = globalThis.ashaStudioNativeVoxelLaunchProof && globalThis.ashaStudioNativeVoxelLaunchProof.store;
    if (!store || typeof store.applyViewportHitToVoxelCompactEditControl !== 'function') {
      throw new Error('Compact voxel edit placement store method unavailable');
    }
    store.applyViewportHitToVoxelCompactEditControl(endpoint);
    return waitFor(() => {
      const placement = compactVoxelEditPlacementReadout();
      if (endpoint === 'start' && placement.targetStart.x === placement.sourceVoxelCoord?.x) return placement;
      if (endpoint === 'end' && placement.targetEnd.x === placement.sourceVoxelCoord?.x) return placement;
      return null;
    }, 'compact voxel edit placement ' + endpoint);
  }

  function setCompactVoxelEditControl(name, value) {
    const input = document.querySelector('[data-voxel-edit-control="' + name + '"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Missing compact voxel edit input ' + name);
    }
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function selectCompactVoxelEditControl(name, value) {
    const input = document.querySelector('[data-voxel-edit-control="' + name + '"]');
    if (!(input instanceof HTMLSelectElement)) {
      throw new Error('Missing compact voxel edit select ' + name);
    }
    input.value = String(value);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function submitCompactVoxelEditControl(action) {
    const button = document.querySelector('[data-voxel-edit-action="' + action + '"]');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing compact voxel edit action ' + action);
    }
    button.click();
    await waitFor(() => {
      const control = compactVoxelEditControlReadout();
      return control.lastAction === action && control.status !== 'idle' ? control : null;
    }, 'compact voxel edit control ' + action);
    return compactVoxelEditControlReadout();
  }

  function summarizeVoxelAssetPersistence(result) {
    const persistence = result.voxelAssetPersistence;
    if (!persistence || !persistence.asset) return null;
    return {
      artifactPath: persistence.artifactPath,
      assetId: persistence.asset.assetId,
      mediaType: persistence.asset.mediaType,
      schemaVersion: persistence.asset.schemaVersion,
      voxelCount: persistence.asset.representation.sparseRuns.reduce((total, run) => total + run.length, 0),
      boundsLabel: persistence.source.boundsLabel,
      canonicalJsonHash: persistence.asset.contentHashes.canonicalJson,
      voxelDataHash: persistence.asset.contentHashes.voxelData,
      validationDiagnosticCodes: persistence.asset.validationDiagnostics.map(diagnostic => diagnostic.code),
      nonClaims: persistence.nonClaims,
      serializedAsset: persistence.serializedAsset,
    };
  }

  function summarizeVoxelVolumeExport(result) {
    const exportReadout = result.voxelVolumeExport;
    if (!exportReadout) return null;
    return {
      exported: exportReadout.exported,
      assetId: exportReadout.assetId,
      mediaType: exportReadout.mediaType,
      schemaVersion: exportReadout.schemaVersion,
      voxelCount: exportReadout.voxelCount,
      boundsLabel: exportReadout.boundsLabel,
      canonicalJsonHash: exportReadout.canonicalJsonHash,
      voxelDataHash: exportReadout.voxelDataHash,
      validationDiagnosticCodes: exportReadout.validationDiagnosticCodes,
      fullAssetPayload: exportReadout.fullAssetPayload,
    };
  }

  function summarizeVoxelVolumeSave(result) {
    const saveReadout = result.voxelVolumeSave;
    if (!saveReadout) return null;
    return {
      saved: saveReadout.saved,
      assetId: saveReadout.assetId,
      projectBundle: saveReadout.projectBundle,
      assetPath: saveReadout.assetPath,
      operation: saveReadout.operation,
      previousCanonicalJsonHash: saveReadout.previousCanonicalJsonHash,
      nextCanonicalJsonHash: saveReadout.nextCanonicalJsonHash,
      nextVoxelDataHash: saveReadout.nextVoxelDataHash,
      expectedCanonicalJsonHash: saveReadout.expectedCanonicalJsonHash,
      expectedVoxelDataHash: saveReadout.expectedVoxelDataHash,
      voxelCount: saveReadout.voxelCount,
      materialCount: saveReadout.materialCount,
      provenanceCount: saveReadout.provenanceCount,
      validationDiagnosticCodes: saveReadout.validationDiagnosticCodes,
      fullAssetPayload: saveReadout.fullAssetPayload,
    };
  }

  function summarizeVoxelVolumeLoad(result) {
    const loadReadout = result.voxelVolumeLoad;
    if (!loadReadout) return null;
    return {
      loaded: loadReadout.loaded,
      requestAssetId: loadReadout.requestAssetId,
      modelId: loadReadout.modelId,
      volumeAssetId: loadReadout.volumeAssetId,
      grid: loadReadout.grid,
      voxelCount: loadReadout.voxelCount,
      materialCounts: loadReadout.materialCounts,
      provenanceKinds: loadReadout.provenanceKinds,
      canonicalJsonHash: loadReadout.canonicalJsonHash,
      voxelDataHash: loadReadout.voxelDataHash,
      sessionHash: loadReadout.sessionHash,
      replayHash: loadReadout.replayHash,
      validationDiagnosticCodes: loadReadout.validationDiagnosticCodes,
    };
  }

  function summarizeVoxelAssetReopen(result) {
    const reopen = result.voxelAssetReopen;
    if (!reopen) return null;
    return {
      roundTripMatches: reopen.roundTripMatches,
      reopenedHash: reopen.reopenedHash,
      expectedHash: reopen.expectedHash,
      voxelCount: reopen.voxelCount,
      boundsLabel: reopen.boundsLabel,
    };
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
        const registration = store.runAgentVoxelWorkflowOperation({
          kind: 'register_conversion_source',
          registration: {
            source: {
              assetId: 'mesh.demo-cube',
              assetKind: 'mesh',
              assetVersion: 1,
              sourceHash: 'sha256:22b58100010034f72eb504d7722aec14b819438bce47e80bf361b3444e238117',
              meshPrimitive: 'default',
            },
            positions: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
            triangles: [{ indices: [0, 1, 2], sourceMaterialSlot: 0 }],
            materialSlots: [{ sourceMaterialSlot: 0, sourceMaterialId: 'material/demo-copper' }],
          },
        });
        proof.agentSurface.operationStatuses.push('register_conversion_source.facade:' + registration.accepted);
        proof.nativeSmoke.sourceRegistration.registered = registration.sourceRegistration?.registered ?? null;
        proof.nativeSmoke.sourceRegistration.sourceAssetId = registration.sourceRegistration?.source.assetId ?? null;
        proof.nativeSmoke.sourceRegistration.materialSlotCount = registration.sourceRegistration?.materialSlots.length ?? null;
        const meshAssetRegistration = store.runAgentVoxelWorkflowOperation({
          kind: 'register_conversion_mesh_asset',
          registration: {
            source: {
              assetId: 'mesh.demo-cube',
              assetKind: 'mesh',
              assetVersion: 1,
              sourceHash: 'sha256:22b58100010034f72eb504d7722aec14b819438bce47e80bf361b3444e238117',
              meshPrimitive: 'default',
            },
            meshAsset: {
              assetId: 'mesh.demo-cube',
              sourcePath: 'public-fixtures/demo-assets/asha-studio-demo-pack/models/demo-crate.mesh.json',
              positions: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
              normals: [[0, 0, 1], [0, 0, 1], [0, 0, 1]],
              indices: [0, 1, 2],
              groups: [{ materialSlot: 0, start: 0, count: 3 }],
              materialSlots: [{ sourceMaterialSlot: 0, sourceMaterialId: 'material/demo-copper' }],
            },
          },
        });
        proof.agentSurface.operationStatuses.push('register_conversion_mesh_asset.facade:' + meshAssetRegistration.accepted);
        proof.nativeSmoke.sourceRegistration.meshAssetRegistered = meshAssetRegistration.sourceRegistration?.registered ?? null;
        proof.nativeSmoke.sourceRegistration.meshAssetId = meshAssetRegistration.sourceRegistration?.source.assetId ?? null;
        proof.nativeSmoke.sourceRegistration.meshAssetMaterialSlotCount = meshAssetRegistration.sourceRegistration?.materialSlots.length ?? null;
        const rejectedRegistration = store.runAgentVoxelWorkflowOperation({
          kind: 'register_conversion_source',
          registration: {
            source: {
              assetId: 'mesh.demo-missing-geometry',
              assetKind: 'mesh',
              assetVersion: 1,
              sourceHash: 'sha256:mesh-demo-missing-geometry',
              meshPrimitive: 'default',
            },
            positions: [],
            triangles: [{ indices: [0, 1, 2], sourceMaterialSlot: 0 }],
            materialSlots: [{ sourceMaterialSlot: 0, sourceMaterialId: 'material/demo-copper' }],
          },
        });
        proof.nativeSmoke.sourceRegistration.rejectedUnsupported = rejectedRegistration.sourceRegistration?.registered === false
          && rejectedRegistration.sourceRegistration.diagnostics[0]?.code === 'unsupported_source_asset';
        proof.agentSurface.operationStatuses.push(
          'reject_conversion_source.facade:' + proof.nativeSmoke.sourceRegistration.rejectedUnsupported,
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
            materialSourceId: 'material/demo-copper',
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
        const modelInfoResult = store.runAgentVoxelWorkflowOperation({
          kind: 'get_model_info',
          request: {
            grid: 1,
            volumeAssetId: 'voxel/generated',
            includeMaterialCounts: true,
          },
        });
        proof.agentSurface.operationStatuses.push('get_model_info:' + modelInfoResult.accepted);
        proof.nativeSmoke.modelInfo = {
          resident: modelInfoResult.modelInfo?.resident ?? null,
          modelId: modelInfoResult.modelInfo?.modelId ?? null,
          volumeAssetId: modelInfoResult.modelInfo?.volumeAssetId ?? null,
          voxelCount: modelInfoResult.modelInfo?.voxelCount ?? null,
          materialCounts: modelInfoResult.modelInfo?.materialCounts ?? [],
          sourceAssetId: modelInfoResult.modelInfo?.source?.assetId ?? null,
          evidenceRefs: (modelInfoResult.modelInfo?.evidence ?? []).map(ref => ({ kind: ref.kind, uri: ref.uri, contentHash: ref.contentHash })),
          diagnosticCodes: (modelInfoResult.modelInfo?.diagnostics ?? []).map(diagnostic => diagnostic.code),
        };
        const exportedVolumeResult = store.runAgentVoxelWorkflowOperation({
          kind: 'export_voxel_volume_asset',
          exportRequest: {
            grid: 1,
            volumeAssetId: 'voxel/generated',
            targetAssetId: 'voxel-volume/generated',
            label: 'Native converted voxel volume',
            createdBy: 'codex-asha-studio',
            sourceTool: 'asha-studio',
            maxSparseRuns: 16,
            expectedSessionHash: modelInfoResult.modelInfo?.sessionHash ?? null,
          },
        });
        proof.agentSurface.operationStatuses.push('export_voxel_volume_asset.converted:' + exportedVolumeResult.accepted);
        if (exportedVolumeResult.diagnostic) {
          proof.agentSurface.operationDiagnostics.push('export_voxel_volume_asset.converted:' + exportedVolumeResult.diagnostic);
        }
        proof.nativeSmoke.conversion.exportedVolumeAsset = summarizeVoxelVolumeExport(exportedVolumeResult);
        const savedVolumeResult = store.runAgentVoxelWorkflowOperation({
          kind: 'save_voxel_volume_asset',
          saveRequest: {
            exportRequest: {
              grid: 1,
              volumeAssetId: 'voxel/generated',
              targetAssetId: 'voxel-volume/generated',
              label: 'Native converted voxel volume',
              createdBy: 'codex-asha-studio',
              sourceTool: 'asha-studio',
              maxSparseRuns: 16,
              expectedSessionHash: modelInfoResult.modelInfo?.sessionHash ?? null,
            },
            targetProjectBundle: 'asha-demo',
            targetAssetPath: 'assets/voxels/generated.avxl.json',
            representationKind: 'sparse_runs',
            expectedExistingCanonicalJsonHash: null,
            expectedCanonicalJsonHash: exportedVolumeResult.voxelVolumeExport?.canonicalJsonHash ?? null,
            expectedVoxelDataHash: exportedVolumeResult.voxelVolumeExport?.voxelDataHash ?? null,
          },
        });
        proof.agentSurface.operationStatuses.push('save_voxel_volume_asset.converted:' + savedVolumeResult.accepted);
        if (savedVolumeResult.diagnostic) {
          proof.agentSurface.operationDiagnostics.push('save_voxel_volume_asset.converted:' + savedVolumeResult.diagnostic);
        }
        proof.nativeSmoke.conversion.savedVolumeAsset = summarizeVoxelVolumeSave(savedVolumeResult);
        const loadedVolumeResult = store.runAgentVoxelWorkflowOperation({
          kind: 'load_voxel_volume_asset',
          loadRequest: {
            asset: savedVolumeResult.voxelVolumeSave && savedVolumeResult.voxelVolumeSave.asset
              ? savedVolumeResult.voxelVolumeSave.asset
              : exportedVolumeResult.voxelVolumeExport?.asset,
            targetGrid: 1,
            targetVolumeAssetId: 'voxel/generated',
            replaceExisting: true,
            includeMaterialCounts: true,
          },
        });
        proof.agentSurface.operationStatuses.push('load_voxel_volume_asset.converted:' + loadedVolumeResult.accepted);
        if (loadedVolumeResult.diagnostic) {
          proof.agentSurface.operationDiagnostics.push('load_voxel_volume_asset.converted:' + loadedVolumeResult.diagnostic);
        }
        proof.nativeSmoke.conversion.loadedVolumeAsset = summarizeVoxelVolumeLoad(loadedVolumeResult);
        const convertedAssetResult = store.runAgentVoxelWorkflowOperation({
          kind: 'persist_voxel_asset',
          persistence: {
            source: { kind: 'conversion_preview', modelInfo: modelInfoResult.modelInfo },
            assetId: 'voxel-volume/generated',
            artifactPath: 'artifacts/native-voxel-runtime-launch/latest/converted-voxel-volume.avxl.json',
            label: 'Native converted voxel volume',
          },
        });
        proof.agentSurface.operationStatuses.push('persist_voxel_asset.converted:' + convertedAssetResult.accepted);
        proof.agentSurface.voxelAssetPersistence.converted = summarizeVoxelAssetPersistence(convertedAssetResult);
        const convertedReopenResult = store.runAgentVoxelWorkflowOperation({
          kind: 'reopen_voxel_asset',
          reopen: {
            asset: convertedAssetResult.voxelAssetPersistence?.asset,
            artifactPath: 'artifacts/native-voxel-runtime-launch/latest/converted-voxel-volume.avxl.json',
            expectedAssetId: convertedAssetResult.voxelAssetPersistence?.asset.assetId,
            expectedCanonicalJsonHash: convertedAssetResult.voxelAssetPersistence?.asset.contentHashes.canonicalJson,
          },
        });
        proof.agentSurface.operationStatuses.push('reopen_voxel_asset.converted:' + convertedReopenResult.accepted);
        proof.agentSurface.voxelAssetPersistence.convertedReopen = summarizeVoxelAssetReopen(convertedReopenResult);
        const missingModelInfoResult = store.runAgentVoxelWorkflowOperation({
          kind: 'get_model_info',
          request: {
            grid: 999,
            volumeAssetId: 'voxel/missing',
            includeMaterialCounts: true,
          },
        });
        proof.agentSurface.operationStatuses.push('get_model_info.missing:' + missingModelInfoResult.accepted);
        proof.nativeSmoke.missingModelInfo = {
          resident: missingModelInfoResult.modelInfo?.resident ?? null,
          diagnosticCodes: (missingModelInfoResult.modelInfo?.diagnostics ?? []).map(diagnostic => diagnostic.code),
        };
        const acceptedEdit = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_voxel_edit',
          batch: {
            commands: [{
              op: 'setVoxel',
              grid: 1,
              coord: { x: 1, y: 0, z: 0 },
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
        const authoredAssetResult = store.runAgentVoxelWorkflowOperation({
          kind: 'persist_voxel_asset',
          persistence: {
            source: { kind: 'command_batch', batch: compactSetVoxels.compiledVoxelEditBatch },
            assetId: 'voxel-volume/agent-authored-edit',
            artifactPath: 'artifacts/native-voxel-runtime-launch/latest/authored-voxel-volume.avxl.json',
            label: 'Native authored voxel edit volume',
          },
        });
        proof.agentSurface.operationStatuses.push('persist_voxel_asset.authored:' + authoredAssetResult.accepted);
        proof.agentSurface.voxelAssetPersistence.authored = summarizeVoxelAssetPersistence(authoredAssetResult);
        const authoredReopenResult = store.runAgentVoxelWorkflowOperation({
          kind: 'reopen_voxel_asset',
          reopen: {
            asset: authoredAssetResult.voxelAssetPersistence?.asset,
            artifactPath: 'artifacts/native-voxel-runtime-launch/latest/authored-voxel-volume.avxl.json',
            expectedAssetId: authoredAssetResult.voxelAssetPersistence?.asset.assetId,
            expectedCanonicalJsonHash: authoredAssetResult.voxelAssetPersistence?.asset.contentHashes.canonicalJson,
          },
        });
        proof.agentSurface.operationStatuses.push('reopen_voxel_asset.authored:' + authoredReopenResult.accepted);
        proof.agentSurface.voxelAssetPersistence.authoredReopen = summarizeVoxelAssetReopen(authoredReopenResult);
        const compactSetVoxelRuns = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_compact_voxel_edit',
          edit: {
            kind: 'set_voxels_runs',
            grid: 1,
            runs: [
              { x1: 0, x2: 1, y: 0, z: 0, i: 1 },
              { x1: 0, x2: 0, y: 0, z: 0, i: 1 },
            ],
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
              { kind: 'block', at: { x: 1, y: 0, z: 0 }, palette_index: 1 },
              { kind: 'line', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 0, z: 0 }, palette_index: 1 },
              { kind: 'block', at: { x: 0, y: 0, z: 0 }, palette_index: 1 },
            ],
          },
        });
        recordCompactVoxelEditResult('apply_voxel_primitives', compactPrimitives);
        const transcriptReplay = store.runAgentVoxelOperationTranscriptReplay({
          artifactKind: 'studio_agent_voxel_operation_transcript',
          artifactVersion: 'studio-agent-voxel-operation-transcript.v0',
          producer: {
            kind: 'agent',
            id: 'codex-asha-studio',
            label: 'Native voxel launch proof',
          },
          target: {
            studioSurfaceVersion: 'studio-agent-voxel-workflow.v0',
            projectBundle: 'asha-demo',
            runtimeMode: 'native_rust',
          },
          operations: [
            {
              operationId: 'proof-configure-conversion',
              kind: 'configure_conversion',
              input: {
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
                  materialSourceId: 'material/demo-copper',
                  materialVoxelId: 1,
                  defaultMaterial: '1',
                },
              },
              expected: { accepted: true },
            },
            {
              operationId: 'proof-compact-voxel-edit',
              kind: 'submit_compact_voxel_edit',
              input: {
                edit: {
                  kind: 'apply_voxel_primitives',
                  grid: 1,
                  maxGeneratedVoxels: 64,
                  primitives: [
                    { kind: 'box', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 }, palette_index: 1, mode: 'shell' },
                  ],
                },
              },
              expected: { accepted: true },
            },
          ],
          nonClaims: [
            'not_vforge_file',
            'not_mcp_transport',
            'not_raw_runtime_bridge_dispatch',
            'not_runtime_authority',
            'not_private_studio_state_mutation',
          ],
        });
        proof.agentSurface.operationStatuses.push('transcript_replay:' + transcriptReplay.accepted);
        if (transcriptReplay.diagnostic) {
          proof.agentSurface.operationDiagnostics.push('transcript_replay:' + transcriptReplay.diagnostic);
        }
        proof.agentSurface.transcriptReplay = transcriptReplay;
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
        setCompactVoxelEditControl('grid', 1);
        setCompactVoxelEditControl('material', 1);
        setCompactVoxelEditControl('x1', 5);
        setCompactVoxelEditControl('y1', 5);
        setCompactVoxelEditControl('z1', 5);
        setCompactVoxelEditControl('x2', 1);
        setCompactVoxelEditControl('y2', 0);
        setCompactVoxelEditControl('z2', 0);
        setViewportVoxelHit({ x: 0, y: 0, z: 0 }, 'z_max');
        await waitFor(() => compactVoxelEditPlacementReadout().canUseViewportHit ? compactVoxelEditPlacementReadout() : null, 'compact voxel edit placement ready');
        proof.agentSurface.compactVoxelPlacement.start = await useViewportHitForCompactVoxelEdit('start');
        setViewportVoxelHit({ x: 1, y: 0, z: 0 }, 'x_max');
        await waitFor(() => {
          const placement = compactVoxelEditPlacementReadout();
          return placement.sourceVoxelCoord?.x === 1 ? placement : null;
        }, 'compact voxel edit placement second hit');
        proof.agentSurface.compactVoxelPlacement.end = await useViewportHitForCompactVoxelEdit('end');
        proof.agentSurface.compactVoxelEditControls.block = await submitCompactVoxelEditControl('block');
        setCompactVoxelEditControl('x1', 1);
        setCompactVoxelEditControl('y1', 1);
        setCompactVoxelEditControl('z1', 0);
        setCompactVoxelEditControl('x2', 1);
        setCompactVoxelEditControl('y2', 1);
        setCompactVoxelEditControl('z2', 0);
        proof.agentSurface.compactVoxelEditControls.fillBox = await submitCompactVoxelEditControl('fill_box');
        setCompactVoxelEditControl('x1', 0);
        setCompactVoxelEditControl('y1', 0);
        setCompactVoxelEditControl('z1', 0);
        setCompactVoxelEditControl('x2', 1);
        setCompactVoxelEditControl('y2', 1);
        setCompactVoxelEditControl('z2', 1);
        setCompactVoxelEditControl('max_generated_voxels', 64);
        selectCompactVoxelEditControl('draft_action', 'primitive_box');
        selectCompactVoxelEditControl('box_mode', 'shell');
        proof.agentSurface.compactVoxelEditControls.primitiveBoxShell = await submitCompactVoxelEditControl('primitive_box');
        setCompactVoxelEditControl('x1', 0);
        setCompactVoxelEditControl('y1', 0);
        setCompactVoxelEditControl('z1', 0);
        setCompactVoxelEditControl('x2', 1);
        setCompactVoxelEditControl('y2', 0);
        setCompactVoxelEditControl('z2', 0);
        setCompactVoxelEditControl('line_radius', 0);
        setCompactVoxelEditControl('max_generated_voxels', 64);
        selectCompactVoxelEditControl('draft_action', 'primitive_line');
        proof.agentSurface.compactVoxelEditControls.primitiveLineRadius = await submitCompactVoxelEditControl('primitive_line');
        setCompactVoxelEditControl('max_generated_voxels', 1);
        proof.agentSurface.compactVoxelEditControls.primitiveLineOverMax = await submitCompactVoxelEditControl('primitive_line');
        setCompactVoxelEditControl('x1', 0);
        setCompactVoxelEditControl('y1', 0);
        setCompactVoxelEditControl('z1', 0);
        setCompactVoxelEditControl('x2', 8);
        setCompactVoxelEditControl('y2', 8);
        setCompactVoxelEditControl('z2', 0);
        setCompactVoxelEditControl('max_generated_voxels', 64);
        proof.agentSurface.compactVoxelEditControls.oversizedFillBox = await submitCompactVoxelEditControl('fill_box');
        proof.agentSurface.voxelHistory = readVoxelHistoryPanel();
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

type NativeVoxelLaunchMode = 'proof' | 'interactive';

function injectScripts(indexHtml: string, mode: string, token: string, launchMode: NativeVoxelLaunchMode): string {
  const scripts = [
    mode === 'native' ? providerPrelude(token) : '',
    mode === 'invalid' ? invalidProviderPrelude() : '',
    launchMode === 'proof' ? automationPrelude() : '',
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
    const message = error instanceof Error ? error.message : String(error);
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      ok: false,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: `${body.method} RPC failed: ${message}`,
      },
    }));
  }
}

async function handleStatic(
  request: IncomingMessage,
  response: ServerResponse,
  token: string,
  launchMode: NativeVoxelLaunchMode,
): Promise<void> {
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
    response.end(injectScripts(html, url.searchParams.get('provider') ?? 'native', token, launchMode));
    return;
  }
  response.writeHead(200, { 'content-type': contentType(filePath) });
  createReadStream(filePath).pipe(response);
}

async function createLaunchServer(
  bridge: RuntimeBridge,
  token: string,
  launchMode: NativeVoxelLaunchMode,
): Promise<{ readonly port: number; close(): Promise<void> }> {
  const server = createServer((request, response) => {
    void (async () => {
      if (request.url?.startsWith(rpcPath) === true && request.method === 'POST') {
        await handleRpc(bridge, request, response, token);
        return;
      }
      await handleStatic(request, response, token, launchMode);
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

function waitForShutdown(): Promise<void> {
  return new Promise(resolvePromise => {
    let resolved = false;
    const shutdown = (): void => {
      if (resolved) return;
      resolved = true;
      resolvePromise();
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
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
  const launchServer = await createLaunchServer(bridge, token, serveMode ? 'interactive' : 'proof');
  const baseUrl = `http://${browserHost}:${launchServer.port}/`;
  await mkdir(outDir, { recursive: true });

  try {
    if (serveMode) {
      console.log('ASHA Studio native voxel server is running.');
      console.log(`Open ${baseUrl}?provider=native`);
      console.log('Press Ctrl+C to stop.');
      await waitForShutdown();
      return;
    }

    const nativeDom = await runChromiumDump(`${baseUrl}?provider=native`);
    const nativeProof = readProofFromDom(nativeDom);
    assert.equal(nativeProof.status, 'complete', JSON.stringify(nativeProof, null, 2));
    assert.equal(nativeProof.runtimeMessage, 'Rust RuntimeSession attached');
    assert.deepEqual(nativeProof.evidenceKinds, ['plan', 'preview', 'apply_receipt']);
    assert.deepEqual(nativeProof.timelineStatuses, ['complete', 'complete', 'complete', 'ready']);
    assert.deepEqual(nativeProof.agentSurface.compactVoxelEdits, [
      { affordance: 'set_voxels', accepted: true, generatedCommandCount: 2, diagnostic: null },
      { affordance: 'set_voxels_runs', accepted: true, generatedCommandCount: 2, diagnostic: null },
      { affordance: 'fill_box', accepted: true, generatedCommandCount: 1, diagnostic: null },
      { affordance: 'apply_voxel_primitives', accepted: true, generatedCommandCount: 2, diagnostic: null },
      {
        affordance: 'fill_box_oversized',
        accepted: false,
        generatedCommandCount: null,
        diagnostic: 'compact voxel edit exceeds 64 generated commands',
      },
    ], JSON.stringify(nativeProof.agentSurface.compactVoxelEdits, null, 2));
    assert.deepEqual(nativeProof.agentSurface.compactVoxelEditControls, {
      block: {
        status: 'accepted',
        lastAction: 'block',
        preflightAction: 'block',
        preflightGeneratedCommandCount: 1,
        preflightAccepted: true,
        preflightDiagnostic: null,
        generatedCommandCount: 1,
        acceptedCommandCount: 1,
        rejectedCommandCount: 0,
        diagnostic: null,
      },
      fillBox: {
        status: 'accepted',
        lastAction: 'fill_box',
        preflightAction: 'fill_box',
        preflightGeneratedCommandCount: 1,
        preflightAccepted: true,
        preflightDiagnostic: null,
        generatedCommandCount: 1,
        acceptedCommandCount: 1,
        rejectedCommandCount: 0,
        diagnostic: null,
      },
      primitiveBoxShell: {
        status: 'accepted',
        lastAction: 'primitive_box',
        preflightAction: 'primitive_box',
        preflightGeneratedCommandCount: 8,
        preflightAccepted: true,
        preflightDiagnostic: null,
        generatedCommandCount: 8,
        acceptedCommandCount: 8,
        rejectedCommandCount: 0,
        diagnostic: null,
      },
      primitiveLineRadius: {
        status: 'accepted',
        lastAction: 'primitive_line',
        preflightAction: 'primitive_line',
        preflightGeneratedCommandCount: 2,
        preflightAccepted: true,
        preflightDiagnostic: null,
        generatedCommandCount: 2,
        acceptedCommandCount: 2,
        rejectedCommandCount: 0,
        diagnostic: null,
      },
      primitiveLineOverMax: {
        status: 'rejected',
        lastAction: 'primitive_line',
        preflightAction: 'primitive_line',
        preflightGeneratedCommandCount: 2,
        preflightAccepted: false,
        preflightDiagnostic: 'compact voxel edit exceeds 1 generated commands',
        generatedCommandCount: 2,
        acceptedCommandCount: null,
        rejectedCommandCount: null,
        diagnostic: 'compact voxel edit exceeds 1 generated commands',
      },
      oversizedFillBox: {
        status: 'rejected',
        lastAction: 'fill_box',
        preflightAction: 'fill_box',
        preflightGeneratedCommandCount: 65,
        preflightAccepted: false,
        preflightDiagnostic: 'compact voxel edit exceeds 64 generated commands',
        generatedCommandCount: 65,
        acceptedCommandCount: null,
        rejectedCommandCount: null,
        diagnostic: 'compact voxel edit exceeds 64 generated commands',
      },
    }, JSON.stringify(nativeProof.agentSurface.compactVoxelEditControls, null, 2));
    assert.equal(nativeProof.agentSurface.compactVoxelPlacement.start?.status, 'ready');
    assert.equal(nativeProof.agentSurface.compactVoxelPlacement.start?.canUseViewportHit, true);
    assert.equal(nativeProof.agentSurface.compactVoxelPlacement.start?.sourceRenderableId, 'selected-voxel:0,0,0');
    assert.equal(nativeProof.agentSurface.compactVoxelPlacement.start?.sourceFace, 'z_max');
    assert.deepEqual(nativeProof.agentSurface.compactVoxelPlacement.start?.sourceVoxelCoord, { x: 0, y: 0, z: 0 });
    assert.deepEqual(nativeProof.agentSurface.compactVoxelPlacement.start?.targetStart, { x: 0, y: 0, z: 0 });
    assert.equal(nativeProof.agentSurface.compactVoxelPlacement.end?.status, 'ready');
    assert.equal(nativeProof.agentSurface.compactVoxelPlacement.end?.canUseViewportHit, true);
    assert.equal(nativeProof.agentSurface.compactVoxelPlacement.end?.sourceFace, 'x_max');
    assert.deepEqual(nativeProof.agentSurface.compactVoxelPlacement.end?.sourceVoxelCoord, { x: 1, y: 0, z: 0 });
    assert.deepEqual(nativeProof.agentSurface.compactVoxelPlacement.end?.targetEnd, { x: 1, y: 0, z: 0 });
    assert.match(nativeProof.agentSurface.compactVoxelPlacement.start?.readoutHash ?? '', /^studio-voxel-compact-edit-placement-/);
    assert.match(nativeProof.agentSurface.compactVoxelPlacement.end?.readoutHash ?? '', /^studio-voxel-compact-edit-placement-/);
    assert.equal(nativeProof.agentSurface.voxelHistory?.runtimeAttached, true);
    assert.match(nativeProof.agentSurface.voxelHistory?.readoutHash ?? '', /^studio-voxel-history-panel-/);
    assert.ok(nativeProof.agentSurface.voxelHistory?.nonClaims.includes('not_studio_authoritative_undo_stack'));
    if (nativeProof.agentSurface.voxelHistory?.status === 'rejected') {
      assert.match(nativeProof.agentSurface.voxelHistory.diagnostic ?? '', /read_voxel_edit_history|readVoxelEditHistory|unimplemented/i);
    }
    assert.equal(nativeProof.agentSurface.transcriptReplay?.artifactKind, 'studio_agent_voxel_operation_transcript_replay');
    assert.equal(nativeProof.agentSurface.transcriptReplay?.artifactVersion, 'studio-agent-voxel-operation-transcript-replay.v0');
    assert.equal(
      nativeProof.agentSurface.transcriptReplay?.accepted,
      true,
      JSON.stringify(nativeProof.agentSurface.transcriptReplay, null, 2),
    );
    assert.equal(nativeProof.agentSurface.transcriptReplay?.replayed, true);
    assert.equal(nativeProof.agentSurface.transcriptReplay?.operationCount, 2);
    assert.equal(nativeProof.agentSurface.transcriptReplay?.acceptedOperationCount, 2);
    assert.deepEqual(
      nativeProof.agentSurface.transcriptReplay?.operations.map(operation => operation.kind),
      ['configure_conversion', 'submit_compact_voxel_edit'],
    );
    assert.ok(nativeProof.agentSurface.transcriptReplay?.operations.every(operation => operation.expectationMatched));
    assert.ok(nativeProof.agentSurface.transcriptReplay?.nonClaims.includes('not_vforge_file'));
    assert.ok(nativeProof.agentSurface.transcriptReplay?.nonClaims.includes('not_raw_runtime_bridge_dispatch'));
    assert.match(nativeProof.agentSurface.transcriptReplay?.receiptHash ?? '', /^studio-agent-voxel-operation-transcript-replay-/);
    assert.deepEqual(nativeProof.agentSurface.operationStatuses, [
      'register_conversion_source.facade:true',
      'register_conversion_mesh_asset.facade:true',
      'reject_conversion_source.facade:true',
      'inspect:true',
      'view_from_angle.isometric:true',
      'configure_conversion:true',
      'run_conversion.plan:true',
      'run_conversion.preview:true',
      'run_conversion.apply:true',
      'run_conversion.export_evidence:true',
      'publish_preview:true',
      'get_model_info:true',
      'export_voxel_volume_asset.converted:true',
      'save_voxel_volume_asset.converted:true',
      'load_voxel_volume_asset.converted:true',
      'persist_voxel_asset.converted:true',
      'reopen_voxel_asset.converted:true',
      'get_model_info.missing:false',
      'submit_compact_voxel_edit.set_voxels:true',
      'persist_voxel_asset.authored:true',
      'reopen_voxel_asset.authored:true',
      'submit_compact_voxel_edit.set_voxels_runs:true',
      'submit_compact_voxel_edit.fill_box:true',
      'submit_compact_voxel_edit.apply_voxel_primitives:true',
      'transcript_replay:true',
      'submit_compact_voxel_edit.fill_box_oversized:false',
    ], JSON.stringify(nativeProof.agentSurface.operationDiagnostics, null, 2));
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
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.converted?.assetId, 'voxel-volume/generated');
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.converted?.mediaType, 'application/vnd.asha.voxel-volume+json;version=1');
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.converted?.schemaVersion, 1);
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.converted?.voxelCount, 3);
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.converted?.boundsLabel, '[0,0,0] to [7,7,0]');
    assert.match(nativeProof.agentSurface.voxelAssetPersistence.converted?.canonicalJsonHash ?? '', /^fnv1a64:/);
    assert.match(nativeProof.agentSurface.voxelAssetPersistence.converted?.voxelDataHash ?? '', /^fnv1a64:/);
    assert.deepEqual(nativeProof.agentSurface.voxelAssetPersistence.converted?.validationDiagnosticCodes, []);
    assert.ok(nativeProof.agentSurface.voxelAssetPersistence.converted?.nonClaims.includes('not_vforge_file'));
    assert.ok(nativeProof.agentSurface.voxelAssetPersistence.converted?.nonClaims.includes('not_engine_validation'));
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.convertedReopen?.roundTripMatches, true);
    assert.equal(
      nativeProof.agentSurface.voxelAssetPersistence.convertedReopen?.reopenedHash,
      nativeProof.agentSurface.voxelAssetPersistence.converted?.canonicalJsonHash,
    );
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.authored?.assetId, 'voxel-volume/agent-authored-edit');
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.authored?.mediaType, 'application/vnd.asha.voxel-volume+json;version=1');
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.authored?.schemaVersion, 1);
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.authored?.voxelCount, 2);
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.authored?.boundsLabel, '[0,0,0] to [1,0,0]');
    assert.match(nativeProof.agentSurface.voxelAssetPersistence.authored?.canonicalJsonHash ?? '', /^fnv1a64:/);
    assert.match(nativeProof.agentSurface.voxelAssetPersistence.authored?.voxelDataHash ?? '', /^fnv1a64:/);
    assert.deepEqual(nativeProof.agentSurface.voxelAssetPersistence.authored?.validationDiagnosticCodes, []);
    assert.equal(nativeProof.agentSurface.voxelAssetPersistence.authoredReopen?.roundTripMatches, true);
    assert.equal(
      nativeProof.agentSurface.voxelAssetPersistence.authoredReopen?.reopenedHash,
      nativeProof.agentSurface.voxelAssetPersistence.authored?.canonicalJsonHash,
    );
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
    assert.deepEqual(nativeProof.nativeSmoke.commandCountsAfterAcceptedVoxelEdits, { accepted: 16, rejected: 0 });
    assert.deepEqual(nativeProof.nativeSmoke.commandCountsAfterRejectedVoxelEdit, { accepted: 16, rejected: 1 });
    assert.deepEqual(nativeProof.nativeSmoke.sourceRegistration, {
      registered: true,
      meshAssetRegistered: true,
      rejectedUnsupported: true,
      sourceAssetId: 'mesh.demo-cube',
      meshAssetId: 'mesh.demo-cube',
      materialSlotCount: 1,
      meshAssetMaterialSlotCount: 1,
    });
    assert.equal(nativeProof.nativeSmoke.conversion.outputVoxelCount, 3);
    assert.equal(nativeProof.nativeSmoke.conversion.outputBoundsLabel, '[0,0,0] to [7,7,0]');
    assert.deepEqual(nativeProof.nativeSmoke.conversion.materialRows, [
      {
        sourceMaterialSlot: 0,
        sourceMaterialId: 'material/demo-copper',
        voxelMaterial: 1,
        samplingStatus: 'flat_material',
        textureAssetId: null,
        textureContentHash: null,
        uvAttributeName: null,
        uvAttributeHash: null,
        sampleUv: null,
        samplingPolicy: null,
        wrapPolicy: null,
        materialMode: null,
      },
    ]);
    assert.deepEqual(
      nativeProof.nativeSmoke.conversion.exportedEvidenceRefs.map(ref => ref.kind),
      ['plan', 'preview', 'apply_receipt'],
    );
    for (const ref of nativeProof.nativeSmoke.conversion.exportedEvidenceRefs) {
      assert.match(ref.uri, /^asha:\/\/voxel-conversion\//);
      assert.match(ref.contentHash, /^fnv1a64:/);
    }
    assert.deepEqual(nativeProof.nativeSmoke.conversion.exportedVolumeAsset, {
      exported: true,
      assetId: 'voxel-volume/generated',
      mediaType: 'application/vnd.asha.voxel-volume+json;version=1',
      schemaVersion: 1,
      voxelCount: 3,
      boundsLabel: '[0,0,0] to [7,7,0]',
      canonicalJsonHash: nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.canonicalJsonHash,
      voxelDataHash: nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.voxelDataHash,
      validationDiagnosticCodes: [],
      fullAssetPayload: true,
    });
    assert.match(nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.canonicalJsonHash ?? '', /^fnv1a64:/);
    assert.match(nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.voxelDataHash ?? '', /^fnv1a64:/);
    assert.deepEqual(nativeProof.nativeSmoke.conversion.savedVolumeAsset, {
      saved: true,
      assetId: 'voxel-volume/generated',
      projectBundle: 'asha-demo',
      assetPath: 'assets/voxels/generated.avxl.json',
      operation: 'create',
      previousCanonicalJsonHash: null,
      nextCanonicalJsonHash: nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.canonicalJsonHash,
      nextVoxelDataHash: nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.voxelDataHash,
      expectedCanonicalJsonHash: nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.canonicalJsonHash,
      expectedVoxelDataHash: nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.voxelDataHash,
      voxelCount: 3,
      materialCount: 1,
      provenanceCount: 4,
      validationDiagnosticCodes: [],
      fullAssetPayload: true,
    });
    assert.deepEqual(nativeProof.nativeSmoke.conversion.loadedVolumeAsset, {
      loaded: true,
      requestAssetId: 'voxel-volume/generated',
      modelId: nativeProof.nativeSmoke.conversion.loadedVolumeAsset?.modelId,
      volumeAssetId: 'voxel/generated',
      grid: 1,
      voxelCount: 3,
      materialCounts: [{ material: 1, voxelCount: 3 }],
      provenanceKinds: ['converted', 'converted', 'converted', 'runtime_export'],
      canonicalJsonHash: nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.canonicalJsonHash,
      voxelDataHash: nativeProof.nativeSmoke.conversion.exportedVolumeAsset?.voxelDataHash,
      sessionHash: nativeProof.nativeSmoke.conversion.loadedVolumeAsset?.sessionHash,
      replayHash: nativeProof.nativeSmoke.conversion.loadedVolumeAsset?.replayHash,
      validationDiagnosticCodes: [],
    });
    assert.match(nativeProof.nativeSmoke.conversion.loadedVolumeAsset?.modelId ?? '', /^voxel-model:/);
    assert.match(nativeProof.nativeSmoke.conversion.loadedVolumeAsset?.sessionHash ?? '', /^fnv1a64:/);
    assert.match(nativeProof.nativeSmoke.conversion.loadedVolumeAsset?.replayHash ?? '', /^fnv1a64:/);
    assert.equal(nativeProof.nativeSmoke.modelInfo.resident, true);
    assert.equal(nativeProof.nativeSmoke.modelInfo.volumeAssetId, 'voxel/generated');
    assert.equal(nativeProof.nativeSmoke.modelInfo.voxelCount, 3);
    assert.deepEqual(nativeProof.nativeSmoke.modelInfo.materialCounts, [
      { material: 1, voxelCount: 3 },
    ]);
    assert.equal(nativeProof.nativeSmoke.modelInfo.sourceAssetId, 'mesh.demo-cube');
    assert.match(nativeProof.nativeSmoke.modelInfo.modelId ?? '', /^voxel-model:/);
    assert.deepEqual(
      nativeProof.nativeSmoke.modelInfo.evidenceRefs.map(ref => ref.kind),
      ['plan', 'preview', 'apply_receipt'],
    );
    assert.deepEqual(nativeProof.nativeSmoke.modelInfo.diagnosticCodes, []);
    assert.equal(nativeProof.nativeSmoke.missingModelInfo.resident, false);
    assert.deepEqual(nativeProof.nativeSmoke.missingModelInfo.diagnosticCodes, ['voxel_conversion_unavailable']);

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
    const convertedVoxelAssetPath = join(outDir, 'converted-voxel-volume.avxl.json');
    const authoredVoxelAssetPath = join(outDir, 'authored-voxel-volume.avxl.json');
    const transcriptReplayReceiptPath = join(outDir, 'voxel-transcript-replay-receipt.json');
    assert.ok(nativeProof.agentSurface.previewPublication, 'preview publication was not produced');
    assert.ok(nativeProof.agentSurface.voxelAssetPersistence.converted, 'converted voxel asset was not produced');
    assert.ok(nativeProof.agentSurface.voxelAssetPersistence.authored, 'authored voxel asset was not produced');
    assert.ok(nativeProof.agentSurface.transcriptReplay, 'transcript replay receipt was not produced');
    const previewPublication = {
      ...nativeProof.agentSurface.previewPublication,
      artifactHash: sha256(nativeProof.agentSurface.previewPublication),
    };
    const convertedVoxelAsset = nativeProof.agentSurface.voxelAssetPersistence.converted;
    const authoredVoxelAsset = nativeProof.agentSurface.voxelAssetPersistence.authored;
    await writeFile(nativeDomPath, nativeDom);
    await writeFile(missingDomPath, missingDom);
    await writeFile(invalidDomPath, invalidDom);
    await writeFile(previewPublicationPath, `${JSON.stringify(previewPublication, null, 2)}\n`);
    await writeFile(convertedVoxelAssetPath, convertedVoxelAsset.serializedAsset);
    await writeFile(authoredVoxelAssetPath, authoredVoxelAsset.serializedAsset);
    await writeFile(transcriptReplayReceiptPath, `${JSON.stringify(nativeProof.agentSurface.transcriptReplay, null, 2)}\n`);
    const voxelAssetAuthorityValidation = await validateVoxelAssetsWithRustAuthority([
      convertedVoxelAssetPath,
      authoredVoxelAssetPath,
    ]);
    const convertedAuthorityValidation = voxelAssetAuthorityValidation.find(report => report.path === convertedVoxelAssetPath);
    const authoredAuthorityValidation = voxelAssetAuthorityValidation.find(report => report.path === authoredVoxelAssetPath);
    assert.ok(convertedAuthorityValidation, 'converted voxel asset authority validation missing');
    assert.ok(authoredAuthorityValidation, 'authored voxel asset authority validation missing');
    assert.equal(convertedAuthorityValidation.isValid, true, JSON.stringify(convertedAuthorityValidation, null, 2));
    assert.equal(authoredAuthorityValidation.isValid, true, JSON.stringify(authoredAuthorityValidation, null, 2));
    assert.deepEqual(convertedAuthorityValidation.diagnosticCodes, []);
    assert.deepEqual(authoredAuthorityValidation.diagnosticCodes, []);
    assert.equal(convertedAuthorityValidation.canonicalJsonHash, convertedVoxelAsset.canonicalJsonHash);
    assert.equal(convertedAuthorityValidation.voxelDataHash, convertedVoxelAsset.voxelDataHash);
    assert.equal(authoredAuthorityValidation.canonicalJsonHash, authoredVoxelAsset.canonicalJsonHash);
    assert.equal(authoredAuthorityValidation.voxelDataHash, authoredVoxelAsset.voxelDataHash);

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
      transcriptReplayArtifact: {
        path: relative(repoRoot, transcriptReplayReceiptPath),
        hash: sha256(nativeProof.agentSurface.transcriptReplay),
        receiptHash: nativeProof.agentSurface.transcriptReplay.receiptHash,
        operationCount: nativeProof.agentSurface.transcriptReplay.operationCount,
        acceptedOperationCount: nativeProof.agentSurface.transcriptReplay.acceptedOperationCount,
      },
      voxelAssetArtifacts: {
        converted: {
          path: relative(repoRoot, convertedVoxelAssetPath),
          hash: sha256Buffer(convertedVoxelAsset.serializedAsset),
          assetId: convertedVoxelAsset.assetId,
          canonicalJsonHash: convertedVoxelAsset.canonicalJsonHash,
          voxelDataHash: convertedVoxelAsset.voxelDataHash,
          reopenHash: nativeProof.agentSurface.voxelAssetPersistence.convertedReopen?.reopenedHash ?? null,
          authorityValidation: {
            ...convertedAuthorityValidation,
            path: relative(repoRoot, convertedAuthorityValidation.path),
          },
        },
        authored: {
          path: relative(repoRoot, authoredVoxelAssetPath),
          hash: sha256Buffer(authoredVoxelAsset.serializedAsset),
          assetId: authoredVoxelAsset.assetId,
          canonicalJsonHash: authoredVoxelAsset.canonicalJsonHash,
          voxelDataHash: authoredVoxelAsset.voxelDataHash,
          reopenHash: nativeProof.agentSurface.voxelAssetPersistence.authoredReopen?.reopenedHash ?? null,
          authorityValidation: {
            ...authoredAuthorityValidation,
            path: relative(repoRoot, authoredAuthorityValidation.path),
          },
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
        'studio_catalog_static_mesh_registered_through_runtime_session_facade',
        'voxel_conversion_plan_preview_apply_export_used_native_runtime_facade',
        'voxel_model_info_read_through_runtime_session_facade',
        'missing_voxel_model_info_failed_closed_through_runtime_session_facade',
        'view_from_angle_recorded_projection_camera_readout_without_screenshot_authority',
        'publish_preview_emitted_bounded_projection_evidence_artifact',
        'studio_agent_voxel_operation_transcript_replayed_with_deterministic_receipt',
        'persist_voxel_asset_emitted_asha_native_avxl_json_projection_artifacts',
        'svc_voxel_asset_validated_persisted_avxl_json_artifacts',
        'reopen_voxel_asset_verified_round_trip_hashes_without_runtime_authority_claims',
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
        'not_voxelforge_import_export_compatibility',
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
