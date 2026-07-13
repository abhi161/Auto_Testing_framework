import { test, expect } from '@playwright/test';

// Smoke test proving the framework's mechanics (config, reporters, viewport, execution) work
// end-to-end against a real public site. This site uses basic form auth, not Azure AD, so it
// does NOT use tests/helpers/auth.helper.ts — that helper is exercised against real projects.
// TC-DEMO-001: traces to https://the-internet.herokuapp.com/login (public reference app, no source repo)

test.describe('demo: the-internet login form', () => {
  test('TC-DEMO-001: valid credentials reach the secure area', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(process.env.TEST_USER!);
    await page.locator('#password').fill(process.env.TEST_PASS!);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.flash.success')).toContainText('You logged into a secure area');
    await expect(page).toHaveURL(/\/secure$/);
  });

  test('TC-DEMO-002: invalid credentials show an error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('invalid-user');
    await page.locator('#password').fill('wrong-password');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.flash.error')).toContainText('Your username is invalid');
  });
});
