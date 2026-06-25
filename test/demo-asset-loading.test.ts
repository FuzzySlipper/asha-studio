import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { COMMAND_MANIFEST, requireKnownCommand, validateExampleAgainstSchema } from '@asha/command-registry';

import {
  createDemoAssetPackage,
  createStudioDemoAssetLoadModel,
  demoAssetPackageFiles,
  loadDemoSceneAsset,
  validateDemoCatalog,
  validateDemoLock,
} from '../src/demo-asset-loading';
import { createStudioWorkspaceModel } from '../src/session-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('demo asset package is a valid public catalog/lock/scene with material variants', () => {
  const pkg = createDemoAssetPackage();
  assert.deepEqual(validateDemoCatalog(pkg.catalog), []);
  // Only the benign new-in-catalog informational findings (none, since lock mirrors catalog).
  assert.deepEqual(validateDemoLock(pkg.catalog, pkg.lock), []);
  assert.equal(pkg.catalog.entries.filter((entry) => entry.kind === 'material').length, 2);
  assert.equal(pkg.catalog.entries.filter((entry) => entry.kind === 'mesh').length, 1);
  assert.equal(pkg.scene.nodes[0]?.kind.kind, 'staticMesh');
});

test('loading the demo asset produces a contract render diff and named renderable ids', () => {
  const result = loadDemoSceneAsset(createDemoAssetPackage());
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(result.loadDiff.ops.map((op) => op.op), ['defineMaterial', 'defineStaticMesh', 'createStaticMeshInstance']);
  assert.deepEqual(result.renderableIds, ['scene-asset:mesh/demo-crate:1']);
  assert.equal(result.provenance.assetId, 'mesh/demo-crate');
  assert.equal(result.provenance.packageId, 'asha-studio-demo-pack-0001');
  assert.match(result.provenance.sourcePath ?? '', /demo-crate\.mesh\.json$/);
  assert.deepEqual(result.provenance.materialRefs, ['material/demo-brushed-copper']);
  assert.equal(result.placements[0]?.meshRef, 'mesh/demo-crate');
});

test('demo asset load model carries provenance, placements, and surface findings', () => {
  const model = createStudioDemoAssetLoadModel({ sessionId: 'session-x', scenarioId: 'voxel-basic' });
  const artifact = model.artifact;
  assert.equal(artifact.artifactKind, 'demo_asset_load');
  assert.equal(artifact.readiness, 'ready');
  assert.equal(artifact.commandId, 'scene.load_asset');
  assert.equal(artifact.sessionId, 'session-x');
  assert.equal(artifact.renderableIds.length, 1);
  assert.equal(artifact.materialVariants.length, 2);
  assert.equal(artifact.provenance.meshRef, 'mesh/demo-crate');
  assert.ok(artifact.surfaceFindings.some((finding) => finding.surface === '@asha/command-registry' && finding.status === 'available_public'));
  assert.ok(artifact.knownLimitations.some((limitation) => limitation.includes('runtime') || limitation.includes('deferred')));
  assert.match(artifact.loadEvidenceHash, /^demo-asset-load-[0-9a-f]{8}$/);
});

test('negative smokes fail closed for missing, unsupported, mismatched, and stale-drift cases', () => {
  const smokes = createStudioDemoAssetLoadModel().artifact.negativeSmokes;
  const byCode = new Map(smokes.map((smoke) => [smoke.failureCode, smoke]));
  for (const code of ['missing_asset', 'unsupported_format', 'material_mismatch', 'stale_catalog_lock_drift'] as const) {
    const smoke = byCode.get(code);
    assert.ok(smoke, `missing negative smoke for ${code}`);
    assert.equal(smoke.expectedOutcome, 'failed_closed');
    assert.equal(smoke.actualOutcome, 'failed_closed');
    assert.ok(smoke.classifiedCodes.length > 0, `smoke ${code} must carry classified contract codes`);
  }
  assert.ok(byCode.get('missing_asset')?.classifiedCodes.includes('missing'));
  assert.ok(byCode.get('unsupported_format')?.classifiedCodes.includes('asset-kind-mismatch'));
  assert.ok(byCode.get('material_mismatch')?.classifiedCodes.includes('wrong-kind-reference'));
  assert.ok(byCode.get('stale_catalog_lock_drift')?.classifiedCodes.includes('stale-version'));
});

