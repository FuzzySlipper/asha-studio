import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const allowedAshaImports = new Set(['@asha/command-registry']);
const allowedLocalPackageLinks = new Map([
  ['@asha/command-registry', 'link:../asha/ts/packages/command-registry'],
  ['@asha/contracts', 'link:../asha/ts/packages/contracts'],
]);
const forbiddenPackageImports = [
  '@asha/native-bridge',
  '@asha/wasm-replay-bridge',
];
const forbiddenText = [
  '/home/dev/asha/engine-rs',
  '/home/dev/asha/ts/packages',
  'engine-rs/crates',
  'src/generated',
  'call(methodName, json)',
  'postMessage({type, payload:any})',
];
const sourceExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

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

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
  if (name.startsWith('@asha/')) {
    const allowedLink = allowedLocalPackageLinks.get(name);
    if (allowedLink === undefined || version !== allowedLink) {
      throw new Error(`ASHA dependency ${name}@${version} is not an allowed public package-root link`);
    }
  }
}

for (const file of walk(root)) {
  const rel = relative(root, file);
  const ext = file.slice(file.lastIndexOf('.'));
  if (!sourceExts.has(ext) && rel !== 'package.json' && rel !== 'README.md' && rel !== 'AGENTS.md') continue;
  const text = readFileSync(file, 'utf8');
  for (const forbidden of forbiddenPackageImports) {
    const importPattern = new RegExp(`(?:from\\s+|import\\()(['\"])${forbidden.replace('/', '\\/')}\\1`);
    if (importPattern.test(text)) {
      throw new Error(`${rel} imports forbidden raw ASHA package ${forbidden}`);
    }
  }
  const importMatches = text.matchAll(/(?:from\s+|import\s*(?:\(\s*)?)(['"])(@asha\/[A-Za-z0-9_-]+(?:\/[^'"]*)?)\1/g);
  for (const match of importMatches) {
    const specifier = match[2];
    if (specifier === undefined) continue;
    const rootPackage = specifier.split('/').slice(0, 2).join('/');
    if (!allowedAshaImports.has(rootPackage)) {
      throw new Error(`${rel} imports unapproved ASHA package ${specifier}`);
    }
    if (specifier !== rootPackage) {
      throw new Error(`${rel} imports ASHA package subpath ${specifier}; use package root only`);
    }
  }
  for (const token of forbiddenText) {
    if (text.includes(token) && rel !== 'README.md' && rel !== 'AGENTS.md' && rel !== 'scripts/check-boundaries.mjs') {
      throw new Error(`${rel} contains forbidden boundary token ${token}`);
    }
  }
}

console.log('asha-studio boundary check: OK');
