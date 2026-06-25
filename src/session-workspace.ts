import { COMMAND_CATALOG, requireCatalogCommand } from '@asha/command-registry';
import type { OperationClass, StudioCommandCatalog, StudioCommandCatalogEntry, StudioCommandId } from '@asha/command-registry';

import { createStudioCommandBatchModel } from './command-batch';
import type { StudioCommandBatchModel } from './command-batch';
import { createStudioCommandEvidenceDockModel } from './command-evidence-dock';
import type { StudioCommandEvidenceDockModel } from './command-evidence-dock';
import { createStudioDemoAssetLoadModel } from './demo-asset-loading';
import type { StudioDemoAssetLoadModel } from './demo-asset-loading';
import { createStudioSessionMetadata } from './compatibility';
import type { StudioCompatibilityEvidence, StudioDiagnostic, StudioRuntimeMode, StudioSessionMetadata } from './compatibility';
import { createStudioModelMaterialPreviewModel } from './model-material-preview';
import type { StudioModelMaterialPreviewModel } from './model-material-preview';
import { createStudioSceneHierarchyModel } from './scene-hierarchy';
import type { StudioSceneHierarchyModel } from './scene-hierarchy';
import { createStudioSceneViewModel } from './scene-view-model';
import type { StudioSceneViewModel } from './scene-view-model';
import { createStudioSelectedTargetInspectorModel } from './selected-target-inspector';
import type { StudioSelectedTargetInspectorModel } from './selected-target-inspector';
import { createStudioViewportEditorPanelModel } from './viewport-editor-panel';
import type { StudioViewportEditorPanelModel } from './viewport-editor-panel';
import { createVoxelWorkflowModel } from './voxel-workflow';
import type { StudioVoxelWorkflowModel } from './voxel-workflow';
import { createStudioReviewArtifact, createVisualEvidenceForVoxelWorkflow } from './visual-evidence';
import type { StudioReviewArtifact, StudioVisualEvidenceRef } from './visual-evidence';

export type StudioActorKind = 'gui' | 'agent' | 'test' | 'script';
export type StudioWorkspaceStatus = 'not_started' | 'ready' | 'degraded' | 'unavailable';
export type StudioCommandStatus = 'ok' | 'rejected' | 'partial' | 'failed' | 'unavailable';
export type StudioArtifactKind = 'session_metadata' | 'command_invocation' | 'command_result' | 'timeline' | 'state_evidence' | 'selection_evidence' | 'visual_before_after' | 'render_evidence' | 'screenshot' | 'agent_readout' | 'review_export';
export type StudioArtifactPathKind = 'relative_path' | 'absolute_path' | 'url' | 'inline_summary';

export interface StudioScenarioSummary {
  readonly scenarioId: string;
  readonly label: string;
  readonly status: 'available' | 'loaded';
}

export interface StudioChangedStateIndicator {
  readonly authorityChanged: boolean;
  readonly editorChanged: boolean;
  readonly renderChanged: boolean;
  readonly workspaceChanged: boolean;
  readonly artifactsWritten: boolean;
}

export interface StudioRetryDecision {
  readonly safe: boolean;
  readonly classification: 'safe_to_retry' | 'safe_to_retry_if_state_hash_unchanged' | 'retry_after_status_readback' | 'not_idempotent' | 'requires_human_or_planner_decision';
  readonly reason: string;
  readonly requiredReadback: 'session_status' | 'state_hash' | 'command_result' | 'human_decision' | null;
}

export interface StudioUndoEvidence {
  readonly posture: 'not_undoable' | 'editor_local' | 'authority_reversing' | 'snapshot_restore';
  readonly available: boolean;
  readonly reason: string;
  readonly inverseCommandIds: readonly StudioCommandId[];
  readonly requiresSameStateHash: boolean;
}

export interface StudioTimingEvidence {
  readonly queuedAtIso: string | null;
  readonly startedAtIso: string | null;
  readonly completedAtIso: string | null;
  readonly durationMs: number | null;
}

export interface StudioSelectionEvidence {
  readonly kind: 'none' | 'voxel' | 'object' | 'model' | 'material';
  readonly voxelSelection: null;
  readonly objectId: string | null;
  readonly modelId: string | null;
  readonly materialId: string | number | null;
  readonly evidenceHash: string | null;
  readonly summary: string;
}

