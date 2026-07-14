# Agora compositor capture proof (optional visual backend)

Script status: `proof:agora-compositor` and `proof:browser` are historical or
deferred proof command names, not current package scripts. Their status is
tracked by `docs/script-reference-policy.json`.

> Current renderer ownership: any future compositor capture observes the
> engine-owned `@asha/renderer-host` realization. Studio no longer owns a
> concrete renderer.

Task `asha#3219`. Promotes Agora compositor capture from an ad-hoc/manual demo path into a formal,
optional ASHA Studio visual proof backend with structured evidence classification and fail-closed
diagnostics.

## What it is

`pnpm run proof:agora-compositor` builds the Studio app, serves the static `dist/`, launches it as a
real webview **surface under the Wayfire/Agora compositor**, lets the launched surface settle, and
captures the **composited on-screen surface** via `compositorctl capture --export`. This is stronger
than the existing Chromium headless screenshot backend (`pnpm run proof:browser`): it is an actual
compositor surface frame, not an off-screen browser render.

It is **optional and additive**. It is environment-gated (requires a live compositor) and is **not**
part of `pnpm run verify`. The required browser-screenshot + visual-contract proof
(`studio_visual_capability_proof`) is unchanged and unweakened; it merely declares this backend under
`optionalBackends`. The cross-validation link runs the other direction: the Agora proof reads and
checks the visual capability proof (selected object + after-render hash).

## Evidence classification

- `captureBackend: agora_compositor`, `captureMode: compositor_surface`.
- `compositorCaptureBackend`: what the compositor itself reported (e.g. `plugin_readback`).
- `evidenceClass: viewport_screenshot`.

## What it verifies (fail-closed diagnostics)

- `missing_compositor_capture` — no capture artifact/frame was produced.
- `blank_compositor_frame` — fails unless BOTH the compositor `visual_inspection.status` is `visible`
  AND an independent ImageMagick metric (distinct colours + grayscale standard deviation) clears the
  minimum. A solid/black/no-frame surface cannot pass on a single signal.
- `wrong_surface_identity` — surface title must contain `ASHA Studio`, the captured frame surface id
  must match the launched surface, and dimensions must clear the minimum.
- `stale_compositor_frame` — capture must be after launch start and within the freshness window. Frame
  presentation is proved by the compositor `visual_inspection.status` being `visible` plus the
  independent pixel metrics above; `frameCountAtCapture`/`frame_count` is recorded as informational
  evidence only because WebKitGTK webview surfaces can render visible content without incrementing it.
- `uncorrelated_studio_timeline` — the frame is stamped with `asha_command_sequence_id` equal to the
  studio `render.capture_before_after` timeline sequence, which must exist in the timeline; when the
  visual capability proof is present it must be ready and agree on the selected object and after-render
  hash.
- `unsupported_gpu_or_performance_claim` — the proof must preserve the `not_hardware_gpu` and
  `not_performance_evidence` non-claims.

Negative smokes exercise each of these classes deterministically (see
`test/agora-compositor-capture.test.ts`).

## Non-claims preserved

A real composited frame is **not** evidence of hardware GPU acceleration, performance, native runtime
authority, or WASM authority — the Studio app still presents non-authoritative
browser projection through the engine-owned renderer host.
Authoritative runtime/transform mutation remains deferred behind the runtime-bridge readiness gate
(`asha#3047`). This backend does **not** assert `not_agora_compositor` (it *is* the compositor
capture); that non-claim describes the separate browser-screenshot backend.

## Artifacts

`artifacts/agora-compositor/latest/` (git-ignored, live): `index.json` (the proof), the captured
`agora-studio-surface.png`, and a copy of the compositor `compositor-capture-index.json`. Because the
artifact embeds live timestamps and the sha of a real frame, it is not byte-reproducible, so unit
coverage uses a synthetic evidence fixture rather than a committed sample.

## Running it

Requires a live compositor (`compositorctl`). See
`agora-os/agent-guide-connect-to-agora-shell-for-tests`.

```sh
pnpm run proof:agora-compositor
```
