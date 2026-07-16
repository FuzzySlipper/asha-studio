import {
  renderHandle,
  sceneNodeId,
  type FlatSceneDocument,
  type LightDescriptor,
  type RenderFrameDiff,
  type SceneLight,
  type SceneNodeId,
  type SceneTransform,
} from '@asha/contracts';
import {
  applyProposalToDraft,
  proposeAddLight,
  proposeSetLight,
} from '@asha/editor-tools';

export type StudioLightingMode = 'work_light' | 'authored_lights';
export type StudioAuthoredLightKind = SceneLight['kind'];

export interface StudioLightingProjectionReadModel {
  readonly mode: StudioLightingMode;
  readonly frame: RenderFrameDiff;
  readonly authoredLightCount: number;
  readonly activeLightCount: number;
  readonly workLightActive: boolean;
  readonly shadowCapability: 'supported_with_degradation_readout';
}

type StudioVec3 = readonly [number, number, number];
type StudioQuaternion = readonly [number, number, number, number];

const WORK_LIGHT_AMBIENT_HANDLE = renderHandle(7_900_001);
const WORK_LIGHT_DIRECTIONAL_HANDLE = renderHandle(7_900_002);

const IDENTITY: SceneTransform = {
  translation: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
};

export function defaultStudioSceneLight(kind: StudioAuthoredLightKind): SceneLight {
  const common = {
    color: [1, 1, 1] as const,
    enabled: true,
    shadowIntent: 'disabled' as const,
  };
  switch (kind) {
    case 'ambient':
      return { kind, ...common, intensity: 0.35 };
    case 'directional':
      return { kind, ...common, intensity: 1.2 };
    case 'point':
      return { kind, ...common, intensity: 4, range: 14, decay: 2 };
    case 'spot':
      return {
        kind,
        ...common,
        intensity: 5,
        range: 18,
        decay: 2,
        outerAngleRadians: 0.7,
        penumbra: 0.25,
      };
  }
}

export function proposeStudioLightAddition(
  document: FlatSceneDocument,
  kind: StudioAuthoredLightKind,
): { readonly document: FlatSceneDocument; readonly nodeId: SceneNodeId } {
  const nextId = sceneNodeId(document.nodes.reduce(
    (highest, node) => Math.max(highest, node.id as number),
    0,
  ) + 1);
  const root = document.nodes.find(node => node.parent === null)?.id ?? null;
  const childOrder = document.nodes.filter(node => node.parent === root).length;
  const transform: SceneTransform = kind === 'ambient'
    ? IDENTITY
    : { ...IDENTITY, translation: [4, 6, 4] };
  const proposal = proposeAddLight(nextId, defaultStudioSceneLight(kind), {
    parent: root,
    childOrder,
    label: `${kind[0]?.toUpperCase() ?? ''}${kind.slice(1)} Light`,
    transform,
  });
  const versioned: FlatSceneDocument = {
    ...document,
    schemaVersion: Math.max(document.schemaVersion, 2),
    metadata: {
      ...document.metadata,
      authoringFormatVersion: Math.max(document.metadata.authoringFormatVersion, 2),
    },
  };
  return { document: applyProposalToDraft(versioned, proposal), nodeId: nextId };
}

export function proposeStudioLightUpdate(
  document: FlatSceneDocument,
  nodeId: SceneNodeId,
  light: SceneLight,
): FlatSceneDocument {
  return applyProposalToDraft(document, proposeSetLight(nodeId, light));
}

export function buildStudioLightingProjection(
  document: FlatSceneDocument,
  mode: StudioLightingMode,
  authoredLightFrame: RenderFrameDiff,
): StudioLightingProjectionReadModel {
  const authoredLights = document.nodes
    .filter(node => node.kind.kind === 'light')
    .sort((left, right) => (left.id as number) - (right.id as number));
  if (mode === 'work_light') {
    return {
      mode,
      frame: {
        ops: [
          {
            op: 'createLight',
            handle: WORK_LIGHT_AMBIENT_HANDLE,
            parent: null,
            light: {
              kind: 'ambient',
              color: [1, 1, 1],
              intensity: 0.62,
              enabled: true,
              shadowIntent: 'disabled',
            },
          },
          {
            op: 'createLight',
            handle: WORK_LIGHT_DIRECTIONAL_HANDLE,
            parent: null,
            light: {
              kind: 'directional',
              color: [1, 0.96, 0.9],
              intensity: 1.15,
              enabled: true,
              direction: [-0.55, -0.8, -0.45],
              shadowIntent: 'disabled',
            },
          },
        ],
      },
      authoredLightCount: authoredLights.length,
      activeLightCount: 2,
      workLightActive: true,
      shadowCapability: 'supported_with_degradation_readout',
    };
  }

  return {
    mode,
    frame: authoredLightFrame,
    authoredLightCount: authoredLights.length,
    activeLightCount: authoredLightFrame.ops.filter(
      operation => operation.op === 'createLight' && operation.light.enabled,
    ).length,
    workLightActive: false,
    shadowCapability: 'supported_with_degradation_readout',
  };
}

