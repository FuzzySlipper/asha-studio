import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import '@angular/compiler';
import {
  createEnvironmentInjector,
  inject,
  runInInjectionContext,
} from '@angular/core';
import type { NativeBrowserHostRuntimeBridge } from '@asha/browser-host';
import {
  renderHandle,
  sceneId,
  sceneNodeId,
  type FlatSceneDocument,
  type RenderFrameDiff,
} from '@asha/contracts';
import {
  DEFAULT_TRANSFORM_MANIPULATOR_SNAPPING,
  beginTransformManipulatorDrag,
  cancelTransformManipulatorDrag,
  projectTransformManipulator,
  transformManipulatorHandleFromId,
  updateTransformManipulatorDrag,
} from '@asha/editor-tools';
import {
  applyCanonicalSceneDocumentReadModel,
  applySelectedEntityReadModel,
  buildInitialWorkspaceReadModel,
  type StudioWorkspaceReadModel,
} from '@asha-studio/domain';
import {
  StudioPreferencesStore,
  StudioWorkspaceStore,
} from '@asha-studio/store';
import { applyStudioTranslationGridSnap } from '../libs/studio-viewport/src/grid-snapping.js';

const repoRoot = process.cwd();
const sourceTransform = {
  translation: [0, 0, 0] as const,
  rotation: [0, 0, 0, 1] as const,
  scale: [1, 1, 1] as const,
};
const camera = {
  position: [4, 4, 4] as const,
  basis: {
    forward: [-0.577350269, -0.577350269, -0.577350269] as const,
    right: [0.707106781, 0, -0.707106781] as const,
    up: [-0.40824829, 0.816496581, -0.40824829] as const,
  },
  fovYDegrees: 42,
  viewport: { width: 800, height: 600 },
};

test('Studio consumes the public camera-aware manipulator candidate contract', () => {
  const frame = projectTransformManipulator({
    active: null,
    hovered: null,
    mode: 'translate',
    orientation: 'world',
    transform: sourceTransform,
    visible: true,
  });
  const xHandle = frame.ops.flatMap(op => {
    if (op.op !== 'create') return [];
    const handle = transformManipulatorHandleFromId(op.handle);
    return handle?.kind === 'axis' && handle.axis === 'x' ? [handle] : [];
  }).at(0);
  assert.notEqual(xHandle, undefined);
  if (xHandle === undefined) return;

  const drag = beginTransformManipulatorDrag({
    camera,
    handle: xHandle,
    orientation: 'world',
    pointer: [400, 300],
    revision: 'scene-revision-7',
    snapping: { ...DEFAULT_TRANSFORM_MANIPULATOR_SNAPPING, enabled: false },
    source: sourceTransform,
  });
  const coarse = updateTransformManipulatorDrag(drag, camera, [520, 300]);
  const fine = updateTransformManipulatorDrag(drag, camera, [520, 300], { fine: true });

  assert.equal(coarse.previewOnly, true);
  assert.equal(coarse.revision, 'scene-revision-7');
  assert.ok(Math.abs(coarse.transform.translation[0]) > Math.abs(fine.transform.translation[0]));
  assert.deepEqual(cancelTransformManipulatorDrag(drag).transform, sourceTransform);
});

test('Studio gizmo path previews per frame and settles through one revision-bound command', () => {
  const viewportSource = readFileSync(
    join(repoRoot, 'libs', 'studio-viewport', 'src', 'index.ts'),
    'utf8',
  );
  const storeSource = readFileSync(
    join(repoRoot, 'libs', 'studio-store', 'src', 'index.ts'),
    'utf8',
  );
  const panelSource = readFileSync(
    join(repoRoot, 'libs', 'studio-panels', 'src', 'index.ts'),
    'utf8',
  );

  assert.equal(viewportSource.includes('requestAnimationFrame'), true);
  assert.equal(viewportSource.includes('viewport.setGrid(gridDescriptor.visible ? gridDescriptor : null)'), true);
  assert.equal(viewportSource.includes('editor-grid-x:'), false);
  assert.equal(viewportSource.includes('previewSelectedSceneObjectTransform'), true);
  assert.equal(viewportSource.includes('commitSelectedSceneObjectTransform'), true);
  assert.equal(viewportSource.includes('totalDeltaX / 160'), false);
  assert.equal(storeSource.includes('buildStudioSceneAuthoringOperation'), true);
  assert.equal(storeSource.includes('expectedBaseHash: expectedRevision'), true);
  assert.equal(storeSource.includes('candidateDocument'), false);
  assert.equal(storeSource.includes("kind: 'setTransform'"), true);
  assert.equal(storeSource.includes("kind: 'retargetVoxelAsset'"), true);
  assert.equal(storeSource.includes('currentProjectId: STUDIO_STORED_SCENE_PROJECT_ID'), true);
  assert.equal(panelSource.includes("id: 'scale_object'"), true);
  assert.equal(panelSource.includes('data-transform-orientation="local"'), true);
  assert.equal(panelSource.includes('data-transform-snapping'), true);
});

