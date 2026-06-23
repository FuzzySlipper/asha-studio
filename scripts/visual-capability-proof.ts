import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

interface BrowserCaptureArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'browser_visual_capture_proof';
  readonly readiness: { readonly status: 'ready' | 'failed_closed' };
  readonly correlation: {
    readonly status: 'matched' | 'failed_closed';
    readonly timelineCommandIds: readonly string[];
    readonly missingTimelineCommandIds: readonly string[];
    readonly visualHashDelta: { readonly beforeRenderHash: string | null; readonly afterRenderHash: string | null; readonly changed: boolean };
    readonly reviewArtifactId: string;
    readonly reviewCaptureReadiness: string;
  };
  readonly captureBackend: { readonly runtime: string; readonly captureMode: string; readonly gpuClaim: string };
  readonly viewport3d?: {
    readonly artifactKind: 'viewport_3d_readback';
    readonly readiness: 'ready' | 'failed_closed';
    readonly sceneId: string;
    readonly cameraId: string;
    readonly projectionAuthority: string;
    readonly visibleRenderableCount: number;
    readonly selectedRenderableId: string | null;
    readonly previewGhostId: string | null;
    readonly appliedRenderableId: string | null;
    readonly selectionHash: string;
    readonly interactionProof: {
      readonly readiness: 'ready' | 'failed_closed';
      readonly toolState: { readonly activeTool: string; readonly cameraBeforeHash: string; readonly cameraAfterHash: string; readonly cameraChanged: boolean };
      readonly scriptedActions: readonly { readonly actionId: string; readonly actor: string; readonly sequenceId: string }[];
      readonly actorOrigins: readonly string[];
    };
    readonly pickEvidence?: {
      readonly artifactKind: 'viewport_pick_hit_test_evidence';
      readonly readiness: 'ready' | 'failed_closed';
      readonly sourceTimelineCommandId: string;
      readonly sourceTimelineSequenceId: string;
      readonly cameraHash: string;
      readonly cameraProjectionHash: string;
      readonly viewportHash: string;
      readonly hit: { readonly outcome: string; readonly renderableId: string; readonly voxelId: string; readonly face: string; readonly rayHash: string; readonly selectionHash: string };
      readonly backgroundNoHit: { readonly outcome: string; readonly reason: string; readonly rayHash: string };
      readonly crossChecks: { readonly selectedRenderableId: string; readonly inspectorSelectedVoxelId: string; readonly hierarchyNodeId: string; readonly editAnchorVoxelId: string; readonly timelineCommandId: string; readonly selectionHash: string };
      readonly staleReadbackGuard: { readonly mismatchPolicy: string; readonly requiredCameraHash: string; readonly requiredCameraProjectionHash: string; readonly requiredViewportHash: string; readonly requiredSelectionHash: string; readonly requiredHitRenderableId: string; readonly requiredNoHitRayHash: string };
    };
    readonly renderables?: readonly { readonly renderableId: string; readonly kind: string; readonly sourceState: string; readonly visible: boolean; readonly pickable: boolean; readonly materialRef: string | number | null; readonly meshRef: string | null; readonly renderHash: string }[];
    readonly limitations: readonly string[];
  };
  readonly viewportVisualDelta?: {
    readonly artifactKind: 'viewport_visual_delta_crop_proof';
    readonly readiness: 'ready' | 'failed_closed';
    readonly beforeSceneHash: string | null;
    readonly afterSceneHash: string | null;
    readonly sceneHashChanged: boolean;
    readonly cropHashChanged: boolean;
    readonly beforeCrop: { readonly cropPath: string; readonly cropSha256: string; readonly screenshotPath: string; readonly linkedCommandId: string; readonly renderableId: string; readonly voxelId: string; readonly sourceState: { readonly phase: string; readonly sourceSceneHash: string } };
    readonly afterCrop: { readonly cropPath: string; readonly cropSha256: string; readonly screenshotPath: string; readonly linkedCommandId: string; readonly renderableId: string; readonly voxelId: string; readonly sourceState: { readonly phase: string; readonly sourceSceneHash: string } };
    readonly staleReadbackGuard: { readonly mismatchPolicy: string; readonly requiredBeforeSceneHash: string | null; readonly requiredAfterSceneHash: string | null; readonly requiredBeforeCropHash: string; readonly requiredAfterCropHash: string };
  };
  readonly screenshots: readonly { readonly name: string; readonly path: string; readonly sha256: string }[];
  readonly knownLimitations: readonly string[];
}

