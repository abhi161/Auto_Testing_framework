---
description: "Authentication rules for enterprise AWS Cognito → Microsoft Azure AD login. Apply whenever writing, generating, or debugging login/auth code for Playwright tests."
applyTo: "tests/**,**/*.spec.ts,global-setup.ts"
---

# Authentication Rules (Azure AD via AWS Cognito)

These rules are mandatory. Violating them causes login failures and non-deterministic runs.

## 1. Identity provider
- The app federates AWS Cognito to **Microsoft Azure AD**. The login form is Microsoft's.
- `identity_provider` MUST be `<cognito-prefix>-idp` (e.g. `dm-ftc-dev-idp`), **never** `COGNITO`.
- Config files in `src/` that say `"IDENTITYPROVIDER": "COGNITO"` are misleading — ignore them and use
  the value from [specs/project-memory.md](../../specs/project-memory.md) / `.env`.

## 2. Selectors — use Microsoft, never Cognito Hosted UI

✅ Correct:
- `input[type="email"], input[name="loginfmt"]`
- `input[type="submit"][value="Next"]`
- `input[type="password"], input[name="passwd"]`
- `input[type="submit"][value="Sign in"]`
- `input[type="submit"][value="Yes"]` (optional "Stay signed in?")

❌ Forbidden:
- `input[name="username"]`, `button[name="signInSubmitButton"]`, any Cognito Hosted UI selector.

## 3. One canonical helper
- Use `tests/helpers/auth.helper.ts` generated from the `azure-ad-authentication` skill.
- Do **not** hand-write a second auth implementation or vary the selectors/flow.

## 4. Canonical env vars only
`TEST_URL`, `TEST_AUTH_URL`, `TEST_USER`, `TEST_PASS`, `IDENTITY_PROVIDER`.
Never `APP_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USERNAME`, `TEST_PASSWORD`.

## 5. Session persistence
- OAuth providers rate-limit rapid re-auth. Log in ONCE (`beforeAll` or `storageState`) and reuse.
- Never call `login()` per test.
