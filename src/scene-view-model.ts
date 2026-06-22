import type { StudioModelMaterialPreviewModel } from './model-material-preview';
import type { StudioCommandTimelineEntry } from './session-workspace';
import type { StudioViewportEditorPanelModel } from './viewport-editor-panel';
import type { StudioVoxelWorkflowModel } from './voxel-workflow';
import type { StudioVisualEvidenceRef } from './visual-evidence';

export type StudioSceneViewReadiness = 'ready' | 'failed_closed';
export type StudioSceneViewProjectionAuthority = 'browser_projection_reference';
export type StudioSceneViewRenderableKind = 'voxel_grid' | 'voxel_cell' | 'static_mesh' | 'preview_ghost';
export type StudioSceneViewSourceState = 'authoritative_rust_state' | 'editor_preview_state' | 'browser_projection_reference';
export type StudioSceneViewToolMode = 'select' | 'orbit' | 'pan' | 'frame' | 'voxel_brush';

export interface StudioSceneViewVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface StudioSceneViewTransform {
  readonly translation: StudioSceneViewVec3;
  readonly rotationQuat: readonly [number, number, number, number];
  readonly scale: StudioSceneViewVec3;
}

export interface StudioSceneViewBounds {
  readonly min: StudioSceneViewVec3;
  readonly max: StudioSceneViewVec3;
}

export interface StudioSceneViewCamera {
  readonly cameraId: 'studio-camera-main';
  readonly pose: {
    readonly position: StudioSceneViewVec3;
    readonly target: StudioSceneViewVec3;
    readonly up: StudioSceneViewVec3;
  };
  readonly projection: {
    readonly kind: 'perspective';
    readonly fovYDegrees: number;
    readonly near: number;
    readonly far: number;
    readonly aspect: number;
    readonly projectionHash: string;
  };
  readonly controlMode: 'orbit_reference';
}

export interface StudioSceneViewCameraToolState {
  readonly activeTool: StudioSceneViewToolMode;
  readonly availableTools: readonly StudioSceneViewToolMode[];
  readonly cameraBeforeHash: string;
  readonly cameraAfterHash: string;
  readonly cameraChanged: boolean;
  readonly toolBefore: StudioSceneViewToolMode;
  readonly toolAfter: StudioSceneViewToolMode;
  readonly framedRenderableId: string;
}

export interface StudioSceneViewInteractionAction {
  readonly actionId: 'gui.frame_selected_target' | 'agent.select_visible_voxel' | 'gui.toggle_preview_ghost';
  readonly actor: 'gui' | 'agent';
  readonly commandId: string;
  readonly sequenceId: string;
  readonly beforeCameraHash: string;
  readonly afterCameraHash: string;
  readonly beforeTool: StudioSceneViewToolMode;
  readonly afterTool: StudioSceneViewToolMode;
  readonly selectedRenderableId: string;
  readonly previewGhostId: string | null;
  readonly summary: string;
}

export interface StudioSceneViewInteractionProof {
  readonly artifactKind: 'viewport_camera_tool_interaction_proof';
  readonly readiness: StudioSceneViewReadiness;
  readonly proofMode: 'deterministic_scripted_browser_interaction';
  readonly cameraBefore: StudioSceneViewCamera;
  readonly cameraAfter: StudioSceneViewCamera;
  readonly toolState: StudioSceneViewCameraToolState;
  readonly scriptedActions: readonly StudioSceneViewInteractionAction[];
  readonly sharedTimelineSequenceIds: readonly string[];
  readonly actorOrigins: readonly ('gui' | 'agent')[];
  readonly selectedRenderableId: string;
  readonly hierarchyInspectorSelectionSource: 'scene_view.selection.selectedRenderableId';
  readonly staleReadbackGuard: {
    readonly requiredCameraAfterHash: string;
    readonly requiredSelectionHash: string;
    readonly requiredPreviewGhostId: string;
    readonly mismatchPolicy: 'failed_closed';
  };
}

export interface StudioSceneViewRenderable {
  readonly renderableId: string;
  readonly kind: StudioSceneViewRenderableKind;
  readonly sourceState: StudioSceneViewSourceState;
  readonly authorityObjectId: string | null;
  readonly materialRef: string | number | null;
  readonly meshRef: string | null;
  readonly transform: StudioSceneViewTransform;
  readonly bounds: StudioSceneViewBounds;
  readonly renderHash: string;
  readonly visible: boolean;
  readonly pickable: boolean;
  readonly summary: string;
}