interface VisualContractProof {
  readonly artifactKind: 'asha_studio_current_visual_contract_proof';
  readonly service: { readonly mode: string; readonly host: string; readonly baseUrl: string };
  readonly candidateContract: string;
  readonly negativeCandidate: string;
  readonly targetContract: string;
  readonly currentCompare: { readonly runId: string; readonly verdict: string; readonly failureCount: number; readonly reportArtifact: string; readonly diffOverlayArtifact: string; readonly localReportArtifact: string; readonly localDiffOverlayArtifact: string };
  readonly negativeCompare: { readonly runId: string; readonly verdict: string; readonly failureCount: number; readonly failures: readonly string[]; readonly reportArtifact: string; readonly diffOverlayArtifact: string; readonly localReportArtifact: string; readonly localDiffOverlayArtifact: string };
  readonly capture: { readonly requiredVisualObjects: readonly string[]; readonly rootSelector: string; readonly captureMode: string; readonly viewport: { readonly width_px: number; readonly height_px: number } };
  readonly limitations: readonly string[];
}

type CapabilityStatus = 'ready' | 'failed_closed';
type DiagnosticSeverity = 'info' | 'warning' | 'error';

interface CapabilityDiagnostic {
  readonly groupId: string;
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly evidencePath: string | null;
}

interface CapabilityGroup {
  readonly groupId: 'scene_readback' | 'pick' | 'visual_delta_crop' | 'visual_contract_layout_affordance' | 'command_authority_correlation' | 'non_claim_limitations';
  readonly label: string;
  readonly status: CapabilityStatus;
  readonly diagnostics: readonly CapabilityDiagnostic[];
  readonly evidence: unknown;
}

interface VisualCapabilityProof {
  readonly schemaVersion: 1;
  readonly artifactKind: 'studio_visual_capability_proof';
  readonly taskId: 3046;
  readonly readiness: CapabilityStatus;
  readonly generatedAtIso: string;
  readonly proofCommand: 'pnpm run proof:visual-capability';
  readonly inputArtifacts: {
    readonly browserCapture: { readonly path: string; readonly sha256: string; readonly artifactKind: string };
    readonly visualContract: { readonly path: string; readonly sha256: string; readonly artifactKind: string };
  };
  readonly summary: {
    readonly renderedObjectIds: readonly string[];
    readonly visibleRenderableCount: number;
    readonly selectedObject: string | null;
    readonly previewObject: string | null;
    readonly appliedObject: string | null;
    readonly beforeRenderHash: string | null;
    readonly afterRenderHash: string | null;
    readonly beforeCropPath: string | null;
    readonly afterCropPath: string | null;
    readonly visualContractRunIds: readonly string[];
    readonly nonClaims: readonly string[];
  };
  readonly capabilityGroups: readonly CapabilityGroup[];
  readonly negativeSmokes: readonly {
    readonly smokeId: string;
    readonly expectedGroup: CapabilityGroup['groupId'];
    readonly status: 'expected_failed_closed';
    readonly diagnosticCodes: readonly string[];
  }[];
}

const root = process.cwd();
const outDir = join(root, 'artifacts', 'visual-capability', 'latest');
const browserCapturePath = join(root, 'artifacts', 'browser-capture', 'latest', 'index.json');
const visualContractProofPath = join(root, 'fixtures', 'visual-contract', 'asha-studio-current.proof.json');
const fixturePath = join(root, 'fixtures', 'studio-visual-capability-proof.sample.json');
const artifactPath = join(outDir, 'index.json');