export interface StudioStateEvidence {
  readonly authorityBeforeHash: string | null;
  readonly authorityAfterHash: string | null;
  readonly editorBeforeVersion: string | null;
  readonly editorAfterVersion: string | null;
  readonly renderBeforeHash: string | null;
  readonly renderAfterHash: string | null;
  readonly selectedBefore: StudioSelectionEvidence | null;
  readonly selectedAfter: StudioSelectionEvidence | null;
  readonly replay: {
    readonly replayArtifactId: string | null;
    readonly replayPath: string | null;
    readonly replayHash: string | null;
    readonly replayMode: 'wasm' | 'native' | 'reference' | 'unavailable';
    readonly summary: string;
  } | null;
  readonly compatibility: StudioCompatibilityEvidence;
}

export interface StudioArtifactRef {
  readonly artifactId: string;
  readonly artifactKind: StudioArtifactKind;
  readonly pathKind: StudioArtifactPathKind;
  readonly path: string;
  readonly mediaType: string;
  readonly contentHash: string | null;
  readonly byteLength: number | null;
  readonly producedBySequenceId: string | null;
  readonly summary: string;
}

export type StudioCommandInput =
  | { readonly kind: 'empty' }
  | { readonly scenarioId: string }
  | { readonly sessionId: string }
  | { readonly sessionId: string; readonly includeVisualEvidence: boolean }
  | {
      readonly sessionId: string;
      readonly assetId: string;
      readonly materialId: string;
      readonly placement: { readonly translation: readonly number[]; readonly rotation: readonly number[]; readonly scale: readonly number[] };
    };

export type StudioCommandOutput =
  | { readonly kind: 'ok' }
  | { readonly sessionId: string; readonly status: StudioWorkspaceStatus }
  | { readonly artifactId: string; readonly commandCount: number };

export interface StudioCommandInvocation {
  readonly schemaVersion: 1;
  readonly artifactKind: 'command_invocation';
  readonly commandId: StudioCommandId;
  readonly commandVersion: number;
  readonly sequenceId: string;
  readonly batchId: string | null;
  readonly sessionId: string;
  readonly requestedBy: StudioActorKind;
  readonly sourceLabel: string | null;
  readonly requestedAtIso: string;
  readonly input: StudioCommandInput;
  readonly inputSummary: string;
  readonly expectedStateHash: string | null;
  readonly idempotencyKey: string | null;
  readonly dryRun: boolean;
}

export interface StudioCommandResult {
  readonly schemaVersion: 1;
  readonly artifactKind: 'command_result';
  readonly commandId: StudioCommandId;
  readonly commandVersion: number;
  readonly sequenceId: string;
  readonly batchId: string | null;
  readonly sessionId: string;
  readonly requestedBy: StudioActorKind;
  readonly status: StudioCommandStatus;
  readonly operationClass: OperationClass;
  readonly changed: StudioChangedStateIndicator;
  readonly state: StudioStateEvidence;
  readonly output: StudioCommandOutput | null;
  readonly outputSummary: string;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly artifacts: readonly StudioArtifactRef[];
  readonly retry: StudioRetryDecision;
  readonly undo: StudioUndoEvidence | null;
  readonly timing: StudioTimingEvidence | null;
}

export interface StudioCommandTimelineEntry {
  readonly schemaVersion: 1;
  readonly sequenceId: string;
  readonly commandId: StudioCommandId;
  readonly label: string;
  readonly menuPath: readonly string[];
  readonly requestedBy: StudioActorKind;
  readonly requestedAtIso: string;
  readonly completedAtIso: string | null;
  readonly status: StudioCommandStatus;
  readonly operationClass: OperationClass;
  readonly inputSummary: string;
  readonly outputSummary: string;
  readonly changed: StudioChangedStateIndicator;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly artifactRefs: readonly StudioArtifactRef[];
}

export interface StudioAgentReadoutArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'agent_readout';
  readonly artifactId: string;
  readonly generatedAtIso: string;
  readonly session: StudioSessionMetadata;
  readonly commandCatalogHash: string | null;
  readonly commandTimeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResult[];
  readonly finalState: StudioStateEvidence;
  readonly sceneHierarchy: StudioSceneHierarchyModel;
  readonly selectedTargetInspector: StudioSelectedTargetInspectorModel;
  readonly commandEvidenceDock: StudioCommandEvidenceDockModel;
  readonly viewportEditor: StudioViewportEditorPanelModel;
  readonly sceneView: StudioSceneViewModel;
  readonly demoAssetLoad: StudioDemoAssetLoadModel;
  readonly visualEvidence: readonly StudioVisualEvidenceRef[];
  readonly exportedArtifacts: readonly StudioArtifactRef[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly knownLimitations: readonly string[];
  readonly reviewSummary: string;
}

