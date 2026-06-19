import { COMMAND_CATALOG } from '@asha/command-registry';
import type { StudioCommandCatalog, StudioCommandCatalogEntry } from '@asha/command-registry';

import { createStudioSessionMetadata } from './compatibility';
import type { StudioCompatibilityEvidence, StudioDiagnostic, StudioRuntimeMode, StudioSessionMetadata } from './compatibility';

export type StudioPanelId = 'scenario' | 'viewport' | 'palette' | 'timeline' | 'inspector' | 'evidence';

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
}

const PANEL_MODELS: readonly StudioPanelModel[] = [
  {
    id: 'scenario',
    title: 'Scenario / Session',
    summary: 'Select or load a named ASHA studio scenario before command execution is wired.',
    status: 'placeholder',
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
    status: 'placeholder',
    automationLabel: 'studio-panel-command-timeline',
  },
  {
    id: 'inspector',
    title: 'Inspector / Readout',
    summary: 'Reserved for world, selection, and command-result readouts through public ASHA packages.',
    status: 'placeholder',
    automationLabel: 'studio-panel-inspector-readout',
  },
  {
    id: 'evidence',
    title: 'Evidence / Export',
    summary: 'Reserved for before/after visual evidence and review artifact export.',
    status: 'deferred',
    automationLabel: 'studio-panel-evidence-export',
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

export function createStudioShellModel(catalog: StudioCommandCatalog = COMMAND_CATALOG): StudioShellModel {
  const visibleCommands = getVisibleCommands(catalog);
  const sessionMetadata = createStudioSessionMetadata({
    sessionId: 'session-preview-0001',
    scenarioId: 'scenario-placeholder',
    scenarioLabel: 'Placeholder Studio scenario',
    runtimeMode: 'mock',
    startedAtIso: '1970-01-01T00:00:00.000Z',
    catalog,
  });
  return {
    appTitle: 'ASHA Studio',
    repoRole: 'frontend-heavy-public-consumer',
    ashaBoundary: {
      allowedImports: ['@asha/command-registry'],
      forbiddenImportExamples: FORBIDDEN_IMPORT_EXAMPLES,
      deferredPublicPackages: ['@asha/studio-evidence', '@asha/runtime-bridge', '@asha/editor-tools', '@asha/devtools', '@asha/renderer-three'],
    },
    panels: PANEL_MODELS,
    commandCatalog: catalog,
    visibleCommands,
    timelinePreview: buildTimelinePreview(visibleCommands),
    runtimeMode: sessionMetadata.runtimeMode,
    compatibility: sessionMetadata.compatibility,
    compatibilityDiagnostics: sessionMetadata.diagnostics,
    sessionMetadata,
    knownLimitations: [
      'Shell-only: command execution and runtime session lifecycle are follow-up tasks.',
      'Evidence/export panel is present but waits for @asha/studio-evidence implementation.',
      'Viewport is a public renderer placeholder; screenshots/render artifacts are evidence only, never authority.',
    ],
  };
}
