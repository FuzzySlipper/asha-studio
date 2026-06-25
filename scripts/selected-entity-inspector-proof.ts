import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { computeInspectorHash } from '../src/selected-entity-inspector';
import { createStudioWorkspaceModel } from '../src/session-workspace';
import { buildStudioViewport3dReadback } from '../src/viewport3d-host';

interface StepProof {
  readonly id: number;
  readonly requirement: string;
  readonly status: 'passed' | 'failed';
  readonly evidence: string;
}

const root = process.cwd();
const outDir = join(root, 'artifacts', 'selected-entity-inspector-proof', 'latest');

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

function renderSvg(args: { readonly entityId: string; readonly nameBefore: string; readonly nameAfter: string; readonly hash: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240" role="img" aria-label="ASHA Studio selected entity inspector evidence">
  <rect width="100%" height="100%" rx="18" fill="#0b1020"/>
  <text x="24" y="38" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#e2e8f0">Selected Entity Inspector / Name Edit</text>
  <text x="24" y="78" font-family="monospace" font-size="13" fill="#bfdbfe">entity=${escapeHtml(args.entityId)}</text>
  <text x="24" y="102" font-family="monospace" font-size="13" fill="#a7f3d0">name "${escapeHtml(args.nameBefore)}" -&gt; "${escapeHtml(args.nameAfter)}"</text>
  <text x="24" y="212" font-family="monospace" font-size="12" fill="#a5b4fc">${escapeHtml(args.hash)}</text>
</svg>\n`;
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const boundary = boundaryCheck();
  const workspace = createStudioWorkspaceModel();
  const inspector = workspace.selectedEntityInspector;
  const sceneView = workspace.sceneView;
  const viewport = buildStudioViewport3dReadback(sceneView);
  const renameEntry = workspace.timeline.find((entry) => entry.commandId === 'entity.set_name');
  const renameResult = workspace.commandResults.find((entry) => entry.commandId === 'entity.set_name');
  const renameOutput = renameResult?.output ?? null;
  const recomputedHash = computeInspectorHash({ entityId: inspector.selectedEntityId, displayName: inspector.identity.displayName, sourceState: inspector.identity.sourceState, transform: inspector.transform, fieldKeys: inspector.fields.map((field) => field.key) });
  const editableFields = inspector.fields.filter((field) => field.editable);

  const svg = renderSvg({ entityId: inspector.selectedEntityId, nameBefore: inspector.edit.nameBefore, nameAfter: inspector.edit.nameAfter, hash: inspector.inspectorHash });
  const svgPath = join(outDir, 'selected-entity-inspector.svg');
  writeFileSync(svgPath, svg);

  const steps: StepProof[] = [
    { id: 1, requirement: 'boundary check passes (public package roots only)', status: boundary.status === 'passed' ? 'passed' : 'failed', evidence: boundary.output.slice(0, 120) },
    { id: 2, requirement: 'inspector projects the shared selected entity identity/provenance', status: inspector.selectedEntityId === sceneView.selection.selectedRenderableId && inspector.identity.entityId === sceneView.selection.selectedRenderableId ? 'passed' : 'failed', evidence: `${inspector.identity.entityId} · ${inspector.identity.kind} · ${inspector.identity.sourceState}` },
    { id: 3, requirement: 'inspector hash is stable against recomputation', status: inspector.inspectorHash === recomputedHash ? 'passed' : 'failed', evidence: `${inspector.inspectorHash} == ${recomputedHash}` },
    { id: 4, requirement: 'exactly one editable field (name) routed through a typed command', status: editableFields.length === 1 && editableFields[0]?.key === 'name' && editableFields[0]?.commandId === 'entity.set_name' ? 'passed' : 'failed', evidence: editableFields.map((field) => `${field.key}:${field.commandId}`).join(',') },
    { id: 5, requirement: 'name edit flows through entity.set_name on the shared timeline', status: inspector.edit.commandId === 'entity.set_name' && renameEntry !== undefined && inspector.edit.sequenceId === renameEntry.sequenceId && inspector.edit.applied && inspector.edit.inSync ? 'passed' : 'failed', evidence: `${inspector.edit.nameBefore} -> ${inspector.edit.nameAfter} via ${inspector.edit.sequenceId}` },
    { id: 6, requirement: 'entity.set_name command result carries the typed applied-name evidence', status: (() => { const output = renameOutput; return output !== null && output !== undefined && 'name' in output && output.entityId === inspector.selectedEntityId && output.renderableId === inspector.selectedEntityId && output.applied === true && output.name === inspector.edit.nameAfter && output.nameHash === inspector.edit.nameHash ? 'passed' : 'failed'; })(), evidence: JSON.stringify(renameOutput) },
    { id: 7, requirement: 'edit updates the viewport readback with the applied display name', status: viewport.selectedEntityName === inspector.edit.nameAfter && viewport.semanticMarkers.includes(`selected-entity-name:${inspector.edit.nameAfter}`) ? 'passed' : 'failed', evidence: `viewport selectedEntityName ${viewport.selectedEntityName}` },
    { id: 8, requirement: 'live inspector has no fail-closed diagnostics', status: inspector.diagnostics.length === 0 && inspector.readiness === 'ready' ? 'passed' : 'failed', evidence: `${inspector.diagnostics.length} diagnostic(s)` },
    { id: 9, requirement: 'negative smokes fail closed for missing/drift/stale/unsupported-field/edit-mismatch', status: inspector.negativeSmokes.length === 5 && inspector.negativeSmokes.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.diagnosticCodes.includes(smoke.code)) ? 'passed' : 'failed', evidence: inspector.negativeSmokes.map((smoke) => `${smoke.code}=${smoke.actualOutcome}`).join('; ') },
    { id: 10, requirement: 'inspector is exported in the agent readout', status: workspace.exportedReadout.selectedEntityInspector.artifactKind === 'selected_entity_inspector' ? 'passed' : 'failed', evidence: workspace.exportedReadout.selectedEntityInspector.automationLabel },
  ];

  const proof = {
    schemaVersion: 1 as const,
    artifactKind: 'studio_selected_entity_inspector_proof' as const,
    taskId: 3217 as const,
    generatedAtIso: new Date().toISOString(),
    proofCommand: 'pnpm run proof:inspector' as const,
    boundaryCheck: { command: 'node scripts/check-boundaries.mjs' as const, ...boundary },
    sceneId: inspector.sceneId,
    selectedEntityId: inspector.selectedEntityId,
    identity: inspector.identity,
    provenance: inspector.provenance,
    edit: inspector.edit,
    editCommandOutput: renameOutput,
    viewportSelectedEntityName: viewport.selectedEntityName,
    inspectorHash: inspector.inspectorHash,
    editableFieldKeys: editableFields.map((field) => field.key),
    diagnostics: inspector.diagnostics,
    negativeSmokes: inspector.negativeSmokes,
    proofSteps: steps,
    artifacts: [
      { name: 'selected entity inspector evidence', path: relative(root, svgPath), sha256: sha256(svg), mediaType: 'image/svg+xml' },
      { name: 'selected entity inspector artifact fixture', path: 'fixtures/studio-selected-entity-inspector.sample.json', sha256: sha256(readFileSync(join(root, 'fixtures', 'studio-selected-entity-inspector.sample.json'), 'utf8')), mediaType: 'application/json' },
    ],
    knownLimitations: [
      'Selected entity inspector is a deterministic projection of StudioSceneViewModel/entity-browser readback, not a private ECS component store.',
      'Only the name field is editable in this slice; the edit flows through the public entity.set_name command and the shared timeline, not a private UI-only mutation callback.',
      'This proof does not claim native runtime, Agora compositor, hardware GPU, or performance evidence.',
    ],
  };

  const proofText = `${JSON.stringify(proof, null, 2)}\n`;
  const proofPath = join(outDir, 'index.json');
  writeFileSync(proofPath, proofText);
  const failed = steps.filter((step) => step.status !== 'passed');
  const html = `<!doctype html><meta charset="utf-8"><title>ASHA Studio Selected Entity Inspector Proof</title><body style="font-family:system-ui;background:#0b1020;color:#e2e8f0"><h1>ASHA Studio Selected Entity Inspector Proof</h1><p>${failed.length === 0 ? 'PASS' : 'FAIL'}: ${steps.length - failed.length}/${steps.length} steps passed.</p><img src="selected-entity-inspector.svg" alt="selected entity inspector evidence"><pre>${escapeHtml(JSON.stringify(steps, null, 2))}</pre></body>`;
  writeFileSync(join(outDir, 'index.html'), `${html}\n`);

  if (boundary.status !== 'passed') throw new Error(`boundary check failed: ${boundary.output}`);
  if (failed.length > 0) throw new Error(`selected entity inspector proof failed steps: ${failed.map((step) => step.id).join(', ')}`);
  console.log(`asha-studio selected entity inspector proof: OK (${relative(root, proofPath)})`);
}

main();
