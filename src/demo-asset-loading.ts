import type {
  AssetLock,
  AssetLockEntry,
  AssetReference,
  Catalog,
  CatalogEntry,
  CatalogValidationCode,
  CatalogValidationError,
  FlatSceneDocument,
  LockFinding,
  LockIssueCode,
  MaterialProjection,
  RenderDiff,
  RenderFrameDiff,
  RenderMaterialDescriptor,
  SceneNodeRecord,
  SceneValidationCode,
  StaticMeshAsset,
} from '@asha/contracts';
import { renderHandle, sceneId, sceneNodeId } from '@asha/contracts';

export type DemoAssetLoadReadiness = 'ready' | 'failed_closed';
export type DemoAssetLoadFailureCode = 'missing_asset' | 'unsupported_format' | 'material_mismatch' | 'stale_catalog_lock_drift';
export type DemoAssetClassifiedCode = CatalogValidationCode | LockIssueCode | SceneValidationCode;

export interface StudioDemoAssetPackage {
  readonly id: string;
  readonly path: string;
  readonly catalog: Catalog;
  readonly lock: AssetLock;
  readonly scene: FlatSceneDocument;
}

export interface StudioDemoAssetSurfaceFinding {
  readonly surface: '@asha/contracts' | '@asha/command-registry' | '@asha/runtime-bridge' | '@asha/renderer-three';
  readonly status: 'available_public' | 'deferred' | 'not_required_for_reference_load';
  readonly evidence: string;
}

export interface StudioDemoAssetMaterialVariant {
  readonly materialId: string;
  readonly label: string;
  readonly hash: string | null;
  readonly structuralClass: MaterialProjection['collision']['structuralClass'];
}

export interface StudioDemoAssetRenderablePlacement {
  readonly renderableId: string;
  readonly sceneNodeId: number;
  readonly meshRef: string;
  readonly materialRef: string;
  readonly translation: readonly [number, number, number];
  readonly rotationQuat: readonly [number, number, number, number];
  readonly scale: readonly [number, number, number];
  readonly bounds: { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] };
  readonly renderHash: string;
}

export interface StudioDemoAssetProvenance {
  readonly assetId: string;
  readonly packageId: string;
  readonly packagePath: string;
  readonly sourcePath: string | null;
  readonly meshRef: string;
  readonly materialRefs: readonly string[];
  readonly catalogVersion: number;
  readonly catalogHash: string | null;
  readonly lockHash: string | null;
  readonly sceneId: number;
  readonly entityPlacementNodeIds: readonly number[];
}

export interface StudioDemoAssetNegativeSmoke {
  readonly id: string;
  readonly failureCode: DemoAssetLoadFailureCode;
  readonly scenario: string;
  readonly expectedOutcome: 'failed_closed';
  readonly actualOutcome: DemoAssetLoadReadiness;
  readonly classifiedCodes: readonly DemoAssetClassifiedCode[];
  readonly diagnostic: string;
}

export interface StudioDemoAssetCommandInput {
  readonly sessionId: string;
  readonly assetId: string;
  readonly materialId: string;
  readonly placement: {
    readonly translation: readonly number[];
    readonly rotation: readonly number[];
    readonly scale: readonly number[];
  };
}

export interface StudioDemoAssetPackageFile {
  readonly path: string;
  readonly content: unknown;
}

export interface StudioDemoAssetLoadArtifact {
  readonly schemaVersion: 1;
  readonly artifactKind: 'demo_asset_load';
  readonly artifactId: string;
  readonly sessionId: string;
  readonly scenarioId: string;
  readonly readiness: DemoAssetLoadReadiness;
  readonly commandId: 'scene.load_asset';
  readonly commandInput: StudioDemoAssetCommandInput;
  readonly packageId: string;
  readonly packagePath: string;
  readonly catalog: Catalog;
  readonly lock: AssetLock;
  readonly scene: FlatSceneDocument;
  readonly staticMesh: StaticMeshAsset;
  readonly loadedAssetId: string;
  readonly rendererClassification: 'contract_render_diff_reference';
  readonly loadDiff: RenderFrameDiff;
  readonly renderableIds: readonly string[];
  readonly placements: readonly StudioDemoAssetRenderablePlacement[];
  readonly materialVariants: readonly StudioDemoAssetMaterialVariant[];
  readonly provenance: StudioDemoAssetProvenance;
  readonly negativeSmokes: readonly StudioDemoAssetNegativeSmoke[];
  readonly loadEvidenceHash: string;
  readonly metadataHash: string;
  readonly surfaceFindings: readonly StudioDemoAssetSurfaceFinding[];
  readonly diagnostics: readonly string[];
  readonly knownLimitations: readonly string[];
}

