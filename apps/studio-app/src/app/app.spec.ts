import { TestBed } from '@angular/core/testing';
import { StudioShellComponent } from '@asha-studio/shell';

describe('StudioShellComponent', () => {
  it('renders the scaffold readback marker', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('asha-studio-substrate');
  });
});
