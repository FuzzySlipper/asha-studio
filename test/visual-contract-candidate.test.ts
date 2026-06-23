import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const fixtureDir = join(root, 'fixtures', 'visual-contract');

function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf8')) as T;
}

type VisualObject = {
  readonly id: string;
  readonly role?: string;
  readonly domain_role?: string;
  readonly bounds?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly evidence_refs?: readonly string[];
};

type VisualContract = {
  readonly schema: string;
  readonly scene: { readonly id: string; readonly viewport: { readonly width_px: number; readonly height_px: number } };
  readonly project?: { readonly id: string; readonly vocabulary?: string };
  readonly objects: readonly VisualObject[];
};

type ProofCompare = {
  readonly verdict: 'pass' | 'fail';
  readonly failureCount?: number;
  readonly failures?: readonly string[];
  readonly runId: string;
  readonly reportArtifact: string;
  readonly diffOverlayArtifact: string;
  readonly localReportArtifact: string;
  readonly localDiffOverlayArtifact: string;
};

type VisualReport = {
  readonly run_id: string;
  readonly verdict: string;
  readonly failures?: readonly { readonly constraint: string; readonly repair_hint?: string }[];
};

test('current Studio visual-contract candidate carries stable ASHA DOM markers', () => {
  const candidate = readFixture<VisualContract>('asha-studio-current.candidate.contract.json');
  const proof = readFixture<{
    readonly capture: { readonly viewport: { readonly width_px: number; readonly height_px: number }; readonly captureMode: string; readonly rootSelector: string; readonly requiredVisualObjects: readonly string[] };
    readonly limitations: readonly string[];
  }>('asha-studio-current.proof.json');

  assert.equal(candidate.schema, 'layered-visual-contract/v0.1');
  assert.equal(candidate.scene.id, 'asha_studio_current');
  assert.deepEqual(candidate.scene.viewport, { width_px: 1920, height_px: 1080 });
  assert.equal(candidate.project?.id, 'asha');
  assert.equal(candidate.project?.vocabulary, 'asha_studio_current_dom_visual_contract_v0');
  assert.equal(proof.capture.captureMode, 'viewport-clipped');
  assert.equal(proof.capture.rootSelector, '[data-visual-id="asha_studio_shell"]');

  const objects = new Map(candidate.objects.map((object) => [object.id, object]));
  const expectedRoles: Record<string, string> = {
    export_review_artifact_button: 'review_artifact_export',
    run_proof_button: 'proof_runner',
    scene_hierarchy: 'scene_hierarchy',
    central_3d_viewport: 'central_3d_viewport',
    selected_target_inspector: 'selected_target_inspector',
    command_evidence_dock: 'command_evidence_dock',
    command_timeline: 'command_timeline',
    evidence_dock: 'evidence_dock',
  };
  for (const id of proof.capture.requiredVisualObjects) {
    const object = objects.get(id);
    assert.ok(object, `missing required visual object ${id}`);
    assert.equal(object.role ?? object.domain_role, expectedRoles[id]);
    assert.ok(object.evidence_refs?.includes(`web_node:${id}`), `missing web_node evidence ref for ${id}`);
  }
  for (const id of ['runtime_deferred_limitation', 'no_agora_gpu_native_claim_limitation', 'selection_outline', 'preview_ghost', 'axis_gizmo', 'applied_state_renderable']) {
    assert.ok(objects.has(id), `missing visual affordance marker ${id}`);
  }

  const central = objects.get('central_3d_viewport')?.bounds;
  assert.ok(central, 'central viewport bounds missing');
  assert.ok(central.w * central.h > 0.4, `central viewport should satisfy target dominance; area=${central.w * central.h}`);
  assert.ok(objects.get('scene_hierarchy')?.bounds && objects.get('scene_hierarchy')!.bounds!.x < central.x, 'scene hierarchy should sit left of viewport');
  assert.ok(objects.get('selected_target_inspector')?.bounds && objects.get('selected_target_inspector')!.bounds!.x > central.x, 'inspector should sit right of viewport');
  assert.ok(proof.limitations.some((limitation) => limitation.includes('browser layout/affordance evidence only')));
});

test('current Studio visual-contract proof records durable compare artifacts and negative smoke', () => {
  const proof = readFixture<{
    readonly currentCompare: ProofCompare;
    readonly negativeCompare: ProofCompare;
    readonly candidateContract: string;
    readonly negativeCandidate: string;
  }>('asha-studio-current.proof.json');
  const negative = readFixture<VisualContract>('asha-studio-current.negative.contract.json');

  assert.equal(proof.currentCompare.verdict, 'pass');
  assert.equal(proof.currentCompare.failureCount, 0);
  assert.match(proof.currentCompare.runId, /^[a-f0-9]{24}$/);
  assert.equal(proof.negativeCompare.verdict, 'fail');
  assert.match(proof.negativeCompare.runId, /^[a-f0-9]{24}$/);
  assert.ok(proof.negativeCompare.failures?.includes('selected_target_inspector_exists'));
  assert.ok(proof.negativeCompare.failures?.includes('central_viewport_is_dominant'));

  const negativeObjects = new Map(negative.objects.map((object) => [object.id, object]));
  assert.equal(negativeObjects.has('selected_target_inspector'), false);
  const negativeCentral = negativeObjects.get('central_3d_viewport')?.bounds;
  assert.ok(negativeCentral && negativeCentral.w * negativeCentral.h < 0.4, 'negative central viewport should be undersized');

  for (const path of [proof.candidateContract, proof.negativeCandidate]) {
    assert.ok(existsSync(join(root, path)), `missing proof artifact ${path}`);
  }
  for (const compare of [proof.currentCompare, proof.negativeCompare]) {
    assert.ok(existsSync(join(root, compare.localReportArtifact)), `missing local report ${compare.localReportArtifact}`);
    assert.ok(existsSync(join(root, compare.localDiffOverlayArtifact)), `missing local overlay ${compare.localDiffOverlayArtifact}`);
    assert.match(compare.reportArtifact, new RegExp(`/visual-contracts/${compare.runId}/artifacts/report\\.json$`));
    assert.match(compare.diffOverlayArtifact, new RegExp(`/visual-contracts/${compare.runId}/artifacts/diff\\.overlay\\.svg$`));
    const report = JSON.parse(readFileSync(join(root, compare.localReportArtifact), 'utf8')) as VisualReport;
    assert.equal(report.run_id, compare.runId);
    assert.equal(report.verdict, compare.verdict);
  }
});
