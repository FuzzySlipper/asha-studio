import './styles.css';
import { createStudioShellModel } from './studio-model';

type StudioShell = ReturnType<typeof createStudioShellModel>;
type StudioPanel = StudioShell['panels'][number];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPanel(panel: StudioPanel): HTMLElement {
  const section = el('section', `studio-panel studio-panel--${panel.status}`);
  section.setAttribute('aria-label', panel.automationLabel);
  section.dataset.panelId = panel.id;
  section.append(el('h2', undefined, panel.title));
  section.append(el('p', 'panel-summary', panel.summary));
  const badge = el('span', 'panel-status', panel.status);
  section.append(badge);
  return section;
}

function findPanel(model: StudioShell, id: StudioPanel['id']): StudioPanel {
  const panel = model.panels.find((entry) => entry.id === id);
  if (panel === undefined) throw new Error(`Missing studio panel model: ${id}`);
  return panel;
}

function renderTopBar(model: StudioShell): HTMLElement {
  const topBar = el('header', 'studio-editor-topbar');
  topBar.setAttribute('aria-label', 'studio-editor-app-status-bar');
  const brand = el('div', 'studio-editor-brand');
  brand.append(el('span', 'studio-editor-mark', 'A'));
  const titleBlock = el('div');
  titleBlock.append(el('h1', undefined, model.appTitle));
  titleBlock.append(el('p', 'studio-subtitle', 'editor / reference-viewport · public ASHA command/evidence surfaces'));
  brand.append(titleBlock);
  topBar.append(brand);

  const chips = el('div', 'studio-editor-status-chips');
  for (const chip of [
    model.compatibility.contractsVersion,
    model.compatibility.commandRegistryVersion,
    `runtime bridge: ${model.compatibility.runtimeBridgeVersion ?? 'deferred'}`,
    'native / Agora / GPU: not claimed',
    'boundary: public package roots only',
  ]) {
    chips.append(el('span', 'studio-editor-chip', chip));
  }
  topBar.append(chips);

  const actions = el('div', 'studio-editor-actions');
  actions.append(el('span', 'studio-editor-action', '⧉ Export review artifact'));
  actions.append(el('span', 'studio-editor-action', '▸ Run proof'));
  topBar.append(actions);
  return topBar;
}

function renderBoundaryCard(model: StudioShell): HTMLElement {
  const boundary = el('section', 'boundary-card');
  boundary.setAttribute('aria-label', 'studio-boundary-readout');
  boundary.append(el('h2', undefined, 'Public ASHA Boundary'));
  boundary.append(el('p', undefined, `Allowed now: ${model.ashaBoundary.allowedImports.join(', ')}`));
  boundary.append(el('p', undefined, `Deferred public packages: ${model.ashaBoundary.deferredPublicPackages.join(', ')}`));
  boundary.append(el('p', undefined, `Forbidden examples: ${model.ashaBoundary.forbiddenImportExamples.join(', ')}`));
  boundary.append(el('p', undefined, `Compatibility: contracts ${model.compatibility.contractsVersion}; command registry ${model.compatibility.commandRegistryVersion}; runtime bridge ${model.compatibility.runtimeBridgeVersion ?? 'deferred'}; mode ${model.runtimeMode}`));
  boundary.append(el('p', undefined, `Active workspace: ${model.workspace.session.sessionId}; ${model.workspace.scenario.label}; status ${model.workspace.status}`));
  boundary.append(el('p', undefined, `Export readout: ${model.workspace.exportedReadout.artifactId}; ${model.workspace.exportedReadout.commandTimeline.length} timeline entries`));
  for (const diagnostic of model.compatibilityDiagnostics) {
    boundary.append(el('p', 'boundary-diagnostic', `${diagnostic.severity}: ${diagnostic.code} — ${diagnostic.message}`));
  }
  return boundary;
}

