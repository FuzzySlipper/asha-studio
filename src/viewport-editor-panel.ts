import type { StudioModelMaterialPreviewModel } from './model-material-preview';
import type { StudioArtifactRef, StudioCommandTimelineEntry } from './session-workspace';
import type { StudioVoxelWorkflowModel } from './voxel-workflow';
import type { StudioVisualEvidenceRef } from './visual-evidence';

export type StudioViewportPanelReadiness = 'ready' | 'failed_closed';
export type StudioViewportProjectionMode = 'software_snapshot_reference';
export type StudioViewportEditState = 'preview_pending_apply' | 'applied_with_authority_delta';

export interface StudioViewportTimelineCorrelation {
  readonly sequenceId: string;
  readonly commandId: string;
  readonly role: 'inspect' | 'select' | 'preview' | 'apply' | 'capture' | 'export';
  readonly status: StudioCommandTimelineEntry['status'];
  readonly summary: string;
}

export interface StudioViewportTargetReadout {
  readonly kind: 'voxel_with_model_material_context';
  readonly selectedVoxel: string;
  readonly editAnchor: string;
  readonly selectedFace: string;
  readonly modelAsset: string;
  readonly materialAsset: string;
  readonly selectionHash: string;
}

export interface StudioViewportStateProjection {
  readonly label: 'preview' | 'applied';
  readonly editState: StudioViewportEditState;
  readonly authorityHash: string;
  readonly renderHash: string;
  readonly changedVoxelCount: number;
  readonly summary: string;
}

export interface StudioViewportEditorPanelModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'viewport_editor_panel';
  readonly panelId: 'viewport';
  readonly readiness: StudioViewportPanelReadiness;
  readonly projectionMode: StudioViewportProjectionMode;
  readonly automationLabel: 'studio-viewport-editor-panel';
  readonly title: 'Viewport Editor Panel';
  readonly selectedTarget: StudioViewportTargetReadout;
  readonly previewState: StudioViewportStateProjection;
  readonly appliedState: StudioViewportStateProjection;
  readonly timelineCorrelation: readonly StudioViewportTimelineCorrelation[];
  readonly evidenceRefs: readonly StudioArtifactRef[];
  readonly visualEvidenceRefs: readonly string[];
  readonly automationMarkers: readonly string[];
  readonly knownLimitations: readonly string[];
}

function coordLabel(coord: { readonly x: number; readonly y: number; readonly z: number }): string {
  return `(${coord.x}, ${coord.y}, ${coord.z})`;
}

function roleFor(commandId: string): StudioViewportTimelineCorrelation['role'] | null {
  switch (commandId) {
    case 'inspection.voxel':
      return 'inspect';
    case 'selection.voxel_from_screen_point':
      return 'select';
    case 'preview.voxel_brush':
      return 'preview';
    case 'authority.voxel.apply_brush':
      return 'apply';
    case 'render.capture_before_after':
      return 'capture';
    case 'export.agent_readout':
      return 'export';
    default:
      return null;
  }
}

export function createStudioViewportEditorPanelModel(options: {
  readonly voxelWorkflow: StudioVoxelWorkflowModel;
  readonly modelMaterialPreview: StudioModelMaterialPreviewModel;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly visualEvidence: readonly StudioVisualEvidenceRef[];
}): StudioViewportEditorPanelModel {
  const { voxelWorkflow, modelMaterialPreview, timeline, visualEvidence } = options;
  const visual = visualEvidence[0] ?? null;
  const readiness: StudioViewportPanelReadiness = visual?.captureReadiness === 'ready' ? 'ready' : 'failed_closed';
  const timelineCorrelation = timeline
    .map((entry): StudioViewportTimelineCorrelation | null => {
      const role = roleFor(entry.commandId);
      if (role === null) return null;
      return { sequenceId: entry.sequenceId, commandId: entry.commandId, role, status: entry.status, summary: entry.outputSummary };
    })
    .filter((entry): entry is StudioViewportTimelineCorrelation => entry !== null);
  const evidenceRefs: StudioArtifactRef[] = [];
  evidenceRefs.push(...voxelWorkflow.artifactRefs);
  if (visual?.beforeArtifact !== null && visual?.beforeArtifact !== undefined) evidenceRefs.push(visual.beforeArtifact);
  if (visual?.afterArtifact !== null && visual?.afterArtifact !== undefined) evidenceRefs.push(visual.afterArtifact);
  evidenceRefs.push({
    artifactId: modelMaterialPreview.artifact.artifactId,
    artifactKind: 'render_evidence',
    pathKind: 'relative_path',
    path: modelMaterialPreview.artifact.previewArtifactPath,
    mediaType: 'image/svg+xml',
    contentHash: modelMaterialPreview.artifact.previewEvidenceHash,
    byteLength: null,
    producedBySequenceId: timelineCorrelation.find((entry) => entry.role === 'preview')?.sequenceId ?? null,
    summary: 'Model/material reference render-diff preview projected in the viewport panel.',
  });
  const selectedTarget: StudioViewportTargetReadout = {
    kind: 'voxel_with_model_material_context',
    selectedVoxel: coordLabel(voxelWorkflow.evidence.selectedVoxel),
    editAnchor: coordLabel(voxelWorkflow.evidence.editAnchor),
    selectedFace: voxelWorkflow.evidence.selectedFace,
    modelAsset: modelMaterialPreview.artifact.selectedModelAsset,
    materialAsset: modelMaterialPreview.artifact.selectedMaterialAsset,
    selectionHash: voxelWorkflow.selection.selectionHash,
  };
  const previewState: StudioViewportStateProjection = {
    label: 'preview',
    editState: 'preview_pending_apply',
    authorityHash: voxelWorkflow.evidence.authorityBeforeHash,
    renderHash: visual?.beforeRenderHash ?? voxelWorkflow.evidence.renderEvidence.beforeRenderHash,
    changedVoxelCount: voxelWorkflow.evidence.previewTargets.length,
    summary: `Preview highlights ${voxelWorkflow.evidence.previewTargets.length} target voxel(s) without changing authority.`,
  };
  const appliedState: StudioViewportStateProjection = {
    label: 'applied',
    editState: 'applied_with_authority_delta',
    authorityHash: voxelWorkflow.evidence.authorityAfterHash,
    renderHash: visual?.afterRenderHash ?? voxelWorkflow.evidence.renderEvidence.afterRenderHash,
    changedVoxelCount: voxelWorkflow.evidence.changedVoxels.length,
    summary: `Apply accepted ${voxelWorkflow.evidence.acceptedCommandCount} typed VoxelCommand(s) and changed ${voxelWorkflow.evidence.changedVoxels.length} voxel(s).`,
  };
  return {
    schemaVersion: 1,
    artifactKind: 'viewport_editor_panel',
    panelId: 'viewport',
    readiness,
    projectionMode: 'software_snapshot_reference',
    automationLabel: 'studio-viewport-editor-panel',
    title: 'Viewport Editor Panel',
    selectedTarget,
    previewState,
    appliedState,
    timelineCorrelation,
    evidenceRefs,
    visualEvidenceRefs: visualEvidence.map((item) => item.artifactId),
    automationMarkers: [
      'studio-viewport-editor-panel',
      'viewport-selected-target-readout',
      'viewport-preview-state-readout',
      'viewport-applied-state-readout',
      'viewport-timeline-correlation-readout',
    ],
    knownLimitations: [
      'Viewport projection is a Studio-owned software_snapshot reference panel, not native runtime/Agora/hardware renderer evidence.',
      'Preview state is editor-local until the typed authority.voxel.apply_brush command records an authority hash delta.',
    ],
  };
}
