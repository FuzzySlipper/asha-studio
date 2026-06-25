import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { demoAssetPackageFiles } from '../src/demo-asset-loading';

for (const file of demoAssetPackageFiles()) {
  mkdirSync(dirname(file.path), { recursive: true });
  writeFileSync(file.path, `${JSON.stringify(file.content, null, 2)}\n`);
  console.log(`wrote ${file.path}`);
}
