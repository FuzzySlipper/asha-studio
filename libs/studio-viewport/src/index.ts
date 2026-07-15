import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
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
import type { WorkspaceAuthoringProjectionSummary } from '@asha/runtime-session';
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
import { resolveStudioViewportPickRoute } from './viewport-pick-routing.js';

export {
  resolveStudioViewportPickRoute,
  type StudioRuntimeViewportPickAnchor,
  type StudioViewportPickRoute,
} from './viewport-pick-routing.js';

type StudioRenderColor = readonly [number, number, number];

interface StudioViewportResourceProbe {
  readonly status: 'idle' | 'rejected_as_expected' | 'unexpectedly_applied';
  readonly isolated: boolean;
  readonly diagnostic: string | null;
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
  const renderableCenter = center(renderable.bounds);
  const renderableSize = size(renderable.bounds);
  return {
    translation: [
      renderableCenter.x,
      renderableCenter.y,
      renderableCenter.z,
    ],
    rotation: [0, 0, 0, 1],
    scale: [
      renderableSize.x,
      renderableSize.y,
      renderable.kind === 'voxel_grid' ? 0.04 : renderableSize.z,
    ],
  };
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
          return { ...op, handle: remap(op.handle), parent: op.parent === null ? null : remap(op.parent) };
        case 'update':
        case 'destroy':
        case 'replaceMeshPayload':
        case 'setMaterialInstanceParameters':
        case 'setAnimatedMeshPlayback':
        case 'updateSprite':
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
      ? [op.handle]
      : []
  ));
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
): RenderFrameDiff {
  const ops: RenderDiff[] = [];
  let handle = 1;
  if (adapter.renderSettings.showGrid) {
    for (let index = 0; index <= 16; index += 1) {
      const offset = -2 + index * 0.25;
      ops.push({
        op: 'create',
        handle: renderHandle(handle),
        parent: null,
        node: createDebugNode(`editor-grid-x:${index}`, [0, offset, -0.04], [4, 0.008, 0.008], [0.035, 0.098, 0.129, 0.72]),
      });
      handle += 1;
      ops.push({
        op: 'create',
        handle: renderHandle(handle),
        parent: null,
        node: createDebugNode(`editor-grid-y:${index}`, [offset, 0, -0.04], [0.008, 4, 0.008], [0.035, 0.098, 0.129, 0.72]),
      });
      handle += 1;
    }
  }
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
  return { ops };
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
        <canvas
          #canvas
          class="viewport-scene__canvas"
          data-renderer-owner="asha-renderer-host"
          aria-label="ASHA engine renderer viewport"
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
            <button
              type="button"
              data-renderer-resource-probe
              (click)="probeMissingPreviewResource()"
            >
              Probe missing preview resource
            </button>
            <small
              [attr.data-renderer-resource-probe-status]="resourceProbe().status"
              [attr.data-renderer-resource-probe-isolated]="resourceProbe().isolated"
            >
              {{ resourceProbe().status }} · {{ resourceProbe().diagnostic ?? 'not run' }}
            </small>
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

      .viewport-scene__canvas {
        display: block;
        height: 100%;
        inset: 0;
        position: absolute;
        touch-action: none;
        width: 100%;
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
  readonly resourceProbe = signal<StudioViewportResourceProbe>({
    status: 'idle',
    isolated: true,
    diagnostic: null,
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
  private authoredBaseHandles: readonly RenderHandle[] = [];
  private readonly authoredVoxelPickIndex = new AuthoredVoxelProjectionPickIndex();
  private debugPick: AshaRendererEditorViewportPickHint | null = null;
  private debugPickTimer: ReturnType<typeof setTimeout> | null = null;
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
    const runtimeProjection = this.store.runtimeViewportProjection();
    const authoringProjection = this.store.workspaceAuthoringProjection();
    const runtimeEvidence = this.store.runtimeViewportEvidence();
    this.syncViewport(
      adapter,
      runtimeProjection?.frame ?? null,
      runtimeProjection?.projectionHash ?? null,
      runtimeEvidence.materialPreview?.previewDiff ?? null,
      runtimeEvidence.camera,
      authoringProjection,
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
    const runtimeEvidence = this.store.runtimeViewportEvidence();
    this.syncViewport(
      this.store.viewportAdapter(),
      runtimeProjection?.frame ?? null,
      runtimeProjection?.projectionHash ?? null,
      runtimeEvidence.materialPreview?.previewDiff ?? null,
      runtimeEvidence.camera,
      authoringProjection,
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
    this.viewport?.channels.runtime.clear();
    this.viewport?.channels.authored.clear();
    this.viewport?.channels.overlay.clear();
    this.viewport?.dispose();
    this.viewport = null;
    this.viewportReadout.set(null);
    this.authoredBaseHandles = [];
    this.authoredVoxelPickIndex.clear();
  }

  probeMissingPreviewResource(): void {
    const viewport = this.viewport;
    if (viewport === null) {
      return;
    }
    const before = {
      runtime: viewport.channels.runtime.snapshot().hash,
      authored: viewport.channels.authored.snapshot().hash,
      overlay: viewport.channels.overlay.snapshot().hash,
    };
    const receipt = viewport.channels.authored.replace({
      ops: [{
        op: 'createStaticMeshInstance',
        handle: renderHandle(900_001),
        parent: null,
        instance: {
          asset: 'mesh.missing-studio-preview-resource',
          transform: {
            translation: [0, 0, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
          materialOverrides: [],
          metadata: { source: null, tags: [], label: 'missing Studio preview resource' },
        },
      }],
    });
    const after = {
      runtime: viewport.channels.runtime.snapshot().hash,
      authored: viewport.channels.authored.snapshot().hash,
      overlay: viewport.channels.overlay.snapshot().hash,
    };
    this.resourceProbe.set({
      status: receipt.applied ? 'unexpectedly_applied' : 'rejected_as_expected',
      isolated: before.runtime === after.runtime
        && before.authored === after.authored
        && before.overlay === after.overlay,
      diagnostic: receipt.diagnostics[0]?.message ?? null,
    });
    this.viewportReadout.set(viewport.readout());
  }

  private installInputListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private removeInputListeners(): void {
    const canvas = this.canvasElement;
    if (canvas === null) {
      return;
    }
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointercancel', this.handlePointerUp);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    canvas.removeEventListener('wheel', this.handleWheel);
  }

  private syncViewport(
    adapter: StudioViewportAdapterReadModel,
    runtimeFrame: RenderFrameDiff | null,
    runtimeKey: string | null,
    materialPreviewFrame: RenderFrameDiff | null,
    runtimeCamera: CameraSnapshot | null,
    authoringProjection: WorkspaceAuthoringProjectionSummary | null,
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
    canvas.style.cursor = cursorForTool(adapter.tool.activeTool, this.dragState !== null);
    const sceneKey = [
      adapter.sceneHash,
      adapter.selectedRenderableId ?? 'none',
      adapter.renderSettings.renderSettingsHash,
      materialPreviewFrame === null ? 'no-material-preview' : JSON.stringify(materialPreviewFrame),
    ].join(':');
    const baseFrame = buildViewportProjectionFrame(adapter, materialPreviewFrame);
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

    if (
      authoringProjection !== null
      && projectionChanged
      && authoringProjection.delivery === 'replace'
    ) {
      this.authoredVoxelPickIndex.replace(authoringProjection.frame);
      this.publishVoxelInstanceBounds();
      viewport.channels.authored.replace({
        ops: [...baseFrame.ops, ...authoringProjection.frame.ops],
      });
      this.authoredBaseHandles = createdRenderHandles(baseFrame);
      this.renderedSceneKey = sceneKey;
      this.renderedAuthoringProjectionKey = projectionKey;
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
      }
      if (authoringProjection !== null && projectionChanged) {
        this.authoredVoxelPickIndex.apply(authoringProjection.frame);
        this.publishVoxelInstanceBounds();
        viewport.channels.authored.apply(authoringProjection.frame);
        this.renderedAuthoringProjectionKey = projectionKey;
      }
    }
    if (sceneChanged) {
      viewport.channels.overlay.replace(buildViewportOverlayFrame(adapter, this.debugPick));
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

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const canvas = this.canvasElement;
    if (canvas === null) {
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
      canvas.style.cursor = cursorForTool(dragTool, true);
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) {
      return;
    }

    this.selectAtPointer(event);
  };

  private selectAtPointer(event: PointerEvent): void {
    const viewport = this.viewport;
    const canvas = this.canvasElement;
    if (viewport === null || canvas === null) {
      return;
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
        this.store.selectAuthoredVoxelInstanceAtViewport({
          cameraOrigin: viewport.camera().pose.position,
          instanceId,
          worldNormal: hint.normal,
          worldPosition: hint.position,
        });
        this.viewportReadout.set(viewport.readout());
        return;
      }
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
      return;
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
  }

  private showPickDebugHint(hint: AshaRendererEditorViewportPickHint): void {
    const viewport = this.viewport;
    if (viewport === null || !this.store.renderSettings().showRaycastHitDebug) {
      return;
    }
    this.debugPick = hint;
    viewport.channels.overlay.replace(buildViewportOverlayFrame(this.store.viewportAdapter(), hint));
    viewport.renderOnce();
    if (this.debugPickTimer !== null) {
      clearTimeout(this.debugPickTimer);
    }
    this.debugPickTimer = setTimeout(() => {
      this.debugPick = null;
      this.viewport?.channels.overlay.replace(buildViewportOverlayFrame(this.store.viewportAdapter(), null));
      this.viewport?.renderOnce();
      this.viewportReadout.set(this.viewport?.readout() ?? null);
      this.debugPickTimer = null;
    }, 10_000);
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
      if (this.store.runtimeViewportEvidence().camera === null) {
        this.store.orbitViewportCamera(delta);
      } else {
        this.store.applyRuntimeViewportCameraInput('look', delta);
      }
    } else if (dragState.tool === 'pan') {
      if (this.store.runtimeViewportEvidence().camera === null) {
        this.store.panViewportCamera(delta);
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
    const dragState = this.dragState;
    const canvas = this.canvasElement;
    if (dragState?.pointerId !== event.pointerId || canvas === null) {
      return;
    }
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
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
    canvas.style.cursor = cursorForTool(
      this.store.viewportTool().activeTool,
      false,
    );
  };

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
