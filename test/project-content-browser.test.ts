import assert from 'node:assert/strict';
import test from 'node:test';
import {
  prefabId,
  prefabPartId,
  type ProjectContentCodecResult,
  type ProjectContentDocument,
} from '@asha/contracts';
import { parseAshaGameManifestToml, type AshaGameManifest } from '@asha/game-workspace';
import { buildInitialWorkspaceReadModel } from '@asha-studio/domain';
import {
  buildStudioProjectContentBrowserReadModel,
  findStudioProjectContentEntryByReference,
  formatProjectContentPrefabPartReference,
  inspectStudioProjectContentFile,
  selectStudioProjectContentSceneSources,
  updateProjectConfigurationField,
  type StudioProjectContentFileDescriptor,
} from '@asha-studio/store';

const MANIFEST_TEXT = `[asha]
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
policy_packages = ["policies"]

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
allowed_source_writes = ["scenes", "prefabs", "assets", "catalogs"]

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

function manifest(allowedSourceWrites = '["scenes", "prefabs", "assets", "catalogs"]'): AshaGameManifest {
  const parsed = parseAshaGameManifestToml(
    MANIFEST_TEXT.replace(
      'allowed_source_writes = ["scenes", "prefabs", "assets", "catalogs"]',
      `allowed_source_writes = ${allowedSourceWrites}`,
    ),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error('test manifest must parse');
  return parsed.manifest;
}

const DESCRIPTOR: StudioProjectContentFileDescriptor = {
  path: '/projects/demo/catalogs/gameplay.json',
  relativePath: 'catalogs/gameplay.json',
  rootKind: 'catalog',
  size: 100,
  mtimeMs: 17,
};

function gameplayCodec(): ProjectContentCodecResult {
  const document: ProjectContentDocument = {
    kind: 'gameplayConfiguration',
    documentId: 'gameplay-configuration:catalogs/gameplay.json',
    document: {
      schemaVersion: 1,
      configurations: [{
        configurationId: 'demo.movement',
        module: {
          moduleId: 'demo.movement-module',
          namespace: 'demo',
          version: '1',
          sdkHash: 'sdk',
          contractHash: 'contract',
          artifactHash: 'artifact',
          providerId: 'demo.provider',
        },
        schemaId: 'demo.movement.v1',
        values: [
          { fieldId: 'speed', value: { kind: 'number', value: 4.5 } },
          {
            fieldId: 'actor',
            value: {
              kind: 'reference',
              referenceKind: 'entityDefinition',
              targetId: 'actor/player',
            },
          },
        ],
      }],
      bindings: [],
      overrides: [],
      triggers: [],
    },
  };
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
    providerSchemas: [{
      schemaId: 'demo.movement.v1',
      moduleId: 'demo.movement-module',
      providerId: 'demo.provider',
      contract: { namespace: 'demo', name: 'movement', version: 1, schemaHash: 'schema' },
      codecId: 'demo.movement.codec.v1',
      fields: [
        {
          fieldId: 'speed',
          label: 'Movement speed',
          valueKind: 'number',
          required: true,
          referenceKind: null,
          integerMin: null,
          integerMax: null,
          numberMin: 0,
          numberMax: 20,
        },
        {
          fieldId: 'actor',
          label: 'Actor definition',
          valueKind: 'reference',
          required: true,
          referenceKind: 'entityDefinition',
          integerMin: null,
          integerMax: null,
          numberMin: null,
          numberMax: null,
        },
      ],
    }],
    fieldMetadata: [],
    diagnostics: [],
  };
}

test('manifest-discovered files are classified without encoding a Demo directory layout', () => {
  const actor = inspectStudioProjectContentFile(
    { ...DESCRIPTOR, path: '/projects/demo/content/player.json', relativePath: 'content/player.json' },
    JSON.stringify({ stableId: 'actor/player', displayName: 'Player', capabilities: [] }),
    'sha256:actor',
  );
  const prefab = inspectStudioProjectContentFile(
    { ...DESCRIPTOR, rootKind: 'prefab', path: '/projects/demo/objects.json', relativePath: 'objects.json' },
    JSON.stringify({ schemaVersion: 1, definitions: [] }),
    'sha256:prefab',
  );
  const legacySpawn = inspectStudioProjectContentFile(
    { ...DESCRIPTOR, path: '/projects/demo/content/starts.json', relativePath: 'content/starts.json' },
    JSON.stringify({ catalogId: 'starts', markers: [{ markerId: 'spawn.player' }] }),
    'sha256:spawn',
  );

  assert.equal(actor.sourceKind, 'entityDefinition');
  assert.equal(actor.documentId, 'actor/player');
  assert.equal(prefab.sourceKind, 'prefabRegistry');
  assert.equal(legacySpawn.sourceClass, 'legacy-source');
  assert.equal(legacySpawn.legacyCategory, 'scenes-and-spawns');
});

test('canonical ProjectContent envelopes route every document kind without inspecting document shape', () => {
  const cases = [
    ['entityDefinition', 'demo.actor'],
    ['assetCatalog', 'demo.assets'],
    ['prefabRegistry', 'demo.prefabs'],
    ['gameplayConfiguration', 'demo.gameplay'],
    ['presentationCatalog', 'demo.presentation'],
  ] as const;

  for (const [documentKind, documentId] of cases) {
    const sourceText = JSON.stringify({
      schemaVersion: 1,
      documentId,
      documentKind,
      document: { deliberatelyOpaqueToStudio: true },
    });
    const source = inspectStudioProjectContentFile(
      {
        ...DESCRIPTOR,
        path: `/projects/demo/catalogs/${documentId}.json`,
        relativePath: `catalogs/${documentId}.json`,
      },
      sourceText,
      `sha256:${documentId}`,
    );

    assert.equal(source.sourceClass, 'canonical-candidate');
    assert.equal(source.sourceKind, documentKind);
    assert.equal(source.documentId, documentId);
    assert.equal(source.text, sourceText);
    assert.equal(source.parseDiagnostic, null);
  }
});

test('asset lock is not inferred to be an asset catalog merely because it has entries', () => {
  const source = inspectStudioProjectContentFile(
    {
      ...DESCRIPTOR,
      rootKind: 'asset',
      path: '/projects/demo/assets/lock.json',
      relativePath: 'assets/lock.json',
    },
    JSON.stringify({ schemaVersion: 1, entries: [] }),
    'sha256:asset-lock',
  );

  assert.equal(source.sourceClass, 'unrecognized');
  assert.equal(source.sourceKind, null);
  assert.equal(source.parseDiagnostic, null);
});

test('provider schemas produce typed fields and reference navigation without property paths', () => {
  const codec = gameplayCodec();
  const source = inspectStudioProjectContentFile(
    DESCRIPTOR,
    JSON.stringify({ configurations: [], bindings: [], overrides: [], triggers: [] }),
    'sha256:source',
  );
  const browser = buildStudioProjectContentBrowserReadModel({
    status: 'ready',
    message: 'ready',
    projectRoot: '/projects/demo',
    files: [source],
    codec,
    selectedEntryId: `document:${source.documentId}`,
    dirtyDocumentIds: [],
    staleSourcePath: null,
    manifest: manifest(),
    activeScenePath: null,
    activeScene: buildInitialWorkspaceReadModel().flatSceneDocument,
    projectScenes: [buildInitialWorkspaceReadModel().flatSceneDocument],
  });

  assert.deepEqual(
    browser.editableFields.map(field => [field.fieldId, field.valueKind, field.value]),
    [['speed', 'number', 4.5], ['actor', 'reference', 'actor/player']],
  );
  assert.equal(browser.canSaveSelected, false);

  const stale = buildStudioProjectContentBrowserReadModel({
    status: 'degraded',
    message: 'stale',
    projectRoot: '/projects/demo',
    files: [source],
    codec,
    selectedEntryId: `document:${source.documentId}`,
    dirtyDocumentIds: [source.documentId],
    staleSourcePath: source.path,
    manifest: manifest(),
    activeScenePath: null,
    activeScene: buildInitialWorkspaceReadModel().flatSceneDocument,
    projectScenes: [buildInitialWorkspaceReadModel().flatSceneDocument],
  });
  assert.equal(stale.canSaveSelected, false);
  assert.equal(stale.staleSourcePath, source.path);

  const updated = updateProjectConfigurationField(
    codec.documents,
    source.documentId,
    'demo.movement',
    'speed',
    { kind: 'number', value: 6 },
  );
  assert.equal(updated?.kind, 'gameplayConfiguration');
  assert.deepEqual(
    updated?.kind === 'gameplayConfiguration'
      ? updated.document.configurations[0]?.values[0]
      : null,
    { fieldId: 'speed', value: { kind: 'number', value: 6 } },
  );
});

test('legacy spawn relationships remain navigable while clearly requiring migration', () => {
  const source = inspectStudioProjectContentFile(
    { ...DESCRIPTOR, path: '/projects/demo/content/starts.json', relativePath: 'content/starts.json' },
    JSON.stringify({ catalogId: 'starts', markers: [{ markerId: 'spawn.player' }] }),
    'sha256:spawn',
  );
  const browser = buildStudioProjectContentBrowserReadModel({
    status: 'ready',
    message: 'ready',
    projectRoot: '/projects/demo',
    files: [source],
    codec: null,
    selectedEntryId: null,
    dirtyDocumentIds: [],
    staleSourcePath: null,
    manifest: manifest(),
    activeScenePath: null,
    activeScene: buildInitialWorkspaceReadModel().flatSceneDocument,
    projectScenes: [buildInitialWorkspaceReadModel().flatSceneDocument],
  });
  const entry = findStudioProjectContentEntryByReference(browser, 'spawnMarker', 'spawn.player');
  assert.equal(entry?.status, 'migration-required');
  assert.equal(entry?.sourcePath, '/projects/demo/content/starts.json');
});

test('manifest write authorization disables dirty project content outside allowed_source_writes', () => {
  const descriptor: StudioProjectContentFileDescriptor = {
    ...DESCRIPTOR,
    path: '/projects/demo/catalogs/catalog.json',
    relativePath: 'catalogs/catalog.json',
  };
  const source = inspectStudioProjectContentFile(
    descriptor,
    JSON.stringify({ configurations: [], bindings: [], overrides: [], triggers: [] }),
    'sha256:source',
  );
  const browser = buildStudioProjectContentBrowserReadModel({
    status: 'ready',
    message: 'ready',
    projectRoot: '/projects/demo',
    files: [source],
    codec: gameplayCodec(),
    selectedEntryId: `document:${source.documentId}`,
    dirtyDocumentIds: [source.documentId],
    staleSourcePath: null,
    manifest: manifest('["scenes", "prefabs", "assets"]'),
    activeScenePath: null,
    activeScene: buildInitialWorkspaceReadModel().flatSceneDocument,
    projectScenes: [buildInitialWorkspaceReadModel().flatSceneDocument],
  });

  assert.equal(browser.canSaveSelected, false);
  assert.equal(browser.selectedWriteAuthorization?.allowed, false);
  assert.match(browser.selectedWriteAuthorization?.diagnostic ?? '', /outside allowed roots/);
});

test('prefab-part options use the canonical Rust target identity and bindings are navigable', () => {
  const gameplay = gameplayCodec().documents[0];
  assert.equal(gameplay?.kind, 'gameplayConfiguration');
  if (gameplay?.kind !== 'gameplayConfiguration') throw new Error('gameplay fixture missing');
  const gameplayWithBinding: ProjectContentDocument = {
    ...gameplay,
    document: {
      ...gameplay.document,
      configurations: [{
        ...gameplay.document.configurations[0]!,
        values: [{
          fieldId: 'part',
          value: { kind: 'reference', referenceKind: 'prefabPart', targetId: '70:interaction/body' },
        }],
      }],
      bindings: [{
        bindingId: 'binding.player',
        moduleId: 'demo.movement-module',
        configurationId: 'demo.movement',
        stateSchema: { namespace: 'demo', name: 'state', version: 1, schemaHash: 'state' },
        target: { kind: 'prefabPart', part: { prefab: prefabId(70), role: 'interaction/body' } },
        requiredReads: [],
        outputContracts: [],
        enabled: true,
      }],
    },
  };
  const prefab: ProjectContentDocument = {
    kind: 'prefabRegistry',
    documentId: 'prefab-registry:prefabs/registry.json',
    registry: {
      schemaVersion: 1,
      definitions: [{
        id: prefabId(70),
        schemaVersion: 1,
        displayName: 'Player Prefab',
        parts: [],
        partRoles: [{ role: 'interaction/body', part: prefabPartId(1) }],
        variant: null,
      }],
    },
  };
  const codec: ProjectContentCodecResult = {
    ...gameplayCodec(),
    documents: [gameplayWithBinding, prefab],
    providerSchemas: [{
      ...gameplayCodec().providerSchemas[0]!,
      fields: [{
        fieldId: 'part',
        label: 'Prefab part',
        valueKind: 'reference',
        required: true,
        referenceKind: 'prefabPart',
        integerMin: null,
        integerMax: null,
        numberMin: null,
        numberMax: null,
      }],
    }],
  };
  const source = inspectStudioProjectContentFile(
    DESCRIPTOR,
    JSON.stringify({ configurations: [], bindings: [], overrides: [], triggers: [] }),
    'sha256:source',
  );
  const browser = buildStudioProjectContentBrowserReadModel({
    status: 'ready',
    message: 'ready',
    projectRoot: '/projects/demo',
    files: [source],
    codec,
    selectedEntryId: `document:${source.documentId}`,
    dirtyDocumentIds: [],
    staleSourcePath: null,
    manifest: manifest(),
    activeScenePath: null,
    activeScene: buildInitialWorkspaceReadModel().flatSceneDocument,
    projectScenes: [buildInitialWorkspaceReadModel().flatSceneDocument],
  });

  assert.equal(formatProjectContentPrefabPartReference(70, 'interaction/body'), '70:interaction/body');
  assert.deepEqual(browser.editableFields[0]?.options, [{
    value: '70:interaction/body',
    label: 'Player Prefab · interaction/body',
  }]);
  assert.equal(
    findStudioProjectContentEntryByReference(browser, 'binding', 'binding.player')?.documentId,
    source.documentId,
  );
});

test('manifest scene admission includes every stored scene and ignores an active scene from another project', () => {
  const sceneA = inspectStudioProjectContentFile(
    { ...DESCRIPTOR, rootKind: 'scene', path: '/projects/b/scenes/a.scene.json', relativePath: 'scenes/a.scene.json' },
    JSON.stringify({ schemaVersion: 1, id: 1, metadata: {}, dependencies: [], nodes: [] }),
    'sha256:a',
  );
  const sceneB = inspectStudioProjectContentFile(
    { ...DESCRIPTOR, rootKind: 'scene', path: '/projects/b/scenes/b.scene.json', relativePath: 'scenes/b.scene.json' },
    JSON.stringify({ schemaVersion: 1, id: 2, metadata: {}, dependencies: [], nodes: [] }),
    'sha256:b',
  );
  const sources = selectStudioProjectContentSceneSources(
    [sceneA, sceneB],
    '/projects/a/scenes/old.scene.json',
    JSON.stringify({ schemaVersion: 1, id: 1, metadata: {}, dependencies: [], nodes: [{ old: true }] }),
  );

  assert.deepEqual(sources.map(source => source.path), [sceneA.path, sceneB.path]);
  assert.equal(sources[0]?.sourceText, sceneA.text);
  assert.equal(sources[1]?.sourceText, sceneB.text);
});
