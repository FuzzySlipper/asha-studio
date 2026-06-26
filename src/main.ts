import './styles.css';
import { createStudioShellModel } from './studio-model';
import { renderStudioViewport3dHost } from './viewport3d-host';
import type { StudioViewport3dRenderPhase } from './viewport3d-host';

type StudioShell = ReturnType<typeof createStudioShellModel>;
type StudioPanel = StudioShell['panels'][number];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function markVisual<T extends HTMLElement>(node: T, visualId: string, visualRole: string): T {
  node.dataset.visualId = visualId;
  node.dataset.visualRole = visualRole;
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
  const topBar = markVisual(el('header', 'studio-editor-topbar'), 'studio_app_status_bar', 'studio_app_status_bar');
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
    { text: model.compatibility.contractsVersion, visualId: 'contracts_version_label', visualRole: 'compatibility_label' },
    { text: model.compatibility.commandRegistryVersion, visualId: 'command_registry_version_label', visualRole: 'compatibility_label' },
    { text: `runtime bridge: ${model.compatibility.runtimeBridgeVersion ?? 'missing'}`, visualId: 'runtime_bridge_marker', visualRole: 'compatibility_label' },
    { text: 'native / Agora / GPU: not claimed', visualId: 'no_agora_gpu_native_claim_limitation', visualRole: 'limitation_label' },
    { text: 'boundary: public package roots only', visualId: 'public_package_boundary_label', visualRole: 'limitation_label' },
  ]) {
    chips.append(markVisual(el('span', 'studio-editor-chip', chip.text), chip.visualId, chip.visualRole));
  }
  topBar.append(chips);

  const actions = el('div', 'studio-editor-actions');
  actions.append(markVisual(el('span', 'studio-editor-action', '⧉ Export review artifact'), 'export_review_artifact_button', 'review_artifact_export'));
  actions.append(markVisual(el('span', 'studio-editor-action', '▸ Run proof'), 'run_proof_button', 'proof_runner'));
  topBar.append(actions);
  return topBar;
}

function appendRegionMarker(parent: HTMLElement, visualId: string, visualRole: string): HTMLElement {
  const marker = markVisual(el('div', 'studio-region-legacy-marker'), visualId, visualRole);
  parent.append(marker);
  return marker;
}

function renderRegionNumber(value: string): HTMLElement {
  return el('span', 'studio-region-number', value);
}

function renderRegionTitle(number: string, title: string, summary: string): HTMLElement {
  const header = el('div', 'studio-region-title');
  header.append(renderRegionNumber(number));
  const copy = el('div');
  copy.append(el('h2', undefined, title));
  copy.append(el('p', undefined, summary));
  header.append(copy);
  return header;
}

function renderSixRegionMenuBar(model: StudioShell): HTMLElement {
  const topBar = markVisual(el('header', 'studio-menu-top-bar'), 'studio-menu-top-bar', 'studio_menu_top_bar');
  topBar.setAttribute('aria-label', 'studio-editor-app-status-bar');
  topBar.append(renderRegionNumber('2'));

  const brand = el('div', 'studio-menu-brand');
  brand.append(el('strong', undefined, model.appTitle));
  brand.append(el('span', undefined, `${model.workspace.scenario.label} / ${model.workspace.status}`));
  topBar.append(brand);

  const chips = el('div', 'studio-menu-chips');
  for (const chip of [
    { text: model.compatibility.contractsVersion, visualId: 'contracts_version_label', visualRole: 'compatibility_label' },
    { text: 'command-registry.v0', visualId: 'command_registry_version_label', visualRole: 'compatibility_label', proofText: model.compatibility.commandRegistryVersion },
    { text: 'runtime-bridge.v0', visualId: 'runtime_bridge_marker', visualRole: 'compatibility_label', proofText: `runtime bridge: ${model.compatibility.runtimeBridgeVersion ?? 'missing'}` },
    { text: 'no native/GPU claim', visualId: 'no_agora_gpu_native_claim_limitation', visualRole: 'limitation_label', proofText: 'native / Agora / GPU: not claimed' },
    { text: 'public roots only', visualId: 'public_package_boundary_label', visualRole: 'limitation_label', proofText: 'boundary: public package roots only' },
  ]) {
    const node = markVisual(el('span', 'studio-menu-chip', chip.text), chip.visualId, chip.visualRole);
    if ('proofText' in chip && chip.proofText !== undefined) node.append(el('span', 'studio-sr-marker', chip.proofText));
    chips.append(node);
  }
  topBar.append(chips);

  const actions = el('div', 'studio-menu-actions');
  actions.append(markVisual(el('a', 'studio-menu-action', 'Debug readout'), 'debug_readout_route_button', 'debug_route_link'));
  (actions.lastElementChild as HTMLAnchorElement).href = '?debug=1';
  actions.append(markVisual(el('span', 'studio-menu-action', 'Export'), 'export_review_artifact_button', 'review_artifact_export'));
  actions.append(markVisual(el('span', 'studio-menu-action', 'Run proof'), 'run_proof_button', 'proof_runner'));
  topBar.append(actions);
  return topBar;
}

