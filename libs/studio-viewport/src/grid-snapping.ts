import type { EditorGridDescriptor } from '@asha/contracts';
import {
  snapSpatialGridPoint,
  type TransformManipulatorCandidate,
} from '@asha/editor-tools';

export function applyStudioTranslationGridSnap(
  candidate: TransformManipulatorCandidate,
  grid: EditorGridDescriptor,
  enabled: boolean,
  fine = false,
): TransformManipulatorCandidate {
  if (!enabled) return candidate;
  const spatialGrid = fine
    ? {
        ...grid.grid,
        spacing: grid.grid.spacing.map(value => value * 0.1) as [number, number, number],
      }
    : grid.grid;
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
