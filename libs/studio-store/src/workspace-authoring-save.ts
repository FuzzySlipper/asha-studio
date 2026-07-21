import type {
  WorkspaceAuthoringFacade,
  WorkspaceAuthoringStateSummary,
} from '@asha/runtime-session';
import type { NativeBrowserHostRuntimeBridge } from '@asha/browser-host';

export interface StudioHostFileStage {
  readonly token: string;
  readonly path: string;
  readonly sha256: string;
}

export interface StudioHostFilePromotion {
  readonly path: string;
  readonly sha256: string;
}

export interface StudioWorkspaceAuthoringSaveRequest {
  readonly authority: WorkspaceAuthoringFacade;
  readonly currentAuthority: () => WorkspaceAuthoringFacade | null;
  readonly hostPath: string;
  readonly canonicalJsonHash: string;
  readonly stage: () => Promise<StudioHostFileStage>;
  readonly promote: (token: string) => Promise<StudioHostFilePromotion>;
  readonly finalize: (token: string) => Promise<void>;
  readonly discard: (token: string) => Promise<void>;
}

export interface StudioWorkspaceAuthoringSaveResult extends StudioHostFilePromotion {
  readonly storedRevision: number;
  readonly cleanupDiagnostic: string | null;
}

export interface StudioWorkspaceAuthoringArtifactSaveRequest {
  readonly hostPath: string;
  readonly stage: () => Promise<StudioHostFileStage>;
  readonly promote: (token: string) => Promise<StudioHostFilePromotion>;
  readonly finalize: (token: string) => Promise<void>;
  readonly discard: (token: string) => Promise<void>;
}

export interface StudioWorkspaceAuthoringArtifactSetSaveRequest {
  readonly authority: WorkspaceAuthoringFacade;
  readonly currentAuthority: () => WorkspaceAuthoringFacade | null;
  readonly confirmationHostPath: string;
  readonly canonicalJsonHash: string;
  readonly artifacts: readonly StudioWorkspaceAuthoringArtifactSaveRequest[];
}

export interface StudioWorkspaceAuthoringArtifactSetSaveResult {
  readonly artifacts: readonly StudioHostFilePromotion[];
  readonly storedRevision: number;
  readonly cleanupDiagnostics: readonly string[];
}

export interface StudioCanonicalProjectWriteRequest {
  readonly authority: WorkspaceAuthoringFacade;
  readonly currentAuthority: () => WorkspaceAuthoringFacade | null;
  readonly bridge: NativeBrowserHostRuntimeBridge;
  readonly projectRoot: string;
}

export interface StudioCanonicalProjectWriteResult {
  readonly candidateHash: string;
  readonly storedRevision: number;
}

function sameAuthoritySnapshot(
  before: WorkspaceAuthoringStateSummary,
  after: WorkspaceAuthoringStateSummary,
): boolean {
  return before.status === 'open'
    && after.status === 'open'
    && before.identity.project.workspaceId === after.identity.project.workspaceId
    && before.identity.generation === after.identity.generation
    && before.workingRevision === after.workingRevision
    && before.authoritySnapshotHash === after.authoritySnapshotHash
    && before.lifecycleHash === after.lifecycleHash;
}

/**
 * Persists the complete Rust-owned ProjectBundle closure through the trusted
 * browser host. Observation happens before Rust prepares the candidate; the
 * host then performs one reversible directory swap and confirms that exact
 * publication with the same Rust authority cell.
 */
