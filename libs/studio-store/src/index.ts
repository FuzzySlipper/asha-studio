import { computed, inject, Injectable, signal } from '@angular/core';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  attachStudioGameWorkspaceDevtools,
  buildStudioUiStateReadModel,
  applySelectedEntityReadModel,
  buildAssetBrowserCategories,
  buildStudioPreferencesReadModel,
  buildStudioLightingProjection,
  buildStudioAshaDemoProductPathReadModel,
  buildStudioRuntimeSessionList,
  buildStudioCommandProposalPanel,
  buildStudioCatalogWorkflowReadModel,
  buildDefaultStudioFpsGameplayPresetDraft,
  buildStudioGameWorkspaceCommandProposalReadModel,
  buildStudioGameWorkspaceReadout,
  buildStudioRuntimeSessionInspectionReadModel,
  buildStudioRunningProjectDiscovery,
  loadStudioAssetInventory,
  loadStudioPublishEvidence,
  buildStudioViewportReadout,
  buildInitialWorkspaceReadModel,
  buildStudioViewportAdapterReadModel,
  buildStudioViewportCameraReadModel,
  buildStudioViewportToolReadModel,
  buildStudioSceneAuthoringOperation,
  clearStudioWorkspaceReadModel,
  createSelectEntityIntent,
  createRenameSceneObjectRequest,
  createReparentSceneObjectRequest,
  createStudioCompactAgentReadout,
  exportStudioWorkspaceCockpitEvidence,
  frameStudioViewportCamera,
  frameStudioViewportCameraOnRenderable,
  findUnresolvedSceneAssetIds,
  filterAssetBrowserRenderables,
  applyCanonicalSceneDocumentReadModel,
  applyProjectedRenderableBoundsReadModel,
  applyStudioCatalogAuthoringOperation,
  loadStudioGameWorkspaceManifest,
  orbitStudioViewportCamera,
  panStudioViewportCamera,
  refreshStudioGameWorkspaceLiveReadModel,
  recordStudioWorkspaceUiCommand,
  setHierarchyExpansionReadModel,
  studioCatalogAuthoringBaseHash,
  studioSceneAuthoringBaseHash,
  updateStudioRenderSetting,
  updateStudioLightingMode,
  proposeStudioLightAddition,
  zoomStudioViewportCamera,
  type StudioAssetBrowserCategory,
  type StudioApplicationMenu,
  type StudioBottomPanelTab,
  type StudioBounds,
  type StudioGameWorkspaceLoadResult,
  type StudioGameWorkspaceAttachReadModel,
  type StudioGameWorkspaceLiveReadModel,
  type StudioGameWorkspaceReadModel,
  type StudioGameWorkspaceReadout,
  type StudioDevtoolsAttachTransport,
  type StudioFpsGameplayPresetDraft,
  type StudioFpsGameplayPresetDraftField,
  type StudioGeneratedLevelPresetDraft,
  type StudioAshaDemoProductPathReadModel,
  type StudioRunningProjectDiscoveryReadModel,
  type StudioRuntimeSessionInspectionReadModel,
  type StudioAssetInventoryEntryReadModel,
  type StudioAssetInventoryLoadResult,
  type StudioCatalogSourceEvidenceInput,
  type StudioCatalogWorkflowReadModel,
  type StudioPreferencesReadModel,
  type StudioRenderSettingsReadModel,
  type StudioRenderSettingKey,
  type StudioLightingMode,
  type StudioLightingProjectionReadModel,
  type StudioAuthoredLightKind,
  type StudioViewportCameraControlDelta,
  type StudioViewportAdapterReadModel,
  type StudioViewportCameraReadModel,
  type StudioVoxelCoord,
  type StudioViewportHitReadModel,
  type StudioViewportToolMode,
  type StudioViewportToolReadModel,
  type StudioWorkspaceReadModel,
} from '@asha-studio/domain';
import type { SceneObjectId } from '@asha/editor-tools';
import {
  VOXEL_ASSET_EXTENSION,
  VOXEL_ASSET_MEDIA_TYPE,
  VOXEL_ASSET_SCHEMA_VERSION,
  VOXEL_CONVERSION_MESH_IMPORT_MAX_SOURCE_BYTES,
  projectId,
  renderHandle,
  sceneNodeId,
  type CameraSnapshot,
  type CommandBatch,
  type CommandResult,
  type ModelMaterialPreviewRequest,
  type ModelMaterialPreviewSnapshot,
  type PickResult,
  type EntityId,
  type FlatSceneDocument,
  type RenderHandle,
  type RenderFrameDiff,
  type SceneDocumentAuthoringCommand,
  type SceneDocumentAuthoringTarget,
  type SceneObjectCommandResult,
  type SceneObjectSnapshot,
  type SceneLight,
  type SceneNodeRecord,
  type Transform,
  type VoxelCommand,
  type VoxelConversionEvidenceRef,
  type VoxelConversionFitPolicy,
  type VoxelConversionMaterialMap,
  type VoxelConversionMode,
  type VoxelConversionOriginPolicy,
  type VoxelConversionPlan,
  type VoxelConversionPreview,
  type VoxelConversionReceipt,
  type VoxelConversionSettings,
  type VoxelConversionMeshAssetRegistrationRequest,
  type VoxelConversionMeshSourceImportReceipt,
  type VoxelConversionMeshSourceImportRequest,
  type VoxelConversionSourceRegistration,
  type VoxelConversionSourceRegistrationRequest,
  type VoxelConversionSourceRef,
  type VoxelConversionTargetRef,
  type VoxelEditHistoryCursor,
  type VoxelEditHistoryDiagnostic,
  type VoxelEditHistoryDiffSummary,
  type VoxelEditHistoryEntry,
  type VoxelEditHistoryReadRequest,
  type VoxelEditHistoryRedoRequest,
  type VoxelEditHistoryRevertMode,
  type VoxelEditHistoryRevertReceipt,
  type VoxelEditHistoryRevertRequest,
  type VoxelEditHistorySummary,
  type VoxelEditHistoryUndoRequest,
  type VoxelAssetContentHashes,
  type VoxelAssetDiagnostic,
  type VoxelAssetMaterialBinding,
  type VoxelAssetProvenanceKind,
  type VoxelAssetSparseRun,
  type VoxelCoord,
  type VoxelInstancePickResult,
  type VoxelProjectionBindingReceipt,
  type VoxelVolumeAsset,
  type VoxelVolumeAssetExportReceipt,
  type VoxelVolumeAssetExportRequest,
  type VoxelVolumeAssetLoadReceipt,
  type VoxelVolumeAssetLoadRequest,
  type VoxelVolumeAssetPaletteUpdateReceipt,
  type VoxelVolumeAssetPaletteUpdateRequest,
  type VoxelVolumeAssetSaveReceipt,
  type VoxelVolumeAssetSaveRequest,
  type VoxelVolumeAssetStoredDiff,
  type VoxelVolumeAssetUnloadReceipt,
  type VoxelVolumeAssetUnloadRequest,
  type VoxelVolumeAuthoringInitializeReceipt,
  type VoxelVolumeAuthoringInitializeRequest,
  type VoxelAnnotationEditOperation,
  type VoxelAnnotationEditReceipt,
  type VoxelAnnotationKind,
  type VoxelAnnotationLayerDraft,
  type VoxelAnnotationLayerExportReceipt,
  type VoxelAnnotationLayerLoadReceipt,
  type VoxelAnnotationQueryReadout,
  type VoxelAnnotationRegion,
  type VoxelAnnotationSparseRun,
  type VoxelModelInfoReadout,
  type VoxelModelInfoRequest,
  type VoxelModelWindowReadout,
  type VoxelModelWindowRequest,
  type VoxelSelectionSnapshot,
} from '@asha/contracts';
import {
  retainStudioWorkspaceProjection,
  type StudioWorkspaceProjectionDelivery,
} from './workspace-projection-delivery.js';
import {
  appendStudioWorkspaceProjectionSample,
  buildStudioWorkspaceProjectionPerformanceReadModel,
  type StudioWorkspaceProjectionRenderSample,
  type StudioWorkspaceProjectionTiming,
} from './workspace-projection-performance.js';
import {
  buildStudioVoxelProjectionBindingPlan,
  buildStudioVoxelRendererPickEvidence,
  voxelInstanceId,
} from './voxel-instance-authoring.js';
import {
  persistStudioWorkspaceAuthoringCandidate,
  type StudioHostFilePromotion,
  type StudioHostFileStage,
} from './workspace-authoring-save.js';

export {
  persistStudioWorkspaceAuthoringCandidate,
  type StudioHostFilePromotion,
  type StudioHostFileStage,
  type StudioWorkspaceAuthoringSaveRequest,
  type StudioWorkspaceAuthoringSaveResult,
} from './workspace-authoring-save.js';

import type { AshaGameAssetCatalog, AshaGameAssetCatalogEntry, AshaGameAssetKind } from '@asha/game-workspace';
import type {
  NativeBrowserHostProviderScope,
  NativeBrowserHostRuntimeBridge,
} from '@asha/browser-host';
import {
  NATIVE_RUST_RUNTIME_BRIDGE_PROVIDER_GLOBALS,
  NATIVE_RUST_RUNTIME_BRIDGE_PROVIDER_KIND,
  RuntimeBridgeError,
  createRuntimeSessionFacade,
  createWorkspaceAuthoringFacade,
  resolveNativeRustRuntimeBridgeProvider,
  type CameraCreateRequest,
  type ProjectBundleLoadRequest,
  type RuntimeBridge,
  type RuntimeBufferHandle,
  type VoxelMeshEvidenceSnapshot,
} from '@asha/runtime-bridge';
import type {
  CombatFeedbackProjection,
  EncounterDirectorReadout,
  GeneratedTunnelReadout,
  NavProjectionReadout,
  RuntimeSessionAutonomousPolicyTickReadout,
  RuntimeSessionEncounterTransitionReceipt,
  RuntimeSessionFacade,
  RuntimeSessionGeneratedTunnelOperationReceipt,
  RuntimeSessionLifecycleRestartReceipt,
  RuntimeSessionLifecycleStatusReadout,
  RuntimeSessionProjectionSummary,
  RuntimeSessionStateSummary,
  RuntimeSessionTelemetrySummary,
  WorkspaceAuthoringFacade,
  WorkspaceAuthoringStateSummary,
} from '@asha/runtime-session';

import type {
  VoxelConversionApplyCommandInput,
  VoxelConversionEvidenceExportInput,
  VoxelConversionPlanCommandInput,
  VoxelConversionPreviewCommandInput,
} from '@asha/command-registry';
import {
  buildStudioVoxelConversionApplyProposal,
  buildStudioVoxelConversionEvidenceExportProposal,
  buildStudioVoxelConversionPlanProposal,
  buildStudioVoxelConversionPreviewProposal,
  buildStudioVoxelConversionReadoutModel,
  buildStudioVoxelConversionWorkspaceReadModel,
  type StudioVoxelConversionCommandId,
  type StudioVoxelConversionEvidenceReadout,
  type StudioVoxelConversionProposalResult,
  type StudioVoxelConversionReadoutModel,
  type StudioVoxelConversionWorkspaceReadModel,
} from '@asha-studio/voxel-conversion';

export {
  buildStudioVoxelProjectionBindingPlan,
  buildStudioVoxelRendererPickEvidence,
  voxelInstanceId,
  worldTransformForSceneNode,
} from './voxel-instance-authoring.js';
export {
  compactStudioWorkspaceProjectionFrame,
  retainStudioWorkspaceProjection,
  type StudioWorkspaceProjectionDelivery,
  type StudioWorkspaceProjectionDeliveryMetrics,
} from './workspace-projection-delivery.js';
export {
  appendStudioWorkspaceProjectionSample,
  buildStudioWorkspaceProjectionPerformanceReadModel,
  type StudioWorkspaceProjectionPerformanceReadModel,
  type StudioWorkspaceProjectionRenderSample,
  type StudioWorkspaceProjectionTiming,
} from './workspace-projection-performance.js';

// The compatibility marker is browser-visible metadata installed by
// @asha/browser-host. Provider identity comes from the browser-safe public
// RuntimeBridge contract; importing the package's Node host implementation here
// would pull node:http and node:fs into the Angular application.
const ASHA_BROWSER_HOST_COMPATIBILITY_VERSION = 'browser-host.v0' as const;
const ASHA_BROWSER_HOST_PROVIDER_GLOBAL = NATIVE_RUST_RUNTIME_BRIDGE_PROVIDER_GLOBALS[0];
const ASHA_BROWSER_HOST_PROVIDER_KIND = NATIVE_RUST_RUNTIME_BRIDGE_PROVIDER_KIND;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const EMPTY_VOXEL_CONVERSION_AUTHORITY_STATE: StudioVoxelConversionAuthorityState = {
  plan: null,
  preview: null,
  receipt: null,
  evidence: [],
};

const DEFAULT_VOXEL_ASSET_WORKFLOW_CONTROL: StudioVoxelAssetWorkflowControlReadModel = {
  controlVersion: 'studio-voxel-asset-workflow-control.v0',
  lastAction: null,
  status: 'idle',
  message: 'No voxel asset workflow action has run.',
  targetAssetId: 'voxel-volume/generated',
  targetProjectBundle: 'asha-project',
  targetAssetPath: 'assets/voxels/generated.avxl.json',
  residentModelId: null,
  volumeAssetId: null,
  voxelCount: null,
  materialSummary: 'no material readback',
  canonicalJsonHash: null,
  voxelDataHash: null,
  validationDiagnosticCodes: [],
  canLoadLastAsset: false,
  lastAssetId: null,
  lastAsset: null,
};

const DEFAULT_VOXEL_ASSET_WORKFLOW_TARGET_DRAFT: StudioVoxelAssetWorkflowTargetDraft = {
  targetProjectBundle: null,
  targetAssetPath: null,
};

const DEFAULT_VOXEL_TRANSCRIPT_DRAFT = JSON.stringify({
  artifactKind: 'studio_agent_voxel_operation_transcript',
  artifactVersion: 'studio-agent-voxel-operation-transcript.v0',
  producer: { kind: 'agent', id: 'external-agent' },
  target: { studioSurfaceVersion: 'studio-agent-voxel-workflow.v0' },
  operations: [
    { operationId: 'inspect-current-voxel-workspace', kind: 'inspect', input: {} },
  ],
  nonClaims: [
    'not_vforge_file',
    'not_mcp_transport',
    'not_raw_runtime_bridge_dispatch',
    'not_runtime_authority',
    'not_private_studio_state_mutation',
  ],
}, null, 2);

const DEFAULT_VOXEL_MATERIAL_PALETTE_EDITOR: StudioVoxelMaterialPaletteEditorReadModel = {
  controlVersion: 'studio-voxel-material-palette-editor.v0',
  status: 'idle',
  message: 'Export or save a voxel asset before editing its material palette.',
  selectedPaletteEntryId: '',
  paletteEntryId: '',
  displayName: '',
  materialAssetId: '',
  materialCatalogBindingId: '',
  diagnostics: [],
  receipt: null,
};

const DEFAULT_VOXEL_COMPACT_EDIT_CONTROL: StudioVoxelCompactEditControlReadModel = {
  controlVersion: 'studio-voxel-compact-edit-control.v0',
  draftAction: 'block',
  lastAction: null,
  status: 'idle',
  message: 'Compact voxel edit controls ready.',
  grid: 1,
  x1: 0,
  y1: 0,
  z1: 0,
  x2: 1,
  y2: 1,
  z2: 0,
  material: 1,
  boxMode: 'filled',
  lineRadius: 0,
  maxGeneratedVoxels: 64,
  preflightAction: 'block',
  preflightAccepted: true,
  preflightGeneratedCommandCount: 1,
  preflightDiagnostic: null,
  generatedCommandCount: null,
  acceptedCommandCount: null,
  rejectedCommandCount: null,
  diagnostic: null,
};

const DEFAULT_VOXEL_HISTORY_CONTROL: StudioVoxelHistoryControlState = {
  controlVersion: 'studio-voxel-history-control.v0',
  historyId: 'history/default',
  cursorId: null,
  targetTransactionId: null,
  targetCursorId: null,
  targetCursorIndex: null,
  maxEntries: 12,
  maxReplaySteps: 64,
  maxDiffVoxels: 256,
  includeRedoTail: true,
  includeSampleWindow: false,
  lastAction: null,
  status: 'idle',
  message: 'Voxel history panel ready.',
  diagnostic: null,
  summary: null,
  receipt: null,
};

const DEFAULT_VOXEL_ANNOTATION_CONTROL: StudioVoxelAnnotationControlReadModel = {
  controlVersion: 'studio-voxel-annotation-control.v0',
  status: 'idle',
  message: 'Export or save a voxel volume asset before loading an annotation layer.',
  layerId: 'voxel-annotation/studio-layer',
  runtimeLayerId: null,
  expectedLayerHash: null,
  regionId: 'region/studio-selection',
  label: 'Studio selection',
  kind: 'selection',
  tags: 'studio',
  parentRegionId: '',
  x1: 0,
  y1: 0,
  z1: 0,
  x2: 0,
  y2: 0,
  z2: 0,
  diagnostics: [],
  query: null,
  editReceipt: null,
  exportReceipt: null,
  canSubmit: false,
  readoutHash: 'studio-voxel-annotation-control-draft',
};

export interface StudioRuntimeViewportEvidence {
  readonly kind: 'studio_runtime_viewport_evidence.v0';
  readonly status: 'missing_runtime' | 'healthy' | 'degraded';
  readonly camera: CameraSnapshot | null;
  readonly scene: SceneObjectSnapshot | null;
  readonly materialPreview: ModelMaterialPreviewSnapshot | null;
  readonly voxelMesh: VoxelMeshEvidenceSnapshot | null;
  readonly voxelPick: PickResult | null;
  readonly voxelSelection: VoxelSelectionSnapshot | null;
  readonly projectionPick: {
    readonly handle: RenderHandle;
    readonly sourceEntity: EntityId | null;
    readonly position: readonly [number, number, number];
    readonly normal: readonly [number, number, number];
  } | null;
  readonly sceneCommand: SceneObjectCommandResult | null;
  readonly bufferLifetime: {
    readonly handle: number;
    readonly byteLength: number;
    readonly released: boolean;
  } | null;
  readonly diagnostics: readonly string[];
}

const MISSING_RUNTIME_VIEWPORT_EVIDENCE: StudioRuntimeViewportEvidence = {
  kind: 'studio_runtime_viewport_evidence.v0',
  status: 'missing_runtime',
  camera: null,
  scene: null,
  materialPreview: null,
  voxelMesh: null,
  voxelPick: null,
  voxelSelection: null,
  projectionPick: null,
  sceneCommand: null,
  bufferLifetime: null,
  diagnostics: ['Attach the public RuntimeSession to inspect current runtime projection.'],
};

export interface StudioProjectFileEntry {
  readonly path: string;
  readonly name: string;
  readonly kind: 'file' | 'directory';
  readonly size: number | null;
  readonly mtimeMs: number | null;
}

export type StudioSceneFileDialogMode = 'open' | 'save-as';

export type StudioHostFileResourceKind = 'scene' | 'voxel-asset';

export interface StudioHostFileDialogIntent {
  readonly operation: StudioSceneFileDialogMode;
  readonly resourceKind: StudioHostFileResourceKind;
  readonly title: string;
  readonly fileTypeLabel: string;
  readonly acceptedExtensions: readonly string[];
  readonly initialDirectory: string;
  readonly initialFileName: string;
  readonly confirmation: 'open-scene' | 'save-scene-as' | 'open-voxel-asset' | 'save-voxel-asset-as';
  readonly dirtyPolicy: 'scene-and-voxel-authoring' | 'voxel-authoring' | 'none';
}

export interface StudioHostFileDialogResult {
  readonly operation: StudioSceneFileDialogMode;
  readonly resourceKind: StudioHostFileResourceKind;
  readonly path: string;
  readonly status: 'accepted' | 'rejected';
  readonly message: string;
}

export interface StudioProjectFileDialogReadModel {
  readonly backend: 'host-server';
  readonly mode: StudioSceneFileDialogMode | null;
  readonly intent: StudioHostFileDialogIntent | null;
  readonly resourceKind: StudioHostFileResourceKind | null;
  readonly title: string;
  readonly fileTypeLabel: string;
  readonly acceptedExtensions: readonly string[];
  readonly connected: boolean;
  readonly startDirectory: string | null;
  readonly currentDir: string;
  readonly directoryPath: string;
  readonly entries: readonly StudioProjectFileEntry[];
  readonly selectedPath: string | null;
  readonly fileName: string;
  readonly targetPath: string;
  readonly canConfirm: boolean;
  readonly message: string;
  readonly lastResult: StudioHostFileDialogResult | null;
}

export interface StudioUnsavedScenePromptReadModel {
  readonly action: 'new' | 'open' | 'open-voxel-asset';
  readonly path: string | null;
  readonly message: string;
}

export interface StudioSceneFileConflictReadModel {
  readonly path: string;
  readonly expectedHash: string | null;
  readonly actualHash: string | null;
  readonly canonicalJson: string;
  readonly document: FlatSceneDocument;
}

export interface StudioVoxelConversionWorkspaceShellRegion {
  readonly id: 'source' | 'settings' | 'preview' | 'diagnostics' | 'timeline' | 'evidence';
  readonly label: string;
  readonly status: string;
  readonly disabled: boolean;
  readonly message: string;
}

export interface StudioVoxelConversionWorkspaceShellAction {
  readonly commandId: StudioVoxelConversionCommandId;
  readonly label: string;
  readonly disabled: boolean;
  readonly accepted: boolean;
  readonly reason: string;
}

export interface StudioVoxelConversionSourceOption {
  readonly assetId: string;
  readonly label: string;
  readonly kind: string;
  readonly sourcePath: string;
  readonly sourceHash: string | null;
  readonly devCacheKey: string | null;
  readonly importStatus: string | null;
  readonly publishOutputKey: string | null;
  readonly packedHash: string | null;
  readonly packedBytes: number | null;
  readonly dependencies: readonly string[];
  readonly referencedRenderableIds: readonly string[];
  readonly supported: boolean;
  readonly selected: boolean;
}

export interface StudioVoxelConversionSettingsDraftReadModel {
  readonly selectedSourceAssetId: string | null;
  readonly mode: VoxelConversionMode;
  readonly fitPolicy: VoxelConversionFitPolicy;
  readonly originPolicy: VoxelConversionOriginPolicy;
  readonly resolution: readonly [number, number, number];
  readonly voxelSize: number;
  readonly maxOutputVoxels: number;
  readonly transformScale: number;
  readonly transformTranslation: readonly [number, number, number];
  readonly targetGrid: number;
  readonly targetVolumeAssetId: string;
  readonly targetOrigin: readonly [number, number, number];
  readonly meshPrimitive: string | null;
  readonly materialMap: VoxelConversionMaterialMap;
}

export interface StudioVoxelConversionWorkspaceShellState {
  readonly id: 'empty_inputs' | 'missing_capability' | 'ready';
  readonly label: string;
  readonly active: boolean;
  readonly status: string;
  readonly message: string;
}

export interface StudioVoxelConversionPreviewState {
  readonly id: 'unavailable' | 'projection_only' | 'stale';
  readonly label: string;
  readonly active: boolean;
  readonly message: string;
}

export interface StudioVoxelConversionMaterialReadout {
  readonly sourceMaterialSlot: number;
  readonly sourceMaterialId: string | null;
  readonly voxelMaterial: number;
  readonly samplingStatus: 'flat_material' | 'texture_sampled';
  readonly textureAssetId: string | null;
  readonly textureContentHash: string | null;
  readonly uvAttributeName: string | null;
  readonly uvAttributeHash: string | null;
  readonly sampleUv: readonly [number, number] | null;
  readonly samplingPolicy: string | null;
  readonly wrapPolicy: string | null;
  readonly materialMode: string | null;
}

export interface StudioVoxelConversionPreviewProjectionReadModel {
  readonly status: 'unavailable' | 'projection_only' | 'stale';
  readonly viewportLabel: string;
  readonly inputReadoutHash: string;
  readonly previewHash: string | null;
  readonly outputVoxelCount: number | null;
  readonly outputBoundsLabel: string;
  readonly materialMapStatus: string;
  readonly materialRows: readonly StudioVoxelConversionMaterialReadout[];
  readonly states: readonly StudioVoxelConversionPreviewState[];
}

export interface StudioVoxelConversionSourceMetadataReadModel {
  readonly selectedSourceAssetId: string | null;
  readonly sourcePath: string | null;
  readonly sourceHash: string | null;
  readonly importStatus: string | null;
  readonly publishOutputKey: string | null;
  readonly packedHash: string | null;
  readonly packedBytes: number | null;
  readonly dependencyCount: number;
  readonly referencedRenderableCount: number;
  readonly meshPrimitive: string | null;
  readonly materialMapEntryCount: number;
  readonly knownMaterialSlotCount: number | null;
  readonly transformScale: number;
  readonly transformTranslation: readonly [number, number, number];
  readonly missingPublicFields: readonly string[];
  readonly readoutHash: string;
}

export interface StudioVoxelConversionTimelineRow {
  readonly commandId: StudioVoxelConversionCommandId;
  readonly label: string;
  readonly status: string;
  readonly proposalAccepted: boolean;
  readonly evidenceCount: number;
  readonly diagnosticCodes: readonly string[];
  readonly message: string;
}

export interface StudioVoxelConversionEvidenceRow {
  readonly source: StudioVoxelConversionEvidenceReadout['source'] | 'workspace';
  readonly kind: string;
  readonly uri: string;
  readonly contentHash: string;
  readonly status: 'available' | 'missing';
}

export interface StudioVoxelConversionWorkspaceShellReadModel {
  readonly shellVersion: 'voxel-conversion-shell.v0';
  readonly workspace: StudioVoxelConversionWorkspaceReadModel;
  readonly readout: StudioVoxelConversionReadoutModel;
  readonly sourceOptions: readonly StudioVoxelConversionSourceOption[];
  readonly settingsDraft: StudioVoxelConversionSettingsDraftReadModel;
  readonly planProposal: StudioVoxelConversionProposalResult<unknown>;
  readonly previewProposal: StudioVoxelConversionProposalResult<unknown>;
  readonly applyProposal: StudioVoxelConversionProposalResult<unknown>;
  readonly exportProposal: StudioVoxelConversionProposalResult<unknown>;
  readonly previewProjection: StudioVoxelConversionPreviewProjectionReadModel;
  readonly sourceMetadata: StudioVoxelConversionSourceMetadataReadModel;
  readonly commandTimeline: readonly StudioVoxelConversionTimelineRow[];
  readonly evidenceRows: readonly StudioVoxelConversionEvidenceRow[];
  readonly states: readonly StudioVoxelConversionWorkspaceShellState[];
  readonly regions: readonly StudioVoxelConversionWorkspaceShellRegion[];
  readonly actions: readonly StudioVoxelConversionWorkspaceShellAction[];
  readonly authoringAvailable: boolean;
  readonly shellHash: string;
}

export interface StudioVoxelConversionAuthorityState {
  readonly plan: VoxelConversionPlan | null;
  readonly preview: VoxelConversionPreview | null;
  readonly receipt: VoxelConversionReceipt | null;
  readonly evidence: readonly VoxelConversionEvidenceRef[];
}

export interface StudioVoxelConversionSettingsDraft {
  readonly selectedSourceAssetId: string | null;
  readonly mode: VoxelConversionMode;
  readonly fitPolicy: VoxelConversionFitPolicy;
  readonly originPolicy: VoxelConversionOriginPolicy;
  readonly resolution: readonly [number, number, number];
  readonly voxelSize: number;
  readonly maxOutputVoxels: number;
  readonly transformScale: number;
  readonly transformTranslation: readonly [number, number, number];
  readonly targetGrid: number;
  readonly targetVolumeAssetId: string;
  readonly targetOrigin: readonly [number, number, number];
  readonly meshPrimitive: string | null;
  readonly materialMap: VoxelConversionMaterialMap;
}

export interface StudioImportedVoxelConversionSource {
  readonly source: VoxelConversionMeshSourceImportReceipt['source'];
  readonly sourcePath: string;
  readonly sourceByteCount: number;
  readonly groupCount: number;
  readonly materialSlotCount: number;
}

export type StudioAgentVoxelWorkflowOperationKind =
  | 'inspect'
  | 'register_conversion_source'
  | 'register_conversion_mesh_asset'
  | 'import_conversion_mesh_source'
  | 'configure_conversion'
  | 'run_conversion'
  | 'get_model_info'
  | 'get_model_window'
  | 'export_voxel_volume_asset'
  | 'save_voxel_volume_asset'
  | 'load_voxel_volume_asset'
  | 'unload_voxel_volume_asset'
  | 'initialize_voxel_volume_authoring'
  | 'view_from_angle'
  | 'publish_preview'
  | 'persist_voxel_asset'
  | 'reopen_voxel_asset'
  | 'submit_voxel_edit'
  | 'submit_compact_voxel_edit';
export type StudioAgentVoxelWorkflowResultOperation =
  | StudioAgentVoxelWorkflowOperationKind
  | 'unsupported_operation';

export interface StudioAgentVoxelConversionSettingsPatch {
  readonly sourceAssetId?: string | null;
  readonly mode?: VoxelConversionMode;
  readonly fitPolicy?: VoxelConversionFitPolicy;
  readonly originPolicy?: VoxelConversionOriginPolicy;
  readonly resolution?: readonly [number, number, number];
  readonly voxelSize?: number;
  readonly maxOutputVoxels?: number;
  readonly transformScale?: number;
  readonly transformTranslation?: readonly [number, number, number];
  readonly targetGrid?: number;
  readonly targetVolumeAssetId?: string;
  readonly targetOrigin?: readonly [number, number, number];
  readonly meshPrimitive?: string | null;
  readonly materialSourceSlot?: number;
  readonly materialSourceId?: string | null;
  readonly materialVoxelId?: number;
  readonly defaultMaterial?: string;
}

export interface StudioAgentVoxelPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface StudioAgentVoxelWrite {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly i: number;
}

export interface StudioAgentVoxelRun {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly z: number;
  readonly i: number;
}

export type StudioAgentVoxelPrimitive =
  | {
      readonly kind: 'block';
      readonly at: StudioAgentVoxelPoint;
      readonly palette_index: number;
    }
  | {
      readonly kind: 'box';
      readonly from: StudioAgentVoxelPoint;
      readonly to: StudioAgentVoxelPoint;
      readonly palette_index: number;
      readonly mode?: 'filled' | 'shell' | 'edges';
    }
  | {
      readonly kind: 'line';
      readonly from: StudioAgentVoxelPoint;
      readonly to: StudioAgentVoxelPoint;
      readonly palette_index: number;
      readonly radius?: number;
    };

export type StudioAgentCompactVoxelEdit =
  | {
      readonly kind: 'set_voxels';
      readonly grid?: number;
      readonly voxels: readonly StudioAgentVoxelWrite[];
    }
  | {
      readonly kind: 'set_voxels_runs';
      readonly grid?: number;
      readonly runs: readonly StudioAgentVoxelRun[];
    }
  | {
      readonly kind: 'fill_box';
      readonly grid?: number;
      readonly x1: number;
      readonly y1: number;
      readonly z1: number;
      readonly x2: number;
      readonly y2: number;
      readonly z2: number;
      readonly palette_index: number;
    }
  | {
      readonly kind: 'apply_voxel_primitives';
      readonly grid?: number;
      readonly primitives: readonly StudioAgentVoxelPrimitive[];
      readonly maxGeneratedVoxels?: number;
    };

export interface StudioAgentCompactVoxelEditCompileResult {
  readonly accepted: boolean;
  readonly diagnostic: string | null;
  readonly batch: CommandBatch | null;
  readonly affordance: StudioAgentCompactVoxelEdit['kind'];
  readonly generatedVoxelCount: number;
}

export type StudioAgentVoxelViewAngle =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'isometric';

export interface StudioAgentVoxelViewFromAngleRequest {
  readonly angle: StudioAgentVoxelViewAngle;
  readonly target?: 'selected' | 'scene';
}

export interface StudioAgentVoxelViewCaptureReadModel {
  readonly captureVersion: 'studio-agent-voxel-view-capture.v0';
  readonly angle: StudioAgentVoxelViewAngle;
  readonly target: 'selected' | 'scene';
  readonly targetRenderableId: string | null;
  readonly sessionId: string;
  readonly sceneHash: string;
  readonly readbackMarker: string;
  readonly camera: StudioViewportCameraReadModel;
  readonly viewport: {
    readonly cameraHash: string;
    readonly readbackHash: string;
    readonly selectedRenderableId: string | null;
  };
  readonly evidenceKind: 'projection_view_readout';
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_hardware_gpu_capture',
    'not_voxelforge_viewer',
    'not_browser_screenshot',
  ];
  readonly captureHash: string;
}

export interface StudioAgentVoxelPreviewPublicationRequest {
  readonly artifactPath?: string;
  readonly label?: string;
}

export interface StudioAgentVoxelPreviewPublicationReadModel {
  readonly artifactKind: 'studio_agent_voxel_preview_publication';
  readonly artifactVersion: 'studio-agent-voxel-preview-publication.v0';
  readonly label: string;
  readonly artifactPath: string;
  readonly sessionId: string;
  readonly sceneHash: string;
  readonly readbackMarker: string;
  readonly conversion: {
    readonly readoutHash: string;
    readonly status: string;
    readonly authorityPosture: string;
    readonly outputVoxelCount: number | null;
    readonly outputBoundsLabel: string;
    readonly evidenceKinds: readonly string[];
    readonly sourceEvidenceRefs: readonly {
      readonly source: string;
      readonly kind: string;
      readonly uri: string;
      readonly contentHash: string;
    }[];
  };
  readonly viewport: {
    readonly cameraHash: string;
    readonly readbackHash: string;
    readonly selectedRenderableId: string | null;
  };
  readonly nonClaims: readonly [
    'not_vforge_file',
    'not_runtime_authority',
    'not_hardware_gpu_capture',
    'not_arbitrary_filesystem_write',
  ];
  readonly publicationHash: string;
}

export type StudioAgentVoxelAssetPersistenceSource =
  | {
      readonly kind: 'conversion_preview';
      readonly modelInfo?: VoxelModelInfoReadout | null;
    }
  | {
      readonly kind: 'command_batch';
      readonly batch: CommandBatch;
    };

export interface StudioAgentVoxelAssetPersistenceRequest {
  readonly source: StudioAgentVoxelAssetPersistenceSource;
  readonly assetId: string;
  readonly artifactPath?: string;
  readonly label?: string;
}

export interface StudioAgentVoxelAssetReopenRequest {
  readonly asset: VoxelVolumeAsset;
  readonly artifactPath?: string;
  readonly expectedAssetId?: string;
  readonly expectedCanonicalJsonHash?: string;
}

export interface StudioAgentVoxelAssetPersistenceReadModel {
  readonly artifactKind: 'studio_agent_voxel_asset_persistence';
  readonly artifactVersion: 'studio-agent-voxel-asset-persistence.v0';
  readonly artifactPath: string;
  readonly label: string;
  readonly storage: {
    readonly extension: string;
    readonly mediaType: string;
    readonly schemaVersion: number;
    readonly assetPlane: 'ProjectBundle';
    readonly runtimePromotion: 'explicit_runtime_to_stored_export';
  };
  readonly source: {
    readonly kind: 'conversion_preview' | 'command_batch';
    readonly outputVoxelCount: number;
    readonly boundsLabel: string;
    readonly evidenceKinds: readonly string[];
  };
  readonly asset: VoxelVolumeAsset;
  readonly serializedAsset: string;
  readonly validation: {
    readonly posture: 'studio_shape_check_engine_authority_required';
    readonly authority: 'svc-voxel-asset';
    readonly diagnostics: readonly VoxelAssetDiagnostic[];
  };
  readonly nonClaims: readonly [
    'not_vforge_file',
    'not_runtime_authority',
    'not_engine_validation',
    'not_silent_sessionstate_promotion',
    'not_arbitrary_filesystem_write',
  ];
  readonly persistenceHash: string;
}

export interface StudioAgentVoxelAssetReopenReadModel {
  readonly artifactKind: 'studio_agent_voxel_asset_reopen';
  readonly artifactVersion: 'studio-agent-voxel-asset-reopen.v0';
  readonly artifactPath: string;
  readonly assetId: string;
  readonly mediaType: string;
  readonly schemaVersion: number;
  readonly reopenedHash: string;
  readonly expectedHash: string | null;
  readonly roundTripMatches: boolean;
  readonly voxelCount: number;
  readonly boundsLabel: string;
  readonly validationDiagnostics: readonly VoxelAssetDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_engine_validation',
    'not_vforge_file',
  ];
}

export interface StudioAgentVoxelVolumeExportReadModel {
  readonly artifactKind: 'studio_agent_voxel_volume_export';
  readonly artifactVersion: 'studio-agent-voxel-volume-export.v0';
  readonly request: VoxelVolumeAssetExportRequest;
  readonly exported: boolean;
  readonly asset: VoxelVolumeAsset | null;
  readonly assetId: string | null;
  readonly mediaType: string | null;
  readonly schemaVersion: number | null;
  readonly voxelCount: number | null;
  readonly boundsLabel: string | null;
  readonly materialPalette: readonly VoxelAssetMaterialBinding[];
  readonly provenanceKinds: readonly VoxelAssetProvenanceKind[];
  readonly canonicalJsonHash: string | null;
  readonly voxelDataHash: string | null;
  readonly validationDiagnosticCodes: readonly string[];
  readonly serializedAsset: string | null;
  readonly fullAssetPayload: boolean;
  readonly nonClaims: readonly [
    'not_vforge_file',
    'not_preview_sample_export',
    'not_silent_sessionstate_promotion',
    'not_arbitrary_filesystem_write',
  ];
  readonly exportHash: string;
}

export interface StudioAgentVoxelVolumeSaveReadModel {
  readonly artifactKind: 'studio_agent_voxel_volume_save';
  readonly artifactVersion: 'studio-agent-voxel-volume-save.v0';
  readonly request: VoxelVolumeAssetSaveRequest;
  readonly saved: boolean;
  readonly diff: VoxelVolumeAssetStoredDiff | null;
  readonly asset: VoxelVolumeAsset | null;
  readonly assetId: string | null;
  readonly assetPath: string;
  readonly projectBundle: string;
  readonly operation: string | null;
  readonly previousCanonicalJsonHash: string | null;
  readonly nextCanonicalJsonHash: string | null;
  readonly nextVoxelDataHash: string | null;
  readonly expectedCanonicalJsonHash: string | null;
  readonly expectedVoxelDataHash: string | null;
  readonly sparseRunCount: number | null;
  readonly voxelCount: number | null;
  readonly materialCount: number | null;
  readonly provenanceCount: number | null;
  readonly runtimeSessionHash: string | null;
  readonly validationDiagnosticCodes: readonly string[];
  readonly serializedAsset: string | null;
  readonly fullAssetPayload: boolean;
  readonly nonClaims: readonly [
    'not_vforge_file',
    'not_browser_local_storage_save',
    'not_silent_sessionstate_promotion',
    'not_arbitrary_filesystem_write',
  ];
  readonly saveHash: string;
}

export interface StudioAgentVoxelVolumeLoadReadModel {
  readonly artifactKind: 'studio_agent_voxel_volume_load';
  readonly artifactVersion: 'studio-agent-voxel-volume-load.v0';
  readonly requestAssetId: string;
  readonly loaded: boolean;
  readonly modelId: string;
  readonly volumeAssetId: string | null;
  readonly grid: number;
  readonly boundsLabel: string | null;
  readonly voxelCount: number;
  readonly materialCounts: readonly { readonly material: number; readonly voxelCount: number }[];
  readonly provenanceKinds: readonly VoxelAssetProvenanceKind[];
  readonly canonicalJsonHash: string | null;
  readonly voxelDataHash: string | null;
  readonly sessionHash: string;
  readonly replayHash: string;
  readonly validationDiagnosticCodes: readonly string[];
  readonly nonClaims: readonly [
    'not_vforge_file',
    'not_studio_json_promotion',
    'not_silent_projectbundle_mutation',
  ];
  readonly loadHash: string;
}

export interface StudioAgentVoxelMeshSourceImportReadModel {
  readonly artifactKind: 'studio_agent_voxel_mesh_source_import';
  readonly artifactVersion: 'studio-agent-voxel-mesh-source-import.v0';
  readonly sourceAssetId: string;
  readonly imported: boolean;
  readonly sourcePath: string;
  readonly format: string;
  readonly sourceByteCount: number;
  readonly sourceHash: string;
  readonly meshAssetId: string | null;
  readonly sourceBounds: VoxelConversionMeshSourceImportReceipt['sourceBounds'];
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly groupCount: number;
  readonly materialSlotCount: number;
  readonly evidenceKinds: readonly string[];
  readonly diagnosticCodes: readonly string[];
  readonly nonClaims: readonly [
    'not_studio_mesh_parsing',
    'not_browser_filesystem_import',
    'not_raw_runtime_bridge_dispatch',
  ];
  readonly importHash: string;
}

export interface StudioAgentVoxelVolumeUnloadReadModel {
  readonly artifactKind: 'studio_agent_voxel_volume_unload';
  readonly artifactVersion: 'studio-agent-voxel-volume-unload.v0';
  readonly grid: number;
  readonly volumeAssetId: string | null;
  readonly unloaded: boolean;
  readonly modelId: string;
  readonly removedVoxelCount: number;
  readonly sessionHash: string;
  readonly replayHash: string;
  readonly diagnosticCodes: readonly string[];
  readonly nonClaims: readonly [
    'not_projectbundle_asset_delete',
    'not_browser_local_storage_delete',
    'not_raw_runtime_bridge_dispatch',
  ];
  readonly unloadHash: string;
}

export type StudioAgentVoxelWorkflowOperation =
  | { readonly kind: 'inspect' }
  | { readonly kind: 'register_conversion_source'; readonly registration: VoxelConversionSourceRegistrationRequest }
  | { readonly kind: 'register_conversion_mesh_asset'; readonly registration: VoxelConversionMeshAssetRegistrationRequest }
  | { readonly kind: 'import_conversion_mesh_source'; readonly importRequest: VoxelConversionMeshSourceImportRequest }
  | { readonly kind: 'configure_conversion'; readonly patch: StudioAgentVoxelConversionSettingsPatch }
  | { readonly kind: 'run_conversion'; readonly commandId: StudioVoxelConversionCommandId }
  | { readonly kind: 'get_model_info'; readonly request: VoxelModelInfoRequest }
  | { readonly kind: 'get_model_window'; readonly request: VoxelModelWindowRequest }
  | { readonly kind: 'export_voxel_volume_asset'; readonly exportRequest: VoxelVolumeAssetExportRequest }
  | { readonly kind: 'save_voxel_volume_asset'; readonly saveRequest: VoxelVolumeAssetSaveRequest }
  | { readonly kind: 'load_voxel_volume_asset'; readonly loadRequest: VoxelVolumeAssetLoadRequest }
  | { readonly kind: 'unload_voxel_volume_asset'; readonly unloadRequest: VoxelVolumeAssetUnloadRequest }
  | { readonly kind: 'initialize_voxel_volume_authoring'; readonly initializeRequest: VoxelVolumeAuthoringInitializeRequest }
  | { readonly kind: 'view_from_angle'; readonly view: StudioAgentVoxelViewFromAngleRequest }
  | { readonly kind: 'publish_preview'; readonly publication?: StudioAgentVoxelPreviewPublicationRequest }
  | { readonly kind: 'persist_voxel_asset'; readonly persistence: StudioAgentVoxelAssetPersistenceRequest }
  | { readonly kind: 'reopen_voxel_asset'; readonly reopen: StudioAgentVoxelAssetReopenRequest }
  | { readonly kind: 'submit_voxel_edit'; readonly batch: CommandBatch }
  | { readonly kind: 'submit_compact_voxel_edit'; readonly edit: StudioAgentCompactVoxelEdit };

export interface StudioAgentVoxelWorkflowSurfaceReadModel {
  readonly surfaceVersion: 'studio-agent-voxel-workflow.v0';
  readonly supportedOperations: readonly StudioAgentVoxelWorkflowOperationKind[];
  readonly runtime: {
    readonly attachState: string;
    readonly sessionHash: string | null;
    readonly acceptedCommandCount: number | null;
    readonly rejectedCommandCount: number | null;
  };
  readonly authoring: {
    readonly available: boolean;
    readonly generation: number | null;
    readonly workingRevision: number | null;
    readonly storedRevision: number | null;
    readonly dirty: boolean;
    readonly lifecycleHash: string | null;
  };
  readonly conversion: {
    readonly shellHash: string;
    readonly readoutHash: string;
    readonly status: string;
    readonly authorityPosture: string;
    readonly actionStates: readonly {
      readonly commandId: StudioVoxelConversionCommandId;
      readonly accepted: boolean;
      readonly disabled: boolean;
    }[];
    readonly evidenceKinds: readonly string[];
    readonly outputVoxelCount: number | null;
    readonly outputBoundsLabel: string;
    readonly diagnostics: readonly string[];
  };
  readonly voxelEdit: {
    readonly commandMessageType: 'command.propose';
    readonly supportedCommandOps: readonly ['setVoxel'];
    readonly compactAffordances: readonly StudioAgentCompactVoxelEdit['kind'][];
    readonly maxCommands: number;
    readonly coordinateAbsLimit: number;
    readonly authoringAvailable: boolean;
  };
  readonly viewCapture: {
    readonly supportedAngles: readonly StudioAgentVoxelViewAngle[];
    readonly cameraHash: string;
    readonly readbackHash: string;
    readonly selectedRenderableId: string | null;
    readonly evidenceKind: 'projection_view_readout';
  };
  readonly voxelStorage: {
    readonly extension: string;
    readonly mediaType: string;
    readonly schemaVersion: number;
    readonly supportedOperations: readonly ['export_voxel_volume_asset', 'save_voxel_volume_asset', 'load_voxel_volume_asset', 'persist_voxel_asset', 'reopen_voxel_asset'];
    readonly assetPlane: 'ProjectBundle';
    readonly authority: 'svc-voxel-asset';
  };
  readonly diagnostics: readonly string[];
  readonly nonClaims: readonly string[];
  readonly surfaceHash: string;
}

export interface StudioAgentVoxelWorkflowResult {
  readonly accepted: boolean;
  readonly operation: StudioAgentVoxelWorkflowResultOperation;
  readonly diagnostic: string | null;
  readonly surface: StudioAgentVoxelWorkflowSurfaceReadModel;
  readonly voxelEditReceipt?: StudioWorkspaceAuthoringCommandReceipt | null;
  readonly compiledVoxelEditBatch?: CommandBatch | null;
  readonly sourceRegistration?: VoxelConversionSourceRegistration | null;
  readonly meshSourceImport?: StudioAgentVoxelMeshSourceImportReadModel | null;
  readonly modelInfo?: VoxelModelInfoReadout | null;
  readonly modelWindow?: VoxelModelWindowReadout | null;
  readonly voxelVolumeExport?: StudioAgentVoxelVolumeExportReadModel | null;
  readonly voxelVolumeSave?: StudioAgentVoxelVolumeSaveReadModel | null;
  readonly voxelVolumeLoad?: StudioAgentVoxelVolumeLoadReadModel | null;
  readonly voxelVolumeUnload?: StudioAgentVoxelVolumeUnloadReadModel | null;
  readonly voxelVolumeAuthoringInitialize?: VoxelVolumeAuthoringInitializeReceipt | null;
  readonly viewCapture?: StudioAgentVoxelViewCaptureReadModel | null;
  readonly previewPublication?: StudioAgentVoxelPreviewPublicationReadModel | null;
  readonly voxelAssetPersistence?: StudioAgentVoxelAssetPersistenceReadModel | null;
  readonly voxelAssetReopen?: StudioAgentVoxelAssetReopenReadModel | null;
}

export interface StudioWorkspaceAuthoringCommandReceipt {
  readonly kind: 'studio_workspace_authoring.command_receipt.v0';
  readonly batch: CommandBatch;
  readonly result: CommandResult;
  readonly authoringState: WorkspaceAuthoringStateSummary;
}

export interface StudioAgentVoxelOperationTranscriptEntry {
  readonly operationId: string;
  readonly kind: StudioAgentVoxelWorkflowOperationKind;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly expected?: {
    readonly accepted?: boolean;
  };
}

export interface StudioAgentVoxelOperationTranscript {
  readonly artifactKind: 'studio_agent_voxel_operation_transcript';
  readonly artifactVersion: 'studio-agent-voxel-operation-transcript.v0';
  readonly producer: {
    readonly kind: string;
    readonly id: string;
    readonly label?: string;
  };
  readonly target: {
    readonly studioSurfaceVersion: 'studio-agent-voxel-workflow.v0';
    readonly projectBundle?: string;
    readonly runtimeMode?: string;
  };
  readonly operations: readonly StudioAgentVoxelOperationTranscriptEntry[];
  readonly nonClaims: readonly [
    'not_vforge_file',
    'not_mcp_transport',
    'not_raw_runtime_bridge_dispatch',
    'not_runtime_authority',
    'not_private_studio_state_mutation',
  ];
}

export interface StudioAgentVoxelOperationTranscriptValidationResult {
  readonly accepted: boolean;
  readonly diagnostic: string | null;
  readonly transcript: StudioAgentVoxelOperationTranscript | null;
  readonly transcriptHash: string;
}

export interface StudioAgentVoxelOperationTranscriptReplayOperationReceipt {
  readonly operationId: string;
  readonly kind: StudioAgentVoxelWorkflowOperationKind;
  readonly accepted: boolean;
  readonly expectedAccepted: boolean | null;
  readonly expectationMatched: boolean;
  readonly diagnostic: string | null;
  readonly surfaceHash: string;
  readonly resultHash: string;
}

export interface StudioAgentVoxelOperationTranscriptReplayReceipt {
  readonly artifactKind: 'studio_agent_voxel_operation_transcript_replay';
  readonly artifactVersion: 'studio-agent-voxel-operation-transcript-replay.v0';
  readonly transcriptArtifactKind: 'studio_agent_voxel_operation_transcript' | null;
  readonly transcriptArtifactVersion: 'studio-agent-voxel-operation-transcript.v0' | null;
  readonly transcriptHash: string;
  readonly replayed: boolean;
  readonly accepted: boolean;
  readonly diagnostic: string | null;
  readonly producerId: string | null;
  readonly operationCount: number;
  readonly acceptedOperationCount: number;
  readonly rejectedOperationCount: number;
  readonly operations: readonly StudioAgentVoxelOperationTranscriptReplayOperationReceipt[];
  readonly nonClaims: readonly [
    'not_vforge_file',
    'not_mcp_transport',
    'not_raw_runtime_bridge_dispatch',
    'not_runtime_authority',
    'not_private_studio_state_mutation',
  ];
  readonly receiptHash: string;
}

export type StudioVoxelAssetWorkflowControlAction =
  | 'initialize_volume'
  | 'create_house'
  | 'model_info'
  | 'export_volume'
  | 'save_volume'
  | 'reopen_volume'
  | 'unload_volume'
  | 'load_volume';

export const STUDIO_VOXEL_OPERATION_AUTHORITY = {
  meshImport: 'workspace_authoring',
  conversion: 'workspace_authoring',
  initializeVolume: 'workspace_authoring',
  edit: 'workspace_authoring',
  inspect: 'workspace_authoring',
  palette: 'workspace_authoring',
  annotations: 'workspace_authoring',
  history: 'workspace_authoring',
  preview: 'projection',
  save: 'stored_asset_io',
  reopen: 'stored_asset_io',
  loadIntoRunningGame: 'live_runtime',
  inspectRunningGame: 'live_runtime',
  unloadFromRunningGame: 'live_runtime',
} as const;

export interface StudioVoxelTranscriptControlReadModel {
  readonly controlVersion: 'studio-voxel-transcript-control.v0';
  readonly draft: string;
  readonly status: 'idle' | 'accepted' | 'rejected';
  readonly message: string;
  readonly receipt: StudioAgentVoxelOperationTranscriptReplayReceipt | null;
}

export type StudioVoxelCompactEditControlAction = 'block' | 'fill_box' | 'primitive_box' | 'primitive_line';

export type StudioVoxelCompactEditBoxMode = 'filled' | 'shell' | 'edges';

export type StudioVoxelCompactEditPlacementEndpoint = 'start' | 'end';

export type StudioVoxelCompactEditControlField =
  | 'grid'
  | 'x1'
  | 'y1'
  | 'z1'
  | 'x2'
  | 'y2'
  | 'z2'
  | 'material'
  | 'lineRadius'
  | 'maxGeneratedVoxels';

export interface StudioVoxelAssetWorkflowControlReadModel {
  readonly controlVersion: 'studio-voxel-asset-workflow-control.v0';
  readonly lastAction: StudioVoxelAssetWorkflowControlAction | null;
  readonly status: 'idle' | 'accepted' | 'rejected';
  readonly message: string;
  readonly targetAssetId: string;
  readonly targetProjectBundle: string;
  readonly targetAssetPath: string;
  readonly residentModelId: string | null;
  readonly volumeAssetId: string | null;
  readonly voxelCount: number | null;
  readonly materialSummary: string;
  readonly canonicalJsonHash: string | null;
  readonly voxelDataHash: string | null;
  readonly validationDiagnosticCodes: readonly string[];
  readonly canLoadLastAsset: boolean;
  readonly lastAssetId: string | null;
  readonly lastAsset: VoxelVolumeAsset | null;
}

export const STUDIO_VOXEL_HOUSE_BOUNDS = {
  min: { x: 0, y: 0, z: 0 },
  max: { x: 10, y: 8, z: 12 },
} as const;

/**
 * Builds a recognizable one-chunk house without introducing a Studio-owned
 * voxel representation. The returned batches are ordinary public setVoxel
 * proposals kept within the product workflow's bounded command size.
 */
export function buildStudioVoxelHouseCommandBatches(grid: number): readonly CommandBatch[] {
  const voxels = new Map<string, VoxelCommand>();
  const add = (x: number, y: number, z: number): void => {
    voxels.set(`${x}:${y}:${z}`, {
      op: 'setVoxel',
      grid,
      coord: { x, y, z },
      value: { kind: 'solid', material: 1 },
    });
  };

  // Floor.
  for (let x = 0; x <= 10; x += 1) {
    for (let y = 0; y <= 8; y += 1) add(x, y, 0);
  }

  // Front and back walls. Openings are intentionally absent geometry.
  for (const y of [0, 8]) {
    for (let x = 0; x <= 10; x += 1) {
      for (let z = 1; z <= 5; z += 1) {
        const doorway = y === 0 && x >= 4 && x <= 6 && z <= 3;
        const window = ((x >= 1 && x <= 3) || (x >= 7 && x <= 9))
          && z >= 2 && z <= 3;
        if (!doorway && !window) add(x, y, z);
      }
    }
  }

  // Side walls with paired windows.
  for (const x of [0, 10]) {
    for (let y = 1; y <= 7; y += 1) {
      for (let z = 1; z <= 5; z += 1) {
        const window = ((y >= 1 && y <= 3) || (y >= 5 && y <= 7))
          && z >= 2 && z <= 3;
        if (!window) add(x, y, z);
      }
    }
  }

  // Stepped gable roof, with the ridge running across the house width.
  for (let inset = 0; inset <= 4; inset += 1) {
    const roofZ = 6 + inset;
    for (let x = 0; x <= 10; x += 1) {
      add(x, inset, roofZ);
      add(x, 8 - inset, roofZ);
    }
  }

  // Chimney above the rear roof slope.
  for (let x = 8; x <= 9; x += 1) {
    for (let z = 9; z <= 12; z += 1) add(x, 6, z);
  }

  const batches: CommandBatch[] = [];
  const appendBatches = (commands: readonly VoxelCommand[]): void => {
    for (let offset = 0; offset < commands.length; offset += AGENT_VOXEL_EDIT_MAX_COMMANDS) {
      batches.push({ commands: commands.slice(offset, offset + AGENT_VOXEL_EDIT_MAX_COMMANDS) });
    }
  };

  // Grow through coordinate-adjacent waves. Voxel authority intentionally
  // rejects writes that jump beyond resident or face-adjacent chunks; this
  // makes every new wave legal without knowing or duplicating chunk layout.
  const maxDistance = STUDIO_VOXEL_HOUSE_BOUNDS.max.x
    + STUDIO_VOXEL_HOUSE_BOUNDS.max.y
    + STUDIO_VOXEL_HOUSE_BOUNDS.max.z;
  for (let distance = 0; distance <= maxDistance; distance += 1) {
    const wave: VoxelCommand[] = [];
    for (let x = 0; x <= STUDIO_VOXEL_HOUSE_BOUNDS.max.x; x += 1) {
      for (let y = 0; y <= STUDIO_VOXEL_HOUSE_BOUNDS.max.y; y += 1) {
        const z = distance - x - y;
        if (z < 0 || z > STUDIO_VOXEL_HOUSE_BOUNDS.max.z) continue;
        wave.push({
          op: 'setVoxel',
          grid,
          coord: { x, y, z },
          value: { kind: 'solid', material: 1 },
        });
      }
    }
    appendBatches(wave);
  }

  // Carve door, windows, and interior after the bounded region is resident.
  const carve: VoxelCommand[] = [];
  for (let x = 0; x <= STUDIO_VOXEL_HOUSE_BOUNDS.max.x; x += 1) {
    for (let y = 0; y <= STUDIO_VOXEL_HOUSE_BOUNDS.max.y; y += 1) {
      for (let z = 0; z <= STUDIO_VOXEL_HOUSE_BOUNDS.max.z; z += 1) {
        if (voxels.has(`${x}:${y}:${z}`)) continue;
        carve.push({ op: 'setVoxel', grid, coord: { x, y, z }, value: { kind: 'empty' } });
      }
    }
  }
  appendBatches(carve);
  return batches;
}

export interface StudioVoxelAssetWorkflowTargetDraft {
  readonly targetProjectBundle: string | null;
  readonly targetAssetPath: string | null;
}

export interface StudioVoxelAssetWorkflowTargetReadModel {
  readonly controlVersion: 'studio-voxel-asset-workflow-target.v0';
  readonly targetAssetId: string;
  readonly targetProjectBundle: string;
  readonly targetAssetPath: string;
  readonly derivedProjectBundle: string;
  readonly derivedAssetPath: string;
  readonly customProjectBundle: boolean;
  readonly customAssetPath: boolean;
  readonly workspaceGameId: string | null;
}

export interface StudioVoxelCompactEditControlReadModel {
  readonly controlVersion: 'studio-voxel-compact-edit-control.v0';
  readonly draftAction: StudioVoxelCompactEditControlAction;
  readonly lastAction: StudioVoxelCompactEditControlAction | null;
  readonly status: 'idle' | 'accepted' | 'rejected';
  readonly message: string;
  readonly grid: number;
  readonly x1: number;
  readonly y1: number;
  readonly z1: number;
  readonly x2: number;
  readonly y2: number;
  readonly z2: number;
  readonly material: number;
  readonly boxMode: StudioVoxelCompactEditBoxMode;
  readonly lineRadius: number;
  readonly maxGeneratedVoxels: number;
  readonly preflightAction: StudioVoxelCompactEditControlAction;
  readonly preflightAccepted: boolean;
  readonly preflightGeneratedCommandCount: number;
  readonly preflightDiagnostic: string | null;
  readonly generatedCommandCount: number | null;
  readonly acceptedCommandCount: number | null;
  readonly rejectedCommandCount: number | null;
  readonly diagnostic: string | null;
}

export interface StudioVoxelCompactEditPlacementReadModel {
  readonly controlVersion: 'studio-voxel-compact-edit-placement.v0';
  readonly status: 'ready' | 'unavailable' | 'unsupported_hit';
  readonly canUseViewportHit: boolean;
  readonly sourceRenderableId: string | null;
  readonly sourceFace: StudioViewportHitReadModel['face'] | null;
  readonly sourceVoxelCoord: StudioVoxelCoord | null;
  readonly targetStart: StudioVoxelCoord;
  readonly targetEnd: StudioVoxelCoord;
  readonly previewLabel: string;
  readonly message: string;
  readonly readoutHash: string;
  readonly nonClaims: readonly string[];
}

export type StudioVoxelHistoryAction =
  | 'read'
  | 'preview_revert'
  | 'apply_revert'
  | 'undo'
  | 'redo';

export type StudioVoxelHistoryTextControlField =
  | 'historyId'
  | 'cursorId'
  | 'targetTransactionId'
  | 'targetCursorId';

export type StudioVoxelHistoryNumberControlField =
  | 'targetCursorIndex'
  | 'maxEntries'
  | 'maxReplaySteps'
  | 'maxDiffVoxels';

export type StudioVoxelHistoryBooleanControlField =
  | 'includeRedoTail'
  | 'includeSampleWindow';

export interface StudioVoxelHistoryControlState {
  readonly controlVersion: 'studio-voxel-history-control.v0';
  readonly historyId: string;
  readonly cursorId: string | null;
  readonly targetTransactionId: string | null;
  readonly targetCursorId: string | null;
  readonly targetCursorIndex: number | null;
  readonly maxEntries: number;
  readonly maxReplaySteps: number;
  readonly maxDiffVoxels: number;
  readonly includeRedoTail: boolean;
  readonly includeSampleWindow: boolean;
  readonly lastAction: StudioVoxelHistoryAction | null;
  readonly status: 'idle' | 'ready' | 'accepted' | 'rejected';
  readonly message: string;
  readonly diagnostic: string | null;
  readonly summary: VoxelEditHistorySummary | null;
  readonly receipt: VoxelEditHistoryRevertReceipt | null;
}

export interface StudioVoxelHistoryEntryRowReadModel {
  readonly transactionId: string;
  readonly cursorId: string;
  readonly entryKind: string;
  readonly operationLabel: string;
  readonly provenance: string;
  readonly commandCount: number;
  readonly eventCount: number;
  readonly touchedVoxelCount: number;
  readonly boundsLabel: string;
  readonly diffLabel: string;
  readonly diagnosticCodes: readonly string[];
  readonly actionability: 'summary_only';
}

export interface StudioVoxelHistoryDiffReadModel {
  readonly status: 'none' | 'summary' | 'partial';
  readonly diffLevel: string | null;
  readonly partial: boolean;
  readonly changedVoxelCount: number | null;
  readonly boundsLabel: string;
  readonly materialDeltaLabel: string;
  readonly sampleWindowRef: string | null;
  readonly diagnosticCodes: readonly string[];
}

export interface StudioVoxelHistoryPanelReadModel {
  readonly panelVersion: 'studio-voxel-history-panel.v0';
  readonly authoringAvailable: boolean;
  readonly control: StudioVoxelHistoryControlState;
  readonly cursor: VoxelEditHistoryCursor | null;
  readonly historyHash: string | null;
  readonly cursorHash: string | null;
  readonly entryCount: number;
  readonly retainedRedoCount: number;
  readonly canRead: boolean;
  readonly canPreviewRevert: boolean;
  readonly canApplyRevert: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly targetLabel: string;
  readonly entries: readonly StudioVoxelHistoryEntryRowReadModel[];
  readonly diff: StudioVoxelHistoryDiffReadModel;
  readonly receipt: VoxelEditHistoryRevertReceipt | null;
  readonly diagnostics: readonly VoxelEditHistoryDiagnostic[];
  readonly nonClaims: readonly [
    'not_studio_authoritative_undo_stack',
    'not_row_level_revert_without_rust_replayable_marker',
    'not_compacted_entry_reconstruction',
  ];
  readonly readoutHash: string;
}

export interface StudioVoxelMaterialAuthoringRow {
  readonly source: 'conversion_map' | 'stored_asset_palette' | 'compact_edit_material';
  readonly voxelMaterial: number;
  readonly paletteEntryId: string | null;
  readonly displayName: string | null;
  readonly materialAssetId: string | null;
  readonly materialCatalogBindingId: string | null;
  readonly sourceMaterialSlot: number | null;
  readonly sourceMaterialId: string | null;
  readonly voxelCount: number | null;
  readonly status: 'draft' | 'stored' | 'runtime_count';
  readonly message: string;
}

export interface StudioVoxelMaterialAuthoringReadModel {
  readonly readoutVersion: 'studio-voxel-material-authoring.v0';
  readonly currentCompactMaterial: number;
  readonly defaultVoxelMaterial: number | null;
  readonly conversionRows: readonly StudioVoxelMaterialAuthoringRow[];
  readonly storedRows: readonly StudioVoxelMaterialAuthoringRow[];
  readonly compactRow: StudioVoxelMaterialAuthoringRow;
  readonly rows: readonly StudioVoxelMaterialAuthoringRow[];
  readonly supportedFields: readonly string[];
  readonly missingEngineFields: readonly ['multi_material_compact_edit_controls'];
  readonly canAuthorCatalogBindings: true;
  readonly readoutHash: string;
}

export interface StudioVoxelMaterialPaletteEditorReadModel {
  readonly controlVersion: 'studio-voxel-material-palette-editor.v0';
  readonly status: 'idle' | 'accepted' | 'rejected';
  readonly message: string;
  readonly selectedPaletteEntryId: string;
  readonly paletteEntryId: string;
  readonly displayName: string;
  readonly materialAssetId: string;
  readonly materialCatalogBindingId: string;
  readonly diagnostics: readonly string[];
  readonly receipt: VoxelVolumeAssetPaletteUpdateReceipt | null;
}

export interface StudioVoxelAnnotationControlReadModel {
  readonly controlVersion: 'studio-voxel-annotation-control.v0';
  readonly status: 'idle' | 'accepted' | 'rejected';
  readonly message: string;
  readonly layerId: string;
  readonly runtimeLayerId: string | null;
  readonly expectedLayerHash: string | null;
  readonly regionId: string;
  readonly label: string;
  readonly kind: VoxelAnnotationKind;
  readonly tags: string;
  readonly parentRegionId: string;
  readonly x1: number;
  readonly y1: number;
  readonly z1: number;
  readonly x2: number;
  readonly y2: number;
  readonly z2: number;
  readonly diagnostics: readonly string[];
  readonly query: VoxelAnnotationQueryReadout | null;
  readonly editReceipt: VoxelAnnotationEditReceipt | null;
  readonly exportReceipt: VoxelAnnotationLayerExportReceipt | null;
  readonly canSubmit: boolean;
  readonly readoutHash: string;
}

interface StudioVoxelAssetWorkflowTarget {
  readonly grid: number;
  readonly volumeAssetId: string;
  readonly targetAssetId: string;
  readonly projectBundle: string;
  readonly assetPath: string;
  readonly derivedProjectBundle: string;
  readonly derivedAssetPath: string;
  readonly customProjectBundle: boolean;
  readonly customAssetPath: boolean;
}

const DEMO_GAME_WORKSPACE_MANIFEST = `[asha]
engine_version = "0.1.0"
contracts_version = "0.1.0"
runtime_bridge_version = "0.1.0"
devtools_protocol_version = "devtools-protocol.v0"
publish_artifact_format_version = "publish-artifact.v0"
engine_source = "../asha-engine"

[workspace]
scene_roots = ["levels/presets", "levels/scenes"]
prefab_roots = ["prefabs"]
asset_roots = ["assets"]
replay_roots = ["replays"]
catalog_packages = ["catalogs/actors", "catalogs/gameplay", "catalogs/materials", "catalogs/spawns", "catalogs/weapons"]
policy_packages = []

[runtime]
dev_command = "npm run dev"
devtools_endpoint = "ws://127.0.0.1:7391"
wasm_or_native_entry = "dist/runtime/index.js"
backend_mode = "native"
backend_profile = "native.napi.launcher.v1"
backend_proof_refs = ["artifacts/4217/generated-tunnel-room.png"]

[studio]
workspace_mode = true
attach_enabled = false
allowed_source_writes = ["levels/presets", "levels/scenes", "prefabs", "assets", "catalogs/actors", "catalogs/gameplay", "catalogs/materials", "catalogs/spawns", "catalogs/weapons"]

[publish]
command = "npm run build"
artifact_dir = "dist"
verify_command = "npm run typecheck"

[dev_resource_profile]
local_roots = ["prefabs", "assets", "catalogs/actors", "catalogs/gameplay", "catalogs/materials", "catalogs/spawns", "catalogs/weapons"]
cache_dir = "dist/dev-cache"
resolution_policy = "prefer-source"

[publish_resource_profile]
output_dir = "dist/resources"
archive_dir = "dist/archive"
resolution_policy = "locked"
`;

const DEMO_GAME_WORKSPACE_SCRIPTS: Readonly<Record<string, string>> = {
  dev: 'node scripts/serve-ui.mjs',
  build: 'node scripts/build-ui.mjs',
  typecheck: 'node scripts/check-ui-assets.mjs',
};

const DEMO_GAME_WORKSPACE_PATHS = new Set([
  'levels/presets',
  'levels/scenes',
  'prefabs',
  'assets',
  'replays',
  'catalogs/actors',
  'catalogs/gameplay',
  'catalogs/materials',
  'catalogs/spawns',
  'catalogs/weapons',
]);

const LIVE_RUNTIME_FIXTURE_PROJECT_BUNDLE: ProjectBundleLoadRequest = {
  bundleSchemaVersion: 1,
  protocolVersion: 1,
  sceneId: 4103,
};

function workspaceAuthoringProjectBundle(
  workspace: StudioGameWorkspaceReadModel,
  document: FlatSceneDocument,
): ProjectBundleLoadRequest {
  const identity = `${workspace.workspaceHash}|${String(document.id)}|${document.schemaVersion}`;
  let sceneId = 2_166_136_261;
  for (const character of identity) {
    sceneId ^= character.codePointAt(0) ?? 0;
    sceneId = Math.imul(sceneId, 16_777_619) >>> 0;
  }
  return {
    bundleSchemaVersion: 1,
    protocolVersion: 1,
    sceneId,
  };
}

const STUDIO_RUNTIME_MODEL_PREVIEW_REQUEST: ModelMaterialPreviewRequest = {
  catalogEntry: {
    id: 'material.studio-copper',
    kind: 'material',
    version: 1,
    hash: 'sha256-studio-copper',
    sourcePath: null,
    label: 'Studio Copper',
    dependencies: [],
    material: {
      render: {
        color: { r: 0.8, g: 0.4, b: 0.2, a: 1 },
        texture: null,
        roughness: 0.6,
        textureTint: { r: 1, g: 1, b: 1, a: 1 },
        emissionColor: { r: 0.8, g: 0.4, b: 0.2, a: 1 },
        emissive: 0,
        uvStrategy: 'flat',
      },
      collision: {
        solid: true,
        collidable: true,
        occludes: true,
        structuralClass: 'solid',
      },
    },
  },
  meshAsset: {
    asset: 'mesh.studio-preview-triangle',
    payload: {
      layout: {
        vertexCount: 3,
        indexCount: 3,
        indexWidth: 'u32',
        attributes: [{ name: 'position', components: 3, kind: 'f32' }],
      },
      groups: [{ materialSlot: 0, start: 0, count: 3 }],
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
      source: {
        kind: 'inline',
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        indices: [0, 1, 2],
      },
      provenance: 'staticAsset',
    },
    materialSlots: [{ slot: 0, material: 'material.studio-copper' }],
    collision: { kind: 'aabbFallback' },
  },
  instanceHandle: renderHandle(7001),
};

const STUDIO_PLAYABLE_LOOP_POLICY_SOURCE = 'export const policy = (view) => view;';

const STUDIO_PLAYABLE_LOOP_CAMERA_REQUEST: CameraCreateRequest = {
  initialPose: {
    position: [1, 1.5, 1],
    yawDegrees: 180,
    pitchDegrees: 0,
  },
  projection: {
    fovYDegrees: 60,
    near: 0.1,
    far: 100,
  },
  viewport: {
    width: 1280,
    height: 720,
  },
};

const DEMO_ASSET_INVENTORY_ARTIFACT = {
  artifactKind: 'asha_demo_asset_inventory',
  artifactVersion: 'asset-inventory.v1',
  generatedAt: 'deterministic-as-structure-only',
  sourceManifest: {
    path: 'asha.game.toml',
    hash: 'sha256:8dea305570a722c40d5e046b11197476c4d9e9674ce83f537dc803ada6bb9703',
  },
  catalog: {
    path: 'packages/game-catalogs/catalog.json',
    hash: 'sha256:d51427117af9d7eefb673cec1a9a555fcb2f7f772950325cc7117d2dc61d1540',
  },
  status: 'ok',
  diagnostics: [],
  dependencyOrder: [
    'texture.demo-checker',
    'material.demo-copper',
    'mesh.demo-cube',
    'mesh/import-fixture-a',
  ],
  entries: [
    {
      assetId: 'mesh.demo-cube',
      kind: 'static_mesh',
      sourcePath: 'assets/meshes/demo-cube.mesh.json',
      dependencies: ['material.demo-copper'],
      devResolution: {
        assetId: 'mesh.demo-cube',
        sourcePath: 'assets/meshes/demo-cube.mesh.json',
        sourceHash: 'sha256:22b58100010034f72eb504d7722aec14b819438bce47e80bf361b3444e238117',
        devCacheKey: 'dev-cache/static_mesh/mesh.demo-cube/22b581000100',
        generatedArtifactVersion: 'asset-import.v1',
        importStatus: 'clean',
        publishOutputKey: 'meshes/demo-cube.mesh.json',
      },
      publishResolution: {
        outputKey: 'meshes/demo-cube.mesh.json',
        packedPath: 'harness/out/publish/resources/meshes/demo-cube.mesh.json',
        packedHash: 'sha256:277860798a59f8bf7a06e28ad60988799b6d63768d43094ba9537a03108b787e',
        packedBytes: 702,
      },
      diagnostics: [],
      evidenceRefs: [
        {
          kind: 'source',
          path: 'assets/meshes/demo-cube.mesh.json',
          sha256: 'sha256:22b58100010034f72eb504d7722aec14b819438bce47e80bf361b3444e238117',
        },
        {
          kind: 'packed-resource',
          path: 'harness/out/publish/resources/meshes/demo-cube.mesh.json',
          sha256: 'sha256:277860798a59f8bf7a06e28ad60988799b6d63768d43094ba9537a03108b787e',
        },
      ],
    },
    {
      assetId: 'mesh/import-fixture-a',
      kind: 'static_mesh',
      sourcePath: 'assets/meshes/import-fixture-a.mesh.json',
      dependencies: ['material.demo-copper'],
      devResolution: {
        assetId: 'mesh/import-fixture-a',
        sourcePath: 'assets/meshes/import-fixture-a.mesh.json',
        sourceHash: 'sha256:import-fixture-a',
        devCacheKey: 'dev-cache/static_mesh/mesh-import-fixture-a/import-fixture-a',
        generatedArtifactVersion: 'asset-import.v1',
        importStatus: 'clean',
        publishOutputKey: 'meshes/import-fixture-a.mesh.json',
      },
      publishResolution: {
        outputKey: 'meshes/import-fixture-a.mesh.json',
        packedPath: 'harness/out/publish/resources/meshes/import-fixture-a.mesh.json',
        packedHash: null,
        packedBytes: null,
      },
      diagnostics: [],
      evidenceRefs: [
        {
          kind: 'source',
          path: 'assets/meshes/import-fixture-a.mesh.json',
          sha256: 'sha256:import-fixture-a',
        },
      ],
    },
    {
      assetId: 'material.demo-copper',
      kind: 'material',
      sourcePath: 'assets/materials/demo-copper.material.json',
      dependencies: ['texture.demo-checker'],
      devResolution: {
        assetId: 'material.demo-copper',
        sourcePath: 'assets/materials/demo-copper.material.json',
        sourceHash: 'sha256:0190cf1f6ec702431fd1e37e38503b9002978681a989d6382830d92e586ccd6d',
        devCacheKey: 'dev-cache/material/material.demo-copper/0190cf1f6ec7',
        generatedArtifactVersion: 'asset-import.v1',
        importStatus: 'clean',
        publishOutputKey: 'materials/demo-copper.material.json',
      },
      publishResolution: {
        outputKey: 'materials/demo-copper.material.json',
        packedPath: 'harness/out/publish/resources/materials/demo-copper.material.json',
        packedHash: 'sha256:89b73b140332526f3b6c63a9b4f26a78ca657ca764ae87262cfbff4b36fb55b2',
        packedBytes: 214,
      },
      diagnostics: [],
      evidenceRefs: [
        {
          kind: 'source',
          path: 'assets/materials/demo-copper.material.json',
          sha256: 'sha256:0190cf1f6ec702431fd1e37e38503b9002978681a989d6382830d92e586ccd6d',
        },
        {
          kind: 'packed-resource',
          path: 'harness/out/publish/resources/materials/demo-copper.material.json',
          sha256: 'sha256:89b73b140332526f3b6c63a9b4f26a78ca657ca764ae87262cfbff4b36fb55b2',
        },
      ],
    },
    {
      assetId: 'texture.demo-checker',
      kind: 'texture',
      sourcePath: 'assets/textures/demo-checker.texture.json',
      dependencies: [],
      devResolution: {
        assetId: 'texture.demo-checker',
        sourcePath: 'assets/textures/demo-checker.texture.json',
        sourceHash: 'sha256:46f863709c0cf4f2d5d03b560f492f5556c3482640b69dddcc6a2ac56b8963d3',
        devCacheKey: 'dev-cache/texture/texture.demo-checker/46f863709c0c',
        generatedArtifactVersion: 'asset-import.v1',
        importStatus: 'clean',
        publishOutputKey: 'textures/demo-checker.texture.json',
      },
      publishResolution: {
        outputKey: 'textures/demo-checker.texture.json',
        packedPath: 'harness/out/publish/resources/textures/demo-checker.texture.json',
        packedHash: 'sha256:033fc8ad02986bbf46064607c516f8ce1fe77714d136712297d9d35414a2473d',
        packedBytes: 367,
      },
      diagnostics: [],
      evidenceRefs: [
        {
          kind: 'source',
          path: 'assets/textures/demo-checker.texture.json',
          sha256: 'sha256:46f863709c0cf4f2d5d03b560f492f5556c3482640b69dddcc6a2ac56b8963d3',
        },
        {
          kind: 'packed-resource',
          path: 'harness/out/publish/resources/textures/demo-checker.texture.json',
          sha256: 'sha256:033fc8ad02986bbf46064607c516f8ce1fe77714d136712297d9d35414a2473d',
        },
      ],
    },
  ],
} as const;

function stableBrowserHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `sha256:browser-${hash.toString(16).padStart(8, '0')}`;
}

function studioMonotonicNow(): number {
  return globalThis.performance?.now() ?? Date.now();
}

const DEMO_PUBLISH_EVIDENCE = {
  evidenceKind: 'asha_demo_publish_evidence_manifest',
  evidenceVersion: 'publish-evidence.v1',
  generatedAt: 'deterministic-as-structure-only',
  publishArtifact: {
    path: 'harness/out/publish/latest/index.json',
    fileHash: 'sha256:85b942e5df6f30184fc16355d25d362fa06af26878a4fd21c7e274f0e747762a',
    artifactId: 'asha-demo-publish:sha256:0b62e2e4e86bc1c0ab4ad5930599a068646c1048642bab88d1fb4b601f5f1256',
    artifactHash: 'sha256:0b62e2e4e86bc1c0ab4ad5930599a068646c1048642bab88d1fb4b601f5f1256',
    artifactVersion: 'publish-artifact.v0',
    compiledAssetCount: 3,
    publishAssetCount: 3,
    runnableTarget: 'asha-demo-static-reference.v1',
    runnableEntrypointPath: 'harness/out/publish/runnable/latest/index.html',
    runnableEntrypointHash: 'sha256:740b5e8836e7e923ef19f3b78c3e4195ab19cc503ba5fce7fda222772e7345a2',
    resourcePackManifestPath: 'harness/out/publish/resources/manifest.json',
    resourcePackManifestHash: 'sha256:eb88d4443d0556db892b1f8371523462de0bd994d3c10dba3a1cf88e3828dd68',
  },
  publishSmoke: {
    path: 'harness/out/publish-smoke/latest/index.json',
    fileHash: 'sha256:95a795c9a2af139e15806bc35a658129cbcceb3e06a8d2bff2a7dadfa9ee08f1',
    checks: [
      'publish_artifact_built',
      'artifact_hash_recomputed',
      'compiled_assets_match_sources',
      'packed_resources_match_publish_profile',
      'no_dev_local_resource_reads',
      'runnable_dependency_guard_passed',
      'non_claims_preserved',
    ],
    readback: {
      status: 'ok',
      artifactPath: 'harness/out/publish/latest/index.json',
      artifactHash: 'sha256:0b62e2e4e86bc1c0ab4ad5930599a068646c1048642bab88d1fb4b601f5f1256',
      publishDependencyGuard: 'no-studio-dev-only-fragments',
      sceneCount: 2,
      catalogCount: 1,
      compiledAssetCount: 3,
      publishAssetCount: 3,
      packedResources: [
        {
          assetId: 'mesh.demo-cube',
          outputKey: 'meshes/demo-cube.mesh.json',
          sourceHash: 'sha256:22b58100010034f72eb504d7722aec14b819438bce47e80bf361b3444e238117',
          packedHash: 'sha256:277860798a59f8bf7a06e28ad60988799b6d63768d43094ba9537a03108b787e',
          runnableHash: 'sha256:277860798a59f8bf7a06e28ad60988799b6d63768d43094ba9537a03108b787e',
        },
        {
          assetId: 'material.demo-copper',
          outputKey: 'materials/demo-copper.material.json',
          sourceHash: 'sha256:0190cf1f6ec702431fd1e37e38503b9002978681a989d6382830d92e586ccd6d',
          packedHash: 'sha256:89b73b140332526f3b6c63a9b4f26a78ca657ca764ae87262cfbff4b36fb55b2',
          runnableHash: 'sha256:89b73b140332526f3b6c63a9b4f26a78ca657ca764ae87262cfbff4b36fb55b2',
        },
        {
          assetId: 'texture.demo-checker',
          outputKey: 'textures/demo-checker.texture.json',
          sourceHash: 'sha256:46f863709c0cf4f2d5d03b560f492f5556c3482640b69dddcc6a2ac56b8963d3',
          packedHash: 'sha256:033fc8ad02986bbf46064607c516f8ce1fe77714d136712297d9d35414a2473d',
          runnableHash: 'sha256:033fc8ad02986bbf46064607c516f8ce1fe77714d136712297d9d35414a2473d',
        },
      ],
      dependencyGuard: {
        inspectedRunnableFiles: [
          'harness/out/publish/runnable/latest/index.html',
          'harness/out/publish/runnable/latest/resources/manifest.json',
          'harness/out/publish/runnable/latest/resources/materials/demo-copper.material.json',
          'harness/out/publish/runnable/latest/resources/meshes/demo-cube.mesh.json',
          'harness/out/publish/runnable/latest/resources/textures/demo-checker.texture.json',
          'harness/out/publish/runnable/latest/runtime/reference-runtime.json',
        ],
        forbiddenFragments: [
          '@asha-studio/',
          'asha-studio',
          '../asha-studio',
          'studio-game-workspace',
          'harness/out/dev-smoke',
          'harness/out/publish-smoke',
          'devtools_endpoint',
          'ws://127.0.0.1',
          'ws://localhost',
        ],
      },
    },
  },
  publishRunSmoke: {
    path: 'harness/out/publish-run-smoke/latest/index.json',
    fileHash: 'sha256:ce809ae83fc0d4f6867c230b1950dbed5d802c90e3f654c9e69b5b563e4d8c8c',
    runtime: {
      runtimeMode: 'reference',
      launcherName: 'reference-game-runtime-launcher',
      nonClaims: [
        'not_native_runtime',
        'not_hardware_gpu',
        'not_performance_evidence',
        'not_publish_artifact',
        'not_wasm_authority',
      ],
    },
    projection: {
      worldHash: 'reference-world:asha-demo:1002:accepted:0',
    },
    commandProof: {
      acceptedCommand: { status: 'accepted' },
      rejectedCommand: { status: 'rejected' },
    },
    resolvedResourceCount: 3,
    checks: [
      'entrypoint_exists_without_dev_server',
      'runtime_metadata_loaded',
      'packed_resources_resolved',
      'reference_runtime_projection_pulled',
      'packaged_runtime_accepted_command_mutated_projection',
      'packaged_runtime_rejected_command_preserved_projection',
      'no_devtools_endpoint_required',
    ],
  },
  validations: [
    'publish_artifact_hash_matches_readback',
    'publish_smoke_references_publish_artifact',
    'publish_run_smoke_references_runnable_artifact',
    'runnable_entrypoint_hash_recorded',
    'packed_resource_manifest_hash_recorded',
    'runtime_projection_readback_present',
    'packaged_command_proof_present',
    'compiled_asset_count_matches_readback',
    'studio_dev_only_dependency_guard_passed',
  ],
  nonClaims: [
    'not_native_runtime_authority',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
    'not_store_submission',
  ],
  evidenceId: 'asha-demo-publish-evidence:sha256:95da5f3787aa4a97bc21ff998305ab2a8ffd6d8b02081cc8b00f410880ad842e',
  evidenceHash: 'sha256:95da5f3787aa4a97bc21ff998305ab2a8ffd6d8b02081cc8b00f410880ad842e',
} as const;

function loadDemoGameWorkspace(): StudioGameWorkspaceLoadResult {
  return loadStudioGameWorkspaceManifest({
    workspaceRoot: '../asha-demo',
    manifestPath: 'asha.game.toml',
    gameId: 'asha-demo',
    manifestText: DEMO_GAME_WORKSPACE_MANIFEST,
    packageScripts: DEMO_GAME_WORKSPACE_SCRIPTS,
    pathExists: relativePath => DEMO_GAME_WORKSPACE_PATHS.has(relativePath),
  });
}

function loadDemoAssetInventory(): StudioAssetInventoryLoadResult {
  return loadStudioAssetInventory(DEMO_ASSET_INVENTORY_ARTIFACT, {
    referencedRenderableIds: demoReferencedRenderableIds(),
  });
}

function demoReferencedRenderableIds(): Readonly<Record<string, readonly string[]>> {
  return {
    'mesh.demo-cube': ['model-preview-crate'],
    'material.demo-copper': ['model-preview-crate'],
  };
}

function importProfileForKind(kind: string): string {
  if (kind === 'static_mesh') {
    return 'inline-static-mesh.v0';
  }
  if (kind === 'material') {
    return 'inline-material.v0';
  }
  return 'inline-texture.v0';
}

function catalogFromInventoryArtifact(): AshaGameAssetCatalog {
  return {
    schemaVersion: 1,
    entries: DEMO_ASSET_INVENTORY_ARTIFACT.entries.map((entry): AshaGameAssetCatalogEntry => ({
      id: entry.assetId,
      kind: entry.kind as AshaGameAssetKind,
      source: entry.sourcePath,
      importProfile: importProfileForKind(entry.kind),
      importMetadata: {
        sourceHash: entry.devResolution.sourceHash,
        cacheKey: entry.devResolution.devCacheKey,
        generatedArtifactVersion: entry.devResolution.generatedArtifactVersion,
      },
      dependencies: entry.dependencies ?? [],
      publish: {
        include: true,
        outputKey: entry.publishResolution.outputKey,
      },
      diagnostics: {
        owner: 'asha-studio',
        notes: [],
      },
    })),
  };
}

function inventoryFromCatalog(
  catalog: AshaGameAssetCatalog,
  catalogPath: string,
  catalogHash: string,
  referencedRenderableIds: Readonly<Record<string, readonly string[]>>,
): StudioAssetInventoryLoadResult {
  return loadStudioAssetInventory({
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: 'ok',
    sourceManifest: DEMO_ASSET_INVENTORY_ARTIFACT.sourceManifest,
    catalog: { path: catalogPath, hash: catalogHash },
    diagnostics: [],
    dependencyOrder: catalog.entries.map(entry => entry.id),
    entries: catalog.entries.map(entry => ({
      assetId: entry.id,
      kind: entry.kind,
      sourcePath: entry.source,
      dependencies: entry.dependencies ?? [],
      devResolution: {
        sourceHash: entry.importMetadata?.sourceHash ?? null,
        devCacheKey: entry.importMetadata?.cacheKey ?? `dev-cache/${entry.kind}/${entry.id}`,
        generatedArtifactVersion: entry.importMetadata?.generatedArtifactVersion ?? null,
        importStatus: 'catalog-linked',
        publishOutputKey: entry.publish.outputKey,
      },
      publishResolution: {
        outputKey: entry.publish.outputKey,
        packedPath: `harness/out/publish/resources/${entry.publish.outputKey}`,
        packedHash: null,
        packedBytes: null,
      },
      diagnostics: [],
      evidenceRefs: [
        {
          kind: 'catalog-source',
          path: entry.source,
          sha256: entry.importMetadata?.sourceHash ?? null,
        },
      ],
    })),
  }, { referencedRenderableIds });
}

function buildDemoCommandProposalRows(workspace: StudioGameWorkspaceReadModel) {
  const batch = {
    commands: [
      {
        op: 'setVoxel',
        grid: 0,
        coord: { x: 0, y: 0, z: 0 },
        value: { kind: 'solid', material: 1 },
      },
    ],
  } as const;
  const rejectedBatch = {
    commands: [
      {
        op: 'setVoxel',
        grid: 0,
        coord: { x: 1, y: 0, z: 0 },
        value: { kind: 'solid', material: 999 },
      },
    ],
  } as const;
  return [
    buildStudioGameWorkspaceCommandProposalReadModel({
      workspace,
      attachHash: 'fixture:devtools-attach:asha-demo',
      sequenceId: 'seq-1',
      batch,
      status: 'accepted',
      result: {
        accepted: 1,
        rejected: 0,
        rejections: [],
      },
      authorityHashAfter: 'authority:after:accepted',
    }),
    buildStudioGameWorkspaceCommandProposalReadModel({
      workspace,
      attachHash: 'fixture:devtools-attach:asha-demo',
      sequenceId: 'seq-2',
      batch: rejectedBatch,
      status: 'rejected',
      result: {
        accepted: 0,
        rejected: 1,
        rejections: [{ reason: 'unknownMaterial', material: 999 }],
      },
      authorityHashAfter: 'authority:after:rejected',
      rejectionReason: 'authority_rejected',
    }),
  ];
}

function firstDiagnosticMessage(
  diagnostics: readonly { readonly message: string }[],
  fallback: string,
): string {
  return diagnostics[0]?.message ?? fallback;
}

const SUPPORTED_VOXEL_CONVERSION_CATALOG_SOURCE_KINDS = ['static_mesh'] as const;
const SUPPORTED_VOXEL_CONVERSION_AUTHORITY_SOURCE_KINDS = ['mesh'] as const;

function voxelConversionAuthoritySourceKind(catalogKind: string): string {
  return catalogKind === 'static_mesh' ? 'mesh' : catalogKind;
}

const DEFAULT_VOXEL_CONVERSION_DRAFT: StudioVoxelConversionSettingsDraft = {
  selectedSourceAssetId: 'mesh/import-fixture-a',
  mode: 'surface',
  fitPolicy: 'contain',
  originPolicy: 'target_min',
  resolution: [8, 8, 8],
  voxelSize: 0.25,
  maxOutputVoxels: 1024,
  transformScale: 1,
  transformTranslation: [0, 0, 0],
  targetGrid: 1,
  targetVolumeAssetId: 'voxel/generated',
  targetOrigin: [0, 0, 0],
  meshPrimitive: 'default',
  materialMap: {
    defaultVoxelMaterial: 1,
    textureAssets: [],
    textureBindings: [],
    entries: [
      {
        sourceMaterialSlot: 0,
        sourceMaterialId: 'material.demo-copper',
        voxelMaterial: 1,
      },
    ],
  },
};

const AGENT_VOXEL_WORKFLOW_SUPPORTED_OPERATIONS: readonly StudioAgentVoxelWorkflowOperationKind[] = [
  'inspect',
  'register_conversion_source',
  'register_conversion_mesh_asset',
  'import_conversion_mesh_source',
  'configure_conversion',
  'run_conversion',
  'get_model_info',
  'get_model_window',
  'export_voxel_volume_asset',
  'save_voxel_volume_asset',
  'load_voxel_volume_asset',
  'unload_voxel_volume_asset',
  'initialize_voxel_volume_authoring',
  'view_from_angle',
  'publish_preview',
  'persist_voxel_asset',
  'reopen_voxel_asset',
  'submit_voxel_edit',
  'submit_compact_voxel_edit',
];
const AGENT_VOXEL_EDIT_MAX_COMMANDS = 64;
const AGENT_VOXEL_EDIT_COORDINATE_ABS_LIMIT = 1024;
const AGENT_COMPACT_VOXEL_AFFORDANCES: readonly StudioAgentCompactVoxelEdit['kind'][] = [
  'set_voxels',
  'set_voxels_runs',
  'fill_box',
  'apply_voxel_primitives',
];
const AGENT_VOXEL_VIEW_ANGLES: readonly StudioAgentVoxelViewAngle[] = [
  'front',
  'back',
  'left',
  'right',
  'top',
  'isometric',
];
const STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_NON_CLAIMS = [
  'not_vforge_file',
  'not_mcp_transport',
  'not_raw_runtime_bridge_dispatch',
  'not_runtime_authority',
  'not_private_studio_state_mutation',
] as const;
const STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_KIND = 'studio_agent_voxel_operation_transcript' as const;
const STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_VERSION = 'studio-agent-voxel-operation-transcript.v0' as const;
const STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_REPLAY_KIND = 'studio_agent_voxel_operation_transcript_replay' as const;
const STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_REPLAY_VERSION = 'studio-agent-voxel-operation-transcript-replay.v0' as const;
const AGENT_VOXEL_TRANSCRIPT_ALLOWED_TOP_LEVEL_KEYS = [
  'artifactKind',
  'artifactVersion',
  'producer',
  'target',
  'operations',
  'nonClaims',
] as const;
const AGENT_VOXEL_TRANSCRIPT_ALLOWED_OPERATION_KEYS = ['operationId', 'kind', 'input', 'expected'] as const;
const AGENT_VOXEL_TRANSCRIPT_INPUT_KEYS: Readonly<Record<StudioAgentVoxelWorkflowOperationKind, readonly string[]>> = {
  inspect: [],
  register_conversion_source: ['registration'],
  register_conversion_mesh_asset: ['registration'],
  import_conversion_mesh_source: ['importRequest'],
  configure_conversion: ['patch'],
  run_conversion: ['commandId'],
  get_model_info: ['request'],
  get_model_window: ['request'],
  export_voxel_volume_asset: ['exportRequest'],
  save_voxel_volume_asset: ['saveRequest'],
  load_voxel_volume_asset: ['loadRequest'],
  unload_voxel_volume_asset: ['unloadRequest'],
  initialize_voxel_volume_authoring: ['initializeRequest'],
  view_from_angle: ['view'],
  publish_preview: ['publication'],
  persist_voxel_asset: ['persistence'],
  reopen_voxel_asset: ['reopen'],
  submit_voxel_edit: ['batch'],
  submit_compact_voxel_edit: ['edit'],
};

function stableAgentVoxelWorkflowHash(label: string, value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) >>> 0;
  }
  return `${label}-${hash.toString(16).padStart(8, '0')}`;
}

function isAgentVoxelTranscriptRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function agentVoxelTranscriptRecordKeysDiagnostic(
  value: Readonly<Record<string, unknown>>,
  allowedKeys: readonly string[],
  label: string,
): string | null {
  const disallowed = Object.keys(value).find(key => !allowedKeys.includes(key));
  return disallowed === undefined ? null : `${label} contains unsupported field ${disallowed}`;
}

function agentVoxelTranscriptForbiddenShapeDiagnostic(value: unknown, path = 'transcript'): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const diagnostic = agentVoxelTranscriptForbiddenShapeDiagnostic(value[index], `${path}[${index}]`);
      if (diagnostic !== null) return diagnostic;
    }
    return null;
  }
  if (isAgentVoxelTranscriptRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (['method', 'methodname', 'args', 'rpc', 'rawmethod', 'rawruntimebridgecall'].includes(lowerKey)) {
        return `raw RuntimeBridge or method dispatch is not accepted in voxel transcripts (${path}.${key})`;
      }
      if (['privatepath', 'storepath', 'privateimport', 'generatedcontractimport'].includes(lowerKey)) {
        return `private Studio or generated-contract paths are not accepted in voxel transcripts (${path}.${key})`;
      }
      if (['mcptool', 'mcptransport', 'mcpcall'].includes(lowerKey)) {
        return `MCP transport calls are not accepted in voxel transcripts (${path}.${key})`;
      }
      if (['vforgepath', 'vforgefile'].includes(lowerKey)) {
        return `VoxelForge .vforge files are not accepted in voxel transcripts (${path}.${key})`;
      }
      const diagnostic = agentVoxelTranscriptForbiddenShapeDiagnostic(child, `${path}.${key}`);
      if (diagnostic !== null) return diagnostic;
    }
    return null;
  }
  if (typeof value === 'string') {
    if (value.includes('.vforge')) {
      return `VoxelForge .vforge files are not accepted in voxel transcripts (${path})`;
    }
    if (value.startsWith('mcp://') || value === 'voxelforge_mcp_transport') {
      return `MCP transport calls are not accepted in voxel transcripts (${path})`;
    }
    if (
      value.includes('@asha/contracts/private')
      || value.includes(['', 'src', 'generated'].join('/'))
      || value.includes(['', 'src', 'generated'].join('\\'))
    ) {
      return `generated-contract import paths are not accepted in voxel transcripts (${path})`;
    }
    if (value.includes('RuntimeBridge.') || value.includes('runtimeSessionFacadeState') || value.includes('workspaceState.')) {
      return `private RuntimeBridge or Studio store paths are not accepted in voxel transcripts (${path})`;
    }
  }
  return null;
}

function isAgentVoxelTranscriptOperationKind(value: unknown): value is StudioAgentVoxelWorkflowOperationKind {
  return typeof value === 'string'
    && AGENT_VOXEL_WORKFLOW_SUPPORTED_OPERATIONS.includes(value as StudioAgentVoxelWorkflowOperationKind);
}

function agentVoxelTranscriptExpectedAccepted(value: unknown): boolean | null {
  if (!isAgentVoxelTranscriptRecord(value)) return null;
  const expected = value['accepted'];
  return typeof expected === 'boolean' ? expected : null;
}

function agentVoxelTranscriptOperationToWorkflowOperation(
  operation: StudioAgentVoxelOperationTranscriptEntry,
): StudioAgentVoxelWorkflowOperation {
  const input = operation.input ?? {};
  return {
    kind: operation.kind,
    ...input,
  } as StudioAgentVoxelWorkflowOperation;
}

export function parseStudioAgentVoxelOperationTranscript(
  value: unknown,
): StudioAgentVoxelOperationTranscriptValidationResult {
  const transcriptHash = stableAgentVoxelWorkflowHash('studio-agent-voxel-operation-transcript-input', value);
  const forbiddenDiagnostic = agentVoxelTranscriptForbiddenShapeDiagnostic(value);
  if (forbiddenDiagnostic !== null) {
    return { accepted: false, diagnostic: forbiddenDiagnostic, transcript: null, transcriptHash };
  }
  if (!isAgentVoxelTranscriptRecord(value)) {
    return {
      accepted: false,
      diagnostic: 'voxel operation transcript must be a JSON object',
      transcript: null,
      transcriptHash,
    };
  }
  const topLevelDiagnostic = agentVoxelTranscriptRecordKeysDiagnostic(
    value,
    AGENT_VOXEL_TRANSCRIPT_ALLOWED_TOP_LEVEL_KEYS,
    'voxel operation transcript',
  );
  if (topLevelDiagnostic !== null) {
    return { accepted: false, diagnostic: topLevelDiagnostic, transcript: null, transcriptHash };
  }
  if (value['artifactKind'] !== STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_KIND) {
    return {
      accepted: false,
      diagnostic: 'voxel operation transcript artifactKind must be studio_agent_voxel_operation_transcript',
      transcript: null,
      transcriptHash,
    };
  }
  if (value['artifactVersion'] !== STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_VERSION) {
    return {
      accepted: false,
      diagnostic: 'voxel operation transcript artifactVersion must be studio-agent-voxel-operation-transcript.v0',
      transcript: null,
      transcriptHash,
    };
  }
  const producer = value['producer'];
  if (!isAgentVoxelTranscriptRecord(producer) || typeof producer['kind'] !== 'string' || typeof producer['id'] !== 'string') {
    return {
      accepted: false,
      diagnostic: 'voxel operation transcript producer must include string kind and id',
      transcript: null,
      transcriptHash,
    };
  }
  const target = value['target'];
  if (
    !isAgentVoxelTranscriptRecord(target)
    || target['studioSurfaceVersion'] !== 'studio-agent-voxel-workflow.v0'
  ) {
    return {
      accepted: false,
      diagnostic: 'voxel operation transcript target must use studio-agent-voxel-workflow.v0',
      transcript: null,
      transcriptHash,
    };
  }
  const operationsValue = value['operations'];
  if (!Array.isArray(operationsValue) || operationsValue.length === 0) {
    return {
      accepted: false,
      diagnostic: 'voxel operation transcript requires at least one operation',
      transcript: null,
      transcriptHash,
    };
  }
  const nonClaims = value['nonClaims'];
  if (
    !Array.isArray(nonClaims)
    || !STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_NON_CLAIMS.every(claim => nonClaims.includes(claim))
  ) {
    return {
      accepted: false,
      diagnostic: 'voxel operation transcript must carry the ASHA-native non-claims',
      transcript: null,
      transcriptHash,
    };
  }

  const operations: StudioAgentVoxelOperationTranscriptEntry[] = [];
  for (let index = 0; index < operationsValue.length; index += 1) {
    const operationValue = operationsValue[index];
    if (!isAgentVoxelTranscriptRecord(operationValue)) {
      return {
        accepted: false,
        diagnostic: `voxel operation transcript operation ${index} must be an object`,
        transcript: null,
        transcriptHash,
      };
    }
    const operationKeysDiagnostic = agentVoxelTranscriptRecordKeysDiagnostic(
      operationValue,
      AGENT_VOXEL_TRANSCRIPT_ALLOWED_OPERATION_KEYS,
      `voxel operation transcript operation ${index}`,
    );
    if (operationKeysDiagnostic !== null) {
      return { accepted: false, diagnostic: operationKeysDiagnostic, transcript: null, transcriptHash };
    }
    const kind = operationValue['kind'];
    if (!isAgentVoxelTranscriptOperationKind(kind)) {
      return {
        accepted: false,
        diagnostic: `voxel operation transcript operation ${index} has unsupported kind ${String(kind)}`,
        transcript: null,
        transcriptHash,
      };
    }
    const operationId = operationValue['operationId'];
    if (typeof operationId !== 'string' || operationId.length === 0) {
      return {
        accepted: false,
        diagnostic: `voxel operation transcript operation ${index} requires a non-empty operationId`,
        transcript: null,
        transcriptHash,
      };
    }
    const inputValue = operationValue['input'];
    if (inputValue !== undefined && !isAgentVoxelTranscriptRecord(inputValue)) {
      return {
        accepted: false,
        diagnostic: `voxel operation transcript operation ${operationId} input must be an object`,
        transcript: null,
        transcriptHash,
      };
    }
    const input = inputValue === undefined ? {} : inputValue;
    const allowedInputKeys = AGENT_VOXEL_TRANSCRIPT_INPUT_KEYS[kind];
    const disallowedInputKey = Object.keys(input).find(key => !allowedInputKeys.includes(key));
    if (disallowedInputKey !== undefined) {
      return {
        accepted: false,
        diagnostic: `voxel operation transcript operation ${operationId} has unsupported input field ${disallowedInputKey}`,
        transcript: null,
        transcriptHash,
      };
    }
    const missingInputKey = allowedInputKeys.find(key => kind !== 'publish_preview' && input[key] === undefined);
    if (missingInputKey !== undefined) {
      return {
        accepted: false,
        diagnostic: `voxel operation transcript operation ${operationId} is missing input field ${missingInputKey}`,
        transcript: null,
        transcriptHash,
      };
    }
    const expectedValue = operationValue['expected'];
    if (expectedValue !== undefined) {
      if (!isAgentVoxelTranscriptRecord(expectedValue)) {
        return {
          accepted: false,
          diagnostic: `voxel operation transcript operation ${operationId} expected must be an object`,
          transcript: null,
          transcriptHash,
        };
      }
      const expectedKeysDiagnostic = agentVoxelTranscriptRecordKeysDiagnostic(
        expectedValue,
        ['accepted'],
        `voxel operation transcript operation ${operationId} expected`,
      );
      if (expectedKeysDiagnostic !== null) {
        return { accepted: false, diagnostic: expectedKeysDiagnostic, transcript: null, transcriptHash };
      }
      if (expectedValue['accepted'] !== undefined && typeof expectedValue['accepted'] !== 'boolean') {
        return {
          accepted: false,
          diagnostic: `voxel operation transcript operation ${operationId} expected.accepted must be boolean`,
          transcript: null,
          transcriptHash,
        };
      }
    }
    operations.push({
      operationId,
      kind,
      input,
      ...(expectedValue === undefined ? {} : { expected: expectedValue as { readonly accepted?: boolean } }),
    });
  }

  const transcript: StudioAgentVoxelOperationTranscript = {
    artifactKind: STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_KIND,
    artifactVersion: STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_VERSION,
    producer: {
      kind: producer['kind'],
      id: producer['id'],
      ...(typeof producer['label'] === 'string' ? { label: producer['label'] } : {}),
    },
    target: {
      studioSurfaceVersion: 'studio-agent-voxel-workflow.v0',
      ...(typeof target['projectBundle'] === 'string' ? { projectBundle: target['projectBundle'] } : {}),
      ...(typeof target['runtimeMode'] === 'string' ? { runtimeMode: target['runtimeMode'] } : {}),
    },
    operations,
    nonClaims: STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_NON_CLAIMS,
  };
  return {
    accepted: true,
    diagnostic: null,
    transcript,
    transcriptHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-operation-transcript', transcript),
  };
}

function buildStudioAgentVoxelTranscriptReplayReceipt(options: {
  readonly validation: StudioAgentVoxelOperationTranscriptValidationResult;
  readonly operations: readonly StudioAgentVoxelOperationTranscriptReplayOperationReceipt[];
}): StudioAgentVoxelOperationTranscriptReplayReceipt {
  const transcript = options.validation.transcript;
  const operationCount = options.operations.length;
  const acceptedOperationCount = options.operations.filter(operation => operation.accepted).length;
  const body = {
    artifactKind: STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_REPLAY_KIND,
    artifactVersion: STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_REPLAY_VERSION,
    transcriptArtifactKind: transcript?.artifactKind ?? null,
    transcriptArtifactVersion: transcript?.artifactVersion ?? null,
    transcriptHash: options.validation.transcriptHash,
    replayed: options.validation.accepted,
    accepted: options.validation.accepted && options.operations.every(operation => operation.expectationMatched),
    diagnostic: options.validation.accepted
      ? options.operations.find(operation => !operation.expectationMatched)?.diagnostic ?? null
      : options.validation.diagnostic,
    producerId: transcript?.producer.id ?? null,
    operationCount,
    acceptedOperationCount,
    rejectedOperationCount: operationCount - acceptedOperationCount,
    operations: options.operations,
    nonClaims: STUDIO_AGENT_VOXEL_OPERATION_TRANSCRIPT_NON_CLAIMS,
  };
  return {
    ...body,
    receiptHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-operation-transcript-replay', body),
  };
}

function viewportDistance(camera: StudioViewportCameraReadModel): number {
  return Math.max(
    1,
    Math.hypot(
      camera.position.x - camera.target.x,
      camera.position.y - camera.target.y,
      camera.position.z - camera.target.z,
    ),
  );
}

function cameraForVoxelViewAngle(
  baseCamera: StudioViewportCameraReadModel,
  angle: StudioAgentVoxelViewAngle,
): StudioViewportCameraReadModel {
  const target = baseCamera.target;
  const distance = viewportDistance(baseCamera);
  const raised = Math.max(0.5, distance * 0.18);
  const diagonal = distance / Math.sqrt(3);
  const offsetByAngle: Record<StudioAgentVoxelViewAngle, StudioViewportCameraReadModel['position']> = {
    front: { x: 0, y: -distance, z: raised },
    back: { x: 0, y: distance, z: raised },
    left: { x: -distance, y: 0, z: raised },
    right: { x: distance, y: 0, z: raised },
    top: { x: 0, y: 0, z: distance },
    isometric: { x: diagonal, y: -diagonal, z: diagonal },
  };
  const up = angle === 'top' ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
  const offset = offsetByAngle[angle];
  return buildStudioViewportCameraReadModel({
    ...baseCamera,
    position: {
      x: target.x + offset.x,
      y: target.y + offset.y,
      z: target.z + offset.z,
    },
    target,
    up,
  });
}

export function buildStudioAgentVoxelViewCaptureReadModel(options: {
  readonly workspace: StudioWorkspaceReadModel;
  readonly viewportTool: StudioViewportToolReadModel;
  readonly renderSettings: StudioRenderSettingsReadModel;
  readonly readbackMarker: string;
  readonly angle: StudioAgentVoxelViewAngle;
  readonly target?: 'selected' | 'scene';
}): StudioAgentVoxelViewCaptureReadModel {
  const target = options.target ?? 'selected';
  const targetRenderableId = target === 'selected' ? options.workspace.scene.selectedRenderableId : null;
  const framedCamera =
    target === 'selected'
      ? frameStudioViewportCameraOnRenderable(options.workspace.scene, targetRenderableId)
      : frameStudioViewportCamera(options.workspace.scene);
  const camera = cameraForVoxelViewAngle(framedCamera, options.angle);
  const viewport = buildStudioViewportAdapterReadModel({
    scene: options.workspace.scene,
    camera,
    tool: options.viewportTool,
    renderSettings: options.renderSettings,
  });
  const body = {
    captureVersion: 'studio-agent-voxel-view-capture.v0' as const,
    angle: options.angle,
    target,
    targetRenderableId,
    sessionId: options.workspace.session.sessionId,
    sceneHash: options.workspace.scene.sceneHash,
    readbackMarker: options.readbackMarker,
    camera,
    viewport: {
      cameraHash: camera.cameraHash,
      readbackHash: viewport.readbackHash,
      selectedRenderableId: options.workspace.scene.selectedRenderableId,
    },
    evidenceKind: 'projection_view_readout' as const,
    nonClaims: [
      'not_runtime_authority',
      'not_hardware_gpu_capture',
      'not_voxelforge_viewer',
      'not_browser_screenshot',
    ] as const,
  };
  return {
    ...body,
    captureHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-view-capture', body),
  };
}

function agentVoxelViewAngleDiagnostic(angle: unknown): string | null {
  return typeof angle === 'string' && AGENT_VOXEL_VIEW_ANGLES.includes(angle as StudioAgentVoxelViewAngle)
    ? null
    : `unsupported voxel view angle ${String(angle)}`;
}

function agentVoxelPreviewArtifactPathDiagnostic(path: string): string | null {
  if (!path.startsWith('artifacts/')) {
    return 'voxel preview publication path must stay under artifacts/';
  }
  if (path.includes('..') || path.includes('\\') || path.startsWith('/')) {
    return 'voxel preview publication path must be a relative artifacts path without traversal';
  }
  if (!path.endsWith('.json')) {
    return 'voxel preview publication path must be a json artifact';
  }
  return null;
}

export function buildStudioAgentVoxelPreviewPublicationReadModel(options: {
  readonly workspace: StudioWorkspaceReadModel;
  readonly shell: StudioVoxelConversionWorkspaceShellReadModel;
  readonly viewport: StudioViewportAdapterReadModel;
  readonly readbackMarker: string;
  readonly artifactPath?: string;
  readonly label?: string;
}): StudioAgentVoxelPreviewPublicationReadModel {
  const artifactPath = options.artifactPath ?? 'artifacts/agent-voxel-preview/latest/index.json';
  const sourceEvidenceRefs = options.shell.evidenceRows
    .filter(row => row.status === 'available')
    .map(row => ({
      source: row.source,
      kind: row.kind,
      uri: row.uri,
      contentHash: row.contentHash,
    }));
  const body = {
    artifactKind: 'studio_agent_voxel_preview_publication' as const,
    artifactVersion: 'studio-agent-voxel-preview-publication.v0' as const,
    label: options.label ?? 'Agent voxel preview',
    artifactPath,
    sessionId: options.workspace.session.sessionId,
    sceneHash: options.workspace.scene.sceneHash,
    readbackMarker: options.readbackMarker,
    conversion: {
      readoutHash: options.shell.readout.readoutHash,
      status: options.shell.readout.status,
      authorityPosture: options.shell.readout.authorityPosture,
      outputVoxelCount: options.shell.previewProjection.outputVoxelCount,
      outputBoundsLabel: options.shell.previewProjection.outputBoundsLabel,
      evidenceKinds: Array.from(new Set(sourceEvidenceRefs.map(ref => ref.kind))),
      sourceEvidenceRefs,
    },
    viewport: {
      cameraHash: options.viewport.camera.cameraHash,
      readbackHash: options.viewport.readbackHash,
      selectedRenderableId: options.workspace.scene.selectedRenderableId,
    },
    nonClaims: [
      'not_vforge_file',
      'not_runtime_authority',
      'not_hardware_gpu_capture',
      'not_arbitrary_filesystem_write',
    ] as const,
  };
  return {
    ...body,
    publicationHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-preview-publication', body),
  };
}

function agentVoxelAssetArtifactPath(assetId: string): string {
  const safeName = assetId.replace(/^voxel-volume\//, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `artifacts/agent-voxel-assets/latest/${safeName}.${VOXEL_ASSET_EXTENSION}`;
}

function agentVoxelAssetArtifactPathDiagnostic(path: string): string | null {
  if (!path.startsWith('artifacts/')) {
    return 'voxel asset artifact path must stay under artifacts/';
  }
  if (path.includes('..') || path.includes('\\') || path.startsWith('/')) {
    return 'voxel asset artifact path must be a relative artifacts path without traversal';
  }
  if (!path.endsWith(`.${VOXEL_ASSET_EXTENSION}`)) {
    return `voxel asset artifact path must end with .${VOXEL_ASSET_EXTENSION}`;
  }
  return null;
}

function normalizeVoxelVolumeAssetId(assetId: string): string {
  if (assetId.startsWith('voxel-volume/')) {
    return assetId;
  }
  if (assetId.startsWith('voxel/')) {
    return `voxel-volume/${assetId.slice('voxel/'.length)}`;
  }
  return `voxel-volume/${assetId.replace(/^\/+/, '')}`;
}

function normalizeMaterialAssetId(material: number, materialAssetId: string | null | undefined): string {
  if (typeof materialAssetId === 'string' && materialAssetId.startsWith('material/')) {
    return materialAssetId;
  }
  if (typeof materialAssetId === 'string' && materialAssetId.startsWith('material.')) {
    return `material/${materialAssetId.slice('material.'.length)}`;
  }
  return `material/voxel-${material}`;
}

type StudioVoxelAssetSolidVoxel = {
  readonly coord: VoxelCoord;
  readonly material: number;
};

function solidVoxelsFromBatch(batch: CommandBatch): readonly StudioVoxelAssetSolidVoxel[] {
  const cells = new Map<string, StudioVoxelAssetSolidVoxel>();
  for (const command of batch.commands) {
    if (command.op !== 'setVoxel') {
      continue;
    }
    const key = `${command.coord.x},${command.coord.y},${command.coord.z}`;
    if (command.value.kind === 'empty') {
      cells.delete(key);
      continue;
    }
    cells.set(key, {
      coord: command.coord,
      material: command.value.material,
    });
  }
  return Array.from(cells.values()).sort(compareSolidVoxels);
}

function compareSolidVoxels(a: StudioVoxelAssetSolidVoxel, b: StudioVoxelAssetSolidVoxel): number {
  return a.coord.z - b.coord.z
    || a.coord.y - b.coord.y
    || a.coord.x - b.coord.x
    || a.material - b.material;
}

function sparseRunsFromSolidVoxels(voxels: readonly StudioVoxelAssetSolidVoxel[]): readonly VoxelAssetSparseRun[] {
  const sorted = [...voxels].sort(compareSolidVoxels);
  const runs: VoxelAssetSparseRun[] = [];
  for (const voxel of sorted) {
    const last = runs.at(-1);
    if (
      last !== undefined
      && last.start.y === voxel.coord.y
      && last.start.z === voxel.coord.z
      && last.material === voxel.material
      && last.start.x + last.length === voxel.coord.x
    ) {
      runs[runs.length - 1] = {
        ...last,
        length: last.length + 1,
      };
      continue;
    }
    runs.push({
      start: voxel.coord,
      length: 1,
      material: voxel.material,
    });
  }
  return runs;
}

function subtractVoxelAnnotationSparseRuns(
  sourceRuns: readonly VoxelAnnotationSparseRun[],
  removals: readonly VoxelAnnotationSparseRun[],
): readonly VoxelAnnotationSparseRun[] {
  const remaining: VoxelAnnotationSparseRun[] = [];
  for (const source of sourceRuns) {
    let fragments: readonly { readonly start: number; readonly end: number }[] = [{
      start: source.start.x,
      end: source.start.x + source.length - 1,
    }];
    for (const removal of removals) {
      if (removal.length <= 0 || removal.start.y !== source.start.y || removal.start.z !== source.start.z) continue;
      const removalStart = removal.start.x;
      const removalEnd = removal.start.x + removal.length - 1;
      fragments = fragments.flatMap(fragment => {
        if (removalEnd < fragment.start || removalStart > fragment.end) return [fragment];
        const next: { start: number; end: number }[] = [];
        if (fragment.start < removalStart) next.push({ start: fragment.start, end: removalStart - 1 });
        if (removalEnd < fragment.end) next.push({ start: removalEnd + 1, end: fragment.end });
        return next;
      });
    }
    for (const fragment of fragments) {
      remaining.push({
        start: { x: fragment.start, y: source.start.y, z: source.start.z },
        length: fragment.end - fragment.start + 1,
      });
    }
  }
  return remaining.sort((left, right) =>
    left.start.z - right.start.z
    || left.start.y - right.start.y
    || left.start.x - right.start.x,
  );
}

function boundsFromSolidVoxels(voxels: readonly StudioVoxelAssetSolidVoxel[]): VoxelVolumeAsset['bounds'] {
  const first = voxels[0];
  if (first === undefined) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }
  let minX = first.coord.x;
  let minY = first.coord.y;
  let minZ = first.coord.z;
  let maxX = first.coord.x;
  let maxY = first.coord.y;
  let maxZ = first.coord.z;
  for (const voxel of voxels) {
    minX = Math.min(minX, voxel.coord.x);
    minY = Math.min(minY, voxel.coord.y);
    minZ = Math.min(minZ, voxel.coord.z);
    maxX = Math.max(maxX, voxel.coord.x);
    maxY = Math.max(maxY, voxel.coord.y);
    maxZ = Math.max(maxZ, voxel.coord.z);
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

function voxelAssetBoundsLabel(bounds: VoxelVolumeAsset['bounds']): string {
  return `[${bounds.min.x},${bounds.min.y},${bounds.min.z}] to [${bounds.max.x},${bounds.max.y},${bounds.max.z}]`;
}

function materialPaletteFromVoxels(
  voxels: readonly StudioVoxelAssetSolidVoxel[],
  materialAssetIds: ReadonlyMap<number, string | null>,
): readonly VoxelAssetMaterialBinding[] {
  return Array.from(new Set(voxels.map(voxel => voxel.material)))
    .sort((a, b) => a - b)
    .map(material => {
      const materialAssetId = normalizeMaterialAssetId(material, materialAssetIds.get(material));
      const materialSlug = materialAssetId.replace(/^material\//, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
      return {
        voxelMaterial: material,
        paletteEntryId: `voxel-material/${materialSlug}`,
        displayName: `Voxel material ${material}`,
        materialAssetId,
        materialCatalogBindingId: materialAssetIds.get(material) === null || materialAssetIds.get(material) === undefined
          ? null
          : `catalog-binding/${materialSlug}`,
      };
    });
}

const VOXEL_ASSET_COORDINATE_SYSTEM = 'y_up_right_handed';

function isVoxelAssetFloatPath(path: readonly string[]): boolean {
  return (
    (path.length === 3 && path[0] === 'grid' && path[1] === 'origin')
    || (path.length === 2 && path[0] === 'grid' && path[1] === 'cellSize')
  );
}

function canonicalVoxelAssetNumber(value: number, path: readonly string[]): string {
  if (!Number.isFinite(value)) {
    throw new Error(`voxel asset JSON number must be finite at ${path.join('.') || '<root>'}`);
  }
  if (isVoxelAssetFloatPath(path) && Number.isInteger(value)) {
    return `${value.toString()}.0`;
  }
  return value.toString();
}

function canonicalVoxelAssetJsonValue(value: unknown, indent = 0, path: readonly string[] = []): string {
  const padding = ' '.repeat(indent);
  const childPadding = ' '.repeat(indent + 2);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return [
      '[',
      value
        .map((item, index) => `${childPadding}${canonicalVoxelAssetJsonValue(item, indent + 2, [...path, String(index)])}`)
        .join(',\n'),
      `${padding}]`,
    ].join('\n');
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    if (entries.length === 0) {
      return '{}';
    }
    return [
      '{',
      entries
        .map(([key, inner]) => (
          `${childPadding}${JSON.stringify(key)}: ${canonicalVoxelAssetJsonValue(inner, indent + 2, [...path, key])}`
        ))
        .join(',\n'),
      `${padding}}`,
    ].join('\n');
  }
  if (typeof value === 'number') {
    return canonicalVoxelAssetNumber(value, path);
  }
  if (typeof value === 'string' || typeof value === 'boolean' || value === null) {
    return JSON.stringify(value);
  }
  throw new Error(`unsupported voxel asset JSON value at ${path.join('.') || '<root>'}`);
}

function canonicalVoxelAssetJson(asset: VoxelVolumeAsset): string {
  return `${canonicalVoxelAssetJsonValue(asset)}\n`;
}

const FNV64_OFFSET = 0xcbf29ce484222325n;
const FNV64_PRIME = 0x100000001b3n;
const FNV64_MASK = 0xffffffffffffffffn;

function fnv1a64Bytes(bytes: readonly number[]): string {
  let hash = FNV64_OFFSET;
  for (const byte of bytes) {
    hash ^= BigInt(byte & 0xff);
    hash = (hash * FNV64_PRIME) & FNV64_MASK;
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

function utf8Bytes(text: string): readonly number[] {
  return Array.from(new TextEncoder().encode(text));
}

function littleEndianBytes(value: bigint, byteCount: number): number[] {
  const bytes: number[] = [];
  let current = value;
  for (let index = 0; index < byteCount; index += 1) {
    bytes.push(Number(current & 0xffn));
    current >>= 8n;
  }
  return bytes;
}

function voxelAssetDataHash(runs: readonly VoxelAssetSparseRun[]): string {
  const bytes: number[] = [];
  for (const run of runs) {
    bytes.push(...littleEndianBytes(BigInt.asUintN(64, BigInt(run.start.x)), 8));
    bytes.push(...littleEndianBytes(BigInt.asUintN(64, BigInt(run.start.y)), 8));
    bytes.push(...littleEndianBytes(BigInt.asUintN(64, BigInt(run.start.z)), 8));
    bytes.push(...littleEndianBytes(BigInt(run.length >>> 0), 4));
    bytes.push(...littleEndianBytes(BigInt(run.material & 0xffff), 2));
  }
  return fnv1a64Bytes(bytes);
}

function computeVoxelAssetHashes(asset: VoxelVolumeAsset): VoxelAssetContentHashes {
  const normalized: VoxelVolumeAsset = {
    ...asset,
    contentHashes: {
      canonicalJson: '',
      voxelData: '',
    },
  };
  return {
    canonicalJson: fnv1a64Bytes(utf8Bytes(canonicalVoxelAssetJson(normalized))),
    voxelData: voxelAssetDataHash(asset.representation.sparseRuns),
  };
}

function withComputedVoxelAssetHashes(asset: VoxelVolumeAsset): VoxelVolumeAsset {
  return {
    ...asset,
    contentHashes: computeVoxelAssetHashes(asset),
  };
}

function validationDiagnostic(
  code: VoxelAssetDiagnostic['code'],
  reference: string,
  message: string,
  severity: VoxelAssetDiagnostic['severity'] = 'error',
): VoxelAssetDiagnostic {
  return { code, severity, reference, message };
}

function buildVoxelAssetFromSolidVoxels(options: {
  readonly assetId: string;
  readonly label: string;
  readonly voxels: readonly StudioVoxelAssetSolidVoxel[];
  readonly materialAssetIds: ReadonlyMap<number, string | null>;
  readonly provenanceKind: VoxelAssetProvenanceKind;
  readonly provenanceUri: string;
  readonly provenanceHash: string;
  readonly cellSize: number;
  readonly origin: readonly [number, number, number];
  readonly diagnostics?: readonly VoxelAssetDiagnostic[];
}): VoxelVolumeAsset {
  const runs = sparseRunsFromSolidVoxels(options.voxels);
  const withoutHashes: VoxelVolumeAsset = {
    assetId: normalizeVoxelVolumeAssetId(options.assetId),
    schemaVersion: VOXEL_ASSET_SCHEMA_VERSION,
    mediaType: VOXEL_ASSET_MEDIA_TYPE,
    grid: {
      origin: options.origin,
      cellSize: options.cellSize,
      coordinateSystem: VOXEL_ASSET_COORDINATE_SYSTEM,
    },
    bounds: boundsFromSolidVoxels(options.voxels),
    representation: {
      kind: 'sparse_runs',
      sparseRuns: runs,
    },
    materialPalette: materialPaletteFromVoxels(options.voxels, options.materialAssetIds),
    provenance: [{
      kind: options.provenanceKind,
      uri: options.provenanceUri,
      contentHash: options.provenanceHash,
    }],
    authoring: {
      label: options.label,
      createdBy: 'codex-asha-studio',
      sourceTool: 'asha-studio',
    },
    validationDiagnostics: options.diagnostics ?? [],
    contentHashes: {
      canonicalJson: '',
      voxelData: '',
    },
  };
  return withComputedVoxelAssetHashes(withoutHashes);
}

export function buildStudioAgentVoxelAssetPersistenceReadModel(options: {
  readonly workspace: StudioWorkspaceReadModel;
  readonly shell: StudioVoxelConversionWorkspaceShellReadModel;
  readonly source: StudioAgentVoxelAssetPersistenceSource;
  readonly assetId: string;
  readonly artifactPath?: string;
  readonly label?: string;
}): StudioAgentVoxelAssetPersistenceReadModel {
  const assetId = normalizeVoxelVolumeAssetId(options.assetId);
  const artifactPath = options.artifactPath ?? agentVoxelAssetArtifactPath(assetId);
  const label = options.label ?? 'Agent voxel asset';
  let voxels: readonly StudioVoxelAssetSolidVoxel[];
  let provenanceKind: VoxelAssetProvenanceKind;
  let provenanceUri: string;
  let provenanceHash: string;
  let sourceKind: 'conversion_preview' | 'command_batch';
  let outputVoxelCount: number;
  let evidenceKinds: readonly string[];
  let cellSize = options.shell.settingsDraft.voxelSize;
  let origin = options.shell.settingsDraft.targetOrigin;
  const materialAssetIds = new Map<number, string | null>();
  const diagnostics: VoxelAssetDiagnostic[] = [];

  for (const row of options.shell.previewProjection.materialRows) {
    materialAssetIds.set(row.voxelMaterial, row.sourceMaterialId);
  }

  if (options.source.kind === 'conversion_preview') {
    const preview = options.shell.workspace.preview;
    voxels = (preview?.sampleVoxels ?? []).map(voxel => ({
      coord: voxel.coord,
      material: voxel.material,
    }));
    provenanceKind = 'converted';
    provenanceUri = preview?.evidence.at(-1)?.uri ?? `asha://studio/voxel-conversion/${options.shell.workspace.readoutHash}`;
    provenanceHash = preview?.outputHash ?? options.shell.workspace.readoutHash;
    sourceKind = 'conversion_preview';
    outputVoxelCount = preview?.outputVoxelCount ?? voxels.length;
    evidenceKinds = Array.from(new Set(options.shell.evidenceRows.filter(row => row.status === 'available').map(row => row.kind)));
    if (preview !== null && preview !== undefined && preview.sampleVoxels.length !== preview.outputVoxelCount) {
      diagnostics.push(validationDiagnostic(
        'invalid_sparse_run',
        'representation.sparseRuns',
        'Studio preview samples do not cover the full conversion output; Rust export must provide the complete asset before save.',
        'warning',
      ));
    }
  } else {
    voxels = solidVoxelsFromBatch(options.source.batch);
    provenanceKind = 'runtime_export';
    provenanceUri = `asha://studio/runtime-session/${options.workspace.session.sessionId}/voxel-command-batch`;
    provenanceHash = fnv1a64Bytes(utf8Bytes(JSON.stringify(options.source.batch)));
    sourceKind = 'command_batch';
    outputVoxelCount = voxels.length;
    evidenceKinds = ['runtime_export'];
    cellSize = 1;
    origin = [0, 0, 0];
  }

  const asset = buildVoxelAssetFromSolidVoxels({
    assetId,
    label,
    voxels,
    materialAssetIds,
    provenanceKind,
    provenanceUri,
    provenanceHash,
    cellSize,
    origin,
    diagnostics,
  });
  const serializedAsset = canonicalVoxelAssetJson(asset);
  const body = {
    artifactKind: 'studio_agent_voxel_asset_persistence' as const,
    artifactVersion: 'studio-agent-voxel-asset-persistence.v0' as const,
    artifactPath,
    label,
    storage: {
      extension: VOXEL_ASSET_EXTENSION,
      mediaType: VOXEL_ASSET_MEDIA_TYPE,
      schemaVersion: VOXEL_ASSET_SCHEMA_VERSION,
      assetPlane: 'ProjectBundle' as const,
      runtimePromotion: 'explicit_runtime_to_stored_export' as const,
    },
    source: {
      kind: sourceKind,
      outputVoxelCount,
      boundsLabel: voxelAssetBoundsLabel(asset.bounds),
      evidenceKinds,
    },
    asset,
    serializedAsset,
    validation: {
      posture: 'studio_shape_check_engine_authority_required' as const,
      authority: 'svc-voxel-asset' as const,
      diagnostics: asset.validationDiagnostics,
    },
    nonClaims: [
      'not_vforge_file',
      'not_runtime_authority',
      'not_engine_validation',
      'not_silent_sessionstate_promotion',
      'not_arbitrary_filesystem_write',
    ] as const,
  };
  return {
    ...body,
    persistenceHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-asset-persistence', body),
  };
}

export function buildStudioAgentVoxelAssetReopenReadModel(options: {
  readonly asset: VoxelVolumeAsset;
  readonly artifactPath?: string;
  readonly expectedAssetId?: string;
  readonly expectedCanonicalJsonHash?: string;
}): StudioAgentVoxelAssetReopenReadModel {
  const artifactPath = options.artifactPath ?? agentVoxelAssetArtifactPath(options.asset.assetId);
  const reopenedHash = computeVoxelAssetHashes(options.asset).canonicalJson;
  const expectedHash = options.expectedCanonicalJsonHash ?? options.asset.contentHashes.canonicalJson;
  const expectedAssetId = options.expectedAssetId ?? options.asset.assetId;
  const voxelCount = options.asset.representation.sparseRuns.reduce((total, run) => total + run.length, 0);
  return {
    artifactKind: 'studio_agent_voxel_asset_reopen',
    artifactVersion: 'studio-agent-voxel-asset-reopen.v0',
    artifactPath,
    assetId: options.asset.assetId,
    mediaType: options.asset.mediaType,
    schemaVersion: options.asset.schemaVersion,
    reopenedHash,
    expectedHash,
    roundTripMatches: options.asset.assetId === expectedAssetId && reopenedHash === expectedHash,
    voxelCount,
    boundsLabel: voxelAssetBoundsLabel(options.asset.bounds),
    validationDiagnostics: options.asset.validationDiagnostics,
    nonClaims: [
      'not_runtime_authority',
      'not_engine_validation',
      'not_vforge_file',
    ],
  };
}

function countVoxelAssetVoxels(asset: VoxelVolumeAsset): number {
  return asset.representation.sparseRuns.reduce((total, run) => total + run.length, 0);
}

function materialCountsSummary(
  counts: readonly { readonly material: number; readonly voxelCount: number }[],
): string {
  return counts.length === 0
    ? 'no material counts'
    : counts.map(count => `${count.material}:${count.voxelCount}`).join(', ');
}

export function buildStudioVoxelMaterialAuthoringReadModel(options: {
  readonly shell: StudioVoxelConversionWorkspaceShellReadModel;
  readonly assetWorkflow: StudioVoxelAssetWorkflowControlReadModel;
  readonly compactEdit: StudioVoxelCompactEditControlReadModel;
}): StudioVoxelMaterialAuthoringReadModel {
  const runtimeCounts = new Map<number, number>();
  for (const segment of options.assetWorkflow.materialSummary.split(',')) {
    const [materialText, countText] = segment.trim().split(':');
    const material = Number(materialText);
    const count = Number(countText);
    if (Number.isInteger(material) && Number.isInteger(count)) {
      runtimeCounts.set(material, count);
    }
  }

  const conversionRows = options.shell.previewProjection.materialRows.map((row): StudioVoxelMaterialAuthoringRow => ({
    source: 'conversion_map',
    voxelMaterial: row.voxelMaterial,
    paletteEntryId: null,
    displayName: null,
    materialAssetId: row.sourceMaterialId,
    materialCatalogBindingId: null,
    sourceMaterialSlot: row.sourceMaterialSlot,
    sourceMaterialId: row.sourceMaterialId,
    voxelCount: runtimeCounts.get(row.voxelMaterial) ?? null,
    status: 'draft',
    message: row.samplingStatus === 'texture_sampled'
      ? `slot ${row.sourceMaterialSlot} samples ${row.textureAssetId ?? 'texture'} through ${row.uvAttributeName ?? 'uv'}`
      : `slot ${row.sourceMaterialSlot} maps to voxel material ${row.voxelMaterial}`,
  }));

  const storedRows = (options.assetWorkflow.lastAsset?.materialPalette ?? []).map((binding): StudioVoxelMaterialAuthoringRow => ({
    source: 'stored_asset_palette',
    voxelMaterial: binding.voxelMaterial,
    paletteEntryId: binding.paletteEntryId,
    displayName: binding.displayName,
    materialAssetId: binding.materialAssetId,
    materialCatalogBindingId: binding.materialCatalogBindingId,
    sourceMaterialSlot: null,
    sourceMaterialId: null,
    voxelCount: runtimeCounts.get(binding.voxelMaterial) ?? null,
    status: 'stored',
    message: `stored binding ${binding.voxelMaterial} -> ${binding.materialAssetId}`,
  }));

  const compactRow: StudioVoxelMaterialAuthoringRow = {
    source: 'compact_edit_material',
    voxelMaterial: options.compactEdit.material,
    paletteEntryId: null,
    displayName: null,
    materialAssetId: null,
    materialCatalogBindingId: null,
    sourceMaterialSlot: null,
    sourceMaterialId: null,
    voxelCount: runtimeCounts.get(options.compactEdit.material) ?? null,
    status: 'runtime_count',
    message: `compact edits will write palette index ${options.compactEdit.material}`,
  };

  const rows = [...conversionRows, ...storedRows, compactRow];
  const body = {
    compactMaterial: options.compactEdit.material,
    defaultVoxelMaterial: options.shell.settingsDraft.materialMap.defaultVoxelMaterial,
    conversionRows: conversionRows.map(row => [
      row.sourceMaterialSlot,
      row.sourceMaterialId,
      row.voxelMaterial,
      row.voxelCount,
      row.message,
    ]),
    storedRows: storedRows.map(row => [
      row.voxelMaterial,
      row.paletteEntryId,
      row.displayName,
      row.materialAssetId,
      row.materialCatalogBindingId,
      row.voxelCount,
    ]),
    assetHash: options.assetWorkflow.lastAsset?.contentHashes.canonicalJson ?? null,
  };

  return {
    readoutVersion: 'studio-voxel-material-authoring.v0',
    currentCompactMaterial: options.compactEdit.material,
    defaultVoxelMaterial: options.shell.settingsDraft.materialMap.defaultVoxelMaterial,
    conversionRows,
    storedRows,
    compactRow,
    rows,
    supportedFields: [
      'conversion_material_map',
      'texture_sampling_readout',
      'voxel_asset_material_palette',
      'named_voxel_palette_entries',
      'material_catalog_binding_mutation',
      'durable_palette_update',
      'runtime_material_counts',
      'compact_material_index',
    ],
    missingEngineFields: ['multi_material_compact_edit_controls'],
    canAuthorCatalogBindings: true,
    readoutHash: stableAgentVoxelWorkflowHash('studio-voxel-material-authoring', body),
  };
}

export function buildStudioAgentVoxelVolumeExportReadModel(
  receipt: VoxelVolumeAssetExportReceipt,
): StudioAgentVoxelVolumeExportReadModel {
  const asset = receipt.asset;
  const validationDiagnosticCodes = [
    ...receipt.diagnostics.map(diagnostic => diagnostic.code),
    ...(asset?.validationDiagnostics ?? []).map(diagnostic => diagnostic.code),
  ];
  const body = {
    artifactKind: 'studio_agent_voxel_volume_export' as const,
    artifactVersion: 'studio-agent-voxel-volume-export.v0' as const,
    request: receipt.request,
    exported: receipt.exported,
    asset,
    assetId: asset?.assetId ?? null,
    mediaType: asset?.mediaType ?? null,
    schemaVersion: asset?.schemaVersion ?? null,
    voxelCount: asset === null ? null : countVoxelAssetVoxels(asset),
    boundsLabel: asset === null ? null : voxelAssetBoundsLabel(asset.bounds),
    materialPalette: asset?.materialPalette ?? [],
    provenanceKinds: (asset?.provenance ?? []).map(ref => ref.kind),
    canonicalJsonHash: receipt.canonicalJsonHash ?? asset?.contentHashes.canonicalJson ?? null,
    voxelDataHash: receipt.voxelDataHash ?? asset?.contentHashes.voxelData ?? null,
    validationDiagnosticCodes,
    serializedAsset: receipt.canonicalJson,
    fullAssetPayload: receipt.exported
      && asset !== null
      && receipt.canonicalJson !== null
      && receipt.canonicalJsonHash !== null
      && receipt.voxelDataHash !== null,
    nonClaims: [
      'not_vforge_file',
      'not_preview_sample_export',
      'not_silent_sessionstate_promotion',
      'not_arbitrary_filesystem_write',
    ] as const,
  };
  return {
    ...body,
    exportHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-volume-export', body),
  };
}

export function buildStudioAgentVoxelVolumeSaveReadModel(
  receipt: VoxelVolumeAssetSaveReceipt,
): StudioAgentVoxelVolumeSaveReadModel {
  const diff = receipt.diff;
  const asset = receipt.asset;
  const validationDiagnosticCodes = [
    ...receipt.diagnostics.map(diagnostic => diagnostic.code),
    ...(asset?.validationDiagnostics ?? []).map(diagnostic => diagnostic.code),
  ];
  const body = {
    artifactKind: 'studio_agent_voxel_volume_save' as const,
    artifactVersion: 'studio-agent-voxel-volume-save.v0' as const,
    request: receipt.request,
    saved: receipt.saved,
    diff,
    asset,
    assetId: asset?.assetId ?? diff?.assetId ?? null,
    assetPath: receipt.request.targetAssetPath,
    projectBundle: receipt.request.targetProjectBundle,
    operation: diff?.operation ?? null,
    previousCanonicalJsonHash: diff?.previousCanonicalJsonHash ?? null,
    nextCanonicalJsonHash: receipt.canonicalJsonHash ?? diff?.nextCanonicalJsonHash ?? null,
    nextVoxelDataHash: receipt.voxelDataHash ?? diff?.nextVoxelDataHash ?? null,
    expectedCanonicalJsonHash: receipt.request.expectedCanonicalJsonHash,
    expectedVoxelDataHash: receipt.request.expectedVoxelDataHash,
    sparseRunCount: diff?.sparseRunCount ?? null,
    voxelCount: diff?.voxelCount ?? (asset === null ? null : countVoxelAssetVoxels(asset)),
    materialCount: diff?.materialCount ?? asset?.materialPalette.length ?? null,
    provenanceCount: diff?.provenanceCount ?? asset?.provenance.length ?? null,
    runtimeSessionHash: diff?.runtimeSessionHash ?? null,
    validationDiagnosticCodes,
    serializedAsset: receipt.canonicalJson,
    fullAssetPayload: receipt.saved
      && diff !== null
      && asset !== null
      && receipt.canonicalJson !== null
      && receipt.canonicalJsonHash !== null
      && receipt.voxelDataHash !== null,
    nonClaims: [
      'not_vforge_file',
      'not_browser_local_storage_save',
      'not_silent_sessionstate_promotion',
      'not_arbitrary_filesystem_write',
    ] as const,
  };
  return {
    ...body,
    saveHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-volume-save', body),
  };
}

export function buildStudioAgentVoxelVolumeLoadReadModel(
  receipt: VoxelVolumeAssetLoadReceipt,
): StudioAgentVoxelVolumeLoadReadModel {
  const body = {
    artifactKind: 'studio_agent_voxel_volume_load' as const,
    artifactVersion: 'studio-agent-voxel-volume-load.v0' as const,
    requestAssetId: receipt.requestAssetId,
    loaded: receipt.loaded,
    modelId: receipt.modelId,
    volumeAssetId: receipt.volumeAssetId,
    grid: receipt.grid,
    boundsLabel: receipt.bounds === null ? null : voxelAssetBoundsLabel(receipt.bounds),
    voxelCount: receipt.voxelCount,
    materialCounts: receipt.materialCounts,
    provenanceKinds: receipt.provenance.map(ref => ref.kind),
    canonicalJsonHash: receipt.canonicalJsonHash,
    voxelDataHash: receipt.voxelDataHash,
    sessionHash: receipt.sessionHash,
    replayHash: receipt.replayHash,
    validationDiagnosticCodes: receipt.diagnostics.map(diagnostic => diagnostic.code),
    nonClaims: [
      'not_vforge_file',
      'not_studio_json_promotion',
      'not_silent_projectbundle_mutation',
    ] as const,
  };
  return {
    ...body,
    loadHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-volume-load', body),
  };
}

export function buildStudioAgentVoxelMeshSourceImportReadModel(
  receipt: VoxelConversionMeshSourceImportReceipt,
): StudioAgentVoxelMeshSourceImportReadModel {
  const body = {
    artifactKind: 'studio_agent_voxel_mesh_source_import' as const,
    artifactVersion: 'studio-agent-voxel-mesh-source-import.v0' as const,
    sourceAssetId: receipt.source.assetId,
    imported: receipt.imported,
    sourcePath: receipt.sourcePath,
    format: receipt.format,
    sourceByteCount: receipt.sourceByteCount,
    sourceHash: receipt.source.sourceHash,
    meshAssetId: receipt.meshAsset?.assetId ?? null,
    sourceBounds: receipt.sourceBounds,
    vertexCount: receipt.vertexCount,
    triangleCount: receipt.triangleCount,
    groupCount: receipt.groups.length,
    materialSlotCount: receipt.materialSlots.length,
    evidenceKinds: receipt.evidence.map(ref => ref.kind),
    diagnosticCodes: receipt.diagnostics.map(diagnostic => diagnostic.code),
    nonClaims: [
      'not_studio_mesh_parsing',
      'not_browser_filesystem_import',
      'not_raw_runtime_bridge_dispatch',
    ] as const,
  };
  return {
    ...body,
    importHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-mesh-source-import', body),
  };
}

export function buildStudioAgentVoxelVolumeUnloadReadModel(
  receipt: VoxelVolumeAssetUnloadReceipt,
): StudioAgentVoxelVolumeUnloadReadModel {
  const body = {
    artifactKind: 'studio_agent_voxel_volume_unload' as const,
    artifactVersion: 'studio-agent-voxel-volume-unload.v0' as const,
    grid: receipt.grid,
    volumeAssetId: receipt.volumeAssetId,
    unloaded: receipt.unloaded,
    modelId: receipt.modelId,
    removedVoxelCount: receipt.removedVoxelCount,
    sessionHash: receipt.sessionHash,
    replayHash: receipt.replayHash,
    diagnosticCodes: receipt.diagnostics.map(diagnostic => diagnostic.code),
    nonClaims: [
      'not_projectbundle_asset_delete',
      'not_browser_local_storage_delete',
      'not_raw_runtime_bridge_dispatch',
    ] as const,
  };
  return {
    ...body,
    unloadHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-volume-unload', body),
  };
}

function agentVoxelEditDiagnostic(batch: CommandBatch): string | null {
  if (batch.commands.length === 0) {
    return 'voxel edit batch must include at least one command';
  }
  if (batch.commands.length > AGENT_VOXEL_EDIT_MAX_COMMANDS) {
    return `voxel edit batch exceeds ${AGENT_VOXEL_EDIT_MAX_COMMANDS} commands`;
  }
  const unsupported = batch.commands.find(command => command.op !== 'setVoxel');
  if (unsupported !== undefined) {
    return `unsupported voxel edit operation ${unsupported.op}`;
  }
  for (const [index, command] of batch.commands.entries()) {
    if (command.op !== 'setVoxel') {
      return `unsupported voxel edit operation ${command.op}`;
    }
    if (
      !Number.isSafeInteger(command.grid)
      || !Number.isSafeInteger(command.coord.x)
      || !Number.isSafeInteger(command.coord.y)
      || !Number.isSafeInteger(command.coord.z)
    ) {
      return `setVoxel command ${index} must use safe integer grid and coordinates`;
    }
    if (command.value.kind === 'solid' && !Number.isSafeInteger(command.value.material)) {
      return `setVoxel command ${index} solid material must be a safe integer`;
    }
  }
  return null;
}

function compactVoxelEditGrid(edit: StudioAgentCompactVoxelEdit): number {
  return edit.grid ?? 1;
}

function isSafeVoxelInteger(value: number): boolean {
  return Number.isSafeInteger(value) && Math.abs(value) <= AGENT_VOXEL_EDIT_COORDINATE_ABS_LIMIT;
}

function compactVoxelMaterial(index: number): Extract<VoxelCommand, { readonly op: 'setVoxel' }>['value'] {
  return index === 0 ? { kind: 'empty' } : { kind: 'solid', material: index };
}

function validateCompactVoxelWrite(write: StudioAgentVoxelWrite | StudioAgentVoxelRun, label: string): string | null {
  if (!Number.isSafeInteger(write.i) || write.i < 0 || write.i > 255) {
    return `${label} palette index must be an integer in 0..255`;
  }
  return null;
}

function addCompactVoxelCommand(
  commands: Map<string, VoxelCommand>,
  grid: number,
  write: StudioAgentVoxelWrite,
): string | null {
  const validation = validateCompactVoxelWrite(write, 'compact voxel edit');
  if (validation !== null) {
    return validation;
  }
  if (!isSafeVoxelInteger(write.x) || !isSafeVoxelInteger(write.y) || !isSafeVoxelInteger(write.z)) {
    return `compact voxel coordinate exceeds +/-${AGENT_VOXEL_EDIT_COORDINATE_ABS_LIMIT} or is not an integer`;
  }
  const key = `${grid}:${write.x}:${write.y}:${write.z}`;
  commands.set(key, {
    op: 'setVoxel',
    grid,
    coord: { x: write.x, y: write.y, z: write.z },
    value: compactVoxelMaterial(write.i),
  });
  return null;
}

function normalizeCompactRange(a: number, b: number): readonly [number, number] {
  return a <= b ? [a, b] : [b, a];
}

function addCompactBoxCommands(
  commands: Map<string, VoxelCommand>,
  grid: number,
  from: StudioAgentVoxelPoint,
  to: StudioAgentVoxelPoint,
  paletteIndex: number,
  mode: 'filled' | 'shell' | 'edges',
): string | null {
  const validation = validateCompactVoxelWrite({ ...from, i: paletteIndex }, 'compact voxel primitive');
  if (validation !== null) {
    return validation;
  }
  const [minX, maxX] = normalizeCompactRange(from.x, to.x);
  const [minY, maxY] = normalizeCompactRange(from.y, to.y);
  const [minZ, maxZ] = normalizeCompactRange(from.z, to.z);
  for (const value of [minX, maxX, minY, maxY, minZ, maxZ]) {
    if (!isSafeVoxelInteger(value)) {
      return `compact voxel box coordinate exceeds +/-${AGENT_VOXEL_EDIT_COORDINATE_ABS_LIMIT} or is not an integer`;
    }
  }
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const boundaryAxes = Number(x === minX || x === maxX)
          + Number(y === minY || y === maxY)
          + Number(z === minZ || z === maxZ);
        if (mode === 'shell' && boundaryAxes < 1) continue;
        if (mode === 'edges' && boundaryAxes < 2) continue;
        const diagnostic = addCompactVoxelCommand(commands, grid, { x, y, z, i: paletteIndex });
        if (diagnostic !== null) return diagnostic;
        if (commands.size > AGENT_VOXEL_EDIT_MAX_COMMANDS) {
          return `compact voxel edit exceeds ${AGENT_VOXEL_EDIT_MAX_COMMANDS} generated commands`;
        }
      }
    }
  }
  return null;
}

function roundCompactLine(value: number): number {
  return value < 0 ? Math.ceil(value - 0.5) : Math.floor(value + 0.5);
}

function addCompactLineCommands(
  commands: Map<string, VoxelCommand>,
  grid: number,
  from: StudioAgentVoxelPoint,
  to: StudioAgentVoxelPoint,
  paletteIndex: number,
  radius: number,
): string | null {
  if (!Number.isSafeInteger(radius) || radius < 0 || radius > 4) {
    return 'compact voxel line radius must be an integer in 0..4';
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  if (!Number.isSafeInteger(steps)) {
    return 'compact voxel line endpoints must be integer coordinates';
  }
  for (let step = 0; step <= steps; step += 1) {
    const center = steps === 0
      ? from
      : {
          x: from.x + roundCompactLine((dx * step) / steps),
          y: from.y + roundCompactLine((dy * step) / steps),
          z: from.z + roundCompactLine((dz * step) / steps),
        };
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let oz = -radius; oz <= radius; oz += 1) {
          const diagnostic = addCompactVoxelCommand(commands, grid, {
            x: center.x + ox,
            y: center.y + oy,
            z: center.z + oz,
            i: paletteIndex,
          });
          if (diagnostic !== null) return diagnostic;
          if (commands.size > AGENT_VOXEL_EDIT_MAX_COMMANDS) {
            return `compact voxel edit exceeds ${AGENT_VOXEL_EDIT_MAX_COMMANDS} generated commands`;
          }
        }
      }
    }
  }
  return null;
}

export function buildStudioAgentCompactVoxelEditBatch(
  edit: StudioAgentCompactVoxelEdit,
): StudioAgentCompactVoxelEditCompileResult {
  const grid = compactVoxelEditGrid(edit);
  if (!Number.isSafeInteger(grid)) {
    return {
      accepted: false,
      diagnostic: 'compact voxel edit grid must be a safe integer',
      batch: null,
      affordance: edit.kind,
      generatedVoxelCount: 0,
    };
  }
  const commands = new Map<string, VoxelCommand>();
  let diagnostic: string | null = null;

  switch (edit.kind) {
    case 'set_voxels':
      if (edit.voxels.length === 0) {
        diagnostic = 'set_voxels requires at least one voxel';
        break;
      }
      for (const voxel of edit.voxels) {
        diagnostic = addCompactVoxelCommand(commands, grid, voxel);
        if (diagnostic !== null || commands.size > AGENT_VOXEL_EDIT_MAX_COMMANDS) break;
      }
      break;
    case 'set_voxels_runs':
      if (edit.runs.length === 0) {
        diagnostic = 'set_voxels_runs requires at least one run';
        break;
      }
      for (const run of edit.runs) {
        const validation = validateCompactVoxelWrite({ x: run.x1, y: run.y, z: run.z, i: run.i }, 'set_voxels_runs');
        if (validation !== null) {
          diagnostic = validation;
          break;
        }
        const [minX, maxX] = normalizeCompactRange(run.x1, run.x2);
        for (let x = minX; x <= maxX; x += 1) {
          diagnostic = addCompactVoxelCommand(commands, grid, { x, y: run.y, z: run.z, i: run.i });
          if (diagnostic !== null || commands.size > AGENT_VOXEL_EDIT_MAX_COMMANDS) break;
        }
        if (diagnostic !== null || commands.size > AGENT_VOXEL_EDIT_MAX_COMMANDS) break;
      }
      break;
    case 'fill_box':
      diagnostic = addCompactBoxCommands(
        commands,
        grid,
        { x: edit.x1, y: edit.y1, z: edit.z1 },
        { x: edit.x2, y: edit.y2, z: edit.z2 },
        edit.palette_index,
        'filled',
      );
      break;
    case 'apply_voxel_primitives':
      if (edit.primitives.length === 0) {
        diagnostic = 'apply_voxel_primitives requires at least one primitive';
        break;
      }
      if (
        edit.maxGeneratedVoxels !== undefined
        && (!Number.isSafeInteger(edit.maxGeneratedVoxels) || edit.maxGeneratedVoxels < 1 || edit.maxGeneratedVoxels > AGENT_VOXEL_EDIT_MAX_COMMANDS)
      ) {
        diagnostic = `maxGeneratedVoxels must be an integer in 1..${AGENT_VOXEL_EDIT_MAX_COMMANDS}`;
        break;
      }
      for (const primitive of edit.primitives) {
        if (primitive.kind === 'block') {
          diagnostic = addCompactVoxelCommand(commands, grid, { ...primitive.at, i: primitive.palette_index });
        } else if (primitive.kind === 'box') {
          diagnostic = addCompactBoxCommands(
            commands,
            grid,
            primitive.from,
            primitive.to,
            primitive.palette_index,
            primitive.mode ?? 'filled',
          );
        } else {
          diagnostic = addCompactLineCommands(
            commands,
            grid,
            primitive.from,
            primitive.to,
            primitive.palette_index,
            primitive.radius ?? 0,
          );
        }
        if (diagnostic !== null || commands.size > (edit.maxGeneratedVoxels ?? AGENT_VOXEL_EDIT_MAX_COMMANDS)) break;
      }
      if (commands.size > (edit.maxGeneratedVoxels ?? AGENT_VOXEL_EDIT_MAX_COMMANDS)) {
        diagnostic = `compact voxel edit exceeds ${edit.maxGeneratedVoxels ?? AGENT_VOXEL_EDIT_MAX_COMMANDS} generated commands`;
      }
      break;
  }

  if (commands.size > AGENT_VOXEL_EDIT_MAX_COMMANDS) {
    diagnostic = `compact voxel edit exceeds ${AGENT_VOXEL_EDIT_MAX_COMMANDS} generated commands`;
  }

  if (diagnostic !== null) {
    return {
      accepted: false,
      diagnostic,
      batch: null,
      affordance: edit.kind,
      generatedVoxelCount: commands.size,
    };
  }

  return {
    accepted: true,
    diagnostic: null,
    batch: { commands: Array.from(commands.values()) },
    affordance: edit.kind,
    generatedVoxelCount: commands.size,
  };
}

function buildStudioCompactVoxelEditFromControl(
  draft: StudioVoxelCompactEditControlReadModel,
  action: StudioVoxelCompactEditControlAction = draft.draftAction,
): StudioAgentCompactVoxelEdit {
  switch (action) {
    case 'block':
      return {
        kind: 'set_voxels',
        grid: draft.grid,
        voxels: [{ x: draft.x1, y: draft.y1, z: draft.z1, i: draft.material }],
      };
    case 'fill_box':
      return {
        kind: 'fill_box',
        grid: draft.grid,
        x1: draft.x1,
        y1: draft.y1,
        z1: draft.z1,
        x2: draft.x2,
        y2: draft.y2,
        z2: draft.z2,
        palette_index: draft.material,
      };
    case 'primitive_box':
      return {
        kind: 'apply_voxel_primitives',
        grid: draft.grid,
        maxGeneratedVoxels: draft.maxGeneratedVoxels,
        primitives: [{
          kind: 'box',
          from: { x: draft.x1, y: draft.y1, z: draft.z1 },
          to: { x: draft.x2, y: draft.y2, z: draft.z2 },
          palette_index: draft.material,
          mode: draft.boxMode,
        }],
      };
    case 'primitive_line':
      return {
        kind: 'apply_voxel_primitives',
        grid: draft.grid,
        maxGeneratedVoxels: draft.maxGeneratedVoxels,
        primitives: [{
          kind: 'line',
          from: { x: draft.x1, y: draft.y1, z: draft.z1 },
          to: { x: draft.x2, y: draft.y2, z: draft.z2 },
          palette_index: draft.material,
          radius: draft.lineRadius,
        }],
      };
  }
}

function refreshStudioCompactVoxelEditPreflight(
  draft: StudioVoxelCompactEditControlReadModel,
): StudioVoxelCompactEditControlReadModel {
  const compiled = buildStudioAgentCompactVoxelEditBatch(buildStudioCompactVoxelEditFromControl(draft));
  return {
    ...draft,
    preflightAction: draft.draftAction,
    preflightAccepted: compiled.accepted,
    preflightGeneratedCommandCount: compiled.generatedVoxelCount,
    preflightDiagnostic: compiled.diagnostic,
  };
}

function compactVoxelControlStartCoord(draft: StudioVoxelCompactEditControlReadModel): StudioVoxelCoord {
  return { x: draft.x1, y: draft.y1, z: draft.z1 };
}

function compactVoxelControlEndCoord(draft: StudioVoxelCompactEditControlReadModel): StudioVoxelCoord {
  return { x: draft.x2, y: draft.y2, z: draft.z2 };
}

function formatStudioVoxelCoord(coord: StudioVoxelCoord | null): string {
  return coord === null ? 'none' : `${coord.x},${coord.y},${coord.z}`;
}

function buildStudioVoxelCompactEditPlacementReadModel(
  draft: StudioVoxelCompactEditControlReadModel,
  latestViewportHit: StudioViewportHitReadModel | null,
): StudioVoxelCompactEditPlacementReadModel {
  const targetStart = compactVoxelControlStartCoord(draft);
  const targetEnd = compactVoxelControlEndCoord(draft);
  const status = latestViewportHit === null
    ? 'unavailable'
    : latestViewportHit.voxelCoord === null ? 'unsupported_hit' : 'ready';
  const sourceVoxelCoord = latestViewportHit?.voxelCoord ?? null;
  const previewLabel = status === 'ready'
    ? `hit ${formatStudioVoxelCoord(sourceVoxelCoord)} -> ${draft.draftAction} ${formatStudioVoxelCoord(targetStart)} to ${formatStudioVoxelCoord(targetEnd)}`
    : `${draft.draftAction} ${formatStudioVoxelCoord(targetStart)} to ${formatStudioVoxelCoord(targetEnd)}`;
  const message = status === 'ready'
    ? `Viewport ${latestViewportHit?.face ?? 'hit'} can populate compact edit coordinates.`
    : status === 'unsupported_hit'
      ? 'Latest viewport hit is not a voxel coordinate.'
      : 'Pick a voxel in the viewport to populate compact edit coordinates.';
  const body = {
    status,
    sourceRenderableId: latestViewportHit?.renderableId ?? null,
    sourceFace: latestViewportHit?.face ?? null,
    sourceVoxelCoord,
    targetStart,
    targetEnd,
    draftAction: draft.draftAction,
    preflightAccepted: draft.preflightAccepted,
    preflightGeneratedCommandCount: draft.preflightGeneratedCommandCount,
  };

  return {
    controlVersion: 'studio-voxel-compact-edit-placement.v0',
    status,
    canUseViewportHit: status === 'ready',
    sourceRenderableId: body.sourceRenderableId,
    sourceFace: body.sourceFace,
    sourceVoxelCoord,
    targetStart,
    targetEnd,
    previewLabel,
    message,
    readoutHash: stableAgentVoxelWorkflowHash('studio-voxel-compact-edit-placement', body),
    nonClaims: [
      'not_runtime_authority',
      'not_scene_authority',
      'does_not_render_authoritative_brush_mesh',
    ],
  };
}

function clampHistoryInteger(value: number, fallback: number, min: number, max: number): number {
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : fallback;
}

function nullableTrimmed(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}

function formatVoxelHistoryBounds(bounds: VoxelEditHistoryDiffSummary['touchedBounds']): string {
  if (bounds === null) return 'unbounded';
  return `${bounds.min.x},${bounds.min.y},${bounds.min.z} to ${bounds.max.x},${bounds.max.y},${bounds.max.z}`;
}

function formatVoxelHistoryMaterialDeltas(diff: VoxelEditHistoryDiffSummary | null): string {
  if (diff === null || diff.materialDeltas.length === 0) return 'no material deltas';
  return diff.materialDeltas
    .map(delta => `${delta.material}:${delta.beforeCount}->${delta.afterCount} (${delta.delta >= 0 ? '+' : ''}${delta.delta})`)
    .join(', ');
}

function voxelHistoryDiffReadModel(diff: VoxelEditHistoryDiffSummary | null): StudioVoxelHistoryDiffReadModel {
  if (diff === null) {
    return {
      status: 'none',
      diffLevel: null,
      partial: false,
      changedVoxelCount: null,
      boundsLabel: 'no diff summary',
      materialDeltaLabel: 'no material deltas',
      sampleWindowRef: null,
      diagnosticCodes: [],
    };
  }
  return {
    status: diff.partial ? 'partial' : 'summary',
    diffLevel: diff.diffLevel,
    partial: diff.partial,
    changedVoxelCount: diff.changedVoxelCount,
    boundsLabel: formatVoxelHistoryBounds(diff.touchedBounds),
    materialDeltaLabel: formatVoxelHistoryMaterialDeltas(diff),
    sampleWindowRef: diff.sampleWindowRef,
    diagnosticCodes: diff.diagnostics.map(diagnostic => diagnostic.code),
  };
}

function voxelHistoryEntryRow(entry: VoxelEditHistoryEntry): StudioVoxelHistoryEntryRowReadModel {
  return {
    transactionId: entry.transactionId,
    cursorId: entry.cursorId,
    entryKind: entry.entryKind,
    operationLabel: entry.operationLabel,
    provenance: entry.provenance,
    commandCount: entry.commandCount,
    eventCount: entry.eventCount,
    touchedVoxelCount: entry.touchedVoxelCount,
    boundsLabel: formatVoxelHistoryBounds(entry.touchedBounds),
    diffLabel: entry.diffSummary === null
      ? 'no bounded diff'
      : `${entry.diffSummary.diffLevel}${entry.diffSummary.partial ? ' partial' : ''} · ${entry.diffSummary.changedVoxelCount} voxels`,
    diagnosticCodes: [
      ...entry.diagnostics.map(diagnostic => diagnostic.code),
      ...(entry.diffSummary?.diagnostics.map(diagnostic => diagnostic.code) ?? []),
    ],
    actionability: 'summary_only',
  };
}

function buildStudioVoxelHistoryPanelReadModel(
  control: StudioVoxelHistoryControlState,
  authoringAvailable: boolean,
): StudioVoxelHistoryPanelReadModel {
  const summary = control.summary;
  const receipt = control.receipt;
  const cursor = receipt?.cursorAfter ?? summary?.cursor ?? null;
  const targetTransactionId = nullableTrimmed(control.targetTransactionId);
  const targetCursorId = nullableTrimmed(control.targetCursorId);
  const targetSet = targetTransactionId !== null || targetCursorId !== null || control.targetCursorIndex !== null;
  const receiptDiff = receipt?.diffSummary ?? receipt?.previewEvidence?.diffSummary ?? null;
  const diagnostics = [
    ...(summary?.diagnostics ?? []),
    ...(receipt?.diagnostics ?? []),
    ...(receiptDiff?.diagnostics ?? []),
  ];
  const body = {
    authoringAvailable,
    historyId: control.historyId,
    cursorId: control.cursorId,
    targetTransactionId: control.targetTransactionId,
    targetCursorId: control.targetCursorId,
    targetCursorIndex: control.targetCursorIndex,
    historyHash: summary?.historyHash ?? null,
    cursorHash: cursor?.historyHash ?? null,
    entryCount: summary?.entries.length ?? 0,
    redoDepth: cursor?.redoDepth ?? 0,
    undoDepth: cursor?.undoDepth ?? 0,
    lastAction: control.lastAction,
    receiptMode: receipt?.request.mode ?? null,
    receiptApplied: receipt?.applied ?? null,
    receiptPreview: receipt?.preview ?? null,
    diagnostics: diagnostics.map(diagnostic => diagnostic.code),
  };

  return {
    panelVersion: 'studio-voxel-history-panel.v0',
    authoringAvailable,
    control,
    cursor,
    historyHash: summary?.historyHash ?? null,
    cursorHash: cursor?.historyHash ?? null,
    entryCount: summary?.entries.length ?? 0,
    retainedRedoCount: summary?.retainedRedoTransactionIds.length ?? 0,
    canRead: authoringAvailable && control.historyId.trim().length > 0,
    canPreviewRevert: authoringAvailable && summary !== null && targetSet,
    canApplyRevert: authoringAvailable && summary !== null && targetSet,
    canUndo: authoringAvailable && summary !== null && (cursor?.undoDepth ?? 0) > 0,
    canRedo: authoringAvailable && summary !== null && (cursor?.redoDepth ?? 0) > 0,
    targetLabel: targetSet
      ? [
          targetTransactionId === null ? null : `tx ${targetTransactionId}`,
          targetCursorId === null ? null : `cursor ${targetCursorId}`,
          control.targetCursorIndex === null ? null : `index ${control.targetCursorIndex}`,
        ].filter((part): part is string => part !== null).join(' · ')
      : 'no revert target selected',
    entries: summary?.entries.map(voxelHistoryEntryRow) ?? [],
    diff: voxelHistoryDiffReadModel(receiptDiff),
    receipt,
    diagnostics,
    nonClaims: [
      'not_studio_authoritative_undo_stack',
      'not_row_level_revert_without_rust_replayable_marker',
      'not_compacted_entry_reconstruction',
    ],
    readoutHash: stableAgentVoxelWorkflowHash('studio-voxel-history-panel', body),
  };
}

function voxelConversionSourceOptions(
  entries: readonly StudioAssetInventoryEntryReadModel[],
  selectedSourceAssetId: string | null,
  importedSource: StudioImportedVoxelConversionSource | null,
): readonly StudioVoxelConversionSourceOption[] {
  const options = entries.map(entry => ({
    assetId: entry.assetId,
    label: `${entry.assetId} · ${entry.kind}`,
    kind: entry.kind,
    sourcePath: entry.sourcePath,
    sourceHash: entry.devResolution?.sourceHash ?? null,
    devCacheKey: entry.devResolution?.devCacheKey ?? null,
    importStatus: entry.devResolution?.importStatus ?? null,
    publishOutputKey: entry.devResolution?.publishOutputKey ?? entry.publishResolution?.outputKey ?? null,
    packedHash: entry.publishResolution?.packedHash ?? null,
    packedBytes: entry.publishResolution?.packedBytes ?? null,
    dependencies: entry.dependencies,
    referencedRenderableIds: entry.referencedRenderableIds,
    supported: SUPPORTED_VOXEL_CONVERSION_CATALOG_SOURCE_KINDS.includes(entry.kind as 'static_mesh'),
    selected: entry.assetId === selectedSourceAssetId,
  }));
  if (importedSource === null || options.some(option => option.assetId === importedSource.source.assetId)) {
    return options;
  }
  return [
    ...options,
    {
      assetId: importedSource.source.assetId,
      label: `${importedSource.source.assetId} · imported_static_mesh`,
      kind: 'imported_static_mesh',
      sourcePath: importedSource.sourcePath,
      sourceHash: importedSource.source.sourceHash,
      devCacheKey: null,
      importStatus: `authority_imported:${importedSource.sourceByteCount}_bytes`,
      publishOutputKey: null,
      packedHash: null,
      packedBytes: importedSource.sourceByteCount,
      dependencies: [],
      referencedRenderableIds: [],
      supported: true,
      selected: importedSource.source.assetId === selectedSourceAssetId,
    },
  ];
}

function voxelConversionSourceRef(
  selectedSource: StudioAssetInventoryEntryReadModel | null,
  draft: StudioVoxelConversionSettingsDraft,
  importedSource: StudioImportedVoxelConversionSource | null,
): VoxelConversionSourceRef | null {
  if (importedSource !== null && importedSource.source.assetId === draft.selectedSourceAssetId) {
    return {
      ...importedSource.source,
      meshPrimitive: draft.meshPrimitive,
    };
  }
  if (selectedSource === null) {
    return null;
  }
  return {
    assetId: selectedSource.assetId,
    assetKind: voxelConversionAuthoritySourceKind(selectedSource.kind),
    assetVersion: 1,
    sourceHash: selectedSource.devResolution?.sourceHash ?? '',
    meshPrimitive: draft.meshPrimitive,
  };
}

function voxelConversionTargetRef(draft: StudioVoxelConversionSettingsDraft): VoxelConversionTargetRef {
  return {
    grid: draft.targetGrid,
    volumeAssetId: draft.targetVolumeAssetId.trim().length === 0 ? null : draft.targetVolumeAssetId,
    origin: {
      x: draft.targetOrigin[0],
      y: draft.targetOrigin[1],
      z: draft.targetOrigin[2],
    },
  };
}

function voxelConversionSettings(draft: StudioVoxelConversionSettingsDraft): VoxelConversionSettings {
  return {
    mode: draft.mode,
    fitPolicy: draft.fitPolicy,
    originPolicy: draft.originPolicy,
    resolution: draft.resolution,
    voxelSize: draft.voxelSize,
    maxOutputVoxels: draft.maxOutputVoxels,
    transform: [
      draft.transformScale, 0, 0, 0,
      0, draft.transformScale, 0, 0,
      0, 0, draft.transformScale, 0,
      draft.transformTranslation[0], draft.transformTranslation[1], draft.transformTranslation[2], 1,
    ],
    materialMap: draft.materialMap,
  };
}

function boundsLabel(
  bounds: {
    readonly min: { readonly x: number; readonly y: number; readonly z: number };
    readonly max: { readonly x: number; readonly y: number; readonly z: number };
  } | null,
): string {
  if (bounds === null) {
    return 'no preview bounds';
  }
  return `[${bounds.min.x},${bounds.min.y},${bounds.min.z}] to [${bounds.max.x},${bounds.max.y},${bounds.max.z}]`;
}

function buildVoxelConversionPreviewProjection(
  workspace: StudioVoxelConversionWorkspaceReadModel,
): StudioVoxelConversionPreviewProjectionReadModel {
  const status: StudioVoxelConversionPreviewProjectionReadModel['status'] =
    workspace.operations.preview.status === 'stale'
      ? 'stale'
      : workspace.preview === null
        ? 'unavailable'
        : 'projection_only';
  const previewHash = workspace.preview?.outputHash ?? null;
  const materialMap = workspace.settings.materialMap;
  const materialRows = materialMap?.entries.map(entry => {
    const textureBindings = materialMap.textureBindings ?? [];
    const binding = textureBindings.find(candidate => (
      candidate.sourceMaterialSlot === entry.sourceMaterialSlot
    )) ?? null;
    return {
      sourceMaterialSlot: entry.sourceMaterialSlot,
      sourceMaterialId: entry.sourceMaterialId,
      voxelMaterial: entry.voxelMaterial,
      samplingStatus: binding === null ? 'flat_material' as const : 'texture_sampled' as const,
      textureAssetId: binding?.texture.textureAssetId ?? null,
      textureContentHash: binding?.texture.contentHash ?? null,
      uvAttributeName: binding?.uvAttribute.attributeName ?? null,
      uvAttributeHash: binding?.uvAttribute.sourceHash ?? null,
      sampleUv: binding?.sampleUv ?? null,
      samplingPolicy: binding?.samplingPolicy ?? null,
      wrapPolicy: binding?.wrapPolicy ?? null,
      materialMode: binding?.materialMode ?? null,
    };
  }) ?? [];
  const states: readonly StudioVoxelConversionPreviewState[] = [
    {
      id: 'unavailable',
      label: 'Unavailable',
      active: status === 'unavailable',
      message: 'No upstream voxel preview evidence is available for the current inputs.',
    },
    {
      id: 'projection_only',
      label: 'Projection Only',
      active: status === 'projection_only',
      message: 'Browser/Three preview is display evidence only and is not conversion authority.',
    },
    {
      id: 'stale',
      label: 'Stale',
      active: status === 'stale',
      message: 'Preview evidence does not match the current source, settings, or material map.',
    },
  ];

  return {
    status,
    viewportLabel: status === 'projection_only'
      ? 'voxel preview projection only'
      : status === 'stale'
        ? 'stale voxel preview projection'
        : 'voxel preview unavailable',
    inputReadoutHash: workspace.readoutHash,
    previewHash,
    outputVoxelCount: workspace.preview?.outputVoxelCount ?? null,
    outputBoundsLabel: boundsLabel(workspace.preview?.outputBounds ?? null),
    materialMapStatus: workspace.settings.status,
    materialRows,
    states,
  };
}

function proposalDiagnostics(
  proposal: StudioVoxelConversionProposalResult<unknown>,
): readonly string[] {
  return proposal.diagnostics.map(diagnostic => diagnostic.code);
}

function timelineMessage(
  proposal: StudioVoxelConversionProposalResult<unknown>,
  fallback: string,
): string {
  return proposal.accepted
    ? 'Typed proposal is ready for upstream runtime submission.'
    : proposal.diagnostics[0]?.message ?? fallback;
}

function buildVoxelConversionTimelineRows(options: {
  readonly workspace: StudioVoxelConversionWorkspaceReadModel;
  readonly planProposal: StudioVoxelConversionProposalResult<unknown>;
  readonly previewProposal: StudioVoxelConversionProposalResult<unknown>;
  readonly applyProposal: StudioVoxelConversionProposalResult<unknown>;
  readonly exportProposal: StudioVoxelConversionProposalResult<unknown>;
}): readonly StudioVoxelConversionTimelineRow[] {
  const rows = [
    {
      label: 'Plan',
      operation: options.workspace.operations.plan,
      proposal: options.planProposal,
    },
    {
      label: 'Preview',
      operation: options.workspace.operations.preview,
      proposal: options.previewProposal,
    },
    {
      label: 'Apply',
      operation: options.workspace.operations.apply,
      proposal: options.applyProposal,
    },
    {
      label: 'Export Evidence',
      operation: options.workspace.operations.exportEvidence,
      proposal: options.exportProposal,
    },
  ];

  return rows.map(row => ({
    commandId: row.operation.commandId,
    label: row.label,
    status: row.operation.status,
    proposalAccepted: row.proposal.accepted,
    evidenceCount: row.operation.evidence.length,
    diagnosticCodes: proposalDiagnostics(row.proposal),
    message: timelineMessage(row.proposal, firstDiagnosticMessage(row.operation.diagnostics, 'Operation is blocked.')),
  }));
}

function buildVoxelConversionEvidenceRows(
  readout: StudioVoxelConversionReadoutModel,
): readonly StudioVoxelConversionEvidenceRow[] {
  if (readout.evidence.length === 0) {
    return [
      {
        source: 'workspace',
        kind: 'voxel_conversion_evidence',
        uri: 'missing',
        contentHash: 'missing',
        status: 'missing',
      },
    ];
  }
  return readout.evidence.map(evidence => ({
    source: evidence.source,
    kind: evidence.kind,
    uri: evidence.uri,
    contentHash: evidence.contentHash,
    status: 'available',
  }));
}

function buildVoxelConversionSourceMetadataReadModel(options: {
  readonly draft: StudioVoxelConversionSettingsDraft;
  readonly sourceOptions: readonly StudioVoxelConversionSourceOption[];
  readonly selectedSource: StudioAssetInventoryEntryReadModel | null;
  readonly previewProjection: StudioVoxelConversionPreviewProjectionReadModel;
}): StudioVoxelConversionSourceMetadataReadModel {
  const option = options.sourceOptions.find(entry => entry.assetId === options.draft.selectedSourceAssetId) ?? null;
  const knownMaterialSlotCount = options.previewProjection.materialRows.length > 0
    ? options.previewProjection.materialRows.length
    : options.draft.materialMap.entries.length > 0 ? options.draft.materialMap.entries.length : null;
  const missingPublicFields = [
    'mesh_asset_group_bounds',
    'mesh_primitive_list',
    'source_transform_readback',
  ];
  const body = {
    selectedSourceAssetId: options.draft.selectedSourceAssetId,
    sourcePath: option?.sourcePath ?? options.selectedSource?.sourcePath ?? null,
    sourceHash: option?.sourceHash ?? options.selectedSource?.devResolution?.sourceHash ?? null,
    importStatus: option?.importStatus ?? options.selectedSource?.devResolution?.importStatus ?? null,
    publishOutputKey: option?.publishOutputKey ?? options.selectedSource?.devResolution?.publishOutputKey ?? null,
    packedHash: option?.packedHash ?? options.selectedSource?.publishResolution?.packedHash ?? null,
    packedBytes: option?.packedBytes ?? options.selectedSource?.publishResolution?.packedBytes ?? null,
    dependencyCount: option?.dependencies.length ?? options.selectedSource?.dependencies?.length ?? 0,
    referencedRenderableCount: option?.referencedRenderableIds.length ?? options.selectedSource?.referencedRenderableIds?.length ?? 0,
    meshPrimitive: options.draft.meshPrimitive,
    materialMapEntryCount: options.draft.materialMap.entries.length,
    knownMaterialSlotCount,
    transformScale: options.draft.transformScale,
    transformTranslation: options.draft.transformTranslation,
    missingPublicFields,
  };
  return {
    ...body,
    readoutHash: stableAgentVoxelWorkflowHash('studio-voxel-conversion-source-metadata', body),
  };
}

function buildVoxelConversionWorkspaceShellReadModel(options: {
  readonly draft: StudioVoxelConversionSettingsDraft;
  readonly sourceOptions: readonly StudioVoxelConversionSourceOption[];
  readonly selectedSource: StudioAssetInventoryEntryReadModel | null;
  readonly importedSource: StudioImportedVoxelConversionSource | null;
  readonly sessionId: string;
  readonly expectedTimelineSequence: number;
  readonly runtimeSession: Partial<Pick<WorkspaceAuthoringFacade, 'planVoxelConversion' | 'previewVoxelConversion' | 'applyVoxelConversion' | 'exportVoxelConversionEvidence'>> | null;
  readonly authorityState: StudioVoxelConversionAuthorityState;
}): StudioVoxelConversionWorkspaceShellReadModel {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: voxelConversionSourceRef(options.selectedSource, options.draft, options.importedSource),
    target: voxelConversionTargetRef(options.draft),
    settings: voxelConversionSettings(options.draft),
    plan: options.authorityState.plan,
    preview: options.authorityState.preview,
    receipt: options.authorityState.receipt,
    evidence: options.authorityState.evidence,
    supportedSourceAssetKinds: SUPPORTED_VOXEL_CONVERSION_AUTHORITY_SOURCE_KINDS,
  });
  const readout = buildStudioVoxelConversionReadoutModel({
    workspace,
    runtimeSession: options.runtimeSession,
  });
  const planProposal = buildStudioVoxelConversionPlanProposal({
    workspace,
    sessionId: options.sessionId,
    expectedTimelineSequence: options.expectedTimelineSequence,
    runtimeSession: options.runtimeSession,
  });
  const previewProposal = buildStudioVoxelConversionPreviewProposal({
    workspace,
    sessionId: options.sessionId,
    expectedTimelineSequence: options.expectedTimelineSequence + 1,
    runtimeSession: options.runtimeSession,
  });
  const applyProposal = buildStudioVoxelConversionApplyProposal({
    workspace,
    sessionId: options.sessionId,
    expectedTimelineSequence: options.expectedTimelineSequence + 2,
    runtimeSession: options.runtimeSession,
  });
  const exportProposal = buildStudioVoxelConversionEvidenceExportProposal({
    workspace,
    sessionId: options.sessionId,
    expectedTimelineSequence: options.expectedTimelineSequence + 3,
    runtimeSession: options.runtimeSession,
  });
  const previewProjection = buildVoxelConversionPreviewProjection(workspace);
  const sourceMetadata = buildVoxelConversionSourceMetadataReadModel({
    draft: options.draft,
    sourceOptions: options.sourceOptions,
    selectedSource: options.selectedSource,
    previewProjection,
  });
  const commandTimeline = buildVoxelConversionTimelineRows({
    workspace,
    planProposal,
    previewProposal,
    applyProposal,
    exportProposal,
  });
  const evidenceRows = buildVoxelConversionEvidenceRows(readout);
  const operations = [
    workspace.operations.plan,
    workspace.operations.preview,
    workspace.operations.apply,
    workspace.operations.exportEvidence,
  ];
  const readinessReason = (commandId: StudioVoxelConversionCommandId): string => {
    const boundaryDiagnostic = readout.readiness.diagnostics.find(
      diagnostic => diagnostic.commandId === commandId,
    );
    if (boundaryDiagnostic !== undefined) {
      return boundaryDiagnostic.message;
    }
    const operation = operations.find(entry => entry.commandId === commandId);
    return operation === undefined
      ? 'Upstream voxel conversion capability is unavailable.'
      : firstDiagnosticMessage(operation.diagnostics, 'Operation is waiting for authority evidence.');
  };
  const proposalForAction = (
    commandId: StudioVoxelConversionCommandId,
  ): StudioVoxelConversionProposalResult<unknown> => {
    switch (commandId) {
      case 'voxel_conversion.plan':
        return planProposal;
      case 'voxel_conversion.preview':
        return previewProposal;
      case 'voxel_conversion.apply':
        return applyProposal;
      case 'voxel_conversion.export_evidence':
        return exportProposal;
    }
  };

  const states: readonly StudioVoxelConversionWorkspaceShellState[] = [
    {
      id: 'empty_inputs',
      label: 'Empty',
      active: workspace.status === 'incomplete',
      status: workspace.status,
      message: 'No source asset, target grid, or conversion settings are selected.',
    },
    {
      id: 'missing_capability',
      label: 'Missing capability',
      active: readout.status === 'failed_closed',
      status: readout.status,
      message: firstDiagnosticMessage(
        readout.readiness.diagnostics,
        'Workspace authoring conversion authority is not available.',
      ),
    },
    {
      id: 'ready',
      label: 'Ready',
      active: workspace.status === 'ready' && readout.status === 'ready',
      status: workspace.status === 'ready' ? readout.status : 'pending',
      message: 'Enabled only after valid inputs and upstream authority operations are present.',
    },
  ];

  const regions: readonly StudioVoxelConversionWorkspaceShellRegion[] = [
    {
      id: 'source',
      label: 'Source',
      status: workspace.source.status,
      disabled: false,
      message: firstDiagnosticMessage(workspace.source.diagnostics, 'Source asset selected.'),
    },
    {
      id: 'settings',
      label: 'Settings',
      status: workspace.settings.status,
      disabled: false,
      message: firstDiagnosticMessage(workspace.settings.diagnostics, 'Conversion settings are valid.'),
    },
    {
      id: 'preview',
      label: 'Preview',
      status: workspace.operations.preview.status,
      disabled: true,
      message: firstDiagnosticMessage(
        workspace.operations.preview.diagnostics,
        'Preview awaits upstream authority evidence.',
      ),
    },
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      status: readout.status,
      disabled: false,
      message: `${readout.diagnostics.length} diagnostics, authority posture ${readout.authorityPosture}.`,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      status: operations.map(operation => operation.status).join(' / '),
      disabled: false,
      message: 'Plan, preview, apply, and export rows reflect typed proposals and authority evidence.',
    },
    {
      id: 'evidence',
      label: 'Evidence',
      status: workspace.operations.exportEvidence.status,
      disabled: true,
      message: firstDiagnosticMessage(
        workspace.operations.exportEvidence.diagnostics,
        'Evidence export awaits authority-produced refs.',
      ),
    },
  ];

  const actions: readonly StudioVoxelConversionWorkspaceShellAction[] = [
    {
      commandId: 'voxel_conversion.plan',
      label: 'Plan',
      disabled: !proposalForAction('voxel_conversion.plan').accepted,
      accepted: proposalForAction('voxel_conversion.plan').accepted,
      reason: proposalForAction('voxel_conversion.plan').accepted
        ? 'Submit plan proposal to workspace authoring authority.'
        : readinessReason('voxel_conversion.plan'),
    },
    {
      commandId: 'voxel_conversion.preview',
      label: 'Preview',
      disabled: !proposalForAction('voxel_conversion.preview').accepted,
      accepted: proposalForAction('voxel_conversion.preview').accepted,
      reason: proposalForAction('voxel_conversion.preview').accepted
        ? 'Submit preview proposal to workspace authoring authority.'
        : readinessReason('voxel_conversion.preview'),
    },
    {
      commandId: 'voxel_conversion.apply',
      label: 'Apply',
      disabled: !proposalForAction('voxel_conversion.apply').accepted,
      accepted: proposalForAction('voxel_conversion.apply').accepted,
      reason: proposalForAction('voxel_conversion.apply').accepted
        ? 'Submit guarded apply proposal to workspace authoring authority.'
        : readinessReason('voxel_conversion.apply'),
    },
    {
      commandId: 'voxel_conversion.export_evidence',
      label: 'Export',
      disabled: !proposalForAction('voxel_conversion.export_evidence').accepted,
      accepted: proposalForAction('voxel_conversion.export_evidence').accepted,
      reason: proposalForAction('voxel_conversion.export_evidence').accepted
        ? 'Submit evidence export proposal to workspace authoring authority.'
        : readinessReason('voxel_conversion.export_evidence'),
    },
  ];

  return {
    shellVersion: 'voxel-conversion-shell.v0',
    workspace,
    readout,
    sourceOptions: options.sourceOptions,
    settingsDraft: options.draft,
    planProposal,
    previewProposal,
    applyProposal,
    exportProposal,
    previewProjection,
    sourceMetadata,
    commandTimeline,
    evidenceRows,
    states,
    regions,
    actions,
    authoringAvailable: options.runtimeSession !== null,
    shellHash: `${workspace.readoutHash}:${readout.readoutHash}:${planProposal.accepted}:${previewProposal.accepted}:${applyProposal.accepted}:${exportProposal.accepted}:${previewProjection.status}:${sourceMetadata.readoutHash}:${commandTimeline.length}:${evidenceRows.length}`,
  };
}

export function buildStudioVoxelConversionWorkspaceShellForInputs(options: {
  readonly draft: StudioVoxelConversionSettingsDraft;
  readonly sourceOptions?: readonly StudioVoxelConversionSourceOption[];
  readonly selectedSource: StudioAssetInventoryEntryReadModel | null;
  readonly importedSource?: StudioImportedVoxelConversionSource | null;
  readonly sessionId: string;
  readonly expectedTimelineSequence: number;
  readonly runtimeSession?: Partial<Pick<WorkspaceAuthoringFacade, 'planVoxelConversion' | 'previewVoxelConversion' | 'applyVoxelConversion' | 'exportVoxelConversionEvidence'>> | null;
  readonly authorityState?: StudioVoxelConversionAuthorityState;
}): StudioVoxelConversionWorkspaceShellReadModel {
  return buildVoxelConversionWorkspaceShellReadModel({
    draft: options.draft,
    sourceOptions: options.sourceOptions ?? [],
    selectedSource: options.selectedSource,
    importedSource: options.importedSource ?? null,
    sessionId: options.sessionId,
    expectedTimelineSequence: options.expectedTimelineSequence,
    runtimeSession: options.runtimeSession ?? null,
    authorityState: options.authorityState ?? EMPTY_VOXEL_CONVERSION_AUTHORITY_STATE,
  });
}

function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function projectFileApiBase(): string {
  const configured = browserStorage()?.getItem('asha-studio.project-file-api') ?? null;
  if (configured !== null && configured.length > 0) {
    return configured.replace(/\/$/, '');
  }
  const locationLike = globalThis.location;
  const protocol = locationLike?.protocol ?? 'http:';
  const hostname = locationLike?.hostname ?? '127.0.0.1';
  return `${protocol}//${hostname}:4300`;
}

function normalizeProjectFilePath(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/\/+/g, '/');
  if (normalized === '/') {
    return normalized;
  }
  return normalized.replace(/\/$/, '');
}

function isCanonicalProjectFileSha256(value: string): boolean {
  return /^sha256:[0-9a-f]{64}$/.test(value);
}

function parentProjectDir(path: string): string {
  const normalized = normalizeProjectFilePath(path).replace(/\/$/, '');
  const slashIndex = normalized.lastIndexOf('/');
  if (slashIndex < 0) {
    return '';
  }
  return slashIndex === 0 ? '/' : normalized.slice(0, slashIndex);
}

function projectFileName(path: string): string {
  const normalized = normalizeProjectFilePath(path);
  const slashIndex = normalized.lastIndexOf('/');
  return slashIndex < 0 ? normalized : normalized.slice(slashIndex + 1);
}

function joinProjectFilePath(directory: string, fileName: string): string {
  const normalizedFileName = normalizeProjectFilePath(fileName.trim());
  if (normalizedFileName.length === 0) {
    return '';
  }
  if (normalizedFileName.startsWith('/') || /^[A-Za-z]:\//.test(normalizedFileName)) {
    return normalizedFileName;
  }
  const normalizedDirectory = normalizeProjectFilePath(directory);
  if (normalizedDirectory.length === 0) {
    return normalizedFileName;
  }
  if (normalizedDirectory === '/') {
    return `/${normalizedFileName.replace(/^\/+/, '')}`;
  }
  return `${normalizedDirectory}/${normalizedFileName.replace(/^\/+/, '')}`;
}

function projectFileEntrySort(left: StudioProjectFileEntry, right: StudioProjectFileEntry): number {
  if (left.kind !== right.kind) {
    return left.kind === 'directory' ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
}

function browserReachableWebSocketEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      const pageHost = globalThis.location?.hostname;
      if (pageHost !== undefined && pageHost.length > 0 && pageHost !== '127.0.0.1' && pageHost !== 'localhost') {
        url.hostname = pageHost;
      }
    }
    return url.toString();
  } catch {
    return endpoint;
  }
}

function createBrowserDevtoolsTransport(endpoint: string): StudioDevtoolsAttachTransport {
  const browserEndpoint = browserReachableWebSocketEndpoint(endpoint);
  return {
    exchange: message => new Promise((resolveExchange, reject) => {
      const socket = new WebSocket(browserEndpoint);
      const timer = globalThis.setTimeout(() => {
        socket.close();
        reject(new Error(`Devtools websocket timed out: ${browserEndpoint}`));
      }, 5000);
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify(message));
      }, { once: true });
      socket.addEventListener('message', event => {
        globalThis.clearTimeout(timer);
        socket.close();
        try {
          resolveExchange(JSON.parse(String(event.data)));
        } catch (error) {
          reject(error);
        }
      }, { once: true });
      socket.addEventListener('error', () => {
        globalThis.clearTimeout(timer);
        reject(new Error(`Devtools websocket failed: ${browserEndpoint}`));
      }, { once: true });
    }),
  };
}

function tupleWithIndex(
  tuple: readonly [number, number, number],
  index: number,
  value: number,
): readonly [number, number, number] {
  return tuple.map((entry, entryIndex) => entryIndex === index ? value : entry) as [number, number, number];
}

function asVoxelConversionMode(value: string): VoxelConversionMode {
  return value === 'surface' ? 'surface' : 'solid';
}

function asVoxelConversionFitPolicy(value: string): VoxelConversionFitPolicy {
  if (value === 'cover' || value === 'stretch') {
    return value;
  }
  return 'contain';
}

function asVoxelConversionOriginPolicy(value: string): VoxelConversionOriginPolicy {
  if (value === 'source_origin' || value === 'centered') {
    return value;
  }
  return 'target_min';
}

@Injectable({ providedIn: 'root' })
export class StudioPreferencesStore {
  private readonly preferencesState = signal<StudioPreferencesReadModel>(
    buildStudioPreferencesReadModel(),
  );

  readonly preferences = this.preferencesState.asReadonly();
  readonly renderSettings = computed(() => this.preferencesState().render);

  setPreferences(preferences: StudioPreferencesReadModel): void {
    this.preferencesState.set(preferences);
  }

  setRenderSetting(key: StudioRenderSettingKey, value: boolean): void {
    this.preferencesState.set(updateStudioRenderSetting(this.preferencesState(), key, value));
  }

  setLightingMode(mode: StudioLightingMode): void {
    this.preferencesState.set(updateStudioLightingMode(this.preferencesState(), mode));
  }
}

export interface StudioVoxelAuthoringModeReadModel {
  readonly mode: 'object' | 'edit';
  readonly activeAssetId: string | null;
  readonly activeInstanceId: string | null;
  readonly activeSceneNodeId: number | null;
  readonly bindingHash: string | null;
  readonly workingRevision: number | null;
  readonly selectedCell: VoxelCoord | null;
  readonly editAnchor: VoxelCoord | null;
  readonly message: string;
}

export type StudioVoxelBrushTool = 'select' | 'add' | 'paint' | 'erase';
export type StudioVoxelBrushSize = 1 | 3;

export interface StudioVoxelBrushReadModel {
  readonly tool: StudioVoxelBrushTool;
  readonly material: number;
  readonly materials: readonly number[];
  readonly size: StudioVoxelBrushSize;
  readonly shape: 'cube';
  readonly enabled: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly status: 'idle' | 'accepted' | 'rejected';
  readonly changedVoxelCount: number | null;
  readonly message: string;
}

interface StudioVoxelBrushState {
  readonly tool: StudioVoxelBrushTool;
  readonly material: number;
  readonly materials: readonly number[];
  readonly size: StudioVoxelBrushSize;
  readonly shape: 'cube';
  readonly status: 'idle' | 'accepted' | 'rejected';
  readonly changedVoxelCount: number | null;
  readonly message: string;
}

const INITIAL_VOXEL_BRUSH_STATE: StudioVoxelBrushState = {
  tool: 'select',
  material: 1,
  materials: [1],
  size: 1,
  shape: 'cube',
  status: 'idle',
  changedVoxelCount: null,
  message: 'Select a voxel face, then choose Add, Paint, or Erase.',
};

export function compileStudioVoxelBrushStroke(input: {
  readonly tool: Exclude<StudioVoxelBrushTool, 'select'>;
  readonly centers: readonly VoxelCoord[];
  readonly grid: number;
  readonly material: number;
  readonly size: StudioVoxelBrushSize;
}): CommandBatch {
  if (!Number.isSafeInteger(input.grid)) {
    throw new Error('Voxel brush grid must be a safe integer.');
  }
  if (!Number.isSafeInteger(input.material) || input.material < 1 || input.material > 255) {
    throw new Error('Voxel brush material must be an integer in 1..255.');
  }
  const radius = (input.size - 1) / 2;
  const commands = new Map<string, VoxelCommand>();
  for (const center of input.centers) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      for (let y = center.y - radius; y <= center.y + radius; y += 1) {
        for (let z = center.z - radius; z <= center.z + radius; z += 1) {
          const key = `${input.grid}:${x}:${y}:${z}`;
          commands.set(key, {
            op: 'setVoxel',
            grid: input.grid,
            coord: { x, y, z },
            value: input.tool === 'erase'
              ? { kind: 'empty' }
              : { kind: 'solid', material: input.material },
          });
        }
      }
    }
  }
  return {
    commands: [...commands.values()].sort((left, right) => {
      if (left.op !== 'setVoxel' || right.op !== 'setVoxel') return 0;
      return left.coord.x - right.coord.x
        || left.coord.y - right.coord.y
        || left.coord.z - right.coord.z;
    }),
  };
}

const STUDIO_STORED_SCENE_PROJECT_ID = projectId(1);

const INITIAL_VOXEL_AUTHORING_MODE: StudioVoxelAuthoringModeReadModel = {
  mode: 'object',
  activeAssetId: null,
  activeInstanceId: null,
  activeSceneNodeId: null,
  bindingHash: null,
  workingRevision: null,
  selectedCell: null,
  editAnchor: null,
  message: 'Object mode edits SceneDocument placement. Select a voxel instance to enter Voxel Edit mode.',
};

interface StudioSceneLightHistoryEntry {
  readonly before: FlatSceneDocument;
  readonly after: FlatSceneDocument;
  readonly command: SceneDocumentAuthoringCommand;
  readonly label: string;
}

interface StudioSceneLightHistory {
  readonly entries: readonly StudioSceneLightHistoryEntry[];
  readonly cursor: number;
}

interface StudioSceneTransformHistoryEntry {
  readonly before: FlatSceneDocument;
  readonly after: FlatSceneDocument;
  readonly label: string;
  readonly objectId: SceneObjectId;
}

interface StudioSceneTransformHistory {
  readonly entries: readonly StudioSceneTransformHistoryEntry[];
  readonly cursor: number;
}

export interface StudioSelectedSceneTransformTarget {
  readonly objectId: SceneObjectId;
  readonly renderableId: string | null;
  readonly revision: string;
  readonly transform: Transform;
  readonly lightFrame: RenderFrameDiff;
}

export interface StudioSceneTransformCommitResult {
  readonly accepted: boolean;
  readonly diagnostic: string;
  readonly revision: string;
}

@Injectable({ providedIn: 'root' })
export class StudioWorkspaceStore {
  private readonly preferencesStore = inject(StudioPreferencesStore);
  private readonly workspaceState = signal<StudioWorkspaceReadModel>(
    buildInitialWorkspaceReadModel(),
  );
  private readonly viewportCameraState = signal<StudioViewportCameraReadModel>(
    buildStudioViewportCameraReadModel(),
  );
  private readonly viewportToolState = signal<StudioViewportToolReadModel>(
    buildStudioViewportToolReadModel(),
  );
  private readonly activeSceneFilePathState = signal<string | null>(null);
  private readonly activeSceneFileHashState = signal<string | null>(null);
  private readonly cleanSceneDocumentHashState = signal(
    stableBrowserHash(JSON.stringify(this.workspaceState().flatSceneDocument)),
  );
  private readonly saveAsPathState = signal('untitled.scene.json');
  private readonly hostFileDialogIntentState = signal<StudioHostFileDialogIntent | null>(null);
  private readonly hostFileDialogResultState = signal<StudioHostFileDialogResult | null>(null);
  private readonly activeVoxelAssetFilePathState = signal<string | null>(null);
  private readonly activeVoxelAssetFileHashState = signal<string | null>(null);
  private readonly activeVoxelAssetIdState = signal<string | null>(null);
  private readonly voxelAssetHostSavePathOverrideState = signal<string | null>(null);
  private readonly projectFileEntriesState = signal<readonly StudioProjectFileEntry[]>([]);
  private readonly projectFileCurrentDirState = signal('');
  private readonly projectFileDirectoryPathState = signal('');
  private readonly projectFileSelectedPathState = signal<string | null>(null);
  private readonly projectFileNameState = signal('untitled.scene.json');
  private readonly projectFileConnectedState = signal(false);
  private readonly projectFileRootState = signal<string | null>(null);
  private readonly projectFileMessageState = signal('Studio host file service not connected.');
  private readonly unsavedScenePromptState = signal<StudioUnsavedScenePromptReadModel | null>(null);
  private readonly sceneFileConflictState = signal<StudioSceneFileConflictReadModel | null>(null);
  private readonly sceneDocumentCodecBridgeState = signal<NativeBrowserHostRuntimeBridge | null>(null);
  private readonly sceneDocumentContentHashState = signal<string | null>(null);
  private readonly authoredLightFrameState = signal<RenderFrameDiff>({ ops: [] });
  private readonly assetBrowserCategoryState = signal<StudioAssetBrowserCategory>('all');
  private readonly activeMenuState = signal<StudioApplicationMenu | null>(null);
  private readonly bottomPanelTabState = signal<StudioBottomPanelTab>('timeline');
  private readonly hierarchyFilterState = signal('');
  private readonly viewportHitState = signal<StudioViewportHitReadModel | null>(null);
  private readonly menuMessageState = signal('Workspace ready.');
  private readonly gameWorkspaceState = signal<StudioGameWorkspaceLoadResult>(
    loadDemoGameWorkspace(),
  );
  private readonly runtimeAttachState = signal<StudioGameWorkspaceAttachReadModel | null>(null);
  private readonly runtimeLiveState = signal<StudioGameWorkspaceLiveReadModel | null>(null);
  private readonly runtimeSessionBridgeState = signal<NativeBrowserHostRuntimeBridge | null>(null);
  private readonly runtimeSessionFacadeState = signal<RuntimeSessionFacade | null>(null);
  private readonly runtimeSessionStateSummaryState = signal<RuntimeSessionStateSummary | null>(null);
  private readonly runtimeSessionProjectionState = signal<RuntimeSessionProjectionSummary | null>(null);
  private readonly runtimeSessionTelemetryState = signal<RuntimeSessionTelemetrySummary | null>(null);
  private readonly workspaceAuthoringBridgeState = signal<NativeBrowserHostRuntimeBridge | null>(null);
  private readonly workspaceAuthoringFacadeState = signal<WorkspaceAuthoringFacade | null>(null);
  private readonly workspaceAuthoringStateSummaryState = signal<WorkspaceAuthoringStateSummary | null>(null);
  private readonly workspaceAuthoringProjectionState = signal<StudioWorkspaceProjectionDelivery | null>(null);
  private workspaceAuthoringProjectionAcknowledgedHash: string | null = null;
  private readonly workspaceAuthoringProjectionTimings = new Map<string, StudioWorkspaceProjectionTiming>();
  private readonly workspaceAuthoringProjectionSamplesState = signal<readonly StudioWorkspaceProjectionRenderSample[]>([]);
  private readonly voxelProjectionBindingReceiptState = signal<VoxelProjectionBindingReceipt | null>(null);
  private readonly voxelAuthoringModeState = signal<StudioVoxelAuthoringModeReadModel>(
    INITIAL_VOXEL_AUTHORING_MODE,
  );
  private readonly voxelBrushState = signal<StudioVoxelBrushState>(INITIAL_VOXEL_BRUSH_STATE);
  private readonly sceneLightHistoryState = signal<StudioSceneLightHistory>({ entries: [], cursor: 0 });
  private readonly sceneTransformHistoryState = signal<StudioSceneTransformHistory>({ entries: [], cursor: 0 });
  private readonly transformManipulatorOrientationState = signal<'local' | 'world'>('world');
  private readonly transformManipulatorSnappingState = signal(true);
  private readonly workspaceAuthoringMessageState = signal('Starting workspace authoring authority.');
  private readonly runtimeViewportEvidenceState = signal<StudioRuntimeViewportEvidence>(
    MISSING_RUNTIME_VIEWPORT_EVIDENCE,
  );
  private readonly runtimeSessionPausedState = signal(false);
  private readonly generatedLevelPresetDraftState = signal<StudioGeneratedLevelPresetDraft>({
    presetId: 'tiny-enclosed',
    seed: 17,
  });
  private readonly generatedTunnelReadoutState = signal<GeneratedTunnelReadout | null>(null);
  private readonly generatedTunnelRegenerateReceiptState = signal<RuntimeSessionGeneratedTunnelOperationReceipt | null>(null);
  private readonly generatedTunnelNavProjectionState = signal<NavProjectionReadout | null>(null);
  private readonly gameplayPresetDraftState = signal<StudioFpsGameplayPresetDraft>(
    buildDefaultStudioFpsGameplayPresetDraft(),
  );
  private readonly playableLoopEncounterDirectorState = signal<EncounterDirectorReadout | null>(null);
  private readonly playableLoopEncounterTransitionReceiptState = signal<RuntimeSessionEncounterTransitionReceipt | null>(null);
  private readonly playableLoopCombatFeedbackProjectionState = signal<CombatFeedbackProjection | null>(null);
  private readonly playableLoopPolicyTickState = signal<RuntimeSessionAutonomousPolicyTickReadout | null>(null);
  private readonly playableLoopLifecycleState = signal<RuntimeSessionLifecycleStatusReadout | null>(null);
  private readonly playableLoopRestartReceiptState = signal<RuntimeSessionLifecycleRestartReceipt | null>(null);
  private readonly runtimeConnectionMessageState = signal('No running project connected.');
  private readonly catalogPathState = signal('packages/game-catalogs/catalog.json');
  private readonly catalogSourceState = signal<AshaGameAssetCatalog>(catalogFromInventoryArtifact());
  private readonly selectedCatalogWorkflowAssetIdState = signal<string | null>('mesh.demo-cube');
  private readonly catalogSourceEvidenceState = signal<readonly StudioCatalogSourceEvidenceInput[]>(
    DEMO_ASSET_INVENTORY_ARTIFACT.entries.map(entry => ({
      path: entry.sourcePath,
      exists: true,
      hash: entry.devResolution.sourceHash,
    })),
  );
  private readonly catalogWorkflowMessageState = signal('Catalog workflow ready.');
  private readonly assetInventoryState = signal<StudioAssetInventoryLoadResult>(
    loadDemoAssetInventory(),
  );
  private readonly voxelConversionDraftState = signal<StudioVoxelConversionSettingsDraft>(
    DEFAULT_VOXEL_CONVERSION_DRAFT,
  );
  private readonly voxelConversionAuthorityState = signal<StudioVoxelConversionAuthorityState>(
    EMPTY_VOXEL_CONVERSION_AUTHORITY_STATE,
  );
  private readonly importedVoxelConversionSourceState = signal<StudioImportedVoxelConversionSource | null>(null);
  private readonly voxelAssetWorkflowTargetDraftState = signal<StudioVoxelAssetWorkflowTargetDraft>(
    DEFAULT_VOXEL_ASSET_WORKFLOW_TARGET_DRAFT,
  );
  private readonly voxelAssetWorkflowControlState = signal<StudioVoxelAssetWorkflowControlReadModel>(
    DEFAULT_VOXEL_ASSET_WORKFLOW_CONTROL,
  );
  private readonly voxelTranscriptControlState = signal<StudioVoxelTranscriptControlReadModel>({
    controlVersion: 'studio-voxel-transcript-control.v0',
    draft: DEFAULT_VOXEL_TRANSCRIPT_DRAFT,
    status: 'idle',
    message: 'Paste a strict voxel-operation transcript or run the inspect example.',
    receipt: null,
  });
  private readonly voxelMaterialPaletteEditorState = signal<StudioVoxelMaterialPaletteEditorReadModel>(
    DEFAULT_VOXEL_MATERIAL_PALETTE_EDITOR,
  );
  private readonly voxelCompactEditControlState = signal<StudioVoxelCompactEditControlReadModel>(
    DEFAULT_VOXEL_COMPACT_EDIT_CONTROL,
  );
  private readonly voxelHistoryControlState = signal<StudioVoxelHistoryControlState>(
    DEFAULT_VOXEL_HISTORY_CONTROL,
  );
  private readonly voxelAnnotationControlState = signal<StudioVoxelAnnotationControlReadModel>(
    DEFAULT_VOXEL_ANNOTATION_CONTROL,
  );

  readonly workspace = this.workspaceState.asReadonly();
  readonly viewportCamera = this.viewportCameraState.asReadonly();
  readonly viewportTool = this.viewportToolState.asReadonly();
  readonly preferences = this.preferencesStore.preferences;
  readonly renderSettings = this.preferencesStore.renderSettings;
  readonly voxelAssetWorkflowTarget = computed<StudioVoxelAssetWorkflowTargetReadModel>(() => {
    const target = this.voxelAssetWorkflowTargetForCurrentDraft();
    return {
      controlVersion: 'studio-voxel-asset-workflow-target.v0',
      targetAssetId: target.targetAssetId,
      targetProjectBundle: target.projectBundle,
      targetAssetPath: target.assetPath,
      derivedProjectBundle: target.derivedProjectBundle,
      derivedAssetPath: target.derivedAssetPath,
      customProjectBundle: target.customProjectBundle,
      customAssetPath: target.customAssetPath,
      workspaceGameId: this.gameWorkspace()?.gameId ?? null,
    };
  });
  readonly voxelAssetWorkflowControl = computed<StudioVoxelAssetWorkflowControlReadModel>(() => {
    const target = this.voxelAssetWorkflowTargetForCurrentDraft();
    const control = this.voxelAssetWorkflowControlState();
    return {
      ...control,
      targetAssetId: target.targetAssetId,
      targetProjectBundle: target.projectBundle,
      targetAssetPath: target.assetPath,
    };
  });
  readonly voxelTranscriptControl = this.voxelTranscriptControlState.asReadonly();
  readonly voxelCompactEditControl = this.voxelCompactEditControlState.asReadonly();
  readonly voxelCompactEditPlacement = computed<StudioVoxelCompactEditPlacementReadModel>(() =>
    buildStudioVoxelCompactEditPlacementReadModel(
      this.voxelCompactEditControlState(),
      this.viewportHitState(),
    ),
  );
  readonly voxelHistoryPanel = computed<StudioVoxelHistoryPanelReadModel>(() =>
    buildStudioVoxelHistoryPanelReadModel(
      this.voxelHistoryControlState(),
      this.workspaceAuthoringFacadeState() !== null,
    ),
  );
  readonly voxelAnnotationControl = computed<StudioVoxelAnnotationControlReadModel>(() => {
    const control = this.voxelAnnotationControlState();
    const asset = this.voxelAssetWorkflowControl().lastAsset;
    const canSubmit = this.workspaceAuthoringFacadeState() !== null && asset !== null;
    return {
      ...control,
      canSubmit,
      readoutHash: stableAgentVoxelWorkflowHash('studio-voxel-annotation-control', {
        layerId: control.layerId,
        runtimeLayerId: control.runtimeLayerId,
        expectedLayerHash: control.expectedLayerHash,
        regionId: control.regionId,
        label: control.label,
        kind: control.kind,
        tags: control.tags,
        parentRegionId: control.parentRegionId,
        bounds: [control.x1, control.y1, control.z1, control.x2, control.y2, control.z2],
        assetHash: asset?.contentHashes.voxelData ?? null,
        diagnostics: control.diagnostics,
      }),
    };
  });
  readonly voxelMaterialAuthoring = computed<StudioVoxelMaterialAuthoringReadModel>(() =>
    buildStudioVoxelMaterialAuthoringReadModel({
      shell: this.voxelConversionWorkspaceShell(),
      assetWorkflow: this.voxelAssetWorkflowControl(),
      compactEdit: this.voxelCompactEditControl(),
    }),
  );
  readonly voxelMaterialPaletteEditor = this.voxelMaterialPaletteEditorState.asReadonly();
  readonly activeSceneFilePath = this.activeSceneFilePathState.asReadonly();
  readonly activeVoxelAssetFilePath = this.activeVoxelAssetFilePathState.asReadonly();
  readonly sceneDirty = computed(() =>
    stableBrowserHash(JSON.stringify(this.workspaceState().flatSceneDocument))
      !== this.cleanSceneDocumentHashState(),
  );
  readonly workspaceAuthoringDirty = computed(() => this.workspaceAuthoringStateSummaryState()?.dirty ?? false);
  readonly saveAsPath = this.saveAsPathState.asReadonly();
  readonly unsavedScenePrompt = this.unsavedScenePromptState.asReadonly();
  readonly sceneFileConflict = this.sceneFileConflictState.asReadonly();
  readonly projectFileDialog = computed<StudioProjectFileDialogReadModel>(() => {
    const intent = this.hostFileDialogIntentState();
    const mode = intent?.operation ?? null;
    const fileName = this.projectFileNameState();
    const targetPath = joinProjectFilePath(this.projectFileCurrentDirState(), fileName);
    const selectedEntry = this.projectFileEntriesState().find(
      entry => entry.path === this.projectFileSelectedPathState(),
    );
    const matchesAcceptedExtension = intent !== null
      && intent.acceptedExtensions.some(extension => targetPath.endsWith(extension));
    const openTargetIsFile = selectedEntry?.kind === 'file'
      || (selectedEntry === undefined && matchesAcceptedExtension);
    const entries = intent === null
      ? this.projectFileEntriesState()
      : this.projectFileEntriesState().filter(entry =>
          entry.kind === 'directory'
          || intent.acceptedExtensions.some(extension => entry.name.endsWith(extension)),
        );
    return {
      backend: 'host-server',
      mode,
      intent,
      resourceKind: intent?.resourceKind ?? null,
      title: intent?.title ?? 'Host File',
      fileTypeLabel: intent?.fileTypeLabel ?? 'Supported files',
      acceptedExtensions: intent?.acceptedExtensions ?? [],
      connected: this.projectFileConnectedState(),
      startDirectory: this.projectFileRootState(),
      currentDir: this.projectFileCurrentDirState(),
      directoryPath: this.projectFileDirectoryPathState(),
      entries,
      selectedPath: this.projectFileSelectedPathState(),
      fileName,
      targetPath,
      canConfirm: mode === 'open'
        ? openTargetIsFile && matchesAcceptedExtension
        : mode === 'save-as' && targetPath.length > 0 && matchesAcceptedExtension,
      message: this.projectFileMessageState(),
      lastResult: this.hostFileDialogResultState(),
    };
  });
  readonly assetBrowserCategory = this.assetBrowserCategoryState.asReadonly();
  readonly activeMenu = this.activeMenuState.asReadonly();
  readonly bottomPanelTab = this.bottomPanelTabState.asReadonly();
  readonly hierarchyFilter = this.hierarchyFilterState.asReadonly();
  readonly viewportHit = this.viewportHitState.asReadonly();
  readonly menuMessage = this.menuMessageState.asReadonly();
  readonly gameWorkspaceOverview = this.gameWorkspaceState.asReadonly();
  readonly runtimeConnectionMessage = this.runtimeConnectionMessageState.asReadonly();
  readonly workspaceAuthoringState = this.workspaceAuthoringStateSummaryState.asReadonly();
  readonly workspaceAuthoringProjection = this.workspaceAuthoringProjectionState.asReadonly();
  readonly workspaceAuthoringProjectionPerformance = computed(() =>
    buildStudioWorkspaceProjectionPerformanceReadModel(this.workspaceAuthoringProjectionSamplesState()),
  );
  readonly voxelAuthoringMode = this.voxelAuthoringModeState.asReadonly();
  readonly voxelBrush = computed<StudioVoxelBrushReadModel>(() => {
    const state = this.voxelBrushState();
    const history = this.voxelHistoryControlState().summary?.cursor;
    return {
      ...state,
      enabled: this.voxelAuthoringModeState().mode === 'edit',
      canUndo: (history?.undoDepth ?? 0) > 0,
      canRedo: (history?.redoDepth ?? 0) > 0,
    };
  });
  readonly lightingProjection = computed<StudioLightingProjectionReadModel>(() =>
    buildStudioLightingProjection(
      this.workspaceState().flatSceneDocument,
      this.renderSettings().lightingMode,
      this.authoredLightFrameState(),
    ),
  );
  readonly selectedAuthoredLight = computed<(SceneNodeRecord & {
    readonly kind: Extract<SceneNodeRecord['kind'], { readonly kind: 'light' }>;
  }) | null>(() => {
    const objectId = this.selectedEntity()?.sceneObjectId ?? null;
    const nodeId = objectId?.startsWith('scene-node:') === true
      ? Number.parseInt(objectId.slice('scene-node:'.length), 10)
      : Number.NaN;
    const node = this.workspaceState().flatSceneDocument.nodes.find(
      node => (node.id as number) === nodeId && node.kind.kind === 'light',
    );
    return node?.kind.kind === 'light'
      ? node as SceneNodeRecord & { readonly kind: Extract<SceneNodeRecord['kind'], { readonly kind: 'light' }> }
      : null;
  });
  readonly sceneLightHistory = computed(() => {
    const history = this.sceneLightHistoryState();
    return {
      canUndo: history.cursor > 0,
      canRedo: history.cursor < history.entries.length,
      undoLabel: history.cursor > 0 ? history.entries[history.cursor - 1]?.label ?? null : null,
      redoLabel: history.cursor < history.entries.length ? history.entries[history.cursor]?.label ?? null : null,
    };
  });
  readonly workspaceAuthoringMessage = this.workspaceAuthoringMessageState.asReadonly();
  readonly catalogWorkflowMessage = this.catalogWorkflowMessageState.asReadonly();
  readonly assetInventory = this.assetInventoryState.asReadonly();
  readonly gameWorkspace = computed(() => {
    const overview = this.gameWorkspaceState();
    return overview.ok ? overview.workspace : null;
  });
  readonly publishEvidence = computed(() =>
    loadStudioPublishEvidence(DEMO_PUBLISH_EVIDENCE, {
      workspace: this.gameWorkspace(),
      evidencePath: 'harness/out/publish-evidence/latest/index.json',
    }),
  );
  readonly runtimeSessions = computed(() => {
    const workspace = this.gameWorkspace();
    return workspace === null
      ? null
      : buildStudioRuntimeSessionList({
          workspace,
          attach: this.runtimeAttachState(),
          live: this.runtimeLiveState(),
        });
  });
  readonly workspaceAuthoringAvailable = computed(() => this.workspaceAuthoringFacadeState() !== null);
  readonly liveRuntimeAvailable = computed(() => this.runtimeSessionFacadeState() !== null);
  readonly runtimeViewportProjection = computed(() => this.runtimeSessionProjectionState());
  readonly runtimeViewportEvidence = computed(() => this.runtimeViewportEvidenceState());
  readonly runtimeSessionInspection = computed<StudioRuntimeSessionInspectionReadModel>(() =>
    buildStudioRuntimeSessionInspectionReadModel({
      workspace: this.workspaceState(),
      gameWorkspace: this.gameWorkspace(),
      runtimeSessions: this.runtimeSessions(),
      state: this.runtimeSessionStateSummaryState(),
      projection: this.runtimeSessionProjectionState(),
      telemetry: this.runtimeSessionTelemetryState(),
      autonomousPolicyTick: this.playableLoopPolicyTickState(),
      lifecycleStatus: this.playableLoopLifecycleState(),
      restartReceipt: this.playableLoopRestartReceiptState(),
      generatedLevelPreset: this.generatedLevelPresetDraftState(),
      generatedTunnelReadout: this.generatedTunnelReadoutState(),
      generatedTunnelRegenerateReceipt: this.generatedTunnelRegenerateReceiptState(),
      navProjection: this.generatedTunnelNavProjectionState(),
      gameplayPresetDraft: this.gameplayPresetDraftState(),
      encounterDirector: this.playableLoopEncounterDirectorState(),
      encounterTransitionReceipt: this.playableLoopEncounterTransitionReceiptState(),
      combatFeedbackProjection: this.playableLoopCombatFeedbackProjectionState(),
      paused: this.runtimeSessionPausedState(),
    }),
  );
  readonly ashaDemoProductPath = computed<StudioAshaDemoProductPathReadModel>(() =>
    buildStudioAshaDemoProductPathReadModel({
      gameWorkspace: this.gameWorkspace(),
      runtimeInspection: this.runtimeSessionInspection(),
    }),
  );
  readonly runningProjectDiscovery = computed<StudioRunningProjectDiscoveryReadModel>(() =>
    buildStudioRunningProjectDiscovery({
      workspace: this.gameWorkspace(),
      runtimeSessions: this.runtimeSessions(),
    }),
  );
  readonly catalogWorkflow = computed<StudioCatalogWorkflowReadModel>(() =>
    buildStudioCatalogWorkflowReadModel({
      workspace: this.gameWorkspace(),
      catalogPath: this.catalogPathState(),
      catalog: this.catalogSourceState(),
      catalogHash: studioCatalogAuthoringBaseHash(this.catalogSourceState()),
      selectedAssetId: this.selectedCatalogWorkflowAssetIdState(),
      sourceEvidence: this.catalogSourceEvidenceState(),
      referencedRenderableIds: demoReferencedRenderableIds(),
    }),
  );
  readonly commandProposalPanel = computed(() => {
    const workspace = this.gameWorkspace();
    const runtimeSessions = this.runtimeSessions();
    return workspace === null || runtimeSessions === null
      ? null
      : buildStudioCommandProposalPanel({
          workspace,
          runtimeSessions,
          commandProposals: buildDemoCommandProposalRows(workspace),
        });
  });
  readonly voxelConversionWorkspaceShell = computed<StudioVoxelConversionWorkspaceShellReadModel>(() => {
    const draft = this.voxelConversionDraftState();
    const assetInventory = this.assetInventoryState().inventory;
    const assetEntries = assetInventory?.entries ?? [];
    const importedSource = this.importedVoxelConversionSourceState();
    const sourceOptions = voxelConversionSourceOptions(assetEntries, draft.selectedSourceAssetId, importedSource);
    const selectedSource = assetEntries.find(entry => entry.assetId === draft.selectedSourceAssetId) ?? null;
    return buildVoxelConversionWorkspaceShellReadModel({
      draft,
      sourceOptions,
      selectedSource,
      importedSource,
      sessionId: this.workspaceState().session.sessionId,
      expectedTimelineSequence: this.workspaceState().timelineSequence + 1,
      runtimeSession: this.workspaceAuthoringFacadeState(),
      authorityState: this.voxelConversionAuthorityState(),
    });
  });

  agentVoxelWorkflowSurface(): StudioAgentVoxelWorkflowSurfaceReadModel {
    const inspection = this.runtimeSessionInspection();
    const authoring = this.workspaceAuthoringStateSummaryState();
    const shell = this.voxelConversionWorkspaceShell();
    const viewport = this.viewportAdapter();
    const body = {
      runtime: {
        attachState: inspection.attachState,
        sessionHash: inspection.sessionHash,
        acceptedCommandCount: inspection.commandSummary.acceptedCommandCount,
        rejectedCommandCount: inspection.commandSummary.rejectedCommandCount,
      },
      authoring: {
        available: authoring !== null && authoring.status === 'open',
        generation: authoring?.identity.generation ?? null,
        workingRevision: authoring?.workingRevision ?? null,
        storedRevision: authoring?.storedRevision ?? null,
        dirty: authoring?.dirty ?? false,
        lifecycleHash: authoring?.lifecycleHash ?? null,
      },
      conversion: {
        shellHash: shell.shellHash,
        readoutHash: shell.readout.readoutHash,
        status: shell.readout.status,
        authorityPosture: shell.readout.authorityPosture,
        actionStates: shell.actions.map(action => ({
          commandId: action.commandId,
          accepted: action.accepted,
          disabled: action.disabled,
        })),
        evidenceKinds: Array.from(new Set(shell.evidenceRows.map(row => row.kind))),
        outputVoxelCount: shell.previewProjection.outputVoxelCount,
        outputBoundsLabel: shell.previewProjection.outputBoundsLabel,
        diagnostics: shell.readout.diagnostics.map(diagnostic => diagnostic.code),
      },
      voxelEdit: {
        commandMessageType: 'command.propose' as const,
        supportedCommandOps: ['setVoxel'] as const,
        compactAffordances: AGENT_COMPACT_VOXEL_AFFORDANCES,
        maxCommands: AGENT_VOXEL_EDIT_MAX_COMMANDS,
        coordinateAbsLimit: AGENT_VOXEL_EDIT_COORDINATE_ABS_LIMIT,
        authoringAvailable: this.workspaceAuthoringFacadeState() !== null,
      },
      viewCapture: {
        supportedAngles: AGENT_VOXEL_VIEW_ANGLES,
        cameraHash: this.viewportCameraState().cameraHash,
        readbackHash: viewport.readbackHash,
        selectedRenderableId: this.workspaceState().scene.selectedRenderableId,
        evidenceKind: 'projection_view_readout' as const,
      },
      voxelStorage: {
        extension: VOXEL_ASSET_EXTENSION,
        mediaType: VOXEL_ASSET_MEDIA_TYPE,
        schemaVersion: VOXEL_ASSET_SCHEMA_VERSION,
        supportedOperations: ['export_voxel_volume_asset', 'save_voxel_volume_asset', 'load_voxel_volume_asset', 'persist_voxel_asset', 'reopen_voxel_asset'] as const,
        assetPlane: 'ProjectBundle' as const,
        authority: 'svc-voxel-asset' as const,
      },
      diagnostics: [
        ...(this.workspaceAuthoringFacadeState() === null ? ['workspace_authoring_unavailable'] : []),
        ...shell.readout.diagnostics.map(diagnostic => diagnostic.code),
      ],
      nonClaims: [
        'not_freeform_json_method_call',
        'not_private_studio_state_mutation',
        'not_voxelforge_mcp_transport',
      ],
    };
    return {
      surfaceVersion: 'studio-agent-voxel-workflow.v0',
      supportedOperations: AGENT_VOXEL_WORKFLOW_SUPPORTED_OPERATIONS,
      ...body,
      surfaceHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-workflow', body),
    };
  }

  runAgentVoxelWorkflowOperation(
    operation: StudioAgentVoxelWorkflowOperation,
  ): StudioAgentVoxelWorkflowResult {
    switch (operation.kind) {
      case 'inspect':
        return {
          accepted: true,
          operation: operation.kind,
          diagnostic: null,
          surface: this.agentVoxelWorkflowSurface(),
        };
      case 'register_conversion_source': {
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Workspace authoring authority is not ready for voxel conversion sources.',
            surface: this.agentVoxelWorkflowSurface(),
            sourceRegistration: null,
          };
        }
        try {
          const registration = facade.registerVoxelConversionSource(operation.registration);
          return {
            accepted: registration.registered,
            operation: operation.kind,
            diagnostic: registration.registered
              ? null
              : registration.diagnostics.at(0)?.message ?? 'Voxel conversion source registration rejected.',
            surface: this.agentVoxelWorkflowSurface(),
            sourceRegistration: registration,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel conversion source registration failed.',
            surface: this.agentVoxelWorkflowSurface(),
            sourceRegistration: null,
          };
        }
      }
      case 'register_conversion_mesh_asset': {
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Workspace authoring authority is not ready for project mesh conversion.',
            surface: this.agentVoxelWorkflowSurface(),
            sourceRegistration: null,
          };
        }
        try {
          const registration = facade.registerVoxelConversionMeshAsset(operation.registration);
          return {
            accepted: registration.registered,
            operation: operation.kind,
            diagnostic: registration.registered
              ? null
              : registration.diagnostics.at(0)?.message ?? 'Voxel conversion mesh asset registration rejected.',
            surface: this.agentVoxelWorkflowSurface(),
            sourceRegistration: registration,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel conversion mesh asset registration failed.',
            surface: this.agentVoxelWorkflowSurface(),
            sourceRegistration: null,
          };
        }
      }
      case 'import_conversion_mesh_source': {
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Workspace authoring authority is not ready for mesh import.',
            surface: this.agentVoxelWorkflowSurface(),
            meshSourceImport: null,
          };
        }
        try {
          const receipt = facade.importVoxelConversionMeshSource(operation.importRequest);
          const importReadout = buildStudioAgentVoxelMeshSourceImportReadModel(receipt);
          const accepted = receipt.imported && receipt.meshAsset !== null;
          if (accepted) {
            this.importedVoxelConversionSourceState.set({
              source: receipt.source,
              sourcePath: receipt.sourcePath,
              sourceByteCount: receipt.sourceByteCount,
              groupCount: receipt.groups.length,
              materialSlotCount: receipt.materialSlots.length,
            });
            this.voxelConversionDraftState.update(draft => ({
              ...draft,
              selectedSourceAssetId: receipt.source.assetId,
              meshPrimitive: receipt.source.meshPrimitive,
            }));
          }
          const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
            commandId: 'voxel_conversion.import_mesh_source',
            label: 'Agent Voxel Mesh Source Import',
            inputSummary: `asset=${receipt.source.assetId};format=${receipt.format};bytes=${receipt.sourceByteCount}`,
            outputSummary: accepted
              ? `Imported ${receipt.vertexCount} vertices and ${receipt.triangleCount} triangles for voxel conversion.`
              : receipt.diagnostics.at(0)?.message ?? 'Voxel conversion mesh source import was rejected.',
            status: accepted ? 'ok' : 'rejected',
          });
          this.workspaceState.set(recorded.workspace);
          this.menuMessageState.set(recorded.timelineEntry.outputSummary);
          return {
            accepted,
            operation: operation.kind,
            diagnostic: accepted ? null : recorded.timelineEntry.outputSummary,
            surface: this.agentVoxelWorkflowSurface(),
            meshSourceImport: importReadout,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel conversion mesh source import failed.',
            surface: this.agentVoxelWorkflowSurface(),
            meshSourceImport: null,
          };
        }
      }
      case 'configure_conversion': {
        this.voxelConversionAuthorityState.set(EMPTY_VOXEL_CONVERSION_AUTHORITY_STATE);
        this.applyAgentVoxelConversionPatch(operation.patch);
        return {
          accepted: true,
          operation: operation.kind,
          diagnostic: null,
          surface: this.agentVoxelWorkflowSurface(),
        };
      }
      case 'run_conversion': {
        const proposal = this.voxelConversionProposalForCommand(this.voxelConversionWorkspaceShell(), operation.commandId);
        this.submitVoxelConversionCommand(operation.commandId);
        return {
          accepted: proposal.accepted,
          operation: operation.kind,
          diagnostic: proposal.accepted ? null : proposal.diagnostics.at(0)?.message ?? 'voxel conversion proposal rejected',
          surface: this.agentVoxelWorkflowSurface(),
        };
      }
      case 'get_model_info': {
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Workspace authoring authority is not ready for voxel model inspection.',
            surface: this.agentVoxelWorkflowSurface(),
            modelInfo: null,
          };
        }
        try {
          const modelInfo = facade.readVoxelModelInfo(operation.request);
          return {
            accepted: modelInfo.resident,
            operation: operation.kind,
            diagnostic: modelInfo.resident
              ? null
              : modelInfo.diagnostics.at(0)?.message ?? 'Voxel model is not resident.',
            surface: this.agentVoxelWorkflowSurface(),
            modelInfo,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel model info read failed.',
            surface: this.agentVoxelWorkflowSurface(),
            modelInfo: null,
          };
        }
      }
      case 'get_model_window': {
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Workspace authoring authority is not ready for voxel window inspection.',
            surface: this.agentVoxelWorkflowSurface(),
            modelWindow: null,
          };
        }
        try {
          const modelWindow = facade.readVoxelModelWindow(operation.request);
          return {
            accepted: modelWindow.resident,
            operation: operation.kind,
            diagnostic: modelWindow.resident
              ? null
              : modelWindow.diagnostics.at(0)?.message ?? 'Voxel model is not resident.',
            surface: this.agentVoxelWorkflowSurface(),
            modelWindow,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel model window read failed.',
            surface: this.agentVoxelWorkflowSurface(),
            modelWindow: null,
          };
        }
      }
      case 'export_voxel_volume_asset': {
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Workspace authoring authority is not ready for voxel export.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeExport: null,
          };
        }
        try {
          const receipt = facade.exportVoxelVolumeAsset(operation.exportRequest);
          const exportReadout = buildStudioAgentVoxelVolumeExportReadModel(receipt);
          const accepted = receipt.exported && exportReadout.fullAssetPayload;
          const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
            commandId: 'voxel_asset.export_volume',
            label: 'Agent Voxel Volume Export',
            inputSummary: `grid=${receipt.request.grid};volume=${receipt.request.volumeAssetId ?? 'default'};asset=${receipt.request.targetAssetId}`,
            outputSummary: accepted
              ? `Voxel volume export ${exportReadout.canonicalJsonHash ?? exportReadout.exportHash}.`
              : receipt.diagnostics.at(0)?.message ?? 'Voxel volume export did not return a complete asset payload.',
            status: accepted ? 'ok' : 'rejected',
          });
          this.workspaceState.set(recorded.workspace);
          this.menuMessageState.set(recorded.timelineEntry.outputSummary);
          return {
            accepted,
            operation: operation.kind,
            diagnostic: accepted ? null : recorded.timelineEntry.outputSummary,
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeExport: exportReadout,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel volume asset export failed.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeExport: null,
          };
        }
      }
      case 'save_voxel_volume_asset': {
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Workspace authoring authority is not ready for voxel save.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeSave: null,
          };
        }
        try {
          const receipt = facade.saveVoxelVolumeAsset(operation.saveRequest);
          const saveReadout = buildStudioAgentVoxelVolumeSaveReadModel(receipt);
          const accepted = receipt.saved && saveReadout.fullAssetPayload;
          const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
            commandId: 'voxel_asset.save_volume',
            label: 'Agent Voxel Volume Save',
            inputSummary: `bundle=${receipt.request.targetProjectBundle};path=${receipt.request.targetAssetPath};asset=${receipt.request.exportRequest.targetAssetId}`,
            outputSummary: accepted
              ? `Voxel save ${saveReadout.operation ?? 'accepted'} ${saveReadout.nextCanonicalJsonHash ?? saveReadout.saveHash}.`
              : receipt.diagnostics.at(0)?.message ?? 'Voxel asset save transaction did not return an accepted diff and asset payload.',
            status: accepted ? 'ok' : 'rejected',
          });
          this.workspaceState.set(recorded.workspace);
          this.menuMessageState.set(recorded.timelineEntry.outputSummary);
          return {
            accepted,
            operation: operation.kind,
            diagnostic: accepted ? null : recorded.timelineEntry.outputSummary,
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeSave: saveReadout,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel volume asset save transaction failed.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeSave: null,
          };
        }
      }
      case 'load_voxel_volume_asset': {
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Workspace authoring authority is not ready to reopen a voxel asset.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeLoad: null,
          };
        }
        try {
          const receipt = facade.loadVoxelVolumeAsset(operation.loadRequest);
          this.refreshWorkspaceAuthoringState(facade);
          const loadReadout = buildStudioAgentVoxelVolumeLoadReadModel(receipt);
          const accepted = receipt.loaded
            && receipt.canonicalJsonHash === operation.loadRequest.asset.contentHashes.canonicalJson
            && receipt.voxelDataHash === operation.loadRequest.asset.contentHashes.voxelData;
          const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
            commandId: 'voxel_asset.load_volume',
            label: 'Agent Voxel Volume Load',
            inputSummary: `asset=${receipt.requestAssetId};grid=${receipt.grid};volume=${receipt.volumeAssetId ?? 'default'}`,
            outputSummary: accepted
              ? `Voxel asset loaded as ${receipt.modelId} with ${receipt.voxelCount} voxels.`
              : receipt.diagnostics.at(0)?.message ?? 'Voxel asset load did not return matching validation hashes.',
            status: accepted ? 'ok' : 'rejected',
          });
          this.workspaceState.set(recorded.workspace);
          this.menuMessageState.set(recorded.timelineEntry.outputSummary);
          return {
            accepted,
            operation: operation.kind,
            diagnostic: accepted ? null : recorded.timelineEntry.outputSummary,
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeLoad: loadReadout,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel volume asset load failed.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeLoad: null,
          };
        }
      }
      case 'unload_voxel_volume_asset': {
        const facade = this.runtimeSessionFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Attach RuntimeSession before unloading a resident voxel volume.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeUnload: null,
          };
        }
        try {
          const receipt = facade.unloadVoxelVolumeAsset(operation.unloadRequest);
          const unloadReadout = buildStudioAgentVoxelVolumeUnloadReadModel(receipt);
          const accepted = receipt.unloaded;
          const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
            commandId: 'voxel_asset.unload_volume',
            label: 'Agent Voxel Volume Unload',
            inputSummary: `grid=${receipt.grid};volume=${receipt.volumeAssetId ?? 'default'}`,
            outputSummary: accepted
              ? `Unloaded ${receipt.removedVoxelCount} resident voxels from ${receipt.modelId}.`
              : receipt.diagnostics.at(0)?.message ?? 'Voxel volume unload was rejected.',
            status: accepted ? 'ok' : 'rejected',
          });
          this.workspaceState.set(recorded.workspace);
          this.menuMessageState.set(recorded.timelineEntry.outputSummary);
          return {
            accepted,
            operation: operation.kind,
            diagnostic: accepted ? null : recorded.timelineEntry.outputSummary,
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeUnload: unloadReadout,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel volume unload failed.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeUnload: null,
          };
        }
      }
      case 'initialize_voxel_volume_authoring': {
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Workspace authoring authority is not ready to initialize a blank volume.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeAuthoringInitialize: null,
          };
        }
        try {
          const receipt = facade.initializeVoxelVolumeAuthoring(operation.initializeRequest);
          this.refreshWorkspaceAuthoringState(facade);
          const accepted = receipt.initialized;
          const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
            commandId: 'voxel_asset.initialize_authoring_volume',
            label: 'Agent Voxel Authoring Initialize',
            inputSummary: `grid=${receipt.grid};volume=${receipt.volumeAssetId ?? 'default'}`,
            outputSummary: accepted
              ? `Initialized blank authored voxel model ${receipt.modelId}.`
              : receipt.diagnostics.at(0)?.message ?? 'Voxel authoring initialization was rejected.',
            status: accepted ? 'ok' : 'rejected',
          });
          this.workspaceState.set(recorded.workspace);
          this.menuMessageState.set(recorded.timelineEntry.outputSummary);
          return {
            accepted,
            operation: operation.kind,
            diagnostic: accepted ? null : recorded.timelineEntry.outputSummary,
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeAuthoringInitialize: receipt,
          };
        } catch (error) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: error instanceof Error ? error.message : 'Voxel authoring initialization failed.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeAuthoringInitialize: null,
          };
        }
      }
      case 'view_from_angle': {
        const diagnostic = agentVoxelViewAngleDiagnostic(operation.view.angle);
        if (diagnostic !== null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic,
            surface: this.agentVoxelWorkflowSurface(),
            viewCapture: null,
          };
        }
        const capture = buildStudioAgentVoxelViewCaptureReadModel({
          workspace: this.workspaceState(),
          viewportTool: this.viewportToolState(),
          renderSettings: this.preferencesStore.renderSettings(),
          readbackMarker: this.readbackMarker(),
          angle: operation.view.angle,
          target: operation.view.target ?? 'selected',
        });
        this.viewportCameraState.set(capture.camera);
        const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
          commandId: 'voxel_view.from_angle',
          label: 'Agent Voxel View',
          inputSummary: `angle=${capture.angle};target=${capture.target};renderable=${capture.targetRenderableId ?? 'scene'}`,
          outputSummary: `View capture ${capture.captureHash}.`,
          status: 'ok',
        });
        this.workspaceState.set(recorded.workspace);
        this.menuMessageState.set(`Voxel view ${capture.angle} captured.`);
        return {
          accepted: true,
          operation: operation.kind,
          diagnostic: null,
          surface: this.agentVoxelWorkflowSurface(),
          viewCapture: capture,
        };
      }
      case 'publish_preview': {
        const artifactPath = operation.publication?.artifactPath ?? 'artifacts/agent-voxel-preview/latest/index.json';
        const pathDiagnostic = agentVoxelPreviewArtifactPathDiagnostic(artifactPath);
        if (pathDiagnostic !== null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: pathDiagnostic,
            surface: this.agentVoxelWorkflowSurface(),
            previewPublication: null,
          };
        }
        const shell = this.voxelConversionWorkspaceShell();
        const availableEvidenceCount = shell.evidenceRows.filter(row => row.status === 'available').length;
        if (shell.readout.authorityPosture !== 'authority_backed' || availableEvidenceCount === 0) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Publish preview requires authority-backed voxel preview evidence.',
            surface: this.agentVoxelWorkflowSurface(),
            previewPublication: null,
          };
        }
        const publication = buildStudioAgentVoxelPreviewPublicationReadModel({
          workspace: this.workspaceState(),
          shell,
          viewport: this.viewportAdapter(),
          readbackMarker: this.readbackMarker(),
          artifactPath,
          label: operation.publication?.label ?? 'Agent voxel preview',
        });
        const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
          commandId: 'voxel_preview.publish',
          label: 'Agent Voxel Preview',
          inputSummary: `path=${publication.artifactPath};readout=${publication.conversion.readoutHash}`,
          outputSummary: `Preview publication ${publication.publicationHash}.`,
          status: 'ok',
        });
        this.workspaceState.set(recorded.workspace);
        this.menuMessageState.set('Voxel preview publication prepared.');
        return {
          accepted: true,
          operation: operation.kind,
          diagnostic: null,
          surface: this.agentVoxelWorkflowSurface(),
          previewPublication: publication,
        };
      }
      case 'persist_voxel_asset': {
        const assetId = normalizeVoxelVolumeAssetId(operation.persistence.assetId);
        const artifactPath = operation.persistence.artifactPath ?? agentVoxelAssetArtifactPath(assetId);
        const pathDiagnostic = agentVoxelAssetArtifactPathDiagnostic(artifactPath);
        if (pathDiagnostic !== null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: pathDiagnostic,
            surface: this.agentVoxelWorkflowSurface(),
            voxelAssetPersistence: null,
          };
        }
        const shell = this.voxelConversionWorkspaceShell();
        if (operation.persistence.source.kind === 'conversion_preview') {
          const preview = shell.workspace.preview;
          const availableEvidenceCount = shell.evidenceRows.filter(row => row.status === 'available').length;
          if (shell.readout.authorityPosture !== 'authority_backed' || preview === null || availableEvidenceCount === 0) {
            return {
              accepted: false,
              operation: operation.kind,
              diagnostic: 'Persisting a converted voxel asset requires authority-backed preview/apply/export evidence.',
              surface: this.agentVoxelWorkflowSurface(),
              voxelAssetPersistence: null,
            };
          }
          if (preview.sampleVoxels.length !== preview.outputVoxelCount) {
            return {
              accepted: false,
              operation: operation.kind,
              diagnostic: 'Persisting a converted voxel asset requires a complete voxel asset payload, not a partial preview sample.',
              surface: this.agentVoxelWorkflowSurface(),
              voxelAssetPersistence: null,
            };
          }
        } else if (solidVoxelsFromBatch(operation.persistence.source.batch).length === 0) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Persisting a command-batch voxel asset requires at least one solid setVoxel command.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelAssetPersistence: null,
          };
        }
        const persistenceOptions = {
          workspace: this.workspaceState(),
          shell,
          source: operation.persistence.source,
          assetId,
          artifactPath,
        };
        const persistence = buildStudioAgentVoxelAssetPersistenceReadModel(
          operation.persistence.label === undefined
            ? persistenceOptions
            : { ...persistenceOptions, label: operation.persistence.label },
        );
        const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
          commandId: 'voxel_asset.persist',
          label: 'Agent Voxel Asset Persist',
          inputSummary: `path=${persistence.artifactPath};asset=${persistence.asset.assetId}`,
          outputSummary: `Voxel asset ${persistence.asset.contentHashes.canonicalJson} prepared for ProjectBundle storage.`,
          status: 'ok',
        });
        this.workspaceState.set(recorded.workspace);
        this.menuMessageState.set('Voxel asset persistence prepared.');
        return {
          accepted: true,
          operation: operation.kind,
          diagnostic: null,
          surface: this.agentVoxelWorkflowSurface(),
          voxelAssetPersistence: persistence,
        };
      }
      case 'reopen_voxel_asset': {
        const artifactPath = operation.reopen.artifactPath ?? agentVoxelAssetArtifactPath(operation.reopen.asset.assetId);
        const pathDiagnostic = agentVoxelAssetArtifactPathDiagnostic(artifactPath);
        if (pathDiagnostic !== null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: pathDiagnostic,
            surface: this.agentVoxelWorkflowSurface(),
            voxelAssetReopen: null,
          };
        }
        const reopenOptions = {
          asset: operation.reopen.asset,
          artifactPath,
        };
        const reopen = buildStudioAgentVoxelAssetReopenReadModel({
          ...reopenOptions,
          ...(operation.reopen.expectedAssetId === undefined ? {} : { expectedAssetId: operation.reopen.expectedAssetId }),
          ...(operation.reopen.expectedCanonicalJsonHash === undefined ? {} : { expectedCanonicalJsonHash: operation.reopen.expectedCanonicalJsonHash }),
        });
        const accepted = reopen.roundTripMatches
          && reopen.mediaType === VOXEL_ASSET_MEDIA_TYPE
          && reopen.schemaVersion === VOXEL_ASSET_SCHEMA_VERSION;
        const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
          commandId: 'voxel_asset.reopen',
          label: 'Agent Voxel Asset Reopen',
          inputSummary: `path=${reopen.artifactPath};asset=${reopen.assetId}`,
          outputSummary: accepted
            ? `Voxel asset reopened with ${reopen.voxelCount} voxels.`
            : 'Voxel asset reopen failed round-trip checks.',
          status: accepted ? 'ok' : 'rejected',
        });
        this.workspaceState.set(recorded.workspace);
        this.menuMessageState.set(recorded.timelineEntry.outputSummary);
        return {
          accepted,
          operation: operation.kind,
          diagnostic: accepted ? null : 'Voxel asset reopen failed schema, media type, id, or hash checks.',
          surface: this.agentVoxelWorkflowSurface(),
          voxelAssetReopen: reopen,
        };
      }
      case 'submit_voxel_edit':
        return this.submitAgentVoxelEdit(operation.batch);
      case 'submit_compact_voxel_edit': {
        const compiled = buildStudioAgentCompactVoxelEditBatch(operation.edit);
        if (!compiled.accepted || compiled.batch === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: compiled.diagnostic,
            surface: this.agentVoxelWorkflowSurface(),
            voxelEditReceipt: null,
            compiledVoxelEditBatch: null,
          };
        }
        return this.submitAgentVoxelEdit(compiled.batch, operation.kind);
      }
      default: {
        const unknownOperation = operation as { readonly kind?: unknown };
        return {
          accepted: false,
          operation: 'unsupported_operation',
          diagnostic: `unsupported agent voxel workflow operation ${String(unknownOperation.kind)}`,
          surface: this.agentVoxelWorkflowSurface(),
        };
      }
    }
  }

  runAgentVoxelOperationTranscriptReplay(
    transcriptInput: unknown,
  ): StudioAgentVoxelOperationTranscriptReplayReceipt {
    const validation = parseStudioAgentVoxelOperationTranscript(transcriptInput);
    if (!validation.accepted || validation.transcript === null) {
      return buildStudioAgentVoxelTranscriptReplayReceipt({ validation, operations: [] });
    }
    const operations = validation.transcript.operations.map(transcriptOperation => {
      const result = this.runAgentVoxelWorkflowOperation(
        agentVoxelTranscriptOperationToWorkflowOperation(transcriptOperation),
      );
      const expectedAccepted = agentVoxelTranscriptExpectedAccepted(transcriptOperation.expected);
      const expectationMatched = expectedAccepted === null ? true : result.accepted === expectedAccepted;
      const resultSummary = {
        operation: result.operation,
        accepted: result.accepted,
        diagnostic: result.diagnostic,
        surfaceHash: result.surface.surfaceHash,
        voxelEditReceiptHash: result.voxelEditReceipt === undefined || result.voxelEditReceipt === null
          ? null
          : stableAgentVoxelWorkflowHash('studio-agent-voxel-transcript-voxel-edit-receipt', result.voxelEditReceipt),
      };
      return {
        operationId: transcriptOperation.operationId,
        kind: transcriptOperation.kind,
        accepted: result.accepted,
        expectedAccepted,
        expectationMatched,
        diagnostic: expectationMatched
          ? result.diagnostic
          : [
              result.diagnostic,
              `Expected accepted=${String(expectedAccepted)} but replay returned accepted=${String(result.accepted)}`,
            ].filter((message): message is string => typeof message === 'string' && message.length > 0).join('; '),
        surfaceHash: result.surface.surfaceHash,
        resultHash: stableAgentVoxelWorkflowHash('studio-agent-voxel-transcript-operation-result', resultSummary),
      };
    });
    return buildStudioAgentVoxelTranscriptReplayReceipt({ validation, operations });
  }
  readonly workspaceCockpitEvidence = computed(() => {
    const assetInventory = this.assetInventoryState().inventory;
    return exportStudioWorkspaceCockpitEvidence({
      studioWorkspace: this.workspaceState(),
      gameWorkspace: this.gameWorkspace(),
      assetInventory,
      runtimeSessions: this.runtimeSessions(),
      commandProposalPanel: this.commandProposalPanel(),
      publishEvidence: this.publishEvidence().publishEvidence,
      visiblePanelMarkers: [
        'studio-game-workspace-overview',
        'studio-assets-panel',
        'studio-runtime-session-panel',
        'studio-command-proposal-panel',
        'studio-publish-evidence-panel',
      ],
    });
  });

  constructor() {
    installStudioVoxelWorkflowProductApi(this);
    void this.refreshProjectFiles('');
    void this.openWorkspaceAuthoring();
  }

  readonly selectedEntity = computed(() => {
    const workspace = this.workspaceState();
    return (
      workspace.entities.find(entity => entity.id === workspace.selectedEntityId) ??
      null
    );
  });

  readonly selectedRenderable = computed(() => {
    const workspace = this.workspaceState();
    return (
      workspace.scene.renderables.find(
        renderable => renderable.renderableId === workspace.scene.selectedRenderableId,
      ) ?? null
    );
  });

  readonly selectedSceneObjectTransformEditable = computed(() => {
    const workspace = this.workspaceState();
    const selectedEntity = workspace.entities.find(entity => entity.id === workspace.selectedEntityId);
    if (selectedEntity?.sceneObjectId === null || selectedEntity?.sceneObjectId === undefined) {
      return false;
    }
    return (
      workspace.sceneObjectSnapshot.objects.find(
        object => object.objectId === selectedEntity.sceneObjectId,
      )?.editability.transform ?? false
    );
  });

  readonly selectedSceneTransformTarget = computed<StudioSelectedSceneTransformTarget | null>(() => {
    if (!this.selectedSceneObjectTransformEditable()) return null;
    const workspace = this.workspaceState();
    const selectedEntity = workspace.entities.find(entity => entity.id === workspace.selectedEntityId);
    const objectId = selectedEntity?.sceneObjectId ?? null;
    if (objectId === null || !objectId.startsWith('scene-node:')) return null;
    const nodeId = Number.parseInt(objectId.slice('scene-node:'.length), 10);
    const node = workspace.flatSceneDocument.nodes.find(candidate => (candidate.id as number) === nodeId);
    if (node === undefined || !Number.isSafeInteger(nodeId)) return null;
    return {
      objectId,
      renderableId: workspace.scene.selectedRenderableId,
      revision: studioSceneAuthoringBaseHash(workspace.flatSceneDocument),
      transform: node.transform,
      lightFrame: this.lightingProjection().frame,
    };
  });

  readonly transformManipulatorOrientation = this.transformManipulatorOrientationState.asReadonly();
  readonly transformManipulatorSnapping = this.transformManipulatorSnappingState.asReadonly();
  readonly sceneTransformHistory = computed(() => {
    const history = this.sceneTransformHistoryState();
    return {
      canUndo: history.cursor > 0,
      canRedo: history.cursor < history.entries.length,
      undoLabel: history.cursor > 0 ? history.entries[history.cursor - 1]?.label ?? null : null,
      redoLabel: history.cursor < history.entries.length ? history.entries[history.cursor]?.label ?? null : null,
    };
  });

  readonly assetRenderables = computed(() => {
    const workspace = this.workspaceState();
    return filterAssetBrowserRenderables(
      workspace.scene.renderables,
      this.assetBrowserCategoryState(),
    );
  });

  readonly assetBrowserCategories = computed(() =>
    buildAssetBrowserCategories(this.workspaceState().scene.renderables).map(category => {
      const inventory = this.assetInventoryState();
      if (!inventory.ok || category.category === 'generated' || category.category === 'preview') {
        return category;
      }
      const count = category.category === 'all'
        ? inventory.inventory.entries.length
        : inventory.inventory.entries.filter(entry => {
            if (category.category === 'static_meshes') {
              return entry.kind === 'static_mesh';
            }
            if (category.category === 'materials') {
              return entry.kind === 'material';
            }
            return entry.kind === 'texture';
          }).length;
      return { ...category, count };
    }),
  );

  readonly assetBrowserSummary = computed(() => {
    const category = this.assetBrowserCategoryState();
    const matchingCategory = this.assetBrowserCategories().find(item => item.category === category);
    return `${matchingCategory?.label ?? 'Assets'} · ${this.assetRenderables().length}`;
  });

  readonly catalogAssetEntries = computed(() => {
    const inventory = this.assetInventoryState();
    if (!inventory.ok && inventory.inventory === null) {
      return [];
    }
    const entries = inventory.inventory?.entries ?? [];
    return entries.filter(entry => this.catalogAssetMatchesCategory(entry));
  });

  readonly latestTimelineEntry = computed(() => {
    const workspace = this.workspaceState();
    return workspace.timeline.at(-1) ?? null;
  });

  readonly readbackMarker = computed(() => {
    const workspace = this.workspaceState();
    return `${workspace.session.sessionId}:${workspace.scene.sceneHash}:${workspace.timelineSequence}`;
  });

  readonly viewportAdapter = computed(() =>
    buildStudioViewportAdapterReadModel({
      scene: this.workspaceState().scene,
      camera: this.viewportCameraState(),
      tool: this.viewportToolState(),
      renderSettings: this.preferencesStore.renderSettings(),
    }),
  );

  readonly compactAgentReadout = computed(() =>
    createStudioCompactAgentReadout({
      workspace: this.workspaceState(),
      renderSettings: this.preferencesStore.renderSettings(),
      viewportCamera: this.viewportCameraState(),
      viewportTool: this.viewportToolState(),
      uiState: this.uiState(),
      latestViewportHit: this.viewportHitState(),
    }),
  );

  readonly viewportReadout = computed(() =>
    buildStudioViewportReadout({
      camera: this.viewportCameraState(),
      tool: this.viewportToolState(),
    }),
  );

  readonly gameWorkspaceReadout = computed<StudioGameWorkspaceReadout | null>(() => {
    const workspace = this.gameWorkspace();
    return workspace === null ? null : buildStudioGameWorkspaceReadout(workspace);
  });

  readonly uiState = computed(() =>
    buildStudioUiStateReadModel({
      activeMenu: this.activeMenuState(),
      bottomPanelTab: this.bottomPanelTabState(),
      assetBrowserCategory: this.assetBrowserCategoryState(),
      entities: this.workspaceState().entities,
      hierarchyFilter: this.hierarchyFilterState(),
      menuMessage: this.menuMessageState(),
      projectWorkspaceAvailable: this.projectFileConnectedState(),
    }),
  );

  selectEntity(entityId: string): void {
    const workspace = this.workspaceState();
    const intent = createSelectEntityIntent(workspace, entityId);
    const dispatchResult = mapStudioIntentToCommand(intent);

    if (!dispatchResult.accepted || dispatchResult.proposal === null) {
      return;
    }
    if (dispatchResult.proposal.commandId !== 'selection.set_active_entity' || dispatchResult.proposal.entityId === undefined) {
      return;
    }

    const selectedWorkspace = applySelectedEntityReadModel(workspace, dispatchResult.proposal.entityId);
    this.workspaceState.set(selectedWorkspace);
    const editContext = this.voxelAuthoringModeState();
    const selectedSceneObjectId = selectedWorkspace.entities.find(
      entity => entity.id === selectedWorkspace.selectedEntityId,
    )?.sceneObjectId ?? null;
    if (
      editContext.mode === 'edit'
      && selectedSceneObjectId !== editContext.activeInstanceId
    ) {
      this.setVoxelAuthoringMode('object');
      this.menuMessageState.set('Returned to Object mode because hierarchy selection changed.');
    }
  }

  setVoxelAuthoringMode(mode: 'object' | 'edit'): void {
    if (mode === 'object') {
      this.voxelAuthoringModeState.set({
        ...INITIAL_VOXEL_AUTHORING_MODE,
        activeAssetId: this.activeVoxelAssetIdState(),
      });
      this.voxelBrushState.update(state => ({
        ...state,
        tool: 'select',
        status: 'idle',
        changedVoxelCount: null,
        message: 'Voxel pointer tools are available in Voxel Edit mode.',
      }));
      return;
    }
    const workspace = this.workspaceState();
    const selectedEntity = workspace.entities.find(entity => entity.id === workspace.selectedEntityId);
    const sceneObjectId = selectedEntity?.sceneObjectId ?? null;
    const sceneNodeIdValue = sceneObjectId?.startsWith('scene-node:') === true
      ? Number.parseInt(sceneObjectId.slice('scene-node:'.length), 10)
      : Number.NaN;
    const node = Number.isSafeInteger(sceneNodeIdValue)
      ? workspace.flatSceneDocument.nodes.find(candidate => (candidate.id as number) === sceneNodeIdValue)
      : undefined;
    if (node?.kind.kind !== 'voxelVolume') {
      this.menuMessageState.set('Select a voxelVolume scene instance before entering Voxel Edit mode.');
      return;
    }
    const activeAssetId = this.activeVoxelAssetIdState();
    if (activeAssetId === null || node.kind.asset.id !== activeAssetId) {
      this.menuMessageState.set(
        `Cannot edit ${node.kind.asset.id}; open that voxel asset in the authoring workspace first.`,
      );
      return;
    }
    const receipt = this.voxelProjectionBindingReceiptState();
    const state = this.workspaceAuthoringStateSummaryState();
    const instanceId = voxelInstanceId(node.id);
    if (
      receipt === null
      || state === null
      || receipt.workingRevision !== state.workingRevision
      || !buildStudioVoxelProjectionBindingPlan(workspace.flatSceneDocument, activeAssetId)
        .instances.some(instance => instance.instanceId === instanceId)
    ) {
      this.menuMessageState.set('Voxel Edit mode needs a current Rust projection binding for the selected instance.');
      return;
    }
    this.voxelAuthoringModeState.set({
      mode: 'edit',
      activeAssetId,
      activeInstanceId: instanceId,
      activeSceneNodeId: node.id as number,
      bindingHash: receipt.bindingHash,
      workingRevision: receipt.workingRevision,
      selectedCell: null,
      editAnchor: null,
      message: `Editing ${activeAssetId} through instance ${instanceId}. Voxel coordinates are asset-local.`,
    });
    this.viewportToolState.set(buildStudioViewportToolReadModel('select'));
    this.voxelBrushState.update(state => ({
      ...state,
      tool: 'select',
      status: 'idle',
      changedVoxelCount: null,
      message: 'Select a visible voxel face, then choose Add, Paint, or Erase.',
    }));
    this.menuMessageState.set(`Voxel Edit mode · ${node.label ?? instanceId} · ${activeAssetId}.`);
  }

  setVoxelBrushTool(tool: StudioVoxelBrushTool): void {
    if (this.voxelAuthoringModeState().mode !== 'edit') {
      this.menuMessageState.set('Enter Voxel Edit mode before choosing a voxel pointer tool.');
      return;
    }
    this.viewportToolState.set(buildStudioViewportToolReadModel('select'));
    this.voxelBrushState.update(state => ({
      ...state,
      tool,
      status: 'idle',
      changedVoxelCount: null,
      message: tool === 'select'
        ? 'Select inspects an authority-resolved local voxel without mutation.'
        : `${tool[0]?.toUpperCase() ?? ''}${tool.slice(1)} is active. Drag across visible faces for one undoable stroke.`,
    }));
  }

  setVoxelBrushMaterial(material: number): void {
    if (
      !Number.isSafeInteger(material)
      || material < 1
      || material > 255
      || !this.voxelBrushState().materials.includes(material)
    ) return;
    this.voxelBrushState.update(state => ({
      ...state,
      material,
      status: 'idle',
      changedVoxelCount: null,
      message: `Active voxel material ${material}.`,
    }));
  }

  private setVoxelBrushPaletteFromAsset(asset: VoxelVolumeAsset): void {
    const materials = [...new Set(asset.materialPalette.map(binding => binding.voxelMaterial))]
      .filter(material => Number.isSafeInteger(material) && material >= 1 && material <= 255)
      .sort((left, right) => left - right);
    this.voxelBrushState.update(state => ({
      ...state,
      material: materials.includes(state.material) ? state.material : materials[0] ?? 1,
      materials: materials.length === 0 ? [1] : materials,
    }));
  }

  setVoxelBrushSize(size: number): void {
    if (size !== 1 && size !== 3) return;
    this.voxelBrushState.update(state => ({
      ...state,
      size,
      status: 'idle',
      changedVoxelCount: null,
      message: `${size} x ${size} x ${size} cube brush selected.`,
    }));
  }

  commitVoxelBrushStroke(centers: readonly VoxelCoord[]): boolean {
    const brush = this.voxelBrushState();
    const context = this.voxelAuthoringModeState();
    const authoringState = this.workspaceAuthoringStateSummaryState();
    const binding = this.voxelProjectionBindingReceiptState();
    if (brush.tool === 'select') return false;
    if (
      context.mode !== 'edit'
      || context.activeInstanceId === null
      || context.workingRevision === null
      || authoringState === null
      || binding === null
      || context.workingRevision !== authoringState.workingRevision
      || binding.workingRevision !== authoringState.workingRevision
    ) {
      const message = 'Voxel stroke rejected because its pick/binding revision is stale. Select the surface again.';
      this.voxelBrushState.update(state => ({
        ...state,
        status: 'rejected',
        changedVoxelCount: null,
        message,
      }));
      this.menuMessageState.set(message);
      return false;
    }
    try {
      const batch = compileStudioVoxelBrushStroke({
        tool: brush.tool,
        centers,
        grid: this.voxelConversionDraftState().targetGrid,
        material: brush.material,
        size: brush.size,
      });
      const result = this.submitAgentVoxelEdit(batch);
      const changedVoxelCount = result.voxelEditReceipt?.result.accepted ?? 0;
      const message = result.accepted
        ? `${brush.tool[0]?.toUpperCase() ?? ''}${brush.tool.slice(1)} stroke changed ${changedVoxelCount} voxel${changedVoxelCount === 1 ? '' : 's'}.`
        : result.diagnostic ?? 'Voxel stroke rejected by Rust authority.';
      this.voxelBrushState.update(state => ({
        ...state,
        status: result.accepted ? 'accepted' : 'rejected',
        changedVoxelCount: result.accepted ? changedVoxelCount : null,
        message,
      }));
      this.menuMessageState.set(message);
      return result.accepted;
    } catch (error) {
      const message = errorMessage(error);
      this.voxelBrushState.update(state => ({
        ...state,
        status: 'rejected',
        changedVoxelCount: null,
        message,
      }));
      this.menuMessageState.set(message);
      return false;
    }
  }

  undoVoxelBrushStroke(): void {
    this.runVoxelHistoryControl('undo');
    this.syncVoxelBrushFromHistory('Undo');
  }

  redoVoxelBrushStroke(): void {
    this.runVoxelHistoryControl('redo');
    this.syncVoxelBrushFromHistory('Redo');
  }

  selectAuthoredVoxelInstanceAtViewport(input: {
    readonly cameraOrigin: readonly [number, number, number];
    readonly instanceId: string;
    readonly worldNormal: readonly [number, number, number];
    readonly worldPosition: readonly [number, number, number];
  }): VoxelInstancePickResult | null {
    const workspace = this.workspaceState();
    const instance = buildStudioVoxelProjectionBindingPlan(
      workspace.flatSceneDocument,
      this.activeVoxelAssetIdState(),
    ).instances.find(candidate => candidate.instanceId === input.instanceId);
    if (instance === undefined) {
      this.menuMessageState.set(`Projection pick rejected: unknown or nonresident instance ${input.instanceId}.`);
      return null;
    }
    if (this.voxelAuthoringModeState().mode === 'object') {
      this.selectEntity(instance.instanceId);
      this.menuMessageState.set(`Selected voxel instance ${instance.instanceId} in Object mode.`);
      return null;
    }
    const context = this.voxelAuthoringModeState();
    if (context.activeInstanceId !== instance.instanceId || context.activeAssetId !== instance.assetId) {
      this.menuMessageState.set('Voxel pick rejected: the hit is not the active Edit-mode instance and asset.');
      return null;
    }
    const facade = this.workspaceAuthoringFacadeState();
    const evidence = buildStudioVoxelRendererPickEvidence({
      cameraOrigin: input.cameraOrigin,
      instanceTransform: instance.transform,
      worldNormal: input.worldNormal,
      worldPosition: input.worldPosition,
    });
    if (facade === null || evidence === null) {
      this.menuMessageState.set('Voxel pick rejected: authoring authority or renderer evidence is unavailable.');
      return null;
    }
    try {
      const result = facade.pickVoxelInstance({
        instanceId: instance.instanceId,
        origin: input.cameraOrigin,
        direction: evidence.direction,
        maxDistance: evidence.maxDistance,
        rendererHint: evidence.rendererHint,
      });
      if (result.outcome.outcome === 'rejected') {
        this.menuMessageState.set(`Voxel pick rejected by Rust: ${result.outcome.rejection}.`);
        return result;
      }
      const hit = result.outcome.voxelInstancePickHit;
      this.voxelAuthoringModeState.set({
        ...context,
        bindingHash: result.bindingHash,
        workingRevision: result.workingRevision,
        selectedCell: hit.localVoxel,
        editAnchor: hit.localPlaceAnchor,
        message: `Selected local cell ${hit.localVoxel.x},${hit.localVoxel.y},${hit.localVoxel.z}; place anchor ${hit.localPlaceAnchor.x},${hit.localPlaceAnchor.y},${hit.localPlaceAnchor.z}.`,
      });
      this.menuMessageState.set(this.voxelAuthoringModeState().message);
      return result;
    } catch (error) {
      this.menuMessageState.set(`Voxel pick rejected before invocation: ${errorMessage(error)}`);
      return null;
    }
  }

  setVoxelInstanceProjectionBounds(
    instanceId: string,
    bounds: StudioBounds,
  ): void {
    if (!instanceId.startsWith('scene-node:')) return;
    const renderableId = `scene-node-renderable:${instanceId.slice('scene-node:'.length)}`;
    this.workspaceState.update(workspace =>
      applyProjectedRenderableBoundsReadModel(workspace, renderableId, bounds),
    );
  }

  renameSceneObject(objectId: SceneObjectId, label: string): void {
    const workspace = this.workspaceState();
    const request = createRenameSceneObjectRequest(workspace, objectId, label);
    if (request.command.kind !== 'rename') return;
    const accepted = this.adoptRustAcceptedSceneCommand(workspace, {
      ...request.command,
      target: this.storedSceneAuthoringTarget(workspace.flatSceneDocument),
    });
    if (accepted) this.menuMessageState.set(`Renamed ${objectId}.`);
  }

  reparentSceneObject(objectId: SceneObjectId, parentObjectId: SceneObjectId | null, childOrder = 0): void {
    if (this.voxelAuthoringModeState().mode === 'edit') {
      this.menuMessageState.set('Exit Voxel Edit mode before changing scene hierarchy.');
      return;
    }
    const workspace = this.workspaceState();
    const request = createReparentSceneObjectRequest(workspace, objectId, parentObjectId, childOrder);
    if (request.command.kind !== 'reparent') return;
    const accepted = this.adoptRustAcceptedSceneCommand(workspace, {
      ...request.command,
      target: this.storedSceneAuthoringTarget(workspace.flatSceneDocument),
    });
    if (accepted) this.menuMessageState.set(`Reparented ${objectId}.`);
  }

  translateSelectedSceneObject(delta: readonly [number, number, number]): void {
    if (this.voxelAuthoringModeState().mode === 'edit') {
      this.menuMessageState.set('Exit Voxel Edit mode before moving a scene instance.');
      return;
    }
    const workspace = this.workspaceState();
    const objectId = workspace.selectedEntityId;
    if (objectId === null || !objectId.startsWith('scene-node:')) {
      this.menuMessageState.set('Select a scene object before moving it.');
      return;
    }
    const target = this.selectedSceneTransformTarget();
    if (target === null || target.objectId !== objectId) return;
    this.commitSelectedSceneObjectTransform(target.revision, {
      ...target.transform,
      translation: [
        target.transform.translation[0] + delta[0],
        target.transform.translation[1] + delta[1],
        target.transform.translation[2] + delta[2],
      ],
    });
  }

  rotateSelectedSceneObject(rotation: readonly [number, number, number, number]): void {
    if (this.voxelAuthoringModeState().mode === 'edit') {
      this.menuMessageState.set('Exit Voxel Edit mode before rotating a scene instance.');
      return;
    }
    const workspace = this.workspaceState();
    const objectId = workspace.selectedEntityId;
    if (objectId === null || !objectId.startsWith('scene-node:')) {
      this.menuMessageState.set('Select a scene object before rotating it.');
      return;
    }
    const target = this.selectedSceneTransformTarget();
    if (target === null || target.objectId !== objectId) return;
    this.commitSelectedSceneObjectTransform(target.revision, {
      ...target.transform,
      rotation,
    });
  }

  private adoptRustAcceptedSceneCommand(
    current: StudioWorkspaceReadModel,
    command: SceneDocumentAuthoringCommand,
  ): boolean {
    const authored = this.requestStoredSceneDocumentAuthoring(
      current.flatSceneDocument,
      command,
    );
    if (
      !authored.accepted
      || authored.document === null
      || authored.authoredLightFrame === null
      || authored.contentHash === null
    ) {
      this.menuMessageState.set(authored.diagnostic);
      return false;
    }
    this.workspaceState.set(applyCanonicalSceneDocumentReadModel(
      current,
      authored.document,
      this.activeSceneFilePathState(),
    ));
    this.authoredLightFrameState.set(authored.authoredLightFrame);
    this.sceneDocumentContentHashState.set(authored.contentHash);
    this.refreshSceneVoxelProjection();
    return true;
  }

  setTransformManipulatorOrientation(orientation: 'local' | 'world'): void {
    this.transformManipulatorOrientationState.set(orientation);
  }

  setTransformManipulatorSnapping(enabled: boolean): void {
    this.transformManipulatorSnappingState.set(enabled);
  }

  previewSelectedSceneObjectTransform(
    expectedRevision: string,
    transform: Transform,
  ): StudioSelectedSceneTransformTarget | null {
    const target = this.selectedSceneTransformTarget();
    if (
      target === null
      || target.revision !== expectedRevision
      || this.voxelAuthoringModeState().mode === 'edit'
    ) {
      return null;
    }
    const operation = buildStudioSceneAuthoringOperation(this.workspaceState().flatSceneDocument, {
      expectedBaseHash: expectedRevision,
      actor: 'gui',
      operation: {
        kind: 'update_scene_object',
        objectId: target.objectId,
        patch: { transform },
      },
    });
    if (!operation.ok) return null;
    return {
      ...target,
      transform,
    };
  }

  commitSelectedSceneObjectTransform(
    expectedRevision: string,
    transform: Transform,
  ): StudioSceneTransformCommitResult {
    const target = this.selectedSceneTransformTarget();
    if (this.voxelAuthoringModeState().mode === 'edit') {
      return this.rejectSceneTransformCommit(expectedRevision, 'Exit Voxel Edit mode before moving a scene object.');
    }
    if (target === null) {
      return this.rejectSceneTransformCommit(expectedRevision, 'Select a transform-editable scene object.');
    }
    const operation = buildStudioSceneAuthoringOperation(this.workspaceState().flatSceneDocument, {
      expectedBaseHash: expectedRevision,
      actor: 'gui',
      operation: {
        kind: 'update_scene_object',
        objectId: target.objectId,
        patch: { transform },
      },
    });
    if (!operation.ok) {
      const diagnostic = operation.diagnostics.at(0)?.message ?? 'Transform command rejected.';
      return this.rejectSceneTransformCommit(expectedRevision, diagnostic);
    }
    const workspace = this.workspaceState();
    const nodeId = this.sceneNodeIdFromObjectId(target.objectId);
    if (nodeId === null) {
      return this.rejectSceneTransformCommit(expectedRevision, 'Selected scene object no longer exists.');
    }
    const authored = this.requestStoredSceneDocumentAuthoring(workspace.flatSceneDocument, {
      kind: 'setTransform',
      target: this.storedSceneAuthoringTarget(workspace.flatSceneDocument),
      id: nodeId,
      transform,
    });
    if (
      !authored.accepted
      || authored.document === null
      || authored.authoredLightFrame === null
      || authored.contentHash === null
    ) {
      return this.rejectSceneTransformCommit(expectedRevision, authored.diagnostic);
    }
    const history = this.sceneTransformHistoryState();
    const entry: StudioSceneTransformHistoryEntry = {
      before: workspace.flatSceneDocument,
      after: authored.document,
      label: `Transform ${target.objectId}`,
      objectId: target.objectId,
    };
    const entries = [...history.entries.slice(0, history.cursor), entry];
    this.sceneTransformHistoryState.set({ entries, cursor: entries.length });
    this.applySceneTransformDocument(
      authored.document,
      target.objectId,
      authored.authoredLightFrame,
      authored.contentHash,
    );
    const revision = studioSceneAuthoringBaseHash(authored.document);
    this.menuMessageState.set(`Transformed ${target.objectId}.`);
    return { accepted: true, diagnostic: 'Transform accepted.', revision };
  }

  undoSceneTransformEdit(): void {
    const history = this.sceneTransformHistoryState();
    const entry = history.cursor > 0 ? history.entries[history.cursor - 1] : undefined;
    if (entry === undefined) return;
    const nodeId = this.sceneNodeIdFromObjectId(entry.objectId);
    const transform = nodeId === null
      ? undefined
      : entry.before.nodes.find(node => node.id === nodeId)?.transform;
    if (nodeId === null || transform === undefined) return;
    const authored = this.requestStoredSceneDocumentAuthoring(
      this.workspaceState().flatSceneDocument,
      {
        kind: 'setTransform',
        target: this.storedSceneAuthoringTarget(this.workspaceState().flatSceneDocument),
        id: nodeId,
        transform,
      },
    );
    if (
      !authored.accepted
      || authored.document === null
      || authored.authoredLightFrame === null
      || authored.contentHash === null
    ) {
      this.menuMessageState.set(`Undo rejected: ${authored.diagnostic}`);
      return;
    }
    this.applySceneTransformDocument(
      authored.document,
      entry.objectId,
      authored.authoredLightFrame,
      authored.contentHash,
    );
    this.sceneTransformHistoryState.set({ ...history, cursor: history.cursor - 1 });
    this.menuMessageState.set(`Undid ${entry.label}.`);
  }

  redoSceneTransformEdit(): void {
    const history = this.sceneTransformHistoryState();
    const entry = history.entries[history.cursor];
    if (entry === undefined) return;
    const nodeId = this.sceneNodeIdFromObjectId(entry.objectId);
    const transform = nodeId === null
      ? undefined
      : entry.after.nodes.find(node => node.id === nodeId)?.transform;
    if (nodeId === null || transform === undefined) return;
    const authored = this.requestStoredSceneDocumentAuthoring(
      this.workspaceState().flatSceneDocument,
      {
        kind: 'setTransform',
        target: this.storedSceneAuthoringTarget(this.workspaceState().flatSceneDocument),
        id: nodeId,
        transform,
      },
    );
    if (
      !authored.accepted
      || authored.document === null
      || authored.authoredLightFrame === null
      || authored.contentHash === null
    ) {
      this.menuMessageState.set(`Redo rejected: ${authored.diagnostic}`);
      return;
    }
    this.applySceneTransformDocument(
      authored.document,
      entry.objectId,
      authored.authoredLightFrame,
      authored.contentHash,
    );
    this.sceneTransformHistoryState.set({ ...history, cursor: history.cursor + 1 });
    this.menuMessageState.set(`Redid ${entry.label}.`);
  }

  private sceneNodeIdFromObjectId(objectId: SceneObjectId) {
    const nodeId = Number.parseInt(objectId.slice('scene-node:'.length), 10);
    return Number.isSafeInteger(nodeId) ? sceneNodeId(nodeId) : null;
  }

  private applySceneTransformDocument(
    document: FlatSceneDocument,
    objectId: SceneObjectId,
    authoredLightFrame: RenderFrameDiff,
    contentHash: string,
  ): void {
    const projected = applyCanonicalSceneDocumentReadModel(
      this.workspaceState(),
      document,
      this.activeSceneFilePathState(),
    );
    this.workspaceState.set(applySelectedEntityReadModel(projected, objectId));
    this.authoredLightFrameState.set(authoredLightFrame);
    this.sceneDocumentContentHashState.set(contentHash);
    this.refreshSceneVoxelProjection();
  }

  private rejectSceneTransformCommit(
    revision: string,
    diagnostic: string,
  ): StudioSceneTransformCommitResult {
    this.menuMessageState.set(diagnostic);
    return { accepted: false, diagnostic, revision };
  }

  setSelectedSceneObjectTransform(patch: {
    readonly translation?: readonly [number, number, number];
    readonly rotation?: readonly [number, number, number, number];
    readonly scale?: readonly [number, number, number];
  }): void {
    if (this.voxelAuthoringModeState().mode === 'edit') {
      this.menuMessageState.set('Exit Voxel Edit mode before changing instance transforms.');
      return;
    }
    const workspace = this.workspaceState();
    const selectedEntity = workspace.entities.find(entity => entity.id === workspace.selectedEntityId);
    const objectId = selectedEntity?.sceneObjectId ?? null;
    const nodeId = objectId?.startsWith('scene-node:') === true
      ? Number.parseInt(objectId.slice('scene-node:'.length), 10)
      : Number.NaN;
    const node = workspace.flatSceneDocument.nodes.find(candidate => (candidate.id as number) === nodeId);
    if (node === undefined || !Number.isSafeInteger(nodeId)) {
      this.menuMessageState.set('Select a scene object before editing its transform.');
      return;
    }
    const nextTransform = {
      translation: patch.translation ?? node.transform.translation,
      rotation: patch.rotation ?? node.transform.rotation,
      scale: patch.scale ?? node.transform.scale,
    };
    const values = [...nextTransform.translation, ...nextTransform.rotation, ...nextTransform.scale];
    if (
      values.some(value => !Number.isFinite(value))
      || nextTransform.scale.some(value => value <= 0)
      || Math.hypot(...nextTransform.rotation) <= 0.000001
    ) {
      this.menuMessageState.set('Transform rejected: values must be finite, scale positive, and rotation nonzero.');
      return;
    }
    this.commitSelectedSceneObjectTransform(
      studioSceneAuthoringBaseHash(workspace.flatSceneDocument),
      nextTransform,
    );
  }

  duplicateSelectedVoxelInstance(): void {
    if (this.voxelAuthoringModeState().mode === 'edit') {
      this.menuMessageState.set('Exit Voxel Edit mode before duplicating an instance.');
      return;
    }
    const workspace = this.workspaceState();
    const selectedObjectId = workspace.entities.find(
      entity => entity.id === workspace.selectedEntityId,
    )?.sceneObjectId ?? null;
    const selectedNodeId = selectedObjectId?.startsWith('scene-node:') === true
      ? Number.parseInt(selectedObjectId.slice('scene-node:'.length), 10)
      : Number.NaN;
    const source = workspace.flatSceneDocument.nodes.find(
      node => (node.id as number) === selectedNodeId,
    );
    if (source?.kind.kind !== 'voxelVolume') {
      this.menuMessageState.set('Select a voxelVolume scene instance before duplicating it.');
      return;
    }
    const nextId = sceneNodeId(
      workspace.flatSceneDocument.nodes.reduce(
        (maximum, node) => Math.max(maximum, node.id as number),
        0,
      ) + 1,
    );
    const duplicate = {
      ...source,
      id: nextId,
      childOrder: workspace.flatSceneDocument.nodes.filter(node => node.parent === source.parent).length,
      label: `${source.label ?? 'Voxel instance'} copy`,
      transform: {
        ...source.transform,
        translation: [
          source.transform.translation[0] + 2,
          source.transform.translation[1],
          source.transform.translation[2],
        ] as const,
      },
    };
    const authored = this.requestStoredSceneDocumentAuthoring(workspace.flatSceneDocument, {
      kind: 'create',
      target: this.storedSceneAuthoringTarget(workspace.flatSceneDocument),
      record: duplicate,
    });
    if (
      !authored.accepted
      || authored.document === null
      || authored.authoredLightFrame === null
      || authored.contentHash === null
    ) {
      this.menuMessageState.set(`Duplicate rejected: ${authored.diagnostic}`);
      return;
    }
    const projected = applyCanonicalSceneDocumentReadModel(
      workspace,
      authored.document,
      this.activeSceneFilePathState(),
    );
    const objectId = voxelInstanceId(nextId);
    this.workspaceState.set(applySelectedEntityReadModel(projected, objectId));
    this.authoredLightFrameState.set(authored.authoredLightFrame);
    this.sceneDocumentContentHashState.set(authored.contentHash);
    this.refreshSceneVoxelProjection();
    this.menuMessageState.set(`Duplicated ${source.label ?? selectedObjectId} as ${duplicate.label}.`);
  }

  selectViewportHit(hit: StudioViewportHitReadModel): void {
    this.viewportHitState.set(hit);
    const workspace = this.workspaceState();
    const linkedEntity = workspace.entities.find(entity => entity.renderableId === hit.renderableId);
    this.selectEntity(linkedEntity?.id ?? hit.renderableId);
    const voxelLabel =
      hit.voxelCoord === null
        ? 'no voxel'
        : `voxel ${hit.voxelCoord.x},${hit.voxelCoord.y},${hit.voxelCoord.z}`;
    this.menuMessageState.set(`Selected ${hit.renderableId} · ${hit.face} · ${voxelLabel}.`);
  }

  selectAssetRenderable(renderableId: string): void {
    const workspace = this.workspaceState();
    const linkedEntity = workspace.entities.find(entity => entity.renderableId === renderableId);
    if (linkedEntity === undefined) {
      this.menuMessageState.set(`Asset ${renderableId} is not linked to a selectable scene entity.`);
      return;
    }
    this.selectEntity(linkedEntity.id);
    this.menuMessageState.set(`Asset ${renderableId} selected for inspection.`);
  }

  selectCatalogAsset(assetId: string): void {
    const asset = this.catalogAssetEntries().find(entry => entry.assetId === assetId) ?? null;
    if (asset === null) {
      this.menuMessageState.set(`Catalog asset ${assetId} is not available.`);
      return;
    }
    const renderableId = asset.referencedRenderableIds.at(0) ?? null;
    if (renderableId !== null) {
      this.selectAssetRenderable(renderableId);
      this.menuMessageState.set(`Catalog asset ${assetId} selected with renderable ${renderableId}.`);
      return;
    }
    this.menuMessageState.set(`Catalog asset ${assetId} selected; no scene renderable reference.`);
  }

  selectCatalogWorkflowAsset(assetId: string): void {
    this.selectedCatalogWorkflowAssetIdState.set(assetId);
    this.catalogWorkflowMessageState.set(`Catalog asset ${assetId} selected.`);
  }

  createCatalogSource(path = 'packages/game-catalogs/catalog.json'): void {
    const normalizedPath = normalizeProjectFilePath(path);
    const catalog: AshaGameAssetCatalog = { schemaVersion: 1, entries: [] };
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: 'catalog.create_source',
      label: 'Create Catalog Source',
      inputSummary: `path=${normalizedPath}`,
      outputSummary: 'Empty catalog source created locally.',
    });
    this.workspaceState.set(recorded.workspace);
    this.catalogPathState.set(normalizedPath);
    this.catalogSourceState.set(catalog);
    this.selectedCatalogWorkflowAssetIdState.set(null);
    this.catalogSourceEvidenceState.set([]);
    this.syncAssetInventoryFromCatalog();
    this.catalogWorkflowMessageState.set(`Created catalog ${normalizedPath}.`);
  }

  async loadCatalogSource(path = this.catalogPathState()): Promise<void> {
    const normalizedPath = normalizeProjectFilePath(path);
    try {
      const readback = await this.readProjectText(normalizedPath);
      const parsed = JSON.parse(readback.text) as AshaGameAssetCatalog;
      if (!Array.isArray(parsed.entries) || parsed.schemaVersion !== 1) {
        throw new Error('invalid catalog schema');
      }
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'catalog.load_source',
        label: 'Load Catalog Source',
        inputSummary: `path=${normalizedPath}`,
        outputSummary: `Catalog source ${normalizedPath} loaded.`,
      });
      this.workspaceState.set(recorded.workspace);
      this.catalogPathState.set(normalizeProjectFilePath(readback.path));
      this.catalogSourceState.set(parsed);
      this.selectedCatalogWorkflowAssetIdState.set(parsed.entries.at(0)?.id ?? null);
      this.syncAssetInventoryFromCatalog();
      this.catalogWorkflowMessageState.set(`Loaded catalog ${normalizedPath}.`);
    } catch {
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'catalog.load_source',
        label: 'Load Catalog Source',
        inputSummary: `path=${normalizedPath}`,
        outputSummary: `Catalog source ${normalizedPath} could not be loaded.`,
        status: 'rejected',
      });
      this.workspaceState.set(recorded.workspace);
      this.catalogWorkflowMessageState.set(`Could not load catalog ${normalizedPath}.`);
    }
  }

  async saveCatalogSource(): Promise<void> {
    const path = this.catalogPathState();
    const text = `${JSON.stringify(this.catalogSourceState(), null, 2)}\n`;
    try {
      let persistedHash = stableBrowserHash(text);
      if (this.projectFileConnectedState()) {
        const response = await fetch(`${projectFileApiBase()}/api/project/file`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path, text }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json() as { readonly ok?: boolean; readonly sha256?: string; readonly diagnostic?: string };
        if (payload.ok === false) {
          throw new Error(payload.diagnostic ?? 'catalog write rejected');
        }
        persistedHash = payload.sha256 ?? persistedHash;
        await this.refreshProjectFiles(parentProjectDir(path));
      }
      this.syncAssetInventoryFromCatalog(persistedHash);
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'catalog.save_source',
        label: 'Save Catalog Source',
        inputSummary: `path=${path}`,
        outputSummary: `Catalog source ${path} saved.`,
      });
      this.workspaceState.set(recorded.workspace);
      this.catalogWorkflowMessageState.set(`Saved catalog ${path}.`);
    } catch {
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'catalog.save_source',
        label: 'Save Catalog Source',
        inputSummary: `path=${path}`,
        outputSummary: `Catalog source ${path} could not be saved.`,
        status: 'rejected',
      });
      this.workspaceState.set(recorded.workspace);
      this.catalogWorkflowMessageState.set(`Could not save catalog ${path}.`);
    }
  }

  linkCatalogAsset(kind: AshaGameAssetKind = 'material'): void {
    const catalog = this.catalogSourceState();
    const suffix = catalog.entries.length + 1;
    const assetId = `${kind === 'static_mesh' ? 'mesh' : kind}.studio-linked-${suffix}`;
    const sourceSuffix = kind === 'static_mesh' ? 'mesh' : kind;
    const entry: AshaGameAssetCatalogEntry = {
      id: assetId,
      kind,
      source: `assets/${kind === 'static_mesh' ? 'meshes' : `${kind}s`}/studio-linked-${suffix}.${sourceSuffix}.json`,
      importProfile: importProfileForKind(kind),
      importMetadata: {
        sourceHash: 'sha256:pending',
        cacheKey: `dev-cache/${kind}/${assetId}`,
        generatedArtifactVersion: 'asset-import.v1',
      },
      dependencies: kind === 'static_mesh' && catalog.entries.some(candidate => candidate.kind === 'material')
        ? [catalog.entries.find(candidate => candidate.kind === 'material')?.id ?? '']
        : [],
      publish: {
        include: false,
        outputKey: `${kind === 'static_mesh' ? 'meshes' : `${kind}s`}/studio-linked-${suffix}.${sourceSuffix}.json`,
      },
      diagnostics: {
        owner: 'asha-studio',
        notes: ['linked from Studio catalog workflow'],
      },
    };
    this.applyCatalogOperation('catalog.link_asset', {
      kind: 'create_catalog_entry',
      entry: { ...entry, dependencies: (entry.dependencies ?? []).filter(Boolean) },
    });
  }

  updateSelectedCatalogAssetSource(sourcePath: string): void {
    const assetId = this.catalogWorkflow().selectedAssetId;
    if (assetId === null) {
      this.catalogWorkflowMessageState.set('Select a catalog asset before updating it.');
      return;
    }
    this.applyCatalogOperation('catalog.update_asset', {
      kind: 'update_catalog_entry',
      assetId,
      patch: { source: normalizeProjectFilePath(sourcePath) },
    });
  }

  removeSelectedCatalogAsset(): void {
    const assetId = this.catalogWorkflow().selectedAssetId;
    if (assetId === null) {
      this.catalogWorkflowMessageState.set('Select a catalog asset before removing it.');
      return;
    }
    this.applyCatalogOperation('catalog.remove_asset', { kind: 'remove_catalog_entry', assetId });
  }

  async validateCatalogSource(): Promise<void> {
    const evidence: StudioCatalogSourceEvidenceInput[] = [];
    if (this.projectFileConnectedState()) {
      for (const entry of this.catalogSourceState().entries) {
        try {
          const readback = await this.readProjectText(entry.source);
          evidence.push({ path: entry.source, exists: true, hash: readback.sha256 });
        } catch {
          evidence.push({ path: entry.source, exists: false, hash: null });
        }
      }
    } else {
      evidence.push(...this.catalogSourceEvidenceState());
    }
    this.catalogSourceEvidenceState.set(evidence);
    const workflow = buildStudioCatalogWorkflowReadModel({
      workspace: this.gameWorkspace(),
      catalogPath: this.catalogPathState(),
      catalog: this.catalogSourceState(),
      catalogHash: studioCatalogAuthoringBaseHash(this.catalogSourceState()),
      selectedAssetId: this.selectedCatalogWorkflowAssetIdState(),
      sourceEvidence: evidence,
      referencedRenderableIds: demoReferencedRenderableIds(),
    });
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: 'catalog.validate_source',
      label: 'Validate Catalog Source',
      inputSummary: `path=${this.catalogPathState()};entries=${workflow.entryCount}`,
      outputSummary: workflow.diagnostics.length === 0
        ? 'Catalog validation passed.'
        : `${workflow.diagnostics.length} catalog diagnostics.`,
      status: workflow.diagnostics.length === 0 ? 'ok' : 'rejected',
    });
    this.workspaceState.set(recorded.workspace);
    this.catalogWorkflowMessageState.set(
      workflow.diagnostics.length === 0 ? 'Catalog validation passed.' : `${workflow.diagnostics.length} catalog diagnostics.`,
    );
  }

  setViewportTool(activeTool: StudioViewportToolMode): void {
    this.viewportToolState.set(buildStudioViewportToolReadModel(activeTool));
  }

  setViewportCamera(camera: StudioViewportCameraReadModel): void {
    this.viewportCameraState.set(camera);
  }

  orbitViewportCamera(delta: StudioViewportCameraControlDelta): void {
    this.viewportCameraState.set(orbitStudioViewportCamera(this.viewportCameraState(), delta));
  }

  panViewportCamera(delta: StudioViewportCameraControlDelta): void {
    this.viewportCameraState.set(panStudioViewportCamera(this.viewportCameraState(), delta));
  }

  zoomViewportCamera(wheelDeltaY: number): void {
    this.viewportCameraState.set(zoomStudioViewportCamera(this.viewportCameraState(), wheelDeltaY));
  }

  frameViewportCamera(): void {
    this.viewportCameraState.set(frameStudioViewportCamera(this.workspaceState().scene));
  }

  frameSelectedRenderable(): void {
    const workspace = this.workspaceState();
    const selectedRenderable =
      workspace.scene.selectedRenderableId === null
        ? null
        : workspace.scene.renderables.find(
            renderable =>
              renderable.renderableId === workspace.scene.selectedRenderableId && renderable.visible,
          ) ?? null;
    this.viewportCameraState.set(
      frameStudioViewportCameraOnRenderable(workspace.scene, workspace.scene.selectedRenderableId),
    );
    this.menuMessageState.set(
      selectedRenderable === null ? 'Scene framed; no selected renderable.' : 'Selected renderable framed.',
    );
  }

  setHierarchyExpanded(expanded: boolean): void {
    this.workspaceState.set(setHierarchyExpansionReadModel(this.workspaceState(), expanded));
    this.menuMessageState.set(expanded ? 'Hierarchy expanded.' : 'Hierarchy collapsed.');
  }

  setAssetBrowserCategory(category: StudioAssetBrowserCategory): void {
    this.assetBrowserCategoryState.set(category);
    const matchingCategory = this.assetBrowserCategories().find(item => item.category === category);
    this.menuMessageState.set(`${matchingCategory?.label ?? 'Assets'} filter selected.`);
  }

  setActiveMenu(menu: StudioApplicationMenu | null): void {
    this.activeMenuState.set(menu);
  }

  toggleActiveMenu(menu: StudioApplicationMenu): void {
    this.activeMenuState.set(this.activeMenuState() === menu ? null : menu);
  }

  setBottomPanelTab(tab: StudioBottomPanelTab): void {
    this.bottomPanelTabState.set(tab);
  }

  setVoxelConversionSourceAsset(assetId: string): void {
    const selectedSourceAssetId = assetId.length === 0 ? null : assetId;
    this.voxelConversionDraftState.update(draft => ({ ...draft, selectedSourceAssetId }));
    this.menuMessageState.set(
      selectedSourceAssetId === null
        ? 'Voxel conversion source cleared.'
        : `Voxel conversion source set to ${selectedSourceAssetId}.`,
    );
  }

  async importVoxelConversionMeshFile(file: File | null | undefined): Promise<void> {
    if (file === null || file === undefined) {
      return;
    }
    const sourcePath = file.name.trim();
    if (!sourcePath.toLowerCase().endsWith('.glb')) {
      this.menuMessageState.set('Voxel conversion imports accept GLB files; OBJ is not supported by Rust mesh authority.');
      return;
    }
    if (file.size === 0 || file.size > VOXEL_CONVERSION_MESH_IMPORT_MAX_SOURCE_BYTES) {
      this.menuMessageState.set(
        `GLB import must contain 1..${VOXEL_CONVERSION_MESH_IMPORT_MAX_SOURCE_BYTES} bytes.`,
      );
      return;
    }
    const sourceAssetId = `mesh/imported/${sourcePath
      .replace(/\.glb$/iu, '')
      .replace(/[^A-Za-z0-9._-]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 128) || 'mesh'}`;
    try {
      const sourceBytes = Array.from(new Uint8Array(await file.arrayBuffer()));
      const result = this.runAgentVoxelWorkflowOperation({
        kind: 'import_conversion_mesh_source',
        importRequest: {
          sourceAssetId,
          assetVersion: 1,
          sourcePath,
          format: 'glb',
          sourceBytes,
          meshPrimitive: this.voxelConversionDraftState().meshPrimitive,
        },
      });
      if (result.accepted) {
        this.setVoxelConversionSourceAsset(sourceAssetId);
      }
    } catch (error) {
      this.menuMessageState.set(errorMessage(error));
    }
  }

  setVoxelTranscriptDraft(draft: string): void {
    this.voxelTranscriptControlState.update(current => ({
      ...current,
      draft,
      status: 'idle',
      message: 'Transcript draft updated.',
      receipt: null,
    }));
  }

  runVoxelTranscriptControl(): void {
    const draft = this.voxelTranscriptControlState().draft;
    let input: unknown;
    try {
      input = JSON.parse(draft) as unknown;
    } catch (error) {
      this.voxelTranscriptControlState.update(current => ({
        ...current,
        status: 'rejected',
        message: `Transcript JSON is invalid: ${errorMessage(error)}`,
        receipt: null,
      }));
      return;
    }
    const receipt = this.runAgentVoxelOperationTranscriptReplay(input);
    this.voxelTranscriptControlState.update(current => ({
      ...current,
      status: receipt.accepted ? 'accepted' : 'rejected',
      message: receipt.accepted
        ? `Replayed ${receipt.acceptedOperationCount}/${receipt.operationCount} voxel operations.`
        : receipt.diagnostic ?? 'Voxel transcript was rejected.',
      receipt,
    }));
  }

  setVoxelConversionMode(mode: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      mode: asVoxelConversionMode(mode),
    }));
  }

  setVoxelConversionFitPolicy(fitPolicy: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      fitPolicy: asVoxelConversionFitPolicy(fitPolicy),
    }));
  }

  setVoxelConversionOriginPolicy(originPolicy: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      originPolicy: asVoxelConversionOriginPolicy(originPolicy),
    }));
  }

  setVoxelConversionResolutionAxis(axis: number, value: number): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      resolution: tupleWithIndex(draft.resolution, axis, value),
    }));
  }

  setVoxelConversionTargetOriginAxis(axis: number, value: number): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      targetOrigin: tupleWithIndex(draft.targetOrigin, axis, value),
    }));
  }

  setVoxelConversionVoxelSize(voxelSize: number): void {
    this.voxelConversionDraftState.update(draft => ({ ...draft, voxelSize }));
  }

  setVoxelConversionMaxOutputVoxels(maxOutputVoxels: number): void {
    this.voxelConversionDraftState.update(draft => ({ ...draft, maxOutputVoxels }));
  }

  setVoxelConversionTransformScale(transformScale: number): void {
    this.voxelConversionDraftState.update(draft => ({ ...draft, transformScale }));
  }

  setVoxelConversionTransformTranslationAxis(axis: number, value: number): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      transformTranslation: tupleWithIndex(draft.transformTranslation, axis, value),
    }));
  }

  setVoxelConversionTargetGrid(targetGrid: number): void {
    this.voxelConversionDraftState.update(draft => ({ ...draft, targetGrid }));
  }

  setVoxelConversionTargetVolumeAssetId(targetVolumeAssetId: string): void {
    this.voxelConversionDraftState.update(draft => ({ ...draft, targetVolumeAssetId }));
  }

  setVoxelConversionMeshPrimitive(meshPrimitive: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      meshPrimitive: meshPrimitive.trim().length === 0 ? null : meshPrimitive,
    }));
  }

  setVoxelConversionDefaultMaterial(value: string): void {
    const defaultVoxelMaterial = value.trim().length === 0 ? null : Number(value);
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      materialMap: { ...draft.materialMap, defaultVoxelMaterial },
    }));
  }

  setVoxelConversionMaterialSourceSlot(sourceMaterialSlot: number): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      materialMap: {
        ...draft.materialMap,
        entries: [
          {
            ...(draft.materialMap.entries[0] ?? {
              sourceMaterialId: null,
              voxelMaterial: 1,
            }),
            sourceMaterialSlot,
          },
        ],
      },
    }));
  }

  setVoxelConversionMaterialSourceId(sourceMaterialId: string): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      materialMap: {
        ...draft.materialMap,
        entries: [
          {
            ...(draft.materialMap.entries[0] ?? {
              sourceMaterialSlot: 0,
              voxelMaterial: 1,
            }),
            sourceMaterialId: sourceMaterialId.trim().length === 0 ? null : sourceMaterialId,
          },
        ],
      },
    }));
  }

  setVoxelConversionMaterialVoxelId(voxelMaterial: number): void {
    this.voxelConversionDraftState.update(draft => ({
      ...draft,
      materialMap: {
        ...draft.materialMap,
        entries: [
          {
            ...(draft.materialMap.entries[0] ?? {
              sourceMaterialSlot: 0,
              sourceMaterialId: null,
            }),
            voxelMaterial,
          },
        ],
      },
    }));
  }

  setVoxelCompactEditControlField(
    field: StudioVoxelCompactEditControlField,
    value: number,
  ): void {
    this.voxelCompactEditControlState.update(current => {
      if (!Number.isFinite(value)) {
        return current;
      }
      return refreshStudioCompactVoxelEditPreflight({
        ...current,
        [field]: value,
        status: 'idle',
        message: 'Compact voxel edit draft updated.',
        generatedCommandCount: null,
        acceptedCommandCount: null,
        rejectedCommandCount: null,
        diagnostic: null,
      });
    });
  }

  setVoxelCompactEditControlAction(action: StudioVoxelCompactEditControlAction): void {
    this.voxelCompactEditControlState.update(current => refreshStudioCompactVoxelEditPreflight({
      ...current,
      draftAction: action,
      status: 'idle',
      message: 'Compact voxel edit draft action updated.',
      generatedCommandCount: null,
      acceptedCommandCount: null,
      rejectedCommandCount: null,
      diagnostic: null,
    }));
  }

  setVoxelCompactEditControlBoxMode(mode: StudioVoxelCompactEditBoxMode): void {
    this.voxelCompactEditControlState.update(current => refreshStudioCompactVoxelEditPreflight({
      ...current,
      boxMode: mode,
      draftAction: current.draftAction === 'primitive_line' ? 'primitive_box' : current.draftAction,
      status: 'idle',
      message: 'Compact voxel primitive box mode updated.',
      generatedCommandCount: null,
      acceptedCommandCount: null,
      rejectedCommandCount: null,
      diagnostic: null,
    }));
  }

  applyViewportHitToVoxelCompactEditControl(endpoint: StudioVoxelCompactEditPlacementEndpoint): void {
    const placement = this.voxelCompactEditPlacement();
    const coord = placement.sourceVoxelCoord;
    if (!placement.canUseViewportHit || coord === null) {
      this.voxelCompactEditControlState.update(current => ({
        ...current,
        status: 'rejected',
        message: placement.message,
        diagnostic: placement.message,
      }));
      return;
    }
    this.voxelCompactEditControlState.update(current => {
      const offset = {
        x: current.x2 - current.x1,
        y: current.y2 - current.y1,
        z: current.z2 - current.z1,
      };
      const next = endpoint === 'start'
        ? {
            ...current,
            x1: coord.x,
            y1: coord.y,
            z1: coord.z,
            x2: coord.x + offset.x,
            y2: coord.y + offset.y,
            z2: coord.z + offset.z,
          }
        : {
            ...current,
            x2: coord.x,
            y2: coord.y,
            z2: coord.z,
          };
      return refreshStudioCompactVoxelEditPreflight({
        ...next,
        status: 'idle',
        message: `Viewport voxel ${formatStudioVoxelCoord(coord)} copied to compact edit ${endpoint}.`,
        generatedCommandCount: null,
        acceptedCommandCount: null,
        rejectedCommandCount: null,
        diagnostic: null,
      });
    });
  }

  runVoxelCompactEditControl(action: StudioVoxelCompactEditControlAction): void {
    const draft = refreshStudioCompactVoxelEditPreflight({
      ...this.voxelCompactEditControlState(),
      draftAction: action,
    });
    const edit = buildStudioCompactVoxelEditFromControl(draft, action);
    const compiled = buildStudioAgentCompactVoxelEditBatch(edit);
    const result = this.runAgentVoxelWorkflowOperation({
      kind: 'submit_compact_voxel_edit',
      edit,
    });
    const acceptedCount = result.voxelEditReceipt?.result.accepted ?? null;
    const rejectedCount = result.voxelEditReceipt?.result.rejected ?? null;
    const generatedCommandCount = result.compiledVoxelEditBatch?.commands.length
      ?? compiled.generatedVoxelCount;
    const message = result.accepted
      ? `Compact ${action} accepted ${acceptedCount ?? 0}, rejected ${rejectedCount ?? 0}.`
      : result.diagnostic ?? 'Compact voxel edit rejected.';
    this.voxelCompactEditControlState.set(refreshStudioCompactVoxelEditPreflight({
      ...draft,
      lastAction: action,
      status: result.accepted ? 'accepted' : 'rejected',
      message,
      generatedCommandCount,
      acceptedCommandCount: acceptedCount,
      rejectedCommandCount: rejectedCount,
      diagnostic: result.diagnostic ?? compiled.diagnostic,
    }));
    this.menuMessageState.set(message);
  }

  setVoxelAnnotationTextField(field: 'layerId' | 'regionId' | 'label' | 'tags' | 'parentRegionId', value: string): void {
    this.voxelAnnotationControlState.update(current => ({
      ...current,
      [field]: value,
      status: 'idle',
      message: 'Voxel annotation draft updated.',
      diagnostics: [],
    }));
  }

  setVoxelAnnotationKind(kind: VoxelAnnotationKind): void {
    this.voxelAnnotationControlState.update(current => ({ ...current, kind, status: 'idle', diagnostics: [] }));
  }

  setVoxelAnnotationCoordinate(field: 'x1' | 'y1' | 'z1' | 'x2' | 'y2' | 'z2', value: number): void {
    if (!Number.isInteger(value)) return;
    this.voxelAnnotationControlState.update(current => ({ ...current, [field]: value, status: 'idle', diagnostics: [] }));
  }

  runVoxelAnnotationControl(action: 'load' | 'upsert_region' | 'add_runs' | 'remove_runs' | 'replace_selection' | 'set_parent' | 'set_tags' | 'set_label' | 'set_kind' | 'query_cell' | 'query_bounds' | 'export'): void {
    const facade = this.workspaceAuthoringFacadeState();
    const assetWorkflow = this.voxelAssetWorkflowControl();
    const asset = assetWorkflow.lastAsset;
    const assetWorkflowTarget = this.voxelAssetWorkflowTargetForCurrentDraft();
    const control = this.voxelAnnotationControlState();
    if (facade === null || asset === null) {
      this.recordVoxelAnnotationResult(control, false, 'Start workspace authoring and export a voxel asset before annotation authoring.', [], null, null, null);
      return;
    }
    const bounds = { min: { x: control.x1, y: control.y1, z: control.z1 }, max: { x: control.x2, y: control.y2, z: control.z2 } };
    const sparseRuns: readonly VoxelAnnotationSparseRun[] = [{
      start: { x: control.x1, y: control.y1, z: control.z1 },
      length: control.x2 - control.x1 + 1,
    }];
    const tags = [...new Set(control.tags.split(',').map(tag => tag.trim()).filter(Boolean))].sort();
    const region: VoxelAnnotationRegion = {
      regionId: control.regionId.trim(), label: control.label.trim(), kind: control.kind, tags,
      parentRegionId: control.parentRegionId.trim() || null, bounds, selection: { sparseRuns },
    };
    const targetVoxelVolumeAssetId = asset.assetId;
    const layerDraft: VoxelAnnotationLayerDraft = {
      layerId: control.layerId.trim(), schemaVersion: 1,
      mediaType: 'application/vnd.asha.voxel-annotation+json;version=1',
      targetVoxelVolumeAssetId, targetVoxelDataHash: asset.contentHashes.voxelData,
      targetBounds: asset.bounds, regions: [region], provenance: [],
    };
    try {
      if (action === 'load') {
        const targetLoad = facade.loadVoxelVolumeAsset({
          asset,
          targetGrid: assetWorkflowTarget.grid,
          targetVolumeAssetId: targetVoxelVolumeAssetId,
          replaceExisting: true,
          includeMaterialCounts: false,
        });
        this.refreshWorkspaceAuthoringState(facade);
        if (!targetLoad.loaded) {
          this.recordVoxelAnnotationResult(control, false, 'Voxel annotation target load rejected.', targetLoad.diagnostics.map(diagnostic => diagnostic.message), null, null, null);
          return;
        }
        const validation = facade.validateVoxelAnnotationLayer({ input: { kind: 'draft', draft: layerDraft }, expectedTargetVoxelVolumeAssetId: targetVoxelVolumeAssetId, expectedTargetVoxelDataHash: asset.contentHashes.voxelData, maxRegions: 64, maxSparseRunsPerRegion: 256, maxTotalAssignedCells: 100000 });
        if (!validation.valid || validation.normalizedLayer === null) {
          this.recordVoxelAnnotationResult(control, false, 'Voxel annotation layer rejected by Rust validation.', validation.diagnostics.map(item => item.message), null, null, null);
          return;
        }
        const receipt = facade.loadVoxelAnnotationLayer({ layer: validation.normalizedLayer, targetGrid: targetLoad.grid, replaceExisting: true, expectedSessionHash: null });
        this.refreshWorkspaceAuthoringState(facade);
        this.recordVoxelAnnotationResult(control, receipt.loaded, receipt.loaded ? `Loaded annotation layer ${receipt.requestLayerId}.` : 'Annotation layer load rejected.', receipt.diagnostics.map(item => item.message), receipt, null, null);
        return;
      }
      const expectedLayerHash = control.expectedLayerHash;
      if (control.runtimeLayerId === null || expectedLayerHash === null) {
        this.recordVoxelAnnotationResult(control, false, 'Load the annotation layer before applying edits, queries, or export.', [], null, null, null);
        return;
      }
      if (action === 'query_cell' || action === 'query_bounds') {
        const query = facade.readVoxelAnnotationQuery({ runtimeLayerId: control.runtimeLayerId, layerId: control.layerId, mode: action === 'query_cell' ? 'cell' : 'bounds', cell: action === 'query_cell' ? { x: control.x1, y: control.y1, z: control.z1 } : null, bounds: action === 'query_bounds' ? bounds : null, regionId: null, maxRegions: 64, expectedLayerHash });
        this.recordVoxelAnnotationResult(control, query.diagnostics.length === 0, `Annotation query returned ${query.matchedRegions.length} regions.`, query.diagnostics.map(item => item.message), null, query, null);
        return;
      }
      if (action === 'export') {
        const receipt = facade.exportVoxelAnnotationLayer({ runtimeLayerId: control.runtimeLayerId, layerId: control.layerId, expectedLayerHash, includeDiagnostics: true });
        this.recordVoxelAnnotationResult(control, receipt.exported, receipt.exported ? `Exported annotation layer ${control.layerId}.` : 'Annotation export rejected.', receipt.diagnostics.map(item => item.message), null, null, receipt);
        return;
      }
      if (action === 'remove_runs') {
        const exported = facade.exportVoxelAnnotationLayer({ runtimeLayerId: control.runtimeLayerId, layerId: control.layerId, expectedLayerHash, includeDiagnostics: true });
        if (!exported.exported || exported.layer === null) {
          this.recordVoxelAnnotationResult(control, false, 'Unable to read the authoritative annotation selection for bounded removal.', exported.diagnostics.map(item => item.message), null, null, exported);
          return;
        }
        const existingRegion = exported.layer.regions.find(item => item.regionId === control.regionId.trim());
        if (existingRegion === undefined) {
          this.recordVoxelAnnotationResult(control, false, `Annotation region ${control.regionId} was not found in the authoritative layer.`, [], null, null, exported);
          return;
        }
        const replacementRuns = subtractVoxelAnnotationSparseRuns(existingRegion.selection.sparseRuns, sparseRuns);
        if (replacementRuns.length === existingRegion.selection.sparseRuns.length && replacementRuns.every((run, index) => run.start.x === existingRegion.selection.sparseRuns[index]?.start.x && run.start.y === existingRegion.selection.sparseRuns[index]?.start.y && run.start.z === existingRegion.selection.sparseRuns[index]?.start.z && run.length === existingRegion.selection.sparseRuns[index]?.length)) {
          this.recordVoxelAnnotationResult(control, false, 'Bounded removal does not overlap the authoritative region selection.', [], null, null, exported);
          return;
        }
        const receipt = facade.applyVoxelAnnotationEdit({ runtimeLayerId: control.runtimeLayerId, layerId: control.layerId, expectedLayerHash: exported.canonicalJsonHash ?? expectedLayerHash, operation: 'replace_selection', regionId: control.regionId.trim() || null, region: null, sparseRuns: replacementRuns, tags: [], label: null, kind: null, parentRegionId: null });
        this.refreshWorkspaceAuthoringState(facade);
        this.recordVoxelAnnotationResult(control, receipt.edited, receipt.edited ? `Bounded removal accepted for ${control.regionId}.` : `Bounded removal rejected for ${control.regionId}.`, receipt.diagnostics.map(item => item.message), null, null, receipt);
        return;
      }
      const operation: VoxelAnnotationEditOperation = action;
      const receipt = facade.applyVoxelAnnotationEdit({ runtimeLayerId: control.runtimeLayerId, layerId: control.layerId, expectedLayerHash, operation, regionId: control.regionId.trim() || null, region: action === 'upsert_region' ? region : null, sparseRuns: ['add_runs', 'remove_runs', 'replace_selection'].includes(action) ? sparseRuns : [], tags: action === 'set_tags' ? tags : [], label: action === 'set_label' ? control.label.trim() : null, kind: action === 'set_kind' ? control.kind : null, parentRegionId: action === 'set_parent' ? (control.parentRegionId.trim() || null) : null });
      this.refreshWorkspaceAuthoringState(facade);
      this.recordVoxelAnnotationResult(control, receipt.edited, receipt.edited ? `${operation} accepted for ${control.regionId}.` : `${operation} rejected for ${control.regionId}.`, receipt.diagnostics.map(item => item.message), null, null, receipt);
    } catch (error) {
      this.recordVoxelAnnotationResult(control, false, error instanceof Error ? error.message : 'Voxel annotation authoring operation failed.', [], null, null, null);
    }
  }

  setVoxelHistoryTextControlField(field: StudioVoxelHistoryTextControlField, value: string): void {
    this.voxelHistoryControlState.update(current => {
      const trimmed = value.trim();
      const nextValue = field === 'historyId'
        ? trimmed
        : trimmed.length === 0 ? null : trimmed;
      return {
        ...current,
        [field]: nextValue,
        status: 'idle',
        message: 'Voxel history request draft updated.',
        diagnostic: null,
      };
    });
  }

  setVoxelHistoryNumberControlField(field: StudioVoxelHistoryNumberControlField, value: number): void {
    if (!Number.isFinite(value)) return;
    this.voxelHistoryControlState.update(current => {
      const fallback = current[field];
      const nextValue = field === 'targetCursorIndex'
        ? (Number.isSafeInteger(value) && value >= 0 ? value : null)
        : field === 'maxEntries'
          ? clampHistoryInteger(value, fallback ?? 12, 1, 100)
          : field === 'maxReplaySteps'
            ? clampHistoryInteger(value, fallback ?? 64, 1, 2048)
            : clampHistoryInteger(value, fallback ?? 256, 1, 100000);
      return {
        ...current,
        [field]: nextValue,
        status: 'idle',
        message: 'Voxel history request limits updated.',
        diagnostic: null,
      };
    });
  }

  setVoxelHistoryBooleanControlField(field: StudioVoxelHistoryBooleanControlField, value: boolean): void {
    this.voxelHistoryControlState.update(current => ({
      ...current,
      [field]: value,
      status: 'idle',
      message: 'Voxel history request options updated.',
      diagnostic: null,
    }));
  }

  selectVoxelHistoryTarget(transactionId: string): void {
    this.voxelHistoryControlState.update(current => ({
      ...current,
      targetTransactionId: transactionId,
      targetCursorId: null,
      targetCursorIndex: null,
      status: 'idle',
      message: `Voxel history target selected: ${transactionId}.`,
      diagnostic: null,
    }));
  }

  runVoxelHistoryControl(action: StudioVoxelHistoryAction): void {
    const facade = this.workspaceAuthoringFacadeState();
    if (facade === null) {
      this.recordVoxelHistoryRejected(action, 'Workspace authoring authority is not ready to read voxel edit history.');
      return;
    }
    if (this.voxelHistoryControlState().historyId.trim().length === 0) {
      this.recordVoxelHistoryRejected(action, 'Enter a voxel history id before reading history.');
      return;
    }

    try {
      if (action === 'read') {
        const request = this.voxelHistoryReadRequest();
        const summary = facade.readVoxelEditHistory(request);
        const message = `Voxel history ${summary.historyId} read with ${summary.entries.length} entries.`;
        this.voxelHistoryControlState.update(current => ({
          ...current,
          lastAction: action,
          status: summary.diagnostics.length === 0 ? 'ready' : 'rejected',
          message,
          diagnostic: summary.diagnostics.at(0)?.message ?? null,
          summary,
          receipt: null,
          cursorId: summary.cursor.cursorId,
        }));
        this.recordVoxelHistoryRuntimeResult(action, request.historyId, message, summary.diagnostics.length === 0 ? 'ok' : 'rejected');
        return;
      }

      if (action === 'undo') {
        const request = this.voxelHistoryUndoRequest();
        const undoReceipt = facade.undoVoxelEdit(request);
        this.refreshWorkspaceAuthoringState(facade);
        this.recordVoxelHistoryReceipt(action, undoReceipt.receipt);
        this.refreshVoxelHistoryAfterEdit(facade);
        return;
      }

      if (action === 'redo') {
        const request = this.voxelHistoryRedoRequest();
        const redoReceipt = facade.redoVoxelEdit(request);
        this.refreshWorkspaceAuthoringState(facade);
        this.recordVoxelHistoryReceipt(action, redoReceipt.receipt);
        this.refreshVoxelHistoryAfterEdit(facade);
        return;
      }

      const request = this.voxelHistoryRevertRequest(action);
      const receipt = action === 'preview_revert'
        ? facade.previewVoxelEditRevert(request)
        : facade.applyVoxelEditRevert(request);
      if (action !== 'preview_revert') this.refreshWorkspaceAuthoringState(facade);
      this.recordVoxelHistoryReceipt(action, receipt);
      if (action !== 'preview_revert') this.refreshVoxelHistoryAfterEdit(facade);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voxel history authoring operation failed.';
      this.recordVoxelHistoryRejected(action, message);
    }
  }

  setVoxelAssetWorkflowTargetProjectBundle(value: string): void {
    this.voxelAssetWorkflowTargetDraftState.update(draft => ({
      ...draft,
      targetProjectBundle: value.trim().length === 0 ? null : value.trim(),
    }));
  }

  setVoxelAssetWorkflowTargetAssetPath(value: string): void {
    this.voxelAssetWorkflowTargetDraftState.update(draft => ({
      ...draft,
      targetAssetPath: value.trim().length === 0 ? null : value.trim(),
    }));
  }

  resetVoxelAssetWorkflowTarget(): void {
    this.voxelAssetWorkflowTargetDraftState.set(DEFAULT_VOXEL_ASSET_WORKFLOW_TARGET_DRAFT);
    const target = this.voxelAssetWorkflowTargetForCurrentDraft();
    this.menuMessageState.set(`Voxel asset target follows ${target.projectBundle}:${target.assetPath}.`);
  }

  selectVoxelMaterialPaletteEntry(paletteEntryId: string): void {
    const binding = this.voxelAssetWorkflowControl().lastAsset?.materialPalette
      .find(candidate => candidate.paletteEntryId === paletteEntryId);
    if (binding === undefined) {
      this.voxelMaterialPaletteEditorState.set({
        ...DEFAULT_VOXEL_MATERIAL_PALETTE_EDITOR,
        status: 'rejected',
        message: `Palette entry ${paletteEntryId || 'selection'} is unavailable on the stored asset.`,
      });
      return;
    }
    this.voxelMaterialPaletteEditorState.set({
      ...DEFAULT_VOXEL_MATERIAL_PALETTE_EDITOR,
      selectedPaletteEntryId: binding.paletteEntryId,
      paletteEntryId: binding.paletteEntryId,
      displayName: binding.displayName ?? '',
      materialAssetId: binding.materialAssetId,
      materialCatalogBindingId: binding.materialCatalogBindingId ?? '',
      message: `Editing stored palette entry ${binding.paletteEntryId}.`,
    });
  }

  setVoxelMaterialPaletteEditorField(
    field: 'paletteEntryId' | 'displayName' | 'materialAssetId' | 'materialCatalogBindingId',
    value: string,
  ): void {
    this.voxelMaterialPaletteEditorState.update(current => ({
      ...current,
      [field]: value,
      status: 'idle',
      message: 'Stored palette edit updated.',
      diagnostics: [],
      receipt: null,
    }));
  }

  runVoxelMaterialPaletteUpdate(): void {
    const asset = this.voxelAssetWorkflowControl().lastAsset;
    const facade = this.workspaceAuthoringFacadeState();
    const editor = this.voxelMaterialPaletteEditorState();
    if (asset === null || facade === null) {
      this.recordVoxelMaterialPaletteUpdate(
        editor,
        false,
        'Open workspace authoring and export or save a voxel asset before editing its stored palette.',
        [],
        null,
      );
      return;
    }
    const sourceEntryId = editor.selectedPaletteEntryId;
    if (!asset.materialPalette.some(binding => binding.paletteEntryId === sourceEntryId)) {
      this.recordVoxelMaterialPaletteUpdate(editor, false, 'Select a stored palette entry before applying an edit.', [], null);
      return;
    }
    const materialPalette = asset.materialPalette.map((binding): VoxelAssetMaterialBinding =>
      binding.paletteEntryId === sourceEntryId
        ? {
            ...binding,
            paletteEntryId: editor.paletteEntryId.trim(),
            displayName: editor.displayName.trim() || null,
            materialAssetId: editor.materialAssetId.trim(),
            materialCatalogBindingId: editor.materialCatalogBindingId.trim() || null,
          }
        : binding,
    );
    const target = this.voxelAssetWorkflowTargetForCurrentDraft();
    const request: VoxelVolumeAssetPaletteUpdateRequest = {
      asset,
      materialPalette,
      targetProjectBundle: target.projectBundle,
      targetAssetPath: target.assetPath,
      expectedCanonicalJsonHash: asset.contentHashes.canonicalJson,
      expectedVoxelDataHash: asset.contentHashes.voxelData,
      maxMaterialBindings: 256,
    };
    try {
      const receipt = facade.updateVoxelVolumeAssetPalette(request);
      this.refreshWorkspaceAuthoringState(facade);
      const updatedAsset = receipt.updated ? receipt.asset : null;
      const accepted = updatedAsset !== null;
      this.recordVoxelMaterialPaletteUpdate(
        editor,
        accepted,
        accepted
          ? `Stored palette update accepted for ${editor.selectedPaletteEntryId}.`
          : receipt.diagnostics.at(0)?.message ?? 'Stored palette update rejected by Rust validation.',
        receipt.diagnostics.map(diagnostic => diagnostic.message),
        receipt,
      );
      if (updatedAsset !== null) {
        this.voxelAssetWorkflowControlState.update(current => ({
          ...current,
          lastAsset: updatedAsset,
          lastAssetId: updatedAsset.assetId,
          canonicalJsonHash: receipt.canonicalJsonHash,
          voxelDataHash: receipt.voxelDataHash,
          validationDiagnosticCodes: receipt.diagnostics.map(diagnostic => diagnostic.code),
        }));
        this.voxelMaterialPaletteEditorState.update(current => ({
          ...current,
          selectedPaletteEntryId: editor.paletteEntryId.trim(),
          paletteEntryId: editor.paletteEntryId.trim(),
        }));
      }
    } catch (error) {
      this.recordVoxelMaterialPaletteUpdate(
        editor,
        false,
        error instanceof Error ? error.message : 'Stored palette update failed.',
        [],
        null,
      );
    }
  }

  async createVoxelHouseTemplate(): Promise<void> {
    this.activeVoxelAssetIdState.set(null);
    this.activeVoxelAssetFilePathState.set(null);
    this.activeVoxelAssetFileHashState.set(null);
    const target = this.voxelAssetWorkflowTargetForCurrentDraft();
    await this.runVoxelAssetWorkflowControl('initialize_volume');
    const initialized = this.voxelAssetWorkflowControlState();
    if (initialized.lastAction !== 'initialize_volume' || initialized.status !== 'accepted') {
      return;
    }

    const facade = this.workspaceAuthoringFacadeState();
    if (facade === null) {
      return;
    }
    const batches = buildStudioVoxelHouseCommandBatches(target.grid);
    let acceptedCommandCount = 0;
    for (const batch of batches) {
      const result = facade.submitCommands(batch);
      if (result.rejected > 0 || result.accepted !== batch.commands.length) {
        this.refreshWorkspaceAuthoringState(facade);
        this.recordVoxelAssetWorkflowControl({
          action: 'create_house',
          accepted: false,
          target,
          message: result.rejections.at(0)?.reason ?? 'House template voxel edits were rejected.',
          residentModelId: initialized.residentModelId,
          volumeAssetId: initialized.volumeAssetId,
          voxelCount: acceptedCommandCount,
          materialSummary: initialized.materialSummary,
          canonicalJsonHash: null,
          voxelDataHash: null,
          validationDiagnosticCodes: [],
          lastAsset: initialized.lastAsset,
        });
        return;
      }
      acceptedCommandCount += result.accepted;
    }

    this.refreshWorkspaceAuthoringState(facade);
    const modelInfo = facade.readVoxelModelInfo({
      grid: target.grid,
      volumeAssetId: target.volumeAssetId,
      includeMaterialCounts: true,
    });
    if (!this.attachVoxelAssetToScene(target)) {
      this.recordVoxelAssetWorkflowControl({
        action: 'create_house',
        accepted: false,
        target,
        message: 'House voxels were created, but Rust rejected the scene attachment.',
        residentModelId: modelInfo.modelId,
        volumeAssetId: modelInfo.volumeAssetId,
        voxelCount: modelInfo.voxelCount,
        materialSummary: materialCountsSummary(modelInfo.materialCounts),
        canonicalJsonHash: null,
        voxelDataHash: null,
        validationDiagnosticCodes: [],
        lastAsset: initialized.lastAsset,
      });
      return;
    }
    this.recordVoxelAssetWorkflowControl({
      action: 'create_house',
      accepted: true,
      target,
      message: `Created a ${modelInfo.voxelCount}-voxel house; save the voxel asset and scene to keep it.`,
      residentModelId: modelInfo.modelId,
      volumeAssetId: modelInfo.volumeAssetId,
      voxelCount: modelInfo.voxelCount,
      materialSummary: materialCountsSummary(modelInfo.materialCounts),
      canonicalJsonHash: null,
      voxelDataHash: null,
      validationDiagnosticCodes: [],
      lastAsset: initialized.lastAsset,
    });
  }

  private attachVoxelAssetToScene(target: StudioVoxelAssetWorkflowTarget): boolean {
    const workspace = this.workspaceState();
    const document = workspace.flatSceneDocument;
    const selectedSceneObjectId = workspace.entities.find(
      entity => entity.id === workspace.selectedEntityId,
    )?.sceneObjectId ?? null;
    const selectedNodeId = selectedSceneObjectId?.startsWith('scene-node:') === true
      ? Number.parseInt(selectedSceneObjectId.slice('scene-node:'.length), 10)
      : null;
    const selectedVoxelNode = selectedNodeId === null || !Number.isFinite(selectedNodeId)
      ? undefined
      : document.nodes.find(node => (node.id as number) === selectedNodeId && node.kind.kind === 'voxelVolume');
    const existingNode = selectedVoxelNode ?? document.nodes.find(
      node => node.kind.kind === 'voxelVolume' && node.kind.asset.id === target.targetAssetId,
    );
    const pathTag = `asha-studio:voxel-asset-path:${target.assetPath}`;
    const assetReference = {
      id: target.targetAssetId,
      version: { req: 'any' as const },
      hash: null,
    };
    const maxNodeId = document.nodes.reduce((maximum, node) => Math.max(maximum, node.id), 0);
    const voxelNode = {
      id: existingNode?.id ?? sceneNodeId(maxNodeId + 1),
      parent: existingNode?.parent ?? document.nodes.find(node => node.parent === null)?.id ?? null,
      childOrder: existingNode?.childOrder ?? document.nodes.length,
      label: 'Voxel house',
      tags: [
        ...(existingNode?.tags ?? []).filter(tag => !tag.startsWith('asha-studio:voxel-asset-path:')),
        pathTag,
      ],
      transform: existingNode?.transform ?? {
        translation: [0, 0, 0] as const,
        rotation: [0, 0, 0, 1] as const,
        scale: [1, 1, 1] as const,
      },
      kind: { kind: 'voxelVolume' as const, asset: assetReference },
    };
    const authoringTarget = this.storedSceneAuthoringTarget(document);
    const command: SceneDocumentAuthoringCommand = existingNode === undefined
      ? {
          kind: 'create',
          target: authoringTarget,
          record: voxelNode,
        }
      : {
          kind: 'retargetVoxelAsset',
          target: authoringTarget,
          id: existingNode.id,
          asset: assetReference,
          tags: voxelNode.tags,
        };
    const authored = this.requestStoredSceneDocumentAuthoring(document, command);
    if (
      !authored.accepted
      || authored.document === null
      || authored.authoredLightFrame === null
      || authored.contentHash === null
    ) {
      this.menuMessageState.set(`Voxel scene attachment rejected: ${authored.diagnostic}`);
      return false;
    }
    const nextWorkspace = applyCanonicalSceneDocumentReadModel(
      workspace,
      authored.document,
      this.activeSceneFilePathState(),
    );
    this.activeVoxelAssetIdState.set(target.targetAssetId);
    this.workspaceState.set(nextWorkspace);
    this.authoredLightFrameState.set(authored.authoredLightFrame);
    this.sceneDocumentContentHashState.set(authored.contentHash);
    this.refreshSceneVoxelProjection();
    this.viewportCameraState.set(buildStudioViewportCameraReadModel({
      position: { x: 22, y: -18, z: 20 },
      target: { x: 5, y: 4, z: 5.5 },
    }));
    return true;
  }

  async runVoxelAssetWorkflowControl(action: StudioVoxelAssetWorkflowControlAction): Promise<void> {
    if (action === 'initialize_volume') {
      this.activeVoxelAssetIdState.set(null);
      this.activeVoxelAssetFilePathState.set(null);
      this.activeVoxelAssetFileHashState.set(null);
    }
    const target = this.voxelAssetWorkflowTargetForCurrentDraft();
    if (action === 'initialize_volume') {
      const draft = this.voxelConversionDraftState();
      const voxelMaterial = draft.materialMap.entries[0]?.voxelMaterial
        ?? draft.materialMap.defaultVoxelMaterial
        ?? 1;
      const paletteMaterials = [...new Set([voxelMaterial, 1, 2, 3])].sort((left, right) => left - right);
      const result = this.runAgentVoxelWorkflowOperation({
        kind: 'initialize_voxel_volume_authoring',
        initializeRequest: {
          grid: target.grid,
          volumeAssetId: target.volumeAssetId,
          seedChunk: { x: 0, y: 0, z: 0 },
          materialPalette: paletteMaterials.map(material => ({
            voxelMaterial: material,
            paletteEntryId: `voxel-material/studio-${material}`,
            displayName: `Studio material ${material}`,
            materialAssetId: `material/studio-${material}`,
            materialCatalogBindingId: null,
          })),
          authoring: {
            label: 'Studio scratch-authored voxel volume',
            createdBy: 'asha-studio',
            sourceTool: 'asha-studio',
          },
          maxMaterialBindings: 256,
        },
      });
      const receipt = result.voxelVolumeAuthoringInitialize ?? null;
      if (result.accepted) {
        this.voxelBrushState.update(state => ({
          ...state,
          material: paletteMaterials.includes(state.material) ? state.material : paletteMaterials[0] ?? 1,
          materials: paletteMaterials,
        }));
      }
      this.recordVoxelAssetWorkflowControl({
        action,
        accepted: result.accepted,
        target,
        message: result.accepted && receipt !== null
          ? `Initialized blank authored voxel model ${receipt.modelId}.`
          : result.diagnostic ?? 'Voxel authoring initialization failed.',
        residentModelId: receipt?.modelId ?? null,
        volumeAssetId: receipt?.volumeAssetId ?? target.volumeAssetId,
        voxelCount: result.accepted ? 0 : null,
        materialSummary: result.accepted
          ? `materials:${paletteMaterials.length} (${paletteMaterials.map(material => `${material}:0`).join(', ')})`
          : 'no material readback',
        canonicalJsonHash: null,
        voxelDataHash: null,
        validationDiagnosticCodes: (receipt?.diagnostics ?? []).map(diagnostic => diagnostic.code),
        lastAsset: this.voxelAssetWorkflowControlState().lastAsset,
      });
      return;
    }

    if (action === 'load_volume') {
      const lastAsset = this.voxelAssetWorkflowControlState().lastAsset;
      const facade = this.runtimeSessionFacadeState();
      if (facade === null) {
        this.recordVoxelAssetWorkflowControl({
          action,
          accepted: false,
          target,
          message: 'Attach a running game before loading the saved asset into live runtime state.',
          residentModelId: null,
          volumeAssetId: target.volumeAssetId,
          voxelCount: null,
          materialSummary: 'no live runtime readback',
          canonicalJsonHash: lastAsset?.contentHashes.canonicalJson ?? null,
          voxelDataHash: lastAsset?.contentHashes.voxelData ?? null,
          validationDiagnosticCodes: [],
          lastAsset,
        });
        return;
      }
      if (lastAsset === null) {
        this.recordVoxelAssetWorkflowControl({
          action,
          accepted: false,
          target,
          message: 'Export or save a voxel asset before loading it into RuntimeSession.',
          residentModelId: null,
          volumeAssetId: target.volumeAssetId,
          voxelCount: null,
          materialSummary: 'no material readback',
          canonicalJsonHash: null,
          voxelDataHash: null,
          validationDiagnosticCodes: [],
          lastAsset: null,
        });
        return;
      }
      if (lastAsset.assetId !== target.targetAssetId) {
        this.recordVoxelAssetWorkflowControl({
          action,
          accepted: false,
          target,
          message: `Last exported asset ${lastAsset.assetId} does not match target ${target.targetAssetId}.`,
          residentModelId: null,
          volumeAssetId: target.volumeAssetId,
          voxelCount: null,
          materialSummary: 'no material readback',
          canonicalJsonHash: lastAsset.contentHashes.canonicalJson,
          voxelDataHash: lastAsset.contentHashes.voxelData,
          validationDiagnosticCodes: [],
          lastAsset,
        });
        return;
      }
      try {
        const receipt = facade.loadVoxelVolumeAsset({
          asset: lastAsset,
          targetGrid: target.grid,
          targetVolumeAssetId: target.volumeAssetId,
          replaceExisting: true,
          includeMaterialCounts: true,
        });
        const readout = buildStudioAgentVoxelVolumeLoadReadModel(receipt);
        const loadResult: StudioAgentVoxelWorkflowResult = {
          accepted: receipt.loaded,
          operation: 'load_voxel_volume_asset',
          diagnostic: receipt.loaded ? null : receipt.diagnostics.at(0)?.message ?? 'Live runtime load rejected.',
          surface: this.agentVoxelWorkflowSurface(),
          voxelVolumeLoad: readout,
        };
        this.recordVoxelAssetWorkflowControlFromLoad(target, loadResult);
      } catch (error) {
        this.recordVoxelAssetWorkflowControl({
          action,
          accepted: false,
          target,
          message: errorMessage(error),
          residentModelId: null,
          volumeAssetId: target.volumeAssetId,
          voxelCount: null,
          materialSummary: 'no live runtime readback',
          canonicalJsonHash: lastAsset.contentHashes.canonicalJson,
          voxelDataHash: lastAsset.contentHashes.voxelData,
          validationDiagnosticCodes: [],
          lastAsset,
        });
      }
      return;
    }

    if (action === 'unload_volume') {
      const facade = this.runtimeSessionFacadeState();
      const lastAsset = this.voxelAssetWorkflowControlState().lastAsset;
      if (facade === null) {
        this.recordVoxelAssetWorkflowControl({
          action,
          accepted: false,
          target,
          message: 'Attach a running game before unloading live runtime state.',
          residentModelId: null,
          volumeAssetId: target.volumeAssetId,
          voxelCount: null,
          materialSummary: 'no live runtime readback',
          canonicalJsonHash: lastAsset?.contentHashes.canonicalJson ?? null,
          voxelDataHash: lastAsset?.contentHashes.voxelData ?? null,
          validationDiagnosticCodes: [],
          lastAsset,
        });
        return;
      }
      try {
        const modelInfo = facade.readVoxelModelInfo({
          grid: target.grid,
          volumeAssetId: target.volumeAssetId,
          includeMaterialCounts: true,
        });
        const receipt = facade.unloadVoxelVolumeAsset({
          grid: target.grid,
          volumeAssetId: target.volumeAssetId,
          expectedSessionHash: modelInfo.sessionHash,
        });
        this.recordVoxelAssetWorkflowControl({
          action,
          accepted: receipt.unloaded,
          target,
          message: receipt.unloaded
            ? `Unloaded ${receipt.removedVoxelCount} voxels from the running game.`
            : receipt.diagnostics.at(0)?.message ?? 'Live runtime unload rejected.',
          residentModelId: receipt.unloaded ? null : modelInfo.modelId,
          volumeAssetId: receipt.volumeAssetId ?? target.volumeAssetId,
          voxelCount: receipt.unloaded ? 0 : modelInfo.voxelCount,
          materialSummary: receipt.unloaded ? 'no live resident model' : materialCountsSummary(modelInfo.materialCounts),
          canonicalJsonHash: lastAsset?.contentHashes.canonicalJson ?? null,
          voxelDataHash: lastAsset?.contentHashes.voxelData ?? null,
          validationDiagnosticCodes: receipt.diagnostics.map(diagnostic => diagnostic.code),
          lastAsset,
        });
      } catch (error) {
        this.recordVoxelAssetWorkflowControl({
          action,
          accepted: false,
          target,
          message: errorMessage(error),
          residentModelId: null,
          volumeAssetId: target.volumeAssetId,
          voxelCount: null,
          materialSummary: 'no live runtime readback',
          canonicalJsonHash: lastAsset?.contentHashes.canonicalJson ?? null,
          voxelDataHash: lastAsset?.contentHashes.voxelData ?? null,
          validationDiagnosticCodes: [],
          lastAsset,
        });
      }
      return;
    }

    if (action === 'reopen_volume') {
      try {
        const stored = await this.readHostVoxelAsset(target.assetPath);
        const asset = JSON.parse(stored.text) as VoxelVolumeAsset;
        const loadResult = this.runAgentVoxelWorkflowOperation({
          kind: 'load_voxel_volume_asset',
          loadRequest: {
            asset,
            targetGrid: target.grid,
            targetVolumeAssetId: target.volumeAssetId,
            replaceExisting: true,
            includeMaterialCounts: true,
          },
        });
        this.recordVoxelAssetWorkflowControlFromLoad(target, loadResult, 'reopen_volume');
      } catch (error) {
        this.recordVoxelAssetWorkflowControl({
          action,
          accepted: false,
          target,
          message: `Reopen failed without replacing authoring state: ${errorMessage(error)}`,
          residentModelId: null,
          volumeAssetId: target.volumeAssetId,
          voxelCount: null,
          materialSummary: 'no authoring readback',
          canonicalJsonHash: null,
          voxelDataHash: null,
          validationDiagnosticCodes: [],
          lastAsset: this.voxelAssetWorkflowControlState().lastAsset,
        });
      }
      return;
    }

    const modelInfoResult = this.runAgentVoxelWorkflowOperation({
      kind: 'get_model_info',
      request: {
        grid: target.grid,
        volumeAssetId: target.volumeAssetId,
        includeMaterialCounts: true,
      },
    });

    if (action === 'model_info') {
      this.recordVoxelAssetWorkflowControlFromModelInfo(action, target, modelInfoResult);
      return;
    }

    if (!modelInfoResult.accepted || modelInfoResult.modelInfo === null || modelInfoResult.modelInfo === undefined) {
      this.recordVoxelAssetWorkflowControl({
        action,
        accepted: false,
        target,
        message: modelInfoResult.diagnostic ?? 'Read resident voxel model info before asset workflow operations.',
        residentModelId: null,
        volumeAssetId: target.volumeAssetId,
        voxelCount: null,
        materialSummary: 'no material readback',
        canonicalJsonHash: null,
        voxelDataHash: null,
        validationDiagnosticCodes: [],
        lastAsset: this.voxelAssetWorkflowControlState().lastAsset,
      });
      return;
    }

    const exportRequest = this.voxelAssetWorkflowExportRequest(target, modelInfoResult.modelInfo);
    if (action === 'export_volume') {
      const exportResult = this.runAgentVoxelWorkflowOperation({
        kind: 'export_voxel_volume_asset',
        exportRequest,
      });
      this.recordVoxelAssetWorkflowControlFromExport(action, target, modelInfoResult.modelInfo, exportResult);
      return;
    }

    if (action === 'save_volume') {
      const exportResult = this.runAgentVoxelWorkflowOperation({
        kind: 'export_voxel_volume_asset',
        exportRequest,
      });
      if (
        !exportResult.accepted
        || exportResult.voxelVolumeExport === null
        || exportResult.voxelVolumeExport === undefined
        || exportResult.voxelVolumeExport.asset === null
      ) {
        this.recordVoxelAssetWorkflowControlFromExport(action, target, modelInfoResult.modelInfo, exportResult);
        return;
      }

      const saveResult = this.runAgentVoxelWorkflowOperation({
        kind: 'save_voxel_volume_asset',
        saveRequest: {
          exportRequest,
          targetProjectBundle: target.projectBundle,
          targetAssetPath: target.assetPath,
          representationKind: 'sparse_runs',
          expectedExistingCanonicalJsonHash: null,
          expectedCanonicalJsonHash: exportResult.voxelVolumeExport.canonicalJsonHash,
          expectedVoxelDataHash: exportResult.voxelVolumeExport.voxelDataHash,
        },
      });
      const saveReadout = saveResult.voxelVolumeSave ?? null;
      if (
        !saveResult.accepted
        || saveReadout === null
        || saveReadout.serializedAsset === null
        || saveReadout.nextCanonicalJsonHash === null
      ) {
        this.recordVoxelAssetWorkflowControlFromSave(target, modelInfoResult.modelInfo, saveResult);
        return;
      }
      let storageCleanupDiagnostic: string | null = null;
      try {
        const hostAssetPath = this.voxelAssetHostSavePathOverrideState() ?? target.assetPath;
        const expectedHostHash = this.activeVoxelAssetFilePathState() === hostAssetPath
          ? this.activeVoxelAssetFileHashState()
          : undefined;
        const facade = this.workspaceAuthoringFacadeState();
        if (facade === null) {
          throw new Error('Workspace authoring authority closed before storage confirmation.');
        }
        const stored = await persistStudioWorkspaceAuthoringCandidate({
          authority: facade,
          currentAuthority: () => this.workspaceAuthoringFacadeState(),
          hostPath: hostAssetPath,
          canonicalJsonHash: saveReadout.nextCanonicalJsonHash,
          stage: () => this.stageHostVoxelAsset(
            hostAssetPath,
            saveReadout.serializedAsset ?? '',
            expectedHostHash,
          ),
          promote: token => this.promoteHostVoxelAsset(token),
          finalize: token => this.finalizeHostVoxelAssetStage(token),
          discard: token => this.discardHostVoxelAssetStage(token),
        });
        this.activeVoxelAssetFilePathState.set(stored.path);
        this.activeVoxelAssetFileHashState.set(stored.sha256);
        storageCleanupDiagnostic = stored.cleanupDiagnostic;
        this.workspaceAuthoringStateSummaryState.set(facade.readState());
        const attached = this.attachVoxelAssetToScene({
          ...target,
          assetPath: stored.path,
          customAssetPath: true,
        });
        if (!attached) {
          throw new Error('Rust rejected the saved voxel asset scene attachment.');
        }
      } catch (error) {
        this.recordVoxelAssetWorkflowControl({
          action,
          accepted: false,
          target,
          message: `Voxel save was not committed: ${errorMessage(error)}`,
          residentModelId: modelInfoResult.modelInfo.modelId,
          volumeAssetId: modelInfoResult.modelInfo.volumeAssetId,
          voxelCount: saveReadout.voxelCount,
          materialSummary: materialCountsSummary(modelInfoResult.modelInfo.materialCounts),
          canonicalJsonHash: saveReadout.nextCanonicalJsonHash,
          voxelDataHash: saveReadout.nextVoxelDataHash,
          validationDiagnosticCodes: saveReadout.validationDiagnosticCodes,
          lastAsset: saveReadout.asset,
        });
        return;
      }
      const storedTarget = this.activeVoxelAssetFilePathState() === null
        ? target
        : {
            ...target,
            assetPath: this.activeVoxelAssetFilePathState() ?? target.assetPath,
            customAssetPath: true,
      };
      this.recordVoxelAssetWorkflowControlFromSave(storedTarget, modelInfoResult.modelInfo, saveResult);
      if (storageCleanupDiagnostic !== null) {
        this.menuMessageState.set(
          `Voxel asset stored, but host rollback-backup cleanup needs attention: ${storageCleanupDiagnostic}`,
        );
      }
      return;
    }
  }

  private voxelAssetWorkflowTargetForCurrentDraft(): StudioVoxelAssetWorkflowTarget {
    const draft = this.voxelConversionWorkspaceShell().settingsDraft;
    const volumeAssetId = draft.targetVolumeAssetId.trim().length === 0
      ? 'voxel/generated'
      : draft.targetVolumeAssetId.trim();
    const rawName = volumeAssetId.split('/').filter(Boolean).at(-1) ?? 'generated';
    const assetName = rawName.replace(/[^A-Za-z0-9._-]/gu, '-');
    const targetDraft = this.voxelAssetWorkflowTargetDraftState();
    const derivedProjectBundle = this.gameWorkspace()?.gameId ?? 'asha-project';
    const derivedAssetPath = `assets/voxels/${assetName}.${VOXEL_ASSET_EXTENSION}`;
    const customProjectBundle = targetDraft.targetProjectBundle !== null;
    const customAssetPath = targetDraft.targetAssetPath !== null;
    return {
      grid: draft.targetGrid,
      volumeAssetId,
      targetAssetId: this.activeVoxelAssetIdState() ?? `voxel-volume/${assetName}`,
      projectBundle: targetDraft.targetProjectBundle ?? derivedProjectBundle,
      assetPath: targetDraft.targetAssetPath ?? derivedAssetPath,
      derivedProjectBundle,
      derivedAssetPath,
      customProjectBundle,
      customAssetPath,
    };
  }

  private voxelAssetWorkflowExportRequest(
    target: StudioVoxelAssetWorkflowTarget,
    modelInfo: VoxelModelInfoReadout,
  ): VoxelVolumeAssetExportRequest {
    return {
      grid: target.grid,
      volumeAssetId: target.volumeAssetId,
      targetAssetId: target.targetAssetId,
      label: 'Studio voxel workflow asset',
      createdBy: 'asha-studio',
      sourceTool: 'asha-studio',
      maxSparseRuns: 2_048,
      expectedSessionHash: modelInfo.sessionHash,
    };
  }

  private recordVoxelAssetWorkflowControlFromModelInfo(
    action: StudioVoxelAssetWorkflowControlAction,
    target: StudioVoxelAssetWorkflowTarget,
    result: StudioAgentVoxelWorkflowResult,
  ): void {
    const modelInfo = result.modelInfo ?? null;
    this.recordVoxelAssetWorkflowControl({
      action,
      accepted: result.accepted,
      target,
      message: result.accepted && modelInfo !== null
        ? `Resident model ${modelInfo.modelId} has ${modelInfo.voxelCount} voxels.`
        : result.diagnostic ?? 'Voxel model info is unavailable.',
      residentModelId: modelInfo?.modelId ?? null,
      volumeAssetId: modelInfo?.volumeAssetId ?? target.volumeAssetId,
      voxelCount: modelInfo?.voxelCount ?? null,
      materialSummary: materialCountsSummary(modelInfo?.materialCounts ?? []),
      canonicalJsonHash: null,
      voxelDataHash: null,
      validationDiagnosticCodes: (modelInfo?.diagnostics ?? []).map(diagnostic => diagnostic.code),
      lastAsset: this.voxelAssetWorkflowControlState().lastAsset,
    });
  }

  private recordVoxelAssetWorkflowControlFromExport(
    action: StudioVoxelAssetWorkflowControlAction,
    target: StudioVoxelAssetWorkflowTarget,
    modelInfo: VoxelModelInfoReadout,
    result: StudioAgentVoxelWorkflowResult,
  ): void {
    const exportReadout = result.voxelVolumeExport ?? null;
    this.recordVoxelAssetWorkflowControl({
      action,
      accepted: result.accepted,
      target,
      message: result.accepted && exportReadout !== null
        ? `Exported ${exportReadout.assetId ?? target.targetAssetId} with ${exportReadout.voxelCount ?? 0} voxels.`
        : result.diagnostic ?? 'Voxel volume export failed.',
      residentModelId: modelInfo.modelId,
      volumeAssetId: modelInfo.volumeAssetId,
      voxelCount: exportReadout?.voxelCount ?? modelInfo.voxelCount,
      materialSummary: materialCountsSummary(modelInfo.materialCounts),
      canonicalJsonHash: exportReadout?.canonicalJsonHash ?? null,
      voxelDataHash: exportReadout?.voxelDataHash ?? null,
      validationDiagnosticCodes: exportReadout?.validationDiagnosticCodes ?? [],
      lastAsset: exportReadout?.asset ?? this.voxelAssetWorkflowControlState().lastAsset,
    });
  }

  private recordVoxelAssetWorkflowControlFromSave(
    target: StudioVoxelAssetWorkflowTarget,
    modelInfo: VoxelModelInfoReadout,
    result: StudioAgentVoxelWorkflowResult,
  ): void {
    const saveReadout = result.voxelVolumeSave ?? null;
    this.recordVoxelAssetWorkflowControl({
      action: 'save_volume',
      accepted: result.accepted,
      target,
      message: result.accepted && saveReadout !== null
        ? `Saved ${saveReadout.assetId ?? target.targetAssetId} to ${target.assetPath}.`
        : result.diagnostic ?? 'Voxel volume save failed.',
      residentModelId: modelInfo.modelId,
      volumeAssetId: modelInfo.volumeAssetId,
      voxelCount: saveReadout?.voxelCount ?? modelInfo.voxelCount,
      materialSummary: saveReadout?.materialCount === null || saveReadout?.materialCount === undefined
        ? materialCountsSummary(modelInfo.materialCounts)
        : `materials:${saveReadout.materialCount}`,
      canonicalJsonHash: saveReadout?.nextCanonicalJsonHash ?? null,
      voxelDataHash: saveReadout?.nextVoxelDataHash ?? null,
      validationDiagnosticCodes: saveReadout?.validationDiagnosticCodes ?? [],
      lastAsset: saveReadout?.asset ?? this.voxelAssetWorkflowControlState().lastAsset,
    });
  }

  private recordVoxelAssetWorkflowControlFromLoad(
    target: StudioVoxelAssetWorkflowTarget,
    result: StudioAgentVoxelWorkflowResult,
    action: Extract<StudioVoxelAssetWorkflowControlAction, 'load_volume' | 'reopen_volume'> = 'load_volume',
  ): void {
    const loadReadout = result.voxelVolumeLoad ?? null;
    this.recordVoxelAssetWorkflowControl({
      action,
      accepted: result.accepted,
      target,
      message: result.accepted && loadReadout !== null
        ? action === 'reopen_volume'
          ? `Reopened ${loadReadout.requestAssetId} from ${target.assetPath} into workspace authoring.`
          : `Loaded ${loadReadout.requestAssetId} into the running game as ${loadReadout.modelId}.`
        : result.diagnostic ?? 'Voxel volume load failed.',
      residentModelId: loadReadout?.modelId ?? null,
      volumeAssetId: loadReadout?.volumeAssetId ?? target.volumeAssetId,
      voxelCount: loadReadout?.voxelCount ?? null,
      materialSummary: materialCountsSummary(loadReadout?.materialCounts ?? []),
      canonicalJsonHash: loadReadout?.canonicalJsonHash ?? null,
      voxelDataHash: loadReadout?.voxelDataHash ?? null,
      validationDiagnosticCodes: loadReadout?.validationDiagnosticCodes ?? [],
      lastAsset: this.voxelAssetWorkflowControlState().lastAsset,
    });
  }

  private async stageHostVoxelAsset(
    path: string,
    canonicalJson: string,
    expectedHash?: string | null,
  ): Promise<StudioHostFileStage> {
    const normalizedPath = normalizeProjectFilePath(path);
    const response = await fetch(`${projectFileApiBase()}/api/host-files/stage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: normalizedPath, text: canonicalJson, expectedHash }),
    });
    const payload = await response.json() as {
      readonly ok?: boolean;
      readonly token?: string;
      readonly path?: string;
      readonly sha256?: string;
      readonly diagnostic?: string;
      readonly message?: string;
    };
    if (
      !response.ok
      || payload.ok === false
      || typeof payload.token !== 'string'
      || typeof payload.path !== 'string'
      || typeof payload.sha256 !== 'string'
    ) {
      throw new Error(payload.message ?? payload.diagnostic ?? `HTTP ${response.status}`);
    }
    return {
      token: payload.token,
      path: normalizeProjectFilePath(payload.path),
      sha256: payload.sha256,
    };
  }

  private async promoteHostVoxelAsset(token: string): Promise<StudioHostFilePromotion> {
    const response = await fetch(`${projectFileApiBase()}/api/host-files/promote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json() as {
      readonly ok?: boolean;
      readonly path?: string;
      readonly sha256?: string;
      readonly diagnostic?: string;
      readonly message?: string;
    };
    if (!response.ok || payload.ok === false || typeof payload.path !== 'string' || typeof payload.sha256 !== 'string') {
      throw new Error(payload.message ?? payload.diagnostic ?? `HTTP ${response.status}`);
    }
    return { path: normalizeProjectFilePath(payload.path), sha256: payload.sha256 };
  }

  private async finalizeHostVoxelAssetStage(token: string): Promise<void> {
    const response = await fetch(`${projectFileApiBase()}/api/host-files/finalize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json() as {
      readonly ok?: boolean;
      readonly diagnostic?: string;
      readonly message?: string;
    };
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message ?? payload.diagnostic ?? `HTTP ${response.status}`);
    }
  }

  private async discardHostVoxelAssetStage(token: string): Promise<void> {
    const response = await fetch(`${projectFileApiBase()}/api/host-files/stage`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json() as {
      readonly ok?: boolean;
      readonly diagnostic?: string;
      readonly message?: string;
    };
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message ?? payload.diagnostic ?? `Host file stage cleanup failed with HTTP ${response.status}.`);
    }
  }

  private async readHostVoxelAsset(
    path: string,
  ): Promise<{ readonly path: string; readonly text: string; readonly sha256: string }> {
    const normalizedPath = normalizeProjectFilePath(path);
    const response = await fetch(`${projectFileApiBase()}/api/host-files/file?path=${encodeURIComponent(normalizedPath)}`);
    const payload = await response.json() as {
      readonly ok?: boolean;
      readonly path?: string;
      readonly text?: string;
      readonly sha256?: string;
      readonly diagnostic?: string;
      readonly message?: string;
    };
    if (
      !response.ok
      || payload.ok === false
      || typeof payload.path !== 'string'
      || typeof payload.text !== 'string'
      || typeof payload.sha256 !== 'string'
    ) {
      throw new Error(payload.message ?? payload.diagnostic ?? `HTTP ${response.status}`);
    }
    return { path: normalizeProjectFilePath(payload.path), text: payload.text, sha256: payload.sha256 };
  }

  private recordVoxelMaterialPaletteUpdate(
    editor: StudioVoxelMaterialPaletteEditorReadModel,
    accepted: boolean,
    message: string,
    diagnostics: readonly string[],
    receipt: VoxelVolumeAssetPaletteUpdateReceipt | null,
  ): void {
    this.voxelMaterialPaletteEditorState.set({
      ...editor,
      status: accepted ? 'accepted' : 'rejected',
      message,
      diagnostics,
      receipt,
    });
    this.menuMessageState.set(message);
  }

  private recordVoxelAssetWorkflowControl(input: {
    readonly action: StudioVoxelAssetWorkflowControlAction;
    readonly accepted: boolean;
    readonly target: StudioVoxelAssetWorkflowTarget;
    readonly message: string;
    readonly residentModelId: string | null;
    readonly volumeAssetId: string | null;
    readonly voxelCount: number | null;
    readonly materialSummary: string;
    readonly canonicalJsonHash: string | null;
    readonly voxelDataHash: string | null;
    readonly validationDiagnosticCodes: readonly string[];
    readonly lastAsset: VoxelVolumeAsset | null;
  }): void {
    const next: StudioVoxelAssetWorkflowControlReadModel = {
      controlVersion: 'studio-voxel-asset-workflow-control.v0',
      lastAction: input.action,
      status: input.accepted ? 'accepted' : 'rejected',
      message: input.message,
      targetAssetId: input.target.targetAssetId,
      targetProjectBundle: input.target.projectBundle,
      targetAssetPath: input.target.assetPath,
      residentModelId: input.residentModelId,
      volumeAssetId: input.volumeAssetId,
      voxelCount: input.voxelCount,
      materialSummary: input.materialSummary,
      canonicalJsonHash: input.canonicalJsonHash,
      voxelDataHash: input.voxelDataHash,
      validationDiagnosticCodes: input.validationDiagnosticCodes,
      canLoadLastAsset: input.lastAsset !== null,
      lastAssetId: input.lastAsset?.assetId ?? null,
      lastAsset: input.lastAsset,
    };
    this.voxelAssetWorkflowControlState.set(next);
    this.menuMessageState.set(input.message);
  }

  private applyAgentVoxelConversionPatch(patch: StudioAgentVoxelConversionSettingsPatch): void {
    if ('sourceAssetId' in patch) {
      this.setVoxelConversionSourceAsset(patch.sourceAssetId ?? '');
    }
    if (patch.mode !== undefined) this.setVoxelConversionMode(patch.mode);
    if (patch.fitPolicy !== undefined) this.setVoxelConversionFitPolicy(patch.fitPolicy);
    if (patch.originPolicy !== undefined) this.setVoxelConversionOriginPolicy(patch.originPolicy);
    if (patch.resolution !== undefined) {
      patch.resolution.forEach((value, axis) => this.setVoxelConversionResolutionAxis(axis, value));
    }
    if (patch.voxelSize !== undefined) this.setVoxelConversionVoxelSize(patch.voxelSize);
    if (patch.maxOutputVoxels !== undefined) this.setVoxelConversionMaxOutputVoxels(patch.maxOutputVoxels);
    if (patch.transformScale !== undefined) this.setVoxelConversionTransformScale(patch.transformScale);
    if (patch.transformTranslation !== undefined) {
      patch.transformTranslation.forEach((value, axis) => this.setVoxelConversionTransformTranslationAxis(axis, value));
    }
    if (patch.targetGrid !== undefined) this.setVoxelConversionTargetGrid(patch.targetGrid);
    if (patch.targetVolumeAssetId !== undefined) this.setVoxelConversionTargetVolumeAssetId(patch.targetVolumeAssetId);
    if (patch.targetOrigin !== undefined) {
      patch.targetOrigin.forEach((value, axis) => this.setVoxelConversionTargetOriginAxis(axis, value));
    }
    if ('meshPrimitive' in patch) this.setVoxelConversionMeshPrimitive(patch.meshPrimitive ?? '');
    if (patch.materialSourceSlot !== undefined) this.setVoxelConversionMaterialSourceSlot(patch.materialSourceSlot);
    if ('materialSourceId' in patch) this.setVoxelConversionMaterialSourceId(patch.materialSourceId ?? '');
    if (patch.materialVoxelId !== undefined) this.setVoxelConversionMaterialVoxelId(patch.materialVoxelId);
    if (patch.defaultMaterial !== undefined) this.setVoxelConversionDefaultMaterial(patch.defaultMaterial);
  }

  private voxelHistoryReadRequest(): VoxelEditHistoryReadRequest {
    const state = this.voxelHistoryControlState();
    return {
      historyId: state.historyId.trim(),
      cursorId: nullableTrimmed(state.cursorId),
      maxEntries: clampHistoryInteger(state.maxEntries, DEFAULT_VOXEL_HISTORY_CONTROL.maxEntries, 1, 100),
      includeRedoTail: state.includeRedoTail,
      expectedHistoryHash: state.summary?.historyHash ?? null,
    };
  }

  private voxelHistoryExpectedHistoryHash(): string {
    return this.voxelHistoryControlState().summary?.historyHash ?? '';
  }

  private voxelHistoryExpectedCursorHash(): string {
    const state = this.voxelHistoryControlState();
    return state.receipt?.cursorAfter?.historyHash
      ?? state.summary?.cursor.historyHash
      ?? state.summary?.historyHash
      ?? '';
  }

  private voxelHistoryRevertRequest(action: Extract<StudioVoxelHistoryAction, 'preview_revert' | 'apply_revert'>): VoxelEditHistoryRevertRequest {
    const state = this.voxelHistoryControlState();
    const mode: VoxelEditHistoryRevertMode = action === 'preview_revert' ? 'preview_revert' : 'apply_revert';
    return {
      historyId: state.historyId.trim(),
      mode,
      target: {
        transactionId: nullableTrimmed(state.targetTransactionId),
        cursorId: nullableTrimmed(state.targetCursorId),
        cursorIndex: state.targetCursorIndex,
      },
      expectedHistoryHash: this.voxelHistoryExpectedHistoryHash(),
      expectedCursorHash: this.voxelHistoryExpectedCursorHash(),
      maxReplaySteps: clampHistoryInteger(state.maxReplaySteps, DEFAULT_VOXEL_HISTORY_CONTROL.maxReplaySteps, 1, 2048),
      maxDiffVoxels: clampHistoryInteger(state.maxDiffVoxels, DEFAULT_VOXEL_HISTORY_CONTROL.maxDiffVoxels, 1, 100000),
      includeSampleWindow: state.includeSampleWindow,
    };
  }

  private voxelHistoryUndoRequest(): VoxelEditHistoryUndoRequest {
    const state = this.voxelHistoryControlState();
    return {
      historyId: state.historyId.trim(),
      expectedHistoryHash: this.voxelHistoryExpectedHistoryHash(),
      expectedCursorHash: this.voxelHistoryExpectedCursorHash(),
      maxReplaySteps: clampHistoryInteger(state.maxReplaySteps, DEFAULT_VOXEL_HISTORY_CONTROL.maxReplaySteps, 1, 2048),
      maxDiffVoxels: clampHistoryInteger(state.maxDiffVoxels, DEFAULT_VOXEL_HISTORY_CONTROL.maxDiffVoxels, 1, 100000),
    };
  }

  private voxelHistoryRedoRequest(): VoxelEditHistoryRedoRequest {
    const state = this.voxelHistoryControlState();
    return {
      historyId: state.historyId.trim(),
      expectedHistoryHash: this.voxelHistoryExpectedHistoryHash(),
      expectedCursorHash: this.voxelHistoryExpectedCursorHash(),
      maxReplaySteps: clampHistoryInteger(state.maxReplaySteps, DEFAULT_VOXEL_HISTORY_CONTROL.maxReplaySteps, 1, 2048),
      maxDiffVoxels: clampHistoryInteger(state.maxDiffVoxels, DEFAULT_VOXEL_HISTORY_CONTROL.maxDiffVoxels, 1, 100000),
    };
  }

  private recordVoxelHistoryReceipt(action: StudioVoxelHistoryAction, receipt: VoxelEditHistoryRevertReceipt): void {
    const accepted = receipt.applied || receipt.preview;
    const diff = receipt.diffSummary ?? receipt.previewEvidence?.diffSummary ?? null;
    const message = `${action} ${accepted ? 'accepted' : 'rejected'} for ${receipt.historyId}; diff ${diff?.changedVoxelCount ?? 'n/a'} voxels.`;
    this.voxelHistoryControlState.update(current => ({
      ...current,
      lastAction: action,
      status: accepted ? 'accepted' : 'rejected',
      message,
      diagnostic: receipt.diagnostics.at(0)?.message ?? diff?.diagnostics.at(0)?.message ?? null,
      receipt,
      cursorId: receipt.cursorAfter?.cursorId ?? receipt.cursorBefore.cursorId,
    }));
    this.recordVoxelHistoryRuntimeResult(action, receipt.historyId, message, accepted ? 'ok' : 'rejected');
  }

  private recordVoxelHistoryRejected(action: StudioVoxelHistoryAction, message: string): void {
    this.voxelHistoryControlState.update(current => ({
      ...current,
      lastAction: action,
      status: 'rejected',
      message,
      diagnostic: message,
    }));
    this.recordVoxelHistoryRuntimeResult(action, this.voxelHistoryControlState().historyId, message, 'rejected');
  }

  private recordVoxelHistoryRuntimeResult(
    action: StudioVoxelHistoryAction,
    historyId: string,
    message: string,
    status: 'ok' | 'rejected' | 'failed',
  ): void {
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: `voxel_history.${action}`,
      label: `Voxel History ${action}`,
      inputSummary: `history=${historyId};panel=${this.voxelHistoryPanel().readoutHash}`,
      outputSummary: message,
      status,
    });
    this.workspaceState.set(recorded.workspace);
    this.menuMessageState.set(message);
  }

  private refreshVoxelHistoryAfterEdit(facade: WorkspaceAuthoringFacade): void {
    try {
      const current = this.voxelHistoryControlState();
      const summary = facade.readVoxelEditHistory({
        historyId: current.historyId,
        cursorId: null,
        maxEntries: current.maxEntries,
        includeRedoTail: true,
        expectedHistoryHash: null,
      });
      this.voxelHistoryControlState.set({
        ...current,
        cursorId: summary.cursor.cursorId,
        summary,
        receipt: current.receipt,
        diagnostic: summary.diagnostics.at(0)?.message ?? null,
      });
    } catch {
      // History is auxiliary to an already-authorized edit. A later explicit
      // read can recover the controls without inventing local undo state.
    }
  }

  private syncVoxelBrushFromHistory(label: 'Undo' | 'Redo'): void {
    const control = this.voxelHistoryControlState();
    const accepted = control.status === 'accepted';
    const changed = control.receipt?.diffSummary?.changedVoxelCount ?? null;
    const message = accepted
      ? `${label} changed ${changed ?? 0} voxel${changed === 1 ? '' : 's'}.`
      : control.diagnostic ?? `${label} was not accepted by voxel history authority.`;
    this.voxelBrushState.update(state => ({
      ...state,
      status: accepted ? 'accepted' : 'rejected',
      changedVoxelCount: accepted ? changed : null,
      message,
    }));
    this.menuMessageState.set(message);
  }

  private recordVoxelAnnotationResult(
    control: StudioVoxelAnnotationControlReadModel,
    accepted: boolean,
    message: string,
    diagnostics: readonly string[],
    loadReceipt: VoxelAnnotationLayerLoadReceipt | null,
    query: VoxelAnnotationQueryReadout | null,
    receipt: VoxelAnnotationEditReceipt | VoxelAnnotationLayerExportReceipt | null,
  ): void {
    const expectedLayerHash = loadReceipt?.layerHash
      ?? (receipt !== null && 'layerHashAfter' in receipt
        ? receipt.layerHashAfter
        : receipt !== null && 'canonicalJsonHash' in receipt
          ? receipt.canonicalJsonHash
          : control.expectedLayerHash);
    this.voxelAnnotationControlState.set({
      ...control,
      status: accepted ? 'accepted' : 'rejected',
      message,
      runtimeLayerId: loadReceipt?.runtimeLayerId ?? control.runtimeLayerId,
      expectedLayerHash,
      diagnostics,
      query,
      editReceipt: receipt && 'edited' in receipt ? receipt : null,
      exportReceipt: receipt && 'exported' in receipt ? receipt : null,
    });
    this.menuMessageState.set(message);
  }

  private submitAgentVoxelEdit(
    batch: CommandBatch,
    operation: Extract<StudioAgentVoxelWorkflowResultOperation, 'submit_voxel_edit' | 'submit_compact_voxel_edit'> = 'submit_voxel_edit',
  ): StudioAgentVoxelWorkflowResult {
    const preflightDiagnostic = agentVoxelEditDiagnostic(batch);
    if (preflightDiagnostic !== null) {
      return {
        accepted: false,
        operation,
        diagnostic: preflightDiagnostic,
        surface: this.agentVoxelWorkflowSurface(),
        voxelEditReceipt: null,
        compiledVoxelEditBatch: operation === 'submit_compact_voxel_edit' ? batch : null,
      };
    }

    const facade = this.workspaceAuthoringFacadeState();
    if (facade === null) {
      return {
        accepted: false,
        operation,
        diagnostic: 'Workspace authoring authority is not ready for voxel edits.',
        surface: this.agentVoxelWorkflowSurface(),
        voxelEditReceipt: null,
        compiledVoxelEditBatch: operation === 'submit_compact_voxel_edit' ? batch : null,
      };
    }

    try {
      const result = facade.submitCommands(batch);
      const authoringState = this.refreshWorkspaceAuthoringState(facade);
      if (result.accepted > 0) this.refreshVoxelHistoryAfterEdit(facade);
      const receipt: StudioWorkspaceAuthoringCommandReceipt = {
        kind: 'studio_workspace_authoring.command_receipt.v0',
        batch,
        result,
        authoringState,
      };
      const status = result.rejected > 0 ? 'rejected' : 'ok';
      const summary = `Voxel edit accepted ${result.accepted}, rejected ${result.rejected}.`;
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'voxel_edit.submit',
        label: 'Agent Voxel Edit',
        inputSummary: `commands=${batch.commands.length};generation=${authoringState.identity.generation};revision=${authoringState.workingRevision}`,
        outputSummary: summary,
        status,
      });
      this.workspaceState.set(recorded.workspace);
      this.menuMessageState.set(summary);
      return {
        accepted: result.rejected === 0 && result.accepted > 0,
        operation,
        diagnostic: result.rejected === 0 ? null : JSON.stringify(result.rejections),
        surface: this.agentVoxelWorkflowSurface(),
        voxelEditReceipt: receipt,
        compiledVoxelEditBatch: operation === 'submit_compact_voxel_edit' ? batch : null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voxel edit authoring command failed.';
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'voxel_edit.submit',
        label: 'Agent Voxel Edit',
        inputSummary: `commands=${batch.commands.length}`,
        outputSummary: message,
        status: 'failed',
      });
      this.workspaceState.set(recorded.workspace);
      this.menuMessageState.set(message);
      return {
        accepted: false,
        operation,
        diagnostic: message,
        surface: this.agentVoxelWorkflowSurface(),
        voxelEditReceipt: null,
        compiledVoxelEditBatch: operation === 'submit_compact_voxel_edit' ? batch : null,
      };
    }
  }

  submitVoxelConversionCommand(commandId: StudioVoxelConversionCommandId): void {
    const shell = this.voxelConversionWorkspaceShell();
    const facade = this.workspaceAuthoringFacadeState();
    const proposal = this.voxelConversionProposalForCommand(shell, commandId);
    const label = shell.actions.find(action => action.commandId === commandId)?.label ?? commandId;
    const proposalHash = proposal.proposal === null
      ? 'rejected'
      : `${proposal.proposal.commandMetadata.inputSchemaName}:${proposal.proposal.expectedTimelineSequence}`;

    if (!proposal.accepted || proposal.proposal === null || facade === null) {
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId,
        label: `Voxel Conversion ${label}`,
        inputSummary: `proposal=${proposalHash};readout=${shell.workspace.readoutHash}`,
        outputSummary: proposal.diagnostics.at(0)?.message ?? 'Voxel conversion proposal rejected before authoring submission.',
        status: 'rejected',
      });
      this.workspaceState.set(recorded.workspace);
      this.menuMessageState.set(recorded.timelineEntry.outputSummary);
      return;
    }

    try {
      switch (commandId) {
        case 'voxel_conversion.plan': {
          const input = proposal.proposal.input as VoxelConversionPlanCommandInput;
          const plan = facade.planVoxelConversion(input.request);
          this.voxelConversionAuthorityState.set({
            plan,
            preview: null,
            receipt: null,
            evidence: [],
          });
          this.recordVoxelConversionRuntimeResult(commandId, label, proposalHash, `Plan ${plan.planId} received with ${plan.evidence.length} evidence refs.`);
          break;
        }
        case 'voxel_conversion.preview': {
          const input = proposal.proposal.input as VoxelConversionPreviewCommandInput;
          const preview = facade.previewVoxelConversion(input.request);
          this.voxelConversionAuthorityState.update(state => ({
            ...state,
            preview,
            receipt: null,
          }));
          this.recordVoxelConversionRuntimeResult(commandId, label, proposalHash, `Preview ${preview.outputHash} received with ${preview.evidence.length} evidence refs.`);
          break;
        }
        case 'voxel_conversion.apply': {
          const input = proposal.proposal.input as VoxelConversionApplyCommandInput;
          const receipt = facade.applyVoxelConversion(input.request);
          this.refreshWorkspaceAuthoringState(facade);
          this.voxelConversionAuthorityState.update(state => ({
            ...state,
            receipt,
          }));
          this.recordVoxelConversionRuntimeResult(commandId, label, proposalHash, `Apply receipt ${receipt.applied ? 'applied' : 'rejected'} with ${receipt.evidence.length} evidence refs.`);
          break;
        }
        case 'voxel_conversion.export_evidence': {
          const input = proposal.proposal.input as VoxelConversionEvidenceExportInput;
          const evidence = facade.exportVoxelConversionEvidence(input.evidence);
          this.voxelConversionAuthorityState.update(state => ({
            ...state,
            evidence,
          }));
          this.recordVoxelConversionRuntimeResult(commandId, label, proposalHash, `Exported ${evidence.length} authority evidence refs.`);
          break;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voxel conversion authoring command failed.';
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId,
        label: `Voxel Conversion ${label}`,
        inputSummary: `proposal=${proposalHash};readout=${shell.workspace.readoutHash}`,
        outputSummary: message,
        status: 'failed',
      });
      this.workspaceState.set(recorded.workspace);
      this.menuMessageState.set(message);
    }
  }

  applyRuntimeViewportCameraInput(
    mode: 'look' | 'pan' | 'zoom',
    delta: { readonly deltaX: number; readonly deltaY: number },
  ): void {
    const facade = this.runtimeSessionFacadeState();
    const evidence = this.runtimeViewportEvidenceState();
    const camera = evidence.camera;
    if (facade === null || camera === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before routing authoritative camera input.');
      return;
    }
    const clampAxis = (value: number): number => Math.max(-1, Math.min(1, value));
    try {
      const receipt = facade.applyFirstPersonCameraInput({
        camera: camera.camera,
        tick: camera.tick + 1,
        input: {
          moveForward: mode === 'zoom' ? clampAxis(-delta.deltaY / 120) : 0,
          moveRight: mode === 'pan' ? clampAxis(-delta.deltaX / 80) : 0,
          moveUp: mode === 'pan' ? clampAxis(delta.deltaY / 80) : 0,
          yawDeltaDegrees: mode === 'look' ? -delta.deltaX * 0.12 : 0,
          pitchDeltaDegrees: mode === 'look' ? -delta.deltaY * 0.12 : 0,
          dtSeconds: 1 / 60,
          moveSpeedUnitsPerSecond: 4,
        },
      });
      this.runtimeViewportEvidenceState.set({
        ...evidence,
        camera: receipt.snapshot,
      });
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.menuMessageState.set(
        `Runtime camera input accepted at tick ${receipt.snapshot.tick}; projection remains Rust authoritative.`,
      );
    } catch (error) {
      this.runtimeViewportEvidenceState.set({
        ...evidence,
        status: 'degraded',
        diagnostics: [...evidence.diagnostics, `camera_input: ${errorMessage(error)}`],
      });
    }
  }

  selectRuntimeVoxelAtViewport(input: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly projectionAnchor: {
      readonly handle: RenderHandle;
      readonly sourceEntity: EntityId | null;
      readonly position: readonly [number, number, number];
      readonly normal: readonly [number, number, number];
    };
  }): void {
    const bridge = this.runtimeSessionBridgeState();
    const evidence = this.runtimeViewportEvidenceState();
    const camera = evidence.camera;
    if (bridge === null || camera === null) {
      return;
    }
    try {
      const selection = bridge.selectVoxel({
        camera: camera.camera,
        grid: 1,
        viewport: { width: input.width, height: input.height },
        screenPoint: { x: input.x, y: input.y, space: 'pixel' },
        maxDistance: 100,
      });
      const pick = bridge.pickVoxel({
        grid: selection.pickRay.grid,
        origin: selection.pickRay.origin,
        direction: selection.pickRay.direction,
        maxDistance: selection.pickRay.maxDistance,
      });
      this.runtimeViewportEvidenceState.set({
        ...evidence,
        voxelPick: pick,
        voxelSelection: selection,
        projectionPick: input.projectionAnchor,
      });
    } catch (error) {
      this.runtimeViewportEvidenceState.set({
        ...evidence,
        status: 'degraded',
        diagnostics: [...evidence.diagnostics, `voxel_pick: ${errorMessage(error)}`],
      });
    }
  }

  readRuntimeSceneObjectSnapshot(): SceneObjectSnapshot | null {
    return this.runtimeViewportEvidenceState().scene;
  }

  applyRuntimeSceneObjectCommand(
    request: Parameters<RuntimeBridge['applySceneObjectCommand']>[0],
  ): SceneObjectCommandResult | null {
    const bridge = this.runtimeSessionBridgeState();
    const evidence = this.runtimeViewportEvidenceState();
    if (bridge === null) {
      return null;
    }
    try {
      const result = bridge.applySceneObjectCommand(request);
      this.runtimeViewportEvidenceState.set({
        ...evidence,
        scene: result.outcome?.snapshot ?? evidence.scene,
        sceneCommand: result,
      });
      return result;
    } catch (error) {
      this.runtimeViewportEvidenceState.set({
        ...evidence,
        status: 'degraded',
        diagnostics: [...evidence.diagnostics, `scene_command: ${errorMessage(error)}`],
      });
      return null;
    }
  }

  private refreshRuntimeViewportEvidence(
    bridge: NativeBrowserHostRuntimeBridge,
    facade: RuntimeSessionFacade,
  ): void {
    const diagnostics: string[] = [];
    let camera: CameraSnapshot | null = null;
    let scene: SceneObjectSnapshot | null = null;
    let materialPreview: ModelMaterialPreviewSnapshot | null = null;
    let voxelMesh: VoxelMeshEvidenceSnapshot | null = null;
    let voxelPick: PickResult | null = null;
    let voxelSelection: VoxelSelectionSnapshot | null = null;
    let bufferLifetime: StudioRuntimeViewportEvidence['bufferLifetime'] = null;

    try {
      camera = facade.createCamera(STUDIO_PLAYABLE_LOOP_CAMERA_REQUEST).snapshot;
      const cameraProjection = facade.readCameraProjection({
        camera: camera.camera,
        viewport: STUDIO_PLAYABLE_LOOP_CAMERA_REQUEST.viewport,
      });
      camera = {
        camera: cameraProjection.snapshot.camera,
        tick: cameraProjection.snapshot.tick,
        pose: cameraProjection.snapshot.pose,
        basis: cameraProjection.snapshot.basis,
        projection: cameraProjection.snapshot.projection,
        viewport: cameraProjection.snapshot.viewport,
      };
    } catch (error) {
      diagnostics.push(`camera_projection: ${errorMessage(error)}`);
    }

    try {
      scene = bridge.readSceneObjectSnapshot();
    } catch (error) {
      diagnostics.push(`scene_snapshot: ${errorMessage(error)}`);
    }

    try {
      materialPreview = bridge.readModelMaterialPreview(STUDIO_RUNTIME_MODEL_PREVIEW_REQUEST);
      diagnostics.push(...materialPreview.diagnostics.map(entry => `material_preview: ${entry}`));
    } catch (error) {
      diagnostics.push(`material_preview: ${errorMessage(error)}`);
    }

    try {
      voxelMesh = bridge.readVoxelMeshEvidence({ grid: 1, chunks: [] });
      diagnostics.push(...voxelMesh.diagnostics.map(entry => `voxel_mesh: ${entry}`));
    } catch (error) {
      diagnostics.push(`voxel_mesh: ${errorMessage(error)}`);
    }

    if (camera !== null) {
      try {
        voxelSelection = bridge.selectVoxel({
          camera: camera.camera,
          grid: 1,
          viewport: camera.viewport,
          screenPoint: { x: 0.5, y: 0.5, space: 'normalized_0_1' },
          maxDistance: 100,
        });
        voxelPick = bridge.pickVoxel({
          grid: voxelSelection.pickRay.grid,
          origin: voxelSelection.pickRay.origin,
          direction: voxelSelection.pickRay.direction,
          maxDistance: voxelSelection.pickRay.maxDistance,
        });
      } catch (error) {
        diagnostics.push(`voxel_selection: ${errorMessage(error)}`);
      }
    }

    const bufferHandle = 0 as RuntimeBufferHandle;
    try {
      const buffer = bridge.getBuffer(bufferHandle);
      bufferLifetime = {
        handle: buffer.handle as number,
        byteLength: buffer.bytes.byteLength,
        released: false,
      };
      bridge.releaseBuffer(buffer.handle);
      bufferLifetime = { ...bufferLifetime, released: true };
    } catch (error) {
      diagnostics.push(`buffer_lifetime: ${errorMessage(error)}`);
    }

    this.runtimeViewportEvidenceState.set({
      kind: 'studio_runtime_viewport_evidence.v0',
      status: diagnostics.length === 0 ? 'healthy' : 'degraded',
      camera,
      scene,
      materialPreview,
      voxelMesh,
      voxelPick,
      voxelSelection,
      projectionPick: null,
      sceneCommand: null,
      bufferLifetime,
      diagnostics,
    });
  }

  async attachRuntimeSessionInspection(): Promise<void> {
    const workspace = this.gameWorkspace();
    if (workspace === null) {
      this.runtimeConnectionMessageState.set('Open a game workspace before attaching RuntimeSession.');
      return;
    }

    try {
      this.clearRuntimeSessionInspection();
      const attach = await createStudioRustRuntimeSessionFacade();
      this.runtimeSessionBridgeState.set(attach.bridge);
      const facade = attach.facade;
      const initialized = facade.initialize({
        sessionId: `runtime-session:${workspace.gameId}:studio-rust`,
        seed: 17,
        project: {
          gameId: workspace.gameId,
          workspaceId: workspace.workspaceHash,
        },
        projectBundle: LIVE_RUNTIME_FIXTURE_PROJECT_BUNDLE,
      });
      assertNativeRustRuntimeAuthority(facade, attach.bridge);
      this.runtimeSessionFacadeState.set(facade);
      this.runtimeSessionStateSummaryState.set(initialized);
      this.runtimeSessionPausedState.set(false);
      this.playableLoopPolicyTickState.set(null);
      this.playableLoopRestartReceiptState.set(null);
      this.playableLoopEncounterTransitionReceiptState.set(null);
      this.playableLoopCombatFeedbackProjectionState.set(null);
      this.refreshRuntimeViewportEvidence(attach.bridge, facade);
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(
        `Rust RuntimeSession attached through ${attach.browserHost.compatibilityVersion}: ${initialized.sessionHash}.`,
      );
      this.menuMessageState.set('Live Runtime Inspection attached through the public one-cell browser host.');
    } catch (error) {
      let cleanupMessage = '';
      try {
        this.clearRuntimeSessionInspection();
      } catch (cleanupError) {
        cleanupMessage = ` Cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`;
      }
      this.runtimeConnectionMessageState.set(
        `${error instanceof Error ? error.message : 'RuntimeSession attach failed.'}${cleanupMessage}`,
      );
    }
  }

  async openWorkspaceAuthoring(): Promise<void> {
    const workspace = this.gameWorkspace();
    if (workspace === null) {
      this.workspaceAuthoringMessageState.set('Open a game workspace before starting asset authoring.');
      return;
    }

    let attach: StudioWorkspaceAuthoringAttach | null = null;
    try {
      await this.ensureStoredSceneDocumentAuthority();
      this.clearWorkspaceAuthoring(true);
      this.workspaceAuthoringMessageState.set('Starting Rust workspace authoring authority.');
      attach = await createStudioRustWorkspaceAuthoringFacade();
      const projectBundle = workspaceAuthoringProjectBundle(
        workspace,
        this.workspaceState().flatSceneDocument,
      );
      const state = attach.facade.open({
        authoringId: `workspace-authoring:${workspace.gameId}:studio`,
        seed: projectBundle.sceneId,
        project: {
          gameId: workspace.gameId,
          workspaceId: workspace.workspaceHash,
        },
        projectBundle,
      });
      this.workspaceAuthoringBridgeState.set(attach.bridge);
      this.workspaceAuthoringFacadeState.set(attach.facade);
      this.workspaceAuthoringStateSummaryState.set(state);
      this.refreshWorkspaceVoxelProjection(attach.facade, state);
      this.workspaceAuthoringMessageState.set(
        `Workspace authoring ready · generation ${state.identity.generation} · ${state.lifecycleHash}.`,
      );
      this.menuMessageState.set('Rust workspace authoring authority is ready.');
    } catch (error) {
      if (attach !== null) {
        disconnectStudioBrowserHostRuntimeBridge(attach.bridge);
      }
      this.workspaceAuthoringBridgeState.set(null);
      this.workspaceAuthoringFacadeState.set(null);
      this.workspaceAuthoringStateSummaryState.set(null);
      this.clearWorkspaceAuthoringProjectionDelivery();
      this.workspaceAuthoringMessageState.set(
        error instanceof Error ? error.message : 'Workspace authoring authority failed to start.',
      );
    }
  }

  private clearWorkspaceAuthoring(discardUnsavedWorkingState: boolean): void {
    const facade = this.workspaceAuthoringFacadeState();
    const bridge = this.workspaceAuthoringBridgeState();
    const state = this.workspaceAuthoringStateSummaryState();
    if (facade !== null && state !== null && state.status === 'open') {
      facade.close({
        expectedWorkspaceId: state.identity.project.workspaceId,
        expectedGeneration: state.identity.generation,
        discardUnsavedWorkingState,
      });
    }
    this.workspaceAuthoringFacadeState.set(null);
    this.workspaceAuthoringBridgeState.set(null);
    this.workspaceAuthoringStateSummaryState.set(null);
    this.clearWorkspaceAuthoringProjectionDelivery();
    this.voxelProjectionBindingReceiptState.set(null);
    this.voxelAuthoringModeState.set(INITIAL_VOXEL_AUTHORING_MODE);
    if (bridge !== null) {
      disconnectStudioBrowserHostRuntimeBridge(bridge);
    }
  }

  private refreshWorkspaceAuthoringState(facade: WorkspaceAuthoringFacade): WorkspaceAuthoringStateSummary {
    const state = facade.readState();
    if (this.workspaceAuthoringFacadeState() === facade) {
      this.workspaceAuthoringStateSummaryState.set(state);
      this.refreshWorkspaceVoxelProjection(facade, state);
    }
    return state;
  }

  private refreshWorkspaceVoxelProjection(
    facade: WorkspaceAuthoringFacade,
    state: WorkspaceAuthoringStateSummary,
  ): void {
    const plan = buildStudioVoxelProjectionBindingPlan(
      this.workspaceState().flatSceneDocument,
      this.activeVoxelAssetIdState(),
    );
    try {
      const startedAtMs = studioMonotonicNow();
      const configureStartedAtMs = startedAtMs;
      const receipt = facade.configureVoxelProjectionInstances({
        registryDigest: plan.registryDigest,
        instances: plan.instances,
      });
      const configureCompletedAtMs = studioMonotonicNow();
      this.voxelProjectionBindingReceiptState.set(receipt);
      const readStartedAtMs = studioMonotonicNow();
      const projection = facade.readProjection();
      const readCompletedAtMs = studioMonotonicNow();
      const reconcileStartedAtMs = readCompletedAtMs;
      const delivery = retainStudioWorkspaceProjection(
        this.workspaceAuthoringProjectionState(),
        projection,
        this.workspaceAuthoringProjectionAcknowledgedHash,
      );
      this.workspaceAuthoringProjectionState.set(delivery);
      this.workspaceAuthoringProjectionTimings.set(delivery.projectionHash, {
        configureMs: configureCompletedAtMs - configureStartedAtMs,
        projectionHash: delivery.projectionHash,
        readMs: readCompletedAtMs - readStartedAtMs,
        reconcileMs: studioMonotonicNow() - reconcileStartedAtMs,
        startedAtMs,
      });
      while (this.workspaceAuthoringProjectionTimings.size > 8) {
        const oldest = this.workspaceAuthoringProjectionTimings.keys().next().value;
        if (typeof oldest !== 'string') break;
        this.workspaceAuthoringProjectionTimings.delete(oldest);
      }
      this.voxelAuthoringModeState.update(context => {
        const stillBound = context.activeInstanceId === null
          || plan.instances.some(instance => instance.instanceId === context.activeInstanceId);
        if (!stillBound) {
          return {
            ...INITIAL_VOXEL_AUTHORING_MODE,
            activeAssetId: plan.activeAssetId,
            message: 'Returned to Object mode because the edited voxel instance is no longer projected.',
          };
        }
        const revisionChanged = context.workingRevision !== null
          && context.workingRevision !== state.workingRevision;
        return {
          ...context,
          activeAssetId: plan.activeAssetId,
          bindingHash: receipt.bindingHash,
          workingRevision: receipt.workingRevision,
          selectedCell: revisionChanged ? null : context.selectedCell,
          editAnchor: revisionChanged ? null : context.editAnchor,
          message: revisionChanged
            ? 'Voxel authority changed; select a visible cell again before editing.'
            : context.message,
        };
      });
      if (plan.availableAssetIds.length > 1) {
        this.workspaceAuthoringMessageState.set(
          `Projected ${plan.instances.length} instance(s) of active asset ${plan.activeAssetId ?? 'none'}; `
          + `other scene voxel assets remain unloaded: ${plan.availableAssetIds.filter(id => id !== plan.activeAssetId).join(', ')}.`,
        );
      }
    } catch (error) {
      this.voxelProjectionBindingReceiptState.set(null);
      this.clearWorkspaceAuthoringProjectionDelivery();
      this.workspaceAuthoringMessageState.set(`Voxel instance projection rejected: ${errorMessage(error)}`);
    }
  }

  recordWorkspaceAuthoringProjectionDelivery(input: {
    readonly channelReplaced: boolean;
    readonly projectionHash: string;
    readonly recovered: boolean;
    readonly renderApplyMs: number;
  }): void {
    const projection = this.workspaceAuthoringProjectionState();
    if (projection === null || projection.projectionHash !== input.projectionHash) return;
    this.workspaceAuthoringProjectionAcknowledgedHash = input.projectionHash;
    const timing = this.workspaceAuthoringProjectionTimings.get(input.projectionHash);
    this.workspaceAuthoringProjectionTimings.delete(input.projectionHash);
    const now = studioMonotonicNow();
    const sample: StudioWorkspaceProjectionRenderSample = {
      channelReplaced: input.channelReplaced,
      commitToRenderMs: timing === undefined ? input.renderApplyMs : now - timing.startedAtMs,
      configureMs: timing?.configureMs ?? 0,
      meshPayloadOpCount: projection.studioMetrics.meshPayloadOpCount,
      pendingOpCount: projection.studioMetrics.pendingOpCount,
      readMs: timing?.readMs ?? 0,
      reconcileMs: timing?.reconcileMs ?? 0,
      recovered: input.recovered,
      renderApplyMs: input.renderApplyMs,
      retainedOpCount: projection.studioMetrics.retainedOpCount,
    };
    this.workspaceAuthoringProjectionSamplesState.update(samples =>
      appendStudioWorkspaceProjectionSample(samples, sample),
    );
  }

  reportWorkspaceAuthoringProjectionFailure(message: string): void {
    this.workspaceAuthoringMessageState.set(`Viewport projection delivery failed: ${message}`);
  }

  private clearWorkspaceAuthoringProjectionDelivery(): void {
    this.workspaceAuthoringProjectionState.set(null);
    this.workspaceAuthoringProjectionAcknowledgedHash = null;
    this.workspaceAuthoringProjectionTimings.clear();
  }

  private refreshSceneVoxelProjection(): void {
    const facade = this.workspaceAuthoringFacadeState();
    const state = this.workspaceAuthoringStateSummaryState();
    if (facade !== null && state !== null) {
      this.refreshWorkspaceVoxelProjection(facade, state);
    }
  }

  detachRuntimeSessionInspection(): void {
    try {
      this.clearRuntimeSessionInspection();
      this.runtimeConnectionMessageState.set('RuntimeSession disconnected through the public browser-host lifecycle.');
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'RuntimeSession browser-host disconnect failed.',
      );
    }
  }

  tickRuntimeSessionInspection(): void {
    const facade = this.runtimeSessionFacadeState();
    if (facade === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before ticking.');
      return;
    }
    if (this.runtimeSessionPausedState()) {
      this.runtimeConnectionMessageState.set('RuntimeSession is paused; restart or resume is not public yet.');
      return;
    }

    try {
      const tick = facade.tick();
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            composition: tick.composition,
            sequenceId: tick.sequenceId,
            tick: tick.tick,
            sessionHash: tick.sessionHash,
          });
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(`RuntimeSession tick ${tick.tick}.`);
      this.menuMessageState.set(`Live Runtime Inspection tick ${tick.tick}.`);
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'RuntimeSession tick failed.',
      );
    }
  }

  restartRuntimeSessionInspection(): void {
    const facade = this.runtimeSessionFacadeState();
    const bridge = this.runtimeSessionBridgeState();
    if (facade === null || bridge === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before restarting.');
      return;
    }

    try {
      const restarted = facade.restart();
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            composition: restarted.composition,
            sequenceId: restarted.sequenceId,
            tick: restarted.tick,
            sessionHash: restarted.sessionHash,
          });
      this.runtimeSessionPausedState.set(false);
      this.playableLoopPolicyTickState.set(null);
      this.playableLoopRestartReceiptState.set(null);
      this.playableLoopEncounterTransitionReceiptState.set(null);
      this.playableLoopCombatFeedbackProjectionState.set(null);
      this.refreshRuntimeViewportEvidence(bridge, facade);
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(`RuntimeSession restarted: ${restarted.sessionHash}.`);
      this.menuMessageState.set('Live Runtime Inspection restarted.');
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'RuntimeSession restart failed.',
      );
    }
  }

  runPlayableLoopInspectionTick(): void {
    const facade = this.runtimeSessionFacadeState();
    if (facade === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before running the playable loop.');
      return;
    }
    if (this.runtimeSessionPausedState()) {
      this.runtimeConnectionMessageState.set('RuntimeSession is paused; playable-loop tick is unavailable.');
      return;
    }

    try {
      const encounterBefore = facade.readEncounterDirector();
      let encounterTransitionReceipt: RuntimeSessionEncounterTransitionReceipt | null = null;
      if (encounterBefore.state.status === 'pending') {
        encounterTransitionReceipt = facade.requestEncounterTransition({
          kind: 'runtime_session.encounter_transition_request.v0',
          presetId: 'generated-tunnel-small-encounter',
          action: 'activate',
        });
      }
      const camera = facade.createCamera(STUDIO_PLAYABLE_LOOP_CAMERA_REQUEST).snapshot.camera;
      const readout = facade.runAutonomousPolicyTick({
        targetCamera: camera,
        policySource: STUDIO_PLAYABLE_LOOP_POLICY_SOURCE,
      });
      const feedbackProjection = facade.readCombatFeedbackProjection({
        camera,
        viewport: STUDIO_PLAYABLE_LOOP_CAMERA_REQUEST.viewport,
      });
      encounterTransitionReceipt = facade.requestEncounterTransition({
        kind: 'runtime_session.encounter_transition_request.v0',
        presetId: 'generated-tunnel-small-encounter',
        action: 'sync_lifecycle',
      });
      this.playableLoopPolicyTickState.set(readout);
      this.playableLoopRestartReceiptState.set(null);
      this.playableLoopCombatFeedbackProjectionState.set(feedbackProjection);
      this.playableLoopEncounterTransitionReceiptState.set(encounterTransitionReceipt);
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            composition: readout.step.composition,
            sequenceId: encounterTransitionReceipt?.sequenceId ?? readout.sequenceIdAfter,
            tick: readout.tick,
            sessionHash: encounterTransitionReceipt?.hashes.sessionHashAfter ?? readout.sessionHashAfter,
          });
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(
        `Playable loop tick ${readout.tick}: ${readout.proposalSummary.acceptedProposalCount} accepted, ${readout.proposalSummary.unsupportedProposalCount} unsupported.`,
      );
      this.menuMessageState.set('Live playable-loop inspection used public RuntimeSession policy/combat/lifecycle surfaces.');
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'Playable-loop policy tick failed.',
      );
    }
  }

  restartPlayableLoopInspection(): void {
    const facade = this.runtimeSessionFacadeState();
    const lifecycle = this.playableLoopLifecycleState();
    if (facade === null || lifecycle === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before restarting the playable loop.');
      return;
    }

    try {
      const receipt = facade.requestSessionRestart({
        kind: 'runtime.restart_session_intent',
        source: 'programmatic',
        requireTerminal: true,
        expectedSessionHash: lifecycle.sessionHash,
      });
      this.playableLoopRestartReceiptState.set(receipt);
      if (receipt.accepted) {
        this.playableLoopPolicyTickState.set(null);
        this.playableLoopCombatFeedbackProjectionState.set(null);
        this.playableLoopEncounterTransitionReceiptState.set(null);
      }
      const telemetry = facade.readTelemetry();
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            composition: telemetry.composition,
            sequenceId: telemetry.sequenceId,
            tick: telemetry.tick,
            sessionHash: telemetry.sessionHash,
          });
      this.runtimeSessionPausedState.set(false);
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(
        `Playable-loop restart ${receipt.status}: ${receipt.statusBefore.outcome.kind} -> ${receipt.statusAfter.outcome.kind}.`,
      );
      this.menuMessageState.set('Live playable-loop restart used the public typed lifecycle intent.');
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'Playable-loop restart failed.',
      );
    }
  }

  setGeneratedLevelPresetField(field: 'presetId' | 'seed', value: string): void {
    this.generatedLevelPresetDraftState.update(draft => {
      if (field === 'seed') {
        return {
          ...draft,
          seed: Number(value),
        };
      }
      return {
        ...draft,
        presetId: value,
      };
    });
    this.generatedTunnelRegenerateReceiptState.set(null);
    this.menuMessageState.set('Generated-level preset draft updated in Definition Authoring.');
  }

  validateGeneratedLevelPreset(): void {
    const generatedLevel = this.runtimeSessionInspection().generatedLevel;
    this.menuMessageState.set(
      generatedLevel.definitionAuthoring.validationStatus === 'valid'
        ? 'Generated-level preset draft validates against the public readout surface.'
        : generatedLevel.definitionAuthoring.validationErrors.join(' '),
    );
  }

  setGameplayPresetField(field: StudioFpsGameplayPresetDraftField, value: string): void {
    this.gameplayPresetDraftState.update(draft => {
      switch (field) {
        case 'displayName':
          return { ...draft, displayName: value };
        case 'moveSpeedUnitsPerSecond':
          return { ...draft, moveSpeedUnitsPerSecond: Number(value) };
        case 'lookSensitivityDegreesPerPixel':
          return { ...draft, lookSensitivityDegreesPerPixel: Number(value) };
        case 'weaponDamage':
          return { ...draft, weaponDamage: Number(value) };
        case 'weaponAmmo':
          return { ...draft, weaponAmmo: Number(value) };
        case 'enemyCount':
          return { ...draft, enemyCount: Number(value) };
        case 'desiredRangeUnits':
          return { ...draft, desiredRangeUnits: Number(value) };
      }
    });
    this.menuMessageState.set('Gameplay preset draft updated in Definition Authoring.');
  }

  validateGameplayPreset(): void {
    const authoring = this.runtimeSessionInspection().playableLoopTuning.definitionAuthoring;
    this.menuMessageState.set(
      authoring.validation.status === 'valid'
        ? 'Gameplay preset draft validates through the public catalog-core schema.'
        : `${authoring.validation.diagnosticCount} gameplay preset diagnostic(s).`,
    );
  }

  requestGeneratedLevelRegenerate(): void {
    const facade = this.runtimeSessionFacadeState();
    const draft = this.generatedLevelPresetDraftState();
    if (facade === null) {
      this.runtimeConnectionMessageState.set('Attach RuntimeSession before requesting generated-level regenerate.');
      return;
    }
    if (draft.presetId !== 'tiny-enclosed' || draft.seed !== 17) {
      this.runtimeConnectionMessageState.set('Generated-level preset draft must validate before regenerate.');
      return;
    }

    try {
      const receipt = facade.requestGeneratedTunnelOperation({
        operation: 'regenerate',
        presetId: draft.presetId,
        seed: draft.seed,
      });
      this.generatedTunnelRegenerateReceiptState.set(receipt);
      this.runtimeSessionStateSummaryState.update(state => state === null
        ? state
        : {
            ...state,
            sequenceId: receipt.sequenceId,
            sessionHash: receipt.sessionHashAfter,
          });
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(
        receipt.status === 'unsupported'
          ? `Generated-level regenerate unsupported: ${receipt.reason}.`
          : 'Generated-level regenerate applied.',
      );
      this.menuMessageState.set('Generated-level regenerate used typed public RuntimeSession control.');
    } catch (error) {
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'Generated-level regenerate request failed.',
      );
    }
  }

  setHierarchyFilter(filter: string): void {
    this.hierarchyFilterState.set(filter);
  }

  private clearRuntimeSessionInspection(): void {
    const bridge = this.runtimeSessionBridgeState();
    this.runtimeSessionBridgeState.set(null);
    this.runtimeSessionFacadeState.set(null);
    this.runtimeSessionStateSummaryState.set(null);
    this.runtimeSessionProjectionState.set(null);
    this.runtimeSessionTelemetryState.set(null);
    this.runtimeViewportEvidenceState.set(MISSING_RUNTIME_VIEWPORT_EVIDENCE);
    this.runtimeSessionPausedState.set(false);
    this.generatedTunnelReadoutState.set(null);
    this.generatedTunnelRegenerateReceiptState.set(null);
    this.generatedTunnelNavProjectionState.set(null);
    this.playableLoopEncounterDirectorState.set(null);
    this.playableLoopEncounterTransitionReceiptState.set(null);
    this.playableLoopCombatFeedbackProjectionState.set(null);
    this.playableLoopPolicyTickState.set(null);
    this.playableLoopLifecycleState.set(null);
    this.playableLoopRestartReceiptState.set(null);
    if (bridge !== null) {
      let unloadFailure: unknown = null;
      try {
        bridge.unloadProjectBundle();
      } catch (error) {
        unloadFailure = error;
      }
      disconnectStudioBrowserHostRuntimeBridge(bridge);
      if (unloadFailure !== null) {
        throw new Error(`Runtime ProjectBundle unload failed before browser-host disconnect: ${errorMessage(unloadFailure)}`);
      }
    }
  }

  private refreshRuntimeSessionInspectionReadout(facade: RuntimeSessionFacade): void {
    this.runtimeSessionProjectionState.set(facade.readProjection());
    this.runtimeSessionTelemetryState.set(facade.readTelemetry());
    this.playableLoopLifecycleState.set(facade.readLifecycleStatus());
    this.playableLoopEncounterDirectorState.set(facade.readEncounterDirector());
    const draft = this.generatedLevelPresetDraftState();
    try {
      if (draft.presetId !== 'tiny-enclosed' || draft.seed !== 17) {
        throw new Error('Generated-level preset draft is outside the public fixture surface.');
      }
      this.generatedTunnelReadoutState.set(facade.readGeneratedTunnelReadout({
        presetId: 'tiny-enclosed',
        seed: 17,
      }));
      this.generatedTunnelNavProjectionState.set(facade.readNavProjection());
    } catch {
      this.generatedTunnelReadoutState.set(null);
      this.generatedTunnelNavProjectionState.set(null);
    }
  }

  async refreshRunningProjectSessions(): Promise<void> {
    const workspace = this.gameWorkspace();
    if (workspace === null) {
      this.runtimeConnectionMessageState.set('Open a game workspace before refreshing sessions.');
      return;
    }
    if (this.runtimeAttachState() === null) {
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'project.refresh_sessions',
        label: 'Refresh Running Project Sessions',
        inputSummary: `endpoint=${workspace.attachEndpoint}`,
        outputSummary: 'No attached running project session.',
      });
      this.workspaceState.set(recorded.workspace);
      this.runtimeConnectionMessageState.set('No running project connected.');
      return;
    }
    await this.connectRunningProject('refresh');
  }

  async connectRunningProject(mode: 'connect' | 'refresh' = 'connect'): Promise<void> {
    const workspace = this.gameWorkspace();
    if (workspace === null) {
      this.runtimeConnectionMessageState.set('Open a game workspace before connecting.');
      return;
    }
    const commandId = mode === 'connect' ? 'project.connect_running' : 'project.refresh_sessions';
    const transport = createBrowserDevtoolsTransport(workspace.attachEndpoint);
    try {
      const attached = await attachStudioGameWorkspaceDevtools(workspace, transport);
      if (!attached.ok) {
        this.runtimeAttachState.set(null);
        this.runtimeLiveState.set(null);
        this.recordRuntimeConnectionCommand(commandId, workspace.attachEndpoint, attached.diagnostics.at(0)?.message ?? 'Attach rejected.', 'rejected');
        return;
      }
      const live = await refreshStudioGameWorkspaceLiveReadModel(workspace, attached.attach, transport);
      if (!live.ok) {
        this.runtimeAttachState.set(attached.attach);
        this.runtimeLiveState.set(null);
        this.recordRuntimeConnectionCommand(commandId, workspace.attachEndpoint, live.diagnostics.at(0)?.message ?? 'Live readback failed.', 'rejected');
        return;
      }
      this.runtimeAttachState.set(attached.attach);
      this.runtimeLiveState.set(live.live);
      this.runtimeConnectionMessageState.set(`Connected to ${workspace.gameId} at ${workspace.attachEndpoint}.`);
      this.recordRuntimeConnectionCommand(commandId, workspace.attachEndpoint, `Connected liveHash=${live.live.liveHash}.`);
    } catch (error) {
      this.runtimeAttachState.set(null);
      this.runtimeLiveState.set(null);
      this.recordRuntimeConnectionCommand(
        commandId,
        workspace.attachEndpoint,
        error instanceof Error ? error.message : 'Running project connection failed.',
        'rejected',
      );
    }
  }

  disconnectRunningProject(): void {
    const workspace = this.gameWorkspace();
    const endpoint = workspace?.attachEndpoint ?? 'missing';
    this.runtimeAttachState.set(null);
    this.runtimeLiveState.set(null);
    try {
      this.clearRuntimeSessionInspection();
      this.runtimeConnectionMessageState.set('Running project and RuntimeSession disconnected.');
      this.recordRuntimeConnectionCommand(
        'project.disconnect_running',
        endpoint,
        'Disconnected running project and browser-host Session.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Running project browser-host disconnect failed.';
      this.runtimeConnectionMessageState.set(message);
      this.recordRuntimeConnectionCommand('project.disconnect_running', endpoint, message, 'rejected');
    }
  }

  private recordRuntimeConnectionCommand(
    commandId: 'project.refresh_sessions' | 'project.connect_running' | 'project.disconnect_running',
    endpoint: string,
    outputSummary: string,
    status: 'ok' | 'rejected' = 'ok',
  ): void {
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId,
      label: commandId === 'project.connect_running'
        ? 'Connect Running Project'
        : commandId === 'project.disconnect_running'
          ? 'Disconnect Running Project'
          : 'Refresh Running Project Sessions',
      inputSummary: `endpoint=${endpoint}`,
      outputSummary,
      status,
    });
    this.workspaceState.set(recorded.workspace);
    this.menuMessageState.set(outputSummary);
    this.runtimeConnectionMessageState.set(outputSummary);
  }

  newWorkspace(): void {
    if (this.sceneDirty() || this.workspaceAuthoringDirty()) {
      this.unsavedScenePromptState.set({
        action: 'new',
        path: null,
        message: 'Discard unsaved scene or asset-authoring changes and create a new scene?',
      });
      return;
    }
    void this.createNewScene();
  }

  confirmDiscardUnsavedScene(): void {
    const prompt = this.unsavedScenePromptState();
    this.unsavedScenePromptState.set(null);
    if (prompt?.action === 'new') {
      void this.createNewScene();
    } else if (prompt?.action === 'open' && prompt.path !== null) {
      void this.openSceneFileFromHost(prompt.path, true);
    } else if (prompt?.action === 'open-voxel-asset' && prompt.path !== null) {
      void this.openVoxelAssetFileFromHost(prompt.path, true);
    }
  }

  cancelDiscardUnsavedScene(): void {
    this.unsavedScenePromptState.set(null);
    this.menuMessageState.set('Scene operation canceled; unsaved changes were preserved.');
  }

  private async createNewScene(): Promise<void> {
    const cleared = clearStudioWorkspaceReadModel(this.workspaceState());
    try {
      const bridge = await this.sceneDocumentCodecBridge();
      const result = bridge.encodeSceneDocument({ document: cleared.flatSceneDocument });
      if (!result.accepted || result.document === null || result.contentHash === null) {
        throw new Error(this.sceneCodecDiagnostic(result));
      }
      const authored = this.requestStoredSceneDocumentAuthoring(
        result.document,
        {
          kind: 'refreshProjection',
          target: this.storedSceneAuthoringTarget(result.document),
        },
        result.contentHash,
      );
      if (
        !authored.accepted
        || authored.document === null
        || authored.authoredLightFrame === null
        || authored.contentHash === null
      ) {
        throw new Error(authored.diagnostic);
      }
      const workspace = applyCanonicalSceneDocumentReadModel(cleared, authored.document, null);
      this.workspaceState.set(workspace);
      this.authoredLightFrameState.set(authored.authoredLightFrame);
      this.sceneDocumentContentHashState.set(authored.contentHash);
      this.sceneLightHistoryState.set({ entries: [], cursor: 0 });
      this.sceneTransformHistoryState.set({ entries: [], cursor: 0 });
      this.activeSceneFilePathState.set(null);
      this.activeSceneFileHashState.set(null);
      this.cleanSceneDocumentHashState.set(stableBrowserHash(JSON.stringify(authored.document)));
      this.sceneFileConflictState.set(null);
      this.viewportHitState.set(null);
      this.viewportCameraState.set(buildStudioViewportCameraReadModel());
      this.viewportToolState.set(buildStudioViewportToolReadModel());
      this.activeVoxelAssetIdState.set(null);
      this.activeVoxelAssetFilePathState.set(null);
      this.activeVoxelAssetFileHashState.set(null);
      await this.openWorkspaceAuthoring();
      this.menuMessageState.set('New untitled scene created.');
    } catch (error) {
      this.menuMessageState.set(`New Scene failed without replacing the current document: ${errorMessage(error)}`);
    }
  }

  async refreshProjectFiles(dir = this.projectFileCurrentDirState()): Promise<void> {
    const requestedDir = normalizeProjectFilePath(dir);
    try {
      const response = await fetch(`${projectFileApiBase()}/api/host-files/list?dir=${encodeURIComponent(requestedDir)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json() as {
        readonly ok?: boolean;
        readonly startDirectory?: string;
        readonly dir?: string;
        readonly entries?: readonly StudioProjectFileEntry[];
        readonly message?: string;
      };
      if (payload.ok === false) {
        throw new Error(payload.message ?? 'Host directory listing failed.');
      }
      this.projectFileConnectedState.set(true);
      this.projectFileRootState.set(payload.startDirectory ?? null);
      const currentDir = normalizeProjectFilePath(payload.dir ?? requestedDir);
      this.projectFileCurrentDirState.set(currentDir);
      this.projectFileDirectoryPathState.set(currentDir);
      this.projectFileEntriesState.set([...(payload.entries ?? [])].sort(projectFileEntrySort));
      this.projectFileMessageState.set('Browsing files on the Studio host.');
    } catch (error) {
      this.projectFileConnectedState.set(false);
      this.projectFileRootState.set(null);
      this.projectFileEntriesState.set([]);
      this.projectFileMessageState.set(`Studio host file service unavailable: ${errorMessage(error)}`);
    }
  }

  openSceneFileDialog(mode: StudioSceneFileDialogMode): void {
    const candidatePath = mode === 'save-as'
      ? this.activeSceneFilePathState() ?? this.saveAsPathState()
      : this.projectFileSelectedPathState() ?? '';
    this.openHostFileDialog({
      operation: mode,
      resourceKind: 'scene',
      title: mode === 'open' ? 'Open Scene' : 'Save Scene As',
      fileTypeLabel: 'ASHA Scene (*.scene.json)',
      acceptedExtensions: ['.scene.json'],
      initialDirectory: parentProjectDir(candidatePath) || this.projectFileCurrentDirState(),
      initialFileName: projectFileName(candidatePath) || (mode === 'save-as' ? 'untitled.scene.json' : ''),
      confirmation: mode === 'open' ? 'open-scene' : 'save-scene-as',
      dirtyPolicy: mode === 'open' ? 'scene-and-voxel-authoring' : 'none',
    });
  }

  openVoxelAssetFileDialog(mode: StudioSceneFileDialogMode): void {
    const target = this.voxelAssetWorkflowTargetForCurrentDraft();
    const candidatePath = this.activeVoxelAssetFilePathState() ?? target.assetPath;
    this.openHostFileDialog({
      operation: mode,
      resourceKind: 'voxel-asset',
      title: mode === 'open' ? 'Open Voxel Asset' : 'Save Voxel Asset As',
      fileTypeLabel: `ASHA Voxel Asset (*.${VOXEL_ASSET_EXTENSION})`,
      acceptedExtensions: [`.${VOXEL_ASSET_EXTENSION}`],
      initialDirectory: parentProjectDir(candidatePath) || this.projectFileCurrentDirState(),
      initialFileName: mode === 'save-as' ? projectFileName(candidatePath) : '',
      confirmation: mode === 'open' ? 'open-voxel-asset' : 'save-voxel-asset-as',
      dirtyPolicy: mode === 'open' ? 'voxel-authoring' : 'none',
    });
  }

  private openHostFileDialog(intent: StudioHostFileDialogIntent): void {
    this.activeMenuState.set(null);
    this.hostFileDialogIntentState.set(intent);
    this.hostFileDialogResultState.set(null);
    this.projectFileDirectoryPathState.set(intent.initialDirectory);
    this.projectFileCurrentDirState.set(intent.initialDirectory);
    this.projectFileSelectedPathState.set(null);
    this.projectFileNameState.set(intent.initialFileName);
    void this.refreshProjectFiles(intent.initialDirectory);
  }

  closeHostFileDialog(): void {
    if (this.unsavedScenePromptState()?.action === 'open'
      || this.unsavedScenePromptState()?.action === 'open-voxel-asset') {
      this.cancelDiscardUnsavedScene();
    }
    this.hostFileDialogIntentState.set(null);
  }

  closeSceneFileDialog(): void {
    this.closeHostFileDialog();
  }

  setProjectFileDirectoryPath(path: string): void {
    this.projectFileDirectoryPathState.set(path);
  }

  navigateProjectFileDirectory(): void {
    void this.refreshProjectFiles(this.projectFileDirectoryPathState());
  }

  setProjectFileName(fileName: string): void {
    this.projectFileNameState.set(fileName);
    const targetPath = joinProjectFilePath(this.projectFileCurrentDirState(), fileName);
    this.projectFileSelectedPathState.set(targetPath.length > 0 ? targetPath : null);
    this.saveAsPathState.set(targetPath);
  }

  selectProjectFile(path: string): void {
    const normalizedPath = normalizeProjectFilePath(path);
    const entry = this.projectFileDialog().entries.find(item => item.path === normalizedPath);
    this.projectFileSelectedPathState.set(normalizedPath);
    if (entry?.kind === 'file') {
      this.projectFileNameState.set(entry.name);
      this.saveAsPathState.set(normalizedPath);
    }
  }

  activateProjectFile(path: string): void {
    const normalizedPath = normalizeProjectFilePath(path);
    const entry = this.projectFileDialog().entries.find(item => item.path === normalizedPath);
    if (entry?.kind === 'directory') {
      this.projectFileSelectedPathState.set(null);
      void this.refreshProjectFiles(entry.path);
      return;
    }
    this.selectProjectFile(normalizedPath);
    if (this.hostFileDialogIntentState()?.operation === 'open') {
      this.confirmHostFileDialog();
    }
  }

  openProjectParentDir(): void {
    void this.refreshProjectFiles(parentProjectDir(this.projectFileCurrentDirState()));
  }

  openSelectedProjectFile(): void {
    const path = this.projectFileSelectedPathState();
    if (path === null) {
      this.menuMessageState.set('Select a supported file to open.');
      return;
    }
    const confirmation = this.hostFileDialogIntentState()?.confirmation;
    if (confirmation === 'open-scene') {
      void this.openSceneFileFromProject(path);
    } else if (confirmation === 'open-voxel-asset') {
      void this.openVoxelAssetFileFromProject(path);
    }
  }

  confirmHostFileDialog(): void {
    const dialog = this.projectFileDialog();
    const intent = dialog.intent;
    if (intent === null) {
      return;
    }
    if (!dialog.canConfirm) {
      this.projectFileMessageState.set(
        dialog.mode === 'open'
          ? `Choose a ${intent.fileTypeLabel} file to open.`
          : `Enter a file name ending in ${intent.acceptedExtensions.join(' or ')}.`,
      );
      return;
    }
    if (intent.operation === 'open') {
      this.projectFileSelectedPathState.set(dialog.targetPath);
      this.openSelectedProjectFile();
      return;
    }
    if (intent.confirmation === 'save-scene-as') {
      this.saveSceneFileAs(dialog.targetPath);
    } else if (intent.confirmation === 'save-voxel-asset-as') {
      void this.saveVoxelAssetFileAs(dialog.targetPath);
    }
  }

  confirmSceneFileDialog(): void {
    this.confirmHostFileDialog();
  }

  private async openSceneFileFromProject(path: string): Promise<void> {
    if (this.sceneDirty() || this.workspaceAuthoringDirty()) {
      this.unsavedScenePromptState.set({
        action: 'open',
        path,
        message: `Discard unsaved scene or asset-authoring changes and open ${path}?`,
      });
      return;
    }
    await this.openSceneFileFromHost(path, true);
  }

  async openVoxelAssetFileFromProject(path: string): Promise<void> {
    if (this.workspaceAuthoringDirty()) {
      this.unsavedScenePromptState.set({
        action: 'open-voxel-asset',
        path,
        message: `Discard unsaved voxel-asset authoring changes and open ${path}? The scene document will be preserved.`,
      });
      return;
    }
    await this.openVoxelAssetFileFromHost(path, true);
  }

  private async openVoxelAssetFileFromHost(path: string, authorizedDiscard: boolean): Promise<void> {
    if (!authorizedDiscard && this.workspaceAuthoringDirty()) {
      this.unsavedScenePromptState.set({
        action: 'open-voxel-asset',
        path,
        message: `Discard unsaved voxel-asset authoring changes and open ${path}? The scene document will be preserved.`,
      });
      return;
    }
    const normalizedPath = normalizeProjectFilePath(path);
    try {
      const stored = await this.readHostVoxelAsset(normalizedPath);
      const wireValue: unknown = JSON.parse(stored.text);
      const target = this.voxelAssetWorkflowTargetForCurrentDraft();
      // The cast satisfies the generated request signature only. No field from the
      // wire value becomes Studio state until Rust accepts it and returns matching
      // canonical and voxel-data hashes.
      const candidate = wireValue as VoxelVolumeAsset;
      const loadResult = this.runAgentVoxelWorkflowOperation({
        kind: 'load_voxel_volume_asset',
        loadRequest: {
          asset: candidate,
          targetGrid: target.grid,
          targetVolumeAssetId: target.volumeAssetId,
          replaceExisting: true,
          includeMaterialCounts: true,
        },
      });
      const loadReadout = loadResult.voxelVolumeLoad ?? null;
      if (!loadResult.accepted || loadReadout === null) {
        throw new Error(loadResult.diagnostic ?? 'Rust rejected the voxel asset.');
      }
      const acceptedTarget: StudioVoxelAssetWorkflowTarget = {
        ...target,
        targetAssetId: loadReadout.requestAssetId,
        assetPath: stored.path,
        customAssetPath: true,
      };
      if (!this.attachVoxelAssetToScene(acceptedTarget)) {
        throw new Error('Rust rejected the opened voxel asset scene attachment.');
      }
      this.activeVoxelAssetFilePathState.set(stored.path);
      this.activeVoxelAssetFileHashState.set(stored.sha256);
      this.setVoxelBrushPaletteFromAsset(candidate);
      this.recordVoxelAssetWorkflowControl({
        action: 'reopen_volume',
        accepted: true,
        target: acceptedTarget,
        message: `Opened ${loadReadout.requestAssetId} from ${stored.path} through Rust workspace authority.`,
        residentModelId: loadReadout.modelId,
        volumeAssetId: loadReadout.volumeAssetId,
        voxelCount: loadReadout.voxelCount,
        materialSummary: materialCountsSummary(loadReadout.materialCounts),
        canonicalJsonHash: loadReadout.canonicalJsonHash,
        voxelDataHash: loadReadout.voxelDataHash,
        validationDiagnosticCodes: loadReadout.validationDiagnosticCodes,
        lastAsset: candidate,
      });
      this.hostFileDialogResultState.set({
        operation: 'open',
        resourceKind: 'voxel-asset',
        path: stored.path,
        status: 'accepted',
        message: `Opened voxel asset ${stored.path}.`,
      });
      this.hostFileDialogIntentState.set(null);
      this.menuMessageState.set(`Opened voxel asset ${stored.path}; the scene document was preserved.`);
    } catch (error) {
      const message = `Open voxel asset failed without replacing authoring state: ${errorMessage(error)}`;
      this.hostFileDialogResultState.set({
        operation: 'open',
        resourceKind: 'voxel-asset',
        path: normalizedPath,
        status: 'rejected',
        message,
      });
      this.menuMessageState.set(message);
    }
  }

  private async openSceneFileFromHost(path: string, authorizedDiscard: boolean): Promise<void> {
    if (!authorizedDiscard && (this.sceneDirty() || this.workspaceAuthoringDirty())) {
      this.unsavedScenePromptState.set({ action: 'open', path, message: `Discard unsaved scene or asset-authoring changes and open ${path}?` });
      return;
    }
    const normalizedPath = normalizeProjectFilePath(path);
    try {
      const response = await fetch(`${projectFileApiBase()}/api/host-files/file?path=${encodeURIComponent(normalizedPath)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json() as {
        readonly ok?: boolean;
        readonly path?: string;
        readonly text?: string;
        readonly sha256?: string;
        readonly message?: string;
      };
      if (
        payload.ok === false
        || typeof payload.path !== 'string'
        || typeof payload.text !== 'string'
        || typeof payload.sha256 !== 'string'
      ) {
        throw new Error(payload.message ?? 'Invalid host file readback.');
      }
      const bridge = await this.sceneDocumentCodecBridge();
      const result = bridge.decodeSceneDocument({ sourceText: payload.text });
      if (!result.accepted || result.document === null || result.contentHash === null) {
        throw new Error(this.sceneCodecDiagnostic(result));
      }
      const authored = this.requestStoredSceneDocumentAuthoring(
        result.document,
        {
          kind: 'refreshProjection',
          target: this.storedSceneAuthoringTarget(result.document),
        },
        result.contentHash,
      );
      if (
        !authored.accepted
        || authored.document === null
        || authored.authoredLightFrame === null
        || authored.contentHash === null
      ) {
        throw new Error(authored.diagnostic);
      }
      const absolutePath = normalizeProjectFilePath(payload.path);
      const workspace = applyCanonicalSceneDocumentReadModel(
        this.workspaceState(),
        authored.document,
        absolutePath,
      );
      this.workspaceState.set(workspace);
      this.authoredLightFrameState.set(authored.authoredLightFrame);
      this.sceneDocumentContentHashState.set(authored.contentHash);
      this.sceneLightHistoryState.set({ entries: [], cursor: 0 });
      this.sceneTransformHistoryState.set({ entries: [], cursor: 0 });
      this.activeSceneFilePathState.set(absolutePath);
      this.activeSceneFileHashState.set(payload.sha256);
      this.cleanSceneDocumentHashState.set(stableBrowserHash(JSON.stringify(authored.document)));
      this.projectFileSelectedPathState.set(absolutePath);
      this.saveAsPathState.set(absolutePath);
      this.projectFileNameState.set(projectFileName(absolutePath));
      this.hostFileDialogIntentState.set(null);
      this.hostFileDialogResultState.set({
        operation: 'open',
        resourceKind: 'scene',
        path: absolutePath,
        status: 'accepted',
        message: `Opened scene ${absolutePath}.`,
      });
      this.sceneFileConflictState.set(null);
      this.viewportHitState.set(null);
      this.viewportCameraState.set(frameStudioViewportCamera(workspace.scene));
      this.viewportToolState.set(buildStudioViewportToolReadModel());
      this.activeVoxelAssetIdState.set(null);
      this.activeVoxelAssetFilePathState.set(null);
      this.activeVoxelAssetFileHashState.set(null);
      await this.openWorkspaceAuthoring();
      const reconnectedVoxelAssetIds = await this.reconnectSceneVoxelAssets(authored.document);
      const reconnected = new Set(reconnectedVoxelAssetIds);
      const unresolvedAssetIds = this.unresolvedSceneAssetIds(authored.document)
        .filter(assetId => !reconnected.has(assetId));
      this.menuMessageState.set(
        unresolvedAssetIds.length === 0
          ? `Opened ${absolutePath} from the Studio host.`
          : `Opened ${absolutePath}; unresolved scene assets: ${unresolvedAssetIds.join(', ')}.`,
      );
    } catch (error) {
      const message = `Open failed without replacing the current document: ${errorMessage(error)}`;
      this.hostFileDialogResultState.set({
        operation: 'open',
        resourceKind: 'scene',
        path: normalizedPath,
        status: 'rejected',
        message,
      });
      this.menuMessageState.set(message);
    }
  }

  private async reconnectSceneVoxelAssets(document: FlatSceneDocument): Promise<readonly string[]> {
    const facade = this.workspaceAuthoringFacadeState();
    if (facade === null) {
      return [];
    }
    const reconnected: string[] = [];
    const uniqueVoxelNodes: FlatSceneDocument['nodes'][number][] = [];
    const seenVoxelAssetIds = new Set<string>();
    for (const node of document.nodes) {
      if (node.kind.kind === 'voxelVolume' && !seenVoxelAssetIds.has(node.kind.asset.id)) {
        seenVoxelAssetIds.add(node.kind.asset.id);
        uniqueVoxelNodes.push(node);
      }
    }
    const nodesToReconnect = uniqueVoxelNodes.slice(0, 1);
    if (uniqueVoxelNodes.length > 1) {
      this.workspaceAuthoringMessageState.set(
        `Scene references ${uniqueVoxelNodes.length} distinct voxel assets; `
        + 'the current workspace authoring cell loads one asset at a time. Open the desired asset before entering Edit mode.',
      );
    }
    for (const node of nodesToReconnect) {
      if (node.kind.kind !== 'voxelVolume') continue;
      const assetId = node.kind.asset.id;
      const taggedPath = node.tags
        .find(tag => tag.startsWith('asha-studio:voxel-asset-path:'))
        ?.slice('asha-studio:voxel-asset-path:'.length);
      const assetName = assetId.split('/').filter(Boolean).at(-1) ?? 'generated';
      const assetPath = taggedPath ?? `assets/voxels/${assetName}.${VOXEL_ASSET_EXTENSION}`;
      try {
        const stored = await this.readHostVoxelAsset(assetPath);
        const asset = JSON.parse(stored.text) as VoxelVolumeAsset;
        const volumeAssetId = `voxel/${assetName}`;
        const receipt = facade.loadVoxelVolumeAsset({
          asset,
          targetGrid: 1,
          targetVolumeAssetId: volumeAssetId,
          replaceExisting: true,
          includeMaterialCounts: true,
        });
        if (!receipt.loaded) {
          continue;
        }
        this.voxelConversionDraftState.update(draft => ({
          ...draft,
          targetGrid: receipt.grid,
          targetVolumeAssetId: volumeAssetId,
        }));
        this.activeVoxelAssetFilePathState.set(stored.path);
        this.activeVoxelAssetFileHashState.set(stored.sha256);
        this.activeVoxelAssetIdState.set(receipt.requestAssetId);
        this.setVoxelBrushPaletteFromAsset(asset);
        this.refreshWorkspaceAuthoringState(facade);
        this.voxelAssetWorkflowControlState.update(current => ({
          ...current,
          lastAction: 'reopen_volume',
          status: 'accepted',
          message: `Reconnected ${assetId} from ${assetPath}.`,
          targetAssetId: assetId,
          targetAssetPath: assetPath,
          residentModelId: receipt.modelId,
          volumeAssetId: receipt.volumeAssetId,
          voxelCount: receipt.voxelCount,
          materialSummary: materialCountsSummary(receipt.materialCounts),
          canonicalJsonHash: receipt.canonicalJsonHash,
          voxelDataHash: receipt.voxelDataHash,
          validationDiagnosticCodes: receipt.diagnostics.map(diagnostic => diagnostic.code),
          canLoadLastAsset: true,
          lastAssetId: asset.assetId,
          lastAsset: asset,
        }));
        reconnected.push(assetId);
      } catch {
        // The ordinary unresolved-assets message owns visible failure reporting.
      }
    }
    return reconnected;
  }

  saveSceneFile(): void {
    const path = this.activeSceneFilePathState();
    if (path === null) {
      this.openSceneFileDialog('save-as');
      return;
    }
    void this.writeSceneFile(path, false);
  }

  saveSceneFileAs(path = this.saveAsPathState()): void {
    this.saveAsPathState.set(path);
    void this.writeSceneFile(path, true);
  }

  async saveVoxelAssetFileAs(path: string): Promise<void> {
    const normalizedPath = normalizeProjectFilePath(path);
    if (!normalizedPath.endsWith(`.${VOXEL_ASSET_EXTENSION}`)) {
      this.projectFileMessageState.set(`Voxel asset paths must end in .${VOXEL_ASSET_EXTENSION}.`);
      return;
    }
    this.voxelAssetHostSavePathOverrideState.set(normalizedPath);
    try {
      await this.runVoxelAssetWorkflowControl('save_volume');
    } finally {
      this.voxelAssetHostSavePathOverrideState.set(null);
    }
    const control = this.voxelAssetWorkflowControlState();
    if (control.lastAction !== 'save_volume' || control.status !== 'accepted') {
      this.hostFileDialogResultState.set({
        operation: 'save-as',
        resourceKind: 'voxel-asset',
        path: normalizedPath,
        status: 'rejected',
        message: control.message,
      });
      return;
    }
    this.activeVoxelAssetFilePathState.set(normalizedPath);
    this.hostFileDialogResultState.set({
      operation: 'save-as',
      resourceKind: 'voxel-asset',
      path: normalizedPath,
      status: 'accepted',
      message: `Saved voxel asset as ${normalizedPath}.`,
    });
    this.hostFileDialogIntentState.set(null);
    this.projectFileSelectedPathState.set(normalizedPath);
    this.projectFileNameState.set(projectFileName(normalizedPath));
    this.menuMessageState.set(`Saved voxel asset as ${normalizedPath}.`);
    await this.refreshProjectFiles(parentProjectDir(normalizedPath));
  }

  setSaveAsPath(path: string): void {
    this.saveAsPathState.set(path);
    this.projectFileSelectedPathState.set(path);
    this.projectFileNameState.set(projectFileName(path));
  }

  private async writeSceneFile(path: string, saveAs: boolean): Promise<void> {
    const normalizedPath = normalizeProjectFilePath(path);
    if (normalizedPath.length === 0) {
      this.menuMessageState.set('Save Scene As requires a host filesystem path.');
      return;
    }
    try {
      const bridge = await this.sceneDocumentCodecBridge();
      const result = bridge.encodeSceneDocument({ document: this.workspaceState().flatSceneDocument });
      if (!result.accepted || result.document === null || result.canonicalJson === null) {
        throw new Error(this.sceneCodecDiagnostic(result));
      }
      const expectedHash = saveAs ? null : this.activeSceneFileHashState();
      const response = await fetch(`${projectFileApiBase()}/api/host-files/file`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: normalizedPath, text: result.canonicalJson, expectedHash }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json() as {
        readonly ok?: boolean;
        readonly path?: string;
        readonly sha256?: string;
        readonly diagnostic?: string;
        readonly message?: string;
        readonly previousHash?: string | null;
      };
      if (payload.ok === false && payload.diagnostic === 'stale_file_hash') {
        this.sceneFileConflictState.set({
          path: normalizedPath,
          expectedHash,
          actualHash: payload.previousHash ?? null,
          canonicalJson: result.canonicalJson,
          document: result.document,
        });
        this.menuMessageState.set(`Save paused: ${normalizedPath} changed on the Studio host.`);
        return;
      }
      if (payload.ok === false || typeof payload.path !== 'string' || typeof payload.sha256 !== 'string') {
        throw new Error(payload.message ?? payload.diagnostic ?? 'Host file write failed.');
      }
      this.commitSceneFileSave(payload.path, payload.sha256, result.document, saveAs);
      await this.refreshProjectFiles(parentProjectDir(payload.path));
    } catch (error) {
      this.menuMessageState.set(`Save failed without changing the current document identity: ${errorMessage(error)}`);
    }
  }

  reloadSceneFileAfterConflict(): void {
    const conflict = this.sceneFileConflictState();
    if (conflict === null) {
      return;
    }
    this.sceneFileConflictState.set(null);
    void this.openSceneFileFromHost(conflict.path, true);
  }

  overwriteSceneFileAfterConflict(): void {
    const conflict = this.sceneFileConflictState();
    if (conflict === null) {
      return;
    }
    void this.persistConflictOverwrite(conflict);
  }

  cancelSceneFileConflict(): void {
    this.sceneFileConflictState.set(null);
    this.menuMessageState.set('Save conflict left unresolved; the current document was preserved.');
  }

  private async persistConflictOverwrite(conflict: StudioSceneFileConflictReadModel): Promise<void> {
    try {
      const response = await fetch(`${projectFileApiBase()}/api/host-files/file`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          path: conflict.path,
          text: conflict.canonicalJson,
          expectedHash: conflict.actualHash,
        }),
      });
      const payload = await response.json() as {
        readonly ok?: boolean;
        readonly path?: string;
        readonly sha256?: string;
        readonly message?: string;
      };
      if (!response.ok || payload.ok === false || typeof payload.path !== 'string' || typeof payload.sha256 !== 'string') {
        throw new Error(payload.message ?? `HTTP ${response.status}`);
      }
      this.commitSceneFileSave(payload.path, payload.sha256, conflict.document, false);
    } catch (error) {
      this.menuMessageState.set(`Overwrite failed; the conflict remains active: ${errorMessage(error)}`);
    }
  }

  private commitSceneFileSave(
    path: string,
    sha256: string,
    document: FlatSceneDocument,
    saveAs: boolean,
  ): void {
    this.workspaceState.update(workspace => ({ ...workspace, flatSceneDocument: document }));
    this.activeSceneFilePathState.set(path);
    this.activeSceneFileHashState.set(sha256);
    this.cleanSceneDocumentHashState.set(stableBrowserHash(JSON.stringify(document)));
    this.projectFileSelectedPathState.set(path);
    this.saveAsPathState.set(path);
    this.projectFileNameState.set(projectFileName(path));
    this.hostFileDialogIntentState.set(null);
    this.hostFileDialogResultState.set({
      operation: 'save-as',
      resourceKind: 'scene',
      path,
      status: 'accepted',
      message: saveAs ? `Saved scene as ${path}.` : `Saved scene ${path}.`,
    });
    this.sceneFileConflictState.set(null);
    this.menuMessageState.set(saveAs ? `Saved scene as ${path}.` : `Saved scene ${path}.`);
  }

  private async sceneDocumentCodecBridge(): Promise<NativeBrowserHostRuntimeBridge> {
    const existing = this.sceneDocumentCodecBridgeState();
    if (existing !== null) {
      return existing;
    }
    const resolved = await resolveStudioBrowserHostRuntimeBridge();
    resolved.bridge.initializeEngine({ seed: 5802 });
    this.sceneDocumentCodecBridgeState.set(resolved.bridge);
    return resolved.bridge;
  }

  private async ensureStoredSceneDocumentAuthority(): Promise<void> {
    if (this.sceneDocumentContentHashState() !== null) return;
    const currentWorkspace = this.workspaceState();
    const currentRevision = studioSceneAuthoringBaseHash(currentWorkspace.flatSceneDocument);
    const bridge = await this.sceneDocumentCodecBridge();
    const encoded = bridge.encodeSceneDocument({ document: currentWorkspace.flatSceneDocument });
    if (!encoded.accepted || encoded.document === null || encoded.contentHash === null) {
      throw new Error(this.sceneCodecDiagnostic(encoded));
    }
    const authored = this.requestStoredSceneDocumentAuthoring(
      encoded.document,
      {
        kind: 'refreshProjection',
        target: this.storedSceneAuthoringTarget(encoded.document),
      },
      encoded.contentHash,
    );
    if (
      !authored.accepted
      || authored.document === null
      || authored.authoredLightFrame === null
      || authored.contentHash === null
    ) {
      throw new Error(authored.diagnostic);
    }
    if (studioSceneAuthoringBaseHash(this.workspaceState().flatSceneDocument) !== currentRevision) {
      throw new Error('Scene changed while Rust authoring authority was initializing.');
    }
    this.workspaceState.set(applyCanonicalSceneDocumentReadModel(
      currentWorkspace,
      authored.document,
      this.activeSceneFilePathState(),
    ));
    this.authoredLightFrameState.set(authored.authoredLightFrame);
    this.sceneDocumentContentHashState.set(authored.contentHash);
  }

  private storedSceneAuthoringBridge(): NativeBrowserHostRuntimeBridge | null {
    return this.sceneDocumentCodecBridgeState() ?? this.workspaceAuthoringBridgeState();
  }

  private requestStoredSceneDocumentAuthoring(
    currentDocument: FlatSceneDocument,
    command: SceneDocumentAuthoringCommand,
    expectedContentHash = this.sceneDocumentContentHashState(),
  ): {
    readonly accepted: boolean;
    readonly document: FlatSceneDocument | null;
    readonly authoredLightFrame: RenderFrameDiff | null;
    readonly contentHash: string | null;
    readonly diagnostic: string;
  } {
    const bridge = this.storedSceneAuthoringBridge();
    if (bridge === null) {
      return {
        accepted: false,
        document: null,
        authoredLightFrame: null,
        contentHash: null,
        diagnostic: 'Rust scene authoring authority is not ready.',
      };
    }
    if (expectedContentHash === null) {
      return {
        accepted: false,
        document: null,
        authoredLightFrame: null,
        contentHash: null,
        diagnostic: 'Rust has not issued a revision for the current scene document.',
      };
    }
    try {
      const result = bridge.applySceneDocumentAuthoring({
        currentProjectId: STUDIO_STORED_SCENE_PROJECT_ID,
        expectedContentHash,
        currentDocument,
        command,
      });
      if (
        !result.accepted
        || result.document === null
        || result.contentHash === null
        || result.authoredLightFrame === null
      ) {
        return {
          accepted: false,
          document: null,
          authoredLightFrame: null,
          contentHash: null,
          diagnostic: result.rejection?.message ?? 'Rust rejected the stored scene edit.',
        };
      }
      return {
        accepted: true,
        document: result.document,
        authoredLightFrame: result.authoredLightFrame,
        contentHash: result.contentHash,
        diagnostic: 'Rust accepted the stored scene edit.',
      };
    } catch (error) {
      return {
        accepted: false,
        document: null,
        authoredLightFrame: null,
        contentHash: null,
        diagnostic: errorMessage(error),
      };
    }
  }

  private storedSceneAuthoringTarget(
    document: FlatSceneDocument,
  ): SceneDocumentAuthoringTarget {
    return {
      projectId: STUDIO_STORED_SCENE_PROJECT_ID,
      sceneId: document.id,
    };
  }

  private sceneCodecDiagnostic(result: {
    readonly diagnostics: readonly { readonly code: string; readonly message: string }[];
    readonly validation: { readonly errors: readonly { readonly code: string }[] };
  }): string {
    return result.diagnostics.at(0)?.message
      ?? result.validation.errors.at(0)?.code
      ?? 'Rust rejected the scene document.';
  }

  private unresolvedSceneAssetIds(document: FlatSceneDocument): readonly string[] {
    return findUnresolvedSceneAssetIds(
      document,
      this.catalogSourceState().entries.map(entry => entry.id),
    );
  }

  setRenderSetting(key: StudioRenderSettingKey, value: boolean): void {
    this.preferencesStore.setRenderSetting(key, value);
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: 'preferences.set_render_setting',
      label: 'Set Render Preference',
      inputSummary: `${key}=${value}`,
      outputSummary: `Render setting ${key} updated.`,
    });
    this.workspaceState.set(recorded.workspace);
    this.menuMessageState.set('View preference updated.');
  }

  setLightingMode(mode: StudioLightingMode): void {
    this.preferencesStore.setLightingMode(mode);
    const label = mode === 'work_light' ? 'Editor Work Lights' : 'Authored Lights';
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: 'preferences.set_render_setting',
      label: 'Set Lighting Preview',
      inputSummary: `lightingMode=${mode}`,
      outputSummary: `${label} preview enabled without changing the SceneDocument.`,
    });
    this.workspaceState.set(recorded.workspace);
    this.menuMessageState.set(`${label} preview enabled.`);
  }

  async addAuthoredLight(kind: StudioAuthoredLightKind): Promise<void> {
    const before = this.workspaceState().flatSceneDocument;
    const proposal = proposeStudioLightAddition(before, kind);
    const record = proposal.document.nodes.find(node => node.id === proposal.nodeId);
    if (record === undefined) return;
    await this.commitValidatedLightCommand(
      before,
      {
        kind: 'create',
        target: this.storedSceneAuthoringTarget(before),
        record,
      },
      `Add ${kind} light`,
      proposal.nodeId as number,
      true,
    );
  }

  setSelectedLightColorAxis(axis: number, value: number): void {
    if (axis < 0 || axis > 2 || !Number.isFinite(value)) return;
    void this.updateSelectedLight(`Change light color`, light => ({
      ...light,
      color: light.color.map((entry, index) => index === axis ? value : entry) as [number, number, number],
    }));
  }

  setSelectedLightIntensity(value: number): void {
    if (!Number.isFinite(value)) return;
    void this.updateSelectedLight('Change light intensity', light => ({ ...light, intensity: value }));
  }

  setSelectedLightEnabled(enabled: boolean): void {
    void this.updateSelectedLight(enabled ? 'Enable light' : 'Disable light', light => ({ ...light, enabled }));
  }

  setSelectedLightShadowIntent(requested: boolean): void {
    void this.updateSelectedLight('Change light shadow intent', light => ({
      ...light,
      shadowIntent: requested ? 'requested' : 'disabled',
    }));
  }

  setSelectedLightRange(value: number | null): void {
    if (value !== null && !Number.isFinite(value)) return;
    void this.updateSelectedLight('Change light range', light => (
      light.kind === 'point' || light.kind === 'spot' ? { ...light, range: value } : light
    ));
  }

  setSelectedLightDecay(value: number): void {
    if (!Number.isFinite(value)) return;
    void this.updateSelectedLight('Change light decay', light => (
      light.kind === 'point' || light.kind === 'spot' ? { ...light, decay: value } : light
    ));
  }

  setSelectedSpotCone(value: number): void {
    if (!Number.isFinite(value)) return;
    void this.updateSelectedLight('Change spot cone', light => (
      light.kind === 'spot' ? { ...light, outerAngleRadians: value } : light
    ));
  }

  setSelectedSpotPenumbra(value: number): void {
    if (!Number.isFinite(value)) return;
    void this.updateSelectedLight('Change spot penumbra', light => (
      light.kind === 'spot' ? { ...light, penumbra: value } : light
    ));
  }

  undoSceneLightEdit(): void {
    const history = this.sceneLightHistoryState();
    const entry = history.cursor > 0 ? history.entries[history.cursor - 1] : undefined;
    if (entry === undefined) return;
    const before = this.workspaceState().flatSceneDocument;
    const command = this.sceneLightHistoryCommand(entry, 'undo', before);
    if (command === null) return;
    void this.commitValidatedLightCommand(
      before,
      command,
      `Undo ${entry.label}`,
      null,
      false,
    ).then(accepted => {
      if (accepted) this.sceneLightHistoryState.set({ ...history, cursor: history.cursor - 1 });
    });
  }

  redoSceneLightEdit(): void {
    const history = this.sceneLightHistoryState();
    const entry = history.cursor < history.entries.length ? history.entries[history.cursor] : undefined;
    if (entry === undefined) return;
    const before = this.workspaceState().flatSceneDocument;
    const command = this.sceneLightHistoryCommand(entry, 'redo', before);
    if (command === null) return;
    void this.commitValidatedLightCommand(
      before,
      command,
      `Redo ${entry.label}`,
      null,
      false,
    ).then(accepted => {
      if (accepted) this.sceneLightHistoryState.set({ ...history, cursor: history.cursor + 1 });
    });
  }

  private async updateSelectedLight(
    label: string,
    update: (light: SceneLight) => SceneLight,
  ): Promise<void> {
    const node = this.selectedAuthoredLight();
    if (node === null || node.kind.kind !== 'light') {
      this.menuMessageState.set('Select an authored light before editing light settings.');
      return;
    }
    const before = this.workspaceState().flatSceneDocument;
    await this.commitValidatedLightCommand(
      before,
      {
        kind: 'updateLight',
        target: this.storedSceneAuthoringTarget(before),
        id: node.id,
        sceneLight: update(node.kind.sceneLight),
      },
      label,
      node.id as number,
      true,
    );
  }

  private sceneLightHistoryCommand(
    entry: StudioSceneLightHistoryEntry,
    direction: 'undo' | 'redo',
    current: FlatSceneDocument,
  ): SceneDocumentAuthoringCommand | null {
    const target = this.storedSceneAuthoringTarget(current);
    if (entry.command.kind === 'create') {
      return direction === 'undo'
        ? { kind: 'delete', target, id: entry.command.record.id }
        : { ...entry.command, target };
    }
    if (entry.command.kind !== 'updateLight') return null;
    const lightId = entry.command.id;
    const document = direction === 'undo' ? entry.before : entry.after;
    const node = document.nodes.find(candidate => candidate.id === lightId);
    if (node?.kind.kind !== 'light') return null;
    return {
      kind: 'updateLight',
      target,
      id: node.id,
      sceneLight: node.kind.sceneLight,
    };
  }

  private async commitValidatedLightCommand(
    before: FlatSceneDocument,
    command: SceneDocumentAuthoringCommand,
    label: string,
    selectNodeId: number | null,
    recordHistory: boolean,
  ): Promise<boolean> {
    try {
      await this.sceneDocumentCodecBridge();
      const result = this.requestStoredSceneDocumentAuthoring(before, command);
      if (
        !result.accepted
        || result.document === null
        || result.authoredLightFrame === null
        || result.contentHash === null
      ) {
        this.menuMessageState.set(`Light edit rejected by Rust: ${result.diagnostic}`);
        return false;
      }
      let workspace = applyCanonicalSceneDocumentReadModel(
        this.workspaceState(),
        result.document,
        this.activeSceneFilePathState(),
      );
      if (selectNodeId !== null) {
        workspace = applySelectedEntityReadModel(workspace, `scene-node:${selectNodeId}`);
      }
      this.workspaceState.set(workspace);
      this.authoredLightFrameState.set(result.authoredLightFrame);
      this.sceneDocumentContentHashState.set(result.contentHash);
      if (selectNodeId !== null) {
        this.viewportCameraState.set(frameStudioViewportCameraOnRenderable(
          workspace.scene,
          workspace.scene.selectedRenderableId,
        ));
      }
      this.refreshSceneVoxelProjection();
      if (recordHistory) {
        const history = this.sceneLightHistoryState();
        const entries = [
          ...history.entries.slice(0, history.cursor),
          { before, after: result.document, command, label },
        ];
        this.sceneLightHistoryState.set({ entries, cursor: entries.length });
      }
      this.menuMessageState.set(`${label}.`);
      return true;
    } catch (error) {
      this.menuMessageState.set(`Light edit failed without changing the scene: ${errorMessage(error)}`);
      return false;
    }
  }

  private async readProjectText(path: string): Promise<{ readonly path: string; readonly text: string; readonly sha256: string }> {
    const normalizedPath = normalizeProjectFilePath(path);
    if (!this.projectFileConnectedState()) {
      throw new Error('project file server is not connected');
    }
    const response = await fetch(`${projectFileApiBase()}/api/host-files/file?path=${encodeURIComponent(normalizedPath)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json() as {
      readonly ok?: boolean;
      readonly path?: string;
      readonly text?: string;
      readonly sha256?: string;
      readonly diagnostic?: string;
    };
    if (
      payload.ok === false
      || typeof payload.path !== 'string'
      || typeof payload.text !== 'string'
      || typeof payload.sha256 !== 'string'
      || !isCanonicalProjectFileSha256(payload.sha256)
    ) {
      throw new Error(payload.diagnostic ?? 'invalid project file readback');
    }
    return { path: normalizeProjectFilePath(payload.path), text: payload.text, sha256: payload.sha256 };
  }

  private voxelConversionProposalForCommand(
    shell: StudioVoxelConversionWorkspaceShellReadModel,
    commandId: StudioVoxelConversionCommandId,
  ): StudioVoxelConversionProposalResult<unknown> {
    switch (commandId) {
      case 'voxel_conversion.plan':
        return shell.planProposal;
      case 'voxel_conversion.preview':
        return shell.previewProposal;
      case 'voxel_conversion.apply':
        return shell.applyProposal;
      case 'voxel_conversion.export_evidence':
        return shell.exportProposal;
    }
  }

  private recordVoxelConversionRuntimeResult(
    commandId: StudioVoxelConversionCommandId,
    label: string,
    proposalHash: string,
    outputSummary: string,
  ): void {
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId,
      label: `Voxel Conversion ${label}`,
      inputSummary: `proposal=${proposalHash};readout=${this.voxelConversionWorkspaceShell().workspace.readoutHash}`,
      outputSummary,
    });
    this.workspaceState.set(recorded.workspace);
    this.menuMessageState.set(outputSummary);
  }

  private applyCatalogOperation(
    commandId: 'catalog.link_asset' | 'catalog.update_asset' | 'catalog.remove_asset',
    operation: Parameters<typeof applyStudioCatalogAuthoringOperation>[1]['operation'],
  ): void {
    const catalog = this.catalogSourceState();
    const result = applyStudioCatalogAuthoringOperation(catalog, {
      actor: 'gui',
      expectedBaseHash: studioCatalogAuthoringBaseHash(catalog),
      operation,
    });
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId,
      label: commandId === 'catalog.link_asset'
        ? 'Link Catalog Asset'
        : commandId === 'catalog.update_asset'
          ? 'Update Catalog Asset'
          : 'Remove Catalog Asset',
      inputSummary: `operation=${operation.kind}`,
      outputSummary: result.ok
        ? `Catalog operation ${operation.kind} applied.`
        : result.diagnostics.at(0)?.message ?? 'Catalog operation rejected.',
      status: result.ok ? 'ok' : 'rejected',
    });
    this.workspaceState.set(recorded.workspace);
    if (!result.ok) {
      this.catalogWorkflowMessageState.set(result.diagnostics.at(0)?.message ?? 'Catalog operation rejected.');
      return;
    }
    this.catalogSourceState.set(result.catalog);
    if (operation.kind === 'create_catalog_entry') {
      this.selectedCatalogWorkflowAssetIdState.set(operation.entry.id);
    } else if (operation.kind === 'remove_catalog_entry') {
      this.selectedCatalogWorkflowAssetIdState.set(result.catalog.entries.at(0)?.id ?? null);
    }
    this.syncAssetInventoryFromCatalog(result.catalogHash);
    this.catalogWorkflowMessageState.set(`Catalog operation ${operation.kind} applied.`);
  }

  private syncAssetInventoryFromCatalog(catalogHash = studioCatalogAuthoringBaseHash(this.catalogSourceState())): void {
    this.assetInventoryState.set(
      inventoryFromCatalog(
        this.catalogSourceState(),
        this.catalogPathState(),
        catalogHash,
        demoReferencedRenderableIds(),
      ),
    );
  }

  private catalogAssetMatchesCategory(asset: StudioAssetInventoryEntryReadModel): boolean {
    const category = this.assetBrowserCategoryState();
    if (category === 'all') {
      return true;
    }
    if (category === 'static_meshes') {
      return asset.kind === 'static_mesh';
    }
    if (category === 'materials') {
      return asset.kind === 'material';
    }
    if (category === 'textures') {
      return asset.kind === 'texture';
    }
    return false;
  }
}

export const ASHA_STUDIO_VOXEL_WORKFLOW_GLOBAL = 'ashaStudioVoxelWorkflow' as const;

function createStudioVoxelWorkflowProductApi(store: StudioWorkspaceStore) {
  return Object.freeze({
    kind: 'asha.studio.voxel_workflow.v1' as const,
    version: 'studio-voxel-workflow.v1' as const,
    attachRuntimeSessionInspection: (...args: Parameters<StudioWorkspaceStore['attachRuntimeSessionInspection']>) =>
      store.attachRuntimeSessionInspection(...args),
    openWorkspaceAuthoring: (...args: Parameters<StudioWorkspaceStore['openWorkspaceAuthoring']>) =>
      store.openWorkspaceAuthoring(...args),
    workspaceAuthoringState: () => store.workspaceAuthoringState(),
    workspaceAuthoringProjection: () => store.workspaceAuthoringProjection(),
    workspaceAuthoringProjectionPerformance: () => store.workspaceAuthoringProjectionPerformance(),
    workspaceAuthoringMessage: () => store.workspaceAuthoringMessage(),
    workspaceAuthoringAvailable: () => store.workspaceAuthoringAvailable(),
    liveRuntimeAvailable: () => store.liveRuntimeAvailable(),
    runtimeConnectionMessage: () => store.runtimeConnectionMessage(),
    runtimeSessionInspection: () => store.runtimeSessionInspection(),
    runtimeViewportEvidence: () => store.runtimeViewportEvidence(),
    voxelConversionWorkspaceShell: () => store.voxelConversionWorkspaceShell(),
    voxelCompactEditControl: () => store.voxelCompactEditControl(),
    voxelCompactEditPlacement: () => store.voxelCompactEditPlacement(),
    voxelHistoryPanel: () => store.voxelHistoryPanel(),
    voxelAssetWorkflowControl: () => store.voxelAssetWorkflowControl(),
    voxelMaterialPaletteEditor: () => store.voxelMaterialPaletteEditor(),
    voxelAnnotationControl: () => store.voxelAnnotationControl(),
    runVoxelAssetWorkflowControl: (...args: Parameters<StudioWorkspaceStore['runVoxelAssetWorkflowControl']>) =>
      store.runVoxelAssetWorkflowControl(...args),
    createVoxelHouseTemplate: (...args: Parameters<StudioWorkspaceStore['createVoxelHouseTemplate']>) =>
      store.createVoxelHouseTemplate(...args),
    runAgentVoxelWorkflowOperation: (...args: Parameters<StudioWorkspaceStore['runAgentVoxelWorkflowOperation']>) =>
      store.runAgentVoxelWorkflowOperation(...args),
    runAgentVoxelOperationTranscriptReplay: (...args: Parameters<StudioWorkspaceStore['runAgentVoxelOperationTranscriptReplay']>) =>
      store.runAgentVoxelOperationTranscriptReplay(...args),
    runVoxelHistoryControl: (...args: Parameters<StudioWorkspaceStore['runVoxelHistoryControl']>) =>
      store.runVoxelHistoryControl(...args),
    selectVoxelHistoryTarget: (...args: Parameters<StudioWorkspaceStore['selectVoxelHistoryTarget']>) =>
      store.selectVoxelHistoryTarget(...args),
    selectViewportHit: (...args: Parameters<StudioWorkspaceStore['selectViewportHit']>) =>
      store.selectViewportHit(...args),
    applyViewportHitToVoxelCompactEditControl: (...args: Parameters<StudioWorkspaceStore['applyViewportHitToVoxelCompactEditControl']>) =>
      store.applyViewportHitToVoxelCompactEditControl(...args),
    applyRuntimeViewportCameraInput: (...args: Parameters<StudioWorkspaceStore['applyRuntimeViewportCameraInput']>) =>
      store.applyRuntimeViewportCameraInput(...args),
    selectRuntimeVoxelAtViewport: (...args: Parameters<StudioWorkspaceStore['selectRuntimeVoxelAtViewport']>) =>
      store.selectRuntimeVoxelAtViewport(...args),
    readRuntimeSceneObjectSnapshot: (...args: Parameters<StudioWorkspaceStore['readRuntimeSceneObjectSnapshot']>) =>
      store.readRuntimeSceneObjectSnapshot(...args),
    applyRuntimeSceneObjectCommand: (...args: Parameters<StudioWorkspaceStore['applyRuntimeSceneObjectCommand']>) =>
      store.applyRuntimeSceneObjectCommand(...args),
  });
}

export type StudioVoxelWorkflowProductApi = ReturnType<typeof createStudioVoxelWorkflowProductApi>;

type StudioVoxelWorkflowProductGlobal = typeof globalThis & {
  ashaStudioVoxelWorkflow?: StudioVoxelWorkflowProductApi;
};

function installStudioVoxelWorkflowProductApi(store: StudioWorkspaceStore): void {
  Object.defineProperty(globalThis as StudioVoxelWorkflowProductGlobal, ASHA_STUDIO_VOXEL_WORKFLOW_GLOBAL, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: createStudioVoxelWorkflowProductApi(store),
  });
}

interface StudioRuntimeSessionAttach {
  readonly facade: RuntimeSessionFacade;
  readonly bridge: NativeBrowserHostRuntimeBridge;
  readonly browserHost: StudioBrowserHostRuntimeEvidence;
}

interface StudioWorkspaceAuthoringAttach {
  readonly facade: WorkspaceAuthoringFacade;
  readonly bridge: NativeBrowserHostRuntimeBridge;
  readonly browserHost: StudioBrowserHostRuntimeEvidence;
}

async function createStudioRustRuntimeSessionFacade(): Promise<StudioRuntimeSessionAttach> {
  const resolved = await resolveStudioBrowserHostRuntimeBridge();
  return {
    facade: createRuntimeSessionFacade({ bridge: resolved.bridge, mode: 'rust' }),
    bridge: resolved.bridge,
    browserHost: resolved.browserHost,
  };
}

async function createStudioRustWorkspaceAuthoringFacade(): Promise<StudioWorkspaceAuthoringAttach> {
  const resolved = await resolveStudioBrowserHostRuntimeBridge();
  return {
    facade: createWorkspaceAuthoringFacade({ bridge: resolved.bridge }),
    bridge: resolved.bridge,
    browserHost: resolved.browserHost,
  };
}

export interface StudioBrowserHostRuntimeEvidence {
  readonly compatibilityVersion: typeof ASHA_BROWSER_HOST_COMPATIBILITY_VERSION;
  readonly lifecycleStatus: 'active';
  readonly providerGlobal: `globalThis.${typeof ASHA_BROWSER_HOST_PROVIDER_GLOBAL}`;
  readonly providerKind: typeof ASHA_BROWSER_HOST_PROVIDER_KIND;
  readonly sessionId: string;
}

export interface StudioBrowserHostRuntimeResolution {
  readonly bridge: NativeBrowserHostRuntimeBridge;
  readonly browserHost: StudioBrowserHostRuntimeEvidence;
}

interface StudioBrowserHostProviderEvidence {
  readonly browserHostCompatibilityVersion?: unknown;
  readonly browserHostSessionId?: unknown;
}

export async function resolveStudioBrowserHostRuntimeBridge(
  globalScope: NativeBrowserHostProviderScope = globalThis as unknown as NativeBrowserHostProviderScope,
): Promise<StudioBrowserHostRuntimeResolution> {
  const resolution = await resolveNativeRustRuntimeBridgeProvider({
    globalScope,
    providerGlobalNames: [ASHA_BROWSER_HOST_PROVIDER_GLOBAL],
    providerKinds: [ASHA_BROWSER_HOST_PROVIDER_KIND],
  });
  if (resolution.status !== 'available') {
    const diagnostic = resolution.diagnostics[0]?.message ?? 'native Rust RuntimeBridge provider unavailable';
    throw new RuntimeBridgeError(
      'native_unavailable',
      `Studio live RuntimeSession inspection requires globalThis.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL} from @asha/browser-host; ${diagnostic}`,
    );
  }
  const provider = globalScope[ASHA_BROWSER_HOST_PROVIDER_GLOBAL] as
    | (typeof resolution.provider & StudioBrowserHostProviderEvidence)
    | null
    | undefined;
  const sessionId = provider?.browserHostSessionId;
  if (provider?.browserHostCompatibilityVersion !== ASHA_BROWSER_HOST_COMPATIBILITY_VERSION
    || typeof sessionId !== 'string'
    || !/^[A-Za-z0-9_-]{32}$/u.test(sessionId)) {
    throw new RuntimeBridgeError(
      'invalid_input',
      `globalThis.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL} must carry ${ASHA_BROWSER_HOST_COMPATIBILITY_VERSION} browser Session evidence; legacy sidecar and partially composed providers are rejected.`,
    );
  }
  const bridge = resolution.bridge as NativeBrowserHostRuntimeBridge;
  const lifecycle = bridge.browserHostLifecycle;
  if (lifecycle?.compatibilityVersion !== ASHA_BROWSER_HOST_COMPATIBILITY_VERSION
    || lifecycle.sessionId !== sessionId
    || typeof lifecycle.status !== 'function'
    || typeof lifecycle.disconnect !== 'function'
    || lifecycle.status() !== 'active') {
    throw new RuntimeBridgeError(
      'invalid_input',
      `globalThis.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL} did not create an active ${ASHA_BROWSER_HOST_COMPATIBILITY_VERSION} client lifecycle.`,
    );
  }
  return {
    bridge,
    browserHost: {
      compatibilityVersion: ASHA_BROWSER_HOST_COMPATIBILITY_VERSION,
      lifecycleStatus: 'active',
      providerGlobal: `globalThis.${ASHA_BROWSER_HOST_PROVIDER_GLOBAL}`,
      providerKind: ASHA_BROWSER_HOST_PROVIDER_KIND,
      sessionId,
    },
  };
}

export function disconnectStudioBrowserHostRuntimeBridge(
  bridge: NativeBrowserHostRuntimeBridge,
): void {
  if (bridge.browserHostLifecycle.status() === 'active') {
    bridge.browserHostLifecycle.disconnect();
  }
}

function assertNativeRustRuntimeAuthority(
  facade: RuntimeSessionFacade,
  bridge: RuntimeBridge,
): void {
  const readout = facade.readEcrpRuntimeReadout();
  const snapshot = bridge.readFpsRuntimeSession();
  if (
    readout.authority.mode !== 'rust'
    || readout.authority.source !== 'rust_bridge'
    || snapshot.backend !== 'native_rust'
  ) {
    throw new RuntimeBridgeError(
      'invalid_input',
      `Studio rejected non-native RuntimeBridge provider: ECRP source=${readout.authority.source}, FPS backend=${snapshot.backend}`,
    );
  }
}
