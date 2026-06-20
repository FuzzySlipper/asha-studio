import type { Catalog, CatalogEntry, MaterialProjection, RenderDiff, RenderFrameDiff, RenderMaterialDescriptor, StaticMeshAsset } from '@asha/contracts';

export type ModelMaterialPreviewReadiness = 'ready' | 'blocked_missing_public_surface';

export interface StudioModelMaterialSurfaceFinding {
  readonly surface: '@asha/contracts' | '@asha/command-registry' | '@asha/runtime-bridge' | '@asha/renderer-three';
  readonly status: 'available_public' | 'missing_public_command' | 'deferred' | 'not_required_for_reference_preview';
  readonly evidence: string;
}

export interface StudioModelMaterialPreviewArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'model_material_preview';
  readonly artifactId: string;
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly readiness: ModelMaterialPreviewReadiness;
  readonly selectedModelAsset: string;
  readonly selectedMaterialAsset: string;
  readonly catalog: Catalog;
  readonly staticMesh: StaticMeshAsset;
  readonly material: MaterialProjection;
  readonly renderFrameDiff: RenderFrameDiff;
  readonly rendererClassification: 'contract_render_diff_reference';
  readonly previewArtifactPath: string;
  readonly previewEvidenceHash: string;
  readonly metadataHash: string;
  readonly surfaceFindings: readonly StudioModelMaterialSurfaceFinding[];
  readonly blockingFeatureRequests: readonly {
    readonly title: string;
    readonly reason: string;
    readonly expectedSurface: '@asha/command-registry' | '@asha/runtime-bridge';
  }[];
  readonly knownLimitations: readonly string[];
}

export interface StudioModelMaterialPreviewModel {
  readonly artifact: StudioModelMaterialPreviewArtifact;
  readonly svgPreview: string;
  readonly summary: string;
}

const DEFAULT_MODEL_ASSET = 'mesh/studio-preview-crate';
const DEFAULT_MATERIAL_ASSET = 'material/studio-brushed-copper';

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
}

function fnv1aHash(prefix: string, value: unknown): string {
  const text = stableJson(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}-${hash.toString(16).padStart(8, '0')}`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function createReferenceMaterialProjection(): MaterialProjection {
  return {
    render: {
      color: { r: 0.78, g: 0.42, b: 0.18, a: 1 },
      texture: null,
      roughness: 0.47,
      emissive: 0,
      uvStrategy: 'planar',
    },
    collision: {
      solid: true,
      collidable: true,
      occludes: true,
      structuralClass: 'decorative',
    },
  };
}

export function createReferenceCatalog(material: MaterialProjection = createReferenceMaterialProjection()): Catalog {
  const materialEntry: CatalogEntry = {
    id: DEFAULT_MATERIAL_ASSET,
    kind: 'material',
    version: 1,
    hash: fnv1aHash('asset-material', material),
    sourcePath: 'public-fixtures/materials/studio-brushed-copper.material.json',
    label: 'Studio Brushed Copper',
    dependencies: [],
    material,
  };
  const meshEntry: CatalogEntry = {
    id: DEFAULT_MODEL_ASSET,
    kind: 'mesh',
    version: 1,
    hash: 'asset-mesh-cube-inline-v1',
    sourcePath: 'public-fixtures/models/studio-preview-crate.mesh.json',
    label: 'Studio Preview Crate',
    dependencies: [{ id: DEFAULT_MATERIAL_ASSET, version: { req: 'exact', value: 1 }, hash: materialEntry.hash }],
    material: null,
  };
  return { entries: [materialEntry, meshEntry] };
}

export function createReferenceStaticMeshAsset(): StaticMeshAsset {
  return {
    asset: DEFAULT_MODEL_ASSET,
    payload: {
      layout: {
        vertexCount: 8,
        indexCount: 36,
        indexWidth: 'u32',
        attributes: [
          { name: 'position', components: 3, kind: 'f32' },
          { name: 'normal', components: 3, kind: 'f32' },
        ],
      },
      groups: [{ materialSlot: 0, start: 0, count: 36 }],
      bounds: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
      source: {
        kind: 'inline',
        positions: [-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5],
        normals: [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        indices: [0, 1, 2, 2, 3, 0, 4, 6, 5, 6, 4, 7, 0, 4, 5, 5, 1, 0, 3, 2, 6, 6, 7, 3, 1, 5, 6, 6, 2, 1, 0, 3, 7, 7, 4, 0],
      },
      provenance: 'staticAsset',
    },
    materialSlots: [{ slot: 0, material: DEFAULT_MATERIAL_ASSET }],
    collision: { kind: 'aabbFallback' },
  };
}

function renderMaterialDescriptor(material: MaterialProjection): RenderMaterialDescriptor {
  return {
    id: DEFAULT_MATERIAL_ASSET,
    color: [material.render.color.r, material.render.color.g, material.render.color.b, material.render.color.a],
    texture: material.render.texture?.id ?? null,
    roughness: material.render.roughness,
    emissive: material.render.emissive,
    uvStrategy: material.render.uvStrategy,
  };
}

export function createModelMaterialRenderFrameDiff(args: {
  readonly material: MaterialProjection;
  readonly staticMesh: StaticMeshAsset;
}): RenderFrameDiff {
  const ops: readonly RenderDiff[] = [
    { op: 'defineMaterial', material: renderMaterialDescriptor(args.material) },
    { op: 'defineStaticMesh', asset: args.staticMesh },
    {
      op: 'createStaticMeshInstance',
      handle: 4101 as never,
      parent: null,
      instance: {
        asset: args.staticMesh.asset,
        transform: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        materialOverrides: [],
        metadata: { source: null, tags: [], label: 'Studio model/material preview instance' },
      },
    },
  ];
  return { ops };
}

export function renderModelMaterialPreviewSvg(artifact: StudioModelMaterialPreviewArtifact): string {
  const color = artifact.material.render.color;
  const fill = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="260" viewBox="0 0 460 260" role="img" aria-label="ASHA Studio model material preview">
  <rect width="100%" height="100%" rx="18" fill="#0b1020"/>
  <text x="24" y="38" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#e2e8f0">Model / Material Preview</text>
  <g transform="translate(150 74)">
    <polygon points="80,0 170,42 90,86 0,42" fill="#fbbf24" opacity="0.55"/>
    <polygon points="0,42 90,86 90,178 0,132" fill="${fill}" opacity="0.82"/>
    <polygon points="90,86 170,42 170,132 90,178" fill="${fill}" opacity="0.62"/>
    <polygon points="80,0 170,42 90,86 0,42" fill="${fill}" opacity="0.95"/>
    <path d="M0 42 L90 86 L170 42 M90 86 L90 178" stroke="#0f172a" stroke-width="3" fill="none" opacity="0.65"/>
  </g>
  <text x="24" y="82" font-family="monospace" font-size="13" fill="#bfdbfe">model=${escapeHtml(artifact.selectedModelAsset)}</text>
  <text x="24" y="106" font-family="monospace" font-size="13" fill="#fecaca">material=${escapeHtml(artifact.selectedMaterialAsset)}</text>
  <text x="24" y="224" font-family="monospace" font-size="12" fill="#a7f3d0">${escapeHtml(artifact.previewEvidenceHash)}</text>
</svg>\n`;
}

