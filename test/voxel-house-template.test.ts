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
  assert.ok(solid('5:10:4'), 'roof ridge is high on Y');
  assert.ok(solid('8:12:6'), 'chimney top is high on Y');
  assert.ok(!solid('5:2:0'), 'front doorway opening');
  assert.ok(!solid('2:2:8'), 'rear window opening');
  assert.ok(!solid('10:2:6'), 'side window opening');
  assert.deepEqual(STUDIO_VOXEL_HOUSE_BOUNDS.max, { x: 10, y: 12, z: 8 });
});
