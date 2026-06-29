#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  buildStudioAuthoredBrowserDebugReadModel,
  type StudioAuthoredBrowserDebugInputFixture,
  type StudioAuthoredBrowserDebugInputInteraction,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/authored-studio-debug-readback/latest');
const artifactPath = join(outDir, 'index.json');
const fixturePath = join(repoRoot, 'fixtures/round-trip/studio-authored-content.fixture.json');
const interactionPath = join(repoRoot, 'artifacts/authored-browser-interaction/latest/index.json');
const liveDebugPath = join(repoRoot, 'artifacts/live-gameplay-debug-m4/latest/index.json');

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function run(command: string, args: readonly string[]) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 420000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return `${command} ${args.join(' ')}`;
}

function verifyHashedObject(value: any, hashKey: string): boolean {
  const { [hashKey]: recordedHash, ...withoutHash } = value;
  return recordedHash === sha256Json(withoutHash);
}

const interactionRun = run('pnpm', ['run', 'proof:authored-browser-interaction']);
const liveDebugRun = run('pnpm', ['run', 'proof:live-gameplay-debug-m4']);
const boundaryRun = run('pnpm', ['run', 'check:boundaries']);

const fixtureText = readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText) as StudioAuthoredBrowserDebugInputFixture;
assert.equal(verifyHashedObject(fixture, 'fixtureHash'), true, 'Studio authored fixture hash is stale');
const interactionText = readFileSync(interactionPath, 'utf8');
const interaction = JSON.parse(interactionText) as StudioAuthoredBrowserDebugInputInteraction;
assert.equal(interaction.artifactKind, 'studio_authored_browser_interaction_proof');
const liveDebugText = readFileSync(liveDebugPath, 'utf8');
const liveDebug = JSON.parse(liveDebugText) as { artifactKind: string; artifactHash: string };
assert.equal(liveDebug.artifactKind, 'studio_live_gameplay_debug_m4');

const debug = buildStudioAuthoredBrowserDebugReadModel({
  fixture,
  browserInteraction: interaction,
  studioDebugEvidenceHash: liveDebug.artifactHash,
});
assert.equal(debug.ok, true, debug.diagnostics.map(diagnostic => diagnostic.message).join('\n'));

const missingEvidence = buildStudioAuthoredBrowserDebugReadModel({
  fixture,
  browserInteraction: interaction,
});
assert.equal(missingEvidence.ok, false);
assert.equal(missingEvidence.diagnostics.at(0)?.code, 'missing_studio_debug_evidence');

const staleSelection = buildStudioAuthoredBrowserDebugReadModel({
  fixture,
  browserInteraction: {
    ...interaction,
    authoredInteraction: {
      ...interaction.authoredInteraction,
      finalSelectedObjectId: 'scene-node:stale',
    },
  },
  studioDebugEvidenceHash: liveDebug.artifactHash,
});
assert.equal(staleSelection.ok, false);
assert.equal(staleSelection.diagnostics.at(0)?.code, 'selected_authored_object_mismatch');

const missingInteraction = buildStudioAuthoredBrowserDebugReadModel({
  fixture,
  browserInteraction: null,
  studioDebugEvidenceHash: liveDebug.artifactHash,
});
assert.equal(missingInteraction.ok, false);
assert.equal(missingInteraction.diagnostics.at(0)?.code, 'missing_browser_interaction');

const artifactBody = {
  artifactKind: 'studio_authored_studio_debug_readback_proof',
  artifactVersion: 'studio-authored-studio-debug-readback-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:authored-studio-debug-readback',
  commandRuns: [interactionRun, liveDebugRun, boundaryRun],
  sourceArtifacts: [
    {
      kind: fixture.fixtureKind,
      path: relative(repoRoot, fixturePath),
      sha256: sha256(fixtureText),
      hash: fixture.fixtureHash,
    },
    {
      kind: interaction.artifactKind,
      path: relative(repoRoot, interactionPath),
      sha256: sha256(interactionText),
      hash: interaction.artifactHash,
    },
    {
      kind: liveDebug.artifactKind,
      path: relative(repoRoot, liveDebugPath),
      sha256: sha256(liveDebugText),
      hash: liveDebug.artifactHash,
    },
  ],
  debug: debug.debug,
  negativeSmokes: [
    {
      case: 'missing_studio_debug_evidence',
      ok: missingEvidence.ok,
      diagnostics: missingEvidence.diagnostics,
    },
    {
      case: 'stale_authored_selection',
      ok: staleSelection.ok,
      diagnostics: staleSelection.diagnostics,
    },
    {
      case: 'missing_browser_interaction',
      ok: missingInteraction.ok,
      diagnostics: missingInteraction.diagnostics,
    },
  ],
  validations: [
    'authored_browser_interaction_child_passed',
    'studio_live_debug_m4_child_passed',
    'browser_selected_authored_object_projected_to_studio_debug',
    'browser_selected_authored_asset_projected_to_studio_debug',
    'browser_input_counts_correlated',
    'negative_missing_studio_debug_failed_closed',
    'negative_stale_authored_selection_failed_closed',
  ],
  nonClaims: [
    'not_runtime_authority',
    'not_private_runtime_transport',
    'not_source_write',
    'not_hardware_gpu_evidence',
    'not_performance_evidence',
  ],
};
const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
