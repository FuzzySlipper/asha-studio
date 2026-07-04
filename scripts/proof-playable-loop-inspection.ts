#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildInitialWorkspaceReadModel,
  buildStudioRuntimeSessionInspectionReadModel,
  type StudioGameWorkspaceReadModel,
} from '@asha-studio/domain';
import {
  createMockRuntimeSession,
  type CameraCreateRequest,
  type WorldLoadRequest,
} from '@asha/runtime-bridge';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/playable-loop-inspection/latest');
const htmlPath = join(outDir, 'index.html');
const screenshotPath = join(outDir, 'screenshot.png');
const domPath = join(outDir, 'dom.html');
const artifactPath = join(outDir, 'index.json');

function sha256Buffer(buffer: Buffer): string {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function sha256(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(value)));
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function run(command: string, args: readonly string[]): string {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}

const workspace = buildInitialWorkspaceReadModel();
const gameWorkspace: StudioGameWorkspaceReadModel = {
  workspaceVersion: 'studio-game-workspace.v0',
  workspaceRoot: '../asha-demo',
  manifestPath: 'asha.game.toml',
  gameId: 'asha-demo',
  manifest: {
    asha: {
      engineVersion: '0.1.0',
      contractsVersion: '0.1.0',
      runtimeBridgeVersion: '0.1.0',
      devtoolsProtocolVersion: 'devtools-protocol.v0',
      publishArtifactFormatVersion: 'publish-artifact.v0',
      engineSource: '../asha',
    },
    workspace: {
      sceneRoots: ['scenes'],
      assetRoots: ['assets'],
      replayRoots: ['replays'],
      catalogPackages: ['packages/game-catalogs'],
      policyPackages: ['packages/game-policy'],
    },
    runtime: {
      devCommand: 'pnpm run dev',
      devtoolsEndpoint: 'ws://127.0.0.1:7391',
      wasmOrNativeEntry: 'harness/conformance/fixtures/minimal-world.json',
      backendMode: 'native',
      backendProfile: 'native.napi.launcher.v1',
      backendProofRefs: ['proof:runtime-session-public-facade'],
    },
    studio: {
      workspaceMode: true,
      attachEnabled: true,
      allowedSourceWrites: ['scenes', 'assets', 'packages/game-catalogs', 'packages/game-policy'],
    },
    publish: {
      command: 'pnpm run publish:artifact',
      artifactDir: 'harness/out',
      verifyCommand: 'pnpm run conformance',
    },
    devResourceProfile: {
      localRoots: ['assets', 'packages/game-catalogs'],
      cacheDir: 'harness/out/dev-cache',
      resolutionPolicy: 'prefer-source',
    },
    publishResourceProfile: {
      outputDir: 'harness/out/publish/resources',
      archiveDir: 'harness/out/publish/archive',
      resolutionPolicy: 'locked',
    },
  },
  sceneRoots: ['scenes'],
  assetRoots: ['assets'],
  catalogPackages: ['packages/game-catalogs'],
  policyPackages: ['packages/game-policy'],
  attachEndpoint: 'ws://127.0.0.1:7391',
  devCommand: 'pnpm run dev',
  runtimeEntry: 'harness/conformance/fixtures/minimal-world.json',
  publishCommand: 'pnpm run publish:artifact',
  publishVerifyCommand: 'pnpm run conformance',
  allowedSourceWrites: ['scenes', 'assets', 'packages/game-catalogs', 'packages/game-policy'],
  diagnostics: [],
  workspaceHash: 'studio-game-workspace-proof-playable-loop',
};

const projectBundle: WorldLoadRequest = {
  bundleSchemaVersion: 1,
  protocolVersion: 1,
  sceneId: 1001,
};

const cameraRequest: CameraCreateRequest = {
  initialPose: {
    position: [1, 1.5, 1],
    yawDegrees: 180,
    pitchDegrees: 0,
  },
  projection: {
    fovYDegrees: 60,
    near: 0.1,
    far: 100,
  },
  viewport: {
    width: 1280,
    height: 720,
  },
};

