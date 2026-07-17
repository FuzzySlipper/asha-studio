#!/usr/bin/env node
import { chromium, expect } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4200';
const executablePath = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
const headed = process.env.HEADED === '1';

const browser = await chromium.launch({
  executablePath,
  headless: !headed,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const viewport = page.locator('canvas[aria-label="ASHA engine renderer viewport"]');
  await expect(viewport).toBeVisible();
  const viewportBox = await viewport.boundingBox();
  if (viewportBox === null || viewportBox.width < 300 || viewportBox.height < 200) {
    throw new Error(`Editor viewport is not usable: ${JSON.stringify(viewportBox)}`);
  }

  await expect(page.getByRole('button', { name: 'Evidence', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Options…', exact: true }).click();
  const optionsPanel = page.locator('[data-visual-id="studio-options-panel"]');
  await expect(optionsPanel).toBeVisible();
  await expect(optionsPanel).toContainText('right-handed Y-up');
  await expect(optionsPanel).toContainText('Scratch session');
  await page.getByRole('button', { name: 'Close options', exact: true }).click();

  await page.getByRole('button', { name: 'Scene', exact: true }).click();
  await page.locator('[data-add-light="directional"]').click();
  await expect(page.getByText('Directional Light', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.studio-menu__status')).toContainText('*');

  await page.getByRole('button', { name: 'Voxel', exact: true }).click();
  await page.getByRole('button', { name: 'Asset', exact: true }).click();
  await page.locator('[data-voxel-asset-action="create_house"]').click();
  await expect(page.locator('.studio-menu__status')).toContainText(/Created a \d+-voxel house/, { timeout: 30_000 });
  await expect(page.getByText('Voxel house', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Hierarchy row Scene Root', exact: true }).click();
  await expect(page.getByText('Voxel house', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Collapse Scene Root', exact: true }).click();
  await expect(page.getByText('Voxel house', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand Scene Root', exact: true }).click();
  await expect(page.getByText('Voxel house', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Voxel', exact: true }).click();

  if (process.env.SCREENSHOT_PATH !== undefined) {
    await page.screenshot({ path: process.env.SCREENSHOT_PATH });
  }
} finally {
  await browser.close();
}
