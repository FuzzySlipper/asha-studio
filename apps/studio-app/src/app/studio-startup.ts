export type StudioStartupProject =
  | { readonly status: 'none' }
  | { readonly status: 'open'; readonly path: string }
  | { readonly status: 'invalid'; readonly diagnostic: string };

const MAX_STARTUP_PROJECT_PATH_LENGTH = 4096;

export function readStudioStartupProject(href: string): StudioStartupProject {
  let url: URL;
  try {
    url = new URL(href, 'http://127.0.0.1/');
  } catch {
    return { status: 'invalid', diagnostic: 'Studio startup URL is malformed.' };
  }
  const projectValues = url.searchParams.getAll('project');
  if (projectValues.length === 0) {
    return { status: 'none' };
  }
  if (projectValues.length !== 1) {
    return { status: 'invalid', diagnostic: 'Specify at most one startup project.' };
  }
  const projectValue = projectValues[0];
  if (projectValue === undefined) {
    return { status: 'invalid', diagnostic: 'Startup project path is missing.' };
  }
  const path = projectValue.trim();
  if (path.length === 0 || path.length > MAX_STARTUP_PROJECT_PATH_LENGTH || path.includes('\0')) {
    return { status: 'invalid', diagnostic: 'Startup project path is empty or malformed.' };
  }
  return { status: 'open', path };
}
