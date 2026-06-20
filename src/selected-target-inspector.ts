import type { StudioArtifactRef, StudioCommandTimelineEntry } from './session-workspace';
import type { StudioViewportEditorPanelModel, StudioViewportTargetReadout } from './viewport-editor-panel';
import type { StudioVoxelWorkflowModel } from './voxel-workflow';
import type { StudioVisualEvidenceRef } from './visual-evidence';

export interface StudioInspectorStateCard {
  readonly label: 'Preview' | 'Applied';
  readonly posture: 'proposed_by_studio_ts' | 'validated_by_authority_rust';
  readonly commandId: 'preview.voxel_brush' | 'authority.voxel.apply_brush';
  readonly sequenceId: string | null;
  readonly authorityHash: string;
  readonly renderHash: string;
  readonly changedVoxelCount: number;
  readonly summary: string;
}

export interface StudioSelectedTargetInspectorModel {
  readonly schemaVersion: 1;
  readonly artifactKind: 'selected_target_inspector';
  readonly automationLabel: 'studio-selected-target-inspector';
  readonly title: 'Inspector / Selected Target';
  readonly selectedTarget: StudioViewportTargetReadout;
  readonly previewCard: StudioInspectorStateCard;
  readonly appliedCard: StudioInspectorStateCard;
  readonly transition: {
    readonly authorityBeforeHash: string;
    readonly authorityAfterHash: string;
    readonly acceptedCommandCount: number;
    readonly rejectedCommandCount: number;
  };
  readonly renderProjection: {
    readonly mode: 'software_snapshot_reference';
    readonly beforeRenderHash: string;
    readonly afterRenderHash: string;
    readonly visualEvidenceArtifactId: string | null;
    readonly limitation: string;
  };
  readonly fields: readonly { readonly label: string; readonly value: string; readonly source: string }[];
  readonly evidenceRefs: readonly StudioArtifactRef[];
  readonly automationMarkers: readonly string[];
  readonly knownLimitations: readonly string[];
}

function sequenceFor(timeline: readonly StudioCommandTimelineEntry[], commandId: string): string | null {
  return timeline.find((entry) => entry.commandId === commandId)?.sequenceId ?? null;
}

export function createStudioSelectedTargetInspectorModel(options: {
  readonly viewportEditor: StudioViewportEditorPanelModel;
  readonly voxelWorkflow: StudioVoxelWorkflowModel;
  readonly timeline: readonly StudioCommandTimelineEntry[];
  readonly visualEvidence: readonly StudioVisualEvidenceRef[];
}): StudioSelectedTargetInspectorModel {
  const { viewportEditor, voxelWorkflow, timeline, visualEvidence } = options;
  const visual = visualEvidence[0] ?? null;
  const previewCommand = 'preview.voxel_brush';
  const applyCommand = 'authority.voxel.apply_brush';
  return {
    schemaVersion: 1,
    artifactKind: 'selected_target_inspector',
    automationLabel: 'studio-selected-target-inspector',
    title: 'Inspector / Selected Target',
    selectedTarget: viewportEditor.selectedTarget,
    previewCard: {
      label: 'Preview',
      posture: 'proposed_by_studio_ts',
      commandId: previewCommand,
      sequenceId: sequenceFor(timeline, previewCommand),
      authorityHash: viewportEditor.previewState.authorityHash,
      renderHash: viewportEditor.previewState.renderHash,
      changedVoxelCount: viewportEditor.previewState.changedVoxelCount,
      summary: viewportEditor.previewState.summary,
    },
    appliedCard: {
      label: 'Applied',
      posture: 'validated_by_authority_rust',
      commandId: applyCommand,
      sequenceId: sequenceFor(timeline, applyCommand),
      authorityHash: viewportEditor.appliedState.authorityHash,
      renderHash: viewportEditor.appliedState.renderHash,
      changedVoxelCount: viewportEditor.appliedState.changedVoxelCount,
      summary: viewportEditor.appliedState.summary,
    },
    transition: {
      authorityBeforeHash: voxelWorkflow.evidence.authorityBeforeHash,
      authorityAfterHash: voxelWorkflow.evidence.authorityAfterHash,
      acceptedCommandCount: voxelWorkflow.evidence.acceptedCommandCount,
      rejectedCommandCount: voxelWorkflow.evidence.rejectedCommandCount,
    },
    renderProjection: {
      mode: 'software_snapshot_reference',
      beforeRenderHash: visual?.beforeRenderHash ?? voxelWorkflow.evidence.renderEvidence.beforeRenderHash,
      afterRenderHash: visual?.afterRenderHash ?? voxelWorkflow.evidence.renderEvidence.afterRenderHash,
      visualEvidenceArtifactId: visual?.artifactId ?? null,
      limitation: 'Render projection is software_snapshot reference evidence only; no native runtime, Agora, GPU, or performance claim is made.',
    },
    fields: [
      { label: 'Selected voxel', value: viewportEditor.selectedTarget.selectedVoxel, source: 'viewport_editor_panel.selectedTarget' },
      { label: 'Edit anchor / face', value: `${viewportEditor.selectedTarget.editAnchor} · ${viewportEditor.selectedTarget.selectedFace}`, source: 'voxel_workflow.selection' },
      { label: 'Material asset', value: viewportEditor.selectedTarget.materialAsset, source: 'model_material_preview.artifact' },
      { label: 'Model asset', value: viewportEditor.selectedTarget.modelAsset, source: 'model_material_preview.artifact' },
      { label: 'Preview command', value: previewCommand, source: 'command_timeline' },
      { label: 'Apply command', value: applyCommand, source: 'command_timeline' },
    ],
    evidenceRefs: viewportEditor.evidenceRefs,
    automationMarkers: [
      'studio-selected-target-inspector',
      'selected-target-header-card',
      'selected-target-preview-card',
      'selected-target-applied-card',
      'selected-target-fields-readout',
      'selected-target-transition-readout',
      'selected-target-render-projection-readout',
      'selected-target-limitation-note',
    ],
    knownLimitations: [
      'Inspector duplicates no authority state; all values are derived from shared workspace/timeline/readout models.',
      'Preview is proposed by Studio TypeScript and remains projection-only until Authority accepts the typed command.',
      'Render projection is software_snapshot reference evidence, not native renderer or runtime bridge evidence.',
    ],
  };
}
