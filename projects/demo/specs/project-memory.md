# Project Memory — demo

> Auto-generated and maintained by the Playwright Context Analyst.
> **Verified facts only.** Do not record speculation or inference here.
> Every agent reads this first (`copilot-instructions.md §0a`) and updates it when new facts are confirmed.

---

## §1 — Identity & Environment

| Variable            | Value                                      | Confirmed |
|---------------------|--------------------------------------------|-----------|
| `TEST_URL`          | `https://the-internet.herokuapp.com`       | ✅        |
| `TEST_AUTH_URL`     | *(empty — not an Azure AD application)*    | ✅        |
| `TEST_USER`         | `tomsmith`                                 | ✅        |
| `TEST_PASS`         | `SuperSecretPassword!`                     | ✅        |
| `IDENTITY_PROVIDER` | *(N/A — public form auth)*                 | ✅        |

**Note:** This project targets the public reference site `the-internet.herokuapp.com`. It uses a
simple HTML form (`#username` / `#password`) — **not** Azure AD / Cognito federation. The Azure AD
`auth.helper.ts` is present (framework requirement) but is NOT exercised here.

---

## §2 — Authentication

| Attribute           | Value                                    | Confirmed |
|---------------------|------------------------------------------|-----------|
| Auth type           | Simple HTML form                         | ✅        |
| Login route         | `/login`                                 | ✅        |
| Username field      | `#username`                              | ✅        |
| Password field      | `#password`                              | ✅        |
| Submit button       | `button[type="submit"]`                  | ✅        |
| Success flash       | `.flash.success`                         | ✅        |
| Error flash         | `.flash.error`                           | ✅        |
| Secure area URL     | `/secure`                                | ✅        |
| Logout URL          | `/logout`                                | ✅        |

---

## §3 — Known Routes (complete)

| Route                          | Purpose                     | Auth Required? |
|--------------------------------|-----------------------------|----------------|
| `/`                            | Homepage / Feature index    | No             |
| `/login`                       | Login form                  | No             |
| `/secure`                      | Secure Area                 | Yes (session)  |
| `/checkboxes`                  | Checkboxes                  | No             |
| `/dropdown`                    | Dropdown select             | No             |
| `/dynamic_content`             | Dynamic Content             | No             |
| `/disappearing_elements`       | Disappearing Elements       | No             |
| `/add_remove_elements/`        | Add / Remove Elements       | No             |
| `/drag_and_drop`               | Drag and Drop               | No             |
| `/hovers`                      | Hovers                      | No             |
| `/inputs`                      | Number Inputs               | No             |
| `/key_presses`                 | Key Presses                 | No             |
| `/javascript_alerts`           | JS Alerts                   | No             |
| `/nested_frames`               | Nested Frames               | No             |
| `/iframe`                      | TinyMCE iFrame              | No             |
| `/dynamic_controls`            | Dynamic Controls            | No             |
| `/dynamic_loading/1`           | Dynamic Loading (hidden)    | No             |
| `/dynamic_loading/2`           | Dynamic Loading (rendered)  | No             |
| `/broken_images`               | Broken Images               | No             |
| `/status_codes`                | Status Codes index          | No             |
| `/status_codes/200`            | Status 200 page             | No             |
| `/status_codes/301`            | Status 301 page             | No             |
| `/status_codes/404`            | Status 404 page             | No             |
| `/status_codes/500`            | Status 500 page             | No             |
| `/notification_message_rendered` | Notification Messages     | No             |
| `/floating_menu`               | Floating Menu               | No             |
| `/forgot_password`             | Forgot Password             | No             |
| `/redirector`                  | Redirect Link               | No             |
| `/slow`                        | Slow Resources              | No             |
| `/windows`                     | Multiple Windows            | No             |
| `/exit_intent`                 | Exit Intent                 | No             |
| `/context_menu`                | Context Menu                | No             |
| `/geolocation`                 | Geolocation                 | No             |
| `/download`                    | File Download               | No             |
| `/upload`                      | File Upload                 | No             |
| `/infinite_scroll`             | Infinite Scroll             | No             |
| `/download_secure`             | Secure File Download        | Yes (session)  |

---

## §4 — Business Rules

