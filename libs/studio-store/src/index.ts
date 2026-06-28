import { computed, inject, Injectable, signal } from '@angular/core';
import { mapStudioIntentToCommand } from '@asha-studio/command-dispatch';
import {
  addReferenceRenderableReadModel,
  applySelectedEntityReadModel,
  buildAssetBrowserCategories,
  buildStudioPreferencesReadModel,
  buildInitialWorkspaceReadModel,
  buildStudioViewportAdapterReadModel,
  buildStudioViewportCameraReadModel,
  buildStudioViewportToolReadModel,
  clearStudioWorkspaceReadModel,
  createSelectEntityIntent,
  createStudioCompactAgentReadout,
  frameStudioViewportCamera,
  frameStudioViewportCameraOnRenderable,
  filterAssetBrowserRenderables,
  loadScenarioReadModel,
  orbitStudioViewportCamera,
  panStudioViewportCamera,
  restoreStudioWorkspaceArtifact,
  serializeStudioWorkspaceArtifact,
  setHierarchyExpansionReadModel,
  updateStudioRenderSetting,
  zoomStudioViewportCamera,
  type StudioAssetBrowserCategory,
  type StudioPreferencesReadModel,
  type StudioRenderSettingKey,
  type StudioViewportCameraControlDelta,
  type StudioViewportCameraReadModel,
  type StudioViewportHitReadModel,
  type StudioViewportToolMode,
  type StudioViewportToolReadModel,
  type StudioWorkspaceReadModel,
} from '@asha-studio/domain';

const WORKSPACE_STORAGE_KEY = 'asha-studio.workspace.v1';

function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class StudioPreferencesStore {
  private readonly preferencesState = signal<StudioPreferencesReadModel>(
    buildStudioPreferencesReadModel(),
  );

  readonly preferences = this.preferencesState.asReadonly();
  readonly renderSettings = computed(() => this.preferencesState().render);

  setPreferences(preferences: StudioPreferencesReadModel): void {
    this.preferencesState.set(preferences);
  }

  setRenderSetting(key: StudioRenderSettingKey, value: boolean): void {
    this.preferencesState.set(updateStudioRenderSetting(this.preferencesState(), key, value));
  }
}

@Injectable({ providedIn: 'root' })
export class StudioWorkspaceStore {
  private readonly preferencesStore = inject(StudioPreferencesStore);
  private readonly workspaceState = signal<StudioWorkspaceReadModel>(
    buildInitialWorkspaceReadModel(),
  );
  private readonly viewportCameraState = signal<StudioViewportCameraReadModel>(
    buildStudioViewportCameraReadModel(),
  );
  private readonly viewportToolState = signal<StudioViewportToolReadModel>(
    buildStudioViewportToolReadModel(),
  );
  private readonly savedWorkspaceState = signal<string | null>(
    browserStorage()?.getItem(WORKSPACE_STORAGE_KEY) ?? null,
  );
  private readonly assetBrowserCategoryState = signal<StudioAssetBrowserCategory>('all');
  private readonly viewportHitState = signal<StudioViewportHitReadModel | null>(null);
  private readonly menuMessageState = signal('Workspace ready.');

