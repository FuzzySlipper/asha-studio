// Deterministic validation model for the optional Agora compositor capture proof backend.
//
// This module is pure: it never launches the compositor or reads files. The live harness
// (scripts/agora-compositor-capture.ts) collects real `compositorctl` capture evidence and feeds
// it here; the unit test feeds a synthetic evidence fixture. Keeping the validators pure means the
// negative smokes (blank/wrong/stale/missing/uncorrelated) are deterministic and re-checkable from
// the emitted artifact by scripts/readback-agora-compositor-capture.mjs.

export type AgoraCaptureReadiness = 'ready' | 'failed_closed';

export type AgoraCaptureDiagnosticCode =
  | 'missing_compositor_capture'
  | 'blank_compositor_frame'
  | 'wrong_surface_identity'
  | 'stale_compositor_frame'
  | 'uncorrelated_studio_timeline'
  | 'unsupported_gpu_or_performance_claim';

/** This proof classifies its capture path explicitly as an Agora compositor surface capture. */
export const AGORA_CAPTURE_BACKEND = 'agora_compositor' as const;
export const AGORA_CAPTURE_MODE = 'compositor_surface' as const;
/**
 * Non-claims this backend still preserves. A real composited on-screen frame is NOT, by itself,
 * evidence of hardware GPU acceleration, performance, native runtime authority, or WASM authority.
 * Note this list intentionally does NOT include `not_agora_compositor` — this backend IS the
 * compositor capture; that non-claim only describes the separate browser-screenshot backend.
 */
export const AGORA_CAPTURE_NON_CLAIMS: readonly string[] = [
  'not_hardware_gpu',
  'not_performance_evidence',
  'not_native_runtime',
  'not_wasm_authority',
];

/** The compositor `visual_inspection.status` value we accept as a nonblank frame. */
export const AGORA_VISIBLE_STATUS = 'visible' as const;

export interface AgoraCaptureLaunchEvidence {
  readonly launchId: string;
  readonly url: string;
  readonly expectedTitle: string;
  readonly role: string;
  readonly sessionId: string;
  readonly launchStartedEpochMs: number;
}

export interface AgoraCaptureSurfaceEvidence {
  readonly surfaceId: string;
  readonly title: string;
  readonly appId: string;
  readonly role: string;
  readonly width: number;
  readonly height: number;
  readonly focused: boolean;
  readonly frameCountAtCapture: number;
}

export interface AgoraCaptureFrameEvidence {
  readonly present: boolean;
  readonly artifactId: string;
  readonly requestId: string;
  readonly surfaceId: string;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly format: string;
  /** What the compositor itself reported as its capture backend (e.g. `plugin_readback`). */
  readonly compositorCaptureBackend: string;
  readonly evidenceClass: string;
  /** Authoritative compositor-side blank detection. */
  readonly visualInspectionStatus: string;
  readonly compositorUniqueColorsSampled: number;
  /** Independent ImageMagick distinct-colour count of the captured PNG. */
  readonly independentDistinctColors: number;
  /** Independent ImageMagick grayscale standard deviation (0..1) of the captured PNG. */
  readonly independentPixelStdDev: number;
  /** The studio command sequence id stamped onto the compositor capture. */
  readonly ashaCommandSequenceId: string;
  readonly capturedAtEpochMs: number;
}

export interface AgoraCaptureVisualCapabilityRef {
  readonly present: boolean;
  readonly path: string | null;
  readonly sha256: string | null;
  readonly artifactKind: string | null;
  readonly readiness: string | null;
  readonly selectedObject: string | null;
  readonly afterRenderHash: string | null;
}

export interface AgoraStudioCorrelationEvidence {
  readonly renderCaptureCommandId: string;
  readonly renderCaptureSequenceId: string;
  readonly timelineSequenceIds: readonly string[];
  readonly selectedObject: string;
  readonly afterRenderHash: string;
  readonly visualCapability: AgoraCaptureVisualCapabilityRef;
}

export interface AgoraCaptureThresholds {
  readonly minWidth: number;
  readonly minHeight: number;
  readonly minDistinctColors: number;
  readonly minPixelStdDev: number;
  /** Maximum allowed staleness between launch start and capture (ms); guards against a recycled frame. */
  readonly maxFreshnessMs: number;
}

export interface AgoraCaptureEvidence {
  readonly thresholds: AgoraCaptureThresholds;
  readonly nonClaims: readonly string[];
  readonly launch: AgoraCaptureLaunchEvidence;
  readonly surface: AgoraCaptureSurfaceEvidence;
  readonly frame: AgoraCaptureFrameEvidence;
  readonly correlation: AgoraStudioCorrelationEvidence;
}

