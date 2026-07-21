import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type {
  WorkspaceAuthoringFacade,
  WorkspaceAuthoringStateSummary,
} from '@asha/runtime-session';
import type { NativeBrowserHostRuntimeBridge } from '@asha/browser-host';
import {
  persistStudioCanonicalProjectWrite,
  persistStudioWorkspaceAuthoringArtifactSet,
  persistStudioWorkspaceAuthoringCandidate,
} from '@asha-studio/store';
import {
  discardStudioHostFileStage,
  finalizeStudioHostFileStage,
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

test('canonical project save prepares from observed host truth and settles the Rust revision', async () => {
  let state = authoringState(15);
  const candidate = {
    candidateHash: 'candidate:canonical-project',
    expectedPrior: {
      revision: 3,
      manifestHash: 'manifest:prior',
      contentSetHash: 'content:prior',
      indexHash: null,
    },
    expectedNext: {
      revision: 4,
      manifestHash: 'manifest:next',
      contentSetHash: 'content:next',
      indexHash: null,
    },
    expectedPriorArtifacts: [],
    expectedNextArtifacts: [],
    manifestJson: '{"bundleSchemaVersion":2}\n',
    writes: [],
    moves: [],
    deletes: [],
    indexReplacement: null,
  };
  let prepared = 0;
  let applied = 0;
  const authority = {
    readState: () => state,
    prepareProjectWrite: (input: unknown) => {
      prepared += 1;
      assert.deepEqual(input, {
        observedPrior: candidate.expectedPrior,
        priorManifestJson: '{"bundleSchemaVersion":2}\n',
      });
      return { accepted: true, candidate, diagnostics: [] };
    },
  } as unknown as WorkspaceAuthoringFacade;
  const bridge = {
    browserHostProjectStore: {
      observe: async () => ({
        identity: candidate.expectedPrior,
        manifestJson: '{"bundleSchemaVersion":2}\n',
      }),
      apply: async (input: unknown) => {
        applied += 1;
        assert.deepEqual(input, { projectRoot: '/projects/demo', candidate });
        state = { ...state, storedRevision: state.workingRevision, dirty: false };
        return { candidateHash: candidate.candidateHash, published: candidate.expectedNext };
      },
    },
  } as unknown as NativeBrowserHostRuntimeBridge;

  const result = await persistStudioCanonicalProjectWrite({
    authority,
    currentAuthority: () => authority,
    bridge,
    projectRoot: '/projects/demo',
  });
  assert.deepEqual(result, { candidateHash: candidate.candidateHash, storedRevision: 4 });
  assert.equal(prepared, 1);
  assert.equal(applied, 1);
});

test('authority drift while observing the host rejects before Rust prepares a write', async () => {
  let state = authoringState(21);
  let prepared = 0;
  const authority = {
    readState: () => state,
    prepareProjectWrite: () => {
      prepared += 1;
      throw new Error('must not prepare stale observation');
    },
  } as unknown as WorkspaceAuthoringFacade;
  const bridge = {
    browserHostProjectStore: {
      observe: async () => {
        state = authoringState(22);
        return {
          identity: {
            revision: 0,
            manifestHash: 'manifest',
            contentSetHash: 'content',
            indexHash: null,
          },
          manifestJson: '{}',
        };
      },
    },
  } as unknown as NativeBrowserHostRuntimeBridge;

  await assert.rejects(
    persistStudioCanonicalProjectWrite({
      authority,
      currentAuthority: () => authority,
      bridge,
      projectRoot: '/projects/demo',
    }),
    /state changed while the project write was observed/u,
  );
  assert.equal(prepared, 0);
});

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
    finalize: async () => assert.fail('stale candidates must not be finalized'),
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
    finalize: async () => assert.fail('swapped candidates must not be finalized'),
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
    finalize: async token => {
      const receipt = await finalizeStudioHostFileStage({ token }) as {
        readonly ok: boolean;
        readonly finalized?: boolean;
      };
      assert.equal(receipt.ok, true);
      assert.equal(receipt.finalized, true);
    },
    discard: async token => {
      await discardStudioHostFileStage({ token });
    },
  });
  assert.equal(await readFile(target, 'utf8'), 'stored-after');
  assert.equal(result.sha256, studioHostFileSha256('stored-after'));
  assert.equal(result.storedRevision, 9);
  assert.equal(result.cleanupDiagnostic, null);
  assert.equal(confirmationCount, 1);
  await rm(root, { recursive: true, force: true });
});

