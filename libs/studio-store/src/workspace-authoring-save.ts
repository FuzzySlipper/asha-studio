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
  readonly discard: (token: string) => Promise<void>;
}

export interface StudioWorkspaceAuthoringSaveResult extends StudioHostFilePromotion {
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
 * Keeps unconfirmed bytes outside the durable target. The host stage may take
 * arbitrarily long; after it returns, the exact Rust cell and authority
 * snapshot that produced the candidate must still be current. Only a Rust-
 * accepted candidate is promoted through the host's compare-and-swap rename.
 */
export async function persistStudioWorkspaceAuthoringCandidate(
  request: StudioWorkspaceAuthoringSaveRequest,
): Promise<StudioWorkspaceAuthoringSaveResult> {
  const candidateState = request.authority.readState();
  const staged = await request.stage();
  let promoted = false;
  try {
    if (request.currentAuthority() !== request.authority) {
      throw new Error('Workspace authoring authority changed while the save was staged.');
    }
    const currentState = request.authority.readState();
    if (!sameAuthoritySnapshot(candidateState, currentState)) {
      throw new Error('Workspace authoring state changed while the save was staged.');
    }
    const confirmation = request.authority.confirmStored({
      expectedWorkspaceId: candidateState.identity.project.workspaceId,
      expectedGeneration: candidateState.identity.generation,
      hostPath: staged.path,
      canonicalJsonHash: request.canonicalJsonHash,
    });
    const stored = await request.promote(staged.token);
    promoted = true;
    return {
      ...stored,
      storedRevision: confirmation.storedRevision,
    };
  } finally {
    if (!promoted) {
      await request.discard(staged.token);
    }
  }
}
