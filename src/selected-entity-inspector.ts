import type { StudioEntityBrowserModel } from './entity-browser';
import type { StudioCommandResult, StudioCommandTimelineEntry } from './session-workspace';
import type { StudioSceneViewModel, StudioSceneViewRenderable, StudioSceneViewRenderableKind, StudioSceneViewSourceState, StudioSceneViewTransform } from './scene-view-model';

export type StudioSelectedEntityInspectorReadiness = 'ready' | 'failed_closed';
export type StudioInspectorDiagnosticCode =
  | 'missing_selected_entity'
  | 'inspector_readback_drift'
  | 'stale_inspector_state'
  | 'unsupported_field_edit'
  | 'edit_command_mismatch'
  | 'missing_edit_command';

/** Fields the inspector edits through a typed command. Everything else is read-only readback. */
export const EDITABLE_FIELD_KEYS = ['name'] as const;
export type StudioInspectorEditableFieldKey = (typeof EDITABLE_FIELD_KEYS)[number];

/** Fields the inspector is allowed to project from public scene-view readback. */
export const SUPPORTED_FIELD_KEYS = [
  'entityId',
  'kind',
  'sourceState',
  'name',
  'meshRef',
  'materialRef',
  'badges',
  'translation',
  'rotationQuat',
  'scale',
  'authorityObjectId',
  'selectionHash',
] as const;
export type StudioInspectorFieldKey = (typeof SUPPORTED_FIELD_KEYS)[number];

export interface StudioInspectorField {
  readonly key: StudioInspectorFieldKey;
  readonly label: string;
  readonly value: string;
  readonly editable: boolean;
  readonly supported: boolean;
  readonly commandId: 'entity.set_name' | null;
  readonly source: string;
}

export interface StudioSelectedEntityIdentity {
  readonly entityId: string;
  readonly kind: StudioSceneViewRenderableKind;
  readonly displayName: string;
  readonly defaultLabel: string;
  readonly sourceState: StudioSceneViewSourceState;
  readonly authorityObjectId: string | null;
  readonly selectionHash: string;
}

export interface StudioSelectedEntityProvenance {
  readonly meshRef: string | null;
  readonly materialRef: string | number | null;
  readonly badges: readonly string[];
  readonly evidenceSource: string;
  readonly selectionCommandId: 'selection.set_active_entity';
  readonly selectionSequenceId: string | null;
}

export interface StudioSelectedEntityInspectorEdit {
  readonly fieldKey: StudioInspectorEditableFieldKey;
  readonly commandId: 'entity.set_name';
  readonly entityId: string;
  readonly renderableId: string;
  readonly nameBefore: string;
  readonly nameAfter: string;
  readonly nameHash: string;
  readonly applied: boolean;
  readonly inSync: boolean;
  readonly sequenceId: string | null;
  readonly actor: 'gui' | 'agent' | null;
  readonly summary: string;
}

export interface StudioInspectorDiagnostic {
  readonly code: StudioInspectorDiagnosticCode;
  readonly severity: 'error';
  readonly message: string;
}

export interface StudioInspectorNegativeSmoke {
  readonly id: string;
  readonly code: StudioInspectorDiagnosticCode;
  readonly scenario: string;
  readonly expectedOutcome: 'failed_closed';
  readonly actualOutcome: StudioSelectedEntityInspectorReadiness;
  readonly diagnosticCodes: readonly StudioInspectorDiagnosticCode[];
}

export interface StudioSelectedEntityInspectorModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'selected_entity_inspector';
  readonly automationLabel: 'studio-selected-entity-inspector-dock';
  readonly title: 'Selected Entity Inspector';
  readonly readiness: StudioSelectedEntityInspectorReadiness;
  readonly projectionMode: 'scene_view_selected_entity_projection';
  readonly sceneId: string;
  readonly selectedEntityId: string;
  readonly identity: StudioSelectedEntityIdentity;
  readonly provenance: StudioSelectedEntityProvenance;
  readonly transform: StudioSceneViewTransform;
  readonly fields: readonly StudioInspectorField[];
  readonly edit: StudioSelectedEntityInspectorEdit;
  readonly inspectorHash: string;
  readonly diagnostics: readonly StudioInspectorDiagnostic[];
  readonly negativeSmokes: readonly StudioInspectorNegativeSmoke[];
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

