import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, 'artifacts', 'v1-proof', 'latest', 'index.json');

function fail(message) {
  throw new Error(`asha-studio V1 proof readback failed: ${message}`);
}

function sha256(text) {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

if (!existsSync(artifactPath)) fail('missing artifacts/v1-proof/latest/index.json; run pnpm run proof:v1 first');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
if (artifact.schemaVersion !== 1) fail('schemaVersion must be 1');
if (artifact.artifactKind !== 'v1_visual_edit_proof') fail('artifactKind must be v1_visual_edit_proof');
if (artifact.taskId !== 2738) fail('taskId must be 2738');
if (artifact.launch?.indexStatus !== 200 || artifact.launch?.bundleStatus !== 200) fail('launch proof did not fetch index and bundle successfully');
if (!Array.isArray(artifact.launch?.missingUiMarkers) || artifact.launch.missingUiMarkers.length !== 0) fail('launch proof has missing UI markers');
if (artifact.boundaryCheck?.status !== 'passed') fail('boundary check did not pass');
if (artifact.scenario?.status !== 'loaded') fail('scenario is not loaded');
const timeline = artifact.commandTimeline;
if (!Array.isArray(timeline) || timeline.length < 9) fail('command timeline is missing or too short');
const requiredCommands = ['session.start', 'session.load_scenario', 'inspection.session_status', 'inspection.voxel', 'selection.voxel_from_screen_point', 'preview.voxel_brush', 'authority.voxel.apply_brush', 'render.capture_before_after', 'export.agent_readout'];
for (const commandId of requiredCommands) {
  if (!timeline.some((entry) => entry.commandId === commandId)) fail(`timeline missing ${commandId}`);
}
const results = artifact.commandResults;
if (!Array.isArray(results) || results.length !== timeline.length) fail('command results must align with timeline length');
const applyResult = results.find((result) => result.commandId === 'authority.voxel.apply_brush');
if (applyResult === undefined) fail('missing authority apply command result');
const state = applyResult.state;
if (state?.authorityBeforeHash == null || state?.authorityAfterHash == null || state.authorityBeforeHash === state.authorityAfterHash) fail('authority hashes missing or unchanged');
if (state?.renderBeforeHash == null || state?.renderAfterHash == null || state.renderBeforeHash === state.renderAfterHash) fail('render hashes missing or unchanged');
const visual = artifact.visualEvidence?.[0];
if (visual?.captureReadiness !== 'ready') fail('visual evidence is not ready');
if (visual.beforeRenderHash == null || visual.afterRenderHash == null || visual.beforeRenderHash === visual.afterRenderHash) fail('visual evidence hashes missing or unchanged');
if (artifact.reviewArtifact?.captureReadiness !== 'ready') fail('review artifact is not ready');
if (!Array.isArray(artifact.proofSteps) || artifact.proofSteps.length !== 9) fail('proofSteps must contain 9 V1 requirements');
for (const step of artifact.proofSteps) {
  if (step.status !== 'passed') fail(`proof step ${step.id} did not pass: ${step.requirement}`);
}
for (const file of artifact.artifacts ?? []) {
  const path = join(root, file.path);
  if (!existsSync(path)) fail(`listed artifact is missing: ${file.path}`);
  const actual = sha256(readFileSync(path, 'utf8'));
  if (actual !== file.sha256) fail(`sha mismatch for ${file.path}`);
}
console.log(`asha-studio V1 proof readback: OK (${artifact.proofSteps.length} proof steps, ${artifact.artifacts.length} artifact file(s))`);
