# Copilot Instructions — Playwright Test Automation

Always-on rules for this repository. These apply to every agent and every run so behavior is
**deterministic** (run #1 == run #N).

## 0. Per-application isolation (resolve the active project FIRST)
Testing is organized per application under `projects/<project>/`. Before anything else, resolve the
active project:
1. Use the project **named in the user's prompt** (e.g., "test the ftc project").
2. If not given, fall back to `TEST_PROJECT` in the root `.env` (default `ftc`).
3. If still unknown, ask the user.

Each project is self-contained: `projects/<project>/{tests,specs,docs,.env,auth-state.json}`. The
shared framework (`.github/` agents, skills, rules; `.vscode/mcp.json`; root config) is global.
**All artifact paths in these instructions and in the agents/skills — `specs/…`, `tests/…`,
`docs/actualtestcases.csv`, `docs/issues.csv`, screenshots, reports, `project-memory.md` — are relative
to the active project root `projects/<project>/`.** The only shared `docs/` items are the template
`docs/sampletestcases.csv` and framework docs like `docs/ARCHITECTURE.md`. Never mix artifacts across
projects.

To start a new application, copy `projects/_template/` → `projects/<name>/` (it provides the
project-level `tests/helpers/auth.helper.ts`, a seed `specs/project-memory.md`, and CSV headers), then
fill `projects/<name>/.env`. The Context Analyst does this bootstrap automatically when the project
folder is missing.

## 0a. Load memory first
Before doing anything, read the active project's `specs/project-memory.md`
(`projects/<project>/specs/project-memory.md`). It holds the verified `identity_provider`, working
selectors, canonical env-var names, and known routes for that application. Use those values — do not
re-derive or guess them. When you confirm a new fact, update that file.

## 1. Canonical environment variables (only these)
`TEST_URL`, `TEST_AUTH_URL`, `TEST_USER`, `TEST_PASS`, `IDENTITY_PROVIDER`.
Never use `APP_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USERNAME`, or `TEST_PASSWORD`.

## 1a. Stay in your lane — one stage, one job (STRICT)
Each agent does ONLY its own pipeline stage and then STOPS and hands off. **Never do a later stage's
work, even if you could.** In particular:
- **Context Analyst** → produces ONLY `specs/test-strategy.md` + `specs/project-memory.md` (+ design
  spec). It does **not** write test cases, does **not** generate or run tests, does **not** write an
  execution report. It cannot run shell commands.
- **Test Planner** → produces the plan (`docs/actualtestcases.csv`, `master-test-plan.md`, `selectors.
  md`). It does **not** write `.spec.ts` files and does **not** run the suite.
- **Test Generator** → writes/verifies the `tests/*.spec.ts` files. It does **not** write the final
  report or triage defects.
- **Test Executor & Analyser** → runs the suite, writes the report, logs defects.
- **Test Healer** → fixes test-side issues only.

These boundaries are **enforced in code** (per-stage tool + write-path permissions): a write outside
your stage's files, or a shell command from a stage that may not run one, returns `BLOCKED`. When you
see `BLOCKED`, do not retry — finish your own stage's artifacts and stop. The human advances to the
next stage (and approves gated artifacts); you never advance the pipeline yourself.

## 1b. Resuming after an interruption (stages are idempotent)
A run can be interrupted by a network hiccup and the stage **restarted from the top**. Do NOT blindly
regenerate everything. At the start of your stage, check whether your own output artifacts already
exist from a prior attempt (e.g. Context Analyst → `specs/test-strategy.md`, `specs/design-spec.md`;
Planner → `docs/actualtestcases.csv`, `specs/master-test-plan.md`, `specs/ui-map.md`; Generator →
`tests/*.spec.ts`). If an artifact exists and is **complete and correct**, keep it — verify it, fill
any gaps, and move on; do not re-derive it from scratch. If it is partial or empty, complete it. This
makes a restart a fast *verify-and-continue* instead of a full redo. Re-extracting the design from the
attached images is expensive — if you have already written `design-spec.md`, trust it and skip
re-derivation unless it is missing values. (Design images are attached only on the FIRST step of a
stage; on later steps rely on the description you already wrote — do not ask for the images again.)

## 2. Authentication is ALWAYS Microsoft Azure AD
Enterprise AWS Cognito federates to Azure AD. The login form is Microsoft's.
- Use the single canonical helper `tests/helpers/auth.helper.ts` (from the `azure-ad-authentication`
  skill). Never write a second auth variant.
- `identity_provider` must be `<cognito-prefix>-idp`, never `COGNITO`.
- Never use Cognito Hosted UI selectors (`input[name="username"]`).

## 3. Source code is the primary source of truth
Analyze the application source (routes, components, handlers, selectors) BEFORE UI exploration. UI
exploration validates the code analysis; it does not replace it. The app-under-test source lives in
**`projects/<project>/codebase/`** when the user provided a local path (the bridge links it there), or
in the workspace **`src/`** when this framework runs inside the app repo — check `codebase/` first,
then `src/`. If neither exists, no code was provided: fall back to the design source + UI exploration
and say so; never fabricate routes/components.

**The code IS the navigation graph.** Router config, `<a href>`/`<Link>` targets, and
`navigate()`/`router.push()` handlers tell you exactly which element on which screen leads to which
screen. This is how many screens get linked into flows **without Figma and without the human manually
wiring them** — the Context Analyst extracts the edges, the Planner assembles them into the navigation
graph in `specs/ui-map.md`, and the Generator writes multi-screen flow tests from it. When no code is
available, flows instead come from `docs/flow.json` / the `User flow` block (screenshots) or Figma
prototype links. Same navigation-graph contract, different producer.

## 3b. The DESIGN is the source of truth — NEVER the live UI
For UI/visual testing, the intended **design is the single source of truth**, and it comes from ONE of:
1. **Design image(s)** attached to the task (uploaded screenshots/mockups). When the task says a design
   source of truth is attached, the model can literally SEE those images — read them directly. They live
   in `docs/design/`.
2. A **Figma URL** (in the prompt or `FIGMA_FILE_URL`/`FIGMA_FILE_KEY`) — access via the
   `figma-design-validation` skill (Figma MCP → REST API → Chrome).

**Critical principle:** derive the EXPECTED test cases from the design (what the UI *should* be), then
test the **live application URL against that expectation**. **Never treat the running UI as the source
of truth** — the whole point of testing is that the live app may contain the very defects you are
looking for. Any difference between the live app and the design is a **DEFECT** → report as FAILURE and
log it to `docs/issues.csv` (`Failure Category = Design-Deviation` or `UI Defect`). Never invent design
values, and never "fix" a test to match a wrong live UI.

### Every attached image is a DESIGN screen — NONE is "the live app"
When multiple images are attached they are the design for **different screens/states of a user flow**,
each one the intended look of ONE screen. **Do not assume one image is the design and another is the
live app** — you never receive a screenshot of the live app; the live app is only ever observed by
running Playwright at execution time. If a run provides a **flow** (a `User flow:` block in the task,
or `docs/flow.json`), it lists the screens IN ORDER with the navigation action that reaches each:
- Screen 1 is the **start page** (open `TEST_URL`).
- Each later screen is reached by performing its action from the previous screen (e.g. *click the
  "Learn more" link*, *fill the login form and submit*).
The **Test Generator** writes ONE Playwright flow that: opens the start page → validates it against
screen 1's design → performs the next action → validates the resulting page against screen 2's design →
and so on. Do **NOT** pre-declare deviations before execution, and do **NOT** cross-compare two design
images against each other (they are different screens, not design-vs-live).

When a design image is attached: enumerate the concrete, checkable expectations you can see in it
(headings and their exact text, buttons/links and their labels, key layout regions, colors where
obvious, presence/order of elements) and turn each into a test case with the expected value taken from
the image.

### Only assert what the design ACTUALLY shows (no inference)
A static image conveys **appearance and text**, not behavior. You can see: text, labels, layout,
colors, element presence/order. You **cannot** see: a link's `href`/destination, click behavior, API
responses, hover/animation, or anything not visually rendered. **Never invent these and never record
an inferred value as a verified fact or business rule.** If a value is not directly visible in the
design source, either omit it or mark it explicitly `(unverified — not derivable from the design)` and
do NOT raise a defect based on it. A Figma *prototype link* or an explicit written spec MAY define
behavior; a flat screenshot does not.

### project-memory.md is verified facts only — never speculation
Record in `project-memory.md` only values you have actually observed (from the design source or a
confirmed live/tool result). Inferences, guesses, and "should probably be" values do not belong there —
they contaminate every future run. When in doubt, leave it out.

### Do not pre-declare test outcomes
The Context Analyst/Planner describe EXPECTED values and known *open* issues, but must not assert this
run's pass/fail before the Executor runs the tests (e.g. don't write "TC001 MUST remain failing"). Open
issues from `docs/issues.csv` are *candidates to re-verify this run*, not confirmed current facts.