export interface AgoraCaptureDiagnostic {
  readonly code: AgoraCaptureDiagnosticCode;
  readonly severity: 'error';
  readonly message: string;
}

export interface AgoraCaptureNegativeSmoke {
  readonly id: string;
  readonly code: AgoraCaptureDiagnosticCode;
  readonly scenario: string;
  readonly expectedOutcome: 'failed_closed';
  readonly actualOutcome: AgoraCaptureReadiness;
  readonly diagnosticCodes: readonly AgoraCaptureDiagnosticCode[];
}

export interface AgoraCompositorCaptureProof {
  readonly schemaVersion: 1;
  readonly artifactKind: 'agora_compositor_capture_proof';
  readonly taskId: 3219;
  readonly proofCommand: 'pnpm run proof:agora-compositor';
  readonly captureBackend: typeof AGORA_CAPTURE_BACKEND;
  readonly captureMode: typeof AGORA_CAPTURE_MODE;
  readonly compositorCaptureBackend: string;
  readonly evidenceClass: string;
  readonly readiness: AgoraCaptureReadiness;
  readonly nonClaims: readonly string[];
  readonly launch: AgoraCaptureLaunchEvidence;
  readonly surface: AgoraCaptureSurfaceEvidence;
  readonly frame: AgoraCaptureFrameEvidence & { readonly freshnessMs: number; readonly nonBlank: boolean };
  readonly correlation: AgoraStudioCorrelationEvidence & { readonly status: 'matched' | 'failed_closed' };
  readonly diagnostics: readonly AgoraCaptureDiagnostic[];
  readonly negativeSmokes: readonly AgoraCaptureNegativeSmoke[];
  readonly summary: string;
}

/** Fails closed when no compositor capture artifact/frame was produced for the launched surface. */
export function validateCapturePresence(frame: Pick<AgoraCaptureFrameEvidence, 'present' | 'sha256' | 'artifactId'>): readonly AgoraCaptureDiagnostic[] {
  if (!frame.present || frame.sha256.length === 0 || frame.artifactId.length === 0) {
    return [{ code: 'missing_compositor_capture', severity: 'error', message: 'No compositor capture artifact/frame was produced for the launched Studio surface.' }];
  }
  return [];
}

/**
 * Fails closed on a blank frame. Requires both the compositor's authoritative `visual_inspection`
 * status AND an independent ImageMagick metric (distinct colours + grayscale standard deviation), so
 * a solid/black/no-frame surface cannot pass on either signal alone.
 */
export function validateNonBlank(input: {
  readonly visualInspectionStatus: string;
  readonly independentDistinctColors: number;
  readonly independentPixelStdDev: number;
  readonly minDistinctColors: number;
  readonly minPixelStdDev: number;
}): readonly AgoraCaptureDiagnostic[] {
  const diagnostics: AgoraCaptureDiagnostic[] = [];
  if (input.visualInspectionStatus !== AGORA_VISIBLE_STATUS) {
    diagnostics.push({ code: 'blank_compositor_frame', severity: 'error', message: `Compositor visual_inspection reported status "${input.visualInspectionStatus}", not "${AGORA_VISIBLE_STATUS}".` });
  }
  if (input.independentDistinctColors < input.minDistinctColors || input.independentPixelStdDev < input.minPixelStdDev) {
    diagnostics.push({ code: 'blank_compositor_frame', severity: 'error', message: `Independent pixel check found ${input.independentDistinctColors} distinct colour(s) / stddev ${input.independentPixelStdDev} below the minimum (${input.minDistinctColors} colours / stddev ${input.minPixelStdDev}); frame is blank or near-uniform.` });
  }
  return diagnostics;
}

/**
 * Fails closed when the captured surface is not the expected Studio surface: title mismatch, the
 * captured frame's surface id not matching the launched surface, or dimensions below the minimum
 * (a wrong/placeholder surface).
 */
