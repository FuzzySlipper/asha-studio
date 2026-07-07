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
  buildStudioVoxelConversionWorkspaceShellForInputs,
  type StudioVoxelConversionSettingsDraft,
} from '@asha-studio/store';
import type { StudioAssetInventoryEntryReadModel } from '@asha-studio/domain';
import type {
  VoxelConversionEvidenceRef,
  VoxelConversionPlan,
  VoxelConversionPreview,
  VoxelConversionReceipt,
  VoxelConversionSettings,
  VoxelConversionSourceRef,
  VoxelConversionTargetRef,
} from '@asha/contracts';
import type { RuntimeSessionFacade } from '@asha/runtime-bridge';

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

  assert.match(storeSource, /buildVoxelConversionPreviewProjection/);
  assert.match(storeSource, /previewProjection/);
  assert.match(storeSource, /projection_only/);
  assert.match(storeSource, /stale/);
  assert.match(storeSource, /Browser\/Three preview is display evidence only/);
  assert.match(panelSource, /data-voxel-preview-status/);
  assert.match(panelSource, /data-voxel-preview-state/);
  assert.match(panelSource, /data-voxel-material-slot/);
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
  assert.equal(previewProposal.proposal?.input.request.expectedPlanHash, 'sha256:settings');
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
