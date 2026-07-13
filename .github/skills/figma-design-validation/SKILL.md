---
name: figma-design-validation
description: "Design source of truth handling: extracting design tokens from Figma (or screenshots as fallback), deriving design-parity test cases, generating design-assertion specs, and scoring app-vs-design deviations. Used by every pipeline stage that touches appearance."
---

# Figma / Design Validation

## Source of truth precedence
Both of these are PRIMARY, deliberate sources of truth (pick whichever the run provides):
1. **Attached design image(s)** — screenshots/mockups uploaded for the run and stored in
   `docs/design/`. When the task says a design source is attached, **the model can literally SEE the
   image** — read the expectations directly from it (headings and their exact text, button/link labels,
   layout regions, element presence/order, obvious colors). This is a first-class source, not a fallback.
2. **Figma** (when `FIGMA_FILE_URL`/`FIGMA_FILE_KEY` given) — access order: `figma/*` MCP → Figma REST
   API → browser (open the Figma URL with `playwright-test`, screenshot frames).

The design is the source of truth; **the live application is NEVER the source of truth** — it is the
thing under test and may contain the very defect you are looking for. Any difference between the live app
and the design is a DEFECT. Never invent design values — read them from the image/Figma.

## Token extraction (Context Analyst, Phase 3 / Test Planner exploration)
Per screen/frame, extract into `specs/design-spec.md`:
- **Colors** (hex + usage: background, text, border, accent).
- **Typography** (font family, size, weight, line-height per text style).
- **Spacing/layout** (padding, gaps, breakpoints if responsive frames exist).
- **States** (default, hover, disabled, error, empty) if the frame defines them.
- **Exact copy** (button labels, headings, error messages) — verbatim, not paraphrased.

```markdown
# Design Spec
## <Screen name> (Figma node <id>)
### Colors / Typography / Spacing / States / Copy
```

## Deriving design-parity test cases (Test Planner)
For each screen with a design spec, add rows to `docs/actualtestcases.csv` with `Test Type = Design`:
assert exact colors/copy/spacing against the live app, and a `toHaveScreenshot` visual diff against the
frame baseline in `docs/design/`. Use `<from Figma>` as a placeholder only when a token genuinely
hasn't been extracted yet — never a guessed value.

## Generating design specs (Test Generator)
Use `assets/design.spec.ts.template` for `tests/design/*.spec.ts`: navigate to the screen (shared
session), assert extracted tokens via computed styles / text content, and `expect(page).
toHaveScreenshot('<screen>.png')` against the baseline.

## Scoring & reporting (Executor & Analyser)
Compute a design-parity score = checks passed / total design checks. Any deviation (app ≠ design) is a
**real defect** — log to `docs/issues.csv` with `Failure Category = Design-Deviation`, never adjust the
expected value to force a pass (see `copilot-instructions.md` §8).

## Healing design failures (Test Healer)
Only fix test-side problems: wrong selector, stale/incorrect baseline, overly tight screenshot
tolerance/mask. A genuine app≠design deviation stays failing (`test.fixme('DESIGN DEVIATION')`).
