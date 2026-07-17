import type { EditorGridDescriptor, Transform } from '@asha/contracts';
import {
  snapSpatialGridPoint,
  type TransformManipulatorCandidate,
  type TransformManipulatorHandle,
  type TransformManipulatorOrientation,
} from '@asha/editor-tools';
import {
  composeStudioSceneTransform,
  rotateStudioSceneVector,
} from '@asha-studio/domain';

type Axis = 'x' | 'y' | 'z';
type Vec3 = readonly [number, number, number];

export interface StudioTranslationGridSnapConstraint {
  readonly handle: TransformManipulatorHandle;
  readonly orientation: TransformManipulatorOrientation;
  readonly source: Transform;
  readonly parentWorldTransform: Transform | null;
}

const AXIS_INDEX: Readonly<Record<Axis, 0 | 1 | 2>> = { x: 0, y: 1, z: 2 };
const AXIS_VECTOR: Readonly<Record<Axis, Vec3>> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

export function applyStudioTranslationGridSnap(
  candidate: TransformManipulatorCandidate,
  grid: EditorGridDescriptor,
  enabled: boolean,
  fine = false,
  constraint: StudioTranslationGridSnapConstraint | null = null,
): TransformManipulatorCandidate {
  if (!enabled) return candidate;
  const spatialGrid = fine
    ? {
        ...grid.grid,
        spacing: grid.grid.spacing.map(value => value * 0.1) as [number, number, number],
      }
    : grid.grid;
  if (constraint === null || constraint.handle.mode !== 'translate') {
    return {
      ...candidate,
      transform: {
        ...candidate.transform,
        translation: snapSpatialGridPoint(
          spatialGrid,
          candidate.transform.translation,
          grid.snapAnchor,
        ),
      },
    };
  }

  const sourceWorld = constraint.parentWorldTransform === null
    ? constraint.source
    : composeStudioSceneTransform(constraint.parentWorldTransform, constraint.source);
  const candidateWorld = constraint.parentWorldTransform === null
    ? candidate.transform
    : composeStudioSceneTransform(constraint.parentWorldTransform, candidate.transform);
  const activeAxes = handleAxes(constraint.handle);
  const snappedWorldTranslation = constraint.orientation === 'world'
    ? snapWorldAlignedConstraint(
        candidateWorld.translation,
        activeAxes,
        spatialGrid,
        grid.snapAnchor,
      )
    : snapLocalConstraint(
        candidateWorld.translation,
        activeAxes.map(axis => rotateStudioSceneVector(sourceWorld.rotation, AXIS_VECTOR[axis])),
        spatialGrid.origin,
        spatialGrid.spacing,
        grid.snapAnchor,
      );
  return {
    ...candidate,
    transform: {
      ...candidate.transform,
      translation: constraint.parentWorldTransform === null
        ? snappedWorldTranslation
        : inverseTransformPoint(constraint.parentWorldTransform, snappedWorldTranslation),
    },
  };
}

function handleAxes(handle: TransformManipulatorHandle): readonly Axis[] {
  if (handle.kind === 'axis') return [handle.axis];
  if (handle.kind === 'plane') {
    if (handle.plane === 'xy') return ['x', 'y'];
    if (handle.plane === 'xz') return ['x', 'z'];
    return ['y', 'z'];
  }
  return [];
}

function snapWorldAlignedConstraint(
  candidate: Vec3,
  activeAxes: readonly Axis[],
  grid: EditorGridDescriptor['grid'],
  anchor: EditorGridDescriptor['snapAnchor'],
): Vec3 {
  const fullySnapped = snapSpatialGridPoint(grid, candidate, anchor);
  const activeIndexes = new Set(activeAxes.map(axis => AXIS_INDEX[axis]));
  return candidate.map((value, index) => {
    const axisIndex = index as 0 | 1 | 2;
    return activeIndexes.has(axisIndex) ? fullySnapped[axisIndex] : value;
  }) as unknown as Vec3;
}

function snapLocalConstraint(
  candidate: Vec3,
  activeAxes: readonly Vec3[],
  origin: Vec3,
  spacing: Vec3,
  anchor: EditorGridDescriptor['snapAnchor'],
): Vec3 {
  let snapped = candidate;
  for (const axis of activeAxes) {
    const step = 1 / Math.hypot(
      axis[0] / spacing[0],
      axis[1] / spacing[1],
      axis[2] / spacing[2],
    );
    const coordinate = dot(subtract(snapped, origin), axis);
    const snappedCoordinate = anchor === 'cellCenter'
      ? Math.floor(coordinate / step) * step + step * 0.5
      : Math.floor(coordinate / step + 0.5) * step;
    snapped = add(snapped, scale(axis, snappedCoordinate - coordinate));
  }
  return snapped;
}

function inverseTransformPoint(parent: Transform, world: Vec3): Vec3 {
  const translated = subtract(world, parent.translation);
  const inverseRotation: Transform['rotation'] = [
    -parent.rotation[0],
    -parent.rotation[1],
    -parent.rotation[2],
    parent.rotation[3],
  ];
  const unrotated = rotateStudioSceneVector(inverseRotation, translated);
  return [
    unrotated[0] / parent.scale[0],
    unrotated[1] / parent.scale[1],
    unrotated[2] / parent.scale[2],
  ];
}

function dot(left: Vec3, right: Vec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function subtract(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function add(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scale(vector: Vec3, value: number): Vec3 {
  return [vector[0] * value, vector[1] * value, vector[2] * value];
}