const facade = createMockRuntimeSession();
let state = facade.initialize({
  sessionId: 'runtime-session:asha-demo:playable-loop-proof',
  seed: 17,
  project: {
    gameId: 'asha-demo',
    workspaceId: gameWorkspace.workspaceHash,
  },
  projectBundle,
});
let generatedTunnelReadout = facade.readGeneratedTunnelReadout({ presetId: 'tiny-enclosed', seed: 17 });
let navProjection = facade.readNavProjection();
let encounterTransitionReceipt = facade.requestEncounterTransition({
  kind: 'runtime_session.encounter_transition_request.v0',
  presetId: 'generated-tunnel-small-encounter',
  action: 'activate',
});
const camera = facade.createCamera(cameraRequest).snapshot.camera;
const autonomousPolicyTick = facade.runAutonomousPolicyTick({
  targetCamera: camera,
  policySource: 'export const policy = (view) => view;',
});
const combatFeedbackProjection = facade.readCombatFeedbackProjection({
  camera,
  viewport: cameraRequest.viewport,
});
encounterTransitionReceipt = facade.requestEncounterTransition({
  kind: 'runtime_session.encounter_transition_request.v0',
  presetId: 'generated-tunnel-small-encounter',
  action: 'sync_lifecycle',
});
state = {
  ...state,
  composition: autonomousPolicyTick.step.composition,
  sequenceId: encounterTransitionReceipt.sequenceId,
  tick: autonomousPolicyTick.tick,
  sessionHash: encounterTransitionReceipt.hashes.sessionHashAfter,
};
let lifecycleStatus = facade.readLifecycleStatus();
const loopReadout = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace,
  runtimeSessions: null,
  state,
  projection: facade.readProjection(),
  telemetry: facade.readTelemetry(),
  autonomousPolicyTick,
  lifecycleStatus,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout,
  navProjection,
  encounterDirector: facade.readEncounterDirector(),
  encounterTransitionReceipt,
  combatFeedbackProjection,
  paused: false,
});

assert.equal(loopReadout.playableLoop.policy.loopId, 'generated_tunnel_enemy_policy_loop.v0');
assert.equal(loopReadout.playableLoop.policy.acceptedProposalCount, 1);
assert.equal(loopReadout.playableLoop.policy.unsupportedProposalCount, 1);
assert.equal(loopReadout.playableLoop.nav.pathHash, 'e8e1ea7a09811ced');
assert.equal(loopReadout.playableLoop.lifecycle.outcomeKind, 'won');
assert.equal(loopReadout.playableLoop.selectedEntity?.health?.current, 0);
assert.equal(loopReadout.playableLoopTuning.definitionAuthoring.validation.status, 'valid');
assert.equal(loopReadout.playableLoopTuning.definitionAuthoring.presetReadoutKind, 'fps_gameplay_preset_readout.v0');
assert.equal(loopReadout.playableLoopTuning.definitionAuthoring.catalogReadoutKind, 'fps_gameplay_preset_catalog_readout.v0');
assert.equal(loopReadout.playableLoopTuning.liveInspection.encounter.status, 'cleared');
assert.equal(loopReadout.playableLoopTuning.liveInspection.encounter.defeatedEnemyCount, 1);
assert.equal(loopReadout.playableLoopTuning.liveInspection.combatFeedback.kind, 'combat_feedback_projection.v0');

const restartReceipt = facade.requestSessionRestart({
  kind: 'runtime.restart_session_intent',
  source: 'programmatic',
  requireTerminal: true,
  expectedSessionHash: lifecycleStatus.sessionHash,
});
assert.equal(restartReceipt.status, 'accepted');
state = {
  ...state,
  composition: restartReceipt.restart?.composition ?? state.composition,
  sequenceId: restartReceipt.sequenceId,
  tick: restartReceipt.restart?.tick ?? state.tick,
  sessionHash: restartReceipt.sessionHashAfter,
};
lifecycleStatus = facade.readLifecycleStatus();
generatedTunnelReadout = facade.readGeneratedTunnelReadout({ presetId: 'tiny-enclosed', seed: 17 });
navProjection = facade.readNavProjection();
const encounterAfterRestart = facade.readEncounterDirector();
const restartReadout = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace,
  runtimeSessions: null,
  state,
  projection: facade.readProjection(),
  telemetry: facade.readTelemetry(),
  autonomousPolicyTick,
  lifecycleStatus,
  restartReceipt,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout,
  navProjection,
  encounterDirector: encounterAfterRestart,
  encounterTransitionReceipt: null,
  combatFeedbackProjection: null,
  paused: false,
});

const playableLoop = loopReadout.playableLoop;
const playableLoopTuning = loopReadout.playableLoopTuning;
const restartLoop = restartReadout.playableLoop;
assert.equal(restartLoop.restart.lastReceipt?.statusBefore, 'won');
assert.equal(restartLoop.restart.lastReceipt?.statusAfter, 'in_progress');

