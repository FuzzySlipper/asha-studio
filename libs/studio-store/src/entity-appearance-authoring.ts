import {
  renderHandle,
  type FlatSceneDocument,
  type ProjectContentCodecResult,
  type ProjectPresentationResource,
  type RenderFrameDiff,
  type RenderHandle,
  type Transform,
} from '@asha/contracts';
import { resolveStudioSceneNodeTransformContext } from '@asha-studio/domain';

export interface StudioEntityAppearanceResourceReadModel {
  readonly asset: string;
  readonly sourcePath: string;
  readonly contentHash: string;
  readonly clipIds: readonly string[];
  readonly licensePath: string | null;
}

export interface StudioEntityAppearanceInstanceReadModel {
  readonly renderableId: string;
  readonly sceneNodeId: number;
  readonly handle: RenderHandle;
  readonly resourceId: string;
  /// The exact renderer-neutral transform realized by the normal preview,
  /// including the appearance model scale. Manipulation previews reuse this
  /// value so beginning or cancelling a drag cannot drop presentation scale.
  readonly transform: Transform;
}

export interface StudioEntityAppearancePreviewReadModel {
  readonly status: 'unavailable' | 'ready' | 'degraded';
  readonly message: string;
  readonly resources: readonly StudioEntityAppearanceResourceReadModel[];
  readonly instances: readonly StudioEntityAppearanceInstanceReadModel[];
  readonly frame: RenderFrameDiff;
  readonly resourceKey: string;
  readonly diagnostics: readonly string[];
}

