import { test, expect } from '@playwright/test';

// TC-DEMO-008, TC-DEMO-040

test.describe('Auth — Secure Area', () => {
  test('TC-DEMO-008: logout from secure area', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(process.env.TEST_USER!);
    await page.locator('#password').fill(process.env.TEST_PASS!);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/secure$/);

    await page.getByRole('link', { name: /Logout/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('.flash.success')).toContainText('You logged out of the secure area');
  });

  test('TC-DEMO-040: secure file download — requires auth', async ({ page }) => {
    await page.goto('/download_secure');
    // Unauthenticated access should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
