# ASHA Studio UI-test visual contract target

Task: `asha#3130`

This fixture set drafts the first ASHA Studio target visual contract from the mockup at
`local/ui-test.html`.

## Source and capture

- Source mockup: `local/ui-test.html` (local-only; ignored by git).
- Collector: `/home/dev/den-services/visual-contract/tools/browser-evidence-collector.mjs`.
- Capture mode: `viewport-clipped`.
- Intended viewport: `1920x1080`.
- Evidence class: browser layout/affordance evidence only.

The 1920x1080 viewport matters: the mockup is a 1920-wide editor surface. Older
collector defaults such as 1440x900 clip the top/right controls and produce
invalid viewport-normalized evidence.

## Checked-in fixtures

- `fixtures/visual-contract/asha-studio-ui-test.generic.contract.json`
  - generic `layered-visual-contract/v0.1` output from the mockup decomposition.
  - retains generated node IDs from the collector (`node_0` ... `node_7`).
- `fixtures/visual-contract/asha-studio-ui-test.promotion.json`
  - human-readable promotion mapping from generic nodes to ASHA target vocabulary.
- `fixtures/visual-contract/asha-studio-ui-test.target.contract.json`
  - promoted ASHA target contract with authored constraints.
- `fixtures/visual-contract/asha-studio-ui-test.negative.contract.json`
  - fail-closed candidate used to prove diagnostics for a too-small central viewport
    and missing selected-target inspector.
- `fixtures/visual-contract/asha-studio-ui-test.proof.json`
  - proof handles from the local visual-contract service run: self-compare pass,
    negative compare fail, service artifact URLs, and checked-in local artifact paths.
- `fixtures/visual-contract/artifacts/9e2a23fe1dbda4d67d199699/report.json`
- `fixtures/visual-contract/artifacts/9e2a23fe1dbda4d67d199699/diff.overlay.svg`
  - durable self-compare report and diff overlay artifacts.
- `fixtures/visual-contract/artifacts/3a21858dae2dee1d7c00157e/report.json`
- `fixtures/visual-contract/artifacts/3a21858dae2dee1d7c00157e/diff.overlay.svg`
  - durable negative-compare report and diff overlay artifacts.

## Promotion map

The current mockup decomposition is intentionally explicit:

| Generic node | ASHA target ID | Meaning |
| --- | --- | --- |
| `node_0` | `export_review_artifact_button` | top-bar review artifact export affordance |
| `node_1` | `run_proof_button` | top-bar proof runner affordance |
| `node_2` | `scene_hierarchy` | left Scene / Hierarchy dock |
| `node_3` | `central_3d_viewport` | central viewport/main panel |
| `node_4` | `selected_target_inspector` | right Inspector dock |
| `node_5` | `command_evidence_dock` | bottom command/evidence dock container |
| `node_6` | `command_timeline` | command timeline tab within bottom dock |
| `node_7` | `evidence_dock` | evidence/artifacts tab within bottom dock |

## Authored constraints

The target contract currently checks:

- required object existence for all promoted target objects;
- central viewport dominance (`central_viewport_is_dominant`);
- scene hierarchy left of the viewport;
- inspector right of the viewport;
- command/evidence dock below the viewport;
- command timeline and evidence tab containment inside the bottom dock;
- top alignment across primary left/center/right docks;
- central viewport bounds stability.

The negative candidate removes `selected_target_inspector` and shrinks/moves the
central viewport. It is expected to fail at least:

- `selected_target_inspector_exists`
- `central_viewport_is_dominant`
- `inspector_right_of_viewport`
- `primary_docks_top_aligned`
- `central_viewport_bounds_stable`

## Durable proof artifact refs

`asha-studio-ui-test.proof.json` preserves both the visual-contract service URLs
used during generation and local checked-in artifact paths that remain
retrievable after the local service stops.

| Compare | Run ID | Local report | Local diff overlay |
| --- | --- | --- | --- |
| self/reference | `9e2a23fe1dbda4d67d199699` | `fixtures/visual-contract/artifacts/9e2a23fe1dbda4d67d199699/report.json` | `fixtures/visual-contract/artifacts/9e2a23fe1dbda4d67d199699/diff.overlay.svg` |
| negative | `3a21858dae2dee1d7c00157e` | `fixtures/visual-contract/artifacts/3a21858dae2dee1d7c00157e/report.json` | `fixtures/visual-contract/artifacts/3a21858dae2dee1d7c00157e/diff.overlay.svg` |

The checked-in test `test/visual-contract-target.test.ts` asserts these local
artifacts exist and that the reports match the proof fixture's verdicts and
failure lists.

## Non-claims

This target is not ASHA authority evidence. It does **not** prove Rust/WASM
simulation correctness, native runtime readiness, Agora compositor integration,
hardware GPU use, or performance. It is a browser layout/affordance target for
candidate gating.

Task `asha#3123` adds the first current-Studio candidate proof against this target:

- Studio DOM exposes canonical `data-visual-id` / `data-visual-role` markers for
  the top proof/export controls, scene hierarchy, central viewport, selected
  target inspector, bottom command/evidence dock, limitation labels, selection
  outline, preview ghost, axis gizmo, and applied/preview state markers.
- `pnpm run proof:visual-contract` serves `dist/index.html?visualContract=1`,
  collects viewport-clipped browser evidence rooted at
  `[data-visual-id="asha_studio_shell"]`, converts it through the deployed
  visual-contract service on `den-srv`, and compares it with this target.
- Current candidate proof handles live in
  `fixtures/visual-contract/asha-studio-current.proof.json`, with candidate and
  negative contracts next to it and deployed-service report/overlay artifact
  copies under `fixtures/visual-contract/artifacts/<run_id>/`.
- The negative smoke removes `selected_target_inspector` and undersizes
  `central_3d_viewport`; readback requires fail-closed diagnostics for both.
- This candidate proof is still browser layout/affordance evidence only and does
  not replace scene/camera/pick/readback evidence for real viewport behavior.
