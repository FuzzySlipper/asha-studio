#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4212';
const demoRoot = process.env.ASHA_DEMO_ROOT ?? '/home/dev/asha-demo';
const executablePath = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
const screenshotPath = process.env.SCREENSHOT_PATH;

const browser = await chromium.launch({
  executablePath,
  headless: process.env.HEADED !== '1',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});

async function openDemoScene(page) {
  await page.getByRole('button', { name: 'Project Content', exact: true }).click();
  const browserPanel = page.locator('[data-visual-id="studio-project-content-browser"]');
  await expect(browserPanel).toContainText(demoRoot, { timeout: 30_000 });
  const sceneEntry = browserPanel.locator('[data-project-content-entry]').filter({
    hasText: /Generated tunnel room|generated-tunnel-room\.scene\.json/u,
  }).first();
  await expect(sceneEntry).toBeVisible();
  await sceneEntry.click();
  await browserPanel.getByRole('button', { name: 'Open Stored Scene', exact: true }).click();
  const reconciliation = page.locator('[aria-label="Unsaved scene changes"], [aria-label="Unsaved project content changes"]');
  const reconciliationVisible = await reconciliation.waitFor({ state: 'visible', timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (reconciliationVisible) {
    await reconciliation.locator('button').filter({ hasNotText: 'Cancel' }).click();
  }
  await expect(page.locator('.studio-menu__status')).toContainText(
    'generated-tunnel-room.scene.json',
    { timeout: 30_000 },
  );
}

async function expandSceneHierarchy(page) {
  await page.locator('button[title="Expand hierarchy"]').click();
}

async function expectStoredVoxelProjection(page) {
  const viewport = page.locator('[data-visual-id="studio-viewport"]');
  await expect(viewport).toHaveAttribute('data-workspace-authoring-projection', 'present', {
    timeout: 30_000,
  });
  await expect.poll(async () => Number(
    await viewport.getAttribute('data-workspace-authoring-mesh-payload-ops'),
  ), { timeout: 30_000 }).toBeGreaterThan(0);
}

async function expectOneStoredEnvironment() {
  const scene = JSON.parse(await readFile(
    join(demoRoot, 'levels/scenes/generated-tunnel-room.scene.json'),
    'utf8',
  ));
  const environments = scene.nodes.filter(node => node.tags.includes('procedural-environment'));
  if (environments.length !== 1) {
    throw new Error(`Expected one stored procedural environment; found ${String(environments.length)}.`);
  }
  const environment = environments[0];
  const generatedMarkers = scene.nodes.filter(node =>
    node.parent === environment.id && node.tags.includes('generated-marker'),
  );
  if (generatedMarkers.length !== 2) {
    throw new Error(`Expected two stored generated markers; found ${String(generatedMarkers.length)}.`);
  }
  const asset = JSON.parse(await readFile(
    join(demoRoot, 'assets/voxels/generated-tunnel.avxl.json'),
    'utf8',
  ));
  if (!asset.provenance?.[0]?.uri?.includes('seed=23&')) {
    throw new Error('Stored voxel asset does not retain the edited seed 23 provenance.');
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`${baseUrl}/?project=${encodeURIComponent(demoRoot)}`, { waitUntil: 'networkidle' });
  await openDemoScene(page);
  await expandSceneHierarchy(page);
  await expectStoredVoxelProjection(page);
  await expect(page.getByText('Generated tunnel environment', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Directional Light', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Point Light', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('button', { name: 'Save Scene', exact: true }).click();
  await expect.poll(async () => page.locator('.studio-menu__status').textContent(), {
    timeout: 30_000,
  }).not.toContain(' *');

  await page.getByRole('button', { name: 'Project Content', exact: true }).click();
  const browserPanel = page.locator('[data-visual-id="studio-project-content-browser"]');
  await browserPanel.getByRole('button', { name: 'Reload from Disk', exact: true }).click();
  const environment = page.locator('[data-visual-id="studio-environment-authoring"]');
  await expect(environment).toBeVisible({ timeout: 30_000 });
  await environment.locator('summary').click();
  await environment.getByRole('spinbutton', { name: 'Seed' }).fill('23');
  const placement = environment.getByRole('group', { name: 'Scene placement' });
  await placement.locator('input').first().fill('-4');
  const materialBindings = environment.getByRole('group', { name: 'Material catalog bindings' });
  await materialBindings.locator('input').nth(2).fill('material/tunnel-highlight');

  await environment.getByRole('button', { name: 'Preview', exact: true }).click();
  const environmentStatus = environment.locator('[data-environment-status]');
  await expect(environmentStatus).not.toHaveText('idle', { timeout: 30_000 });
  if (await environmentStatus.textContent() === 'rejected') {
    throw new Error(await environment.locator('[data-environment-message]').textContent() ?? 'Environment preview rejected.');
  }
  await expect(environmentStatus).toHaveText('previewed');
  await expect(environment.locator('[data-environment-candidate="present"]')).toContainText('solid');
  await expect(environment).toContainText('unresolved: material/tunnel-floor');
  const viewport = page.locator('canvas[aria-label="ASHA engine renderer viewport"]');
  await expect(viewport).toBeVisible();
  if (screenshotPath !== undefined) {
    await page.screenshot({ path: screenshotPath });
  }

  await environment.getByRole('button', { name: 'Accept Materialization', exact: true }).click();
  await expect(environment.locator('[data-environment-status]')).toHaveText('applied', {
    timeout: 30_000,
  });
  await environment.getByRole('button', { name: 'Save Canonical Artifacts', exact: true }).click();
  await expect(environment.locator('[data-environment-status]')).toHaveText('saved', {
    timeout: 30_000,
  });
  await expect(environment).toContainText('Saved scene and voxel asset');

  await page.reload({ waitUntil: 'networkidle' });
  await openDemoScene(page);
  await expandSceneHierarchy(page);
  await expect(page.getByText('Generated tunnel environment', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Generated tunnel environment', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expectStoredVoxelProjection(page);
  await expectOneStoredEnvironment();
  await expect(page.getByText('Directional Light', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Point Light', { exact: true }).first()).toBeVisible();
  await expect(viewport).toBeVisible();
} finally {
  await browser.close();
}