function sha256Text(text: string): string {
  return `sha256-${createHash('sha256').update(text).digest('hex')}`;
}

function readJsonWithHash<T>(path: string): { readonly value: T; readonly text: string; readonly sha256: string } {
  if (!existsSync(path)) throw new Error(`missing required proof input: ${path}`);
  const text = readFileSync(path, 'utf8');
  return { value: JSON.parse(text) as T, text, sha256: sha256Text(text) };
}

function diagnostic(groupId: CapabilityGroup['groupId'], code: string, severity: DiagnosticSeverity, message: string, evidencePath: string | null = null): CapabilityDiagnostic {
  return { groupId, code, severity, message, evidencePath };
}

function statusFrom(diagnostics: readonly CapabilityDiagnostic[]): CapabilityStatus {
  return diagnostics.some((item) => item.severity === 'error') ? 'failed_closed' : 'ready';
}

function sceneReadbackGroup(browser: BrowserCaptureArtifact): CapabilityGroup {
  const groupId = 'scene_readback' as const;
  const readback = browser.viewport3d;
  const diagnostics: CapabilityDiagnostic[] = [];
  if (readback === undefined) {
    diagnostics.push(diagnostic(groupId, 'missing_scene_readback', 'error', 'Viewport 3D scene readback artifact is missing.'));
    return {
      groupId,
      label: 'Scene/camera/renderable readback',
      status: 'failed_closed',
      diagnostics,
      evidence: null,
    };
  }
  const renderables = Array.isArray(readback.renderables) ? readback.renderables : [];
  if (readback.artifactKind !== 'viewport_3d_readback') diagnostics.push(diagnostic(groupId, 'missing_scene_readback', 'error', 'Viewport 3D scene readback artifact is missing.'));
  if (readback.readiness !== 'ready') diagnostics.push(diagnostic(groupId, 'scene_readback_not_ready', 'error', `Viewport 3D readback readiness is ${readback.readiness}.`));
  if (readback.visibleRenderableCount < 1 || renderables.length < 1) diagnostics.push(diagnostic(groupId, 'missing_visible_renderables', 'error', 'No visible renderables were reported.'));
  if (readback.selectedRenderableId === null) diagnostics.push(diagnostic(groupId, 'missing_selected_renderable', 'error', 'Selected renderable is missing from scene readback.'));
  if (readback.previewGhostId === null) diagnostics.push(diagnostic(groupId, 'missing_preview_ghost', 'error', 'Preview ghost is missing from scene readback.'));
  if (readback.appliedRenderableId === null) diagnostics.push(diagnostic(groupId, 'missing_applied_renderable', 'error', 'Applied renderable is missing from scene readback.'));
  const cameraChanged = readback.interactionProof?.toolState?.cameraChanged === true;
  if (!cameraChanged) diagnostics.push(diagnostic(groupId, 'camera_did_not_change', 'error', 'Camera/tool proof did not record a deterministic camera delta.'));
  return {
    groupId,
    label: 'Scene/camera/renderable readback',
    status: statusFrom(diagnostics),
    diagnostics,
    evidence: {
      sceneId: readback.sceneId,
      cameraId: readback.cameraId,
      projectionAuthority: readback.projectionAuthority,
      camera: {
        activeTool: readback.interactionProof?.toolState?.activeTool ?? null,
        beforeHash: readback.interactionProof?.toolState?.cameraBeforeHash ?? null,
        afterHash: readback.interactionProof?.toolState?.cameraAfterHash ?? null,
        changed: cameraChanged,
      },
      renderedObjects: renderables.map((renderable) => ({ renderableId: renderable.renderableId, kind: renderable.kind, sourceState: renderable.sourceState, visible: renderable.visible, pickable: renderable.pickable, materialRef: renderable.materialRef, meshRef: renderable.meshRef, renderHash: renderable.renderHash })),
      visibleRenderableCount: readback.visibleRenderableCount,
      selectedRenderableId: readback.selectedRenderableId,
      previewGhostId: readback.previewGhostId,
      appliedRenderableId: readback.appliedRenderableId,
      selectionHash: readback.selectionHash,
      interactionActions: readback.interactionProof?.scriptedActions ?? [],
    },
  };
}

