#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ASHA_BROWSER_HOST_COMPATIBILITY_VERSION,
  ASHA_BROWSER_HOST_PROVIDER_GLOBAL,
  ASHA_BROWSER_HOST_PROVIDER_KIND,
  launchNativeBrowserHost,
} from '@asha/browser-host';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const engineRoot = resolve(repoRoot, '../asha-engine');
const staticRoot = join(repoRoot, 'dist/apps/studio-app/browser');
const outDir = join(repoRoot, 'artifacts/native-voxel-runtime-launch/latest');
const artifactPath = join(outDir, 'index.json');
const referenceMeshPath = '/home/stash/mesh-resources/kenney_retro-urban-kit/Models/GLB format/tree-small.glb';
const bindHost = '0.0.0.0';
const browserHost = '127.0.0.1';
const chromium = '/usr/bin/chromium';
const serveMode = process.argv.includes('--serve');

interface ReferenceMeshImport {
  readonly sourcePath: string;
  readonly sourceBytes: readonly number[];
}

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
  readonly browserHost: {
    readonly compatibilityVersion: string | null;
    readonly providerKind: string | null;
    readonly sessionId: string | null;
  };
  readonly rendererViewport: {
    readonly owner: string | null;
    readonly classification: string | null;
    readonly runtimeState: string | null;
    readonly evidenceStatus: string | null;
    readonly channelGenerations: Readonly<Record<string, number>>;
    readonly sceneDocumentHash: number | null;
    readonly materialPreviewClassification: string | null;
    readonly materialDiagnostics: readonly string[];
    readonly voxelSelectionOutcome: string | null;
    readonly bufferReleased: boolean | null;
    readonly cameraTickBeforeInput: number | null;
    readonly cameraTickAfterInput: number | null;
    readonly sceneCommandAccepted: boolean | null;
    readonly staleSceneCommandRejected: boolean | null;
    readonly degradedResourceStatus: string | null;
    readonly degradedResourceIsolated: boolean | null;
  };
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
      readonly lastAction: string | null;
      readonly runtimeAttached: boolean;
      readonly message: string;
      readonly diagnostic: string | null;
      readonly historyHash: string | null;
      readonly cursorHash: string | null;
      readonly entryCount: number;
      readonly retainedRedoCount: number;
      readonly diffStatus: string;
      readonly receiptMode: string | null;
      readonly receiptPreview: boolean | null;
      readonly receiptApplied: boolean | null;
      readonly diagnosticCodes: readonly string[];
      readonly readoutHash: string;
      readonly nonClaims: readonly string[];
      readonly entries: readonly { readonly transactionId: string; readonly cursorId: string }[];
    } | null;
    readonly voxelPalette: {
      readonly status: string;
      readonly displayName: string;
      readonly materialAssetId: string;
      readonly materialCatalogBindingId: string;
      readonly rejectedDiagnostics: readonly string[];
      readonly diagnostics: readonly string[];
      readonly assetCanonicalJsonHash: string | null;
    } | null;
    readonly voxelAnnotations: {
      readonly status: string;
      readonly runtimeLayerId: string | null;
      readonly expectedLayerHash: string | null;
      readonly queryMatchedRegionIds: readonly string[];
      readonly exportCanonicalJsonHash: string | null;
      readonly exportRegionIds: readonly string[];
      readonly partialRemovalSparseRuns: readonly { readonly start: { readonly x: number; readonly y: number; readonly z: number }; readonly length: number }[];
      readonly diagnostics: readonly string[];
      readonly readoutHash: string;
      readonly actions: readonly { readonly action: string; readonly accepted: boolean; readonly message: string }[];
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

interface BrowserSessionTeardownReceipt {
  readonly status: 'disconnected' | 'already_disconnected';
  readonly scope: 'browser_session';
  readonly browserSession: string;
  readonly released: number;
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

function providerScenarioPrelude(): string {
  return `
(() => {
  const mode = new URLSearchParams(location.hash.slice(1)).get('provider') || 'native';
  if (mode === 'missing') {
    delete globalThis.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL};
  } else if (mode === 'invalid') {
    globalThis.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL} = {
      kind: '${ASHA_BROWSER_HOST_PROVIDER_KIND}',
      backend: 'reference_bridge',
      productAuthority: false,
      referenceFallback: true,
      browserHostCompatibilityVersion: '${ASHA_BROWSER_HOST_COMPATIBILITY_VERSION}',
      browserHostSessionId: 'spoofed',
      createRuntimeBridge: () => ({}),
    };
  }
})();
`;
}

function automationPrelude(referenceMeshImport: ReferenceMeshImport): string {
  return `
(() => {
  const mode = new URLSearchParams(location.hash.slice(1)).get('provider') || 'native';
  const browserHostProvider = globalThis.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL};
  const referenceMeshImport = ${JSON.stringify(referenceMeshImport)};
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
    browserHost: {
      compatibilityVersion: typeof browserHostProvider?.browserHostCompatibilityVersion === 'string'
        ? browserHostProvider.browserHostCompatibilityVersion
        : null,
      providerKind: typeof browserHostProvider?.kind === 'string' ? browserHostProvider.kind : null,
      sessionId: typeof browserHostProvider?.browserHostSessionId === 'string'
        ? browserHostProvider.browserHostSessionId
        : null,
    },
    rendererViewport: {
      owner: null,
      classification: null,
      runtimeState: null,
      evidenceStatus: null,
      channelGenerations: {},
      sceneDocumentHash: null,
      materialPreviewClassification: null,
      materialDiagnostics: [],
      voxelSelectionOutcome: null,
      bufferReleased: null,
      cameraTickBeforeInput: null,
      cameraTickAfterInput: null,
      sceneCommandAccepted: null,
      staleSceneCommandRejected: null,
      degradedResourceStatus: null,
      degradedResourceIsolated: null,
    },
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
      voxelPalette: null,
      voxelAnnotations: null,
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
      () => globalThis.ashaStudioVoxelWorkflow?.kind === 'asha.studio.voxel_workflow.v1'
        ? globalThis.ashaStudioVoxelWorkflow
        : null,
      'Studio voxel workflow product API',
    );
  }

  function collect() {
    const runtimeText = text();
    const store = globalThis.ashaStudioVoxelWorkflow;
    const storeRuntimeMessage = store && typeof store.runtimeConnectionMessage === 'function'
      ? store.runtimeConnectionMessage()
      : '';
    proof.storeRuntimeMessage = storeRuntimeMessage;
    const diagnosticText = runtimeText + '\\n' + storeRuntimeMessage;
    proof.runtimeMessage = runtimeText.includes('Rust RuntimeSession attached') || storeRuntimeMessage.includes('Rust RuntimeSession attached')
      ? 'Rust RuntimeSession attached'
      : diagnosticText.includes('globalThis.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL}')
        ? diagnosticText.match(/globalThis\\.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL}[^\\n]*/)?.[0] || 'provider rejected'
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
    proof.rendererViewport.owner = document.querySelector('[data-renderer-owner]')?.getAttribute('data-renderer-owner') || null;
    proof.rendererViewport.classification = document.querySelector('[data-viewport-classification]')?.getAttribute('data-viewport-classification') || null;
    proof.rendererViewport.runtimeState = document.querySelector('[data-viewport-runtime]')?.getAttribute('data-viewport-runtime') || null;
    proof.rendererViewport.evidenceStatus = document.querySelector('[data-runtime-viewport-evidence-status]')?.getAttribute('data-runtime-viewport-evidence-status') || null;
    proof.rendererViewport.channelGenerations = Object.fromEntries(
      Array.from(document.querySelectorAll('[data-renderer-channel]')).map(row => [
        row.getAttribute('data-renderer-channel'),
        Number(row.getAttribute('data-renderer-channel-generation')),
      ]),
    );
    const resourceProbe = document.querySelector('[data-renderer-resource-probe-status]');
    proof.rendererViewport.degradedResourceStatus = resourceProbe?.getAttribute('data-renderer-resource-probe-status') || null;
    proof.rendererViewport.degradedResourceIsolated = resourceProbe === null
      ? null
      : resourceProbe.getAttribute('data-renderer-resource-probe-isolated') === 'true';
    const viewportEvidence = store && typeof store.runtimeViewportEvidence === 'function'
      ? store.runtimeViewportEvidence()
      : null;
    if (viewportEvidence) {
      proof.rendererViewport.sceneDocumentHash = viewportEvidence.scene?.documentHash ?? null;
      proof.rendererViewport.materialPreviewClassification = viewportEvidence.materialPreview?.rendererClassification ?? null;
      proof.rendererViewport.materialDiagnostics = viewportEvidence.materialPreview?.diagnostics ?? [];
      proof.rendererViewport.voxelSelectionOutcome = viewportEvidence.voxelSelection?.outcome ?? null;
      proof.rendererViewport.bufferReleased = viewportEvidence.bufferLifetime?.released ?? null;
    }
    proof.textSample = runtimeText.slice(0, 8000);
  }

  function storeShell() {
    const store = globalThis.ashaStudioVoxelWorkflow;
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
    const store = globalThis.ashaStudioVoxelWorkflow;
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
    const store = globalThis.ashaStudioVoxelWorkflow;
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
    const store = globalThis.ashaStudioVoxelWorkflow;
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
    const store = globalThis.ashaStudioVoxelWorkflow;
    const panel = store && typeof store.voxelHistoryPanel === 'function'
      ? store.voxelHistoryPanel()
      : null;
    if (!panel) {
      throw new Error('Voxel history panel readout unavailable');
    }
    return {
      status: panel.control.status,
      lastAction: panel.control.lastAction,
      runtimeAttached: panel.runtimeAttached,
      message: panel.control.message,
      diagnostic: panel.control.diagnostic,
      historyHash: panel.historyHash,
      cursorHash: panel.cursorHash,
      entryCount: panel.entryCount,
      retainedRedoCount: panel.retainedRedoCount,
      diffStatus: panel.diff.status,
      receiptMode: panel.receipt?.request.mode ?? null,
      receiptPreview: panel.receipt?.preview ?? null,
      receiptApplied: panel.receipt?.applied ?? null,
      diagnosticCodes: Array.isArray(panel.diagnostics)
        ? panel.diagnostics.map(diagnostic => diagnostic.code)
        : [],
      readoutHash: panel.readoutHash,
      nonClaims: panel.nonClaims,
      entries: panel.entries.map(entry => ({ transactionId: entry.transactionId, cursorId: entry.cursorId })),
    };
  }

  function runVoxelHistoryControl(action) {
    const store = globalThis.ashaStudioVoxelWorkflow;
    if (!store || typeof store.runVoxelHistoryControl !== 'function') {
      throw new Error('Voxel history store method unavailable');
    }
    store.runVoxelHistoryControl(action);
    return voxelHistoryPanelReadout();
  }

  function readVoxelHistoryPanel() {
    return runVoxelHistoryControl('read');
  }

  function previewVoxelHistoryRevert() {
    const store = globalThis.ashaStudioVoxelWorkflow;
    const panel = voxelHistoryPanelReadout();
    const target = panel.entries.at(-1);
    if (!store || typeof store.selectVoxelHistoryTarget !== 'function' || !target) {
      throw new Error('Voxel history replayable target unavailable');
    }
    store.selectVoxelHistoryTarget(target.transactionId);
    return runVoxelHistoryControl('preview_revert');
  }

  async function saveVoxelAssetForPaletteEditor() {
    const button = document.querySelector('[data-voxel-asset-action="save_volume"]');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing voxel asset save action');
    }
    const store = globalThis.ashaStudioVoxelWorkflow;
    if (!store || typeof store.voxelAssetWorkflowControl !== 'function') {
      throw new Error('Voxel asset workflow control readout unavailable');
    }
    button.click();
    return waitFor(() => {
      const control = store.voxelAssetWorkflowControl();
      return control.status === 'accepted' && control.lastAsset !== null ? control : null;
    }, 'voxel asset save for palette editor');
  }

  function voxelPaletteEditorReadout() {
    const store = globalThis.ashaStudioVoxelWorkflow;
    const editor = store && typeof store.voxelMaterialPaletteEditor === 'function'
      ? store.voxelMaterialPaletteEditor()
      : null;
    if (!editor) {
      throw new Error('Voxel palette editor readout unavailable');
    }
    return {
      status: editor.status,
      message: editor.message,
      selectedPaletteEntryId: editor.selectedPaletteEntryId,
      displayName: editor.displayName,
      materialAssetId: editor.materialAssetId,
      materialCatalogBindingId: editor.materialCatalogBindingId,
      diagnostics: editor.diagnostics,
      receipt: editor.receipt,
    };
  }

  function selectVoxelPaletteEntry(value) {
    const input = document.querySelector('[data-voxel-palette-control="selected_entry"]');
    if (!(input instanceof HTMLSelectElement)) {
      throw new Error('Missing voxel palette entry selector');
    }
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setVoxelPaletteField(name, value) {
    const input = document.querySelector('[data-voxel-palette-control="' + name + '"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Missing voxel palette input ' + name);
    }
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function submitVoxelPaletteUpdate() {
    const button = document.querySelector('[data-voxel-palette-action="update"]');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing voxel palette update action');
    }
    await waitFor(() => !button.disabled ? true : null, 'voxel palette update readiness');
    const before = voxelPaletteEditorReadout();
    button.click();
    return waitFor(() => {
      const editor = voxelPaletteEditorReadout();
      return editor.status !== 'idle' && editor.message !== before.message ? editor : null;
    }, 'voxel palette update');
  }

  function voxelAnnotationControlReadout() {
    const store = globalThis.ashaStudioVoxelWorkflow;
    const control = store && typeof store.voxelAnnotationControl === 'function'
      ? store.voxelAnnotationControl()
      : null;
    if (!control) {
      throw new Error('Voxel annotation control readout unavailable');
    }
    return {
      status: control.status,
      message: control.message,
      canSubmit: control.canSubmit,
      runtimeLayerId: control.runtimeLayerId,
      expectedLayerHash: control.expectedLayerHash,
      queryMatchedRegionIds: Array.isArray(control.query?.matchedRegions)
        ? control.query.matchedRegions.map(region => region.regionId)
        : [],
      exportCanonicalJsonHash: control.exportReceipt?.canonicalJsonHash ?? null,
      exportRegionIds: Array.isArray(control.exportReceipt?.layer?.regions)
        ? control.exportReceipt.layer.regions.map(region => region.regionId)
        : [],
      exportSelectionSparseRuns: Array.isArray(control.exportReceipt?.layer?.regions)
        ? control.exportReceipt.layer.regions.find(region => region.regionId === control.regionId)?.selection.sparseRuns ?? []
        : [],
      diagnostics: control.diagnostics,
      readoutHash: control.readoutHash,
    };
  }

  function setVoxelAnnotationControl(name, value) {
    const input = document.querySelector('[data-voxel-annotation-control="' + name + '"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Missing voxel annotation input ' + name);
    }
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function selectVoxelAnnotationControl(name, value) {
    const input = document.querySelector('[data-voxel-annotation-control="' + name + '"]');
    if (!(input instanceof HTMLSelectElement)) {
      throw new Error('Missing voxel annotation select ' + name);
    }
    input.value = String(value);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function submitVoxelAnnotationControl(action) {
    const button = document.querySelector('[data-voxel-annotation-action="' + action + '"]');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing voxel annotation action ' + action);
    }
    await waitFor(() => !button.disabled && voxelAnnotationControlReadout().canSubmit ? true : null, 'voxel annotation controls ready');
    const before = voxelAnnotationControlReadout();
    button.click();
    return waitFor(() => {
      const control = voxelAnnotationControlReadout();
      return control.status !== 'idle' && control.message !== before.message ? control : null;
    }, 'voxel annotation control ' + action);
  }

  function setViewportVoxelHit(coord, face) {
    const store = globalThis.ashaStudioVoxelWorkflow;
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
    const store = globalThis.ashaStudioVoxelWorkflow;
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
    const store = globalThis.ashaStudioVoxelWorkflow;
    const storeMessage = store && typeof store.runtimeConnectionMessage === 'function'
      ? store.runtimeConnectionMessage()
      : '';
    return (text() + '\\n' + storeMessage).includes('globalThis.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL}');
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
        await waitFor(
          () => typeof store.runtimeViewportEvidence === 'function'
            && store.runtimeViewportEvidence().camera
            && store.runtimeViewportEvidence().scene,
          'runtime viewport evidence',
        );
        await waitFor(
          () => document.querySelectorAll('[data-renderer-channel]').length === 3,
          'engine renderer-host channel readout',
        );
        document.querySelector('[data-renderer-resource-probe]')?.click();
        await waitFor(
          () => document.querySelector('[data-renderer-resource-probe-status="rejected_as_expected"]'),
          'isolated degraded renderer resource proof',
        );
        const viewportEvidenceBeforeInput = store.runtimeViewportEvidence();
        proof.rendererViewport.cameraTickBeforeInput = viewportEvidenceBeforeInput.camera?.tick ?? null;
        store.applyRuntimeViewportCameraInput('look', { deltaX: 12, deltaY: -4 });
        await waitFor(
          () => store.runtimeViewportEvidence().camera?.tick > viewportEvidenceBeforeInput.camera?.tick,
          'authoritative runtime camera input',
        );
        proof.rendererViewport.cameraTickAfterInput = store.runtimeViewportEvidence().camera?.tick ?? null;
        store.selectRuntimeVoxelAtViewport({ x: 640, y: 360, width: 1280, height: 720 });

        const sceneBeforeCommand = store.readRuntimeSceneObjectSnapshot();
        const sceneObject = sceneBeforeCommand?.objects?.[0];
        if (!sceneBeforeCommand || !sceneObject) {
          throw new Error('Runtime scene-object snapshot missing from public viewport evidence');
        }
        const acceptedSceneCommand = store.applyRuntimeSceneObjectCommand({
          expectedDocumentHash: sceneBeforeCommand.documentHash,
          command: {
            kind: 'rename',
            id: sceneObject.id,
            label: (sceneObject.label || 'Runtime object') + ' [Studio viewport proof]',
          },
        });
        const staleSceneCommand = store.applyRuntimeSceneObjectCommand({
          expectedDocumentHash: sceneBeforeCommand.documentHash,
          command: { kind: 'select', id: sceneObject.id },
        });
        proof.rendererViewport.sceneCommandAccepted = acceptedSceneCommand?.accepted === true;
        proof.rendererViewport.staleSceneCommandRejected = staleSceneCommand?.accepted === false
          && staleSceneCommand?.rejection?.code === 'stale-scene-object-snapshot';

        const referenceMeshImportResult = store.runAgentVoxelWorkflowOperation({
          kind: 'import_conversion_mesh_source',
          importRequest: {
            sourceAssetId: 'mesh/kenney-retro-tree-small',
            assetVersion: 1,
            sourcePath: referenceMeshImport.sourcePath,
            format: 'glb',
            sourceBytes: referenceMeshImport.sourceBytes,
            meshPrimitive: null,
          },
        });
        if (!referenceMeshImportResult.accepted || referenceMeshImportResult.meshSourceImport === null) {
          throw new Error('Reference mesh import failed: ' + referenceMeshImportResult.diagnostic);
        }
        const referenceConfigure = store.runAgentVoxelWorkflowOperation({
          kind: 'configure_conversion',
          patch: {
            sourceAssetId: 'mesh/kenney-retro-tree-small', mode: 'surface', fitPolicy: 'contain', originPolicy: 'target_min',
            resolution: [8, 8, 8], voxelSize: 0.25, maxOutputVoxels: 512, targetGrid: 2, targetVolumeAssetId: 'voxel/generated',
            targetOrigin: [0, 0, 0], meshPrimitive: null, materialSourceSlot: 0, materialSourceId: 'material/demo-copper', materialVoxelId: 1, defaultMaterial: '1',
          },
        });
        if (!referenceConfigure.accepted) throw new Error('Reference conversion configuration failed');
        for (const commandId of ['voxel_conversion.plan', 'voxel_conversion.preview', 'voxel_conversion.apply', 'voxel_conversion.export_evidence']) {
          await waitFor(() => acceptedAction(commandId), 'reference ' + commandId);
          const result = store.runAgentVoxelWorkflowOperation({ kind: 'run_conversion', commandId });
          if (!result.accepted) throw new Error('Reference ' + commandId + ' failed: ' + result.diagnostic);
        }
        const referenceInfo = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/generated', includeMaterialCounts: true } });
        const referenceWindowRequest = {
          grid: 2,
          volumeAssetId: 'voxel/generated',
          bounds: referenceInfo.modelInfo?.bounds ?? { min: { x: 0, y: 0, z: 0 }, max: { x: 7, y: 7, z: 7 } },
          includeEmpty: false,
          materialFilter: [],
          maxSamples: 512,
        };
        const referenceWindow = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_window', request: referenceWindowRequest });
        const referenceViewBeforeUnload = store.runAgentVoxelWorkflowOperation({
          kind: 'view_from_angle',
          view: { angle: 'isometric', target: 'scene' },
        });
        const referenceExport = store.runAgentVoxelWorkflowOperation({
          kind: 'export_voxel_volume_asset',
          exportRequest: { grid: 2, volumeAssetId: 'voxel/generated', targetAssetId: 'voxel-volume/reference-tree-small', label: 'Kenney retro urban small tree voxel volume', createdBy: 'codex-asha-studio', sourceTool: 'asha-studio', maxSparseRuns: 512, expectedSessionHash: referenceInfo.modelInfo?.sessionHash ?? null },
        });
        const referenceSave = store.runAgentVoxelWorkflowOperation({
          kind: 'save_voxel_volume_asset',
          saveRequest: {
            exportRequest: { grid: 2, volumeAssetId: 'voxel/generated', targetAssetId: 'voxel-volume/reference-tree-small', label: 'Kenney retro urban small tree voxel volume', createdBy: 'codex-asha-studio', sourceTool: 'asha-studio', maxSparseRuns: 512, expectedSessionHash: referenceInfo.modelInfo?.sessionHash ?? null },
            targetProjectBundle: 'asha-demo', targetAssetPath: 'assets/voxels/reference-tree-small.avxl.json', representationKind: 'sparse_runs', expectedExistingCanonicalJsonHash: null,
            expectedCanonicalJsonHash: referenceExport.voxelVolumeExport?.canonicalJsonHash ?? null, expectedVoxelDataHash: referenceExport.voxelVolumeExport?.voxelDataHash ?? null,
          },
        });
        const referenceFreshInfo = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/generated', includeMaterialCounts: true } });
        const referenceUnload = store.runAgentVoxelWorkflowOperation({ kind: 'unload_voxel_volume_asset', unloadRequest: { grid: 2, volumeAssetId: 'voxel/generated', expectedSessionHash: referenceFreshInfo.modelInfo?.sessionHash ?? '' } });
        const referenceAbsent = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/generated', includeMaterialCounts: true } });
        const referenceLoad = store.runAgentVoxelWorkflowOperation({ kind: 'load_voxel_volume_asset', loadRequest: { asset: referenceSave.voxelVolumeSave?.asset ?? referenceExport.voxelVolumeExport?.asset, targetGrid: 2, targetVolumeAssetId: 'voxel/generated', replaceExisting: true, includeMaterialCounts: true } });
        const referenceReloadInfo = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/generated', includeMaterialCounts: true } });
        const referenceReloadWindow = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_window', request: referenceWindowRequest });
        const referenceViewAfterReload = store.runAgentVoxelWorkflowOperation({
          kind: 'view_from_angle',
          view: { angle: 'isometric', target: 'scene' },
        });
        if (!referenceInfo.accepted || !referenceWindow.accepted || !referenceViewBeforeUnload.accepted || !referenceExport.accepted || !referenceSave.accepted || !referenceUnload.accepted || referenceAbsent.modelInfo?.resident !== false || !referenceLoad.accepted || !referenceReloadInfo.accepted || !referenceReloadWindow.accepted || !referenceViewAfterReload.accepted) {
          throw new Error('Reference save-clear-reload failed: ' + JSON.stringify({
            info: { accepted: referenceInfo.accepted, diagnostic: referenceInfo.diagnostic },
            window: { accepted: referenceWindow.accepted, diagnostic: referenceWindow.diagnostic },
            viewBeforeUnload: { accepted: referenceViewBeforeUnload.accepted, diagnostic: referenceViewBeforeUnload.diagnostic },
            export: { accepted: referenceExport.accepted, diagnostic: referenceExport.diagnostic },
            save: { accepted: referenceSave.accepted, diagnostic: referenceSave.diagnostic },
            unload: { accepted: referenceUnload.accepted, diagnostic: referenceUnload.diagnostic, codes: referenceUnload.voxelVolumeUnload?.diagnosticCodes },
            absent: { accepted: referenceAbsent.accepted, resident: referenceAbsent.modelInfo?.resident, diagnostic: referenceAbsent.diagnostic },
            load: { accepted: referenceLoad.accepted, diagnostic: referenceLoad.diagnostic },
            reloadInfo: { accepted: referenceReloadInfo.accepted, diagnostic: referenceReloadInfo.diagnostic },
            reloadWindow: { accepted: referenceReloadWindow.accepted, diagnostic: referenceReloadWindow.diagnostic },
            viewAfterReload: { accepted: referenceViewAfterReload.accepted, diagnostic: referenceViewAfterReload.diagnostic },
          }));
        }
        proof.nativeSmoke.northstarReference = {
          namedFeature: 'Kenney tree-small trunk and canopy envelope',
          source: referenceMeshImportResult.meshSourceImport,
          model: referenceInfo.modelInfo,
          occupancyBeforeUnload: referenceWindow.modelWindow,
          projectionBeforeUnload: referenceViewBeforeUnload.viewCapture,
          saved: referenceSave.voxelVolumeSave,
          unload: referenceUnload.voxelVolumeUnload,
          absent: referenceAbsent.modelInfo,
          reloaded: referenceLoad.voxelVolumeLoad,
          reloadedModel: referenceReloadInfo.modelInfo,
          occupancyAfterReload: referenceReloadWindow.modelWindow,
          projectionAfterReload: referenceViewAfterReload.viewCapture,
        };
        const referenceCleanupInfo = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/generated', includeMaterialCounts: true } });
        const referenceCleanup = store.runAgentVoxelWorkflowOperation({ kind: 'unload_voxel_volume_asset', unloadRequest: { grid: 2, volumeAssetId: 'voxel/generated', expectedSessionHash: referenceCleanupInfo.modelInfo?.sessionHash ?? '' } });
        if (!referenceCleanup.accepted) throw new Error('Reference cleanup failed: ' + referenceCleanup.diagnostic);
        const scratchInitialize = store.runAgentVoxelWorkflowOperation({
          kind: 'initialize_voxel_volume_authoring',
          initializeRequest: {
            grid: 2,
            volumeAssetId: 'voxel/complex-scratch',
            seedChunk: { x: 1, y: 0, z: 0 },
            materialPalette: [{ voxelMaterial: 1, paletteEntryId: 'voxel-material/demo-copper', displayName: 'Copper', materialAssetId: 'material/demo-copper', materialCatalogBindingId: 'catalog-binding/demo-copper' }],
            authoring: { label: 'Complex scratch-authored voxel volume', createdBy: 'codex-asha-studio', sourceTool: 'asha-studio' },
            maxMaterialBindings: 8,
          },
        });
        const scratchBlankInfo = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/complex-scratch', includeMaterialCounts: true } });
        const scratchEdit = store.runAgentVoxelWorkflowOperation({
          kind: 'submit_compact_voxel_edit',
          edit: { kind: 'apply_voxel_primitives', grid: 2, maxGeneratedVoxels: 64, primitives: [
            { kind: 'box', from: { x: 4, y: 0, z: 0 }, to: { x: 7, y: 3, z: 3 }, palette_index: 1, mode: 'shell' },
            { kind: 'line', from: { x: 5, y: 4, z: 1 }, to: { x: 5, y: 7, z: 1 }, palette_index: 1 },
            { kind: 'block', at: { x: 6, y: 5, z: 1 }, palette_index: 1 },
          ] },
        });
        const scratchInfo = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/complex-scratch', includeMaterialCounts: true } });
        const scratchWindowRequest = {
          grid: 2,
          volumeAssetId: 'voxel/complex-scratch',
          bounds: scratchInfo.modelInfo?.bounds ?? { min: { x: 4, y: 0, z: 0 }, max: { x: 7, y: 7, z: 3 } },
          includeEmpty: false,
          materialFilter: [],
          maxSamples: 512,
        };
        const scratchWindow = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_window', request: scratchWindowRequest });
        const scratchView = store.runAgentVoxelWorkflowOperation({ kind: 'view_from_angle', view: { angle: 'isometric', target: 'scene' } });
        const scratchExport = store.runAgentVoxelWorkflowOperation({
          kind: 'export_voxel_volume_asset',
          exportRequest: { grid: 2, volumeAssetId: 'voxel/complex-scratch', targetAssetId: 'voxel-volume/complex-scratch', label: 'Complex scratch-authored voxel volume', createdBy: 'codex-asha-studio', sourceTool: 'asha-studio', maxSparseRuns: 512, expectedSessionHash: scratchInfo.modelInfo?.sessionHash ?? null },
        });
        const scratchSave = store.runAgentVoxelWorkflowOperation({
          kind: 'save_voxel_volume_asset',
          saveRequest: {
            exportRequest: { grid: 2, volumeAssetId: 'voxel/complex-scratch', targetAssetId: 'voxel-volume/complex-scratch', label: 'Complex scratch-authored voxel volume', createdBy: 'codex-asha-studio', sourceTool: 'asha-studio', maxSparseRuns: 512, expectedSessionHash: scratchInfo.modelInfo?.sessionHash ?? null },
            targetProjectBundle: 'asha-demo', targetAssetPath: 'assets/voxels/complex-scratch.avxl.json', representationKind: 'sparse_runs', expectedExistingCanonicalJsonHash: null,
            expectedCanonicalJsonHash: scratchExport.voxelVolumeExport?.canonicalJsonHash ?? null, expectedVoxelDataHash: scratchExport.voxelVolumeExport?.voxelDataHash ?? null,
          },
        });
        const scratchFreshInfo = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/complex-scratch', includeMaterialCounts: true } });
        const scratchUnload = store.runAgentVoxelWorkflowOperation({ kind: 'unload_voxel_volume_asset', unloadRequest: { grid: 2, volumeAssetId: 'voxel/complex-scratch', expectedSessionHash: scratchFreshInfo.modelInfo?.sessionHash ?? '' } });
        const scratchAbsent = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/complex-scratch', includeMaterialCounts: true } });
        const scratchLoad = store.runAgentVoxelWorkflowOperation({ kind: 'load_voxel_volume_asset', loadRequest: { asset: scratchSave.voxelVolumeSave?.asset ?? scratchExport.voxelVolumeExport?.asset, targetGrid: 2, targetVolumeAssetId: 'voxel/complex-scratch', replaceExisting: true, includeMaterialCounts: true } });
        const scratchReloadInfo = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/complex-scratch', includeMaterialCounts: true } });
        const scratchReloadWindow = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_window', request: scratchWindowRequest });
        if (!scratchInitialize.accepted || !scratchBlankInfo.accepted || scratchBlankInfo.modelInfo?.voxelCount !== 0 || !scratchEdit.accepted || !scratchInfo.accepted || !scratchWindow.accepted || !scratchView.accepted || !scratchExport.accepted || !scratchSave.accepted || !scratchUnload.accepted || scratchAbsent.modelInfo?.resident !== false || !scratchLoad.accepted || !scratchReloadInfo.accepted || !scratchReloadWindow.accepted) {
          throw new Error('Complex scratch creation save-clear-reload failed: ' + JSON.stringify({
            initialize: { accepted: scratchInitialize.accepted, diagnostic: scratchInitialize.diagnostic },
            blank: { accepted: scratchBlankInfo.accepted, count: scratchBlankInfo.modelInfo?.voxelCount, diagnostic: scratchBlankInfo.diagnostic },
            edit: { accepted: scratchEdit.accepted, diagnostic: scratchEdit.diagnostic },
            info: { accepted: scratchInfo.accepted, diagnostic: scratchInfo.diagnostic },
            window: { accepted: scratchWindow.accepted, diagnostic: scratchWindow.diagnostic },
            export: { accepted: scratchExport.accepted, diagnostic: scratchExport.diagnostic },
            save: { accepted: scratchSave.accepted, diagnostic: scratchSave.diagnostic },
            unload: { accepted: scratchUnload.accepted, diagnostic: scratchUnload.diagnostic },
            absent: { resident: scratchAbsent.modelInfo?.resident, diagnostic: scratchAbsent.diagnostic },
            load: { accepted: scratchLoad.accepted, diagnostic: scratchLoad.diagnostic },
            reload: { accepted: scratchReloadInfo.accepted, diagnostic: scratchReloadInfo.diagnostic },
            reloadWindow: { accepted: scratchReloadWindow.accepted, diagnostic: scratchReloadWindow.diagnostic },
          }));
        }
        proof.nativeSmoke.northstarScratch = {
          initialized: scratchInitialize.voxelVolumeAuthoringInitialize,
          blank: scratchBlankInfo.modelInfo,
          generatedCommandCount: scratchEdit.compiledVoxelEditBatch?.commands.length ?? 0,
          acceptedCommandCount: scratchEdit.voxelEditReceipt?.result.accepted ?? 0,
          model: scratchInfo.modelInfo,
          occupancy: scratchWindow.modelWindow,
          projection: scratchView.viewCapture,
          saved: scratchSave.voxelVolumeSave,
          unload: scratchUnload.voxelVolumeUnload,
          absent: scratchAbsent.modelInfo,
          reloaded: scratchLoad.voxelVolumeLoad,
          reloadedModel: scratchReloadInfo.modelInfo,
          reloadedOccupancy: scratchReloadWindow.modelWindow,
        };
        const scratchCleanupInfo = store.runAgentVoxelWorkflowOperation({ kind: 'get_model_info', request: { grid: 2, volumeAssetId: 'voxel/complex-scratch', includeMaterialCounts: true } });
        const scratchCleanup = store.runAgentVoxelWorkflowOperation({ kind: 'unload_voxel_volume_asset', unloadRequest: { grid: 2, volumeAssetId: 'voxel/complex-scratch', expectedSessionHash: scratchCleanupInfo.modelInfo?.sessionHash ?? '' } });
        if (!scratchCleanup.accepted) throw new Error('Scratch cleanup failed: ' + scratchCleanup.diagnostic);
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
            targetGrid: 2,
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
            grid: 2,
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
            grid: 2,
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
              grid: 2,
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
        await saveVoxelAssetForPaletteEditor();
        await waitFor(() => document.querySelector('[data-voxel-palette-control="selected_entry"] option[value="voxel-material/demo-copper"]'), 'voxel palette option');
        selectVoxelPaletteEntry('voxel-material/demo-copper');
        await waitFor(() => voxelPaletteEditorReadout().selectedPaletteEntryId === 'voxel-material/demo-copper'
          ? voxelPaletteEditorReadout()
          : null, 'voxel palette selection');
        setVoxelPaletteField('material_asset_id', 'texture/not-a-material');
        const rejectedPaletteUpdate = await submitVoxelPaletteUpdate();
        if (rejectedPaletteUpdate.status !== 'rejected' || rejectedPaletteUpdate.diagnostics.length === 0) {
          throw new Error('Expected Rust palette validation diagnostics: ' + JSON.stringify(rejectedPaletteUpdate));
        }
        setVoxelPaletteField('material_asset_id', 'material/demo-copper');
        setVoxelPaletteField('display_name', 'Native copper palette');
        const paletteUpdate = await submitVoxelPaletteUpdate();
        proof.agentSurface.voxelPalette = {
          status: paletteUpdate.status,
          displayName: paletteUpdate.displayName,
          materialAssetId: paletteUpdate.materialAssetId,
          materialCatalogBindingId: paletteUpdate.materialCatalogBindingId,
          rejectedDiagnostics: rejectedPaletteUpdate.diagnostics,
          diagnostics: paletteUpdate.diagnostics,
          assetCanonicalJsonHash: paletteUpdate.receipt?.asset?.contentHashes.canonicalJson ?? null,
        };
        const loadedVolumeResult = store.runAgentVoxelWorkflowOperation({
          kind: 'load_voxel_volume_asset',
          loadRequest: {
            asset: savedVolumeResult.voxelVolumeSave && savedVolumeResult.voxelVolumeSave.asset
              ? savedVolumeResult.voxelVolumeSave.asset
              : exportedVolumeResult.voxelVolumeExport?.asset,
            targetGrid: 2,
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
        const annotationActions = [];
        const recordAnnotationAction = (action, control) => {
          annotationActions.push({ action, accepted: control.status === 'accepted', message: control.message });
          if (control.status !== 'accepted') {
            throw new Error('Voxel annotation ' + action + ' rejected: ' + control.message + ' ' + control.diagnostics.join(' · '));
          }
        };
        setVoxelAnnotationControl('x1', 0);
        setVoxelAnnotationControl('x2', 2);
        recordAnnotationAction('load', await submitVoxelAnnotationControl('load'));

        setVoxelAnnotationControl('region_id', 'region/studio-parent');
        setVoxelAnnotationControl('label', 'Studio volume group');
        setVoxelAnnotationControl('tags', 'studio,group');
        setVoxelAnnotationControl('x1', 1);
        setVoxelAnnotationControl('x2', 1);
        selectVoxelAnnotationControl('kind', 'custom');
        recordAnnotationAction('upsert_region', await submitVoxelAnnotationControl('upsert_region'));

        setVoxelAnnotationControl('region_id', 'region/studio-selection');
        setVoxelAnnotationControl('label', 'Studio selection edited');
        setVoxelAnnotationControl('tags', 'studio,proof');
        setVoxelAnnotationControl('parent_region_id', 'region/studio-parent');
        setVoxelAnnotationControl('x1', 0);
        setVoxelAnnotationControl('x2', 2);
        selectVoxelAnnotationControl('kind', 'room');
        recordAnnotationAction('set_label', await submitVoxelAnnotationControl('set_label'));
        recordAnnotationAction('set_kind', await submitVoxelAnnotationControl('set_kind'));
        recordAnnotationAction('set_tags', await submitVoxelAnnotationControl('set_tags'));
        recordAnnotationAction('set_parent', await submitVoxelAnnotationControl('set_parent'));

        setVoxelAnnotationControl('x1', 1);
        setVoxelAnnotationControl('x2', 1);
        recordAnnotationAction('remove_runs', await submitVoxelAnnotationControl('remove_runs'));
        const partialRemovalExport = await submitVoxelAnnotationControl('export');
        recordAnnotationAction('export_after_partial_removal', partialRemovalExport);
        recordAnnotationAction('add_runs', await submitVoxelAnnotationControl('add_runs'));
        setVoxelAnnotationControl('x1', 0);
        setVoxelAnnotationControl('x2', 1);
        recordAnnotationAction('replace_selection', await submitVoxelAnnotationControl('replace_selection'));
        setVoxelAnnotationControl('x2', 0);
        recordAnnotationAction('query_cell', await submitVoxelAnnotationControl('query_cell'));
        setVoxelAnnotationControl('x2', 1);
        const boundsQuery = await submitVoxelAnnotationControl('query_bounds');
        recordAnnotationAction('query_bounds', boundsQuery);
        const exportedAnnotation = await submitVoxelAnnotationControl('export');
        recordAnnotationAction('export', exportedAnnotation);
        proof.agentSurface.voxelAnnotations = {
          ...exportedAnnotation,
          queryMatchedRegionIds: boundsQuery.queryMatchedRegionIds,
          partialRemovalSparseRuns: partialRemovalExport.exportSelectionSparseRuns,
          actions: annotationActions,
        };
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
              grid: 2,
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
            grid: 2,
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
            grid: 2,
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
            grid: 2,
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
            grid: 2,
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
                  targetGrid: 2,
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
                  grid: 2,
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
            grid: 2,
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
              grid: 2,
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
              grid: 2,
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
        const voxelHistoryReadout = readVoxelHistoryPanel();
        if (voxelHistoryReadout.status === 'ready' && voxelHistoryReadout.entryCount > 0) {
          proof.agentSurface.voxelHistory = previewVoxelHistoryRevert();
        } else {
          proof.agentSurface.voxelHistory = voxelHistoryReadout;
        }
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

function injectBrowserHostScripts(
  indexHtml: string,
  launchMode: NativeVoxelLaunchMode,
  referenceMeshImport: ReferenceMeshImport,
): string {
  const scripts = [
    '<script src="/asha/browser-host/native-provider.js"></script>',
    `<script>${providerScenarioPrelude()}</script>`,
    ...(launchMode === 'proof' ? [`<script>${automationPrelude(referenceMeshImport)}</script>`] : []),
  ].join('\n');
  return indexHtml.replace('</head>', `${scripts}\n</head>`);
}

async function prepareBrowserHostUi(
  launchMode: NativeVoxelLaunchMode,
  referenceMeshImport: ReferenceMeshImport,
): Promise<{ readonly tempRoot: string; readonly uiRoot: string }> {
  const tempRoot = await mkdtemp(join(tmpdir(), 'asha-studio-browser-host-'));
  const uiRoot = join(tempRoot, 'ui');
  await cp(staticRoot, uiRoot, { recursive: true });
  const indexPath = join(uiRoot, 'index.html');
  const indexHtml = await readFile(indexPath, 'utf8');
  await writeFile(indexPath, injectBrowserHostScripts(indexHtml, launchMode, referenceMeshImport));
  return { tempRoot, uiRoot };
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
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--use-gl=angle',
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

async function confirmBrowserSessionTeardown(
  baseUrl: string,
  browserSession: string,
): Promise<BrowserSessionTeardownReceipt> {
  const response = await fetch(
    `${baseUrl}asha/browser-host/runtime-bridge/session/${browserSession}/disconnect`,
    { method: 'POST' },
  );
  assert.equal(response.status, 200);
  const receipt = await response.json() as BrowserSessionTeardownReceipt;
  assert.equal(receipt.scope, 'browser_session');
  assert.equal(receipt.browserSession, browserSession);
  assert.match(receipt.status, /^(?:disconnected|already_disconnected)$/u);
  return receipt;
}

function readProofFromDom(dom: string): BrowserProof {
  const markerPattern = new RegExp('<script id="asha-native-voxel-launch-proof" type="application/json">([^<]+)</script>');
  const match = dom.match(markerPattern);
  assert.ok(match, 'browser proof JSON marker was not written');
  return JSON.parse(match[1]) as BrowserProof;
}

async function main(): Promise<void> {
  await run('pnpm', ['exec', 'nx', 'build', 'studio-app', '--configuration=development'], repoRoot, 120000);
  const referenceMeshBytes = await readFile(referenceMeshPath);
  const referenceMeshImport: ReferenceMeshImport = {
    sourcePath: 'assets/reference/kenney-retro-urban-tree-small.glb',
    sourceBytes: [...referenceMeshBytes],
  };
  const preparedUi = await prepareBrowserHostUi(
    serveMode ? 'interactive' : 'proof',
    referenceMeshImport,
  );
  const launchServer = await launchNativeBrowserHost({
    uiRoot: preparedUi.uiRoot,
    host: bindHost,
    port: 0,
    healthProject: 'asha-studio',
  });
  const baseUrl = `${launchServer.url.replace(bindHost, browserHost)}/`;
  const providerStatusResponse = await fetch(`${baseUrl}asha/browser-host/runtime-provider.json`);
  assert.equal(providerStatusResponse.status, 200);
  const providerStatus = await providerStatusResponse.json() as typeof launchServer.provider;
  assert.equal(providerStatus.status, 'rust_authority');
  await mkdir(outDir, { recursive: true });

  try {
    if (serveMode) {
      console.log('ASHA Studio native voxel server is running.');
      console.log(`Open ${baseUrl}#provider=native`);
      console.log('Press Ctrl+C to stop.');
      await waitForShutdown();
      return;
    }

    const [nativeDom, isolatedNativeDom] = await Promise.all([
      runChromiumDump(`${baseUrl}#provider=native`),
      runChromiumDump(`${baseUrl}#provider=native`),
    ]);
    const nativeProof = readProofFromDom(nativeDom);
    const isolatedNativeProof = readProofFromDom(isolatedNativeDom);
    assert.equal(nativeProof.status, 'complete', JSON.stringify(nativeProof, null, 2));
    assert.equal(isolatedNativeProof.status, 'complete', JSON.stringify(isolatedNativeProof, null, 2));
    assert.deepEqual(nativeProof.browserHost, {
      compatibilityVersion: ASHA_BROWSER_HOST_COMPATIBILITY_VERSION,
      providerKind: ASHA_BROWSER_HOST_PROVIDER_KIND,
      sessionId: nativeProof.browserHost.sessionId,
    });
    assert.match(nativeProof.browserHost.sessionId ?? '', /^[A-Za-z0-9_-]{32}$/u);
    assert.match(isolatedNativeProof.browserHost.sessionId ?? '', /^[A-Za-z0-9_-]{32}$/u);
    assert.notEqual(nativeProof.browserHost.sessionId, isolatedNativeProof.browserHost.sessionId);
    assert.equal(nativeProof.rendererViewport.owner, 'asha-renderer-host');
    assert.equal(nativeProof.rendererViewport.classification, 'stored-authored-preview');
    assert.equal(nativeProof.rendererViewport.runtimeState, 'attached');
    assert.equal(nativeProof.rendererViewport.evidenceStatus, 'healthy');
    assert.ok((nativeProof.rendererViewport.channelGenerations.runtime ?? 0) >= 1);
    assert.ok((nativeProof.rendererViewport.channelGenerations.authored ?? 0) >= 1);
    assert.ok((nativeProof.rendererViewport.channelGenerations.overlay ?? 0) >= 1);
    assert.match(String(nativeProof.rendererViewport.sceneDocumentHash), /^[1-9][0-9]*$/u);
    assert.equal(nativeProof.rendererViewport.materialPreviewClassification, 'runtime_readback');
    assert.deepEqual(nativeProof.rendererViewport.materialDiagnostics, []);
    assert.match(nativeProof.rendererViewport.voxelSelectionOutcome ?? '', /^(?:hit|miss)$/u);
    assert.equal(nativeProof.rendererViewport.bufferReleased, true);
    assert.equal(nativeProof.rendererViewport.cameraTickBeforeInput, 0);
    assert.equal(nativeProof.rendererViewport.cameraTickAfterInput, 1);
    assert.equal(nativeProof.rendererViewport.sceneCommandAccepted, true);
    assert.equal(nativeProof.rendererViewport.staleSceneCommandRejected, true);
    assert.equal(nativeProof.rendererViewport.degradedResourceStatus, 'rejected_as_expected');
    assert.equal(nativeProof.rendererViewport.degradedResourceIsolated, true);
    const browserSessionTeardown = await Promise.all([
      confirmBrowserSessionTeardown(baseUrl, nativeProof.browserHost.sessionId ?? ''),
      confirmBrowserSessionTeardown(baseUrl, isolatedNativeProof.browserHost.sessionId ?? ''),
    ]);
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
    assert.equal(
      nativeProof.agentSurface.voxelHistory?.status,
      'accepted',
      JSON.stringify(nativeProof.agentSurface.voxelHistory, null, 2),
    );
    assert.equal(nativeProof.agentSurface.voxelHistory?.lastAction, 'preview_revert');
    assert.equal(nativeProof.agentSurface.voxelHistory?.receiptMode, 'preview_revert');
    assert.equal(nativeProof.agentSurface.voxelHistory?.receiptPreview, true);
    assert.equal(nativeProof.agentSurface.voxelHistory?.receiptApplied, false);
    assert.match(nativeProof.agentSurface.voxelHistory?.readoutHash ?? '', /^studio-voxel-history-panel-/);
    assert.ok(nativeProof.agentSurface.voxelHistory?.nonClaims.includes('not_studio_authoritative_undo_stack'));
    if (nativeProof.agentSurface.voxelHistory?.status === 'rejected') {
      assert.match(nativeProof.agentSurface.voxelHistory.diagnostic ?? '', /read_voxel_edit_history|readVoxelEditHistory|unimplemented/i);
    }
    assert.deepEqual(nativeProof.agentSurface.voxelPalette, {
      status: 'accepted',
      displayName: 'Native copper palette',
      materialAssetId: 'material/demo-copper',
      materialCatalogBindingId: 'catalog-binding/demo-copper',
      rejectedDiagnostics: nativeProof.agentSurface.voxelPalette?.rejectedDiagnostics ?? [],
      diagnostics: [],
      assetCanonicalJsonHash: nativeProof.agentSurface.voxelPalette?.assetCanonicalJsonHash ?? null,
    });
    assert.match(nativeProof.agentSurface.voxelPalette?.assetCanonicalJsonHash ?? '', /^fnv1a64:/);
    assert.ok(nativeProof.agentSurface.voxelPalette?.rejectedDiagnostics.length);
    assert.equal(nativeProof.agentSurface.voxelAnnotations?.status, 'accepted');
    assert.ok(nativeProof.agentSurface.voxelAnnotations?.runtimeLayerId);
    assert.match(nativeProof.agentSurface.voxelAnnotations?.expectedLayerHash ?? '', /^fnv1a64:/);
    assert.deepEqual(nativeProof.agentSurface.voxelAnnotations?.diagnostics, []);
    assert.match(nativeProof.agentSurface.voxelAnnotations?.readoutHash ?? '', /^studio-voxel-annotation-control-/);
    assert.deepEqual(
      nativeProof.agentSurface.voxelAnnotations?.actions.map(action => action.action),
      ['load', 'upsert_region', 'set_label', 'set_kind', 'set_tags', 'set_parent', 'remove_runs', 'export_after_partial_removal', 'add_runs', 'replace_selection', 'query_cell', 'query_bounds', 'export'],
    );
    assert.ok(nativeProof.agentSurface.voxelAnnotations?.actions.every(action => action.accepted));
    assert.deepEqual(nativeProof.agentSurface.voxelAnnotations?.partialRemovalSparseRuns, [
      { start: { x: 0, y: 0, z: 0 }, length: 1 },
      { start: { x: 2, y: 0, z: 0 }, length: 1 },
    ]);
    assert.deepEqual([...(nativeProof.agentSurface.voxelAnnotations?.queryMatchedRegionIds ?? [])].sort(), [
      'region/studio-parent',
      'region/studio-selection',
    ]);
    assert.match(nativeProof.agentSurface.voxelAnnotations?.exportCanonicalJsonHash ?? '', /^fnv1a64:/);
    assert.deepEqual([...(nativeProof.agentSurface.voxelAnnotations?.exportRegionIds ?? [])].sort(), [
      'region/studio-parent',
      'region/studio-selection',
    ]);
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
    assert.equal(nativeProof.agentSurface.viewCapture?.angle, 'isometric');
    assert.equal(nativeProof.agentSurface.viewCapture?.target, 'selected');
    assert.equal(nativeProof.agentSurface.viewCapture?.targetRenderableId, 'selected-voxel:0,0,0');
    assert.equal(nativeProof.agentSurface.viewCapture?.sessionId, 'session-preview-0001');
    assert.equal(nativeProof.agentSurface.viewCapture?.sceneHash, 'scene-view-57349d34');
    assert.match(nativeProof.agentSurface.viewCapture?.readbackMarker ?? '', /^session-preview-0001:scene-view-57349d34:\d+$/);
    assert.deepEqual(nativeProof.agentSurface.viewCapture?.nonClaims, [
      'not_runtime_authority',
      'not_hardware_gpu_capture',
      'not_voxelforge_viewer',
      'not_browser_screenshot',
    ]);
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
    const northstarReference = (nativeProof.nativeSmoke as unknown as {
      readonly northstarReference?: {
        readonly namedFeature: string;
        readonly source: {
          readonly sourceAssetId: string;
          readonly sourcePath: string;
          readonly sourceByteCount: number;
          readonly vertexCount: number;
          readonly triangleCount: number;
          readonly groupCount: number;
          readonly sourceBounds: { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] };
        };
        readonly model: {
          readonly voxelCount: number;
          readonly bounds: { readonly min: { readonly x: number; readonly y: number; readonly z: number }; readonly max: { readonly x: number; readonly y: number; readonly z: number } };
          readonly materialCounts: readonly { readonly material: number; readonly voxelCount: number }[];
        };
        readonly occupancyBeforeUnload: {
          readonly resident: boolean;
          readonly modelBounds: { readonly min: { readonly x: number; readonly y: number; readonly z: number }; readonly max: { readonly x: number; readonly y: number; readonly z: number } };
          readonly returnedSampleCount: number;
          readonly samples: readonly { readonly coord: { readonly x: number; readonly y: number; readonly z: number }; readonly occupied: boolean; readonly material: number | null }[];
        };
        readonly projectionBeforeUnload: { readonly angle: string; readonly target: string; readonly readbackMarker: string; readonly captureHash: string };
        readonly saved: { readonly voxelCount: number; readonly nextCanonicalJsonHash: string; readonly nextVoxelDataHash: string };
        readonly unload: { readonly unloaded: boolean; readonly removedVoxelCount: number };
        readonly absent: { readonly resident: boolean; readonly voxelCount: number };
        readonly reloaded: { readonly voxelCount: number; readonly canonicalJsonHash: string; readonly voxelDataHash: string };
        readonly reloadedModel: {
          readonly bounds: { readonly min: { readonly x: number; readonly y: number; readonly z: number }; readonly max: { readonly x: number; readonly y: number; readonly z: number } };
          readonly materialCounts: readonly { readonly material: number; readonly voxelCount: number }[];
        };
        readonly occupancyAfterReload: {
          readonly resident: boolean;
          readonly modelBounds: { readonly min: { readonly x: number; readonly y: number; readonly z: number }; readonly max: { readonly x: number; readonly y: number; readonly z: number } };
          readonly returnedSampleCount: number;
          readonly samples: readonly { readonly coord: { readonly x: number; readonly y: number; readonly z: number }; readonly occupied: boolean; readonly material: number | null }[];
        };
        readonly projectionAfterReload: { readonly angle: string; readonly target: string; readonly readbackMarker: string; readonly captureHash: string };
      };
    }).northstarReference;
    assert.ok(northstarReference);
    assert.equal(northstarReference.namedFeature, 'Kenney tree-small trunk and canopy envelope');
    assert.equal(northstarReference.source.sourceAssetId, 'mesh/kenney-retro-tree-small');
    assert.equal(northstarReference.source.sourcePath, 'assets/reference/kenney-retro-urban-tree-small.glb');
    assert.ok(northstarReference.source.sourceByteCount > 0);
    assert.ok(northstarReference.source.vertexCount > 0);
    assert.ok(northstarReference.source.triangleCount > 0);
    assert.ok(northstarReference.source.groupCount > 0);
    assert.ok(northstarReference.source.sourceBounds.max[1] > northstarReference.source.sourceBounds.min[1]);
    assert.ok(northstarReference.model.voxelCount > 8);
    assert.deepEqual(northstarReference.model.bounds.min, { x: 0, y: 0, z: 0 });
    assert.equal(northstarReference.model.bounds.max.x, 7);
    assert.equal(northstarReference.model.bounds.max.z, 7);
    assert.ok(northstarReference.model.bounds.max.y > 0 && northstarReference.model.bounds.max.y < northstarReference.model.bounds.max.x);
    assert.deepEqual(northstarReference.model.materialCounts, [{ material: 1, voxelCount: northstarReference.model.voxelCount }]);
    assert.equal(northstarReference.occupancyBeforeUnload.resident, true);
    assert.deepEqual(northstarReference.occupancyBeforeUnload.modelBounds, northstarReference.model.bounds);
    assert.ok(northstarReference.occupancyBeforeUnload.returnedSampleCount > 0);
    assert.ok(northstarReference.occupancyBeforeUnload.samples.every(sample => sample.occupied && sample.material === 1));
    assert.equal(northstarReference.projectionBeforeUnload.angle, 'isometric');
    assert.equal(northstarReference.projectionBeforeUnload.target, 'scene');
    assert.match(northstarReference.projectionBeforeUnload.readbackMarker, /^session-preview-0001:scene-view-57349d34:\d+$/);
    assert.match(northstarReference.projectionBeforeUnload.captureHash, /^studio-agent-voxel-view-capture-/);
    assert.equal(northstarReference.saved.voxelCount, northstarReference.model.voxelCount);
    assert.equal(northstarReference.unload.unloaded, true);
    assert.equal(northstarReference.unload.removedVoxelCount, northstarReference.model.voxelCount);
    assert.equal(northstarReference.absent.resident, false);
    assert.equal(northstarReference.absent.voxelCount, 0);
    assert.equal(northstarReference.reloaded.voxelCount, northstarReference.model.voxelCount);
    assert.equal(northstarReference.reloaded.canonicalJsonHash, northstarReference.saved.nextCanonicalJsonHash);
    assert.equal(northstarReference.reloaded.voxelDataHash, northstarReference.saved.nextVoxelDataHash);
    assert.deepEqual(northstarReference.reloadedModel.bounds, northstarReference.model.bounds);
    assert.deepEqual(northstarReference.reloadedModel.materialCounts, northstarReference.model.materialCounts);
    assert.equal(northstarReference.occupancyAfterReload.resident, true);
    assert.deepEqual(northstarReference.occupancyAfterReload.modelBounds, northstarReference.model.bounds);
    assert.deepEqual(northstarReference.occupancyAfterReload.samples, northstarReference.occupancyBeforeUnload.samples);
    assert.equal(northstarReference.projectionAfterReload.angle, 'isometric');
    assert.equal(northstarReference.projectionAfterReload.target, 'scene');
    assert.match(northstarReference.projectionAfterReload.readbackMarker, /^session-preview-0001:scene-view-57349d34:\d+$/);
    assert.match(northstarReference.projectionAfterReload.captureHash, /^studio-agent-voxel-view-capture-/);
    const northstarScratch = (nativeProof.nativeSmoke as unknown as {
      readonly northstarScratch?: {
        readonly initialized: { readonly initialized: boolean; readonly volumeAssetId: string; readonly diagnostics: readonly unknown[] };
        readonly blank: { readonly resident: boolean; readonly voxelCount: number; readonly source: { readonly assetKind: string } | null };
        readonly generatedCommandCount: number;
        readonly acceptedCommandCount: number;
        readonly model: {
          readonly voxelCount: number;
          readonly bounds: { readonly min: { readonly x: number; readonly y: number; readonly z: number }; readonly max: { readonly x: number; readonly y: number; readonly z: number } };
          readonly materialCounts: readonly { readonly material: number; readonly voxelCount: number }[];
          readonly source: { readonly assetKind: string } | null;
        };
        readonly occupancy: { readonly resident: boolean; readonly returnedSampleCount: number; readonly samples: readonly { readonly coord: { readonly x: number; readonly y: number; readonly z: number }; readonly occupied: boolean; readonly material: number | null }[] };
        readonly projection: { readonly angle: string; readonly target: string; readonly captureHash: string };
        readonly saved: { readonly voxelCount: number; readonly nextCanonicalJsonHash: string; readonly nextVoxelDataHash: string };
        readonly unload: { readonly unloaded: boolean; readonly removedVoxelCount: number };
        readonly absent: { readonly resident: boolean; readonly voxelCount: number };
        readonly reloaded: { readonly voxelCount: number; readonly canonicalJsonHash: string; readonly voxelDataHash: string };
        readonly reloadedModel: { readonly bounds: { readonly min: { readonly x: number; readonly y: number; readonly z: number }; readonly max: { readonly x: number; readonly y: number; readonly z: number } }; readonly materialCounts: readonly { readonly material: number; readonly voxelCount: number }[] };
        readonly reloadedOccupancy: { readonly resident: boolean; readonly returnedSampleCount: number; readonly samples: readonly { readonly coord: { readonly x: number; readonly y: number; readonly z: number }; readonly occupied: boolean; readonly material: number | null }[] };
      };
    }).northstarScratch;
    assert.ok(northstarScratch);
    assert.equal(northstarScratch.initialized.initialized, true);
    assert.equal(northstarScratch.initialized.volumeAssetId, 'voxel/complex-scratch');
    assert.deepEqual(northstarScratch.initialized.diagnostics, []);
    assert.equal(northstarScratch.blank.resident, true);
    assert.equal(northstarScratch.blank.voxelCount, 0);
    assert.equal(northstarScratch.blank.source?.assetKind, 'voxel_volume_authoring');
    assert.equal(northstarScratch.generatedCommandCount, 61);
    assert.equal(northstarScratch.acceptedCommandCount, 61);
    assert.equal(northstarScratch.model.source?.assetKind, 'voxel_volume_authoring');
    assert.equal(northstarScratch.model.voxelCount, 61);
    assert.deepEqual(northstarScratch.model.bounds, { min: { x: 4, y: 0, z: 0 }, max: { x: 7, y: 7, z: 3 } });
    assert.deepEqual(northstarScratch.model.materialCounts, [{ material: 1, voxelCount: 61 }]);
    assert.equal(northstarScratch.occupancy.resident, true);
    assert.equal(northstarScratch.occupancy.returnedSampleCount, 61);
    assert.ok(northstarScratch.occupancy.samples.every(sample => sample.occupied && sample.material === 1));
    assert.ok(northstarScratch.occupancy.samples.some(sample => sample.coord.x === 5 && sample.coord.y === 7 && sample.coord.z === 1));
    assert.ok(northstarScratch.occupancy.samples.some(sample => sample.coord.x === 6 && sample.coord.y === 5 && sample.coord.z === 1));
    assert.equal(northstarScratch.projection.angle, 'isometric');
    assert.equal(northstarScratch.projection.target, 'scene');
    assert.match(northstarScratch.projection.captureHash, /^studio-agent-voxel-view-capture-/);
    assert.equal(northstarScratch.saved.voxelCount, 61);
    assert.equal(northstarScratch.unload.unloaded, true);
    assert.equal(northstarScratch.unload.removedVoxelCount, 61);
    assert.equal(northstarScratch.absent.resident, false);
    assert.equal(northstarScratch.absent.voxelCount, 0);
    assert.equal(northstarScratch.reloaded.voxelCount, 61);
    assert.equal(northstarScratch.reloaded.canonicalJsonHash, northstarScratch.saved.nextCanonicalJsonHash);
    assert.equal(northstarScratch.reloaded.voxelDataHash, northstarScratch.saved.nextVoxelDataHash);
    assert.deepEqual(northstarScratch.reloadedModel.bounds, northstarScratch.model.bounds);
    assert.deepEqual(northstarScratch.reloadedModel.materialCounts, northstarScratch.model.materialCounts);
    assert.equal(northstarScratch.reloadedOccupancy.resident, true);
    assert.equal(northstarScratch.reloadedOccupancy.returnedSampleCount, 61);
    assert.deepEqual(northstarScratch.reloadedOccupancy.samples, northstarScratch.occupancy.samples);
    assert.deepEqual(nativeProof.nativeSmoke.commandCountsBeforeVoxelEdits, { accepted: 61, rejected: 0 });
    assert.deepEqual(nativeProof.nativeSmoke.commandCountsAfterAcceptedVoxelEdits, { accepted: 77, rejected: 0 });
    assert.deepEqual(nativeProof.nativeSmoke.commandCountsAfterRejectedVoxelEdit, { accepted: 77, rejected: 1 });
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
      grid: 2,
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

    const missingDom = await runChromiumDump(`${baseUrl}#provider=missing`);
    const missingProof = readProofFromDom(missingDom);
    assert.equal(missingProof.status, 'failed_closed', JSON.stringify(missingProof, null, 2));
    assert.match(missingProof.runtimeMessage, /globalThis\.ashaRuntimeBridge/);
    assert.equal(missingProof.rendererViewport.owner, 'asha-renderer-host');
    assert.equal(missingProof.rendererViewport.runtimeState, 'missing');
    assert.equal(missingProof.rendererViewport.evidenceStatus, 'missing_runtime');
    assert.equal(missingProof.rendererViewport.channelGenerations.runtime, 0);
    assert.equal(missingProof.rendererViewport.channelGenerations.authored, 1);
    assert.equal(missingProof.rendererViewport.channelGenerations.overlay, 1);

    const invalidDom = await runChromiumDump(`${baseUrl}#provider=invalid`);
    const invalidProof = readProofFromDom(invalidDom);
    assert.equal(invalidProof.status, 'failed_closed', JSON.stringify(invalidProof, null, 2));
    assert.match(invalidProof.runtimeMessage, /globalThis\.ashaRuntimeBridge/);
    assert.equal(invalidProof.rendererViewport.runtimeState, 'missing');
    assert.equal(invalidProof.rendererViewport.evidenceStatus, 'missing_runtime');

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
      artifactVersion: 'studio-native-voxel-runtime-launch-proof.v1',
      generatedAt: 'deterministic-as-structure-only',
      command: 'pnpm run evidence -- native-voxel-runtime-launch',
      launch: {
        bindHost,
        browserUrl: baseUrl,
        staticRoot: relative(repoRoot, staticRoot),
        providerContract: ASHA_BROWSER_HOST_PROVIDER_KIND,
        browserHostCompatibilityVersion: ASHA_BROWSER_HOST_COMPATIBILITY_VERSION,
        backend: 'native_rust',
        productAuthority: true,
        referenceFallback: false,
      },
      browserHost: {
        kind: launchServer.kind,
        compatibilityVersion: launchServer.compatibilityVersion,
        providerStatus,
        browserSessionTeardown,
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
        isolatedNativeProvider: isolatedNativeProof,
        missingProvider: missingProof,
        invalidProvider: invalidProof,
      },
      validations: [
        'studio_app_built_and_served_by_public_launchNativeBrowserHost',
        'standard_browser_host_provider_status_reported_rust_authority',
        'simultaneous_browser_sessions_received_isolated_one_cell_runtime_bridges',
        'browser_close_or_explicit_teardown_released_both_native_sessions',
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
        'not_studio_private_rpc_transport',
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
    try {
      await launchServer.close();
    } finally {
      await rm(preparedUi.tempRoot, { recursive: true, force: true });
    }
  }
}

await main();
