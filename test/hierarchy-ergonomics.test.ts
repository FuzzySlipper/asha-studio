import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import { createEnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { sceneId, sceneNodeId, type FlatSceneDocument } from '@asha/contracts';
import {
  STUDIO_SCENE_Y_UP_TAG,
  applyCanonicalSceneDocumentReadModel,
  buildInitialWorkspaceReadModel,
  setHierarchyEntityExpansionReadModel,
  type StudioEntityReadModel,
} from '@asha-studio/domain';
import { StudioPreferencesStore, StudioWorkspaceStore } from '@asha-studio/store';
import {
  filteredHierarchyEntities,
  hierarchyEntityHasChildren,
  visibleHierarchyEntities,
} from '../libs/studio-panels/src/hierarchy-tree.js';

function entity(
  id: string,
  label: string,
  depth: number,
  expanded: boolean,
  parentId: string | null,
): StudioEntityReadModel {
  return {
    id,
    parentId,
    label,
    kind: depth < 3 ? 'empty_group' : 'static_mesh',
    sourceState: 'authoritative',
    badge: 'authority-backed',
    depth,
    expanded,
    selectable: true,
    selected: false,
    renderableId: id,
    sceneObjectId: id as StudioEntityReadModel['sceneObjectId'],
  };
}

const nestedTree = [
  entity('root', 'Root', 0, true, null),
  entity('parent', 'Parent', 1, false, 'root'),
  entity('child', 'Child', 2, false, 'parent'),
  entity('target', 'Needle Target', 3, false, 'child'),
  entity('sibling', 'Sibling', 1, false, 'root'),
];

function hierarchyScene(): FlatSceneDocument {
  const transform = {
    translation: [0, 0, 0] as const,
    rotation: [0, 0, 0, 1] as const,
    scale: [1, 1, 1] as const,
  };
  return {
    schemaVersion: 2,
    id: sceneId(5879),
    metadata: { name: 'Hierarchy ergonomics', authoringFormatVersion: 2 },
    dependencies: [{ id: 'mesh.grandchild', version: { req: 'any' }, hash: null }],
    nodes: [
      { id: sceneNodeId(1), parent: null, childOrder: 0, label: 'Root', tags: [STUDIO_SCENE_Y_UP_TAG], transform, kind: { kind: 'emptyGroup' } },
      { id: sceneNodeId(2), parent: sceneNodeId(1), childOrder: 0, label: 'Parent A', tags: [], transform, kind: { kind: 'emptyGroup' } },
      { id: sceneNodeId(3), parent: sceneNodeId(1), childOrder: 1, label: 'Sibling B', tags: [], transform, kind: { kind: 'emptyGroup' } },
      {
        id: sceneNodeId(4),
        parent: sceneNodeId(2),
        childOrder: 0,
        label: 'Grandchild A',
        tags: [],
        transform,
        kind: {
          kind: 'staticMesh',
          asset: { id: 'mesh.grandchild', version: { req: 'any' }, hash: null },
        },
      },
    ],
  };
}

test('per-node visibility and filtering reveal collapsed matching descendants with ancestor context', () => {
  assert.deepEqual(visibleHierarchyEntities(nestedTree).map(item => item.id), [
    'root',
    'parent',
    'sibling',
  ]);
  assert.deepEqual(filteredHierarchyEntities(nestedTree, 'needle').map(item => item.id), [
    'root',
    'parent',
    'child',
    'target',
  ]);
  assert.equal(hierarchyEntityHasChildren(nestedTree, nestedTree[1]!), true);
  assert.equal(hierarchyEntityHasChildren(nestedTree, nestedTree[3]!), false);
});

test('per-node expansion changes only the requested UI row and survives scene projection refresh', () => {
  const initial = applyCanonicalSceneDocumentReadModel(
    buildInitialWorkspaceReadModel(),
    hierarchyScene(),
    null,
  );
  const parent = initial.entities.find(candidate => candidate.label === 'Parent A');
  assert.ok(parent);
  const collapsed = setHierarchyEntityExpansionReadModel(initial, parent.id, false);
  assert.equal(collapsed.entities.find(candidate => candidate.id === parent.id)?.expanded, false);
  assert.equal(
    collapsed.entities.filter(candidate => candidate.id !== parent.id).every((candidate, index) =>
      candidate.expanded === initial.entities.filter(item => item.id !== parent.id)[index]?.expanded),
    true,
  );
  const refreshed = applyCanonicalSceneDocumentReadModel(
    collapsed,
    collapsed.flatSceneDocument,
    null,
  );
  assert.equal(refreshed.entities.find(candidate => candidate.id === parent.id)?.expanded, false);
});

test('selecting a collapsed parent expands that parent without bulk expansion', () => {
  const injector = createEnvironmentInjector([StudioPreferencesStore, StudioWorkspaceStore]);
  try {
    const store = runInInjectionContext(injector, () => inject(StudioWorkspaceStore));
    const internals = store as unknown as {
      readonly workspaceState: { set(value: ReturnType<typeof buildInitialWorkspaceReadModel>): void };
    };
    internals.workspaceState.set(applyCanonicalSceneDocumentReadModel(
      buildInitialWorkspaceReadModel(),
      hierarchyScene(),
      null,
    ));
    const parent = store.workspace().entities.find(candidate => candidate.label === 'Parent A');
    assert.ok(parent);
    store.setHierarchyExpanded(false);
    store.selectEntity(parent.id);
    assert.equal(store.workspace().entities.find(candidate => candidate.id === parent.id)?.expanded, true);
    assert.equal(
      store.workspace().entities
        .filter(candidate => candidate.sceneObjectId !== null && candidate.id !== parent.id)
        .some(candidate => candidate.expanded),
      false,
    );
  } finally {
    injector.destroy();
  }
});

test('real sibling-before-grandchild snapshots become explicit deterministic hierarchy rows', () => {
  const workspace = applyCanonicalSceneDocumentReadModel(
    buildInitialWorkspaceReadModel(),
    hierarchyScene(),
    null,
  );
  const objectRows = workspace.entities.filter(entity => entity.sceneObjectId !== null);
  assert.deepEqual(objectRows.map(entity => entity.label), [
    'Root',
    'Parent A',
    'Grandchild A',
    'Sibling B',
  ]);
  const root = objectRows.find(entity => entity.label === 'Root');
  const parent = objectRows.find(entity => entity.label === 'Parent A');
  const grandchild = objectRows.find(entity => entity.label === 'Grandchild A');
  const sibling = objectRows.find(entity => entity.label === 'Sibling B');
  assert.ok(root && parent && grandchild && sibling);
  assert.equal(grandchild.parentId, parent.id);
  assert.equal(sibling.parentId, root.id);
  assert.equal(hierarchyEntityHasChildren(objectRows, parent), true);

  const collapsed = workspace.entities.map(entity => {
    if (entity.id === root.id) return { ...entity, expanded: true };
    if (entity.id === parent.id) return { ...entity, expanded: false };
    return entity;
  });
  assert.deepEqual(visibleHierarchyEntities(collapsed)
    .filter(entity => entity.sceneObjectId !== null)
    .map(entity => entity.label), [
    'Root',
    'Parent A',
    'Sibling B',
  ]);
  assert.deepEqual(filteredHierarchyEntities(collapsed, 'grandchild')
    .filter(entity => entity.sceneObjectId !== null)
    .map(entity => entity.label), [
    'Root',
    'Parent A',
    'Grandchild A',
  ]);
});
