import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createStudioWorkspaceModel } from '../src/session-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const expectedSequence = [
  'session.start',
  'session.load_scenario',
  'inspection.session_status',
  'inspection.editor_state',
  'inspection.voxel',
  'selection.voxel_from_screen_point',
  'preview.voxel_brush',
  'authority.voxel.apply_brush',
  'scene.load_asset',
  'selection.set_active_entity',
  'render.capture_before_after',
  'export.agent_readout',
];

test('command evidence dock projects shared V1 command sequence in order', () => {
  const dock = createStudioWorkspaceModel().commandEvidenceDock;
  assert.equal(dock.artifactKind, 'command_evidence_dock');
  assert.deepEqual(dock.commandRows.map((row) => row.commandId), expectedSequence);
  assert.deepEqual(dock.commandRows.map((row) => row.orderIndex), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(dock.commandRows.map((row) => row.sequenceId), ['seq-0001', 'seq-0002', 'seq-0003', 'seq-0004', 'seq-0005', 'seq-0006', 'seq-0007', 'seq-0008', 'seq-0009', 'seq-0010', 'seq-0011', 'seq-0012']);
});

test('command evidence dock exposes source/status labels and evidence summaries', () => {
  const dock = createStudioWorkspaceModel().commandEvidenceDock;
  assert.ok(dock.commandRows.every((row) => row.status === 'ok'));
  assert.ok(dock.commandRows.some((row) => row.source === 'GUI'));
  assert.ok(dock.commandRows.some((row) => row.source === 'AGENT'));
  const renderRow = dock.commandRows.find((row) => row.commandId === 'render.capture_before_after');
  assert.ok(renderRow);
  assert.match(renderRow.evidenceSummary, /visual_before_after/);
  assert.ok(renderRow.artifactIds.length >= 1);
});

test('command evidence dock lists visual, review, and readout artifacts without private command log', () => {
  const dock = createStudioWorkspaceModel().commandEvidenceDock;
  assert.equal(dock.tabs[0]?.id, 'command_timeline_evidence_log');
  assert.equal(dock.tabs[0]?.rowCount, expectedSequence.length);
  assert.equal(dock.tabs[1]?.id, 'evidence_artifacts');
  assert.ok(dock.artifactRows.some((row) => row.source === 'visual_evidence' && row.artifactId === 'artifact-visual-before-0001'));
  assert.ok(dock.artifactRows.some((row) => row.source === 'visual_evidence' && row.artifactId === 'artifact-visual-after-0001'));
  assert.ok(dock.artifactRows.some((row) => row.source === 'review_export' && row.artifactId === 'artifact-review-export-0001'));
  assert.ok(dock.artifactRows.some((row) => row.source === 'agent_readout' && row.artifactId === 'artifact-agent-readout-0001'));
  assert.match(dock.knownLimitations.join(' '), /not a second private command log/);
});

test('sample agent readout fixture carries command evidence dock', () => {
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-agent-readout.sample.json'), 'utf8')) as {
    readonly commandEvidenceDock?: {
      readonly commandRows?: readonly { readonly commandId?: string; readonly source?: string }[];
      readonly artifactRows?: readonly { readonly artifactId?: string; readonly source?: string }[];
      readonly automationMarkers?: readonly string[];
    };
  };
  assert.deepEqual(fixture.commandEvidenceDock?.commandRows?.map((row) => row.commandId), expectedSequence);
  assert.ok(fixture.commandEvidenceDock?.commandRows?.some((row) => row.source === 'AGENT'));
  assert.ok(fixture.commandEvidenceDock?.artifactRows?.some((row) => row.artifactId === 'artifact-review-export-0001' && row.source === 'review_export'));
  assert.ok(fixture.commandEvidenceDock?.automationMarkers?.includes('bottom-evidence-artifact-list'));
});
