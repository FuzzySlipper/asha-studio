import {
  sceneNodeId,
  type FlatSceneDocument,
  type SceneNodeId,
  type VoxelVolumeAsset,
} from '@asha/contracts';

export interface StudioStoredProceduralEnvironmentRecipe {
  readonly providerId: string;
  readonly presetId: string;
  readonly providerVersion: number;
  readonly seed: number;
}

export interface StudioProceduralEnvironmentMarkerTarget {
  readonly sourceMarkerId: 'player_start' | 'exit_hint';
  readonly nodeId: SceneNodeId;
  readonly markerId: 'spawn/player-start' | 'navigation/exit-hint';
  readonly childOrder: number;
}

export interface StudioProceduralEnvironmentTargetSelection {
  readonly ok: true;
  readonly mode: 'create' | 'replace';
  readonly voxelNodeId: SceneNodeId;
  readonly voxelParentId: SceneNodeId | null;
  readonly voxelChildOrder: number;
  readonly markerTargets: readonly StudioProceduralEnvironmentMarkerTarget[];
}

export interface StudioProceduralEnvironmentTargetRejection {
  readonly ok: false;
  readonly diagnostic: string;
}

export type StudioProceduralEnvironmentTargetResult =
  | StudioProceduralEnvironmentTargetSelection
  | StudioProceduralEnvironmentTargetRejection;

const GENERATED_MARKERS = [{
  sourceMarkerId: 'player_start',
  markerId: 'spawn/player-start',
  childOrder: 0,
}, {
  sourceMarkerId: 'exit_hint',
  markerId: 'navigation/exit-hint',
  childOrder: 1,
}] as const;

/**
 * Reads editor defaults from provenance already validated by Rust. This is a
 * display/editing convenience only; preview admission resolves the requested
 * provider and validates the recipe again through Engine authority.
 */
export function readStudioStoredProceduralEnvironmentRecipe(
  asset: VoxelVolumeAsset,
): StudioStoredProceduralEnvironmentRecipe | null {
  if (asset.provenance.length !== 1 || asset.provenance[0]?.kind !== 'generated') {
    return null;
  }
  const match = /^asha-generator:\/\/([^/]+)\/([^/]+)\/v([1-9][0-9]*)\?(.+)$/u.exec(
    asset.provenance[0].uri,
  );
  if (match === null) return null;
  const providerId = match[1];
  const presetId = match[2];
  const providerVersionText = match[3];
  const queryText = match[4];
  if (
    providerId === undefined
    || presetId === undefined
    || providerVersionText === undefined
    || queryText === undefined
  ) {
    return null;
  }
  const query = new URLSearchParams(queryText);
  if (
    [...query.keys()].sort().join(',') !== 'configHash,seed'
    || query.getAll('configHash').length !== 1
    || query.getAll('seed').length !== 1
  ) {
    return null;
  }
  const seed = Number(query.get('seed'));
  const providerVersion = Number(providerVersionText);
  if (!Number.isSafeInteger(seed) || seed < 0 || !Number.isSafeInteger(providerVersion)) {
    return null;
  }
  return {
    providerId,
    presetId,
    providerVersion,
    seed,
  };
}

/**
 * Selects one stable procedural-environment identity. A scene with no managed
 * environment creates one; a scene with one reuses it even when the asset ID
 * is being changed. Multiple managed environments require one unique asset-ID
 * match so Studio never guesses which authored subtree to replace.
 */
export function selectStudioProceduralEnvironmentTarget(
  document: FlatSceneDocument,
  requestedAssetId: string,
): StudioProceduralEnvironmentTargetResult {
  const tagged = document.nodes.filter(node => node.tags.includes('procedural-environment'));
  if (tagged.some(node => node.kind.kind !== 'voxelVolume')) {
    return {
      ok: false,
      diagnostic: 'A procedural-environment tag is attached to a non-voxel scene node.',
    };
  }
  const assetMatches = document.nodes.filter(node =>
    node.kind.kind === 'voxelVolume' && node.kind.asset.id === requestedAssetId,
  );
  if (assetMatches.length > 1) {
    return {
      ok: false,
      diagnostic: `Scene has ${assetMatches.length} procedural environments for ${requestedAssetId}; replacement is ambiguous.`,
    };
  }
  const existing = tagged.length === 1
    ? tagged[0]
    : assetMatches.length === 1
      ? assetMatches[0]
      : undefined;
  if (tagged.length > 1 && existing === undefined) {
    return {
      ok: false,
      diagnostic: 'Scene has multiple procedural environments; enter an asset ID that uniquely selects the one to replace.',
    };
  }

  const usedIds = new Set(document.nodes.map(node => node.id as number));
  let nextId = document.nodes.reduce(
    (maximum, node) => Math.max(maximum, node.id as number),
    0,
  ) + 1;
  const allocateNodeId = (): SceneNodeId => {
    while (usedIds.has(nextId)) nextId += 1;
    const allocated = sceneNodeId(nextId);
    usedIds.add(nextId);
    nextId += 1;
    return allocated;
  };

  if (existing === undefined) {
    const voxelNodeId = allocateNodeId();
    const voxelChildOrder = document.nodes
      .filter(node => node.parent === null)
      .reduce((maximum, node) => Math.max(maximum, node.childOrder), -1) + 1;
    return {
      ok: true,
      mode: 'create',
      voxelNodeId,
      voxelParentId: null,
      voxelChildOrder,
      markerTargets: GENERATED_MARKERS.map(marker => ({
        ...marker,
        nodeId: allocateNodeId(),
      })),
    };
  }

  const generatedChildren = document.nodes.filter(node =>
    node.parent === existing.id && node.tags.includes('generated-marker'),
  );
  const unexpected = generatedChildren.find(node => {
    if (node.kind.kind !== 'marker') return true;
    const markerId = node.kind.markerId;
    return !GENERATED_MARKERS.some(marker => marker.markerId === markerId);
  });
  if (unexpected !== undefined) {
    return {
      ok: false,
      diagnostic: `Procedural environment ${String(existing.id)} has an unsupported generated-marker child.`,
    };
  }
  const markerTargets: StudioProceduralEnvironmentMarkerTarget[] = [];
  for (const marker of GENERATED_MARKERS) {
    const matches = generatedChildren.filter(node =>
      node.kind.kind === 'marker' && node.kind.markerId === marker.markerId,
    );
    if (matches.length > 1) {
      return {
        ok: false,
        diagnostic: `Procedural environment ${String(existing.id)} has duplicate ${marker.markerId} markers.`,
      };
    }
    const conflict = document.nodes.find(node =>
      node.parent === existing.id
        && node.kind.kind === 'marker'
        && node.kind.markerId === marker.markerId
        && !node.tags.includes('generated-marker'),
    );
    if (conflict !== undefined) {
      return {
        ok: false,
        diagnostic: `${marker.markerId} is an authored marker and cannot be overwritten by regeneration.`,
      };
    }
    markerTargets.push({
      ...marker,
      nodeId: matches[0]?.id ?? allocateNodeId(),
    });
  }
  return {
    ok: true,
    mode: 'replace',
    voxelNodeId: existing.id,
    voxelParentId: existing.parent,
    voxelChildOrder: existing.childOrder,
    markerTargets,
  };
}