test('a first-time save creates a missing host target and confirms the exact candidate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-save-new-target-'));
  const target = join(root, 'new-house.avxl.json');
  let confirmationCount = 0;
  const authority = fakeAuthority(() => authoringState(3), () => { confirmationCount += 1; });
  const result = await persistStudioWorkspaceAuthoringCandidate({
    authority,
    currentAuthority: () => authority,
    hostPath: target,
    canonicalJsonHash: 'sha256:candidate',
    stage: async () => {
      const receipt = await stageStudioHostFile(root, {
        path: target,
        text: 'first-stored-content',
        expectedHash: null,
      }) as {
        readonly ok: boolean;
        readonly token: string;
        readonly path: string;
        readonly sha256: string;
      };
      assert.equal(receipt.ok, true);
      return receipt;
    },
    promote: async token => {
      const receipt = await promoteStudioHostFileStage({ token }) as {
        readonly ok: boolean;
        readonly path: string;
        readonly sha256: string;
      };
      assert.equal(receipt.ok, true);
      return receipt;
    },
    finalize: async token => {
      const receipt = await finalizeStudioHostFileStage({ token }) as {
        readonly ok: boolean;
        readonly finalized?: boolean;
      };
      assert.equal(receipt.ok, true);
      assert.equal(receipt.finalized, true);
    },
    discard: async token => {
      await discardStudioHostFileStage({ token });
    },
  });
  assert.equal(await readFile(target, 'utf8'), 'first-stored-content');
  assert.equal(result.sha256, studioHostFileSha256('first-stored-content'));
  assert.equal(result.storedRevision, 3);
  assert.equal(confirmationCount, 1);
  await rm(root, { recursive: true, force: true });
});

test('a host promotion failure leaves the previous file and Rust dirty for retry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-save-promotion-failure-'));
  const target = join(root, 'house.avxl.json');
  await writeFile(target, 'stored-before');
  const state = authoringState(4);
  let confirmationCount = 0;
  const authority = fakeAuthority(() => state, () => { confirmationCount += 1; });
  await assert.rejects(
    persistStudioWorkspaceAuthoringCandidate({
      authority,
      currentAuthority: () => authority,
      hostPath: target,
      canonicalJsonHash: 'sha256:candidate',
      stage: () => stagedReceipt(root, target, 'candidate-after-failure'),
      promote: async () => {
        throw new Error('disk promotion failed');
      },
      finalize: async () => assert.fail('failed promotions must not be finalized'),
      discard: async token => {
        const receipt = await discardStudioHostFileStage({ token }) as { readonly ok: boolean };
        assert.equal(receipt.ok, true);
      },
    }),
    /disk promotion failed/,
  );
  assert.equal(await readFile(target, 'utf8'), 'stored-before');
  assert.equal(authority.readState().dirty, true);
  assert.equal(authority.readState().storedRevision, 0);
  assert.equal(confirmationCount, 0);
  await rm(root, { recursive: true, force: true });
});

test('a host compare-and-swap mismatch preserves the previous file and Rust candidate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-save-cas-failure-'));
  const target = join(root, 'house.avxl.json');
  await writeFile(target, 'stored-before');
  const state = authoringState(6);
  let confirmationCount = 0;
  const authority = fakeAuthority(() => state, () => { confirmationCount += 1; });
  await assert.rejects(
    persistStudioWorkspaceAuthoringCandidate({
      authority,
      currentAuthority: () => authority,
      hostPath: target,
      canonicalJsonHash: 'sha256:candidate',
      stage: async () => {
        const receipt = await stageStudioHostFile(root, {
          path: target,
          text: 'candidate-after-cas',
          expectedHash: `sha256:${'0'.repeat(64)}`,
        }) as { readonly ok: boolean; readonly message?: string };
        assert.equal(receipt.ok, false);
        throw new Error(receipt.message ?? 'Host compare-and-swap rejected.');
      },
      promote: async () => assert.fail('CAS-rejected stages must not be promoted'),
      finalize: async () => assert.fail('CAS-rejected stages must not be finalized'),
      discard: async () => assert.fail('CAS rejection did not allocate a stage token'),
    }),
    /changed since it was opened/,
  );
  assert.equal(await readFile(target, 'utf8'), 'stored-before');
  assert.equal(authority.readState().dirty, true);
  assert.equal(authority.readState().storedRevision, 0);
  assert.equal(confirmationCount, 0);
  await rm(root, { recursive: true, force: true });
});

