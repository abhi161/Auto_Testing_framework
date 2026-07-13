# Test Execution Report — demo — 2026-07-12

## Summary

| Metric        | Value                  |
|---------------|------------------------|
| **Total**     | 2                      |
| **Passed**    | 2                      |
| **Failed**    | 0                      |
| **Flaky**     | 0                      |
| **Skipped**   | 0                      |
| **Pass Rate** | **100%**               |
| **Duration**  | 24.4 s (wall-clock)    |
| **Run Start** | 2026-07-12T12:26:45Z   |
| **Browser**   | Chromium (Desktop, 1920×1080) |
| **Target URL**| https://the-internet.herokuapp.com |

---

## Results by Suite

### `login.spec.ts` › demo: the-internet login form

| Test Case No. | Name                                              | Status   | Duration | Notes                                      |
|---------------|---------------------------------------------------|----------|----------|--------------------------------------------|
| TC-DEMO-001   | Valid credentials reach the secure area           | ✅ PASS  | 13.8 s   | Redirected to `/secure`; `.flash.success` verified |
| TC-DEMO-002   | Invalid credentials show an error                 | ✅ PASS  | 9.3 s    | `.flash.error` shown; user stayed on `/login` |

---

## Business Rule Coverage

| Business Rule | Description                                                                 | Covered By    | Result  |
|---------------|-----------------------------------------------------------------------------|---------------|---------|
| BR-001        | Valid login → redirect to `/secure` + `.flash.success` contains expected text | TC-DEMO-001   | ✅ PASS |
| BR-002        | Invalid login → stay on `/login` + `.flash.error` contains expected text    | TC-DEMO-002   | ✅ PASS |

---

## Design-Parity Score

> **N/A** — No Figma design source has been provided for this project. No `tests/design/` baselines
> exist. Design-parity scoring is deferred until a Figma URL is registered in `project-memory.md §5c`.

---

## Open Application Issues

> Sourced from `docs/issues.csv` (Status = Open).

**None.** No application defects were logged during this execution. The `docs/issues.csv` register
remains clean.

---

## Healing History

> The Test Healer was **not invoked** — all tests passed on the first run. No fixes were required.

---

## Traceability Coverage

| Test Case No. | Spec File                     | Business Rule | Source / Traceability Link                         | Traced? |
|---------------|-------------------------------|---------------|----------------------------------------------------|---------|
| TC-DEMO-001   | `tests/login.spec.ts` line 9  | BR-001        | `docs/actualtestcases.csv` row 1 · `project-memory.md §4` | ✅ 100% |
| TC-DEMO-002   | `tests/login.spec.ts` line 19 | BR-002        | `docs/actualtestcases.csv` row 2 · `project-memory.md §4` | ✅ 100% |

**Traceability coverage: 2 / 2 = 100%**

---

## Artifacts

| Artifact              | Path                                              |
|-----------------------|---------------------------------------------------|
| HTML Report           | `projects/demo/playwright-report/index.html`      |
| JSON Results          | `projects/demo/test-results.json`                 |
| Spec File             | `projects/demo/tests/login.spec.ts`               |
| Issues Register       | `projects/demo/docs/issues.csv` *(no open items)* |

---

## Verdict

> ✅ **ALL TESTS PASSED** — Pipeline closed. No handoff to the Healer required.
