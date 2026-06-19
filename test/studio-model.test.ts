import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createStudioShellModel, getVisibleCommands } from '../src/studio-model';

test('studio shell exposes every required V1 panel', () => {
  const model = createStudioShellModel();
  assert.deepEqual(model.panels.map((panel) => panel.id), ['scenario', 'viewport', 'palette', 'timeline', 'inspector', 'evidence']);
  for (const panel of model.panels) {
    assert.ok(panel.title.length > 0, panel.id);
    assert.ok(panel.summary.length > 0, panel.id);
    assert.match(panel.automationLabel, /^studio-panel-/);
  }
});

test('studio shell consumes the ASHA command registry catalog as visible command source', () => {
  const model = createStudioShellModel();
  assert.equal(model.commandCatalog.generatedFrom, 'COMMAND_MANIFEST');
  assert.ok(model.visibleCommands.length >= 10);
  assert.equal(model.visibleCommands.length, getVisibleCommands(model.commandCatalog).length);
  assert.ok(model.visibleCommands.some((command) => command.id === 'authority.voxel.apply_brush'));
  for (const command of model.visibleCommands) {
    assert.equal(command.guiMirror.required, true, command.id);
    assert.ok(command.guiMirror.argumentSummary.length > 0, command.id);
    assert.ok(command.guiMirror.resultSummary.length > 0, command.id);
    assert.ok(command.menuPath.length > 0, command.id);
  }
});

test('studio boundary model forbids internals and records deferred public packages', () => {
  const model = createStudioShellModel();
  assert.deepEqual(model.ashaBoundary.allowedImports, ['@asha/command-registry']);
  assert.ok(model.ashaBoundary.deferredPublicPackages.includes('@asha/studio-evidence'));
  assert.ok(model.ashaBoundary.forbiddenImportExamples.includes('@asha/native-bridge'));
  assert.ok(model.knownLimitations.some((limitation) => limitation.includes('@asha/studio-evidence')));
});

test('timeline preview is a projection, not command execution', () => {
  const model = createStudioShellModel();
  assert.ok(model.timelinePreview.length > 0);
  assert.ok(model.timelinePreview.every((entry) => entry.startsWith('seq-')));
  assert.ok(model.knownLimitations.some((limitation) => limitation.includes('Shell-only')));
});
