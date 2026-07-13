---
name: azure-ad-authentication
description: "Provides the single canonical Playwright auth helper and login flow for apps that federate AWS Cognito to Microsoft Azure AD. Use whenever a project needs login automated, or when auth selectors/flow must be verified or regenerated."
---

# Azure AD Authentication (via AWS Cognito federation)

## When to use
- Bootstrapping a new project (`projects/<project>/tests/helpers/auth.helper.ts` doesn't exist yet).
- Verifying/regenerating login selectors after a Microsoft login-page change.
- Generating the one-off `tests/ui-exploration.spec.ts` used by the Test Planner when no MCP browser
  tool is available.

## Flow
1. Navigate to `TEST_URL` → app redirects to Cognito → Cognito redirects to Microsoft (`login.
   microsoftonline.com`) because `identity_provider=<cognito-prefix>-idp`.
2. Microsoft **email** screen: fill `input[type="email"], input[name="loginfmt"]`, click
   `input[type="submit"][value="Next"]`.
3. Microsoft **password** screen: fill `input[type="password"], input[name="passwd"]`, click
   `input[type="submit"][value="Sign in"]`.
4. Optional "Stay signed in?" interstitial: click `input[type="submit"][value="Yes"]` if present
   (use a short-timeout `try/catch` or `isVisible()` check — it does not always appear).
5. Wait for redirect back to `TEST_URL` and `networkidle`.

See `auth-rules.instructions.md` for the full selector table and forbidden Cognito-Hosted-UI selectors.

## Canonical helper
Generate `tests/helpers/auth.helper.ts` for the project from `assets/auth.helper.ts.template`,
substituting nothing — it reads everything from the canonical env vars at runtime. Never hand-roll a
second auth implementation.

## Verification
After generating/updating the helper, run a smoke check:
`npx playwright test tests/helpers/auth.smoke.spec.ts --headed` (or MCP `test_run`) and confirm the
session lands on an authenticated route. Record confirmation + timestamp in `specs/project-memory.md`.

## Exploration fallback
When MCP `playwright-test/*` browser tools are unavailable, use `assets/ui-exploration.spec.ts.
template` as the starting point for `tests/ui-exploration.spec.ts` — it logs in once via the helper and
walks top-level routes, screenshotting each (`fullPage: true`) into `specs/screenshots/`.
