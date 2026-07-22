import type { Transform } from '@asha/contracts';

/** Compose a renderer-realized presentation transform with an authored drag
 * delta. The realized value may include presentation-only model scale that is
 * deliberately absent from the authoritative SceneDocument transform. */
export function projectedPreviewTransform(
  rendered: Transform,
  source: Transform,
  candidate: Transform,
): Transform {
  const inverseSourceRotation = [
    -source.rotation[0],
    -source.rotation[1],
    -source.rotation[2],
    source.rotation[3],
  ] as const;
  const rotationDelta = multiplyRotation(candidate.rotation, inverseSourceRotation);
  return {
    translation: [
      rendered.translation[0] + candidate.translation[0] - source.translation[0],
      rendered.translation[1] + candidate.translation[1] - source.translation[1],
      rendered.translation[2] + candidate.translation[2] - source.translation[2],
    ],
    rotation: normalizeRotation(multiplyRotation(rotationDelta, rendered.rotation)),
    scale: [
      rendered.scale[0] * candidate.scale[0] / source.scale[0],
      rendered.scale[1] * candidate.scale[1] / source.scale[1],
      rendered.scale[2] * candidate.scale[2] / source.scale[2],
    ],
  };
}

function multiplyRotation(
  left: Transform['rotation'],
  right: Transform['rotation'],
): Transform['rotation'] {
  const [ax, ay, az, aw] = left;
  const [bx, by, bz, bw] = right;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function normalizeRotation(rotation: Transform['rotation']): Transform['rotation'] {
  const magnitude = Math.hypot(...rotation);
  return magnitude <= 0.000001
    ? [0, 0, 0, 1]
    : rotation.map(value => value / magnitude) as unknown as Transform['rotation'];
}
