import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

interface VisualContractObject {
  id: string;
  domain_role?: string;
  role?: string;
  parent?: string;
  bounds?: { space: 'viewport'; x: number; y: number; w: number; h: number; px?: { x: number; y: number; w: number; h: number } };
  [key: string]: unknown;
}

interface VisualContract {
  schema: 'layered-visual-contract/v0.1';
  scene: { id: string; viewport: { width_px: number; height_px: number } };
  project?: { id: string; vocabulary?: string; roles?: string[] };
  objects: VisualContractObject[];
  constraints?: unknown[];
  [key: string]: unknown;
}

interface ComparisonReport {
  schema: string;
  run_id: string;
  verdict: 'pass' | 'fail';
  score: number;
  failures?: readonly { readonly constraint: string; readonly repair_hint?: string }[];
  artifacts?: { readonly report?: string; readonly diff_overlay?: string };
}

const root = process.cwd();
const denServicesRoot = '/home/dev/den-services';
const visualContractRoot = join(denServicesRoot, 'visual-contract');
const collectorPath = join(visualContractRoot, 'tools', 'browser-evidence-collector.mjs');
const distDir = join(root, 'dist');
const fixtureDir = join(root, 'fixtures', 'visual-contract');
const targetPath = join(fixtureDir, 'asha-studio-ui-test.target.contract.json');
const candidatePath = join(fixtureDir, 'asha-studio-current.candidate.contract.json');
const negativePath = join(fixtureDir, 'asha-studio-current.negative.contract.json');
const proofPath = join(fixtureDir, 'asha-studio-current.proof.json');
const artifactRoot = join(fixtureDir, 'artifacts');
const evidenceDir = join(root, 'artifacts', 'visual-contract', 'latest');
const deployedServiceHost = process.env.ASHA_VISUAL_CONTRACT_SSH_HOST ?? 'den-srv';
const deployedServiceBaseUrl = process.env.ASHA_VISUAL_CONTRACT_BASE_URL ?? 'http://127.0.0.1:8086';
const deployedVisualContractsUrl = `${deployedServiceBaseUrl}/visual-contracts`;

const requiredVisualObjects = [
  'export_review_artifact_button',
  'run_proof_button',
  'scene_hierarchy',
  'central_3d_viewport',
  'selected_target_inspector',
  'command_evidence_dock',
  'command_timeline',
  'evidence_dock',
] as const;

function contentType(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function safeJoin(base: string, requestPath: string): string | null {
  const normalized = requestPath.split('?')[0] ?? '/index.html';
  const relativePath = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  const resolved = resolve(base, relativePath === '' ? 'index.html' : relativePath);
  const baseResolved = resolve(base);
  if (resolved !== baseResolved && !resolved.startsWith(`${baseResolved}/`)) return null;
  return resolved;
}

async function withStaticServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = createServer((request, response) => {
    const filePath = safeJoin(distDir, request.url ?? '/index.html');
    if (filePath === null || !existsSync(filePath)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(filePath) });
    response.end(readFileSync(filePath));
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('failed to allocate Studio static server port');
  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error === undefined ? resolveClose() : reject(error)));
  }
}

type ExecEncoding = BufferEncoding | 'buffer';

function execFileOutput(command: string, args: readonly string[], options: { cwd?: string; encoding?: ExecEncoding; timeout?: number; maxBuffer?: number } = {}): Promise<string | Buffer> {
  const { cwd, encoding = 'utf8', timeout = 60_000, maxBuffer = 20 * 1024 * 1024 } = options;
  return new Promise((resolveRun, reject) => {
    execFile(command, [...args], { cwd, encoding, timeout, maxBuffer }, (error, stdout, stderr) => {
      if (error !== null) {
        const safeStderr = Buffer.isBuffer(stderr) ? stderr.toString('utf8') : String(stderr);
        const safeStdout = Buffer.isBuffer(stdout) ? stdout.toString('utf8') : String(stdout);
        reject(new Error(`${command} ${args.join(' ')} failed: ${error.message}\n${safeStdout}\n${safeStderr}`));
        return;
      }
      resolveRun(stdout as string | Buffer);
    });
  });
}

async function sshText(script: string, timeout = 60_000): Promise<string> {
  const output = await execFileOutput('ssh', ['-o', 'BatchMode=yes', deployedServiceHost, script], { encoding: 'utf8', timeout });
  return String(output);
}

async function scpToRemote(localPath: string, remotePath: string): Promise<void> {
  await execFileOutput('scp', ['-q', localPath, `${deployedServiceHost}:${remotePath}`], { encoding: 'utf8', timeout: 60_000 });
}

