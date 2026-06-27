import { computed, Injectable, signal } from '@angular/core';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  applySelectedEntityReadModel,
  buildInitialWorkspaceReadModel,
  buildStudioViewportAdapterReadModel,
  buildStudioViewportCameraReadModel,
  buildStudioViewportToolReadModel,
  createSelectEntityIntent,
  frameStudioViewportCamera,
  orbitStudioViewportCamera,
  panStudioViewportCamera,
  zoomStudioViewportCamera,
  type StudioViewportCameraControlDelta,
  type StudioViewportCameraReadModel,
  type StudioViewportToolMode,
  type StudioViewportToolReadModel,
  type StudioWorkspaceReadModel,
} from '@asha-studio/domain';

@Injectable({ providedIn: 'root' })
export class StudioWorkspaceStore {
  private readonly workspaceState = signal<StudioWorkspaceReadModel>(
    buildInitialWorkspaceReadModel(),
  );
  private readonly viewportCameraState = signal<StudioViewportCameraReadModel>(
    buildStudioViewportCameraReadModel(),
  );
  private readonly viewportToolState = signal<StudioViewportToolReadModel>(
    buildStudioViewportToolReadModel(),
  );

  readonly workspace = this.workspaceState.asReadonly();
  readonly viewportCamera = this.viewportCameraState.asReadonly();
  readonly viewportTool = this.viewportToolState.asReadonly();

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

  readonly viewportAdapter = computed(() =>
    buildStudioViewportAdapterReadModel({
      scene: this.workspaceState().scene,
      camera: this.viewportCameraState(),
      tool: this.viewportToolState(),
    }),
  );

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

  setViewportTool(activeTool: StudioViewportToolMode): void {
    this.viewportToolState.set(buildStudioViewportToolReadModel(activeTool));
  }

  setViewportCamera(camera: StudioViewportCameraReadModel): void {
    this.viewportCameraState.set(camera);
  }

  orbitViewportCamera(delta: StudioViewportCameraControlDelta): void {
    this.viewportCameraState.set(orbitStudioViewportCamera(this.viewportCameraState(), delta));
  }

  panViewportCamera(delta: StudioViewportCameraControlDelta): void {
    this.viewportCameraState.set(panStudioViewportCamera(this.viewportCameraState(), delta));
  }

  zoomViewportCamera(wheelDeltaY: number): void {
    this.viewportCameraState.set(zoomStudioViewportCamera(this.viewportCameraState(), wheelDeltaY));
  }

  frameViewportCamera(): void {
    this.viewportCameraState.set(frameStudioViewportCamera(this.workspaceState().scene));
  }
}
