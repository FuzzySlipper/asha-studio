import {
  ASHA_COMPATIBILITY_REQUIREMENTS,
  checkCompatibility,
  type StudioCompatibilityEvidence,
  type StudioDiagnostic,
  type StudioRuntimeMode,
} from './compatibility';

export type StudioRuntimeBridgeReadinessStatus = 'ready' | 'deferred' | 'failed_closed';

export interface StudioRuntimeBridgeReadinessRequirement {
  readonly id: string;
  readonly label: string;
  readonly source: string;
  readonly requiredBeforeAuthorityRuntime: boolean;
}

export interface StudioRuntimeBridgeReadinessGate {
  readonly schemaVersion: 1;
  readonly artifactKind: 'studio_runtime_bridge_readiness_gate';
  readonly taskId: 3047;
  readonly status: StudioRuntimeBridgeReadinessStatus;
  readonly runtimeMode: StudioRuntimeMode;
  readonly requiredCompatibility: {
    readonly packageName: '@asha/runtime-bridge';
    readonly compatibilityVersion: 'runtime-bridge.v0';
    readonly packageVersion: '0.1.0';
    readonly approvedStudioImport: boolean;
    readonly requiredForRuntimeAuthority: true;
  };
  readonly requiredPublicDtos: readonly StudioRuntimeBridgeReadinessRequirement[];
  readonly requiredOperations: readonly StudioRuntimeBridgeReadinessRequirement[];
  readonly requiredProofUpdates: readonly StudioRuntimeBridgeReadinessRequirement[];
  readonly diagnostics: readonly StudioDiagnostic[];
  readonly checklist: readonly string[];
  readonly nonClaimsUntilReady: readonly string[];
  readonly sourceDocs: readonly string[];
}

const READINESS_DOCS = [
  'docs/runtime-bridge-readiness-gate.md',
  'asha/asha-studio-runtime-bridge-readiness-gate',
  'asha/asha-studio-real-3d-viewport-and-visual-verification-roadmap#runtime-bridge-readiness-gate',
  'asha/consumer-compatibility-surface#runtime-bridge-v0',
  'asha/runtime-bridge-boundary-design',
] as const;

export const REQUIRED_RUNTIME_BRIDGE_DTOS: readonly StudioRuntimeBridgeReadinessRequirement[] = [
  {
    id: 'runtime_bridge_compatibility_metadata',
    label: 'Machine-readable @asha/runtime-bridge compatibility metadata with runtime-bridge.v0 marker and package version.',
    source: 'ts/packages/runtime-bridge/compatibility.json',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'runtime_scene_snapshot_dto',
    label: 'Generated/public scene snapshot DTO carrying authoritative object ids, transforms, material refs, selection, and authority hashes.',
    source: '@asha/contracts root export or @asha/runtime-bridge facade root export only',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'runtime_command_application_result_dto',
    label: 'Typed command application result DTO for accepted/rejected command effects, diagnostics, before/after authority hashes, and correlation ids.',
    source: '@asha/contracts root export or @asha/runtime-bridge facade root export only',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'runtime_replay_record_dto',
    label: 'Replay/golden record DTO that lets Studio prove command replay and runtime snapshot provenance without raw transport access.',
    source: '@asha/runtime-bridge root export; WASM replay remains devtools/golden scope',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'runtime_render_readback_evidence_dto',
    label: 'Render/readback evidence DTO linking authoritative snapshots to render hashes, camera state, pick evidence, and visual proof artifacts.',
    source: '@asha/runtime-bridge root export plus generated contracts when promoted',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'runtime_bridge_error_taxonomy',
    label: 'Classified RuntimeBridgeError taxonomy for native_unavailable, operation_unimplemented, incompatible_surface, stale_snapshot, and replay_mismatch failures.',
    source: '@asha/runtime-bridge root export',
    requiredBeforeAuthorityRuntime: true,
  },
] as const;

