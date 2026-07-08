# ASHA Studio Agent Observability And Verification

ASHA Studio is a human editor first. Agent-facing readouts and evidence help
agents understand and verify the same state a human is editing, but they should
not dominate the default workspace.

## Shared Read Model

Human GUI actions and agent-observable state must flow through the same
domain/store read models. A feature that changes Studio state should prefer this
path:

1. domain read-model/helper
2. store action or computed signal
3. panel/viewport surface
4. compact agent readout contribution, when relevant
5. focused tests

Do not add private UI-only mutation callbacks, freeform JSON command hatches, or
parallel agent APIs. If the UI performs an action that maps to an ASHA public
command identity, the timeline/readout should expose that same identity.

## Evidence Surfaces

The default Studio layout should stay focused on editing: hierarchy, viewport,
inspector, assets, and timeline. Debug/proof details belong in secondary
surfaces such as the bottom-panel Evidence tab, disclosure rows, generated
fixtures, or explicit proof commands.

The compact readout is the normal agent-observable path. It summarizes session,
scene, selected target, latest viewport hit, render settings, latest command,
compatibility marker, diagnostics, and non-claims without turning the app into a
proof dashboard.

## Agent Voxel Workflow Surface

Live voxel workflows use `StudioWorkspaceStore.runAgentVoxelWorkflowOperation`
and `agentVoxelWorkflowSurface()` rather than private component callbacks. The
surface exposes typed operations for inspection, conversion settings, conversion
plan/preview/apply/export, complete voxel-volume export, explicit save/load
asset transactions, model-info readback, and bounded voxel edits. Voxel edits
are limited to `command.propose`-style `setVoxel` batches and reject unsupported
operations before runtime submission.

The native launch evidence command, `pnpm run evidence -- native-voxel-runtime-launch`,
drives this surface against the Rust native provider and records accepted
`set_voxels`, `set_voxels_runs`, `fill_box`, and `apply_voxel_primitives`
compact edits, bounded `view_from_angle` camera/readout evidence,
`publish_preview` JSON evidence export, converted/authored `.avxl.json` asset
artifacts, full export/save/load readbacks, plus runtime-rejected and
preflight-rejected edit paths.

For the current runnable workflow, expected artifact readbacks, and
Studio-versus-engine task ownership, use
`docs/voxel-live-testing-agent-runbook.md`.

## Verification Tiers

Use the lightest tier that proves the behavior.

- **Tier 1: domain/store tests.** Use for deterministic read models, commands,
  filtering, selection, serialization, and compact readout changes.
- **Tier 2: `pnpm run verify`.** Use for normal implementation slices. This
  includes boundary checks, lint, typecheck, tests, and build.
- **Tier 3: browser or visual capture.** Use when layout, viewport rendering,
  canvas behavior, or visible affordances materially change and a screenshot or
  browser interaction would catch regressions that unit tests cannot.
- **Tier 4: compositor/runtime proof.** Use only for explicit tasks that claim
  compositor, runtime bridge, hardware/GPU, or performance evidence. These paths
  remain gated and optional unless a task says otherwise.

## When Not To Add Heavy Proof

Do not add browser/compositor proof for a small domain helper, store computed
signal, menu action, asset filter, or readout formatting change. Focused tests
and `pnpm run verify` are enough unless the task explicitly changes a visual or
runtime evidence contract.

Do not copy old proof harness patterns into new UI slices by default. Add
structured readout state first; escalate only when the behavior truly needs a
visual or runtime artifact.
