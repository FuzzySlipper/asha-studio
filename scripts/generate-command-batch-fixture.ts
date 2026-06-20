import { mkdirSync, writeFileSync } from 'node:fs';

import { createStudioWorkspaceModel } from '../src/session-workspace';

const workspace = createStudioWorkspaceModel();
mkdirSync('fixtures', { recursive: true });
writeFileSync('fixtures/studio-command-batch.sample.json', `${JSON.stringify(workspace.commandBatch, null, 2)}\n`);
