import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createStudioWorkspaceModel } from '../src/session-workspace';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('scene hierarchy projects workspace evidence in deterministic tree order', () => {
  const workspace = createStudioWorkspaceModel();
  const hierarchy = workspace.sceneHierarchy;
  assert.equal(hierarchy.artifactKind, 'scene_hierarchy_projection');
  assert.equal(hierarchy.projectionMode, 'studio_state_projection');
  assert.deepEqual(hierarchy.nodes.map((node) => node.kind), ['session', 'scenario', 'grid', 'entity', 'voxel', 'voxel', 'material', 'model']);
  assert.deepEqual(hierarchy.nodes.map((node) => node.depth), [0, 1, 1, 2, 2, 3, 3, 3]);
  assert.equal(hierarchy.nodes[0]?.label, 'Session session-preview-0001');
  assert.equal(hierarchy.nodes[1]?.label, 'Basic Voxel Scenario');
  assert.equal(hierarchy.nodes[4]?.label, 'Selected voxel (0, 0, 0)');
});

test('scene hierarchy maps selected, authority-backed, projected, and preview-only badges', () => {
  const hierarchy = createStudioWorkspaceModel().sceneHierarchy;
  const selectedVoxel = hierarchy.nodes.find((node) => node.id.startsWith('voxel:'));
  const previewGhost = hierarchy.nodes.find((node) => node.id.startsWith('preview:'));
  const material = hierarchy.nodes.find((node) => node.kind === 'material');
  const grid = hierarchy.nodes.find((node) => node.kind === 'grid');
  assert.deepEqual(selectedVoxel?.badges, ['selected', 'authority-backed']);
  assert.deepEqual(previewGhost?.badges, ['preview-only']);
  assert.deepEqual(material?.badges, ['projected', 'selected']);
  assert.ok(grid?.badges.includes('authority-backed'));
  assert.deepEqual(hierarchy.legend.map((item) => item.badge), ['projected', 'authority-backed', 'preview-only', 'selected']);
});

test('scene hierarchy is exported through the agent readout with stable automation markers', () => {
  const workspace = createStudioWorkspaceModel();
  assert.equal(workspace.exportedReadout.sceneHierarchy.title, 'Scene / Hierarchy');
  assert.deepEqual(workspace.exportedReadout.sceneHierarchy.nodes.map((node) => node.id), workspace.sceneHierarchy.nodes.map((node) => node.id));
  assert.ok(workspace.exportedReadout.sceneHierarchy.automationMarkers.includes('scene-hierarchy-node-selected-voxel'));
  assert.ok(workspace.exportedReadout.sceneHierarchy.automationMarkers.includes('scene-hierarchy-legend'));
});

test('sample agent readout fixture carries scene hierarchy projection', () => {
  const fixture = JSON.parse(readFileSync(join(repoRoot, 'fixtures', 'studio-agent-readout.sample.json'), 'utf8')) as {
    readonly sceneHierarchy?: {
      readonly artifactKind?: string;
      readonly nodes?: readonly { readonly label?: string; readonly badges?: readonly string[] }[];
      readonly automationMarkers?: readonly string[];
    };
  };
  assert.equal(fixture.sceneHierarchy?.artifactKind, 'scene_hierarchy_projection');
  assert.ok(fixture.sceneHierarchy?.nodes?.some((node) => node.label === 'Selected voxel (0, 0, 0)' && node.badges?.includes('selected')));
  assert.ok(fixture.sceneHierarchy?.automationMarkers?.includes('scene-hierarchy-tree-readout'));
});
