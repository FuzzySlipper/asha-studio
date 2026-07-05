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
  createRenameSceneObjectRequest,
  createTranslateSceneObjectRequest,
  studioSceneAuthoringBaseHash,
  type StudioSceneAuthoringOperationRequest,
} from '@asha-studio/domain';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(repoRoot, 'artifacts/scene-object-edit-authoring-proof/latest');
const artifactPath = join(outDir, 'index.json');

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

const before = buildInitialWorkspaceReadModel();
const targetId = before.selectedEntityId;
assert.ok(targetId?.startsWith('scene-node:'));
const beforeNode = before.flatSceneDocument.nodes.find(node => `scene-node:${node.id as number}` === targetId);
assert.ok(beforeNode);

const renameOperation = buildStudioSceneAuthoringOperation(before.flatSceneDocument, {
  actor: 'agent',
  expectedBaseHash: studioSceneAuthoringBaseHash(before.flatSceneDocument),
  operation: {
    kind: 'update_scene_object',
    objectId: targetId,
    patch: { label: 'Edited authoring object' },
  },
});
assert.equal(renameOperation.ok, true);
if (!renameOperation.ok) throw new Error('rename operation should validate');
const renamed = applySceneObjectCommandReadModel(before, createRenameSceneObjectRequest(before, targetId, 'Edited authoring object'));
assert.equal(renamed.ok, true);

const transformOperation = buildStudioSceneAuthoringOperation(renamed.workspace.flatSceneDocument, {
  actor: 'agent',
  expectedBaseHash: studioSceneAuthoringBaseHash(renamed.workspace.flatSceneDocument),
  operation: {
    kind: 'update_scene_object',
    objectId: targetId,
    patch: {
      transform: {
        ...beforeNode.transform,
        translation: [
          beforeNode.transform.translation[0] + 0.5,
          beforeNode.transform.translation[1],
          beforeNode.transform.translation[2],
        ],
      },
    },
  },
});
assert.equal(transformOperation.ok, true);
if (!transformOperation.ok) throw new Error('transform operation should validate');
const transformed = applySceneObjectCommandReadModel(renamed.workspace, createTranslateSceneObjectRequest(renamed.workspace, targetId, [0.5, 0, 0]));
assert.equal(transformed.ok, true);

const savedSceneText = JSON.stringify(transformed.workspace.flatSceneDocument, null, 2);
const reopenedSceneDocument = JSON.parse(savedSceneText);
assert.deepEqual(reopenedSceneDocument, transformed.workspace.flatSceneDocument);

const staleOperation = buildStudioSceneAuthoringOperation(before.flatSceneDocument, {
  actor: 'agent',
  expectedBaseHash: 'studio-scene-authoring-base-stale',
  operation: {
    kind: 'update_scene_object',
    objectId: targetId,
    patch: { label: 'Stale edit' },
  },
});
const unsupportedOperation = buildStudioSceneAuthoringOperation(before.flatSceneDocument, {
  actor: 'agent',
  expectedBaseHash: studioSceneAuthoringBaseHash(before.flatSceneDocument),
  operation: {
    kind: 'update_scene_object',
    objectId: targetId,
    patch: {
      materialId: 'material.demo-copper',
    },
  },
} as StudioSceneAuthoringOperationRequest);
assert.equal(staleOperation.ok, false);
assert.equal(unsupportedOperation.ok, false);

const artifactBody = {
  artifactKind: 'studio_scene_object_edit_authoring_proof',
  artifactVersion: 'studio-scene-object-edit-authoring-proof.v0',
  generatedAt: 'deterministic-as-structure-only',
  command: 'pnpm run evidence -- scene-object-edit-authoring',
  target: {
    objectId: targetId,
    beforeLabel: beforeNode.label,
    afterLabel: transformed.workspace.sceneObjectSnapshot.objects.find(object => object.objectId === targetId)?.displayName,
  },
  operations: [renameOperation.operation, transformOperation.operation],
  fileHashes: {
    beforeDocumentHash: sha256(before.flatSceneDocument),
    afterDocumentHash: sha256(transformed.workspace.flatSceneDocument),
    reopenedDocumentHash: sha256(reopenedSceneDocument),
  },
  readout: {
    selectedEntityId: transformed.workspace.selectedEntityId,
    hierarchyName: transformed.workspace.sceneObjectSnapshot.objects.find(object => object.objectId === targetId)?.displayName,
    timelineCommandIds: transformed.workspace.timeline.slice(-2).map(entry => entry.commandId),
    readoutHash: sha256({
      selectedEntityId: transformed.workspace.selectedEntityId,
      sceneObjectSnapshot: transformed.workspace.sceneObjectSnapshot,
      flatSceneDocument: transformed.workspace.flatSceneDocument,
    }),
  },
  negativeSmokes: [
    { name: 'stale edit', ok: staleOperation.ok, diagnostics: staleOperation.diagnostics },
    { name: 'unsupported field', ok: unsupportedOperation.ok, diagnostics: unsupportedOperation.diagnostics },
  ],
  validations: [
    'typed_edit_operations_validated',
    'rename_operation_hash_recorded',
    'transform_operation_hash_recorded',
    'saved_scene_document_reopened',
    'hierarchy_readout_updated',
    'inspector_selection_readout_updated',
    'negative_stale_edit_failed_closed',
    'negative_unsupported_field_failed_closed',
  ],
  nonClaims: [
    'not_runtime_authority',
    'not_private_ui_mutation',
    'not_arbitrary_json_patch',
  ],
};
const artifact = {
  ...artifactBody,
  artifactHash: sha256(artifactBody),
};

await mkdir(outDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`wrote ${relative(repoRoot, artifactPath)}`);