function renderSixRegionLeftPanel(model: StudioShell): HTMLElement {
  const panel = markVisual(el('aside', 'studio-region studio-left-scene-hierarchy-panel'), 'studio-left-scene-hierarchy-panel', 'studio_left_scene_hierarchy_panel');
  panel.setAttribute('aria-label', 'studio-left-scene-hierarchy-panel');
  const legacy = appendRegionMarker(panel, 'scene_hierarchy', 'scene_hierarchy');
  legacy.append(renderRegionTitle('1', 'Scene / Hierarchy', 'Placeholder tree region. Real hierarchy migration follows this shell pass.'));
  const list = el('ol', 'studio-placeholder-tree');
  for (const item of [
    model.workspace.scenario.label,
    model.workspace.sceneView.renderables[0]?.renderableId ?? 'Selected renderable',
    model.workspace.demoAssetLoad.artifact.loadedAssetId,
  ]) {
    list.append(el('li', undefined, item));
  }
  legacy.append(list);
  legacy.append(el('p', 'studio-region-footnote', 'authority-backed / projected / preview-only'));
  return panel;
}

function renderSixRegionViewportTopBar(model: StudioShell): HTMLElement {
  const toolbar = markVisual(el('section', 'studio-viewport-top-bar'), 'studio-viewport-top-bar', 'studio_viewport_top_bar');
  toolbar.setAttribute('aria-label', 'studio-viewport-top-bar');
  toolbar.append(renderRegionNumber('3'));
  const title = el('div', 'studio-viewport-toolbar-title');
  title.append(el('strong', undefined, 'Viewport toolbar'));
  title.append(el('span', undefined, 'select / orbit / frame / grid / gizmo / shading'));
  toolbar.append(title);
  const chips = el('div', 'studio-viewport-toolbar-chips');
  for (const label of ['Select', 'Orbit', 'Frame', 'Grid on', 'Gizmo on', 'Three.js projection']) {
    chips.append(el('span', 'studio-toolbar-chip', label));
  }
  toolbar.append(chips);
  return toolbar;
}

function renderSixRegionViewportPanel(model: StudioShell, renderPhase: StudioViewport3dRenderPhase): HTMLElement {
  const panel = markVisual(el('section', 'studio-region studio-viewport-scene-panel'), 'studio-viewport-scene-panel', 'studio_viewport_scene_panel');
  panel.setAttribute('aria-label', 'studio-viewport-scene-panel');
  panel.dataset.viewportPhase = renderPhase;
  const legacy = appendRegionMarker(panel, 'central_3d_viewport', 'central_3d_viewport');
  const header = el('div', 'studio-viewport-scene-label');
  header.append(renderRegionTitle('4', 'Viewport / Scene View', 'Dominant unobstructed workspace.'));
  const readout = el('div', 'studio-viewport-compact-readout');
  readout.append(el('span', undefined, 'Viewport — terrain-test-grid'));
  readout.append(el('span', undefined, 'studio-central-reference-viewport-canvas'));
  readout.append(el('span', undefined, 'shading: Three.js local browser projection'));
  readout.append(el('span', undefined, 'visible renderables 6'));
  header.append(readout);
  legacy.append(header);
  const canvas = el('div', 'studio-six-region-viewport-canvas');
  canvas.setAttribute('aria-label', 'studio-central-reference-viewport-canvas');
  canvas.dataset.viewportHost = 'real-browser-3d-canvas';
  canvas.append(renderStudioViewport3dHost(model.workspace.sceneView, { renderPhase, gizmo: model.workspace.transformGizmo }));
  legacy.append(canvas);
  const footer = el('div', 'studio-viewport-proof-strip');
  for (const item of [
    { text: 'runtime proof', visualId: 'viewport_runtime_bridge_authority', proofText: 'runtime bridge: native authority proven by proof:runtime-bridge' },
    { text: 'software_snapshot_reference', visualId: 'software_snapshot_reference_limitation' },
    { text: 'no native/GPU claim', visualId: 'viewport_no_agora_gpu_native_claim_limitation', proofText: 'native / Agora / GPU: not claimed' },
  ]) {
    const chip = markVisual(el('span', 'studio-proof-chip', item.text), item.visualId, 'limitation_label');
    if ('proofText' in item && item.proofText !== undefined) chip.append(el('span', 'studio-sr-marker', item.proofText));
    footer.append(chip);
  }
  legacy.append(footer);
  return panel;
}

