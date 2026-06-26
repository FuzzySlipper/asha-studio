import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, 'artifacts', 'agora-compositor', 'latest', 'index.json');

function fail(message) {
  console.error(`asha-studio agora compositor capture readback: FAIL: ${message}`);
  process.exit(1);
}

function sha256Bytes(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}
function sha256Text(text) {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

if (!existsSync(artifactPath)) fail('missing artifacts/agora-compositor/latest/index.json; run pnpm run proof:agora-compositor first');
const proof = JSON.parse(readFileSync(artifactPath, 'utf8'));

if (proof.schemaVersion !== 1) fail(`schemaVersion must be 1, got ${proof.schemaVersion}`);
if (proof.artifactKind !== 'agora_compositor_capture_proof') fail('artifactKind must be agora_compositor_capture_proof');
if (proof.taskId !== 3219) fail('taskId must be 3219');
if (proof.readiness !== 'ready') fail(`readiness is ${proof.readiness}`);
if (proof.proofCommand !== 'pnpm run proof:agora-compositor') fail('proofCommand mismatch');

// Backend classification distinguishes compositor capture from a browser screenshot.
if (proof.captureBackend !== 'agora_compositor') fail('captureBackend must be agora_compositor');
if (proof.captureMode !== 'compositor_surface') fail('captureMode must be compositor_surface');
if (typeof proof.compositorCaptureBackend !== 'string' || proof.compositorCaptureBackend.length === 0) fail('missing compositorCaptureBackend');
if (proof.evidenceClass !== 'viewport_screenshot') fail(`evidenceClass must be viewport_screenshot, got ${proof.evidenceClass}`);

// GPU/performance non-claims must be preserved; not_agora_compositor must NOT be asserted by this backend.
for (const claim of ['not_hardware_gpu', 'not_performance_evidence', 'not_native_runtime', 'not_wasm_authority']) {
  if (!Array.isArray(proof.nonClaims) || !proof.nonClaims.includes(claim)) fail(`missing required non-claim ${claim}`);
}
if (proof.nonClaims.includes('not_agora_compositor')) fail('agora backend must not assert not_agora_compositor (it IS the compositor capture)');

if (proof.diagnostics.length !== 0) fail(`live proof has diagnostics: ${proof.diagnostics.map((d) => d.code).join(', ')}`);

// Nonblank frame: both the compositor status and the independent metric.
const frame = proof.frame;
if (frame.nonBlank !== true) fail('frame.nonBlank must be true');
if (frame.visualInspectionStatus !== 'visible') fail(`compositor visual_inspection status is ${frame.visualInspectionStatus}`);
if (!(frame.independentDistinctColors >= 64)) fail(`independent distinct colours ${frame.independentDistinctColors} below minimum`);
if (!(frame.independentPixelStdDev >= 0.02)) fail(`independent pixel stddev ${frame.independentPixelStdDev} below minimum`);

// Surface identity + dimensions. The surface title is the deterministic launcher tag, and the
// captured frame's surface id must match the launched surface.
if (!proof.surface.title.includes(proof.launch.expectedTitle)) fail(`surface title ${proof.surface.title} missing expected ${proof.launch.expectedTitle}`);
if (proof.launch.expectedTitle !== 'ASHA-STUDIO-AGORA-PROOF') fail(`unexpected launch title tag ${proof.launch.expectedTitle}`);
if (frame.surfaceId !== proof.surface.surfaceId) fail('frame surface id does not match launched surface id');
if (!(frame.width >= 1000 && frame.height >= 1000)) fail(`frame ${frame.width}x${frame.height} below minimum`);

// Freshness: capture occurred during this launch's lifetime. (frame_count is informational only —
// the visible nonblank readback above is the authoritative "a frame was presented" signal.)
if (!(frame.freshnessMs > 0)) fail(`freshnessMs must be positive, got ${frame.freshnessMs}`);

// Correlation with the studio command timeline (and the optional visual capability proof).
if (proof.correlation.status !== 'matched') fail('correlation status is not matched');
if (frame.ashaCommandSequenceId !== proof.correlation.renderCaptureSequenceId) fail('frame sequence stamp != studio render.capture sequence');
if (!proof.correlation.timelineSequenceIds.includes(frame.ashaCommandSequenceId)) fail('frame sequence absent from studio timeline');
const vc = proof.correlation.visualCapability;
if (vc.present) {
  if (vc.readiness !== 'ready') fail('referenced visual capability proof is not ready');
  if (vc.selectedObject !== proof.correlation.selectedObject) fail('visual capability selected object mismatch');
  if (vc.afterRenderHash !== proof.correlation.afterRenderHash) fail('visual capability after-render hash mismatch');
  const vcPath = join(root, vc.path);
  if (!existsSync(vcPath)) fail(`referenced visual capability artifact missing: ${vc.path}`);
  if (sha256Text(readFileSync(vcPath, 'utf8')) !== vc.sha256) fail('referenced visual capability artifact hash mismatch');
}

// Negative smokes: all five required classes plus the GPU/perf claim guard, each failing closed.
const requiredCodes = ['missing_compositor_capture', 'blank_compositor_frame', 'wrong_surface_identity', 'stale_compositor_frame', 'uncorrelated_studio_timeline', 'unsupported_gpu_or_performance_claim'];
if (!Array.isArray(proof.negativeSmokes) || proof.negativeSmokes.length !== requiredCodes.length) fail(`expected ${requiredCodes.length} negative smokes, got ${proof.negativeSmokes?.length}`);
for (const smoke of proof.negativeSmokes) {
  if (smoke.actualOutcome !== 'failed_closed') fail(`negative smoke ${smoke.id} did not fail closed`);
  if (!smoke.diagnosticCodes.includes(smoke.code)) fail(`negative smoke ${smoke.id} lacks its classified diagnostic`);
}
for (const code of requiredCodes) {
  if (!proof.negativeSmokes.some((s) => s.code === code)) fail(`missing negative smoke for ${code}`);
}

// Listed artifacts must be retrievable and hash-stable (PNG bytes + compositor index copy).
for (const file of proof.artifacts ?? []) {
  const path = join(root, file.path);
  if (!existsSync(path)) fail(`listed artifact missing: ${file.path}`);
  const bytes = readFileSync(path);
  const actual = file.mediaType === 'image/png' ? sha256Bytes(bytes) : sha256Text(bytes.toString('utf8'));
  if (actual !== file.sha256) fail(`sha mismatch for ${file.path}`);
}

console.log(`asha-studio agora compositor capture readback: OK (surface ${proof.surface.surfaceId} "${proof.surface.title}" ${frame.width}x${frame.height}, stamped ${frame.ashaCommandSequenceId}, ${proof.negativeSmokes.length} negative smoke(s))`);
