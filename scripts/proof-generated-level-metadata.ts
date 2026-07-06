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
import { createMockRuntimeSession, type WorldLoadRequest } from '@asha/runtime-bridge/reference';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/generated-level-metadata/latest');
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
  workspaceHash: 'studio-game-workspace-proof-generated-level',
};

const projectBundle: WorldLoadRequest = {
  bundleSchemaVersion: 1,
  protocolVersion: 1,
  sceneId: 1001,
};

const facade = createMockRuntimeSession();
const state = facade.initialize({
  sessionId: 'runtime-session:asha-demo:generated-level-proof',
  seed: 17,
  project: {
    gameId: 'asha-demo',
    workspaceId: gameWorkspace.workspaceHash,
  },
  projectBundle,
});
const projection = facade.readProjection();
let telemetry = facade.readTelemetry();
const generatedTunnelReadout = facade.readGeneratedTunnelReadout({ presetId: 'tiny-enclosed', seed: 17 });
const navProjection = facade.readNavProjection();
const liveReadout = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace,
  runtimeSessions: null,
  state,
  projection,
  telemetry,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout,
  navProjection,
  paused: false,
});
const regenerateReceipt = facade.requestGeneratedTunnelOperation({
  operation: 'regenerate',
  presetId: 'tiny-enclosed',
  seed: 17,
});
telemetry = facade.readTelemetry();
const regenerateReadout = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace,
  runtimeSessions: null,
  state: {
    ...state,
    sequenceId: regenerateReceipt.sequenceId,
    sessionHash: regenerateReceipt.sessionHashAfter,
  },
  projection: facade.readProjection(),
  telemetry,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout,
  generatedTunnelRegenerateReceipt: regenerateReceipt,
  navProjection,
  paused: false,
});

const generatedLevel = regenerateReadout.generatedLevel;
assert.equal(generatedLevel.definitionAuthoring.validationStatus, 'valid');
assert.equal(generatedLevel.definitionAuthoring.boundary.liveRuntimeMutation, false);
assert.equal(generatedLevel.liveInspection.generator.presetId, 'tiny-enclosed');
assert.equal(generatedLevel.liveInspection.generator.outputHash, 'a9b504096397f5b4');
assert.equal(generatedLevel.liveInspection.projections.navProjectionHash, 'd1f6ac3e051d6b6e');
assert.equal(generatedLevel.liveInspection.regenerate.lastReceipt?.status, 'unsupported');

const readout = {
  readoutKind: 'studio_generated_level_metadata_browser_readout',
  readoutVersion: 'studio-generated-level-metadata-browser.v0',
  runtimeSessionId: state.identity.sessionId,
  definitionAuthoring: generatedLevel.definitionAuthoring,
  liveInspection: generatedLevel.liveInspection,
  generatedLevelHash: generatedLevel.inspectionHash,
  validations: [
    'definition_authoring_mode_is_not_live_runtime_mutation',
    'live_generated_level_metadata_comes_from_runtime_bridge_readout',
    'typed_regenerate_control_fails_closed_without_json_tunnel',
    'browser_dom_contains_structured_generated_level_readout',
  ],
  nonClaims: generatedLevel.nonClaims,
};

