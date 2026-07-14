import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

export type StudioProjectFileDiagnosticCode =
  | 'invalid_write_payload'
  | 'path_outside_project_root'
  | 'project_file_not_found'
  | 'stale_file_hash';

export interface StudioProjectFileFailure {
  readonly ok: false;
  readonly diagnostic: StudioProjectFileDiagnosticCode;
  readonly previousHash?: string | null;
}

export interface StudioProjectFileResolution {
  readonly ok: true;
  readonly absolutePath: string;
  readonly relativePath: string;
}

export interface StudioProjectFileWriteRequest {
  readonly path: string;
  readonly text: string;
  readonly expectedHash?: string | null;
}

const projectFileWriteQueues = new Map<string, Promise<void>>();

async function withProjectFileWriteLock<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const previous = projectFileWriteQueues.get(path) ?? Promise.resolve();
  let release = (): void => undefined;
  const current = new Promise<void>(resolveCurrent => {
    release = resolveCurrent;
  });
  const queued = previous.then(() => current);
  projectFileWriteQueues.set(path, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (projectFileWriteQueues.get(path) === queued) {
      projectFileWriteQueues.delete(path);
    }
  }
}

export function studioProjectFileSha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

export function normalizeStudioProjectFilePath(path: string): string | null {
  const withForwardSlashes = path.replaceAll('\\', '/');
  if (withForwardSlashes.startsWith('/') || /^[a-zA-Z]:\//.test(withForwardSlashes)) {
    return null;
  }
  const segments = withForwardSlashes.split('/').filter(segment => segment.length > 0);
  if (segments.some(segment => segment === '.' || segment === '..')) {
    return null;
  }
  return segments.join('/');
}

export function resolveStudioProjectFilePath(
  projectRoot: string,
  path: string,
): StudioProjectFileResolution | StudioProjectFileFailure {
  const normalizedRoot = resolve(projectRoot);
  const relativePath = normalizeStudioProjectFilePath(path);
  if (relativePath === null) {
    return { ok: false, diagnostic: 'path_outside_project_root' };
  }
  const absolutePath = resolve(normalizedRoot, relativePath);
  const rootWithSep = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`;
  if (absolutePath !== normalizedRoot && !absolutePath.startsWith(rootWithSep)) {
    return { ok: false, diagnostic: 'path_outside_project_root' };
  }
  return {
    ok: true,
    absolutePath,
    relativePath: relative(normalizedRoot, absolutePath).replaceAll('\\', '/'),
  };
}

function isPathInsideRoot(root: string, path: string): boolean {
  const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`;
  return path === root || path.startsWith(rootWithSep);
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function validateNearestExistingWriteAncestor(
  projectRoot: string,
  targetParent: string,
): Promise<
  | { readonly ok: true; readonly canonicalRoot: string }
  | StudioProjectFileFailure
> {
  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(resolve(projectRoot));
  } catch {
    return { ok: false, diagnostic: 'project_file_not_found' };
  }

  let candidate = targetParent;
  while (true) {
    try {
      const canonicalCandidate = await realpath(candidate);
      if (!isPathInsideRoot(canonicalRoot, canonicalCandidate)) {
        return { ok: false, diagnostic: 'path_outside_project_root' };
      }
      return { ok: true, canonicalRoot };
    } catch (error) {
      if (!isMissingPathError(error)) {
        return { ok: false, diagnostic: 'project_file_not_found' };
      }
      const parent = dirname(candidate);
      if (parent === candidate) {
        return { ok: false, diagnostic: 'path_outside_project_root' };
      }
      candidate = parent;
    }
  }
}

async function resolveExistingStudioProjectFilePath(
  projectRoot: string,
  path: string,
): Promise<StudioProjectFileResolution | StudioProjectFileFailure> {
  const resolved = resolveStudioProjectFilePath(projectRoot, path);
  if (!resolved.ok) {
    return resolved;
  }
  let canonicalRoot: string;
  let canonicalTarget: string;
  try {
    canonicalRoot = await realpath(resolve(projectRoot));
    canonicalTarget = await realpath(resolved.absolutePath);
  } catch {
    return { ok: false, diagnostic: 'project_file_not_found' };
  }
  if (!isPathInsideRoot(canonicalRoot, canonicalTarget)) {
    return { ok: false, diagnostic: 'path_outside_project_root' };
  }
  return { ...resolved, absolutePath: canonicalTarget };
}

