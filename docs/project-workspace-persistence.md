# Project workspace persistence

ASHA Studio persists its project workspace at the inspectable, versioned path
`studio/asha-studio-workspace.json` inside the selected project root. The File
menu calls the bounded project file service; it no longer saves authoritative
workspace content in a browser storage slot.

## Artifact contract

The `studio-project-workspace.v1` artifact identifies the open game manifest
and references durable authored content by normalized project-relative path and
canonical SHA-256 digest. The first supported slice references one validated
`*.scene.json` source. Studio must open or save that scene through the project
file service before it can save the workspace artifact.

`fixtures/studio-project-workspace.sample.json` is the committed canonical
example. Saved artifacts use the same stable, pretty-printed JSON shape so a
human or review agent can inspect the project identity and source hashes in a
normal diff.

The artifact classifies state deliberately:

- durable authored content remains in hash-pinned project source files;
- editor preferences remain browser-local and are not project content;
- viewport and other transient projections are reconstructed from validated
  authored sources;
- attached runtime state and Rust authority are never serialized. A successful
  load disconnects an attachment and requires an explicit reconnect.

Browser-local storage may still hold machine/profile preferences such as the
project-file API address. Moving to a different browser profile does not change
or hide the project workspace because the artifact and its authored sources
live under the project root.

## Save and load gates

The project file service rejects absolute paths, `.` / `..` segments, and paths
that resolve outside its configured root. Writes carry the expected previous
SHA-256 hash. A stale expectation is rejected, and accepted writes use a
same-directory temporary file followed by atomic rename.

Loading is staged before Studio state changes. Studio validates, in order:

1. the fixed artifact path and `studio-project-workspace.v1` shape;
2. the game id, manifest path, and canonical manifest SHA-256 against the open
   project, without embedding a machine-specific checkout path;
3. the referenced scene path and SHA-256 readback;
4. the referenced scene schema through the existing scene-source validator.

Malformed artifacts, copied artifacts from a different project, changed scene
sources, and path escapes fail closed. The current workspace, preferences, and
runtime attachment remain unchanged on failed validation.

## Current scope

This slice persists the active authored scene reference. Catalog and additional
authored-source references can be added as typed artifact fields when their
round-trip workflows are ready; they should not be introduced as an untyped
dump of Studio read models or runtime state.
