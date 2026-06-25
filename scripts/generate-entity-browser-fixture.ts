import { mkdirSync, writeFileSync } from 'node:fs';

import { createStudioWorkspaceModel } from '../src/session-workspace';

const workspace = createStudioWorkspaceModel();
mkdirSync('fixtures', { recursive: true });
writeFileSync('fixtures/studio-entity-browser.sample.json', `${JSON.stringify(workspace.entityBrowser, null, 2)}\n`);
