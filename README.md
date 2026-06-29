# ASHA Studio

ASHA Studio is a distinct frontend-heavy studio/reference app for composing ASHA workflows through public ASHA command and evidence surfaces.

> ASHA owns what commands mean. `asha-studio` owns how humans and agents compose those commands visually.

This repo is intentionally separate from:

- `asha` — backend-heavy engine substrate, Rust authority, generated contracts, public command/evidence packages.
- `asha-demo` — narrow demo/playground/reference proofs.

## Current baseline

Task `asha#2730` establishes a Vite/TypeScript shell with visible regions required by the V1 plan:

- scenario/session panel;
- viewport editor panel;
- command palette/menu mirror;
- command timeline;
- inspector/readout panel;
- evidence/export panel.

The app consumes `@asha/command-registry` through the package root and projects the command catalog into UI/readout data. Task `asha#3042` adds a real Three.js-backed browser canvas in the central viewport as a **local projection dependency**; task `asha#3043` layers deterministic camera/tool interaction proof over that canvas/readback; task `asha#3044` adds viewport pick/hit-test evidence with positive hit, background no-hit, and stale camera/viewport guards. `three` renders the Studio-owned `StudioSceneViewModel`, but it does not own authority, mutate state, import `@asha/renderer-three`, or claim native runtime/Agora/GPU/performance evidence.

## Local development

```bash
pnpm install
pnpm run dev
pnpm run verify
pnpm run proof:v1
pnpm run proof:browser
pnpm run proof:visual-contract
pnpm run proof:visual-capability
pnpm run proof:v2-live-backend-evidence
```

The current local ASHA package linkage uses package-root links to `/home/dev/asha/ts/packages/*` because the ASHA packages are not published. The boundary checker allows only those explicit public package roots and rejects source/internal/generated/raw transport imports.

## Boundary policy

`boundary-policy.json` is the machine-readable import/dependency policy used by `pnpm run check:boundaries`.

Current source imports may use only the public package roots approved in `boundary-policy.json`: `@asha/command-registry`, `@asha/contracts`, `@asha/devtools`, `@asha/editor-tools`, `@asha/game-workspace`, and `@asha/runtime-bridge`. The package manager may keep explicit local package-root links while ASHA packages are unpublished, but source code must not import ASHA package subpaths, generated files by path, native/raw transports, or engine repo internals.

If a studio task needs a new ASHA capability, request or implement a public ASHA package/surface in the ASHA repo first. Do not bypass the boundary with package `src/**` imports, generated contract file paths, raw native/WASM transports, aliases into `/home/dev/asha`, or arbitrary `call(methodName, json)` command hatches.

## Compatibility metadata

Task `asha#2732` adds startup/session compatibility readback for public ASHA surfaces. The shell records:

- `@asha/contracts` compatibility: `contracts.v0`;
- `@asha/command-registry` compatibility: `command-registry.v0`;
- deferred `@asha/studio-evidence` marker: `studio-evidence.deferred-v0`;
- `@asha/runtime-bridge` compatibility: `runtime-bridge.v0` when Studio is consuming the V2 selected-backend proof path;
- supported runtime modes for this shell: `mock`, `reference`, `native`, and `unavailable`.

Native mode now remains fail-closed unless runtime bridge compatibility metadata and the selected-backend proof artifacts are present. WASM runtime mode still fails closed until an equivalent public facade path and metadata land. Task `asha#3047` adds the durable runtime bridge readiness gate in `docs/runtime-bridge-readiness-gate.md` and the machine-readable `evaluateRuntimeBridgeReadinessGate(...)` helper in `src/runtime-bridge-readiness.ts`; the gate lists required DTOs, facade operations, proof updates, negative smokes, and non-claims before Studio may replace browser-reference state with runtime authority. Update `src/compatibility.ts`, `src/runtime-bridge-readiness.ts`, fixtures, and compatibility/readiness tests when ASHA generated contracts, command registry compatibility, or runtime bridge compatibility changes.

## Session workspace and command timeline

Task `asha#2733` adds a mock/reference Studio workspace model with a shared human/agent command timeline. The shell now starts a deterministic preview session, loads the `voxel-basic` scenario through the same command registry path used for agent-originated calls, records structured command results, and exports `fixtures/studio-agent-readout.sample.json`.

Current supported readout starts with session/workspace commands (`session.start`, `session.load_scenario`, and `inspection.session_status`) and extends through the V1 voxel workflow (`inspection.voxel`, `selection.voxel_from_screen_point`, `preview.voxel_brush`, `authority.voxel.apply_brush`, `render.capture_before_after`, and `export.agent_readout`). The V2 selected-backend proof path additionally records native attach/session metadata, accepted/rejected command proposals, replay/evidence refs, and live readback through public `@asha/runtime-bridge`/`@asha/devtools` surfaces.