export interface StudioWorkspaceModel {
  readonly session: StudioSessionMetadata;
  readonly status: StudioWorkspaceStatus;
  readonly scenario: StudioScenarioSummary;
  readonly scenarios: readonly StudioScenarioSummary[];
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResult[];
  readonly voxelWorkflow: StudioVoxelWorkflowModel;
  readonly commandBatch: StudioCommandBatchModel;
  readonly modelMaterialPreview: StudioModelMaterialPreviewModel;
  readonly demoAssetLoad: StudioDemoAssetLoadModel;
  readonly sceneHierarchy: StudioSceneHierarchyModel;
  readonly selectedTargetInspector: StudioSelectedTargetInspectorModel;
  readonly commandEvidenceDock: StudioCommandEvidenceDockModel;
  readonly viewportEditor: StudioViewportEditorPanelModel;
  readonly sceneView: StudioSceneViewModel;
  readonly visualEvidence: readonly StudioVisualEvidenceRef[];
  readonly reviewArtifact: StudioReviewArtifact;
  readonly exportedReadout: StudioAgentReadoutArtifact;
}

export interface StudioCommandRequest {
  readonly commandId: StudioCommandId;
  readonly requestedBy: StudioActorKind;
  readonly sourceLabel?: string | null;
  readonly input: StudioCommandInput;
  readonly requestedAtIso: string;
  readonly completedAtIso: string;
  readonly dryRun?: boolean;
}

const DEFAULT_SCENARIOS: readonly StudioScenarioSummary[] = [
  { scenarioId: 'voxel-basic', label: 'Basic Voxel Scenario', status: 'available' },
  { scenarioId: 'scenario-placeholder', label: 'Placeholder Studio scenario', status: 'available' },
];

const NONE_SELECTION: StudioSelectionEvidence = {
  kind: 'none',
  voxelSelection: null,
  objectId: null,
  modelId: null,
  materialId: null,
  evidenceHash: null,
  summary: 'No active typed selection.',
};

function sequenceId(index: number): string {
  return `seq-${String(index + 1).padStart(4, '0')}`;
}

function summarizeInput(input: StudioCommandInput): string {
  if ('assetId' in input) return `sessionId=${input.sessionId}; assetId=${input.assetId}; materialId=${input.materialId}; placement.translation=[${input.placement.translation.join(',')}]; placement.rotation=[${input.placement.rotation.join(',')}]; placement.scale=[${input.placement.scale.join(',')}]`;
  if ('includeVisualEvidence' in input) return `sessionId=${input.sessionId}; includeVisualEvidence=${input.includeVisualEvidence}`;
  if ('sessionId' in input) return `sessionId=${input.sessionId}`;
  if ('scenarioId' in input) return `scenarioId=${input.scenarioId}`;
  return 'No arguments.';
}

function summarizeOutput(output: StudioCommandOutput | null): string {
  if (output === null) return 'No output.';
  if ('artifactId' in output) return `Exported ${output.artifactId} with ${output.commandCount} command(s).`;
  if ('status' in output) return `Session ${output.sessionId} is ${output.status}.`;
  return 'Command accepted.';
}

function changedFor(command: StudioCommandCatalogEntry, artifactsWritten: boolean): StudioChangedStateIndicator {
  return {
    authorityChanged: command.stateImpact.authority === 'mutate',
    editorChanged: command.stateImpact.editor === 'mutate',
    renderChanged: command.stateImpact.render === 'capture',
    workspaceChanged: command.stateImpact.workspace === 'write',
    artifactsWritten,
  };
}

function retryFor(command: StudioCommandCatalogEntry): StudioRetryDecision {
  if (command.operationClass === 'authority_mutating') {
    return { safe: false, classification: 'safe_to_retry_if_state_hash_unchanged', reason: 'Authority mutation requires unchanged public state hash before retry.', requiredReadback: 'state_hash' };
  }
  if (command.operationClass === 'workspace_io') {
    return { safe: true, classification: 'retry_after_status_readback', reason: 'Workspace I/O is retryable after session status readback.', requiredReadback: 'session_status' };
  }
  return { safe: true, classification: 'safe_to_retry', reason: 'Read-only/editor/export command is safe in this mock/reference session model.', requiredReadback: null };
}

