import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { hostname } from 'node:os';
import { join, relative, resolve } from 'node:path';

import {
  AGORA_CAPTURE_NON_CLAIMS,
  buildAgoraCompositorCaptureProof,
  type AgoraCaptureEvidence,
} from '../src/agora-compositor-capture';
import { createStudioWorkspaceModel } from '../src/session-workspace';

// Live harness: serves the built Studio dist, launches it as a real webview surface under the Agora
// Wayfire compositor, waits for a presented frame, captures the compositor surface, and validates the
// result through the pure model in src/agora-compositor-capture.ts. This proof is environment-gated:
// it requires a live compositor (compositorctl) and is NOT part of `pnpm run verify`.

const root = process.cwd();
const distDir = join(root, 'dist');
const outDir = join(root, 'artifacts', 'agora-compositor', 'latest');
const visualCapabilityPath = join(root, 'artifacts', 'visual-capability', 'latest', 'index.json');
// webview-launcher sets the wayland surface title to its --title flag (which must be space-free inside
// the single --cmd string), so the surface title is deterministically this tag, not the page <title>.
// Identity is validated against this tag plus the launched surface id; that the captured frame is the
// real Studio app is carried by the served dist URL + nonblank Studio content + timeline correlation.
const launchTitleTag = 'ASHA-STUDIO-AGORA-PROOF';
const expectedTitle = launchTitleTag;

function sha256Text(text: string): string {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Bytes(bytes: Buffer): string {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function run(cmd: string, args: readonly string[], options: { readonly timeoutMs?: number } = {}): Promise<string> {
  return new Promise((resolveRun, reject) => {
    execFile(cmd, [...args], { cwd: root, encoding: 'utf8', timeout: options.timeoutMs ?? 30_000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error !== null) {
        reject(new Error(`${cmd} ${args.join(' ')} failed: ${error.message}\n${String(stderr).slice(0, 2000)}`));
        return;
      }
      resolveRun(String(stdout));
    });
  });
}

function contentType(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function safeJoin(base: string, requestPath: string): string | null {
  const normalized = (requestPath.split('?')[0] ?? '/index.html');
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
  if (address === null || typeof address === 'string') throw new Error('failed to allocate static server port');
  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => (error === undefined ? resolveClose() : reject(error))));
  }
}

function parseEpochMs(isoLike: string): number {
  const ms = Date.parse(isoLike);
  if (Number.isNaN(ms)) throw new Error(`unparseable timestamp: ${isoLike}`);
  return ms;
}

interface MagickStats {
  readonly distinctColors: number;
  readonly stdDev: number;
}

async function magickStats(imagePath: string): Promise<MagickStats> {
  const out = await run('magick', [imagePath, '-format', '%k|%[fx:standard_deviation]', 'info:']);
  const [colors, stddev] = out.trim().split('|');
  return { distinctColors: Number.parseInt(colors ?? '0', 10), stdDev: Number.parseFloat(stddev ?? '0') };
}

interface CompositorSession {
  readonly session_id: string;
  readonly session_token: string;
}

interface CompositorCapture {
  readonly artifact: {
    readonly artifact_id: string;
    readonly request_id: string;
    readonly surface_id: string;
    readonly image_path: string;
    readonly index_path: string;
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
    readonly format: string;
    readonly capture_backend: string;
    readonly evidence_class: string;
    readonly timestamp: string;
    readonly asha_command_sequence_id: string;
    readonly visual_inspection: { readonly status: string; readonly unique_colors_sampled: number };
  };
}

interface CompositorSurface {
  readonly frame_count: number;
  readonly focused: boolean;
  readonly surface: { readonly id: string; readonly title: string; readonly app_id: string; readonly role: string; readonly pixel_size: { readonly width: number; readonly height: number } };
}