test('translation snapping shares project origin spacing and boundary or cell-center semantics', () => {
  const candidate = {
    kind: 'transform_manipulator_candidate.v0' as const,
    diagnostics: [],
    previewOnly: true as const,
    revision: 'scene-revision-grid',
    transform: {
      ...sourceTransform,
      translation: [-2.7, 1.1, 4.4] as const,
    },
  };
  const descriptor = {
    visible: true,
    grid: {
      coordinateSystem: 'rightHandedYUp' as const,
      origin: [0.5, -0.5, 1] as const,
      spacing: [2, 0.5, 3] as const,
    },
    plane: 'xz' as const,
    snapAnchor: 'boundary' as const,
    style: {
      minorColor: [0.1, 0.1, 0.1, 1] as const,
      majorColor: [0.2, 0.2, 0.2, 1] as const,
      xAxisColor: [1, 0, 0, 1] as const,
      yAxisColor: [0, 1, 0, 1] as const,
      zAxisColor: [0, 0, 1, 1] as const,
      majorLineEvery: 4,
      opacity: 1,
      fadeStart: 12,
      fadeEnd: 64,
    },
  };
  assert.deepEqual(
    applyStudioTranslationGridSnap(candidate, descriptor, true).transform.translation,
    [-3.5, 1, 4],
  );
  assert.deepEqual(
    applyStudioTranslationGridSnap(candidate, { ...descriptor, snapAnchor: 'cellCenter' }, true).transform.translation,
    [-2.5, 1.25, 5.5],
  );
  assert.deepEqual(
    applyStudioTranslationGridSnap(candidate, descriptor, false).transform.translation,
    candidate.transform.translation,
  );
  const fine = applyStudioTranslationGridSnap(candidate, descriptor, true, true).transform.translation;
  assert.deepEqual(fine.map(value => Number(value.toFixed(6))), [-2.7, 1.1, 4.3]);
});

interface MutableSignalForTest<T> {
  (): T;
  set(value: T): void;
}

interface TransformStoreInternals {
  readonly workspaceState: MutableSignalForTest<StudioWorkspaceReadModel>;
  readonly sceneDocumentCodecBridgeState: MutableSignalForTest<NativeBrowserHostRuntimeBridge | null>;
  readonly sceneDocumentContentHashState: MutableSignalForTest<string | null>;
  readonly authoredLightFrameState: MutableSignalForTest<RenderFrameDiff>;
  readonly sceneTransformHistoryState: MutableSignalForTest<{
    readonly entries: readonly unknown[];
    readonly cursor: number;
  }>;
}

function transformScene(): FlatSceneDocument {
  return {
    schemaVersion: 1,
    id: sceneId(5845),
    metadata: { name: 'Transform authority test', authoringFormatVersion: 1 },
    dependencies: [{ id: 'mesh.transform-target', version: { req: 'any' }, hash: null }],
    nodes: [
      {
        id: sceneNodeId(1),
        parent: null,
        childOrder: 0,
        label: 'Root',
        tags: [],
        transform: sourceTransform,
        kind: { kind: 'emptyGroup' },
      },
      {
        id: sceneNodeId(2),
        parent: sceneNodeId(1),
        childOrder: 0,
        label: 'Transform target',
        tags: ['authored'],
        transform: sourceTransform,
        kind: {
          kind: 'staticMesh',
          asset: { id: 'mesh.transform-target', version: { req: 'any' }, hash: null },
        },
      },
    ],
  };
}

function lightTransformScene(): FlatSceneDocument {
  return {
    schemaVersion: 2,
    id: sceneId(5846),
    metadata: { name: 'Light transform authority test', authoringFormatVersion: 2 },
    dependencies: [],
    nodes: [
      {
        id: sceneNodeId(1),
        parent: null,
        childOrder: 0,
        label: 'Root',
        tags: [],
        transform: sourceTransform,
        kind: { kind: 'emptyGroup' },
      },
      {
        id: sceneNodeId(2),
        parent: sceneNodeId(1),
        childOrder: 0,
        label: 'Transform light',
        tags: ['authored'],
        transform: sourceTransform,
        kind: {
          kind: 'light',
          sceneLight: {
            kind: 'spot',
            color: [1, 0.8, 0.6],
            intensity: 5,
            enabled: true,
            range: 18,
            decay: 2,
            outerAngleRadians: 0.7,
            penumbra: 0.25,
            shadowIntent: 'disabled',
          },
        },
      },
    ],
  };
}