const readout = {
  readoutKind: 'studio_playable_loop_inspection_browser_readout',
  readoutVersion: 'studio-playable-loop-inspection-browser.v0',
  runtimeSessionId: state.identity.sessionId,
  playableLoopTuning,
  playableLoop,
  restart: restartLoop.restart,
  lifecycleAfterRestart: restartLoop.lifecycle,
  validations: [
    'public_runtime_session_policy_tick_was_used',
    'public_generated_tunnel_nav_projection_was_used',
    'public_catalog_core_gameplay_preset_validation_was_used',
    'public_encounter_director_transition_was_used',
    'public_combat_feedback_projection_was_used',
    'public_combat_readout_updated_lifecycle',
    'typed_restart_intent_reset_terminal_lifecycle',
    'browser_dom_contains_structured_authoring_and_live_panels',
  ],
  nonClaims: playableLoop.nonClaims,
};

const proposalKinds = playableLoop.policy.proposalKinds
  .map(kind => `<span>${escapeHtml(kind)}</span>`)
  .join('');
const lifecycleEvents = playableLoop.lifecycle.eventKinds
  .map(kind => `<span>${escapeHtml(kind)}</span>`)
  .join('');
const authoringFields = playableLoopTuning.definitionAuthoring.fields
  .map(field => `<span>${escapeHtml(field.label)} ${escapeHtml(field.value)} ${escapeHtml(field.validationStatus)}</span>`)
  .join('');
const encounterSpawns = playableLoopTuning.liveInspection.encounter.spawns
  .map(spawn => `<span>${escapeHtml(spawn.instanceId)} ${escapeHtml(spawn.status)} entity ${escapeHtml(spawn.runtimeEntityId)}</span>`)
  .join('');
