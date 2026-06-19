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

The app consumes `@asha/command-registry` through the package root and projects the command catalog into UI/readout data. It does **not** execute commands, call the runtime bridge, capture screenshots, or define local evidence artifact schemas.

## Local development

```bash
pnpm install
pnpm run dev
pnpm run verify
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

## Verification

```bash
pnpm run check:boundaries
pnpm run test
pnpm run build
pnpm run smoke:static
git diff --check
```

## Known limitations

- Command execution, runtime/session lifecycle, native/WASM runtime-bridge integration, timeline persistence, real voxel workflow, visual evidence capture, and review export are planned follow-up tasks.
- `@asha/studio-evidence` is a deferred public package from the schema design; this scaffold shows its panel affordance but does not invent a local substitute schema.
