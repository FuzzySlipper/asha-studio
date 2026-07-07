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
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