export async function persistStudioCanonicalProjectWrite(
  request: StudioCanonicalProjectWriteRequest,
): Promise<StudioCanonicalProjectWriteResult> {
  const beforeObservation = request.authority.readState();
  const observed = await request.bridge.browserHostProjectStore.observe(request.projectRoot);
  requireCurrentCanonicalProjectAuthority(request, beforeObservation, 'observed');

  const prepared = request.authority.prepareProjectWrite({
    observedPrior: observed.identity,
    priorManifestJson: observed.manifestJson,
  });
  if (!prepared.accepted || prepared.candidate === null) {
    const diagnostic = prepared.diagnostics.at(0);
    throw new Error(
      diagnostic === undefined
        ? 'Rust rejected the canonical project write without a diagnostic.'
        : `${diagnostic.code}${diagnostic.path === null ? '' : ` (${diagnostic.path})`}: ${diagnostic.message}`,
    );
  }
  requireCurrentCanonicalProjectAuthority(request, beforeObservation, 'prepared');

  const stored = await request.bridge.browserHostProjectStore.apply({
    projectRoot: request.projectRoot,
    candidate: prepared.candidate,
  });
  if (stored.candidateHash !== prepared.candidate.candidateHash) {
    throw new Error('Browser host returned a different canonical project candidate identity.');
  }
  const afterConfirmation = request.authority.readState();
  if (
    request.currentAuthority() !== request.authority
    || afterConfirmation.status !== 'open'
    || afterConfirmation.identity.project.workspaceId
      !== beforeObservation.identity.project.workspaceId
    || afterConfirmation.identity.generation !== beforeObservation.identity.generation
    || afterConfirmation.workingRevision !== beforeObservation.workingRevision
    || afterConfirmation.storedRevision !== beforeObservation.workingRevision
    || afterConfirmation.dirty
  ) {
    throw new Error('Canonical project publication did not settle the originating Rust authority revision.');
  }
  return {
    candidateHash: stored.candidateHash,
    storedRevision: stored.published.revision,
  };
}

function requireCurrentCanonicalProjectAuthority(
  request: StudioCanonicalProjectWriteRequest,
  expected: WorkspaceAuthoringStateSummary,
  phase: 'observed' | 'prepared',
): void {
  if (request.currentAuthority() !== request.authority) {
    throw new Error(`Workspace authoring authority changed while the project write was ${phase}.`);
  }
  if (!sameAuthoritySnapshot(expected, request.authority.readState())) {
    throw new Error(`Workspace authoring state changed while the project write was ${phase}.`);
  }
}

/**
 * Keeps unconfirmed bytes outside the durable target. The host stage may take
 * arbitrarily long; after it returns, the exact Rust cell and authority
 * snapshot that produced the candidate must still be current. Host promotion
 * is tentative and rollback-capable: only after that durable promotion succeeds
 * does Rust confirm stored truth. Authority drift or confirmation rejection
 * rolls the host target back to its previous bytes.
 */
export async function persistStudioWorkspaceAuthoringCandidate(
  request: StudioWorkspaceAuthoringSaveRequest,
): Promise<StudioWorkspaceAuthoringSaveResult> {
  const candidateState = request.authority.readState();
  const staged = await request.stage();
  let promoted: StudioHostFilePromotion | null = null;
  let confirmed = false;
  try {
    if (request.currentAuthority() !== request.authority) {
      throw new Error('Workspace authoring authority changed while the save was staged.');
    }
    const currentState = request.authority.readState();
    if (!sameAuthoritySnapshot(candidateState, currentState)) {
      throw new Error('Workspace authoring state changed while the save was staged.');
    }
    promoted = await request.promote(staged.token);
    if (promoted.path !== staged.path || promoted.sha256 !== staged.sha256) {
      throw new Error('Host promotion did not preserve the exact staged candidate identity.');
    }
    if (request.currentAuthority() !== request.authority) {
      throw new Error('Workspace authoring authority changed while the save was promoted.');
    }
    const promotedState = request.authority.readState();
    if (!sameAuthoritySnapshot(candidateState, promotedState)) {
      throw new Error('Workspace authoring state changed while the save was promoted.');
    }
    const confirmation = request.authority.confirmStored({
      expectedWorkspaceId: candidateState.identity.project.workspaceId,
      expectedGeneration: candidateState.identity.generation,
      hostPath: staged.path,
      canonicalJsonHash: request.canonicalJsonHash,
    });
    confirmed = true;
    let cleanupDiagnostic: string | null = null;
    try {
      await request.finalize(staged.token);
    } catch (error) {
      cleanupDiagnostic = error instanceof Error ? error.message : String(error);
    }
    return {
      ...promoted,
      storedRevision: confirmation.storedRevision,
      cleanupDiagnostic,
    };
  } catch (error) {
    if (!confirmed) {
      try {
        await request.discard(staged.token);
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Workspace save failed and the tentative host promotion could not be rolled back.',
        );
      }
    }
    throw error;
  }
}

