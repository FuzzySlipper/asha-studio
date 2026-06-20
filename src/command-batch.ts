import { COMMAND_CATALOG, requireCatalogCommand } from '@asha/command-registry';
import type { OperationClass, StudioCommandCatalog, StudioCommandId } from '@asha/command-registry';
import type { VoxelCommand, VoxelCoord, VoxelValue } from '@asha/contracts';

import type { StudioDiagnostic } from './compatibility';
import type { StudioActorKind, StudioCommandResult, StudioCommandStatus, StudioCommandTimelineEntry } from './session-workspace';
import type { StudioVoxelWorkflowModel } from './voxel-workflow';

export type StudioBatchTransactionMode = 'atomic' | 'best_effort';
export type StudioBatchStatus = 'ok' | 'partial' | 'rejected' | 'failed';
export type StudioBatchFailureClassification = 'none' | 'validation_error' | 'execution_error' | 'state_hash_mismatch' | 'unsupported_reversal';
export type StudioBatchRevertStatus = 'available' | 'deferred';
export type StudioBatchUndoPosture = 'not_undoable' | 'editor_local' | 'authority_reversing' | 'snapshot_restore' | 'missing';

export type StudioBatchCommandInput =
  | { readonly kind: 'session_id'; readonly sessionId: string }
  | { readonly kind: 'voxel_command'; readonly sessionId: string; readonly commands: readonly VoxelCommand[] }
  | { readonly kind: 'visual_evidence_export'; readonly sessionId: string; readonly includeVisualEvidence: boolean };

export interface StudioBatchCommandPlan {
  readonly commandId: StudioCommandId;
  readonly commandVersion: number;
  readonly requestedBy: StudioActorKind;
  readonly input: StudioBatchCommandInput;
  readonly inputSummary: string;
  readonly dryRun: boolean;
  readonly expectedStateHash: string | null;
}

export interface StudioCommandBatchInvocation {
  readonly schemaVersion: 1;
  readonly artifactKind: 'command_batch_invocation';
  readonly batchId: string;
  readonly sessionId: string;
  readonly label: string;
  readonly mode: StudioBatchTransactionMode;
  readonly dryRun: boolean;
  readonly expectedAuthorityBeforeHash: string | null;
  readonly commands: readonly StudioBatchCommandPlan[];
}

export interface StudioBatchPerCommandResult {
  readonly commandId: StudioCommandId;
  readonly commandVersion: number;
  readonly status: StudioCommandStatus;
  readonly operationClass: OperationClass;
  readonly sequenceId: string | null;
  readonly changedAuthority: boolean;
  readonly retryClassification: StudioCommandResult['retry']['classification'];
  readonly undoPosture: StudioBatchUndoPosture;
  readonly inverseDataRequirements: readonly string[];
  readonly failureClassification: StudioBatchFailureClassification;
  readonly summary: string;
}