async function listSurface(surfaceId: string): Promise<CompositorSurface> {
  const out = await run('compositorctl', ['list-surfaces']);
  const parsed = JSON.parse(out) as { readonly surfaces: readonly CompositorSurface[] };
  const found = parsed.surfaces.find((surface) => surface.surface.id === surfaceId);
  if (found === undefined) throw new Error(`surface ${surfaceId} not present in list-surfaces`);
  return found;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

interface LaunchResult {
  readonly launchId: string;
  readonly surfaceId: string;
}

// The webview helper's surface mapping time is variable; retry a few times on app_not_ready rather
// than failing the proof on a transient mapping miss. Each failed attempt is cleaned up.
async function launchWithRetry(session: CompositorSession, url: string, attempts: number): Promise<LaunchResult> {
  let lastError = 'no attempt made';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const launchOut = await run('compositorctl', [
        'launch',
        '--session', session.session_id,
        '--session-token', session.session_token,
        '--cmd', `webview-launcher --url ${url} --role toplevel --width 1280 --height 1600 --title ${launchTitleTag}`,
        '--expected-title', expectedTitle,
        '--wait-surface',
        '--wait-timeout-ms', '20000',
      ], { timeoutMs: 45_000 });
      const launch = JSON.parse(launchOut) as { readonly launch_id: string; readonly surface: { readonly surface: { readonly id: string } } };
      return { launchId: launch.launch_id, surfaceId: launch.surface.surface.id };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`launch attempt ${attempt}/${attempts} failed: ${lastError.split('\n')[0]}`);
      await sleep(1500);
    }
  }
  throw new Error(`compositor never mapped the Studio surface after ${attempts} attempts: ${lastError}`);
}

// Let the webview render before capturing. (frame_count is not a usable readiness signal for these
// WebKitGTK surfaces; a blank/unrendered frame is instead rejected by the nonblank check downstream.)
async function settleSurface(surfaceId: string, settleMs: number): Promise<CompositorSurface> {
  await sleep(settleMs);
  return listSurface(surfaceId);
}

