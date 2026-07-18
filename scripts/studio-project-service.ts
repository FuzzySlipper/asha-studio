import { mkdir, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { parseAshaGameManifestToml } from '@asha/game-workspace';
import {
  ASHA_STUDIO_PROJECT_SETTINGS_PATH,
  buildDefaultStudioProjectSettings,
  serializeStudioProjectSettings,
} from '../libs/studio-domain/src/studio-settings';
import {
  readStudioHostFile,
  resolveStudioHostFilePath,
  studioHostFileSha256,
  writeStudioHostFile,
} from './studio-project-file-service';

const DEFAULT_MANIFEST_FILE_NAME = 'asha.game.toml';

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

export async function openStudioProject(
  startDirectory: string,
  request: unknown,
): Promise<unknown> {
  if (!isRecord(request) || typeof request['manifestPath'] !== 'string') {
    return projectFailure('invalid_project_open_payload', 'Open Project requires a manifestPath string.');
  }
  const manifestResolution = resolveStudioHostFilePath(startDirectory, request['manifestPath']);
  if (!manifestResolution.ok) return manifestResolution;
  const manifestReadback = await readStudioHostFile(startDirectory, manifestResolution.absolutePath);
  if (!isRecord(manifestReadback) || manifestReadback['ok'] !== true || typeof manifestReadback['text'] !== 'string') {
    return manifestReadback;
  }
  const parsedManifest = parseAshaGameManifestToml(manifestReadback['text']);
  if (!parsedManifest.ok) {
    return projectFailure(
      'invalid_project_manifest',
      parsedManifest.diagnostics.map(diagnostic => `${diagnostic.path}: ${diagnostic.message}`).join('\n'),
    );
  }
  const workspaceRoot = await canonicalPath(dirname(manifestResolution.absolutePath));
  const packagePath = join(workspaceRoot, 'package.json');
  let packageJson: Record<string, unknown> = {};
  try {
    const parsedPackage = JSON.parse(await readFile(packagePath, 'utf8')) as unknown;
    if (isRecord(parsedPackage)) packageJson = parsedPackage;
  } catch {
    return projectFailure('project_package_missing', `Open Project requires ${packagePath}.`);
  }
  const contentRoots = [
    ...parsedManifest.manifest.workspace.sceneRoots.map(path => ({ path, rootKind: 'scene' as const })),
    ...parsedManifest.manifest.workspace.prefabRoots.map(path => ({ path, rootKind: 'prefab' as const })),
    ...parsedManifest.manifest.workspace.assetRoots.map(path => ({ path, rootKind: 'asset' as const })),
    ...parsedManifest.manifest.workspace.catalogPackages.map(path => ({ path, rootKind: 'catalog' as const })),
    ...parsedManifest.manifest.workspace.policyPackages.map(path => ({ path, rootKind: 'policy' as const })),
  ];
  const relativeRoots = [
    ...contentRoots.map(root => root.path),
    ...parsedManifest.manifest.workspace.replayRoots,
  ];
  const existingRelativePaths: string[] = [];
  for (const candidate of relativeRoots) {
    try {
      await stat(resolve(workspaceRoot, candidate));
      existingRelativePaths.push(candidate);
    } catch {
      // The domain loader reports each missing required path with project context.
    }
  }
  const packageScripts = isRecord(packageJson['scripts'])
    ? Object.fromEntries(
        Object.entries(packageJson['scripts']).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    : {};
  const packageName = typeof packageJson['name'] === 'string' ? packageJson['name'].trim() : '';
  const projectContentFiles = await discoverStudioProjectContentFiles(workspaceRoot, contentRoots);
  return {
    ok: true,
    workspaceRoot,
    manifestPath: DEFAULT_MANIFEST_FILE_NAME,
    manifestAbsolutePath: manifestResolution.absolutePath,
    manifestText: manifestReadback['text'],
    manifestSha256: manifestReadback['sha256'],
    gameId: packageName.length > 0 ? packageName : basename(workspaceRoot),
    packageScripts,
    existingRelativePaths,
    projectContentFiles,
    projectSettingsPath: join(workspaceRoot, ASHA_STUDIO_PROJECT_SETTINGS_PATH),
  };
}

export async function discoverStudioProjectContentFiles(
  workspaceRoot: string,
  roots: readonly {
    readonly path: string;
    readonly rootKind: StudioProjectContentRootKind;
  }[],
): Promise<readonly StudioProjectContentFileDescriptor[]> {
  const discovered = new Map<string, StudioProjectContentFileDescriptor>();
  for (const root of roots) {
    const absoluteRoot = resolve(workspaceRoot, root.path);
    await walkProjectContentRoot(workspaceRoot, absoluteRoot, root.rootKind, discovered);
  }
  return [...discovered.values()].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

async function walkProjectContentRoot(
  workspaceRoot: string,
  directory: string,
  rootKind: StudioProjectContentRootKind,
  discovered: Map<string, StudioProjectContentFileDescriptor>,
): Promise<void> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkProjectContentRoot(workspaceRoot, path, rootKind, discovered);
      continue;
    }
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }
    const fileStat = await stat(path);
    const canonical = await canonicalPath(path);
    if (discovered.has(canonical)) {
      continue;
    }
    discovered.set(canonical, {
      path: canonical,
      relativePath: relative(workspaceRoot, canonical).split('\\').join('/'),
      rootKind,
      size: fileStat.size,
      mtimeMs: fileStat.mtimeMs,
    });
  }
}

