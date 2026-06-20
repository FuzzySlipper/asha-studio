# ASHA Studio

ASHA Studio is a distinct frontend-heavy studio/reference app for composing ASHA workflows through public ASHA command and evidence surfaces.

> ASHA owns what commands mean. `asha-studio` owns how humans and agents compose those commands visually.

This repo is intentionally separate from:

- `asha` — backend-heavy engine substrate, Rust authority, generated contracts, public command/evidence packages.
- `asha-demo` — narrow demo/playground/reference proofs.

## Current baseline

Task `asha#2730` establishes a Vite/TypeScript shell with visible regions required by the V1 plan:

- scenario/session panel;
- viewport placeholder;
- command palette/menu mirror;
- command timeline;
- inspector/readout panel;
- evidence/export panel.

The app consumes `@asha/command-registry` through the package root and projects the command catalog into UI/readout data. It does **not** call the native runtime bridge or claim Agora/hardware-GPU evidence; the V1 proof exports software-snapshot visual evidence, browser screenshot capture/readback artifacts, and machine-readable review artifacts with explicit limitations.

## Local development

```bash
pnpm install
pnpm run dev
pnpm run verify
pnpm run proof:v1
pnpm run proof:browser
```

The current local ASHA package linkage uses package-root links to `/home/dev/asha/ts/packages/*` because the ASHA packages are not published. The boundary checker allows only those explicit public package roots and rejects source/internal/generated/raw transport imports.

## Boundary policy

`boundary-policy.json` is the machine-readable import/dependency policy used by `pnpm run check:boundaries`.

Current source imports may use only the public package root `@asha/command-registry`. The package manager may also keep an explicit local package-root link to `@asha/contracts` while ASHA packages are unpublished, but source code must not import it directly until a task promotes that surface for studio use.

If a studio task needs a new ASHA capability, request or implement a public ASHA package/surface in the ASHA repo first. Do not bypass the boundary with package `src/**` imports, generated contract file paths, raw native/WASM transports, aliases into `/home/dev/asha`, or arbitrary `call(methodName, json)` command hatches.

## Compatibility metadata

Task `asha#2732` adds startup/session compatibility readback for public ASHA surfaces. The shell records:

- `@asha/contracts` compatibility: `contracts.v0`;
- `@asha/command-registry` compatibility: `command-registry.v0`;
- deferred `@asha/studio-evidence` marker: `studio-evidence.deferred-v0`;
- `@asha/runtime-bridge` as `null` until a later task promotes that public surface for Studio runtime use;
- supported runtime modes for this shell: `mock`, `reference`, and `unavailable`.

Native/WASM runtime modes fail closed until runtime bridge compatibility metadata is present. Update `src/compatibility.ts`, `fixtures/studio-session-metadata.sample.json`, and the compatibility tests when ASHA generated contracts, command registry compatibility, or runtime bridge compatibility changes.

## Session workspace and command timeline

Task `asha#2733` adds a mock/reference Studio workspace model with a shared human/agent command timeline. The shell now starts a deterministic preview session, loads the `voxel-basic` scenario through the same command registry path used for agent-originated calls, records structured command results, and exports `fixtures/studio-agent-readout.sample.json`.

Current supported readout commands are session/workspace oriented: `session.start`, `session.load_scenario`, and `inspection.session_status`. Runtime bridge/native execution and visual evidence capture remain deferred, but the exported readout already includes session metadata, compatibility metadata, command timeline entries, command results, state evidence placeholders, diagnostics, artifact refs, and known limitations.

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

This is intentionally a reference preview over public contract DTOs, not a native runtime render. The artifact records current surface findings: contracts are available, but first-class model/material inspect/preview command identities and runtime-bridge readback verbs are still missing and should be promoted in ASHA before richer Studio model/material authoring. Follow-up `asha#2895` tracks that public-surface promotion.

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
git diff --check
```

## Known limitations

- Command execution uses the mock/reference typed public command path; native/WASM runtime-bridge integration, timeline persistence, first-class model/material command-registry/runtime verbs, Agora compositor capture, hardware GPU capture, and performance evidence remain planned follow-up work.
- `@asha/studio-evidence` is a deferred public package from the schema design; current V1/browser proof commands use Studio-owned review/proof artifact schemas until that package lands.
