import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  entityId,
  renderHandle,
  sceneNodeId,
  type SceneObjectSnapshot,
} from '@asha/contracts';
import type { AshaRendererEditorViewportPickHint } from '@asha/renderer-host';
import { resolveStudioViewportPickRoute } from '../libs/studio-viewport/src/viewport-pick-routing.js';

const scene: SceneObjectSnapshot = {
  documentHash: 43,
  objects: [
    {
      id: sceneNodeId(10),
      parent: null,
      childOrder: 0,
      label: 'runtime object A',
      kind: 'staticMesh',
      hasRenderableAsset: true,
    },
    {
      id: sceneNodeId(20),
      parent: null,
      childOrder: 1,
      label: 'runtime object B',
      kind: 'staticMesh',
      hasRenderableAsset: true,
    },
  ],
};

function hint(
  channel: AshaRendererEditorViewportPickHint['channel'],
  label: string | null,
): AshaRendererEditorViewportPickHint {
  return {
    channel,
    distance: 4,
    handle: renderHandle(222),
    label,
    layer: 'scene',
    normal: [0, 1, 0],
    position: [7, 8, 9],
    sourceTrace: { entity: entityId(902), kind: 'render_metadata_entity' },
    tags: [],
  };
}

test('runtime canvas route selects the object identified by the actual typed hint', () => {
  const route = resolveStudioViewportPickRoute(hint('runtime', 'runtime object B'), scene);

  assert.equal(route.kind, 'runtime');
  if (route.kind !== 'runtime') return;
  assert.equal(route.sceneObjectId, sceneNodeId(20));
  assert.deepEqual(route.anchor, {
    handle: renderHandle(222),
    sourceEntity: entityId(902),
    position: [7, 8, 9],
    normal: [0, 1, 0],
  });
});

test('authored and no-hit canvas routes cannot become runtime routes', () => {
  const authored = resolveStudioViewportPickRoute(hint('authored', 'stored cube'), scene);
  assert.deepEqual(authored, {
    kind: 'authored',
    renderableId: 'stored cube',
    position: [7, 8, 9],
    normal: [0, 1, 0],
  });
  assert.deepEqual(resolveStudioViewportPickRoute(null, scene), { kind: 'none' });
});

test('ambiguous and untraced runtime hints fail closed instead of selecting the first object', () => {
  const duplicateScene: SceneObjectSnapshot = {
    ...scene,
    objects: scene.objects.map(object => ({ ...object, label: 'duplicate' })),
  };
  const ambiguous = resolveStudioViewportPickRoute(hint('runtime', 'duplicate'), duplicateScene);
  assert.equal(ambiguous.kind, 'runtime');
  if (ambiguous.kind === 'runtime') {
    assert.equal(ambiguous.sceneObjectId, null);
  }

  const untracedHint = { ...hint('runtime', 'runtime object B'), sourceTrace: null };
  const untraced = resolveStudioViewportPickRoute(untracedHint, scene);
  assert.equal(untraced.kind, 'runtime');
  if (untraced.kind === 'runtime') {
    assert.equal(untraced.sceneObjectId, null);
  }
});
