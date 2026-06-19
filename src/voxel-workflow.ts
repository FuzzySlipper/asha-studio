import { initialEditorContext, previewTargets, proposeCommand, reduce } from '@asha/editor-tools';
import type { EditorContext, VoxelSelection } from '@asha/editor-tools';
import type { CameraHandle, VoxelCommand, VoxelCoord, VoxelSelectionSnapshot, VoxelValue } from '@asha/contracts';

import type { StudioCompatibilityEvidence, StudioDiagnostic } from './compatibility';
import type { StudioArtifactRef, StudioCommandResult, StudioCommandTimelineEntry } from './session-workspace';

export interface StudioVoxelCell {
  readonly coord: VoxelCoord;
  readonly before: VoxelValue;
  readonly preview: VoxelValue | null;
  readonly after: VoxelValue;
  readonly selected: boolean;
  readonly changed: boolean;
}

export interface StudioVoxelWorkflowEvidence {
  readonly schemaVersion: 1;
  readonly artifactKind: 'voxel_workflow_evidence';
  readonly artifactId: string;
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly selectedVoxel: VoxelCoord;
  readonly selectedFace: VoxelSelection['face'];
  readonly editAnchor: VoxelCoord;
  readonly commandId: 'authority.voxel.apply_brush';
  readonly previewCommandId: 'preview.voxel_brush';
  readonly selectionCommandId: 'selection.voxel_from_screen_point';
  readonly typedVoxelCommands: readonly VoxelCommand[];
  readonly acceptedCommandCount: number;
  readonly rejectedCommandCount: number;
  readonly authorityBeforeHash: string;
  readonly authorityAfterHash: string;
  readonly previewTargets: readonly VoxelCoord[];
  readonly changedVoxels: readonly VoxelCoord[];
  readonly meshEvidence: {
    readonly beforeOccupiedCount: number;
    readonly afterOccupiedCount: number;
    readonly beforeSummary: string;
    readonly afterSummary: string;
  };
  readonly renderEvidence: {
    readonly beforeRenderHash: string;
    readonly afterRenderHash: string;
    readonly visualState: 'changed';
    readonly summary: string;
  };
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly compatibility: StudioCompatibilityEvidence;
}

export interface StudioVoxelWorkflowModel {
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly editor: EditorContext;
  readonly selection: VoxelSelectionSnapshot;
  readonly proposal: VoxelCommand;
  readonly previewTargets: readonly VoxelCoord[];
  readonly beforeGrid: readonly StudioVoxelCell[];
  readonly afterGrid: readonly StudioVoxelCell[];
  readonly evidence: StudioVoxelWorkflowEvidence;
  readonly timelineEntries: readonly StudioCommandTimelineEntry[];
  readonly commandResults: readonly StudioCommandResult[];
  readonly artifactRefs: readonly StudioArtifactRef[];
}

type MutableGrid = Map<string, VoxelValue>;

const EMPTY: VoxelValue = { kind: 'empty' };
const MATERIAL_ONE: VoxelValue = { kind: 'solid', material: 1 };
const SELECTED_VOXEL: VoxelCoord = { x: 0, y: 0, z: 0 };
const SELECTED_FACE: VoxelSelection['face'] = 'posX';
const EDIT_ANCHOR: VoxelCoord = { x: 1, y: 0, z: 0 };
const GRID_COORDS: readonly VoxelCoord[] = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 2, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 1, y: 1, z: 0 },
  { x: 2, y: 1, z: 0 },
  { x: 0, y: 2, z: 0 },
  { x: 1, y: 2, z: 0 },
  { x: 2, y: 2, z: 0 },
];

function coordKey(coord: VoxelCoord): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

function sameCoord(a: VoxelCoord, b: VoxelCoord): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

function valueLabel(value: VoxelValue): string {
  return value.kind === 'solid' ? `solid:${value.material}` : 'empty';
}

function hashGrid(grid: MutableGrid): string {
  const payload = [...grid.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([coord, value]) => `${coord}=${valueLabel(value)}`).join('|');
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `grid-fnv1a-${hash.toString(16).padStart(8, '0')}`;
}

