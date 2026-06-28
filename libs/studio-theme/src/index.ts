export const ashaStudioThemeMarker = 'asha-studio-theme.tokens.v1';

export type AshaStudioThemeTokenKind = 'color' | 'space' | 'radius' | 'font';

export interface AshaStudioThemeToken {
  readonly name: string;
  readonly cssVariable: `--asha-${string}`;
  readonly value: string;
  readonly kind: AshaStudioThemeTokenKind;
}

export const ASHA_STUDIO_THEME_TOKENS = [
  { name: 'canvas', cssVariable: '--asha-color-canvas', value: '#101314', kind: 'color' },
  { name: 'chrome', cssVariable: '--asha-color-chrome', value: '#181d1f', kind: 'color' },
  { name: 'panel', cssVariable: '--asha-color-panel', value: '#202628', kind: 'color' },
  { name: 'viewport', cssVariable: '--asha-color-viewport', value: '#141819', kind: 'color' },
  { name: 'viewportDeep', cssVariable: '--asha-color-viewport-deep', value: '#101820', kind: 'color' },
  { name: 'control', cssVariable: '--asha-color-control', value: '#2b3336', kind: 'color' },
  { name: 'controlActive', cssVariable: '--asha-color-control-active', value: '#22313b', kind: 'color' },
  { name: 'border', cssVariable: '--asha-color-border', value: '#3c474b', kind: 'color' },
  { name: 'ink', cssVariable: '--asha-color-ink', value: '#f1f5f4', kind: 'color' },
  { name: 'muted', cssVariable: '--asha-color-muted', value: '#a7b2b0', kind: 'color' },
  { name: 'accent', cssVariable: '--asha-color-accent', value: '#54c7bd', kind: 'color' },
  { name: 'accentText', cssVariable: '--asha-color-accent-text', value: '#8de0d8', kind: 'color' },
  { name: 'warning', cssVariable: '--asha-color-warning', value: '#d3a644', kind: 'color' },
  { name: 'warningText', cssVariable: '--asha-color-warning-text', value: '#e8c46d', kind: 'color' },
  { name: 'selected', cssVariable: '--asha-color-selected', value: '#d4953f', kind: 'color' },
  { name: 'thumb', cssVariable: '--asha-color-thumb', value: '#22303b', kind: 'color' },
  { name: 'space2xs', cssVariable: '--asha-space-2xs', value: '0.2rem', kind: 'space' },
  { name: 'spaceXs', cssVariable: '--asha-space-xs', value: '0.35rem', kind: 'space' },
  { name: 'spaceSm', cssVariable: '--asha-space-sm', value: '0.5rem', kind: 'space' },
  { name: 'spaceMd', cssVariable: '--asha-space-md', value: '0.75rem', kind: 'space' },
  { name: 'spaceLg', cssVariable: '--asha-space-lg', value: '1rem', kind: 'space' },
  { name: 'radiusControl', cssVariable: '--asha-radius-control', value: '0', kind: 'radius' },
  { name: 'fontUi', cssVariable: '--asha-font-ui', value: 'Inter, Arial, sans-serif', kind: 'font' },
] as const satisfies readonly AshaStudioThemeToken[];

export function themeTokenCssVariables(): readonly string[] {
  return ASHA_STUDIO_THEME_TOKENS.map(token => token.cssVariable);
}
