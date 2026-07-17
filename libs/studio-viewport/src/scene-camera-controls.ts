import type { StudioKeyboardBindings } from '@asha-studio/domain';

export interface StudioCameraMovementAxes {
  readonly forward: number;
  readonly right: number;
  readonly up: number;
  readonly boosted: boolean;
}

export function resolveStudioCameraMovementAxes(
  pressedCodes: ReadonlySet<string>,
  bindings: StudioKeyboardBindings,
): StudioCameraMovementAxes {
  return {
    forward: axis(pressedCodes, bindings.moveForward, bindings.moveBackward),
    right: axis(pressedCodes, bindings.moveRight, bindings.moveLeft),
    up: axis(pressedCodes, bindings.moveUp, bindings.moveDown),
    boosted: pressedCodes.has(bindings.boost),
  };
}

export function isStudioCameraMovementCode(
  code: string,
  bindings: StudioKeyboardBindings,
): boolean {
  return Object.values(bindings).includes(code);
}

export function hasStudioCameraMovement(axes: StudioCameraMovementAxes): boolean {
  return axes.forward !== 0 || axes.right !== 0 || axes.up !== 0;
}

function axis(pressedCodes: ReadonlySet<string>, positive: string, negative: string): number {
  return Number(pressedCodes.has(positive)) - Number(pressedCodes.has(negative));
}
