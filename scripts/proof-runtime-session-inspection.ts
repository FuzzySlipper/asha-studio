#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import {
  buildInitialWorkspaceReadModel,
  buildStudioRuntimeSessionInspectionReadModel,
  type StudioGameWorkspaceReadModel,
} from '@asha-studio/domain';
import {
  createMockRuntimeSession,
  type CameraCreateRequest,
  type CommandBatch,
  type RuntimeSessionProjectionSummary,
  type RuntimeSessionStateSummary,
  type RuntimeSessionTelemetrySummary,
  type WorldLoadRequest,
} from '@asha/runtime-bridge/reference';

const workspace = buildInitialWorkspaceReadModel();
const gameWorkspace: StudioGameWorkspaceReadModel = {
  workspaceVersion: 'studio-game-workspace.v0',
  workspaceRoot: '../asha-demo',
  manifestPath: 'asha.game.toml',
  gameId: 'asha-demo',
  manifest: {
    asha: {
      engineVersion: '0.1.0',
      contractsVersion: '0.1.0',
      runtimeBridgeVersion: '0.1.0',
      devtoolsProtocolVersion: 'devtools-protocol.v0',
      publishArtifactFormatVersion: 'publish-artifact.v0',
      engineSource: '../asha-engine',
    },
    workspace: {
      sceneRoots: ['scenes'],
      assetRoots: ['assets'],
      replayRoots: ['replays'],
      catalogPackages: ['packages/game-catalogs'],
      policyPackages: ['packages/game-policy'],
    },
    runtime: {
      devCommand: 'pnpm run dev',
      devtoolsEndpoint: 'ws://127.0.0.1:7391',
      wasmOrNativeEntry: 'harness/conformance/fixtures/minimal-world.json',
      backendMode: 'native',
      backendProfile: 'native.napi.launcher.v1',
      backendProofRefs: ['proof:runtime-session-public-facade'],
    },
    studio: {
      workspaceMode: true,
      attachEnabled: true,
      allowedSourceWrites: ['scenes', 'assets', 'packages/game-catalogs', 'packages/game-policy'],
    },
    publish: {
      command: 'pnpm run publish:artifact',
      artifactDir: 'harness/out',
      verifyCommand: 'pnpm run conformance',
    },
    devResourceProfile: {
      localRoots: ['assets', 'packages/game-catalogs'],
      cacheDir: 'harness/out/dev-cache',
      resolutionPolicy: 'prefer-source',
    },
    publishResourceProfile: {
      outputDir: 'harness/out/publish/resources',
      archiveDir: 'harness/out/publish/archive',
      resolutionPolicy: 'locked',
    },
  },
  sceneRoots: ['scenes'],
  assetRoots: ['assets'],
  catalogPackages: ['packages/game-catalogs'],
  policyPackages: ['packages/game-policy'],
  attachEndpoint: 'ws://127.0.0.1:7391',
  devCommand: 'pnpm run dev',
  runtimeEntry: 'harness/conformance/fixtures/minimal-world.json',
  publishCommand: 'pnpm run publish:artifact',
  publishVerifyCommand: 'pnpm run conformance',
  allowedSourceWrites: ['scenes', 'assets', 'packages/game-catalogs', 'packages/game-policy'],
  diagnostics: [],
  workspaceHash: 'studio-game-workspace-proof-runtime-session',
};

const projectBundle: WorldLoadRequest = {
  bundleSchemaVersion: 1,
  protocolVersion: 1,
  sceneId: 1001,
};

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

const facade = createMockRuntimeSession();
let state: RuntimeSessionStateSummary = facade.initialize({
  sessionId: 'runtime-session:asha-demo:proof',
  seed: 17,
  project: {
    gameId: 'asha-demo',
    workspaceId: gameWorkspace.workspaceHash,
  },
  projectBundle,
});

const acceptedBatch: CommandBatch = {
  commands: [{
    op: 'setVoxel',
    grid: 1,
    coord: { x: 0, y: 0, z: 0 },
    value: { kind: 'solid', material: 1 },
  }],
};
const receipt = facade.submitCommands(acceptedBatch);
assert.equal(receipt.acceptedCommandCount, 1);
state = {
  ...state,
  sequenceId: receipt.sequenceId,
  sessionHash: receipt.sessionHashAfter,
};
const tick = facade.tick();
state = {
  ...state,
  composition: tick.composition,
  sequenceId: tick.sequenceId,
  tick: tick.tick,
  sessionHash: tick.sessionHash,
};
let projection: RuntimeSessionProjectionSummary = facade.readProjection();
let telemetry: RuntimeSessionTelemetrySummary = facade.readTelemetry();
let generatedTunnelReadout = facade.readGeneratedTunnelReadout({ presetId: 'tiny-enclosed', seed: 17 });
let navProjection = facade.readNavProjection();

const liveReadout = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace,
  runtimeSessions: null,
  state,
  projection,
  telemetry,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout,
  navProjection,
  paused: false,
});

