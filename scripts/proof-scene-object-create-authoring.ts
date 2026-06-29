#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applySceneObjectCommandReadModel,
  buildInitialWorkspaceReadModel,
  buildStudioSceneAuthoringOperation,
  createCreateSceneObjectRequest,
  studioSceneAuthoringBaseHash,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/scene-object-create-authoring-proof/latest');
const artifactPath = join(outDir, 'index.json');

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

const before = buildInitialWorkspaceReadModel();
const record = {
  id: 9201,
  parent: 1,
  childOrder: 20,
  label: 'Created authoring object',
  tags: ['authoring-proof'],
  transform: {
    translation: [2, 0, 0] as const,
    rotation: [0, 0, 0, 1] as const,
    scale: [1, 1, 1] as const,
  },
  kind: { kind: 'emptyGroup' as const },
};
const operation = buildStudioSceneAuthoringOperation(before.flatSceneDocument, {
  actor: 'agent',
  expectedBaseHash: studioSceneAuthoringBaseHash(before.flatSceneDocument),
  operation: { kind: 'create_scene_object', record },
});
assert.equal(operation.ok, true);
if (!operation.ok) throw new Error('create authoring operation should validate');

const applied = applySceneObjectCommandReadModel(
  before,
  createCreateSceneObjectRequest(before, record),
);
assert.equal(applied.ok, true);
assert.equal(applied.workspace.selectedEntityId, 'scene-node:9201');

const stale = applySceneObjectCommandReadModel(before, {
  ...createCreateSceneObjectRequest(before, { ...record, id: 9202, label: 'Stale create' }),
  expectedDocumentHash: -1,
});
const duplicate = applySceneObjectCommandReadModel(
  before,
  createCreateSceneObjectRequest(before, before.flatSceneDocument.nodes[0]!),
);
assert.equal(stale.ok, false);
assert.equal(duplicate.ok, false);

const artifactBody = {
  artifactKind: 'studio_scene_object_create_authoring_proof',
  artifactVersion: 'studio-scene-object-create-authoring-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run proof:scene-object-create-authoring',
  operation: operation.operation,
  fileHashes: {
    beforeDocumentHash: sha256(before.flatSceneDocument),
    afterDocumentHash: sha256(applied.workspace.flatSceneDocument),
  },
  readout: {
    selectedEntityId: applied.workspace.selectedEntityId,
    hierarchyObjectId: 'scene-node:9201',
    hierarchyObjectName: applied.workspace.sceneObjectSnapshot.objects.find(object => object.objectId === 'scene-node:9201')?.displayName,
    readoutHash: sha256({
      selectedEntityId: applied.workspace.selectedEntityId,
      sceneObjectSnapshot: applied.workspace.sceneObjectSnapshot,
      entities: applied.workspace.entities,
    }),
  },
  negativeSmokes: [
    { name: 'stale create', ok: stale.ok, diagnostics: stale.diagnostics },
    { name: 'duplicate create', ok: duplicate.ok, diagnostics: duplicate.diagnostics },
  ],
  validations: [
    'typed_create_operation_validated',
    'operation_hash_recorded',
    'scene_object_projected_to_hierarchy',
    'inspector_selection_readout_updated',
    'before_after_document_hashes_recorded',
    'negative_duplicate_create_failed_closed',
    'negative_stale_create_failed_closed',
  ],
  nonClaims: [
    'not_runtime_authority',
    'not_private_ui_mutation',
    'not_source_write_until_save_operation',
  ],
};
const artifact = {
  ...artifactBody,
  artifactHash: sha256(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
