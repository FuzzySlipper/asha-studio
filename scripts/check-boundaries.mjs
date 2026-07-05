import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const workspaceRoot = process.cwd();
const boundaryPolicy = JSON.parse(
  readFileSync(join(workspaceRoot, 'boundary-policy.json'), 'utf8'),
);
const packageJson = JSON.parse(readFileSync(join(workspaceRoot, 'package.json'), 'utf8'));
const publicSurfacePolicy = loadPublicSurfacePolicy();

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
  return publicSurfacePolicy.approvedSpecifiers.has(importPath);
}

function ashaPackageRoot(specifier) {
  return specifier.split('/').slice(0, 2).join('/');
}

function globFragmentToRegExp(fragment) {
  const escaped = fragment
    .split('*')
    .map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^\\n"\']*');
  return new RegExp(escaped);
}

function loadPublicSurfacePolicy() {
  const consumerRole = boundaryPolicy.consumerRole ?? 'asha-studio';
  const manifestPath = join(workspaceRoot, boundaryPolicy.publicSurfaceManifest ?? '../asha/harness/public-surface/ts-packages.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const consumerPolicy = (manifest.consumerPolicies ?? []).find((entry) => entry.consumerRole === consumerRole);
  if (consumerPolicy === undefined) {
    throw new Error(`ASHA public-surface manifest ${manifestPath} has no consumer policy for ${consumerRole}`);
  }
  const approvedPackageRoots = new Set(consumerPolicy.approvedPackageRoots ?? []);
  const approvedSpecifiers = new Set(approvedPackageRoots);
  for (const specifier of consumerPolicy.approvedPackageSubpaths ?? []) {
    if (typeof specifier === 'string') {
      approvedSpecifiers.add(specifier);
    }
  }
  return {
    approvedPackageRoots,
    approvedSpecifiers,
    forbiddenPackageRoots: new Set(consumerPolicy.forbiddenPackageRoots ?? []),
    forbiddenSpecifierPatterns: consumerPolicy.forbiddenSpecifierPatterns ?? [],
  };
}

function dependencySections() {
  return [
    packageJson.dependencies ?? {},
    packageJson.devDependencies ?? {},
    packageJson.peerDependencies ?? {},
    packageJson.optionalDependencies ?? {},
  ];
}

function findDependencyViolations() {
  const violations = [];
  const allowedLinks = boundaryPolicy.allowedLocalPackageLinks ?? {};
  const requiredLinks = boundaryPolicy.requiredLocalPackageLinks ?? {};

  for (const [packageName, expectedLink] of Object.entries(requiredLinks)) {
    const actual = dependencySections()
      .map(section => section[packageName])
      .find(value => value !== undefined);
    if (actual !== expectedLink) {
      violations.push(`${packageName} must use approved local package link ${expectedLink}, got ${actual ?? 'missing'}`);
    }
  }

  for (const section of dependencySections()) {
    for (const [packageName, spec] of Object.entries(section)) {
      if (!packageName.startsWith('@asha/')) {
        continue;
      }
      if (!publicSurfacePolicy.approvedPackageRoots.has(packageName)) {
        violations.push(`non-approved ASHA package dependency for ${boundaryPolicy.consumerRole}: ${packageName}`);
        continue;
      }
      const expectedLink = allowedLinks[packageName] ?? `link:../asha/ts/packages/${packageName.replace('@asha/', '')}`;
      if (spec !== expectedLink) {
        violations.push(`${packageName} must use approved local package link ${expectedLink}, got ${spec}`);
      }
    }
  }

  return violations;
}

function findImportViolations(filePath, fileText) {
  const violations = [];
  const importPattern = /from\s+['"](@asha\/[^'"]+)['"]|import\s*\(\s*['"](@asha\/[^'"]+)['"]\s*\)/g;
  let match = importPattern.exec(fileText);

  while (match !== null) {
    const importPath = match[1] ?? match[2];
    if (!isAllowedAshaImport(importPath)) {
      const packageRoot = ashaPackageRoot(importPath);
      if (publicSurfacePolicy.forbiddenPackageRoots.has(packageRoot)) {
        violations.push(`forbidden ASHA package import: ${importPath}`);
      } else {
        violations.push(`non-approved ASHA package import for ${boundaryPolicy.consumerRole}: ${importPath}`);
      }
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

  for (const pattern of publicSurfacePolicy.forbiddenSpecifierPatterns) {
    const regex = globFragmentToRegExp(pattern);
    if (regex.test(fileText)) {
      violations.push(`forbidden ASHA public-surface pattern: ${pattern}`);
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

for (const violation of findDependencyViolations()) {
  violations.push(`package.json: ${violation}`);
}

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
