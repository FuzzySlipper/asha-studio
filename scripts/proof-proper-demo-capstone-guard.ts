#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoRoot = resolve(repoRoot, '../asha-demo');
const outDir = join(repoRoot, 'artifacts/proper-demo-capstone-guard/latest');
const artifactPath = join(outDir, 'index.json');
const evidenceIndexPath = 'artifacts/proper-demo-evidence-index/latest/index.json';

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function sha256Json(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function run(command: string, args: readonly string[], cwd = repoRoot) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return {
    command: [command, ...args].join(' '),
    cwd: cwd === repoRoot ? '.' : relative(repoRoot, cwd),
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function verifyArtifactHash(artifact: any): boolean {
  const { artifactHash, ...withoutHash } = artifact;
  return artifactHash === sha256Json(withoutHash);
}

const indexRun = run('pnpm', ['run', 'proof:proper-demo-evidence-index']);
const studioBoundaryRun = run('pnpm', ['run', 'check:boundaries']);
const demoBoundaryRun = run('npm', ['run', 'check:boundary'], demoRoot);

const indexAbsolutePath = join(repoRoot, evidenceIndexPath);
assert.equal(existsSync(indexAbsolutePath), true, `missing evidence index artifact: ${evidenceIndexPath}`);
const indexText = readFileSync(indexAbsolutePath, 'utf8');
const index = JSON.parse(indexText);
assert.equal(index.artifactKind, 'studio_proper_demo_evidence_index');
assert.equal(verifyArtifactHash(index), true, `stale evidence index artifact: ${evidenceIndexPath}`);

const requiredNonClaims = [
  'not_hardware_gpu_evidence',
  'not_performance_evidence',
  'not_store_submission',
  'not_installer',
  'not_package_signing',
  'not_product_readiness',
  'not_multiplayer_evidence',
  'not_private_transport',
  'not_runtime_den_dependency',
] as const;
const nonClaimsPresent = requiredNonClaims.every(nonClaim => index.nonClaims.includes(nonClaim));
const privateHintsAbsent = !JSON.stringify(index).toLowerCase().includes('call(methodname, json)')
  && !JSON.stringify(index).toLowerCase().includes('freeform_json')
  && !JSON.stringify(index).toLowerCase().includes('raw native')
  && !JSON.stringify(index).toLowerCase().includes('raw wasm');
const generatedArtifactsNotAuthoredSource = index.negativeSmokes.some((smoke: { readonly diagnostic: string; readonly ok: boolean }) =>
  smoke.diagnostic === 'generated_artifact_is_not_authored_source' && smoke.ok === false,
);

assert.equal(nonClaimsPresent, true);
assert.equal(privateHintsAbsent, true);
assert.equal(generatedArtifactsNotAuthoredSource, true);
assert.equal(index.coverage.allRequiredKindsIndexed, true);
assert.equal(index.coverage.milestoneCoverage.boundaryGuards, true);
assert.equal(index.coverage.milestoneCoverage.privateTransportHintsAbsent, true);

const missingNonClaim = index.nonClaims.filter((nonClaim: string) => nonClaim !== 'not_private_transport');
const boundaryDrift = {
  ...index,
  coverage: {
    ...index.coverage,
    milestoneCoverage: {
      ...index.coverage.milestoneCoverage,
      boundaryGuards: false,
    },
  },
};
const forbiddenCommandHint = ['call', '(methodName, json)'].join('');
const artifactForbiddenText = JSON.stringify({
  ...index,
  evidenceMap: {
    ...index.evidenceMap,
    forbidden: forbiddenCommandHint,
  },
}).toLowerCase();

const artifactBody = {
  artifactKind: 'studio_proper_demo_capstone_guard',
  artifactVersion: 'studio-proper-demo-capstone-guard.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:proper-demo-capstone-guard',
  commandRuns: [indexRun, studioBoundaryRun, demoBoundaryRun],
  sourceArtifacts: [
    {
      kind: index.artifactKind,
      path: evidenceIndexPath,
      sha256: sha256(indexText),
      hash: index.artifactHash,
    },
  ],
  guard: {
    requiredNonClaims,
    nonClaimsPresent,
    privateTransportHintsAbsent: privateHintsAbsent,
    generatedArtifactsNotAuthoredSource,
    studioBoundaryPassed: true,
    demoBoundaryPassed: true,
    evidenceIndexHash: index.artifactHash,
  },
  negativeSmokes: [
    {
      case: 'missing_required_non_claim',
      ok: requiredNonClaims.every(nonClaim => missingNonClaim.includes(nonClaim)),
      expected: false,
      diagnostic: 'missing_required_non_claim',
    },
    {
      case: 'private_transport_or_freeform_command_hint',
      ok: !artifactForbiddenText.includes('call(methodname, json)'),
      expected: false,
      diagnostic: 'private_transport_or_freeform_command_hint',
    },
    {
      case: 'boundary_guard_drift',
      ok: boundaryDrift.coverage.milestoneCoverage.boundaryGuards,
      expected: false,
      diagnostic: 'boundary_guard_drift',
    },
  ],
  validations: [
    'proper_demo_evidence_index_child_passed',
    'studio_boundary_guard_passed',
    'demo_boundary_guard_passed',
    'required_non_claims_present',
    'private_transport_and_freeform_command_hints_absent',
    'generated_artifacts_not_treated_as_authored_source',
    'negative_missing_non_claim_failed_closed',
    'negative_private_hint_failed_closed',
    'negative_boundary_drift_failed_closed',
  ],
  nonClaims: requiredNonClaims,
};
const artifact = {
  ...artifactBody,
  artifactHash: sha256Json(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
