# Master Test Plan — acme
_Produced by: Test Planner | 2026-07-13_
_Traceability: every TC traces to a Business Rule (BR-###) and `docs/actualtestcases.csv` row._

---

## Traceability Matrix

| TC # | Summary | Type | BR | Selector(s) | Spec File |
|---|---|---|---|---|---|
| TC-001 | Home — page title correct | Functional/E2E | BR-001 | `document.title` | `tests/acme.spec.ts` |
| TC-002 | Home — h1 text matches design | UI Testing | BR-001 | `h1` | `tests/acme.spec.ts` |
| TC-003 | Home — body paragraph matches design | UI Testing | BR-002 | `p` (first) | `tests/acme.spec.ts` |
| TC-004 | Home — "Learn more" link present & visible | Functional/E2E | BR-003 | `a:has-text("Learn more")` | `tests/acme.spec.ts` |
| TC-005 | Home — background colour = #eee | UI Testing | BR-001 | `document.body` (computedStyle) | `tests/acme.spec.ts` |
| TC-006 | Home — NO `<header>` present | UI Testing | BR-004 | `header` | `tests/acme.spec.ts` |
| TC-007 | Home — NO `<nav>` present | UI Testing | BR-004 | `nav` | `tests/acme.spec.ts` |
| TC-008 | Home — NO `<footer>` present | UI Testing | BR-004 | `footer` | `tests/acme.spec.ts` |
| TC-009 | Navigate via "Learn more" → Screen 2 loads | Functional/E2E | BR-005 | `a:has-text("Learn more")` → `h1` | `tests/acme.spec.ts` |
| TC-010 | Screen 2 — h1 = "Example Domains" | UI Testing | BR-005 | `h1` | `tests/acme.spec.ts` |
| TC-011 | Screen 2 — top-nav 4 items in order | UI Testing | BR-006 | `nav a` | `tests/acme.spec.ts` |
| TC-012 | Screen 2 — RFC 2606 link present | UI Testing | BR-009 | `a:has-text("RFC 2606")` | `tests/acme.spec.ts` |
| TC-013 | Screen 2 — RFC 6761 link present | UI Testing | BR-009 | `a:has-text("RFC 6761")` | `tests/acme.spec.ts` |
| TC-014 | Screen 2 — "Further Reading" heading present | UI Testing | BR-007 | `h2` | `tests/acme.spec.ts` |
| TC-015 | Screen 2 — "IANA-managed Reserved Domains" bullet present | UI Testing | BR-007 | `a:has-text("IANA-managed Reserved Domains")` | `tests/acme.spec.ts` |
| TC-016 | Screen 2 — "Last revised 2017-05-13." present | UI Testing | BR-010 | `text=Last revised 2017-05-13.` | `tests/acme.spec.ts` |
| TC-017 | Screen 2 — footer "Privacy Policy" link | UI Testing | BR-008 | `a:has-text("Privacy Policy")` | `tests/acme.spec.ts` |
| TC-018 | Screen 2 — footer "Terms of Service" link | UI Testing | BR-008 | `a:has-text("Terms of Service")` | `tests/acme.spec.ts` |

---

## Detailed Test Cases

### TC-001: Home — page title is correct
- **Test Type:** Functional / E2E
- **Source:** Static HTML `<title>` of `https://example.com/`
- **Business Rule:** BR-001 — Home `<h1>` MUST be exactly `Example Domain`
- **Design Source:** Screen 1 — `docs/design/Screenshot_from_2026-07-13_12-14-01.png`
- **Steps:**
  1. Navigate to `https://example.com/`
  2. Read `document.title`
- **Expected outcome:** `"Example Domain"`
- **Selector:** `document.title` (JS evaluate)
- **Confirmed live:** ✅ = `"Example Domain"`

---

### TC-002: Home — h1 text matches design
- **Test Type:** UI Testing
- **Source:** `<h1>` element in `https://example.com/` HTML
- **Business Rule:** BR-001
- **Design Source:** Screen 1 image — h1 reads `"Example Domain"` (bold, dark text, left-aligned)
- **Steps:**
  1. Navigate to `https://example.com/`
  2. Assert `h1` text content equals `"Example Domain"`
- **Expected outcome:** `h1` text = `"Example Domain"`
- **Selector:** `h1`
- **Confirmed live:** ✅

---

### TC-003: Home — body paragraph text matches design
- **Test Type:** UI Testing
- **Source:** `<p>` in `https://example.com/`
- **Business Rule:** BR-002
- **Design Source:** Screen 1 image — paragraph below h1
- **Steps:**
  1. Navigate to `https://example.com/`
  2. Assert first `<p>` text equals the design copy exactly
- **Expected outcome:** `"This domain is for use in documentation examples without needing permission. Avoid use in operations."`
- **Selector:** `p` (first)
- **Confirmed live:** ✅

---

### TC-004: Home — "Learn more" link is present and visible
- **Test Type:** Functional / E2E
- **Source:** `<a>` element in home page HTML
- **Business Rule:** BR-003
- **Design Source:** Screen 1 — blue underlined "Learn more" link
- **Steps:**
  1. Navigate to `https://example.com/`
  2. Locate `a:has-text("Learn more")`
  3. Assert element is visible
- **Expected outcome:** Link visible; text = `"Learn more"`; href = `"https://iana.org/domains/example"`
- **Selector:** `a:has-text("Learn more")`
- **Confirmed live:** ✅ text confirmed as "Learn more" (NOT "More information")

---

### TC-005: Home — background colour matches design (#eeeeee)
- **Test Type:** UI Testing
- **Source:** CSS of `https://example.com/` — body background
- **Business Rule:** BR-001 (visual design)
- **Design Source:** Screen 1 — grey (#eee) background
- **Steps:**
  1. Navigate to `https://example.com/`
  2. Evaluate `getComputedStyle(document.body).backgroundColor`
- **Expected outcome:** `"rgb(238, 238, 238)"`
- **Confirmed live:** ✅ = `"rgb(238, 238, 238)"`

---

### TC-006: Home — NO `<header>` element present
- **Test Type:** UI Testing
- **Source:** DOM of `https://example.com/`
- **Business Rule:** BR-004
- **Design Source:** Screen 1 — no header visible anywhere
- **Steps:**
  1. Navigate to `https://example.com/`
  2. Count `header` elements
- **Expected outcome:** count = 0 (DEFECT if > 0)
- **Confirmed live:** ✅ count = 0

---

### TC-007: Home — NO `<nav>` element present
- **Test Type:** UI Testing
- **Source:** DOM of `https://example.com/`
- **Business Rule:** BR-004
- **Design Source:** Screen 1 — no navigation bar
- **Steps:**
  1. Navigate to `https://example.com/`
  2. Count `nav` elements
- **Expected outcome:** count = 0
- **Confirmed live:** ✅ count = 0

---

### TC-008: Home — NO `<footer>` element present
- **Test Type:** UI Testing
- **Source:** DOM of `https://example.com/`
- **Business Rule:** BR-004
- **Design Source:** Screen 1 — no footer
- **Steps:**
  1. Navigate to `https://example.com/`
  2. Count `footer` elements
- **Expected outcome:** count = 0
- **Confirmed live:** ✅ count = 0

---

### TC-009: Navigate via "Learn more" → Screen 2 loads
- **Test Type:** Functional / E2E
- **Source:** `<a href="https://iana.org/domains/example">Learn more</a>` — same tab
- **Business Rule:** BR-005
- **Design Source:** Screen 2 — `docs/design/Screenshot_from_2026-07-13_12-14-19.png`
- **Steps:**
  1. Navigate to `https://example.com/`
  2. Click `a:has-text("Learn more")`
  3. Wait for `networkidle`
  4. Assert `h1` text
- **Expected outcome:** URL = `https://www.iana.org/help/example-domains`; h1 = `"Example Domains"`
- **Navigation mode:** same-tab (no `target` attribute confirmed live)
- **Confirmed live:** ✅ URL and h1 confirmed

---

### TC-010: Screen 2 — h1 = "Example Domains"
- **Test Type:** UI Testing
- **Source:** `<h1>` on IANA page
- **Business Rule:** BR-005
- **Design Source:** Screen 2 — h1 reads "Example Domains"
- **Steps:**
  1. Navigate to Screen 2 (via TC-009)
  2. Assert `h1` text = `"Example Domains"`
- **Expected outcome:** `"Example Domains"`
- **Confirmed live:** ✅

---

### TC-011: Screen 2 — top-nav has exactly 4 items in correct order
- **Test Type:** UI Testing
- **Source:** IANA page `<nav>` element
- **Business Rule:** BR-006
- **Design Source:** Screen 2 — top-right nav: Domains | Protocols | Numbers | About
- **Steps:**
  1. Navigate to Screen 2
  2. Collect all `nav a` text content
  3. Assert count = 4 and texts = ["Domains","Protocols","Numbers","About"] in that order
- **Expected outcome:** 4 nav items; exact order: Domains, Protocols, Numbers, About
- **Selector:** `nav a`
- **Confirmed live:** ✅ (4 items visible in screenshot)

---

### TC-012: Screen 2 — RFC 2606 link present in body
- **Test Type:** UI Testing
- **Source:** IANA page body
- **Business Rule:** BR-009
- **Design Source:** Screen 2 — "RFC 2606" appears as blue hyperlink in first paragraph
- **Steps:**
  1. Navigate to Screen 2
  2. Assert `a:has-text("RFC 2606")` is visible
- **Expected outcome:** RFC 2606 link visible; count = 1
- **Confirmed live:** ✅

---

### TC-013: Screen 2 — RFC 6761 link present in body
- **Test Type:** UI Testing
- **Source:** IANA page body
- **Business Rule:** BR-009
- **Design Source:** Screen 2 — "RFC 6761" appears as blue hyperlink in first paragraph
- **Steps:**
  1. Navigate to Screen 2
  2. Assert `a:has-text("RFC 6761")` is visible
- **Expected outcome:** RFC 6761 link visible; count = 1
- **Confirmed live:** ✅

---

### TC-014: Screen 2 — "Further Reading" section heading present
- **Test Type:** UI Testing
- **Source:** IANA page `<h2>`
- **Business Rule:** BR-007
- **Design Source:** Screen 2 — "Further Reading" bold heading
- **Steps:**
  1. Navigate to Screen 2
  2. Assert `h2` text = `"Further Reading"`
- **Expected outcome:** h2 visible with text "Further Reading"
- **Confirmed live:** ✅ (only h2 on page)

---

### TC-015: Screen 2 — "IANA-managed Reserved Domains" bullet link present
- **Test Type:** UI Testing
- **Source:** IANA page bullet list under "Further Reading"
- **Business Rule:** BR-007
- **Design Source:** Screen 2 — bullet link below "Further Reading"
- **Steps:**
  1. Navigate to Screen 2
  2. Assert `a:has-text("IANA-managed Reserved Domains")` is visible
- **Expected outcome:** Link present and visible in a list item
- **Confirmed live:** ✅

---

### TC-016: Screen 2 — "Last revised 2017-05-13." text present
- **Test Type:** UI Testing
- **Source:** IANA page footer/body
- **Business Rule:** BR-010
- **Design Source:** Screen 2 — small grey text "Last revised 2017-05-13." above footer
- **Steps:**
  1. Navigate to Screen 2
  2. Assert `text=Last revised 2017-05-13.` is visible
- **Expected outcome:** Text "Last revised 2017-05-13." visible
- **Confirmed live:** ✅

---

### TC-017: Screen 2 — footer "Privacy Policy" link present
- **Test Type:** UI Testing
- **Source:** IANA page footer
- **Business Rule:** BR-008
- **Design Source:** Screen 2 — "Privacy Policy" link in page footer
- **Steps:**
  1. Navigate to Screen 2
  2. Assert `a:has-text("Privacy Policy")` is visible
- **Expected outcome:** Privacy Policy link visible; count = 1
- **Confirmed live:** ✅

---

### TC-018: Screen 2 — footer "Terms of Service" link present
- **Test Type:** UI Testing
- **Source:** IANA page footer
- **Business Rule:** BR-008
- **Design Source:** Screen 2 — "Terms of Service" link in page footer
- **Steps:**
  1. Navigate to Screen 2
  2. Assert `a:has-text("Terms of Service")` is visible
- **Expected outcome:** Terms of Service link visible; count = 1
- **Confirmed live:** ✅

---

## Design Deviation Log
_Deviations discovered by comparing live app against design images during exploration._

| # | Screen | Element | Design expected | Live actual | Verdict |
|---|---|---|---|---|---|
| — | Home | All checked elements | See TC-001–008 | All match | ✅ No deviations on Home |
| — | Screen 2 | All checked elements | See TC-009–018 | All match | ✅ No deviations on Screen 2 |

> No defects detected at exploration time. The Generator will run assertions; any runtime assertion failure = defect.

---

## Navigation Graph (confirmed)

```
[Home: https://example.com/]
  └── a("Learn more") [same tab; no target attr]
      ──► [Screen 2: https://www.iana.org/help/example-domains]
```
