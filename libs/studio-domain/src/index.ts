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
  parseAshaGameManifestToml,
  validateAshaConsumerCompatibility,
  type AshaGameManifest,
} from '@asha/game-workspace';

export type StudioActorKind = 'gui' | 'agent' | 'script';
export type StudioWorkspaceStatus = 'not_started' | 'ready' | 'degraded';
export type StudioCommandStatus = 'ok' | 'rejected' | 'failed';
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
export type StudioViewportToolMode = 'select' | 'orbit' | 'pan' | 'frame';
export type StudioAssetBrowserCategory =
  | 'all'
  | 'static_meshes'
  | 'materials'
  | 'generated'
  | 'preview';
export type StudioBottomPanelTab = 'timeline' | 'assets' | 'evidence';
export type StudioApplicationMenu = 'file' | 'edit' | 'view' | 'preferences';
export type StudioRenderSettingKey =
  | 'wireframeEnabled'
  | 'showGrid'
  | 'showPreviewGhosts'
  | 'showReadbackOverlay'
  | 'showRaycastHitDebug';
export type StudioUiEventCommandId =
  | 'workspace.save_browser_slot'
  | 'workspace.load_browser_slot'
  | 'preferences.set_render_setting';

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
  readonly publishCommand: string;
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
  readonly publishCommand: string;
  readonly workspaceHash: string;
  readonly diagnostics: readonly StudioDiagnostic[];
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
  readonly batch: CommandBatch;
  readonly status: 'accepted' | 'rejected';
  readonly result: CommandResult;
  readonly authorityHashAfter: string | null;
  readonly rejectionReason: 'authority_rejected' | 'compatibility_mismatch' | 'runtime_unavailable' | null;
  readonly proposalHash: string;
  readonly diagnostics: readonly StudioDiagnostic[];
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
  readonly uiStateVersion: 'studio-ui-state.v0';
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
  readonly savedWorkspaceAvailable: boolean;
  readonly uiStateHash: string;
  readonly nonClaims: readonly string[];
}

export interface StudioWorkspaceArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'studio_workspace';
  readonly artifactId: string;
  readonly workspaceVersion: 'studio-workspace.v0';
  readonly savedAtIso: string;
  readonly workspace: StudioWorkspaceReadModel;
  readonly viewportCamera: StudioViewportCameraReadModel;
  readonly viewportTool: StudioViewportToolReadModel;
  readonly preferences: StudioPreferencesReadModel;
  readonly flatSceneDocument: FlatSceneDocument;
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

export interface NoopIntent {
  readonly kind: 'noop';
  readonly reason: string;
}

export type StudioIntent =
  | SelectEntityIntent
  | SceneObjectCommandIntent
  | LoadScenarioIntent
  | LoadReferenceAssetIntent
  | NoopIntent;

export interface StudioSceneObjectCommandApplyResult {
  readonly ok: boolean;
  readonly workspace: StudioWorkspaceReadModel;
  readonly result: SceneObjectCommandResult;
  readonly diagnostics: readonly StudioDiagnostic[];
}

