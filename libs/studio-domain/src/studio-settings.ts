import type { EditorGridDescriptor, SpatialGridSnapAnchor } from '@asha/contracts';
import {
  DEFAULT_EDITOR_GRID_DESCRIPTOR,
  validateEditorGridDescriptor,
} from '@asha/editor-tools';

export const ASHA_STUDIO_PROJECT_SETTINGS_PATH = '.asha/studio-project-settings.json';

export type StudioSceneViewPlane = EditorGridDescriptor['plane'];

export interface StudioProjectSettingsArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'asha_studio_project_settings';
  readonly settingsVersion: 'asha-studio-project-settings.v1';
  readonly project: {
    readonly gameId: string;
    readonly manifestPath: string;
  };
  readonly units: 'meters';
  readonly spatialGrid: {
    readonly coordinateSystem: 'rightHandedYUp';
    readonly origin: readonly [number, number, number];
    readonly spacing: readonly [number, number, number];
    readonly plane: StudioSceneViewPlane;
    readonly snapAnchor: SpatialGridSnapAnchor;
  };
  readonly transformSnapping: {
    readonly rotationDegrees: number;
    readonly scaleIncrement: number;
  };
}

export interface StudioKeyboardBindings {
  readonly moveForward: string;
  readonly moveBackward: string;
  readonly moveLeft: string;
  readonly moveRight: string;
  readonly moveDown: string;
  readonly moveUp: string;
  readonly boost: string;
}

export interface StudioHostUserSettingsArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'asha_studio_host_user_settings';
  readonly settingsVersion: 'asha-studio-host-user-settings.v1';
  readonly projectKey: string;
  readonly sceneView: {
    readonly gridVisible: boolean;
    readonly minorColor: readonly [number, number, number, number];
    readonly majorColor: readonly [number, number, number, number];
    readonly xAxisColor: readonly [number, number, number, number];
    readonly yAxisColor: readonly [number, number, number, number];
    readonly zAxisColor: readonly [number, number, number, number];
    readonly majorLineEvery: number;
    readonly opacity: number;
    readonly fadeStart: number;
    readonly fadeEnd: number;
    readonly cameraMoveSpeed: number;
    readonly cameraBoostMultiplier: number;
    readonly invertLookY: boolean;
    readonly invertPanY?: boolean;
  };
  readonly keyboard: StudioKeyboardBindings;
}

export interface StudioSessionSettingsOverrides {
  readonly gridVisible?: boolean;
  readonly cameraMoveSpeed?: number;
  readonly cameraBoostMultiplier?: number;
  readonly invertLookY?: boolean;
  readonly invertPanY?: boolean;
}

export interface StudioEffectiveSettings {
  readonly coordinateSystem: 'rightHandedYUp';
  readonly units: 'meters';
  readonly grid: EditorGridDescriptor;
  readonly cameraMoveSpeed: number;
  readonly cameraBoostMultiplier: number;
  readonly invertLookY: boolean;
  readonly invertPanY: boolean;
  readonly rotationSnapDegrees: number;
  readonly scaleSnapIncrement: number;
  readonly keyboard: StudioKeyboardBindings;
  readonly sourcePrecedence: readonly ['session', 'host-user', 'project', 'engine'];
}

export type StudioSettingsParseResult<T> =
  | {
      readonly status: 'loaded';
      readonly artifact: T;
      readonly preservedRawText: null;
      readonly diagnostic: null;
    }
  | {
      readonly status: 'unsupported_future_version' | 'invalid';
      readonly artifact: null;
      readonly preservedRawText: string;
      readonly diagnostic: string;
    };

const DEFAULT_KEYBOARD_BINDINGS: StudioKeyboardBindings = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  moveDown: 'KeyQ',
  moveUp: 'KeyE',
  boost: 'ShiftLeft',
};

export function buildDefaultStudioProjectSettings(options: {
  readonly gameId: string;
  readonly manifestPath: string;
}): StudioProjectSettingsArtifact {
  return {
    schemaVersion: 1,
    artifactKind: 'asha_studio_project_settings',
    settingsVersion: 'asha-studio-project-settings.v1',
    project: {
      gameId: requireNonEmpty(options.gameId, 'project game ID'),
      manifestPath: requireNonEmpty(options.manifestPath, 'project manifest path'),
    },
    units: 'meters',
    spatialGrid: {
      coordinateSystem: 'rightHandedYUp',
      origin: [...DEFAULT_EDITOR_GRID_DESCRIPTOR.grid.origin],
      spacing: [...DEFAULT_EDITOR_GRID_DESCRIPTOR.grid.spacing],
      plane: DEFAULT_EDITOR_GRID_DESCRIPTOR.plane,
      snapAnchor: DEFAULT_EDITOR_GRID_DESCRIPTOR.snapAnchor,
    },
    transformSnapping: {
      rotationDegrees: 15,
      scaleIncrement: 0.1,
    },
  };
}

