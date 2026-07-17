import { createHash } from 'node:crypto';
import { access, mkdir, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  readStudioHostFile,
  studioHostFileSha256,
  writeStudioHostFile,
} from './studio-project-file-service';

export interface StudioUserSettingsLocation {
  readonly canonicalProjectRoot: string;
  readonly projectKey: string;
  readonly configDirectory: string;
  readonly path: string;
}

export function defaultStudioUserConfigDirectory(): string {
  const xdgConfigHome = process.env['XDG_CONFIG_HOME']?.trim();
  return resolve(
    xdgConfigHome && xdgConfigHome.length > 0
      ? xdgConfigHome
      : join(homedir(), '.config'),
    'asha-studio',
    'projects',
  );
}

export async function resolveStudioUserSettingsLocation(options: {
  readonly projectRoot: string;
  readonly configDirectory?: string;
}): Promise<StudioUserSettingsLocation> {
  const requestedRoot = options.projectRoot.trim();
  if (requestedRoot.length === 0 || requestedRoot.includes('\0')) {
    throw new Error('A non-empty project root is required for host user settings.');
  }
  const absoluteRoot = resolve(requestedRoot);
  let canonicalProjectRoot = absoluteRoot;
  try {
    canonicalProjectRoot = await realpath(absoluteRoot);
  } catch {
    // A not-yet-created project still receives a stable key from its normalized host path.
  }
  const digest = createHash('sha256').update(canonicalProjectRoot).digest('hex');
  const projectKey = `asha-studio-project:${digest}`;
  const configDirectory = resolve(options.configDirectory ?? defaultStudioUserConfigDirectory());
  return {
    canonicalProjectRoot,
    projectKey,
    configDirectory,
    path: join(configDirectory, `${digest}.json`),
  };
}

export async function readStudioUserSettings(options: {
  readonly projectRoot: string;
  readonly configDirectory?: string;
}): Promise<unknown> {
  const location = await resolveStudioUserSettingsLocation(options);
  try {
    await access(location.path);
  } catch {
    return {
      ok: true,
      exists: false,
      ...location,
      text: null,
      sha256: null,
    };
  }
  const readback = await readStudioHostFile(location.configDirectory, location.path);
  return {
    ...readback as Record<string, unknown>,
    exists: (readback as { readonly ok?: boolean }).ok === true,
    canonicalProjectRoot: location.canonicalProjectRoot,
    projectKey: location.projectKey,
    configDirectory: location.configDirectory,
  };
}

export async function writeStudioUserSettings(options: {
  readonly projectRoot: string;
  readonly text: string;
  readonly expectedHash?: string | null;
  readonly configDirectory?: string;
}): Promise<unknown> {
  const location = await resolveStudioUserSettingsLocation(options);
  let parsed: unknown;
  try {
    parsed = JSON.parse(options.text);
  } catch {
    return {
      ok: false,
      diagnostic: 'invalid_user_settings_json',
      message: 'Host user settings must be valid JSON.',
    };
  }
  if (
    parsed === null
    || typeof parsed !== 'object'
    || Array.isArray(parsed)
    || (parsed as Record<string, unknown>)['projectKey'] !== location.projectKey
  ) {
    return {
      ok: false,
      diagnostic: 'project_key_mismatch',
      message: 'Host user settings must be bound to the canonical project root key.',
    };
  }
  await mkdir(location.configDirectory, { recursive: true });
  const writeResult = await writeStudioHostFile(location.configDirectory, {
    path: location.path,
    text: options.text,
    expectedHash: options.expectedHash,
  });
  return {
    ...writeResult as Record<string, unknown>,
    canonicalProjectRoot: location.canonicalProjectRoot,
    projectKey: location.projectKey,
    configDirectory: location.configDirectory,
    inputSha256: studioHostFileSha256(options.text),
  };
}
