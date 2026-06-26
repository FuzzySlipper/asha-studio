import { mkdirSync, writeFileSync } from 'node:fs';

import { createStudioWorkspaceModel } from '../src/session-workspace';

const workspace = createStudioWorkspaceModel();
mkdirSync('fixtures', { recursive: true });
writeFileSync('fixtures/studio-transform-gizmo.sample.json', `${JSON.stringify(workspace.transformGizmo, null, 2)}\n`);