function pickGroup(browser: BrowserCaptureArtifact): CapabilityGroup {
  const groupId = 'pick' as const;
  const readback = browser.viewport3d;
  const pick = readback?.pickEvidence;
  const diagnostics: CapabilityDiagnostic[] = [];
  if (readback === undefined) diagnostics.push(diagnostic(groupId, 'missing_scene_readback', 'error', 'Pick evidence cannot be evaluated because viewport 3D scene readback is missing.'));
  if (pick === undefined) diagnostics.push(diagnostic(groupId, 'missing_pick_evidence', 'error', 'Pick evidence is missing from viewport 3D readback.'));
  if (pick?.readiness !== 'ready') diagnostics.push(diagnostic(groupId, 'pick_evidence_not_ready', 'error', `Pick evidence readiness is ${pick?.readiness ?? 'missing'}.`));
  if (pick?.hit.outcome !== 'hit') diagnostics.push(diagnostic(groupId, 'missing_positive_pick_hit', 'error', 'Positive selected-target pick did not report a hit.'));
  if (pick?.backgroundNoHit.outcome !== 'no_hit') diagnostics.push(diagnostic(groupId, 'missing_background_no_hit', 'error', 'Background negative pick did not report a no-hit result.'));
  if (pick?.hit.renderableId !== readback?.selectedRenderableId) diagnostics.push(diagnostic(groupId, 'pick_hit_selection_mismatch', 'error', 'Pick hit renderable does not match selected renderable.'));
  if (pick?.crossChecks.timelineCommandId !== 'selection.voxel_from_screen_point') diagnostics.push(diagnostic(groupId, 'pick_timeline_mismatch', 'error', 'Pick evidence is not linked to selection.voxel_from_screen_point.'));
  if (pick?.staleReadbackGuard.mismatchPolicy !== 'failed_closed') diagnostics.push(diagnostic(groupId, 'pick_guard_not_fail_closed', 'error', 'Pick stale-readback guard does not fail closed.'));
  return {
    groupId,
    label: 'Viewport pick/hit-test evidence',
    status: statusFrom(diagnostics),
    diagnostics,
    evidence: pick === undefined ? null : {
      sourceTimelineCommandId: pick.sourceTimelineCommandId,
      sourceTimelineSequenceId: pick.sourceTimelineSequenceId,
      cameraHash: pick.cameraHash,
      cameraProjectionHash: pick.cameraProjectionHash,
      viewportHash: pick.viewportHash,
      hit: pick.hit,
      backgroundNoHit: pick.backgroundNoHit,
      crossChecks: pick.crossChecks,
      staleReadbackGuard: pick.staleReadbackGuard,
    },
  };
}

