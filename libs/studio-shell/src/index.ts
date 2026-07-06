import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  StudioAssetsBottomPanelComponent,
  StudioHierarchyPanelComponent,
  StudioInspectorPanelComponent,
  StudioSessionTopPanelComponent,
  StudioViewportToolbarPanelComponent,
  StudioVoxelConversionWorkspacePanelComponent,
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
    StudioVoxelConversionWorkspacePanelComponent,
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
            [class.is-active]="store.activeMenu() === 'project'"
            (click)="toggleMenu('project')"
          >
            Project
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
            <button type="button" (click)="saveScene()">Save</button>
            <label class="menu-popover__field">
              <span>Save As</span>
              <input
                type="text"
                [value]="store.saveAsPath()"
                (input)="setSaveAsPath($any($event.target).value)"
                (keydown.enter)="saveSceneAs()"
              />
            </label>
            <button type="button" (click)="saveSceneAs()">Save As</button>
            <div class="project-file-browser" aria-label="Project files">
              <div class="project-file-browser__bar">
                <button type="button" (click)="refreshProjectFiles()">Refresh</button>
                <button type="button" (click)="openProjectParentDir()">Up</button>
              </div>
              <small>{{ store.projectFileDialog().message }}</small>
              <small>{{ store.projectFileDialog().currentDir || '/' }}</small>
              <div class="scene-file-list" aria-label="Open scene source">
                @for (file of store.projectFileDialog().entries; track file.path) {
                  <button
                    type="button"
                    [class.is-current]="store.projectFileDialog().selectedPath === file.path"
                    (click)="selectProjectFile(file.path)"
                  >
                    <span>{{ file.kind === 'directory' ? '[] ' : '' }}{{ file.name }}</span>
                    <small>{{ file.path }}</small>
                  </button>
                }
              </div>
              @if (store.projectFileDialog().selectedPath; as selectedPath) {
                <button
                  type="button"
                  [disabled]="!selectedPath.endsWith('.scene.json')"
                  (click)="openSelectedProjectFile()"
                >
                  Open {{ selectedPath }}
                </button>
              }
            </div>
            <button type="button" (click)="saveWorkspace()">Save Browser Slot</button>
            <button type="button" (click)="loadWorkspace()" [disabled]="store.savedWorkspace() === null">
              Load Browser Slot
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

        @if (store.activeMenu() === 'project') {
          <section class="menu-popover menu-popover--project" aria-label="Project menu">
            <div class="project-connect" data-visual-id="studio-running-project-picker">
              <strong>Running ASHA Project</strong>
              <small>{{ store.runningProjectDiscovery().endpoint || 'No endpoint' }}</small>
              <small>{{ store.runtimeConnectionMessage() }}</small>
              <div class="project-connect__actions">
                <button
                  type="button"
                  [disabled]="!store.runningProjectDiscovery().canRefresh"
                  (click)="refreshRunningProjectSessions()"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  [disabled]="!store.runningProjectDiscovery().canConnect"
                  (click)="connectRunningProject()"
                >
                  Connect
                </button>
                <button
                  type="button"
                  [disabled]="!store.runningProjectDiscovery().canDisconnect"
                  (click)="disconnectRunningProject()"
                >
                  Disconnect
                </button>
              </div>
              <div class="project-session-list">
                @for (session of store.runningProjectDiscovery().sessions; track session.sessionId) {
                  <article
                    [class.is-current]="session.sessionId === store.runningProjectDiscovery().activeSessionId"
                    [attr.data-running-session-id]="session.sessionId"
                    [attr.data-running-session-status]="session.status"
                  >
                    <span>{{ session.sessionType }} · {{ session.status }}</span>
                    <strong>{{ session.backendMode }} · {{ session.backendCompatibilityState }}</strong>
                    <small>{{ session.attachStatus }} · {{ session.liveHash || 'no live readback' }}</small>
                    <small>{{ session.worldHash || 'no projection' }}</small>
                  </article>
                }
              </div>
              @if (store.runningProjectDiscovery().diagnostics.length > 0) {
                <div class="project-connect__diagnostics">
                  @for (diagnostic of store.runningProjectDiscovery().diagnostics; track diagnostic.code + diagnostic.source) {
                    <small>{{ diagnostic.code }} · {{ diagnostic.message }}</small>
                  }
                </div>
              }
            </div>
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
      <asha-voxel-conversion-workspace-panel class="voxel-panel" />
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
        grid-template-rows: 2rem 18rem minmax(0, 1fr) 12rem 14rem;
        grid-template-areas:
          "menu menu menu"
          "top top top"
          "hierarchy viewport inspector"
          "voxel voxel voxel"
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
      asha-viewport-toolbar-panel,
      asha-voxel-conversion-workspace-panel {
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
        min-width: 20rem;
      }

      .menu-popover--edit {
        left: 4.15rem;
      }

      .menu-popover--view {
        left: 7.8rem;
      }

      .menu-popover--preferences {
        gap: 0.65rem;
        left: 15.4rem;
        min-width: 17rem;
      }

      .menu-popover--project {
        left: 11.3rem;
        min-width: 24rem;
      }

      .menu-popover button {
        border-radius: 0;
        min-height: 1.75rem;
        justify-content: flex-start;
        text-align: left;
      }

      .menu-popover button.is-current {
        background: var(--asha-color-control-active);
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

      .menu-popover__field {
        align-items: stretch;
        display: grid;
        gap: 0.25rem;
        padding: 0.25rem 0.45rem;
      }

      .menu-popover__field input {
        background: #0f1214;
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        font: inherit;
        min-width: 0;
        padding: 0.25rem 0.35rem;
      }

      .scene-file-list {
        border-block: 1px solid var(--asha-color-border);
        display: grid;
        gap: 0.1rem;
        margin-block: 0.2rem;
        max-height: 9rem;
        overflow: auto;
        padding-block: 0.2rem;
      }

      .project-file-browser {
        display: grid;
        gap: 0.25rem;
      }

      .project-file-browser__bar {
        display: grid;
        gap: 0.25rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .project-file-browser small {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .project-connect,
      .project-session-list {
        display: grid;
        gap: 0.35rem;
      }

      .project-connect small,
      .project-session-list small {
        color: var(--asha-color-muted);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .project-connect__actions {
        display: grid;
        gap: 0.25rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .project-session-list {
        max-height: 12rem;
        overflow: auto;
      }

      .project-session-list article {
        border: 1px solid var(--asha-color-border);
        display: grid;
        gap: 0.1rem;
        padding: 0.4rem;
      }

      .project-session-list article.is-current {
        border-color: var(--asha-color-accent);
      }

      .project-connect__diagnostics {
        border-top: 1px solid var(--asha-color-border);
        display: grid;
        gap: 0.2rem;
        padding-top: 0.35rem;
      }

      .scene-file-list button {
        display: grid;
        gap: 0.1rem;
      }

      .scene-file-list span,
      .scene-file-list small {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .scene-file-list small {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
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

      .voxel-panel {
        grid-area: voxel;
        min-width: 0;
      }

      @media (max-width: 900px) {
        .studio-layout {
          grid-template-columns: 1fr;
          grid-template-rows:
            2rem 6.25rem 13rem minmax(20rem, 1fr) 13rem 16rem 14rem;
          grid-template-areas:
            "menu"
            "top"
            "hierarchy"
            "viewport"
            "inspector"
            "voxel"
            "assets";
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioShellComponent {
  readonly store = inject(StudioWorkspaceStore);

  toggleMenu(menu: 'file' | 'edit' | 'view' | 'project' | 'preferences'): void {
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

  saveScene(): void {
    this.store.saveSceneFile();
    this.store.setActiveMenu(null);
  }

  saveSceneAs(): void {
    this.store.saveSceneFileAs();
    this.store.setActiveMenu(null);
  }

  setSaveAsPath(path: string): void {
    this.store.setSaveAsPath(path);
  }

  refreshProjectFiles(): void {
    void this.store.refreshProjectFiles();
  }

  openProjectParentDir(): void {
    this.store.openProjectParentDir();
  }

  selectProjectFile(path: string): void {
    this.store.selectProjectFile(path);
  }

  openSelectedProjectFile(): void {
    this.store.openSelectedProjectFile();
    this.store.setActiveMenu(null);
  }

  refreshRunningProjectSessions(): void {
    void this.store.refreshRunningProjectSessions();
  }

  connectRunningProject(): void {
    void this.store.connectRunningProject();
    this.store.setActiveMenu(null);
  }

  disconnectRunningProject(): void {
    this.store.disconnectRunningProject();
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
