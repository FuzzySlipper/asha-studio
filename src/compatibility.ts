import { COMMAND_CATALOG } from '@asha/command-registry';
import type { StudioCommandCatalog } from '@asha/command-registry';

import studioPackageJson from '../package.json';

export type StudioRuntimeMode = 'native' | 'wasm' | 'reference' | 'mock' | 'degraded' | 'unavailable';
export type StudioDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface StudioDiagnostic {
  readonly severity: StudioDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly owningLane:
    | 'contract-steward'
    | 'ts-command-registry'
    | 'ts-studio-evidence'
    | 'ts-shell'
    | 'rust-bridge'
    | 'asha-studio'
    | 'unknown';
  readonly source: string | null;
  readonly remediation: string | null;
}

export interface StudioAshaPackageVersion {
  readonly packageName: string;
  readonly version: string;
  readonly commit: string | null;
}

export interface StudioCompatibilityEvidence {
  readonly contractsVersion: string;
  readonly commandRegistryVersion: string;
  readonly studioEvidenceVersion: string;
  readonly runtimeBridgeVersion: string | null;
  readonly ashaCommit: string | null;
  readonly ashaPackageVersions: readonly StudioAshaPackageVersion[];
  readonly studioCommit: string | null;
  readonly supportedRuntimeModes: readonly StudioRuntimeMode[];
}

export interface StudioCompatibilityRequirement {
  readonly packageName: string;
  readonly compatibilityVersion: string;
  readonly packageVersion: string | null;
  readonly packageLink: string | null;
  readonly requiredForStartup: boolean;
  readonly presentInStudio: boolean;
  readonly owningLane: StudioDiagnostic['owningLane'];
  readonly source: string;
}

export interface StudioSessionMetadata {
  readonly schemaVersion: 1;
  readonly artifactKind: 'session_metadata';
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly scenarioLabel: string;
  readonly runtimeMode: StudioRuntimeMode;
  readonly startedAtIso: string;
  readonly endedAtIso: string | null;
  readonly compatibility: StudioCompatibilityEvidence;
  readonly capabilities: readonly {
    readonly commandId: string;
    readonly available: boolean;
    readonly degradedReason: string | null;
  }[];
  readonly knownLimitations: readonly string[];
  readonly diagnostics: readonly StudioDiagnostic[];
}

export interface CompatibilityCheckResult {
  readonly ok: boolean;
  readonly diagnostics: readonly StudioDiagnostic[];
}

interface StudioPackageJsonLike {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
}

export interface StudioPackageSurfaceReadback {
  readonly presentPackageVersions: readonly StudioAshaPackageVersion[];
  readonly missingRequiredPackages: readonly StudioCompatibilityRequirement[];
  readonly mismatchedRequiredPackages: readonly {
    readonly requirement: StudioCompatibilityRequirement;
    readonly actualLink: string;
  }[];
}

export const STUDIO_EVIDENCE_DEFERRED_VERSION = 'studio-evidence.deferred-v0';
export const SUPPORTED_RUNTIME_MODES: readonly StudioRuntimeMode[] = ['mock', 'reference', 'native', 'unavailable'];

const ASHA_PACKAGE_LINK_ROOT = ['link:..', 'asha', 'ts', 'packages'].join('/');

