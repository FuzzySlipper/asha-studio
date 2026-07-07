import { TestBed } from '@angular/core/testing';
import { StudioShellComponent } from '@asha-studio/shell';

function openPlayableLoopInspector(element: HTMLElement): void {
  const inspectorButton = element.querySelector(
    '[data-runtime-inspection="loop-inspector-toggle"]',
  ) as HTMLButtonElement | null;
  expect(inspectorButton).not.toBeNull();
  inspectorButton?.click();
}

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

  it('renders the fail-closed voxel conversion workspace shell', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const panel = element.querySelector('[data-visual-id="studio-voxel-conversion-workspace"]');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('voxel-conversion-shell.v0');
    expect(panel?.textContent).toContain('failed_closed');
    expect(panel?.textContent).toContain('runtime_facade_unavailable');
    expect(panel?.querySelector('[data-voxel-shell-state="empty_inputs"]')).not.toBeNull();
    expect(panel?.querySelector('[data-voxel-shell-state="missing_capability"]')).not.toBeNull();
    expect(panel?.querySelector('[data-voxel-shell-state="ready"]')).not.toBeNull();
    expect(panel?.querySelector('[data-voxel-control="source-asset"]')).not.toBeNull();
    expect(panel?.querySelector('[data-voxel-control="mode"]')).not.toBeNull();
    expect(panel?.querySelector('[data-voxel-control="max-output-voxels"]')).not.toBeNull();
    expect(panel?.querySelector('[data-voxel-control="material-voxel-id"]')).not.toBeNull();
    expect(panel?.querySelector('[data-voxel-proposal-diagnostic-code]')).not.toBeNull();

    for (const region of ['source', 'settings', 'preview', 'diagnostics', 'timeline', 'evidence']) {
      expect(panel?.querySelector(`[data-voxel-region="${region}"]`)).not.toBeNull();
    }

    for (const commandId of [
      'voxel_conversion.plan',
      'voxel_conversion.preview',
      'voxel_conversion.apply',
      'voxel_conversion.export_evidence',
    ]) {
      const button = panel?.querySelector(`[data-voxel-action="${commandId}"]`) as HTMLButtonElement | null;
      expect(button).not.toBeNull();
      expect(button?.disabled).toBe(true);
    }
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
    expect(overview?.textContent).toContain('../asha-demo');
    expect(overview?.textContent).toContain('ws://127.0.0.1:7391');
    expect(overview?.textContent).toContain('npm run build');
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

  it('attaches the public RuntimeSession facade and renders live inspection readout', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const panel = element.querySelector('[data-visual-id="studio-runtime-session-inspection"]');
    expect(panel?.textContent).toContain('definition_authoring');
    expect(panel?.textContent).toContain('not_attached');

    const attachButton = Array.from(panel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Attach',
    );
    attachButton?.click();
    fixture.detectChanges();

    expect(panel?.querySelector('[data-runtime-inspection="studio-mode"]')?.textContent).toContain(
      'live_runtime_inspection',
    );
    expect(panel?.querySelector('[data-runtime-inspection="session-id"]')?.textContent).toContain(
      'runtime-session:asha-demo:studio-reference',
    );
    expect(panel?.querySelector('[data-runtime-inspection="tick"]')?.textContent).toContain('tick 0');
    expect(panel?.querySelector('[data-runtime-inspection="replay-count"]')?.textContent).toContain(
      'records 1',
    );
    expect(
      Array.from(panel?.querySelectorAll('button') ?? []).find(
        button => button.textContent?.trim() === 'Pause',
      )?.disabled,
    ).toBe(true);

    const tickButton = Array.from(panel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Tick',
    );
    tickButton?.click();
    fixture.detectChanges();
    expect(panel?.querySelector('[data-runtime-inspection="tick"]')?.textContent).toContain('tick 1');

    const restartButton = Array.from(panel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Restart',
    );
    restartButton?.click();
    fixture.detectChanges();
    expect(panel?.querySelector('[data-runtime-inspection="tick"]')?.textContent).toContain('tick 0');
    expect(panel?.textContent).toContain('restart');
  });

  it('keeps live authoring inspectors in a scrollable popout instead of the top strip', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const topPanel = element.querySelector('[data-visual-id="studio-top-panel"]');
    expect(topPanel).not.toBeNull();
    expect(element.querySelector('[data-visual-id="studio-playable-loop-popout"]')).toBeNull();
    expect(element.querySelector('[data-visual-id="studio-generated-level-inspection"]')).toBeNull();

    openPlayableLoopInspector(element);
    fixture.detectChanges();

    const popout = element.querySelector('[data-visual-id="studio-playable-loop-popout"]');
    expect(popout?.textContent).toContain('Playable Loop Inspector');
    expect(popout?.querySelector('[data-visual-id="studio-generated-level-inspection"]')).not.toBeNull();
    expect(popout?.querySelector('[data-visual-id="studio-encounter-tuning-inspection"]')).not.toBeNull();
    expect(popout?.querySelector('[data-visual-id="studio-playable-loop-inspection"]')).not.toBeNull();
  });

  it('renders the asha-demo product path from authored content through typed live controls', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    openPlayableLoopInspector(element);
    fixture.detectChanges();

    const productPath = element.querySelector('[data-visual-id="studio-asha-demo-product-path"]');
    expect(productPath?.querySelector('[data-product-path="version"]')?.textContent).toContain(
      'studio-asha-demo-product-path.v0',
    );
    expect(productPath?.querySelector('[data-product-path="project-root"]')?.textContent).toContain(
      '../asha-demo',
    );
    expect(productPath?.querySelector('[data-product-path="project-root"]')?.textContent).toContain(
      'project/project-bundle.json',
    );
    expect(productPath?.textContent).toContain('catalogs/actors/demo-player.entity.json');
    expect(productPath?.textContent).toContain('catalogs/actors/generated-tunnel-enemy.entity.json');
    expect(productPath?.textContent).toContain('levels/scenes/generated-tunnel-room.scene.json');
    expect(productPath?.textContent).toContain('levels/presets/tiny-enclosed-tunnel.json');
    expect(productPath?.textContent).toContain('catalogs/gameplay/default-fps.catalog.json');
    expect(productPath?.querySelector('[data-product-path="mode"]')?.textContent).toContain(
      'definition_authoring',
    );
    expect(productPath?.querySelector('[data-product-path="live-state"]')?.textContent).toContain(
      'not_attached',
    );
    expect(productPath?.querySelector('[data-product-path="public-surfaces"]')?.textContent).toContain(
      '@asha/game-workspace:parseAshaGameManifestToml',
    );
    expect(productPath?.querySelector('[data-product-path="public-surfaces"]')?.textContent).toContain(
      '@asha/runtime-bridge:RuntimeSessionFacade.requestSessionRestart',
    );

    const runtimePanel = element.querySelector('[data-visual-id="studio-runtime-session-inspection"]');
    const attachButton = Array.from(runtimePanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Attach',
    );
    attachButton?.click();
    fixture.detectChanges();

    expect(productPath?.querySelector('[data-product-path="mode"]')?.textContent).toContain(
      'live_runtime_inspection',
    );
    expect(productPath?.querySelector('[data-product-path="live-state"]')?.textContent).toContain(
      'attached',
    );
    expect(productPath?.querySelector('[data-product-path="live-session"]')?.textContent).toContain(
      'runtime-session:asha-demo:studio-reference',
    );
    expect(productPath?.querySelector('[data-product-path="lifecycle"]')?.textContent).toContain(
      'In progress',
    );

    const loopPanel = element.querySelector('[data-visual-id="studio-playable-loop-inspection"]');
    const runPolicyButton = Array.from(loopPanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Run Policy',
    );
    runPolicyButton?.click();
    fixture.detectChanges();

    expect(productPath?.querySelector('[data-product-path="lifecycle"]')?.textContent).toContain(
      'Enemy defeated',
    );
    expect(productPath?.querySelector('[data-product-path="controls"]')?.textContent).toContain(
      'policy ready',
    );

    const restartButton = Array.from(loopPanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Restart',
    );
    restartButton?.click();
    fixture.detectChanges();

    expect(productPath?.querySelector('[data-product-path="lifecycle"]')?.textContent).toContain(
      'In progress',
    );
    expect(productPath?.textContent).toContain('runtime.restart_session_intent');
  });

  it('renders generated-level preset authoring and live metadata without crossing the mode boundary', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    openPlayableLoopInspector(element);
    fixture.detectChanges();

    const generatedPanel = element.querySelector('[data-visual-id="studio-generated-level-inspection"]');
    expect(generatedPanel?.textContent).toContain('Definition Authoring');
    expect(generatedPanel?.textContent).toContain('stored preset');
    expect(generatedPanel?.textContent).toContain('not live mutation');
    expect(generatedPanel?.querySelector('[data-generated-level="authoring-mode"]')?.textContent).toContain(
      'definition_authoring',
    );
    expect(generatedPanel?.querySelector('[data-generated-level-field="presetId"]')?.textContent).toContain(
      'tiny-enclosed',
    );
    expect(generatedPanel?.querySelector('[data-generated-level-field="seed"]')?.textContent).toContain('17');
    expect(generatedPanel?.querySelector('[data-generated-level="attach-state"]')?.textContent).toContain(
      'not_attached',
    );

    const runtimePanel = element.querySelector('[data-visual-id="studio-runtime-session-inspection"]');
    const attachButton = Array.from(runtimePanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Attach',
    );
    attachButton?.click();
    fixture.detectChanges();

    expect(generatedPanel?.querySelector('[data-generated-level="live-mode"]')?.textContent).toContain(
      'live_runtime_inspection',
    );
    expect(generatedPanel?.querySelector('[data-generated-level="attach-state"]')?.textContent).toContain(
      'attached',
    );
    expect(generatedPanel?.querySelector('[data-generated-level="preset-id"]')?.textContent).toContain(
      'tiny-enclosed',
    );
    expect(generatedPanel?.querySelector('[data-generated-level="generator-hashes"]')?.textContent).toContain(
      'e1d156c6b55137a7',
    );
    expect(generatedPanel?.querySelector('[data-generated-level="generator-hashes"]')?.textContent).toContain(
      'a9b504096397f5b4',
    );
    expect(generatedPanel?.querySelector('[data-generated-level="volume"]')?.textContent).toContain('5×4×9');
    expect(generatedPanel?.querySelector('[data-generated-level="render-collision-hash"]')?.textContent).toContain(
      'fnv1a64:21eb8696f6f3b5c4',
    );
    expect(generatedPanel?.querySelector('[data-generated-level="nav-hash"]')?.textContent).toContain(
      'd1f6ac3e051d6b6e',
    );
    expect(generatedPanel?.querySelector('[data-generated-level="spawn-markers"]')?.textContent).toContain('2 markers');

    const regenerateButton = Array.from(generatedPanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Regenerate',
    );
    expect(regenerateButton?.disabled).toBe(false);
    regenerateButton?.click();
    fixture.detectChanges();

    expect(generatedPanel?.querySelector('[data-generated-level="regenerate-status"]')?.textContent).toContain(
      'unsupported',
    );
    expect(generatedPanel?.querySelector('[data-generated-level="regenerate-status"]')?.textContent).toContain(
      'generated_tunnel_operation_not_wired',
    );
    expect(runtimePanel?.querySelector('[data-runtime-inspection="replay-count"]')?.textContent).toContain(
      'records 2',
    );
  });

  it('renders encounter tuning authoring and live runtime inspection from public surfaces', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    openPlayableLoopInspector(element);
    fixture.detectChanges();

    const tuningPanel = element.querySelector('[data-visual-id="studio-encounter-tuning-inspection"]');
    expect(tuningPanel?.textContent).toContain('Definition Authoring');
    expect(tuningPanel?.querySelector('[data-encounter-tuning="schema-kinds"]')?.textContent).toContain(
      'fps_gameplay_preset_readout.v0',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="schema-kinds"]')?.textContent).toContain(
      'fps_gameplay_preset_catalog_readout.v0',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="preset-id"]')?.textContent).toContain(
      'asha.generated_tunnel.default_fps.v0',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="validation-status"]')?.textContent).toContain(
      'valid',
    );

    const damageInput = tuningPanel?.querySelector(
      '[data-gameplay-preset-field="weaponDamage"] input',
    ) as HTMLInputElement | null;
    expect(damageInput).not.toBeNull();
    if (damageInput !== null) {
      damageInput.value = '80';
      damageInput.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();

    const updatedDamageInput = tuningPanel?.querySelector(
      '[data-gameplay-preset-field="weaponDamage"] input',
    ) as HTMLInputElement | null;
    expect(updatedDamageInput?.value).toBe('80');
    expect(tuningPanel?.querySelector('[data-encounter-tuning="validation-status"]')?.textContent).toContain(
      'valid',
    );

    const validateButton = Array.from(tuningPanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Validate Tuning',
    );
    validateButton?.click();
    fixture.detectChanges();

    const runtimePanel = element.querySelector('[data-visual-id="studio-runtime-session-inspection"]');
    const attachButton = Array.from(runtimePanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Attach',
    );
    attachButton?.click();
    fixture.detectChanges();

    expect(tuningPanel?.querySelector('[data-encounter-tuning="live-mode"]')?.textContent).toContain(
      'live_runtime_inspection',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="encounter-status"]')?.textContent).toContain(
      'pending',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="spawn-summary"]')?.textContent).toContain(
      'pending entity 20',
    );

    const loopPanel = element.querySelector('[data-visual-id="studio-playable-loop-inspection"]');
    const runPolicyButton = Array.from(loopPanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Run Policy',
    );
    runPolicyButton?.click();
    fixture.detectChanges();

    expect(tuningPanel?.querySelector('[data-encounter-tuning="encounter-status"]')?.textContent).toContain(
      'cleared',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="spawn-summary"]')?.textContent).toContain(
      'defeated entity 20',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="combat-feedback"]')?.textContent).toContain(
      'combat_feedback_projection.v0',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="combat-feedback"]')?.textContent).toContain(
      'hit',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="lifecycle"]')?.textContent).toContain(
      'Enemy defeated',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="transition-receipt"]')?.textContent).toContain(
      'sync_lifecycle',
    );
    expect(tuningPanel?.querySelector('[data-encounter-tuning="transition-receipt"]')?.textContent).toContain(
      'active -> cleared',
    );
  });

  it('renders live playable-loop inspection from public runtime readouts and controls', async () => {
    await TestBed.configureTestingModule({
      imports: [StudioShellComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StudioShellComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    openPlayableLoopInspector(element);
    fixture.detectChanges();

    const runtimePanel = element.querySelector('[data-visual-id="studio-runtime-session-inspection"]');
    const loopPanel = element.querySelector('[data-visual-id="studio-playable-loop-inspection"]');
    expect(loopPanel?.querySelector('[data-playable-loop="version"]')?.textContent).toContain(
      'studio-playable-loop-inspection.v0',
    );
    expect(loopPanel?.querySelector('[data-playable-loop="mode"]')?.textContent).toContain('not_attached');
    expect(loopPanel?.querySelector('[data-playable-loop="restart-status"]')?.textContent).toContain(
      'runtime_session_not_attached',
    );

    const attachButton = Array.from(runtimePanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Attach',
    );
    attachButton?.click();
    fixture.detectChanges();

    expect(loopPanel?.querySelector('[data-playable-loop="mode"]')?.textContent).toContain(
      'live_runtime_inspection',
    );
    expect(loopPanel?.querySelector('[data-playable-loop="session"]')?.textContent).toContain('seed 17');
    expect(loopPanel?.querySelector('[data-playable-loop="generated-level"]')?.textContent).toContain(
      'tiny-enclosed',
    );
    expect(loopPanel?.querySelector('[data-playable-loop="lifecycle"]')?.textContent).toContain('In progress');

    const runPolicyButton = Array.from(loopPanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Run Policy',
    );
    expect(runPolicyButton?.disabled).toBe(false);
    runPolicyButton?.click();
    fixture.detectChanges();

    expect(loopPanel?.querySelector('[data-playable-loop="policy-summary"]')?.textContent).toContain('1 accepted');
    expect(loopPanel?.querySelector('[data-playable-loop="policy-summary"]')?.textContent).toContain('1 unsupported');
    expect(loopPanel?.textContent).toContain('movement_authority_not_wired');
    expect(loopPanel?.querySelector('[data-playable-loop="nav-path"]')?.textContent).toContain('e8e1ea7a09811ced');
    expect(loopPanel?.querySelector('[data-playable-loop="combat-health"]')?.textContent).toContain(
      'Health 0/40 defeated',
    );
    expect(loopPanel?.querySelector('[data-playable-loop="lifecycle"]')?.textContent).toContain('Enemy defeated');
    expect(loopPanel?.textContent).toContain('runtime_lifecycle.enemy_defeated.v0');
    expect(loopPanel?.querySelector('[data-playable-loop="selected-entity"]')?.textContent).toContain(
      'generated-tunnel.enemy.1',
    );

    const restartButton = Array.from(loopPanel?.querySelectorAll('button') ?? []).find(
      button => button.textContent?.trim() === 'Restart',
    );
    expect(restartButton?.disabled).toBe(false);
    restartButton?.click();
    fixture.detectChanges();

    expect(loopPanel?.querySelector('[data-playable-loop="restart-status"]')?.textContent).toContain('accepted');
    expect(loopPanel?.querySelector('[data-playable-loop="restart-status"]')?.textContent).toContain(
      'won -> in_progress',
    );
    expect(loopPanel?.querySelector('[data-playable-loop="lifecycle"]')?.textContent).toContain('In progress');
    expect(loopPanel?.querySelector('[data-playable-loop="combat-health"]')?.textContent).toContain(
      'Health 40/40 active',
    );
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
