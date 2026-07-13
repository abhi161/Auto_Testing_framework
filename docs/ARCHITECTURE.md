# Playwright Test-Automation Architecture

**Project:** Playwright UI Test Automation Framework
**Document type:** Architecture & Design Reference
**Audience:** QA engineers, SDETs, developers, and maintainers of the agent framework
**Status:** Current (reflects the `.github/agents` structure)

---

## Table of Contents

1. [Purpose & Goals](#1-purpose--goals)
2. [Core Design Principles](#2-core-design-principles)
3. [System Overview](#3-system-overview)
4. [VS Code Customization Primitives](#4-vs-code-customization-primitives)
5. [Repository Layout](#5-repository-layout)
6. [The Agent Pipeline](#6-the-agent-pipeline)
7. [Agents in Detail](#7-agents-in-detail)
8. [Skills in Detail](#8-skills-in-detail)
9. [Rules (Instruction Files)](#9-rules-instruction-files)
10. [The Memory System](#10-the-memory-system)
11. [Runtime & Configuration](#11-runtime--configuration)
12. [End-to-End Workflow Walkthrough](#12-end-to-end-workflow-walkthrough)
13. [How Determinism Is Guaranteed](#13-how-determinism-is-guaranteed)
14. [Artifacts Reference](#14-artifacts-reference)
15. [Extending the Framework](#15-extending-the-framework)
16. [Glossary](#16-glossary)

---

## 1. Purpose & Goals

This repository automates **end-to-end UI testing** of one or more enterprise web applications that
authenticate through **AWS Cognito federated to Microsoft Azure AD**. Instead of one monolithic "write
my tests" prompt, the work is decomposed into a **team of specialized AI agents** that hand off to one
another, backed by **reusable skills**, **enforceable rules**, and a **shared memory** of verified facts.

The framework was built to satisfy four goals:

| Goal | What it means | How it is achieved |
|------|---------------|--------------------|
| **Determinism** | Run #1 and run #N behave identically | Shared memory of verified facts, a single canonical auth helper, standardized env vars, fixed viewport |
| **Reusability** | No copy-pasted logic across agents | Skills (`.github/skills/`) hold procedures; agents reference them |
| **Separation of concerns** | Each stage does one job well | One agent per pipeline stage, minimal tools each |
| **Traceability** | Every test maps to source + requirement | The `test-traceability` skill enforces the linkage |

---

## 2. Core Design Principles

These principles are encoded in [.github/copilot-instructions.md](../.github/copilot-instructions.md)
(always-on) and enforced by the instruction files.

1. **Load memory first.** Every agent reads `specs/project-memory.md` (per active project) before
   acting, so verified values are reused rather than re-derived.
2. **Source code is the primary source of truth.** `src/` is analyzed before the UI is explored; UI
   exploration *validates* code analysis, it does not replace it.
3. **Authentication is always Microsoft Azure AD.** A single canonical helper is used everywhere; the
   `identity_provider` is `<cognito-prefix>-idp`, never `COGNITO`.
4. **Canonical environment variables only.** `TEST_URL`, `TEST_AUTH_URL`, `TEST_USER`, `TEST_PASS`,
   `IDENTITY_PROVIDER` — nothing else.
5. **Shared session for OAuth.** Log in once, reuse the session; never re-authenticate per test.
6. **One test at a time.** Tests are generated and verified individually, not in a batch.
7. **Deterministic viewport.** Fixed 1920×1080, `deviceScaleFactor: 1`, maximized window; concrete
   waits, never arbitrary sleeps.
8. **Design is a first-class source of truth.** When a Figma URL is provided it is authoritative over
   committed screenshots; deviations are real defects, never silently accepted.
9. **Application bugs are never masked.** A failing test that exposes a genuine app/design defect stays
   failing (`test.fixme`) and is logged to `docs/issues.csv` — it is not "fixed" by weakening the test.

---

## 3. System Overview

Each application under test lives in its own isolated project folder under `projects/<project>/`. The
agent framework itself (`.github/agents`, `.github/skills`, `.github/instructions`,
`docs/ARCHITECTURE.md`) is shared and global — it is not duplicated per project.

```
User request → Orchestrator → Context Analyst → Test Planner → Test Generator
                                                                      │
                                                                      ▼
                                                        Test Executor & Analyser
                                                              │         ▲
                                                (issues found)│         │(re-run)
                                                              ▼         │
                                                          Test Healer ──┘
                                                              │
                                              (all green) → Execution Report
```

---

## 4. VS Code Customization Primitives

The framework maps onto three VS Code / Copilot customization primitives:

| Primitive | Location | Purpose |
|---|---|---|
| **Chat agents** | `.github/agents/*.md` | One markdown file per pipeline stage: frontmatter (`name`, `description`, `tools`, `handoffs`, `model`) + instructions. |
| **Instruction files** | `.github/instructions/*.instructions.md` | Always-applied rules scoped by `applyTo` glob (auth selectors, test-authoring conventions). |
| **Skills** | `.github/skills/<name>/SKILL.md` (+ `assets/`) | Reusable, on-demand procedures and templates agents pull in explicitly by name. |

Plus `.vscode/mcp.json` wiring the `playwright-test` and `figma` MCP servers so agents can drive a real
browser and read Figma files directly instead of only generating spec files.

---

## 5. Repository Layout

```
.
├── .github/
│   ├── copilot-instructions.md       # always-on rules (§0–§10)
│   ├── agents/                       # one file per pipeline stage
│   ├── instructions/                 # auth-rules, playwright-rules
│   └── skills/                       # reusable procedures + asset templates
├── docs/
│   ├── ARCHITECTURE.md               # this file
│   └── sampletestcases.csv           # canonical CSV column header/example
├── projects/
│   ├── _template/                    # scaffold copied for each new app
│   │   ├── tests/helpers/auth.helper.ts
│   │   ├── specs/project-memory.md
│   │   ├── docs/actualtestcases.csv
│   │   ├── docs/issues.csv
│   │   ├── docs/design/
│   │   └── .env.example
│   └── <project>/                    # one folder per application under test
│       ├── tests/                    # *.spec.ts, helpers/, design/
│       ├── specs/                    # strategy, plan, memory, reports
│       ├── docs/                     # test cases, issues, design baselines
│       └── .env
├── .vscode/mcp.json                  # playwright-test + figma MCP servers
├── playwright.config.ts
├── package.json
└── .env                              # TEST_PROJECT (which projects/<x> is active)
```

---

## 6. The Agent Pipeline

1. **Context Analyst** — environment, auth discovery, source-code architecture, design source of truth.
2. **Test Planner** — source-code analysis + UI/Figma exploration → canonical test-case CSV + master plan.
3. **Test Generator** — one Playwright spec at a time, verified before moving to the next.
4. **Test Executor & Analyser** — runs the suite, classifies failures, branches to Healer or Report.
5. **Test Healer** — fixes test-side issues, confirms/logs application defects, always hands back to
   the Executor & Analyser (never the terminal step).

The Orchestrator agent drives the sequence end-to-end; each stage can also be invoked directly for
targeted work (e.g., re-running just the Healer after a manual fix).

---

## 7. Agents in Detail

See `.github/agents/*.md` — each file is self-contained with its own "Before anything" project-scope
resolution, skills/rules references, numbered phases, and explicit output artifacts.

---

## 8. Skills in Detail

| Skill | Used by | Produces |
|---|---|---|
| `azure-ad-authentication` | Context Analyst, Generator, Healer | `tests/helpers/auth.helper.ts`, exploration spec fallback |
| `source-code-analysis` | Test Planner | routes/components/business-rule tables |
| `ui-exploration` | Test Planner | `specs/ui-map.md`, `specs/screenshots/` |
| `figma-exploration` | Test Planner | `specs/figma-map.md` |
| `figma-design-validation` | Context Analyst, Planner, Generator, Executor, Healer | `specs/design-spec.md`, design specs, parity scoring |
| `selector-extraction` | Planner, Generator, Healer | `specs/selectors.md` |
| `test-traceability` | Planner, Executor & Analyser | `specs/master-test-plan.md`, coverage reporting |

---

## 9. Rules (Instruction Files)

- `auth-rules.instructions.md` — Microsoft/Azure AD selectors, forbidden Cognito Hosted UI selectors,
  canonical env vars, session persistence. Applies to `tests/**`, `**/*.spec.ts`, `global-setup.ts`.
- `playwright-rules.instructions.md` — selector priority, shared session pattern, deterministic waits
  and viewport, traceability comments, one-test-at-a-time. Applies to `tests/**`, `**/*.spec.ts`,
  `playwright.config.ts`.

---

## 10. The Memory System

`specs/project-memory.md` (per project) is the durable, cross-run record of verified facts: identity
provider string, confirmed selectors, canonical routes, Figma access details and tokens, and any
gotchas discovered during healing. Every agent reads it first and writes newly confirmed facts back —
this is what makes run #N as fast and correct as run #1.

---

## 11. Runtime & Configuration

- `playwright.config.ts`: fixed `viewport: { width: 1920, height: 1080 }`, `deviceScaleFactor: 1`,
  JSON + HTML reporters, `storageState` wiring for the shared session.
- `.env` (root): `TEST_PROJECT` selects the active `projects/<project>/`.
- `projects/<project>/.env`: `TEST_URL`, `TEST_AUTH_URL`, `TEST_USER`, `TEST_PASS`,
  `IDENTITY_PROVIDER`, optional `FIGMA_FILE_URL`/`FIGMA_FILE_KEY`/`FIGMA_TOKEN`.
- `.vscode/mcp.json`: `playwright-test` and `figma` MCP server registration.

---

## 12. End-to-End Workflow Walkthrough

1. User: "test the ftc project against this Figma file: <url>."
2. Orchestrator resolves `TEST_PROJECT=ftc`, hands off to Context Analyst.
3. Context Analyst bootstraps `projects/ftc/` if missing, discovers auth, reads `src/`, extracts Figma
   tokens → `specs/test-strategy.md`.
4. Test Planner analyzes source, explores the live app and the Figma frames → `docs/actualtestcases.csv`
   + `specs/master-test-plan.md` + `specs/selectors.md`.
5. Test Generator writes and verifies each spec one at a time.
6. Executor & Analyser runs the full suite; if everything is green, writes
   `specs/test-execution-report.md`; otherwise hands off to the Healer.
7. Healer fixes test-side issues, logs any confirmed app/design defects, hands back to the Executor &
   Analyser, which re-runs and closes the loop.

---

## 13. How Determinism Is Guaranteed

- Single canonical auth helper + selector set (no drift between agents).
- Fixed viewport/deviceScaleFactor for reproducible screenshots and visual diffs.
- Concrete waits only — no `waitForTimeout` flakiness.
- Memory-first: verified facts are reused, not re-derived (and thus not re-guessed differently each run).
- Explicit application-vs-test-case classification prevents "fixing" tests by masking real bugs, which
  would otherwise make green runs non-deterministically hide regressions.

---

## 14. Artifacts Reference

| Artifact | Written by | Consumed by |
|---|---|---|
| `specs/test-strategy.md` | Context Analyst | Test Planner |
| `specs/ui-map.md`, `specs/figma-map.md` | Test Planner | Test Planner (self), Generator |
| `specs/design-spec.md` | Context Analyst / Planner | Generator, Executor, Healer |
| `docs/actualtestcases.csv` | Test Planner | Generator |
| `specs/master-test-plan.md` | Test Planner | Generator, Executor & Analyser |
| `specs/selectors.md` | Planner, Generator, Healer | all |
| `tests/*.spec.ts`, `tests/design/*.spec.ts` | Test Generator | Executor & Analyser, Healer |
| `specs/test-analysis.md` | Executor & Analyser | Test Healer |
| `docs/issues.csv` | Executor & Analyser, Healer | reporting, humans |
| `specs/test-execution-report.md` | Executor & Analyser | humans |
| `specs/project-memory.md` | all agents | all agents (next run) |

---

## 15. Extending the Framework

- **New application:** copy `projects/_template/` → `projects/<name>/`, fill `.env`.
- **New skill:** add `.github/skills/<name>/SKILL.md` (+ `assets/` templates); reference it from the
  relevant agent's "Skills & rules" section.
- **New rule:** add `.github/instructions/<name>.instructions.md` with an `applyTo` glob.
- **New pipeline stage:** add `.github/agents/<name>.md`, wire it into the Orchestrator's `handoffs`
  and pipeline diagram.

---

## 16. Glossary

- **IdP** — Identity Provider (here, Microsoft Azure AD via Cognito federation).
- **Design parity** — the app's rendered UI matching extracted Figma tokens/screenshots.
- **Test-case issue** — a defect in the test itself (selector, timing, baseline, environment).
- **Application issue** — a real defect in the app under test; never masked by a passing test.
- **Traceability** — the link from a test back to its source code and/or business rule.
