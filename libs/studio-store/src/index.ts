import { computed, inject, Injectable, signal } from '@angular/core';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  addReferenceRenderableReadModel,
  attachStudioGameWorkspaceDevtools,
  buildStudioUiStateReadModel,
  applySceneObjectCommandReadModel,
  applySelectedEntityReadModel,
  buildAssetBrowserCategories,
  buildStudioPreferencesReadModel,
  buildStudioProofSceneList,
  buildStudioAshaDemoProductPathReadModel,
  buildStudioRuntimeSessionList,
  buildStudioCommandProposalPanel,
  buildStudioCatalogWorkflowReadModel,
  buildDefaultStudioFpsGameplayPresetDraft,
  buildStudioGameWorkspaceCommandProposalReadModel,
  buildStudioGameWorkspaceReadout,
  buildStudioRuntimeSessionInspectionReadModel,
  buildStudioSceneFileList,
  buildStudioSceneFileSaveReadback,
  buildStudioRunningProjectDiscovery,
  loadStudioAssetInventory,
  loadStudioPublishEvidence,
  buildStudioViewportReadout,
  buildInitialWorkspaceReadModel,
  buildStudioViewportAdapterReadModel,
  buildStudioViewportCameraReadModel,
  buildStudioViewportToolReadModel,
  clearStudioWorkspaceReadModel,
  createLoadReferenceAssetIntent,
  createLoadScenarioIntent,
  createOpenSceneFileIntent,
  createSaveSceneFileIntent,
  createSelectEntityIntent,
  createRenameSceneObjectRequest,
  createReparentSceneObjectRequest,
  createRotateSceneObjectRequest,
  createSceneObjectCommandIntent,
  createTranslateSceneObjectRequest,
  createStudioCompactAgentReadout,
  exportStudioWorkspaceCockpitEvidence,
  frameStudioViewportCamera,
  frameStudioViewportCameraOnRenderable,
  filterAssetBrowserRenderables,
  applyOpenSceneFileReadModel,
  applyStudioCatalogAuthoringOperation,
  loadScenarioReadModel,
  loadStudioGameWorkspaceManifest,
  orbitStudioViewportCamera,
  panStudioViewportCamera,
  refreshStudioGameWorkspaceLiveReadModel,
  recordStudioWorkspaceUiCommand,
  restoreStudioWorkspaceArtifact,
  serializeWorkspaceSceneSource,
  serializeStudioWorkspaceArtifact,
  setHierarchyExpansionReadModel,
  studioCatalogAuthoringBaseHash,
  updateStudioRenderSetting,
  zoomStudioViewportCamera,
  type StudioAssetBrowserCategory,
  type StudioApplicationMenu,
  type StudioBottomPanelTab,
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
  type StudioSceneFileListReadModel,
  type StudioSceneFileSourceInput,
  type StudioAssetInventoryEntryReadModel,
  type StudioAssetInventoryLoadResult,
  type StudioCatalogSourceEvidenceInput,
  type StudioCatalogWorkflowReadModel,
  type StudioProofSceneListLoadResult,
  type StudioPreferencesReadModel,
  type StudioRenderSettingsReadModel,
  type StudioRenderSettingKey,
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
  type CommandBatch,
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
  type VoxelConversionSourceRegistration,
  type VoxelConversionSourceRegistrationRequest,
  type VoxelConversionSourceRef,
  type VoxelConversionTargetRef,
  type VoxelAssetContentHashes,
  type VoxelAssetDiagnostic,
  type VoxelAssetMaterialBinding,
  type VoxelAssetProvenanceKind,
  type VoxelAssetSparseRun,
  type VoxelCoord,
  type VoxelVolumeAsset,
  type VoxelVolumeAssetExportReceipt,
  type VoxelVolumeAssetExportRequest,
  type VoxelVolumeAssetLoadReceipt,
  type VoxelVolumeAssetLoadRequest,
  type VoxelVolumeAssetSaveReceipt,
  type VoxelVolumeAssetSaveRequest,
  type VoxelVolumeAssetStoredDiff,
  type VoxelModelInfoReadout,
  type VoxelModelInfoRequest,
} from '@asha/contracts';
import type { AshaGameAssetCatalog, AshaGameAssetCatalogEntry, AshaGameAssetKind } from '@asha/game-workspace';
import {
  RuntimeBridgeError,
  createRuntimeSessionFacade,
  type CameraCreateRequest,
  type CombatFeedbackProjection,
  type EncounterDirectorReadout,
  type GeneratedTunnelReadout,
  type NavProjectionReadout,
  type RuntimeBridge,
  type RuntimeSessionAutonomousPolicyTickReadout,
  type RuntimeSessionEncounterTransitionReceipt,
  type RuntimeSessionFacade,
  type RuntimeSessionGeneratedTunnelOperationReceipt,
  type RuntimeSessionLifecycleRestartReceipt,
  type RuntimeSessionLifecycleStatusReadout,
  type RuntimeSessionCommandReceipt,
  type RuntimeSessionProjectionSummary,
  type RuntimeSessionStateSummary,
  type RuntimeSessionTelemetrySummary,
  type ProjectBundleLoadRequest,
} from '@asha/runtime-bridge';
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

const WORKSPACE_STORAGE_KEY = 'asha-studio.workspace.v1';

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
  targetProjectBundle: 'asha-demo',
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

export interface StudioProjectFileEntry {
  readonly path: string;
  readonly name: string;
  readonly kind: 'file' | 'directory';
  readonly size: number | null;
  readonly mtimeMs: number | null;
}

export interface StudioProjectFileDialogReadModel {
  readonly backend: 'project-server' | 'fallback';
  readonly connected: boolean;
  readonly projectRoot: string | null;
  readonly currentDir: string;
  readonly entries: readonly StudioProjectFileEntry[];
  readonly selectedPath: string | null;
  readonly message: string;
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
  readonly runtimeAttached: boolean;
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

export type StudioAgentVoxelWorkflowOperationKind =
  | 'inspect'
  | 'register_conversion_source'
  | 'register_conversion_mesh_asset'
  | 'configure_conversion'
  | 'run_conversion'
  | 'get_model_info'
  | 'export_voxel_volume_asset'
  | 'save_voxel_volume_asset'
  | 'load_voxel_volume_asset'
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

export type StudioAgentVoxelWorkflowOperation =
  | { readonly kind: 'inspect' }
  | { readonly kind: 'register_conversion_source'; readonly registration: VoxelConversionSourceRegistrationRequest }
  | { readonly kind: 'register_conversion_mesh_asset'; readonly registration: VoxelConversionMeshAssetRegistrationRequest }
  | { readonly kind: 'configure_conversion'; readonly patch: StudioAgentVoxelConversionSettingsPatch }
  | { readonly kind: 'run_conversion'; readonly commandId: StudioVoxelConversionCommandId }
  | { readonly kind: 'get_model_info'; readonly request: VoxelModelInfoRequest }
  | { readonly kind: 'export_voxel_volume_asset'; readonly exportRequest: VoxelVolumeAssetExportRequest }
  | { readonly kind: 'save_voxel_volume_asset'; readonly saveRequest: VoxelVolumeAssetSaveRequest }
  | { readonly kind: 'load_voxel_volume_asset'; readonly loadRequest: VoxelVolumeAssetLoadRequest }
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
    readonly runtimeAttached: boolean;
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
  readonly voxelEditReceipt?: RuntimeSessionCommandReceipt | null;
  readonly compiledVoxelEditBatch?: CommandBatch | null;
  readonly sourceRegistration?: VoxelConversionSourceRegistration | null;
  readonly modelInfo?: VoxelModelInfoReadout | null;
  readonly voxelVolumeExport?: StudioAgentVoxelVolumeExportReadModel | null;
  readonly voxelVolumeSave?: StudioAgentVoxelVolumeSaveReadModel | null;
  readonly voxelVolumeLoad?: StudioAgentVoxelVolumeLoadReadModel | null;
  readonly viewCapture?: StudioAgentVoxelViewCaptureReadModel | null;
  readonly previewPublication?: StudioAgentVoxelPreviewPublicationReadModel | null;
  readonly voxelAssetPersistence?: StudioAgentVoxelAssetPersistenceReadModel | null;
  readonly voxelAssetReopen?: StudioAgentVoxelAssetReopenReadModel | null;
}

