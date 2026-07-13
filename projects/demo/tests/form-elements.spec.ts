import { test, expect } from '@playwright/test';

// TC-DEMO-004, TC-DEMO-005, TC-DEMO-014, TC-DEMO-015

test.describe('Form Elements', () => {
  test('TC-DEMO-004: checkboxes — check and uncheck', async ({ page }) => {
    await page.goto('/checkboxes');
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(2);

    const cb1 = checkboxes.nth(0);
    const cb1Before = await cb1.isChecked();
    await cb1.click();
    expect(await cb1.isChecked()).toBe(!cb1Before);

    const cb2 = checkboxes.nth(1);
    const cb2Before = await cb2.isChecked();
    await cb2.click();
    expect(await cb2.isChecked()).toBe(!cb2Before);
  });

  test('TC-DEMO-005: dropdown — select each option', async ({ page }) => {
    await page.goto('/dropdown');
    const select = page.locator('#dropdown');
    await select.selectOption({ label: 'Option 1' });
    await expect(select).toHaveValue('1');
    await select.selectOption({ label: 'Option 2' });
    await expect(select).toHaveValue('2');
  });

  test('TC-DEMO-014: inputs — number input accepts and retains numeric value', async ({ page }) => {
    await page.goto('/inputs');
    const input = page.locator('input[type="number"]');
    await input.click();
    await input.type('42');
    await expect(input).toHaveValue('42');
  });

  test('TC-DEMO-015: key presses — keypress is recorded', async ({ page }) => {
    await page.goto('/key_presses');
    await page.locator('#target').click();
    await page.keyboard.press('A');
    await expect(page.locator('#result')).toContainText('You entered: A');
  });
});
