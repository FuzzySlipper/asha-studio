#!/usr/bin/env tsx
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import {
  discardStudioHostFileStage,
  listStudioHostDir,
  promoteStudioHostFileStage,
  readStudioHostFile,
  stageStudioHostFile,
  writeStudioHostFile,
} from './studio-project-file-service';

const startDirectory = resolve(process.env.ASHA_STUDIO_START_DIRECTORY ?? process.cwd());
const host = process.env.ASHA_STUDIO_FILE_HOST ?? '0.0.0.0';
const port = Number(process.env.ASHA_STUDIO_FILE_PORT ?? '4300');

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PUT, POST, DELETE, OPTIONS',
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
  response.setHeader('access-control-allow-methods', 'GET, PUT, POST, DELETE, OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    if (request.method === 'GET' && url.pathname === '/api/host-files/list') {
      sendJson(response, 200, await listStudioHostDir(startDirectory, url.searchParams.get('dir') ?? startDirectory));
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/host-files/file') {
      sendJson(response, 200, await readStudioHostFile(startDirectory, url.searchParams.get('path') ?? ''));
      return;
    }
    if (request.method === 'PUT' && url.pathname === '/api/host-files/file') {
      sendJson(response, 200, await writeStudioHostFile(startDirectory, JSON.parse(await readBody(request))));
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/host-files/stage') {
      sendJson(response, 200, await stageStudioHostFile(startDirectory, JSON.parse(await readBody(request))));
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/host-files/promote') {
      sendJson(response, 200, await promoteStudioHostFileStage(JSON.parse(await readBody(request))));
      return;
    }
    if (request.method === 'DELETE' && url.pathname === '/api/host-files/stage') {
      sendJson(response, 200, await discardStudioHostFileStage(JSON.parse(await readBody(request))));
      return;
    }
    sendJson(response, 404, { ok: false, diagnostic: 'not_found', message: 'Unknown host file route.' });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      diagnostic: 'host_file_server_error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, host, () => {
  console.log(`ASHA Studio trusted host file service: http://${host}:${port}`);
  console.log(`Initial directory: ${startDirectory}`);
  console.warn('This service exposes the Studio host filesystem and is intended for trusted LAN environments only.');
});