export interface StudioDemoAssetLoadModel {
  readonly artifact: StudioDemoAssetLoadArtifact;
  readonly loadedRenderables: readonly StudioDemoAssetRenderablePlacement[];
  readonly summary: string;
}

const DEMO_PACKAGE_ID = 'asha-studio-demo-pack-0001';
const DEMO_PACKAGE_PATH = 'public-fixtures/demo-assets/asha-studio-demo-pack';
const DEMO_MESH_ASSET = 'mesh/demo-crate';
const DEMO_MATERIAL_COPPER = 'material/demo-brushed-copper';
const DEMO_MATERIAL_SLATE = 'material/demo-matte-slate';

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

function brushedCopperProjection(): MaterialProjection {
  return {
    render: { color: { r: 0.78, g: 0.42, b: 0.18, a: 1 }, texture: null, roughness: 0.47, emissive: 0, uvStrategy: 'planar' },
    collision: { solid: true, collidable: true, occludes: true, structuralClass: 'structural' },
  };
}

function matteSlateProjection(): MaterialProjection {
  return {
    render: { color: { r: 0.34, g: 0.37, b: 0.43, a: 1 }, texture: null, roughness: 0.82, emissive: 0, uvStrategy: 'flat' },
    collision: { solid: true, collidable: true, occludes: true, structuralClass: 'decorative' },
  };
}

function materialEntry(id: string, label: string, material: MaterialProjection): CatalogEntry {
  return {
    id,
    kind: 'material',
    version: 1,
    hash: fnv1aHash('asset-material', { id, material }),
    sourcePath: `${DEMO_PACKAGE_PATH}/materials/${id.split('/').at(-1)}.material.json`,
    label,
    dependencies: [],
    material,
  };
}

export function createDemoStaticMeshAsset(): StaticMeshAsset {
  return {
    asset: DEMO_MESH_ASSET,
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
    materialSlots: [{ slot: 0, material: DEMO_MATERIAL_COPPER }],
    collision: { kind: 'aabbFallback' },
  };
}

function meshCatalogEntry(staticMesh: StaticMeshAsset, copperHash: string | null): CatalogEntry {
  return {
    id: DEMO_MESH_ASSET,
    kind: 'mesh',
    version: 1,
    hash: fnv1aHash('asset-mesh', staticMesh),
    sourcePath: `${DEMO_PACKAGE_PATH}/models/demo-crate.mesh.json`,
    label: 'Demo Crate',
    dependencies: [{ id: DEMO_MATERIAL_COPPER, version: { req: 'exact', value: 1 }, hash: copperHash }],
    material: null,
  };
}

