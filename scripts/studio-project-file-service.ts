import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

export type StudioHostFileDiagnosticCode =
  | 'invalid_write_payload'
  | 'invalid_path'
  | 'host_file_not_found'
  | 'permission_denied'
  | 'host_io_error'
  | 'stale_file_hash';

export interface StudioHostFileFailure {
  readonly ok: false;
  readonly diagnostic: StudioHostFileDiagnosticCode;
  readonly message: string;
  readonly previousHash?: string | null;
}

export interface StudioHostFileResolution {
  readonly ok: true;
  readonly absolutePath: string;
}

export interface StudioHostFileWriteRequest {
  readonly path: string;
  readonly text: string;
  readonly expectedHash?: string | null;
}

const hostFileWriteQueues = new Map<string, Promise<void>>();

async function withHostFileWriteLock<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const previous = hostFileWriteQueues.get(path) ?? Promise.resolve();
  let release = (): void => undefined;
  const current = new Promise<void>(resolveCurrent => {
    release = resolveCurrent;
  });
  const queued = previous.then(() => current);
  hostFileWriteQueues.set(path, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (hostFileWriteQueues.get(path) === queued) {
      hostFileWriteQueues.delete(path);
    }
  }
}

export function studioHostFileSha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function hostFileFailure(error: unknown, operation: string, path: string): StudioHostFileFailure {
  const code = error instanceof Error && 'code' in error
    ? (error as NodeJS.ErrnoException).code
    : undefined;
  if (code === 'ENOENT') {
    return {
      ok: false,
      diagnostic: 'host_file_not_found',
      message: `${operation} failed because the host path does not exist: ${path}`,
    };
  }
  if (code === 'EACCES' || code === 'EPERM') {
    return {
      ok: false,
      diagnostic: 'permission_denied',
      message: `${operation} was denied by the host operating system: ${path}`,
    };
  }
  return {
    ok: false,
    diagnostic: 'host_io_error',
    message: `${operation} failed for ${path}: ${error instanceof Error ? error.message : String(error)}`,
  };
}

export function resolveStudioHostFilePath(
  startDirectory: string,
  path: string,
): StudioHostFileResolution | StudioHostFileFailure {
  const trimmedPath = path.trim();
  if (trimmedPath.length === 0 || trimmedPath.includes('\0')) {
    return {
      ok: false,
      diagnostic: 'invalid_path',
      message: 'A non-empty host filesystem path is required.',
    };
  }
  return {
    ok: true,
    absolutePath: isAbsolute(trimmedPath)
      ? resolve(trimmedPath)
      : resolve(startDirectory, trimmedPath),
  };
}

export async function listStudioHostDir(startDirectory: string, dir: string): Promise<unknown> {
  const resolved = resolveStudioHostFilePath(startDirectory, dir || startDirectory);
  if (!resolved.ok) {
    return resolved;
  }
  try {
    const entries = await readdir(resolved.absolutePath, { withFileTypes: true });
    const projected = await Promise.all(entries.map(async entry => {
      const absolutePath = join(resolved.absolutePath, entry.name);
      const fileStat = await stat(absolutePath);
      return {
        path: absolutePath,
        name: entry.name,
        kind: entry.isDirectory() ? 'directory' : 'file',
        size: entry.isDirectory() ? null : fileStat.size,
        mtimeMs: fileStat.mtimeMs,
      };
    }));
    return {
      ok: true,
      startDirectory: resolve(startDirectory),
      dir: resolved.absolutePath,
      entries: projected,
    };
  } catch (error) {
    return hostFileFailure(error, 'Listing directory', resolved.absolutePath);
  }
}

export async function readStudioHostFile(startDirectory: string, path: string): Promise<unknown> {
  const resolved = resolveStudioHostFilePath(startDirectory, path);
  if (!resolved.ok) {
    return resolved;
  }
  try {
    const text = await readFile(resolved.absolutePath, 'utf8');
    return {
      ok: true,
      startDirectory: resolve(startDirectory),
      path: resolved.absolutePath,
      text,
      sha256: studioHostFileSha256(text),
    };
  } catch (error) {
    return hostFileFailure(error, 'Reading file', resolved.absolutePath);
  }
}

export async function writeStudioHostFile(
  startDirectory: string,
  request: unknown,
): Promise<unknown> {
  if (
    request === null
    || typeof request !== 'object'
    || Array.isArray(request)
    || typeof (request as Record<string, unknown>)['path'] !== 'string'
    || typeof (request as Record<string, unknown>)['text'] !== 'string'
  ) {
    return {
      ok: false,
      diagnostic: 'invalid_write_payload',
      message: 'Host file writes require string path and text fields.',
    } satisfies StudioHostFileFailure;
  }
  const parsed = request as StudioHostFileWriteRequest;
  if (
    'expectedHash' in parsed
    && typeof parsed.expectedHash !== 'string'
    && parsed.expectedHash !== null
  ) {
    return {
      ok: false,
      diagnostic: 'invalid_write_payload',
      message: 'expectedHash must be a string or null when supplied.',
    } satisfies StudioHostFileFailure;
  }
  const resolved = resolveStudioHostFilePath(startDirectory, parsed.path);
  if (!resolved.ok) {
    return resolved;
  }
  return withHostFileWriteLock(resolved.absolutePath, async () => {
    let previousHash: string | null = null;
    try {
      previousHash = studioHostFileSha256(await readFile(resolved.absolutePath, 'utf8'));
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')) {
        return hostFileFailure(error, 'Reading existing file', resolved.absolutePath);
      }
    }
    if (parsed.expectedHash !== undefined && previousHash !== parsed.expectedHash) {
      return {
        ok: false,
        diagnostic: 'stale_file_hash',
        message: `The host file changed since it was opened: ${resolved.absolutePath}`,
        previousHash,
      } satisfies StudioHostFileFailure;
    }

    const targetParent = dirname(resolved.absolutePath);
    const temporaryPath = join(
      targetParent,
      `.${basename(resolved.absolutePath)}.${process.pid}.${randomUUID()}.tmp`,
    );
    try {
      await mkdir(targetParent, { recursive: true });
      await writeFile(temporaryPath, parsed.text, { encoding: 'utf8', flag: 'wx' });
      await rename(temporaryPath, resolved.absolutePath);
      const nextText = await readFile(resolved.absolutePath, 'utf8');
      return {
        ok: true,
        startDirectory: resolve(startDirectory),
        path: resolved.absolutePath,
        previousHash,
        sha256: studioHostFileSha256(nextText),
      };
    } catch (error) {
      return hostFileFailure(error, 'Writing file', resolved.absolutePath);
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  });
}

// Transitional aliases while #5803 removes the old project-file naming from callers.
export const studioProjectFileSha256 = studioHostFileSha256;
export const resolveStudioProjectFilePath = resolveStudioHostFilePath;
export const listStudioProjectDir = listStudioHostDir;
export const readStudioProjectFile = readStudioHostFile;
export const writeStudioProjectFile = writeStudioHostFile;
