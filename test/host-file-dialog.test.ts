import assert from "node:assert/strict";
import { test } from "node:test";
import "@angular/compiler";
import {
  createEnvironmentInjector,
  inject,
  runInInjectionContext,
} from "@angular/core";
import {
  StudioPreferencesStore,
  StudioWorkspaceStore,
} from "@asha-studio/store";

function hostFileListResponse(input: string | URL | Request): Response {
  const requestUrl = new URL(String(input));
  const requestedDirectory =
    requestUrl.searchParams.get("dir") || "/home/dev/asha-studio";
  return new Response(
    JSON.stringify({
      ok: true,
      startDirectory: "/home/dev/asha-studio",
      dir: requestedDirectory,
      entries: [
        {
          path: `${requestedDirectory}/levels`,
          name: "levels",
          kind: "directory",
          size: null,
          mtimeMs: 1,
        },
        {
          path: `${requestedDirectory}/long-authored-scene-name-that-remains-inspectable.scene.json`,
          name: "long-authored-scene-name-that-remains-inspectable.scene.json",
          kind: "file",
          size: 4096,
          mtimeMs: 2,
        },
      ],
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

test("host file dialog models open selection and explicit directory navigation", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    return hostFileListResponse(input);
  };
  const injector = createEnvironmentInjector([
    StudioPreferencesStore,
    StudioWorkspaceStore,
  ]);
  try {
    const store = runInInjectionContext(injector, () =>
      inject(StudioWorkspaceStore),
    );
    await store.refreshProjectFiles("/home/dev/asha-studio");
    store.openSceneFileDialog("open");
    await store.refreshProjectFiles("/home/dev/asha-studio");

    assert.equal(store.projectFileDialog().mode, "open");
    assert.equal(store.projectFileDialog().currentDir, "/home/dev/asha-studio");
    assert.equal(store.projectFileDialog().entries.length, 2);

    const scenePath =
      "/home/dev/asha-studio/long-authored-scene-name-that-remains-inspectable.scene.json";
    store.selectProjectFile(scenePath);
    assert.equal(
      store.projectFileDialog().fileName,
      "long-authored-scene-name-that-remains-inspectable.scene.json",
    );
    assert.equal(store.projectFileDialog().targetPath, scenePath);
    assert.equal(store.projectFileDialog().canConfirm, true);

    store.setProjectFileDirectoryPath("/tmp/asha-scenes");
    store.navigateProjectFileDirectory();
    await store.refreshProjectFiles("/tmp/asha-scenes");
    assert.equal(store.projectFileDialog().currentDir, "/tmp/asha-scenes");
    assert.equal(
      requestedUrls.some((url) => url.includes("dir=%2Ftmp%2Fasha-scenes")),
      true,
    );
  } finally {
    injector.destroy();
    globalThis.fetch = originalFetch;
  }
});

test("untitled Save opens Save As and confirm routes the resolved host path", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => hostFileListResponse(input);
  const injector = createEnvironmentInjector([
    StudioPreferencesStore,
    StudioWorkspaceStore,
  ]);
  try {
    const store = runInInjectionContext(injector, () =>
      inject(StudioWorkspaceStore),
    );
    await store.refreshProjectFiles("/home/dev/asha-studio");
    store.saveSceneFile();
    await store.refreshProjectFiles("/home/dev/asha-studio");

    assert.equal(store.projectFileDialog().mode, "save-as");
    assert.equal(store.projectFileDialog().fileName, "untitled.scene.json");

    store.setProjectFileName("levels/authoring-pass.scene.json");
    assert.equal(
      store.projectFileDialog().targetPath,
      "/home/dev/asha-studio/levels/authoring-pass.scene.json",
    );
    assert.equal(store.projectFileDialog().canConfirm, true);

    const savedPaths: string[] = [];
    store.saveSceneFileAs = (path) => {
      savedPaths.push(path);
    };
    store.confirmSceneFileDialog();
    assert.deepEqual(savedPaths, [
      "/home/dev/asha-studio/levels/authoring-pass.scene.json",
    ]);
  } finally {
    injector.destroy();
    globalThis.fetch = originalFetch;
  }
});
