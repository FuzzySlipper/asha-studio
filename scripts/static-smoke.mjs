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
  'Scenario / Session',
  'Viewport Editor Panel',
  'Command Palette / Menu Mirror',
  'Command Timeline',
  'Inspector / Readout',
  'Evidence / Export',
  'authority.voxel.apply_brush',
]) {
  if (!bundleText.includes(expected)) {
    throw new Error(`built bundle is missing expected studio shell marker: ${expected}`);
  }
}
console.log(`asha-studio static smoke: OK (${jsFiles.length} JS bundle file(s))`);
