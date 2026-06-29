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

  it('renders the game asset catalog inventory in the Assets tab', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const assetsButton = Array.from(element.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Assets',
    );
    assetsButton?.click();
    fixture.detectChanges();

    const inventory = element.querySelector('[data-asset-inventory-summary]');
    expect(inventory?.textContent).toContain('asha_demo_asset_inventory');
    expect(element.querySelector('[data-asset-id="mesh.demo-cube"]')?.textContent).toContain(
      'assets/meshes/demo-cube.mesh.json',
    );
    expect(element.querySelector('[data-asset-id="material.demo-copper"]')?.textContent).toContain(
      'material',
    );
    expect(element.querySelector('[data-asset-id="texture.demo-checker"]')?.textContent).toContain(
      'texture',
    );
  });

  it('renders proof scenes tied to catalog assets in the Proof Scenes tab', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const proofScenesButton = Array.from(element.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Proof Scenes',
    );
    proofScenesButton?.click();
    fixture.detectChanges();

    const panel = element.querySelector('[data-visual-id="studio-proof-scene-panel"]');
    expect(panel?.textContent).toContain('ASHA Demo Material Proof');
    expect(panel?.textContent).toContain('mesh.demo-cube');
    expect(panel?.textContent).toContain('material.demo-copper');
    expect(panel?.textContent).toContain('texture.demo-checker');
    expect(panel?.textContent).toContain('harness/conformance/fixtures/minimal-world.json');
    expect(element.querySelector('[data-proof-scene-id="1002"]')).not.toBeNull();
  });
});
