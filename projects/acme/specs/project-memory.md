# Project Memory — acme
_Verified facts only. Every agent reads this first and updates on confirmation. No speculation._

## 1. Environment
- `TEST_URL`: `https://example.com/`
- `TEST_AUTH_URL`: _(none — app is public)_
- Confirmed working as of: 2026-07-13 (Context Analyst pass)

## 2. Authentication
- `identity_provider`: _(none — no auth required for this app)_
- Login flow verified: N/A (public site)
- Notes: `example.com` requires no authentication.

## 3. Application architecture
- Framework/router: Static HTML (served by IANA infrastructure)
- Key routes:
  | Route | Screen | Notes |
  |---|---|---|
  | `https://example.com/` | Home | "Example Domain" |
  | _(resolved at runtime — assert by h1 content, not URL)_ | Screen 2 | Destination of "Learn more" link |

## 4. Business rules
- BR-001: The `<h1>` on the home page MUST be exactly `Example Domain`.
- BR-002: Body text MUST be `This domain is for use in documentation examples without needing permission. Avoid use in operations.`
- BR-003: A "Learn more" link MUST be present and navigable.
- BR-004: Home page MUST NOT contain any header, navigation bar, logo, or footer element.
- BR-005: The page reached via "Learn more" MUST show `<h1>` = `Example Domains`.
- BR-006: IANA top-nav MUST contain exactly 4 items in order: Domains, Protocols, Numbers, About.
- BR-007: IANA page MUST show a "Further Reading" section with "IANA-managed Reserved Domains" bullet.
- BR-008: IANA footer MUST contain "Privacy Policy" and "Terms of Service" links.
- BR-009: IANA body MUST reference RFC 2606 and RFC 6761 as visible blue links.
- BR-010: IANA page MUST show "Last revised 2017-05-13." text.

## 5. Selectors (to be confirmed by Test Planner / Executor)
| Screen | Element | Selector | Confirmed |
|---|---|---|---|
| Home | `<h1>` | `h1` | ❌ (static analysis) |
| Home | Body paragraph | `p` | ❌ |
| Home | Learn more link | `a:has-text("Learn more")` | ❌ — may also be "More information"; confirm at runtime |
| Screen 2 | `<h1>` | `h1` | ❌ |
| Screen 2 | Nav items | `nav a` | ❌ |
| Screen 2 | Further Reading heading | `h2:has-text("Further Reading")` | ❌ |
| Screen 2 | IANA-managed bullet link | `a:has-text("IANA-managed Reserved Domains")` | ❌ |
| Screen 2 | RFC 2606 link | `a:has-text("RFC 2606")` | ❌ |
| Screen 2 | RFC 6761 link | `a:has-text("RFC 6761")` | ❌ |
| Screen 2 | Privacy Policy footer link | `a:has-text("Privacy Policy")` | ❌ |
| Screen 2 | Terms of Service footer link | `a:has-text("Terms of Service")` | ❌ |

## 5c. Design source of truth
- `FIGMA_FILE_URL` / `FIGMA_FILE_KEY`: _(none)_
- Access method used: Attached design images (read directly by model — 2 images)
- Screens mapped:
  - Screen 1 → `docs/design/Screenshot_from_2026-07-13_12-14-01.png`
  - Screen 2 → `docs/design/Screenshot_from_2026-07-13_12-14-19.png`
- Verified tokens summary (from model-read design images):
  - **Home:** `<h1>` = `Example Domain`; `<p>` = `This domain is for use in documentation examples without needing permission. Avoid use in operations.`; link = `Learn more`; bg ≈ `#eeeeee`; **no nav, header, logo, footer**
  - **Screen 2 (IANA):** `<h1>` = `Example Domains`; 4-item top-nav (Domains, Protocols, Numbers, About); RFC 2606 + RFC 6761 body links; "Further Reading" heading; "IANA-managed Reserved Domains" bullet; footer: Privacy Policy + Terms of Service; "Last revised 2017-05-13."

## 6. Known gotchas
- The "Learn more" link on `example.com` may open same tab or new tab — Test Generator must handle both.
- Destination URL of "Learn more" is NOT verified from design — assert by `h1` content only, never hard-code URL.
- `example.com` design has NO header, NO logo, NO nav, NO footer — any of those in the live app is a design deviation (DEFECT).
- "Learn more" link text: design image shows "Learn more"; runtime may render "More information" — confirm at execution.
