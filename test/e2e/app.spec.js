import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, '../fixtures/sample.dot');

test('app loads without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    expect(errors).toHaveLength(0);
});

test('upload dot file renders graph nodes', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);
    // Wait for graph canvas to have elements - cy renders into a canvas inside the container
    await page.waitForFunction(() => window.cy && window.cy.nodes().length > 0, { timeout: 10000 });
    const nodeCount = await page.evaluate(() => window.cy.nodes().length);
    expect(nodeCount).toBe(5);
});

test('source toggle switches between artifacts and groups', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);
    await page.waitForFunction(() => window.cy && window.cy.nodes().length > 0, { timeout: 10000 });

    // Switch to Groups view
    await page.getByText('Groups').click();
    await page.waitForFunction(() => window.cy.nodes().length < 5, { timeout: 5000 });
    const groupCount = await page.evaluate(() => window.cy.nodes().length);
    expect(groupCount).toBe(2); // com.example and org.other

    // Switch back to Artifacts
    await page.getByText('Artifacts').click();
    await page.waitForFunction(() => window.cy.nodes().length === 5, { timeout: 5000 });
});

test('filter input hides non-matching nodes', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    await page.waitForFunction(() => window.cy && window.cy.nodes().length > 0, { timeout: 10000 });

    await page.locator('input[name="filter"]').fill('alpha');
    await page.waitForTimeout(400); // debounce

    const visibleCount = await page.evaluate(() => window.cy.nodes(':visible').length);
    expect(visibleCount).toBe(1);
});

test('edge filter toggle hides test edges', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    await page.waitForFunction(() => window.cy && window.cy.nodes().length > 0, { timeout: 10000 });

    const testEdgesBefore = await page.evaluate(() =>
        window.cy.edges('[linkType = "test"]:visible').length
    );
    expect(testEdgesBefore).toBeGreaterThan(0);

    // Toggle off Test edges
    await page.getByText('Test').click();
    await page.waitForTimeout(200);

    const testEdgesAfter = await page.evaluate(() =>
        window.cy.edges('[linkType = "test"]:visible').length
    );
    expect(testEdgesAfter).toBe(0);
});

test('layout change re-renders graph', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    await page.waitForFunction(() => window.cy && window.cy.nodes().length > 0, { timeout: 10000 });

    // Open layout picker and select circle
    await page.locator('button[title="Select layout"]').click();
    await page.getByText('circle').click();
    await page.waitForTimeout(1000); // layout animates

    const nodeCount = await page.evaluate(() => window.cy.nodes(':visible').length);
    expect(nodeCount).toBeGreaterThan(0);
});

test('export button triggers download', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    await page.waitForFunction(() => window.cy && window.cy.nodes().length > 0, { timeout: 10000 });

    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByText('Export PNG').click(),
    ]);
    expect(download.suggestedFilename()).toBe('graph.png');
});

test('zoom in and fit buttons work', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    await page.waitForFunction(() => window.cy && window.cy.nodes().length > 0, { timeout: 10000 });

    const zoomBefore = await page.evaluate(() => window.cy.zoom());
    await page.locator('button[title="Zoom In"]').click();
    await page.waitForTimeout(300);
    const zoomAfter = await page.evaluate(() => window.cy.zoom());
    expect(zoomAfter).toBeGreaterThan(zoomBefore);

    await page.locator('button[title="See whole graph"]').click();
    await page.waitForTimeout(300);
    // just verify it doesn't crash
    const nodeCount = await page.evaluate(() => window.cy.nodes(':visible').length);
    expect(nodeCount).toBe(5);
});
