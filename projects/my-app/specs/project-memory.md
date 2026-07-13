# Project Memory — my-app

Verified facts only. Every agent reads this first (`copilot-instructions.md` §0a) and updates it when
it confirms something new. Do not record speculation here.

## 1. Environment
- `TEST_URL`: `novartis.com`  *(as found in `projects/my-app/.env`)*
- `TEST_AUTH_URL`: *(not yet set — collect from user)*
- `TEST_USER`: *(not yet set — collect from user)*
- `TEST_PASS`: *(not yet set — collect from user)*
- `IDENTITY_PROVIDER`: *(not yet set — collect from user)*
- Confirmed working as of: *(pending credential collection)*

## 2. Authentication
- `identity_provider`: `<cognito-prefix>-idp` — *(value not yet confirmed; collect from user or derive from Cognito hosted-UI redirect)*
- Login flow verified: ❌ (update once the Context Analyst confirms it)
- Auth helper present: ✅ `projects/my-app/tests/helpers/auth.helper.ts`
- Notes: `TEST_USER`, `TEST_PASS`, `TEST_AUTH_URL`, and `IDENTITY_PROVIDER` are all empty in `.env`.
  These MUST be provided before the test suite can run.

## 3. Application architecture
- Framework/router: External public website — `novartis.com` (no local `src/` available)
- Key routes: Derived via static analysis of URL structure (see `specs/test-strategy.md` §3)

## 4. Business rules
- BR-001: Homepage must load with HTTP 200 and render the top-level navigation.
- BR-002: All primary navigation links must be reachable (no 404/broken links in nav).
- BR-003: Page must load within an acceptable time threshold (performance budget).

## 5. Selectors
| Screen | Element | Selector | Confirmed |
|---|---|---|---|
| Homepage | Navigation bar | `nav`, `[role="navigation"]` | ❌ (to be confirmed by Planner) |
| Homepage | Main heading | `h1` | ❌ (to be confirmed by Planner) |
| Homepage | Footer | `footer`, `[role="contentinfo"]` | ❌ (to be confirmed by Planner) |

## 5c. Design source of truth
- `FIGMA_FILE_URL` / `FIGMA_FILE_KEY`: *(none provided)*
- Access method used: N/A — no Figma source detected
- Node ids mapped: N/A
- Verified tokens summary: N/A — no design source; visual parity tests are out of scope for this run

## 6. Known gotchas
- Credentials (`TEST_USER`, `TEST_PASS`) are missing from `.env` — the suite cannot authenticate until they are supplied.
- `novartis.com` is an external production site; auth flow must be verified before any test run.
- No local `src/` directory exists — all architecture analysis is based on URL/domain knowledge and must be validated by the Test Planner via UI exploration.
