import { COMMAND_CATALOG, requireCatalogCommand } from '@asha/command-registry';
import type {
  VoxelConversionApplyRequest,
  VoxelConversionDiagnostic,
  VoxelConversionEvidenceRef,
  VoxelConversionMaterialMap,
  VoxelConversionPlan,
  VoxelConversionPlanRequest,
  VoxelConversionPreview,
  VoxelConversionPreviewRequest,
  VoxelConversionReceipt,
  VoxelConversionSettings,
  VoxelConversionSourceRef,
  VoxelConversionTargetRef,
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

export type StudioVoxelConversionWorkspaceStatus =
  | 'incomplete'
  | 'ready'
  | 'stale'
  | 'invalid'
  | 'limit_exceeded'
  | 'applied';

export type StudioVoxelConversionOperationStatus =
  | 'blocked'
  | 'ready'
  | 'stale'
  | 'complete'
  | 'failed_closed';

export type StudioVoxelConversionWorkspaceDiagnosticCode =
  | 'missing_source'
  | 'missing_target'
  | 'missing_settings'
  | 'unsupported_source_asset'
  | 'source_hash_mismatch'
  | 'invalid_material_map'
  | 'output_limit_exceeded'
  | 'missing_plan'
  | 'stale_plan'
  | 'missing_preview'
  | 'stale_preview'
  | 'missing_evidence';

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

export interface StudioVoxelConversionWorkspaceDiagnostic {
  readonly severity: 'info' | 'warning' | 'error';
  readonly code: StudioVoxelConversionWorkspaceDiagnosticCode;
  readonly operation: StudioVoxelConversionCommandId | 'workspace';
  readonly reference: string;
  readonly message: string;
}

export interface StudioVoxelConversionWorkspaceInput {
  readonly source: VoxelConversionSourceRef | null;
  readonly target: VoxelConversionTargetRef | null;
  readonly settings: VoxelConversionSettings | null;
  readonly plan: VoxelConversionPlan | null;
  readonly preview: VoxelConversionPreview | null;
  readonly receipt: VoxelConversionReceipt | null;
  readonly evidence: readonly VoxelConversionEvidenceRef[];
  readonly supportedSourceAssetKinds?: readonly string[];
}

export interface StudioVoxelConversionSourceReadModel {
  readonly status: 'missing' | 'selected' | 'unsupported' | 'stale';
  readonly source: VoxelConversionSourceRef | null;
  readonly sourceHash: string | null;
  readonly diagnostics: readonly StudioVoxelConversionWorkspaceDiagnostic[];
}

export interface StudioVoxelConversionSettingsReadModel {
  readonly status: 'missing' | 'valid' | 'invalid' | 'limit_exceeded';
  readonly settings: VoxelConversionSettings | null;
  readonly materialMap: VoxelConversionMaterialMap | null;
  readonly requestedOutputVoxels: number | null;
  readonly diagnostics: readonly StudioVoxelConversionWorkspaceDiagnostic[];
}

export interface StudioVoxelConversionOperationReadModel {
  readonly commandId: StudioVoxelConversionCommandId;
  readonly status: StudioVoxelConversionOperationStatus;
  readonly diagnostics: readonly StudioVoxelConversionWorkspaceDiagnostic[];
  readonly evidence: readonly VoxelConversionEvidenceRef[];
}

export interface StudioVoxelConversionWorkspaceReadModel {
  readonly status: StudioVoxelConversionWorkspaceStatus;
  readonly source: StudioVoxelConversionSourceReadModel;
  readonly target: VoxelConversionTargetRef | null;
  readonly settings: StudioVoxelConversionSettingsReadModel;
  readonly plan: VoxelConversionPlan | null;
  readonly preview: VoxelConversionPreview | null;
  readonly receipt: VoxelConversionReceipt | null;
  readonly operations: {
    readonly plan: StudioVoxelConversionOperationReadModel;
    readonly preview: StudioVoxelConversionOperationReadModel;
    readonly apply: StudioVoxelConversionOperationReadModel;
    readonly exportEvidence: StudioVoxelConversionOperationReadModel;
  };
  readonly diagnostics: readonly StudioVoxelConversionWorkspaceDiagnostic[];
  readonly readoutHash: string;
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

const DEFAULT_SUPPORTED_SOURCE_ASSET_KINDS = ['static_mesh'] as const;

function workspaceDiagnostic(
  code: StudioVoxelConversionWorkspaceDiagnosticCode,
  operation: StudioVoxelConversionWorkspaceDiagnostic['operation'],
  reference: string,
  message: string,
  severity: StudioVoxelConversionWorkspaceDiagnostic['severity'] = 'error',
): StudioVoxelConversionWorkspaceDiagnostic {
  return {
    severity,
    code,
    operation,
    reference,
    message,
  };
}

function requestedOutputVoxels(settings: VoxelConversionSettings): number {
  return settings.resolution.reduce((total, axis) => total * axis, 1);
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function materialMapDiagnostics(
  materialMap: VoxelConversionMaterialMap,
): readonly StudioVoxelConversionWorkspaceDiagnostic[] {
  const diagnostics: StudioVoxelConversionWorkspaceDiagnostic[] = [];
  const seenSlots = new Set<number>();

  if (materialMap.defaultVoxelMaterial !== null && !isPositiveInteger(materialMap.defaultVoxelMaterial)) {
    diagnostics.push(workspaceDiagnostic(
      'invalid_material_map',
      'workspace',
      'settings.materialMap.defaultVoxelMaterial',
      'Default voxel material must be a positive integer or null.',
    ));
  }

  for (const entry of materialMap.entries) {
    if (!Number.isInteger(entry.sourceMaterialSlot) || entry.sourceMaterialSlot < 0) {
      diagnostics.push(workspaceDiagnostic(
        'invalid_material_map',
        'workspace',
        `settings.materialMap.entries.${entry.sourceMaterialSlot}`,
        'Source material slots must be non-negative integers.',
      ));
    }
    if (!isPositiveInteger(entry.voxelMaterial)) {
      diagnostics.push(workspaceDiagnostic(
        'invalid_material_map',
        'workspace',
        `settings.materialMap.entries.${entry.sourceMaterialSlot}.voxelMaterial`,
        'Voxel material ids must be positive integers.',
      ));
    }
    if (seenSlots.has(entry.sourceMaterialSlot)) {
      diagnostics.push(workspaceDiagnostic(
        'invalid_material_map',
        'workspace',
        `settings.materialMap.entries.${entry.sourceMaterialSlot}`,
        'Material map entries must not duplicate source material slots.',
      ));
    }
    seenSlots.add(entry.sourceMaterialSlot);
  }

  return diagnostics;
}

function sourceDiagnostics(
  source: VoxelConversionSourceRef | null,
  supportedSourceAssetKinds: readonly string[],
  plan: VoxelConversionPlan | null,
): readonly StudioVoxelConversionWorkspaceDiagnostic[] {
  if (source === null) {
    return [
      workspaceDiagnostic(
        'missing_source',
        'workspace',
        'source',
        'Select a source asset before planning voxel conversion.',
      ),
    ];
  }

  const diagnostics: StudioVoxelConversionWorkspaceDiagnostic[] = [];
  if (!supportedSourceAssetKinds.includes(source.assetKind)) {
    diagnostics.push(workspaceDiagnostic(
      'unsupported_source_asset',
      'workspace',
      `source.assetKind.${source.assetKind}`,
      `Source asset kind ${source.assetKind} is not supported for voxel conversion.`,
    ));
  }

  if (source.sourceHash.length === 0) {
    diagnostics.push(workspaceDiagnostic(
      'source_hash_mismatch',
      'workspace',
      'source.sourceHash',
      'Source asset must expose a stable source hash.',
    ));
  }

  if (
    plan !== null
    && (plan.expectedSourceHash !== source.sourceHash || plan.source.sourceHash !== source.sourceHash)
  ) {
    diagnostics.push(workspaceDiagnostic(
      'source_hash_mismatch',
      'workspace',
      'source.sourceHash',
      'Selected source hash no longer matches the latest conversion plan.',
    ));
  }

  return diagnostics;
}

function settingsDiagnostics(
  settings: VoxelConversionSettings | null,
): readonly StudioVoxelConversionWorkspaceDiagnostic[] {
  if (settings === null) {
    return [
      workspaceDiagnostic(
        'missing_settings',
        'workspace',
        'settings',
        'Conversion settings are required before planning voxel conversion.',
      ),
    ];
  }

  const diagnostics: StudioVoxelConversionWorkspaceDiagnostic[] = [];
  if (!settings.resolution.every(isPositiveInteger)) {
    diagnostics.push(workspaceDiagnostic(
      'output_limit_exceeded',
      'workspace',
      'settings.resolution',
      'Conversion resolution must use positive integer axes.',
    ));
  }
  if (!isPositiveInteger(settings.maxOutputVoxels)) {
    diagnostics.push(workspaceDiagnostic(
      'output_limit_exceeded',
      'workspace',
      'settings.maxOutputVoxels',
      'Maximum output voxel limit must be a positive integer.',
    ));
  }
  if (settings.voxelSize <= 0) {
    diagnostics.push(workspaceDiagnostic(
      'output_limit_exceeded',
      'workspace',
      'settings.voxelSize',
      'Voxel size must be positive.',
    ));
  }
  const outputVoxels = requestedOutputVoxels(settings);
  if (outputVoxels > settings.maxOutputVoxels) {
    diagnostics.push(workspaceDiagnostic(
      'output_limit_exceeded',
      'workspace',
      'settings.resolution',
      `Requested ${outputVoxels} voxels exceeds the configured limit of ${settings.maxOutputVoxels}.`,
    ));
  }

  diagnostics.push(...materialMapDiagnostics(settings.materialMap));
  return diagnostics;
}

function missingTargetDiagnostics(
  target: VoxelConversionTargetRef | null,
): readonly StudioVoxelConversionWorkspaceDiagnostic[] {
  if (target !== null) {
    return [];
  }
  return [
    workspaceDiagnostic(
      'missing_target',
      'workspace',
      'target',
      'Choose a target grid before planning voxel conversion.',
    ),
  ];
}

function hasDiagnostic(
  diagnostics: readonly StudioVoxelConversionWorkspaceDiagnostic[],
  code: StudioVoxelConversionWorkspaceDiagnosticCode,
): boolean {
  return diagnostics.some(diagnostic => diagnostic.code === code);
}

function evidenceForKind(
  evidence: readonly VoxelConversionEvidenceRef[],
  kind: VoxelConversionEvidenceRef['kind'],
): readonly VoxelConversionEvidenceRef[] {
  return evidence.filter(ref => ref.kind === kind);
}

function stableReadoutHash(readout: Omit<StudioVoxelConversionWorkspaceReadModel, 'readoutHash'>): string {
  const text = JSON.stringify(readout);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) >>> 0;
  }
  return `voxel-conversion-readout-${hash.toString(16).padStart(8, '0')}`;
}

function operationReadModel(
  commandId: StudioVoxelConversionCommandId,
  status: StudioVoxelConversionOperationStatus,
  diagnostics: readonly StudioVoxelConversionWorkspaceDiagnostic[],
  evidence: readonly VoxelConversionEvidenceRef[],
): StudioVoxelConversionOperationReadModel {
  return {
    commandId,
    status,
    diagnostics,
    evidence,
  };
}

export function buildStudioVoxelConversionWorkspaceReadModel(
  input: StudioVoxelConversionWorkspaceInput,
): StudioVoxelConversionWorkspaceReadModel {
  const supportedSourceAssetKinds = input.supportedSourceAssetKinds ?? DEFAULT_SUPPORTED_SOURCE_ASSET_KINDS;
  const sourceIssues = sourceDiagnostics(input.source, supportedSourceAssetKinds, input.plan);
  const targetIssues = missingTargetDiagnostics(input.target);
  const settingsIssues = settingsDiagnostics(input.settings);
  const workspaceIssues = [...sourceIssues, ...targetIssues, ...settingsIssues];
  const hasBlockingWorkspaceIssue = workspaceIssues.length > 0;
  const planStale = sourceIssues.some(diagnostic => diagnostic.code === 'source_hash_mismatch');

  const planDiagnostics = hasBlockingWorkspaceIssue
    ? workspaceIssues
    : input.plan === null
      ? [
        workspaceDiagnostic(
          'missing_plan',
          'voxel_conversion.plan',
          'plan',
          'No authority plan has been received for the current workspace inputs.',
          'info',
        ),
      ]
      : planStale
        ? [
          workspaceDiagnostic(
            'stale_plan',
            'voxel_conversion.plan',
            'plan',
            'The latest plan was produced for stale workspace inputs.',
          ),
        ]
        : [];

  const previewStale = input.plan !== null
    && input.preview !== null
    && input.preview.planId !== input.plan.planId;
  const previewDiagnostics = input.plan === null
    ? [
      workspaceDiagnostic(
        'missing_plan',
        'voxel_conversion.preview',
        'plan',
        'Preview requires an authority plan.',
        'info',
      ),
    ]
    : planDiagnostics.some(diagnostic => diagnostic.severity === 'error')
      ? [
        workspaceDiagnostic(
          'stale_plan',
          'voxel_conversion.preview',
          'plan',
          'Preview is blocked until the plan matches current workspace inputs.',
        ),
      ]
      : input.preview === null
        ? [
          workspaceDiagnostic(
            'missing_preview',
            'voxel_conversion.preview',
            'preview',
            'No authority preview has been received for the current plan.',
            'info',
          ),
        ]
        : previewStale
          ? [
            workspaceDiagnostic(
              'stale_preview',
              'voxel_conversion.preview',
              'preview.planId',
              'Preview plan id does not match the latest plan.',
            ),
          ]
          : [];

  const applyDiagnostics = input.plan === null
    ? [
      workspaceDiagnostic(
        'missing_plan',
        'voxel_conversion.apply',
        'plan',
        'Apply requires an authority plan.',
        'info',
      ),
    ]
    : input.preview === null
      ? [
        workspaceDiagnostic(
          'missing_preview',
          'voxel_conversion.apply',
          'preview',
          'Apply requires a current preview.',
          'info',
        ),
      ]
      : previewDiagnostics.some(diagnostic => diagnostic.severity === 'error')
        ? [
          workspaceDiagnostic(
            'stale_preview',
            'voxel_conversion.apply',
            'preview',
            'Apply is blocked until preview evidence matches the latest plan.',
          ),
        ]
        : [];

  const exportEvidence = [
    ...input.evidence,
    ...(input.plan?.evidence ?? []),
    ...(input.preview?.evidence ?? []),
    ...(input.receipt?.evidence ?? []),
  ];
  const exportDiagnostics = exportEvidence.length === 0
    ? [
      workspaceDiagnostic(
        'missing_evidence',
        'voxel_conversion.export_evidence',
        'evidence',
        'Export requires authority-produced evidence references.',
        'info',
      ),
    ]
    : [];

  const planStatus: StudioVoxelConversionOperationStatus = planDiagnostics.some(diagnostic => diagnostic.severity === 'error')
    ? 'blocked'
    : input.plan === null
      ? 'ready'
      : planStale
        ? 'stale'
        : 'complete';
  const previewStatus: StudioVoxelConversionOperationStatus = previewDiagnostics.some(diagnostic => diagnostic.severity === 'error')
    ? previewStale ? 'stale' : 'blocked'
    : input.plan === null
      ? 'blocked'
      : input.preview === null
        ? 'ready'
        : 'complete';
  const applyStatus: StudioVoxelConversionOperationStatus = input.receipt?.applied === true
    ? 'complete'
    : applyDiagnostics.some(diagnostic => diagnostic.severity === 'error')
      ? 'blocked'
      : input.preview === null
        ? 'blocked'
        : 'ready';
  const exportStatus: StudioVoxelConversionOperationStatus = exportDiagnostics.length === 0 ? 'ready' : 'blocked';

  const sourceStatus: StudioVoxelConversionSourceReadModel['status'] = input.source === null
    ? 'missing'
    : hasDiagnostic(sourceIssues, 'unsupported_source_asset')
      ? 'unsupported'
      : hasDiagnostic(sourceIssues, 'source_hash_mismatch')
        ? 'stale'
        : 'selected';
  const settingsStatus: StudioVoxelConversionSettingsReadModel['status'] = input.settings === null
    ? 'missing'
    : hasDiagnostic(settingsIssues, 'invalid_material_map')
      ? 'invalid'
      : hasDiagnostic(settingsIssues, 'output_limit_exceeded')
        ? 'limit_exceeded'
        : 'valid';

  const diagnostics = [
    ...workspaceIssues,
    ...planDiagnostics,
    ...previewDiagnostics,
    ...applyDiagnostics,
    ...exportDiagnostics,
  ];
  const status: StudioVoxelConversionWorkspaceStatus = input.receipt?.applied === true
    ? 'applied'
    : settingsStatus === 'limit_exceeded'
      ? 'limit_exceeded'
      : settingsStatus === 'invalid' || sourceStatus === 'unsupported'
        ? 'invalid'
        : sourceStatus === 'stale' || planStatus === 'stale' || previewStatus === 'stale'
          ? 'stale'
          : hasBlockingWorkspaceIssue
            ? 'incomplete'
            : 'ready';

  const readoutWithoutHash: Omit<StudioVoxelConversionWorkspaceReadModel, 'readoutHash'> = {
    status,
    source: {
      status: sourceStatus,
      source: input.source,
      sourceHash: input.source?.sourceHash ?? null,
      diagnostics: sourceIssues,
    },
    target: input.target,
    settings: {
      status: settingsStatus,
      settings: input.settings,
      materialMap: input.settings?.materialMap ?? null,
      requestedOutputVoxels: input.settings === null ? null : requestedOutputVoxels(input.settings),
      diagnostics: settingsIssues,
    },
    plan: input.plan,
    preview: input.preview,
    receipt: input.receipt,
    operations: {
      plan: operationReadModel(
        'voxel_conversion.plan',
        planStatus,
        planDiagnostics,
        evidenceForKind(exportEvidence, 'plan'),
      ),
      preview: operationReadModel(
        'voxel_conversion.preview',
        previewStatus,
        previewDiagnostics,
        evidenceForKind(exportEvidence, 'preview'),
      ),
      apply: operationReadModel(
        'voxel_conversion.apply',
        applyStatus,
        applyDiagnostics,
        evidenceForKind(exportEvidence, 'apply_receipt'),
      ),
      exportEvidence: operationReadModel(
        'voxel_conversion.export_evidence',
        exportStatus,
        exportDiagnostics,
        exportEvidence,
      ),
    },
    diagnostics,
    nonClaims: STUDIO_VOXEL_CONVERSION_NON_CLAIMS,
  };

  return {
    ...readoutWithoutHash,
    readoutHash: stableReadoutHash(readoutWithoutHash),
  };
}

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
