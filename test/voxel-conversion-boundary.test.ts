import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  STUDIO_VOXEL_CONVERSION_OPERATION_BOUNDARIES,
  buildStudioVoxelConversionApplyProposal,
  buildStudioVoxelConversionBoundaryReadout,
  buildStudioVoxelConversionEvidenceExportProposal,
  buildStudioVoxelConversionPlanProposal,
  buildStudioVoxelConversionPreviewProposal,
  buildStudioVoxelConversionReadoutModel,
  buildStudioVoxelConversionWorkspaceReadModel,
} from '@asha-studio/voxel-conversion';
import {
  buildStudioAgentVoxelAssetPersistenceReadModel,
  buildStudioAgentVoxelAssetReopenReadModel,
  buildStudioAgentCompactVoxelEditBatch,
  buildStudioAgentVoxelPreviewPublicationReadModel,
  buildStudioAgentVoxelViewCaptureReadModel,
  buildStudioVoxelMaterialAuthoringReadModel,
  buildStudioVoxelConversionWorkspaceShellForInputs,
  parseStudioAgentVoxelOperationTranscript,
  type StudioVoxelConversionSettingsDraft,
} from '@asha-studio/store';
import {
  buildInitialWorkspaceReadModel,
  buildStudioPreferencesReadModel,
  buildStudioViewportAdapterReadModel,
  buildStudioViewportToolReadModel,
  type StudioAssetInventoryEntryReadModel,
} from '@asha-studio/domain';
import type {
  VoxelConversionEvidenceRef,
  VoxelConversionPlan,
  VoxelConversionPreview,
  VoxelConversionReceipt,
  VoxelConversionSettings,
  VoxelConversionSourceRef,
  VoxelConversionTargetRef,
} from '@asha/contracts';
import type { RuntimeSessionFacade } from '@asha/runtime-session';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const boundaryScript = join(repoRoot, 'scripts/check-boundaries.mjs');
const phase4FixturePath = join(repoRoot, 'fixtures/voxel-conversion/phase4-cases.json');
const phase4GoldenPath = join(repoRoot, 'test/fixtures/studio-voxel-conversion-phase4-cases.golden.json');
const phase4ProductProofPath = join(repoRoot, 'artifacts/voxel-conversion-phase4-product-proof/latest/index.json');
const phase4ComparisonPath = join(repoRoot, 'artifacts/voxel-conversion-phase4-product-proof/latest/compare.json');
const phase4ComparisonMarkdownPath = join(repoRoot, 'artifacts/voxel-conversion-phase4-product-proof/latest/compare.md');
const publicSurfaceManifest = JSON.parse(
  readFileSync(join(repoRoot, '../asha-engine/harness/public-surface/ts-packages.json'), 'utf8'),
);
const ashaSourceRoot = ['', 'home', 'dev', 'asha'].join('/');
const ashaEngineRoot = [ashaSourceRoot, 'engine-rs'].join('/');
const engineCrateFragment = ['engine-rs', 'crates'].join('/');
const generatedSourceFragment = ['src', 'generated'].join('/');
const voxelforgeRoot = ['', 'home', 'dev', 'voxelforge'].join('/');
const mcpWrapperText = ['VoxelConversion', 'McpCommand'].join('');
const successorMcpText = ['successor', 'mcp', 'command'].join('_');

function runBoundaryCheck(workspaceRoot: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [boundaryScript], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });
}

function writeProbeWorkspace(importSpecifier: string): string {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'asha-studio-boundary-'));
  mkdirSync(join(workspaceRoot, 'libs/probe/src'), { recursive: true });
  mkdirSync(join(workspaceRoot, 'harness/public-surface'), { recursive: true });
  writeFileSync(
    join(workspaceRoot, 'package.json'),
    JSON.stringify({
      type: 'module',
      dependencies: {
        '@asha/contracts': 'link:../asha-engine/ts/packages/contracts',
        '@asha/runtime-bridge': 'link:../asha-engine/ts/packages/runtime-bridge',
        '@asha/command-registry': 'link:../asha-engine/ts/packages/command-registry',
      },
    }),
  );
  writeFileSync(
    join(workspaceRoot, 'boundary-policy.json'),
    JSON.stringify({
      consumerRole: 'asha-studio',
      publicSurfaceManifest: 'harness/public-surface/ts-packages.json',
      allowedLocalPackageLinks: {
        '@asha/contracts': 'link:../asha-engine/ts/packages/contracts',
        '@asha/runtime-bridge': 'link:../asha-engine/ts/packages/runtime-bridge',
        '@asha/command-registry': 'link:../asha-engine/ts/packages/command-registry',
      },
      requiredLocalPackageLinks: {
        '@asha/contracts': 'link:../asha-engine/ts/packages/contracts',
        '@asha/runtime-bridge': 'link:../asha-engine/ts/packages/runtime-bridge',
        '@asha/command-registry': 'link:../asha-engine/ts/packages/command-registry',
      },
      forbiddenPackages: [
        ['@asha', 'native-bridge'].join('/'),
        ['@asha', 'wasm-replay-bridge'].join('/'),
      ],
      forbiddenImportSpecifiers: [
        ['@asha', 'native-bridge'].join('/'),
        ['@asha', 'wasm-replay-bridge'].join('/'),
        'voxelforge',
      ],
      forbiddenImportPatterns: [
        ['@asha', '*', 'src', '*'].join('/'),
        ['@asha', '*', 'dist', 'generated', '*'].join('/'),
        ['..', 'asha', 'engine-rs', '*'].join('/'),
        [ashaEngineRoot, '*'].join('/'),
        ['..', 'voxelforge', '*'].join('/'),
        [voxelforgeRoot, '*'].join('/'),
        ['voxelforge', '*'].join('/'),
        ['@voxelforge', '*'].join('/'),
      ],
      forbiddenText: [
        ashaEngineRoot,
        engineCrateFragment,
        generatedSourceFragment,
        mcpWrapperText,
        successorMcpText,
      ],
      dependencySections: [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
        'pnpm.overrides',
        'overrides',
        'resolutions',
      ],
      forbiddenConfigPathFragments: [
        ['..', 'asha-engine', 'ts', 'packages'].join('/'),
        ['..', 'asha', 'engine-rs'].join('/'),
        ashaEngineRoot,
      ],
      allowedConfigPathFiles: [
        'package.json',
        'pnpm-lock.yaml',
        'boundary-policy.json',
      ],
      docsOnlyFiles: [],
    }),
  );
  writeFileSync(
    join(workspaceRoot, 'harness/public-surface/ts-packages.json'),
    JSON.stringify(publicSurfaceManifest),
  );
  writeFileSync(
    join(workspaceRoot, 'libs/probe/src/index.ts'),
    `import { probe } from '${importSpecifier}';\nexport const value = probe;\n`,
  );
  return workspaceRoot;
}

function sampleSource(overrides: Partial<VoxelConversionSourceRef> = {}): VoxelConversionSourceRef {
  return {
    assetId: 'mesh.preview-cube',
    assetKind: 'static_mesh',
    assetVersion: 1,
    sourceHash: 'sha256:source-v1',
    meshPrimitive: 'primitive-0',
    ...overrides,
  };
}

function sampleTarget(overrides: Partial<VoxelConversionTargetRef> = {}): VoxelConversionTargetRef {
  return {
    grid: 1,
    volumeAssetId: 'volume.preview-cube',
    origin: { x: 0, y: 0, z: 0 },
    ...overrides,
  };
}

function sampleSettings(overrides: Partial<VoxelConversionSettings> = {}): VoxelConversionSettings {
  return {
    mode: 'solid',
    fitPolicy: 'contain',
    originPolicy: 'target_min',
    resolution: [8, 8, 8],
    voxelSize: 0.25,
    maxOutputVoxels: 1024,
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    materialMap: {
      defaultVoxelMaterial: 1,
      textureAssets: [],
      textureBindings: [],
      entries: [
        {
          sourceMaterialSlot: 0,
          sourceMaterialId: 'material.copper',
          voxelMaterial: 1,
        },
      ],
    },
    ...overrides,
  };
}

function sampleEvidence(kind: VoxelConversionEvidenceRef['kind']): VoxelConversionEvidenceRef {
  return {
    kind,
    uri: `asha://voxel-conversion/${kind}`,
    contentHash: `sha256:${kind}`,
  };
}

function samplePlan(
  source: VoxelConversionSourceRef = sampleSource(),
  settings: VoxelConversionSettings = sampleSettings(),
): VoxelConversionPlan {
  return {
    planId: 'plan-preview-cube',
    source,
    target: sampleTarget(),
    settings,
    authorityVersion: 'voxel-conversion-authority.v0',
    expectedSourceHash: source.sourceHash,
    settingsHash: 'sha256:settings',
    planHash: 'sha256:plan',
    estimatedOutputVoxels: 512,
    estimatedBounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 7, y: 7, z: 7 },
    },
    diagnostics: [],
    evidence: [sampleEvidence('plan')],
  };
}

function samplePreview(plan: VoxelConversionPlan = samplePlan()): VoxelConversionPreview {
  return {
    planId: plan.planId,
    outputHash: 'sha256:preview-output',
    outputVoxelCount: 512,
    outputBounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 7, y: 7, z: 7 },
    },
    sampleVoxels: [
      {
        coord: { x: 0, y: 0, z: 0 },
        material: 1,
      },
    ],
    diagnostics: [],
    evidence: [sampleEvidence('preview')],
  };
}

function sampleReceipt(plan: VoxelConversionPlan = samplePlan()): VoxelConversionReceipt {
  return {
    planId: plan.planId,
    applied: true,
    outputHash: 'sha256:applied-output',
    outputVoxelCount: 512,
    outputBounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 7, y: 7, z: 7 },
    },
    diagnostics: [],
    evidence: [sampleEvidence('apply_receipt')],
  };
}

function sampleRuntimeSession(): Partial<Pick<
  RuntimeSessionFacade,
  | 'planVoxelConversion'
  | 'previewVoxelConversion'
  | 'applyVoxelConversion'
  | 'exportVoxelConversionEvidence'
>> {
  return {
    planVoxelConversion: request => samplePlan(request.source, request.settings),
    previewVoxelConversion: () => samplePreview(),
    applyVoxelConversion: () => sampleReceipt(),
    exportVoxelConversionEvidence: evidence => evidence,
  };
}

interface Phase4FixtureSet {
  readonly schemaVersion: number;
  readonly artifactKind: string;
  readonly provenance: {
    readonly sourcePosture: string;
    readonly predecessorEvidence: readonly string[];
    readonly nonClaims: readonly string[];
  };
  readonly cases: readonly Phase4FixtureCase[];
}

interface Phase4FixtureCase {
  readonly id: string;
  readonly purpose: string;
  readonly licensePosture: string;
  readonly source: VoxelConversionSourceRef;
  readonly target: VoxelConversionTargetRef;
  readonly settings: VoxelConversionSettings;
  readonly plan: VoxelConversionPlan | null;
  readonly preview: VoxelConversionPreview | null;
  readonly receipt: VoxelConversionReceipt | null;
  readonly extraEvidence: readonly VoxelConversionEvidenceRef[];
}

function loadPhase4Fixtures(): Phase4FixtureSet {
  return JSON.parse(readFileSync(phase4FixturePath, 'utf8')) as Phase4FixtureSet;
}

function sha256Json(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function summarizePhase4Case(fixtureCase: Phase4FixtureCase) {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: fixtureCase.source,
    target: fixtureCase.target,
    settings: fixtureCase.settings,
    plan: fixtureCase.plan,
    preview: fixtureCase.preview,
    receipt: fixtureCase.receipt,
    evidence: fixtureCase.extraEvidence,
  });
  const readout = buildStudioVoxelConversionReadoutModel({
    workspace,
    runtimeSession: sampleRuntimeSession(),
  });

  return {
    id: fixtureCase.id,
    purpose: fixtureCase.purpose,
    licensePosture: fixtureCase.licensePosture,
    sourceAssetKind: fixtureCase.source.assetKind,
    mode: fixtureCase.settings.mode,
    requestedOutputVoxels: workspace.settings.requestedOutputVoxels,
    workspaceStatus: workspace.status,
    sourceStatus: workspace.source.status,
    settingsStatus: workspace.settings.status,
    operations: {
      plan: workspace.operations.plan.status,
      preview: workspace.operations.preview.status,
      apply: workspace.operations.apply.status,
      exportEvidence: workspace.operations.exportEvidence.status,
    },
    diagnosticCodes: [...new Set(workspace.diagnostics.map(diagnostic => diagnostic.code))],
    materialMap: fixtureCase.settings.materialMap.entries.map(entry => ({
      sourceMaterialSlot: entry.sourceMaterialSlot,
      sourceMaterialId: entry.sourceMaterialId,
      voxelMaterial: entry.voxelMaterial,
    })),
    sampleMaterials: [...new Set((fixtureCase.preview?.sampleVoxels ?? []).map(voxel => voxel.material))],
    readout: {
      status: readout.status,
      authorityPosture: readout.authorityPosture,
      diagnosticCodes: [...new Set(readout.diagnostics.map(diagnostic => diagnostic.code))],
      receipt: readout.receipt,
      evidence: readout.evidence.map(ref => `${ref.source}:${ref.kind}`),
    },
  };
}

