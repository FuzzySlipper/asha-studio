import * as THREE from 'three';

import type {
  StudioSceneViewInteractionProof,
  StudioSceneViewModel,
  StudioSceneViewPickEvidence,
  StudioSceneViewRenderable,
  StudioSceneViewVec3,
} from './scene-view-model';
import { calculateStudioSceneViewCameraHash, calculateStudioSceneViewPickRayHash, calculateStudioSceneViewViewportHash } from './scene-view-model';
import type { StudioTransformAxis, StudioTransformGizmoModel, StudioVec3 } from './transform-gizmo';

export interface StudioViewport3dRenderableReadback {
  readonly renderableId: string;
  readonly kind: StudioSceneViewRenderable['kind'];
  readonly sourceState: StudioSceneViewRenderable['sourceState'];
  readonly visible: boolean;
  readonly pickable: boolean;
  readonly materialRef: string | number | null;
  readonly meshRef: string | null;
  readonly renderHash: string;
}

export type StudioViewport3dRenderPhase = 'combined' | 'before' | 'after';

export interface StudioViewport3dReadback {
  readonly schemaVersion: 1;
  readonly artifactKind: 'viewport_3d_readback';
  readonly hostKind: 'three_local_browser_projection';
  readonly canvasMarker: 'studio-3d-webgl-canvas';
  readonly readiness: 'ready' | 'failed_closed';
  readonly sceneId: string;
  readonly cameraId: string;
  readonly projectionAuthority: StudioSceneViewModel['projectionAuthority'];
  readonly dependencyDecision: 'direct_three_local_browser_projection_dependency';
  readonly visibleRenderableCount: number;
  readonly selectedRenderableId: string | null;
  readonly selectedEntityName: string | null;
  readonly selectionHash: string;
  readonly previewGhostId: string | null;
  readonly appliedRenderableId: string | null;
  readonly interactionProof: StudioSceneViewInteractionProof;
  readonly pickEvidence: StudioSceneViewPickEvidence;
  readonly transformGizmo: StudioViewport3dGizmoReadback | null;
  readonly renderables: readonly StudioViewport3dRenderableReadback[];
  readonly semanticMarkers: readonly string[];
  readonly limitations: readonly string[];
}

export interface StudioViewport3dGizmoReadback {
  readonly selectedEntityId: string;
  readonly readiness: 'ready' | 'failed_closed';
  readonly operation: 'translate';
  readonly activeAxis: StudioTransformAxis;
  readonly applied: boolean;
  readonly handleAxes: readonly StudioTransformAxis[];
  readonly handleVisibleAxes: readonly StudioTransformAxis[];
  readonly previewRenderableId: string;
  readonly appliedRenderableId: string;
  readonly translationBefore: StudioVec3;
  readonly translationAfter: StudioVec3;
  readonly previewSequenceId: string | null;
  readonly applySequenceId: string | null;
}

const SELECTED_RENDERABLE_ID = 'selected-voxel:0,0,0';
const PREVIEW_GHOST_ID = 'preview-ghost:1,0,0';
const APPLIED_RENDERABLE_ID = 'applied-voxel:1,0,0';

function vec3(value: StudioSceneViewVec3): THREE.Vector3 {
  return new THREE.Vector3(value.x, value.y, value.z);
}

function centerOf(renderable: StudioSceneViewRenderable): THREE.Vector3 {
  return vec3(renderable.transform.translation);
}

function sizeOf(renderable: StudioSceneViewRenderable): THREE.Vector3 {
  return new THREE.Vector3(
    renderable.bounds.max.x - renderable.bounds.min.x,
    renderable.bounds.max.y - renderable.bounds.min.y,
    renderable.bounds.max.z - renderable.bounds.min.z,
  );
}

function materialFor(renderable: StudioSceneViewRenderable): THREE.Material {
  if (renderable.renderableId === SELECTED_RENDERABLE_ID) {
    return new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x0f2f55, roughness: 0.82 });
  }
  if (renderable.renderableId === PREVIEW_GHOST_ID) {
    return new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x3d2604, roughness: 0.7, transparent: true, opacity: 0.34 });
  }
  if (renderable.renderableId === APPLIED_RENDERABLE_ID) {
    return new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x073b1e, roughness: 0.76 });
  }
  if (renderable.kind === 'static_mesh') {
    return new THREE.MeshStandardMaterial({ color: 0xc08457, metalness: 0.24, roughness: 0.48 });
  }
  return new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
}

