import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { buildProof } from '../scripts/visual-capability-proof';

const root = process.cwd();
const fixturePath = join(root, 'fixtures', 'studio-visual-capability-proof.sample.json');

type CapabilityProof = {
  readonly schemaVersion: 1;
  readonly artifactKind: 'studio_visual_capability_proof';
  readonly taskId: number;
  readonly readiness: 'ready' | 'failed_closed';
  readonly proofCommand: string;
  readonly inputArtifacts: {
    readonly browserCapture: { readonly path: string; readonly sha256: string; readonly artifactKind: string };
    readonly visualContract: { readonly path: string; readonly sha256: string; readonly artifactKind: string };
  };
  readonly summary: {
    readonly renderedObjectIds: readonly string[];
    readonly visibleRenderableCount: number;
    readonly selectedObject: string | null;
    readonly previewObject: string | null;
    readonly appliedObject: string | null;
    readonly beforeRenderHash: string | null;
    readonly afterRenderHash: string | null;
    readonly beforeCropPath: string | null;
    readonly afterCropPath: string | null;
    readonly visualContractRunIds: readonly string[];
    readonly nonClaims: readonly string[];
  };
  readonly capabilityGroups: readonly {
    readonly groupId: string;
    readonly status: 'ready' | 'failed_closed';
    readonly diagnostics: readonly { readonly code: string; readonly severity: string }[];
    readonly evidence: unknown;
  }[];
  readonly negativeSmokes: readonly { readonly smokeId: string; readonly expectedGroup: string; readonly status: string; readonly diagnosticCodes: readonly string[] }[];
};

function readProof(): CapabilityProof {
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as CapabilityProof;
}

function group(proof: CapabilityProof, id: string): CapabilityProof['capabilityGroups'][number] {
  const found = proof.capabilityGroups.find((candidate) => candidate.groupId === id);
  assert.ok(found, `missing group ${id}`);
  return found;
}

function assertReadyGroup(proof: CapabilityProof, id: string): CapabilityProof['capabilityGroups'][number] {
  const found = group(proof, id);
  assert.equal(found.status, 'ready');
  assert.deepEqual(found.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'), []);
  return found;
}

test('studio visual capability proof consolidates scene, pick, visual delta, visual-contract, command, and limitations groups', () => {
  const proof = readProof();
  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.artifactKind, 'studio_visual_capability_proof');
  assert.equal(proof.taskId, 3046);
  assert.equal(proof.readiness, 'ready');
  assert.equal(proof.proofCommand, 'pnpm run proof:visual-capability');
  assert.equal(proof.capabilityGroups.length, 6);

  assertReadyGroup(proof, 'scene_readback');
  assertReadyGroup(proof, 'pick');
  assertReadyGroup(proof, 'visual_delta_crop');
  assertReadyGroup(proof, 'visual_contract_layout_affordance');
  assertReadyGroup(proof, 'command_authority_correlation');
  assertReadyGroup(proof, 'non_claim_limitations');

  assert.equal(proof.summary.visibleRenderableCount, 5);
  assert.equal(proof.summary.selectedObject, 'selected-voxel:0,0,0');
  assert.equal(proof.summary.previewObject, 'preview-ghost:1,0,0');
  assert.equal(proof.summary.appliedObject, 'applied-voxel:1,0,0');
  assert.notEqual(proof.summary.beforeRenderHash, proof.summary.afterRenderHash);
  assert.ok(proof.summary.renderedObjectIds.includes('applied-voxel:1,0,0'));
  assert.ok(proof.summary.visualContractRunIds.length === 2);
  for (const expected of ['not_native_runtime', 'not_wasm_authority', 'not_agora_compositor', 'not_hardware_gpu', 'not_performance_evidence']) {
    assert.ok(proof.summary.nonClaims.includes(expected), `missing ${expected}`);
  }
});

type SceneEvidence = { readonly camera: { readonly changed: boolean }; readonly selectedRenderableId: string | null };
type PickEvidence = { readonly sourceTimelineCommandId: string; readonly hit: { readonly renderableId: string }; readonly backgroundNoHit: { readonly outcome: string } };
type DeltaEvidence = { readonly beforeCrop: { readonly linkedCommandId: string; readonly screenshotPath: string; readonly cropPath: string }; readonly afterCrop: { readonly linkedCommandId: string; readonly screenshotPath: string; readonly cropPath: string }; readonly staleReadbackGuard: { readonly mismatchPolicy: string } };
type VisualContractEvidence = { readonly service: { readonly mode: string }; readonly currentCompare: { readonly verdict: string; readonly localReportArtifact: string; readonly localDiffOverlayArtifact: string }; readonly negativeCompare: { readonly verdict: string; readonly failures: readonly string[]; readonly localReportArtifact: string; readonly localDiffOverlayArtifact: string } };
type CommandEvidence = { readonly timelineCommandIds: readonly string[] };

