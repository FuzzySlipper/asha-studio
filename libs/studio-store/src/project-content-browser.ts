import type {
  FlatSceneDocument,
  ProjectConfigurationField,
  ProjectConfigurationValue,
  ProjectContentCodecResult,
  ProjectContentDiagnostic,
  ProjectContentDocument,
  ProjectContentDocumentKind,
  ProjectContentFieldMetadata,
  ProjectContentReferenceKind,
} from '@asha/contracts';
import {
  resolveAshaAuthoringWriteTarget,
  type AshaAuthoringOperationKind,
  type AshaGameManifest,
} from '@asha/game-workspace';

export type StudioProjectContentRootKind =
  | 'scene'
  | 'prefab'
  | 'asset'
  | 'catalog'
  | 'policy';

export interface StudioProjectContentFileDescriptor {
  readonly path: string;
  readonly relativePath: string;
  readonly rootKind: StudioProjectContentRootKind;
  readonly size: number;
  readonly mtimeMs: number;
}

export interface StudioProjectContentLoadedFile extends StudioProjectContentFileDescriptor {
  readonly text: string;
  readonly sha256: string;
  readonly sourceKind: ProjectContentDocumentKind | null;
  readonly documentId: string;
  readonly sourceClass: 'canonical-candidate' | 'stored-scene' | 'stored-voxel-asset' | 'legacy-source' | 'unrecognized';
  readonly legacyCategory: StudioProjectContentCategoryId | null;
  readonly parseDiagnostic: string | null;
  readonly voxelAsset?: StudioStoredVoxelAssetReadout;
}

export interface StudioStoredVoxelAssetReadout {
  readonly assetId: string;
  readonly materialPalette: readonly {
    readonly displayName: string | null;
    readonly materialAssetId: string;
    readonly voxelMaterial: number;
  }[];
}

export type StudioProjectContentCategoryId =
  | 'scenes-and-spawns'
  | 'entity-definitions'
  | 'prefabs'
  | 'assets-and-materials'
  | 'gameplay-configuration';

export type StudioProjectContentEntryStatus =
  | 'rust-validated'
  | 'rust-rejected'
  | 'stored-scene'
  | 'migration-required'
  | 'stored-voxel-asset'
  | 'unrecognized';

export type StudioProjectContentNavigationKind =
  | 'source'
  | 'entityDefinition'
  | 'prefab'
  | 'asset'
  | 'voxelAsset'
  | 'material'
  | 'spawnMarker'
  | 'sceneInstance'
  | 'configuration'
  | 'binding';

export interface StudioProjectContentRelationshipReadModel {
  readonly label: string;
  readonly navigationKind: StudioProjectContentNavigationKind;
  readonly targetId: string;
}

export interface StudioProjectContentEntryReadModel {
  readonly entryId: string;
  readonly categoryId: StudioProjectContentCategoryId;
  readonly documentId: string;
  readonly documentKind: ProjectContentDocumentKind | 'scene' | 'voxelAsset' | 'legacy' | 'unknown';
  readonly title: string;
  readonly subtitle: string;
  readonly sourcePath: string;
  readonly status: StudioProjectContentEntryStatus;
  readonly details: readonly string[];
  readonly relationships: readonly StudioProjectContentRelationshipReadModel[];
  readonly diagnostics: readonly ProjectContentDiagnostic[];
  readonly navigationKeys: readonly string[];
}

export interface StudioProjectContentCategoryReadModel {
  readonly categoryId: StudioProjectContentCategoryId;
  readonly label: string;
  readonly entries: readonly StudioProjectContentEntryReadModel[];
}

export interface StudioProjectContentReferenceOptionReadModel {
  readonly value: string;
  readonly label: string;
}

export interface StudioProjectContentWriteAuthorizationReadModel {
  readonly allowed: boolean;
  readonly operationKind: AshaAuthoringOperationKind;
  readonly normalizedPath: string | null;
  readonly diagnostic: string | null;
}

export interface StudioProjectContentSceneSource {
  readonly path: string;
  readonly sourceText: string;
}

export interface StudioProjectContentEditableFieldReadModel {
  readonly authoringKind: 'gameplayConfiguration' | 'material' | 'presentationCue';
  readonly documentId: string;
  readonly configurationId: string;
  readonly schemaId: string;
  readonly fieldId: string;
  readonly path: string;
  readonly label: string;
  readonly valueKind: ProjectConfigurationField['valueKind'];
  readonly value: boolean | number | string;
  readonly required: boolean;
  readonly referenceKind: ProjectContentReferenceKind | null;
  readonly integerMin: number | null;
  readonly integerMax: number | null;
  readonly numberMin: number | null;
  readonly numberMax: number | null;
  readonly options: readonly StudioProjectContentReferenceOptionReadModel[];
}

export interface StudioProjectContentBrowserReadModel {
  readonly status: 'closed' | 'loading' | 'ready' | 'degraded';
  readonly message: string;
  readonly projectRoot: string | null;
  readonly setHash: string | null;
  readonly categories: readonly StudioProjectContentCategoryReadModel[];
  readonly selectedEntryId: string | null;
  readonly selectedEntry: StudioProjectContentEntryReadModel | null;
  readonly editableFields: readonly StudioProjectContentEditableFieldReadModel[];
  readonly providerSchemaCount: number;
  readonly diagnostics: readonly ProjectContentDiagnostic[];
  readonly dirtyDocumentIds: readonly string[];
  readonly canSaveSelected: boolean;
  readonly selectedWriteAuthorization: StudioProjectContentWriteAuthorizationReadModel | null;
  readonly staleSourcePath: string | null;
}

export interface StudioProjectContentBrowserInput {
  readonly status: StudioProjectContentBrowserReadModel['status'];
  readonly message: string;
  readonly projectRoot: string | null;
  readonly files: readonly StudioProjectContentLoadedFile[];
  readonly codec: ProjectContentCodecResult | null;
  readonly selectedEntryId: string | null;
  readonly dirtyDocumentIds: readonly string[];
  readonly staleSourcePath: string | null;
  readonly manifest: AshaGameManifest | null;
  readonly activeScenePath: string | null;
  readonly activeScene: FlatSceneDocument;
  readonly projectScenes: readonly FlatSceneDocument[];
}

