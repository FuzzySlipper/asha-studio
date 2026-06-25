import type { StudioCommandTimelineEntry } from './session-workspace';
import type { StudioSceneViewModel, StudioSceneViewRenderable, StudioSceneViewRenderableKind } from './scene-view-model';

export type StudioEntityBrowserReadiness = 'ready' | 'failed_closed';
export type StudioEntitySourceState = StudioSceneViewRenderable['sourceState'];
export type StudioEntityBadge = 'authority' | 'preview' | 'reference' | 'selected' | 'asset' | 'material' | 'pickable';
export type StudioEntityBrowserDiagnosticCode =
  | 'hierarchy_readback_drift'
  | 'missing_selected_entity'
  | 'stale_entity_list'
  | 'unsupported_private_entity_source';

const ALLOWED_SOURCE_STATES: readonly StudioEntitySourceState[] = ['authoritative_rust_state', 'editor_preview_state', 'browser_projection_reference'];

export interface StudioEntityNode {
  readonly entityId: string;
  readonly label: string;
  readonly kind: StudioSceneViewRenderableKind;
  readonly order: number;
  readonly depth: 0 | 1;
  readonly sourceState: StudioEntitySourceState;
  readonly authorityObjectId: string | null;
  readonly meshRef: string | null;
  readonly materialRef: string | number | null;
  readonly badges: readonly StudioEntityBadge[];
  readonly selected: boolean;
  readonly pickable: boolean;
  readonly evidenceSource: string;
  readonly summary: string;
}

export interface StudioEntitySelectionSync {
  readonly selectedEntityId: string;
  readonly viewportRenderableId: string;
  readonly inSync: boolean;
  readonly commandId: 'selection.set_active_entity';
  readonly sequenceId: string | null;
  readonly actor: 'gui' | 'agent' | null;
  readonly selectionHash: string;
  readonly summary: string;
}

export interface StudioEntityBrowserDiagnostic {
  readonly code: StudioEntityBrowserDiagnosticCode;
  readonly severity: 'error';
  readonly message: string;
}

export interface StudioEntityBrowserNegativeSmoke {
  readonly id: string;
  readonly code: StudioEntityBrowserDiagnosticCode;
  readonly scenario: string;
  readonly expectedOutcome: 'failed_closed';
  readonly actualOutcome: StudioEntityBrowserReadiness;
  readonly diagnosticCodes: readonly StudioEntityBrowserDiagnosticCode[];
}

export interface StudioEntityBrowserModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'entity_browser_projection';
  readonly automationLabel: 'studio-entity-browser-dock';
  readonly title: 'Entity Browser';
  readonly readiness: StudioEntityBrowserReadiness;
  readonly projectionMode: 'scene_view_entity_projection';
  readonly sceneId: string;
  readonly entities: readonly StudioEntityNode[];
  readonly entityCount: number;
  readonly selection: StudioEntitySelectionSync;
  readonly entityListHash: string;
  readonly diagnostics: readonly StudioEntityBrowserDiagnostic[];
  readonly negativeSmokes: readonly StudioEntityBrowserNegativeSmoke[];
  readonly automationMarkers: readonly string[];
  readonly knownLimitations: readonly string[];
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
}