## Voxel inspect/select/preview/apply workflow

Task `asha#2734` adds the first visible voxel workflow in the Studio mock/reference workspace. The workflow selects voxel `(0, 0, 0)`, previews a `VoxelCommand.setVoxel` edit at anchor `(1, 0, 0)`, applies it through the public typed command proposal path from `@asha/editor-tools` / `@asha/contracts`, records timeline entries for inspect/select/preview/apply, and exports before/after structured evidence in `fixtures/studio-voxel-workflow-evidence.sample.json`.

Preview remains editor-local and reports `authority unchanged`; the apply step is the only authority-mutating timeline row and records accepted/rejected counts plus deterministic before/after evidence hashes. Native `@asha/runtime-bridge` execution remains deferred until that public surface is approved for Studio.

## Visual evidence and review export workflow

Task `asha#2735` adds review-grade software visual evidence for the V1 Studio path. The workspace now records a classified `software_snapshot` before/after visual evidence ref, stable relative before/after artifact paths, render hashes, command-sequence correlation, and a fail-closed `review_export` artifact. The export validates that timeline/results are current, visual evidence exists, before/after render hashes changed, and ASHA compatibility evidence is present before reporting `captureReadiness: "ready"`.

This is functional proof-content evidence only. It is intentionally not browser screenshot, Agora capture, hardware GPU, or performance evidence; those remain later capture-backend tasks.

## Command batch / undo workflow

Task `asha#2737` adds Studio-owned command batch and undo/revert metadata for the V1 voxel path. The implementation keeps batching bounded to known public command ids rather than adding a generic command hatch:

- `src/command-batch.ts` defines atomic/best-effort batch invocation/result artifacts;
- batch invocation records transaction mode, dry-run flag, expected authority state hash, typed per-command plans, and GUI/agent actors;
- batch results include one per-command result for every command plan, retry classification, undo posture, inverse-data requirements, state/render before-after hashes, diagnostics, and failure classification;
- a best-effort partial-failure example classifies stale state as `state_hash_mismatch` instead of pretending the whole batch succeeded;
- the V1 voxel edit derives a concrete typed inverse `VoxelCommand.setVoxel` revert when the post-apply authority hash still matches.

The visible Studio app exposes this as **Command Batch / Undo Metadata**. A deterministic fixture lives at `fixtures/studio-command-batch.sample.json` and can be regenerated with:

```bash
pnpm exec tsx scripts/generate-command-batch-fixture.ts
```

This remains reference workflow metadata over public command/contract evidence. It does not introduce a generic authority undo stack or raw runtime transport.

## Model/material preview workflow

Task `asha#2736` adds a narrow public-surface model/material preview lane. Studio now builds a reference `model_material_preview` artifact from `@asha/contracts` package-root DTOs:

- `Catalog` / `CatalogEntry` / `MaterialProjection` for material metadata;
- `StaticMeshAsset` for a static mesh fixture;
- `RenderFrameDiff` operations (`defineMaterial`, `defineStaticMesh`, `createStaticMeshInstance`) for renderer-facing preview evidence.

The preview is visible in the Studio app as **Model / Material Preview** and exported as:

- `fixtures/studio-model-material-preview.sample.json`
- `fixtures/studio-model-material-preview.sample.svg`

This is intentionally a reference preview over public contract DTOs, not a native runtime render. The artifact records current surface findings: contracts are available, `asha#2895` has promoted first-class model/material inspect/preview command identities and a public runtime bridge operation upstream, and Studio still defers direct `@asha/runtime-bridge` consumption until runtime compatibility is approved for this repo.

## Viewport editor panel

Task `asha#2918` turns the viewport from a placeholder into a narrow agent-observable editor panel. The panel is still a Studio-owned `software_snapshot_reference` projection, but it now displays meaningful editor state tied to the existing typed V1 workflow:

- selected voxel/readout plus model/material context;
- preview-vs-applied state with distinct authority/render hashes;
- command timeline correlation for inspect, select, preview, apply, capture, and export rows;
- evidence refs for voxel workflow state, before/after visual artifacts, and model/material preview output;
- automation markers (`studio-viewport-editor-panel`, `viewport-selected-target-readout`, `viewport-preview-state-readout`, `viewport-applied-state-readout`, `viewport-timeline-correlation-readout`) used by tests and browser capture readback.

The exported agent readout includes the same `viewport_editor_panel` object so human UI and agent/reviewer artifacts observe the same viewport state. A deterministic fixture lives at `fixtures/studio-viewport-editor-panel.sample.json`.

