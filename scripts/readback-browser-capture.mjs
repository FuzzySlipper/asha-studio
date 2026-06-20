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
if (artifact.taskId !== 3022) fail(`unexpected taskId ${artifact.taskId}`);
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
if (!artifact.readiness.requiredMarkers.includes('software_snapshot_reference')) fail('software_snapshot marker not required');
if (!artifact.readiness.requiredMarkers.includes('runtime bridge: deferred')) fail('runtime-deferred marker not required');
if (!artifact.readiness.requiredMarkers.includes('native / Agora / GPU: not claimed')) fail('no-GPU/Agora marker not required');
if (!Array.isArray(artifact.correlation?.missingTimelineCommandIds) || artifact.correlation.missingTimelineCommandIds.length !== 0) fail('timeline correlation has missing command IDs');

const linkedPath = join(root, artifact.linkedV1Proof?.path ?? '');
if (!existsSync(linkedPath)) fail(`linked V1 proof artifact is missing: ${artifact.linkedV1Proof?.path ?? 'missing path'}`);
const linkedBytes = readFileSync(linkedPath);
if (sha256(linkedBytes) !== artifact.linkedV1Proof.sha256) fail('linked V1 proof SHA256 mismatch');

if (!Array.isArray(artifact.screenshots) || artifact.screenshots.length < 2) fail('expected at least two browser screenshots');
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

console.log(`asha-studio browser visual capture readback: OK (${artifact.screenshots.length} screenshot(s), ${artifact.linkedV1Proof.proofStepCount} linked proof steps, ${artifact.readiness.markerGroups.length} editor-shell marker group(s))`);
