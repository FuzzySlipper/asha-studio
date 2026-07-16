# ASHA Studio

ASHA Studio is the editor for ASHA projects. It authors stored scene and voxel
assets, projects them in the public renderer host, and can attach public Rust
runtime surfaces for live inspection. Rust owns authoritative validation and
mutation; Studio TypeScript owns editor interaction and projection.

The normal layout is deliberately task-oriented:

- **File** opens and saves ordinary scene and voxel files on the Studio host;
- **Scene**, **View**, and **Voxel** contain authoring and viewport tools;
- **Project** connects to a running ASHA project;
- **Runtime** contains optional live inspection and controls;
- the hierarchy, viewport, inspector, and bottom workspace show the authored
  result rather than delivery-proof state.

## Run Studio

Install beside `/home/dev/asha-engine`, then use one of these entry points:

```bash
pnpm install --frozen-lockfile
pnpm run dev
pnpm run studio:dev:native
pnpm run studio:lan
```

`dev` is the ordinary frontend server. `studio:dev:native` builds and serves the
editor with the public native Rust browser host. `studio:lan` starts that host
plus the trusted host-filesystem service used by Open and Save dialogs. LAN
clients always read and write files on the machine running Studio.

## Validate changes

```bash
pnpm run verify
```

The default gate keeps dependency boundaries, documentation commands, lint,
types, focused editor regressions, and the build. Live editor acceptance is a
separate product check because it starts native services and a browser.

See [editor-workflows](docs/editor-workflows.md),
[project persistence](docs/project-workspace-persistence.md), and
[limitations](docs/studio-limitations.md) for current behavior.

## Repository role

- `asha-engine` owns Rust authority, generated contracts, public runtime and
  renderer-host packages.
- `asha-testing` owns synthetic cross-repository conformance.
- `asha-demo` is a reference game project.
- `asha-studio` owns editor workflows and local regressions for visible editor
  defects.

Proof panels, committed computed reports, source-token delivery checks, and
cross-repository certification do not belong here. A regression stays local
when it catches a concrete Studio defect such as an extra authority call during
drag, mutation after rejection, stale overwrite, or state lost after reopen.