export async function listStudioProjectDir(projectRoot: string, dir: string): Promise<unknown> {
  const resolved = await resolveExistingStudioProjectFilePath(projectRoot, dir);
  if (!resolved.ok) {
    return resolved;
  }
  const entries = await readdir(resolved.absolutePath, { withFileTypes: true });
  const projected = await Promise.all(entries.map(async entry => {
    const absolutePath = join(resolved.absolutePath, entry.name);
    const relativePath = relative(resolve(projectRoot), absolutePath).replaceAll('\\', '/');
    const fileStat = await stat(absolutePath);
    return {
      path: relativePath,
      name: entry.name,
      kind: entry.isDirectory() ? 'directory' : 'file',
      size: entry.isDirectory() ? null : fileStat.size,
      mtimeMs: fileStat.mtimeMs,
    };
  }));
  return {
    ok: true,
    projectRoot: resolve(projectRoot),
    dir: resolved.relativePath,
    entries: projected,
  };
}

export async function readStudioProjectFile(projectRoot: string, path: string): Promise<unknown> {
  const resolved = await resolveExistingStudioProjectFilePath(projectRoot, path);
  if (!resolved.ok) {
    return resolved;
  }
  const text = await readFile(resolved.absolutePath, 'utf8');
  return {
    ok: true,
    projectRoot: resolve(projectRoot),
    path: resolved.relativePath,
    text,
    sha256: studioProjectFileSha256(text),
  };
}

export async function writeStudioProjectFile(
  projectRoot: string,
  request: unknown,
): Promise<unknown> {
  if (
    request === null
    || typeof request !== 'object'
    || Array.isArray(request)
    || typeof (request as Record<string, unknown>)['path'] !== 'string'
    || typeof (request as Record<string, unknown>)['text'] !== 'string'
  ) {
    return { ok: false, diagnostic: 'invalid_write_payload' } satisfies StudioProjectFileFailure;
  }
  const parsed = request as StudioProjectFileWriteRequest;
  if (
    'expectedHash' in parsed
    && typeof parsed.expectedHash !== 'string'
    && parsed.expectedHash !== null
  ) {
    return { ok: false, diagnostic: 'invalid_write_payload' } satisfies StudioProjectFileFailure;
  }
  const resolved = resolveStudioProjectFilePath(projectRoot, parsed.path);
  if (!resolved.ok || resolved.relativePath.length === 0) {
    return { ok: false, diagnostic: 'path_outside_project_root' } satisfies StudioProjectFileFailure;
  }
  return withProjectFileWriteLock(resolved.absolutePath, async () => {
    const targetParent = dirname(resolved.absolutePath);
    const ancestor = await validateNearestExistingWriteAncestor(projectRoot, targetParent);
    if (!ancestor.ok) {
      return ancestor;
    }
    await mkdir(targetParent, { recursive: true });
    const canonicalParent = await realpath(targetParent);
    if (!isPathInsideRoot(ancestor.canonicalRoot, canonicalParent)) {
      return { ok: false, diagnostic: 'path_outside_project_root' } satisfies StudioProjectFileFailure;
    }
    try {
      if ((await lstat(resolved.absolutePath)).isSymbolicLink()) {
        return { ok: false, diagnostic: 'path_outside_project_root' } satisfies StudioProjectFileFailure;
      }
    } catch {
      // A missing leaf is the normal create path. Its canonical parent was checked above.
    }
    let previousHash: string | null = null;
    try {
      previousHash = studioProjectFileSha256(await readFile(resolved.absolutePath, 'utf8'));
    } catch {
      previousHash = null;
    }
    if (typeof parsed.expectedHash === 'string' || parsed.expectedHash === null) {
      if (previousHash !== parsed.expectedHash) {
        return {
          ok: false,
          diagnostic: 'stale_file_hash',
          previousHash,
        } satisfies StudioProjectFileFailure;
      }
    }

    const temporaryPath = join(
      dirname(resolved.absolutePath),
      `.${basename(resolved.absolutePath)}.${process.pid}.${randomUUID()}.tmp`,
    );
    try {
      await writeFile(temporaryPath, parsed.text, { encoding: 'utf8', flag: 'wx' });
      await rename(temporaryPath, resolved.absolutePath);
    } finally {
      await rm(temporaryPath, { force: true });
    }
    const nextText = await readFile(resolved.absolutePath, 'utf8');
    return {
      ok: true,
      projectRoot: resolve(projectRoot),
      path: resolved.relativePath,
      previousHash,
      sha256: studioProjectFileSha256(nextText),
    };
  });
}
