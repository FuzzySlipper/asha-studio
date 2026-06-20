import { COMMAND_CATALOG } from '@asha/command-registry';
import type { StudioCommandCatalog, StudioCommandCatalogEntry } from '@asha/command-registry';

import type { StudioCompatibilityEvidence, StudioDiagnostic, StudioRuntimeMode, StudioSessionMetadata } from './compatibility';
import { createStudioWorkspaceModel } from './session-workspace';
import type { StudioWorkspaceModel } from './session-workspace';

export type StudioPanelId = 'scenario' | 'viewport' | 'palette' | 'timeline' | 'inspector' | 'evidence' | 'modelMaterial' | 'batchUndo';

export interface StudioPanelModel {
  readonly id: StudioPanelId;
  readonly title: string;
  readonly summary: string;
  readonly status: 'ready' | 'placeholder' | 'deferred';
  readonly automationLabel: string;
}

export interface StudioShellModel {
  readonly appTitle: 'ASHA Studio';
  readonly repoRole: 'frontend-heavy-public-consumer';
  readonly ashaBoundary: {
    readonly allowedImports: readonly string[];
    readonly forbiddenImportExamples: readonly string[];
    readonly deferredPublicPackages: readonly string[];
  };
  readonly panels: readonly StudioPanelModel[];
  readonly commandCatalog: StudioCommandCatalog;
  readonly visibleCommands: readonly StudioCommandCatalogEntry[];
  readonly timelinePreview: readonly string[];
  readonly knownLimitations: readonly string[];
  readonly runtimeMode: StudioRuntimeMode;
  readonly compatibility: StudioCompatibilityEvidence;
  readonly compatibilityDiagnostics: readonly StudioDiagnostic[];
  readonly sessionMetadata: StudioSessionMetadata;
  readonly workspace: StudioWorkspaceModel;
}

const PANEL_MODELS: readonly StudioPanelModel[] = [
  {
    id: 'scenario',
    title: 'Scenario / Session',
    summary: 'Active mock/reference workspace with a loaded named ASHA studio scenario and shared command timeline.',
    status: 'ready',
    automationLabel: 'studio-panel-scenario-session',
  },
  {
    id: 'viewport',
    title: 'Viewport',
    summary: 'Reserved for public renderer projection and selection evidence; no authority lives here.',
    status: 'placeholder',
    automationLabel: 'studio-panel-viewport',
  },
  {
    id: 'palette',
    title: 'Command Palette / Menu Mirror',
    summary: 'Projects command registry metadata so GUI and agent command surfaces stay aligned.',
    status: 'ready',
    automationLabel: 'studio-panel-command-palette',
  },
  {
    id: 'timeline',
    title: 'Command Timeline',
    summary: 'Visible audit surface for sequence id, actor, status, diagnostics, artifacts, and retry/undo posture.',
    status: 'ready',
    automationLabel: 'studio-panel-command-timeline',
  },
  {
    id: 'inspector',
    title: 'Inspector / Readout',
    summary: 'Shows session, scenario, and latest structured command-result readouts from the shared timeline.',
    status: 'ready',
    automationLabel: 'studio-panel-inspector-readout',
  },
  {
    id: 'evidence',
    title: 'Evidence / Export',
    summary: 'Shows before/after software visual evidence and the fail-closed review export artifact.',
    status: 'ready',
    automationLabel: 'studio-panel-evidence-export',
  },
  {
    id: 'modelMaterial',
    title: 'Model / Material Preview',
    summary: 'Loads a public-contract static mesh/material fixture, previews render-diff metadata, and records missing first-class command surfaces.',
    status: 'ready',
    automationLabel: 'studio-panel-model-material-preview',
  },
  {
    id: 'batchUndo',
    title: 'Batch / Undo Metadata',
    summary: 'Shows atomic/best-effort command batch metadata, per-command transaction results, retry posture, and V1 voxel revert evidence.',
    status: 'ready',
    automationLabel: 'studio-panel-batch-undo',
  },
] as const;

const FORBIDDEN_IMPORT_EXAMPLES = [
  '@asha/native-bridge',
  '@asha/wasm-replay-bridge',
  '@asha/*/src/**',
  'engine Rust crate paths',
  'ASHA TypeScript package internals',
] as const;

export function getVisibleCommands(catalog: StudioCommandCatalog): readonly StudioCommandCatalogEntry[] {
  return catalog.commands.filter((command) => command.guiMirror.required && command.agentExposureKind !== 'hidden');
}

export function buildTimelinePreview(commands: readonly StudioCommandCatalogEntry[]): readonly string[] {
  return commands.slice(0, 6).map((command, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    return `seq-${sequence} · ${command.id} · ${command.operationClass} · ${command.guiMirror.resultSummary}`;
  });
}

export function buildWorkspaceTimelinePreview(workspace: StudioWorkspaceModel): readonly string[] {
  return workspace.timeline.map((entry) => `${entry.sequenceId} · ${entry.requestedBy} · ${entry.commandId} · ${entry.status} · ${entry.outputSummary}`);
}

export function createStudioShellModel(catalog: StudioCommandCatalog = COMMAND_CATALOG): StudioShellModel {
  const visibleCommands = getVisibleCommands(catalog);
  const workspace = createStudioWorkspaceModel({ catalog });
  const sessionMetadata = workspace.session;
  return {
    appTitle: 'ASHA Studio',
    repoRole: 'frontend-heavy-public-consumer',
    ashaBoundary: {
      allowedImports: ['@asha/command-registry', '@asha/contracts', '@asha/editor-tools'],
      forbiddenImportExamples: FORBIDDEN_IMPORT_EXAMPLES,
      deferredPublicPackages: ['@asha/studio-evidence', '@asha/runtime-bridge', '@asha/devtools', '@asha/renderer-three'],
    },
    panels: PANEL_MODELS,
    commandCatalog: catalog,
    visibleCommands,
    timelinePreview: buildWorkspaceTimelinePreview(workspace),
    runtimeMode: sessionMetadata.runtimeMode,
    compatibility: sessionMetadata.compatibility,
    compatibilityDiagnostics: sessionMetadata.diagnostics,
    sessionMetadata,
    workspace,
    knownLimitations: [
      'Runtime bridge command execution is deferred; session/timeline entries are mock/reference structured readouts.',
      'Visual evidence is software_snapshot proof content with stable before/after refs; browser proof capture is available via pnpm run proof:browser.',
      'Agora compositor capture, hardware GPU evidence, and performance evidence are reserved for later capture-backend tasks.',
    ],
  };
}
