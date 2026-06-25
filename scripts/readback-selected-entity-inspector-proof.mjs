import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, 'artifacts', 'selected-entity-inspector-proof', 'latest', 'index.json');

function fail(message) {
  throw new Error(`asha-studio selected entity inspector proof readback failed: ${message}`);
}

function sha256(text) {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

if (!existsSync(artifactPath)) fail('missing artifacts/selected-entity-inspector-proof/latest/index.json; run pnpm run proof:inspector first');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
if (artifact.schemaVersion !== 1) fail('schemaVersion must be 1');
if (artifact.artifactKind !== 'studio_selected_entity_inspector_proof') fail('artifactKind must be studio_selected_entity_inspector_proof');
if (artifact.taskId !== 3217) fail('taskId must be 3217');
if (artifact.boundaryCheck?.status !== 'passed') fail('boundary check did not pass');
if (typeof artifact.selectedEntityId !== 'string' || artifact.selectedEntityId.length === 0) fail('missing selected entity id');
if (!Array.isArray(artifact.editableFieldKeys) || artifact.editableFieldKeys.length !== 1 || artifact.editableFieldKeys[0] !== 'name') fail('exactly one editable field (name) must be exposed');
if (!Array.isArray(artifact.diagnostics) || artifact.diagnostics.length !== 0) fail('live inspector must have no fail-closed diagnostics');

const edit = artifact.edit;
if (edit?.commandId !== 'entity.set_name') fail('inspector edit must flow through entity.set_name');
if (edit.fieldKey !== 'name') fail('inspector edit must target the name field');
if (edit.applied !== true || edit.inSync !== true) fail('inspector edit must be applied and synced');
if (!edit.sequenceId) fail('inspector edit must be recorded on the shared timeline');
if (edit.nameBefore === edit.nameAfter) fail('inspector edit must change the display name');

const output = artifact.editCommandOutput;
if (output === null || typeof output !== 'object' || typeof output.name !== 'string' || typeof output.nameHash !== 'string' || output.applied !== true) {
  fail('entity.set_name command result does not carry the typed SetEntityNameOutput evidence');
}
if (output.entityId !== artifact.selectedEntityId || output.renderableId !== artifact.selectedEntityId || output.name !== edit.nameAfter || output.nameHash !== edit.nameHash) {
  fail('entity.set_name command output does not match the synced inspector edit');
}
if (artifact.viewportSelectedEntityName !== edit.nameAfter) fail('viewport readback did not update with the applied display name');

const requiredCodes = ['missing_selected_entity', 'inspector_readback_drift', 'stale_inspector_state', 'unsupported_field_edit', 'edit_command_mismatch'];
if (!Array.isArray(artifact.negativeSmokes) || artifact.negativeSmokes.length !== 5) fail('expected 5 negative smokes');
for (const code of requiredCodes) {
  const smoke = artifact.negativeSmokes.find((entry) => entry.code === code);
  if (smoke === undefined) fail(`missing negative smoke for ${code}`);
  if (smoke.actualOutcome !== 'failed_closed') fail(`negative smoke ${code} did not fail closed`);
  if (!Array.isArray(smoke.diagnosticCodes) || !smoke.diagnosticCodes.includes(code)) fail(`negative smoke ${code} lacks its classified diagnostic`);
}
if (!Array.isArray(artifact.proofSteps) || artifact.proofSteps.length !== 10) fail('proofSteps must contain 10 requirements');
for (const step of artifact.proofSteps) {
  if (step.status !== 'passed') fail(`proof step ${step.id} did not pass: ${step.requirement}`);
}
for (const file of artifact.artifacts ?? []) {
  const path = join(root, file.path);
  if (!existsSync(path)) fail(`listed artifact is missing: ${file.path}`);
  if (sha256(readFileSync(path, 'utf8')) !== file.sha256) fail(`sha mismatch for ${file.path}`);
}
console.log(`asha-studio selected entity inspector proof readback: OK (entity ${artifact.selectedEntityId} renamed to "${artifact.edit.nameAfter}" via ${artifact.edit.sequenceId}, ${artifact.negativeSmokes.length} negative smoke(s))`);
