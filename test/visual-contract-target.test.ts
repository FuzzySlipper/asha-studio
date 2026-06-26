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
  readonly parent?: string;
  readonly role?: string;
  readonly domain_role?: string;
  readonly bounds?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
};

type VisualConstraint = {
  readonly id: string;
  readonly type: string;
  readonly object?: string;
  readonly a?: string;
  readonly b?: string;
  readonly items?: readonly string[];
};

type VisualContract = {
  readonly schema: string;
  readonly scene: { readonly id: string; readonly viewport: { readonly width_px: number; readonly height_px: number } };
  readonly project?: { readonly id: string; readonly vocabulary?: string };
  readonly objects: readonly VisualObject[];
  readonly constraints: readonly VisualConstraint[];
};

type VisualReport = {
  readonly run_id: string;
  readonly verdict: string;
  readonly failures?: readonly { readonly constraint: string; readonly repair_hint?: string }[];
};

type ProofCompare = {
  readonly verdict: string;
  readonly failureCount?: number;
  readonly failures?: readonly string[];
  readonly runId: string;
  readonly reportArtifact: string;
  readonly diffOverlayArtifact: string;
  readonly localReportArtifact: string;
  readonly localDiffOverlayArtifact: string;
};

function readRepoJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(root, path), 'utf8')) as T;
}

test('ui-test target visual contract preserves ASHA vocabulary and viewport provenance', () => {
  const target = readFixture<VisualContract>('asha-studio-ui-test.target.contract.json');
  const promotion = readFixture<{
    readonly source: { readonly mockup_path: string; readonly capture_viewport: { readonly width_px: number; readonly height_px: number }; readonly capture_mode: string };
    readonly objects: readonly { readonly source_id: string; readonly target_id: string; readonly domain_role: string }[];
  }>('asha-studio-ui-test.promotion.json');

  assert.equal(target.schema, 'layered-visual-contract/v0.1');
  assert.equal(target.project?.id, 'asha');
  assert.equal(target.project?.vocabulary, 'asha_studio_ui_test_target_v0');
  assert.deepEqual(target.scene.viewport, { width_px: 1920, height_px: 1080 });
  assert.equal(promotion.source.mockup_path, 'local/ui-test.html');
  assert.equal(promotion.source.capture_mode, 'viewport-clipped');
  assert.deepEqual(promotion.source.capture_viewport, { width_px: 1920, height_px: 1080 });

  const objects = new Map(target.objects.map((object) => [object.id, object]));
  for (const id of [
    'export_review_artifact_button',
    'run_proof_button',
    'scene_hierarchy',
    'central_3d_viewport',
    'selected_target_inspector',
    'command_evidence_dock',
    'command_timeline',
    'evidence_dock',
  ]) {
    assert.ok(objects.has(id), `missing promoted object ${id}`);
  }

  assert.equal(objects.get('central_3d_viewport')?.domain_role, 'central_3d_viewport');
  assert.equal(objects.get('scene_hierarchy')?.domain_role, 'scene_hierarchy');
  assert.equal(objects.get('selected_target_inspector')?.domain_role, 'selected_target_inspector');
  assert.equal(objects.get('command_timeline')?.parent, 'command_evidence_dock');
  assert.equal(objects.get('evidence_dock')?.parent, 'command_evidence_dock');

  const central = objects.get('central_3d_viewport')?.bounds;
  assert.ok(central, 'central viewport bounds missing');
  assert.ok(central.w * central.h > 0.4, `central viewport should be dominant; area=${central.w * central.h}`);

  const mappedTargetIds = new Set(promotion.objects.map((rule) => rule.target_id));
  for (const object of target.objects) {
    if (object.id.startsWith('studio_')) continue;
    assert.ok(mappedTargetIds.has(object.id), `target object ${object.id} must come from explicit promotion mapping`);
  }
});

test('ui-test visual contract negative candidate records expected fail-closed constraints', () => {
  const target = readFixture<VisualContract>('asha-studio-ui-test.target.contract.json');
  const negative = readFixture<VisualContract>('asha-studio-ui-test.negative.contract.json');
  const proof = readFixture<{
    readonly selfCompare: ProofCompare;
    readonly negativeCompare: ProofCompare;
    readonly limitations: readonly string[];
  }>('asha-studio-ui-test.proof.json');

  assert.equal(proof.selfCompare.verdict, 'pass');
  assert.equal(proof.selfCompare.failureCount, 0);
  assert.match(proof.selfCompare.runId, /^[a-f0-9]{24}$/);
  assert.equal(proof.negativeCompare.verdict, 'fail');
  assert.match(proof.negativeCompare.runId, /^[a-f0-9]{24}$/);

  for (const expected of [
    'selected_target_inspector_exists',
    'central_viewport_is_dominant',
    'inspector_right_of_viewport',
    'primary_docks_top_aligned',
    'central_viewport_bounds_stable',
  ]) {
    assert.ok((proof.negativeCompare.failures ?? []).includes(expected), `negative proof missing ${expected}`);
  }

  const targetObjectIds = new Set(target.objects.map((object) => object.id));
  const negativeObjectIds = new Set(negative.objects.map((object) => object.id));
  assert.ok(targetObjectIds.has('selected_target_inspector'));
  assert.equal(negativeObjectIds.has('selected_target_inspector'), false);

  for (const compare of [proof.selfCompare, proof.negativeCompare]) {
    assert.ok(compare.localReportArtifact, `missing local report path for ${compare.runId}`);
    assert.ok(compare.localDiffOverlayArtifact, `missing local overlay path for ${compare.runId}`);
    assert.ok(existsSync(join(root, compare.localReportArtifact)), `missing local report ${compare.localReportArtifact}`);
    assert.ok(existsSync(join(root, compare.localDiffOverlayArtifact)), `missing local overlay ${compare.localDiffOverlayArtifact}`);
    assert.match(compare.reportArtifact, new RegExp(`/visual-contracts/${compare.runId}/artifacts/report\\.json$`));
    assert.match(compare.diffOverlayArtifact, new RegExp(`/visual-contracts/${compare.runId}/artifacts/diff\\.overlay\\.svg$`));
  }

  const selfReport = readRepoJson<VisualReport>(proof.selfCompare.localReportArtifact);
  assert.equal(selfReport.run_id, proof.selfCompare.runId);
  assert.equal(selfReport.verdict, proof.selfCompare.verdict);
  assert.equal(selfReport.failures?.length ?? 0, proof.selfCompare.failureCount);

  const negativeReport = readRepoJson<VisualReport>(proof.negativeCompare.localReportArtifact);
  assert.equal(negativeReport.run_id, proof.negativeCompare.runId);
  assert.equal(negativeReport.verdict, proof.negativeCompare.verdict);
  const negativeReportFailures = new Set((negativeReport.failures ?? []).map((failure) => failure.constraint));
  for (const expected of proof.negativeCompare.failures ?? []) {
    assert.ok(negativeReportFailures.has(expected), `local negative report missing ${expected}`);
  }
  assert.ok(
    (negativeReport.failures ?? []).every((failure) => failure.repair_hint && failure.repair_hint.length > 0),
    'negative local report failures must include repair hints',
  );

  assert.ok(
    proof.limitations.some((limitation) => limitation.includes('does not claim ASHA Rust/WASM authority')),
    'proof must preserve non-authority limitation',
  );
});