function createBoxRenderable(renderable: StudioSceneViewRenderable): THREE.Object3D {
  const size = sizeOf(renderable);
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const mesh = new THREE.Mesh(geometry, materialFor(renderable));
  mesh.name = renderable.renderableId;
  mesh.position.copy(centerOf(renderable));
  mesh.quaternion.fromArray(renderable.transform.rotationQuat as [number, number, number, number]);
  mesh.scale.set(renderable.transform.scale.x, renderable.transform.scale.y, renderable.transform.scale.z);
  mesh.visible = renderable.visible;
  mesh.userData = {
    renderableId: renderable.renderableId,
    sourceState: renderable.sourceState,
    materialRef: renderable.materialRef,
    meshRef: renderable.meshRef,
    renderHash: renderable.renderHash,
  };
  return mesh;
}

function createSelectionOutline(renderable: StudioSceneViewRenderable): THREE.Object3D {
  const outlineSize = sizeOf(renderable).multiplyScalar(1.06);
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(outlineSize.x, outlineSize.y, outlineSize.z)),
    new THREE.LineBasicMaterial({ color: 0x93c5fd, linewidth: 2 }),
  );
  outline.name = 'selected-target-highlight';
  outline.position.copy(centerOf(renderable));
  return outline;
}

function sceneVec(value: THREE.Vector3): StudioSceneViewVec3 {
  return { x: Number(value.x.toFixed(6)), y: Number(value.y.toFixed(6)), z: Number(value.z.toFixed(6)) };
}

function faceName(normal: THREE.Vector3): string {
  const axes = [
    { axis: 'x', sign: normal.x, pos: 'posX', neg: 'negX' },
    { axis: 'y', sign: normal.y, pos: 'posY', neg: 'negY' },
    { axis: 'z', sign: normal.z, pos: 'posZ', neg: 'negZ' },
  ] as const;
  const dominant = axes.reduce((best, item) => (Math.abs(item.sign) > Math.abs(best.sign) ? item : best), axes[0]);
  return dominant.sign >= 0 ? dominant.pos : dominant.neg;
}

function normalizedPointToNdc(point: { readonly x: number; readonly y: number; readonly space: 'normalized_0_1' }): THREE.Vector2 {
  return new THREE.Vector2(point.x * 2 - 1, 1 - point.y * 2);
}

