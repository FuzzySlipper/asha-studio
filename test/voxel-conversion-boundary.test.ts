import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  STUDIO_VOXEL_CONVERSION_OPERATION_BOUNDARIES,
  buildStudioVoxelConversionBoundaryReadout,
} from '@asha-studio/voxel-conversion';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const boundaryScript = join(repoRoot, 'scripts/check-boundaries.mjs');
const publicSurfaceManifest = JSON.parse(
  readFileSync(join(repoRoot, '../asha/harness/public-surface/ts-packages.json'), 'utf8'),
);
const ashaSourceRoot = ['', 'home', 'dev', 'asha'].join('/');
const ashaEngineRoot = [ashaSourceRoot, 'engine-rs'].join('/');
const engineCrateFragment = ['engine-rs', 'crates'].join('/');
const generatedSourceFragment = ['src', 'generated'].join('/');
const voxelforgeRoot = ['', 'home', 'dev', 'voxelforge'].join('/');

function runBoundaryCheck(workspaceRoot: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [boundaryScript], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });
}

function writeProbeWorkspace(importSpecifier: string): string {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'asha-studio-boundary-'));
  mkdirSync(join(workspaceRoot, 'libs/probe/src'), { recursive: true });
  mkdirSync(join(workspaceRoot, 'harness/public-surface'), { recursive: true });
  writeFileSync(
    join(workspaceRoot, 'package.json'),
    JSON.stringify({
      type: 'module',
      dependencies: {
        '@asha/contracts': 'link:../asha/ts/packages/contracts',
        '@asha/runtime-bridge': 'link:../asha/ts/packages/runtime-bridge',
        '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
      },
    }),
  );
  writeFileSync(
    join(workspaceRoot, 'boundary-policy.json'),
    JSON.stringify({
      consumerRole: 'asha-studio',
      publicSurfaceManifest: 'harness/public-surface/ts-packages.json',
      allowedLocalPackageLinks: {
        '@asha/contracts': 'link:../asha/ts/packages/contracts',
        '@asha/runtime-bridge': 'link:../asha/ts/packages/runtime-bridge',
        '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
      },
      requiredLocalPackageLinks: {
        '@asha/contracts': 'link:../asha/ts/packages/contracts',
        '@asha/runtime-bridge': 'link:../asha/ts/packages/runtime-bridge',
        '@asha/command-registry': 'link:../asha/ts/packages/command-registry',
      },
      forbiddenPackages: [
        ['@asha', 'native-bridge'].join('/'),
        ['@asha', 'wasm-replay-bridge'].join('/'),
      ],
      forbiddenImportSpecifiers: [
        ['@asha', 'native-bridge'].join('/'),
        ['@asha', 'wasm-replay-bridge'].join('/'),
        'voxelforge',
      ],
      forbiddenImportPatterns: [
        ['@asha', '*', 'src', '*'].join('/'),
        ['@asha', '*', 'dist', 'generated', '*'].join('/'),
        ['..', 'asha', 'engine-rs', '*'].join('/'),
        [ashaEngineRoot, '*'].join('/'),
        ['..', 'voxelforge', '*'].join('/'),
        [voxelforgeRoot, '*'].join('/'),
        ['voxelforge', '*'].join('/'),
        ['@voxelforge', '*'].join('/'),
      ],
      forbiddenText: [
        ashaEngineRoot,
        engineCrateFragment,
        generatedSourceFragment,
      ],
    }),
  );
  writeFileSync(
    join(workspaceRoot, 'harness/public-surface/ts-packages.json'),
    JSON.stringify(publicSurfaceManifest),
  );
  writeFileSync(
    join(workspaceRoot, 'libs/probe/src/index.ts'),
    `import { probe } from '${importSpecifier}';\nexport const value = probe;\n`,
  );
  return workspaceRoot;
}

test('voxel conversion scaffold resolves upstream command metadata through approved roots', () => {
  const readout = buildStudioVoxelConversionBoundaryReadout();

  assert.equal(readout.status, 'ready');
  assert.deepEqual(
    STUDIO_VOXEL_CONVERSION_OPERATION_BOUNDARIES.map(operation => operation.commandId),
    [
      'voxel_conversion.plan',
      'voxel_conversion.preview',
      'voxel_conversion.apply',
      'voxel_conversion.export_evidence',
    ],
  );
  assert.deepEqual(readout.diagnostics, []);
  assert.ok(readout.nonClaims.includes('not_conversion_authority'));
  assert.ok(readout.nonClaims.includes('not_raw_runtime_transport'));
});

test('voxel conversion scaffold fails closed when runtime facade operations are absent', () => {
  const readout = buildStudioVoxelConversionBoundaryReadout({});

  assert.equal(readout.status, 'failed_closed');
  assert.deepEqual(
    readout.diagnostics.map(diagnostic => diagnostic.code),
    [
      'runtime_facade_unavailable',
      'runtime_facade_unavailable',
      'runtime_facade_unavailable',
      'runtime_facade_unavailable',
    ],
  );
});

test('studio boundary check rejects forbidden voxel conversion import shapes', () => {
  const forbiddenSpecifiers = [
    ['@asha', 'native-bridge'].join('/'),
    ['@asha', 'contracts', 'src', 'generated', 'voxelConversion'].join('/'),
    ['..', 'asha', 'engine-rs', 'crates', 'protocol'].join('/'),
    ['..', 'voxelforge', 'src', 'VoxelForge'].join('/'),
    ['@voxelforge', 'conversion'].join('/'),
  ];

  for (const specifier of forbiddenSpecifiers) {
    const workspaceRoot = writeProbeWorkspace(specifier);
    try {
      const result = runBoundaryCheck(workspaceRoot);
      assert.notEqual(result.status, 0, `expected ${specifier} to fail boundary check`);
      assert.match(result.stderr, /Boundary check failed:/);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  }
});
