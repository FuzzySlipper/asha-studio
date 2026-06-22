import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

interface V1ProofArtifact {
  readonly artifactKind: 'v1_visual_edit_proof';
  readonly proofSteps: readonly { readonly id: number; readonly status: string }[];
  readonly commandTimeline: readonly { readonly commandId: string; readonly sequenceId: number }[];
  readonly artifacts: readonly { readonly name: string; readonly path: string; readonly sha256: string; readonly mediaType: string }[];
  readonly visualEvidence: readonly {
    readonly captureReadiness: string;
    readonly captureMode: string;
    readonly beforeRenderHash: string | null;
    readonly afterRenderHash: string | null;
  }[];
  readonly reviewArtifact: { readonly artifactId: string; readonly captureReadiness: string };
}

interface ScreenshotRef {
  readonly name: string;
  readonly path: string;
  readonly sha256: string;
  readonly mediaType: 'image/png';
  readonly byteLength: number;
  readonly width: number;
  readonly height: number;
}

interface Viewport3dReadbackArtifact {
  readonly artifactKind: 'viewport_3d_readback';
  readonly readiness: 'ready' | 'failed_closed';
  readonly hostKind: 'three_local_browser_projection';
  readonly canvasMarker: 'studio-3d-webgl-canvas';
  readonly visibleRenderableCount: number;
  readonly selectedRenderableId: string | null;
  readonly selectionHash: string;
  readonly previewGhostId: string | null;
  readonly appliedRenderableId: string | null;
  readonly dependencyDecision: 'direct_three_local_browser_projection_dependency';
  readonly interactionProof: {
    readonly artifactKind: 'viewport_camera_tool_interaction_proof';
    readonly readiness: 'ready' | 'failed_closed';
    readonly toolState: {
      readonly activeTool: 'select' | 'orbit' | 'pan' | 'frame' | 'voxel_brush';
      readonly cameraBeforeHash: string;
      readonly cameraAfterHash: string;
      readonly cameraChanged: boolean;
    };
    readonly scriptedActions: readonly { readonly actionId: string; readonly actor: 'gui' | 'agent'; readonly sequenceId: string }[];
    readonly actorOrigins: readonly ('gui' | 'agent')[];
    readonly selectedRenderableId: string;
    readonly staleReadbackGuard: { readonly requiredCameraAfterHash: string; readonly requiredSelectionHash: string; readonly requiredPreviewGhostId: string; readonly mismatchPolicy: 'failed_closed' };
  };
  readonly limitations: readonly string[];
}

interface Viewport3dCanvasDomEvidence {
  readonly detectionMode: 'chromium_dump_dom_canvas_element';
  readonly canvasElementPresent: boolean;
  readonly canvasElementCount: number;
  readonly requiredClass: 'studio-3d-webgl-canvas';
  readonly requiredDataCanvasRole: 'studio-3d-webgl-canvas';
}

interface BrowserCaptureArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'browser_visual_capture_proof';
  readonly taskId: 3043;
  readonly generatedAtIso: string;
  readonly proofCommand: 'pnpm run proof:browser';
  readonly editorShellTarget: {
    readonly mockupPath: string;
    readonly comparisonMode: 'structural_semantic_markers';
    readonly pixelPerfect: false;
  };
  readonly captureBackend: {
    readonly runtime: 'chromium_headless_cli';
    readonly captureMode: 'browser_screenshot';
    readonly renderSurface: 'vite_static_dist_app_route';
    readonly gpuClaim: 'not_claimed';
  };
  readonly linkedV1Proof: {
    readonly path: string;
    readonly sha256: string;
    readonly artifactKind: 'v1_visual_edit_proof';
    readonly proofStepCount: number;
  };
  readonly routes: {
    readonly studioAppUrl: string;
    readonly proofArtifactUrl: string;
  };
  readonly readiness: {
    readonly status: 'ready' | 'failed_closed';
    readonly requiredMarkers: readonly string[];
    readonly markerGroups: readonly {
      readonly groupId: string;
      readonly label: string;
      readonly requiredMarkers: readonly string[];
      readonly missingMarkers: readonly string[];
      readonly status: 'present' | 'missing';
    }[];
    readonly appMissingMarkers: readonly string[];
    readonly proofMissingMarkers: readonly string[];
  };
  readonly correlation: {
    readonly status: 'matched' | 'failed_closed';
    readonly timelineCommandIds: readonly string[];
    readonly missingTimelineCommandIds: readonly string[];
    readonly visualHashDelta: {
      readonly beforeRenderHash: string | null;
      readonly afterRenderHash: string | null;
      readonly changed: boolean;
    };
    readonly reviewArtifactId: string;
    readonly reviewCaptureReadiness: string;
  };
  readonly viewport3d: Viewport3dReadbackArtifact;
  readonly viewport3dCanvasDom: Viewport3dCanvasDomEvidence;
  readonly screenshots: readonly ScreenshotRef[];
  readonly comparison: {
    readonly status: 'changed' | 'failed_closed';
    readonly beforeAfterSource: 'linked_v1_proof_artifact';
    readonly screenshotCount: number;
  };
  readonly knownLimitations: readonly string[];
}