export async function createStudioProject(
  startDirectory: string,
  request: unknown,
): Promise<unknown> {
  if (!isRecord(request) || typeof request['projectRoot'] !== 'string') {
    return projectFailure('invalid_project_create_payload', 'Create Project requires a projectRoot string.');
  }
  const rootResolution = resolveStudioHostFilePath(startDirectory, request['projectRoot']);
  if (!rootResolution.ok) return rootResolution;
  const projectRoot = rootResolution.absolutePath;
  const requestedGameId = typeof request['gameId'] === 'string' ? request['gameId'].trim() : '';
  const gameId = requestedGameId.length > 0 ? requestedGameId : basename(projectRoot);
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(gameId)) {
    return projectFailure('invalid_project_game_id', 'Project gameId must use letters, numbers, dots, underscores, or hyphens.');
  }
  const manifestPath = join(projectRoot, DEFAULT_MANIFEST_FILE_NAME);
  const packagePath = join(projectRoot, 'package.json');
  for (const path of [manifestPath, packagePath]) {
    try {
      await stat(path);
      return projectFailure('project_already_exists', `Create Project will not overwrite existing file ${path}.`);
    } catch {
      // Expected for a new project.
    }
  }
  const directories = [
    'scenes',
    'prefabs',
    'assets',
    'replays',
    'packages/game-catalogs',
    'packages/game-policy',
    '.asha',
  ];
  await mkdir(projectRoot, { recursive: true });
  await Promise.all(directories.map(directory => mkdir(join(projectRoot, directory), { recursive: true })));
  const manifestText = defaultProjectManifest();
  const packageText = `${JSON.stringify({
    name: gameId,
    private: true,
    scripts: {
      dev: 'echo "Configure the ASHA project runtime"',
      'build:publish': 'echo "Configure ASHA project publishing"',
      'verify:publish': 'echo "Configure ASHA project publish verification"',
    },
  }, null, 2)}\n`;
  const settingsText = serializeStudioProjectSettings(buildDefaultStudioProjectSettings({
    gameId,
    manifestPath: DEFAULT_MANIFEST_FILE_NAME,
  }));
  for (const [path, text] of [
    [manifestPath, manifestText],
    [packagePath, packageText],
    [join(projectRoot, ASHA_STUDIO_PROJECT_SETTINGS_PATH), settingsText],
  ] as const) {
    const result = await writeStudioHostFile(startDirectory, { path, text, expectedHash: null });
    if (!isRecord(result) || result['ok'] !== true) return result;
  }
  return {
    ok: true,
    projectRoot: await canonicalPath(projectRoot),
    manifestPath,
    manifestSha256: studioHostFileSha256(manifestText),
  };
}

function defaultProjectManifest(): string {
  return `[asha]
engine_version = "0.1.0"
contracts_version = "0.1.0"
runtime_bridge_version = "0.1.0"
devtools_protocol_version = "devtools-protocol.v0"
publish_artifact_format_version = "publish-artifact.v0"
engine_source = "../asha-engine"

[workspace]
scene_roots = ["scenes"]
prefab_roots = ["prefabs"]
asset_roots = ["assets"]
replay_roots = ["replays"]
catalog_packages = ["packages/game-catalogs"]
policy_packages = ["packages/game-policy"]

[runtime]
dev_command = "npm run dev"
devtools_endpoint = "ws://127.0.0.1:7391"
wasm_or_native_entry = "dist/runtime/index.js"
backend_mode = "reference"
backend_profile = "reference"
backend_proof_refs = []

[studio]
workspace_mode = true
attach_enabled = true
allowed_source_writes = ["scenes", "prefabs", "assets", "packages/game-catalogs"]

[publish]
command = "npm run build:publish"
artifact_dir = "dist"
verify_command = "npm run verify:publish"

[dev_resource_profile]
local_roots = ["assets", "packages/game-catalogs"]
cache_dir = "dist/dev-cache"
resolution_policy = "prefer-source"

[publish_resource_profile]
output_dir = "dist/resources"
archive_dir = "dist/archive"
resolution_policy = "locked"
`;
}

async function canonicalPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch {
    return resolve(path);
  }
}

function projectFailure(diagnostic: string, message: string): Record<string, unknown> {
  return { ok: false, diagnostic, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
