import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, 'artifacts', 'entity-browser-proof', 'latest', 'index.json');

function fail(message) {
  throw new Error(`asha-studio entity browser proof readback failed: ${message}`);
}

function sha256(text) {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

if (!existsSync(artifactPath)) fail('missing artifacts/entity-browser-proof/latest/index.json; run pnpm run proof:entity-browser first');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
if (artifact.schemaVersion !== 1) fail('schemaVersion must be 1');
if (artifact.artifactKind !== 'studio_entity_browser_proof') fail('artifactKind must be studio_entity_browser_proof');
if (artifact.taskId !== 3216) fail('taskId must be 3216');
if (artifact.boundaryCheck?.status !== 'passed') fail('boundary check did not pass');
if (!Array.isArray(artifact.entityIds) || artifact.entityIds.length !== artifact.entityCount) fail('entity ids/count mismatch');
if (artifact.selection?.commandId !== 'selection.set_active_entity') fail('selection must sync through selection.set_active_entity');
if (artifact.selection?.inSync !== true) fail('hierarchy selection is not synced to the viewport renderable');
if (!artifact.selection?.sequenceId) fail('selection command not recorded in the shared timeline');
if (artifact.selection.selectedEntityId !== artifact.selection.viewportRenderableId) fail('selected entity does not match viewport renderable');
if (!Array.isArray(artifact.diagnostics) || artifact.diagnostics.length !== 0) fail('live entity browser must have no fail-closed diagnostics');
const output = artifact.selectionCommandOutput;
if (output === null || typeof output !== 'object' || typeof output.entityId !== 'string' || typeof output.renderableId !== 'string' || typeof output.selectionHash !== 'string' || output.selected !== true) {
  fail('selection.set_active_entity command result does not carry the typed SetActiveEntityOutput evidence');
}
if (output.entityId !== artifact.selection.selectedEntityId || output.renderableId !== artifact.selection.viewportRenderableId) {
  fail('selection command output entity/renderable does not match the synced viewport selection');
}
const requiredCodes = ['hierarchy_readback_drift', 'missing_selected_entity', 'stale_entity_list', 'unsupported_private_entity_source', 'selection_sync_mismatch'];
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
console.log(`asha-studio entity browser proof readback: OK (${artifact.entityCount} entities, selection synced via ${artifact.selection.sequenceId}, ${artifact.negativeSmokes.length} negative smoke(s))`);
