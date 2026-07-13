import { test, expect } from '@playwright/test';

test('TC-001: homepage heading text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Example Domain');
});

test('TC-002: heading is present', async ({ page }) => {
  await page.goto('/');
  // Healer fix: replaced wrong selector '#main-title' with 'h1'.
  // The page renders a plain <h1> with no id attribute; '#main-title' never existed.
  // Classification: TEST-CASE BUG (selector) — NOT an application defect.
  await expect(page.locator('h1')).toHaveText('Example Domain');
});
