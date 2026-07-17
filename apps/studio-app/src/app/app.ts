import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { StudioShellComponent } from '@asha-studio/shell';
import { StudioWorkspaceStore } from '@asha-studio/store';
import { readStudioStartupProject } from './studio-startup';

@Component({
  selector: 'asha-root',
  standalone: true,
  imports: [StudioShellComponent],
  template: '<asha-studio-shell />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly store = inject(StudioWorkspaceStore);

  ngOnInit(): void {
    const startupProject = readStudioStartupProject(globalThis.location?.href ?? '');
    if (startupProject.status === 'open') {
      void this.store.openProjectPath(startupProject.path);
      return;
    }
    if (startupProject.status === 'invalid') {
      void this.store.openProjectPath('');
    }
  }
}
