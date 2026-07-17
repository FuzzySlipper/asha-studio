import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import { createEnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import {
  buildDefaultStudioHostUserSettings,
  buildDefaultStudioProjectSettings,
  serializeStudioHostUserSettings,
  serializeStudioProjectSettings,
} from '@asha-studio/domain';
import { StudioPreferencesStore, StudioWorkspaceStore } from '@asha-studio/store';

const VALID_MANIFEST = `[asha]
engine_version = "0.1.0"
contracts_version = "0.1.0"
runtime_bridge_version = "0.1.0"
devtools_protocol_version = "devtools-protocol.v0"
publish_artifact_format_version = "publish-artifact.v0"
engine_source = "../asha-engine"

[workspace]
scene_roots = ["scenes"]
prefab_roots = ["prefabs"]
asset_roots = ["assets"]
replay_roots = ["replays"]
catalog_packages = ["packages/game-catalogs"]
policy_packages = ["packages/game-policy"]

[runtime]
dev_command = "npm run dev"
devtools_endpoint = "ws://127.0.0.1:7391"
wasm_or_native_entry = "dist/runtime/index.js"
backend_mode = "reference"
backend_profile = "reference"
backend_proof_refs = []

[studio]
workspace_mode = true
attach_enabled = true
allowed_source_writes = ["scenes", "prefabs", "assets", "packages/game-catalogs"]

[publish]
command = "npm run build:publish"
artifact_dir = "dist"
verify_command = "npm run verify:publish"

[dev_resource_profile]
local_roots = ["assets", "packages/game-catalogs"]
cache_dir = "dist/dev-cache"
resolution_policy = "prefer-source"

[publish_resource_profile]
output_dir = "dist/resources"
archive_dir = "dist/archive"
resolution_policy = "locked"
`;

type ProjectBFailure = 'manifest' | 'project-settings' | 'host-user-settings';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function validOpenPayload(project: 'a' | 'b'): Record<string, unknown> {
  return {
    ok: true,
    workspaceRoot: `/projects/${project}`,
    manifestPath: 'asha.game.toml',
    manifestText: VALID_MANIFEST,
    manifestSha256: `sha256:manifest-${project}`,
    gameId: `game-${project}`,
    packageScripts: {
      dev: 'npm run dev',
      'build:publish': 'npm run build:publish',
      'verify:publish': 'npm run verify:publish',
    },
    existingRelativePaths: [
      'scenes',
      'prefabs',
      'assets',
      'replays',
      'packages/game-catalogs',
      'packages/game-policy',
    ],
    projectSettingsPath: `/projects/${project}/.asha/studio-project-settings.json`,
  };
}

function committedProjectSnapshot(store: StudioWorkspaceStore): string {
  return JSON.stringify({
    workspace: store.gameWorkspaceOverview(),
    projectSettings: store.projectSettings(),
    hostUserSettings: store.hostUserSettings(),
    effectiveSettings: store.effectiveSettings(),
    settingsReadout: store.projectSettingsReadout(),
  });
}

test('failed A-to-B project opens preserve the complete committed A snapshot', async () => {
  const originalFetch = globalThis.fetch;
  let projectBFailure: ProjectBFailure | null = null;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/api/projects/open') {
      const request = JSON.parse(String(init?.body ?? '{}')) as { readonly manifestPath?: string };
      const project = request.manifestPath?.includes('/b/') === true ? 'b' : 'a';
      const payload = validOpenPayload(project);
      if (project === 'b' && projectBFailure === 'manifest') {
        return jsonResponse({ ...payload, manifestText: 'not a valid ASHA manifest' });
      }
      return jsonResponse(payload);
    }
    if (url.pathname === '/api/host-files/file') {
      const project = url.searchParams.get('path')?.includes('/b/') === true ? 'b' : 'a';
      const artifact = buildDefaultStudioProjectSettings({
        gameId: `game-${project}`,
        manifestPath: 'asha.game.toml',
      });
      return jsonResponse({
        ok: true,
        text: project === 'b' && projectBFailure === 'project-settings'
          ? '{"artifactKind":"asha_studio_project_settings","settingsVersion":"asha-studio-project-settings.v1"}'
          : serializeStudioProjectSettings(artifact),
        sha256: `sha256:project-settings-${project}`,
      });
    }
    if (url.pathname === '/api/studio-settings/user') {
      const project = url.searchParams.get('projectRoot')?.includes('/b') === true ? 'b' : 'a';
      const projectKey = `project-key-${project}`;
      const artifact = buildDefaultStudioHostUserSettings(projectKey);
      return jsonResponse({
        ok: true,
        exists: true,
        projectKey,
        path: `/host-settings/${project}.json`,
        text: project === 'b' && projectBFailure === 'host-user-settings'
          ? '{"artifactKind":"asha_studio_host_user_settings","settingsVersion":"asha-studio-host-user-settings.v1"}'
          : serializeStudioHostUserSettings({
              ...artifact,
              sceneView: { ...artifact.sceneView, gridVisible: project === 'b' },
            }),
        sha256: `sha256:host-settings-${project}`,
      });
    }
    return jsonResponse({ ok: false, diagnostic: 'test_route_not_implemented' }, 404);
  };

  const injector = createEnvironmentInjector([StudioPreferencesStore, StudioWorkspaceStore]);
  try {
    const store = runInInjectionContext(injector, () => inject(StudioWorkspaceStore));
    store.setProjectRootDraft('/projects/a');
    await store.openProject();
    assert.equal(store.gameWorkspaceOverview().ok, true);
    assert.equal(store.projectSettingsReadout().projectRoot, '/projects/a');
    assert.equal(store.effectiveSettings().grid.visible, false);
    const projectA = committedProjectSnapshot(store);

    for (const failure of [
      'manifest',
      'project-settings',
      'host-user-settings',
    ] as const) {
      projectBFailure = failure;
      store.setProjectRootDraft('/projects/b');
      await store.openProject();
      assert.equal(committedProjectSnapshot(store), projectA, failure);
      assert.match(store.menuMessage(), /current workspace remains active/i, failure);
    }
  } finally {
    injector.destroy();
    globalThis.fetch = originalFetch;
  }
});
