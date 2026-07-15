import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  STUDIO_VOXEL_HOUSE_BOUNDS,
  buildStudioVoxelHouseCommandBatches,
} from '@asha-studio/store';

test('house template stays bounded and leaves recognizable openings', () => {
  const batches = buildStudioVoxelHouseCommandBatches(1);
  assert.ok(batches.length > 1);
  assert.ok(batches.every(batch => batch.commands.length > 0 && batch.commands.length <= 64));

  const finalVoxels = new Map<string, boolean>();
  for (const command of batches.flatMap(batch => batch.commands)) {
    assert.equal(command.op, 'setVoxel');
    assert.equal(command.grid, 1);
    finalVoxels.set(
      `${command.coord.x}:${command.coord.y}:${command.coord.z}`,
      command.value.kind === 'solid',
    );
  }
  const solid = (coord: string): boolean => finalVoxels.get(coord) === true;

  assert.ok(solid('0:0:0'), 'floor corner');
  assert.ok(solid('5:4:10'), 'roof ridge');
  assert.ok(solid('8:6:12'), 'chimney top');
  assert.ok(!solid('5:0:2'), 'front doorway opening');
  assert.ok(!solid('2:8:2'), 'rear window opening');
  assert.ok(!solid('10:6:2'), 'side window opening');
  assert.deepEqual(STUDIO_VOXEL_HOUSE_BOUNDS.max, { x: 10, y: 8, z: 12 });
});