const CATEGORY_LABELS: Readonly<Record<StudioProjectContentCategoryId, string>> = {
  'scenes-and-spawns': 'Scenes, Instances & Spawns',
  'entity-definitions': 'Entity Definitions & Capabilities',
  prefabs: 'Prefabs, Variants & Bindings',
  'assets-and-materials': 'Assets, Materials & Presentation',
  'gameplay-configuration': 'Gameplay Configuration & Triggers',
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as readonly StudioProjectContentCategoryId[];

const PROJECT_CONTENT_DOCUMENT_KINDS = new Set<ProjectContentDocumentKind>([
  'entityDefinition',
  'assetCatalog',
  'prefabRegistry',
  'gameplayConfiguration',
  'presentationCatalog',
]);

export function inspectStudioProjectContentFile(
  descriptor: StudioProjectContentFileDescriptor,
  text: string,
  sha256: string,
): StudioProjectContentLoadedFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ...descriptor,
      text,
      sha256,
      sourceKind: null,
      documentId: descriptor.relativePath,
      sourceClass: 'unrecognized',
      legacyCategory: null,
      parseDiagnostic: error instanceof Error ? error.message : 'Invalid JSON.',
    };
  }
  if (!isRecord(parsed)) {
    return {
      ...descriptor,
      text,
      sha256,
      sourceKind: null,
      documentId: descriptor.relativePath,
      sourceClass: 'unrecognized',
      legacyCategory: null,
      parseDiagnostic: 'Project content JSON must contain an object at the root.',
    };
  }

  if (descriptor.relativePath.endsWith('.scene.json') && Array.isArray(parsed['nodes'])) {
    return classifiedFile(descriptor, text, sha256, null, descriptor.relativePath, 'stored-scene', null);
  }

  const voxelAsset = inspectStoredVoxelAsset(parsed);
  if (voxelAsset !== null) {
    if ('diagnostic' in voxelAsset) {
      return {
        ...classifiedFile(descriptor, text, sha256, null, descriptor.relativePath, 'unrecognized', null),
        parseDiagnostic: voxelAsset.diagnostic,
      };
    }
    return {
      ...classifiedFile(
        descriptor,
        text,
        sha256,
        null,
        voxelAsset.assetId,
        'stored-voxel-asset',
        null,
      ),
      voxelAsset,
    };
  }

  const artifactIdentity = inspectCanonicalArtifactIdentity(parsed);
  if (artifactIdentity !== null) {
    if ('diagnostic' in artifactIdentity) {
      return {
        ...classifiedFile(
          descriptor,
          text,
          sha256,
          null,
          descriptor.relativePath,
          'unrecognized',
          null,
        ),
        parseDiagnostic: artifactIdentity.diagnostic,
      };
    }
    return classifiedFile(
      descriptor,
      text,
      sha256,
      artifactIdentity.documentKind,
      artifactIdentity.documentId,
      'canonical-candidate',
      null,
    );
  }

  if (isAssetLockFile(descriptor, parsed)) {
    return classifiedFile(
      descriptor,
      text,
      sha256,
      null,
      descriptor.relativePath,
      'unrecognized',
      null,
    );
  }

  if (typeof parsed['stableId'] === 'string' && Array.isArray(parsed['capabilities'])) {
    return classifiedFile(
      descriptor,
      text,
      sha256,
      'entityDefinition',
      parsed['stableId'],
      'canonical-candidate',
      null,
    );
  }
  if (Array.isArray(parsed['definitions'])) {
    return classifiedFile(
      descriptor,
      text,
      sha256,
      'prefabRegistry',
      `prefab-registry:${descriptor.relativePath}`,
      'canonical-candidate',
      null,
    );
  }
  if (Array.isArray(parsed['entries'])) {
    return classifiedFile(
      descriptor,
      text,
      sha256,
      'assetCatalog',
      `asset-catalog:${descriptor.relativePath}`,
      'canonical-candidate',
      null,
    );
  }
  if (
    Array.isArray(parsed['configurations'])
    && Array.isArray(parsed['bindings'])
    && Array.isArray(parsed['overrides'])
    && Array.isArray(parsed['triggers'])
  ) {
    return classifiedFile(
      descriptor,
      text,
      sha256,
      'gameplayConfiguration',
      `gameplay-configuration:${descriptor.relativePath}`,
      'canonical-candidate',
      null,
    );
  }
  if (Array.isArray(parsed['resources']) && Array.isArray(parsed['cues'])) {
    return classifiedFile(
      descriptor,
      text,
      sha256,
      'presentationCatalog',
      `presentation-catalog:${descriptor.relativePath}`,
      'canonical-candidate',
      null,
    );
  }

  const legacyCategory = legacyCategoryFor(parsed);
  if (legacyCategory !== null) {
    return classifiedFile(
      descriptor,
      text,
      sha256,
      null,
      legacyIdentity(parsed, descriptor.relativePath),
      'legacy-source',
      legacyCategory,
    );
  }
  return classifiedFile(
    descriptor,
    text,
    sha256,
    null,
    descriptor.relativePath,
    'unrecognized',
    null,
  );
}

function inspectStoredVoxelAsset(
  parsed: Record<string, unknown>,
): StudioStoredVoxelAssetReadout | { readonly diagnostic: string } | null {
  const mediaType = parsed['mediaType'];
  if (typeof mediaType !== 'string' || !mediaType.startsWith('application/vnd.asha.voxel-volume+json')) {
    return null;
  }
  const assetId = parsed['assetId'];
  const materialPalette = parsed['materialPalette'];
  if (typeof assetId !== 'string' || assetId.trim().length === 0 || !Array.isArray(materialPalette)) {
    return { diagnostic: 'Canonical voxel-volume asset requires assetId and materialPalette.' };
  }
  const bindings: StudioStoredVoxelAssetReadout['materialPalette'][number][] = [];
  for (const [index, candidate] of materialPalette.entries()) {
    if (!isRecord(candidate)) {
      return { diagnostic: `Canonical voxel material binding ${index} must be an object.` };
    }
    const voxelMaterial = candidate['voxelMaterial'];
    const materialAssetId = candidate['materialAssetId'];
    const displayName = candidate['displayName'];
    if (
      typeof voxelMaterial !== 'number'
      || !Number.isSafeInteger(voxelMaterial)
      || typeof materialAssetId !== 'string'
      || materialAssetId.trim().length === 0
      || (displayName !== null && displayName !== undefined && typeof displayName !== 'string')
    ) {
      return { diagnostic: `Canonical voxel material binding ${index} is malformed.` };
    }
    bindings.push({
      voxelMaterial,
      materialAssetId,
      displayName: typeof displayName === 'string' ? displayName : null,
    });
  }
  return { assetId, materialPalette: bindings };
}

function inspectCanonicalArtifactIdentity(
  parsed: Record<string, unknown>,
): { readonly documentId: string; readonly documentKind: ProjectContentDocumentKind }
  | { readonly diagnostic: string }
  | null {
  const hasEnvelopeIdentity = Object.hasOwn(parsed, 'documentId')
    || Object.hasOwn(parsed, 'documentKind')
    || Object.hasOwn(parsed, 'document');
  if (!hasEnvelopeIdentity) return null;

  const documentId = parsed['documentId'];
  if (typeof documentId !== 'string' || documentId.trim().length === 0) {
    return { diagnostic: 'Canonical project-content artifact documentId must be a non-empty string.' };
  }
  const documentKind = parsed['documentKind'];
  if (typeof documentKind !== 'string' || !isProjectContentDocumentKind(documentKind)) {
    return { diagnostic: 'Canonical project-content artifact documentKind is not supported.' };
  }
  if (!Object.hasOwn(parsed, 'document')) {
    return { diagnostic: 'Canonical project-content artifact must contain document.' };
  }
  return { documentId, documentKind };
}