export const ASHA_COMPATIBILITY_REQUIREMENTS: readonly StudioCompatibilityRequirement[] = [
  {
    packageName: '@asha/contracts',
    compatibilityVersion: 'contracts.v0',
    packageVersion: '0.1.0',
    packageLink: `${ASHA_PACKAGE_LINK_ROOT}/contracts`,
    requiredForStartup: true,
    presentInStudio: true,
    owningLane: 'contract-steward',
    source: 'ts/packages/contracts/compatibility.json',
  },
  {
    packageName: '@asha/command-registry',
    compatibilityVersion: 'command-registry.v0',
    packageVersion: '0.1.0',
    packageLink: `${ASHA_PACKAGE_LINK_ROOT}/command-registry`,
    requiredForStartup: true,
    presentInStudio: true,
    owningLane: 'ts-command-registry',
    source: 'ts/packages/command-registry/package.json asha.compatibility.version plus COMMAND_CATALOG.commandRegistryVersion',
  },
  {
    packageName: '@asha/editor-tools',
    compatibilityVersion: 'editor-tools.v0',
    packageVersion: '0.1.0',
    packageLink: `${ASHA_PACKAGE_LINK_ROOT}/editor-tools`,
    requiredForStartup: true,
    presentInStudio: true,
    owningLane: 'ts-shell',
    source: 'ts/packages/editor-tools/package.json plus public editor tool proposal helpers',
  },
  {
    packageName: '@asha/runtime-bridge',
    compatibilityVersion: 'runtime-bridge.v0',
    packageVersion: '0.1.0',
    packageLink: `${ASHA_PACKAGE_LINK_ROOT}/runtime-bridge`,
    requiredForStartup: false,
    presentInStudio: true,
    owningLane: 'rust-bridge',
    source: 'ts/packages/runtime-bridge/compatibility.json; task asha#3220 approved the public Studio package-root link',
  },
];

function diagnostic(
  severity: StudioDiagnosticSeverity,
  code: string,
  message: string,
  owningLane: StudioDiagnostic['owningLane'],
  source: string | null,
  remediation: string | null,
): StudioDiagnostic {
  return { severity, code, message, owningLane, source, remediation };
}

function packageSections(packageJson: StudioPackageJsonLike): readonly Readonly<Record<string, string>>[] {
  return [
    packageJson.dependencies ?? {},
    packageJson.devDependencies ?? {},
    packageJson.peerDependencies ?? {},
    packageJson.optionalDependencies ?? {},
  ];
}

function findDeclaredPackageLink(packageJson: StudioPackageJsonLike, packageName: string): string | undefined {
  for (const section of packageSections(packageJson)) {
    const value = section[packageName];
    if (value !== undefined) return value;
  }
  return undefined;
}

export function readStudioPackageSurfaces(
  requirements: readonly StudioCompatibilityRequirement[] = ASHA_COMPATIBILITY_REQUIREMENTS,
  packageJson: StudioPackageJsonLike = studioPackageJson,
): StudioPackageSurfaceReadback {
  const presentPackageVersions: StudioAshaPackageVersion[] = [];
  const missingRequiredPackages: StudioCompatibilityRequirement[] = [];
  const mismatchedRequiredPackages: { requirement: StudioCompatibilityRequirement; actualLink: string }[] = [];

  for (const requirement of requirements) {
    if (!requirement.presentInStudio || requirement.packageVersion === null) continue;
    const actualLink = findDeclaredPackageLink(packageJson, requirement.packageName);
    if (actualLink === undefined) {
      if (requirement.requiredForStartup) missingRequiredPackages.push(requirement);
      continue;
    }
    if (requirement.packageLink !== null && actualLink !== requirement.packageLink) {
      if (requirement.requiredForStartup) mismatchedRequiredPackages.push({ requirement, actualLink });
      continue;
    }
    presentPackageVersions.push({
      packageName: requirement.packageName,
      version: requirement.packageVersion,
      commit: null,
    });
  }

  return { presentPackageVersions, missingRequiredPackages, mismatchedRequiredPackages };
}

function compatibilityVersionForPresentPackage(
  readback: StudioPackageSurfaceReadback,
  requirements: readonly StudioCompatibilityRequirement[],
  packageName: string,
): string {
  const requirement = requirements.find((item) => item.packageName === packageName);
  if (requirement === undefined) return 'missing';
  return readback.presentPackageVersions.some((item) => item.packageName === packageName) ? requirement.compatibilityVersion : 'missing';
}

