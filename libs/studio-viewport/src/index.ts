import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import type { AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import type {
  StudioBounds,
  StudioEntitySourceState,
  StudioRenderableKind,
  StudioVec3,
  StudioViewportAdapterReadModel,
  StudioViewportHitFace,
  StudioViewportRenderableAdapter,
  StudioViewportToolMode,
} from '@asha-studio/domain';
import { buildStudioViewportHitReadModel } from '@asha-studio/domain';
import { StudioWorkspaceStore } from '@asha-studio/store';
import * as THREE from 'three';

function center(bounds: StudioBounds): StudioVec3 {
  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
}

function size(bounds: StudioBounds): StudioVec3 {
  return {
    x: Math.max(0.04, bounds.max.x - bounds.min.x),
    y: Math.max(0.04, bounds.max.y - bounds.min.y),
    z: Math.max(0.04, bounds.max.z - bounds.min.z),
  };
}

function toThreePosition(vector: StudioVec3): THREE.Vector3 {
  return new THREE.Vector3(vector.x, vector.z, vector.y);
}

function fromThreePosition(vector: THREE.Vector3): StudioVec3 {
  return { x: vector.x, y: vector.z, z: vector.y };
}

function faceFromThreeNormal(normal: THREE.Vector3 | null): StudioViewportHitFace {
  if (normal === null) {
    return 'z_max';
  }
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  if (absX >= absY && absX >= absZ) {
    return normal.x < 0 ? 'x_min' : 'x_max';
  }
  if (absZ >= absX && absZ >= absY) {
    return normal.z < 0 ? 'y_min' : 'y_max';
  }
  return normal.y < 0 ? 'z_min' : 'z_max';
}

function materialColor(
  kind: StudioRenderableKind,
  sourceState: StudioEntitySourceState,
  selected: boolean,
): THREE.ColorRepresentation {
  if (selected) {
    return '#d4953f';
  }
  if (kind === 'preview_ghost' || sourceState === 'pending') {
    return '#54c7bd';
  }
  if (kind === 'static_mesh') {
    return '#c98e4d';
  }
  if (kind === 'voxel_grid') {
    return '#29475a';
  }
  return '#b57a34';
}

function materialOpacity(renderable: StudioViewportRenderableAdapter): number {
  if (renderable.kind === 'voxel_grid') {
    return 0.18;
  }
  if (renderable.kind === 'preview_ghost') {
    return 0.36;
  }
  return 0.9;
}

function cursorForTool(tool: StudioViewportToolMode, dragging: boolean): string {
  if (dragging) {
    return 'grabbing';
  }
  if (tool === 'orbit' || tool === 'pan') {
    return 'grab';
  }
  if (tool === 'move_object' || tool === 'rotate_object') {
    return 'move';
  }
  if (tool === 'select') {
    return 'crosshair';
  }
  return 'default';
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse(child => {
    const maybeMesh = child as THREE.Mesh;
    const geometry = maybeMesh.geometry;
    if (geometry instanceof THREE.BufferGeometry) {
      geometry.dispose();
    }
    const material = maybeMesh.material;
    if (Array.isArray(material)) {
      for (const entry of material) {
        entry.dispose();
      }
    } else if (material instanceof THREE.Material) {
      material.dispose();
    }
  });
}

function createRaycastDebugMarker(point: THREE.Vector3): THREE.Object3D {
  const group = new THREE.Group();
  group.position.copy(point);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 8),
    new THREE.MeshBasicMaterial({ color: '#ff3b30' }),
  );
  group.add(sphere);

  const lineMaterial = new THREE.LineBasicMaterial({ color: '#ff3b30' });
  const lineLength = 0.18;
  const axes: readonly [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(-lineLength, 0, 0), new THREE.Vector3(lineLength, 0, 0)],
    [new THREE.Vector3(0, -lineLength, 0), new THREE.Vector3(0, lineLength, 0)],
    [new THREE.Vector3(0, 0, -lineLength), new THREE.Vector3(0, 0, lineLength)],
  ];
  for (const [start, end] of axes) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    group.add(new THREE.Line(geometry, lineMaterial.clone()));
  }

  return group;
}

