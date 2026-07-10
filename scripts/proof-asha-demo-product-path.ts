#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  buildInitialWorkspaceReadModel,
  buildStudioAshaDemoProductPathReadModel,
  buildStudioRuntimeSessionInspectionReadModel,
  buildStudioRuntimeSessionList,
  loadStudioGameWorkspaceManifest,
} from '@asha-studio/domain';
import {
  type CameraCreateRequest,
  type WorldLoadRequest,
} from '@asha/runtime-bridge';
import { createMockRuntimeSession } from '@asha/runtime-bridge/reference';
import type { RuntimeSessionStateSummary } from '@asha/runtime-session';

const repoRoot = process.cwd();
const demoRoot = join(repoRoot, '..', 'asha-demo');
const manifestPath = join(demoRoot, 'asha.game.toml');
const projectBundlePath = join(demoRoot, 'project', 'project-bundle.json');
const packageJsonPath = join(demoRoot, 'package.json');
const artifactPath = join(repoRoot, 'artifacts', '4221', 'asha-demo-product-path.json');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  readonly scripts?: Readonly<Record<string, string>>;
};
const projectBundle = JSON.parse(readFileSync(projectBundlePath, 'utf8')) as {
  readonly runtimeRequest: WorldLoadRequest;
};

const workspaceResult = loadStudioGameWorkspaceManifest({
  workspaceRoot: '../asha-demo',
  manifestPath: 'asha.game.toml',
  gameId: 'asha-demo',
  manifestText: readFileSync(manifestPath, 'utf8'),
  packageScripts: packageJson.scripts ?? {},
  pathExists: relativePath => existsSync(join(demoRoot, relativePath)),
});

assert.equal(workspaceResult.ok, true);
if (!workspaceResult.ok) {
  throw new Error('Expected asha-demo manifest to load through public game-workspace surfaces.');
}

const workspace = buildInitialWorkspaceReadModel();
const facade = createMockRuntimeSession();
let state: RuntimeSessionStateSummary = facade.initialize({
  sessionId: 'runtime-session:asha-demo:studio-product-path',
  seed: 4103,
  project: {
    gameId: workspaceResult.workspace.gameId,
    workspaceId: workspaceResult.workspace.workspaceHash,
  },
  projectBundle: projectBundle.runtimeRequest,
});

let runtimeSessions = buildStudioRuntimeSessionList({
  workspace: workspaceResult.workspace,
});
let runtimeInspection = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace: workspaceResult.workspace,
  runtimeSessions,
  state,
  projection: facade.readProjection(),
  telemetry: facade.readTelemetry(),
  lifecycleStatus: facade.readLifecycleStatus(),
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout: facade.readGeneratedTunnelReadout({ presetId: 'tiny-enclosed', seed: 17 }),
  navProjection: facade.readNavProjection(),
  paused: false,
});
const initialProductPath = buildStudioAshaDemoProductPathReadModel({
  gameWorkspace: workspaceResult.workspace,
  runtimeInspection,
});

