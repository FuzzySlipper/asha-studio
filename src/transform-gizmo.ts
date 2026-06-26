import type { StudioCommandResult, StudioCommandTimelineEntry } from './session-workspace';
import type { StudioSceneViewModel, StudioSceneViewRenderable, StudioSceneViewRenderableKind } from './scene-view-model';

export type StudioTransformGizmoReadiness = 'ready' | 'failed_closed';
export type StudioTransformAxis = 'x' | 'y' | 'z';
export type StudioTransformEditMode = 'preview' | 'apply';
export type StudioGizmoDiagnosticCode =
  | 'missing_selected_entity'
  | 'stale_gizmo_selection'
  | 'missing_gizmo_handle'
  | 'transform_readback_mismatch'
  | 'private_mutation_path';

/** The single transform operation supported in this gizmo slice. */
export const SUPPORTED_GIZMO_OPERATION = 'translate' as const;
/** Axes the gizmo exposes handles for; only the active axis is wired to the typed command in this slice. */
export const GIZMO_AXES: readonly StudioTransformAxis[] = ['x', 'y', 'z'];
/** The only source the committed transform is allowed to come from: the public typed command result. */
export const GIZMO_MUTATION_SOURCE = 'transform.translate_entity_command' as const;

export type StudioGizmoMutationSource = typeof GIZMO_MUTATION_SOURCE | 'private_ui_callback';

export type StudioVec3 = readonly [number, number, number];

export interface StudioGizmoHandle {
  readonly axis: StudioTransformAxis;
  readonly visible: boolean;
  readonly active: boolean;
  readonly color: string;
  readonly commandId: 'transform.translate_entity' | null;
  readonly summary: string;
}

export interface StudioGizmoSelection {
  readonly selectedEntityId: string;
  readonly viewportRenderableId: string;
  readonly kind: StudioSceneViewRenderableKind;
  readonly inSync: boolean;
  readonly selectionHash: string;
  readonly gizmoHash: string;
  readonly summary: string;
}

export interface StudioGizmoTransform {
  readonly axis: StudioTransformAxis;
  readonly delta: number;
  readonly before: StudioVec3;
  readonly preview: StudioVec3;
  readonly after: StudioVec3;
}

export interface StudioGizmoEdit {
  readonly commandId: 'transform.translate_entity';
  readonly operation: typeof SUPPORTED_GIZMO_OPERATION;
  readonly axis: StudioTransformAxis;
  readonly delta: number;
  readonly entityId: string;
  readonly renderableId: string;
  readonly translationBefore: StudioVec3;
  readonly translationAfter: StudioVec3;
  readonly transformHash: string;
  readonly previewSequenceId: string | null;
  readonly applySequenceId: string | null;
  readonly previewActor: 'gui' | 'agent' | null;
  readonly applyActor: 'gui' | 'agent' | null;
  readonly mutationSource: StudioGizmoMutationSource;
  readonly applied: boolean;
  readonly inSync: boolean;
  readonly summary: string;
}

export interface StudioGizmoDiagnostic {
  readonly code: StudioGizmoDiagnosticCode;
  readonly severity: 'error';
  readonly message: string;
}

export interface StudioGizmoNegativeSmoke {
  readonly id: string;
  readonly code: StudioGizmoDiagnosticCode;
  readonly scenario: string;
  readonly expectedOutcome: 'failed_closed';
  readonly actualOutcome: StudioTransformGizmoReadiness;
  readonly diagnosticCodes: readonly StudioGizmoDiagnosticCode[];
}

export interface StudioTransformGizmoModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'transform_gizmo';
  readonly automationLabel: 'studio-transform-gizmo-dock';
  readonly title: 'Transform Gizmo';
  readonly readiness: StudioTransformGizmoReadiness;
  readonly projectionMode: 'scene_view_selected_entity_gizmo_projection';
  readonly sceneId: string;
  readonly selectedEntityId: string;
  readonly operation: typeof SUPPORTED_GIZMO_OPERATION;
  readonly activeAxis: StudioTransformAxis;
  readonly selection: StudioGizmoSelection;
  readonly handles: readonly StudioGizmoHandle[];
  readonly transform: StudioGizmoTransform;
  readonly edit: StudioGizmoEdit;
  readonly gizmoHash: string;
  readonly diagnostics: readonly StudioGizmoDiagnostic[];
  readonly negativeSmokes: readonly StudioGizmoNegativeSmoke[];
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

