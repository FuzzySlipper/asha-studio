import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applySceneObjectCommandReadModel,
  buildInitialWorkspaceReadModel,
  buildStudioUiStateReadModel,
  createRenameSceneObjectRequest,
} from '@asha-studio/domain';

test('the bottom workspace exposes only operator workflow tabs', () => {
  const workspace = buildInitialWorkspaceReadModel();
  const ui = buildStudioUiStateReadModel({
    activeMenu: null,
    bottomPanelTab: 'commands',
    assetBrowserCategory: 'all',
    entities: workspace.entities,
    hierarchyFilter: '',
    menuMessage: 'Ready',
    projectWorkspaceAvailable: true,
  });

  assert.equal(ui.bottomPanelTab, 'commands');
  assert.equal(ui.projectWorkspaceAvailable, true);
});

test('accepted scene edits change stored state while stale edits do not', () => {
  const workspace = buildInitialWorkspaceReadModel();
  const selected = workspace.entities.find(entity => entity.sceneObjectId !== null);
  assert.ok(selected?.sceneObjectId);

  const acceptedRequest = createRenameSceneObjectRequest(
    workspace,
    selected.sceneObjectId,
    'Renamed in Studio',
  );
  const accepted = applySceneObjectCommandReadModel(workspace, acceptedRequest);
  assert.equal(accepted.ok, true);
  assert.equal(
    accepted.workspace.flatSceneDocument.nodes.some(node => node.label === 'Renamed in Studio'),
    true,
  );

  const staleRequest = {
    ...acceptedRequest,
    expectedDocumentHash: acceptedRequest.expectedDocumentHash + 1,
  };
  const rejected = applySceneObjectCommandReadModel(workspace, staleRequest);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.result.rejection?.code, 'stale-scene-object-snapshot');
  assert.deepEqual(rejected.workspace.flatSceneDocument, workspace.flatSceneDocument);
  assert.deepEqual(rejected.workspace.scene, workspace.scene);
});
