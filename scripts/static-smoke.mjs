import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('dist/index.html is missing; run pnpm run build first');
}
const assetDir = join(dist, 'assets');
const jsFiles = readdirSync(assetDir).filter((file) => file.endsWith('.js'));
if (jsFiles.length === 0) {
  throw new Error('dist/assets contains no built JavaScript bundle');
}
const bundleText = jsFiles.map((file) => readFileSync(join(assetDir, file), 'utf8')).join('\n');
for (const expected of [
  'ASHA Studio',
  'studio-editor-app-status-bar',
  'studio-editor-left-scene-hierarchy-dock',
  'studio-editor-central-viewport-dock',
  'studio-editor-right-inspector-dock',
  'studio-editor-bottom-command-evidence-dock',
  'runtime bridge:',
  'deferred',
  'native / Agora / GPU: not claimed',
  'boundary: public package roots only',
  'Scene / Hierarchy',
  'studio-scene-hierarchy-dock',
  'scene-hierarchy-tree-readout',
  'Selected voxel',
  'Preview ghost',
  'authority-backed',
  'preview-only',
  'State legend',
  'Scenario / Session',
  'Viewport — terrain-test-grid',
  'studio-central-reference-viewport-canvas',
  'persp · 35mm',
  'grid ✓',
  'gizmos ✓',
  'shading: flat',
  'preview ghost',
  'projection: software_snapshot_reference',
  'Viewport Editor Panel',
  'Command Palette / Menu Mirror',
  'Command Timeline',
  'Inspector / Readout',
  'Inspector / Readout',
  'studio-selected-target-inspector',
  'selected-target-preview-card',
  'selected-target-applied-card',
  'Proposed by Studio (TS), projection only.',
  'Validated by Authority (Rust), authoritative state.',
  'Authority transition',
  'Render projection',
  'software_snapshot_reference',
  'no native runtime, Agora, GPU, or performance claim',
  'Evidence / Export',
  'Command Timeline / Evidence Log',
  'Evidence / Artifacts',
  'bottom-command-row-list',
  'bottom-evidence-artifact-list',
  'artifact-review-export-0001',
  'artifact-agent-readout-0001',
  'not a second private command log',
  'authority.voxel.apply_brush',
]) {
  if (!bundleText.includes(expected)) {
    throw new Error(`built bundle is missing expected studio shell marker: ${expected}`);
  }
}
console.log(`asha-studio static smoke: OK (${jsFiles.length} JS bundle file(s))`);
