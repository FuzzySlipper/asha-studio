import type { RenderDiff, RenderFrameDiff, RenderHandle } from '@asha/contracts';
import type { WorkspaceAuthoringProjectionSummary } from '@asha/runtime-session';

type RetainedCreate = Extract<RenderDiff, {
  readonly op:
    | 'create'
    | 'createAnimatedMeshInstance'
    | 'createLight'
    | 'createSprite'
    | 'createStaticMeshInstance';
}>;

interface RetainedHandle {
  create: RetainedCreate;
  materialParameters: Map<number, Extract<RenderDiff, { readonly op: 'setMaterialInstanceParameters' }>>;
  meshPayload: Extract<RenderDiff, { readonly op: 'replaceMeshPayload' }> | null;
  playback: Extract<RenderDiff, { readonly op: 'setAnimatedMeshPlayback' }> | null;
  spriteUpdate: Extract<RenderDiff, { readonly op: 'updateSprite' }> | null;
}

export interface StudioWorkspaceProjectionDeliveryMetrics {
  readonly coalescedFrameCount: number;
  readonly meshPayloadOpCount: number;
  readonly pendingOpCount: number;
  readonly retainedOpCount: number;
}

export interface StudioWorkspaceProjectionDelivery extends WorkspaceAuthoringProjectionSummary {
  readonly recoveryFrame: RenderFrameDiff;
  readonly studioMetrics: StudioWorkspaceProjectionDeliveryMetrics;
}

/**
 * Retains only unacknowledged delivery operations while maintaining a compact
 * recovery snapshot. Angular may coalesce synchronous signal writes, but once
 * the viewport acknowledges a hash, that frame is never replayed again.
 */
export function retainStudioWorkspaceProjection(
  previous: StudioWorkspaceProjectionDelivery | null,
  projection: WorkspaceAuthoringProjectionSummary,
  acknowledgedProjectionHash: string | null,
): StudioWorkspaceProjectionDelivery {
  const sameGeneration = previous !== null
    && previous.workspaceId === projection.workspaceId
    && previous.generation === projection.generation;
  const reset = projection.delivery === 'replace' || !sameGeneration;
  const previousPending = sameGeneration
    && previous.projectionHash !== acknowledgedProjectionHash;
  const frame = reset
    ? projection.frame
    : previousPending
      ? { ops: [...previous.frame.ops, ...projection.frame.ops] }
      : projection.frame;
  const recoveryFrame = compactStudioWorkspaceProjectionFrame(
    reset ? null : previous?.recoveryFrame ?? null,
    projection.frame,
  );
  const coalescedFrameCount = reset
    ? 1
    : previousPending
      ? (previous?.studioMetrics.coalescedFrameCount ?? 1) + 1
      : 1;
  const delivery = reset || (previousPending && previous?.delivery === 'replace')
    ? 'replace'
    : 'apply';
  const projectionHash = studioProjectionHash({
    acknowledgedProjectionHash,
    coalescedFrameCount,
    delivery,
    generation: projection.generation,
    pendingHashes: previousPending
      ? [previous?.projectionHash ?? 'none', projection.projectionHash]
      : [projection.projectionHash],
    pendingOpCount: frame.ops.length,
    recoveryOpCount: recoveryFrame.ops.length,
    workspaceId: projection.workspaceId,
  });
  return {
    ...projection,
    delivery,
    frame,
    projectionHash,
    recoveryFrame,
    renderDiffCount: frame.ops.length,
    studioMetrics: {
      coalescedFrameCount,
      meshPayloadOpCount: frame.ops.filter(operation => operation.op === 'replaceMeshPayload').length,
      pendingOpCount: frame.ops.length,
      retainedOpCount: recoveryFrame.ops.length,
    },
  };
}

export function compactStudioWorkspaceProjectionFrame(
  previous: RenderFrameDiff | null,
  incoming: RenderFrameDiff,
): RenderFrameDiff {
  const definitions = new Map<string, RenderDiff>();
  const handles = new Map<number, RetainedHandle>();
  if (previous !== null) applyFrame(previous, definitions, handles);
  applyFrame(incoming, definitions, handles);
  const ops: RenderDiff[] = [...definitions.values()];
  for (const retained of handles.values()) {
    ops.push(retained.create);
    if (retained.meshPayload !== null) ops.push(retained.meshPayload);
    for (const operation of [...retained.materialParameters.values()].sort((left, right) => left.slot - right.slot)) {
      ops.push(operation);
    }
    if (retained.playback !== null) ops.push(retained.playback);
    if (retained.spriteUpdate !== null) ops.push(retained.spriteUpdate);
  }
  return { ops };
}

