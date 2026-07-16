# Editor workflows

Studio separates stored authoring from optional live runtime inspection.

## Stored authoring

- Scene New/Open/Save/Save As operate on canonical `SceneDocument` JSON through
  the public Rust workspace-authoring facade and trusted host-file service.
- An untitled scene receives its own Rust workspace-authoring cell; opening a
  game project is not a prerequisite for scene or voxel asset authoring.
- Voxel assets can be created, painted, reopened, and saved without a gameplay
  RuntimeSession. Their viewport geometry comes from the public authored
  projection and follows the stored scene-node transform.
- Drag previews remain renderer-local. Pointer release performs one
  revision-bound Rust settlement; rejection restores the last authoritative
  transform.
- Lights, hierarchy edits, catalogs, and inspector changes remain explicit
  stored edits rather than hidden TypeScript authority.

## Runtime inspection

The native host installs the public browser-host provider before Studio boots.
Runtime attachment is optional and does not gate stored authoring. When attached,
Studio reads public runtime projections and submits bounded typed operations.
Disconnect clears runtime-only state and preserves stored sources.

## Local acceptance

Studio keeps regressions for concrete editor failure modes: accepted/rejected
stored mutation, stale and cancelled no-mutation behavior, one-settlement drag,
save/reopen persistence, host-file conflicts, renderer-host ownership, and
visible viewport interaction. Hashes may diagnose those failures but are not a
substitute for the editor result.

With `studio:dev:native` running, `pnpm run check:live-editor` uses only visible
menus and editor content to add a directional light and create a voxel house.
It requires the viewport, hierarchy result, dirty scene status, and human-facing
completion message; it does not read a private browser global.
