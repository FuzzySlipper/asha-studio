# Voxel Conversion Phase 4 Before/After

Artifact hash: sha256:ae71270918fa6c218c7b94d3cb5dd1f37be3890925be2565ba935ada4e3e12e9
Fixture case: synthetic_colored_cube_solid
Source asset: mesh.synthetic-colored-cube
Source hash: sha256:phase4-cube-source-v1
Mode: solid
Resolution: 4 x 4 x 4
Material map: slot 0 -> material 2

Plan: plan.phase4.colored-cube
Authority version: voxel-conversion-authority.phase4-fixture
Plan hash: sha256:phase4-cube-settings
Preview hash: sha256:phase4-cube-preview
Receipt output hash: sha256:phase4-cube-output
Output voxels: 64
Output bounds: 0,0,0..3,3,3
Sample material ids: 2

Agreement
- receiptMatchesPreviewPlan: true
- receiptMatchesPreviewHash: true
- receiptMatchesOutputHash: true
- receiptMatchesOutputVoxelCount: true
- materialMapPreserved: true
- diagnosticsEmpty: true

Caveats
- Preview sample voxels are fixture-backed readout evidence, not browser-rendered imagery.
- No hardware GPU, performance, or live Rust runtime execution is claimed by this comparison.
- The committed comparison remains valid until the source fixture or proof generator changes.
