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
export type StudioViewportHitFace = 'x_min' | 'x_max' | 'y_min' | 'y_max' | 'z_min' | 'z_max';
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
export type StudioViewportToolMode = 'select' | 'orbit' | 'pan' | 'move_object' | 'rotate_object' | 'frame';
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
  | 'proof_scenes'
  | 'commands'
  | 'publish'
  | 'evidence';
export type StudioCommandProposalActionId = 'set_voxel_reference';
export type StudioApplicationMenu =
  | 'file'
  | 'edit'
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
  | 'scene.open_source'
  | 'scene.save_source'
  | 'scene.save_source_as'
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
  | 'voxel_view.from_angle'
  | 'voxel_preview.publish'
  | 'voxel_conversion.import_mesh_source'
  | 'voxel_asset.export_volume'
  | 'voxel_asset.save_volume'
  | 'voxel_asset.load_volume'
  | 'voxel_asset.unload_volume'
  | 'voxel_asset.initialize_authoring_volume'
  | 'voxel_asset.persist'
  | 'voxel_asset.reopen'
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
  | 'runtime_session_missing_backend_evidence'
  | 'runtime_session_backend_incompatible'
  | 'runtime_session_reserved';
export type StudioRunningProjectDiscoveryDiagnosticCode =
  | 'running_project_missing_workspace'
  | 'running_project_missing_endpoint'
  | 'running_project_not_attached'
  | 'running_project_incompatible'
  | 'running_project_stale_live_readback'
  | 'running_project_private_transport';
export type StudioLiveDebugSessionDiagnosticCode =
  | 'missing_live_session'
  | 'stale_fixture_readback'
  | 'backend_proof_mismatch'
  | 'stale_child_artifact';
export type StudioLiveSceneEntityDebugDiagnosticCode =
  | 'missing_live_session'
  | 'missing_selected_entity'
  | 'inspector_readback_drift';
export type StudioLiveAssetResourceDebugDiagnosticCode =
  | 'missing_live_session'
  | 'missing_asset_resource'
  | 'asset_resource_readback_drift';
export type StudioLiveRuntimeTelemetryDebugDiagnosticCode =
  | 'missing_live_session'
  | 'telemetry_readback_missing'
  | 'runtime_readback_mismatch';
export type StudioLiveDebugCommandProposalDiagnosticCode =
  | 'missing_live_session'
  | 'missing_command_proposal_panel'
  | 'debug_command_scope_mismatch'
  | 'unsupported_debug_command'
  | 'missing_command_result_evidence';
export type StudioAuthoredBrowserDebugDiagnosticCode =
  | 'missing_authored_fixture'
  | 'missing_browser_interaction'
  | 'stale_browser_interaction'
  | 'selected_authored_object_mismatch'
  | 'selected_authored_asset_mismatch'
  | 'missing_studio_debug_evidence';
export type StudioAssetInventoryDiagnosticCode =
  | 'asset_inventory_artifact_mismatch'
  | 'asset_inventory_missing_entry'
  | 'asset_inventory_missing_resolution'
  | 'asset_inventory_dependency_mismatch'
  | 'asset_inventory_diagnostic';
export type StudioPublishEvidenceDiagnosticCode =
  | 'publish_evidence_missing'
  | 'publish_evidence_version_mismatch'
  | 'publish_evidence_stale'
  | 'publish_evidence_dependency_guard_failed'
  | 'publish_evidence_run_smoke_failed';
export type StudioProofSceneDiagnosticCode =
  | 'proof_scene_missing'
  | 'proof_scene_unsupported_schema'
  | 'proof_scene_missing_catalog_reference'
  | 'proof_scene_missing_runtime_fixture'
  | 'proof_scene_evidence_failed';
export type StudioWorkspaceOpenReadDiagnosticCode =
  | 'missing_manifest'
  | 'workspace_source_path_escape'
  | 'private_repo_scan'
  | 'unsupported_file_kind'
  | 'workspace_source_not_allowed';
export type StudioSceneFileDiagnosticCode =
  | 'scene_file_missing_workspace'
  | 'scene_file_not_found'
  | 'scene_file_unsupported_schema'
  | 'scene_file_invalid_json'
  | 'scene_file_stale_hash'
  | 'scene_file_path_not_allowed'
  | 'scene_file_missing_name'
  | 'scene_file_missing_catalog_assets';
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
export type StudioAuthoredStatePanelReflectionDiagnosticCode =
  | 'authored_panel_marker_missing'
  | 'authored_scene_object_missing_from_hierarchy'
  | 'authored_scene_object_missing_from_inspector'
  | 'authored_scene_object_missing_from_viewport'
  | 'authored_catalog_entry_missing_from_assets'
  | 'authored_catalog_entry_missing_from_inspector';

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
    readonly backendProofRefs: readonly string[];
  };
  readonly publishCommand: string;
  readonly publishVerifyCommand: string;
  readonly devResourceProfile: AshaGameManifest['devResourceProfile'];
  readonly publishResourceProfile: AshaGameManifest['publishResourceProfile'];
  readonly workspaceHash: string;
  readonly diagnostics: readonly StudioDiagnostic[];
}

export type StudioWorkspaceSourceSchemaKind =
  | 'proof-scene-json.v1'
  | 'asset-catalog-json.v1';

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
  readonly operationKind: 'authoring.scene.save_source' | 'authoring.catalog.save_source';
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
  readonly allowedSceneRoots: readonly string[];
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

export interface StudioSceneFileSourceInput {
  readonly path: string;
  readonly text: string;
  readonly sha256: string;
}

export interface StudioSceneFileReadModel {
  readonly sceneFileVersion: 'studio-scene-file.v0';
  readonly path: string;
  readonly hash: string;
  readonly sceneId: string;
  readonly name: string;
  readonly description: string | null;
  readonly catalogAssetIds: readonly string[];
  readonly runtimeFixture: string | null;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly sceneFileHash: string;
}

