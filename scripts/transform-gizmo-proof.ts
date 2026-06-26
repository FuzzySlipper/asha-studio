import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { computeGizmoHash } from '../src/transform-gizmo';
import { createStudioWorkspaceModel } from '../src/session-workspace';
import { buildStudioViewport3dReadback } from '../src/viewport3d-host';

interface StepProof {
  readonly id: number;
  readonly requirement: string;
  readonly status: 'passed' | 'failed';
  readonly evidence: string;
}

const root = process.cwd();
const outDir = join(root, 'artifacts', 'transform-gizmo-proof', 'latest');

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

function renderSvg(args: { readonly entityId: string; readonly axis: string; readonly before: readonly number[]; readonly after: readonly number[]; readonly hash: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240" role="img" aria-label="ASHA Studio transform gizmo evidence">
  <rect width="100%" height="100%" rx="18" fill="#0b1020"/>
  <text x="24" y="38" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#e2e8f0">Transform Gizmo / Translate ${escapeHtml(args.axis.toUpperCase())}</text>
  <text x="24" y="78" font-family="monospace" font-size="13" fill="#bfdbfe">entity=${escapeHtml(args.entityId)}</text>
  <text x="24" y="102" font-family="monospace" font-size="13" fill="#a7f3d0">translate [${escapeHtml(args.before.join(', '))}] -&gt; [${escapeHtml(args.after.join(', '))}]</text>
  <text x="24" y="212" font-family="monospace" font-size="12" fill="#a5b4fc">${escapeHtml(args.hash)}</text>
</svg>\n`;
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const boundary = boundaryCheck();
  const workspace = createStudioWorkspaceModel();
  const gizmo = workspace.transformGizmo;
  const sceneView = workspace.sceneView;
  const viewport = buildStudioViewport3dReadback(sceneView, gizmo);
  const previewResult = workspace.commandResults.find((entry) => entry.commandId === 'transform.translate_entity' && entry.output !== null && 'mode' in entry.output && entry.output.mode === 'preview');
  const applyResult = workspace.commandResults.find((entry) => entry.commandId === 'transform.translate_entity' && entry.output !== null && 'mode' in entry.output && entry.output.mode === 'apply');
  const applyOutput = applyResult?.output ?? null;
  const recomputedHash = computeGizmoHash({ entityId: gizmo.selectedEntityId, axis: gizmo.activeAxis, translationBefore: gizmo.transform.before, translationAfter: gizmo.transform.after, handleAxes: gizmo.handles.map((handle) => handle.axis) });
  const activeHandle = gizmo.handles.find((handle) => handle.active);

  const svg = renderSvg({ entityId: gizmo.selectedEntityId, axis: gizmo.activeAxis, before: gizmo.transform.before, after: gizmo.transform.after, hash: gizmo.gizmoHash });
  const svgPath = join(outDir, 'transform-gizmo.svg');
  writeFileSync(svgPath, svg);

  const steps: StepProof[] = [
    { id: 1, requirement: 'boundary check passes (public package roots only)', status: boundary.status === 'passed' ? 'passed' : 'failed', evidence: boundary.output.slice(0, 120) },
    { id: 2, requirement: 'gizmo binds to the shared selected entity', status: gizmo.selectedEntityId === sceneView.selection.selectedRenderableId && gizmo.selection.viewportRenderableId === sceneView.selection.selectedRenderableId ? 'passed' : 'failed', evidence: `${gizmo.selectedEntityId} · ${gizmo.selection.kind}` },
    { id: 3, requirement: 'gizmo exposes three axis handles with one command-wired active axis', status: gizmo.handles.length === 3 && gizmo.handles.every((handle) => handle.visible) && activeHandle?.axis === 'x' && activeHandle?.commandId === 'transform.translate_entity' ? 'passed' : 'failed', evidence: gizmo.handles.map((handle) => `${handle.axis}${handle.active ? '*' : ''}`).join(',') },
    { id: 4, requirement: 'gizmo hash is stable against recomputation', status: gizmo.gizmoHash === recomputedHash ? 'passed' : 'failed', evidence: `${gizmo.gizmoHash} == ${recomputedHash}` },
    { id: 5, requirement: 'translate previews and applies through transform.translate_entity on the shared timeline', status: gizmo.edit.commandId === 'transform.translate_entity' && previewResult !== undefined && applyResult !== undefined && gizmo.edit.previewSequenceId === previewResult.sequenceId && gizmo.edit.applySequenceId === applyResult.sequenceId && gizmo.edit.previewSequenceId !== gizmo.edit.applySequenceId ? 'passed' : 'failed', evidence: `preview ${gizmo.edit.previewSequenceId} + apply ${gizmo.edit.applySequenceId}` },
    { id: 6, requirement: 'apply command result carries matching typed before AND after translation evidence', status: (() => { const output = applyOutput; return output !== null && 'translationAfter' in output && output.entityId === gizmo.selectedEntityId && output.renderableId === gizmo.selectedEntityId && output.applied === true && output.axis === gizmo.activeAxis && output.transformHash === gizmo.edit.transformHash && output.translationBefore.join(',') === gizmo.transform.before.join(',') && output.translationAfter.join(',') === gizmo.transform.after.join(',') ? 'passed' : 'failed'; })(), evidence: JSON.stringify(applyOutput) },
    { id: 7, requirement: 'transform moved the entity (before != after) and updates the viewport readback', status: gizmo.transform.before.join(',') !== gizmo.transform.after.join(',') && viewport.transformGizmo !== null && viewport.transformGizmo.translationAfter.join(',') === gizmo.transform.after.join(',') && viewport.transformGizmo.applied && viewport.semanticMarkers.includes(`gizmo-translate:${gizmo.activeAxis}:${gizmo.transform.delta}`) ? 'passed' : 'failed', evidence: `viewport after [${viewport.transformGizmo?.translationAfter.join(', ')}]` },
    { id: 8, requirement: 'committed transform came from the public typed command (no private mutation path)', status: gizmo.edit.mutationSource === 'transform.translate_entity_command' && gizmo.edit.applied && gizmo.edit.inSync ? 'passed' : 'failed', evidence: gizmo.edit.mutationSource },
    { id: 9, requirement: 'live gizmo has no fail-closed diagnostics', status: gizmo.diagnostics.length === 0 && gizmo.readiness === 'ready' ? 'passed' : 'failed', evidence: `${gizmo.diagnostics.length} diagnostic(s)` },
    { id: 10, requirement: 'negative smokes fail closed for stale/missing-handle/mismatch(before,after,preview)/private-path/missing-entity', status: gizmo.negativeSmokes.length === 7 && gizmo.negativeSmokes.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.diagnosticCodes.includes(smoke.code)) ? 'passed' : 'failed', evidence: gizmo.negativeSmokes.map((smoke) => `${smoke.id}=${smoke.actualOutcome}`).join('; ') },
    { id: 11, requirement: 'gizmo is exported in the agent readout', status: workspace.exportedReadout.transformGizmo.artifactKind === 'transform_gizmo' ? 'passed' : 'failed', evidence: workspace.exportedReadout.transformGizmo.automationLabel },
    { id: 12, requirement: 'preview command previews the editor-local expected translation without committing', status: (() => { const output = previewResult?.output ?? null; return output !== null && 'translationAfter' in output && output.mode === 'preview' && output.applied === false && output.entityId === gizmo.selectedEntityId && output.renderableId === gizmo.selectedEntityId && output.axis === gizmo.activeAxis && output.translationAfter.join(',') === gizmo.transform.after.join(',') && gizmo.transform.preview.join(',') === gizmo.transform.after.join(',') ? 'passed' : 'failed'; })(), evidence: `preview ${JSON.stringify(gizmo.transform.preview)}` },
  ];

  const proof = {
    schemaVersion: 1 as const,
    artifactKind: 'studio_transform_gizmo_proof' as const,
    taskId: 3218 as const,
    generatedAtIso: new Date().toISOString(),
    proofCommand: 'pnpm run proof:gizmo' as const,
    boundaryCheck: { command: 'node scripts/check-boundaries.mjs' as const, ...boundary },
    sceneId: gizmo.sceneId,
    selectedEntityId: gizmo.selectedEntityId,
    operation: gizmo.operation,
    activeAxis: gizmo.activeAxis,
    handleAxes: gizmo.handles.map((handle) => handle.axis),
    selection: gizmo.selection,
    transform: gizmo.transform,
    edit: gizmo.edit,
    applyCommandOutput: applyOutput,
    previewCommandOutput: previewResult?.output ?? null,
    viewportTransformGizmo: viewport.transformGizmo,
    gizmoHash: gizmo.gizmoHash,
    diagnostics: gizmo.diagnostics,
    negativeSmokes: gizmo.negativeSmokes,
    proofSteps: steps,
    artifacts: [
      { name: 'transform gizmo evidence', path: relative(root, svgPath), sha256: sha256(svg), mediaType: 'image/svg+xml' },
      { name: 'transform gizmo artifact fixture', path: 'fixtures/studio-transform-gizmo.sample.json', sha256: sha256(readFileSync(join(root, 'fixtures', 'studio-transform-gizmo.sample.json'), 'utf8')), mediaType: 'application/json' },
    ],
    knownLimitations: [
      'Transform gizmo is a deterministic projection of the shared scene-view selected entity, not a private ECS transform component store.',
      'Only single-axis translate is supported in this slice; the edit flows through the public transform.translate_entity command and the shared timeline, not a private UI-only mutation path.',
      'This proof does not claim physics, native runtime, Agora compositor, hardware GPU, or performance evidence.',
    ],
  };

  const proofText = `${JSON.stringify(proof, null, 2)}\n`;
  const proofPath = join(outDir, 'index.json');
  writeFileSync(proofPath, proofText);
  const failed = steps.filter((step) => step.status !== 'passed');
  const html = `<!doctype html><meta charset="utf-8"><title>ASHA Studio Transform Gizmo Proof</title><body style="font-family:system-ui;background:#0b1020;color:#e2e8f0"><h1>ASHA Studio Transform Gizmo Proof</h1><p>${failed.length === 0 ? 'PASS' : 'FAIL'}: ${steps.length - failed.length}/${steps.length} steps passed.</p><img src="transform-gizmo.svg" alt="transform gizmo evidence"><pre>${escapeHtml(JSON.stringify(steps, null, 2))}</pre></body>`;
  writeFileSync(join(outDir, 'index.html'), `${html}\n`);

  if (boundary.status !== 'passed') throw new Error(`boundary check failed: ${boundary.output}`);
  if (failed.length > 0) throw new Error(`transform gizmo proof failed steps: ${failed.map((step) => step.id).join(', ')}`);
  console.log(`asha-studio transform gizmo proof: OK (${relative(root, proofPath)})`);
}

main();
