import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  StudioAssetsBottomPanelComponent,
  StudioHierarchyPanelComponent,
  StudioInspectorPanelComponent,
  StudioSessionTopPanelComponent,
  StudioViewportToolbarPanelComponent,
} from '@asha-studio/panels';
import { StudioWorkspaceStore } from '@asha-studio/store';
import { StudioViewportComponent } from '@asha-studio/viewport';

@Component({
  selector: 'asha-studio-shell',
  standalone: true,
  imports: [
    StudioAssetsBottomPanelComponent,
    StudioHierarchyPanelComponent,
    StudioInspectorPanelComponent,
    StudioSessionTopPanelComponent,
    StudioViewportComponent,
    StudioViewportToolbarPanelComponent,
  ],
  template: `
    <main class="studio-layout" data-visual-id="studio-shell">
      <nav class="studio-menu" aria-label="Application menu">
        <div class="studio-menu__group">
          <button type="button" [class.is-active]="store.activeMenu() === 'file'" (click)="toggleMenu('file')">
            File
          </button>
          <button type="button" [class.is-active]="store.activeMenu() === 'edit'" (click)="toggleMenu('edit')">
            Edit
          </button>
          <button type="button" [class.is-active]="store.activeMenu() === 'view'" (click)="toggleMenu('view')">
            View
          </button>
          <button
            type="button"
            [class.is-active]="store.activeMenu() === 'preferences'"
            (click)="toggleMenu('preferences')"
          >
            Preferences
          </button>
        </div>
        <span class="studio-menu__status">{{ store.menuMessage() }}</span>

        @if (store.activeMenu() === 'file') {
          <section class="menu-popover menu-popover--file" aria-label="File menu">
            <button type="button" (click)="newWorkspace()">New</button>
            <button type="button" (click)="saveWorkspace()">Save</button>
            <button type="button" (click)="loadWorkspace()" [disabled]="store.savedWorkspace() === null">
              Load
            </button>
          </section>
        }

        @if (store.activeMenu() === 'edit') {
          <section class="menu-popover menu-popover--edit" aria-label="Edit menu">
            <button type="button" disabled>Undo</button>
            <button type="button" disabled>Redo</button>
          </section>
        }

        @if (store.activeMenu() === 'view') {
          <section class="menu-popover menu-popover--view" aria-label="View menu">
            <label>
              <input
                type="checkbox"
                [checked]="store.renderSettings().wireframeEnabled"
                (change)="setRenderSetting('wireframeEnabled', $any($event.target).checked)"
              />
              Wireframe
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="store.renderSettings().showGrid"
                (change)="setRenderSetting('showGrid', $any($event.target).checked)"
              />
              Grid
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="store.renderSettings().showPreviewGhosts"
                (change)="setRenderSetting('showPreviewGhosts', $any($event.target).checked)"
              />
              Preview Ghosts
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="store.renderSettings().showReadbackOverlay"
                (change)="setRenderSetting('showReadbackOverlay', $any($event.target).checked)"
              />
              Readback Overlay
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="store.renderSettings().showRaycastHitDebug"
                (change)="setRenderSetting('showRaycastHitDebug', $any($event.target).checked)"
              />
              Raycast Hit Debug
            </label>
          </section>
        }

        @if (store.activeMenu() === 'preferences') {
          <section class="menu-popover menu-popover--preferences" aria-label="Preferences">
            <div class="preferences-section">
              <strong>Viewport</strong>
              <label>
                <input
                  type="checkbox"
                  [checked]="store.renderSettings().wireframeEnabled"
                  (change)="setRenderSetting('wireframeEnabled', $any($event.target).checked)"
                />
                Wireframe
              </label>
              <label>
                <input
                  type="checkbox"
                  [checked]="store.renderSettings().showGrid"
                  (change)="setRenderSetting('showGrid', $any($event.target).checked)"
                />
                Grid
              </label>
            </div>
            <div class="preferences-section">
              <strong>Readback</strong>
              <label>
                <input
                  type="checkbox"
                  [checked]="store.renderSettings().showPreviewGhosts"
                  (change)="setRenderSetting('showPreviewGhosts', $any($event.target).checked)"
                />
                Preview Ghosts
              </label>
              <label>
                <input
                  type="checkbox"
                  [checked]="store.renderSettings().showReadbackOverlay"
                  (change)="setRenderSetting('showReadbackOverlay', $any($event.target).checked)"
                />
                Overlay
              </label>
              <label>
                <input
                  type="checkbox"
                  [checked]="store.renderSettings().showRaycastHitDebug"
                  (change)="setRenderSetting('showRaycastHitDebug', $any($event.target).checked)"
                />
                Raycast Debug
              </label>
            </div>
          </section>
        }
      </nav>

      <asha-session-top-panel class="top-panel" />
      <asha-hierarchy-panel class="hierarchy-panel" />

      <section class="viewport-column" data-visual-id="studio-viewport-column">
        <asha-viewport-toolbar-panel />
        <asha-studio-viewport />
      </section>

      <asha-inspector-panel class="inspector-panel" />
      <asha-assets-bottom-panel class="assets-panel" />
    </main>
  `,
  styles: [
    `
      .studio-layout {
        background: var(--asha-color-canvas);
        color: var(--asha-color-ink);
        display: grid;
        grid-template-columns: 18rem minmax(32rem, 1fr) 21rem;
        grid-template-rows: 2rem 9rem minmax(0, 1fr) 14rem;
        grid-template-areas:
          "menu menu menu"
          "top top top"
          "hierarchy viewport inspector"
          "assets assets assets";
        min-height: 100vh;
        max-width: 100vw;
        overflow-x: hidden;
      }

      asha-assets-bottom-panel,
      asha-hierarchy-panel,
      asha-inspector-panel,
      asha-session-top-panel,
      asha-studio-viewport,
      asha-viewport-toolbar-panel {
        display: block;
        min-height: 0;
        min-width: 0;
      }

      .studio-menu {
        align-items: center;
        background: #0f1214;
        border-bottom: 1px solid var(--asha-color-border);
        display: flex;
        gap: 0.25rem;
        grid-area: menu;
        justify-content: space-between;
        min-width: 0;
        padding: 0 0.5rem;
        position: relative;
        z-index: 10;
      }

      .studio-menu__group {
        align-items: center;
        display: flex;
        gap: 0.25rem;
        height: 100%;
        min-width: 0;
      }

      .studio-menu button {
        background: transparent;
        border: 0;
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        height: 100%;
        padding: 0 0.75rem;
      }

      .studio-menu button:hover {
        background: var(--asha-color-control);
      }

      .studio-menu button:disabled {
        color: #5b666c;
        cursor: not-allowed;
      }

      .studio-menu button.is-active {
        background: var(--asha-color-control-active);
      }

      .studio-menu__status {
        color: var(--asha-color-muted);
        font-size: 0.72rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .menu-popover {
        background: #151b20;
        border: 1px solid var(--asha-color-border);
        box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.32);
        color: var(--asha-color-ink);
        display: grid;
        gap: 0.15rem;
        min-width: 12rem;
        padding: 0.35rem;
        position: absolute;
        top: calc(100% + 1px);
      }

      .menu-popover--file {
        left: 0.5rem;
      }

      .menu-popover--edit {
        left: 4.15rem;
      }

      .menu-popover--view {
        left: 7.8rem;
      }

      .menu-popover--preferences {
        gap: 0.65rem;
        left: 11.7rem;
        min-width: 17rem;
      }

      .menu-popover button {
        border-radius: 0;
        height: 1.75rem;
        justify-content: flex-start;
        text-align: left;
      }

      .menu-popover label,
      .preferences-section {
        color: var(--asha-color-ink);
        font-size: 0.78rem;
      }

      .menu-popover label {
        align-items: center;
        display: flex;
        gap: 0.5rem;
        min-height: 1.75rem;
        padding: 0 0.45rem;
      }

      .menu-popover input {
        accent-color: var(--asha-color-accent);
      }

      .preferences-section {
        display: grid;
        gap: 0.15rem;
      }

      .preferences-section strong {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        font-weight: 700;
        padding: 0 0.45rem;
        text-transform: uppercase;
      }

      .top-panel {
        grid-area: top;
        min-width: 0;
      }

      .hierarchy-panel {
        grid-area: hierarchy;
        min-width: 0;
      }

      .viewport-column {
        display: grid;
        grid-area: viewport;
        grid-template-rows: 3rem minmax(0, 1fr);
        min-width: 0;
      }

      .inspector-panel {
        grid-area: inspector;
        min-width: 0;
      }

      .assets-panel {
        grid-area: assets;
        min-width: 0;
      }

      @media (max-width: 900px) {
        .studio-layout {
          grid-template-columns: 1fr;
          grid-template-rows:
            2rem 6.25rem 13rem minmax(20rem, 1fr) 13rem 14rem;
          grid-template-areas:
            "menu"
            "top"
            "hierarchy"
            "viewport"
            "inspector"
            "assets";
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioShellComponent {
  readonly store = inject(StudioWorkspaceStore);

  toggleMenu(menu: 'file' | 'edit' | 'view' | 'preferences'): void {
    this.store.toggleActiveMenu(menu);
  }

  newWorkspace(): void {
    this.store.newWorkspace();
    this.store.setActiveMenu(null);
  }

  saveWorkspace(): void {
    this.store.saveWorkspaceToSlot();
    this.store.setActiveMenu(null);
  }

  loadWorkspace(): void {
    this.store.loadWorkspaceFromSlot();
    this.store.setActiveMenu(null);
  }

  setRenderSetting(
    key: 'wireframeEnabled' | 'showGrid' | 'showPreviewGhosts' | 'showReadbackOverlay' | 'showRaycastHitDebug',
    value: boolean,
  ): void {
    this.store.setRenderSetting(key, value);
  }
}
