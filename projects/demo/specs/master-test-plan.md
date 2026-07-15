# Master Test Plan — demo project

> **Design source of truth:** 2 attached design images (stored in `docs/design/`)
> **Live app under test:** `https://example.com/`
> **Test types in scope:** Functional / E2E, UI Testing
> **Authentication:** None (public page)
> **Traceability:** Every test case maps to `docs/actualtestcases.csv` by `Test Case No.`

---

## Navigation Graph

```
[Screen 1: example.com]
  URL: https://example.com/
  Design: docs/design/Screenshot_from_2026-07-13_12-14-01.png
  │
  └─ click <a> "More information..."
       │
       ▼
[Screen 2: IANA Reserved Domains]
  URL: (IANA domain — not example.com)
  Design: docs/design/Screenshot_from_2026-07-13_12-14-19.png
```

---

## Playwright Flow Summary

ONE spec file implements both screens in order:
1. Open `https://example.com/` → run Screen 1 design-parity + functional assertions
2. Click `More information...` → run Screen 2 design-parity + functional assertions

---

## Test Cases

---

### TC-001: Page loads successfully
- **Test Type:** Functional / E2E
- **Source:** Design image `docs/design/Screenshot_from_2026-07-13_12-14-01.png` — Screen 1 is a rendered page with visible content
- **Business Rule:** BR-001 — `example.com` is a reserved domain intended to serve this page
- **Steps:**
  1. Open browser.
  2. Navigate to `https://example.com/`.
  3. Wait for `networkidle` state.
- **Expected outcome:** Page loads; HTTP 200; page content is visible; no browser error page.
- **Spec file:** `tests/demo.spec.ts`

---

### TC-002: Page title matches design
- **Test Type:** Functional / E2E
- **Source:** Design image Screen 1 — browser/tab title reads `Example Domain`
- **Business Rule:** BR-001
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Read `document.title`.
- **Expected outcome:** `document.title === 'Example Domain'`
- **Spec file:** `tests/demo.spec.ts`

---

### TC-003: H1 heading text matches design
- **Test Type:** Functional / E2E
- **Source:** Design image Screen 1 — large centered heading `Example Domain`
- **Business Rule:** BR-001
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Locate `h1`.
  3. Read text content.
- **Expected outcome:** `h1` text === `Example Domain`
- **Selector:** `h1` (tier 3 — stable semantic tag)
- **Spec file:** `tests/demo.spec.ts`

---

### TC-004: Paragraph text matches design
- **Test Type:** Functional / E2E
- **Source:** Design image Screen 1 — body paragraph with exact domain-use description
- **Business Rule:** BR-001
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Locate first visible `<p>`.
  3. Read text content.
- **Expected outcome:** Paragraph contains `This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.`
- **Selector:** `p` (first)
- **Spec file:** `tests/demo.spec.ts`

---

### TC-005: Navigation link is present and labeled correctly
- **Test Type:** Functional / E2E
- **Source:** Design image Screen 1 — a hyperlink labeled `More information...` is visible
- **Business Rule:** BR-002 — the `More information...` link navigates to IANA page
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Locate `<a>` with text matching `More information...`.
  3. Assert visibility.
- **Expected outcome:** Link with text `More information...` is visible on the page.
- **Selector:** `a:has-text("More information...")` / `getByRole('link', { name: /more information/i })`
- **Spec file:** `tests/demo.spec.ts`

---

### TC-006: Clicking 'More information...' navigates to IANA page
- **Test Type:** Functional / E2E
- **Source:** `docs/flow.json` — step 2 reached by clicking "Learn more" (design label: "More information...")
- **Business Rule:** BR-002
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Click `a:has-text("More information...")`.
  3. Wait for `networkidle`.
  4. Read `page.url()`.
- **Expected outcome:** URL after navigation is NOT `https://example.com/` — page has changed to IANA Reserved Domains page.
- **Spec file:** `tests/demo.spec.ts`

---

### TC-007: IANA page heading matches design
- **Test Type:** Functional / E2E
- **Source:** Design image Screen 2 — main heading `IANA-managed Reserved Domains`
- **Business Rule:** BR-002
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Click `More information...`.
  3. Wait for page load.
  4. Locate first `h1` or `h2`.
  5. Read text content.
- **Expected outcome:** Heading text === `IANA-managed Reserved Domains`
- **Selector:** `h1, h2` (first match)
- **Spec file:** `tests/demo.spec.ts`

---

### TC-008: IANA page contains 'Example Domains' section
- **Test Type:** Functional / E2E
- **Source:** Design image Screen 2 — section heading `Example Domains` visible
- **Business Rule:** BR-002
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Click `More information...`.
  3. Wait for load.
  4. Locate heading/text containing `Example Domains`.