export const REQUIRED_RUNTIME_BRIDGE_OPERATIONS: readonly StudioRuntimeBridgeReadinessRequirement[] = [
  {
    id: 'runtime_session_start_or_attach',
    label: 'Start or attach to an authoritative runtime session through the public facade, never through native/raw transports.',
    source: 'runtime-bridge-api bridge manifest operation vocabulary',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'runtime_scene_snapshot',
    label: 'Read authoritative scene snapshots with stable snapshot ids, authority hashes, selected ids, renderable ids, and compatibility metadata.',
    source: 'runtime-bridge-api bridge manifest operation vocabulary',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'runtime_command_apply',
    label: 'Apply typed public commands and return command application result DTOs with timeline/replay correlation.',
    source: 'runtime-bridge-api bridge manifest operation vocabulary',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'runtime_replay_export',
    label: 'Export replay/golden records for the applied command sequence without requiring Studio to import @asha/wasm-replay-bridge.',
    source: '@asha/runtime-bridge facade; replay implementation may delegate behind the facade',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'runtime_render_readback',
    label: 'Return render/readback evidence that can replace browser-reference scene hashes in visual capability artifacts.',
    source: '@asha/runtime-bridge facade; renderer/native details stay private',
    requiredBeforeAuthorityRuntime: true,
  },
] as const;

export const REQUIRED_RUNTIME_BRIDGE_PROOF_UPDATES: readonly StudioRuntimeBridgeReadinessRequirement[] = [
  {
    id: 'session_metadata_runtime_bridge_ready',
    label: 'Session metadata records @asha/runtime-bridge compatibility and supports native/wasm runtime mode only when the facade is present and compatible.',
    source: 'src/compatibility.ts and fixtures/studio-session-metadata.sample.json',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'command_timeline_runtime_authority_correlation',
    label: 'Command timeline entries link public command ids to runtime session id, snapshot ids, replay record ids, and authority before/after hashes.',
    source: 'src/session-workspace.ts readout model',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'visual_capability_runtime_group',
    label: 'studio_visual_capability_proof adds a runtime authority capability group that complements, not replaces, scene/camera/pick/visual-delta/browser evidence.',
    source: 'scripts/visual-capability-proof.ts',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'negative_smokes_runtime_incompatibility',
    label: 'Negative smokes cover missing runtime bridge metadata, mismatched runtime-bridge.v0 marker, missing operation, stale snapshot, replay mismatch, and raw transport import attempts.',
    source: 'runtime bridge proof/readback command owned by future integration task',
    requiredBeforeAuthorityRuntime: true,
  },
  {
    id: 'browser_projection_relabeling',
    label: 'Browser/Three.js projection remains labeled projection-only unless backed by authoritative runtime snapshot and replay/readback evidence.',
    source: 'README.md, docs/scene-view-proof-contract.md, visual capability proof limitations',
    requiredBeforeAuthorityRuntime: true,
  },
] as const;

function runtimeDiagnostic(
  severity: StudioDiagnostic['severity'],
  code: string,
  message: string,
  source: string | null,
  remediation: string,
): StudioDiagnostic {
  return { severity, code, message, owningLane: 'rust-bridge', source, remediation };
}

function runtimeBridgeRequirement() {
  return ASHA_COMPATIBILITY_REQUIREMENTS.find((requirement) => requirement.packageName === '@asha/runtime-bridge');
}

