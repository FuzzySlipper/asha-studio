import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createStudioModelMaterialPreviewModel } from '../src/model-material-preview';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('model/material preview uses only public contract DTO shapes', () => {
  const preview = createStudioModelMaterialPreviewModel();
  const artifact = preview.artifact;
  assert.equal(artifact.artifactKind, 'model_material_preview');
  assert.equal(artifact.readiness, 'ready');
  assert.equal(artifact.catalog.entries[0]?.kind, 'material');
  assert.equal(artifact.catalog.entries[1]?.kind, 'mesh');
  assert.equal(artifact.staticMesh.materialSlots[0]?.material, artifact.selectedMaterialAsset);
  assert.deepEqual(artifact.renderFrameDiff.ops.map((op) => op.op), ['defineMaterial', 'defineStaticMesh', 'createStaticMeshInstance']);
  assert.equal(artifact.rendererClassification, 'contract_render_diff_reference');
  assert.match(artifact.previewEvidenceHash, /^model-material-preview-[0-9a-f]{8}$/);
  assert.match(preview.svgPreview, /Model \/ Material Preview/);
});

test('model/material preview records promoted public command and runtime surfaces', () => {
  const preview = createStudioModelMaterialPreviewModel({ sessionId: 'session-custom', scenarioId: 'model-material-basic' });
  assert.equal(preview.artifact.sessionId, 'session-custom');
  assert.equal(preview.artifact.scenarioId, 'model-material-basic');
  assert.ok(preview.artifact.surfaceFindings.some((finding) => finding.surface === '@asha/contracts' && finding.status === 'available_public'));
  assert.ok(preview.artifact.surfaceFindings.some((finding) => finding.surface === '@asha/command-registry' && finding.status === 'available_public'));
  assert.equal(preview.artifact.blockingFeatureRequests.length, 0);
  assert.ok(preview.artifact.knownLimitations.some((limitation) => limitation.includes('native readback for this specific operation remains fail-closed')));
});

test('sample model/material preview fixture records public-surface evidence', () => {
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-model-material-preview.sample.json'), 'utf8')) as {
    readonly artifactKind?: string;
    readonly selectedModelAsset?: string;
    readonly selectedMaterialAsset?: string;
    readonly rendererClassification?: string;
    readonly surfaceFindings?: readonly { readonly surface?: string; readonly status?: string }[];
    readonly blockingFeatureRequests?: readonly unknown[];
  };
  assert.equal(fixture.artifactKind, 'model_material_preview');
  assert.equal(fixture.selectedModelAsset, 'mesh/studio-preview-crate');
  assert.equal(fixture.selectedMaterialAsset, 'material/studio-brushed-copper');
  assert.equal(fixture.rendererClassification, 'contract_render_diff_reference');
  assert.ok(fixture.surfaceFindings?.some((finding) => finding.surface === '@asha/command-registry' && finding.status === 'available_public'));
  assert.equal(fixture.blockingFeatureRequests?.length, 0);
});
