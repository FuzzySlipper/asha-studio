#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStudioVoxelConversionApplyProposal,
  buildStudioVoxelConversionEvidenceExportProposal,
  buildStudioVoxelConversionPlanProposal,
  buildStudioVoxelConversionPreviewProposal,
  buildStudioVoxelConversionReadoutModel,
  buildStudioVoxelConversionWorkspaceReadModel,
} from '@asha-studio/voxel-conversion';
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
const fixturePath = join(repoRoot, 'fixtures/voxel-conversion/phase4-cases.json');
const outDir = join(repoRoot, 'artifacts/voxel-conversion-phase4-product-proof/latest');
const artifactPath = join(outDir, 'index.json');
const comparisonPath = join(outDir, 'compare.json');
const comparisonMarkdownPath = join(outDir, 'compare.md');
const proofCaseId = 'synthetic_colored_cube_solid';
const staleCaseId = 'stale_source_hash_rejection';

interface Phase4FixtureSet {
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

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function loadFixtureSet(): { readonly text: string; readonly fixtureSet: Phase4FixtureSet } {
  const text = readFileSync(fixturePath, 'utf8');
  return {
    text,
    fixtureSet: JSON.parse(text) as Phase4FixtureSet,
  };
}

function requireCase(fixtureSet: Phase4FixtureSet, caseId: string): Phase4FixtureCase {
  const fixtureCase = fixtureSet.cases.find(candidate => candidate.id === caseId);
  assert.ok(fixtureCase, `missing Phase 4 fixture case: ${caseId}`);
  return fixtureCase;
}

function completeCase(
  fixtureCase: Phase4FixtureCase,
): asserts fixtureCase is Phase4FixtureCase & {
  readonly plan: VoxelConversionPlan;
  readonly preview: VoxelConversionPreview;
  readonly receipt: VoxelConversionReceipt;
} {
  assert.ok(fixtureCase.plan, `${fixtureCase.id} is missing a plan`);
  assert.ok(fixtureCase.preview, `${fixtureCase.id} is missing a preview`);
  assert.ok(fixtureCase.receipt, `${fixtureCase.id} is missing a receipt`);
}

function runtimeSessionFor(
  fixtureCase: Phase4FixtureCase & {
    readonly plan: VoxelConversionPlan;
    readonly preview: VoxelConversionPreview;
    readonly receipt: VoxelConversionReceipt;
  },
): Partial<Pick<
  RuntimeSessionFacade,
  | 'planVoxelConversion'
  | 'previewVoxelConversion'
  | 'applyVoxelConversion'
  | 'exportVoxelConversionEvidence'
>> {
  return {
    planVoxelConversion: request => {
      assert.deepEqual(request.source, fixtureCase.source);
      assert.deepEqual(request.target, fixtureCase.target);
      assert.deepEqual(request.settings, fixtureCase.settings);
      return fixtureCase.plan;
    },
    previewVoxelConversion: request => {
      assert.equal(request.planId, fixtureCase.plan.planId);
      assert.equal(request.expectedPlanHash, fixtureCase.plan.settingsHash);
      return fixtureCase.preview;
    },
    applyVoxelConversion: request => {
      assert.equal(request.planId, fixtureCase.plan.planId);
      assert.equal(request.expectedPlanHash, fixtureCase.plan.settingsHash);
      assert.equal(request.expectedPreviewHash, fixtureCase.preview.outputHash);
      return fixtureCase.receipt;
    },
    exportVoxelConversionEvidence: evidence => evidence,
  };
}

function workspaceFor(fixtureCase: Phase4FixtureCase) {
  return buildStudioVoxelConversionWorkspaceReadModel({
    source: fixtureCase.source,
    target: fixtureCase.target,
    settings: fixtureCase.settings,
    plan: fixtureCase.plan,
    preview: fixtureCase.preview,
    receipt: fixtureCase.receipt,
    evidence: fixtureCase.extraEvidence,
  });
}

function evidenceSummary(refs: readonly VoxelConversionEvidenceRef[]) {
  return refs.map(ref => ({
    kind: ref.kind,
    uri: ref.uri,
    contentHash: ref.contentHash,
  }));
}

function formatBounds(bounds: VoxelConversionPreview['outputBounds']): string {
  if (bounds === null) {
    return 'none';
  }
  return `${bounds.min.x},${bounds.min.y},${bounds.min.z}..${bounds.max.x},${bounds.max.y},${bounds.max.z}`;
}

const { text: fixtureText, fixtureSet } = loadFixtureSet();
const proofCase = requireCase(fixtureSet, proofCaseId);
const staleCase = requireCase(fixtureSet, staleCaseId);
completeCase(proofCase);

assert.equal(fixtureText.includes('/home/dev/voxelforge'), false);
assert.ok(fixtureSet.provenance.nonClaims.includes('not_voxelforge_runtime'));
assert.equal(proofCase.licensePosture.includes('Asha-authored'), true);

const runtimeSession = runtimeSessionFor(proofCase);
const planWorkspace = buildStudioVoxelConversionWorkspaceReadModel({
  source: proofCase.source,
  target: proofCase.target,
  settings: proofCase.settings,
  plan: null,
  preview: null,
  receipt: null,
  evidence: [],
});
const afterPlanWorkspace = buildStudioVoxelConversionWorkspaceReadModel({
  source: proofCase.source,
  target: proofCase.target,
  settings: proofCase.settings,
  plan: proofCase.plan,
  preview: null,
  receipt: null,
  evidence: [],
});
const afterPreviewWorkspace = buildStudioVoxelConversionWorkspaceReadModel({
  source: proofCase.source,
  target: proofCase.target,
  settings: proofCase.settings,
  plan: proofCase.plan,
  preview: proofCase.preview,
  receipt: null,
  evidence: [],
});
const finalWorkspace = workspaceFor(proofCase);
const finalReadout = buildStudioVoxelConversionReadoutModel({
  workspace: finalWorkspace,
  runtimeSession,
});

const planProposal = buildStudioVoxelConversionPlanProposal({
  sessionId: 'session.phase4.voxel-conversion-product-proof',
  workspace: planWorkspace,
  expectedTimelineSequence: 1,
  runtimeSession,
});
const previewProposal = buildStudioVoxelConversionPreviewProposal({
  sessionId: 'session.phase4.voxel-conversion-product-proof',
  workspace: afterPlanWorkspace,
  expectedTimelineSequence: 2,
  runtimeSession,
});
const applyProposal = buildStudioVoxelConversionApplyProposal({
  sessionId: 'session.phase4.voxel-conversion-product-proof',
  workspace: afterPreviewWorkspace,
  expectedTimelineSequence: 3,
  runtimeSession,
});
const exportProposal = buildStudioVoxelConversionEvidenceExportProposal({
  sessionId: 'session.phase4.voxel-conversion-product-proof',
  workspace: finalWorkspace,
  expectedTimelineSequence: 4,
  runtimeSession,
});

assert.equal(planProposal.accepted, true);
assert.equal(previewProposal.accepted, true);
assert.equal(applyProposal.accepted, true);
assert.equal(exportProposal.accepted, true);
assert.equal(finalReadout.status, 'ready');
assert.equal(finalReadout.authorityPosture, 'authority_backed');
assert.equal(finalReadout.receipt.outputHash, proofCase.receipt.outputHash);
assert.deepEqual(
  proofCase.preview.sampleVoxels.map(voxel => voxel.material),
  [2, 2, 2],
);

const staleWorkspace = workspaceFor(staleCase);
const staleApplyProposal = buildStudioVoxelConversionApplyProposal({
  sessionId: 'session.phase4.voxel-conversion-product-proof',
  workspace: staleWorkspace,
  expectedTimelineSequence: 5,
  runtimeSession,
});
assert.equal(staleApplyProposal.accepted, false);
assert.ok(staleApplyProposal.diagnostics.some(diagnostic => diagnostic.code === 'stale_preview'));

const comparisonBody = {
  artifactKind: 'studio_voxel_conversion_phase4_before_after_comparison',
  artifactVersion: 'studio-voxel-conversion-phase4-before-after.v0',
  generatedAt: 'deterministic-as-structure-only',
  task: 'asha#4316',
  sourceProof: {
    path: 'artifacts/voxel-conversion-phase4-product-proof/latest/index.json',
    command: 'pnpm run evidence -- voxel-conversion-phase4-product-proof',
  },
  fixture: {
    path: 'fixtures/voxel-conversion/phase4-cases.json',
    caseId: proofCase.id,
    fixtureSha256: sha256(fixtureText),
  },
  before: {
    source: proofCase.source,
    target: proofCase.target,
    settings: proofCase.settings,
    materialMap: proofCase.settings.materialMap,
    sourceHash: proofCase.source.sourceHash,
  },
  after: {
    planId: proofCase.plan.planId,
    authorityVersion: proofCase.plan.authorityVersion,
    planHash: proofCase.plan.settingsHash,
    previewHash: proofCase.preview.outputHash,
    receiptOutputHash: proofCase.receipt.outputHash,
    outputVoxelCount: proofCase.receipt.outputVoxelCount,
    outputBounds: proofCase.receipt.outputBounds,
    outputBoundsSummary: formatBounds(proofCase.receipt.outputBounds),
    sampleVoxels: proofCase.preview.sampleVoxels,
    materialIds: [...new Set(proofCase.preview.sampleVoxels.map(voxel => voxel.material))],
  },
  diagnostics: {
    plan: proofCase.plan.diagnostics,
    preview: proofCase.preview.diagnostics,
    apply: proofCase.receipt.diagnostics,
    readout: finalReadout.diagnostics,
  },
  evidence: {
    plan: evidenceSummary(proofCase.plan.evidence),
    preview: evidenceSummary(proofCase.preview.evidence),
    apply: evidenceSummary(proofCase.receipt.evidence),
    export: evidenceSummary(finalWorkspace.operations.exportEvidence.evidence),
  },
  agreement: {
    receiptMatchesPreviewPlan: proofCase.receipt.planId === proofCase.preview.planId,
    receiptMatchesPreviewHash: finalReadout.receipt.previewHash === proofCase.preview.outputHash,
    receiptMatchesOutputHash: finalReadout.receipt.outputHash === proofCase.receipt.outputHash,
    receiptMatchesOutputVoxelCount: finalReadout.receipt.outputVoxelCount === proofCase.receipt.outputVoxelCount,
    materialMapPreserved: JSON.stringify(finalWorkspace.settings.materialMap) === JSON.stringify(proofCase.settings.materialMap),
    diagnosticsEmpty: finalReadout.diagnostics.length === 0,
  },
  projectionCaveats: [
    'Preview sample voxels are fixture-backed readout evidence, not browser-rendered imagery.',
    'No hardware GPU, performance, or live Rust runtime execution is claimed by this comparison.',
    'The committed comparison remains valid until the source fixture or proof generator changes.',
  ],
  nonClaims: [
    ...fixtureSet.provenance.nonClaims,
    'fixture_backed_until_runtime_authority_4479_lands',
    'not_live_rust_runtime_execution',
    'not_browser_render_capture',
    'not_hardware_gpu_evidence',
  ],
};
const comparison = {
  ...comparisonBody,
  artifactHash: sha256Json(comparisonBody),
};
const comparisonMarkdown = [
  '# Voxel Conversion Phase 4 Before/After',
  '',
  `Artifact hash: ${comparison.artifactHash}`,
  `Fixture case: ${comparison.fixture.caseId}`,
  `Source asset: ${comparison.before.source.assetId}`,
  `Source hash: ${comparison.before.sourceHash}`,
  `Mode: ${comparison.before.settings.mode}`,
  `Resolution: ${comparison.before.settings.resolution.join(' x ')}`,
  `Material map: slot ${comparison.before.materialMap.entries[0]?.sourceMaterialSlot} -> material ${comparison.before.materialMap.entries[0]?.voxelMaterial}`,
  '',
  `Plan: ${comparison.after.planId}`,
  `Authority version: ${comparison.after.authorityVersion}`,
  `Plan hash: ${comparison.after.planHash}`,
  `Preview hash: ${comparison.after.previewHash}`,
  `Receipt output hash: ${comparison.after.receiptOutputHash}`,
  `Output voxels: ${comparison.after.outputVoxelCount}`,
  `Output bounds: ${comparison.after.outputBoundsSummary}`,
  `Sample material ids: ${comparison.after.materialIds.join(', ')}`,
  '',
  'Agreement',
  `- receiptMatchesPreviewPlan: ${comparison.agreement.receiptMatchesPreviewPlan}`,
  `- receiptMatchesPreviewHash: ${comparison.agreement.receiptMatchesPreviewHash}`,
  `- receiptMatchesOutputHash: ${comparison.agreement.receiptMatchesOutputHash}`,
  `- receiptMatchesOutputVoxelCount: ${comparison.agreement.receiptMatchesOutputVoxelCount}`,
  `- materialMapPreserved: ${comparison.agreement.materialMapPreserved}`,
  `- diagnosticsEmpty: ${comparison.agreement.diagnosticsEmpty}`,
  '',
  'Caveats',
  ...comparison.projectionCaveats.map(caveat => `- ${caveat}`),
].join('\n');

const artifactBody = {
  artifactKind: 'studio_voxel_conversion_phase4_product_proof',
  artifactVersion: 'studio-voxel-conversion-phase4-product-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- voxel-conversion-phase4-product-proof',
  task: 'asha#4315',
  sourceFixture: {
    path: 'fixtures/voxel-conversion/phase4-cases.json',
    sha256: sha256(fixtureText),
    artifactKind: fixtureSet.artifactKind,
    sourcePosture: fixtureSet.provenance.sourcePosture,
    predecessorEvidence: fixtureSet.provenance.predecessorEvidence,
  },
  proofCase: {
    id: proofCase.id,
    purpose: proofCase.purpose,
    licensePosture: proofCase.licensePosture,
    source: proofCase.source,
    target: proofCase.target,
    settings: proofCase.settings,
  },
  workflow: {
    plan: {
      accepted: planProposal.accepted,
      commandId: planProposal.proposal?.commandId ?? null,
      input: planProposal.proposal?.input ?? null,
      evidenceExpectations: planProposal.proposal?.evidenceExpectations ?? [],
      output: {
        planId: proofCase.plan.planId,
        authorityVersion: proofCase.plan.authorityVersion,
        settingsHash: proofCase.plan.settingsHash,
        estimatedOutputVoxels: proofCase.plan.estimatedOutputVoxels,
        estimatedBounds: proofCase.plan.estimatedBounds,
        diagnostics: proofCase.plan.diagnostics,
        evidence: evidenceSummary(proofCase.plan.evidence),
      },
    },
    preview: {
      accepted: previewProposal.accepted,
      commandId: previewProposal.proposal?.commandId ?? null,
      input: previewProposal.proposal?.input ?? null,
      evidenceExpectations: previewProposal.proposal?.evidenceExpectations ?? [],
      output: {
        outputHash: proofCase.preview.outputHash,
        outputVoxelCount: proofCase.preview.outputVoxelCount,
        outputBounds: proofCase.preview.outputBounds,
        sampleVoxels: proofCase.preview.sampleVoxels,
        diagnostics: proofCase.preview.diagnostics,
        evidence: evidenceSummary(proofCase.preview.evidence),
      },
    },
    apply: {
      accepted: applyProposal.accepted,
      commandId: applyProposal.proposal?.commandId ?? null,
      input: applyProposal.proposal?.input ?? null,
      evidenceExpectations: applyProposal.proposal?.evidenceExpectations ?? [],
      output: {
        applied: proofCase.receipt.applied,
        outputHash: proofCase.receipt.outputHash,
        outputVoxelCount: proofCase.receipt.outputVoxelCount,
        outputBounds: proofCase.receipt.outputBounds,
        diagnostics: proofCase.receipt.diagnostics,
        evidence: evidenceSummary(proofCase.receipt.evidence),
      },
    },
    exportEvidence: {
      accepted: exportProposal.accepted,
      commandId: exportProposal.proposal?.commandId ?? null,
      input: exportProposal.proposal?.input ?? null,
      evidenceExpectations: exportProposal.proposal?.evidenceExpectations ?? [],
    },
  },
  readout: {
    status: finalReadout.status,
    authorityPosture: finalReadout.authorityPosture,
    diagnostics: finalReadout.diagnostics,
    receipt: finalReadout.receipt,
    evidence: finalReadout.evidence,
    nonClaims: finalReadout.nonClaims,
  },
  materialMap: proofCase.settings.materialMap,
  comparison: {
    artifactKind: comparison.artifactKind,
    jsonPath: 'artifacts/voxel-conversion-phase4-product-proof/latest/compare.json',
    markdownPath: 'artifacts/voxel-conversion-phase4-product-proof/latest/compare.md',
    artifactHash: comparison.artifactHash,
    beforeSourceHash: comparison.before.sourceHash,
    afterOutputHash: comparison.after.receiptOutputHash,
    outputVoxelCount: comparison.after.outputVoxelCount,
    outputBoundsSummary: comparison.after.outputBoundsSummary,
    projectionCaveats: comparison.projectionCaveats,
  },
  negativeSmokes: [
    {
      case: staleCase.id,
      accepted: staleApplyProposal.accepted,
      expected: false,
      diagnosticCodes: staleApplyProposal.diagnostics.map(diagnostic => diagnostic.code),
    },
  ],
  validations: [
    'phase4_fixture_loaded',
    'plan_proposal_accepted',
    'preview_proposal_accepted',
    'apply_proposal_accepted',
    'export_evidence_proposal_accepted',
    'material_map_preserved',
    'receipt_hash_matches_apply_output',
    'readout_authority_backed',
    'negative_stale_source_hash_failed_closed',
    'no_voxelforge_runtime_dependency',
  ],
  nonClaims: [
    ...fixtureSet.provenance.nonClaims,
    'fixture_backed_until_runtime_authority_4479_lands',
    'not_live_rust_runtime_execution',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ],
};

const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
await writeFile(comparisonPath, `${JSON.stringify(comparison, null, 2)}\n`);
await writeFile(comparisonMarkdownPath, `${comparisonMarkdown}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
console.log(`wrote ${relative(repoRoot, comparisonPath)}`);
console.log(`wrote ${relative(repoRoot, comparisonMarkdownPath)}`);
