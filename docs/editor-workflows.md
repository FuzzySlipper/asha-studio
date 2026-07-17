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

## Coordinate convention

Studio and ASHA use one right-handed Y-up world. +Y is vertical, the ordinary
ground plane is XZ, and inspector X/Y/Z values are the exact stored values.
Camera orbit, picking, light direction, transform gizmos, voxel cells, and
scene-node transforms do not perform a renderer-only axis swap.

The Scene View grid is the engine renderer host's procedural grid, not Studio
debug geometry. Its world-space origin and spacing remain fixed while the
renderer changes extent and fade for the current camera. The committed project
settings supply plane, origin, per-axis spacing, and boundary-versus-cell-center
snap semantics; host-user settings supply only visibility and presentation.
Translation preview uses that exact origin and spacing for positive and negative
coordinates. Rotation and scale retain separate committed increments. Holding
Ctrl temporarily inverts Snap and Shift requests fine movement; all drag frames
remain renderer-local and pointer release still sends one Rust settlement.

Voxel authoring uses the same boundary/center vocabulary in asset-local space:
integer coordinates name cell extents and the selection overlay is centered at
coordinate plus one half cell. Moving the owning scene transform moves both the
projected voxel asset and its local cell overlay without rewriting voxel data.

New Studio scenes carry the inspectable
`asha-studio:coordinate-system:right-handed-y-up.v1` root tag. New voxel assets
record `asha-studio/y-up.v1` as their source tool in addition to the engine's
`y_up_right_handed` grid declaration.

An unmarked scene is opened without changing its coordinates and displays an
unverified-coordinate message. A scene explicitly tagged as legacy Z-up is
rejected without mutation. Voxel assets marked with the pre-correction
`asha-studio` source tool are also rejected as ambiguous: the host file remains
untouched and must be explicitly migrated from Z height to Y height before it
can be opened. This deliberately avoids guessing whether old authored content
was intended to follow the engine convention or Studio's former view.

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
