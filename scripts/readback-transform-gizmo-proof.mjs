import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, 'artifacts', 'transform-gizmo-proof', 'latest', 'index.json');

function fail(message) {
  throw new Error(`asha-studio transform gizmo proof readback failed: ${message}`);
}

function sha256(text) {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

if (!existsSync(artifactPath)) fail('missing artifacts/transform-gizmo-proof/latest/index.json; run pnpm run proof:gizmo first');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
if (artifact.schemaVersion !== 1) fail('schemaVersion must be 1');
if (artifact.artifactKind !== 'studio_transform_gizmo_proof') fail('artifactKind must be studio_transform_gizmo_proof');
if (artifact.taskId !== 3218) fail('taskId must be 3218');
if (artifact.boundaryCheck?.status !== 'passed') fail('boundary check did not pass');
if (typeof artifact.selectedEntityId !== 'string' || artifact.selectedEntityId.length === 0) fail('missing selected entity id');
if (artifact.operation !== 'translate') fail('operation must be translate');
if (!Array.isArray(artifact.handleAxes) || artifact.handleAxes.join(',') !== 'x,y,z') fail('gizmo must expose x/y/z axis handles');
if (!Array.isArray(artifact.diagnostics) || artifact.diagnostics.length !== 0) fail('live gizmo must have no fail-closed diagnostics');

const edit = artifact.edit;
if (edit?.commandId !== 'transform.translate_entity') fail('gizmo edit must flow through transform.translate_entity');
if (edit.operation !== 'translate') fail('gizmo edit must be a translate');
if (edit.applied !== true || edit.inSync !== true) fail('gizmo edit must be applied and synced');
if (edit.mutationSource !== 'transform.translate_entity_command') fail('gizmo edit must come from the public typed command, not a private path');
if (!edit.previewSequenceId || !edit.applySequenceId) fail('gizmo edit must record preview and apply on the shared timeline');
if (edit.previewSequenceId === edit.applySequenceId) fail('preview and apply must be distinct timeline sequences');

const transform = artifact.transform;
if (!Array.isArray(transform?.before) || !Array.isArray(transform?.after)) fail('gizmo transform must record before/after translation');
if (transform.before.join(',') === transform.after.join(',')) fail('gizmo transform must change the translation (before != after)');

const output = artifact.applyCommandOutput;
if (output === null || typeof output !== 'object' || !Array.isArray(output.translationAfter) || !Array.isArray(output.translationBefore) || output.applied !== true || output.mode !== 'apply') {
  fail('transform.translate_entity apply result does not carry the typed before/after evidence');
}
if (output.entityId !== artifact.selectedEntityId || output.renderableId !== artifact.selectedEntityId || output.transformHash !== edit.transformHash || output.translationBefore.join(',') !== transform.before.join(',') || output.translationAfter.join(',') !== transform.after.join(',')) {
  fail('transform.translate_entity apply output does not match the synced gizmo edit (before or after)');
}

const preview = artifact.previewCommandOutput;
if (preview === null || typeof preview !== 'object' || preview.mode !== 'preview' || preview.applied !== false || !Array.isArray(preview.translationAfter)) {
  fail('transform.translate_entity preview result must be an editor-local, non-committed preview');
}
if (preview.entityId !== artifact.selectedEntityId || preview.axis !== artifact.activeAxis || preview.translationAfter.join(',') !== transform.after.join(',') || transform.preview.join(',') !== transform.after.join(',')) {
  fail('transform.translate_entity preview output does not match the expected editor-local preview translation');
}

const viewport = artifact.viewportTransformGizmo;
if (viewport === null || typeof viewport !== 'object' || viewport.applied !== true || viewport.translationAfter.join(',') !== transform.after.join(',')) {
  fail('viewport readback did not update with the applied transform');
}

const requiredCodes = ['missing_selected_entity', 'stale_gizmo_selection', 'missing_gizmo_handle', 'transform_readback_mismatch', 'private_mutation_path'];
if (!Array.isArray(artifact.negativeSmokes) || artifact.negativeSmokes.length !== 7) fail('expected 7 negative smokes');
for (const smoke of artifact.negativeSmokes) {
  if (smoke.actualOutcome !== 'failed_closed') fail(`negative smoke ${smoke.id} did not fail closed`);
  if (!Array.isArray(smoke.diagnosticCodes) || !smoke.diagnosticCodes.includes(smoke.code)) fail(`negative smoke ${smoke.id} lacks its classified diagnostic`);
}
for (const code of requiredCodes) {
  if (!artifact.negativeSmokes.some((entry) => entry.code === code)) fail(`missing negative smoke for ${code}`);
}
for (const id of ['negative:transform-readback-mismatch-after', 'negative:transform-readback-mismatch-before', 'negative:preview-readback-mismatch']) {
  if (!artifact.negativeSmokes.some((entry) => entry.id === id)) fail(`missing transform/readback mismatch smoke ${id}`);
}
if (!Array.isArray(artifact.proofSteps) || artifact.proofSteps.length !== 12) fail('proofSteps must contain 12 requirements');
for (const step of artifact.proofSteps) {
  if (step.status !== 'passed') fail(`proof step ${step.id} did not pass: ${step.requirement}`);
}
for (const file of artifact.artifacts ?? []) {
  const path = join(root, file.path);
  if (!existsSync(path)) fail(`listed artifact is missing: ${file.path}`);
  if (sha256(readFileSync(path, 'utf8')) !== file.sha256) fail(`sha mismatch for ${file.path}`);
}
console.log(`asha-studio transform gizmo proof readback: OK (entity ${artifact.selectedEntityId} translated ${artifact.activeAxis} [${transform.before.join(', ')}] -> [${transform.after.join(', ')}] via ${edit.previewSequenceId}+${edit.applySequenceId}, ${artifact.negativeSmokes.length} negative smoke(s))`);
