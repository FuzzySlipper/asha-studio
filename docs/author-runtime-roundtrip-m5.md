# Author-to-Runtime Round Trip M5 Proof Gate

Task: `asha#3733`

This milestone closes the first durable Studio-authored content round trip. It
proves that a scene/catalog fixture authored from Studio can be loaded by the
browser runtime, interacted with through the demo browser surface, and inspected
again through Studio debug readback without private runtime transports or
freeform command hatches.

## Scope

- Studio-authored scene/catalog fixture: `pnpm run evidence -- authored-roundtrip-fixture`
- Browser runtime load of authored content: `pnpm run evidence -- authored-browser-runtime-load`
- Browser interaction with authored content: `pnpm run evidence -- authored-browser-interaction`
- Studio debug readback of browser-mutated authored content: `pnpm run evidence -- authored-studio-debug-readback`
- Evidence index over the child proof chain: `pnpm run evidence -- author-runtime-roundtrip-index`
- Milestone aggregate gate: `pnpm run evidence -- author-runtime-roundtrip-m5`

## Reviewer Artifact

`pnpm run evidence -- author-runtime-roundtrip-m5` regenerates:

`artifacts/author-runtime-roundtrip-m5/latest/index.json`

The aggregate artifact records the evidence-index artifact path and hashes,
the authored object and asset ids, runtime load hashes, browser input/readback
counts, final browser selection, Studio debug hash, negative smokes, boundary
check execution, and source artifact hash validation.

The supporting index artifact is regenerated at:

`artifacts/author-runtime-roundtrip-index/latest/index.json`

It records the full source artifact chain from the committed fixture through
runtime load, browser interaction, and Studio debug readback.

## Boundaries

M5 is a proof of round-trip evidence and readback correlation. It does not claim Studio runtime authority, private runtime mutation, source write authority after fixture generation, hardware GPU evidence, performance evidence, publish readiness, or native runtime execution. Browser interaction stays typed and bounded to the existing demo proof harness, and Studio inspection remains a read-model/debug projection over public evidence.
