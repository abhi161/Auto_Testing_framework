import { test, expect } from '@playwright/test';

// TC-DEMO-019, TC-DEMO-020

test.describe('Frames', () => {
  test('TC-DEMO-019: nested frames load correctly', async ({ page }) => {
    await page.goto('/nested_frames');

    // Top frameset contains left, middle, right frames
    const topFrame = page.frame({ name: 'frame-top' });
    expect(topFrame).not.toBeNull();

    const leftFrame = page.frame({ name: 'frame-left' });
    const middleFrame = page.frame({ name: 'frame-middle' });
    const rightFrame = page.frame({ name: 'frame-right' });
    expect(leftFrame).not.toBeNull();
    expect(middleFrame).not.toBeNull();
    expect(rightFrame).not.toBeNull();

    const bottomFrame = page.frame({ name: 'frame-bottom' });
    expect(bottomFrame).not.toBeNull();
    const bottomBody = await bottomFrame!.locator('body').innerText();
    expect(bottomBody.trim().length).toBeGreaterThan(0);
  });

  test('TC-DEMO-020: iFrame — type text into TinyMCE editor', async ({ page }) => {
    await page.goto('/iframe');
    const iframeLocator = page.frameLocator('#mce_0_ifr');
    const body = iframeLocator.locator('body#tinymce');
    await body.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Hello Playwright');
    await expect(body).toContainText('Hello Playwright');
  });
});
