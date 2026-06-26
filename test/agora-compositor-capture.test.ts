import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AGORA_CAPTURE_BACKEND,
  AGORA_CAPTURE_MODE,
  AGORA_CAPTURE_NON_CLAIMS,
  buildAgoraCompositorCaptureProof,
  validateCapturePresence,
  validateCorrelation,
  validateFreshness,
  validateNonBlank,
  validateNonClaims,
  validateSurfaceIdentity,
  type AgoraCaptureDiagnosticCode,
  type AgoraCaptureEvidence,
} from '../src/agora-compositor-capture';

// A representative, valid synthetic evidence bundle. The live harness produces the same shape from
// real `compositorctl` output; this fixture keeps the validators/smokes deterministically testable
// without the compositor present.
function syntheticEvidence(overrides: Partial<AgoraCaptureEvidence> = {}): AgoraCaptureEvidence {
  return {
    thresholds: { minWidth: 1000, minHeight: 1000, minDistinctColors: 64, minPixelStdDev: 0.02, maxFreshnessMs: 120_000 },
    nonClaims: [...AGORA_CAPTURE_NON_CLAIMS],
    launch: {
      launchId: 'launch-123-1',
      url: 'http://127.0.0.1:8732/index.html',
      expectedTitle: 'ASHA Studio',
      role: 'toplevel',
      sessionId: 'session-123-1',
      launchStartedEpochMs: 1_000_000,
    },
    surface: {
      surfaceId: 'view-108',
      title: 'ASHA Studio',
      appId: 'agora-webview-helper-1.py',
      role: 'toplevel',
      width: 1332,
      height: 1492,
      focused: true,
      frameCountAtCapture: 3,
    },
    frame: {
      present: true,
      artifactId: 'capture-9-8',
      requestId: 'capture-9-8',
      surfaceId: 'view-108',
      sha256: 'sha256-deadbeef',
      width: 1332,
      height: 1492,
      format: 'png',
      compositorCaptureBackend: 'plugin_readback',
      evidenceClass: 'viewport_screenshot',
      visualInspectionStatus: 'visible',
      compositorUniqueColorsSampled: 17,
      independentDistinctColors: 17865,
      independentPixelStdDev: 0.198792,
      ashaCommandSequenceId: 'seq-0014',
      capturedAtEpochMs: 1_002_500,
    },
    correlation: {
      renderCaptureCommandId: 'render.capture_before_after',
      renderCaptureSequenceId: 'seq-0014',
      timelineSequenceIds: ['seq-0001', 'seq-0014', 'seq-0015'],
      selectedObject: 'selected-voxel:0,0,0',
      afterRenderHash: 'render-grid-fnv1a-8eb9594b',
      visualCapability: {
        present: true,
        path: 'artifacts/visual-capability/latest/index.json',
        sha256: 'sha256-cafef00d',
        artifactKind: 'studio_visual_capability_proof',
        readiness: 'ready',
        selectedObject: 'selected-voxel:0,0,0',
        afterRenderHash: 'render-grid-fnv1a-8eb9594b',
      },
    },
    ...overrides,
  };
}

test('builds a ready agora compositor capture proof from valid evidence', () => {
  const proof = buildAgoraCompositorCaptureProof(syntheticEvidence());
  assert.equal(proof.artifactKind, 'agora_compositor_capture_proof');
  assert.equal(proof.taskId, 3219);
  assert.equal(proof.captureBackend, AGORA_CAPTURE_BACKEND);
  assert.equal(proof.captureMode, AGORA_CAPTURE_MODE);
  assert.equal(proof.compositorCaptureBackend, 'plugin_readback');
  assert.equal(proof.readiness, 'ready');
  assert.equal(proof.diagnostics.length, 0);
  assert.equal(proof.frame.nonBlank, true);
  assert.equal(proof.frame.freshnessMs, 2500);
  assert.equal(proof.correlation.status, 'matched');
  // backend distinguishes itself from a browser screenshot but still preserves GPU/perf non-claims.
  assert.ok(proof.nonClaims.includes('not_hardware_gpu'));
  assert.ok(proof.nonClaims.includes('not_performance_evidence'));
  assert.ok(!proof.nonClaims.includes('not_agora_compositor'));
});

test('all negative smokes fail closed with their classified diagnostic', () => {
  const proof = buildAgoraCompositorCaptureProof(syntheticEvidence());
  const expected: AgoraCaptureDiagnosticCode[] = ['missing_compositor_capture', 'blank_compositor_frame', 'wrong_surface_identity', 'stale_compositor_frame', 'uncorrelated_studio_timeline', 'unsupported_gpu_or_performance_claim'];
  assert.equal(proof.negativeSmokes.length, expected.length);
  for (const code of expected) {
    const smoke = proof.negativeSmokes.find((entry) => entry.code === code);
    assert.ok(smoke, `missing smoke for ${code}`);
    assert.equal(smoke.actualOutcome, 'failed_closed');
    assert.ok(smoke.diagnosticCodes.includes(code));
  }
});

