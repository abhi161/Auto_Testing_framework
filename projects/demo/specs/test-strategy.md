# Test Strategy — demo project

## §0. Requested Test Types (scope filter)
- **Functional / E2E** ✅ (always in scope)
- **UI Testing** ✅ (design-parity validation against attached design images)

All other categories (Accessibility, Cross-Browser, Responsive, Regression, API, Performance, Security) are **out of scope for this run**.

---

## 1. Environment

| Variable | Value |
|---|---|
| `TEST_URL` | `https://example.com/` |
| `TEST_AUTH_URL` | *(none — no authentication required)* |
| `TEST_USER` | *(none)* |
| `TEST_PASS` | *(none)* |
| `IDENTITY_PROVIDER` | *(none)* |

- **No authentication required** for `https://example.com/` — it is a publicly accessible page.
- No Cognito/Azure AD federated login applies to this project.

---

## 2. Authentication

- **Authentication type:** None — `https://example.com/` is a public page.
- No login flow, no `TEST_AUTH_URL`, no `auth.helper.ts` required.
- `auth-state.json` is not needed for this project.

---

## 3. Application Architecture (from source code analysis)

> **No application source code was provided** (`codebase/` and `src/` are absent). Architecture is derived from the attached design images and `docs/flow.json` only.

| Screen | URL / Route | Auth Required? | Notes |
|---|---|---|---|
| Screen 1 ("Screen 2") | `https://example.com/` | No | Start page |
| Screen 2 ("Home") | `https://www.iana.org/domains/reserved` (or IANA URL) | No | Reached via `More information...` link |

### Navigation Edges (from design/flow.json)
```
https://example.com/
  └─ "More information..." link ──▶ IANA Reserved Domains page
```

---

## 4. Design Source of Truth

- **Source type:** Attached design images (2 PNG files) — model read them directly.
- **Figma:** Not provided (`FIGMA_FILE_URL`/`FIGMA_FILE_KEY` absent in `.env`).
- **Access method:** Attached images (first-class source per `figma-design-validation` skill).
- **Design files:**
  - Screen 1: `docs/design/Screenshot_from_2026-07-13_12-14-01.png`
  - Screen 2: `docs/design/Screenshot_from_2026-07-13_12-14-19.png`
- **Full design spec:** `specs/design-spec.md`

### Design Spec Summary

**Screen 1 ("Screen 2") — `https://example.com/`**
- `<h1>`: `Example Domain`
- Paragraph: `This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.`
- Link: `More information...`
- Page title: `Example Domain`
- Background: white; no nav header; minimal layout

**Screen 2 ("Home") — IANA Reserved Domains page**
- Main heading: `IANA-managed Reserved Domains`
- Section headings: `Example Domains`, `Test Domains`
- IANA branding/header present
- URL is NOT `https://example.com/`

---

## 5. Business Rules

| Rule | Description |
|---|---|
| BR-001 | `example.com` is a reserved domain for illustrative use; no coordination required |
| BR-002 | The `More information...` link navigates to the IANA information page about reserved domains |

---

## 6. Test Cases

### User-provided (from `docs/flow.json`)
The flow defines 2 screens in order:
1. Open `https://example.com/` → validate against Screen 1 design
2. Click `More information...` → validate resulting page against Screen 2 design

### Derived Test Cases

#### Functional / E2E

| TC | Summary | Steps | Expected Outcome |
|---|---|---|---|
| TC-001 | Page loads successfully | Navigate to `https://example.com/` | HTTP 200, page renders |
| TC-002 | `<h1>` text matches design | Navigate to `https://example.com/` | `<h1>` text = `Example Domain` |
| TC-003 | Paragraph text matches design | Navigate to `https://example.com/` | Paragraph contains `This domain is for use in illustrative examples` |
| TC-004 | Link is present and labeled correctly | Navigate to `https://example.com/` | A link with text `More information...` exists |
| TC-005 | Clicking link navigates to IANA page | Click `More information...` | URL changes away from `example.com`; IANA heading appears |
| TC-006 | IANA page heading matches design | After click | Page contains `IANA-managed Reserved Domains` |
| TC-007 | IANA page section headings | After click | Page contains `Example Domains` and `Test Domains` sections |

#### UI / Design Parity

| TC | Summary | Design Check | Expected Value |
|---|---|---|---|
| D-01 | H1 text — Screen 1 | `h1` inner text | `Example Domain` |
| D-02 | Paragraph text — Screen 1 | First `<p>` text | Contains `This domain is for use in illustrative examples` |
| D-03 | Link label — Screen 1 | Anchor text | `More information...` |
| D-04 | Page title — Screen 1 | `document.title` | `Example Domain` |
| D-05 | Background color — Screen 1 | `body` background | White / near-white |
| D-06 | No nav header — Screen 1 | Absence of `<nav>` or header bar | Not present |
| D-07 | Main heading — Screen 2 | Heading text after navigation | `IANA-managed Reserved Domains` |
| D-08 | Example Domains section — Screen 2 | Section heading | `Example Domains` present |
| D-09 | Test Domains section — Screen 2 | Section heading | `Test Domains` present |
| D-10 | IANA branding — Screen 2 | Header/logo | Present |
| D-11 | URL changed — Screen 2 | `page.url()` | Not `https://example.com/` |

---

## Handoff to Test Planner

The Test Planner should:
1. Populate `docs/actualtestcases.csv` with TC-001 → TC-007 (Functional/E2E) and D-01 → D-11 (Design).
2. Build `specs/selectors.md` from selectors visible in the design: `h1`, `p`, `a:has-text("More information...")`.
3. Produce `specs/master-test-plan.md` with one Playwright flow: open → validate Screen 1 → click → validate Screen 2.
4. No auth helper setup required (public page).
