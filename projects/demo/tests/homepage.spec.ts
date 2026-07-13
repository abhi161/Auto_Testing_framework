import { test, expect } from '@playwright/test';

// TC-DEMO-003 | Source: https://the-internet.herokuapp.com/

test.describe('Homepage', () => {
  test('TC-DEMO-003: homepage loads and lists all feature links', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/The Internet/);
    await expect(page.getByRole('heading', { name: /Welcome to the-internet/i })).toBeVisible();
    const links = page.locator('#content ul li a');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(0);
  });
});
