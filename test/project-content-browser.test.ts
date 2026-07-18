import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ProjectContentCodecResult,
  ProjectContentDocument,
} from '@asha/contracts';
import { buildInitialWorkspaceReadModel } from '@asha-studio/domain';
import {
  buildStudioProjectContentBrowserReadModel,
  findStudioProjectContentEntryByReference,
  inspectStudioProjectContentFile,
  updateProjectConfigurationField,
  type StudioProjectContentFileDescriptor,
} from '@asha-studio/store';

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
    activeScenePath: null,
    activeScene: buildInitialWorkspaceReadModel().flatSceneDocument,
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
    activeScenePath: null,
    activeScene: buildInitialWorkspaceReadModel().flatSceneDocument,
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
    activeScenePath: null,
    activeScene: buildInitialWorkspaceReadModel().flatSceneDocument,
  });
  const entry = findStudioProjectContentEntryByReference(browser, 'spawnMarker', 'spawn.player');
  assert.equal(entry?.status, 'migration-required');
  assert.equal(entry?.sourcePath, '/projects/demo/content/starts.json');
});
