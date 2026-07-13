# Test Analysis — healer-test — 2025-07-14

## Execution Summary (post-heal)

| Metric | Value |
|---|---|
| Total tests | 2 |
| Passed | 2 |
| Failed | 0 |
| Flaky | 0 |
| Skipped | 0 |
| Pass rate | 100% |

---

## Results Table

| Test Case No. | Test Name | Status | Duration | Error Summary |
|---|---|---|---|---|
| TC-001 | homepage heading text | ✅ PASS | 340ms | — |
| TC-002 | heading is present | ✅ PASS | 300ms | — |

---

## Healer Fix Record

### TC-002 — heading is present

**Classification:** TEST-CASE BUG (selector) — **NOT** an application defect.

**Root cause:** Generator used selector `#main-title`, but the live page (`https://example.com`)
renders `<h1>Example Domain</h1>` — a plain `<h1>` with **no `id` attribute**. No element with
`id="main-title"` exists on the page.

**Fix applied (`tests/homepage.spec.ts` line 14):**
```diff
- await expect(page.locator('#main-title')).toHaveText('Example Domain');
+ await expect(page.locator('h1')).toHaveText('Example Domain');
```

**Confirmed:** Suite re-run → 2/2 passed.  
**Logged to `docs/issues.csv`:** No — this is a test-side bug, not an application defect.

---

## Application Defects Logged (docs/issues.csv)

**None.** No application defects found.
