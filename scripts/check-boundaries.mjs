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
  '.yaml',
  '.yml',
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

function readRootConfigFiles() {
  return readdirSync(workspaceRoot)
    .map(childName => join(workspaceRoot, childName))
    .filter(childPath => {
      const childStats = statSync(childPath);
      if (!childStats.isFile()) {
        return false;
      }
      const childName = childPath.slice(childPath.lastIndexOf('/') + 1);
      const extensionStart = childName.lastIndexOf('.');
      const extension = extensionStart >= 0 ? childName.slice(extensionStart) : '';
      return scannedExtensions.has(extension);
    });
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

function valueAtPath(source, path) {
  return path.split('.').reduce((current, segment) => {
    if (current === undefined || current === null || typeof current !== 'object') {
      return undefined;
    }
    return current[segment];
  }, source);
}

function dependencySections() {
  const configuredSections = boundaryPolicy.dependencySections ?? [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];
  return configuredSections
    .map(sectionPath => ({
      sectionPath,
      dependencies: valueAtPath(packageJson, sectionPath),
    }))
    .filter(section => section.dependencies !== undefined);
}

function findDependencyViolations() {
  const violations = [];
  const allowedLinks = boundaryPolicy.allowedLocalPackageLinks ?? {};
  const requiredLinks = boundaryPolicy.requiredLocalPackageLinks ?? {};

  for (const [packageName, expectedLink] of Object.entries(requiredLinks)) {
    const actual = dependencySections()
      .map(section => section.dependencies[packageName])
      .find(value => value !== undefined);
    if (actual !== expectedLink) {
      violations.push(`${packageName} must use approved local package link ${expectedLink}, got ${actual ?? 'missing'}`);
    }
  }

  for (const section of dependencySections()) {
    if (section.dependencies === null || typeof section.dependencies !== 'object' || Array.isArray(section.dependencies)) {
      violations.push(`${section.sectionPath} must be an object when declared as a dependency section`);
      continue;
    }

    for (const [packageName, spec] of Object.entries(section.dependencies)) {
      if (!packageName.startsWith('@asha/')) {
        continue;
      }
      if (!publicSurfacePolicy.approvedPackageRoots.has(packageName)) {
        violations.push(`non-approved ASHA package dependency in ${section.sectionPath} for ${boundaryPolicy.consumerRole}: ${packageName}`);
        continue;
      }
      const expectedLink = allowedLinks[packageName] ?? `link:../asha/ts/packages/${packageName.replace('@asha/', '')}`;
      if (spec !== expectedLink) {
        violations.push(`${section.sectionPath}.${packageName} must use approved local package link ${expectedLink}, got ${spec}`);
      }
    }
  }

  return violations;
}

function findImportSpecifiers(fileText) {
  const specifiers = [];
  const importPattern =
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match = importPattern.exec(fileText);

  while (match !== null) {
    specifiers.push(match[1] ?? match[2]);
    match = importPattern.exec(fileText);
  }

  const callPattern = /\b(?:import|require)\s*\(\s*((?:(['"])([^'"]*)\2\s*(?:\+\s*)?)+)\)/g;
  match = callPattern.exec(fileText);
  while (match !== null) {
    const literalParts = [];
    const literalPattern = /(['"])([^'"]*)\1/g;
    let literalMatch = literalPattern.exec(match[1]);
    while (literalMatch !== null) {
      literalParts.push(literalMatch[2]);
      literalMatch = literalPattern.exec(match[1]);
    }
    if (literalParts.length > 0) {
      specifiers.push(literalParts.join(''));
    }
    match = callPattern.exec(fileText);
  }

  return specifiers;
}

function findImportViolations(filePath, fileText) {
  const violations = [];
  const importSpecifiers = findImportSpecifiers(fileText);
  const forbiddenImportSpecifiers = new Set(boundaryPolicy.forbiddenImportSpecifiers ?? []);
  const forbiddenImportPatterns = boundaryPolicy.forbiddenImportPatterns ?? [];

  for (const importPath of importSpecifiers) {
    if (forbiddenImportSpecifiers.has(importPath)) {
      violations.push(`forbidden import specifier: ${importPath}`);
      continue;
    }

    for (const pattern of forbiddenImportPatterns) {
      const regex = globFragmentToRegExp(pattern);
      if (regex.test(importPath)) {
        violations.push(`forbidden import pattern ${pattern}: ${importPath}`);
      }
    }

    if (importPath.startsWith('@asha/') && !isAllowedAshaImport(importPath)) {
      const packageRoot = ashaPackageRoot(importPath);
      if (publicSurfacePolicy.forbiddenPackageRoots.has(packageRoot)) {
        violations.push(`forbidden ASHA package import: ${importPath}`);
      } else {
        violations.push(`non-approved ASHA package import for ${boundaryPolicy.consumerRole}: ${importPath}`);
      }
    }
  }

  return violations;
}

function findTextViolations(relativePath, fileText) {
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

  const liveSource = relativePath.startsWith('apps/') || relativePath.startsWith('libs/');
  if (liveSource && fileText.includes('@asha/runtime-bridge/reference')) {
    violations.push('live Studio app/libs must not import the reference RuntimeSession subpath');
  }
  if (liveSource && fileText.includes('createMockRuntimeSession')) {
    violations.push('live Studio app/libs must not create a reference/mock RuntimeSession');
  }

  return violations;
}

function findConfigPathViolations(relativePath, fileText) {
  const violations = [];
  const allowedFiles = new Set(boundaryPolicy.allowedConfigPathFiles ?? []);
  const docsOnlyFiles = new Set(boundaryPolicy.docsOnlyFiles ?? []);
  if (allowedFiles.has(relativePath) || docsOnlyFiles.has(relativePath)) {
    return violations;
  }

  for (const forbiddenFragment of boundaryPolicy.forbiddenConfigPathFragments ?? []) {
    if (fileText.includes(forbiddenFragment)) {
      violations.push(`forbidden config path fragment: ${forbiddenFragment}`);
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
    ...findTextViolations(relativePath, fileText),
  ];

  for (const violation of fileViolations) {
    violations.push(`${relativePath}: ${violation}`);
  }
}

for (const filePath of readRootConfigFiles()) {
  const relativePath = relative(workspaceRoot, filePath);
  const fileText = readFileSync(filePath, 'utf8');
  for (const violation of findConfigPathViolations(relativePath, fileText)) {
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
