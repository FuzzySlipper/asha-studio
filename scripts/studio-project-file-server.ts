#!/usr/bin/env tsx
import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const projectRoot = resolve(process.env.ASHA_STUDIO_PROJECT_ROOT ?? join(repoRoot, '../asha-demo'));
const host = process.env.ASHA_STUDIO_FILE_HOST ?? '0.0.0.0';
const port = Number(process.env.ASHA_STUDIO_FILE_PORT ?? '4300');

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function normalizeRelativePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function resolveProjectPath(path: string): { readonly ok: true; readonly absolutePath: string; readonly relativePath: string } | { readonly ok: false } {
  const relativePath = normalizeRelativePath(path);
  const absolutePath = resolve(projectRoot, relativePath);
  const rootWithSep = projectRoot.endsWith(sep) ? projectRoot : `${projectRoot}${sep}`;
  if (absolutePath !== projectRoot && !absolutePath.startsWith(rootWithSep)) {
    return { ok: false };
  }
  return {
    ok: true,
    absolutePath,
    relativePath: relative(projectRoot, absolutePath).replaceAll('\\', '/'),
  };
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PUT, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', chunk => chunks.push(Buffer.from(chunk)));
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

async function listProjectDir(dir: string): Promise<unknown> {
  const resolved = resolveProjectPath(dir);
  if (!resolved.ok) {
    return { ok: false, diagnostic: 'path_outside_project_root' };
  }
  const entries = await readdir(resolved.absolutePath, { withFileTypes: true });
  const projected = await Promise.all(entries.map(async entry => {
    const absolutePath = join(resolved.absolutePath, entry.name);
    const relativePath = relative(projectRoot, absolutePath).replaceAll('\\', '/');
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
    projectRoot,
    dir: resolved.relativePath,
    entries: projected,
  };
}

async function readProjectFile(path: string): Promise<unknown> {
  const resolved = resolveProjectPath(path);
  if (!resolved.ok) {
    return { ok: false, diagnostic: 'path_outside_project_root' };
  }
  const text = await readFile(resolved.absolutePath, 'utf8');
  return {
    ok: true,
    projectRoot,
    path: resolved.relativePath,
    text,
    sha256: sha256(text),
  };
}

async function writeProjectFile(body: string): Promise<unknown> {
  const parsed = JSON.parse(body) as {
    readonly path?: unknown;
    readonly text?: unknown;
    readonly expectedHash?: unknown;
  };
  if (typeof parsed.path !== 'string' || typeof parsed.text !== 'string') {
    return { ok: false, diagnostic: 'invalid_write_payload' };
  }
  const resolved = resolveProjectPath(parsed.path);
  if (!resolved.ok) {
    return { ok: false, diagnostic: 'path_outside_project_root' };
  }
  let previousHash: string | null = null;
  try {
    previousHash = sha256(await readFile(resolved.absolutePath, 'utf8'));
  } catch {
    previousHash = null;
  }
  if (typeof parsed.expectedHash === 'string' || parsed.expectedHash === null) {
    if (previousHash !== parsed.expectedHash) {
      return {
        ok: false,
        diagnostic: 'stale_file_hash',
        previousHash,
      };
    }
  }
  await mkdir(dirname(resolved.absolutePath), { recursive: true });
  await writeFile(resolved.absolutePath, parsed.text, 'utf8');
  const nextText = await readFile(resolved.absolutePath, 'utf8');
  return {
    ok: true,
    projectRoot,
    path: resolved.relativePath,
    previousHash,
    sha256: sha256(nextText),
  };
}

const server = createServer(async (request, response) => {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-methods', 'GET, PUT, OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    if (request.method === 'GET' && url.pathname === '/api/project/list') {
      sendJson(response, 200, await listProjectDir(url.searchParams.get('dir') ?? ''));
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/project/file') {
      sendJson(response, 200, await readProjectFile(url.searchParams.get('path') ?? ''));
      return;
    }
    if (request.method === 'PUT' && url.pathname === '/api/project/file') {
      sendJson(response, 200, await writeProjectFile(await readBody(request)));
      return;
    }
    sendJson(response, 404, { ok: false, diagnostic: 'not_found' });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      diagnostic: 'project_file_server_error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, host, () => {
  console.log(`ASHA Studio project file server: http://${host}:${port}`);
  console.log(`Project root: ${projectRoot}`);
});