function undoFor(command: StudioCommandCatalogEntry): StudioUndoEvidence | null {
  if (command.operationClass === 'editor_local') {
    return { posture: 'editor_local', available: true, reason: 'Editor-local command can restore previous editor snapshot.', inverseCommandIds: [], requiresSameStateHash: false };
  }
  if (command.operationClass === 'authority_mutating') {
    return { posture: 'authority_reversing', available: false, reason: 'V1 records reversal posture but does not expose a generic authority undo stack.', inverseCommandIds: [], requiresSameStateHash: true };
  }
  return { posture: 'not_undoable', available: false, reason: 'Command does not mutate reversible state in this workspace model.', inverseCommandIds: [], requiresSameStateHash: false };
}

function diagnostic(severity: StudioDiagnostic['severity'], code: string, message: string): StudioDiagnostic {
  return { severity, code, message, owningLane: 'asha-studio', source: 'src/session-workspace.ts', remediation: null };
}

function outputFor(commandId: StudioCommandId, sessionId: string, status: StudioWorkspaceStatus, commandCount: number): StudioCommandOutput | null {
  switch (commandId) {
    case 'session.start':
    case 'session.load_scenario':
      return { kind: 'ok' };
    case 'inspection.session_status':
      return { sessionId, status };
    case 'inspection.editor_state':
      return { artifactId: 'artifact-viewport-interaction-proof-0001', commandCount };
    case 'scene.load_asset':
      return { artifactId: 'artifact-demo-asset-load-0001', commandCount };
    case 'render.capture_before_after':
      return { artifactId: 'artifact-visual-before-after-0001', commandCount };
    case 'export.agent_readout':
      return { artifactId: 'artifact-agent-readout-0001', commandCount };
    default:
      return null;
  }
}

function stateEvidence(compatibility: StudioCompatibilityEvidence, editorVersion: string): StudioStateEvidence {
  return {
    authorityBeforeHash: null,
    authorityAfterHash: null,
    editorBeforeVersion: editorVersion,
    editorAfterVersion: editorVersion,
    renderBeforeHash: null,
    renderAfterHash: null,
    selectedBefore: NONE_SELECTION,
    selectedAfter: NONE_SELECTION,
    replay: { replayArtifactId: null, replayPath: null, replayHash: null, replayMode: 'unavailable', summary: 'unavailable: runtime bridge/replay integration is deferred.' },
    compatibility,
  };
}

function artifactFor(command: StudioCommandCatalogEntry, sequence: string): readonly StudioArtifactRef[] {
  if (command.artifacts.length === 0) return [];
  return command.artifacts.map((artifact, index) => ({
    artifactId: `artifact-${sequence}-${index + 1}`,
    artifactKind: artifact.type === 'agent_readout'
      ? 'agent_readout'
      : artifact.type === 'command_result'
        ? 'command_result'
        : artifact.type === 'render_before_after'
          ? 'visual_before_after'
          : 'state_evidence',
    pathKind: 'inline_summary',
    path: `${artifact.type}:${sequence}`,
    mediaType: 'application/json',
    contentHash: null,
    byteLength: null,
    producedBySequenceId: sequence,
    summary: artifact.summary,
  }));
}