function cloneGrid(grid: MutableGrid): MutableGrid {
  return new Map([...grid.entries()].map(([coord, value]) => [coord, value]));
}

function initialGrid(): MutableGrid {
  const grid = new Map<string, VoxelValue>();
  for (const coord of GRID_COORDS) grid.set(coordKey(coord), EMPTY);
  grid.set(coordKey(SELECTED_VOXEL), MATERIAL_ONE);
  return grid;
}

function applyVoxelCommand(grid: MutableGrid, command: VoxelCommand): { readonly accepted: boolean; readonly changed: readonly VoxelCoord[]; readonly diagnostic: StudioDiagnostic | null } {
  if (command.op === 'generateChunk') {
    return {
      accepted: false,
      changed: [],
      diagnostic: {
        severity: 'error',
        code: 'asha-studio.voxel.generate_chunk_unavailable',
        message: 'generateChunk is not part of the Studio V1 inspect/select/preview/apply workflow.',
        owningLane: 'asha-studio',
        source: 'src/voxel-workflow.ts',
        remediation: 'Use setVoxel or fillRegion from the public VoxelCommand contract for this workflow.',
      },
    };
  }
  if (command.op === 'setVoxel') {
    grid.set(coordKey(command.coord), command.value);
    return { accepted: true, changed: [command.coord], diagnostic: null };
  }
  const changed: VoxelCoord[] = [];
  for (let z = command.min.z; z < command.max.z; z += 1) {
    for (let y = command.min.y; y < command.max.y; y += 1) {
      for (let x = command.min.x; x < command.max.x; x += 1) {
        const coord = { x, y, z };
        grid.set(coordKey(coord), command.value);
        changed.push(coord);
      }
    }
  }
  return { accepted: changed.length > 0, changed, diagnostic: null };
}

function buildSelectionSnapshot(): VoxelSelectionSnapshot {
  return {
    pickRay: {
      camera: 1 as CameraHandle,
      tick: 0,
      grid: 0,
      screenPoint: { x: 0.5, y: 0.5, space: 'normalized_0_1' },
      origin: [-2, 0, 0],
      direction: [1, 0, 0],
      maxDistance: 16,
      cameraProjectionHash: 'projection-hash-voxel-basic',
      rayHash: 'ray-hash-voxel-basic-center',
    },
    outcome: 'hit',
    selectedVoxel: SELECTED_VOXEL,
    selectedFace: SELECTED_FACE,
    editAnchor: EDIT_ANCHOR,
    selectionHash: 'selection-hash-voxel-basic-0-0-0-posX',
  };
}

function buildEditorContext(): EditorContext {
  let editor = initialEditorContext(0);
  editor = reduce(editor, { type: 'setTool', tool: 'place' });
  editor = reduce(editor, { type: 'setMaterial', material: 1 });
  editor = reduce(editor, { type: 'setSelection', selection: { voxel: SELECTED_VOXEL, face: SELECTED_FACE } });
  return editor;
}

function gridCells(beforeGrid: MutableGrid, afterGrid: MutableGrid, preview: readonly VoxelCoord[]): readonly StudioVoxelCell[] {
  return GRID_COORDS.map((coord) => {
    const before = beforeGrid.get(coordKey(coord)) ?? EMPTY;
    const after = afterGrid.get(coordKey(coord)) ?? EMPTY;
    const inPreview = preview.some((target) => sameCoord(target, coord));
    return {
      coord,
      before,
      preview: inPreview ? MATERIAL_ONE : null,
      after,
      selected: sameCoord(coord, SELECTED_VOXEL),
      changed: valueLabel(before) !== valueLabel(after),
    };
  });
}

function artifactRef(sessionId: string): StudioArtifactRef {
  return {
    artifactId: 'artifact-voxel-workflow-0001',
    artifactKind: 'state_evidence',
    pathKind: 'inline_summary',
    path: `voxel_workflow:${sessionId}`,
    mediaType: 'application/json',
    contentHash: null,
    byteLength: null,
    producedBySequenceId: 'seq-0007',
    summary: 'Voxel inspect/select/preview/apply structured before/after evidence.',
  };
}

