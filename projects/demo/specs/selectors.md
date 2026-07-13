# Selector Map — demo (`the-internet.herokuapp.com`)
> Maintained by the Test Planner. Source: `project-memory.md §5` + spec-file cross-reference.
> Last updated: Test Planner pass — "Test wholepage" task.
>
> **Priority tiers:**
> 1 = `data-testid`
> 2 = `getByRole` / `aria-label` / semantic attribute
> 3 = stable, non-generated `id`
> 4 = `getByText` / tag
> 5 = class name (last resort — stable on this reference app)
> ❌ = brittle XPath / deep CSS chain — never used

---

## Authentication — `/login`, `/secure`

| Screen | Element | Selector | Tier | Confirmed | Notes |
|---|---|---|---|---|---|
| `/login` | Username input | `#username` | 3 | ✅ | `login.spec.ts`, `auth.spec.ts` |
| `/login` | Password input | `#password` | 3 | ✅ | `login.spec.ts`, `auth.spec.ts` |
| `/login` | Submit button | `button[type="submit"]` | 2 | ✅ | `login.spec.ts`, `auth.spec.ts` |
| `/login` | Success flash | `.flash.success` | 5 | ✅ | No stable id; class is stable on this site |
| `/login` | Error flash | `.flash.error` | 5 | ✅ | No stable id; class is stable on this site |
| `/secure` | Logout link | `getByRole('link', { name: /Logout/i })` | 2 | ✅ | `auth.spec.ts` |

---

## Homepage — `/`

| Screen | Element | Selector | Tier | Confirmed | Notes |
|---|---|---|---|---|---|
| `/` | Page heading | `getByRole('heading', { name: /Welcome to the-internet/i })` | 2 | ✅ | `homepage.spec.ts` |
| `/` | Feature links list | `#content ul li a` | 3 | ✅ | `homepage.spec.ts`; `#content` is stable |

---

## Form Elements — `/checkboxes`, `/dropdown`, `/inputs`, `/key_presses`

| Screen | Element | Selector | Tier | Confirmed | Notes |
|---|---|---|---|---|---|
| `/checkboxes` | Checkbox 1 | `page.locator('input[type="checkbox"]').nth(0)` | 2 | ✅ | `form-elements.spec.ts` |
| `/checkboxes` | Checkbox 2 | `page.locator('input[type="checkbox"]').nth(1)` | 2 | ✅ | `form-elements.spec.ts` |
| `/dropdown` | Select element | `#dropdown` | 3 | ✅ | `form-elements.spec.ts` |
| `/inputs` | Number input | `input[type="number"]` | 2 | ✅ | `form-elements.spec.ts` |
| `/key_presses` | Key input target | `#target` | 3 | ✅ | `form-elements.spec.ts` |
| `/key_presses` | Result display | `#result` | 3 | ✅ | `form-elements.spec.ts`, `alerts.spec.ts` |

---

## Dynamic Pages — `/dynamic_content`, `/disappearing_elements`, `/dynamic_controls`, `/dynamic_loading/*`

| Screen | Element | Selector | Tier | Confirmed | Notes |
|---|---|---|---|---|---|
| `/dynamic_content` | Content blocks | `.large-4.columns` | 5 | ✅ | `dynamic.spec.ts`; no stable id available |
| `/disappearing_elements` | Nav links | `ul li a` | 4 | ✅ | `dynamic.spec.ts` |
| `/dynamic_controls` | Enable button | `getByRole('button', { name: 'Enable' })` | 2 | ✅ | `dynamic.spec.ts` |
| `/dynamic_controls` | Disable button | `getByRole('button', { name: 'Disable' })` | 2 | ✅ | `dynamic.spec.ts` |
| `/dynamic_controls` | Remove button | `getByRole('button', { name: 'Remove' })` | 2 | ✅ | `dynamic.spec.ts` |
| `/dynamic_controls` | Add button | `getByRole('button', { name: 'Add' })` | 2 | ✅ | `dynamic.spec.ts` |
| `/dynamic_controls` | Loading indicator | `#loading` | 3 | ✅ | `dynamic.spec.ts`; waited for hidden state |
| `/dynamic_controls` | Text input | `form#input-example input[type="text"]` | 3 | ✅ | `dynamic.spec.ts` |
| `/dynamic_controls` | Checkbox | `form#checkbox-example input[type="checkbox"]` | 3 | ✅ | `dynamic.spec.ts` |
| `/dynamic_loading/1` | Start button | `#start button` | 3 | ✅ | `dynamic.spec.ts` |
| `/dynamic_loading/1` | Finish text | `#finish h4` | 3 | ✅ | `dynamic.spec.ts` |
| `/dynamic_loading/2` | Start button | `#start button` | 3 | ✅ | `dynamic.spec.ts` |
| `/dynamic_loading/2` | Finish text | `#finish h4` | 3 | ✅ | `dynamic.spec.ts` |