function isProjectContentDocumentKind(value: string): value is ProjectContentDocumentKind {
  return PROJECT_CONTENT_DOCUMENT_KINDS.has(value as ProjectContentDocumentKind);
}

function isAssetLockFile(
  descriptor: StudioProjectContentFileDescriptor,
  parsed: Record<string, unknown>,
): boolean {
  const normalizedPath = descriptor.relativePath.replaceAll('\\', '/');
  return descriptor.rootKind === 'asset'
    && normalizedPath.endsWith('/lock.json')
    && typeof parsed['schemaVersion'] === 'number'
    && Array.isArray(parsed['entries']);
}

export function buildStudioProjectContentBrowserReadModel(
  input: StudioProjectContentBrowserInput,
): StudioProjectContentBrowserReadModel {
  const entries = input.files.flatMap(file => entriesForFile(file, input));
  const categories = CATEGORY_ORDER.map(categoryId => ({
    categoryId,
    label: CATEGORY_LABELS[categoryId],
    entries: entries
      .filter(entry => entry.categoryId === categoryId)
      .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)),
  }));
  const flatEntries = categories.flatMap(category => category.entries);
  const selectedEntry = flatEntries.find(entry => entry.entryId === input.selectedEntryId)
    ?? flatEntries.at(0)
    ?? null;
  const editableFields = selectedEntry === null || input.codec === null
    ? []
    : editableFieldsForDocument(selectedEntry.documentId, input.codec, input.projectScenes);
  const dirtyIds = [...input.dirtyDocumentIds];
  const selectedFile = selectedEntry === null
    ? null
    : input.files.find(file => file.documentId === selectedEntry.documentId) ?? null;
  const selectedWriteAuthorization = selectedFile === null || input.manifest === null
    ? null
    : resolveStudioProjectContentWriteAuthorization(selectedFile, input.manifest);
  return {
    status: input.status,
    message: input.message,
    projectRoot: input.projectRoot,
    setHash: input.codec?.setHash ?? null,
    categories,
    selectedEntryId: selectedEntry?.entryId ?? null,
    selectedEntry,
    editableFields,
    providerSchemaCount: input.codec?.providerSchemas.length ?? 0,
    diagnostics: input.codec?.diagnostics ?? [],
    dirtyDocumentIds: dirtyIds,
    canSaveSelected: selectedEntry !== null
      && dirtyIds.includes(selectedEntry.documentId)
      && input.staleSourcePath === null
      && selectedWriteAuthorization?.allowed === true,
    selectedWriteAuthorization,
    staleSourcePath: input.staleSourcePath,
  };
}

export function resolveStudioProjectContentWriteAuthorization(
  file: StudioProjectContentFileDescriptor,
  manifest: AshaGameManifest,
): StudioProjectContentWriteAuthorizationReadModel {
  const operationKind = projectContentAuthoringOperation(file.rootKind);
  const resolution = resolveAshaAuthoringWriteTarget(manifest, {
    operationKind,
    relativePath: file.relativePath,
  });
  if (!resolution.ok) {
    return {
      allowed: false,
      operationKind,
      normalizedPath: null,
      diagnostic: resolution.diagnostics.map(diagnostic => diagnostic.message).join(' '),
    };
  }
  return {
    allowed: true,
    operationKind,
    normalizedPath: resolution.normalizedPath,
    diagnostic: null,
  };
}

export function selectStudioProjectContentSceneSources(
  files: readonly StudioProjectContentLoadedFile[],
  activeScenePath: string | null,
  activeSceneCanonicalJson: string | null,
): readonly StudioProjectContentSceneSource[] {
  const sources = files
    .filter(file => file.sourceClass === 'stored-scene')
    .map(file => ({ path: file.path, sourceText: file.text }));
  if (activeScenePath === null || activeSceneCanonicalJson === null) {
    return sources;
  }
  return sources.map(source => sameHostPath(source.path, activeScenePath)
    ? { path: source.path, sourceText: activeSceneCanonicalJson }
    : source,
  );
}

export function formatProjectContentPrefabPartReference(prefabId: number, role: string): string {
  return `${String(prefabId)}:${role}`;
}

function projectContentAuthoringOperation(
  rootKind: StudioProjectContentRootKind,
): AshaAuthoringOperationKind {
  switch (rootKind) {
    case 'scene': return 'authoring.scene.save_source';
    case 'prefab': return 'authoring.prefab.save_source';
    case 'asset': return 'authoring.asset.save_source';
    case 'catalog': return 'authoring.catalog.save_source';
    case 'policy': return 'authoring.policy.save_source';
  }
}

export function projectContentNavigationKey(
  kind: StudioProjectContentNavigationKind,
  id: string,
): string {
  return `${kind}:${id}`;
}

export function findStudioProjectContentEntryByReference(
  browser: StudioProjectContentBrowserReadModel,
  kind: StudioProjectContentNavigationKind,
  id: string,
): StudioProjectContentEntryReadModel | null {
  const key = projectContentNavigationKey(kind, id);
  return browser.categories
    .flatMap(category => category.entries)
    .find(entry => entry.navigationKeys.includes(key)) ?? null;
}

export function updateProjectConfigurationField(
  documents: readonly ProjectContentDocument[],
  documentId: string,
  configurationId: string,
  fieldId: string,
  value: ProjectConfigurationValue,
): ProjectContentDocument | null {
  const target = documents.find(document =>
    document.kind === 'gameplayConfiguration' && document.documentId === documentId,
  );
  if (target?.kind !== 'gameplayConfiguration') {
    return null;
  }
  const configurationExists = target.document.configurations.some(
    configuration => configuration.configurationId === configurationId,
  );
  if (!configurationExists) {
    return null;
  }
  return {
    ...target,
    document: {
      ...target.document,
      configurations: target.document.configurations.map(configuration => {
        if (configuration.configurationId !== configurationId) {
          return configuration;
        }
        const hasValue = configuration.values.some(candidate => candidate.fieldId === fieldId);
        return {
          ...configuration,
          values: hasValue
            ? configuration.values.map(candidate =>
                candidate.fieldId === fieldId ? { fieldId, value } : candidate,
              )
            : [...configuration.values, { fieldId, value }],
        };
      }),
    },
  };
}

