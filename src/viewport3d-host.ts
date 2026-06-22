import * as THREE from 'three';

import type {
  StudioSceneViewInteractionProof,
  StudioSceneViewModel,
  StudioSceneViewRenderable,
  StudioSceneViewVec3,
} from './scene-view-model';

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
  const readiness = visibleRenderableCount > 0 && selectedRenderableId !== null && previewGhostId !== null && appliedRenderableId !== null && interactionReady ? 'ready' : 'failed_closed';
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  const camera = new THREE.PerspectiveCamera(
    sceneView.camera.projection.fovYDegrees,
    sceneView.camera.projection.aspect,
    sceneView.camera.projection.near,
    sceneView.camera.projection.far,
  );
  camera.position.copy(vec3(sceneView.camera.pose.position));
  camera.up.copy(vec3(sceneView.camera.pose.up));
  camera.lookAt(vec3(sceneView.camera.pose.target));

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

  for (const renderable of sceneView.renderables) {
    if (renderable.kind === 'voxel_grid') continue;
    const object = createBoxRenderable(renderable);
    if (renderable.renderableId === PREVIEW_GHOST_ID) object.name = 'preview-ghost-renderable';
    if (renderable.renderableId === APPLIED_RENDERABLE_ID) object.name = 'applied-state-renderable';
    scene.add(object);
    if (renderable.renderableId === sceneView.selection.selectedRenderableId) {
      scene.add(createSelectionOutline(renderable));
    }
  }

  renderer.render(scene, camera);

  const readback = buildStudioViewport3dReadback(sceneView);
  const readbackNode = document.createElement('script');
  readbackNode.type = 'application/json';
  readbackNode.id = 'studio-viewport3d-readback-json';
  readbackNode.textContent = JSON.stringify(readback);
  host.append(readbackNode);

  const summary = document.createElement('p');
  summary.className = 'viewport-3d-semantic-readback';
  summary.textContent = `viewport_3d_readback ${readback.readiness}; canvas ${readback.canvasMarker}; visible renderables ${readback.visibleRenderableCount}; selected ${readback.selectedRenderableId}; selectionHash ${readback.selectionHash}; preview ${readback.previewGhostId}; applied ${readback.appliedRenderableId}; dependency ${readback.dependencyDecision}; viewport_camera_tool_interaction_proof ${readback.interactionProof.readiness}; active tool ${readback.interactionProof.toolState.activeTool}; camera ${readback.interactionProof.toolState.cameraBeforeHash} to ${readback.interactionProof.toolState.cameraAfterHash}; actions ${readback.interactionProof.scriptedActions.map((action) => action.actionId).join(',')}; camera_tool_stale_readback_guard ${readback.interactionProof.staleReadbackGuard.mismatchPolicy}`;
  host.append(summary);

  return host;
}
