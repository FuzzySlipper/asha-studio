import { mkdirSync, writeFileSync } from 'node:fs';

import { createStudioWorkspaceModel } from '../src/session-workspace';

const workspace = createStudioWorkspaceModel();
mkdirSync('fixtures', { recursive: true });
writeFileSync('fixtures/studio-selected-entity-inspector.sample.json', `${JSON.stringify(workspace.selectedEntityInspector, null, 2)}\n`);
