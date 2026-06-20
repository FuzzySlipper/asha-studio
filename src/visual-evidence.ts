import type { StudioCompatibilityEvidence, StudioDiagnostic, StudioSessionMetadata } from './compatibility';
import type { StudioArtifactRef, StudioCommandResult, StudioCommandTimelineEntry, StudioStateEvidence } from './session-workspace';
import type { StudioVoxelWorkflowModel } from './voxel-workflow';

export type StudioVisualArtifactKind = 'visual_before_after' | 'render_evidence' | 'screenshot';
export type StudioCaptureMode = 'renderer_readback' | 'browser_screenshot' | 'agora_capture' | 'software_snapshot' | 'external';
export type StudioEvidenceClassification = 'proof_content' | 'diagnostic_only' | 'degraded' | 'unavailable';
export type StudioCaptureReadiness = 'ready' | 'failed_closed';

export interface StudioVisualEvidenceRef {
  readonly schemaVersion: 1;
  readonly artifactKind: StudioVisualArtifactKind;
  readonly artifactId: string;
  readonly sessionId: string;
  readonly beforeArtifact: StudioArtifactRef | null;
  readonly afterArtifact: StudioArtifactRef | null;
  readonly beforeRenderHash: string | null;
  readonly afterRenderHash: string | null;
  readonly commandSequenceIds: readonly string[];
  readonly captureMode: StudioCaptureMode;
  readonly evidenceClassification: StudioEvidenceClassification;
  readonly captureReadiness: StudioCaptureReadiness;
  readonly summary: string;
  readonly limitations: readonly string[];
}

export interface StudioRepoMetadata {
  readonly repo: string;
  readonly branch: string | null;
  readonly commit: string | null;
  readonly path: string | null;
}

export interface StudioReviewArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'review_export';
  readonly artifactId: string;
  readonly generatedAtIso: string;
  readonly session: StudioSessionMetadata;
  readonly studio: StudioRepoMetadata;
  readonly asha: StudioRepoMetadata;
  readonly compatibility: StudioCompatibilityEvidence;
  readonly commandCatalogHash: string | null;
  readonly commandTimeline: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResult[];
  readonly finalState: StudioStateEvidence;
  readonly visualEvidence: readonly StudioVisualEvidenceRef[];
  readonly exportedArtifacts: readonly StudioArtifactRef[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly knownLimitations: readonly string[];
  readonly captureReadiness: StudioCaptureReadiness;
  readonly reviewSummary: string;
}

function diagnostic(severity: StudioDiagnostic['severity'], code: string, message: string, remediation: string | null = null): StudioDiagnostic {
  return { severity, code, message, owningLane: 'asha-studio', source: 'src/visual-evidence.ts', remediation };
}

function artifactRef(args: {
  readonly artifactId: string;
  readonly artifactKind: StudioArtifactRef['artifactKind'];
  readonly path: string;
  readonly mediaType: string;
  readonly producedBySequenceId: string;
  readonly summary: string;
  readonly contentHash: string | null;
  readonly byteLength: number | null;
}): StudioArtifactRef {
  return {
    artifactId: args.artifactId,
    artifactKind: args.artifactKind,
    pathKind: 'relative_path',
    path: args.path,
    mediaType: args.mediaType,
    contentHash: args.contentHash,
    byteLength: args.byteLength,
    producedBySequenceId: args.producedBySequenceId,
    summary: args.summary,
  };
}

export function createVisualEvidenceForVoxelWorkflow(workflow: StudioVoxelWorkflowModel): readonly StudioVisualEvidenceRef[] {
  const applyEntry = workflow.timelineEntries.find((entry) => entry.commandId === 'authority.voxel.apply_brush');
  const sequenceId = applyEntry?.sequenceId ?? 'seq-unknown';
  const beforeArtifact = artifactRef({
    artifactId: 'artifact-visual-before-0001',
    artifactKind: 'screenshot',
    path: `artifacts/${workflow.sessionId}/before-voxel-grid.svg`,
    mediaType: 'image/svg+xml',
    contentHash: workflow.evidence.renderEvidence.beforeRenderHash,
    byteLength: null,
    producedBySequenceId: sequenceId,
    summary: `Before visual snapshot: ${workflow.evidence.meshEvidence.beforeSummary}`,
  });
  const afterArtifact = artifactRef({
    artifactId: 'artifact-visual-after-0001',
    artifactKind: 'screenshot',
    path: `artifacts/${workflow.sessionId}/after-voxel-grid.svg`,
    mediaType: 'image/svg+xml',
    contentHash: workflow.evidence.renderEvidence.afterRenderHash,
    byteLength: null,
    producedBySequenceId: sequenceId,
    summary: `After visual snapshot: ${workflow.evidence.meshEvidence.afterSummary}`,
  });
  return [{
    schemaVersion: 1,
    artifactKind: 'visual_before_after',
    artifactId: 'artifact-visual-before-after-0001',
    sessionId: workflow.sessionId,
    beforeArtifact,
    afterArtifact,
    beforeRenderHash: workflow.evidence.renderEvidence.beforeRenderHash,
    afterRenderHash: workflow.evidence.renderEvidence.afterRenderHash,
    commandSequenceIds: [sequenceId],
    captureMode: 'software_snapshot',
    evidenceClassification: 'proof_content',
    captureReadiness: 'ready',
    summary: `Software visual before/after evidence for voxel edit at (${workflow.evidence.editAnchor.x}, ${workflow.evidence.editAnchor.y}, ${workflow.evidence.editAnchor.z}); render hashes changed.`,
    limitations: ['Software snapshot evidence is functional proof-content evidence, not browser/Agora/hardware GPU/performance evidence.', 'Browser screenshot capture is available through the separate proof:browser command and correlates back to this review artifact.'],
  }];
}

