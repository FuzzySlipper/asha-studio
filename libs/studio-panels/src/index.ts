import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type {
  StudioAssetBrowserCategory,
  StudioBounds,
  StudioCommandTimelineEntry,
  StudioEntityReadModel,
  StudioEntityKind,
  StudioSceneRenderableReadModel,
  StudioViewportToolMode,
} from '@asha-studio/domain';
import { StudioWorkspaceStore } from '@asha-studio/store';
import type { SceneNodeRecord } from '@asha/contracts';
import type { SceneObjectId } from '@asha/editor-tools';
import {
  filteredHierarchyEntities,
  hierarchyEntityHasChildren,
} from './hierarchy-tree';

export { StudioVoxelToolsMenuComponent } from './voxel-tools-menu';

@Component({
  selector: 'asha-runtime-tools-menu',
  standalone: true,
  template: `
    <section class="runtime-tools-menu" data-visual-id="studio-runtime-tools-menu">
      <header class="runtime-tools-menu__header">
        <div>
          <strong>Runtime</strong>
          <small>{{ store.workspace().session.scenarioLabel }} · {{ store.workspace().session.status }}</small>
        </div>
        <span>{{ store.workspace().session.runtimeMode }}</span>
      </header>

      <nav class="runtime-tools-menu__tabs" aria-label="Runtime tools">
        @for (section of runtimeSections; track section.id) {
          <button
            type="button"
            [class.is-current]="activeSection() === section.id"
            [attr.data-runtime-tools-section]="section.id"
            (click)="setActiveSection(section.id)"
          >
            {{ section.label }}
          </button>
        }
      </nav>

      <section class="runtime-menu-section" [hidden]="activeSection() !== 'session'">
        <div class="runtime-menu-section__heading">
          <strong>Current session</strong>
          <small>{{ store.workspace().session.sessionId }}</small>
        </div>
        <div class="session-line">
          <strong>{{ store.workspace().session.scenarioLabel }}</strong>
          <span>{{ store.workspace().session.runtimeMode }}</span>
          <span>{{ store.workspace().session.status }}</span>
        </div>
      </section>

      <section
        class="runtime-menu-section workspace-overview"
        data-visual-id="studio-game-workspace-overview"
        [hidden]="activeSection() !== 'workspace'"
      >
        @if (store.gameWorkspace(); as workspace) {
          <div class="workspace-overview__identity">
            <span class="overview-label">Workspace</span>
            <strong data-workspace-overview="game-id">{{ workspace.gameId }}</strong>
            <span data-workspace-overview="workspace-root">{{ workspace.workspaceRoot }}</span>
          </div>
          <div class="overview-cell">
            <span>ASHA</span>
            <strong data-workspace-overview="engine-version">
              {{ workspace.manifest.asha.engineVersion }}
            </strong>
          </div>
          <div class="overview-cell">
            <span>Runtime</span>
            <strong data-workspace-overview="runtime-bridge-version">
              {{ workspace.manifest.asha.runtimeBridgeVersion }}
            </strong>
            <small data-workspace-overview="runtime-entry">{{ workspace.runtimeEntry }}</small>
          </div>
          <div class="overview-cell">
            <span>Attach</span>
            <strong data-workspace-overview="attach-endpoint">{{ workspace.attachEndpoint }}</strong>
          </div>
          <div class="overview-cell">
            <span>Dev resources</span>
            <strong data-workspace-overview="dev-resolution">
              {{ workspace.manifest.devResourceProfile.resolutionPolicy }}
            </strong>
            <small>{{ workspace.manifest.devResourceProfile.cacheDir }}</small>
          </div>
          <div class="overview-cell">
            <span>Publish resources</span>
            <strong data-workspace-overview="publish-resolution">
              {{ workspace.manifest.publishResourceProfile.resolutionPolicy }}
            </strong>
            <small>{{ workspace.manifest.publishResourceProfile.outputDir }}</small>
          </div>
          <div class="overview-cell overview-cell--wide">
            <span>Commands</span>
            <strong data-workspace-overview="dev-command">{{ workspace.devCommand }}</strong>
            <small data-workspace-overview="publish-command">{{ workspace.publishCommand }}</small>
          </div>
          <div class="overview-cell overview-cell--hash">
            <span>Readout</span>
            <strong data-workspace-overview="workspace-hash">{{ workspace.workspaceHash }}</strong>
          </div>
        } @else {
          <div class="workspace-overview__invalid" data-workspace-overview="diagnostics">
            <strong>Workspace manifest rejected</strong>
            @for (diagnostic of store.gameWorkspaceOverview().diagnostics; track diagnostic.code + diagnostic.source) {
              <span>{{ diagnostic.code }} · {{ diagnostic.message }}</span>
            }
          </div>
        }
      </section>

      <section
        class="runtime-menu-section runtime-inspection"
        data-visual-id="studio-runtime-session-inspection"
        [hidden]="activeSection() !== 'controls'"
      >
        <div class="runtime-inspection__identity">
          <span>Mode</span>
          <strong data-runtime-inspection="studio-mode">{{ store.runtimeSessionInspection().studioMode }}</strong>
          <small data-runtime-inspection="session-status">
            {{ store.runtimeSessionInspection().attachState }} · {{ store.runtimeSessionInspection().sessionStatus }}
          </small>
        </div>
        <div class="runtime-inspection__cell">
          <span>RuntimeSession</span>
          <strong data-runtime-inspection="session-id">
            {{ store.runtimeSessionInspection().sessionId || 'not attached' }}
          </strong>
          <small data-runtime-inspection="session-hash">
            {{ store.runtimeSessionInspection().sessionHash || 'no session hash' }}
          </small>
        </div>
        <div class="runtime-inspection__cell">
          <span>Projection</span>
          <strong data-runtime-inspection="tick">tick {{ store.runtimeSessionInspection().tick ?? 'n/a' }}</strong>
          <small data-runtime-inspection="projection-hash">
            {{ store.runtimeSessionInspection().projectionHash || 'no projection hash' }}
          </small>
        </div>
        <div class="runtime-inspection__cell">
          <span>Replay</span>
          <strong data-runtime-inspection="replay-count">
            records {{ store.runtimeSessionInspection().replay.recordCount }}
          </strong>
          <small>{{ store.runtimeSessionInspection().replay.lastRecordKind || 'no replay record' }}</small>
        </div>
        <div class="runtime-inspection__cell">
          <span>Commands</span>
          <strong data-runtime-inspection="command-summary">
            {{ store.runtimeSessionInspection().commandSummary.acceptedCommandCount ?? 'n/a' }} accepted
          </strong>
          <small>
            {{ store.runtimeSessionInspection().commandSummary.rejectedCommandCount ?? 'n/a' }} rejected
          </small>
        </div>
        <div class="runtime-inspection__cell">
          <span>Entity</span>
          <strong data-runtime-inspection="entity-count">
            {{ store.runtimeSessionInspection().projectionSummary.entityCount }} entities
          </strong>
          @if (store.runtimeSessionInspection().projectionSummary.selectedEntity; as selectedEntity) {
            <small data-runtime-inspection="selected-entity">
              {{ selectedEntity.label }} · {{ selectedEntity.capabilitySummary.join(' · ') }}
            </small>
          } @else {
            <small data-runtime-inspection="selected-entity">no selection</small>
          }
        </div>
        <div class="runtime-inspection__actions">
          <button type="button" (click)="store.attachRuntimeSessionInspection()">Attach</button>
          <button
            type="button"
            [disabled]="store.runtimeSessionInspection().attachState !== 'attached'"
            (click)="store.detachRuntimeSessionInspection()"
          >
            Detach
          </button>
          <button type="button" disabled>Pause</button>
          <button
            type="button"
            [disabled]="!store.runtimeSessionInspection().controls.tick.available"
            (click)="store.tickRuntimeSessionInspection()"
          >
            Tick
          </button>
          <button
            type="button"
            [disabled]="!store.runtimeSessionInspection().controls.restart.available"
            (click)="store.restartRuntimeSessionInspection()"
          >
            Restart
          </button>
        </div>
      </section>

      <section class="runtime-menu-section gameplay-tools" [hidden]="activeSection() !== 'gameplay'">
        <div class="runtime-menu-section__heading">
          <strong>Gameplay inspection</strong>
          <small>Generated level, encounter tuning, and playable-loop controls</small>
        </div>
        <p>
          Open the detailed inspector when working on the current ASHA Demo gameplay path. These tools read stored authoring separately from live RuntimeSession state.
        </p>
        <button
          type="button"
          [attr.aria-expanded]="playableLoopInspectorOpen()"
          aria-controls="studio-playable-loop-popout"
          data-runtime-inspection="loop-inspector-toggle"
          (click)="togglePlayableLoopInspector()"
        >
          Open Gameplay Inspector
        </button>
      </section>

      @if (playableLoopInspectorOpen()) {
        <aside
          id="studio-playable-loop-popout"
          class="runtime-inspection-popout"
          data-visual-id="studio-playable-loop-popout"
          aria-label="Playable loop inspector"
        >
          <div class="runtime-inspection-popout__header">
            <div>
              <span>Runtime / Authoring</span>
              <strong>Playable Loop Inspector</strong>
            </div>
            <button type="button" (click)="closePlayableLoopInspector()">Close</button>
          </div>
          <div class="runtime-inspection-popout__body">
            <section class="generated-level-inspection" data-visual-id="studio-generated-level-inspection">
              <div class="generated-level-inspection__cell generated-level-inspection__cell--authoring">
                <span>Definition Authoring</span>
                <strong data-generated-level="authoring-mode">
                  {{ store.runtimeSessionInspection().generatedLevel.definitionAuthoring.studioMode }}
                </strong>
                <small data-generated-level="mode-boundary">
                  stored preset · not live mutation · not runtime export
                </small>
              </div>
              @for (field of store.runtimeSessionInspection().generatedLevel.definitionAuthoring.fields; track field.field) {
                <label
                  class="generated-level-inspection__field"
                  [attr.data-generated-level-field]="field.field"
                  [attr.data-generated-level-validation]="field.validationStatus"
                >
                  <span>{{ field.label }}</span>
                  @if (field.inputKind === 'readonly') {
                    <strong>{{ field.value }}</strong>
                  } @else if (field.inputKind === 'number') {
                    <input
                      type="number"
                      [value]="field.value"
                      (input)="store.setGeneratedLevelPresetField('seed', $any($event.target).value)"
                    />
                  } @else {
                    <select
                      [value]="field.value"
                      (change)="store.setGeneratedLevelPresetField('presetId', $any($event.target).value)"
                    >
                      @for (allowed of field.allowedValues; track allowed) {
                        <option [value]="allowed">{{ allowed }}</option>
                      }
                    </select>
                  }
                  <small>{{ field.validationMessage || 'valid' }}</small>
                </label>
              }
              <div class="generated-level-inspection__cell">
                <span>Live Generated Level</span>
                <strong data-generated-level="live-mode">
                  {{ store.runtimeSessionInspection().generatedLevel.liveInspection.studioMode }}
                </strong>
                <small data-generated-level="attach-state">
                  {{ store.runtimeSessionInspection().generatedLevel.liveInspection.attachState }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Generator</span>
                <strong data-generated-level="preset-id">
                  {{ store.runtimeSessionInspection().generatedLevel.liveInspection.generator.presetId || 'no live preset' }}
                </strong>
                <small data-generated-level="generator-hashes">
                  cfg {{ store.runtimeSessionInspection().generatedLevel.liveInspection.generator.configHash || 'n/a' }}
                  · out {{ store.runtimeSessionInspection().generatedLevel.liveInspection.generator.outputHash || 'n/a' }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Volume</span>
                <strong data-generated-level="volume">
                  {{ store.runtimeSessionInspection().generatedLevel.liveInspection.volume.tunnelDims?.join('×') || 'n/a' }}
                </strong>
                <small>
                  solids {{ store.runtimeSessionInspection().generatedLevel.liveInspection.volume.solidVoxels ?? 'n/a' }}
                  · corridors {{ store.runtimeSessionInspection().generatedLevel.liveInspection.volume.corridorCount ?? 'n/a' }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Projections</span>
                <strong data-generated-level="render-collision-hash">
                  {{ store.runtimeSessionInspection().generatedLevel.liveInspection.projections.renderHash || 'no render' }}
                </strong>
                <small data-generated-level="nav-hash">
                  collision {{ store.runtimeSessionInspection().generatedLevel.liveInspection.projections.collisionHash || 'n/a' }}
                  · nav {{ store.runtimeSessionInspection().generatedLevel.liveInspection.projections.navProjectionHash || 'n/a' }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Spawn Markers</span>
                <strong data-generated-level="spawn-markers">
                  {{ store.runtimeSessionInspection().generatedLevel.liveInspection.spawnMarkers.length }} markers
                </strong>
                <small>
                  @for (marker of store.runtimeSessionInspection().generatedLevel.liveInspection.spawnMarkers; track marker.id) {
                    {{ marker.id }} {{ marker.voxel.join(',') }}
                  }
                </small>
              </div>
              <div class="generated-level-inspection__actions">
                <button type="button" (click)="store.validateGeneratedLevelPreset()">Validate Preset</button>
                <button
                  type="button"
                  [disabled]="!store.runtimeSessionInspection().generatedLevel.liveInspection.regenerate.available"
                  (click)="store.requestGeneratedLevelRegenerate()"
                >
                  Regenerate
                </button>
                <small data-generated-level="regenerate-status">
                  @if (store.runtimeSessionInspection().generatedLevel.liveInspection.regenerate.lastReceipt; as receipt) {
                    {{ receipt.status }} · {{ receipt.reason || 'accepted' }}
                  } @else {
                    {{ store.runtimeSessionInspection().generatedLevel.liveInspection.regenerate.disabledReason || 'ready' }}
                  }
                </small>
              </div>
            </section>

            <section class="generated-level-inspection" data-visual-id="studio-encounter-tuning-inspection">
              <div class="generated-level-inspection__cell generated-level-inspection__cell--authoring">
                <span>Definition Authoring</span>
                <strong data-encounter-tuning="authoring-version">
                  {{ store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.authoringVersion }}
                </strong>
                <small data-encounter-tuning="schema-kinds">
                  {{ store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.presetReadoutKind }}
                  · {{ store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.catalogReadoutKind }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Preset</span>
                <strong data-encounter-tuning="preset-id">
                  {{ store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.presetId }}
                </strong>
                <small>
                  {{ store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.displayName }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Hashes</span>
                <strong data-encounter-tuning="preset-hash">
                  {{ store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.hashes.presetHash || 'invalid draft' }}
                </strong>
                <small>
                  catalog {{ store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.hashes.catalogHash }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Validation</span>
                <strong data-encounter-tuning="validation-status">
                  {{ store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.validation.status }}
                </strong>
                <small>
                  {{ store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.validation.diagnosticCount }} diagnostics
                </small>
              </div>
              @for (field of store.runtimeSessionInspection().playableLoopTuning.definitionAuthoring.fields; track field.field) {
                <label
                  class="generated-level-inspection__field"
                  [attr.data-gameplay-preset-field]="field.field"
                  [attr.data-gameplay-preset-validation]="field.validationStatus"
                >
                  <span>{{ field.label }}</span>
                  @if (field.inputKind === 'text') {
                    <input
                      type="text"
                      [value]="field.value"
                      (input)="store.setGameplayPresetField(field.field, $any($event.target).value)"
                    />
                  } @else {
                    <input
                      type="number"
                      [value]="field.value"
                      (input)="store.setGameplayPresetField(field.field, $any($event.target).value)"
                    />
                  }
                  <small>{{ field.validationMessage || 'valid' }}</small>
                </label>
              }
              <div class="generated-level-inspection__cell generated-level-inspection__cell--live">
                <span>Live Runtime</span>
                <strong data-encounter-tuning="live-mode">
                  {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.studioMode }}
                </strong>
                <small>
                  {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.attachState }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Encounter</span>
                <strong data-encounter-tuning="encounter-status">
                  {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.encounter.status || 'not attached' }}
                </strong>
                <small>
                  active {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.encounter.activeEnemyCount ?? 'n/a' }}
                  · defeated {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.encounter.defeatedEnemyCount ?? 'n/a' }}
                  · {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.encounter.lastTransition || 'no transition' }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Spawn</span>
                <strong data-encounter-tuning="spawn-summary">
                  {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.encounter.spawns.length }} spawn
                </strong>
                <small>
                  @for (spawn of store.runtimeSessionInspection().playableLoopTuning.liveInspection.encounter.spawns; track spawn.instanceId) {
                    {{ spawn.instanceId }} {{ spawn.status }} entity {{ spawn.runtimeEntityId }}
                  }
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Combat Feedback</span>
                <strong data-encounter-tuning="combat-feedback">
                  {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.combatFeedback.kind || 'waiting' }}
                </strong>
                <small>
                  {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.combatFeedback.traceResult || 'no trace' }}
                  · {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.combatFeedback.markerTone || 'no marker' }}
                </small>
              </div>
              <div class="generated-level-inspection__cell">
                <span>Lifecycle</span>
                <strong data-encounter-tuning="lifecycle">
                  {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.lifecycle.label || 'not attached' }}
                </strong>
                <small>
                  {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.lifecycle.enemyHealth || 'enemy n/a' }}
                  · {{ store.runtimeSessionInspection().playableLoopTuning.liveInspection.lifecycle.outcomeKind || 'n/a' }}
                </small>
              </div>
              <div class="generated-level-inspection__actions">
                <button type="button" (click)="store.validateGameplayPreset()">Validate Tuning</button>
                <small data-encounter-tuning="transition-receipt">
                  @if (store.runtimeSessionInspection().playableLoopTuning.liveInspection.encounter.lastReceipt; as receipt) {
                    {{ receipt.action }} · {{ receipt.status }} · {{ receipt.beforeStatus }} -> {{ receipt.afterStatus }}
                  } @else {
                    no encounter transition receipt
                  }
                </small>
              </div>
            </section>

            <section class="playable-loop-inspection" data-visual-id="studio-playable-loop-inspection">
              <div class="playable-loop-inspection__cell playable-loop-inspection__cell--identity">
                <span>Playable Loop</span>
                <strong data-playable-loop="version">
                  {{ store.runtimeSessionInspection().playableLoop.loopVersion }}
                </strong>
                <small data-playable-loop="mode">
                  {{ store.runtimeSessionInspection().playableLoop.studioMode }}
                  · {{ store.runtimeSessionInspection().playableLoop.attachState }}
                </small>
              </div>
              <div class="playable-loop-inspection__cell">
                <span>Session</span>
                <strong data-playable-loop="session">
                  seed {{ store.runtimeSessionInspection().playableLoop.session.seed ?? 'n/a' }}
                  · tick {{ store.runtimeSessionInspection().playableLoop.session.tick ?? 'n/a' }}
                </strong>
                <small>{{ store.runtimeSessionInspection().playableLoop.session.sessionHash || 'no session hash' }}</small>
              </div>
              <div class="playable-loop-inspection__cell">
                <span>Generated Tunnel</span>
                <strong data-playable-loop="generated-level">
                  {{ store.runtimeSessionInspection().playableLoop.generatedLevel.presetId || 'no preset' }}
                </strong>
                <small>
                  out {{ store.runtimeSessionInspection().playableLoop.generatedLevel.outputHash || 'n/a' }}
                  · nav {{ store.runtimeSessionInspection().playableLoop.generatedLevel.navProjectionHash || 'n/a' }}
                </small>
              </div>
              <div class="playable-loop-inspection__cell">
                <span>Nav Path</span>
                <strong data-playable-loop="nav-path">
                  {{ store.runtimeSessionInspection().playableLoop.nav.pathHash || 'no path' }}
                </strong>
                <small>
                  {{ store.runtimeSessionInspection().playableLoop.nav.outcome || 'n/a' }}
                  · visited {{ store.runtimeSessionInspection().playableLoop.nav.visited ?? 'n/a' }}
                  · len {{ store.runtimeSessionInspection().playableLoop.nav.pathLength ?? 'n/a' }}
                </small>
              </div>
              <div class="playable-loop-inspection__cell">
                <span>Policy</span>
                <strong data-playable-loop="policy-summary">
                  {{ store.runtimeSessionInspection().playableLoop.policy.acceptedProposalCount ?? 'n/a' }} accepted
                  · {{ store.runtimeSessionInspection().playableLoop.policy.unsupportedProposalCount ?? 'n/a' }} unsupported
                </strong>
                <small>
                  {{ store.runtimeSessionInspection().playableLoop.policy.loopId || 'not run' }}
                  · {{ store.runtimeSessionInspection().playableLoop.policy.movementReason || 'movement ready' }}
                </small>
              </div>
              <div class="playable-loop-inspection__cell">
                <span>Combat</span>
                <strong data-playable-loop="combat-health">
                  @if (store.runtimeSessionInspection().playableLoop.selectedEntity?.health; as health) {
                    Health {{ health.current }}/{{ health.max }} {{ health.dead ? 'defeated' : 'active' }}
                  } @else {
                    Health n/a
                  }
                </strong>
                <small>
                  {{ store.runtimeSessionInspection().playableLoop.combat.status || 'not run' }}
                  · {{ store.runtimeSessionInspection().playableLoop.combat.outcomeKind || 'no outcome' }}
                </small>
              </div>
              <div class="playable-loop-inspection__cell">
                <span>Lifecycle</span>
                <strong data-playable-loop="lifecycle">
                  {{ store.runtimeSessionInspection().playableLoop.lifecycle.label || 'not attached' }}
                </strong>
                <small>
                  {{ store.runtimeSessionInspection().playableLoop.lifecycle.outcomeKind || 'n/a' }}
                  · {{ store.runtimeSessionInspection().playableLoop.lifecycle.eventKinds.join(', ') || 'no event' }}
                </small>
              </div>
              <div class="playable-loop-inspection__cell">
                <span>Selected Entity</span>
                @if (store.runtimeSessionInspection().playableLoop.selectedEntity; as entity) {
                  <strong data-playable-loop="selected-entity">{{ entity.label }}</strong>
                  <small>
                    {{ entity.pose.position?.join(',') || 'pose n/a' }}
                    · next {{ entity.pose.nextWaypoint?.join(',') || 'n/a' }}
                  </small>
                } @else {
                  <strong data-playable-loop="selected-entity">no runtime entity</strong>
                  <small>Attach the public RuntimeSession facade.</small>
                }
              </div>
              <div class="playable-loop-inspection__actions">
                <button
                  type="button"
                  [disabled]="!store.runtimeSessionInspection().playableLoop.controls.policyTick.available"
                  (click)="store.runPlayableLoopInspectionTick()"
                >
                  Run Policy
                </button>
                <button
                  type="button"
                  [disabled]="!store.runtimeSessionInspection().playableLoop.controls.restart.available"
                  (click)="store.restartPlayableLoopInspection()"
                >
                  Restart
                </button>
                <small data-playable-loop="restart-status">
                  @if (store.runtimeSessionInspection().playableLoop.restart.lastReceipt; as receipt) {
                    {{ receipt.status }} · {{ receipt.statusBefore }} -> {{ receipt.statusAfter }}
                  } @else {
                    {{ store.runtimeSessionInspection().playableLoop.restart.disabledReason || 'ready' }}
                  }
                </small>
              </div>
            </section>
          </div>
        </aside>
      }
    </section>
  `,
  styles: [
    `
      .runtime-tools-menu {
        background: var(--asha-color-chrome);
        box-sizing: border-box;
        display: grid;
        gap: 0;
        min-width: 0;
        position: relative;
      }

      .runtime-tools-menu__header {
        align-items: center;
        border-bottom: 1px solid var(--asha-color-border);
        display: flex;
        justify-content: space-between;
        min-width: 0;
        padding: 0.65rem 0.75rem;
      }

      .runtime-tools-menu__header div,
      .runtime-menu-section__heading {
        display: grid;
        gap: 0.1rem;
        min-width: 0;
      }

      .runtime-tools-menu__header small,
      .runtime-tools-menu__header span,
      .runtime-menu-section__heading small,
      .runtime-menu-note {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .runtime-tools-menu__tabs {
        border-bottom: 1px solid var(--asha-color-border);
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .runtime-tools-menu__tabs button,
      .gameplay-tools > button {
        background: transparent;
        border: 0;
        border-right: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        font-size: 0.72rem;
        min-height: 2rem;
        padding: 0 0.75rem;
      }

      .runtime-tools-menu__tabs button.is-current {
        background: var(--asha-color-control-active);
        color: var(--asha-color-accent-text);
      }

      .runtime-menu-section {
        box-sizing: border-box;
        display: grid;
        gap: 0.65rem;
        max-height: min(22rem, calc(100vh - 8rem));
        overflow: auto;
        padding: 0.75rem;
      }

      .runtime-menu-section[hidden] {
        display: none;
      }

      .session-line {
        align-items: center;
        display: flex;
        gap: 0.75rem;
        grid-column: 1 / -1;
        min-width: 0;
      }

      .scenario-load {
        display: grid;
        gap: 0.4rem;
        grid-template-columns: minmax(14rem, 1fr) auto;
        min-width: 0;
      }

      .scenario-load label {
        display: grid;
        gap: 0.2rem;
      }

      .scenario-load label span {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .scenario-load select,
      .scenario-load button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        font: inherit;
        height: 1.65rem;
        min-width: 0;
      }

      .scenario-load button {
        align-self: end;
        cursor: pointer;
        padding: 0 0.65rem;
      }

      .runtime-menu-note {
        grid-column: 1 / -1;
        white-space: normal;
      }

      .session-line strong,
      .session-line span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .workspace-overview {
        align-items: stretch;
        display: grid;
        gap: 0.35rem;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        min-height: 0;
        min-width: 0;
      }

      .workspace-overview__identity,
      .overview-cell,
      .workspace-overview__invalid {
        background: #10161b;
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.1rem;
        min-width: 0;
        overflow: hidden;
        padding: 0.28rem 0.38rem;
      }

      .workspace-overview__identity span,
      .overview-cell span,
      .overview-cell small,
      .workspace-overview__invalid span {
        color: var(--asha-color-muted);
        font-size: 0.62rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .workspace-overview__identity strong,
      .overview-cell strong,
      .workspace-overview__invalid strong {
        font-size: 0.68rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .overview-label,
      .overview-cell span {
        font-weight: 700;
        text-transform: uppercase;
      }

      .overview-cell--wide {
        min-width: 0;
      }

      .overview-cell--hash strong {
        color: var(--asha-color-accent-text);
        font-size: 0.62rem;
      }

      .workspace-overview__invalid {
        border-color: var(--asha-color-warning);
        grid-column: 1 / -1;
      }

      .runtime-inspection {
        align-items: stretch;
        display: grid;
        gap: 0.35rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        min-width: 0;
      }

      .runtime-inspection__identity,
      .runtime-inspection__cell,
      .runtime-inspection__actions {
        background: #10161b;
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.08rem;
        min-width: 0;
        overflow: hidden;
        padding: 0.26rem 0.36rem;
      }

      .runtime-inspection__identity span,
      .runtime-inspection__cell span,
      .runtime-inspection__identity small,
      .runtime-inspection__cell small {
        color: var(--asha-color-muted);
        font-size: 0.58rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .runtime-inspection__identity strong,
      .runtime-inspection__cell strong {
        font-size: 0.64rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .runtime-inspection__identity span,
      .runtime-inspection__cell span {
        font-weight: 700;
        text-transform: uppercase;
      }

      .runtime-inspection__actions {
        align-items: center;
        grid-column: 1 / -1;
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }

      .gameplay-tools {
        display: grid;
      }

      .gameplay-tools p {
        color: var(--asha-color-muted);
        font-size: 0.72rem;
        line-height: 1.45;
        margin: 0;
      }

      .gameplay-tools > button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        justify-self: start;
      }

      .runtime-inspection__actions button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        font-size: 0.62rem;
        height: 1.55rem;
        min-width: 0;
        padding: 0 0.35rem;
      }

      .runtime-inspection__actions button:disabled {
        color: #5b666c;
        cursor: not-allowed;
      }

      .runtime-inspection-popout {
        background: var(--asha-color-chrome);
        border: 1px solid var(--asha-color-accent);
        box-shadow: 0 1.5rem 3.5rem rgba(0, 0, 0, 0.45);
        box-sizing: border-box;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        inset: 4.75rem 1rem 1rem auto;
        max-width: calc(100vw - 2rem);
        min-height: 0;
        overflow: hidden;
        position: fixed;
        width: min(78rem, calc(100vw - 2rem));
        z-index: 50;
      }

      .runtime-inspection-popout__header {
        align-items: center;
        border-bottom: 1px solid var(--asha-color-border);
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        min-width: 0;
        padding: 0.65rem 0.75rem;
      }

      .runtime-inspection-popout__header div {
        display: grid;
        gap: 0.1rem;
        min-width: 0;
      }

      .runtime-inspection-popout__header span {
        color: var(--asha-color-muted);
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .runtime-inspection-popout__header strong {
        font-size: 0.82rem;
      }

      .runtime-inspection-popout__header button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        font-size: 0.68rem;
        height: 1.65rem;
        padding: 0 0.65rem;
      }

      .runtime-inspection-popout__body {
        align-content: start;
        display: grid;
        gap: 0.65rem;
        min-height: 0;
        overflow: auto;
        padding: 0.75rem;
      }

      .generated-level-inspection {
        align-items: stretch;
        display: grid;
        gap: 0.35rem;
        grid-column: 1 / -1;
        grid-template-columns: minmax(8rem, 0.9fr) repeat(6, minmax(7rem, 1fr)) minmax(11rem, auto);
        min-width: 0;
      }

      .runtime-inspection-popout .generated-level-inspection {
        border-bottom: 1px solid var(--asha-color-border);
        grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
        padding-bottom: 0.65rem;
      }

      .generated-level-inspection__cell,
      .generated-level-inspection__field,
      .generated-level-inspection__actions {
        background: #10161b;
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.08rem;
        min-width: 0;
        overflow: hidden;
        padding: 0.26rem 0.36rem;
      }

      .generated-level-inspection__cell span,
      .generated-level-inspection__cell small,
      .generated-level-inspection__field span,
      .generated-level-inspection__field small,
      .generated-level-inspection__actions small {
        color: var(--asha-color-muted);
        font-size: 0.56rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .generated-level-inspection__cell strong,
      .generated-level-inspection__field strong {
        font-size: 0.62rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .generated-level-inspection__cell span,
      .generated-level-inspection__field span {
        font-weight: 700;
        text-transform: uppercase;
      }

      .generated-level-inspection__field input,
      .generated-level-inspection__field select {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        font: inherit;
        font-size: 0.62rem;
        height: 1.45rem;
        min-width: 0;
      }

      .generated-level-inspection__actions {
        align-items: center;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .generated-level-inspection__actions small {
        grid-column: 1 / -1;
      }

      .generated-level-inspection__actions button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        font-size: 0.62rem;
        height: 1.45rem;
        min-width: 0;
        padding: 0 0.35rem;
      }

      .generated-level-inspection__actions button:disabled {
        color: #5b666c;
        cursor: not-allowed;
      }

      .playable-loop-inspection {
        align-items: stretch;
        display: grid;
        gap: 0.35rem;
        grid-column: 1 / -1;
        grid-template-columns: minmax(8rem, 0.95fr) repeat(7, minmax(6.5rem, 1fr)) minmax(10rem, auto);
        min-width: 0;
      }

      .runtime-inspection-popout .playable-loop-inspection {
        grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
      }

      .playable-loop-inspection__cell,
      .playable-loop-inspection__actions {
        background: #10161b;
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.08rem;
        min-width: 0;
        overflow: hidden;
        padding: 0.26rem 0.36rem;
      }

      .playable-loop-inspection__cell span,
      .playable-loop-inspection__cell small,
      .playable-loop-inspection__actions small {
        color: var(--asha-color-muted);
        font-size: 0.56rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .playable-loop-inspection__cell strong {
        font-size: 0.62rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .playable-loop-inspection__cell span {
        font-weight: 700;
        text-transform: uppercase;
      }

      .playable-loop-inspection__actions {
        align-items: center;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .playable-loop-inspection__actions small {
        grid-column: 1 / -1;
      }

      .playable-loop-inspection__actions button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        font-size: 0.62rem;
        height: 1.45rem;
        min-width: 0;
        padding: 0 0.35rem;
      }

      .playable-loop-inspection__actions button:disabled {
        color: #5b666c;
        cursor: not-allowed;
      }

      @media (max-width: 1100px) {
        .workspace-overview {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .runtime-inspection,
        .generated-level-inspection,
        .playable-loop-inspection {
          grid-template-columns: 1fr;
        }

        .runtime-inspection-popout {
          inset: 3.5rem 0.5rem 0.5rem;
          width: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioRuntimeToolsMenuComponent {
  readonly store = inject(StudioWorkspaceStore);
  readonly runtimeSections = [
    { id: 'session', label: 'Session' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'controls', label: 'Controls' },
    { id: 'gameplay', label: 'Gameplay' },
  ] as const;
  readonly activeSection = signal<(typeof this.runtimeSections)[number]['id']>('session');
  readonly playableLoopInspectorOpen = signal(false);

  setActiveSection(section: (typeof this.runtimeSections)[number]['id']): void {
    this.activeSection.set(section);
  }

  togglePlayableLoopInspector(): void {
    this.playableLoopInspectorOpen.update(open => !open);
  }

  closePlayableLoopInspector(): void {
    this.playableLoopInspectorOpen.set(false);
  }
}

type ViewportToolbarTool = {
  readonly id: StudioViewportToolMode;
  readonly icon: string;
  readonly title: string;
  readonly backedTool: StudioViewportToolMode;
  readonly requiresTransformEditable?: boolean;
};

@Component({
  selector: 'asha-viewport-toolbar-panel',
  standalone: true,
  template: `
    <section class="viewport-toolbar-panel" data-visual-id="studio-viewport-top-panel">
      <div class="tool-buttons" aria-label="Viewport tools">
        @for (tool of tools; track tool) {
          <button
            type="button"
            [attr.data-tool-id]="tool.id"
            [class.active]="tool.backedTool === store.viewportTool().activeTool"
            [disabled]="!isToolEnabled(tool)"
            [title]="toolTitle(tool)"
            [attr.aria-label]="toolTitle(tool)"
            (click)="activateTool(tool)"
          >
            {{ tool.icon }}
          </button>
        }
      </div>
      <div class="mode-buttons" aria-label="Voxel authoring mode">
        <button
          type="button"
          data-voxel-authoring-mode="object"
          [class.active]="store.voxelAuthoringMode().mode === 'object'"
          (click)="store.setVoxelAuthoringMode('object')"
        >Object</button>
        <button
          type="button"
          data-voxel-authoring-mode="edit"
          [class.active]="store.voxelAuthoringMode().mode === 'edit'"
          (click)="store.setVoxelAuthoringMode('edit')"
        >Voxel Edit</button>
        <button
          type="button"
          data-voxel-instance-action="duplicate"
          title="Duplicate the selected voxel scene instance"
          (click)="store.duplicateSelectedVoxelInstance()"
        >Duplicate</button>
      </div>
      <span class="active-pill" data-toolbar-readout="active-tool">
        {{ activeToolLabel() }}
      </span>
      <div class="mode-buttons" aria-label="Transform gizmo settings">
        <button
          type="button"
          data-transform-orientation="world"
          [class.active]="store.transformManipulatorOrientation() === 'world'"
          (click)="store.setTransformManipulatorOrientation('world')"
        >World</button>
        <button
          type="button"
          data-transform-orientation="local"
          [class.active]="store.transformManipulatorOrientation() === 'local'"
          (click)="store.setTransformManipulatorOrientation('local')"
        >Local</button>
        <button
          type="button"
          data-transform-snapping
          [class.active]="store.transformManipulatorSnapping()"
          (click)="store.setTransformManipulatorSnapping(!store.transformManipulatorSnapping())"
        >Snap</button>
        <button
          type="button"
          data-transform-history="undo"
          [disabled]="!store.sceneTransformHistory().canUndo"
          (click)="store.undoSceneTransformEdit()"
        >Undo</button>
        <button
          type="button"
          data-transform-history="redo"
          [disabled]="!store.sceneTransformHistory().canRedo"
          (click)="store.redoSceneTransformEdit()"
        >Redo</button>
      </div>
      <div class="mode-buttons" aria-label="Lighting preview mode">
        <button
          type="button"
          data-lighting-mode="work_light"
          [class.active]="store.renderSettings().lightingMode === 'work_light'"
          (click)="store.setLightingMode('work_light')"
        >Work Light</button>
        <button
          type="button"
          data-lighting-mode="authored_lights"
          [class.active]="store.renderSettings().lightingMode === 'authored_lights'"
          (click)="store.setLightingMode('authored_lights')"
        >Authored</button>
      </div>
      <strong class="viewport-title">
        Viewport - {{ store.viewportAdapter().selectedRenderableId ?? store.viewportAdapter().sceneId }}
      </strong>
      <div class="toolbar-state" aria-label="Viewport state">
        <span data-toolbar-readout="voxel-context" [title]="store.voxelAuthoringMode().message">
          {{ store.voxelAuthoringMode().activeInstanceId ?? 'no voxel context' }}
        </span>
        <span data-toolbar-readout="camera-mode">persp</span>
        <span data-toolbar-readout="lens">{{ store.viewportAdapter().camera.fovDegrees }}deg</span>
        <span data-toolbar-readout="grid">
          grid {{ store.effectiveSettings().grid.visible ? 'on' : 'off' }}
          · {{ store.effectiveSettings().grid.grid.spacing[0] }}m
          · {{ store.effectiveSettings().grid.snapAnchor === 'cellCenter' ? 'cell center' : 'boundary' }}
        </span>
        <span data-toolbar-readout="gizmos">gizmos ref</span>
        <span data-toolbar-readout="shading">
          shading: {{ store.viewportAdapter().renderSettings.wireframeEnabled ? 'wire' : 'solid' }}
        </span>
        <span data-toolbar-readout="lighting">
          lighting: {{ store.renderSettings().lightingMode === 'work_light' ? 'work' : 'authored' }}
          · {{ store.lightingProjection().activeLightCount }} active
        </span>
      </div>
      @if (store.voxelBrush().enabled) {
        <div class="voxel-brush-strip" aria-label="Voxel pointer tools" data-voxel-brush-strip>
          <strong>Voxel</strong>
          @for (tool of voxelBrushTools; track tool.id) {
            <button
              type="button"
              [attr.data-voxel-brush-tool]="tool.id"
              [class.active]="store.voxelBrush().tool === tool.id"
              [title]="tool.title"
              (click)="store.setVoxelBrushTool(tool.id)"
            >{{ tool.label }}</button>
          }
          <span class="voxel-brush-strip__divider"></span>
          <span>Material</span>
          @for (material of store.voxelBrush().materials; track material) {
            <button
              type="button"
              class="voxel-material"
              [class.active]="store.voxelBrush().material === material"
              [style.--voxel-material-color]="voxelMaterialColor(material)"
              [attr.data-voxel-brush-material]="material"
              [title]="'Voxel material ' + material"
              (click)="store.setVoxelBrushMaterial(material)"
            >{{ material }}</button>
          }
          <label>
            Brush
            <select
              data-voxel-brush-size
              [value]="store.voxelBrush().size"
              (change)="store.setVoxelBrushSize($any($event.target).valueAsNumber)"
            >
              <option [value]="1">1 cell</option>
              <option [value]="3">3 cube</option>
            </select>
          </label>
          <button
            type="button"
            data-voxel-brush-history="undo"
            [disabled]="!store.voxelBrush().canUndo"
            (click)="store.undoVoxelBrushStroke()"
          >Undo</button>
          <button
            type="button"
            data-voxel-brush-history="redo"
            [disabled]="!store.voxelBrush().canRedo"
            (click)="store.redoVoxelBrushStroke()"
          >Redo</button>
          <span
            class="voxel-brush-strip__result"
            [class.is-rejected]="store.voxelBrush().status === 'rejected'"
            data-voxel-brush-result
          >{{ store.voxelBrush().message }}</span>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .viewport-toolbar-panel {
        align-items: center;
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.55rem;
        grid-template-columns: auto auto auto auto minmax(9rem, 1fr) auto;
        grid-template-rows: 2.45rem minmax(2.2rem, auto);
        height: 100%;
        min-width: 0;
        overflow: hidden;
        padding: 0 0.55rem;
      }

      .viewport-toolbar-panel span,
      .viewport-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tool-buttons {
        display: flex;
        flex: 0 0 auto;
        gap: 0.18rem;
      }

      .mode-buttons {
        display: flex;
        gap: 0.18rem;
      }

      .mode-buttons button {
        background: transparent;
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-muted);
        font: 700 0.66rem var(--asha-font-ui);
        height: 1.45rem;
        padding: 0 0.42rem;
      }

      .mode-buttons button.active {
        background: var(--asha-color-accent);
        border-color: var(--asha-color-accent);
        color: #071219;
      }

      .tool-buttons button {
        background: transparent;
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: 700 0.68rem var(--asha-font-ui);
        height: 1.45rem;
        line-height: 1;
        min-width: 1.45rem;
        padding: 0 0.28rem;
      }

      .tool-buttons button.active {
        background: var(--asha-color-control);
        border-color: var(--asha-color-accent);
      }

      .tool-buttons button:disabled {
        color: #5b666c;
        cursor: not-allowed;
      }

      .active-pill {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-accent-text);
        font-size: 0.68rem;
        line-height: 1;
        padding: 0.28rem 0.5rem;
      }

      .viewport-title {
        color: var(--asha-color-muted);
        font: 700 0.76rem var(--asha-font-ui);
        justify-self: center;
        max-width: 100%;
      }

      .toolbar-state {
        color: var(--asha-color-muted);
        display: flex;
        font-size: 0.68rem;
        gap: 0.45rem;
        min-width: 0;
      }

      .toolbar-state span {
        flex: 0 1 auto;
      }

      .voxel-brush-strip {
        align-items: center;
        border-top: 1px solid var(--asha-color-border);
        display: flex;
        font: 700 0.67rem var(--asha-font-ui);
        gap: 0.25rem;
        grid-column: 1 / -1;
        min-width: 0;
        padding-top: 0.25rem;
      }

      .voxel-brush-strip button,
      .voxel-brush-strip select {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        font: inherit;
        height: 1.45rem;
        padding: 0 0.42rem;
      }

      .voxel-brush-strip button.active {
        border-color: var(--asha-color-accent);
        box-shadow: inset 0 0 0 1px var(--asha-color-accent);
      }

      .voxel-brush-strip button:disabled {
        color: #5b666c;
      }

      .voxel-brush-strip label {
        align-items: center;
        display: flex;
        gap: 0.25rem;
      }

      .voxel-brush-strip__divider {
        background: var(--asha-color-border);
        height: 1.2rem;
        width: 1px;
      }

      .voxel-material {
        border-left: 0.35rem solid var(--voxel-material-color) !important;
        min-width: 1.65rem;
      }

      .voxel-brush-strip__result {
        color: var(--asha-color-muted);
        flex: 1 1 auto;
        min-width: 6rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .voxel-brush-strip__result.is-rejected {
        color: #df9b75;
      }

      @media (max-width: 900px) {
        .toolbar-state {
          display: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioViewportToolbarPanelComponent {
  readonly store = inject(StudioWorkspaceStore);
  readonly voxelBrushTools = [
    { id: 'select', label: 'Select', title: 'Inspect a Rust-resolved local cell without changing it' },
    { id: 'add', label: 'Add', title: 'Place the active material at the authority-provided face anchor' },
    { id: 'paint', label: 'Paint', title: 'Replace the selected occupied cell material' },
    { id: 'erase', label: 'Erase', title: 'Write the canonical empty voxel value' },
  ] as const;

  voxelMaterialColor(material: number): string {
    return ['#a89b84', '#b7604f', '#9a713d', '#4f9cb7', '#8065b8'][material % 5] ?? '#a89b84';
  }
  readonly tools: readonly ViewportToolbarTool[] = [
    {
      id: 'select',
      icon: 'S',
      title: 'Select on tap',
      backedTool: 'select',
    },
    {
      id: 'pan',
      icon: 'P',
      title: 'Pan view on drag',
      backedTool: 'pan',
    },
    {
      id: 'orbit',
      icon: 'O',
      title: 'Rotate view on drag',
      backedTool: 'orbit',
    },
    {
      id: 'move_object',
      icon: 'M',
      title: 'Move object on drag',
      backedTool: 'move_object',
      requiresTransformEditable: true,
    },
    {
      id: 'rotate_object',
      icon: 'R',
      title: 'Rotate object on drag',
      backedTool: 'rotate_object',
      requiresTransformEditable: true,
    },
    {
      id: 'scale_object',
      icon: 'Z',
      title: 'Scale object with axis or uniform handles',
      backedTool: 'scale_object',
      requiresTransformEditable: true,
    },
    {
      id: 'frame',
      icon: 'F',
      title: 'Frame selected renderable',
      backedTool: 'frame',
    },
  ];

  activateTool(tool: ViewportToolbarTool): void {
    if (!this.isToolEnabled(tool)) {
      return;
    }
    this.store.setViewportTool(tool.backedTool);
    if (tool.backedTool === 'frame') {
      this.store.frameSelectedRenderable();
      this.store.setViewportTool('select');
    }
  }

  isToolEnabled(tool: ViewportToolbarTool): boolean {
    return tool.requiresTransformEditable === true
      ? this.store.selectedSceneObjectTransformEditable()
      : true;
  }

  toolTitle(tool: ViewportToolbarTool): string {
    if (!this.isToolEnabled(tool) && tool.requiresTransformEditable === true) {
      return `${tool.title} - select a transform-editable scene object`;
    }
    return tool.title;
  }

  activeToolLabel(): string {
    const labels: Record<StudioViewportToolMode, string> = {
      select: 'select',
      orbit: 'rotate view',
      pan: 'pan view',
      move_object: 'move object',
      rotate_object: 'rotate object',
      scale_object: 'scale object',
      frame: 'frame',
    };
    return labels[this.store.viewportTool().activeTool];
  }
}

@Component({
  selector: 'asha-hierarchy-panel',
  standalone: true,
  template: `
    <section class="hierarchy-panel" data-visual-id="studio-hierarchy-panel">
      <header class="panel-header">
        <div>
          <span class="panel-kicker">1 · Scene / Hierarchy</span>
          <strong>{{ store.workspace().session.scenarioLabel }}</strong>
        </div>
        <div class="header-actions" aria-label="Hierarchy actions">
          <button
            type="button"
            title="Rename selected scene object"
            [disabled]="selectedSceneObjectId() === null"
            (click)="renameSelectedSceneObject()"
          >
            R
          </button>
          <button
            type="button"
            title="Move selected scene object to root"
            [disabled]="selectedSceneObjectId() === null"
            (click)="moveSelectedSceneObjectToRoot()"
          >
            ^
          </button>
          <button type="button" title="Collapse hierarchy" (click)="store.setHierarchyExpanded(false)">
            -
          </button>
          <button type="button" title="Expand hierarchy" (click)="store.setHierarchyExpanded(true)">
            *
          </button>
          <button
            type="button"
            title="Focus selected"
            [disabled]="store.selectedRenderable() === null"
            (click)="store.frameSelectedRenderable()"
          >
            F
          </button>
        </div>
      </header>

      <div class="hierarchy-filter">
        <span aria-hidden="true">?</span>
        <input
          aria-label="Filter hierarchy"
          placeholder="Filter hierarchy"
          [value]="store.hierarchyFilter()"
          (input)="store.setHierarchyFilter($any($event.target).value)"
        />
      </div>

      <div class="tree-list" role="tree" aria-label="Scene hierarchy">
        @for (entity of visibleEntities(); track entity.id) {
          <div
            class="tree-row"
            draggable="true"
            [class.tree-row--selected]="entity.selected"
            [class.tree-row--static]="!entity.selectable"
            [class.tree-row--drop-target]="dropTargetSceneObjectId() === entity.sceneObjectId"
            [attr.data-scene-object-id]="entity.sceneObjectId"
            [attr.data-selected-entity]="entity.selected ? entity.id : null"
            [attr.role]="'treeitem'"
            [attr.aria-expanded]="hasChildren(entity) ? entity.expanded : null"
            [style.padding-left.px]="entity.depth * 10 + 6"
            (dragstart)="startDrag($event, entity)"
            (dragend)="endDrag()"
            (dragover)="dragOver($event, entity)"
            (dragleave)="dragLeave(entity)"
            (drop)="dropOnEntity($event, entity)"
          >
            <button
              class="tree-toggle"
              type="button"
              [class.tree-toggle--leaf]="!hasChildren(entity)"
              [disabled]="!hasChildren(entity)"
              [attr.aria-label]="(entity.expanded ? 'Collapse ' : 'Expand ') + entity.label"
              (pointerdown)="$event.stopPropagation()"
              (click)="toggleEntityExpansion($event, entity)"
            >
              {{ hasChildren(entity) ? (entity.expanded ? 'v' : '>') : '·' }}
            </button>
            <button
              class="tree-row__select"
              type="button"
              [disabled]="!entity.selectable"
              [attr.aria-label]="'Hierarchy row ' + entity.label"
              (click)="selectEntity(entity)"
            >
              <span class="tree-icon">{{ iconForKind(entity.kind) }}</span>
              <span class="tree-label">{{ entity.label }}</span>
              <small
                class="tree-badge"
                [class.tree-badge--authority-backed]="entity.badge === 'authority-backed'"
                [class.tree-badge--preview-only]="entity.badge === 'preview-only'"
                [class.tree-badge--projected]="entity.badge === 'projected'"
                [class.tree-badge--reference]="entity.badge === 'reference'"
                [class.tree-badge--selected]="entity.badge === 'selected'"
              >
                {{ entity.badge }}
              </small>
            </button>
          </div>
        }
      </div>

      <footer class="state-legend" aria-label="State legend">
        <span>projected</span>
        <span>authority</span>
        <span>preview</span>
        <span>selected</span>
      </footer>
    </section>
  `,
  styles: [
    `
      .hierarchy-panel {
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.45rem;
        grid-template-rows: auto auto minmax(0, 1fr) auto;
        height: 100%;
        min-width: 0;
        overflow: hidden;
        padding: 0.5rem;
      }

      .panel-header {
        align-items: center;
        display: grid;
        gap: 0.35rem;
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .panel-header div:first-child {
        display: grid;
        gap: 0.08rem;
        min-width: 0;
      }

      .panel-header strong,
      .tree-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .panel-kicker {
        color: var(--asha-color-muted);
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .header-actions {
        display: flex;
        gap: 0.18rem;
      }

      .header-actions button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        font-size: 0.72rem;
        height: 1.35rem;
        line-height: 1;
        min-width: 1.35rem;
        padding: 0;
      }

      .hierarchy-filter {
        align-items: center;
        background: #10161b;
        border: 1px solid var(--asha-color-border);
        display: grid;
        gap: 0.35rem;
        grid-template-columns: auto minmax(0, 1fr);
        min-width: 0;
        padding: 0 0.35rem;
      }

      .hierarchy-filter span {
        color: var(--asha-color-muted);
        font-size: 0.65rem;
      }

      .hierarchy-filter input {
        background: transparent;
        border: 0;
        color: var(--asha-color-ink);
        font: inherit;
        font-size: 0.72rem;
        height: 1.45rem;
        min-width: 0;
        outline: none;
      }

      .header-actions button:disabled {
        color: #5b666c;
        cursor: not-allowed;
      }

      .tree-list {
        align-content: start;
        display: grid;
        gap: 0.04rem;
        min-height: 0;
        overflow: auto;
      }

      .tree-row {
        align-items: center;
        background: transparent;
        border: 1px solid transparent;
        color: var(--asha-color-ink);
        display: flex;
        gap: 0.08rem;
        min-height: 1.45rem;
        min-width: 0;
        padding-right: 0.25rem;
      }

      .tree-row:hover,
      .tree-row--selected {
        background: var(--asha-color-control);
      }

      .tree-row--selected {
        border-color: var(--asha-color-accent);
      }

      .tree-row--drop-target {
        background: rgba(84, 199, 189, 0.16);
        border-color: var(--asha-color-accent);
      }

      .tree-row__select {
        align-items: center;
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
        display: flex;
        flex: 1 1 auto;
        font: inherit;
        font-size: 0.76rem;
        gap: 0.28rem;
        min-height: 1.35rem;
        min-width: 0;
        padding: 0;
        text-align: left;
      }

      .tree-row__select:disabled {
        cursor: default;
      }

      .tree-toggle {
        background: transparent;
        border: 0;
        color: var(--asha-color-muted);
        cursor: pointer;
        flex: 0 0 auto;
        font: inherit;
        font-size: 0.62rem;
        height: 1.2rem;
        padding: 0;
        text-align: center;
        width: 0.9rem;
      }

      .tree-toggle:disabled,
      .tree-toggle--leaf {
        cursor: default;
        opacity: 0.45;
      }

      .tree-icon {
        color: var(--asha-color-muted);
        flex: 0 0 auto;
        font-size: 0.62rem;
        text-align: center;
        width: 0.7rem;
      }

      .tree-label {
        flex: 1 1 auto;
      }

      .tree-badge {
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-muted);
        flex: 0 0 auto;
        font-size: 0.56rem;
        line-height: 1;
        padding: 0.14rem 0.22rem;
      }

      .tree-badge--authority-backed,
      .tree-badge--selected {
        border-color: var(--asha-color-accent);
        color: var(--asha-color-accent-text);
      }

      .tree-badge--preview-only {
        border-color: var(--asha-color-warning);
        color: var(--asha-color-warning-text);
      }

      .state-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.28rem;
      }

      .state-legend span {
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-muted);
        font-size: 0.56rem;
        padding: 0.14rem 0.22rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioHierarchyPanelComponent {
  readonly store = inject(StudioWorkspaceStore);
  readonly visibleEntities = computed(() =>
    filteredHierarchyEntities(this.store.workspace().entities, this.store.hierarchyFilter()),
  );
  readonly selectedSceneObjectId = computed(() => this.store.selectedEntity()?.sceneObjectId ?? null);
  readonly draggingSceneObjectId = signal<SceneObjectId | null>(null);
  readonly dropTargetSceneObjectId = signal<SceneObjectId | null>(null);

  hasChildren(entity: StudioEntityReadModel): boolean {
    return hierarchyEntityHasChildren(this.store.workspace().entities, entity);
  }

  selectEntity(entity: StudioEntityReadModel): void {
    if (!entity.selectable) return;
    this.store.selectEntity(entity.id);
  }

  toggleEntityExpansion(event: Event, entity: StudioEntityReadModel): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.hasChildren(entity)) return;
    this.store.setHierarchyEntityExpanded(entity.id, !entity.expanded);
  }

  renameSelectedSceneObject(): void {
    const objectId = this.selectedSceneObjectId();
    if (objectId === null) {
      return;
    }
    const currentLabel = this.store.selectedEntity()?.label ?? '';
    const label = globalThis.prompt?.('Scene object name', currentLabel) ?? null;
    if (label === null) {
      return;
    }
    this.store.renameSceneObject(objectId, label);
  }

  moveSelectedSceneObjectToRoot(): void {
    const objectId = this.selectedSceneObjectId();
    if (objectId === null) {
      return;
    }
    this.store.reparentSceneObject(objectId, null, 0);
  }

  startDrag(event: DragEvent, entity: StudioEntityReadModel): void {
    const target = event.target;
    if (
      entity.sceneObjectId === null
      || (target instanceof Element && target.closest('.tree-toggle') !== null)
    ) {
      event.preventDefault();
      return;
    }
    this.draggingSceneObjectId.set(entity.sceneObjectId);
    event.dataTransfer?.setData('text/plain', entity.sceneObjectId);
    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  endDrag(): void {
    this.draggingSceneObjectId.set(null);
    this.dropTargetSceneObjectId.set(null);
  }

  dragOver(event: DragEvent, entity: StudioEntityReadModel): void {
    const draggedObjectId = this.draggingSceneObjectId();
    if (
      draggedObjectId === null
      || entity.sceneObjectId === null
      || entity.sceneObjectId === draggedObjectId
    ) {
      return;
    }
    event.preventDefault();
    this.dropTargetSceneObjectId.set(entity.sceneObjectId);
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  dragLeave(entity: StudioEntityReadModel): void {
    if (this.dropTargetSceneObjectId() === entity.sceneObjectId) {
      this.dropTargetSceneObjectId.set(null);
    }
  }

  dropOnEntity(event: DragEvent, entity: StudioEntityReadModel): void {
    event.preventDefault();
    const draggedObjectId = this.draggingSceneObjectId()
      ?? event.dataTransfer?.getData('text/plain')
      ?? null;
    const targetObjectId = entity.sceneObjectId;
    this.endDrag();
    if (
      draggedObjectId === null
      || targetObjectId === null
      || draggedObjectId === targetObjectId
    ) {
      return;
    }
    const childOrder = this.store
      .workspace()
      .sceneObjectSnapshot.objects.filter(object => object.parentObjectId === targetObjectId).length;
    this.store.reparentSceneObject(draggedObjectId as SceneObjectId, targetObjectId, childOrder);
  }

  iconForKind(kind: StudioEntityKind): string {
    const labels: Record<StudioEntityKind, string> = {
      session: 'S',
      scene: '#',
      collection: 'A',
      empty_group: 'O',
      entity_instance: 'E',
      scene_bootstrap: 'B',
      sprite: 'I',
      voxel_grid: 'G',
      voxel_cell: 'V',
      static_mesh: 'M',
      preview_ghost: 'P',
    };
    return labels[kind];
  }
}

@Component({
  selector: 'asha-inspector-panel',
  standalone: true,
  template: `
    <section class="inspector-panel" data-visual-id="studio-inspector-panel">
      <header class="inspector-header">
        <span class="panel-kicker">6 · Inspector</span>
        <span class="inspector-context">stored scene · Rust validated</span>
      </header>

      @if (store.selectedRenderable(); as renderable) {
        <div class="object-summary">
          <span class="object-chip">{{ iconForRenderable(renderable) }}</span>
          <div>
            <strong>{{ renderable.label }}</strong>
            <span>{{ renderable.renderableId }}</span>
          </div>
        </div>

        <div class="state-cards">
          <article>
            <span>Preview</span>
            <strong>{{ renderable.visible ? 'visible' : 'hidden' }}</strong>
            <small>{{ renderable.pickable ? 'pickable' : 'read-only pick' }}</small>
          </article>
          <article class="state-cards__applied">
            <span>Applied</span>
            <strong>{{ renderable.sourceState }}</strong>
            <small>timeline {{ store.workspace().timelineSequence }}</small>
          </article>
        </div>

        <div class="inspector-scroll">
          <section class="field-section">
            <h2>Identity</h2>
            <dl>
              <dt>name</dt>
              <dd>
                <div class="editable-field">
                  <input
                    aria-label="Selected scene object name"
                    [value]="store.selectedEntity()?.label ?? renderable.label"
                    (change)="renameSelectedSceneObject($any($event.target).value)"
                  />
                </div>
              </dd>
              <dt>kind</dt>
              <dd>{{ renderable.kind }}</dd>
              <dt>mesh</dt>
              <dd>{{ renderable.meshRef ?? 'none' }}</dd>
              <dt>material</dt>
              <dd>{{ renderable.materialRef ?? 'none' }}</dd>
            </dl>
          </section>

          @if (selectedEntityInstance(); as instanceNode) {
            <section class="field-section" data-inspector-section="entity-instance">
              <h2>Entity Instance</h2>
              <dl>
                <dt>instance</dt>
                <dd>{{ instanceNode.kind.instance.instanceId }}</dd>
                <dt>reference</dt>
                <dd>
                  <button type="button" (click)="openEntityInstanceReference(instanceNode)">
                    {{ entityReferenceLabel(instanceNode) }}
                  </button>
                </dd>
                <dt>spawn marker</dt>
                <dd>
                  @if (instanceNode.kind.instance.spawnMarkerId; as markerId) {
                    <button type="button" (click)="store.navigateProjectContentReference('spawnMarker', markerId)">
                      {{ markerId }}
                    </button>
                  } @else {
                    none
                  }
                </dd>
                <dt>placement</dt>
                <dd>stored local transform · runtime seeds a fresh authority transform</dd>
              </dl>
            </section>
          }

          <section class="field-section" data-inspector-section="asset-details">
            <h2>Asset Details</h2>
            <dl>
              <dt>asset type</dt>
              <dd>{{ assetTypeLabel(renderable) }}</dd>
              <dt>renderable</dt>
              <dd>{{ renderable.renderableId }}</dd>
              <dt>mesh asset</dt>
              <dd>{{ renderable.meshRef ?? 'none' }}</dd>
              <dt>material asset</dt>
              <dd>{{ renderable.materialRef ?? 'none' }}</dd>
              <dt>selection source</dt>
              <dd>{{ store.selectedEntity()?.sceneObjectId ?? 'asset projection' }}</dd>
            </dl>
          </section>

          <section class="field-section">
            <h2>Transform Readout</h2>
            <dl>
              <dt>bounds</dt>
              <dd>{{ selectedBoundsLabel() }}</dd>
              <dt>center</dt>
              <dd>{{ selectedCenterLabel() }}</dd>
              <dt>source</dt>
              <dd>{{ renderable.sourceState }}</dd>
            </dl>
            @if (selectedSceneTransform(); as transform) {
              <div class="transform-editor" data-inspector-transform-editor>
                <strong>Position</strong>
                @for (axis of [0, 1, 2]; track axis) {
                  <label>
                    {{ ['X', 'Y', 'Z'][axis] }}
                    <input
                      type="number"
                      step="0.25"
                      [value]="transform.translation[axis]"
                      [attr.data-transform-position-axis]="axis"
                      (change)="setTransformAxis('translation', axis, $any($event.target).valueAsNumber)"
                    />
                  </label>
                }
                <strong>Rotation Quaternion</strong>
                @for (axis of [0, 1, 2, 3]; track axis) {
                  <label>
                    {{ ['X', 'Y', 'Z', 'W'][axis] }}
                    <input
                      type="number"
                      step="0.05"
                      [value]="transform.rotation[axis]"
                      [attr.data-transform-rotation-axis]="axis"
                      (change)="setTransformAxis('rotation', axis, $any($event.target).valueAsNumber)"
                    />
                  </label>
                }
                <strong>Scale</strong>
                @for (axis of [0, 1, 2]; track axis) {
                  <label>
                    {{ ['X', 'Y', 'Z'][axis] }}
                    <input
                      type="number"
                      min="0.001"
                      step="0.1"
                      [value]="transform.scale[axis]"
                      [attr.data-transform-scale-axis]="axis"
                      (change)="setTransformAxis('scale', axis, $any($event.target).valueAsNumber)"
                    />
                  </label>
                }
              </div>
            }
          </section>

          @if (store.selectedAuthoredLight(); as lightNode) {
            <section class="field-section" data-inspector-section="authored-light">
              <h2>{{ lightNode.kind.sceneLight.kind }} Light</h2>
              <label>
                <input
                  type="checkbox"
                  [checked]="lightNode.kind.sceneLight.enabled"
                  (change)="store.setSelectedLightEnabled($any($event.target).checked)"
                />
                Enabled
              </label>
              <strong>Linear RGB Color</strong>
              @for (axis of [0, 1, 2]; track axis) {
                <label>
                  {{ ['R', 'G', 'B'][axis] }}
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    [value]="lightNode.kind.sceneLight.color[axis]"
                    [attr.data-light-color-axis]="axis"
                    (change)="store.setSelectedLightColorAxis(axis, $any($event.target).valueAsNumber)"
                  />
                </label>
              }
              <label>
                Intensity
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  data-light-field="intensity"
                  [value]="lightNode.kind.sceneLight.intensity"
                  (change)="store.setSelectedLightIntensity($any($event.target).valueAsNumber)"
                />
              </label>
              @if (lightNode.kind.sceneLight.kind === 'point' || lightNode.kind.sceneLight.kind === 'spot') {
                <label>
                  Range (0 for unlimited)
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    data-light-field="range"
                    [value]="lightNode.kind.sceneLight.range ?? 0"
                    (change)="store.setSelectedLightRange($any($event.target).valueAsNumber === 0 ? null : $any($event.target).valueAsNumber)"
                  />
                </label>
                <label>
                  Decay
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    data-light-field="decay"
                    [value]="lightNode.kind.sceneLight.decay"
                    (change)="store.setSelectedLightDecay($any($event.target).valueAsNumber)"
                  />
                </label>
              }
              @if (lightNode.kind.sceneLight.kind === 'spot') {
                <label>
                  Cone (radians)
                  <input
                    type="number"
                    min="0.01"
                    max="1.56"
                    step="0.05"
                    data-light-field="outer-angle"
                    [value]="lightNode.kind.sceneLight.outerAngleRadians"
                    (change)="store.setSelectedSpotCone($any($event.target).valueAsNumber)"
                  />
                </label>
                <label>
                  Penumbra
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    data-light-field="penumbra"
                    [value]="lightNode.kind.sceneLight.penumbra"
                    (change)="store.setSelectedSpotPenumbra($any($event.target).valueAsNumber)"
                  />
                </label>
              }
              <label>
                <input
                  type="checkbox"
                  [checked]="lightNode.kind.sceneLight.shadowIntent === 'requested'"
                  (change)="store.setSelectedLightShadowIntent($any($event.target).checked)"
                />
                Request shadows
              </label>
              <small data-light-shadow-capability>
                Shadow requests are retained. The renderer reports active or degraded support; Studio does not fake availability.
              </small>
              <small>Directional and spot lights point along local −Z from the stored scene transform.</small>
            </section>
          }
        </div>
      } @else if (selectedSceneBootstrap(); as bootstrapNode) {
        <div class="object-summary">
          <span class="object-chip">B</span>
          <div>
            <strong>{{ bootstrapNode.label ?? 'Scene Bootstrap' }}</strong>
            <span>scene-node:{{ bootstrapNode.id }}</span>
          </div>
        </div>
        <div class="inspector-scroll">
          <section class="field-section" data-inspector-section="scene-bootstrap">
            <h2>Scene Bootstrap</h2>
            <small>Stored generator and catalog inputs are resolved atomically by Rust when a fresh RuntimeSession starts.</small>
            @if (bootstrapNode.kind.bindings.generator; as generator) {
              <dl>
                <dt>generator provider</dt>
                <dd>{{ generator.providerId }}</dd>
                <dt>preset</dt>
                <dd>{{ generator.presetId }}</dd>
                <dt>seed</dt>
                <dd>{{ generator.seed }}</dd>
              </dl>
            } @else {
              <p class="empty-state">No procedural generator binding.</p>
            }
            <h2>Catalog Bindings</h2>
            @for (catalog of bootstrapNode.kind.bindings.catalogs; track catalog.bindingId) {
              <dl data-bootstrap-catalog-binding>
                <dt>{{ catalog.bindingId }}</dt>
                <dd>{{ catalog.catalogId }}</dd>
                <dt>source</dt>
                <dd>
                  <button type="button" (click)="store.navigateProjectContentReference('source', catalog.sourcePath)">
                    {{ catalog.sourcePath }}
                  </button>
                </dd>
              </dl>
            } @empty {
              <p class="empty-state">No catalog bindings.</p>
            }
          </section>
        </div>
      } @else {
        <p class="empty-state">Select a scene object to inspect its stored authoring data.</p>
      }
    </section>
  `,
  styles: [
    `
      .inspector-panel {
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.65rem;
        grid-template-rows: auto auto auto minmax(0, 1fr);
        height: 100%;
        min-width: 0;
        overflow: hidden;
        padding: 0.65rem;
      }

      .inspector-header {
        align-items: center;
        display: flex;
        gap: 0.5rem;
        justify-content: space-between;
        min-width: 0;
      }

      .panel-kicker,
      .inspector-context {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .inspector-context {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .object-summary {
        align-items: center;
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        display: grid;
        gap: 0.55rem;
        grid-template-columns: auto minmax(0, 1fr);
        min-width: 0;
        padding: 0.5rem;
      }

      .object-chip {
        align-items: center;
        background: #c98e4d;
        color: #111820;
        display: inline-flex;
        font-size: 0.8rem;
        font-weight: 800;
        height: 2rem;
        justify-content: center;
        width: 2rem;
      }

      .transform-editor {
        display: grid;
        gap: 0.3rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 0.55rem;
      }

      .transform-editor > strong,
      .transform-editor > small {
        grid-column: 1 / -1;
      }

      .transform-editor label {
        color: var(--asha-color-muted);
        display: grid;
        font-size: 0.68rem;
        gap: 0.18rem;
      }

      .transform-editor input {
        min-width: 0;
        width: 100%;
      }

      .object-summary div {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .object-summary strong,
      .object-summary span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .object-summary span {
        color: var(--asha-color-muted);
        font-size: 0.72rem;
      }

      .state-cards {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .state-cards article {
        border: 1px solid #2d5b78;
        display: grid;
        gap: 0.2rem;
        min-width: 0;
        padding: 0.45rem;
      }

      .state-cards__applied {
        border-color: #317351;
      }

      .state-cards span,
      .state-cards small {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
      }

      .state-cards strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .inspector-scroll {
        align-content: start;
        display: grid;
        gap: 0.7rem;
        min-height: 0;
        overflow: auto;
      }

      .field-section {
        display: grid;
        gap: 0.35rem;
      }

      .field-section h2 {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        margin: 0;
        text-transform: uppercase;
      }

      dl {
        display: grid;
        gap: 0.35rem 0.65rem;
        grid-template-columns: max-content minmax(0, 1fr);
        margin: 0;
      }

      dt {
        color: var(--asha-color-muted);
        font-size: 0.72rem;
      }

      dd {
        margin: 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      dd button {
        background: transparent;
        border: 0;
        color: var(--asha-color-accent-text);
        cursor: pointer;
        font: inherit;
        max-width: 100%;
        overflow: hidden;
        padding: 0;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .editable-field {
        min-width: 0;
      }

      .editable-field input {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        color: var(--asha-color-ink);
        font: inherit;
        height: 1.65rem;
        min-width: 0;
        padding: 0 0.4rem;
        width: 100%;
      }

      .empty-state {
        color: var(--asha-color-muted);
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioInspectorPanelComponent {
  readonly store = inject(StudioWorkspaceStore);

  readonly selectedSceneNode = computed<SceneNodeRecord | null>(() => {
    const objectId = this.store.selectedEntity()?.sceneObjectId ?? null;
    if (objectId === null || !objectId.startsWith('scene-node:')) return null;
    const nodeId = Number.parseInt(objectId.slice('scene-node:'.length), 10);
    return this.store.workspace().flatSceneDocument.nodes.find(
      node => (node.id as number) === nodeId,
    ) ?? null;
  });

  readonly selectedEntityInstance = computed<(SceneNodeRecord & {
    readonly kind: Extract<SceneNodeRecord['kind'], { readonly kind: 'entityInstance' }>;
  }) | null>(() => {
    const node = this.selectedSceneNode();
    return node?.kind.kind === 'entityInstance'
      ? node as SceneNodeRecord & { readonly kind: Extract<SceneNodeRecord['kind'], { readonly kind: 'entityInstance' }> }
      : null;
  });

  readonly selectedSceneBootstrap = computed<(SceneNodeRecord & {
    readonly kind: Extract<SceneNodeRecord['kind'], { readonly kind: 'bootstrap' }>;
  }) | null>(() => {
    const node = this.selectedSceneNode();
    return node?.kind.kind === 'bootstrap'
      ? node as SceneNodeRecord & { readonly kind: Extract<SceneNodeRecord['kind'], { readonly kind: 'bootstrap' }> }
      : null;
  });

  readonly selectedSceneTransform = computed(() => {
    if (!this.store.selectedSceneObjectTransformEditable()) return null;
    return this.selectedSceneNode()?.transform ?? null;
  });

  entityReferenceLabel(node: SceneNodeRecord & {
    readonly kind: Extract<SceneNodeRecord['kind'], { readonly kind: 'entityInstance' }>;
  }): string {
    const reference = node.kind.instance.reference;
    if (reference.kind === 'entityDefinition') {
      return `EntityDefinition ${reference.stableId}`;
    }
    return `Prefab ${reference.prefabId}${reference.variantId === null ? '' : ` · variant ${reference.variantId}`}`;
  }

  openEntityInstanceReference(node: SceneNodeRecord & {
    readonly kind: Extract<SceneNodeRecord['kind'], { readonly kind: 'entityInstance' }>;
  }): void {
    const reference = node.kind.instance.reference;
    if (reference.kind === 'entityDefinition') {
      this.store.navigateProjectContentReference('entityDefinition', reference.stableId);
      return;
    }
    this.store.navigateProjectContentReference('prefab', String(reference.prefabId));
  }

  readonly selectedBoundsLabel = computed(() => {
    const renderable = this.store.selectedRenderable();
    if (renderable === null) {
      return 'none';
    }
    return this.formatBounds(renderable.bounds);
  });

  readonly selectedCenterLabel = computed(() => {
    const renderable = this.store.selectedRenderable();
    if (renderable === null) {
      return 'none';
    }
    const center = {
      x: (renderable.bounds.min.x + renderable.bounds.max.x) / 2,
      y: (renderable.bounds.min.y + renderable.bounds.max.y) / 2,
      z: (renderable.bounds.min.z + renderable.bounds.max.z) / 2,
    };
    return `${center.x}, ${center.y}, ${center.z}`;
  });

  iconForRenderable(renderable: StudioSceneRenderableReadModel): string {
    const labels: Record<StudioSceneRenderableReadModel['kind'], string> = {
      voxel_grid: 'G',
      voxel_cell: 'V',
      static_mesh: 'M',
      preview_ghost: 'P',
    };
    return labels[renderable.kind];
  }

  assetTypeLabel(renderable: StudioSceneRenderableReadModel): string {
    if (renderable.kind === 'static_mesh') {
      return 'static mesh';
    }
    if (renderable.kind === 'preview_ghost') {
      return 'preview projection';
    }
    return 'generated voxel asset';
  }

  renameSelectedSceneObject(label: string): void {
    const objectId = this.store.selectedEntity()?.sceneObjectId ?? null;
    if (objectId === null) {
      return;
    }
    this.store.renameSceneObject(objectId, label);
  }

  setTransformAxis(
    field: 'translation' | 'rotation' | 'scale',
    axis: number,
    value: number,
  ): void {
    const transform = this.selectedSceneTransform();
    const maximumAxis = field === 'rotation' ? 3 : 2;
    if (transform === null || axis < 0 || axis > maximumAxis) return;
    const next = transform[field].map(
      (entry, index) => index === axis ? value : entry,
    );
    if (field === 'rotation') {
      this.store.setSelectedSceneObjectTransform({
        rotation: next as unknown as readonly [number, number, number, number],
      });
      return;
    }
    const vector = next as unknown as readonly [number, number, number];
    this.store.setSelectedSceneObjectTransform({ [field]: vector });
  }

  private formatBounds(bounds: StudioBounds): string {
    const min = `${bounds.min.x},${bounds.min.y},${bounds.min.z}`;
    const max = `${bounds.max.x},${bounds.max.y},${bounds.max.z}`;
    return `[${min}] to [${max}]`;
  }
}

@Component({
  selector: 'asha-assets-bottom-panel',
  standalone: true,
  template: `
    <section class="assets-bottom-panel" data-visual-id="studio-assets-panel">
      <header>
        <span class="panel-kicker">5 · Bottom Panel</span>
        <div class="tabs" role="tablist" aria-label="Bottom panel views">
          <button
            type="button"
            [class.active]="store.bottomPanelTab() === 'timeline'"
            (click)="store.setBottomPanelTab('timeline')"
          >
            Timeline
          </button>
          <button
            type="button"
            [class.active]="store.bottomPanelTab() === 'project-content'"
            (click)="store.setBottomPanelTab('project-content')"
          >
            Project Content
          </button>
          <button
            type="button"
            [class.active]="store.bottomPanelTab() === 'assets'"
            (click)="store.setBottomPanelTab('assets')"
          >
            Assets
          </button>
          <button
            type="button"
            [class.active]="store.bottomPanelTab() === 'catalog'"
            (click)="store.setBottomPanelTab('catalog')"
          >
            Catalog
          </button>
          <button
            type="button"
            [class.active]="store.bottomPanelTab() === 'commands'"
            (click)="store.setBottomPanelTab('commands')"
          >
            Commands
          </button>
        </div>
      </header>

      @if (store.bottomPanelTab() === 'timeline') {
        <div class="timeline-table-wrap">
          <table class="timeline-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Command</th>
                <th>Status</th>
                <th>Source</th>
                <th>Result</th>
                <th>T+</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of store.workspace().timeline; track entry.sequenceId; let index = $index) {
                <tr [class.timeline-table__latest]="index === store.workspace().timeline.length - 1">
                  <td>{{ entry.sequenceId }}</td>
                  <td>
                    <strong>{{ entry.commandId }}</strong>
                    <span>{{ entry.inputSummary }}</span>
                  </td>
                  <td>{{ entry.status }}</td>
                  <td>{{ entry.requestedBy }}</td>
                  <td>{{ resultLabel(entry) }}</td>
                  <td>{{ elapsedLabel(index) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (store.bottomPanelTab() === 'project-content') {
        <div class="project-content-browser" data-visual-id="studio-project-content-browser">
          @if (store.projectContentBrowser(); as browser) {
            <header class="project-content-toolbar">
              <div>
                <strong>Stored Project Content</strong>
                <span>{{ browser.status }} · {{ browser.providerSchemaCount }} provider schemas</span>
                <small>{{ browser.projectRoot ?? 'No project open' }}</small>
              </div>
              <button type="button" (click)="reloadProjectContent()">Reload from Disk</button>
              <button
                type="button"
                [disabled]="!browser.canSaveSelected"
                (click)="saveProjectContent()"
              >
                Save Accepted Change
              </button>
            </header>
            <section class="project-content-message" [attr.data-project-content-status]="browser.status">
              {{ browser.message }}
            </section>
            @if (browser.staleSourcePath !== null) {
              <section class="project-content-stale" data-project-content-stale="true">
                The host file changed outside Studio: {{ browser.staleSourcePath }}. Reload from disk before saving.
              </section>
            }
            <div class="project-content-grid">
              <nav class="project-content-tree" aria-label="Stored project content">
                @for (category of browser.categories; track category.categoryId) {
                  <section>
                    <header>
                      <strong>{{ category.label }}</strong>
                      <span>{{ category.entries.length }}</span>
                    </header>
                    @for (entry of category.entries; track entry.entryId) {
                      <button
                        type="button"
                        [class.is-current]="entry.entryId === browser.selectedEntryId"
                        [attr.data-project-content-entry]="entry.entryId"
                        [attr.data-project-content-entry-status]="entry.status"
                        (click)="store.selectProjectContentEntry(entry.entryId)"
                      >
                        <strong>{{ entry.title }}</strong>
                        <span>{{ entry.subtitle }}</span>
                        <small>{{ entry.status }}</small>
                      </button>
                    } @empty {
                      <p>No manifest-discovered sources.</p>
                    }
                  </section>
                }
              </nav>
              <section class="project-content-inspector">
                @if (browser.selectedEntry; as entry) {
                  <header>
                    <div>
                      <strong>{{ entry.title }}</strong>
                      <span>{{ entry.documentKind }} · {{ entry.status }}</span>
                    </div>
                    @if (browser.dirtyDocumentIds.includes(entry.documentId)) {
                      <span class="project-content-dirty">Unsaved accepted change</span>
                    }
                  </header>
                  <dl>
                    <dt>stored source</dt>
                    <dd>{{ entry.sourcePath }}</dd>
                    <dt>document</dt>
                    <dd>{{ entry.documentId }}</dd>
                  </dl>
                  @if (entry.documentKind === 'scene') {
                    <button type="button" (click)="openProjectContentScene(entry.sourcePath)">
                      Open Stored Scene
                    </button>
                  }
                  @if (entry.details.length > 0) {
                    <section class="project-content-details">
                      <strong>Typed Readout</strong>
                      @for (detail of entry.details; track detail) {
                        <span>{{ detail }}</span>
                      }
                    </section>
                  }
                  @if (entry.relationships.length > 0) {
                    <section class="project-content-relationships">
                      <strong>Stored Relationships</strong>
                      @for (relationship of entry.relationships; track relationship.navigationKind + ':' + relationship.targetId) {
                        <button
                          type="button"
                          (click)="store.navigateProjectContentReference(relationship.navigationKind, relationship.targetId)"
                        >
                          {{ relationship.label }}
                        </button>
                      }
                    </section>
                  }
                  @if (browser.editableFields.length > 0) {
                    <section class="project-content-fields" data-project-content-typed-fields>
                      <strong>Provider-owned Configuration</strong>
                      @for (field of browser.editableFields; track field.configurationId + ':' + field.fieldId) {
                        <label>
                          <span>{{ field.label }}{{ field.required ? ' *' : '' }}</span>
                          @if (field.valueKind === 'boolean') {
                            <input
                              type="checkbox"
                              [checked]="field.value"
                              (change)="store.applyProjectConfigurationField(field.documentId, field.configurationId, field.fieldId, $any($event.target).checked)"
                            />
                          } @else if (field.valueKind === 'reference') {
                            <select
                              [value]="field.value"
                              (change)="store.applyProjectConfigurationField(field.documentId, field.configurationId, field.fieldId, $any($event.target).value)"
                            >
                              @for (option of field.options; track option.value) {
                                <option [value]="option.value">{{ option.label }}</option>
                              }
                            </select>
                          } @else if (field.valueKind === 'integer' || field.valueKind === 'number') {
                            <input
                              type="number"
                              [step]="field.valueKind === 'integer' ? 1 : 'any'"
                              [min]="field.integerMin ?? field.numberMin"
                              [max]="field.integerMax ?? field.numberMax"
                              [value]="field.value"
                              (change)="store.applyProjectConfigurationField(field.documentId, field.configurationId, field.fieldId, $any($event.target).valueAsNumber)"
                            />
                          } @else {
                            <input
                              type="text"
                              [value]="field.value"
                              (change)="store.applyProjectConfigurationField(field.documentId, field.configurationId, field.fieldId, $any($event.target).value)"
                            />
                          }
                          <small>{{ field.configurationId }} · {{ field.fieldId }}</small>
                        </label>
                      }
                    </section>
                  }
                  @if (entry.diagnostics.length > 0) {
                    <section class="project-content-diagnostics" data-project-content-diagnostics="entry">
                      <strong>Rust Diagnostics</strong>
                      @for (diagnostic of entry.diagnostics; track diagnostic.documentId + ':' + diagnostic.path + ':' + diagnostic.code) {
                        <span>{{ diagnostic.path }} · {{ diagnostic.message }}</span>
                      }
                    </section>
                  }
                } @else {
                  <p class="empty-assets">Open a Game Project to inspect its stored sources.</p>
                }
              </section>
            </div>
          }
        </div>
      } @else if (store.bottomPanelTab() === 'assets') {
        <div class="asset-browser">
          <aside class="asset-tree" aria-label="Asset categories">
            @for (category of store.assetBrowserCategories(); track category.category) {
              <button
                type="button"
                [class.active]="store.assetBrowserCategory() === category.category"
                (click)="selectAssetCategory(category.category)"
              >
                <span>{{ category.label }}</span>
                <small>{{ category.count }}</small>
              </button>
            }
          </aside>
          <div class="asset-grid">
            @if (!store.assetInventory().ok && store.assetInventory().inventory === null) {
              <p class="empty-assets" data-asset-inventory-diagnostics="missing">
                Asset inventory is unavailable.
              </p>
            }
            @if (store.assetInventory().inventory; as inventory) {
              <div class="asset-inventory-summary" data-asset-inventory-summary>
                <span>{{ inventory.artifactKind }} · {{ inventory.artifactVersion }}</span>
                <strong>{{ inventory.status }}</strong>
                <small>{{ inventory.catalogPath }} · {{ inventory.inventoryHash }}</small>
              </div>
              @if (inventory.diagnostics.length > 0) {
                <div class="asset-inventory-diagnostics" data-asset-inventory-diagnostics="present">
                  @for (diagnostic of inventory.diagnostics; track diagnostic.code + diagnostic.source) {
                    <span>{{ diagnostic.code }} · {{ diagnostic.message }}</span>
                  }
                </div>
              }
            }
            @for (asset of store.catalogAssetEntries(); track asset.assetId) {
              <article
                class="asset-entry"
                role="button"
                tabindex="0"
                [class.asset-entry--selected]="asset.referencedRenderableIds.includes(store.selectedRenderable()?.renderableId ?? '')"
                [class.asset-entry--diagnostic]="asset.diagnostics.length > 0"
                [attr.data-asset-id]="asset.assetId"
                [attr.data-asset-kind]="asset.kind"
                (click)="store.selectCatalogAsset(asset.assetId)"
                (keydown.enter)="store.selectCatalogAsset(asset.assetId)"
                (keydown.space)="store.selectCatalogAsset(asset.assetId)"
              >
                <span class="asset-thumb">{{ assetIcon(asset) }}</span>
                <div>
                  <strong>{{ asset.assetId }}</strong>
                  <span>{{ asset.sourcePath }}</span>
                  <small>
                    {{ asset.kind }} · deps {{ asset.dependencyStatus }} · dev
                    {{ asset.devResolution?.importStatus ?? 'missing' }} · publish
                    {{ asset.publishResolution?.outputKey ?? 'missing' }}
                  </small>
                  @if (asset.dependencies.length > 0) {
                    <small>depends on {{ asset.dependencies.join(', ') }}</small>
                  }
                  @if (asset.referencedRenderableIds.length > 0) {
                    <small>scene refs {{ asset.referencedRenderableIds.join(', ') }}</small>
                  }
                  @if (asset.diagnostics[0]; as diagnostic) {
                    <small class="asset-entry__diagnostic">
                      {{ diagnostic.code }} · {{ diagnostic.message }}
                    </small>
                  }
                </div>
              </article>
            } @empty {
              <p class="empty-assets">No assets match {{ store.assetBrowserSummary() }}.</p>
            }
          </div>
        </div>
      } @else if (store.bottomPanelTab() === 'catalog') {
        <div class="catalog-workflow" data-visual-id="studio-catalog-workflow-panel">
          @if (store.catalogWorkflow(); as catalog) {
            <section class="catalog-toolbar" aria-label="Catalog workflow commands">
              <div>
                <span>{{ catalog.workflowVersion }}</span>
                <strong>{{ catalog.catalogPath }}</strong>
                <small>{{ catalog.entryCount }} entries · {{ catalog.catalogHash }}</small>
              </div>
              <button type="button" (click)="store.createCatalogSource()">New</button>
              <button type="button" (click)="loadCatalog()">Load</button>
              <button type="button" (click)="saveCatalog()">Save</button>
              <button type="button" (click)="store.linkCatalogAsset('material')">Link Material</button>
              <button type="button" (click)="store.linkCatalogAsset('static_mesh')">Link Mesh</button>
              <button type="button" (click)="validateCatalog()">Validate</button>
            </section>
            <section class="catalog-message" data-catalog-workflow-message>
              {{ store.catalogWorkflowMessage() }}
            </section>
            <div class="catalog-workflow-grid">
              <section class="catalog-asset-list" aria-label="Catalog assets">
                @for (asset of catalog.assets; track asset.assetId) {
                  <article
                    role="button"
                    tabindex="0"
                    class="catalog-asset-row"
                    [class.catalog-asset-row--selected]="asset.assetId === catalog.selectedAssetId"
                    [class.catalog-asset-row--diagnostic]="asset.diagnostics.length > 0"
                    [attr.data-catalog-asset-id]="asset.assetId"
                    [attr.data-catalog-source-exists]="asset.sourceExists"
                    (click)="store.selectCatalogWorkflowAsset(asset.assetId)"
                    (keydown.enter)="store.selectCatalogWorkflowAsset(asset.assetId)"
                    (keydown.space)="store.selectCatalogWorkflowAsset(asset.assetId)"
                  >
                    <strong>{{ asset.assetId }}</strong>
                    <span>{{ asset.kind }} · {{ asset.dependencyStatus }}</span>
                    <small>{{ asset.sourcePath }}</small>
                  </article>
                } @empty {
                  <p class="empty-assets">No catalog assets linked.</p>
                }
              </section>
              <section class="catalog-detail" data-catalog-selected-asset>
                @if (catalog.selectedAsset; as asset) {
                  <header>
                    <div>
                      <strong>{{ asset.assetId }}</strong>
                      <span>{{ asset.kind }} · {{ asset.previewHash }}</span>
                    </div>
                    <button type="button" (click)="store.removeSelectedCatalogAsset()">Remove</button>
                  </header>
                  <label>
                    Source
                    <input
                      type="text"
                      [value]="asset.sourcePath"
                      (change)="store.updateSelectedCatalogAssetSource($any($event.target).value)"
                    />
                  </label>
                  <dl>
                    <dt>source exists</dt>
                    <dd>{{ asset.sourceExists }}</dd>
                    <dt>source hash</dt>
                    <dd>{{ asset.sourceHash ?? 'not read' }}</dd>
                    <dt>expected hash</dt>
                    <dd>{{ asset.expectedSourceHash ?? 'none' }}</dd>
                    <dt>hash matches</dt>
                    <dd>{{ asset.sourceHashMatches ?? 'unknown' }}</dd>
                    <dt>dependencies</dt>
                    <dd>{{ asset.dependencies.join(', ') || 'none' }}</dd>
                    <dt>render refs</dt>
                    <dd>{{ asset.referencedRenderableIds.join(', ') || 'none' }}</dd>
                    <dt>publish</dt>
                    <dd>{{ asset.publishOutputKey ?? 'none' }}</dd>
                  </dl>
                  @if (asset.diagnostics.length > 0) {
                    <section class="catalog-diagnostics" data-catalog-asset-diagnostics="present">
                      @for (diagnostic of asset.diagnostics; track diagnostic.code + diagnostic.source) {
                        <span>{{ diagnostic.code }} · {{ diagnostic.message }}</span>
                      }
                    </section>
                  }
                } @else {
                  <p class="empty-assets">Select or link a catalog asset.</p>
                }
              </section>
              <section class="catalog-preview-policy" aria-label="Catalog preview strategy">
                <strong>Preview Readout</strong>
                <span>Now: {{ catalog.previewStrategy.now.join(', ') }}</span>
                <span>Deferred: {{ catalog.previewStrategy.deferred.join(', ') }}</span>
                @for (nonClaim of catalog.nonClaims; track nonClaim) {
                  <small>{{ nonClaim }}</small>
                }
              </section>
            </div>
            @if (catalog.diagnostics.length > 0) {
              <section class="catalog-diagnostics" data-catalog-workflow-diagnostics="present">
                @for (diagnostic of catalog.diagnostics; track diagnostic.code + diagnostic.source + diagnostic.message) {
                  <span>{{ diagnostic.code }} · {{ diagnostic.message }}</span>
                }
              </section>
            }
          }
        </div>
      } @else if (store.bottomPanelTab() === 'commands') {
        <div class="command-proposal-panel" data-visual-id="studio-command-proposal-panel">
          @if (store.commandProposalPanel(); as panel) {
            <section class="command-proposal-summary" data-command-proposal-summary>
              <span>{{ panel.panelVersion }}</span>
              <strong>{{ panel.runtimeSessionId }}</strong>
              <small>{{ panel.workspaceHash }} · {{ panel.panelHash }}</small>
            </section>
            <section class="command-action-list" aria-label="Command proposal actions">
              @for (action of panel.actions; track action.actionHash) {
                <article
                  class="command-action"
                  [class.command-action--disabled]="!action.available"
                  [attr.data-command-action-id]="action.actionId"
                >
                  <header>
                    <div>
                      <strong>{{ action.label }}</strong>
                      <span>{{ action.commandMessageType }} · {{ action.commandOperation }}</span>
                    </div>
                    <small>{{ action.available ? 'available' : 'blocked' }}</small>
                  </header>
                  <dl>
                    <dt>endpoint</dt>
                    <dd>{{ action.endpoint }}</dd>
                    <dt>session</dt>
                    <dd>{{ action.runtimeSessionId }}</dd>
                    <dt>action hash</dt>
                    <dd>{{ action.actionHash }}</dd>
                  </dl>
                </article>
              }
            </section>
            <section class="command-proposal-list" aria-label="Command proposal results">
              @for (proposal of panel.proposals; track proposal.proposalHash) {
                <article
                  class="command-proposal"
                  [class.command-proposal--rejected]="proposal.status === 'rejected'"
                  [attr.data-command-proposal-sequence]="proposal.sequenceId"
                  [attr.data-command-proposal-status]="proposal.status"
                >
                  <header>
                    <div>
                      <strong>{{ proposal.sequenceId }} · {{ proposal.status }}</strong>
                      <span>{{ proposal.batch.commands[0]?.op ?? 'unknown' }} through command.propose</span>
                    </div>
                    <small>{{ proposal.result.accepted }} accepted · {{ proposal.result.rejected }} rejected</small>
                  </header>
                  <dl>
                    <dt>authority</dt>
                    <dd>{{ proposal.authorityHashAfter ?? 'none' }}</dd>
                    <dt>reason</dt>
                    <dd>{{ proposal.rejectionReason ?? 'none' }}</dd>
                    <dt>proposal hash</dt>
                    <dd>{{ proposal.proposalHash }}</dd>
                    <dt>attach</dt>
                    <dd>{{ proposal.attachHash }}</dd>
                  </dl>
                  @if (proposal.diagnostics[0]; as diagnostic) {
                    <small class="command-proposal__diagnostic">
                      {{ diagnostic.code }} · {{ diagnostic.message }}
                    </small>
                  }
                </article>
              }
            </section>
            <section class="command-non-claims" aria-label="Command proposal non-claims">
              @for (nonClaim of panel.nonClaims; track nonClaim) {
                <span>{{ nonClaim }}</span>
              }
            </section>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .assets-bottom-panel {
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        box-sizing: border-box;
        display: grid;
        gap: 0.75rem;
        grid-template-rows: auto minmax(0, 1fr);
        height: 100%;
        min-width: 0;
        overflow: hidden;
        padding: 0.75rem;
      }

      header {
        align-items: center;
        display: grid;
        gap: 0.75rem;
        grid-template-columns: auto minmax(0, 1fr);
      }

      .panel-kicker {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .tabs {
        display: flex;
        gap: 0.5rem;
        justify-self: end;
      }

      .tabs button {
        background: transparent;
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        cursor: pointer;
        font: inherit;
        min-height: 2rem;
        padding: 0 0.75rem;
      }

      .tabs button.active {
        background: var(--asha-color-control);
        border-color: var(--asha-color-accent);
      }

      .timeline-table-wrap,
      .asset-browser,
      .asset-grid,
      .command-proposal-panel {
        min-height: 0;
        overflow: auto;
      }

      .timeline-table {
        border-collapse: collapse;
        font-size: 0.78rem;
        min-width: 56rem;
        width: 100%;
      }

      .timeline-table th,
      .timeline-table td {
        border-bottom: 1px solid var(--asha-color-border);
        padding: 0.38rem 0.5rem;
        text-align: left;
        vertical-align: top;
      }

      .timeline-table th {
        color: var(--asha-color-muted);
        font-size: 0.66rem;
        position: sticky;
        text-transform: uppercase;
        top: 0;
      }

      .timeline-table td {
        max-width: 18rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .timeline-table td:nth-child(2) {
        display: grid;
        gap: 0.12rem;
      }

      .timeline-table td:nth-child(2) span {
        color: var(--asha-color-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .timeline-table__latest {
        background: var(--asha-color-control);
      }

      .asset-browser {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: 13rem minmax(0, 1fr);
      }

      .asset-tree {
        border-right: 1px solid var(--asha-color-border);
        display: grid;
        gap: 0.2rem;
        padding-right: 0.75rem;
      }

      .asset-tree button {
        align-items: center;
        background: transparent;
        border: 1px solid transparent;
        color: var(--asha-color-ink);
        cursor: pointer;
        display: flex;
        font: inherit;
        justify-content: space-between;
        min-height: 1.7rem;
        padding: 0 0.45rem;
        text-align: left;
      }

      .asset-tree button span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .asset-tree button small {
        flex: 0 0 auto;
        padding-left: 0.5rem;
      }

      .asset-tree button.active,
      .asset-tree button:hover {
        background: var(--asha-color-control);
        border-color: var(--asha-color-border);
      }

      .asset-grid {
        display: grid;
        gap: 0.55rem;
        grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
        min-height: 0;
        overflow: auto;
      }

      .asset-entry {
        align-items: center;
        border: 1px solid var(--asha-color-border);
        background: var(--asha-color-control);
        display: grid;
        gap: 0.5rem;
        grid-template-columns: auto minmax(0, 1fr);
        min-width: 0;
        padding: 0.5rem;
      }

      .asset-inventory-summary,
      .asset-inventory-diagnostics,
      .command-proposal-summary {
        border: 1px solid var(--asha-color-border);
        display: grid;
        gap: 0.1rem;
        grid-column: 1 / -1;
        min-width: 0;
        padding: 0.45rem 0.55rem;
      }

      .asset-inventory-summary,
      .command-proposal-summary {
        background: #10161b;
      }

      .asset-inventory-diagnostics,
      .asset-entry--diagnostic,
      .command-proposal--rejected {
        border-color: var(--asha-color-warning);
      }

      .asset-inventory-summary span,
      .asset-inventory-summary small,
      .asset-inventory-diagnostics span,
      .asset-entry__diagnostic,
      .command-proposal-summary span,
      .command-proposal-summary small {
        color: var(--asha-color-muted);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .asset-inventory-summary strong,
      .command-proposal-summary strong {
        color: var(--asha-color-accent-text);
      }

      .command-proposal-panel,
      .command-action-list,
      .command-proposal-list,
      .command-non-claims {
        display: grid;
        gap: 0.55rem;
      }

      .command-action,
      .command-proposal {
        border: 1px solid var(--asha-color-border);
        background: var(--asha-color-control);
        display: grid;
        gap: 0.35rem;
        min-width: 0;
        padding: 0.55rem;
      }

      .command-action header,
      .command-proposal header {
        display: flex;
        gap: 0.5rem;
        justify-content: space-between;
      }

      .command-action header div,
      .command-proposal header div {
        display: grid;
        min-width: 0;
      }

      .command-action dl,
      .command-proposal dl {
        display: grid;
        gap: 0.18rem 0.55rem;
        grid-template-columns: 6.5rem minmax(0, 1fr);
        margin: 0;
      }

      .command-action dt,
      .command-proposal dt {
        color: var(--asha-color-muted);
        font-size: 0.68rem;
      }

      .command-action dd,
      .command-action strong,
      .command-action span,
      .command-proposal dd,
      .command-proposal strong,
      .command-proposal span {
        margin: 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .command-action--disabled {
        opacity: 0.72;
      }

      .command-proposal--rejected {
        border-color: var(--asha-color-warning);
      }

      .command-proposal__diagnostic,
      .command-non-claims span {
        color: var(--asha-color-muted);
      }

      .command-non-claims {
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
      }

      .command-non-claims span {
        border: 1px solid var(--asha-color-border);
        padding: 0.35rem 0.45rem;
      }

      .empty-assets {
        color: var(--asha-color-muted);
        font-size: 0.8rem;
        margin: 0;
        padding: 0.75rem;
      }

      .asset-thumb {
        align-items: center;
        background: var(--asha-color-thumb);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-accent-text);
        display: inline-flex;
        font-weight: 800;
        height: 2.25rem;
        justify-content: center;
        width: 2.25rem;
      }

      .asset-entry div {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .asset-entry strong,
      .asset-entry span,
      .asset-entry small {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .project-content-browser {
        display: grid;
        gap: 0.5rem;
        grid-template-rows: auto auto minmax(0, 1fr);
        min-height: 0;
        overflow: hidden;
      }

      .project-content-toolbar {
        display: flex;
        gap: 0.45rem;
      }

      .project-content-toolbar div {
        display: grid;
        flex: 1 1 auto;
        min-width: 0;
      }

      .project-content-toolbar small,
      .project-content-tree span,
      .project-content-tree small,
      .project-content-inspector span,
      .project-content-inspector small {
        color: var(--asha-color-muted);
      }

      .project-content-message,
      .project-content-stale {
        border: 1px solid var(--asha-color-border);
        font-size: 0.75rem;
        padding: 0.35rem 0.5rem;
      }

      .project-content-stale,
      .project-content-message[data-project-content-status='degraded'] {
        border-color: var(--asha-color-warning);
        color: var(--asha-color-warning-text);
      }

      .project-content-grid {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: minmax(17rem, 0.85fr) minmax(24rem, 1.4fr);
        min-height: 0;
        overflow: hidden;
      }

      .project-content-tree,
      .project-content-inspector {
        border: 1px solid var(--asha-color-border);
        min-height: 0;
        overflow: auto;
        padding: 0.5rem;
      }

      .project-content-tree section,
      .project-content-details,
      .project-content-relationships,
      .project-content-fields,
      .project-content-diagnostics {
        display: grid;
        gap: 0.3rem;
      }

      .project-content-tree section + section {
        margin-top: 0.6rem;
      }

      .project-content-tree section > header {
        display: flex;
        justify-content: space-between;
      }

      .project-content-tree button,
      .project-content-relationships button {
        background: transparent;
        border: 1px solid transparent;
        color: var(--asha-color-ink);
        cursor: pointer;
        display: grid;
        font: inherit;
        gap: 0.1rem;
        min-width: 0;
        padding: 0.35rem 0.45rem;
        text-align: left;
      }

      .project-content-tree button.is-current {
        background: var(--asha-color-control-active);
        border-color: var(--asha-color-accent);
      }

      .project-content-tree button[data-project-content-entry-status='rust-rejected'],
      .project-content-tree button[data-project-content-entry-status='migration-required'] {
        border-color: var(--asha-color-warning);
      }

      .project-content-inspector {
        display: grid;
        gap: 0.6rem;
        grid-auto-rows: max-content;
      }

      .project-content-inspector > header {
        display: flex;
        justify-content: space-between;
      }

      .project-content-inspector > header div,
      .project-content-details,
      .project-content-fields label,
      .project-content-diagnostics {
        display: grid;
        gap: 0.2rem;
      }

      .project-content-inspector dl {
        display: grid;
        font-size: 0.75rem;
        gap: 0.2rem 0.5rem;
        grid-template-columns: max-content minmax(0, 1fr);
        margin: 0;
      }

      .project-content-inspector dd {
        margin: 0;
        overflow-wrap: anywhere;
      }

      .project-content-details,
      .project-content-relationships,
      .project-content-fields,
      .project-content-diagnostics {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        padding: 0.5rem;
      }

      .project-content-fields {
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
      }

      .project-content-fields > strong {
        grid-column: 1 / -1;
      }

      .project-content-fields input,
      .project-content-fields select {
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        min-height: 2rem;
      }

      .project-content-dirty {
        color: var(--asha-color-accent-text) !important;
        font-weight: 700;
      }

      .catalog-workflow {
        display: grid;
        gap: 0.5rem;
        min-height: 0;
      }

      .catalog-toolbar {
        align-items: center;
        display: flex;
        gap: 0.45rem;
        min-width: 0;
      }

      .catalog-toolbar div {
        display: grid;
        flex: 1 1 auto;
        min-width: 0;
      }

      .catalog-workflow-grid {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: minmax(13rem, 0.85fr) minmax(18rem, 1.35fr) minmax(12rem, 0.8fr);
        min-height: 0;
      }

      .catalog-asset-list,
      .catalog-detail,
      .catalog-preview-policy,
      .catalog-diagnostics {
        background: var(--asha-color-panel);
        border: 1px solid var(--asha-color-border);
        border-radius: 6px;
        min-width: 0;
        padding: 0.5rem;
      }

      .catalog-asset-list,
      .catalog-preview-policy {
        display: grid;
        gap: 0.35rem;
      }

      .catalog-asset-row {
        border: 1px solid transparent;
        border-radius: 5px;
        cursor: pointer;
        display: grid;
        gap: 0.1rem;
        padding: 0.35rem 0.45rem;
      }

      .catalog-asset-row--selected {
        background: var(--asha-color-control-active);
        border-color: var(--asha-color-accent);
      }

      .catalog-asset-row--diagnostic {
        border-color: var(--asha-color-warning);
      }

      .catalog-detail {
        display: grid;
        gap: 0.45rem;
      }

      .catalog-detail header {
        align-items: start;
        display: flex;
        gap: 0.5rem;
        justify-content: space-between;
      }

      .catalog-detail label {
        display: grid;
        gap: 0.25rem;
      }

      .catalog-detail input {
        min-width: 0;
      }

      .catalog-detail dl {
        display: grid;
        gap: 0.25rem 0.6rem;
        grid-template-columns: 7rem minmax(0, 1fr);
        margin: 0;
      }

      .catalog-detail dd {
        margin: 0;
      }

      .catalog-diagnostics {
        display: grid;
        gap: 0.25rem;
      }

      small {
        color: var(--asha-color-muted);
        font-size: 0.75rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioAssetsBottomPanelComponent {
  readonly store = inject(StudioWorkspaceStore);

  reloadProjectContent(): void {
    void this.store.reloadProjectContentFromDisk();
  }

  saveProjectContent(): void {
    void this.store.saveSelectedProjectContent();
  }

  openProjectContentScene(path: string): void {
    void this.store.openProjectContentScene(path);
  }

  selectAssetCategory(category: StudioAssetBrowserCategory): void {
    this.store.setAssetBrowserCategory(category);
  }

  loadCatalog(): void {
    void this.store.loadCatalogSource();
  }

  saveCatalog(): void {
    void this.store.saveCatalogSource();
  }

  validateCatalog(): void {
    void this.store.validateCatalogSource();
  }

  resultLabel(entry: StudioCommandTimelineEntry): string {
    return entry.outputSummary;
  }

  elapsedLabel(index: number): string {
    return `${index * 120}ms`;
  }

  assetIcon(asset: { readonly kind: string }): string {
    const labels: Record<string, string> = {
      voxel_grid: 'G',
      voxel_cell: 'V',
      static_mesh: 'M',
      material: 'Mat',
      texture: 'Tex',
      preview_ghost: 'P',
    };
    return labels[asset.kind] ?? '?';
  }
}
