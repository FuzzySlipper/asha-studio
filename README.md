# ASHA Studio

ASHA Studio is a distinct frontend-heavy studio/reference app for composing ASHA workflows through public ASHA command and evidence surfaces.

> ASHA owns what commands mean. `asha-studio` owns how humans and agents compose those commands visually.

This repo is intentionally separate from:

- `asha-engine` — backend-heavy engine substrate, Rust authority, generated contracts, public command/evidence packages.
- `asha-testing` — synthetic proof, conformance, boundary, and reference-workspace harnesses.
- `asha-demo` — human-facing demos and product-content experiments built on public ASHA surfaces.

## Current baseline

Task `asha#2730` established the initial Vite/TypeScript shell. The current product layout keeps persistent space for authoring work and moves contextual workflows into the application menu:

- File, Project, Runtime, Voxel, and view/preference menus;
- viewport editor panel;
- command timeline;
- inspector/readout panel;
- asset and catalog workspace.

The old permanent scenario/runtime proof strip is no longer part of the normal
layout. Runtime controls, workspace identity, the temporary fixture-scenario
switcher, and the gameplay inspector are available from the top-bar **Runtime**
menu. Project scene open/save remains under **File** and is the path intended to
replace the temporary scenario switcher as unified scene persistence matures.

The app consumes public engine package roots and projects their typed command,
runtime, and evidence surfaces into Studio UI. The central viewport consumes the
backend-neutral `@asha/renderer-host` root. Studio owns authored-preview diffs,
selection/gizmo/debug policy, and input intent; the engine owns concrete
rendering, coordinate realization, resize/render lifecycle, picking, and GPU
resource disposal. Direct renderer dependencies and renderer backend subpaths
are forbidden in this repository.

## Local development

Clone beside the engine repo:

```bash
cd /home/dev
git clone git@github.com:FuzzySlipper/asha-engine.git asha-engine
git clone git@github.com:FuzzySlipper/asha-studio.git asha-studio
cd asha-studio
```

```bash
pnpm install
pnpm run dev
pnpm run check:docs-scripts
pnpm run verify
pnpm run evidence:v2-live-backend
```

See `docs/studio-scripts.md` for the product/evidence script split. Product
workflow commands (`dev`, `build`, `check`, `verify`) are the normal Studio
surface; evidence generators run through `pnpm run evidence -- <name>` or a
small number of explicit evidence aliases. `pnpm run evidence:list` shows only
current product evidence by default. Historical milestone and delegated proof
scripts are classified in `scripts/studio-evidence-catalog.json`; they are not
auto-discovered from `scripts/proof-*.ts`.

Scene **New**, **Open**, **Save**, and **Save As** use ordinary files on the
Studio host. Paths may be absolute or relative to the host service start
directory; a browser connected over LAN always operates on the host filesystem,
not its own machine. See `docs/project-workspace-persistence.md` for canonical
scene serialization, atomic/stale-write behavior, and the optional workspace
pointer artifact.

The current local ASHA package linkage uses package-root links to `/home/dev/asha-engine/ts/packages/*` because the ASHA packages are not published. The boundary checker reads ASHA's public-surface manifest at `/home/dev/asha-engine/harness/public-surface/ts-packages.json` for the `asha-studio` consumer role, then allows only those explicit public package roots and rejects source/internal/generated/raw transport imports.

## Boundary policy

`boundary-policy.json` is the local boundary configuration used by `pnpm run check:boundaries`; ASHA package allow/deny policy comes from the engine manifest it references.

Current source imports may use only the public package roots approved for
`asha-studio` in the ASHA manifest. The installed Studio set includes
`@asha/browser-host`, `@asha/command-registry`, `@asha/catalog-core`,
`@asha/contracts`, `@asha/devtools`, `@asha/editor-tools`,
`@asha/game-workspace`, `@asha/renderer-host`, `@asha/runtime-bridge`, and
`@asha/runtime-session`. The package manager may keep explicit local
package-root links while ASHA packages are unpublished, but source code must not
import ASHA package subpaths, generated files by path, native/raw transports,
renderer backends, or engine repo internals.

If a studio task needs a new ASHA capability, request or implement a public ASHA package/surface in the ASHA repo first. Do not bypass the boundary with package `src/**` imports, generated contract file paths, raw native/WASM transports, aliases into `/home/dev/asha-engine`, or arbitrary `call(methodName, json)` command hatches.

`docs/studio-limitations.md` records durable runtime/visual/non-claim limitations. `docs/script-reference-policy.json` records old proof command names that remain in historical docs as retired or deferred references; `pnpm run check:docs-scripts` rejects any new missing script reference without an explicit status. `pnpm run check:evidence-catalog` rejects uncategorized `scripts/proof-*.ts` files so synthetic proof scripts cannot silently become the supported Studio path.

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