function timelineEntry(args: {
  readonly sequenceId: string;
  readonly commandId: StudioCommandTimelineEntry['commandId'];
  readonly label: string;
  readonly menuPath: readonly string[];
  readonly requestedBy: StudioCommandTimelineEntry['requestedBy'];
  readonly operationClass: StudioCommandTimelineEntry['operationClass'];
  readonly inputSummary: string;
  readonly outputSummary: string;
  readonly authorityChanged?: boolean;
  readonly editorChanged?: boolean;
  readonly renderChanged?: boolean;
  readonly artifactsWritten?: boolean;
  readonly artifactRefs?: readonly StudioArtifactRef[];
}): StudioCommandTimelineEntry {
  const second = Number(args.sequenceId.slice(-4));
  const iso = `1970-01-01T00:00:0${second}.000Z`;
  return {
    schemaVersion: 1,
    sequenceId: args.sequenceId,
    commandId: args.commandId,
    label: args.label,
    menuPath: args.menuPath,
    requestedBy: args.requestedBy,
    requestedAtIso: iso,
    completedAtIso: iso,
    status: 'ok',
    operationClass: args.operationClass,
    inputSummary: args.inputSummary,
    outputSummary: args.outputSummary,
    changed: {
      authorityChanged: args.authorityChanged ?? false,
      editorChanged: args.editorChanged ?? false,
      renderChanged: args.renderChanged ?? false,
      workspaceChanged: false,
      artifactsWritten: args.artifactsWritten ?? false,
    },
    diagnostics: [],
    artifactRefs: args.artifactRefs ?? [],
  };
}

function commandResult(entry: StudioCommandTimelineEntry, compatibility: StudioCompatibilityEvidence, artifacts: readonly StudioArtifactRef[]): StudioCommandResult {
  return {
    schemaVersion: 1,
    artifactKind: 'command_result',
    commandId: entry.commandId,
    commandVersion: 1,
    sequenceId: entry.sequenceId,
    batchId: null,
    sessionId: 'session-preview-0001',
    requestedBy: entry.requestedBy,
    status: entry.status,
    operationClass: entry.operationClass,
    changed: entry.changed,
    state: {
      authorityBeforeHash: null,
      authorityAfterHash: null,
      editorBeforeVersion: 'editor.v0.voxel-before',
      editorAfterVersion: 'editor.v0.voxel-after',
      renderBeforeHash: null,
      renderAfterHash: null,
      selectedBefore: null,
      selectedAfter: null,
      replay: { replayArtifactId: null, replayPath: null, replayHash: null, replayMode: 'unavailable', summary: 'unavailable: runtime bridge replay integration is deferred.' },
      compatibility,
    },
    output: null,
    outputSummary: entry.outputSummary,
    diagnostics: entry.diagnostics,
    artifacts,
    retry: { safe: entry.operationClass !== 'authority_mutating', classification: entry.operationClass === 'authority_mutating' ? 'safe_to_retry_if_state_hash_unchanged' : 'safe_to_retry', reason: entry.operationClass === 'authority_mutating' ? 'Retry only if authority hash is unchanged.' : 'Safe deterministic read/editor operation.', requiredReadback: entry.operationClass === 'authority_mutating' ? 'state_hash' : null },
    undo: null,
    timing: { queuedAtIso: entry.requestedAtIso, startedAtIso: entry.requestedAtIso, completedAtIso: entry.completedAtIso, durationMs: 0 },
  };
}