function applyFrame(
  frame: RenderFrameDiff,
  definitions: Map<string, RenderDiff>,
  handles: Map<number, RetainedHandle>,
): void {
  for (const operation of frame.ops) {
    applyOperation(operation, definitions, handles);
  }
}

function applyOperation(
  operation: RenderDiff,
  definitions: Map<string, RenderDiff>,
  handles: Map<number, RetainedHandle>,
): void {
  switch (operation.op) {
    case 'defineMaterial':
      definitions.set(`material:${operation.material.id}`, operation);
      return;
    case 'defineTexture':
      definitions.set(`texture:${operation.texture.id}`, operation);
      return;
    case 'defineSpriteAtlas':
      definitions.set(`sprite-atlas:${operation.atlas.id}`, operation);
      return;
    case 'defineStaticMesh':
      definitions.set(`static-mesh:${operation.asset.asset}`, operation);
      return;
    case 'defineAnimatedMesh':
      definitions.set(`animated-mesh:${operation.asset.asset}`, operation);
      return;
    case 'create':
    case 'createLight':
    case 'createStaticMeshInstance':
    case 'createAnimatedMeshInstance':
    case 'createSprite':
      handles.set(operation.handle as number, {
        create: operation,
        materialParameters: new Map(),
        meshPayload: null,
        playback: null,
        spriteUpdate: null,
      });
      return;
    case 'update': {
      const retained = requireHandle(handles, operation.handle, operation.op);
      if (retained.create.op !== 'create') {
        throw new Error(`workspace projection update cannot target ${retained.create.op}`);
      }
      retained.create = {
        ...retained.create,
        node: {
          ...retained.create.node,
          transform: operation.transform ?? retained.create.node.transform,
          material: operation.material ?? retained.create.node.material,
          visible: operation.visible ?? retained.create.node.visible,
          metadata: operation.metadata ?? retained.create.node.metadata,
        },
      };
      return;
    }
    case 'updateLight': {
      const retained = requireHandle(handles, operation.handle, operation.op);
      if (retained.create.op !== 'createLight') {
        throw new Error(`workspace projection updateLight cannot target ${retained.create.op}`);
      }
      retained.create = { ...retained.create, light: operation.light };
      return;
    }
    case 'updateSprite': {
      const retained = requireHandle(handles, operation.handle, operation.op);
      if (retained.create.op !== 'createSprite') {
        throw new Error(`workspace projection updateSprite cannot target ${retained.create.op}`);
      }
      const previous = retained.spriteUpdate;
      retained.spriteUpdate = {
        ...operation,
        frame: operation.frame ?? previous?.frame ?? null,
        tint: operation.tint ?? previous?.tint ?? null,
        renderOrder: operation.renderOrder ?? previous?.renderOrder ?? null,
        visible: operation.visible ?? previous?.visible ?? null,
      };
      return;
    }
    case 'replaceMeshPayload':
      requireHandle(handles, operation.handle, operation.op).meshPayload = operation;
      return;
    case 'setAnimatedMeshPlayback':
      requireHandle(handles, operation.handle, operation.op).playback = operation;
      return;
    case 'setMaterialInstanceParameters': {
      const retained = requireHandle(handles, operation.handle, operation.op);
      if (operation.parameters === null) retained.materialParameters.delete(operation.slot);
      else retained.materialParameters.set(operation.slot, operation);
      return;
    }
    case 'destroy':
      removeHandleAndDescendants(handles, operation.handle);
      return;
  }
}

function requireHandle(
  handles: Map<number, RetainedHandle>,
  handle: RenderHandle,
  operation: RenderDiff['op'],
): RetainedHandle {
  const retained = handles.get(handle as number);
  if (retained === undefined) throw new Error(`workspace projection ${operation} targets unknown handle ${handle as number}`);
  return retained;
}

function removeHandleAndDescendants(handles: Map<number, RetainedHandle>, handle: RenderHandle): void {
  const removed = new Set<number>([handle as number]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [candidateHandle, retained] of handles) {
      const parent = retained.create.parent;
      if (parent !== null && removed.has(parent as number) && !removed.has(candidateHandle)) {
        removed.add(candidateHandle);
        changed = true;
      }
    }
  }
  for (const removedHandle of removed) handles.delete(removedHandle);
}

function studioProjectionHash(input: unknown): string {
  const text = JSON.stringify(input);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `sha256:studio-projection-${hash.toString(16).padStart(8, '0')}`;
}