export function buildCurrentCompatibilityEvidence(options: {
  readonly catalog?: StudioCommandCatalog;
  readonly requirements?: readonly StudioCompatibilityRequirement[];
  readonly packageJson?: StudioPackageJsonLike;
  readonly ashaCommit?: string | null;
  readonly studioCommit?: string | null;
} = {}): StudioCompatibilityEvidence {
  const catalog = options.catalog ?? COMMAND_CATALOG;
  const requirements = options.requirements ?? ASHA_COMPATIBILITY_REQUIREMENTS;
  const readback = readStudioPackageSurfaces(requirements, options.packageJson ?? studioPackageJson);
  const runtimeBridge = requirements.find((requirement) => requirement.packageName === '@asha/runtime-bridge');
  return {
    contractsVersion: compatibilityVersionForPresentPackage(readback, requirements, '@asha/contracts'),
    commandRegistryVersion: readback.presentPackageVersions.some((item) => item.packageName === '@asha/command-registry') ? catalog.commandRegistryVersion : 'missing',
    studioEvidenceVersion: STUDIO_EVIDENCE_DEFERRED_VERSION,
    runtimeBridgeVersion: runtimeBridge?.presentInStudio === true && readback.presentPackageVersions.some((item) => item.packageName === '@asha/runtime-bridge') ? runtimeBridge.compatibilityVersion : null,
    ashaCommit: options.ashaCommit ?? null,
    ashaPackageVersions: readback.presentPackageVersions,
    studioCommit: options.studioCommit ?? null,
    supportedRuntimeModes: SUPPORTED_RUNTIME_MODES,
  };
}

export function checkCompatibility(
  evidence: StudioCompatibilityEvidence,
  runtimeMode: StudioRuntimeMode,
  requirements: readonly StudioCompatibilityRequirement[] = ASHA_COMPATIBILITY_REQUIREMENTS,
): CompatibilityCheckResult {
  const diagnostics: StudioDiagnostic[] = [];
  const byPackage = new Map(requirements.map((requirement) => [requirement.packageName, requirement]));
  const contracts = byPackage.get('@asha/contracts');
  if (contracts === undefined || evidence.contractsVersion !== contracts.compatibilityVersion) {
    diagnostics.push(diagnostic(
      'error',
      'asha.compatibility.contracts_mismatch',
      `Expected @asha/contracts compatibility ${contracts?.compatibilityVersion ?? 'missing requirement'} but saw ${evidence.contractsVersion}.`,
      'contract-steward',
      contracts?.source ?? null,
      'Regenerate or update ASHA contracts through the public compatibility flow before launching Studio.',
    ));
  }

  const registry = byPackage.get('@asha/command-registry');
  if (registry === undefined || evidence.commandRegistryVersion !== registry.compatibilityVersion) {
    diagnostics.push(diagnostic(
      'error',
      'asha.compatibility.command_registry_mismatch',
      `Expected @asha/command-registry compatibility ${registry?.compatibilityVersion ?? 'missing requirement'} but saw ${evidence.commandRegistryVersion}.`,
      'ts-command-registry',
      registry?.source ?? null,
      'Update the command registry manifest and Studio compatibility metadata together.',
    ));
  }

  if (!evidence.supportedRuntimeModes.includes(runtimeMode)) {
    diagnostics.push(diagnostic(
      'error',
      'asha.compatibility.unsupported_runtime_mode',
      `Runtime mode ${runtimeMode} is not supported by this Studio build. Supported modes: ${evidence.supportedRuntimeModes.join(', ')}.`,
      'asha-studio',
      'src/compatibility.ts',
      'Add a public runtime bridge surface and compatibility evidence before enabling this runtime mode.',
    ));
  }

  const runtimeBridge = byPackage.get('@asha/runtime-bridge');
  if ((runtimeMode === 'native' || runtimeMode === 'wasm') && evidence.runtimeBridgeVersion !== runtimeBridge?.compatibilityVersion) {
    diagnostics.push(diagnostic(
      'error',
      'asha.compatibility.runtime_bridge_missing',
      `Runtime mode ${runtimeMode} requires @asha/runtime-bridge compatibility ${runtimeBridge?.compatibilityVersion ?? 'unknown'}, but runtimeBridgeVersion is ${evidence.runtimeBridgeVersion ?? 'null'}.`,
      'rust-bridge',
      runtimeBridge?.source ?? null,
      'Do not import raw native/WASM transports; promote @asha/runtime-bridge as an approved public Studio surface first.',
    ));
  } else if (evidence.runtimeBridgeVersion === null) {
    diagnostics.push(diagnostic(
      'warning',
      'asha.compatibility.runtime_bridge_deferred',
      '@asha/runtime-bridge is not present in this Studio build; command execution must remain unavailable or mock/reference only.',
      'rust-bridge',
      runtimeBridge?.source ?? null,
      'Track the runtime bridge integration task before enabling command execution.',
    ));
  }

  for (const requirement of requirements) {
    if (!requirement.requiredForStartup) continue;
    const packageVersion = evidence.ashaPackageVersions.find((item) => item.packageName === requirement.packageName);
    if (packageVersion === undefined) {
      diagnostics.push(diagnostic(
        'error',
        'asha.compatibility.required_surface_missing',
        `Required ASHA public surface ${requirement.packageName} is missing from Studio package metadata.`,
        requirement.owningLane,
        requirement.source,
        `Add ${requirement.packageName}${requirement.packageLink === null ? '' : ` as ${requirement.packageLink}`} before claiming this compatibility surface.`,
      ));
    } else if (packageVersion.version !== requirement.packageVersion) {
      diagnostics.push(diagnostic(
        'error',
        'asha.compatibility.package_version_mismatch',
        `Expected ${requirement.packageName}@${requirement.packageVersion ?? 'unknown'} but found ${packageVersion?.version ?? 'missing'}.`,
        requirement.owningLane,
        requirement.source,
        'Update package links and compatibility evidence together; do not continue with stale public surfaces.',
      ));
    }
  }

  return {
    ok: diagnostics.every((item) => item.severity !== 'error'),
    diagnostics,
  };
}

