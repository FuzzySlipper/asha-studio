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
- Remote filesystem writes must be bounded project-root operations, not browser local storage shortcuts.
- Studio may propose typed commands and project/read state; it must not own runtime authority.
- Do not add arbitrary `methodName + json` dispatch, private engine imports, generated contract edits, or raw native/WASM transport bypasses.

## Local checks

Prefer the current README/package scripts for exact commands. Fresh-checkout checks should include the documented boundary/docs/build gates, for example:

```bash
pnpm install --frozen-lockfile
pnpm run check:boundaries
pnpm run check:docs-scripts
pnpm run build
```

Only run broader generated-artifact or live-evidence suites when their prerequisites are present, and record those prerequisites in the Den task.

For choosing the lightest useful evidence gate, use `docs/studio-agent-observability-verification.md`.
