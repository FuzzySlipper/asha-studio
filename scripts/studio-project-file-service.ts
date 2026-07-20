import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

export type StudioHostFileDiagnosticCode =
  | 'invalid_write_payload'
  | 'invalid_stage_payload'
  | 'invalid_stage_token'
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

export type StudioHostFileBytesRead =
  | StudioHostFileFailure
  | {
      readonly ok: true;
      readonly path: string;
      readonly bytes: Uint8Array;
    };

export type StudioHostFileStageRequest = StudioHostFileWriteRequest;

interface StudioHostFileStageReservation {
  readonly token: string;
  readonly absolutePath: string;
  readonly temporaryPath: string;
  readonly previousHash: string | null;
  readonly sha256: string;
  readonly phase: 'staged' | 'promoted';
  readonly backupPath: string | null;
}

const hostFileWriteQueues = new Map<string, Promise<void>>();
const hostFileStageReservations = new Map<string, StudioHostFileStageReservation>();

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

export async function readStudioHostFileBytes(
  startDirectory: string,
  path: string,
): Promise<StudioHostFileBytesRead> {
  const resolved = resolveStudioHostFilePath(startDirectory, path);
  if (!resolved.ok) {
    return resolved;
  }
  try {
    const bytes = await readFile(resolved.absolutePath);
    return {
      ok: true,
      path: resolved.absolutePath,
      bytes: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    };
  } catch (error) {
    return hostFileFailure(error, 'Reading file bytes', resolved.absolutePath);
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

function parseHostFileWriteRequest(
  request: unknown,
  diagnostic: 'invalid_write_payload' | 'invalid_stage_payload',
): StudioHostFileWriteRequest | StudioHostFileFailure {
  if (
    request === null
    || typeof request !== 'object'
    || Array.isArray(request)
    || typeof (request as Record<string, unknown>)['path'] !== 'string'
    || typeof (request as Record<string, unknown>)['text'] !== 'string'
  ) {
    return {
      ok: false,
      diagnostic,
      message: 'Host file writes require string path and text fields.',
    };
  }
  const parsed = request as StudioHostFileWriteRequest;
  if (
    'expectedHash' in parsed
    && typeof parsed.expectedHash !== 'string'
    && parsed.expectedHash !== null
  ) {
    return {
      ok: false,
      diagnostic,
      message: 'expectedHash must be a string or null when supplied.',
    };
  }
  return parsed;
}

async function currentHostFileHash(path: string): Promise<string | null | StudioHostFileFailure> {
  try {
    return studioHostFileSha256(await readFile(path, 'utf8'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    return hostFileFailure(error, 'Reading existing file', path);
  }
}

function isStudioHostFileFailure(
  value: string | null | StudioHostFileFailure,
): value is StudioHostFileFailure {
  return value !== null && typeof value === 'object' && value.ok === false;
}

export async function stageStudioHostFile(
  startDirectory: string,
  request: unknown,
): Promise<unknown> {
  const parsed = parseHostFileWriteRequest(request, 'invalid_stage_payload');
  if ('ok' in parsed && !parsed.ok) {
    return parsed;
  }
  const resolved = resolveStudioHostFilePath(startDirectory, parsed.path);
  if (!resolved.ok) {
    return resolved;
  }
  return withHostFileWriteLock(resolved.absolutePath, async () => {
    const previousHash = await currentHostFileHash(resolved.absolutePath);
    if (isStudioHostFileFailure(previousHash)) {
      return previousHash;
    }
    if (parsed.expectedHash !== undefined && previousHash !== parsed.expectedHash) {
      return {
        ok: false,
        diagnostic: 'stale_file_hash',
        message: `The host file changed since it was opened: ${resolved.absolutePath}`,
        previousHash,
      } satisfies StudioHostFileFailure;
    }

    const token = randomUUID();
    const targetParent = dirname(resolved.absolutePath);
    const temporaryPath = join(
      targetParent,
      `.${basename(resolved.absolutePath)}.${process.pid}.${token}.stage`,
    );
    try {
      await mkdir(targetParent, { recursive: true });
      await writeFile(temporaryPath, parsed.text, { encoding: 'utf8', flag: 'wx' });
      const sha256 = studioHostFileSha256(parsed.text);
      hostFileStageReservations.set(token, {
        token,
        absolutePath: resolved.absolutePath,
        temporaryPath,
        previousHash,
        sha256,
        phase: 'staged',
        backupPath: null,
      });
      return {
        ok: true,
        startDirectory: resolve(startDirectory),
        token,
        path: resolved.absolutePath,
        previousHash,
        sha256,
      };
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      return hostFileFailure(error, 'Staging file', resolved.absolutePath);
    }
  });
}

function parseStageToken(request: unknown): string | StudioHostFileFailure {
  if (
    request === null
    || typeof request !== 'object'
    || Array.isArray(request)
    || typeof (request as Record<string, unknown>)['token'] !== 'string'
    || (request as Record<string, string>)['token'].length === 0
  ) {
    return {
      ok: false,
      diagnostic: 'invalid_stage_token',
      message: 'A non-empty host file stage token is required.',
    };
  }
  return (request as Record<string, string>)['token'];
}

export async function promoteStudioHostFileStage(request: unknown): Promise<unknown> {
  const token = parseStageToken(request);
  if (typeof token !== 'string') {
    return token;
  }
  const reservation = hostFileStageReservations.get(token);
  if (reservation === undefined) {
    return {
      ok: false,
      diagnostic: 'invalid_stage_token',
      message: 'The host file stage token is unknown or already consumed.',
    } satisfies StudioHostFileFailure;
  }
  return withHostFileWriteLock(reservation.absolutePath, async () => {
    const currentReservation = hostFileStageReservations.get(token);
    if (currentReservation !== reservation) {
      return {
        ok: false,
        diagnostic: 'invalid_stage_token',
        message: 'The host file stage token is unknown or already consumed.',
      } satisfies StudioHostFileFailure;
    }
    if (reservation.phase !== 'staged') {
      return {
        ok: false,
        diagnostic: 'invalid_stage_token',
        message: 'The host file stage token was already promoted.',
      } satisfies StudioHostFileFailure;
    }
    const currentHash = await currentHostFileHash(reservation.absolutePath);
    if (isStudioHostFileFailure(currentHash)) {
      return currentHash;
    }
    if (currentHash !== reservation.previousHash) {
      return {
        ok: false,
        diagnostic: 'stale_file_hash',
        message: `The host file changed after staging: ${reservation.absolutePath}`,
        previousHash: currentHash,
      } satisfies StudioHostFileFailure;
    }
    const backupPath = reservation.previousHash === null
      ? null
      : `${reservation.temporaryPath}.previous`;
    try {
      if (backupPath !== null) {
        await copyFile(reservation.absolutePath, backupPath);
      }
      await rename(reservation.temporaryPath, reservation.absolutePath);
      hostFileStageReservations.set(token, {
        ...reservation,
        phase: 'promoted',
        backupPath,
      });
      return {
        ok: true,
        path: reservation.absolutePath,
        previousHash: reservation.previousHash,
        sha256: reservation.sha256,
      };
    } catch (error) {
      if (backupPath !== null) {
        await rm(backupPath, { force: true }).catch(() => undefined);
      }
      return hostFileFailure(error, 'Promoting staged file', reservation.absolutePath);
    }
  });
}

export async function finalizeStudioHostFileStage(request: unknown): Promise<unknown> {
  const token = parseStageToken(request);
  if (typeof token !== 'string') {
    return token;
  }
  const reservation = hostFileStageReservations.get(token);
  if (reservation === undefined || reservation.phase !== 'promoted') {
    return {
      ok: false,
      diagnostic: 'invalid_stage_token',
      message: 'The host file stage token is not awaiting finalization.',
    } satisfies StudioHostFileFailure;
  }
  return withHostFileWriteLock(reservation.absolutePath, async () => {
    const currentReservation = hostFileStageReservations.get(token);
    if (currentReservation !== reservation) {
      return {
        ok: false,
        diagnostic: 'invalid_stage_token',
        message: 'The host file stage token is unknown or already consumed.',
      } satisfies StudioHostFileFailure;
    }
    if (reservation.backupPath !== null) {
      try {
        await rm(reservation.backupPath, { force: true });
      } catch (error) {
        return hostFileFailure(error, 'Finalizing staged file', reservation.absolutePath);
      }
    }
    hostFileStageReservations.delete(token);
    return {
      ok: true,
      finalized: true,
      path: reservation.absolutePath,
      sha256: reservation.sha256,
    };
  });
}

export async function discardStudioHostFileStage(request: unknown): Promise<unknown> {
  const token = parseStageToken(request);
  if (typeof token !== 'string') {
    return token;
  }
  const reservation = hostFileStageReservations.get(token);
  if (reservation === undefined) {
    return {
      ok: true,
      discarded: false,
    };
  }
  return withHostFileWriteLock(reservation.absolutePath, async () => {
    const currentReservation = hostFileStageReservations.get(token);
    if (currentReservation !== reservation) {
      return {
        ok: true,
        discarded: false,
      };
    }
    try {
      if (reservation.phase === 'promoted') {
        const currentHash = await currentHostFileHash(reservation.absolutePath);
        if (isStudioHostFileFailure(currentHash)) {
          return currentHash;
        }
        if (currentHash !== reservation.sha256) {
          return {
            ok: false,
            diagnostic: 'stale_file_hash',
            message: `The promoted host file changed before rollback: ${reservation.absolutePath}`,
            previousHash: currentHash,
          } satisfies StudioHostFileFailure;
        }
        if (reservation.backupPath === null) {
          await rm(reservation.absolutePath, { force: true });
        } else {
          await rename(reservation.backupPath, reservation.absolutePath);
        }
      } else {
        await rm(reservation.temporaryPath, { force: true });
      }
      hostFileStageReservations.delete(token);
      return {
        ok: true,
        discarded: true,
        rolledBack: reservation.phase === 'promoted',
      };
    } catch (error) {
      return hostFileFailure(error, 'Discarding staged file', reservation.absolutePath);
    }
  });
}

// Transitional aliases while #5803 removes the old project-file naming from callers.
export const studioProjectFileSha256 = studioHostFileSha256;
export const resolveStudioProjectFilePath = resolveStudioHostFilePath;
export const listStudioProjectDir = listStudioHostDir;
export const readStudioProjectFile = readStudioHostFile;
export const writeStudioProjectFile = writeStudioHostFile;