const root = process.cwd();
const editorShellMockupPath = join(root, 'local', 'ui-test.html');
const distDir = join(root, 'dist');
const v1ProofDir = join(root, 'artifacts', 'v1-proof', 'latest');
const v1ProofPath = join(v1ProofDir, 'index.json');
const outDir = join(root, 'artifacts', 'browser-capture', 'latest');
const editorShellMarkerGroups = [
  {
    groupId: 'top_app_status_bar',
    label: 'ASHA top app/status bar and limitation chips',
    markers: ['ASHA Studio', 'studio-editor-app-status-bar', 'runtime bridge: deferred', 'native / Agora / GPU: not claimed', 'boundary: public package roots only'],
  },
  {
    groupId: 'left_scene_hierarchy_dock',
    label: 'Left scene/hierarchy dock',
    markers: ['studio-editor-left-scene-hierarchy-dock', 'Scene / Hierarchy', 'studio-scene-hierarchy-dock', 'scene-hierarchy-tree-readout', 'authority-backed', 'preview-only', 'State legend'],
  },
  {
    groupId: 'central_reference_viewport',
    label: 'Central Three.js viewport',
    markers: ['studio-editor-central-viewport-dock', 'Viewport — terrain-test-grid', 'studio-central-reference-viewport-canvas', 'studio-real-browser-3d-viewport-host', 'studio-3d-webgl-canvas', 'viewport-axis-gizmo', 'viewport_3d_readback', 'three_local_browser_projection', 'visible renderables 5', 'selected selected-voxel:0,0,0', 'preview preview-ghost:1,0,0', 'applied applied-voxel:1,0,0', 'viewport_camera_tool_interaction_proof', 'viewport-camera-tool-readout', 'viewport-scripted-actions-readout', 'gui.frame_selected_target', 'agent.select_visible_voxel', 'gui.toggle_preview_ghost', 'camera_tool_stale_readback_guard', 'shading: Three.js local browser projection'],
  },
  {
    groupId: 'right_inspector_dock',
    label: 'Right selected-target inspector dock',
    markers: ['studio-editor-right-inspector-dock', 'Inspector / Selected Target', 'Proposed by Studio (TS), projection only.', 'Validated by Authority (Rust), authoritative state.', 'Authority transition', 'Render projection', 'software_snapshot_reference', 'no native runtime, Agora, GPU, or performance claim'],
  },
  {
    groupId: 'bottom_command_evidence_dock',
    label: 'Bottom command timeline/evidence dock',
    markers: ['studio-editor-bottom-command-evidence-dock', 'Command Timeline / Evidence Log', 'Evidence / Artifacts', 'artifact-review-export-0001', 'artifact-agent-readout-0001', 'not a second private command log'],
  },
  {
    groupId: 'preview_applied_authority_render_readouts',
    label: 'Preview vs applied authority/render readouts',
    markers: ['preview.voxel_brush', 'authority.voxel.apply_brush', 'render.capture_before_after', 'Capture readiness: ready', 'Authority hash:', 'Render hash:'],
  },
] as const;
const requiredAppMarkers = editorShellMarkerGroups.flatMap((group) => group.markers);
const requiredProofMarkers = [
  'ASHA Studio V1 Proof',
  'Before',
  'After',
  'launches asha-studio',
  'exports a review artifact',
] as const;
const requiredTimelineIds = [
  'session.start',
  'session.load_scenario',
  'inspection.session_status',
  'inspection.editor_state',
  'inspection.voxel',
  'selection.voxel_from_screen_point',
  'preview.voxel_brush',
  'authority.voxel.apply_brush',
  'render.capture_before_after',
  'export.agent_readout',
] as const;

