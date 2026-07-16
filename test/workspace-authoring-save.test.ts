import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type {
  WorkspaceAuthoringFacade,
  WorkspaceAuthoringStateSummary,
} from '@asha/runtime-session';
import { persistStudioWorkspaceAuthoringCandidate } from '@asha-studio/store';
import {
  discardStudioHostFileStage,
  promoteStudioHostFileStage,
  readStudioHostFile,
  stageStudioHostFile,
  studioHostFileSha256,
} from '../scripts/studio-project-file-service';

function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolvePromise = (): void => undefined;
  const promise = new Promise<void>(resolve => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

function authoringState(workingRevision: number): WorkspaceAuthoringStateSummary {
  return {
    kind: 'workspace_authoring_state.v0',
    status: 'open',
    identity: {
      kind: 'workspace_authoring_identity.v0',
      authoringId: 'test-authoring',
      mode: 'workspace_authoring',
      generation: 7,
      seed: 42,
      project: { gameId: 'test-game', workspaceId: 'test-workspace' },
      projectBundle: { bundleSchemaVersion: 1, protocolVersion: 1, sceneId: 42 },
      nonClaims: [],
    },
    composition: { loadedProjectBundle: 1, fatalCount: 0, totalCount: 0, blocksLoad: false },
    workingRevision,
    storedRevision: 0,
    dirty: true,
    lastStoredCanonicalJsonHash: null,
    authoritySnapshotHash: `authority:${workingRevision}`,
    lifecycleHash: `lifecycle:${workingRevision}`,
  };
}

function fakeAuthority(
  readState: () => WorkspaceAuthoringStateSummary,
  onConfirm: () => void,
): WorkspaceAuthoringFacade {
  return {
    readState,
    confirmStored: () => {
      onConfirm();
      return {
        kind: 'workspace_authoring_stored_confirmation.v0',
        accepted: true,
        workspaceId: 'test-workspace',
        generation: 7,
        hostPath: '/test/asset.avxl.json',
        canonicalJsonHash: 'sha256:candidate',
        storedRevision: readState().workingRevision,
        lifecycleHash: readState().lifecycleHash,
      };
    },
  } as unknown as WorkspaceAuthoringFacade;
}

async function stagedReceipt(root: string, path: string, text: string) {
  const receipt = await stageStudioHostFile(root, {
    path,
    text,
    expectedHash: studioHostFileSha256('stored-before'),
  }) as {
    readonly ok: boolean;
    readonly token: string;
    readonly path: string;
    readonly sha256: string;
  };
  assert.equal(receipt.ok, true);
  return receipt;
}

test('an edit during a delayed stage rejects before confirmation and preserves the durable target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-save-edit-'));
  const target = join(root, 'house.avxl.json');
  await writeFile(target, 'stored-before');
  let state = authoringState(4);
  let confirmationCount = 0;
  const authority = fakeAuthority(() => state, () => { confirmationCount += 1; });
  const stageReady = deferred();
  const releaseStage = deferred();
  const save = persistStudioWorkspaceAuthoringCandidate({
    authority,
    currentAuthority: () => authority,
    hostPath: target,
    canonicalJsonHash: 'sha256:candidate',
    stage: async () => {
      const staged = await stagedReceipt(root, target, 'candidate-after-edit');
      stageReady.resolve();
      await releaseStage.promise;
      return staged;
    },
    promote: async token => promoteStudioHostFileStage({ token }) as Promise<never>,
    discard: async token => {
      await discardStudioHostFileStage({ token });
    },
  });
  await stageReady.promise;
  state = authoringState(5);
  releaseStage.resolve();
  await assert.rejects(save, /state changed while the save was staged/);
  const readback = await readStudioHostFile(root, target) as { readonly text: string; readonly sha256: string };
  assert.equal(readback.text, 'stored-before');
  assert.equal(readback.sha256, studioHostFileSha256('stored-before'));
  assert.equal(confirmationCount, 0);
  await rm(root, { recursive: true, force: true });
});

test('a workspace swap during a delayed stage discards the candidate without replacing the target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-save-swap-'));
  const target = join(root, 'house.avxl.json');
  await writeFile(target, 'stored-before');
  let current: WorkspaceAuthoringFacade | null;
  let confirmationCount = 0;
  const authority = fakeAuthority(() => authoringState(8), () => { confirmationCount += 1; });
  current = authority;
  const stageReady = deferred();
  const releaseStage = deferred();
  const save = persistStudioWorkspaceAuthoringCandidate({
    authority,
    currentAuthority: () => current,
    hostPath: target,
    canonicalJsonHash: 'sha256:candidate',
    stage: async () => {
      const staged = await stagedReceipt(root, target, 'candidate-after-swap');
      stageReady.resolve();
      await releaseStage.promise;
      return staged;
    },
    promote: async token => promoteStudioHostFileStage({ token }) as Promise<never>,
    discard: async token => {
      await discardStudioHostFileStage({ token });
    },
  });
  await stageReady.promise;
  current = fakeAuthority(() => authoringState(1), () => undefined);
  releaseStage.resolve();
  await assert.rejects(save, /authority changed while the save was staged/);
  assert.equal(await readFile(target, 'utf8'), 'stored-before');
  assert.equal(confirmationCount, 0);
  await rm(root, { recursive: true, force: true });
});

test('a confirmed candidate is promoted with a compare-and-swap rename', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-save-promote-'));
  const target = join(root, 'house.avxl.json');
  await writeFile(target, 'stored-before');
  let confirmationCount = 0;
  const authority = fakeAuthority(() => authoringState(9), () => { confirmationCount += 1; });
  const result = await persistStudioWorkspaceAuthoringCandidate({
    authority,
    currentAuthority: () => authority,
    hostPath: target,
    canonicalJsonHash: 'sha256:candidate',
    stage: () => stagedReceipt(root, target, 'stored-after'),
    promote: async token => {
      const receipt = await promoteStudioHostFileStage({ token }) as {
        readonly ok: boolean;
        readonly path: string;
        readonly sha256: string;
      };
      assert.equal(receipt.ok, true);
      return receipt;
    },
    discard: async token => {
      await discardStudioHostFileStage({ token });
    },
  });
  assert.equal(await readFile(target, 'utf8'), 'stored-after');
  assert.equal(result.sha256, studioHostFileSha256('stored-after'));
  assert.equal(result.storedRevision, 9);
  assert.equal(confirmationCount, 1);
  await rm(root, { recursive: true, force: true });
});
