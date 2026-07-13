---
description: "Playwright test authoring rules: selector priority, shared session, deterministic waits and viewport. Apply when creating or editing Playwright specs."
applyTo: "tests/**,**/*.spec.ts,playwright.config.ts"
---

# Playwright Authoring Rules

## 1. Selector priority (use in order)
1. `data-testid="..."` — most stable
2. `getByRole(...)` / `aria-label="..."` — semantic, accessible
3. stable `id="..."` (not auto-generated)
4. `getByText(...)`
5. ⚠️ class names — fragile, avoid
6. ❌ brittle XPath / deep CSS — never

Prefer selectors already recorded in [specs/project-memory.md](../../specs/project-memory.md) §5.

## 2. Shared authenticated session
```typescript
let sharedPage: Page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  sharedPage = await context.newPage();
  await new AuthHelper(sharedPage).login();
});

test('example', async () => {
  await sharedPage.goto('/route'); // reuse session, do NOT re-login
});
```
Or rely on `storageState: 'auth-state.json'` configured in `playwright.config.ts`.

## 3. Deterministic waits
- Wait for concrete conditions: `waitForLoadState('networkidle')`, `locator.waitFor({ state: 'visible' })`.
- Do **not** use arbitrary `waitForTimeout(...)` as a substitute for real waits.

## 4. Deterministic viewport
- Fixed viewport `1920×1080`, `deviceScaleFactor: 1`, window maximized (set in `playwright.config.ts`).
- Use `fullPage: true` for exploration screenshots so captures are consistent.

## 5. Traceability
Every test references its source file + line and any business rule it enforces (see the
`test-traceability` skill).

## 6. One test at a time
Generate and verify a single test before starting the next.
