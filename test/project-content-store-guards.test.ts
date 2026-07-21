import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import { createEnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import {
  buildInitialWorkspaceReadModel,
  loadStudioGameWorkspaceManifest,
} from '@asha-studio/domain';
import {
  StudioPreferencesStore,
  StudioWorkspaceStore,
  inspectStudioProjectContentFile,
  type StudioProjectContentLoadedFile,
  type StudioSceneFileConflictReadModel,
} from '@asha-studio/store';
import type { ProjectContentCodecResult, ProjectContentDocument } from '@asha/contracts';
import type { NativeBrowserHostRuntimeBridge } from '@asha/browser-host';
import type { WorkspaceAuthoringFacade } from '@asha/runtime-session';

const READ_ONLY_CATALOG_MANIFEST = `[asha]
engine_version = "0.1.0"
contracts_version = "0.1.0"
runtime_bridge_version = "0.1.0"
devtools_protocol_version = "devtools-protocol.v0"
publish_artifact_format_version = "publish-artifact.v0"
engine_source = "../asha-engine"

[workspace]
scene_roots = ["scenes"]
prefab_roots = ["prefabs"]
asset_roots = ["assets"]
replay_roots = ["replays"]
catalog_packages = ["catalogs"]
policy_packages = []

[runtime]
dev_command = "npm run dev"
devtools_endpoint = "ws://127.0.0.1:7391"
wasm_or_native_entry = "dist/runtime/index.js"
backend_mode = "reference"
backend_profile = "reference"
backend_proof_refs = []

[studio]
workspace_mode = true
attach_enabled = false
allowed_source_writes = ["scenes", "prefabs", "assets"]

[publish]
command = "npm run build"
artifact_dir = "dist"
verify_command = "npm run verify"

[dev_resource_profile]
local_roots = ["assets", "catalogs"]
cache_dir = "dist/dev-cache"
resolution_policy = "prefer-source"

[publish_resource_profile]
output_dir = "dist/resources"
archive_dir = "dist/archive"
resolution_policy = "locked"
`;

interface MutableSignalForTest<T> {
  (): T;
  set(value: T): void;
}

interface ProjectContentStoreInternals {
  readonly gameWorkspaceState: MutableSignalForTest<ReturnType<typeof loadStudioGameWorkspaceManifest>>;
  readonly projectContentFilesState: MutableSignalForTest<readonly StudioProjectContentLoadedFile[]>;
  readonly projectContentCodecState: MutableSignalForTest<ProjectContentCodecResult | null>;
  readonly selectedProjectContentEntryIdState: MutableSignalForTest<string | null>;
  readonly dirtyProjectContentDocumentIdsState: MutableSignalForTest<readonly string[]>;
  readonly staleProjectContentSourcePathState: MutableSignalForTest<string | null>;
  readonly sceneFileConflictState: MutableSignalForTest<StudioSceneFileConflictReadModel | null>;
  readonly workspaceAuthoringFacadeState: MutableSignalForTest<WorkspaceAuthoringFacade | null>;
  readonly workspaceAuthoringBridgeState: MutableSignalForTest<NativeBrowserHostRuntimeBridge | null>;
}

function readOnlyWorkspace() {
  return loadStudioGameWorkspaceManifest({
    workspaceRoot: '/projects/demo',
    manifestPath: 'asha.game.toml',
    gameId: 'demo',
    manifestText: READ_ONLY_CATALOG_MANIFEST,
    packageScripts: {
      dev: 'npm run dev',
      build: 'npm run build',
      verify: 'npm run verify',
    },
    pathExists: () => true,
  });
}

function gameplayDocument(): ProjectContentDocument {
  return {
    kind: 'gameplayConfiguration',
    documentId: 'gameplay-configuration:catalogs/catalog.json',
    document: {
      schemaVersion: 1,
      configurations: [],
      bindings: [],
      overrides: [],
      triggers: [],
    },
  };
}

function gameplayCodec(document: ProjectContentDocument): ProjectContentCodecResult {
  return {
    accepted: true,
    documents: [document],
    canonicalFiles: [{
      documentId: document.documentId,
      kind: document.kind,
      canonicalJson: '{}',
      contentHash: 'sha256:canonical',
    }],
    setHash: 'sha256:set',
    providerSchemas: [],
    fieldMetadata: [],
    diagnostics: [],
  };
}

function projectContentFile(): StudioProjectContentLoadedFile {
  return inspectStudioProjectContentFile(
    {
      path: '/projects/demo/catalogs/catalog.json',
      relativePath: 'catalogs/catalog.json',
      rootKind: 'catalog',
      size: 100,
      mtimeMs: 1,
    },
    JSON.stringify({ configurations: [], bindings: [], overrides: [], triggers: [] }),
    'sha256:source',
  );
}

function withStore(run: (store: StudioWorkspaceStore, internals: ProjectContentStoreInternals) => Promise<void> | void): Promise<void> {
  const injector = createEnvironmentInjector([StudioPreferencesStore, StudioWorkspaceStore]);
  return Promise.resolve(run(
    runInInjectionContext(injector, () => inject(StudioWorkspaceStore)),
    runInInjectionContext(injector, () => inject(StudioWorkspaceStore)) as unknown as ProjectContentStoreInternals,
  )).finally(() => injector.destroy());
}

test('scene and project navigation preserve accepted project-content edits until an explicit choice', async () => {
  await withStore(async (store, internals) => {
    internals.dirtyProjectContentDocumentIdsState.set(['gameplay-configuration:catalogs/catalog.json']);

    await store.openProjectContentScene('/projects/demo/scenes/next.scene.json');
    assert.equal(store.unsavedScenePrompt()?.action, 'open');
    assert.match(store.unsavedScenePrompt()?.message ?? '', /Rust-accepted project-content edits/);
    assert.deepEqual(internals.dirtyProjectContentDocumentIdsState(), [
      'gameplay-configuration:catalogs/catalog.json',
    ]);

    store.cancelDiscardUnsavedScene();
    await store.openProjectPath('/projects/other');
    assert.equal(store.unsavedScenePrompt()?.action, 'open-project');
    assert.deepEqual(internals.dirtyProjectContentDocumentIdsState(), [
      'gameplay-configuration:catalogs/catalog.json',
    ]);
  });
});

test('scene-conflict reload cannot consume unrelated project-content reconciliation state', async () => {
  await withStore((store, internals) => {
    const documentId = 'gameplay-configuration:catalogs/catalog.json';
    const stalePath = '/projects/demo/catalogs/catalog.json';
    const conflict = {
      path: '/projects/demo/scenes/current.scene.json',
      expectedHash: 'sha256:expected-scene',
      actualHash: 'sha256:changed-scene',
      canonicalJson: '{}',
      document: buildInitialWorkspaceReadModel().flatSceneDocument,
    };
    internals.dirtyProjectContentDocumentIdsState.set([documentId]);
    internals.staleProjectContentSourcePathState.set(stalePath);
    internals.sceneFileConflictState.set(conflict);

    store.reloadSceneFileAfterConflict();

    assert.equal(store.unsavedScenePrompt()?.action, 'open');
    assert.equal(store.unsavedScenePrompt()?.path, conflict.path);
    assert.match(store.unsavedScenePrompt()?.message ?? '', /Rust-accepted project-content edits/);
    assert.match(store.unsavedScenePrompt()?.message ?? '', /unreconciled external changes/);
    assert.equal(store.unsavedScenePrompt()?.confirmLabel, 'Reload project content and scene');
    assert.deepEqual(internals.dirtyProjectContentDocumentIdsState(), [documentId]);
    assert.equal(internals.staleProjectContentSourcePathState(), stalePath);
    assert.deepEqual(internals.sceneFileConflictState(), conflict);

    store.cancelDiscardUnsavedScene();
    assert.deepEqual(internals.sceneFileConflictState(), conflict);
    assert.deepEqual(internals.dirtyProjectContentDocumentIdsState(), [documentId]);
    assert.equal(internals.staleProjectContentSourcePathState(), stalePath);
  });
});

test('a stale project-content source stays sticky and blocks subsequent field edits', async () => {
  await withStore((store, internals) => {
    internals.dirtyProjectContentDocumentIdsState.set(['gameplay-configuration:catalogs/catalog.json']);
    internals.staleProjectContentSourcePathState.set('/projects/demo/catalogs/catalog.json');

    store.applyProjectConfigurationField(
      'gameplay-configuration:catalogs/catalog.json',
      'configuration.demo',
      'speed',
      7,
    );

    assert.equal(
      internals.staleProjectContentSourcePathState(),
      '/projects/demo/catalogs/catalog.json',
    );
    assert.deepEqual(internals.dirtyProjectContentDocumentIdsState(), [
      'gameplay-configuration:catalogs/catalog.json',
    ]);
    assert.match(store.projectContentBrowser().message, /Reload from Disk/);
    assert.equal(store.projectContentBrowser().canSaveSelected, false);
  });
});

test('project-content save rejects a read-only manifest root before host publication', async () => {
  await withStore(async (store, internals) => {
    const workspace = readOnlyWorkspace();
    assert.equal(workspace.ok, true);
    internals.gameWorkspaceState.set(workspace);
    const file = projectContentFile();
    const document = gameplayDocument();
    internals.projectContentFilesState.set([file]);
    internals.projectContentCodecState.set(gameplayCodec(document));
    internals.selectedProjectContentEntryIdState.set(`document:${document.documentId}`);
    internals.dirtyProjectContentDocumentIdsState.set([document.documentId]);
    internals.workspaceAuthoringFacadeState.set({} as WorkspaceAuthoringFacade);
    let hostCalls = 0;
    internals.workspaceAuthoringBridgeState.set({
      browserHostProjectStore: {
        observe: async () => {
          hostCalls += 1;
          throw new Error('host observation must not be reached');
        },
        apply: async () => {
          hostCalls += 1;
          throw new Error('host publication must not be reached');
        },
      },
    } as NativeBrowserHostRuntimeBridge);

    await store.saveSelectedProjectContent();

    assert.equal(hostCalls, 0);
    assert.equal(store.projectContentBrowser().canSaveSelected, false);
    assert.match(store.projectContentBrowser().message, /outside allowed roots/);
  });
});
