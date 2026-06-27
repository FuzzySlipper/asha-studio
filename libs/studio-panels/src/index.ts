import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type {
  StudioBounds,
  StudioCommandTimelineEntry,
  StudioEntityKind,
  StudioSceneRenderableReadModel,
  StudioViewportToolMode,
} from '@asha-studio/domain';
import { StudioWorkspaceStore } from '@asha-studio/store';

@Component({
  selector: 'asha-session-top-panel',
  standalone: true,
  template: `
    <section class="session-top-panel" data-visual-id="studio-top-panel">
      <div class="panel-kicker">2 · Top Panel</div>
      <div class="readback-marker">{{ store.readbackMarker() }}</div>
      <div class="session-line">
        <strong>{{ store.workspace().session.scenarioLabel }}</strong>
        <span>{{ store.workspace().session.sessionId }}</span>
        <span>{{ store.workspace().session.runtimeMode }}</span>
        <span>{{ store.workspace().session.status }}</span>
      </div>
    </section>
  `,
  styles: [
    `
      .session-top-panel {
        align-content: center;
        background: var(--asha-color-chrome);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.2rem 0.75rem;
        grid-template-columns: auto minmax(0, 1fr);
        grid-template-rows: auto auto;
        height: 100%;
        min-width: 0;
        padding: 0.5rem 0.75rem;
      }

      .panel-kicker,
      .readback-marker {
        color: var(--asha-color-muted);
        font-size: 0.75rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .panel-kicker {
        grid-column: 1;
      }

      .readback-marker {
        grid-column: 2;
        justify-self: end;
        max-width: 100%;
      }

      .session-line {
        align-items: center;
        display: flex;
        gap: 0.75rem;
        grid-column: 1 / -1;
        min-width: 0;
      }

      .session-line strong,
      .session-line span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioSessionTopPanelComponent {
  readonly store = inject(StudioWorkspaceStore);
}

@Component({
  selector: 'asha-viewport-toolbar-panel',
  standalone: true,
  template: `
    <section class="viewport-toolbar-panel" data-visual-id="studio-viewport-top-panel">
      <span class="panel-kicker">3 · Viewport Top Panel</span>
      <div class="tool-buttons" aria-label="Viewport tools">
        @for (tool of tools; track tool) {
          <button
            type="button"
            [class.active]="store.viewportTool().activeTool === tool"
            (click)="activateTool(tool)"
          >
            {{ toolLabel(tool) }}
          </button>
        }
      </div>
      <span>renderables: {{ store.viewportAdapter().renderables.length }}</span>
      <span>selected: {{ store.viewportAdapter().selectedRenderableId ?? 'none' }}</span>
      <span>{{ store.viewportAdapter().readbackHash }}</span>
    </section>
  `,
  styles: [
    `
      .viewport-toolbar-panel {
        align-items: center;
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: flex;
        gap: 0.75rem;
        height: 100%;
        min-width: 0;
        overflow: hidden;
        padding: 0 0.75rem;
      }

      .viewport-toolbar-panel span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tool-buttons {
        display: flex;
        flex: 0 0 auto;
        gap: 0.25rem;
      }

      .tool-buttons button {
        background: transparent;
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        height: 1.8rem;
        line-height: 1;
        min-width: 2rem;
        padding: 0 0.45rem;
      }

      .tool-buttons button.active {
        background: var(--asha-color-control);
        border-color: #54c7bd;
      }

      .panel-kicker {
        color: var(--asha-color-muted);
        flex: 0 0 auto;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      @media (max-width: 900px) {
        .viewport-toolbar-panel > span:not(.panel-kicker) {
          display: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioViewportToolbarPanelComponent {
  readonly store = inject(StudioWorkspaceStore);
  readonly tools: readonly StudioViewportToolMode[] = ['select', 'orbit', 'pan', 'frame'];

  activateTool(tool: StudioViewportToolMode): void {
    this.store.setViewportTool(tool);
    if (tool === 'frame') {
      this.store.frameViewportCamera();
      this.store.setViewportTool('select');
    }
  }

  toolLabel(tool: StudioViewportToolMode): string {
    const labels: Record<StudioViewportToolMode, string> = {
      select: 'S',
      orbit: 'O',
      pan: 'P',
      frame: 'F',
    };
    return labels[tool];
  }
}

@Component({
  selector: 'asha-hierarchy-panel',
  standalone: true,
  template: `
    <section class="hierarchy-panel" data-visual-id="studio-hierarchy-panel">
      <header class="panel-header">
        <div>
          <span class="panel-kicker">1 · Scene / Hierarchy</span>
          <strong>{{ store.workspace().session.scenarioLabel }}</strong>
        </div>
        <div class="header-actions" aria-label="Hierarchy actions">
          <button type="button" title="Add">+</button>
          <button type="button" title="Focus selected">F</button>
        </div>
      </header>

      <div class="tree-list">
        @for (entity of store.workspace().entities; track entity.id) {
          <button
            class="tree-row"
            type="button"
            [class.tree-row--selected]="entity.selected"
            [class.tree-row--static]="!entity.selectable"
            [disabled]="!entity.selectable"
            [style.padding-left.px]="entity.depth * 14 + 8"
            (click)="store.selectEntity(entity.id)"
          >
            <span class="tree-toggle">{{ entity.expanded ? 'v' : '>' }}</span>
            <span class="tree-icon">{{ iconForKind(entity.kind) }}</span>
            <span class="tree-label">{{ entity.label }}</span>
            <small
              class="tree-badge"
              [class.tree-badge--authority-backed]="entity.badge === 'authority-backed'"
              [class.tree-badge--preview-only]="entity.badge === 'preview-only'"
              [class.tree-badge--projected]="entity.badge === 'projected'"
              [class.tree-badge--reference]="entity.badge === 'reference'"
              [class.tree-badge--selected]="entity.badge === 'selected'"
            >
              {{ entity.badge }}
            </small>
          </button>
        }
      </div>

      <footer class="state-legend" aria-label="State legend">
        <span>projected</span>
        <span>authority</span>
        <span>preview</span>
        <span>selected</span>
      </footer>
    </section>
  `,
  styles: [
    `
      .hierarchy-panel {
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.65rem;
        grid-template-rows: auto minmax(0, 1fr) auto;
        height: 100%;
        min-width: 0;
        overflow: hidden;
        padding: 0.65rem;
      }

      .panel-header {
        align-items: center;
        display: grid;
        gap: 0.5rem;
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .panel-header div:first-child {
        display: grid;
        gap: 0.2rem;
        min-width: 0;
      }

      .panel-header strong,
      .tree-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .panel-kicker {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .header-actions {
        display: flex;
        gap: 0.25rem;
      }

      .header-actions button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        height: 1.65rem;
        line-height: 1;
        min-width: 1.65rem;
        padding: 0;
      }

      .tree-list {
        align-content: start;
        display: grid;
        gap: 0.1rem;
        min-height: 0;
        overflow: auto;
      }

      .tree-row {
        align-items: center;
        background: transparent;
        border: 1px solid transparent;
        color: var(--asha-color-ink);
        cursor: pointer;
        display: flex;
        font: inherit;
        gap: 0.35rem;
        min-height: 1.75rem;
        min-width: 0;
        padding-bottom: 0;
        padding-right: 0.35rem;
        padding-top: 0;
        text-align: left;
      }

      .tree-row:hover:not(:disabled),
      .tree-row--selected {
        background: var(--asha-color-control);
      }

      .tree-row--selected {
        border-color: #54c7bd;
      }

      .tree-row:disabled {
        cursor: default;
      }

      .tree-toggle,
      .tree-icon {
        color: var(--asha-color-muted);
        flex: 0 0 auto;
        font-size: 0.7rem;
        text-align: center;
        width: 0.8rem;
      }

      .tree-label {
        flex: 1 1 auto;
      }

      .tree-badge {
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-muted);
        flex: 0 0 auto;
        font-size: 0.62rem;
        line-height: 1;
        padding: 0.2rem 0.28rem;
      }

      .tree-badge--authority-backed,
      .tree-badge--selected {
        border-color: #54c7bd;
        color: #8de0d8;
      }

      .tree-badge--preview-only {
        border-color: #d3a644;
        color: #e8c46d;
      }

      .state-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .state-legend span {
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-muted);
        font-size: 0.62rem;
        padding: 0.18rem 0.28rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioHierarchyPanelComponent {
  readonly store = inject(StudioWorkspaceStore);

  iconForKind(kind: StudioEntityKind): string {
    const labels: Record<StudioEntityKind, string> = {
      session: 'S',
      scene: '#',
      collection: 'A',
      voxel_grid: 'G',
      voxel_cell: 'V',
      static_mesh: 'M',
      preview_ghost: 'P',
    };
    return labels[kind];
  }
}

@Component({
  selector: 'asha-viewport-scene-panel',
  standalone: true,
  template: `
    <section class="viewport-scene-panel" data-visual-id="studio-viewport">
      <span class="panel-number">4</span>
      <span class="panel-title">Viewport / Scene View</span>
      <div class="scene-readout">
        <span>{{ store.workspace().scene.sceneId }}</span>
        <span>{{ store.workspace().scene.sceneHash }}</span>
      </div>
    </section>
  `,
  styles: [
    `
      .viewport-scene-panel {
        background: var(--asha-color-viewport);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        height: 100%;
        min-width: 0;
        overflow: hidden;
        padding: 0.75rem;
      }

      .panel-number {
        font-size: clamp(4rem, 10vw, 8rem);
        font-weight: 800;
        line-height: 0.9;
      }

      .panel-title,
      .scene-readout {
        align-self: end;
        color: var(--asha-color-muted);
      }

      .panel-title {
        font-size: 0.875rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .scene-readout {
        display: grid;
        font-size: 0.75rem;
        gap: 0.25rem;
        min-width: 0;
      }

      .scene-readout span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioViewportScenePanelComponent {
  readonly store = inject(StudioWorkspaceStore);
}

@Component({
  selector: 'asha-inspector-panel',
  standalone: true,
  template: `
    <section class="inspector-panel" data-visual-id="studio-inspector-panel">
      <header class="inspector-header">
        <span class="panel-kicker">6 · Inspector</span>
        <span class="inspector-context">voxel · preview-crate</span>
      </header>

      @if (store.selectedRenderable(); as renderable) {
        <div class="object-summary">
          <span class="object-chip">{{ iconForRenderable(renderable) }}</span>
          <div>
            <strong>{{ renderable.label }}</strong>
            <span>{{ renderable.renderableId }}</span>
          </div>
        </div>

        <div class="state-cards">
          <article>
            <span>Preview</span>
            <strong>{{ renderable.visible ? 'visible' : 'hidden' }}</strong>
            <small>{{ renderable.pickable ? 'pickable' : 'read-only pick' }}</small>
          </article>
          <article class="state-cards__applied">
            <span>Applied</span>
            <strong>{{ renderable.sourceState }}</strong>
            <small>timeline {{ store.workspace().timelineSequence }}</small>
          </article>
        </div>

        <div class="inspector-scroll">
          <section class="field-section">
            <h2>Identity</h2>
            <dl>
              <dt>kind</dt>
              <dd>{{ renderable.kind }}</dd>
              <dt>mesh</dt>
              <dd>{{ renderable.meshRef ?? 'none' }}</dd>
              <dt>material</dt>
              <dd>{{ renderable.materialRef ?? 'none' }}</dd>
            </dl>
          </section>

          <section class="field-section">
            <h2>Transform Readout</h2>
            <dl>
              <dt>bounds</dt>
              <dd>{{ selectedBoundsLabel() }}</dd>
              <dt>center</dt>
              <dd>{{ selectedCenterLabel() }}</dd>
              <dt>source</dt>
              <dd>{{ renderable.sourceState }}</dd>
            </dl>
          </section>

          <section class="field-section">
            <h2>Evidence</h2>
            <dl>
              <dt>render hash</dt>
              <dd>{{ renderable.renderHash }}</dd>
              <dt>scene hash</dt>
              <dd>{{ store.workspace().scene.sceneHash }}</dd>
              <dt>readback</dt>
              <dd>{{ store.readbackMarker() }}</dd>
            </dl>
          </section>
        </div>
      } @else {
        <p class="empty-state">No selected renderable.</p>
      }
    </section>
  `,
  styles: [
    `
      .inspector-panel {
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.65rem;
        grid-template-rows: auto auto auto minmax(0, 1fr);
        height: 100%;
        min-width: 0;
        overflow: hidden;
        padding: 0.65rem;
      }

      .inspector-header {
        align-items: center;
        display: flex;
        gap: 0.5rem;
        justify-content: space-between;
        min-width: 0;
      }

      .panel-kicker,
      .inspector-context {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .inspector-context {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .object-summary {
        align-items: center;
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        display: grid;
        gap: 0.55rem;
        grid-template-columns: auto minmax(0, 1fr);
        min-width: 0;
        padding: 0.5rem;
      }

      .object-chip {
        align-items: center;
        background: #c98e4d;
        color: #111820;
        display: inline-flex;
        font-size: 0.8rem;
        font-weight: 800;
        height: 2rem;
        justify-content: center;
        width: 2rem;
      }

      .object-summary div {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .object-summary strong,
      .object-summary span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .object-summary span {
        color: var(--asha-color-muted);
        font-size: 0.72rem;
      }

      .state-cards {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .state-cards article {
        border: 1px solid #2d5b78;
        display: grid;
        gap: 0.2rem;
        min-width: 0;
        padding: 0.45rem;
      }

      .state-cards__applied {
        border-color: #317351;
      }

      .state-cards span,
      .state-cards small {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
      }

      .state-cards strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .inspector-scroll {
        align-content: start;
        display: grid;
        gap: 0.7rem;
        min-height: 0;
        overflow: auto;
      }

      .field-section {
        display: grid;
        gap: 0.35rem;
      }

      .field-section h2 {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        margin: 0;
        text-transform: uppercase;
      }

      dl {
        display: grid;
        gap: 0.35rem 0.65rem;
        grid-template-columns: max-content minmax(0, 1fr);
        margin: 0;
      }

      dt {
        color: var(--asha-color-muted);
        font-size: 0.72rem;
      }

      dd {
        margin: 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .empty-state {
        color: var(--asha-color-muted);
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioInspectorPanelComponent {
  readonly store = inject(StudioWorkspaceStore);

  readonly selectedBoundsLabel = computed(() => {
    const renderable = this.store.selectedRenderable();
    if (renderable === null) {
      return 'none';
    }
    return this.formatBounds(renderable.bounds);
  });

  readonly selectedCenterLabel = computed(() => {
    const renderable = this.store.selectedRenderable();
    if (renderable === null) {
      return 'none';
    }
    const center = {
      x: (renderable.bounds.min.x + renderable.bounds.max.x) / 2,
      y: (renderable.bounds.min.y + renderable.bounds.max.y) / 2,
      z: (renderable.bounds.min.z + renderable.bounds.max.z) / 2,
    };
    return `${center.x}, ${center.y}, ${center.z}`;
  });

  iconForRenderable(renderable: StudioSceneRenderableReadModel): string {
    const labels: Record<StudioSceneRenderableReadModel['kind'], string> = {
      voxel_grid: 'G',
      voxel_cell: 'V',
      static_mesh: 'M',
      preview_ghost: 'P',
    };
    return labels[renderable.kind];
  }

  private formatBounds(bounds: StudioBounds): string {
    const min = `${bounds.min.x},${bounds.min.y},${bounds.min.z}`;
    const max = `${bounds.max.x},${bounds.max.y},${bounds.max.z}`;
    return `[${min}] to [${max}]`;
  }
}

@Component({
  selector: 'asha-assets-bottom-panel',
  standalone: true,
  template: `
    <section class="assets-bottom-panel" data-visual-id="studio-assets-panel">
      <header>
        <span class="panel-kicker">5 · Bottom Panel</span>
        <div class="tabs" role="tablist" aria-label="Bottom panel views">
          <button
            type="button"
            [class.active]="activeTab() === 'timeline'"
            (click)="activeTab.set('timeline')"
          >
            Timeline
          </button>
          <button
            type="button"
            [class.active]="activeTab() === 'assets'"
            (click)="activeTab.set('assets')"
          >
            Assets
          </button>
        </div>
      </header>

      @if (activeTab() === 'timeline') {
        <div class="timeline-table-wrap">
          <table class="timeline-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Command</th>
                <th>Status</th>
                <th>Source</th>
                <th>Evidence</th>
                <th>T+</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of store.workspace().timeline; track entry.sequenceId; let index = $index) {
                <tr [class.timeline-table__latest]="index === store.workspace().timeline.length - 1">
                  <td>{{ entry.sequenceId }}</td>
                  <td>
                    <strong>{{ entry.commandId }}</strong>
                    <span>{{ entry.inputSummary }}</span>
                  </td>
                  <td>{{ entry.status }}</td>
                  <td>{{ entry.requestedBy }}</td>
                  <td>{{ evidenceLabel(entry) }}</td>
                  <td>{{ elapsedLabel(index) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="asset-browser">
          <aside class="asset-tree" aria-label="Asset categories">
            <button type="button" class="active">All Assets</button>
            <button type="button">Static Meshes</button>
            <button type="button">Materials</button>
            <button type="button">Generated</button>
          </aside>
          <div class="asset-grid">
            @for (asset of store.workspace().scene.renderables; track asset.renderableId) {
              <article class="asset-entry">
                <span class="asset-thumb">{{ assetIcon(asset) }}</span>
                <div>
                  <strong>{{ asset.label }}</strong>
                  <span>{{ asset.meshRef ?? asset.renderableId }}</span>
                  <small>{{ asset.sourceState }} · {{ asset.materialRef ?? 'no material' }}</small>
                </div>
              </article>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .assets-bottom-panel {
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.75rem;
        grid-template-rows: auto minmax(0, 1fr);
        height: 100%;
        min-width: 0;
        overflow: hidden;
        padding: 0.75rem;
      }

      header {
        align-items: center;
        display: grid;
        gap: 0.75rem;
        grid-template-columns: auto minmax(0, 1fr);
      }

      .panel-kicker {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .tabs {
        display: flex;
        gap: 0.5rem;
        justify-self: end;
      }

      .tabs button {
        background: transparent;
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        min-height: 2rem;
        padding: 0 0.75rem;
      }

      .tabs button.active {
        background: var(--asha-color-control);
        border-color: #54c7bd;
      }

      .timeline-table-wrap,
      .asset-browser,
      .asset-grid {
        min-height: 0;
        overflow: auto;
      }

      .timeline-table {
        border-collapse: collapse;
        font-size: 0.78rem;
        min-width: 56rem;
        width: 100%;
      }

      .timeline-table th,
      .timeline-table td {
        border-bottom: 1px solid var(--asha-color-border);
        padding: 0.38rem 0.5rem;
        text-align: left;
        vertical-align: top;
      }

      .timeline-table th {
        color: var(--asha-color-muted);
        font-size: 0.66rem;
        position: sticky;
        text-transform: uppercase;
        top: 0;
      }

      .timeline-table td {
        max-width: 18rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .timeline-table td:nth-child(2) {
        display: grid;
        gap: 0.12rem;
      }

      .timeline-table td:nth-child(2) span {
        color: var(--asha-color-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .timeline-table__latest {
        background: var(--asha-color-control);
      }

      .asset-browser {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: 13rem minmax(0, 1fr);
      }

      .asset-tree {
        border-right: 1px solid var(--asha-color-border);
        display: grid;
        gap: 0.2rem;
        padding-right: 0.75rem;
      }

      .asset-tree button {
        background: transparent;
        border: 1px solid transparent;
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        min-height: 1.7rem;
        padding: 0 0.45rem;
        text-align: left;
      }

      .asset-tree button.active,
      .asset-tree button:hover {
        background: var(--asha-color-control);
        border-color: var(--asha-color-border);
      }

      .asset-grid {
        display: grid;
        gap: 0.55rem;
        grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
        min-height: 0;
        overflow: auto;
      }

      .asset-entry {
        align-items: center;
        border: 1px solid var(--asha-color-border);
        background: var(--asha-color-control);
        display: grid;
        gap: 0.5rem;
        grid-template-columns: auto minmax(0, 1fr);
        min-width: 0;
        padding: 0.5rem;
      }

      .asset-thumb {
        align-items: center;
        background: #22303b;
        border: 1px solid var(--asha-color-border);
        color: #8de0d8;
        display: inline-flex;
        font-weight: 800;
        height: 2.25rem;
        justify-content: center;
        width: 2.25rem;
      }

      .asset-entry div {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .asset-entry strong,
      .asset-entry span,
      .asset-entry small {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      small {
        color: var(--asha-color-muted);
        font-size: 0.75rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioAssetsBottomPanelComponent {
  readonly store = inject(StudioWorkspaceStore);
  readonly activeTab = signal<'timeline' | 'assets'>('timeline');

  evidenceLabel(entry: StudioCommandTimelineEntry): string {
    return entry.outputSummary;
  }

  elapsedLabel(index: number): string {
    return `${index * 120}ms`;
  }

  assetIcon(asset: StudioSceneRenderableReadModel): string {
    const labels: Record<StudioSceneRenderableReadModel['kind'], string> = {
      voxel_grid: 'G',
      voxel_cell: 'V',
      static_mesh: 'M',
      preview_ghost: 'P',
    };
    return labels[asset.kind];
  }
}