function renderSixRegionBottomPanel(model: StudioShell): HTMLElement {
  const panel = markVisual(el('section', 'studio-region studio-bottom-assets-panel'), 'studio-bottom-assets-panel', 'studio_bottom_assets_panel');
  panel.setAttribute('aria-label', 'studio-bottom-assets-panel');
  const legacy = appendRegionMarker(panel, 'command_evidence_dock', 'command_evidence_dock');
  legacy.append(renderRegionTitle('5', 'Assets / Bottom Panel', 'Assets first. Evidence and timeline are compact secondary tabs.'));
  const assets = el('div', 'studio-asset-shelf');
  for (const asset of [
    model.workspace.demoAssetLoad.artifact.loadedAssetId,
    model.workspace.modelMaterialPreview.artifact.selectedModelAsset,
    model.workspace.modelMaterialPreview.artifact.selectedMaterialAsset,
  ]) {
    assets.append(el('span', 'studio-asset-chip', asset));
  }
  legacy.append(assets);
  const tabs = el('div', 'studio-bottom-secondary-tabs');
  tabs.append(markVisual(el('span', 'studio-bottom-tab', 'Command Timeline'), 'command_timeline', 'command_timeline'));
  tabs.append(markVisual(el('span', 'studio-bottom-tab', 'Evidence / Artifacts'), 'evidence_dock', 'evidence_dock'));
  tabs.append(el('span', 'studio-bottom-tab', model.workspace.reviewArtifact.artifactId));
  tabs.append(el('span', 'studio-bottom-tab', model.workspace.exportedReadout.artifactId));
  tabs.append(el('span', 'studio-bottom-tab', 'not a second private command log'));
  legacy.append(tabs);
  return panel;
}

function renderSixRegionRightPanel(model: StudioShell): HTMLElement {
  const panel = markVisual(el('aside', 'studio-region studio-right-inspector-panel'), 'studio-right-inspector-panel', 'studio_right_inspector_panel');
  panel.setAttribute('aria-label', 'studio-right-inspector-panel');
  const legacy = appendRegionMarker(panel, 'selected_target_inspector', 'selected_target_inspector');
  legacy.append(renderRegionTitle('6', 'Inspector', 'Selected target properties placeholder.'));
  const fields = el('dl', 'studio-inspector-placeholder-fields');
  for (const [label, value] of [
    ['Selected', model.workspace.selectedTargetInspector.selectedTarget.selectedVoxel],
    ['Entity', model.workspace.selectedEntityInspector.selectedEntityId],
    ['Material', model.workspace.selectedTargetInspector.selectedTarget.materialAsset],
    ['Authority', model.workspace.selectedTargetInspector.transition.authorityAfterHash],
  ] as const) {
    fields.append(el('dt', undefined, label));
    fields.append(el('dd', undefined, value));
  }
  legacy.append(fields);
  return panel;
}