export function updateProjectContentField(
  documents: readonly ProjectContentDocument[],
  field: StudioProjectContentEditableFieldReadModel,
  value: ProjectConfigurationValue,
): ProjectContentDocument | null {
  if (field.authoringKind === 'gameplayConfiguration') {
    return updateProjectConfigurationField(
      documents,
      field.documentId,
      field.configurationId,
      field.fieldId,
      value,
    );
  }
  const numericValue = value.kind === 'number' || value.kind === 'integer' ? value.value : null;
  if (numericValue === null) return null;
  if (field.authoringKind === 'material') {
    return updateMaterialField(documents, field.documentId, field.path, numericValue);
  }
  return updatePresentationCueField(documents, field.documentId, field.path, numericValue);
}

function classifiedFile(
  descriptor: StudioProjectContentFileDescriptor,
  text: string,
  sha256: string,
  sourceKind: ProjectContentDocumentKind | null,
  documentId: string,
  sourceClass: StudioProjectContentLoadedFile['sourceClass'],
  legacyCategory: StudioProjectContentCategoryId | null,
): StudioProjectContentLoadedFile {
  return {
    ...descriptor,
    text,
    sha256,
    sourceKind,
    documentId,
    sourceClass,
    legacyCategory,
    parseDiagnostic: null,
  };
}

function entriesForFile(
  file: StudioProjectContentLoadedFile,
  input: StudioProjectContentBrowserInput,
): readonly StudioProjectContentEntryReadModel[] {
  if (file.sourceClass === 'stored-scene') {
    return [sceneEntry(file, input)];
  }
  if (file.sourceClass === 'stored-voxel-asset' && file.voxelAsset !== undefined) {
    return [voxelAssetEntry(file, file.voxelAsset)];
  }
  const document = input.codec?.documents.find(candidate => candidate.documentId === file.documentId) ?? null;
  if (document !== null) {
    return [typedDocumentEntry(file, document, input.codec?.diagnostics ?? [])];
  }
  if (file.sourceClass === 'legacy-source' && file.legacyCategory !== null) {
    return [legacyEntry(file)];
  }
  if (file.sourceClass === 'canonical-candidate') {
    const diagnostics = diagnosticsForFile(file, input.codec?.diagnostics ?? []);
    const rejectedSummary = rejectedCandidateSummary(file);
    return [{
      entryId: `document:${file.documentId}`,
      categoryId: categoryForDocumentKind(file.sourceKind),
      documentId: file.documentId,
      documentKind: file.sourceKind ?? 'unknown',
      title: file.documentId,
      subtitle: 'Rust rejected this stored source',
      sourcePath: file.path,
      status: 'rust-rejected',
      details: [
        'Fix the listed fields or references before this document can be saved.',
        ...rejectedSummary.details,
      ],
      relationships: rejectedSummary.relationships,
      diagnostics,
      navigationKeys: [
        projectContentNavigationKey('source', file.path),
        projectContentNavigationKey('source', file.relativePath),
        ...rejectedSummary.navigationKeys,
      ],
    }];
  }
  return [{
    entryId: `source:${file.relativePath}`,
    categoryId: file.rootKind === 'scene' ? 'scenes-and-spawns' : 'assets-and-materials',
    documentId: file.documentId,
    documentKind: 'unknown',
    title: file.relativePath,
    subtitle: file.parseDiagnostic ?? 'No public project-content descriptor matched this JSON source.',
    sourcePath: file.path,
    status: 'unrecognized',
    details: [],
    relationships: [],
    diagnostics: [],
    navigationKeys: [
      projectContentNavigationKey('source', file.path),
      projectContentNavigationKey('source', file.relativePath),
    ],
  }];
}

function sceneEntry(
  file: StudioProjectContentLoadedFile,
  input: StudioProjectContentBrowserInput,
): StudioProjectContentEntryReadModel {
  const active = input.activeScenePath !== null && sameHostPath(input.activeScenePath, file.path);
  const storedSceneId = parseRecord(file.text)['id'];
  const scene = active
    ? input.activeScene
    : input.projectScenes.find(candidate => Number(candidate.id) === storedSceneId) ?? null;
  const relationships: StudioProjectContentRelationshipReadModel[] = [];
  const details: string[] = [];
  const navigationKeys = [
    projectContentNavigationKey('source', file.path),
    projectContentNavigationKey('source', file.relativePath),
  ];
  if (scene !== null) {
    for (const node of scene.nodes) {
      if (node.kind.kind === 'entityInstance') {
        const instance = node.kind.instance;
        navigationKeys.push(projectContentNavigationKey('sceneInstance', instance.instanceId));
        relationships.push({
          label: instance.reference.kind === 'entityDefinition'
            ? `${instance.instanceId} uses ${instance.reference.stableId}`
            : `${instance.instanceId} uses prefab ${instance.reference.prefabId}`,
          navigationKind: instance.reference.kind === 'entityDefinition' ? 'entityDefinition' : 'prefab',
          targetId: instance.reference.kind === 'entityDefinition'
            ? instance.reference.stableId
            : String(instance.reference.prefabId),
        });
        if (instance.spawnMarkerId !== null) {
          relationships.push({
            label: `${instance.instanceId} starts at ${instance.spawnMarkerId}`,
            navigationKind: 'spawnMarker',
            targetId: instance.spawnMarkerId,
          });
        }
      }
      if (node.kind.kind === 'voxelVolume') {
        relationships.push({
          label: `${node.label ?? `voxel node ${String(node.id)}`} uses ${node.kind.asset.id}`,
          navigationKind: 'voxelAsset',
          targetId: node.kind.asset.id,
        });
      }
      if (node.kind.kind === 'bootstrap') {
        for (const catalog of node.kind.bindings.catalogs) {
          relationships.push({
            label: `${catalog.bindingId} catalog ${catalog.catalogId}`,
            navigationKind: 'source',
            targetId: catalog.sourcePath,
          });
        }
      }
    }
    const instances = scene.nodes.filter(node => node.kind.kind === 'entityInstance').length;
    const lights = scene.nodes.filter(node => node.kind.kind === 'light').length;
    const voxelVolumes = scene.nodes.filter(node => node.kind.kind === 'voxelVolume').length;
    details.push(
      `${scene.nodes.length} stored nodes`,
      `${instances} entity instances`,
      `${lights} authored lights`,
      `${voxelVolumes} voxel volumes`,
    );
  } else {
    details.push('Open this scene to inspect its typed hierarchy and navigate its relationships.');
  }
  return {
    entryId: `scene:${file.relativePath}`,
    categoryId: 'scenes-and-spawns',
    documentId: file.documentId,
    documentKind: 'scene',
    title: file.relativePath,
    subtitle: active ? 'Open stored SceneDocument' : 'Stored SceneDocument',
    sourcePath: file.path,
    status: 'stored-scene',
    details,
    relationships,
    diagnostics: [],
    navigationKeys,
  };
}