test('validators classify lock drift and catalog faults with public contract codes', () => {
  const pkg = createDemoAssetPackage();
  const staleCatalog = { entries: pkg.catalog.entries.map((entry) => (entry.kind === 'mesh' ? { ...entry, version: 2 } : entry)) };
  const findings = validateDemoLock(staleCatalog, pkg.lock);
  assert.ok(findings.some((finding) => finding.code === 'stale-version' && finding.id === 'mesh/demo-crate'));

  const wrongKindCatalog = {
    entries: pkg.catalog.entries.map((entry) =>
      entry.kind === 'mesh' ? { ...entry, dependencies: [{ id: 'mesh/demo-crate', version: { req: 'exact' as const, value: 1 }, hash: entry.hash }] } : entry,
    ),
  };
  assert.ok(validateDemoCatalog(wrongKindCatalog).some((error) => error.code === 'wrong-kind-reference'));
});

test('workspace exposes demo asset load through the shared command timeline and readout', () => {
  const workspace = createStudioWorkspaceModel();
  assert.ok(workspace.timeline.some((entry) => entry.commandId === 'scene.load_asset'));
  assert.equal(workspace.demoAssetLoad.artifact.readiness, 'ready');
  assert.equal(workspace.exportedReadout.demoAssetLoad.artifact.commandId, 'scene.load_asset');
  const loadEntry = workspace.timeline.find((entry) => entry.commandId === 'scene.load_asset');
  assert.equal(loadEntry?.operationClass, 'editor_local');
  assert.equal(loadEntry?.changed.renderChanged, true);
});

test('scene.load_asset timeline carries typed input matching the public command schema', () => {
  const workspace = createStudioWorkspaceModel();
  const input = workspace.demoAssetLoad.artifact.commandInput;
  const command = requireKnownCommand('scene.load_asset', COMMAND_MANIFEST);
  // The recorded command input validates against the public LoadSceneAssetInput schema.
  assert.deepEqual(validateExampleAgainstSchema('scene.load_asset', 'typedInputExample', input, command.inputSchema.shape), []);
  // And it carries the actually-loaded asset/material/placement, not just a sessionId marker.
  assert.equal(input.assetId, workspace.demoAssetLoad.artifact.loadedAssetId);
  assert.equal(input.materialId, workspace.demoAssetLoad.loadedRenderables[0]?.materialRef);
  assert.deepEqual(input.placement.translation, workspace.demoAssetLoad.loadedRenderables[0]?.translation);
  const loadEntry = workspace.timeline.find((entry) => entry.commandId === 'scene.load_asset');
  assert.match(loadEntry?.inputSummary ?? '', /assetId=mesh\/demo-crate/);
  assert.match(loadEntry?.inputSummary ?? '', /materialId=material\/demo-brushed-copper/);
});

test('committed on-disk demo asset package files exist and match the in-memory package', () => {
  for (const file of demoAssetPackageFiles()) {
    const absolute = join(repoRoot, file.path);
    assert.ok(existsSync(absolute), `missing package file ${file.path}`);
    assert.equal(JSON.stringify(JSON.parse(readFileSync(absolute, 'utf8'))), JSON.stringify(file.content), `package file drifted: ${file.path}`);
  }
});

test('sample demo asset load fixture records provenance and fail-closed negative smokes', () => {
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-demo-asset-load.sample.json'), 'utf8')) as {
    readonly artifactKind?: string;
    readonly commandId?: string;
    readonly commandInput?: { readonly assetId?: string; readonly materialId?: string };
    readonly loadedAssetId?: string;
    readonly renderableIds?: readonly string[];
    readonly negativeSmokes?: readonly { readonly failureCode?: string; readonly actualOutcome?: string }[];
  };
  assert.equal(fixture.artifactKind, 'demo_asset_load');
  assert.equal(fixture.commandId, 'scene.load_asset');
  assert.equal(fixture.commandInput?.assetId, 'mesh/demo-crate');
  assert.equal(fixture.commandInput?.materialId, 'material/demo-brushed-copper');
  assert.equal(fixture.loadedAssetId, 'mesh/demo-crate');
  assert.deepEqual(fixture.renderableIds, ['scene-asset:mesh/demo-crate:1']);
  assert.equal(fixture.negativeSmokes?.length, 4);
  assert.ok(fixture.negativeSmokes?.every((smoke) => smoke.actualOutcome === 'failed_closed'));
});
