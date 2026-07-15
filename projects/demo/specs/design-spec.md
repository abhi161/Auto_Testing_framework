# Design Spec — demo project
> Source: Attached design images (2 screens). These are the INTENDED appearance — the live app is validated AGAINST these.

---

## Screen 1: "Screen 2" — Start page (example.com)
> Design file: `docs/design/Screenshot_from_2026-07-13_12-14-01.png`
> Reached by: Opening TEST_URL (`https://example.com/`)

### Layout
- Single centered content block on a white/light background
- No navigation bar or header branding
- Minimal, sparse layout — only text and one link

### Exact Copy (verbatim from design)
| Element | Expected Text |
|---|---|
| Page `<title>` | `Example Domain` |
| Main heading (`<h1>`) | `Example Domain` |
| Paragraph 1 | `This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.` |
| Link text | `More information...` |

### Colors
- Background: white (`#ffffff` or near-white)
- Body text: dark grey/black
- Link: standard browser blue (underlined)

### Typography
- Heading: large, bold (appears to be default browser `h1`)
- Body: standard serif or sans-serif body text

### States / Elements
- Exactly 1 `<h1>` on the page
- Exactly 1 visible paragraph describing the domain's use
- Exactly 1 link visible: `More information...`
- No images, no nav, no footer with extra links

---

## Screen 2: "Home" — IANA Reserved Domains page
> Design file: `docs/design/Screenshot_from_2026-07-13_12-14-19.png`
> Reached by: Clicking the `More information...` link on Screen 1

### Layout
- IANA branded page with header/navigation
- Full content page with multiple text sections
- Multiple headings for different domain types

### Exact Copy (verbatim from design)
| Element | Expected Text |
|---|---|
| Main heading (`<h1>` or `<h2>`) | `IANA-managed Reserved Domains` |
| Section heading | `Example Domains` |
| Section heading | `Test Domains` |
| Body text (intro) | References reserving domains per RFC / IANA standards |

### Colors
- IANA branded header (dark blue or grey header bar)
- White content area
- Standard link colors

### Elements present
- IANA logo/header navigation
- At least 2 section headings describing domain types
- Paragraph text per section
- Page is NOT example.com — it is the IANA information page

---

## Navigation Graph (from flow.json)
```
[Screen 1: example.com] --click "More information..."--> [Screen 2: IANA Reserved Domains]
```

---

## Design-Parity Checks Summary
| # | Screen | Check | Expected Value |
|---|---|---|---|
| D-01 | Screen 1 | `h1` text | `Example Domain` |
| D-02 | Screen 1 | Paragraph 1 presence & text | `This domain is for use in illustrative examples...` |
| D-03 | Screen 1 | Link label | `More information...` |
| D-04 | Screen 1 | Page title | `Example Domain` |
| D-05 | Screen 1 | Background color | white |
| D-06 | Screen 1 | No navigation header | absent |
| D-07 | Screen 2 | Main heading | `IANA-managed Reserved Domains` |
| D-08 | Screen 2 | Section heading | `Example Domains` |
| D-09 | Screen 2 | Section heading | `Test Domains` |
| D-10 | Screen 2 | IANA branding/header | present |
| D-11 | Screen 2 | URL | Not `https://example.com/` (navigated away) |
