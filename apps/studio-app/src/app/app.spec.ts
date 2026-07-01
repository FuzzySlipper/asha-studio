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

  it('renders explicit runtime session rows in the top panel', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const panel = element.querySelector('[data-visual-id="studio-runtime-session-panel"]');
    expect(panel?.textContent).toContain('preview');
    expect(panel?.textContent).toContain('available');
    expect(panel?.textContent).toContain('reference');
    expect(panel?.textContent).toContain('fixture_reserved');
    expect(panel?.textContent).toContain('replay_reserved');
    expect(element.querySelector('[data-runtime-session-type="preview"]')).not.toBeNull();
  });

  it('renders command proposal actions and accepted rejected evidence in the Commands tab', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const commandsButton = Array.from(element.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Commands',
    );
    commandsButton?.click();
    fixture.detectChanges();

    const panel = element.querySelector('[data-visual-id="studio-command-proposal-panel"]');
    expect(panel?.textContent).toContain('studio-command-proposal-panel.v0');
    expect(panel?.textContent).toContain('command.propose');
    expect(panel?.textContent).toContain('setVoxel');
    expect(panel?.textContent).toContain('authority_rejected');
    expect(element.querySelector('[data-command-action-id="set_voxel_reference"]')).not.toBeNull();
    expect(element.querySelector('[data-command-proposal-status="accepted"]')).not.toBeNull();
    expect(element.querySelector('[data-command-proposal-status="rejected"]')).not.toBeNull();
  });

  it('renders the running project picker from the Project menu', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const projectButton = Array.from(element.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Project',
    );
    projectButton?.click();
    fixture.detectChanges();

    const picker = element.querySelector('[data-visual-id="studio-running-project-picker"]');
    expect(picker?.textContent).toContain('Running ASHA Project');
    expect(picker?.textContent).toContain('ws://127.0.0.1:7391');
    expect(picker?.textContent).toContain('preview');
    expect(picker?.textContent).toContain('Connect');
    expect(element.querySelector('[data-running-session-status="available"]')).not.toBeNull();
  });

  it('renders publish evidence status from the demo publish manifest in the Publish tab', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const publishButton = Array.from(element.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Publish',
    );
    publishButton?.click();
    fixture.detectChanges();

    const panel = element.querySelector('[data-visual-id="studio-publish-evidence-panel"]');
    expect(panel?.textContent).toContain('publish-evidence.v1');
    expect(panel?.textContent).toContain('asha-demo-static-reference.v1');
    expect(panel?.textContent).toContain('no-studio-dev-only-fragments');
    expect(panel?.textContent).toContain('reference-game-runtime-launcher');
    expect(panel?.textContent).toContain('not_store_submission');
    expect(element.querySelector('[data-publish-evidence-status="ready"]')).not.toBeNull();
    expect(element.querySelector('[data-publish-resource-id="mesh.demo-cube"]')).not.toBeNull();
  });

  it('renders the aggregate workspace cockpit evidence marker in the Evidence tab', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const evidenceButton = Array.from(element.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Evidence',
    );
    evidenceButton?.click();
    fixture.detectChanges();

    const panel = element.querySelector('[data-visual-id="studio-workspace-cockpit-evidence"]');
    expect(panel?.textContent).toContain('studio-workspace-cockpit-evidence.v0');
    expect(panel?.textContent).toContain('ready');
  });
});