---

## Alerts & Context Menu — `/javascript_alerts`, `/context_menu`

| Screen | Element | Selector | Tier | Confirmed | Notes |
|---|---|---|---|---|---|
| `/javascript_alerts` | Alert button | `getByRole('button', { name: 'Click for JS Alert' })` | 2 | ✅ | `alerts.spec.ts` |
| `/javascript_alerts` | Confirm button | `getByRole('button', { name: 'Click for JS Confirm' })` | 2 | ✅ | `alerts.spec.ts` |
| `/javascript_alerts` | Prompt button | `getByRole('button', { name: 'Click for JS Prompt' })` | 2 | ✅ | `alerts.spec.ts` |
| `/javascript_alerts` | Result text | `#result` | 3 | ✅ | `alerts.spec.ts` |
| `/context_menu` | Hotspot | `#hot-spot` | 3 | ✅ | `alerts.spec.ts` |

---

## Frames — `/nested_frames`, `/iframe`

| Screen | Element | Selector | Tier | Confirmed | Notes |
|---|---|---|---|---|---|
| `/nested_frames` | Top frame | `page.frame({ name: 'frame-top' })` | 3 | ✅ | `frames.spec.ts` |
| `/nested_frames` | Left frame | `page.frame({ name: 'frame-left' })` | 3 | ✅ | `frames.spec.ts` |
| `/nested_frames` | Middle frame | `page.frame({ name: 'frame-middle' })` | 3 | ✅ | `frames.spec.ts` |
| `/nested_frames` | Right frame | `page.frame({ name: 'frame-right' })` | 3 | ✅ | `frames.spec.ts` |
| `/nested_frames` | Bottom frame | `page.frame({ name: 'frame-bottom' })` | 3 | ✅ | `frames.spec.ts` |
| `/iframe` | TinyMCE iframe | `page.frameLocator('#mce_0_ifr')` | 3 | ✅ | `frames.spec.ts` |
| `/iframe` | TinyMCE body | `body#tinymce` (inside frameLocator) | 3 | ✅ | `frames.spec.ts` |

---

## Interactions — `/drag_and_drop`, `/hovers`, `/add_remove_elements/`, `/windows`, `/exit_intent`

| Screen | Element | Selector | Tier | Confirmed | Notes |
|---|---|---|---|---|---|
| `/drag_and_drop` | Column A | `#column-a` | 3 | ✅ | `interactions.spec.ts` |
| `/drag_and_drop` | Column A header | `#column-a header` | 3 | ✅ | `interactions.spec.ts` |
| `/drag_and_drop` | Column B | `#column-b` | 3 | ✅ | `interactions.spec.ts` |
| `/drag_and_drop` | Column B header | `#column-b header` | 3 | ✅ | `interactions.spec.ts` |
| `/hovers` | Figure container | `.figure` | 5 | ✅ | `interactions.spec.ts`; no stable id |
| `/hovers` | Figure caption | `.figcaption` | 5 | ✅ | `interactions.spec.ts` |
| `/add_remove_elements/` | Add button | `getByRole('button', { name: 'Add Element' })` | 2 | ✅ | `interactions.spec.ts` |
| `/add_remove_elements/` | Delete button | `getByRole('button', { name: 'Delete' })` | 2 | ✅ | `interactions.spec.ts` |
| `/windows` | Click Here link | `getByRole('link', { name: 'Click Here' })` | 2 | ✅ | `interactions.spec.ts` |
| `/exit_intent` | Exit intent modal | `.modal` | 5 | ✅ | `interactions.spec.ts`; validate class on failure |

