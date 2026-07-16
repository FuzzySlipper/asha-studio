# Studio commands

| Command | Purpose |
| --- | --- |
| `pnpm run dev` | Start the frontend development server. |
| `pnpm run studio:dev:native` | Build and serve Studio with the public native Rust browser host. |
| `pnpm run dev:files` | Start the trusted host-filesystem service. |
| `pnpm run studio:lan` | Start native Studio and the file service together for trusted LAN use. |
| `pnpm run check:live-editor` | Exercise lighting and voxel authoring through the visible editor against a running native host. |
| `pnpm run build` | Build all workspace projects. |
| `pnpm run check` | Run lint, type checks, and focused tests. |
| `pnpm run verify` | Run structural checks, focused tests, and build. |

There is intentionally no evidence dispatcher or proof-script namespace.
Product workflows are tested at their public editor boundary; synthetic
cross-repository checks live in `asha-testing`.
