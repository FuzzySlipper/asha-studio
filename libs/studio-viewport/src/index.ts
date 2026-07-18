import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import type { AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import type {
  CameraSnapshot,
  Material,
  RenderDiff,
  RenderFrameDiff,
  RenderHandle,
  RenderNode,
  Transform,
} from '@asha/contracts';
import { renderHandle } from '@asha/contracts';
import {
  DEFAULT_TRANSFORM_MANIPULATOR_SNAPPING,
  beginTransformManipulatorDrag,
  cancelTransformManipulatorDrag,
  projectTransformManipulator,
  transformManipulatorHandleFromId,
  updateTransformManipulatorDrag,
  type TransformManipulatorCandidate,
  type TransformManipulatorDrag,
  type TransformManipulatorHandle,
  type TransformManipulatorMode,
} from '@asha/editor-tools';
import type {
  AshaRendererEditorViewport,
  AshaRendererEditorViewportCamera,
  AshaRendererEditorViewportPickHint,
  AshaRendererEditorViewportReadout,
} from '@asha/renderer-host';
import {
  mountAshaRendererEditorViewport,
  resolveAshaStoredEditorCamera,
} from '@asha/renderer-host';
import type {
  StudioBounds,
  StudioEntitySourceState,
  StudioRenderableKind,
  StudioViewportAdapterReadModel,
  StudioViewportHitFace,
  StudioViewportRenderableAdapter,
  StudioViewportToolMode,
} from '@asha-studio/domain';
import {
  buildStudioViewportHitReadModel,
  composeStudioSceneTransform,
  deriveStudioSceneLocalTransform,
} from '@asha-studio/domain';
import {
  StudioWorkspaceStore,
  type StudioWorkspaceProjectionDelivery,
} from '@asha-studio/store';
import { applyStudioTranslationGridSnap } from './grid-snapping.js';
import {
  hasStudioCameraMovement,
  isStudioCameraMovementCode,
  resolveStudioCameraMovementAxes,
} from './scene-camera-controls.js';
import { resolveStudioViewportPickRoute } from './viewport-pick-routing.js';
import { projectStudioAuthoredRenderableTransform } from './authored-scene-projection.js';

export {
  resolveStudioViewportPickRoute,
  type StudioRuntimeViewportPickAnchor,
  type StudioViewportPickRoute,
} from './viewport-pick-routing.js';

export { applyStudioTranslationGridSnap } from './grid-snapping.js';
export { projectStudioAuthoredRenderableTransform } from './authored-scene-projection.js';
export {
  hasStudioCameraMovement,
  isStudioCameraMovementCode,
  resolveStudioCameraMovementAxes,
} from './scene-camera-controls.js';

type StudioRenderColor = readonly [number, number, number];

interface StudioVoxelBrushOverlay {
  readonly transform: Transform;
  readonly tool: 'select' | 'add' | 'paint' | 'erase';
}

interface StudioVoxelPointerTarget {
  readonly coord: { readonly x: number; readonly y: number; readonly z: number };
  readonly instanceId: string;
  readonly overlay: StudioVoxelBrushOverlay;
}

class AuthoredVoxelProjectionPickIndex {
  private readonly instanceByRoot = new Map<number, string>();
  private readonly rootByChild = new Map<number, number>();
  private readonly transformByHandle = new Map<number, Transform>();
  private readonly meshBoundsByChild = new Map<number, StudioBounds>();

  replace(frame: RenderFrameDiff): void {
    this.clear();
    this.apply(frame);
  }

  apply(frame: RenderFrameDiff): void {
    for (const op of frame.ops) {
      if (op.op === 'create') {
        const handle = op.handle as number;
        this.transformByHandle.set(handle, op.node.transform);
        const label = op.node.metadata.label;
        const match = label?.match(/^voxel instance (\S+) asset /);
        if (match?.[1] !== undefined) {
          this.instanceByRoot.set(handle, match[1]);
        }
        if (op.parent !== null) {
          this.rootByChild.set(handle, op.parent as number);
        }
      } else if (op.op === 'update' && op.transform !== null) {
        this.transformByHandle.set(op.handle as number, op.transform);
      } else if (op.op === 'replaceMeshPayload') {
        this.meshBoundsByChild.set(op.handle as number, {
          min: {
            x: op.payload.bounds.min[0],
            y: op.payload.bounds.min[1],
            z: op.payload.bounds.min[2],
          },
          max: {
            x: op.payload.bounds.max[0],
            y: op.payload.bounds.max[1],
            z: op.payload.bounds.max[2],
          },
        });
      } else if (op.op === 'destroy') {
        const handle = op.handle as number;
        this.instanceByRoot.delete(handle);
        this.rootByChild.delete(handle);
        this.transformByHandle.delete(handle);
        this.meshBoundsByChild.delete(handle);
        for (const [child, root] of this.rootByChild) {
          if (root === handle) {
            this.rootByChild.delete(child);
            this.transformByHandle.delete(child);
            this.meshBoundsByChild.delete(child);
          }
        }
      }
    }
  }

  instanceForHandle(handle: RenderHandle): string | null {
    const raw = handle as number;
    return this.instanceByRoot.get(raw)
      ?? this.instanceByRoot.get(this.rootByChild.get(raw) ?? -1)
      ?? null;
  }

  projectionForInstance(instanceId: string): {
    readonly handle: RenderHandle;
    readonly transform: Transform;
  } | null {
    const entry = [...this.instanceByRoot.entries()].find(([, candidate]) => candidate === instanceId);
    if (entry === undefined) return null;
    const transform = this.transformByHandle.get(entry[0]);
    return transform === undefined
      ? null
      : { handle: renderHandle(entry[0]), transform };
  }

  brushOverlay(
    instanceId: string,
    coord: { readonly x: number; readonly y: number; readonly z: number },
    size: 1 | 3,
    tool: StudioVoxelBrushOverlay['tool'],
  ): StudioVoxelBrushOverlay | null {
    const root = [...this.instanceByRoot.entries()].find(([, candidate]) => candidate === instanceId)?.[0];
    if (root === undefined) return null;
    const transform = this.transformByHandle.get(root);
    if (transform === undefined) return null;
    return {
      tool,
      transform: {
        translation: transformProjectionPoint(transform, [
          coord.x + 0.5,
          coord.y + 0.5,
          coord.z + 0.5,
        ]),
        rotation: transform.rotation,
        scale: [
          transform.scale[0] * size * 1.01,
          transform.scale[1] * size * 1.01,
          transform.scale[2] * size * 1.01,
        ],
      },
    };
  }

  voxelChunkHandles(): readonly RenderHandle[] {
    return [...this.rootByChild.keys()].map(handle => renderHandle(handle));
  }

  clear(): void {
    this.instanceByRoot.clear();
    this.rootByChild.clear();
    this.transformByHandle.clear();
    this.meshBoundsByChild.clear();
  }

  instanceBounds(): readonly (readonly [string, StudioBounds])[] {
    const result: Array<readonly [string, StudioBounds]> = [];
    for (const [root, instanceId] of this.instanceByRoot) {
      const rootTransform = this.transformByHandle.get(root);
      if (rootTransform === undefined) continue;
      const points: Array<readonly [number, number, number]> = [];
      for (const [child, parent] of this.rootByChild) {
        if (parent !== root) continue;
        const childTransform = this.transformByHandle.get(child);
        const bounds = this.meshBoundsByChild.get(child);
        if (childTransform === undefined || bounds === undefined) continue;
        for (const x of [bounds.min.x, bounds.max.x]) {
          for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
              points.push(transformProjectionPoint(
                rootTransform,
                transformProjectionPoint(childTransform, [x, y, z]),
              ));
            }
          }
        }
      }
      if (points.length === 0) continue;
      result.push([instanceId, {
        min: {
          x: Math.min(...points.map(point => point[0])),
          y: Math.min(...points.map(point => point[1])),
          z: Math.min(...points.map(point => point[2])),
        },
        max: {
          x: Math.max(...points.map(point => point[0])),
          y: Math.max(...points.map(point => point[1])),
          z: Math.max(...points.map(point => point[2])),
        },
      }]);
    }
    return result;
  }
}