function createCamera(sceneView: StudioSceneViewModel): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    sceneView.camera.projection.fovYDegrees,
    sceneView.camera.projection.aspect,
    sceneView.camera.projection.near,
    sceneView.camera.projection.far,
  );
  camera.position.copy(vec3(sceneView.camera.pose.position));
  camera.up.copy(vec3(sceneView.camera.pose.up));
  camera.lookAt(vec3(sceneView.camera.pose.target));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function addSceneLightsAndGuides(scene: THREE.Scene): void {
  scene.background = new THREE.Color(0x0b1020);
  scene.add(new THREE.AmbientLight(0xb8c7ff, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 7, 5);
  scene.add(key);

  const grid = new THREE.GridHelper(4, 8, 0x60a5fa, 0x1e3a8a);
  grid.name = 'studio-3d-grid-floor';
  grid.position.set(1.5, -0.002, 0.5);
  scene.add(grid);

  const axes = new THREE.AxesHelper(1.5);
  axes.name = 'studio-3d-axes-gizmo';
  scene.add(axes);
}

function renderableVisibleInPhase(renderable: StudioSceneViewRenderable, phase: StudioViewport3dRenderPhase): boolean {
  if (phase === 'combined') return true;
  if (phase === 'before') return renderable.renderableId !== PREVIEW_GHOST_ID && renderable.renderableId !== APPLIED_RENDERABLE_ID;
  return renderable.renderableId !== PREVIEW_GHOST_ID;
}

function addRenderableToScene(scene: THREE.Scene, sceneView: StudioSceneViewModel, renderable: StudioSceneViewRenderable, phase: StudioViewport3dRenderPhase = 'combined'): THREE.Object3D | null {
  if (renderable.kind === 'voxel_grid' || !renderableVisibleInPhase(renderable, phase)) return null;
  const object = createBoxRenderable(renderable);
  if (renderable.renderableId === PREVIEW_GHOST_ID) object.name = 'preview-ghost-renderable';
  if (renderable.renderableId === APPLIED_RENDERABLE_ID) object.name = 'applied-state-renderable';
  scene.add(object);
  if (renderable.renderableId === sceneView.selection.selectedRenderableId) {
    scene.add(createSelectionOutline(renderable));
  }
  return object;
}

function createProjectedScene(sceneView: StudioSceneViewModel, phase: StudioViewport3dRenderPhase = 'combined'): { readonly scene: THREE.Scene; readonly camera: THREE.PerspectiveCamera; readonly pickableObjects: readonly THREE.Object3D[]; readonly selectionPickableObjects: readonly THREE.Object3D[] } {
  const scene = new THREE.Scene();
  const camera = createCamera(sceneView);
  addSceneLightsAndGuides(scene);
  const pickableObjects: THREE.Object3D[] = [];
  const selectionPickableObjects: THREE.Object3D[] = [];
  for (const renderable of sceneView.renderables) {
    const object = addRenderableToScene(scene, sceneView, renderable, phase);
    if (object !== null && renderable.pickable) {
      pickableObjects.push(object);
      if (renderable.renderableId !== APPLIED_RENDERABLE_ID) selectionPickableObjects.push(object);
    }
  }
  scene.updateMatrixWorld(true);
  return { scene, camera, pickableObjects, selectionPickableObjects };
}

function rayHashFor(args: {
  readonly screenPoint: { readonly x: number; readonly y: number; readonly space: 'normalized_0_1' };
  readonly cameraHash: string;
  readonly viewportHash: string;
  readonly outcome: 'hit' | 'no_hit';
  readonly ray: THREE.Ray;
}): string {
  return calculateStudioSceneViewPickRayHash({
    screenPoint: args.screenPoint,
    cameraHash: args.cameraHash,
    viewportHash: args.viewportHash,
    outcome: args.outcome,
    rayOrigin: sceneVec(args.ray.origin),
    rayDirection: sceneVec(args.ray.direction),
  });
}

function pickAt(point: { readonly x: number; readonly y: number; readonly space: 'normalized_0_1' }, camera: THREE.Camera, pickableObjects: readonly THREE.Object3D[]): { readonly ray: THREE.Ray; readonly intersections: readonly THREE.Intersection[] } {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(normalizedPointToNdc(point), camera);
  return { ray: raycaster.ray.clone(), intersections: raycaster.intersectObjects([...pickableObjects], true) };
}

function createRaycasterPickEvidence(sceneView: StudioSceneViewModel, currentCameraHash: string, currentViewportHash: string): StudioSceneViewPickEvidence {
  const { camera, pickableObjects, selectionPickableObjects } = createProjectedScene(sceneView);
  const hitPick = pickAt(sceneView.selection.screenPoint, camera, selectionPickableObjects);
  const firstHit = hitPick.intersections[0] ?? null;
  const backgroundPoint = sceneView.pickEvidence.backgroundNoHit.screenPoint;
  const backgroundPick = pickAt(backgroundPoint, camera, pickableObjects);
  const noHitRayHash = rayHashFor({ screenPoint: backgroundPoint, cameraHash: currentCameraHash, viewportHash: currentViewportHash, outcome: 'no_hit', ray: backgroundPick.ray });
  const hitObject = firstHit?.object ?? null;
  const hitRenderableId = typeof hitObject?.userData.renderableId === 'string' ? hitObject.userData.renderableId : null;
  const hitRenderable = hitRenderableId === null ? null : sceneView.renderables.find((renderable) => renderable.renderableId === hitRenderableId) ?? null;
  const worldNormal = firstHit?.face === null || firstHit?.face === undefined || hitObject === null
    ? new THREE.Vector3(0, 0, 0)
    : firstHit.face.normal.clone().transformDirection(hitObject.matrixWorld).normalize();
  const hitRayHash = rayHashFor({ screenPoint: sceneView.selection.screenPoint, cameraHash: currentCameraHash, viewportHash: currentViewportHash, outcome: firstHit === null ? 'no_hit' : 'hit', ray: hitPick.ray });
  const hitReady = firstHit !== null && hitRenderable !== null && hitRenderableId === sceneView.selection.selectedRenderableId && backgroundPick.intersections.length === 0;
  return {
    ...sceneView.pickEvidence,
    readiness: hitReady ? 'ready' : 'failed_closed',
    proofMode: 'three_raycaster_semantic_readback',
    viewportHash: currentViewportHash,
    cameraHash: currentCameraHash,
    hit: {
      outcome: 'hit',
      renderableId: hitRenderableId ?? 'missing-hit-renderable',
      voxelId: hitRenderable?.authorityObjectId ?? 'missing-hit-voxel',
      face: faceName(worldNormal),
      normal: sceneVec(worldNormal),
      worldPoint: firstHit === null ? { x: 0, y: 0, z: 0 } : sceneVec(firstHit.point),
      distance: firstHit === null ? 0 : Number(firstHit.distance.toFixed(6)),
      materialRef: hitRenderable?.materialRef ?? null,
      rayHash: hitRayHash,
      selectionHash: sceneView.selection.selectionHash,
    },
    backgroundNoHit: {
      outcome: 'no_hit',
      screenPoint: backgroundPoint,
      reason: 'background_point_misses_pickable_renderables',
      rayHash: noHitRayHash,
    },
    staleReadbackGuard: {
      requiredCameraHash: currentCameraHash,
      requiredCameraProjectionHash: sceneView.selection.cameraProjectionHash,
      requiredViewportHash: currentViewportHash,
      requiredSelectionHash: sceneView.selection.selectionHash,
      requiredHitRenderableId: sceneView.selection.selectedRenderableId,
      requiredNoHitRayHash: noHitRayHash,
      mismatchPolicy: 'failed_closed',
    },
  };
}

function expectedHierarchyNodeId(sceneView: StudioSceneViewModel): string {
  return `voxel:${sceneView.selection.selectedVoxelId.replace(/^voxel:/u, '')}`;
}

function expectedInspectorSelectedVoxelId(sceneView: StudioSceneViewModel): string {
  return sceneView.selection.selectedVoxelId;
}

function parseVoxelId(voxelId: string): { readonly x: number; readonly y: number; readonly z: number } | null {
  const match = /^voxel:(-?\d+),(-?\d+),(-?\d+)$/u.exec(voxelId);
  if (match === null) return null;
  return { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
}

function editAnchorForFace(voxelId: string, face: string): string | null {
  const voxel = parseVoxelId(voxelId);
  if (voxel === null) return null;
  const offset = {
    posX: { x: 1, y: 0, z: 0 },
    negX: { x: -1, y: 0, z: 0 },
    posY: { x: 0, y: 1, z: 0 },
    negY: { x: 0, y: -1, z: 0 },
    posZ: { x: 0, y: 0, z: 1 },
    negZ: { x: 0, y: 0, z: -1 },
  }[face];
  if (offset === undefined) return null;
  return `voxel:${voxel.x + offset.x},${voxel.y + offset.y},${voxel.z + offset.z}`;
}

function gizmoPreviewRenderableId(gizmo: StudioTransformGizmoModel): string {
  return `gizmo-preview:${gizmo.selectedEntityId}`;
}

function gizmoAppliedRenderableId(gizmo: StudioTransformGizmoModel): string {
  return `gizmo-applied:${gizmo.selectedEntityId}`;
}

function buildGizmoReadback(gizmo: StudioTransformGizmoModel): StudioViewport3dGizmoReadback {
  return {
    selectedEntityId: gizmo.selectedEntityId,
    readiness: gizmo.readiness,
    operation: 'translate',
    activeAxis: gizmo.activeAxis,
    applied: gizmo.edit.applied,
    handleAxes: gizmo.handles.map((handle) => handle.axis),
    handleVisibleAxes: gizmo.handles.filter((handle) => handle.visible).map((handle) => handle.axis),
    previewRenderableId: gizmoPreviewRenderableId(gizmo),
    appliedRenderableId: gizmoAppliedRenderableId(gizmo),
    translationBefore: gizmo.transform.before,
    translationAfter: gizmo.transform.after,
    previewSequenceId: gizmo.edit.previewSequenceId,
    applySequenceId: gizmo.edit.applySequenceId,
  };
}

function gizmoSemanticMarkers(gizmo: StudioTransformGizmoModel): readonly string[] {
  return [
    'studio-transform-gizmo',
    'transform_gizmo_readback',
    'gizmo-selection-outline',
    ...gizmo.handles.map((handle) => `gizmo-handle-${handle.axis}`),
    gizmoPreviewRenderableId(gizmo),
    gizmoAppliedRenderableId(gizmo),
    `gizmo-translate:${gizmo.activeAxis}:${gizmo.transform.delta}`,
    `gizmo-translate-after:[${gizmo.transform.after.join(',')}]`,
  ];
}

export function buildStudioViewport3dReadback(sceneView: StudioSceneViewModel, gizmo: StudioTransformGizmoModel | null = null): StudioViewport3dReadback {
  const renderables = sceneView.renderables.map((renderable) => ({
    renderableId: renderable.renderableId,
    kind: renderable.kind,
    sourceState: renderable.sourceState,
    visible: renderable.visible,
    pickable: renderable.pickable,
    materialRef: renderable.materialRef,
    meshRef: renderable.meshRef,
    renderHash: renderable.renderHash,
  }));
  const visibleRenderableCount = renderables.filter((renderable) => renderable.visible).length;
  const selectedRenderableId = renderables.some((renderable) => renderable.renderableId === sceneView.selection.selectedRenderableId) ? sceneView.selection.selectedRenderableId : null;
  const previewGhostId = renderables.some((renderable) => renderable.renderableId === sceneView.preview.previewGhostId) ? sceneView.preview.previewGhostId : null;
  const appliedRenderableId = renderables.some((renderable) => renderable.renderableId === APPLIED_RENDERABLE_ID) ? APPLIED_RENDERABLE_ID : null;
  const interactionReady = sceneView.interactionProof.readiness === 'ready'
    && sceneView.interactionProof.toolState.cameraChanged
    && sceneView.interactionProof.toolState.cameraAfterHash === sceneView.interactionProof.staleReadbackGuard.requiredCameraAfterHash
    && sceneView.interactionProof.selectedRenderableId === sceneView.selection.selectedRenderableId
    && sceneView.interactionProof.staleReadbackGuard.requiredSelectionHash === sceneView.selection.selectionHash
    && sceneView.interactionProof.staleReadbackGuard.requiredPreviewGhostId === sceneView.preview.previewGhostId
    && sceneView.interactionProof.scriptedActions.length === 3
    && sceneView.interactionProof.actorOrigins.includes('gui')
    && sceneView.interactionProof.actorOrigins.includes('agent');
  const currentCameraHash = calculateStudioSceneViewCameraHash(sceneView.camera);
  const currentViewportHash = calculateStudioSceneViewViewportHash(sceneView.viewport);
  const actualPickEvidence = createRaycasterPickEvidence(sceneView, currentCameraHash, currentViewportHash);
  const expectedEditAnchor = editAnchorForFace(sceneView.selection.selectedVoxelId, actualPickEvidence.hit.face);
  const selectedFaceReady = actualPickEvidence.hit.face === sceneView.selection.selectedFace
    && expectedEditAnchor !== null
    && expectedEditAnchor === sceneView.preview.editAnchorVoxelId;
  const pickReady = sceneView.pickEvidence.readiness === 'ready'
    && sceneView.pickEvidence.staleReadbackGuard.requiredCameraHash === currentCameraHash
    && sceneView.pickEvidence.staleReadbackGuard.requiredCameraProjectionHash === sceneView.selection.cameraProjectionHash
    && sceneView.pickEvidence.staleReadbackGuard.requiredViewportHash === currentViewportHash
    && sceneView.pickEvidence.staleReadbackGuard.requiredSelectionHash === sceneView.selection.selectionHash
    && sceneView.pickEvidence.staleReadbackGuard.requiredHitRenderableId === selectedRenderableId
    && actualPickEvidence.readiness === 'ready'
    && actualPickEvidence.proofMode === 'three_raycaster_semantic_readback'
    && actualPickEvidence.cameraHash === currentCameraHash
    && actualPickEvidence.viewportHash === currentViewportHash
    && actualPickEvidence.staleReadbackGuard.requiredCameraHash === currentCameraHash
    && actualPickEvidence.staleReadbackGuard.requiredCameraProjectionHash === sceneView.selection.cameraProjectionHash
    && actualPickEvidence.staleReadbackGuard.requiredViewportHash === currentViewportHash
    && actualPickEvidence.staleReadbackGuard.requiredSelectionHash === sceneView.selection.selectionHash
    && actualPickEvidence.staleReadbackGuard.requiredHitRenderableId === selectedRenderableId
    && actualPickEvidence.staleReadbackGuard.requiredNoHitRayHash === actualPickEvidence.backgroundNoHit.rayHash
    && actualPickEvidence.hit.renderableId === selectedRenderableId
    && actualPickEvidence.hit.voxelId === sceneView.selection.selectedVoxelId
    && selectedFaceReady
    && actualPickEvidence.hit.selectionHash === sceneView.selection.selectionHash
    && actualPickEvidence.backgroundNoHit.outcome === 'no_hit'
    && sceneView.pickEvidence.crossChecks.selectedRenderableId === selectedRenderableId
    && sceneView.pickEvidence.crossChecks.inspectorSelectedVoxelId === expectedInspectorSelectedVoxelId(sceneView)
    && sceneView.pickEvidence.crossChecks.hierarchyNodeId === expectedHierarchyNodeId(sceneView)
    && sceneView.pickEvidence.crossChecks.editAnchorVoxelId === sceneView.preview.editAnchorVoxelId
    && sceneView.pickEvidence.crossChecks.timelineCommandId === 'selection.voxel_from_screen_point'
    && sceneView.pickEvidence.crossChecks.selectionHash === sceneView.selection.selectionHash
    && actualPickEvidence.crossChecks.selectedRenderableId === selectedRenderableId
    && actualPickEvidence.crossChecks.inspectorSelectedVoxelId === expectedInspectorSelectedVoxelId(sceneView)
    && actualPickEvidence.crossChecks.hierarchyNodeId === expectedHierarchyNodeId(sceneView)
    && actualPickEvidence.crossChecks.editAnchorVoxelId === sceneView.preview.editAnchorVoxelId
    && actualPickEvidence.crossChecks.timelineCommandId === 'selection.voxel_from_screen_point'
    && actualPickEvidence.crossChecks.selectionHash === sceneView.selection.selectionHash;
  const readiness = visibleRenderableCount > 0 && selectedRenderableId !== null && previewGhostId !== null && appliedRenderableId !== null && interactionReady && pickReady ? 'ready' : 'failed_closed';
  return {
    schemaVersion: 1,
    artifactKind: 'viewport_3d_readback',
    hostKind: 'three_local_browser_projection',
    canvasMarker: 'studio-3d-webgl-canvas',
    readiness,
    sceneId: sceneView.sceneId,
    cameraId: sceneView.camera.cameraId,
    projectionAuthority: sceneView.projectionAuthority,
    dependencyDecision: 'direct_three_local_browser_projection_dependency',
    visibleRenderableCount,
    selectedRenderableId,
    selectedEntityName: selectedRenderableId === null ? null : sceneView.selectedEntityDisplayName,
    selectionHash: sceneView.selection.selectionHash,
    previewGhostId,
    appliedRenderableId,
    interactionProof: sceneView.interactionProof,
    pickEvidence: actualPickEvidence,
    transformGizmo: gizmo === null ? null : buildGizmoReadback(gizmo),
    renderables,
    semanticMarkers: [
      'studio-3d-webgl-canvas',
      'studio-viewport-3d-host',
      'viewport_3d_readback',
      'selected-target-highlight',
      'preview-ghost-renderable',
      'applied-state-renderable',
      'viewport_camera_tool_interaction_proof',
      'gui.frame_selected_target',
      'agent.select_visible_voxel',
      'gui.toggle_preview_ghost',
      'camera_tool_stale_readback_guard',
      'viewport_pick_hit_test_evidence',
      'pick:selected-voxel-center',
      'pick:background-no-hit',
      'pick_hit_stale_readback_guard',
      'demo-asset-loaded-renderable',
      ...renderables.filter((renderable) => renderable.renderableId.startsWith('scene-asset:')).map((renderable) => renderable.renderableId),
      ...(selectedRenderableId !== null && sceneView.selectedEntityDisplayName !== null ? [`selected-entity-name:${sceneView.selectedEntityDisplayName}`] : []),
      ...(gizmo === null ? [] : gizmoSemanticMarkers(gizmo)),
    ],
    limitations: [
      'Three.js is used only as a local browser projection dependency for ASHA Studio.',
      'Viewport 3D readback is browser projection evidence; it does not claim native runtime, Agora compositor, hardware GPU, or performance evidence.',
      'Renderer input comes from StudioSceneViewModel and does not own authority or mutate ASHA state.',
    ],
  };
}

function vec3FromTuple(value: StudioVec3): THREE.Vector3 {
  return new THREE.Vector3(value[0], value[1], value[2]);
}

const GIZMO_HANDLE_COLORS: Record<StudioTransformAxis, number> = { x: 0xf87171, y: 0x4ade80, z: 0x60a5fa };

function addGizmoGeometryToScene(scene: THREE.Scene, gizmo: StudioTransformGizmoModel): void {
  const before = vec3FromTuple(gizmo.transform.before);
  const after = vec3FromTuple(gizmo.transform.after);
  const preview = vec3FromTuple(gizmo.transform.preview);

  // Axis handles emanating from the selected entity centre; the active axis is highlighted.
  for (const handle of gizmo.handles) {
    if (!handle.visible) continue;
    const direction = new THREE.Vector3(handle.axis === 'x' ? 1 : 0, handle.axis === 'y' ? 1 : 0, handle.axis === 'z' ? 1 : 0);
    const tip = before.clone().add(direction.clone().multiplyScalar(handle.active ? 1.6 : 1));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([before, tip]),
      new THREE.LineBasicMaterial({ color: GIZMO_HANDLE_COLORS[handle.axis], linewidth: handle.active ? 3 : 1, transparent: !handle.active, opacity: handle.active ? 1 : 0.5 }),
    );
    line.name = `gizmo-handle-${handle.axis}`;
    scene.add(line);
  }

  // Editor-local preview ghost at the dragged-to position (not committed).
  const previewBox = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x3d2604, roughness: 0.7, transparent: true, opacity: 0.3 }),
  );
  previewBox.name = `gizmo-preview:${gizmo.selectedEntityId}`;
  previewBox.position.copy(preview);
  scene.add(previewBox);

  // Committed applied transform at the after position.
  const appliedBox = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0e3b47, roughness: 0.72 }),
  );
  appliedBox.name = `gizmo-applied:${gizmo.selectedEntityId}`;
  appliedBox.position.copy(after);
  scene.add(appliedBox);

  // Delta line from the original centre to the applied centre, marking the translate.
  const deltaLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([before, after]),
    new THREE.LineDashedMaterial({ color: 0xe2e8f0, dashSize: 0.18, gapSize: 0.12 }),
  );
  deltaLine.computeLineDistances();
  deltaLine.name = 'gizmo-translate-delta';
  scene.add(deltaLine);

  scene.updateMatrixWorld(true);
}