/**
 * Persists one Rust-issued artifact set without exposing a partially promoted
 * set as accepted stored truth. Every file is staged first, every promotion is
 * identity checked, and Rust confirms the set hash only after all promotions
 * succeed. Any failure before confirmation rolls every allocated stage back in
 * reverse order, including stages whose target files were already promoted.
 */
export async function persistStudioWorkspaceAuthoringArtifactSet(
  request: StudioWorkspaceAuthoringArtifactSetSaveRequest,
): Promise<StudioWorkspaceAuthoringArtifactSetSaveResult> {
  if (request.artifacts.length === 0) {
    throw new Error('Workspace artifact-set save requires at least one artifact.');
  }
  const candidateState = request.authority.readState();
  const staged: Array<{
    readonly request: StudioWorkspaceAuthoringArtifactSaveRequest;
    readonly stage: StudioHostFileStage;
  }> = [];
  let confirmed = false;
  try {
    for (const artifact of request.artifacts) {
      const stage = await artifact.stage();
      staged.push({ request: artifact, stage });
    }
    requireCurrentArtifactSetAuthority(request, candidateState, 'staged');

    const promoted: StudioHostFilePromotion[] = [];
    for (const artifact of staged) {
      const promotion = await artifact.request.promote(artifact.stage.token);
      if (
        promotion.path !== artifact.stage.path
        || promotion.sha256 !== artifact.stage.sha256
      ) {
        throw new Error(
          `Host promotion did not preserve staged candidate identity for ${artifact.request.hostPath}.`,
        );
      }
      promoted.push(promotion);
    }
    requireCurrentArtifactSetAuthority(request, candidateState, 'promoted');

    const confirmation = request.authority.confirmStored({
      expectedWorkspaceId: candidateState.identity.project.workspaceId,
      expectedGeneration: candidateState.identity.generation,
      hostPath: request.confirmationHostPath,
      canonicalJsonHash: request.canonicalJsonHash,
    });
    confirmed = true;
    const cleanupDiagnostics: string[] = [];
    for (const artifact of staged) {
      try {
        await artifact.request.finalize(artifact.stage.token);
      } catch (error) {
        cleanupDiagnostics.push(
          `${artifact.request.hostPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return {
      artifacts: promoted,
      storedRevision: confirmation.storedRevision,
      cleanupDiagnostics,
    };
  } catch (error) {
    if (!confirmed) {
      const rollbackErrors: unknown[] = [];
      for (const artifact of [...staged].reverse()) {
        try {
          await artifact.request.discard(artifact.stage.token);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length > 0) {
        throw new AggregateError(
          [error, ...rollbackErrors],
          'Workspace artifact-set save failed and one or more tentative host promotions could not be rolled back.',
        );
      }
    }
    throw error;
  }
}

function requireCurrentArtifactSetAuthority(
  request: StudioWorkspaceAuthoringArtifactSetSaveRequest,
  candidateState: WorkspaceAuthoringStateSummary,
  phase: 'staged' | 'promoted',
): void {
  if (request.currentAuthority() !== request.authority) {
    throw new Error(`Workspace authoring authority changed while the artifact set was ${phase}.`);
  }
  const currentState = request.authority.readState();
  if (!sameAuthoritySnapshot(candidateState, currentState)) {
    throw new Error(`Workspace authoring state changed while the artifact set was ${phase}.`);
  }
}
