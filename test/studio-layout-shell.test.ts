import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();

function readSource(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

test('default Studio route declares the numbered six-region shell markers', () => {
  const source = readSource('src/main.ts');
  for (const marker of [
    'studio-layout-root',
    'studio-menu-top-bar',
    'studio-left-scene-hierarchy-panel',
    'studio-viewport-top-bar',
    'studio-viewport-scene-panel',
    'studio-bottom-assets-panel',
    'studio-right-inspector-panel',
  ]) {
    assert.ok(source.includes(marker), `missing shell marker ${marker}`);
  }
  assert.ok(source.includes("'SCENE / HIERARCHY'"));
  assert.ok(source.includes("renderRegionTitle('4', 'Viewport / Scene View'"));
  assert.ok(source.includes("renderRegionTitle('5', 'Assets / Bottom Panel'"));
  assert.ok(source.includes("renderRegionTitle('6', 'Inspector'"));
});

test('default Studio route uses fixed viewport layout and gates debug readout', () => {
  const source = readSource('src/main.ts');
  const styles = readSource('src/styles.css');
  assert.match(source, /debugModeFromLocation\(\)/);
  assert.match(source, /params\.get\('debug'\) === '1'/);
  assert.match(source, /shell\.classList\.add\('studio-shell--six-region'\)/);
  assert.match(source, /shell\.classList\.add\('studio-shell--debug-readout'\)/);
  assert.match(styles, /\.studio-shell--six-region[\s\S]*height: 100vh/);
  assert.match(styles, /\.studio-shell--six-region[\s\S]*overflow: hidden/);
  assert.match(styles, /grid-template-areas:\s*"menu menu menu"\s*"left viewport right"\s*"bottom bottom bottom"/);
  assert.match(styles, /grid-template-rows: 64px minmax\(0, 1fr\) 210px/);
});

test('Region 1 renders projected scene hierarchy affordances instead of placeholder list', () => {
  const source = readSource('src/main.ts');
  const styles = readSource('src/styles.css');

  assert.match(source, /model\.workspace\.sceneHierarchy/);
  assert.match(source, /model\.workspace\.entityBrowser/);
  assert.match(source, /scene-hierarchy-filter-readout/);
  assert.match(source, /scene_hierarchy_create_affordance/);
  assert.match(source, /scene_hierarchy_focus_affordance/);
  assert.match(source, /el\('button', `scene-hierarchy-region-node/);
  assert.match(source, /row\.type = 'button'/);
  assert.match(source, /row\.setAttribute\('aria-pressed', String\(selected\)\)/);
  assert.match(source, /row\.dataset\.selectionStatus = selected \? 'selected' : 'available'/);
  assert.match(source, /row\.dataset\.selectedVoxel = selectedVoxel/);
  assert.match(source, /row\.dataset\.entityId = selectedEntityId/);
  assert.match(source, /scene-hierarchy-node-selected-voxel/);
  assert.doesNotMatch(source, /studio-placeholder-tree/);

  assert.match(styles, /\.scene-hierarchy-region-tree[\s\S]*overflow: auto/);
  assert.match(styles, /\.scene-hierarchy-region-node--selected/);
  assert.match(styles, /\.scene-hierarchy-region-node[\s\S]*cursor: pointer/);
  assert.match(styles, /\.scene-hierarchy-region-node[\s\S]*user-select: none/);
  assert.match(styles, /\.scene-hierarchy-region-node:focus-visible/);
  assert.match(styles, /\.scene-hierarchy-region-legend/);
  assert.match(styles, /\.scene-hierarchy-badge--authority-backed/);
});
