# ASHA Studio Local Bootstrap

`asha-studio` is the human/editor-facing Studio repo for ASHA project authoring, inspection, and agent-operable workflows. It consumes public ASHA engine surfaces and should not become an engine authority fork.

Use Den project ID `asha` for tasks, messages, documents, librarian queries, and guidance lookups. When creating or updating Den tasks from this repo, tag them with `asha-studio` plus any feature/system tags.

## Satellite repo boundary

This is a satellite repo. Do **not** jump into `/home/dev/asha-engine` and implement upstream engine changes as part of an `asha-studio` task, even when Studio is blocked by a missing or broken ASHA surface.

If Studio needs a missing runtime, command, project filesystem, asset, devtools, contract, or render/readout capability:

1. Stop the local implementation at the satellite boundary.
2. Create a Den task in project `asha` for the upstream `asha-engine` change, tagged with `asha-engine` and `asha-studio`.
3. Link the upstream task from the blocked `asha-studio` task/message.
4. Mark the Studio task `blocked` with blocker summary, attempted remedies, and the upstream task ID.
5. Wait for the upstream task to land before continuing. Do not tunnel through private engine internals or carry a local engine patch in this repo.

## Source-of-truth posture

This local file is bootstrap context for agents entering the repository. It is not the current planning queue.

- **Den** owns current task state, implementation queues, durable planning docs, review packets, and known limitations.
- **Repo docs** describe current Studio operations and committed implementation surfaces.
- **The code/tests** are implementation truth when they conflict with old planning prose.
- Resolve live Den guidance with `get_agent_guidance(project_id="asha")` before substantial work.

## Studio boundary rules

- Use public ASHA package roots and typed command/session surfaces.
- Keep stored ProjectBundle/EntityDefinition/SceneDocument authoring distinct from live RuntimeSession inspection/control.
- Studio scene Open/Save uses trusted host filesystem paths, including arbitrary absolute paths. LAN clients operate the Studio host filesystem, never the browser/client filesystem.
- Studio may propose typed commands and project/read state; it must not own runtime authority.
- Do not add arbitrary `methodName + json` dispatch, private engine imports, generated contract edits, or raw native/WASM transport bypasses.

## Acceptance posture

- Judge editor work by visible/public workflow outcomes: the viewport changed,
  the authoritative edit was accepted once, rejection left state unchanged, or
  saved content reopened intact.
- Keep local regressions for concrete Studio defects and hard authority/import
  boundaries.
- Synthetic cross-repository conformance belongs in `asha-testing`.
- Do not add proof panels, proof-only globals, committed computed reports,
  source-token delivery checks, fixture refresh gates, or wrappers around
  upstream checks.
- Operator diagnostics may expose useful state, but hashes and readouts are
  secondary to the editor outcome unless identity itself is the behavior under
  test.

## Local checks

Prefer the current README/package scripts for exact commands. Fresh-checkout checks should include the documented boundary/docs/build gates, for example:

```bash
pnpm install --frozen-lockfile
pnpm run check:boundaries
pnpm run check:docs-scripts
pnpm run build
```

For native/LAN workflow checks use `pnpm run studio:dev:native` or
`pnpm run studio:lan` and record the exact Studio and ASHA revisions.
