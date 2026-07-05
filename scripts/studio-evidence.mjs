#!/usr/bin/env node

import { existsSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const scriptsDir = join(repoRoot, 'scripts');

function evidenceEntries() {
  return readdirSync(scriptsDir)
    .filter((fileName) => fileName.startsWith('proof-') && fileName.endsWith('.ts'))
    .map((fileName) => ({
      name: fileName.slice('proof-'.length, -'.ts'.length),
      scriptPath: join(scriptsDir, fileName),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function printUsage() {
  console.log('Usage:');
  console.log('  pnpm run evidence:list');
  console.log('  pnpm run evidence -- <name> [args...]');
  console.log('  pnpm run evidence:v2-live-backend');
}

function listEvidence() {
  console.log('Available Studio evidence generators:');
  for (const entry of evidenceEntries()) {
    console.log(`  ${entry.name}`);
  }
}

function runEvidence(name, args) {
  const evidenceName = name === '--' ? args.shift() : name;
  if (evidenceName === undefined || evidenceName.length === 0) {
    printUsage();
    process.exit(1);
  }

  const scriptPath = join(scriptsDir, `proof-${evidenceName}.ts`);
  if (!existsSync(scriptPath)) {
    console.error(`Unknown Studio evidence generator: ${evidenceName}`);
    console.error('');
    listEvidence();
    process.exit(1);
  }

  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(
    pnpm,
    ['exec', 'tsx', relative(repoRoot, scriptPath), ...args],
    {
      cwd: repoRoot,
      stdio: 'inherit',
    },
  );

  if (result.error !== undefined) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

const [command, name, ...args] = process.argv.slice(2);

switch (command) {
  case 'list':
    listEvidence();
    break;
  case 'run':
    runEvidence(name, args);
    break;
  case undefined:
  case 'help':
  case '--help':
  case '-h':
    printUsage();
    break;
  default:
    console.error(`Unknown studio evidence command: ${basename(command)}`);
    printUsage();
    process.exit(1);
}