function visualDeltaGroup(browser: BrowserCaptureArtifact): CapabilityGroup {
  const groupId = 'visual_delta_crop' as const;
  const delta = browser.viewportVisualDelta;
  const diagnostics: CapabilityDiagnostic[] = [];
  if (delta === undefined) diagnostics.push(diagnostic(groupId, 'missing_visual_delta', 'error', 'Viewport visual delta crop proof is missing.'));
  if (delta?.readiness !== 'ready') diagnostics.push(diagnostic(groupId, 'visual_delta_not_ready', 'error', `Visual delta readiness is ${delta?.readiness ?? 'missing'}.`));
  if (delta?.sceneHashChanged !== true) diagnostics.push(diagnostic(groupId, 'stale_visual_delta_scene_hash', 'error', 'Before/after scene hashes did not change.'));
  if (delta?.cropHashChanged !== true) diagnostics.push(diagnostic(groupId, 'stale_visual_delta_crop_hash', 'error', 'Before/after crop hashes did not change.'));
  if (delta?.beforeCrop.screenshotPath === delta?.afterCrop.screenshotPath) diagnostics.push(diagnostic(groupId, 'visual_delta_same_screenshot_source', 'error', 'Before/after crops came from the same screenshot source.'));
  if (delta?.beforeCrop.linkedCommandId !== 'preview.voxel_brush') diagnostics.push(diagnostic(groupId, 'visual_delta_before_command_mismatch', 'error', 'Before crop is not linked to preview.voxel_brush.'));
  if (delta?.afterCrop.linkedCommandId !== 'authority.voxel.apply_brush') diagnostics.push(diagnostic(groupId, 'visual_delta_after_command_mismatch', 'error', 'After crop is not linked to authority.voxel.apply_brush.'));
  if (delta?.staleReadbackGuard.mismatchPolicy !== 'failed_closed') diagnostics.push(diagnostic(groupId, 'visual_delta_guard_not_fail_closed', 'error', 'Visual-delta stale-readback guard does not fail closed.'));
  return {
    groupId,
    label: 'Before/after screenshot crop delta',
    status: statusFrom(diagnostics),
    diagnostics,
    evidence: delta === undefined ? null : {
      beforeSceneHash: delta.beforeSceneHash,
      afterSceneHash: delta.afterSceneHash,
      sceneHashChanged: delta.sceneHashChanged,
      cropHashChanged: delta.cropHashChanged,
      beforeCrop: delta.beforeCrop,
      afterCrop: delta.afterCrop,
      staleReadbackGuard: delta.staleReadbackGuard,
      screenshots: browser.screenshots,
    },
  };
}

function visualContractGroup(visualContract: VisualContractProof): CapabilityGroup {
  const groupId = 'visual_contract_layout_affordance' as const;
  const diagnostics: CapabilityDiagnostic[] = [];
  if (visualContract.artifactKind !== 'asha_studio_current_visual_contract_proof') diagnostics.push(diagnostic(groupId, 'missing_visual_contract_proof', 'error', 'ASHA Studio visual-contract proof is missing.'));
  if (visualContract.service.mode !== 'deployed_den_srv') diagnostics.push(diagnostic(groupId, 'visual_contract_not_deployed_service', 'error', `Visual-contract service mode is ${visualContract.service.mode}.`));
  if (visualContract.currentCompare.verdict !== 'pass') diagnostics.push(diagnostic(groupId, 'visual_contract_candidate_failed', 'error', 'Current Studio visual-contract candidate did not pass target comparison.', visualContract.currentCompare.localReportArtifact));
  if (visualContract.currentCompare.failureCount !== 0) diagnostics.push(diagnostic(groupId, 'visual_contract_candidate_failures_present', 'error', 'Current Studio visual-contract candidate reported failures.', visualContract.currentCompare.localReportArtifact));
  if (visualContract.negativeCompare.verdict !== 'fail') diagnostics.push(diagnostic(groupId, 'visual_contract_negative_not_failed', 'error', 'Negative visual-contract smoke did not fail closed.', visualContract.negativeCompare.localReportArtifact));
  for (const expected of ['selected_target_inspector_exists', 'central_viewport_is_dominant']) {
    if (!visualContract.negativeCompare.failures.includes(expected)) diagnostics.push(diagnostic(groupId, `visual_contract_negative_missing_${expected}`, 'error', `Negative visual-contract smoke did not include ${expected}.`, visualContract.negativeCompare.localReportArtifact));
  }
  return {
    groupId,
    label: 'Visual-contract layout/affordance evidence',
    status: statusFrom(diagnostics),
    diagnostics,
    evidence: {
      service: visualContract.service,
      candidateContract: visualContract.candidateContract,
      targetContract: visualContract.targetContract,
      markerCoverage: visualContract.capture.requiredVisualObjects,
      capture: visualContract.capture,
      currentCompare: visualContract.currentCompare,
      negativeCompare: visualContract.negativeCompare,
      limitations: visualContract.limitations,
    },
  };
}