export function invokeStudioCommand(options: {
  readonly catalog?: StudioCommandCatalog;
  readonly session: StudioSessionMetadata;
  readonly request: StudioCommandRequest;
  readonly sequenceIndex: number;
  readonly status: StudioWorkspaceStatus;
  readonly previousResults: readonly StudioCommandResult[];
}): { readonly invocation: StudioCommandInvocation; readonly result: StudioCommandResult; readonly timelineEntry: StudioCommandTimelineEntry; readonly nextStatus: StudioWorkspaceStatus; readonly scenarioId: string | null } {
  const catalog = options.catalog ?? COMMAND_CATALOG;
  const command = requireCatalogCommand(options.request.commandId, catalog);
  const sequence = sequenceId(options.sequenceIndex);
  const scenarioId = 'scenarioId' in options.request.input ? options.request.input.scenarioId : null;
  const nextStatus = options.request.commandId === 'session.start' || options.request.commandId === 'session.load_scenario' ? 'ready' : options.status;
  const commandDiagnostics = options.session.diagnostics.length === 0 ? [] : [diagnostic('warning', 'asha-studio.session.compatibility_degraded', 'Compatibility diagnostics are present on the session; command result records degraded evidence.')];
  const artifacts = artifactFor(command, sequence);
  const output = outputFor(options.request.commandId, options.session.sessionId, nextStatus, options.previousResults.length + 1);
  const changed = changedFor(command, artifacts.length > 0);
  const invocation: StudioCommandInvocation = {
    schemaVersion: 1,
    artifactKind: 'command_invocation',
    commandId: command.id,
    commandVersion: command.version,
    sequenceId: sequence,
    batchId: null,
    sessionId: options.session.sessionId,
    requestedBy: options.request.requestedBy,
    sourceLabel: options.request.sourceLabel ?? null,
    requestedAtIso: options.request.requestedAtIso,
    input: options.request.input,
    inputSummary: summarizeInput(options.request.input),
    expectedStateHash: null,
    idempotencyKey: `${options.session.sessionId}:${command.id}:${sequence}`,
    dryRun: options.request.dryRun ?? false,
  };
  const result: StudioCommandResult = {
    schemaVersion: 1,
    artifactKind: 'command_result',
    commandId: command.id,
    commandVersion: command.version,
    sequenceId: sequence,
    batchId: null,
    sessionId: options.session.sessionId,
    requestedBy: options.request.requestedBy,
    status: commandDiagnostics.some((item) => item.severity === 'error') ? 'failed' : 'ok',
    operationClass: command.operationClass,
    changed,
    state: stateEvidence(options.session.compatibility, `editor.v0.${options.sequenceIndex + 1}`),
    output,
    outputSummary: summarizeOutput(output),
    diagnostics: commandDiagnostics,
    artifacts,
    retry: retryFor(command),
    undo: undoFor(command),
    timing: { queuedAtIso: options.request.requestedAtIso, startedAtIso: options.request.requestedAtIso, completedAtIso: options.request.completedAtIso, durationMs: 0 },
  };
  const timelineEntry: StudioCommandTimelineEntry = {
    schemaVersion: 1,
    sequenceId: sequence,
    commandId: command.id,
    label: command.label,
    menuPath: command.menuPath,
    requestedBy: options.request.requestedBy,
    requestedAtIso: options.request.requestedAtIso,
    completedAtIso: options.request.completedAtIso,
    status: result.status,
    operationClass: command.operationClass,
    inputSummary: invocation.inputSummary,
    outputSummary: result.outputSummary,
    changed,
    diagnostics: result.diagnostics,
    artifactRefs: result.artifacts,
  };
  return { invocation, result, timelineEntry, nextStatus, scenarioId };
}

export function createAgentReadoutArtifact(options: {
  readonly session: StudioSessionMetadata;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly results: readonly StudioCommandResult[];
  readonly generatedAtIso: string;
  readonly knownLimitations: readonly string[];
  readonly sceneHierarchy: StudioSceneHierarchyModel;
  readonly selectedTargetInspector: StudioSelectedTargetInspectorModel;
  readonly commandEvidenceDock: StudioCommandEvidenceDockModel;
  readonly viewportEditor: StudioViewportEditorPanelModel;
  readonly sceneView: StudioSceneViewModel;
  readonly demoAssetLoad: StudioDemoAssetLoadModel;
  readonly visualEvidence?: readonly StudioVisualEvidenceRef[];
}): StudioAgentReadoutArtifact {
  const finalState = options.results.at(-1)?.state ?? stateEvidence(options.session.compatibility, 'editor.v0.0');
  const visualEvidence = options.visualEvidence ?? [];
  const visualArtifacts = visualEvidence.flatMap((evidence) => [evidence.beforeArtifact, evidence.afterArtifact].filter((artifact): artifact is StudioArtifactRef => artifact !== null));
  const exportedArtifacts = [...options.results.flatMap((result) => result.artifacts), ...visualArtifacts];
  return {
    schemaVersion: 1,
    artifactKind: 'agent_readout',
    artifactId: 'artifact-agent-readout-0001',
    generatedAtIso: options.generatedAtIso,
    session: options.session,
    commandCatalogHash: null,
    commandTimeline: options.timeline,
    commandResults: options.results,
    finalState,
    sceneHierarchy: options.sceneHierarchy,
    selectedTargetInspector: options.selectedTargetInspector,
    commandEvidenceDock: options.commandEvidenceDock,
    viewportEditor: options.viewportEditor,
    sceneView: options.sceneView,
    demoAssetLoad: options.demoAssetLoad,
    visualEvidence,
    exportedArtifacts,
    diagnostics: [...options.session.diagnostics, ...options.results.flatMap((result) => result.diagnostics)],
    knownLimitations: options.knownLimitations,
    reviewSummary: `${options.timeline.length} command(s) recorded in the shared GUI/agent timeline for ${options.session.scenarioLabel}.`,
  };
}

