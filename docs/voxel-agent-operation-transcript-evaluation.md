# Voxel Agent Operation Transcript Evaluation

Status: implemented as a normal product surface by tasks #5269 and #5795.

ASHA Studio should support a provider-neutral voxel operation transcript, but it
should not import VoxelForge `.vforge` files, VoxelForge MCP calls, raw method
names, or private RuntimeBridge operations.

## Decision

Existing Studio evidence artifacts are sufficient for review and proof
bookkeeping. They are not sufficient as a durable import/replay format because
they mix proof output, DOM evidence, runtime receipts, and generated artifact
hashes with the operations that produced them.

The durable import shape is a narrow ASHA Studio transcript envelope over
the existing `StudioAgentVoxelWorkflowOperation` union. Replay executes each
operation through `StudioWorkspaceStore.runAgentVoxelWorkflowOperation`, then
emits a deterministic replay receipt. Studio stays a typed
workflow runner; Rust RuntimeSession remains authority for conversion, voxel
edits, save/load, history, model info, and validation.

## Product Access

The visible Agent Voxel Transcript panel accepts this JSON and shows the replay
status, operation count, and receipt hash. Browser agents may use
`globalThis.ashaStudioVoxelWorkflow.runAgentVoxelOperationTranscriptReplay(...)`.
That product object is installed during normal Studio startup and exposes no
Store reference, RuntimeBridge, native provider, or arbitrary dispatch method.

The native launch evidence command calls this same product API. It is regression
coverage, not the implementation or a second agent-only route.

## Envelope

```json
{
  "artifactKind": "studio_agent_voxel_operation_transcript",
  "artifactVersion": "studio-agent-voxel-operation-transcript.v0",
  "producer": {
    "kind": "agent",
    "id": "codex-asha-studio",
    "label": "optional human label"
  },
  "target": {
    "studioSurfaceVersion": "studio-agent-voxel-workflow.v0",
    "projectBundle": "asha-testing",
    "runtimeMode": "native_rust"
  },
  "operations": [
    {
      "operationId": "op-001",
      "kind": "configure_conversion",
      "input": {
        "patch": {
          "sourceAssetId": "mesh/import-fixture-a",
          "mode": "solid"
        }
      },
      "expected": {
        "accepted": true
      }
    },
    {
      "operationId": "op-002",
      "kind": "submit_compact_voxel_edit",
      "input": {
        "edit": {
          "kind": "apply_voxel_primitives",
          "grid": 1,
          "maxGeneratedVoxels": 64,
          "primitives": [
            {
              "kind": "box",
              "from": { "x": 0, "y": 0, "z": 0 },
              "to": { "x": 2, "y": 2, "z": 2 },
              "palette_index": 1,
              "mode": "shell"
            }
          ]
        }
      },
      "expected": {
        "accepted": true
      }
    }
  ],
  "nonClaims": [
    "not_vforge_file",
    "not_mcp_transport",
    "not_raw_runtime_bridge_dispatch",
    "not_runtime_authority",
    "not_private_studio_state_mutation"
  ]
}
```

## Validation Rules

- Accept only known `StudioAgentVoxelWorkflowOperation.kind` values.
- Reject raw method names, arbitrary JSON method calls, private store paths, and
  generated-contract import paths.
- Validate each operation with the same preflight used by live Studio controls.
- Enforce compact edit command, coordinate, material, and generated-voxel limits.
- For conversion/save/load/history actions, submit through public
  RuntimeSessionFacade only.
- Record per-operation accepted/rejected status, diagnostic, and stable result
  hash in a replay receipt.
- Treat receipts as evidence; do not silently promote runtime state to stored
  ProjectBundle data except through explicit save/persist operations.

## Ownership

- `codex-asha-studio`: transcript envelope, parser, replay runner, visible
  import/replay affordance, replay receipt artifact, and Studio proof.
- `codex-asha-engine`: no immediate work required for the transcript envelope.
  Engine work is only needed if a transcript operation needs a missing public
  RuntimeSession capability.
- `asha-testing`: eventual conformance fixture corpus if transcript replay
  becomes a cross-repo compatibility gate.

## Follow-Ups

Add cross-repository conformance fixtures only if more than one consumer needs
the transcript shape as a compatibility contract. No VoxelForge compatibility task is needed.