That description is historical. The current main viewport is the engine-owned
renderer host described below. Studio no longer fabricates a voxel cube for a
`voxelVolume` scene node: live workspace-authoring geometry is read from
`WorkspaceAuthoringFacade.readProjection()` and applied as typed retained
render diffs.

## Engine-owned browser viewport host

Task `asha#5738` replaces the old downstream concrete renderer with the public
`@asha/renderer-host` editor viewport. The three isolated retained channels are:

- `runtime` for current RuntimeSession render frames;
- `authored` for stored scene projection, workspace-authoring voxel geometry,
  and model/material preview diffs;
- `overlay` for Studio-owned grid, selection, gizmo, and disposable pick/debug
  semantics.

Local handles are namespaced by the host, so equal handle values in different
channels cannot collide. The host owns mount, resize, render, stop, disposal,
coordinate realization, and viewport-coordinate picking. Studio receives only
typed pick hints and maps them to stored proposals or to Rust-revalidated
runtime selection/commands.

When RuntimeSession is attached, the viewport uses the authoritative camera
snapshot and routes look/pan/zoom intent through the public camera-input path.
It reads public runtime projection, scene-object snapshot, material preview,
voxel selection/mesh evidence, and buffer-lifetime evidence from the same
one-cell browser-host provider. Stored authoring remains visibly distinct and
is not mutated until an explicit stored edit or runtime apply action. Disconnect
unloads the ProjectBundle, clears runtime-only channels/readouts, and preserves
stored sources.

Voxel asset creation and editing do not require a gameplay RuntimeSession. The
public workspace-authoring facade emits real inline mesh payloads for the main
viewport. A saved `voxelVolume` scene node retains its typed asset reference and
Studio host path; opening the scene validates and reloads the `.avxl.json` asset
through Rust authority before projecting it again.

`pnpm run evidence -- native-voxel-runtime-launch` proves healthy stored and
runtime channels, isolated missing-resource rejection, stale scene-command
rejection, missing/invalid runtime providers, authoritative camera movement,
voxel pick revalidation, released buffers, and browser-session teardown.

## Historical browser visual capture

Task `asha#2739` described a Chromium headless browser screenshot capture/readback path for the completed Studio V1 proof. The old `pnpm run proof:browser` name is now a retired historical script reference tracked in `docs/script-reference-policy.json`, not a current package script.

That historical command first regenerated the full `proof:v1` artifact, then served both the built Studio app route and generated V1 proof route over local HTTP. Chromium captured:

- `artifacts/browser-capture/latest/studio-app.png` — browser screenshot of the Studio app route with boundary, scenario, command catalog, readout, evidence/export, and command timeline markers.
- `artifacts/browser-capture/latest/v1-proof-before-after.png` — browser screenshot of the generated V1 proof route with before/after evidence and all 9 proof steps.
- `artifacts/browser-capture/latest/index.json` — machine-readable browser capture proof with screenshot SHA-256 values, linked V1 proof artifact SHA-256, proof-content marker readiness, timeline correlation, before/after render-hash comparison, and truthful capture backend classification.

The browser capture is fail-closed: missing app/proof markers, missing timeline command IDs, missing linked artifact, unchanged before/after render hashes, or screenshot/hash readback mismatch fail the command. It is browser screenshot evidence via Chromium headless CLI; it still does not claim Agora compositor capture, native runtime bridge, hardware GPU, or performance evidence.

## Historical visual-contract candidate proof

Task `asha#3123` added stable ASHA visual-contract markers to the Studio DOM and described a reproducible candidate-generation proof. The old `pnpm run proof:visual-contract` name is now a retired historical script reference tracked in `docs/script-reference-policy.json`, not a current package script.

The proof route serves `dist/index.html?visualContract=1`, which keeps the current Studio shell vocabulary but compacts the page into the `1920x1080` visual-contract viewport used by the `asha#3130` target fixture. The browser evidence collector uses `[data-visual-id="asha_studio_shell"]` as the root, captures `viewport-clipped` evidence, converts it through the `visual-contract` service, and compares the generated current candidate against `fixtures/visual-contract/asha-studio-ui-test.target.contract.json`.

Generated checked-in handles:

- `fixtures/visual-contract/asha-studio-current.candidate.contract.json`
- `fixtures/visual-contract/asha-studio-current.negative.contract.json`
- `fixtures/visual-contract/asha-studio-current.proof.json`
- deployed-service artifact copies under `fixtures/visual-contract/artifacts/<run_id>/report.json` and `diff.overlay.svg`
- collector evidence under `artifacts/visual-contract/latest/`