async function withVisualContractService<T>(fn: (remoteDir: string) => Promise<T>): Promise<T> {
  const health = await sshText(`set -euo pipefail; curl -fsS ${deployedServiceBaseUrl}/health`, 30_000);
  if (!health.includes('visual-contract')) throw new Error(`unexpected deployed visual-contract health response: ${health.slice(0, 400)}`);
  const remoteDir = (await sshText('set -euo pipefail; mktemp -d /tmp/asha-studio-visual-contract.XXXXXX', 30_000)).trim();
  try {
    return await fn(remoteDir);
  } finally {
    await sshText(`set -euo pipefail; rm -rf ${JSON.stringify(remoteDir)}`, 30_000).catch(() => undefined);
  }
}

async function runCollector(appUrl: string): Promise<void> {
  await new Promise<void>((resolveRun, reject) => {
    execFile('pnpm', [
      'exec',
      'node',
      collectorPath,
      '--url', `${appUrl}/index.html?visualContract=1`,
      '--scene-id', 'asha_studio_current',
      '--capture-mode', 'viewport-clipped',
      '--root-selector', '[data-visual-id="asha_studio_shell"]',
      '--width', '1920',
      '--height', '1080',
      '--screenshot', join(evidenceDir, 'asha-studio-current.png'),
      '--out', join(evidenceDir, 'asha-studio-current.web-evidence.json'),
    ], { cwd: denServicesRoot, encoding: 'utf8', timeout: 60_000, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error !== null) {
        reject(new Error(`visual-contract collector failed: ${error.message}\n${stdout}\n${stderr}`));
        return;
      }
      resolveRun();
    });
  });
}

function sanitizeViewportEvidence(webEvidence: unknown): unknown {
  const request = webEvidence as { evidence?: { viewport?: { width_px?: number; height_px?: number }; nodes?: Array<{ bounds_px?: { x: number; y: number; w: number; h: number }; original_bounds_px?: unknown; bounds_clipped?: boolean }> } };
  const width = request.evidence?.viewport?.width_px;
  const height = request.evidence?.viewport?.height_px;
  if (typeof width !== 'number' || typeof height !== 'number' || !Array.isArray(request.evidence?.nodes)) return webEvidence;
  for (const node of request.evidence.nodes) {
    const bounds = node.bounds_px;
    if (bounds === undefined) continue;
    const clippedX = Math.max(0, Math.min(width, bounds.x));
    const clippedY = Math.max(0, Math.min(height, bounds.y));
    const clippedW = Math.max(0, Math.min(bounds.w, width - clippedX));
    const clippedH = Math.max(0, Math.min(bounds.h, height - clippedY));
    if (clippedX !== bounds.x || clippedY !== bounds.y || clippedW !== bounds.w || clippedH !== bounds.h) {
      node.original_bounds_px = node.original_bounds_px ?? { ...bounds };
      node.bounds_clipped = true;
      node.bounds_px = { x: clippedX, y: clippedY, w: clippedW, h: clippedH };
    }
  }
  return webEvidence;
}

async function postJson<T>(remoteDir: string, route: string, body: unknown): Promise<T> {
  const localTempDir = mkdtempSync(join(tmpdir(), 'asha-studio-visual-contract-payload-'));
  const payloadName = `payload-${Date.now()}-${Math.random().toString(16).slice(2)}.json`;
  const localPayload = join(localTempDir, payloadName);
  const remotePayload = `${remoteDir}/${payloadName}`;
  try {
    writeFileSync(localPayload, `${JSON.stringify(body)}\n`);
    await scpToRemote(localPayload, remotePayload);
    const url = `${deployedVisualContractsUrl}${route}`;
    const response = await sshText(`set -euo pipefail
set -a; . /etc/den-services/visual-contract.env; set +a
curl -fsS \\
  -H "Authorization: Bearer \${DEN_VISUAL_CONTRACT_SERVICE_TOKEN}" \\
  -H "Content-Type: application/json" \\
  --data @${JSON.stringify(remotePayload)} \\
  ${JSON.stringify(url)}`, 120_000);
    return JSON.parse(response) as T;
  } finally {
    rmSync(localTempDir, { recursive: true, force: true });
  }
}

async function fetchArtifact(url: string, outPath: string): Promise<void> {
  const artifact = await execFileOutput('ssh', ['-o', 'BatchMode=yes', deployedServiceHost, `set -euo pipefail
set -a; . /etc/den-services/visual-contract.env; set +a
curl -fsS -H "Authorization: Bearer \${DEN_VISUAL_CONTRACT_SERVICE_TOKEN}" ${JSON.stringify(url)}`], { encoding: 'buffer', timeout: 60_000, maxBuffer: 20 * 1024 * 1024 });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, artifact as Buffer);
}

