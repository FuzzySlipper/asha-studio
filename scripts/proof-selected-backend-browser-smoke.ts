#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const commandProofPath = join(repoRoot, 'artifacts/selected-backend-command-proof/latest/index.json');
const outDir = join(repoRoot, 'artifacts/selected-backend-browser-smoke/latest');
const htmlPath = join(outDir, 'index.html');
const domPath = join(outDir, 'dom.html');
const screenshotPath = join(outDir, 'screenshot.png');
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

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'));
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

run('pnpm', ['run', 'evidence', '--', 'selected-backend-command']);
assert.equal(existsSync(commandProofPath), true, 'selected backend command proof must exist');

const commandProof = readJson(commandProofPath);
const activeSession = commandProof.runtimeSessions.sessions.find(
  (session: any) => session.sessionId === commandProof.runtimeSessions.activeSessionId,
);
const accepted = commandProof.commandProposals.find((proposal: any) => proposal.status === 'accepted');
const rejected = commandProof.commandProposals.find((proposal: any) => proposal.status === 'rejected');
assert.ok(activeSession, 'active runtime session required');
assert.ok(accepted, 'accepted command proposal required');
assert.ok(rejected, 'rejected command proposal required');

const readout = {
  readoutKind: 'studio_live_backend_browser_smoke_readout',
  readoutVersion: 'studio-live-backend-browser-smoke-readout.v0',
  sourceArtifactPath: 'artifacts/selected-backend-command-proof/latest/index.json',
  sourceArtifactHash: commandProof.artifactHash,
  backend: commandProof.backend,
  runtimeSession: {
    sessionId: activeSession.sessionId,
    sessionType: activeSession.sessionType,
    status: activeSession.status,
    runtimeMode: activeSession.runtimeMode,
    backendMode: activeSession.backendMode,
    backendCompatibilityState: activeSession.backendCompatibilityState,
    attachStatus: activeSession.attachStatus,
    evidenceRefs: activeSession.evidenceRefs,
  },
  commandResults: commandProof.commandProposals.map((proposal: any) => ({
    sequenceId: proposal.sequenceId,
    status: proposal.status,
    backendMode: proposal.backendMode,
    accepted: proposal.result.accepted,
    rejected: proposal.result.rejected,
    authorityHashBefore: proposal.authorityHashBefore,
    authorityHashAfter: proposal.authorityHashAfter,
    rejectionReason: proposal.rejectionReason,
    proposalHash: proposal.proposalHash,
  })),
  evidenceRefs: commandProof.evidenceRefs,
  replayRef: commandProof.replayRef,
  validations: [
    'browser_dom_contains_structured_backend_readout',
    'browser_dom_runtime_session_matches_live_backend_proof',
    'browser_dom_command_results_match_live_backend_proof',
    'marker_strings_without_json_readout_rejected',
    'screenshot_captured_without_gpu_or_performance_claim',
  ],
  nonClaims: [
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
    'not_agora_compositor_evidence',
    'not_publish_artifact',
  ],
};