function renderViewportReadout(model: StudioShell): HTMLElement {
  const viewport = el('section', 'viewport-editor-panel');
  viewport.setAttribute('aria-label', model.workspace.viewportEditor.automationLabel);
  viewport.append(el('h2', undefined, model.workspace.viewportEditor.title));
  viewport.append(el('p', 'panel-summary', `${model.workspace.viewportEditor.projectionMode}; readiness ${model.workspace.viewportEditor.readiness}`));
  viewport.append(el('p', 'viewport-selected-target-readout', `Selected target: ${model.workspace.viewportEditor.selectedTarget.selectedVoxel} face ${model.workspace.viewportEditor.selectedTarget.selectedFace}; edit anchor ${model.workspace.viewportEditor.selectedTarget.editAnchor}`));
  viewport.append(el('p', undefined, `Model/material context: ${model.workspace.viewportEditor.selectedTarget.modelAsset} · ${model.workspace.viewportEditor.selectedTarget.materialAsset}`));
  viewport.append(el('p', 'viewport-preview-state-readout', `Preview: ${model.workspace.viewportEditor.previewState.authorityHash}; ${model.workspace.viewportEditor.previewState.summary}`));
  viewport.append(el('p', 'viewport-applied-state-readout', `Applied: ${model.workspace.viewportEditor.appliedState.authorityHash}; ${model.workspace.viewportEditor.appliedState.summary}`));
  viewport.append(el('p', undefined, `Render hashes: ${model.workspace.viewportEditor.previewState.renderHash} → ${model.workspace.viewportEditor.appliedState.renderHash}`));
  const viewportTimeline = el('ol', 'viewport-timeline-correlation-readout');
  for (const correlation of model.workspace.viewportEditor.timelineCorrelation) {
    viewportTimeline.append(el('li', undefined, `${correlation.sequenceId}: ${correlation.role} · ${correlation.commandId} · ${correlation.status}`));
  }
  viewport.append(viewportTimeline);
  viewport.append(el('p', undefined, `Evidence refs: ${model.workspace.viewportEditor.evidenceRefs.map((ref) => ref.artifactId).join(', ')}`));
  return viewport;
}

function renderVoxelWorkflow(model: StudioShell): HTMLElement {
  const voxel = el('section', 'voxel-workflow');
  voxel.setAttribute('aria-label', 'studio-voxel-workflow-readout');
  voxel.append(el('h2', undefined, 'Voxel Inspect / Select / Preview / Apply'));
  voxel.append(el('p', undefined, `Selected voxel: (${model.workspace.voxelWorkflow.evidence.selectedVoxel.x}, ${model.workspace.voxelWorkflow.evidence.selectedVoxel.y}, ${model.workspace.voxelWorkflow.evidence.selectedVoxel.z}) · face ${model.workspace.voxelWorkflow.evidence.selectedFace}`));
  voxel.append(el('p', undefined, `Preview target: (${model.workspace.voxelWorkflow.evidence.editAnchor.x}, ${model.workspace.voxelWorkflow.evidence.editAnchor.y}, ${model.workspace.voxelWorkflow.evidence.editAnchor.z}) · command ${model.workspace.voxelWorkflow.evidence.typedVoxelCommands[0]?.op ?? 'none'}`));
  voxel.append(el('p', undefined, `Apply result: accepted ${model.workspace.voxelWorkflow.evidence.acceptedCommandCount}; rejected ${model.workspace.voxelWorkflow.evidence.rejectedCommandCount}; before ${model.workspace.voxelWorkflow.evidence.authorityBeforeHash}; after ${model.workspace.voxelWorkflow.evidence.authorityAfterHash}`));
  const gridReadout = el('div', 'voxel-grid');
  for (const cell of model.workspace.voxelWorkflow.afterGrid) {
    const cellNode = el('span', `voxel-cell${cell.selected ? ' voxel-cell--selected' : ''}${cell.preview !== null ? ' voxel-cell--preview' : ''}${cell.changed ? ' voxel-cell--changed' : ''}`);
    cellNode.textContent = cell.after.kind === 'solid' ? String(cell.after.material) : '·';
    cellNode.title = `(${cell.coord.x},${cell.coord.y},${cell.coord.z}) before=${cell.before.kind} after=${cell.after.kind}`;
    gridReadout.append(cellNode);
  }
  voxel.append(gridReadout);
  return voxel;
}