export function validateReviewArtifactCandidate(args: {
  readonly session: StudioSessionMetadata;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly results: readonly StudioCommandResult[];
  readonly visualEvidence: readonly StudioVisualEvidenceRef[];
}): readonly StudioDiagnostic[] {
  const diagnostics: StudioDiagnostic[] = [];
  if (args.timeline.length === 0) {
    diagnostics.push(diagnostic('error', 'asha-studio.review_export.empty_timeline', 'Review export requires a non-empty command timeline.', 'Run the shared workspace command path before exporting.'));
  }
  if (args.results.length === 0) {
    diagnostics.push(diagnostic('error', 'asha-studio.review_export.empty_results', 'Review export requires command results.', 'Run commands through invokeStudioCommand / typed workflow helpers before exporting.'));
  }
  if (args.visualEvidence.length === 0) {
    diagnostics.push(diagnostic('error', 'asha-studio.review_export.missing_visual_evidence', 'Review export requires visual evidence refs.', 'Capture or synthesize a classified before/after visual evidence ref before exporting.'));
  }
  const resultsBySequence = new Map(args.results.map((result) => [result.sequenceId, result]));
  const timelineBySequence = new Map(args.timeline.map((entry) => [entry.sequenceId, entry]));
  const resultSequences = new Set(resultsBySequence.keys());
  const timelineSequences = new Set(timelineBySequence.keys());
  for (const entry of args.timeline) {
    if (!resultSequences.has(entry.sequenceId)) {
      diagnostics.push(diagnostic('error', 'asha-studio.review_export.stale_timeline', `Timeline sequence ${entry.sequenceId} has no matching command result.`, 'Regenerate the review artifact from the current workspace model.'));
    }
  }
  for (const result of args.results) {
    if (!timelineSequences.has(result.sequenceId)) {
      diagnostics.push(diagnostic('error', 'asha-studio.review_export.orphan_result', `Command result ${result.sequenceId} has no matching timeline entry.`, 'Regenerate the review artifact from the current workspace model.'));
    }
  }
  for (const evidence of args.visualEvidence) {
    if (evidence.captureReadiness !== 'ready') {
      diagnostics.push(diagnostic('error', 'asha-studio.review_export.capture_not_ready', `Visual evidence ${evidence.artifactId} is ${evidence.captureReadiness}.`, 'Use only ready visual evidence for clean review exports.'));
    }
    if (evidence.beforeArtifact === null || evidence.afterArtifact === null) {
      diagnostics.push(diagnostic('error', 'asha-studio.review_export.missing_before_after', `Visual evidence ${evidence.artifactId} is missing a before or after artifact.`, 'Provide stable before and after artifact references.'));
    }
    if (evidence.beforeRenderHash === null || evidence.afterRenderHash === null || evidence.beforeRenderHash === evidence.afterRenderHash) {
      diagnostics.push(diagnostic('error', 'asha-studio.review_export.missing_render_delta', `Visual evidence ${evidence.artifactId} lacks a changed before/after render hash.`, 'Correlate visual evidence to a render/readback delta.'));
    }
    for (const sequenceId of evidence.commandSequenceIds) {
      if (!timelineSequences.has(sequenceId) || !resultSequences.has(sequenceId)) {
        diagnostics.push(diagnostic('error', 'asha-studio.review_export.visual_sequence_missing', `Visual evidence ${evidence.artifactId} references missing command sequence ${sequenceId}.`, 'Reference only command sequence ids present in both timeline and results.'));
        continue;
      }
      const result = resultsBySequence.get(sequenceId);
      const entry = timelineBySequence.get(sequenceId);
      const state = result?.state;
      const missingAuthorityReadback = state?.authorityBeforeHash === null || state?.authorityAfterHash === null;
      const missingRenderReadback = state?.renderBeforeHash === null || state?.renderAfterHash === null;
      const staleAuthorityReadback = state?.authorityBeforeHash !== null && state?.authorityAfterHash !== null && state?.authorityBeforeHash === state?.authorityAfterHash;
      const staleRenderReadback = state?.renderBeforeHash !== null && state?.renderAfterHash !== null && state?.renderBeforeHash === state?.renderAfterHash;
      const notAuthorityMutation = result?.operationClass !== 'authority_mutating' || entry?.changed.authorityChanged !== true;
      if (state === undefined || result === undefined || entry === undefined || missingAuthorityReadback || missingRenderReadback || staleAuthorityReadback || staleRenderReadback || notAuthorityMutation) {
        diagnostics.push(diagnostic(
          'error',
          'asha-studio.review_export.missing_asha_readback',
          `Visual evidence ${evidence.artifactId} references ${sequenceId}, but its ASHA authority/render readback is missing, stale, or not tied to an authority-mutating command.`,
          'Regenerate visual evidence from the authority-mutating command result with non-null changed authority and render before/after hashes.',
        ));
      }
    }
  }
  if (args.session.compatibility.contractsVersion === 'missing' || args.session.compatibility.commandRegistryVersion === 'missing') {
    diagnostics.push(diagnostic('error', 'asha-studio.review_export.compatibility_missing', 'Review export requires present ASHA contracts and command-registry compatibility evidence.', 'Restore required ASHA public package links before exporting.'));
  }
  return diagnostics;
}