function transformProjectionPoint(
  transform: Transform,
  point: readonly [number, number, number],
): readonly [number, number, number] {
  const scaled = [
    point[0] * transform.scale[0],
    point[1] * transform.scale[1],
    point[2] * transform.scale[2],
  ] as const;
  const [x, y, z, w] = transform.rotation;
  const length = Math.hypot(x, y, z, w);
  const qx = x / length;
  const qy = y / length;
  const qz = z / length;
  const qw = w / length;
  const tx = 2 * (qy * scaled[2] - qz * scaled[1]);
  const ty = 2 * (qz * scaled[0] - qx * scaled[2]);
  const tz = 2 * (qx * scaled[1] - qy * scaled[0]);
  const rotated: readonly [number, number, number] = [
    scaled[0] + qw * tx + (qy * tz - qz * ty),
    scaled[1] + qw * ty + (qz * tx - qx * tz),
    scaled[2] + qw * tz + (qx * ty - qy * tx),
  ];
  return [
    rotated[0] + transform.translation[0],
    rotated[1] + transform.translation[1],
    rotated[2] + transform.translation[2],
  ];
}

function faceFromProjectionNormal(
  normal: readonly [number, number, number] | null,
): StudioViewportHitFace {
  if (normal === null) {
    return 'z_max';
  }
  const absX = Math.abs(normal[0]);
  const absY = Math.abs(normal[1]);
  const absZ = Math.abs(normal[2]);
  if (absX >= absY && absX >= absZ) {
    return normal[0] < 0 ? 'x_min' : 'x_max';
  }
  if (absY >= absX && absY >= absZ) {
    return normal[1] < 0 ? 'y_min' : 'y_max';
  }
  return normal[2] < 0 ? 'z_min' : 'z_max';
}