export function createStudioWorkspaceModel(options: {
  readonly catalog?: StudioCommandCatalog;
  readonly sessionId?: string;
  readonly scenarioId?: string;
  readonly scenarioLabel?: string;
  readonly runtimeMode?: StudioRuntimeMode;
  readonly startedAtIso?: string;
  readonly commandRequests?: readonly StudioCommandRequest[];
} = {}): StudioWorkspaceModel {
  const catalog = options.catalog ?? COMMAND_CATALOG;
  const session = createStudioSessionMetadata({
    sessionId: options.sessionId ?? 'session-preview-0001',
    scenarioId: options.scenarioId ?? 'voxel-basic',
    scenarioLabel: options.scenarioLabel ?? 'Basic Voxel Scenario',
    runtimeMode: options.runtimeMode ?? 'mock',
    startedAtIso: options.startedAtIso ?? '1970-01-01T00:00:00.000Z',
    catalog,
  });
  const defaultRequests: readonly StudioCommandRequest[] = options.commandRequests ?? [
    { commandId: 'session.start', requestedBy: 'gui', sourceLabel: 'Scenario panel', input: { scenarioId: session.scenarioId }, requestedAtIso: '1970-01-01T00:00:00.000Z', completedAtIso: '1970-01-01T00:00:00.000Z' },
    { commandId: 'session.load_scenario', requestedBy: 'agent', sourceLabel: 'agent-visible command path', input: { scenarioId: session.scenarioId }, requestedAtIso: '1970-01-01T00:00:01.000Z', completedAtIso: '1970-01-01T00:00:01.000Z' },
    { commandId: 'inspection.session_status', requestedBy: 'gui', sourceLabel: 'Status readout', input: { sessionId: session.sessionId }, requestedAtIso: '1970-01-01T00:00:02.000Z', completedAtIso: '1970-01-01T00:00:02.000Z' },
    { commandId: 'inspection.editor_state', requestedBy: 'gui', sourceLabel: 'Viewport camera/tool controls — frame selected target', input: { sessionId: session.sessionId }, requestedAtIso: '1970-01-01T00:00:03.000Z', completedAtIso: '1970-01-01T00:00:03.000Z' },
  ];
  let status: StudioWorkspaceStatus = 'not_started';
  let activeScenarioId = session.scenarioId;
  const timeline: StudioCommandTimelineEntry[] = [];
  const results: StudioCommandResult[] = [];
  for (const request of defaultRequests) {
    const executed = invokeStudioCommand({ catalog, session, request, sequenceIndex: timeline.length, status, previousResults: results });
    status = executed.nextStatus;
    if (executed.scenarioId !== null) activeScenarioId = executed.scenarioId;
    timeline.push(executed.timelineEntry);
    results.push(executed.result);
  }
  const voxelWorkflow = createVoxelWorkflowModel({
    sessionId: session.sessionId,
    scenarioId: activeScenarioId,
    compatibility: session.compatibility,
    catalog,
    sequenceStartIndex: timeline.length,
  });
  const commandBatch = createStudioCommandBatchModel({ sessionId: session.sessionId, voxelWorkflow, catalog });
  const modelMaterialPreview = createStudioModelMaterialPreviewModel({ sessionId: session.sessionId, scenarioId: activeScenarioId });
  const demoAssetLoad = createStudioDemoAssetLoadModel({ sessionId: session.sessionId, scenarioId: activeScenarioId });
  timeline.push(...voxelWorkflow.timelineEntries);
  results.push(...voxelWorkflow.commandResults);
  const loadAssetRequest: StudioCommandRequest = {
    commandId: 'scene.load_asset',
    requestedBy: 'agent',
    sourceLabel: 'Scene > Load Asset — demo asset package',
    input: demoAssetLoad.artifact.commandInput,
    requestedAtIso: '1970-01-01T00:00:06.500Z',
    completedAtIso: '1970-01-01T00:00:06.500Z',
  };
  const loadAssetExecuted = invokeStudioCommand({ catalog, session, request: loadAssetRequest, sequenceIndex: timeline.length, status, previousResults: results });
  timeline.push(loadAssetExecuted.timelineEntry);
  results.push(loadAssetExecuted.result);
  const visualEvidence = createVisualEvidenceForVoxelWorkflow(voxelWorkflow);
  for (const request of [
    { commandId: 'render.capture_before_after' as const, requestedBy: 'gui' as const, sourceLabel: 'Evidence panel', input: { sessionId: session.sessionId, includeVisualEvidence: true }, requestedAtIso: '1970-01-01T00:00:07.000Z', completedAtIso: '1970-01-01T00:00:07.000Z' },
    { commandId: 'export.agent_readout' as const, requestedBy: 'agent' as const, sourceLabel: 'Review export', input: { sessionId: session.sessionId, includeVisualEvidence: true }, requestedAtIso: '1970-01-01T00:00:08.000Z', completedAtIso: '1970-01-01T00:00:08.000Z' },
  ] satisfies readonly StudioCommandRequest[]) {
    const executed = invokeStudioCommand({ catalog, session, request, sequenceIndex: timeline.length, status, previousResults: results });
    timeline.push(executed.timelineEntry);
    results.push(executed.result);
  }
  const viewportEditor = createStudioViewportEditorPanelModel({
    voxelWorkflow,
    modelMaterialPreview,
    timeline,
    visualEvidence,
  });
  const sceneView = createStudioSceneViewModel({
    sessionId: session.sessionId,
    scenarioId: activeScenarioId,
    voxelWorkflow,
    modelMaterialPreview,
    demoAssetLoad,
    viewportEditor,
    timeline,
    visualEvidence,
  });
  const sceneHierarchy = createStudioSceneHierarchyModel({
    session,
    scenario: { scenarioId: activeScenarioId, label: session.scenarioLabel, status: status === 'ready' ? 'loaded' : 'available' },
    voxelWorkflow,
    modelMaterialPreview,
    viewportEditor,
  });
  const selectedTargetInspector = createStudioSelectedTargetInspectorModel({
    viewportEditor,
    voxelWorkflow,
    timeline,
    visualEvidence,
  });
  const reviewArtifact = createStudioReviewArtifact({
    session,
    timeline,
    results,
    visualEvidence,
    generatedAtIso: '1970-01-01T00:00:09.000Z',
    knownLimitations: ['Software snapshot visual evidence is functional proof-content evidence, not browser/GPU evidence by itself.', 'Browser screenshot capture is produced by the separate proof:browser command; native runtime bridge and Agora compositor capture remain deferred.'],
  });
  const commandEvidenceDock = createStudioCommandEvidenceDockModel({
    timeline,
    results,
    visualEvidence,
    sessionId: session.sessionId,
    reviewArtifact,
  });
  const readout = createAgentReadoutArtifact({
    session,
    timeline,
    results,
    sceneHierarchy,
    selectedTargetInspector,
    commandEvidenceDock,
    viewportEditor,
    sceneView,
    demoAssetLoad,
    visualEvidence,
    generatedAtIso: '1970-01-01T00:00:08.000Z',
    knownLimitations: ['Mock/reference session model with typed public VoxelCommand proposal/apply evidence.', 'Native runtime bridge is deferred; visual evidence is classified software_snapshot proof content.', 'Demo asset loading places a public catalog asset through scene.load_asset as reference render-diff/placement evidence; runtime authority bootstrap remains deferred.'],
  });
  return {
    session,
    status,
    scenario: { scenarioId: activeScenarioId, label: session.scenarioLabel, status: status === 'ready' ? 'loaded' : 'available' },
    scenarios: DEFAULT_SCENARIOS.map((scenario) => scenario.scenarioId === activeScenarioId ? { ...scenario, status: 'loaded' } : scenario),
    timeline,
    commandResults: results,
    voxelWorkflow,
    commandBatch,
    modelMaterialPreview,
    demoAssetLoad,
    sceneHierarchy,
    selectedTargetInspector,
    commandEvidenceDock,
    viewportEditor,
    sceneView,
    visualEvidence,
    reviewArtifact,
    exportedReadout: readout,
  };
}