export type StudioVoxelAssetWorkflowControlAction = 'model_info' | 'export_volume' | 'save_volume' | 'load_volume';

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

export interface StudioVoxelMaterialAuthoringRow {
  readonly source: 'conversion_map' | 'stored_asset_palette' | 'compact_edit_material';
  readonly voxelMaterial: number;
  readonly materialAssetId: string | null;
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
  readonly supportedFields: readonly [
    'conversion_material_map',
    'texture_sampling_readout',
    'voxel_asset_material_palette',
    'runtime_material_counts',
    'compact_material_index',
  ];
  readonly missingEngineFields: readonly [
    'material_catalog_binding_mutation',
    'named_voxel_palette_entries',
    'multi_material_compact_edit_controls',
  ];
  readonly canAuthorCatalogBindings: false;
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
allowed_source_writes = ["levels/presets", "levels/scenes", "assets", "catalogs/actors", "catalogs/gameplay", "catalogs/materials", "catalogs/spawns", "catalogs/weapons"]

[publish]
command = "npm run build"
artifact_dir = "dist"
verify_command = "npm run typecheck"

[dev_resource_profile]
local_roots = ["assets", "catalogs/actors", "catalogs/gameplay", "catalogs/materials", "catalogs/spawns", "catalogs/weapons"]
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
  'assets',
  'replays',
  'catalogs/actors',
  'catalogs/gameplay',
  'catalogs/materials',
  'catalogs/spawns',
  'catalogs/weapons',
]);

const DEMO_RUNTIME_PROJECT_BUNDLE: ProjectBundleLoadRequest = {
  bundleSchemaVersion: 1,
  protocolVersion: 1,
  sceneId: 4103,
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

const DEMO_PROOF_SCENES = [
  {
    path: 'scenes/material-proof.scene.json',
    schemaVersion: 1,
    sceneId: 1002,
    name: 'ASHA Demo Material Proof',
    description: 'Proof scene that references mesh, material, and texture catalog assets together.',
    catalogAssetIds: ['mesh.demo-cube', 'material.demo-copper', 'texture.demo-checker'],
    runtimeFixture: 'harness/conformance/fixtures/minimal-world.json',
  },
] as const;

const DEMO_MINIMAL_SCENE_SOURCE = {
  schemaVersion: 1,
  sceneId: 1001,
  name: 'ASHA Demo Minimal Cube',
  description: 'Minimal game-workflow scene that loads through the public ASHA runtime path.',
  catalogAssetIds: ['mesh.demo-cube'],
  runtimeFixture: 'harness/conformance/fixtures/minimal-world.json',
} as const;

function stableBrowserHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `sha256:browser-${hash.toString(16).padStart(8, '0')}`;
}

function demoSceneSource(path: string, scene: (typeof DEMO_PROOF_SCENES)[number]): StudioSceneFileSourceInput {
  const text = `${JSON.stringify({
    schemaVersion: scene.schemaVersion,
    sceneId: scene.sceneId,
    name: scene.name,
    description: scene.description,
    catalogAssetIds: scene.catalogAssetIds,
    runtimeFixture: scene.runtimeFixture,
  }, null, 2)}\n`;
  return {
    path,
    text,
    sha256: stableBrowserHash(text),
  };
}

const DEMO_SCENE_FILE_SOURCES: readonly StudioSceneFileSourceInput[] = [
  demoSceneSource('scenes/material-proof.scene.json', DEMO_PROOF_SCENES[0]),
  {
    path: 'scenes/minimal.scene.json',
    text: `${JSON.stringify(DEMO_MINIMAL_SCENE_SOURCE, null, 2)}\n`,
    sha256: stableBrowserHash(`${JSON.stringify(DEMO_MINIMAL_SCENE_SOURCE, null, 2)}\n`),
  },
];

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

function loadDemoProofScenes(
  workspace: StudioGameWorkspaceLoadResult,
  inventory: StudioAssetInventoryLoadResult,
): StudioProofSceneListLoadResult {
  if (!workspace.ok || !inventory.ok) {
    const fallbackWorkspace = workspace.ok ? workspace.workspace : null;
    const fallbackInventory = inventory.inventory;
    if (fallbackWorkspace !== null && fallbackInventory !== null) {
      return buildStudioProofSceneList({
        workspace: fallbackWorkspace,
        assetInventory: fallbackInventory,
        scenes: [],
        evidence: { proofSceneCommandStatus: 'missing' },
      });
    }
    return {
      ok: false,
      proofScenes: {
        proofSceneListVersion: 'studio-proof-scene-list.v0',
        sceneRoots: [],
        scenes: [],
        diagnostics: [
          {
            severity: 'error',
            code: 'proof_scene_missing',
            message: 'Proof scenes require a valid workspace and asset inventory.',
            source: null,
            remediation: null,
          },
        ],
        proofSceneListHash: 'studio-proof-scene-list-unavailable',
      },
      diagnostics: [
        {
          severity: 'error',
          code: 'proof_scene_missing',
          message: 'Proof scenes require a valid workspace and asset inventory.',
          source: null,
          remediation: null,
        },
      ],
    };
  }

  return buildStudioProofSceneList({
    workspace: workspace.workspace,
    assetInventory: inventory.inventory,
    scenes: DEMO_PROOF_SCENES,
    evidence: {
      proofSceneCommandStatus: 'passed',
      proofSceneCommand: '/usr/bin/node scripts/check-proof-scenes.mjs',
      assetInventoryArtifactPath: 'harness/out/asset-inventory/latest/index.json',
      assetInventoryArtifactHash: 'sha256:87d9ba8eb31307e0ded564e456f3721275e481fdbfeb29e6ec267ac7c64c3894',
    },
  });
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
  'configure_conversion',
  'run_conversion',
  'get_model_info',
  'export_voxel_volume_asset',
  'save_voxel_volume_asset',
  'load_voxel_volume_asset',
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

function stableAgentVoxelWorkflowHash(label: string, value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) >>> 0;
  }
  return `${label}-${hash.toString(16).padStart(8, '0')}`;
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
    materialAssetId: row.sourceMaterialId,
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
    materialAssetId: binding.materialAssetId,
    sourceMaterialSlot: null,
    sourceMaterialId: null,
    voxelCount: runtimeCounts.get(binding.voxelMaterial) ?? null,
    status: 'stored',
    message: `stored binding ${binding.voxelMaterial} -> ${binding.materialAssetId}`,
  }));

  const compactRow: StudioVoxelMaterialAuthoringRow = {
    source: 'compact_edit_material',
    voxelMaterial: options.compactEdit.material,
    materialAssetId: null,
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
      row.materialAssetId,
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
      'runtime_material_counts',
      'compact_material_index',
    ],
    missingEngineFields: [
      'material_catalog_binding_mutation',
      'named_voxel_palette_entries',
      'multi_material_compact_edit_controls',
    ],
    canAuthorCatalogBindings: false,
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