function sampleStudioVoxelDraft(overrides: Partial<StudioVoxelConversionSettingsDraft> = {}): StudioVoxelConversionSettingsDraft {
  return {
    selectedSourceAssetId: 'mesh.preview-cube',
    mode: 'surface',
    fitPolicy: 'contain',
    originPolicy: 'target_min',
    resolution: [8, 8, 8],
    voxelSize: 0.25,
    maxOutputVoxels: 1024,
    transformScale: 1,
    transformTranslation: [0, 0, 0],
    targetGrid: 1,
    targetVolumeAssetId: 'voxel/generated',
    targetOrigin: [0, 0, 0],
    meshPrimitive: 'default',
    materialMap: sampleSettings().materialMap,
    ...overrides,
  };
}

function sampleStudioAuthoritySource(overrides: Partial<VoxelConversionSourceRef> = {}): VoxelConversionSourceRef {
  return sampleSource({
    assetKind: 'mesh',
    meshPrimitive: 'default',
    ...overrides,
  });
}

function sampleStudioAuthorityPlan(): VoxelConversionPlan {
  return {
    ...samplePlan(sampleStudioAuthoritySource(), sampleSettings({ mode: 'surface' })),
    target: sampleTarget({ volumeAssetId: 'voxel/generated' }),
  };
}

function sampleStudioAsset(
  overrides: Partial<StudioAssetInventoryEntryReadModel> = {},
): StudioAssetInventoryEntryReadModel {
  return {
    assetId: 'mesh.preview-cube',
    kind: 'static_mesh',
    label: 'Preview Cube',
    sourcePath: 'assets/meshes/preview-cube.mesh.json',
    devResolution: {
      sourceHash: 'sha256:source-v1',
      generatedPath: 'generated/preview-cube.mesh.json',
      generatedHash: 'sha256:generated-preview-cube',
    },
    status: 'ready',
    diagnostics: [],
    ...overrides,
  } as StudioAssetInventoryEntryReadModel;
}

test('voxel conversion scaffold resolves upstream command metadata through approved roots', () => {
  const readout = buildStudioVoxelConversionBoundaryReadout();

  assert.equal(readout.status, 'ready');
  assert.deepEqual(
    STUDIO_VOXEL_CONVERSION_OPERATION_BOUNDARIES.map(operation => operation.commandId),
    [
      'voxel_conversion.plan',
      'voxel_conversion.preview',
      'voxel_conversion.apply',
      'voxel_conversion.export_evidence',
    ],
  );
  assert.deepEqual(readout.diagnostics, []);
  assert.ok(readout.nonClaims.includes('not_conversion_authority'));
  assert.ok(readout.nonClaims.includes('not_raw_runtime_transport'));
});

test('voxel conversion scaffold fails closed when runtime facade operations are absent', () => {
  const readout = buildStudioVoxelConversionBoundaryReadout({});

  assert.equal(readout.status, 'failed_closed');
  assert.deepEqual(
    readout.diagnostics.map(diagnostic => diagnostic.code),
    [
      'runtime_facade_unavailable',
      'runtime_facade_unavailable',
      'runtime_facade_unavailable',
      'runtime_facade_unavailable',
    ],
  );
});