export function createDemoAssetPackage(): StudioDemoAssetPackage {
  const copper = materialEntry(DEMO_MATERIAL_COPPER, 'Demo Brushed Copper', brushedCopperProjection());
  const slate = materialEntry(DEMO_MATERIAL_SLATE, 'Demo Matte Slate', matteSlateProjection());
  const staticMesh = createDemoStaticMeshAsset();
  const mesh = meshCatalogEntry(staticMesh, copper.hash);
  const catalog: Catalog = { entries: [copper, slate, mesh] };
  const lock: AssetLock = {
    entries: catalog.entries.map((entry): AssetLockEntry => ({
      id: entry.id,
      kind: entry.kind,
      version: entry.version,
      hash: entry.hash,
      dependencies: entry.dependencies.map((dependency) => dependency.id),
    })),
  };
  const node: SceneNodeRecord = {
    id: sceneNodeId(1),
    parent: null,
    childOrder: 0,
    label: 'Demo Crate',
    tags: ['demo', 'asset-loading'],
    transform: { translation: [2.5, 0.5, 0.5], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    kind: { kind: 'staticMesh', asset: { id: DEMO_MESH_ASSET, version: { req: 'exact', value: 1 }, hash: mesh.hash } },
  };
  const scene: FlatSceneDocument = {
    schemaVersion: 1,
    id: sceneId(7301),
    metadata: { name: 'ASHA Studio Demo Asset Package', authoringFormatVersion: 1 },
    dependencies: [
      { id: DEMO_MESH_ASSET, version: { req: 'exact', value: 1 }, hash: mesh.hash },
      { id: DEMO_MATERIAL_COPPER, version: { req: 'exact', value: 1 }, hash: copper.hash },
    ],
    nodes: [node],
  };
  return { id: DEMO_PACKAGE_ID, path: DEMO_PACKAGE_PATH, catalog, lock, scene };
}

function entryById(catalog: Catalog, id: string): CatalogEntry | undefined {
  return catalog.entries.find((entry) => entry.id === id);
}

/**
 * The canonical on-disk demo asset package files, keyed by repo-relative path.
 * The browser-safe loader constructs the package in memory from the same data; the committed
 * files under `packagePath` are the canonical source and are verified to match by `proof:asset-load`.
 */
export function demoAssetPackageFiles(pkg: StudioDemoAssetPackage = createDemoAssetPackage()): readonly StudioDemoAssetPackageFile[] {
  const copper = entryById(pkg.catalog, DEMO_MATERIAL_COPPER);
  const slate = entryById(pkg.catalog, DEMO_MATERIAL_SLATE);
  return [
    { path: `${pkg.path}/catalog.json`, content: pkg.catalog },
    { path: `${pkg.path}/asset-lock.json`, content: pkg.lock },
    { path: `${pkg.path}/scene.json`, content: pkg.scene },
    { path: `${pkg.path}/models/demo-crate.mesh.json`, content: createDemoStaticMeshAsset() },
    { path: `${pkg.path}/materials/demo-brushed-copper.material.json`, content: copper?.material ?? null },
    { path: `${pkg.path}/materials/demo-matte-slate.material.json`, content: slate?.material ?? null },
  ];
}

/** Classified catalog validation over the public CatalogValidationCode vocabulary. */
export function validateDemoCatalog(catalog: Catalog): readonly CatalogValidationError[] {
  const errors: CatalogValidationError[] = [];
  const seen = new Set<string>();
  for (const entry of catalog.entries) {
    if (seen.has(entry.id)) {
      errors.push({ code: 'duplicate-asset-id', id: entry.id, kind: entry.kind, from: null, slot: null, expected: null, actual: null, reference: null, dependency: null, cyclePath: [] });
    }
    seen.add(entry.id);
    if (entry.kind === 'material' && entry.material === null) {
      errors.push({ code: 'material-payload-missing', id: entry.id, kind: entry.kind, from: null, slot: null, expected: null, actual: null, reference: null, dependency: null, cyclePath: [] });
    }
    if (entry.kind !== 'material' && entry.material !== null) {
      errors.push({ code: 'material-payload-on-non-material', id: entry.id, kind: entry.kind, from: null, slot: null, expected: null, actual: null, reference: null, dependency: null, cyclePath: [] });
    }
    if (entry.sourcePath !== null && entry.sourcePath.trim().length === 0) {
      errors.push({ code: 'empty-source-path', id: entry.id, kind: entry.kind, from: null, slot: null, expected: null, actual: null, reference: null, dependency: null, cyclePath: [] });
    }
    for (const dependency of entry.dependencies) {
      const target = entryById(catalog, dependency.id);
      if (target === undefined) {
        errors.push({ code: 'unknown-dependency', id: entry.id, kind: entry.kind, from: entry.id, slot: null, expected: null, actual: null, reference: dependency.id, dependency: dependency.id, cyclePath: [] });
      } else if (entry.kind === 'mesh' && target.kind !== 'material') {
        errors.push({ code: 'wrong-kind-reference', id: entry.id, kind: entry.kind, from: entry.id, slot: null, expected: 'material', actual: target.kind, reference: dependency.id, dependency: dependency.id, cyclePath: [] });
      }
    }
  }
  return errors;
}

/** Classified asset-lock drift over the public LockIssueCode vocabulary. Never re-locks silently. */
export function validateDemoLock(catalog: Catalog, lock: AssetLock): readonly LockFinding[] {
  const findings: LockFinding[] = [];
  const catalogIds = new Set(catalog.entries.map((entry) => entry.id));
  for (const locked of lock.entries) {
    const current = entryById(catalog, locked.id);
    if (current === undefined) {
      findings.push({ id: locked.id, code: 'missing', lockedKind: locked.kind, currentKind: null, lockedVersion: locked.version, currentVersion: null, lockedHash: locked.hash, currentHash: null, addedDependencies: [], removedDependencies: locked.dependencies });
      continue;
    }
    if (current.kind !== locked.kind) {
      findings.push({ id: locked.id, code: 'wrong-kind', lockedKind: locked.kind, currentKind: current.kind, lockedVersion: locked.version, currentVersion: current.version, lockedHash: locked.hash, currentHash: current.hash, addedDependencies: [], removedDependencies: [] });
    }
    if (current.version !== locked.version) {
      findings.push({ id: locked.id, code: 'stale-version', lockedKind: locked.kind, currentKind: current.kind, lockedVersion: locked.version, currentVersion: current.version, lockedHash: locked.hash, currentHash: current.hash, addedDependencies: [], removedDependencies: [] });
    }
    if (current.hash !== locked.hash) {
      findings.push({ id: locked.id, code: 'stale-hash', lockedKind: locked.kind, currentKind: current.kind, lockedVersion: locked.version, currentVersion: current.version, lockedHash: locked.hash, currentHash: current.hash, addedDependencies: [], removedDependencies: [] });
    }
    const currentDeps = new Set(current.dependencies.map((dependency) => dependency.id));
    const lockedDeps = new Set(locked.dependencies);
    const added = [...currentDeps].filter((id) => !lockedDeps.has(id));
    const removed = [...lockedDeps].filter((id) => !currentDeps.has(id));
    if (added.length > 0 || removed.length > 0) {
      findings.push({ id: locked.id, code: 'dependency-drift', lockedKind: locked.kind, currentKind: current.kind, lockedVersion: locked.version, currentVersion: current.version, lockedHash: locked.hash, currentHash: current.hash, addedDependencies: added, removedDependencies: removed });
    }
  }
  for (const id of catalogIds) {
    if (!lock.entries.some((entry) => entry.id === id)) {
      const current = entryById(catalog, id)!;
      findings.push({ id, code: 'new-in-catalog', lockedKind: null, currentKind: current.kind, lockedVersion: null, currentVersion: current.version, lockedHash: null, currentHash: current.hash, addedDependencies: [], removedDependencies: [] });
    }
  }
  return findings;
}

function driftFindings(findings: readonly LockFinding[]): readonly LockFinding[] {
  return findings.filter((finding) => finding.code !== 'new-in-catalog');
}

export type DemoAssetLoadResult =
  | {
      readonly ok: true;
      readonly placements: readonly StudioDemoAssetRenderablePlacement[];
      readonly loadDiff: RenderFrameDiff;
      readonly provenance: StudioDemoAssetProvenance;
      readonly renderableIds: readonly string[];
    }
  | {
      readonly ok: false;
      readonly failureCode: DemoAssetLoadFailureCode;
      readonly classifiedCodes: readonly DemoAssetClassifiedCode[];
      readonly diagnostic: string;
    };

function renderMaterialDescriptor(entry: CatalogEntry): RenderMaterialDescriptor {
  const material = entry.material!;
  return {
    id: entry.id,
    color: [material.render.color.r, material.render.color.g, material.render.color.b, material.render.color.a],
    texture: material.render.texture?.id ?? null,
    roughness: material.render.roughness,
    emissive: material.render.emissive,
    uvStrategy: material.render.uvStrategy,
  };
}

function boundsFor(translation: readonly [number, number, number], halfExtent: number): { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] } {
  return {
    min: [translation[0] - halfExtent, translation[1] - halfExtent, translation[2] - halfExtent],
    max: [translation[0] + halfExtent, translation[1] + halfExtent, translation[2] + halfExtent],
  };
}