function voxelConversionSourceOptions(
  entries: readonly StudioAssetInventoryEntryReadModel[],
  selectedSourceAssetId: string | null,
): readonly StudioVoxelConversionSourceOption[] {
  return entries.map(entry => ({
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
}

function voxelConversionSourceRef(
  selectedSource: StudioAssetInventoryEntryReadModel | null,
  draft: StudioVoxelConversionSettingsDraft,
): VoxelConversionSourceRef | null {
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
  readonly sessionId: string;
  readonly expectedTimelineSequence: number;
  readonly runtimeSession: Partial<Pick<RuntimeSessionFacade, 'planVoxelConversion' | 'previewVoxelConversion' | 'applyVoxelConversion' | 'exportVoxelConversionEvidence'>> | null;
  readonly authorityState: StudioVoxelConversionAuthorityState;
}): StudioVoxelConversionWorkspaceShellReadModel {
  const workspace = buildStudioVoxelConversionWorkspaceReadModel({
    source: voxelConversionSourceRef(options.selectedSource, options.draft),
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
        'Asha runtime conversion operations are not available.',
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
        ? 'Submit plan proposal to the attached Asha runtime facade.'
        : readinessReason('voxel_conversion.plan'),
    },
    {
      commandId: 'voxel_conversion.preview',
      label: 'Preview',
      disabled: !proposalForAction('voxel_conversion.preview').accepted,
      accepted: proposalForAction('voxel_conversion.preview').accepted,
      reason: proposalForAction('voxel_conversion.preview').accepted
        ? 'Submit preview proposal to the attached Asha runtime facade.'
        : readinessReason('voxel_conversion.preview'),
    },
    {
      commandId: 'voxel_conversion.apply',
      label: 'Apply',
      disabled: !proposalForAction('voxel_conversion.apply').accepted,
      accepted: proposalForAction('voxel_conversion.apply').accepted,
      reason: proposalForAction('voxel_conversion.apply').accepted
        ? 'Submit guarded apply proposal to the attached Asha runtime facade.'
        : readinessReason('voxel_conversion.apply'),
    },
    {
      commandId: 'voxel_conversion.export_evidence',
      label: 'Export',
      disabled: !proposalForAction('voxel_conversion.export_evidence').accepted,
      accepted: proposalForAction('voxel_conversion.export_evidence').accepted,
      reason: proposalForAction('voxel_conversion.export_evidence').accepted
        ? 'Submit evidence export proposal to the attached Asha runtime facade.'
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
    runtimeAttached: options.runtimeSession !== null,
    shellHash: `${workspace.readoutHash}:${readout.readoutHash}:${planProposal.accepted}:${previewProposal.accepted}:${applyProposal.accepted}:${exportProposal.accepted}:${previewProjection.status}:${sourceMetadata.readoutHash}:${commandTimeline.length}:${evidenceRows.length}`,
  };
}

export function buildStudioVoxelConversionWorkspaceShellForInputs(options: {
  readonly draft: StudioVoxelConversionSettingsDraft;
  readonly sourceOptions?: readonly StudioVoxelConversionSourceOption[];
  readonly selectedSource: StudioAssetInventoryEntryReadModel | null;
  readonly sessionId: string;
  readonly expectedTimelineSequence: number;
  readonly runtimeSession?: Partial<Pick<RuntimeSessionFacade, 'planVoxelConversion' | 'previewVoxelConversion' | 'applyVoxelConversion' | 'exportVoxelConversionEvidence'>> | null;
  readonly authorityState?: StudioVoxelConversionAuthorityState;
}): StudioVoxelConversionWorkspaceShellReadModel {
  return buildVoxelConversionWorkspaceShellReadModel({
    draft: options.draft,
    sourceOptions: options.sourceOptions ?? [],
    selectedSource: options.selectedSource,
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
  return path
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function parentProjectDir(path: string): string {
  const normalized = normalizeProjectFilePath(path).replace(/\/$/, '');
  const slashIndex = normalized.lastIndexOf('/');
  return slashIndex <= 0 ? '' : normalized.slice(0, slashIndex);
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
  private readonly savedWorkspaceState = signal<string | null>(
    browserStorage()?.getItem(WORKSPACE_STORAGE_KEY) ?? null,
  );
  private readonly sceneFileSourcesState = signal<readonly StudioSceneFileSourceInput[]>(
    DEMO_SCENE_FILE_SOURCES,
  );
  private readonly activeSceneFilePathState = signal<string | null>(null);
  private readonly saveAsPathState = signal('scenes/studio-save-as.scene.json');
  private readonly projectFileEntriesState = signal<readonly StudioProjectFileEntry[]>([]);
  private readonly projectFileCurrentDirState = signal('');
  private readonly projectFileSelectedPathState = signal<string | null>(null);
  private readonly projectFileConnectedState = signal(false);
  private readonly projectFileRootState = signal<string | null>(null);
  private readonly projectFileMessageState = signal('Project file server not connected.');
  private readonly assetBrowserCategoryState = signal<StudioAssetBrowserCategory>('all');
  private readonly activeMenuState = signal<StudioApplicationMenu | null>(null);
  private readonly bottomPanelTabState = signal<StudioBottomPanelTab>('timeline');
  private readonly selectedScenarioDraftIdState = signal(this.workspaceState().session.scenarioId);
  private readonly hierarchyFilterState = signal('');
  private readonly viewportHitState = signal<StudioViewportHitReadModel | null>(null);
  private readonly menuMessageState = signal('Workspace ready.');
  private readonly gameWorkspaceState = signal<StudioGameWorkspaceLoadResult>(
    loadDemoGameWorkspace(),
  );
  private readonly runtimeAttachState = signal<StudioGameWorkspaceAttachReadModel | null>(null);
  private readonly runtimeLiveState = signal<StudioGameWorkspaceLiveReadModel | null>(null);
  private readonly runtimeSessionFacadeState = signal<RuntimeSessionFacade | null>(null);
  private readonly runtimeSessionStateSummaryState = signal<RuntimeSessionStateSummary | null>(null);
  private readonly runtimeSessionProjectionState = signal<RuntimeSessionProjectionSummary | null>(null);
  private readonly runtimeSessionTelemetryState = signal<RuntimeSessionTelemetrySummary | null>(null);
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
  private readonly proofScenesState = signal<StudioProofSceneListLoadResult>(
    loadDemoProofScenes(this.gameWorkspaceState(), this.assetInventoryState()),
  );
  private readonly voxelConversionDraftState = signal<StudioVoxelConversionSettingsDraft>(
    DEFAULT_VOXEL_CONVERSION_DRAFT,
  );
  private readonly voxelConversionAuthorityState = signal<StudioVoxelConversionAuthorityState>(
    EMPTY_VOXEL_CONVERSION_AUTHORITY_STATE,
  );
  private readonly voxelAssetWorkflowTargetDraftState = signal<StudioVoxelAssetWorkflowTargetDraft>(
    DEFAULT_VOXEL_ASSET_WORKFLOW_TARGET_DRAFT,
  );
  private readonly voxelAssetWorkflowControlState = signal<StudioVoxelAssetWorkflowControlReadModel>(
    DEFAULT_VOXEL_ASSET_WORKFLOW_CONTROL,
  );
  private readonly voxelCompactEditControlState = signal<StudioVoxelCompactEditControlReadModel>(
    DEFAULT_VOXEL_COMPACT_EDIT_CONTROL,
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
  readonly voxelCompactEditControl = this.voxelCompactEditControlState.asReadonly();
  readonly voxelCompactEditPlacement = computed<StudioVoxelCompactEditPlacementReadModel>(() =>
    buildStudioVoxelCompactEditPlacementReadModel(
      this.voxelCompactEditControlState(),
      this.viewportHitState(),
    ),
  );
  readonly voxelMaterialAuthoring = computed<StudioVoxelMaterialAuthoringReadModel>(() =>
    buildStudioVoxelMaterialAuthoringReadModel({
      shell: this.voxelConversionWorkspaceShell(),
      assetWorkflow: this.voxelAssetWorkflowControl(),
      compactEdit: this.voxelCompactEditControl(),
    }),
  );
  readonly savedWorkspace = this.savedWorkspaceState.asReadonly();
  readonly activeSceneFilePath = this.activeSceneFilePathState.asReadonly();
  readonly saveAsPath = this.saveAsPathState.asReadonly();
  readonly projectFileDialog = computed<StudioProjectFileDialogReadModel>(() => {
    const fallbackFiles = this.sceneFiles().files.map((file): StudioProjectFileEntry => ({
      path: file.path,
      name: file.path.split('/').at(-1) ?? file.path,
      kind: 'file',
      size: null,
      mtimeMs: null,
    }));
    return {
      backend: this.projectFileConnectedState() ? 'project-server' : 'fallback',
      connected: this.projectFileConnectedState(),
      projectRoot: this.projectFileRootState(),
      currentDir: this.projectFileCurrentDirState(),
      entries: this.projectFileConnectedState() ? this.projectFileEntriesState() : fallbackFiles,
      selectedPath: this.projectFileSelectedPathState(),
      message: this.projectFileMessageState(),
    };
  });
  readonly assetBrowserCategory = this.assetBrowserCategoryState.asReadonly();
  readonly activeMenu = this.activeMenuState.asReadonly();
  readonly bottomPanelTab = this.bottomPanelTabState.asReadonly();
  readonly selectedScenarioDraftId = this.selectedScenarioDraftIdState.asReadonly();
  readonly hierarchyFilter = this.hierarchyFilterState.asReadonly();
  readonly viewportHit = this.viewportHitState.asReadonly();
  readonly menuMessage = this.menuMessageState.asReadonly();
  readonly gameWorkspaceOverview = this.gameWorkspaceState.asReadonly();
  readonly runtimeConnectionMessage = this.runtimeConnectionMessageState.asReadonly();
  readonly catalogWorkflowMessage = this.catalogWorkflowMessageState.asReadonly();
  readonly assetInventory = this.assetInventoryState.asReadonly();
  readonly proofScenes = this.proofScenesState.asReadonly();
  readonly gameWorkspace = computed(() => {
    const overview = this.gameWorkspaceState();
    return overview.ok ? overview.workspace : null;
  });
  readonly sceneFiles = computed<StudioSceneFileListReadModel>(() => {
    const result = buildStudioSceneFileList({
      workspace: this.gameWorkspace(),
      manifestPath: 'asha.game.toml',
      manifestHash: this.gameWorkspace()?.workspaceHash ?? null,
      sourceFiles: this.sceneFileSourcesState(),
      allowProjectRoot: this.projectFileConnectedState(),
    });
    return result.sceneFiles;
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
    const sourceOptions = voxelConversionSourceOptions(assetEntries, draft.selectedSourceAssetId);
    const selectedSource = assetEntries.find(entry => entry.assetId === draft.selectedSourceAssetId) ?? null;
    return buildVoxelConversionWorkspaceShellReadModel({
      draft,
      sourceOptions,
      selectedSource,
      sessionId: this.workspaceState().session.sessionId,
      expectedTimelineSequence: this.workspaceState().timelineSequence + 1,
      runtimeSession: this.runtimeSessionFacadeState(),
      authorityState: this.voxelConversionAuthorityState(),
    });
  });

  agentVoxelWorkflowSurface(): StudioAgentVoxelWorkflowSurfaceReadModel {
    const inspection = this.runtimeSessionInspection();
    const shell = this.voxelConversionWorkspaceShell();
    const viewport = this.viewportAdapter();
    const body = {
      runtime: {
        attachState: inspection.attachState,
        sessionHash: inspection.sessionHash,
        acceptedCommandCount: inspection.commandSummary.acceptedCommandCount,
        rejectedCommandCount: inspection.commandSummary.rejectedCommandCount,
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
        runtimeAttached: this.runtimeSessionFacadeState() !== null,
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
        ...(this.runtimeSessionFacadeState() === null ? ['runtime_session_not_attached'] : []),
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
        const facade = this.runtimeSessionFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Attach RuntimeSession before registering voxel conversion sources.',
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
        const facade = this.runtimeSessionFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Attach RuntimeSession before registering project mesh assets for voxel conversion.',
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
      case 'configure_conversion': {
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
        const facade = this.runtimeSessionFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Attach RuntimeSession before reading voxel model info.',
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
      case 'export_voxel_volume_asset': {
        const facade = this.runtimeSessionFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Attach RuntimeSession before exporting a resident voxel volume asset.',
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
        const facade = this.runtimeSessionFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Attach RuntimeSession before requesting a voxel asset diff/save transaction.',
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
        const facade = this.runtimeSessionFacadeState();
        if (facade === null) {
          return {
            accepted: false,
            operation: operation.kind,
            diagnostic: 'Attach RuntimeSession before loading a voxel asset into runtime.',
            surface: this.agentVoxelWorkflowSurface(),
            voxelVolumeLoad: null,
          };
        }
        try {
          const receipt = facade.loadVoxelVolumeAsset(operation.loadRequest);
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
  readonly workspaceCockpitEvidence = computed(() => {
    const assetInventory = this.assetInventoryState().inventory;
    const proofScenes = this.proofScenesState().proofScenes;
    return exportStudioWorkspaceCockpitEvidence({
      studioWorkspace: this.workspaceState(),
      gameWorkspace: this.gameWorkspace(),
      assetInventory,
      proofScenes,
      runtimeSessions: this.runtimeSessions(),
      commandProposalPanel: this.commandProposalPanel(),
      publishEvidence: this.publishEvidence().publishEvidence,
      visiblePanelMarkers: [
        'studio-game-workspace-overview',
        'studio-assets-panel',
        'studio-proof-scene-panel',
        'studio-runtime-session-panel',
        'studio-command-proposal-panel',
        'studio-publish-evidence-panel',
      ],
    });
  });

  constructor() {
    const proofGlobal = globalThis as StudioNativeVoxelLaunchProofGlobal;
    if (proofGlobal.ashaStudioNativeVoxelLaunchProof?.enabled === true) {
      proofGlobal.ashaStudioNativeVoxelLaunchProof.store = this;
    }
    void this.refreshProjectFiles('');
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
      selectedScenarioDraftId: this.selectedScenarioDraftIdState(),
      hierarchyFilter: this.hierarchyFilterState(),
      menuMessage: this.menuMessageState(),
      savedWorkspaceAvailable: this.savedWorkspaceState() !== null,
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

    this.workspaceState.set(
      applySelectedEntityReadModel(workspace, dispatchResult.proposal.entityId),
    );
  }

  renameSceneObject(objectId: SceneObjectId, label: string): void {
    const workspace = this.workspaceState();
    const request = createRenameSceneObjectRequest(workspace, objectId, label);
    const dispatchResult = mapStudioIntentToCommand(createSceneObjectCommandIntent(workspace, request));
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.apply_object_command'
      || dispatchResult.proposal.request === undefined
    ) {
      return;
    }
    const applyResult = applySceneObjectCommandReadModel(workspace, dispatchResult.proposal.request);
    this.workspaceState.set(applyResult.workspace);
    this.menuMessageState.set(
      applyResult.ok ? `Renamed ${objectId}.` : applyResult.diagnostics.at(0)?.message ?? 'Rename rejected.',
    );
  }

  reparentSceneObject(objectId: SceneObjectId, parentObjectId: SceneObjectId | null, childOrder = 0): void {
    const workspace = this.workspaceState();
    const request = createReparentSceneObjectRequest(workspace, objectId, parentObjectId, childOrder);
    const dispatchResult = mapStudioIntentToCommand(createSceneObjectCommandIntent(workspace, request));
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.apply_object_command'
      || dispatchResult.proposal.request === undefined
    ) {
      return;
    }
    const applyResult = applySceneObjectCommandReadModel(workspace, dispatchResult.proposal.request);
    this.workspaceState.set(applyResult.workspace);
    this.menuMessageState.set(
      applyResult.ok ? `Reparented ${objectId}.` : applyResult.diagnostics.at(0)?.message ?? 'Reparent rejected.',
    );
  }

  translateSelectedSceneObject(delta: readonly [number, number, number]): void {
    const workspace = this.workspaceState();
    const objectId = workspace.selectedEntityId;
    if (objectId === null || !objectId.startsWith('scene-node:')) {
      this.menuMessageState.set('Select a scene object before moving it.');
      return;
    }
    const request = createTranslateSceneObjectRequest(workspace, objectId as SceneObjectId, delta);
    const dispatchResult = mapStudioIntentToCommand(createSceneObjectCommandIntent(workspace, request));
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.apply_object_command'
      || dispatchResult.proposal.request === undefined
    ) {
      return;
    }
    const applyResult = applySceneObjectCommandReadModel(workspace, dispatchResult.proposal.request);
    this.workspaceState.set(applyResult.workspace);
    this.menuMessageState.set(
      applyResult.ok ? `Moved ${objectId}.` : applyResult.diagnostics.at(0)?.message ?? 'Move rejected.',
    );
  }

  rotateSelectedSceneObject(rotation: readonly [number, number, number, number]): void {
    const workspace = this.workspaceState();
    const objectId = workspace.selectedEntityId;
    if (objectId === null || !objectId.startsWith('scene-node:')) {
      this.menuMessageState.set('Select a scene object before rotating it.');
      return;
    }
    const request = createRotateSceneObjectRequest(workspace, objectId as SceneObjectId, rotation);
    const dispatchResult = mapStudioIntentToCommand(createSceneObjectCommandIntent(workspace, request));
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.apply_object_command'
      || dispatchResult.proposal.request === undefined
    ) {
      return;
    }
    const applyResult = applySceneObjectCommandReadModel(workspace, dispatchResult.proposal.request);
    this.workspaceState.set(applyResult.workspace);
    this.menuMessageState.set(
      applyResult.ok ? `Rotated ${objectId}.` : applyResult.diagnostics.at(0)?.message ?? 'Rotate rejected.',
    );
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

  addReferenceRenderable(): void {
    const intent = createLoadReferenceAssetIntent(this.workspaceState());
    const dispatchResult = mapStudioIntentToCommand(intent);
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.load_asset'
      || dispatchResult.proposal.assetId !== 'static-mesh:reference-placeholder'
    ) {
      this.menuMessageState.set(dispatchResult.diagnostic ?? 'Reference asset load rejected.');
      return;
    }
    const workspace = addReferenceRenderableReadModel(this.workspaceState());
    this.workspaceState.set(workspace);
    this.viewportCameraState.set(
      frameStudioViewportCameraOnRenderable(workspace.scene, workspace.scene.selectedRenderableId),
    );
    this.menuMessageState.set('Reference placeholder added.');
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

  runVoxelAssetWorkflowControl(action: StudioVoxelAssetWorkflowControlAction): void {
    const target = this.voxelAssetWorkflowTargetForCurrentDraft();
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
      this.recordVoxelAssetWorkflowControlFromSave(target, modelInfoResult.modelInfo, saveResult);
      return;
    }

    const lastAsset = this.voxelAssetWorkflowControlState().lastAsset;
    if (lastAsset === null) {
      this.recordVoxelAssetWorkflowControl({
        action,
        accepted: false,
        target,
        message: 'Export or save a voxel asset before loading it into RuntimeSession.',
        residentModelId: modelInfoResult.modelInfo.modelId,
        volumeAssetId: target.volumeAssetId,
        voxelCount: modelInfoResult.modelInfo.voxelCount,
        materialSummary: materialCountsSummary(modelInfoResult.modelInfo.materialCounts),
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
        residentModelId: modelInfoResult.modelInfo.modelId,
        volumeAssetId: target.volumeAssetId,
        voxelCount: modelInfoResult.modelInfo.voxelCount,
        materialSummary: materialCountsSummary(modelInfoResult.modelInfo.materialCounts),
        canonicalJsonHash: lastAsset.contentHashes.canonicalJson,
        voxelDataHash: lastAsset.contentHashes.voxelData,
        validationDiagnosticCodes: [],
        lastAsset,
      });
      return;
    }

    const loadResult = this.runAgentVoxelWorkflowOperation({
      kind: 'load_voxel_volume_asset',
      loadRequest: {
        asset: lastAsset,
        targetGrid: target.grid,
        targetVolumeAssetId: target.volumeAssetId,
        replaceExisting: true,
        includeMaterialCounts: true,
      },
    });
    this.recordVoxelAssetWorkflowControlFromLoad(target, loadResult);
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
      targetAssetId: `voxel-volume/${assetName}`,
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
      maxSparseRuns: 64,
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
        ? `Saved ${saveReadout.assetId ?? target.targetAssetId} to ${saveReadout.assetPath}.`
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
  ): void {
    const loadReadout = result.voxelVolumeLoad ?? null;
    this.recordVoxelAssetWorkflowControl({
      action: 'load_volume',
      accepted: result.accepted,
      target,
      message: result.accepted && loadReadout !== null
        ? `Loaded ${loadReadout.requestAssetId} as ${loadReadout.modelId}.`
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

    const facade = this.runtimeSessionFacadeState();
    if (facade === null) {
      return {
        accepted: false,
        operation,
        diagnostic: 'Attach RuntimeSession before submitting voxel edits.',
        surface: this.agentVoxelWorkflowSurface(),
        voxelEditReceipt: null,
        compiledVoxelEditBatch: operation === 'submit_compact_voxel_edit' ? batch : null,
      };
    }

    try {
      const receipt = facade.submitCommands(batch);
      this.refreshRuntimeSessionInspectionReadout(facade);
      const status = receipt.result.rejected > 0 ? 'rejected' : 'ok';
      const summary = `Voxel edit accepted ${receipt.result.accepted}, rejected ${receipt.result.rejected}.`;
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'voxel_edit.submit',
        label: 'Agent Voxel Edit',
        inputSummary: `commands=${batch.commands.length};sequence=${receipt.sequenceId}`,
        outputSummary: summary,
        status,
      });
      this.workspaceState.set(recorded.workspace);
      this.menuMessageState.set(summary);
      return {
        accepted: receipt.result.rejected === 0 && receipt.result.accepted > 0,
        operation,
        diagnostic: receipt.result.rejected === 0 ? null : JSON.stringify(receipt.result.rejections),
        surface: this.agentVoxelWorkflowSurface(),
        voxelEditReceipt: receipt,
        compiledVoxelEditBatch: operation === 'submit_compact_voxel_edit' ? batch : null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voxel edit runtime command failed.';
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
    const facade = this.runtimeSessionFacadeState();
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
        outputSummary: proposal.diagnostics.at(0)?.message ?? 'Voxel conversion proposal rejected before runtime submission.',
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
      const message = error instanceof Error ? error.message : 'Voxel conversion runtime command failed.';
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

  setSelectedScenarioDraft(scenarioId: string): void {
    this.selectedScenarioDraftIdState.set(scenarioId);
  }

  async attachRuntimeSessionInspection(): Promise<void> {
    const workspace = this.gameWorkspace();
    if (workspace === null) {
      this.runtimeConnectionMessageState.set('Open a game workspace before attaching RuntimeSession.');
      return;
    }

    try {
      const attach = await createStudioRustRuntimeSessionFacade();
      const facade = attach.facade;
      const initialized = facade.initialize({
        sessionId: `runtime-session:${workspace.gameId}:studio-rust`,
        seed: 17,
        project: {
          gameId: workspace.gameId,
          workspaceId: workspace.workspaceHash,
        },
        projectBundle: DEMO_RUNTIME_PROJECT_BUNDLE,
      });
      assertNativeRustRuntimeAuthority(facade, attach.bridge);
      this.runtimeSessionFacadeState.set(facade);
      this.runtimeSessionStateSummaryState.set(initialized);
      this.runtimeSessionPausedState.set(false);
      this.playableLoopPolicyTickState.set(null);
      this.playableLoopRestartReceiptState.set(null);
      this.playableLoopEncounterTransitionReceiptState.set(null);
      this.playableLoopCombatFeedbackProjectionState.set(null);
      this.refreshRuntimeSessionInspectionReadout(facade);
      this.runtimeConnectionMessageState.set(`Rust RuntimeSession attached: ${initialized.sessionHash}.`);
      this.menuMessageState.set('Live Runtime Inspection attached through the public Rust backend.');
    } catch (error) {
      this.clearRuntimeSessionInspection();
      this.runtimeConnectionMessageState.set(
        error instanceof Error ? error.message : 'RuntimeSession attach failed.',
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
    if (facade === null) {
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
      this.runtimeConnectionMessageState.set(`Generated-level regenerate ${receipt.status}: ${receipt.reason}.`);
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
    this.runtimeSessionFacadeState.set(null);
    this.runtimeSessionStateSummaryState.set(null);
    this.runtimeSessionProjectionState.set(null);
    this.runtimeSessionTelemetryState.set(null);
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
    this.runtimeConnectionMessageState.set('Running project disconnected.');
    this.recordRuntimeConnectionCommand('project.disconnect_running', endpoint, 'Disconnected running project.');
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

  loadScenario(scenarioId: string): void {
    const intent = createLoadScenarioIntent(this.workspaceState(), scenarioId);
    const dispatchResult = mapStudioIntentToCommand(intent);
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'session.load_scenario'
      || dispatchResult.proposal.scenarioId === undefined
    ) {
      this.menuMessageState.set(dispatchResult.diagnostic ?? 'Scenario load rejected.');
      return;
    }
    const loadResult = loadScenarioReadModel(this.workspaceState(), scenarioId);
    if (!loadResult.ok) {
      this.menuMessageState.set(loadResult.diagnostics.at(0)?.message ?? 'Scenario load failed.');
      return;
    }

    this.workspaceState.set(loadResult.workspace);
    this.viewportHitState.set(null);
    this.viewportCameraState.set(frameStudioViewportCamera(loadResult.workspace.scene));
    this.viewportToolState.set(buildStudioViewportToolReadModel());
    this.assetBrowserCategoryState.set('all');
    this.selectedScenarioDraftIdState.set(scenarioId);
    this.menuMessageState.set(`Loaded ${loadResult.workspace.session.scenarioLabel}.`);
  }

  newWorkspace(): void {
    this.workspaceState.set(clearStudioWorkspaceReadModel(this.workspaceState()));
    this.activeSceneFilePathState.set(null);
    this.viewportHitState.set(null);
    this.viewportCameraState.set(buildStudioViewportCameraReadModel());
    this.viewportToolState.set(buildStudioViewportToolReadModel());
    this.menuMessageState.set('New scene created.');
  }

  openSceneFile(path: string): void {
    const sceneFile = this.sceneFiles().files.find(file => file.path === path);
    if (sceneFile === undefined) {
      this.menuMessageState.set(`Scene source not available: ${path}.`);
      return;
    }
    const source = this.sceneFileSourcesState().find(file => file.path === path);
    if (source === undefined || source.sha256 !== sceneFile.hash) {
      this.menuMessageState.set(`Scene source changed before open: ${path}.`);
      return;
    }
    const dispatchResult = mapStudioIntentToCommand(
      createOpenSceneFileIntent(this.workspaceState(), sceneFile),
    );
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== 'scene.open_source'
      || dispatchResult.proposal.path !== path
      || dispatchResult.proposal.expectedHash !== source.sha256
    ) {
      this.menuMessageState.set(dispatchResult.diagnostic ?? 'Scene open rejected.');
      return;
    }

    const workspace = applyOpenSceneFileReadModel(this.workspaceState(), sceneFile);
    this.workspaceState.set(workspace);
    this.activeSceneFilePathState.set(path);
    this.viewportHitState.set(null);
    this.viewportCameraState.set(frameStudioViewportCamera(workspace.scene));
    this.viewportToolState.set(buildStudioViewportToolReadModel());
    this.assetBrowserCategoryState.set('all');
    this.menuMessageState.set(`Opened ${sceneFile.name}.`);
  }

  async refreshProjectFiles(dir = this.projectFileCurrentDirState()): Promise<void> {
    const normalizedDir = normalizeProjectFilePath(dir);
    try {
      const response = await fetch(`${projectFileApiBase()}/api/project/list?dir=${encodeURIComponent(normalizedDir)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json() as {
        readonly projectRoot?: string;
        readonly dir?: string;
        readonly entries?: readonly StudioProjectFileEntry[];
      };
      this.projectFileConnectedState.set(true);
      this.projectFileRootState.set(payload.projectRoot ?? null);
      this.projectFileCurrentDirState.set(normalizeProjectFilePath(payload.dir ?? normalizedDir));
      this.projectFileEntriesState.set([...(payload.entries ?? [])].sort(projectFileEntrySort));
      this.projectFileMessageState.set('Project file server connected.');
    } catch {
      this.projectFileConnectedState.set(false);
      this.projectFileRootState.set(null);
      this.projectFileEntriesState.set([]);
      this.projectFileMessageState.set('Using fallback scene list. Start the project file server for full project-root open/save.');
    }
  }

  selectProjectFile(path: string): void {
    const normalizedPath = normalizeProjectFilePath(path);
    const entry = this.projectFileDialog().entries.find(item => item.path === normalizedPath);
    if (entry?.kind === 'directory') {
      void this.refreshProjectFiles(entry.path);
      return;
    }
    this.projectFileSelectedPathState.set(normalizedPath);
    this.saveAsPathState.set(normalizedPath);
  }

  openProjectParentDir(): void {
    void this.refreshProjectFiles(parentProjectDir(this.projectFileCurrentDirState()));
  }

  openSelectedProjectFile(): void {
    const path = this.projectFileSelectedPathState();
    if (path === null) {
      this.menuMessageState.set('Select a scene file to open.');
      return;
    }
    void this.openSceneFileFromProject(path);
  }

  private async openSceneFileFromProject(path: string): Promise<void> {
    if (!this.projectFileConnectedState()) {
      this.openSceneFile(path);
      return;
    }
    const normalizedPath = normalizeProjectFilePath(path);
    try {
      const response = await fetch(`${projectFileApiBase()}/api/project/file?path=${encodeURIComponent(normalizedPath)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json() as {
        readonly ok?: boolean;
        readonly path: string;
        readonly text: string;
        readonly sha256: string;
      };
      if (payload.ok === false || typeof payload.text !== 'string' || typeof payload.sha256 !== 'string') {
        throw new Error('invalid project file readback');
      }
      const nextSource: StudioSceneFileSourceInput = {
        path: normalizeProjectFilePath(payload.path),
        text: payload.text,
        sha256: payload.sha256,
      };
      this.sceneFileSourcesState.set([
        ...this.sceneFileSourcesState().filter(file => file.path !== nextSource.path),
        nextSource,
      ].sort((left, right) => left.path.localeCompare(right.path)));
      this.openSceneFile(nextSource.path);
      this.projectFileSelectedPathState.set(nextSource.path);
    } catch {
      this.menuMessageState.set(`Could not open ${normalizedPath} from the project file server.`);
    }
  }

  saveSceneFile(): void {
    const path = this.activeSceneFilePathState();
    if (path === null) {
      this.saveSceneFileAs(this.saveAsPathState());
      return;
    }
    void this.writeSceneFile(path, false);
  }

  saveSceneFileAs(path = this.saveAsPathState()): void {
    this.saveAsPathState.set(path);
    void this.writeSceneFile(path, true);
  }

  setSaveAsPath(path: string): void {
    const normalizedPath = normalizeProjectFilePath(path);
    this.saveAsPathState.set(normalizedPath);
    this.projectFileSelectedPathState.set(normalizedPath);
  }

  saveWorkspaceToSlot(): void {
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: 'workspace.save_browser_slot',
      label: 'Save Workspace Slot',
      inputSummary: `sceneHash=${this.workspaceState().scene.sceneHash}`,
      outputSummary: 'Workspace artifact saved to browser slot.',
    });
    this.workspaceState.set(recorded.workspace);
    const artifactText = serializeStudioWorkspaceArtifact({
      workspace: recorded.workspace,
      viewportCamera: this.viewportCameraState(),
      viewportTool: this.viewportToolState(),
      preferences: this.preferencesStore.preferences(),
      savedAtIso: new Date().toISOString(),
    });
    this.savedWorkspaceState.set(artifactText);
    browserStorage()?.setItem(WORKSPACE_STORAGE_KEY, artifactText);
    this.menuMessageState.set('Workspace saved to browser slot.');
  }

  private async writeSceneFile(path: string, saveAs: boolean): Promise<void> {
    const normalizedPath = normalizeProjectFilePath(path);
    const previous = this.sceneFileSourcesState().find(file => file.path === normalizedPath) ?? null;
    const expectedPreviousHash = saveAs ? null : previous?.sha256 ?? null;
    const dispatchResult = mapStudioIntentToCommand(
      createSaveSceneFileIntent(this.workspaceState(), {
        path: normalizedPath,
        expectedPreviousHash,
        saveAs,
      }),
    );
    const expectedCommandId = saveAs ? 'scene.save_source_as' : 'scene.save_source';
    if (
      !dispatchResult.accepted
      || dispatchResult.proposal?.commandId !== expectedCommandId
      || dispatchResult.proposal.path !== normalizedPath
    ) {
      this.menuMessageState.set(dispatchResult.diagnostic ?? 'Scene save rejected.');
      return;
    }

    const nextText = serializeWorkspaceSceneSource(this.workspaceState());
    const nextHash = stableBrowserHash(nextText);
    const saveReadback = buildStudioSceneFileSaveReadback({
      commandId: expectedCommandId,
      path: normalizedPath,
      previousHash: previous?.sha256 ?? null,
      expectedPreviousHash,
      nextText,
      nextHash,
      workspace: this.gameWorkspace(),
      allowProjectRoot: this.projectFileConnectedState(),
    });
    const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
      commandId: expectedCommandId,
      label: saveAs ? 'Save Scene Source As' : 'Save Scene Source',
      inputSummary: `path=${normalizedPath};previousHash=${previous?.sha256 ?? 'none'}`,
      outputSummary: saveReadback.diagnostics.length === 0
        ? `Scene source ${normalizedPath} saved.`
        : saveReadback.diagnostics.at(0)?.message ?? 'Scene save failed.',
      status: saveReadback.diagnostics.length === 0 ? 'ok' : 'rejected',
    });
    this.workspaceState.set(recorded.workspace);
    if (saveReadback.diagnostics.length > 0) {
      this.menuMessageState.set(saveReadback.diagnostics.at(0)?.message ?? 'Scene save failed.');
      return;
    }

    let persistedHash = nextHash;
    if (this.projectFileConnectedState()) {
      try {
        const response = await fetch(`${projectFileApiBase()}/api/project/file`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            path: normalizedPath,
            text: nextText,
            expectedHash: expectedPreviousHash,
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json() as { readonly ok?: boolean; readonly sha256?: string; readonly diagnostic?: string };
        if (payload.ok === false) {
          throw new Error(payload.diagnostic ?? 'project file write rejected');
        }
        persistedHash = payload.sha256 ?? nextHash;
        await this.refreshProjectFiles(parentProjectDir(normalizedPath));
      } catch {
        this.menuMessageState.set(`Could not write ${normalizedPath} through the project file server.`);
        return;
      }
    }

    const nextSource = { path: normalizedPath, text: nextText, sha256: persistedHash };
    this.sceneFileSourcesState.set([
      ...this.sceneFileSourcesState().filter(file => file.path !== normalizedPath),
      nextSource,
    ].sort((left, right) => left.path.localeCompare(right.path)));
    this.activeSceneFilePathState.set(normalizedPath);
    this.projectFileSelectedPathState.set(normalizedPath);
    this.menuMessageState.set(saveAs ? `Saved scene as ${normalizedPath}.` : `Saved scene ${normalizedPath}.`);
  }

  loadWorkspaceFromSlot(): void {
    const artifactText =
      this.savedWorkspaceState() ?? browserStorage()?.getItem(WORKSPACE_STORAGE_KEY) ?? null;
    if (artifactText === null) {
      this.menuMessageState.set('No saved workspace slot found.');
      return;
    }

    const restoreResult = restoreStudioWorkspaceArtifact(artifactText);
    if (!restoreResult.ok || restoreResult.artifact === null) {
      const recorded = recordStudioWorkspaceUiCommand(this.workspaceState(), {
        commandId: 'workspace.load_browser_slot',
        label: 'Load Workspace Slot',
        inputSummary: 'source=browser-slot',
        outputSummary: restoreResult.diagnostics.at(0)?.message ?? 'Workspace load failed.',
        status: 'rejected',
      });
      this.workspaceState.set(recorded.workspace);
      this.menuMessageState.set(restoreResult.diagnostics.at(0)?.message ?? 'Workspace load failed.');
      return;
    }

    const recorded = recordStudioWorkspaceUiCommand(restoreResult.artifact.workspace, {
      commandId: 'workspace.load_browser_slot',
      label: 'Load Workspace Slot',
      inputSummary: 'source=browser-slot',
      outputSummary: 'Workspace artifact restored from browser slot.',
    });
    this.workspaceState.set(recorded.workspace);
    this.viewportCameraState.set(restoreResult.artifact.viewportCamera);
    this.viewportToolState.set(restoreResult.artifact.viewportTool);
    this.preferencesStore.setPreferences(restoreResult.artifact.preferences);
    this.selectedScenarioDraftIdState.set(restoreResult.artifact.workspace.session.scenarioId);
    this.menuMessageState.set('Workspace loaded from browser slot.');
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

  private async readProjectText(path: string): Promise<{ readonly path: string; readonly text: string; readonly sha256: string }> {
    const normalizedPath = normalizeProjectFilePath(path);
    if (!this.projectFileConnectedState()) {
      throw new Error('project file server is not connected');
    }
    const response = await fetch(`${projectFileApiBase()}/api/project/file?path=${encodeURIComponent(normalizedPath)}`);
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
    if (payload.ok === false || typeof payload.path !== 'string' || typeof payload.text !== 'string' || typeof payload.sha256 !== 'string') {
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

interface StudioNativeRustRuntimeBridgeProvider {
  readonly kind: 'asha_studio.native_runtime_bridge_provider.v1';
  readonly backend: 'native_rust';
  readonly productAuthority: true;
  readonly referenceFallback: false;
  readonly bridge?: RuntimeBridge | Promise<RuntimeBridge>;
  createRuntimeBridge?: () => RuntimeBridge | Promise<RuntimeBridge>;
}

type StudioRuntimeBridgeProvider = StudioNativeRustRuntimeBridgeProvider;

type StudioRuntimeBridgeGlobal = typeof globalThis & {
  readonly ashaStudioRuntimeBridge?: StudioRuntimeBridgeProvider;
  readonly ashaRuntimeBridge?: StudioRuntimeBridgeProvider;
};

type StudioNativeVoxelLaunchProofGlobal = typeof globalThis & {
  ashaStudioNativeVoxelLaunchProof?: {
    readonly enabled?: boolean;
    store?: StudioWorkspaceStore;
  };
};

interface StudioRuntimeSessionAttach {
  readonly facade: RuntimeSessionFacade;
  readonly bridge: RuntimeBridge;
}

async function createStudioRustRuntimeSessionFacade(): Promise<StudioRuntimeSessionAttach> {
  const bridge = await readInjectedStudioRuntimeBridge();
  if (bridge === null) {
    throw new RuntimeBridgeError(
      'native_unavailable',
      'Studio live RuntimeSession inspection requires globalThis.ashaStudioRuntimeBridge with asha_studio.native_runtime_bridge_provider.v1 native_rust authority metadata; reference/mock RuntimeSession is not used for live attach.',
    );
  }
  return {
    facade: createRuntimeSessionFacade({ bridge, mode: 'rust' }),
    bridge,
  };
}

async function readInjectedStudioRuntimeBridge(): Promise<RuntimeBridge | null> {
  const runtimeGlobal = globalThis as StudioRuntimeBridgeGlobal;
  const provider = runtimeGlobal.ashaStudioRuntimeBridge ?? runtimeGlobal.ashaRuntimeBridge ?? null;
  if (provider === null) {
    return null;
  }
  if (!isNativeRustRuntimeBridgeProvider(provider)) {
    throw new RuntimeBridgeError(
      'invalid_input',
      'globalThis.ashaStudioRuntimeBridge must be an asha_studio.native_runtime_bridge_provider.v1 provider with native_rust authority metadata; raw RuntimeBridge/reference providers are rejected.',
    );
  }

  const candidate = readRuntimeBridgeProviderValue(provider);
  const bridge = await candidate;
  if (isRuntimeBridge(bridge)) {
    return bridge;
  }
  throw new RuntimeBridgeError(
    'invalid_input',
    'globalThis.ashaStudioRuntimeBridge must provide the public RuntimeBridge interface',
  );
}

function readRuntimeBridgeProviderValue(
  provider: StudioRuntimeBridgeProvider,
): RuntimeBridge | Promise<RuntimeBridge> {
  if (typeof provider.createRuntimeBridge === 'function') {
    return provider.createRuntimeBridge();
  }
  if (provider.bridge !== undefined) {
    return provider.bridge;
  }
  throw new RuntimeBridgeError(
    'invalid_input',
    'globalThis.ashaStudioRuntimeBridge native provider must expose bridge or createRuntimeBridge',
  );
}

function isNativeRustRuntimeBridgeProvider(value: unknown): value is StudioNativeRustRuntimeBridgeProvider {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<StudioNativeRustRuntimeBridgeProvider>;
  return candidate.kind === 'asha_studio.native_runtime_bridge_provider.v1'
    && candidate.backend === 'native_rust'
    && candidate.productAuthority === true
    && candidate.referenceFallback === false;
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

function isRuntimeBridge(value: unknown): value is RuntimeBridge {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<Record<string, unknown>>;
  return typeof candidate.initializeEngine === 'function'
    && typeof candidate.loadProjectBundle === 'function'
    && typeof candidate.getProjectBundleCompositionStatus === 'function'
    && typeof candidate.loadFpsRuntimeSession === 'function'
    && typeof candidate.readFpsRuntimeSession === 'function'
    && typeof candidate.applyFpsPrimaryFire === 'function'
    && typeof candidate.restartFpsRuntimeSession === 'function';
}