function commandAuthorityGroup(browser: BrowserCaptureArtifact): CapabilityGroup {
  const groupId = 'command_authority_correlation' as const;
  const diagnostics: CapabilityDiagnostic[] = [];
  const requiredCommands = ['inspection.editor_state', 'selection.voxel_from_screen_point', 'preview.voxel_brush', 'authority.voxel.apply_brush', 'render.capture_before_after', 'export.agent_readout'];
  const missing = requiredCommands.filter((commandId) => !browser.correlation.timelineCommandIds.includes(commandId));
  if (missing.length > 0) diagnostics.push(diagnostic(groupId, 'missing_timeline_commands', 'error', `Missing timeline command IDs: ${missing.join(', ')}.`));
  if (browser.correlation.status !== 'matched') diagnostics.push(diagnostic(groupId, 'command_correlation_not_matched', 'error', `Browser capture correlation status is ${browser.correlation.status}.`));
  if (browser.correlation.reviewCaptureReadiness !== 'ready') diagnostics.push(diagnostic(groupId, 'review_capture_not_ready', 'error', `Review capture readiness is ${browser.correlation.reviewCaptureReadiness}.`));
  if (browser.correlation.visualHashDelta.changed !== true) diagnostics.push(diagnostic(groupId, 'authority_render_hash_delta_missing', 'error', 'Authority/render before/after hashes did not change.'));
  return {
    groupId,
    label: 'Command, authority, and render-hash correlation',
    status: statusFrom(diagnostics),
    diagnostics,
    evidence: {
      timelineCommandIds: browser.correlation.timelineCommandIds,
      missingTimelineCommandIds: browser.correlation.missingTimelineCommandIds,
      reviewArtifactId: browser.correlation.reviewArtifactId,
      reviewCaptureReadiness: browser.correlation.reviewCaptureReadiness,
      visualHashDelta: browser.correlation.visualHashDelta,
    },
  };
}

function limitationsGroup(browser: BrowserCaptureArtifact, visualContract: VisualContractProof): CapabilityGroup {
  const groupId = 'non_claim_limitations' as const;
  const diagnostics: CapabilityDiagnostic[] = [];
  const limitations = [...browser.knownLimitations, ...(browser.viewport3d?.limitations ?? []), ...visualContract.limitations];
  if (browser.captureBackend.gpuClaim !== 'not_claimed') diagnostics.push(diagnostic(groupId, 'unsupported_gpu_claim', 'error', `Browser capture GPU claim is ${browser.captureBackend.gpuClaim}.`));
  for (const forbidden of ['Agora compositor capture', 'native runtime bridge', 'hardware GPU/performance']) {
    if (!limitations.some((limitation) => limitation.includes(forbidden))) diagnostics.push(diagnostic(groupId, `missing_non_claim_${forbidden.replace(/\W+/gu, '_').toLowerCase()}`, 'error', `Missing non-claim limitation mentioning ${forbidden}.`));
  }
  return {
    groupId,
    label: 'Non-claim and limitation guardrails',
    status: statusFrom(diagnostics),
    diagnostics,
    evidence: {
      captureBackend: browser.captureBackend,
      limitations,
      policy: 'browser/Three.js/visual-contract evidence must not be classified as Rust/WASM authority, native runtime, Agora compositor, hardware GPU, or performance evidence.',
    },
  };
}

