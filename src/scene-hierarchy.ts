import type { StudioSessionMetadata } from './compatibility';
import type { StudioModelMaterialPreviewModel } from './model-material-preview';
import type { StudioScenarioSummary } from './session-workspace';
import type { StudioViewportEditorPanelModel } from './viewport-editor-panel';
import type { StudioVoxelWorkflowModel } from './voxel-workflow';

export type StudioSceneHierarchyBadge = 'projected' | 'authority-backed' | 'preview-only' | 'selected';

export interface StudioSceneHierarchyNode {
  readonly id: string;
  readonly label: string;
  readonly kind: 'session' | 'scenario' | 'grid' | 'entity' | 'voxel' | 'material' | 'model';
  readonly depth: 0 | 1 | 2 | 3;
  readonly badges: readonly StudioSceneHierarchyBadge[];
  readonly evidenceSource: string;
  readonly summary: string;
}

export interface StudioSceneHierarchyLegendItem {
  readonly badge: StudioSceneHierarchyBadge;
  readonly label: string;
  readonly meaning: string;
}

export interface StudioSceneHierarchyModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'scene_hierarchy_projection';
  readonly automationLabel: 'studio-scene-hierarchy-dock';
  readonly title: 'Scene / Hierarchy';
  readonly projectionMode: 'studio_state_projection';
  readonly nodes: readonly StudioSceneHierarchyNode[];
  readonly legend: readonly StudioSceneHierarchyLegendItem[];
  readonly automationMarkers: readonly string[];
  readonly knownLimitations: readonly string[];
}

const LEGEND: readonly StudioSceneHierarchyLegendItem[] = [
  { badge: 'projected', label: 'projected', meaning: 'Derived from Studio workspace/readout state, not a product asset database.' },
  { badge: 'authority-backed', label: 'authority-backed', meaning: 'Backed by a typed authority/result hash or accepted command result.' },
  { badge: 'preview-only', label: 'preview-only', meaning: 'Editor-local projection before authority acceptance.' },
  { badge: 'selected', label: 'selected', meaning: 'Current persistent editor selection/tool context.' },
] as const;

export function createStudioSceneHierarchyModel(options: {
  readonly session: StudioSessionMetadata;
  readonly scenario: StudioScenarioSummary;
  readonly voxelWorkflow: StudioVoxelWorkflowModel;
  readonly modelMaterialPreview: StudioModelMaterialPreviewModel;
  readonly viewportEditor: StudioViewportEditorPanelModel;
}): StudioSceneHierarchyModel {
  const { session, scenario, voxelWorkflow, modelMaterialPreview, viewportEditor } = options;
  const selected = viewportEditor.selectedTarget;
  const changedCount = viewportEditor.appliedState.changedVoxelCount;
  const previewCount = viewportEditor.previewState.changedVoxelCount;
  const nodes: readonly StudioSceneHierarchyNode[] = [
    {
      id: `session:${session.sessionId}`,
      label: `Session ${session.sessionId}`,
      kind: 'session',
      depth: 0,
      badges: ['projected'],
      evidenceSource: 'StudioSessionMetadata',
      summary: `${session.runtimeMode} workspace; scenario ${session.scenarioId}; compatibility ${session.compatibility.contractsVersion}.`,
    },
    {
      id: `scenario:${scenario.scenarioId}`,
      label: scenario.label,
      kind: 'scenario',
      depth: 1,
      badges: ['projected', 'authority-backed'],
      evidenceSource: 'StudioWorkspaceModel.scenario',
      summary: `Scenario ${scenario.status}; command timeline projected from shared workspace evidence.`,
    },
    {
      id: `grid:${voxelWorkflow.evidence.scenarioId}`,
      label: `Voxel grid ${voxelWorkflow.evidence.scenarioId}`,
      kind: 'grid',
      depth: 1,
      badges: ['projected', 'authority-backed'],
      evidenceSource: 'StudioVoxelWorkflowEvidence.meshEvidence',
      summary: `${voxelWorkflow.evidence.meshEvidence.afterOccupiedCount} occupied after apply; authority ${voxelWorkflow.evidence.authorityAfterHash}.`,
    },
    {
      id: `entity:${modelMaterialPreview.artifact.selectedModelAsset}`,
      label: 'Reference model preview entity',
      kind: 'entity',
      depth: 2,
      badges: ['projected'],
      evidenceSource: 'StudioModelMaterialPreviewModel.artifact',
      summary: `${modelMaterialPreview.artifact.rendererClassification}; ${modelMaterialPreview.artifact.readiness}.`,
    },
    {
      id: `voxel:${selected.selectedVoxel}`,
      label: `Selected voxel ${selected.selectedVoxel}`,
      kind: 'voxel',
      depth: 2,
      badges: ['selected', 'authority-backed'],
      evidenceSource: 'StudioViewportEditorPanelModel.selectedTarget',
      summary: `Face ${selected.selectedFace}; ${changedCount} authority-backed changed voxel(s).`,
    },
    {
      id: `preview:${selected.editAnchor}`,
      label: `Preview ghost ${selected.editAnchor}`,
      kind: 'voxel',
      depth: 3,
      badges: ['preview-only'],
      evidenceSource: 'StudioViewportEditorPanelModel.previewState',
      summary: `${previewCount} preview target(s); authority remains ${viewportEditor.previewState.authorityHash}.`,
    },
    {
      id: `material:${selected.materialAsset}`,
      label: selected.materialAsset,
      kind: 'material',
      depth: 3,
      badges: ['projected', 'selected'],
      evidenceSource: 'StudioModelMaterialPreviewModel.artifact.selectedMaterialAsset',
      summary: `Material context selected through public-contract reference preview evidence.`,
    },
    {
      id: `model:${selected.modelAsset}`,
      label: selected.modelAsset,
      kind: 'model',
      depth: 3,
      badges: ['projected'],
      evidenceSource: 'StudioModelMaterialPreviewModel.artifact.selectedModelAsset',
      summary: `Model context is a reference projection; runtime bridge authority is linked through proof:runtime-bridge.`,
    },
  ];
  return {
    schemaVersion: 1,
    artifactKind: 'scene_hierarchy_projection',
    automationLabel: 'studio-scene-hierarchy-dock',
    title: 'Scene / Hierarchy',
    projectionMode: 'studio_state_projection',
    nodes,
    legend: LEGEND,
    automationMarkers: [
      'studio-scene-hierarchy-dock',
      'scene-hierarchy-tree-readout',
      'scene-hierarchy-node-session',
      'scene-hierarchy-node-grid',
      'scene-hierarchy-node-selected-voxel',
      'scene-hierarchy-node-preview-ghost',
      'scene-hierarchy-legend',
    ],
    knownLimitations: [
      'Hierarchy is a deterministic projection of Studio workspace evidence, not an ECS or product asset database.',
      'Hierarchy nodes intentionally avoid game-specific/Minecraft assumptions and private ASHA internals.',
    ],
  };
}
