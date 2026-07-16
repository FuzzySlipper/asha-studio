import type {
  WorkspaceAuthoringFacade,
  WorkspaceAuthoringStateSummary,
} from '@asha/runtime-session';

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