export function createVoxelWorkflowModel(options: {
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly compatibility: StudioCompatibilityEvidence;
}): StudioVoxelWorkflowModel {
  const beforeAuthority = initialGrid();
  const afterAuthority = cloneGrid(beforeAuthority);
  const editor = buildEditorContext();
  const selection = buildSelectionSnapshot();
  const preview = previewTargets(editor);
  const proposal = proposeCommand(editor);
  if (proposal === null) throw new Error('Expected voxel workflow proposal for selected place tool.');
  const applied = applyVoxelCommand(afterAuthority, proposal);
  const diagnostics = applied.diagnostic === null ? [] : [applied.diagnostic];
  const beforeHash = hashGrid(beforeAuthority);
  const afterHash = hashGrid(afterAuthority);
  const changed = applied.changed;
  const artifact = artifactRef(options.sessionId);
  const evidence: StudioVoxelWorkflowEvidence = {
    schemaVersion: 1,
    artifactKind: 'voxel_workflow_evidence',
    artifactId: artifact.artifactId,
    sessionId: options.sessionId,
    scenarioId: options.scenarioId,
    selectedVoxel: SELECTED_VOXEL,
    selectedFace: SELECTED_FACE,
    editAnchor: EDIT_ANCHOR,
    commandId: 'authority.voxel.apply_brush',
    previewCommandId: 'preview.voxel_brush',
    selectionCommandId: 'selection.voxel_from_screen_point',
    typedVoxelCommands: [proposal],
    acceptedCommandCount: applied.accepted ? 1 : 0,
    rejectedCommandCount: applied.accepted ? 0 : 1,
    authorityBeforeHash: beforeHash,
    authorityAfterHash: afterHash,
    previewTargets: preview,
    changedVoxels: changed,
    meshEvidence: {
      beforeOccupiedCount: [...beforeAuthority.values()].filter((value) => value.kind === 'solid').length,
      afterOccupiedCount: [...afterAuthority.values()].filter((value) => value.kind === 'solid').length,
      beforeSummary: '1 occupied voxel before apply.',
      afterSummary: `${[...afterAuthority.values()].filter((value) => value.kind === 'solid').length} occupied voxel(s) after apply.`,
    },
    renderEvidence: {
      beforeRenderHash: `render-${beforeHash}`,
      afterRenderHash: `render-${afterHash}`,
      visualState: 'changed',
      summary: `Preview/apply visibly fills voxel (${EDIT_ANCHOR.x}, ${EDIT_ANCHOR.y}, ${EDIT_ANCHOR.z}).`,
    },
    diagnostics,
    compatibility: options.compatibility,
  };
  const timelineEntries = [
    timelineEntry({ sequenceId: 'seq-0004', commandId: 'inspection.voxel', label: 'Inspect Voxel', menuPath: ['Inspect', 'Voxel'], requestedBy: 'gui', operationClass: 'read_only', inputSummary: 'voxel=(0,0,0)', outputSummary: 'occupied material=1 at selected voxel' }),
    timelineEntry({ sequenceId: 'seq-0005', commandId: 'selection.voxel_from_screen_point', label: 'Select Voxel From Screen Point', menuPath: ['Select', 'Voxel From Screen Point'], requestedBy: 'agent', operationClass: 'editor_local', inputSummary: 'screen=(0.5,0.5)', outputSummary: 'selected voxel=(0,0,0) face=posX editAnchor=(1,0,0)', editorChanged: true }),
    timelineEntry({ sequenceId: 'seq-0006', commandId: 'preview.voxel_brush', label: 'Preview Voxel Brush', menuPath: ['Edit', 'Preview Voxel Brush'], requestedBy: 'gui', operationClass: 'editor_local', inputSummary: 'place material=1 at editAnchor=(1,0,0)', outputSummary: 'preview target count=1; authority unchanged', editorChanged: true }),
    timelineEntry({ sequenceId: 'seq-0007', commandId: 'authority.voxel.apply_brush', label: 'Apply Voxel Brush', menuPath: ['Edit', 'Apply Voxel Brush'], requestedBy: 'agent', operationClass: 'authority_mutating', inputSummary: 'VoxelCommand.setVoxel grid=0 coord=(1,0,0) material=1', outputSummary: `accepted=${evidence.acceptedCommandCount}; before=${beforeHash}; after=${afterHash}`, authorityChanged: true, artifactsWritten: true, artifactRefs: [artifact] }),
  ];
  return {
    sessionId: options.sessionId,
    scenarioId: options.scenarioId,
    editor,
    selection,
    proposal,
    previewTargets: preview,
    beforeGrid: gridCells(beforeAuthority, beforeAuthority, preview),
    afterGrid: gridCells(beforeAuthority, afterAuthority, preview),
    evidence,
    timelineEntries,
    commandResults: timelineEntries.map((entry) => commandResult(entry, options.compatibility, entry.artifactRefs)),
    artifactRefs: [artifact],
  };
}
