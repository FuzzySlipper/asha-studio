import type { BridgeOperation, CommandResult, ReplayStepReport } from '@asha/runtime-bridge';
import type { RenderFrameDiff, VoxelCommand } from '@asha/contracts';

import type { StudioCommandTimelineEntry } from './session-workspace';

export type StudioRuntimeBridgeProofReadiness = 'ready' | 'failed_closed';

export type StudioRuntimeBridgeDiagnosticCode =
  | 'missing_runtime_bridge_metadata'
  | 'runtime_bridge_version_mismatch'
  | 'missing_facade_operation'
  | 'runtime_command_rejected'
  | 'stale_runtime_snapshot'
  | 'runtime_render_readback_missing'
  | 'replay_mismatch'
  | 'raw_transport_bypass';

export interface StudioRuntimeBridgeDiagnostic {
  readonly code: StudioRuntimeBridgeDiagnosticCode;
  readonly severity: 'error';
  readonly message: string;
}

export interface StudioRuntimeBridgeMetadataEvidence {
  readonly packageName: '@asha/runtime-bridge';
  readonly compatibilityVersion: string | null;
  readonly packageVersion: string | null;
  readonly ashaCommit: string | null;
  readonly importedFromPackageRoot: boolean;
}

export interface StudioRuntimeBridgeOperationEvidence {
  readonly stableOperationCount: number;
  readonly manifestOperations: readonly BridgeOperation[];
  readonly requiredOperationNames: readonly string[];
}

export interface StudioRuntimeBridgeCommandEvidence {
  readonly commandId: 'authority.voxel.apply_brush';
  readonly sequenceId: string;
  readonly runtimeSessionId: string;
  readonly snapshotBeforeId: string;
  readonly snapshotAfterId: string;
  readonly authorityBeforeHash: string;
  readonly authorityAfterHash: string;
  readonly commandBatch: { readonly commands: readonly VoxelCommand[] };
  readonly commandResult: CommandResult;
}

export interface StudioRuntimeBridgeRenderEvidence {
  readonly snapshotId: string;
  readonly frameCursor: number;
  readonly renderDiff: RenderFrameDiff;
  readonly renderReadbackHash: string;
}

export interface StudioRuntimeBridgeReplayEvidence {
  readonly replayMode: 'quarantined_runtime_facade';
  readonly replayRecordId: string;
  readonly replayStep: ReplayStepReport;
  readonly expectedHash: string;
}

export interface StudioRuntimeBridgeNegativeSmoke {
  readonly smokeId: string;
  readonly expectedCode: StudioRuntimeBridgeDiagnosticCode;
  readonly actualOutcome: 'failed_closed' | 'ready';
  readonly diagnosticCodes: readonly StudioRuntimeBridgeDiagnosticCode[];
}

export interface StudioRuntimeBridgeIntegrationEvidence {
  readonly metadata: StudioRuntimeBridgeMetadataEvidence;
  readonly operations: StudioRuntimeBridgeOperationEvidence;
  readonly command: StudioRuntimeBridgeCommandEvidence;
  readonly render: StudioRuntimeBridgeRenderEvidence;
  readonly replay: StudioRuntimeBridgeReplayEvidence;
  readonly rawTransportImports: readonly string[];
}

export interface StudioRuntimeBridgeIntegrationProof {
  readonly schemaVersion: 1;
  readonly artifactKind: 'studio_runtime_bridge_integration_proof';
  readonly taskId: 3220;
  readonly proofCommand: 'pnpm run proof:runtime-bridge';
  readonly readiness: StudioRuntimeBridgeProofReadiness;
  readonly captureBackend: 'runtime_bridge_facade';
  readonly runtimeMode: 'native';
  readonly authoritySource: 'rust_native_runtime_bridge';
  readonly replaySource: 'runtime_bridge_quarantined_replay_facade';
  readonly evidence: StudioRuntimeBridgeIntegrationEvidence;
  readonly diagnostics: readonly StudioRuntimeBridgeDiagnostic[];
  readonly negativeSmokes: readonly StudioRuntimeBridgeNegativeSmoke[];
  readonly summary: {
    readonly runtimeBridgeVersion: string | null;
    readonly runtimeSessionId: string;
    readonly commandSequenceId: string;
    readonly snapshotBeforeId: string;
    readonly snapshotAfterId: string;
    readonly authorityHashChanged: boolean;
    readonly acceptedCommandCount: number;
    readonly rejectedCommandCount: number;
    readonly stableOperationCount: number;
  };
}

