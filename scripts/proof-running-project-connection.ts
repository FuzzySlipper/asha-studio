#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildStudioRunningProjectDiscovery,
  type StudioRuntimeSessionListReadModel,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/running-project-connection/latest');
const htmlPath = join(outDir, 'index.html');
const domPath = join(outDir, 'dom.html');
const screenshotPath = join(outDir, 'screenshot.png');
const artifactPath = join(outDir, 'index.json');
const attachPath = join(repoRoot, 'artifacts/selected-backend-attach-proof/latest/index.json');

function sha256Buffer(buffer: Buffer): string {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function sha256Text(text: string): string {
  return sha256Buffer(Buffer.from(text));
}

function sha256Json(value: unknown): string {
  return sha256Text(JSON.stringify(value));
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function run(command: string, args: readonly string[]): {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
} {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 180000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return { command: [command, ...args].join(' '), stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

const attachRun = run('pnpm', ['run', 'evidence', '--', 'selected-backend-attach']);
const boundaryRun = run('pnpm', ['run', 'check:boundaries']);
assert.equal(existsSync(attachPath), true);
const attachText = readFileSync(attachPath, 'utf8');
const attachArtifact = JSON.parse(attachText) as {
  readonly artifactKind: string;
  readonly artifactHash: string;
  readonly workspace: { readonly gameId: string; readonly attachEndpoint: string; readonly workspaceHash: string };
  readonly runtimeSessions: StudioRuntimeSessionListReadModel;
};
assert.equal(attachArtifact.artifactKind, 'studio_selected_backend_attach_proof');

const discovery = buildStudioRunningProjectDiscovery({
  workspace: {
    workspaceVersion: 'studio-game-workspace.v0',
    workspaceRoot: '../asha-testing',
    manifestPath: 'asha.game.toml',
    gameId: attachArtifact.workspace.gameId,
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
        devCommand: 'npm run dev',
        devtoolsEndpoint: attachArtifact.workspace.attachEndpoint,
        wasmOrNativeEntry: 'harness/conformance/fixtures/minimal-world.json',
        backendMode: 'native',
        backendProfile: 'native.napi.launcher.v1',
        backendProofRefs: ['proof:dev-authority-smoke'],
      },
      studio: {
        workspaceMode: true,
        attachEnabled: true,
        allowedSourceWrites: ['scenes', 'assets', 'packages/game-catalogs', 'packages/game-policy'],
      },
      publish: {
        command: 'npm run publish:artifact',
        artifactDir: 'harness/out',
        verifyCommand: 'npm run conformance',
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
    attachEndpoint: attachArtifact.workspace.attachEndpoint,
    devCommand: 'npm run dev',
    runtimeEntry: 'harness/conformance/fixtures/minimal-world.json',
    publishCommand: 'npm run publish:artifact',
    publishVerifyCommand: 'npm run conformance',
    allowedSourceWrites: ['scenes', 'assets', 'packages/game-catalogs', 'packages/game-policy'],
    diagnostics: [],
    workspaceHash: attachArtifact.workspace.workspaceHash,
  },
  runtimeSessions: attachArtifact.runtimeSessions,
});
assert.equal(discovery.canDisconnect, true);
assert.equal(discovery.sessions.at(0)?.status, 'attached');

const missingWorkspace = buildStudioRunningProjectDiscovery({
  workspace: null,
  runtimeSessions: null,
});
const staleLive = buildStudioRunningProjectDiscovery({
  workspace: null,
  runtimeSessions: {
    ...attachArtifact.runtimeSessions,
    sessions: attachArtifact.runtimeSessions.sessions.map((session, index) => index === 0
      ? { ...session, liveHash: null, projection: null }
      : session),
  },
});
const privateTransport = buildStudioRunningProjectDiscovery({
  workspace: null,
  runtimeSessions: attachArtifact.runtimeSessions,
  attemptedPrivateTransport: true,
});
assert.ok(missingWorkspace.diagnostics.some(diagnostic => diagnostic.code === 'running_project_missing_workspace'));
assert.ok(staleLive.diagnostics.some(diagnostic => diagnostic.code === 'running_project_stale_live_readback'));
assert.ok(privateTransport.diagnostics.some(diagnostic => diagnostic.code === 'running_project_private_transport'));

const readout = {
  readoutKind: 'studio_running_project_connection_browser_readout',
  readoutVersion: 'studio-running-project-connection-browser-readout.v0',
  sourceArtifactPath: 'artifacts/selected-backend-attach-proof/latest/index.json',
  sourceArtifactHash: attachArtifact.artifactHash,
  discovery,
  validations: [
    'selected_backend_attach_child_passed',
    'running_project_discovery_connected',
    'project_menu_connect_refresh_disconnect_commands_present',
    'browser_dom_contains_structured_running_project_readout',
    'negative_missing_workspace_failed_closed',
    'negative_stale_live_readback_failed_closed',
    'negative_private_transport_failed_closed',
    'boundary_guard_passed',
  ],
  nonClaims: [
    'not_network_scan',
    'not_private_transport',
    'not_runtime_authority',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
    'not_agora_compositor_evidence',
  ],
};

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ASHA Studio Running Project Connection</title>
    <style>
      :root { color-scheme: dark; font-family: Arial, sans-serif; background: #101214; color: #e8edf0; }
      body { margin: 0; }
      main { box-sizing: border-box; display: grid; gap: 12px; min-height: 100vh; padding: 20px; }
      section, article { background: #151b20; border: 1px solid #33404a; padding: 12px; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 22px; }
      h2 { font-size: 15px; margin-bottom: 8px; }
      dl { display: grid; gap: 4px 12px; grid-template-columns: 170px minmax(0, 1fr); margin: 0; }
      dt { color: #96a4ad; font-size: 12px; text-transform: uppercase; }
      dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
      .grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .claims { display: flex; flex-wrap: wrap; gap: 6px; }
      .claims span { background: #202932; border: 1px solid #43515e; font-size: 12px; padding: 4px 6px; }
    </style>
  </head>
  <body>
    <main data-visual-id="studio-running-project-connection-proof">
      <header>
        <h1>ASHA Studio Running Project</h1>
        <p>${escapeHtml(readout.sourceArtifactHash)}</p>
      </header>
      <section data-visual-id="studio-running-project-picker">
        <h2>Project Menu</h2>
        <dl>
          <dt>endpoint</dt><dd>${escapeHtml(discovery.endpoint)}</dd>
          <dt>active</dt><dd>${escapeHtml(discovery.activeSessionId)}</dd>
          <dt>connect</dt><dd>${escapeHtml(discovery.commandIds.connect)}</dd>
          <dt>refresh</dt><dd>${escapeHtml(discovery.commandIds.refresh)}</dd>
          <dt>disconnect</dt><dd>${escapeHtml(discovery.commandIds.disconnect)}</dd>
        </dl>
      </section>
      <div class="grid">
        ${discovery.sessions.map(session => `
          <article data-running-session-id="${escapeHtml(session.sessionId)}" data-running-session-status="${escapeHtml(session.status)}">
            <h2>${escapeHtml(session.sessionType)} ${escapeHtml(session.status)}</h2>
            <dl>
              <dt>backend</dt><dd>${escapeHtml(session.backendMode)}</dd>
              <dt>compatibility</dt><dd>${escapeHtml(session.backendCompatibilityState)}</dd>
              <dt>attach</dt><dd>${escapeHtml(session.attachStatus)}</dd>
              <dt>live</dt><dd>${escapeHtml(session.liveHash)}</dd>
              <dt>world</dt><dd>${escapeHtml(session.worldHash)}</dd>
            </dl>
          </article>
        `).join('')}
      </div>
      <section>
        <h2>Non-Claims</h2>
        <div class="claims">${readout.nonClaims.map(claim => `<span>${escapeHtml(claim)}</span>`).join('')}</div>
      </section>
    </main>
    <script id="studio-running-project-readout" type="application/json">${escapeHtml(JSON.stringify(readout))}</script>
  </body>
</html>
`;

await mkdir(outDir, { recursive: true });
await writeFile(htmlPath, html);
run('/usr/bin/chromium', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1366,900',
  `--screenshot=${screenshotPath}`,
  pathToFileURL(htmlPath).href,
]);
const dumpedDom = run('/usr/bin/chromium', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--dump-dom',
  pathToFileURL(htmlPath).href,
]).stdout;
await writeFile(domPath, dumpedDom);
const readoutMatch = dumpedDom.match(/<script id="studio-running-project-readout" type="application\/json">([^<]+)<\/script>/);
assert.ok(readoutMatch, 'structured running project readout JSON is required; marker strings alone are rejected');
const domReadout = JSON.parse(readoutMatch[1]
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&amp;', '&'));
assert.equal(domReadout.readoutKind, 'studio_running_project_connection_browser_readout');
assert.equal(domReadout.discovery.canDisconnect, true);
assert.equal(domReadout.discovery.sessions[0].status, 'attached');
assert.equal(dumpedDom.includes('data-visual-id="studio-running-project-picker"'), true);
assert.equal(existsSync(screenshotPath), true);
assert.ok(statSync(screenshotPath).size > 1024, 'browser screenshot must be non-empty');

const artifactBody = {
  artifactKind: 'studio_running_project_connection_browser_proof',
  artifactVersion: 'studio-running-project-connection-browser-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- running-project-connection',
  commandOutputs: [attachRun, boundaryRun],
  browser: {
    executable: '/usr/bin/chromium',
    mode: 'headless',
    htmlPath: 'artifacts/running-project-connection/latest/index.html',
    domPath: 'artifacts/running-project-connection/latest/dom.html',
    domHash: sha256Text(dumpedDom),
    screenshotPath: 'artifacts/running-project-connection/latest/screenshot.png',
    screenshotHash: sha256Buffer(readFileSync(screenshotPath)),
  },
  readout: domReadout,
  sourceArtifacts: [{
    kind: attachArtifact.artifactKind,
    path: 'artifacts/selected-backend-attach-proof/latest/index.json',
    sha256: sha256Text(attachText),
    hash: attachArtifact.artifactHash,
  }],
  negativeSmokes: [
    { case: 'missing_workspace', ok: missingWorkspace.diagnostics.some(diagnostic => diagnostic.code === 'running_project_missing_workspace'), diagnostics: missingWorkspace.diagnostics },
    { case: 'stale_live_readback', ok: staleLive.diagnostics.some(diagnostic => diagnostic.code === 'running_project_stale_live_readback'), diagnostics: staleLive.diagnostics },
    { case: 'private_transport', ok: privateTransport.diagnostics.some(diagnostic => diagnostic.code === 'running_project_private_transport'), diagnostics: privateTransport.diagnostics },
  ],
  validations: readout.validations,
  nonClaims: readout.nonClaims,
};
const artifact = { ...artifactBody, artifactHash: sha256Json(artifactBody) };
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