export function buildDefaultStudioHostUserSettings(
  projectKey: string,
): StudioHostUserSettingsArtifact {
  return {
    schemaVersion: 1,
    artifactKind: 'asha_studio_host_user_settings',
    settingsVersion: 'asha-studio-host-user-settings.v1',
    projectKey: requireNonEmpty(projectKey, 'host project key'),
    sceneView: {
      gridVisible: DEFAULT_EDITOR_GRID_DESCRIPTOR.visible,
      minorColor: [...DEFAULT_EDITOR_GRID_DESCRIPTOR.style.minorColor],
      majorColor: [...DEFAULT_EDITOR_GRID_DESCRIPTOR.style.majorColor],
      xAxisColor: [...DEFAULT_EDITOR_GRID_DESCRIPTOR.style.xAxisColor],
      yAxisColor: [...DEFAULT_EDITOR_GRID_DESCRIPTOR.style.yAxisColor],
      zAxisColor: [...DEFAULT_EDITOR_GRID_DESCRIPTOR.style.zAxisColor],
      majorLineEvery: DEFAULT_EDITOR_GRID_DESCRIPTOR.style.majorLineEvery,
      opacity: DEFAULT_EDITOR_GRID_DESCRIPTOR.style.opacity,
      fadeStart: DEFAULT_EDITOR_GRID_DESCRIPTOR.style.fadeStart,
      fadeEnd: DEFAULT_EDITOR_GRID_DESCRIPTOR.style.fadeEnd,
      cameraMoveSpeed: 6,
      cameraBoostMultiplier: 4,
      invertLookY: false,
      invertPanY: false,
    },
    keyboard: { ...DEFAULT_KEYBOARD_BINDINGS },
  };
}

export function resolveStudioEffectiveSettings(options: {
  readonly project?: StudioProjectSettingsArtifact | null;
  readonly hostUser?: StudioHostUserSettingsArtifact | null;
  readonly session?: StudioSessionSettingsOverrides;
}): StudioEffectiveSettings {
  const project = options.project ?? buildDefaultStudioProjectSettings({
    gameId: 'scratch',
    manifestPath: 'scratch',
  });
  const hostUser = options.hostUser ?? buildDefaultStudioHostUserSettings('scratch');
  const session = options.session ?? {};
  const grid: EditorGridDescriptor = {
    visible: session.gridVisible ?? hostUser.sceneView.gridVisible,
    grid: {
      coordinateSystem: project.spatialGrid.coordinateSystem,
      origin: [...project.spatialGrid.origin],
      spacing: [...project.spatialGrid.spacing],
    },
    plane: project.spatialGrid.plane,
    snapAnchor: project.spatialGrid.snapAnchor,
    style: {
      minorColor: [...hostUser.sceneView.minorColor],
      majorColor: [...hostUser.sceneView.majorColor],
      xAxisColor: [...hostUser.sceneView.xAxisColor],
      yAxisColor: [...hostUser.sceneView.yAxisColor],
      zAxisColor: [...hostUser.sceneView.zAxisColor],
      majorLineEvery: hostUser.sceneView.majorLineEvery,
      opacity: hostUser.sceneView.opacity,
      fadeStart: hostUser.sceneView.fadeStart,
      fadeEnd: hostUser.sceneView.fadeEnd,
    },
  };
  validateEditorGridDescriptor(grid);
  const cameraMoveSpeed = session.cameraMoveSpeed ?? hostUser.sceneView.cameraMoveSpeed;
  const cameraBoostMultiplier = session.cameraBoostMultiplier ?? hostUser.sceneView.cameraBoostMultiplier;
  if (!Number.isFinite(cameraMoveSpeed) || cameraMoveSpeed <= 0) {
    throw new Error('camera move speed must be finite and positive');
  }
  if (!Number.isFinite(cameraBoostMultiplier) || cameraBoostMultiplier < 1) {
    throw new Error('camera boost multiplier must be finite and at least one');
  }
  return {
    coordinateSystem: 'rightHandedYUp',
    units: project.units,
    grid,
    cameraMoveSpeed,
    cameraBoostMultiplier,
    invertLookY: session.invertLookY ?? hostUser.sceneView.invertLookY,
    invertPanY: session.invertPanY ?? hostUser.sceneView.invertPanY ?? false,
    rotationSnapDegrees: project.transformSnapping.rotationDegrees,
    scaleSnapIncrement: project.transformSnapping.scaleIncrement,
    keyboard: { ...hostUser.keyboard },
    sourcePrecedence: ['session', 'host-user', 'project', 'engine'],
  };
}

