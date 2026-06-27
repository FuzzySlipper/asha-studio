import { computed, Injectable, signal } from '@angular/core';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  applySelectedEntityReadModel,
  buildInitialWorkspaceReadModel,
  createSelectEntityIntent,
  type StudioWorkspaceReadModel,
} from '@asha-studio/domain';

@Injectable({ providedIn: 'root' })
export class StudioWorkspaceStore {
  private readonly workspaceState = signal<StudioWorkspaceReadModel>(
    buildInitialWorkspaceReadModel(),
  );

  readonly workspace = this.workspaceState.asReadonly();

  readonly selectedEntity = computed(() => {
    const workspace = this.workspaceState();
    return (
      workspace.entities.find(entity => entity.id === workspace.selectedEntityId) ??
      null
    );
  });

  readonly selectedRenderable = computed(() => {
    const workspace = this.workspaceState();
    return (
      workspace.scene.renderables.find(
        renderable => renderable.renderableId === workspace.scene.selectedRenderableId,
      ) ?? null
    );
  });

  readonly assetRenderables = computed(() => {
    const workspace = this.workspaceState();
    return workspace.scene.renderables.filter(renderable => renderable.kind === 'static_mesh');
  });

  readonly latestTimelineEntry = computed(() => {
    const workspace = this.workspaceState();
    return workspace.timeline.at(-1) ?? null;
  });

  readonly readbackMarker = computed(() => {
    const workspace = this.workspaceState();
    return `${workspace.session.sessionId}:${workspace.scene.sceneHash}:${workspace.timelineSequence}`;
  });

  selectEntity(entityId: string): void {
    const workspace = this.workspaceState();
    const intent = createSelectEntityIntent(workspace, entityId);
    const dispatchResult = mapStudioIntentToCommand(intent);

    if (!dispatchResult.accepted || dispatchResult.proposal === null) {
      return;
    }

    this.workspaceState.set(
      applySelectedEntityReadModel(workspace, dispatchResult.proposal.entityId),
    );
  }
}
