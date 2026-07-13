import { test, expect } from '@playwright/test';

// TC-DEMO-016, TC-DEMO-017, TC-DEMO-018, TC-DEMO-038

test.describe('Alerts & Context Menu', () => {
  test('TC-DEMO-016: JS alert — accept', async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Click for JS Alert' }).click();
    await expect(page.locator('#result')).toContainText('You successfully clicked an alert');
  });

  test('TC-DEMO-017: JS confirm — accepted', async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Click for JS Confirm' }).click();
    await expect(page.locator('#result')).toContainText('You clicked: Ok');
  });

  test('TC-DEMO-018: JS prompt — text entry', async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', d => d.accept('Playwright'));
    await page.getByRole('button', { name: 'Click for JS Prompt' }).click();
    await expect(page.locator('#result')).toContainText('You entered: Playwright');
  });

  test('TC-DEMO-038: context menu — right-click triggers alert', async ({ page }) => {
    await page.goto('/context_menu');
    page.once('dialog', d => d.accept());
    await page.locator('#hot-spot').click({ button: 'right' });
    // Dialog should have been triggered and accepted without error
  });
});
