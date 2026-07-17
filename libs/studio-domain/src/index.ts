import {
  sceneId,
  sceneNodeId,
  type CommandBatch,
  type CommandResult,
  type FlatSceneDocument,
  type RenderFrameDiff,
  type SceneNodeId,
  type SceneObjectCommandRejection,
  type SceneObjectCommandRequest,
  type SceneObjectCommandResult,
  type SceneObjectSnapshot as ContractSceneObjectSnapshot,
  type SceneTransform,
} from '@asha/contracts';
import {
  ASHA_DEVTOOLS_PROTOCOL_VERSION,
  type DevtoolsAttachClientMessage,
  type DevtoolsAttachServerMessage,
  type DevtoolsCompatibilityMetadata,
  type DevtoolsProjectedStateSummary,
  type DevtoolsRuntimeIdentity,
  type DevtoolsTelemetrySample,
} from '@asha/devtools';
import {
  buildSceneObjectSnapshot,
  type SceneObjectId,
  type SceneObjectSnapshot as EditorSceneObjectSnapshot,
} from '@asha/editor-tools';
import {
  ASHA_GAME_WORKSPACE_COMPATIBILITY,
  buildAshaAuthoringPersistenceContract,
  parseAshaGameManifestToml,
  resolveAshaAuthoringWriteTarget,
  validateAshaGameAssetCatalog,
  validateAshaConsumerCompatibility,
  type AshaGameAssetCatalog,
  type AshaGameAssetCatalogEntry,
  type AshaGameAssetKind,
  type AshaGameManifest,
  type AshaGameRuntimeBackendMode,
} from '@asha/game-workspace';
import {
  readDefaultFpsGameplayPreset,
  readFpsGameplayPresetCatalog,
  validateFpsGameplayPreset,
  type FpsGameplayPreset,
  type FpsGameplayPresetCatalogReadout,
  type FpsGameplayPresetReadout,
  type FpsGameplayPresetValidationReport,
} from '@asha/catalog-core';
import type {
  CombatFeedbackProjection,
  EncounterDirectorReadout,
  GeneratedTunnelReadout,
  NavProjectionReadout,
  RuntimeSessionAutonomousPolicyTickReadout,
  RuntimeSessionEncounterTransitionReceipt,
  RuntimeSessionGeneratedTunnelOperationReceipt,
  RuntimeSessionLifecycleRestartReceipt,
  RuntimeSessionLifecycleStatusReadout,
  RuntimeSessionProjectionSummary,
  RuntimeSessionStateSummary,
  RuntimeSessionTelemetrySummary,
} from '@asha/runtime-session';
import type { StudioLightingMode } from './studio-lighting.js';
import { ASHA_STUDIO_PROJECT_SETTINGS_PATH } from './studio-settings.js';

export * from './studio-lighting.js';
export * from './studio-settings.js';

export type StudioActorKind = 'gui' | 'agent' | 'script';
export type StudioWorkspaceStatus = 'not_started' | 'ready' | 'degraded';
export type StudioCommandStatus = 'ok' | 'rejected' | 'failed';
export type StudioMode = 'definition_authoring' | 'live_runtime_inspection';
export type StudioEntitySourceState = 'authoritative' | 'reference' | 'pending';
export type StudioRenderableKind = 'voxel_grid' | 'voxel_cell' | 'static_mesh' | 'preview_ghost';
export type StudioEntityKind =
  | StudioRenderableKind
  | 'empty_group'
  | 'sprite'
  | 'session'
  | 'scene'
  | 'collection';
export type StudioDiagnosticSeverity = 'info' | 'warning' | 'error';
export type StudioSceneCoordinateSystemStatus =
  | 'right_handed_y_up'
  | 'legacy_z_up'
  | 'unverified';
export type StudioViewportHitFace = 'x_min' | 'x_max' | 'y_min' | 'y_max' | 'z_min' | 'z_max';

export const STUDIO_SCENE_Y_UP_TAG = 'asha-studio:coordinate-system:right-handed-y-up.v1';
export const STUDIO_SCENE_LEGACY_Z_UP_TAG = 'asha-studio:coordinate-system:right-handed-z-up.v0';

export interface StudioSceneCoordinateSystemAssessment {
  readonly status: StudioSceneCoordinateSystemStatus;
  readonly message: string;
}

/**
 * Classify persisted scene coordinates without rewriting them. ASHA scenes are
 * canonical right-handed Y-up; the Studio marker records that the authoring UI
 * used the same convention. Unmarked documents remain byte-for-byte unchanged
 * and are surfaced as unverified instead of being silently rotated.
 */
export function assessStudioSceneCoordinateSystem(
  document: FlatSceneDocument,
): StudioSceneCoordinateSystemAssessment {
  const tags = document.nodes.flatMap(node => node.tags);
  if (tags.includes(STUDIO_SCENE_LEGACY_Z_UP_TAG)) {
    return {
      status: 'legacy_z_up',
      message: 'This scene declares the legacy Studio Z-up convention. Convert it explicitly to right-handed Y-up before opening; Studio did not alter the file.',
    };
  }
  if (tags.includes(STUDIO_SCENE_Y_UP_TAG)) {
    return {
      status: 'right_handed_y_up',
      message: 'Scene coordinates are confirmed right-handed Y-up.',
    };
  }
  return {
    status: 'unverified',
    message: 'This scene has no Studio coordinate marker. It was opened as canonical ASHA right-handed Y-up without transforming its stored coordinates.',
  };
}
export type StudioEntityBadge =
  | 'authority-backed'
  | 'preview-only'
  | 'projected'
  | 'reference'
  | 'selected';
export type StudioEntityProjectionDiagnosticCode =
  | 'hierarchy_readback_drift'
  | 'missing_selected_entity'
  | 'missing_selection_command'
  | 'selection_sync_mismatch'
  | 'stale_entity_list'
  | 'unsupported_private_entity_source';
export type StudioViewportToolMode =
  | 'select'
  | 'orbit'
  | 'pan'
  | 'move_object'
  | 'rotate_object'
  | 'scale_object'
  | 'frame';
export type StudioAssetBrowserCategory =
  | 'all'
  | 'static_meshes'
  | 'materials'
  | 'textures'
  | 'generated'
  | 'preview';
export type StudioBottomPanelTab =
  | 'timeline'
  | 'assets'
  | 'catalog'
  | 'commands';
export type StudioCommandProposalActionId = 'set_voxel_reference';
export type StudioApplicationMenu =
  | 'file'
  | 'edit'
  | 'scene'
  | 'view'
  | 'project'
  | 'runtime'
  | 'voxel'
  | 'preferences';
export type StudioRenderSettingKey =
  | 'wireframeEnabled'
  | 'showGrid'
  | 'showPreviewGhosts'
  | 'showReadbackOverlay'
  | 'showRaycastHitDebug';
export type StudioUiEventCommandId =
  | 'workspace.save_project_artifact'
  | 'workspace.load_project_artifact'
  | 'preferences.set_render_setting'
  | 'catalog.create_source'
  | 'catalog.load_source'
  | 'catalog.save_source'
  | 'catalog.link_asset'
  | 'catalog.update_asset'
  | 'catalog.remove_asset'
  | 'catalog.validate_source'
  | 'project.refresh_sessions'
  | 'project.connect_running'
  | 'project.disconnect_running'
  | 'voxel_conversion.import_mesh_source'
  | 'voxel_asset.export_volume'
  | 'voxel_asset.save_volume'
  | 'voxel_asset.load_volume'
  | 'voxel_asset.unload_volume'
  | 'voxel_asset.initialize_authoring_volume'
  | 'voxel_edit.submit'
  | 'voxel_history.read'
  | 'voxel_history.preview_revert'
  | 'voxel_history.apply_revert'
  | 'voxel_history.undo'
  | 'voxel_history.redo'
  | 'voxel_conversion.plan'
  | 'voxel_conversion.preview'
  | 'voxel_conversion.apply'
  | 'voxel_conversion.export_evidence';

export interface StudioDiagnostic {
  readonly severity: StudioDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly source: string | null;
  readonly remediation: string | null;
}

export type StudioGameWorkspaceDiagnosticCode =
  | 'manifest_invalid'
  | 'compatibility_invalid'
  | 'missing_workspace_root'
  | 'missing_command'
  | 'invalid_attach_endpoint';
export type StudioGameWorkspaceAttachDiagnosticCode =
  | 'attach_protocol_mismatch'
  | 'attach_rejected'
  | 'attach_unexpected_response'
  | 'attach_runtime_identity_mismatch'
  | 'attach_compatibility_mismatch';
export type StudioGameWorkspaceLiveDiagnosticCode =
  | 'live_attach_workspace_mismatch'
  | 'live_projection_unavailable'
  | 'live_render_diff_unavailable'
  | 'live_telemetry_unavailable';
export type StudioGameWorkspaceCommandDiagnosticCode =
  | 'command_attach_workspace_mismatch'
  | 'command_unexpected_response'
  | 'command_sequence_mismatch'
  | 'command_runtime_rejected';
export type StudioRuntimeSessionDiagnosticCode =
  | 'runtime_session_attach_mismatch'
  | 'runtime_session_live_mismatch'
  | 'runtime_session_inspection_unavailable'
  | 'runtime_session_backend_incompatible';
export type StudioRunningProjectDiscoveryDiagnosticCode =
  | 'running_project_missing_workspace'
  | 'running_project_missing_endpoint'
  | 'running_project_not_attached'
  | 'running_project_incompatible'
  | 'running_project_stale_live_readback'
  | 'running_project_private_transport';
export type StudioAssetInventoryDiagnosticCode =
  | 'asset_inventory_artifact_mismatch'
  | 'asset_inventory_missing_entry'
  | 'asset_inventory_missing_resolution'
  | 'asset_inventory_dependency_mismatch'
  | 'asset_inventory_diagnostic';
export type StudioWorkspaceOpenReadDiagnosticCode =
  | 'missing_manifest'
  | 'workspace_source_path_escape'
  | 'private_repo_scan'
  | 'unsupported_file_kind'
  | 'workspace_source_not_allowed';
export type StudioSceneAuthoringDiagnosticCode =
  | 'stale_scene_source_hash'
  | 'duplicate_scene_object'
  | 'missing_scene_object'
  | 'missing_scene_object_parent'
  | 'blank_scene_object_label'
  | 'invalid_scene_object_transform'
  | 'runtime_authority_not_allowed'
  | 'unsupported_scene_authoring_field';
export type StudioCatalogAuthoringDiagnosticCode =
  | 'stale_catalog_source_hash'
  | 'duplicate_catalog_asset_id'
  | 'missing_catalog_asset_id'
  | 'unsupported_catalog_asset_kind'
  | 'invalid_catalog_asset_source'
  | 'invalid_catalog_asset_metadata'
  | 'missing_catalog_dependency'
  | 'unsupported_catalog_authoring_field';
export type StudioCatalogWorkflowDiagnosticCode =
  | 'catalog_workflow_missing_workspace'
  | 'catalog_workflow_path_not_allowed'
  | 'catalog_workflow_invalid_schema'
  | 'catalog_workflow_missing_entry'
  | 'catalog_workflow_source_missing'
  | 'catalog_workflow_source_hash_mismatch'
  | 'catalog_workflow_validation_diagnostic';