export interface StudioSceneFileListReadModel {
  readonly sceneFileListVersion: 'studio-scene-file-list.v0';
  readonly workspaceHash: string;
  readonly allowedSceneRoots: readonly string[];
  readonly files: readonly StudioSceneFileReadModel[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly commandIds: {
    readonly list: 'scene.list_sources';
    readonly open: 'scene.open_source';
  };
  readonly nonClaims: readonly [
    'not_repo_crawler',
    'not_private_file_picker',
    'not_runtime_authority',
  ];
  readonly sceneFileListHash: string;
}

export type StudioSceneFileListResult =
  | {
      readonly ok: true;
      readonly sceneFiles: StudioSceneFileListReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly sceneFiles: StudioSceneFileListReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioSceneFileSaveReadback {
  readonly saveVersion: 'studio-scene-file-save.v0';
  readonly commandId: 'scene.save_source' | 'scene.save_source_as';
  readonly path: string;
  readonly previousHash: string | null;
  readonly nextHash: string;
  readonly sceneFileHash: string;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_file_write',
  ];
  readonly saveHash: string;
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

export interface StudioAuthoredStatePanelReflectionReadModel {
  readonly reflectionVersion: 'studio-authored-state-panel-reflection.v0';
  readonly visiblePanelMarkers: readonly string[];
  readonly expected: {
    readonly sceneObjectId: SceneObjectId;
    readonly sceneObjectLabel: string;
    readonly catalogAssetId: string;
  };
  readonly hierarchyPanel: {
    readonly objectId: SceneObjectId | null;
    readonly displayName: string | null;
    readonly selected: boolean;
    readonly sceneObjectSnapshotHash: string;
  };
  readonly viewportPanel: {
    readonly selectedEntityId: string | null;
    readonly selectedRenderableId: string | null;
    readonly renderableIds: readonly string[];
    readonly sceneHash: string;
  };
  readonly inspectorPanel: {
    readonly selectedObjectId: SceneObjectId | null;
    readonly selectedObjectName: string | null;
    readonly selectedCatalogAssetId: string | null;
    readonly selectedCatalogAssetKind: string | null;
  };
  readonly assetsPanel: {
    readonly assetId: string | null;
    readonly kind: string | null;
    readonly sourcePath: string | null;
    readonly dependencyStatus: 'none' | 'resolved' | 'missing' | null;
    readonly inventoryHash: string;
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_ui_mutation',
    'not_dom_screenshot',
  ];
  readonly reflectionHash: string;
}

export type StudioAuthoredStatePanelReflectionResult =
  | {
      readonly ok: true;
      readonly reflection: StudioAuthoredStatePanelReflectionReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly reflection: StudioAuthoredStatePanelReflectionReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

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

export interface StudioGameWorkspaceAttachEvidenceArtifact {
  readonly artifactKind: 'studio_game_workspace_attach_evidence';
  readonly artifactVersion: 'studio-game-workspace-attach-evidence.v0';
  readonly artifactId: string;
  readonly generatedFrom: {
    readonly workspaceHash: string;
    readonly attachHash: string;
    readonly liveHash: string | null;
    readonly commandProposalHashes: readonly string[];
  };
  readonly workspace: StudioGameWorkspaceReadout;
  readonly attach: StudioGameWorkspaceAttachReadModel;
  readonly live: StudioGameWorkspaceLiveReadModel | null;
  readonly commandProposals: readonly StudioGameWorkspaceCommandProposalReadModel[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_native_runtime_authority',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
    'not_publish_artifact',
  ];
  readonly artifactHash: string;
}

export type StudioRuntimeSessionType = 'preview' | 'attached' | 'fixture_reserved' | 'replay_reserved';
export type StudioRuntimeSessionStatus = 'available' | 'attached' | 'reserved' | 'degraded';
export type StudioRuntimeBackendCompatibilityState =
  | 'compatible'
  | 'pending_attach'
  | 'missing_evidence'
  | 'incompatible'
  | 'reserved';

export interface StudioRuntimeBackendEvidence {
  readonly source: 'devtools.handshake.runtime';
  readonly backendMode: AshaGameRuntimeBackendMode | null;
  readonly backendProfile: string | null;
  readonly backendProofRefs: readonly string[];
  readonly nativeProofRef: string | null;
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
  readonly backendProofRefs: readonly string[];
  readonly backendCompatibilityState: StudioRuntimeBackendCompatibilityState;
  readonly attachStatus: 'not_attached' | 'attached' | 'reserved';
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

export type StudioAshaDemoProductPathMode = 'definition_authoring' | 'live_runtime_inspection';

export interface StudioAshaDemoProductPathContentReadModel {
  readonly kind:
    | 'manifest'
    | 'project_bundle'
    | 'entity_definition'
    | 'scene_document'
    | 'level_preset'
    | 'catalog'
    | 'runtime_entry';
  readonly label: string;
  readonly path: string;
  readonly validationStatus: 'valid' | 'invalid' | 'pending_live_attach' | 'unavailable';
  readonly evidenceHash: string | null;
}

export interface StudioAshaDemoProductPathReadModel {
  readonly productPathVersion: 'studio-asha-demo-product-path.v0';
  readonly project: {
    readonly gameId: string | null;
    readonly workspaceRoot: string | null;
    readonly manifestPath: string;
    readonly projectBundlePath: 'project/project-bundle.json';
  };
  readonly mode: StudioAshaDemoProductPathMode;
  readonly authoredContent: readonly StudioAshaDemoProductPathContentReadModel[];
  readonly definitionAuthoring: {
    readonly generatedLevelPresetStatus: StudioGeneratedLevelInspectionReadModel['definitionAuthoring']['validationStatus'];
    readonly gameplayPresetStatus: StudioPlayableLoopDefinitionAuthoringReadModel['validation']['status'];
    readonly generatedLevelPresetPath: StudioGeneratedLevelInspectionReadModel['definitionAuthoring']['presetPath'];
    readonly gameplayPresetPath: StudioPlayableLoopDefinitionAuthoringReadModel['source']['presetPath'];
  };
  readonly liveRuntime: {
    readonly attachState: StudioRuntimeSessionInspectionReadModel['attachState'];
    readonly sessionStatus: StudioRuntimeSessionInspectionReadModel['sessionStatus'];
    readonly sessionId: string | null;
    readonly tick: number | null;
    readonly sessionHash: string | null;
    readonly replayRecordCount: number;
    readonly lifecycleLabel: string | null;
    readonly playerHealth: string | null;
    readonly enemyHealth: string | null;
  };
  readonly controls: {
    readonly attach: {
      readonly commandId: 'runtime_session.attach_public_facade';
      readonly available: boolean;
      readonly publicSurface: '@asha/runtime-bridge:createRuntimeSessionFacade(mode=rust)';
    };
    readonly runPolicy: {
      readonly commandId: 'runtime_session.run_autonomous_policy_tick';
      readonly available: boolean;
      readonly disabledReason: string | null;
      readonly publicSurface: '@asha/runtime-session:RuntimeSessionFacade.runAutonomousPolicyTick';
    };
    readonly restart: {
      readonly commandId: 'runtime.restart_session_intent';
      readonly available: boolean;
      readonly disabledReason: string | null;
      readonly publicSurface: '@asha/runtime-session:RuntimeSessionFacade.requestSessionRestart';
    };
  };
  readonly publicSurfacesUsed: readonly string[];
  readonly boundaries: {
    readonly definitionAuthoringOwnsStoredFiles: true;
    readonly liveRuntimeInspectionUsesPublicFacade: true;
    readonly studioOwnsGameplayAuthority: false;
    readonly runtimeToDefinitionExport: false;
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_transport',
    'not_demo_local_shadow_state',
    'not_runtime_to_definition_export',
  ];
  readonly productPathHash: string;
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

export interface StudioLiveDebugSessionChildArtifactRef {
  readonly kind: string;
  readonly path: string;
  readonly artifactHash: string;
  readonly fileHash: string;
  readonly expectedArtifactHash?: string;
  readonly expectedFileHash?: string;
}

export interface StudioLiveDebugSessionIdentityReadModel {
  readonly identityVersion: 'studio-live-debug-session-identity.v0';
  readonly sessionId: string;
  readonly sessionHash: string;
  readonly sessionType: StudioRuntimeSessionType;
  readonly attachStatus: 'not_attached' | 'attached' | 'reserved';
  readonly runtimeMode: StudioRuntimeSessionReadModel['runtimeMode'];
  readonly backendMode: AshaGameRuntimeBackendMode;
  readonly backendProfile: string;
  readonly backendProofRefs: readonly string[];
  readonly backendCompatibilityState: StudioRuntimeBackendCompatibilityState;
  readonly endpoint: string | null;
  readonly workspaceHash: string;
  readonly attachHash: string;
  readonly liveHash: string;
  readonly liveFreshness: {
    readonly freshnessVersion: 'studio-live-debug-freshness.v0';
    readonly attachSequenceId: string;
    readonly readSequenceId: string;
    readonly readAfterAttach: boolean;
    readonly projectionTick: number | null;
    readonly runtimeSessionSummaryHash: string | null;
    readonly renderDiffHash: string | null;
    readonly telemetrySampleCount: number;
  };
  readonly childArtifacts: readonly StudioLiveDebugSessionChildArtifactRef[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_studio_runtime_authority',
    'not_private_transport',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ];
  readonly identityHash: string;
}

export type StudioLiveDebugSessionIdentityResult =
  | {
      readonly ok: true;
      readonly identity: StudioLiveDebugSessionIdentityReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly identity: StudioLiveDebugSessionIdentityReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioLiveSceneEntityDebugInspectorReadModel {
  readonly inspectorVersion: 'studio-live-scene-entity-debug-inspector.v0';
  readonly sessionId: string;
  readonly scene: {
    readonly sceneId: string;
    readonly sceneHash: string;
    readonly renderableCount: number;
    readonly selectedRenderableId: string | null;
    readonly selectedEntityId: string | null;
    readonly sceneObjectSnapshotHash: string;
  };
  readonly entity: {
    readonly entityId: string | null;
    readonly sceneObjectId: SceneObjectId | null;
    readonly label: string | null;
    readonly sourceState: StudioEntitySourceState | null;
    readonly renderableId: string | null;
    readonly provenance: {
      readonly renderableId: string | null;
      readonly materialRef: string | null;
      readonly meshRef: string | null;
    } | null;
    readonly transform: SceneTransform | null;
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_ecs_read',
    'not_source_authoring_write',
  ];
  readonly inspectorHash: string;
}

export type StudioLiveSceneEntityDebugInspectorResult =
  | {
      readonly ok: true;
      readonly inspector: StudioLiveSceneEntityDebugInspectorReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly inspector: StudioLiveSceneEntityDebugInspectorReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioLiveAssetResourceDebugInspectorReadModel {
  readonly inspectorVersion: 'studio-live-asset-resource-debug-inspector.v0';
  readonly sessionId: string;
  readonly inventoryHash: string;
  readonly selectedAssetId: string;
  readonly asset: {
    readonly assetId: string | null;
    readonly kind: string | null;
    readonly sourcePath: string | null;
    readonly sourceHash: string | null;
    readonly importStatus: string | null;
    readonly dependencyStatus: 'none' | 'resolved' | 'missing' | null;
    readonly referencedRenderableIds: readonly string[];
    readonly publishOutputKey: string | null;
    readonly packedHash: string | null;
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_asset_database',
    'not_publish_builder',
  ];
  readonly inspectorHash: string;
}

export type StudioLiveAssetResourceDebugInspectorResult =
  | {
      readonly ok: true;
      readonly inspector: StudioLiveAssetResourceDebugInspectorReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly inspector: StudioLiveAssetResourceDebugInspectorReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioLiveRuntimeTelemetryDebugInspectorReadModel {
  readonly inspectorVersion: 'studio-live-runtime-telemetry-debug-inspector.v0';
  readonly sessionId: string;
  readonly runtime: {
    readonly runtimeMode: StudioRuntimeSessionReadModel['runtimeMode'];
    readonly backendMode: AshaGameRuntimeBackendMode;
    readonly backendProfile: string;
    readonly backendProofRefs: readonly string[];
    readonly endpoint: string | null;
    readonly attachHash: string;
    readonly liveHash: string;
  };
  readonly projection: {
    readonly runtimeSessionSummaryHash: string;
    readonly renderDiffHash: string;
    readonly entityCount: number;
    readonly tick: number;
  } | null;
  readonly telemetry: {
    readonly sampleCount: number;
    readonly sampleMetrics: readonly string[];
    readonly commandQueueDepth: number | null;
    readonly acceptedCommandCount: number | null;
    readonly rejectedCommandCount: number | null;
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_transport',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ];
  readonly inspectorHash: string;
}

export type StudioLiveRuntimeTelemetryDebugInspectorResult =
  | {
      readonly ok: true;
      readonly inspector: StudioLiveRuntimeTelemetryDebugInspectorReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly inspector: StudioLiveRuntimeTelemetryDebugInspectorReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioLiveDebugCommandProposalSurfaceReadModel {
  readonly surfaceVersion: 'studio-live-debug-command-proposals.v0';
  readonly sessionId: string;
  readonly workspaceHash: string;
  readonly attachHash: string;
  readonly liveHash: string;
  readonly sceneEntityInspectorHash: string;
  readonly runtimeTelemetryInspectorHash: string;
  readonly allowedActionIds: readonly StudioCommandProposalActionId[];
  readonly actions: readonly StudioCommandProposalActionReadModel[];
  readonly proposals: readonly StudioGameWorkspaceCommandProposalReadModel[];
  readonly proposalStatuses: readonly ('accepted' | 'rejected')[];
  readonly acceptedProposalHash: string | null;
  readonly rejectedProposalHash: string | null;
  readonly evidenceRefs: readonly StudioAssetInventoryEvidenceRef[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'does_not_mutate_without_devtools_acceptance',
    'not_runtime_authority',
    'not_private_runtime_mutation',
    'not_freeform_json_method_call',
  ];
  readonly surfaceHash: string;
}

export type StudioLiveDebugCommandProposalSurfaceResult =
  | {
      readonly ok: true;
      readonly surface: StudioLiveDebugCommandProposalSurfaceReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly surface: StudioLiveDebugCommandProposalSurfaceReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioAuthoredBrowserDebugInputFixture {
  readonly fixtureKind: 'studio_authored_roundtrip_fixture';
  readonly fixtureHash: string;
  readonly authoredScene: {
    readonly objectId: string;
    readonly record: {
      readonly label: string;
      readonly transform: SceneTransform;
    };
  };
  readonly authoredCatalog: {
    readonly authoredAssetId: string;
    readonly authoredCatalogHash: string;
    readonly entry: {
      readonly source: string;
    };
  };
}

export interface StudioAuthoredBrowserDebugInputInteraction {
  readonly artifactKind: 'studio_authored_browser_interaction_proof';
  readonly artifactHash: string;
  readonly authoredInteraction: {
    readonly objectId: string;
    readonly assetId: string;
    readonly inputEventCount: number;
    readonly typedRequestCount: number;
    readonly readbackCount: number;
    readonly finalSelectedObjectId: string;
    readonly finalSelectedAssetId: string;
    readonly interactionHash: string;
    readonly runtimeWorldHash: string;
  };
}

export interface StudioAuthoredBrowserDebugReadModel {
  readonly debugVersion: 'studio-authored-browser-debug.v0';
  readonly authoredFixtureHash: string;
  readonly browserInteractionHash: string;
  readonly studioDebugEvidenceHash: string | null;
  readonly selected: {
    readonly objectId: string | null;
    readonly assetId: string | null;
    readonly label: string | null;
    readonly transform: SceneTransform | null;
    readonly finalSelectedObjectId: string | null;
    readonly finalSelectedAssetId: string | null;
  };
  readonly browserReadback: {
    readonly inputEventCount: number;
    readonly typedRequestCount: number;
    readonly readbackCount: number;
    readonly interactionHash: string | null;
    readonly runtimeWorldHash: string | null;
  };
  readonly studioCorrelation: {
    readonly authoredObjectMatchesBrowserSelection: boolean;
    readonly authoredAssetMatchesBrowserSelection: boolean;
    readonly typedRequestsMatchInputs: boolean;
    readonly readbacksMatchTypedRequests: boolean;
    readonly studioDebugEvidencePresent: boolean;
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_private_runtime_transport',
    'not_source_write',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ];
  readonly debugHash: string;
}

export type StudioAuthoredBrowserDebugResult =
  | {
      readonly ok: true;
      readonly debug: StudioAuthoredBrowserDebugReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly debug: StudioAuthoredBrowserDebugReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export type StudioPublishEvidenceStatus = 'ready' | 'missing' | 'stale' | 'degraded';

export interface StudioPublishEvidenceResourceReadModel {
  readonly assetId: string;
  readonly outputKey: string;
  readonly sourceHash: string | null;
  readonly packedHash: string | null;
  readonly runnableHash: string | null;
}

export interface StudioPublishEvidenceReadModel {
  readonly publishEvidenceVersion: 'studio-publish-evidence.v0';
  readonly status: StudioPublishEvidenceStatus;
  readonly evidenceKind: string;
  readonly evidenceVersion: string;
  readonly evidenceId: string | null;
  readonly evidenceHash: string | null;
  readonly artifactPath: string | null;
  readonly artifactHash: string | null;
  readonly artifactVersion: string | null;
  readonly artifactFileHash: string | null;
  readonly runnableTarget: string | null;
  readonly runnableEntrypointPath: string | null;
  readonly runnableEntrypointHash: string | null;
  readonly resourcePackManifestPath: string | null;
  readonly resourcePackManifestHash: string | null;
  readonly compiledAssetCount: number;
  readonly publishAssetCount: number;
  readonly packedResources: readonly StudioPublishEvidenceResourceReadModel[];
  readonly dependencyGuard: {
    readonly status: string;
    readonly inspectedFileCount: number;
    readonly forbiddenFragments: readonly string[];
  };
  readonly runSmoke: {
    readonly path: string | null;
    readonly fileHash: string | null;
    readonly runtimeMode: string | null;
    readonly launcherName: string | null;
    readonly worldHash: string | null;
    readonly acceptedCommandStatus: string | null;
    readonly rejectedCommandStatus: string | null;
    readonly resolvedResourceCount: number;
  };
  readonly checks: readonly string[];
  readonly validations: readonly string[];
  readonly evidenceRefs: readonly StudioAssetInventoryEvidenceRef[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly string[];
  readonly publishEvidenceHash: string;
}

export type StudioPublishEvidenceLoadResult =
  | {
      readonly ok: true;
      readonly publishEvidence: StudioPublishEvidenceReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly publishEvidence: StudioPublishEvidenceReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export type StudioWorkspaceCockpitEvidenceDiagnosticCode =
  | 'cockpit_missing_game_workspace'
  | 'cockpit_missing_asset_inventory'
  | 'cockpit_missing_proof_scenes'
  | 'cockpit_missing_runtime_sessions'
  | 'cockpit_missing_command_proposals'
  | 'cockpit_missing_publish_evidence'
  | 'cockpit_missing_panel_marker';

export interface StudioWorkspaceCockpitEvidenceArtifact {
  readonly artifactKind: 'studio_workspace_cockpit_evidence';
  readonly artifactVersion: 'studio-workspace-cockpit-evidence.v0';
  readonly generatedFrom: {
    readonly studioWorkspaceHash: string;
    readonly gameWorkspaceHash: string;
    readonly assetInventoryHash: string;
    readonly proofSceneListHash: string;
    readonly runtimeSessionListHash: string;
    readonly commandProposalPanelHash: string;
    readonly publishEvidenceHash: string;
  };
  readonly workspace: {
    readonly gameId: string;
    readonly manifestPath: string;
    readonly manifestHash: string;
    readonly attachEndpoint: string;
    readonly publishCommand: string;
  };
  readonly panels: {
    readonly visibleMarkers: readonly string[];
    readonly assetInventory: {
      readonly status: string;
      readonly entryCount: number;
      readonly evidenceRefs: readonly StudioAssetInventoryEvidenceRef[];
    };
    readonly proofScenes: {
      readonly sceneIds: readonly string[];
      readonly evidenceStatuses: readonly string[];
    };
    readonly runtimeSessions: {
      readonly activeSessionId: string;
      readonly statuses: readonly string[];
    };
    readonly commandProposals: {
      readonly actionIds: readonly StudioCommandProposalActionId[];
      readonly proposalHashes: readonly string[];
      readonly statuses: readonly string[];
    };
    readonly publishEvidence: {
      readonly status: StudioPublishEvidenceStatus | 'missing';
      readonly evidenceHash: string | null;
      readonly artifactHash: string | null;
      readonly dependencyGuard: string;
    };
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly [
    'not_runtime_authority',
    'not_publish_builder',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ];
  readonly artifactHash: string;
}

export type StudioWorkspaceCockpitEvidenceResult =
  | {
      readonly ok: true;
      readonly artifact: StudioWorkspaceCockpitEvidenceArtifact;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly artifact: StudioWorkspaceCockpitEvidenceArtifact;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

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

export interface StudioProofSceneInput {
  readonly path: string;
  readonly schemaVersion: number;
  readonly sceneId: number | string;
  readonly name: string;
  readonly description?: string;
  readonly catalogAssetIds: readonly string[];
  readonly runtimeFixture: string | null;
}

export interface StudioProofSceneEvidenceInput {
  readonly proofSceneCommandStatus?: 'passed' | 'failed' | 'missing';
  readonly proofSceneCommand?: string;
  readonly assetInventoryArtifactPath?: string;
  readonly assetInventoryArtifactHash?: string;
}

export interface StudioProofSceneReadModel {
  readonly proofSceneVersion: 'studio-proof-scene.v0';
  readonly path: string;
  readonly sceneId: string;
  readonly name: string;
  readonly description: string | null;
  readonly catalogAssetIds: readonly string[];
  readonly catalogStatus: 'resolved' | 'missing';
  readonly missingCatalogAssetIds: readonly string[];
  readonly runtimeFixture: string | null;
  readonly runtimeProfile: string;
  readonly evidenceStatus: 'passed' | 'failed' | 'missing';
  readonly evidenceRefs: readonly StudioAssetInventoryEvidenceRef[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly proofSceneHash: string;
}

export interface StudioProofSceneListReadModel {
  readonly proofSceneListVersion: 'studio-proof-scene-list.v0';
  readonly sceneRoots: readonly string[];
  readonly scenes: readonly StudioProofSceneReadModel[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly proofSceneListHash: string;
}

export type StudioProofSceneListLoadResult =
  | {
      readonly ok: true;
      readonly proofScenes: StudioProofSceneListReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly proofScenes: StudioProofSceneListReadModel;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioCompatibilityRequirement {
  readonly packageName: string;
  readonly compatibilityVersion: string;
  readonly packageVersion: string;
  readonly packageLink: string;
  readonly requiredForStartup: boolean;
  readonly presentInStudio: boolean;
  readonly source: string;
}

export interface StudioAshaPackageVersion {
  readonly packageName: string;
  readonly version: string;
  readonly commit: string | null;
}

export interface StudioPackageSurfaceReadback {
  readonly presentPackageVersions: readonly StudioAshaPackageVersion[];
  readonly missingRequiredPackages: readonly StudioCompatibilityRequirement[];
  readonly mismatchedRequiredPackages: readonly {
    readonly requirement: StudioCompatibilityRequirement;
    readonly actualLink: string;
  }[];
}

export interface StudioCompatibilityEvidence {
  readonly contractsVersion: string;
  readonly commandRegistryVersion: string;
  readonly editorToolsVersion: string;
  readonly runtimeBridgeVersion: string | null;
  readonly studioEvidenceVersion: 'studio-evidence.deferred-v0';
  readonly ashaPackageVersions: readonly StudioAshaPackageVersion[];
  readonly diagnostics: readonly StudioDiagnostic[];
}

export interface StudioSessionReadModel {
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly scenarioLabel: string;
  readonly runtimeMode: 'reference';
  readonly status: StudioWorkspaceStatus;
  readonly startedAtIso: string;
}

export interface StudioScenarioSummary {
  readonly scenarioId: string;
  readonly label: string;
  readonly status: 'available' | 'loaded';
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
  readonly compatibilityMarker: string;
  readonly compatibility: StudioCompatibilityEvidence;
  readonly session: StudioSessionReadModel;
  readonly scenarios: readonly StudioScenarioSummary[];
  readonly scene: StudioSceneReadModel;
  readonly flatSceneDocument: FlatSceneDocument;
  readonly sceneObjectSnapshot: EditorSceneObjectSnapshot;
  readonly entities: readonly StudioEntityReadModel[];
  readonly selectedEntityId: string | null;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResultReadModel[];
  readonly timelineSequence: number;
}

export interface StudioAgentReadoutArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'agent_readout';
  readonly artifactId: string;
  readonly generatedAtIso: string;
  readonly workspaceId: string;
  readonly compatibilityMarker: string;
  readonly session: StudioSessionReadModel;
  readonly compatibility: StudioCompatibilityEvidence;
  readonly scene: StudioSceneReadModel;
  readonly entities: readonly StudioEntityReadModel[];
  readonly selectedEntityId: string | null;
  readonly entityListHash: string;
  readonly viewport: StudioViewportReadout | undefined;
  readonly renderSettings: StudioRenderSettingsReadModel | undefined;
  readonly uiState: StudioUiStateReadModel | undefined;
  readonly commandTimeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResultReadModel[];
  readonly readbackMarker: string;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly knownLimitations: readonly string[];
}

export interface StudioCompactAgentReadout {
  readonly schemaVersion: 1;
  readonly artifactKind: 'compact_agent_readout';
  readonly readoutVersion: 'studio-compact-readout.v0';
  readonly workspaceId: string;
  readonly compatibilityMarker: string;
  readonly session: {
    readonly sessionId: string;
    readonly scenarioId: string;
    readonly scenarioLabel: string;
    readonly status: StudioWorkspaceStatus;
  };
  readonly scene: {
    readonly sceneId: string;
    readonly sceneHash: string;
    readonly renderableCount: number;
    readonly selectedRenderableId: string | null;
  };
  readonly selectedEntity: {
    readonly entityId: string;
    readonly label: string;
    readonly kind: StudioEntityKind;
    readonly sourceState: StudioEntitySourceState;
  } | null;
  readonly viewport: StudioViewportReadout;
  readonly latestViewportHit: StudioViewportHitReadModel | null;
  readonly renderSettings: StudioRenderSettingsReadModel;
  readonly uiState: StudioUiStateReadModel | undefined;
  readonly latestCommand: StudioCommandTimelineEntry | null;
  readonly latestCommandResult: StudioCommandResultReadModel | null;
  readonly timelineSequence: number;
  readonly readbackMarker: string;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly nonClaims: readonly string[];
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
  readonly selectedScenarioDraftId: string;
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
  readonly workspaceVersion: 'studio-project-workspace.v1';
  readonly savedAtIso: string;
  readonly project: StudioProjectWorkspaceIdentity;
  readonly authoredContent: {
    readonly sceneSource: {
      readonly path: string;
      readonly sha256: string;
    };
  };
  readonly stateClassification: {
    readonly durableAuthoredContent: 'hash_pinned_project_sources';
    readonly editorPreferences: 'browser_local_not_serialized';
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
      readonly sceneFile: StudioSceneFileReadModel;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly artifact: null;
      readonly workspace: null;
      readonly sceneFile: null;
      readonly diagnostics: readonly StudioDiagnostic[];
    };

export interface StudioScenarioLoadResult {
  readonly ok: boolean;
  readonly workspace: StudioWorkspaceReadModel;
  readonly diagnostics: readonly StudioDiagnostic[];
}

export interface StudioAssetBrowserCategoryReadModel {
  readonly category: StudioAssetBrowserCategory;
  readonly label: string;
  readonly count: number;
}

export interface StudioPackageJsonLike {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
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

export interface LoadScenarioIntent {
  readonly kind: 'load_scenario';
  readonly scenarioId: string;
  readonly expectedTimelineSequence: number;
}

export interface LoadReferenceAssetIntent {
  readonly kind: 'load_reference_asset';
  readonly assetId: 'static-mesh:reference-placeholder';
  readonly expectedTimelineSequence: number;
}

export interface OpenSceneFileIntent {
  readonly kind: 'open_scene_file';
  readonly path: string;
  readonly expectedHash: string;
  readonly expectedTimelineSequence: number;
}

export interface SaveSceneFileIntent {
  readonly kind: 'save_scene_file';
  readonly path: string;
  readonly expectedPreviousHash: string | null;
  readonly saveAs: boolean;
  readonly expectedTimelineSequence: number;
}

export interface NoopIntent {
  readonly kind: 'noop';
  readonly reason: string;
}

export type StudioIntent =
  | SelectEntityIntent
  | SceneObjectCommandIntent
  | LoadScenarioIntent
  | LoadReferenceAssetIntent
  | OpenSceneFileIntent
  | SaveSceneFileIntent
  | NoopIntent;

export interface StudioSceneObjectCommandApplyResult {
  readonly ok: boolean;
  readonly workspace: StudioWorkspaceReadModel;
  readonly result: SceneObjectCommandResult;
  readonly diagnostics: readonly StudioDiagnostic[];
}

const ASHA_PACKAGE_LINK_ROOT = ['link:..', 'asha-engine', 'ts', 'packages'].join('/');

export const STUDIO_EVIDENCE_DEFERRED_VERSION = 'studio-evidence.deferred-v0';

export const ASHA_COMPATIBILITY_REQUIREMENTS: readonly StudioCompatibilityRequirement[] = [
  {
    packageName: '@asha/contracts',
    compatibilityVersion: 'contracts.v0',
    packageVersion: '0.1.0',
    packageLink: `${ASHA_PACKAGE_LINK_ROOT}/contracts`,
    requiredForStartup: true,
    presentInStudio: true,
    source: 'public @asha/contracts package root',
  },
  {
    packageName: '@asha/command-registry',
    compatibilityVersion: 'command-registry.v0',
    packageVersion: '0.1.0',
    packageLink: `${ASHA_PACKAGE_LINK_ROOT}/command-registry`,
    requiredForStartup: true,
    presentInStudio: true,
    source: 'public @asha/command-registry package root',
  },
  {
    packageName: '@asha/editor-tools',
    compatibilityVersion: 'editor-tools.v0',
    packageVersion: '0.1.0',
    packageLink: `${ASHA_PACKAGE_LINK_ROOT}/editor-tools`,
    requiredForStartup: true,
    presentInStudio: true,
    source: 'public @asha/editor-tools package root',
  },
  {
    packageName: '@asha/runtime-bridge',
    compatibilityVersion: 'runtime-bridge.v0',
    packageVersion: '0.1.0',
    packageLink: `${ASHA_PACKAGE_LINK_ROOT}/runtime-bridge`,
    requiredForStartup: false,
    presentInStudio: true,
    source: 'public @asha/runtime-bridge package root',
  },
];

function diagnostic(
  severity: StudioDiagnosticSeverity,
  code: string,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return { severity, code, message, source, remediation };
}

function packageSections(packageJson: StudioPackageJsonLike): readonly Readonly<Record<string, string>>[] {
  return [
    packageJson.dependencies ?? {},
    packageJson.devDependencies ?? {},
    packageJson.peerDependencies ?? {},
    packageJson.optionalDependencies ?? {},
  ];
}

function findDeclaredPackageLink(
  packageJson: StudioPackageJsonLike,
  packageName: string,
): string | undefined {
  for (const section of packageSections(packageJson)) {
    const value = section[packageName];
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function defaultStudioPackageJsonLike(): StudioPackageJsonLike {
  const dependencies = Object.fromEntries(
    ASHA_COMPATIBILITY_REQUIREMENTS.map(requirement => [
      requirement.packageName,
      requirement.packageLink,
    ]),
  );
  return { dependencies };
}

export function readStudioPackageSurfaces(
  packageJson: StudioPackageJsonLike = defaultStudioPackageJsonLike(),
  requirements: readonly StudioCompatibilityRequirement[] = ASHA_COMPATIBILITY_REQUIREMENTS,
): StudioPackageSurfaceReadback {
  const presentPackageVersions: StudioAshaPackageVersion[] = [];
  const missingRequiredPackages: StudioCompatibilityRequirement[] = [];
  const mismatchedRequiredPackages: {
    readonly requirement: StudioCompatibilityRequirement;
    readonly actualLink: string;
  }[] = [];

  for (const requirement of requirements) {
    if (!requirement.presentInStudio) {
      continue;
    }
    const actualLink = findDeclaredPackageLink(packageJson, requirement.packageName);
    if (actualLink === undefined) {
      if (requirement.requiredForStartup) {
        missingRequiredPackages.push(requirement);
      }
      continue;
    }
    if (actualLink !== requirement.packageLink) {
      if (requirement.requiredForStartup) {
        mismatchedRequiredPackages.push({ requirement, actualLink });
      }
      continue;
    }
    presentPackageVersions.push({
      packageName: requirement.packageName,
      version: requirement.packageVersion,
      commit: null,
    });
  }

  return { presentPackageVersions, missingRequiredPackages, mismatchedRequiredPackages };
}

function compatibilityVersionForPackage(
  packageName: string,
  readback: StudioPackageSurfaceReadback,
  requirements: readonly StudioCompatibilityRequirement[],
): string {
  const requirement = requirements.find(item => item.packageName === packageName);
  if (requirement === undefined) {
    return 'missing';
  }
  const present = readback.presentPackageVersions.some(item => item.packageName === packageName);
  return present ? requirement.compatibilityVersion : 'missing';
}

export function buildStudioCompatibilityEvidence(options: {
  readonly packageJson?: StudioPackageJsonLike;
  readonly requirements?: readonly StudioCompatibilityRequirement[];
} = {}): StudioCompatibilityEvidence {
  const requirements = options.requirements ?? ASHA_COMPATIBILITY_REQUIREMENTS;
  const readback = readStudioPackageSurfaces(options.packageJson, requirements);
  const diagnostics = [
    ...readback.missingRequiredPackages.map(requirement =>
      diagnostic(
        'error',
        'asha.compatibility.required_package_missing',
        `${requirement.packageName} is required through the public package root but is not declared.`,
        requirement.source,
        'Restore the approved package-root dependency before committing the Studio UI base.',
      ),
    ),
    ...readback.mismatchedRequiredPackages.map(mismatch =>
      diagnostic(
        'error',
        'asha.compatibility.required_package_link_mismatch',
        `${mismatch.requirement.packageName} must use ${mismatch.requirement.packageLink} but saw ${mismatch.actualLink}.`,
        mismatch.requirement.source,
        'Use the approved local package link from boundary-policy.json.',
      ),
    ),
  ];

  return {
    contractsVersion: compatibilityVersionForPackage('@asha/contracts', readback, requirements),
    commandRegistryVersion: compatibilityVersionForPackage('@asha/command-registry', readback, requirements),
    editorToolsVersion: compatibilityVersionForPackage('@asha/editor-tools', readback, requirements),
    runtimeBridgeVersion: compatibilityVersionForPackage('@asha/runtime-bridge', readback, requirements),
    studioEvidenceVersion: STUDIO_EVIDENCE_DEFERRED_VERSION,
    ashaPackageVersions: readback.presentPackageVersions,
    diagnostics,
  };
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
      backendProofRefs: workspace.manifest.runtime.backendProofRefs,
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
  const allowedSceneRoots = persistence?.writeScopes.find(
    scope => scope.operationKind === 'authoring.scene.save_source',
  )?.allowedRoots ?? [];
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
        'Use manifest-declared relative scene/catalog paths only.',
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
        `Workspace open/read supports proof scene and catalog source files only: ${file.path}.`,
        file.path,
        'Read scenes/*.scene.json and catalog package catalog.json files only.',
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
          schemaKind: resolution.format === 'proof-scene-json.v1'
            ? 'proof-scene-json.v1'
            : 'asset-catalog-json.v1',
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
    allowedSceneRoots,
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
      allowedSceneRoots,
      allowedCatalogRoots,
      sourceFiles,
      diagnostics,
    }),
  };

  return diagnostics.length === 0
    ? { ok: true, openRead, diagnostics: [] }
    : { ok: false, openRead, diagnostics };
}

export function buildStudioSceneFileList(input: {
  readonly workspace: StudioGameWorkspaceReadModel | null;
  readonly manifestPath: string;
  readonly manifestHash: string | null;
  readonly sourceFiles: readonly StudioSceneFileSourceInput[];
  readonly allowProjectRoot?: boolean;
}): StudioSceneFileListResult {
  const openRead = buildStudioWorkspaceOpenReadModel({
    workspace: input.workspace,
    manifestPath: input.manifestPath,
    manifestHash: input.manifestHash,
    sourceFiles: input.sourceFiles,
  });
  const allowProjectRoot = input.allowProjectRoot ?? false;
  const diagnostics: StudioDiagnostic[] = allowProjectRoot ? [] : [...openRead.diagnostics];
  const files: StudioSceneFileReadModel[] = [];

  for (const source of input.sourceFiles) {
    const readSource = openRead.openRead.sourceFiles.find(file => file.path === source.path);
    const projectRootPathAllowed = allowProjectRoot
      && source.path.endsWith('.scene.json')
      && source.path.length > 0
      && !source.path.startsWith('/')
      && !source.path.split('/').includes('..');
    if (
      (readSource === undefined || readSource.schemaKind !== 'proof-scene-json.v1')
      && !projectRootPathAllowed
    ) {
      diagnostics.push(sceneFileDiagnostic(
        'scene_file_path_not_allowed',
        `Scene source ${source.path} must be a .scene.json file under the project root.`,
        source.path,
        'Choose a .scene.json file from the project root.',
      ));
      continue;
    }
    const parsed = parseStudioSceneFileSource(source);
    diagnostics.push(...parsed.diagnostics);
    files.push({
      sceneFileVersion: 'studio-scene-file.v0',
      path: readSource?.path ?? source.path,
      hash: source.sha256,
      sceneId: parsed.sceneId,
      name: parsed.name,
      description: parsed.description,
      catalogAssetIds: parsed.catalogAssetIds,
      runtimeFixture: parsed.runtimeFixture,
      diagnostics: parsed.diagnostics,
      sceneFileHash: fnv1aHash('studio-scene-file', {
        path: readSource?.path ?? source.path,
        hash: source.sha256,
        parsed,
      }),
    });
  }

  if (input.workspace === null) {
    diagnostics.push(sceneFileDiagnostic(
      'scene_file_missing_workspace',
      'Scene file listing requires an opened game workspace manifest.',
      input.manifestPath,
      'Open asha.game.toml before listing scene sources.',
    ));
  }

  const sceneFiles: StudioSceneFileListReadModel = {
    sceneFileListVersion: 'studio-scene-file-list.v0',
    workspaceHash: input.workspace?.workspaceHash ?? 'missing',
    allowedSceneRoots: allowProjectRoot ? ['project-root'] : openRead.openRead.allowedSceneRoots,
    files,
    diagnostics,
    commandIds: {
      list: 'scene.list_sources',
      open: 'scene.open_source',
    },
    nonClaims: [
      'not_repo_crawler',
      'not_private_file_picker',
      'not_runtime_authority',
    ],
    sceneFileListHash: fnv1aHash('studio-scene-file-list', {
      workspaceHash: input.workspace?.workspaceHash ?? 'missing',
      allowedSceneRoots: allowProjectRoot ? ['project-root'] : openRead.openRead.allowedSceneRoots,
      files,
      diagnostics,
    }),
  };

  return diagnostics.length === 0
    ? { ok: true, sceneFiles, diagnostics: [] }
    : { ok: false, sceneFiles, diagnostics };
}

export function applyOpenSceneFileReadModel(
  readModel: StudioWorkspaceReadModel,
  sceneFile: StudioSceneFileReadModel,
): StudioWorkspaceReadModel {
  const renderables = buildSceneFileRenderables(sceneFile);
  const selectedRenderableId = firstSelectableRenderableId(renderables);
  const session: StudioSessionReadModel = {
    ...readModel.session,
    scenarioId: sceneFile.path,
    scenarioLabel: sceneFile.name,
    status: 'ready',
  };
  const scene: StudioSceneReadModel = {
    sceneId: `scene-file:${sceneFile.sceneId}:v1`,
    selectedRenderableId,
    renderables,
    sceneHash: buildSceneHash(renderables),
  };
  const flatSceneDocument = createStudioFlatSceneDocument(scene);
  const sceneObjectSnapshot = buildStudioSceneObjectSnapshot(scene, flatSceneDocument);
  const entities = projectEntitiesFromScene(session, scene, sceneObjectSnapshot, readModel.entities);
  const command = createTimelineEntry({
    index: readModel.timeline.length,
    commandId: 'scene.open_source',
    label: 'Open Scene Source',
    requestedBy: 'gui',
    inputSummary: `path=${sceneFile.path};hash=${sceneFile.hash}`,
    outputSummary: `Opened ${sceneFile.name}.`,
    changedScene: true,
    changedSelection: readModel.selectedEntityId !== selectedRenderableId,
  });

  return {
    ...readModel,
    session,
    scene,
    scenarios: readModel.scenarios.map(item => ({ ...item, status: 'available' })),
    flatSceneDocument,
    sceneObjectSnapshot,
    entities,
    selectedEntityId: selectedObjectIdForRenderable(sceneObjectSnapshot, selectedRenderableId),
    timeline: [...readModel.timeline, command.timelineEntry],
    commandResults: [...readModel.commandResults, command.commandResult],
    timelineSequence: readModel.timelineSequence + 1,
  };
}

export function serializeWorkspaceSceneSource(
  readModel: StudioWorkspaceReadModel,
): string {
  const catalogAssetIds = Array.from(new Set(readModel.scene.renderables
    .filter(renderable => renderable.kind === 'static_mesh')
    .map(renderable => renderable.meshRef?.replace(/^static-mesh:/, 'mesh.'))
    .filter((assetId): assetId is string => assetId !== undefined && assetId.length > 0)));

  return `${JSON.stringify({
    schemaVersion: 1,
    sceneId: readModel.session.scenarioId.startsWith('scenes/')
      ? readModel.session.scenarioId.replace(/^scenes\//, '').replace(/\.scene\.json$/, '')
      : readModel.session.scenarioId,
    name: readModel.session.scenarioLabel,
    description: `Saved from ASHA Studio scene hash ${readModel.scene.sceneHash}.`,
    catalogAssetIds,
    runtimeFixture: 'harness/conformance/fixtures/minimal-world.json',
  }, null, 2)}\n`;
}

export function buildStudioSceneFileSaveReadback(input: {
  readonly commandId: 'scene.save_source' | 'scene.save_source_as';
  readonly path: string;
  readonly previousHash: string | null;
  readonly expectedPreviousHash: string | null;
  readonly nextText: string;
  readonly nextHash: string;
  readonly workspace: StudioGameWorkspaceReadModel | null;
  readonly allowProjectRoot?: boolean;
}): StudioSceneFileSaveReadback {
  const diagnostics: StudioDiagnostic[] = [];
  const fileList = buildStudioSceneFileList({
    workspace: input.workspace,
    manifestPath: input.workspace?.manifestPath ?? 'missing',
    manifestHash: input.workspace?.workspaceHash ?? null,
    sourceFiles: [{ path: input.path, text: input.nextText, sha256: input.nextHash }],
    allowProjectRoot: input.allowProjectRoot ?? false,
  });
  if (!fileList.ok) {
    diagnostics.push(...fileList.diagnostics);
  }
  if (input.previousHash !== input.expectedPreviousHash) {
    diagnostics.push(sceneFileDiagnostic(
      'scene_file_stale_hash',
      `Scene source ${input.path} changed before save.`,
      input.path,
      'Reopen the scene source before saving.',
    ));
  }
  const sceneFileHash = fileList.sceneFiles.files.at(0)?.sceneFileHash ?? 'missing';

  return {
    saveVersion: 'studio-scene-file-save.v0',
    commandId: input.commandId,
    path: input.path,
    previousHash: input.previousHash,
    nextHash: input.nextHash,
    sceneFileHash,
    diagnostics,
    nonClaims: [
      'not_runtime_authority',
      'not_private_file_write',
    ],
    saveHash: fnv1aHash('studio-scene-file-save', {
      commandId: input.commandId,
      path: input.path,
      previousHash: input.previousHash,
      nextHash: input.nextHash,
      sceneFileHash,
      diagnostics,
    }),
  };
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
  const backendProofRefs = Array.isArray(record.backendProofRefs)
    ? record.backendProofRefs.filter((ref): ref is string => typeof ref === 'string' && ref.length > 0)
    : [];
  const nativeProofRef = typeof record.nativeProofRef === 'string' && record.nativeProofRef.length > 0
    ? record.nativeProofRef
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
    backendProofRefs,
    nativeProofRef,
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
  const actionDiagnostics = activeSession === undefined || activeSession.status === 'reserved'
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
  const backendProofRefs = input.workspace.manifest.runtime.backendProofRefs;
  const attachedBackendEvidence = attach?.runtimeBackendEvidence ?? null;
  const sessionBackendMode = attachedBackendEvidence?.backendMode ?? backendMode;
  const sessionBackendProfile = attachedBackendEvidence?.backendProfile ?? backendProfile;
  const sessionBackendProofRefs = attachedBackendEvidence === null
    ? backendProofRefs
    : attachedBackendEvidence.backendProofRefs;
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
  if ((backendMode === 'native' || backendMode === 'wasm') && sessionBackendProofRefs.length === 0) {
    diagnostics.push(studioRuntimeSessionDiagnostic(
      'runtime_session_missing_backend_evidence',
      `Runtime backend mode ${backendMode} requires public backend proof refs before Studio can treat it as compatible.`,
      'runtime.backend_proof_refs',
      backendMode,
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
    diagnostic => diagnostic.code === 'runtime_session_missing_backend_evidence',
  )
    ? 'missing_evidence'
    : diagnostics.some(diagnostic => diagnostic.code === 'runtime_session_backend_incompatible')
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
    backendProofRefs: sessionBackendProofRefs,
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
      ...sessionBackendProofRefs.map(ref => ({
        kind: 'runtime-backend-proof',
        path: ref,
        sha256: null,
      })),
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
      backendProofRefs: sessionBackendProofRefs,
      backendCompatibilityState,
      diagnostics,
    }),
  };
  const fixtureReservedDiagnostic = studioRuntimeSessionDiagnostic(
    'runtime_session_reserved',
    'Fixture runtime session is represented but not launched in Studio V1.',
    input.workspace.runtimeEntry,
    null,
  );
  const replayReservedDiagnostic = studioRuntimeSessionDiagnostic(
    'runtime_session_reserved',
    'Replay runtime session is reserved for a later public replay workflow.',
    input.workspace.manifest.workspace.replayRoots.join(', '),
    null,
  );
  const fixtureSession = buildReservedRuntimeSession(input.workspace, {
    sessionId: `runtime-fixture:${input.workspace.gameId}`,
    sessionType: 'fixture_reserved',
    profileId: input.workspace.runtimeEntry,
    diagnostic: fixtureReservedDiagnostic,
  });
  const replaySession = buildReservedRuntimeSession(input.workspace, {
    sessionId: `runtime-replay:${input.workspace.gameId}`,
    sessionType: 'replay_reserved',
    profileId: input.workspace.manifest.workspace.replayRoots.join(', ') || 'replays',
    diagnostic: replayReservedDiagnostic,
  });
  const sessions = [activeSession, fixtureSession, replaySession];

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

export function buildStudioAshaDemoProductPathReadModel(input: {
  readonly gameWorkspace: StudioGameWorkspaceReadModel | null;
  readonly runtimeInspection: StudioRuntimeSessionInspectionReadModel;
}): StudioAshaDemoProductPathReadModel {
  const workspace = input.gameWorkspace;
  const runtimeInspection = input.runtimeInspection;
  const attached = runtimeInspection.attachState === 'attached';
  const diagnostics: StudioDiagnostic[] = [];

  if (workspace === null) {
    diagnostics.push({
      severity: 'error',
      code: 'asha_demo_product_path_missing_workspace',
      message: 'ASHA Demo product path requires an opened asha-demo game workspace.',
      source: 'asha.game.toml',
      remediation: 'Open the asha-demo manifest through the public game-workspace loader.',
    });
  }

  const generatedLevel = runtimeInspection.generatedLevel;
  const playableLoopTuning = runtimeInspection.playableLoopTuning;
  const liveLifecycle = runtimeInspection.playableLoopTuning.liveInspection.lifecycle;
  const authoredContent: StudioAshaDemoProductPathContentReadModel[] = [
    {
      kind: 'manifest',
      label: 'Game manifest',
      path: workspace?.manifestPath ?? 'asha.game.toml',
      validationStatus: workspace === null ? 'unavailable' : 'valid',
      evidenceHash: workspace?.workspaceHash ?? null,
    },
    {
      kind: 'project_bundle',
      label: 'ProjectBundle',
      path: 'project/project-bundle.json',
      validationStatus: 'valid',
      evidenceHash: runtimeInspection.workspaceHash,
    },
    {
      kind: 'entity_definition',
      label: 'Player entity',
      path: 'catalogs/actors/demo-player.entity.json',
      validationStatus: playableLoopTuning.definitionAuthoring.validation.status,
      evidenceHash: playableLoopTuning.definitionAuthoring.hashes.presetHash,
    },
    {
      kind: 'entity_definition',
      label: 'Enemy entity',
      path: 'catalogs/actors/generated-tunnel-enemy.entity.json',
      validationStatus: attached ? 'valid' : 'pending_live_attach',
      evidenceHash: liveLifecycle.lifecycleHash,
    },
    {
      kind: 'scene_document',
      label: 'Generated tunnel room',
      path: 'levels/scenes/generated-tunnel-room.scene.json',
      validationStatus: generatedLevel.definitionAuthoring.validationStatus,
      evidenceHash: generatedLevel.liveInspection.generator.outputHash,
    },
    {
      kind: 'level_preset',
      label: 'Tiny enclosed tunnel',
      path: 'levels/presets/tiny-enclosed-tunnel.json',
      validationStatus: generatedLevel.definitionAuthoring.validationStatus,
      evidenceHash: generatedLevel.liveInspection.generator.configHash,
    },
    {
      kind: 'catalog',
      label: 'Gameplay catalog',
      path: 'catalogs/gameplay/default-fps.catalog.json',
      validationStatus: playableLoopTuning.definitionAuthoring.validation.status,
      evidenceHash: playableLoopTuning.definitionAuthoring.hashes.catalogHash,
    },
    {
      kind: 'catalog',
      label: 'Primary weapon',
      path: 'catalogs/weapons/primary-fire.weapon.json',
      validationStatus: playableLoopTuning.definitionAuthoring.validation.status,
      evidenceHash: playableLoopTuning.definitionAuthoring.hashes.tuningHash,
    },
    {
      kind: 'runtime_entry',
      label: 'Reference runtime entry',
      path: workspace?.runtimeEntry ?? 'dist/runtime/index.js',
      validationStatus: workspace === null ? 'unavailable' : 'valid',
      evidenceHash: runtimeInspection.sessionHash,
    },
  ];
  const runPolicyAvailable = runtimeInspection.playableLoop.controls.policyTick.available;
  const restartAvailable = runtimeInspection.playableLoop.controls.restart.available;
  const body = {
    project: {
      gameId: workspace?.gameId ?? null,
      workspaceRoot: workspace?.workspaceRoot ?? null,
      manifestPath: workspace?.manifestPath ?? 'asha.game.toml',
      projectBundlePath: 'project/project-bundle.json' as const,
    },
    mode: attached ? 'live_runtime_inspection' as const : 'definition_authoring' as const,
    authoredContent,
    definitionAuthoring: {
      generatedLevelPresetStatus: generatedLevel.definitionAuthoring.validationStatus,
      gameplayPresetStatus: playableLoopTuning.definitionAuthoring.validation.status,
      generatedLevelPresetPath: generatedLevel.definitionAuthoring.presetPath,
      gameplayPresetPath: playableLoopTuning.definitionAuthoring.source.presetPath,
    },
    liveRuntime: {
      attachState: runtimeInspection.attachState,
      sessionStatus: runtimeInspection.sessionStatus,
      sessionId: runtimeInspection.sessionId,
      tick: runtimeInspection.tick,
      sessionHash: runtimeInspection.sessionHash,
      replayRecordCount: runtimeInspection.replay.recordCount,
      lifecycleLabel: liveLifecycle.label,
      playerHealth: liveLifecycle.playerHealth,
      enemyHealth: liveLifecycle.enemyHealth,
    },
    controls: {
      attach: {
        commandId: 'runtime_session.attach_public_facade' as const,
        available: workspace !== null,
        publicSurface: '@asha/runtime-bridge:createRuntimeSessionFacade(mode=rust)' as const,
      },
      runPolicy: {
        commandId: 'runtime_session.run_autonomous_policy_tick' as const,
        available: runPolicyAvailable,
        disabledReason: runtimeInspection.playableLoop.controls.policyTick.disabledReason,
        publicSurface: '@asha/runtime-session:RuntimeSessionFacade.runAutonomousPolicyTick' as const,
      },
      restart: {
        commandId: 'runtime.restart_session_intent' as const,
        available: restartAvailable,
        disabledReason: runtimeInspection.playableLoop.controls.restart.disabledReason,
        publicSurface: '@asha/runtime-session:RuntimeSessionFacade.requestSessionRestart' as const,
      },
    },
    publicSurfacesUsed: [
      '@asha/game-workspace:parseAshaGameManifestToml',
      '@asha/runtime-bridge:createRuntimeSessionFacade(mode=rust)',
      '@asha/runtime-session:RuntimeSessionFacade.initialize',
      '@asha/runtime-session:RuntimeSessionFacade.readGeneratedTunnelReadout',
      '@asha/runtime-session:RuntimeSessionFacade.readLifecycleStatus',
      '@asha/runtime-session:RuntimeSessionFacade.runAutonomousPolicyTick',
      '@asha/runtime-session:RuntimeSessionFacade.requestSessionRestart',
    ],
    boundaries: {
      definitionAuthoringOwnsStoredFiles: true as const,
      liveRuntimeInspectionUsesPublicFacade: true as const,
      studioOwnsGameplayAuthority: false as const,
      runtimeToDefinitionExport: false as const,
    },
    diagnostics,
  };

  return {
    productPathVersion: 'studio-asha-demo-product-path.v0',
    ...body,
    nonClaims: [
      'not_runtime_authority',
      'not_private_transport',
      'not_demo_local_shadow_state',
      'not_runtime_to_definition_export',
    ],
    productPathHash: fnv1aHash('studio-asha-demo-product-path', body),
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
  const validatedPresetReadout = validation.readout ?? null;
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
	
export function buildStudioLiveDebugSessionIdentity(input: {
  readonly runtimeSessions: StudioRuntimeSessionListReadModel;
  readonly childArtifacts?: readonly StudioLiveDebugSessionChildArtifactRef[];
}): StudioLiveDebugSessionIdentityResult {
  const diagnostics: StudioDiagnostic[] = [];
  const session = input.runtimeSessions.sessions.find(
    candidate => candidate.sessionId === input.runtimeSessions.activeSessionId,
  ) ?? null;
  const childArtifacts = input.childArtifacts ?? [];

  if (session === null || session.sessionType !== 'attached' || session.attachStatus !== 'attached') {
    diagnostics.push(studioLiveDebugSessionDiagnostic(
      'missing_live_session',
      'Studio live debug session identity requires an attached runtime session.',
      input.runtimeSessions.activeSessionId,
      null,
    ));
  }
  if (session !== null && (session.liveHash === null || session.projection === null)) {
    diagnostics.push(studioLiveDebugSessionDiagnostic(
      'stale_fixture_readback',
      'Studio live debug session identity requires live projection/readback, not fixture-only session data.',
      session.sessionId,
      session.attachHash,
    ));
  }
  if (
    session !== null
    && (session.backendMode === 'native' || session.backendMode === 'wasm')
    && session.backendProofRefs.length === 0
  ) {
    diagnostics.push(studioLiveDebugSessionDiagnostic(
      'backend_proof_mismatch',
      `Studio live debug session ${session.sessionId} claims ${session.backendMode} without backend proof refs.`,
      session.sessionId,
      session.backendMode,
    ));
  }
  for (const artifact of childArtifacts) {
    if (
      (artifact.expectedArtifactHash !== undefined && artifact.expectedArtifactHash !== artifact.artifactHash)
      || (artifact.expectedFileHash !== undefined && artifact.expectedFileHash !== artifact.fileHash)
    ) {
      diagnostics.push(studioLiveDebugSessionDiagnostic(
        'stale_child_artifact',
        `Studio live debug child artifact is stale: ${artifact.path}.`,
        artifact.path,
        artifact.kind,
      ));
    }
  }

  const projection = session?.projection ?? null;
  const attachHash = session?.attachHash ?? null;
  const liveHash = session?.liveHash ?? null;
  const readAfterAttach = attachHash !== null && liveHash !== null && attachHash !== liveHash;
  const identityBody = {
    sessionId: session?.sessionId ?? input.runtimeSessions.activeSessionId,
    sessionHash: session?.sessionHash ?? 'missing',
    sessionType: session?.sessionType ?? 'preview',
    attachStatus: session?.attachStatus ?? 'not_attached',
    runtimeMode: session?.runtimeMode ?? 'degraded',
    backendMode: session?.backendMode ?? 'reference',
    backendProfile: session?.backendProfile ?? 'missing',
    backendProofRefs: session?.backendProofRefs ?? [],
    backendCompatibilityState: session?.backendCompatibilityState ?? 'missing_evidence',
    endpoint: session?.endpoint ?? null,
    workspaceHash: session?.workspaceHash ?? 'missing',
    attachHash: attachHash ?? 'missing',
    liveHash: liveHash ?? 'missing',
    liveFreshness: {
      freshnessVersion: 'studio-live-debug-freshness.v0' as const,
      attachSequenceId: attachHash ?? 'missing',
      readSequenceId: liveHash ?? 'missing',
      readAfterAttach,
      projectionTick: projection?.tick ?? null,
      runtimeSessionSummaryHash: projection?.runtimeSessionSummaryHash ?? null,
      renderDiffHash: projection?.renderDiffHash ?? null,
      telemetrySampleCount: session?.evidenceRefs.some(ref => ref.kind === 'runtime-live') === true ? 1 : 0,
    },
    childArtifacts,
    diagnostics,
  };
  const identity: StudioLiveDebugSessionIdentityReadModel = {
    identityVersion: 'studio-live-debug-session-identity.v0',
    ...identityBody,
    nonClaims: [
      'not_studio_runtime_authority',
      'not_private_transport',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
    ],
    identityHash: fnv1aHash('studio-live-debug-session-identity', identityBody),
  };

  return diagnostics.length === 0
    ? { ok: true, identity, diagnostics: [] }
    : { ok: false, identity, diagnostics };
}

export function buildStudioLiveSceneEntityDebugInspector(input: {
  readonly workspace: StudioWorkspaceReadModel;
  readonly liveSessionIdentity: StudioLiveDebugSessionIdentityReadModel;
}): StudioLiveSceneEntityDebugInspectorResult {
  const diagnostics: StudioDiagnostic[] = [];
  if (input.liveSessionIdentity.attachStatus !== 'attached' || !input.liveSessionIdentity.liveFreshness.readAfterAttach) {
    diagnostics.push(studioLiveSceneEntityDebugDiagnostic(
      'missing_live_session',
      'Live scene/entity debug inspector requires a fresh attached live debug session.',
      input.liveSessionIdentity.sessionId,
      input.liveSessionIdentity.liveHash,
    ));
  }

  const selectedEntity = input.workspace.selectedEntityId === null
    ? null
    : input.workspace.entities.find(entity => entity.id === input.workspace.selectedEntityId) ?? null;
  const selectedRenderable = input.workspace.scene.selectedRenderableId === null
    ? null
    : input.workspace.scene.renderables.find(
      renderable => renderable.renderableId === input.workspace.scene.selectedRenderableId,
    ) ?? null;
  const selectedObject = selectedEntity?.sceneObjectId === null || selectedEntity?.sceneObjectId === undefined
    ? null
    : input.workspace.sceneObjectSnapshot.objects.find(object => object.objectId === selectedEntity.sceneObjectId) ?? null;
  const selectedNode = selectedEntity?.sceneObjectId === null || selectedEntity?.sceneObjectId === undefined
    ? null
    : input.workspace.flatSceneDocument.nodes.find(
      node => `scene-node:${node.id as number}` === selectedEntity.sceneObjectId,
    ) ?? null;

  if (selectedEntity === null) {
    diagnostics.push(studioLiveSceneEntityDebugDiagnostic(
      'missing_selected_entity',
      'Live scene/entity debug inspector requires a selected entity readback.',
      input.workspace.selectedEntityId,
      null,
    ));
  }
  if (
    selectedEntity !== null
    && (
      selectedEntity.renderableId !== input.workspace.scene.selectedRenderableId
      || selectedObject === null
      || selectedEntity.label !== selectedObject.displayName
    )
  ) {
    diagnostics.push(studioLiveSceneEntityDebugDiagnostic(
      'inspector_readback_drift',
      'Live scene/entity debug inspector selection diverges from scene, hierarchy, or selected object readback.',
      selectedEntity.id,
      input.workspace.scene.selectedRenderableId,
    ));
  }

  const sceneObjectSnapshotHash = fnv1aHash('studio-scene-object-snapshot', input.workspace.sceneObjectSnapshot);
  const inspectorBody = {
    sessionId: input.liveSessionIdentity.sessionId,
    scene: {
      sceneId: input.workspace.scene.sceneId,
      sceneHash: input.workspace.scene.sceneHash,
      renderableCount: input.workspace.scene.renderables.length,
      selectedRenderableId: input.workspace.scene.selectedRenderableId,
      selectedEntityId: input.workspace.selectedEntityId,
      sceneObjectSnapshotHash,
    },
    entity: {
      entityId: selectedEntity?.id ?? null,
      sceneObjectId: selectedEntity?.sceneObjectId ?? null,
      label: selectedEntity?.label ?? null,
      sourceState: selectedEntity?.sourceState ?? null,
      renderableId: selectedEntity?.renderableId ?? null,
      provenance: selectedEntity === null
        ? null
        : {
            renderableId: selectedObject?.provenance.renderableId ?? selectedEntity.renderableId,
            materialRef: selectedRenderable?.materialRef ?? null,
            meshRef: selectedRenderable?.meshRef ?? null,
          },
      transform: selectedNode?.transform ?? null,
    },
    diagnostics,
  };
  const inspector: StudioLiveSceneEntityDebugInspectorReadModel = {
    inspectorVersion: 'studio-live-scene-entity-debug-inspector.v0',
    ...inspectorBody,
    nonClaims: [
      'not_runtime_authority',
      'not_private_ecs_read',
      'not_source_authoring_write',
    ],
    inspectorHash: fnv1aHash('studio-live-scene-entity-debug-inspector', inspectorBody),
  };

  return diagnostics.length === 0
    ? { ok: true, inspector, diagnostics: [] }
    : { ok: false, inspector, diagnostics };
}

export function buildStudioLiveAssetResourceDebugInspector(input: {
  readonly assetInventory: StudioAssetInventoryReadModel;
  readonly liveSessionIdentity: StudioLiveDebugSessionIdentityReadModel;
  readonly selectedAssetId: string;
}): StudioLiveAssetResourceDebugInspectorResult {
  const diagnostics: StudioDiagnostic[] = [];
  if (input.liveSessionIdentity.attachStatus !== 'attached' || !input.liveSessionIdentity.liveFreshness.readAfterAttach) {
    diagnostics.push(studioLiveAssetResourceDebugDiagnostic(
      'missing_live_session',
      'Live asset/resource debug inspector requires a fresh attached live debug session.',
      input.liveSessionIdentity.sessionId,
      input.liveSessionIdentity.liveHash,
    ));
  }
  const asset = input.assetInventory.entries.find(entry => entry.assetId === input.selectedAssetId) ?? null;
  if (asset === null) {
    diagnostics.push(studioLiveAssetResourceDebugDiagnostic(
      'missing_asset_resource',
      `Live asset/resource debug inspector could not find asset ${input.selectedAssetId}.`,
      input.selectedAssetId,
      input.assetInventory.inventoryHash,
    ));
  } else if (
    asset.diagnostics.length > 0
    || asset.dependencyStatus === 'missing'
    || asset.devResolution?.importStatus === 'stale'
  ) {
    diagnostics.push(studioLiveAssetResourceDebugDiagnostic(
      'asset_resource_readback_drift',
      `Live asset/resource debug inspector found stale or diagnostic asset readback for ${input.selectedAssetId}.`,
      input.selectedAssetId,
      asset.dependencyStatus,
    ));
  }

  const inspectorBody = {
    sessionId: input.liveSessionIdentity.sessionId,
    inventoryHash: input.assetInventory.inventoryHash,
    selectedAssetId: input.selectedAssetId,
    asset: {
      assetId: asset?.assetId ?? null,
      kind: asset?.kind ?? null,
      sourcePath: asset?.sourcePath ?? null,
      sourceHash: asset?.devResolution?.sourceHash ?? null,
      importStatus: asset?.devResolution?.importStatus ?? null,
      dependencyStatus: asset?.dependencyStatus ?? null,
      referencedRenderableIds: asset?.referencedRenderableIds ?? [],
      publishOutputKey: asset?.devResolution?.publishOutputKey ?? asset?.publishResolution?.outputKey ?? null,
      packedHash: asset?.publishResolution?.packedHash ?? null,
    },
    diagnostics,
  };
  const inspector: StudioLiveAssetResourceDebugInspectorReadModel = {
    inspectorVersion: 'studio-live-asset-resource-debug-inspector.v0',
    ...inspectorBody,
    nonClaims: [
      'not_runtime_authority',
      'not_private_asset_database',
      'not_publish_builder',
    ],
    inspectorHash: fnv1aHash('studio-live-asset-resource-debug-inspector', inspectorBody),
  };

  return diagnostics.length === 0
    ? { ok: true, inspector, diagnostics: [] }
    : { ok: false, inspector, diagnostics };
}

export function buildStudioLiveRuntimeTelemetryDebugInspector(input: {
  readonly liveSessionIdentity: StudioLiveDebugSessionIdentityReadModel;
  readonly live: StudioGameWorkspaceLiveReadModel | null;
}): StudioLiveRuntimeTelemetryDebugInspectorResult {
  const diagnostics: StudioDiagnostic[] = [];
  if (input.liveSessionIdentity.attachStatus !== 'attached' || !input.liveSessionIdentity.liveFreshness.readAfterAttach) {
    diagnostics.push(studioLiveRuntimeTelemetryDebugDiagnostic(
      'missing_live_session',
      'Live runtime/telemetry debug inspector requires a fresh attached live debug session.',
      input.liveSessionIdentity.sessionId,
      input.liveSessionIdentity.liveHash,
    ));
  }
  if (input.live === null || input.live.telemetry.length === 0) {
    diagnostics.push(studioLiveRuntimeTelemetryDebugDiagnostic(
      'telemetry_readback_missing',
      'Live runtime/telemetry debug inspector requires telemetry samples.',
      input.liveSessionIdentity.sessionId,
      null,
    ));
  }
  if (input.live !== null && input.live.liveHash !== input.liveSessionIdentity.liveHash) {
    diagnostics.push(studioLiveRuntimeTelemetryDebugDiagnostic(
      'runtime_readback_mismatch',
      'Live runtime/telemetry debug inspector live hash does not match the live session identity.',
      input.live.liveHash,
      input.liveSessionIdentity.liveHash,
    ));
  }

  const sampleValue = (metric: string): number | null =>
    input.live?.telemetry.find(sample => sample.metric === metric)?.value ?? null;
  const projection = input.liveSessionIdentity.liveFreshness.runtimeSessionSummaryHash === null
    ? null
    : {
        runtimeSessionSummaryHash: input.liveSessionIdentity.liveFreshness.runtimeSessionSummaryHash,
        renderDiffHash: input.liveSessionIdentity.liveFreshness.renderDiffHash ?? 'missing',
        entityCount: input.live?.projection.entityCount ?? 0,
        tick: input.liveSessionIdentity.liveFreshness.projectionTick ?? 0,
      };
  const inspectorBody = {
    sessionId: input.liveSessionIdentity.sessionId,
    runtime: {
      runtimeMode: input.liveSessionIdentity.runtimeMode,
      backendMode: input.liveSessionIdentity.backendMode,
      backendProfile: input.liveSessionIdentity.backendProfile,
      backendProofRefs: input.liveSessionIdentity.backendProofRefs,
      endpoint: input.liveSessionIdentity.endpoint,
      attachHash: input.liveSessionIdentity.attachHash,
      liveHash: input.liveSessionIdentity.liveHash,
    },
    projection,
    telemetry: {
      sampleCount: input.live?.telemetry.length ?? 0,
      sampleMetrics: input.live?.telemetry.map(sample => sample.metric) ?? [],
      commandQueueDepth: sampleValue('command_queue_depth'),
      acceptedCommandCount: sampleValue('accepted_command_count'),
      rejectedCommandCount: sampleValue('rejected_command_count'),
    },
    diagnostics,
  };
  const inspector: StudioLiveRuntimeTelemetryDebugInspectorReadModel = {
    inspectorVersion: 'studio-live-runtime-telemetry-debug-inspector.v0',
    ...inspectorBody,
    nonClaims: [
      'not_runtime_authority',
      'not_private_transport',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
    ],
    inspectorHash: fnv1aHash('studio-live-runtime-telemetry-debug-inspector', inspectorBody),
  };

  return diagnostics.length === 0
    ? { ok: true, inspector, diagnostics: [] }
    : { ok: false, inspector, diagnostics };
}

export function buildStudioLiveDebugCommandProposalSurface(input: {
  readonly liveSessionIdentity: StudioLiveDebugSessionIdentityReadModel;
  readonly sceneEntityInspector: StudioLiveSceneEntityDebugInspectorReadModel;
  readonly runtimeTelemetryInspector: StudioLiveRuntimeTelemetryDebugInspectorReadModel;
  readonly commandProposalPanel: StudioCommandProposalPanelReadModel | null;
  readonly evidenceRefs?: readonly StudioAssetInventoryEvidenceRef[];
}): StudioLiveDebugCommandProposalSurfaceResult {
  const diagnostics: StudioDiagnostic[] = [];
  const allowedActionIds: readonly StudioCommandProposalActionId[] = ['set_voxel_reference'];
  const panel = input.commandProposalPanel;
  const actions = panel?.actions ?? [];
  const proposals = panel?.proposals ?? [];

  if (input.liveSessionIdentity.attachStatus !== 'attached' || !input.liveSessionIdentity.liveFreshness.readAfterAttach) {
    diagnostics.push(studioLiveDebugCommandProposalDiagnostic(
      'missing_live_session',
      'Live debug command proposals require a fresh attached live debug session.',
      input.liveSessionIdentity.sessionId,
      input.liveSessionIdentity.liveHash,
    ));
  }
  if (panel === null) {
    diagnostics.push(studioLiveDebugCommandProposalDiagnostic(
      'missing_command_proposal_panel',
      'Live debug command proposals require the shared command proposal panel read model.',
      input.liveSessionIdentity.sessionId,
      null,
    ));
  }
  if (
    panel !== null && (
      panel.runtimeSessionId !== input.liveSessionIdentity.sessionId
      || panel.workspaceHash !== input.liveSessionIdentity.workspaceHash
      || input.sceneEntityInspector.sessionId !== input.liveSessionIdentity.sessionId
      || input.runtimeTelemetryInspector.sessionId !== input.liveSessionIdentity.sessionId
      || input.runtimeTelemetryInspector.runtime.attachHash !== input.liveSessionIdentity.attachHash
      || input.runtimeTelemetryInspector.runtime.liveHash !== input.liveSessionIdentity.liveHash
    )
  ) {
    diagnostics.push(studioLiveDebugCommandProposalDiagnostic(
      'debug_command_scope_mismatch',
      'Live debug command proposal read models do not describe the same live session scope.',
      panel.runtimeSessionId,
      input.liveSessionIdentity.sessionId,
    ));
  }

  const unsupportedAction = actions.find(action =>
    !allowedActionIds.includes(action.actionId)
    || action.commandMessageType !== 'command.propose'
    || action.commandOperation !== 'setVoxel'
    || action.batch.commands.some(command => command.op !== 'setVoxel')
  );
  if (unsupportedAction !== undefined) {
    diagnostics.push(studioLiveDebugCommandProposalDiagnostic(
      'unsupported_debug_command',
      'Live debug command proposals are bounded to known command.propose actions only.',
      unsupportedAction.actionId,
      unsupportedAction.commandOperation,
    ));
  }

  const scopedProposalMismatch = proposals.find(proposal =>
    proposal.workspaceHash !== input.liveSessionIdentity.workspaceHash
    || proposal.attachHash !== input.liveSessionIdentity.attachHash
    || proposal.batch.commands.some(command => command.op !== 'setVoxel')
  );
  if (scopedProposalMismatch !== undefined) {
    diagnostics.push(studioLiveDebugCommandProposalDiagnostic(
      'debug_command_scope_mismatch',
      'Live debug command proposal result evidence does not match the attached live session.',
      scopedProposalMismatch.proposalHash,
      input.liveSessionIdentity.attachHash,
    ));
  }

  const accepted = proposals.find(proposal => proposal.status === 'accepted') ?? null;
  const rejected = proposals.find(proposal => proposal.status === 'rejected') ?? null;
  if (accepted === null || rejected === null) {
    diagnostics.push(studioLiveDebugCommandProposalDiagnostic(
      'missing_command_result_evidence',
      'Live debug command proposals require both accepted and rejected command result evidence rows.',
      panel?.runtimeSessionId ?? input.liveSessionIdentity.sessionId,
      `accepted:${accepted !== null};rejected:${rejected !== null}`,
    ));
  }

  const surfaceBody = {
    sessionId: input.liveSessionIdentity.sessionId,
    workspaceHash: input.liveSessionIdentity.workspaceHash,
    attachHash: input.liveSessionIdentity.attachHash,
    liveHash: input.liveSessionIdentity.liveHash,
    sceneEntityInspectorHash: input.sceneEntityInspector.inspectorHash,
    runtimeTelemetryInspectorHash: input.runtimeTelemetryInspector.inspectorHash,
    allowedActionIds,
    actions,
    proposals,
    proposalStatuses: proposals.map(proposal => proposal.status),
    acceptedProposalHash: accepted?.proposalHash ?? null,
    rejectedProposalHash: rejected?.proposalHash ?? null,
    evidenceRefs: input.evidenceRefs ?? [],
    diagnostics,
  };
  const surface: StudioLiveDebugCommandProposalSurfaceReadModel = {
    surfaceVersion: 'studio-live-debug-command-proposals.v0',
    ...surfaceBody,
    nonClaims: [
      'does_not_mutate_without_devtools_acceptance',
      'not_runtime_authority',
      'not_private_runtime_mutation',
      'not_freeform_json_method_call',
    ],
    surfaceHash: fnv1aHash('studio-live-debug-command-proposals', surfaceBody),
  };

  return diagnostics.length === 0
    ? { ok: true, surface, diagnostics: [] }
    : { ok: false, surface, diagnostics };
}

export function buildStudioAuthoredBrowserDebugReadModel(input: {
  readonly fixture: StudioAuthoredBrowserDebugInputFixture | null;
  readonly browserInteraction: StudioAuthoredBrowserDebugInputInteraction | null;
  readonly studioDebugEvidenceHash?: string | null;
}): StudioAuthoredBrowserDebugResult {
  const diagnostics: StudioDiagnostic[] = [];
  const fixture = input.fixture;
  const interaction = input.browserInteraction;
  const authoredObjectId = fixture?.authoredScene.objectId ?? null;
  const authoredAssetId = fixture?.authoredCatalog.authoredAssetId ?? null;
  const interactionReadback = interaction?.authoredInteraction ?? null;

  if (fixture === null) {
    diagnostics.push(studioAuthoredBrowserDebugDiagnostic(
      'missing_authored_fixture',
      'Studio authored browser debug readback requires the authored round-trip fixture.',
      null,
      'pnpm run proof:authored-roundtrip-fixture',
    ));
  }
  if (interaction === null) {
    diagnostics.push(studioAuthoredBrowserDebugDiagnostic(
      'missing_browser_interaction',
      'Studio authored browser debug readback requires the authored browser interaction proof.',
      null,
      'pnpm run proof:authored-browser-interaction',
    ));
  }
  if (
    interaction !== null
    && (
      interaction.authoredInteraction.inputEventCount <= 0
      || interaction.authoredInteraction.typedRequestCount !== interaction.authoredInteraction.inputEventCount
      || interaction.authoredInteraction.readbackCount !== interaction.authoredInteraction.typedRequestCount
      || interaction.authoredInteraction.interactionHash.length === 0
    )
  ) {
    diagnostics.push(studioAuthoredBrowserDebugDiagnostic(
      'stale_browser_interaction',
      'Authored browser interaction proof has stale or incomplete input/readback evidence.',
      interaction.artifactHash,
      interaction.authoredInteraction.interactionHash,
    ));
  }
  if (
    fixture !== null
    && interaction !== null
    && interaction.authoredInteraction.finalSelectedObjectId !== fixture.authoredScene.objectId
  ) {
    diagnostics.push(studioAuthoredBrowserDebugDiagnostic(
      'selected_authored_object_mismatch',
      'Browser-selected authored object does not match the Studio-authored fixture object.',
      interaction.authoredInteraction.finalSelectedObjectId,
      fixture.authoredScene.objectId,
    ));
  }
  if (
    fixture !== null
    && interaction !== null
    && interaction.authoredInteraction.finalSelectedAssetId !== fixture.authoredCatalog.authoredAssetId
  ) {
    diagnostics.push(studioAuthoredBrowserDebugDiagnostic(
      'selected_authored_asset_mismatch',
      'Browser-selected authored asset does not match the Studio-authored fixture asset.',
      interaction.authoredInteraction.finalSelectedAssetId,
      fixture.authoredCatalog.authoredAssetId,
    ));
  }
  if ((input.studioDebugEvidenceHash ?? null) === null) {
    diagnostics.push(studioAuthoredBrowserDebugDiagnostic(
      'missing_studio_debug_evidence',
      'Authored browser debug readback requires Studio live debug evidence as a capability gate.',
      null,
      'pnpm run proof:live-gameplay-debug-m4',
    ));
  }

  const debugBody = {
    authoredFixtureHash: fixture?.fixtureHash ?? 'missing',
    browserInteractionHash: interaction?.artifactHash ?? 'missing',
    studioDebugEvidenceHash: input.studioDebugEvidenceHash ?? null,
    selected: {
      objectId: authoredObjectId,
      assetId: authoredAssetId,
      label: fixture?.authoredScene.record.label ?? null,
      transform: fixture?.authoredScene.record.transform ?? null,
      finalSelectedObjectId: interactionReadback?.finalSelectedObjectId ?? null,
      finalSelectedAssetId: interactionReadback?.finalSelectedAssetId ?? null,
    },
    browserReadback: {
      inputEventCount: interactionReadback?.inputEventCount ?? 0,
      typedRequestCount: interactionReadback?.typedRequestCount ?? 0,
      readbackCount: interactionReadback?.readbackCount ?? 0,
      interactionHash: interactionReadback?.interactionHash ?? null,
      runtimeWorldHash: interactionReadback?.runtimeWorldHash ?? null,
    },
    studioCorrelation: {
      authoredObjectMatchesBrowserSelection: authoredObjectId !== null
        && interactionReadback?.finalSelectedObjectId === authoredObjectId,
      authoredAssetMatchesBrowserSelection: authoredAssetId !== null
        && interactionReadback?.finalSelectedAssetId === authoredAssetId,
      typedRequestsMatchInputs: interactionReadback !== null
        && interactionReadback.typedRequestCount === interactionReadback.inputEventCount,
      readbacksMatchTypedRequests: interactionReadback !== null
        && interactionReadback.readbackCount === interactionReadback.typedRequestCount,
      studioDebugEvidencePresent: (input.studioDebugEvidenceHash ?? null) !== null,
    },
    diagnostics,
  };
  const debug: StudioAuthoredBrowserDebugReadModel = {
    debugVersion: 'studio-authored-browser-debug.v0',
    ...debugBody,
    nonClaims: [
      'not_runtime_authority',
      'not_private_runtime_transport',
      'not_source_write',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
    ],
    debugHash: fnv1aHash('studio-authored-browser-debug', debugBody),
  };

  return diagnostics.length === 0
    ? { ok: true, debug, diagnostics: [] }
    : { ok: false, debug, diagnostics };
}

export function exportStudioGameWorkspaceAttachEvidence(
  input: {
    readonly workspace: StudioGameWorkspaceReadModel;
    readonly attach: StudioGameWorkspaceAttachReadModel;
    readonly live?: StudioGameWorkspaceLiveReadModel | null;
    readonly commandProposals?: readonly StudioGameWorkspaceCommandProposalReadModel[];
    readonly diagnostics?: readonly StudioDiagnostic[];
  },
): StudioGameWorkspaceAttachEvidenceArtifact {
  const live = input.live ?? null;
  const commandProposals = input.commandProposals ?? [];
  const generatedFrom = {
    workspaceHash: input.workspace.workspaceHash,
    attachHash: input.attach.attachHash,
    liveHash: live?.liveHash ?? null,
    commandProposalHashes: commandProposals.map(proposal => proposal.proposalHash),
  };
  const artifactHash = fnv1aHash('studio-game-workspace-attach-evidence', {
    generatedFrom,
    workspaceReadout: buildStudioGameWorkspaceReadout(input.workspace),
    attach: input.attach,
    live,
    commandProposals,
    diagnostics: input.diagnostics ?? [],
  });

  return {
    artifactKind: 'studio_game_workspace_attach_evidence',
    artifactVersion: 'studio-game-workspace-attach-evidence.v0',
    artifactId: `studio-game-workspace-attach:${artifactHash}`,
    generatedFrom,
    workspace: buildStudioGameWorkspaceReadout(input.workspace),
    attach: input.attach,
    live,
    commandProposals,
    diagnostics: input.diagnostics ?? [],
    nonClaims: [
      'not_native_runtime_authority',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
      'not_publish_artifact',
    ],
    artifactHash,
  };
}

function buildReservedRuntimeSession(
  workspace: StudioGameWorkspaceReadModel,
  input: {
    readonly sessionId: string;
    readonly sessionType: Extract<StudioRuntimeSessionType, 'fixture_reserved' | 'replay_reserved'>;
    readonly profileId: string;
    readonly diagnostic: StudioDiagnostic;
  },
): StudioRuntimeSessionReadModel {
  return {
    runtimeSessionVersion: 'studio-runtime-session.v0',
    sessionId: input.sessionId,
    sessionType: input.sessionType,
    status: 'reserved',
    endpoint: null,
    profileId: input.profileId,
    runtimeMode: 'reference',
    backendMode: workspace.manifest.runtime.backendMode,
    backendProfile: workspace.manifest.runtime.backendProfile,
    backendProofRefs: workspace.manifest.runtime.backendProofRefs,
    backendCompatibilityState: 'reserved',
    attachStatus: 'reserved',
    workspaceHash: workspace.workspaceHash,
    attachHash: null,
    liveHash: null,
    compatibility: {
      contractsVersion: workspace.manifest.asha.contractsVersion,
      runtimeBridgeVersion: workspace.manifest.asha.runtimeBridgeVersion,
      devtoolsProtocolVersion: workspace.manifest.asha.devtoolsProtocolVersion,
      publishArtifactVersion: workspace.manifest.asha.publishArtifactFormatVersion,
    },
    projection: null,
    evidenceRefs: [],
    nonClaims: [
      ...(workspace.manifest.runtime.backendMode === 'native' ? [] : ['not_native_runtime_authority']),
      'not_wasm_authority',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
      'not_publish_artifact',
    ],
    diagnostics: [input.diagnostic],
    sessionHash: fnv1aHash('studio-runtime-session-reserved', {
      workspaceHash: workspace.workspaceHash,
      sessionId: input.sessionId,
      sessionType: input.sessionType,
      profileId: input.profileId,
      backendMode: workspace.manifest.runtime.backendMode,
      backendProfile: workspace.manifest.runtime.backendProfile,
      backendProofRefs: workspace.manifest.runtime.backendProofRefs,
      diagnostic: input.diagnostic,
    }),
  };
}

export function loadStudioPublishEvidence(
  artifact: unknown,
  options: {
    readonly workspace?: StudioGameWorkspaceReadModel | null;
    readonly evidencePath?: string;
  } = {},
): StudioPublishEvidenceLoadResult {
  const evidencePath = options.evidencePath ?? 'harness/out/publish-evidence/latest/index.json';
  if (!isRecord(artifact)) {
    const diagnostics = [
      studioPublishEvidenceDiagnostic(
        'publish_evidence_missing',
        'Publish evidence manifest is missing or unreadable.',
        evidencePath,
        null,
      ),
    ];
    const readModel = buildMissingStudioPublishEvidence(evidencePath, diagnostics);
    return { ok: false, publishEvidence: readModel, diagnostics };
  }

  const publishArtifact = recordAt(artifact, 'publishArtifact');
  const publishSmoke = recordAt(artifact, 'publishSmoke');
  const publishRunSmoke = recordAt(artifact, 'publishRunSmoke');
  const smokeReadback = recordAt(publishSmoke, 'readback');
  const runSmokeRuntime = recordAt(publishRunSmoke, 'runtime');
  const runSmokeProjection = recordAt(publishRunSmoke, 'projection');
  const runSmokeCommandProof = recordAt(publishRunSmoke, 'commandProof');
  const acceptedCommand = recordAt(runSmokeCommandProof, 'acceptedCommand');
  const rejectedCommand = recordAt(runSmokeCommandProof, 'rejectedCommand');
  const dependencyGuard = recordAt(smokeReadback, 'dependencyGuard');
  const diagnostics: StudioDiagnostic[] = [];
  const evidenceKind = stringAt(artifact, 'evidenceKind') ?? 'unknown';
  const evidenceVersion = stringAt(artifact, 'evidenceVersion') ?? 'unknown';
  const artifactVersion = stringAt(publishArtifact, 'artifactVersion');
  const expectedArtifactVersion = options.workspace?.manifest.asha.publishArtifactFormatVersion ?? null;
  const dependencyGuardStatus = stringAt(smokeReadback, 'publishDependencyGuard') ?? 'missing';
  const runtimeMode = stringAt(runSmokeRuntime, 'runtimeMode');
  const worldHash = stringAt(runSmokeProjection, 'worldHash');
  const acceptedCommandStatus = stringAt(acceptedCommand, 'status');
  const rejectedCommandStatus = stringAt(rejectedCommand, 'status');
  const validations = stringArrayAt(artifact, 'validations');
  const smokeChecks = stringArrayAt(publishSmoke, 'checks');
  const runChecks = stringArrayAt(publishRunSmoke, 'checks');

  if (evidenceKind !== 'asha_demo_publish_evidence_manifest' || evidenceVersion !== 'publish-evidence.v1') {
    diagnostics.push(studioPublishEvidenceDiagnostic(
      'publish_evidence_version_mismatch',
      'Publish evidence manifest kind or version is not supported by Studio.',
      evidencePath,
      `${evidenceKind}:${evidenceVersion}`,
    ));
  }
  if (expectedArtifactVersion !== null && artifactVersion !== expectedArtifactVersion) {
    diagnostics.push(studioPublishEvidenceDiagnostic(
      'publish_evidence_stale',
      'Publish evidence artifact version does not match the opened workspace manifest.',
      stringAt(publishArtifact, 'path') ?? evidencePath,
      artifactVersion ?? 'missing',
    ));
  }
  if (
    stringAt(publishArtifact, 'artifactHash') === null
    || stringAt(smokeReadback, 'artifactHash') !== stringAt(publishArtifact, 'artifactHash')
    || numberAt(publishArtifact, 'compiledAssetCount') !== numberAt(smokeReadback, 'compiledAssetCount')
    || numberAt(publishArtifact, 'publishAssetCount') !== numberAt(smokeReadback, 'publishAssetCount')
  ) {
    diagnostics.push(studioPublishEvidenceDiagnostic(
      'publish_evidence_stale',
      'Publish evidence manifest no longer agrees with publish artifact readback.',
      stringAt(publishArtifact, 'path') ?? evidencePath,
      stringAt(smokeReadback, 'artifactHash') ?? 'missing',
    ));
  }
  if (
    dependencyGuardStatus !== 'no-studio-dev-only-fragments'
    || !smokeChecks.includes('runnable_dependency_guard_passed')
  ) {
    diagnostics.push(studioPublishEvidenceDiagnostic(
      'publish_evidence_dependency_guard_failed',
      'Publish dependency guard is missing or failed.',
      stringAt(publishSmoke, 'path') ?? evidencePath,
      dependencyGuardStatus,
    ));
  }
  if (
    runtimeMode !== 'reference'
    || worldHash === null
    || acceptedCommandStatus !== 'accepted'
    || rejectedCommandStatus !== 'rejected'
    || !validations.includes('runtime_projection_readback_present')
    || !validations.includes('packaged_command_proof_present')
  ) {
    diagnostics.push(studioPublishEvidenceDiagnostic(
      'publish_evidence_run_smoke_failed',
      'Publish run smoke evidence is missing runtime projection or command proof readback.',
      stringAt(publishRunSmoke, 'path') ?? evidencePath,
      runtimeMode ?? 'missing',
    ));
  }

  const status: StudioPublishEvidenceStatus = diagnostics.some(
    diagnostic => diagnostic.code === 'publish_evidence_version_mismatch'
      || diagnostic.code === 'publish_evidence_stale',
  )
    ? 'stale'
    : diagnostics.length > 0
      ? 'degraded'
      : 'ready';
  const packedResources = recordArrayAt(smokeReadback, 'packedResources').map(resource => ({
    assetId: stringAt(resource, 'assetId') ?? 'unknown',
    outputKey: stringAt(resource, 'outputKey') ?? 'unknown',
    sourceHash: stringAt(resource, 'sourceHash'),
    packedHash: stringAt(resource, 'packedHash'),
    runnableHash: stringAt(resource, 'runnableHash'),
  }));
  const readModel: StudioPublishEvidenceReadModel = {
    publishEvidenceVersion: 'studio-publish-evidence.v0',
    status,
    evidenceKind,
    evidenceVersion,
    evidenceId: stringAt(artifact, 'evidenceId'),
    evidenceHash: stringAt(artifact, 'evidenceHash'),
    artifactPath: stringAt(publishArtifact, 'path'),
    artifactHash: stringAt(publishArtifact, 'artifactHash'),
    artifactVersion,
    artifactFileHash: stringAt(publishArtifact, 'fileHash'),
    runnableTarget: stringAt(publishArtifact, 'runnableTarget'),
    runnableEntrypointPath: stringAt(publishArtifact, 'runnableEntrypointPath'),
    runnableEntrypointHash: stringAt(publishArtifact, 'runnableEntrypointHash'),
    resourcePackManifestPath: stringAt(publishArtifact, 'resourcePackManifestPath'),
    resourcePackManifestHash: stringAt(publishArtifact, 'resourcePackManifestHash'),
    compiledAssetCount: numberAt(publishArtifact, 'compiledAssetCount') ?? 0,
    publishAssetCount: numberAt(publishArtifact, 'publishAssetCount') ?? 0,
    packedResources,
    dependencyGuard: {
      status: dependencyGuardStatus,
      inspectedFileCount: stringArrayAt(dependencyGuard, 'inspectedRunnableFiles').length,
      forbiddenFragments: stringArrayAt(dependencyGuard, 'forbiddenFragments'),
    },
    runSmoke: {
      path: stringAt(publishRunSmoke, 'path'),
      fileHash: stringAt(publishRunSmoke, 'fileHash'),
      runtimeMode,
      launcherName: stringAt(runSmokeRuntime, 'launcherName'),
      worldHash,
      acceptedCommandStatus,
      rejectedCommandStatus,
      resolvedResourceCount: numberAt(publishRunSmoke, 'resolvedResourceCount') ?? packedResources.length,
    },
    checks: [...smokeChecks, ...runChecks],
    validations,
    evidenceRefs: [
      {
        kind: 'publish-evidence',
        path: evidencePath,
        sha256: stringAt(artifact, 'evidenceHash'),
      },
      {
        kind: 'publish-artifact',
        path: stringAt(publishArtifact, 'path') ?? 'missing',
        sha256: stringAt(publishArtifact, 'fileHash'),
      },
      {
        kind: 'publish-run-smoke',
        path: stringAt(publishRunSmoke, 'path') ?? 'missing',
        sha256: stringAt(publishRunSmoke, 'fileHash'),
      },
    ],
    diagnostics,
    nonClaims: stringArrayAt(artifact, 'nonClaims'),
    publishEvidenceHash: fnv1aHash('studio-publish-evidence', {
      evidenceKind,
      evidenceVersion,
      evidenceHash: stringAt(artifact, 'evidenceHash'),
      status,
      diagnostics,
      artifact: publishArtifact,
      smokeReadback,
      runSmoke: publishRunSmoke,
    }),
  };

  return { ok: diagnostics.length === 0, publishEvidence: readModel, diagnostics };
}

function buildMissingStudioPublishEvidence(
  evidencePath: string,
  diagnostics: readonly StudioDiagnostic[],
): StudioPublishEvidenceReadModel {
  return {
    publishEvidenceVersion: 'studio-publish-evidence.v0',
    status: 'missing',
    evidenceKind: 'missing',
    evidenceVersion: 'missing',
    evidenceId: null,
    evidenceHash: null,
    artifactPath: null,
    artifactHash: null,
    artifactVersion: null,
    artifactFileHash: null,
    runnableTarget: null,
    runnableEntrypointPath: null,
    runnableEntrypointHash: null,
    resourcePackManifestPath: null,
    resourcePackManifestHash: null,
    compiledAssetCount: 0,
    publishAssetCount: 0,
    packedResources: [],
    dependencyGuard: {
      status: 'missing',
      inspectedFileCount: 0,
      forbiddenFragments: [],
    },
    runSmoke: {
      path: null,
      fileHash: null,
      runtimeMode: null,
      launcherName: null,
      worldHash: null,
      acceptedCommandStatus: null,
      rejectedCommandStatus: null,
      resolvedResourceCount: 0,
    },
    checks: [],
    validations: [],
    evidenceRefs: [
      {
        kind: 'publish-evidence',
        path: evidencePath,
        sha256: null,
      },
    ],
    diagnostics,
    nonClaims: [
      'not_native_runtime_authority',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
      'not_store_submission',
    ],
    publishEvidenceHash: fnv1aHash('studio-publish-evidence-missing', {
      evidencePath,
      diagnostics,
    }),
  };
}

export function exportStudioWorkspaceCockpitEvidence(input: {
  readonly studioWorkspace: StudioWorkspaceReadModel;
  readonly gameWorkspace: StudioGameWorkspaceReadModel | null;
  readonly assetInventory: StudioAssetInventoryReadModel | null;
  readonly proofScenes: StudioProofSceneListReadModel | null;
  readonly runtimeSessions: StudioRuntimeSessionListReadModel | null;
  readonly commandProposalPanel: StudioCommandProposalPanelReadModel | null;
  readonly publishEvidence: StudioPublishEvidenceReadModel | null;
  readonly visiblePanelMarkers: readonly string[];
  readonly diagnostics?: readonly StudioDiagnostic[];
}): StudioWorkspaceCockpitEvidenceResult {
  const diagnostics: StudioDiagnostic[] = [...(input.diagnostics ?? [])];
  const requiredMarkers = [
    'studio-game-workspace-overview',
    'studio-assets-panel',
    'studio-proof-scene-panel',
    'studio-runtime-session-panel',
    'studio-command-proposal-panel',
    'studio-publish-evidence-panel',
  ];
  if (input.gameWorkspace === null) {
    diagnostics.push(studioWorkspaceCockpitDiagnostic(
      'cockpit_missing_game_workspace',
      'Workspace cockpit evidence requires an opened game workspace readout.',
      null,
      null,
    ));
  }
  if (input.assetInventory === null || input.assetInventory.entries.length === 0) {
    diagnostics.push(studioWorkspaceCockpitDiagnostic(
      'cockpit_missing_asset_inventory',
      'Workspace cockpit evidence requires asset inventory readout data.',
      null,
      null,
    ));
  }
  if (input.proofScenes === null || input.proofScenes.scenes.length === 0) {
    diagnostics.push(studioWorkspaceCockpitDiagnostic(
      'cockpit_missing_proof_scenes',
      'Workspace cockpit evidence requires proof scene readout data.',
      null,
      null,
    ));
  }
  if (input.runtimeSessions === null || input.runtimeSessions.sessions.length === 0) {
    diagnostics.push(studioWorkspaceCockpitDiagnostic(
      'cockpit_missing_runtime_sessions',
      'Workspace cockpit evidence requires runtime session readout data.',
      null,
      null,
    ));
  }
  if (input.commandProposalPanel === null || input.commandProposalPanel.proposals.length === 0) {
    diagnostics.push(studioWorkspaceCockpitDiagnostic(
      'cockpit_missing_command_proposals',
      'Workspace cockpit evidence requires command proposal evidence rows.',
      null,
      null,
    ));
  }
  if (input.publishEvidence === null || input.publishEvidence.status !== 'ready') {
    diagnostics.push(studioWorkspaceCockpitDiagnostic(
      'cockpit_missing_publish_evidence',
      'Workspace cockpit evidence requires ready publish evidence.',
      input.publishEvidence?.evidenceId ?? null,
      input.publishEvidence?.status ?? null,
    ));
  }
  for (const marker of requiredMarkers) {
    if (!input.visiblePanelMarkers.includes(marker)) {
      diagnostics.push(studioWorkspaceCockpitDiagnostic(
        'cockpit_missing_panel_marker',
        `Workspace cockpit evidence marker is missing: ${marker}.`,
        marker,
        null,
      ));
    }
  }

  const gameWorkspace = input.gameWorkspace;
  const assetInventory = input.assetInventory;
  const proofScenes = input.proofScenes;
  const runtimeSessions = input.runtimeSessions;
  const commandProposalPanel = input.commandProposalPanel;
  const publishEvidence = input.publishEvidence;
  const generatedFrom = {
    studioWorkspaceHash: input.studioWorkspace.scene.sceneHash,
    gameWorkspaceHash: gameWorkspace?.workspaceHash ?? 'missing',
    assetInventoryHash: assetInventory?.inventoryHash ?? 'missing',
    proofSceneListHash: proofScenes?.proofSceneListHash ?? 'missing',
    runtimeSessionListHash: runtimeSessions?.sessionListHash ?? 'missing',
    commandProposalPanelHash: commandProposalPanel?.panelHash ?? 'missing',
    publishEvidenceHash: publishEvidence?.publishEvidenceHash ?? 'missing',
  };
  const artifactBody = {
    generatedFrom,
    workspace: {
      gameId: gameWorkspace?.gameId ?? 'missing',
      manifestPath: gameWorkspace?.manifestPath ?? 'missing',
      manifestHash: gameWorkspace?.workspaceHash ?? 'missing',
      attachEndpoint: gameWorkspace?.attachEndpoint ?? 'missing',
      publishCommand: gameWorkspace?.publishCommand ?? 'missing',
    },
    panels: {
      visibleMarkers: input.visiblePanelMarkers,
      assetInventory: {
        status: assetInventory?.status ?? 'missing',
        entryCount: assetInventory?.entries.length ?? 0,
        evidenceRefs: assetInventory?.entries.flatMap(entry => entry.evidenceRefs) ?? [],
      },
      proofScenes: {
        sceneIds: proofScenes?.scenes.map(scene => scene.sceneId) ?? [],
        evidenceStatuses: proofScenes?.scenes.map(scene => scene.evidenceStatus) ?? [],
      },
      runtimeSessions: {
        activeSessionId: runtimeSessions?.activeSessionId ?? 'missing',
        statuses: runtimeSessions?.sessions.map(session => `${session.sessionType}:${session.status}`) ?? [],
      },
      commandProposals: {
        actionIds: commandProposalPanel?.actions.map(action => action.actionId) ?? [],
        proposalHashes: commandProposalPanel?.proposals.map(proposal => proposal.proposalHash) ?? [],
        statuses: commandProposalPanel?.proposals.map(proposal => proposal.status) ?? [],
      },
      publishEvidence: {
        status: publishEvidence?.status ?? 'missing',
        evidenceHash: publishEvidence?.evidenceHash ?? null,
        artifactHash: publishEvidence?.artifactHash ?? null,
        dependencyGuard: publishEvidence?.dependencyGuard.status ?? 'missing',
      },
    },
    diagnostics,
  };
  const artifact: StudioWorkspaceCockpitEvidenceArtifact = {
    artifactKind: 'studio_workspace_cockpit_evidence',
    artifactVersion: 'studio-workspace-cockpit-evidence.v0',
    ...artifactBody,
    nonClaims: [
      'not_runtime_authority',
      'not_publish_builder',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
    ],
    artifactHash: fnv1aHash('studio-workspace-cockpit-evidence', artifactBody),
  };

  return diagnostics.length === 0
    ? { ok: true, artifact, diagnostics: [] }
    : { ok: false, artifact, diagnostics };
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

export function buildStudioAuthoredStatePanelReflection(input: {
  readonly workspace: StudioWorkspaceReadModel;
  readonly assetInventory: StudioAssetInventoryReadModel;
  readonly authoredSceneObjectId: SceneObjectId;
  readonly authoredSceneObjectLabel: string;
  readonly authoredCatalogAssetId: string;
  readonly visiblePanelMarkers: readonly string[];
}): StudioAuthoredStatePanelReflectionResult {
  const diagnostics: StudioDiagnostic[] = [];
  const requiredMarkers = [
    'studio-hierarchy-panel',
    'studio-viewport-top-panel',
    'studio-inspector-panel',
    'studio-assets-panel',
  ];
  for (const marker of requiredMarkers) {
    if (!input.visiblePanelMarkers.includes(marker)) {
      diagnostics.push(studioAuthoredStatePanelReflectionDiagnostic(
        'authored_panel_marker_missing',
        `Authored state panel reflection marker is missing: ${marker}.`,
        marker,
        null,
      ));
    }
  }

  const hierarchyObject = input.workspace.sceneObjectSnapshot.objects.find(
    object => object.objectId === input.authoredSceneObjectId,
  );
  const selectedEntity = input.workspace.entities.find(entity => entity.id === input.workspace.selectedEntityId);
  const selectedRenderable = input.workspace.scene.renderables.find(
    renderable => renderable.renderableId === input.workspace.scene.selectedRenderableId,
  );
  const assetEntry = input.assetInventory.entries.find(entry => entry.assetId === input.authoredCatalogAssetId);

  if (hierarchyObject?.displayName !== input.authoredSceneObjectLabel) {
    diagnostics.push(studioAuthoredStatePanelReflectionDiagnostic(
      'authored_scene_object_missing_from_hierarchy',
      `Authored scene object ${input.authoredSceneObjectId} is missing or stale in the hierarchy panel readout.`,
      input.authoredSceneObjectId,
      input.authoredSceneObjectLabel,
    ));
  }
  if (
    selectedEntity?.sceneObjectId !== input.authoredSceneObjectId
    || selectedEntity.label !== input.authoredSceneObjectLabel
  ) {
    diagnostics.push(studioAuthoredStatePanelReflectionDiagnostic(
      'authored_scene_object_missing_from_inspector',
      `Authored scene object ${input.authoredSceneObjectId} is not reflected by the selected inspector readout.`,
      input.workspace.selectedEntityId,
      input.authoredSceneObjectId,
    ));
  }
  if (
    input.workspace.scene.selectedRenderableId !== selectedEntity?.renderableId
    || selectedRenderable === undefined
  ) {
    diagnostics.push(studioAuthoredStatePanelReflectionDiagnostic(
      'authored_scene_object_missing_from_viewport',
      `Authored scene object ${input.authoredSceneObjectId} is not reflected by the viewport selected renderable.`,
      input.workspace.scene.selectedRenderableId,
      selectedEntity?.renderableId ?? null,
    ));
  }
  if (assetEntry === undefined) {
    diagnostics.push(studioAuthoredStatePanelReflectionDiagnostic(
      'authored_catalog_entry_missing_from_assets',
      `Authored catalog entry ${input.authoredCatalogAssetId} is missing from the assets panel readout.`,
      input.authoredCatalogAssetId,
      null,
    ));
  }
  if (assetEntry?.assetId !== input.authoredCatalogAssetId) {
    diagnostics.push(studioAuthoredStatePanelReflectionDiagnostic(
      'authored_catalog_entry_missing_from_inspector',
      `Authored catalog entry ${input.authoredCatalogAssetId} is not reflected by the asset inspector readout.`,
      input.authoredCatalogAssetId,
      assetEntry?.assetId ?? null,
    ));
  }

  const reflectionBody = {
    visiblePanelMarkers: input.visiblePanelMarkers,
    expected: {
      sceneObjectId: input.authoredSceneObjectId,
      sceneObjectLabel: input.authoredSceneObjectLabel,
      catalogAssetId: input.authoredCatalogAssetId,
    },
    hierarchyPanel: {
      objectId: hierarchyObject?.objectId ?? null,
      displayName: hierarchyObject?.displayName ?? null,
      selected: hierarchyObject?.objectId === input.workspace.selectedEntityId,
      sceneObjectSnapshotHash: fnv1aHash('studio-scene-object-snapshot', input.workspace.sceneObjectSnapshot),
    },
    viewportPanel: {
      selectedEntityId: input.workspace.selectedEntityId,
      selectedRenderableId: input.workspace.scene.selectedRenderableId,
      renderableIds: input.workspace.scene.renderables.map(renderable => renderable.renderableId),
      sceneHash: input.workspace.scene.sceneHash,
    },
    inspectorPanel: {
      selectedObjectId: selectedEntity?.sceneObjectId ?? null,
      selectedObjectName: selectedEntity?.label ?? null,
      selectedCatalogAssetId: assetEntry?.assetId ?? null,
      selectedCatalogAssetKind: assetEntry?.kind ?? null,
    },
    assetsPanel: {
      assetId: assetEntry?.assetId ?? null,
      kind: assetEntry?.kind ?? null,
      sourcePath: assetEntry?.sourcePath ?? null,
      dependencyStatus: assetEntry?.dependencyStatus ?? null,
      inventoryHash: input.assetInventory.inventoryHash,
    },
    diagnostics,
  };
  const reflection: StudioAuthoredStatePanelReflectionReadModel = {
    reflectionVersion: 'studio-authored-state-panel-reflection.v0',
    ...reflectionBody,
    nonClaims: [
      'not_runtime_authority',
      'not_private_ui_mutation',
      'not_dom_screenshot',
    ],
    reflectionHash: fnv1aHash('studio-authored-state-panel-reflection', reflectionBody),
  };

  return diagnostics.length === 0
    ? { ok: true, reflection, diagnostics: [] }
    : { ok: false, reflection, diagnostics };
}

export function buildStudioProofSceneList(
  input: {
    readonly workspace: StudioGameWorkspaceReadModel;
    readonly assetInventory: StudioAssetInventoryReadModel;
    readonly scenes: readonly StudioProofSceneInput[];
    readonly evidence?: StudioProofSceneEvidenceInput;
  },
): StudioProofSceneListLoadResult {
  const catalogAssetIds = new Set(input.assetInventory.entries.map(entry => entry.assetId));
  const diagnostics: StudioDiagnostic[] = [];

  if (input.scenes.length === 0) {
    diagnostics.push(studioProofSceneDiagnostic(
      'proof_scene_missing',
      'Workspace scene roots did not provide any proof scenes.',
      input.workspace.sceneRoots.join(', '),
      null,
    ));
  }

  const scenes = input.scenes.map(scene => {
    const sceneDiagnostics: StudioDiagnostic[] = [];
    if (scene.schemaVersion !== 1) {
      sceneDiagnostics.push(studioProofSceneDiagnostic(
        'proof_scene_unsupported_schema',
        `Proof scene ${scene.path} uses unsupported schema ${scene.schemaVersion}.`,
        scene.path,
        String(scene.schemaVersion),
      ));
    }

    const missingCatalogAssetIds = scene.catalogAssetIds.filter(assetId => !catalogAssetIds.has(assetId));
    if (missingCatalogAssetIds.length > 0) {
      sceneDiagnostics.push(studioProofSceneDiagnostic(
        'proof_scene_missing_catalog_reference',
        `Proof scene ${scene.name} references missing catalog assets: ${missingCatalogAssetIds.join(', ')}.`,
        scene.path,
        missingCatalogAssetIds.join(', '),
      ));
    }

    if (scene.runtimeFixture === null || scene.runtimeFixture.length === 0) {
      sceneDiagnostics.push(studioProofSceneDiagnostic(
        'proof_scene_missing_runtime_fixture',
        `Proof scene ${scene.name} is missing a runtime fixture.`,
        scene.path,
        null,
      ));
    }

    const evidenceStatus = input.evidence?.proofSceneCommandStatus ?? 'missing';
    if (evidenceStatus === 'failed') {
      sceneDiagnostics.push(studioProofSceneDiagnostic(
        'proof_scene_evidence_failed',
        `Proof scene evidence command failed for ${scene.name}.`,
        scene.path,
        input.evidence?.proofSceneCommand ?? null,
      ));
    }

    diagnostics.push(...sceneDiagnostics);
    const evidenceRefs: StudioAssetInventoryEvidenceRef[] = [
      {
        kind: 'proof-scene',
        path: scene.path,
        sha256: null,
      },
      ...(input.evidence?.assetInventoryArtifactPath === undefined
        ? []
        : [{
            kind: 'asset-inventory',
            path: input.evidence.assetInventoryArtifactPath,
            sha256: input.evidence.assetInventoryArtifactHash ?? null,
          }]),
    ];
    const readModel: StudioProofSceneReadModel = {
      proofSceneVersion: 'studio-proof-scene.v0',
      path: scene.path,
      sceneId: String(scene.sceneId),
      name: scene.name,
      description: scene.description ?? null,
      catalogAssetIds: scene.catalogAssetIds,
      catalogStatus: missingCatalogAssetIds.length === 0 ? 'resolved' : 'missing',
      missingCatalogAssetIds,
      runtimeFixture: scene.runtimeFixture,
      runtimeProfile: input.workspace.manifest.publishResourceProfile.resolutionPolicy,
      evidenceStatus,
      evidenceRefs,
      diagnostics: sceneDiagnostics,
      proofSceneHash: fnv1aHash('studio-proof-scene', {
        workspaceHash: input.workspace.workspaceHash,
        assetInventoryHash: input.assetInventory.inventoryHash,
        scene,
        evidenceStatus,
        diagnostics: sceneDiagnostics,
      }),
    };
    return readModel;
  });

  const proofScenes: StudioProofSceneListReadModel = {
    proofSceneListVersion: 'studio-proof-scene-list.v0',
    sceneRoots: input.workspace.sceneRoots,
    scenes,
    diagnostics,
    proofSceneListHash: fnv1aHash('studio-proof-scene-list', {
      workspaceHash: input.workspace.workspaceHash,
      assetInventoryHash: input.assetInventory.inventoryHash,
      sceneRoots: input.workspace.sceneRoots,
      scenes,
      diagnostics,
    }),
  };

  return diagnostics.length === 0
    ? { ok: true, proofScenes, diagnostics: [] }
    : { ok: false, proofScenes, diagnostics };
}

function npmRunScriptName(command: string): string | null {
  const match = /^npm run ([A-Za-z0-9:_-]+)$/.exec(command);
  return match?.[1] ?? null;
}

function workspaceSourceOperationKind(
  path: string,
): 'authoring.scene.save_source' | 'authoring.catalog.save_source' | null {
  if (path.endsWith('.scene.json')) {
    return 'authoring.scene.save_source';
  }
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

function sceneFileDiagnostic(
  code: StudioSceneFileDiagnosticCode,
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

function studioAuthoredStatePanelReflectionDiagnostic(
  code: StudioAuthoredStatePanelReflectionDiagnosticCode,
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
    severity: code === 'runtime_session_reserved' ? 'info' : 'error',
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

function studioLiveDebugSessionDiagnostic(
  code: StudioLiveDebugSessionDiagnosticCode,
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

function studioLiveSceneEntityDebugDiagnostic(
  code: StudioLiveSceneEntityDebugDiagnosticCode,
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

function studioLiveAssetResourceDebugDiagnostic(
  code: StudioLiveAssetResourceDebugDiagnosticCode,
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

function studioLiveRuntimeTelemetryDebugDiagnostic(
  code: StudioLiveRuntimeTelemetryDebugDiagnosticCode,
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

function studioLiveDebugCommandProposalDiagnostic(
  code: StudioLiveDebugCommandProposalDiagnosticCode,
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

function studioAuthoredBrowserDebugDiagnostic(
  code: StudioAuthoredBrowserDebugDiagnosticCode,
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

function studioPublishEvidenceDiagnostic(
  code: StudioPublishEvidenceDiagnosticCode,
  message: string,
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return {
    severity: code === 'publish_evidence_missing' ? 'warning' : 'error',
    code,
    message,
    source,
    remediation,
  };
}

function studioWorkspaceCockpitDiagnostic(
  code: StudioWorkspaceCockpitEvidenceDiagnosticCode,
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

function studioProofSceneDiagnostic(
  code: StudioProofSceneDiagnosticCode,
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
} = {}): StudioRenderSettingsReadModel {
  const render = {
    wireframeEnabled: options.wireframeEnabled ?? false,
    showGrid: options.showGrid ?? true,
    showPreviewGhosts: options.showPreviewGhosts ?? true,
    showReadbackOverlay: options.showReadbackOverlay ?? false,
    showRaycastHitDebug: options.showRaycastHitDebug ?? false,
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
      [key]: value,
    },
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
    position: options.position ?? { x: 4.6, y: 5.2, z: 4.1 },
    target: options.target ?? { x: 1.25, y: 1.1, z: 0.55 },
    up: options.up ?? { x: 0, y: 0, z: 1 },
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
  readonly selectedScenarioDraftId?: string;
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
    selectedScenarioDraftId: options.selectedScenarioDraftId ?? 'voxel-basic',
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
  const yaw = Math.atan2(offset.y, offset.x) - delta.deltaX * 0.008;
  const horizontal = Math.hypot(offset.x, offset.y);
  const pitch = clamp(Math.atan2(offset.z, horizontal) + delta.deltaY * 0.008, -1.15, 1.15);
  const nextOffset = {
    x: Math.cos(pitch) * Math.cos(yaw) * radius,
    y: Math.cos(pitch) * Math.sin(yaw) * radius,
    z: Math.sin(pitch) * radius,
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
      y: target.y + extent * 2.15,
      z: target.z + extent * 1.45,
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

function buildInitialRenderables(): readonly StudioSceneRenderableReadModel[] {
  return [
    {
      renderableId: 'terrain-test-grid',
      label: 'Terrain Grid',
      kind: 'voxel_grid',
      sourceState: 'authoritative',
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 3, z: 1 } },
      meshRef: 'generated:voxel-grid',
      materialRef: 'material:grid-reference',
      renderHash: 'render-before-voxel-basic',
      visible: true,
      pickable: true,
    },
    {
      renderableId: 'selected-voxel:0,0,0',
      label: 'Voxel (0, 0, 0)',
      kind: 'voxel_cell',
      sourceState: 'authoritative',
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      meshRef: 'generated:voxel-cell',
      materialRef: 'material:authority-voxel',
      renderHash: 'render-selected-voxel-000',
      visible: true,
      pickable: true,
    },
    {
      renderableId: 'preview-ghost:1,0,0',
      label: 'Preview Ghost (1, 0, 0)',
      kind: 'preview_ghost',
      sourceState: 'pending',
      bounds: { min: { x: 1, y: 0, z: 0 }, max: { x: 2, y: 1, z: 1 } },
      meshRef: 'generated:voxel-cell',
      materialRef: 'material:preview-ghost',
      renderHash: 'render-preview-ghost-100',
      visible: true,
      pickable: false,
    },
    {
      renderableId: 'model-preview-crate',
      label: 'Demo Crate Preview',
      kind: 'static_mesh',
      sourceState: 'reference',
      bounds: { min: { x: 1.125, y: 1.125, z: 0.275 }, max: { x: 1.875, y: 1.875, z: 1.025 } },
      meshRef: 'static-mesh:demo-crate',
      materialRef: 'material:crate-reference',
      renderHash: 'render-model-preview-crate',
      visible: true,
      pickable: false,
    },
  ];
}

function parseStudioSceneFileSource(source: StudioSceneFileSourceInput): {
  readonly sceneId: string;
  readonly name: string;
  readonly description: string | null;
  readonly catalogAssetIds: readonly string[];
  readonly runtimeFixture: string | null;
  readonly diagnostics: readonly StudioDiagnostic[];
} {
  const diagnostics: StudioDiagnostic[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(source.text);
  } catch {
    return {
      sceneId: source.path,
      name: source.path,
      description: null,
      catalogAssetIds: [],
      runtimeFixture: null,
      diagnostics: [sceneFileDiagnostic(
        'scene_file_invalid_json',
        `Scene source ${source.path} must be valid JSON.`,
        source.path,
        'Fix the scene JSON before opening it in Studio.',
      )],
    };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    diagnostics.push(sceneFileDiagnostic(
      'scene_file_unsupported_schema',
      `Scene source ${source.path} must be a JSON object.`,
      source.path,
      'Use proof-scene-json.v1 scene source shape.',
    ));
  }
  const record = (parsed ?? {}) as Record<string, unknown>;
  if (record.schemaVersion !== 1) {
    diagnostics.push(sceneFileDiagnostic(
      'scene_file_unsupported_schema',
      `Scene source ${source.path} uses unsupported schema.`,
      source.path,
      String(record.schemaVersion ?? 'missing'),
    ));
  }
  if (typeof record.name !== 'string' || record.name.trim().length === 0) {
    diagnostics.push(sceneFileDiagnostic(
      'scene_file_missing_name',
      `Scene source ${source.path} is missing a display name.`,
      source.path,
      'Set a non-empty name before opening the scene.',
    ));
  }
  const catalogAssetIds = Array.isArray(record.catalogAssetIds)
    ? record.catalogAssetIds.filter((assetId): assetId is string => typeof assetId === 'string')
    : [];
  if (catalogAssetIds.length === 0) {
    diagnostics.push(sceneFileDiagnostic(
      'scene_file_missing_catalog_assets',
      `Scene source ${source.path} has no catalog assets to project.`,
      source.path,
      'Add at least one catalog asset id for Studio viewport projection.',
    ));
  }

  return {
    sceneId: String(record.sceneId ?? source.path),
    name: typeof record.name === 'string' && record.name.trim().length > 0 ? record.name : source.path,
    description: typeof record.description === 'string' ? record.description : null,
    catalogAssetIds,
    runtimeFixture: typeof record.runtimeFixture === 'string' ? record.runtimeFixture : null,
    diagnostics,
  };
}

function buildSceneFileRenderables(
  sceneFile: StudioSceneFileReadModel,
): readonly StudioSceneRenderableReadModel[] {
  const grid: StudioSceneRenderableReadModel = {
    renderableId: `scene-file-grid:${sceneFile.sceneId}`,
    label: `${sceneFile.name} Grid`,
    kind: 'voxel_grid',
    sourceState: 'reference',
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: Math.max(2, sceneFile.catalogAssetIds.length + 1), y: 2, z: 0.2 } },
    meshRef: 'generated:scene-file-grid',
    materialRef: 'material:grid-reference',
    renderHash: fnv1aHash('scene-file-grid-render', {
      path: sceneFile.path,
      hash: sceneFile.hash,
    }),
    visible: true,
    pickable: true,
  };
  const assets = sceneFile.catalogAssetIds.map((assetId, index): StudioSceneRenderableReadModel => {
    const x = 0.65 + index * 1.15;
    return {
      renderableId: `scene-file-asset:${assetId}`,
      label: assetId,
      kind: assetId.startsWith('mesh.') ? 'static_mesh' : 'preview_ghost',
      sourceState: 'reference',
      bounds: { min: { x, y: 0.65, z: 0.2 }, max: { x: x + 0.75, y: 1.4, z: 0.95 } },
      meshRef: assetId.startsWith('mesh.') ? `static-mesh:${assetId.replace(/^mesh\./, '')}` : `asset:${assetId}`,
      materialRef: sceneFile.catalogAssetIds.find(id => id.startsWith('material.')) ?? 'material:scene-file-reference',
      renderHash: fnv1aHash('scene-file-asset-render', {
        path: sceneFile.path,
        assetId,
        index,
      }),
      visible: true,
      pickable: true,
    };
  });
  return [grid, ...assets];
}

function buildPlaceholderScenarioRenderables(): readonly StudioSceneRenderableReadModel[] {
  return [
    {
      renderableId: 'placeholder-ground-grid',
      label: 'Placeholder Ground Grid',
      kind: 'voxel_grid',
      sourceState: 'reference',
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 4, y: 2, z: 0.35 } },
      meshRef: 'generated:placeholder-grid',
      materialRef: 'material:grid-reference',
      renderHash: 'render-placeholder-grid',
      visible: true,
      pickable: true,
    },
    {
      renderableId: 'placeholder-static-block',
      label: 'Placeholder Static Block',
      kind: 'static_mesh',
      sourceState: 'reference',
      bounds: { min: { x: 1.35, y: 0.55, z: 0.15 }, max: { x: 2.35, y: 1.55, z: 1.15 } },
      meshRef: 'static-mesh:placeholder-block',
      materialRef: 'material:placeholder-reference',
      renderHash: 'render-placeholder-static-block',
      visible: true,
      pickable: true,
    },
    {
      renderableId: 'placeholder-preview-anchor',
      label: 'Placeholder Preview Anchor',
      kind: 'preview_ghost',
      sourceState: 'pending',
      bounds: { min: { x: 2.5, y: 0.55, z: 0.15 }, max: { x: 3.1, y: 1.15, z: 0.75 } },
      meshRef: 'generated:preview-anchor',
      materialRef: 'material:preview-ghost',
      renderHash: 'render-placeholder-preview-anchor',
      visible: true,
      pickable: false,
    },
  ];
}

function buildScenarioRenderables(scenarioId: string): readonly StudioSceneRenderableReadModel[] {
  if (scenarioId === 'voxel-basic') {
    return buildInitialRenderables();
  }
  if (scenarioId === 'scenario-placeholder') {
    return buildPlaceholderScenarioRenderables();
  }
  return [];
}

function firstSelectableRenderableId(
  renderables: readonly StudioSceneRenderableReadModel[],
): string | null {
  return renderables.find(renderable => renderable.pickable)?.renderableId ?? null;
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
      commandId: 'session.start',
      label: 'Start Session',
      requestedBy: 'gui',
      inputSummary: 'scenarioId=voxel-basic',
      outputSummary: 'Session session-preview-0001 started.',
      changedScene: false,
      changedSelection: false,
    },
    {
      commandId: 'session.load_scenario',
      label: 'Load Scenario',
      requestedBy: 'agent',
      inputSummary: 'scenarioId=voxel-basic',
      outputSummary: 'Loaded Basic Voxel Scenario.',
      changedScene: true,
      changedSelection: false,
    },
    {
      commandId: 'inspection.editor_state',
      label: 'Read Editor State',
      requestedBy: 'gui',
      inputSummary: 'sessionId=session-preview-0001',
      outputSummary: 'Projected scene read model with 4 renderables.',
      changedScene: false,
      changedSelection: false,
    },
    {
      commandId: 'selection.set_active_entity',
      label: 'Set Active Entity',
      requestedBy: 'gui',
      inputSummary: 'entityId=selected-voxel:0,0,0',
      outputSummary: 'Selected Voxel (0, 0, 0).',
      changedScene: false,
      changedSelection: true,
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
  const renderables = buildInitialRenderables();
  const selectedRenderableId = 'selected-voxel:0,0,0';
  const compatibility = buildStudioCompatibilityEvidence();
  const session: StudioSessionReadModel = {
    sessionId: 'session-preview-0001',
    scenarioId: 'voxel-basic',
    scenarioLabel: 'Basic Voxel Scenario',
    runtimeMode: 'reference',
    status: 'ready',
    startedAtIso: '1970-01-01T00:00:00.000Z',
  };
  const scene: StudioSceneReadModel = {
    sceneId: 'scene-view:voxel-basic:v1',
    selectedRenderableId,
    renderables,
    sceneHash: buildSceneHash(renderables),
  };
  const flatSceneDocument = createStudioFlatSceneDocument(scene);
  const sceneObjectSnapshot = buildStudioSceneObjectSnapshot(scene, flatSceneDocument);
  const timelineState = buildInitialTimeline();

  return {
    workspaceId: 'asha-studio-substrate',
    compatibilityMarker: 'asha-studio-substrate.angular-nx.v0',
    compatibility,
    session,
    scenarios: [
      { scenarioId: 'voxel-basic', label: 'Basic Voxel Scenario', status: 'loaded' },
      { scenarioId: 'scenario-placeholder', label: 'Placeholder Scenario', status: 'available' },
    ],
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
    scenarios: readModel.scenarios.map(scenario =>
      scenario.scenarioId === readModel.session.scenarioId
        ? { ...scenario, status: 'loaded' }
        : { ...scenario, status: scenario.status === 'loaded' ? 'available' : scenario.status },
    ),
    flatSceneDocument,
    sceneObjectSnapshot,
    entities: projectEntitiesFromScene(session, scene, sceneObjectSnapshot, readModel.entities),
    selectedEntityId: null,
    timeline: [...readModel.timeline, command.timelineEntry],
    commandResults: [...readModel.commandResults, command.commandResult],
    timelineSequence: readModel.timelineSequence + 1,
  };
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

export function addReferenceRenderableReadModel(
  readModel: StudioWorkspaceReadModel,
): StudioWorkspaceReadModel {
  const referenceIndex = readModel.scene.renderables.filter(renderable =>
    renderable.renderableId.startsWith('reference-placeholder-'),
  ).length + 1;
  const offset = 0.55 * referenceIndex;
  const renderableId = `reference-placeholder-${referenceIndex}`;
  const renderable: StudioSceneRenderableReadModel = {
    renderableId,
    label: `Reference Placeholder ${referenceIndex}`,
    kind: 'static_mesh',
    sourceState: 'reference',
    bounds: {
      min: { x: 2.1 + offset, y: 1.1, z: 0.25 },
      max: { x: 2.75 + offset, y: 1.75, z: 0.9 },
    },
    meshRef: 'static-mesh:reference-placeholder',
    materialRef: 'material:reference-placeholder',
    renderHash: fnv1aHash('render-reference-placeholder', {
      referenceIndex,
      previousSceneHash: readModel.scene.sceneHash,
    }),
    visible: true,
    pickable: true,
  };
  const renderables = [...readModel.scene.renderables, renderable];
  const scene: StudioSceneReadModel = {
    ...readModel.scene,
    selectedRenderableId: renderableId,
    renderables,
    sceneHash: buildSceneHash(renderables),
  };
  const flatSceneDocument = createStudioFlatSceneDocument(scene);
  const sceneObjectSnapshot = buildStudioSceneObjectSnapshot(scene, flatSceneDocument);
  const entities = projectEntitiesFromScene(
    readModel.session,
    scene,
    sceneObjectSnapshot,
    readModel.entities,
  );
  const command = createTimelineEntry({
    index: readModel.timeline.length,
    commandId: 'scene.load_asset',
    label: 'Load Reference Placeholder',
    requestedBy: 'gui',
    inputSummary: 'assetId=static-mesh:reference-placeholder',
    outputSummary: `Added ${renderable.label}.`,
    changedScene: true,
    changedSelection: true,
  });

  return {
    ...readModel,
    scene,
    flatSceneDocument,
    sceneObjectSnapshot,
    entities,
    selectedEntityId: selectedObjectIdForRenderable(sceneObjectSnapshot, renderableId),
    timeline: [...readModel.timeline, command.timelineEntry],
    commandResults: [...readModel.commandResults, command.commandResult],
    timelineSequence: readModel.timelineSequence + 1,
  };
}

export function loadScenarioReadModel(
  readModel: StudioWorkspaceReadModel,
  scenarioId: string,
): StudioScenarioLoadResult {
  const scenario = readModel.scenarios.find(item => item.scenarioId === scenarioId);
  if (scenario === undefined) {
    return {
      ok: false,
      workspace: readModel,
      diagnostics: [
        diagnostic(
          'error',
          'scenario_load_unknown',
          `Scenario ${scenarioId} is not available in the Studio workspace.`,
          'session.load_scenario',
          'Select one of the scenarios advertised by the workspace read model.',
        ),
      ],
    };
  }

  const renderables = buildScenarioRenderables(scenarioId);
  const selectedRenderableId = firstSelectableRenderableId(renderables);
  const session: StudioSessionReadModel = {
    ...readModel.session,
    scenarioId,
    scenarioLabel: scenario.label,
    status: 'ready',
  };
  const scene: StudioSceneReadModel = {
    sceneId: `scene-view:${scenarioId}:v1`,
    selectedRenderableId,
    renderables,
    sceneHash: buildSceneHash(renderables),
  };
  const flatSceneDocument = createStudioFlatSceneDocument(scene);
  const sceneObjectSnapshot = buildStudioSceneObjectSnapshot(scene, flatSceneDocument);
  const entities = projectEntitiesFromScene(session, scene, sceneObjectSnapshot, readModel.entities);
  const command = createTimelineEntry({
    index: readModel.timeline.length,
    commandId: 'session.load_scenario',
    label: 'Load Scenario',
    requestedBy: 'gui',
    inputSummary: `scenarioId=${scenarioId}`,
    outputSummary: `Loaded ${scenario.label}.`,
    changedScene: true,
    changedSelection: readModel.selectedEntityId !== selectedRenderableId,
  });

  return {
    ok: true,
    workspace: {
      ...readModel,
      session,
      scene,
      scenarios: readModel.scenarios.map(item => ({
        ...item,
        status: item.scenarioId === scenarioId ? 'loaded' : 'available',
      })),
      flatSceneDocument,
      sceneObjectSnapshot,
      entities,
      selectedEntityId: selectedObjectIdForRenderable(sceneObjectSnapshot, selectedRenderableId),
      timeline: [...readModel.timeline, command.timelineEntry],
      commandResults: [...readModel.commandResults, command.commandResult],
      timelineSequence: readModel.timelineSequence + 1,
    },
    diagnostics: [],
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
    tags: ['studio-root'],
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
      authoringFormatVersion: 1,
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

export function createLoadScenarioIntent(
  readModel: StudioWorkspaceReadModel,
  scenarioId: string,
): StudioIntent {
  const scenario = readModel.scenarios.find(item => item.scenarioId === scenarioId);
  if (scenario === undefined) {
    return {
      kind: 'noop',
      reason: `unknown scenario: ${scenarioId}`,
    };
  }
  return {
    kind: 'load_scenario',
    scenarioId,
    expectedTimelineSequence: readModel.timelineSequence,
  };
}

export function createLoadReferenceAssetIntent(
  readModel: StudioWorkspaceReadModel,
): StudioIntent {
  return {
    kind: 'load_reference_asset',
    assetId: 'static-mesh:reference-placeholder',
    expectedTimelineSequence: readModel.timelineSequence,
  };
}

export function createOpenSceneFileIntent(
  readModel: StudioWorkspaceReadModel,
  sceneFile: StudioSceneFileReadModel,
): StudioIntent {
  return {
    kind: 'open_scene_file',
    path: sceneFile.path,
    expectedHash: sceneFile.hash,
    expectedTimelineSequence: readModel.timelineSequence,
  };
}

export function createSaveSceneFileIntent(
  readModel: StudioWorkspaceReadModel,
  options: {
    readonly path: string;
    readonly expectedPreviousHash: string | null;
    readonly saveAs?: boolean;
  },
): StudioIntent {
  return {
    kind: 'save_scene_file',
    path: options.path,
    expectedPreviousHash: options.expectedPreviousHash,
    saveAs: options.saveAs ?? false,
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
  readonly sceneSource: {
    readonly path: string;
    readonly sha256: string;
  };
  readonly savedAtIso?: string;
}): string {
  const normalizedScenePath = normalizeStudioProjectArtifactPath(options.sceneSource.path);
  const normalizedManifestPath = normalizeStudioProjectArtifactPath(options.project.manifestPath);
  const savedAtIso = options.savedAtIso ?? '1970-01-01T00:00:00.000Z';
  if (
    normalizedScenePath === null
    || normalizedManifestPath === null
    || options.project.gameId.trim().length === 0
    || !isSha256Digest(options.project.manifestSha256)
    || !isSha256Digest(options.sceneSource.sha256)
    || !isUtcIsoTimestamp(savedAtIso)
  ) {
    throw new Error('Studio project workspace requires project identity, bounded paths, and a canonical SHA-256 digest.');
  }
  const artifact: StudioWorkspaceArtifact = {
    schemaVersion: 1,
    artifactKind: 'studio_project_workspace',
    artifactId: `studio-project-workspace:${options.project.gameId}`,
    workspaceVersion: 'studio-project-workspace.v1',
    savedAtIso,
    project: {
      gameId: options.project.gameId,
      manifestPath: normalizedManifestPath,
      manifestSha256: options.project.manifestSha256,
    },
    authoredContent: {
      sceneSource: {
        path: normalizedScenePath,
        sha256: options.sceneSource.sha256,
      },
    },
    stateClassification: {
      durableAuthoredContent: 'hash_pinned_project_sources',
      editorPreferences: 'browser_local_not_serialized',
      transientProjection: 'reconstructed_not_serialized',
      attachedRuntime: 'disconnect_and_reconnect_not_serialized',
    },
    serializationNotes: [
      'Durable authored content remains in inspectable project-root source files referenced by hash.',
      'Editor preferences stay browser-local and are not project content.',
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

function recordArrayAt(value: unknown, key: string): readonly Record<string, unknown>[] {
  if (!isRecord(value) || !Array.isArray(value[key])) {
    return [];
  }
  return value[key].filter(isRecord);
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

function numberAt(value: unknown, key: string): number | null {
  return isRecord(value) && typeof value[key] === 'number' ? value[key] : null;
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
  const sceneSource = recordAt(authoredContent, 'sceneSource');
  const stateClassification = recordAt(root, 'stateClassification');
  const scenePath = stringAt(sceneSource, 'path');
  const sceneHash = stringAt(sceneSource, 'sha256');
  const normalizedScenePath = scenePath === null ? null : normalizeStudioProjectArtifactPath(scenePath);
  const manifestPath = stringAt(project, 'manifestPath');
  const normalizedManifestPath = manifestPath === null ? null : normalizeStudioProjectArtifactPath(manifestPath);
  const serializationNotes = stringArrayAt(root, 'serializationNotes');
  const shapeMatches = root['schemaVersion'] === 1
    && root['artifactKind'] === 'studio_project_workspace'
    && root['workspaceVersion'] === 'studio-project-workspace.v1'
    && root['artifactId'] === `studio-project-workspace:${String(project['gameId'] ?? '')}`
    && isUtcIsoTimestamp(root['savedAtIso'])
    && typeof project['gameId'] === 'string'
    && project['gameId'].trim().length > 0
    && normalizedManifestPath !== null
    && normalizedManifestPath === manifestPath
    && isSha256Digest(project['manifestSha256'])
    && normalizedScenePath !== null
    && normalizedScenePath === scenePath
    && isSha256Digest(sceneHash)
    && stateClassification['durableAuthoredContent'] === 'hash_pinned_project_sources'
    && stateClassification['editorPreferences'] === 'browser_local_not_serialized'
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
          'Studio project workspace artifact does not match studio-project-workspace.v1.',
          'studio_project_workspace',
          'Load a bounded project artifact with typed state classification and a canonical scene digest.',
        ),
      ],
    };
  }

  const artifact: StudioWorkspaceArtifact = {
    schemaVersion: 1,
    artifactKind: 'studio_project_workspace',
    artifactId: root['artifactId'] as string,
    workspaceVersion: 'studio-project-workspace.v1',
    savedAtIso: root['savedAtIso'] as string,
    project: {
      gameId: project['gameId'] as string,
      manifestPath: project['manifestPath'] as string,
      manifestSha256: project['manifestSha256'] as string,
    },
    authoredContent: {
      sceneSource: {
        path: scenePath as string,
        sha256: sceneHash as string,
      },
    },
    stateClassification: {
      durableAuthoredContent: 'hash_pinned_project_sources',
      editorPreferences: 'browser_local_not_serialized',
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
  source: StudioSceneFileSourceInput,
): StudioWorkspaceSceneReferenceValidationResult {
  const expected = artifact.authoredContent.sceneSource;
  if (source.path !== expected.path) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'error',
          'workspace_artifact_scene_path_mismatch',
          'Project workspace scene readback returned a different bounded path.',
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
  readonly sceneSource: StudioSceneFileSourceInput;
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
      sceneFile: null,
      diagnostics: restoreResult.diagnostics,
    };
  }
  const referenceValidation = validateStudioWorkspaceArtifactSceneReference(
    restoreResult.artifact,
    options.sceneSource,
  );
  if (!referenceValidation.ok) {
    return {
      ok: false,
      artifact: null,
      workspace: null,
      sceneFile: null,
      diagnostics: referenceValidation.diagnostics,
    };
  }
  const sceneValidation = buildStudioSceneFileList({
    workspace: options.project,
    manifestPath: options.project.manifestPath,
    manifestHash: options.project.workspaceHash,
    sourceFiles: [options.sceneSource],
    allowProjectRoot: true,
  });
  const sceneFile = sceneValidation.sceneFiles.files.at(0) ?? null;
  if (!sceneValidation.ok || sceneFile === null) {
    return {
      ok: false,
      artifact: null,
      workspace: null,
      sceneFile: null,
      diagnostics: sceneValidation.diagnostics,
    };
  }
  return {
    ok: true,
    artifact: restoreResult.artifact,
    workspace: applyOpenSceneFileReadModel(options.currentWorkspace, sceneFile),
    sceneFile,
    diagnostics: [],
  };
}

export function createStudioAgentReadout(
  readModel: StudioWorkspaceReadModel,
  options: {
    readonly generatedAtIso?: string;
    readonly compatibility?: StudioCompatibilityEvidence;
    readonly viewport?: StudioViewportReadout;
    readonly renderSettings?: StudioRenderSettingsReadModel;
    readonly uiState?: StudioUiStateReadModel;
    readonly knownLimitations?: readonly string[];
  } = {},
): StudioAgentReadoutArtifact {
  const compatibility = options.compatibility ?? readModel.compatibility;
  const diagnostics = compatibility.diagnostics;
  return {
    schemaVersion: 1,
    artifactKind: 'agent_readout',
    artifactId: `agent-readout:${readModel.session.sessionId}`,
    generatedAtIso: options.generatedAtIso ?? '1970-01-01T00:00:00.000Z',
    workspaceId: readModel.workspaceId,
    compatibilityMarker: readModel.compatibilityMarker,
    session: readModel.session,
    compatibility,
    scene: readModel.scene,
    entities: readModel.entities,
    selectedEntityId: readModel.selectedEntityId,
    entityListHash: computeEntityListHash(readModel.entities),
    viewport: options.viewport,
    renderSettings: options.renderSettings,
    uiState: options.uiState,
    commandTimeline: readModel.timeline,
    commandResults: readModel.commandResults,
    readbackMarker: `${readModel.session.sessionId}:${readModel.scene.sceneHash}:${readModel.timelineSequence}`,
    diagnostics,
    knownLimitations: options.knownLimitations ?? [
      'Current Angular base is a browser reference projection; native runtime authority, hardware GPU evidence, and Agora compositor capture remain gated behind later proof slices.',
    ],
  };
}

export function createStudioCompactAgentReadout(options: {
  readonly workspace: StudioWorkspaceReadModel;
  readonly renderSettings: StudioRenderSettingsReadModel;
  readonly viewportCamera?: StudioViewportCameraReadModel;
  readonly viewportTool?: StudioViewportToolReadModel;
  readonly uiState?: StudioUiStateReadModel;
  readonly latestViewportHit?: StudioViewportHitReadModel | null;
  readonly diagnostics?: readonly StudioDiagnostic[];
  readonly nonClaims?: readonly string[];
}): StudioCompactAgentReadout {
  const workspace = options.workspace;
  const selectedEntity =
    workspace.selectedEntityId === null
      ? null
      : workspace.entities.find(entity => entity.id === workspace.selectedEntityId) ?? null;

  return {
    schemaVersion: 1,
    artifactKind: 'compact_agent_readout',
    readoutVersion: 'studio-compact-readout.v0',
    workspaceId: workspace.workspaceId,
    compatibilityMarker: workspace.compatibilityMarker,
    session: {
      sessionId: workspace.session.sessionId,
      scenarioId: workspace.session.scenarioId,
      scenarioLabel: workspace.session.scenarioLabel,
      status: workspace.session.status,
    },
    scene: {
      sceneId: workspace.scene.sceneId,
      sceneHash: workspace.scene.sceneHash,
      renderableCount: workspace.scene.renderables.length,
      selectedRenderableId: workspace.scene.selectedRenderableId,
    },
    selectedEntity:
      selectedEntity === null
        ? null
        : {
            entityId: selectedEntity.id,
            label: selectedEntity.label,
            kind: selectedEntity.kind,
            sourceState: selectedEntity.sourceState,
          },
    viewport: buildStudioViewportReadout({
      camera: options.viewportCamera,
      tool: options.viewportTool,
    }),
    latestViewportHit: options.latestViewportHit ?? null,
    renderSettings: options.renderSettings,
    uiState: options.uiState,
    latestCommand: workspace.timeline.at(-1) ?? null,
    latestCommandResult: workspace.commandResults.at(-1) ?? null,
    timelineSequence: workspace.timelineSequence,
    readbackMarker: `${workspace.session.sessionId}:${workspace.scene.sceneHash}:${workspace.timelineSequence}`,
    diagnostics: options.diagnostics ?? workspace.compatibility.diagnostics,
    nonClaims: options.nonClaims ?? [
      'browser_reference_projection',
      'not_native_runtime_authority',
      'not_hardware_gpu_evidence',
      'not_performance_evidence',
      'not_proof_harness',
    ],
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
