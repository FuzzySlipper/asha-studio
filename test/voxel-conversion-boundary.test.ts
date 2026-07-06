import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  buildStudioVoxelConversionWorkspaceReadModel,
} from '@asha-studio/voxel-conversion';
import type {
  VoxelConversionEvidenceRef,
  VoxelConversionPlan,
  VoxelConversionPreview,
  VoxelConversionSettings,
  VoxelConversionSourceRef,
  VoxelConversionTargetRef,
} from '@asha/contracts';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const boundaryScript = join(repoRoot, 'scripts/check-boundaries.mjs');
const publicSurfaceManifest = JSON.parse(
  readFileSync(join(repoRoot, '../asha/harness/public-surface/ts-packages.json'), 'utf8'),
);
const ashaSourceRoot = ['', 'home', 'dev', 'asha'].join('/');
const ashaEngineRoot = [ashaSourceRoot, 'engine-rs'].join('/');
const engineCrateFragment = ['engine-rs', 'crates'].join('/');
const generatedSourceFragment = ['src', 'generated'].join('/');
const voxelforgeRoot = ['', 'home', 'dev', 'voxelforge'].join('/');

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
        '@asha/contracts': 'link:../asha/ts/packages/contracts',
        '@asha/runtime-bridge': 'link:../asha/ts/packages/runtime-bridge',
        '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
      },
    }),
  );
  writeFileSync(
    join(workspaceRoot, 'boundary-policy.json'),
    JSON.stringify({
      consumerRole: 'asha-studio',
      publicSurfaceManifest: 'harness/public-surface/ts-packages.json',
      allowedLocalPackageLinks: {
        '@asha/contracts': 'link:../asha/ts/packages/contracts',
        '@asha/runtime-bridge': 'link:../asha/ts/packages/runtime-bridge',
        '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
      },
      requiredLocalPackageLinks: {
        '@asha/contracts': 'link:../asha/ts/packages/contracts',
        '@asha/runtime-bridge': 'link:../asha/ts/packages/runtime-bridge',
        '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
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
      ],
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
    origin: [0, 0, 0],
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
      min: [0, 0, 0],
      max: [7, 7, 7],
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
      min: [0, 0, 0],
      max: [7, 7, 7],
    },
    sampleVoxels: [
      {
        coord: [0, 0, 0],
        material: 1,
      },
    ],
    diagnostics: [],
    evidence: [sampleEvidence('preview')],
  };
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
  });
  const applyProposal = buildStudioVoxelConversionApplyProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 9,
    workspace: authorityWorkspace,
  });
  const exportProposal = buildStudioVoxelConversionEvidenceExportProposal({
    sessionId: 'session-1',
    expectedTimelineSequence: 10,
    workspace: authorityWorkspace,
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
  });

  assert.equal(proposal.accepted, false);
  assert.equal(proposal.proposal, null);
  assert.ok(proposal.diagnostics.some(diagnostic => diagnostic.code === 'invalid_material_map'));
});

test('voxel conversion proposal builders reject missing runtime capability', () => {
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
    expectedTimelineSequence: 14,
    workspace,
  });

  assert.equal(proposal.accepted, false);
  assert.equal(proposal.proposal, null);
  assert.ok(proposal.diagnostics.some(diagnostic => diagnostic.code === 'unsupported_source_asset'));
});
