#!/usr/bin/env tsx
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listStudioProjectDir,
  readStudioProjectFile,
  writeStudioProjectFile,
} from './studio-project-file-service';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const projectRoot = resolve(process.env.ASHA_STUDIO_PROJECT_ROOT ?? join(repoRoot, '../asha-testing'));
const host = process.env.ASHA_STUDIO_FILE_HOST ?? '0.0.0.0';
const port = Number(process.env.ASHA_STUDIO_FILE_PORT ?? '4300');

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
      sendJson(response, 200, await listStudioProjectDir(projectRoot, url.searchParams.get('dir') ?? ''));
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/project/file') {
      sendJson(response, 200, await readStudioProjectFile(projectRoot, url.searchParams.get('path') ?? ''));
      return;
    }
    if (request.method === 'PUT' && url.pathname === '/api/project/file') {
      sendJson(response, 200, await writeStudioProjectFile(projectRoot, JSON.parse(await readBody(request))));
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