export function computeInspectorHash(input: {
  readonly entityId: string;
  readonly displayName: string;
  readonly sourceState: string;
  readonly transform: StudioSceneViewTransform;
  readonly fieldKeys: readonly string[];
}): string {
  return fnv1aHash('selected-entity-inspector', {
    entityId: input.entityId,
    displayName: input.displayName,
    sourceState: input.sourceState,
    transform: input.transform,
    fieldKeys: [...input.fieldKeys].sort(),
  });
}

/**
 * List/projection-level validation for the selected entity inspector. Fails closed on a missing
 * selected entity, a projection that drifted from the shared viewport selection, a stale inspector
 * hash, or any projected field outside the supported readback allowlist.
 */
export function validateSelectedEntityInspector(input: {
  readonly selectedEntityId: string;
  readonly sceneRenderableIds: readonly string[];
  readonly viewportSelectedRenderableId: string;
  readonly recordedHash: string;
  readonly recomputedHash: string;
  readonly fieldKeys: readonly string[];
}): readonly StudioInspectorDiagnostic[] {
  const diagnostics: StudioInspectorDiagnostic[] = [];
  if (!input.sceneRenderableIds.includes(input.selectedEntityId)) {
    diagnostics.push({ code: 'missing_selected_entity', severity: 'error', message: `Selected entity ${input.selectedEntityId} is absent from the scene-view renderable readback.` });
  }
  if (input.selectedEntityId !== input.viewportSelectedRenderableId) {
    diagnostics.push({ code: 'inspector_readback_drift', severity: 'error', message: `Inspector selected entity ${input.selectedEntityId} does not match the shared viewport selected renderable ${input.viewportSelectedRenderableId}.` });
  }
  if (input.recordedHash !== input.recomputedHash) {
    diagnostics.push({ code: 'stale_inspector_state', severity: 'error', message: 'Recorded inspector hash does not match the recomputed scene-view selected-entity projection.' });
  }
  const supported = new Set<string>(SUPPORTED_FIELD_KEYS);
  for (const key of input.fieldKeys) {
    if (!supported.has(key)) {
      diagnostics.push({ code: 'unsupported_field_edit', severity: 'error', message: `Inspector field ${key} is outside the supported scene-view readback allowlist.` });
    }
  }
  return diagnostics;
}

/**
 * Validates that the recorded `entity.set_name` command result actually renamed the inspected
 * entity to the name the inspector reports. Fails closed on a missing command, an edit targeting a
 * non-editable field, or a command whose entity/renderable/name does not match the inspector edit.
 */
export function validateInspectorEdit(input: {
  readonly fieldKey: string;
  readonly commandPresent: boolean;
  readonly commandEntityId: string | null;
  readonly commandRenderableId: string | null;
  readonly commandName: string | null;
  readonly commandApplied: boolean;
  readonly recordedNameAfter: string;
  readonly viewportSelectedRenderableId: string;
}): readonly StudioInspectorDiagnostic[] {
  const editable = new Set<string>(EDITABLE_FIELD_KEYS);
  if (!editable.has(input.fieldKey)) {
    return [{ code: 'unsupported_field_edit', severity: 'error', message: `Inspector edit targets non-editable field ${input.fieldKey}; only ${[...EDITABLE_FIELD_KEYS].join(', ')} can be edited through a typed command.` }];
  }
  if (!input.commandPresent) {
    return [{ code: 'missing_edit_command', severity: 'error', message: 'No entity.set_name command result recorded in the shared timeline for the inspector edit.' }];
  }
  if (
    input.commandEntityId !== input.viewportSelectedRenderableId
    || input.commandRenderableId !== input.viewportSelectedRenderableId
    || input.commandName !== input.recordedNameAfter
    || !input.commandApplied
  ) {
    const message = `entity.set_name renamed ${input.commandEntityId ?? 'null'}/${input.commandRenderableId ?? 'null'} to ${input.commandName ?? 'null'} (applied=${input.commandApplied}) but the inspector edit is ${input.recordedNameAfter} on ${input.viewportSelectedRenderableId}.`;
    return [{ code: 'edit_command_mismatch', severity: 'error', message }];
  }
  return [];
}