function materialColor(
  kind: StudioRenderableKind,
  sourceState: StudioEntitySourceState,
  selected: boolean,
): StudioRenderColor {
  if (selected) {
    return [0.658, 0.301, 0.08];
  }
  if (kind === 'preview_ghost' || sourceState === 'pending') {
    return [0.089, 0.571, 0.509];
  }
  if (kind === 'static_mesh') {
    return [0.584, 0.27, 0.074];
  }
  if (kind === 'voxel_grid') {
    return [0.022, 0.063, 0.102];
  }
  return [0.462, 0.195, 0.034];
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

function renderableMaterial(
  renderable: StudioViewportRenderableAdapter,
  wireframeEnabled: boolean,
): Material {
  const color = materialColor(renderable.kind, renderable.sourceState, renderable.selected);
  return {
    color: [
      color[0],
      color[1],
      color[2],
      materialOpacity(renderable),
    ],
    wireframe: wireframeEnabled || renderable.kind === 'preview_ghost',
  };
}

function renderableTransform(renderable: StudioViewportRenderableAdapter): Transform {
  return projectStudioAuthoredRenderableTransform(renderable);
}

function renderableNode(
  renderable: StudioViewportRenderableAdapter,
  wireframeEnabled: boolean,
): RenderNode {
  return {
    geometry: { shape: 'cube' },
    material: renderableMaterial(renderable, wireframeEnabled),
    transform: renderableTransform(renderable),
    visible: true,
    layer: 'scene',
    metadata: {
      source: null,
      tags: [],
      label: renderable.renderableId,
    },
  };
}

function buildViewportProjectionFrame(
  adapter: StudioViewportAdapterReadModel,
  materialPreviewFrame: RenderFrameDiff | null,
  environmentPreviewFrame: RenderFrameDiff | null,
  lightingFrame: RenderFrameDiff,
): RenderFrameDiff {
  const ops: RenderDiff[] = [];
  let handle = 1_000_001;
  for (const renderable of adapter.renderables) {
    if (!renderable.visible) {
      continue;
    }
    // VoxelVolume scene nodes are durable references. Their geometry arrives
    // through WorkspaceAuthoringFacade.readProjection(), never a Studio cube.
    if (renderable.kind === 'voxel_grid') {
      continue;
    }
    if (!adapter.renderSettings.showPreviewGhosts && renderable.kind === 'preview_ghost') {
      continue;
    }
    ops.push({
      op: 'create',
      handle: renderHandle(handle),
      parent: null,
      node: renderableNode(renderable, adapter.renderSettings.wireframeEnabled),
    });
    handle += 1;
  }
  if (materialPreviewFrame !== null) {
    ops.push(...remapRenderFrameHandles(materialPreviewFrame, 2_000_000).ops);
  }
  if (environmentPreviewFrame !== null) {
    ops.push(...remapRenderFrameHandles(environmentPreviewFrame, 3_000_000).ops);
  }
  ops.push(...lightingFrame.ops);
  return { ops };
}

function remapRenderFrameHandles(frame: RenderFrameDiff, offset: number): RenderFrameDiff {
  const remap = (handle: RenderHandle): RenderHandle => renderHandle((handle as number) + offset);
  return {
    ops: frame.ops.map((op): RenderDiff => {
      switch (op.op) {
        case 'create':
        case 'createStaticMeshInstance':
        case 'createAnimatedMeshInstance':
        case 'createSprite':
        case 'createLight':
          return { ...op, handle: remap(op.handle), parent: op.parent === null ? null : remap(op.parent) };
        case 'update':
        case 'destroy':
        case 'replaceMeshPayload':
        case 'setMaterialInstanceParameters':
        case 'setAnimatedMeshPlayback':
        case 'updateSprite':
        case 'updateLight':
          return { ...op, handle: remap(op.handle) };
        default:
          return op;
      }
    }),
  };
}

function createdRenderHandles(frame: RenderFrameDiff): readonly RenderHandle[] {
  return frame.ops.flatMap(op => (
    op.op === 'create'
      || op.op === 'createStaticMeshInstance'
      || op.op === 'createAnimatedMeshInstance'
      || op.op === 'createSprite'
      || op.op === 'createLight'
      ? [op.handle]
      : []
  ));
}

function styleVoxelProjectionFrame(
  frame: RenderFrameDiff,
  wireframe: boolean,
): RenderFrameDiff {
  return {
    ops: frame.ops.map(op => {
      if (op.op !== 'create' || op.node.metadata.label?.startsWith('chunk ') !== true) {
        return op;
      }
      return {
        ...op,
        node: {
          ...op.node,
          material: { ...op.node.material, wireframe },
        },
      };
    }),
  };
}

function voxelWireframeUpdates(
  handles: readonly RenderHandle[],
  wireframe: boolean,
): RenderFrameDiff {
  return {
    ops: handles.map(handle => ({
      op: 'update' as const,
      handle,
      transform: null,
      material: { color: [1, 1, 1, 1], wireframe },
      visible: null,
      metadata: null,
    })),
  };
}

function replaceAuthoredBaseFrame(
  previousHandles: readonly RenderHandle[],
  nextFrame: RenderFrameDiff,
): RenderFrameDiff {
  return {
    ops: [
      ...previousHandles.map((handle): RenderDiff => ({ op: 'destroy', handle })),
      ...nextFrame.ops,
    ],
  };
}

function buildEditorViewportCamera(
  adapter: StudioViewportAdapterReadModel,
): AshaRendererEditorViewportCamera {
  const resolution = resolveAshaStoredEditorCamera({
    position: [
      adapter.camera.position.x,
      adapter.camera.position.y,
      adapter.camera.position.z,
    ],
    target: [adapter.camera.target.x, adapter.camera.target.y, adapter.camera.target.z],
    up: [adapter.camera.up.x, adapter.camera.up.y, adapter.camera.up.z],
    projection: {
      fovYDegrees: adapter.camera.fovDegrees,
      near: adapter.camera.near,
      far: adapter.camera.far,
    },
  });
  if (!resolution.ok) {
    throw new Error(
      `Engine stored-editor camera rejected: ${resolution.diagnostic.code}: ${resolution.diagnostic.message}`,
    );
  }
  return resolution.camera;
}

function buildRuntimeViewportCamera(camera: CameraSnapshot): AshaRendererEditorViewportCamera {
  return {
    source: 'runtime_authority',
    pose: camera.pose,
    basis: camera.basis,
    projection: camera.projection,
  };
}

function createDebugNode(
  label: string,
  translation: readonly [number, number, number],
  scale: readonly [number, number, number],
  color: readonly [number, number, number, number],
): RenderNode {
  return {
    geometry: { shape: 'cube' },
    material: { color, wireframe: false },
    transform: { translation, rotation: [0, 0, 0, 1], scale },
    visible: true,
    layer: 'debug',
    metadata: { source: null, tags: [], label },
  };
}

function buildViewportOverlayFrame(
  adapter: StudioViewportAdapterReadModel,
  debugPick: AshaRendererEditorViewportPickHint | null,
  voxelBrushOverlay: StudioVoxelBrushOverlay | null,
  manipulatorFrame: RenderFrameDiff,
): RenderFrameDiff {
  const ops: RenderDiff[] = [];
  let handle = 1;
  const selected = adapter.renderables.find(renderable => renderable.selected && renderable.visible);
  if (selected !== undefined) {
    const transform = renderableTransform(selected);
    ops.push({
      op: 'create',
      handle: renderHandle(handle),
      parent: null,
      node: {
        geometry: { shape: 'cube' },
        material: { color: [0.089, 0.571, 0.509, 1], wireframe: true },
        transform: {
          ...transform,
          scale: transform.scale.map(value => value * 1.035) as unknown as Transform['scale'],
        },
        visible: true,
        layer: 'debug',
        metadata: { source: null, tags: [], label: `selection:${selected.renderableId}` },
      },
    });
    handle += 1;
  }
  if (debugPick !== null && adapter.renderSettings.showRaycastHitDebug) {
    const [x, y, z] = debugPick.position;
    const color = [1, 0.023, 0.008, 1] as const;
    const axes = [
      { label: 'x', scale: [0.36, 0.014, 0.014] as const },
      { label: 'y', scale: [0.014, 0.36, 0.014] as const },
      { label: 'z', scale: [0.014, 0.014, 0.36] as const },
    ];
    for (const axis of axes) {
      ops.push({
        op: 'create',
        handle: renderHandle(handle),
        parent: null,
        node: createDebugNode(`pick-marker:${axis.label}`, [x, y, z], axis.scale, color),
      });
      handle += 1;
    }
  }
  if (voxelBrushOverlay !== null) {
    const color = voxelBrushOverlay.tool === 'erase'
      ? [1, 0.18, 0.12, 0.28] as const
      : voxelBrushOverlay.tool === 'add'
        ? [0.15, 0.85, 0.48, 0.32] as const
        : voxelBrushOverlay.tool === 'paint'
          ? [0.24, 0.62, 1, 0.32] as const
          : [1, 0.78, 0.18, 0.22] as const;
    ops.push({
      op: 'create',
      handle: renderHandle(handle),
      parent: null,
      node: {
        geometry: { shape: 'cube' },
        material: { color, wireframe: true },
        transform: voxelBrushOverlay.transform,
        visible: true,
        layer: 'debug',
        metadata: { source: null, tags: [], label: `voxel-brush:${voxelBrushOverlay.tool}` },
      },
    });
  }
  ops.push(...manipulatorFrame.ops);
  return { ops };
}

function cursorForTool(tool: StudioViewportToolMode, dragging: boolean): string {
  if (dragging) {
    return 'grabbing';
  }
  if (tool === 'orbit' || tool === 'pan') {
    return 'grab';
  }
  if (tool === 'move_object' || tool === 'rotate_object' || tool === 'scale_object') {
    return 'move';
  }
  if (tool === 'select') {
    return 'crosshair';
  }
  return 'default';
}

function manipulatorModeForTool(tool: StudioViewportToolMode): TransformManipulatorMode | null {
  if (tool === 'move_object') return 'translate';
  if (tool === 'rotate_object') return 'rotate';
  if (tool === 'scale_object') return 'scale';
  return null;
}

function manipulatorCamera(
  viewport: AshaRendererEditorViewport,
): Parameters<typeof beginTransformManipulatorDrag>[0]['camera'] {
  const camera = viewport.camera();
  const size = viewport.readout().size;
  return {
    position: camera.pose.position,
    basis: camera.basis,
    fovYDegrees: camera.projection.fovYDegrees,
    viewport: { width: size.width, height: size.height },
  };
}

function renderableHandle(
  adapter: StudioViewportAdapterReadModel,
  renderableId: string,
): RenderHandle | null {
  let handle = 1_000_001;
  for (const renderable of adapter.renderables) {
    if (
      !renderable.visible
      || renderable.kind === 'voxel_grid'
      || (!adapter.renderSettings.showPreviewGhosts && renderable.kind === 'preview_ghost')
    ) {
      continue;
    }
    if (renderable.renderableId === renderableId) return renderHandle(handle);
    handle += 1;
  }
  return null;
}

function projectedPreviewTransform(
  rendered: Transform,
  source: Transform,
  candidate: Transform,
): Transform {
  const inverseSourceRotation = [
    -source.rotation[0],
    -source.rotation[1],
    -source.rotation[2],
    source.rotation[3],
  ] as const;
  const rotationDelta = multiplyRotation(candidate.rotation, inverseSourceRotation);
  return {
    translation: [
      rendered.translation[0] + candidate.translation[0] - source.translation[0],
      rendered.translation[1] + candidate.translation[1] - source.translation[1],
      rendered.translation[2] + candidate.translation[2] - source.translation[2],
    ],
    rotation: normalizeRotation(multiplyRotation(rotationDelta, rendered.rotation)),
    scale: [
      rendered.scale[0] * candidate.scale[0] / source.scale[0],
      rendered.scale[1] * candidate.scale[1] / source.scale[1],
      rendered.scale[2] * candidate.scale[2] / source.scale[2],
    ],
  };
}

function multiplyRotation(
  left: Transform['rotation'],
  right: Transform['rotation'],
): Transform['rotation'] {
  const [ax, ay, az, aw] = left;
  const [bx, by, bz, bw] = right;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function normalizeRotation(rotation: Transform['rotation']): Transform['rotation'] {
  const magnitude = Math.hypot(...rotation);
  return magnitude <= 0.000001
    ? [0, 0, 0, 1]
    : rotation.map(value => value / magnitude) as unknown as Transform['rotation'];
}

function lightingPreviewUpdates(frame: RenderFrameDiff): RenderFrameDiff {
  return {
    ops: frame.ops.flatMap(op => {
      if (op.op === 'createLight') {
        return [{ op: 'updateLight' as const, handle: op.handle, light: op.light }];
      }
      return op.op === 'updateLight' ? [op] : [];
    }),
  };
}

function voxelCoordKey(coord: { readonly x: number; readonly y: number; readonly z: number }): string {
  return `${coord.x}:${coord.y}:${coord.z}`;
}

@Component({
  selector: 'asha-studio-viewport',
  standalone: true,
  template: `
    <section
      class="viewport-scene"
      data-visual-id="studio-viewport"
      [attr.data-workspace-authoring-projection]="workspaceAuthoringProjectionEvidence().status"
      [attr.data-workspace-authoring-projection-hash]="workspaceAuthoringProjectionEvidence().projectionHash"
      [attr.data-workspace-authoring-mesh-payload-ops]="workspaceAuthoringProjectionEvidence().meshPayloadOpCount"
    >
      <div class="viewport-scene__header">
        <span>4 · 3D Viewport / Scene View</span>
        <strong>{{ store.viewportAdapter().sceneId }}</strong>
      </div>

      <div
        #host
        class="viewport-scene__host"
        aria-label="Three dimensional scene viewport"
      >
        <canvas
          #canvas
          class="viewport-scene__canvas"
          data-renderer-owner="asha-renderer-host"
          aria-label="ASHA engine renderer viewport"
          tabindex="0"
        ></canvas>
        @if (store.viewportAdapter().renderSettings.showReadbackOverlay) {
          <div class="viewport-classification" data-viewport-classification="stored-authored-preview">
            <strong>stored authored preview</strong>
            <span>engine-owned realization</span>
            @if (store.runtimeViewportProjection(); as runtimeProjection) {
              <span data-viewport-runtime="attached">current runtime · {{ runtimeProjection.projectionHash }}</span>
            } @else {
              <span data-viewport-runtime="missing">runtime not attached</span>
            }
            @if (viewportReadout(); as readout) {
              <small>{{ readout.viewportHash }}</small>
              @for (channel of readout.channels; track channel.channel) {
                <small
                  [attr.data-renderer-channel]="channel.channel"
                  [attr.data-renderer-channel-generation]="channel.generation"
                  [attr.data-renderer-channel-hash]="channel.hash"
                >
                  {{ channel.channel }} · generation {{ channel.generation }} · {{ channel.hash }}
                </small>
              }
            }
            @if (viewportMountDiagnostic(); as diagnostic) {
              <small data-renderer-host-mount="failed" class="viewport-classification__diagnostic">
                {{ diagnostic }}
              </small>
            }
            <small [attr.data-runtime-viewport-evidence-status]="store.runtimeViewportEvidence().status">
              {{ store.runtimeViewportEvidence().status }}
              · scene {{ store.runtimeViewportEvidence().scene?.documentHash ?? 'n/a' }}
              · preview {{ store.runtimeViewportEvidence().materialPreview?.rendererClassification ?? 'n/a' }}
              · voxel {{ store.runtimeViewportEvidence().voxelSelection?.outcome ?? 'n/a' }}
              · buffer {{ store.runtimeViewportEvidence().bufferLifetime?.released ? 'released' : 'n/a' }}
            </small>
            @for (diagnostic of store.runtimeViewportEvidence().diagnostics; track diagnostic) {
              <small class="viewport-classification__diagnostic">{{ diagnostic }}</small>
            }
          </div>
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
          <div
            class="voxel-preview-overlay"
            [attr.data-voxel-viewport-preview-status]="store.voxelConversionWorkspaceShell().previewProjection.status"
          >
            <span>voxel conversion</span>
            <strong>{{ store.voxelConversionWorkspaceShell().previewProjection.viewportLabel }}</strong>
            <small>{{ store.voxelConversionWorkspaceShell().previewProjection.previewHash ?? 'no upstream preview evidence' }}</small>
            <small>{{ store.voxelConversionWorkspaceShell().previewProjection.inputReadoutHash }}</small>
          </div>

          <div
            class="voxel-brush-preview-overlay"
            [attr.data-voxel-brush-preview-status]="store.voxelCompactEditPlacement().status"
          >
            <span>compact edit</span>
            <strong>{{ store.voxelCompactEditPlacement().previewLabel }}</strong>
            <small>{{ store.voxelCompactEditPlacement().readoutHash }}</small>
          </div>
        }

        <div class="axis-gizmo" aria-hidden="true">
          <span class="axis-gizmo__x">X</span>
          <span class="axis-gizmo__y">Y</span>
          <span class="axis-gizmo__z">Z</span>
        </div>
      </div>

      <footer class="viewport-scene__footer">
        <span data-scene-camera-position>
          camera
          {{ store.viewportAdapter().camera.position.x.toFixed(2) }},
          {{ store.viewportAdapter().camera.position.y.toFixed(2) }},
          {{ store.viewportAdapter().camera.position.z.toFixed(2) }}
        </span>
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

      .viewport-scene__canvas {
        display: block;
        height: 100%;
        inset: 0;
        position: absolute;
        touch-action: none;
        width: 100%;
      }

      .viewport-scene__canvas:focus-visible {
        outline: 1px solid var(--asha-color-accent);
        outline-offset: -2px;
      }

      .viewport-classification {
        background: rgba(11, 17, 23, 0.88);
        border: 1px solid rgba(84, 199, 189, 0.5);
        color: var(--asha-color-muted);
        display: grid;
        font-size: 0.62rem;
        gap: 0.12rem;
        left: 1rem;
        padding: 0.35rem 0.45rem;
        position: absolute;
        top: 5.4rem;
      }

      .viewport-classification strong {
        color: var(--asha-color-ink);
        text-transform: uppercase;
      }

      .viewport-classification__diagnostic {
        color: var(--asha-color-warning);
        max-width: 24rem;
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

      .voxel-preview-overlay {
        background: rgba(11, 17, 23, 0.88);
        border: 1px solid rgba(212, 149, 63, 0.55);
        color: var(--asha-color-muted);
        display: grid;
        font-size: 0.68rem;
        gap: 0.16rem;
        max-width: min(24rem, calc(100% - 2rem));
        min-width: 14rem;
        padding: 0.4rem 0.55rem;
        position: absolute;
        right: 1rem;
        top: 1rem;
      }

      .voxel-preview-overlay strong,
      .voxel-preview-overlay small {
        color: var(--asha-color-ink);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .voxel-preview-overlay small {
        color: var(--asha-color-muted);
      }

      .voxel-preview-overlay[data-voxel-viewport-preview-status='unavailable'],
      .voxel-preview-overlay[data-voxel-viewport-preview-status='stale'] {
        border-color: var(--asha-color-warning);
      }

      .voxel-brush-preview-overlay {
        background: rgba(11, 17, 23, 0.88);
        border: 1px solid rgba(84, 199, 189, 0.5);
        color: var(--asha-color-muted);
        display: grid;
        font-size: 0.68rem;
        gap: 0.16rem;
        left: 1rem;
        max-width: min(24rem, calc(100% - 2rem));
        min-width: 14rem;
        padding: 0.4rem 0.55rem;
        position: absolute;
        top: 1rem;
      }

      .voxel-brush-preview-overlay strong,
      .voxel-brush-preview-overlay small {
        color: var(--asha-color-ink);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .voxel-brush-preview-overlay small {
        color: var(--asha-color-muted);
      }

      .voxel-brush-preview-overlay[data-voxel-brush-preview-status='unavailable'],
      .voxel-brush-preview-overlay[data-voxel-brush-preview-status='unsupported_hit'] {
        border-color: var(--asha-color-warning);
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
  readonly viewportReadout = signal<AshaRendererEditorViewportReadout | null>(null);
  readonly viewportMountDiagnostic = signal<string | null>(null);
  readonly workspaceAuthoringProjectionEvidence = computed(() => {
    const projection = this.store.workspaceAuthoringProjection();
    return {
      status: projection === null ? 'missing' : 'present',
      projectionHash: projection?.projectionHash ?? null,
      meshPayloadOpCount: projection?.studioMetrics.meshPayloadOpCount ?? 0,
    };
  });

  @ViewChild('host', { static: true }) private hostRef?: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) private canvasRef?: ElementRef<HTMLCanvasElement>;

  private viewport: AshaRendererEditorViewport | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private hostElement: HTMLDivElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private destroyed = false;
  private renderedSceneKey: string | null = null;
  private renderedRuntimeKey: string | null = null;
  private renderedAuthoringProjectionKey: string | null = null;
  private renderedOverlayKey: string | null = null;
  private renderedGridKey: string | null = null;
  private authoredBaseHandles: readonly RenderHandle[] = [];
  private readonly authoredVoxelPickIndex = new AuthoredVoxelProjectionPickIndex();
  private debugPick: AshaRendererEditorViewportPickHint | null = null;
  private debugPickTimer: ReturnType<typeof setTimeout> | null = null;
  private voxelBrushOverlay: StudioVoxelBrushOverlay | null = null;
  private lastVoxelHoverAt = 0;
  private voxelStrokeState: {
    readonly pointerId: number;
    readonly coords: Map<string, StudioVoxelPointerTarget['coord']>;
    readonly lastX: number;
    readonly lastY: number;
  } | null = null;
  private dragState: {
    readonly pointerId: number;
    readonly tool: Extract<StudioViewportToolMode, 'orbit' | 'pan'>;
    readonly x: number;
    readonly y: number;
  } | null = null;
  private transformDragState: {
    readonly pointerId: number;
    readonly drag: TransformManipulatorDrag;
    readonly parentWorldTransform: Transform | null;
    readonly sourceLocalTransform: Transform;
    candidate: TransformManipulatorCandidate;
    candidateLocalTransform: Transform;
  } | null = null;
  private transformHoveredHandle: TransformManipulatorHandle | null = null;
  private pendingTransformPointer: {
    readonly point: readonly [number, number];
    readonly fine: boolean;
    readonly snapping: boolean;
  } | null = null;
  private transformPreviewFrameRequest: number | null = null;
  private readonly pressedCameraMovementCodes = new Set<string>();
  private cameraMovementFrameRequest: number | null = null;
  private lastCameraMovementFrameAt: number | null = null;

  private readonly adapterEffect = effect(() => {
    const adapter = this.store.viewportAdapter();
    const voxelBrush = this.store.voxelBrush();
    if (!voxelBrush.enabled) this.voxelBrushOverlay = null;
    const runtimeProjection = this.store.runtimeViewportProjection();
    const authoringProjection = this.store.workspaceAuthoringProjection();
    const environmentPreview = this.store.proceduralEnvironmentPreviewFrame();
    const lightingProjection = this.store.lightingProjection();
    const runtimeEvidence = this.store.runtimeViewportEvidence();
    this.syncViewport(
      adapter,
      runtimeProjection?.frame ?? null,
      runtimeProjection?.projectionHash ?? null,
      runtimeEvidence.materialPreview?.previewDiff ?? null,
      runtimeEvidence.camera,
      authoringProjection,
      environmentPreview,
      lightingProjection.frame,
    );
  });

  async ngAfterViewInit(): Promise<void> {
    const hostElement = this.hostRef?.nativeElement;
    const canvasElement = this.canvasRef?.nativeElement;
    if (hostElement === undefined || canvasElement === undefined) {
      return;
    }

    this.hostElement = hostElement;
    this.canvasElement = canvasElement;
    this.installInputListeners(canvasElement);
    let viewport: AshaRendererEditorViewport;
    try {
      viewport = await mountAshaRendererEditorViewport(canvasElement, {
        autoStart: true,
        initialCamera: buildEditorViewportCamera(this.store.viewportAdapter()),
        pixelRatio: Math.min(globalThis.devicePixelRatio ?? 1, 2),
      });
    } catch (error) {
      this.viewportMountDiagnostic.set(
        `Engine renderer host mount failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
    if (this.destroyed) {
      viewport.dispose();
      return;
    }
    this.viewport = viewport;
    this.resizeObserver = new ResizeObserver(() => this.resizeViewport());
    this.resizeObserver.observe(hostElement);
    this.resizeViewport();
    const runtimeProjection = this.store.runtimeViewportProjection();
    const authoringProjection = this.store.workspaceAuthoringProjection();
    const environmentPreview = this.store.proceduralEnvironmentPreviewFrame();
    const lightingProjection = this.store.lightingProjection();
    const runtimeEvidence = this.store.runtimeViewportEvidence();
    this.syncViewport(
      this.store.viewportAdapter(),
      runtimeProjection?.frame ?? null,
      runtimeProjection?.projectionHash ?? null,
      runtimeEvidence.materialPreview?.previewDiff ?? null,
      runtimeEvidence.camera,
      authoringProjection,
      environmentPreview,
      lightingProjection.frame,
    );
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.adapterEffect.destroy();
    if (this.resizeObserver !== null) {
      this.resizeObserver.disconnect();
    }
    this.removeInputListeners();
    if (this.debugPickTimer !== null) {
      clearTimeout(this.debugPickTimer);
    }
    if (this.transformPreviewFrameRequest !== null) {
      cancelAnimationFrame(this.transformPreviewFrameRequest);
    }
    this.clearCameraMovement();
    this.viewport?.channels.runtime.clear();
    this.viewport?.channels.authored.clear();
    this.viewport?.channels.overlay.clear();
    this.viewport?.dispose();
    this.viewport = null;
    this.viewportReadout.set(null);
    this.authoredBaseHandles = [];
    this.authoredVoxelPickIndex.clear();
  }

  private installInputListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('keydown', this.handleKeyDown);
    canvas.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('blur', this.handleCanvasBlur);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private removeInputListeners(): void {
    const canvas = this.canvasElement;
    if (canvas === null) {
      return;
    }
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    canvas.removeEventListener('wheel', this.handleWheel);
    canvas.removeEventListener('keydown', this.handleKeyDown);
    canvas.removeEventListener('keyup', this.handleKeyUp);
    canvas.removeEventListener('blur', this.handleCanvasBlur);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private syncViewport(
    adapter: StudioViewportAdapterReadModel,
    runtimeFrame: RenderFrameDiff | null,
    runtimeKey: string | null,
    materialPreviewFrame: RenderFrameDiff | null,
    runtimeCamera: CameraSnapshot | null,
    authoringProjection: StudioWorkspaceProjectionDelivery | null,
    environmentPreviewFrame: RenderFrameDiff | null,
    lightingFrame: RenderFrameDiff,
  ): void {
    const viewport = this.viewport;
    const canvas = this.canvasElement;
    if (viewport === null || canvas === null) {
      return;
    }
    viewport.setCamera(
      runtimeCamera === null
        ? buildEditorViewportCamera(adapter)
        : buildRuntimeViewportCamera(runtimeCamera),
    );
    const gridDescriptor = this.store.effectiveSettings().grid;
    const gridKey = JSON.stringify(gridDescriptor);
    if (gridKey !== this.renderedGridKey) {
      const gridReceipt = viewport.setGrid(gridDescriptor.visible ? gridDescriptor : null);
      if (!gridReceipt.applied) {
        this.viewportMountDiagnostic.set(
          gridReceipt.diagnostics.at(0)?.message ?? 'Engine renderer host rejected the project grid descriptor.',
        );
      } else {
        this.viewportMountDiagnostic.set(null);
        this.renderedGridKey = gridKey;
      }
    }
    canvas.style.cursor = cursorForTool(
      adapter.tool.activeTool,
      this.dragState !== null || this.transformDragState !== null,
    );
    const baseFrame = buildViewportProjectionFrame(
      adapter,
      materialPreviewFrame,
      environmentPreviewFrame,
      lightingFrame,
    );
    const sceneKey = JSON.stringify(baseFrame);
    const projectionKey = authoringProjection === null
      ? null
      : [
          authoringProjection.workspaceId,
          authoringProjection.generation,
          authoringProjection.workingRevision,
          JSON.stringify(authoringProjection.cursor),
          authoringProjection.projectionHash,
          authoringProjection.delivery,
        ].join(':');
    const sceneChanged = sceneKey !== this.renderedSceneKey;
    const projectionChanged = projectionKey !== this.renderedAuthoringProjectionKey;
    const overlayKey = [
      adapter.sceneHash,
      adapter.selectedRenderableId ?? 'none',
      adapter.renderSettings.renderSettingsHash,
      adapter.tool.toolHash,
      this.store.transformManipulatorOrientation(),
      this.store.transformManipulatorSnapping() ? 'snap' : 'free',
      this.store.voxelAuthoringMode().mode,
      this.store.selectedSceneTransformTarget()?.revision ?? 'no-transform-target',
    ].join(':');

    if (
      authoringProjection !== null
      && projectionChanged
      && authoringProjection.delivery === 'replace'
    ) {
      const styledProjection = styleVoxelProjectionFrame(
        authoringProjection.frame,
        adapter.renderSettings.wireframeEnabled,
      );
      const startedAtMs = performance.now();
      const receipt = viewport.channels.authored.replace({
        ops: [...baseFrame.ops, ...styledProjection.ops],
      });
      if (receipt.applied) {
        this.authoredVoxelPickIndex.replace(styledProjection);
        this.publishVoxelInstanceBounds();
        this.authoredBaseHandles = createdRenderHandles(baseFrame);
        this.renderedSceneKey = sceneKey;
        this.renderedAuthoringProjectionKey = projectionKey;
        this.store.recordWorkspaceAuthoringProjectionDelivery({
          channelReplaced: true,
          projectionHash: authoringProjection.projectionHash,
          recovered: false,
          renderApplyMs: performance.now() - startedAtMs,
        });
      } else {
        this.store.reportWorkspaceAuthoringProjectionFailure(
          receipt.diagnostics[0]?.message ?? 'authored replacement frame rejected',
        );
      }
    } else {
      if (authoringProjection === null && this.renderedAuthoringProjectionKey !== null) {
        this.authoredVoxelPickIndex.clear();
        viewport.channels.authored.replace(baseFrame);
        this.authoredBaseHandles = createdRenderHandles(baseFrame);
        this.renderedAuthoringProjectionKey = null;
        this.renderedSceneKey = sceneKey;
      } else if (sceneChanged) {
        const nextBaseHandles = createdRenderHandles(baseFrame);
        if (this.renderedSceneKey === null) {
          viewport.channels.authored.replace(baseFrame);
        } else {
          viewport.channels.authored.apply(
            replaceAuthoredBaseFrame(this.authoredBaseHandles, baseFrame),
          );
        }
        this.authoredBaseHandles = nextBaseHandles;
        this.renderedSceneKey = sceneKey;
        if (authoringProjection !== null) {
          viewport.channels.authored.apply(voxelWireframeUpdates(
            this.authoredVoxelPickIndex.voxelChunkHandles(),
            adapter.renderSettings.wireframeEnabled,
          ));
        }
      }
      if (authoringProjection !== null && projectionChanged) {
        const styledProjection = styleVoxelProjectionFrame(
          authoringProjection.frame,
          adapter.renderSettings.wireframeEnabled,
        );
        const startedAtMs = performance.now();
        const receipt = viewport.channels.authored.apply(styledProjection);
        if (receipt.applied) {
          this.authoredVoxelPickIndex.apply(styledProjection);
          this.publishVoxelInstanceBounds();
          this.renderedAuthoringProjectionKey = projectionKey;
          this.store.recordWorkspaceAuthoringProjectionDelivery({
            channelReplaced: false,
            projectionHash: authoringProjection.projectionHash,
            recovered: false,
            renderApplyMs: performance.now() - startedAtMs,
          });
        } else {
          const recoveryProjection = styleVoxelProjectionFrame(
            authoringProjection.recoveryFrame,
            adapter.renderSettings.wireframeEnabled,
          );
          const recoveryReceipt = viewport.channels.authored.replace({
            ops: [...baseFrame.ops, ...recoveryProjection.ops],
          });
          if (recoveryReceipt.applied) {
            this.authoredVoxelPickIndex.replace(recoveryProjection);
            this.publishVoxelInstanceBounds();
            this.authoredBaseHandles = createdRenderHandles(baseFrame);
            this.renderedSceneKey = sceneKey;
            this.renderedAuthoringProjectionKey = projectionKey;
            this.store.recordWorkspaceAuthoringProjectionDelivery({
              channelReplaced: true,
              projectionHash: authoringProjection.projectionHash,
              recovered: true,
              renderApplyMs: performance.now() - startedAtMs,
            });
          } else {
            this.store.reportWorkspaceAuthoringProjectionFailure(
              recoveryReceipt.diagnostics[0]?.message
                ?? receipt.diagnostics[0]?.message
                ?? 'authored incremental and recovery frames rejected',
            );
          }
        }
      }
    }
    if (overlayKey !== this.renderedOverlayKey) {
      viewport.channels.overlay.replace(buildViewportOverlayFrame(
        adapter,
        this.debugPick,
        this.voxelBrushOverlay,
        this.currentManipulatorFrame(adapter),
      ));
      this.renderedOverlayKey = overlayKey;
    }
    if (runtimeKey !== this.renderedRuntimeKey) {
      if (runtimeFrame === null) {
        viewport.channels.runtime.clear();
      } else {
        viewport.channels.runtime.replace(runtimeFrame);
      }
      this.renderedRuntimeKey = runtimeKey;
    }
    viewport.renderOnce();
    this.viewportReadout.set(viewport.readout());
  }

  private syncCurrentViewport(): void {
    const runtimeProjection = this.store.runtimeViewportProjection();
    const authoringProjection = this.store.workspaceAuthoringProjection();
    const environmentPreview = this.store.proceduralEnvironmentPreviewFrame();
    const runtimeEvidence = this.store.runtimeViewportEvidence();
    this.syncViewport(
      this.store.viewportAdapter(),
      runtimeProjection?.frame ?? null,
      runtimeProjection?.projectionHash ?? null,
      runtimeEvidence.materialPreview?.previewDiff ?? null,
      runtimeEvidence.camera,
      authoringProjection,
      environmentPreview,
      this.store.lightingProjection().frame,
    );
  }

  private publishVoxelInstanceBounds(): void {
    for (const [instanceId, bounds] of this.authoredVoxelPickIndex.instanceBounds()) {
      this.store.setVoxelInstanceProjectionBounds(instanceId, bounds);
    }
  }

  private resizeViewport(): void {
    const host = this.hostElement;
    const viewport = this.viewport;
    if (host === null || viewport === null) {
      return;
    }
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    viewport.resize({
      width,
      height,
      pixelRatio: Math.min(globalThis.devicePixelRatio ?? 1, 2),
    });
    viewport.renderOnce();
    this.viewportReadout.set(viewport.readout());
  }

  private currentManipulatorFrame(adapter: StudioViewportAdapterReadModel): RenderFrameDiff {
    const mode = manipulatorModeForTool(adapter.tool.activeTool);
    const target = this.store.selectedSceneTransformTarget();
    if (mode === null || target === null || this.store.voxelAuthoringMode().mode === 'edit') {
      return { ops: [] };
    }
    const drag = this.transformDragState;
    return projectTransformManipulator({
      active: drag?.drag.handle ?? null,
      hovered: this.transformHoveredHandle,
      mode,
      orientation: this.store.transformManipulatorOrientation(),
      transform: drag?.candidate.transform ?? target.worldTransform,
      visible: true,
    });
  }

  private pointerPoint(event: PointerEvent): readonly [number, number] {
    const rect = this.canvasElement?.getBoundingClientRect();
    return rect === undefined
      ? [0, 0]
      : [event.clientX - rect.left, event.clientY - rect.top];
  }

  private pickTransformManipulator(event: PointerEvent): TransformManipulatorHandle | null {
    const viewport = this.viewport;
    if (viewport === null) return null;
    const handles = this.currentManipulatorFrame(this.store.viewportAdapter()).ops.flatMap(op => (
      op.op === 'create' ? [op.handle] : []
    ));
    if (handles.length === 0) return null;
    const hint = viewport.pick({
      point: this.pointerPoint(event),
      filter: { channels: ['overlay'], handles, layers: ['debug'] },
    }).hint;
    return hint === null ? null : transformManipulatorHandleFromId(hint.handle);
  }

  private beginTransformDrag(event: PointerEvent, mode: TransformManipulatorMode): boolean {
    const viewport = this.viewport;
    const canvas = this.canvasElement;
    const target = this.store.selectedSceneTransformTarget();
    const handle = this.pickTransformManipulator(event);
    if (
      viewport === null
      || canvas === null
      || target === null
      || handle === null
      || handle.mode !== mode
      || this.store.voxelAuthoringMode().mode === 'edit'
    ) {
      return false;
    }
    const drag = beginTransformManipulatorDrag({
      camera: manipulatorCamera(viewport),
      handle,
      orientation: this.store.transformManipulatorOrientation(),
      pointer: this.pointerPoint(event),
      revision: target.revision,
      snapping: {
        ...DEFAULT_TRANSFORM_MANIPULATOR_SNAPPING,
        enabled: this.store.transformManipulatorSnapping(),
        translation: this.store.effectiveSettings().grid.grid.spacing[0],
        rotationDegrees: this.store.effectiveSettings().rotationSnapDegrees,
        scale: this.store.effectiveSettings().scaleSnapIncrement,
      },
      source: target.worldTransform,
    });
    this.transformDragState = {
      pointerId: event.pointerId,
      drag,
      parentWorldTransform: target.parentWorldTransform,
      sourceLocalTransform: target.transform,
      candidate: {
        kind: 'transform_manipulator_candidate.v0',
        diagnostics: [],
        previewOnly: true,
        revision: drag.revision,
        transform: drag.source,
      },
      candidateLocalTransform: target.transform,
    };
    this.transformHoveredHandle = handle;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    this.renderOverlay();
    return true;
  }

  private applyTransformPreview(candidate: TransformManipulatorCandidate): boolean {
    const viewport = this.viewport;
    const dragState = this.transformDragState;
    if (viewport === null || dragState === null) return false;
    const candidateLocalTransform = dragState.parentWorldTransform === null
      ? candidate.transform
      : deriveStudioSceneLocalTransform(
        dragState.parentWorldTransform,
        candidate.transform,
      );
    if (candidateLocalTransform === null) return false;
    const target = this.store.previewSelectedSceneObjectTransform(
      candidate.revision,
      candidateLocalTransform,
    );
    if (target === null) return false;
    const ops: RenderDiff[] = [];
    if (target.renderableId !== null) {
      const adapter = this.store.viewportAdapter();
      const renderable = adapter.renderables.find(item => item.renderableId === target.renderableId);
      if (renderable?.kind === 'voxel_grid') {
        const projection = this.authoredVoxelPickIndex.projectionForInstance(target.objectId);
        if (projection !== null) {
          ops.push({
            op: 'update',
            handle: projection.handle,
            transform: projectedPreviewTransform(
              projection.transform,
              dragState.drag.source,
              candidate.transform,
            ),
            material: null,
            visible: null,
            metadata: null,
          });
        }
      } else if (renderable !== undefined) {
        const handle = renderableHandle(adapter, renderable.renderableId);
        if (handle !== null) {
          ops.push({
            op: 'update',
            handle,
            transform: projectedPreviewTransform(
              renderableTransform(renderable),
              dragState.drag.source,
              candidate.transform,
            ),
            material: null,
            visible: null,
            metadata: null,
          });
        }
      }
    }
    ops.push(...lightingPreviewUpdates(target.lightFrame).ops);
    const receipt = viewport.channels.authored.apply({ ops });
    if (!receipt.applied) return false;
    dragState.candidate = candidate;
    dragState.candidateLocalTransform = candidateLocalTransform;
    this.renderOverlay();
    return true;
  }

  private restoreAuthoritativeTransform(): void {
    const viewport = this.viewport;
    const target = this.store.selectedSceneTransformTarget();
    if (viewport === null || target === null) return;
    const ops: RenderDiff[] = [];
    if (target.renderableId !== null) {
      const adapter = this.store.viewportAdapter();
      const renderable = adapter.renderables.find(item => item.renderableId === target.renderableId);
      if (renderable?.kind === 'voxel_grid') {
        const projection = this.authoredVoxelPickIndex.projectionForInstance(target.objectId);
        if (projection !== null) {
          ops.push({ op: 'update', handle: projection.handle, transform: projection.transform, material: null, visible: null, metadata: null });
        }
      } else if (renderable !== undefined) {
        const handle = renderableHandle(adapter, renderable.renderableId);
        if (handle !== null) {
          ops.push({ op: 'update', handle, transform: renderableTransform(renderable), material: null, visible: null, metadata: null });
        }
      }
    }
    ops.push(...lightingPreviewUpdates(target.lightFrame).ops);
    viewport.channels.authored.apply({ ops });
    viewport.renderOnce();
  }

  private queueTransformPreview(event: PointerEvent): void {
    this.pendingTransformPointer = {
      point: this.pointerPoint(event),
      fine: event.shiftKey,
      snapping: event.ctrlKey
        ? !this.store.transformManipulatorSnapping()
        : this.store.transformManipulatorSnapping(),
    };
    if (this.transformPreviewFrameRequest !== null) return;
    this.transformPreviewFrameRequest = requestAnimationFrame(() => {
      this.transformPreviewFrameRequest = null;
      this.flushTransformPreview();
    });
  }

  private flushTransformPreview(): void {
    const viewport = this.viewport;
    const dragState = this.transformDragState;
    const pending = this.pendingTransformPointer;
    this.pendingTransformPointer = null;
    if (viewport === null || dragState === null || pending === null) return;
    let candidate = updateTransformManipulatorDrag(
      dragState.drag,
      manipulatorCamera(viewport),
      pending.point,
      {
        fine: pending.fine,
        snapping: dragState.drag.handle.mode === 'translate' ? false : pending.snapping,
      },
    );
    if (dragState.drag.handle.mode === 'translate' && pending.snapping) {
      const candidateLocalTransform = dragState.parentWorldTransform === null
        ? candidate.transform
        : deriveStudioSceneLocalTransform(
          dragState.parentWorldTransform,
          candidate.transform,
        );
      if (candidateLocalTransform === null) {
        this.cancelTransformDrag();
        return;
      }
      const snappedLocalCandidate = applyStudioTranslationGridSnap(
        { ...candidate, transform: candidateLocalTransform },
        this.store.effectiveSettings().grid,
        true,
        pending.fine,
        {
          handle: dragState.drag.handle,
          orientation: dragState.drag.orientation,
          source: dragState.sourceLocalTransform,
          parentWorldTransform: dragState.parentWorldTransform,
        },
      );
      candidate = {
        ...snappedLocalCandidate,
        transform: dragState.parentWorldTransform === null
          ? snappedLocalCandidate.transform
          : composeStudioSceneTransform(
            dragState.parentWorldTransform,
            snappedLocalCandidate.transform,
          ),
      };
    }
    if (!this.applyTransformPreview(candidate)) this.cancelTransformDrag();
  }

  private cancelTransformDrag(): void {
    const dragState = this.transformDragState;
    if (dragState === null) return;
    cancelTransformManipulatorDrag(dragState.drag);
    if (this.transformPreviewFrameRequest !== null) {
      cancelAnimationFrame(this.transformPreviewFrameRequest);
      this.transformPreviewFrameRequest = null;
    }
    this.pendingTransformPointer = null;
    this.restoreAuthoritativeTransform();
    this.transformDragState = null;
    this.renderOverlay();
    if (this.canvasElement !== null) {
      this.canvasElement.style.cursor = cursorForTool(this.store.viewportTool().activeTool, false);
    }
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const canvas = this.canvasElement;
    if (canvas === null) {
      return;
    }
    canvas.focus({ preventScroll: true });
    const activeTool = this.store.viewportTool().activeTool;
    const mode = manipulatorModeForTool(activeTool);
    if (event.button === 0 && mode !== null && this.beginTransformDrag(event, mode)) {
      event.preventDefault();
      return;
    }
    const dragTool = event.button === 2
      ? 'orbit'
      : activeTool === 'orbit' || activeTool === 'pan'
        ? activeTool
        : null;
    if (dragTool !== null) {
      event.preventDefault();
      this.dragState = {
        pointerId: event.pointerId,
        tool: dragTool,
        x: event.clientX,
        y: event.clientY,
      };
      canvas.style.cursor = cursorForTool(dragTool, true);
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) {
      return;
    }

    const brush = this.store.voxelBrush();
    if (brush.enabled && brush.tool !== 'select') {
      event.preventDefault();
      const target = this.selectAtPointer(event);
      if (target === null) return;
      const coords = new Map<string, StudioVoxelPointerTarget['coord']>();
      coords.set(voxelCoordKey(target.coord), target.coord);
      this.voxelStrokeState = {
        pointerId: event.pointerId,
        coords,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    this.selectAtPointer(event);
  };

  private selectAtPointer(event: PointerEvent): StudioVoxelPointerTarget | null {
    const viewport = this.viewport;
    const canvas = this.canvasElement;
    if (viewport === null || canvas === null) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const receipt = viewport.pick({
      point: [event.clientX - rect.left, event.clientY - rect.top],
      filter: { channels: ['authored', 'runtime'], layers: ['scene'] },
    });
    const hint = receipt.hint;
    const runtimeScene = hint?.channel === 'runtime'
      ? this.store.readRuntimeSceneObjectSnapshot()
      : null;
    const route = resolveStudioViewportPickRoute(hint, runtimeScene);
    if (hint !== null) {
      this.showPickDebugHint(hint);
    }
    if (hint?.channel === 'authored') {
      const instanceId = this.authoredVoxelPickIndex.instanceForHandle(hint.handle);
      if (instanceId !== null) {
        const result = this.store.selectAuthoredVoxelInstanceAtViewport({
          cameraOrigin: viewport.camera().pose.position,
          instanceId,
          worldNormal: hint.normal,
          worldPosition: hint.position,
        });
        this.viewportReadout.set(viewport.readout());
        if (result === null || result.outcome.outcome === 'rejected') return null;
        const brush = this.store.voxelBrush();
        const context = this.store.voxelAuthoringMode();
        const coord = brush.tool === 'add' ? context.editAnchor : context.selectedCell;
        if (!brush.enabled || coord === null) return null;
        const overlay = this.authoredVoxelPickIndex.brushOverlay(
          instanceId,
          coord,
          brush.size,
          brush.tool,
        );
        if (overlay === null) return null;
        this.voxelBrushOverlay = overlay;
        this.renderOverlay();
        return { coord, instanceId, overlay };
      }
    }
    if (this.store.voxelAuthoringMode().mode === 'edit') {
      // Edit mode is locked to one Rust-bound voxel instance. Hits on other
      // authored objects are ignored so a painting gesture cannot silently
      // become an object-selection/manipulation gesture.
      return null;
    }
    if (route.kind === 'runtime') {
      this.store.selectRuntimeVoxelAtViewport({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        projectionAnchor: route.anchor,
      });
      if (runtimeScene !== null && route.sceneObjectId !== null) {
        this.store.applyRuntimeSceneObjectCommand({
          expectedDocumentHash: runtimeScene.documentHash,
          command: { kind: 'select', id: route.sceneObjectId },
        });
      }
      this.viewportReadout.set(viewport.readout());
      return null;
    }
    if (route.kind === 'authored' && route.renderableId !== null) {
      const renderableId = route.renderableId;
      const renderable = this.store
        .workspace()
        .scene.renderables.find(item => item.renderableId === renderableId);
      if (renderable !== undefined && renderable.pickable) {
        this.store.selectViewportHit(
          buildStudioViewportHitReadModel({
            renderable,
            face: faceFromProjectionNormal(route.normal),
            worldPosition: {
              x: route.position[0],
              y: route.position[1],
              z: route.position[2],
            },
          }),
        );
      }
    }
    this.viewportReadout.set(viewport.readout());
    return null;
  }

  private renderOverlay(): void {
    const viewport = this.viewport;
    if (viewport === null) return;
    viewport.channels.overlay.replace(buildViewportOverlayFrame(
      this.store.viewportAdapter(),
      this.debugPick,
      this.voxelBrushOverlay,
      this.currentManipulatorFrame(this.store.viewportAdapter()),
    ));
    viewport.renderOnce();
    this.viewportReadout.set(viewport.readout());
  }

  private showPickDebugHint(hint: AshaRendererEditorViewportPickHint): void {
    const viewport = this.viewport;
    if (viewport === null || !this.store.renderSettings().showRaycastHitDebug) {
      return;
    }
    this.debugPick = hint;
    viewport.channels.overlay.replace(buildViewportOverlayFrame(
      this.store.viewportAdapter(),
      hint,
      this.voxelBrushOverlay,
      this.currentManipulatorFrame(this.store.viewportAdapter()),
    ));
    viewport.renderOnce();
    if (this.debugPickTimer !== null) {
      clearTimeout(this.debugPickTimer);
    }
    this.debugPickTimer = setTimeout(() => {
      this.debugPick = null;
      this.viewport?.channels.overlay.replace(buildViewportOverlayFrame(
        this.store.viewportAdapter(),
        null,
        this.voxelBrushOverlay,
        this.currentManipulatorFrame(this.store.viewportAdapter()),
      ));
      this.viewport?.renderOnce();
      this.viewportReadout.set(this.viewport?.readout() ?? null);
      this.debugPickTimer = null;
    }, 10_000);
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const transformDrag = this.transformDragState;
    if (transformDrag?.pointerId === event.pointerId) {
      event.preventDefault();
      this.queueTransformPreview(event);
      return;
    }
    const voxelStroke = this.voxelStrokeState;
    if (voxelStroke !== null && voxelStroke.pointerId === event.pointerId) {
      event.preventDefault();
      if (Math.hypot(event.clientX - voxelStroke.lastX, event.clientY - voxelStroke.lastY) < 5) return;
      const target = this.selectAtPointer(event);
      if (target !== null) voxelStroke.coords.set(voxelCoordKey(target.coord), target.coord);
      this.voxelStrokeState = {
        ...voxelStroke,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      return;
    }
    const dragState = this.dragState;
    if (dragState === null || dragState.pointerId !== event.pointerId) {
      const mode = manipulatorModeForTool(this.store.viewportTool().activeTool);
      if (dragState === null && event.buttons === 0 && mode !== null) {
        const hovered = this.pickTransformManipulator(event);
        if (JSON.stringify(hovered) !== JSON.stringify(this.transformHoveredHandle)) {
          this.transformHoveredHandle = hovered;
          this.renderOverlay();
        }
      }
      if (
        dragState === null
        && event.buttons === 0
        && this.store.voxelBrush().enabled
        && event.timeStamp - this.lastVoxelHoverAt >= 80
      ) {
        this.lastVoxelHoverAt = event.timeStamp;
        this.selectAtPointer(event);
      }
      return;
    }
    event.preventDefault();
    const delta = {
      deltaX: event.clientX - dragState.x,
      deltaY: event.clientY - dragState.y,
    };

    if (dragState.tool === 'orbit') {
      if (this.store.runtimeViewportEvidence().camera === null) {
        this.store.orbitViewportCamera({
          deltaX: delta.deltaX,
          deltaY: delta.deltaY * (this.store.effectiveSettings().invertLookY ? -1 : 1),
        });
      } else {
        this.store.applyRuntimeViewportCameraInput('look', delta);
      }
    } else if (dragState.tool === 'pan') {
      if (this.store.runtimeViewportEvidence().camera === null) {
        this.store.panViewportCamera({
          deltaX: delta.deltaX,
          deltaY: delta.deltaY * (this.store.effectiveSettings().invertPanY ? -1 : 1),
        });
      } else {
        this.store.applyRuntimeViewportCameraInput('pan', delta);
      }
    }
    this.dragState = {
      ...dragState,
      x: event.clientX,
      y: event.clientY,
    };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const canvas = this.canvasElement;
    const transformDrag = this.transformDragState;
    if (transformDrag?.pointerId === event.pointerId && canvas !== null) {
      event.preventDefault();
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (this.transformPreviewFrameRequest !== null) {
        cancelAnimationFrame(this.transformPreviewFrameRequest);
        this.transformPreviewFrameRequest = null;
      }
      this.pendingTransformPointer = {
        point: this.pointerPoint(event),
        fine: event.shiftKey,
        snapping: event.ctrlKey
          ? !this.store.transformManipulatorSnapping()
          : this.store.transformManipulatorSnapping(),
      };
      this.flushTransformPreview();
      const settledDrag = this.transformDragState;
      if (settledDrag === null) return;
      const result = this.store.commitSelectedSceneObjectTransform(
        settledDrag.candidate.revision,
        settledDrag.candidateLocalTransform,
      );
      if (result.accepted) this.syncCurrentViewport();
      else this.restoreAuthoritativeTransform();
      this.transformDragState = null;
      this.transformHoveredHandle = null;
      this.renderOverlay();
      canvas.style.cursor = cursorForTool(this.store.viewportTool().activeTool, false);
      return;
    }
    const voxelStroke = this.voxelStrokeState;
    if (voxelStroke?.pointerId === event.pointerId && canvas !== null) {
      const target = this.selectAtPointer(event);
      if (target !== null) voxelStroke.coords.set(voxelCoordKey(target.coord), target.coord);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      this.voxelStrokeState = null;
      this.store.commitVoxelBrushStroke([...voxelStroke.coords.values()]);
      return;
    }
    const dragState = this.dragState;
    if (dragState?.pointerId !== event.pointerId || canvas === null) {
      return;
    }
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    this.dragState = null;
    canvas.style.cursor = cursorForTool(
      this.store.viewportTool().activeTool,
      false,
    );
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    const canvas = this.canvasElement;
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (this.voxelStrokeState?.pointerId === event.pointerId) this.voxelStrokeState = null;
    if (this.dragState?.pointerId === event.pointerId) this.dragState = null;
    if (this.transformDragState?.pointerId === event.pointerId) this.cancelTransformDrag();
    this.clearCameraMovement();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.transformDragState !== null) {
      event.preventDefault();
      const pointerId = this.transformDragState.pointerId;
      if (this.canvasElement?.hasPointerCapture(pointerId)) {
        this.canvasElement.releasePointerCapture(pointerId);
      }
      this.cancelTransformDrag();
      return;
    }
    const bindings = this.store.effectiveSettings().keyboard;
    if (this.store.runtimeViewportEvidence().camera !== null
      || !isStudioCameraMovementCode(event.code, bindings)) return;
    event.preventDefault();
    this.pressedCameraMovementCodes.add(event.code);
    this.startCameraMovement();
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!this.pressedCameraMovementCodes.delete(event.code)) return;
    event.preventDefault();
    if (this.pressedCameraMovementCodes.size === 0) this.stopCameraMovementFrame();
  };

  private readonly handleCanvasBlur = (): void => this.clearCameraMovement();

  private readonly handleWindowBlur = (): void => this.clearCameraMovement();

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') this.clearCameraMovement();
  };

  private startCameraMovement(): void {
    if (this.cameraMovementFrameRequest !== null) return;
    this.lastCameraMovementFrameAt = performance.now();
    this.cameraMovementFrameRequest = requestAnimationFrame(this.advanceCameraMovement);
  }

  private readonly advanceCameraMovement = (timestamp: number): void => {
    this.cameraMovementFrameRequest = null;
    if (this.destroyed || this.store.runtimeViewportEvidence().camera !== null) {
      this.clearCameraMovement();
      return;
    }
    const settings = this.store.effectiveSettings();
    const axes = resolveStudioCameraMovementAxes(this.pressedCameraMovementCodes, settings.keyboard);
    const previousTimestamp = this.lastCameraMovementFrameAt ?? timestamp;
    const elapsedSeconds = Math.min(Math.max((timestamp - previousTimestamp) / 1_000, 0), 0.1);
    this.lastCameraMovementFrameAt = timestamp;
    if (hasStudioCameraMovement(axes) && elapsedSeconds > 0) {
      const speed = settings.cameraMoveSpeed * (axes.boosted ? settings.cameraBoostMultiplier : 1);
      this.store.moveViewportCamera({
        forward: axes.forward,
        right: axes.right,
        up: axes.up,
        distance: speed * elapsedSeconds,
      });
    }
    if (this.pressedCameraMovementCodes.size > 0) {
      this.cameraMovementFrameRequest = requestAnimationFrame(this.advanceCameraMovement);
    } else {
      this.lastCameraMovementFrameAt = null;
    }
  };

  private clearCameraMovement(): void {
    this.pressedCameraMovementCodes.clear();
    this.stopCameraMovementFrame();
  }

  private stopCameraMovementFrame(): void {
    if (this.cameraMovementFrameRequest !== null) {
      cancelAnimationFrame(this.cameraMovementFrameRequest);
      this.cameraMovementFrameRequest = null;
    }
    this.lastCameraMovementFrameAt = null;
  }

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (this.store.runtimeViewportEvidence().camera === null) {
      this.store.zoomViewportCamera(event.deltaY);
    } else {
      this.store.applyRuntimeViewportCameraInput('zoom', { deltaX: 0, deltaY: event.deltaY });
    }
  };

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
