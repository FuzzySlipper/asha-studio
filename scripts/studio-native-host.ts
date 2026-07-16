#!/usr/bin/env tsx
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { launchNativeBrowserHost } from '@asha/browser-host';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const builtUiRoot = join(repoRoot, 'dist/apps/studio-app/browser');
const host = process.env['HOST']?.trim() || '0.0.0.0';
const port = parsePort(process.env['PORT']);

await buildStudio();
const temporaryRoot = await mkdtemp(join(tmpdir(), 'asha-studio-native-host-'));
const uiRoot = join(temporaryRoot, 'ui');
await cp(builtUiRoot, uiRoot, { recursive: true });
await installProviderBootstrap(uiRoot);

const server = await launchNativeBrowserHost({
  uiRoot,
  host,
  port,
  healthProject: 'asha-studio',
});

try {
  if (server.provider.status !== 'rust_authority' || !server.provider.available) {
    const message = server.provider.diagnostics[0]?.message ?? server.provider.status;
    throw new Error(`ASHA Studio native authority failed to start: ${message}`);
  }
  console.log(`ASHA Studio native host listening at ${server.url}`);
  console.log('The trusted host-file service is a separate process; use `pnpm run studio:lan` for both.');
  await waitForShutdown();
} finally {
  await server.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return 4200;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }
  return parsed;
}

async function buildStudio(): Promise<void> {
  const child = spawn(
    'pnpm',
    ['exec', 'nx', 'build', 'studio-app', '--configuration=development'],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  const [code, signal] = await once(child, 'exit') as [number | null, NodeJS.Signals | null];
  if (signal !== null || code !== 0) {
    throw new Error(`Studio build failed (${signal ?? `exit ${String(code)}`}).`);
  }
}

async function installProviderBootstrap(root: string): Promise<void> {
  const indexPath = join(root, 'index.html');
  const html = await readFile(indexPath, 'utf8');
  const bootstrap = '<script src="/asha/browser-host/native-provider.js"></script>';
  if (!html.includes('</head>')) {
    throw new Error('Built Studio index is missing </head>.');
  }
  await writeFile(indexPath, html.replace('</head>', `${bootstrap}\n</head>`));
}

function waitForShutdown(): Promise<void> {
  return new Promise(resolve => {
    const finish = (): void => resolve();
    process.once('SIGINT', finish);
    process.once('SIGTERM', finish);
  });
}