export function buildProof(browser: BrowserCaptureArtifact, visualContract: VisualContractProof, inputHashes: VisualCapabilityProof['inputArtifacts']): VisualCapabilityProof {
  const groups = [
    sceneReadbackGroup(browser),
    pickGroup(browser),
    visualDeltaGroup(browser),
    visualContractGroup(visualContract),
    commandAuthorityGroup(browser),
    limitationsGroup(browser, visualContract),
  ] satisfies readonly CapabilityGroup[];
  const ready = groups.every((group) => group.status === 'ready');
  const readback = browser.viewport3d;
  const renderables = Array.isArray(readback?.renderables) ? readback.renderables : [];
  return {
    schemaVersion: 1,
    artifactKind: 'studio_visual_capability_proof',
    taskId: 3046,
    readiness: ready ? 'ready' : 'failed_closed',
    generatedAtIso: new Date().toISOString(),
    proofCommand: 'pnpm run proof:visual-capability',
    inputArtifacts: inputHashes,
    summary: {
      renderedObjectIds: renderables.map((renderable) => renderable.renderableId),
      visibleRenderableCount: readback?.visibleRenderableCount ?? 0,
      selectedObject: readback?.selectedRenderableId ?? null,
      previewObject: readback?.previewGhostId ?? null,
      appliedObject: readback?.appliedRenderableId ?? null,
      beforeRenderHash: browser.correlation.visualHashDelta.beforeRenderHash,
      afterRenderHash: browser.correlation.visualHashDelta.afterRenderHash,
      beforeCropPath: browser.viewportVisualDelta?.beforeCrop.cropPath ?? null,
      afterCropPath: browser.viewportVisualDelta?.afterCrop.cropPath ?? null,
      visualContractRunIds: [visualContract.currentCompare.runId, visualContract.negativeCompare.runId],
      nonClaims: ['not_native_runtime', 'not_wasm_authority', 'not_agora_compositor', 'not_hardware_gpu', 'not_performance_evidence'],
    },
    capabilityGroups: groups,
    negativeSmokes: [
      { smokeId: 'negative_missing_scene_readback', expectedGroup: 'scene_readback', status: 'expected_failed_closed', diagnosticCodes: ['missing_scene_readback'] },
      { smokeId: 'negative_missing_pick_evidence', expectedGroup: 'pick', status: 'expected_failed_closed', diagnosticCodes: ['missing_pick_evidence'] },
      { smokeId: 'negative_stale_visual_delta', expectedGroup: 'visual_delta_crop', status: 'expected_failed_closed', diagnosticCodes: ['stale_visual_delta_scene_hash', 'stale_visual_delta_crop_hash'] },
      { smokeId: 'negative_missing_failed_visual_contract_proof', expectedGroup: 'visual_contract_layout_affordance', status: 'expected_failed_closed', diagnosticCodes: ['missing_visual_contract_proof', 'visual_contract_candidate_failed'] },
      { smokeId: 'negative_unsupported_evidence_claims', expectedGroup: 'non_claim_limitations', status: 'expected_failed_closed', diagnosticCodes: ['unsupported_gpu_claim'] },
    ],
  };
}

function main(): void {
  const browserInput = readJsonWithHash<BrowserCaptureArtifact>(browserCapturePath);
  const visualContractInput = readJsonWithHash<VisualContractProof>(visualContractProofPath);
  const proof = buildProof(browserInput.value, visualContractInput.value, {
    browserCapture: { path: relative(root, browserCapturePath), sha256: browserInput.sha256, artifactKind: browserInput.value.artifactKind },
    visualContract: { path: relative(root, visualContractProofPath), sha256: visualContractInput.sha256, artifactKind: visualContractInput.value.artifactKind },
  });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(proof, null, 2)}\n`);
  writeFileSync(fixturePath, `${JSON.stringify(proof, null, 2)}\n`);
  if (proof.readiness !== 'ready') {
    const failures = proof.capabilityGroups.flatMap((group) => group.diagnostics.filter((item) => item.severity === 'error').map((item) => `${group.groupId}:${item.code}`));
    throw new Error(`visual capability proof failed closed: ${failures.join(', ')}`);
  }
  console.log(`asha-studio visual capability proof: OK (${relative(root, artifactPath)})`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