assert.equal(liveReadout.studioMode, 'live_runtime_inspection');
assert.equal(liveReadout.attachState, 'attached');
assert.equal(liveReadout.tick, 1);
assert.equal(liveReadout.commandSummary.acceptedCommandCount, 1);
assert.equal(liveReadout.commandSummary.rejectedCommandCount, 0);
assert.equal(liveReadout.replay.recordCount, 3);
assert.equal(liveReadout.projectionSummary.entityCount, workspace.entities.length);
assert.equal(liveReadout.controls.pause.available, false);
assert.equal(liveReadout.controls.tick.available, true);
assert.equal(liveReadout.controls.restart.available, true);
assert.ok(liveReadout.projectionHash?.startsWith('fnv1a64:'));
assert.equal(liveReadout.generatedLevel.definitionAuthoring.studioMode, 'definition_authoring');
assert.equal(liveReadout.generatedLevel.definitionAuthoring.validationStatus, 'valid');
assert.equal(liveReadout.generatedLevel.definitionAuthoring.boundary.liveRuntimeMutation, false);
assert.equal(liveReadout.generatedLevel.liveInspection.studioMode, 'live_runtime_inspection');
assert.equal(liveReadout.generatedLevel.liveInspection.generator.presetId, 'tiny-enclosed');
assert.equal(liveReadout.generatedLevel.liveInspection.generator.configHash, 'e1d156c6b55137a7');
assert.equal(liveReadout.generatedLevel.liveInspection.generator.outputHash, 'a9b504096397f5b4');
assert.equal(liveReadout.generatedLevel.liveInspection.generator.replayHash, 'fnv1a64:0821a0c2aea17dff');
assert.deepEqual(liveReadout.generatedLevel.liveInspection.volume.tunnelDims, [5, 4, 9]);
assert.equal(liveReadout.generatedLevel.liveInspection.projections.renderHash, 'fnv1a64:21eb8696f6f3b5c4');
assert.equal(liveReadout.generatedLevel.liveInspection.projections.collisionHash, 'fnv1a64:78b242163cf67524');
assert.equal(liveReadout.generatedLevel.liveInspection.projections.navProjectionHash, 'd1f6ac3e051d6b6e');
assert.equal(liveReadout.generatedLevel.liveInspection.spawnMarkers.length, 2);
assert.equal(liveReadout.generatedLevel.liveInspection.regenerate.available, true);
assert.ok(liveReadout.generatedLevel.inspectionHash.startsWith('studio-generated-level-inspection-'));

const camera = facade.createCamera(cameraRequest).snapshot.camera;
const autonomousPolicyTick = facade.runAutonomousPolicyTick({
  targetCamera: camera,
  policySource: 'export const policy = (view) => view;',
});
state = {
  ...state,
  composition: autonomousPolicyTick.step.composition,
  sequenceId: autonomousPolicyTick.sequenceIdAfter,
  tick: autonomousPolicyTick.tick,
  sessionHash: autonomousPolicyTick.sessionHashAfter,
};
let lifecycleStatus = facade.readLifecycleStatus();
for (let fireTick = 2; lifecycleStatus.outcome.kind !== 'won' && fireTick <= 12; fireTick += 1) {
  const fireReceipt = facade.submitRuntimeActionIntent({
    kind: 'runtime_action_intent.v0',
    action: 'primary_fire',
    phase: 'pressed',
    camera,
    tick: fireTick,
    source: 'programmatic',
    pressed: true,
  });
  assert.equal(fireReceipt.accepted, true);
  state = {
    ...state,
    sequenceId: fireReceipt.sequenceId,
    sessionHash: fireReceipt.sessionHashAfter,
  };
  lifecycleStatus = facade.readLifecycleStatus();
}
assert.equal(lifecycleStatus.outcome.kind, 'won');
projection = facade.readProjection();
telemetry = facade.readTelemetry();

const playableLoopReadout = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace,
  runtimeSessions: null,
  state,
  projection,
  telemetry,
  autonomousPolicyTick,
  lifecycleStatus,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout,
  navProjection,
  paused: false,
});

assert.equal(playableLoopReadout.playableLoop.loopVersion, 'studio-playable-loop-inspection.v0');
assert.equal(playableLoopReadout.playableLoop.policy.status, 'ran');
assert.equal(playableLoopReadout.playableLoop.policy.loopId, 'generated_tunnel_enemy_policy_loop.v0');
assert.equal(playableLoopReadout.playableLoop.policy.acceptedProposalCount, 2);
assert.equal(playableLoopReadout.playableLoop.policy.unsupportedProposalCount, 0);
assert.equal(playableLoopReadout.playableLoop.policy.movementReason, null);
assert.equal(playableLoopReadout.playableLoop.nav.pathHash, 'e8e1ea7a09811ced');
assert.equal(playableLoopReadout.playableLoop.nav.pathLength, 9);
assert.equal(playableLoopReadout.playableLoop.combat.status, 'accepted');
assert.equal(playableLoopReadout.playableLoop.combat.outcomeKind, 'hit');
assert.equal(playableLoopReadout.playableLoop.lifecycle.outcomeKind, 'won');
assert.equal(playableLoopReadout.playableLoop.lifecycle.label, 'Enemy defeated');
assert.equal(playableLoopReadout.playableLoop.lifecycle.eventKinds[0], 'runtime_lifecycle.enemy_defeated.v0');
assert.equal(playableLoopReadout.playableLoop.selectedEntity?.health?.current, 0);
assert.equal(playableLoopReadout.playableLoop.selectedEntity?.health?.dead, true);
assert.equal(playableLoopReadout.playableLoop.controls.restart.available, true);