function renderSixRegionLayout(model: StudioShell, renderPhase: StudioViewport3dRenderPhase): HTMLElement {
  const layout = markVisual(el('div', 'studio-layout-root'), 'studio-layout-root', 'studio_layout_root');
  layout.setAttribute('aria-label', 'studio-layout-root');
  layout.append(renderSixRegionMenuBar(model));
  layout.append(renderSixRegionLeftPanel(model));
  const viewportStack = el('main', 'studio-viewport-stack');
  viewportStack.setAttribute('aria-label', 'studio-editor-central-viewport-dock');
  viewportStack.append(renderSixRegionViewportTopBar(model));
  viewportStack.append(renderSixRegionViewportPanel(model, renderPhase));
  layout.append(viewportStack);
  layout.append(renderSixRegionRightPanel(model));
  layout.append(renderSixRegionBottomPanel(model));
  return layout;
}

function renderSceneHierarchy(model: StudioShell): HTMLElement {
  const hierarchyModel = model.workspace.sceneHierarchy;
  const hierarchy = markVisual(el('section', 'scene-hierarchy-dock'), 'scene_hierarchy', 'scene_hierarchy');
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

function renderEntityBrowser(model: StudioShell): HTMLElement {
  const browser = model.workspace.entityBrowser;
  const section = markVisual(el('section', `entity-browser-dock entity-browser-dock--${browser.readiness}`), 'entity_browser', 'entity_browser');
  section.setAttribute('aria-label', browser.automationLabel);
  section.append(el('h2', undefined, browser.title));
  section.append(el('p', 'panel-summary', `${browser.projectionMode}; ${browser.entityCount} entit(y/ies) from scene-view readback; readiness ${browser.readiness}.`));

  const sync = el('p', 'entity-browser-selection-sync-readout');
  sync.dataset.inSync = String(browser.selection.inSync);
  sync.textContent = `Selection sync (${browser.selection.commandId}): ${browser.selection.selectedEntityId} → viewport ${browser.selection.viewportRenderableId} · ${browser.selection.sequenceId ?? 'no-command'} · inSync ${browser.selection.inSync}`;
  section.append(sync);

  const tree = el('ol', 'entity-browser-tree-readout');
  for (const entity of browser.entities) {
    const row = el('li', `entity-browser-node entity-browser-node--depth-${entity.depth} entity-browser-node-${entity.kind}${entity.selected ? ' entity-browser-node-selected' : ''}${entity.meshRef !== null ? ' entity-browser-node-asset' : ''}`);
    row.dataset.entityId = entity.entityId;
    row.dataset.selected = String(entity.selected);
    row.append(el('span', 'entity-browser-node-label', entity.label));
    row.append(el('span', 'entity-browser-node-id', entity.entityId));
    const badges = el('span', 'entity-browser-badges');
    for (const badge of entity.badges) badges.append(el('span', `entity-browser-badge entity-browser-badge--${badge}`, badge));
    row.append(badges);
    tree.append(row);
  }
  section.append(tree);

  const diagnostics = el('p', 'entity-browser-diagnostics-readout');
  diagnostics.textContent = browser.diagnostics.length === 0
    ? `Diagnostics: none · negative smokes fail closed: ${browser.negativeSmokes.map((smoke) => `${smoke.code}=${smoke.actualOutcome}`).join(' | ')}`
    : `Diagnostics (fail closed): ${browser.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join(' | ')}`;
  section.append(diagnostics);
  return section;
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

function renderViewportReadout(model: StudioShell, renderPhase: StudioViewport3dRenderPhase): HTMLElement {
  const viewportModel = model.workspace.viewportEditor;
  const viewport = markVisual(el('section', 'viewport-editor-panel viewport-reference-projection'), 'central_3d_viewport', 'central_3d_viewport');
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
  canvas.dataset.viewportHost = 'real-browser-3d-canvas';
  canvas.dataset.viewportPhase = renderPhase;
  const meta = el('div', 'viewport-reference-meta');
  for (const label of ['persp · 35mm', 'grid ✓', 'gizmos ✓', 'shading: Three.js local browser projection']) {
    meta.append(el('span', 'viewport-meta-chip', label));
  }
  canvas.append(meta);
  canvas.append(renderStudioViewport3dHost(model.workspace.sceneView, { renderPhase, gizmo: model.workspace.transformGizmo }));

  const overlay = el('div', 'viewport-state-overlay');
  overlay.append(el('p', 'viewport-selected-target-readout', `Selected target: ${viewportModel.selectedTarget.selectedVoxel} · face ${viewportModel.selectedTarget.selectedFace} · edit anchor ${viewportModel.selectedTarget.editAnchor}`));
  overlay.append(el('p', undefined, `Model/material context: ${viewportModel.selectedTarget.modelAsset} · ${viewportModel.selectedTarget.materialAsset}`));
  overlay.append(el('p', 'viewport-preview-state-readout', `Preview: ${viewportModel.previewState.authorityHash}; ${viewportModel.previewState.summary}`));
  overlay.append(el('p', 'viewport-applied-state-readout', `Applied: ${viewportModel.appliedState.authorityHash}; ${viewportModel.appliedState.summary}`));
  overlay.append(el('p', 'viewport-render-hash-readout', `Render hashes: ${viewportModel.previewState.renderHash} → ${viewportModel.appliedState.renderHash}`));
  overlay.append(el('p', 'viewport-camera-tool-readout', `Camera/tool proof: ${model.workspace.sceneView.interactionProof.readiness}; active ${model.workspace.sceneView.interactionProof.toolState.activeTool}; camera ${model.workspace.sceneView.interactionProof.toolState.cameraBeforeHash} → ${model.workspace.sceneView.interactionProof.toolState.cameraAfterHash}`));
  overlay.append(el('p', 'viewport-scripted-actions-readout', `Scripted actions: ${model.workspace.sceneView.interactionProof.scriptedActions.map((action) => `${action.actor}:${action.actionId}:${action.sequenceId}`).join(' | ')}`));
  const gizmo = model.workspace.transformGizmo;
  const gizmoReadout = markVisual(el('div', 'viewport-transform-gizmo-readout'), 'transform_gizmo', 'transform_gizmo');
  gizmoReadout.append(el('p', 'transform-gizmo-title', `Transform Gizmo (${gizmo.edit.commandId}) — ${gizmo.readiness}`));
  gizmoReadout.append(el('p', 'transform-gizmo-translate', `translate ${gizmo.activeAxis} by ${gizmo.transform.delta}: [${gizmo.transform.before.join(', ')}] → [${gizmo.transform.after.join(', ')}] · handles ${gizmo.handles.map((handle) => handle.axis).join('/')}`));
  gizmoReadout.append(el('p', 'transform-gizmo-smokes', `negative smokes (fail closed): ${gizmo.negativeSmokes.map((smoke) => `${smoke.code}=${smoke.actualOutcome}`).join(' | ')}`));
  overlay.append(gizmoReadout);
  const demoAsset = model.workspace.demoAssetLoad.artifact;
  const demoAssetReadout = markVisual(el('div', 'viewport-demo-asset-load-readout'), 'demo_asset_load', 'demo_asset_load');
  demoAssetReadout.append(el('p', 'demo-asset-load-title', `Demo Asset Load (scene.load_asset) — ${demoAsset.readiness}`));
  demoAssetReadout.append(el('p', 'demo-asset-load-provenance', `asset ${demoAsset.loadedAssetId} · package ${demoAsset.packageId} · source ${demoAsset.provenance.sourcePath ?? 'n/a'}`));
  demoAssetReadout.append(el('p', 'demo-asset-load-renderables', `renderables ${demoAsset.renderableIds.join(', ')} · materials ${demoAsset.materialVariants.map((variant) => variant.materialId).join(', ')}`));
  demoAssetReadout.append(el('p', 'demo-asset-load-smokes', `negative smokes (fail closed): ${demoAsset.negativeSmokes.map((smoke) => `${smoke.failureCode}=${smoke.actualOutcome}`).join(' | ')}`));
  overlay.append(demoAssetReadout);
  canvas.append(overlay);
  viewport.append(canvas);

  const footer = el('div', 'viewport-reference-footer');
  for (const limitation of [
    { text: 'projection: software_snapshot_reference', visualId: 'software_snapshot_reference_limitation' },
    { text: 'source: shared workspace/readout state', visualId: 'shared_workspace_source_label' },
    { text: 'runtime bridge: native authority proven by proof:runtime-bridge', visualId: 'viewport_runtime_bridge_authority' },
    { text: 'native / Agora / GPU: not claimed', visualId: 'viewport_no_agora_gpu_native_claim_limitation' },
  ]) {
    footer.append(markVisual(el('span', 'viewport-limitation-chip', limitation.text), limitation.visualId, 'limitation_label'));
  }
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

function renderSelectedEntityInspector(model: StudioShell): HTMLElement {
  const inspectorModel = model.workspace.selectedEntityInspector;
  const inspector = markVisual(el('section', `selected-entity-inspector-dock selected-entity-inspector-dock--${inspectorModel.readiness}`), 'selected_entity_inspector', 'selected_entity_inspector');
  inspector.setAttribute('aria-label', inspectorModel.automationLabel);
  inspector.append(el('h2', undefined, inspectorModel.title));
  inspector.append(el('p', 'panel-summary', `${inspectorModel.projectionMode}; entity ${inspectorModel.selectedEntityId}; readiness ${inspectorModel.readiness}.`));

  const identity = el('div', 'selected-entity-inspector-identity-readout');
  identity.append(el('strong', undefined, inspectorModel.identity.displayName));
  identity.append(el('p', undefined, `${inspectorModel.identity.entityId} · ${inspectorModel.identity.kind} · ${inspectorModel.identity.sourceState}`));
  identity.append(el('p', undefined, `provenance: mesh ${inspectorModel.provenance.meshRef ?? '(none)'} · material ${inspectorModel.provenance.materialRef ?? '(none)'} · selection ${inspectorModel.provenance.selectionSequenceId ?? 'no-command'}`));
  inspector.append(identity);

  const edit = el('p', 'selected-entity-inspector-edit-readout');
  edit.dataset.inSync = String(inspectorModel.edit.inSync);
  edit.dataset.applied = String(inspectorModel.edit.applied);
  edit.textContent = `Edit (${inspectorModel.edit.commandId}) ${inspectorModel.edit.fieldKey}: "${inspectorModel.edit.nameBefore}" → "${inspectorModel.edit.nameAfter}" · ${inspectorModel.edit.sequenceId ?? 'no-command'} · applied ${inspectorModel.edit.applied} · inSync ${inspectorModel.edit.inSync}`;
  inspector.append(edit);

  const fields = el('dl', 'selected-entity-inspector-fields-readout');
  for (const field of inspectorModel.fields) {
    fields.append(el('dt', `selected-entity-inspector-field selected-entity-inspector-field--${field.editable ? 'editable' : 'readonly'}`, `${field.label}${field.editable ? ' ✎' : ''}`));
    fields.append(el('dd', undefined, `${field.value} · source ${field.source}`));
  }
  inspector.append(fields);

  const diagnostics = el('p', 'selected-entity-inspector-diagnostics-readout');
  diagnostics.textContent = inspectorModel.diagnostics.length === 0
    ? `Diagnostics: none · negative smokes fail closed: ${inspectorModel.negativeSmokes.map((smoke) => `${smoke.code}=${smoke.actualOutcome}`).join(' | ')}`
    : `Diagnostics (fail closed): ${inspectorModel.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join(' | ')}`;
  inspector.append(diagnostics);
  return inspector;
}

function renderTransformGizmo(model: StudioShell): HTMLElement {
  const gizmo = model.workspace.transformGizmo;
  const panel = markVisual(el('section', `transform-gizmo-dock transform-gizmo-dock--${gizmo.readiness}`), 'transform_gizmo', 'transform_gizmo');
  panel.setAttribute('aria-label', gizmo.automationLabel);
  panel.append(el('h2', undefined, gizmo.title));
  panel.append(el('p', 'panel-summary', `${gizmo.projectionMode}; entity ${gizmo.selectedEntityId}; ${gizmo.operation} · active axis ${gizmo.activeAxis}; readiness ${gizmo.readiness}.`));

  const selection = el('p', 'transform-gizmo-selection-readout');
  selection.textContent = `Selection: ${gizmo.selection.selectedEntityId} ↔ viewport ${gizmo.selection.viewportRenderableId} · inSync ${gizmo.selection.inSync} · gizmoHash ${gizmo.gizmoHash}`;
  panel.append(selection);

  const handles = el('div', 'transform-gizmo-handle-readout');
  for (const handle of gizmo.handles) {
    const chip = el('span', `transform-gizmo-handle transform-gizmo-handle--${handle.active ? 'active' : 'idle'}`, `${handle.axis.toUpperCase()}${handle.active ? ' ✎' : ''}`);
    chip.dataset.gizmoHandle = handle.axis;
    chip.style.color = handle.color;
    handles.append(chip);
  }
  panel.append(handles);

  const transform = el('p', 'transform-gizmo-transform-readout');
  transform.dataset.applied = String(gizmo.edit.applied);
  transform.dataset.inSync = String(gizmo.edit.inSync);
  transform.textContent = `Translate ${gizmo.activeAxis} by ${gizmo.transform.delta}: [${gizmo.transform.before.join(', ')}] → [${gizmo.transform.after.join(', ')}] · ${gizmo.edit.commandId} · preview ${gizmo.edit.previewSequenceId ?? 'none'} + apply ${gizmo.edit.applySequenceId ?? 'none'} · source ${gizmo.edit.mutationSource} · applied ${gizmo.edit.applied}`;
  panel.append(transform);

  const diagnostics = el('p', 'transform-gizmo-diagnostics-readout');
  diagnostics.textContent = gizmo.diagnostics.length === 0
    ? `Diagnostics: none · negative smokes fail closed: ${gizmo.negativeSmokes.map((smoke) => `${smoke.code}=${smoke.actualOutcome}`).join(' | ')}`
    : `Diagnostics (fail closed): ${gizmo.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join(' | ')}`;
  panel.append(diagnostics);
  return panel;
}

function renderSelectedTargetInspector(model: StudioShell): HTMLElement {
  const inspectorModel = model.workspace.selectedTargetInspector;
  const inspector = markVisual(el('section', 'selected-target-inspector'), 'selected_target_inspector', 'selected_target_inspector');
  inspector.setAttribute('aria-label', inspectorModel.automationLabel);
  inspector.append(el('h2', undefined, inspectorModel.title));
  const header = el('div', 'selected-target-header-card');
  header.append(el('strong', undefined, inspectorModel.selectedTarget.selectedVoxel));
  header.append(el('p', undefined, `${inspectorModel.selectedTarget.modelAsset} · ${inspectorModel.selectedTarget.materialAsset}`));
  header.append(el('p', undefined, `face ${inspectorModel.selectedTarget.selectedFace}; edit anchor ${inspectorModel.selectedTarget.editAnchor}`));
  inspector.append(header);

  const cards = el('div', 'selected-target-card-grid');
  for (const card of [inspectorModel.previewCard, inspectorModel.appliedCard]) {
    const cardNode = markVisual(
      el('article', `selected-target-state-card ${card.label === 'Preview' ? 'selected-target-preview-card' : 'selected-target-applied-card'}`),
      card.label === 'Preview' ? 'preview_state_marker' : 'applied_state_marker',
      card.label === 'Preview' ? 'preview_state_marker' : 'applied_state_marker',
    );
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

function renderCommandEvidenceDock(model: StudioShell): HTMLElement {
  const dockModel = model.workspace.commandEvidenceDock;
  const dock = markVisual(el('section', 'bottom-command-evidence-dock'), 'command_evidence_dock', 'command_evidence_dock');
  dock.setAttribute('aria-label', dockModel.automationLabel);
  dock.append(el('h2', undefined, dockModel.title));
  const tabList = el('div', 'bottom-dock-tabs');
  for (const tab of dockModel.tabs) {
    const tabNode = markVisual(
      el('span', tab.id === 'command_timeline_evidence_log' ? 'bottom-command-timeline-tab' : 'bottom-evidence-artifacts-tab'),
      tab.id === 'command_timeline_evidence_log' ? 'command_timeline' : 'evidence_dock',
      tab.id === 'command_timeline_evidence_log' ? 'command_timeline' : 'evidence_dock',
    );
    tabNode.textContent = `${tab.label} (${tab.rowCount})`;
    tabList.append(tabNode);
  }
  dock.append(tabList);

  const commandPanel = el('section', 'bottom-command-row-list');
  commandPanel.append(el('h3', undefined, 'Command Timeline / Evidence Log'));
  const commandRows = el('ol');
  for (const row of dockModel.commandRows) {
    const rowNode = el('li', 'bottom-command-row');
    rowNode.append(el('strong', undefined, `${row.orderIndex}. ${row.sequenceId} · ${row.label}`));
    rowNode.append(el('span', 'command-id', `${row.commandId} · ${row.status} · ${row.source}`));
    rowNode.append(el('span', 'command-meta', `${row.operationClass} · ${row.requestedAtIso} → ${row.completedAtIso ?? 'pending'}`));
    rowNode.append(el('p', undefined, `${row.inputSummary} → ${row.outputSummary}`));
    rowNode.append(el('p', undefined, `Evidence: ${row.evidenceSummary}`));
    commandRows.append(rowNode);
  }
  commandPanel.append(commandRows);
  dock.append(commandPanel);

  const artifactPanel = el('section', 'bottom-evidence-artifact-list');
  artifactPanel.append(el('h3', undefined, 'Evidence / Artifacts'));
  const artifactRows = el('ul');
  for (const artifact of dockModel.artifactRows) {
    const artifactNode = el('li', 'bottom-artifact-row');
    artifactNode.append(el('strong', undefined, `${artifact.artifactId} · ${artifact.source}`));
    artifactNode.append(el('span', 'command-meta', `${artifact.artifactKind} · ${artifact.mediaType} · seq ${artifact.producedBySequenceId ?? 'n/a'}`));
    artifactNode.append(el('p', undefined, `${artifact.path} · ${artifact.contentHash ?? 'hash pending'}`));
    artifactNode.append(el('p', undefined, artifact.summary));
    artifactRows.append(artifactNode);
  }
  artifactPanel.append(artifactRows);
  for (const limitation of dockModel.knownLimitations) {
    artifactPanel.append(el('p', 'bottom-evidence-browser-limitation', limitation));
  }
  dock.append(artifactPanel);
  return dock;
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

function renderDockFrame(model: StudioShell, renderPhase: StudioViewport3dRenderPhase): HTMLElement {
  const frame = el('div', 'studio-editor-frame');
  frame.setAttribute('aria-label', 'studio-editor-dock-frame');

  const leftDock = el('aside', 'studio-editor-dock studio-editor-left-dock');
  leftDock.setAttribute('aria-label', 'studio-editor-left-scene-hierarchy-dock');
  leftDock.append(renderSceneHierarchy(model));
  leftDock.append(renderEntityBrowser(model));
  leftDock.append(renderPanel(findPanel(model, 'scenario')));
  leftDock.append(renderBoundaryCard(model));
  frame.append(leftDock);

  const centerDock = el('main', 'studio-editor-center-dock');
  centerDock.setAttribute('aria-label', 'studio-editor-central-viewport-dock');
  centerDock.append(renderViewportReadout(model, renderPhase));
  centerDock.append(renderVoxelWorkflow(model));
  frame.append(centerDock);

  const rightDock = el('aside', 'studio-editor-dock studio-editor-right-dock');
  rightDock.setAttribute('aria-label', 'studio-editor-right-inspector-dock');
  rightDock.append(renderSelectedEntityInspector(model));
  rightDock.append(renderTransformGizmo(model));
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
  bottomDock.append(renderCommandEvidenceDock(model));
  bottomDock.append(renderCommandPalette(model));
  bottomDock.append(renderVisualEvidence(model));
  bottomDock.append(renderLimitations(model));
  frame.append(bottomDock);

  return frame;
}

function viewportPhaseFromLocation(): StudioViewport3dRenderPhase {
  const phase = new URLSearchParams(window.location.search).get('viewportPhase');
  return phase === 'before' || phase === 'after' ? phase : 'combined';
}

function visualContractModeFromLocation(): boolean {
  return new URLSearchParams(window.location.search).get('visualContract') === '1';
}

function debugModeFromLocation(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
}

function renderApp(): void {
  const model = createStudioShellModel();
  const app = document.querySelector<HTMLDivElement>('#app');
  if (app === null) {
    throw new Error('Missing #app root');
  }

  const shell = markVisual(el('div', 'studio-shell'), 'asha_studio_shell', 'asha_studio_shell');
  if (visualContractModeFromLocation()) shell.classList.add('studio-shell--visual-contract-proof');
  if (debugModeFromLocation()) {
    shell.classList.add('studio-shell--debug-readout');
    shell.append(renderTopBar(model));
    shell.append(renderDockFrame(model, viewportPhaseFromLocation()));
  } else {
    shell.classList.add('studio-shell--six-region');
    shell.append(renderSixRegionLayout(model, viewportPhaseFromLocation()));
  }
  app.replaceChildren(shell);
}

renderApp();
