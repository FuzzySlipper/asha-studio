import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type {
  StudioAssetBrowserCategory,
  StudioBounds,
  StudioCommandTimelineEntry,
  StudioEntityReadModel,
  StudioEntityKind,
  StudioSceneRenderableReadModel,
  StudioViewportToolMode,
} from '@asha-studio/domain';
import { StudioWorkspaceStore } from '@asha-studio/store';

function visibleHierarchyEntities(
  entities: readonly StudioEntityReadModel[],
): readonly StudioEntityReadModel[] {
  const ancestorExpandedByDepth: boolean[] = [];
  const visible: StudioEntityReadModel[] = [];

  for (const entity of entities) {
    const ancestorsExpanded = ancestorExpandedByDepth
      .slice(0, entity.depth)
      .every(expanded => expanded);

    if (entity.depth === 0 || ancestorsExpanded) {
      visible.push(entity);
    }
    ancestorExpandedByDepth[entity.depth] = entity.expanded;
  }

  return visible;
}

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
      <div class="scenario-load" aria-label="Scenario load">
        <select
          [value]="store.selectedScenarioDraftId()"
          (change)="store.setSelectedScenarioDraft($any($event.target).value)"
        >
          @for (scenario of store.workspace().scenarios; track scenario.scenarioId) {
            <option [value]="scenario.scenarioId">
              {{ scenario.label }} · {{ scenario.status }}
            </option>
          }
        </select>
        <button type="button" (click)="loadSelectedScenario()">Load</button>
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
        grid-template-rows: auto auto auto;
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

      .scenario-load {
        align-items: center;
        display: grid;
        gap: 0.4rem;
        grid-column: 1 / -1;
        grid-template-columns: minmax(10rem, 18rem) auto;
        min-width: 0;
      }

      .scenario-load select,
      .scenario-load button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        font: inherit;
        height: 1.65rem;
        min-width: 0;
      }

      .scenario-load button {
        cursor: pointer;
        padding: 0 0.65rem;
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

  loadSelectedScenario(): void {
    this.store.loadScenario(this.store.selectedScenarioDraftId());
  }
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
            [title]="toolTitle(tool)"
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
        border-color: var(--asha-color-accent);
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
      this.store.frameSelectedRenderable();
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

  toolTitle(tool: StudioViewportToolMode): string {
    const labels: Record<StudioViewportToolMode, string> = {
      select: 'Select',
      orbit: 'Orbit camera',
      pan: 'Pan camera',
      frame: 'Frame selected renderable',
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
          <button type="button" title="Add reference placeholder" (click)="store.addReferenceRenderable()">
            +
          </button>
          <button
            type="button"
            title="Rename selected scene object"
            [disabled]="selectedSceneObjectId() === null"
            (click)="renameSelectedSceneObject()"
          >
            R
          </button>
          <button
            type="button"
            title="Move selected scene object to root"
            [disabled]="selectedSceneObjectId() === null"
            (click)="moveSelectedSceneObjectToRoot()"
          >
            ^
          </button>
          <button type="button" title="Collapse hierarchy" (click)="store.setHierarchyExpanded(false)">
            -
          </button>
          <button type="button" title="Expand hierarchy" (click)="store.setHierarchyExpanded(true)">
            *
          </button>
          <button
            type="button"
            title="Focus selected"
            [disabled]="store.selectedRenderable() === null"
            (click)="store.frameSelectedRenderable()"
          >
            F
          </button>
        </div>
      </header>

      <div class="tree-list">
        @for (entity of visibleEntities(); track entity.id) {
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

      .header-actions button:disabled {
        color: #5b666c;
        cursor: not-allowed;
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
        border-color: var(--asha-color-accent);
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
        border-color: var(--asha-color-accent);
        color: var(--asha-color-accent-text);
      }

      .tree-badge--preview-only {
        border-color: var(--asha-color-warning);
        color: var(--asha-color-warning-text);
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
  readonly visibleEntities = computed(() => visibleHierarchyEntities(this.store.workspace().entities));
  readonly selectedSceneObjectId = computed(() => this.store.selectedEntity()?.sceneObjectId ?? null);

  renameSelectedSceneObject(): void {
    const objectId = this.selectedSceneObjectId();
    if (objectId === null) {
      return;
    }
    const currentLabel = this.store.selectedEntity()?.label ?? '';
    const label = globalThis.prompt?.('Scene object name', currentLabel) ?? null;
    if (label === null) {
      return;
    }
    this.store.renameSceneObject(objectId, label);
  }

  moveSelectedSceneObjectToRoot(): void {
    const objectId = this.selectedSceneObjectId();
    if (objectId === null) {
      return;
    }
    this.store.reparentSceneObject(objectId, null, 0);
  }

  iconForKind(kind: StudioEntityKind): string {
    const labels: Record<StudioEntityKind, string> = {
      session: 'S',
      scene: '#',
      collection: 'A',
      empty_group: 'O',
      sprite: 'I',
      voxel_grid: 'G',
      voxel_cell: 'V',
      static_mesh: 'M',
      preview_ghost: 'P',
    };
    return labels[kind];
  }
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
              <dt>name</dt>
              <dd>
                <div class="editable-field">
                  <input
                    aria-label="Selected scene object name"
                    [value]="store.selectedEntity()?.label ?? renderable.label"
                    (change)="renameSelectedSceneObject($any($event.target).value)"
                  />
                </div>
              </dd>
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

      .editable-field {
        min-width: 0;
      }

      .editable-field input {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        color: var(--asha-color-ink);
        font: inherit;
        height: 1.65rem;
        min-width: 0;
        padding: 0 0.4rem;
        width: 100%;
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

  renameSelectedSceneObject(label: string): void {
    const objectId = this.store.selectedEntity()?.sceneObjectId ?? null;
    if (objectId === null) {
      return;
    }
    this.store.renameSceneObject(objectId, label);
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
            [class.active]="store.bottomPanelTab() === 'timeline'"
            (click)="store.setBottomPanelTab('timeline')"
          >
            Timeline
          </button>
          <button
            type="button"
            [class.active]="store.bottomPanelTab() === 'assets'"
            (click)="store.setBottomPanelTab('assets')"
          >
            Assets
          </button>
          <button
            type="button"
            [class.active]="store.bottomPanelTab() === 'evidence'"
            (click)="store.setBottomPanelTab('evidence')"
          >
            Evidence
          </button>
        </div>
      </header>

      @if (store.bottomPanelTab() === 'timeline') {
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
      } @else if (store.bottomPanelTab() === 'assets') {
        <div class="asset-browser">
          <aside class="asset-tree" aria-label="Asset categories">
            @for (category of store.assetBrowserCategories(); track category.category) {
              <button
                type="button"
                [class.active]="store.assetBrowserCategory() === category.category"
                (click)="selectAssetCategory(category.category)"
              >
                <span>{{ category.label }}</span>
                <small>{{ category.count }}</small>
              </button>
            }
          </aside>
          <div class="asset-grid">
            @for (asset of store.assetRenderables(); track asset.renderableId) {
              <article class="asset-entry">
                <span class="asset-thumb">{{ assetIcon(asset) }}</span>
                <div>
                  <strong>{{ asset.label }}</strong>
                  <span>{{ asset.meshRef ?? asset.renderableId }}</span>
                  <small>{{ asset.sourceState }} · {{ asset.materialRef ?? 'no material' }}</small>
                </div>
              </article>
            } @empty {
              <p class="empty-assets">No assets match {{ store.assetBrowserSummary() }}.</p>
            }
          </div>
        </div>
      } @else {
        <div class="evidence-panel" data-visual-id="studio-secondary-evidence">
          <section class="evidence-summary" aria-label="Compact agent readout">
            <article>
              <span>Session</span>
              <strong>{{ store.compactAgentReadout().session.scenarioLabel }}</strong>
              <small>{{ store.compactAgentReadout().session.sessionId }}</small>
            </article>
            <article>
              <span>Scene</span>
              <strong>{{ store.compactAgentReadout().scene.sceneHash }}</strong>
              <small>{{ store.compactAgentReadout().scene.renderableCount }} renderables</small>
            </article>
            <article>
              <span>Selected</span>
              <strong>{{ store.compactAgentReadout().scene.selectedRenderableId ?? 'none' }}</strong>
              <small>{{ store.compactAgentReadout().selectedEntity?.label ?? 'no entity' }}</small>
            </article>
            <article>
              <span>Viewport Hit</span>
              @if (store.compactAgentReadout().latestViewportHit; as hit) {
                <strong>{{ hit.face }}</strong>
                <small>
                  @if (hit.voxelCoord) {
                    voxel {{ hit.voxelCoord.x }},{{ hit.voxelCoord.y }},{{ hit.voxelCoord.z }}
                  } @else {
                    no voxel
                  }
                </small>
              } @else {
                <strong>none</strong>
                <small>no viewport hit</small>
              }
            </article>
          </section>

          <section class="evidence-detail" aria-label="Command and compatibility evidence">
            <details open>
              <summary>Latest Command</summary>
              @if (store.compactAgentReadout().latestCommand; as command) {
                <dl>
                  <dt>sequence</dt>
                  <dd>{{ command.sequenceId }}</dd>
                  <dt>command</dt>
                  <dd>{{ command.commandId }}</dd>
                  <dt>source</dt>
                  <dd>{{ command.requestedBy }}</dd>
                  <dt>status</dt>
                  <dd>{{ command.status }}</dd>
                  <dt>input</dt>
                  <dd>{{ command.inputSummary }}</dd>
                  <dt>output</dt>
                  <dd>{{ command.outputSummary }}</dd>
                </dl>
              }
            </details>

            <details>
              <summary>Readout</summary>
              <dl>
                <dt>marker</dt>
                <dd>{{ store.compactAgentReadout().readbackMarker }}</dd>
                <dt>compatibility</dt>
                <dd>{{ store.compactAgentReadout().compatibilityMarker }}</dd>
                <dt>timeline</dt>
                <dd>{{ store.compactAgentReadout().timelineSequence }}</dd>
                <dt>render settings</dt>
                <dd>{{ store.compactAgentReadout().renderSettings.renderSettingsHash }}</dd>
                <dt>viewport</dt>
                <dd>{{ store.compactAgentReadout().viewport.cameraHash }}</dd>
                <dt>ui state</dt>
                <dd>{{ store.compactAgentReadout().uiState?.uiStateHash ?? 'none' }}</dd>
              </dl>
            </details>

            <details>
              <summary>Non-Claims</summary>
              <ul>
                @for (nonClaim of store.compactAgentReadout().nonClaims; track nonClaim) {
                  <li>{{ nonClaim }}</li>
                }
              </ul>
            </details>
          </section>
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
        border-color: var(--asha-color-accent);
      }

      .timeline-table-wrap,
      .asset-browser,
      .asset-grid,
      .evidence-panel {
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
        align-items: center;
        background: transparent;
        border: 1px solid transparent;
        color: var(--asha-color-ink);
        cursor: pointer;
        display: flex;
        font: inherit;
        justify-content: space-between;
        min-height: 1.7rem;
        padding: 0 0.45rem;
        text-align: left;
      }

      .asset-tree button span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .asset-tree button small {
        flex: 0 0 auto;
        padding-left: 0.5rem;
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

      .empty-assets {
        color: var(--asha-color-muted);
        font-size: 0.8rem;
        margin: 0;
        padding: 0.75rem;
      }

      .asset-thumb {
        align-items: center;
        background: var(--asha-color-thumb);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-accent-text);
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

      .evidence-panel {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: minmax(22rem, 1fr) minmax(26rem, 1.2fr);
      }

      .evidence-summary {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      }

      .evidence-summary article {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        display: grid;
        min-width: 0;
        padding: 0.5rem;
      }

      .evidence-summary span,
      .evidence-detail summary {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        text-transform: uppercase;
      }

      .evidence-summary strong,
      .evidence-detail dd {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .evidence-detail details {
        border: 1px solid var(--asha-color-border);
        background: var(--asha-color-control);
        margin-bottom: 0.45rem;
        padding: 0.45rem 0.55rem;
      }

      .evidence-detail dl {
        display: grid;
        column-gap: 0.6rem;
        grid-template-columns: 6rem minmax(0, 1fr);
        margin: 0.5rem 0 0;
      }

      .evidence-detail dt {
        color: var(--asha-color-muted);
      }

      .evidence-detail dd {
        margin: 0;
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

  selectAssetCategory(category: StudioAssetBrowserCategory): void {
    this.store.setAssetBrowserCategory(category);
  }

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
