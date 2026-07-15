import {
  renderHandle,
  sceneNodeId,
  type FlatSceneDocument,
  type LightDescriptor,
  type RenderDiff,
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

const WORK_LIGHT_AMBIENT_HANDLE = renderHandle(7_900_001);
const WORK_LIGHT_DIRECTIONAL_HANDLE = renderHandle(7_900_002);
const AUTHORED_LIGHT_HANDLE_BASE = 7_000_000;

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

  const ops: RenderDiff[] = authoredLights.flatMap((node, index) => {
    if (node.kind.kind !== 'light') return [];
    const transform = worldTransform(document, node.id);
    if (transform === null) return [];
    return [{
      op: 'createLight' as const,
      handle: renderHandle(AUTHORED_LIGHT_HANDLE_BASE + index + 1),
      parent: null,
      light: projectLight(node.kind.sceneLight, transform),
    }];
  });
  return {
    mode,
    frame: { ops },
    authoredLightCount: authoredLights.length,
    activeLightCount: authoredLights.filter(
      node => node.kind.kind === 'light' && node.kind.sceneLight.enabled,
    ).length,
    workLightActive: false,
    shadowCapability: 'supported_with_degradation_readout',
  };
}

function projectLight(light: SceneLight, transform: SceneTransform): LightDescriptor {
  const direction = rotateVector(transform.rotation, [0, 0, -1]);
  switch (light.kind) {
    case 'ambient':
    case 'directional':
      return light.kind === 'ambient' ? { ...light } : { ...light, direction };
    case 'point':
      return { ...light, position: transform.translation };
    case 'spot':
      return { ...light, position: transform.translation, direction };
  }
}

function worldTransform(document: FlatSceneDocument, nodeId: SceneNodeId): SceneTransform | null {
  const byId = new Map(document.nodes.map(node => [node.id as number, node]));
  const chain: SceneTransform[] = [];
  const seen = new Set<number>();
  let current = byId.get(nodeId as number);
  while (current !== undefined) {
    if (seen.has(current.id as number)) return null;
    seen.add(current.id as number);
    chain.push(current.transform);
    if (current.parent === null) break;
    current = byId.get(current.parent as number);
  }
  if (current === undefined) return null;
  return chain.reverse().reduce(composeTransform, IDENTITY);
}

function composeTransform(parent: SceneTransform, local: SceneTransform): SceneTransform {
  const scaled: readonly [number, number, number] = [
    local.translation[0] * parent.scale[0],
    local.translation[1] * parent.scale[1],
    local.translation[2] * parent.scale[2],
  ];
  const rotated = rotateVector(parent.rotation, scaled);
  return {
    translation: [
      parent.translation[0] + rotated[0],
      parent.translation[1] + rotated[1],
      parent.translation[2] + rotated[2],
    ],
    rotation: multiplyQuaternion(parent.rotation, local.rotation),
    scale: [
      parent.scale[0] * local.scale[0],
      parent.scale[1] * local.scale[1],
      parent.scale[2] * local.scale[2],
    ],
  };
}

function multiplyQuaternion(
  left: readonly [number, number, number, number],
  right: readonly [number, number, number, number],
): readonly [number, number, number, number] {
  const [ax, ay, az, aw] = left;
  const [bx, by, bz, bw] = right;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function rotateVector(
  rotation: readonly [number, number, number, number],
  vector: readonly [number, number, number],
): readonly [number, number, number] {
  const length = Math.hypot(...rotation);
  const [x, y, z, w] = rotation.map(value => value / length) as [number, number, number, number];
  const tx = 2 * (y * vector[2] - z * vector[1]);
  const ty = 2 * (z * vector[0] - x * vector[2]);
  const tz = 2 * (x * vector[1] - y * vector[0]);
  return [
    vector[0] + w * tx + (y * tz - z * ty),
    vector[1] + w * ty + (z * tx - x * tz),
    vector[2] + w * tz + (x * ty - y * tx),
  ];
}
