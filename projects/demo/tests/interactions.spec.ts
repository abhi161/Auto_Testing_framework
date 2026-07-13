import { test, expect } from '@playwright/test';

// TC-DEMO-012, TC-DEMO-013, TC-DEMO-035, TC-DEMO-036, TC-DEMO-037

test.describe('Interactions', () => {
  test('TC-DEMO-012: drag and drop — columns swap', async ({ page }) => {
    await page.goto('/drag_and_drop');
    const colA = page.locator('#column-a');
    const colB = page.locator('#column-b');
    const headerA = await colA.locator('header').innerText();
    const headerB = await colB.locator('header').innerText();

    await colA.dragTo(colB);

    // After drag, headers should swap
    await expect(colA.locator('header')).toHaveText(headerB);
    await expect(colB.locator('header')).toHaveText(headerA);
  });

  test('TC-DEMO-013: hovers — reveal hidden caption on hover', async ({ page }) => {
    await page.goto('/hovers');
    const figures = page.locator('.figure');
    const firstFigure = figures.first();
    await firstFigure.hover();
    const caption = firstFigure.locator('.figcaption');
    await expect(caption).toBeVisible();
    await expect(caption).toContainText('user');
  });

  test('TC-DEMO-035: add/remove elements — add then remove element', async ({ page }) => {
    await page.goto('/add_remove_elements/');
    await page.getByRole('button', { name: 'Add Element' }).click();
    const deleteBtn = page.getByRole('button', { name: 'Delete' });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await expect(deleteBtn).toHaveCount(0);
  });

  test('TC-DEMO-036: multiple windows — opens new window', async ({ page, context }) => {
    await page.goto('/windows');
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Click Here' }).click(),
    ]);
    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL(/\/windows\/new/);
    await expect(newPage.getByRole('heading', { name: 'New Window' })).toBeVisible();
  });

  test('TC-DEMO-037: exit intent — modal appears on mouse leave', async ({ page }) => {
    await page.goto('/exit_intent');
    // Simulate mouse leaving the viewport via JS dispatch
    await page.evaluate(() => {
      const e = new MouseEvent('mouseleave', { bubbles: true, cancelable: true, clientY: 0 });
      document.dispatchEvent(e);
    });
    await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });
  });
});