## Real browser 3D viewport host

Task `asha#3042` replaces the central dock's purely styled reference projection with a real browser canvas/WebGL host. Studio uses `three` directly as a local browser projection dependency for this repo, rather than importing deferred `@asha/renderer-three`. The renderer consumes the checked-in `StudioSceneViewModel` readout and projects:

- grid/floor and axes;
- selected voxel geometry plus DOM/readback marker `selected-target-highlight`;
- editor-local preview ghost marker `preview-ghost-renderable`;
- applied authority-state renderable marker `applied-state-renderable`;
- model/material preview crate from the public contract DTO preview artifact.

The browser proof/readback now records a `viewport_3d_readback` artifact with canvas marker `studio-3d-webgl-canvas`, visible renderable count, selected target, preview ghost, applied renderable, and explicit non-claims. Task `asha#3043` adds a deterministic `viewport_camera_tool_interaction_proof` nested in the scene-view/readback: the shared timeline records a GUI frame-selected command (`inspection.editor_state`), an agent screen-point selection command, and a GUI preview-ghost command, while camera/tool before/after hashes and stale-readback guards fail closed if camera, selection, or preview evidence diverges. Task `asha#3044` adds `viewport_pick_hit_test_evidence`: the scene model records the expected pick contract, while `buildStudioViewport3dReadback` constructs the same Three.js scene/camera used by the browser host and runs `THREE.Raycaster` against the pickable renderables. The readback records the selected-target screen point, viewport dimensions/hash, camera pose/projection hash, raycast hit renderable/voxel/face/normal/world point, structured background no-hit result, selection/inspector/hierarchy/timeline cross-checks, and stale guards that fail closed if camera, viewport, selection, inspector, hierarchy, selected face/edit-anchor, or pick identity evidence changes without refreshed pick evidence. Task `asha#3045` extends `artifacts/browser-capture/latest/index.json` with `viewport_visual_delta_crop_proof`: same-region edit-anchor crops sourced from distinct `before` and `after` Studio viewport phase screenshots, crop rectangles in screenshot pixels, crop paths/hashes, linked source-state handles, voxel IDs, camera hash, command IDs, before/after scene hashes, and stale guards that fail closed on unchanged or mismatched crop/scene hashes or same-screenshot before/after sources. This is still browser projection evidence only: it does not claim native/WASM runtime bridge execution, Agora compositor capture, hardware GPU evidence, or performance.

## Browser visual capture

Task `asha#2739` adds a Chromium headless browser screenshot capture/readback path for the completed Studio V1 proof:

```bash
pnpm run proof:browser
```

The command first regenerates the full `proof:v1` artifact, then serves both the built Studio app route and generated V1 proof route over local HTTP. Chromium captures:

- `artifacts/browser-capture/latest/studio-app.png` — browser screenshot of the Studio app route with boundary, scenario, command catalog, readout, evidence/export, and command timeline markers.
- `artifacts/browser-capture/latest/v1-proof-before-after.png` — browser screenshot of the generated V1 proof route with before/after evidence and all 9 proof steps.
- `artifacts/browser-capture/latest/index.json` — machine-readable browser capture proof with screenshot SHA-256 values, linked V1 proof artifact SHA-256, proof-content marker readiness, timeline correlation, before/after render-hash comparison, and truthful capture backend classification.

The browser capture is fail-closed: missing app/proof markers, missing timeline command IDs, missing linked artifact, unchanged before/after render hashes, or screenshot/hash readback mismatch fail the command. It is browser screenshot evidence via Chromium headless CLI; it still does not claim Agora compositor capture, native runtime bridge, hardware GPU, or performance evidence.

## Visual-contract candidate proof

Task `asha#3123` adds stable ASHA visual-contract markers to the current Studio DOM and a reproducible candidate-generation proof:

```bash
pnpm run proof:visual-contract
```

The proof route serves `dist/index.html?visualContract=1`, which keeps the current Studio shell vocabulary but compacts the page into the `1920x1080` visual-contract viewport used by the `asha#3130` target fixture. The browser evidence collector uses `[data-visual-id="asha_studio_shell"]` as the root, captures `viewport-clipped` evidence, converts it through the `visual-contract` service, and compares the generated current candidate against `fixtures/visual-contract/asha-studio-ui-test.target.contract.json`.

Generated checked-in handles:

- `fixtures/visual-contract/asha-studio-current.candidate.contract.json`
- `fixtures/visual-contract/asha-studio-current.negative.contract.json`
- `fixtures/visual-contract/asha-studio-current.proof.json`
- deployed-service artifact copies under `fixtures/visual-contract/artifacts/<run_id>/report.json` and `diff.overlay.svg`
- collector evidence under `artifacts/visual-contract/latest/`

