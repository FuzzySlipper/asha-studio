import {
  formatFiles,
  generateFiles,
  names,
  type Tree,
} from '@nx/devkit';
import { dirname, join } from 'node:path';

export interface StudioPanelGeneratorSchema {
  readonly name: string;
  readonly visualId: string;
}

export default async function generateStudioPanel(
  tree: Tree,
  schema: StudioPanelGeneratorSchema,
): Promise<void> {
  const normalizedNames = names(schema.name);
  const targetDirectory = `libs/studio-panels/src/scaffolded/${normalizedNames.fileName}`;

  generateFiles(tree, join(dirname(new URL(import.meta.url).pathname), 'files'), targetDirectory, {
    className: normalizedNames.className,
    fileName: normalizedNames.fileName,
    propertyName: normalizedNames.propertyName,
    visualId: schema.visualId,
  });

  await formatFiles(tree);
}