function valueForField(key: StudioInspectorFieldKey, args: {
  readonly identity: StudioSelectedEntityIdentity;
  readonly provenance: StudioSelectedEntityProvenance;
  readonly transform: StudioSceneViewTransform;
}): string {
  switch (key) {
    case 'entityId':
      return args.identity.entityId;
    case 'kind':
      return args.identity.kind;
    case 'sourceState':
      return args.identity.sourceState;
    case 'name':
      return args.identity.displayName;
    case 'meshRef':
      return args.provenance.meshRef ?? '(none)';
    case 'materialRef':
      return args.provenance.materialRef === null ? '(none)' : String(args.provenance.materialRef);
    case 'badges':
      return args.provenance.badges.length === 0 ? '(none)' : args.provenance.badges.join(', ');
    case 'translation':
      return `[${args.transform.translation.x}, ${args.transform.translation.y}, ${args.transform.translation.z}]`;
    case 'rotationQuat':
      return `[${args.transform.rotationQuat.join(', ')}]`;
    case 'scale':
      return `[${args.transform.scale.x}, ${args.transform.scale.y}, ${args.transform.scale.z}]`;
    case 'authorityObjectId':
      return args.identity.authorityObjectId ?? '(none)';
    case 'selectionHash':
      return args.identity.selectionHash;
  }
}

function negativeSmokes(args: {
  readonly selectedEntityId: string;
  readonly sceneRenderableIds: readonly string[];
  readonly viewportSelectedRenderableId: string;
  readonly inspectorHash: string;
  readonly recordedNameAfter: string;
}): readonly StudioInspectorNegativeSmoke[] {
  const baseFieldKeys = [...SUPPORTED_FIELD_KEYS];
  const smokes: StudioInspectorNegativeSmoke[] = [];

  const missingDiags = validateSelectedEntityInspector({
    selectedEntityId: 'entity:does-not-exist',
    sceneRenderableIds: args.sceneRenderableIds,
    viewportSelectedRenderableId: 'entity:does-not-exist',
    recordedHash: args.inspectorHash,
    recomputedHash: args.inspectorHash,
    fieldKeys: baseFieldKeys,
  });
  smokes.push({ id: 'negative:missing-selected-entity', code: 'missing_selected_entity', scenario: 'Inspector points at an entity id absent from the scene-view readback.', expectedOutcome: 'failed_closed', actualOutcome: missingDiags.some((d) => d.code === 'missing_selected_entity') ? 'failed_closed' : 'ready', diagnosticCodes: missingDiags.map((d) => d.code) });

  const driftDiags = validateSelectedEntityInspector({
    selectedEntityId: args.selectedEntityId,
    sceneRenderableIds: args.sceneRenderableIds,
    viewportSelectedRenderableId: 'scene-asset:mesh/demo-crate:1',
    recordedHash: args.inspectorHash,
    recomputedHash: args.inspectorHash,
    fieldKeys: baseFieldKeys,
  });
  smokes.push({ id: 'negative:inspector-readback-drift', code: 'inspector_readback_drift', scenario: 'Inspector projection drifts from the shared viewport selected renderable.', expectedOutcome: 'failed_closed', actualOutcome: driftDiags.some((d) => d.code === 'inspector_readback_drift') ? 'failed_closed' : 'ready', diagnosticCodes: driftDiags.map((d) => d.code) });

  const staleDiags = validateSelectedEntityInspector({
    selectedEntityId: args.selectedEntityId,
    sceneRenderableIds: args.sceneRenderableIds,
    viewportSelectedRenderableId: args.viewportSelectedRenderableId,
    recordedHash: 'selected-entity-inspector-stale',
    recomputedHash: args.inspectorHash,
    fieldKeys: baseFieldKeys,
  });
  smokes.push({ id: 'negative:stale-inspector-state', code: 'stale_inspector_state', scenario: 'Recorded inspector hash no longer matches the recomputed selected-entity projection.', expectedOutcome: 'failed_closed', actualOutcome: staleDiags.some((d) => d.code === 'stale_inspector_state') ? 'failed_closed' : 'ready', diagnosticCodes: staleDiags.map((d) => d.code) });

  const unsupportedDiags = validateInspectorEdit({
    fieldKey: 'authorityObjectId',
    commandPresent: true,
    commandEntityId: args.selectedEntityId,
    commandRenderableId: args.selectedEntityId,
    commandName: args.recordedNameAfter,
    commandApplied: true,
    recordedNameAfter: args.recordedNameAfter,
    viewportSelectedRenderableId: args.viewportSelectedRenderableId,
  });
  smokes.push({ id: 'negative:unsupported-field-edit', code: 'unsupported_field_edit', scenario: 'An edit targets a non-editable field (authorityObjectId) instead of the typed name command.', expectedOutcome: 'failed_closed', actualOutcome: unsupportedDiags.some((d) => d.code === 'unsupported_field_edit') ? 'failed_closed' : 'ready', diagnosticCodes: unsupportedDiags.map((d) => d.code) });

  const mismatchDiags = validateInspectorEdit({
    fieldKey: 'name',
    commandPresent: true,
    commandEntityId: 'scene-asset:mesh/demo-crate:1',
    commandRenderableId: 'scene-asset:mesh/demo-crate:1',
    commandName: 'Some other name',
    commandApplied: true,
    recordedNameAfter: args.recordedNameAfter,
    viewportSelectedRenderableId: args.viewportSelectedRenderableId,
  });
  smokes.push({ id: 'negative:edit-command-mismatch', code: 'edit_command_mismatch', scenario: 'An entity.set_name command renamed a different entity/name than the inspector edit.', expectedOutcome: 'failed_closed', actualOutcome: mismatchDiags.some((d) => d.code === 'edit_command_mismatch') ? 'failed_closed' : 'ready', diagnosticCodes: mismatchDiags.map((d) => d.code) });

  return smokes;
}

