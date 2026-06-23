#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, 'artifacts', 'browser-capture', 'latest', 'index.json');

function fail(message) {
  console.error(`asha-studio browser visual capture readback: FAIL: ${message}`);
  process.exit(1);
}

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function pngDimensions(bytes) {
  if (bytes.length < 24) fail('PNG screenshot is too small to contain dimensions');
  if (bytes.toString('ascii', 1, 4) !== 'PNG') fail('screenshot is not a PNG file');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

if (!existsSync(artifactPath)) fail('missing artifacts/browser-capture/latest/index.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

if (artifact.schemaVersion !== 1) fail(`unexpected schemaVersion ${artifact.schemaVersion}`);
if (artifact.artifactKind !== 'browser_visual_capture_proof') fail(`unexpected artifactKind ${artifact.artifactKind}`);
if (artifact.taskId !== 3045) fail(`unexpected taskId ${artifact.taskId}`);
if (artifact.editorShellTarget?.mockupPath !== join(root, 'local', 'ui-test.html')) fail('editor shell mockup target path is missing or incorrect');
if (artifact.editorShellTarget?.comparisonMode !== 'structural_semantic_markers') fail('comparison mode must be structural/semantic markers');
if (artifact.editorShellTarget?.pixelPerfect !== false) fail('browser readback must not claim pixel-perfect matching');
if (artifact.captureBackend?.captureMode !== 'browser_screenshot') fail('capture backend is not browser_screenshot');
if (artifact.captureBackend?.runtime !== 'chromium_headless_cli') fail('runtime is not chromium_headless_cli');
if (artifact.captureBackend?.gpuClaim !== 'not_claimed') fail('artifact must not claim hardware GPU evidence');
if (artifact.readiness?.status !== 'ready') fail(`readiness is ${artifact.readiness?.status ?? 'missing'}`);
if (artifact.correlation?.status !== 'matched') fail(`correlation is ${artifact.correlation?.status ?? 'missing'}`);
if (artifact.comparison?.status !== 'changed') fail(`comparison is ${artifact.comparison?.status ?? 'missing'}`);
if (artifact.correlation?.visualHashDelta?.changed !== true) fail('visual hash delta did not change');
if (!Array.isArray(artifact.readiness?.appMissingMarkers) || artifact.readiness.appMissingMarkers.length !== 0) fail('app route has missing markers');
if (!Array.isArray(artifact.readiness?.proofMissingMarkers) || artifact.readiness.proofMissingMarkers.length !== 0) fail('proof route has missing markers');
const requiredGroupIds = new Set([
  'top_app_status_bar',
  'left_scene_hierarchy_dock',
  'central_reference_viewport',
  'right_inspector_dock',
  'bottom_command_evidence_dock',
  'preview_applied_authority_render_readouts',
]);
if (!Array.isArray(artifact.readiness?.markerGroups)) fail('readiness markerGroups missing');
for (const groupId of requiredGroupIds) {
  const group = artifact.readiness.markerGroups.find((candidate) => candidate.groupId === groupId);
  if (group === undefined) fail(`missing editor-shell marker group ${groupId}`);
  if (group.status !== 'present') fail(`editor-shell marker group failed: ${groupId}`);
  if (!Array.isArray(group.missingMarkers) || group.missingMarkers.length !== 0) fail(`editor-shell marker group has missing markers: ${groupId}`);
  if (!Array.isArray(group.requiredMarkers) || group.requiredMarkers.length === 0) fail(`editor-shell marker group has no required markers: ${groupId}`);
}
if (!artifact.readiness.requiredMarkers.includes('studio-3d-webgl-canvas')) fail('3D canvas marker not required');
if (!artifact.readiness.requiredMarkers.includes('three_local_browser_projection')) fail('Three.js browser projection marker not required');
if (!artifact.readiness.requiredMarkers.includes('native / Agora / GPU: not claimed')) fail('no-GPU/Agora marker not required');
if (artifact.viewport3dCanvasDom?.detectionMode !== 'chromium_dump_dom_canvas_element') fail('viewport3d canvas DOM detection mode missing');
if (artifact.viewport3dCanvasDom?.requiredClass !== 'studio-3d-webgl-canvas') fail('viewport3d canvas DOM required class mismatch');
if (artifact.viewport3dCanvasDom?.requiredDataCanvasRole !== 'studio-3d-webgl-canvas') fail('viewport3d canvas DOM required data role mismatch');
if (artifact.viewport3dCanvasDom?.canvasElementPresent !== true) fail('viewport3d canvas DOM element is not present');
if (!Number.isInteger(artifact.viewport3dCanvasDom?.canvasElementCount) || artifact.viewport3dCanvasDom.canvasElementCount < 1) fail(`viewport3d canvas DOM element count is ${artifact.viewport3dCanvasDom?.canvasElementCount ?? 'missing'}`);
if (artifact.viewport3d?.artifactKind !== 'viewport_3d_readback') fail('viewport3d readback artifact is missing');
if (artifact.viewport3d?.readiness !== 'ready') fail(`viewport3d readiness is ${artifact.viewport3d?.readiness ?? 'missing'}`);
if (artifact.viewport3d?.hostKind !== 'three_local_browser_projection') fail('viewport3d host is not Three.js local browser projection');
if (artifact.viewport3d?.canvasMarker !== 'studio-3d-webgl-canvas') fail('viewport3d canvas marker mismatch');
if (artifact.viewport3d?.visibleRenderableCount < 1) fail('viewport3d has no visible renderables');
if (artifact.viewport3d?.selectedRenderableId !== 'selected-voxel:0,0,0') fail('viewport3d selected renderable mismatch');
if (artifact.viewport3d?.previewGhostId !== 'preview-ghost:1,0,0') fail('viewport3d preview ghost mismatch');
if (artifact.viewport3d?.appliedRenderableId !== 'applied-voxel:1,0,0') fail('viewport3d applied renderable mismatch');
if (artifact.viewport3d?.dependencyDecision !== 'direct_three_local_browser_projection_dependency') fail('viewport3d dependency decision missing');
if (artifact.viewport3d?.interactionProof?.artifactKind !== 'viewport_camera_tool_interaction_proof') fail('viewport3d interaction proof missing');
if (artifact.viewport3d.interactionProof.readiness !== 'ready') fail(`viewport3d interaction proof readiness is ${artifact.viewport3d.interactionProof.readiness}`);
if (artifact.viewport3d.interactionProof.toolState?.activeTool !== 'voxel_brush') fail('viewport3d active tool did not persist as voxel_brush');
if (artifact.viewport3d.interactionProof.toolState?.cameraChanged !== true) fail('viewport3d camera interaction did not record a camera delta');
if (artifact.viewport3d.interactionProof.toolState.cameraBeforeHash === artifact.viewport3d.interactionProof.toolState.cameraAfterHash) fail('viewport3d camera hashes did not change');
if (artifact.viewport3d.interactionProof.toolState.cameraAfterHash !== artifact.viewport3d.interactionProof.staleReadbackGuard?.requiredCameraAfterHash) fail('viewport3d camera stale-readback guard is mismatched');
if (artifact.viewport3d.interactionProof.selectedRenderableId !== artifact.viewport3d.selectedRenderableId) fail('viewport3d interaction selected renderable does not match scene readback');
if (artifact.viewport3d.interactionProof.staleReadbackGuard?.requiredSelectionHash !== artifact.viewport3d.selectionHash) fail('viewport3d selection stale-readback guard is mismatched');
if (artifact.viewport3d.interactionProof.staleReadbackGuard?.requiredPreviewGhostId !== artifact.viewport3d.previewGhostId) fail('viewport3d preview ghost stale-readback guard is mismatched');
if (artifact.viewport3d.interactionProof.staleReadbackGuard?.mismatchPolicy !== 'failed_closed') fail('viewport3d interaction mismatch policy must fail closed');
if (artifact.viewport3d.pickEvidence?.artifactKind !== 'viewport_pick_hit_test_evidence') fail('viewport3d pick evidence missing');
if (artifact.viewport3d.pickEvidence.readiness !== 'ready') fail(`viewport3d pick evidence readiness is ${artifact.viewport3d.pickEvidence.readiness}`);
if (artifact.viewport3d.pickEvidence.proofMode !== 'three_raycaster_semantic_readback') fail('viewport3d pick proof mode mismatch');
if (artifact.viewport3d.pickEvidence.sourceTimelineCommandId !== 'selection.voxel_from_screen_point') fail('viewport3d pick evidence is not linked to selection command');
if (artifact.viewport3d.pickEvidence.hit?.outcome !== 'hit') fail('viewport3d positive pick did not record a hit');
if (artifact.viewport3d.pickEvidence.hit.renderableId !== artifact.viewport3d.selectedRenderableId) fail('viewport3d pick hit renderable mismatch');
if (artifact.viewport3d.pickEvidence.hit.voxelId !== 'voxel:0,0,0') fail('viewport3d pick hit voxel mismatch');
if (artifact.viewport3d.pickEvidence.hit.face !== 'posX') fail('viewport3d pick hit face mismatch');
if (artifact.viewport3d.pickEvidence.hit.selectionHash !== artifact.viewport3d.selectionHash) fail('viewport3d pick hit selection hash mismatch');
if (typeof artifact.viewport3d.pickEvidence.hit.rayHash !== 'string' || !artifact.viewport3d.pickEvidence.hit.rayHash.startsWith('pick-ray-fnv1a-')) fail('viewport3d pick hit ray hash missing');
if (artifact.viewport3d.pickEvidence.backgroundNoHit?.outcome !== 'no_hit') fail('viewport3d background pick must record a no-hit result');
if (artifact.viewport3d.pickEvidence.backgroundNoHit.reason !== 'background_point_misses_pickable_renderables') fail('viewport3d background no-hit reason mismatch');
if (artifact.viewport3d.pickEvidence.crossChecks?.selectedRenderableId !== artifact.viewport3d.selectedRenderableId) fail('viewport3d pick cross-check selected renderable mismatch');
if (artifact.viewport3d.pickEvidence.crossChecks?.inspectorSelectedVoxelId !== 'voxel:0,0,0') fail('viewport3d pick cross-check inspector selected voxel mismatch');
if (artifact.viewport3d.pickEvidence.crossChecks?.hierarchyNodeId !== 'voxel:0,0,0') fail('viewport3d pick cross-check hierarchy node mismatch');
if (artifact.viewport3d.pickEvidence.crossChecks?.editAnchorVoxelId !== 'voxel:1,0,0') fail('viewport3d pick cross-check edit anchor mismatch');
if (artifact.viewport3d.pickEvidence.crossChecks?.selectionHash !== artifact.viewport3d.selectionHash) fail('viewport3d pick cross-check selection hash mismatch');
if (artifact.viewport3d.pickEvidence.staleReadbackGuard?.requiredCameraHash !== artifact.viewport3d.pickEvidence.cameraHash) fail('viewport3d pick camera stale-readback guard mismatch');
if (artifact.viewport3d.pickEvidence.staleReadbackGuard?.requiredViewportHash !== artifact.viewport3d.pickEvidence.viewportHash) fail('viewport3d pick viewport stale-readback guard mismatch');
if (artifact.viewport3d.pickEvidence.staleReadbackGuard?.requiredSelectionHash !== artifact.viewport3d.selectionHash) fail('viewport3d pick selection stale-readback guard mismatch');
if (artifact.viewport3d.pickEvidence.staleReadbackGuard?.requiredHitRenderableId !== artifact.viewport3d.selectedRenderableId) fail('viewport3d pick renderable stale-readback guard mismatch');
if (artifact.viewport3d.pickEvidence.staleReadbackGuard?.requiredNoHitRayHash !== artifact.viewport3d.pickEvidence.backgroundNoHit.rayHash) fail('viewport3d pick no-hit stale-readback guard mismatch');
if (artifact.viewport3d.pickEvidence.staleReadbackGuard?.mismatchPolicy !== 'failed_closed') fail('viewport3d pick mismatch policy must fail closed');
if (artifact.viewportVisualDelta?.artifactKind !== 'viewport_visual_delta_crop_proof') fail('viewport visual delta proof missing');
if (artifact.viewportVisualDelta.readiness !== 'ready') fail(`viewport visual delta readiness is ${artifact.viewportVisualDelta.readiness}`);
if (artifact.viewportVisualDelta.proofMode !== 'targeted_browser_screenshot_crops') fail('viewport visual delta proof mode mismatch');
if (artifact.viewportVisualDelta.sceneHashChanged !== true) fail('viewport visual delta scene hash did not change');
if (artifact.viewportVisualDelta.cropHashChanged !== true) fail('viewport visual delta crop hash did not change');
if (artifact.viewportVisualDelta.beforeSceneHash === artifact.viewportVisualDelta.afterSceneHash) fail('viewport visual delta before/after scene hashes match');
if (artifact.viewportVisualDelta.beforeCrop?.renderableId !== 'edit-anchor-empty-before') fail('viewport visual delta before crop source-state handle mismatch');
if (artifact.viewportVisualDelta.afterCrop?.renderableId !== artifact.viewport3d.appliedRenderableId) fail('viewport visual delta after crop renderable mismatch');
if (artifact.viewportVisualDelta.beforeCrop?.linkedCommandId !== 'preview.voxel_brush') fail('viewport visual delta before crop command mismatch');
if (artifact.viewportVisualDelta.afterCrop?.linkedCommandId !== 'authority.voxel.apply_brush') fail('viewport visual delta after crop command mismatch');
if (artifact.viewportVisualDelta.beforeCrop?.voxelId !== 'voxel:1,0,0') fail('viewport visual delta before crop voxel mismatch');
if (artifact.viewportVisualDelta.afterCrop?.voxelId !== 'voxel:1,0,0') fail('viewport visual delta after crop voxel mismatch');
if (artifact.viewportVisualDelta.beforeCrop?.screenshotPath === artifact.viewportVisualDelta.afterCrop?.screenshotPath) fail('viewport visual delta before/after crops must not come from the same screenshot');
if (artifact.viewportVisualDelta.beforeCrop?.sourceState?.phase !== 'before') fail('viewport visual delta before crop source phase mismatch');
if (artifact.viewportVisualDelta.afterCrop?.sourceState?.phase !== 'after') fail('viewport visual delta after crop source phase mismatch');
if (artifact.viewportVisualDelta.beforeCrop?.sourceState?.sourceSceneHash !== artifact.viewportVisualDelta.beforeSceneHash) fail('viewport visual delta before crop source scene mismatch');
if (artifact.viewportVisualDelta.afterCrop?.sourceState?.sourceSceneHash !== artifact.viewportVisualDelta.afterSceneHash) fail('viewport visual delta after crop source scene mismatch');
if (artifact.viewportVisualDelta.beforeCrop?.sourceState?.sourceScreenshotName !== 'studio-app-viewport-before') fail('viewport visual delta before crop screenshot source mismatch');
if (artifact.viewportVisualDelta.afterCrop?.sourceState?.sourceScreenshotName !== 'studio-app-viewport-after') fail('viewport visual delta after crop screenshot source mismatch');
for (const key of ['x', 'y', 'width', 'height']) {
  if (artifact.viewportVisualDelta.beforeCrop.cropRect[key] !== artifact.viewportVisualDelta.afterCrop.cropRect[key]) fail(`viewport visual delta crop rect ${key} differs between before/after`);
}
if (artifact.viewportVisualDelta.beforeCrop?.cropSha256 === artifact.viewportVisualDelta.afterCrop?.cropSha256) fail('viewport visual delta crop hashes unexpectedly match');
if (artifact.viewportVisualDelta.staleReadbackGuard?.requiredBeforeSceneHash !== artifact.viewportVisualDelta.beforeSceneHash) fail('viewport visual delta before scene stale guard mismatch');
if (artifact.viewportVisualDelta.staleReadbackGuard?.requiredAfterSceneHash !== artifact.viewportVisualDelta.afterSceneHash) fail('viewport visual delta after scene stale guard mismatch');
if (artifact.viewportVisualDelta.staleReadbackGuard?.requiredBeforeCropHash !== artifact.viewportVisualDelta.beforeCrop.cropSha256) fail('viewport visual delta before crop stale guard mismatch');
if (artifact.viewportVisualDelta.staleReadbackGuard?.requiredAfterCropHash !== artifact.viewportVisualDelta.afterCrop.cropSha256) fail('viewport visual delta after crop stale guard mismatch');
if (artifact.viewportVisualDelta.staleReadbackGuard?.mismatchPolicy !== 'failed_closed') fail('viewport visual delta mismatch policy must fail closed');
for (const crop of [artifact.viewportVisualDelta.beforeCrop, artifact.viewportVisualDelta.afterCrop]) {
  if (crop.mediaType !== 'image/png') fail(`${crop.name} is not image/png`);
  const cropPath = join(root, crop.cropPath);
  if (!existsSync(cropPath)) fail(`viewport crop is missing: ${crop.cropPath}`);
  const cropBytes = readFileSync(cropPath);
  if (sha256(cropBytes) !== crop.cropSha256) fail(`viewport crop SHA256 mismatch: ${crop.cropPath}`);
  if (sha256(cropBytes) !== crop.pixelHash) fail(`viewport crop pixel hash mismatch: ${crop.cropPath}`);
  if (cropBytes.length !== crop.byteLength) fail(`viewport crop byte length mismatch: ${crop.cropPath}`);
  const cropDimensions = pngDimensions(cropBytes);
  if (cropDimensions.width !== crop.cropRect.width || cropDimensions.height !== crop.cropRect.height) fail(`viewport crop dimensions mismatch: ${crop.cropPath}`);
  if (crop.cropRect.coordinateSpace !== 'screenshot_px') fail(`viewport crop coordinate space mismatch: ${crop.cropPath}`);
}
const interactionActionIds = new Set(artifact.viewport3d.interactionProof.scriptedActions?.map((action) => action.actionId) ?? []);
for (const actionId of ['gui.frame_selected_target', 'agent.select_visible_voxel', 'gui.toggle_preview_ghost']) {
  if (!interactionActionIds.has(actionId)) fail(`viewport3d interaction action missing: ${actionId}`);
}
if (!artifact.viewport3d.interactionProof.actorOrigins?.includes('gui') || !artifact.viewport3d.interactionProof.actorOrigins?.includes('agent')) fail('viewport3d interaction proof must include both GUI and agent origins');
if (!artifact.viewport3d.limitations.some((limitation) => limitation.includes('does not claim native runtime, Agora compositor, hardware GPU, or performance evidence'))) fail('viewport3d limitation missing no-overclaim statement');
if (!Array.isArray(artifact.correlation?.missingTimelineCommandIds) || artifact.correlation.missingTimelineCommandIds.length !== 0) fail('timeline correlation has missing command IDs');

const linkedPath = join(root, artifact.linkedV1Proof?.path ?? '');
if (!existsSync(linkedPath)) fail(`linked V1 proof artifact is missing: ${artifact.linkedV1Proof?.path ?? 'missing path'}`);
const linkedBytes = readFileSync(linkedPath);
if (sha256(linkedBytes) !== artifact.linkedV1Proof.sha256) fail('linked V1 proof SHA256 mismatch');

if (!Array.isArray(artifact.screenshots) || artifact.screenshots.length < 4) fail('expected at least four browser screenshots including before/after viewport phases');
for (const screenshot of artifact.screenshots) {
  if (screenshot.mediaType !== 'image/png') fail(`${screenshot.name} is not image/png`);
  const path = join(root, screenshot.path);
  if (!existsSync(path)) fail(`screenshot is missing: ${screenshot.path}`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== screenshot.sha256) fail(`screenshot SHA256 mismatch: ${screenshot.path}`);
  if (bytes.length !== screenshot.byteLength) fail(`screenshot byte length mismatch: ${screenshot.path}`);
  const dimensions = pngDimensions(bytes);
  if (dimensions.width !== screenshot.width || dimensions.height !== screenshot.height) fail(`screenshot dimensions mismatch: ${screenshot.path}`);
  if (dimensions.width < 1000 || dimensions.height < 700) fail(`screenshot too small for review evidence: ${screenshot.path}`);
}

console.log(`asha-studio browser visual capture readback: OK (${artifact.screenshots.length} screenshot(s), 2 same-region viewport phase crop(s), ${artifact.linkedV1Proof.proofStepCount} linked proof steps, ${artifact.readiness.markerGroups.length} editor-shell marker group(s))`);