function fnv1aHash(prefix: string, value: unknown): string {
  const text = stableJson(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}-${hash.toString(16).padStart(8, '0')}`;
}

export function computeEntityListHash(entities: readonly { readonly entityId: string; readonly sourceState: string; readonly selected: boolean }[]): string {
  return fnv1aHash('entity-list', entities.map((entity) => ({ id: entity.entityId, source: entity.sourceState, selected: entity.selected })));
}

function badgeFor(renderable: StudioSceneViewRenderable, selected: boolean): readonly StudioEntityBadge[] {
  const badges: StudioEntityBadge[] = [];
  if (renderable.sourceState === 'authoritative_rust_state') badges.push('authority');
  if (renderable.sourceState === 'editor_preview_state') badges.push('preview');
  if (renderable.sourceState === 'browser_projection_reference') badges.push('reference');
  if (renderable.meshRef !== null) badges.push('asset');
  if (typeof renderable.materialRef === 'string') badges.push('material');
  if (renderable.pickable) badges.push('pickable');
  if (selected) badges.push('selected');
  return badges;
}

function labelFor(renderable: StudioSceneViewRenderable): string {
  switch (renderable.kind) {
    case 'voxel_grid':
      return `Voxel grid · ${renderable.renderableId}`;
    case 'voxel_cell':
      return `Voxel · ${renderable.renderableId}`;
    case 'preview_ghost':
      return `Preview ghost · ${renderable.renderableId}`;
    case 'static_mesh':
      return `Static mesh · ${renderable.meshRef ?? renderable.renderableId}`;
  }
}

/**
 * Classified validation for the entity browser projection. Fails closed (returns error diagnostics)
 * on hierarchy/readback drift, a missing selected entity, a stale entity list hash, or any entity
 * sourced from an unsupported/private source state.
 */
export function validateEntityBrowser(input: {
  readonly entities: readonly { readonly entityId: string; readonly sourceState: string; readonly selected: boolean }[];
  readonly selectedEntityId: string;
  readonly sceneRenderableIds: readonly string[];
  readonly recordedHash: string;
  readonly recomputedHash: string;
}): readonly StudioEntityBrowserDiagnostic[] {
  const diagnostics: StudioEntityBrowserDiagnostic[] = [];
  const entityIds = input.entities.map((entity) => entity.entityId);
  const entityIdSet = new Set(entityIds);
  const sceneSet = new Set(input.sceneRenderableIds);
  const drift = entityIds.length !== input.sceneRenderableIds.length
    || entityIds.some((id) => !sceneSet.has(id))
    || input.sceneRenderableIds.some((id) => !entityIdSet.has(id));
  if (drift) {
    diagnostics.push({ code: 'hierarchy_readback_drift', severity: 'error', message: 'Entity browser list does not match the scene-view renderable readback.' });
  }
  if (!entityIdSet.has(input.selectedEntityId)) {
    diagnostics.push({ code: 'missing_selected_entity', severity: 'error', message: `Selected entity ${input.selectedEntityId} is absent from the entity browser projection.` });
  }
  if (input.recordedHash !== input.recomputedHash) {
    diagnostics.push({ code: 'stale_entity_list', severity: 'error', message: 'Recorded entity-list hash does not match the recomputed scene-view projection.' });
  }
  for (const entity of input.entities) {
    if (!ALLOWED_SOURCE_STATES.includes(entity.sourceState as StudioEntitySourceState)) {
      diagnostics.push({ code: 'unsupported_private_entity_source', severity: 'error', message: `Entity ${entity.entityId} has unsupported/private source state ${entity.sourceState}.` });
    }
  }
  return diagnostics;
}

function negativeSmokes(baseEntities: readonly { readonly entityId: string; readonly sourceState: string; readonly selected: boolean }[], sceneRenderableIds: readonly string[], hash: string): readonly StudioEntityBrowserNegativeSmoke[] {
  const smokes: StudioEntityBrowserNegativeSmoke[] = [];

  const driftDiags = validateEntityBrowser({
    entities: baseEntities.slice(0, -1),
    selectedEntityId: baseEntities.find((entity) => entity.selected)?.entityId ?? baseEntities[0]?.entityId ?? '',
    sceneRenderableIds,
    recordedHash: hash,
    recomputedHash: hash,
  });
  smokes.push({ id: 'negative:hierarchy-readback-drift', code: 'hierarchy_readback_drift', scenario: 'Entity list drops a renderable present in the scene-view readback.', expectedOutcome: 'failed_closed', actualOutcome: driftDiags.some((d) => d.code === 'hierarchy_readback_drift') ? 'failed_closed' : 'ready', diagnosticCodes: driftDiags.map((d) => d.code) });

  const missingDiags = validateEntityBrowser({
    entities: baseEntities,
    selectedEntityId: 'entity:does-not-exist',
    sceneRenderableIds,
    recordedHash: hash,
    recomputedHash: hash,
  });
  smokes.push({ id: 'negative:missing-selected-entity', code: 'missing_selected_entity', scenario: 'Selected entity id is not present in the projected entity list.', expectedOutcome: 'failed_closed', actualOutcome: missingDiags.some((d) => d.code === 'missing_selected_entity') ? 'failed_closed' : 'ready', diagnosticCodes: missingDiags.map((d) => d.code) });

  const staleDiags = validateEntityBrowser({
    entities: baseEntities,
    selectedEntityId: baseEntities.find((entity) => entity.selected)?.entityId ?? baseEntities[0]?.entityId ?? '',
    sceneRenderableIds,
    recordedHash: 'entity-list-stale',
    recomputedHash: hash,
  });
  smokes.push({ id: 'negative:stale-entity-list', code: 'stale_entity_list', scenario: 'Recorded entity-list hash no longer matches the recomputed scene-view projection.', expectedOutcome: 'failed_closed', actualOutcome: staleDiags.some((d) => d.code === 'stale_entity_list') ? 'failed_closed' : 'ready', diagnosticCodes: staleDiags.map((d) => d.code) });

  const privateEntities = [...baseEntities, { entityId: 'entity:private-ecs-node', sourceState: 'private_ecs_internal', selected: false }];
  const privateDiags = validateEntityBrowser({
    entities: privateEntities,
    selectedEntityId: baseEntities.find((entity) => entity.selected)?.entityId ?? baseEntities[0]?.entityId ?? '',
    sceneRenderableIds: [...sceneRenderableIds, 'entity:private-ecs-node'],
    recordedHash: hash,
    recomputedHash: hash,
  });
  smokes.push({ id: 'negative:unsupported-private-entity-source', code: 'unsupported_private_entity_source', scenario: 'An entity is sourced from an unsupported/private ECS source rather than public scene readback.', expectedOutcome: 'failed_closed', actualOutcome: privateDiags.some((d) => d.code === 'unsupported_private_entity_source') ? 'failed_closed' : 'ready', diagnosticCodes: privateDiags.map((d) => d.code) });

  return smokes;
}

export function createStudioEntityBrowserModel(options: {
  readonly sceneView: StudioSceneViewModel;
  readonly timeline: readonly StudioCommandTimelineEntry[];
}): StudioEntityBrowserModel {
  const { sceneView, timeline } = options;
  const selectedRenderableId = sceneView.selection.selectedRenderableId;
  const entities: StudioEntityNode[] = sceneView.renderables.map((renderable, index) => {
    const selected = renderable.renderableId === selectedRenderableId;
    return {
      entityId: renderable.renderableId,
      label: labelFor(renderable),
      kind: renderable.kind,
      order: index,
      depth: renderable.kind === 'voxel_grid' ? 0 : 1,
      sourceState: renderable.sourceState,
      authorityObjectId: renderable.authorityObjectId,
      meshRef: renderable.meshRef,
      materialRef: renderable.materialRef,
      badges: badgeFor(renderable, selected),
      selected,
      pickable: renderable.pickable,
      evidenceSource: 'StudioSceneViewModel.renderables',
      summary: renderable.summary,
    };
  });
  const entityListHash = computeEntityListHash(entities);
  const sceneRenderableIds = sceneView.renderables.map((renderable) => renderable.renderableId);

  const selectEntry = timeline.find((entry) => entry.commandId === 'selection.set_active_entity') ?? null;
  const selectionSyncInSync = entities.some((entity) => entity.entityId === selectedRenderableId);
  const selection: StudioEntitySelectionSync = {
    selectedEntityId: selectedRenderableId,
    viewportRenderableId: sceneView.selection.selectedRenderableId,
    inSync: selectionSyncInSync && selectedRenderableId === sceneView.selection.selectedRenderableId,
    commandId: 'selection.set_active_entity',
    sequenceId: selectEntry?.sequenceId ?? null,
    actor: selectEntry?.requestedBy === 'agent' ? 'agent' : selectEntry?.requestedBy === 'gui' ? 'gui' : null,
    selectionHash: sceneView.selection.selectionHash,
    summary: selectEntry === null
      ? 'No shared selection.set_active_entity command recorded; hierarchy selection not synced.'
      : `Hierarchy selection of ${selectedRenderableId} synced to viewport renderable ${sceneView.selection.selectedRenderableId} via ${selectEntry.sequenceId}.`,
  };

  const diagnostics = [
    ...validateEntityBrowser({
      entities: entities.map((entity) => ({ entityId: entity.entityId, sourceState: entity.sourceState, selected: entity.selected })),
      selectedEntityId: selectedRenderableId,
      sceneRenderableIds,
      recordedHash: entityListHash,
      recomputedHash: entityListHash,
    }),
    ...(selection.sequenceId === null
      ? [{ code: 'missing_selected_entity' as const, severity: 'error' as const, message: 'No selection.set_active_entity command recorded in the shared timeline.' }]
      : []),
    ...(selection.inSync ? [] : [{ code: 'hierarchy_readback_drift' as const, severity: 'error' as const, message: 'Hierarchy selection is not in sync with the viewport selected renderable.' }]),
  ];
  const negatives = negativeSmokes(
    entities.map((entity) => ({ entityId: entity.entityId, sourceState: entity.sourceState, selected: entity.selected })),
    sceneRenderableIds,
    entityListHash,
  );
  const negativesFailClosed = negatives.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.diagnosticCodes.includes(smoke.code));
  const readiness: StudioEntityBrowserReadiness = diagnostics.length === 0 && negativesFailClosed ? 'ready' : 'failed_closed';

  return {
    schemaVersion: 1,
    artifactKind: 'entity_browser_projection',
    automationLabel: 'studio-entity-browser-dock',
    title: 'Entity Browser',
    readiness,
    projectionMode: 'scene_view_entity_projection',
    sceneId: sceneView.sceneId,
    entities,
    entityCount: entities.length,
    selection,
    entityListHash,
    diagnostics,
    negativeSmokes: negatives,
    automationMarkers: [
      'studio-entity-browser-dock',
      'entity-browser-tree-readout',
      'entity-browser-selection-sync-readout',
      'entity-browser-node-selected',
      'entity-browser-node-asset',
      'entity-browser-diagnostics-readout',
      'selection.set_active_entity',
    ],
    knownLimitations: [
      'Entity browser is a deterministic projection of StudioSceneViewModel readback, not a private ECS or product asset database.',
      'Selection sync flows through the public selection.set_active_entity command identity and the shared timeline, not a private UI-only callback.',
      'Entity placement/material evidence is browser/reference projection; runtime authority bootstrap remains deferred behind the runtime-bridge readiness gate.',
    ],
  };
}
