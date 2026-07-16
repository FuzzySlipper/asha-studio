import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(join(workspaceRoot, 'package.json'), 'utf8'));
const packageScripts = new Set(Object.keys(packageJson.scripts ?? {}));

function collectMarkdownFiles(path) {
  if (!existsSync(path)) {
    return [];
  }

  const stats = statSync(path);
  if (stats.isFile()) {
    return extname(path) === '.md' ? [path] : [];
  }

  const files = [];
  for (const childName of readdirSync(path)) {
    files.push(...collectMarkdownFiles(join(path, childName)));
  }
  return files;
}

function configuredMarkdownFiles() {
  const roots = ['README.md', 'AGENTS.md', 'docs'];
  return roots.flatMap((root) => collectMarkdownFiles(join(workspaceRoot, root)));
}

const scriptReferencePattern = /pnpm\s+run\s+([A-Za-z0-9:_-]+)/g;
const violations = [];

for (const filePath of configuredMarkdownFiles()) {
  const relativePath = relative(workspaceRoot, filePath);
  const fileText = readFileSync(filePath, 'utf8');
  let match = scriptReferencePattern.exec(fileText);

  while (match !== null) {
    const scriptName = match[1];
    if (!packageScripts.has(scriptName)) {
      violations.push(
        `${relativePath}: pnpm run ${scriptName} is not declared in package.json scripts`,
      );
    }
    match = scriptReferencePattern.exec(fileText);
  }
}

if (violations.length > 0) {
  console.error('Documentation script reference check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Documentation script references passed.');
