#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, 'artifacts', 'visual-capability', 'latest', 'index.json');

function fail(message) {
  console.error(`asha-studio visual capability proof readback: FAIL: ${message}`);
  process.exit(1);
}

function sha256Text(text) {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function groupById(proof, groupId) {
  const group = proof.capabilityGroups?.find((candidate) => candidate.groupId === groupId);
  if (group === undefined) fail(`missing capability group ${groupId}`);
  return group;
}

function requireReadyGroup(proof, groupId) {
  const group = groupById(proof, groupId);
  if (group.status !== 'ready') fail(`${groupId} status is ${group.status}`);
  const errors = group.diagnostics?.filter((diagnostic) => diagnostic.severity === 'error') ?? [];
  if (errors.length !== 0) fail(`${groupId} has error diagnostics: ${errors.map((diagnostic) => diagnostic.code).join(', ')}`);
  return group;
}

function requirePath(path, label) {
  if (typeof path !== 'string' || path.length === 0) fail(`${label} missing path`);
  if (!existsSync(join(root, path))) fail(`${label} not retrievable: ${path}`);
}

if (!existsSync(artifactPath)) fail('missing artifacts/visual-capability/latest/index.json');
const proof = readJson(artifactPath);
if (proof.schemaVersion !== 1) fail(`unexpected schemaVersion ${proof.schemaVersion}`);
if (proof.artifactKind !== 'studio_visual_capability_proof') fail(`unexpected artifactKind ${proof.artifactKind}`);
if (proof.taskId !== 3046) fail(`unexpected taskId ${proof.taskId}`);
if (proof.readiness !== 'ready') fail(`readiness is ${proof.readiness}`);
if (proof.proofCommand !== 'pnpm run proof:visual-capability') fail(`proofCommand is ${proof.proofCommand}`);

const browserPath = proof.inputArtifacts?.browserCapture?.path;
const visualContractPath = proof.inputArtifacts?.visualContract?.path;
const runtimeBridgePath = proof.inputArtifacts?.runtimeBridge?.path;
requirePath(browserPath, 'browser capture input');
requirePath(visualContractPath, 'visual-contract input');
requirePath(runtimeBridgePath, 'runtime bridge input');
if (sha256Text(readFileSync(join(root, browserPath), 'utf8')) !== proof.inputArtifacts.browserCapture.sha256) fail('browser capture input hash mismatch');
if (sha256Text(readFileSync(join(root, visualContractPath), 'utf8')) !== proof.inputArtifacts.visualContract.sha256) fail('visual-contract input hash mismatch');
if (sha256Text(readFileSync(join(root, runtimeBridgePath), 'utf8')) !== proof.inputArtifacts.runtimeBridge.sha256) fail('runtime bridge input hash mismatch');
if (proof.inputArtifacts.browserCapture.artifactKind !== 'browser_visual_capture_proof') fail('browser input kind mismatch');
if (proof.inputArtifacts.visualContract.artifactKind !== 'asha_studio_current_visual_contract_proof') fail('visual-contract input kind mismatch');
if (proof.inputArtifacts.runtimeBridge.artifactKind !== 'studio_runtime_bridge_integration_proof') fail('runtime bridge input kind mismatch');

const scene = requireReadyGroup(proof, 'scene_readback');
if (scene.evidence?.visibleRenderableCount < 1) fail('scene group visible renderable count missing');
if (scene.evidence?.selectedRenderableId !== 'selected-voxel:0,0,0') fail('scene group selected object mismatch');
if (scene.evidence?.previewGhostId !== 'preview-ghost:1,0,0') fail('scene group preview object mismatch');
if (scene.evidence?.appliedRenderableId !== 'applied-voxel:1,0,0') fail('scene group applied object mismatch');
if (scene.evidence?.camera?.changed !== true) fail('scene group camera change missing');
if (!Array.isArray(scene.evidence?.renderedObjects) || !scene.evidence.renderedObjects.some((object) => object.renderableId === 'applied-voxel:1,0,0')) fail('scene group rendered object ids missing applied object');

const pick = requireReadyGroup(proof, 'pick');
if (pick.evidence?.sourceTimelineCommandId !== 'selection.voxel_from_screen_point') fail('pick source timeline command mismatch');
if (pick.evidence?.hit?.outcome !== 'hit') fail('pick hit outcome mismatch');
if (pick.evidence?.hit?.renderableId !== proof.summary.selectedObject) fail('pick hit renderable does not match summary selected object');
if (pick.evidence?.backgroundNoHit?.outcome !== 'no_hit') fail('pick negative no-hit missing');
if (pick.evidence?.staleReadbackGuard?.mismatchPolicy !== 'failed_closed') fail('pick guard does not fail closed');

const visualDelta = requireReadyGroup(proof, 'visual_delta_crop');
if (visualDelta.evidence?.sceneHashChanged !== true) fail('visual delta scene hash did not change');
if (visualDelta.evidence?.cropHashChanged !== true) fail('visual delta crop hash did not change');
if (visualDelta.evidence?.beforeCrop?.screenshotPath === visualDelta.evidence?.afterCrop?.screenshotPath) fail('visual delta before/after screenshots must differ');
if (visualDelta.evidence?.beforeCrop?.linkedCommandId !== 'preview.voxel_brush') fail('visual delta before command mismatch');
if (visualDelta.evidence?.afterCrop?.linkedCommandId !== 'authority.voxel.apply_brush') fail('visual delta after command mismatch');
requirePath(visualDelta.evidence?.beforeCrop?.cropPath, 'before visual-delta crop');
requirePath(visualDelta.evidence?.afterCrop?.cropPath, 'after visual-delta crop');
if (visualDelta.evidence?.staleReadbackGuard?.mismatchPolicy !== 'failed_closed') fail('visual delta guard does not fail closed');

const visualContract = requireReadyGroup(proof, 'visual_contract_layout_affordance');
if (visualContract.evidence?.service?.mode !== 'deployed_den_srv') fail('visual-contract group does not use deployed service');
if (visualContract.evidence?.currentCompare?.verdict !== 'pass') fail('visual-contract candidate did not pass');
if (visualContract.evidence?.currentCompare?.failureCount !== 0) fail('visual-contract candidate has failures');
if (visualContract.evidence?.negativeCompare?.verdict !== 'fail') fail('visual-contract negative did not fail closed');
for (const expected of ['selected_target_inspector_exists', 'central_viewport_is_dominant']) {
  if (!visualContract.evidence?.negativeCompare?.failures?.includes(expected)) fail(`visual-contract negative missing ${expected}`);
}
for (const path of [visualContract.evidence?.currentCompare?.localReportArtifact, visualContract.evidence?.currentCompare?.localDiffOverlayArtifact, visualContract.evidence?.negativeCompare?.localReportArtifact, visualContract.evidence?.negativeCompare?.localDiffOverlayArtifact]) {
  requirePath(path, 'visual-contract deployed artifact copy');
}

const command = requireReadyGroup(proof, 'command_authority_correlation');
for (const commandId of ['inspection.editor_state', 'selection.voxel_from_screen_point', 'preview.voxel_brush', 'authority.voxel.apply_brush', 'render.capture_before_after', 'export.agent_readout']) {
  if (!command.evidence?.timelineCommandIds?.includes(commandId)) fail(`command correlation missing ${commandId}`);
}
if (command.evidence?.visualHashDelta?.changed !== true) fail('command visual hash delta did not change');
if (command.evidence?.reviewCaptureReadiness !== 'ready') fail('command review capture readiness is not ready');

const runtime = requireReadyGroup(proof, 'runtime_authority_bridge');
if (runtime.evidence?.runtimeMode !== 'native') fail('runtime bridge group must use native mode');
if (runtime.evidence?.authoritySource !== 'rust_native_runtime_bridge') fail('runtime bridge authority source mismatch');
if (runtime.evidence?.compatibilityVersion !== 'runtime-bridge.v0') fail('runtime bridge compatibility mismatch');
if (runtime.evidence?.command?.commandId !== 'authority.voxel.apply_brush') fail('runtime bridge command mismatch');
if (runtime.evidence?.command?.commandResult?.rejected !== 0) fail('runtime bridge command rejected commands');
if (runtime.evidence?.command?.authorityBeforeHash === runtime.evidence?.command?.authorityAfterHash) fail('runtime bridge authority hashes did not change');
if (runtime.evidence?.render?.snapshotId !== runtime.evidence?.command?.snapshotAfterId) fail('runtime render readback snapshot mismatch');
if (!Array.isArray(runtime.evidence?.render?.renderDiff?.ops)) fail('runtime render diff ops missing');
if (runtime.evidence?.replay?.replayStep?.diverged !== false) fail('runtime replay diverged');
if (runtime.evidence?.replay?.replayStep?.hash !== runtime.evidence?.replay?.expectedHash) fail('runtime replay hash mismatch');
for (const required of ['initialize_engine', 'submit_commands', 'read_render_diffs', 'load_replay_fixture', 'run_replay_step']) {
  if (!runtime.evidence?.manifestOperations?.includes(required)) fail(`runtime bridge group missing operation ${required}`);
}

const limitations = requireReadyGroup(proof, 'non_claim_limitations');
if (limitations.evidence?.captureBackend?.gpuClaim !== 'not_claimed') fail('limitations group must preserve gpuClaim not_claimed');
for (const claim of proof.summary?.nonClaims ?? []) {
  if (!String(claim).startsWith('not_')) fail(`non-claim marker malformed: ${claim}`);
}
for (const expected of ['not_wasm_authority', 'not_agora_compositor', 'not_hardware_gpu', 'not_performance_evidence']) {
  if (!proof.summary?.nonClaims?.includes(expected)) fail(`summary missing non-claim ${expected}`);
}

// Optional additive backends must be declared as references that do not weaken the required proof.
const agora = (proof.optionalBackends ?? []).find((backend) => backend.backendId === 'agora_compositor_capture');
if (agora === undefined) fail('missing optional agora_compositor_capture backend reference');
if (agora.captureBackend !== 'agora_compositor' || agora.captureMode !== 'compositor_surface') fail('agora optional backend misclassified');
if (agora.required !== false || agora.integration !== 'additive') fail('agora optional backend must be additive and not required');
if (agora.proofCommand !== 'pnpm run proof:agora-compositor') fail('agora optional backend proofCommand mismatch');
// The required browser-screenshot non-claims must remain intact even with the optional backend declared.
for (const expected of ['not_wasm_authority', 'not_agora_compositor', 'not_hardware_gpu', 'not_performance_evidence']) {
  if (!proof.summary?.nonClaims?.includes(expected)) fail(`optional backend must not remove non-claim ${expected}`);
}

const smokeById = new Map((proof.negativeSmokes ?? []).map((smoke) => [smoke.smokeId, smoke]));
const expectedSmokes = {
  negative_missing_scene_readback: ['missing_scene_readback'],
  negative_missing_pick_evidence: ['missing_pick_evidence'],
  negative_stale_visual_delta: ['stale_visual_delta_scene_hash', 'stale_visual_delta_crop_hash'],
  negative_missing_failed_visual_contract_proof: ['missing_visual_contract_proof', 'visual_contract_candidate_failed'],
  negative_missing_runtime_bridge_metadata: ['missing_runtime_bridge_metadata'],
  negative_runtime_bridge_version_mismatch: ['runtime_bridge_version_mismatch'],
  negative_runtime_bridge_stale_snapshot: ['stale_runtime_snapshot'],
  negative_runtime_bridge_replay_mismatch: ['replay_mismatch'],
  negative_runtime_bridge_raw_transport_bypass: ['raw_transport_bypass'],
  negative_unsupported_evidence_claims: ['unsupported_gpu_claim'],
};
for (const [smokeId, codes] of Object.entries(expectedSmokes)) {
  const smoke = smokeById.get(smokeId);
  if (smoke === undefined) fail(`missing negative smoke ${smokeId}`);
  if (smoke.status !== 'expected_failed_closed') fail(`negative smoke ${smokeId} status is ${smoke.status}`);
  for (const code of codes) {
    if (!smoke.diagnosticCodes?.includes(code)) fail(`negative smoke ${smokeId} missing diagnostic ${code}`);
  }
}

if (proof.summary?.visibleRenderableCount !== scene.evidence.visibleRenderableCount) fail('summary visible renderable count mismatch');
if (proof.summary?.beforeRenderHash === proof.summary?.afterRenderHash) fail('summary before/after render hashes must differ');
if (proof.summary?.beforeCropPath !== visualDelta.evidence.beforeCrop.cropPath) fail('summary before crop path mismatch');
if (proof.summary?.afterCropPath !== visualDelta.evidence.afterCrop.cropPath) fail('summary after crop path mismatch');
if (!proof.summary?.visualContractRunIds?.includes(visualContract.evidence.currentCompare.runId)) fail('summary missing current visual-contract run id');
if (!proof.summary?.visualContractRunIds?.includes(visualContract.evidence.negativeCompare.runId)) fail('summary missing negative visual-contract run id');

console.log(`asha-studio visual capability proof readback: OK (${proof.capabilityGroups.length} group(s), ${proof.negativeSmokes.length} negative smoke(s))`);