@Component({
  selector: 'asha-studio-viewport',
  standalone: true,
  template: `
    <section class="viewport-scene" data-visual-id="studio-viewport">
      <div class="viewport-scene__header">
        <span>4 · 3D Viewport / Scene View</span>
        <strong>{{ store.viewportAdapter().sceneId }}</strong>
      </div>

      <div
        #host
        class="viewport-scene__host"
        aria-label="Three dimensional scene viewport"
      >
        @if (store.viewportAdapter().renderSettings.showReadbackOverlay) {
          <div class="viewport-readback">
            <span>selected target</span>
            <strong>{{ store.viewportAdapter().selectedRenderableId ?? 'none' }}</strong>
            @if (store.viewportHit(); as hit) {
              <span class="viewport-readback__hit">
                face {{ hit.face }} ·
                @if (hit.voxelCoord) {
                  voxel {{ hit.voxelCoord.x }},{{ hit.voxelCoord.y }},{{ hit.voxelCoord.z }}
                } @else {
                  no voxel
                }
              </span>
            }
            <small>{{ store.viewportAdapter().readbackHash }}</small>
          </div>
        }

        <div class="axis-gizmo" aria-hidden="true">
          <span class="axis-gizmo__x">X</span>
          <span class="axis-gizmo__y">Y</span>
          <span class="axis-gizmo__z">Z</span>
        </div>
      </div>

      <footer class="viewport-scene__footer">
        <span>{{ store.viewportAdapter().camera.cameraHash }}</span>
        <span>{{ store.viewportAdapter().tool.activeTool }}</span>
        <span>{{ store.viewportAdapter().sceneHash }}</span>
      </footer>
    </section>
  `,
  styles: [
    `
      .viewport-scene {
        background: var(--asha-color-viewport);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.45rem;
        grid-template-rows: auto minmax(0, 1fr) auto;
        height: 100%;
        min-height: 0;
        min-width: 0;
        overflow: hidden;
        padding: 0.65rem;
      }

      .viewport-scene__header,
      .viewport-scene__footer {
        align-items: center;
        color: var(--asha-color-muted);
        display: flex;
        font-size: 0.68rem;
        gap: 0.75rem;
        justify-content: space-between;
        min-width: 0;
        text-transform: uppercase;
      }

      .viewport-scene__header strong,
      .viewport-scene__footer span {
        flex: 1 1 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .viewport-scene__footer span:last-child {
        text-align: right;
      }

      .viewport-scene__host {
        background: var(--asha-color-viewport-deep);
        border: 1px solid #24313b;
        box-sizing: border-box;
        contain: layout paint;
        isolation: isolate;
        min-height: 0;
        min-width: 0;
        overflow: hidden;
        position: relative;
      }

      .viewport-readback {
        background: rgba(11, 17, 23, 0.9);
        border: 1px solid rgba(84, 199, 189, 0.45);
        bottom: 1rem;
        color: var(--asha-color-muted);
        display: grid;
        font-size: 0.68rem;
        gap: 0.18rem;
        left: 50%;
        max-width: min(36rem, calc(100% - 2rem));
        min-width: 17rem;
        padding: 0.4rem 0.55rem;
        position: absolute;
        transform: translateX(-50%);
      }

      .viewport-readback strong,
      .viewport-readback small {
        color: var(--asha-color-ink);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .viewport-readback small {
        color: var(--asha-color-muted);
      }

      .viewport-readback__hit {
        color: var(--asha-color-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .axis-gizmo {
        bottom: 1rem;
        display: grid;
        gap: 0.25rem;
        grid-template-columns: repeat(3, 1.4rem);
        left: 1rem;
        position: absolute;
      }

      .axis-gizmo span {
        align-items: center;
        background: rgba(11, 17, 23, 0.82);
        border: 1px solid var(--asha-color-border);
        display: inline-flex;
        font-size: 0.65rem;
        font-weight: 800;
        height: 1.4rem;
        justify-content: center;
      }

      .axis-gizmo__x {
        color: #ff7b7b;
      }

      .axis-gizmo__y {
        color: #75dc86;
      }

      .axis-gizmo__z {
        color: #77a7ff;
      }

      @media (max-width: 900px) {
        .viewport-readback {
          left: auto;
          min-width: 0;
          right: 1rem;
          transform: none;
          width: calc(100% - 6.5rem);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioViewportComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(StudioWorkspaceStore);

  @ViewChild('host', { static: true }) private hostRef?: ElementRef<HTMLDivElement>;

  private readonly scene = new THREE.Scene();
  private readonly renderableGroup = new THREE.Group();
  private readonly raycastDebugGroup = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private hostElement: HTMLDivElement | null = null;
  private animationFrameId: number | null = null;
  private renderedWidth = 0;
  private renderedHeight = 0;
  private renderedSceneKey: string | null = null;
  private readonly raycastDebugTimers = new Set<ReturnType<typeof setTimeout>>();
  private dragState: {
    readonly pointerId: number;
    readonly tool: Extract<StudioViewportToolMode, 'orbit' | 'pan' | 'move_object' | 'rotate_object'>;
    readonly startX: number;
    readonly startY: number;
    readonly x: number;
    readonly y: number;
  } | null = null;

  private readonly adapterEffect = effect(() => {
    const adapter = this.store.viewportAdapter();
    this.syncViewport(adapter);
  });

  ngAfterViewInit(): void {
    const hostElement = this.hostRef?.nativeElement;
    if (hostElement === undefined) {
      return;
    }

    this.hostElement = hostElement;
    this.initializeThree(hostElement);
    this.syncViewport(this.store.viewportAdapter());
    this.startRenderLoop();
  }

  ngOnDestroy(): void {
    this.adapterEffect.destroy();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver !== null) {
      this.resizeObserver.disconnect();
    }
    if (this.renderer !== null) {
      this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
      this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
      this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
      this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerUp);
      this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
      this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    for (const timer of this.raycastDebugTimers) {
      clearTimeout(timer);
    }
    disposeObject(this.renderableGroup);
    disposeObject(this.raycastDebugGroup);
  }

  private initializeThree(hostElement: HTMLDivElement): void {
    this.scene.background = new THREE.Color('#101820');
    this.scene.add(this.renderableGroup);
    this.scene.add(this.raycastDebugGroup);
    this.scene.add(new THREE.AmbientLight('#f1f5f4', 0.68));

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.4);
    keyLight.position.set(4, 6, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#54c7bd', 0.65);
    fillLight.position.set(-4, 3, -3);
    this.scene.add(fillLight);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    Object.assign(renderer.domElement.style, {
      display: 'block',
      height: '100%',
      inset: '0',
      position: 'absolute',
      touchAction: 'none',
      width: '100%',
    });
    renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', this.handlePointerUp);
    renderer.domElement.addEventListener('contextmenu', this.handleContextMenu);
    renderer.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
    hostElement.append(renderer.domElement);
    this.renderer = renderer;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
    camera.up.set(0, 1, 0);
    this.camera = camera;

    this.resizeObserver = new ResizeObserver(() => this.resizeRenderer());
    this.resizeObserver.observe(hostElement);
    this.resizeRenderer();
  }

  private syncViewport(adapter: StudioViewportAdapterReadModel): void {
    if (this.camera === null || this.renderer === null) {
      return;
    }

    this.camera.position.copy(toThreePosition(adapter.camera.position));
    this.camera.up.copy(toThreePosition(adapter.camera.up));
    this.camera.fov = adapter.camera.fovDegrees;
    this.camera.near = adapter.camera.near;
    this.camera.far = adapter.camera.far;
    this.camera.lookAt(toThreePosition(adapter.camera.target));
    this.camera.updateProjectionMatrix();
    this.renderer.domElement.style.cursor = cursorForTool(
      adapter.tool.activeTool,
      this.dragState !== null,
    );

    const sceneKey = [
      adapter.sceneHash,
      adapter.selectedRenderableId ?? 'none',
      adapter.renderSettings.renderSettingsHash,
    ].join(':');
    if (sceneKey !== this.renderedSceneKey) {
      this.rebuildRenderables(adapter);
      this.renderedSceneKey = sceneKey;
    }
    this.renderFrame();
  }

  private rebuildRenderables(adapter: StudioViewportAdapterReadModel): void {
    for (const child of this.renderableGroup.children) {
      disposeObject(child);
    }
    this.renderableGroup.clear();

    for (const renderable of adapter.renderables) {
      if (!renderable.visible) {
        continue;
      }
      if (!adapter.renderSettings.showPreviewGhosts && renderable.kind === 'preview_ghost') {
        continue;
      }
      const object = this.createRenderableObject(renderable, adapter.renderSettings.wireframeEnabled);
      this.renderableGroup.add(object);
    }

    if (adapter.renderSettings.showGrid) {
      const grid = new THREE.GridHelper(4, 16, '#365866', '#223846');
      grid.position.set(1.5, -0.04, 1.5);
      this.renderableGroup.add(grid);
    }
  }

  private createRenderableObject(
    renderable: StudioViewportRenderableAdapter,
    wireframeEnabled: boolean,
  ): THREE.Object3D {
    const renderableCenter = center(renderable.bounds);
    const renderableSize = size(renderable.bounds);
    const geometry = new THREE.BoxGeometry(
      renderableSize.x,
      renderable.kind === 'voxel_grid' ? 0.04 : renderableSize.z,
      renderableSize.y,
    );
    const material = new THREE.MeshStandardMaterial({
      color: materialColor(renderable.kind, renderable.sourceState, renderable.selected),
      opacity: materialOpacity(renderable),
      roughness: 0.72,
      transparent: materialOpacity(renderable) < 1,
      wireframe: wireframeEnabled || renderable.kind === 'preview_ghost',
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(toThreePosition(renderableCenter));
    mesh.userData = { renderableId: renderable.renderableId };

    if (renderable.selected) {
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: '#54c7bd' }),
      );
      outline.position.copy(mesh.position);
      outline.scale.setScalar(1.035);
      outline.userData = { renderableId: renderable.renderableId };
      const group = new THREE.Group();
      group.add(mesh);
      group.add(outline);
      group.userData = { renderableId: renderable.renderableId };
      return group;
    }

    return mesh;
  }

  private resizeRenderer(): void {
    if (this.hostElement === null || this.renderer === null || this.camera === null) {
      return;
    }
    const rect = this.hostElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    if (width === this.renderedWidth && height === this.renderedHeight) {
      return;
    }
    this.renderedWidth = width;
    this.renderedHeight = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderFrame();
  }

  private startRenderLoop(): void {
    const tick = () => {
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  private renderFrame(): void {
    if (this.renderer === null || this.camera === null) {
      return;
    }
    this.renderer.render(this.scene, this.camera);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.renderer === null || this.camera === null) {
      return;
    }
    const activeTool = this.store.viewportTool().activeTool;
    const dragTool =
      event.button === 2
        ? 'orbit'
        : activeTool === 'orbit'
          || activeTool === 'pan'
          || activeTool === 'move_object'
          || activeTool === 'rotate_object'
          ? activeTool
          : null;
    if (dragTool !== null) {
      event.preventDefault();
      this.dragState = {
        pointerId: event.pointerId,
        tool: dragTool,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
      };
      this.renderer.domElement.style.cursor = cursorForTool(dragTool, true);
      this.renderer.domElement.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) {
      return;
    }

    this.selectAtPointer(event);
  };

  private selectAtPointer(event: PointerEvent): void {
    if (this.renderer === null || this.camera === null) {
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersections = this.raycaster.intersectObjects(this.renderableGroup.children, true);
    const hit = intersections.find(intersection =>
      typeof intersection.object.userData['renderableId'] === 'string',
    );
    if (hit !== undefined && typeof hit.object.userData['renderableId'] === 'string') {
      if (this.store.renderSettings().showRaycastHitDebug) {
        this.addRaycastDebugMarker(hit.point);
      }
      const renderableId = hit.object.userData['renderableId'];
      const renderable = this.store
        .workspace()
        .scene.renderables.find(item => item.renderableId === renderableId);
      if (renderable !== undefined && renderable.pickable) {
        this.store.selectViewportHit(
          buildStudioViewportHitReadModel({
            renderable,
            face: faceFromThreeNormal(hit.face?.normal ?? null),
            worldPosition: fromThreePosition(hit.point),
          }),
        );
      }
    }
  }

  private addRaycastDebugMarker(point: THREE.Vector3): void {
    const marker = createRaycastDebugMarker(point);
    this.raycastDebugGroup.add(marker);
    this.renderFrame();
    const timer = setTimeout(() => {
      this.raycastDebugGroup.remove(marker);
      disposeObject(marker);
      this.raycastDebugTimers.delete(timer);
      this.renderFrame();
    }, 10_000);
    this.raycastDebugTimers.add(timer);
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const dragState = this.dragState;
    if (dragState === null || dragState.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const delta = {
      deltaX: event.clientX - dragState.x,
      deltaY: event.clientY - dragState.y,
    };

    if (dragState.tool === 'orbit') {
      this.store.orbitViewportCamera(delta);
    } else if (dragState.tool === 'pan') {
      this.store.panViewportCamera(delta);
    }
    this.dragState = {
      ...dragState,
      x: event.clientX,
      y: event.clientY,
    };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const dragState = this.dragState;
    if (dragState?.pointerId !== event.pointerId || this.renderer === null) {
      return;
    }
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId);
    }
    const totalDeltaX = event.clientX - dragState.startX;
    const totalDeltaY = event.clientY - dragState.startY;
    if (dragState.tool === 'move_object' && Math.hypot(totalDeltaX, totalDeltaY) >= 2) {
      this.store.translateSelectedSceneObject([
        totalDeltaX / 160,
        -totalDeltaY / 160,
        0,
      ]);
    } else if (dragState.tool === 'rotate_object' && Math.abs(totalDeltaX) >= 2) {
      const radians = totalDeltaX / 180;
      this.store.rotateSelectedSceneObject([
        0,
        Math.sin(radians / 2),
        0,
        Math.cos(radians / 2),
      ]);
    } else if (dragState.tool === 'move_object' || dragState.tool === 'rotate_object') {
      this.selectAtPointer(event);
    }
    this.dragState = null;
    this.renderer.domElement.style.cursor = cursorForTool(
      this.store.viewportTool().activeTool,
      false,
    );
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.store.zoomViewportCamera(event.deltaY);
  };

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