/**
 * Load a demo asset package into the scene through the public `scene.load_asset` command identity.
 * Fails closed (never silently renders fallback geometry) on missing asset, unsupported format,
 * material mismatch, or stale catalog/lock drift, classifying each failure with public contract codes.
 */
export function loadDemoSceneAsset(pkg: StudioDemoAssetPackage): DemoAssetLoadResult {
  const catalogErrors = validateDemoCatalog(pkg.catalog);
  const wrongKind = catalogErrors.filter((error) => error.code === 'wrong-kind-reference');
  if (wrongKind.length > 0) {
    return { ok: false, failureCode: 'material_mismatch', classifiedCodes: wrongKind.map((error) => error.code), diagnostic: `Mesh material slot references a non-material asset: ${wrongKind.map((error) => error.reference).join(', ')}.` };
  }

  const drift = driftFindings(validateDemoLock(pkg.catalog, pkg.lock));
  const missingLock = drift.filter((finding) => finding.code === 'missing');
  if (missingLock.length > 0) {
    return { ok: false, failureCode: 'missing_asset', classifiedCodes: missingLock.map((finding) => finding.code), diagnostic: `Locked asset is missing from the catalog: ${missingLock.map((finding) => finding.id).join(', ')}.` };
  }
  if (drift.length > 0) {
    return { ok: false, failureCode: 'stale_catalog_lock_drift', classifiedCodes: drift.map((finding) => finding.code), diagnostic: `Catalog drifted from the pinned asset lock: ${drift.map((finding) => `${finding.id}:${finding.code}`).join(', ')}.` };
  }

  const ops: RenderDiff[] = [];
  const placements: StudioDemoAssetRenderablePlacement[] = [];
  const definedMaterials = new Set<string>();
  const definedMeshes = new Set<string>();
  let assetId = DEMO_MESH_ASSET;
  let sourcePath: string | null = null;
  let catalogVersion = 1;
  let catalogHash: string | null = null;
  let lockHash: string | null = null;
  const materialRefs = new Set<string>();

  for (const node of pkg.scene.nodes) {
    if (node.kind.kind !== 'staticMesh') {
      return { ok: false, failureCode: 'unsupported_format', classifiedCodes: ['asset-kind-mismatch'], diagnostic: `Scene node ${node.id} is a ${node.kind.kind}; only staticMesh demo assets are loadable in this slice.` };
    }
    const reference: AssetReference = node.kind.asset;
    const meshEntry = entryById(pkg.catalog, reference.id);
    if (meshEntry === undefined) {
      return { ok: false, failureCode: 'missing_asset', classifiedCodes: ['unknown-dependency'], diagnostic: `Scene references asset ${reference.id} that is absent from the demo catalog.` };
    }
    if (meshEntry.kind !== 'mesh') {
      return { ok: false, failureCode: 'unsupported_format', classifiedCodes: ['asset-kind-mismatch'], diagnostic: `Asset ${reference.id} is a ${meshEntry.kind}; a staticMesh node requires a mesh-kind catalog asset.` };
    }
    const staticMesh = meshEntry.id === DEMO_MESH_ASSET ? createDemoStaticMeshAsset() : null;
    if (staticMesh === null) {
      return { ok: false, failureCode: 'missing_asset', classifiedCodes: ['unknown-dependency'], diagnostic: `No static mesh payload registered for ${meshEntry.id}.` };
    }
    for (const slot of staticMesh.materialSlots) {
      const materialEntryForSlot = entryById(pkg.catalog, slot.material);
      if (materialEntryForSlot === undefined || materialEntryForSlot.kind !== 'material' || materialEntryForSlot.material === null) {
        return { ok: false, failureCode: 'material_mismatch', classifiedCodes: ['wrong-kind-reference'], diagnostic: `Mesh ${meshEntry.id} slot ${slot.slot} binds ${slot.material}, which is not a valid material catalog entry.` };
      }
      if (!definedMaterials.has(materialEntryForSlot.id)) {
        ops.push({ op: 'defineMaterial', material: renderMaterialDescriptor(materialEntryForSlot) });
        definedMaterials.add(materialEntryForSlot.id);
      }
      materialRefs.add(materialEntryForSlot.id);
    }
    if (!definedMeshes.has(staticMesh.asset)) {
      ops.push({ op: 'defineStaticMesh', asset: staticMesh });
      definedMeshes.add(staticMesh.asset);
    }
    const handle = renderHandle(7100 + Number(node.id));
    const renderableId = `scene-asset:${meshEntry.id}:${node.id}`;
    ops.push({
      op: 'createStaticMeshInstance',
      handle,
      parent: null,
      instance: {
        asset: staticMesh.asset,
        transform: node.transform,
        materialOverrides: [],
        metadata: { source: null, tags: [], label: node.label ?? `Loaded ${meshEntry.id}` },
      },
    });
    const primaryMaterial = staticMesh.materialSlots[0]?.material ?? DEMO_MATERIAL_COPPER;
    const placement: StudioDemoAssetRenderablePlacement = {
      renderableId,
      sceneNodeId: Number(node.id),
      meshRef: meshEntry.id,
      materialRef: primaryMaterial,
      translation: node.transform.translation as readonly [number, number, number],
      rotationQuat: node.transform.rotation as readonly [number, number, number, number],
      scale: node.transform.scale as readonly [number, number, number],
      bounds: boundsFor(node.transform.translation as readonly [number, number, number], 0.35),
      renderHash: fnv1aHash('demo-asset-render', { renderableId, asset: staticMesh, transform: node.transform, material: primaryMaterial }),
    };
    placements.push(placement);
    assetId = meshEntry.id;
    sourcePath = meshEntry.sourcePath;
    catalogVersion = meshEntry.version;
    catalogHash = meshEntry.hash;
    lockHash = pkg.lock.entries.find((entry) => entry.id === meshEntry.id)?.hash ?? null;
  }

  if (placements.length === 0) {
    return { ok: false, failureCode: 'missing_asset', classifiedCodes: ['unknown-dependency'], diagnostic: 'Demo scene document contains no loadable static-mesh nodes.' };
  }

  const provenance: StudioDemoAssetProvenance = {
    assetId,
    packageId: pkg.id,
    packagePath: pkg.path,
    sourcePath,
    meshRef: assetId,
    materialRefs: [...materialRefs],
    catalogVersion,
    catalogHash,
    lockHash,
    sceneId: Number(pkg.scene.id),
    entityPlacementNodeIds: placements.map((placement) => placement.sceneNodeId),
  };
  return { ok: true, placements, loadDiff: { ops }, provenance, renderableIds: placements.map((placement) => placement.renderableId) };
}

