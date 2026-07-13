import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

// TC-DEMO-009, TC-DEMO-010

test.describe('Files — Download & Upload', () => {
  test('TC-DEMO-009: file download — link is present and downloadable', async ({ page }) => {
    await page.goto('/download');
    const links = page.locator('a[href*="/download/"]');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('TC-DEMO-010: file upload — upload a file successfully', async ({ page }) => {
    // Create a temporary file to upload
    const tmpFile = path.join(os.tmpdir(), 'playwright-upload-test.txt');
    fs.writeFileSync(tmpFile, 'Playwright test upload content');

    await page.goto('/upload');
    await page.locator('input[type="file"]').setInputFiles(tmpFile);
    await page.locator('#file-submit').click();
    await expect(page.getByRole('heading', { name: /File Uploaded!/i })).toBeVisible();

    fs.unlinkSync(tmpFile);
  });
});
