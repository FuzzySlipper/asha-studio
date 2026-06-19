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

## Verification

```bash
pnpm run check:boundaries
pnpm run test
pnpm run build
pnpm run smoke:static
git diff --check
```

## Known limitations

- Command execution, runtime/session lifecycle, compatibility metadata, timeline persistence, real voxel workflow, visual evidence capture, and review export are planned follow-up tasks.
- `@asha/studio-evidence` is a deferred public package from the schema design; this scaffold shows its panel affordance but does not invent a local substitute schema.
