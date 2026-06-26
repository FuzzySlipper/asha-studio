import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const checker = join(repoRoot, 'scripts', 'check-boundaries.mjs');
const policy = join(repoRoot, 'boundary-policy.json');

function makeFixture(
  sourceText: string,
  packageDependencies: Record<string, string> = {
    '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
    '@asha/contracts': 'link:../asha/ts/packages/contracts',
    '@asha/editor-tools': 'link:../asha/ts/packages/editor-tools',
    '@asha/runtime-bridge': 'link:../asha/ts/packages/runtime-bridge',
  },
  extraFiles: Record<string, string> = {},
  extraPackageJson: Record<string, unknown> = {},
): string {
  const root = mkdtempSync(join(tmpdir(), 'asha-studio-boundary-'));
  mkdirSync(join(root, 'src'));
  cpSync(policy, join(root, 'boundary-policy.json'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module', dependencies: packageDependencies, ...extraPackageJson }, null, 2));
  writeFileSync(join(root, 'src', 'fixture.ts'), sourceText);
  for (const [path, text] of Object.entries(extraFiles)) {
    const fullPath = join(root, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, text);
  }
  return root;
}

function runChecker(root: string) {
  return spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
}

function assertRejected(root: string, pattern: RegExp): void {
  const result = runChecker(root);
  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, pattern);
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

test('boundary checker accepts package-root runtime bridge imports', () => {
  const root = makeFixture("import { MANIFEST_OPERATIONS } from '@asha/runtime-bridge';\nconsole.log(MANIFEST_OPERATIONS);\n");
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
    assertRejected(root, /package subpath/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects unapproved ASHA package-root imports from source', () => {
  const badImport = `import { DevtoolsPanel } from '${'@asha/devtools'}';\nconsole.log(DevtoolsPanel);\n`;
  const root = makeFixture(badImport);
  try {
    assertRejected(root, /unapproved ASHA package/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects explicitly forbidden raw package imports', () => {
  const forbiddenPackage = '@asha/' + 'native-bridge';
  const badImport = `import { createNativeRuntimeBridge } from '${forbiddenPackage}';\nconsole.log(createNativeRuntimeBridge);\n`;
  const root = makeFixture(badImport, {
    '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
    '@asha/contracts': 'link:../asha/ts/packages/contracts',
    '@asha/editor-tools': 'link:../asha/ts/packages/editor-tools',
    '@asha/runtime-bridge': 'link:../asha/ts/packages/runtime-bridge',
    [forbiddenPackage]: 'link:../asha/ts/packages/native-bridge',
  });
  try {
    assertRejected(root, /only explicit public package-root links|forbidden raw ASHA package|unapproved ASHA package/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects missing required ASHA public surfaces', () => {
  const root = makeFixture("import { COMMAND_CATALOG } from '@asha/command-registry';\nconsole.log(COMMAND_CATALOG);\n", {
    '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
  });
  try {
    assertRejected(root, /missing required ASHA public surface @asha\/contracts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects dynamic imports and CommonJS requires', () => {
  const root = makeFixture(`
    async function load() { return import('${'@asha/command-registry'}/src/internal'); }
    const raw = require('${'@asha/wasm-replay-bridge'}');
    console.log(load, raw);
  `);
  try {
    assertRejected(root, /package subpath|forbidden raw ASHA package/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects package dependency bypasses outside dependencies', () => {
  const root = makeFixture("import { COMMAND_CATALOG } from '@asha/command-registry';\nconsole.log(COMMAND_CATALOG);\n", undefined, {}, {
    devDependencies: {
      '@asha/native-bridge': 'link:../asha/ts/packages/native-bridge',
    },
  });
  try {
    assertRejected(root, /devDependencies contains ASHA dependency/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects config alias paths into ASHA source roots', () => {
  const root = makeFixture("import { COMMAND_CATALOG } from '@asha/command-registry';\nconsole.log(COMMAND_CATALOG);\n", undefined, {
    'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@asha/command-registry': ['../asha/ts/packages/command-registry/src/index.ts'] } } }, null, 2),
  });
  try {
    assertRejected(root, /forbidden ASHA source path fragment/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('boundary checker rejects arbitrary JSON command hatches', () => {
  const hatch = 'call' + '(methodName, json)';
  const root = makeFixture(`
    export function unsafe(methodName: string, json: object) {
      return ${hatch};
    }
  `);
  try {
    assertRejected(root, /forbidden boundary token/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
