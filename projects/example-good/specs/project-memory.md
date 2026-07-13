# Project Memory — example-good

Verified facts only. Every agent reads this first (`copilot-instructions.md` §0a) and updates it when
it confirms something new. Do not record speculation here.

## 1. Environment
- `TEST_URL`: `https://example.com`
- `TEST_AUTH_URL`: _(not applicable — public page)_
- Confirmed working as of: Phase 0 bootstrap (Context Analyst)

## 2. Authentication
- `identity_provider`: _(not applicable — no auth required)_
- Login flow verified: ❌ N/A — example.com is a public unauthenticated page
- Notes: No login flow needed; auth.helper.ts is present but unused.

## 3. Application architecture
- Framework/router: Static HTML (no JS framework, no client-side router)
- Key routes:
  - `/` → Static homepage — not auth-gated

## 4. Business rules
- BR-001: Heading MUST read exactly "Example Domain"; page title MUST contain "Example Domain"
- BR-002: Paragraph MUST contain "This domain is for use in documentation examples without needing permission."
- BR-003: Paragraph MUST contain "Avoid use in operations."
- BR-004: A "Learn more" hyperlink MUST be present and visible with valid absolute href
- BR-005: _(Visual / Design Parity — deferred)_ Page background MUST be light grey (~#f0f0f2)

## 5. Selectors
| Screen   | Element        | Selector                                              | Confirmed |
|----------|----------------|-------------------------------------------------------|-----------|
| Homepage | H1 heading     | `h1`                                                  | ✅ Yes    |
| Homepage | Body paragraph | `p` (first — `.locator('p').first()`)                 | ✅ Yes    |
| Homepage | Learn more link| `getByRole('link', { name: 'Learn more' })`           | ✅ Yes    |

## 5c. Design source of truth
- `FIGMA_FILE_URL` / `FIGMA_FILE_KEY`: _(none — design provided as attached image)_
- Access method used: Attached image read directly by model (1 PNG attached — this run)
- Image path: `docs/design/homepage.png`
- Node ids mapped: N/A
- Verified tokens (from attached design image):
  - Background: light grey ~`rgb(240, 240, 242)` / `#f0f0f2`
  - Heading: `"Example Domain"`, bold (~700), dark charcoal
  - Paragraph line 1: `"This domain is for use in documentation examples without needing permission."`
  - Paragraph line 2: `"Avoid use in operations."`
  - Link: `"Learn more"`, muted blue/indigo colour, underlined, visible below paragraph

## 6. Known gotchas
- This is a public static page — no auth, no SPA routing, no dynamic content.
- Visual snapshot baseline is `docs/design/homepage.png` (the attached design image).
- Any deviation from the design image (heading text, paragraph text, link label, background) is a DEFECT.

## 7. Confirmed test results (TC-001 – TC-006)
Run: `TEST_PROJECT=example-good npx playwright test homepage.spec.ts`
All 6 functional/E2E tests PASSED against https://example.com on first run (2.8 s).
- TC-001 ✅ HTTP 200; title contains "Example Domain"
- TC-002 ✅ h1 text === "Example Domain"
- TC-003 ✅ Paragraph contains documentation-examples sentence
- TC-004 ✅ Paragraph contains "Avoid use in operations."
- TC-005 ✅ "Learn more" link is visible
- TC-006 ✅ "Learn more" href is a valid absolute URL

## 8. Requested test types (current run)
- Functional / E2E ✅
- All other types: not requested — excluded from this run's scope.
