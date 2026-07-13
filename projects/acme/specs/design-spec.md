# Design Spec — acme project
_Source: attached design images (model-read). These are the authoritative expected values._

---

## Screen 1 — Home
**Design image:** `docs/design/Screenshot_from_2026-07-13_12-14-01.png`
**URL reached by:** Open `TEST_URL` (`https://example.com/`)

### Colors
| Usage | Value |
|---|---|
| Page background | `#eeeeee` (light grey) |
| Heading text | dark charcoal (≈ `#333333`) |
| Body text | dark charcoal |
| Link ("Learn more") | blue (browser default hyperlink blue ≈ `#0000ee` or similar) |

### Typography
| Element | Style |
|---|---|
| `<h1>` | Bold, large (appears ~2 rem), sans-serif |
| Body `<p>` | Normal weight, smaller than heading |
| Link | Normal weight, underlined, blue |

### Layout / Spacing
- Content block is left-inset at roughly 20% from left edge, centered vertically in upper third
- NO header / nav bar present
- NO logo present
- NO footer present
- Content order top-to-bottom: `<h1>` → `<p>` → link

### Exact Copy (verbatim from design)
| Element | Expected text |
|---|---|
| `<h1>` | `Example Domain` |
| `<p>` | `This domain is for use in documentation examples without needing permission. Avoid use in operations.` |
| Link label | `Learn more` |

### States
- Default only (static design image, no interactive states shown)

---

## Screen 2 — IANA Reserved Domains page
**Design image:** `docs/design/Screenshot_from_2026-07-13_12-14-19.png`
**URL reached by:** Click the "Learn more" link on Screen 1

### Colors
| Usage | Value |
|---|---|
| Header/footer background | light grey (≈ `#e8eef2`) |
| Body background | white `#ffffff` |
| Body text | dark (≈ `#333`) |
| Links (nav, RFC refs, bullet) | blue |

### Typography
| Element | Style |
|---|---|
| `<h1>` | Bold, large, black/dark |
| Section heading ("Further Reading") | Bold, medium |
| Body text | Normal, small-medium |
| Nav links | Normal weight, blue |

### Layout / Spacing
- Header: IANA logo (top-left) + "Internet Assigned Numbers Authority" sub-text + right-aligned top nav
- Top nav (horizontal, right-aligned): `Domains` | `Protocols` | `Numbers` | `About`
- Main content area: white background, generous margin
- "Further Reading" section: bulleted list
- Footer: multi-column link grid + copyright line + "Privacy Policy" + "Terms of Service"

### Exact Copy (verbatim from design)
| Element | Expected text |
|---|---|
| `<h1>` | `Example Domains` |
| Section heading | `Further Reading` |
| Bullet link | `IANA-managed Reserved Domains` |
| Footer link 1 | `Privacy Policy` |
| Footer link 2 | `Terms of Service` |
| Top-nav item 1 | `Domains` |
| Top-nav item 2 | `Protocols` |
| Top-nav item 3 | `Numbers` |
| Top-nav item 4 | `About` |
| Footer revision line | `Last revised 2017-05-13.` |

### Elements that MUST be present
- IANA logo image (top-left)
- "Internet Assigned Numbers Authority" text (below logo)
- Top nav bar with exactly 4 items: Domains, Protocols, Numbers, About
- `<h1>` = "Example Domains"
- Body paragraphs referencing RFC 2606 and RFC 6761 (blue link text)
- "Further Reading" heading
- "IANA-managed Reserved Domains" bullet (blue link)
- Footer with Privacy Policy + Terms of Service links
