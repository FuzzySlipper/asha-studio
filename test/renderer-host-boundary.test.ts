import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function source(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

test('Studio depends only on the public renderer host and keeps backend packages forbidden', () => {
  const packageJson = JSON.parse(source('package.json')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const boundary = JSON.parse(source('boundary-policy.json')) as {
    forbiddenPackages: string[];
    forbiddenImportSpecifiers: string[];
    forbiddenImportPatterns: string[];
  };
  const concreteRenderer = ['th', 'ree'].join('');
  const backendPackage = ['@asha/renderer', concreteRenderer].join('-');

  assert.equal(
    packageJson.dependencies['@asha/renderer-host'],
    'link:../asha-engine/ts/packages/renderer-host',
  );
  assert.equal(packageJson.dependencies[concreteRenderer], undefined);
  assert.equal(packageJson.devDependencies[`@types/${concreteRenderer}`], undefined);
  assert.ok(boundary.forbiddenPackages.includes(backendPackage));
  assert.ok(boundary.forbiddenImportSpecifiers.includes(concreteRenderer));
  assert.ok(boundary.forbiddenImportPatterns.includes('@asha/renderer-host/*'));
});

test('Studio viewport is a renderer-neutral policy adapter over isolated public host channels', () => {
  const viewport = source('libs/studio-viewport/src/index.ts');

  assert.match(viewport, /from '@asha\/renderer-host'/);
  assert.match(viewport, /mountAshaRendererEditorViewport/);
  assert.match(viewport, /resolveAshaStoredEditorCamera/);
  assert.match(viewport, /channels\.runtime\.replace/);
  assert.match(viewport, /channels\.authored\.replace/);
  assert.match(viewport, /channels\.overlay\.replace/);
  assert.match(viewport, /source: 'runtime_authority'/);
  assert.match(viewport, /return resolution\.camera/);
  assert.match(viewport, /viewport\.pick/);
  assert.match(viewport, /probeMissingPreviewResource/);
  assert.equal(viewport.includes('function normalize('), false);
  assert.equal(viewport.includes('function cross('), false);
  assert.equal(viewport.includes('Math.atan2'), false);
  assert.equal(viewport.includes('Math.asin'), false);
  assert.equal(viewport.includes('objects[0]'), false);
  assert.equal(viewport.includes('find(entry => entry.hasRenderableAsset)'), false);

  const forbiddenFragments = [
    ['TH', 'REE.'].join(''),
    ['Web', 'GLRenderer'].join(''),
    ['Ray', 'caster'].join(''),
    ['renderer', ['th', 'ree'].join('')].join('-'),
  ];
  for (const fragment of forbiddenFragments) {
    assert.equal(viewport.includes(fragment), false, `viewport retained backend fragment ${fragment}`);
  }
});

test('one-cell runtime viewport evidence covers authority reads commands buffers and teardown', () => {
  const store = source('libs/studio-store/src/index.ts');
  const proof = source('scripts/proof-native-voxel-runtime-launch.ts');

  for (const operation of [
    'readSceneObjectSnapshot',
    'applySceneObjectCommand',
    'readModelMaterialPreview',
    'readVoxelMeshEvidence',
    'selectVoxel',
    'pickVoxel',
    'getBuffer',
    'releaseBuffer',
    'readCameraProjection',
    'applyFirstPersonCameraInput',
    'unloadProjectBundle',
  ]) {
    assert.match(store, new RegExp(operation));
  }
  assert.match(proof, /degradedResourceStatus/);
  assert.match(proof, /staleSceneCommandRejected/);
  assert.match(proof, /cameraTickAfterInput/);
  assert.match(proof, /browserSessionTeardown/);
  assert.match(proof, /enable-unsafe-swiftshader/);
});

test('current Studio docs assign concrete rendering exclusively to the engine', () => {
  const readme = source('README.md');
  const limitations = source('docs/studio-limitations.md');

  assert.match(readme, /engine owns concrete\s+rendering/);
  assert.match(readme, /Direct renderer dependencies and renderer backend subpaths\s+are forbidden/);
  assert.match(limitations, /Concrete rendering is engine-owned/);
  assert.match(limitations, /Picks are disposable projection hints/);
});
