import { mkdirSync, writeFileSync } from 'node:fs';

import { createStudioDemoAssetLoadModel } from '../src/demo-asset-loading';

const model = createStudioDemoAssetLoadModel();
mkdirSync('fixtures', { recursive: true });
writeFileSync('fixtures/studio-demo-asset-load.sample.json', `${JSON.stringify(model.artifact, null, 2)}\n`);
