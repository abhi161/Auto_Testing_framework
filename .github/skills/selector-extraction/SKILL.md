---
name: selector-extraction
description: "Finding and recording stable selectors, in priority order, and building/maintaining specs/selectors.md. Use whenever a test needs a selector and when healing selector-category failures."
---

# Selector Extraction

## Priority order
1. `data-testid="..."`
2. `getByRole(...)` / `aria-label="..."`
3. stable, non-generated `id="..."`
4. `getByText(...)`
5. ⚠️ class names — last resort, expect churn
6. ❌ brittle XPath / deep CSS chains — never

## Procedure
1. **Check memory first**: `specs/project-memory.md` §5 for an already-confirmed selector.
2. **Search source** (`source-code-analysis`): grep JSX/templates for `data-testid`/`aria-label` near
   the element in question.
3. **Validate live**: use MCP `generate-locator`/snapshot tools if available, or Playwright's
   codegen/inspector, to confirm the selector resolves to exactly one element.
4. **Record**: add/update the row in `specs/selectors.md` and mirror confirmed ones into
   `specs/project-memory.md` §5.

## `specs/selectors.md` format
```markdown
# Selector Map
| Screen | Element | Selector | Priority tier | Confirmed |
|---|---|---|---|---|
| Login | Email input | input[name="loginfmt"] | Microsoft auth (see auth-rules) | ✅ |
```

## Healing selector failures
When a test fails with "locator not found/timed out": re-run step 2–3 above — the DOM likely changed.
Never fall back to a lower-tier selector than what's still available; only drop a tier when the
higher-tier attribute has genuinely been removed from the source.