test('studio voxel conversion workspace shell registers visible fail-closed regions', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const panelSource = readFileSync(join(repoRoot, 'libs/studio-panels/src/index.ts'), 'utf8');
  const shellSource = readFileSync(join(repoRoot, 'libs/studio-shell/src/index.ts'), 'utf8');

  assert.match(storeSource, /voxelConversionWorkspaceShell/);
  assert.match(storeSource, /buildStudioVoxelConversionWorkspaceReadModel/);
  assert.match(storeSource, /buildStudioVoxelConversionReadoutModel\(\{\s*workspace,\s*runtimeSession/s);
  assert.match(panelSource, /selector: 'asha-voxel-conversion-workspace-panel'/);
  assert.match(panelSource, /data-visual-id="studio-voxel-conversion-workspace"/);
  assert.match(shellSource, /<asha-voxel-conversion-workspace-panel class="voxel-panel" \/>/);

  for (const state of ['empty_inputs', 'missing_capability', 'ready']) {
    assert.match(storeSource, new RegExp(`id: '${state}'`));
  }
  for (const region of ['source', 'settings', 'preview', 'diagnostics', 'timeline', 'evidence']) {
    assert.match(storeSource, new RegExp(`id: '${region}'`));
    assert.match(panelSource, /data-voxel-region/);
  }
  for (const commandId of [
    'voxel_conversion.plan',
    'voxel_conversion.preview',
    'voxel_conversion.apply',
    'voxel_conversion.export_evidence',
  ]) {
    assert.match(storeSource, new RegExp(`commandId: '${commandId}'`));
  }
});

test('studio agent voxel workflow surface stays typed and bounded', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const proofSource = readFileSync(join(repoRoot, 'scripts/proof-native-voxel-runtime-launch.ts'), 'utf8');

  assert.match(storeSource, /StudioAgentVoxelWorkflowOperation/);
  assert.match(storeSource, /agentVoxelWorkflowSurface\(\)/);
  assert.match(storeSource, /runAgentVoxelWorkflowOperation/);
  assert.match(storeSource, /parseStudioAgentVoxelOperationTranscript/);
  assert.match(storeSource, /runAgentVoxelOperationTranscriptReplay/);
  assert.match(storeSource, /studio_agent_voxel_operation_transcript_replay/);
  assert.match(storeSource, /agentVoxelTranscriptOperationToWorkflowOperation/);
  assert.match(storeSource, /unsupported agent voxel workflow operation/);
  assert.match(storeSource, /register_conversion_mesh_asset/);
  assert.match(storeSource, /import_conversion_mesh_source/);
  assert.match(storeSource, /export_voxel_volume_asset/);
  assert.match(storeSource, /save_voxel_volume_asset/);
  assert.match(storeSource, /load_voxel_volume_asset/);
  assert.match(storeSource, /unload_voxel_volume_asset/);
  assert.match(storeSource, /initialize_voxel_volume_authoring/);
  assert.match(storeSource, /get_model_window/);
  assert.match(storeSource, /buildStudioAgentVoxelMeshSourceImportReadModel/);
  assert.match(storeSource, /buildStudioAgentVoxelVolumeUnloadReadModel/);
  assert.match(storeSource, /imported_static_mesh/);
  assert.match(storeSource, /buildStudioAgentVoxelVolumeExportReadModel/);
  assert.match(storeSource, /buildStudioAgentVoxelVolumeSaveReadModel/);
  assert.match(storeSource, /buildStudioAgentVoxelVolumeLoadReadModel/);
  assert.match(storeSource, /not_browser_local_storage_save/);
  assert.match(storeSource, /not_studio_json_promotion/);
  assert.match(storeSource, /not_preview_sample_export/);
  assert.match(storeSource, /AGENT_VOXEL_EDIT_MAX_COMMANDS = 64/);
  assert.match(storeSource, /AGENT_VOXEL_EDIT_COORDINATE_ABS_LIMIT = 1024/);
  assert.match(storeSource, /unsupported voxel edit operation/);
  assert.match(storeSource, /commandMessageType: 'command\.propose'/);
  assert.match(storeSource, /supportedCommandOps: \['setVoxel'\]/);
  assert.match(storeSource, /compactAffordances: AGENT_COMPACT_VOXEL_AFFORDANCES/);
  assert.match(storeSource, /view_from_angle/);
  assert.match(storeSource, /buildStudioAgentVoxelViewCaptureReadModel/);
  assert.match(storeSource, /not_browser_screenshot/);
  assert.match(storeSource, /publish_preview/);
  assert.match(storeSource, /buildStudioAgentVoxelPreviewPublicationReadModel/);
  assert.match(storeSource, /persist_voxel_asset/);
  assert.match(storeSource, /reopen_voxel_asset/);
  assert.match(storeSource, /VOXEL_ASSET_EXTENSION/);
  assert.match(storeSource, /VOXEL_ASSET_MEDIA_TYPE/);
  assert.match(storeSource, /buildStudioAgentVoxelAssetPersistenceReadModel/);
  assert.match(storeSource, /buildStudioAgentVoxelAssetReopenReadModel/);
  assert.match(storeSource, /not_silent_sessionstate_promotion/);
  assert.match(storeSource, /not_vforge_file/);
  assert.match(proofSource, /process\.argv\.includes\('--serve'\)/);
  assert.match(proofSource, /NativeVoxelLaunchMode = 'proof' \| 'interactive'/);
  assert.match(proofSource, /function injectBrowserHostScripts/);
  assert.match(proofSource, /automationPrelude\(referenceMeshImport\)/);
  assert.match(proofSource, /kenney-retro-urban-tree-small\.glb/);
  assert.match(proofSource, /northstarReference/);
  assert.match(proofSource, /northstarScratch/);
  assert.match(proofSource, /Reference save-clear-reload failed/);
  assert.match(proofSource, /ASHA Studio native voxel server is running\./);
  assert.match(storeSource, /agentVoxelPreviewArtifactPathDiagnostic/);
  assert.match(storeSource, /agentVoxelAssetArtifactPathDiagnostic/);
  assert.match(storeSource, /buildStudioAgentCompactVoxelEditBatch/);
  assert.match(storeSource, /not_raw_runtime_bridge_dispatch/);
  assert.match(storeSource, /generated-contract import paths are not accepted/);
  assert.match(proofSource, /voxel-transcript-replay-receipt\.json/);
  assert.match(proofSource, /transcript_replay:true/);
  assert.doesNotMatch(storeSource, /debug\.rawJson/);
  assert.doesNotMatch(storeSource, /method\.apply\(facade/);

  for (const operation of ['inspect', 'register_conversion_source', 'register_conversion_mesh_asset', 'configure_conversion', 'run_conversion', 'get_model_info', 'get_model_window', 'initialize_voxel_volume_authoring', 'export_voxel_volume_asset', 'save_voxel_volume_asset', 'load_voxel_volume_asset', 'unload_voxel_volume_asset', 'view_from_angle', 'publish_preview', 'persist_voxel_asset', 'reopen_voxel_asset', 'submit_voxel_edit', 'submit_compact_voxel_edit']) {
    assert.match(proofSource, new RegExp(`kind: '${operation}'`));
  }
  assert.match(proofSource, /register_conversion_source\.facade:true/);
  assert.match(proofSource, /register_conversion_mesh_asset\.facade:true/);
  assert.match(proofSource, /get_model_info:true/);
  assert.match(proofSource, /export_voxel_volume_asset\.converted:true/);
  assert.match(proofSource, /save_voxel_volume_asset\.converted:true/);
  assert.match(proofSource, /load_voxel_volume_asset\.converted:true/);
  assert.match(proofSource, /get_model_info\.missing:false/);
  assert.match(proofSource, /voxel_model_info_read_through_runtime_session_facade/);
  assert.match(proofSource, /view_from_angle\.isometric:true/);
  assert.match(proofSource, /view_from_angle_recorded_projection_camera_readout_without_screenshot_authority/);
  assert.match(proofSource, /publish_preview:true/);
  assert.match(proofSource, /publish_preview_emitted_bounded_projection_evidence_artifact/);
  assert.match(proofSource, /persist_voxel_asset\.converted:true/);
  assert.match(proofSource, /reopen_voxel_asset\.converted:true/);
  assert.match(proofSource, /persist_voxel_asset\.authored:true/);
  assert.match(proofSource, /reopen_voxel_asset\.authored:true/);
  assert.match(proofSource, /persist_voxel_asset_emitted_asha_native_avxl_json_projection_artifacts/);
  assert.match(proofSource, /reopen_voxel_asset_verified_round_trip_hashes_without_runtime_authority_claims/);
  assert.match(proofSource, /launchNativeBrowserHost/);
  assert.doesNotMatch(proofSource, new RegExp(['rpc', 'Methods'].join('')));
  assert.doesNotMatch(proofSource, /'screenPointToPickRay'/);
  assert.doesNotMatch(proofSource, /'step'/);
  for (const compactAffordance of [
    'set_voxels',
    'set_voxels_runs',
    'fill_box',
    'apply_voxel_primitives',
  ]) {
    assert.match(proofSource, new RegExp(`submit_compact_voxel_edit\\.${compactAffordance}:true`));
  }
  assert.match(proofSource, /submit_compact_voxel_edit\.fill_box_oversized:false/);
  assert.match(proofSource, /compactVoxelEdits/);
  assert.match(proofSource, /acceptedVoxelEdit/);
  assert.match(proofSource, /rejectedCompactVoxelEdit/);
  assert.match(proofSource, /rejectedVoxelEdit/);
  assert.match(proofSource, /unsupportedVoxelEdit/);
});

test('VoxelForge view_from_angle parity produces projection-only camera evidence', () => {
  const workspace = buildInitialWorkspaceReadModel();
  const capture = buildStudioAgentVoxelViewCaptureReadModel({
    workspace,
    viewportTool: buildStudioViewportToolReadModel('orbit'),
    renderSettings: buildStudioPreferencesReadModel().render,
    readbackMarker: 'session-preview-0001:scene-view-57349d34:4',
    angle: 'right',
    target: 'selected',
  });

  assert.equal(capture.captureVersion, 'studio-agent-voxel-view-capture.v0');
  assert.equal(capture.angle, 'right');
  assert.equal(capture.target, 'selected');
  assert.equal(capture.targetRenderableId, 'selected-voxel:0,0,0');
  assert.equal(capture.sessionId, workspace.session.sessionId);
  assert.equal(capture.sceneHash, workspace.scene.sceneHash);
  assert.equal(capture.viewport.selectedRenderableId, 'selected-voxel:0,0,0');
  assert.match(capture.camera.cameraHash, /^viewport-camera-/);
  assert.match(capture.viewport.readbackHash, /^viewport-readback-/);
  assert.match(capture.captureHash, /^studio-agent-voxel-view-capture-/);
  assert.ok(capture.nonClaims.includes('not_runtime_authority'));
  assert.ok(capture.nonClaims.includes('not_hardware_gpu_capture'));
  assert.ok(capture.nonClaims.includes('not_voxelforge_viewer'));
  assert.ok(capture.nonClaims.includes('not_browser_screenshot'));
});

test('VoxelForge publish_preview parity produces a bounded projection artifact body', () => {
  const workspace = buildInitialWorkspaceReadModel();
  const plan = sampleStudioAuthorityPlan();
  const preview = samplePreview(plan);
  const receipt = sampleReceipt(plan);
  const shell = buildStudioVoxelConversionWorkspaceShellForInputs({
    draft: sampleStudioVoxelDraft(),
    selectedSource: sampleStudioAsset(),
    sessionId: workspace.session.sessionId,
    expectedTimelineSequence: 7,
    runtimeSession: sampleRuntimeSession(),
    authorityState: { plan, preview, receipt, evidence: [sampleEvidence('diagnostics')] },
  });
  const publication = buildStudioAgentVoxelPreviewPublicationReadModel({
    workspace,
    shell,
    viewport: buildStudioViewportAdapterReadModel({ scene: workspace.scene }),
    readbackMarker: 'session-preview-0001:scene-view-57349d34:7',
    artifactPath: 'artifacts/native-voxel-runtime-launch/latest/voxel-preview-publication.json',
    label: 'Native voxel runtime launch preview',
  });

  assert.equal(publication.artifactKind, 'studio_agent_voxel_preview_publication');
  assert.equal(publication.artifactVersion, 'studio-agent-voxel-preview-publication.v0');
  assert.equal(publication.label, 'Native voxel runtime launch preview');
  assert.equal(publication.artifactPath, 'artifacts/native-voxel-runtime-launch/latest/voxel-preview-publication.json');
  assert.equal(publication.sessionId, workspace.session.sessionId);
  assert.equal(publication.sceneHash, workspace.scene.sceneHash);
  assert.equal(publication.conversion.authorityPosture, 'authority_backed');
  assert.equal(publication.conversion.outputVoxelCount, 512);
  assert.deepEqual(publication.conversion.evidenceKinds, ['plan', 'preview', 'apply_receipt', 'diagnostics']);
  assert.ok(publication.conversion.sourceEvidenceRefs.every(ref => ref.uri.startsWith('asha://')));
  assert.match(publication.viewport.cameraHash, /^viewport-camera-/);
  assert.match(publication.viewport.readbackHash, /^viewport-readback-/);
  assert.match(publication.publicationHash, /^studio-agent-voxel-preview-publication-/);
  assert.ok(publication.nonClaims.includes('not_vforge_file'));
  assert.ok(publication.nonClaims.includes('not_runtime_authority'));
  assert.ok(publication.nonClaims.includes('not_hardware_gpu_capture'));
  assert.ok(publication.nonClaims.includes('not_arbitrary_filesystem_write'));
});

test('Asha-native voxel asset persistence readmodel emits and reopens avxl json DTOs', () => {
  const workspace = buildInitialWorkspaceReadModel();
  const plan = sampleStudioAuthorityPlan();
  const preview = samplePreview(plan);
  const receipt = sampleReceipt(plan);
  const shell = buildStudioVoxelConversionWorkspaceShellForInputs({
    draft: sampleStudioVoxelDraft(),
    selectedSource: sampleStudioAsset(),
    sessionId: workspace.session.sessionId,
    expectedTimelineSequence: 7,
    runtimeSession: sampleRuntimeSession(),
    authorityState: { plan, preview, receipt, evidence: [sampleEvidence('diagnostics')] },
  });
  const compiled = buildStudioAgentCompactVoxelEditBatch({
    kind: 'set_voxels',
    grid: 1,
    voxels: [
      { x: 0, y: 0, z: 0, i: 1 },
      { x: 1, y: 0, z: 0, i: 1 },
    ],
  });
  assert.ok(compiled.batch);

  const persistence = buildStudioAgentVoxelAssetPersistenceReadModel({
    workspace,
    shell,
    source: { kind: 'command_batch', batch: compiled.batch },
    assetId: 'voxel-volume/test-authored',
    artifactPath: 'artifacts/native-voxel-runtime-launch/latest/test-authored.avxl.json',
    label: 'Test authored asset',
  });

  assert.equal(persistence.artifactKind, 'studio_agent_voxel_asset_persistence');
  assert.equal(persistence.storage.extension, 'avxl.json');
  assert.equal(persistence.storage.mediaType, 'application/vnd.asha.voxel-volume+json;version=1');
  assert.equal(persistence.storage.schemaVersion, 1);
  assert.equal(persistence.storage.assetPlane, 'ProjectBundle');
  assert.equal(persistence.asset.assetId, 'voxel-volume/test-authored');
  assert.equal(persistence.asset.mediaType, 'application/vnd.asha.voxel-volume+json;version=1');
  assert.equal(persistence.asset.schemaVersion, 1);
  assert.equal(persistence.asset.grid.coordinateSystem, 'y_up_right_handed');
  assert.deepEqual(persistence.asset.representation.sparseRuns, [
    { start: { x: 0, y: 0, z: 0 }, length: 2, material: 1 },
  ]);
  assert.deepEqual(persistence.asset.materialPalette, [
    {
      voxelMaterial: 1,
      paletteEntryId: 'voxel-material/copper',
      displayName: 'Voxel material 1',
      materialAssetId: 'material/copper',
      materialCatalogBindingId: 'catalog-binding/copper',
    },
  ]);
  assert.equal(persistence.source.kind, 'command_batch');
  assert.equal(persistence.source.outputVoxelCount, 2);
  assert.equal(persistence.source.boundsLabel, '[0,0,0] to [1,0,0]');
  assert.match(persistence.asset.contentHashes.canonicalJson, /^fnv1a64:/);
  assert.match(persistence.asset.contentHashes.voxelData, /^fnv1a64:/);
  assert.equal(persistence.validation.authority, 'svc-voxel-asset');
  assert.equal(persistence.validation.posture, 'studio_shape_check_engine_authority_required');
  assert.ok(persistence.serializedAsset.includes('"mediaType": "application/vnd.asha.voxel-volume+json;version=1"'));
  assert.ok(persistence.serializedAsset.includes('"cellSize": 1.0'));
  assert.ok(persistence.serializedAsset.includes('    0.0'));
  assert.ok(persistence.nonClaims.includes('not_vforge_file'));
  assert.ok(persistence.nonClaims.includes('not_engine_validation'));
  assert.ok(persistence.nonClaims.includes('not_silent_sessionstate_promotion'));

  const materialAuthoring = buildStudioVoxelMaterialAuthoringReadModel({
    shell,
    assetWorkflow: {
      controlVersion: 'studio-voxel-asset-workflow-control.v0',
      lastAction: 'export_volume',
      status: 'accepted',
      message: 'Exported test authored asset.',
      targetAssetId: 'voxel-volume/test-authored',
      targetProjectBundle: 'asha-demo',
      targetAssetPath: 'assets/voxels/test-authored.avxl.json',
      residentModelId: 'voxel-model:test-authored',
      volumeAssetId: 'voxel/test-authored',
      voxelCount: 2,
      materialSummary: '1:2',
      canonicalJsonHash: persistence.asset.contentHashes.canonicalJson,
      voxelDataHash: persistence.asset.contentHashes.voxelData,
      validationDiagnosticCodes: [],
      canLoadLastAsset: true,
      lastAssetId: persistence.asset.assetId,
      lastAsset: persistence.asset,
    },
    compactEdit: {
      controlVersion: 'studio-voxel-compact-edit-control.v0',
      lastAction: 'block',
      status: 'accepted',
      message: 'Compact block accepted.',
      grid: 1,
      x1: 0,
      y1: 0,
      z1: 0,
      x2: 1,
      y2: 0,
      z2: 0,
      material: 1,
      generatedCommandCount: 1,
      acceptedCommandCount: 1,
      rejectedCommandCount: 0,
      diagnostic: null,
    },
  });

  assert.equal(materialAuthoring.readoutVersion, 'studio-voxel-material-authoring.v0');
  assert.equal(materialAuthoring.currentCompactMaterial, 1);
  assert.equal(materialAuthoring.defaultVoxelMaterial, 1);
  assert.equal(materialAuthoring.canAuthorCatalogBindings, true);
  assert.ok(materialAuthoring.supportedFields.includes('conversion_material_map'));
  assert.ok(materialAuthoring.supportedFields.includes('voxel_asset_material_palette'));
  assert.ok(materialAuthoring.supportedFields.includes('named_voxel_palette_entries'));
  assert.ok(materialAuthoring.supportedFields.includes('material_catalog_binding_mutation'));
  assert.ok(materialAuthoring.supportedFields.includes('compact_material_index'));
  assert.deepEqual(materialAuthoring.missingEngineFields, ['multi_material_compact_edit_controls']);
  assert.deepEqual(materialAuthoring.conversionRows.map(row => ({
    source: row.source,
    voxelMaterial: row.voxelMaterial,
    paletteEntryId: row.paletteEntryId,
    displayName: row.displayName,
    materialAssetId: row.materialAssetId,
    materialCatalogBindingId: row.materialCatalogBindingId,
    sourceMaterialSlot: row.sourceMaterialSlot,
    voxelCount: row.voxelCount,
  })), [
    {
      source: 'conversion_map',
      voxelMaterial: 1,
      paletteEntryId: null,
      displayName: null,
      materialAssetId: 'material.copper',
      materialCatalogBindingId: null,
      sourceMaterialSlot: 0,
      voxelCount: 2,
    },
  ]);
  assert.deepEqual(materialAuthoring.storedRows.map(row => ({
    source: row.source,
    voxelMaterial: row.voxelMaterial,
    paletteEntryId: row.paletteEntryId,
    displayName: row.displayName,
    materialAssetId: row.materialAssetId,
    materialCatalogBindingId: row.materialCatalogBindingId,
    voxelCount: row.voxelCount,
  })), [
    {
      source: 'stored_asset_palette',
      voxelMaterial: 1,
      paletteEntryId: 'voxel-material/copper',
      displayName: 'Voxel material 1',
      materialAssetId: 'material/copper',
      materialCatalogBindingId: 'catalog-binding/copper',
      voxelCount: 2,
    },
  ]);
  assert.equal(materialAuthoring.compactRow.source, 'compact_edit_material');
  assert.equal(materialAuthoring.compactRow.voxelMaterial, 1);
  assert.match(materialAuthoring.readoutHash, /^studio-voxel-material-authoring-/);

  const reopen = buildStudioAgentVoxelAssetReopenReadModel({
    asset: persistence.asset,
    artifactPath: persistence.artifactPath,
    expectedAssetId: persistence.asset.assetId,
    expectedCanonicalJsonHash: persistence.asset.contentHashes.canonicalJson,
  });

  assert.equal(reopen.artifactKind, 'studio_agent_voxel_asset_reopen');
  assert.equal(reopen.roundTripMatches, true);
  assert.equal(reopen.reopenedHash, persistence.asset.contentHashes.canonicalJson);
  assert.equal(reopen.voxelCount, 2);
  assert.equal(reopen.boundsLabel, '[0,0,0] to [1,0,0]');
  assert.ok(reopen.nonClaims.includes('not_vforge_file'));
});

test('VoxelForge compact voxel affordances compile to bounded generated command batches', () => {
  const fillBox = buildStudioAgentCompactVoxelEditBatch({
    kind: 'fill_box',
    grid: 7,
    x1: 2,
    y1: 0,
    z1: 0,
    x2: 3,
    y2: 1,
    z2: 0,
    palette_index: 4,
  });

  assert.equal(fillBox.accepted, true);
  assert.equal(fillBox.affordance, 'fill_box');
  assert.equal(fillBox.generatedVoxelCount, 4);
  assert.deepEqual(fillBox.batch?.commands, [
    { op: 'setVoxel', grid: 7, coord: { x: 2, y: 0, z: 0 }, value: { kind: 'solid', material: 4 } },
    { op: 'setVoxel', grid: 7, coord: { x: 2, y: 1, z: 0 }, value: { kind: 'solid', material: 4 } },
    { op: 'setVoxel', grid: 7, coord: { x: 3, y: 0, z: 0 }, value: { kind: 'solid', material: 4 } },
    { op: 'setVoxel', grid: 7, coord: { x: 3, y: 1, z: 0 }, value: { kind: 'solid', material: 4 } },
  ]);

  const runs = buildStudioAgentCompactVoxelEditBatch({
    kind: 'set_voxels_runs',
    runs: [{ x1: 0, x2: 2, y: 0, z: 1, i: 2 }],
  });
  assert.equal(runs.accepted, true);
  assert.equal(runs.batch?.commands.length, 3);
  assert.equal(runs.batch?.commands[2]?.op, 'setVoxel');

  const primitives = buildStudioAgentCompactVoxelEditBatch({
    kind: 'apply_voxel_primitives',
    primitives: [
      { kind: 'block', at: { x: 0, y: 0, z: 0 }, palette_index: 1 },
      { kind: 'line', from: { x: 1, y: 0, z: 0 }, to: { x: 3, y: 0, z: 0 }, palette_index: 3 },
    ],
  });
  assert.equal(primitives.accepted, true);
  assert.equal(primitives.batch?.commands.length, 4);

  const oversized = buildStudioAgentCompactVoxelEditBatch({
    kind: 'fill_box',
    x1: 0,
    y1: 0,
    z1: 0,
    x2: 8,
    y2: 8,
    z2: 0,
    palette_index: 1,
  });
  assert.equal(oversized.accepted, false);
  assert.match(oversized.diagnostic ?? '', /exceeds 64 generated commands/);

  const outOfBounds = buildStudioAgentCompactVoxelEditBatch({
    kind: 'set_voxels',
    voxels: [{ x: 2048, y: 0, z: 0, i: 1 }],
  });
  assert.equal(outOfBounds.accepted, false);
  assert.match(outOfBounds.diagnostic ?? '', /coordinate exceeds/);
});

test('studio voxel conversion workspace wires source and settings controls to read-model draft', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const panelSource = readFileSync(join(repoRoot, 'libs/studio-panels/src/index.ts'), 'utf8');

  assert.match(storeSource, /voxelConversionDraftState/);
  assert.match(storeSource, /voxelConversionSourceOptions/);
  assert.match(storeSource, /voxelConversionSourceRef/);
  assert.match(storeSource, /voxelConversionSettings/);
  assert.match(storeSource, /buildStudioVoxelConversionPlanProposal/);

  for (const setter of [
    'setVoxelConversionSourceAsset',
    'setVoxelConversionMode',
    'setVoxelConversionFitPolicy',
    'setVoxelConversionOriginPolicy',
    'setVoxelConversionResolutionAxis',
    'setVoxelConversionMaxOutputVoxels',
    'setVoxelConversionTransformScale',
    'setVoxelConversionTransformTranslationAxis',
    'setVoxelConversionMaterialVoxelId',
  ]) {
    assert.match(storeSource, new RegExp(`${setter}\\(`));
    assert.match(panelSource, new RegExp(`${setter}\\(`));
  }

  for (const control of [
    'source-asset',
    'mode',
    'fit-policy',
    'origin-policy',
    'resolution-',
    'max-output-voxels',
    'transform-scale',
    'transform-translation-',
    'target-grid',
    'target-volume',
    'material-source-slot',
    'material-voxel-id',
    'material-default',
  ]) {
    assert.match(panelSource, new RegExp(control));
  }

  assert.match(panelSource, /data-voxel-proposal-diagnostic-code/);
  assert.match(panelSource, /unsupported/);
  assert.match(storeSource, /StudioVoxelConversionSourceMetadataReadModel/);
  assert.match(storeSource, /buildVoxelConversionSourceMetadataReadModel/);
  assert.match(storeSource, /mesh_asset_group_bounds/);
  assert.match(panelSource, /data-voxel-source-transform-readout/);
  assert.match(panelSource, /data-voxel-source-missing-fields/);
  assert.match(panelSource, /shell\.sourceMetadata/);
});

