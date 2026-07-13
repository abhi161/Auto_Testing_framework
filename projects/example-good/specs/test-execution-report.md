# Test Execution Report — example-good — 2026-07-13

## Summary

| Metric       | Value |
|--------------|-------|
| Total tests  | 6     |
| Passed       | 6     |
| Failed       | 0     |
| Flaky        | 0     |
| Skipped      | 0     |
| **Pass rate**| **100 %** |

- **Suite:** `projects/example-good/tests/homepage.spec.ts`
- **Browser:** Chromium (Playwright 1.61.1)
- **Base URL:** `https://example.com`
- **Run date/time:** 2026-07-13T04:39:03Z
- **Total duration:** ~544 ms

---

## Results by Suite

| Test Case No. | Name | Status | Duration | Notes |
|---------------|------|--------|----------|-------|
| TC-001 | Page loads successfully (HTTP 200 + title contains "Example Domain") | ✅ PASS | 78 ms | BR-001 |
| TC-002 | H1 heading text is exactly "Example Domain" | ✅ PASS | 102 ms | BR-001 |
| TC-003 | First paragraph contains the documentation-examples sentence | ✅ PASS | 92 ms | BR-002 |
| TC-004 | First paragraph contains the operations-avoidance sentence | ✅ PASS | 102 ms | BR-003 |
| TC-005 | "Learn more" link is visible | ✅ PASS | 90 ms | BR-004 |
| TC-006 | "Learn more" link href is a non-empty absolute URL | ✅ PASS | 80 ms | BR-004 |

---

## Design-Parity Score

Design source of truth: attached design image (`docs/design/homepage.png`)

| Check | Expected (design) | Actual (live app) | Result |
|-------|--------------------|-------------------|--------|
| H1 text | "Example Domain" | "Example Domain" | ✅ Match |
| Paragraph sentence 1 | "This domain is for use in documentation examples without needing permission." | Present | ✅ Match |
| Paragraph sentence 2 | "Avoid use in operations." | Present | ✅ Match |
| "Learn more" link visible | Yes, muted blue/underlined | Present and visible | ✅ Match |
| "Learn more" href | Absolute `https://` URL | `https://www.iana.org/domains/reserved` | ✅ Match |

**Design-parity score: 5 / 5 checks passed — 0 deviations found.**

---

## Open Application Issues

None. `docs/issues.csv` has no open defects for this project.

---

## Healing History

The Test Healer was **not invoked** — all tests passed on first execution.

> A prior run (during the Generator phase) failed with `Cannot navigate to invalid URL` — this was a **test-side environment issue** (tests executed from the wrong working directory, so `TEST_URL` was unset). Resolved by running from the workspace root with `TEST_PROJECT=example-good`. No application defect; not logged to `docs/issues.csv`.

---

## Traceability Coverage

| Test Case | Business Rule(s) | Source File | Covered |
|-----------|-----------------|-------------|---------|
| TC-001 | BR-001 | `homepage.spec.ts:38` | ✅ |
| TC-002 | BR-001 | `homepage.spec.ts:47` | ✅ |
| TC-003 | BR-002 | `homepage.spec.ts:56` | ✅ |
| TC-004 | BR-003 | `homepage.spec.ts:68` | ✅ |
| TC-005 | BR-004 | `homepage.spec.ts:79` | ✅ |
| TC-006 | BR-004 | `homepage.spec.ts:86` | ✅ |

**Traceability coverage: 6 / 6 test cases (100 %) — all linked to confirmed BRs.**

---

## Artifacts

- **Test file:** `projects/example-good/tests/homepage.spec.ts`
- **HTML report:** `playwright-report/` (generated at workspace root)
- **JSON results:** emitted to stdout via `--reporter=list,json`
- **Screenshots:** `projects/example-good/test-results/` (one per test, captured on finish)
- **Design baseline:** `docs/design/homepage.png`