export function createStudioModelMaterialPreviewModel(options: {
  readonly sessionId?: string;
  readonly scenarioId?: string;
} = {}): StudioModelMaterialPreviewModel {
  const sessionId = options.sessionId ?? 'session-preview-0001';
  const scenarioId = options.scenarioId ?? 'voxel-basic';
  const material = createReferenceMaterialProjection();
  const catalog = createReferenceCatalog(material);
  const staticMesh = createReferenceStaticMeshAsset();
  const renderFrameDiff = createModelMaterialRenderFrameDiff({ material, staticMesh });
  const metadataForHash = { catalog, staticMesh, renderFrameDiff };
  const previewEvidenceHash = fnv1aHash('model-material-preview', metadataForHash);
  const metadataHash = fnv1aHash('model-material-metadata', catalog);
  const artifact: StudioModelMaterialPreviewArtifact = {
    schemaVersion: 1,
    artifactKind: 'model_material_preview',
    artifactId: 'artifact-model-material-preview-0001',
    sessionId,
    scenarioId,
    readiness: 'ready',
    selectedModelAsset: DEFAULT_MODEL_ASSET,
    selectedMaterialAsset: DEFAULT_MATERIAL_ASSET,
    catalog,
    staticMesh,
    material,
    renderFrameDiff,
    rendererClassification: 'contract_render_diff_reference',
    previewArtifactPath: `artifacts/${sessionId}/model-material-preview.svg`,
    previewEvidenceHash,
    metadataHash,
    surfaceFindings: [
      { surface: '@asha/contracts', status: 'available_public', evidence: 'Catalog/MaterialProjection/StaticMeshAsset/RenderFrameDiff/RenderDiff are exported from the @asha/contracts package root.' },
      { surface: '@asha/command-registry', status: 'missing_public_command', evidence: 'Current registry has voxel/session/render/export commands but no model/material inspect or preview command identities.' },
      { surface: '@asha/runtime-bridge', status: 'deferred', evidence: 'No runtime facade verb is used by this reference preview; a future public bridge verb should load model/material preview fixtures for authority/runtime-backed previews.' },
      { surface: '@asha/renderer-three', status: 'not_required_for_reference_preview', evidence: 'This narrow Studio preview records contract render-diff descriptors and SVG proof content without importing renderer internals.' },
    ],
    blockingFeatureRequests: [
      {
        title: 'Add public model/material inspect and preview commands to ASHA command registry/runtime bridge',
        reason: 'Studio can build a public-contract reference artifact today, but first-class agent/GUI command parity needs registry command ids and optional runtime bridge readback for model/material previews.',
        expectedSurface: '@asha/command-registry',
      },
    ],
    knownLimitations: [
      'Preview uses public @asha/contracts DTOs and Studio-owned SVG proof content; it does not import renderer internals or claim native runtime rendering.',
      'First-class ASHA command-registry/runtime-bridge model/material preview verbs are still missing and tracked as a follow-up feature request.',
    ],
  };
  return {
    artifact,
    svgPreview: renderModelMaterialPreviewSvg(artifact),
    summary: `${artifact.selectedModelAsset} with ${artifact.selectedMaterialAsset}; ${renderFrameDiff.ops.length} render diff op(s); ${artifact.previewEvidenceHash}`,
  };
}