const EXPECTED_RUNTIME_BRIDGE_VERSION = 'runtime-bridge.v0';
const REQUIRED_OPERATION_NAMES = [
  'initialize_engine',
  'submit_commands',
  'read_render_diffs',
  'load_replay_fixture',
  'run_replay_step',
] as const;

function diagnostic(code: StudioRuntimeBridgeDiagnosticCode, message: string): StudioRuntimeBridgeDiagnostic {
  return { code, severity: 'error', message };
}

export function validateRuntimeBridgeIntegration(evidence: StudioRuntimeBridgeIntegrationEvidence): readonly StudioRuntimeBridgeDiagnostic[] {
  const diagnostics: StudioRuntimeBridgeDiagnostic[] = [];
  if (evidence.metadata.compatibilityVersion === null) {
    diagnostics.push(diagnostic('missing_runtime_bridge_metadata', 'Studio did not record @asha/runtime-bridge compatibility metadata.'));
  } else if (evidence.metadata.compatibilityVersion !== EXPECTED_RUNTIME_BRIDGE_VERSION) {
    diagnostics.push(diagnostic('runtime_bridge_version_mismatch', `Expected ${EXPECTED_RUNTIME_BRIDGE_VERSION} but saw ${evidence.metadata.compatibilityVersion}.`));
  }
  if (!evidence.metadata.importedFromPackageRoot) {
    diagnostics.push(diagnostic('raw_transport_bypass', 'Runtime bridge evidence must come from the @asha/runtime-bridge package root, not raw native/WASM transports.'));
  }
  const manifestNames = new Set(evidence.operations.manifestOperations.map((operation) => operation.manifestName));
  for (const required of evidence.operations.requiredOperationNames) {
    if (!manifestNames.has(required)) {
      diagnostics.push(diagnostic('missing_facade_operation', `Runtime bridge manifest is missing required operation ${required}.`));
    }
  }
  if (evidence.command.commandResult.rejected > 0 || evidence.command.commandResult.accepted < evidence.command.commandBatch.commands.length) {
    diagnostics.push(diagnostic('runtime_command_rejected', `Runtime command application accepted ${evidence.command.commandResult.accepted}/${evidence.command.commandBatch.commands.length} command(s).`));
  }
  if (evidence.command.authorityBeforeHash === evidence.command.authorityAfterHash || evidence.command.snapshotBeforeId === evidence.command.snapshotAfterId) {
    diagnostics.push(diagnostic('stale_runtime_snapshot', 'Runtime command evidence did not produce a distinct before/after authority snapshot.'));
  }
  if (!Array.isArray(evidence.render.renderDiff.ops)) {
    diagnostics.push(diagnostic('runtime_render_readback_missing', 'Runtime render readback did not return a contract-shaped RenderFrameDiff.'));
  }
  if (evidence.replay.replayStep.diverged || evidence.replay.replayStep.hash !== evidence.replay.expectedHash) {
    diagnostics.push(diagnostic('replay_mismatch', `Runtime replay hash ${evidence.replay.replayStep.hash} did not match ${evidence.replay.expectedHash}.`));
  }
  if (evidence.rawTransportImports.length > 0) {
    diagnostics.push(diagnostic('raw_transport_bypass', `Studio proof referenced forbidden raw transport imports: ${evidence.rawTransportImports.join(', ')}.`));
  }
  return diagnostics;
}