test('studio voxel conversion workspace exposes voxel asset save/load controls', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const panelSource = readFileSync(join(repoRoot, 'libs/studio-panels/src/index.ts'), 'utf8');

  assert.match(storeSource, /voxelAssetWorkflowControlState/);
  assert.match(storeSource, /voxelAssetWorkflowControl =/);
  assert.match(storeSource, /voxelAssetWorkflowTarget =/);
  assert.match(storeSource, /runVoxelAssetWorkflowControl/);
  assert.match(storeSource, /setVoxelAssetWorkflowTargetProjectBundle/);
  assert.match(storeSource, /setVoxelAssetWorkflowTargetAssetPath/);
  assert.match(storeSource, /resetVoxelAssetWorkflowTarget/);
  assert.match(storeSource, /derivedProjectBundle = this\.gameWorkspace\(\)\?\.gameId \?\? 'asha-project'/);
  assert.doesNotMatch(storeSource, /projectBundle: 'asha-demo',\n\s+assetPath: `assets\/voxels/);

  for (const operation of [
    'get_model_info',
    'export_voxel_volume_asset',
    'save_voxel_volume_asset',
    'load_voxel_volume_asset',
  ]) {
    assert.match(storeSource, new RegExp(operation));
  }

  assert.match(panelSource, /data-voxel-asset-workflow-status/);
  assert.match(panelSource, /data-voxel-asset-diagnostics/);
  assert.match(panelSource, /data-voxel-asset-target-control="project_bundle"/);
  assert.match(panelSource, /data-voxel-asset-target-control="asset_path"/);
  assert.match(panelSource, /data-voxel-asset-target-action="reset"/);

  for (const action of ['model_info', 'export_volume', 'save_volume', 'load_volume']) {
    assert.match(panelSource, new RegExp(`data-voxel-asset-action="${action}"`));
    assert.match(panelSource, new RegExp(`runVoxelAssetWorkflowControl\\('${action}'\\)`));
  }

  assert.match(panelSource, /canLoadLastAsset/);
  assert.match(panelSource, /targetProjectBundle/);
  assert.match(panelSource, /targetAssetPath/);
  assert.match(panelSource, /derivedProjectBundle/);
  assert.match(panelSource, /derivedAssetPath/);
  assert.match(panelSource, /lastAssetId/);
  assert.match(panelSource, /canonicalJsonHash/);
  assert.match(panelSource, /voxelDataHash/);
  assert.match(storeSource, /does not match target/);
});

test('studio voxel conversion workspace exposes compact voxel creation controls', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const panelSource = readFileSync(join(repoRoot, 'libs/studio-panels/src/index.ts'), 'utf8');

  assert.match(storeSource, /voxelCompactEditControlState/);
  assert.match(storeSource, /voxelCompactEditControl =/);
  assert.match(storeSource, /runVoxelCompactEditControl/);
  assert.match(storeSource, /setVoxelCompactEditControlField/);
  assert.match(storeSource, /setVoxelCompactEditControlAction/);
  assert.match(storeSource, /setVoxelCompactEditControlBoxMode/);
  assert.match(storeSource, /voxelCompactEditPlacement = computed/);
  assert.match(storeSource, /applyViewportHitToVoxelCompactEditControl/);
  assert.match(storeSource, /StudioVoxelCompactEditPlacementReadModel/);
  assert.match(storeSource, /does_not_render_authoritative_brush_mesh/);
  assert.match(storeSource, /buildStudioAgentCompactVoxelEditBatch\(edit\)/);
  assert.match(storeSource, /buildStudioCompactVoxelEditFromControl/);
  assert.match(storeSource, /refreshStudioCompactVoxelEditPreflight/);
  assert.match(storeSource, /buildStudioVoxelCompactEditPlacementReadModel/);
  assert.match(storeSource, /kind: 'submit_compact_voxel_edit'/);
  assert.match(storeSource, /kind: 'set_voxels'/);
  assert.match(storeSource, /kind: 'fill_box'/);
  assert.match(storeSource, /kind: 'apply_voxel_primitives'/);
  assert.match(storeSource, /draftAction: 'block'/);
  assert.match(storeSource, /boxMode: 'filled'/);
  assert.match(storeSource, /lineRadius: 0/);
  assert.match(storeSource, /maxGeneratedVoxels: 64/);
  assert.match(storeSource, /preflightGeneratedCommandCount/);
  assert.match(storeSource, /preflightDiagnostic/);
  assert.match(storeSource, /generatedCommandCount/);
  assert.match(storeSource, /acceptedCommandCount/);
  assert.match(storeSource, /rejectedCommandCount/);
  assert.match(storeSource, /Attach RuntimeSession before submitting voxel edits/);

  assert.match(panelSource, /data-voxel-edit-status/);
  assert.match(panelSource, /data-voxel-edit-diagnostic/);

  for (const control of [
    'grid',
    'material',
    'draft_action',
    'box_mode',
    'line_radius',
    'max_generated_voxels',
    'x1',
    'y1',
    'z1',
    'x2',
    'y2',
    'z2',
  ]) {
    assert.match(panelSource, new RegExp(`data-voxel-edit-control="${control}"`));
  }

  for (const control of ['grid', 'material', 'x1', 'y1', 'z1', 'x2', 'y2', 'z2']) {
    assert.match(panelSource, new RegExp(`setVoxelCompactEditControlField\\('${control}'`));
  }

  assert.match(panelSource, /setVoxelCompactEditControlField\('lineRadius'/);
  assert.match(panelSource, /setVoxelCompactEditControlField\('maxGeneratedVoxels'/);
  assert.match(panelSource, /setVoxelCompactEditControlAction/);
  assert.match(panelSource, /setVoxelCompactEditControlBoxMode/);
  assert.match(panelSource, /data-voxel-edit-placement-status/);
  assert.match(panelSource, /data-voxel-edit-placement-action="use_start"/);
  assert.match(panelSource, /data-voxel-edit-placement-action="use_end"/);
  assert.match(panelSource, /applyViewportHitToVoxelCompactEditControl\('start'\)/);
  assert.match(panelSource, /applyViewportHitToVoxelCompactEditControl\('end'\)/);
  assert.match(panelSource, /voxelCompactEditPlacement\(\)\.previewLabel/);
  assert.match(panelSource, /voxelCompactEditPlacement\(\)\.canUseViewportHit/);
  assert.match(panelSource, /data-voxel-edit-preflight/);
  assert.match(panelSource, /preflightGeneratedCommandCount/);
  assert.match(panelSource, /preflightDiagnostic/);

  for (const action of ['block', 'fill_box', 'primitive_box', 'primitive_line']) {
    assert.match(panelSource, new RegExp(`data-voxel-edit-action="${action}"`));
    assert.match(panelSource, new RegExp(`runVoxelCompactEditControl\\('${action}'\\)`));
  }
});

test('studio voxel history panel uses RuntimeSession history projections without a local undo stack', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const panelSource = readFileSync(join(repoRoot, 'libs/studio-panels/src/index.ts'), 'utf8');
  const proofSource = readFileSync(join(repoRoot, 'scripts/proof-native-voxel-runtime-launch.ts'), 'utf8');

  assert.match(storeSource, /StudioVoxelHistoryPanelReadModel/);
  assert.match(storeSource, /voxelHistoryControlState/);
  assert.match(storeSource, /voxelHistoryPanel = computed/);
  assert.match(storeSource, /buildStudioVoxelHistoryPanelReadModel/);
  assert.match(storeSource, /not_studio_authoritative_undo_stack/);
  assert.match(storeSource, /not_row_level_revert_without_rust_replayable_marker/);
  assert.match(storeSource, /not_compacted_entry_reconstruction/);

  for (const method of [
    'readVoxelEditHistory',
    'previewVoxelEditRevert',
    'applyVoxelEditRevert',
    'undoVoxelEdit',
    'redoVoxelEdit',
  ]) {
    assert.match(storeSource, new RegExp(`facade\\.${method}\\(`));
  }

  for (const requestBuilder of [
    'voxelHistoryReadRequest',
    'voxelHistoryRevertRequest',
    'voxelHistoryUndoRequest',
    'voxelHistoryRedoRequest',
  ]) {
    assert.match(storeSource, new RegExp(requestBuilder));
  }

  assert.match(storeSource, /expectedHistoryHash: this\.voxelHistoryExpectedHistoryHash\(\)/);
  assert.match(storeSource, /expectedCursorHash: this\.voxelHistoryExpectedCursorHash\(\)/);
  assert.match(storeSource, /targetTransactionId: transactionId/);
  assert.match(storeSource, /targetCursorId: null/);
  assert.match(storeSource, /targetCursorIndex: null/);
  assert.match(storeSource, /partial: diff\.partial/);
  assert.match(storeSource, /actionability: 'summary_only'/);
  assert.doesNotMatch(storeSource, /localUndoStack/);
  assert.doesNotMatch(storeSource, /Studio.*undo.*push/i);

  assert.match(panelSource, /data-voxel-history-status/);
  assert.match(panelSource, /data-voxel-history-runtime-attached/);
  assert.match(panelSource, /data-voxel-history-target/);
  assert.match(panelSource, /data-voxel-history-diff-status/);
  assert.match(panelSource, /data-voxel-history-entry-actionability/);
  assert.match(panelSource, /data-voxel-history-diagnostic-code/);
  assert.match(panelSource, /selectVoxelHistoryTarget/);

  for (const control of [
    'history_id',
    'cursor_id',
    'target_transaction_id',
    'target_cursor_id',
    'target_cursor_index',
    'max_entries',
    'max_replay_steps',
    'max_diff_voxels',
    'include_redo_tail',
    'include_sample_window',
  ]) {
    assert.match(panelSource, new RegExp(`data-voxel-history-control="${control}"`));
  }

  for (const action of ['read', 'preview_revert', 'apply_revert', 'undo', 'redo']) {
    assert.match(panelSource, new RegExp(`data-voxel-history-action="${action}"`));
    assert.match(panelSource, new RegExp(`runVoxelHistoryControl\\('${action}'\\)`));
  }

  assert.match(proofSource, /voxelHistoryPanelReadout/);
  assert.match(proofSource, /readVoxelHistoryPanel/);
  assert.match(proofSource, /previewVoxelHistoryRevert/);
  assert.match(proofSource, /runVoxelHistoryControl\('preview_revert'\)/);
  assert.match(proofSource, /proof\.agentSurface\.voxelHistory/);
  assert.match(proofSource, /studio-voxel-history-panel-/);

  assert.match(proofSource, /launchNativeBrowserHost/);
});

test('studio voxel annotation authoring uses public RuntimeSession annotation operations', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const panelSource = readFileSync(join(repoRoot, 'libs/studio-panels/src/index.ts'), 'utf8');

  assert.match(storeSource, /StudioVoxelAnnotationControlReadModel/);
  assert.match(storeSource, /validateVoxelAnnotationLayer/);
  assert.match(storeSource, /loadVoxelAnnotationLayer/);
  assert.match(storeSource, /readVoxelAnnotationQuery/);
  assert.match(storeSource, /applyVoxelAnnotationEdit/);
  assert.match(storeSource, /exportVoxelAnnotationLayer/);
  assert.match(storeSource, /expectedLayerHash/);
  assert.match(storeSource, /const targetVoxelVolumeAssetId = asset\.assetId/);
  assert.match(storeSource, /loadVoxelVolumeAsset\(\{/);
  assert.match(storeSource, /loadVoxelAnnotationLayer\(\{ layer: validation\.normalizedLayer, targetGrid: targetLoad\.grid/);
  assert.match(storeSource, /subtractVoxelAnnotationSparseRuns/);
  assert.match(storeSource, /Unable to read the authoritative annotation selection for bounded removal/);
  assert.match(storeSource, /operation: 'replace_selection'/);
  assert.match(storeSource, /new Set\(control\.tags\.split\(','\)/);
  assert.match(storeSource, /input: \{ kind: 'draft', draft: layerDraft \}/);
  assert.match(storeSource, /layer: validation\.normalizedLayer/);
  assert.doesNotMatch(storeSource, /annotationAuthorityStore/);

  for (const action of [
    'load', 'upsert_region', 'add_runs', 'remove_runs', 'replace_selection',
    'set_label', 'set_kind', 'set_tags', 'set_parent', 'query_cell', 'query_bounds', 'export',
  ]) {
    assert.match(panelSource, new RegExp(`data-voxel-annotation-action="${action}"`));
    assert.match(panelSource, new RegExp(`runVoxelAnnotationControl\\('${action}'\\)`));
  }

  for (const control of ['layer_id', 'region_id', 'label', 'kind', 'tags', 'parent_region_id', 'x1', 'y1', 'z1', 'x2', 'y2', 'z2']) {
    assert.match(panelSource, new RegExp(`data-voxel-annotation-control="${control}"`));
  }

  const proofSource = readFileSync(join(repoRoot, 'scripts/proof-native-voxel-runtime-launch.ts'), 'utf8');
  assert.match(proofSource, /voxelAnnotations/);
  assert.match(proofSource, /targetGrid: 2/);
  assert.match(proofSource, /submitVoxelAnnotationControl\('load'\)/);
  assert.match(proofSource, /submitVoxelAnnotationControl\('export'\)/);

  assert.match(proofSource, /launchNativeBrowserHost/);
});

test('studio imports RuntimeSession semantics from their public package root', () => {
  const semanticConsumerPaths = [
    'libs/studio-domain/src/index.ts',
    'libs/studio-store/src/index.ts',
    'libs/studio-voxel-conversion/src/index.ts',
    'scripts/proof-voxel-conversion-phase4-product.ts',
  ];

  for (const relativePath of semanticConsumerPaths) {
    const source = readFileSync(join(repoRoot, relativePath), 'utf8');
    assert.match(source, /from '@asha\/runtime-session';/);
    assert.doesNotMatch(
      source,
      /import(?: type)? \{[^}]*\bRuntimeSessionFacade\b[^}]*\} from '@asha\/runtime-bridge';/s,
    );
    assert.doesNotMatch(source, /@asha\/runtime-bridge:RuntimeSessionFacade/);
  }

  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  assert.match(storeSource, /createRuntimeSessionFacade,[\s\S]*from '@asha\/runtime-bridge';/);
});

test('studio voxel palette editor uses the public stored-only RuntimeSession mutation', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const panelSource = readFileSync(join(repoRoot, 'libs/studio-panels/src/index.ts'), 'utf8');
  const proofSource = readFileSync(join(repoRoot, 'scripts/proof-native-voxel-runtime-launch.ts'), 'utf8');

  assert.match(storeSource, /VoxelVolumeAssetPaletteUpdateRequest/);
  assert.match(storeSource, /updateVoxelVolumeAssetPalette/);
  assert.match(storeSource, /expectedCanonicalJsonHash: asset\.contentHashes\.canonicalJson/);
  assert.match(storeSource, /expectedVoxelDataHash: asset\.contentHashes\.voxelData/);
  assert.match(storeSource, /receipt\.diagnostics\.map\(diagnostic => diagnostic\.message\)/);
  assert.doesNotMatch(storeSource, /paletteAuthorityStore/);

  for (const control of ['selected_entry', 'entry_id', 'display_name', 'material_asset_id', 'catalog_binding_id']) {
    assert.match(panelSource, new RegExp(`data-voxel-palette-control="${control}"`));
  }
  assert.match(panelSource, /data-voxel-palette-action="update"/);
  assert.match(panelSource, /runVoxelMaterialPaletteUpdate\(\)/);
  assert.match(proofSource, /launchNativeBrowserHost/);
  assert.match(proofSource, /rejectedPaletteUpdate/);
  assert.match(proofSource, /Native copper palette/);
});

test('studio voxel transcript evaluation rejects VoxelForge import compatibility and routes Asha-native replay', () => {
  const transcriptDoc = readFileSync(join(repoRoot, 'docs/voxel-agent-operation-transcript-evaluation.md'), 'utf8');
  const runbook = readFileSync(join(repoRoot, 'docs/voxel-live-testing-agent-runbook.md'), 'utf8');

  assert.match(transcriptDoc, /studio_agent_voxel_operation_transcript/);
  assert.match(transcriptDoc, /StudioAgentVoxelWorkflowOperation/);
  assert.match(transcriptDoc, /runAgentVoxelWorkflowOperation/);
  assert.match(transcriptDoc, /not_vforge_file/);
  assert.match(transcriptDoc, /not_mcp_transport/);
  assert.match(transcriptDoc, /not_raw_runtime_bridge_dispatch/);
  assert.match(transcriptDoc, /codex-asha-studio/);
  assert.match(transcriptDoc, /No VoxelForge compatibility task is needed/);
  assert.match(runbook, /voxel-agent-operation-transcript-evaluation/);
  assert.match(runbook, /VoxelForge LLM operation import\/replay/);
});

test('studio voxel operation transcript parser accepts only Asha-native workflow operations', () => {
  const valid = parseStudioAgentVoxelOperationTranscript({
    artifactKind: 'studio_agent_voxel_operation_transcript',
    artifactVersion: 'studio-agent-voxel-operation-transcript.v0',
    producer: { kind: 'agent', id: 'codex-asha-studio' },
    target: { studioSurfaceVersion: 'studio-agent-voxel-workflow.v0', projectBundle: 'asha-testing' },
    operations: [
      {
        operationId: 'configure',
        kind: 'configure_conversion',
        input: {
          patch: {
            sourceAssetId: 'mesh.demo-cube',
            mode: 'surface',
            resolution: [8, 8, 8],
          },
        },
        expected: { accepted: true },
      },
      {
        operationId: 'compact-edit',
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
  assert.equal(valid.accepted, true, valid.diagnostic ?? undefined);
  assert.equal(valid.transcript?.operations.length, 2);
  assert.match(valid.transcriptHash, /^studio-agent-voxel-operation-transcript-/);

  for (const rejected of [
    {
      artifactKind: 'studio_agent_voxel_operation_transcript',
      artifactVersion: 'studio-agent-voxel-operation-transcript.v0',
      producer: { kind: 'agent', id: 'codex-asha-studio' },
      target: { studioSurfaceVersion: 'studio-agent-voxel-workflow.v0' },
      operations: [{ operationId: 'raw', kind: 'configure_conversion', input: { methodName: 'readVoxelModelInfo' } }],
      nonClaims: ['not_vforge_file', 'not_mcp_transport', 'not_raw_runtime_bridge_dispatch', 'not_runtime_authority', 'not_private_studio_state_mutation'],
    },
    {
      artifactKind: 'studio_agent_voxel_operation_transcript',
      artifactVersion: 'studio-agent-voxel-operation-transcript.v0',
      producer: { kind: 'agent', id: 'codex-asha-studio' },
      target: { studioSurfaceVersion: 'studio-agent-voxel-workflow.v0' },
      operations: [{ operationId: 'vforge', kind: 'inspect', input: { vforgePath: 'fixtures/demo.vforge' } }],
      nonClaims: ['not_vforge_file', 'not_mcp_transport', 'not_raw_runtime_bridge_dispatch', 'not_runtime_authority', 'not_private_studio_state_mutation'],
    },
    {
      artifactKind: 'studio_agent_voxel_operation_transcript',
      artifactVersion: 'studio-agent-voxel-operation-transcript.v0',
      producer: { kind: 'agent', id: 'codex-asha-studio' },
      target: { studioSurfaceVersion: 'studio-agent-voxel-workflow.v0' },
      operations: [{
        operationId: 'private',
        kind: 'inspect',
        input: { privateImport: ['@asha/contracts', 'private', 'src', 'generated', 'voxel'].join('/') },
      }],
      nonClaims: ['not_vforge_file', 'not_mcp_transport', 'not_raw_runtime_bridge_dispatch', 'not_runtime_authority', 'not_private_studio_state_mutation'],
    },
  ]) {
    const parsed = parseStudioAgentVoxelOperationTranscript(rejected);
    assert.equal(parsed.accepted, false);
    assert.match(parsed.diagnostic ?? '', /not accepted|unsupported|private|generated|VoxelForge|RuntimeBridge/);
  }
});

test('studio voxel viewport exposes compact edit placement preview from public hit readout', () => {
  const viewportSource = readFileSync(join(repoRoot, 'libs/studio-viewport/src/index.ts'), 'utf8');
  const proofSource = readFileSync(join(repoRoot, 'scripts/proof-native-voxel-runtime-launch.ts'), 'utf8');

  assert.match(viewportSource, /data-voxel-brush-preview-status/);
  assert.match(viewportSource, /voxelCompactEditPlacement\(\)\.status/);
  assert.match(viewportSource, /voxelCompactEditPlacement\(\)\.previewLabel/);
  assert.match(viewportSource, /voxelCompactEditPlacement\(\)\.readoutHash/);
  assert.match(viewportSource, /store\.selectViewportHit/);
  assert.match(viewportSource, /buildStudioViewportHitReadModel/);
  assert.match(viewportSource, /raycastDebugGroup/);

  assert.match(proofSource, /compactVoxelEditPlacementReadout/);
  assert.match(proofSource, /data-voxel-edit-placement-action/);
  assert.match(proofSource, /useViewportHitForCompactVoxelEdit\('start'\)/);
  assert.match(proofSource, /useViewportHitForCompactVoxelEdit\('end'\)/);
  assert.match(proofSource, /studio-voxel-compact-edit-placement-/);
});

test('studio voxel conversion shell maps catalog static meshes to authority mesh refs', () => {
  const shell = buildStudioVoxelConversionWorkspaceShellForInputs({
    draft: sampleStudioVoxelDraft(),
    selectedSource: sampleStudioAsset(),
    sessionId: 'session-1',
    expectedTimelineSequence: 1,
    runtimeSession: sampleRuntimeSession(),
    authorityState: { plan: null, preview: null, receipt: null, evidence: [] },
  });

  assert.equal(shell.workspace.status, 'ready');
  assert.equal(shell.workspace.source.source?.assetId, 'mesh.preview-cube');
  assert.equal(shell.workspace.source.source?.assetKind, 'mesh');
  assert.equal(shell.workspace.source.source?.meshPrimitive, 'default');
  assert.equal(shell.workspace.settings.settings?.transform[0], 1);
  assert.equal(shell.workspace.settings.settings?.transform[12], 0);
  assert.equal(shell.sourceMetadata.selectedSourceAssetId, 'mesh.preview-cube');
  assert.equal(shell.sourceMetadata.sourcePath, 'assets/meshes/preview-cube.mesh.json');
  assert.equal(shell.sourceMetadata.sourceHash, 'sha256:source-v1');
  assert.equal(shell.sourceMetadata.transformScale, 1);
  assert.deepEqual(shell.sourceMetadata.transformTranslation, [0, 0, 0]);
  assert.ok(shell.sourceMetadata.missingPublicFields.includes('mesh_primitive_list'));
  assert.equal(shell.workspace.target?.volumeAssetId, 'voxel/generated');
  assert.equal(shell.planProposal.accepted, true);
  assert.equal(shell.planProposal.proposal?.input.request.source.assetKind, 'mesh');
  assert.equal(shell.planProposal.proposal?.input.request.target.volumeAssetId, 'voxel/generated');
});

test('studio voxel conversion shell rejects unsupported catalog assets after authority mapping', () => {
  const shell = buildStudioVoxelConversionWorkspaceShellForInputs({
    draft: sampleStudioVoxelDraft(),
    selectedSource: sampleStudioAsset({ kind: 'material' }),
    sessionId: 'session-1',
    expectedTimelineSequence: 1,
    runtimeSession: sampleRuntimeSession(),
    authorityState: { plan: null, preview: null, receipt: null, evidence: [] },
  });

  assert.equal(shell.workspace.source.source?.assetKind, 'material');
  assert.equal(shell.planProposal.accepted, false);
  assert.ok(shell.planProposal.diagnostics.some(diagnostic => diagnostic.code === 'unsupported_source_asset'));
});

test('studio voxel conversion workspace exposes projection-only preview and material readouts', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const panelSource = readFileSync(join(repoRoot, 'libs/studio-panels/src/index.ts'), 'utf8');
  const viewportSource = readFileSync(join(repoRoot, 'libs/studio-viewport/src/index.ts'), 'utf8');
  const shell = buildStudioVoxelConversionWorkspaceShellForInputs({
    draft: sampleStudioVoxelDraft({
      materialMap: {
        entries: [
          {
            sourceMaterialSlot: 0,
            sourceMaterialId: 'material.copper',
            voxelMaterial: 7,
          },
        ],
        textureAssets: [
          {
            texture: {
              textureAssetId: 'texture.copper-albedo',
              assetVersion: 1,
              contentHash: 'sha256:texture-copper-albedo',
              width: 2,
              height: 2,
              colorSpace: 'srgb',
              channelLayout: 'rgba8',
            },
            texelMaterials: [7, 7, 8, 8],
          },
        ],
        textureBindings: [
          {
            sourceMaterialSlot: 0,
            texture: {
              textureAssetId: 'texture.copper-albedo',
              assetVersion: 1,
              contentHash: 'sha256:texture-copper-albedo',
              width: 2,
              height: 2,
              colorSpace: 'srgb',
              channelLayout: 'rgba8',
            },
            uvAttribute: {
              attributeName: 'TEXCOORD_0',
              sourceHash: 'sha256:uv0',
            },
            sampleUv: [0.5, 0.5],
            samplingPolicy: 'nearest',
            wrapPolicy: 'repeat',
            materialMode: 'sampled_palette',
          },
        ],
        defaultVoxelMaterial: null,
      },
    }),
    selectedSource: sampleStudioAsset(),
    sessionId: 'session-1',
    expectedTimelineSequence: 1,
    runtimeSession: sampleRuntimeSession(),
    authorityState: { plan: null, preview: null, receipt: null, evidence: [] },
  });
  const sampledRow = shell.previewProjection.materialRows[0];

  assert.match(storeSource, /buildVoxelConversionPreviewProjection/);
  assert.equal(sampledRow?.samplingStatus, 'texture_sampled');
  assert.equal(sampledRow?.textureAssetId, 'texture.copper-albedo');
  assert.equal(sampledRow?.textureContentHash, 'sha256:texture-copper-albedo');
  assert.equal(sampledRow?.uvAttributeName, 'TEXCOORD_0');
  assert.equal(sampledRow?.uvAttributeHash, 'sha256:uv0');
  assert.deepEqual(sampledRow?.sampleUv, [0.5, 0.5]);
  assert.equal(sampledRow?.samplingPolicy, 'nearest');
  assert.equal(sampledRow?.wrapPolicy, 'repeat');
  assert.equal(sampledRow?.materialMode, 'sampled_palette');
  assert.match(storeSource, /previewProjection/);
  assert.match(storeSource, /texture_sampled/);
  assert.match(storeSource, /flat_material/);
  assert.match(storeSource, /projection_only/);
  assert.match(storeSource, /stale/);
  assert.match(storeSource, /Browser\/Three preview is display evidence only/);
  assert.match(panelSource, /data-voxel-preview-status/);
  assert.match(panelSource, /data-voxel-preview-state/);
  assert.match(panelSource, /data-voxel-material-slot/);
  assert.match(panelSource, /data-voxel-material-sampling/);
  assert.match(panelSource, /data-voxel-material-texture/);
  assert.match(panelSource, /data-voxel-material-uv/);
  assert.match(panelSource, /data-voxel-material-authoring-can-catalog-bind/);
  assert.match(panelSource, /data-voxel-material-authoring-source/);
  assert.match(panelSource, /data-voxel-material-authoring-material/);
  assert.match(panelSource, /data-voxel-material-authoring-status/);
  assert.match(panelSource, /missingEngineFields/);
  assert.match(viewportSource, /data-voxel-viewport-preview-status/);
  assert.match(viewportSource, /no upstream preview evidence/);
});

test('studio voxel conversion workspace exposes command timeline and evidence rows', () => {
  const storeSource = readFileSync(join(repoRoot, 'libs/studio-store/src/index.ts'), 'utf8');
  const panelSource = readFileSync(join(repoRoot, 'libs/studio-panels/src/index.ts'), 'utf8');

  for (const builder of [
    'buildStudioVoxelConversionPlanProposal',
    'buildStudioVoxelConversionPreviewProposal',
    'buildStudioVoxelConversionApplyProposal',
    'buildStudioVoxelConversionEvidenceExportProposal',
  ]) {
    assert.match(storeSource, new RegExp(builder));
  }
  assert.match(storeSource, /commandTimeline/);
  assert.match(storeSource, /evidenceRows/);
  assert.match(storeSource, /buildVoxelConversionTimelineRows/);
  assert.match(storeSource, /buildVoxelConversionEvidenceRows/);
  assert.match(storeSource, /submitVoxelConversionCommand/);
  assert.match(storeSource, /runtimeSessionFacadeState/);
  assert.match(panelSource, /data-voxel-timeline-command/);
  assert.match(panelSource, /data-voxel-evidence-kind/);
  assert.match(panelSource, /data-voxel-evidence-status/);
  assert.match(panelSource, /\(click\)="store\.submitVoxelConversionCommand\(action\.commandId\)"/);
  assert.match(panelSource, /proposalAccepted/);
});

test('studio boundary check rejects forbidden voxel conversion import shapes', () => {
  const forbiddenSpecifiers = [
    ['@asha', 'native-bridge'].join('/'),
    ['@asha', 'contracts', 'src', 'generated', 'voxelConversion'].join('/'),
    ['..', 'asha', 'engine-rs', 'crates', 'protocol'].join('/'),
    ['..', 'voxelforge', 'src', 'VoxelForge'].join('/'),
    ['@voxelforge', 'conversion'].join('/'),
  ];

  for (const specifier of forbiddenSpecifiers) {
    const workspaceRoot = writeProbeWorkspace(specifier);
    try {
      const result = runBoundaryCheck(workspaceRoot);
      assert.notEqual(result.status, 0, `expected ${specifier} to fail boundary check`);
      assert.match(result.stderr, /Boundary check failed:/);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  }
});

test('studio boundary check rejects MCP-shaped successor wrapper text', () => {
  const workspaceRoot = writeProbeWorkspace('@asha/contracts');
  try {
    writeFileSync(
      join(workspaceRoot, 'libs/probe/src/index.ts'),
      `export const wrapper = '${mcpWrapperText}';\nexport const hatch = '${successorMcpText}';\n`,
    );
    const result = runBoundaryCheck(workspaceRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Boundary check failed:/);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test('studio boundary check rejects require and dynamic import bypass shapes', () => {
  const workspaceRoot = writeProbeWorkspace('@asha/contracts');
  const nativeBridgeSpecifier = ['@asha', 'native-bridge'].join('/');
  const generatedSpecifierPrefix = ['@asha', 'contracts', 'src'].join('/');
  const generatedSpecifierSuffix = ['generated', 'voxelConversion'].join('/');
  const privateSpecifier = ['@asha', 'contracts', 'private'].join('/');
  const requireProbe = [
    'export const bridge = ',
    'require',
    "('@asha/' + 'native-bridge');",
  ].join('');
  const dynamicProbe = [
    'export const generated = ',
    'import',
    `('${generatedSpecifierPrefix}/' + '${generatedSpecifierSuffix}');`,
  ].join('');
  const templateImportProbe = [
    'export const privateContracts = ',
    'import',
    '(`',
    privateSpecifier,
    '`);',
  ].join('');
  try {
    writeFileSync(
      join(workspaceRoot, 'libs/probe/src/index.ts'),
      [
        "declare const require: (specifier: string) => unknown;",
        requireProbe,
        dynamicProbe,
        templateImportProbe,
      ].join('\n'),
    );
    const result = runBoundaryCheck(workspaceRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`forbidden import specifier: ${nativeBridgeSpecifier}`));
    assert.match(result.stderr, new RegExp(['forbidden import pattern @asha', '[*]', 'src', '[*]'].join('/')));
    assert.match(result.stderr, new RegExp(`non-approved ASHA package import for asha-studio: ${privateSpecifier}`));
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test('studio boundary check rejects dependency and config path indirection', () => {
  const workspaceRoot = writeProbeWorkspace('@asha/contracts');
  const generatedContractPath = ['..', 'asha-engine', 'ts', 'packages', 'contracts', generatedSourceFragment, 'voxelConversion.ts'].join('/');
  const generatedNodeModulesPath = ['node_modules', '@asha', 'contracts', generatedSourceFragment, 'voxelConversion.ts'].join('/');
  const runtimeBridgePackage = ['@asha', 'runtime-bridge'].join('/');
  try {
    writeFileSync(
      join(workspaceRoot, 'package.json'),
      JSON.stringify({
        type: 'module',
        dependencies: {
          '@asha/contracts': 'link:../asha-engine/ts/packages/contracts',
          '@asha/runtime-bridge': 'link:../asha-engine/ts/packages/runtime-bridge',
          '@asha/command-registry': 'link:../asha-engine/ts/packages/command-registry',
        },
        pnpm: {
          overrides: {
            '@asha/runtime-bridge': 'file:../asha-engine/ts/packages/runtime-bridge',
          },
        },
      }),
    );
    writeFileSync(
      join(workspaceRoot, 'pnpm-workspace.yaml'),
      [
        'packages:',
        "  - 'libs/*'",
        'pnpm:',
        '  overrides:',
        `    '${runtimeBridgePackage}': npm:@evil/runtime-bridge@1.0.0`,
      ].join('\n'),
    );
    writeFileSync(
      join(workspaceRoot, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          paths: {
            '@asha/contracts/generated': [generatedContractPath],
            '#generatedContracts': [generatedNodeModulesPath],
          },
        },
      }),
    );
    const result = runBoundaryCheck(workspaceRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pnpm\.overrides\.@asha\/runtime-bridge must use approved local package link/);
    assert.match(result.stderr, /pnpm-workspace\.yaml: pnpm\.overrides\.@asha\/runtime-bridge must use approved local package link/);
    assert.match(result.stderr, /tsconfig\.json: forbidden config path fragment/);
    assert.match(result.stderr, /tsconfig\.json: forbidden text: src\/generated/);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test('phase 4 voxel conversion fixtures match Asha-native golden coverage', () => {
  const fixtureText = readFileSync(phase4FixturePath, 'utf8');
  const fixtureSet = loadPhase4Fixtures();
  const golden = JSON.parse(readFileSync(phase4GoldenPath, 'utf8'));
  const summary = {
    schemaVersion: 1,
    artifactKind: 'studio_voxel_conversion_phase4_golden_summary',
    sourceFixture: 'fixtures/voxel-conversion/phase4-cases.json',
    fixtureSet: {
      schemaVersion: fixtureSet.schemaVersion,
      artifactKind: fixtureSet.artifactKind,
      sourcePosture: fixtureSet.provenance.sourcePosture,
      predecessorEvidence: fixtureSet.provenance.predecessorEvidence,
      nonClaims: fixtureSet.provenance.nonClaims,
    },
    cases: fixtureSet.cases.map(summarizePhase4Case),
  };

  assert.deepEqual(
    fixtureSet.cases.map(fixtureCase => fixtureCase.id),
    [
      'synthetic_quad_surface_shell',
      'synthetic_colored_cube_solid',
      'synthetic_two_material_slots',
      'synthetic_transform_fit',
      'bad_source_unsupported',
      'oversized_output_rejection',
      'invalid_material_map',
      'stale_source_hash_rejection',
    ],
  );
  assert.equal(fixtureText.includes('/home/dev/voxelforge'), false);
  assert.equal(fixtureText.includes(mcpWrapperText), false);
  assert.ok(fixtureSet.provenance.nonClaims.includes('not_voxelforge_runtime'));
  assert.ok(fixtureSet.cases.every(fixtureCase => fixtureCase.licensePosture.includes('Asha-authored')));
  assert.deepEqual(summary, golden);
});

test('phase 4 voxel conversion product proof artifact is inspectable and current', () => {
  const artifact = JSON.parse(readFileSync(phase4ProductProofPath, 'utf8'));
  const { artifactHash, ...withoutHash } = artifact;

  assert.equal(artifact.artifactKind, 'studio_voxel_conversion_phase4_product_proof');
  assert.equal(artifact.proofCase.id, 'synthetic_colored_cube_solid');
  assert.equal(artifact.workflow.plan.accepted, true);
  assert.equal(artifact.workflow.preview.accepted, true);
  assert.equal(artifact.workflow.apply.accepted, true);
  assert.equal(artifact.workflow.exportEvidence.accepted, true);
  assert.equal(artifact.readout.status, 'ready');
  assert.equal(artifact.readout.authorityPosture, 'authority_backed');
  assert.equal(artifact.readout.receipt.outputHash, 'sha256:phase4-cube-output');
  assert.equal(artifact.comparison.afterOutputHash, 'sha256:phase4-cube-output');
  assert.equal(artifact.comparison.outputBoundsSummary, '0,0,0..3,3,3');
  assert.ok(artifact.validations.includes('negative_stale_source_hash_failed_closed'));
  assert.equal(artifact.negativeSmokes.at(0)?.accepted, false);
  assert.ok(artifact.nonClaims.includes('not_voxelforge_runtime'));
  assert.ok(artifact.nonClaims.includes('fixture_backed_until_runtime_authority_4479_lands'));
  assert.equal(artifactHash, sha256Json(withoutHash));
});

test('phase 4 voxel conversion before/after comparison agrees across machine and human artifacts', () => {
  const comparison = JSON.parse(readFileSync(phase4ComparisonPath, 'utf8'));
  const markdown = readFileSync(phase4ComparisonMarkdownPath, 'utf8');
  const { artifactHash, ...withoutHash } = comparison;

  assert.equal(comparison.artifactKind, 'studio_voxel_conversion_phase4_before_after_comparison');
  assert.equal(comparison.before.sourceHash, 'sha256:phase4-cube-source-v1');
  assert.equal(comparison.before.settings.mode, 'solid');
  assert.equal(comparison.after.receiptOutputHash, 'sha256:phase4-cube-output');
  assert.equal(comparison.after.outputVoxelCount, 64);
  assert.equal(comparison.after.outputBoundsSummary, '0,0,0..3,3,3');
  assert.deepEqual(comparison.after.materialIds, [2]);
  assert.deepEqual(Object.values(comparison.agreement), [true, true, true, true, true, true]);
  assert.ok(comparison.projectionCaveats.some((caveat: string) => caveat.includes('not browser-rendered imagery')));
  assert.ok(comparison.nonClaims.includes('not_browser_render_capture'));
  assert.equal(artifactHash, sha256Json(withoutHash));
  assert.ok(markdown.includes(`Artifact hash: ${artifactHash}`));
  assert.ok(markdown.includes('Source hash: sha256:phase4-cube-source-v1'));
  assert.ok(markdown.includes('Receipt output hash: sha256:phase4-cube-output'));
  assert.ok(markdown.includes('Output bounds: 0,0,0..3,3,3'));
  assert.ok(markdown.includes('fixture-backed readout evidence'));
});

test('voxel conversion workspace read model marks valid inputs plan-ready', () => {
  const readout = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });

  assert.equal(readout.status, 'ready');
  assert.equal(readout.source.status, 'selected');
  assert.equal(readout.settings.status, 'valid');
  assert.equal(readout.settings.requestedOutputVoxels, 512);
  assert.equal(readout.operations.plan.status, 'ready');
  assert.equal(readout.operations.preview.status, 'blocked');
  assert.match(readout.readoutHash, /^voxel-conversion-readout-/);
  assert.ok(readout.nonClaims.includes('not_mesh_voxelizer'));
});

test('voxel conversion workspace read model fails closed without a source', () => {
  const readout = buildStudioVoxelConversionWorkspaceReadModel({
    source: null,
    target: sampleTarget(),
    settings: sampleSettings(),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });

  assert.equal(readout.status, 'incomplete');
  assert.equal(readout.source.status, 'missing');
  assert.equal(readout.operations.plan.status, 'blocked');
  assert.ok(readout.diagnostics.some(diagnostic => diagnostic.code === 'missing_source'));
});

test('voxel conversion workspace read model detects stale source hash readback', () => {
  const plannedSource = sampleSource({ sourceHash: 'sha256:source-v1' });
  const currentSource = sampleSource({ sourceHash: 'sha256:source-v2' });
  const readout = buildStudioVoxelConversionWorkspaceReadModel({
    source: currentSource,
    target: sampleTarget(),
    settings: sampleSettings(),
    plan: samplePlan(plannedSource),
    preview: null,
    receipt: null,
    evidence: [],
  });

  assert.equal(readout.status, 'stale');
  assert.equal(readout.source.status, 'stale');
  assert.ok(readout.diagnostics.some(diagnostic => diagnostic.code === 'source_hash_mismatch'));
});

test('voxel conversion workspace read model accepts native plan settings with stable key order', () => {
  const source = sampleSource();
  const target = sampleTarget();
  const settings = sampleSettings();
  const nativeOrderedSettings: VoxelConversionSettings = {
    ...settings,
    materialMap: {
      entries: settings.materialMap.entries,
      defaultVoxelMaterial: settings.materialMap.defaultVoxelMaterial,
    },
  };
  const plan = {
    ...samplePlan(source, nativeOrderedSettings),
    target,
  };
  const readout = buildStudioVoxelConversionWorkspaceReadModel({
    source,
    target,
    settings,
    plan,
    preview: null,
    receipt: null,
    evidence: [],
  });

  assert.equal(readout.status, 'ready');
  assert.equal(readout.operations.plan.status, 'complete');
  assert.equal(readout.operations.preview.status, 'ready');
  assert.ok(!readout.diagnostics.some(diagnostic => diagnostic.code === 'stale_plan'));
});

test('voxel conversion workspace read model detects stale target and settings authority plans', () => {
  const source = sampleSource();
  const plan = samplePlan(source, sampleSettings());
  const readout = buildStudioVoxelConversionWorkspaceReadModel({
    source,
    target: sampleTarget({ origin: { x: 1, y: 0, z: 0 } }),
    settings: sampleSettings({ resolution: [4, 4, 4] }),
    plan,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const previewProposal = buildStudioVoxelConversionPreviewProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 8,
    workspace: readout,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.equal(readout.status, 'stale');
  assert.equal(readout.operations.plan.status, 'stale');
  assert.equal(readout.operations.preview.status, 'blocked');
  assert.ok(readout.diagnostics.some(diagnostic =>
    diagnostic.code === 'stale_plan' && diagnostic.reference === 'target',
  ));
  assert.ok(readout.diagnostics.some(diagnostic =>
    diagnostic.code === 'stale_plan' && diagnostic.reference === 'settings',
  ));
  assert.equal(previewProposal.accepted, false);
  assert.ok(previewProposal.diagnostics.some(diagnostic => diagnostic.code === 'stale_plan'));
});

test('voxel conversion workspace read model rejects invalid material maps', () => {
  const readout = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings({
      materialMap: {
        defaultVoxelMaterial: null,
        entries: [
          {
            sourceMaterialSlot: 0,
            sourceMaterialId: 'material.copper',
            voxelMaterial: 1,
          },
          {
            sourceMaterialSlot: 0,
            sourceMaterialId: 'material.tin',
            voxelMaterial: 2,
          },
        ],
      },
    }),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });

  assert.equal(readout.status, 'invalid');
  assert.equal(readout.settings.status, 'invalid');
  assert.equal(readout.operations.plan.status, 'blocked');
  assert.ok(readout.diagnostics.some(diagnostic => diagnostic.code === 'invalid_material_map'));
});

test('voxel conversion workspace read model rejects oversized output preflight', () => {
  const readout = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings({
      resolution: [32, 32, 32],
      maxOutputVoxels: 512,
    }),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });

  assert.equal(readout.status, 'limit_exceeded');
  assert.equal(readout.settings.status, 'limit_exceeded');
  assert.equal(readout.settings.requestedOutputVoxels, 32768);
  assert.ok(readout.diagnostics.some(diagnostic => diagnostic.code === 'output_limit_exceeded'));
});

