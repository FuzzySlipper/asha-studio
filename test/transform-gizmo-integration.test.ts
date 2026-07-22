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
  type Transform,
} from '@asha/contracts';
import {
  DEFAULT_TRANSFORM_MANIPULATOR_SNAPPING,
  beginTransformManipulatorDrag,
  cancelTransformManipulatorDrag,
  projectTransformManipulator,
  transformManipulatorHandleFromId,
  updateTransformManipulatorDrag,
  type TransformManipulatorHandle,
} from '@asha/editor-tools';
import {
  applyCanonicalSceneDocumentReadModel,
  applySelectedEntityReadModel,
  buildInitialWorkspaceReadModel,
  composeStudioSceneTransform,
  deriveStudioSceneLocalTransform,
  type StudioWorkspaceReadModel,
} from '@asha-studio/domain';
import {
  StudioPreferencesStore,
  StudioWorkspaceStore,
} from '@asha-studio/store';
import { applyStudioTranslationGridSnap } from '../libs/studio-viewport/src/grid-snapping.js';
import { projectedPreviewTransform } from '../libs/studio-viewport/src/transform-preview.js';

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

function roundedTransform(transform: Transform): Transform {
  return {
    translation: transform.translation.map(value => Number(value.toFixed(9))) as [number, number, number],
    rotation: transform.rotation.map(value => Number(value.toFixed(9))) as [number, number, number, number],
    scale: transform.scale.map(value => Number(value.toFixed(9))) as [number, number, number],
  };
}

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