test('authority drift during tentative promotion rolls the host target back', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-save-promotion-drift-'));
  const target = join(root, 'house.avxl.json');
  await writeFile(target, 'stored-before');
  let state = authoringState(7);
  let confirmationCount = 0;
  const authority = fakeAuthority(() => state, () => { confirmationCount += 1; });
  await assert.rejects(
    persistStudioWorkspaceAuthoringCandidate({
      authority,
      currentAuthority: () => authority,
      hostPath: target,
      canonicalJsonHash: 'sha256:candidate',
      stage: () => stagedReceipt(root, target, 'candidate-after-drift'),
      promote: async token => {
        const receipt = await promoteStudioHostFileStage({ token }) as {
          readonly ok: boolean;
          readonly path: string;
          readonly sha256: string;
        };
        assert.equal(receipt.ok, true);
        state = authoringState(8);
        return receipt;
      },
      finalize: async () => assert.fail('drifted promotions must not be finalized'),
      discard: async token => {
        const receipt = await discardStudioHostFileStage({ token }) as {
          readonly ok: boolean;
          readonly rolledBack?: boolean;
        };
        assert.equal(receipt.ok, true);
        assert.equal(receipt.rolledBack, true);
      },
    }),
    /state changed while the save was promoted/,
  );
  assert.equal(await readFile(target, 'utf8'), 'stored-before');
  assert.equal(authority.readState().dirty, true);
  assert.equal(confirmationCount, 0);
  await rm(root, { recursive: true, force: true });
});

test('authority drift after first-time promotion removes the new target and permits retry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-save-new-target-drift-'));
  const target = join(root, 'new-house.avxl.json');
  let state = authoringState(7);
  let confirmationCount = 0;
  const authority = fakeAuthority(() => state, () => { confirmationCount += 1; });
  const stageMissingTarget = async (text: string) => {
    const receipt = await stageStudioHostFile(root, {
      path: target,
      text,
      expectedHash: null,
    }) as {
      readonly ok: boolean;
      readonly token: string;
      readonly path: string;
      readonly sha256: string;
    };
    assert.equal(receipt.ok, true);
    return receipt;
  };
  await assert.rejects(
    persistStudioWorkspaceAuthoringCandidate({
      authority,
      currentAuthority: () => authority,
      hostPath: target,
      canonicalJsonHash: 'sha256:candidate',
      stage: () => stageMissingTarget('tentative-new-content'),
      promote: async token => {
        const receipt = await promoteStudioHostFileStage({ token }) as {
          readonly ok: boolean;
          readonly path: string;
          readonly sha256: string;
        };
        assert.equal(receipt.ok, true);
        state = authoringState(8);
        return receipt;
      },
      finalize: async () => assert.fail('drifted promotions must not be finalized'),
      discard: async token => {
        const receipt = await discardStudioHostFileStage({ token }) as {
          readonly ok: boolean;
          readonly rolledBack?: boolean;
        };
        assert.equal(receipt.ok, true);
        assert.equal(receipt.rolledBack, true);
      },
    }),
    /state changed while the save was promoted/,
  );
  await assert.rejects(readFile(target, 'utf8'), { code: 'ENOENT' });
  assert.equal(authority.readState().dirty, true);
  assert.equal(confirmationCount, 0);

  const retry = await persistStudioWorkspaceAuthoringCandidate({
    authority,
    currentAuthority: () => authority,
    hostPath: target,
    canonicalJsonHash: 'sha256:candidate',
    stage: () => stageMissingTarget('retried-new-content'),
    promote: async token => promoteStudioHostFileStage({ token }) as Promise<{
      readonly path: string;
      readonly sha256: string;
    }>,
    finalize: async token => {
      const receipt = await finalizeStudioHostFileStage({ token }) as { readonly ok: boolean };
      assert.equal(receipt.ok, true);
    },
    discard: async token => {
      await discardStudioHostFileStage({ token });
    },
  });
  assert.equal(await readFile(target, 'utf8'), 'retried-new-content');
  assert.equal(retry.storedRevision, 8);
  assert.equal(confirmationCount, 1);
  await rm(root, { recursive: true, force: true });
});

test('Rust confirmation rejection after promotion rolls the host target back', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-save-confirmation-rejection-'));
  const target = join(root, 'house.avxl.json');
  await writeFile(target, 'stored-before');
  const state = authoringState(10);
  let confirmationCount = 0;
  const authority = {
    readState: () => state,
    confirmStored: () => {
      confirmationCount += 1;
      throw new Error('Rust rejected the pending save candidate.');
    },
  } as unknown as WorkspaceAuthoringFacade;
  await assert.rejects(
    persistStudioWorkspaceAuthoringCandidate({
      authority,
      currentAuthority: () => authority,
      hostPath: target,
      canonicalJsonHash: 'sha256:candidate',
      stage: () => stagedReceipt(root, target, 'candidate-before-confirmation-rejection'),
      promote: async token => {
        const receipt = await promoteStudioHostFileStage({ token }) as {
          readonly ok: boolean;
          readonly path: string;
          readonly sha256: string;
        };
        assert.equal(receipt.ok, true);
        return receipt;
      },
      finalize: async () => assert.fail('rejected confirmations must not be finalized'),
      discard: async token => {
        const receipt = await discardStudioHostFileStage({ token }) as {
          readonly ok: boolean;
          readonly rolledBack?: boolean;
        };
        assert.equal(receipt.ok, true);
        assert.equal(receipt.rolledBack, true);
      },
    }),
    /Rust rejected the pending save candidate/,
  );
  assert.equal(await readFile(target, 'utf8'), 'stored-before');
  assert.equal(authority.readState().dirty, true);
  assert.equal(authority.readState().storedRevision, 0);
  assert.equal(confirmationCount, 1);
  await rm(root, { recursive: true, force: true });
});

