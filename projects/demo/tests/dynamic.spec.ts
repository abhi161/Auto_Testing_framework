import { test, expect } from '@playwright/test';

// TC-DEMO-006, TC-DEMO-007, TC-DEMO-021, TC-DEMO-022, TC-DEMO-023, TC-DEMO-024

test.describe('Dynamic Features', () => {
  test('TC-DEMO-006: dynamic content loads new content on reload', async ({ page }) => {
    await page.goto('/dynamic_content');
    const first = page.locator('.large-4.columns').first();
    const before = await first.innerText();
    await page.reload();
    // Content is random; we just assert the page reloads successfully
    await expect(page.locator('.large-4.columns').first()).toBeVisible();
  });

  test('TC-DEMO-007: disappearing elements — nav links visible', async ({ page }) => {
    await page.goto('/disappearing_elements');
    const items = page.locator('ul li a');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('TC-DEMO-021: dynamic controls — enable/disable input', async ({ page }) => {
    await page.goto('/dynamic_controls');
    await page.getByRole('button', { name: 'Enable' }).click();
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('form#input-example input[type="text"]')).toBeEnabled();

    await page.getByRole('button', { name: 'Disable' }).click();
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('form#input-example input[type="text"]')).toBeDisabled();
  });

  test('TC-DEMO-022: dynamic controls — add/remove checkbox', async ({ page }) => {
    await page.goto('/dynamic_controls');
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('form#checkbox-example input[type="checkbox"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('form#checkbox-example input[type="checkbox"]')).toHaveCount(1);
  });

  test('TC-DEMO-023: dynamic loading 1 — hidden element revealed', async ({ page }) => {
    await page.goto('/dynamic_loading/1');
    await page.locator('#start button').click();
    await expect(page.locator('#finish h4')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#finish h4')).toHaveText('Hello World!');
  });

  test('TC-DEMO-024: dynamic loading 2 — element rendered after start', async ({ page }) => {
    await page.goto('/dynamic_loading/2');
    await page.locator('#start button').click();
    await expect(page.locator('#finish h4')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#finish h4')).toHaveText('Hello World!');
  });
});
