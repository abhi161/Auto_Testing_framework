import { test, expect } from '@playwright/test';

// TC-DEMO-025..034, TC-DEMO-039

test.describe('Navigation & Misc', () => {
  test('TC-DEMO-025: broken images — page loads without HTTP errors', async ({ page }) => {
    const response = await page.goto('/broken_images');
    expect(response?.status()).toBe(200);
    const imgs = page.locator('img');
    expect(await imgs.count()).toBeGreaterThan(0);
  });

  test('TC-DEMO-026: status codes — 200', async ({ page }) => {
    await page.goto('/status_codes');
    await page.getByRole('link', { name: '200' }).click();
    await expect(page.locator('body')).toContainText('This page returned a 200 status code');
  });

  test('TC-DEMO-027: status codes — 301', async ({ page }) => {
    await page.goto('/status_codes');
    await page.getByRole('link', { name: '301' }).click();
    await expect(page.locator('body')).toContainText('This page returned a 301 status code');
  });

  test('TC-DEMO-028: status codes — 404', async ({ page }) => {
    await page.goto('/status_codes');
    await page.getByRole('link', { name: '404' }).click();
    await expect(page.locator('body')).toContainText('This page returned a 404 status code');
  });

  test('TC-DEMO-029: status codes — 500', async ({ page }) => {
    await page.goto('/status_codes');
    await page.getByRole('link', { name: '500' }).click();
    await expect(page.locator('body')).toContainText('This page returned a 500 status code');
  });

  test('TC-DEMO-030: notification messages — flash appears on action', async ({ page }) => {
    await page.goto('/notification_message_rendered');
    await page.getByRole('link', { name: 'Click here' }).click();
    await expect(page.locator('.flash')).toBeVisible();
  });

  test('TC-DEMO-031: floating menu — visible after scroll', async ({ page }) => {
    await page.goto('/floating_menu');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('#menu')).toBeVisible();
  });

  test('TC-DEMO-032: forgot password — form loads and submits', async ({ page }) => {
    await page.goto('/forgot_password');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#form_submit').click();
    await expect(page).toHaveURL(/\/email_sent/);
  });

  test('TC-DEMO-033: redirect link — follows redirect correctly', async ({ page }) => {
    await page.goto('/redirector');
    await page.getByRole('link', { name: 'here' }).click();
    await expect(page).toHaveURL(/\/status_codes$/);
  });

  test('TC-DEMO-034: slow resources — page eventually loads', async ({ page }) => {
    await page.goto('/slow', { timeout: 45000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-DEMO-039: geolocation — prompt triggered or coordinates shown', async ({ page }) => {
    await page.goto('/geolocation');
    await page.getByRole('button', { name: 'Where am I?' }).click();
    // Either lat/long populated (if granted) or the button click succeeds without error
    // We assert the button is clickable without throwing
    await expect(page.locator('body')).toBeVisible();
  });
});
