# ASHA Studio agent guidance

`asha-studio` is the distinct frontend-heavy public consumer for ASHA Studio workflows.

## Boundary rules

- `boundary-policy.json` is the machine-readable source for `pnpm run check:boundaries`.
- Use public ASHA package roots only.
- Allowed in source now: `@asha/command-registry`, `@asha/contracts`, `@asha/editor-tools`.
- Local package-manager links must match the allowed public package roots in `boundary-policy.json`.
- Deferred later public packages: `@asha/studio-evidence`, `@asha/runtime-bridge`, `@asha/devtools`, `@asha/renderer-three`.
- Do not import ASHA internals, generated files by path, native/raw transports, engine Rust paths, package `src/**` subpaths, or aliases into `/home/dev/asha`.
- Do not add arbitrary JSON command hatches such as `call(methodName, json)` or private UI-only mutation callbacks.
- GUI and agent surfaces must use the same command identities and visible timeline/readout model.
- If the studio needs a missing capability, create/request a public ASHA surface rather than bypassing the boundary.
- Compatibility metadata lives in `src/compatibility.ts`; update it with tests and the sample session artifact whenever ASHA public compatibility markers change.
- Session/workspace timeline logic lives in `src/session-workspace.ts`; GUI and agent-originated commands must continue through the same `invokeStudioCommand` path and exported readout fixture.
- Voxel workflow logic lives in `src/voxel-workflow.ts`; preview must stay editor-local while apply uses typed public `VoxelCommand` proposal/apply evidence and records before/after hashes.
- Visual evidence/review export logic lives in `src/visual-evidence.ts`; exports must fail closed when timeline/results, visual refs, render deltas, sequence correlation, or compatibility evidence are missing/stale.
- V1 proof command logic lives in `scripts/v1-proof.ts` with readback validation in `scripts/readback-v1-proof.mjs`; generated `artifacts/` output is reproducible and git-ignored.
- Batch/undo workflow logic lives in `src/command-batch.ts`; batches must stay bounded to known public command ids, record atomic/best-effort transaction mode, per-command result shape, retry/undo metadata, and failure classification, and may derive explicit typed inverse commands for V1 rather than inventing a generic authority undo stack.
- Model/material preview logic lives in `src/model-material-preview.ts`; it may use `@asha/contracts` package-root DTOs for catalog/material/static-mesh/render-diff metadata, but Studio must still not import runtime transports directly until `@asha/runtime-bridge` compatibility is approved here.
- Viewport editor panel logic lives in `src/viewport-editor-panel.ts`; it must project selected target, preview-vs-applied state, timeline correlation, and evidence refs from the shared workspace model rather than owning authority or using a private UI-only path.
- Browser visual capture logic lives in `scripts/browser-visual-capture.ts` with readback validation in `scripts/readback-browser-capture.mjs`; it must wait for proof-content markers, correlate with the V1 proof artifact/timeline/hashes, record screenshot SHA-256 values, and classify Chromium browser screenshots without claiming Agora/GPU/performance evidence.
- Native/WASM runtime modes must fail closed until `@asha/runtime-bridge` is approved for Studio and reports `runtime-bridge.v0` compatibility.

## Current task scope

Task `asha#3047` defines the runtime bridge readiness gate after the browser 3D viewport/proof series. Current V1 reality: task `asha#3046` consolidated scene/readback, pick, visual-delta crop, command/hash correlation, deployed visual-contract layout evidence, and non-claim guardrails into one visual capability proof; tasks `asha#3041`-`asha#3045` added scene-view, Three.js canvas, camera/tool interaction, pick evidence, and visual delta/crop proof; task `asha#2918` makes the viewport agent-observable with selected target, preview-vs-applied hashes, timeline correlation, and evidence refs; earlier V1 tasks added compatibility metadata, shared command timeline, voxel workflow, visual evidence, model/material preview, command batch/undo, browser capture, and visual-contract candidate proof. Later tasks own live runtime bridge execution in Studio, Agora compositor capture as a formal proof command, hardware render evidence, durable timeline persistence, and richer visual domains.