export function validateSurfaceIdentity(input: {
  readonly surfaceTitle: string;
  readonly expectedTitle: string;
  readonly surfaceId: string;
  readonly frameSurfaceId: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly surfaceWidth: number;
  readonly surfaceHeight: number;
  readonly minWidth: number;
  readonly minHeight: number;
}): readonly AgoraCaptureDiagnostic[] {
  const diagnostics: AgoraCaptureDiagnostic[] = [];
  if (!input.surfaceTitle.includes(input.expectedTitle)) {
    diagnostics.push({ code: 'wrong_surface_identity', severity: 'error', message: `Captured surface title "${input.surfaceTitle}" does not contain the expected Studio title "${input.expectedTitle}".` });
  }
  if (input.frameSurfaceId !== input.surfaceId) {
    diagnostics.push({ code: 'wrong_surface_identity', severity: 'error', message: `Captured frame surface ${input.frameSurfaceId} does not match the launched Studio surface ${input.surfaceId}.` });
  }
  if (input.frameWidth < input.minWidth || input.frameHeight < input.minHeight || input.surfaceWidth < input.minWidth || input.surfaceHeight < input.minHeight) {
    diagnostics.push({ code: 'wrong_surface_identity', severity: 'error', message: `Captured surface ${input.frameWidth}x${input.frameHeight} (surface ${input.surfaceWidth}x${input.surfaceHeight}) is below the minimum ${input.minWidth}x${input.minHeight}.` });
  }
  return diagnostics;
}

/**
 * Fails closed when the frame is stale: captured at or before the launch started, or captured beyond
 * the freshness window (a recycled frame). Note that "a frame was actually presented" is proven by
 * the nonblank `visual_inspection: visible` readback (see validateNonBlank), not by the surface
 * `frame_count` counter — WebKitGTK webview surfaces render visible content without incrementing it,
 * so it is recorded as informational evidence only and is not a freshness gate.
 */
export function validateFreshness(input: {
  readonly capturedAtEpochMs: number;
  readonly launchStartedEpochMs: number;
  readonly maxFreshnessMs: number;
}): readonly AgoraCaptureDiagnostic[] {
  const diagnostics: AgoraCaptureDiagnostic[] = [];
  const freshnessMs = input.capturedAtEpochMs - input.launchStartedEpochMs;
  if (freshnessMs <= 0) {
    diagnostics.push({ code: 'stale_compositor_frame', severity: 'error', message: `Capture timestamp is not after the launch start (freshnessMs=${freshnessMs}); frame predates this launch.` });
  }
  if (freshnessMs > input.maxFreshnessMs) {
    diagnostics.push({ code: 'stale_compositor_frame', severity: 'error', message: `Capture is ${freshnessMs}ms after launch, beyond the ${input.maxFreshnessMs}ms freshness window.` });
  }
  return diagnostics;
}

/**
 * Fails closed when the compositor frame is not correlated with the Studio command timeline: the
 * stamped sequence id must match the studio render.capture sequence and exist in the timeline, and
 * (when present) the referenced visual capability proof must be ready and agree on the selected
 * object and after-render hash.
 */
export function validateCorrelation(input: {
  readonly frameSequenceId: string;
  readonly renderCaptureSequenceId: string;
  readonly timelineSequenceIds: readonly string[];
  readonly selectedObject: string;
  readonly afterRenderHash: string;
  readonly visualCapability: AgoraCaptureVisualCapabilityRef;
}): readonly AgoraCaptureDiagnostic[] {
  const diagnostics: AgoraCaptureDiagnostic[] = [];
  if (input.frameSequenceId !== input.renderCaptureSequenceId) {
    diagnostics.push({ code: 'uncorrelated_studio_timeline', severity: 'error', message: `Compositor frame is stamped ${input.frameSequenceId} but the studio render.capture command is ${input.renderCaptureSequenceId}.` });
  }
  if (!input.timelineSequenceIds.includes(input.frameSequenceId)) {
    diagnostics.push({ code: 'uncorrelated_studio_timeline', severity: 'error', message: `Compositor frame sequence ${input.frameSequenceId} is absent from the studio command timeline.` });
  }
  const vc = input.visualCapability;
  if (vc.present) {
    if (vc.readiness !== 'ready') {
      diagnostics.push({ code: 'uncorrelated_studio_timeline', severity: 'error', message: `Referenced visual capability proof readiness is "${vc.readiness ?? 'null'}", not "ready".` });
    }
    if (vc.selectedObject !== input.selectedObject) {
      diagnostics.push({ code: 'uncorrelated_studio_timeline', severity: 'error', message: `Visual capability selected object ${vc.selectedObject ?? 'null'} disagrees with the correlated selected object ${input.selectedObject}.` });
    }
    if (vc.afterRenderHash !== input.afterRenderHash) {
      diagnostics.push({ code: 'uncorrelated_studio_timeline', severity: 'error', message: `Visual capability after-render hash ${vc.afterRenderHash ?? 'null'} disagrees with the correlated after-render hash ${input.afterRenderHash}.` });
    }
  }
  return diagnostics;
}