test('voxel conversion proposal builders produce typed plan preview apply export payloads', () => {
  const source = sampleSource();
  const target = sampleTarget();
  const settings = sampleSettings();
  const plan = samplePlan(source, settings);
  const preview = samplePreview(plan);
  const planWorkspace = buildStudioVoxelConversionWorkspaceReadModel({
    source,
    target,
    settings,
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const authorityWorkspace = buildStudioVoxelConversionWorkspaceReadModel({
    source,
    target,
    settings,
    plan,
    preview,
    receipt: null,
    evidence: [sampleEvidence('diagnostics')],
  });

  const planProposal = buildStudioVoxelConversionPlanProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 7,
    workspace: planWorkspace,
    runtimeSession: sampleRuntimeSession(),
  });
  const previewProposal = buildStudioVoxelConversionPreviewProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 8,
    workspace: buildStudioVoxelConversionWorkspaceReadModel({
      source,
      target,
      settings,
      plan,
      preview: null,
      receipt: null,
      evidence: [],
    }),
    runtimeSession: sampleRuntimeSession(),
  });
  const applyProposal = buildStudioVoxelConversionApplyProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 9,
    workspace: authorityWorkspace,
    runtimeSession: sampleRuntimeSession(),
  });
  const exportProposal = buildStudioVoxelConversionEvidenceExportProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 10,
    workspace: authorityWorkspace,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.equal(planProposal.accepted, true);
  assert.equal(planProposal.proposal?.input.request.source.sourceHash, 'sha256:source-v1');
  assert.equal(planProposal.proposal?.input.request.settings.materialMap.defaultVoxelMaterial, 1);
  assert.equal(planProposal.proposal?.expectedTimelineSequence, 7);
  assert.deepEqual(planProposal.proposal?.evidenceExpectations, ['voxel_conversion_plan']);
  assert.equal(previewProposal.proposal?.input.request.expectedPlanHash, 'sha256:plan');
  assert.equal(applyProposal.proposal?.input.request.expectedPreviewHash, 'sha256:preview-output');
  assert.equal(exportProposal.proposal?.input.evidence.length, 3);
  assert.equal(exportProposal.proposal?.commandMetadata.inputSchemaName, 'VoxelConversionEvidenceExportInput');
});