assert.equal(readout.backend.backendMode, 'native');
assert.equal(readout.runtimeSession.status, 'attached');
assert.equal(readout.runtimeSession.attachStatus, 'attached');
assert.equal(readout.runtimeSession.backendMode, 'native');
assert.equal(readout.runtimeSession.backendCompatibilityState, 'compatible');
assert.notEqual(accepted.authorityHashBefore, accepted.authorityHashAfter);
assert.equal(rejected.authorityHashBefore, rejected.authorityHashAfter);
assert.ok(readout.evidenceRefs.length > 0, 'evidence refs required');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ASHA Studio Live Backend Browser Smoke</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Arial, sans-serif;
        background: #101214;
        color: #e8edf0;
      }
      body {
        margin: 0;
      }
      main {
        box-sizing: border-box;
        display: grid;
        gap: 12px;
        min-height: 100vh;
        padding: 20px;
      }
      section {
        background: #151b20;
        border: 1px solid #33404a;
        padding: 12px;
      }
      h1, h2, p {
        margin: 0;
      }
      h1 {
        font-size: 22px;
      }
      h2 {
        font-size: 15px;
        margin-bottom: 8px;
      }
      dl {
        display: grid;
        gap: 4px 12px;
        grid-template-columns: 170px minmax(0, 1fr);
        margin: 0;
      }
      dt {
        color: #96a4ad;
        font-size: 12px;
        text-transform: uppercase;
      }
      dd {
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .proposal {
        border-left: 3px solid #61d394;
      }
      .proposal[data-status="rejected"] {
        border-left-color: #e6b35a;
      }
      .claims {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .claims span {
        background: #202932;
        border: 1px solid #43515e;
        font-size: 12px;
        padding: 4px 6px;
      }
    </style>
  </head>
  <body>
    <main data-visual-id="studio-live-backend-browser-smoke">
      <header>
        <h1>ASHA Studio Live Backend Operation</h1>
        <p>${escapeHtml(readout.sourceArtifactHash)}</p>
      </header>
      <section data-visual-id="studio-runtime-session-panel" data-runtime-backend-mode="${escapeHtml(readout.runtimeSession.backendMode)}" data-runtime-backend-state="${escapeHtml(readout.runtimeSession.backendCompatibilityState)}">
        <h2>Runtime Session</h2>
        <dl>
          <dt>status</dt><dd data-readout-field="runtime.status">${escapeHtml(readout.runtimeSession.status)}</dd>
          <dt>attach</dt><dd data-readout-field="runtime.attachStatus">${escapeHtml(readout.runtimeSession.attachStatus)}</dd>
          <dt>runtime mode</dt><dd data-readout-field="runtime.runtimeMode">${escapeHtml(readout.runtimeSession.runtimeMode)}</dd>
          <dt>backend mode</dt><dd data-readout-field="runtime.backendMode">${escapeHtml(readout.runtimeSession.backendMode)}</dd>
          <dt>compatibility</dt><dd data-readout-field="runtime.backendCompatibilityState">${escapeHtml(readout.runtimeSession.backendCompatibilityState)}</dd>
          <dt>session</dt><dd>${escapeHtml(readout.runtimeSession.sessionId)}</dd>
        </dl>
      </section>
      <section data-visual-id="studio-command-proposal-panel">
        <h2>Command Proposals</h2>
        <div class="grid">
          ${readout.commandResults.map((proposal: any) => `
            <section class="proposal" data-command-proposal-sequence="${escapeHtml(proposal.sequenceId)}" data-status="${escapeHtml(proposal.status)}">
              <h2>${escapeHtml(proposal.sequenceId)} ${escapeHtml(proposal.status)}</h2>
              <dl>
                <dt>backend</dt><dd>${escapeHtml(proposal.backendMode)}</dd>
                <dt>accepted</dt><dd>${escapeHtml(proposal.accepted)}</dd>
                <dt>rejected</dt><dd>${escapeHtml(proposal.rejected)}</dd>
                <dt>before</dt><dd>${escapeHtml(proposal.authorityHashBefore)}</dd>
                <dt>after</dt><dd>${escapeHtml(proposal.authorityHashAfter)}</dd>
                <dt>reason</dt><dd>${escapeHtml(proposal.rejectionReason ?? 'none')}</dd>
              </dl>
            </section>
          `).join('')}
        </div>
      </section>
      <section data-visual-id="studio-backend-evidence-refs">
        <h2>Evidence Refs</h2>
        <dl>
          <dt>evidence</dt><dd>${escapeHtml(readout.evidenceRefs[0]?.path ?? 'missing')}</dd>
          <dt>evidence hash</dt><dd>${escapeHtml(readout.evidenceRefs[0]?.sha256 ?? 'missing')}</dd>
          <dt>replay</dt><dd>${escapeHtml(readout.replayRef.path)}</dd>
          <dt>replay hash</dt><dd>${escapeHtml(readout.replayRef.sha256)}</dd>
        </dl>
      </section>
      <section>
        <h2>Non-Claims</h2>
        <div class="claims">
          ${readout.nonClaims.map(claim => `<span>${escapeHtml(claim)}</span>`).join('')}
        </div>
      </section>
    </main>
    <script id="studio-live-backend-readout" type="application/json">${escapeHtml(JSON.stringify(readout))}</script>
  </body>
</html>
`;

await mkdir(outDir, { recursive: true });
await writeFile(htmlPath, html);

const chromeArgs = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1366,900',
  `--screenshot=${screenshotPath}`,
  pathToFileURL(htmlPath).href,
];
run('/usr/bin/chromium', chromeArgs);
const dumpedDom = run('/usr/bin/chromium', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--dump-dom',
  pathToFileURL(htmlPath).href,
]);
await writeFile(domPath, dumpedDom);

const readoutMatch = dumpedDom.match(/<script id="studio-live-backend-readout" type="application\/json">([^<]+)<\/script>/);
assert.ok(readoutMatch, 'structured readout JSON is required; marker strings alone are rejected');
const domReadout = JSON.parse(readoutMatch[1]
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&amp;', '&'));
assert.equal(domReadout.readoutKind, 'studio_live_backend_browser_smoke_readout');
assert.equal(domReadout.backend.backendMode, 'native');
assert.equal(domReadout.runtimeSession.backendCompatibilityState, 'compatible');
assert.equal(domReadout.runtimeSession.attachStatus, 'attached');
assert.equal(domReadout.commandResults.find((proposal: any) => proposal.status === 'accepted').authorityHashBefore !== domReadout.commandResults.find((proposal: any) => proposal.status === 'accepted').authorityHashAfter, true);
assert.equal(domReadout.commandResults.find((proposal: any) => proposal.status === 'rejected').authorityHashBefore, domReadout.commandResults.find((proposal: any) => proposal.status === 'rejected').authorityHashAfter);
assert.ok(domReadout.evidenceRefs.length > 0, 'browser smoke requires real evidence refs');
assert.equal(dumpedDom.includes('data-visual-id="studio-runtime-session-panel"'), true);
assert.equal(dumpedDom.includes('data-visual-id="studio-command-proposal-panel"'), true);
assert.equal(existsSync(screenshotPath), true);
assert.ok(statSync(screenshotPath).size > 1024, 'browser screenshot must be non-empty');

const browserSmokeArtifact = {
  artifactKind: 'studio_live_backend_browser_smoke',
  artifactVersion: 'studio-live-backend-browser-smoke.v0',
  command: 'pnpm run evidence -- selected-backend-browser-smoke',
  generatedAt: 'deterministic-as-structure-only',
  sourceArtifact: {
    path: 'artifacts/selected-backend-command-proof/latest/index.json',
    hash: commandProof.artifactHash,
  },
  browser: {
    executable: '/usr/bin/chromium',
    mode: 'headless',
    domPath: 'artifacts/selected-backend-browser-smoke/latest/dom.html',
    domHash: sha256Buffer(Buffer.from(dumpedDom)),
    screenshotPath: 'artifacts/selected-backend-browser-smoke/latest/screenshot.png',
    screenshotHash: sha256Buffer(readFileSync(screenshotPath)),
  },
  readout: domReadout,
  aggregateRef: {
    expectedV2AggregateArtifactPath: 'artifacts/v2-runtime-proof/latest/index.json',
    artifactPath: 'artifacts/selected-backend-browser-smoke/latest/index.json',
  },
  validations: readout.validations,
  nonClaims: readout.nonClaims,
};
const artifactWithHash = {
  ...browserSmokeArtifact,
  artifactHash: sha256(browserSmokeArtifact),
};
await writeFile(artifactPath, `${JSON.stringify(artifactWithHash, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
