import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, relative } from 'node:path';

import { createStudioWorkspaceModel } from '../src/session-workspace';
import type { StudioVoxelCell } from '../src/voxel-workflow';

interface BoundaryProof {
  readonly command: 'node scripts/check-boundaries.mjs';
  readonly status: 'passed' | 'failed';
  readonly output: string;
}

interface LaunchProof {
  readonly mode: 'static_http_dist';
  readonly url: string;
  readonly indexStatus: number;
  readonly bundleStatus: number;
  readonly bundlePath: string;
  readonly requiredUiMarkers: readonly string[];
  readonly missingUiMarkers: readonly string[];
}

interface StepProof {
  readonly id: number;
  readonly requirement: string;
  readonly status: 'passed' | 'failed';
  readonly evidence: string;
}

interface V1ProofArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'v1_visual_edit_proof';
  readonly taskId: 2738;
  readonly generatedAtIso: string;
  readonly proofCommand: 'pnpm run proof:v1';
  readonly launch: LaunchProof;
  readonly boundaryCheck: BoundaryProof;
  readonly scenario: {
    readonly scenarioId: string;
    readonly label: string;
    readonly status: string;
  };
  readonly compatibility: unknown;
  readonly commandTimeline: unknown;
  readonly commandResults: unknown;
  readonly visualEvidence: unknown;
  readonly reviewArtifact: unknown;
  readonly proofSteps: readonly StepProof[];
  readonly artifactReadback: {
    readonly status: 'pending_readback_script';
    readonly command: 'node scripts/readback-v1-proof.mjs';
  };
  readonly artifacts: readonly {
    readonly name: string;
    readonly path: string;
    readonly sha256: string;
    readonly mediaType: string;
  }[];
  readonly knownLimitations: readonly string[];
}

const root = process.cwd();
const outDir = join(root, 'artifacts', 'v1-proof', 'latest');
const distDir = join(root, 'dist');
const requiredUiMarkers = [
  'ASHA Studio',
  'Voxel Inspect / Select / Preview / Apply',
  'Visual Evidence / Review Export',
  'Command Timeline',
  'authority.voxel.apply_brush',
  'render.capture_before_after',
  'export.agent_readout',
] as const;

function sha256(text: string): string {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function cellColor(cell: StudioVoxelCell, phase: 'before' | 'after'): string {
  const value = phase === 'before' ? cell.before : cell.after;
  if (cell.changed && phase === 'after') return '#22c55e';
  if (cell.preview !== null && phase === 'before') return '#f59e0b';
  if (cell.selected) return '#60a5fa';
  return value.kind === 'solid' ? '#94a3b8' : '#111827';
}

function renderGridSvg(cells: readonly StudioVoxelCell[], phase: 'before' | 'after'): string {
  const cellSize = 56;
  const gap = 10;
  const width = 3 * cellSize + 2 * gap + 40;
  const height = 3 * cellSize + 2 * gap + 90;
  const title = phase === 'before' ? 'Before preview/apply' : 'After apply';
  const rects = cells.map((cell, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 20 + col * (cellSize + gap);
    const y = 58 + row * (cellSize + gap);
    const value = phase === 'before' ? cell.before : cell.after;
    const label = value.kind === 'solid' ? String(value.material) : '·';
    const stroke = cell.changed ? '#bbf7d0' : cell.selected ? '#bfdbfe' : '#334155';
    return `<g><rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="10" fill="${cellColor(cell, phase)}" stroke="${stroke}" stroke-width="3"/><text x="${x + cellSize / 2}" y="${y + 35}" text-anchor="middle" font-family="monospace" font-size="22" fill="#f8fafc">${escapeHtml(label)}</text></g>`;
  }).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)} ASHA Studio voxel evidence">
  <rect width="100%" height="100%" fill="#0b1020"/>
  <text x="20" y="32" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="#e2e8f0">${escapeHtml(title)}</text>
  ${rects}
  <text x="20" y="${height - 20}" font-family="monospace" font-size="12" fill="#a5b4fc">selected=(0,0,0); edit=(1,0,0); green=applied delta</text>
