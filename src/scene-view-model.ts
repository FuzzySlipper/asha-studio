import type { StudioModelMaterialPreviewModel } from './model-material-preview';
import type { StudioCommandTimelineEntry } from './session-workspace';
import type { StudioViewportEditorPanelModel } from './viewport-editor-panel';
import type { StudioVoxelWorkflowModel } from './voxel-workflow';
import type { StudioVisualEvidenceRef } from './visual-evidence';

export type StudioSceneViewReadiness = 'ready' | 'failed_closed';
export type StudioSceneViewProjectionAuthority = 'browser_projection_reference';
export type StudioSceneViewRenderableKind = 'voxel_grid' | 'voxel_cell' | 'static_mesh' | 'preview_ghost';
export type StudioSceneViewSourceState = 'authoritative_rust_state' | 'editor_preview_state' | 'browser_projection_reference';

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
  readonly expectedOutcome: 'hit';
  readonly expectedRenderableId: string;
  readonly expectedVoxelId: string;
  readonly rayHash: string;
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
  readonly renderables: readonly StudioSceneViewRenderable[];
  readonly selection: StudioSceneViewSelectionProof;
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
  const camera: StudioSceneViewCamera = {
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
  const selection: StudioSceneViewSelectionProof = {
    selectedObjectId: selectedVoxelId,
    selectedVoxelId,
    selectedFace: voxelWorkflow.evidence.selectedFace,
    selectedRenderableId: 'selected-voxel:0,0,0',
    screenPoint: pickScreenPoint,
    expectedWorldPoint: selectedVoxel,
    pickRayHash: voxelWorkflow.selection.pickRay.rayHash,
    cameraProjectionHash: voxelWorkflow.selection.pickRay.cameraProjectionHash,
  };
  return {
    schemaVersion: 1,
    artifactKind: 'scene_view_model',
    artifactId: 'artifact-scene-view-model-0001',
    sessionId,
    scenarioId,
    sceneId: `scene-view:${scenarioId}:v1`,
    readiness: viewportEditor.readiness,
    projectionAuthority: 'browser_projection_reference',
    viewport: { widthPx: 1920, heightPx: 1080, devicePixelRatio: 1, coordinateSpace: 'screen_px_and_normalized_pick_points' },
    camera,
    renderables,
    selection,
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