export function serializeStudioProjectSettings(artifact: StudioProjectSettingsArtifact): string {
  validateStudioProjectSettings(artifact);
  return `${JSON.stringify(canonicalize(artifact), null, 2)}\n`;
}

export function serializeStudioHostUserSettings(artifact: StudioHostUserSettingsArtifact): string {
  validateStudioHostUserSettings(artifact);
  return `${JSON.stringify(canonicalize(artifact), null, 2)}\n`;
}

export function parseStudioProjectSettings(
  text: string,
): StudioSettingsParseResult<StudioProjectSettingsArtifact> {
  return parseSettingsArtifact(
    text,
    'asha_studio_project_settings',
    'asha-studio-project-settings.v1',
    validateStudioProjectSettings,
  );
}

export function parseStudioHostUserSettings(
  text: string,
): StudioSettingsParseResult<StudioHostUserSettingsArtifact> {
  return parseSettingsArtifact(
    text,
    'asha_studio_host_user_settings',
    'asha-studio-host-user-settings.v1',
    validateStudioHostUserSettings,
  );
}

export function validateStudioProjectSettings(
  artifact: StudioProjectSettingsArtifact,
): StudioProjectSettingsArtifact {
  if (artifact.schemaVersion !== 1
    || artifact.artifactKind !== 'asha_studio_project_settings'
    || artifact.settingsVersion !== 'asha-studio-project-settings.v1'
    || artifact.units !== 'meters') {
    throw new Error('project settings must use the supported ASHA Studio v1 schema');
  }
  requireNonEmpty(artifact.project.gameId, 'project game ID');
  requireNonEmpty(artifact.project.manifestPath, 'project manifest path');
  validateEditorGridDescriptor({
    ...DEFAULT_EDITOR_GRID_DESCRIPTOR,
    grid: {
      coordinateSystem: artifact.spatialGrid.coordinateSystem,
      origin: artifact.spatialGrid.origin,
      spacing: artifact.spatialGrid.spacing,
    },
    plane: artifact.spatialGrid.plane,
    snapAnchor: artifact.spatialGrid.snapAnchor,
  });
  if (!Number.isFinite(artifact.transformSnapping.rotationDegrees)
    || artifact.transformSnapping.rotationDegrees <= 0
    || !Number.isFinite(artifact.transformSnapping.scaleIncrement)
    || artifact.transformSnapping.scaleIncrement <= 0) {
    throw new Error('project transform snap increments must be finite and positive');
  }
  return artifact;
}

export function validateStudioHostUserSettings(
  artifact: StudioHostUserSettingsArtifact,
): StudioHostUserSettingsArtifact {
  if (artifact.schemaVersion !== 1
    || artifact.artifactKind !== 'asha_studio_host_user_settings'
    || artifact.settingsVersion !== 'asha-studio-host-user-settings.v1') {
    throw new Error('host user settings must use the supported ASHA Studio v1 schema');
  }
  requireNonEmpty(artifact.projectKey, 'host project key');
  if (typeof artifact.sceneView.invertLookY !== 'boolean'
    || (artifact.sceneView.invertPanY !== undefined
      && typeof artifact.sceneView.invertPanY !== 'boolean')) {
    throw new Error('host-user camera inversion settings must be boolean');
  }
  const effective = resolveStudioEffectiveSettings({ hostUser: artifact });
  for (const binding of Object.values(effective.keyboard)) {
    requireNonEmpty(binding, 'keyboard binding');
  }
  return artifact;
}

function parseSettingsArtifact<T>(
  text: string,
  artifactKind: string,
  supportedVersion: string,
  validate: (artifact: T) => T,
): StudioSettingsParseResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      status: 'invalid',
      artifact: null,
      preservedRawText: text,
      diagnostic: 'Settings are not valid JSON; the original text was preserved and was not overwritten.',
    };
  }
  if (!isRecord(parsed) || parsed['artifactKind'] !== artifactKind) {
    return {
      status: 'invalid',
      artifact: null,
      preservedRawText: text,
      diagnostic: `Settings do not declare artifactKind ${artifactKind}; the original text was preserved.`,
    };
  }
  if (parsed['settingsVersion'] !== supportedVersion) {
    return {
      status: 'unsupported_future_version',
      artifact: null,
      preservedRawText: text,
      diagnostic: `Unsupported settings version ${String(parsed['settingsVersion'])}; the original text was preserved and writes are disabled.`,
    };
  }
  try {
    return {
      status: 'loaded',
      artifact: validate(parsed as T),
      preservedRawText: null,
      diagnostic: null,
    };
  } catch (error) {
    return {
      status: 'invalid',
      artifact: null,
      preservedRawText: text,
      diagnostic: error instanceof Error ? error.message : String(error),
    };
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error(`${label} must be non-empty`);
  return trimmed;
}
