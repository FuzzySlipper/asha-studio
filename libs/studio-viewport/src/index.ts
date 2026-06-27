import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type {
  StudioSceneReadModel,
  StudioSceneRenderableReadModel,
} from '@asha-studio/domain';
import { StudioWorkspaceStore } from '@asha-studio/store';

export interface StudioViewportRenderableProjection {
  readonly renderable: StudioSceneRenderableReadModel;
  readonly selected: boolean;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
  readonly elevationPixels: number;
  readonly zIndex: number;
}

function clampPercent(value: number): number {
  return Math.min(96, Math.max(4, value));
}

function zIndexForRenderable(renderable: StudioSceneRenderableReadModel, selected: boolean): number {
  const baseByKind: Record<StudioSceneRenderableReadModel['kind'], number> = {
    voxel_grid: 0,
    preview_ghost: 40,
    voxel_cell: 70,
    static_mesh: 80,
  };
  const centerY = (renderable.bounds.min.y + renderable.bounds.max.y) / 2;
  const centerZ = (renderable.bounds.min.z + renderable.bounds.max.z) / 2;
  const selectedOffset = selected ? 100 : 0;

  return baseByKind[renderable.kind] + selectedOffset + Math.round(centerY * 10 + centerZ * 20);
}

export function projectViewportRenderables(
  scene: StudioSceneReadModel,
): readonly StudioViewportRenderableProjection[] {
  return scene.renderables.map(renderable => {
    const width = Math.max(5, ((renderable.bounds.max.x - renderable.bounds.min.x) / 3) * 70);
    const height = Math.max(5, ((renderable.bounds.max.y - renderable.bounds.min.y) / 3) * 62);
    const centerX = (renderable.bounds.min.x + renderable.bounds.max.x) / 2;
    const centerY = (renderable.bounds.min.y + renderable.bounds.max.y) / 2;
    const centerZ = (renderable.bounds.min.z + renderable.bounds.max.z) / 2;
    const selected = renderable.renderableId === scene.selectedRenderableId;

    return {
      renderable,
      selected,
      leftPercent: clampPercent(15 + (centerX / 3) * 70),
      topPercent: clampPercent(18 + (centerY / 3) * 62 - centerZ * 5),
      widthPercent: width,
      heightPercent: height,
      elevationPixels: Math.round(centerZ * 22),
      zIndex: zIndexForRenderable(renderable, selected),
    };
  });
}

