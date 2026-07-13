---
name: test-traceability
description: "Ensures every test traces to a source file/line, a business rule (BR-###) when applicable, and a docs/actualtestcases.csv row. Used to build specs/master-test-plan.md and to map execution results back to test cases."
---

# Test Traceability

## Principle
No test should exist without a traceable origin (`copilot-instructions.md` §7): a `Test Case No.` in
`docs/actualtestcases.csv`, a source file/line, and a `BR-###` when the test enforces a business rule.

## `specs/master-test-plan.md` format
Use `assets/master-test-plan-template.md`. One entry per test case:
```markdown
### TC-<###>: <Title>
- **Test Type:** Automated | Design
- **Source:** `src/path/to/Component.tsx:42` (or Figma node `<id>` for Design cases)
- **Business Rule:** BR-### — <one line> (omit if none)
- **Steps:** 1. ... 2. ...
- **Expected outcome:** ...
- **Spec file:** `tests/<file>.spec.ts` (filled in once generated)
```

## Round-trip with `docs/actualtestcases.csv`
Keep `Test Case No.` identical between the CSV and the master plan. The CSV is the flat, spreadsheet-
friendly plan (columns: `Test Case No., Test Case/Summary, Test Type, Description, Data, Test Steps,
Expected outcome`); the master plan is the same content with traceability links added.

## Mapping execution results back (Executor & Analyser)
When reporting, join each spec's test name / `Test Case No.` comment back to its master-plan entry so
`specs/test-execution-report.md` can show a `Test Case No. → Status` table and compute traceability
coverage (% of cases with a confirmed source/BR link and a passing/failing spec on record).
