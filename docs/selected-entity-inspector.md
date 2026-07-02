# Selected entity inspector read/edit surface (task asha#3217)

Script status: `proof:inspector`, `proof:browser`, and
`proof:visual-capability` are historical or deferred proof command names, not
current package scripts. Their status is tracked by
`docs/script-reference-policy.json`.

The right dock selected entity inspector turns the inspector into a useful read/edit surface for the
shared scene-view selected entity: structured identity/provenance/transform readback plus a typed,
command/timeline-visible edit for one safe supported field. This is the third capability lane of the
`asha-studio-asset-entity-editor-next-roadmap` series and builds on the entity browser selection
sync (`asha#3216`).

## Read model

`src/selected-entity-inspector.ts#createStudioSelectedEntityInspectorModel({ sceneView, entityBrowser, timeline, commandResults })`
projects the shared selected entity (`sceneView.selection.selectedRenderableId`) into:

- `identity`: `entityId`, `kind`, `displayName` (default label or applied name), `defaultLabel`,
  `sourceState`, `authorityObjectId`, `selectionHash`;
- `provenance`: `meshRef`, `materialRef`, classification `badges`, `evidenceSource`, and the
  `selection.set_active_entity` `selectionSequenceId`;
- `transform`: read-only translation / rotation quaternion / scale;
- `fields`: a typed list over the supported readback allowlist, each marked `editable` / `supported`
  with its backing `commandId`;
- a stable `inspectorHash` over `{entityId, displayName, sourceState, transform, fieldKeys}`.

## Editing through the shared command path

Exactly one field — `name` — is editable in this slice. The edit flows through the new public
`entity.set_name` command (owned by `@asha/command-registry`, `editor_local`, `editor`-mutating),
recorded on the shared GUI/agent timeline in `src/session-workspace.ts`. There is no private
UI-only mutation callback and no freeform JSON field write.

The applied display name is a real cross-surface readback update:

- the typed `SetEntityNameOutput` (`entityId`, `renderableId`, `name`, `nameHash`, `applied`) is the
  command-result evidence;
- `StudioSceneViewModel.selectedEntityDisplayName` and the viewport 3D readback
  (`selectedEntityName` + the `selected-entity-name:<name>` semantic marker) reflect the new name;
- the inspector is exported in the agent readout.

The inspector's `edit` block validates the command actually renamed the inspected entity (matching
entity/renderable/name + `applied`) rather than merely being present.

## Fail-closed diagnostics

`validateSelectedEntityInspector(...)` and `validateInspectorEdit(...)` classify failures; the live
inspector has none, and five negative smokes prove each fails closed:

| code | trigger |
| --- | --- |
| `missing_selected_entity` | selected entity id absent from the scene-view readback |
| `inspector_readback_drift` | inspector projection diverges from the shared viewport selection |
| `stale_inspector_state` | recorded inspector hash ≠ recomputed hash |
| `unsupported_field_edit` | an edit targets a non-editable / non-allowlisted field |
| `edit_command_mismatch` | `entity.set_name` renamed a different entity/name than the inspector edit |

## Verification

- `pnpm run verify`
- `pnpm run proof:inspector` (`scripts/selected-entity-inspector-proof.ts` +
  `scripts/readback-selected-entity-inspector-proof.mjs`) — Node-only proof of the deterministic
  projection, hash stability, the single editable field, the command/timeline-visible name edit, the
  typed command-result evidence, the viewport readback update, and fail-closed negative smokes.
- `pnpm run proof:browser` / `pnpm run proof:visual-capability` — browser/visual evidence.

## Non-claims

The inspector is a projection of public scene-view/entity-browser readback, not a private ECS
component store. Only the editor-local display name is editable; transform/material/provenance fields
are read-only browser/reference readback. It makes no Rust/WASM authority, native runtime, Agora
compositor, hardware GPU, or performance claims; authoritative entity edits remain behind the
`asha#3047` runtime-bridge readiness gate.
