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

function renderSceneHierarchy(model: StudioShell): HTMLElement {
  const hierarchyModel = model.workspace.sceneHierarchy;
  const hierarchy = el('section', 'scene-hierarchy-dock');
  hierarchy.setAttribute('aria-label', hierarchyModel.automationLabel);
  hierarchy.append(el('h2', undefined, hierarchyModel.title));
  hierarchy.append(el('p', 'panel-summary', `${hierarchyModel.projectionMode}; ${hierarchyModel.nodes.length} deterministic node(s) from workspace evidence.`));
  const tree = el('ol', 'scene-hierarchy-tree-readout');
  for (const node of hierarchyModel.nodes) {
    const row = el('li', `scene-hierarchy-node scene-hierarchy-node--depth-${node.depth} scene-hierarchy-node-${node.kind}`);
    row.dataset.nodeId = node.id;
    const label = el('span', 'scene-hierarchy-node-label', node.label);
    row.append(label);
    const badges = el('span', 'scene-hierarchy-badges');
    for (const badge of node.badges) badges.append(el('span', `scene-hierarchy-badge scene-hierarchy-badge--${badge}`, badge));
    row.append(badges);
    row.append(el('span', 'scene-hierarchy-evidence-source', node.evidenceSource));
    row.append(el('p', undefined, node.summary));
    tree.append(row);
  }
  hierarchy.append(tree);
  const legend = el('div', 'scene-hierarchy-legend');
  legend.append(el('h3', undefined, 'State legend'));
  for (const item of hierarchyModel.legend) {
    const entry = el('p');
    entry.append(el('span', `scene-hierarchy-badge scene-hierarchy-badge--${item.badge}`, item.label));
    entry.append(el('span', undefined, ` ${item.meaning}`));
    legend.append(entry);
  }
  hierarchy.append(legend);
  return hierarchy;
}

