#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const proofPath = join(root, 'fixtures', 'visual-contract', 'asha-studio-current.proof.json');

function fail(message) {
  console.error(`asha-studio visual-contract candidate readback: FAIL: ${message}`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (!existsSync(proofPath)) fail('missing fixtures/visual-contract/asha-studio-current.proof.json');
const proof = readJson(proofPath);
if (proof.artifactKind !== 'asha_studio_current_visual_contract_proof') fail(`unexpected artifactKind ${proof.artifactKind}`);
if (proof.schemaVersion !== 1) fail(`unexpected schemaVersion ${proof.schemaVersion}`);
if (proof.taskId !== 3123) fail(`unexpected taskId ${proof.taskId}`);
if (proof.capture?.viewport?.width_px !== 1920 || proof.capture?.viewport?.height_px !== 1080) fail('visual-contract proof must use 1920x1080 viewport');
if (proof.capture?.captureMode !== 'viewport-clipped') fail('visual-contract proof must use viewport-clipped capture');
if (proof.capture?.rootSelector !== '[data-visual-id="asha_studio_shell"]') fail('visual-contract proof root selector mismatch');

if (proof.service?.mode !== 'deployed_den_srv') fail(`visual-contract proof must record deployed_den_srv service mode, got ${proof.service?.mode}`);
if (proof.service?.host !== 'den-srv') fail(`visual-contract proof must record den-srv deployed host, got ${proof.service?.host}`);
if (typeof proof.service?.baseUrl !== 'string' || proof.service.baseUrl.includes('18090')) fail(`visual-contract proof must not use temp localhost service base URL: ${proof.service?.baseUrl}`);
if (proof.service?.baseUrl !== 'http://127.0.0.1:8086') fail(`visual-contract proof must use deployed den-srv loopback base URL, got ${proof.service?.baseUrl}`);
if (!proof.service?.authentication?.includes('/etc/den-services/visual-contract.env')) fail('visual-contract proof must record deployed token source without storing the token');

for (const path of [proof.candidateContract, proof.negativeCandidate, proof.targetContract, proof.webEvidence, proof.screenshot]) {
  if (typeof path !== 'string' || path.length === 0) fail('proof contains missing artifact path');
  if (!existsSync(join(root, path))) fail(`proof artifact path is not retrievable: ${path}`);
}

const candidate = readJson(join(root, proof.candidateContract));
const negative = readJson(join(root, proof.negativeCandidate));
if (candidate.schema !== 'layered-visual-contract/v0.1') fail('candidate schema mismatch');
if (candidate.scene?.id !== 'asha_studio_current') fail(`candidate scene id mismatch: ${candidate.scene?.id}`);
if (candidate.scene?.viewport?.width_px !== 1920 || candidate.scene?.viewport?.height_px !== 1080) fail('candidate viewport mismatch');
if (candidate.project?.id !== 'asha') fail('candidate project id mismatch');
if (candidate.project?.vocabulary !== 'asha_studio_current_dom_visual_contract_v0') fail('candidate vocabulary mismatch');

const objects = new Map(candidate.objects.map((object) => [object.id, object]));
const requiredVisualRoles = {
  studio_layout_root: 'studio_layout_root',
  studio_menu_top_bar: 'studio_menu_top_bar',
  studio_left_scene_hierarchy_panel: 'studio_left_scene_hierarchy_panel',
  studio_viewport_top_bar: 'studio_viewport_top_bar',
  studio_viewport_scene_panel: 'studio_viewport_scene_panel',
  studio_bottom_assets_panel: 'studio_bottom_assets_panel',
  studio_right_inspector_panel: 'studio_right_inspector_panel',
  export_review_artifact_button: 'review_artifact_export',
  run_proof_button: 'proof_runner',
  scene_hierarchy: 'scene_hierarchy',
  central_3d_viewport: 'central_3d_viewport',
  selected_target_inspector: 'selected_target_inspector',
  command_evidence_dock: 'command_evidence_dock',
  command_timeline: 'command_timeline',
  evidence_dock: 'evidence_dock',
};
for (const id of proof.capture.requiredVisualObjects ?? []) {
  if (!objects.has(id)) fail(`candidate missing required visual object ${id}`);
  const object = objects.get(id);
  const expectedRole = requiredVisualRoles[id];
  if (object.domain_role !== expectedRole && object.role !== expectedRole) fail(`candidate object ${id} missing matching ASHA role ${expectedRole}`);
  if (!object.evidence_refs?.includes(`web_node:${id}`)) fail(`candidate object ${id} missing web_node evidence ref`);
}
for (const id of ['runtime_bridge_marker', 'viewport_runtime_bridge_authority', 'no_agora_gpu_native_claim_limitation', 'selection_outline', 'preview_ghost', 'axis_gizmo', 'applied_state_renderable']) {
  if (!objects.has(id)) fail(`candidate missing visual affordance marker ${id}`);
}
const central = objects.get('central_3d_viewport')?.bounds;
if (!central || central.w * central.h < 0.35) fail(`candidate central viewport area too small: ${central ? central.w * central.h : 'missing'}`);
const inspector = objects.get('selected_target_inspector')?.bounds;
if (!inspector) fail('candidate selected target inspector bounds missing');
if (inspector.x <= central.x) fail('candidate inspector is not right of central viewport');
const hierarchy = objects.get('scene_hierarchy')?.bounds;
if (!hierarchy) fail('candidate scene hierarchy bounds missing');
if (hierarchy.x >= central.x) fail('candidate hierarchy is not left of central viewport');

const negativeIds = new Set(negative.objects.map((object) => object.id));
if (negativeIds.has('selected_target_inspector')) fail('negative candidate should omit selected_target_inspector');
const negativeCentral = negative.objects.find((object) => object.id === 'central_3d_viewport')?.bounds;
if (!negativeCentral || negativeCentral.w * negativeCentral.h >= 0.4) fail('negative candidate central viewport should be undersized');

if (proof.currentCompare?.verdict !== 'pass') fail(`current compare verdict is ${proof.currentCompare?.verdict}`);
if (!/^[a-f0-9]{24}$/.test(proof.currentCompare.runId)) fail('current compare run id malformed');
if (proof.currentCompare.failureCount !== 0) fail('current compare unexpectedly has failures');
if (proof.negativeCompare?.verdict !== 'fail') fail(`negative compare verdict is ${proof.negativeCompare?.verdict}`);
if (!/^[a-f0-9]{24}$/.test(proof.negativeCompare.runId)) fail('negative compare run id malformed');
for (const expected of ['selected_target_inspector_exists', 'central_viewport_is_dominant']) {
  if (!proof.negativeCompare.failures?.includes(expected)) fail(`negative compare missing expected failure ${expected}`);
}
for (const compare of [proof.currentCompare, proof.negativeCompare]) {
  for (const key of ['localReportArtifact', 'localDiffOverlayArtifact']) {
    if (!existsSync(join(root, compare[key]))) fail(`missing local visual-contract artifact ${compare[key]}`);
  }
  const report = readJson(join(root, compare.localReportArtifact));
  if (report.run_id !== compare.runId) fail(`local report run id mismatch for ${compare.runId}`);
  if (report.verdict !== compare.verdict) fail(`local report verdict mismatch for ${compare.runId}`);
  if (!compare.reportArtifact.endsWith(`/visual-contracts/${compare.runId}/artifacts/report.json`)) fail(`service report artifact URL mismatch for ${compare.runId}`);
  if (!compare.diffOverlayArtifact.endsWith(`/visual-contracts/${compare.runId}/artifacts/diff.overlay.svg`)) fail(`service overlay artifact URL mismatch for ${compare.runId}`);
}
if (!proof.limitations?.some((limitation) => limitation.includes('browser layout/affordance evidence only'))) fail('proof limitations must preserve browser-layout-only classification');
if (!proof.limitations?.some((limitation) => limitation.includes('does not replace authoritative viewport evidence'))) fail('proof limitations must say visual-contract does not replace viewport evidence');

console.log(`asha-studio visual-contract candidate readback: OK (candidate run ${proof.currentCompare.runId}, negative run ${proof.negativeCompare.runId})`);
