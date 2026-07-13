# Test Strategy — example-good

> **Context Analyst output** — produced from attached design image (1 PNG), project `.env`, source-code
> analysis, and `specs/project-memory.md`. Hand off to Test Planner when approved.

---

## §0 — Requested test types (scope filter)

| Category | In scope? |
|---|---|
| **Functional / E2E** | ✅ Yes (always) |
| Visual / Design Parity | ❌ Not requested this run |
| Accessibility (a11y) | ❌ Not requested this run |
| Cross-Browser | ❌ Not requested this run |
| Responsive / Mobile | ❌ Not requested this run |
| Regression | ❌ Not requested this run |
| API / Integration | ❌ Not requested this run |
| Performance | ❌ Not requested this run |
| Security (baseline) | ❌ Not requested this run |

---

## §1 — Environment

| Variable | Value |
|---|---|
| `TEST_URL` | `https://example.com` |
| `TEST_AUTH_URL` | _(not applicable — public page)_ |
| `TEST_USER` | _(not applicable)_ |
| `TEST_PASS` | _(not applicable)_ |
| `IDENTITY_PROVIDER` | _(not applicable)_ |

- Source: `projects/example-good/.env` + confirmed in `specs/project-memory.md` §1
- No prior URL override is valid; `TEST_URL=https://example.com` is the authoritative target.

---

## §2 — Authentication

- **Type:** None — `https://example.com` is a fully public, unauthenticated static page.
- **OAuth / Azure AD:** Not applicable.
- **`tests/helpers/auth.helper.ts`:** Present (from template) but unused.
- **Login flow / selectors:** N/A.

---

## §3 — Application Architecture (source-code analysis)

| Property | Value |
|---|---|
| Framework | Static HTML — no JavaScript framework, no SPA router |
| Server | IANA / ICANN operated static host |
| Build tooling | None |

### Routes table

| Route | Component / Page | Auth required? |
|---|---|---|
| `/` | Static homepage (`<h1>` + `<p>` + `<a>`) | ❌ No |

### Top-level elements (from design image — static analysis)

| Element | Selector | Notes |
|---|---|---|
| Page `<h1>` | `h1` | Must contain "Example Domain" |
| Body paragraph | `p:first-of-type` | Two sentences (see BR-002, BR-003) |
| "Learn more" link | `a[href]` / `getByRole('link', {name:'Learn more'})` | Visible, valid absolute href |

---

## §4 — Design Source of Truth

- **Source:** 1 PNG attached to task message — read directly by model.
- **Figma:** Not provided (`FIGMA_FILE_URL` / `FIGMA_FILE_KEY` absent from `.env`).
- **Saved path:** `projects/example-good/docs/design/homepage.png`
- **Access method:** Attached image parsed visually by model.

### Verified design tokens (from attached image)

| Token | Value |
|---|---|
| Page background | Light grey — approx `rgb(240, 240, 242)` / `#f0f0f2` |
| Heading text | `"Example Domain"` — bold weight (~700), dark charcoal colour |
| Paragraph line 1 | `"This domain is for use in documentation examples without needing permission."` |
| Paragraph line 2 | `"Avoid use in operations."` |
| Link label | `"Learn more"` — muted blue/indigo, underlined, positioned below paragraph |
| Layout | Content block left-aligned, centred on page at ~240 px from left edge; wide right margin |

### Design-parity observations (Functional / E2E scope only this run)

The design image clearly shows the following **checkable functional facts**:

1. **Heading presence & exact text** → `h1` must equal `"Example Domain"` (BR-001)
2. **Paragraph sentence 1 present** → paragraph must contain the documentation-examples sentence (BR-002)
3. **Paragraph sentence 2 present** → paragraph must contain `"Avoid use in operations."` (BR-003)
4. **"Learn more" link visible** → link element with label `"Learn more"` is rendered (BR-004)
5. **Link has a valid href** → href must be a non-empty absolute URL (BR-004)
6. **HTTP 200 + title** → page must be reachable and title must include `"Example Domain"` (BR-001)

> Visual/colour assertions (background `#f0f0f2`, link colour, font weight) are **design-parity** items
> excluded this run because only Functional / E2E was requested. They are documented here for future
> runs.

---

## §5 — Business Rules

| ID | Rule | Source |
|---|---|---|
| BR-001 | Heading MUST read exactly `"Example Domain"`; page title MUST contain `"Example Domain"` | Design image — h1 text |
| BR-002 | First paragraph MUST contain `"This domain is for use in documentation examples without needing permission."` | Design image — paragraph line 1 |
| BR-003 | First paragraph MUST contain `"Avoid use in operations."` | Design image — paragraph line 2 |
| BR-004 | A hyperlink labelled `"Learn more"` MUST be present, visible, and have a non-empty absolute URL as `href` | Design image — link element |
| BR-005 | _(Visual / Design Parity — deferred)_ Page background MUST be light grey (~`#f0f0f2`) | Design image — background colour |

---

## §6 — Test Cases

> Source priority: design image (attached) → `docs/actualtestcases.csv` → `project-memory.md` §7.
> All 6 cases below are Functional / E2E (the only requested category).

| TC | Summary | Business Rule | Expected Outcome | Spec file |
|---|---|---|---|---|
| TC-001 | Page loads — HTTP 200 + title contains `"Example Domain"` | BR-001 | `response.status() === 200`; `page.title()` matches `/Example Domain/` | `tests/homepage.spec.ts` |
| TC-002 | H1 heading exact text `"Example Domain"` | BR-001 | `h1.textContent().trim() === 'Example Domain'` | `tests/homepage.spec.ts` |
| TC-003 | Paragraph contains documentation-examples sentence | BR-002 | `p.first().textContent()` includes the full first sentence | `tests/homepage.spec.ts` |
| TC-004 | Paragraph contains `"Avoid use in operations."` | BR-003 | `p.first().textContent()` includes `"Avoid use in operations."` | `tests/homepage.spec.ts` |
| TC-005 | `"Learn more"` link is visible | BR-004 | `getByRole('link', {name:'Learn more'}).isVisible() === true` | `tests/homepage.spec.ts` |
| TC-006 | `"Learn more"` link href is a valid absolute URL | BR-004 | `href` is non-empty and matches `^https?://` | `tests/homepage.spec.ts` |

### Deferred (not in scope this run)

| TC | Summary | Reason deferred |
|---|---|---|
| TC-VIS-001 | Background colour matches design `#f0f0f2` | Visual / Design Parity not requested |
| TC-VIS-002 | H1 font-weight is bold (~700) | Visual / Design Parity not requested |
| TC-VIS-003 | Link colour is muted blue/indigo | Visual / Design Parity not requested |

---

## §7 — Handoff checklist

- [x] `TEST_URL` verified: `https://example.com`
- [x] Auth: none required
- [x] Design tokens captured from attached image
- [x] Business rules BR-001 – BR-004 confirmed
- [x] 6 Functional / E2E test cases defined and traceable
- [x] `tests/homepage.spec.ts` already generated and previously green
- [x] `docs/actualtestcases.csv` rows match TC-001 – TC-006
- [ ] **Test Planner** — confirm `docs/actualtestcases.csv` is up to date, then hand off to Generator
- [ ] **Test Generator / Executor** — run `npx playwright test` and produce execution report
