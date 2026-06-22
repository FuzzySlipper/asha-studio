import { mkdirSync, writeFileSync } from 'node:fs';

import { createStudioWorkspaceModel } from '../src/session-workspace';

const workspace = createStudioWorkspaceModel();
mkdirSync('fixtures', { recursive: true });
writeFileSync('fixtures/studio-scene-view.sample.json', `${JSON.stringify(workspace.sceneView, null, 2)}\n`);
writeFileSync('fixtures/studio-agent-readout.sample.json', `${JSON.stringify(workspace.exportedReadout, null, 2)}\n`);
