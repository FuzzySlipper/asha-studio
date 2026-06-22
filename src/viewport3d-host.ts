import * as THREE from 'three';

import type {
  StudioSceneViewInteractionProof,
  StudioSceneViewModel,
  StudioSceneViewPickEvidence,
  StudioSceneViewRenderable,
  StudioSceneViewVec3,
} from './scene-view-model';
import { calculateStudioSceneViewCameraHash, calculateStudioSceneViewPickRayHash, calculateStudioSceneViewViewportHash } from './scene-view-model';

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
  readonly selectionHash: string;
  readonly previewGhostId: string | null;
  readonly appliedRenderableId: string | null;
  readonly interactionProof: StudioSceneViewInteractionProof;
  readonly pickEvidence: StudioSceneViewPickEvidence;
  readonly renderables: readonly StudioViewport3dRenderableReadback[];
  readonly semanticMarkers: readonly string[];
  readonly limitations: readonly string[];
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

function addRenderableToScene(scene: THREE.Scene, sceneView: StudioSceneViewModel, renderable: StudioSceneViewRenderable): THREE.Object3D | null {
  if (renderable.kind === 'voxel_grid') return null;
  const object = createBoxRenderable(renderable);
  if (renderable.renderableId === PREVIEW_GHOST_ID) object.name = 'preview-ghost-renderable';
  if (renderable.renderableId === APPLIED_RENDERABLE_ID) object.name = 'applied-state-renderable';
  scene.add(object);
  if (renderable.renderableId === sceneView.selection.selectedRenderableId) {
    scene.add(createSelectionOutline(renderable));
  }
  return object;
}

function createProjectedScene(sceneView: StudioSceneViewModel): { readonly scene: THREE.Scene; readonly camera: THREE.PerspectiveCamera; readonly pickableObjects: readonly THREE.Object3D[] } {
  const scene = new THREE.Scene();
  const camera = createCamera(sceneView);
  addSceneLightsAndGuides(scene);
  const pickableObjects: THREE.Object3D[] = [];
  for (const renderable of sceneView.renderables) {
    const object = addRenderableToScene(scene, sceneView, renderable);
    if (object !== null && renderable.pickable) pickableObjects.push(object);
  }
  scene.updateMatrixWorld(true);
  return { scene, camera, pickableObjects };
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
  const { camera, pickableObjects } = createProjectedScene(sceneView);
  const hitPick = pickAt(sceneView.selection.screenPoint, camera, pickableObjects);
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

export function buildStudioViewport3dReadback(sceneView: StudioSceneViewModel): StudioViewport3dReadback {
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
    && actualPickEvidence.hit.selectionHash === sceneView.selection.selectionHash
    && actualPickEvidence.backgroundNoHit.outcome === 'no_hit'
    && sceneView.pickEvidence.crossChecks.selectedRenderableId === selectedRenderableId
    && sceneView.pickEvidence.crossChecks.inspectorSelectedVoxelId === expectedInspectorSelectedVoxelId(sceneView)
    && sceneView.pickEvidence.crossChecks.hierarchyNodeId === expectedHierarchyNodeId(sceneView)
    && sceneView.pickEvidence.crossChecks.timelineCommandId === 'selection.voxel_from_screen_point'
    && sceneView.pickEvidence.crossChecks.selectionHash === sceneView.selection.selectionHash
    && actualPickEvidence.crossChecks.selectedRenderableId === selectedRenderableId
    && actualPickEvidence.crossChecks.inspectorSelectedVoxelId === expectedInspectorSelectedVoxelId(sceneView)
    && actualPickEvidence.crossChecks.hierarchyNodeId === expectedHierarchyNodeId(sceneView)
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
    selectionHash: sceneView.selection.selectionHash,
    previewGhostId,
    appliedRenderableId,
    interactionProof: sceneView.interactionProof,
    pickEvidence: actualPickEvidence,
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
    ],
    limitations: [
      'Three.js is used only as a local browser projection dependency for ASHA Studio.',
      'Viewport 3D readback is browser projection evidence; it does not claim native runtime, Agora compositor, hardware GPU, or performance evidence.',
      'Renderer input comes from StudioSceneViewModel and does not own authority or mutate ASHA state.',
    ],
  };
}

export function renderStudioViewport3dHost(sceneView: StudioSceneViewModel): HTMLElement {
  const host = document.createElement('div');
  host.className = 'studio-viewport-3d-host';
  host.setAttribute('aria-label', 'studio-real-browser-3d-viewport-host');
  host.dataset.viewport3dHost = 'three-local-browser-projection';
  host.dataset.sceneId = sceneView.sceneId;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(960, 540, false);
  renderer.domElement.className = 'studio-3d-webgl-canvas';
  renderer.domElement.setAttribute('aria-label', 'studio-3d-webgl-canvas');
  renderer.domElement.dataset.canvasRole = 'studio-3d-webgl-canvas';
  renderer.domElement.dataset.sceneId = sceneView.sceneId;
  host.append(renderer.domElement);

  const axisMarker = document.createElement('div');
  axisMarker.className = 'viewport-axis-gizmo';
  axisMarker.setAttribute('aria-label', 'viewport-axis-gizmo');
  for (const [className, label] of [['axis-x', 'X'], ['axis-y', 'Y'], ['axis-z', 'Z']] as const) {
    const item = document.createElement('span');
    item.className = className;
    item.textContent = label;
    axisMarker.append(item);
  }
  host.append(axisMarker);

  const { scene, camera } = createProjectedScene(sceneView);

  renderer.render(scene, camera);

  const readback = buildStudioViewport3dReadback(sceneView);
  const readbackNode = document.createElement('script');
  readbackNode.type = 'application/json';
  readbackNode.id = 'studio-viewport3d-readback-json';
  readbackNode.textContent = JSON.stringify(readback);
  host.append(readbackNode);

  const summary = document.createElement('p');
  summary.className = 'viewport-3d-semantic-readback';
  summary.textContent = `viewport_3d_readback ${readback.readiness}; canvas ${readback.canvasMarker}; visible renderables ${readback.visibleRenderableCount}; selected ${readback.selectedRenderableId}; selectionHash ${readback.selectionHash}; preview ${readback.previewGhostId}; applied ${readback.appliedRenderableId}; dependency ${readback.dependencyDecision}; viewport_camera_tool_interaction_proof ${readback.interactionProof.readiness}; active tool ${readback.interactionProof.toolState.activeTool}; camera ${readback.interactionProof.toolState.cameraBeforeHash} to ${readback.interactionProof.toolState.cameraAfterHash}; actions ${readback.interactionProof.scriptedActions.map((action) => action.actionId).join(',')}; camera_tool_stale_readback_guard ${readback.interactionProof.staleReadbackGuard.mismatchPolicy}; viewport_pick_hit_test_evidence ${readback.pickEvidence.readiness}; hit ${readback.pickEvidence.hit.renderableId} ${readback.pickEvidence.hit.voxelId} ${readback.pickEvidence.hit.face}; no-hit ${readback.pickEvidence.backgroundNoHit.reason}; pick_hit_stale_readback_guard ${readback.pickEvidence.staleReadbackGuard.mismatchPolicy}`;
  host.append(summary);

  return host;
}