test('studio visual capability proof exposes reviewer handles without parsing screenshots', () => {
  const proof = readProof();
  const scene = assertReadyGroup(proof, 'scene_readback');
  const pick = assertReadyGroup(proof, 'pick');
  const delta = assertReadyGroup(proof, 'visual_delta_crop');
  const visualContract = assertReadyGroup(proof, 'visual_contract_layout_affordance');
  const command = assertReadyGroup(proof, 'command_authority_correlation');
  const sceneEvidence = scene.evidence as SceneEvidence;
  const pickEvidence = pick.evidence as PickEvidence;
  const deltaEvidence = delta.evidence as DeltaEvidence;
  const visualContractEvidence = visualContract.evidence as VisualContractEvidence;
  const commandEvidence = command.evidence as CommandEvidence;

  assert.equal(sceneEvidence.camera.changed, true);
  assert.equal(sceneEvidence.selectedRenderableId, proof.summary.selectedObject);
  assert.equal(pickEvidence.sourceTimelineCommandId, 'selection.voxel_from_screen_point');
  assert.equal(pickEvidence.hit.renderableId, proof.summary.selectedObject);
  assert.equal(pickEvidence.backgroundNoHit.outcome, 'no_hit');
  assert.equal(deltaEvidence.beforeCrop.linkedCommandId, 'preview.voxel_brush');
  assert.equal(deltaEvidence.afterCrop.linkedCommandId, 'authority.voxel.apply_brush');
  assert.notEqual(deltaEvidence.beforeCrop.screenshotPath, deltaEvidence.afterCrop.screenshotPath);
  assert.equal(deltaEvidence.staleReadbackGuard.mismatchPolicy, 'failed_closed');

  assert.equal(visualContractEvidence.service.mode, 'deployed_den_srv');
  assert.equal(visualContractEvidence.currentCompare.verdict, 'pass');
  assert.equal(visualContractEvidence.negativeCompare.verdict, 'fail');
  assert.ok(visualContractEvidence.negativeCompare.failures.includes('selected_target_inspector_exists'));
  assert.ok(visualContractEvidence.negativeCompare.failures.includes('central_viewport_is_dominant'));
  for (const path of [
    proof.inputArtifacts.browserCapture.path,
    proof.inputArtifacts.visualContract.path,
    deltaEvidence.beforeCrop.cropPath,
    deltaEvidence.afterCrop.cropPath,
    visualContractEvidence.currentCompare.localReportArtifact,
    visualContractEvidence.currentCompare.localDiffOverlayArtifact,
    visualContractEvidence.negativeCompare.localReportArtifact,
    visualContractEvidence.negativeCompare.localDiffOverlayArtifact,
  ]) {
    assert.equal(typeof path, 'string');
    assert.ok(path.length > 0, 'referenced artifact path should be non-empty');
  }
  for (const commandId of ['selection.voxel_from_screen_point', 'preview.voxel_brush', 'authority.voxel.apply_brush', 'render.capture_before_after', 'export.agent_readout']) {
    assert.ok(commandEvidence.timelineCommandIds.includes(commandId), `missing command correlation ${commandId}`);
  }
});

test('studio visual capability proof records required fail-closed negative smokes', () => {
  const proof = readProof();
  const smokes = new Map(proof.negativeSmokes.map((smoke) => [smoke.smokeId, smoke]));
  const expected = {
    negative_missing_scene_readback: ['missing_scene_readback'],
    negative_missing_pick_evidence: ['missing_pick_evidence'],
    negative_stale_visual_delta: ['stale_visual_delta_scene_hash', 'stale_visual_delta_crop_hash'],
    negative_missing_failed_visual_contract_proof: ['missing_visual_contract_proof', 'visual_contract_candidate_failed'],
    negative_unsupported_evidence_claims: ['unsupported_gpu_claim'],
  } as const;
  assert.equal(proof.negativeSmokes.length, Object.keys(expected).length);
  for (const [smokeId, codes] of Object.entries(expected)) {
    const smoke = smokes.get(smokeId);
    assert.ok(smoke, `missing smoke ${smokeId}`);
    assert.equal(smoke.status, 'expected_failed_closed');
    for (const code of codes) assert.ok(smoke.diagnosticCodes.includes(code), `missing ${code} from ${smokeId}`);
  }
});