function voxelAssetEntry(
  file: StudioProjectContentLoadedFile,
  asset: StudioStoredVoxelAssetReadout,
): StudioProjectContentEntryReadModel {
  return {
    entryId: `voxel-asset:${asset.assetId}`,
    categoryId: 'assets-and-materials',
    documentId: asset.assetId,
    documentKind: 'voxelAsset',
    title: asset.assetId,
    subtitle: `Stored voxel volume · ${asset.materialPalette.length} material bindings`,
    sourcePath: file.path,
    status: 'stored-voxel-asset',
    details: asset.materialPalette.map(binding => (
      `voxel ${binding.voxelMaterial} · ${binding.displayName ?? binding.materialAssetId}`
    )),
    relationships: asset.materialPalette.map(binding => ({
      label: `voxel ${binding.voxelMaterial} uses ${binding.materialAssetId}`,
      navigationKind: 'material',
      targetId: binding.materialAssetId,
    })),
    diagnostics: [],
    navigationKeys: sourceNavigationKeys(file, [
      projectContentNavigationKey('voxelAsset', asset.assetId),
      projectContentNavigationKey('asset', asset.assetId),
    ]),
  };
}

function typedDocumentEntry(
  file: StudioProjectContentLoadedFile,
  document: ProjectContentDocument,
  allDiagnostics: readonly ProjectContentDiagnostic[],
): StudioProjectContentEntryReadModel {
  const common = {
    entryId: `document:${document.documentId}`,
    documentId: document.documentId,
    sourcePath: file.path,
    status: 'rust-validated' as const,
    diagnostics: diagnosticsForFile(file, allDiagnostics),
  };
  switch (document.kind) {
    case 'entityDefinition':
      return {
        ...common,
        categoryId: 'entity-definitions',
        documentKind: document.kind,
        title: document.definition.displayName,
        subtitle: document.definition.stableId,
        details: [
          `${document.definition.capabilities.length} capabilities`,
          `${document.definition.tags.length} tags`,
          ...document.definition.capabilities.map(capability => `capability · ${capability.kind}`),
        ],
        relationships: [],
        navigationKeys: sourceNavigationKeys(file, [
          projectContentNavigationKey('entityDefinition', document.definition.stableId),
        ]),
      };
    case 'prefabRegistry': {
      const relationships: StudioProjectContentRelationshipReadModel[] = [];
      for (const definition of document.registry.definitions) {
        for (const part of definition.parts) {
          if (part.source.kind === 'entityDefinition') {
            relationships.push({
              label: `${definition.id} part ${part.displayName} uses ${part.source.stableId}`,
              navigationKind: 'entityDefinition',
              targetId: part.source.stableId,
            });
          } else {
            relationships.push({
              label: `${definition.id} part ${part.displayName} uses ${part.source.asset}`,
              navigationKind: 'asset',
              targetId: part.source.asset,
            });
          }
        }
      }
      return {
        ...common,
        categoryId: 'prefabs',
        documentKind: document.kind,
        title: 'Prefab Registry',
        subtitle: `${document.registry.definitions.length} definitions`,
        details: document.registry.definitions.flatMap(definition => [
          `${definition.displayName} · ${definition.parts.length} parts · ${definition.partRoles.length} roles`,
          ...(definition.variant === null
            ? []
            : [`variant ${definition.variant.variantId} of ${String(definition.variant.base)}`]),
        ]),
        relationships,
        diagnostics: common.diagnostics,
        navigationKeys: sourceNavigationKeys(
          file,
          document.registry.definitions.map(definition =>
            projectContentNavigationKey('prefab', String(definition.id)),
          ),
        ),
      };
    }
    case 'assetCatalog':
      return {
        ...common,
        categoryId: 'assets-and-materials',
        documentKind: document.kind,
        title: 'Asset Catalog',
        subtitle: `${document.catalog.entries.length} assets`,
        details: document.catalog.entries.map(entry =>
          `${entry.label ?? entry.id} · ${entry.material === null ? 'asset' : 'material'} · ${entry.sourcePath ?? 'embedded'}`,
        ),
        relationships: document.catalog.entries.flatMap(entry =>
          entry.dependencies.map(dependency => ({
            label: `${entry.id} depends on ${dependency.id}`,
            navigationKind: 'asset' as const,
            targetId: dependency.id,
          })),
        ),
        navigationKeys: sourceNavigationKeys(
          file,
          document.catalog.entries.flatMap(entry => [
            projectContentNavigationKey('asset', entry.id),
            ...(entry.material === null ? [] : [projectContentNavigationKey('material', entry.id)]),
          ]),
        ),
      };
    case 'gameplayConfiguration':
      return {
        ...common,
        categoryId: 'gameplay-configuration',
        documentKind: document.kind,
        title: 'Gameplay Configuration',
        subtitle: `${document.document.configurations.length} provider configurations`,
        details: [
          ...document.document.configurations.map(configuration =>
            `${configuration.configurationId} · ${configuration.schemaId} · ${configuration.values.length} fields`,
          ),
          `${document.document.bindings.length} bindings · ${document.document.overrides.length} overrides`,
          `${document.document.triggers.length} trigger definitions`,
        ],
        relationships: [
          ...document.document.bindings.map(binding => ({
            label: `binding ${binding.bindingId} · ${binding.moduleId} · ${binding.configurationId}`,
            navigationKind: 'binding' as const,
            targetId: binding.bindingId,
          })),
          ...document.document.triggers.map(trigger => ({
            label: `trigger scope ${trigger.scope} on ${trigger.sceneInstanceId}`,
            navigationKind: 'sceneInstance' as const,
            targetId: trigger.sceneInstanceId,
          })),
        ],
        navigationKeys: sourceNavigationKeys(file, [
          ...document.document.configurations.map(configuration =>
            projectContentNavigationKey('configuration', configuration.configurationId),
          ),
          ...document.document.bindings.map(binding =>
            projectContentNavigationKey('binding', binding.bindingId),
          ),
          ...document.document.triggers.map(trigger =>
            projectContentNavigationKey('sceneInstance', trigger.sceneInstanceId),
          ),
        ]),
      };
    case 'presentationCatalog':
      return {
        ...common,
        categoryId: 'assets-and-materials',
        documentKind: document.kind,
        title: 'Presentation Catalog',
        subtitle: `${document.catalog.resources.length} resources · ${document.catalog.cues.length} cues`,
        details: [
          ...document.catalog.resources.map(resource => `${resource.kind} · ${resource.resourceId}`),
          ...document.catalog.cues.map(cue => `${cue.kind} cue · ${cue.cueId}`),
        ],
        relationships: document.catalog.resources.map(resource => ({
          label: `${resource.resourceId} uses ${resource.assetId}`,
          navigationKind: 'asset' as const,
          targetId: resource.assetId,
        })),
        navigationKeys: sourceNavigationKeys(
          file,
          document.catalog.resources.map(resource => projectContentNavigationKey('asset', resource.assetId)),
        ),
      };
  }
}