function sha256Bytes(bytes: Buffer): string {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function sha256Text(text: string): string {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error('browser screenshot is not a valid PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
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
  const normalized = requestPath.split('?')[0] ?? '/index.html';
  const relativePath = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  const resolved = resolve(base, relativePath === '' ? 'index.html' : relativePath);
  const baseResolved = resolve(base);
  if (resolved !== baseResolved && !resolved.startsWith(`${baseResolved}/`)) return null;
  return resolved;
}

async function withStaticServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = createServer((request, response) => {
    const url = request.url ?? '/index.html';
    const [prefix, base] = url.startsWith('/v1-proof/')
      ? ['/v1-proof/', v1ProofDir] as const
      : ['/', distDir] as const;
    const requestPath = prefix === '/' ? url : `/${url.slice(prefix.length)}`;
    const filePath = safeJoin(base, requestPath);
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
  if (address === null || typeof address === 'string') throw new Error('failed to allocate visual capture HTTP port');
  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error === undefined ? resolveClose() : reject(error)));
  }
}

function chromiumArgs(userDataDir: string): readonly string[] {
  return [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,2200',
    '--hide-scrollbars',
  ];
}

async function runChromium(args: readonly string[], options: { readonly encoding?: BufferEncoding } = {}): Promise<string> {
  return await new Promise<string>((resolveRun, reject) => {
    execFile('chromium', [...args], { cwd: root, encoding: options.encoding ?? 'utf8', timeout: 30_000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error !== null) {
        reject(new Error(`chromium failed: ${error.message}\n${String(stderr).slice(0, 2000)}`));
        return;
      }
      resolveRun(String(stdout));
    });
  });
}