test('drag previews never call Rust and only an accepted release mutates authority and history', () => {
  const injector = createEnvironmentInjector([
    StudioPreferencesStore,
    StudioWorkspaceStore,
  ]);
  try {
    const store = runInInjectionContext(injector, () => inject(StudioWorkspaceStore));
    const internals = store as unknown as TransformStoreInternals;
    const document = transformScene();
    const projected = applySelectedEntityReadModel(
      applyCanonicalSceneDocumentReadModel(
        buildInitialWorkspaceReadModel(),
        document,
        '/tmp/transform-authority.scene.json',
      ),
      'scene-node:2',
    );

    let rejectAuthority = false;
    const requests: Parameters<NativeBrowserHostRuntimeBridge['applySceneDocumentAuthoring']>[0][] = [];
    const bridge = {
      applySceneDocumentAuthoring: (
        request: Parameters<NativeBrowserHostRuntimeBridge['applySceneDocumentAuthoring']>[0],
      ): ReturnType<NativeBrowserHostRuntimeBridge['applySceneDocumentAuthoring']> => {
        requests.push(request);
        if (rejectAuthority) {
          return {
            accepted: false,
            document: null,
            contentHash: null,
            authoredLightFrame: null,
            rejection: {
              code: 'contentHashMismatch',
              message: 'The drag started from stale Rust authority.',
              expectedHash: request.expectedContentHash,
              actualHash: 'rust-content-newer',
            },
          };
        }
        assert.equal(request.command.kind, 'setTransform');
        if (request.command.kind !== 'setTransform') {
          throw new Error('Expected one bounded transform command.');
        }
        const nextDocument: FlatSceneDocument = {
          ...request.currentDocument,
          nodes: request.currentDocument.nodes.map(node => (
            node.id === request.command.id
              ? { ...node, transform: request.command.transform }
              : node
          )),
        };
        return {
          accepted: true,
          document: nextDocument,
          contentHash: `rust-content-${requests.length + 1}`,
          authoredLightFrame: { ops: [] },
          rejection: null,
        };
      },
    } as unknown as NativeBrowserHostRuntimeBridge;

    internals.workspaceState.set(projected);
    internals.sceneDocumentCodecBridgeState.set(bridge);
    internals.sceneDocumentContentHashState.set('rust-content-1');
    internals.authoredLightFrameState.set({ ops: [] });
    internals.sceneTransformHistoryState.set({ entries: [], cursor: 0 });

    const start = store.selectedSceneTransformTarget();
    assert.notEqual(start, null);
    if (start === null) return;
    const candidate = {
      ...start.transform,
      translation: [3, 4, 5] as const,
    };

    for (let frame = 0; frame < 5; frame += 1) {
      const preview = store.previewSelectedSceneObjectTransform(start.revision, {
        ...candidate,
        translation: [candidate.translation[0] + frame, 4, 5],
      });
      assert.notEqual(preview, null);
    }
    assert.equal(requests.length, 0);
    assert.equal(internals.workspaceState().flatSceneDocument, document);
    assert.deepEqual(internals.sceneTransformHistoryState(), { entries: [], cursor: 0 });

    const accepted = store.commitSelectedSceneObjectTransform(start.revision, candidate);
    assert.equal(accepted.accepted, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.expectedContentHash, 'rust-content-1');
    assert.equal(requests[0]?.command.kind, 'setTransform');
    assert.deepEqual(
      internals.workspaceState().flatSceneDocument.nodes.find(node => node.id === sceneNodeId(2))?.transform,
      candidate,
    );
    assert.equal(internals.sceneTransformHistoryState().entries.length, 1);
    assert.equal(internals.sceneTransformHistoryState().cursor, 1);

    const afterAcceptedDocument = internals.workspaceState().flatSceneDocument;
    const afterAcceptedHistory = internals.sceneTransformHistoryState();
    const nextTarget = store.selectedSceneTransformTarget();
    assert.notEqual(nextTarget, null);
    if (nextTarget === null) return;
    rejectAuthority = true;
    const rejected = store.commitSelectedSceneObjectTransform(nextTarget.revision, {
      ...nextTarget.transform,
      translation: [9, 9, 9],
    });
    assert.equal(rejected.accepted, false);
    assert.equal(requests.length, 2);
    assert.equal(requests[1]?.expectedContentHash, 'rust-content-2');
    assert.equal(internals.workspaceState().flatSceneDocument, afterAcceptedDocument);
    assert.equal(internals.sceneTransformHistoryState(), afterAcceptedHistory);

    const locallyStale = store.commitSelectedSceneObjectTransform('stale-local-revision', candidate);
    assert.equal(locallyStale.accepted, false);
    assert.equal(requests.length, 2);
    assert.equal(internals.workspaceState().flatSceneDocument, afterAcceptedDocument);
    assert.equal(internals.sceneTransformHistoryState(), afterAcceptedHistory);
  } finally {
    injector.destroy();
  }
});

