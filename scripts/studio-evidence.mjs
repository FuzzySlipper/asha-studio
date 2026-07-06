#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const scriptsDir = join(repoRoot, 'scripts');
const catalogPath = join(scriptsDir, 'studio-evidence-catalog.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const runnableStatuses = new Set(catalog.runnableStatuses ?? []);
const defaultListStatuses = new Set(catalog.defaultListStatuses ?? []);

function evidenceEntries(options = {}) {
  const includeAll = options.includeAll === true;

  return catalog.entries
    .filter((entry) => includeAll || defaultListStatuses.has(entry.status))
    .map((entry) => ({
      ...entry,
      absoluteScriptPath: join(repoRoot, entry.scriptPath),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function findEvidenceEntry(name) {
  return catalog.entries.find((entry) => entry.name === name);
}

function printUsage() {
  console.log('Usage:');
  console.log('  pnpm run evidence:list [--all]');
  console.log('  pnpm run evidence -- <name> [--allow-retired] [args...]');
  console.log('  pnpm run evidence:v2-live-backend');
}

function listEvidence(options = {}) {
  const includeAll = options.includeAll === true;
  const entries = evidenceEntries({ includeAll });
  const label = includeAll ? 'All cataloged Studio evidence generators' : 'Current Studio product evidence generators';
  console.log(`${label}:`);
  for (const entry of entries) {
    console.log(`  ${entry.name} [${entry.status} / ${entry.lane}]`);
    if (entry.summary) {
      console.log(`    ${entry.summary}`);
    }
  }

  if (!includeAll) {
    console.log('');
    console.log('Use `pnpm run evidence:list -- --all` to include milestone, delegated, and retired entries.');
  }
}

function takeAllowRetiredFlag(args) {
  const flagIndex = args.indexOf('--allow-retired');
  if (flagIndex === -1) {
    return false;
  }

  args.splice(flagIndex, 1);
  return true;
}

function runEvidence(name, args) {
  const evidenceName = name === '--' ? args.shift() : name;
  const allowRetired = takeAllowRetiredFlag(args);

  if (evidenceName === undefined || evidenceName.length === 0) {
    printUsage();
    process.exit(1);
  }

  const entry = findEvidenceEntry(evidenceName);
  if (entry === undefined) {
    console.error(`Unknown Studio evidence generator: ${evidenceName}`);
    console.error('');
    listEvidence({ includeAll: true });
    process.exit(1);
  }

  if (!runnableStatuses.has(entry.status) && !allowRetired) {
    console.error(`Studio evidence generator is retired/delegated: ${evidenceName}`);
    console.error(`status: ${entry.status}`);
    if (entry.replacement) {
      console.error(`replacement: ${entry.replacement}`);
    }
    console.error('');
    console.error('Use `--allow-retired` only when intentionally reproducing historical artifacts.');
    process.exit(1);
  }

  const scriptPath = join(repoRoot, entry.scriptPath);
  if (!existsSync(scriptPath)) {
    console.error(`Unknown Studio evidence generator: ${evidenceName}`);
    console.error('');
    listEvidence({ includeAll: true });
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
    listEvidence({ includeAll: name === '--all' || args.includes('--all') });
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