function legacyEntry(file: StudioProjectContentLoadedFile): StudioProjectContentEntryReadModel {
  const parsed = parseRecord(file.text);
  const relationships: StudioProjectContentRelationshipReadModel[] = [];
  const navigationKeys = sourceNavigationKeys(file, []);
  const details: string[] = [];
  const stableId = stringField(parsed, 'stableId');
  if (stableId !== null) {
    navigationKeys.push(projectContentNavigationKey('entityDefinition', stableId));
    details.push(`EntityDefinition ${stableId}`);
  }
  const catalogId = stringField(parsed, 'catalogId');
  if (catalogId !== null) details.push(`catalog ${catalogId}`);
  const weaponId = stringField(parsed, 'weaponId');
  if (weaponId !== null) {
    details.push(`weapon ${weaponId}`);
    navigationKeys.push(projectContentNavigationKey('configuration', weaponId));
  }
  for (const marker of recordArrayField(parsed, 'markers')) {
    const markerId = stringField(marker, 'markerId') ?? stringField(marker, 'id');
    if (markerId !== null) {
      navigationKeys.push(projectContentNavigationKey('spawnMarker', markerId));
      details.push(`spawn marker ${markerId}`);
    }
  }
  for (const material of recordArrayField(parsed, 'materials')) {
    const materialId = stringField(material, 'materialId') ?? stringField(material, 'id');
    if (materialId !== null) {
      navigationKeys.push(projectContentNavigationKey('material', materialId));
      details.push(`material ${materialId}`);
    }
  }
  if (Array.isArray(parsed['capabilities'])) {
    const capabilities = parsed['capabilities'].filter(isRecord);
    details.push(`${capabilities.length} legacy capability declarations`);
    for (const capability of capabilities) {
      const kind = stringField(capability, 'kind');
      if (kind !== null) details.push(`capability · ${kind}`);
      const capabilityWeapon = stringField(capability, 'weaponId');
      if (capabilityWeapon !== null) {
        relationships.push({
          label: `${kind ?? 'capability'} uses ${capabilityWeapon}`,
          navigationKind: 'configuration',
          targetId: capabilityWeapon,
        });
      }
    }
  }
  const refs = parsed['refs'];
  if (isRecord(refs)) {
    for (const [role, target] of Object.entries(refs)) {
      if (typeof target !== 'string') continue;
      relationships.push({ label: `${role} source`, navigationKind: 'source', targetId: target });
    }
  }
  return {
    entryId: `legacy:${file.relativePath}`,
    categoryId: file.legacyCategory ?? 'assets-and-materials',
    documentId: file.documentId,
    documentKind: 'legacy',
    title: stableId ?? catalogId ?? weaponId ?? file.relativePath,
    subtitle: 'Stored source awaiting canonical project-content migration',
    sourcePath: file.path,
    status: 'migration-required',
    details,
    relationships,
    diagnostics: [],
    navigationKeys,
  };
}

function rejectedCandidateSummary(file: StudioProjectContentLoadedFile): {
  readonly details: readonly string[];
  readonly relationships: readonly StudioProjectContentRelationshipReadModel[];
  readonly navigationKeys: readonly string[];
} {
  const parsed = parseRecord(file.text);
  const details: string[] = [];
  const relationships: StudioProjectContentRelationshipReadModel[] = [];
  const navigationKeys: string[] = [];
  if (file.sourceKind === 'entityDefinition') {
    navigationKeys.push(projectContentNavigationKey('entityDefinition', file.documentId));
    const displayName = stringField(parsed, 'displayName');
    if (displayName !== null) details.push(displayName);
    const capabilities = recordArrayField(parsed, 'capabilities');
    details.push(...capabilities.flatMap(capability => {
      const kind = stringField(capability, 'kind');
      const weapon = stringField(capability, 'weaponId');
      if (weapon !== null) {
        relationships.push({
          label: `${kind ?? 'capability'} uses ${weapon}`,
          navigationKind: 'configuration',
          targetId: weapon,
        });
      }
      return kind === null ? [] : [`declared capability · ${kind}`];
    }));
  }
  if (file.sourceKind === 'prefabRegistry') {
    for (const definition of recordArrayField(parsed, 'definitions')) {
      const id = definition['id'];
      const displayName = stringField(definition, 'displayName');
      if (typeof id !== 'string' && typeof id !== 'number') continue;
      navigationKeys.push(projectContentNavigationKey('prefab', String(id)));
      const parts = recordArrayField(definition, 'parts');
      const roles = recordArrayField(definition, 'partRoles');
      details.push(`${displayName ?? String(id)} · ${parts.length} parts · ${roles.length} roles`);
      const variant = definition['variant'];
      if (isRecord(variant)) {
        details.push(`variant ${String(variant['variantId'] ?? 'unknown')} of ${String(variant['base'] ?? 'unknown')}`);
      }
      for (const part of parts) {
        const source = part['source'];
        if (!isRecord(source)) continue;
        const stableId = stringField(source, 'stableId');
        const asset = stringField(source, 'asset');
        if (stableId !== null) {
          relationships.push({
            label: `${displayName ?? String(id)} uses ${stableId}`,
            navigationKind: 'entityDefinition',
            targetId: stableId,
          });
        } else if (asset !== null) {
          relationships.push({
            label: `${displayName ?? String(id)} uses ${asset}`,
            navigationKind: 'asset',
            targetId: asset,
          });
        }
      }
    }
  }
  if (file.sourceKind === 'assetCatalog') {
    for (const entry of recordArrayField(parsed, 'entries')) {
      const id = stringField(entry, 'id');
      if (id === null) continue;
      navigationKeys.push(projectContentNavigationKey('asset', id));
      if (entry['material'] !== null && entry['material'] !== undefined) {
        navigationKeys.push(projectContentNavigationKey('material', id));
      }
      details.push(`declared asset · ${id}`);
    }
  }
  if (file.sourceKind === 'gameplayConfiguration') {
    for (const configuration of recordArrayField(parsed, 'configurations')) {
      const id = stringField(configuration, 'configurationId');
      if (id !== null) navigationKeys.push(projectContentNavigationKey('configuration', id));
    }
    for (const binding of recordArrayField(parsed, 'bindings')) {
      const id = stringField(binding, 'bindingId');
      if (id !== null) {
        navigationKeys.push(projectContentNavigationKey('binding', id));
        relationships.push({
          label: `binding ${id}`,
          navigationKind: 'binding',
          targetId: id,
        });
      }
    }
    for (const trigger of recordArrayField(parsed, 'triggers')) {
      const instanceId = stringField(trigger, 'sceneInstanceId');
      if (instanceId !== null) {
        navigationKeys.push(projectContentNavigationKey('sceneInstance', instanceId));
        relationships.push({
          label: `trigger targets ${instanceId}`,
          navigationKind: 'sceneInstance',
          targetId: instanceId,
        });
      }
    }
  }
  return { details, relationships, navigationKeys };
}