/**
 * Fails closed when the proof's declared non-claims drop the hardware GPU / performance guards — i.e.
 * a compositor capture that implicitly upgrades itself into a GPU/performance claim.
 */
export function validateNonClaims(nonClaims: readonly string[]): readonly AgoraCaptureDiagnostic[] {
  const required = ['not_hardware_gpu', 'not_performance_evidence'];
  const missing = required.filter((claim) => !nonClaims.includes(claim));
  if (missing.length > 0) {
    return [{ code: 'unsupported_gpu_or_performance_claim', severity: 'error', message: `Agora compositor capture must preserve non-claims ${missing.join(', ')}; a compositor frame is not GPU/performance evidence.` }];
  }
  return [];
}

function buildNegativeSmokes(evidence: AgoraCaptureEvidence): readonly AgoraCaptureNegativeSmoke[] {
  const { thresholds, surface, frame, launch, correlation } = evidence;
  const smokes: AgoraCaptureNegativeSmoke[] = [];

  const missingDiags = validateCapturePresence({ present: false, sha256: '', artifactId: '' });
  smokes.push({ id: 'negative:missing-compositor-capture', code: 'missing_compositor_capture', scenario: 'The launch produced no compositor capture artifact/frame.', expectedOutcome: 'failed_closed', actualOutcome: missingDiags.some((d) => d.code === 'missing_compositor_capture') ? 'failed_closed' : 'ready', diagnosticCodes: missingDiags.map((d) => d.code) });

  const blankDiags = validateNonBlank({ visualInspectionStatus: 'blank', independentDistinctColors: 1, independentPixelStdDev: 0, minDistinctColors: thresholds.minDistinctColors, minPixelStdDev: thresholds.minPixelStdDev });
  smokes.push({ id: 'negative:blank-compositor-frame', code: 'blank_compositor_frame', scenario: 'The captured surface is a blank/solid frame (compositor status blank, single colour, zero variance).', expectedOutcome: 'failed_closed', actualOutcome: blankDiags.some((d) => d.code === 'blank_compositor_frame') ? 'failed_closed' : 'ready', diagnosticCodes: blankDiags.map((d) => d.code) });

  const wrongDiags = validateSurfaceIdentity({ surfaceTitle: 'Some Other Window', expectedTitle: launch.expectedTitle, surfaceId: surface.surfaceId, frameSurfaceId: surface.surfaceId, frameWidth: frame.width, frameHeight: frame.height, surfaceWidth: surface.width, surfaceHeight: surface.height, minWidth: thresholds.minWidth, minHeight: thresholds.minHeight });
  smokes.push({ id: 'negative:wrong-surface-identity', code: 'wrong_surface_identity', scenario: 'The captured surface is not the expected Studio window (title mismatch).', expectedOutcome: 'failed_closed', actualOutcome: wrongDiags.some((d) => d.code === 'wrong_surface_identity') ? 'failed_closed' : 'ready', diagnosticCodes: wrongDiags.map((d) => d.code) });

  const staleDiags = validateFreshness({ capturedAtEpochMs: launch.launchStartedEpochMs - 1000, launchStartedEpochMs: launch.launchStartedEpochMs, maxFreshnessMs: thresholds.maxFreshnessMs });
  smokes.push({ id: 'negative:stale-compositor-frame', code: 'stale_compositor_frame', scenario: 'The capture predates the launch and the surface had no presented frame.', expectedOutcome: 'failed_closed', actualOutcome: staleDiags.some((d) => d.code === 'stale_compositor_frame') ? 'failed_closed' : 'ready', diagnosticCodes: staleDiags.map((d) => d.code) });

  const uncorrelatedDiags = validateCorrelation({ frameSequenceId: 'seq-not-in-timeline', renderCaptureSequenceId: correlation.renderCaptureSequenceId, timelineSequenceIds: correlation.timelineSequenceIds, selectedObject: correlation.selectedObject, afterRenderHash: correlation.afterRenderHash, visualCapability: correlation.visualCapability });
  smokes.push({ id: 'negative:uncorrelated-studio-timeline', code: 'uncorrelated_studio_timeline', scenario: 'The compositor frame is stamped with a sequence id that is not the studio render.capture command and is absent from the timeline.', expectedOutcome: 'failed_closed', actualOutcome: uncorrelatedDiags.some((d) => d.code === 'uncorrelated_studio_timeline') ? 'failed_closed' : 'ready', diagnosticCodes: uncorrelatedDiags.map((d) => d.code) });

  const claimDiags = validateNonClaims(['not_native_runtime', 'not_wasm_authority']);
  smokes.push({ id: 'negative:unsupported-gpu-or-performance-claim', code: 'unsupported_gpu_or_performance_claim', scenario: 'The proof drops the hardware GPU / performance non-claims, implicitly upgrading a compositor frame into GPU/performance evidence.', expectedOutcome: 'failed_closed', actualOutcome: claimDiags.some((d) => d.code === 'unsupported_gpu_or_performance_claim') ? 'failed_closed' : 'ready', diagnosticCodes: claimDiags.map((d) => d.code) });

  return smokes;
}