export function computeGizmoHash(input: {
  readonly entityId: string;
  readonly axis: StudioTransformAxis;
  readonly translationBefore: StudioVec3;
  readonly translationAfter: StudioVec3;
  readonly handleAxes: readonly StudioTransformAxis[];
}): string {
  return fnv1aHash('transform-gizmo', {
    entityId: input.entityId,
    axis: input.axis,
    translationBefore: input.translationBefore,
    translationAfter: input.translationAfter,
    handleAxes: [...input.handleAxes].sort(),
  });
}

/**
 * Selection-level validation for the transform gizmo. Fails closed on a selected entity absent from
 * the scene-view readback, a gizmo selection that drifted from the shared viewport selection, or a
 * stale recorded gizmo hash.
 */
export function validateGizmoSelection(input: {
  readonly selectedEntityId: string;
  readonly sceneRenderableIds: readonly string[];
  readonly viewportSelectedRenderableId: string;
  readonly recordedHash: string;
  readonly recomputedHash: string;
}): readonly StudioGizmoDiagnostic[] {
  const diagnostics: StudioGizmoDiagnostic[] = [];
  if (!input.sceneRenderableIds.includes(input.selectedEntityId)) {
    diagnostics.push({ code: 'missing_selected_entity', severity: 'error', message: `Gizmo target ${input.selectedEntityId} is absent from the scene-view renderable readback.` });
  }
  if (input.selectedEntityId !== input.viewportSelectedRenderableId) {
    diagnostics.push({ code: 'stale_gizmo_selection', severity: 'error', message: `Gizmo target ${input.selectedEntityId} no longer matches the shared viewport selected renderable ${input.viewportSelectedRenderableId}.` });
  }
  if (input.recordedHash !== input.recomputedHash) {
    diagnostics.push({ code: 'stale_gizmo_selection', severity: 'error', message: 'Recorded gizmo hash does not match the recomputed selected-entity transform projection.' });
  }
  return diagnostics;
}

/**
 * Fails closed when the gizmo does not expose a visible, command-wired handle for the active axis —
 * i.e. the user/agent would have no manipulable handle for the supported transform.
 */
export function validateGizmoHandles(input: {
  readonly handles: readonly { readonly axis: StudioTransformAxis; readonly visible: boolean; readonly commandId: string | null }[];
  readonly activeAxis: StudioTransformAxis;
}): readonly StudioGizmoDiagnostic[] {
  const activeHandle = input.handles.find((handle) => handle.axis === input.activeAxis && handle.visible && handle.commandId !== null);
  if (activeHandle === undefined) {
    return [{ code: 'missing_gizmo_handle', severity: 'error', message: `No visible command-wired gizmo handle for the active ${input.activeAxis} axis.` }];
  }
  return [];
}