export interface StudioGameWorkspaceReadModel {
  readonly workspaceVersion: 'studio-game-workspace.v0';
  readonly workspaceRoot: string;
  readonly manifestPath: string;
  readonly gameId: string;
  readonly manifest: AshaGameManifest;
  readonly sceneRoots: readonly string[];
  readonly assetRoots: readonly string[];
  readonly catalogPackages: readonly string[];
  readonly policyPackages: readonly string[];
  readonly attachEndpoint: string;
  readonly devCommand: string;
  readonly runtimeEntry: string;
  readonly publishCommand: string;
  readonly publishVerifyCommand: string;
  readonly allowedSourceWrites: readonly string[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly workspaceHash: string;
}

export type StudioGameWorkspaceLoadResult =
  | {
      readonly ok: true;
      readonly workspace: StudioGameWorkspaceReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioGameWorkspaceLoadInput {
  readonly workspaceRoot: string;
  readonly manifestPath: string;
  readonly gameId: string;
  readonly manifestText: string;
  readonly packageScripts: Readonly<Record<string, string>>;
  readonly pathExists: (relativePath: string) => boolean;
}

export interface StudioGameWorkspaceReadout {
  readonly readoutVersion: 'studio-game-workspace-readout.v0';
  readonly commandIds: {
    readonly openWorkspace: 'workspace.open_game_manifest';
    readonly validateManifest: 'workspace.validate_game_manifest';
  };
  readonly gameId: string;
  readonly workspaceRoot: string;
  readonly manifestPath: string;
  readonly compatibility: {
    readonly engineVersion: string;
    readonly contractsVersion: string;
    readonly runtimeBridgeVersion: string;
    readonly devtoolsProtocolVersion: string;
  };
  readonly sceneRoots: readonly string[];
  readonly assetRoots: readonly string[];
  readonly catalogPackages: readonly string[];
  readonly policyPackages: readonly string[];
  readonly attachEndpoint: string;
  readonly devCommand: string;
  readonly runtimeEntry: string;
  readonly runtimeBackend: {
    readonly backendMode: AshaGameRuntimeBackendMode;
    readonly backendProfile: string;
  };
  readonly publishCommand: string;
  readonly publishVerifyCommand: string;
  readonly devResourceProfile: AshaGameManifest['devResourceProfile'];
  readonly publishResourceProfile: AshaGameManifest['publishResourceProfile'];
  readonly workspaceHash: string;
  readonly diagnostics: readonly StudioDiagnostic[];
}

export type StudioWorkspaceSourceSchemaKind = 'asset-catalog-json.v1';

export interface StudioWorkspaceSourceFileInput {
  readonly path: string;
  readonly text: string;
  readonly sha256: string;
}

export interface StudioWorkspaceSourceFileReadModel {
  readonly sourceVersion: 'studio-workspace-source-file.v0';
  readonly path: string;
  readonly hash: string;
  readonly schemaKind: StudioWorkspaceSourceSchemaKind;
  readonly operationKind: 'authoring.catalog.save_source';
  readonly allowedRoot: string;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly sourceHash: string;
}

export interface StudioWorkspaceOpenReadModel {
  readonly openReadVersion: 'studio-workspace-open-read.v0';
  readonly workspaceHash: string;
  readonly workspaceRoot: string;
  readonly manifestPath: string;
  readonly manifestHash: string;
  readonly studioMode: Extract<StudioMode, 'definition_authoring'>;
  readonly runtimeSessionState: 'not_attached';
  readonly authoringPersistenceVersion: 'authoring-persistence.v0';
  readonly allowedCatalogRoots: readonly string[];
  readonly sourceFiles: readonly StudioWorkspaceSourceFileReadModel[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_repo_crawler',
    'not_private_asset_database',
    'not_source_write',
    'not_runtime_authority',
  ];
  readonly openReadHash: string;
}

export type StudioWorkspaceOpenReadResult =
  | {
      readonly ok: true;
      readonly openRead: StudioWorkspaceOpenReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly openRead: StudioWorkspaceOpenReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export type StudioSceneAuthoringOperationKind =
  | 'create_scene_object'
  | 'update_scene_object'
  | 'delete_scene_object';

export type StudioSceneAuthoringOperation =
  | {
      readonly kind: 'create_scene_object';
      readonly record: FlatSceneDocument['nodes'][number];
    }
  | {
      readonly kind: 'update_scene_object';
      readonly objectId: SceneObjectId;
      readonly patch: {
        readonly label?: string | null;
        readonly parentObjectId?: SceneObjectId | null;
        readonly transform?: SceneTransform;
      };
    }
  | {
      readonly kind: 'delete_scene_object';
      readonly objectId: SceneObjectId;
    };

export interface StudioSceneAuthoringOperationRequest {
  readonly operation: StudioSceneAuthoringOperation;
  readonly expectedBaseHash: string;
  readonly actor: StudioActorKind;
}

export interface StudioSceneAuthoringOperationReadModel {
  readonly operationVersion: 'studio-scene-authoring-operation.v0';
  readonly operationKind: StudioSceneAuthoringOperationKind;
  readonly expectedBaseHash: string;
  readonly actualBaseHash: string;
  readonly actor: StudioActorKind;
  readonly operation: StudioSceneAuthoringOperation;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_ui_mutation',
    'not_source_write_until_save_operation',
  ];
  readonly operationHash: string;
}

export type StudioSceneAuthoringOperationResult =
  | {
      readonly ok: true;
      readonly operation: StudioSceneAuthoringOperationReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly operation: StudioSceneAuthoringOperationReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export type StudioCatalogAuthoringOperationKind =
  | 'create_catalog_entry'
  | 'update_catalog_entry'
  | 'remove_catalog_entry';

export type StudioCatalogAuthoringOperation =
  | {
      readonly kind: 'create_catalog_entry';
      readonly entry: AshaGameAssetCatalogEntry;
    }
  | {
      readonly kind: 'update_catalog_entry';
      readonly assetId: string;
      readonly patch: {
        readonly source?: string;
        readonly importProfile?: string | null;
        readonly importMetadata?: AshaGameAssetCatalogEntry['importMetadata'];
        readonly dependencies?: readonly string[];
        readonly publish?: AshaGameAssetCatalogEntry['publish'];
        readonly diagnostics?: AshaGameAssetCatalogEntry['diagnostics'];
      };
    }
  | {
      readonly kind: 'remove_catalog_entry';
      readonly assetId: string;
    };

export interface StudioCatalogAuthoringOperationRequest {
  readonly operation: StudioCatalogAuthoringOperation;
  readonly expectedBaseHash: string;
  readonly actor: StudioActorKind;
}

export interface StudioCatalogAuthoringOperationReadModel {
  readonly operationVersion: 'studio-catalog-authoring-operation.v0';
  readonly operationKind: StudioCatalogAuthoringOperationKind;
  readonly expectedBaseHash: string;
  readonly actualBaseHash: string;
  readonly actor: StudioActorKind;
  readonly operation: StudioCatalogAuthoringOperation;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_private_asset_database',
    'not_source_write_until_save_operation',
    'not_runtime_authority',
  ];
  readonly operationHash: string;
}

export type StudioCatalogAuthoringOperationResult =
  | {
      readonly ok: true;
      readonly operation: StudioCatalogAuthoringOperationReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly operation: StudioCatalogAuthoringOperationReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export type StudioCatalogAuthoringApplyResult =
  | {
      readonly ok: true;
      readonly catalog: AshaGameAssetCatalog;
      readonly operation: StudioCatalogAuthoringOperationReadModel;
      readonly diagnostics: readonly [];
      readonly catalogHash: string;
    }
  | {
      readonly ok: false;
      readonly catalog: AshaGameAssetCatalog;
      readonly operation: StudioCatalogAuthoringOperationReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
      readonly catalogHash: string;
    };

export interface StudioCatalogSourceEvidenceInput {
  readonly path: string;
  readonly exists: boolean;
  readonly hash: string | null;
}

export interface StudioCatalogAssetPreviewReadModel {
  readonly assetId: string;
  readonly kind: AshaGameAssetKind;
  readonly sourcePath: string;
  readonly sourceExists: boolean;
  readonly sourceHash: string | null;
  readonly expectedSourceHash: string | null;
  readonly sourceHashMatches: boolean | null;
  readonly dependencies: readonly string[];
  readonly dependencyStatus: 'none' | 'resolved' | 'missing';
  readonly missingDependencies: readonly string[];
  readonly publishOutputKey: string | null;
  readonly referencedRenderableIds: readonly string[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly previewHash: string;
}

export interface StudioCatalogWorkflowReadModel {
  readonly workflowVersion: 'studio-catalog-workflow.v0';
  readonly catalogPath: string;
  readonly catalogHash: string;
  readonly entryCount: number;
  readonly selectedAssetId: string | null;
  readonly selectedAsset: StudioCatalogAssetPreviewReadModel | null;
  readonly assets: readonly StudioCatalogAssetPreviewReadModel[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly commandIds: {
    readonly create: 'catalog.create_source';
    readonly load: 'catalog.load_source';
    readonly save: 'catalog.save_source';
    readonly linkAsset: 'catalog.link_asset';
    readonly updateAsset: 'catalog.update_asset';
    readonly removeAsset: 'catalog.remove_asset';
    readonly validate: 'catalog.validate_source';
  };
  readonly previewStrategy: {
    readonly now: readonly [
      'metadata',
      'dependency_status',
      'source_hash',
      'referenced_renderables',
    ];
    readonly deferred: readonly [
      'mesh_preview',
      'material_preview',
      'texture_preview',
      'runtime_loaded_preview',
    ];
  };
  readonly nonClaims: readonly [
    'not_mesh_material_texture_preview',
    'not_private_asset_database',
    'not_runtime_authority',
    'not_publish_builder',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ];
  readonly workflowHash: string;
}

export interface StudioDevtoolsAttachTransport {
  readonly exchange: (
    message: DevtoolsAttachClientMessage,
  ) => DevtoolsAttachServerMessage | Promise<DevtoolsAttachServerMessage>;
}

export interface StudioGameWorkspaceAttachReadModel {
  readonly attachVersion: 'studio-game-workspace-attach.v0';
  readonly status: 'attached';
  readonly endpoint: string;
  readonly workspaceHash: string;
  readonly handshakeRequest: Extract<DevtoolsAttachClientMessage, { readonly type: 'handshake.request' }>;
  readonly compatibility: DevtoolsCompatibilityMetadata;
  readonly runtime: DevtoolsRuntimeIdentity;
  readonly runtimeBackendEvidence: StudioRuntimeBackendEvidence;
  readonly attachHash: string;
  readonly diagnostics: readonly [];
}

export type StudioGameWorkspaceAttachResult =
  | {
      readonly ok: true;
      readonly attach: StudioGameWorkspaceAttachReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioGameWorkspaceLiveReadModel {
  readonly liveVersion: 'studio-game-workspace-live.v0';
  readonly endpoint: string;
  readonly workspaceHash: string;
  readonly attachHash: string;
  readonly projection: DevtoolsProjectedStateSummary;
  readonly projectionDiagnostics: readonly string[];
  readonly renderDiff: RenderFrameDiff;
  readonly renderDiffHash: string;
  readonly telemetry: readonly DevtoolsTelemetrySample[];
  readonly liveHash: string;
  readonly diagnostics: readonly [];
}

export type StudioGameWorkspaceLiveResult =
  | {
      readonly ok: true;
      readonly live: StudioGameWorkspaceLiveReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioGameWorkspaceCommandProposalReadModel {
  readonly proposalVersion: 'studio-game-workspace-command.v0';
  readonly endpoint: string;
  readonly workspaceHash: string;
  readonly attachHash: string;
  readonly sequenceId: string;
  readonly backendMode: AshaGameRuntimeBackendMode | null;
  readonly batch: CommandBatch;
  readonly status: 'accepted' | 'rejected';
  readonly result: CommandResult;
  readonly authorityHashBefore: string | null;
  readonly authorityHashAfter: string | null;
  readonly rejectionReason: 'authority_rejected' | 'compatibility_mismatch' | 'runtime_unavailable' | null;
  readonly proposalHash: string;
  readonly diagnostics: readonly StudioDiagnostic[];
}

export interface StudioCommandProposalActionReadModel {
  readonly actionVersion: 'studio-command-proposal-action.v0';
  readonly actionId: StudioCommandProposalActionId;
  readonly label: string;
  readonly commandMessageType: 'command.propose';
  readonly commandOperation: string;
  readonly runtimeSessionId: string;
  readonly endpoint: string;
  readonly batch: CommandBatch;
  readonly available: boolean;
  readonly evidenceRefs: readonly StudioAssetInventoryEvidenceRef[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly actionHash: string;
}

export interface StudioCommandProposalPanelReadModel {
  readonly panelVersion: 'studio-command-proposal-panel.v0';
  readonly runtimeSessionId: string;
  readonly workspaceHash: string;
  readonly actions: readonly StudioCommandProposalActionReadModel[];
  readonly proposals: readonly StudioGameWorkspaceCommandProposalReadModel[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'does_not_mutate_without_devtools_acceptance',
    'not_native_runtime_authority',
    'not_freeform_json_method_call',
  ];
  readonly panelHash: string;
}

export type StudioGameWorkspaceCommandProposalResult =
  | {
      readonly ok: true;
      readonly proposal: StudioGameWorkspaceCommandProposalReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export type StudioRuntimeSessionType = 'preview' | 'attached';
export type StudioRuntimeSessionStatus = 'available' | 'attached' | 'degraded';
export type StudioRuntimeBackendCompatibilityState =
  | 'compatible'
  | 'pending_attach'
  | 'incompatible';

export interface StudioRuntimeBackendEvidence {
  readonly source: 'devtools.handshake.runtime';
  readonly backendMode: AshaGameRuntimeBackendMode | null;
  readonly backendProfile: string | null;
  readonly launcherName: string | null;
  readonly runtimeProfileId: string | null;
  readonly nonClaims: readonly string[];
}

export interface StudioRuntimeSessionReadModel {
  readonly runtimeSessionVersion: 'studio-runtime-session.v0';
  readonly sessionId: string;
  readonly sessionType: StudioRuntimeSessionType;
  readonly status: StudioRuntimeSessionStatus;
  readonly endpoint: string | null;
  readonly profileId: string;
  readonly runtimeMode: 'reference' | 'native' | 'wasm' | 'mock' | 'degraded';
  readonly backendMode: AshaGameRuntimeBackendMode;
  readonly backendProfile: string;
  readonly backendCompatibilityState: StudioRuntimeBackendCompatibilityState;
  readonly attachStatus: 'not_attached' | 'attached';
  readonly workspaceHash: string;
  readonly attachHash: string | null;
  readonly liveHash: string | null;
  readonly compatibility: {
    readonly contractsVersion: string;
    readonly runtimeBridgeVersion: string;
    readonly devtoolsProtocolVersion: string;
    readonly publishArtifactVersion: string;
  };
  readonly projection: {
    readonly runtimeSessionSummaryHash: string;
    readonly renderDiffHash: string;
    readonly entityCount: number;
    readonly tick: number;
  } | null;
  readonly evidenceRefs: readonly StudioAssetInventoryEvidenceRef[];
  readonly nonClaims: readonly string[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly sessionHash: string;
}

export interface StudioRuntimeSessionListReadModel {
  readonly runtimeSessionListVersion: 'studio-runtime-session-list.v0';
  readonly sessions: readonly StudioRuntimeSessionReadModel[];
  readonly activeSessionId: string;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly sessionListHash: string;
}

export interface StudioFpsGameplayPresetDraft {
  readonly displayName: string;
  readonly moveSpeedUnitsPerSecond: number;
  readonly lookSensitivityDegreesPerPixel: number;
  readonly weaponDamage: number;
  readonly weaponAmmo: number;
  readonly enemyCount: number;
  readonly desiredRangeUnits: number;
}

export type StudioFpsGameplayPresetDraftField = keyof StudioFpsGameplayPresetDraft;

export interface StudioFpsGameplayPresetFieldReadModel {
  readonly field: StudioFpsGameplayPresetDraftField;
  readonly label: string;
  readonly value: string;
  readonly inputKind: 'text' | 'number';
  readonly editable: boolean;
  readonly validationStatus: 'valid' | 'invalid';
  readonly validationMessage: string | null;
}

export interface StudioPlayableLoopDefinitionAuthoringReadModel {
  readonly authoringVersion: 'studio-playable-loop-definition-authoring.v0';
  readonly studioMode: Extract<StudioMode, 'definition_authoring'>;
  readonly presetReadoutKind: FpsGameplayPresetReadout['kind'];
  readonly catalogReadoutKind: FpsGameplayPresetCatalogReadout['kind'];
  readonly presetId: string;
  readonly catalogId: string;
  readonly defaultPresetId: string;
  readonly displayName: string;
  readonly source: {
    readonly projectId: string;
    readonly presetPath: string;
    readonly catalogPath: string;
    readonly fixturePath: string;
  };
  readonly fields: readonly StudioFpsGameplayPresetFieldReadModel[];
  readonly validation: {
    readonly kind: FpsGameplayPresetValidationReport['kind'];
    readonly status: 'valid' | 'invalid';
    readonly diagnosticCount: number;
    readonly diagnostics: readonly StudioDiagnostic[];
  };
  readonly hashes: {
    readonly presetHash: string | null;
    readonly tuningHash: string | null;
    readonly referenceHash: string | null;
    readonly catalogHash: string;
    readonly rejectedHash: string | null;
  };
  readonly tuningSummary: {
    readonly playerController: string;
    readonly weapon: string;
    readonly enemyBehavior: string;
    readonly encounter: string;
    readonly generator: string;
  };
  readonly ownership: {
    readonly gameOwned: readonly string[];
    readonly engineOwned: readonly string[];
  };
  readonly migration: FpsGameplayPresetReadout['migration'];
  readonly boundary: {
    readonly storedPresetEditing: true;
    readonly validatesThroughPublicSchema: true;
    readonly liveRuntimeMutation: false;
    readonly runtimeToDefinitionExport: false;
  };
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_arbitrary_json_catalog',
    'not_runtime_to_definition_export',
    'not_live_runtime_mutation_from_authoring',
  ];
}

export interface StudioPlayableLoopLiveRuntimeInspectionReadModel {
  readonly liveVersion: 'studio-playable-loop-live-runtime.v0';
  readonly studioMode: Extract<StudioMode, 'definition_authoring' | 'live_runtime_inspection'>;
  readonly attachState: StudioRuntimeSessionInspectionReadModel['attachState'];
  readonly encounter: {
    readonly kind: EncounterDirectorReadout['kind'] | null;
    readonly presetId: string | null;
    readonly status: string | null;
    readonly revision: number | null;
    readonly lastTransition: string | null;
    readonly activeEnemyCount: number | null;
    readonly pendingEnemyCount: number | null;
    readonly defeatedEnemyCount: number | null;
    readonly spawnedEnemyCount: number | null;
    readonly configHash: string | null;
    readonly spawnOrderHash: string | null;
    readonly encounterHash: string | null;
    readonly replayHash: string | null;
    readonly spawns: readonly {
      readonly instanceId: string;
      readonly runtimeEntityId: number;
      readonly status: string;
      readonly markerId: string;
      readonly world: readonly [number, number, number];
      readonly capabilities: readonly string[];
    }[];
    readonly lastReceipt: {
      readonly action: string;
      readonly status: string;
      readonly accepted: boolean;
      readonly rejectionReason: string | null;
      readonly beforeStatus: string;
      readonly afterStatus: string;
      readonly eventKind: string | null;
      readonly transitionHash: string;
    } | null;
  };
  readonly combatFeedback: {
    readonly kind: CombatFeedbackProjection['kind'] | null;
    readonly scenario: string | null;
    readonly traceResult: string | null;
    readonly markerTone: string | null;
    readonly markerLabel: string | null;
    readonly notificationTexts: readonly string[];
    readonly hudStatusTexts: readonly string[];
    readonly ammo: number | null;
    readonly cooldownTicksRemaining: number | null;
    readonly projectionHash: string | null;
    readonly healthHash: string | null;
  };
  readonly lifecycle: {
    readonly outcomeKind: string | null;
    readonly label: string | null;
    readonly terminal: boolean;
    readonly playerHealth: string | null;
    readonly enemyHealth: string | null;
    readonly lifecycleHash: string | null;
  };
  readonly policy: {
    readonly loopId: string | null;
    readonly tickHash: string | null;
    readonly acceptedProposalCount: number | null;
    readonly unsupportedProposalCount: number | null;
  };
  readonly restart: {
    readonly lastReceiptStatus: string | null;
    readonly statusBefore: string | null;
    readonly statusAfter: string | null;
    readonly resetHash: string | null;
  };
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_transport',
    'not_demo_local_spawn_state',
    'not_combat_authority',
  ];
}

export interface StudioPlayableLoopTuningInspectionReadModel {
  readonly inspectionVersion: 'studio-playable-loop-tuning-inspection.v0';
  readonly definitionAuthoring: StudioPlayableLoopDefinitionAuthoringReadModel;
  readonly liveInspection: StudioPlayableLoopLiveRuntimeInspectionReadModel;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_transport',
    'not_local_gameplay_logic',
    'not_runtime_to_definition_export',
  ];
  readonly inspectionHash: string;
}

export interface StudioPlayableLoopInspectionReadModel {
  readonly loopVersion: 'studio-playable-loop-inspection.v0';
  readonly studioMode: StudioMode;
  readonly attachState: 'not_attached' | 'attached' | 'unavailable';
  readonly session: {
    readonly sessionId: string | null;
    readonly seed: number | null;
    readonly tick: number | null;
    readonly sessionHash: string | null;
    readonly replayHash: string | null;
    readonly replayRecordCount: number;
    readonly lastRecordKind: string | null;
  };
  readonly generatedLevel: {
    readonly presetId: string | null;
    readonly configHash: string | null;
    readonly outputHash: string | null;
    readonly navProjectionHash: string | null;
  };
  readonly selectedEntity: {
    readonly entityId: string;
    readonly label: string;
    readonly pose: {
      readonly position: readonly [number, number, number] | null;
      readonly nextWaypoint: readonly [number, number, number] | null;
    };
    readonly health: {
      readonly current: number;
      readonly max: number;
      readonly dead: boolean;
      readonly healthHash: string;
    } | null;
    readonly capabilitySummary: readonly string[];
  } | null;
  readonly policy: {
    readonly status: 'not_run' | 'ran' | 'unavailable';
    readonly loopId: string | null;
    readonly tick: number | null;
    readonly fixtureKind: string | null;
    readonly proposalHash: string | null;
    readonly proposalKinds: readonly string[];
    readonly sourceChecked: boolean;
    readonly sourceDiagnosticCount: number;
    readonly acceptedProposalCount: number | null;
    readonly rejectedProposalCount: number | null;
    readonly unsupportedProposalCount: number | null;
    readonly movementStatus: string | null;
    readonly movementReason: string | null;
    readonly tickHash: string | null;
  };
  readonly nav: {
    readonly available: boolean;
    readonly projectionHash: string | null;
    readonly pathHash: string | null;
    readonly outcome: string | null;
    readonly visited: number | null;
    readonly pathLength: number | null;
  };
  readonly combat: {
    readonly status: string | null;
    readonly outcomeKind: string | null;
    readonly healthHash: string | null;
    readonly replayHash: string | null;
  };
  readonly lifecycle: {
    readonly kind: string | null;
    readonly scenario: string | null;
    readonly outcomeKind: string | null;
    readonly label: string | null;
    readonly terminal: boolean;
    readonly playerHealth: string | null;
    readonly enemyHealth: string | null;
    readonly lifecycleHash: string | null;
    readonly eventKinds: readonly string[];
  };
  readonly restart: {
    readonly commandId: 'runtime.restart_session_intent';
    readonly available: boolean;
    readonly disabledReason: string | null;
    readonly lastReceipt: {
      readonly status: 'accepted' | 'rejected';
      readonly accepted: boolean;
      readonly source: string;
      readonly rejectionReason: string | null;
      readonly statusBefore: string;
      readonly statusAfter: string;
      readonly resetHash: string;
    } | null;
  };
  readonly controls: {
    readonly policyTick: {
      readonly available: boolean;
      readonly disabledReason: string | null;
    };
    readonly restart: {
      readonly available: boolean;
      readonly disabledReason: string | null;
    };
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_transport',
    'not_policy_runtime',
    'not_ui_authority',
  ];
  readonly inspectionHash: string;
}

export interface StudioRuntimeSessionInspectionReadModel {
  readonly inspectionVersion: 'studio-runtime-session-inspection.v0';
  readonly studioMode: StudioMode;
  readonly attachState: 'not_attached' | 'attached' | 'unavailable';
  readonly sessionStatus: 'not_attached' | 'running' | 'paused' | 'unavailable';
  readonly sessionId: string | null;
  readonly workspaceHash: string;
  readonly tick: number | null;
  readonly sessionHash: string | null;
  readonly projectionHash: string | null;
  readonly replay: {
    readonly recordCount: number;
    readonly lastRecordKind: string | null;
    readonly recordHashes: readonly string[];
  };
  readonly commandSummary: {
    readonly acceptedCommandCount: number | null;
    readonly rejectedCommandCount: number | null;
  };
  readonly projectionSummary: {
    readonly renderDiffCount: number | null;
    readonly entityCount: number;
    readonly selectedEntity: {
      readonly entityId: string;
      readonly label: string;
      readonly kind: StudioEntityKind;
      readonly sourceState: StudioEntitySourceState;
      readonly capabilitySummary: readonly string[];
    } | null;
  };
  readonly generatedLevel: StudioGeneratedLevelInspectionReadModel;
  readonly playableLoopTuning: StudioPlayableLoopTuningInspectionReadModel;
  readonly playableLoop: StudioPlayableLoopInspectionReadModel;
  readonly controls: {
    readonly pause: {
      readonly available: false;
      readonly disabledReason: 'runtime_session_pause_not_public';
    };
    readonly tick: {
      readonly available: boolean;
      readonly disabledReason: string | null;
    };
    readonly restart: {
      readonly available: boolean;
      readonly disabledReason: string | null;
    };
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_transport',
    'not_raw_state_store',
  ];
  readonly inspectionHash: string;
}

export interface StudioGeneratedLevelPresetDraft {
  readonly presetId: string;
  readonly seed: number;
}

export interface StudioGeneratedLevelPresetFieldReadModel {
  readonly field: 'generatorId' | 'presetId' | 'seed';
  readonly label: string;
  readonly value: string;
  readonly editable: boolean;
  readonly inputKind: 'readonly' | 'select' | 'number';
  readonly allowedValues: readonly string[];
  readonly validationStatus: 'valid' | 'invalid';
  readonly validationMessage: string | null;
}

export interface StudioGeneratedLevelPresetAuthoringReadModel {
  readonly authoringVersion: 'studio-generated-level-preset-authoring.v0';
  readonly studioMode: Extract<StudioMode, 'definition_authoring'>;
  readonly presetPath: string;
  readonly generatorId: string;
  readonly fields: readonly StudioGeneratedLevelPresetFieldReadModel[];
  readonly validationStatus: 'valid' | 'invalid';
  readonly validationErrors: readonly string[];
  readonly boundary: {
    readonly storedPresetEditing: true;
    readonly liveRuntimeMutation: false;
    readonly runtimeToDefinitionExport: false;
  };
}

export interface StudioGeneratedLevelLiveReadModel {
  readonly liveVersion: 'studio-generated-level-live.v0';
  readonly studioMode: Extract<StudioMode, 'definition_authoring' | 'live_runtime_inspection'>;
  readonly attachState: 'not_attached' | 'attached' | 'unavailable';
  readonly readoutAvailable: boolean;
  readonly generator: {
    readonly generatorId: string | null;
    readonly presetId: string | null;
    readonly seed: number | null;
    readonly configHash: string | null;
    readonly outputHash: string | null;
    readonly replayHash: string | null;
  };
  readonly volume: {
    readonly tunnelDims: readonly [number, number, number] | null;
    readonly solidVoxels: number | null;
    readonly corridorCount: number | null;
    readonly roomCount: number | null;
  };
  readonly projections: {
    readonly renderHash: string | null;
    readonly collisionHash: string | null;
    readonly navAvailable: boolean;
    readonly navProjectionHash: string | null;
  };
  readonly spawnMarkers: readonly {
    readonly id: string;
    readonly kind: string;
    readonly voxel: readonly [number, number, number];
    readonly world: readonly [number, number, number];
  }[];
  readonly regenerate: {
    readonly commandId: 'runtime.generated_tunnel.regenerate';
    readonly available: boolean;
    readonly disabledReason: string | null;
    readonly lastReceipt: {
      readonly operation: 'regenerate' | 'apply_to_runtime_world';
      readonly status: 'applied' | 'unsupported';
      readonly reason: string | null;
      readonly sequenceId: number;
      readonly sessionHashAfter: string;
    } | null;
  };
}

export interface StudioGeneratedLevelInspectionReadModel {
  readonly inspectionVersion: 'studio-generated-level-inspection.v0';
  readonly definitionAuthoring: StudioGeneratedLevelPresetAuthoringReadModel;
  readonly liveInspection: StudioGeneratedLevelLiveReadModel;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_local_generation_algorithm',
    'not_runtime_authority',
    'not_runtime_to_definition_export',
    'not_live_runtime_mutation_from_authoring',
  ];
  readonly inspectionHash: string;
}

export interface StudioRunningProjectDiscoveryReadModel {
  readonly discoveryVersion: 'studio-running-project-discovery.v0';
  readonly workspaceHash: string;
  readonly gameId: string;
  readonly endpoint: string | null;
  readonly sessions: readonly {
    readonly sessionId: string;
    readonly status: StudioRuntimeSessionStatus;
    readonly sessionType: StudioRuntimeSessionType;
    readonly runtimeMode: StudioRuntimeSessionReadModel['runtimeMode'];
    readonly backendMode: AshaGameRuntimeBackendMode;
    readonly backendCompatibilityState: StudioRuntimeBackendCompatibilityState;
    readonly attachStatus: StudioRuntimeSessionReadModel['attachStatus'];
    readonly liveHash: string | null;
    readonly runtimeSessionSummaryHash: string | null;
    readonly diagnostics: readonly StudioDiagnostic[];
  }[];
  readonly activeSessionId: string | null;
  readonly canConnect: boolean;
  readonly canDisconnect: boolean;
  readonly canRefresh: boolean;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly commandIds: {
    readonly refresh: 'project.refresh_sessions';
    readonly connect: 'project.connect_running';
    readonly disconnect: 'project.disconnect_running';
  };
  readonly nonClaims: readonly [
    'not_network_scan',
    'not_private_transport',
    'not_runtime_authority',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ];
  readonly discoveryHash: string;
}

export interface StudioAssetInventoryEvidenceRef {
  readonly kind: string;
  readonly path: string;
  readonly sha256: string | null;
}

export interface StudioAssetInventoryEntryReadModel {
  readonly assetId: string;
  readonly kind: string;
  readonly sourcePath: string;
  readonly dependencies: readonly string[];
  readonly dependencyStatus: 'none' | 'resolved' | 'missing';
  readonly devResolution: {
    readonly sourceHash: string | null;
    readonly devCacheKey: string;
    readonly generatedArtifactVersion: string | null;
    readonly importStatus: string;
    readonly publishOutputKey: string;
  } | null;
  readonly publishResolution: {
    readonly outputKey: string;
    readonly packedPath: string;
    readonly packedHash: string | null;
    readonly packedBytes: number | null;
  } | null;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly evidenceRefs: readonly StudioAssetInventoryEvidenceRef[];
  readonly referencedRenderableIds: readonly string[];
}

export interface StudioAssetInventoryReadModel {
  readonly inventoryVersion: 'studio-asset-inventory.v0';
  readonly artifactKind: 'asha_demo_asset_inventory';
  readonly artifactVersion: 'asset-inventory.v1';
  readonly status: 'ok' | 'diagnostics';
  readonly sourceManifestPath: string;
  readonly sourceManifestHash: string;
  readonly catalogPath: string;
  readonly catalogHash: string;
  readonly dependencyOrder: readonly string[];
  readonly entries: readonly StudioAssetInventoryEntryReadModel[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly inventoryHash: string;
}

export type StudioAssetInventoryLoadResult =
  | {
      readonly ok: true;
      readonly inventory: StudioAssetInventoryReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly inventory: StudioAssetInventoryReadModel | null;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioSessionReadModel {
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly scenarioLabel: string;
  readonly runtimeMode: 'reference';
  readonly status: StudioWorkspaceStatus;
  readonly startedAtIso: string;
}


export interface StudioVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface StudioBounds {
  readonly min: StudioVec3;
  readonly max: StudioVec3;
}

export interface StudioSceneRenderableReadModel {
  readonly renderableId: string;
  readonly label: string;
  readonly kind: StudioRenderableKind;
  readonly sourceState: StudioEntitySourceState;
  readonly bounds: StudioBounds;
  readonly meshRef: string | null;
  readonly materialRef: string | null;
  readonly renderHash: string;
  readonly visible: boolean;
  readonly pickable: boolean;
}

export interface StudioSceneReadModel {
  readonly sceneId: string;
  readonly selectedRenderableId: string | null;
  readonly renderables: readonly StudioSceneRenderableReadModel[];
  readonly sceneHash: string;
}

export interface StudioViewportCameraReadModel {
  readonly position: StudioVec3;
  readonly target: StudioVec3;
  readonly up: StudioVec3;
  readonly fovDegrees: number;
  readonly near: number;
  readonly far: number;
  readonly cameraHash: string;
}

export interface StudioViewportToolReadModel {
  readonly activeTool: StudioViewportToolMode;
  readonly interactionMode: 'idle' | 'dragging';
  readonly toolHash: string;
}

export interface StudioVoxelCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface StudioViewportHitReadModel {
  readonly renderableId: string;
  readonly face: StudioViewportHitFace;
  readonly worldPosition: StudioVec3;
  readonly voxelCoord: StudioVoxelCoord | null;
  readonly hitHash: string;
}

export interface StudioRenderSettingsReadModel {
  readonly wireframeEnabled: boolean;
  readonly showGrid: boolean;
  readonly showPreviewGhosts: boolean;
  readonly showReadbackOverlay: boolean;
  readonly showRaycastHitDebug: boolean;
  readonly lightingMode: StudioLightingMode;
  readonly renderSettingsHash: string;
}

export interface StudioPreferencesReadModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'studio_preferences';
  readonly preferencesVersion: 'studio-preferences.v0';
  readonly render: StudioRenderSettingsReadModel;
  readonly preferencesHash: string;
}

export interface StudioViewportCameraControlDelta {
  readonly deltaX: number;
  readonly deltaY: number;
}

export interface StudioViewportCameraMovementIntent {
  readonly forward: number;
  readonly right: number;
  readonly up: number;
  readonly distance: number;
}

export interface StudioViewportRenderableAdapter {
  readonly renderableId: string;
  readonly label: string;
  readonly kind: StudioRenderableKind;
  readonly sourceState: StudioEntitySourceState;
  readonly selected: boolean;
  readonly bounds: StudioBounds;
  readonly meshRef: string | null;
  readonly materialRef: string | null;
  readonly renderHash: string;
  readonly visible: boolean;
  readonly pickable: boolean;
}

export interface StudioViewportAdapterReadModel {
  readonly adapterVersion: 'studio-viewport-adapter.v0';
  readonly sceneId: string;
  readonly sceneHash: string;
  readonly selectedRenderableId: string | null;
  readonly camera: StudioViewportCameraReadModel;
  readonly tool: StudioViewportToolReadModel;
  readonly renderSettings: StudioRenderSettingsReadModel;
  readonly renderables: readonly StudioViewportRenderableAdapter[];
  readonly readbackHash: string;
  readonly nonClaims: readonly string[];
}

export interface StudioEntityReadModel {
  readonly id: string;
  readonly label: string;
  readonly kind: StudioEntityKind;
  readonly sourceState: StudioEntitySourceState;
  readonly badge: StudioEntityBadge;
  readonly depth: number;
  readonly expanded: boolean;
  readonly selectable: boolean;
  readonly selected: boolean;
  readonly renderableId: string | null;
  readonly sceneObjectId: SceneObjectId | null;
}

export interface StudioCommandTimelineEntry {
  readonly sequenceId: string;
  readonly commandId: string;
  readonly label: string;
  readonly requestedBy: StudioActorKind;
  readonly status: StudioCommandStatus;
  readonly inputSummary: string;
  readonly outputSummary: string;
}

export interface StudioCommandResultReadModel {
  readonly sequenceId: string;
  readonly commandId: string;
  readonly status: StudioCommandStatus;
  readonly changedScene: boolean;
  readonly changedSelection: boolean;
  readonly outputSummary: string;
}

export interface StudioWorkspaceReadModel {
  readonly workspaceId: string;
  readonly session: StudioSessionReadModel;
  readonly scene: StudioSceneReadModel;
  readonly flatSceneDocument: FlatSceneDocument;
  readonly sceneObjectSnapshot: EditorSceneObjectSnapshot;
  readonly entities: readonly StudioEntityReadModel[];
  readonly selectedEntityId: string | null;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResultReadModel[];
  readonly timelineSequence: number;
}

export interface StudioViewportReadout {
  readonly readoutVersion: 'studio-viewport-readout.v0';
  readonly camera: StudioViewportCameraReadModel;
  readonly tool: StudioViewportToolReadModel;
  readonly cameraHash: string;
  readonly toolHash: string;
}

export interface StudioUiStateReadModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'studio_ui_state';
  readonly uiStateVersion: 'studio-ui-state.v1';
  readonly activeMenu: StudioApplicationMenu | null;
  readonly bottomPanelTab: StudioBottomPanelTab;
  readonly assetBrowserCategory: StudioAssetBrowserCategory;
  readonly hierarchy: {
    readonly expandedCount: number;
    readonly totalCount: number;
  };
  readonly hierarchyFilter: string;
  readonly menuMessage: string;
  readonly projectWorkspaceAvailable: boolean;
  readonly uiStateHash: string;
  readonly nonClaims: readonly string[];
}

export interface StudioProjectWorkspaceIdentity {
  readonly gameId: string;
  readonly manifestPath: string;
  readonly manifestSha256: string;
}

export interface StudioWorkspaceArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'studio_project_workspace';
  readonly artifactId: string;
  readonly workspaceVersion: 'studio-project-workspace.v2';
  readonly savedAtIso: string;
  readonly project: StudioProjectWorkspaceIdentity;
  readonly authoredContent: {
    readonly sceneFile: {
      readonly path: string;
      readonly sha256: string;
    };
    readonly projectSettings: {
      readonly path: typeof ASHA_STUDIO_PROJECT_SETTINGS_PATH;
      readonly sha256: string;
    };
  };
  readonly stateClassification: {
    readonly durableAuthoredContent: 'hash_pinned_project_sources';
    readonly editorPreferences: 'host_user_settings_keyed_by_canonical_project_not_serialized';
    readonly transientProjection: 'reconstructed_not_serialized';
    readonly attachedRuntime: 'disconnect_and_reconnect_not_serialized';
  };
  readonly serializationNotes: readonly string[];
}

export interface StudioWorkspaceUiCommandResult {
  readonly workspace: StudioWorkspaceReadModel;
  readonly timelineEntry: StudioCommandTimelineEntry;
}

export interface StudioWorkspaceRestoreResult {
  readonly ok: boolean;
  readonly artifact: StudioWorkspaceArtifact | null;
  readonly diagnostics: readonly StudioDiagnostic[];
}

export interface StudioWorkspaceSceneReferenceValidationResult {
  readonly ok: boolean;
  readonly diagnostics: readonly StudioDiagnostic[];
}

export type StudioProjectWorkspaceLoadResult =
  | {
      readonly ok: true;
      readonly artifact: StudioWorkspaceArtifact;
      readonly workspace: StudioWorkspaceReadModel;
      readonly sceneDocument: FlatSceneDocument;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly artifact: null;
      readonly workspace: null;
      readonly sceneDocument: null;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioAssetBrowserCategoryReadModel {
  readonly category: StudioAssetBrowserCategory;
  readonly label: string;
  readonly count: number;
}

export interface StudioEntityProjectionDiagnostic {
  readonly code: StudioEntityProjectionDiagnosticCode;
  readonly severity: 'error';
  readonly message: string;
}

export interface SelectEntityIntent {
  readonly kind: 'select_entity';
  readonly entityId: string;
  readonly expectedTimelineSequence: number;
}

export interface SceneObjectCommandIntent {
  readonly kind: 'scene_object_command';
  readonly request: SceneObjectCommandRequest;
  readonly expectedTimelineSequence: number;
}

export interface NoopIntent {
  readonly kind: 'noop';
  readonly reason: string;
}

export type StudioIntent =
  | SelectEntityIntent
  | SceneObjectCommandIntent
  | NoopIntent;

export interface StudioSceneObjectCommandApplyResult {
  readonly ok: boolean;
  readonly workspace: StudioWorkspaceReadModel;
  readonly result: SceneObjectCommandResult;
  readonly diagnostics: readonly StudioDiagnostic[];
}

function diagnostic(
  severity: StudioDiagnosticSeverity,
  code: string,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return { severity, code, message, source, remediation };
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const entries = value.map(entry => stableJson(entry));
    return `[${entries.join(',')}]`;
  }

  const objectEntries = Object.entries(value).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );
  const serializedEntries = objectEntries.map(
    ([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`,
  );
  return `{${serializedEntries.join(',')}}`;
}

function fnv1aHash(prefix: string, value: unknown): string {
  const text = stableJson(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `${prefix}-${hash.toString(16).padStart(8, '0')}`;
}

export function loadStudioGameWorkspaceManifest(
  input: StudioGameWorkspaceLoadInput,
): StudioGameWorkspaceLoadResult {
  const diagnostics: StudioDiagnostic[] = [];
  const parsed = parseAshaGameManifestToml(input.manifestText);
  if (!parsed.ok) {
    return {
      ok: false,
      diagnostics: parsed.diagnostics.map(diagnostic =>
        studioGameWorkspaceDiagnostic(
          'manifest_invalid',
          diagnostic.message,
          diagnostic.path,
          diagnostic.code,
        ),
      ),
    };
  }

  const compatibility = validateAshaConsumerCompatibility(
    parsed.manifest,
    ASHA_GAME_WORKSPACE_COMPATIBILITY,
  );
  if (!compatibility.ok) {
    diagnostics.push(...compatibility.diagnostics.map(diagnostic =>
      studioGameWorkspaceDiagnostic(
        'compatibility_invalid',
        diagnostic.message,
        diagnostic.path,
        diagnostic.code,
      ),
    ));
  }

  for (const [kind, roots] of [
    ['scene_roots', parsed.manifest.workspace.sceneRoots],
    ['asset_roots', parsed.manifest.workspace.assetRoots],
    ['replay_roots', parsed.manifest.workspace.replayRoots],
    ['catalog_packages', parsed.manifest.workspace.catalogPackages],
    ['policy_packages', parsed.manifest.workspace.policyPackages],
  ] as const) {
    for (const root of roots) {
      if (!input.pathExists(root)) {
        diagnostics.push(studioGameWorkspaceDiagnostic(
          'missing_workspace_root',
          `Manifest ${kind} entry does not exist: ${root}`,
          root,
          kind,
        ));
      }
    }
  }

  for (const [kind, command] of [
    ['runtime.dev_command', parsed.manifest.runtime.devCommand],
    ['publish.command', parsed.manifest.publish.command],
    ['publish.verify_command', parsed.manifest.publish.verifyCommand],
  ] as const) {
    const scriptName = npmRunScriptName(command);
    if (scriptName === null || input.packageScripts[scriptName] === undefined) {
      diagnostics.push(studioGameWorkspaceDiagnostic(
        'missing_command',
        `Manifest ${kind} does not reference an available npm script: ${command}`,
        kind,
        command,
      ));
    }
  }

  if (!parsed.manifest.runtime.devtoolsEndpoint.startsWith('ws://127.0.0.1:')
    && !parsed.manifest.runtime.devtoolsEndpoint.startsWith('ws://localhost:')) {
    diagnostics.push(studioGameWorkspaceDiagnostic(
      'invalid_attach_endpoint',
      `Attach endpoint must be local websocket: ${parsed.manifest.runtime.devtoolsEndpoint}`,
      'runtime.devtools_endpoint',
      parsed.manifest.runtime.devtoolsEndpoint,
    ));
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }

  const workspace: StudioGameWorkspaceReadModel = {
    workspaceVersion: 'studio-game-workspace.v0',
    workspaceRoot: input.workspaceRoot,
    manifestPath: input.manifestPath,
    gameId: input.gameId,
    manifest: parsed.manifest,
    sceneRoots: parsed.manifest.workspace.sceneRoots,
    assetRoots: parsed.manifest.workspace.assetRoots,
    catalogPackages: parsed.manifest.workspace.catalogPackages,
    policyPackages: parsed.manifest.workspace.policyPackages,
    attachEndpoint: parsed.manifest.runtime.devtoolsEndpoint,
    devCommand: parsed.manifest.runtime.devCommand,
    runtimeEntry: parsed.manifest.runtime.wasmOrNativeEntry,
    publishCommand: parsed.manifest.publish.command,
    publishVerifyCommand: parsed.manifest.publish.verifyCommand,
    allowedSourceWrites: parsed.manifest.studio.allowedSourceWrites,
    diagnostics: [],
    workspaceHash: fnv1aHash('studio-game-workspace', {
      workspaceRoot: input.workspaceRoot,
      manifestPath: input.manifestPath,
      gameId: input.gameId,
      manifest: parsed.manifest,
    }),
  };

  return { ok: true, workspace, diagnostics: [] };
}

export function buildStudioGameWorkspaceReadout(
  workspace: StudioGameWorkspaceReadModel,
): StudioGameWorkspaceReadout {
  return {
    readoutVersion: 'studio-game-workspace-readout.v0',
    commandIds: {
      openWorkspace: 'workspace.open_game_manifest',
      validateManifest: 'workspace.validate_game_manifest',
    },
    gameId: workspace.gameId,
    workspaceRoot: workspace.workspaceRoot,
    manifestPath: workspace.manifestPath,
    compatibility: {
      engineVersion: workspace.manifest.asha.engineVersion,
      contractsVersion: workspace.manifest.asha.contractsVersion,
      runtimeBridgeVersion: workspace.manifest.asha.runtimeBridgeVersion,
      devtoolsProtocolVersion: workspace.manifest.asha.devtoolsProtocolVersion,
    },
    sceneRoots: workspace.sceneRoots,
    assetRoots: workspace.assetRoots,
    catalogPackages: workspace.catalogPackages,
    policyPackages: workspace.policyPackages,
    attachEndpoint: workspace.attachEndpoint,
    devCommand: workspace.devCommand,
    runtimeEntry: workspace.runtimeEntry,
    runtimeBackend: {
      backendMode: workspace.manifest.runtime.backendMode,
      backendProfile: workspace.manifest.runtime.backendProfile,
    },
    publishCommand: workspace.publishCommand,
    publishVerifyCommand: workspace.publishVerifyCommand,
    devResourceProfile: workspace.manifest.devResourceProfile,
    publishResourceProfile: workspace.manifest.publishResourceProfile,
    workspaceHash: workspace.workspaceHash,
    diagnostics: workspace.diagnostics,
  };
}

export function buildStudioWorkspaceOpenReadModel(input: {
  readonly workspace: StudioGameWorkspaceReadModel | null;
  readonly workspaceRoot?: string;
  readonly manifestPath: string;
  readonly manifestHash: string | null;
  readonly sourceFiles: readonly StudioWorkspaceSourceFileInput[];
}): StudioWorkspaceOpenReadResult {
  const diagnostics: StudioDiagnostic[] = [];
  if (input.workspace === null) {
    diagnostics.push(studioWorkspaceOpenReadDiagnostic(
      'missing_manifest',
      `Workspace manifest is required before source files can be read: ${input.manifestPath}.`,
      input.manifestPath,
      'Open asha.game.toml through workspace.open_game_manifest first.',
    ));
  }

  const workspace = input.workspace;
  const persistence = workspace === null
    ? null
    : buildAshaAuthoringPersistenceContract(workspace.manifest);
  const allowedCatalogRoots = persistence?.writeScopes.find(
    scope => scope.operationKind === 'authoring.catalog.save_source',
  )?.allowedRoots ?? [];

  const sourceFiles: StudioWorkspaceSourceFileReadModel[] = [];
  for (const file of input.sourceFiles) {
    const fileDiagnostics: StudioDiagnostic[] = [];
    const operationKind = workspaceSourceOperationKind(file.path);
    if (file.path.length === 0 || file.path.startsWith('/') || file.path.split('/').includes('..')) {
      fileDiagnostics.push(studioWorkspaceOpenReadDiagnostic(
        'workspace_source_path_escape',
        `Workspace source path must stay inside the game workspace: ${file.path}.`,
        file.path,
        'Use manifest-declared relative catalog paths only.',
      ));
    }
    if (file.path.startsWith('../asha-engine') || file.path.startsWith('../asha-studio') || file.path.includes('/src/')) {
      fileDiagnostics.push(studioWorkspaceOpenReadDiagnostic(
        'private_repo_scan',
        `Workspace source read cannot scan private sibling repos or ASHA internals: ${file.path}.`,
        file.path,
        'Use public package roots and manifest-declared game files.',
      ));
    }
    if (operationKind === null) {
      fileDiagnostics.push(studioWorkspaceOpenReadDiagnostic(
        'unsupported_file_kind',
        `Workspace open/read supports catalog files only: ${file.path}.`,
        file.path,
        'Read catalog package catalog.json files only.',
      ));
    }
    if (workspace !== null && operationKind !== null) {
      const resolution = resolveAshaAuthoringWriteTarget(workspace.manifest, {
        operationKind,
        relativePath: file.path,
      });
      if (!resolution.ok) {
        fileDiagnostics.push(...resolution.diagnostics.map(diagnostic =>
          studioWorkspaceOpenReadDiagnostic(
            'workspace_source_not_allowed',
            diagnostic.message,
            diagnostic.path,
            diagnostic.code,
          ),
        ));
      } else if (fileDiagnostics.length === 0) {
        const readModel: StudioWorkspaceSourceFileReadModel = {
          sourceVersion: 'studio-workspace-source-file.v0',
          path: resolution.normalizedPath,
          hash: file.sha256,
          schemaKind: 'asset-catalog-json.v1',
          operationKind,
          allowedRoot: resolution.allowedRoot,
          diagnostics: [],
          sourceHash: fnv1aHash('studio-workspace-source-file', {
            workspaceHash: workspace.workspaceHash,
            path: resolution.normalizedPath,
            hash: file.sha256,
            schemaKind: resolution.format,
            operationKind,
          }),
        };
        sourceFiles.push(readModel);
      }
    }
    diagnostics.push(...fileDiagnostics);
  }

  const openRead: StudioWorkspaceOpenReadModel = {
    openReadVersion: 'studio-workspace-open-read.v0',
    workspaceHash: workspace?.workspaceHash ?? 'missing',
    workspaceRoot: input.workspaceRoot ?? workspace?.workspaceRoot ?? 'missing',
    manifestPath: input.manifestPath,
    manifestHash: input.manifestHash ?? 'missing',
    studioMode: 'definition_authoring',
    runtimeSessionState: 'not_attached',
    authoringPersistenceVersion: 'authoring-persistence.v0',
    allowedCatalogRoots,
    sourceFiles,
    diagnostics,
    nonClaims: [
      'not_repo_crawler',
      'not_private_asset_database',
      'not_source_write',
      'not_runtime_authority',
    ],
    openReadHash: fnv1aHash('studio-workspace-open-read', {
      workspaceHash: workspace?.workspaceHash ?? 'missing',
      workspaceRoot: input.workspaceRoot ?? workspace?.workspaceRoot ?? 'missing',
      manifestPath: input.manifestPath,
      manifestHash: input.manifestHash ?? 'missing',
      studioMode: 'definition_authoring',
      runtimeSessionState: 'not_attached',
      allowedCatalogRoots,
      sourceFiles,
      diagnostics,
    }),
  };

  return diagnostics.length === 0
    ? { ok: true, openRead, diagnostics: [] }
    : { ok: false, openRead, diagnostics };
}

export function buildStudioGameWorkspaceHandshakeRequest(
  workspace: StudioGameWorkspaceReadModel,
): Extract<DevtoolsAttachClientMessage, { readonly type: 'handshake.request' }> {
  return {
    type: 'handshake.request',
    protocolVersion: ASHA_DEVTOOLS_PROTOCOL_VERSION,
    clientName: 'asha-studio',
    requestedWorkspaceId: workspace.gameId,
  };
}

function readRuntimeBackendEvidence(runtime: unknown): StudioRuntimeBackendEvidence {
  const record = isRecord(runtime) ? runtime : {};
  const backendMode = record.backendMode === 'reference' || record.backendMode === 'native' || record.backendMode === 'wasm'
    ? record.backendMode
    : null;
  const backendProfile = typeof record.backendProfile === 'string' && record.backendProfile.length > 0
    ? record.backendProfile
    : null;
  const launcherName = typeof record.launcherName === 'string' && record.launcherName.length > 0
    ? record.launcherName
    : null;
  const runtimeProfileId = typeof record.runtimeProfileId === 'string' && record.runtimeProfileId.length > 0
    ? record.runtimeProfileId
    : null;
  const nonClaims = Array.isArray(record.nonClaims)
    ? record.nonClaims.filter((claim): claim is string => typeof claim === 'string' && claim.length > 0)
    : [];

  return {
    source: 'devtools.handshake.runtime',
    backendMode,
    backendProfile,
    launcherName,
    runtimeProfileId,
    nonClaims,
  };
}

export async function attachStudioGameWorkspaceDevtools(
  workspace: StudioGameWorkspaceReadModel,
  transport: StudioDevtoolsAttachTransport,
): Promise<StudioGameWorkspaceAttachResult> {
  const handshakeRequest = buildStudioGameWorkspaceHandshakeRequest(workspace);
  const response = await transport.exchange(handshakeRequest);
  if (response.type !== 'handshake.response') {
    return {
      ok: false,
      diagnostics: [
        studioGameWorkspaceAttachDiagnostic(
          'attach_unexpected_response',
          `Attach handshake expected handshake.response and received ${response.type}.`,
          workspace.attachEndpoint,
          response.type,
        ),
      ],
    };
  }

  if (!response.accepted) {
    return {
      ok: false,
      diagnostics: [
        studioGameWorkspaceAttachDiagnostic(
          response.reason === 'unsupported_protocol' ? 'attach_protocol_mismatch' : 'attach_rejected',
          `Attach handshake rejected: ${response.reason}.`,
          workspace.attachEndpoint,
          response.reason,
        ),
      ],
    };
  }

  const diagnostics: StudioDiagnostic[] = [];
  if (response.protocolVersion !== ASHA_DEVTOOLS_PROTOCOL_VERSION
    || response.compatibility.protocolVersion !== ASHA_DEVTOOLS_PROTOCOL_VERSION
    || response.compatibility.protocolVersion !== workspace.manifest.asha.devtoolsProtocolVersion) {
    diagnostics.push(studioGameWorkspaceAttachDiagnostic(
      'attach_protocol_mismatch',
      'Attach protocol version does not match Studio and manifest compatibility.',
      workspace.attachEndpoint,
      response.compatibility.protocolVersion,
    ));
  }

  if (response.compatibility.contractsCompatibility !== ASHA_GAME_WORKSPACE_COMPATIBILITY.contracts.compatibilityVersion
    || response.compatibility.runtimeBridgeCompatibility !== ASHA_GAME_WORKSPACE_COMPATIBILITY.runtimeBridge.compatibilityVersion
    || response.compatibility.publishArtifactFormat !== ASHA_GAME_WORKSPACE_COMPATIBILITY.publishArtifact.compatibilityVersion) {
    diagnostics.push(studioGameWorkspaceAttachDiagnostic(
      'attach_compatibility_mismatch',
      'Attach compatibility metadata does not match the opened game workspace manifest.',
      workspace.attachEndpoint,
      response.compatibility.protocolVersion,
    ));
  }

  if (response.runtime.gameId !== workspace.gameId
    || response.runtime.workspaceId !== workspace.gameId
    || response.runtime.engineVersion !== workspace.manifest.asha.engineVersion) {
    diagnostics.push(studioGameWorkspaceAttachDiagnostic(
      'attach_runtime_identity_mismatch',
      'Attached runtime identity does not match the opened game workspace.',
      workspace.attachEndpoint,
      response.runtime.gameId,
    ));
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }

  const runtimeBackendEvidence = readRuntimeBackendEvidence(response.runtime);
  const attach: StudioGameWorkspaceAttachReadModel = {
    attachVersion: 'studio-game-workspace-attach.v0',
    status: 'attached',
    endpoint: workspace.attachEndpoint,
    workspaceHash: workspace.workspaceHash,
    handshakeRequest,
    compatibility: response.compatibility,
    runtime: response.runtime,
    runtimeBackendEvidence,
    attachHash: fnv1aHash('studio-game-workspace-attach', {
      endpoint: workspace.attachEndpoint,
      workspaceHash: workspace.workspaceHash,
      compatibility: response.compatibility,
      runtime: response.runtime,
      runtimeBackendEvidence,
    }),
    diagnostics: [],
  };

  return { ok: true, attach, diagnostics: [] };
}

export async function refreshStudioGameWorkspaceLiveReadModel(
  workspace: StudioGameWorkspaceReadModel,
  attach: StudioGameWorkspaceAttachReadModel,
  transport: StudioDevtoolsAttachTransport,
): Promise<StudioGameWorkspaceLiveResult> {
  if (attach.workspaceHash !== workspace.workspaceHash || attach.endpoint !== workspace.attachEndpoint) {
    return {
      ok: false,
      diagnostics: [
        studioGameWorkspaceLiveDiagnostic(
          'live_attach_workspace_mismatch',
          'Live readout attach state does not match the opened game workspace.',
          workspace.attachEndpoint,
          attach.attachHash,
        ),
      ],
    };
  }

  const projection = await transport.exchange({ type: 'projection.pull', sinceTick: null });
  if (projection.type !== 'projection.snapshot' || projection.summary.runtimeSessionSummaryHash.length === 0) {
    return {
      ok: false,
      diagnostics: [
        studioGameWorkspaceLiveDiagnostic(
          'live_projection_unavailable',
          'Projection pull did not return a valid projection.snapshot.',
          workspace.attachEndpoint,
          projection.type,
        ),
      ],
    };
  }

  const renderDiff = await transport.exchange({
    type: 'render_diff.snapshot',
    sinceHash: projection.summary.renderDiffHash,
  });
  if (renderDiff.type !== 'render_diff.snapshot' || renderDiff.renderDiffHash.length === 0) {
    return {
      ok: false,
      diagnostics: [
        studioGameWorkspaceLiveDiagnostic(
          'live_render_diff_unavailable',
          'Render-diff pull did not return a valid render_diff.snapshot.',
          workspace.attachEndpoint,
          renderDiff.type,
        ),
      ],
    };
  }

  const telemetry = await transport.exchange({ type: 'telemetry.pull', maxSamples: 8 });
  if (telemetry.type !== 'telemetry.snapshot' || telemetry.samples.length === 0) {
    return {
      ok: false,
      diagnostics: [
        studioGameWorkspaceLiveDiagnostic(
          'live_telemetry_unavailable',
          'Telemetry pull did not return samples.',
          workspace.attachEndpoint,
          telemetry.type,
        ),
      ],
    };
  }

  const live: StudioGameWorkspaceLiveReadModel = {
    liveVersion: 'studio-game-workspace-live.v0',
    endpoint: workspace.attachEndpoint,
    workspaceHash: workspace.workspaceHash,
    attachHash: attach.attachHash,
    projection: projection.summary,
    projectionDiagnostics: projection.diagnostics,
    renderDiff: renderDiff.frame,
    renderDiffHash: renderDiff.renderDiffHash,
    telemetry: telemetry.samples,
    liveHash: fnv1aHash('studio-game-workspace-live', {
      workspaceHash: workspace.workspaceHash,
      attachHash: attach.attachHash,
      projection: projection.summary,
      renderDiffHash: renderDiff.renderDiffHash,
      telemetry: telemetry.samples,
    }),
    diagnostics: [],
  };

  return { ok: true, live, diagnostics: [] };
}

export async function proposeStudioGameWorkspaceCommand(
  workspace: StudioGameWorkspaceReadModel,
  attach: StudioGameWorkspaceAttachReadModel,
  transport: StudioDevtoolsAttachTransport,
  input: {
    readonly sequenceId: string;
    readonly batch: CommandBatch;
  },
): Promise<StudioGameWorkspaceCommandProposalResult> {
  if (attach.workspaceHash !== workspace.workspaceHash || attach.endpoint !== workspace.attachEndpoint) {
    return {
      ok: false,
      diagnostics: [
        studioGameWorkspaceCommandDiagnostic(
          'command_attach_workspace_mismatch',
          'Command proposal attach state does not match the opened game workspace.',
          workspace.attachEndpoint,
          attach.attachHash,
        ),
      ],
    };
  }

  const response = await transport.exchange({
    type: 'command.propose',
    sequenceId: input.sequenceId,
    batch: input.batch,
  });
  if (response.type !== 'command.result') {
    return {
      ok: false,
      diagnostics: [
        studioGameWorkspaceCommandDiagnostic(
          'command_unexpected_response',
          `Command proposal expected command.result and received ${response.type}.`,
          workspace.attachEndpoint,
          response.type,
        ),
      ],
    };
  }

  if (response.proposal.sequenceId !== input.sequenceId) {
    return {
      ok: false,
      diagnostics: [
        studioGameWorkspaceCommandDiagnostic(
          'command_sequence_mismatch',
          'Command proposal response sequence id does not match the submitted command.',
          workspace.attachEndpoint,
          response.proposal.sequenceId,
        ),
      ],
    };
  }

  const diagnostics = response.proposal.status === 'rejected'
    ? [
        studioGameWorkspaceCommandDiagnostic(
          'command_runtime_rejected',
          `Runtime rejected command proposal: ${response.proposal.reason}.`,
          workspace.attachEndpoint,
          response.proposal.reason,
        ),
      ]
    : [];

  const proposal: StudioGameWorkspaceCommandProposalReadModel = {
    proposalVersion: 'studio-game-workspace-command.v0',
    endpoint: workspace.attachEndpoint,
    workspaceHash: workspace.workspaceHash,
    attachHash: attach.attachHash,
    sequenceId: input.sequenceId,
    backendMode: attach.runtimeBackendEvidence.backendMode,
    batch: input.batch,
    status: response.proposal.status,
    result: response.proposal.result,
    authorityHashBefore: stringAt(response.proposal, 'authorityHashBefore'),
    authorityHashAfter: response.proposal.authorityHashAfter,
    rejectionReason: response.proposal.status === 'rejected' ? response.proposal.reason : null,
    proposalHash: fnv1aHash('studio-game-workspace-command', {
      workspaceHash: workspace.workspaceHash,
      attachHash: attach.attachHash,
      sequenceId: input.sequenceId,
      batch: input.batch,
      backendMode: attach.runtimeBackendEvidence.backendMode,
      proposal: response.proposal,
    }),
    diagnostics,
  };

  return { ok: true, proposal, diagnostics: [] };
}

export function buildStudioGameWorkspaceCommandProposalReadModel(input: {
  readonly workspace: StudioGameWorkspaceReadModel;
  readonly attachHash: string;
  readonly endpoint?: string;
  readonly sequenceId: string;
  readonly backendMode?: AshaGameRuntimeBackendMode | null;
  readonly batch: CommandBatch;
  readonly status: 'accepted' | 'rejected';
  readonly result: CommandResult;
  readonly authorityHashBefore?: string | null;
  readonly authorityHashAfter: string | null;
  readonly rejectionReason?: 'authority_rejected' | 'compatibility_mismatch' | 'runtime_unavailable' | null;
}): StudioGameWorkspaceCommandProposalReadModel {
  const rejectionReason = input.status === 'rejected'
    ? input.rejectionReason ?? 'authority_rejected'
    : null;
  const diagnostics = rejectionReason === null
    ? []
    : [
        studioGameWorkspaceCommandDiagnostic(
          'command_runtime_rejected',
          `Runtime rejected command proposal: ${rejectionReason}.`,
          input.endpoint ?? input.workspace.attachEndpoint,
          rejectionReason,
        ),
      ];
  const proposalPayload = {
    status: input.status,
    sequenceId: input.sequenceId,
    result: input.result,
    authorityHashBefore: input.authorityHashBefore ?? null,
    authorityHashAfter: input.authorityHashAfter,
    reason: rejectionReason,
  };

  return {
    proposalVersion: 'studio-game-workspace-command.v0',
    endpoint: input.endpoint ?? input.workspace.attachEndpoint,
    workspaceHash: input.workspace.workspaceHash,
    attachHash: input.attachHash,
    sequenceId: input.sequenceId,
    backendMode: input.backendMode ?? input.workspace.manifest.runtime.backendMode,
    batch: input.batch,
    status: input.status,
    result: input.result,
    authorityHashBefore: input.authorityHashBefore ?? null,
    authorityHashAfter: input.authorityHashAfter,
    rejectionReason,
    proposalHash: fnv1aHash('studio-game-workspace-command', {
      workspaceHash: input.workspace.workspaceHash,
      attachHash: input.attachHash,
      sequenceId: input.sequenceId,
      backendMode: input.backendMode ?? input.workspace.manifest.runtime.backendMode,
      batch: input.batch,
      proposal: proposalPayload,
    }),
    diagnostics,
  };
}

export function buildStudioCommandProposalPanel(input: {
  readonly workspace: StudioGameWorkspaceReadModel;
  readonly runtimeSessions: StudioRuntimeSessionListReadModel;
  readonly commandProposals?: readonly StudioGameWorkspaceCommandProposalReadModel[];
}): StudioCommandProposalPanelReadModel {
  const activeSession = input.runtimeSessions.sessions.find(
    session => session.sessionId === input.runtimeSessions.activeSessionId,
  );
  const runtimeSessionId = activeSession?.sessionId ?? input.runtimeSessions.activeSessionId;
  const endpoint = activeSession?.endpoint ?? input.workspace.attachEndpoint;
  const batch: CommandBatch = {
    commands: [
      {
        op: 'setVoxel',
        grid: 0,
        coord: { x: 0, y: 0, z: 0 },
        value: { kind: 'solid', material: 1 },
      },
    ],
  };
  const actionDiagnostics = activeSession === undefined
    ? [
        studioGameWorkspaceCommandDiagnostic(
          'command_runtime_rejected',
          'Command proposal requires an available preview or attached runtime session.',
          endpoint,
          runtimeSessionId,
        ),
      ]
    : [];
  const action: StudioCommandProposalActionReadModel = {
    actionVersion: 'studio-command-proposal-action.v0',
    actionId: 'set_voxel_reference',
    label: 'Set reference voxel',
    commandMessageType: 'command.propose',
    commandOperation: 'setVoxel',
    runtimeSessionId,
    endpoint,
    batch,
    available: actionDiagnostics.length === 0,
    evidenceRefs: [
      {
        kind: 'devtools-command',
        path: endpoint,
        sha256: activeSession?.attachHash ?? activeSession?.sessionHash ?? null,
      },
    ],
    diagnostics: actionDiagnostics,
    actionHash: fnv1aHash('studio-command-proposal-action', {
      runtimeSessionId,
      endpoint,
      batch,
      actionDiagnostics,
    }),
  };
  const proposals = input.commandProposals ?? [];
  const diagnostics = [
    ...input.runtimeSessions.diagnostics,
    ...actionDiagnostics,
    ...proposals.flatMap(proposal => proposal.diagnostics),
  ];

  return {
    panelVersion: 'studio-command-proposal-panel.v0',
    runtimeSessionId,
    workspaceHash: input.workspace.workspaceHash,
    actions: [action],
    proposals,
    diagnostics,
    nonClaims: [
      'does_not_mutate_without_devtools_acceptance',
      'not_native_runtime_authority',
      'not_freeform_json_method_call',
    ],
    panelHash: fnv1aHash('studio-command-proposal-panel', {
      runtimeSessionId,
      workspaceHash: input.workspace.workspaceHash,
      actions: [action],
      proposalHashes: proposals.map(proposal => proposal.proposalHash),
      diagnostics,
    }),
  };
}

export function buildStudioRuntimeSessionList(input: {
  readonly workspace: StudioGameWorkspaceReadModel;
  readonly attach?: StudioGameWorkspaceAttachReadModel | null;
  readonly live?: StudioGameWorkspaceLiveReadModel | null;
}): StudioRuntimeSessionListReadModel {
  const diagnostics: StudioDiagnostic[] = [];
  const attach = input.attach ?? null;
  const live = input.live ?? null;
  const backendMode = input.workspace.manifest.runtime.backendMode;
  const backendProfile = input.workspace.manifest.runtime.backendProfile;
  const attachedBackendEvidence = attach?.runtimeBackendEvidence ?? null;
  const sessionBackendMode = attachedBackendEvidence?.backendMode ?? backendMode;
  const sessionBackendProfile = attachedBackendEvidence?.backendProfile ?? backendProfile;
  const runtimeMode = attach?.runtime.runtimeMode ?? backendMode;
  if (attach !== null && attach.workspaceHash !== input.workspace.workspaceHash) {
    diagnostics.push(studioRuntimeSessionDiagnostic(
      'runtime_session_attach_mismatch',
      'Runtime attach state does not match the opened workspace.',
      input.workspace.attachEndpoint,
      attach.attachHash,
    ));
  }
  if (live !== null && attach !== null && live.attachHash !== attach.attachHash) {
    diagnostics.push(studioRuntimeSessionDiagnostic(
      'runtime_session_live_mismatch',
      'Runtime live readout does not match the attached session.',
      input.workspace.attachEndpoint,
      live.liveHash,
    ));
  }
  if (attach !== null && (
    runtimeMode === 'mock'
    || runtimeMode === 'degraded'
    || runtimeMode !== backendMode
    || sessionBackendMode !== backendMode
  )) {
    diagnostics.push(studioRuntimeSessionDiagnostic(
      'runtime_session_backend_incompatible',
      `Attached runtime mode ${runtimeMode} and backend mode ${sessionBackendMode ?? 'missing'} do not match manifest backend mode ${backendMode}.`,
      input.workspace.attachEndpoint,
      attach.runtime.runtimeMode,
    ));
  }
  const backendCompatibilityState: StudioRuntimeBackendCompatibilityState = diagnostics.some(
    diagnostic => diagnostic.code === 'runtime_session_backend_incompatible',
  )
    ? 'incompatible'
    : attach === null
      ? 'pending_attach'
      : 'compatible';

  const activeSessionId = attach === null
    ? `runtime-preview:${input.workspace.gameId}`
    : `runtime-attached:${attach.runtime.workspaceId}:${attach.attachHash}`;
  const activeSession: StudioRuntimeSessionReadModel = {
    runtimeSessionVersion: 'studio-runtime-session.v0',
    sessionId: activeSessionId,
    sessionType: attach === null ? 'preview' : 'attached',
    status: diagnostics.length > 0 ? 'degraded' : attach === null ? 'available' : 'attached',
    endpoint: input.workspace.attachEndpoint,
    profileId: input.workspace.manifest.devResourceProfile.resolutionPolicy,
    runtimeMode,
    backendMode: sessionBackendMode,
    backendProfile: sessionBackendProfile,
    backendCompatibilityState,
    attachStatus: attach === null ? 'not_attached' : 'attached',
    workspaceHash: input.workspace.workspaceHash,
    attachHash: attach?.attachHash ?? null,
    liveHash: live?.liveHash ?? null,
    compatibility: {
      contractsVersion: input.workspace.manifest.asha.contractsVersion,
      runtimeBridgeVersion: input.workspace.manifest.asha.runtimeBridgeVersion,
      devtoolsProtocolVersion: input.workspace.manifest.asha.devtoolsProtocolVersion,
      publishArtifactVersion: input.workspace.manifest.asha.publishArtifactFormatVersion,
    },
    projection: live === null
      ? null
      : {
          runtimeSessionSummaryHash: live.projection.runtimeSessionSummaryHash,
          renderDiffHash: live.projection.renderDiffHash ?? live.renderDiffHash,
          entityCount: live.projection.entityCount,
          tick: live.projection.tick,
        },
    evidenceRefs: [
      {
        kind: attach === null ? 'runtime-preview' : 'runtime-attach',
        path: input.workspace.attachEndpoint,
        sha256: attach?.attachHash ?? null,
      },
      ...(live === null
        ? []
        : [{
            kind: 'runtime-live',
            path: 'devtools:projection/render-diff/telemetry',
            sha256: live.liveHash,
          }]),
    ],
    nonClaims: [
      ...(sessionBackendMode === 'native' ? [] : ['not_native_runtime_authority']),
      'not_wasm_authority',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
      'not_publish_artifact',
    ],
    diagnostics,
    sessionHash: fnv1aHash('studio-runtime-session', {
      workspaceHash: input.workspace.workspaceHash,
      attachHash: attach?.attachHash ?? null,
      liveHash: live?.liveHash ?? null,
      backendMode: sessionBackendMode,
      backendProfile: sessionBackendProfile,
      backendCompatibilityState,
      diagnostics,
    }),
  };
  const sessions = [activeSession];

  return {
    runtimeSessionListVersion: 'studio-runtime-session-list.v0',
    sessions,
    activeSessionId,
    diagnostics,
    sessionListHash: fnv1aHash('studio-runtime-session-list', {
      activeSessionId,
      sessions,
      diagnostics,
    }),
	  };
	}

export function buildStudioRuntimeSessionInspectionReadModel(input: {
  readonly workspace: StudioWorkspaceReadModel;
  readonly gameWorkspace: StudioGameWorkspaceReadModel | null;
  readonly runtimeSessions: StudioRuntimeSessionListReadModel | null;
  readonly state: RuntimeSessionStateSummary | null;
  readonly projection: RuntimeSessionProjectionSummary | null;
  readonly telemetry: RuntimeSessionTelemetrySummary | null;
  readonly autonomousPolicyTick?: RuntimeSessionAutonomousPolicyTickReadout | null;
  readonly lifecycleStatus?: RuntimeSessionLifecycleStatusReadout | null;
  readonly restartReceipt?: RuntimeSessionLifecycleRestartReceipt | null;
  readonly generatedLevelPreset?: StudioGeneratedLevelPresetDraft;
  readonly generatedTunnelReadout?: GeneratedTunnelReadout | null;
  readonly generatedTunnelRegenerateReceipt?: RuntimeSessionGeneratedTunnelOperationReceipt | null;
  readonly navProjection?: NavProjectionReadout | null;
  readonly gameplayPresetDraft?: StudioFpsGameplayPresetDraft;
  readonly encounterDirector?: EncounterDirectorReadout | null;
  readonly encounterTransitionReceipt?: RuntimeSessionEncounterTransitionReceipt | null;
  readonly combatFeedbackProjection?: CombatFeedbackProjection | null;
  readonly paused: boolean;
}): StudioRuntimeSessionInspectionReadModel {
  const diagnostics: StudioDiagnostic[] = [];
  const activeSession = input.runtimeSessions === null
    ? null
    : input.runtimeSessions.sessions.find(
        session => session.sessionId === input.runtimeSessions?.activeSessionId,
      ) ?? null;
  const attached = input.state !== null && input.telemetry !== null;

  if (input.gameWorkspace === null) {
    diagnostics.push(studioRuntimeSessionDiagnostic(
      'runtime_session_inspection_unavailable',
      'RuntimeSession inspection requires an opened ASHA game workspace.',
      null,
      'Open a game workspace before attaching a runtime session.',
    ));
  }
  if (!attached) {
    diagnostics.push(studioRuntimeSessionDiagnostic(
      'runtime_session_inspection_unavailable',
      'RuntimeSession inspection is not attached to the public facade yet.',
      activeSession?.sessionId ?? null,
      'Attach the public RuntimeSession facade.',
    ));
  }

  const selectedEntity = input.workspace.selectedEntityId === null
    ? null
    : input.workspace.entities.find(entity => entity.id === input.workspace.selectedEntityId) ?? null;
  const capabilitySummary = selectedEntity === null
    ? []
    : [
        `badge:${selectedEntity.badge}`,
        `source:${selectedEntity.sourceState}`,
        selectedEntity.renderableId === null ? 'renderable:none' : `renderable:${selectedEntity.renderableId}`,
        selectedEntity.sceneObjectId === null ? 'scene_object:none' : `scene_object:${selectedEntity.sceneObjectId}`,
      ];
  const recordHashes = input.telemetry?.replayRecords.map(record => record.recordHash) ?? [];
  const tickAvailable = attached && !input.paused;
  const restartAvailable = attached;
  const studioMode: StudioMode = attached ? 'live_runtime_inspection' : 'definition_authoring';
  const attachState: StudioRuntimeSessionInspectionReadModel['attachState'] = attached
    ? 'attached'
    : input.gameWorkspace === null ? 'unavailable' : 'not_attached';
  const sessionStatus: StudioRuntimeSessionInspectionReadModel['sessionStatus'] = attached
    ? input.paused ? 'paused' : 'running'
    : input.gameWorkspace === null ? 'unavailable' : 'not_attached';
  const generatedLevel = buildStudioGeneratedLevelInspectionReadModel({
    attached,
    gameWorkspace: input.gameWorkspace,
    presetDraft: input.generatedLevelPreset ?? {
      presetId: input.generatedTunnelReadout?.generator.presetId ?? 'tiny-enclosed',
      seed: input.generatedTunnelReadout?.generator.seed ?? 17,
    },
    liveReadout: input.generatedTunnelReadout ?? null,
    regenerateReceipt: input.generatedTunnelRegenerateReceipt ?? null,
    navProjection: input.navProjection ?? null,
  });
  const playableLoop = buildStudioPlayableLoopInspectionReadModel({
    attached,
    studioMode,
    attachState,
    sessionId: input.state?.identity.sessionId ?? activeSession?.sessionId ?? null,
    state: input.state,
    telemetry: input.telemetry,
    selectedEntity,
    generatedTunnelReadout: input.generatedTunnelReadout ?? null,
    navProjection: input.navProjection ?? null,
    autonomousPolicyTick: input.autonomousPolicyTick ?? null,
    lifecycleStatus: input.lifecycleStatus ?? null,
    restartReceipt: input.restartReceipt ?? null,
  });
  const playableLoopTuning = buildStudioPlayableLoopTuningInspectionReadModel({
    attached,
    studioMode,
    attachState,
    gameWorkspace: input.gameWorkspace,
    presetDraft: input.gameplayPresetDraft ?? buildDefaultStudioFpsGameplayPresetDraft(),
    encounterDirector: input.encounterDirector ?? null,
    encounterTransitionReceipt: input.encounterTransitionReceipt ?? null,
    combatFeedbackProjection: input.combatFeedbackProjection ?? null,
    lifecycleStatus: input.lifecycleStatus ?? null,
    autonomousPolicyTick: input.autonomousPolicyTick ?? null,
    restartReceipt: input.restartReceipt ?? null,
  });

  const body = {
    studioMode,
    attachState,
    sessionStatus,
    sessionId: input.state?.identity.sessionId ?? activeSession?.sessionId ?? null,
    workspaceHash: input.gameWorkspace?.workspaceHash ?? input.workspace.workspaceId,
    tick: input.telemetry?.tick ?? input.state?.tick ?? null,
    sessionHash: input.telemetry?.sessionHash ?? input.state?.sessionHash ?? null,
    projectionHash: input.projection?.projectionHash ?? null,
    replay: {
      recordCount: input.telemetry?.replayRecords.length ?? 0,
      lastRecordKind: input.telemetry?.replayRecords.at(-1)?.kind ?? null,
      recordHashes,
    },
    commandSummary: {
      acceptedCommandCount: input.telemetry?.acceptedCommandCount ?? null,
      rejectedCommandCount: input.telemetry?.rejectedCommandCount ?? null,
    },
    projectionSummary: {
      renderDiffCount: input.projection?.renderDiffCount ?? null,
      entityCount: input.workspace.entities.length,
      selectedEntity: selectedEntity === null
        ? null
        : {
            entityId: selectedEntity.id,
            label: selectedEntity.label,
            kind: selectedEntity.kind,
            sourceState: selectedEntity.sourceState,
            capabilitySummary,
          },
    },
    generatedLevel,
    playableLoopTuning,
    playableLoop,
    controls: {
      pause: {
        available: false as const,
        disabledReason: 'runtime_session_pause_not_public' as const,
      },
      tick: {
        available: tickAvailable,
        disabledReason: tickAvailable
          ? null
          : attached
            ? 'runtime_session_paused'
            : 'runtime_session_not_attached',
      },
      restart: {
        available: restartAvailable,
        disabledReason: restartAvailable ? null : 'runtime_session_not_attached',
      },
    },
    diagnostics,
  };

  return {
    inspectionVersion: 'studio-runtime-session-inspection.v0',
    ...body,
    nonClaims: [
      'not_runtime_authority',
      'not_private_transport',
      'not_raw_state_store',
    ],
    inspectionHash: fnv1aHash('studio-runtime-session-inspection', body),
  };
}

export function buildDefaultStudioFpsGameplayPresetDraft(): StudioFpsGameplayPresetDraft {
  const readout = readDefaultFpsGameplayPreset();
  return {
    displayName: readout.preset.displayName,
    moveSpeedUnitsPerSecond: readout.preset.playerController.moveSpeedUnitsPerSecond,
    lookSensitivityDegreesPerPixel: readout.preset.playerController.lookSensitivityDegreesPerPixel,
    weaponDamage: readout.preset.weapon.damage,
    weaponAmmo: readout.preset.weapon.ammo,
    enemyCount: readout.preset.encounter.enemyCount,
    desiredRangeUnits: readout.preset.enemyBehavior.desiredRangeUnits,
  };
}

export function buildStudioPlayableLoopTuningInspectionReadModel(input: {
  readonly attached: boolean;
  readonly studioMode: StudioMode;
  readonly attachState: StudioRuntimeSessionInspectionReadModel['attachState'];
  readonly gameWorkspace: StudioGameWorkspaceReadModel | null;
  readonly presetDraft: StudioFpsGameplayPresetDraft;
  readonly encounterDirector: EncounterDirectorReadout | null;
  readonly encounterTransitionReceipt: RuntimeSessionEncounterTransitionReceipt | null;
  readonly combatFeedbackProjection: CombatFeedbackProjection | null;
  readonly lifecycleStatus: RuntimeSessionLifecycleStatusReadout | null;
  readonly autonomousPolicyTick: RuntimeSessionAutonomousPolicyTickReadout | null;
  readonly restartReceipt: RuntimeSessionLifecycleRestartReceipt | null;
}): StudioPlayableLoopTuningInspectionReadModel {
  const catalogReadout = readFpsGameplayPresetCatalog();
  const defaultPresetReadout = catalogReadout.defaultPreset;
  const candidatePreset = applyStudioGameplayPresetDraft(defaultPresetReadout.preset, input.presetDraft);
  const validation = validateFpsGameplayPreset(candidatePreset);
  const authoringDiagnostics = validation.diagnostics.map(diagnostic =>
    studioGameplayPresetDiagnostic(diagnostic),
  );
  const diagnostics: StudioDiagnostic[] = [...authoringDiagnostics];

  if (input.gameWorkspace === null) {
    diagnostics.push({
      severity: 'error',
      code: 'playable_loop_tuning_missing_workspace',
      message: 'Playable-loop tuning inspection requires an opened ASHA game workspace.',
      source: null,
      remediation: 'Open a project manifest before inspecting playable-loop tuning.',
    });
  }
  if (!input.attached) {
    diagnostics.push({
      severity: 'info',
      code: 'playable_loop_live_runtime_not_attached',
      message: 'Live encounter/combat inspection is unavailable until RuntimeSession is attached.',
      source: input.gameWorkspace?.runtimeEntry ?? null,
      remediation: 'Attach the public RuntimeSession facade.',
    });
  }
  if (input.attached && input.encounterDirector === null) {
    diagnostics.push({
      severity: 'warning',
      code: 'playable_loop_encounter_readout_missing',
      message: 'Attached RuntimeSession did not provide an encounter director readout.',
      source: input.gameWorkspace?.gameId ?? null,
      remediation: 'Use the public RuntimeSession encounter director surface.',
    });
  }
  if (input.attached && input.combatFeedbackProjection === null) {
    diagnostics.push({
      severity: 'info',
      code: 'playable_loop_combat_feedback_waiting',
      message: 'Combat feedback projection will appear after the public policy/combat tick runs.',
      source: input.gameWorkspace?.gameId ?? null,
      remediation: 'Run Policy from the live playable-loop panel.',
    });
  }

  const definitionAuthoring = buildPlayableLoopDefinitionAuthoring({
    catalogReadout,
    defaultPresetReadout,
    candidatePreset,
    validation,
    presetDraft: input.presetDraft,
    diagnostics: authoringDiagnostics,
  });
  const liveInspection = buildPlayableLoopLiveRuntimeInspection({
    attached: input.attached,
    studioMode: input.studioMode,
    attachState: input.attachState,
    encounterDirector: input.encounterDirector,
    encounterTransitionReceipt: input.encounterTransitionReceipt,
    combatFeedbackProjection: input.combatFeedbackProjection,
    lifecycleStatus: input.lifecycleStatus,
    autonomousPolicyTick: input.autonomousPolicyTick,
    restartReceipt: input.restartReceipt,
  });
  const body = {
    definitionAuthoring,
    liveInspection,
    diagnostics,
  };

  return {
    inspectionVersion: 'studio-playable-loop-tuning-inspection.v0',
    ...body,
    nonClaims: [
      'not_runtime_authority',
      'not_private_transport',
      'not_local_gameplay_logic',
      'not_runtime_to_definition_export',
    ],
    inspectionHash: fnv1aHash('studio-playable-loop-tuning-inspection', body),
  };
}

function buildPlayableLoopDefinitionAuthoring(input: {
  readonly catalogReadout: FpsGameplayPresetCatalogReadout;
  readonly defaultPresetReadout: FpsGameplayPresetReadout;
  readonly candidatePreset: FpsGameplayPreset;
  readonly validation: FpsGameplayPresetValidationReport;
  readonly presetDraft: StudioFpsGameplayPresetDraft;
  readonly diagnostics: readonly StudioDiagnostic[];
}): StudioPlayableLoopDefinitionAuthoringReadModel {
  const readout = input.validation.readout ?? null;
  const presetHashes = readout?.hashes ?? null;
  const migration = readout?.migration ?? input.defaultPresetReadout.migration;
  const ownership = input.candidatePreset.ownership;

  return {
    authoringVersion: 'studio-playable-loop-definition-authoring.v0',
    studioMode: 'definition_authoring',
    presetReadoutKind: input.defaultPresetReadout.kind,
    catalogReadoutKind: input.catalogReadout.kind,
    presetId: input.candidatePreset.presetId,
    catalogId: input.catalogReadout.catalog.catalogId,
    defaultPresetId: input.catalogReadout.catalog.defaultPresetId,
    displayName: input.candidatePreset.displayName,
    source: {
      projectId: input.candidatePreset.source.projectId,
      presetPath: input.candidatePreset.source.path,
      catalogPath: input.catalogReadout.catalog.source.path,
      fixturePath: input.defaultPresetReadout.fixturePath,
    },
    fields: buildGameplayPresetFieldReadModels(input.presetDraft, input.validation),
    validation: {
      kind: input.validation.kind,
      status: input.validation.valid ? 'valid' : 'invalid',
      diagnosticCount: input.validation.diagnostics.length,
      diagnostics: input.diagnostics,
    },
    hashes: {
      presetHash: presetHashes?.presetHash ?? null,
      tuningHash: presetHashes?.tuningHash ?? null,
      referenceHash: presetHashes?.referenceHash ?? null,
      catalogHash: input.catalogReadout.hashes.catalogHash,
      rejectedHash: input.validation.rejectedHash,
    },
    tuningSummary: {
      playerController:
        `${input.candidatePreset.playerController.moveSpeedUnitsPerSecond} ups, look ${input.candidatePreset.playerController.lookSensitivityDegreesPerPixel}`,
      weapon:
        `${input.candidatePreset.weapon.action} ${input.candidatePreset.weapon.damage} dmg, ammo ${input.candidatePreset.weapon.ammo}`,
      enemyBehavior:
        `${input.candidatePreset.enemyBehavior.policyRef}, range ${input.candidatePreset.enemyBehavior.desiredRangeUnits}`,
      encounter:
        `${input.candidatePreset.encounter.presetId}, enemies ${input.candidatePreset.encounter.enemyCount}`,
      generator:
        `${input.candidatePreset.generator.presetId}, seed ${input.candidatePreset.generator.seed}`,
    },
    ownership: {
      gameOwned: ownership.gameOwned,
      engineOwned: ownership.engineOwned,
    },
    migration,
    boundary: {
      storedPresetEditing: true,
      validatesThroughPublicSchema: true,
      liveRuntimeMutation: false,
      runtimeToDefinitionExport: false,
    },
    nonClaims: [
      'not_runtime_authority',
      'not_arbitrary_json_catalog',
      'not_runtime_to_definition_export',
      'not_live_runtime_mutation_from_authoring',
    ],
  };
}

function buildPlayableLoopLiveRuntimeInspection(input: {
  readonly attached: boolean;
  readonly studioMode: StudioMode;
  readonly attachState: StudioRuntimeSessionInspectionReadModel['attachState'];
  readonly encounterDirector: EncounterDirectorReadout | null;
  readonly encounterTransitionReceipt: RuntimeSessionEncounterTransitionReceipt | null;
  readonly combatFeedbackProjection: CombatFeedbackProjection | null;
  readonly lifecycleStatus: RuntimeSessionLifecycleStatusReadout | null;
  readonly autonomousPolicyTick: RuntimeSessionAutonomousPolicyTickReadout | null;
  readonly restartReceipt: RuntimeSessionLifecycleRestartReceipt | null;
}): StudioPlayableLoopLiveRuntimeInspectionReadModel {
  const encounter = input.encounterDirector;
  const feedback = input.combatFeedbackProjection;
  const lifecycle = input.lifecycleStatus;
  const policy = input.autonomousPolicyTick;
  const receipt = input.encounterTransitionReceipt;
  const liveMode: StudioPlayableLoopLiveRuntimeInspectionReadModel['studioMode'] =
    input.attached ? 'live_runtime_inspection' : 'definition_authoring';

  return {
    liveVersion: 'studio-playable-loop-live-runtime.v0',
    studioMode: liveMode,
    attachState: input.attachState,
    encounter: {
      kind: encounter?.kind ?? null,
      presetId: encounter?.presetId ?? null,
      status: encounter?.state.status ?? null,
      revision: encounter?.state.revision ?? null,
      lastTransition: encounter?.state.lastTransition ?? null,
      activeEnemyCount: encounter?.state.activeEnemyCount ?? null,
      pendingEnemyCount: encounter?.state.pendingEnemyCount ?? null,
      defeatedEnemyCount: encounter?.state.defeatedEnemyCount ?? null,
      spawnedEnemyCount: encounter?.state.spawnedEnemyCount ?? null,
      configHash: encounter?.config.configHash ?? null,
      spawnOrderHash: encounter?.hashes.spawnOrderHash ?? null,
      encounterHash: encounter?.hashes.encounterHash ?? null,
      replayHash: encounter?.hashes.replayHash ?? null,
      spawns: encounter?.spawns.map(spawn => ({
        instanceId: spawn.instanceId,
        runtimeEntityId: spawn.runtimeEntityId,
        status: spawn.status,
        markerId: spawn.spawnMarker.markerId,
        world: spawn.spawnMarker.world,
        capabilities: encounter.config.enemyDefinitions.find(
          definition => definition.runtimeEntityId === spawn.runtimeEntityId,
        )?.capabilities ?? [],
      })) ?? [],
      lastReceipt: receipt === null
        ? null
        : {
            action: receipt.request.action,
            status: receipt.status,
            accepted: receipt.accepted,
            rejectionReason: receipt.rejectionReason ?? null,
            beforeStatus: receipt.before.state.status,
            afterStatus: receipt.after.state.status,
            eventKind: receipt.event?.kind ?? null,
            transitionHash: receipt.hashes.transitionHash,
          },
    },
    combatFeedback: {
      kind: feedback?.kind ?? null,
      scenario: feedback?.scenario ?? null,
      traceResult: feedback?.trace.result ?? null,
      markerTone: feedback?.marker.tone ?? null,
      markerLabel: feedback?.marker.label ?? null,
      notificationTexts: feedback?.notifications.map(notification => notification.text) ?? [],
      hudStatusTexts: feedback?.hud.status.map(status => status.text) ?? [],
      ammo: feedback?.hud.ammo ?? null,
      cooldownTicksRemaining: feedback?.hud.cooldownTicksRemaining ?? null,
      projectionHash: feedback?.hashes.projectionHash ?? null,
      healthHash: feedback?.debug.healthHash ?? null,
    },
    lifecycle: {
      outcomeKind: lifecycle?.outcome.kind ?? null,
      label: lifecycle?.outcome.label ?? null,
      terminal: lifecycle?.outcome.terminal ?? false,
      playerHealth: lifecycle === null
        ? null
        : `${lifecycle.player.health.current}/${lifecycle.player.health.max}`,
      enemyHealth: lifecycle === null
        ? null
        : `${lifecycle.enemy.health.current}/${lifecycle.enemy.health.max}`,
      lifecycleHash: lifecycle?.hashes.lifecycleHash ?? null,
    },
    policy: {
      loopId: policy?.loopId ?? null,
      tickHash: policy?.tickHash ?? null,
      acceptedProposalCount: policy?.proposalSummary.acceptedProposalCount ?? null,
      unsupportedProposalCount: policy?.proposalSummary.unsupportedProposalCount ?? null,
    },
    restart: {
      lastReceiptStatus: input.restartReceipt?.status ?? null,
      statusBefore: input.restartReceipt?.statusBefore.outcome.kind ?? null,
      statusAfter: input.restartReceipt?.statusAfter.outcome.kind ?? null,
      resetHash: input.restartReceipt?.resetHash ?? null,
    },
    nonClaims: [
      'not_runtime_authority',
      'not_private_transport',
      'not_demo_local_spawn_state',
      'not_combat_authority',
    ],
  };
}

function applyStudioGameplayPresetDraft(
  preset: FpsGameplayPreset,
  draft: StudioFpsGameplayPresetDraft,
): FpsGameplayPreset {
  return {
    ...preset,
    displayName: draft.displayName,
    playerController: {
      ...preset.playerController,
      moveSpeedUnitsPerSecond: draft.moveSpeedUnitsPerSecond,
      lookSensitivityDegreesPerPixel: draft.lookSensitivityDegreesPerPixel,
    },
    weapon: {
      ...preset.weapon,
      damage: draft.weaponDamage,
      ammo: draft.weaponAmmo,
    },
    enemyBehavior: {
      ...preset.enemyBehavior,
      desiredRangeUnits: draft.desiredRangeUnits,
    },
    encounter: {
      ...preset.encounter,
      enemyCount: draft.enemyCount,
    },
  };
}

function buildGameplayPresetFieldReadModels(
  draft: StudioFpsGameplayPresetDraft,
  validation: FpsGameplayPresetValidationReport,
): readonly StudioFpsGameplayPresetFieldReadModel[] {
  return [
    gameplayPresetFieldReadModel({
      field: 'displayName',
      label: 'Display Name',
      value: draft.displayName,
      inputKind: 'text',
      validation,
      paths: ['displayName'],
    }),
    gameplayPresetFieldReadModel({
      field: 'moveSpeedUnitsPerSecond',
      label: 'Move Speed',
      value: String(draft.moveSpeedUnitsPerSecond),
      inputKind: 'number',
      validation,
      paths: ['playerController.moveSpeedUnitsPerSecond'],
    }),
    gameplayPresetFieldReadModel({
      field: 'lookSensitivityDegreesPerPixel',
      label: 'Look Sensitivity',
      value: String(draft.lookSensitivityDegreesPerPixel),
      inputKind: 'number',
      validation,
      paths: ['playerController.lookSensitivityDegreesPerPixel'],
    }),
    gameplayPresetFieldReadModel({
      field: 'weaponDamage',
      label: 'Damage',
      value: String(draft.weaponDamage),
      inputKind: 'number',
      validation,
      paths: ['weapon.damage'],
    }),
    gameplayPresetFieldReadModel({
      field: 'weaponAmmo',
      label: 'Ammo',
      value: String(draft.weaponAmmo),
      inputKind: 'number',
      validation,
      paths: ['weapon.ammo'],
    }),
    gameplayPresetFieldReadModel({
      field: 'enemyCount',
      label: 'Enemies',
      value: String(draft.enemyCount),
      inputKind: 'number',
      validation,
      paths: ['encounter.enemyCount'],
    }),
    gameplayPresetFieldReadModel({
      field: 'desiredRangeUnits',
      label: 'Enemy Range',
      value: String(draft.desiredRangeUnits),
      inputKind: 'number',
      validation,
      paths: ['enemyBehavior.desiredRangeUnits'],
    }),
  ];
}

function gameplayPresetFieldReadModel(input: {
  readonly field: StudioFpsGameplayPresetDraftField;
  readonly label: string;
  readonly value: string;
  readonly inputKind: StudioFpsGameplayPresetFieldReadModel['inputKind'];
  readonly validation: FpsGameplayPresetValidationReport;
  readonly paths: readonly string[];
}): StudioFpsGameplayPresetFieldReadModel {
  const diagnostic = input.validation.diagnostics.find(candidate =>
    input.paths.some(path => candidate.path === path || candidate.path.startsWith(`${path}.`)),
  );
  return {
    field: input.field,
    label: input.label,
    value: input.value,
    inputKind: input.inputKind,
    editable: true,
    validationStatus: diagnostic === undefined ? 'valid' : 'invalid',
    validationMessage: diagnostic?.detail ?? null,
  };
}

function studioGameplayPresetDiagnostic(
  diagnostic: FpsGameplayPresetValidationReport['diagnostics'][number],
): StudioDiagnostic {
  return {
    severity: 'error',
    code: `fps_gameplay_preset_${diagnostic.code}`,
    message: diagnostic.detail,
    source: diagnostic.path,
    remediation: 'Adjust the bounded gameplay preset field and re-run public schema validation.',
  };
}

function buildStudioPlayableLoopInspectionReadModel(input: {
  readonly attached: boolean;
  readonly studioMode: StudioMode;
  readonly attachState: StudioRuntimeSessionInspectionReadModel['attachState'];
  readonly sessionId: string | null;
  readonly state: RuntimeSessionStateSummary | null;
  readonly telemetry: RuntimeSessionTelemetrySummary | null;
  readonly selectedEntity: StudioEntityReadModel | null;
  readonly generatedTunnelReadout: GeneratedTunnelReadout | null;
  readonly navProjection: NavProjectionReadout | null;
  readonly autonomousPolicyTick: RuntimeSessionAutonomousPolicyTickReadout | null;
  readonly lifecycleStatus: RuntimeSessionLifecycleStatusReadout | null;
  readonly restartReceipt: RuntimeSessionLifecycleRestartReceipt | null;
}): StudioPlayableLoopInspectionReadModel {
  const tick = input.autonomousPolicyTick;
  const lifecycle = input.lifecycleStatus;
  const enemyHealth = lifecycle?.enemy.health ?? null;
  const movement = tick?.movementSummary ?? null;
  const policyActor = tick?.proposalReceipts.find(receipt => receipt.actor.length > 0)?.actor ?? null;
  const policyTarget = tick?.proposalReceipts.find(receipt => receipt.target.length > 0)?.target ?? null;
  const selectedEntity = input.attached
    ? {
        entityId: policyActor ?? input.selectedEntity?.id ?? 'generated-tunnel.enemy.1',
        label: policyActor ?? input.selectedEntity?.label ?? 'generated tunnel enemy',
        pose: {
          position: movement?.from ?? null,
          nextWaypoint: movement?.nextWaypoint ?? null,
        },
        health: enemyHealth === null
          ? null
          : {
              current: enemyHealth.current,
              max: enemyHealth.max,
              dead: enemyHealth.dead,
              healthHash: enemyHealth.healthHash,
            },
        capabilitySummary: [
          input.navProjection === null ? 'nav_projection:none' : `nav_projection:${input.navProjection.projectionHash}`,
          tick === null ? 'policy_tick:not_run' : `policy_tick:${tick.loopId}`,
          policyTarget === null ? 'target:none' : `target:${policyTarget}`,
          lifecycle === null ? 'lifecycle:none' : `lifecycle:${lifecycle.outcome.kind}`,
          tick?.combatSummary === null || tick?.combatSummary === undefined
            ? 'combat:none'
            : `combat:${tick.combatSummary.status}`,
        ],
      }
    : null;
  const lifecycleEventKinds = lifecycle?.events.map(event => event.kind) ?? [];
  const restartAvailable = input.attached && lifecycle?.outcome.terminal === true;
  const policyTickAvailable = input.attached;
  const diagnostics: StudioDiagnostic[] = [];
  if (!input.attached) {
    diagnostics.push(studioRuntimeSessionDiagnostic(
      'runtime_session_inspection_unavailable',
      'Playable-loop inspection is unavailable until RuntimeSession is attached.',
      input.sessionId,
      'Attach the public RuntimeSession facade.',
    ));
  }
  if (input.attached && tick === null) {
    diagnostics.push(studioRuntimeSessionDiagnostic(
      'runtime_session_inspection_unavailable',
      'Playable-loop policy tick has not run in this Studio session yet.',
      input.sessionId,
      'Run the public autonomous policy tick control.',
    ));
  }
  const policyStatus: StudioPlayableLoopInspectionReadModel['policy']['status'] =
    input.attached ? tick === null ? 'not_run' : 'ran' : 'unavailable';

  const body = {
    studioMode: input.studioMode,
    attachState: input.attachState,
    session: {
      sessionId: input.sessionId,
      seed: input.state?.identity.seed ?? null,
      tick: input.telemetry?.tick ?? input.state?.tick ?? null,
      sessionHash: input.telemetry?.sessionHash ?? input.state?.sessionHash ?? null,
      replayHash: lifecycle?.hashes.replayHash ?? tick?.combatSummary?.replayHash ?? null,
      replayRecordCount: input.telemetry?.replayRecords.length ?? 0,
      lastRecordKind: input.telemetry?.replayRecords.at(-1)?.kind ?? null,
    },
    generatedLevel: {
      presetId: input.generatedTunnelReadout?.generator.presetId ?? null,
      configHash: input.generatedTunnelReadout?.generator.configHash ?? null,
      outputHash: input.generatedTunnelReadout?.generator.outputHash ?? null,
      navProjectionHash: input.navProjection?.projectionHash ?? null,
    },
    selectedEntity,
    policy: {
      status: policyStatus,
      loopId: tick?.loopId ?? null,
      tick: tick?.tick ?? null,
      fixtureKind: tick?.policy.fixtureKind ?? null,
      proposalHash: tick?.policy.proposalFrame.proposalHash ?? null,
      proposalKinds: tick?.policy.proposalFrame.proposals.map(proposal => proposal.kind) ?? [],
      sourceChecked: tick?.policy.sourceChecked ?? false,
      sourceDiagnosticCount: tick?.policy.sourceDiagnostics.length ?? 0,
      acceptedProposalCount: tick?.proposalSummary.acceptedProposalCount ?? null,
      rejectedProposalCount: tick?.proposalSummary.rejectedProposalCount ?? null,
      unsupportedProposalCount: tick?.proposalSummary.unsupportedProposalCount ?? null,
      movementStatus: tick?.movementSummary?.status ?? null,
      movementReason: tick?.movementSummary?.reason ?? null,
      tickHash: tick?.tickHash ?? null,
    },
    nav: {
      available: input.navProjection?.available ?? false,
      projectionHash: tick?.nav.projectionHash ?? input.navProjection?.projectionHash ?? null,
      pathHash: tick?.nav.pathHash ?? null,
      outcome: tick?.nav.outcome ?? null,
      visited: tick?.nav.visited ?? null,
      pathLength: tick?.nav.pathLength ?? null,
    },
    combat: {
      status: tick?.combatSummary?.status ?? null,
      outcomeKind: tick?.combatSummary?.outcome?.kind ?? null,
      healthHash: tick?.combatSummary?.healthHash ?? lifecycle?.hashes.enemyHealthHash ?? null,
      replayHash: tick?.combatSummary?.replayHash ?? null,
    },
    lifecycle: {
      kind: lifecycle?.kind ?? null,
      scenario: lifecycle?.scenario ?? null,
      outcomeKind: lifecycle?.outcome.kind ?? null,
      label: lifecycle?.outcome.label ?? null,
      terminal: lifecycle?.outcome.terminal ?? false,
      playerHealth: lifecycle === null
        ? null
        : `${lifecycle.player.health.current}/${lifecycle.player.health.max}`,
      enemyHealth: lifecycle === null
        ? null
        : `${lifecycle.enemy.health.current}/${lifecycle.enemy.health.max}`,
      lifecycleHash: lifecycle?.hashes.lifecycleHash ?? null,
      eventKinds: lifecycleEventKinds,
    },
    restart: {
      commandId: 'runtime.restart_session_intent' as const,
      available: restartAvailable,
      disabledReason: restartAvailable
        ? null
        : input.attached
          ? 'lifecycle_not_terminal'
          : 'runtime_session_not_attached',
      lastReceipt: input.restartReceipt === null
        ? null
        : {
            status: input.restartReceipt.status,
            accepted: input.restartReceipt.accepted,
            source: input.restartReceipt.intent.source,
            rejectionReason: input.restartReceipt.rejection?.reason ?? null,
            statusBefore: input.restartReceipt.statusBefore.outcome.kind,
            statusAfter: input.restartReceipt.statusAfter.outcome.kind,
            resetHash: input.restartReceipt.resetHash,
          },
    },
    controls: {
      policyTick: {
        available: policyTickAvailable,
        disabledReason: policyTickAvailable ? null : 'runtime_session_not_attached',
      },
      restart: {
        available: restartAvailable,
        disabledReason: restartAvailable
          ? null
          : input.attached
            ? 'lifecycle_not_terminal'
            : 'runtime_session_not_attached',
      },
    },
    diagnostics,
  };

  return {
    loopVersion: 'studio-playable-loop-inspection.v0',
    ...body,
    nonClaims: [
      'not_runtime_authority',
      'not_private_transport',
      'not_policy_runtime',
      'not_ui_authority',
    ],
    inspectionHash: fnv1aHash('studio-playable-loop-inspection', body),
  };
}

export function buildStudioGeneratedLevelInspectionReadModel(input: {
  readonly attached: boolean;
  readonly gameWorkspace: StudioGameWorkspaceReadModel | null;
  readonly presetDraft: StudioGeneratedLevelPresetDraft;
  readonly liveReadout: GeneratedTunnelReadout | null;
  readonly regenerateReceipt: RuntimeSessionGeneratedTunnelOperationReceipt | null;
  readonly navProjection: NavProjectionReadout | null;
}): StudioGeneratedLevelInspectionReadModel {
  const validationErrors: string[] = [];
  if (input.presetDraft.presetId !== 'tiny-enclosed') {
    validationErrors.push('Only the public tiny-enclosed generator preset is available in this Studio slice.');
  }
  if (!Number.isSafeInteger(input.presetDraft.seed) || input.presetDraft.seed !== 17) {
    validationErrors.push('Only deterministic seed 17 is available through the public generated tunnel fixture.');
  }
  const validationStatus: StudioGeneratedLevelPresetAuthoringReadModel['validationStatus'] =
    validationErrors.length === 0 ? 'valid' : 'invalid';
  const diagnostics: StudioDiagnostic[] = validationErrors.map((message, index) => ({
    severity: 'error',
    code: index === 0 && input.presetDraft.presetId !== 'tiny-enclosed'
      ? 'generated_level_unsupported_preset'
      : 'generated_level_unsupported_seed',
    message,
    source: 'definition_authoring.generated_level_preset',
    remediation: 'Use the public generated tunnel preset exposed by @asha/runtime-bridge.',
  }));

  if (input.gameWorkspace === null) {
    diagnostics.push({
      severity: 'error',
      code: 'generated_level_missing_workspace',
      message: 'Generated-level metadata requires an opened ASHA game workspace.',
      source: null,
      remediation: 'Open a project manifest before inspecting generated-level metadata.',
    });
  }
  if (!input.attached || input.liveReadout === null) {
    diagnostics.push({
      severity: 'info',
      code: 'generated_level_live_not_attached',
      message: 'Live generated-level metadata is unavailable until RuntimeSession is attached.',
      source: input.gameWorkspace?.runtimeEntry ?? null,
      remediation: 'Attach the public RuntimeSession facade.',
    });
  }

  const definitionAuthoring: StudioGeneratedLevelPresetAuthoringReadModel = {
    authoringVersion: 'studio-generated-level-preset-authoring.v0',
    studioMode: 'definition_authoring',
    presetPath: 'definition-authoring/generated-level-presets/tiny-enclosed.json',
    generatorId: input.liveReadout?.generator.generatorId ?? 'asha.tunnel.enclosed.v1',
    fields: [
      {
        field: 'generatorId',
        label: 'Generator',
        value: input.liveReadout?.generator.generatorId ?? 'asha.tunnel.enclosed.v1',
        editable: false,
        inputKind: 'readonly',
        allowedValues: ['asha.tunnel.enclosed.v1'],
        validationStatus: 'valid',
        validationMessage: null,
      },
      {
        field: 'presetId',
        label: 'Preset',
        value: input.presetDraft.presetId,
        editable: true,
        inputKind: 'select',
        allowedValues: ['tiny-enclosed'],
        validationStatus: input.presetDraft.presetId === 'tiny-enclosed' ? 'valid' : 'invalid',
        validationMessage: input.presetDraft.presetId === 'tiny-enclosed'
          ? null
          : 'Unsupported preset for the public generated tunnel readout.',
      },
      {
        field: 'seed',
        label: 'Seed',
        value: String(input.presetDraft.seed),
        editable: true,
        inputKind: 'number',
        allowedValues: ['17'],
        validationStatus: Number.isSafeInteger(input.presetDraft.seed) && input.presetDraft.seed === 17
          ? 'valid'
          : 'invalid',
        validationMessage: Number.isSafeInteger(input.presetDraft.seed) && input.presetDraft.seed === 17
          ? null
          : 'Unsupported seed for the public generated tunnel readout.',
      },
    ],
    validationStatus,
    validationErrors,
    boundary: {
      storedPresetEditing: true,
      liveRuntimeMutation: false,
      runtimeToDefinitionExport: false,
    },
  };

  const regenerateAvailable = input.attached && validationStatus === 'valid';
  const liveInspection: StudioGeneratedLevelLiveReadModel = {
    liveVersion: 'studio-generated-level-live.v0',
    studioMode: input.attached ? 'live_runtime_inspection' : 'definition_authoring',
    attachState: input.gameWorkspace === null ? 'unavailable' : input.attached ? 'attached' : 'not_attached',
    readoutAvailable: input.liveReadout !== null,
    generator: {
      generatorId: input.liveReadout?.generator.generatorId ?? null,
      presetId: input.liveReadout?.generator.presetId ?? null,
      seed: input.liveReadout?.generator.seed ?? null,
      configHash: input.liveReadout?.generator.configHash ?? null,
      outputHash: input.liveReadout?.generator.outputHash ?? null,
      replayHash: input.liveReadout?.replayHash ?? null,
    },
    volume: {
      tunnelDims: input.liveReadout?.volume.tunnelDims ?? null,
      solidVoxels: input.liveReadout?.volume.solidVoxels ?? null,
      corridorCount: input.liveReadout?.corridors.count ?? null,
      roomCount: input.liveReadout?.rooms.count ?? null,
    },
    projections: {
      renderHash: input.liveReadout?.renderProjection.hash ?? null,
      collisionHash: input.liveReadout?.collisionProjection.hash ?? null,
      navAvailable: input.navProjection?.available ?? false,
      navProjectionHash: input.navProjection?.projectionHash ?? null,
    },
    spawnMarkers: input.liveReadout?.spawnMarkers.map(marker => ({
      id: marker.id,
      kind: marker.kind,
      voxel: marker.voxel,
      world: marker.world,
    })) ?? [],
    regenerate: {
      commandId: 'runtime.generated_tunnel.regenerate',
      available: regenerateAvailable,
      disabledReason: regenerateAvailable
        ? null
        : input.gameWorkspace === null
          ? 'workspace_not_open'
          : input.attached
            ? 'preset_validation_failed'
            : 'runtime_session_not_attached',
      lastReceipt: input.regenerateReceipt === null
        ? null
        : {
            operation: input.regenerateReceipt.operation,
            status: input.regenerateReceipt.status,
            reason: input.regenerateReceipt.status === 'unsupported'
              ? input.regenerateReceipt.reason
              : null,
            sequenceId: input.regenerateReceipt.sequenceId,
            sessionHashAfter: input.regenerateReceipt.sessionHashAfter,
          },
    },
  };

  const body = {
    definitionAuthoring,
    liveInspection,
    diagnostics,
  };

  return {
    inspectionVersion: 'studio-generated-level-inspection.v0',
    ...body,
    nonClaims: [
      'not_local_generation_algorithm',
      'not_runtime_authority',
      'not_runtime_to_definition_export',
      'not_live_runtime_mutation_from_authoring',
    ],
    inspectionHash: fnv1aHash('studio-generated-level-inspection', body),
  };
}

export function buildStudioRunningProjectDiscovery(input: {
  readonly workspace: StudioGameWorkspaceReadModel | null;
  readonly runtimeSessions?: StudioRuntimeSessionListReadModel | null;
  readonly attemptedPrivateTransport?: boolean;
}): StudioRunningProjectDiscoveryReadModel {
  const diagnostics: StudioDiagnostic[] = [];
  const workspace = input.workspace;
  const runtimeSessions = input.runtimeSessions ?? null;
  if (workspace === null) {
    diagnostics.push(studioRunningProjectDiscoveryDiagnostic(
      'running_project_missing_workspace',
      'Running project discovery requires an opened ASHA game workspace.',
      null,
      'Open a project manifest before connecting.',
    ));
  }
  if (workspace !== null && workspace.attachEndpoint.length === 0) {
    diagnostics.push(studioRunningProjectDiscoveryDiagnostic(
      'running_project_missing_endpoint',
      'Opened workspace does not expose a devtools endpoint.',
      workspace.gameId,
      'Set runtime.devtools_endpoint in asha.game.toml.',
    ));
  }
  if (input.attemptedPrivateTransport === true) {
    diagnostics.push(studioRunningProjectDiscoveryDiagnostic(
      'running_project_private_transport',
      'Running project discovery must use the public devtools handshake, not private transports.',
      workspace?.attachEndpoint ?? null,
      'Use handshake.request through the shared connect command.',
    ));
  }

  const sessions = runtimeSessions?.sessions.map(session => {
    const sessionDiagnostics: StudioDiagnostic[] = [...session.diagnostics];
    if (session.sessionType === 'attached' && session.backendCompatibilityState !== 'compatible') {
      sessionDiagnostics.push(studioRunningProjectDiscoveryDiagnostic(
        'running_project_incompatible',
        `Running project session ${session.sessionId} is not compatible with the opened workspace.`,
        session.endpoint,
        session.backendCompatibilityState,
      ));
    }
    if (session.sessionType === 'attached' && (session.liveHash === null || session.projection === null)) {
      sessionDiagnostics.push(studioRunningProjectDiscoveryDiagnostic(
        'running_project_stale_live_readback',
        `Running project session ${session.sessionId} has no fresh live readback.`,
        session.endpoint,
        session.attachHash,
      ));
    }
    return {
      sessionId: session.sessionId,
      status: session.status,
      sessionType: session.sessionType,
      runtimeMode: session.runtimeMode,
      backendMode: session.backendMode,
      backendCompatibilityState: session.backendCompatibilityState,
      attachStatus: session.attachStatus,
      liveHash: session.liveHash,
      runtimeSessionSummaryHash: session.projection?.runtimeSessionSummaryHash ?? null,
      diagnostics: sessionDiagnostics,
    };
  }) ?? [];

  const activeSession = runtimeSessions === null
    ? null
    : runtimeSessions.sessions.find(session => session.sessionId === runtimeSessions.activeSessionId) ?? null;
  if (workspace !== null && activeSession !== null && activeSession.sessionType !== 'attached') {
    diagnostics.push(studioRunningProjectDiscoveryDiagnostic(
      'running_project_not_attached',
      'No running project is currently attached.',
      workspace.attachEndpoint,
      'Use Connect Running Project.',
    ));
  }
  diagnostics.push(...(runtimeSessions?.diagnostics ?? []));
  diagnostics.push(...sessions.flatMap(session => session.diagnostics));
  const connected = activeSession?.sessionType === 'attached'
    && activeSession.attachStatus === 'attached'
    && activeSession.backendCompatibilityState === 'compatible'
    && activeSession.liveHash !== null;

  return {
    discoveryVersion: 'studio-running-project-discovery.v0',
    workspaceHash: workspace?.workspaceHash ?? 'missing',
    gameId: workspace?.gameId ?? 'missing',
    endpoint: workspace?.attachEndpoint ?? null,
    sessions,
    activeSessionId: runtimeSessions?.activeSessionId ?? null,
    canConnect: workspace !== null && !connected,
    canDisconnect: connected,
    canRefresh: workspace !== null,
    diagnostics,
    commandIds: {
      refresh: 'project.refresh_sessions',
      connect: 'project.connect_running',
      disconnect: 'project.disconnect_running',
    },
    nonClaims: [
      'not_network_scan',
      'not_private_transport',
      'not_runtime_authority',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
    ],
    discoveryHash: fnv1aHash('studio-running-project-discovery', {
      workspaceHash: workspace?.workspaceHash ?? 'missing',
      endpoint: workspace?.attachEndpoint ?? null,
      activeSessionId: runtimeSessions?.activeSessionId ?? null,
      sessions,
      diagnostics,
    }),
  };
}

export interface StudioAssetInventoryArtifactInput {
  readonly artifactKind?: string;
  readonly artifactVersion?: string;
  readonly status?: string;
  readonly sourceManifest?: {
    readonly path?: string;
    readonly hash?: string;
  };
  readonly catalog?: {
    readonly path?: string;
    readonly hash?: string;
  };
  readonly diagnostics?: readonly {
    readonly code?: string;
    readonly path?: string;
    readonly message?: string;
  }[];
  readonly dependencyOrder?: readonly string[];
  readonly entries?: readonly {
    readonly assetId?: string;
    readonly kind?: string;
    readonly sourcePath?: string;
    readonly dependencies?: readonly string[];
    readonly devResolution?: {
      readonly sourceHash?: string | null;
      readonly devCacheKey?: string;
      readonly generatedArtifactVersion?: string | null;
      readonly importStatus?: string;
      readonly publishOutputKey?: string;
    } | null;
    readonly publishResolution?: {
      readonly outputKey?: string;
      readonly packedPath?: string;
      readonly packedHash?: string | null;
      readonly packedBytes?: number | null;
    } | null;
    readonly diagnostics?: readonly {
      readonly code?: string;
      readonly path?: string;
      readonly message?: string;
    }[];
    readonly evidenceRefs?: readonly {
      readonly kind?: string;
      readonly path?: string;
      readonly sha256?: string | null;
    }[];
  }[];
}

export function loadStudioAssetInventory(
  artifact: StudioAssetInventoryArtifactInput,
  options: {
    readonly referencedRenderableIds?: Readonly<Record<string, readonly string[]>>;
  } = {},
): StudioAssetInventoryLoadResult {
  const diagnostics: StudioDiagnostic[] = [];
  if (
    artifact.artifactKind !== 'asha_demo_asset_inventory'
    || artifact.artifactVersion !== 'asset-inventory.v1'
  ) {
    diagnostics.push(studioAssetInventoryDiagnostic(
      'asset_inventory_artifact_mismatch',
      'Asset inventory artifact must be asha_demo_asset_inventory asset-inventory.v1.',
      artifact.artifactKind ?? null,
      artifact.artifactVersion ?? null,
    ));
  }

  const rawEntries = artifact.entries ?? [];
  if (rawEntries.length === 0) {
    diagnostics.push(studioAssetInventoryDiagnostic(
      'asset_inventory_missing_entry',
      'Asset inventory must include at least one catalog entry.',
      artifact.catalog?.path ?? null,
      artifact.status ?? null,
    ));
  }

  const globalDiagnostics = (artifact.diagnostics ?? []).map(diagnostic =>
    studioAssetInventoryDiagnostic(
      'asset_inventory_diagnostic',
      diagnostic.message ?? 'Asset inventory emitted a diagnostic.',
      diagnostic.path ?? null,
      diagnostic.code ?? null,
    ),
  );
  diagnostics.push(...globalDiagnostics);

  const entryIds = new Set(
    rawEntries
      .map(entry => entry.assetId)
      .filter((assetId): assetId is string => typeof assetId === 'string' && assetId.length > 0),
  );
  const dependencyOrder = artifact.dependencyOrder ?? [];
  for (const assetId of entryIds) {
    if (!dependencyOrder.includes(assetId)) {
      diagnostics.push(studioAssetInventoryDiagnostic(
        'asset_inventory_dependency_mismatch',
        `Asset ${assetId} is missing from dependency order.`,
        artifact.catalog?.path ?? null,
        assetId,
      ));
    }
  }

  const entries: StudioAssetInventoryEntryReadModel[] = rawEntries.map((entry, index) => {
    const entryDiagnostics = (entry.diagnostics ?? []).map(diagnostic =>
      studioAssetInventoryDiagnostic(
        'asset_inventory_diagnostic',
        diagnostic.message ?? 'Asset entry emitted a diagnostic.',
        diagnostic.path ?? `entries[${index}]`,
        diagnostic.code ?? null,
      ),
    );
    if (entry.devResolution === null || entry.devResolution === undefined) {
      entryDiagnostics.push(studioAssetInventoryDiagnostic(
        'asset_inventory_missing_resolution',
        `Asset ${entry.assetId ?? index} is missing dev resolution.`,
        entry.sourcePath ?? `entries[${index}]`,
        entry.assetId ?? null,
      ));
    }
    if (entry.publishResolution === null || entry.publishResolution === undefined) {
      entryDiagnostics.push(studioAssetInventoryDiagnostic(
        'asset_inventory_missing_resolution',
        `Asset ${entry.assetId ?? index} is missing publish resolution.`,
        entry.sourcePath ?? `entries[${index}]`,
        entry.assetId ?? null,
      ));
    }

    const dependencies = entry.dependencies ?? [];
    const missingDependencies = dependencies.filter(dependency => !entryIds.has(dependency));
    if (missingDependencies.length > 0) {
      entryDiagnostics.push(studioAssetInventoryDiagnostic(
        'asset_inventory_dependency_mismatch',
        `Asset ${entry.assetId ?? index} references missing dependencies: ${missingDependencies.join(', ')}`,
        entry.sourcePath ?? `entries[${index}]`,
        entry.assetId ?? null,
      ));
    }

    diagnostics.push(...entryDiagnostics);
    const assetId = entry.assetId ?? `missing-asset-id-${index}`;
    return {
      assetId,
      kind: entry.kind ?? 'unknown',
      sourcePath: entry.sourcePath ?? 'unknown',
      dependencies,
      dependencyStatus:
        dependencies.length === 0
          ? 'none'
          : missingDependencies.length > 0
            ? 'missing'
            : 'resolved',
      devResolution: entry.devResolution === null || entry.devResolution === undefined
        ? null
        : {
            sourceHash: entry.devResolution.sourceHash ?? null,
            devCacheKey: entry.devResolution.devCacheKey ?? 'unknown',
            generatedArtifactVersion: entry.devResolution.generatedArtifactVersion ?? null,
            importStatus: entry.devResolution.importStatus ?? 'unknown',
            publishOutputKey: entry.devResolution.publishOutputKey ?? 'unknown',
          },
      publishResolution: entry.publishResolution === null || entry.publishResolution === undefined
        ? null
        : {
            outputKey: entry.publishResolution.outputKey ?? 'unknown',
            packedPath: entry.publishResolution.packedPath ?? 'unknown',
            packedHash: entry.publishResolution.packedHash ?? null,
            packedBytes: entry.publishResolution.packedBytes ?? null,
          },
      diagnostics: entryDiagnostics,
      evidenceRefs: (entry.evidenceRefs ?? []).map(ref => ({
        kind: ref.kind ?? 'unknown',
        path: ref.path ?? 'unknown',
        sha256: ref.sha256 ?? null,
      })),
      referencedRenderableIds: options.referencedRenderableIds?.[assetId] ?? [],
    };
  });

  const inventory: StudioAssetInventoryReadModel = {
    inventoryVersion: 'studio-asset-inventory.v0',
    artifactKind: 'asha_demo_asset_inventory',
    artifactVersion: 'asset-inventory.v1',
    status: artifact.status === 'ok' && diagnostics.length === 0 ? 'ok' : 'diagnostics',
    sourceManifestPath: artifact.sourceManifest?.path ?? 'unknown',
    sourceManifestHash: artifact.sourceManifest?.hash ?? 'unknown',
    catalogPath: artifact.catalog?.path ?? 'unknown',
    catalogHash: artifact.catalog?.hash ?? 'unknown',
    dependencyOrder,
    entries,
    diagnostics,
    inventoryHash: fnv1aHash('studio-asset-inventory', {
      artifactKind: artifact.artifactKind,
      artifactVersion: artifact.artifactVersion,
      sourceManifest: artifact.sourceManifest,
      catalog: artifact.catalog,
      status: artifact.status,
      dependencyOrder,
      entries,
      diagnostics,
    }),
  };

  if (diagnostics.length > 0) {
    return { ok: false, inventory, diagnostics };
  }
  return { ok: true, inventory, diagnostics: [] };
}

export function studioCatalogAuthoringBaseHash(catalog: AshaGameAssetCatalog): string {
  return fnv1aHash('studio-catalog-authoring-base', catalog);
}

export function buildStudioCatalogAuthoringOperation(
  catalog: AshaGameAssetCatalog,
  request: StudioCatalogAuthoringOperationRequest,
): StudioCatalogAuthoringOperationResult {
  const diagnostics: StudioDiagnostic[] = [];
  const actualBaseHash = studioCatalogAuthoringBaseHash(catalog);
  if (request.expectedBaseHash !== actualBaseHash) {
    diagnostics.push(studioCatalogAuthoringDiagnostic(
      'stale_catalog_source_hash',
      'Catalog authoring operation expectedBaseHash does not match the current catalog source hash.',
      request.operation.kind,
      `${request.expectedBaseHash} != ${actualBaseHash}`,
    ));
  }

  const entriesById = new Map(catalog.entries.map(entry => [entry.id, entry]));
  if (request.operation.kind === 'create_catalog_entry') {
    validateCatalogEntryForAuthoring(request.operation.entry, catalog, diagnostics);
    if (entriesById.has(request.operation.entry.id)) {
      diagnostics.push(studioCatalogAuthoringDiagnostic(
        'duplicate_catalog_asset_id',
        `Cannot create duplicate catalog asset id ${request.operation.entry.id}.`,
        request.operation.entry.id,
        null,
      ));
    }
  } else {
    const current = entriesById.get(request.operation.assetId);
    if (current === undefined) {
      diagnostics.push(studioCatalogAuthoringDiagnostic(
        'missing_catalog_asset_id',
        `Cannot ${request.operation.kind} missing catalog asset id ${request.operation.assetId}.`,
        request.operation.assetId,
        null,
      ));
    }
    if (request.operation.kind === 'update_catalog_entry') {
      for (const key of Object.keys(request.operation.patch)) {
        if (!['source', 'importProfile', 'importMetadata', 'dependencies', 'publish', 'diagnostics'].includes(key)) {
          diagnostics.push(studioCatalogAuthoringDiagnostic(
            'unsupported_catalog_authoring_field',
            `Catalog authoring update field is not supported: ${key}.`,
            request.operation.assetId,
            key,
          ));
        }
      }
      if (current !== undefined) {
        validateCatalogEntryForAuthoring(
          mergeCatalogEntryPatch(current, request.operation.patch),
          catalog,
          diagnostics,
          request.operation.assetId,
        );
      }
    }
  }

  const readModel: StudioCatalogAuthoringOperationReadModel = {
    operationVersion: 'studio-catalog-authoring-operation.v0',
    operationKind: request.operation.kind,
    expectedBaseHash: request.expectedBaseHash,
    actualBaseHash,
    actor: request.actor,
    operation: request.operation,
    diagnostics,
    nonClaims: [
      'not_private_asset_database',
      'not_source_write_until_save_operation',
      'not_runtime_authority',
    ],
    operationHash: fnv1aHash('studio-catalog-authoring-operation', {
      actualBaseHash,
      request,
      diagnostics,
    }),
  };

  return diagnostics.length === 0
    ? { ok: true, operation: readModel, diagnostics: [] }
    : { ok: false, operation: readModel, diagnostics };
}

export function applyStudioCatalogAuthoringOperation(
  catalog: AshaGameAssetCatalog,
  request: StudioCatalogAuthoringOperationRequest,
): StudioCatalogAuthoringApplyResult {
  const operation = buildStudioCatalogAuthoringOperation(catalog, request);
  if (!operation.ok) {
    return {
      ok: false,
      catalog,
      operation: operation.operation,
      diagnostics: operation.diagnostics,
      catalogHash: studioCatalogAuthoringBaseHash(catalog),
    };
  }
  const requestedOperation = request.operation;
  let nextCatalog: AshaGameAssetCatalog = catalog;
  switch (requestedOperation.kind) {
    case 'create_catalog_entry':
      nextCatalog = {
        ...catalog,
        entries: [...catalog.entries, requestedOperation.entry],
      };
      break;
    case 'update_catalog_entry':
      nextCatalog = {
        ...catalog,
        entries: catalog.entries.map(entry =>
          entry.id === requestedOperation.assetId
            ? mergeCatalogEntryPatch(entry, requestedOperation.patch)
            : entry,
        ),
      };
      break;
    case 'remove_catalog_entry':
      nextCatalog = {
        ...catalog,
        entries: catalog.entries.filter(entry => entry.id !== requestedOperation.assetId),
      };
      break;
  }

  return {
    ok: true,
    catalog: nextCatalog,
    operation: operation.operation,
    diagnostics: [],
    catalogHash: studioCatalogAuthoringBaseHash(nextCatalog),
  };
}

export function buildStudioCatalogWorkflowReadModel(input: {
  readonly workspace: StudioGameWorkspaceReadModel | null;
  readonly catalogPath: string;
  readonly catalog: AshaGameAssetCatalog | null;
  readonly catalogHash: string;
  readonly selectedAssetId?: string | null;
  readonly sourceEvidence?: readonly StudioCatalogSourceEvidenceInput[];
  readonly referencedRenderableIds?: Readonly<Record<string, readonly string[]>>;
}): StudioCatalogWorkflowReadModel {
  const diagnostics: StudioDiagnostic[] = [];
  const sourceEvidence = new Map((input.sourceEvidence ?? []).map(evidence => [evidence.path, evidence]));
  if (input.workspace === null) {
    diagnostics.push(studioCatalogWorkflowDiagnostic(
      'catalog_workflow_missing_workspace',
      'Catalog workflow requires an opened game workspace.',
      input.catalogPath,
      'Open a game workspace before editing catalogs.',
    ));
  }
  const allowedCatalogRoots = input.workspace?.catalogPackages ?? [];
  const allowed = allowedCatalogRoots.some(root =>
    input.catalogPath === `${root}/catalog.json` || input.catalogPath.startsWith(`${root}/`),
  );
  if (input.workspace !== null && !allowed) {
    diagnostics.push(studioCatalogWorkflowDiagnostic(
      'catalog_workflow_path_not_allowed',
      `Catalog path ${input.catalogPath} is outside manifest catalog packages.`,
      input.catalogPath,
      `Use one of: ${allowedCatalogRoots.join(', ')}`,
    ));
  }
  if (input.catalog === null) {
    diagnostics.push(studioCatalogWorkflowDiagnostic(
      'catalog_workflow_invalid_schema',
      'Catalog source must parse as an ASHA game asset catalog.',
      input.catalogPath,
      'Load or create a catalog.json source.',
    ));
  }
  if (input.catalog !== null && input.catalog.entries.length === 0) {
    diagnostics.push(studioCatalogWorkflowDiagnostic(
      'catalog_workflow_missing_entry',
      'Catalog source must contain at least one asset entry before it is useful.',
      input.catalogPath,
      'Link an asset entry into the catalog.',
    ));
  }

  const validation = input.catalog === null || input.workspace === null
    ? null
    : validateAshaGameAssetCatalog(
        input.catalog,
        input.workspace.manifest,
        path => sourceEvidence.get(path)?.exists ?? false,
        { sourceHash: path => sourceEvidence.get(path)?.hash ?? null },
      );
  if (validation !== null && !validation.ok) {
    for (const diagnostic of validation.diagnostics) {
      diagnostics.push(studioCatalogWorkflowDiagnostic(
        'catalog_workflow_validation_diagnostic',
        diagnostic.message,
        diagnostic.path,
        diagnostic.code,
      ));
    }
  }

  const assetIds = new Set(input.catalog?.entries.map(entry => entry.id) ?? []);
  const assets = (input.catalog?.entries ?? []).map(entry => {
    const assetDiagnostics: StudioDiagnostic[] = [];
    const evidence = sourceEvidence.get(entry.source) ?? null;
    if (evidence !== null && !evidence.exists) {
      assetDiagnostics.push(studioCatalogWorkflowDiagnostic(
        'catalog_workflow_source_missing',
        `Catalog asset ${entry.id} source is missing: ${entry.source}.`,
        entry.source,
        'Create the source file or update the catalog entry source.',
      ));
    }
    const expectedSourceHash = entry.importMetadata?.sourceHash ?? null;
    const sourceHashMatches = evidence?.hash === null || expectedSourceHash === null || evidence === null
      ? null
      : evidence.hash === expectedSourceHash;
    if (sourceHashMatches === false) {
      assetDiagnostics.push(studioCatalogWorkflowDiagnostic(
        'catalog_workflow_source_hash_mismatch',
        `Catalog asset ${entry.id} source hash does not match import metadata.`,
        entry.source,
        `${expectedSourceHash} != ${evidence?.hash ?? 'missing'}`,
      ));
    }
    const dependencies = entry.dependencies ?? [];
    const missingDependencies = dependencies.filter(dependency => !assetIds.has(dependency));
    if (missingDependencies.length > 0) {
      assetDiagnostics.push(studioCatalogWorkflowDiagnostic(
        'catalog_workflow_validation_diagnostic',
        `Catalog asset ${entry.id} depends on missing assets: ${missingDependencies.join(', ')}.`,
        entry.id,
        'missing_asset_dependency',
      ));
    }
    diagnostics.push(...assetDiagnostics);
    const preview: StudioCatalogAssetPreviewReadModel = {
      assetId: entry.id,
      kind: entry.kind,
      sourcePath: entry.source,
      sourceExists: evidence?.exists ?? false,
      sourceHash: evidence?.hash ?? null,
      expectedSourceHash,
      sourceHashMatches,
      dependencies,
      dependencyStatus:
        dependencies.length === 0
          ? 'none'
          : missingDependencies.length === 0
            ? 'resolved'
            : 'missing',
      missingDependencies,
      publishOutputKey: entry.publish.outputKey,
      referencedRenderableIds: input.referencedRenderableIds?.[entry.id] ?? [],
      diagnostics: assetDiagnostics,
      previewHash: fnv1aHash('studio-catalog-asset-preview', {
        entry,
        evidence,
        missingDependencies,
        referencedRenderableIds: input.referencedRenderableIds?.[entry.id] ?? [],
      }),
    };
    return preview;
  });
  const selectedAsset = assets.find(asset => asset.assetId === input.selectedAssetId) ?? assets.at(0) ?? null;

  return {
    workflowVersion: 'studio-catalog-workflow.v0',
    catalogPath: input.catalogPath,
    catalogHash: input.catalogHash,
    entryCount: input.catalog?.entries.length ?? 0,
    selectedAssetId: selectedAsset?.assetId ?? null,
    selectedAsset,
    assets,
    diagnostics,
    commandIds: {
      create: 'catalog.create_source',
      load: 'catalog.load_source',
      save: 'catalog.save_source',
      linkAsset: 'catalog.link_asset',
      updateAsset: 'catalog.update_asset',
      removeAsset: 'catalog.remove_asset',
      validate: 'catalog.validate_source',
    },
    previewStrategy: {
      now: ['metadata', 'dependency_status', 'source_hash', 'referenced_renderables'],
      deferred: ['mesh_preview', 'material_preview', 'texture_preview', 'runtime_loaded_preview'],
    },
    nonClaims: [
      'not_mesh_material_texture_preview',
      'not_private_asset_database',
      'not_runtime_authority',
      'not_publish_builder',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
    ],
    workflowHash: fnv1aHash('studio-catalog-workflow', {
      catalogPath: input.catalogPath,
      catalogHash: input.catalogHash,
      selectedAssetId: selectedAsset?.assetId ?? null,
      assets,
      diagnostics,
    }),
  };
}

function npmRunScriptName(command: string): string | null {
  const match = /^npm run ([A-Za-z0-9:_-]+)$/.exec(command);
  return match?.[1] ?? null;
}

function workspaceSourceOperationKind(
  path: string,
): 'authoring.catalog.save_source' | null {
  if (path.endsWith('/catalog.json')) {
    return 'authoring.catalog.save_source';
  }
  return null;
}

function studioGameWorkspaceDiagnostic(
  code: StudioGameWorkspaceDiagnosticCode,
  message: string,
  source: string,
  detail: string,
): StudioDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    source,
    remediation: `asha.game.toml:${detail}`,
  };
}

function studioWorkspaceOpenReadDiagnostic(
  code: StudioWorkspaceOpenReadDiagnosticCode,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    source,
    remediation,
  };
}

function studioSceneAuthoringDiagnostic(
  code: StudioSceneAuthoringDiagnosticCode,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    source,
    remediation,
  };
}

function studioCatalogAuthoringDiagnostic(
  code: StudioCatalogAuthoringDiagnosticCode,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    source,
    remediation,
  };
}

function studioCatalogWorkflowDiagnostic(
  code: StudioCatalogWorkflowDiagnosticCode,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return {
    severity: code === 'catalog_workflow_validation_diagnostic' ? 'warning' : 'error',
    code,
    message,
    source,
    remediation,
  };
}

function validateCatalogEntryForAuthoring(
  entry: AshaGameAssetCatalogEntry,
  catalog: AshaGameAssetCatalog,
  diagnostics: StudioDiagnostic[],
  originalAssetId: string | null = null,
): void {
  if (entry.id.length === 0) {
    diagnostics.push(studioCatalogAuthoringDiagnostic(
      'missing_catalog_asset_id',
      'Catalog entry id is required.',
      originalAssetId,
      null,
    ));
  }
  const kindConfig = catalogKindConfig(entry.kind);
  if (!entry.source.startsWith('assets/')) {
    diagnostics.push(studioCatalogAuthoringDiagnostic(
      'invalid_catalog_asset_source',
      `Catalog asset ${entry.id} source must stay under assets/.`,
      entry.source,
      entry.id,
    ));
  }
  if (kindConfig === null) {
    diagnostics.push(studioCatalogAuthoringDiagnostic(
      'unsupported_catalog_asset_kind',
      `Catalog asset kind is not supported for Studio authoring: ${entry.kind}.`,
      entry.id,
      entry.kind,
    ));
  } else {
    if (!entry.source.endsWith(kindConfig.sourceSuffix)) {
      diagnostics.push(studioCatalogAuthoringDiagnostic(
        'invalid_catalog_asset_source',
        `Catalog asset ${entry.id} source must end with ${kindConfig.sourceSuffix}.`,
        entry.source,
        entry.id,
      ));
    }
    if (entry.importProfile !== kindConfig.importProfile) {
      diagnostics.push(studioCatalogAuthoringDiagnostic(
        'invalid_catalog_asset_metadata',
        `Catalog asset ${entry.id} must use import profile ${kindConfig.importProfile}.`,
        entry.id,
        entry.importProfile ?? 'missing',
      ));
    }
    if (!entry.publish.outputKey.startsWith(kindConfig.outputPrefix) || !entry.publish.outputKey.endsWith(kindConfig.sourceSuffix)) {
      diagnostics.push(studioCatalogAuthoringDiagnostic(
        'invalid_catalog_asset_metadata',
        `Catalog asset ${entry.id} publish output must use ${kindConfig.outputPrefix}*${kindConfig.sourceSuffix}.`,
        entry.publish.outputKey,
        entry.id,
      ));
    }
  }
  const metadata = entry.importMetadata;
  if (
    metadata === undefined
    || !metadata.sourceHash.startsWith('sha256:')
    || metadata.cacheKey.length === 0
    || metadata.generatedArtifactVersion.length === 0
  ) {
    diagnostics.push(studioCatalogAuthoringDiagnostic(
      'invalid_catalog_asset_metadata',
      `Catalog asset ${entry.id} import metadata must include source hash, cache key, and generated artifact version.`,
      entry.id,
      null,
    ));
  }
  const ids = new Set(catalog.entries.map(candidate => candidate.id));
  for (const dependency of entry.dependencies ?? []) {
    if (!ids.has(dependency)) {
      diagnostics.push(studioCatalogAuthoringDiagnostic(
        'missing_catalog_dependency',
        `Catalog asset ${entry.id} depends on missing asset ${dependency}.`,
        entry.id,
        dependency,
      ));
    }
  }
}

function mergeCatalogEntryPatch(
  current: AshaGameAssetCatalogEntry,
  patch: Extract<StudioCatalogAuthoringOperation, { readonly kind: 'update_catalog_entry' }>['patch'],
): AshaGameAssetCatalogEntry {
  const merged = {
    id: current.id,
    kind: current.kind,
    source: patch.source ?? current.source,
    importProfile: Object.prototype.hasOwnProperty.call(patch, 'importProfile')
      ? (patch.importProfile ?? null)
      : current.importProfile,
    publish: patch.publish ?? current.publish,
    diagnostics: patch.diagnostics ?? current.diagnostics,
  };
  const importMetadata = Object.prototype.hasOwnProperty.call(patch, 'importMetadata')
    ? patch.importMetadata
    : current.importMetadata;
  const dependencies = patch.dependencies ?? current.dependencies;
  const withDependencies = dependencies === undefined ? merged : { ...merged, dependencies };
  return importMetadata === undefined ? withDependencies : { ...withDependencies, importMetadata };
}

function catalogKindConfig(kind: AshaGameAssetKind): {
  readonly importProfile: string;
  readonly sourceSuffix: string;
  readonly outputPrefix: string;
} | null {
  if (kind === 'static_mesh') {
    return {
      importProfile: 'inline-static-mesh.v0',
      sourceSuffix: '.mesh.json',
      outputPrefix: 'meshes/',
    };
  }
  if (kind === 'material') {
    return {
      importProfile: 'inline-material.v0',
      sourceSuffix: '.material.json',
      outputPrefix: 'materials/',
    };
  }
  if (kind === 'texture') {
    return {
      importProfile: 'inline-texture.v0',
      sourceSuffix: '.texture.json',
      outputPrefix: 'textures/',
    };
  }
  return null;
}

function studioGameWorkspaceAttachDiagnostic(
  code: StudioGameWorkspaceAttachDiagnosticCode,
  message: string,
  source: string,
  detail: string,
): StudioDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    source,
    remediation: `devtools.attach:${detail}`,
  };
}

function studioGameWorkspaceLiveDiagnostic(
  code: StudioGameWorkspaceLiveDiagnosticCode,
  message: string,
  source: string,
  detail: string,
): StudioDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    source,
    remediation: `devtools.live:${detail}`,
  };
}

function studioGameWorkspaceCommandDiagnostic(
  code: StudioGameWorkspaceCommandDiagnosticCode,
  message: string,
  source: string,
  detail: string,
): StudioDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    source,
    remediation: `devtools.command:${detail}`,
  };
}

function studioRuntimeSessionDiagnostic(
  code: StudioRuntimeSessionDiagnosticCode,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    source,
    remediation,
  };
}

function studioRunningProjectDiscoveryDiagnostic(
  code: StudioRunningProjectDiscoveryDiagnosticCode,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return {
    severity: code === 'running_project_not_attached' ? 'info' : 'error',
    code,
    message,
    source,
    remediation,
  };
}

function studioAssetInventoryDiagnostic(
  code: StudioAssetInventoryDiagnosticCode,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    source,
    remediation,
  };
}

function buildSceneHash(renderables: readonly StudioSceneRenderableReadModel[]): string {
  const hashPayload = renderables.map(renderable => ({
    renderableId: renderable.renderableId,
    sourceState: renderable.sourceState,
    bounds: renderable.bounds,
    renderHash: renderable.renderHash,
  }));
  return fnv1aHash('scene-view', hashPayload);
}

export function buildStudioRenderSettingsReadModel(options: {
  readonly wireframeEnabled?: boolean;
  readonly showGrid?: boolean;
  readonly showPreviewGhosts?: boolean;
  readonly showReadbackOverlay?: boolean;
  readonly showRaycastHitDebug?: boolean;
  readonly lightingMode?: StudioLightingMode;
} = {}): StudioRenderSettingsReadModel {
  const render = {
    wireframeEnabled: options.wireframeEnabled ?? false,
    showGrid: options.showGrid ?? true,
    showPreviewGhosts: options.showPreviewGhosts ?? true,
    showReadbackOverlay: options.showReadbackOverlay ?? false,
    showRaycastHitDebug: options.showRaycastHitDebug ?? false,
    lightingMode: options.lightingMode ?? 'work_light',
  };
  return {
    ...render,
    renderSettingsHash: fnv1aHash('render-settings', render),
  };
}

export function buildStudioPreferencesReadModel(options: {
  readonly render?: Partial<Omit<StudioRenderSettingsReadModel, 'renderSettingsHash'>>;
} = {}): StudioPreferencesReadModel {
  const render = buildStudioRenderSettingsReadModel(options.render ?? {});
  const payload = {
    preferencesVersion: 'studio-preferences.v0',
    render,
  };
  return {
    schemaVersion: 1,
    artifactKind: 'studio_preferences',
    preferencesVersion: 'studio-preferences.v0',
    render,
    preferencesHash: fnv1aHash('studio-preferences', payload),
  };
}

export function updateStudioRenderSetting(
  preferences: StudioPreferencesReadModel,
  key: StudioRenderSettingKey,
  value: boolean,
): StudioPreferencesReadModel {
  return buildStudioPreferencesReadModel({
    render: {
      wireframeEnabled: preferences.render.wireframeEnabled,
      showGrid: preferences.render.showGrid,
      showPreviewGhosts: preferences.render.showPreviewGhosts,
      showReadbackOverlay: preferences.render.showReadbackOverlay,
      showRaycastHitDebug: preferences.render.showRaycastHitDebug,
      lightingMode: preferences.render.lightingMode,
      [key]: value,
    },
  });
}

export function updateStudioLightingMode(
  preferences: StudioPreferencesReadModel,
  lightingMode: StudioLightingMode,
): StudioPreferencesReadModel {
  return buildStudioPreferencesReadModel({
    render: { ...preferences.render, lightingMode },
  });
}

export function assetMatchesBrowserCategory(
  renderable: StudioSceneRenderableReadModel,
  category: StudioAssetBrowserCategory,
): boolean {
  if (category === 'all') {
    return true;
  }
  if (category === 'static_meshes') {
    return renderable.kind === 'static_mesh';
  }
  if (category === 'materials') {
    return renderable.materialRef !== null;
  }
  if (category === 'textures') {
    return false;
  }
  if (category === 'generated') {
    return (
      renderable.meshRef?.startsWith('generated:') === true
      || renderable.renderableId.startsWith('generated:')
      || renderable.kind === 'voxel_grid'
      || renderable.kind === 'voxel_cell'
    );
  }
  return renderable.kind === 'preview_ghost' || renderable.sourceState === 'pending';
}

export function filterAssetBrowserRenderables(
  renderables: readonly StudioSceneRenderableReadModel[],
  category: StudioAssetBrowserCategory,
): readonly StudioSceneRenderableReadModel[] {
  return renderables.filter(renderable => assetMatchesBrowserCategory(renderable, category));
}

export function buildAssetBrowserCategories(
  renderables: readonly StudioSceneRenderableReadModel[],
): readonly StudioAssetBrowserCategoryReadModel[] {
  const categories: readonly {
    readonly category: StudioAssetBrowserCategory;
    readonly label: string;
  }[] = [
    { category: 'all', label: 'All Assets' },
    { category: 'static_meshes', label: 'Static Meshes' },
    { category: 'materials', label: 'Materials' },
    { category: 'textures', label: 'Textures' },
    { category: 'generated', label: 'Generated' },
    { category: 'preview', label: 'Preview' },
  ];

  return categories.map(category => ({
    ...category,
    count: filterAssetBrowserRenderables(renderables, category.category).length,
  }));
}

export function buildStudioViewportCameraReadModel(options: {
  readonly position?: StudioVec3;
  readonly target?: StudioVec3;
  readonly up?: StudioVec3;
  readonly fovDegrees?: number;
  readonly near?: number;
  readonly far?: number;
} = {}): StudioViewportCameraReadModel {
  const camera = {
    position: options.position ?? { x: 4.6, y: 4.1, z: 5.2 },
    target: options.target ?? { x: 1.25, y: 0.55, z: 1.1 },
    up: options.up ?? { x: 0, y: 1, z: 0 },
    fovDegrees: options.fovDegrees ?? 42,
    near: options.near ?? 0.05,
    far: options.far ?? 100,
  };
  return {
    ...camera,
    cameraHash: fnv1aHash('viewport-camera', camera),
  };
}

export function buildStudioViewportToolReadModel(
  activeTool: StudioViewportToolMode = 'select',
  interactionMode: StudioViewportToolReadModel['interactionMode'] = 'idle',
): StudioViewportToolReadModel {
  const tool = { activeTool, interactionMode };
  return {
    ...tool,
    toolHash: fnv1aHash('viewport-tool', tool),
  };
}

export function buildStudioViewportReadout(options: {
  readonly camera?: StudioViewportCameraReadModel | undefined;
  readonly tool?: StudioViewportToolReadModel | undefined;
} = {}): StudioViewportReadout {
  const camera = options.camera ?? buildStudioViewportCameraReadModel();
  const tool = options.tool ?? buildStudioViewportToolReadModel();
  return {
    readoutVersion: 'studio-viewport-readout.v0',
    camera,
    tool,
    cameraHash: camera.cameraHash,
    toolHash: tool.toolHash,
  };
}

export function buildStudioUiStateReadModel(options: {
  readonly activeMenu?: StudioApplicationMenu | null;
  readonly bottomPanelTab?: StudioBottomPanelTab;
  readonly assetBrowserCategory?: StudioAssetBrowserCategory;
  readonly entities?: readonly StudioEntityReadModel[];
  readonly hierarchyFilter?: string;
  readonly menuMessage?: string;
  readonly projectWorkspaceAvailable?: boolean;
} = {}): StudioUiStateReadModel {
  const entities = options.entities ?? [];
  const hierarchy = {
    expandedCount: entities.filter(entity => entity.expanded).length,
    totalCount: entities.length,
  };
  const payload = {
    activeMenu: options.activeMenu ?? null,
    bottomPanelTab: options.bottomPanelTab ?? 'timeline',
    assetBrowserCategory: options.assetBrowserCategory ?? 'all',
    hierarchy,
    hierarchyFilter: options.hierarchyFilter ?? '',
    menuMessage: options.menuMessage ?? 'Workspace ready.',
    projectWorkspaceAvailable: options.projectWorkspaceAvailable ?? false,
  };

  return {
    schemaVersion: 1,
    artifactKind: 'studio_ui_state',
    uiStateVersion: 'studio-ui-state.v1',
    ...payload,
    uiStateHash: fnv1aHash('studio-ui-state', payload),
    nonClaims: [
      'ui_affordance_state_only',
      'not_scene_authority',
      'not_runtime_authority',
      'does_not_change_scene_hash',
    ],
  };
}

export function buildStudioViewportHitReadModel(options: {
  readonly renderable: StudioSceneRenderableReadModel;
  readonly face: StudioViewportHitFace;
  readonly worldPosition: StudioVec3;
}): StudioViewportHitReadModel {
  const voxelCoord =
    options.renderable.kind === 'voxel_grid' || options.renderable.kind === 'voxel_cell'
      ? {
          x: Math.floor(options.worldPosition.x),
          y: Math.floor(options.worldPosition.y),
          z: Math.floor(options.worldPosition.z),
        }
      : null;
  const hit = {
    renderableId: options.renderable.renderableId,
    face: options.face,
    worldPosition: options.worldPosition,
    voxelCoord,
  };

  return {
    ...hit,
    hitHash: fnv1aHash('viewport-hit', hit),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function addVec3(left: StudioVec3, right: StudioVec3): StudioVec3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

function subVec3(left: StudioVec3, right: StudioVec3): StudioVec3 {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

function scaleVec3(vector: StudioVec3, scalar: number): StudioVec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function lengthVec3(vector: StudioVec3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalizeVec3(vector: StudioVec3): StudioVec3 {
  const length = lengthVec3(vector);
  if (length <= 0.0001) {
    return { x: 0, y: 0, z: 0 };
  }
  return scaleVec3(vector, 1 / length);
}

function crossVec3(left: StudioVec3, right: StudioVec3): StudioVec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

export function orbitStudioViewportCamera(
  camera: StudioViewportCameraReadModel,
  delta: StudioViewportCameraControlDelta,
): StudioViewportCameraReadModel {
  const offset = subVec3(camera.position, camera.target);
  const radius = clamp(lengthVec3(offset), 0.6, 40);
  const yaw = Math.atan2(offset.z, offset.x) - delta.deltaX * 0.008;
  const horizontal = Math.hypot(offset.x, offset.z);
  const pitch = clamp(Math.atan2(offset.y, horizontal) + delta.deltaY * 0.008, -1.15, 1.15);
  const nextOffset = {
    x: Math.cos(pitch) * Math.cos(yaw) * radius,
    y: Math.sin(pitch) * radius,
    z: Math.cos(pitch) * Math.sin(yaw) * radius,
  };

  return buildStudioViewportCameraReadModel({
    ...camera,
    position: addVec3(camera.target, nextOffset),
  });
}

export function panStudioViewportCamera(
  camera: StudioViewportCameraReadModel,
  delta: StudioViewportCameraControlDelta,
): StudioViewportCameraReadModel {
  const forward = normalizeVec3(subVec3(camera.target, camera.position));
  const right = normalizeVec3(crossVec3(forward, camera.up));
  const up = normalizeVec3(camera.up);
  const distance = lengthVec3(subVec3(camera.position, camera.target));
  const scale = clamp(distance * 0.0018, 0.002, 0.05);
  const pan = addVec3(
    scaleVec3(right, -delta.deltaX * scale),
    scaleVec3(up, delta.deltaY * scale),
  );

  return buildStudioViewportCameraReadModel({
    ...camera,
    position: addVec3(camera.position, pan),
    target: addVec3(camera.target, pan),
  });
}

export function moveStudioViewportCamera(
  camera: StudioViewportCameraReadModel,
  intent: StudioViewportCameraMovementIntent,
): StudioViewportCameraReadModel {
  if (!Number.isFinite(intent.distance) || intent.distance < 0) {
    throw new Error('viewport camera movement distance must be finite and non-negative');
  }
  if (![intent.forward, intent.right, intent.up].every(axis => Number.isFinite(axis))) {
    throw new Error('viewport camera movement axes must be finite');
  }
  const viewForward = normalizeVec3(subVec3(camera.target, camera.position));
  const horizontalForward = normalizeVec3({ x: viewForward.x, y: 0, z: viewForward.z });
  const stableForward = lengthVec3(horizontalForward) <= 0.0001
    ? { x: 0, y: 0, z: -1 }
    : horizontalForward;
  const right = normalizeVec3(crossVec3(stableForward, { x: 0, y: 1, z: 0 }));
  const direction = normalizeVec3(addVec3(
    addVec3(
      scaleVec3(stableForward, intent.forward),
      scaleVec3(right, intent.right),
    ),
    { x: 0, y: intent.up, z: 0 },
  ));
  const translation = scaleVec3(direction, intent.distance);

  return buildStudioViewportCameraReadModel({
    ...camera,
    position: addVec3(camera.position, translation),
    target: addVec3(camera.target, translation),
  });
}

export function zoomStudioViewportCamera(
  camera: StudioViewportCameraReadModel,
  wheelDeltaY: number,
): StudioViewportCameraReadModel {
  const offset = subVec3(camera.position, camera.target);
  const distance = lengthVec3(offset);
  const nextDistance = clamp(distance * (1 + wheelDeltaY * 0.001), 0.75, 28);
  const nextOffset = scaleVec3(normalizeVec3(offset), nextDistance);

  return buildStudioViewportCameraReadModel({
    ...camera,
    position: addVec3(camera.target, nextOffset),
  });
}

export function frameStudioViewportCamera(
  scene: StudioSceneReadModel,
): StudioViewportCameraReadModel {
  return frameStudioViewportCameraForRenderables(
    scene.renderables.filter(renderable => renderable.visible),
  );
}

export function frameStudioViewportCameraOnRenderable(
  scene: StudioSceneReadModel,
  renderableId: string | null,
): StudioViewportCameraReadModel {
  const renderable =
    renderableId === null
      ? undefined
      : scene.renderables.find(item => item.renderableId === renderableId && item.visible);
  if (renderable === undefined) {
    return frameStudioViewportCamera(scene);
  }
  return frameStudioViewportCameraForRenderables([renderable]);
}

function frameStudioViewportCameraForRenderables(
  visibleRenderables: readonly StudioSceneRenderableReadModel[],
): StudioViewportCameraReadModel {
  if (visibleRenderables.length === 0) {
    return buildStudioViewportCameraReadModel();
  }

  const bounds = visibleRenderables.reduce(
    (current, renderable) => ({
      min: {
        x: Math.min(current.min.x, renderable.bounds.min.x),
        y: Math.min(current.min.y, renderable.bounds.min.y),
        z: Math.min(current.min.z, renderable.bounds.min.z),
      },
      max: {
        x: Math.max(current.max.x, renderable.bounds.max.x),
        y: Math.max(current.max.y, renderable.bounds.max.y),
        z: Math.max(current.max.z, renderable.bounds.max.z),
      },
    }),
    visibleRenderables[0]?.bounds ?? {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 1, y: 1, z: 1 },
    },
  );
  const target = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
  const extent = Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    bounds.max.z - bounds.min.z,
    1,
  );

  return buildStudioViewportCameraReadModel({
    position: {
      x: target.x + extent * 1.75,
      y: target.y + extent * 1.45,
      z: target.z + extent * 2.15,
    },
    target,
  });
}

export function buildStudioViewportAdapterReadModel(options: {
  readonly scene: StudioSceneReadModel;
  readonly camera?: StudioViewportCameraReadModel;
  readonly tool?: StudioViewportToolReadModel;
  readonly renderSettings?: StudioRenderSettingsReadModel;
}): StudioViewportAdapterReadModel {
  const camera = options.camera ?? buildStudioViewportCameraReadModel();
  const tool = options.tool ?? buildStudioViewportToolReadModel();
  const renderSettings = options.renderSettings ?? buildStudioRenderSettingsReadModel();
  const renderables = options.scene.renderables.map(renderable => ({
    renderableId: renderable.renderableId,
    label: renderable.label,
    kind: renderable.kind,
    sourceState: renderable.sourceState,
    selected: renderable.renderableId === options.scene.selectedRenderableId,
    bounds: renderable.bounds,
    meshRef: renderable.meshRef,
    materialRef: renderable.materialRef,
    renderHash: renderable.renderHash,
    visible: renderable.visible,
    pickable: renderable.pickable,
  }));
  const readbackPayload = {
    sceneId: options.scene.sceneId,
    sceneHash: options.scene.sceneHash,
    selectedRenderableId: options.scene.selectedRenderableId,
    cameraHash: camera.cameraHash,
    toolHash: tool.toolHash,
    renderSettingsHash: renderSettings.renderSettingsHash,
    renderables: renderables.map(renderable => ({
      renderableId: renderable.renderableId,
      selected: renderable.selected,
      visible: renderable.visible,
      renderHash: renderable.renderHash,
    })),
  };

  return {
    adapterVersion: 'studio-viewport-adapter.v0',
    sceneId: options.scene.sceneId,
    sceneHash: options.scene.sceneHash,
    selectedRenderableId: options.scene.selectedRenderableId,
    camera,
    tool,
    renderSettings,
    renderables,
    readbackHash: fnv1aHash('viewport-readback', readbackPayload),
    nonClaims: [
      'browser_reference_projection',
      'not_native_runtime_authority',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
    ],
  };
}

function sequenceId(index: number): string {
  return `seq-${String(index + 1).padStart(4, '0')}`;
}

function createTimelineEntry(options: {
  readonly index: number;
  readonly commandId: string;
  readonly label: string;
  readonly requestedBy: StudioActorKind;
  readonly status?: StudioCommandStatus;
  readonly inputSummary: string;
  readonly outputSummary: string;
  readonly changedScene: boolean;
  readonly changedSelection: boolean;
}): {
  readonly timelineEntry: StudioCommandTimelineEntry;
  readonly commandResult: StudioCommandResultReadModel;
} {
  const sequence = sequenceId(options.index);
  const status: StudioCommandStatus = options.status ?? 'ok';

  return {
    timelineEntry: {
      sequenceId: sequence,
      commandId: options.commandId,
      label: options.label,
      requestedBy: options.requestedBy,
      status,
      inputSummary: options.inputSummary,
      outputSummary: options.outputSummary,
    },
    commandResult: {
      sequenceId: sequence,
      commandId: options.commandId,
      status,
      changedScene: options.changedScene,
      changedSelection: options.changedSelection,
      outputSummary: options.outputSummary,
    },
  };
}

function badgeForRenderable(
  renderable: StudioSceneRenderableReadModel,
  selected: boolean,
): StudioEntityBadge {
  if (selected) {
    return 'selected';
  }
  if (renderable.sourceState === 'authoritative') {
    return 'authority-backed';
  }
  if (renderable.sourceState === 'pending') {
    return 'preview-only';
  }
  return renderable.kind === 'static_mesh' ? 'projected' : 'reference';
}

function sourceStateForSceneObject(
  object: EditorSceneObjectSnapshot['objects'][number],
  renderable: StudioSceneRenderableReadModel | null,
): StudioEntitySourceState {
  if (renderable !== null) {
    return renderable.sourceState;
  }
  return object.runtimeEntityId === null ? 'reference' : 'authoritative';
}

function kindForSceneObject(
  object: EditorSceneObjectSnapshot['objects'][number],
  renderable: StudioSceneRenderableReadModel | null,
): StudioEntityKind {
  if (renderable !== null) {
    return renderable.kind;
  }
  if (object.kind === 'emptyGroup') {
    return 'empty_group';
  }
  if (object.kind === 'sprite') {
    return 'sprite';
  }
  return 'scene';
}

function badgeForSceneObject(
  object: EditorSceneObjectSnapshot['objects'][number],
  renderable: StudioSceneRenderableReadModel | null,
  selected: boolean,
): StudioEntityBadge {
  if (selected) {
    return 'selected';
  }
  if (renderable !== null) {
    return badgeForRenderable(renderable, false);
  }
  return object.runtimeEntityId === null ? 'reference' : 'authority-backed';
}

function depthForSceneObject(
  object: EditorSceneObjectSnapshot['objects'][number],
  snapshot: EditorSceneObjectSnapshot,
): number {
  const parentByObjectId = new Map(snapshot.objects.map(item => [item.objectId, item.parentObjectId]));
  let depth = 2;
  let current = object.parentObjectId;
  const seen = new Set<SceneObjectId>();

  while (current !== null && !seen.has(current)) {
    seen.add(current);
    depth += 1;
    current = parentByObjectId.get(current) ?? null;
  }
  return depth;
}

function selectedObjectIdForRenderable(
  snapshot: EditorSceneObjectSnapshot,
  selectedRenderableId: string | null,
): SceneObjectId | null {
  if (selectedRenderableId === null) {
    return null;
  }
  return (
    snapshot.objects.find(
      object => object.provenance.renderableId === selectedRenderableId,
    )?.objectId ?? null
  );
}

function projectEntitiesFromScene(
  session: StudioSessionReadModel,
  scene: StudioSceneReadModel,
  sceneObjectSnapshot: EditorSceneObjectSnapshot,
  previousEntities: readonly StudioEntityReadModel[] = [],
): readonly StudioEntityReadModel[] {
  const expandedById = new Map(previousEntities.map(entity => [entity.id, entity.expanded]));
  const selectedObjectId = selectedObjectIdForRenderable(sceneObjectSnapshot, scene.selectedRenderableId);
  const renderableById = new Map(scene.renderables.map(renderable => [renderable.renderableId, renderable]));
  const objectRows = sceneObjectSnapshot.objects.map(object => {
    const renderable =
      object.provenance.renderableId === null
        ? null
        : renderableById.get(object.provenance.renderableId) ?? null;
    const selected = object.objectId === selectedObjectId;
    const hasChildren = sceneObjectSnapshot.objects.some(item => item.parentObjectId === object.objectId);
    return {
      id: object.objectId,
      label: object.displayName,
      kind: kindForSceneObject(object, renderable),
      sourceState: sourceStateForSceneObject(object, renderable),
      badge: badgeForSceneObject(object, renderable, selected),
      depth: depthForSceneObject(object, sceneObjectSnapshot),
      expanded: expandedById.get(object.objectId) ?? hasChildren,
      selectable: object.editability.selectable,
      selected,
      renderableId: object.provenance.renderableId,
      sceneObjectId: object.objectId,
    } satisfies StudioEntityReadModel;
  });

  return [
    {
      id: `session:${session.sessionId}`,
      label: session.scenarioLabel,
      kind: 'session',
      sourceState: 'reference',
      badge: 'reference',
      depth: 0,
      expanded: true,
      selectable: false,
      selected: false,
      renderableId: null,
      sceneObjectId: null,
    },
    {
      id: scene.sceneId,
      label: 'Scene View',
      kind: 'scene',
      sourceState: 'authoritative',
      badge: 'authority-backed',
      depth: 1,
      expanded: true,
      selectable: false,
      selected: false,
      renderableId: null,
      sceneObjectId: null,
    },
    ...objectRows,
  ];
}

export function computeEntityListHash(entities: readonly StudioEntityReadModel[]): string {
  return fnv1aHash(
    'entity-list',
    entities.map(entity => ({
      id: entity.id,
      sourceState: entity.sourceState,
      selected: entity.selected,
      renderableId: entity.renderableId,
    })),
  );
}

export function validateEntityProjection(input: {
  readonly entities: readonly StudioEntityReadModel[];
  readonly selectedEntityId: string | null;
  readonly sceneRenderableIds: readonly string[];
  readonly recordedHash: string;
  readonly recomputedHash: string;
}): readonly StudioEntityProjectionDiagnostic[] {
  const diagnostics: StudioEntityProjectionDiagnostic[] = [];
  const selectableRenderableIds = input.entities.flatMap(entity =>
    entity.selectable && entity.renderableId !== null ? [entity.renderableId] : [],
  );
  const selectableSet = new Set(selectableRenderableIds);
  const sceneSet = new Set(input.sceneRenderableIds);
  const selectedEntity = input.selectedEntityId === null
    ? null
    : input.entities.find(entity => entity.id === input.selectedEntityId);
  const drift = selectableRenderableIds.length !== input.sceneRenderableIds.length
    || selectableRenderableIds.some(id => !sceneSet.has(id))
    || input.sceneRenderableIds.some(id => !selectableSet.has(id));

  if (drift) {
    diagnostics.push({
      code: 'hierarchy_readback_drift',
      severity: 'error',
      message: 'Hierarchy selectable rows do not match the scene renderable readback.',
    });
  }
  if (selectedEntity === undefined || selectedEntity === null || !selectedEntity.selectable) {
    diagnostics.push({
      code: 'missing_selected_entity',
      severity: 'error',
      message: `Selected entity ${input.selectedEntityId ?? 'none'} is absent from the selectable hierarchy projection.`,
    });
  }
  if (input.recordedHash !== input.recomputedHash) {
    diagnostics.push({
      code: 'stale_entity_list',
      severity: 'error',
      message: 'Recorded hierarchy entity-list hash does not match the recomputed projection.',
    });
  }
  for (const entity of input.entities) {
    if (
      entity.sourceState !== 'authoritative'
      && entity.sourceState !== 'reference'
      && entity.sourceState !== 'pending'
    ) {
      diagnostics.push({
        code: 'unsupported_private_entity_source',
        severity: 'error',
        message: `Entity ${entity.id} has unsupported source state ${entity.sourceState}.`,
      });
    }
  }

  return diagnostics;
}

export function validateSelectionCommandSync(input: {
  readonly commandPresent: boolean;
  readonly commandEntityId: string | null;
  readonly commandSelected: boolean;
  readonly viewportSelectedRenderableId: string | null;
  readonly selectableEntityIds: readonly string[];
  readonly entityRenderableLinks?: Readonly<Record<string, string | null>>;
}): readonly StudioEntityProjectionDiagnostic[] {
  if (!input.commandPresent) {
    return [{
      code: 'missing_selection_command',
      severity: 'error',
      message: 'No selection.set_active_entity command result is recorded in the shared timeline.',
    }];
  }
  const expectedRenderableId =
    input.commandEntityId === null
      ? null
      : input.entityRenderableLinks?.[input.commandEntityId] ?? input.commandEntityId;
  if (
    input.commandEntityId === null
    || input.viewportSelectedRenderableId === null
    || expectedRenderableId !== input.viewportSelectedRenderableId
    || !input.commandSelected
    || !input.selectableEntityIds.includes(input.commandEntityId)
  ) {
    return [{
      code: 'selection_sync_mismatch',
      severity: 'error',
      message: `selection.set_active_entity selected ${input.commandEntityId ?? 'none'} but the viewport selected ${input.viewportSelectedRenderableId ?? 'none'}.`,
    }];
  }
  return [];
}

function buildInitialTimeline(): {
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResultReadModel[];
} {
  const commands = [
    {
      commandId: 'workspace.start',
      label: 'Open Studio',
      requestedBy: 'gui',
      inputSummary: 'scene=untitled',
      outputSummary: 'Created an empty authored scene.',
      changedScene: false,
      changedSelection: false,
    },
  ] satisfies readonly Omit<Parameters<typeof createTimelineEntry>[0], 'index'>[];

  const entries = commands.map((command, index) =>
    createTimelineEntry({ ...command, index }),
  );

  return {
    timeline: entries.map(entry => entry.timelineEntry),
    commandResults: entries.map(entry => entry.commandResult),
  };
}

export function buildInitialWorkspaceReadModel(): StudioWorkspaceReadModel {
  const renderables: readonly StudioSceneRenderableReadModel[] = [];
  const selectedRenderableId = null;
  const session: StudioSessionReadModel = {
    sessionId: 'studio-authoring',
    scenarioId: 'untitled',
    scenarioLabel: 'Untitled Scene',
    runtimeMode: 'reference',
    status: 'ready',
    startedAtIso: '1970-01-01T00:00:00.000Z',
  };
  const scene: StudioSceneReadModel = {
    sceneId: 'scene-document:1',
    selectedRenderableId,
    renderables,
    sceneHash: buildSceneHash(renderables),
  };
  const flatSceneDocument = createStudioFlatSceneDocument(scene);
  const sceneObjectSnapshot = buildStudioSceneObjectSnapshot(scene, flatSceneDocument);
  const timelineState = buildInitialTimeline();

  return {
    workspaceId: 'asha-studio-substrate',
    session,
    scene,
    flatSceneDocument,
    sceneObjectSnapshot,
    entities: projectEntitiesFromScene(session, scene, sceneObjectSnapshot),
    selectedEntityId: selectedObjectIdForRenderable(sceneObjectSnapshot, selectedRenderableId),
    timeline: timelineState.timeline,
    commandResults: timelineState.commandResults,
    timelineSequence: timelineState.timeline.length,
  };
}

export function clearStudioWorkspaceReadModel(
  readModel: StudioWorkspaceReadModel,
): StudioWorkspaceReadModel {
  const scene: StudioSceneReadModel = {
    sceneId: readModel.scene.sceneId,
    selectedRenderableId: null,
    renderables: [],
    sceneHash: buildSceneHash([]),
  };
  const flatSceneDocument = createStudioFlatSceneDocument(scene);
  const sceneObjectSnapshot = buildStudioSceneObjectSnapshot(scene, flatSceneDocument);
  const session: StudioSessionReadModel = {
    ...readModel.session,
    scenarioLabel: 'Empty Scene',
  };
  const command = createTimelineEntry({
    index: readModel.timeline.length,
    commandId: 'workspace.new',
    label: 'New Scene',
    requestedBy: 'gui',
    inputSummary: `previousSceneHash=${readModel.scene.sceneHash}`,
    outputSummary: 'Cleared scene renderables and selection.',
    changedScene: true,
    changedSelection: readModel.selectedEntityId !== null,
  });

  return {
    ...readModel,
    session,
    scene,
    flatSceneDocument,
    sceneObjectSnapshot,
    entities: projectEntitiesFromScene(session, scene, sceneObjectSnapshot, readModel.entities),
    selectedEntityId: null,
    timeline: [...readModel.timeline, command.timelineEntry],
    commandResults: [...readModel.commandResults, command.commandResult],
    timelineSequence: readModel.timelineSequence + 1,
  };
}

/**
 * Projects a Rust-validated stored scene document into Studio's authored read model.
 * The document remains the source of truth; renderables are only an editor projection.
 */
export function applyCanonicalSceneDocumentReadModel(
  readModel: StudioWorkspaceReadModel,
  document: FlatSceneDocument,
  sourcePath: string | null,
): StudioWorkspaceReadModel {
  const renderableNodes = document.nodes.filter(node => node.kind.kind !== 'emptyGroup');
  const renderables = renderableNodes.map((node): StudioSceneRenderableReadModel => {
    const [x, y, z] = node.transform.translation;
    const [scaleX, scaleY, scaleZ] = node.transform.scale.map(value => Math.abs(value)) as [number, number, number];
    const asset = 'asset' in node.kind ? node.kind.asset : null;
    const kind: StudioRenderableKind = node.kind.kind === 'voxelVolume'
      ? 'voxel_grid'
      : node.kind.kind === 'staticMesh'
        ? 'static_mesh'
        : 'preview_ghost';
    return {
      renderableId: `scene-node-renderable:${node.id}`,
      label: node.label ?? `Scene node ${node.id}`,
      kind,
      sourceState: 'authoritative',
      bounds: {
        min: { x: x - scaleX / 2, y: y - scaleY / 2, z: z - scaleZ / 2 },
        max: { x: x + scaleX / 2, y: y + scaleY / 2, z: z + scaleZ / 2 },
      },
      meshRef: asset?.id ?? null,
      materialRef: null,
      renderHash: fnv1aHash('canonical-scene-node', node),
      visible: true,
      pickable: true,
    };
  });
  const selectedRenderableId = renderables.at(0)?.renderableId ?? null;
  const scene: StudioSceneReadModel = {
    sceneId: `scene-document:${document.id}`,
    selectedRenderableId,
    renderables,
    sceneHash: buildSceneHash(renderables),
  };
  const renderableLinks = renderableNodes.map((node, index) => ({
    sceneNodeId: node.id,
    renderableId: renderables[index]?.renderableId ?? `scene-node-renderable:${node.id}`,
  }));
  const sceneObjectSnapshot = buildSceneObjectSnapshot({ document, renderableLinks });
  const session: StudioSessionReadModel = {
    ...readModel.session,
    scenarioLabel: document.metadata.name ?? (sourcePath === null ? 'Untitled Scene' : sourcePath),
  };
  const command = createTimelineEntry({
    index: readModel.timeline.length,
    commandId: sourcePath === null ? 'workspace.new' : 'scene.open_document',
    label: sourcePath === null ? 'New Scene' : 'Open Scene',
    requestedBy: 'gui',
    inputSummary: sourcePath === null ? 'untitled' : `hostPath=${sourcePath}`,
    outputSummary: `Projected ${document.nodes.length} authored scene nodes.`,
    changedScene: true,
    changedSelection: readModel.selectedEntityId !== null || selectedRenderableId !== null,
  });
  return {
    ...readModel,
    session,
    scene,
    flatSceneDocument: document,
    sceneObjectSnapshot,
    entities: projectEntitiesFromScene(session, scene, sceneObjectSnapshot, readModel.entities),
    selectedEntityId: selectedObjectIdForRenderable(sceneObjectSnapshot, selectedRenderableId),
    timeline: [...readModel.timeline, command.timelineEntry],
    commandResults: [...readModel.commandResults, command.commandResult],
    timelineSequence: readModel.timelineSequence + 1,
  };
}

/** Applies renderer-observed bounds to one disposable scene projection only. */
export function applyProjectedRenderableBoundsReadModel(
  readModel: StudioWorkspaceReadModel,
  renderableId: string,
  bounds: StudioBounds,
): StudioWorkspaceReadModel {
  const previous = readModel.scene.renderables.find(
    renderable => renderable.renderableId === renderableId,
  );
  if (previous === undefined || JSON.stringify(previous.bounds) === JSON.stringify(bounds)) {
    return readModel;
  }
  const renderables = readModel.scene.renderables.map(renderable => (
    renderable.renderableId === renderableId ? { ...renderable, bounds } : renderable
  ));
  const scene = {
    ...readModel.scene,
    renderables,
    sceneHash: buildSceneHash(renderables),
  };
  return {
    ...readModel,
    scene,
    entities: projectEntitiesFromScene(
      readModel.session,
      scene,
      readModel.sceneObjectSnapshot,
      readModel.entities,
    ),
  };
}

export function findUnresolvedSceneAssetIds(
  document: FlatSceneDocument,
  availableAssetIds: readonly string[],
): readonly string[] {
  const available = new Set(availableAssetIds);
  return [...new Set(document.nodes.flatMap(node => (
    'asset' in node.kind && !available.has(node.kind.asset.id)
      ? [node.kind.asset.id]
      : []
  )))].sort();
}

export function recordStudioWorkspaceUiCommand(
  readModel: StudioWorkspaceReadModel,
  options: {
    readonly commandId: StudioUiEventCommandId;
    readonly label: string;
    readonly inputSummary: string;
    readonly outputSummary: string;
    readonly status?: StudioCommandStatus;
  },
): StudioWorkspaceUiCommandResult {
  const command = createTimelineEntry({
    index: readModel.timeline.length,
    commandId: options.commandId,
    label: options.label,
    requestedBy: 'gui',
    status: options.status ?? 'ok',
    inputSummary: options.inputSummary,
    outputSummary: options.outputSummary,
    changedScene: false,
    changedSelection: false,
  });
  return {
    workspace: {
      ...readModel,
      timeline: [...readModel.timeline, command.timelineEntry],
      commandResults: [...readModel.commandResults, command.commandResult],
      timelineSequence: readModel.timelineSequence + 1,
    },
    timelineEntry: command.timelineEntry,
  };
}

export function setHierarchyExpansionReadModel(
  readModel: StudioWorkspaceReadModel,
  expanded: boolean,
): StudioWorkspaceReadModel {
  return {
    ...readModel,
    entities: readModel.entities.map(entity => ({
      ...entity,
      expanded,
    })),
  };
}

export function setHierarchyEntityExpansionReadModel(
  readModel: StudioWorkspaceReadModel,
  entityId: string,
  expanded: boolean,
): StudioWorkspaceReadModel {
  return {
    ...readModel,
    entities: readModel.entities.map(entity => entity.id === entityId
      ? { ...entity, expanded }
      : entity),
  };
}

function flatSceneNodeKindForRenderable(
  renderable: StudioSceneRenderableReadModel,
): FlatSceneDocument['nodes'][number]['kind'] {
  if (renderable.kind === 'static_mesh') {
    return {
      kind: 'staticMesh',
      asset: {
        id: renderable.meshRef ?? renderable.renderableId,
        version: { req: 'any' },
        hash: renderable.renderHash,
      },
    };
  }
  return {
    kind: 'voxelVolume',
    asset: {
      id: renderable.meshRef ?? `generated:${renderable.kind}`,
      version: { req: 'any' },
      hash: renderable.renderHash,
    },
  };
}

function flatSceneDocumentForScene(
  scene: StudioSceneReadModel,
): FlatSceneDocument {
  const rootNode = {
    id: sceneNodeId(1),
    parent: null,
    childOrder: 0,
    label: 'Scene Root',
    tags: ['studio-root', STUDIO_SCENE_Y_UP_TAG],
    transform: {
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    kind: { kind: 'emptyGroup' },
  } satisfies FlatSceneDocument['nodes'][number];

  return {
    schemaVersion: 1,
    id: sceneId(1),
    metadata: {
      name: scene.sceneId,
      authoringFormatVersion: 2,
    },
    dependencies: scene.renderables.map(renderable => ({
      id: renderable.meshRef ?? renderable.renderableId,
      version: { req: 'any' },
      hash: renderable.renderHash,
    })),
    nodes: [
      rootNode,
      ...scene.renderables.map((renderable, index) => ({
        id: sceneNodeId(index + 2),
        parent: rootNode.id,
        childOrder: index,
        label: renderable.label,
        tags: [renderable.kind, renderable.sourceState],
        transform: {
          translation: [
            (renderable.bounds.min.x + renderable.bounds.max.x) / 2,
            (renderable.bounds.min.y + renderable.bounds.max.y) / 2,
            (renderable.bounds.min.z + renderable.bounds.max.z) / 2,
          ],
          rotation: [0, 0, 0, 1],
          scale: [
            Math.max(0.04, renderable.bounds.max.x - renderable.bounds.min.x),
            Math.max(0.04, renderable.bounds.max.y - renderable.bounds.min.y),
            Math.max(0.04, renderable.bounds.max.z - renderable.bounds.min.z),
          ],
        },
        kind: flatSceneNodeKindForRenderable(renderable),
      }) satisfies FlatSceneDocument['nodes'][number]),
    ],
  };
}

function renderableLinksForScene(scene: StudioSceneReadModel) {
  return scene.renderables.map((renderable, index) => ({
    sceneNodeId: sceneNodeId(index + 2),
    renderableId: renderable.renderableId,
  }));
}

function buildStudioSceneObjectSnapshot(
  scene: StudioSceneReadModel,
  flatSceneDocument: FlatSceneDocument,
): EditorSceneObjectSnapshot {
  return buildSceneObjectSnapshot({
    document: flatSceneDocument,
    renderableLinks: renderableLinksForScene(scene),
  });
}

function sceneNodeIdFromObjectId(objectId: SceneObjectId): SceneNodeId {
  return sceneNodeId(Number(objectId.replace('scene-node:', '')));
}

function validateAuthoringLabel(
  label: string | null,
  source: string,
  diagnostics: StudioDiagnostic[],
): void {
  if (label !== null && label.trim().length === 0) {
    diagnostics.push(studioSceneAuthoringDiagnostic(
      'blank_scene_object_label',
      'Scene object labels must be null or non-blank.',
      source,
      null,
    ));
  }
}

function validateAuthoringTransform(
  transform: SceneTransform,
  source: string,
  diagnostics: StudioDiagnostic[],
): void {
  const values = [
    ...transform.translation,
    ...transform.rotation,
    ...transform.scale,
  ];
  if (values.some(value => !Number.isFinite(value)) || transform.scale.some(value => value === 0)) {
    diagnostics.push(studioSceneAuthoringDiagnostic(
      'invalid_scene_object_transform',
      'Scene object transform must contain finite values and non-zero scale.',
      source,
      null,
    ));
  }
}

function documentHashForSceneObjectCommand(document: FlatSceneDocument): number {
  const hash = fnv1aHash('scene-object-document', document);
  return Number.parseInt(hash.replace('scene-object-document-', ''), 16);
}

function contractSceneObjectSnapshot(
  snapshot: EditorSceneObjectSnapshot,
): ContractSceneObjectSnapshot {
  return {
    documentHash: Number.parseInt(snapshot.sceneHash.replace('scene-object-', ''), 16),
    objects: snapshot.objects.map(object => ({
      id: object.sceneNodeId,
      parent: object.parentObjectId === null ? null : sceneNodeIdFromObjectId(object.parentObjectId),
      childOrder: object.childOrder,
      label: object.displayName,
      kind: object.kind,
      hasRenderableAsset: object.asset !== null,
    })),
  };
}

function sceneObjectRejection(
  code: SceneObjectCommandRejection['code'],
  options: {
    readonly id?: SceneNodeId | null;
    readonly parent?: SceneNodeId | null;
    readonly expectedHash?: number | null;
    readonly actualHash?: number | null;
  } = {},
): SceneObjectCommandResult {
  return {
    accepted: false,
    outcome: null,
    rejection: {
      code,
      id: options.id ?? null,
      parent: options.parent ?? null,
      expectedHash: options.expectedHash ?? null,
      actualHash: options.actualHash ?? null,
      validationErrors: [],
    },
  };
}

function hasSceneObjectCycle(
  document: FlatSceneDocument,
  id: SceneNodeId,
  parent: SceneNodeId | null,
): boolean {
  let current = parent;
  const seen = new Set<number>();
  while (current !== null && !seen.has(current as number)) {
    if (current === id) {
      return true;
    }
    seen.add(current as number);
    current = document.nodes.find(node => node.id === current)?.parent ?? null;
  }
  return false;
}

function relabelRenderableForSceneNode(
  scene: StudioSceneReadModel,
  sceneNode: SceneNodeId,
  label: string | null,
): StudioSceneReadModel {
  const renderableIndex = (sceneNode as number) - 2;
  const renderable = scene.renderables[renderableIndex];
  if (renderable === undefined || label === null) {
    return scene;
  }
  return {
    ...scene,
    renderables: scene.renderables.map((item, index) =>
      index === renderableIndex ? { ...item, label } : item,
    ),
  };
}

function isFiniteTuple3(value: readonly number[]): value is readonly [number, number, number] {
  return value.length === 3 && value.every(Number.isFinite);
}

function isFiniteTuple4(value: readonly number[]): value is readonly [number, number, number, number] {
  return value.length === 4 && value.every(Number.isFinite);
}

function isValidSceneTransform(transform: SceneTransform): boolean {
  return isFiniteTuple3(transform.translation)
    && isFiniteTuple4(transform.rotation)
    && isFiniteTuple3(transform.scale)
    && transform.scale.every(value => value > 0)
    && Math.hypot(...transform.rotation) > 0.000001;
}

function isSceneNodeTransformReadonly(node: FlatSceneDocument['nodes'][number]): boolean {
  return node.tags.includes('studio-root');
}

function translatedTransform(
  transform: SceneTransform,
  delta: readonly [number, number, number],
): SceneTransform {
  return {
    ...transform,
    translation: [
      transform.translation[0] + delta[0],
      transform.translation[1] + delta[1],
      transform.translation[2] + delta[2],
    ],
  };
}

function normalizedRotation(rotation: readonly [number, number, number, number]): readonly [number, number, number, number] | null {
  const length = Math.hypot(...rotation);
  if (!Number.isFinite(length) || length <= 0.000001) {
    return null;
  }
  return [
    rotation[0] / length,
    rotation[1] / length,
    rotation[2] / length,
    rotation[3] / length,
  ];
}

function transformRenderableForSceneNode(
  scene: StudioSceneReadModel,
  sceneNode: SceneNodeId,
  before: SceneTransform,
  after: SceneTransform,
): StudioSceneReadModel {
  const renderableIndex = (sceneNode as number) - 2;
  const renderable = scene.renderables[renderableIndex];
  if (renderable === undefined) {
    return scene;
  }
  const delta = {
    x: after.translation[0] - before.translation[0],
    y: after.translation[1] - before.translation[1],
    z: after.translation[2] - before.translation[2],
  };
  const renderables = scene.renderables.map((item, index) =>
    index === renderableIndex
      ? {
          ...item,
          bounds: {
            min: {
              x: item.bounds.min.x + delta.x,
              y: item.bounds.min.y + delta.y,
              z: item.bounds.min.z + delta.z,
            },
            max: {
              x: item.bounds.max.x + delta.x,
              y: item.bounds.max.y + delta.y,
              z: item.bounds.max.z + delta.z,
            },
          },
          renderHash: fnv1aHash('scene-object-renderable-transform', {
            renderHash: item.renderHash,
            transform: after,
          }),
        }
      : item,
  );
  return {
    ...scene,
    selectedRenderableId: renderable.renderableId,
    renderables,
    sceneHash: buildSceneHash(renderables),
  };
}

export function createStudioFlatSceneDocument(
  scene: StudioSceneReadModel,
): FlatSceneDocument {
  return flatSceneDocumentForScene(scene);
}

export function studioSceneAuthoringBaseHash(document: FlatSceneDocument): string {
  return fnv1aHash('studio-scene-authoring-base', document);
}

export function buildStudioSceneAuthoringOperation(
  document: FlatSceneDocument,
  request: StudioSceneAuthoringOperationRequest,
): StudioSceneAuthoringOperationResult {
  const diagnostics: StudioDiagnostic[] = [];
  const actualBaseHash = studioSceneAuthoringBaseHash(document);
  if (request.expectedBaseHash !== actualBaseHash) {
    diagnostics.push(studioSceneAuthoringDiagnostic(
      'stale_scene_source_hash',
      'Scene authoring operation expectedBaseHash does not match the current scene source hash.',
      request.operation.kind,
      `${request.expectedBaseHash} != ${actualBaseHash}`,
    ));
  }

  const existingIds = new Set(document.nodes.map(node => node.id));
  const parentIds = new Set(document.nodes.map(node => node.id));
  if (request.operation.kind === 'create_scene_object') {
    const record = request.operation.record;
    if (existingIds.has(record.id)) {
      diagnostics.push(studioSceneAuthoringDiagnostic(
        'duplicate_scene_object',
        `Cannot create duplicate scene object ${record.id}.`,
        `scene-node:${record.id}`,
        null,
      ));
    }
    if (record.parent !== null && !parentIds.has(record.parent)) {
      diagnostics.push(studioSceneAuthoringDiagnostic(
        'missing_scene_object_parent',
        `Cannot parent new scene object ${record.id} under missing parent ${record.parent}.`,
        `scene-node:${record.id}`,
        `parent:${record.parent}`,
      ));
    }
    validateAuthoringLabel(record.label, `scene-node:${record.id}`, diagnostics);
    validateAuthoringTransform(record.transform, `scene-node:${record.id}`, diagnostics);
  } else {
    const id = sceneNodeIdFromObjectId(request.operation.objectId);
    const current = document.nodes.find(node => node.id === id);
    if (current === undefined) {
      diagnostics.push(studioSceneAuthoringDiagnostic(
        'missing_scene_object',
        `Cannot ${request.operation.kind} missing scene object ${request.operation.objectId}.`,
        request.operation.objectId,
        null,
      ));
    }
    if (request.operation.kind === 'update_scene_object') {
      for (const key of Object.keys(request.operation.patch)) {
        if (!['label', 'parentObjectId', 'transform'].includes(key)) {
          diagnostics.push(studioSceneAuthoringDiagnostic(
            'unsupported_scene_authoring_field',
            `Scene authoring update field is not supported: ${key}.`,
            request.operation.objectId,
            key,
          ));
        }
      }
      if (request.operation.patch.parentObjectId !== undefined && request.operation.patch.parentObjectId !== null) {
        const parent = sceneNodeIdFromObjectId(request.operation.patch.parentObjectId);
        if (!parentIds.has(parent)) {
          diagnostics.push(studioSceneAuthoringDiagnostic(
            'missing_scene_object_parent',
            `Cannot parent scene object ${request.operation.objectId} under missing parent ${request.operation.patch.parentObjectId}.`,
            request.operation.objectId,
            request.operation.patch.parentObjectId,
          ));
        }
      }
      if (Object.prototype.hasOwnProperty.call(request.operation.patch, 'label')) {
        validateAuthoringLabel(request.operation.patch.label ?? null, request.operation.objectId, diagnostics);
      }
      if (request.operation.patch.transform !== undefined) {
        validateAuthoringTransform(request.operation.patch.transform, request.operation.objectId, diagnostics);
      }
    }
  }

  const readModel: StudioSceneAuthoringOperationReadModel = {
    operationVersion: 'studio-scene-authoring-operation.v0',
    operationKind: request.operation.kind,
    expectedBaseHash: request.expectedBaseHash,
    actualBaseHash,
    actor: request.actor,
    operation: request.operation,
    diagnostics,
    nonClaims: [
      'not_runtime_authority',
      'not_private_ui_mutation',
      'not_source_write_until_save_operation',
    ],
    operationHash: fnv1aHash('studio-scene-authoring-operation', {
      actualBaseHash,
      request,
      diagnostics,
    }),
  };

  return diagnostics.length === 0
    ? { ok: true, operation: readModel, diagnostics: [] }
    : { ok: false, operation: readModel, diagnostics };
}

export function createSceneObjectCommandIntent(
  readModel: StudioWorkspaceReadModel,
  request: SceneObjectCommandRequest,
): StudioIntent {
  return {
    kind: 'scene_object_command',
    request,
    expectedTimelineSequence: readModel.timelineSequence,
  };
}

export function createRenameSceneObjectRequest(
  readModel: StudioWorkspaceReadModel,
  objectId: SceneObjectId,
  label: string | null,
): SceneObjectCommandRequest {
  return {
    expectedDocumentHash: documentHashForSceneObjectCommand(readModel.flatSceneDocument),
    command: {
      kind: 'rename',
      id: sceneNodeIdFromObjectId(objectId),
      label,
    },
  };
}

export function createReparentSceneObjectRequest(
  readModel: StudioWorkspaceReadModel,
  objectId: SceneObjectId,
  parentObjectId: SceneObjectId | null,
  childOrder: number,
): SceneObjectCommandRequest {
  return {
    expectedDocumentHash: documentHashForSceneObjectCommand(readModel.flatSceneDocument),
    command: {
      kind: 'reparent',
      id: sceneNodeIdFromObjectId(objectId),
      parent: parentObjectId === null ? null : sceneNodeIdFromObjectId(parentObjectId),
      childOrder,
    },
  };
}

export function createTranslateSceneObjectRequest(
  readModel: StudioWorkspaceReadModel,
  objectId: SceneObjectId,
  delta: readonly [number, number, number],
): SceneObjectCommandRequest {
  return {
    expectedDocumentHash: documentHashForSceneObjectCommand(readModel.flatSceneDocument),
    command: {
      kind: 'translate',
      id: sceneNodeIdFromObjectId(objectId),
      delta,
    },
  };
}

export function createRotateSceneObjectRequest(
  readModel: StudioWorkspaceReadModel,
  objectId: SceneObjectId,
  rotation: readonly [number, number, number, number],
): SceneObjectCommandRequest {
  return {
    expectedDocumentHash: documentHashForSceneObjectCommand(readModel.flatSceneDocument),
    command: {
      kind: 'rotate',
      id: sceneNodeIdFromObjectId(objectId),
      rotation,
    },
  };
}

export function createCreateSceneObjectRequest(
  readModel: StudioWorkspaceReadModel,
  record: FlatSceneDocument['nodes'][number],
): SceneObjectCommandRequest {
  return {
    expectedDocumentHash: documentHashForSceneObjectCommand(readModel.flatSceneDocument),
    command: {
      kind: 'create',
      record,
    },
  };
}

export function applySceneObjectCommandReadModel(
  readModel: StudioWorkspaceReadModel,
  request: SceneObjectCommandRequest,
): StudioSceneObjectCommandApplyResult {
  const actualHash = documentHashForSceneObjectCommand(readModel.flatSceneDocument);
  let result: SceneObjectCommandResult | null = null;
  let flatSceneDocument = readModel.flatSceneDocument;
  let scene = readModel.scene;
  let selectedSceneNode: SceneNodeId | null = null;

  if (request.expectedDocumentHash !== actualHash) {
    result = sceneObjectRejection('stale-scene-object-snapshot', {
      expectedHash: request.expectedDocumentHash,
      actualHash,
    });
  } else if (request.command.kind === 'create') {
    const record = request.command.record;
    if (flatSceneDocument.nodes.some(node => node.id === record.id)) {
      result = sceneObjectRejection('duplicate-scene-object', { id: record.id });
    } else if (
      record.parent !== null
      && !flatSceneDocument.nodes.some(node => node.id === record.parent)
    ) {
      result = sceneObjectRejection('missing-scene-object-parent', {
        id: record.id,
        parent: record.parent,
      });
    } else if (record.label !== null && record.label.trim().length === 0) {
      result = sceneObjectRejection('blank-scene-object-label', { id: record.id });
    } else if (!isValidSceneTransform(record.transform)) {
      result = sceneObjectRejection('invalid-scene-object-transform', { id: record.id });
    } else {
      flatSceneDocument = {
        ...flatSceneDocument,
        nodes: [...flatSceneDocument.nodes, record],
      };
      selectedSceneNode = record.id;
    }
  } else if (request.command.kind === 'rename') {
    const id = request.command.id;
    const label = request.command.label;
    if (label !== null && label.trim().length === 0) {
      result = sceneObjectRejection('blank-scene-object-label', { id });
    } else if (!flatSceneDocument.nodes.some(node => node.id === id)) {
      result = sceneObjectRejection('missing-scene-object', { id });
    } else {
      flatSceneDocument = {
        ...flatSceneDocument,
        nodes: flatSceneDocument.nodes.map(node =>
          node.id === id ? { ...node, label } : node,
        ),
      };
      scene = relabelRenderableForSceneNode(scene, id, label);
      selectedSceneNode = id;
    }
  } else if (request.command.kind === 'reparent') {
    const id = request.command.id;
    const parent = request.command.parent;
    const childOrder = request.command.childOrder;
    if (!flatSceneDocument.nodes.some(node => node.id === id)) {
      result = sceneObjectRejection('missing-scene-object', { id });
    } else if (
      parent !== null
      && !flatSceneDocument.nodes.some(node => node.id === parent)
    ) {
      result = sceneObjectRejection('missing-scene-object-parent', {
        id,
        parent,
      });
    } else if (parent === id) {
      result = sceneObjectRejection('scene-object-self-parent', { id });
    } else if (hasSceneObjectCycle(flatSceneDocument, id, parent)) {
      result = sceneObjectRejection('invalid-scene-after-command', {
        id,
        parent,
      });
    } else {
      flatSceneDocument = {
        ...flatSceneDocument,
        nodes: flatSceneDocument.nodes.map(node =>
          node.id === id
            ? { ...node, parent, childOrder }
            : node,
        ),
      };
      selectedSceneNode = id;
    }
  } else if (request.command.kind === 'translate') {
    const id = request.command.id;
    const node = flatSceneDocument.nodes.find(item => item.id === id);
    if (node === undefined) {
      result = sceneObjectRejection('missing-scene-object', { id });
    } else if (isSceneNodeTransformReadonly(node)) {
      result = sceneObjectRejection('readonly-scene-object-transform', { id });
    } else if (!isFiniteTuple3(request.command.delta)) {
      result = sceneObjectRejection('invalid-scene-object-transform', { id });
    } else {
      const transform = translatedTransform(node.transform, request.command.delta);
      if (!isValidSceneTransform(transform)) {
        result = sceneObjectRejection('invalid-scene-object-transform', { id });
      } else {
        flatSceneDocument = {
          ...flatSceneDocument,
          nodes: flatSceneDocument.nodes.map(item =>
            item.id === id ? { ...item, transform } : item,
          ),
        };
        scene = transformRenderableForSceneNode(scene, id, node.transform, transform);
        selectedSceneNode = id;
      }
    }
  } else if (request.command.kind === 'rotate') {
    const id = request.command.id;
    const node = flatSceneDocument.nodes.find(item => item.id === id);
    const rotation = isFiniteTuple4(request.command.rotation)
      ? normalizedRotation(request.command.rotation)
      : null;
    if (node === undefined) {
      result = sceneObjectRejection('missing-scene-object', { id });
    } else if (isSceneNodeTransformReadonly(node)) {
      result = sceneObjectRejection('readonly-scene-object-transform', { id });
    } else if (rotation === null) {
      result = sceneObjectRejection('invalid-scene-object-transform', { id });
    } else {
      const transform: SceneTransform = {
        ...node.transform,
        rotation,
      };
      if (!isValidSceneTransform(transform)) {
        result = sceneObjectRejection('invalid-scene-object-transform', { id });
      } else {
        flatSceneDocument = {
          ...flatSceneDocument,
          nodes: flatSceneDocument.nodes.map(item =>
            item.id === id ? { ...item, transform } : item,
          ),
        };
        scene = transformRenderableForSceneNode(scene, id, node.transform, transform);
        selectedSceneNode = id;
      }
    }
  } else {
    const id = request.command.id;
    result = sceneObjectRejection('invalid-scene-before-command', { id });
  }

  const accepted = result === null;
  const sceneObjectSnapshot = buildStudioSceneObjectSnapshot(scene, flatSceneDocument);
  if (accepted) {
    result = {
      accepted: true,
      outcome: {
        document: flatSceneDocument,
        snapshot: contractSceneObjectSnapshot(sceneObjectSnapshot),
        selected: selectedSceneNode,
      },
      rejection: null,
    };
  }
  if (result === null) {
    result = sceneObjectRejection('invalid-scene-before-command');
  }
  const finalResult = result;

  const entities = projectEntitiesFromScene(
    readModel.session,
    scene,
    sceneObjectSnapshot,
    readModel.entities,
  );
  const selectedEntityId =
    selectedSceneNode === null
      ? readModel.selectedEntityId
      : (`scene-node:${selectedSceneNode as number}` as SceneObjectId);
  const command = createTimelineEntry({
    index: readModel.timeline.length,
    commandId: 'scene.apply_object_command',
    label: 'Apply Scene Object Command',
    requestedBy: 'gui',
    status: accepted ? 'ok' : 'rejected',
    inputSummary: `${request.command.kind}; expectedDocumentHash=${request.expectedDocumentHash}`,
    outputSummary: accepted
      ? `Applied ${request.command.kind} scene-object command.`
      : `Rejected ${finalResult.rejection?.code ?? 'scene-object-command'}.`,
    changedScene: accepted,
    changedSelection: accepted && selectedSceneNode !== null,
  });
  const workspace: StudioWorkspaceReadModel = {
    ...readModel,
    scene,
    flatSceneDocument,
    sceneObjectSnapshot,
    entities,
    selectedEntityId,
    timeline: [...readModel.timeline, command.timelineEntry],
    commandResults: [...readModel.commandResults, command.commandResult],
    timelineSequence: readModel.timelineSequence + 1,
  };

  return {
    ok: accepted,
    workspace,
    result: finalResult,
    diagnostics: accepted
      ? []
      : [
          diagnostic(
            'error',
            finalResult.rejection?.code ?? 'scene_object_command_rejected',
            `Scene object command was rejected: ${finalResult.rejection?.code ?? 'unknown'}.`,
            'scene.apply_object_command',
            'Refresh the scene-object snapshot and retry through the public command path.',
          ),
        ],
  };
}

export function serializeStudioWorkspaceArtifact(options: {
  readonly project: StudioProjectWorkspaceIdentity;
  readonly sceneFile: {
    readonly path: string;
    readonly sha256: string;
  };
  readonly projectSettingsSha256: string;
  readonly savedAtIso?: string;
}): string {
  const scenePath = options.sceneFile.path.trim();
  const normalizedManifestPath = normalizeStudioProjectArtifactPath(options.project.manifestPath);
  const savedAtIso = options.savedAtIso ?? '1970-01-01T00:00:00.000Z';
  if (
    scenePath.length === 0
    || normalizedManifestPath === null
    || options.project.gameId.trim().length === 0
    || !isSha256Digest(options.project.manifestSha256)
    || !isSha256Digest(options.sceneFile.sha256)
    || !isSha256Digest(options.projectSettingsSha256)
    || !isUtcIsoTimestamp(savedAtIso)
  ) {
    throw new Error('Studio project workspace requires project identity, a host scene path, and canonical SHA-256 digests.');
  }
  const artifact: StudioWorkspaceArtifact = {
    schemaVersion: 1,
    artifactKind: 'studio_project_workspace',
    artifactId: `studio-project-workspace:${options.project.gameId}`,
    workspaceVersion: 'studio-project-workspace.v2',
    savedAtIso,
    project: {
      gameId: options.project.gameId,
      manifestPath: normalizedManifestPath,
      manifestSha256: options.project.manifestSha256,
    },
    authoredContent: {
      sceneFile: {
        path: scenePath,
        sha256: options.sceneFile.sha256,
      },
      projectSettings: {
        path: ASHA_STUDIO_PROJECT_SETTINGS_PATH,
        sha256: options.projectSettingsSha256,
      },
    },
    stateClassification: {
      durableAuthoredContent: 'hash_pinned_project_sources',
      editorPreferences: 'host_user_settings_keyed_by_canonical_project_not_serialized',
      transientProjection: 'reconstructed_not_serialized',
      attachedRuntime: 'disconnect_and_reconnect_not_serialized',
    },
    serializationNotes: [
      'The durable scene remains an ordinary host file referenced by absolute or relative path and hash.',
      'Project spatial defaults are hash-pinned committed content; host-user preferences remain outside the project.',
      'Host-user preferences are stored by the Studio host and keyed by the canonical project root.',
      'Transient projections are reconstructed from validated authored sources.',
      'Attached runtime authority is never serialized; reconnect after loading stored content.',
    ],
  };

  const canonicalArtifact = JSON.parse(stableJson(artifact)) as unknown;
  return `${JSON.stringify(canonicalArtifact, null, 2)}\n`;
}

export const ASHA_STUDIO_PROJECT_WORKSPACE_PATH = 'studio/asha-studio-workspace.json';

export function normalizeStudioProjectArtifactPath(path: string): string | null {
  const withForwardSlashes = path.replaceAll('\\', '/');
  if (withForwardSlashes.startsWith('/') || /^[a-zA-Z]:\//.test(withForwardSlashes)) {
    return null;
  }
  const segments = withForwardSlashes.split('/').filter(segment => segment.length > 0);
  if (segments.length === 0 || segments.some(segment => segment === '.' || segment === '..')) {
    return null;
  }
  return segments.join('/');
}

function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value);
}

function isUtcIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function recordAt(value: unknown, key: string): Record<string, unknown> {
  return isRecord(value) && isRecord(value[key]) ? value[key] : {};
}

function stringAt(value: unknown, key: string): string | null {
  return isRecord(value) && typeof value[key] === 'string' ? value[key] : null;
}

function stringArrayAt(value: unknown, key: string): readonly string[] {
  if (!isRecord(value) || !Array.isArray(value[key])) {
    return [];
  }
  return value[key].filter((item): item is string => typeof item === 'string');
}

export function restoreStudioWorkspaceArtifact(
  text: string,
  options: {
    readonly expectedProject?: StudioProjectWorkspaceIdentity;
  } = {},
): StudioWorkspaceRestoreResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      artifact: null,
      diagnostics: [
        diagnostic(
          'error',
          'workspace_artifact_invalid_json',
          'Studio project workspace artifact is not valid JSON.',
          'studio_project_workspace',
          'Repair or recreate the project workspace artifact before loading.',
        ),
      ],
    };
  }

  const root = isRecord(parsed) ? parsed : {};
  const project = recordAt(root, 'project');
  const authoredContent = recordAt(root, 'authoredContent');
  const sceneFile = recordAt(authoredContent, 'sceneFile');
  const projectSettings = recordAt(authoredContent, 'projectSettings');
  const stateClassification = recordAt(root, 'stateClassification');
  const scenePath = stringAt(sceneFile, 'path');
  const sceneHash = stringAt(sceneFile, 'sha256');
  const manifestPath = stringAt(project, 'manifestPath');
  const normalizedManifestPath = manifestPath === null ? null : normalizeStudioProjectArtifactPath(manifestPath);
  const serializationNotes = stringArrayAt(root, 'serializationNotes');
  const shapeMatches = root['schemaVersion'] === 1
    && root['artifactKind'] === 'studio_project_workspace'
    && root['workspaceVersion'] === 'studio-project-workspace.v2'
    && root['artifactId'] === `studio-project-workspace:${String(project['gameId'] ?? '')}`
    && isUtcIsoTimestamp(root['savedAtIso'])
    && typeof project['gameId'] === 'string'
    && project['gameId'].trim().length > 0
    && normalizedManifestPath !== null
    && normalizedManifestPath === manifestPath
    && isSha256Digest(project['manifestSha256'])
    && scenePath !== null
    && scenePath.trim().length > 0
    && isSha256Digest(sceneHash)
    && projectSettings['path'] === ASHA_STUDIO_PROJECT_SETTINGS_PATH
    && isSha256Digest(projectSettings['sha256'])
    && stateClassification['durableAuthoredContent'] === 'hash_pinned_project_sources'
    && stateClassification['editorPreferences'] === 'host_user_settings_keyed_by_canonical_project_not_serialized'
    && stateClassification['transientProjection'] === 'reconstructed_not_serialized'
    && stateClassification['attachedRuntime'] === 'disconnect_and_reconnect_not_serialized'
    && Array.isArray(root['serializationNotes'])
    && serializationNotes.length === root['serializationNotes'].length;
  if (!shapeMatches) {
    return {
      ok: false,
      artifact: null,
      diagnostics: [
        diagnostic(
          'error',
          'workspace_artifact_shape_mismatch',
          'Studio project workspace artifact does not match studio-project-workspace.v2.',
          'studio_project_workspace',
          'Load a typed project artifact with a host scene-file path and canonical digests.',
        ),
      ],
    };
  }

  const artifact: StudioWorkspaceArtifact = {
    schemaVersion: 1,
    artifactKind: 'studio_project_workspace',
    artifactId: root['artifactId'] as string,
    workspaceVersion: 'studio-project-workspace.v2',
    savedAtIso: root['savedAtIso'] as string,
    project: {
      gameId: project['gameId'] as string,
      manifestPath: project['manifestPath'] as string,
      manifestSha256: project['manifestSha256'] as string,
    },
    authoredContent: {
      sceneFile: {
        path: scenePath as string,
        sha256: sceneHash as string,
      },
      projectSettings: {
        path: ASHA_STUDIO_PROJECT_SETTINGS_PATH,
        sha256: projectSettings['sha256'] as string,
      },
    },
    stateClassification: {
      durableAuthoredContent: 'hash_pinned_project_sources',
      editorPreferences: 'host_user_settings_keyed_by_canonical_project_not_serialized',
      transientProjection: 'reconstructed_not_serialized',
      attachedRuntime: 'disconnect_and_reconnect_not_serialized',
    },
    serializationNotes,
  };
  if (
    options.expectedProject !== undefined
    && (
      artifact.project.gameId !== options.expectedProject.gameId
      || artifact.project.manifestPath !== options.expectedProject.manifestPath
      || artifact.project.manifestSha256 !== options.expectedProject.manifestSha256
    )
  ) {
    return {
      ok: false,
      artifact: null,
      diagnostics: [
        diagnostic(
          'error',
          'workspace_artifact_foreign_project',
          'Studio project workspace artifact belongs to a different game workspace.',
          artifact.project.gameId,
          'Open the matching project or recreate its Studio workspace artifact.',
        ),
      ],
    };
  }
  return {
    ok: true,
    artifact,
    diagnostics: [],
  };
}

export function validateStudioWorkspaceArtifactSceneReference(
  artifact: StudioWorkspaceArtifact,
  source: { readonly path: string; readonly sha256: string },
): StudioWorkspaceSceneReferenceValidationResult {
  const expected = artifact.authoredContent.sceneFile;
  if (source.path !== expected.path) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'error',
          'workspace_artifact_scene_path_mismatch',
          'Project workspace scene readback returned a different host path.',
          source.path,
          `Read the exact referenced source ${expected.path}.`,
        ),
      ],
    };
  }
  if (source.sha256 !== expected.sha256) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'error',
          'workspace_artifact_scene_hash_mismatch',
          `Referenced scene source ${expected.path} changed after the project workspace was saved.`,
          source.sha256,
          'Reload authored content deliberately, then save a new project workspace artifact.',
        ),
      ],
    };
  }
  return { ok: true, diagnostics: [] };
}

export function stageStudioProjectWorkspaceLoad(options: {
  readonly currentWorkspace: StudioWorkspaceReadModel;
  readonly project: StudioGameWorkspaceReadModel;
  readonly manifestSha256: string;
  readonly artifactText: string;
  readonly sceneFile: { readonly path: string; readonly sha256: string };
  readonly sceneDocument: FlatSceneDocument;
}): StudioProjectWorkspaceLoadResult {
  const restoreResult = restoreStudioWorkspaceArtifact(options.artifactText, {
    expectedProject: {
      gameId: options.project.gameId,
      manifestPath: options.project.manifestPath,
      manifestSha256: options.manifestSha256,
    },
  });
  if (!restoreResult.ok || restoreResult.artifact === null) {
    return {
      ok: false,
      artifact: null,
      workspace: null,
      sceneDocument: null,
      diagnostics: restoreResult.diagnostics,
    };
  }
  const referenceValidation = validateStudioWorkspaceArtifactSceneReference(
    restoreResult.artifact,
    options.sceneFile,
  );
  if (!referenceValidation.ok) {
    return {
      ok: false,
      artifact: null,
      workspace: null,
      sceneDocument: null,
      diagnostics: referenceValidation.diagnostics,
    };
  }
  return {
    ok: true,
    artifact: restoreResult.artifact,
    workspace: applyCanonicalSceneDocumentReadModel(
      options.currentWorkspace,
      options.sceneDocument,
      null,
    ),
    sceneDocument: options.sceneDocument,
    diagnostics: [],
  };
}

export function createSelectEntityIntent(
  readModel: StudioWorkspaceReadModel,
  entityId: string,
): StudioIntent {
  const matchingEntity = readModel.entities.find(entity => entity.id === entityId);

  if (matchingEntity === undefined || !matchingEntity.selectable) {
    return {
      kind: 'noop',
      reason: `unselectable entity: ${entityId}`,
    };
  }

  return {
    kind: 'select_entity',
    entityId,
    expectedTimelineSequence: readModel.timelineSequence,
  };
}

export function applySelectedEntityReadModel(
  readModel: StudioWorkspaceReadModel,
  entityId: string,
): StudioWorkspaceReadModel {
  const selectableEntity = readModel.entities.find(
    entity => entity.id === entityId && entity.selectable,
  );

  if (selectableEntity === undefined) {
    return readModel;
  }

  const scene: StudioSceneReadModel = {
    ...readModel.scene,
    selectedRenderableId: selectableEntity.renderableId,
  };
  const entities = projectEntitiesFromScene(
    readModel.session,
    scene,
    readModel.sceneObjectSnapshot,
    readModel.entities,
  );
  const sequenceIndex = readModel.timeline.length;
  const selectedEntity = entities.find(entity => entity.id === entityId);
  const selectedLabel = selectedEntity?.label ?? entityId;
  const command = createTimelineEntry({
    index: sequenceIndex,
    commandId: 'selection.set_active_entity',
    label: 'Set Active Entity',
    requestedBy: 'gui',
    inputSummary: `entityId=${entityId}`,
    outputSummary: `Selected ${selectedLabel}.`,
    changedScene: false,
    changedSelection: true,
  });

  return {
    ...readModel,
    scene,
    entities,
    selectedEntityId: entityId,
    timeline: [...readModel.timeline, command.timelineEntry],
    commandResults: [...readModel.commandResults, command.commandResult],
    timelineSequence: readModel.timelineSequence + 1,
  };
}