async function captureRoute(url: string, name: string): Promise<{ text: string; screenshot: ScreenshotRef }> {
  const userDataDir = mkdtempSync(join(tmpdir(), 'asha-studio-browser-capture-'));
  try {
    const text = await runChromium([...chromiumArgs(userDataDir), '--virtual-time-budget=3000', '--dump-dom', url]);
    const path = join(outDir, `${name}.png`);
    await runChromium([...chromiumArgs(userDataDir), '--virtual-time-budget=3000', `--screenshot=${path}`, url]);
    const bytes = readFileSync(path);
    const dimensions = pngDimensions(bytes);
    return {
      text,
      screenshot: {
        name,
        path: relative(root, path),
        sha256: sha256Bytes(bytes),
        mediaType: 'image/png',
        byteLength: bytes.byteLength,
        width: dimensions.width,
        height: dimensions.height,
      },
    };
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

function parseV1Proof(): V1ProofArtifact {
  if (!existsSync(v1ProofPath)) throw new Error('missing artifacts/v1-proof/latest/index.json; run pnpm run proof:v1 first');
  return JSON.parse(readFileSync(v1ProofPath, 'utf8')) as V1ProofArtifact;
}

function assertV1ProofArtifact(v1: V1ProofArtifact): void {
  if (v1.artifactKind !== 'v1_visual_edit_proof') throw new Error(`unexpected linked proof kind ${String(v1.artifactKind)}`);
  const failedSteps = v1.proofSteps.filter((step) => step.status !== 'passed');
  if (failedSteps.length > 0) throw new Error(`linked V1 proof has failed steps: ${failedSteps.map((step) => step.id).join(', ')}`);
}

function extractViewport3dReadback(appText: string): Viewport3dReadbackArtifact {
  const match = appText.match(/<script[^>]*id="studio-viewport3d-readback-json"[^>]*>([\s\S]*?)<\/script>/);
  if (match?.[1] === undefined) throw new Error('missing studio viewport3d readback JSON script');
  return JSON.parse(match[1]) as Viewport3dReadbackArtifact;
}

function buildCanvasDomEvidence(appText: string): Viewport3dCanvasDomEvidence {
  const canvasTags = appText.match(/<canvas\b[^>]*>/gi) ?? [];
  const canvasElementCount = canvasTags.filter((tag) => {
    const hasRequiredClass = /\bclass=("[^"]*\bstudio-3d-webgl-canvas\b[^"]*"|'[^']*\bstudio-3d-webgl-canvas\b[^']*')/i.test(tag);
    const hasRequiredDataRole = /\bdata-canvas-role=("studio-3d-webgl-canvas"|'studio-3d-webgl-canvas')/i.test(tag);
    return hasRequiredClass || hasRequiredDataRole;
  }).length;
  return {
    detectionMode: 'chromium_dump_dom_canvas_element',
    canvasElementPresent: canvasElementCount > 0,
    canvasElementCount,
    requiredClass: 'studio-3d-webgl-canvas',
    requiredDataCanvasRole: 'studio-3d-webgl-canvas',
  };
}

async function main(): Promise<void> {
  if (!existsSync(join(distDir, 'index.html'))) throw new Error('dist/index.html is missing; run pnpm run build or pnpm run proof:v1 first');
  mkdirSync(outDir, { recursive: true });
  const v1 = parseV1Proof();
  assertV1ProofArtifact(v1);
  const visual = v1.visualEvidence[0];
  const timelineCommandIds = v1.commandTimeline.map((entry) => entry.commandId);
  const missingTimelineCommandIds = requiredTimelineIds.filter((id) => !timelineCommandIds.includes(id));
  const visualChanged = visual?.beforeRenderHash !== null && visual?.afterRenderHash !== null && visual?.beforeRenderHash !== visual?.afterRenderHash;
  const v1ProofText = readFileSync(v1ProofPath, 'utf8');
  const capture = await withStaticServer(async (baseUrl) => {
    const studioAppUrl = `${baseUrl}/index.html`;
    const proofArtifactUrl = `${baseUrl}/v1-proof/index.html`;
    const app = await captureRoute(studioAppUrl, 'studio-app');
    const proof = await captureRoute(proofArtifactUrl, 'v1-proof-before-after');
    return { appText: app.text, proofText: proof.text, screenshots: [app.screenshot, proof.screenshot], urls: { studioAppUrl, proofArtifactUrl } };
  });
  const appMissingMarkers = requiredAppMarkers.filter((marker) => !capture.appText.includes(marker));
  const viewport3d = extractViewport3dReadback(capture.appText);
  const viewport3dCanvasDom = buildCanvasDomEvidence(capture.appText);
  const markerGroups = editorShellMarkerGroups.map((group) => {
    const missingMarkers = group.markers.filter((marker) => !capture.appText.includes(marker));
    return {
      groupId: group.groupId,
      label: group.label,
      requiredMarkers: [...group.markers],
      missingMarkers,
      status: missingMarkers.length === 0 ? 'present' as const : 'missing' as const,
    };
  });
  const proofMissingMarkers = requiredProofMarkers.filter((marker) => !capture.proofText.includes(marker));
  const interactionProofReady = viewport3d.interactionProof.readiness === 'ready'
    && viewport3d.interactionProof.toolState.cameraChanged
    && viewport3d.interactionProof.toolState.cameraBeforeHash !== viewport3d.interactionProof.toolState.cameraAfterHash
    && viewport3d.interactionProof.toolState.cameraAfterHash === viewport3d.interactionProof.staleReadbackGuard.requiredCameraAfterHash
    && viewport3d.interactionProof.selectedRenderableId === viewport3d.selectedRenderableId
    && viewport3d.interactionProof.staleReadbackGuard.requiredSelectionHash === viewport3d.selectionHash
    && viewport3d.interactionProof.staleReadbackGuard.requiredPreviewGhostId === viewport3d.previewGhostId
    && viewport3d.interactionProof.staleReadbackGuard.mismatchPolicy === 'failed_closed'
    && viewport3d.interactionProof.scriptedActions.length === 3
    && viewport3d.interactionProof.actorOrigins.includes('gui')
    && viewport3d.interactionProof.actorOrigins.includes('agent');
  const viewport3dReady = viewport3d.readiness === 'ready' && viewport3d.canvasMarker === 'studio-3d-webgl-canvas' && viewport3d.visibleRenderableCount > 0 && viewport3d.selectedRenderableId !== null && viewport3d.previewGhostId !== null && viewport3d.appliedRenderableId !== null && viewport3dCanvasDom.canvasElementPresent && interactionProofReady;
  const ready = appMissingMarkers.length === 0 && proofMissingMarkers.length === 0 && missingTimelineCommandIds.length === 0 && visualChanged && v1.reviewArtifact.captureReadiness === 'ready' && viewport3dReady;
  const artifact: BrowserCaptureArtifact = {
    schemaVersion: 1,
    artifactKind: 'browser_visual_capture_proof',
    taskId: 3043,
    generatedAtIso: new Date().toISOString(),
    proofCommand: 'pnpm run proof:browser',
    editorShellTarget: {
      mockupPath: editorShellMockupPath,
      comparisonMode: 'structural_semantic_markers',
      pixelPerfect: false,
    },
    captureBackend: {
      runtime: 'chromium_headless_cli',
      captureMode: 'browser_screenshot',
      renderSurface: 'vite_static_dist_app_route',
      gpuClaim: 'not_claimed',
    },
    linkedV1Proof: {
      path: relative(root, v1ProofPath),
      sha256: sha256Text(v1ProofText),
      artifactKind: v1.artifactKind,
      proofStepCount: v1.proofSteps.length,
    },
    routes: capture.urls,
    readiness: {
      status: ready ? 'ready' : 'failed_closed',
      requiredMarkers: [...requiredAppMarkers, ...requiredProofMarkers],
      markerGroups,
      appMissingMarkers,
      proofMissingMarkers,
    },
    correlation: {
      status: missingTimelineCommandIds.length === 0 && visualChanged && v1.reviewArtifact.captureReadiness === 'ready' && viewport3dReady ? 'matched' : 'failed_closed',
      timelineCommandIds,
      missingTimelineCommandIds,
      visualHashDelta: {
        beforeRenderHash: visual?.beforeRenderHash ?? null,
        afterRenderHash: visual?.afterRenderHash ?? null,
        changed: visualChanged,
      },
      reviewArtifactId: v1.reviewArtifact.artifactId,
      reviewCaptureReadiness: v1.reviewArtifact.captureReadiness,
    },
    viewport3d,
    viewport3dCanvasDom,
    screenshots: capture.screenshots,
    comparison: {
      status: visualChanged && capture.screenshots.length >= 2 ? 'changed' : 'failed_closed',
      beforeAfterSource: 'linked_v1_proof_artifact',
      screenshotCount: capture.screenshots.length,
    },
    knownLimitations: [
      'Browser capture is Chromium headless screenshot evidence of the Studio app/proof routes; it does not claim Agora compositor capture.',
      'Browser capture correlates with the linked V1 proof artifact and ASHA public evidence hashes; it does not claim native runtime bridge or hardware GPU/performance evidence.',
    ],
  };
  writeFileSync(join(outDir, 'index.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  if (!ready) {
    throw new Error(`browser visual capture failed closed: appMissing=${appMissingMarkers.join(', ') || 'none'} proofMissing=${proofMissingMarkers.join(', ') || 'none'} timelineMissing=${missingTimelineCommandIds.join(', ') || 'none'} visualChanged=${String(visualChanged)} viewport3dReady=${String(viewport3dReady)} canvasElementCount=${viewport3dCanvasDom.canvasElementCount}`);
  }
  console.log(`asha-studio browser visual capture: OK (${relative(root, join(outDir, 'index.json'))})`);
}

await main();