function editableFieldsForDocument(
  documentId: string,
  codec: ProjectContentCodecResult,
  projectScenes: readonly FlatSceneDocument[],
): readonly StudioProjectContentEditableFieldReadModel[] {
  const document = codec.documents.find(candidate => candidate.documentId === documentId);
  if (document === undefined) {
    return [];
  }
  if (document.kind === 'assetCatalog') {
    return typedMetadataFields(documentId, codec, 'asha.material.v1', metadata => (
      readMaterialField(document, metadata.path)
    ), 'material');
  }
  if (document.kind === 'presentationCatalog') {
    return typedMetadataFields(documentId, codec, 'asha.presentation-cue.v1', metadata => (
      readPresentationCueField(document, metadata.path)
    ), 'presentationCue');
  }
  if (document.kind !== 'gameplayConfiguration') return [];
  const options = referenceOptions(codec.documents, projectScenes);
  return document.document.configurations.flatMap(configuration => {
    const schema = codec.providerSchemas.find(candidate =>
      candidate.schemaId === configuration.schemaId
      && candidate.moduleId === configuration.module.moduleId,
    ) ?? codec.providerSchemas.find(candidate => candidate.schemaId === configuration.schemaId);
    if (schema === undefined) {
      return [];
    }
    return schema.fields.flatMap(field => {
      const current = configuration.values.find(candidate => candidate.fieldId === field.fieldId)?.value;
      const metadata = metadataForField(codec.fieldMetadata, documentId, configuration.configurationId, schema.schemaId, field);
      if (metadata?.editable === false || current === undefined) {
        return [];
      }
      return [{
        authoringKind: 'gameplayConfiguration' as const,
        documentId,
        configurationId: configuration.configurationId,
        schemaId: schema.schemaId,
        fieldId: field.fieldId,
        path: metadata?.path ?? `document.configurations.${configuration.configurationId}.${field.fieldId}`,
        label: metadata?.label ?? field.label,
        valueKind: field.valueKind,
        value: projectConfigurationValue(current),
        required: field.required,
        referenceKind: field.referenceKind,
        integerMin: field.integerMin,
        integerMax: field.integerMax,
        numberMin: field.numberMin,
        numberMax: field.numberMax,
        options: field.referenceKind === null ? [] : options[field.referenceKind],
      }];
    });
  });
}

function typedMetadataFields(
  documentId: string,
  codec: ProjectContentCodecResult,
  schemaId: string,
  readValue: (metadata: ProjectContentFieldMetadata) => boolean | number | string | null,
  authoringKind: 'material' | 'presentationCue',
): readonly StudioProjectContentEditableFieldReadModel[] {
  return codec.fieldMetadata.flatMap(metadata => {
    if (
      metadata.documentId !== documentId
      || metadata.schemaId !== schemaId
      || metadata.configurationId === null
      || !metadata.editable
    ) {
      return [];
    }
    const value = readValue(metadata);
    if (value === null) return [];
    return [{
      authoringKind,
      documentId,
      configurationId: metadata.configurationId,
      schemaId,
      fieldId: metadata.path.split('.').at(-1) ?? metadata.path,
      path: metadata.path,
      label: metadata.label,
      valueKind: metadata.valueKind,
      value,
      required: metadata.required,
      referenceKind: metadata.referenceKind,
      integerMin: metadata.integerMin,
      integerMax: metadata.integerMax,
      numberMin: metadata.numberMin,
      numberMax: metadata.numberMax,
      options: [],
    }];
  });
}

function readMaterialField(
  document: Extract<ProjectContentDocument, { readonly kind: 'assetCatalog' }>,
  path: string,
): number | null {
  const match = /^catalog\.entries\[(\d+)\]\.material\.style\.(.+)$/u.exec(path);
  if (match === null) return null;
  const entry = document.catalog.entries[Number(match[1])];
  const style = entry?.material?.style;
  if (style === undefined) return null;
  switch (match[2]) {
    case 'color.r': return style.color.r;
    case 'color.g': return style.color.g;
    case 'color.b': return style.color.b;
    case 'color.a': return style.color.a;
    case 'roughness': return style.roughness;
    case 'emissionColor.r': return style.emissionColor.r;
    case 'emissionColor.g': return style.emissionColor.g;
    case 'emissionColor.b': return style.emissionColor.b;
    case 'emissionColor.a': return style.emissionColor.a;
    case 'emissive': return style.emissive;
    default: return null;
  }
}

function updateMaterialField(
  documents: readonly ProjectContentDocument[],
  documentId: string,
  path: string,
  value: number,
): ProjectContentDocument | null {
  const target = documents.find(document => (
    document.kind === 'assetCatalog' && document.documentId === documentId
  ));
  if (target?.kind !== 'assetCatalog') return null;
  const match = /^catalog\.entries\[(\d+)\]\.material\.style\.(.+)$/u.exec(path);
  if (match === null) return null;
  const entryIndex = Number(match[1]);
  const entry = target.catalog.entries[entryIndex];
  const material = entry?.material;
  if (material === null || material === undefined) return null;
  const style = updatedMaterialStyle(material.style, match[2] ?? '', value);
  if (style === null) return null;
  return {
    ...target,
    catalog: {
      ...target.catalog,
      entries: target.catalog.entries.map((candidate, index) => index === entryIndex
        ? { ...candidate, material: { ...material, style } }
        : candidate),
    },
  };
}

function updatedMaterialStyle(
  style: NonNullable<Extract<ProjectContentDocument, { readonly kind: 'assetCatalog' }>['catalog']['entries'][number]['material']>['style'],
  field: string,
  value: number,
): typeof style | null {
  switch (field) {
    case 'color.r': return { ...style, color: { ...style.color, r: value } };
    case 'color.g': return { ...style, color: { ...style.color, g: value } };
    case 'color.b': return { ...style, color: { ...style.color, b: value } };
    case 'color.a': return { ...style, color: { ...style.color, a: value } };
    case 'roughness': return { ...style, roughness: value };
    case 'emissionColor.r': return { ...style, emissionColor: { ...style.emissionColor, r: value } };
    case 'emissionColor.g': return { ...style, emissionColor: { ...style.emissionColor, g: value } };
    case 'emissionColor.b': return { ...style, emissionColor: { ...style.emissionColor, b: value } };
    case 'emissionColor.a': return { ...style, emissionColor: { ...style.emissionColor, a: value } };
    case 'emissive': return { ...style, emissive: value };
    default: return null;
  }
}

function readPresentationCueField(
  document: Extract<ProjectContentDocument, { readonly kind: 'presentationCatalog' }>,
  path: string,
): number | null {
  const match = /^catalog\.cues\[(\d+)\]\.(atSeconds|gain|scale)$/u.exec(path);
  if (match === null) return null;
  const cue = document.catalog.cues[Number(match[1])];
  const field = match[2];
  if (cue?.kind === 'animation' && field === 'atSeconds') return cue.atSeconds;
  if (cue?.kind === 'audio' && field === 'gain') return cue.gain;
  if (cue?.kind === 'particle' && field === 'scale') return cue.scale;
  return null;
}