const cameraRequest: CameraCreateRequest = {
  initialPose: {
    position: [1, 1.5, 1],
    yawDegrees: 180,
    pitchDegrees: 0,
  },
  projection: {
    fovYDegrees: 60,
    near: 0.1,
    far: 100,
  },
  viewport: {
    width: 1280,
    height: 720,
  },
};
const camera = facade.createCamera(cameraRequest).snapshot.camera;
const encounterBefore = facade.readEncounterDirector();
if (encounterBefore.state.status === 'pending') {
  facade.requestEncounterTransition({
    kind: 'runtime_session.encounter_transition_request.v0',
    presetId: 'generated-tunnel-small-encounter',
    action: 'activate',
  });
}
const policyTick = facade.runAutonomousPolicyTick({
  targetCamera: camera,
  policySource: 'export const policy = (view) => view;',
});
facade.requestEncounterTransition({
  kind: 'runtime_session.encounter_transition_request.v0',
  presetId: 'generated-tunnel-small-encounter',
  action: 'sync_lifecycle',
});
const lifecycleAfterPolicy = facade.readLifecycleStatus();
state = {
  ...state,
  composition: policyTick.step.composition,
  sequenceId: policyTick.sequenceIdAfter,
  tick: policyTick.tick,
  sessionHash: policyTick.sessionHashAfter,
};
runtimeSessions = buildStudioRuntimeSessionList({
  workspace: workspaceResult.workspace,
});
runtimeInspection = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace: workspaceResult.workspace,
  runtimeSessions,
  state,
  projection: facade.readProjection(),
  telemetry: facade.readTelemetry(),
  autonomousPolicyTick: policyTick,
  lifecycleStatus: lifecycleAfterPolicy,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout: facade.readGeneratedTunnelReadout({ presetId: 'tiny-enclosed', seed: 17 }),
  navProjection: facade.readNavProjection(),
  combatFeedbackProjection: facade.readCombatFeedbackProjection({
    camera,
    viewport: cameraRequest.viewport,
  }),
  paused: false,
});
const defeatedProductPath = buildStudioAshaDemoProductPathReadModel({
  gameWorkspace: workspaceResult.workspace,
  runtimeInspection,
});

const restartReceipt = facade.requestSessionRestart({
  kind: 'runtime.restart_session_intent',
  source: 'programmatic',
  requireTerminal: false,
  expectedSessionHash: lifecycleAfterPolicy.sessionHash,
});
assert.equal(restartReceipt.accepted, true);
state = {
  ...state,
  composition: restartReceipt.restart?.composition ?? state.composition,
  sequenceId: restartReceipt.sequenceId,
  tick: restartReceipt.restart?.tick ?? state.tick,
  sessionHash: restartReceipt.sessionHashAfter,
};
runtimeInspection = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace: workspaceResult.workspace,
  runtimeSessions,
  state,
  projection: facade.readProjection(),
  telemetry: facade.readTelemetry(),
  lifecycleStatus: restartReceipt.statusAfter,
  restartReceipt,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout: facade.readGeneratedTunnelReadout({ presetId: 'tiny-enclosed', seed: 17 }),
  navProjection: facade.readNavProjection(),
  paused: false,
});
const restartedProductPath = buildStudioAshaDemoProductPathReadModel({
  gameWorkspace: workspaceResult.workspace,
  runtimeInspection,
});

assert.equal(initialProductPath.project.workspaceRoot, '../asha-demo');
assert.equal(initialProductPath.liveRuntime.lifecycleLabel, 'In progress');
assert.ok(defeatedProductPath.liveRuntime.lifecycleLabel !== null);
assert.equal(restartedProductPath.liveRuntime.lifecycleLabel, 'In progress');
assert.equal(restartedProductPath.controls.restart.commandId, 'runtime.restart_session_intent');

const artifact = {
  artifactKind: 'studio_asha_demo_product_path_evidence',
  artifactVersion: 'studio-asha-demo-product-path-evidence.v0',
  sourceProject: '../asha-demo',
  sourceFiles: {
    manifest: 'asha.game.toml',
    projectBundle: 'project/project-bundle.json',
  },
  publicSurfacesUsed: restartedProductPath.publicSurfacesUsed,
  lifecycle: {
    initial: initialProductPath.liveRuntime.lifecycleLabel,
    afterPolicy: defeatedProductPath.liveRuntime.lifecycleLabel,
    afterRestart: restartedProductPath.liveRuntime.lifecycleLabel,
  },
  controls: restartedProductPath.controls,
  productPath: restartedProductPath,
};

mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({
  proof: 'studio-asha-demo-product-path.v0',
  status: 'ok',
  artifactPath,
  productPathHash: restartedProductPath.productPathHash,
  publicSurfacesUsed: restartedProductPath.publicSurfacesUsed,
}, null, 2));
