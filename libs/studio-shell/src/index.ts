import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject } from '@angular/core';
import {
  StudioAssetsBottomPanelComponent,
  StudioHierarchyPanelComponent,
  StudioInspectorPanelComponent,
  StudioRuntimeToolsMenuComponent,
  StudioViewportToolbarPanelComponent,
  StudioVoxelToolsMenuComponent,
} from '@asha-studio/panels';
import { StudioWorkspaceStore } from '@asha-studio/store';
import { StudioViewportComponent } from '@asha-studio/viewport';
import {
  containHostFileDialogTabFocus,
  focusInitialHostFileDialogControl,
  restoreHostFileDialogFocus,
} from './host-file-dialog-focus';

export * from './host-file-dialog-focus';

@Component({
  selector: 'asha-studio-shell',
  standalone: true,
  imports: [
    StudioAssetsBottomPanelComponent,
    StudioHierarchyPanelComponent,
    StudioInspectorPanelComponent,
    StudioRuntimeToolsMenuComponent,
    StudioViewportComponent,
    StudioViewportToolbarPanelComponent,
    StudioVoxelToolsMenuComponent,
  ],
  template: `
    <main class="studio-layout" data-visual-id="studio-shell">
      <nav class="studio-menu" aria-label="Application menu">
        <div class="studio-menu__group">
          <button
            type="button"
            data-file-menu-trigger
            [class.is-active]="store.activeMenu() === 'file'"
            (click)="toggleMenu('file')"
          >
            File
          </button>
          <button type="button" [class.is-active]="store.activeMenu() === 'edit'" (click)="toggleMenu('edit')">
            Edit
          </button>
          <button type="button" [class.is-active]="store.activeMenu() === 'scene'" (click)="toggleMenu('scene')">
            Scene
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
            [class.is-active]="store.activeMenu() === 'runtime'"
            (click)="toggleMenu('runtime')"
          >
            Runtime
          </button>
          <button
            type="button"
            [class.is-active]="store.activeMenu() === 'voxel'"
            (click)="toggleMenu('voxel')"
          >
            Voxel
          </button>
          <button
            type="button"
            [class.is-active]="store.activeMenu() === 'preferences'"
            (click)="toggleMenu('preferences')"
          >
            Preferences
          </button>
        </div>
        <span class="studio-menu__status">
          {{ store.activeSceneFilePath() ?? 'Untitled Scene' }}{{ store.sceneDirty() ? ' *' : '' }}
          — {{ store.menuMessage() }}
        </span>

        @if (store.activeMenu() === 'file') {
          <section class="menu-popover menu-popover--file" aria-label="File menu">
            <button type="button" (click)="newWorkspace()">New Scene</button>
            <button type="button" (click)="openSceneFileDialog('open')">Open Scene…</button>
            <button type="button" (click)="saveScene()">Save Scene</button>
            <button type="button" (click)="openSceneFileDialog('save-as')">Save Scene As…</button>
            <button type="button" (click)="openVoxelAssetFileDialog('open')">Open Voxel Asset…</button>
            <button type="button" (click)="openVoxelAssetFileDialog('save-as')">Save Voxel Asset As…</button>
            @if (store.unsavedScenePrompt(); as prompt) {
              <section class="menu-popover__notice" aria-label="Unsaved scene changes">
                <strong>Unsaved changes</strong>
                <span>{{ prompt.message }}</span>
                <button type="button" (click)="confirmDiscardUnsavedScene()">Discard and continue</button>
                <button type="button" (click)="cancelDiscardUnsavedScene()">Cancel</button>
              </section>
            }
            @if (store.sceneFileConflict(); as conflict) {
              <section class="menu-popover__notice" aria-label="External scene file change">
                <strong>File changed on the Studio host</strong>
                <span>{{ conflict.path }}</span>
                <button type="button" (click)="reloadSceneFileAfterConflict()">Reload from Host</button>
                <button type="button" (click)="overwriteSceneFileAfterConflict()">Overwrite Host File</button>
                <button type="button" (click)="cancelSceneFileConflict()">Cancel</button>
              </section>
            }
          </section>
        }

        @if (store.activeMenu() === 'edit') {
          <section class="menu-popover menu-popover--edit" aria-label="Edit menu">
            <button type="button" [disabled]="!store.sceneLightHistory().canUndo" (click)="store.undoSceneLightEdit()">
              Undo {{ store.sceneLightHistory().undoLabel ?? '' }}
            </button>
            <button type="button" [disabled]="!store.sceneLightHistory().canRedo" (click)="store.redoSceneLightEdit()">
              Redo {{ store.sceneLightHistory().redoLabel ?? '' }}
            </button>
          </section>
        }

        @if (store.activeMenu() === 'scene') {
          <section class="menu-popover menu-popover--scene" aria-label="Scene menu">
            <strong>Add Light</strong>
            <button type="button" data-add-light="ambient" (click)="store.addAuthoredLight('ambient')">Ambient Light</button>
            <button type="button" data-add-light="directional" (click)="store.addAuthoredLight('directional')">Directional Light</button>
            <button type="button" data-add-light="point" (click)="store.addAuthoredLight('point')">Point Light</button>
            <button type="button" data-add-light="spot" (click)="store.addAuthoredLight('spot')">Spot Light</button>
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
            <fieldset class="menu-popover__fieldset">
              <legend>Lighting Preview</legend>
              <label>
                <input
                  type="radio"
                  name="view-lighting-mode"
                  [checked]="store.renderSettings().lightingMode === 'work_light'"
                  (change)="store.setLightingMode('work_light')"
                />
                Editor Work Lights
              </label>
              <label>
                <input
                  type="radio"
                  name="view-lighting-mode"
                  [checked]="store.renderSettings().lightingMode === 'authored_lights'"
                  (change)="store.setLightingMode('authored_lights')"
                />
                Authored Lights
              </label>
            </fieldset>
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
                    <small>{{ session.runtimeSessionSummaryHash || 'no projection' }}</small>
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

        @if (store.activeMenu() === 'runtime') {
          <section class="menu-popover menu-popover--runtime" aria-label="Runtime menu">
            <asha-runtime-tools-menu />
          </section>
        }

        @if (store.activeMenu() === 'voxel') {
          <section class="menu-popover menu-popover--voxel" aria-label="Voxel menu">
            <div class="menu-popover__actions" aria-label="Voxel asset files">
              <button type="button" (click)="openVoxelAssetFileDialog('open')">Open Voxel Asset…</button>
              <button type="button" (click)="openVoxelAssetFileDialog('save-as')">Save Voxel Asset As…</button>
            </div>
            <asha-voxel-tools-menu />
          </section>
        }
      </nav>

      <asha-hierarchy-panel class="hierarchy-panel" />

      <section class="viewport-column" data-visual-id="studio-viewport-column">
        <asha-viewport-toolbar-panel />
        <asha-studio-viewport />
      </section>

      <asha-inspector-panel class="inspector-panel" />
      <asha-assets-bottom-panel class="assets-panel" />

      @if (store.projectFileDialog().mode; as fileDialogMode) {
        <div
          class="host-file-dialog-backdrop"
          data-visual-id="studio-host-file-dialog"
          (mousedown)="closeHostFileDialog()"
        >
          <section
            class="host-file-dialog"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            [attr.aria-label]="store.projectFileDialog().title"
            (mousedown)="$event.stopPropagation()"
          >
            <header class="host-file-dialog__header">
              <div>
                <strong>{{ store.projectFileDialog().title }}</strong>
                <small>Files on the Studio host</small>
              </div>
              <button type="button" aria-label="Close file dialog" (click)="closeHostFileDialog()">×</button>
            </header>

            <div class="host-file-dialog__location-bar">
              <button type="button" title="Parent directory" (click)="openProjectParentDir()">Up</button>
              <button type="button" title="Refresh directory" (click)="refreshProjectFiles()">Refresh</button>
              <label>
                <span>Location</span>
                <input
                  type="text"
                  aria-label="Host directory"
                  data-file-dialog-initial-focus
                  [value]="store.projectFileDialog().directoryPath"
                  [title]="store.projectFileDialog().directoryPath"
                  (input)="setProjectFileDirectoryPath($any($event.target).value)"
                  (keydown.enter)="navigateProjectFileDirectory()"
                />
              </label>
              <button type="button" (click)="navigateProjectFileDirectory()">Go</button>
            </div>

            <div class="host-file-dialog__status" aria-live="polite">
              <span [class.is-connected]="store.projectFileDialog().connected">
                {{ store.projectFileDialog().connected ? 'Host connected' : 'Host unavailable' }}
              </span>
              <small>{{ store.projectFileDialog().message }}</small>
            </div>

            <div class="host-file-dialog__list" role="listbox" aria-label="Files and directories">
              <div class="host-file-dialog__list-heading" aria-hidden="true">
                <span>Name</span>
                <span>Type</span>
                <span>Size</span>
              </div>
              <div class="host-file-dialog__entries">
                @for (file of store.projectFileDialog().entries; track file.path) {
                  <button
                    type="button"
                    role="option"
                    class="host-file-dialog__entry"
                    [class.is-current]="store.projectFileDialog().selectedPath === file.path"
                    [attr.aria-selected]="store.projectFileDialog().selectedPath === file.path"
                    [title]="file.path"
                    (click)="selectProjectFile(file.path)"
                    (dblclick)="activateProjectFile(file.path)"
                  >
                    <span class="host-file-dialog__entry-name">
                      <span aria-hidden="true">{{ file.kind === 'directory' ? '▸' : '·' }}</span>
                      <span>{{ file.name }}</span>
                    </span>
                    <span>
                      {{ file.kind === 'directory' ? 'Folder' : store.projectFileDialog().resourceKind === 'scene' ? 'ASHA Scene' : 'ASHA Voxel Asset' }}
                    </span>
                    <span>{{ formatFileSize(file.size) }}</span>
                  </button>
                } @empty {
                  <div class="host-file-dialog__empty">
                    {{ store.projectFileDialog().connected ? 'This directory is empty.' : 'Connect the Studio host file service to browse.' }}
                  </div>
                }
              </div>
            </div>

            <footer class="host-file-dialog__footer">
              <label class="host-file-dialog__file-name">
                <span>File name</span>
                <input
                  type="text"
                  [attr.aria-label]="store.projectFileDialog().resourceKind === 'scene' ? 'Scene file name' : 'Voxel asset file name'"
                  [value]="store.projectFileDialog().fileName"
                  [title]="store.projectFileDialog().targetPath"
                  (input)="setProjectFileName($any($event.target).value)"
                  (keydown.enter)="confirmHostFileDialog()"
                />
              </label>
              <label class="host-file-dialog__file-type">
                <span>File type</span>
                <select disabled aria-label="File type">
                  <option>{{ store.projectFileDialog().fileTypeLabel }}</option>
                </select>
              </label>
              <div class="host-file-dialog__selected-path" [title]="store.projectFileDialog().targetPath">
                {{ store.projectFileDialog().targetPath || 'No host path selected' }}
              </div>

              @if (store.unsavedScenePrompt(); as prompt) {
                <section class="host-file-dialog__notice" aria-label="Unsaved scene changes">
                  <strong>Unsaved changes</strong>
                  <span>{{ prompt.message }}</span>
                  <button type="button" (click)="confirmDiscardUnsavedScene()">Discard and continue</button>
                  <button type="button" (click)="cancelDiscardUnsavedScene()">Keep editing</button>
                </section>
              }

              @if (store.sceneFileConflict(); as conflict) {
                <section class="host-file-dialog__notice" aria-label="External scene file change">
                  <strong>File changed on the Studio host</strong>
                  <span>{{ conflict.path }}</span>
                  <button type="button" (click)="reloadSceneFileAfterConflict()">Reload from Host</button>
                  <button type="button" (click)="overwriteSceneFileAfterConflict()">Overwrite Host File</button>
                  <button type="button" (click)="cancelSceneFileConflict()">Cancel</button>
                </section>
              }

              <div class="host-file-dialog__actions">
                <button type="button" (click)="closeHostFileDialog()">Cancel</button>
                <button
                  type="button"
                  class="is-primary"
                  [disabled]="!store.projectFileDialog().canConfirm"
                  (click)="confirmHostFileDialog()"
                >
                  {{ fileDialogMode === 'open' ? 'Open' : 'Save' }}
                </button>
              </div>
            </footer>
          </section>
        </div>
      }
    </main>
  `,
  styles: [
    `
      .studio-layout {
        background: var(--asha-color-canvas);
        color: var(--asha-color-ink);
        display: grid;
        grid-template-columns: 18rem minmax(32rem, 1fr) 21rem;
        grid-template-rows: 2rem minmax(0, 1fr) 14rem;
        grid-template-areas:
          "menu menu menu"
          "hierarchy viewport inspector"
          "assets assets assets";
        min-height: 100vh;
        max-width: 100vw;
        overflow-x: hidden;
      }

      asha-assets-bottom-panel,
      asha-hierarchy-panel,
      asha-inspector-panel,
      asha-runtime-tools-menu,
      asha-studio-viewport,
      asha-viewport-toolbar-panel,
      asha-voxel-tools-menu {
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
        left: 24.7rem;
        min-width: 17rem;
      }

      .menu-popover--project {
        left: 11.3rem;
        min-width: 24rem;
      }

      .menu-popover--voxel {
        left: 20.3rem;
        max-width: calc(100vw - 1rem);
        min-width: min(48rem, calc(100vw - 1rem));
        padding: 0;
      }

      .menu-popover--runtime {
        left: 15.4rem;
        max-width: calc(100vw - 1rem);
        min-width: min(48rem, calc(100vw - 1rem));
        padding: 0;
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

      .host-file-dialog-backdrop {
        align-items: center;
        background: rgba(4, 7, 9, 0.72);
        display: flex;
        inset: 0;
        justify-content: center;
        padding: 1rem;
        position: fixed;
        z-index: 100;
      }

      .host-file-dialog {
        background: #151b20;
        border: 1px solid #59666e;
        box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.55);
        color: var(--asha-color-ink);
        display: grid;
        grid-template-rows: auto auto auto minmax(14rem, 1fr) auto;
        max-height: calc(100vh - 2rem);
        min-height: min(36rem, calc(100vh - 2rem));
        overflow: hidden;
        width: min(58rem, calc(100vw - 2rem));
      }

      .host-file-dialog button,
      .host-file-dialog input,
      .host-file-dialog select {
        font: inherit;
      }

      .host-file-dialog button {
        background: #232b30;
        border: 1px solid #536068;
        color: var(--asha-color-ink);
        cursor: pointer;
        min-height: 2rem;
        padding: 0.3rem 0.7rem;
      }

      .host-file-dialog button:hover:not(:disabled) {
        background: #303a40;
        border-color: #75858e;
      }

      .host-file-dialog button:disabled {
        color: #69747a;
        cursor: not-allowed;
      }

      .host-file-dialog button.is-primary {
        background: #315d74;
        border-color: #5791ad;
      }

      .host-file-dialog input,
      .host-file-dialog select {
        background: #0f1214;
        border: 1px solid #536068;
        color: var(--asha-color-ink);
        min-width: 0;
        padding: 0.4rem 0.5rem;
      }

      .host-file-dialog__header {
        align-items: center;
        background: #101518;
        border-bottom: 1px solid var(--asha-color-border);
        display: flex;
        justify-content: space-between;
        padding: 0.65rem 0.75rem;
      }

      .host-file-dialog__header div {
        display: grid;
        gap: 0.1rem;
      }

      .host-file-dialog__header small,
      .host-file-dialog__status small {
        color: var(--asha-color-muted);
      }

      .host-file-dialog__header button {
        background: transparent;
        border: 0;
        font-size: 1.25rem;
        min-height: 1.75rem;
        padding: 0 0.55rem;
      }

      .host-file-dialog__location-bar {
        align-items: end;
        display: grid;
        gap: 0.4rem;
        grid-template-columns: auto auto minmax(0, 1fr) auto;
        padding: 0.65rem 0.75rem 0.45rem;
      }

      .host-file-dialog__location-bar label,
      .host-file-dialog__file-name,
      .host-file-dialog__file-type {
        display: grid;
        font-size: 0.74rem;
        gap: 0.2rem;
        min-width: 0;
      }

      .host-file-dialog__status {
        align-items: center;
        display: flex;
        gap: 0.65rem;
        min-width: 0;
        padding: 0 0.75rem 0.5rem;
      }

      .host-file-dialog__status span {
        color: #df9b75;
        font-size: 0.7rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .host-file-dialog__status span.is-connected {
        color: #89c29a;
      }

      .host-file-dialog__status small {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .host-file-dialog__list {
        border-block: 1px solid var(--asha-color-border);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        margin-inline: 0.75rem;
        min-height: 0;
      }

      .host-file-dialog__list-heading,
      .host-file-dialog__entry {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: minmax(16rem, 1fr) 8rem 7rem;
        text-align: left;
      }

      .host-file-dialog__list-heading {
        background: #101518;
        color: var(--asha-color-muted);
        font-size: 0.7rem;
        padding: 0.35rem 0.65rem;
        text-transform: uppercase;
      }

      .host-file-dialog__entries {
        min-height: 0;
        overflow: auto;
      }

      .host-file-dialog__entry {
        background: transparent;
        border: 0;
        border-bottom: 1px solid rgba(83, 96, 104, 0.35);
        min-height: 2.15rem;
        padding: 0.35rem 0.65rem;
        width: 100%;
      }

      .host-file-dialog__entry.is-current {
        background: #294252;
        outline: 1px solid #5791ad;
        outline-offset: -1px;
      }

      .host-file-dialog__entry > span {
        align-self: center;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .host-file-dialog__entry-name {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: 0.75rem minmax(0, 1fr);
      }

      .host-file-dialog__entry-name span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .host-file-dialog__empty {
        color: var(--asha-color-muted);
        padding: 1.5rem 0.75rem;
      }

      .host-file-dialog__footer {
        display: grid;
        gap: 0.5rem 0.75rem;
        grid-template-columns: minmax(0, 1fr) 16rem;
        padding: 0.65rem 0.75rem 0.75rem;
      }

      .host-file-dialog__selected-path {
        color: var(--asha-color-muted);
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 0.7rem;
        grid-column: 1 / -1;
        min-width: 0;
        overflow-x: auto;
        padding-block: 0.1rem;
        white-space: nowrap;
      }

      .host-file-dialog__notice {
        align-items: center;
        background: #30261f;
        border: 1px solid #8f6d55;
        display: flex;
        gap: 0.5rem;
        grid-column: 1 / -1;
        padding: 0.5rem;
      }

      .host-file-dialog__notice span {
        flex: 1;
      }

      .host-file-dialog__actions {
        display: flex;
        gap: 0.5rem;
        grid-column: 1 / -1;
        justify-content: flex-end;
      }

      .host-file-dialog__actions button {
        min-width: 6.5rem;
      }

      @media (max-width: 900px) {
        .studio-layout {
          grid-template-columns: 1fr;
          grid-template-rows:
            2rem 13rem minmax(20rem, 1fr) 13rem 14rem;
          grid-template-areas:
            "menu"
            "hierarchy"
            "viewport"
            "inspector"
            "assets";
        }

        .menu-popover--runtime,
        .menu-popover--voxel {
          left: 0.5rem;
        }

        .host-file-dialog {
          min-height: calc(100vh - 1rem);
          width: calc(100vw - 1rem);
        }

        .host-file-dialog-backdrop {
          padding: 0.5rem;
        }

        .host-file-dialog__list-heading,
        .host-file-dialog__entry {
          grid-template-columns: minmax(12rem, 1fr) 6rem;
        }

        .host-file-dialog__list-heading span:last-child,
        .host-file-dialog__entry > span:last-child {
          display: none;
        }

        .host-file-dialog__footer {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioShellComponent {
  readonly store = inject(StudioWorkspaceStore);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private fileDialogReturnTarget: HTMLElement | null = null;

  toggleMenu(menu: 'file' | 'edit' | 'scene' | 'view' | 'project' | 'runtime' | 'voxel' | 'preferences'): void {
    this.store.toggleActiveMenu(menu);
  }

  newWorkspace(): void {
    this.store.newWorkspace();
  }

  saveScene(): void {
    this.rememberFileDialogReturnTarget();
    this.store.saveSceneFile();
    this.focusFileDialogAfterOpen();
  }

  openSceneFileDialog(mode: 'open' | 'save-as'): void {
    this.rememberFileDialogReturnTarget();
    this.store.openSceneFileDialog(mode);
    this.focusFileDialogAfterOpen();
  }

  openVoxelAssetFileDialog(mode: 'open' | 'save-as'): void {
    this.rememberFileDialogReturnTarget();
    this.store.openVoxelAssetFileDialog(mode);
    this.focusFileDialogAfterOpen();
  }

  closeHostFileDialog(): void {
    this.store.closeHostFileDialog();
    this.restoreFocusAfterFileDialogClose();
  }

  closeSceneFileDialog(): void {
    this.closeHostFileDialog();
  }

  setProjectFileDirectoryPath(path: string): void {
    this.store.setProjectFileDirectoryPath(path);
  }

  navigateProjectFileDirectory(): void {
    this.store.navigateProjectFileDirectory();
  }

  setProjectFileName(fileName: string): void {
    this.store.setProjectFileName(fileName);
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

  activateProjectFile(path: string): void {
    this.store.activateProjectFile(path);
    this.restoreFocusIfFileDialogClosed();
  }

  confirmSceneFileDialog(): void {
    this.confirmHostFileDialog();
  }

  confirmHostFileDialog(): void {
    this.store.confirmHostFileDialog();
    this.restoreFocusIfFileDialogClosed();
  }

  formatFileSize(size: number | null): string {
    if (size === null) {
      return '—';
    }
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  confirmDiscardUnsavedScene(): void {
    this.store.confirmDiscardUnsavedScene();
    this.restoreFocusIfFileDialogClosed();
  }

  cancelDiscardUnsavedScene(): void {
    this.store.cancelDiscardUnsavedScene();
  }

  reloadSceneFileAfterConflict(): void {
    this.store.reloadSceneFileAfterConflict();
    this.restoreFocusIfFileDialogClosed();
  }

  overwriteSceneFileAfterConflict(): void {
    this.store.overwriteSceneFileAfterConflict();
    this.restoreFocusIfFileDialogClosed();
  }

  cancelSceneFileConflict(): void {
    this.store.cancelSceneFileConflict();
  }

  @HostListener('window:beforeunload', ['$event'])
  protectUnsavedScene(event: BeforeUnloadEvent): void {
    if (this.store.sceneDirty() || this.store.workspaceAuthoringDirty()) {
      event.preventDefault();
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleFileDialogKeyboard(event: KeyboardEvent): void {
    if (this.store.projectFileDialog().mode === null) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeHostFileDialog();
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = this.fileDialogElement();
    if (dialog === null) return;
    if (containHostFileDialogTabFocus(dialog, event.shiftKey)) {
      event.preventDefault();
    }
  }

  private rememberFileDialogReturnTarget(): void {
    const active = document.activeElement;
    const fileMenuTrigger = this.elementRef.nativeElement.querySelector<HTMLElement>('[data-file-menu-trigger]');
    this.fileDialogReturnTarget = active instanceof HTMLElement && active !== document.body
      ? active
      : fileMenuTrigger;
  }

  private focusFileDialogAfterOpen(): void {
    if (this.store.projectFileDialog().mode === null) return;
    setTimeout(() => {
      const dialog = this.fileDialogElement();
      if (dialog !== null) focusInitialHostFileDialogControl(dialog);
    }, 0);
  }

  private restoreFocusIfFileDialogClosed(): void {
    if (this.store.projectFileDialog().mode === null) {
      this.restoreFocusAfterFileDialogClose();
    }
  }

  private restoreFocusAfterFileDialogClose(): void {
    const returnTarget = this.fileDialogReturnTarget;
    this.fileDialogReturnTarget = null;
    setTimeout(() => {
      const fallback = this.elementRef.nativeElement.querySelector<HTMLElement>('[data-file-menu-trigger]');
      restoreHostFileDialogFocus(returnTarget, fallback);
    }, 0);
  }

  private fileDialogElement(): HTMLElement | null {
    return this.elementRef.nativeElement.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
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

  setRenderSetting(
    key: 'wireframeEnabled' | 'showGrid' | 'showPreviewGhosts' | 'showReadbackOverlay' | 'showRaycastHitDebug',
    value: boolean,
  ): void {
    this.store.setRenderSetting(key, value);
  }
}
