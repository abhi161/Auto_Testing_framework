# UI Map — demo (the-internet.herokuapp.com)
> Produced by Test Planner Phase 3 — source-code analysis + cross-reference against existing spec files.
> Live exploration not performed (all routes confirmed from spec implementations + public site docs).

---

## Screens

| Route | Purpose | Key Interactive Elements | States Covered |
|---|---|---|---|
| `/` | Homepage — feature link index | `#content ul li a` (feature links), `<h1>` | Loaded |
| `/login` | Form authentication | `#username`, `#password`, `button[type=submit]`, `.flash.success`, `.flash.error` | Valid login, invalid login |
| `/secure` | Secure area (auth-gated) | `.flash.success`, `a[href="/logout"]` Logout link | Authenticated, logged-out redirect |
| `/checkboxes` | Checkbox toggling | `input[type=checkbox]` ×2 | Checked/unchecked |
| `/dropdown` | Select element | `select#dropdown`, options: `Option 1`, `Option 2` | Each option selected |
| `/dynamic_content` | Randomly reloaded content | `.large-4.columns` divs | Before/after reload |
| `/disappearing_elements` | Nav links that may vanish | `ul li a` | Visible, hidden (random) |
| `/add_remove_elements/` | DOM add/remove | `button` (Add Element), `.added-manually` (Delete btn) | Added, removed |
| `/drag_and_drop` | CSS drag-and-drop | `#column-a header`, `#column-b header` | Swapped, original |
| `/hovers` | Hover-reveal captions | `.figure` ×3, `.figcaption` | Hidden caption → visible |
| `/inputs` | Number input | `input[type=number]` | Value entered |
| `/key_presses` | Key capture | `#target`, `#result` | Key shown |
| `/javascript_alerts` | JS dialog API | Buttons (Alert/Confirm/Prompt), `#result` | Alert, Confirm, Prompt |
| `/context_menu` | Right-click dialog | `#hot-spot` | Dialog accepted |
| `/nested_frames` | Frameset with nested frames | `frame[name=frame-top/left/middle/right/bottom]` | All frames rendered |
| `/iframe` | TinyMCE iframe | `#mce_0_ifr`, `body#tinymce` | Text typed |
| `/dynamic_controls` | Enable/disable + add/remove | Enable/Disable/Add/Remove buttons, `#loading`, `form#input-example input`, `form#checkbox-example input` | Enabled, disabled, added, removed |
| `/dynamic_loading/1` | Hidden element loading | `#start button`, `#finish h4` | Before start, loading, revealed |
| `/dynamic_loading/2` | Rendered element loading | `#start button`, `#finish h4` | Before start, loading, visible |
| `/broken_images` | Images with broken src | `img` elements | HTTP 200, broken img present |
| `/status_codes` | Status code index | `a` links: 200, 301, 404, 500 | Each link navigable |
| `/status_codes/200` | 200 OK explanation | `body` text | Page message |
| `/status_codes/301` | 301 explanation | `body` text | Page message |
| `/status_codes/404` | 404 explanation | `body` text | Page message |
| `/status_codes/500` | 500 explanation | `body` text | Page message |
| `/notification_message_rendered` | Random flash messages | `a` (Click here), `.flash` | Flash visible |
| `/floating_menu` | Sticky nav menu | `#menu` | Visible before scroll, visible after scroll |
| `/forgot_password` | Forgot password form | `#email`, `#form_submit` | Submitted → `/email_sent` |
| `/redirector` | Redirect link | `a[href]` (here), final URL `/status_codes` | Redirect followed |
| `/slow` | Slow-loading page | `body` | Eventually loads |
| `/windows` | Multiple windows | `a` (Click Here) | New tab with `/windows/new` |
| `/exit_intent` | Exit-intent modal | `.modal` | Triggered on `mouseleave` |
| `/geolocation` | Geolocation API | `button` (Where am I?), `#lat`, `#long` | Prompt triggered |
| `/download` | File download list | `a[href*=/download/]` | Links present |
| `/upload` | File upload form | `input[type=file]`, `#file-submit` | Upload success |
| `/infinite_scroll` | Infinite scroll | `.jscroll-added`, `p` | Initial content, more loaded |
| `/download_secure` | Auth-gated downloads | Redirect to `/login` | Unauthenticated → redirect |

---

## Navigation Graph

```
/ ──links to──> all feature routes below
/login ──success──> /secure
/login ──failure──> /login (flash.error)
/secure ──logout──> /login (flash.success)
/status_codes ──200──> /status_codes/200
/status_codes ──301──> /status_codes/301
/status_codes ──404──> /status_codes/404
/status_codes ──500──> /status_codes/500
/redirector ──click──> /status_codes
/forgot_password ──submit──> /email_sent
/windows ──click──> /windows/new (new tab)
/download_secure (unauth) ──redirect──> /login
```

---

## Discrepancies vs Source-Code Analysis

| # | Finding | Impact |
|---|---|---|
| 1 | `TC-DEMO-006` captures `before` text but does NOT assert it differs after reload — assertion is weakened | Low — random content makes strict assertion impractical; documented as known limitation |
| 2 | `TC-DEMO-011` uses `waitForTimeout(1000)` ×3 — violates `playwright-rules` no-arbitrary-wait | Medium — Generator should replace with `waitForSelector` or `waitForResponse` |
| 3 | `TC-DEMO-038` accepts the right-click dialog but does not assert the dialog message text | Low — dialog text cannot be verified after acceptance via Playwright API; assertion is implicit |
| 4 | `TC-DEMO-039` assertion is `body` visible only — very weak; no `#lat`/`#long` check | Low — geolocation may be blocked by browser; acceptable as smoke-level |
| 5 | `TC-DEMO-008` re-logs in per test instead of using `storageState` session reuse (`beforeAll`) — violates handoff note §3 | Medium — Generator should lift login to `beforeAll` in `auth.spec.ts` |
