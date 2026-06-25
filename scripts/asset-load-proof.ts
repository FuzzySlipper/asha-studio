import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { createDemoAssetPackage, demoAssetPackageFiles, loadDemoSceneAsset, validateDemoCatalog, validateDemoLock } from '../src/demo-asset-loading';
import { createStudioWorkspaceModel } from '../src/session-workspace';
import { buildStudioViewport3dReadback } from '../src/viewport3d-host';

interface BoundaryProof {
  readonly command: 'node scripts/check-boundaries.mjs';
  readonly status: 'passed' | 'failed';
  readonly output: string;
}

interface StepProof {
  readonly id: number;
  readonly requirement: string;
  readonly status: 'passed' | 'failed';
  readonly evidence: string;
}

const root = process.cwd();
const outDir = join(root, 'artifacts', 'asset-load-proof', 'latest');

function sha256(text: string): string {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function boundaryCheck(): BoundaryProof {
  try {
    const output = execFileSync('node', ['scripts/check-boundaries.mjs'], { cwd: root, encoding: 'utf8' });
    return { command: 'node scripts/check-boundaries.mjs', status: 'passed', output: output.trim() };
  } catch (error) {
    return { command: 'node scripts/check-boundaries.mjs', status: 'failed', output: error instanceof Error ? error.message : String(error) };
  }
}

function renderLoadSvg(args: { readonly assetId: string; readonly renderableIds: readonly string[]; readonly materials: readonly string[]; readonly hash: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280" viewBox="0 0 480 280" role="img" aria-label="ASHA Studio demo asset load evidence">
  <rect width="100%" height="100%" rx="18" fill="#0b1020"/>
  <text x="24" y="38" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#e2e8f0">Demo Asset Loaded Into Scene</text>
  <g transform="translate(160 78)">
    <polygon points="80,0 170,42 90,86 0,42" fill="#fbbf24" opacity="0.55"/>
    <polygon points="0,42 90,86 90,178 0,132" fill="#c08457" opacity="0.82"/>
    <polygon points="90,86 170,42 170,132 90,178" fill="#c08457" opacity="0.62"/>
    <polygon points="80,0 170,42 90,86 0,42" fill="#c08457" opacity="0.95"/>
  </g>
  <text x="24" y="84" font-family="monospace" font-size="13" fill="#bfdbfe">asset=${escapeHtml(args.assetId)}</text>
  <text x="24" y="108" font-family="monospace" font-size="12" fill="#a7f3d0">renderables=${escapeHtml(args.renderableIds.join(','))}</text>
  <text x="24" y="130" font-family="monospace" font-size="12" fill="#fecaca">materials=${escapeHtml(args.materials.join(','))}</text>
  <text x="24" y="252" font-family="monospace" font-size="12" fill="#a5b4fc">${escapeHtml(args.hash)}</text>
</svg>\n`;
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const boundary = boundaryCheck();
  const workspace = createStudioWorkspaceModel();
  const model = workspace.demoAssetLoad;
  const artifact = model.artifact;
  const pkg = createDemoAssetPackage();
  const loadResult = loadDemoSceneAsset(pkg);
  const viewport = buildStudioViewport3dReadback(workspace.sceneView);
  const loadEntry = workspace.timeline.find((entry) => entry.commandId === 'scene.load_asset');
  const loadedInViewport = viewport.renderables.filter((renderable) => renderable.renderableId.startsWith('scene-asset:'));
  const smokesClosed = artifact.negativeSmokes.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.classifiedCodes.length > 0);

  // Verify the reported on-disk package/source files exist and match the in-memory package.
  const packageFiles = demoAssetPackageFiles(pkg);
  const packageFileChecks = packageFiles.map((file) => {
    const absolute = join(root, file.path);
    const exists = existsSync(absolute);
    const text = exists ? readFileSync(absolute, 'utf8') : '';
    const matches = exists && JSON.stringify(JSON.parse(text)) === JSON.stringify(file.content);
    return { path: file.path, exists, matches, sha256: exists ? sha256(text) : null };
  });
  const packageFilesOk = packageFileChecks.every((check) => check.exists && check.matches);
  const sourcePathOnDisk = artifact.provenance.sourcePath !== null && existsSync(join(root, artifact.provenance.sourcePath));
  // Command input must match the public scene.load_asset typed shape.
  const commandInput = artifact.commandInput;
  const placement = commandInput.placement;
  const commandInputTyped = commandInput.assetId === artifact.loadedAssetId
    && commandInput.materialId.length > 0
    && placement.translation.length === 3
    && placement.rotation.length === 4
    && placement.scale.length === 3
    && loadEntry?.inputSummary.includes(commandInput.assetId) === true
    && loadEntry?.inputSummary.includes(commandInput.materialId) === true;

  const svg = renderLoadSvg({ assetId: artifact.loadedAssetId, renderableIds: artifact.renderableIds, materials: artifact.materialVariants.map((variant) => variant.materialId), hash: artifact.loadEvidenceHash });
  const svgPath = join(outDir, 'demo-asset-load.svg');
  writeFileSync(svgPath, svg);

  const steps: StepProof[] = [
    { id: 1, requirement: 'boundary check passes (public package roots only)', status: boundary.status === 'passed' ? 'passed' : 'failed', evidence: boundary.output.slice(0, 120) },
    { id: 2, requirement: 'demo asset package is a valid public catalog/lock/scene', status: validateDemoCatalog(pkg.catalog).length === 0 && validateDemoLock(pkg.catalog, pkg.lock).length === 0 ? 'passed' : 'failed', evidence: `${pkg.id}; ${pkg.catalog.entries.length} catalog entries` },
    { id: 3, requirement: 'asset loads through the shared scene.load_asset command/timeline path', status: artifact.readiness === 'ready' && loadEntry !== undefined && artifact.commandId === 'scene.load_asset' ? 'passed' : 'failed', evidence: `${loadEntry?.sequenceId ?? 'missing'} ${loadEntry?.commandId ?? 'missing'} (${loadEntry?.requestedBy ?? 'n/a'})` },
    { id: 4, requirement: 'render diff defines and places the loaded asset', status: loadResult.ok && loadResult.loadDiff.ops.some((op) => op.op === 'defineStaticMesh') && loadResult.loadDiff.ops.some((op) => op.op === 'createStaticMeshInstance') ? 'passed' : 'failed', evidence: loadResult.ok ? loadResult.loadDiff.ops.map((op) => op.op).join(',') : 'load failed' },
    { id: 5, requirement: 'readback exposes named renderable ids', status: artifact.renderableIds.length > 0 ? 'passed' : 'failed', evidence: artifact.renderableIds.join(',') },
    { id: 6, requirement: 'loaded asset appears in the Three.js viewport readback', status: viewport.readiness === 'ready' && loadedInViewport.length > 0 && loadedInViewport.every((renderable) => renderable.kind === 'static_mesh' && renderable.visible) ? 'passed' : 'failed', evidence: loadedInViewport.map((renderable) => renderable.renderableId).join(',') },
    { id: 7, requirement: 'provenance reports asset/package/source/mesh/material/scene placement', status: artifact.provenance.assetId.length > 0 && artifact.provenance.packagePath.length > 0 && (artifact.provenance.sourcePath ?? '').length > 0 && artifact.provenance.materialRefs.length > 0 && artifact.provenance.entityPlacementNodeIds.length > 0 ? 'passed' : 'failed', evidence: `${artifact.provenance.assetId} <- ${artifact.provenance.sourcePath ?? 'null'}; scene ${artifact.provenance.sceneId}` },
    { id: 8, requirement: 'negative smokes fail closed for missing/unsupported/mismatched/stale cases', status: artifact.negativeSmokes.length === 4 && smokesClosed ? 'passed' : 'failed', evidence: artifact.negativeSmokes.map((smoke) => `${smoke.failureCode}:${smoke.classifiedCodes.join('|')}`).join('; ') },
    { id: 9, requirement: 'agent readout exports the demo asset load artifact', status: workspace.exportedReadout.demoAssetLoad.artifact.commandId === 'scene.load_asset' ? 'passed' : 'failed', evidence: workspace.exportedReadout.demoAssetLoad.artifact.artifactId },
    { id: 10, requirement: 'reported package/source files exist on disk and match the in-memory package', status: packageFilesOk && sourcePathOnDisk ? 'passed' : 'failed', evidence: `${packageFileChecks.filter((check) => check.exists && check.matches).length}/${packageFileChecks.length} files match; sourcePath ${artifact.provenance.sourcePath ?? 'null'} ${sourcePathOnDisk ? 'present' : 'MISSING'}` },
    { id: 11, requirement: 'scene.load_asset timeline invocation carries typed assetId/materialId/placement input', status: commandInputTyped ? 'passed' : 'failed', evidence: loadEntry?.inputSummary ?? 'missing' },
  ];

  const proof = {
    schemaVersion: 1 as const,
    artifactKind: 'studio_demo_asset_load_proof' as const,
    taskId: 3215 as const,
    generatedAtIso: new Date().toISOString(),
    proofCommand: 'pnpm run proof:asset-load' as const,
    boundaryCheck: boundary,
    commandId: 'scene.load_asset' as const,
    commandInput: artifact.commandInput,
    loadedAssetId: artifact.loadedAssetId,
    packageId: artifact.packageId,
    packagePath: artifact.packagePath,
    packageFileChecks,
    renderableIds: artifact.renderableIds,
    placements: artifact.placements,
    provenance: artifact.provenance,
    materialVariants: artifact.materialVariants,
    loadDiffOps: artifact.loadDiff.ops.map((op) => op.op),
    viewportLoadedRenderableIds: loadedInViewport.map((renderable) => renderable.renderableId),
    negativeSmokes: artifact.negativeSmokes,
    proofSteps: steps,
    artifacts: [
      { name: 'demo asset load evidence', path: relative(root, svgPath), sha256: sha256(svg), mediaType: 'image/svg+xml' },
      { name: 'demo asset load artifact fixture', path: 'fixtures/studio-demo-asset-load.sample.json', sha256: sha256(readFileSync(join(root, 'fixtures', 'studio-demo-asset-load.sample.json'), 'utf8')), mediaType: 'application/json' },
      ...packageFiles.map((file) => ({ name: `demo asset package file ${relative(artifact.packagePath, file.path)}`, path: file.path, sha256: sha256(readFileSync(join(root, file.path), 'utf8')), mediaType: 'application/json' })),
    ],
    knownLimitations: [
      'Demo asset loading uses public @asha/contracts DTOs and the public scene.load_asset command; placement is browser/reference render-diff projection evidence only.',
      'Native/Rust/WASM authority bootstrap of the loaded scene document remains deferred until @asha/runtime-bridge compatibility is approved for Studio.',
      'This proof does not claim native runtime, Agora compositor, hardware GPU, or performance evidence; refresh proof:browser/proof:visual-capability in a Chromium environment to recapture the viewport with the loaded asset.',
    ],
  };

  const proofText = `${JSON.stringify(proof, null, 2)}\n`;
  const proofPath = join(outDir, 'index.json');
  writeFileSync(proofPath, proofText);
  const failed = steps.filter((step) => step.status !== 'passed');
  const html = `<!doctype html><meta charset="utf-8"><title>ASHA Studio Demo Asset Load Proof</title><body style="font-family:system-ui;background:#0b1020;color:#e2e8f0"><h1>ASHA Studio Demo Asset Load Proof</h1><p>${failed.length === 0 ? 'PASS' : 'FAIL'}: ${steps.length - failed.length}/${steps.length} steps passed.</p><img src="demo-asset-load.svg" alt="demo asset load evidence"><pre>${escapeHtml(JSON.stringify(steps, null, 2))}</pre></body>`;
  writeFileSync(join(outDir, 'index.html'), `${html}\n`);

  if (boundary.status !== 'passed') throw new Error(`boundary check failed: ${boundary.output}`);
  if (failed.length > 0) throw new Error(`demo asset load proof failed steps: ${failed.map((step) => step.id).join(', ')}`);
  console.log(`asha-studio demo asset load proof: OK (${relative(root, proofPath)})`);
}

main();