const requiredVisualRoles: Record<string, string> = {
  export_review_artifact_button: 'review_artifact_export',
  run_proof_button: 'proof_runner',
  scene_hierarchy: 'scene_hierarchy',
  central_3d_viewport: 'central_3d_viewport',
  selected_target_inspector: 'selected_target_inspector',
  command_evidence_dock: 'command_evidence_dock',
  command_timeline: 'command_timeline',
  evidence_dock: 'evidence_dock',
};

function assertRequiredCandidateObjects(contract: VisualContract): void {
  const objects = new Map(contract.objects.map((object) => [object.id, object]));
  const missing = requiredVisualObjects.filter((id) => !objects.has(id));
  if (missing.length > 0) throw new Error(`candidate is missing ASHA visual objects: ${missing.join(', ')}`);
  for (const id of requiredVisualObjects) {
    const object = objects.get(id);
    const expectedRole = requiredVisualRoles[id];
    if (object?.domain_role !== expectedRole && object?.role !== expectedRole) throw new Error(`candidate object ${id} missing ASHA role/domain_role ${expectedRole}`);
  }
  const central = objects.get('central_3d_viewport')?.bounds;
  if (central === undefined) throw new Error('candidate central_3d_viewport bounds missing');
  if (central.w * central.h < 0.35) throw new Error(`candidate central_3d_viewport too small for pilot evidence: ${central.w * central.h}`);
}

function containsRemovedReference(value: unknown, removed: Set<string>): boolean {
  if (typeof value === 'string') return removed.has(value);
  if (Array.isArray(value)) return value.some((entry) => containsRemovedReference(entry, removed));
  if (value !== null && typeof value === 'object') return Object.values(value as Record<string, unknown>).some((entry) => containsRemovedReference(entry, removed));
  return false;
}

function buildNegativeCandidate(candidate: VisualContract): VisualContract {
  const negative: VisualContract = JSON.parse(JSON.stringify(candidate)) as VisualContract;
  negative.scene = { ...negative.scene, id: 'asha_studio_current_negative_missing_inspector' };
  const removed = new Set<string>(['selected_target_inspector']);
  let changed = true;
  while (changed) {
    changed = false;
    for (const object of negative.objects) {
      if (object.parent !== undefined && removed.has(object.parent) && !removed.has(object.id)) {
        removed.add(object.id);
        changed = true;
      }
    }
  }
  negative.objects = negative.objects
    .filter((object) => !removed.has(object.id))
    .map((object) => {
      if (object.id !== 'central_3d_viewport' || object.bounds === undefined) return object;
      const bounds = {
        ...object.bounds,
        w: 0.18,
        h: 0.20,
      };
      if (object.bounds.px !== undefined) bounds.px = { ...object.bounds.px, w: 346, h: 216 };
      return {
        ...object,
        bounds,
      };
    });
  const kept = new Set(negative.objects.map((object) => object.id));
  const mutable = negative as VisualContract & {
    layers?: Array<{ contains?: string[]; [key: string]: unknown }>;
    relations?: Array<{ a?: string; b?: string; [key: string]: unknown }>;
    evidence?: { records?: Array<{ object_refs?: string[]; [key: string]: unknown }>; [key: string]: unknown };
  };
  if (Array.isArray(mutable.layers)) {
    mutable.layers = mutable.layers.map((layer) => ({ ...layer, contains: layer.contains?.filter((id) => kept.has(id)) ?? [] }));
  }
  if (Array.isArray(mutable.relations)) {
    mutable.relations = mutable.relations.filter((relation) => !containsRemovedReference(relation, removed));
  }
  if (Array.isArray(mutable.evidence?.records)) {
    mutable.evidence.records = mutable.evidence.records.filter((record) => (record.object_refs ?? []).every((id) => kept.has(id)));
  }
  return negative;
}

function localArtifactPath(runId: string, artifactName: string): string {
  return join(artifactRoot, runId, artifactName);
}

async function compareAndPersist(remoteDir: string, reference: VisualContract, candidate: VisualContract): Promise<{
  runId: string;
  verdict: 'pass' | 'fail';
  failureCount: number;
  failures: string[];
  reportArtifact: string;
  diffOverlayArtifact: string;
  localReportArtifact: string;
  localDiffOverlayArtifact: string;
}> {
  const report = await postJson<ComparisonReport>(remoteDir, '/compare', { reference, candidate });
  const reportArtifact = report.artifacts?.report;
  const diffOverlayArtifact = report.artifacts?.diff_overlay;
  if (report.run_id === undefined || report.run_id.length === 0) throw new Error('compare response missing run_id');
  if (reportArtifact === undefined || diffOverlayArtifact === undefined) throw new Error(`compare response missing artifact refs for run ${report.run_id}`);
  const localReport = localArtifactPath(report.run_id, 'report.json');
  const localOverlay = localArtifactPath(report.run_id, 'diff.overlay.svg');
  await fetchArtifact(reportArtifact, localReport);
  await fetchArtifact(diffOverlayArtifact, localOverlay);
  return {
    runId: report.run_id,
    verdict: report.verdict,
    failureCount: report.failures?.length ?? 0,
    failures: (report.failures ?? []).map((failure) => failure.constraint),
    reportArtifact,
    diffOverlayArtifact,
    localReportArtifact: relative(root, localReport),
    localDiffOverlayArtifact: relative(root, localOverlay),
  };
}

