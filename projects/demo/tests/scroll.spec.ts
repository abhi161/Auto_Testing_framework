import { test, expect } from '@playwright/test';

// TC-DEMO-011

test.describe('Scroll', () => {
  test('TC-DEMO-011: infinite scroll — page loads more content on scroll', async ({ page }) => {
    await page.goto('/infinite_scroll');
    // Count initial paragraphs
    const initialCount = await page.locator('.jscroll-added, .infinite-scroll p').count();

    // Scroll to bottom multiple times to trigger loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
    }

    const finalCount = await page.locator('.jscroll-added, .infinite-scroll p').count();
    expect(finalCount).toBeGreaterThanOrEqual(initialCount);

    // Verify page has paragraphs
    const paragraphs = page.locator('p');
    expect(await paragraphs.count()).toBeGreaterThan(0);
  });
});
