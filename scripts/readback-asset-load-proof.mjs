import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, 'artifacts', 'asset-load-proof', 'latest', 'index.json');

function fail(message) {
  throw new Error(`asha-studio demo asset load proof readback failed: ${message}`);
}

function sha256(text) {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

if (!existsSync(artifactPath)) fail('missing artifacts/asset-load-proof/latest/index.json; run pnpm run proof:asset-load first');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
if (artifact.schemaVersion !== 1) fail('schemaVersion must be 1');
if (artifact.artifactKind !== 'studio_demo_asset_load_proof') fail('artifactKind must be studio_demo_asset_load_proof');
if (artifact.taskId !== 3215) fail('taskId must be 3215');
if (artifact.commandId !== 'scene.load_asset') fail('proof must load through the scene.load_asset command identity');
if (artifact.boundaryCheck?.status !== 'passed') fail('boundary check did not pass');
if (!Array.isArray(artifact.renderableIds) || artifact.renderableIds.length === 0) fail('no named renderable ids in readback');
if (!Array.isArray(artifact.viewportLoadedRenderableIds) || artifact.viewportLoadedRenderableIds.length === 0) fail('loaded asset did not appear in the viewport readback');
for (const renderableId of artifact.renderableIds) {
  if (!artifact.viewportLoadedRenderableIds.includes(renderableId)) fail(`renderable ${renderableId} missing from viewport readback`);
}
if (!Array.isArray(artifact.loadDiffOps) || !artifact.loadDiffOps.includes('defineStaticMesh') || !artifact.loadDiffOps.includes('createStaticMeshInstance')) {
  fail('load diff must define and place a static mesh');
}
const provenance = artifact.provenance;
if (!provenance?.assetId || !provenance?.packagePath || !provenance?.sourcePath || !Array.isArray(provenance?.materialRefs) || provenance.materialRefs.length === 0) {
  fail('provenance missing asset/package/source/material evidence');
}
if (!Array.isArray(provenance.entityPlacementNodeIds) || provenance.entityPlacementNodeIds.length === 0) fail('provenance missing scene/entity placement node ids');
if (!provenance.sourcePath || !existsSync(join(root, provenance.sourcePath))) fail(`reported provenance sourcePath does not exist on disk: ${provenance.sourcePath}`);
const input = artifact.commandInput;
if (!input || input.assetId !== artifact.loadedAssetId || !input.materialId || !input.placement) fail('commandInput missing typed assetId/materialId/placement');
if (!Array.isArray(input.placement.translation) || input.placement.translation.length !== 3) fail('commandInput placement.translation must have 3 components');
if (!Array.isArray(input.placement.rotation) || input.placement.rotation.length !== 4) fail('commandInput placement.rotation must have 4 components');
if (!Array.isArray(input.placement.scale) || input.placement.scale.length !== 3) fail('commandInput placement.scale must have 3 components');
if (!Array.isArray(artifact.packageFileChecks) || artifact.packageFileChecks.length === 0) fail('no package file checks recorded');
for (const check of artifact.packageFileChecks) {
  if (!check.exists || !check.matches) fail(`package file missing or mismatched: ${check.path}`);
  if (!existsSync(join(root, check.path))) fail(`package file disappeared: ${check.path}`);
}
const requiredFailures = ['missing_asset', 'unsupported_format', 'material_mismatch', 'stale_catalog_lock_drift'];
if (!Array.isArray(artifact.negativeSmokes) || artifact.negativeSmokes.length !== 4) fail('expected 4 negative smokes');
for (const code of requiredFailures) {
  const smoke = artifact.negativeSmokes.find((entry) => entry.failureCode === code);
  if (smoke === undefined) fail(`missing negative smoke for ${code}`);
  if (smoke.actualOutcome !== 'failed_closed') fail(`negative smoke ${code} did not fail closed`);
  if (!Array.isArray(smoke.classifiedCodes) || smoke.classifiedCodes.length === 0) fail(`negative smoke ${code} lacks classified contract codes`);
}
if (!Array.isArray(artifact.proofSteps) || artifact.proofSteps.length !== 11) fail('proofSteps must contain 11 requirements');
for (const step of artifact.proofSteps) {
  if (step.status !== 'passed') fail(`proof step ${step.id} did not pass: ${step.requirement}`);
}
for (const file of artifact.artifacts ?? []) {
  const path = join(root, file.path);
  if (!existsSync(path)) fail(`listed artifact is missing: ${file.path}`);
  if (sha256(readFileSync(path, 'utf8')) !== file.sha256) fail(`sha mismatch for ${file.path}`);
}
console.log(`asha-studio demo asset load proof readback: OK (${artifact.proofSteps.length} proof steps, ${artifact.renderableIds.length} renderable id(s), ${artifact.negativeSmokes.length} negative smoke(s))`);
