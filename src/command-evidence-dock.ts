import type { StudioActorKind, StudioArtifactRef, StudioCommandResult, StudioCommandStatus, StudioCommandTimelineEntry } from './session-workspace';
import type { StudioReviewArtifact, StudioVisualEvidenceRef } from './visual-evidence';

export type StudioBottomDockTabId = 'command_timeline_evidence_log' | 'evidence_artifacts';

export interface StudioCommandEvidenceRow {
  readonly sequenceId: string;
  readonly orderIndex: number;
  readonly commandId: string;
  readonly label: string;
  readonly status: StudioCommandStatus;
  readonly source: Uppercase<StudioActorKind>;
  readonly requestedAtIso: string;
  readonly completedAtIso: string | null;
  readonly operationClass: string;
  readonly inputSummary: string;
  readonly outputSummary: string;
  readonly evidenceSummary: string;
  readonly artifactIds: readonly string[];
  readonly diagnosticCount: number;
}

export interface StudioEvidenceArtifactRow {
  readonly artifactId: string;
  readonly artifactKind: string;
  readonly path: string;
  readonly mediaType: string;
  readonly contentHash: string | null;
  readonly producedBySequenceId: string | null;
  readonly summary: string;
  readonly source: 'command_result' | 'visual_evidence' | 'review_export' | 'agent_readout';
}

export interface StudioCommandEvidenceDockModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'command_evidence_dock';
  readonly automationLabel: 'studio-bottom-command-evidence-dock';
  readonly title: 'Command Timeline / Evidence';
  readonly tabs: readonly { readonly id: StudioBottomDockTabId; readonly label: string; readonly rowCount: number }[];
  readonly commandRows: readonly StudioCommandEvidenceRow[];
  readonly artifactRows: readonly StudioEvidenceArtifactRow[];
  readonly automationMarkers: readonly string[];
  readonly knownLimitations: readonly string[];
}

function artifactSummary(entry: StudioCommandTimelineEntry, result: StudioCommandResult | undefined): string {
  const refs = entry.artifactRefs.length > 0 ? entry.artifactRefs : result?.artifacts ?? [];
  if (refs.length === 0) return 'No artifact link; timeline row is structured command evidence only.';
  return refs.map((ref) => `${ref.artifactId}:${ref.artifactKind}`).join(', ');
}

function uniqueArtifactRows(rows: readonly StudioEvidenceArtifactRow[]): StudioEvidenceArtifactRow[] {
  const seen = new Set<string>();
  const unique: StudioEvidenceArtifactRow[] = [];
  for (const row of rows) {
    const key = `${row.artifactId}:${row.source}:${row.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

function artifactRow(ref: StudioArtifactRef, source: StudioEvidenceArtifactRow['source']): StudioEvidenceArtifactRow {
  return {
    artifactId: ref.artifactId,
    artifactKind: ref.artifactKind,
    path: ref.path,
    mediaType: ref.mediaType,
    contentHash: ref.contentHash,
    producedBySequenceId: ref.producedBySequenceId,
    summary: ref.summary,
    source,
  };
}

export function createStudioCommandEvidenceDockModel(options: {
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly results: readonly StudioCommandResult[];
  readonly visualEvidence: readonly StudioVisualEvidenceRef[];
  readonly readoutArtifactId?: string;
  readonly readoutReviewSummary?: string;
  readonly sessionId: string;
  readonly reviewArtifact: StudioReviewArtifact;
}): StudioCommandEvidenceDockModel {
  const commandRows = options.timeline.map((entry, index): StudioCommandEvidenceRow => {
    const result = options.results.find((candidate) => candidate.sequenceId === entry.sequenceId);
    return {
      sequenceId: entry.sequenceId,
      orderIndex: index + 1,
      commandId: entry.commandId,
      label: entry.label,
      status: entry.status,
      source: entry.requestedBy.toUpperCase() as Uppercase<StudioActorKind>,
      requestedAtIso: entry.requestedAtIso,
      completedAtIso: entry.completedAtIso,
      operationClass: entry.operationClass,
      inputSummary: entry.inputSummary,
      outputSummary: entry.outputSummary,
      evidenceSummary: artifactSummary(entry, result),
      artifactIds: entry.artifactRefs.map((ref) => ref.artifactId),
      diagnosticCount: entry.diagnostics.length + (result?.diagnostics.length ?? 0),
    };
  });

  const commandArtifactRows = options.results.flatMap((result) => result.artifacts.map((ref) => artifactRow(ref, 'command_result')));
  const visualArtifactRows = options.visualEvidence.flatMap((evidence) => [evidence.beforeArtifact, evidence.afterArtifact]
    .filter((ref): ref is StudioArtifactRef => ref !== null)
    .map((ref) => artifactRow(ref, 'visual_evidence')));
  const reviewExportRef = options.reviewArtifact.exportedArtifacts.find((ref) => ref.artifactId === options.reviewArtifact.artifactId)
    ?? options.reviewArtifact.exportedArtifacts.find((ref) => ref.artifactKind === 'review_export');
  const reviewArtifactRows: StudioEvidenceArtifactRow[] = [
    {
      artifactId: options.reviewArtifact.artifactId,
      artifactKind: options.reviewArtifact.artifactKind,
      path: reviewExportRef?.path ?? `artifacts/${options.sessionId}/review-export.json`,
      mediaType: reviewExportRef?.mediaType ?? 'application/json',
      contentHash: reviewExportRef?.contentHash ?? null,
      producedBySequenceId: reviewExportRef?.producedBySequenceId ?? options.timeline.at(-1)?.sequenceId ?? null,
      summary: options.reviewArtifact.reviewSummary,
      source: 'review_export',
    },
    {
      artifactId: options.readoutArtifactId ?? 'artifact-agent-readout-0001',
      artifactKind: 'agent_readout',
      path: 'artifacts/studio-agent-readout.sample.json',
      mediaType: 'application/json',
      contentHash: null,
      producedBySequenceId: options.timeline.at(-1)?.sequenceId ?? null,
      summary: options.readoutReviewSummary ?? `${options.timeline.length} command(s) recorded in the shared GUI/agent timeline.`,
      source: 'agent_readout',
    },
  ];
  const artifactRows = uniqueArtifactRows([...commandArtifactRows, ...visualArtifactRows, ...reviewArtifactRows]);

  return {
    schemaVersion: 1,
    artifactKind: 'command_evidence_dock',
    automationLabel: 'studio-bottom-command-evidence-dock',
    title: 'Command Timeline / Evidence',
    tabs: [
      { id: 'command_timeline_evidence_log', label: 'Command Timeline / Evidence Log', rowCount: commandRows.length },
      { id: 'evidence_artifacts', label: 'Evidence / Artifacts', rowCount: artifactRows.length },
    ],
    commandRows,
    artifactRows,
    automationMarkers: [
      'studio-bottom-command-evidence-dock',
      'bottom-command-timeline-tab',
      'bottom-evidence-artifacts-tab',
      'bottom-command-row-list',
      'bottom-evidence-artifact-list',
      'bottom-evidence-browser-limitation',
    ],
    knownLimitations: [
      'Bottom dock is a projection of the shared workspace timeline/readout; it is not a second private command log.',
      'Artifact rows reference current proof/readout artifacts only; browser, Agora, GPU, and performance claims remain limited to explicit evidence classifications.',
    ],
  };
}
