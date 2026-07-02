#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  applyStudioCatalogAuthoringOperation,
  buildStudioCatalogWorkflowReadModel,
  loadStudioGameWorkspaceManifest,
  studioCatalogAuthoringBaseHash,
  type StudioCatalogSourceEvidenceInput,
} from '@asha-studio/domain';
import type { AshaGameAssetCatalog, AshaGameAssetCatalogEntry } from '@asha/game-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-testing');
const outDir = join(repoRoot, 'artifacts/catalog-workflow-m3/latest');
const htmlPath = join(outDir, 'index.html');
const domPath = join(outDir, 'dom.html');
const screenshotPath = join(outDir, 'screenshot.png');
const artifactPath = join(outDir, 'index.json');
const manifestPath = 'asha.game.toml';
const catalogPath = 'packages/game-catalogs/catalog.json';

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

function loadDemoPackageScripts(): Record<string, string> {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).scripts;
}

function loadDemoPackageName(): string {
  return JSON.parse(readFileSync(join(demoRoot, 'package.json'), 'utf8')).name;
}

function readCatalog(): AshaGameAssetCatalog {
  return JSON.parse(readFileSync(join(demoRoot, catalogPath), 'utf8')) as AshaGameAssetCatalog;
}

function evidenceForCatalog(catalog: AshaGameAssetCatalog): readonly StudioCatalogSourceEvidenceInput[] {
  return catalog.entries.map(entry => {
    const absolutePath = join(demoRoot, entry.source);
    return {
      path: entry.source,
      exists: existsSync(absolutePath),
      hash: existsSync(absolutePath) ? sha256Text(readFileSync(absolutePath, 'utf8')) : null,
    };
  });
}

function run(command: string, args: readonly string[]): string {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}

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
if (!workspaceResult.ok) throw new Error('asha-testing workspace failed to load');

const catalog = readCatalog();
const sourceEvidence = evidenceForCatalog(catalog);
const workflow = buildStudioCatalogWorkflowReadModel({
  workspace: workspaceResult.workspace,
  catalogPath,
  catalog,
  catalogHash: studioCatalogAuthoringBaseHash(catalog),
  selectedAssetId: catalog.entries.at(0)?.id ?? null,
  sourceEvidence,
  referencedRenderableIds: { 'mesh.demo-cube': ['model-preview-crate'] },
});
assert.equal(workflow.workflowVersion, 'studio-catalog-workflow.v0');
assert.equal(workflow.commandIds.linkAsset, 'catalog.link_asset');

const authoredEntry: AshaGameAssetCatalogEntry = {
  id: 'material.studio-m3-linked',
  kind: 'material',
  source: 'assets/materials/demo-copper.material.json',
  importProfile: 'inline-material.v0',
  importMetadata: {
    sourceHash: sourceEvidence.find(evidence => evidence.path === 'assets/materials/demo-copper.material.json')?.hash ?? 'sha256:missing',
    cacheKey: 'dev-cache/material/material.studio-m3-linked',
    generatedArtifactVersion: 'asset-import.v1',
  },
  dependencies: ['texture.demo-checker'],
  publish: {
    include: false,
    outputKey: 'materials/studio-m3-linked.material.json',
  },
  diagnostics: {
    owner: 'asha-studio',
    notes: ['catalog workflow M3 proof entry'],
  },
};
const linked = applyStudioCatalogAuthoringOperation(catalog, {
  actor: 'gui',
  expectedBaseHash: studioCatalogAuthoringBaseHash(catalog),
  operation: { kind: 'create_catalog_entry', entry: authoredEntry },
});
assert.equal(linked.ok, true);
const linkedWorkflow = buildStudioCatalogWorkflowReadModel({
  workspace: workspaceResult.workspace,
  catalogPath,
  catalog: linked.catalog,
  catalogHash: linked.catalogHash,
  selectedAssetId: authoredEntry.id,
  sourceEvidence: evidenceForCatalog(linked.catalog),
});
assert.equal(linkedWorkflow.selectedAsset?.assetId, authoredEntry.id);

const stale = applyStudioCatalogAuthoringOperation(catalog, {
  actor: 'gui',
  expectedBaseHash: 'studio-catalog-authoring-base-stale',
  operation: { kind: 'remove_catalog_entry', assetId: catalog.entries[0]?.id ?? 'missing' },
});
const missingSourceWorkflow = buildStudioCatalogWorkflowReadModel({
  workspace: workspaceResult.workspace,
  catalogPath,
  catalog,
  catalogHash: studioCatalogAuthoringBaseHash(catalog),
  sourceEvidence: sourceEvidence.map(evidence =>
    evidence.path === catalog.entries[0]?.source ? { ...evidence, exists: false, hash: null } : evidence,
  ),
});
const privatePathWorkflow = buildStudioCatalogWorkflowReadModel({
  workspace: workspaceResult.workspace,
  catalogPath: '../outside/catalog.json',
  catalog,
  catalogHash: studioCatalogAuthoringBaseHash(catalog),
  sourceEvidence,
});

