import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StudioShellComponent } from '@asha-studio/shell';

@Component({
  selector: 'asha-root',
  standalone: true,
  imports: [StudioShellComponent],
  template: '<asha-studio-shell />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