test('blank frame fails closed on either the compositor status or the independent metric', () => {
  assert.equal(validateNonBlank({ visualInspectionStatus: 'blank', independentDistinctColors: 17865, independentPixelStdDev: 0.2, minDistinctColors: 64, minPixelStdDev: 0.02 }).length, 1);
  assert.equal(validateNonBlank({ visualInspectionStatus: 'visible', independentDistinctColors: 1, independentPixelStdDev: 0, minDistinctColors: 64, minPixelStdDev: 0.02 }).length, 1);
  assert.equal(validateNonBlank({ visualInspectionStatus: 'visible', independentDistinctColors: 17865, independentPixelStdDev: 0.2, minDistinctColors: 64, minPixelStdDev: 0.02 }).length, 0);
  const proof = buildAgoraCompositorCaptureProof(syntheticEvidence({ frame: { ...syntheticEvidence().frame, visualInspectionStatus: 'blank' } }));
  assert.equal(proof.readiness, 'failed_closed');
  assert.ok(proof.diagnostics.some((d) => d.code === 'blank_compositor_frame'));
});

test('wrong surface identity fails closed on title, surface id, or dimensions', () => {
  const base = { expectedTitle: 'ASHA Studio', surfaceId: 'view-108', frameSurfaceId: 'view-108', frameWidth: 1332, frameHeight: 1492, surfaceWidth: 1332, surfaceHeight: 1492, minWidth: 1000, minHeight: 1000 };
  assert.equal(validateSurfaceIdentity({ ...base, surfaceTitle: 'ASHA Studio' }).length, 0);
  assert.ok(validateSurfaceIdentity({ ...base, surfaceTitle: 'Other' }).some((d) => d.code === 'wrong_surface_identity'));
  assert.ok(validateSurfaceIdentity({ ...base, surfaceTitle: 'ASHA Studio', frameSurfaceId: 'view-999' }).some((d) => d.code === 'wrong_surface_identity'));
  assert.ok(validateSurfaceIdentity({ ...base, surfaceTitle: 'ASHA Studio', frameWidth: 10, frameHeight: 10 }).some((d) => d.code === 'wrong_surface_identity'));
});

test('stale frame fails closed when capture predates launch or is beyond the freshness window', () => {
  assert.equal(validateFreshness({ capturedAtEpochMs: 2500, launchStartedEpochMs: 0, maxFreshnessMs: 120_000 }).length, 0);
  assert.ok(validateFreshness({ capturedAtEpochMs: -1, launchStartedEpochMs: 0, maxFreshnessMs: 120_000 }).some((d) => d.code === 'stale_compositor_frame'));
  assert.ok(validateFreshness({ capturedAtEpochMs: 0, launchStartedEpochMs: 0, maxFreshnessMs: 120_000 }).some((d) => d.code === 'stale_compositor_frame'));
  assert.ok(validateFreshness({ capturedAtEpochMs: 999_999, launchStartedEpochMs: 0, maxFreshnessMs: 1000 }).some((d) => d.code === 'stale_compositor_frame'));
});

test('correlation fails closed on sequence mismatch and on a stale/missing visual capability ref', () => {
  const common = { renderCaptureSequenceId: 'seq-0014', timelineSequenceIds: ['seq-0014'], selectedObject: 'selected-voxel:0,0,0', afterRenderHash: 'h' };
  const goodVc = { present: true, path: 'p', sha256: 's', artifactKind: 'studio_visual_capability_proof', readiness: 'ready', selectedObject: 'selected-voxel:0,0,0', afterRenderHash: 'h' } as const;
  assert.equal(validateCorrelation({ ...common, frameSequenceId: 'seq-0014', visualCapability: goodVc }).length, 0);
  assert.ok(validateCorrelation({ ...common, frameSequenceId: 'seq-9999', visualCapability: goodVc }).some((d) => d.code === 'uncorrelated_studio_timeline'));
  assert.ok(validateCorrelation({ ...common, frameSequenceId: 'seq-0014', visualCapability: { ...goodVc, readiness: 'failed_closed' } }).some((d) => d.code === 'uncorrelated_studio_timeline'));
  assert.ok(validateCorrelation({ ...common, frameSequenceId: 'seq-0014', visualCapability: { ...goodVc, afterRenderHash: 'other' } }).some((d) => d.code === 'uncorrelated_studio_timeline'));
  // absent visual capability is allowed (optional integration) as long as the timeline correlates.
  assert.equal(validateCorrelation({ ...common, frameSequenceId: 'seq-0014', visualCapability: { present: false, path: null, sha256: null, artifactKind: null, readiness: null, selectedObject: null, afterRenderHash: null } }).length, 0);
});

test('non-claims validator and presence validator fail closed', () => {
  assert.equal(validateNonClaims(['not_hardware_gpu', 'not_performance_evidence']).length, 0);
  assert.ok(validateNonClaims(['not_performance_evidence']).some((d) => d.code === 'unsupported_gpu_or_performance_claim'));
  assert.ok(validateCapturePresence({ present: false, sha256: '', artifactId: '' }).some((d) => d.code === 'missing_compositor_capture'));
  assert.equal(validateCapturePresence({ present: true, sha256: 'x', artifactId: 'y' }).length, 0);
});