The candidate includes canonical `data-visual-id` / `data-visual-role` evidence for `scene_hierarchy`, `central_3d_viewport`, `selected_target_inspector`, `command_timeline`, `evidence_dock`, limitation labels, `selection_outline`, `preview_ghost`, `axis_gizmo`, and applied/preview state markers. The negative smoke removes `selected_target_inspector` and undersizes `central_3d_viewport`; readback requires the visual-contract report to fail closed with those diagnostics. This is browser layout/affordance evidence only and complements, but does not replace, scene/camera/pick/readback proof.

## Visual capability proof

Task `asha#3046` consolidates the prior browser, Three.js readback, pick, visual-delta, command/hash, and deployed visual-contract evidence into a single reviewer-facing proof:

```bash
pnpm run proof:visual-capability
```

The command regenerates `proof:browser`, regenerates `proof:visual-contract` against the deployed service on `den-srv`, then writes:

- `artifacts/visual-capability/latest/index.json` — reproducible generated proof artifact;
- `fixtures/studio-visual-capability-proof.sample.json` — checked-in sample readback used by tests.

The proof groups diagnostics by capability: scene/camera/renderable readback, viewport pick/hit-test, before/after visual-delta crops, visual-contract layout/affordance comparison, command/authority/render-hash correlation, and explicit non-claim limitations. It also records fail-closed negative smokes for missing scene readback, missing pick evidence, stale visual deltas, missing/failed visual-contract proof, and unsupported GPU/native evidence claims.

This is still agent-observable browser/reference/layout evidence. It intentionally does not claim Rust/WASM authority execution, native runtime bridge execution, Agora compositor capture, hardware GPU evidence, or performance evidence.

## Runtime bridge readiness gate

Task `asha#3047` defines the exact gate for replacing browser/reference visual state with authoritative runtime or WASM snapshots. The durable checklist is in `docs/runtime-bridge-readiness-gate.md`; the machine-readable helper is `evaluateRuntimeBridgeReadinessGate(...)` in `src/runtime-bridge-readiness.ts`.

The gate currently reports `deferred` for mock/reference workflows and `failed_closed` for `native`/`wasm` until all of the following exist through public package roots: `@asha/runtime-bridge` compatibility `runtime-bridge.v0`, typed scene snapshot DTOs, typed command-application results, replay/golden records, runtime render/readback evidence, a classified runtime error taxonomy, and visual-capability proof updates with runtime-specific negative smokes. Studio must still not import raw native/WASM transports or claim runtime authority from browser/Three.js evidence alone.

## End-to-end V1 proof

A reviewer can run the complete V1 visual edit proof with one command:

```bash
pnpm run proof:v1
```

The proof command runs the normal verifier, serves the built `dist/` app over a local static HTTP server, checks required UI markers, verifies boundary policy, creates before/after SVG software-snapshot evidence, writes `artifacts/v1-proof/latest/index.json`, and runs `scripts/readback-v1-proof.mjs` against the generated artifact.

Expected success markers:

```text
asha-studio V1 proof: OK (artifacts/v1-proof/latest/index.json)
asha-studio V1 proof readback: OK (9 proof steps, 3 artifact file(s))
```

Generated `artifacts/` output is intentionally git-ignored; rerun `pnpm run proof:v1` to reproduce the review artifact and visual evidence files.

## Verification

```bash
pnpm run check:boundaries
pnpm run test
pnpm run build
pnpm run smoke:static
pnpm run proof:browser
pnpm run proof:visual-contract
pnpm run proof:visual-capability
git diff --check
```

## Known limitations

- Real in V2 selected-backend path: distinct `asha-studio` repo; package-root boundary enforcement; compatibility readback; runtime bridge readiness gate; shared GUI/agent command timeline; visible viewport/editor proof surfaces; public `@asha/runtime-bridge`/`@asha/devtools` selected-backend attach evidence; accepted/rejected native command proposal readback; replay/evidence refs; and `pnpm run proof:v2-live-backend-evidence` as the closeout proof command.
- Still reference/projection-only outside the selected-backend proof: durable timeline persistence, direct Studio consumption of upstream model/material runtime readback, Agora compositor capture as a formal proof command, hardware GPU capture, performance evidence, and WASM authority.
- `@asha/studio-evidence` is a deferred public package from the schema design; current V1/browser/V2 proof commands use Studio-owned review/proof artifact schemas until that package lands.
- Browser screenshots are Chromium headless CLI evidence and generated proof artifacts are git-ignored/reproducible; do not treat them as hardware, GPU, Agora, or performance evidence.