function updatePresentationCueField(
  documents: readonly ProjectContentDocument[],
  documentId: string,
  path: string,
  value: number,
): ProjectContentDocument | null {
  const target = documents.find(document => (
    document.kind === 'presentationCatalog' && document.documentId === documentId
  ));
  if (target?.kind !== 'presentationCatalog') return null;
  const match = /^catalog\.cues\[(\d+)\]\.(atSeconds|gain|scale)$/u.exec(path);
  if (match === null) return null;
  const cueIndex = Number(match[1]);
  const field = match[2];
  const cue = target.catalog.cues[cueIndex];
  if (cue === undefined) return null;
  const updated = cue.kind === 'animation' && field === 'atSeconds'
    ? { ...cue, atSeconds: value }
    : cue.kind === 'audio' && field === 'gain'
      ? { ...cue, gain: value }
      : cue.kind === 'particle' && field === 'scale'
        ? { ...cue, scale: value }
        : null;
  if (updated === null) return null;
  return {
    ...target,
    catalog: {
      ...target.catalog,
      cues: target.catalog.cues.map((candidate, index) => index === cueIndex ? updated : candidate),
    },
  };
}

function metadataForField(
  metadata: readonly ProjectContentFieldMetadata[],
  documentId: string,
  configurationId: string,
  schemaId: string,
  field: ProjectConfigurationField,
): ProjectContentFieldMetadata | null {
  return metadata.find(candidate =>
    candidate.documentId === documentId
    && candidate.configurationId === configurationId
    && candidate.schemaId === schemaId
    && (candidate.path.endsWith(`.${field.fieldId}`) || candidate.label === field.label),
  ) ?? null;
}

function referenceOptions(
  documents: readonly ProjectContentDocument[],
  projectScenes: readonly FlatSceneDocument[],
): Readonly<Record<ProjectContentReferenceKind, readonly StudioProjectContentReferenceOptionReadModel[]>> {
  const entityDefinitions = documents.flatMap(document =>
    document.kind === 'entityDefinition'
      ? [{ value: document.definition.stableId, label: document.definition.displayName }]
      : [],
  );
  const prefabs = documents.flatMap(document =>
    document.kind === 'prefabRegistry'
      ? document.registry.definitions.map(definition => ({
          value: String(definition.id),
          label: definition.displayName,
        }))
      : [],
  );
  const prefabParts = documents.flatMap(document =>
    document.kind === 'prefabRegistry'
      ? document.registry.definitions.flatMap(definition =>
          definition.partRoles.map(role => ({
            value: formatProjectContentPrefabPartReference(definition.id, role.role),
            label: `${definition.displayName} · ${role.role}`,
          })),
        )
      : [],
  );
  const assets = documents.flatMap(document => {
    if (document.kind === 'assetCatalog') {
      return document.catalog.entries.map(entry => ({ value: entry.id, label: entry.label ?? entry.id }));
    }
    if (document.kind === 'presentationCatalog') {
      return document.catalog.resources.map(resource => ({ value: resource.assetId, label: resource.resourceId }));
    }
    return [];
  });
  const presentationResources = documents.flatMap(document =>
    document.kind === 'presentationCatalog'
      ? document.catalog.resources.map(resource => ({ value: resource.resourceId, label: resource.resourceId }))
      : [],
  );
  const sceneInstances = [...new Map(projectScenes.flatMap(scene => scene.nodes.flatMap(node =>
    node.kind.kind === 'entityInstance'
      ? [[node.kind.instance.instanceId, {
          value: node.kind.instance.instanceId,
          label: node.label ?? node.kind.instance.instanceId,
        }] as const]
      : [],
  ))).values()];
  const instantiatedDefinitionIds = new Set(projectScenes.flatMap(scene => scene.nodes.flatMap(node =>
    node.kind.kind === 'entityInstance' && node.kind.instance.reference.kind === 'entityDefinition'
      ? [node.kind.instance.reference.stableId]
      : [],
  )));
  return {
    asset: assets,
    entityDefinition: entityDefinitions,
    instantiatedEntityDefinition: entityDefinitions.filter(option => (
      instantiatedDefinitionIds.has(option.value)
    )),
    sceneInstance: sceneInstances,
    prefab: prefabs,
    prefabPart: prefabParts,
    presentationResource: presentationResources,
  };
}

function projectConfigurationValue(value: ProjectConfigurationValue): boolean | number | string {
  return value.kind === 'reference' ? value.targetId : value.value;
}

function diagnosticsForFile(
  file: StudioProjectContentLoadedFile,
  diagnostics: readonly ProjectContentDiagnostic[],
): readonly ProjectContentDiagnostic[] {
  return diagnostics.filter(diagnostic =>
    diagnostic.documentId === file.documentId || diagnostic.documentId === null,
  );
}

function categoryForDocumentKind(
  kind: ProjectContentDocumentKind | null,
): StudioProjectContentCategoryId {
  switch (kind) {
    case 'entityDefinition': return 'entity-definitions';
    case 'prefabRegistry': return 'prefabs';
    case 'assetCatalog':
    case 'presentationCatalog': return 'assets-and-materials';
    case 'gameplayConfiguration': return 'gameplay-configuration';
    case null: return 'assets-and-materials';
  }
}

function legacyCategoryFor(parsed: Record<string, unknown>): StudioProjectContentCategoryId | null {
  if (Array.isArray(parsed['markers'])) return 'scenes-and-spawns';
  if (Array.isArray(parsed['materials'])) return 'assets-and-materials';
  if (typeof parsed['weaponId'] === 'string' || typeof parsed['defaultPresetId'] === 'string') {
    return 'gameplay-configuration';
  }
  if (typeof parsed['stableId'] === 'string') return 'entity-definitions';
  return null;
}

function legacyIdentity(parsed: Record<string, unknown>, fallback: string): string {
  return stringField(parsed, 'stableId')
    ?? stringField(parsed, 'catalogId')
    ?? stringField(parsed, 'weaponId')
    ?? fallback;
}

function sourceNavigationKeys(
  file: StudioProjectContentLoadedFile,
  extra: readonly string[],
): string[] {
  return [
    projectContentNavigationKey('source', file.path),
    projectContentNavigationKey('source', file.relativePath),
    ...extra,
  ];
}

function sameHostPath(left: string, right: string): boolean {
  return left.replaceAll('\\', '/') === right.replaceAll('\\', '/');
}

function parseRecord(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text) as unknown;
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function recordArrayField(value: Record<string, unknown>, field: string): readonly Record<string, unknown>[] {
  const candidates = value[field];
  return Array.isArray(candidates) ? candidates.filter(isRecord) : [];
}

function stringField(value: Record<string, unknown>, field: string): string | null {
  return typeof value[field] === 'string' ? value[field] : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