## 4. Selector priority
`data-testid` → `aria-label` / `getByRole` → stable `id` → text → (avoid) class → (never) brittle XPath.

## 5. Shared session for OAuth
Log in ONCE (`beforeAll` or `storageState`), reuse across tests. Never re-authenticate per test.

## 6. One test at a time (generation)
Generate and verify a single test before starting the next. Do not batch-create.

## 7. 100% traceability
Every generated test must trace back to: a source file/line (component, route, or handler), a
business rule (`BR-###`) when one applies, and a row in `docs/actualtestcases.csv` (`Test Case No.`).
Record the mapping using the `test-traceability` skill template in `specs/master-test-plan.md`. A test
with no traceable origin should not exist — either find its source/requirement or drop it.

## 8. Application vs. test-case defects
Every failure is classified into exactly one bucket:
- **Application/design issue** (real defect) → logged to `docs/issues.csv`, test is left failing
  (`test.fixme('APP BUG: ...')` or `'DESIGN DEVIATION'`) so the defect stays visible. Never weaken a
  test or change an expected value just to force a pass.
- **Test-case issue** (selector, timing, stale baseline, environment, test bug) → fixed by the Test
  Healer and recorded in `specs/test-analysis.md`. Never logged to `docs/issues.csv`.

## 9. Deterministic runtime
Fixed viewport `1920×1080`, `deviceScaleFactor: 1`, window maximized, concrete waits only (no
arbitrary `waitForTimeout`). See `playwright-rules` and `auth-rules` instruction files for specifics.

## 10. Reporting
`specs/test-execution-report.md` is the terminal artifact of a full pipeline run: pass/fail counts,
flaky tests, root-cause breakdown, design-parity score (if applicable), and open items in
`docs/issues.csv`. Generated only when the Executor & Analyser reaches an all-green (or exhausted
healing) state.
