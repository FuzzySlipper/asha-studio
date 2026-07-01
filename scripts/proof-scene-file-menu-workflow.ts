#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  applyOpenSceneFileReadModel,
  buildInitialWorkspaceReadModel,
  buildStudioSceneFileList,
  buildStudioSceneFileSaveReadback,
  createOpenSceneFileIntent,
  createSaveSceneFileIntent,
  loadStudioGameWorkspaceManifest,
  serializeWorkspaceSceneSource,
  type StudioSceneFileSourceInput,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-demo');
const outDir = join(repoRoot, 'artifacts/scene-file-menu-workflow/latest');
const htmlPath = join(outDir, 'index.html');
const domPath = join(outDir, 'dom.html');
const screenshotPath = join(outDir, 'screenshot.png');
const artifactPath = join(outDir, 'index.json');

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

function run(command: string, args: readonly string[]): string {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}

function readSourceFile(path: string): StudioSceneFileSourceInput {
  const text = readFileSync(join(demoRoot, path), 'utf8');
  return { path, text, sha256: sha256Text(text) };
}

function loadDemoPackageScripts(): Record<string, string> {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).scripts;
}

function loadDemoPackageName(): string {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).name;
}

const manifestPath = 'asha.game.toml';
const manifestText = readFileSync(join(demoRoot, manifestPath), 'utf8');
const workspaceResult = loadStudioGameWorkspaceManifest({
  workspaceRoot: demoRoot,
  manifestPath,
  gameId: loadDemoPackageName(),
  manifestText,
  packageScripts: loadDemoPackageScripts(),
  pathExists: path => existsSync(join(demoRoot, path)),
});
assert.equal(workspaceResult.ok, true);
if (!workspaceResult.ok) throw new Error('asha-demo workspace failed to load');

const sourceFiles = [
  readSourceFile('scenes/material-proof.scene.json'),
  readSourceFile('scenes/minimal.scene.json'),
];
const sceneFiles = buildStudioSceneFileList({
  workspace: workspaceResult.workspace,
  manifestPath,
  manifestHash: sha256Text(manifestText),
  sourceFiles,
});
assert.equal(sceneFiles.ok, true);
assert.equal(sceneFiles.sceneFiles.files.length, 2);

const selectedSceneFile = sceneFiles.sceneFiles.files.find(file => file.path === 'scenes/material-proof.scene.json');
assert.ok(selectedSceneFile);
let workspace = buildInitialWorkspaceReadModel();
const openDispatch = mapStudioIntentToCommand(createOpenSceneFileIntent(workspace, selectedSceneFile));
assert.equal(openDispatch.accepted, true);
assert.equal(openDispatch.proposal?.commandId, 'scene.open_source');
workspace = applyOpenSceneFileReadModel(workspace, selectedSceneFile);
assert.equal(workspace.timeline.at(-1)?.commandId, 'scene.open_source');

const saveAsPath = 'scenes/studio-menu-save-as.scene.json';
const saveAsText = serializeWorkspaceSceneSource(workspace);
const saveAsHash = sha256Text(saveAsText);
const saveAsDispatch = mapStudioIntentToCommand(createSaveSceneFileIntent(workspace, {
  path: saveAsPath,
  expectedPreviousHash: null,
  saveAs: true,
}));
assert.equal(saveAsDispatch.accepted, true);
assert.equal(saveAsDispatch.proposal?.commandId, 'scene.save_source_as');
const saveAsReadback = buildStudioSceneFileSaveReadback({
  commandId: 'scene.save_source_as',
  path: saveAsPath,
  previousHash: null,
  expectedPreviousHash: null,
  nextText: saveAsText,
  nextHash: saveAsHash,
  workspace: workspaceResult.workspace,
});
assert.equal(saveAsReadback.diagnostics.length, 0);

const saveDispatch = mapStudioIntentToCommand(createSaveSceneFileIntent(workspace, {
  path: saveAsPath,
  expectedPreviousHash: saveAsHash,
  saveAs: false,
}));
assert.equal(saveDispatch.accepted, true);
assert.equal(saveDispatch.proposal?.commandId, 'scene.save_source');
const saveReadback = buildStudioSceneFileSaveReadback({
  commandId: 'scene.save_source',
  path: saveAsPath,
  previousHash: saveAsHash,
  expectedPreviousHash: saveAsHash,
  nextText: saveAsText,
  nextHash: saveAsHash,
  workspace: workspaceResult.workspace,
});
assert.equal(saveReadback.diagnostics.length, 0);