- **Expected outcome:** `Example Domains` section heading is visible.
- **Selector:** `getByText('Example Domains')` or `:text("Example Domains")`
- **Spec file:** `tests/demo.spec.ts`

---

### TC-009: IANA page contains 'Test Domains' section
- **Test Type:** Functional / E2E
- **Source:** Design image Screen 2 — section heading `Test Domains` visible
- **Business Rule:** BR-002
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Click `More information...`.
  3. Wait for load.
  4. Locate heading/text containing `Test Domains`.
- **Expected outcome:** `Test Domains` section heading is visible.
- **Selector:** `getByText('Test Domains')` or `:text("Test Domains")`
- **Spec file:** `tests/demo.spec.ts`

---

### D-01: H1 text — Screen 1 design parity
- **Test Type:** UI Testing
- **Source:** Design image `docs/design/Screenshot_from_2026-07-13_12-14-01.png` — Figma node: N/A (design images, no Figma)
- **Business Rule:** N/A
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Capture `h1` inner text.
  3. Compare to design value `Example Domain`.
- **Expected outcome:** Live `h1` === `Example Domain`. Any deviation = **DEFECT** (`Failure Category: Design-Deviation`).
- **Selector:** `h1`
- **Spec file:** `tests/demo.spec.ts`

---

### D-02: Paragraph text — Screen 1 design parity
- **Test Type:** UI Testing
- **Source:** Design image Screen 1 — exact paragraph text visible
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Capture first `<p>` text.
  3. Compare to design value.
- **Expected outcome:** Paragraph text matches design exactly. Deviation = **DEFECT**.
- **Selector:** `p` (first)
- **Spec file:** `tests/demo.spec.ts`

---

### D-03: Link label — Screen 1 design parity
- **Test Type:** UI Testing
- **Source:** Design image Screen 1 — link labeled `More information...`
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Locate `<a>` element.
  3. Read visible text.
  4. Compare to `More information...`.
- **Expected outcome:** Link text === `More information...`. Deviation = **DEFECT**.
- **Selector:** `a:has-text("More information...")`
- **Spec file:** `tests/demo.spec.ts`

---

### D-04: Page title — Screen 1 design parity
- **Test Type:** UI Testing
- **Source:** Design image Screen 1 — browser tab shows `Example Domain`
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Read `document.title`.
- **Expected outcome:** `document.title === 'Example Domain'`. Deviation = **DEFECT**.
- **Spec file:** `tests/demo.spec.ts`

---

### D-05: Background color — Screen 1 design parity
- **Test Type:** UI Testing
- **Source:** Design image Screen 1 — white/light background, no coloured background
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Evaluate `getComputedStyle(document.body).backgroundColor`.
- **Expected outcome:** Background color is white (`rgb(255, 255, 255)`) or near-white. Deviation = **DEFECT**.
- **Selector:** `body` (CSS eval)
- **Spec file:** `tests/demo.spec.ts`

---

### D-06: No navigation header — Screen 1 design parity
- **Test Type:** UI Testing
- **Source:** Design image Screen 1 — minimal layout, no navigation bar or branded header visible
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Count `<nav>` elements.
  3. Verify count === 0.
- **Expected outcome:** `<nav>` count === 0. Presence of nav element = **DEFECT**.
- **Selector:** `nav`
- **Spec file:** `tests/demo.spec.ts`

---

### D-07: Main heading — Screen 2 design parity
- **Test Type:** UI Testing
- **Source:** Design image `docs/design/Screenshot_from_2026-07-13_12-14-19.png` — heading `IANA-managed Reserved Domains`
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Click `More information...`.
  3. Wait for load.
  4. Locate first `h1` or `h2`.
  5. Compare to design value.
- **Expected outcome:** Heading text === `IANA-managed Reserved Domains`. Deviation = **DEFECT**.
- **Selector:** `h1, h2` (first)
- **Spec file:** `tests/demo.spec.ts`

---

### D-08: Example Domains section — Screen 2 design parity
- **Test Type:** UI Testing
- **Source:** Design image Screen 2 — section heading `Example Domains`
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Click `More information...`.
  3. Wait for load.
  4. Locate element containing `Example Domains`.
  5. Assert visible.
- **Expected outcome:** `Example Domains` is visible. Absence = **DEFECT**.
- **Spec file:** `tests/demo.spec.ts`

---

### D-09: Test Domains section — Screen 2 design parity
- **Test Type:** UI Testing
- **Source:** Design image Screen 2 — section heading `Test Domains`
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Click `More information...`.
  3. Wait for load.
  4. Locate element containing `Test Domains`.
  5. Assert visible.