/** Builds the deterministic core proof model from collected (live or synthetic) capture evidence. */
export function buildAgoraCompositorCaptureProof(evidence: AgoraCaptureEvidence): AgoraCompositorCaptureProof {
  const { thresholds, launch, surface, frame, correlation } = evidence;
  const freshnessMs = frame.capturedAtEpochMs - launch.launchStartedEpochMs;

  const correlationDiagnostics = validateCorrelation({
    frameSequenceId: frame.ashaCommandSequenceId,
    renderCaptureSequenceId: correlation.renderCaptureSequenceId,
    timelineSequenceIds: correlation.timelineSequenceIds,
    selectedObject: correlation.selectedObject,
    afterRenderHash: correlation.afterRenderHash,
    visualCapability: correlation.visualCapability,
  });
  const blankDiagnostics = validateNonBlank({
    visualInspectionStatus: frame.visualInspectionStatus,
    independentDistinctColors: frame.independentDistinctColors,
    independentPixelStdDev: frame.independentPixelStdDev,
    minDistinctColors: thresholds.minDistinctColors,
    minPixelStdDev: thresholds.minPixelStdDev,
  });

  const diagnostics: AgoraCaptureDiagnostic[] = [
    ...validateCapturePresence(frame),
    ...blankDiagnostics,
    ...validateSurfaceIdentity({
      surfaceTitle: surface.title,
      expectedTitle: launch.expectedTitle,
      surfaceId: surface.surfaceId,
      frameSurfaceId: frame.surfaceId,
      frameWidth: frame.width,
      frameHeight: frame.height,
      surfaceWidth: surface.width,
      surfaceHeight: surface.height,
      minWidth: thresholds.minWidth,
      minHeight: thresholds.minHeight,
    }),
    ...validateFreshness({
      capturedAtEpochMs: frame.capturedAtEpochMs,
      launchStartedEpochMs: launch.launchStartedEpochMs,
      maxFreshnessMs: thresholds.maxFreshnessMs,
    }),
    ...correlationDiagnostics,
    ...validateNonClaims(evidence.nonClaims),
  ];

  const negativeSmokes = buildNegativeSmokes(evidence);
  const negativesFailClosed = negativeSmokes.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.diagnosticCodes.includes(smoke.code));
  const readiness: AgoraCaptureReadiness = diagnostics.length === 0 && negativesFailClosed ? 'ready' : 'failed_closed';
  const nonBlank = blankDiagnostics.length === 0;

  return {
    schemaVersion: 1,
    artifactKind: 'agora_compositor_capture_proof',
    taskId: 3219,
    proofCommand: 'pnpm run proof:agora-compositor',
    captureBackend: AGORA_CAPTURE_BACKEND,
    captureMode: AGORA_CAPTURE_MODE,
    compositorCaptureBackend: frame.compositorCaptureBackend,
    evidenceClass: frame.evidenceClass,
    readiness,
    nonClaims: evidence.nonClaims,
    launch,
    surface,
    frame: { ...frame, freshnessMs, nonBlank },
    correlation: { ...correlation, status: correlationDiagnostics.length === 0 ? 'matched' : 'failed_closed' },
    diagnostics,
    negativeSmokes,
    summary: readiness === 'ready'
      ? `Agora compositor captured Studio surface ${surface.surfaceId} ("${surface.title}", ${frame.width}x${frame.height}) as a nonblank ${AGORA_CAPTURE_MODE} frame, stamped ${frame.ashaCommandSequenceId} and correlated to studio render.capture ${correlation.renderCaptureSequenceId}; ${negativeSmokes.length} negative smoke(s) fail closed.`
      : `Agora compositor capture failed closed: ${diagnostics.map((d) => d.code).join(', ') || 'negative smoke regression'}.`,
  };
}