test('voxel conversion proposal builders reject stale preview and apply guards', () => {
  const plan = samplePlan();
  const stalePreview = {
    ...samplePreview(plan),
    planId: 'stale-plan',
  };
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan,
    preview: stalePreview,
    receipt: null,
    evidence: [],
  });
  const applyProposal = buildStudioVoxelConversionApplyProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 11,
    workspace,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.equal(workspace.operations.preview.status, 'stale');
  assert.equal(applyProposal.accepted, false);
  assert.equal(applyProposal.proposal, null);
  assert.ok(applyProposal.diagnostics.some(diagnostic => diagnostic.code === 'stale_preview'));
});

test('voxel conversion proposal builders reject invalid material maps without partial payloads', () => {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings({
      materialMap: {
        defaultVoxelMaterial: null,
        entries: [
          {
            sourceMaterialSlot: -1,
            sourceMaterialId: 'material.bad',
            voxelMaterial: 0,
          },
        ],
      },
    }),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const proposal = buildStudioVoxelConversionPlanProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 12,
    workspace,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.equal(proposal.accepted, false);
  assert.equal(proposal.proposal, null);
  assert.ok(proposal.diagnostics.some(diagnostic => diagnostic.code === 'invalid_material_map'));
});

test('voxel conversion proposal builders reject omitted runtime capability', () => {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const proposal = buildStudioVoxelConversionPlanProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 13,
    workspace,
  });

  assert.equal(proposal.accepted, false);
  assert.equal(proposal.proposal, null);
  assert.ok(proposal.diagnostics.some(diagnostic => diagnostic.code === 'runtime_facade_unavailable'));
});