const readout = {
  readoutKind: 'studio_catalog_workflow_browser_readout',
  readoutVersion: 'studio-catalog-workflow-browser-readout.v0',
  workflow,
  linkedWorkflow: {
    selectedAssetId: linkedWorkflow.selectedAssetId,
    entryCount: linkedWorkflow.entryCount,
    selectedPreviewHash: linkedWorkflow.selectedAsset?.previewHash ?? null,
  },
  operation: linked.operation,
  sourceReadback: sourceEvidence,
  negativeSmokes: [
    {
      case: 'stale_catalog_edit',
      ok: stale.diagnostics.some(diagnostic => diagnostic.code === 'stale_catalog_source_hash'),
      diagnostics: stale.diagnostics,
    },
    {
      case: 'missing_source_evidence',
      ok: missingSourceWorkflow.diagnostics.some(diagnostic => diagnostic.code === 'catalog_workflow_source_missing'),
      diagnostics: missingSourceWorkflow.diagnostics,
    },
    {
      case: 'private_catalog_path',
      ok: privatePathWorkflow.diagnostics.some(diagnostic => diagnostic.code === 'catalog_workflow_path_not_allowed'),
      diagnostics: privatePathWorkflow.diagnostics,
    },
  ],
};

await mkdir(outDir, { recursive: true });
await writeFile(htmlPath, `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>ASHA Studio Catalog Workflow M3 Proof</title>
    <style>
      body { background: #101314; color: #f1f5f4; font: 13px system-ui, sans-serif; margin: 0; }
      main { display: grid; gap: 12px; padding: 18px; }
      section { background: #202628; border: 1px solid #3c474b; border-radius: 6px; padding: 12px; }
      .commands, .assets, .nonclaims { display: flex; flex-wrap: wrap; gap: 8px; }
      button, .pill { background: #2b3336; border: 1px solid #3c474b; border-radius: 5px; color: #f1f5f4; padding: 6px 9px; }
      article { border: 1px solid #3c474b; border-radius: 5px; display: grid; gap: 3px; min-width: 220px; padding: 8px; }
      small { color: #a7b2b0; }
      pre { white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>
    <main data-visual-id="studio-catalog-workflow-panel">
      <section>
        <strong>Catalog</strong>
        <div>${escapeHtml(workflow.catalogPath)} · ${escapeHtml(workflow.catalogHash)}</div>
        <small>${workflow.entryCount} entries · ${workflow.workflowHash}</small>
      </section>
      <section class="commands" aria-label="Catalog workflow commands">
        ${Object.values(workflow.commandIds).map(commandId => `<button>${escapeHtml(commandId)}</button>`).join('')}
      </section>
      <section class="assets" aria-label="Catalog assets">
        ${workflow.assets.map(asset => `
          <article data-catalog-asset-id="${escapeHtml(asset.assetId)}" data-catalog-source-exists="${asset.sourceExists}">
            <strong>${escapeHtml(asset.assetId)}</strong>
            <span>${escapeHtml(asset.kind)} · ${escapeHtml(asset.dependencyStatus)}</span>
            <small>${escapeHtml(asset.sourcePath)}</small>
            <small>${escapeHtml(asset.sourceHash ?? 'not-read')}</small>
          </article>
        `).join('')}
      </section>
      <section class="nonclaims">
        ${workflow.nonClaims.map(nonClaim => `<span class="pill">${escapeHtml(nonClaim)}</span>`).join('')}
      </section>
      <script id="studio-catalog-workflow-readout" type="application/json">${escapeHtml(JSON.stringify(readout))}</script>
    </main>
  </body>
</html>
`);

const htmlUrl = pathToFileURL(htmlPath).toString();
const dom = run('chromium', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--dump-dom',
  htmlUrl,
]);
await writeFile(domPath, dom);
assert.match(dom, /studio-catalog-workflow-readout/, 'structured catalog workflow readout JSON is required');
assert.match(dom, /catalog\.link_asset/);
run('chromium', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--screenshot=${screenshotPath}`,
  '--window-size=1280,720',
  htmlUrl,
]);
assert.equal(existsSync(screenshotPath), true);
assert.equal(statSync(screenshotPath).size > 0, true);

const boundaryRun = run('pnpm', ['run', 'check:boundaries']);
assert.ok(boundaryRun.includes('Boundary check passed'));

const artifact = {
  artifactKind: 'studio_catalog_workflow_m3_browser_proof',
  artifactVersion: 'studio-catalog-workflow-m3-browser-proof.v0',
  generatedAt: new Date().toISOString(),
  command: 'pnpm run proof:catalog-workflow-m3',
  readout,
  browser: {
    htmlPath: 'artifacts/catalog-workflow-m3/latest/index.html',
    domHash: sha256Text(dom),
    screenshotPath: 'artifacts/catalog-workflow-m3/latest/screenshot.png',
    screenshotHash: sha256Buffer(readFileSync(screenshotPath)),
  },
  validations: [
    'catalog_workflow_read_model_projected',
    'catalog_create_load_save_link_validate_commands_present',
    'catalog_asset_source_evidence_read',
    'linked_catalog_asset_selected',
    'browser_dom_contains_structured_catalog_readout',
    'boundary_guard_passed',
    'negative_stale_catalog_edit_failed_closed',
    'negative_missing_source_evidence_failed_closed',
    'negative_private_catalog_path_failed_closed',
  ],
  nonClaims: workflow.nonClaims,
  artifactHash: sha256Json({
    workflowHash: workflow.workflowHash,
    operationHash: linked.operation.operationHash,
    domHash: sha256Text(dom),
  }),
};

assert.equal(readout.negativeSmokes.every(smoke => smoke.ok), true);
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Wrote ${artifactPath}`);