test('a Rust-issued scene and voxel artifact set confirms only after both files are promoted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-artifact-set-'));
  const scenePath = join(root, 'scene.json');
  const assetPath = join(root, 'asset.avxl.json');
  await writeFile(scenePath, 'stored-before');
  let confirmationCount = 0;
  const authority = fakeAuthority(() => authoringState(12), () => { confirmationCount += 1; });
  const artifact = (
    path: string,
    text: string,
    expectedHash: string | null,
  ) => ({
    hostPath: path,
    stage: async () => {
      const receipt = await stageStudioHostFile(root, { path, text, expectedHash }) as {
        readonly ok: boolean;
        readonly token: string;
        readonly path: string;
        readonly sha256: string;
      };
      assert.equal(receipt.ok, true);
      return receipt;
    },
    promote: async (token: string) => promoteStudioHostFileStage({ token }) as Promise<{
      readonly path: string;
      readonly sha256: string;
    }>,
    finalize: async (token: string) => { await finalizeStudioHostFileStage({ token }); },
    discard: async (token: string) => { await discardStudioHostFileStage({ token }); },
  });
  const result = await persistStudioWorkspaceAuthoringArtifactSet({
    authority,
    currentAuthority: () => authority,
    confirmationHostPath: root,
    canonicalJsonHash: 'sha256:artifact-set',
    artifacts: [
      artifact(scenePath, 'scene-after', studioHostFileSha256('stored-before')),
      artifact(assetPath, 'asset-after', null),
    ],
  });
  assert.equal(await readFile(scenePath, 'utf8'), 'scene-after');
  assert.equal(await readFile(assetPath, 'utf8'), 'asset-after');
  assert.equal(result.artifacts.length, 2);
  assert.equal(result.storedRevision, 12);
  assert.equal(confirmationCount, 1);
  await rm(root, { recursive: true, force: true });
});

test('a partial artifact-set promotion is rolled back before Rust confirmation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asha-studio-artifact-set-rollback-'));
  const scenePath = join(root, 'scene.json');
  const assetPath = join(root, 'asset.avxl.json');
  await writeFile(scenePath, 'scene-before');
  let confirmationCount = 0;
  const authority = fakeAuthority(() => authoringState(13), () => { confirmationCount += 1; });
  const sceneStage = await stageStudioHostFile(root, {
    path: scenePath,
    text: 'scene-after',
    expectedHash: studioHostFileSha256('scene-before'),
  }) as { readonly token: string; readonly path: string; readonly sha256: string };
  const assetStage = await stageStudioHostFile(root, {
    path: assetPath,
    text: 'asset-after',
    expectedHash: null,
  }) as { readonly token: string; readonly path: string; readonly sha256: string };
  await assert.rejects(
    persistStudioWorkspaceAuthoringArtifactSet({
      authority,
      currentAuthority: () => authority,
      confirmationHostPath: root,
      canonicalJsonHash: 'sha256:artifact-set',
      artifacts: [{
        hostPath: scenePath,
        stage: async () => sceneStage,
        promote: async token => promoteStudioHostFileStage({ token }) as Promise<{
          readonly path: string;
          readonly sha256: string;
        }>,
        finalize: async () => assert.fail('failed sets must not finalize'),
        discard: async token => { await discardStudioHostFileStage({ token }); },
      }, {
        hostPath: assetPath,
        stage: async () => assetStage,
        promote: async () => { throw new Error('asset promotion failed'); },
        finalize: async () => assert.fail('failed sets must not finalize'),
        discard: async token => { await discardStudioHostFileStage({ token }); },
      }],
    }),
    /asset promotion failed/,
  );
  assert.equal(await readFile(scenePath, 'utf8'), 'scene-before');
  await assert.rejects(readFile(assetPath, 'utf8'), { code: 'ENOENT' });
  assert.equal(confirmationCount, 0);
  await rm(root, { recursive: true, force: true });
});
