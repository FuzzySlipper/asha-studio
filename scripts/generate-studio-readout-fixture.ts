import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildInitialWorkspaceReadModel,
  buildStudioCompatibilityEvidence,
  createStudioAgentReadout,
  type StudioPackageJsonLike,
} from '../libs/studio-domain/src/index';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf8'),
) as StudioPackageJsonLike;

const workspace = buildInitialWorkspaceReadModel();
const readout = createStudioAgentReadout(workspace, {
  compatibility: buildStudioCompatibilityEvidence({ packageJson }),
  generatedAtIso: '1970-01-01T00:00:00.000Z',
});
const fixtureDir = join(repoRoot, 'fixtures');

mkdirSync(fixtureDir, { recursive: true });
writeFileSync(
  join(fixtureDir, 'studio-agent-readout.sample.json'),
  `${JSON.stringify(readout, null, 2)}\n`,
  'utf8',
);