function renderBatchUndo(model: StudioShell): HTMLElement {
  const batchUndo = el('section', 'batch-undo');
  batchUndo.setAttribute('aria-label', 'studio-command-batch-undo-readout');
  batchUndo.append(el('h2', undefined, 'Command Batch / Undo Metadata'));
  batchUndo.append(el('p', undefined, `Batch: ${model.workspace.commandBatch.invocation.batchId}; mode ${model.workspace.commandBatch.invocation.mode}; status ${model.workspace.commandBatch.result.status}; failure ${model.workspace.commandBatch.result.failureClassification}`));
  batchUndo.append(el('p', undefined, `Batch hashes: ${model.workspace.commandBatch.result.authorityBeforeHash ?? 'missing'} → ${model.workspace.commandBatch.result.authorityAfterHash ?? 'missing'}`));
  batchUndo.append(el('p', undefined, `Retry: ${model.workspace.commandBatch.result.retrySummary}`));
  batchUndo.append(el('p', undefined, `Revert: ${model.workspace.commandBatch.revertWorkflow.status}; requires ${model.workspace.commandBatch.revertWorkflow.requiredSameStateHash}; inverse ${model.workspace.commandBatch.revertWorkflow.inverseCommand?.op ?? 'none'}`));
  const batchList = el('ul');
  for (const command of model.workspace.commandBatch.result.commandResults) {
    batchList.append(el('li', undefined, `${command.commandId}: ${command.status}; retry=${command.retryClassification}; undo=${command.undoPosture}; ${command.summary}`));
  }
  batchUndo.append(batchList);
  return batchUndo;
}

function renderModelMaterialPreview(model: StudioShell): HTMLElement {
  const modelMaterial = el('section', 'model-material-preview');
  modelMaterial.setAttribute('aria-label', 'studio-model-material-preview-readout');
  modelMaterial.append(el('h2', undefined, 'Model / Material Preview'));
  modelMaterial.append(el('p', undefined, `Model: ${model.workspace.modelMaterialPreview.artifact.selectedModelAsset}`));
  modelMaterial.append(el('p', undefined, `Material: ${model.workspace.modelMaterialPreview.artifact.selectedMaterialAsset}`));
  modelMaterial.append(el('p', undefined, `Renderer classification: ${model.workspace.modelMaterialPreview.artifact.rendererClassification}; readiness ${model.workspace.modelMaterialPreview.artifact.readiness}`));
  modelMaterial.append(el('p', undefined, `Render diff ops: ${model.workspace.modelMaterialPreview.artifact.renderFrameDiff.ops.map((op) => op.op).join(', ')}`));
  modelMaterial.append(el('p', undefined, `Preview evidence: ${model.workspace.modelMaterialPreview.artifact.previewArtifactPath} · ${model.workspace.modelMaterialPreview.artifact.previewEvidenceHash}`));
  const surfaceList = el('ul');
  for (const finding of model.workspace.modelMaterialPreview.artifact.surfaceFindings) {
    surfaceList.append(el('li', undefined, `${finding.surface}: ${finding.status} — ${finding.evidence}`));
  }
  modelMaterial.append(surfaceList);
  return modelMaterial;
}

function renderVisualEvidence(model: StudioShell): HTMLElement {
  const evidence = el('section', 'visual-evidence');
  evidence.setAttribute('aria-label', 'studio-visual-evidence-review-export');
  evidence.append(el('h2', undefined, 'Visual Evidence / Review Export'));
  evidence.append(el('p', undefined, `Capture readiness: ${model.workspace.reviewArtifact.captureReadiness}; classification ${model.workspace.visualEvidence[0]?.evidenceClassification ?? 'unavailable'}; mode ${model.workspace.visualEvidence[0]?.captureMode ?? 'unavailable'}`));
  evidence.append(el('p', undefined, `Review artifact: ${model.workspace.reviewArtifact.artifactId}; ${model.workspace.reviewArtifact.reviewSummary}`));
  for (const visualRef of model.workspace.visualEvidence) {
    const visualCard = el('div', 'visual-card');
    visualCard.append(el('strong', undefined, visualRef.artifactId));
    visualCard.append(el('span', 'command-id', visualRef.commandSequenceIds.join(', ')));
    visualCard.append(el('p', undefined, visualRef.summary));
    visualCard.append(el('p', undefined, `Before: ${visualRef.beforeArtifact?.path ?? 'missing'} · ${visualRef.beforeRenderHash ?? 'missing'}`));
    visualCard.append(el('p', undefined, `After: ${visualRef.afterArtifact?.path ?? 'missing'} · ${visualRef.afterRenderHash ?? 'missing'}`));
    evidence.append(visualCard);
  }
  for (const diagnostic of model.workspace.reviewArtifact.diagnostics.filter((item) => item.severity === 'error')) {
    evidence.append(el('p', 'boundary-diagnostic', `${diagnostic.code}: ${diagnostic.message}`));
  }
  return evidence;
}

