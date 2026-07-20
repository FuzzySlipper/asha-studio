import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  ASHA_STUDIO_NATIVE_PROVIDER_PATH,
  resolveStudioNativeProviderPath,
} from '../scripts/studio-native-provider';

test('Studio native provider selection defaults to the generic Engine composition', async () => {
  assert.equal(await resolveStudioNativeProviderPath(undefined, '/studio'), null);
});

test('Studio native provider selection resolves only an existing host-controlled addon', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-native-provider-'));
  try {
    const providerPath = join(root, 'project-provider.node');
    await writeFile(providerPath, 'test fixture');
    assert.equal(
      await resolveStudioNativeProviderPath('project-provider.node', root),
      providerPath,
    );
    await assert.rejects(
      () => resolveStudioNativeProviderPath('project-provider.js', root),
      new RegExp(`${ASHA_STUDIO_NATIVE_PROVIDER_PATH} must select a native \\.node provider`),
    );
    await assert.rejects(
      () => resolveStudioNativeProviderPath('missing.node', root),
      new RegExp(`${ASHA_STUDIO_NATIVE_PROVIDER_PATH} does not select an existing file`),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