function buildNegativeSmokes(evidence: StudioRuntimeBridgeIntegrationEvidence): readonly StudioRuntimeBridgeNegativeSmoke[] {
  const smokes: StudioRuntimeBridgeNegativeSmoke[] = [];
  const pushSmoke = (smokeId: string, expectedCode: StudioRuntimeBridgeDiagnosticCode, mutated: StudioRuntimeBridgeIntegrationEvidence): void => {
    const diagnostics = validateRuntimeBridgeIntegration(mutated);
    const diagnosticCodes = diagnostics.map((item) => item.code);
    smokes.push({
      smokeId,
      expectedCode,
      actualOutcome: diagnosticCodes.includes(expectedCode) ? 'failed_closed' : 'ready',
      diagnosticCodes,
    });
  };
  pushSmoke('negative_missing_runtime_bridge_metadata', 'missing_runtime_bridge_metadata', {
    ...evidence,
    metadata: { ...evidence.metadata, compatibilityVersion: null },
  });
  pushSmoke('negative_runtime_bridge_version_mismatch', 'runtime_bridge_version_mismatch', {
    ...evidence,
    metadata: { ...evidence.metadata, compatibilityVersion: 'runtime-bridge.v999' },
  });
  pushSmoke('negative_missing_facade_operation', 'missing_facade_operation', {
    ...evidence,
    operations: {
      ...evidence.operations,
      manifestOperations: evidence.operations.manifestOperations.filter((operation) => operation.manifestName !== 'submit_commands'),
    },
  });
  pushSmoke('negative_stale_runtime_snapshot', 'stale_runtime_snapshot', {
    ...evidence,
    command: {
      ...evidence.command,
      snapshotAfterId: evidence.command.snapshotBeforeId,
      authorityAfterHash: evidence.command.authorityBeforeHash,
    },
  });
  pushSmoke('negative_replay_mismatch', 'replay_mismatch', {
    ...evidence,
    replay: { ...evidence.replay, expectedHash: `${evidence.replay.expectedHash}:mismatch` },
  });
  pushSmoke('negative_raw_transport_bypass', 'raw_transport_bypass', {
    ...evidence,
    rawTransportImports: ['@asha/native-bridge'],
  });
  return smokes;
}

export function buildStudioRuntimeBridgeIntegrationProof(evidence: StudioRuntimeBridgeIntegrationEvidence): StudioRuntimeBridgeIntegrationProof {
  const diagnostics = validateRuntimeBridgeIntegration(evidence);
  const negativeSmokes = buildNegativeSmokes(evidence);
  const negativesFailClosed = negativeSmokes.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.diagnosticCodes.includes(smoke.expectedCode));
  const readiness: StudioRuntimeBridgeProofReadiness = diagnostics.length === 0 && negativesFailClosed ? 'ready' : 'failed_closed';
  return {
    schemaVersion: 1,
    artifactKind: 'studio_runtime_bridge_integration_proof',
    taskId: 3220,
    proofCommand: 'pnpm run proof:runtime-bridge',
    readiness,
    captureBackend: 'runtime_bridge_facade',
    runtimeMode: 'native',
    authoritySource: 'rust_native_runtime_bridge',
    replaySource: 'runtime_bridge_quarantined_replay_facade',
    evidence,
    diagnostics,
    negativeSmokes,
    summary: {
      runtimeBridgeVersion: evidence.metadata.compatibilityVersion,
      runtimeSessionId: evidence.command.runtimeSessionId,
      commandSequenceId: evidence.command.sequenceId,
      snapshotBeforeId: evidence.command.snapshotBeforeId,
      snapshotAfterId: evidence.command.snapshotAfterId,
      authorityHashChanged: evidence.command.authorityBeforeHash !== evidence.command.authorityAfterHash,
      acceptedCommandCount: evidence.command.commandResult.accepted,
      rejectedCommandCount: evidence.command.commandResult.rejected,
      stableOperationCount: evidence.operations.stableOperationCount,
    },
  };
}

export function runtimeBridgeTimelineCorrelation(
  proof: StudioRuntimeBridgeIntegrationProof,
  timeline: readonly Pick<StudioCommandTimelineEntry, 'sequenceId' | 'commandId'>[],
): boolean {
  return timeline.some((entry) => entry.sequenceId === proof.evidence.command.sequenceId && entry.commandId === proof.evidence.command.commandId);
}

export { EXPECTED_RUNTIME_BRIDGE_VERSION, REQUIRED_OPERATION_NAMES };