@Component({
  selector: 'asha-studio-viewport',
  standalone: true,
  template: `
    <section class="viewport-scene" data-visual-id="studio-viewport">
      <div class="viewport-scene__header">
        <span>4 · Viewport / Scene View</span>
        <strong>{{ store.workspace().scene.sceneId }}</strong>
      </div>

      <div class="viewport-scene__surface" aria-label="Scene viewport">
        <div class="viewport-scene__grid" aria-hidden="true"></div>

        @for (projection of projections(); track projection.renderable.renderableId) {
          <button
            class="renderable"
            type="button"
            [class.renderable--grid]="projection.renderable.kind === 'voxel_grid'"
            [class.renderable--voxel]="projection.renderable.kind === 'voxel_cell'"
            [class.renderable--mesh]="projection.renderable.kind === 'static_mesh'"
            [class.renderable--preview]="projection.renderable.kind === 'preview_ghost'"
            [class.renderable--selected]="projection.selected"
            [style.left.%]="projection.leftPercent"
            [style.top.%]="projection.topPercent"
            [style.width.%]="projection.widthPercent"
            [style.height.%]="projection.heightPercent"
            [style.--viewport-elevation.px]="projection.elevationPixels"
            [style.z-index]="projection.zIndex"
            (click)="store.selectEntity(projection.renderable.renderableId)"
          >
            <span class="renderable__label">{{ projection.renderable.label }}</span>
            <span class="renderable__hash">{{ projection.renderable.renderHash }}</span>
          </button>
        }

        <div class="selection-readout">
          <span>selected target</span>
          <strong>{{ store.workspace().scene.selectedRenderableId ?? 'none' }}</strong>
        </div>

        <div class="axis-gizmo" aria-hidden="true">
          <span class="axis-gizmo__x">X</span>
          <span class="axis-gizmo__y">Y</span>
          <span class="axis-gizmo__z">Z</span>
        </div>
      </div>

      <footer class="viewport-scene__footer">
        <span>{{ store.workspace().scene.sceneHash }}</span>
        <span>{{ store.readbackMarker() }}</span>
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

      .viewport-scene__surface {
        background:
          linear-gradient(rgba(84, 199, 189, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(84, 199, 189, 0.06) 1px, transparent 1px),
          radial-gradient(circle at 50% 44%, rgba(84, 199, 189, 0.1), transparent 36%),
          #101820;
        background-size: 2rem 2rem, 2rem 2rem, auto, auto;
        border: 1px solid #24313b;
        box-sizing: border-box;
        min-height: 0;
        min-width: 0;
        overflow: hidden;
        position: relative;
      }

      .viewport-scene__grid {
        border: 1px solid rgba(84, 199, 189, 0.18);
        bottom: 12%;
        left: 12%;
        position: absolute;
        right: 12%;
        top: 14%;
      }

      .renderable {
        --viewport-elevation: 0px;
        align-items: start;
        background: rgba(55, 123, 155, 0.62);
        border: 1px solid rgba(109, 184, 202, 0.88);
        box-shadow:
          0 var(--viewport-elevation) 0 rgba(23, 31, 38, 0.72),
          0 0 0 1px rgba(0, 0, 0, 0.22) inset;
        box-sizing: border-box;
        color: var(--asha-color-ink);
        cursor: pointer;
        display: grid;
        align-content: start;
        font: inherit;
        gap: 0.15rem;
        justify-items: start;
        min-height: 2rem;
        min-width: 2rem;
        overflow: hidden;
        padding: 0.35rem;
        position: absolute;
        text-align: left;
        transform: translate(-50%, calc(-50% - var(--viewport-elevation)));
      }

      .renderable:hover {
        filter: brightness(1.12);
      }

      .renderable--grid {
        background: rgba(46, 99, 129, 0.28);
        border-style: dashed;
      }

      .renderable--grid .renderable__label,
      .renderable--grid .renderable__hash {
        justify-self: end;
        opacity: 0.68;
      }

      .renderable--voxel {
        background: rgba(211, 148, 65, 0.86);
        border-color: #e9b15e;
        color: #111820;
      }

      .renderable--mesh {
        background: rgba(201, 142, 77, 0.78);
        border-color: #f1bf80;
        color: #111820;
      }

      .renderable--preview {
        background: rgba(84, 199, 189, 0.22);
        border-color: #54c7bd;
        border-style: dashed;
        color: #d5fbf8;
      }

      .renderable--preview .renderable__label,
      .renderable--preview .renderable__hash {
        justify-self: end;
      }

      .renderable--selected {
        outline: 2px solid #54c7bd;
        outline-offset: 0.2rem;
      }

      .renderable__label,
      .renderable__hash {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .renderable__label {
        font-size: 0.72rem;
        font-weight: 800;
      }

      .renderable__hash {
        font-size: 0.58rem;
        opacity: 0.76;
      }

      .selection-readout {
        background: rgba(11, 17, 23, 0.9);
        border: 1px solid rgba(84, 199, 189, 0.45);
        bottom: 1rem;
        color: var(--asha-color-muted);
        display: grid;
        font-size: 0.68rem;
        gap: 0.2rem;
        left: 50%;
        max-width: min(34rem, calc(100% - 2rem));
        min-width: 16rem;
        padding: 0.4rem 0.55rem;
        position: absolute;
        transform: translateX(-50%);
      }

      .selection-readout strong {
        color: var(--asha-color-ink);
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
        .renderable__hash {
          display: none;
        }

        .selection-readout {
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
export class StudioViewportComponent {
  readonly store = inject(StudioWorkspaceStore);

  readonly projections = computed(() =>
    projectViewportRenderables(this.store.workspace().scene),
  );
}