export function buildStudioEntityAppearancePreview(options: {
  readonly codec: ProjectContentCodecResult | null;
  readonly projectRoot: string | null;
  readonly scene: FlatSceneDocument;
}): StudioEntityAppearancePreviewReadModel {
  const codec = options.codec;
  if (codec === null || options.projectRoot === null) {
    return emptyPreview('unavailable', 'Open a Rust-admitted project to preview entity appearances.');
  }
  if (!codec.accepted) {
    return emptyPreview('degraded', 'Rust rejected the project-content set; canonical appearances are not previewed.');
  }

  const definitions = new Map(codec.documents.flatMap(document => (
    document.kind === 'entityDefinition'
      ? [[document.definition.stableId, document.definition] as const]
      : []
  )));
  const presentationResources = new Map(codec.documents.flatMap(document => (
    document.kind === 'presentationCatalog'
      ? document.catalog.resources.map(resource => [resource.resourceId, resource] as const)
      : []
  )));
  const resourcesByAsset = new Map<string, StudioEntityAppearanceResourceReadModel>();
  const definedResources = new Map<string, ProjectPresentationResource>();
  const instances: StudioEntityAppearanceInstanceReadModel[] = [];
  const instanceOps: RenderFrameDiff['ops'][number][] = [];
  const diagnostics: string[] = [];
  let nextHandle = 4_000_001;

  for (const node of options.scene.nodes) {
    if (node.kind.kind !== 'entityInstance') continue;
    const reference = node.kind.instance.reference;
    if (reference.kind !== 'entityDefinition') {
      diagnostics.push(`${node.label ?? node.kind.instance.instanceId}: prefab appearance preview is not resolved by the current public descriptor.`);
      continue;
    }
    const definition = definitions.get(reference.stableId);
    if (definition === undefined) {
      diagnostics.push(`${node.label ?? reference.stableId}: EntityDefinition ${reference.stableId} is unavailable.`);
      continue;
    }
    const projections = definition.capabilities.filter(capability => capability.kind === 'renderProjection');
    if (projections.length !== 1) {
      diagnostics.push(`${definition.displayName}: expected one render-projection capability, found ${projections.length}.`);
      continue;
    }
    const projection = projections[0];
    if (projection?.kind !== 'renderProjection' || projection.appearance === null) {
      diagnostics.push(`${definition.displayName}: no canonical appearance is bound.`);
      continue;
    }
    const appearance = projection.appearance;
    const resource = presentationResources.get(appearance.resourceId);
    if (resource === undefined) {
      diagnostics.push(`${definition.displayName}: presentation resource ${appearance.resourceId} is unavailable.`);
      continue;
    }
    if (resource.kind !== 'animatedMesh' || resource.animatedMesh === null) {
      diagnostics.push(`${definition.displayName}: ${resource.resourceId} does not expose animated-mesh preview capability.`);
      continue;
    }
    const transformContext = resolveStudioSceneNodeTransformContext(options.scene, node.id);
    if (transformContext === null) {
      diagnostics.push(`${definition.displayName}: scene transform composition failed for node ${node.id as number}.`);
      continue;
    }
    const descriptor = resource.animatedMesh;
    const existing = definedResources.get(descriptor.asset);
    if (existing !== undefined && !sameAnimatedMeshDescriptor(existing, resource)) {
      diagnostics.push(`${definition.displayName}: asset ${descriptor.asset} has conflicting admitted descriptors.`);
      continue;
    }
    definedResources.set(descriptor.asset, resource);
    resourcesByAsset.set(descriptor.asset, {
      asset: descriptor.asset,
      sourcePath: joinHostPath(options.projectRoot, resource.sourcePath),
      contentHash: resource.contentHash,
      clipIds: descriptor.clips.map(clip => clip.id),
      licensePath: resource.licensePath === null
        ? null
        : joinHostPath(options.projectRoot, resource.licensePath),
    });
    const handle = renderHandle(nextHandle);
    nextHandle += 1;
    const renderableId = `scene-node-renderable:${node.id}`;
    const effectiveClip = appearance.initialClipId ?? descriptor.defaultClip;
    const realizedTransform = applyModelScale(
      transformContext.worldTransform,
      appearance.modelScale,
    );
    instances.push({
      renderableId,
      sceneNodeId: node.id as number,
      handle,
      resourceId: resource.resourceId,
      transform: realizedTransform,
    });
    instanceOps.push({
      op: 'createAnimatedMeshInstance',
      handle,
      parent: null,
      instance: {
        asset: descriptor.asset,
        transform: realizedTransform,
        materialOverrides: [],
        playback: effectiveClip === null
          ? null
          : {
              action: 'play',
              clip: effectiveClip,
              loop: 'repeat',
              speed: 1,
              weight: 1,
              restart: true,
              fadeSeconds: null,
            },
        metadata: { source: null, tags: [], label: renderableId },
      },
    });
    if (!projection.visible) {
      instanceOps.push({
        op: 'update',
        handle,
        transform: null,
        material: null,
        visible: false,
        metadata: null,
      });
    }
  }

  const resources = [...resourcesByAsset.values()].sort((left, right) => left.asset.localeCompare(right.asset));
  const definitionOps: RenderFrameDiff['ops'][number][] = [...definedResources.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, resource]) => {
      const descriptor = resource.animatedMesh;
      if (descriptor === null) throw new Error('admitted animated-mesh resource lost its descriptor');
      return {
        op: 'defineAnimatedMesh' as const,
        asset: {
          asset: descriptor.asset,
          runtimeFormat: descriptor.runtimeFormat,
          contentHash: descriptor.contentHash,
          clips: descriptor.clips,
          defaultClip: descriptor.defaultClip,
          materialSlots: descriptor.materialSlots,
          bounds: descriptor.bounds,
        },
      };
    });
  const frame = { ops: [...definitionOps, ...instanceOps] };
  const resourceKey = JSON.stringify(resources);
  return {
    status: diagnostics.length === 0 ? 'ready' : instances.length > 0 ? 'ready' : 'degraded',
    message: instances.length > 0
      ? `Previewing ${instances.length} canonical entity appearance${instances.length === 1 ? '' : 's'} without a RuntimeSession.`
      : 'No canonical entity appearance can be previewed in the open scene.',
    resources,
    instances,
    frame,
    resourceKey,
    diagnostics,
  };
}

function emptyPreview(
  status: StudioEntityAppearancePreviewReadModel['status'],
  message: string,
): StudioEntityAppearancePreviewReadModel {
  return {
    status,
    message,
    resources: [],
    instances: [],
    frame: { ops: [] },
    resourceKey: '[]',
    diagnostics: [],
  };
}

function applyModelScale(
  transform: Transform,
  modelScale: readonly [number, number, number],
): Transform {
  return {
    ...transform,
    scale: [
      transform.scale[0] * modelScale[0],
      transform.scale[1] * modelScale[1],
      transform.scale[2] * modelScale[2],
    ],
  };
}

function sameAnimatedMeshDescriptor(
  left: ProjectPresentationResource,
  right: ProjectPresentationResource,
): boolean {
  return JSON.stringify(left.animatedMesh) === JSON.stringify(right.animatedMesh)
    && left.contentHash === right.contentHash
    && left.sourcePath === right.sourcePath;
}

function joinHostPath(root: string, relativePath: string): string {
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/+$/u, '');
  const normalizedRelative = relativePath.replaceAll('\\', '/').replace(/^\/+|\/+$/gu, '');
  return `${normalizedRoot}/${normalizedRelative}`;
}
