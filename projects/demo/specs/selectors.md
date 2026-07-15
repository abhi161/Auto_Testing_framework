# Selector Map — demo project
> Source: Design images (2 screens) + flow.json. No application source code provided.
> Confirmed live status: marked per column. Live validation done at test execution time.

| Screen | Element | Selector | Priority Tier | Confirmed |
|---|---|---|---|---|
| Screen 1 (example.com) | Main heading | `h1` | 3 — stable tag (single h1) | ⏳ From design; live TBD |
| Screen 1 (example.com) | First body paragraph | `p` (first) or `div > p:first-of-type` | 3 — stable tag | ⏳ From design; live TBD |
| Screen 1 (example.com) | Navigation link | `a:has-text("More information...")` | 4 — getByText | ⏳ From design; live TBD |
| Screen 1 (example.com) | Page title | `document.title` (JS eval) | N/A — JS property | ⏳ From design; live TBD |
| Screen 1 (example.com) | Body background | `body` CSS `background-color` | 3 — stable tag | ⏳ From design; live TBD |
| Screen 1 (example.com) | Navigation bar (absence check) | `nav` | 3 — stable tag | ⏳ From design; live TBD |
| Screen 2 (IANA page) | Main heading | `h1, h2` (first match) | 3 — stable tag | ⏳ After navigation; live TBD |
| Screen 2 (IANA page) | Example Domains section | `text=Example Domains` or heading containing text | 4 — getByText | ⏳ After navigation; live TBD |
| Screen 2 (IANA page) | Test Domains section | `text=Test Domains` or heading containing text | 4 — getByText | ⏳ After navigation; live TBD |
| Screen 2 (IANA page) | IANA branding/header | `header`, `[id*="iana"]`, or `img[alt*="IANA"]` | 3 → 5 cascade | ⏳ After navigation; live TBD |
| Screen 2 (IANA page) | Page URL (changed) | `page.url()` (Playwright API) | N/A — Playwright API | ⏳ After navigation; live TBD |

## Selector Notes

### Screen 1 — example.com
- No `data-testid` attributes expected (standard static HTML domain page — no framework).
- No `aria-label` attributes expected.
- Selectors rely on native semantic HTML tags (`h1`, `p`, `a`), which are stable for this content.
- The `a:has-text("More information...")` selector is case-sensitive by default in Playwright; use `/more information/i` regex if needed.
- `nav` absence: `expect(page.locator('nav')).toHaveCount(0)` is the assertion pattern.

### Screen 2 — IANA Reserved Domains page
- URL destination confirmed as an IANA domain from design content; exact URL validated at runtime.
- IANA branding selector should be confirmed live — may be a logo image, a site `<header>` div, or text.
- Recommended fallback cascade for IANA header: `header >> :text("IANA")` or `body :text("IANA")` if no semantic `<header>`.

## Gaps / Items Needing Live Confirmation
| Gap | Description | Action |
|---|---|---|
| No `data-testid` | Static HTML page — no test IDs present. Tier-3/4 selectors are the best available. | Accept; note in test comments. |
| IANA page exact URL | Destination URL of "More information..." link is not visible from the design image. | Read `href` at runtime; assert URL changed from example.com. |
| IANA branding selector | Exact HTML structure of IANA header unknown without live inspection. | Use broad text-match fallback; refine after exploration. |
| Link exact case | "More information..." — confirm trailing ellipsis (…) vs three dots (...) at runtime. | Use `/more information/i` regex to be safe. |
