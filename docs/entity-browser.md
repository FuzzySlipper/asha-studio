# Entity browser / hierarchy selection sync (task asha#3216)

The left dock entity browser is a deterministic projection of the loaded scene/entity state, with
selection synchronized to the viewport through the shared command/timeline path. This is the second
capability lane of the `asha-studio-asset-entity-editor-next-roadmap` series.

## Read model

`src/entity-browser.ts#createStudioEntityBrowserModel({ sceneView, timeline })` projects every
`StudioSceneViewModel` renderable into an ordered entity node carrying:

- `entityId` (= the viewport `renderableId`), `label`, `kind`, deterministic `order`;
- `sourceState` and badges (`authority` / `preview` / `reference`, plus `asset` / `material` /
  `pickable` / `selected`);
- `meshRef` / `materialRef` / `authorityObjectId` provenance;
- a stable `entityListHash` over `{entityId, sourceState, selected}`.

The loaded demo asset (`scene-asset:mesh/demo-crate:1`) appears as a browsable entity with `asset`
and `material` badges.

## Selection sync through the shared command path

Hierarchy selection is synced to the viewport selected renderable through the public
`selection.set_active_entity` command (owned by `@asha/command-registry`), recorded on the shared
GUI/agent timeline in `src/session-workspace.ts`. The entity browser's `selection` block reports the
selected entity id, the synced viewport renderable id, the timeline `sequenceId`, the actor, the
selection hash, and an `inSync` flag — no private UI-only callback.

## Fail-closed diagnostics

`validateEntityBrowser(...)` classifies failures; the live projection has none, and four negative
smokes prove each fails closed:

| code | trigger |
| --- | --- |
| `hierarchy_readback_drift` | entity list diverges from scene-view renderable readback |
| `missing_selected_entity` | selected entity id absent from the projection |
| `stale_entity_list` | recorded entity-list hash ≠ recomputed hash |
| `unsupported_private_entity_source` | an entity sourced from a non-public/private source state |

## Verification

- `pnpm run verify`
- `pnpm run proof:entity-browser` (`scripts/entity-browser-proof.ts` + `scripts/readback-entity-browser-proof.mjs`) —
  Node-only proof of the deterministic projection, hash stability, asset browsability, selection sync,
  viewport correlation, and fail-closed negative smokes.
- `pnpm run proof:browser` / `pnpm run proof:visual-capability` — browser/visual evidence.

## Non-claims

The entity browser is a projection of public scene-view readback, not a private ECS or product asset
database. It makes no Rust/WASM authority, native runtime, Agora compositor, hardware GPU, or
performance claims; runtime authority bootstrap remains behind the `asha#3047` runtime-bridge gate.