  readonly workspace = this.workspaceState.asReadonly();
  readonly viewportCamera = this.viewportCameraState.asReadonly();
  readonly viewportTool = this.viewportToolState.asReadonly();
  readonly preferences = this.preferencesStore.preferences;
  readonly renderSettings = this.preferencesStore.renderSettings;
  readonly savedWorkspace = this.savedWorkspaceState.asReadonly();
  readonly assetBrowserCategory = this.assetBrowserCategoryState.asReadonly();
  readonly viewportHit = this.viewportHitState.asReadonly();
  readonly menuMessage = this.menuMessageState.asReadonly();

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
    return filterAssetBrowserRenderables(
      workspace.scene.renderables,
      this.assetBrowserCategoryState(),
    );
  });

  readonly assetBrowserCategories = computed(() =>
    buildAssetBrowserCategories(this.workspaceState().scene.renderables),
  );

  readonly assetBrowserSummary = computed(() => {
    const category = this.assetBrowserCategoryState();
    const matchingCategory = this.assetBrowserCategories().find(item => item.category === category);
    return `${matchingCategory?.label ?? 'Assets'} · ${this.assetRenderables().length}`;
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
      renderSettings: this.preferencesStore.renderSettings(),
    }),
  );

  readonly compactAgentReadout = computed(() =>
    createStudioCompactAgentReadout({
      workspace: this.workspaceState(),
      renderSettings: this.preferencesStore.renderSettings(),
      latestViewportHit: this.viewportHitState(),
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

  selectViewportHit(hit: StudioViewportHitReadModel): void {
    this.viewportHitState.set(hit);
    this.selectEntity(hit.renderableId);
    const voxelLabel =
      hit.voxelCoord === null
        ? 'no voxel'
        : `voxel ${hit.voxelCoord.x},${hit.voxelCoord.y},${hit.voxelCoord.z}`;
    this.menuMessageState.set(`Selected ${hit.renderableId} · ${hit.face} · ${voxelLabel}.`);
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

  frameSelectedRenderable(): void {
    const workspace = this.workspaceState();
    const selectedRenderable =
      workspace.scene.selectedRenderableId === null
        ? null
        : workspace.scene.renderables.find(
            renderable =>
              renderable.renderableId === workspace.scene.selectedRenderableId && renderable.visible,
          ) ?? null;
    this.viewportCameraState.set(
      frameStudioViewportCameraOnRenderable(workspace.scene, workspace.scene.selectedRenderableId),
    );
    this.menuMessageState.set(
      selectedRenderable === null ? 'Scene framed; no selected renderable.' : 'Selected renderable framed.',
    );
  }

  addReferenceRenderable(): void {
    const workspace = addReferenceRenderableReadModel(this.workspaceState());
    this.workspaceState.set(workspace);
    this.viewportCameraState.set(
      frameStudioViewportCameraOnRenderable(workspace.scene, workspace.scene.selectedRenderableId),
    );
    this.menuMessageState.set('Reference placeholder added.');
  }

  setHierarchyExpanded(expanded: boolean): void {
    this.workspaceState.set(setHierarchyExpansionReadModel(this.workspaceState(), expanded));
    this.menuMessageState.set(expanded ? 'Hierarchy expanded.' : 'Hierarchy collapsed.');
  }

  setAssetBrowserCategory(category: StudioAssetBrowserCategory): void {
    this.assetBrowserCategoryState.set(category);
    const matchingCategory = this.assetBrowserCategories().find(item => item.category === category);
    this.menuMessageState.set(`${matchingCategory?.label ?? 'Assets'} filter selected.`);
  }

  loadScenario(scenarioId: string): void {
    const loadResult = loadScenarioReadModel(this.workspaceState(), scenarioId);
    if (!loadResult.ok) {
      this.menuMessageState.set(loadResult.diagnostics.at(0)?.message ?? 'Scenario load failed.');
      return;
    }

    this.workspaceState.set(loadResult.workspace);
    this.viewportHitState.set(null);
    this.viewportCameraState.set(frameStudioViewportCamera(loadResult.workspace.scene));
    this.viewportToolState.set(buildStudioViewportToolReadModel());
    this.assetBrowserCategoryState.set('all');
    this.menuMessageState.set(`Loaded ${loadResult.workspace.session.scenarioLabel}.`);
  }

  newWorkspace(): void {
    this.workspaceState.set(clearStudioWorkspaceReadModel(this.workspaceState()));
    this.viewportHitState.set(null);
    this.viewportCameraState.set(buildStudioViewportCameraReadModel());
    this.viewportToolState.set(buildStudioViewportToolReadModel());
    this.menuMessageState.set('New scene created.');
  }

  saveWorkspaceToSlot(): void {
    const artifactText = serializeStudioWorkspaceArtifact({
      workspace: this.workspaceState(),
      viewportCamera: this.viewportCameraState(),
      viewportTool: this.viewportToolState(),
      preferences: this.preferencesStore.preferences(),
      savedAtIso: new Date().toISOString(),
    });
    this.savedWorkspaceState.set(artifactText);
    browserStorage()?.setItem(WORKSPACE_STORAGE_KEY, artifactText);
    this.menuMessageState.set('Workspace saved to browser slot.');
  }

  loadWorkspaceFromSlot(): void {
    const artifactText =
      this.savedWorkspaceState() ?? browserStorage()?.getItem(WORKSPACE_STORAGE_KEY) ?? null;
    if (artifactText === null) {
      this.menuMessageState.set('No saved workspace slot found.');
      return;
    }

    const restoreResult = restoreStudioWorkspaceArtifact(artifactText);
    if (!restoreResult.ok || restoreResult.artifact === null) {
      this.menuMessageState.set(restoreResult.diagnostics.at(0)?.message ?? 'Workspace load failed.');
      return;
    }

    this.workspaceState.set(restoreResult.artifact.workspace);
    this.viewportCameraState.set(restoreResult.artifact.viewportCamera);
    this.viewportToolState.set(restoreResult.artifact.viewportTool);
    this.preferencesStore.setPreferences(restoreResult.artifact.preferences);
    this.menuMessageState.set('Workspace loaded from browser slot.');
  }

  setRenderSetting(key: StudioRenderSettingKey, value: boolean): void {
    this.preferencesStore.setRenderSetting(key, value);
    this.menuMessageState.set('View preference updated.');
  }
}
