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

## Evidence Generators

Evidence generators are not the normal product workflow. They are review and
milestone artifact producers backed by the `scripts/proof-*.ts` files.

| Command | Purpose |
| --- | --- |
| `pnpm run evidence:list` | List available evidence generator names. |
| `pnpm run evidence -- <name>` | Run one evidence generator by name. |
| `pnpm run evidence:v2-live-backend` | Convenience alias for the current V2 selected-backend evidence aggregate. |

The old `proof:<name>` npm script namespace is retired from `package.json`.
Use the same suffix with the evidence dispatcher instead:

```bash
pnpm run evidence -- selected-backend-attach
pnpm run evidence -- authoring-ux-m2
pnpm run evidence -- v2-live-backend-evidence
```

Historical docs may still mention retired or deferred `proof:*` command names;
those exceptions are tracked in `docs/script-reference-policy.json`.