test('voxel conversion proposal builders reject incomplete runtime capability', () => {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const proposal = buildStudioVoxelConversionPlanProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 14,
    workspace,
    runtimeSession: {},
  });

  assert.equal(proposal.accepted, false);
  assert.equal(proposal.proposal, null);
  assert.ok(proposal.diagnostics.some(diagnostic => diagnostic.code === 'runtime_facade_unavailable'));
});

test('voxel conversion proposal builders reject unsupported source assets', () => {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource({ assetKind: 'skinned_mesh' }),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const proposal = buildStudioVoxelConversionPlanProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 15,
    workspace,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.equal(proposal.accepted, false);
  assert.equal(proposal.proposal, null);
  assert.ok(proposal.diagnostics.some(diagnostic => diagnostic.code === 'unsupported_source_asset'));
});

test('voxel conversion readout fails closed when runtime operations are unavailable', () => {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const readout = buildStudioVoxelConversionReadoutModel({
    workspace,
    runtimeSession: {},
  });

  assert.equal(readout.status, 'failed_closed');
  assert.equal(readout.authorityPosture, 'failed_closed');
  assert.ok(readout.diagnostics.some(diagnostic => diagnostic.code === 'runtime_facade_unavailable'));
});

test('voxel conversion readout fails closed when runtime operations are omitted', () => {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const readout = buildStudioVoxelConversionReadoutModel({ workspace });

  assert.equal(readout.status, 'failed_closed');
  assert.equal(readout.authorityPosture, 'failed_closed');
  assert.ok(readout.diagnostics.some(diagnostic => diagnostic.code === 'runtime_facade_unavailable'));
});

