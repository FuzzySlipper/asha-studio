import {
  createSelectEntityIntent,
  type StudioIntent,
  type StudioWorkspaceReadModel,
} from '@asha-studio/domain';

export interface EntitySelectionTarget {
  readonly entityId: string;
}

export function resolveEntitySelectionIntent(
  readModel: StudioWorkspaceReadModel,
  target: EntitySelectionTarget,
): StudioIntent {
  return createSelectEntityIntent(readModel, target.entityId);
}