| ID     | Rule                                                                                                                     |
|--------|--------------------------------------------------------------------------------------------------------------------------|
| BR-001 | Valid credentials MUST redirect to `/secure` and show `.flash.success` ∋ `"You logged into a secure area"`.             |
| BR-002 | Invalid credentials MUST stay on `/login` and show `.flash.error` ∋ `"Your username is invalid"`.                       |
| BR-003 | Logout MUST redirect to `/login` and show `.flash.success` ∋ `"You logged out of the secure area"`.                     |
| BR-004 | `/download_secure` MUST redirect unauthenticated users to `/login` (or return 401/403).                                  |
| BR-005 | `/dynamic_loading/1` and `/dynamic_loading/2` MUST show `"Hello World!"` in `#finish h4` after clicking Start.          |
| BR-006 | JS Alert/Confirm/Prompt on `/javascript_alerts` MUST update `#result` with the correct confirmation text after handling. |

---

## §5 — Verified Selectors

| Screen                   | Element                | Selector                       | Confirmed |
|--------------------------|------------------------|--------------------------------|-----------|
| `/login`                 | Username field         | `#username`                    | ✅        |
| `/login`                 | Password field         | `#password`                    | ✅        |
| `/login`                 | Submit button          | `button[type="submit"]`        | ✅        |
| `/login`                 | Success flash          | `.flash.success`               | ✅        |
| `/login`                 | Error flash            | `.flash.error`                 | ✅        |
| `/secure`                | Secure area URL        | `/secure`                      | ✅        |
| `/drag_and_drop`         | Column A               | `#column-a`                    | ✅        |
| `/drag_and_drop`         | Column B               | `#column-b`                    | ✅        |
| `/dynamic_loading/1,2`   | Start button           | `#start button`                | ✅        |
| `/dynamic_loading/1,2`   | Finish text            | `#finish h4`                   | ✅        |
| `/javascript_alerts`     | Result display         | `#result`                      | ✅        |
| `/nested_frames`         | Top frame              | `frame[name=frame-top]`        | ✅        |
| `/iframe`                | TinyMCE frame          | `#mce_0_ifr`                   | ✅        |
| `/dynamic_controls`      | Loading indicator      | `#loading`                     | ✅        |
| `/forgot_password`       | Email field            | `#email`                       | ✅        |
| `/forgot_password`       | Submit button          | `#form_submit`                 | ✅        |
| `/floating_menu`         | Floating menu          | `#menu`                        | ✅        |
| `/context_menu`          | Hotspot                | `#hot-spot`                    | ✅        |
| `/upload`                | File input             | `input[type=file]`             | ✅        |
| `/upload`                | Submit button          | `#file-submit`                 | ✅        |

---

## §5c — Design Source of Truth

- **Figma URL / Key:** None provided.
- **Access Method:** N/A.
- **Node IDs mapped:** None.
- **Verified tokens:** None (no design source available for this public reference app).
- **Design Spec:** `specs/design-spec.md` — not created (no Figma source).

---

## §6 — Test Case Register