export function createStudioSelectedEntityInspectorModel(options: {
  readonly sceneView: StudioSceneViewModel;
  readonly entityBrowser: StudioEntityBrowserModel;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResult[];
}): StudioSelectedEntityInspectorModel {
  const { sceneView, entityBrowser, timeline, commandResults } = options;
  const selectedRenderableId = sceneView.selection.selectedRenderableId;
  const sceneRenderableIds = sceneView.renderables.map((renderable) => renderable.renderableId);
  const renderable: StudioSceneViewRenderable | undefined = sceneView.renderables.find((entry) => entry.renderableId === selectedRenderableId);
  const entityNode = entityBrowser.entities.find((entity) => entity.entityId === selectedRenderableId) ?? null;
  const selectEntry = timeline.find((entry) => entry.commandId === 'selection.set_active_entity') ?? null;

  const renameResult = commandResults.find((result) => result.commandId === 'entity.set_name') ?? null;
  const renameOutput = renameResult !== null && renameResult.output !== null && 'name' in renameResult.output ? renameResult.output : null;
  const renameEntry = timeline.find((entry) => entry.commandId === 'entity.set_name') ?? null;

  const defaultLabel = entityNode?.label ?? renderable?.summary ?? selectedRenderableId;
  const nameBefore = defaultLabel;
  const nameAfter = renameOutput?.name ?? nameBefore;
  const applied = renameOutput?.applied ?? false;
  const displayName = applied ? nameAfter : nameBefore;

  const identity: StudioSelectedEntityIdentity = {
    entityId: selectedRenderableId,
    kind: renderable?.kind ?? 'voxel_cell',
    displayName,
    defaultLabel,
    sourceState: renderable?.sourceState ?? 'authoritative_rust_state',
    authorityObjectId: renderable?.authorityObjectId ?? null,
    selectionHash: entityBrowser.selection.selectionHash,
  };
  const provenance: StudioSelectedEntityProvenance = {
    meshRef: renderable?.meshRef ?? null,
    materialRef: renderable?.materialRef ?? null,
    badges: entityNode?.badges ?? [],
    evidenceSource: 'StudioSceneViewModel.renderables + StudioEntityBrowserModel',
    selectionCommandId: 'selection.set_active_entity',
    selectionSequenceId: selectEntry?.sequenceId ?? null,
  };
  const transform: StudioSceneViewTransform = renderable?.transform ?? { translation: { x: 0, y: 0, z: 0 }, rotationQuat: [0, 0, 0, 1], scale: { x: 1, y: 1, z: 1 } };

  const fieldArgs = { identity, provenance, transform };
  const fields: StudioInspectorField[] = SUPPORTED_FIELD_KEYS.map((key): StudioInspectorField => {
    const editable = (EDITABLE_FIELD_KEYS as readonly string[]).includes(key);
    return {
      key,
      label: key,
      value: valueForField(key, fieldArgs),
      editable,
      supported: true,
      commandId: editable ? 'entity.set_name' : null,
      source: editable ? 'entity.set_name command result' : 'StudioSceneViewModel readback',
    };
  });
  const fieldKeys = fields.map((entry) => entry.key);

  const inspectorHash = computeInspectorHash({ entityId: selectedRenderableId, displayName, sourceState: identity.sourceState, transform, fieldKeys });

  const editDiagnostics = validateInspectorEdit({
    fieldKey: 'name',
    commandPresent: renameOutput !== null,
    commandEntityId: renameOutput?.entityId ?? null,
    commandRenderableId: renameOutput?.renderableId ?? null,
    commandName: renameOutput?.name ?? null,
    commandApplied: applied,
    recordedNameAfter: nameAfter,
    viewportSelectedRenderableId: selectedRenderableId,
  });
  const editInSync = editDiagnostics.length === 0;
  const edit: StudioSelectedEntityInspectorEdit = {
    fieldKey: 'name',
    commandId: 'entity.set_name',
    entityId: selectedRenderableId,
    renderableId: renameOutput?.renderableId ?? selectedRenderableId,
    nameBefore,
    nameAfter,
    nameHash: renameOutput?.nameHash ?? 'name-hash-unavailable',
    applied,
    inSync: editInSync,
    sequenceId: renameEntry?.sequenceId ?? null,
    actor: renameEntry?.requestedBy === 'agent' ? 'agent' : renameEntry?.requestedBy === 'gui' ? 'gui' : null,
    summary: renameOutput === null
      ? 'No entity.set_name command result recorded; inspector name edit is not synced.'
      : `Inspector renamed ${selectedRenderableId} "${nameBefore}" → "${nameAfter}" via ${renameEntry?.sequenceId ?? 'unknown'}; applied ${applied}; inSync ${editInSync}.`,
  };

  const diagnostics = [
    ...validateSelectedEntityInspector({
      selectedEntityId: selectedRenderableId,
      sceneRenderableIds,
      viewportSelectedRenderableId: selectedRenderableId,
      recordedHash: inspectorHash,
      recomputedHash: inspectorHash,
      fieldKeys,
    }),
    ...editDiagnostics,
  ];
  const negatives = negativeSmokes({
    selectedEntityId: selectedRenderableId,
    sceneRenderableIds,
    viewportSelectedRenderableId: selectedRenderableId,
    inspectorHash,
    recordedNameAfter: nameAfter,
  });
  const negativesFailClosed = negatives.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.diagnosticCodes.includes(smoke.code));
  const readiness: StudioSelectedEntityInspectorReadiness = diagnostics.length === 0 && applied && negativesFailClosed ? 'ready' : 'failed_closed';

  return {
    schemaVersion: 1,
    artifactKind: 'selected_entity_inspector',
    automationLabel: 'studio-selected-entity-inspector-dock',
    title: 'Selected Entity Inspector',
    readiness,
    projectionMode: 'scene_view_selected_entity_projection',
    sceneId: sceneView.sceneId,
    selectedEntityId: selectedRenderableId,
    identity,
    provenance,
    transform,
    fields,
    edit,
    inspectorHash,
    diagnostics,
    negativeSmokes: negatives,
    automationMarkers: [
      'studio-selected-entity-inspector-dock',
      'selected-entity-inspector-identity-readout',
      'selected-entity-inspector-fields-readout',
      'selected-entity-inspector-edit-readout',
      'selected-entity-inspector-diagnostics-readout',
      'entity.set_name',
    ],
    knownLimitations: [
      'Selected entity inspector is a deterministic projection of StudioSceneViewModel/entity-browser readback, not a private ECS component store.',
      'Only the name field is editable in this slice; the edit flows through the public entity.set_name command and the shared timeline, not a private UI-only mutation callback.',
      'Transform/material/provenance fields are read-only browser/reference readback; authoritative transform/material edits remain deferred behind the runtime-bridge readiness gate.',
    ],
  };
}
