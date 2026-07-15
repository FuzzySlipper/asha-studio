export interface StudioWorkspaceProjectionTiming {
  readonly configureMs: number;
  readonly projectionHash: string;
  readonly readMs: number;
  readonly reconcileMs: number;
  readonly startedAtMs: number;
}

export interface StudioWorkspaceProjectionRenderSample {
  readonly channelReplaced: boolean;
  readonly commitToRenderMs: number;
  readonly configureMs: number;
  readonly meshPayloadOpCount: number;
  readonly pendingOpCount: number;
  readonly readMs: number;
  readonly reconcileMs: number;
  readonly recovered: boolean;
  readonly renderApplyMs: number;
  readonly retainedOpCount: number;
}

export interface StudioWorkspaceProjectionPerformanceReadModel {
  readonly channelReplacementCount: number;
  readonly latest: StudioWorkspaceProjectionRenderSample | null;
  readonly meshPayloadReplayCount: number;
  readonly p95CommitToRenderMs: number | null;
  readonly p95RenderApplyMs: number | null;
  readonly recoveryCount: number;
  readonly sampleCount: number;
  readonly samples: readonly StudioWorkspaceProjectionRenderSample[];
}

export function appendStudioWorkspaceProjectionSample(
  samples: readonly StudioWorkspaceProjectionRenderSample[],
  sample: StudioWorkspaceProjectionRenderSample,
  limit = 256,
): readonly StudioWorkspaceProjectionRenderSample[] {
  const boundedLimit = Math.max(1, Math.floor(limit));
  return [...samples, sample].slice(-boundedLimit);
}

export function buildStudioWorkspaceProjectionPerformanceReadModel(
  samples: readonly StudioWorkspaceProjectionRenderSample[],
): StudioWorkspaceProjectionPerformanceReadModel {
  return {
    channelReplacementCount: samples.filter(sample => sample.channelReplaced).length,
    latest: samples.at(-1) ?? null,
    meshPayloadReplayCount: samples.reduce((sum, sample) => sum + sample.meshPayloadOpCount, 0),
    p95CommitToRenderMs: percentile95(samples.map(sample => sample.commitToRenderMs)),
    p95RenderApplyMs: percentile95(samples.map(sample => sample.renderApplyMs)),
    recoveryCount: samples.filter(sample => sample.recovered).length,
    sampleCount: samples.length,
    samples,
  };
}

function percentile95(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? null;
}
