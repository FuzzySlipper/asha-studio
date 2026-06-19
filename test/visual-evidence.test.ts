import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createStudioWorkspaceModel } from '../src/session-workspace';
import { createStudioReviewArtifact, validateReviewArtifactCandidate } from '../src/visual-evidence';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('workspace creates ready classified visual evidence correlated to apply command', () => {
  const workspace = createStudioWorkspaceModel();
  assert.equal(workspace.visualEvidence.length, 1);
  const [visual] = workspace.visualEvidence;
  assert.ok(visual);
  assert.equal(visual.captureReadiness, 'ready');
  assert.equal(visual.captureMode, 'software_snapshot');
  assert.equal(visual.evidenceClassification, 'proof_content');
  assert.equal(visual.commandSequenceIds.length, 1);
  assert.ok(workspace.timeline.some((entry) => entry.sequenceId === visual.commandSequenceIds[0] && entry.commandId === 'authority.voxel.apply_brush'));
  assert.equal(visual.beforeArtifact?.pathKind, 'relative_path');
  assert.equal(visual.afterArtifact?.pathKind, 'relative_path');
  assert.notEqual(visual.beforeRenderHash, visual.afterRenderHash);
});

test('review artifact exports timeline, visual refs, repo metadata, and ready summary', () => {
  const workspace = createStudioWorkspaceModel();
  const artifact = workspace.reviewArtifact;
  assert.equal(artifact.artifactKind, 'review_export');
  assert.equal(artifact.captureReadiness, 'ready');
  assert.equal(artifact.session.sessionId, workspace.session.sessionId);
  assert.equal(artifact.studio.repo, 'FuzzySlipper/asha-studio');
  assert.equal(artifact.asha.path, '/home/dev/asha');
  assert.equal(artifact.commandTimeline.length, workspace.timeline.length);
  assert.equal(artifact.commandResults.length, workspace.commandResults.length);
  assert.equal(artifact.visualEvidence.length, workspace.visualEvidence.length);
  assert.ok(artifact.exportedArtifacts.some((ref) => ref.artifactId === 'artifact-review-export-0001'));
  assert.ok(artifact.exportedArtifacts.some((ref) => ref.artifactId === 'artifact-visual-before-0001'));
  assert.match(artifact.reviewSummary, /ready for review/);
  assert.equal(artifact.diagnostics.some((item) => item.severity === 'error'), false);
});

test('review artifact validation fails closed for missing visual evidence', () => {
  const workspace = createStudioWorkspaceModel();
  const diagnostics = validateReviewArtifactCandidate({
    session: workspace.session,
    timeline: workspace.timeline,
    results: workspace.commandResults,
    visualEvidence: [],
  });
  assert.ok(diagnostics.some((item) => item.code === 'asha-studio.review_export.missing_visual_evidence'));
  const artifact = createStudioReviewArtifact({
    session: workspace.session,
    timeline: workspace.timeline,
    results: workspace.commandResults,
    visualEvidence: [],
    generatedAtIso: '1970-01-01T00:03:00.000Z',
    knownLimitations: [],
  });
  assert.equal(artifact.captureReadiness, 'failed_closed');
  assert.match(artifact.reviewSummary, /failed closed/);
});

test('review artifact validation fails closed for stale visual sequence correlation', () => {
  const workspace = createStudioWorkspaceModel();
  const [visual] = workspace.visualEvidence;
  assert.ok(visual);
  const diagnostics = validateReviewArtifactCandidate({
    session: workspace.session,
    timeline: workspace.timeline,
    results: workspace.commandResults,
    visualEvidence: [{ ...visual, commandSequenceIds: ['seq-missing'] }],
  });
  assert.ok(diagnostics.some((item) => item.code === 'asha-studio.review_export.visual_sequence_missing'));
});

test('review artifact validation fails closed for stale timeline/result mismatch', () => {
  const workspace = createStudioWorkspaceModel();
  const diagnostics = validateReviewArtifactCandidate({
    session: workspace.session,
    timeline: workspace.timeline.filter((entry) => entry.commandId !== 'authority.voxel.apply_brush'),
    results: workspace.commandResults,
    visualEvidence: workspace.visualEvidence,
  });
  assert.ok(diagnostics.some((item) => item.code === 'asha-studio.review_export.orphan_result'));
  assert.ok(diagnostics.some((item) => item.code === 'asha-studio.review_export.visual_sequence_missing'));
});

test('sample review artifact fixture carries visual evidence and review export refs', () => {
  const artifact = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-review-artifact.sample.json'), 'utf8')) as {
    readonly artifactKind?: string;
    readonly captureReadiness?: string;
    readonly visualEvidence?: readonly { readonly captureMode?: string; readonly evidenceClassification?: string }[];
    readonly exportedArtifacts?: readonly { readonly artifactId?: string }[];
  };
  assert.equal(artifact.artifactKind, 'review_export');
  assert.equal(artifact.captureReadiness, 'ready');
  assert.equal(artifact.visualEvidence?.[0]?.captureMode, 'software_snapshot');
  assert.equal(artifact.visualEvidence?.[0]?.evidenceClassification, 'proof_content');
  assert.ok(artifact.exportedArtifacts?.some((ref) => ref.artifactId === 'artifact-review-export-0001'));
});
