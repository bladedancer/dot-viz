import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, '../fixtures/sample.dot');

async function uploadFile(page) {
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    // Wait for graph canvas — cy renders into canvas
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(800);
}

test('app loads without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    expect(errors).toHaveLength(0);
});

test('upload dot file renders graph', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page);
    await expect(page.locator('canvas').first()).toBeVisible();
});

test('source toggle switches view', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page);
    await page.getByText('Groups').click();
    await page.waitForTimeout(500);
    await expect(page.locator('canvas').first()).toBeVisible();
    await page.getByText('Artifacts').click();
    await page.waitForTimeout(500);
    await expect(page.locator('canvas').first()).toBeVisible();
});

test('filter input is interactive', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page);
    await page.locator('input[name="filter"]').fill('alpha');
    await page.waitForTimeout(400);
    await expect(page.locator('input[name="filter"]')).toHaveValue('alpha');
});

test('edge filter toggles work', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page);
    await page.getByText('Test').click();
    await page.waitForTimeout(200);
    await expect(page.locator('canvas').first()).toBeVisible();
});

test('layout change works', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page);
    await page.locator('button[title="Select layout"]').click();
    await page.getByText('circle').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('canvas').first()).toBeVisible();
});

test('export triggers download', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page);
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByText('Export PNG').click(),
    ]);
    expect(download.suggestedFilename()).toBe('graph.png');
});

test('zoom buttons work', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page);
    await page.locator('button[title="Zoom In"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[title="See whole graph"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('canvas').first()).toBeVisible();
});
