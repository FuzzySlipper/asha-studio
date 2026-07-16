# Current limitations

- Studio requires a sibling ASHA engine checkout because public packages are
  not yet published.
- `pnpm run dev` does not install native Rust authority; use
  `pnpm run studio:dev:native` or `pnpm run studio:lan` for authoritative stored
  and runtime operations.
- The host-file service intentionally exposes arbitrary host paths and is for a
  trusted LAN only.
- Runtime attachment and stored authoring are separate. A missing gameplay
  RuntimeSession must not disable scene or voxel asset authoring.
- Studio consumes the public renderer host and must not import Three.js or
  renderer-private engine modules.
- Browser automation supplements human inspection; it does not turn debug
  hashes or screenshots into product authority.