/**
 * Derive one disposable renderer-local authored-light update from the exact
 * Rust-issued descriptor. Stored light properties remain authoritative; only
 * the candidate node pose is projected for the duration of the drag.
 */
export function projectStudioAuthoredLightTransformPreview(
  document: FlatSceneDocument,
  nodeId: SceneNodeId,
  candidate: SceneTransform,
  authoritativeFrame: RenderFrameDiff,
): RenderFrameDiff {
  const lightNodes = document.nodes
    .filter(node => node.kind.kind === 'light')
    .sort((left, right) => (left.id as number) - (right.id as number));
  const lightIndex = lightNodes.findIndex(node => node.id === nodeId);
  const selected = lightNodes[lightIndex];
  if (lightIndex < 0 || selected?.kind.kind !== 'light') return { ops: [] };
  const authoritativeLights = authoritativeFrame.ops.filter(operation => operation.op === 'createLight');
  const authoritative = authoritativeLights[lightIndex];
  if (
    authoritative === undefined
    || authoritativeLights.length !== lightNodes.length
    || authoritative.light.kind !== selected.kind.sceneLight.kind
  ) {
    return { ops: [] };
  }
  const worldTransform = authoredWorldTransform(document, nodeId, candidate);
  if (worldTransform === null) return { ops: [] };
  return {
    ops: [{
      op: 'updateLight',
      handle: authoritative.handle,
      light: lightDescriptorAtTransform(authoritative.light, worldTransform),
    }],
  };
}

function authoredWorldTransform(
  document: FlatSceneDocument,
  nodeId: SceneNodeId,
  candidate: SceneTransform,
): SceneTransform | null {
  const records = new Map(document.nodes.map(node => [node.id as number, node]));
  const chain: typeof document.nodes[number][] = [];
  const seen = new Set<number>();
  let current = records.get(nodeId as number);
  while (current !== undefined) {
    const rawId = current.id as number;
    if (seen.has(rawId)) return null;
    seen.add(rawId);
    chain.push(current);
    current = current.parent === null ? undefined : records.get(current.parent as number);
  }
  if (chain.length === 0 || chain.at(-1)?.parent !== null) return null;
  return chain.reverse().reduce(
    (world, node) => composeSceneTransform(world, node.id === nodeId ? candidate : node.transform),
    IDENTITY,
  );
}

function composeSceneTransform(parent: SceneTransform, local: SceneTransform): SceneTransform {
  const scaled: StudioVec3 = [
    local.translation[0] * parent.scale[0],
    local.translation[1] * parent.scale[1],
    local.translation[2] * parent.scale[2],
  ];
  const translated = rotateVector(parent.rotation, scaled);
  return {
    translation: [
      parent.translation[0] + translated[0],
      parent.translation[1] + translated[1],
      parent.translation[2] + translated[2],
    ],
    rotation: multiplyQuaternion(parent.rotation, local.rotation),
    scale: [
      parent.scale[0] * local.scale[0],
      parent.scale[1] * local.scale[1],
      parent.scale[2] * local.scale[2],
    ],
  };
}

function lightDescriptorAtTransform(
  descriptor: LightDescriptor,
  transform: SceneTransform,
): LightDescriptor {
  const direction = rotateVector(transform.rotation, [0, 0, -1]);
  switch (descriptor.kind) {
    case 'ambient':
      return descriptor;
    case 'directional':
      return { ...descriptor, direction };
    case 'point':
      return { ...descriptor, position: transform.translation };
    case 'spot':
      return { ...descriptor, position: transform.translation, direction };
  }
}

function multiplyQuaternion(left: StudioQuaternion, right: StudioQuaternion): StudioQuaternion {
  const [ax, ay, az, aw] = left;
  const [bx, by, bz, bw] = right;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function rotateVector(rotation: StudioQuaternion, vector: StudioVec3): StudioVec3 {
  const magnitude = Math.hypot(...rotation);
  if (magnitude <= 0.000001) return vector;
  const normalized = rotation.map(value => value / magnitude) as unknown as StudioQuaternion;
  const conjugate: StudioQuaternion = [-normalized[0], -normalized[1], -normalized[2], normalized[3]];
  const rotated = multiplyQuaternion(
    multiplyQuaternion(normalized, [vector[0], vector[1], vector[2], 0]),
    conjugate,
  );
  return [rotated[0], rotated[1], rotated[2]];
}
