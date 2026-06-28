import {
  formatFiles,
  generateFiles,
  names,
  type Tree,
} from '@nx/devkit';
import { dirname, join } from 'node:path';

export interface StudioFeatureSliceGeneratorSchema {
  readonly name: string;
  readonly visualId?: string;
  readonly includePanel?: boolean;
}

export default async function generateStudioFeatureSlice(
  tree: Tree,
  schema: StudioFeatureSliceGeneratorSchema,
): Promise<void> {
  const normalizedNames = names(schema.name);
  const templateRoot = join(dirname(new URL(import.meta.url).pathname), 'files');
  const templateOptions = {
    className: normalizedNames.className,
    constantName: normalizedNames.fileName.replaceAll('-', '_').toUpperCase(),
    fileName: normalizedNames.fileName,
    propertyName: normalizedNames.propertyName,
    readoutKind: `studio_${normalizedNames.fileName.replaceAll('-', '_')}_readout`,
    visualId: schema.visualId ?? `studio-${normalizedNames.fileName}`,
  };

  generateFiles(
    tree,
    join(templateRoot, 'domain'),
    `libs/studio-domain/src/scaffolded/${normalizedNames.fileName}`,
    templateOptions,
  );
  generateFiles(
    tree,
    join(templateRoot, 'store'),
    `libs/studio-store/src/scaffolded/${normalizedNames.fileName}`,
    templateOptions,
  );
  generateFiles(
    tree,
    join(templateRoot, 'test'),
    `test/scaffolded/${normalizedNames.fileName}`,
    templateOptions,
  );

  if (schema.includePanel ?? true) {
    generateFiles(
      tree,
      join(templateRoot, 'panel'),
      `libs/studio-panels/src/scaffolded/${normalizedNames.fileName}`,
      templateOptions,
    );
    addExportIfMissing(
      tree,
      'libs/studio-panels/src/index.ts',
      `./scaffolded/${normalizedNames.fileName}/${normalizedNames.fileName}.component`,
    );
  }

  addExportIfMissing(
    tree,
    'libs/studio-domain/src/index.ts',
    `./scaffolded/${normalizedNames.fileName}/${normalizedNames.fileName}.read-model`,
  );
  addExportIfMissing(
    tree,
    'libs/studio-store/src/index.ts',
    `./scaffolded/${normalizedNames.fileName}/${normalizedNames.fileName}.store-hook`,
  );

  await formatFiles(tree);
}

function addExportIfMissing(tree: Tree, filePath: string, exportPath: string): void {
  if (!tree.exists(filePath)) {
    return;
  }

  const exportStatement = `export * from '${exportPath}';`;
  const currentContent = tree.read(filePath, 'utf8') ?? '';

  if (currentContent.includes(exportStatement)) {
    return;
  }

  const separator = currentContent.endsWith('\n') || currentContent.length === 0 ? '' : '\n';
  tree.write(filePath, `${currentContent}${separator}${exportStatement}\n`);
}
