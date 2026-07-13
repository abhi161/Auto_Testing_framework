---
name: figma-exploration
description: "Maps every screen/frame in a Figma design file to build a navigation map and baseline screenshots. Use in Test Planner Phase 3 when a Figma source is configured, ahead of design-token extraction (figma-design-validation)."
---

# Figma Exploration

## When to use
When `FIGMA_FILE_URL`/`FIGMA_FILE_KEY` is set (or a Figma URL is in the prompt) and the Test Planner
needs a full map of the design file to pair against `specs/ui-map.md`.

## Access order (first that works)
1. `figma/*` MCP tools, if connected.
2. Figma REST API: `GET https://api.figma.com/v1/files/{FIGMA_FILE_KEY}` with header
   `X-Figma-Token: $FIGMA_TOKEN`.
3. Browser fallback: open the Figma URL with `playwright-test` tools, wait for the canvas to render,
   and use Figma's own page/frame list in the left sidebar to enumerate frames.

## Procedure
1. Enumerate top-level pages, then frames within each page (these usually correspond 1:1 with app
   screens). Record each frame's `node-id`.
2. Match each frame to the corresponding app route from `specs/ui-map.md` by name/content — flag any
   frame with no app counterpart (unbuilt) or app screen with no frame (undocumented).
3. Export/screenshot each target frame into `docs/design/` as a baseline image.

## Output
`specs/figma-map.md`:
```markdown
# Figma Map
## Pages & frames (table: Page, Frame, node-id, Matched app route)
## Unmatched frames (design without implementation)
## Unmatched routes (implementation without design)
```
Hands off frame list + node-ids to `figma-design-validation` for token extraction and test-case
derivation.