test('voxel conversion readout preserves upstream operation-unimplemented diagnostics', () => {
  const plan = {
    ...samplePlan(),
    diagnostics: [
      {
        code: 'operation_unimplemented' as const,
        severity: 'error' as const,
        reference: 'runtime.planVoxelConversion',
        message: 'Runtime operation is not implemented.',
      },
    ],
  };
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const readout = buildStudioVoxelConversionReadoutModel({
    workspace,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.equal(readout.status, 'degraded');
  assert.ok(readout.diagnostics.some(
    diagnostic => diagnostic.source === 'upstream' && diagnostic.code === 'operation_unimplemented',
  ));
});

test('voxel conversion readout normalizes invalid material map diagnostics', () => {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings({
      materialMap: {
        defaultVoxelMaterial: 0,
        entries: [],
      },
    }),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const readout = buildStudioVoxelConversionReadoutModel({
    workspace,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.equal(readout.status, 'degraded');
  assert.ok(readout.diagnostics.some(
    diagnostic => diagnostic.source === 'studio' && diagnostic.code === 'invalid_material_map',
  ));
});

test('voxel conversion readout normalizes unsupported source and oversized output diagnostics', () => {
  const unsupportedWorkspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource({ assetKind: 'skinned_mesh' }),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const oversizedWorkspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings({
      resolution: [64, 64, 64],
      maxOutputVoxels: 2048,
    }),
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });

  const unsupportedReadout = buildStudioVoxelConversionReadoutModel({
    workspace: unsupportedWorkspace,
    runtimeSession: sampleRuntimeSession(),
  });
  const oversizedReadout = buildStudioVoxelConversionReadoutModel({
    workspace: oversizedWorkspace,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.ok(unsupportedReadout.diagnostics.some(diagnostic => diagnostic.code === 'unsupported_source_asset'));
  assert.ok(oversizedReadout.diagnostics.some(diagnostic => diagnostic.code === 'output_limit_exceeded'));
});

test('voxel conversion readout preserves stale authority snapshot diagnostics', () => {
  const plan = samplePlan();
  const preview = samplePreview(plan);
  const receipt = {
    ...sampleReceipt(plan),
    diagnostics: [
      {
        code: 'stale_authority_snapshot' as const,
        severity: 'error' as const,
        reference: 'authority.snapshot',
        message: 'Authority snapshot changed before apply.',
      },
    ],
  };
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan,
    preview,
    receipt,
    evidence: [],
  });
  const readout = buildStudioVoxelConversionReadoutModel({
    workspace,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.equal(readout.receipt.applied, true);
  assert.ok(readout.diagnostics.some(
    diagnostic => diagnostic.source === 'upstream' && diagnostic.code === 'stale_authority_snapshot',
  ));
});

test('voxel conversion readout preserves conversion replay mismatch diagnostics and evidence refs', () => {
  const plan = samplePlan();
  const preview = samplePreview(plan);
  const receipt = {
    ...sampleReceipt(plan),
    diagnostics: [
      {
        code: 'conversion_replay_mismatch' as const,
        severity: 'error' as const,
        reference: 'replay.outputHash',
        message: 'Replay output hash did not match apply receipt.',
      },
    ],
  };
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: sampleSource(),
    target: sampleTarget(),
    settings: sampleSettings(),
    plan,
    preview,
    receipt,
    evidence: [],
  });
  const readout = buildStudioVoxelConversionReadoutModel({
    workspace,
    runtimeSession: sampleRuntimeSession(),
  });

  assert.equal(readout.authorityPosture, 'authority_backed');
  assert.ok(readout.evidence.some(evidence => evidence.kind === 'apply_receipt'));
  assert.ok(readout.diagnostics.some(
    diagnostic => diagnostic.source === 'upstream' && diagnostic.code === 'conversion_replay_mismatch',
  ));
});

test('voxel conversion workspace Phase 3 production shell negative matrix stays fail-closed and inspectable', () => {
  const runtimeSession = sampleRuntimeSession();
  const plan = sampleStudioAuthorityPlan();
  const stalePreview = { ...samplePreview(plan), planId: 'stale-plan' };
  const cases = [
    {
      name: 'missing runtime metadata',
      draft: sampleStudioVoxelDraft(),
      asset: sampleStudioAsset(),
      runtimeSession: null,
      authorityState: { plan: null, preview: null, receipt: null, evidence: [] },
      expectedCode: 'runtime_facade_unavailable',
      expectedBlockedCommand: 'voxel_conversion.plan',
    },
    {
      name: 'invalid material map',
      draft: sampleStudioVoxelDraft({
        materialMap: {
          defaultVoxelMaterial: 0,
          entries: [{ sourceMaterialSlot: 0, sourceMaterialId: 'material.bad', voxelMaterial: 0 }],
        },
      }),
      asset: sampleStudioAsset(),
      runtimeSession,
      authorityState: { plan: null, preview: null, receipt: null, evidence: [] },
      expectedCode: 'invalid_material_map',
      expectedBlockedCommand: 'voxel_conversion.plan',
    },
    {
      name: 'unsupported source',
      draft: sampleStudioVoxelDraft(),
      asset: sampleStudioAsset({ kind: 'material' }),
      runtimeSession,
      authorityState: { plan: null, preview: null, receipt: null, evidence: [] },
      expectedCode: 'unsupported_source_asset',
      expectedBlockedCommand: 'voxel_conversion.plan',
    },
    {
      name: 'oversized conversion',
      draft: sampleStudioVoxelDraft({ resolution: [32, 32, 32], maxOutputVoxels: 128 }),
      asset: sampleStudioAsset(),
      runtimeSession,
      authorityState: { plan: null, preview: null, receipt: null, evidence: [] },
      expectedCode: 'output_limit_exceeded',
      expectedBlockedCommand: 'voxel_conversion.plan',
    },
    {
      name: 'stale preview',
      draft: sampleStudioVoxelDraft(),
      asset: sampleStudioAsset(),
      runtimeSession,
      authorityState: { plan, preview: stalePreview, receipt: null, evidence: [] },
      expectedCode: 'stale_preview',
      expectedBlockedCommand: 'voxel_conversion.apply',
    },
    {
      name: 'failed export evidence',
      draft: sampleStudioVoxelDraft(),
      asset: sampleStudioAsset(),
      runtimeSession,
      authorityState: { plan: null, preview: null, receipt: null, evidence: [] },
      expectedCode: 'missing_evidence',
      expectedBlockedCommand: 'voxel_conversion.export_evidence',
    },
  ];

  for (const entry of cases) {
    const shell = buildStudioVoxelConversionWorkspaceShellForInputs({
      draft: entry.draft,
      selectedSource: entry.asset,
      sessionId: 'session-1',
      expectedTimelineSequence: 1,
      runtimeSession: entry.runtimeSession,
      authorityState: entry.authorityState,
    });
    if (entry.name === 'missing runtime metadata') {
      assert.equal(shell.readout.status, 'failed_closed', entry.name);
    }
    assert.ok(shell.readout.diagnostics.some(diagnostic => diagnostic.code === entry.expectedCode), entry.name);
    assert.equal(
      shell.actions.find(action => action.commandId === entry.expectedBlockedCommand)?.accepted,
      false,
      entry.name,
    );
    assert.ok(shell.readout.nonClaims.includes('not_conversion_authority'), entry.name);
    if (entry.name !== 'missing runtime metadata') {
      assert.equal(
        shell.readout.diagnostics.some(diagnostic => diagnostic.code === 'runtime_facade_unavailable'),
        false,
        entry.name,
      );
    }
  }
});

test('voxel conversion workspace Phase 3 production shell reaches staged authority-backed happy path', () => {
  const runtimeSession = sampleRuntimeSession();
  const draft = sampleStudioVoxelDraft();
  const asset = sampleStudioAsset();
  const plan = sampleStudioAuthorityPlan();
  const preview = samplePreview(plan);
  const receipt = sampleReceipt(plan);
  const stages = [
    {
      commandId: 'voxel_conversion.plan',
      shell: buildStudioVoxelConversionWorkspaceShellForInputs({
        draft,
        selectedSource: asset,
        sessionId: 'session-1',
        expectedTimelineSequence: 1,
        runtimeSession,
        authorityState: { plan: null, preview: null, receipt: null, evidence: [] },
      }),
    },
    {
      commandId: 'voxel_conversion.preview',
      shell: buildStudioVoxelConversionWorkspaceShellForInputs({
        draft,
        selectedSource: asset,
        sessionId: 'session-1',
        expectedTimelineSequence: 2,
        runtimeSession,
        authorityState: { plan, preview: null, receipt: null, evidence: [] },
      }),
    },
    {
      commandId: 'voxel_conversion.apply',
      shell: buildStudioVoxelConversionWorkspaceShellForInputs({
        draft,
        selectedSource: asset,
        sessionId: 'session-1',
        expectedTimelineSequence: 3,
        runtimeSession,
        authorityState: { plan, preview, receipt: null, evidence: [] },
      }),
    },
    {
      commandId: 'voxel_conversion.export_evidence',
      shell: buildStudioVoxelConversionWorkspaceShellForInputs({
        draft,
        selectedSource: asset,
        sessionId: 'session-1',
        expectedTimelineSequence: 4,
        runtimeSession,
        authorityState: { plan, preview, receipt, evidence: [sampleEvidence('diagnostics')] },
      }),
    },
  ];
  const finalShell = stages.at(-1)?.shell;

  assert.deepEqual(
    stages.map(stage => stage.shell.actions.find(action => action.commandId === stage.commandId)?.accepted),
    [true, true, true, true],
  );
  assert.deepEqual(
    stages.map(stage => stage.shell.commandTimeline.find(row => row.commandId === stage.commandId)?.proposalAccepted),
    [true, true, true, true],
  );
  assert.equal(finalShell?.runtimeAttached, true);
  assert.equal(finalShell?.readout.status, 'ready');
  assert.equal(finalShell?.readout.authorityPosture, 'authority_backed');
  assert.equal(finalShell?.previewProjection.previewHash, 'sha256:preview-output');
  assert.ok(finalShell?.evidenceRows.some(evidence => evidence.kind === 'apply_receipt'));
  assert.ok(stages[2]?.shell.actions.find(action => action.commandId === 'voxel_conversion.apply')?.reason.includes('Asha runtime facade'));
});

test('voxel conversion Phase 2 golden consumer proof is inspectable without successor wrappers', () => {
  const source = sampleSource();
  const target = sampleTarget();
  const settings = sampleSettings();
  const plan = samplePlan(source, settings);
  const preview = samplePreview(plan);
  const receipt = sampleReceipt(plan);
  const authorityWorkspace = buildStudioVoxelConversionWorkspaceReadModel({
    source,
    target,
    settings,
    plan,
    preview,
    receipt,
    evidence: [],
  });
  const planWorkspace = buildStudioVoxelConversionWorkspaceReadModel({
    source,
    target,
    settings,
    plan: null,
    preview: null,
    receipt: null,
    evidence: [],
  });
  const readout = buildStudioVoxelConversionReadoutModel({
    workspace: authorityWorkspace,
    runtimeSession: sampleRuntimeSession(),
  });
  const proposal = buildStudioVoxelConversionPlanProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 20,
    workspace: planWorkspace,
    runtimeSession: sampleRuntimeSession(),
  });
  const proof = {
    schemaVersion: 1,
    library: '@asha-studio/voxel-conversion',
    readout: {
      status: readout.status,
      authorityPosture: readout.authorityPosture,
      receipt: readout.receipt,
      diagnosticCodes: readout.diagnostics.map(diagnostic => diagnostic.code),
      evidence: readout.evidence.map(evidence => `${evidence.source}:${evidence.kind}`),
    },
    proposal: {
      accepted: proposal.accepted,
      commandId: proposal.proposal?.commandId,
      inputSchemaName: proposal.proposal?.commandMetadata.inputSchemaName,
      outputSchemaName: proposal.proposal?.commandMetadata.outputSchemaName,
      evidenceExpectations: proposal.proposal?.evidenceExpectations,
    },
    boundary: {
      forbiddenProbeCount: 11,
    },
  };
  const golden = JSON.parse(
    readFileSync(
      join(repoRoot, 'test/fixtures/studio-voxel-conversion-phase2-readout.golden.json'),
      'utf8',
    ),
  );

  assert.deepEqual(proof, golden);
});
