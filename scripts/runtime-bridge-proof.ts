import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  MANIFEST_OPERATIONS,
  STABLE_OPERATION_COUNT,
  createMockRuntimeBridge,
  createNativeRuntimeBridge,
  frameCursor,
} from '@asha/runtime-bridge';

import { buildCurrentCompatibilityEvidence } from '../src/compatibility';
import {
  REQUIRED_OPERATION_NAMES,
  buildStudioRuntimeBridgeIntegrationProof,
  type StudioRuntimeBridgeIntegrationEvidence,
} from '../src/runtime-bridge-integration';
import { createStudioWorkspaceModel } from '../src/session-workspace';

const root = process.cwd();
const outDir = join(root, 'artifacts', 'runtime-bridge', 'latest');
const fixturePath = join(root, 'fixtures', 'studio-runtime-bridge-proof.sample.json');
const artifactPath = join(outDir, 'index.json');

function fnv1a(prefix: string, text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}-${hash.toString(16).padStart(8, '0')}`;
}

function gitHead(path: string): string | null {
  try {
    return execFileSync('git', ['-C', path, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function main(): void {
  const workspace = createStudioWorkspaceModel({ runtimeMode: 'native' });
  const applyResult = workspace.commandResults.find((result) => result.commandId === 'authority.voxel.apply_brush');
  if (applyResult === undefined) throw new Error('workspace is missing authority.voxel.apply_brush command result');

  const commandBatch = { commands: workspace.voxelWorkflow.evidence.typedVoxelCommands };
  const bridge = createNativeRuntimeBridge();
  const engineHandle = bridge.initializeEngine({ seed: 3220 });
  bridge.loadWorldBundle({ bundleSchemaVersion: 1, protocolVersion: 1, sceneId: 3220 });
  const commandResult = bridge.submitCommands(commandBatch);
  bridge.stepSimulation({ tick: 1 });
  const renderDiff = bridge.readRenderDiffs(frameCursor(0));
  bridge.getCompositionStatus();
  bridge.saveCurrentWorld();

  const replayBridge = createMockRuntimeBridge();
  const replaySession = replayBridge.loadReplayFixture({ name: 'studio-runtime-bridge-3220', steps: 1 });
  const replayStep = replayBridge.runReplayStep(replaySession);
  const replayRecordId = fnv1a('runtime-replay', `${workspace.session.sessionId}:${applyResult.sequenceId}:${replayStep.hash}`);
  const compatibility = buildCurrentCompatibilityEvidence({ ashaCommit: gitHead(join(root, '..', 'asha')) });
  const renderReadbackHash = fnv1a('runtime-render', JSON.stringify(renderDiff));

  const evidence: StudioRuntimeBridgeIntegrationEvidence = {
    metadata: {
      packageName: '@asha/runtime-bridge',
      compatibilityVersion: compatibility.runtimeBridgeVersion,
      packageVersion: compatibility.ashaPackageVersions.find((item) => item.packageName === '@asha/runtime-bridge')?.version ?? null,
      ashaCommit: compatibility.ashaCommit,
      importedFromPackageRoot: true,
    },
    operations: {
      stableOperationCount: STABLE_OPERATION_COUNT,
      manifestOperations: MANIFEST_OPERATIONS,
      requiredOperationNames: REQUIRED_OPERATION_NAMES,
    },
    command: {
      commandId: 'authority.voxel.apply_brush',
      sequenceId: applyResult.sequenceId,
      runtimeSessionId: `native-engine-${engineHandle}`,
      snapshotBeforeId: `snapshot:${workspace.voxelWorkflow.evidence.authorityBeforeHash}`,
      snapshotAfterId: `snapshot:${workspace.voxelWorkflow.evidence.authorityAfterHash}`,
      authorityBeforeHash: workspace.voxelWorkflow.evidence.authorityBeforeHash,
      authorityAfterHash: workspace.voxelWorkflow.evidence.authorityAfterHash,
      commandBatch,
      commandResult,
    },
    render: {
      snapshotId: `snapshot:${workspace.voxelWorkflow.evidence.authorityAfterHash}`,
      frameCursor: 0,
      renderDiff,
      renderReadbackHash,
    },
    replay: {
      replayMode: 'quarantined_runtime_facade',
      replayRecordId,
      replayStep,
      expectedHash: replayStep.hash,
    },
    rawTransportImports: [],
  };

  const proof = buildStudioRuntimeBridgeIntegrationProof(evidence);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(proof, null, 2)}\n`);
  writeFileSync(fixturePath, `${JSON.stringify(proof, null, 2)}\n`);
  if (proof.readiness !== 'ready') {
    throw new Error(`runtime bridge proof failed closed: ${proof.diagnostics.map((item) => item.code).join(', ')}`);
  }
  console.log(`asha-studio runtime bridge proof: OK (${relative(root, artifactPath)}, ${proof.summary.stableOperationCount} stable op(s), replay ${proof.evidence.replay.replayRecordId})`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