function sameVec3(a: StudioVec3 | null, b: StudioVec3): boolean {
  return a !== null && a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Validates that the committed `transform.translate_entity` apply command actually translated the
 * selected entity from the recorded before-transform to the recorded after-transform the gizmo
 * reports. Fails closed on a missing command result or a command whose entity/renderable/axis/
 * before/after translation does not match the recorded gizmo edit.
 */
export function validateGizmoEdit(input: {
  readonly commandPresent: boolean;
  readonly commandEntityId: string | null;
  readonly commandRenderableId: string | null;
  readonly commandAxis: StudioTransformAxis | null;
  readonly commandApplied: boolean;
  readonly commandTranslationBefore: StudioVec3 | null;
  readonly commandTranslationAfter: StudioVec3 | null;
  readonly recordedAxis: StudioTransformAxis;
  readonly recordedTranslationBefore: StudioVec3;
  readonly recordedTranslationAfter: StudioVec3;
  readonly viewportSelectedRenderableId: string;
}): readonly StudioGizmoDiagnostic[] {
  if (!input.commandPresent || input.commandTranslationAfter === null || input.commandTranslationBefore === null) {
    return [{ code: 'transform_readback_mismatch', severity: 'error', message: 'No applied transform.translate_entity command result recorded in the shared timeline for the gizmo edit.' }];
  }
  if (
    input.commandEntityId !== input.viewportSelectedRenderableId
    || input.commandRenderableId !== input.viewportSelectedRenderableId
    || input.commandAxis !== input.recordedAxis
    || !input.commandApplied
    || !sameVec3(input.commandTranslationBefore, input.recordedTranslationBefore)
    || !sameVec3(input.commandTranslationAfter, input.recordedTranslationAfter)
  ) {
    const message = `transform.translate_entity translated ${input.commandEntityId ?? 'null'}/${input.commandRenderableId ?? 'null'} along ${input.commandAxis ?? 'null'} [${(input.commandTranslationBefore ?? []).join(', ')}] → [${(input.commandTranslationAfter ?? []).join(', ')}] (applied=${input.commandApplied}) but the gizmo edit is ${input.recordedAxis} [${input.recordedTranslationBefore.join(', ')}] → [${input.recordedTranslationAfter.join(', ')}] on ${input.viewportSelectedRenderableId}.`;
    return [{ code: 'transform_readback_mismatch', severity: 'error', message }];
  }
  return [];
}

/**
 * Validates that the editor-local `transform.translate_entity` preview command targets the same
 * selected entity/axis as the apply and previews the expected (before + delta) translation without
 * committing (`applied=false`). Fails closed on a missing/contradictory preview readback.
 */
export function validateGizmoPreview(input: {
  readonly previewPresent: boolean;
  readonly commandEntityId: string | null;
  readonly commandRenderableId: string | null;
  readonly commandAxis: StudioTransformAxis | null;
  readonly commandApplied: boolean | null;
  readonly commandTranslationAfter: StudioVec3 | null;
  readonly recordedAxis: StudioTransformAxis;
  readonly expectedPreviewAfter: StudioVec3;
  readonly viewportSelectedRenderableId: string;
}): readonly StudioGizmoDiagnostic[] {
  if (!input.previewPresent || input.commandTranslationAfter === null) {
    return [{ code: 'transform_readback_mismatch', severity: 'error', message: 'No editor-local transform.translate_entity preview result recorded in the shared timeline for the gizmo edit.' }];
  }
  if (
    input.commandEntityId !== input.viewportSelectedRenderableId
    || input.commandRenderableId !== input.viewportSelectedRenderableId
    || input.commandAxis !== input.recordedAxis
    || input.commandApplied !== false
    || !sameVec3(input.commandTranslationAfter, input.expectedPreviewAfter)
  ) {
    const message = `transform.translate_entity preview targeted ${input.commandEntityId ?? 'null'}/${input.commandRenderableId ?? 'null'} along ${input.commandAxis ?? 'null'} to [${(input.commandTranslationAfter ?? []).join(', ')}] (applied=${input.commandApplied}) but the gizmo expects an editor-local preview of ${input.recordedAxis} → [${input.expectedPreviewAfter.join(', ')}] on ${input.viewportSelectedRenderableId}.`;
    return [{ code: 'transform_readback_mismatch', severity: 'error', message }];
  }
  return [];
}

/**
 * Fails closed when a committed transform did not flow from the public typed command result — i.e.
 * a hidden/private UI-only mutation path applied the transform.
 */
export function validateGizmoMutationSource(input: {
  readonly applied: boolean;
  readonly mutationSource: StudioGizmoMutationSource;
}): readonly StudioGizmoDiagnostic[] {
  if (input.applied && input.mutationSource !== GIZMO_MUTATION_SOURCE) {
    return [{ code: 'private_mutation_path', severity: 'error', message: `Committed gizmo transform came from ${input.mutationSource}, not the public transform.translate_entity command result.` }];
  }
  return [];
}

function negativeSmokes(args: {
  readonly selectedEntityId: string;
  readonly sceneRenderableIds: readonly string[];
  readonly viewportSelectedRenderableId: string;
  readonly gizmoHash: string;
  readonly activeAxis: StudioTransformAxis;
  readonly handles: readonly { readonly axis: StudioTransformAxis; readonly visible: boolean; readonly commandId: string | null }[];
  readonly recordedAxis: StudioTransformAxis;
  readonly recordedTranslationBefore: StudioVec3;
  readonly recordedTranslationAfter: StudioVec3;
}): readonly StudioGizmoNegativeSmoke[] {
  const smokes: StudioGizmoNegativeSmoke[] = [];

  const missingDiags = validateGizmoSelection({
    selectedEntityId: 'entity:does-not-exist',
    sceneRenderableIds: args.sceneRenderableIds,
    viewportSelectedRenderableId: 'entity:does-not-exist',
    recordedHash: args.gizmoHash,
    recomputedHash: args.gizmoHash,
  });
  smokes.push({ id: 'negative:missing-selected-entity', code: 'missing_selected_entity', scenario: 'Gizmo targets an entity id absent from the scene-view readback.', expectedOutcome: 'failed_closed', actualOutcome: missingDiags.some((d) => d.code === 'missing_selected_entity') ? 'failed_closed' : 'ready', diagnosticCodes: missingDiags.map((d) => d.code) });

  const staleDiags = validateGizmoSelection({
    selectedEntityId: args.selectedEntityId,
    sceneRenderableIds: args.sceneRenderableIds,
    viewportSelectedRenderableId: args.viewportSelectedRenderableId,
    recordedHash: 'transform-gizmo-stale',
    recomputedHash: args.gizmoHash,
  });
  smokes.push({ id: 'negative:stale-gizmo-selection', code: 'stale_gizmo_selection', scenario: 'Recorded gizmo hash no longer matches the recomputed selected-entity transform projection.', expectedOutcome: 'failed_closed', actualOutcome: staleDiags.some((d) => d.code === 'stale_gizmo_selection') ? 'failed_closed' : 'ready', diagnosticCodes: staleDiags.map((d) => d.code) });

  const handleDiags = validateGizmoHandles({
    handles: args.handles.filter((handle) => handle.axis !== args.activeAxis),
    activeAxis: args.activeAxis,
  });
  smokes.push({ id: 'negative:missing-gizmo-handle', code: 'missing_gizmo_handle', scenario: 'The gizmo exposes no visible command-wired handle for the active axis.', expectedOutcome: 'failed_closed', actualOutcome: handleDiags.some((d) => d.code === 'missing_gizmo_handle') ? 'failed_closed' : 'ready', diagnosticCodes: handleDiags.map((d) => d.code) });

  const mismatchAfterDiags = validateGizmoEdit({
    commandPresent: true,
    commandEntityId: args.viewportSelectedRenderableId,
    commandRenderableId: args.viewportSelectedRenderableId,
    commandAxis: args.recordedAxis,
    commandApplied: true,
    commandTranslationBefore: args.recordedTranslationBefore,
    commandTranslationAfter: [args.recordedTranslationAfter[0] + 9, args.recordedTranslationAfter[1], args.recordedTranslationAfter[2]],
    recordedAxis: args.recordedAxis,
    recordedTranslationBefore: args.recordedTranslationBefore,
    recordedTranslationAfter: args.recordedTranslationAfter,
    viewportSelectedRenderableId: args.viewportSelectedRenderableId,
  });
  smokes.push({ id: 'negative:transform-readback-mismatch-after', code: 'transform_readback_mismatch', scenario: 'A transform.translate_entity apply command moved the entity to a different after-translation than the gizmo readback.', expectedOutcome: 'failed_closed', actualOutcome: mismatchAfterDiags.some((d) => d.code === 'transform_readback_mismatch') ? 'failed_closed' : 'ready', diagnosticCodes: mismatchAfterDiags.map((d) => d.code) });

  const mismatchBeforeDiags = validateGizmoEdit({
    commandPresent: true,
    commandEntityId: args.viewportSelectedRenderableId,
    commandRenderableId: args.viewportSelectedRenderableId,
    commandAxis: args.recordedAxis,
    commandApplied: true,
    commandTranslationBefore: [args.recordedTranslationBefore[0] + 9, args.recordedTranslationBefore[1], args.recordedTranslationBefore[2]],
    commandTranslationAfter: args.recordedTranslationAfter,
    recordedAxis: args.recordedAxis,
    recordedTranslationBefore: args.recordedTranslationBefore,
    recordedTranslationAfter: args.recordedTranslationAfter,
    viewportSelectedRenderableId: args.viewportSelectedRenderableId,
  });
  smokes.push({ id: 'negative:transform-readback-mismatch-before', code: 'transform_readback_mismatch', scenario: 'A transform.translate_entity apply command reports a stale before-translation that contradicts the scene-view readback.', expectedOutcome: 'failed_closed', actualOutcome: mismatchBeforeDiags.some((d) => d.code === 'transform_readback_mismatch') ? 'failed_closed' : 'ready', diagnosticCodes: mismatchBeforeDiags.map((d) => d.code) });

  const previewMismatchDiags = validateGizmoPreview({
    previewPresent: true,
    commandEntityId: args.viewportSelectedRenderableId,
    commandRenderableId: args.viewportSelectedRenderableId,
    commandAxis: args.recordedAxis,
    commandApplied: false,
    commandTranslationAfter: [args.recordedTranslationAfter[0] + 9, args.recordedTranslationAfter[1], args.recordedTranslationAfter[2]],
    recordedAxis: args.recordedAxis,
    expectedPreviewAfter: args.recordedTranslationAfter,
    viewportSelectedRenderableId: args.viewportSelectedRenderableId,
  });
  smokes.push({ id: 'negative:preview-readback-mismatch', code: 'transform_readback_mismatch', scenario: 'A transform.translate_entity preview command previews a different translation than the editor-local expected preview.', expectedOutcome: 'failed_closed', actualOutcome: previewMismatchDiags.some((d) => d.code === 'transform_readback_mismatch') ? 'failed_closed' : 'ready', diagnosticCodes: previewMismatchDiags.map((d) => d.code) });

  const privateDiags = validateGizmoMutationSource({ applied: true, mutationSource: 'private_ui_callback' });
  smokes.push({ id: 'negative:private-mutation-path', code: 'private_mutation_path', scenario: 'A committed transform was applied through a hidden/private UI-only callback instead of the public typed command.', expectedOutcome: 'failed_closed', actualOutcome: privateDiags.some((d) => d.code === 'private_mutation_path') ? 'failed_closed' : 'ready', diagnosticCodes: privateDiags.map((d) => d.code) });

  return smokes;
}

function translateOutput(result: StudioCommandResult | undefined, mode: StudioTransformEditMode): {
  readonly entityId: string;
  readonly renderableId: string;
  readonly axis: StudioTransformAxis;
  readonly delta: number;
  readonly translationBefore: StudioVec3;
  readonly translationAfter: StudioVec3;
  readonly transformHash: string;
  readonly applied: boolean;
  readonly sequenceId: string;
  readonly actor: 'gui' | 'agent' | null;
} | null {
  if (result === undefined || result.output === null || !('translationAfter' in result.output)) return null;
  const output = result.output;
  if (output.mode !== mode) return null;
  return {
    entityId: output.entityId,
    renderableId: output.renderableId,
    axis: output.axis,
    delta: output.delta,
    translationBefore: output.translationBefore,
    translationAfter: output.translationAfter,
    transformHash: output.transformHash,
    applied: output.applied,
    sequenceId: result.sequenceId,
    actor: result.requestedBy === 'agent' ? 'agent' : result.requestedBy === 'gui' ? 'gui' : null,
  };
}

const HANDLE_COLORS: Record<StudioTransformAxis, string> = { x: '#f87171', y: '#4ade80', z: '#60a5fa' };

function translateAlong(base: StudioVec3, axis: StudioTransformAxis, delta: number): StudioVec3 {
  return [base[0] + (axis === 'x' ? delta : 0), base[1] + (axis === 'y' ? delta : 0), base[2] + (axis === 'z' ? delta : 0)];
}

export function createStudioTransformGizmoModel(options: {
  readonly sceneView: StudioSceneViewModel;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResult[];
}): StudioTransformGizmoModel {
  const { sceneView, commandResults } = options;
  const selectedRenderableId = sceneView.selection.selectedRenderableId;
  const sceneRenderableIds = sceneView.renderables.map((renderable) => renderable.renderableId);
  const renderable: StudioSceneViewRenderable | undefined = sceneView.renderables.find((entry) => entry.renderableId === selectedRenderableId);

  const translateResults = commandResults.filter((result) => result.commandId === 'transform.translate_entity');
  const applyOutput = translateResults.map((result) => translateOutput(result, 'apply')).find((entry) => entry !== null) ?? null;
  const previewOutput = translateResults.map((result) => translateOutput(result, 'preview')).find((entry) => entry !== null) ?? null;

  const baseTranslation = renderable?.transform.translation ?? { x: 0, y: 0, z: 0 };
  // translationBefore is read from the shared scene-view renderable, independent of the command
  // output, so a command that reports a wrong before/after-translation is detectable as a mismatch.
  const translationBefore: StudioVec3 = [baseTranslation.x, baseTranslation.y, baseTranslation.z];
  const sourceOutput = applyOutput ?? previewOutput;
  const activeAxis: StudioTransformAxis = sourceOutput?.axis ?? 'x';
  const delta = sourceOutput?.delta ?? 0;
  const translationAfter = translateAlong(translationBefore, activeAxis, delta);
  const previewTranslation = previewOutput?.translationAfter ?? translationAfter;
  const applied = applyOutput?.applied ?? false;

  const handles: StudioGizmoHandle[] = GIZMO_AXES.map((axis): StudioGizmoHandle => {
    const active = axis === activeAxis;
    return {
      axis,
      visible: true,
      active,
      color: HANDLE_COLORS[axis],
      commandId: active ? 'transform.translate_entity' : null,
      summary: active
        ? `Active ${axis}-axis translate handle wired to transform.translate_entity.`
        : `${axis}-axis handle visible; typed translate is constrained to the active ${activeAxis} axis in this slice.`,
    };
  });

  const gizmoHash = computeGizmoHash({ entityId: selectedRenderableId, axis: activeAxis, translationBefore, translationAfter, handleAxes: GIZMO_AXES });

  const selectionHash = sceneView.selection.selectionHash;
  const editDiagnostics = validateGizmoEdit({
    commandPresent: applyOutput !== null,
    commandEntityId: applyOutput?.entityId ?? null,
    commandRenderableId: applyOutput?.renderableId ?? null,
    commandAxis: applyOutput?.axis ?? null,
    commandApplied: applied,
    commandTranslationBefore: applyOutput?.translationBefore ?? null,
    commandTranslationAfter: applyOutput?.translationAfter ?? null,
    recordedAxis: activeAxis,
    recordedTranslationBefore: translationBefore,
    recordedTranslationAfter: translationAfter,
    viewportSelectedRenderableId: selectedRenderableId,
  });
  const previewDiagnostics = validateGizmoPreview({
    previewPresent: previewOutput !== null,
    commandEntityId: previewOutput?.entityId ?? null,
    commandRenderableId: previewOutput?.renderableId ?? null,
    commandAxis: previewOutput?.axis ?? null,
    commandApplied: previewOutput?.applied ?? null,
    commandTranslationAfter: previewOutput?.translationAfter ?? null,
    recordedAxis: activeAxis,
    expectedPreviewAfter: translationAfter,
    viewportSelectedRenderableId: selectedRenderableId,
  });
  const editInSync = editDiagnostics.length === 0 && previewDiagnostics.length === 0;
  const mutationSource: StudioGizmoMutationSource = applyOutput !== null ? GIZMO_MUTATION_SOURCE : 'private_ui_callback';

  const edit: StudioGizmoEdit = {
    commandId: 'transform.translate_entity',
    operation: SUPPORTED_GIZMO_OPERATION,
    axis: activeAxis,
    delta,
    entityId: selectedRenderableId,
    renderableId: applyOutput?.renderableId ?? selectedRenderableId,
    translationBefore,
    translationAfter,
    transformHash: applyOutput?.transformHash ?? 'transform-hash-unavailable',
    previewSequenceId: previewOutput?.sequenceId ?? null,
    applySequenceId: applyOutput?.sequenceId ?? null,
    previewActor: previewOutput?.actor ?? null,
    applyActor: applyOutput?.actor ?? null,
    mutationSource,
    applied,
    inSync: editInSync,
    summary: applyOutput === null
      ? 'No transform.translate_entity apply result recorded; gizmo transform is not synced.'
      : `Gizmo translated ${selectedRenderableId} along ${activeAxis} by ${delta}: [${translationBefore.join(', ')}] → [${translationAfter.join(', ')}] via preview ${previewOutput?.sequenceId ?? 'unknown'} + apply ${applyOutput.sequenceId}; applied ${applied}; inSync ${editInSync}.`,
  };

  const selection: StudioGizmoSelection = {
    selectedEntityId: selectedRenderableId,
    viewportRenderableId: selectedRenderableId,
    kind: renderable?.kind ?? 'voxel_cell',
    inSync: editInSync,
    selectionHash,
    gizmoHash,
    summary: `Gizmo bound to selected entity ${selectedRenderableId}; handles ${GIZMO_AXES.join('/')}, active ${activeAxis}.`,
  };

  const diagnostics = [
    ...validateGizmoSelection({
      selectedEntityId: selectedRenderableId,
      sceneRenderableIds,
      viewportSelectedRenderableId: selectedRenderableId,
      recordedHash: gizmoHash,
      recomputedHash: gizmoHash,
    }),
    ...validateGizmoHandles({ handles, activeAxis }),
    ...editDiagnostics,
    ...previewDiagnostics,
    ...validateGizmoMutationSource({ applied, mutationSource }),
  ];
  const negatives = negativeSmokes({
    selectedEntityId: selectedRenderableId,
    sceneRenderableIds,
    viewportSelectedRenderableId: selectedRenderableId,
    gizmoHash,
    activeAxis,
    handles,
    recordedAxis: activeAxis,
    recordedTranslationBefore: translationBefore,
    recordedTranslationAfter: translationAfter,
  });
  const negativesFailClosed = negatives.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.diagnosticCodes.includes(smoke.code));
  const readiness: StudioTransformGizmoReadiness = diagnostics.length === 0 && applied && negativesFailClosed ? 'ready' : 'failed_closed';

  return {
    schemaVersion: 1,
    artifactKind: 'transform_gizmo',
    automationLabel: 'studio-transform-gizmo-dock',
    title: 'Transform Gizmo',
    readiness,
    projectionMode: 'scene_view_selected_entity_gizmo_projection',
    sceneId: sceneView.sceneId,
    selectedEntityId: selectedRenderableId,
    operation: SUPPORTED_GIZMO_OPERATION,
    activeAxis,
    selection,
    handles,
    transform: { axis: activeAxis, delta, before: translationBefore, preview: previewTranslation, after: translationAfter },
    edit,
    gizmoHash,
    diagnostics,
    negativeSmokes: negatives,
    automationMarkers: [
      'studio-transform-gizmo-dock',
      'transform-gizmo-selection-readout',
      'transform-gizmo-handle-readout',
      'transform-gizmo-transform-readout',
      'transform-gizmo-diagnostics-readout',
      'transform.translate_entity',
      ...handles.map((handle) => `gizmo-handle-${handle.axis}`),
    ],
    knownLimitations: [
      'Transform gizmo is a deterministic projection of the shared scene-view selected entity, not a private ECS transform component store.',
      'Only single-axis translate is supported in this slice; rotate/scale and multi-axis manipulation remain deferred.',
      'Preview is editor-local and apply commits through the public transform.translate_entity command on the shared timeline; there is no private UI-only mutation path.',
      'Transform is an editor-local edit over public readback; it makes no physics, native runtime, Agora compositor, hardware GPU, or performance claims, and authoritative transform mutation remains deferred behind the runtime-bridge readiness gate.',
    ],
  };
}
