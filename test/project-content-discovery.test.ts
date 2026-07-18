import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { discoverStudioProjectContentFiles } from '../scripts/studio-project-service';

test('project content discovery follows manifest roots and ignores unrelated build output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-content-discovery-'));
  try {
    await Promise.all([
      mkdir(join(root, 'world/scenes'), { recursive: true }),
      mkdir(join(root, 'game-data/actors'), { recursive: true }),
      mkdir(join(root, 'target/debug'), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(root, 'world/scenes/main.scene.json'), '{}'),
      writeFile(join(root, 'game-data/actors/player.json'), '{}'),
      writeFile(join(root, 'game-data/actors/readme.txt'), 'not project content'),
      writeFile(join(root, 'target/debug/ambient.json'), '{}'),
    ]);

    const files = await discoverStudioProjectContentFiles(root, [
      { path: 'world', rootKind: 'scene' },
      { path: 'game-data', rootKind: 'catalog' },
    ]);

    assert.deepEqual(
      files.map(file => [file.relativePath, file.rootKind]),
      [
        ['game-data/actors/player.json', 'catalog'],
        ['world/scenes/main.scene.json', 'scene'],
      ],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