export interface StudioCommandBatchResult {
  readonly schemaVersion: 1;
  readonly artifactKind: 'command_batch_result';
  readonly batchId: string;
  readonly sessionId: string;
  readonly mode: StudioBatchTransactionMode;
  readonly dryRun: boolean;
  readonly status: StudioBatchStatus;
  readonly failureClassification: StudioBatchFailureClassification;
  readonly authorityBeforeHash: string | null;
  readonly authorityAfterHash: string | null;
  readonly renderBeforeHash: string | null;
  readonly renderAfterHash: string | null;
  readonly commandResults: readonly StudioBatchPerCommandResult[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly retrySummary: string;
  readonly undoSummary: string;
}

export interface StudioVoxelRevertWorkflow {
  readonly status: StudioBatchRevertStatus;
  readonly reason: string;
  readonly sourceCommandSequenceId: string;
  readonly requiredSameStateHash: string;
  readonly inverseCommand: VoxelCommand | null;
  readonly expectedRevertedAuthorityHash: string | null;
  readonly expectedRevertedRenderHash: string | null;
  readonly diagnostics: readonly StudioDiagnostic[];
}

export interface StudioCommandBatchModel {
  readonly invocation: StudioCommandBatchInvocation;
  readonly result: StudioCommandBatchResult;
  readonly bestEffortFailureExample: StudioCommandBatchResult;
  readonly revertWorkflow: StudioVoxelRevertWorkflow;
  readonly validationSummary: {
    readonly transactionModeRequired: true;
    readonly perCommandResultShapeRequired: true;
    readonly undoMetadataRequiredForMutatingCommands: true;
    readonly retryMetadataRequired: true;
  };
}

function diagnostic(code: string, message: string, severity: StudioDiagnostic['severity'] = 'error'): StudioDiagnostic {
  return { severity, code, message, owningLane: 'asha-studio', source: 'src/command-batch.ts', remediation: null };
}

function valueLabel(value: VoxelValue): string {
  return value.kind === 'solid' ? `solid:${value.material}` : 'empty';
}

function coordKey(coord: VoxelCoord): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

function stableHash(prefix: string, parts: readonly string[]): string {
  let hash = 2166136261;
  for (const char of parts.join('|')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${prefix}-${hash.toString(16).padStart(8, '0')}`;
}

function assertCatalogMetadata(catalog: StudioCommandCatalog, commandIds: readonly StudioCommandId[]): readonly StudioDiagnostic[] {
  const diagnostics: StudioDiagnostic[] = [];
  for (const commandId of commandIds) {
    const command = requireCatalogCommand(commandId, catalog);
    if (command.menuPath.length === 0) diagnostics.push(diagnostic('asha-studio.batch.missing_gui_mirror', `${command.id} is missing GUI/menu mirror metadata.`));
    if (command.operationClass === 'authority_mutating' && command.stateImpact.authority !== 'mutate') diagnostics.push(diagnostic('asha-studio.batch.invalid_authority_impact', `${command.id} is authority_mutating but does not declare authority mutation.`));
    if (command.guiMirror.resultSummary.length === 0) diagnostics.push(diagnostic('asha-studio.batch.missing_result_summary', `${command.id} is missing result summary metadata.`));
  }
  return diagnostics;
}

function perCommandFromResult(result: StudioCommandResult, failureClassification: StudioBatchFailureClassification = 'none'): StudioBatchPerCommandResult {
  const undoPosture: StudioBatchUndoPosture = result.undo?.posture
    ?? (result.operationClass === 'authority_mutating'
      ? 'authority_reversing'
      : result.operationClass === 'editor_local'
        ? 'editor_local'
        : 'not_undoable');
  return {
    commandId: result.commandId,
    commandVersion: result.commandVersion,
    status: result.status,
    operationClass: result.operationClass,
    sequenceId: result.sequenceId,
    changedAuthority: result.changed.authorityChanged,
    retryClassification: result.retry.classification,
    undoPosture,
    inverseDataRequirements: undoPosture === 'authority_reversing' ? ['same authority state hash', 'inverse typed VoxelCommand'] : [],
    failureClassification,
    summary: result.outputSummary,
  };
}

function rejectedPlan(commandId: StudioCommandId, catalog: StudioCommandCatalog, summary: string, failureClassification: StudioBatchFailureClassification): StudioBatchPerCommandResult {
  const command = requireCatalogCommand(commandId, catalog);
  const retryClassification: StudioCommandResult['retry']['classification'] = command.operationClass === 'authority_mutating' ? 'safe_to_retry_if_state_hash_unchanged' : 'safe_to_retry';
  return {
    commandId,
    commandVersion: command.version,
    status: 'rejected',
    operationClass: command.operationClass,
    sequenceId: null,
    changedAuthority: false,
    retryClassification,
    undoPosture: 'not_undoable',
    inverseDataRequirements: [],
    failureClassification,
    summary,
  };
}

function buildInvocation(args: {
  readonly sessionId: string;
  readonly batchId: string;
  readonly mode: StudioBatchTransactionMode;
  readonly dryRun: boolean;
  readonly authorityBeforeHash: string;
  readonly voxelWorkflow: StudioVoxelWorkflowModel;
  readonly catalog: StudioCommandCatalog;
}): StudioCommandBatchInvocation {
  const previewCommand = requireCatalogCommand('preview.voxel_brush', args.catalog);
  const applyCommand = requireCatalogCommand('authority.voxel.apply_brush', args.catalog);
  return {
    schemaVersion: 1,
    artifactKind: 'command_batch_invocation',
    batchId: args.batchId,
    sessionId: args.sessionId,
    label: 'V1 voxel preview/apply transaction',
    mode: args.mode,
    dryRun: args.dryRun,
    expectedAuthorityBeforeHash: args.authorityBeforeHash,
    commands: [
      {
        commandId: previewCommand.id,
        commandVersion: previewCommand.version,
        requestedBy: 'gui',
        input: { kind: 'voxel_command', sessionId: args.sessionId, commands: args.voxelWorkflow.evidence.typedVoxelCommands },
        inputSummary: 'Preview typed VoxelCommand before authority mutation.',
        dryRun: true,
        expectedStateHash: args.authorityBeforeHash,
      },
      {
        commandId: applyCommand.id,
        commandVersion: applyCommand.version,
        requestedBy: 'agent',
        input: { kind: 'voxel_command', sessionId: args.sessionId, commands: args.voxelWorkflow.evidence.typedVoxelCommands },
        inputSummary: 'Apply typed VoxelCommand when preview and state hash match.',
        dryRun: args.dryRun,
        expectedStateHash: args.authorityBeforeHash,
      },
    ],
  };
}

function buildResult(args: {
  readonly invocation: StudioCommandBatchInvocation;
  readonly voxelWorkflow: StudioVoxelWorkflowModel;
  readonly catalog: StudioCommandCatalog;
}): StudioCommandBatchResult {
  const metadataDiagnostics = assertCatalogMetadata(args.catalog, args.invocation.commands.map((command) => command.commandId));
  const previewResult = args.voxelWorkflow.commandResults.find((result) => result.commandId === 'preview.voxel_brush');
  const applyResult = args.voxelWorkflow.commandResults.find((result) => result.commandId === 'authority.voxel.apply_brush');
  const missingDiagnostics: StudioDiagnostic[] = [];
  if (previewResult === undefined) missingDiagnostics.push(diagnostic('asha-studio.batch.missing_preview_result', 'Batch preview command has no per-command result.'));
  if (applyResult === undefined) missingDiagnostics.push(diagnostic('asha-studio.batch.missing_apply_result', 'Batch apply command has no per-command result.'));
  const commandResults = [previewResult, applyResult]
    .filter((result): result is StudioCommandResult => result !== undefined)
    .map((result) => perCommandFromResult(result));
  const diagnostics = [...metadataDiagnostics, ...missingDiagnostics];
  const failed = diagnostics.some((item) => item.severity === 'error');
  return {
    schemaVersion: 1,
    artifactKind: 'command_batch_result',
    batchId: args.invocation.batchId,
    sessionId: args.invocation.sessionId,
    mode: args.invocation.mode,
    dryRun: args.invocation.dryRun,
    status: failed ? 'failed' : 'ok',
    failureClassification: failed ? 'validation_error' : 'none',
    authorityBeforeHash: args.voxelWorkflow.evidence.authorityBeforeHash,
    authorityAfterHash: args.invocation.dryRun ? args.voxelWorkflow.evidence.authorityBeforeHash : args.voxelWorkflow.evidence.authorityAfterHash,
    renderBeforeHash: args.voxelWorkflow.evidence.renderEvidence.beforeRenderHash,
    renderAfterHash: args.invocation.dryRun ? args.voxelWorkflow.evidence.renderEvidence.beforeRenderHash : args.voxelWorkflow.evidence.renderEvidence.afterRenderHash,
    commandResults,
    diagnostics,
    retrySummary: 'Atomic batch is retryable only when expectedAuthorityBeforeHash still matches and no command sequence committed.',
    undoSummary: 'Authority-mutating apply carries authority_reversing posture and a typed inverse VoxelCommand for this V1 setVoxel edit.',
  };
}

function buildBestEffortFailureExample(args: {
  readonly sessionId: string;
  readonly voxelWorkflow: StudioVoxelWorkflowModel;
  readonly catalog: StudioCommandCatalog;
}): StudioCommandBatchResult {
  const applyResult = args.voxelWorkflow.commandResults.find((result) => result.commandId === 'authority.voxel.apply_brush');
  const accepted = applyResult === undefined ? [] : [perCommandFromResult(applyResult)];
  const rejected = rejectedPlan('authority.voxel.apply_brush', args.catalog, 'Rejected second apply: expected state hash no longer matches after first accepted command.', 'state_hash_mismatch');
  return {
    schemaVersion: 1,
    artifactKind: 'command_batch_result',
    batchId: 'batch-v1-best-effort-partial-example',
    sessionId: args.sessionId,
    mode: 'best_effort',
    dryRun: false,
    status: 'partial',
    failureClassification: 'state_hash_mismatch',
    authorityBeforeHash: args.voxelWorkflow.evidence.authorityBeforeHash,
    authorityAfterHash: args.voxelWorkflow.evidence.authorityAfterHash,
    renderBeforeHash: args.voxelWorkflow.evidence.renderEvidence.beforeRenderHash,
    renderAfterHash: args.voxelWorkflow.evidence.renderEvidence.afterRenderHash,
    commandResults: [...accepted, rejected],
    diagnostics: [diagnostic('asha-studio.batch.partial_state_hash_mismatch', 'Best-effort batch kept the first accepted command and classified the stale second command as rejected.', 'warning')],
    retrySummary: 'Best-effort partial batches are not blindly retryable; rejected commands require fresh state readback.',
    undoSummary: 'Only accepted mutating commands produce inverse-data requirements; rejected commands do not mutate authority.',
  };
}

function buildRevertWorkflow(voxelWorkflow: StudioVoxelWorkflowModel): StudioVoxelRevertWorkflow {
  const changed = voxelWorkflow.evidence.changedVoxels[0];
  const sourceSequenceId = voxelWorkflow.commandResults.find((result) => result.commandId === 'authority.voxel.apply_brush')?.sequenceId ?? 'seq-unknown';
  if (changed === undefined) {
    return {
      status: 'deferred',
      reason: 'No changed voxel is available to derive a typed inverse command.',
      sourceCommandSequenceId: sourceSequenceId,
      requiredSameStateHash: voxelWorkflow.evidence.authorityAfterHash,
      inverseCommand: null,
      expectedRevertedAuthorityHash: null,
      expectedRevertedRenderHash: null,
      diagnostics: [diagnostic('asha-studio.batch.revert_no_changed_voxel', 'Cannot derive a V1 inverse command without a changed voxel.')],
    };
  }
  const beforeCell = voxelWorkflow.beforeGrid.find((cell) => coordKey(cell.coord) === coordKey(changed));
  const priorValue = beforeCell?.before ?? { kind: 'empty' };
  const inverseCommand: VoxelCommand = { op: 'setVoxel', grid: 0, coord: changed, value: priorValue };
  const revertedHash = stableHash('grid-fnv1a-revert', [`${coordKey(changed)}=${valueLabel(priorValue)}`, voxelWorkflow.evidence.authorityBeforeHash]);
  return {
    status: 'available',
    reason: 'The V1 voxel edit is a single typed setVoxel command; Studio can derive a safe inverse setVoxel when authorityAfterHash still matches.',
    sourceCommandSequenceId: sourceSequenceId,
    requiredSameStateHash: voxelWorkflow.evidence.authorityAfterHash,
    inverseCommand,
    expectedRevertedAuthorityHash: voxelWorkflow.evidence.authorityBeforeHash,
    expectedRevertedRenderHash: `render-${voxelWorkflow.evidence.authorityBeforeHash}`,
    diagnostics: [diagnostic('asha-studio.batch.revert_reference_hash', `Reference inverse command hash ${revertedHash} is derived from typed public VoxelCommand data.`, 'info')],
  };
}

export function createStudioCommandBatchModel(options: {
  readonly sessionId: string;
  readonly voxelWorkflow: StudioVoxelWorkflowModel;
  readonly catalog?: StudioCommandCatalog;
}): StudioCommandBatchModel {
  const catalog = options.catalog ?? COMMAND_CATALOG;
  const invocation = buildInvocation({
    sessionId: options.sessionId,
    batchId: 'batch-v1-voxel-preview-apply-0001',
    mode: 'atomic',
    dryRun: false,
    authorityBeforeHash: options.voxelWorkflow.evidence.authorityBeforeHash,
    voxelWorkflow: options.voxelWorkflow,
    catalog,
  });
  return {
    invocation,
    result: buildResult({ invocation, voxelWorkflow: options.voxelWorkflow, catalog }),
    bestEffortFailureExample: buildBestEffortFailureExample({ sessionId: options.sessionId, voxelWorkflow: options.voxelWorkflow, catalog }),
    revertWorkflow: buildRevertWorkflow(options.voxelWorkflow),
    validationSummary: {
      transactionModeRequired: true,
      perCommandResultShapeRequired: true,
      undoMetadataRequiredForMutatingCommands: true,
      retryMetadataRequired: true,
    },
  };
}

export function validateCommandBatchModel(model: StudioCommandBatchModel): readonly StudioDiagnostic[] {
  const diagnostics: StudioDiagnostic[] = [];
  if (model.invocation.mode !== 'atomic' && model.invocation.mode !== 'best_effort') {
    diagnostics.push(diagnostic('asha-studio.batch.invalid_mode', 'Batch transaction mode must be atomic or best_effort.'));
  }
  if (model.result.commandResults.length !== model.invocation.commands.length) {
    diagnostics.push(diagnostic('asha-studio.batch.per_command_result_count_mismatch', 'Batch result must include one per-command result for every command plan.'));
  }
  for (const result of model.result.commandResults) {
    if (result.undoPosture === 'missing') diagnostics.push(diagnostic('asha-studio.batch.missing_undo_posture', `${result.commandId} result is missing undo posture.`));
    if (result.retryClassification.length === 0) diagnostics.push(diagnostic('asha-studio.batch.missing_retry_classification', `${result.commandId} result is missing retry classification.`));
  }
  return diagnostics;
}
