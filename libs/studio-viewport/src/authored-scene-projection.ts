import type { Transform } from '@asha/contracts';
import type { StudioViewportRenderableAdapter } from '@asha-studio/domain';

/**
 * Project a disposable Studio render node from its authoritative authored
 * transform. Voxel geometry is supplied separately by Rust, so its selection
 * proxy continues to use renderer-observed bounds.
 */
export function projectStudioAuthoredRenderableTransform(
  renderable: StudioViewportRenderableAdapter,
): Transform {
  if (renderable.kind !== 'voxel_grid') {
    return renderable.worldTransform;
  }
  const center = {
    x: (renderable.bounds.min.x + renderable.bounds.max.x) / 2,
    y: (renderable.bounds.min.y + renderable.bounds.max.y) / 2,
    z: (renderable.bounds.min.z + renderable.bounds.max.z) / 2,
  };
  const size = {
    x: renderable.bounds.max.x - renderable.bounds.min.x,
    y: renderable.bounds.max.y - renderable.bounds.min.y,
    z: renderable.bounds.max.z - renderable.bounds.min.z,
  };
  return {
    translation: [center.x, center.y, center.z],
    rotation: [0, 0, 0, 1],
    scale: [size.x, 0.04, size.z],
  };
}
