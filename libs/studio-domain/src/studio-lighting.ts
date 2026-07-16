import {
  renderHandle,
  sceneNodeId,
  type FlatSceneDocument,
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