const health = playableLoop.selectedEntity?.health;
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ASHA Studio Playable Loop Inspection</title>
    <style>
      :root { color-scheme: dark; font-family: Arial, sans-serif; background: #101214; color: #e8edf0; }
      body { margin: 0; }
      main { box-sizing: border-box; display: grid; gap: 12px; min-height: 100vh; padding: 20px; }
      header { display: grid; gap: 4px; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 22px; }
      h2 { font-size: 15px; margin-bottom: 8px; }
      section { background: #151b20; border: 1px solid #33404a; padding: 12px; }
      dl { display: grid; gap: 4px 12px; grid-template-columns: 190px minmax(0, 1fr); margin: 0; }
      dt { color: #96a4ad; font-size: 12px; text-transform: uppercase; }
      dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
      .grid { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chips span { background: #202932; border: 1px solid #43515e; font-size: 12px; padding: 4px 6px; }
    </style>
  </head>
  <body>
    <main data-visual-id="studio-playable-loop-inspection-browser-proof">
      <header>
        <h1>ASHA Studio Playable Loop Inspection</h1>
        <p data-playable-loop="version">${escapeHtml(playableLoop.loopVersion)}</p>
        <p>${escapeHtml(playableLoop.inspectionHash)}</p>
      </header>
      <div class="grid" data-visual-id="studio-encounter-tuning-inspection">
        <section>
          <h2>Definition Authoring</h2>
          <dl>
            <dt>preset readout</dt><dd>${escapeHtml(playableLoopTuning.definitionAuthoring.presetReadoutKind)}</dd>
            <dt>catalog readout</dt><dd>${escapeHtml(playableLoopTuning.definitionAuthoring.catalogReadoutKind)}</dd>
            <dt>preset</dt><dd data-encounter-tuning="preset-id">${escapeHtml(playableLoopTuning.definitionAuthoring.presetId)}</dd>
            <dt>validation</dt><dd data-encounter-tuning="validation-status">${escapeHtml(playableLoopTuning.definitionAuthoring.validation.status)} · ${escapeHtml(playableLoopTuning.definitionAuthoring.validation.diagnosticCount)} diagnostics</dd>
            <dt>fields</dt><dd class="chips">${authoringFields}</dd>
          </dl>
        </section>
        <section>
          <h2>Encounter Runtime</h2>
          <dl>
            <dt>mode</dt><dd data-encounter-tuning="live-mode">${escapeHtml(playableLoopTuning.liveInspection.studioMode)}</dd>
            <dt>status</dt><dd data-encounter-tuning="encounter-status">${escapeHtml(playableLoopTuning.liveInspection.encounter.status)}</dd>
            <dt>counts</dt><dd>${escapeHtml(playableLoopTuning.liveInspection.encounter.activeEnemyCount)} active · ${escapeHtml(playableLoopTuning.liveInspection.encounter.defeatedEnemyCount)} defeated</dd>
            <dt>spawns</dt><dd class="chips" data-encounter-tuning="spawn-summary">${encounterSpawns}</dd>
            <dt>transition</dt><dd data-encounter-tuning="transition-receipt">${escapeHtml(playableLoopTuning.liveInspection.encounter.lastReceipt?.action)} · ${escapeHtml(playableLoopTuning.liveInspection.encounter.lastReceipt?.status)} · ${escapeHtml(playableLoopTuning.liveInspection.encounter.lastReceipt?.beforeStatus)} -> ${escapeHtml(playableLoopTuning.liveInspection.encounter.lastReceipt?.afterStatus)}</dd>
          </dl>
        </section>
        <section>
          <h2>Combat Feedback</h2>
          <dl>
            <dt>projection</dt><dd data-encounter-tuning="combat-feedback">${escapeHtml(playableLoopTuning.liveInspection.combatFeedback.kind)}</dd>
            <dt>trace</dt><dd>${escapeHtml(playableLoopTuning.liveInspection.combatFeedback.traceResult)} · ${escapeHtml(playableLoopTuning.liveInspection.combatFeedback.markerTone)}</dd>
            <dt>notifications</dt><dd class="chips">${playableLoopTuning.liveInspection.combatFeedback.notificationTexts.map(text => `<span>${escapeHtml(text)}</span>`).join('')}</dd>
            <dt>lifecycle</dt><dd data-encounter-tuning="lifecycle">${escapeHtml(playableLoopTuning.liveInspection.lifecycle.label)} · ${escapeHtml(playableLoopTuning.liveInspection.lifecycle.enemyHealth)}</dd>
            <dt>hash</dt><dd>${escapeHtml(playableLoopTuning.liveInspection.combatFeedback.projectionHash)}</dd>
          </dl>
        </section>
      </div>
      <div class="grid" data-visual-id="studio-playable-loop-inspection">
        <section>
          <h2>Session</h2>
          <dl>
            <dt>mode</dt><dd>${escapeHtml(playableLoop.studioMode)}</dd>
            <dt>session</dt><dd>${escapeHtml(playableLoop.session.sessionId)}</dd>
            <dt>seed</dt><dd>${escapeHtml(playableLoop.session.seed)}</dd>
            <dt>tick</dt><dd>${escapeHtml(playableLoop.session.tick)}</dd>
            <dt>replay</dt><dd>${escapeHtml(playableLoop.session.replayRecordCount)} records - ${escapeHtml(playableLoop.session.lastRecordKind)}</dd>
          </dl>
        </section>
        <section>
          <h2>Generated Tunnel And Nav</h2>
          <dl>
            <dt>preset</dt><dd>${escapeHtml(playableLoop.generatedLevel.presetId)}</dd>
            <dt>output</dt><dd>${escapeHtml(playableLoop.generatedLevel.outputHash)}</dd>
            <dt>nav projection</dt><dd>${escapeHtml(playableLoop.nav.projectionHash)}</dd>
            <dt>path</dt><dd data-playable-loop="nav-path">${escapeHtml(playableLoop.nav.pathHash)}</dd>
            <dt>result</dt><dd>${escapeHtml(playableLoop.nav.outcome)} - visited ${escapeHtml(playableLoop.nav.visited)} - len ${escapeHtml(playableLoop.nav.pathLength)}</dd>
          </dl>
        </section>
        <section>
          <h2>Policy</h2>
          <dl>
            <dt>loop</dt><dd>${escapeHtml(playableLoop.policy.loopId)}</dd>
            <dt>summary</dt><dd data-playable-loop="policy-summary">${escapeHtml(playableLoop.policy.acceptedProposalCount)} accepted - ${escapeHtml(playableLoop.policy.unsupportedProposalCount)} unsupported</dd>
            <dt>movement</dt><dd>${escapeHtml(playableLoop.policy.movementReason)}</dd>
            <dt>proposals</dt><dd class="chips">${proposalKinds}</dd>
          </dl>
        </section>
        <section>
          <h2>Combat</h2>
          <dl>
            <dt>status</dt><dd>${escapeHtml(playableLoop.combat.status)}</dd>
            <dt>outcome</dt><dd>${escapeHtml(playableLoop.combat.outcomeKind)}</dd>
            <dt>health</dt><dd data-playable-loop="combat-health">Health ${escapeHtml(health?.current)}/${escapeHtml(health?.max)} ${health?.dead === true ? 'defeated' : 'active'}</dd>
            <dt>hash</dt><dd>${escapeHtml(playableLoop.combat.healthHash)}</dd>
          </dl>
        </section>
        <section>
          <h2>Lifecycle</h2>
          <dl>
            <dt>status</dt><dd data-playable-loop="lifecycle">${escapeHtml(playableLoop.lifecycle.label)}</dd>
            <dt>outcome</dt><dd>${escapeHtml(playableLoop.lifecycle.outcomeKind)}</dd>
            <dt>events</dt><dd class="chips">${lifecycleEvents}</dd>
            <dt>after restart</dt><dd>${escapeHtml(restartLoop.lifecycle.label)} - ${escapeHtml(restartLoop.lifecycle.enemyHealth)}</dd>
          </dl>
        </section>
        <section>
          <h2>Restart</h2>
          <dl>
            <dt>intent</dt><dd>${escapeHtml(playableLoop.restart.commandId)}</dd>
            <dt>receipt</dt><dd data-playable-loop="restart-status">${escapeHtml(restartLoop.restart.lastReceipt?.status)} - ${escapeHtml(restartLoop.restart.lastReceipt?.statusBefore)} -> ${escapeHtml(restartLoop.restart.lastReceipt?.statusAfter)}</dd>
            <dt>reset</dt><dd>${escapeHtml(restartLoop.restart.lastReceipt?.resetHash)}</dd>
            <dt>non-claims</dt><dd class="chips">${playableLoop.nonClaims.map(claim => `<span>${escapeHtml(claim)}</span>`).join('')}</dd>
          </dl>
        </section>
      </div>
    </main>
  </body>
</html>`;

await mkdir(outDir, { recursive: true });
await writeFile(htmlPath, html);
run('/usr/bin/chromium', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1400,900',
  `--screenshot=${screenshotPath}`,
  pathToFileURL(htmlPath).toString(),
]);
const dumpedDom = run('/usr/bin/chromium', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1400,900',
  '--dump-dom',
  pathToFileURL(htmlPath).toString(),
]);
await writeFile(domPath, dumpedDom);

assert.equal(dumpedDom.includes('studio-playable-loop-inspection-browser-proof'), true);
assert.equal(dumpedDom.includes('studio-playable-loop-inspection.v0'), true);
assert.equal(dumpedDom.includes('studio-encounter-tuning-inspection'), true);
assert.equal(dumpedDom.includes('fps_gameplay_preset_readout.v0'), true);
assert.equal(dumpedDom.includes('fps_gameplay_preset_catalog_readout.v0'), true);
assert.equal(dumpedDom.includes('combat_feedback_projection.v0'), true);
assert.equal(dumpedDom.includes('sync_lifecycle'), true);
assert.equal(dumpedDom.includes('active -&gt; cleared') || dumpedDom.includes('active -> cleared'), true);
assert.equal(dumpedDom.includes('generated_tunnel_enemy_policy_loop.v0'), true);
assert.equal(dumpedDom.includes('movement_authority_not_wired'), true);
assert.equal(dumpedDom.includes('Health 0/40 defeated'), true);
assert.equal(dumpedDom.includes('Enemy defeated'), true);
assert.equal(dumpedDom.includes('accepted - won -&gt; in_progress') || dumpedDom.includes('accepted - won -> in_progress'), true);
assert.equal(existsSync(screenshotPath), true);
assert.ok(statSync(screenshotPath).size > 1024, 'browser screenshot must be non-empty');

const artifact = {
  artifactKind: 'studio_playable_loop_inspection_browser_proof',
  artifactVersion: 'studio-playable-loop-inspection-browser-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  readout,
  browser: {
    executable: '/usr/bin/chromium',
    htmlPath: 'artifacts/playable-loop-inspection/latest/index.html',
    domPath: 'artifacts/playable-loop-inspection/latest/dom.html',
    screenshotPath: 'artifacts/playable-loop-inspection/latest/screenshot.png',
    screenshotHash: sha256Buffer(readFileSync(screenshotPath)),
    domHash: sha256Buffer(Buffer.from(dumpedDom)),
  },
  artifactHash: sha256(readout),
};

await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(artifactPath);
