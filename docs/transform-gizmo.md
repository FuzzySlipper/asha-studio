# Selection / transform gizmo manipulation (task asha#3218)

The viewport transform gizmo moves from pick proof to editor manipulation proof: it turns the shared
scene-view selected entity into a transform gizmo read model with visible selection outline/handles
and a single, constrained, command/timeline-visible transform (translate along one axis) with
preview/apply separation and structured before/after evidence. This is the fourth capability lane of
the `asha-studio-asset-entity-editor-next-roadmap` series and builds on the selected entity inspector
(`asha#3217`).

## Read model

`src/transform-gizmo.ts#createStudioTransformGizmoModel({ sceneView, timeline, commandResults })`
projects the shared selected entity (`sceneView.selection.selectedRenderableId`) into:

- `selection`: selected entity id, viewport renderable id, in-sync flag, selection/gizmo hashes;
- `handles`: three axis handles (`x`/`y`/`z`), each `visible` with an axis colour; the active axis
  (`x`) is the only one wired to the typed command in this slice;
- `transform`: read `before` (from the scene-view renderable), `preview`, and `after` translation
  plus the `axis`/`delta`. `after` is computed independently (`before` + `delta` along `axis`) so a
  command that reports a wrong after-translation is detectable as a mismatch;
- `edit`: the typed command edit (preview + apply sequence ids, mutation source, applied/in-sync);
- a stable `gizmoHash` over `{entityId, axis, translationBefore, translationAfter, handleAxes}`.

## Preview / apply through the shared command path

The translate is the new public `transform.translate_entity` command (owned by
`@asha/command-registry`, `editor_local`, `editor`-mutating). It is recorded twice on the shared
GUI/agent timeline in `src/session-workspace.ts` as distinct sequences:

- **preview** (`mode: 'preview'`, `applied: false`) — an editor-local drag preview (ghost), not
  committed;
- **apply** (`mode: 'apply'`, `applied: true`) — the committed editor-local transform.

There is no private UI-only manipulation callback, no generic event bus, and no freeform JSON
transform write. The committed transform's `mutationSource` must be the typed command result
(`transform.translate_entity_command`).

The transform is a real cross-surface viewport update:

- the typed `TranslateEntityOutput` (`entityId`, `renderableId`, `axis`, `delta`, `mode`,
  `translationBefore`, `translationAfter`, `transformHash`, `applied`) is the command-result evidence;
- `buildStudioViewport3dReadback(sceneView, gizmo)` exposes a `transformGizmo` readback
  (`translationBefore`/`translationAfter`, `activeAxis`, `applied`, handle axes) and
  `gizmo-handle-*` / `gizmo-translate:<axis>:<delta>` semantic markers;
- `renderStudioViewport3dHost(sceneView, { gizmo })` renders the selection outline, the three axis
  handles (active highlighted), a preview ghost box, the applied box, and the translate delta line;
- the gizmo is exported in the agent readout.

## Fail-closed diagnostics

`validateGizmoSelection`, `validateGizmoHandles`, `validateGizmoEdit`, and
`validateGizmoMutationSource` classify failures; the live gizmo has none, and five negative smokes
prove each fails closed:

| code | trigger |
| --- | --- |
| `missing_selected_entity` | gizmo target id absent from the scene-view readback |
| `stale_gizmo_selection` | recorded gizmo hash ≠ recomputed, or selection drifted from the viewport |
| `missing_gizmo_handle` | no visible, command-wired handle for the active axis |
| `transform_readback_mismatch` | the apply command moved a different entity/axis/translation than the gizmo readback (or is absent) |
| `private_mutation_path` | a committed transform did not come from the public typed command result |

## Verification

- `pnpm run verify`
- `pnpm run proof:gizmo` (`scripts/transform-gizmo-proof.ts` +
  `scripts/readback-transform-gizmo-proof.mjs`) — Node-only proof of the deterministic projection,
  hash stability, three handles / one active axis, the preview+apply command/timeline-visible
  translate, the typed command-result evidence, the viewport readback update with the before/after
  delta, and fail-closed negative smokes.
- `pnpm run proof:browser` / `pnpm run proof:visual-capability` — browser/visual evidence (the gizmo
  panel, handles, and applied/preview boxes render in the Three.js viewport host).

## Non-claims

Only single-axis translate is supported in this slice; rotate/scale and multi-axis manipulation
remain deferred. The gizmo is a deterministic projection of the shared scene-view selected entity,
not a private ECS transform component store, and the transform is an editor-local edit over public
readback. It makes no physics, native runtime, Agora compositor, hardware GPU, or performance claims;
authoritative transform mutation remains behind the `asha#3047` runtime-bridge readiness gate.