- **Expected outcome:** `Test Domains` is visible. Absence = **DEFECT**.
- **Spec file:** `tests/demo.spec.ts`

---

### D-10: IANA branding/header — Screen 2 design parity
- **Test Type:** UI Testing
- **Source:** Design image Screen 2 — IANA branded header visible at top of page
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Click `More information...`.
  3. Wait for load.
  4. Check for `header` element or IANA text/logo.
- **Expected outcome:** IANA branding (header element or text/image referencing IANA) is present. Absence = **DEFECT**.
- **Selector:** `header`, or `:text("IANA")` fallback
- **Spec file:** `tests/demo.spec.ts`

---

### D-11: URL changed after navigation — Screen 2 design parity
- **Test Type:** UI Testing
- **Source:** `docs/flow.json` + design — Screen 2 is a different page (IANA), not example.com
- **Steps:**
  1. Navigate to `https://example.com/`.
  2. Click `More information...`.
  3. Wait for load.
  4. Read `page.url()`.
- **Expected outcome:** `page.url()` does NOT contain `example.com`. Remaining on example.com = **DEFECT**.
- **Spec file:** `tests/demo.spec.ts`

---

## Traceability Matrix

| Test Case No. | Summary | Test Type | Source | Business Rule | Spec File |
|---|---|---|---|---|---|
| TC-001 | Page loads successfully | Functional / E2E | Design Screen 1 | BR-001 | tests/demo.spec.ts |
| TC-002 | Page title matches design | Functional / E2E | Design Screen 1 | BR-001 | tests/demo.spec.ts |
| TC-003 | H1 heading text matches design | Functional / E2E | Design Screen 1 | BR-001 | tests/demo.spec.ts |
| TC-004 | Paragraph text matches design | Functional / E2E | Design Screen 1 | BR-001 | tests/demo.spec.ts |
| TC-005 | Navigation link present and labeled | Functional / E2E | Design Screen 1 | BR-002 | tests/demo.spec.ts |
| TC-006 | Clicking link navigates to IANA page | Functional / E2E | flow.json + design | BR-002 | tests/demo.spec.ts |
| TC-007 | IANA page heading matches design | Functional / E2E | Design Screen 2 | BR-002 | tests/demo.spec.ts |
| TC-008 | IANA page 'Example Domains' section | Functional / E2E | Design Screen 2 | BR-002 | tests/demo.spec.ts |
| TC-009 | IANA page 'Test Domains' section | Functional / E2E | Design Screen 2 | BR-002 | tests/demo.spec.ts |
| D-01 | H1 text — Screen 1 parity | UI Testing | Design Screen 1 image | — | tests/demo.spec.ts |
| D-02 | Paragraph text — Screen 1 parity | UI Testing | Design Screen 1 image | — | tests/demo.spec.ts |
| D-03 | Link label — Screen 1 parity | UI Testing | Design Screen 1 image | — | tests/demo.spec.ts |
| D-04 | Page title — Screen 1 parity | UI Testing | Design Screen 1 image | — | tests/demo.spec.ts |
| D-05 | Background color — Screen 1 parity | UI Testing | Design Screen 1 image | — | tests/demo.spec.ts |
| D-06 | No nav header — Screen 1 parity | UI Testing | Design Screen 1 image | — | tests/demo.spec.ts |
| D-07 | Main heading — Screen 2 parity | UI Testing | Design Screen 2 image | — | tests/demo.spec.ts |
| D-08 | Example Domains section — Screen 2 parity | UI Testing | Design Screen 2 image | — | tests/demo.spec.ts |
| D-09 | Test Domains section — Screen 2 parity | UI Testing | Design Screen 2 image | — | tests/demo.spec.ts |
| D-10 | IANA branding — Screen 2 parity | UI Testing | Design Screen 2 image | — | tests/demo.spec.ts |
| D-11 | URL changed — Screen 2 parity | UI Testing | flow.json + design | — | tests/demo.spec.ts |

---

## UI Map

### Screens

| Route | Purpose | Key Elements | States |
|---|---|---|---|
| `https://example.com/` | Reserved domain start page (Screen 1) | `h1` "Example Domain", `p` description, `a` "More information..." | Single state (static HTML) |
| IANA Reserved Domains page | Domain reservation info page (Screen 2) | Heading "IANA-managed Reserved Domains", sections "Example Domains" / "Test Domains", IANA header | Single state (static HTML) |

### Navigation Graph

```
https://example.com/  ──[click a:has-text("More information...")]──▶  IANA Reserved Domains page
```

### Discrepancies vs Source Code Analysis
- No source code was provided (`codebase/` and `src/` absent).
- All routes derived from design images and `docs/flow.json`.
- Selectors derive from semantic HTML inferred from design; live confirmation at execution time.
