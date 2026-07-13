---
name: source-code-analysis
description: "Static, glass-box analysis of the application source (routes, components, handlers, API calls, business rules, selectors) that grounds test planning before any UI exploration. Use at the start of Test Planner Phase 2."
---

# Source Code Analysis

## Why
Source code is the primary source of truth (see `copilot-instructions.md` §3). UI exploration
*validates* what is found here — it never substitutes for it.

## Procedure
1. **Identify the stack.** Read `package.json` (framework, router, test libs), and any
   `tsconfig.json`/build config, to know how routes and components are organized.
2. **Enumerate routes.** Grep router config / file-based route directories. Produce a table:
   `Route | Component/Page | Auth required? | Notes`.
3. **Enumerate components & handlers.** For each route's top component, list child components,
   event handlers (`onClick`, `onSubmit`, etc.), and any API calls (`fetch`, `axios`, generated
   clients) with their endpoints and payload shape.
4. **Extract business rules.** Look for validation logic, conditional rendering, permission checks,
   feature flags — number each as `BR-###` with a one-line description and the file/line it lives in.
5. **Extract stable selectors.** Prefer existing `data-testid`/`aria-label` attributes found in JSX/
   templates. Note any missing ones as gaps (report to the user; don't invent selectors that don't
   exist in code — validate live in the Test Planner's exploration phase instead).

## Output
A set of tables (routes, components/handlers, business rules) fed into `specs/test-strategy.md` §3/§5
and later into `specs/master-test-plan.md`. Also seeds `specs/selectors.md` (see
`selector-extraction`).
