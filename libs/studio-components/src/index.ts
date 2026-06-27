import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'asha-command-button',
  standalone: true,
  template: `
    <button
      class="asha-command-button"
      type="button"
      [disabled]="disabled()"
      (click)="pressed.emit()"
    >
      <span>{{ label() }}</span>
    </button>
  `,
  styles: [
    `
      .asha-command-button {
        align-items: center;
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        gap: 0.375rem;
        min-height: 2rem;
        padding: 0 0.75rem;
      }

      .asha-command-button:disabled {
        color: var(--asha-color-muted);
        cursor: default;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AshaCommandButtonComponent {
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly pressed = output<void>();
}
