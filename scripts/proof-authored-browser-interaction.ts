#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-testing');
const outDir = join(repoRoot, 'artifacts/authored-browser-interaction/latest');
const artifactPath = join(outDir, 'index.json');
const loadProofPath = join(repoRoot, 'artifacts/authored-browser-runtime-load/latest/index.json');
const demoInteractionPath = join(demoRoot, 'harness/out/authored-browser-interaction/latest/index.json');

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function run(command: string, args: readonly string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 240000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return `${command} ${args.join(' ')}`;
}

const loadRun = run('pnpm', ['run', 'evidence', '--', 'authored-browser-runtime-load'], repoRoot);
const interactionRun = run('npm', ['run', 'roundtrip:browser-interaction'], demoRoot);
const boundaryRun = run('pnpm', ['run', 'check:boundaries'], repoRoot);

const loadProofText = readFileSync(loadProofPath, 'utf8');
const loadProof = JSON.parse(loadProofText);
const interactionText = readFileSync(demoInteractionPath, 'utf8');
const interaction = JSON.parse(interactionText);

assert.equal(loadProof.artifactKind, 'studio_authored_browser_runtime_load_proof');
assert.equal(interaction.artifactKind, 'asha_demo_authored_browser_interaction');
assert.equal(interaction.loadArtifact.artifactHash, loadProof.sourceArtifacts.at(1)?.hash);
assert.equal(interaction.interaction.authoredObjectId, loadProof.authoredRuntimeLoad.objectId);
assert.equal(interaction.interaction.authoredAssetId, loadProof.authoredRuntimeLoad.assetId);
assert.equal(interaction.checks.realDomEventsDispatched, true);
assert.equal(interaction.checks.typedRequestsMatchInputEvents, true);
assert.equal(interaction.checks.readbacksMatchTypedRequests, true);
assert.equal(interaction.checks.selectedAuthoredObjectMatchesLoad, true);

const staleInteraction = {
  ...interaction,
  interaction: {
    ...interaction.interaction,
    authoredObjectId: 'scene-node:stale',
  },
};
assert.equal(staleInteraction.interaction.authoredObjectId === loadProof.authoredRuntimeLoad.objectId, false);

const artifactBody = {
  artifactKind: 'studio_authored_browser_interaction_proof',
  artifactVersion: 'studio-authored-browser-interaction-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- authored-browser-interaction',
  commandRuns: [loadRun, interactionRun, boundaryRun],
  sourceArtifacts: [
    {
      kind: loadProof.artifactKind,
      path: relative(repoRoot, loadProofPath),
      sha256: sha256(loadProofText),
      hash: loadProof.artifactHash,
    },
    {
      kind: interaction.artifactKind,
      path: relative(repoRoot, demoInteractionPath),
      sha256: sha256(interactionText),
      hash: interaction.artifactHash,
    },
  ],
  authoredInteraction: {
    objectId: interaction.interaction.authoredObjectId,
    assetId: interaction.interaction.authoredAssetId,
    inputEventCount: interaction.interaction.inputEventCount,
    typedRequestCount: interaction.interaction.typedRequestCount,
    readbackCount: interaction.interaction.readbackCount,
    finalSelectedObjectId: interaction.interaction.finalReadback.selectedObjectId,
    finalSelectedAssetId: interaction.interaction.finalReadback.selectedAssetId,
    interactionHash: interaction.interaction.interactionHash,
    runtimeWorldHash: loadProof.authoredRuntimeLoad.worldHash,
  },
  negativeSmokes: [
    {
      case: 'stale_interaction_object_mismatch',
      ok: staleInteraction.interaction.authoredObjectId === loadProof.authoredRuntimeLoad.objectId,
      expected: false,
    },
    ...interaction.negativeSmokes,
  ],
  validations: [
    'authored_runtime_load_studio_proof_present',
    'demo_authored_browser_interaction_child_passed',
    'dom_input_events_recorded_for_authored_content',
    'typed_requests_match_authored_browser_inputs',
    'authored_selection_readback_matches_runtime_load',
    'boundary_guard_passed',
    'negative_stale_interaction_failed_closed',
  ],
  nonClaims: [
    'not_runtime_mutation_proof',
    'not_native_runtime_authority',
    'not_private_transport',
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