test('studio visual capability proof fails closed instead of crashing when viewport3d readback is missing', () => {
  const visualContract = JSON.parse(readFileSync(join(root, 'fixtures', 'visual-contract', 'asha-studio-current.proof.json'), 'utf8')) as Parameters<typeof buildProof>[1];
  const browser = {
    schemaVersion: 1,
    artifactKind: 'browser_visual_capture_proof',
    readiness: { status: 'ready' },
    correlation: {
      status: 'matched',
      timelineCommandIds: ['selection.voxel_from_screen_point', 'preview.voxel_brush', 'authority.voxel.apply_brush', 'render.capture_before_after', 'export.agent_readout'],
      missingTimelineCommandIds: [],
      visualHashDelta: { beforeRenderHash: 'before-hash', afterRenderHash: 'after-hash', changed: true },
      reviewArtifactId: 'artifact-review-0001',
      reviewCaptureReadiness: 'ready',
    },
    captureBackend: { runtime: 'chromium_headless_cli', captureMode: 'browser_screenshot', gpuClaim: 'not_claimed' },
    viewportVisualDelta: {
      artifactKind: 'viewport_visual_delta_crop_proof',
      readiness: 'ready',
      beforeSceneHash: 'before-hash',
      afterSceneHash: 'after-hash',
      sceneHashChanged: true,
      cropHashChanged: true,
      beforeCrop: { cropPath: 'before.png', cropSha256: 'sha256-before', screenshotPath: 'before-screen.png', linkedCommandId: 'preview.voxel_brush', renderableId: 'before', voxelId: 'voxel:1,0,0', sourceState: { phase: 'before', sourceSceneHash: 'before-hash' } },
      afterCrop: { cropPath: 'after.png', cropSha256: 'sha256-after', screenshotPath: 'after-screen.png', linkedCommandId: 'authority.voxel.apply_brush', renderableId: 'applied-voxel:1,0,0', voxelId: 'voxel:1,0,0', sourceState: { phase: 'after', sourceSceneHash: 'after-hash' } },
      staleReadbackGuard: { mismatchPolicy: 'failed_closed', requiredBeforeSceneHash: 'before-hash', requiredAfterSceneHash: 'after-hash', requiredBeforeCropHash: 'sha256-before', requiredAfterCropHash: 'sha256-after' },
    },
    screenshots: [],
    knownLimitations: ['Browser capture does not claim Agora compositor capture.', 'Browser capture does not claim native runtime bridge.', 'Browser capture does not claim hardware GPU/performance evidence.'],
  } satisfies Parameters<typeof buildProof>[0];

  const proof = buildProof(browser, visualContract, {
    browserCapture: { path: 'mutated-browser.json', sha256: 'sha256-mutated-browser', artifactKind: 'browser_visual_capture_proof' },
    visualContract: { path: 'visual-contract.json', sha256: 'sha256-visual-contract', artifactKind: 'asha_studio_current_visual_contract_proof' },
  });

  assert.equal(proof.readiness, 'failed_closed');
  assert.deepEqual(proof.summary.renderedObjectIds, []);
  assert.equal(proof.summary.visibleRenderableCount, 0);
  assert.equal(proof.summary.selectedObject, null);
  const scene = group(proof, 'scene_readback');
  assert.equal(scene.status, 'failed_closed');
  assert.ok(scene.diagnostics.some((diagnostic) => diagnostic.code === 'missing_scene_readback' && diagnostic.severity === 'error'));
  assert.equal(scene.evidence, null);
  const pick = group(proof, 'pick');
  assert.equal(pick.status, 'failed_closed');
  assert.ok(pick.diagnostics.some((diagnostic) => diagnostic.code === 'missing_scene_readback' && diagnostic.severity === 'error'));
  assert.ok(pick.diagnostics.some((diagnostic) => diagnostic.code === 'missing_pick_evidence' && diagnostic.severity === 'error'));
});