async function main(): Promise<void> {
  if (!existsSync(join(distDir, 'index.html'))) throw new Error('dist/index.html is missing; run pnpm run build first');
  // Guard: this proof requires a live compositor. Fail with a clear message rather than a confusing stack.
  await run('compositorctl', ['list-surfaces']).catch(() => {
    throw new Error('compositorctl is not reachable; the Agora compositor must be live to run proof:agora-compositor (see agora-os/agent-guide-connect-to-agora-shell-for-tests)');
  });
  mkdirSync(outDir, { recursive: true });

  // Correlation source: the studio command timeline (always available) and the optional visual
  // capability proof (referenced when present, never required — keeps this an additive backend).
  const workspace = createStudioWorkspaceModel();
  const renderCapture = workspace.timeline.find((entry) => entry.commandId === 'render.capture_before_after');
  if (renderCapture === undefined) throw new Error('studio timeline is missing render.capture_before_after');
  const timelineSequenceIds = workspace.timeline.map((entry) => entry.sequenceId);
  const stampSequenceId = renderCapture.sequenceId;

  let visualCapability: AgoraCaptureEvidence['correlation']['visualCapability'] = { present: false, path: null, sha256: null, artifactKind: null, readiness: null, selectedObject: null, afterRenderHash: null };
  let selectedObject = workspace.sceneView.selection.selectedRenderableId;
  let afterRenderHash = 'render-hash-unavailable';
  if (existsSync(visualCapabilityPath)) {
    const vcText = readFileSync(visualCapabilityPath, 'utf8');
    const vc = JSON.parse(vcText) as { readonly artifactKind: string; readonly readiness: string; readonly summary: { readonly selectedObject: string; readonly afterRenderHash: string } };
    selectedObject = vc.summary.selectedObject;
    afterRenderHash = vc.summary.afterRenderHash;
    visualCapability = { present: true, path: relative(root, visualCapabilityPath), sha256: sha256Text(vcText), artifactKind: vc.artifactKind, readiness: vc.readiness, selectedObject: vc.summary.selectedObject, afterRenderHash: vc.summary.afterRenderHash };
  }

  const sessionOut = await run('compositorctl', ['session', 'create']);
  const session = JSON.parse(sessionOut) as CompositorSession;
  let launchId: string | null = null;
  try {
    const evidence = await withStaticServer(async (baseUrl) => {
      const url = `${baseUrl}/index.html`;
      const launchStartedEpochMs = parseEpochMs(new Date().toISOString());
      const launched = await launchWithRetry(session, url, 3);
      launchId = launched.launchId;
      const surfaceId = launched.surfaceId;

      // Let the webview render, then capture the compositor surface with the studio sequence stamp.
      const surface = await settleSurface(surfaceId, 3500);
      const captureOut = await run('compositorctl', [
        'capture',
        '--surface', surfaceId,
        '--session', session.session_id,
        '--session-token', session.session_token,
        '--export',
        '--evidence-class', 'viewport_screenshot',
        '--asha-command-sequence-id', stampSequenceId,
      ]);
      const capture = JSON.parse(captureOut) as CompositorCapture;
      const art = capture.artifact;

      // Copy the compositor PNG + index into the repo artifacts dir for a durable review handle.
      const localPng = join(outDir, 'agora-studio-surface.png');
      copyFileSync(art.image_path, localPng);
      copyFileSync(art.index_path, join(outDir, 'compositor-capture-index.json'));
      const pngBytes = readFileSync(localPng);
      const stats = await magickStats(localPng);

      const built: AgoraCaptureEvidence = {
        thresholds: { minWidth: 1000, minHeight: 1000, minDistinctColors: 64, minPixelStdDev: 0.02, maxFreshnessMs: 120_000 },
        nonClaims: [...AGORA_CAPTURE_NON_CLAIMS],
        launch: { launchId: launched.launchId, url, expectedTitle, role: 'toplevel', sessionId: session.session_id, launchStartedEpochMs },
        surface: {
          surfaceId,
          title: surface.surface.title,
          appId: surface.surface.app_id,
          role: surface.surface.role,
          width: surface.surface.pixel_size.width,
          height: surface.surface.pixel_size.height,
          focused: surface.focused,
          frameCountAtCapture: surface.frame_count,
        },
        frame: {
          present: true,
          artifactId: art.artifact_id,
          requestId: art.request_id,
          surfaceId: art.surface_id,
          sha256: `sha256-${art.sha256}`,
          width: art.width,
          height: art.height,
          format: art.format,
          compositorCaptureBackend: art.capture_backend,
          evidenceClass: art.evidence_class,
          visualInspectionStatus: art.visual_inspection.status,
          compositorUniqueColorsSampled: art.visual_inspection.unique_colors_sampled,
          independentDistinctColors: stats.distinctColors,
          independentPixelStdDev: stats.stdDev,
          ashaCommandSequenceId: art.asha_command_sequence_id,
          capturedAtEpochMs: parseEpochMs(art.timestamp),
        },
        correlation: {
          renderCaptureCommandId: 'render.capture_before_after',
          renderCaptureSequenceId: stampSequenceId,
          timelineSequenceIds,
          selectedObject,
          afterRenderHash,
          visualCapability,
        },
      };
      // Independent integrity: the copied PNG must hash to the compositor-reported sha256.
      if (sha256Bytes(pngBytes) !== built.frame.sha256) {
        throw new Error(`copied compositor PNG sha ${sha256Bytes(pngBytes)} != compositor-reported ${built.frame.sha256}`);
      }
      return built;
    });

    const core = buildAgoraCompositorCaptureProof(evidence);
    const localPngRel = relative(root, join(outDir, 'agora-studio-surface.png'));
    const pngBytes = readFileSync(join(outDir, 'agora-studio-surface.png'));
    const indexCopyRel = relative(root, join(outDir, 'compositor-capture-index.json'));
    const proof = {
      ...core,
      generatedAtIso: new Date().toISOString(),
      host: { hostname: hostname(), compositor: 'wayfire_agora_bridge', controlSocket: '/run/agent-os/compositor-control.sock' },
      artifacts: [
        { name: 'agora compositor studio surface frame', path: localPngRel, sha256: sha256Bytes(pngBytes), mediaType: 'image/png' },
        { name: 'compositor capture index', path: indexCopyRel, sha256: sha256Text(readFileSync(join(outDir, 'compositor-capture-index.json'), 'utf8')), mediaType: 'application/json' },
      ],
      knownLimitations: [
        'Agora compositor capture is a real composited on-screen surface frame from the Wayfire/Agora bridge; it is classified explicitly as agora_compositor / compositor_surface, distinct from the Chromium browser-screenshot backend.',
        'It does NOT claim hardware GPU acceleration, performance, native runtime authority, or WASM authority; the Studio app still runs as the Three.js browser projection.',
        'This is an optional, additive visual backend; the studio_visual_capability_proof references it when present but never requires it, so the existing browser proof is unweakened.',
        'Authoritative runtime/transform mutation remains deferred behind the runtime-bridge readiness gate (asha#3047).',
      ],
    };
    const proofText = `${JSON.stringify(proof, null, 2)}\n`;
    writeFileSync(join(outDir, 'index.json'), proofText);
    if (core.readiness !== 'ready') {
      throw new Error(`agora compositor capture failed closed: ${core.diagnostics.map((d) => d.code).join(', ') || 'negative smoke regression'}`);
    }
    console.log(`asha-studio agora compositor capture: OK (${relative(root, join(outDir, 'index.json'))})`);
  } finally {
    if (launchId !== null) await run('compositorctl', ['terminate', '--launch-id', launchId, '--session-token', session.session_token]).catch(() => undefined);
    await run('compositorctl', ['session', 'destroy', '--session', session.session_id, '--session-token', session.session_token]).catch(() => undefined);
  }
}

await main();