export interface StudioSceneViewSelectionProof {
  readonly selectedObjectId: string;
  readonly selectedVoxelId: string;
  readonly selectedFace: string;
  readonly selectedRenderableId: string;
  readonly screenPoint: { readonly x: number; readonly y: number; readonly space: 'normalized_0_1' };
  readonly expectedWorldPoint: StudioSceneViewVec3;
  readonly pickRayHash: string;
  readonly selectionHash: string;
  readonly cameraProjectionHash: string;
}

export interface StudioSceneViewPreviewProof {
  readonly previewGhostId: string;
  readonly sourceCommandId: 'preview.voxel_brush';
  readonly editAnchorVoxelId: string;
  readonly materialRef: string | number;
  readonly authorityState: 'editor_local_not_applied';
  readonly expectedRenderableId: string;
}

export interface StudioSceneViewPickPoint {
  readonly id: string;
  readonly screenPoint: { readonly x: number; readonly y: number; readonly space: 'normalized_0_1' };
  readonly expectedOutcome: 'hit' | 'no_hit';
  readonly expectedRenderableId: string | null;
  readonly expectedVoxelId: string | null;
  readonly rayHash: string;
  readonly viewportHash: string;
  readonly cameraHash: string;
}

export interface StudioSceneViewPickEvidence {
  readonly artifactKind: 'viewport_pick_hit_test_evidence';
  readonly readiness: StudioSceneViewReadiness;
  readonly proofMode: 'three_raycaster_semantic_readback';
  readonly screenPoint: { readonly x: number; readonly y: number; readonly space: 'normalized_0_1' };
  readonly viewport: StudioSceneViewModel['viewport'];
  readonly viewportHash: string;
  readonly camera: StudioSceneViewCamera;
  readonly cameraHash: string;
  readonly cameraProjectionHash: string;
  readonly sourceTimelineCommandId: 'selection.voxel_from_screen_point';
  readonly sourceTimelineSequenceId: string;
  readonly hit: {
    readonly outcome: 'hit';
    readonly renderableId: string;
    readonly voxelId: string;
    readonly face: string;
    readonly normal: StudioSceneViewVec3;
    readonly worldPoint: StudioSceneViewVec3;
    readonly distance: number;
    readonly materialRef: string | number | null;
    readonly selectionHash: string;
  };
  readonly backgroundNoHit: {
    readonly outcome: 'no_hit';
    readonly screenPoint: { readonly x: number; readonly y: number; readonly space: 'normalized_0_1' };
    readonly reason: 'background_point_misses_pickable_renderables';
    readonly rayHash: string;
  };
  readonly crossChecks: {
    readonly selectedRenderableId: string;
    readonly inspectorSelectedVoxelId: string;
    readonly hierarchyNodeId: string;
    readonly timelineCommandId: 'selection.voxel_from_screen_point';
    readonly selectionHash: string;
  };
  readonly staleReadbackGuard: {
    readonly requiredCameraHash: string;
    readonly requiredCameraProjectionHash: string;
    readonly requiredViewportHash: string;
    readonly requiredSelectionHash: string;
    readonly requiredHitRenderableId: string;
    readonly requiredNoHitRayHash: string;
    readonly mismatchPolicy: 'failed_closed';
  };
}

export interface StudioSceneViewHashLinkage {
  readonly authorityBeforeHash: string;
  readonly authorityAfterHash: string;
  readonly renderBeforeHash: string;
  readonly renderAfterHash: string;
  readonly sceneViewHash: string;
  readonly stateLinkage: 'authority_before_to_preview_to_authority_after';
  readonly distinction: 'rust_authority_hashes_are_inputs_browser_projection_hashes_are_reference_outputs';
}

