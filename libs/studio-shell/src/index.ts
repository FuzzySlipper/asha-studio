import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  StudioAssetsBottomPanelComponent,
  StudioHierarchyPanelComponent,
  StudioInspectorPanelComponent,
  StudioSessionTopPanelComponent,
  StudioViewportToolbarPanelComponent,
} from '@asha-studio/panels';
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
        <button type="button">File</button>
        <button type="button">Edit</button>
        <button type="button">View</button>
        <button type="button">Preferences</button>
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
        grid-template-rows: 2rem 4.75rem minmax(0, 1fr) 14rem;
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
        min-width: 0;
        padding: 0 0.5rem;
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
            2rem 4.75rem 13rem minmax(20rem, 1fr) 13rem 14rem;
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
export class StudioShellComponent {}