const ASHA_PACKAGE_LINK_ROOT = ['link:..', 'asha', 'ts', 'packages'].join('/');

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
    publishCommand: parsed.manifest.publish.command,
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
    publishCommand: workspace.publishCommand,
    workspaceHash: workspace.workspaceHash,
    diagnostics: workspace.diagnostics,
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

  const attach: StudioGameWorkspaceAttachReadModel = {
    attachVersion: 'studio-game-workspace-attach.v0',
    status: 'attached',
    endpoint: workspace.attachEndpoint,
    workspaceHash: workspace.workspaceHash,
    handshakeRequest,
    compatibility: response.compatibility,
    runtime: response.runtime,
    attachHash: fnv1aHash('studio-game-workspace-attach', {
      endpoint: workspace.attachEndpoint,
      workspaceHash: workspace.workspaceHash,
      compatibility: response.compatibility,
      runtime: response.runtime,
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
  if (projection.type !== 'projection.snapshot' || projection.summary.worldHash.length === 0) {
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
    batch: input.batch,
    status: response.proposal.status,
    result: response.proposal.result,
    authorityHashAfter: response.proposal.authorityHashAfter,
    rejectionReason: response.proposal.status === 'rejected' ? response.proposal.reason : null,
    proposalHash: fnv1aHash('studio-game-workspace-command', {
      workspaceHash: workspace.workspaceHash,
      attachHash: attach.attachHash,
      sequenceId: input.sequenceId,
      batch: input.batch,
      proposal: response.proposal,
    }),
    diagnostics,
  };

  return { ok: true, proposal, diagnostics: [] };
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

function npmRunScriptName(command: string): string | null {
  const match = /^npm run ([A-Za-z0-9:_-]+)$/.exec(command);
  return match?.[1] ?? null;
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
    showReadbackOverlay: options.showReadbackOverlay ?? true,
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
  readonly savedWorkspaceAvailable?: boolean;
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
    savedWorkspaceAvailable: options.savedWorkspaceAvailable ?? false,
  };

  return {
    schemaVersion: 1,
    artifactKind: 'studio_ui_state',
    uiStateVersion: 'studio-ui-state.v0',
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

export function createStudioFlatSceneDocument(
  scene: StudioSceneReadModel,
): FlatSceneDocument {
  return flatSceneDocumentForScene(scene);
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
  } else {
    const id = request.command.kind === 'create' ? request.command.record.id : request.command.id;
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
  readonly workspace: StudioWorkspaceReadModel;
  readonly viewportCamera: StudioViewportCameraReadModel;
  readonly viewportTool: StudioViewportToolReadModel;
  readonly preferences: StudioPreferencesReadModel;
  readonly savedAtIso?: string;
}): string {
  const artifact: StudioWorkspaceArtifact = {
    schemaVersion: 1,
    artifactKind: 'studio_workspace',
    artifactId: `studio-workspace:${options.workspace.workspaceId}`,
    workspaceVersion: 'studio-workspace.v0',
    savedAtIso: options.savedAtIso ?? '1970-01-01T00:00:00.000Z',
    workspace: options.workspace,
    viewportCamera: options.viewportCamera,
    viewportTool: options.viewportTool,
    preferences: options.preferences,
    flatSceneDocument: options.workspace.flatSceneDocument,
    serializationNotes: [
      'Studio workspace artifact preserves browser read models and ASHA flat-scene-shaped export data.',
      'Runtime-authority serialization remains gated behind the approved public runtime bridge.',
    ],
  };

  return `${stableJson(artifact)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hydrateStudioWorkspaceReadModel(
  workspace: StudioWorkspaceReadModel,
): StudioWorkspaceReadModel {
  const flatSceneDocument = workspace.flatSceneDocument ?? createStudioFlatSceneDocument(workspace.scene);
  const sceneObjectSnapshot =
    workspace.sceneObjectSnapshot ?? buildStudioSceneObjectSnapshot(workspace.scene, flatSceneDocument);
  const selectedEntityId =
    workspace.selectedEntityId === null
      ? null
      : sceneObjectSnapshot.objects.some(object => object.objectId === workspace.selectedEntityId)
        ? workspace.selectedEntityId
        : selectedObjectIdForRenderable(sceneObjectSnapshot, workspace.scene.selectedRenderableId);
  return {
    ...workspace,
    flatSceneDocument,
    sceneObjectSnapshot,
    entities: projectEntitiesFromScene(
      workspace.session,
      workspace.scene,
      sceneObjectSnapshot,
      workspace.entities,
    ),
    selectedEntityId,
  };
}

export function restoreStudioWorkspaceArtifact(text: string): StudioWorkspaceRestoreResult {
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
          'Saved Studio workspace artifact is not valid JSON.',
          'studio_workspace',
          'Save the workspace again before loading.',
        ),
      ],
    };
  }

  if (
    !isRecord(parsed)
    || parsed['schemaVersion'] !== 1
    || parsed['artifactKind'] !== 'studio_workspace'
    || parsed['workspaceVersion'] !== 'studio-workspace.v0'
    || !isRecord(parsed['workspace'])
    || !isRecord(parsed['viewportCamera'])
    || !isRecord(parsed['viewportTool'])
    || !isRecord(parsed['preferences'])
  ) {
    return {
      ok: false,
      artifact: null,
      diagnostics: [
        diagnostic(
          'error',
          'workspace_artifact_shape_mismatch',
          'Saved Studio workspace artifact does not match studio-workspace.v0.',
          'studio_workspace',
          'Load a matching Studio workspace artifact.',
        ),
      ],
    };
  }

  const artifact = parsed as unknown as StudioWorkspaceArtifact;
  return {
    ok: true,
    artifact: {
      ...artifact,
      workspace: hydrateStudioWorkspaceReadModel(artifact.workspace),
      flatSceneDocument: artifact.flatSceneDocument ?? createStudioFlatSceneDocument(artifact.workspace.scene),
    },
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