export function createStudioSessionMetadata(options: {
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly scenarioLabel: string;
  readonly runtimeMode: StudioRuntimeMode;
  readonly startedAtIso: string;
  readonly endedAtIso?: string | null;
  readonly catalog?: StudioCommandCatalog;
  readonly compatibility?: StudioCompatibilityEvidence;
  readonly packageJson?: StudioPackageJsonLike;
  readonly knownLimitations?: readonly string[];
}): StudioSessionMetadata {
  const catalog = options.catalog ?? COMMAND_CATALOG;
  const compatibility = options.compatibility ?? buildCurrentCompatibilityEvidence(options.packageJson === undefined ? { catalog } : { catalog, packageJson: options.packageJson });
  const compatibilityCheck = checkCompatibility(compatibility, options.runtimeMode);
  return {
    schemaVersion: 1,
    artifactKind: 'session_metadata',
    sessionId: options.sessionId,
    scenarioId: options.scenarioId,
    scenarioLabel: options.scenarioLabel,
    runtimeMode: options.runtimeMode,
    startedAtIso: options.startedAtIso,
    endedAtIso: options.endedAtIso ?? null,
    compatibility,
    capabilities: catalog.commands.map((command) => ({
      commandId: command.id,
      available: compatibilityCheck.ok && options.runtimeMode !== 'unavailable',
      degradedReason: compatibilityCheck.ok ? null : 'Compatibility check failed closed; see diagnostics.',
    })),
    knownLimitations: options.knownLimitations ?? [
      'Native runtime bridge integration is available only through the approved @asha/runtime-bridge package root and remains guarded by proof:runtime-bridge.',
      'WASM runtime and raw replay/native transports remain forbidden or fail-closed unless a separate public facade proof enables them.',
      'Studio evidence schema package is deferred; session metadata records compatibility only.',
    ],
    diagnostics: compatibilityCheck.diagnostics,
  };
}