| TC No.      | Summary                                           | Spec File                    |
|-------------|---------------------------------------------------|------------------------------|
| TC-DEMO-001 | Valid credentials reach the secure area           | `tests/login.spec.ts`        |
| TC-DEMO-002 | Invalid credentials show an error                | `tests/login.spec.ts`        |
| TC-DEMO-003 | Homepage loads and lists all feature links        | `tests/homepage.spec.ts`     |
| TC-DEMO-004 | Checkboxes — check and uncheck                   | `tests/form-elements.spec.ts` |
| TC-DEMO-005 | Dropdown — select each option                    | `tests/form-elements.spec.ts` |
| TC-DEMO-006 | Dynamic content loads new content on reload       | `tests/dynamic.spec.ts`      |
| TC-DEMO-007 | Disappearing elements — element visibility        | `tests/dynamic.spec.ts`      |
| TC-DEMO-008 | Logout from secure area                           | `tests/auth.spec.ts`         |
| TC-DEMO-009 | File download — link present                     | `tests/files.spec.ts`        |
| TC-DEMO-010 | File upload — upload succeeds                    | `tests/files.spec.ts`        |
| TC-DEMO-011 | Infinite scroll — loads more content             | `tests/scroll.spec.ts`       |
| TC-DEMO-012 | Drag and drop — columns swap                     | `tests/interactions.spec.ts` |
| TC-DEMO-013 | Hovers — hidden caption revealed                | `tests/interactions.spec.ts` |
| TC-DEMO-014 | Inputs — number input retains value              | `tests/form-elements.spec.ts` |
| TC-DEMO-015 | Key presses — keypress recorded                 | `tests/form-elements.spec.ts` |
| TC-DEMO-016 | JS alerts — alert accepted                       | `tests/alerts.spec.ts`       |
| TC-DEMO-017 | JS alerts — confirm accepted                    | `tests/alerts.spec.ts`       |
| TC-DEMO-018 | JS alerts — prompt with text entry              | `tests/alerts.spec.ts`       |
| TC-DEMO-019 | Frames — nested frames load                     | `tests/frames.spec.ts`       |
| TC-DEMO-020 | iFrame — type into TinyMCE                      | `tests/frames.spec.ts`       |
| TC-DEMO-021 | Dynamic controls — enable/disable input         | `tests/dynamic.spec.ts`      |
| TC-DEMO-022 | Dynamic controls — add/remove checkbox          | `tests/dynamic.spec.ts`      |
| TC-DEMO-023 | Dynamic loading 1 — hidden element revealed     | `tests/dynamic.spec.ts`      |
| TC-DEMO-024 | Dynamic loading 2 — element rendered            | `tests/dynamic.spec.ts`      |
| TC-DEMO-025 | Broken images — page loads                      | `tests/navigation.spec.ts`   |
| TC-DEMO-026 | Status codes — 200                              | `tests/navigation.spec.ts`   |
| TC-DEMO-027 | Status codes — 301                              | `tests/navigation.spec.ts`   |
| TC-DEMO-028 | Status codes — 404                              | `tests/navigation.spec.ts`   |
| TC-DEMO-029 | Status codes — 500                              | `tests/navigation.spec.ts`   |
| TC-DEMO-030 | Notification messages — flash appears           | `tests/navigation.spec.ts`   |
| TC-DEMO-031 | Floating menu — visible after scroll            | `tests/navigation.spec.ts`   |
| TC-DEMO-032 | Forgot password — form submits                  | `tests/navigation.spec.ts`   |
| TC-DEMO-033 | Redirect link — follows correctly               | `tests/navigation.spec.ts`   |
| TC-DEMO-034 | Slow resources — page eventually loads          | `tests/navigation.spec.ts`   |
| TC-DEMO-035 | Add/Remove elements — add then remove           | `tests/interactions.spec.ts` |
| TC-DEMO-036 | Multiple windows — new window opens             | `tests/interactions.spec.ts` |
| TC-DEMO-037 | Exit intent — modal on mouse leave              | `tests/interactions.spec.ts` |
| TC-DEMO-038 | Context menu — right-click alert                | `tests/alerts.spec.ts`       |
| TC-DEMO-039 | Geolocation — prompt triggered                  | `tests/navigation.spec.ts`   |
| TC-DEMO-040 | Secure file download — auth required            | `tests/auth.spec.ts`         |

---

## §7 — Auth Helper

`tests/helpers/auth.helper.ts` — Azure AD Cognito federation helper (framework-required scaffold).
Not invoked for this project; all specs use direct form selectors.

---

## §8 — Known Gotchas

- **Drag and drop:** Playwright native drag may not work on this app's CSS-only drag implementation;
  may need `dragAndDrop` with `{ force: true }` or a JS-dispatch approach.
- **TinyMCE iframe:** Body must be cleared before typing; wait for `frameLocator` to be attached.
- **Slow resources (`/slow`):** Increase `timeout` to ≥ 60 000 ms for this route.
- **Dynamic content:** Content changes randomly on reload — only assert that *some* block changed, not
  a specific value.
- **Exit intent modal:** Trigger via `page.dispatchEvent('body', 'mouseleave')` rather than physical
  mouse movement.
- **Infinite scroll:** Use `page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))`
  then wait for new elements — do not use `waitForTimeout`.

---

## §9 — Run History

| Artifact                                      | Notes                                 |
|-----------------------------------------------|---------------------------------------|
| `specs/runs/run-1783862129673.json`           | Previous execution record             |
| `specs/test-strategy.md`                      | Refreshed — "Test wholepage" task     |
