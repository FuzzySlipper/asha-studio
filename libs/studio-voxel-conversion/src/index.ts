import { COMMAND_CATALOG, requireCatalogCommand } from '@asha/command-registry';
import type {
  VoxelConversionApplyRequest,
  VoxelConversionDiagnostic,
  VoxelConversionEvidenceRef,
  VoxelConversionPlan,
  VoxelConversionPlanRequest,
  VoxelConversionPreview,
  VoxelConversionPreviewRequest,
  VoxelConversionReceipt,
} from '@asha/contracts';
import type { RuntimeSessionFacade } from '@asha/runtime-bridge';

export type StudioVoxelConversionCommandId =
  | 'voxel_conversion.plan'
  | 'voxel_conversion.preview'
  | 'voxel_conversion.apply'
  | 'voxel_conversion.export_evidence';

export type StudioVoxelConversionRuntimeMethod =
  | 'planVoxelConversion'
  | 'previewVoxelConversion'
  | 'applyVoxelConversion'
  | 'exportVoxelConversionEvidence';

export type StudioVoxelConversionReadinessStatus =
  | 'ready'
  | 'unavailable'
  | 'failed_closed';

export type StudioVoxelConversionBoundaryDiagnosticCode =
  | 'missing_command_metadata'
  | 'missing_runtime_requirement'
  | 'unexpected_contract_ref'
  | 'runtime_facade_unavailable';

export interface StudioVoxelConversionOperationBoundary {
  readonly commandId: StudioVoxelConversionCommandId;
  readonly runtimeMethod: StudioVoxelConversionRuntimeMethod;
  readonly inputContract: string;
  readonly outputContract: string;
  readonly evidenceArtifactType: string;
}

export interface StudioVoxelConversionBoundaryDiagnostic {
  readonly severity: 'error';
  readonly code: StudioVoxelConversionBoundaryDiagnosticCode;
  readonly commandId: StudioVoxelConversionCommandId;
  readonly message: string;
}

export interface StudioVoxelConversionBoundaryReadout {
  readonly status: StudioVoxelConversionReadinessStatus;
  readonly operations: readonly StudioVoxelConversionOperationBoundary[];
  readonly diagnostics: readonly StudioVoxelConversionBoundaryDiagnostic[];
  readonly nonClaims: readonly StudioVoxelConversionNonClaim[];
}

export type StudioVoxelConversionNonClaim =
  | 'not_conversion_authority'
  | 'not_mesh_voxelizer'
  | 'not_raw_runtime_transport'
  | 'not_voxelforge_runtime'
  | 'not_generated_contract_owner';

export interface StudioVoxelConversionContractSurface {
  readonly planRequest: VoxelConversionPlanRequest;
  readonly plan: VoxelConversionPlan;
  readonly previewRequest: VoxelConversionPreviewRequest;
  readonly preview: VoxelConversionPreview;
  readonly applyRequest: VoxelConversionApplyRequest;
  readonly receipt: VoxelConversionReceipt;
  readonly evidence: readonly VoxelConversionEvidenceRef[];
  readonly diagnostics: readonly VoxelConversionDiagnostic[];
}

export const STUDIO_VOXEL_CONVERSION_NON_CLAIMS: readonly StudioVoxelConversionNonClaim[] = [
  'not_conversion_authority',
  'not_mesh_voxelizer',
  'not_raw_runtime_transport',
  'not_voxelforge_runtime',
  'not_generated_contract_owner',
];

export const STUDIO_VOXEL_CONVERSION_OPERATION_BOUNDARIES: readonly StudioVoxelConversionOperationBoundary[] = [
  {
    commandId: 'voxel_conversion.plan',
    runtimeMethod: 'planVoxelConversion',
    inputContract: 'VoxelConversionPlanRequest',
    outputContract: 'VoxelConversionPlan',
    evidenceArtifactType: 'voxel_conversion_plan',
  },
  {
    commandId: 'voxel_conversion.preview',
    runtimeMethod: 'previewVoxelConversion',
    inputContract: 'VoxelConversionPreviewRequest',
    outputContract: 'VoxelConversionPreview',
    evidenceArtifactType: 'voxel_conversion_preview',
  },
  {
    commandId: 'voxel_conversion.apply',
    runtimeMethod: 'applyVoxelConversion',
    inputContract: 'VoxelConversionApplyRequest',
    outputContract: 'VoxelConversionReceipt',
    evidenceArtifactType: 'voxel_conversion_receipt',
  },
  {
    commandId: 'voxel_conversion.export_evidence',
    runtimeMethod: 'exportVoxelConversionEvidence',
    inputContract: 'VoxelConversionEvidenceRef',
    outputContract: 'VoxelConversionEvidenceRef',
    evidenceArtifactType: 'voxel_conversion_evidence',
  },
];

export function buildStudioVoxelConversionBoundaryReadout(
  runtimeSession: Partial<Pick<RuntimeSessionFacade, StudioVoxelConversionRuntimeMethod>> | null = null,
): StudioVoxelConversionBoundaryReadout {
  const diagnostics: StudioVoxelConversionBoundaryDiagnostic[] = [];

  for (const operation of STUDIO_VOXEL_CONVERSION_OPERATION_BOUNDARIES) {
    const command = COMMAND_CATALOG.commands.find(item => item.id === operation.commandId);
    if (command === undefined) {
      diagnostics.push({
        severity: 'error',
        code: 'missing_command_metadata',
        commandId: operation.commandId,
        message: `Missing command metadata for ${operation.commandId}.`,
      });
      continue;
    }

    requireCatalogCommand(operation.commandId, COMMAND_CATALOG);

    const runtimeRequirement = command.runtimeRequirements.find(
      requirement =>
        requirement.kind === 'runtime_session_facade_method'
        && requirement.method === operation.runtimeMethod,
    );
    if (runtimeRequirement === undefined) {
      diagnostics.push({
        severity: 'error',
        code: 'missing_runtime_requirement',
        commandId: operation.commandId,
        message: `${operation.commandId} is missing runtime facade method ${operation.runtimeMethod}.`,
      });
    }

    const hasInputContract = command.inputContractRefs.some(
      contract => contract.package === '@asha/contracts' && contract.exportName === operation.inputContract,
    );
    const hasOutputContract = command.outputContractRefs.some(
      contract => contract.package === '@asha/contracts' && contract.exportName === operation.outputContract,
    );
    if (!hasInputContract || !hasOutputContract) {
      diagnostics.push({
        severity: 'error',
        code: 'unexpected_contract_ref',
        commandId: operation.commandId,
        message: `${operation.commandId} does not expose the expected public contract refs.`,
      });
    }

    const runtimeMethod = runtimeSession?.[operation.runtimeMethod];
    if (runtimeSession !== null && typeof runtimeMethod !== 'function') {
      diagnostics.push({
        severity: 'error',
        code: 'runtime_facade_unavailable',
        commandId: operation.commandId,
        message: `${operation.runtimeMethod} is unavailable on the runtime facade.`,
      });
    }
  }

  return {
    status: diagnostics.length === 0 ? 'ready' : 'failed_closed',
    operations: STUDIO_VOXEL_CONVERSION_OPERATION_BOUNDARIES,
    diagnostics,
    nonClaims: STUDIO_VOXEL_CONVERSION_NON_CLAIMS,
  };
}
