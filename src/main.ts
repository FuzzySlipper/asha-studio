import './styles.css';
import { createStudioShellModel } from './studio-model';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPanel(panel: ReturnType<typeof createStudioShellModel>['panels'][number]): HTMLElement {
  const section = el('section', `studio-panel studio-panel--${panel.status}`);
  section.setAttribute('aria-label', panel.automationLabel);
  section.dataset.panelId = panel.id;
  section.append(el('h2', undefined, panel.title));
  section.append(el('p', 'panel-summary', panel.summary));
  const badge = el('span', 'panel-status', panel.status);
  section.append(badge);
  return section;
}

function renderApp(): void {
  const model = createStudioShellModel();
  const app = document.querySelector<HTMLDivElement>('#app');
  if (app === null) {
    throw new Error('Missing #app root');
  }

  const shell = el('main', 'studio-shell');
  shell.append(el('h1', undefined, model.appTitle));
  shell.append(el('p', 'studio-subtitle', 'Agent-observable visual studio shell over public ASHA command/evidence surfaces.'));

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
  shell.append(boundary);

  const grid = el('div', 'studio-grid');
  for (const panel of model.panels) {
    grid.append(renderPanel(panel));
  }
  shell.append(grid);

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
  shell.append(palette);

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
  shell.append(voxel);

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
  shell.append(timeline);

  const limits = el('section', 'limitations');
  limits.setAttribute('aria-label', 'studio-known-limitations');
  limits.append(el('h2', undefined, 'Known Limitations'));
  const limitList = el('ul');
  for (const limitation of model.knownLimitations) {
    limitList.append(el('li', undefined, limitation));
  }
  limits.append(limitList);
  shell.append(limits);

  app.replaceChildren(shell);
}

renderApp();