const lifecycleRestartReceipt = facade.requestSessionRestart({
  kind: 'runtime.restart_session_intent',
  source: 'programmatic',
  requireTerminal: true,
  expectedSessionHash: lifecycleStatus.sessionHash,
});
assert.equal(lifecycleRestartReceipt.accepted, true);
assert.equal(lifecycleRestartReceipt.statusBefore.outcome.kind, 'won');
assert.equal(lifecycleRestartReceipt.statusAfter.outcome.kind, 'in_progress');
state = {
  ...state,
  composition: lifecycleRestartReceipt.restart?.composition ?? state.composition,
  sequenceId: lifecycleRestartReceipt.sequenceId,
  tick: lifecycleRestartReceipt.restart?.tick ?? state.tick,
  sessionHash: lifecycleRestartReceipt.sessionHashAfter,
};
projection = facade.readProjection();
telemetry = facade.readTelemetry();
generatedTunnelReadout = facade.readGeneratedTunnelReadout({ presetId: 'tiny-enclosed', seed: 17 });
navProjection = facade.readNavProjection();

const playableLoopRestartReadout = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace,
  runtimeSessions: null,
  state,
  projection,
  telemetry,
  autonomousPolicyTick,
  lifecycleStatus: lifecycleRestartReceipt.statusAfter,
  restartReceipt: lifecycleRestartReceipt,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout,
  navProjection,
  paused: false,
});

assert.equal(playableLoopRestartReadout.playableLoop.restart.lastReceipt?.status, 'accepted');
assert.equal(playableLoopRestartReadout.playableLoop.restart.lastReceipt?.statusBefore, 'won');
assert.equal(playableLoopRestartReadout.playableLoop.restart.lastReceipt?.statusAfter, 'in_progress');
assert.equal(playableLoopRestartReadout.playableLoop.lifecycle.outcomeKind, 'in_progress');

const regenerateReceipt = facade.requestGeneratedTunnelOperation({
  operation: 'regenerate',
  presetId: 'tiny-enclosed',
  seed: 17,
});
projection = facade.readProjection();
telemetry = facade.readTelemetry();

const regenerateReadout = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace,
  runtimeSessions: null,
  state: {
    ...state,
    sequenceId: regenerateReceipt.sequenceId,
    sessionHash: regenerateReceipt.sessionHashAfter,
  },
  projection,
  telemetry,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout,
  generatedTunnelRegenerateReceipt: regenerateReceipt,
  navProjection,
  paused: false,
});

assert.equal(regenerateReadout.generatedLevel.liveInspection.regenerate.lastReceipt?.status, 'unsupported');
assert.equal(
  regenerateReadout.generatedLevel.liveInspection.regenerate.lastReceipt?.reason,
  'generated_tunnel_operation_not_wired',
);

const restarted = facade.restart();
state = {
  ...state,
  composition: restarted.composition,
  sequenceId: restarted.sequenceId,
  tick: restarted.tick,
  sessionHash: restarted.sessionHash,
};
projection = facade.readProjection();
telemetry = facade.readTelemetry();
generatedTunnelReadout = facade.readGeneratedTunnelReadout({ presetId: 'tiny-enclosed', seed: 17 });
navProjection = facade.readNavProjection();

const restartedReadout = buildStudioRuntimeSessionInspectionReadModel({
  workspace,
  gameWorkspace,
  runtimeSessions: null,
  state,
  projection,
  telemetry,
  generatedLevelPreset: { presetId: 'tiny-enclosed', seed: 17 },
  generatedTunnelReadout,
  navProjection,
  paused: false,
});

assert.equal(restartedReadout.tick, 0);
assert.equal(restartedReadout.replay.lastRecordKind, 'restart');
assert.equal(restartedReadout.commandSummary.acceptedCommandCount, 0);

console.log(JSON.stringify({
  proof: 'studio-runtime-session-inspection.v0',
  status: 'ok',
  liveInspectionHash: liveReadout.inspectionHash,
  generatedLevelInspectionHash: liveReadout.generatedLevel.inspectionHash,
  playableLoopInspectionHash: playableLoopReadout.playableLoop.inspectionHash,
  playableLoopRestartStatus: playableLoopRestartReadout.playableLoop.restart.lastReceipt?.status,
  regenerateStatus: regenerateReadout.generatedLevel.liveInspection.regenerate.lastReceipt?.status,
  restartedInspectionHash: restartedReadout.inspectionHash,
  pauseControl: restartedReadout.controls.pause.disabledReason,
}, null, 2));
