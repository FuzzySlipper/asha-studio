# ASHA Studio agent guidance

`asha-studio` is the distinct frontend-heavy public consumer for ASHA Studio workflows.

## Boundary rules

- Use public ASHA package roots only.
- Allowed in this scaffold: `@asha/command-registry`.
- Planned later public packages: `@asha/studio-evidence`, `@asha/runtime-bridge`, `@asha/editor-tools`, `@asha/devtools`, `@asha/renderer-three`.
- Do not import ASHA internals, generated files by path, native/raw transports, engine Rust paths, or package `src/**` subpaths.
- Do not add arbitrary JSON command hatches such as `call(methodName, json)` or private UI-only mutation callbacks.
- GUI and agent surfaces must use the same command identities and visible timeline/readout model.

## Current task scope

Task `asha#2730` is a real frontend shell baseline. It intentionally does not execute ASHA commands yet. Follow-up tasks own boundary hardening, compatibility plumbing, session timeline execution, voxel workflow, and evidence export.
