import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(join(workspaceRoot, 'package.json'), 'utf8'));
const policyPath = join(workspaceRoot, 'docs', 'script-reference-policy.json');
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));

const packageScripts = new Set(Object.keys(packageJson.scripts ?? {}));
const allowedMissingScripts = new Map(
  Object.entries(policy.allowedMissingScriptReferences ?? {}),
);

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
  const roots = policy.documentationRoots ?? ['README.md', 'docs'];
  return roots.flatMap((root) => collectMarkdownFiles(join(workspaceRoot, root)));
}

const scriptReferencePattern = /pnpm\s+run\s+([A-Za-z0-9:_-]+)/g;
const violations = [];
const seenMissingAllowed = new Set();

for (const filePath of configuredMarkdownFiles()) {
  const relativePath = relative(workspaceRoot, filePath);
  const fileText = readFileSync(filePath, 'utf8');
  let match = scriptReferencePattern.exec(fileText);

  while (match !== null) {
    const scriptName = match[1];
    if (!packageScripts.has(scriptName)) {
      if (allowedMissingScripts.has(scriptName)) {
        seenMissingAllowed.add(scriptName);
      } else {
        violations.push(
          `${relativePath}: pnpm run ${scriptName} is not declared in package.json scripts`,
        );
      }
    }
    match = scriptReferencePattern.exec(fileText);
  }
}

for (const [scriptName, details] of allowedMissingScripts) {
  if (packageScripts.has(scriptName)) {
    violations.push(
      `docs/script-reference-policy.json: pnpm run ${scriptName} is allowlisted as missing but now exists`,
    );
  }

  if (typeof details !== 'object' || details === null || !details.status || !details.note) {
    violations.push(
      `docs/script-reference-policy.json: ${scriptName} must include status and note`,
    );
  }
}

if (violations.length > 0) {
  console.error('Documentation script reference check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

const allowedCount = seenMissingAllowed.size;
console.log(
  `Documentation script references passed (${allowedCount} historical/deferred missing script name(s) explicitly documented).`,
);
