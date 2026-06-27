export type StudioActorKind = 'gui' | 'agent' | 'script';
export type StudioWorkspaceStatus = 'not_started' | 'ready' | 'degraded';
export type StudioCommandStatus = 'ok' | 'rejected' | 'failed';
export type StudioEntitySourceState = 'authoritative' | 'reference' | 'pending';
export type StudioRenderableKind = 'voxel_grid' | 'voxel_cell' | 'static_mesh' | 'preview_ghost';
export type StudioEntityKind = StudioRenderableKind | 'session' | 'scene' | 'collection';
export type StudioDiagnosticSeverity = 'info' | 'warning' | 'error';
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

export interface StudioDiagnostic {
  readonly severity: StudioDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly source: string | null;
  readonly remediation: string | null;
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
  readonly commandTimeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResultReadModel[];
  readonly readbackMarker: string;
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly knownLimitations: readonly string[];
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

export interface NoopIntent {
  readonly kind: 'noop';
  readonly reason: string;
}

export type StudioIntent = SelectEntityIntent | NoopIntent;

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

function buildSceneHash(renderables: readonly StudioSceneRenderableReadModel[]): string {
  const hashPayload = renderables.map(renderable => ({
    renderableId: renderable.renderableId,
    sourceState: renderable.sourceState,
    bounds: renderable.bounds,
    renderHash: renderable.renderHash,
  }));
  return fnv1aHash('scene-view', hashPayload);
}

function sequenceId(index: number): string {
  return `seq-${String(index + 1).padStart(4, '0')}`;
}

function createTimelineEntry(options: {
  readonly index: number;
  readonly commandId: string;
  readonly label: string;
  readonly requestedBy: StudioActorKind;
  readonly inputSummary: string;
  readonly outputSummary: string;
  readonly changedScene: boolean;
  readonly changedSelection: boolean;
}): {
  readonly timelineEntry: StudioCommandTimelineEntry;
  readonly commandResult: StudioCommandResultReadModel;
} {
  const sequence = sequenceId(options.index);
  const status: StudioCommandStatus = 'ok';

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

function projectEntitiesFromScene(
  session: StudioSessionReadModel,
  scene: StudioSceneReadModel,
): readonly StudioEntityReadModel[] {
  const renderableRows = scene.renderables.map(renderable => ({
    id: renderable.renderableId,
    label: renderable.label,
    kind: renderable.kind,
    sourceState: renderable.sourceState,
    badge: badgeForRenderable(renderable, renderable.renderableId === scene.selectedRenderableId),
    depth: 2,
    expanded: false,
    selectable: true,
    selected: renderable.renderableId === scene.selectedRenderableId,
    renderableId: renderable.renderableId,
  }));

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
    },
    ...renderableRows.filter(entity => entity.kind !== 'static_mesh'),
    {
      id: 'collection:referenced-assets',
      label: 'Referenced Assets',
      kind: 'collection',
      sourceState: 'reference',
      badge: 'projected',
      depth: 1,
      expanded: true,
      selectable: false,
      selected: false,
      renderableId: null,
    },
    ...renderableRows.filter(entity => entity.kind === 'static_mesh'),
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
}): readonly StudioEntityProjectionDiagnostic[] {
  if (!input.commandPresent) {
    return [{
      code: 'missing_selection_command',
      severity: 'error',
      message: 'No selection.set_active_entity command result is recorded in the shared timeline.',
    }];
  }
  if (
    input.commandEntityId === null
    || input.viewportSelectedRenderableId === null
    || input.commandEntityId !== input.viewportSelectedRenderableId
    || !input.commandSelected
    || !input.selectableEntityIds.includes(input.viewportSelectedRenderableId)
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
    entities: projectEntitiesFromScene(session, scene),
    selectedEntityId: selectedRenderableId,
    timeline: timelineState.timeline,
    commandResults: timelineState.commandResults,
    timelineSequence: timelineState.timeline.length,
  };
}

export function createStudioAgentReadout(
  readModel: StudioWorkspaceReadModel,
  options: {
    readonly generatedAtIso?: string;
    readonly compatibility?: StudioCompatibilityEvidence;
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
    commandTimeline: readModel.timeline,
    commandResults: readModel.commandResults,
    readbackMarker: `${readModel.session.sessionId}:${readModel.scene.sceneHash}:${readModel.timelineSequence}`,
    diagnostics,
    knownLimitations: options.knownLimitations ?? [
      'Current Angular base is a browser reference projection; native runtime authority, hardware GPU evidence, and Agora compositor capture remain gated behind later proof slices.',
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
  const selectedEntityExists = readModel.entities.some(
    entity => entity.id === entityId && entity.selectable,
  );

  if (!selectedEntityExists) {
    return readModel;
  }

  const scene: StudioSceneReadModel = {
    ...readModel.scene,
    selectedRenderableId: entityId,
  };
  const entities = projectEntitiesFromScene(readModel.session, scene);
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