const markers = generatedLevel.liveInspection.spawnMarkers
  .map(marker => `<span>${escapeHtml(marker.id)} ${escapeHtml(marker.voxel.join(','))}</span>`)
  .join('');
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ASHA Studio Generated Level Metadata</title>
    <style>
      :root { color-scheme: dark; font-family: Arial, sans-serif; background: #101214; color: #e8edf0; }
      body { margin: 0; }
      main { box-sizing: border-box; display: grid; gap: 12px; min-height: 100vh; padding: 20px; }
      section { background: #151b20; border: 1px solid #33404a; padding: 12px; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 22px; }
      h2 { font-size: 15px; margin-bottom: 8px; }
      dl { display: grid; gap: 4px 12px; grid-template-columns: 180px minmax(0, 1fr); margin: 0; }
      dt { color: #96a4ad; font-size: 12px; text-transform: uppercase; }
      dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
      .grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .claims { display: flex; flex-wrap: wrap; gap: 6px; }
      .claims span { background: #202932; border: 1px solid #43515e; font-size: 12px; padding: 4px 6px; }
    </style>
  </head>
  <body>
    <main data-visual-id="studio-generated-level-browser-proof">
      <header>
        <h1>ASHA Studio Generated Level Metadata</h1>
        <p>${escapeHtml(readout.generatedLevelHash)}</p>
      </header>
      <div class="grid">
        <section data-visual-id="studio-generated-level-authoring">
          <h2>Definition Authoring</h2>
          <dl>
            <dt>mode</dt><dd>${escapeHtml(readout.definitionAuthoring.studioMode)}</dd>
            <dt>preset</dt><dd>${escapeHtml(readout.definitionAuthoring.fields.find(field => field.field === 'presetId')?.value)}</dd>
            <dt>seed</dt><dd>${escapeHtml(readout.definitionAuthoring.fields.find(field => field.field === 'seed')?.value)}</dd>
            <dt>validation</dt><dd>${escapeHtml(readout.definitionAuthoring.validationStatus)}</dd>
            <dt>boundary</dt><dd>stored preset editing; not live runtime mutation; not runtime-to-definition export</dd>
          </dl>
        </section>
        <section data-visual-id="studio-generated-level-live">
          <h2>Live Runtime Inspection</h2>
          <dl>
            <dt>mode</dt><dd>${escapeHtml(readout.liveInspection.studioMode)}</dd>
            <dt>preset</dt><dd>${escapeHtml(readout.liveInspection.generator.presetId)}</dd>
            <dt>seed</dt><dd>${escapeHtml(readout.liveInspection.generator.seed)}</dd>
            <dt>config</dt><dd>${escapeHtml(readout.liveInspection.generator.configHash)}</dd>
            <dt>output</dt><dd>${escapeHtml(readout.liveInspection.generator.outputHash)}</dd>
            <dt>replay</dt><dd>${escapeHtml(readout.liveInspection.generator.replayHash)}</dd>
            <dt>volume</dt><dd>${escapeHtml(readout.liveInspection.volume.tunnelDims?.join('x'))} · solids ${escapeHtml(readout.liveInspection.volume.solidVoxels)}</dd>
            <dt>render</dt><dd>${escapeHtml(readout.liveInspection.projections.renderHash)}</dd>
            <dt>collision</dt><dd>${escapeHtml(readout.liveInspection.projections.collisionHash)}</dd>
            <dt>nav</dt><dd>${escapeHtml(readout.liveInspection.projections.navProjectionHash)}</dd>
            <dt>markers</dt><dd class="claims">${markers}</dd>
            <dt>regenerate</dt><dd>${escapeHtml(readout.liveInspection.regenerate.lastReceipt?.status)} · ${escapeHtml(readout.liveInspection.regenerate.lastReceipt?.reason)}</dd>
          </dl>
        </section>
      </div>
      <section>
        <h2>Non-Claims</h2>
        <p class="claims">${readout.nonClaims.map(claim => `<span>${escapeHtml(claim)}</span>`).join('')}</p>
      </section>
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
  `file://${htmlPath}`,
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

assert.equal(dumpedDom.includes('studio-generated-level-browser-proof'), true);
assert.equal(dumpedDom.includes('tiny-enclosed'), true);
assert.equal(dumpedDom.includes('a9b504096397f5b4'), true);
assert.equal(dumpedDom.includes('d1f6ac3e051d6b6e'), true);
assert.equal(dumpedDom.includes('generated_tunnel_operation_not_wired'), true);
assert.equal(existsSync(screenshotPath), true);
assert.ok(statSync(screenshotPath).size > 1024, 'browser screenshot must be non-empty');

const artifact = {
  artifactKind: 'studio_generated_level_metadata_browser_proof',
  artifactVersion: 'studio-generated-level-metadata-browser-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  readout,
  browser: {
    executable: '/usr/bin/chromium',
    htmlPath: 'artifacts/generated-level-metadata/latest/index.html',
    domPath: 'artifacts/generated-level-metadata/latest/dom.html',
    screenshotPath: 'artifacts/generated-level-metadata/latest/screenshot.png',
    screenshotHash: sha256Buffer(readFileSync(screenshotPath)),
    domHash: sha256Buffer(Buffer.from(dumpedDom)),
  },
  artifactHash: sha256(readout),
};

await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(artifactPath);
