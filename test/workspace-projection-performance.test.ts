import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendStudioWorkspaceProjectionSample,
  buildStudioWorkspaceProjectionPerformanceReadModel,
  type StudioWorkspaceProjectionRenderSample,
} from '@asha-studio/store';

function sample(commitToRenderMs: number, overrides: Partial<StudioWorkspaceProjectionRenderSample> = {}) {
  return {
    channelReplaced: false,
    commitToRenderMs,
    configureMs: 0.2,
    meshPayloadOpCount: 0,
    pendingOpCount: 1,
    readMs: 0.2,
    reconcileMs: 0.1,
    recovered: false,
    renderApplyMs: 0.3,
    retainedOpCount: 300,
    ...overrides,
  } satisfies StudioWorkspaceProjectionRenderSample;
}

void test('projection performance history is bounded and reports p95 plus expensive-path counters', () => {
  let samples: readonly StudioWorkspaceProjectionRenderSample[] = [];
  for (let index = 1; index <= 300; index += 1) {
    samples = appendStudioWorkspaceProjectionSample(samples, sample(index / 10));
  }
  assert.equal(samples.length, 256);
  const readout = buildStudioWorkspaceProjectionPerformanceReadModel([
    ...samples,
    sample(99, { channelReplaced: true, meshPayloadOpCount: 4, recovered: true }),
  ]);
  assert.equal(readout.sampleCount, 257);
  assert.equal(readout.channelReplacementCount, 1);
  assert.equal(readout.meshPayloadReplayCount, 4);
  assert.equal(readout.recoveryCount, 1);
  assert.equal(readout.latest?.commitToRenderMs, 99);
  assert.ok((readout.p95CommitToRenderMs ?? 0) > 28);
  assert.equal(readout.p95RenderApplyMs, 0.3);
});