The candidate includes canonical `data-visual-id` / `data-visual-role` evidence for `scene_hierarchy`, `central_3d_viewport`, `selected_target_inspector`, `command_timeline`, `evidence_dock`, limitation labels, `selection_outline`, `preview_ghost`, `axis_gizmo`, and applied/preview state markers. The negative smoke removes `selected_target_inspector` and undersizes `central_3d_viewport`; readback requires the visual-contract report to fail closed with those diagnostics. This is browser layout/affordance evidence only and complements, but does not replace, scene/camera/pick/readback proof.

## Historical visual capability proof

Task `asha#3046` consolidated the prior browser-local renderer readback, pick, visual-delta, command/hash, and deployed visual-contract evidence into a reviewer-facing proof. The old `pnpm run proof:visual-capability` name is now a retired historical script reference tracked in `docs/script-reference-policy.json`, not a current package script.

That historical command regenerated `proof:browser`, regenerated `proof:visual-contract` against the deployed service on `den-srv`, then wrote:

- `artifacts/visual-capability/latest/index.json` — reproducible generated proof artifact;
- `fixtures/studio-visual-capability-proof.sample.json` — checked-in sample readback used by tests.

The proof groups diagnostics by capability: scene/camera/renderable readback, viewport pick/hit-test, before/after visual-delta crops, visual-contract layout/affordance comparison, command/authority/render-hash correlation, and explicit non-claim limitations. It also records fail-closed negative smokes for missing scene readback, missing pick evidence, stale visual deltas, missing/failed visual-contract proof, and unsupported GPU/native evidence claims.

This is still agent-observable browser/reference/layout evidence. It intentionally does not claim Rust/WASM authority execution, native runtime bridge execution, Agora compositor capture, hardware GPU evidence, or performance evidence.

## Runtime bridge readiness gate

Task `asha#3047` defines the exact gate for replacing browser/reference visual state with authoritative runtime or WASM snapshots. The durable checklist is in `docs/runtime-bridge-readiness-gate.md`; the machine-readable helper is `evaluateRuntimeBridgeReadinessGate(...)` in `src/runtime-bridge-readiness.ts`.

The native Rust path now reaches Studio through the one-cell public browser host
and typed RuntimeSession facade. Browser projection remains non-authoritative:
runtime mutations still require typed Rust-validated commands, and renderer
picks remain disposable hints. WASM remains deferred until it has an equivalent
public provider and evidence posture. Studio must not import raw native/WASM
transports or infer runtime authority from rendered pixels.

## Historical end-to-end V1 proof

The old `pnpm run proof:v1` name described the complete V1 visual edit proof. It is now a retired historical script reference tracked in `docs/script-reference-policy.json`, not a current package script.

That historical proof command ran the normal verifier, served the built `dist/` app over a local static HTTP server, checked required UI markers, verified boundary policy, created before/after SVG software-snapshot evidence, wrote `artifacts/v1-proof/latest/index.json`, and ran `scripts/readback-v1-proof.mjs` against the generated artifact.

Expected success markers:

```text
asha-studio V1 proof: OK (artifacts/v1-proof/latest/index.json)
asha-studio V1 proof readback: OK (9 proof steps, 3 artifact file(s))
```

Generated `artifacts/` output remains intentionally git-ignored. Use current package scripts for runnable proof commands.

## Verification

Fresh-checkout deployment checks:

```bash
pnpm run check:boundaries
pnpm run check:docs-scripts
pnpm run build
git diff --check
```

The broader Studio test and live evidence suites require generated sibling
evidence inputs. Run them only after `asha-testing` has produced the publish
evidence and workspace cockpit artifacts referenced by the tests:

```bash
pnpm run test
pnpm run evidence:v2-live-backend
```

## Known limitations

- Real in V2 selected-backend path: distinct `asha-studio` repo; package-root boundary enforcement; compatibility readback; runtime bridge readiness gate; shared GUI/agent command timeline; visible viewport/editor proof surfaces; public `@asha/runtime-bridge`/`@asha/devtools` selected-backend attach evidence; accepted/rejected native command proposal readback; replay/evidence refs; and `pnpm run evidence -- v2-live-backend-evidence` as the closeout proof command.
- Still limited or deferred: durable timeline persistence, arbitrary production
  resource catalogs beyond the typed preview/readback lane, Agora compositor
  capture as a formal proof command, hardware GPU capture, performance evidence,
  and WASM authority.
- `@asha/studio-evidence` is a deferred public package from the schema design; current V1/browser/V2 proof commands use Studio-owned review/proof artifact schemas until that package lands.
- Browser screenshots are Chromium headless CLI evidence and generated proof artifacts are git-ignored/reproducible; do not treat them as hardware, GPU, Agora, or performance evidence.

See `docs/studio-limitations.md` for durable limitations and non-claims.
