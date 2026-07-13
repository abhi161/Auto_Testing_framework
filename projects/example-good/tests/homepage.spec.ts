/**
 * Homepage functional / E2E tests — example-good project
 *
 * Source of truth: docs/design/homepage.png (attached design image) + docs/actualtestcases.csv
 * Business rules: BR-001, BR-002, BR-003, BR-004
 *
 * TC-001  Page loads successfully (HTTP 200 + title)
 * TC-002  H1 heading text exact match
 * TC-003  Paragraph first sentence present
 * TC-004  Paragraph second sentence present
 * TC-005  Learn more link is visible
 * TC-006  Learn more link href is a valid absolute URL
 *
 * NOTE: Expected values are derived from the design image / CSV — NOT from the live app.
 * If a test fails because the live app deviates from the design, leave it failing (it is a DEFECT).
 */

import { test, expect } from '@playwright/test';

// ─── shared page (no auth required — public page) ────────────────────────────
let sharedPage: import('@playwright/test').Page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  sharedPage = await context.newPage();
  const response = await sharedPage.goto('/', { waitUntil: 'networkidle' });

  // TC-001 guard: capture the HTTP status here so the single navigation is reused
  // by all tests; the assertion lives inside TC-001 below.
  (sharedPage as any).__initialStatus = response?.status();
});

test.afterAll(async () => {
  await sharedPage.context().close();
});

// ─── TC-001 ───────────────────────────────────────────────────────────────────
test('TC-001 — page loads successfully (HTTP 200 + title contains "Example Domain")', async () => {
  // Expected: HTTP 200  (BR-001)
  expect((sharedPage as any).__initialStatus).toBe(200);

  // Expected: title contains "Example Domain" — from design / BR-001
  await expect(sharedPage).toHaveTitle(/Example Domain/);
});

// ─── TC-002 ───────────────────────────────────────────────────────────────────
test('TC-002 — H1 heading text is exactly "Example Domain"', async () => {
  // Expected exact text from design image heading — BR-001
  const h1 = sharedPage.locator('h1');
  await expect(h1).toBeVisible();
  const text = await h1.textContent();
  expect(text?.trim()).toBe('Example Domain');
});

// ─── TC-003 ───────────────────────────────────────────────────────────────────
test('TC-003 — first paragraph contains the documentation-examples sentence', async () => {
  // Expected substring from design image — BR-002
  const expectedSentence =
    'This domain is for use in documentation examples without needing permission.';

  const paragraph = sharedPage.locator('p').first();
  await expect(paragraph).toBeVisible();
  const text = await paragraph.textContent();
  expect(text).toContain(expectedSentence);
});

// ─── TC-004 ───────────────────────────────────────────────────────────────────
test('TC-004 — first paragraph contains the operations-avoidance sentence', async () => {
  // Expected substring from design image — BR-003
  const expectedSentence = 'Avoid use in operations.';

  const paragraph = sharedPage.locator('p').first();
  await expect(paragraph).toBeVisible();
  const text = await paragraph.textContent();
  expect(text).toContain(expectedSentence);
});

// ─── TC-005 ───────────────────────────────────────────────────────────────────
test('TC-005 — "Learn more" link is visible', async () => {
  // Expected: a link labelled exactly "Learn more" is rendered and visible — BR-004
  const learnMoreLink = sharedPage.getByRole('link', { name: 'Learn more' });
  await expect(learnMoreLink).toBeVisible();
});

// ─── TC-006 ───────────────────────────────────────────────────────────────────
test('TC-006 — "Learn more" link href is a non-empty absolute URL', async () => {
  // Expected: href is an absolute URL (starts with http:// or https://) — BR-004
  const learnMoreLink = sharedPage.getByRole('link', { name: 'Learn more' });
  const href = await learnMoreLink.getAttribute('href');

  expect(href).toBeTruthy();
  expect(href).toMatch(/^https?:\/\/.+/);
});