test('appearance manipulation preview and cancel preserve renderer-realized model scale', () => {
  const rendered: Transform = {
    translation: [13, 2, -2],
    rotation: [0, 0, 0, 1],
    scale: [0.5, 2, 1],
  };
  const source: Transform = {
    translation: [13, 2, -2],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  };
  const moved: Transform = {
    ...source,
    translation: [14, 2, -2],
  };

  assert.deepEqual(projectedPreviewTransform(rendered, source, moved), {
    ...rendered,
    translation: [14, 2, -2],
  });
  assert.deepEqual(projectedPreviewTransform(rendered, source, source), rendered);
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
  assert.equal(viewportSource.includes('transform: drag?.candidate.transform ?? target.worldTransform'), true);
  assert.equal(viewportSource.includes('source: target.worldTransform'), true);
  assert.equal(viewportSource.includes('settledDrag.candidateLocalTransform'), true);
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

test('translation grid snapping preserves coordinates outside the active world constraint', () => {
  const candidate = {
    kind: 'transform_manipulator_candidate.v0' as const,
    diagnostics: [],
    previewOnly: true as const,
    revision: 'constraint-snap',
    transform: { ...sourceTransform, translation: [1.6, 0.3, 0.7] as const },
  };
  const descriptor = {
    visible: true,
    grid: {
      coordinateSystem: 'rightHandedYUp' as const,
      origin: [0, 0, 0] as const,
      spacing: [1, 1, 1] as const,
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
  const constraint = (handle: TransformManipulatorHandle) => ({
      handle,
      orientation: 'world' as const,
      source: sourceTransform,
      parentWorldTransform: null,
    });
  assert.deepEqual(applyStudioTranslationGridSnap(
    candidate, descriptor, true, false, constraint({ kind: 'axis', mode: 'translate', axis: 'x' }),
  ).transform.translation, [2, 0.3, 0.7]);
  assert.deepEqual(applyStudioTranslationGridSnap(
    candidate, descriptor, true, false, constraint({ kind: 'axis', mode: 'translate', axis: 'y' }),
  ).transform.translation, [1.6, 0, 0.7]);
  assert.deepEqual(applyStudioTranslationGridSnap(
    candidate, descriptor, true, false, constraint({ kind: 'axis', mode: 'translate', axis: 'z' }),
  ).transform.translation, [1.6, 0.3, 1]);
  assert.deepEqual(applyStudioTranslationGridSnap(
    candidate, descriptor, true, false, constraint({ kind: 'plane', mode: 'translate', plane: 'xy' }),
  ).transform.translation, [2, 0, 0.7]);
  assert.deepEqual(applyStudioTranslationGridSnap(
    candidate, descriptor, true, false, constraint({ kind: 'plane', mode: 'translate', plane: 'xz' }),
  ).transform.translation, [2, 0.3, 1]);
  assert.deepEqual(applyStudioTranslationGridSnap(
    candidate, descriptor, true, false, constraint({ kind: 'plane', mode: 'translate', plane: 'yz' }),
  ).transform.translation, [1.6, 0, 1]);
});

test('local translation snapping honors world grid origin and anisotropic spacing', () => {
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
  const rotatedSource = {
    ...sourceTransform,
    translation: [0.5, -0.5, 1] as const,
    rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2] as const,
  };
  const candidate = {
    kind: 'transform_manipulator_candidate.v0' as const,
    diagnostics: [],
    previewOnly: true as const,
    revision: 'local-constraint-snap',
    transform: { ...rotatedSource, translation: [2.2, -0.5, -0.2] as const },
  };
  const snapped = applyStudioTranslationGridSnap(candidate, descriptor, true, false, {
    handle: { kind: 'axis', mode: 'translate', axis: 'x' },
    orientation: 'local',
    source: rotatedSource,
    parentWorldTransform: null,
  }).transform.translation;
  assert.deepEqual(snapped.map(value => Number(value.toFixed(9))), [2.2, -0.5, 1]);

  const childCandidate = {
    ...candidate,
    transform: { ...sourceTransform, translation: [1.6, 0.3, 0.7] as const },
  };
  assert.deepEqual(applyStudioTranslationGridSnap(childCandidate, {
    ...descriptor,
    grid: { ...descriptor.grid, origin: [0, 0, 0], spacing: [1, 1, 1] },
  }, true, false, {
    handle: { kind: 'axis', mode: 'translate', axis: 'x' },
    orientation: 'world',
    source: sourceTransform,
    parentWorldTransform: {
      translation: [10, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
  }).transform.translation, [2, 0.3, 0.7]);
});

interface MutableSignalForTest<T> {
  (): T;
  set(value: T): void;
}

interface TransformStoreInternals {
  readonly workspaceState: MutableSignalForTest<StudioWorkspaceReadModel>;
  readonly workspaceAuthoringBridgeState: MutableSignalForTest<NativeBrowserHostRuntimeBridge | null>;
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

function parentedTransformScene(): FlatSceneDocument {
  return {
    schemaVersion: 2,
    id: sceneId(5880),
    metadata: { name: 'Parented transform gizmo test', authoringFormatVersion: 2 },
    dependencies: [{ id: 'mesh.parented-target', version: { req: 'any' }, hash: null }],
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
        label: 'Rotated parent',
        tags: [],
        transform: {
          translation: [10, 0, 0],
          rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2],
          scale: [2, 1, 1],
        },
        kind: { kind: 'emptyGroup' },
      },
      {
        id: sceneNodeId(3),
        parent: sceneNodeId(2),
        childOrder: 0,
        label: 'Parented transform target',
        tags: ['authored'],
        transform: {
          translation: [1, 2, 3],
          rotation: [0, 0, 0, 1],
          scale: [1, 2, 3],
        },
        kind: {
          kind: 'staticMesh',
          asset: { id: 'mesh.parented-target', version: { req: 'any' }, hash: null },
        },
      },
    ],
  };
}

test('parented Studio gizmo projects, picks, and drags in world space while authoring local space', () => {
  const injector = createEnvironmentInjector([
    StudioPreferencesStore,
    StudioWorkspaceStore,
  ]);
  try {
    const store = runInInjectionContext(injector, () => inject(StudioWorkspaceStore));
    const internals = store as unknown as TransformStoreInternals;
    internals.workspaceState.set(applySelectedEntityReadModel(
      applyCanonicalSceneDocumentReadModel(
        buildInitialWorkspaceReadModel(),
        parentedTransformScene(),
        '/tmp/parented-transform-gizmo.scene.json',
      ),
      'scene-node:3',
    ));

    const target = store.selectedSceneTransformTarget();
    assert.notEqual(target, null);
    if (target === null || target.parentWorldTransform === null) return;
    assert.deepEqual(target.transform.translation, [1, 2, 3]);
    assert.deepEqual(
      target.worldTransform.translation.map(value => Number(value.toFixed(9))),
      [13, 2, -2],
    );

    const frame = projectTransformManipulator({
      active: null,
      hovered: null,
      mode: 'translate',
      orientation: 'world',
      transform: target.worldTransform,
      visible: true,
    });
    const xHandleOp = frame.ops.find(op => {
      if (op.op !== 'create') return false;
      const handle = transformManipulatorHandleFromId(op.handle);
      return handle?.kind === 'axis' && handle.mode === 'translate' && handle.axis === 'x';
    });
    assert.equal(xHandleOp?.op, 'create');
    if (xHandleOp?.op !== 'create') return;
    assert.deepEqual(
      xHandleOp.node.transform.translation.map(value => Number(value.toFixed(9))),
      [13.62, 2, -2],
    );

    const xHandle = transformManipulatorHandleFromId(xHandleOp.handle);
    assert.notEqual(xHandle, null);
    if (xHandle === null) return;
    const drag = beginTransformManipulatorDrag({
      camera,
      handle: xHandle,
      orientation: 'world',
      pointer: [400, 300],
      revision: target.revision,
      snapping: { ...DEFAULT_TRANSFORM_MANIPULATOR_SNAPPING, enabled: false },
      source: target.worldTransform,
    });
    assert.deepEqual(roundedTransform(drag.source).translation, [13, 2, -2]);

    const candidateWorldTransform = {
      ...drag.source,
      translation: [15, 2, -2] as const,
    };
    const candidateLocalTransform = deriveStudioSceneLocalTransform(
      target.parentWorldTransform,
      candidateWorldTransform,
    );
    assert.notEqual(candidateLocalTransform, null);
    if (candidateLocalTransform === null) return;
    assert.deepEqual(
      roundedTransform(composeStudioSceneTransform(target.parentWorldTransform, candidateLocalTransform)),
      roundedTransform(candidateWorldTransform),
    );
    const preview = store.previewSelectedSceneObjectTransform(
      target.revision,
      candidateLocalTransform,
    );
    assert.notEqual(preview, null);
    assert.deepEqual(
      preview === null ? null : roundedTransform(preview.worldTransform),
      roundedTransform(candidateWorldTransform),
    );
    assert.notDeepEqual(preview?.transform, candidateWorldTransform);
  } finally {
    injector.destroy();
  }
});

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

test('an open project routes scene commits through its workspace authority cell', () => {
  const injector = createEnvironmentInjector([
    StudioPreferencesStore,
    StudioWorkspaceStore,
  ]);
  try {
    const store = runInInjectionContext(injector, () => inject(StudioWorkspaceStore));
    const internals = store as unknown as TransformStoreInternals;
    const document = transformScene();
    internals.workspaceState.set(applySelectedEntityReadModel(
      applyCanonicalSceneDocumentReadModel(
        buildInitialWorkspaceReadModel(),
        document,
        '/projects/demo/scenes/current.scene.json',
      ),
      'scene-node:2',
    ));

    let codecCalls = 0;
    let workspaceCalls = 0;
    const codecBridge = {
      applySceneDocumentAuthoring: () => {
        codecCalls += 1;
        throw new Error('the detached codec authority must not receive project edits');
      },
    } as unknown as NativeBrowserHostRuntimeBridge;
    const workspaceBridge = {
      applySceneDocumentAuthoring: (
        request: Parameters<NativeBrowserHostRuntimeBridge['applySceneDocumentAuthoring']>[0],
      ): ReturnType<NativeBrowserHostRuntimeBridge['applySceneDocumentAuthoring']> => {
        workspaceCalls += 1;
        assert.equal(request.command.kind, 'setTransform');
        if (request.command.kind !== 'setTransform') {
          throw new Error('Expected one bounded project scene transform command.');
        }
        return {
          accepted: true,
          document: {
            ...request.currentDocument,
            nodes: request.currentDocument.nodes.map(node => (
              node.id === request.command.id
                ? { ...node, transform: request.command.transform }
                : node
            )),
          },
          contentHash: 'workspace-content-2',
          authoredLightFrame: { ops: [] },
          rejection: null,
        };
      },
    } as unknown as NativeBrowserHostRuntimeBridge;
    internals.sceneDocumentCodecBridgeState.set(codecBridge);
    internals.workspaceAuthoringBridgeState.set(workspaceBridge);
    internals.sceneDocumentContentHashState.set('workspace-content-1');
    internals.authoredLightFrameState.set({ ops: [] });
    internals.sceneTransformHistoryState.set({ entries: [], cursor: 0 });

    const target = store.selectedSceneTransformTarget();
    assert.notEqual(target, null);
    if (target === null) return;
    const result = store.commitSelectedSceneObjectTransform(target.revision, {
      ...target.transform,
      translation: [0.25, 0, 0],
    });

    assert.equal(result.accepted, true);
    assert.equal(workspaceCalls, 1);
    assert.equal(codecCalls, 0);
    assert.deepEqual(
      internals.workspaceState().flatSceneDocument.nodes.find(
        node => node.id === sceneNodeId(2),
      )?.transform.translation,
      [0.25, 0, 0],
    );
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
