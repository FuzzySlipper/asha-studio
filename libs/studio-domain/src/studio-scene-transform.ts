import type {
  FlatSceneDocument,
  SceneNodeId,
  SceneTransform,
} from '@asha/contracts';

export interface StudioSceneNodeTransformContext {
  readonly sceneNodeId: SceneNodeId;
  readonly parentSceneNodeId: SceneNodeId | null;
  readonly localTransform: SceneTransform;
  readonly parentWorldTransform: SceneTransform | null;
  readonly worldTransform: SceneTransform;
}

export interface StudioTransformedUnitBounds {
  readonly min: { readonly x: number; readonly y: number; readonly z: number };
  readonly max: { readonly x: number; readonly y: number; readonly z: number };
}

function multiplyQuaternion(
  left: SceneTransform['rotation'],
  right: SceneTransform['rotation'],
): SceneTransform['rotation'] {
  const [ax, ay, az, aw] = left;
  const [bx, by, bz, bw] = right;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function normalizeQuaternion(
  value: SceneTransform['rotation'],
): SceneTransform['rotation'] {
  const length = Math.hypot(...value);
  if (!Number.isFinite(length) || length <= 0.000001) {
    return [0, 0, 0, 1];
  }
  return value.map(component => component / length) as unknown as SceneTransform['rotation'];
}

function inverseQuaternion(
  value: SceneTransform['rotation'],
): SceneTransform['rotation'] {
  const normalized = normalizeQuaternion(value);
  return [-normalized[0], -normalized[1], -normalized[2], normalized[3]];
}

export function rotateStudioSceneVector(
  rotation: SceneTransform['rotation'],
  vector: SceneTransform['translation'],
): SceneTransform['translation'] {
  const normalized = normalizeQuaternion(rotation);
  const conjugate: SceneTransform['rotation'] = [
    -normalized[0],
    -normalized[1],
    -normalized[2],
    normalized[3],
  ];
  const rotated = multiplyQuaternion(
    multiplyQuaternion(normalized, [vector[0], vector[1], vector[2], 0]),
    conjugate,
  );
  return [rotated[0], rotated[1], rotated[2]];
}

/** Compose an authored local transform beneath its parent in ASHA's Y-up space. */
export function composeStudioSceneTransform(
  parent: SceneTransform,
  local: SceneTransform,
): SceneTransform {
  const scaledTranslation: SceneTransform['translation'] = [
    local.translation[0] * parent.scale[0],
    local.translation[1] * parent.scale[1],
    local.translation[2] * parent.scale[2],
  ];
  const rotatedTranslation = rotateStudioSceneVector(parent.rotation, scaledTranslation);
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

/**
 * Recover an authored local transform from a composed world transform.
 *
 * A zero-scale parent has no inverse, so callers must leave authority
 * untouched instead of manufacturing a local transform in that case.
 */
export function deriveStudioSceneLocalTransform(
  parent: SceneTransform,
  world: SceneTransform,
): SceneTransform | null {
  if (parent.scale.some(value => !Number.isFinite(value) || Math.abs(value) <= 0.000001)) {
    return null;
  }
  const inverseParentRotation = inverseQuaternion(parent.rotation);
  const relativeTranslation: SceneTransform['translation'] = [
    world.translation[0] - parent.translation[0],
    world.translation[1] - parent.translation[1],
    world.translation[2] - parent.translation[2],
  ];
  const unrotatedTranslation = rotateStudioSceneVector(
    inverseParentRotation,
    relativeTranslation,
  );
  return {
    translation: [
      unrotatedTranslation[0] / parent.scale[0],
      unrotatedTranslation[1] / parent.scale[1],
      unrotatedTranslation[2] / parent.scale[2],
    ],
    rotation: normalizeQuaternion(multiplyQuaternion(
      inverseParentRotation,
      world.rotation,
    )),
    scale: [
      world.scale[0] / parent.scale[0],
      world.scale[1] / parent.scale[1],
      world.scale[2] / parent.scale[2],
    ],
  };
}

/**
 * Resolve the exact authored local, parent-world, and world transforms for one
 * node. Invalid/missing/cyclic ancestry has no projection.
 */
export function resolveStudioSceneNodeTransformContext(
  document: FlatSceneDocument,
  sceneNodeId: SceneNodeId,
  candidateLocalTransform?: SceneTransform,
): StudioSceneNodeTransformContext | null {
  const nodes = new Map(document.nodes.map(node => [node.id as number, node]));
  const chain: FlatSceneDocument['nodes'][number][] = [];
  const seen = new Set<number>();
  let current = nodes.get(sceneNodeId as number);
  while (current !== undefined) {
    const currentId = current.id as number;
    if (seen.has(currentId)) return null;
    seen.add(currentId);
    chain.push(current);
    current = current.parent === null ? undefined : nodes.get(current.parent as number);
  }
  if (chain.length === 0 || chain.at(-1)?.parent !== null) return null;

  const rootedChain = chain.reverse();
  let parentWorldTransform: SceneTransform | null = null;
  let worldTransform: SceneTransform | null = null;
  for (const node of rootedChain) {
    const localTransform = node.id === sceneNodeId && candidateLocalTransform !== undefined
      ? candidateLocalTransform
      : node.transform;
    if (node.id === sceneNodeId) parentWorldTransform = worldTransform;
    worldTransform = worldTransform === null
      ? localTransform
      : composeStudioSceneTransform(worldTransform, localTransform);
  }
  const node = nodes.get(sceneNodeId as number);
  if (node === undefined || worldTransform === null) return null;
  return {
    sceneNodeId,
    parentSceneNodeId: node.parent,
    localTransform: candidateLocalTransform ?? node.transform,
    parentWorldTransform,
    worldTransform,
  };
}

/** Build an axis-aligned picking/framing bound around a transformed unit cube. */
export function transformStudioSceneUnitBounds(
  transform: SceneTransform,
): StudioTransformedUnitBounds {
  const corners: SceneTransform['translation'][] = [];
  for (const x of [-0.5, 0.5]) {
    for (const y of [-0.5, 0.5]) {
      for (const z of [-0.5, 0.5]) {
        const scaled: SceneTransform['translation'] = [
          x * transform.scale[0],
          y * transform.scale[1],
          z * transform.scale[2],
        ];
        const rotated = rotateStudioSceneVector(transform.rotation, scaled);
        corners.push([
          transform.translation[0] + rotated[0],
          transform.translation[1] + rotated[1],
          transform.translation[2] + rotated[2],
        ]);
      }
    }
  }
  return {
    min: {
      x: Math.min(...corners.map(corner => corner[0])),
      y: Math.min(...corners.map(corner => corner[1])),
      z: Math.min(...corners.map(corner => corner[2])),
    },
    max: {
      x: Math.max(...corners.map(corner => corner[0])),
      y: Math.max(...corners.map(corner => corner[1])),
      z: Math.max(...corners.map(corner => corner[2])),
    },
  };
}
