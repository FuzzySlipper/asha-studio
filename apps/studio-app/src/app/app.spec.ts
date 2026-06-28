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

  it('renders the game workspace overview from the parsed manifest fixture', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const overview = element.querySelector('[data-visual-id="studio-game-workspace-overview"]');
    expect(overview).not.toBeNull();
    expect(overview?.textContent).toContain('asha-demo');
    expect(overview?.textContent).toContain('ws://127.0.0.1:7391');
    expect(overview?.textContent).toContain('npm run publish:artifact');
    expect(
      overview?.querySelector('[data-workspace-overview="workspace-hash"]')?.textContent,
    ).toContain('studio-game-workspace-');
  });
});