function renderCommandPalette(model: StudioShell): HTMLElement {
  const palette = el('section', 'command-readout');
  palette.setAttribute('aria-label', 'studio-command-catalog-readout');
  palette.append(el('h2', undefined, `Command Catalog (${model.visibleCommands.length} visible commands)`));
  const list = el('ol');
  for (const command of model.visibleCommands) {
    const item = el('li');
    item.append(el('strong', undefined, command.label));
    item.append(el('span', 'command-id', command.id));
    item.append(el('span', 'command-meta', `${command.operationClass} · ${command.menuPath.join(' / ')}`));
    item.append(el('p', undefined, command.guiMirror.argumentSummary));
    list.append(item);
  }
  palette.append(list);
  return palette;
}

function renderTimeline(model: StudioShell): HTMLElement {
  const timeline = el('section', 'timeline-preview');
  timeline.setAttribute('aria-label', 'studio-command-timeline-readout');
  timeline.append(el('h2', undefined, 'Command Timeline'));
  const timelineList = el('ul');
  for (const entry of model.workspace.timeline) {
    const row = el('li');
    row.append(el('strong', undefined, `${entry.sequenceId} · ${entry.label}`));
    row.append(el('span', 'command-id', `${entry.commandId} · ${entry.requestedBy} · ${entry.status}`));
    row.append(el('span', 'command-meta', `${entry.operationClass} · ${entry.menuPath.join(' / ')}`));
    row.append(el('p', undefined, `${entry.inputSummary} → ${entry.outputSummary}`));
    timelineList.append(row);
  }
  timeline.append(timelineList);
  return timeline;
}

function renderLimitations(model: StudioShell): HTMLElement {
  const limits = el('section', 'limitations');
  limits.setAttribute('aria-label', 'studio-known-limitations');
  limits.append(el('h2', undefined, 'Known Limitations'));
  const limitList = el('ul');
  for (const limitation of model.knownLimitations) {
    limitList.append(el('li', undefined, limitation));
  }
  limits.append(limitList);
  return limits;
}

function renderDockFrame(model: StudioShell): HTMLElement {
  const frame = el('div', 'studio-editor-frame');
  frame.setAttribute('aria-label', 'studio-editor-dock-frame');

  const leftDock = el('aside', 'studio-editor-dock studio-editor-left-dock');
  leftDock.setAttribute('aria-label', 'studio-editor-left-scene-hierarchy-dock');
  leftDock.append(el('h2', undefined, 'Scene / Hierarchy'));
  leftDock.append(el('p', 'panel-summary', 'Placeholder dock for the next hierarchy slice; current session/scenario readout remains visible here.'));
  leftDock.append(renderPanel(findPanel(model, 'scenario')));
  leftDock.append(renderBoundaryCard(model));
  frame.append(leftDock);

  const centerDock = el('main', 'studio-editor-center-dock');
  centerDock.setAttribute('aria-label', 'studio-editor-central-viewport-dock');
  centerDock.append(renderViewportReadout(model));
  centerDock.append(renderVoxelWorkflow(model));
  frame.append(centerDock);

  const rightDock = el('aside', 'studio-editor-dock studio-editor-right-dock');
  rightDock.setAttribute('aria-label', 'studio-editor-right-inspector-dock');
  rightDock.append(el('h2', undefined, 'Inspector / Readout'));
  rightDock.append(el('p', 'panel-summary', 'Placeholder dock for selected target inspector; detailed inspector card lands in a follow-up child task.'));
  rightDock.append(renderPanel(findPanel(model, 'inspector')));
  rightDock.append(renderModelMaterialPreview(model));
  rightDock.append(renderBatchUndo(model));
  frame.append(rightDock);

  const bottomDock = el('section', 'studio-editor-bottom-dock');
  bottomDock.setAttribute('aria-label', 'studio-editor-bottom-command-evidence-dock');
  bottomDock.append(renderPanel(findPanel(model, 'palette')));
  bottomDock.append(renderPanel(findPanel(model, 'timeline')));
  bottomDock.append(renderPanel(findPanel(model, 'evidence')));
  bottomDock.append(renderCommandPalette(model));
  bottomDock.append(renderTimeline(model));
  bottomDock.append(renderVisualEvidence(model));
  bottomDock.append(renderLimitations(model));
  frame.append(bottomDock);

  return frame;
}

function renderApp(): void {
  const model = createStudioShellModel();
  const app = document.querySelector<HTMLDivElement>('#app');
  if (app === null) {
    throw new Error('Missing #app root');
  }

  const shell = el('div', 'studio-shell');
  shell.append(renderTopBar(model));
  shell.append(renderDockFrame(model));
  app.replaceChildren(shell);
}

renderApp();