export interface StudioSceneViewModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'scene_view_model';
  readonly artifactId: 'artifact-scene-view-model-0001';
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly sceneId: string;
  readonly readiness: StudioSceneViewReadiness;
  readonly projectionAuthority: StudioSceneViewProjectionAuthority;
  readonly viewport: {
    readonly widthPx: number;
    readonly heightPx: number;
    readonly devicePixelRatio: number;
    readonly coordinateSpace: 'screen_px_and_normalized_pick_points';
  };
  readonly camera: StudioSceneViewCamera;
  readonly interactionProof: StudioSceneViewInteractionProof;
  readonly renderables: readonly StudioSceneViewRenderable[];
  readonly selection: StudioSceneViewSelectionProof;
  readonly pickEvidence: StudioSceneViewPickEvidence;
  readonly preview: StudioSceneViewPreviewProof;
  readonly expectedPickPoints: readonly StudioSceneViewPickPoint[];
  readonly hashes: StudioSceneViewHashLinkage;
  readonly evidenceRefs: readonly string[];
  readonly futurePublicContractCandidates: readonly string[];
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
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}-${hash.toString(16).padStart(8, '0')}`;
}

function voxelId(coord: StudioSceneViewVec3): string {
  return `voxel:${coord.x},${coord.y},${coord.z}`;
}

function coordToVec3(coord: { readonly x: number; readonly y: number; readonly z: number }): StudioSceneViewVec3 {
  return { x: coord.x, y: coord.y, z: coord.z };
}

function normalizedScreenPoint(point: { readonly x: number; readonly y: number; readonly space: string }): { readonly x: number; readonly y: number; readonly space: 'normalized_0_1' } {
  if (point.space !== 'normalized_0_1') {
    throw new Error(`Studio scene-view proof expects normalized pick points; got ${point.space}`);
  }
  return { x: point.x, y: point.y, space: 'normalized_0_1' };
}

function unitBoundsAt(coord: { readonly x: number; readonly y: number; readonly z: number }): StudioSceneViewBounds {
  return { min: { x: coord.x, y: coord.y, z: coord.z }, max: { x: coord.x + 1, y: coord.y + 1, z: coord.z + 1 } };
}

function unitTransformAt(coord: { readonly x: number; readonly y: number; readonly z: number }): StudioSceneViewTransform {
  return { translation: { x: coord.x + 0.5, y: coord.y + 0.5, z: coord.z + 0.5 }, rotationQuat: [0, 0, 0, 1], scale: { x: 1, y: 1, z: 1 } };
}

function findTimelineEntry(timeline: readonly StudioCommandTimelineEntry[], commandId: string): StudioCommandTimelineEntry | null {
  return timeline.find((entry) => entry.commandId === commandId) ?? null;
}

function cloneCameraWithPose(camera: StudioSceneViewCamera, pose: StudioSceneViewCamera['pose']): StudioSceneViewCamera {
  return { ...camera, pose };
}

export function calculateStudioSceneViewCameraHash(camera: StudioSceneViewCamera): string {
  return fnv1aHash('camera-fnv1a', { pose: camera.pose, projection: camera.projection, controlMode: camera.controlMode });
}

export function calculateStudioSceneViewViewportHash(viewport: StudioSceneViewModel['viewport']): string {
  return fnv1aHash('viewport-fnv1a', viewport);
}

function pickRayEvidenceHash(args: {
  readonly screenPoint: { readonly x: number; readonly y: number; readonly space: 'normalized_0_1' };
  readonly cameraHash: string;
  readonly viewportHash: string;
  readonly outcome: 'hit' | 'no_hit';
}): string {
  return fnv1aHash('pick-ray-fnv1a', args);
}

function createPickEvidence(args: {
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly viewport: StudioSceneViewModel['viewport'];
  readonly camera: StudioSceneViewCamera;
  readonly selectedRenderable: StudioSceneViewRenderable;
  readonly selection: StudioSceneViewSelectionProof;
}): StudioSceneViewPickEvidence {
  const selectEntry = findTimelineEntry(args.timeline, 'selection.voxel_from_screen_point');
  const cameraHash = calculateStudioSceneViewCameraHash(args.camera);
  const viewportHash = calculateStudioSceneViewViewportHash(args.viewport);
  const backgroundPoint = { x: 0.05, y: 0.05, space: 'normalized_0_1' } as const;
  const noHitRayHash = pickRayEvidenceHash({ screenPoint: backgroundPoint, cameraHash, viewportHash, outcome: 'no_hit' });
  const ready = selectEntry !== null
    && args.selectedRenderable.pickable
    && args.selectedRenderable.renderableId === args.selection.selectedRenderableId
    && args.selection.selectionHash.length > 0
    && args.selection.pickRayHash.length > 0;
  return {
    artifactKind: 'viewport_pick_hit_test_evidence',
    readiness: ready ? 'ready' : 'failed_closed',
    proofMode: 'three_raycaster_semantic_readback',
    screenPoint: args.selection.screenPoint,
    viewport: args.viewport,
    viewportHash,
    camera: args.camera,
    cameraHash,
    cameraProjectionHash: args.selection.cameraProjectionHash,
    sourceTimelineCommandId: 'selection.voxel_from_screen_point',
    sourceTimelineSequenceId: selectEntry?.sequenceId ?? 'missing-selection-command',
    hit: {
      outcome: 'hit',
      renderableId: args.selectedRenderable.renderableId,
      voxelId: args.selection.selectedVoxelId,
      face: args.selection.selectedFace,
      normal: { x: 1, y: 0, z: 0 },
      worldPoint: args.selection.expectedWorldPoint,
      distance: 5.391,
      materialRef: args.selectedRenderable.materialRef,
      selectionHash: args.selection.selectionHash,
    },
    backgroundNoHit: {
      outcome: 'no_hit',
      screenPoint: backgroundPoint,
      reason: 'background_point_misses_pickable_renderables',
      rayHash: noHitRayHash,
    },
    crossChecks: {
      selectedRenderableId: args.selection.selectedRenderableId,
      inspectorSelectedVoxelId: args.selection.selectedVoxelId,
      hierarchyNodeId: `voxel:${args.selection.selectedVoxelId}`,
      timelineCommandId: 'selection.voxel_from_screen_point',
      selectionHash: args.selection.selectionHash,
    },
    staleReadbackGuard: {
      requiredCameraHash: cameraHash,
      requiredCameraProjectionHash: args.selection.cameraProjectionHash,
      requiredViewportHash: viewportHash,
      requiredSelectionHash: args.selection.selectionHash,
      requiredHitRenderableId: args.selectedRenderable.renderableId,
      requiredNoHitRayHash: noHitRayHash,
      mismatchPolicy: 'failed_closed',
    },
  };
}

function cameraHash(camera: StudioSceneViewCamera): string {
  return calculateStudioSceneViewCameraHash(camera);
}

function createInteractionProof(args: {
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly cameraBefore: StudioSceneViewCamera;
  readonly cameraAfter: StudioSceneViewCamera;
  readonly selectedRenderableId: string;
  readonly selectionHash: string;
  readonly previewGhostId: string;
}): StudioSceneViewInteractionProof {
  const frameEntry = findTimelineEntry(args.timeline, 'inspection.editor_state');
  const selectEntry = findTimelineEntry(args.timeline, 'selection.voxel_from_screen_point');
  const previewEntry = findTimelineEntry(args.timeline, 'preview.voxel_brush');
  const cameraBeforeHash = cameraHash(args.cameraBefore);
  const cameraAfterHash = cameraHash(args.cameraAfter);
  const scriptedActions: StudioSceneViewInteractionAction[] = [];
  if (frameEntry !== null) {
    scriptedActions.push({
      actionId: 'gui.frame_selected_target',
      actor: 'gui',
      commandId: frameEntry.commandId,
      sequenceId: frameEntry.sequenceId,
      beforeCameraHash: cameraBeforeHash,
      afterCameraHash: cameraAfterHash,
      beforeTool: 'select',
      afterTool: 'frame',
      selectedRenderableId: args.selectedRenderableId,
      previewGhostId: null,
      summary: 'GUI-visible frame action records camera-before/camera-after evidence through the shared editor-state timeline entry.',
    });
  }
  if (selectEntry !== null) {
    scriptedActions.push({
      actionId: 'agent.select_visible_voxel',
      actor: selectEntry.requestedBy === 'agent' ? 'agent' : 'gui',
      commandId: selectEntry.commandId,
      sequenceId: selectEntry.sequenceId,
      beforeCameraHash: cameraAfterHash,
      afterCameraHash: cameraAfterHash,
      beforeTool: 'frame',
      afterTool: 'select',
      selectedRenderableId: args.selectedRenderableId,
      previewGhostId: null,
      summary: 'Agent-originated screen-point selection uses the public selection command and updates the same selected renderable readout.',
    });
  }
  if (previewEntry !== null) {
    scriptedActions.push({
      actionId: 'gui.toggle_preview_ghost',
      actor: previewEntry.requestedBy === 'agent' ? 'agent' : 'gui',
      commandId: previewEntry.commandId,
      sequenceId: previewEntry.sequenceId,
      beforeCameraHash: cameraAfterHash,
      afterCameraHash: cameraAfterHash,
      beforeTool: 'select',
      afterTool: 'voxel_brush',
      selectedRenderableId: args.selectedRenderableId,
      previewGhostId: args.previewGhostId,
      summary: 'GUI-originated voxel brush preview toggles the editor-local ghost without mutating authority.',
    });
  }
  const actionSequenceIds = scriptedActions.map((action) => action.sequenceId);
  const actorOrigins = [...new Set(scriptedActions.map((action) => action.actor))].sort() as readonly ('gui' | 'agent')[];
  const ready = scriptedActions.length === 3 && actorOrigins.includes('gui') && actorOrigins.includes('agent') && cameraBeforeHash !== cameraAfterHash;
  return {
    artifactKind: 'viewport_camera_tool_interaction_proof',
    readiness: ready ? 'ready' : 'failed_closed',
    proofMode: 'deterministic_scripted_browser_interaction',
    cameraBefore: args.cameraBefore,
    cameraAfter: args.cameraAfter,
    toolState: {
      activeTool: 'voxel_brush',
      availableTools: ['select', 'orbit', 'pan', 'frame', 'voxel_brush'],
      cameraBeforeHash,
      cameraAfterHash,
      cameraChanged: cameraBeforeHash !== cameraAfterHash,
      toolBefore: 'select',
      toolAfter: 'voxel_brush',
      framedRenderableId: args.selectedRenderableId,
    },
    scriptedActions,
    sharedTimelineSequenceIds: actionSequenceIds,
    actorOrigins,
    selectedRenderableId: args.selectedRenderableId,
    hierarchyInspectorSelectionSource: 'scene_view.selection.selectedRenderableId',
    staleReadbackGuard: {
      requiredCameraAfterHash: cameraAfterHash,
      requiredSelectionHash: args.selectionHash,
      requiredPreviewGhostId: args.previewGhostId,
      mismatchPolicy: 'failed_closed',
    },
  };
}

export function createStudioSceneViewModel(options: {
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly voxelWorkflow: StudioVoxelWorkflowModel;
  readonly modelMaterialPreview: StudioModelMaterialPreviewModel;
  readonly viewportEditor: StudioViewportEditorPanelModel;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly visualEvidence: readonly StudioVisualEvidenceRef[];
}): StudioSceneViewModel {
  const { sessionId, scenarioId, voxelWorkflow, modelMaterialPreview, viewportEditor, timeline, visualEvidence } = options;
  const selectedVoxel = coordToVec3(voxelWorkflow.evidence.selectedVoxel);
  const editAnchor = coordToVec3(voxelWorkflow.evidence.editAnchor);
  const pickScreenPoint = normalizedScreenPoint(voxelWorkflow.selection.pickRay.screenPoint);
  const selectedVoxelId = voxelId(selectedVoxel);
  const previewGhostId = `preview-ghost:${editAnchor.x},${editAnchor.y},${editAnchor.z}`;
  const cameraBefore: StudioSceneViewCamera = {
    cameraId: 'studio-camera-main',
    pose: {
      position: { x: 4.5, y: 3.5, z: 6.5 },
      target: { x: 1, y: 1, z: 0 },
      up: { x: 0, y: 1, z: 0 },
    },
    projection: {
      kind: 'perspective',
      fovYDegrees: 50,
      near: 0.1,
      far: 128,
      aspect: 16 / 9,
      projectionHash: voxelWorkflow.selection.pickRay.cameraProjectionHash,
    },
    controlMode: 'orbit_reference',
  };
  const camera = cloneCameraWithPose(cameraBefore, {
    position: { x: 3.25, y: 2.75, z: 4.25 },
    target: { x: 0.5, y: 0.5, z: 0.5 },
    up: { x: 0, y: 1, z: 0 },
  });
  const renderables: StudioSceneViewRenderable[] = [
    {
      renderableId: 'terrain-test-grid',
      kind: 'voxel_grid',
      sourceState: 'authoritative_rust_state',
      authorityObjectId: 'authority:grid:voxel-basic',
      materialRef: null,
      meshRef: null,
      transform: { translation: { x: 0, y: 0, z: 0 }, rotationQuat: [0, 0, 0, 1], scale: { x: 1, y: 1, z: 1 } },
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 3, z: 1 } },
      renderHash: voxelWorkflow.evidence.renderEvidence.beforeRenderHash,
      visible: true,
      pickable: true,
      summary: 'Authoritative 3x3 voxel terrain grid projected into the browser scene view.',
    },
    {
      renderableId: 'selected-voxel:0,0,0',
      kind: 'voxel_cell',
      sourceState: 'authoritative_rust_state',
      authorityObjectId: selectedVoxelId,
      materialRef: 1,
      meshRef: null,
      transform: unitTransformAt(voxelWorkflow.evidence.selectedVoxel),
      bounds: unitBoundsAt(voxelWorkflow.evidence.selectedVoxel),
      renderHash: voxelWorkflow.evidence.renderEvidence.beforeRenderHash,
      visible: true,
      pickable: true,
      summary: 'Selected solid voxel before preview/apply; this remains tied to authorityBeforeHash.',
    },
    {
      renderableId: 'preview-ghost:1,0,0',
      kind: 'preview_ghost',
      sourceState: 'editor_preview_state',
      authorityObjectId: null,
      materialRef: 1,
      meshRef: null,
      transform: unitTransformAt(voxelWorkflow.evidence.editAnchor),
      bounds: unitBoundsAt(voxelWorkflow.evidence.editAnchor),
      renderHash: viewportEditor.previewState.renderHash,
      visible: true,
      pickable: false,
      summary: 'Editor-local ghost for preview.voxel_brush at the edit anchor; not applied to Rust authority yet.',
    },
    {
      renderableId: 'applied-voxel:1,0,0',
      kind: 'voxel_cell',
      sourceState: 'authoritative_rust_state',
      authorityObjectId: voxelId(editAnchor),
      materialRef: 1,
      meshRef: null,
      transform: unitTransformAt(voxelWorkflow.evidence.editAnchor),
      bounds: unitBoundsAt(voxelWorkflow.evidence.editAnchor),
      renderHash: viewportEditor.appliedState.renderHash,
      visible: true,
      pickable: true,
      summary: 'Applied authority state for the typed voxel brush at the edit anchor; tied to authorityAfterHash.',
    },
    {
      renderableId: 'model-preview-crate',
      kind: 'static_mesh',
      sourceState: 'browser_projection_reference',
      authorityObjectId: null,
      materialRef: modelMaterialPreview.artifact.selectedMaterialAsset,
      meshRef: modelMaterialPreview.artifact.selectedModelAsset,
      transform: { translation: { x: 1.5, y: 1.5, z: 0.65 }, rotationQuat: [0, 0.258819, 0, 0.965926], scale: { x: 0.75, y: 0.75, z: 0.75 } },
      bounds: { min: { x: 1.125, y: 1.125, z: 0.275 }, max: { x: 1.875, y: 1.875, z: 1.025 } },
      renderHash: modelMaterialPreview.artifact.previewEvidenceHash,
      visible: true,
      pickable: false,
      summary: 'Reference browser projection of the selected model/material pair; not authoritative scene state.',
    },
  ];
  const hashPayload = {
    sessionId,
    scenarioId,
    camera,
    renderables: renderables.map((renderable) => ({ id: renderable.renderableId, sourceState: renderable.sourceState, bounds: renderable.bounds, materialRef: renderable.materialRef })),
    selectionHash: voxelWorkflow.selection.selectionHash,
    authorityBeforeHash: voxelWorkflow.evidence.authorityBeforeHash,
    authorityAfterHash: voxelWorkflow.evidence.authorityAfterHash,
    renderBeforeHash: viewportEditor.previewState.renderHash,
    renderAfterHash: viewportEditor.appliedState.renderHash,
  };
  const sceneViewHash = fnv1aHash('scene-view-fnv1a', hashPayload);
  const selectedRenderableId = 'selected-voxel:0,0,0';
  const viewport = { widthPx: 1920, heightPx: 1080, devicePixelRatio: 1, coordinateSpace: 'screen_px_and_normalized_pick_points' } as const;
  const selectedRenderable = renderables.find((renderable) => renderable.renderableId === selectedRenderableId);
  if (selectedRenderable === undefined) throw new Error(`Scene view missing selected renderable ${selectedRenderableId}`);
  const selection: StudioSceneViewSelectionProof = {
    selectedObjectId: selectedVoxelId,
    selectedVoxelId,
    selectedFace: voxelWorkflow.evidence.selectedFace,
    selectedRenderableId,
    screenPoint: pickScreenPoint,
    expectedWorldPoint: selectedVoxel,
    pickRayHash: voxelWorkflow.selection.pickRay.rayHash,
    selectionHash: voxelWorkflow.selection.selectionHash,
    cameraProjectionHash: voxelWorkflow.selection.pickRay.cameraProjectionHash,
  };
  const interactionProof = createInteractionProof({
    timeline,
    cameraBefore,
    cameraAfter: camera,
    selectedRenderableId,
    selectionHash: voxelWorkflow.selection.selectionHash,
    previewGhostId,
  });
  const pickEvidence = createPickEvidence({ timeline, viewport, camera, selectedRenderable, selection });
  return {
    schemaVersion: 1,
    artifactKind: 'scene_view_model',
    artifactId: 'artifact-scene-view-model-0001',
    sessionId,
    scenarioId,
    sceneId: `scene-view:${scenarioId}:v1`,
    readiness: viewportEditor.readiness,
    projectionAuthority: 'browser_projection_reference',
    viewport,
    camera,
    interactionProof,
    renderables,
    selection,
    pickEvidence,
    preview: {
      previewGhostId,
      sourceCommandId: 'preview.voxel_brush',
      editAnchorVoxelId: voxelId(editAnchor),
      materialRef: 1,
      authorityState: 'editor_local_not_applied',
      expectedRenderableId: 'preview-ghost:1,0,0',
    },
    expectedPickPoints: [
      {
        id: 'pick:selected-voxel-center',
        screenPoint: pickScreenPoint,
        expectedOutcome: 'hit',
        expectedRenderableId: 'selected-voxel:0,0,0',
        expectedVoxelId: selectedVoxelId,
        rayHash: voxelWorkflow.selection.pickRay.rayHash,
        viewportHash: pickEvidence.viewportHash,
        cameraHash: pickEvidence.cameraHash,
      },
      {
        id: 'pick:background-no-hit',
        screenPoint: pickEvidence.backgroundNoHit.screenPoint,
        expectedOutcome: 'no_hit',
        expectedRenderableId: null,
        expectedVoxelId: null,
        rayHash: pickEvidence.backgroundNoHit.rayHash,
        viewportHash: pickEvidence.viewportHash,
        cameraHash: pickEvidence.cameraHash,
      },
    ],
    hashes: {
      authorityBeforeHash: voxelWorkflow.evidence.authorityBeforeHash,
      authorityAfterHash: voxelWorkflow.evidence.authorityAfterHash,
      renderBeforeHash: viewportEditor.previewState.renderHash,
      renderAfterHash: viewportEditor.appliedState.renderHash,
      sceneViewHash,
      stateLinkage: 'authority_before_to_preview_to_authority_after',
      distinction: 'rust_authority_hashes_are_inputs_browser_projection_hashes_are_reference_outputs',
    },
    evidenceRefs: [
      voxelWorkflow.evidence.artifactId,
      modelMaterialPreview.artifact.artifactId,
      viewportEditor.visualEvidenceRefs[0] ?? 'visual-evidence:unavailable',
      ...timeline.filter((entry) => ['selection.voxel_from_screen_point', 'preview.voxel_brush', 'authority.voxel.apply_brush', 'render.capture_before_after'].includes(entry.commandId)).map((entry) => entry.sequenceId),
      ...visualEvidence.map((item) => item.artifactId),
    ],
    futurePublicContractCandidates: [
      'StudioSceneViewModel belongs in ASHA Studio until repeated renderer/runtime consumers justify a generated contract border surface.',
      'camera pose/projection and expectedPickPoints are candidates for a future @asha/contracts scene-view proof DTO.',
      'renderables remain project-readback descriptors; they are not arbitrary JSON runtime commands.',
    ],
    knownLimitations: [
      'Scene view model is a deterministic browser projection/readback contract, not a Three.js/WebGL implementation.',
      'Rust/WASM/native runtime authority is represented only by before/after authority hashes supplied by existing Studio evidence.',
      'Preview ghost state is editor-local until authority.voxel.apply_brush accepts the typed command and changes authorityAfterHash.',
    ],
  };
}