function runtimeBridgeSpecificDiagnostics(evidence: StudioCompatibilityEvidence, runtimeMode: StudioRuntimeMode): readonly StudioDiagnostic[] {
  const diagnostics: StudioDiagnostic[] = [];
  const requirement = runtimeBridgeRequirement();
  const expected = requirement?.compatibilityVersion ?? 'runtime-bridge.v0';
  const source = requirement?.source ?? 'ts/packages/runtime-bridge/compatibility.json';
  if (runtimeMode === 'native' || runtimeMode === 'wasm') {
    if (evidence.runtimeBridgeVersion === null) {
      diagnostics.push(runtimeDiagnostic(
        'error',
        'asha.runtime_bridge_readiness.runtime_bridge_absent',
        `Runtime mode ${runtimeMode} cannot become authoritative because Studio has no @asha/runtime-bridge compatibility marker.`,
        source,
        'Keep Studio in mock/reference/unavailable mode until @asha/runtime-bridge is an approved public package root and reports runtime-bridge.v0.',
      ));
    } else if (evidence.runtimeBridgeVersion !== expected) {
      diagnostics.push(runtimeDiagnostic(
        'error',
        'asha.runtime_bridge_readiness.runtime_bridge_mismatch',
        `Runtime mode ${runtimeMode} requires @asha/runtime-bridge ${expected}, but Studio recorded ${evidence.runtimeBridgeVersion}.`,
        source,
        'Update the ASHA runtime bridge facade, compatibility metadata, migration notes, and Studio package link together.',
      ));
    }
    if (!evidence.supportedRuntimeModes.includes(runtimeMode)) {
      diagnostics.push(runtimeDiagnostic(
        'error',
        'asha.runtime_bridge_readiness.runtime_mode_not_enabled',
        `Runtime mode ${runtimeMode} is not enabled in Studio supportedRuntimeModes: ${evidence.supportedRuntimeModes.join(', ')}.`,
        'src/compatibility.ts',
        'Add native/wasm only in the runtime integration task that also updates proof obligations and negative smokes.',
      ));
    }
  } else if (evidence.runtimeBridgeVersion === null) {
    diagnostics.push(runtimeDiagnostic(
      'warning',
      'asha.runtime_bridge_readiness.deferred_for_reference_mode',
      'Runtime bridge authority is deferred; browser/Three.js evidence remains projection-only and non-blocking for mock/reference Studio workflows.',
      source,
      'Keep non-claim labels visible and use this readiness gate before any runtime authority claim.',
    ));
  }
  return diagnostics;
}

export function evaluateRuntimeBridgeReadinessGate(
  evidence: StudioCompatibilityEvidence,
  runtimeMode: StudioRuntimeMode,
): StudioRuntimeBridgeReadinessGate {
  const compatibilityDiagnostics = checkCompatibility(evidence, runtimeMode).diagnostics;
  const specificDiagnostics = runtimeBridgeSpecificDiagnostics(evidence, runtimeMode);
  const diagnostics = [...compatibilityDiagnostics, ...specificDiagnostics];
  const hasErrors = diagnostics.some((item) => item.severity === 'error');
  const runtimeBridgeReady = evidence.runtimeBridgeVersion === 'runtime-bridge.v0' && (runtimeMode === 'native' || runtimeMode === 'wasm') && evidence.supportedRuntimeModes.includes(runtimeMode);
  const status: StudioRuntimeBridgeReadinessStatus = runtimeBridgeReady && !hasErrors ? 'ready' : hasErrors ? 'failed_closed' : 'deferred';
  return {
    schemaVersion: 1,
    artifactKind: 'studio_runtime_bridge_readiness_gate',
    taskId: 3047,
    status,
    runtimeMode,
    requiredCompatibility: {
      packageName: '@asha/runtime-bridge',
      compatibilityVersion: 'runtime-bridge.v0',
      packageVersion: '0.1.0',
      approvedStudioImport: false,
      requiredForRuntimeAuthority: true,
    },
    requiredPublicDtos: REQUIRED_RUNTIME_BRIDGE_DTOS,
    requiredOperations: REQUIRED_RUNTIME_BRIDGE_OPERATIONS,
    requiredProofUpdates: REQUIRED_RUNTIME_BRIDGE_PROOF_UPDATES,
    diagnostics,
    checklist: [
      'Promote @asha/runtime-bridge as an approved Studio package root in boundary-policy.json and package.json only after the public facade reports runtime-bridge.v0.',
      'Record contracts.v0, command-registry.v0, runtime-bridge.v0, ASHA commit, and package versions in session/readout artifacts.',
      'Consume runtime scene snapshots, command application results, replay records, render/readback evidence, and RuntimeBridgeError only from public package roots.',
      'Update Studio visual capability proof with a runtime authority group plus negative smokes for absent/mismatched bridge metadata, missing operations, stale snapshots, replay mismatch, and raw transport bypass attempts.',
      'Keep browser/Three.js projection and visual-contract evidence as complementary proof channels, not substitutes for runtime authority evidence.',
    ],
    nonClaimsUntilReady: [
      'no_native_runtime_authority',
      'no_wasm_runtime_authority',
      'no_raw_transport_imports',
      'no_runtime_replay_claim',
      'browser_projection_only_until_runtime_snapshot_and_replay_evidence_exist',
    ],
    sourceDocs: READINESS_DOCS,
  };
}