function renderBoundaryCard(model: StudioShell) {
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
  const viewportModel = model.workspace.viewportEditor;
  const viewport = el('section', 'viewport-editor-panel viewport-reference-projection');
  viewport.setAttribute('aria-label', viewportModel.automationLabel);

  const header = el('div', 'viewport-reference-header');
  const titleBlock = el('div');
  titleBlock.append(el('h2', undefined, 'Viewport Editor Panel'));
  titleBlock.append(el('p', 'viewport-reference-title-marker', 'Viewport — terrain-test-grid'));
  titleBlock.append(el('p', 'panel-summary', `${viewportModel.projectionMode}; readiness ${viewportModel.readiness}; source: shared workspace readout`));
  header.append(titleBlock);
  const toolbar = el('div', 'viewport-reference-toolbar');
  for (const tool of ['⌖ select', '✛ pan', '⟳ orbit', '⤢ frame', '⊞ voxel brush']) {
    toolbar.append(el('span', 'viewport-tool-chip', tool));
  }
  header.append(toolbar);
  viewport.append(header);

  const canvas = el('div', 'viewport-reference-canvas');
  canvas.setAttribute('aria-label', 'studio-central-reference-viewport-canvas');
  const meta = el('div', 'viewport-reference-meta');
  for (const label of ['persp · 35mm', 'grid ✓', 'gizmos ✓', 'shading: flat']) {
    meta.append(el('span', 'viewport-meta-chip', label));
  }
  canvas.append(meta);

  const gridPlane = el('div', 'viewport-grid-plane');
  const appliedBlock = el('div', 'viewport-isometric-block viewport-isometric-block--applied');
  appliedBlock.append(el('span', undefined, viewportModel.selectedTarget.materialAsset.replace('material/', '')));
  gridPlane.append(appliedBlock);
  const selectedTarget = el('div', 'viewport-selection-overlay', `selected ${viewportModel.selectedTarget.selectedVoxel}`);
  gridPlane.append(selectedTarget);
  const previewGhost = el('div', 'viewport-preview-ghost', `preview ghost ${viewportModel.selectedTarget.editAnchor}`);
  gridPlane.append(previewGhost);
  const anchor = el('div', 'viewport-edit-anchor', `edit anchor: ${viewportModel.selectedTarget.selectedFace} face`);
  gridPlane.append(anchor);
  canvas.append(gridPlane);

  const axis = el('div', 'viewport-axis-gizmo');
  axis.append(el('span', 'axis-x', 'X'));
  axis.append(el('span', 'axis-y', 'Y'));
  axis.append(el('span', 'axis-z', 'Z'));
  canvas.append(axis);

  const overlay = el('div', 'viewport-state-overlay');
  overlay.append(el('p', 'viewport-selected-target-readout', `Selected target: ${viewportModel.selectedTarget.selectedVoxel} · face ${viewportModel.selectedTarget.selectedFace} · edit anchor ${viewportModel.selectedTarget.editAnchor}`));
  overlay.append(el('p', undefined, `Model/material context: ${viewportModel.selectedTarget.modelAsset} · ${viewportModel.selectedTarget.materialAsset}`));
  overlay.append(el('p', 'viewport-preview-state-readout', `Preview: ${viewportModel.previewState.authorityHash}; ${viewportModel.previewState.summary}`));
  overlay.append(el('p', 'viewport-applied-state-readout', `Applied: ${viewportModel.appliedState.authorityHash}; ${viewportModel.appliedState.summary}`));
  overlay.append(el('p', 'viewport-render-hash-readout', `Render hashes: ${viewportModel.previewState.renderHash} → ${viewportModel.appliedState.renderHash}`));
  canvas.append(overlay);
  viewport.append(canvas);

  const footer = el('div', 'viewport-reference-footer');
  footer.append(el('span', 'viewport-limitation-chip', 'projection: software_snapshot_reference'));
  footer.append(el('span', 'viewport-limitation-chip', 'source: shared workspace/readout state'));
  footer.append(el('span', 'viewport-limitation-chip', 'runtime bridge: deferred — no live execution claimed'));
  footer.append(el('span', 'viewport-limitation-chip', 'native / Agora / GPU: not claimed'));
  viewport.append(footer);

  const viewportTimeline = el('ol', 'viewport-timeline-correlation-readout');
  for (const correlation of viewportModel.timelineCorrelation) {
    viewportTimeline.append(el('li', undefined, `${correlation.sequenceId}: ${correlation.role} · ${correlation.commandId} · ${correlation.status}`));
  }
  viewport.append(viewportTimeline);
  viewport.append(el('p', undefined, `Evidence refs: ${viewportModel.evidenceRefs.map((ref) => ref.artifactId).join(', ')}`));
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

function renderSelectedTargetInspector(model: StudioShell): HTMLElement {
  const inspectorModel = model.workspace.selectedTargetInspector;
  const inspector = el('section', 'selected-target-inspector');
  inspector.setAttribute('aria-label', inspectorModel.automationLabel);
  inspector.append(el('h2', undefined, inspectorModel.title));
  const header = el('div', 'selected-target-header-card');
  header.append(el('strong', undefined, inspectorModel.selectedTarget.selectedVoxel));
  header.append(el('p', undefined, `${inspectorModel.selectedTarget.modelAsset} · ${inspectorModel.selectedTarget.materialAsset}`));
  header.append(el('p', undefined, `face ${inspectorModel.selectedTarget.selectedFace}; edit anchor ${inspectorModel.selectedTarget.editAnchor}`));
  inspector.append(header);

  const cards = el('div', 'selected-target-card-grid');
  for (const card of [inspectorModel.previewCard, inspectorModel.appliedCard]) {
    const cardNode = el('article', `selected-target-state-card ${card.label === 'Preview' ? 'selected-target-preview-card' : 'selected-target-applied-card'}`);
    cardNode.append(el('h3', undefined, card.label));
    cardNode.append(el('p', undefined, card.posture === 'proposed_by_studio_ts' ? 'Proposed by Studio (TS), projection only.' : 'Validated by Authority (Rust), authoritative state.'));
    cardNode.append(el('p', 'command-id', `${card.commandId} · ${card.sequenceId ?? 'missing sequence'}`));
    cardNode.append(el('p', undefined, `Authority hash: ${card.authorityHash}`));
    cardNode.append(el('p', undefined, `Render hash: ${card.renderHash}`));
    cardNode.append(el('p', undefined, `${card.changedVoxelCount} voxel(s); ${card.summary}`));
    cards.append(cardNode);
  }
  inspector.append(cards);

  const fields = el('dl', 'selected-target-fields-readout');
  for (const field of inspectorModel.fields) {
    fields.append(el('dt', undefined, field.label));
    fields.append(el('dd', undefined, `${field.value} · source ${field.source}`));
  }
  inspector.append(fields);

  const transition = el('section', 'selected-target-transition-readout');
  transition.append(el('h3', undefined, 'Authority transition'));
  transition.append(el('p', undefined, `${inspectorModel.transition.authorityBeforeHash} → ${inspectorModel.transition.authorityAfterHash}`));
  transition.append(el('p', undefined, `accepted ${inspectorModel.transition.acceptedCommandCount}; rejected ${inspectorModel.transition.rejectedCommandCount}`));
  inspector.append(transition);

  const renderProjection = el('section', 'selected-target-render-projection-readout');
  renderProjection.append(el('h3', undefined, 'Render projection'));
  renderProjection.append(el('p', undefined, `${inspectorModel.renderProjection.mode}: ${inspectorModel.renderProjection.beforeRenderHash} → ${inspectorModel.renderProjection.afterRenderHash}`));
  renderProjection.append(el('p', undefined, `Visual evidence: ${inspectorModel.renderProjection.visualEvidenceArtifactId ?? 'missing'}`));
  renderProjection.append(el('p', 'selected-target-limitation-note', inspectorModel.renderProjection.limitation));
  inspector.append(renderProjection);
  return inspector;
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
  leftDock.append(renderSceneHierarchy(model));
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
  rightDock.append(renderSelectedTargetInspector(model));
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