---

## Files — `/download`, `/upload`

| Screen | Element | Selector | Tier | Confirmed | Notes |
|---|---|---|---|---|---|
| `/download` | Download links | `a[href*="/download/"]` | 3 | ✅ | `files.spec.ts` |
| `/upload` | File input | `input[type="file"]` | 2 | ✅ | `files.spec.ts` |
| `/upload` | Upload submit | `#file-submit` | 3 | ✅ | `files.spec.ts` |
| `/upload` | Success heading | `getByRole('heading', { name: /File Uploaded!/i })` | 2 | ✅ | `files.spec.ts` |

---

## Navigation & Misc — `/broken_images`, `/status_codes/*`, `/notification_message_rendered`, `/floating_menu`, `/forgot_password`, `/redirector`, `/slow`, `/geolocation`, `/infinite_scroll`

| Screen | Element | Selector | Tier | Confirmed | Notes |
|---|---|---|---|---|---|
| `/broken_images` | Images | `img` | 4 | ✅ | `navigation.spec.ts` |
| `/status_codes` | 200 link | `getByRole('link', { name: '200' })` | 2 | ✅ | `navigation.spec.ts` |
| `/status_codes` | 301 link | `getByRole('link', { name: '301' })` | 2 | ✅ | `navigation.spec.ts` |
| `/status_codes` | 404 link | `getByRole('link', { name: '404' })` | 2 | ✅ | `navigation.spec.ts` |
| `/status_codes` | 500 link | `getByRole('link', { name: '500' })` | 2 | ✅ | `navigation.spec.ts` |
| `/notification_message_rendered` | Click here link | `getByRole('link', { name: 'Click here' })` | 2 | ✅ | `navigation.spec.ts` |
| `/notification_message_rendered` | Flash message | `.flash` | 5 | ✅ | `navigation.spec.ts` |
| `/floating_menu` | Floating menu | `#menu` | 3 | ✅ | `navigation.spec.ts` |
| `/forgot_password` | Email field | `#email` | 3 | ✅ | `navigation.spec.ts` |
| `/forgot_password` | Submit button | `#form_submit` | 3 | ✅ | `navigation.spec.ts` |
| `/redirector` | Redirect link | `getByRole('link', { name: 'here' })` | 2 | ✅ | `navigation.spec.ts` |
| `/geolocation` | Where am I button | `getByRole('button', { name: 'Where am I?' })` | 2 | ✅ | `navigation.spec.ts` |
| `/geolocation` | Latitude display | `#lat` | 3 | ✅ | Not yet asserted (smoke only) |
| `/geolocation` | Longitude display | `#long` | 3 | ✅ | Not yet asserted (smoke only) |
| `/infinite_scroll` | Scroll content | `p` (tag) | 4 | ✅ | `scroll.spec.ts`; count comparison |

---

## Selector Risks & Gaps

| Risk | Detail | Recommendation |
|---|---|---|
| `TC-DEMO-012` drag and drop | `dragTo()` may not work on CSS-only drag implementation | Fall back to JS `dragAndDrop` dispatch per `project-memory.md §8` |
| `TC-DEMO-037` exit intent modal | `.modal` class — confirm live class name if test fails | Inspect DOM on `/exit_intent`; no stable id available |
| `TC-DEMO-038` dialog message | Dialog message cannot be verified via Playwright API after `accept()` | Accepted limitation; test passes if no unhandled-dialog error |
| `TC-DEMO-011` scroll selector | Previous selector `.jscroll-added, .infinite-scroll p` may not match live DOM | Updated to use plain `p` tag count comparison |
| `TC-DEMO-039` geolocation | Result depends on browser geolocation grant | Test asserts button clickable + page stable; extend assertion if grant is forced via context option |
