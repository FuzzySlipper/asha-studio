import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { COMMAND_CATALOG } from '@asha/command-registry';
import type { StudioCommandCatalog } from '@asha/command-registry';

import { createStudioWorkspaceModel } from '../src/session-workspace';
import { createVoxelWorkflowModel } from '../src/voxel-workflow';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('voxel workflow selects, previews, and applies a typed public VoxelCommand', () => {
  const workspace = createStudioWorkspaceModel();
  const workflow = workspace.voxelWorkflow;
  assert.equal(workflow.selection.outcome, 'hit');
  assert.deepEqual(workflow.evidence.selectedVoxel, { x: 0, y: 0, z: 0 });
  assert.deepEqual(workflow.evidence.editAnchor, { x: 1, y: 0, z: 0 });
  assert.equal(workflow.proposal.op, 'setVoxel');
  assert.deepEqual(workflow.evidence.typedVoxelCommands, [workflow.proposal]);
  assert.deepEqual(workflow.previewTargets, [{ x: 1, y: 0, z: 0 }]);
});

test('preview is editor-local while apply changes authority evidence', () => {
  const workflow = createStudioWorkspaceModel().voxelWorkflow;
  const previewEntry = workflow.timelineEntries.find((entry) => entry.commandId === 'preview.voxel_brush');
  const applyEntry = workflow.timelineEntries.find((entry) => entry.commandId === 'authority.voxel.apply_brush');
  assert.ok(previewEntry);
  assert.ok(applyEntry);
  assert.equal(previewEntry.operationClass, 'editor_local');
  assert.equal(previewEntry.changed.authorityChanged, false);
  assert.equal(previewEntry.outputSummary, 'preview target count=1; authority unchanged');
  assert.equal(applyEntry.operationClass, 'authority_mutating');
  assert.equal(applyEntry.changed.authorityChanged, true);
  assert.notEqual(workflow.evidence.authorityBeforeHash, workflow.evidence.authorityAfterHash);
});

test('visible before and after grid shows a real changed voxel', () => {
  const workflow = createStudioWorkspaceModel().voxelWorkflow;
  const changed = workflow.afterGrid.filter((cell) => cell.changed);
  assert.equal(changed.length, 1);
  assert.deepEqual(changed[0]?.coord, { x: 1, y: 0, z: 0 });
  assert.equal(changed[0]?.before.kind, 'empty');
  assert.equal(changed[0]?.after.kind, 'solid');
  assert.equal(changed[0]?.preview?.kind, 'solid');
});

test('workspace timeline includes inspect select preview apply after load/status entries', () => {
  const workspace = createStudioWorkspaceModel();
  assert.deepEqual(workspace.timeline.map((entry) => entry.commandId), [
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
    'entity.set_name',
    'transform.translate_entity',
    'transform.translate_entity',
    'render.capture_before_after',
    'export.agent_readout',
  ]);
  assert.ok(workspace.timeline.some((entry) => entry.requestedBy === 'agent' && entry.commandId === 'authority.voxel.apply_brush'));
  assert.equal(workspace.commandResults.length, workspace.timeline.length);
});

test('exported readout references voxel workflow evidence artifact', () => {
  const workspace = createStudioWorkspaceModel();
  assert.ok(workspace.exportedReadout.exportedArtifacts.some((artifact) => artifact.artifactId === 'artifact-voxel-workflow-0001'));
  assert.ok(workspace.exportedReadout.commandTimeline.some((entry) => entry.commandId === 'authority.voxel.apply_brush'));
  assert.equal(workspace.voxelWorkflow.evidence.acceptedCommandCount, 1);
  assert.equal(workspace.voxelWorkflow.evidence.rejectedCommandCount, 0);
  assert.equal(workspace.voxelWorkflow.evidence.renderEvidence.visualState, 'changed');
});

test('sample agent readout fixture carries voxel apply timeline and artifact ref', () => {
  const artifact = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-agent-readout.sample.json'), 'utf8')) as {
    readonly commandTimeline?: readonly { readonly commandId?: string }[];
    readonly exportedArtifacts?: readonly { readonly artifactId?: string }[];
  };
  assert.ok(artifact.commandTimeline?.some((entry) => entry.commandId === 'authority.voxel.apply_brush'));
  assert.ok(artifact.exportedArtifacts?.some((entry) => entry.artifactId === 'artifact-voxel-workflow-0001'));
});

test('voxel workflow can be constructed independently from session workspace', () => {
  const workspace = createStudioWorkspaceModel();
  const workflow = createVoxelWorkflowModel({
    sessionId: workspace.session.sessionId,
    scenarioId: workspace.session.scenarioId,
    compatibility: workspace.session.compatibility,
  });
  assert.equal(workflow.evidence.commandId, 'authority.voxel.apply_brush');
  assert.equal(workflow.evidence.meshEvidence.beforeOccupiedCount, 1);
  assert.equal(workflow.evidence.meshEvidence.afterOccupiedCount, 2);
});

test('voxel workflow timeline metadata is resolved from the command catalog', () => {
  const customCatalog: StudioCommandCatalog = {
    ...COMMAND_CATALOG,
    commands: COMMAND_CATALOG.commands.map((command) => {
      if (command.id !== 'preview.voxel_brush') return command;
      return {
        ...command,
        label: 'Catalog Preview Override',
        menuPath: ['Catalog', 'Preview Override'],
        operationClass: 'read_only',
        stateImpact: { ...command.stateImpact, editor: 'read' },
      };
    }),
  };
  const workspace = createStudioWorkspaceModel({ catalog: customCatalog });
  const preview = workspace.voxelWorkflow.timelineEntries.find((entry) => entry.commandId === 'preview.voxel_brush');
  assert.ok(preview);
  assert.equal(preview.label, 'Catalog Preview Override');
  assert.deepEqual(preview.menuPath, ['Catalog', 'Preview Override']);
  assert.equal(preview.operationClass, 'read_only');
  assert.equal(preview.changed.editorChanged, false);
});

test('custom session id flows through voxel command results and exported readout', () => {
  const workspace = createStudioWorkspaceModel({ sessionId: 'session-custom-2734' });
  assert.equal(workspace.voxelWorkflow.sessionId, 'session-custom-2734');
  assert.equal(workspace.voxelWorkflow.evidence.sessionId, 'session-custom-2734');
  const voxelResults = workspace.voxelWorkflow.commandResults;
  assert.ok(voxelResults.length > 0);
  assert.ok(voxelResults.every((result) => result.sessionId === 'session-custom-2734'));
  assert.ok(workspace.exportedReadout.commandResults
    .filter((result) => ['inspection.voxel', 'selection.voxel_from_screen_point', 'preview.voxel_brush', 'authority.voxel.apply_brush'].includes(result.commandId))
    .every((result) => result.sessionId === 'session-custom-2734'));
  assert.equal(workspace.exportedReadout.exportedArtifacts.find((artifact) => artifact.artifactId === 'artifact-voxel-workflow-0001')?.path, 'voxel_workflow:session-custom-2734');
});
