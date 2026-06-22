import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createAgentReadoutArtifact, createStudioWorkspaceModel, invokeStudioCommand } from '../src/session-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function defaultWorkspace() {
  return createStudioWorkspaceModel();
}

test('studio workspace starts with a loaded scenario and visible shared timeline', () => {
  const workspace = defaultWorkspace();
  assert.equal(workspace.status, 'ready');
  assert.equal(workspace.scenario.scenarioId, 'voxel-basic');
  assert.equal(workspace.scenario.status, 'loaded');
  assert.deepEqual(workspace.timeline.map((entry) => entry.commandId), [
    'session.start',
    'session.load_scenario',
    'inspection.session_status',
    'inspection.editor_state',
    'inspection.voxel',
    'selection.voxel_from_screen_point',
    'preview.voxel_brush',
    'authority.voxel.apply_brush',
    'render.capture_before_after',
    'export.agent_readout',
  ]);
  assert.ok(workspace.timeline.some((entry) => entry.requestedBy === 'agent'));
  assert.equal(workspace.commandResults.length, workspace.timeline.length);
});

test('loading a stub scenario records typed command entry and structured result', () => {
  const workspace = defaultWorkspace();
  const loadEntry = workspace.timeline.find((entry) => entry.commandId === 'session.load_scenario');
  assert.ok(loadEntry);
  assert.equal(loadEntry.status, 'ok');
  assert.equal(loadEntry.operationClass, 'workspace_io');
  assert.equal(loadEntry.changed.workspaceChanged, true);
  assert.match(loadEntry.inputSummary, /scenarioId=voxel-basic/);

  const loadResult = workspace.commandResults.find((result) => result.sequenceId === loadEntry.sequenceId);
  assert.ok(loadResult);
  assert.equal(loadResult.artifactKind, 'command_result');
  assert.deepEqual(loadResult.output, { kind: 'ok' });
  assert.equal(loadResult.retry.classification, 'retry_after_status_readback');
  assert.ok(loadResult.artifacts.some((artifact) => artifact.summary.includes('Scenario load status')));
});

test('agent and gui commands use the same invocation and timeline path', () => {
  const workspace = defaultWorkspace();
  const agentEntry = workspace.timeline.find((entry) => entry.requestedBy === 'agent');
  const guiEntry = workspace.timeline.find((entry) => entry.requestedBy === 'gui');
  assert.ok(agentEntry);
  assert.ok(guiEntry);
  assert.equal(agentEntry.schemaVersion, 1);
  assert.equal(guiEntry.schemaVersion, 1);
  assert.ok(agentEntry.menuPath.length > 0);
  assert.ok(guiEntry.menuPath.length > 0);
  assert.equal(typeof agentEntry.outputSummary, 'string');
});

test('exported agent readout includes session metadata, timeline, results, and compatibility', () => {
  const workspace = defaultWorkspace();
  const readout = workspace.exportedReadout;
  assert.equal(readout.schemaVersion, 1);
  assert.equal(readout.artifactKind, 'agent_readout');
  assert.equal(readout.session.sessionId, workspace.session.sessionId);
  assert.equal(readout.session.compatibility.commandRegistryVersion, 'command-registry.v0');
  assert.equal(readout.commandTimeline.length, workspace.timeline.length);
  assert.equal(readout.commandResults.length, workspace.commandResults.length);
  assert.ok(readout.exportedArtifacts.length > 0);
  assert.match(readout.reviewSummary, /command\(s\) recorded/);
});

test('direct command invocation records structured status result without hidden command path', () => {
  const workspace = defaultWorkspace();
  const executed = invokeStudioCommand({
    session: workspace.session,
    request: {
      commandId: 'inspection.session_status',
      requestedBy: 'agent',
      sourceLabel: 'test agent',
      input: { sessionId: workspace.session.sessionId },
      requestedAtIso: '1970-01-01T00:01:00.000Z',
      completedAtIso: '1970-01-01T00:01:00.000Z',
    },
    sequenceIndex: 9,
    status: workspace.status,
    previousResults: workspace.commandResults,
  });
  assert.equal(executed.timelineEntry.sequenceId, 'seq-0010');
  assert.equal(executed.timelineEntry.requestedBy, 'agent');
  assert.equal(executed.timelineEntry.commandId, 'inspection.session_status');
  assert.deepEqual(executed.result.output, { sessionId: workspace.session.sessionId, status: 'ready' });
});

test('readout helper preserves result ordering and final state evidence', () => {
  const workspace = defaultWorkspace();
  const readout = createAgentReadoutArtifact({
    session: workspace.session,
    timeline: workspace.timeline,
    results: workspace.commandResults,
    sceneHierarchy: workspace.sceneHierarchy,
    selectedTargetInspector: workspace.selectedTargetInspector,
    commandEvidenceDock: workspace.commandEvidenceDock,
    viewportEditor: workspace.viewportEditor,
    sceneView: workspace.sceneView,
    generatedAtIso: '1970-01-01T00:02:00.000Z',
    knownLimitations: ['test limitation'],
  });
  assert.equal(readout.generatedAtIso, '1970-01-01T00:02:00.000Z');
  assert.equal(readout.commandTimeline.at(-1)?.sequenceId, workspace.timeline.at(-1)?.sequenceId);
  assert.equal(readout.finalState.compatibility.contractsVersion, 'contracts.v0');
  assert.deepEqual(readout.knownLimitations, ['test limitation']);
});


test('sample agent readout fixture includes exported timeline and command results', () => {
  const artifact = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-agent-readout.sample.json'), 'utf8')) as {
    readonly artifactKind?: string;
    readonly commandTimeline?: readonly { readonly commandId?: string; readonly requestedBy?: string }[];
    readonly commandResults?: readonly { readonly commandId?: string }[];
    readonly viewportEditor?: { readonly artifactKind?: string; readonly panelId?: string; readonly readiness?: string };
    readonly sceneView?: { readonly artifactKind?: string; readonly sceneId?: string; readonly renderables?: readonly unknown[] };
    readonly session?: { readonly compatibility?: { readonly commandRegistryVersion?: string } };
  };
  assert.equal(artifact.artifactKind, 'agent_readout');
  assert.equal(artifact.session?.compatibility?.commandRegistryVersion, 'command-registry.v0');
  assert.deepEqual(artifact.commandTimeline?.map((entry) => entry.commandId), [
    'session.start',
    'session.load_scenario',
    'inspection.session_status',
    'inspection.editor_state',
    'inspection.voxel',
    'selection.voxel_from_screen_point',
    'preview.voxel_brush',
    'authority.voxel.apply_brush',
    'render.capture_before_after',
    'export.agent_readout',
  ]);
  assert.ok(artifact.commandTimeline?.some((entry) => entry.requestedBy === 'agent'));
  assert.equal(artifact.commandResults?.length, artifact.commandTimeline?.length);
  assert.equal(artifact.viewportEditor?.artifactKind, 'viewport_editor_panel');
  assert.equal(artifact.viewportEditor?.panelId, 'viewport');
  assert.equal(artifact.viewportEditor?.readiness, 'ready');
  assert.equal(artifact.sceneView?.artifactKind, 'scene_view_model');
  assert.equal(artifact.sceneView?.sceneId, 'scene-view:voxel-basic:v1');
  assert.equal(artifact.sceneView?.renderables?.length, 5);
});