function negativeSmokes(): readonly StudioDemoAssetNegativeSmoke[] {
  const smokes: StudioDemoAssetNegativeSmoke[] = [];

  // Missing asset: lock still pins the mesh while the catalog has dropped it.
  const missingPkg = createDemoAssetPackage();
  const missingCatalog: Catalog = { entries: missingPkg.catalog.entries.filter((entry) => entry.id !== DEMO_MESH_ASSET) };
  const missingResult = loadDemoSceneAsset({ ...missingPkg, catalog: missingCatalog });
  smokes.push({
    id: 'negative:missing-asset',
    failureCode: 'missing_asset',
    scenario: 'Asset-lock pins mesh/demo-crate but the catalog no longer contains it.',
    expectedOutcome: 'failed_closed',
    actualOutcome: missingResult.ok ? 'ready' : 'failed_closed',
    classifiedCodes: missingResult.ok ? [] : missingResult.classifiedCodes,
    diagnostic: missingResult.ok ? 'unexpected success' : missingResult.diagnostic,
  });

  // Unsupported format: scene node points at a script-kind asset, not a static mesh.
  const unsupportedPkg = createDemoAssetPackage();
  const scriptEntry: CatalogEntry = { id: 'script/demo-behaviour', kind: 'script', version: 1, hash: 'asset-script-demo-v1', sourcePath: `${DEMO_PACKAGE_PATH}/scripts/demo-behaviour.script.json`, label: 'Demo Behaviour', dependencies: [], material: null };
  const unsupportedScene: FlatSceneDocument = {
    ...unsupportedPkg.scene,
    nodes: unsupportedPkg.scene.nodes.map((node) => ({ ...node, kind: { kind: 'staticMesh', asset: { id: 'script/demo-behaviour', version: { req: 'exact', value: 1 }, hash: 'asset-script-demo-v1' } } })),
  };
  const unsupportedResult = loadDemoSceneAsset({
    ...unsupportedPkg,
    catalog: { entries: [...unsupportedPkg.catalog.entries, scriptEntry] },
    lock: { entries: [...unsupportedPkg.lock.entries, { id: scriptEntry.id, kind: scriptEntry.kind, version: scriptEntry.version, hash: scriptEntry.hash, dependencies: [] }] },
    scene: unsupportedScene,
  });
  smokes.push({
    id: 'negative:unsupported-format',
    failureCode: 'unsupported_format',
    scenario: 'Scene staticMesh node references a script-kind catalog asset.',
    expectedOutcome: 'failed_closed',
    actualOutcome: unsupportedResult.ok ? 'ready' : 'failed_closed',
    classifiedCodes: unsupportedResult.ok ? [] : unsupportedResult.classifiedCodes,
    diagnostic: unsupportedResult.ok ? 'unexpected success' : unsupportedResult.diagnostic,
  });

  // Material mismatch: the mesh declares a dependency on the mesh id as if it were a material.
  const mismatchPkg = createDemoAssetPackage();
  const mismatchCatalog: Catalog = {
    entries: mismatchPkg.catalog.entries.map((entry) =>
      entry.id === DEMO_MESH_ASSET ? { ...entry, dependencies: [{ id: DEMO_MESH_ASSET, version: { req: 'exact', value: 1 }, hash: entry.hash }] } : entry,
    ),
  };
  const mismatchResult = loadDemoSceneAsset({ ...mismatchPkg, catalog: mismatchCatalog });
  smokes.push({
    id: 'negative:material-mismatch',
    failureCode: 'material_mismatch',
    scenario: 'Mesh catalog entry references a mesh asset where a material is required.',
    expectedOutcome: 'failed_closed',
    actualOutcome: mismatchResult.ok ? 'ready' : 'failed_closed',
    classifiedCodes: mismatchResult.ok ? [] : mismatchResult.classifiedCodes,
    diagnostic: mismatchResult.ok ? 'unexpected success' : mismatchResult.diagnostic,
  });

  // Stale catalog/lock drift: the catalog mesh version moved ahead of the pinned lock.
  const stalePkg = createDemoAssetPackage();
  const staleCatalog: Catalog = {
    entries: stalePkg.catalog.entries.map((entry) => (entry.id === DEMO_MESH_ASSET ? { ...entry, version: 2 } : entry)),
  };
  const staleResult = loadDemoSceneAsset({ ...stalePkg, catalog: staleCatalog });
  smokes.push({
    id: 'negative:stale-catalog-lock-drift',
    failureCode: 'stale_catalog_lock_drift',
    scenario: 'Catalog mesh version advanced to 2 while the asset lock still pins version 1.',
    expectedOutcome: 'failed_closed',
    actualOutcome: staleResult.ok ? 'ready' : 'failed_closed',
    classifiedCodes: staleResult.ok ? [] : staleResult.classifiedCodes,
    diagnostic: staleResult.ok ? 'unexpected success' : staleResult.diagnostic,
  });

  return smokes;
}

