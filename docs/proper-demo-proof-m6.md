# Proper Demo Proof M6 Capstone

Task: `asha#3734`

M6 closes the proper end-to-end ASHA demo proof path by indexing the evidence
already produced by M1 through M5 and checking the final campaign boundaries. It
does not add a new runtime route, private Studio data store, or Den-dependent
runtime behavior.

## Proof Commands

- Capstone verifier: `pnpm run proof:proper-demo-capstone-verifier`
- Final evidence index: `pnpm run proof:proper-demo-evidence-index`
- Boundary and non-claim guard: `pnpm run proof:proper-demo-capstone-guard`

The verifier is the expensive command. It regenerates the M1 through M5 proof
gates, the demo browser interaction proof, and boundary checks before writing:

`artifacts/proper-demo-capstone-verifier/latest/index.json`

The evidence index is the reviewer-friendly graph over the verifier source
artifacts:

`artifacts/proper-demo-evidence-index/latest/index.json`

The guard is the fast final check for boundary and non-claim drift:

`artifacts/proper-demo-capstone-guard/latest/index.json`

## Evidence Shape

The capstone verifier indexes:

- Studio workspace persistence M1: `studio_persistence_m1_proof`
- Studio authoring UX M2: `studio_authoring_ux_m2_proof`
- Demo browser interaction M3: `asha_demo_browser_interactive_proof`
- Studio live debug M4: `studio_live_gameplay_debug_m4`
- Author-to-runtime round trip M5: `studio_author_runtime_roundtrip_m5`
- Demo V2 proof handles: `asha_demo_v2_proof_index` and `asha_demo_game_workflow_v2_verification`
- Studio V2 live backend evidence: `studio_v2_live_backend_evidence`

## Boundaries

M6 preserves the M0 anti-stub contract. The capstone artifacts must not claim
hardware GPU evidence, performance evidence, store submission, installer,
package signing, product readiness, multiplayer evidence, private transport, or
runtime Den dependency.

Generated proof artifacts are evidence, not authored source. Browser interaction
must be event/readback evidence rather than marker-only text. Studio inspection
must stay on public read models and shared command/evidence surfaces; no
freeform command hatch or raw native/WASM transport import is allowed.

## Suggested Review

For a full proof refresh, run:

```bash
pnpm run proof:proper-demo-capstone-verifier
pnpm run proof:proper-demo-evidence-index
pnpm run proof:proper-demo-capstone-guard
```

For a quick guard after artifacts are current, run:

```bash
pnpm run proof:proper-demo-capstone-guard
```
