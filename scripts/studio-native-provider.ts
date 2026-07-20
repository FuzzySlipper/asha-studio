import { stat } from 'node:fs/promises';
import { extname, isAbsolute, resolve } from 'node:path';

export const ASHA_STUDIO_NATIVE_PROVIDER_PATH = 'ASHA_STUDIO_NATIVE_PROVIDER_PATH';

export async function resolveStudioNativeProviderPath(
  configuredPath: string | undefined,
  studioRoot: string,
): Promise<string | null> {
  if (configuredPath === undefined) return null;

  const trimmedPath = configuredPath.trim();
  if (trimmedPath.length === 0) {
    throw new Error(`${ASHA_STUDIO_NATIVE_PROVIDER_PATH} must not be empty when set.`);
  }
  const providerPath = isAbsolute(trimmedPath)
    ? resolve(trimmedPath)
    : resolve(studioRoot, trimmedPath);
  if (extname(providerPath) !== '.node') {
    throw new Error(`${ASHA_STUDIO_NATIVE_PROVIDER_PATH} must select a native .node provider.`);
  }
  const providerStat = await stat(providerPath).catch(() => null);
  if (providerStat === null || !providerStat.isFile()) {
    throw new Error(`${ASHA_STUDIO_NATIVE_PROVIDER_PATH} does not select an existing file: ${providerPath}`);
  }
  return providerPath;
}