test('authored light drag previews a changed descriptor and stale settlement restores Rust projection', () => {
  const injector = createEnvironmentInjector([
    StudioPreferencesStore,
    StudioWorkspaceStore,
  ]);
  try {
    const store = runInInjectionContext(injector, () => inject(StudioWorkspaceStore));
    const internals = store as unknown as TransformStoreInternals;
    const document = lightTransformScene();
    const projected = applySelectedEntityReadModel(
      applyCanonicalSceneDocumentReadModel(
        buildInitialWorkspaceReadModel(),
        document,
        '/tmp/light-transform-authority.scene.json',
      ),
      'scene-node:2',
    );
    const authoritativeFrame: RenderFrameDiff = { ops: [{
      op: 'createLight',
      handle: renderHandle(1),
      parent: null,
      light: {
        kind: 'spot',
        color: [1, 0.8, 0.6],
        intensity: 5,
        enabled: true,
        position: [0, 0, 0],
        direction: [0, 0, -1],
        range: 18,
        decay: 2,
        outerAngleRadians: 0.7,
        penumbra: 0.25,
        shadowIntent: 'disabled',
      },
    }] };
    const requests: Parameters<NativeBrowserHostRuntimeBridge['applySceneDocumentAuthoring']>[0][] = [];
    const bridge = {
      applySceneDocumentAuthoring: (
        request: Parameters<NativeBrowserHostRuntimeBridge['applySceneDocumentAuthoring']>[0],
      ): ReturnType<NativeBrowserHostRuntimeBridge['applySceneDocumentAuthoring']> => {
        requests.push(request);
        return {
          accepted: false,
          document: null,
          contentHash: null,
          authoredLightFrame: null,
          rejection: {
            code: 'contentHashMismatch',
            message: 'The light drag started from stale Rust authority.',
            expectedHash: request.expectedContentHash,
            actualHash: 'rust-light-content-newer',
          },
        };
      },
    } as unknown as NativeBrowserHostRuntimeBridge;

    internals.workspaceState.set(projected);
    internals.sceneDocumentCodecBridgeState.set(bridge);
    internals.sceneDocumentContentHashState.set('rust-light-content-1');
    internals.authoredLightFrameState.set(authoritativeFrame);
    internals.sceneTransformHistoryState.set({ entries: [], cursor: 0 });
    store.setLightingMode('authored_lights');

    const start = store.selectedSceneTransformTarget();
    assert.notEqual(start, null);
    if (start === null) return;
    const candidate = {
      ...start.transform,
      translation: [3, 4, 5] as const,
      rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2] as const,
    };
    const preview = store.previewSelectedSceneObjectTransform(start.revision, candidate);
    assert.notEqual(preview, null);
    const previewLight = preview?.lightFrame.ops[0];
    assert.equal(previewLight?.op, 'updateLight');
    if (previewLight?.op === 'updateLight' && previewLight.light.kind === 'spot') {
      assert.deepEqual(previewLight.light.position, [3, 4, 5]);
      assert.notDeepEqual(previewLight.light.direction, [0, 0, -1]);
    }
    assert.equal(requests.length, 0);
    assert.equal(internals.authoredLightFrameState(), authoritativeFrame);
    assert.equal(store.selectedSceneTransformTarget()?.lightFrame, authoritativeFrame);

    const rejected = store.commitSelectedSceneObjectTransform(start.revision, candidate);
    assert.equal(rejected.accepted, false);
    assert.equal(requests.length, 1);
    assert.equal(internals.workspaceState().flatSceneDocument, document);
    assert.equal(internals.authoredLightFrameState(), authoritativeFrame);
    assert.deepEqual(internals.sceneTransformHistoryState(), { entries: [], cursor: 0 });
    assert.equal(store.selectedSceneTransformTarget()?.lightFrame, authoritativeFrame);

    const locallyStale = store.previewSelectedSceneObjectTransform('stale-light-revision', candidate);
    assert.equal(locallyStale, null);
    assert.equal(requests.length, 1);
    assert.equal(internals.authoredLightFrameState(), authoritativeFrame);
  } finally {
    injector.destroy();
  }
});
