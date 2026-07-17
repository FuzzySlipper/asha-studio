# Scene and workspace persistence

ASHA Studio treats the engine's canonical `FlatSceneDocument` as the only scene
file format. The File menu exposes ordinary **New**, **Open**, **Save**, and
**Save As** operations. Rust decodes, validates, migrates, and canonically
encodes every document before Studio replaces current state or writes a file.

## Host filesystem behavior

The file service runs on the Studio host. It accepts arbitrary absolute paths
and paths relative to its start directory. A browser using Studio over LAN is
therefore browsing and editing files on the Studio host, not on the browser's
computer. This is an intentional high-trust deployment contract; project-root
containment and a browser-local file picker are not part of the current design.

Writes include the last observed SHA-256 digest. A stale write is paused for an
explicit reload, overwrite, or cancel decision. Accepted writes use a
same-directory temporary file and atomic rename. Failed decode, validation,
read, and write operations leave the current scene and its dirty state intact.

Scene coordinates are never rewritten as part of Open. New Studio scenes carry
the right-handed Y-up root marker documented in `docs/editor-workflows.md`.
Unmarked scenes open with a visible compatibility message and retain their exact
stored coordinates; explicitly legacy Z-up scenes fail before replacing the
current document. The same fail-before-replacement rule applies to ambiguous
legacy Studio voxel assets.

Voxel asset saves add an authority check before that rename. The host first
stages the candidate beside the destination without replacing it. Studio then
verifies that the same Rust workspace-authoring cell, generation, working
revision, and authority snapshot still own the candidate; Rust confirms the
stored revision; and the host promotes the stage with a compare-and-swap
rename. An edit or workspace switch during staging discards the stage and
preserves the destination byte-for-byte.

## Scene identity and dependencies

Opening a scene projects its authored nodes into the hierarchy and viewport
without creating placeholder renderables. Missing catalog assets are reported
in visible status diagnostics; their references remain unchanged in the scene
document so resolving resources never silently rewrites authored content.

A `voxelVolume` node may carry Studio's host-path tag alongside its typed asset
reference. Opening such a scene reads the referenced `.avxl.json` file on the
Studio host, validates and loads it through `WorkspaceAuthoringFacade`, and
renders only the resulting public mesh projection. Missing or rejected voxel
assets remain unresolved; Studio does not substitute local geometry.

## Project and user settings

Studio starts in a visibly labelled scratch session. **Project > Open Project**
opens the host project's `asha.game.toml`; **Create Project** creates that
manifest, its standard authored-content directories, and the initial committed
settings artifact. Project identity is the canonical directory on the Studio
host, never the LAN browser origin.

The settings layers have deliberately different ownership:

- `.asha/studio-project-settings.json` is typed, versioned project content. It
  commits right-handed Y-up spatial semantics, meters, grid origin, grid plane,
  base spacing, and snap anchor. Its writes are explicit and stale-hash checked.
- host-user settings hold visual grid colors/visibility, scene-camera speed and
  inversion, and keyboard bindings. The file service stores them under the
  Studio host's config directory, keyed by a SHA-256 digest of the canonical
  project root. They are never project files and never use browser storage.
- hover, selection, drag previews, open panels, and other transient session
  state are reconstructed and are not serialized.

Effective values resolve in the order session override, host-user setting,
project setting, then engine default. Unknown settings versions are retained
byte-for-byte, diagnosed, and left write-disabled rather than being silently
rewritten. Preferences > Options exposes the current source paths and separates
Scene View settings from Keyboard settings.

## Optional workspace pointer

`studio-project-workspace.v2` is an optional project convenience artifact, not
an alternate scene format. It may identify a game manifest and point to one
ordinary scene file and the committed project settings by path and SHA-256
digest. It does not serialize host-user preferences, viewport projections,
runtime authority, or a copy of the scene. The inspectable example is
`fixtures/studio-project-workspace.sample.json`.