</svg>\n`;
}

function boundaryCheck(): BoundaryProof {
  try {
    const output = execFileSync('node', ['scripts/check-boundaries.mjs'], { cwd: root, encoding: 'utf8' });
    return { command: 'node scripts/check-boundaries.mjs', status: 'passed', output: output.trim() };
  } catch (error) {
    const output = error instanceof Error ? error.message : String(error);
    return { command: 'node scripts/check-boundaries.mjs', status: 'failed', output };
  }
}

async function withStaticServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = createServer((request, response) => {
    const url = request.url === undefined || request.url === '/' ? '/index.html' : request.url;
    const normalized = url.split('?')[0] ?? '/index.html';
    const relativePath = normalized.startsWith('/') ? normalized.slice(1) : normalized;
    const filePath = join(distDir, relativePath);
    if (!filePath.startsWith(distDir) || !existsSync(filePath)) {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
      return;
    }
    const mediaType = filePath.endsWith('.html') ? 'text/html' : filePath.endsWith('.js') ? 'text/javascript' : filePath.endsWith('.css') ? 'text/css' : 'application/octet-stream';
    response.writeHead(200, { 'content-type': mediaType });
    response.end(readFileSync(filePath));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('failed to allocate proof HTTP port');
  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
  }
}

async function launchProof(): Promise<LaunchProof> {
  if (!existsSync(join(distDir, 'index.html'))) throw new Error('dist/index.html is missing; run pnpm run build or pnpm run proof:v1');
  const assetDir = join(distDir, 'assets');
  const jsFile = readdirSync(assetDir).find((file) => file.endsWith('.js'));
  if (jsFile === undefined) throw new Error('dist/assets contains no JavaScript bundle');
  return await withStaticServer(async (baseUrl) => {
    const indexResponse = await fetch(`${baseUrl}/index.html`);
    const bundlePath = `/assets/${jsFile}`;
    const bundleResponse = await fetch(`${baseUrl}${bundlePath}`);
    const indexText = await indexResponse.text();
    const bundleText = await bundleResponse.text();
    const combined = `${indexText}\n${bundleText}`;
    const missingUiMarkers = requiredUiMarkers.filter((marker) => !combined.includes(marker));
    return {
      mode: 'static_http_dist',
      url: `${baseUrl}/index.html`,
      indexStatus: indexResponse.status,
      bundleStatus: bundleResponse.status,
      bundlePath,
      requiredUiMarkers,
      missingUiMarkers,
    };
  });
}

function stepProofs(args: { readonly workspace: ReturnType<typeof createStudioWorkspaceModel>; readonly launch: LaunchProof; readonly boundary: BoundaryProof }): readonly StepProof[] {
  const timelineIds = args.workspace.timeline.map((entry) => entry.commandId);
  const applyResult = args.workspace.commandResults.find((result) => result.commandId === 'authority.voxel.apply_brush');
  const visual = args.workspace.visualEvidence[0];
  const review = args.workspace.reviewArtifact;
  return [
    { id: 1, requirement: 'launches asha-studio', status: args.launch.indexStatus === 200 && args.launch.bundleStatus === 200 && args.launch.missingUiMarkers.length === 0 ? 'passed' : 'failed', evidence: `${args.launch.url}; bundle ${args.launch.bundlePath}` },
    { id: 2, requirement: 'loads a named scenario', status: args.workspace.scenario.status === 'loaded' ? 'passed' : 'failed', evidence: `${args.workspace.scenario.scenarioId}: ${args.workspace.scenario.label}` },
    { id: 3, requirement: 'records initial workspace/session/readout state', status: args.workspace.exportedReadout.commandTimeline.length > 0 ? 'passed' : 'failed', evidence: args.workspace.session.sessionId },
    { id: 4, requirement: 'selects/inspects a voxel target', status: timelineIds.includes('inspection.voxel') && timelineIds.includes('selection.voxel_from_screen_point') ? 'passed' : 'failed', evidence: 'inspection.voxel + selection.voxel_from_screen_point' },
    { id: 5, requirement: 'previews a visible edit', status: timelineIds.includes('preview.voxel_brush') ? 'passed' : 'failed', evidence: 'preview.voxel_brush; authority unchanged until apply' },
    { id: 6, requirement: 'applies edit through typed ASHA public command surfaces', status: timelineIds.includes('authority.voxel.apply_brush') ? 'passed' : 'failed', evidence: args.workspace.voxelWorkflow.evidence.typedVoxelCommands[0]?.op ?? 'missing command' },
    { id: 7, requirement: 'records command result and before/after ASHA evidence hashes', status: applyResult?.state.authorityBeforeHash !== null && applyResult?.state.authorityAfterHash !== null && applyResult?.state.authorityBeforeHash !== applyResult?.state.authorityAfterHash ? 'passed' : 'failed', evidence: `${applyResult?.state.authorityBeforeHash ?? 'missing'} -> ${applyResult?.state.authorityAfterHash ?? 'missing'}` },
    { id: 8, requirement: 'shows visible before/after evidence in the UI', status: visual?.captureReadiness === 'ready' && visual.beforeRenderHash !== visual.afterRenderHash ? 'passed' : 'failed', evidence: `${visual?.beforeArtifact?.path ?? 'missing'} -> ${visual?.afterArtifact?.path ?? 'missing'}` },
    { id: 9, requirement: 'exports a review artifact with timeline, visual evidence, hashes, compatibility, and boundary status', status: review.captureReadiness === 'ready' && args.boundary.status === 'passed' ? 'passed' : 'failed', evidence: `${review.artifactId}; boundary ${args.boundary.status}` },
  ];
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const boundary = boundaryCheck();
  const launch = await launchProof();
  const workspace = createStudioWorkspaceModel();
  const beforeSvg = renderGridSvg(workspace.voxelWorkflow.beforeGrid, 'before');
  const afterSvg = renderGridSvg(workspace.voxelWorkflow.afterGrid, 'after');
  const beforePath = join(outDir, 'before-voxel-grid.svg');
  const afterPath = join(outDir, 'after-voxel-grid.svg');
  writeFileSync(beforePath, beforeSvg);
  writeFileSync(afterPath, afterSvg);
  const proofSteps = stepProofs({ workspace, launch, boundary });
  const artifact: V1ProofArtifact = {
    schemaVersion: 1,
    artifactKind: 'v1_visual_edit_proof',
    taskId: 2738,
    generatedAtIso: new Date().toISOString(),
    proofCommand: 'pnpm run proof:v1',
    launch,
    boundaryCheck: boundary,
    scenario: workspace.scenario,
    compatibility: workspace.session.compatibility,
    commandTimeline: workspace.timeline,
    commandResults: workspace.commandResults,
    visualEvidence: workspace.visualEvidence,
    reviewArtifact: workspace.reviewArtifact,
    proofSteps,
    artifactReadback: { status: 'pending_readback_script', command: 'node scripts/readback-v1-proof.mjs' },
    artifacts: [
      { name: 'before visual evidence', path: relative(root, beforePath), sha256: sha256(beforeSvg), mediaType: 'image/svg+xml' },
      { name: 'after visual evidence', path: relative(root, afterPath), sha256: sha256(afterSvg), mediaType: 'image/svg+xml' },
      { name: 'review artifact fixture', path: 'fixtures/studio-review-artifact.sample.json', sha256: sha256(readFileSync(join(root, 'fixtures', 'studio-review-artifact.sample.json'), 'utf8')), mediaType: 'application/json' },
    ],
    knownLimitations: [
      'V1 proof uses software_snapshot functional proof-content evidence, not browser screenshot, Agora capture, hardware GPU, or performance evidence.',
      'Native runtime bridge execution remains deferred; command application evidence is typed public-contract Studio reference evidence.',
    ],
  };
  const failedSteps = proofSteps.filter((step) => step.status !== 'passed');
  const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
  const proofPath = join(outDir, 'index.json');
  writeFileSync(proofPath, artifactText);
  const html = `<!doctype html><meta charset="utf-8"><title>ASHA Studio V1 Proof</title><body style="font-family:system-ui;background:#0b1020;color:#e2e8f0"><h1>ASHA Studio V1 Proof</h1><p>${failedSteps.length === 0 ? 'PASS' : 'FAIL'}: ${proofSteps.length - failedSteps.length}/${proofSteps.length} proof steps passed.</p><h2>Before</h2><img src="before-voxel-grid.svg" alt="before voxel grid"><h2>After</h2><img src="after-voxel-grid.svg" alt="after voxel grid"><pre>${escapeHtml(JSON.stringify(proofSteps, null, 2))}</pre></body>`;
  writeFileSync(join(outDir, 'index.html'), `${html}\n`);
  if (boundary.status !== 'passed') throw new Error(`boundary check failed: ${boundary.output}`);
  if (launch.missingUiMarkers.length > 0) throw new Error(`launched bundle missing UI markers: ${launch.missingUiMarkers.join(', ')}`);
  if (failedSteps.length > 0) throw new Error(`V1 proof failed steps: ${failedSteps.map((step) => step.id).join(', ')}`);
  console.log(`asha-studio V1 proof: OK (${relative(root, proofPath)})`);
}

await main();
