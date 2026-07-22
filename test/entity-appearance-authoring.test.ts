import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sceneId,
  sceneNodeId,
  type FlatSceneDocument,
  type ProjectContentCodecResult,
  type ProjectContentDocument,
} from '@asha/contracts';
import {
  buildStudioEntityAppearancePreview,
  buildStudioProjectContentBrowserReadModel,
  findStudioProjectContentEntryByReference,
  inspectStudioProjectContentFile,
  updateProjectContentField,
  type StudioProjectContentFileDescriptor,
} from '@asha-studio/store';

const ENTITY_DOCUMENT_ID = 'demo.entity.enemy';
const RESOURCE_ID = 'demo.character.medium';

function entityDocument(appearanceResourceId: string | null = RESOURCE_ID): ProjectContentDocument {
  return {
    kind: 'entityDefinition',
    documentId: ENTITY_DOCUMENT_ID,
    definition: {
      stableId: 'actor/enemy',
      displayName: 'Enemy',
      source: { projectBundle: 'demo', relativePath: 'catalogs/enemy.entity.json' },
      tags: [],
      metadata: [],
      capabilities: [{
        kind: 'renderProjection',
        projectionId: 'enemy.visual',
        visible: true,
        appearance: appearanceResourceId === null ? null : {
          resourceId: appearanceResourceId,
          initialClipId: 'idle',
          modelScale: [0.5, 2, 1],
        },
      }],
    },
  };
}

function presentationDocument(): ProjectContentDocument {
  return {
    kind: 'presentationCatalog',
    documentId: 'demo.presentation',
    catalog: {
      schemaVersion: 1,
      resources: [{
        resourceId: RESOURCE_ID,
        kind: 'animatedMesh',
        assetId: 'mesh/demo-character',
        sourcePath: 'assets/character.glb',
        contentHash: '0123456789abcdef',
        licensePath: 'assets/LICENSE.txt',
        animatedMesh: {
          asset: 'mesh/demo-character',
          runtimeFormat: 'glb',
          contentHash: '0123456789abcdef',
          clips: [
            { id: 'idle', name: 'Idle', durationSeconds: 1 },
            { id: 'run', name: 'Run', durationSeconds: 0.5 },
          ],
          defaultClip: 'idle',
          materialSlots: [{ slot: 0, material: 'material/character' }],
          bounds: { min: [-0.5, 0, -0.5], max: [0.5, 2, 0.5] },
        },
      }],
      cues: [],
    },
  };
}

function codec(entity = entityDocument()): ProjectContentCodecResult {
  return {
    accepted: true,
    documents: [entity, presentationDocument()],
    canonicalFiles: [],
    setHash: 'sha256:set',
    providerSchemas: [],
    fieldMetadata: [],
    diagnostics: [],
  };
}

function scene(): FlatSceneDocument {
  return {
    schemaVersion: 1,
    id: sceneId(7),
    metadata: { name: 'Appearance room', description: null, tags: [], author: null },
    nodes: [
      {
        id: sceneNodeId(1),
        parent: null,
        childOrder: 0,
        label: 'Room root',
        tags: [],
        transform: { translation: [10, 2, -3], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        kind: { kind: 'emptyGroup' },
      },
      {
        id: sceneNodeId(2),
        parent: sceneNodeId(1),
        childOrder: 0,
        label: 'Enemy',
        tags: [],
        transform: { translation: [3, 0, 1], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        kind: {
          kind: 'entityInstance',
          instance: {
            instanceId: 'enemy.primary',
            reference: { kind: 'entityDefinition', stableId: 'actor/enemy' },
            spawnMarkerId: null,
          },
        },
      },
    ],
  };
}

test('admitted appearance projects an animated mesh at the composed stored transform without runtime state', () => {
  const preview = buildStudioEntityAppearancePreview({
    codec: codec(),
    projectRoot: '/projects/demo',
    scene: scene(),
  });

  assert.equal(preview.status, 'ready');
  assert.deepEqual(preview.resources, [{
    asset: 'mesh/demo-character',
    sourcePath: '/projects/demo/assets/character.glb',
    contentHash: '0123456789abcdef',
    clipIds: ['idle', 'run'],
    licensePath: '/projects/demo/assets/LICENSE.txt',
  }]);
  const instance = preview.frame.ops.find(operation => operation.op === 'createAnimatedMeshInstance');
  assert.ok(instance?.op === 'createAnimatedMeshInstance');
  assert.deepEqual(instance.instance.transform.translation, [13, 2, -2]);
  assert.deepEqual(instance.instance.transform.scale, [0.5, 2, 1]);
  assert.equal(instance.instance.playback?.action, 'play');
  assert.equal(instance.instance.metadata.label, 'scene-node-renderable:2');
});

test('missing and unsupported appearance bindings remain explicit instead of becoming claimed mesh previews', () => {
  const missing = buildStudioEntityAppearancePreview({
    codec: codec(entityDocument(null)),
    projectRoot: '/projects/demo',
    scene: scene(),
  });
  assert.equal(missing.status, 'degraded');
  assert.equal(missing.instances.length, 0);
  assert.match(missing.diagnostics[0] ?? '', /no canonical appearance is bound/u);
});

test('entity inspector exposes compatible resource, clip, and scale controls and updates canonical documents', () => {
  const entity = entityDocument();
  const presentation = presentationDocument();
  const files = [
    canonicalSource('catalogs/enemy.entity.json', entity),
    canonicalSource('catalogs/presentation.json', presentation),
  ];
  const browser = buildStudioProjectContentBrowserReadModel({
    status: 'ready',
    message: 'ready',
    projectRoot: '/projects/demo',
    files,
    codec: codec(entity),
    selectedEntryId: `document:${ENTITY_DOCUMENT_ID}`,
    dirtyDocumentIds: [],
    staleSourcePath: null,
    manifest: null,
    activeScenePath: null,
    activeScene: scene(),
    projectScenes: [scene()],
  });

  assert.deepEqual(browser.editableFields.map(field => field.fieldId), [
    'resourceId',
    'initialClipId',
    'modelScaleX',
    'modelScaleY',
    'modelScaleZ',
  ]);
  assert.deepEqual(browser.editableFields[0]?.options, [{
    value: RESOURCE_ID,
    label: `${RESOURCE_ID} · mesh/demo-character`,
  }]);
  assert.equal(
    findStudioProjectContentEntryByReference(browser, 'presentationResource', RESOURCE_ID)?.documentId,
    'demo.presentation',
  );

  const scaleField = browser.editableFields.find(field => field.fieldId === 'modelScaleY');
  assert.ok(scaleField);
  const updated = updateProjectContentField(codec(entity).documents, scaleField, { kind: 'number', value: 3 });
  assert.ok(updated?.kind === 'entityDefinition');
  const projection = updated.definition.capabilities.find(capability => capability.kind === 'renderProjection');
  assert.equal(projection?.kind, 'renderProjection');
  assert.deepEqual(projection?.kind === 'renderProjection' ? projection.appearance?.modelScale : null, [0.5, 3, 1]);
});

function canonicalSource(
  relativePath: string,
  document: ProjectContentDocument,
): ReturnType<typeof inspectStudioProjectContentFile> {
  const descriptor: StudioProjectContentFileDescriptor = {
    path: `/projects/demo/${relativePath}`,
    relativePath,
    rootKind: 'catalog',
    size: 1,
    mtimeMs: 1,
  };
  return inspectStudioProjectContentFile(descriptor, JSON.stringify({
    schemaVersion: 1,
    documentId: document.documentId,
    documentKind: document.kind,
    document: {},
  }), `sha256:${document.documentId}`);
}
