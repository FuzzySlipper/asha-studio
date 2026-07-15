import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { StudioWorkspaceStore } from '@asha-studio/store';

export type StudioVoxelToolsSection =
  | 'convert'
  | 'edit'
  | 'asset'
  | 'metadata'
  | 'history'
  | 'automation';

@Component({
  selector: 'asha-voxel-tools-menu',
  standalone: true,
  template: `
    <section class="voxel-tools" data-visual-id="studio-voxel-tools-menu">
      <nav class="voxel-tools__tabs" aria-label="Voxel workflows">
        @for (section of sections; track section.id) {
          <button
            type="button"
            [class.is-active]="activeSection() === section.id"
            [attr.data-voxel-tools-section]="section.id"
            (click)="activeSection.set(section.id)"
          >
            {{ section.label }}
          </button>
        }
      </nav>

      @if (activeSection() === 'convert') {
        @if (store.voxelConversionWorkspaceShell(); as shell) {
          <div class="voxel-tools__content" data-voxel-tools-content="convert">
            <header class="voxel-tools__heading">
              <div>
                <strong>Convert a mesh to voxels</strong>
                <small
                  >Choose a catalog mesh or import a GLB, then tune and run the conversion.</small
                >
              </div>
              <span [class.is-warning]="shell.workspace.status !== 'ready' || shell.actions[0]?.disabled">
                {{ conversionStatus(shell.workspace.status, shell.actions) }}
              </span>
            </header>

            <section class="voxel-tools__group">
              <h3>Source</h3>
              <div class="voxel-tools__fields voxel-tools__fields--two">
                <label>
                  Catalog mesh
                  <select
                    [value]="shell.settingsDraft.selectedSourceAssetId ?? ''"
                    (change)="store.setVoxelConversionSourceAsset($any($event.target).value)"
                    data-voxel-control="source-asset"
                  >
                    <option value="">Choose a source</option>
                    @for (option of shell.sourceOptions; track option.assetId) {
                      <option [value]="option.assetId" [disabled]="!option.supported">
                        {{ option.label }}{{ option.supported ? '' : ' (unsupported)' }}
                      </option>
                    }
                  </select>
                </label>
                <label>
                  Import GLB
                  <input
                    type="file"
                    accept=".glb,model/gltf-binary"
                    data-voxel-control="mesh-file-import"
                    (change)="store.importVoxelConversionMeshFile($any($event.target).files?.[0])"
                  />
                </label>
                <label>
                  Mesh primitive (optional)
                  <input
                    type="text"
                    [value]="shell.settingsDraft.meshPrimitive ?? ''"
                    (input)="store.setVoxelConversionMeshPrimitive($any($event.target).value)"
                    data-voxel-control="mesh-primitive"
                  />
                </label>
                <label>
                  Target volume
                  <input
                    type="text"
                    [value]="shell.settingsDraft.targetVolumeAssetId"
                    (input)="store.setVoxelConversionTargetVolumeAssetId($any($event.target).value)"
                    data-voxel-control="target-volume"
                  />
                </label>
              </div>
            </section>

            <section class="voxel-tools__group">
              <h3>Conversion settings</h3>
              <div class="voxel-tools__fields voxel-tools__fields--grid">
                <label>
                  Mode
                  <select
                    [value]="shell.settingsDraft.mode"
                    (change)="store.setVoxelConversionMode($any($event.target).value)"
                    data-voxel-control="mode"
                  >
                    <option value="solid">Solid</option>
                    <option value="surface">Surface</option>
                  </select>
                </label>
                <label>
                  Fit
                  <select
                    [value]="shell.settingsDraft.fitPolicy"
                    (change)="store.setVoxelConversionFitPolicy($any($event.target).value)"
                    data-voxel-control="fit-policy"
                  >
                    <option value="contain">Contain</option>
                    <option value="cover">Cover</option>
                    <option value="stretch">Stretch</option>
                  </select>
                </label>
                <label>
                  Origin
                  <select
                    [value]="shell.settingsDraft.originPolicy"
                    (change)="store.setVoxelConversionOriginPolicy($any($event.target).value)"
                    data-voxel-control="origin-policy"
                  >
                    <option value="target_min">Target minimum</option>
                    <option value="source_origin">Source origin</option>
                    <option value="centered">Centered</option>
                  </select>
                </label>
                @for (axis of [0, 1, 2]; track axis) {
                  <label>
                    Resolution {{ axisLabel(axis) }}
                    <input
                      type="number"
                      min="1"
                      [value]="shell.settingsDraft.resolution[axis]"
                      (input)="
                        store.setVoxelConversionResolutionAxis(
                          axis,
                          $any($event.target).valueAsNumber
                        )
                      "
                      [attr.data-voxel-control]="'resolution-' + axis"
                    />
                  </label>
                }
                <label>
                  Voxel size
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    [value]="shell.settingsDraft.voxelSize"
                    (input)="store.setVoxelConversionVoxelSize($any($event.target).valueAsNumber)"
                    data-voxel-control="voxel-size"
                  />
                </label>
                <label>
                  Maximum voxels
                  <input
                    type="number"
                    min="1"
                    [value]="shell.settingsDraft.maxOutputVoxels"
                    (input)="
                      store.setVoxelConversionMaxOutputVoxels($any($event.target).valueAsNumber)
                    "
                    data-voxel-control="max-output-voxels"
                  />
                </label>
                <label>
                  Scale
                  <input
                    type="number"
                    step="0.01"
                    [value]="shell.settingsDraft.transformScale"
                    (input)="
                      store.setVoxelConversionTransformScale($any($event.target).valueAsNumber)
                    "
                    data-voxel-control="transform-scale"
                  />
                </label>
                <label>
                  Grid
                  <input
                    type="number"
                    min="0"
                    [value]="shell.settingsDraft.targetGrid"
                    (input)="store.setVoxelConversionTargetGrid($any($event.target).valueAsNumber)"
                    data-voxel-control="target-grid"
                  />
                </label>
                @for (axis of [0, 1, 2]; track axis) {
                  <label>
                    Translate {{ axisLabel(axis) }}
                    <input
                      type="number"
                      step="0.01"
                      [value]="shell.settingsDraft.transformTranslation[axis]"
                      (input)="
                        store.setVoxelConversionTransformTranslationAxis(
                          axis,
                          $any($event.target).valueAsNumber
                        )
                      "
                      [attr.data-voxel-control]="'transform-translation-' + axis"
                    />
                  </label>
                }
                @for (axis of [0, 1, 2]; track axis) {
                  <label>
                    Target origin {{ axisLabel(axis) }}
                    <input
                      type="number"
                      [value]="shell.settingsDraft.targetOrigin[axis]"
                      (input)="
                        store.setVoxelConversionTargetOriginAxis(
                          axis,
                          $any($event.target).valueAsNumber
                        )
                      "
                      [attr.data-voxel-control]="'target-origin-' + axis"
                    />
                  </label>
                }
              </div>
            </section>

            <section class="voxel-tools__group">
              <h3>Material mapping</h3>
              <div class="voxel-tools__fields voxel-tools__fields--grid">
                <label>
                  Source slot
                  <input
                    type="number"
                    [value]="shell.settingsDraft.materialMap.entries[0]?.sourceMaterialSlot ?? 0"
                    (input)="
                      store.setVoxelConversionMaterialSourceSlot($any($event.target).valueAsNumber)
                    "
                    data-voxel-control="material-source-slot"
                  />
                </label>
                <label>
                  Source material id
                  <input
                    type="text"
                    [value]="shell.settingsDraft.materialMap.entries[0]?.sourceMaterialId ?? ''"
                    (input)="store.setVoxelConversionMaterialSourceId($any($event.target).value)"
                    data-voxel-control="material-source-id"
                  />
                </label>
                <label>
                  Voxel material
                  <input
                    type="number"
                    [value]="shell.settingsDraft.materialMap.entries[0]?.voxelMaterial ?? 1"
                    (input)="
                      store.setVoxelConversionMaterialVoxelId($any($event.target).valueAsNumber)
                    "
                    data-voxel-control="material-voxel-id"
                  />
                </label>
                <label>
                  Default material
                  <input
                    type="number"
                    [value]="shell.settingsDraft.materialMap.defaultVoxelMaterial ?? ''"
                    (input)="store.setVoxelConversionDefaultMaterial($any($event.target).value)"
                    data-voxel-control="material-default"
                  />
                </label>
              </div>
            </section>

            <footer class="voxel-tools__actions">
              @for (action of conversionActions(shell.actions); track action.commandId) {
                <button
                  type="button"
                  [disabled]="action.disabled"
                  [attr.data-voxel-action]="action.commandId"
                  [title]="action.reason"
                  (click)="store.submitVoxelConversionCommand(action.commandId)"
                >
                  {{ action.label }}
                </button>
              }
            </footer>
          </div>
        }
      } @else if (activeSection() === 'edit') {
        <div class="voxel-tools__content" data-voxel-tools-content="edit">
          <header class="voxel-tools__heading">
            <div>
              <strong>Edit the authored voxel volume</strong>
              <small>{{ store.voxelCompactEditControl().message }}</small>
            </div>
            <span>{{ store.voxelCompactEditControl().status }}</span>
          </header>
          <section class="voxel-tools__group">
            <h3>Placement</h3>
            <div class="voxel-tools__actions voxel-tools__actions--inline">
              <button
                type="button"
                data-voxel-edit-placement-action="use_start"
                [disabled]="!store.voxelCompactEditPlacement().canUseViewportHit"
                (click)="store.applyViewportHitToVoxelCompactEditControl('start')"
              >
                Use viewport hit as start
              </button>
              <button
                type="button"
                data-voxel-edit-placement-action="use_end"
                [disabled]="!store.voxelCompactEditPlacement().canUseViewportHit"
                (click)="store.applyViewportHitToVoxelCompactEditControl('end')"
              >
                Use viewport hit as end
              </button>
            </div>
            <div class="voxel-tools__fields voxel-tools__fields--grid">
              <label
                >Grid
                <input
                  type="number"
                  data-voxel-edit-control="grid"
                  [value]="store.voxelCompactEditControl().grid"
                  (input)="
                    store.setVoxelCompactEditControlField('grid', $any($event.target).valueAsNumber)
                  "
              /></label>
              <label
                >Material
                <input
                  type="number"
                  data-voxel-edit-control="material"
                  min="0"
                  max="255"
                  [value]="store.voxelCompactEditControl().material"
                  (input)="
                    store.setVoxelCompactEditControlField(
                      'material',
                      $any($event.target).valueAsNumber
                    )
                  "
              /></label>
              <label
                >Draft action
                <select
                  data-voxel-edit-control="draft_action"
                  [value]="store.voxelCompactEditControl().draftAction"
                  (change)="store.setVoxelCompactEditControlAction($any($event.target).value)"
                >
                  <option value="block">Block</option>
                  <option value="fill_box">Fill box</option>
                  <option value="primitive_box">Primitive box</option>
                  <option value="primitive_line">Primitive line</option>
                </select></label
              >
              <label
                >Box mode
                <select
                  data-voxel-edit-control="box_mode"
                  [value]="store.voxelCompactEditControl().boxMode"
                  (change)="store.setVoxelCompactEditControlBoxMode($any($event.target).value)"
                >
                  <option value="filled">Filled</option>
                  <option value="shell">Shell</option>
                  <option value="edges">Edges</option>
                </select></label
              >
              <label
                >Line radius
                <input
                  type="number"
                  data-voxel-edit-control="line_radius"
                  min="0"
                  max="4"
                  [value]="store.voxelCompactEditControl().lineRadius"
                  (input)="
                    store.setVoxelCompactEditControlField(
                      'lineRadius',
                      $any($event.target).valueAsNumber
                    )
                  "
              /></label>
              <label
                >Maximum generated
                <input
                  type="number"
                  data-voxel-edit-control="max_generated_voxels"
                  min="1"
                  max="64"
                  [value]="store.voxelCompactEditControl().maxGeneratedVoxels"
                  (input)="
                    store.setVoxelCompactEditControlField(
                      'maxGeneratedVoxels',
                      $any($event.target).valueAsNumber
                    )
                  "
              /></label>
              @for (field of coordinateFields; track field.id) {
                <label
                  >{{ field.label }}
                  <input
                    type="number"
                    [attr.data-voxel-edit-control]="field.id"
                    [value]="compactCoordinate(field.id)"
                    (input)="
                      store.setVoxelCompactEditControlField(
                        field.id,
                        $any($event.target).valueAsNumber
                      )
                    "
                /></label>
              }
            </div>
          </section>
          <footer class="voxel-tools__actions">
            <button
              type="button"
              data-voxel-edit-action="block"
              (click)="store.runVoxelCompactEditControl('block')"
            >
              Place block
            </button>
            <button
              type="button"
              data-voxel-edit-action="fill_box"
              (click)="store.runVoxelCompactEditControl('fill_box')"
            >
              Fill box
            </button>
            <button
              type="button"
              data-voxel-edit-action="primitive_box"
              (click)="store.runVoxelCompactEditControl('primitive_box')"
            >
              Create box
            </button>
            <button
              type="button"
              data-voxel-edit-action="primitive_line"
              (click)="store.runVoxelCompactEditControl('primitive_line')"
            >
              Create line
            </button>
          </footer>
        </div>
      } @else if (activeSection() === 'asset') {
        <div class="voxel-tools__content" data-voxel-tools-content="asset">
          <header class="voxel-tools__heading">
              <div>
                <strong>Manage the voxel asset</strong>
                <small>{{ store.voxelAssetWorkflowControl().message }}</small>
              </div>
              <span [class.is-warning]="!store.workspaceAuthoringAvailable()">
                {{ store.workspaceAuthoringAvailable() ? 'Authoring ready' : 'Starting authoring' }}
              </span>
          </header>
          <section class="voxel-tools__group">
            <h3>Destination</h3>
            <div class="voxel-tools__fields voxel-tools__fields--two">
              <label
                >ProjectBundle
                <input
                  type="text"
                  [value]="store.voxelAssetWorkflowTarget().targetProjectBundle"
                  (input)="
                    store.setVoxelAssetWorkflowTargetProjectBundle($any($event.target).value)
                  "
              /></label>
              <label
                >Asset file
                <output data-voxel-asset-target="path">
                  {{ store.activeVoxelAssetFilePath() ?? store.voxelAssetWorkflowTarget().targetAssetPath }}
                </output>
              </label>
            </div>
            <button
              type="button"
              class="voxel-tools__secondary"
              (click)="store.resetVoxelAssetWorkflowTarget()"
            >
              Use active workspace destination
            </button>
          </section>
          <section class="voxel-tools__group">
            <h3>Workspace asset</h3>
            <small>Create, inspect, export, and store the asset without running the game.</small>
            <footer class="voxel-tools__actions">
            <button
              type="button"
              data-voxel-asset-action="initialize_volume"
              (click)="store.runVoxelAssetWorkflowControl('initialize_volume')"
            >
              New empty volume
            </button>
            <button
              type="button"
              data-voxel-asset-action="create_house"
              (click)="store.createVoxelHouseTemplate()"
            >
              New house template
            </button>
            <button
              type="button"
              data-voxel-asset-action="model_info"
              (click)="store.runVoxelAssetWorkflowControl('model_info')"
            >
              Refresh info
            </button>
            <button
              type="button"
              data-voxel-asset-action="export_volume"
              (click)="store.runVoxelAssetWorkflowControl('export_volume')"
            >
              Export asset
            </button>
            <button
              type="button"
              data-voxel-asset-action="save_volume_as"
              (click)="store.openVoxelAssetFileDialog('save-as')"
            >
              Save Voxel Asset As…
            </button>
            <button
              type="button"
              data-voxel-asset-action="open_volume"
              (click)="store.openVoxelAssetFileDialog('open')"
            >
              Open Voxel Asset…
            </button>
            </footer>
          </section>
          <section class="voxel-tools__group">
            <h3>Running game</h3>
            <small>These controls are available only when a gameplay runtime is attached.</small>
            <footer class="voxel-tools__actions">
            <button
              type="button"
              data-voxel-asset-action="load_volume"
              [disabled]="!store.liveRuntimeAvailable() || !store.voxelAssetWorkflowControl().canLoadLastAsset"
              (click)="store.runVoxelAssetWorkflowControl('load_volume')"
            >
              Load saved asset into game
            </button>
            <button
              type="button"
              data-voxel-asset-action="unload_volume"
              [disabled]="!store.liveRuntimeAvailable()"
              (click)="store.runVoxelAssetWorkflowControl('unload_volume')"
            >
              Unload from game
            </button>
            </footer>
          </section>
        </div>
      } @else if (activeSection() === 'metadata') {
        <div class="voxel-tools__content" data-voxel-tools-content="metadata">
          <header class="voxel-tools__heading">
            <div>
              <strong>Materials and regions</strong
              ><small
                >Maintain reusable palette bindings and gameplay-facing region annotations.</small
              >
            </div>
          </header>
          <section class="voxel-tools__group">
            <h3>Material palette</h3>
            <div class="voxel-tools__fields voxel-tools__fields--two">
              <label
                >Stored entry
                <select
                  data-voxel-palette-control="selected_entry"
                  [value]="store.voxelMaterialPaletteEditor().selectedPaletteEntryId"
                  (change)="store.selectVoxelMaterialPaletteEntry($any($event.target).value)"
                >
                  <option value="">Choose an entry</option>
                  @for (
                    row of store.voxelMaterialAuthoring().storedRows;
                    track row.paletteEntryId
                  ) {
                    <option [value]="row.paletteEntryId">
                      {{ row.displayName ?? row.paletteEntryId }}
                    </option>
                  }
                </select></label
              >
              <label
                >Entry id
                <input
                  data-voxel-palette-control="entry_id"
                  [value]="store.voxelMaterialPaletteEditor().paletteEntryId"
                  (input)="
                    store.setVoxelMaterialPaletteEditorField(
                      'paletteEntryId',
                      $any($event.target).value
                    )
                  "
              /></label>
              <label
                >Name
                <input
                  data-voxel-palette-control="display_name"
                  [value]="store.voxelMaterialPaletteEditor().displayName"
                  (input)="
                    store.setVoxelMaterialPaletteEditorField(
                      'displayName',
                      $any($event.target).value
                    )
                  "
              /></label>
              <label
                >Material asset
                <input
                  data-voxel-palette-control="material_asset_id"
                  [value]="store.voxelMaterialPaletteEditor().materialAssetId"
                  (input)="
                    store.setVoxelMaterialPaletteEditorField(
                      'materialAssetId',
                      $any($event.target).value
                    )
                  "
              /></label>
              <label
                >Catalog binding
                <input
                  data-voxel-palette-control="catalog_binding_id"
                  [value]="store.voxelMaterialPaletteEditor().materialCatalogBindingId"
                  (input)="
                    store.setVoxelMaterialPaletteEditorField(
                      'materialCatalogBindingId',
                      $any($event.target).value
                    )
                  "
              /></label>
            </div>
            <button
              type="button"
              class="voxel-tools__secondary"
              data-voxel-palette-action="update"
              [disabled]="store.voxelMaterialPaletteEditor().selectedPaletteEntryId.length === 0"
              (click)="store.runVoxelMaterialPaletteUpdate()"
            >
              Update palette entry
            </button>
          </section>
          <section class="voxel-tools__group">
            <h3>Region annotation</h3>
            <small>{{ store.voxelAnnotationControl().message }}</small>
            <div class="voxel-tools__fields voxel-tools__fields--grid">
              <label
                >Layer
                <input
                  data-voxel-annotation-control="layer_id"
                  [value]="store.voxelAnnotationControl().layerId"
                  (input)="store.setVoxelAnnotationTextField('layerId', $any($event.target).value)"
              /></label>
              <label
                >Region
                <input
                  data-voxel-annotation-control="region_id"
                  [value]="store.voxelAnnotationControl().regionId"
                  (input)="
                    store.setVoxelAnnotationTextField('regionId', $any($event.target).value)
                  "
              /></label>
              <label
                >Label
                <input
                  data-voxel-annotation-control="label"
                  [value]="store.voxelAnnotationControl().label"
                  (input)="store.setVoxelAnnotationTextField('label', $any($event.target).value)"
              /></label>
              <label
                >Kind
                <select
                  data-voxel-annotation-control="kind"
                  [value]="store.voxelAnnotationControl().kind"
                  (change)="store.setVoxelAnnotationKind($any($event.target).value)"
                >
                  <option value="selection">Selection</option>
                  <option value="room">Room</option>
                  <option value="portal">Portal</option>
                  <option value="spawn_area">Spawn</option>
                  <option value="cover">Cover</option>
                  <option value="hazard">Hazard</option>
                  <option value="nav_hint">Navigation hint</option>
                  <option value="custom">Custom</option>
                </select></label
              >
              <label
                >Tags
                <input
                  data-voxel-annotation-control="tags"
                  [value]="store.voxelAnnotationControl().tags"
                  (input)="store.setVoxelAnnotationTextField('tags', $any($event.target).value)"
              /></label>
              <label
                >Parent region
                <input
                  data-voxel-annotation-control="parent_region_id"
                  [value]="store.voxelAnnotationControl().parentRegionId"
                  (input)="
                    store.setVoxelAnnotationTextField('parentRegionId', $any($event.target).value)
                  "
              /></label>
              <label>X1 <input type="number" data-voxel-annotation-control="x1" [value]="store.voxelAnnotationControl().x1" (input)="store.setVoxelAnnotationCoordinate('x1', $any($event.target).valueAsNumber)" /></label>
              <label>Y1 <input type="number" data-voxel-annotation-control="y1" [value]="store.voxelAnnotationControl().y1" (input)="store.setVoxelAnnotationCoordinate('y1', $any($event.target).valueAsNumber)" /></label>
              <label>Z1 <input type="number" data-voxel-annotation-control="z1" [value]="store.voxelAnnotationControl().z1" (input)="store.setVoxelAnnotationCoordinate('z1', $any($event.target).valueAsNumber)" /></label>
              <label>X2 <input type="number" data-voxel-annotation-control="x2" [value]="store.voxelAnnotationControl().x2" (input)="store.setVoxelAnnotationCoordinate('x2', $any($event.target).valueAsNumber)" /></label>
              <label>Y2 <input type="number" data-voxel-annotation-control="y2" [value]="store.voxelAnnotationControl().y2" (input)="store.setVoxelAnnotationCoordinate('y2', $any($event.target).valueAsNumber)" /></label>
              <label>Z2 <input type="number" data-voxel-annotation-control="z2" [value]="store.voxelAnnotationControl().z2" (input)="store.setVoxelAnnotationCoordinate('z2', $any($event.target).valueAsNumber)" /></label>
            </div>
            <div class="voxel-tools__actions voxel-tools__actions--wrap">
              <button type="button" data-voxel-annotation-action="load" (click)="store.runVoxelAnnotationControl('load')">Load</button>
              <button type="button" data-voxel-annotation-action="upsert_region" (click)="store.runVoxelAnnotationControl('upsert_region')">
                Save region
              </button>
              <button type="button" data-voxel-annotation-action="add_runs" (click)="store.runVoxelAnnotationControl('add_runs')">Add selection</button>
              <button type="button" data-voxel-annotation-action="remove_runs" (click)="store.runVoxelAnnotationControl('remove_runs')">Remove selection</button>
              <button type="button" data-voxel-annotation-action="replace_selection" (click)="store.runVoxelAnnotationControl('replace_selection')">Replace selection</button>
              <button type="button" data-voxel-annotation-action="set_label" (click)="store.runVoxelAnnotationControl('set_label')">
                Set label
              </button>
              <button type="button" data-voxel-annotation-action="set_kind" (click)="store.runVoxelAnnotationControl('set_kind')">
                Set kind
              </button>
              <button type="button" data-voxel-annotation-action="set_tags" (click)="store.runVoxelAnnotationControl('set_tags')">
                Set tags
              </button>
              <button type="button" data-voxel-annotation-action="set_parent" (click)="store.runVoxelAnnotationControl('set_parent')">
                Set parent
              </button>
              <button type="button" data-voxel-annotation-action="query_cell" (click)="store.runVoxelAnnotationControl('query_cell')">Query cell</button>
              <button type="button" data-voxel-annotation-action="query_bounds" (click)="store.runVoxelAnnotationControl('query_bounds')">Query bounds</button>
              <button type="button" data-voxel-annotation-action="export" (click)="store.runVoxelAnnotationControl('export')">Export regions</button>
            </div>
          </section>
        </div>
      } @else if (activeSection() === 'history') {
        <div class="voxel-tools__content" data-voxel-tools-content="history">
          <header class="voxel-tools__heading">
            <div>
              <strong>Voxel edit history</strong
              ><small>{{ store.voxelHistoryPanel().control.message }}</small>
            </div>
            <span>{{ store.voxelHistoryPanel().control.status }}</span>
          </header>
          <section class="voxel-tools__group">
            <div class="voxel-tools__fields voxel-tools__fields--two">
              <label
                >History
                <input
                  [value]="store.voxelHistoryPanel().control.historyId"
                  (input)="
                    store.setVoxelHistoryTextControlField('historyId', $any($event.target).value)
                  "
              /></label>
              <label
                >Target transaction
                <input
                  [value]="store.voxelHistoryPanel().control.targetTransactionId ?? ''"
                  (input)="
                    store.setVoxelHistoryTextControlField(
                      'targetTransactionId',
                      $any($event.target).value
                    )
                  "
              /></label>
            </div>
          </section>
          <footer class="voxel-tools__actions">
            <button
              type="button"
              [disabled]="!store.voxelHistoryPanel().canRead"
              (click)="store.runVoxelHistoryControl('read')"
            >
              Refresh history
            </button>
            <button
              type="button"
              [disabled]="!store.voxelHistoryPanel().canPreviewRevert"
              (click)="store.runVoxelHistoryControl('preview_revert')"
            >
              Preview revert
            </button>
            <button
              type="button"
              [disabled]="!store.voxelHistoryPanel().canApplyRevert"
              (click)="store.runVoxelHistoryControl('apply_revert')"
            >
              Apply revert
            </button>
            <button
              type="button"
              [disabled]="!store.voxelHistoryPanel().canUndo"
              (click)="store.runVoxelHistoryControl('undo')"
            >
              Undo
            </button>
            <button
              type="button"
              [disabled]="!store.voxelHistoryPanel().canRedo"
              (click)="store.runVoxelHistoryControl('redo')"
            >
              Redo
            </button>
          </footer>
          <section class="voxel-tools__list" aria-label="Recent voxel edits">
            @for (entry of store.voxelHistoryPanel().entries; track entry.transactionId) {
              <button type="button" (click)="store.selectVoxelHistoryTarget(entry.transactionId)">
                <strong>{{ entry.operationLabel }}</strong>
                <small>{{ entry.transactionId }} · {{ entry.touchedVoxelCount }} voxels</small>
              </button>
            } @empty {
              <small>No edit history has been loaded.</small>
            }
          </section>
        </div>
      } @else {
        <div class="voxel-tools__content" data-voxel-tools-content="automation">
          <header class="voxel-tools__heading">
            <div>
              <strong>Typed automation</strong
              ><small
                >Run a bounded voxel operation transcript through the same public workflow
                surface.</small
              >
            </div>
            <span data-voxel-transcript-receipt>{{ store.voxelTranscriptControl().status }}</span>
          </header>
          <label class="voxel-tools__transcript">
            Operation transcript JSON
            <textarea
              data-voxel-transcript-control="draft"
              spellcheck="false"
              [value]="store.voxelTranscriptControl().draft"
              (input)="store.setVoxelTranscriptDraft($any($event.target).value)"
            ></textarea>
          </label>
          <footer class="voxel-tools__actions">
            <button type="button" data-voxel-transcript-action="run" (click)="store.runVoxelTranscriptControl()">
              Run typed transcript
            </button>
          </footer>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .voxel-tools {
        display: grid;
        grid-template-columns: 8.5rem minmax(0, 1fr);
        min-height: 30rem;
      }

      .voxel-tools__tabs {
        background: #10161b;
        border-right: 1px solid var(--asha-color-border);
        display: flex;
        flex-direction: column;
        padding: 0.35rem;
      }

      .voxel-tools__tabs button {
        background: transparent;
        border: 0;
        color: var(--asha-color-ink);
        flex: 0 0 2.2rem;
        padding: 0 0.55rem;
        text-align: left;
      }

      .voxel-tools__tabs button:hover {
        background: var(--asha-color-control);
      }

      .voxel-tools__tabs button.is-active {
        background: var(--asha-color-control-active);
      }

      .voxel-tools__content {
        display: grid;
        gap: 0.75rem;
        max-height: min(42rem, calc(100vh - 5rem));
        overflow: auto;
        padding: 0.8rem;
      }

      .voxel-tools__heading {
        align-items: start;
        display: flex;
        justify-content: space-between;
      }

      .voxel-tools__heading div,
      .voxel-tools__group,
      .voxel-tools__list {
        display: grid;
        gap: 0.35rem;
      }

      .voxel-tools__heading small,
      .voxel-tools__group > small,
      .voxel-tools__list small {
        color: var(--asha-color-muted);
      }

      .voxel-tools__heading > span {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        border-radius: 999px;
        color: var(--asha-color-muted);
        padding: 0.2rem 0.55rem;
      }

      .voxel-tools__heading > span.is-warning {
        border-color: var(--asha-color-warning);
      }

      .voxel-tools__group {
        border-top: 1px solid var(--asha-color-border);
        padding-top: 0.65rem;
      }

      .voxel-tools__group h3 {
        font-size: 0.72rem;
        margin: 0;
        text-transform: uppercase;
      }

      .voxel-tools__fields {
        display: grid;
        gap: 0.45rem;
      }

      .voxel-tools__fields--two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .voxel-tools__fields--grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      label,
      .voxel-tools__transcript {
        color: var(--asha-color-muted);
        display: grid;
        font-size: 0.68rem;
        gap: 0.2rem;
        text-transform: uppercase;
      }

      input,
      select,
      textarea {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        font: inherit;
        min-height: 2rem;
        min-width: 0;
        padding: 0 0.4rem;
      }

      input[type='file'] {
        padding: 0.25rem;
      }

      textarea {
        min-height: 18rem;
        padding: 0.5rem;
        resize: vertical;
      }

      .voxel-tools__actions {
        display: grid;
        gap: 0.4rem;
        grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      }

      .voxel-tools__actions--inline,
      .voxel-tools__actions--wrap {
        display: flex;
        flex-wrap: wrap;
      }

      .voxel-tools__actions button,
      .voxel-tools__secondary,
      .voxel-tools__list button {
        background: var(--asha-color-control);
        border: 1px solid var(--asha-color-border);
        color: var(--asha-color-ink);
        min-height: 2.2rem;
        padding: 0.35rem 0.55rem;
      }

      .voxel-tools__actions button:disabled,
      .voxel-tools__secondary:disabled {
        color: var(--asha-color-muted);
        opacity: 0.65;
      }

      .voxel-tools__list button {
        display: grid;
        gap: 0.15rem;
        text-align: left;
      }

      @media (max-width: 900px) {
        .voxel-tools {
          grid-template-columns: 1fr;
        }

        .voxel-tools__tabs {
          border-bottom: 1px solid var(--asha-color-border);
          border-right: 0;
          flex-direction: row;
          overflow-x: auto;
        }

        .voxel-tools__fields--two,
        .voxel-tools__fields--grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioVoxelToolsMenuComponent {
  readonly store = inject(StudioWorkspaceStore);
  readonly activeSection = signal<StudioVoxelToolsSection>('convert');
  readonly sections: readonly {
    readonly id: StudioVoxelToolsSection;
    readonly label: string;
  }[] = [
    { id: 'convert', label: 'Convert' },
    { id: 'edit', label: 'Edit' },
    { id: 'asset', label: 'Asset' },
    { id: 'metadata', label: 'Metadata' },
    { id: 'history', label: 'History' },
    { id: 'automation', label: 'Automation' },
  ];
  readonly coordinateFields = [
    { id: 'x1', label: 'Start X' },
    { id: 'y1', label: 'Start Y' },
    { id: 'z1', label: 'Start Z' },
    { id: 'x2', label: 'End X' },
    { id: 'y2', label: 'End Y' },
    { id: 'z2', label: 'End Z' },
  ] as const;

  axisLabel(axis: number): string {
    return ['X', 'Y', 'Z'][axis] ?? String(axis);
  }

  conversionStatus(
    status: string,
    actions: readonly { readonly disabled: boolean }[],
  ): string {
    if (status === 'empty_inputs' || status === 'missing_inputs') {
      return 'Choose a source';
    }
    if (!this.store.workspaceAuthoringAvailable()) {
      return 'Starting authoring';
    }
    if (status === 'ready') {
      return 'Ready';
    }
    if (actions.every(action => action.disabled)) {
      return 'Needs attention';
    }
    return 'Ready';
  }

  compactCoordinate(field: (typeof this.coordinateFields)[number]['id']): number {
    return this.store.voxelCompactEditControl()[field];
  }

  conversionActions<T extends { readonly commandId: string }>(actions: readonly T[]): readonly T[] {
    return actions.filter(action => action.commandId !== 'voxel_conversion.export_evidence');
  }
}