async function main(): Promise<void> {
  if (!existsSync(join(distDir, 'index.html'))) throw new Error('dist/index.html missing; run pnpm run build first');
  if (!existsSync(targetPath)) throw new Error(`target visual contract missing: ${targetPath}`);
  mkdirSync(evidenceDir, { recursive: true });
  mkdirSync(fixtureDir, { recursive: true });

  await withStaticServer(async (appUrl) => {
    await runCollector(appUrl);
  });
  const webEvidence = sanitizeViewportEvidence(JSON.parse(readFileSync(join(evidenceDir, 'asha-studio-current.web-evidence.json'), 'utf8')) as unknown);
  writeFileSync(join(evidenceDir, 'asha-studio-current.web-evidence.json'), `${JSON.stringify(webEvidence, null, 2)}\n`);
  const target = JSON.parse(readFileSync(targetPath, 'utf8')) as VisualContract;

  await withVisualContractService(async (remoteDir) => {
    const candidate = await postJson<VisualContract>(remoteDir, '/from-web-evidence', webEvidence);
    candidate.project = {
      id: 'asha',
      vocabulary: 'asha_studio_current_dom_visual_contract_v0',
      roles: [...requiredVisualObjects, 'selection_outline', 'preview_ghost', 'axis_gizmo', 'applied_state_marker', 'limitation_label'],
    };
    assertRequiredCandidateObjects(candidate);
    const negative = buildNegativeCandidate(candidate);
    writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
    writeFileSync(negativePath, `${JSON.stringify(negative, null, 2)}\n`);

    const candidateValidation = await postJson<{ valid: boolean; counts: unknown }>(remoteDir, '/validate', { contract: candidate });
    const negativeValidation = await postJson<{ valid: boolean; counts: unknown }>(remoteDir, '/validate', { contract: negative });
    if (!candidateValidation.valid) throw new Error('candidate visual contract failed validation');
    if (!negativeValidation.valid) throw new Error('negative visual contract failed validation');

    const selfCompare = await compareAndPersist(remoteDir, target, candidate);
    const negativeCompare = await compareAndPersist(remoteDir, target, negative);
    if (selfCompare.verdict !== 'pass') throw new Error(`current Studio candidate did not satisfy target contract: ${selfCompare.failures.join(', ')}`);
    if (negativeCompare.verdict !== 'fail') throw new Error('negative candidate unexpectedly passed target contract');
    if (!negativeCompare.failures.includes('selected_target_inspector_exists')) throw new Error('negative compare did not fail on missing selected_target_inspector');
    if (!negativeCompare.failures.includes('central_viewport_is_dominant')) throw new Error('negative compare did not fail on undersized central viewport');

    const proof = {
      artifactKind: 'asha_studio_current_visual_contract_proof',
      schemaVersion: 1,
      taskId: 3123,
      sourceApp: 'dist/index.html?visualContract=1 served through local static proof server',
      candidateContract: relative(root, candidatePath),
      negativeCandidate: relative(root, negativePath),
      targetContract: relative(root, targetPath),
      webEvidence: relative(root, join(evidenceDir, 'asha-studio-current.web-evidence.json')),
      screenshot: relative(root, join(evidenceDir, 'asha-studio-current.png')),
      capture: {
        viewport: { width_px: 1920, height_px: 1080 },
        captureMode: 'viewport-clipped',
        rootSelector: '[data-visual-id="asha_studio_shell"]',
        requiredVisualObjects,
      },
      service: {
        mode: 'deployed_den_srv',
        host: deployedServiceHost,
        baseUrl: deployedServiceBaseUrl,
        routes: ['/visual-contracts/from-web-evidence', '/visual-contracts/validate', '/visual-contracts/compare'],
        authentication: 'remote /etc/den-services/visual-contract.env bearer token; token never stored in proof artifacts',
      },
      currentCompare: selfCompare,
      negativeCompare,
      validation: {
        candidate: candidateValidation,
        negative: negativeValidation,
      },
      limitations: [
        'Visual-contract proof is browser layout/affordance evidence only; it does not claim ASHA Rust/WASM authority, native runtime, Agora compositor, hardware GPU, or performance evidence.',
        'Visual-contract comparison complements scene/camera/pick/readback proof; it does not replace authoritative viewport evidence.',
      ],
    };
    writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
  });
  console.log(`asha-studio visual-contract candidate proof: OK (${relative(root, proofPath)})`);
}

await main();
