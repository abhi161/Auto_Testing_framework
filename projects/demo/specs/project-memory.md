# Project Memory — demo

Verified facts only. Every agent reads this first and updates it when it confirms something new.

## 1. Environment
- `TEST_URL`: `https://example.com/`
- `TEST_AUTH_URL`: *(none — public page, no auth)*
- Confirmed working as of: 2026-07-13 (Context Analyst bootstrap)

## 2. Authentication
- **Authentication type:** None — `https://example.com/` is publicly accessible.
- No Cognito / Azure AD federation applies.
- No `auth.helper.ts` required.
- Login flow verified: N/A

## 3. Application Architecture
- **Framework/router:** Unknown (no source code provided — `codebase/` and `src/` absent)
- **Source of truth:** Attached design images + `docs/flow.json`
- **Key routes:**

| Route | Screen | Auth Required |
|---|---|---|
| `https://example.com/` | Screen 1 "Screen 2" | No |
| IANA Reserved Domains page (via `More information...` link) | Screen 2 "Home" | No |

## 4. Business Rules
- BR-001: `example.com` is a reserved domain (RFC-defined) for illustrative use; no permission required.
- BR-002: The `More information...` link on example.com navigates to the IANA reserved-domains page.

## 5. Selectors
| Screen | Element | Selector | Confirmed |
|---|---|---|---|
| Screen 1 | Main heading | `h1` | From design (not live-verified) |
| Screen 1 | Info paragraph | `p` (first) | From design |
| Screen 1 | Navigation link | `a:has-text("More information...")` | From design |
| Screen 2 | Main heading | `h1, h2` containing `IANA-managed Reserved Domains` | From design |

## 5c. Design Source of Truth
- `FIGMA_FILE_URL` / `FIGMA_FILE_KEY`: *(none provided)*
- Access method used: **Attached design images** (2 PNGs, first-class source)
- Design files:
  - `docs/design/Screenshot_from_2026-07-13_12-14-01.png` → Screen 1 "Screen 2" (example.com start page)
  - `docs/design/Screenshot_from_2026-07-13_12-14-19.png` → Screen 2 "Home" (IANA Reserved Domains page)
- Verified tokens summary:
  - Screen 1: h1=`Example Domain`; para=`This domain is for use in illustrative examples...`; link=`More information...`; title=`Example Domain`; bg=white; no nav
  - Screen 2: heading=`IANA-managed Reserved Domains`; sections=`Example Domains`, `Test Domains`; IANA branding present

## 6. Known Gotchas
- No source code provided — all routes/selectors derived from design images and flow.json only. Live-verify selectors during Test Planning UI exploration.
- The `More information...` link destination URL was not directly readable from the design image — the IANA page identity is inferred from the design content (IANA heading/branding visible in Screen 2 design). Mark as `(unverified destination URL — confirm at execution time)`.
