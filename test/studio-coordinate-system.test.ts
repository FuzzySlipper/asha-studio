import assert from 'node:assert/strict';
import test from 'node:test';
import type { FlatSceneDocument, VoxelVolumeAsset } from '@asha/contracts';
import {
  STUDIO_SCENE_LEGACY_Z_UP_TAG,
  STUDIO_SCENE_Y_UP_TAG,
  assessStudioSceneCoordinateSystem,
  buildInitialWorkspaceReadModel,
  buildStudioViewportCameraReadModel,
  moveStudioViewportCamera,
  orbitStudioViewportCamera,
} from '@asha-studio/domain';
import {
  STUDIO_VOXEL_LEGACY_SOURCE_TOOL,
  STUDIO_VOXEL_Y_UP_SOURCE_TOOL,
  assessStudioVoxelAssetCoordinateSystem,
} from '@asha-studio/store';

test('new Studio scenes and the editor camera use one right-handed Y-up convention', () => {
  const workspace = buildInitialWorkspaceReadModel();
  const camera = buildStudioViewportCameraReadModel();
  assert.deepEqual(camera.up, { x: 0, y: 1, z: 0 });
  assert.equal(workspace.flatSceneDocument.metadata.authoringFormatVersion, 2);
  assert.ok(workspace.flatSceneDocument.nodes.some(node => node.tags.includes(STUDIO_SCENE_Y_UP_TAG)));
  assert.equal(assessStudioSceneCoordinateSystem(workspace.flatSceneDocument).status, 'right_handed_y_up');
});

test('keyboard camera movement stays camera-relative on XZ and world-relative on Y', () => {
  const camera = buildStudioViewportCameraReadModel({
    position: { x: 0, y: 4, z: 8 },
    target: { x: 0, y: 1, z: 0 },
  });
  const moved = moveStudioViewportCamera(camera, {
    forward: 1,
    right: 1,
    up: 1,
    distance: 3,
  });
  const positionDelta = {
    x: moved.position.x - camera.position.x,
    y: moved.position.y - camera.position.y,
    z: moved.position.z - camera.position.z,
  };
  const targetDelta = {
    x: moved.target.x - camera.target.x,
    y: moved.target.y - camera.target.y,
    z: moved.target.z - camera.target.z,
  };
  assert.ok(Math.abs(targetDelta.x - positionDelta.x) < 1e-9);
  assert.ok(Math.abs(targetDelta.y - positionDelta.y) < 1e-9);
  assert.ok(Math.abs(targetDelta.z - positionDelta.z) < 1e-9);
  assert.ok(positionDelta.x > 0);
  assert.ok(positionDelta.y > 0);
  assert.ok(positionDelta.z < 0);
  assert.ok(Math.abs(Math.hypot(positionDelta.x, positionDelta.y, positionDelta.z) - 3) < 1e-9);
  assert.deepEqual(moved.up, { x: 0, y: 1, z: 0 });
});

test('orbit changes elevation on Y while preserving radius and the Y-up vector', () => {
  const camera = buildStudioViewportCameraReadModel({
    position: { x: 6, y: 4, z: 8 },
    target: { x: 1, y: 1, z: 2 },
  });
  const radius = Math.hypot(
    camera.position.x - camera.target.x,
    camera.position.y - camera.target.y,
    camera.position.z - camera.target.z,
  );
  const orbited = orbitStudioViewportCamera(camera, { deltaX: 35, deltaY: 20 });
  const nextRadius = Math.hypot(
    orbited.position.x - orbited.target.x,
    orbited.position.y - orbited.target.y,
    orbited.position.z - orbited.target.z,
  );
  assert.ok(Math.abs(nextRadius - radius) < 1e-9);
  assert.notEqual(orbited.position.y, camera.position.y);
  assert.deepEqual(orbited.up, { x: 0, y: 1, z: 0 });
});

test('legacy and unmarked scene artifacts are diagnosed without coordinate mutation', () => {
  const current = buildInitialWorkspaceReadModel().flatSceneDocument;
  const unmarked: FlatSceneDocument = {
    ...current,
    nodes: current.nodes.map(node => ({
      ...node,
      tags: node.tags.filter(tag => tag !== STUDIO_SCENE_Y_UP_TAG),
    })),
  };
  const before = JSON.stringify(unmarked);
  assert.equal(assessStudioSceneCoordinateSystem(unmarked).status, 'unverified');
  assert.equal(JSON.stringify(unmarked), before);

  const legacy: FlatSceneDocument = {
    ...unmarked,
    nodes: unmarked.nodes.map((node, index) => index === 0
      ? { ...node, tags: [...node.tags, STUDIO_SCENE_LEGACY_Z_UP_TAG] }
      : node),
  };
  assert.equal(assessStudioSceneCoordinateSystem(legacy).status, 'legacy_z_up');
});

function voxelAsset(sourceTool: string | null, coordinateSystem = 'y_up_right_handed'): VoxelVolumeAsset {
  return {
    grid: { coordinateSystem },
    authoring: { sourceTool },
  } as unknown as VoxelVolumeAsset;
}

test('legacy Studio voxel content is rejected while explicit Y-up content is accepted', () => {
  assert.equal(
    assessStudioVoxelAssetCoordinateSystem(voxelAsset(STUDIO_VOXEL_Y_UP_SOURCE_TOOL)).compatible,
    true,
  );
  const legacy = assessStudioVoxelAssetCoordinateSystem(voxelAsset(STUDIO_VOXEL_LEGACY_SOURCE_TOOL));
  assert.equal(legacy.compatible, false);
  assert.match(legacy.message, /legacy Studio/);
  assert.equal(
    assessStudioVoxelAssetCoordinateSystem(voxelAsset(null, 'z_up_right_handed')).compatible,
    false,
  );
});
