# ASHA Studio agent guidance

`asha-studio` is the distinct frontend-heavy public consumer for ASHA Studio workflows.

## Boundary rules

- `boundary-policy.json` is the machine-readable source for `pnpm run check:boundaries`.
- Use public ASHA package roots only.
- Allowed in source now: `@asha/command-registry`.
- Local package-manager links may include `@asha/contracts` only as a transitive unpublished-package support link; do not import it from source until a task explicitly promotes it.
- Planned later public packages: `@asha/studio-evidence`, `@asha/runtime-bridge`, `@asha/editor-tools`, `@asha/devtools`, `@asha/renderer-three`.
- Do not import ASHA internals, generated files by path, native/raw transports, engine Rust paths, package `src/**` subpaths, or aliases into `/home/dev/asha`.
- Do not add arbitrary JSON command hatches such as `call(methodName, json)` or private UI-only mutation callbacks.
- GUI and agent surfaces must use the same command identities and visible timeline/readout model.
- If the studio needs a missing capability, create/request a public ASHA surface rather than bypassing the boundary.

## Current task scope

Task `asha#2731` hardens the boundary policy/checker. Task `asha#2730` created the real frontend shell baseline. Later tasks own compatibility plumbing, session timeline execution, voxel workflow, and evidence export.