export function createStudioReviewArtifact(args: {
  readonly session: StudioSessionMetadata;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly results: readonly StudioCommandResult[];
  readonly visualEvidence: readonly StudioVisualEvidenceRef[];
  readonly generatedAtIso: string;
  readonly knownLimitations: readonly string[];
  readonly studio?: Partial<StudioRepoMetadata>;
  readonly asha?: Partial<StudioRepoMetadata>;
}): StudioReviewArtifact {
  const validationDiagnostics = validateReviewArtifactCandidate(args);
  const captureReadiness: StudioCaptureReadiness = validationDiagnostics.some((item) => item.severity === 'error') ? 'failed_closed' : 'ready';
  const finalState = args.results.at(-1)?.state ?? {
    authorityBeforeHash: null,
    authorityAfterHash: null,
    editorBeforeVersion: null,
    editorAfterVersion: null,
    renderBeforeHash: null,
    renderAfterHash: null,
    selectedBefore: null,
    selectedAfter: null,
    replay: { replayArtifactId: null, replayPath: null, replayHash: null, replayMode: 'unavailable' as const, summary: 'unavailable: no commands executed.' },
    compatibility: args.session.compatibility,
  };
  const visualArtifacts = args.visualEvidence.flatMap((evidence) => [evidence.beforeArtifact, evidence.afterArtifact].filter((artifact): artifact is StudioArtifactRef => artifact !== null));
  const exportedArtifacts: readonly StudioArtifactRef[] = [
    ...args.results.flatMap((result) => result.artifacts),
    ...visualArtifacts,
    artifactRef({
      artifactId: 'artifact-review-export-0001',
      artifactKind: 'review_export',
      path: `artifacts/${args.session.sessionId}/review-export.json`,
      mediaType: 'application/json',
      contentHash: null,
      byteLength: null,
      producedBySequenceId: args.timeline.at(-1)?.sequenceId ?? nullSequence(),
      summary: 'Review-grade export artifact with command timeline, state evidence, visual evidence refs, compatibility, and limitations.',
    }),
  ];
  const diagnostics = [...args.session.diagnostics, ...args.results.flatMap((result) => result.diagnostics), ...validationDiagnostics];
  return {
    schemaVersion: 1,
    artifactKind: 'review_export',
    artifactId: 'artifact-review-export-0001',
    generatedAtIso: args.generatedAtIso,
    session: args.session,
    studio: {
      repo: args.studio?.repo ?? 'FuzzySlipper/asha-studio',
      branch: args.studio?.branch ?? null,
      commit: args.studio?.commit ?? null,
      path: args.studio?.path ?? '/home/dev/asha-studio',
    },
    asha: {
      repo: args.asha?.repo ?? 'asha',
      branch: args.asha?.branch ?? null,
      commit: args.asha?.commit ?? null,
      path: args.asha?.path ?? '/home/dev/asha',
    },
    compatibility: args.session.compatibility,
    commandCatalogHash: null,
    commandTimeline: args.timeline,
    commandResults: args.results,
    finalState,
    visualEvidence: args.visualEvidence,
    exportedArtifacts,
    diagnostics,
    knownLimitations: args.knownLimitations,
    captureReadiness,
    reviewSummary: captureReadiness === 'ready'
      ? `${args.timeline.length} command(s), ${args.visualEvidence.length} visual evidence item(s), and ${exportedArtifacts.length} artifact ref(s) ready for review.`
      : `Review export failed closed with ${validationDiagnostics.filter((item) => item.severity === 'error').length} blocking diagnostic(s).`,
  };
}

function nullSequence(): string {
  return 'seq-unavailable';
}
