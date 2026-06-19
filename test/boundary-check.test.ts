import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const checker = join(repoRoot, 'scripts', 'check-boundaries.mjs');

function makeFixture(sourceText: string, packageDependencies: Record<string, string> = {
  '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
  '@asha/contracts': 'link:../asha/ts/packages/contracts',
}): string {
  const root = mkdtempSync(join(tmpdir(), 'asha-studio-boundary-'));
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module', dependencies: packageDependencies }, null, 2));
  writeFileSync(join(root, 'src', 'fixture.ts'), sourceText);
  return root;
}

function runChecker(root: string) {
  return spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
}

test('boundary checker accepts package-root command registry imports', () => {
  const root = makeFixture("import { COMMAND_CATALOG } from '@asha/command-registry';\nconsole.log(COMMAND_CATALOG);\n");
  try {
    const result = runChecker(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /boundary check: OK/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects ASHA package subpath imports', () => {
  const badImport = `import { x } from '${'@asha/command-registry'}/src/internal';\nconsole.log(x);\n`;
  const root = makeFixture(badImport);
  try {
    const result = runChecker(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /package subpath/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects unapproved ASHA package-root imports from source', () => {
  const badImport = `import type { VoxelCoord } from '${'@asha/contracts'}';\nconst coord: VoxelCoord = { x: 0, y: 0, z: 0 };\nconsole.log(coord);\n`;
  const root = makeFixture(badImport);
  try {
    const result = runChecker(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unapproved ASHA package/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects explicitly forbidden raw package imports', () => {
  const forbiddenPackage = '@asha/' + 'native-bridge';
  const badImport = `import { createNativeRuntimeBridge } from '${forbiddenPackage}';\nconsole.log(createNativeRuntimeBridge);\n`;
  const root = makeFixture(badImport, {
    '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
    [forbiddenPackage]: 'link:../asha/ts/packages/native-bridge',
  });
  try {
    const result = runChecker(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not an allowed public package-root link|forbidden raw ASHA package|unapproved ASHA package/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
