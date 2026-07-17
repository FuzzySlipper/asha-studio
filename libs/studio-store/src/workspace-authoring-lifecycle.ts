export interface StudioWorkspaceAuthoringOpenAttempt {
  readonly generation: number;
}

export class StudioWorkspaceAuthoringOpenLifecycle {
  private generation = 0;

  begin(): StudioWorkspaceAuthoringOpenAttempt {
    this.generation += 1;
    return { generation: this.generation };
  }

  isCurrent(attempt: StudioWorkspaceAuthoringOpenAttempt): boolean {
    return attempt.generation === this.generation;
  }
}
