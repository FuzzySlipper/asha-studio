import assert from 'node:assert/strict';
import test from 'node:test';
import { StudioWorkspaceAuthoringOpenLifecycle } from '@asha-studio/store';

test('a newer workspace-authoring open invalidates delayed earlier completion', () => {
  const lifecycle = new StudioWorkspaceAuthoringOpenLifecycle();
  const first = lifecycle.begin();
  const replacement = lifecycle.begin();

  assert.equal(lifecycle.isCurrent(first), false);
  assert.equal(lifecycle.isCurrent(replacement), true);
});

test('successive workspace replacements retain exactly one current generation', () => {
  const lifecycle = new StudioWorkspaceAuthoringOpenLifecycle();
  const scratch = lifecycle.begin();
  const project = lifecycle.begin();
  const sceneReplacement = lifecycle.begin();

  assert.equal(lifecycle.isCurrent(scratch), false);
  assert.equal(lifecycle.isCurrent(project), false);
  assert.equal(lifecycle.isCurrent(sceneReplacement), true);
  assert.deepEqual(
    [scratch.generation, project.generation, sceneReplacement.generation],
    [1, 2, 3],
  );
});