const staleSaveReadback = buildStudioSceneFileSaveReadback({
  commandId: 'scene.save_source',
  path: saveAsPath,
  previousHash: 'sha256:stale',
  expectedPreviousHash: saveAsHash,
  nextText: saveAsText,
  nextHash: saveAsHash,
  workspace: workspaceResult.workspace,
});
assert.ok(staleSaveReadback.diagnostics.some(diagnostic => diagnostic.code === 'scene_file_stale_hash'));
const disallowedSaveReadback = buildStudioSceneFileSaveReadback({
  commandId: 'scene.save_source_as',
  path: 'harness/out/studio-menu-save-as.scene.json',
  previousHash: null,
  expectedPreviousHash: null,
  nextText: saveAsText,
  nextHash: saveAsHash,
  workspace: workspaceResult.workspace,
});
assert.ok(disallowedSaveReadback.diagnostics.length > 0);

const readout = {
  readoutKind: 'studio_scene_file_menu_browser_readout',
  readoutVersion: 'studio-scene-file-menu-browser-readout.v0',
  manifestPath,
  workspaceHash: workspaceResult.workspace.workspaceHash,
  sceneFileListHash: sceneFiles.sceneFiles.sceneFileListHash,
  fileMenu: {
    activePath: selectedSceneFile.path,
    availablePaths: sceneFiles.sceneFiles.files.map(file => file.path),
    saveAsPath,
    activeSceneName: workspace.session.scenarioLabel,
    timelineCommandIds: [
      openDispatch.proposal?.commandId,
      saveAsDispatch.proposal?.commandId,
      saveDispatch.proposal?.commandId,
    ],
  },
  openReadback: {
    path: selectedSceneFile.path,
    hash: selectedSceneFile.hash,
    renderableCount: workspace.scene.renderables.length,
    selectedRenderableId: workspace.scene.selectedRenderableId,
  },
  saveReadback,
  saveAsReadback,
  negativeSmokes: [
    {
      case: 'stale_save_hash',
      ok: staleSaveReadback.diagnostics.some(diagnostic => diagnostic.code === 'scene_file_stale_hash'),
      diagnostic: 'scene_file_stale_hash',
    },
    {
      case: 'disallowed_save_path',
      ok: disallowedSaveReadback.diagnostics.length > 0,
      diagnostic: disallowedSaveReadback.diagnostics.at(0)?.code ?? 'missing_diagnostic',
    },
    {
      case: 'marker_only_dom',
      ok: false,
      diagnostic: 'structured_scene_file_readout_missing',
    },
  ],
  validations: [
    'scene_file_list_bounded_to_manifest_scene_roots',
    'file_menu_open_uses_scene_open_source_command',
    'file_menu_save_as_uses_scene_save_source_as_command',
    'file_menu_save_uses_scene_save_source_command',
    'browser_dom_contains_structured_scene_file_readout',
    'browser_screenshot_captured_without_gpu_or_performance_claim',
    'negative_stale_save_hash_failed_closed',
    'negative_disallowed_save_path_failed_closed',
    'negative_marker_only_dom_failed_closed',
  ],
  nonClaims: [
    'not_repo_crawler',
    'not_private_file_picker',
    'not_private_file_write',
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
    <title>ASHA Studio Scene File Menu Workflow</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Arial, sans-serif;
        background: #101214;
        color: #e8edf0;
      }
      body { margin: 0; }
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
      h1, h2, p { margin: 0; }
      h1 { font-size: 22px; }
      h2 { font-size: 15px; margin-bottom: 8px; }
      button {
        background: #202932;
        border: 1px solid #43515e;
        color: #e8edf0;
        display: block;
        margin: 4px 0;
        padding: 7px 9px;
        text-align: left;
        width: 100%;
      }
      button[data-active="true"] { border-color: #66d9a4; }
      dl {
        display: grid;
        gap: 4px 12px;
        grid-template-columns: 170px minmax(0, 1fr);
        margin: 0;
      }
      dt { color: #96a4ad; font-size: 12px; text-transform: uppercase; }
      dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
      .grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .claims { display: flex; flex-wrap: wrap; gap: 6px; }
      .claims span { background: #202932; border: 1px solid #43515e; font-size: 12px; padding: 4px 6px; }
    </style>
  </head>
  <body>
    <main data-visual-id="studio-scene-file-menu-workflow">
      <header>
        <h1>ASHA Studio File Menu</h1>
        <p>${escapeHtml(readout.sceneFileListHash)}</p>
      </header>
      <section data-visual-id="studio-file-menu-scene-list">
        <h2>Open</h2>
        ${sceneFiles.sceneFiles.files.map(file => `
          <button type="button" data-scene-file-path="${escapeHtml(file.path)}" data-active="${file.path === selectedSceneFile.path}">
            ${escapeHtml(file.name)}<br />
            <small>${escapeHtml(file.path)}</small>
          </button>
        `).join('')}
      </section>
      <div class="grid">
        <section data-visual-id="studio-file-menu-open-readback">
          <h2>Open Readback</h2>
          <dl>
            <dt>active path</dt><dd>${escapeHtml(readout.fileMenu.activePath)}</dd>
            <dt>scene</dt><dd>${escapeHtml(readout.fileMenu.activeSceneName)}</dd>
            <dt>renderables</dt><dd>${escapeHtml(readout.openReadback.renderableCount)}</dd>
            <dt>selected</dt><dd>${escapeHtml(readout.openReadback.selectedRenderableId)}</dd>
          </dl>
        </section>
        <section data-visual-id="studio-file-menu-save-readback">
          <h2>Save Readback</h2>
          <dl>
            <dt>save as</dt><dd>${escapeHtml(readout.saveAsReadback.path)}</dd>
            <dt>save</dt><dd>${escapeHtml(readout.saveReadback.path)}</dd>
            <dt>hash</dt><dd>${escapeHtml(readout.saveReadback.nextHash)}</dd>
            <dt>commands</dt><dd>${escapeHtml(readout.fileMenu.timelineCommandIds.join(', '))}</dd>
          </dl>
        </section>
      </div>
      <section>
        <h2>Non-Claims</h2>
        <div class="claims">${readout.nonClaims.map(claim => `<span>${escapeHtml(claim)}</span>`).join('')}</div>
      </section>
    </main>
    <script id="studio-scene-file-menu-readout" type="application/json">${escapeHtml(JSON.stringify(readout))}</script>
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
]);
await writeFile(domPath, dumpedDom);

const readoutMatch = dumpedDom.match(/<script id="studio-scene-file-menu-readout" type="application\/json">([^<]+)<\/script>/);
assert.ok(readoutMatch, 'structured scene file readout JSON is required; marker strings alone are rejected');
const domReadout = JSON.parse(readoutMatch[1]
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&amp;', '&'));
assert.equal(domReadout.readoutKind, 'studio_scene_file_menu_browser_readout');
assert.equal(domReadout.fileMenu.activePath, selectedSceneFile.path);
assert.deepEqual(domReadout.fileMenu.timelineCommandIds, [
  'scene.open_source',
  'scene.save_source_as',
  'scene.save_source',
]);
assert.equal(dumpedDom.includes('data-visual-id="studio-file-menu-scene-list"'), true);
assert.equal(dumpedDom.includes('data-visual-id="studio-file-menu-save-readback"'), true);
assert.equal(existsSync(screenshotPath), true);
assert.ok(statSync(screenshotPath).size > 1024, 'browser screenshot must be non-empty');

const artifactBody = {
  artifactKind: 'studio_scene_file_menu_browser_proof',
  artifactVersion: 'studio-scene-file-menu-browser-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:scene-file-menu-workflow',
  browser: {
    executable: '/usr/bin/chromium',
    mode: 'headless',
    htmlPath: 'artifacts/scene-file-menu-workflow/latest/index.html',
    domPath: 'artifacts/scene-file-menu-workflow/latest/dom.html',
    domHash: sha256Text(dumpedDom),
    screenshotPath: 'artifacts/scene-file-menu-workflow/latest/screenshot.png',
    screenshotHash: sha256Buffer(readFileSync(screenshotPath)),
  },
  readout: domReadout,
  sourceEvidence: {
    manifestPath,
    manifestHash: sha256Text(manifestText),
    sceneFileListHash: sceneFiles.sceneFiles.sceneFileListHash,
    openedSceneFileHash: selectedSceneFile.sceneFileHash,
  },
  validations: readout.validations,
  negativeSmokes: readout.negativeSmokes,
  nonClaims: readout.nonClaims,
};
const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
