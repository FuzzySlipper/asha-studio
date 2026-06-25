import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { computeEntityListHash } from '../src/entity-browser';
import { createStudioWorkspaceModel } from '../src/session-workspace';
import { buildStudioViewport3dReadback } from '../src/viewport3d-host';

interface StepProof {
  readonly id: number;
  readonly requirement: string;
  readonly status: 'passed' | 'failed';
  readonly evidence: string;
}

const root = process.cwd();
const outDir = join(root, 'artifacts', 'entity-browser-proof', 'latest');

function sha256(text: string): string {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function boundaryCheck(): { readonly status: 'passed' | 'failed'; readonly output: string } {
  try {
    const output = execFileSync('node', ['scripts/check-boundaries.mjs'], { cwd: root, encoding: 'utf8' });
    return { status: 'passed', output: output.trim() };
  } catch (error) {
    return { status: 'failed', output: error instanceof Error ? error.message : String(error) };
  }
}

function renderSvg(args: { readonly entityCount: number; readonly selected: string; readonly hash: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240" role="img" aria-label="ASHA Studio entity browser evidence">
  <rect width="100%" height="100%" rx="18" fill="#0b1020"/>
  <text x="24" y="38" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#e2e8f0">Entity Browser / Selection Sync</text>
  <text x="24" y="78" font-family="monospace" font-size="13" fill="#bfdbfe">entities=${args.entityCount}</text>
  <text x="24" y="102" font-family="monospace" font-size="13" fill="#a7f3d0">selected=${escapeHtml(args.selected)}</text>
  <text x="24" y="212" font-family="monospace" font-size="12" fill="#a5b4fc">${escapeHtml(args.hash)}</text>
</svg>\n`;
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const boundary = boundaryCheck();
  const workspace = createStudioWorkspaceModel();
  const browser = workspace.entityBrowser;
  const sceneView = workspace.sceneView;
  const viewport = buildStudioViewport3dReadback(sceneView);
  const selectEntry = workspace.timeline.find((entry) => entry.commandId === 'selection.set_active_entity');
  const recomputedHash = computeEntityListHash(browser.entities.map((entity) => ({ entityId: entity.entityId, sourceState: entity.sourceState, selected: entity.selected })));
  const selectedInViewport = viewport.renderables.some((renderable) => renderable.renderableId === browser.selection.viewportRenderableId);
  const loaded = browser.entities.find((entity) => entity.entityId === 'scene-asset:mesh/demo-crate:1');

  const svg = renderSvg({ entityCount: browser.entityCount, selected: browser.selection.selectedEntityId, hash: browser.entityListHash });
  const svgPath = join(outDir, 'entity-browser.svg');
  writeFileSync(svgPath, svg);

  const steps: StepProof[] = [
    { id: 1, requirement: 'boundary check passes (public package roots only)', status: boundary.status === 'passed' ? 'passed' : 'failed', evidence: boundary.output.slice(0, 120) },
    { id: 2, requirement: 'entity browser projects every scene-view renderable deterministically', status: browser.entityCount === sceneView.renderables.length && browser.entities.every((entity, index) => entity.order === index && entity.entityId === sceneView.renderables[index]?.renderableId) ? 'passed' : 'failed', evidence: `${browser.entityCount} entities; hash ${browser.entityListHash}` },
    { id: 3, requirement: 'entity list hash is stable against recomputation', status: browser.entityListHash === recomputedHash ? 'passed' : 'failed', evidence: `${browser.entityListHash} == ${recomputedHash}` },
    { id: 4, requirement: 'loaded demo asset entity is browsable with asset/material badges', status: loaded !== undefined && loaded.badges.includes('asset') && loaded.badges.includes('material') ? 'passed' : 'failed', evidence: loaded ? `${loaded.entityId} [${loaded.badges.join(',')}]` : 'missing' },
    { id: 5, requirement: 'selection syncs to the viewport renderable through selection.set_active_entity', status: browser.selection.inSync && browser.selection.commandId === 'selection.set_active_entity' && selectEntry !== undefined && browser.selection.sequenceId === selectEntry.sequenceId ? 'passed' : 'failed', evidence: `${browser.selection.selectedEntityId} -> ${browser.selection.viewportRenderableId} via ${browser.selection.sequenceId}` },
    { id: 6, requirement: 'selected entity resolves to a visible viewport renderable', status: selectedInViewport && viewport.selectedRenderableId === browser.selection.viewportRenderableId ? 'passed' : 'failed', evidence: `viewport selected ${viewport.selectedRenderableId}` },
    { id: 7, requirement: 'live projection has no fail-closed diagnostics', status: browser.diagnostics.length === 0 && browser.readiness === 'ready' ? 'passed' : 'failed', evidence: `${browser.diagnostics.length} diagnostic(s)` },
    { id: 8, requirement: 'negative smokes fail closed for drift/missing/stale/private-source/selection-mismatch', status: browser.negativeSmokes.length === 5 && browser.negativeSmokes.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.diagnosticCodes.includes(smoke.code)) ? 'passed' : 'failed', evidence: browser.negativeSmokes.map((smoke) => `${smoke.code}=${smoke.actualOutcome}`).join('; ') },
    { id: 9, requirement: 'entity browser is exported in the agent readout', status: workspace.exportedReadout.entityBrowser.artifactKind === 'entity_browser_projection' ? 'passed' : 'failed', evidence: workspace.exportedReadout.entityBrowser.automationLabel },
    { id: 10, requirement: 'selection.set_active_entity command result matches its public output schema and carries the selected entity', status: (() => { const result = workspace.commandResults.find((entry) => entry.commandId === 'selection.set_active_entity'); const output = result?.output; return output !== null && output !== undefined && 'entityId' in output && output.entityId === browser.selection.selectedEntityId && output.renderableId === browser.selection.viewportRenderableId && output.selected === true ? 'passed' : 'failed'; })(), evidence: JSON.stringify(workspace.commandResults.find((entry) => entry.commandId === 'selection.set_active_entity')?.output ?? null) },
  ];

  const proof = {
    schemaVersion: 1 as const,
    artifactKind: 'studio_entity_browser_proof' as const,
    taskId: 3216 as const,
    generatedAtIso: new Date().toISOString(),
    proofCommand: 'pnpm run proof:entity-browser' as const,
    boundaryCheck: { command: 'node scripts/check-boundaries.mjs' as const, ...boundary },
    sceneId: browser.sceneId,
    entityCount: browser.entityCount,
    entityIds: browser.entities.map((entity) => entity.entityId),
    selection: browser.selection,
    selectionCommandOutput: workspace.commandResults.find((entry) => entry.commandId === 'selection.set_active_entity')?.output ?? null,
    entityListHash: browser.entityListHash,
    diagnostics: browser.diagnostics,
    negativeSmokes: browser.negativeSmokes,
    proofSteps: steps,
    artifacts: [
      { name: 'entity browser evidence', path: relative(root, svgPath), sha256: sha256(svg), mediaType: 'image/svg+xml' },
      { name: 'entity browser artifact fixture', path: 'fixtures/studio-entity-browser.sample.json', sha256: sha256(readFileSync(join(root, 'fixtures', 'studio-entity-browser.sample.json'), 'utf8')), mediaType: 'application/json' },
    ],
    knownLimitations: [
      'Entity browser is a deterministic projection of StudioSceneViewModel readback, not a private ECS or product asset database.',
      'Selection sync flows through the public selection.set_active_entity command and the shared timeline, not a private UI-only callback.',
      'This proof does not claim native runtime, Agora compositor, hardware GPU, or performance evidence.',
    ],
  };

  const proofText = `${JSON.stringify(proof, null, 2)}\n`;
  const proofPath = join(outDir, 'index.json');
  writeFileSync(proofPath, proofText);
  const failed = steps.filter((step) => step.status !== 'passed');
  const html = `<!doctype html><meta charset="utf-8"><title>ASHA Studio Entity Browser Proof</title><body style="font-family:system-ui;background:#0b1020;color:#e2e8f0"><h1>ASHA Studio Entity Browser Proof</h1><p>${failed.length === 0 ? 'PASS' : 'FAIL'}: ${steps.length - failed.length}/${steps.length} steps passed.</p><img src="entity-browser.svg" alt="entity browser evidence"><pre>${escapeHtml(JSON.stringify(steps, null, 2))}</pre></body>`;
  writeFileSync(join(outDir, 'index.html'), `${html}\n`);

  if (boundary.status !== 'passed') throw new Error(`boundary check failed: ${boundary.output}`);
  if (failed.length > 0) throw new Error(`entity browser proof failed steps: ${failed.map((step) => step.id).join(', ')}`);
  console.log(`asha-studio entity browser proof: OK (${relative(root, proofPath)})`);
}

main();
