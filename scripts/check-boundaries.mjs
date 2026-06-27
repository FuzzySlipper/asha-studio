import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const workspaceRoot = process.cwd();
const boundaryPolicy = JSON.parse(
  readFileSync(join(workspaceRoot, 'boundary-policy.json'), 'utf8'),
);

const sourceRoots = ['apps', 'libs', 'scripts', 'test'];
const skippedDirectories = new Set([
  '.git',
  '.nx',
  'dist',
  'node_modules',
  'old',
  'out-tsc',
]);
const scannedExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.ts',
]);

function collectFiles(directory) {
  const entries = [];

  for (const childName of readdirSync(directory)) {
    if (skippedDirectories.has(childName)) {
      continue;
    }

    const childPath = join(directory, childName);
    const childStats = statSync(childPath);

    if (childStats.isDirectory()) {
      entries.push(...collectFiles(childPath));
      continue;
    }

    const extensionStart = childName.lastIndexOf('.');
    const extension =
      extensionStart >= 0 ? childName.slice(extensionStart) : '';
    if (scannedExtensions.has(extension)) {
      entries.push(childPath);
    }
  }

  return entries;
}

function readSourceFiles() {
  const files = [];

  for (const sourceRoot of sourceRoots) {
    const rootPath = join(workspaceRoot, sourceRoot);
    try {
      const rootStats = statSync(rootPath);
      if (rootStats.isDirectory()) {
        files.push(...collectFiles(rootPath));
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return files;
}

function isAllowedAshaImport(importPath) {
  return boundaryPolicy.allowedSourceImports.includes(importPath);
}

function findImportViolations(filePath, fileText) {
  const violations = [];
  const importPattern = /from\s+['"](@asha\/[^'"]+)['"]|import\s*\(\s*['"](@asha\/[^'"]+)['"]\s*\)/g;
  let match = importPattern.exec(fileText);

  while (match !== null) {
    const importPath = match[1] ?? match[2];
    if (!isAllowedAshaImport(importPath)) {
      violations.push(`forbidden ASHA package import: ${importPath}`);
    }
    match = importPattern.exec(fileText);
  }

  return violations;
}

function findTextViolations(fileText) {
  const violations = [];

  for (const forbiddenText of boundaryPolicy.forbiddenText) {
    if (fileText.includes(forbiddenText)) {
      violations.push(`forbidden text: ${forbiddenText}`);
    }
  }

  for (const forbiddenPackage of boundaryPolicy.forbiddenPackages) {
    if (fileText.includes(forbiddenPackage)) {
      violations.push(`forbidden package reference: ${forbiddenPackage}`);
    }
  }

  return violations;
}

const violations = [];

for (const filePath of readSourceFiles()) {
  const relativePath = relative(workspaceRoot, filePath);
  const fileText = readFileSync(filePath, 'utf8');
  const fileViolations = [
    ...findImportViolations(filePath, fileText),
    ...findTextViolations(fileText),
  ];

  for (const violation of fileViolations) {
    violations.push(`${relativePath}: ${violation}`);
  }
}

if (violations.length > 0) {
  console.error('Boundary check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Boundary check passed.');
