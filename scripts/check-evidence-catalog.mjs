#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = process.cwd();
const scriptsDir = join(repoRoot, 'scripts');
const catalogPath = join(scriptsDir, 'studio-evidence-catalog.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

const configuredStatusSets = [
  ...(catalog.defaultListStatuses ?? []),
  ...(catalog.runnableStatuses ?? []),
  ...(catalog.retiredStatuses ?? []),
];
const knownStatuses = new Set(configuredStatusSets);
const names = new Map();
const scriptPaths = new Map();
const violations = [];

if (catalog.schemaVersion !== 1) {
  violations.push('scripts/studio-evidence-catalog.json: schemaVersion must be 1');
}

for (const [index, entry] of (catalog.entries ?? []).entries()) {
  const label = `entry ${index}`;
  if (typeof entry.name !== 'string' || entry.name.length === 0) {
    violations.push(`${label}: name is required`);
    continue;
  }

  if (names.has(entry.name)) {
    violations.push(`${entry.name}: duplicate evidence name also used by ${names.get(entry.name)}`);
  }
  names.set(entry.name, label);

  if (typeof entry.scriptPath !== 'string' || !entry.scriptPath.startsWith('scripts/')) {
    violations.push(`${entry.name}: scriptPath must be a scripts/ relative path`);
  } else {
    if (scriptPaths.has(entry.scriptPath)) {
      violations.push(`${entry.name}: scriptPath duplicates ${scriptPaths.get(entry.scriptPath)}`);
    }
    scriptPaths.set(entry.scriptPath, entry.name);

    const absoluteScriptPath = join(repoRoot, entry.scriptPath);
    if (!existsSync(absoluteScriptPath)) {
      violations.push(`${entry.name}: missing scriptPath ${entry.scriptPath}`);
    }
  }

  if (!knownStatuses.has(entry.status)) {
    violations.push(`${entry.name}: unknown status ${entry.status}`);
  }

  if (typeof entry.lane !== 'string' || entry.lane.length === 0) {
    violations.push(`${entry.name}: lane is required`);
  }

  if (typeof entry.summary !== 'string' || entry.summary.length === 0) {
    violations.push(`${entry.name}: summary is required`);
  }
}

const catalogedScriptPaths = new Set(scriptPaths.keys());
const proofScriptPaths = readdirSync(scriptsDir)
  .filter((fileName) => fileName.startsWith('proof-') && fileName.endsWith('.ts'))
  .map((fileName) => `scripts/${fileName}`)
  .sort();

for (const proofScriptPath of proofScriptPaths) {
  if (!catalogedScriptPaths.has(proofScriptPath)) {
    violations.push(`${proofScriptPath}: proof script must be classified in studio-evidence-catalog.json`);
  }
}

for (const scriptPath of catalogedScriptPaths) {
  if (scriptPath.includes('/proof-') || scriptPath.startsWith('scripts/proof-')) {
    continue;
  }

  violations.push(`${scriptPath}: Studio evidence scripts should stay visibly classified until renamed in a planned cleanup`);
}

if (violations.length > 0) {
  console.error('Studio evidence catalog check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(
  `Studio evidence catalog passed (${proofScriptPaths.length} proof script(s), ${catalogedScriptPaths.size} catalog entr${catalogedScriptPaths.size === 1 ? 'y' : 'ies'}).`,
);
console.log(`Catalog: ${relative(repoRoot, catalogPath)}`);
