# ASHA Studio Scripts

ASHA Studio package scripts are split into product workflow commands and evidence
generators. Product commands are the default surface for day-to-day Studio work;
evidence generators are retained for review artifacts and milestone gates.

## Product Workflow

| Command | Purpose |
| --- | --- |
| `pnpm run dev` | Run the Studio app on `0.0.0.0`. |
| `pnpm run studio:dev` | Product-shaped alias for `dev`. |
| `pnpm run dev:files` | Run the Studio project-file dev server. |
| `pnpm run studio:files` | Product-shaped alias for `dev:files`. |
| `pnpm run studio:dev:native-voxel` | Build Studio, launch its temporary UI copy through the public `@asha/browser-host`, print a local URL, and keep the standard native provider host open for interactive voxel workflow testing. |
| `pnpm run studio:proof:native-voxel` | Run the deterministic native voxel proof and write ignored evidence artifacts. |
| `pnpm run build` | Build all Nx projects. |
| `pnpm run build:studio-app` | Build only the Studio app. |
| `pnpm run studio:build` | Product-shaped alias for the Studio app build. |
| `pnpm run lint` | Run lint across the workspace. |
| `pnpm run typecheck` | Run typecheck across the workspace. |
| `pnpm run test` | Run tests across the workspace. |
| `pnpm run check` | Run lint, typecheck, and tests. |
| `pnpm run verify` | Run boundary/doc checks, `check`, and build. |

## Boundary And Documentation Checks

| Command | Purpose |
| --- | --- |
| `pnpm run check:boundaries` | Enforce Studio's public ASHA package boundary. |
| `pnpm run check:docs-scripts` | Reject undocumented stale script references in docs. |
| `pnpm run check:evidence-catalog` | Ensure every `scripts/proof-*.ts` file is explicitly classified. |

## Evidence Generators

Evidence generators are not the normal product workflow. They are review and
milestone artifact producers backed by explicitly cataloged implementation
files.

The catalog lives at `scripts/studio-evidence-catalog.json` and is the source of
truth for whether an evidence generator is current product evidence, retained
milestone evidence, delegated to a consumer/testing repo, or retired. The
`scripts/proof-*.ts` filenames are implementation details; adding a file there
does not make it part of the supported Studio path.

| Command | Purpose |
| --- | --- |
| `pnpm run evidence:list` | List current product evidence generator names. |
| `pnpm run evidence:list -- --all` | List current, milestone, delegated, and retired catalog entries. |
| `pnpm run evidence -- <name>` | Run one evidence generator by name. |
| `pnpm run evidence:v2-live-backend` | Convenience alias for the current V2 selected-backend evidence aggregate. |
| `pnpm run evidence -- native-voxel-runtime-launch` | Reproducible native Studio proof for live voxel conversion and public voxel-edit testing. |

The old `proof:<name>` npm script namespace is retired from `package.json`.
Use the same suffix with the evidence dispatcher instead:

```bash
pnpm run evidence -- selected-backend-attach
pnpm run evidence -- authoring-ux-m2
pnpm run evidence -- v2-live-backend-evidence
```

Delegated or retired entries are blocked by default. They can be reproduced only
with `--allow-retired`, and only when a task explicitly asks for historical
artifact archaeology:

```bash
pnpm run evidence -- runtime-session-inspection --allow-retired
```

Normal `pnpm run test` validates the evidence catalog and script contracts
without launching process-heavy evidence generators. To run those process-level
tests intentionally, opt in:

```bash
ASHA_STUDIO_RUN_EVIDENCE_PROCESS_TESTS=1 pnpm run test
```

Historical docs may still mention retired or deferred `proof:*` command names;
those exceptions are tracked in `docs/script-reference-policy.json`.
