import type { EntityId, RenderHandle, SceneNodeId, SceneObjectSnapshot } from '@asha/contracts';
import type { AshaRendererEditorViewportPickHint } from '@asha/renderer-host';

export interface StudioRuntimeViewportPickAnchor {
  readonly handle: RenderHandle;
  readonly sourceEntity: EntityId | null;
  readonly position: readonly [number, number, number];
  readonly normal: readonly [number, number, number];
}

export type StudioViewportPickRoute =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'authored';
      readonly renderableId: string | null;
      readonly position: readonly [number, number, number];
      readonly normal: readonly [number, number, number];
    }
  | {
      readonly kind: 'runtime';
      readonly anchor: StudioRuntimeViewportPickAnchor;
      readonly sceneObjectId: SceneNodeId | null;
    };

function projectedSceneObjectLabel(
  object: SceneObjectSnapshot['objects'][number],
): string {
  return object.label ?? `node ${object.id as number}`;
}

function resolveUniqueRuntimeSceneObject(
  hint: AshaRendererEditorViewportPickHint,
  scene: SceneObjectSnapshot | null,
): SceneNodeId | null {
  if (hint.sourceTrace === null || hint.label === null || scene === null) {
    return null;
  }
  const matches = scene.objects.filter(
    object => projectedSceneObjectLabel(object) === hint.label,
  );
  return matches.length === 1 ? matches[0]?.id ?? null : null;
}

/**
 * Classifies disposable projection evidence without treating it as authority.
 * Runtime object lookup is deliberately fail-closed: a source trace and one
 * unique projected scene-object label are required before issuing a command.
 */
export function resolveStudioViewportPickRoute(
  hint: AshaRendererEditorViewportPickHint | null,
  scene: SceneObjectSnapshot | null,
): StudioViewportPickRoute {
  if (hint === null || hint.channel === 'overlay') {
    return { kind: 'none' };
  }
  if (hint.channel === 'authored') {
    return {
      kind: 'authored',
      renderableId: hint.label,
      position: hint.position,
      normal: hint.normal,
    };
  }
  return {
    kind: 'runtime',
    anchor: {
      handle: hint.handle,
      sourceEntity: hint.sourceTrace?.entity ?? null,
      position: hint.position,
      normal: hint.normal,
    },
    sceneObjectId: resolveUniqueRuntimeSceneObject(hint, scene),
  };
}