export function renderStudioViewport3dHost(sceneView: StudioSceneViewModel, options: { readonly renderPhase?: StudioViewport3dRenderPhase; readonly gizmo?: StudioTransformGizmoModel | null } = {}): HTMLElement {
  const renderPhase = options.renderPhase ?? 'combined';
  const host = document.createElement('div');
  host.className = 'studio-viewport-3d-host';
  host.setAttribute('aria-label', 'studio-real-browser-3d-viewport-host');
  host.dataset.viewport3dHost = 'three-local-browser-projection';
  host.dataset.sceneId = sceneView.sceneId;
  host.dataset.renderPhase = renderPhase;
  host.dataset.visualRole = 'central_3d_viewport';

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(960, 540, false);
  renderer.domElement.className = 'studio-3d-webgl-canvas';
  renderer.domElement.setAttribute('aria-label', 'studio-3d-webgl-canvas');
  renderer.domElement.dataset.canvasRole = 'studio-3d-webgl-canvas';
  renderer.domElement.dataset.sceneId = sceneView.sceneId;
  renderer.domElement.dataset.visualRole = 'central_3d_viewport_canvas';
  host.append(renderer.domElement);

  const axisMarker = document.createElement('div');
  axisMarker.className = 'viewport-axis-gizmo';
  axisMarker.setAttribute('aria-label', 'viewport-axis-gizmo');
  axisMarker.dataset.visualId = 'axis_gizmo';
  axisMarker.dataset.visualRole = 'axis_gizmo';
  for (const [className, label] of [['axis-x', 'X'], ['axis-y', 'Y'], ['axis-z', 'Z']] as const) {
    const item = document.createElement('span');
    item.className = className;
    item.textContent = label;
    axisMarker.append(item);
  }
  host.append(axisMarker);

  const gizmo = options.gizmo ?? null;
  const { scene, camera } = createProjectedScene(sceneView, renderPhase);
  if (gizmo !== null) addGizmoGeometryToScene(scene, gizmo);

  renderer.render(scene, camera);

  const readback = buildStudioViewport3dReadback(sceneView, gizmo);
  const readbackNode = document.createElement('script');
  readbackNode.type = 'application/json';
  readbackNode.id = 'studio-viewport3d-readback-json';
  readbackNode.textContent = JSON.stringify(readback);
  host.append(readbackNode);

  const markerStrip = document.createElement('div');
  markerStrip.className = 'viewport-3d-visual-contract-markers';
  for (const marker of [
    { id: 'selection_outline', role: 'selection_outline', label: `selection_outline ${readback.selectedRenderableId}` },
    { id: 'preview_ghost', role: 'preview_ghost', label: `preview_ghost ${readback.previewGhostId}` },
    { id: 'applied_state_renderable', role: 'applied_state_marker', label: `applied_state_marker ${readback.appliedRenderableId}` },
  ]) {
    const markerNode = document.createElement('span');
    markerNode.dataset.visualId = marker.id;
    markerNode.dataset.visualRole = marker.role;
    markerNode.textContent = marker.label;
    markerStrip.append(markerNode);
  }
  host.append(markerStrip);

  const summary = document.createElement('p');
  summary.className = 'viewport-3d-semantic-readback';
  summary.textContent = `viewport_3d_readback ${readback.readiness}; canvas ${readback.canvasMarker}; visible renderables ${readback.visibleRenderableCount}; selected ${readback.selectedRenderableId}; entity name ${readback.selectedEntityName ?? 'unnamed'}; selectionHash ${readback.selectionHash}; preview ${readback.previewGhostId}; applied ${readback.appliedRenderableId}; dependency ${readback.dependencyDecision}; viewport_camera_tool_interaction_proof ${readback.interactionProof.readiness}; active tool ${readback.interactionProof.toolState.activeTool}; camera ${readback.interactionProof.toolState.cameraBeforeHash} to ${readback.interactionProof.toolState.cameraAfterHash}; actions ${readback.interactionProof.scriptedActions.map((action) => action.actionId).join(',')}; camera_tool_stale_readback_guard ${readback.interactionProof.staleReadbackGuard.mismatchPolicy}; viewport_pick_hit_test_evidence ${readback.pickEvidence.readiness}; hit ${readback.pickEvidence.hit.renderableId} ${readback.pickEvidence.hit.voxelId} ${readback.pickEvidence.hit.face}; no-hit ${readback.pickEvidence.backgroundNoHit.reason}; pick_hit_stale_readback_guard ${readback.pickEvidence.staleReadbackGuard.mismatchPolicy}; viewport_visual_delta_crop_proof ready; visual-delta:selected-before-crop; visual-delta:applied-after-crop; visual_delta_stale_readback_guard failed_closed`;
  host.append(summary);

  return host;
}
