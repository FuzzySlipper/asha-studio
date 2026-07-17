import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  ASHA_STUDIO_PROJECT_SETTINGS_PATH,
  buildDefaultStudioHostUserSettings,
  buildDefaultStudioProjectSettings,
  parseStudioHostUserSettings,
  parseStudioProjectSettings,
  resolveStudioEffectiveSettings,
  serializeStudioHostUserSettings,
  serializeStudioProjectSettings,
} from '@asha-studio/domain';
import { createStudioProject, openStudioProject } from '../scripts/studio-project-service';
import {
  readStudioUserSettings,
  resolveStudioUserSettingsLocation,
  writeStudioUserSettings,
} from '../scripts/studio-user-settings-service';

test('effective settings use project geometry, host-user presentation, and session precedence', () => {
  const project = buildDefaultStudioProjectSettings({ gameId: 'grid-game', manifestPath: 'asha.game.toml' });
  const hostUser = buildDefaultStudioHostUserSettings('project:key');
  const effective = resolveStudioEffectiveSettings({
    project: {
      ...project,
      spatialGrid: {
        ...project.spatialGrid,
        origin: [1, 2, 3],
        spacing: [2, 2, 2],
      },
    },
    hostUser: {
      ...hostUser,
      sceneView: { ...hostUser.sceneView, gridVisible: false, cameraMoveSpeed: 9 },
    },
    session: { gridVisible: true, cameraMoveSpeed: 12 },
  });
  assert.equal(effective.coordinateSystem, 'rightHandedYUp');
  assert.equal(effective.units, 'meters');
  assert.deepEqual(effective.grid.grid.origin, [1, 2, 3]);
  assert.deepEqual(effective.grid.grid.spacing, [2, 2, 2]);
  assert.equal(effective.grid.visible, true);
  assert.equal(effective.cameraMoveSpeed, 12);
  assert.deepEqual(effective.sourcePrecedence, ['session', 'host-user', 'project', 'engine']);
});

test('settings codecs reject invalid shape and preserve unsupported future artifacts verbatim', () => {
  const project = buildDefaultStudioProjectSettings({ gameId: 'codec-game', manifestPath: 'asha.game.toml' });
  const canonical = serializeStudioProjectSettings(project);
  assert.deepEqual(parseStudioProjectSettings(canonical).artifact, project);

  const future = canonical.replace('asha-studio-project-settings.v1', 'asha-studio-project-settings.v99');
  const futureResult = parseStudioProjectSettings(future);
  assert.equal(futureResult.status, 'unsupported_future_version');
  assert.equal(futureResult.preservedRawText, future);

  const invalidUser = serializeStudioHostUserSettings(buildDefaultStudioHostUserSettings('project:key'))
    .replace('"cameraMoveSpeed": 6', '"cameraMoveSpeed": 0');
  assert.equal(parseStudioHostUserSettings(invalidUser).status, 'invalid');
});

test('host user settings survive service restart and remain isolated by canonical project root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-settings-'));
  const configDirectory = join(root, 'host-config');
  const projectA = join(root, 'project-a');
  const projectB = join(root, 'project-b');
  try {
    const locationA = await resolveStudioUserSettingsLocation({ projectRoot: projectA, configDirectory });
    const locationB = await resolveStudioUserSettingsLocation({ projectRoot: projectB, configDirectory });
    assert.notEqual(locationA.projectKey, locationB.projectKey);

    const artifact = buildDefaultStudioHostUserSettings(locationA.projectKey);
    const firstWrite = await writeStudioUserSettings({
      projectRoot: projectA,
      configDirectory,
      text: serializeStudioHostUserSettings({
        ...artifact,
        sceneView: { ...artifact.sceneView, cameraMoveSpeed: 18, invertPanY: true },
        keyboard: { ...artifact.keyboard, moveForward: 'ArrowUp' },
      }),
      expectedHash: null,
    }) as { readonly ok: boolean; readonly sha256?: string };
    assert.equal(firstWrite.ok, true);

    const afterRestart = await readStudioUserSettings({ projectRoot: projectA, configDirectory }) as {
      readonly ok: boolean;
      readonly text: string;
      readonly sha256: string;
    };
    assert.equal(afterRestart.ok, true);
    assert.equal(parseStudioHostUserSettings(afterRestart.text).artifact?.sceneView.cameraMoveSpeed, 18);
    assert.equal(parseStudioHostUserSettings(afterRestart.text).artifact?.sceneView.invertPanY, true);
    assert.equal(parseStudioHostUserSettings(afterRestart.text).artifact?.keyboard.moveForward, 'ArrowUp');

    const staleWrite = await writeStudioUserSettings({
      projectRoot: projectA,
      configDirectory,
      text: serializeStudioHostUserSettings(artifact),
      expectedHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    }) as { readonly ok: boolean; readonly diagnostic?: string };
    assert.equal(staleWrite.ok, false);
    assert.equal(staleWrite.diagnostic, 'stale_file_hash');

    const projectBRead = await readStudioUserSettings({ projectRoot: projectB, configDirectory }) as {
      readonly ok: boolean;
      readonly exists: boolean;
    };
    assert.equal(projectBRead.ok, true);
    assert.equal(projectBRead.exists, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Create Project produces an openable host project and committed spatial settings', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-project-'));
  const projectRoot = join(root, 'sample-game');
  try {
    const created = await createStudioProject(root, { projectRoot, gameId: 'sample-game' }) as {
      readonly ok: boolean;
      readonly manifestPath: string;
    };
    assert.equal(created.ok, true);
    const opened = await openStudioProject(root, { manifestPath: created.manifestPath }) as {
      readonly ok: boolean;
      readonly gameId: string;
      readonly existingRelativePaths: readonly string[];
    };
    assert.equal(opened.ok, true);
    assert.equal(opened.gameId, 'sample-game');
    assert.ok(opened.existingRelativePaths.includes('scenes'));

    const projectSettingsText = await readFile(join(projectRoot, ASHA_STUDIO_PROJECT_SETTINGS_PATH), 'utf8');
    assert.equal(parseStudioProjectSettings(projectSettingsText).artifact?.spatialGrid.coordinateSystem, 'rightHandedYUp');

    await writeFile(join(projectRoot, ASHA_STUDIO_PROJECT_SETTINGS_PATH), projectSettingsText.replace(
      'asha-studio-project-settings.v1',
      'asha-studio-project-settings.v2',
    ));
    assert.equal(
      parseStudioProjectSettings(await readFile(join(projectRoot, ASHA_STUDIO_PROJECT_SETTINGS_PATH), 'utf8')).status,
      'unsupported_future_version',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
