---
name: ui-exploration
description: "Black-box exploration of the running application UI to validate source-code analysis: screens, navigation graph, interactive elements. Use in Test Planner Phase 3, never by the Context Analyst (which is source-code-only)."
---

# UI Exploration (application under test)

## When to use
Only the **Test Planner** (and, transitively, `tests/ui-exploration.spec.ts` it may generate) explores
the running application. The Context Analyst and other agents must not navigate the app UI.

## Procedure
1. Log in once via `tests/helpers/auth.helper.ts` (shared session, per `playwright-rules`).
2. Walk every route found in `source-code-analysis`'s routes table. For each screen record:
   - Screen name/route, purpose (one line).
   - Interactive elements (buttons, forms, links) with the selector that will be used to target them
     (prefer `data-testid`/`aria-label` confirmed live).
   - Navigation edges (which screens this one links to) — build a simple graph.
   - Visible states worth testing (empty state, error state, loading, populated).
3. Screenshot each screen (`fullPage: true`, deterministic 1920×1080 viewport) into
   `specs/screenshots/`.
4. Cross-check against the source-code analysis: flag any route/component found in code but not
   reachable in the UI (dead code or auth-gated) and vice versa (client-side routing not in source).

## Output
`specs/ui-map.md`:
```markdown
# UI Map
## Screens (table: Route, Purpose, Key elements, States)
## Navigation graph (screen → screen, trigger)
## Discrepancies vs source-code analysis
```
Plus `specs/screenshots/*.png`. Selectors confirmed here feed `specs/selectors.md`
(`selector-extraction`) and `specs/project-memory.md`.
