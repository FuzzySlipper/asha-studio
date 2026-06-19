import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const policy = JSON.parse(readFileSync(join(root, 'boundary-policy.json'), 'utf8'));

const sourceExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const configExts = new Set(['.json', '.yaml', '.yml', '.toml']);
const allowedAshaImports = new Set(policy.allowedSourceImports);
const allowedLocalPackageLinks = new Map(Object.entries(policy.allowedLocalPackageLinks));
const requiredLocalPackageLinks = new Map(Object.entries(policy.requiredLocalPackageLinks ?? {}));
const forbiddenPackageImports = new Set(policy.forbiddenPackages);
const docsOnlyFiles = new Set(policy.docsOnlyFiles);
const allowedConfigPathFiles = new Set(policy.allowedConfigPathFiles);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function getPathValue(object, dottedPath) {
  return dottedPath.split('.').reduce((value, segment) => {
    if (value === undefined || value === null || typeof value !== 'object') return undefined;
    return value[segment];
  }, object);
}

function validatePackageSection(pkg, sectionPath) {
  const section = getPathValue(pkg, sectionPath);
  if (section === undefined) return;
  if (section === null || typeof section !== 'object' || Array.isArray(section)) {
    throw new Error(`package.json ${sectionPath} must be an object when present`);
  }
  for (const [name, version] of Object.entries(section)) {
    if (!name.startsWith('@asha/')) continue;
    const allowedLink = allowedLocalPackageLinks.get(name);
    if (allowedLink === undefined || version !== allowedLink) {
      throw new Error(`package.json ${sectionPath} contains ASHA dependency ${name}@${version}; only explicit public package-root links from boundary-policy.json are allowed`);
    }
  }
}

function validatePackageJson() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  for (const sectionPath of policy.dependencySections) {
    validatePackageSection(pkg, sectionPath);
  }
  const dependencies = pkg.dependencies ?? {};
  if (dependencies === null || typeof dependencies !== 'object' || Array.isArray(dependencies)) {
    throw new Error('package.json dependencies must be an object because ASHA public surfaces are required');
  }
  for (const [name, version] of requiredLocalPackageLinks) {
    if (dependencies[name] !== version) {
      throw new Error(`package.json dependencies is missing required ASHA public surface ${name}@${version}; do not claim compatibility without the package-root link`);
    }
  }
}

function rootPackageOf(specifier) {
  return specifier.split('/').slice(0, 2).join('/');
}

function validateAshaSpecifier(rel, specifier) {
  const rootPackage = rootPackageOf(specifier);
  if (forbiddenPackageImports.has(rootPackage)) {
    throw new Error(`${rel} imports forbidden raw ASHA package ${rootPackage}`);
  }
  if (!allowedAshaImports.has(rootPackage)) {
    throw new Error(`${rel} imports unapproved ASHA package ${specifier}`);
  }
  if (specifier !== rootPackage) {
    throw new Error(`${rel} imports ASHA package subpath ${specifier}; use package root only`);
  }
}

function scanImportSpecifiers(rel, text) {
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?[^'"\n]*?\s+from\s+(['"])(@asha\/[A-Za-z0-9_-]+(?:\/[^'"]*)?)\1/g,
    /\bimport\s+(['"])(@asha\/[A-Za-z0-9_-]+(?:\/[^'"]*)?)\1/g,
    /\bimport\s*\(\s*(['"])(@asha\/[A-Za-z0-9_-]+(?:\/[^'"]*)?)\1\s*\)/g,
    /\brequire\s*\(\s*(['"])(@asha\/[A-Za-z0-9_-]+(?:\/[^'"]*)?)\1\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const specifier = match[2];
      if (specifier !== undefined) validateAshaSpecifier(rel, specifier);
    }
  }
}

function scanForbiddenTokens(rel, text) {
  const docsOnly = docsOnlyFiles.has(rel);
  for (const token of policy.forbiddenText) {
    if (text.includes(token) && !docsOnly && rel !== 'scripts/check-boundaries.mjs' && rel !== 'boundary-policy.json') {
      throw new Error(`${rel} contains forbidden boundary token ${token}`);
    }
  }
  if (!allowedConfigPathFiles.has(rel) && !docsOnly) {
    for (const token of policy.forbiddenConfigPathFragments) {
      if (text.includes(token)) {
        throw new Error(`${rel} contains forbidden ASHA source path fragment ${token}; use an approved package-root dependency instead`);
      }
    }
  }
}

validatePackageJson();

for (const file of walk(root)) {
  const rel = relative(root, file);
  const ext = extname(file);
  const shouldScanSource = sourceExts.has(ext);
  const shouldScanConfig = configExts.has(ext) || rel === 'package.json' || rel === 'README.md' || rel === 'AGENTS.md' || rel === 'boundary-policy.json';
  if (!shouldScanSource && !shouldScanConfig) continue;
  const text = readFileSync(file, 'utf8');
  if (shouldScanSource) scanImportSpecifiers(rel, text);
  scanForbiddenTokens(rel, text);
}

console.log('asha-studio boundary check: OK');
