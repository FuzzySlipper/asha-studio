import type {
  Face,
  FlatSceneDocument,
  SceneNodeId,
  SceneTransform,
  VoxelCoord,
  VoxelInstancePickHint,
  VoxelProjectionInstanceBinding,
} from '@asha/contracts';

export interface StudioVoxelProjectionBindingPlan {
  readonly activeAssetId: string | null;
  readonly availableAssetIds: readonly string[];
  readonly instances: readonly VoxelProjectionInstanceBinding[];
  readonly registryDigest: string;
}

export interface StudioVoxelRendererPickInput {
  readonly cameraOrigin: readonly [number, number, number];
  readonly instanceTransform: SceneTransform;
  readonly worldNormal: readonly [number, number, number];
  readonly worldPosition: readonly [number, number, number];
}

export interface StudioVoxelRendererPickEvidence {
  readonly direction: readonly [number, number, number];
  readonly maxDistance: number;
  readonly rendererHint: VoxelInstancePickHint;
}

function stableHash(label: string, value: unknown): string {
  const source = `${label}:${JSON.stringify(value)}`;
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(source)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

function multiplyQuaternion(
  left: readonly [number, number, number, number],
  right: readonly [number, number, number, number],
): readonly [number, number, number, number] {
  const [lx, ly, lz, lw] = left;
  const [rx, ry, rz, rw] = right;
  return [
    lw * rx + lx * rw + ly * rz - lz * ry,
    lw * ry - lx * rz + ly * rw + lz * rx,
    lw * rz + lx * ry - ly * rx + lz * rw,
    lw * rw - lx * rx - ly * ry - lz * rz,
  ];
}

function normalizeQuaternion(
  value: readonly [number, number, number, number],
): readonly [number, number, number, number] {
  const length = Math.hypot(...value);
  return value.map(component => component / length) as unknown as readonly [number, number, number, number];
}

function rotateVector(
  rotation: readonly [number, number, number, number],
  vector: readonly [number, number, number],
): readonly [number, number, number] {
  const [x, y, z, w] = normalizeQuaternion(rotation);
  const [vx, vy, vz] = vector;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

function composeTransform(parent: SceneTransform, local: SceneTransform): SceneTransform {
  const scaledTranslation = [
    local.translation[0] * parent.scale[0],
    local.translation[1] * parent.scale[1],
    local.translation[2] * parent.scale[2],
  ] as const;
  const rotatedTranslation = rotateVector(parent.rotation, scaledTranslation);
  return {
    translation: [
      parent.translation[0] + rotatedTranslation[0],
      parent.translation[1] + rotatedTranslation[1],
      parent.translation[2] + rotatedTranslation[2],
    ],
    rotation: normalizeQuaternion(multiplyQuaternion(parent.rotation, local.rotation)),
    scale: [
      parent.scale[0] * local.scale[0],
      parent.scale[1] * local.scale[1],
      parent.scale[2] * local.scale[2],
    ],
  };
}

export function worldTransformForSceneNode(
  document: FlatSceneDocument,
  sceneNodeId: SceneNodeId,
): SceneTransform | null {
  const nodes = new Map(document.nodes.map(node => [node.id as number, node]));
  const chain: FlatSceneDocument['nodes'][number][] = [];
  const seen = new Set<number>();
  let current = nodes.get(sceneNodeId as number);
  while (current !== undefined) {
    const id = current.id as number;
    if (seen.has(id)) return null;
    seen.add(id);
    chain.push(current);
    current = current.parent === null ? undefined : nodes.get(current.parent as number);
  }
  if (chain.length === 0) return null;
  return chain
    .reverse()
    .map(node => node.transform)
    .reduce((world, local, index) => index === 0 ? local : composeTransform(world, local));
}

export function voxelInstanceId(sceneNodeId: SceneNodeId): string {
  return `scene-node:${sceneNodeId as number}`;
}

export function buildStudioVoxelProjectionBindingPlan(
  document: FlatSceneDocument,
  activeAssetId: string | null,
): StudioVoxelProjectionBindingPlan {
  const voxelNodes = document.nodes.filter(node => node.kind.kind === 'voxelVolume');
  const availableAssetIds = [...new Set(voxelNodes.map(node => (
    node.kind.kind === 'voxelVolume' ? node.kind.asset.id : ''
  )))].filter(Boolean).sort();
  const instances = activeAssetId === null
    ? []
    : voxelNodes.flatMap((node): readonly VoxelProjectionInstanceBinding[] => {
        if (node.kind.kind !== 'voxelVolume' || node.kind.asset.id !== activeAssetId) return [];
        const transform = worldTransformForSceneNode(document, node.id);
        return transform === null ? [] : [{
          instanceId: voxelInstanceId(node.id),
          sceneNodeId: node.id,
          assetId: node.kind.asset.id,
          transform,
        }];
      });
  return {
    activeAssetId,
    availableAssetIds,
    instances,
    registryDigest: stableHash('studio-voxel-instance-registry.v0', {
      sceneId: document.id,
      schemaVersion: document.schemaVersion,
      activeAssetId,
      instances,
    }),
  };
}

function inverseRotate(
  rotation: readonly [number, number, number, number],
  value: readonly [number, number, number],
): readonly [number, number, number] {
  return rotateVector([-rotation[0], -rotation[1], -rotation[2], rotation[3]], value);
}

function faceFromLocalNormal(normal: readonly [number, number, number]): Face {
  const axis = Math.abs(normal[0]) >= Math.abs(normal[1]) && Math.abs(normal[0]) >= Math.abs(normal[2])
    ? 0
    : Math.abs(normal[1]) >= Math.abs(normal[2]) ? 1 : 2;
  if (axis === 0) return normal[0] >= 0 ? 'posX' : 'negX';
  if (axis === 1) return normal[1] >= 0 ? 'posY' : 'negY';
  return normal[2] >= 0 ? 'posZ' : 'negZ';
}

export function buildStudioVoxelRendererPickEvidence(
  input: StudioVoxelRendererPickInput,
): StudioVoxelRendererPickEvidence | null {
  const relativeWorld = [
    input.worldPosition[0] - input.instanceTransform.translation[0],
    input.worldPosition[1] - input.instanceTransform.translation[1],
    input.worldPosition[2] - input.instanceTransform.translation[2],
  ] as const;
  const unrotatedPoint = inverseRotate(input.instanceTransform.rotation, relativeWorld);
  const localPoint = [
    unrotatedPoint[0] / input.instanceTransform.scale[0],
    unrotatedPoint[1] / input.instanceTransform.scale[1],
    unrotatedPoint[2] / input.instanceTransform.scale[2],
  ] as const;
  const unrotatedNormal = inverseRotate(input.instanceTransform.rotation, input.worldNormal);
  const localNormal = [
    unrotatedNormal[0] * input.instanceTransform.scale[0],
    unrotatedNormal[1] * input.instanceTransform.scale[1],
    unrotatedNormal[2] * input.instanceTransform.scale[2],
  ] as const;
  const normalLength = Math.hypot(...localNormal);
  const ray = [
    input.worldPosition[0] - input.cameraOrigin[0],
    input.worldPosition[1] - input.cameraOrigin[1],
    input.worldPosition[2] - input.cameraOrigin[2],
  ] as const;
  const distance = Math.hypot(...ray);
  if (normalLength <= 0.000001 || distance <= 0.000001) return null;
  const unitLocalNormal = localNormal.map(value => value / normalLength) as unknown as readonly [number, number, number];
  const voxel: VoxelCoord = {
    x: Math.floor(localPoint[0] - unitLocalNormal[0] * 0.0001),
    y: Math.floor(localPoint[1] - unitLocalNormal[1] * 0.0001),
    z: Math.floor(localPoint[2] - unitLocalNormal[2] * 0.0001),
  };
  return {
    direction: ray.map(value => value / distance) as unknown as readonly [number, number, number],
    maxDistance: distance + 1,
    rendererHint: {
      localVoxel: voxel,
      localFace: faceFromLocalNormal(unitLocalNormal),
    },
  };
}
