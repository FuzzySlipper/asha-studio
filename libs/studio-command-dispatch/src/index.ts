import type { StudioIntent } from '@asha-studio/domain';

export interface StudioCommandProposal {
  readonly commandId: 'selection.set_active_entity';
  readonly entityId: string;
  readonly expectedTimelineSequence: number;
}

export interface StudioCommandDispatchResult {
  readonly accepted: boolean;
  readonly proposal: StudioCommandProposal | null;
  readonly diagnostic: string | null;
}

export function mapStudioIntentToCommand(
  intent: StudioIntent,
): StudioCommandDispatchResult {
  switch (intent.kind) {
    case 'select_entity':
      return {
        accepted: true,
        diagnostic: null,
        proposal: {
          commandId: 'selection.set_active_entity',
          entityId: intent.entityId,
          expectedTimelineSequence: intent.expectedTimelineSequence,
        },
      };
    case 'noop':
      return {
        accepted: false,
        diagnostic: intent.reason,
        proposal: null,
      };
  }
}