export function createStudioDemoAssetLoadModel(options: {
  readonly sessionId?: string;
  readonly scenarioId?: string;
} = {}): StudioDemoAssetLoadModel {
  const sessionId = options.sessionId ?? 'session-preview-0001';
  const scenarioId = options.scenarioId ?? 'voxel-basic';
  const pkg = createDemoAssetPackage();
  const staticMesh = createDemoStaticMeshAsset();
  const result = loadDemoSceneAsset(pkg);
  const smokes = negativeSmokes();
  const allSmokesFailClosed = smokes.every((smoke) => smoke.actualOutcome === 'failed_closed' && smoke.classifiedCodes.length > 0);

  const copper = entryById(pkg.catalog, DEMO_MATERIAL_COPPER)!;
  const slate = entryById(pkg.catalog, DEMO_MATERIAL_SLATE)!;
  const materialVariants: StudioDemoAssetMaterialVariant[] = [copper, slate].map((entry) => ({
    materialId: entry.id,
    label: entry.label ?? entry.id,
    hash: entry.hash,
    structuralClass: entry.material!.collision.structuralClass,
  }));

  if (!result.ok) {
    throw new Error(`Demo asset package failed to load through scene.load_asset: ${result.diagnostic}`);
  }

  const readiness: DemoAssetLoadReadiness = result.ok && allSmokesFailClosed ? 'ready' : 'failed_closed';
  const metadataHash = fnv1aHash('demo-asset-metadata', { catalog: pkg.catalog, lock: pkg.lock, scene: pkg.scene });
  const loadEvidenceHash = fnv1aHash('demo-asset-load', { loadDiff: result.loadDiff, placements: result.placements, provenance: result.provenance });
  const primaryPlacement = result.placements[0];
  if (primaryPlacement === undefined) {
    throw new Error('Demo asset load succeeded but produced no placements.');
  }
  const commandInput: StudioDemoAssetCommandInput = {
    sessionId,
    assetId: result.provenance.assetId,
    materialId: primaryPlacement.materialRef,
    placement: {
      translation: primaryPlacement.translation,
      rotation: primaryPlacement.rotationQuat,
      scale: primaryPlacement.scale,
    },
  };

  const artifact: StudioDemoAssetLoadArtifact = {
    schemaVersion: 1,
    artifactKind: 'demo_asset_load',
    artifactId: 'artifact-demo-asset-load-0001',
    sessionId,
    scenarioId,
    readiness,
    commandId: 'scene.load_asset',
    commandInput,
    packageId: pkg.id,
    packagePath: pkg.path,
    catalog: pkg.catalog,
    lock: pkg.lock,
    scene: pkg.scene,
    staticMesh,
    loadedAssetId: result.provenance.assetId,
    rendererClassification: 'contract_render_diff_reference',
    loadDiff: result.loadDiff,
    renderableIds: result.renderableIds,
    placements: result.placements,
    materialVariants,
    provenance: result.provenance,
    negativeSmokes: smokes,
    loadEvidenceHash,
    metadataHash,
    surfaceFindings: [
      { surface: '@asha/contracts', status: 'available_public', evidence: 'Catalog/CatalogEntry/AssetLock/LockFinding/FlatSceneDocument/StaticMeshAsset/RenderFrameDiff DTOs and classified validation codes are exported from the @asha/contracts package root.' },
      { surface: '@asha/command-registry', status: 'available_public', evidence: 'ASHA command registry exposes the scene.load_asset command identity with editor-local render-diff evidence and Scene > Load Asset GUI mirror.' },
      { surface: '@asha/runtime-bridge', status: 'deferred', evidence: 'Runtime placement/authority bootstrap is deferred; this slice loads reference render-diff evidence without importing runtime transports.' },
      { surface: '@asha/renderer-three', status: 'not_required_for_reference_load', evidence: 'Studio projects the loaded asset through its own Three.js viewport host without importing renderer internals.' },
    ],
    diagnostics: [],
    knownLimitations: [
      'Demo asset loading uses public @asha/contracts DTOs and Studio-owned reference render-diff evidence; it does not import renderer internals or claim native runtime placement.',
      'The browser-safe loader constructs the package in memory; the committed on-disk package files under packagePath (catalog.json, asset-lock.json, scene.json, models/*.mesh.json, materials/*.material.json) are the canonical source and are verified to match (and hashed) by proof:asset-load.',
      'Asset placement renders as browser/reference projection; Rust/WASM authority bootstrap of the scene document remains deferred until @asha/runtime-bridge compatibility is approved here.',
      'Negative smokes classify failures with public catalog/lock/scene validation codes; they are reference fail-closed evidence, not runtime authority rejections.',
    ],
  };

  return {
    artifact,
    loadedRenderables: result.placements,
    summary: `${result.provenance.assetId} from ${pkg.id} placed as ${result.renderableIds.length} renderable(s); ${result.loadDiff.ops.length} render diff op(s); ${smokes.length} negative smoke(s) fail closed; ${loadEvidenceHash}`,
  };
}
