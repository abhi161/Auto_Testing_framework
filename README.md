# NovoTest.ai — Agentic QA Testing Platform

An agentic, design-driven test-automation platform. You give it the **design** of how a UI
*should* look (screenshots, a Figma link, or the app's source code) and a **live URL**; a pipeline
of six specialised agents analyses it, writes Playwright tests, runs them against the live app, and
reports every deviation from the design as a **defect** — with a human-in-the-loop approval gate at
each stage.

The models are driven through **GitHub Copilot's Language Model API inside VS Code** (`vscode.lm`),
so **there are no separate API keys** — the platform borrows your existing Copilot entitlement.

---

## Table of contents
1. [Can anyone run this?](#can-anyone-run-this)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Installation (step by step)](#installation-step-by-step)
5. [Running it (step by step)](#running-it-step-by-step)
6. [Using the platform](#using-the-platform)
7. [Project layout](#project-layout)
8. [Configuration](#configuration)
9. [Troubleshooting](#troubleshooting)

---

## Can anyone run this?

**Yes — from this source tree, with two-command install and F5** — *provided they meet one hard
requirement:* an active **GitHub Copilot** subscription signed into VS Code. The platform has no API
keys of its own by design; it calls Copilot's model through VS Code's `vscode.lm` API. Without
Copilot there is no model and nothing runs.

Everything else (the web UI, the bridge, Playwright) is self-contained in this repo — the web UI has
**zero npm dependencies**, and the bridge ships inside the VS Code extension. So: clone → install →
open in VS Code → F5 → start the web UI. Full steps below.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Browser — Web UI  (web-ui/, zero deps)         http://localhost:5173          │
│  Dashboard · New Run · flow builder · approval gates · reports · issues        │
└───────────────┬────────────────────────────────────────────────────────────────┘
                │  HTTP + NDJSON  (loopback only, never network-exposed)
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Bridge  (vscode-extension/src/bridgeServer.ts)   127.0.0.1:5051               │
│  Runs INSIDE a VS Code Extension Development Host. Endpoints: /projects,        │
│  /chat (streams a stage), /design, /upload, /report, /issues, /results …        │
└───────────────┬────────────────────────────────────────────────────────────────┘
                │  vscode.lm.selectChatModels({ vendor: 'copilot' })
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Agent loop  (vscode-extension/src/bridge.ts)                                  │
│  ReAct tool-loop: read_file · write_file · list_dir · run_command              │
│  Per-stage role boundaries enforced in code (tool + write-path permissions)     │
└───────────────┬────────────────────────────────────────────────────────────────┘
                │  reads instructions from
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Agent framework  (.github/)                                                   │
│  copilot-instructions.md (always-on rules) · agents/*.md (6 agents) · skills/  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### The pipeline (6 agents, one job each)
Agents run one stage at a time; the human approves and advances between stages.

| # | Agent | Produces | Can run shell? |
|---|-------|----------|----------------|
| 1 | **Context Analyst** | `specs/test-strategy.md`, `specs/design-spec.md`, `specs/project-memory.md` — reads the app source (routes/nav graph) + the design images | no |
| 2 | **Test Planner** | `docs/actualtestcases.csv`, `specs/master-test-plan.md`, `specs/ui-map.md` (navigation graph), `specs/selectors.md` | yes (UI exploration) |
| 3 | **Test Generator** | `tests/*.spec.ts` (incl. multi-screen flow specs), one verified test at a time | yes |
| 4 | **Test Executor & Analyser** | runs the suite, `specs/test-execution-report.md`, logs defects to `docs/issues.csv` | yes |
| 5 | **Test Healer** *(if needed)* | fixes **test-side** issues only; adjudicates test-bug vs. real defect | yes |
|   | **Orchestrator** | coordinates the above (see `.github/agents/playwright-orchestrator.md`) | — |

### Core principles
- **Design is the source of truth — never the live UI.** Expected values come from the design
  (screenshots / Figma / source code). The live app is validated *against* it; any difference is a
  **defect**. The live UI is never trusted as ground truth (it may contain the very defect you seek).
- **The code is the navigation graph.** When app source is provided, routes, `<a href>`s and
  navigation handlers define how screens link into flows — no manual wiring or Figma required.
  Without code, flows come from the UI flow builder (`flow.json`) or Figma prototype links.
- **Human-in-the-loop gates.** The pipeline pauses between stages; you review/edit artifacts (e.g.
  the generated test cases) and click to advance.
- **Role boundaries enforced in code.** Each stage is granted only its own tools and write-paths; a
  stage physically cannot do a later stage's work.
- **Resilient to flaky networks.** Design images are sent only on the first model turn; each turn
  retries in place (~45s tolerance) preserving history; stages are idempotent so a restart verifies
  existing artifacts instead of regenerating.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18+ | `node -v` |
| **VS Code** | 1.95+ | needed to host the extension/bridge |
| **GitHub Copilot** | active subscription | **required** — the model provider (Copilot Chat extension installed and signed in) |
| **Playwright browsers** | — | installed via `npx playwright install` |
| OS | Linux / macOS / Windows | developed on Linux |

---

## Installation (step by step)

```bash
# 1. Get the source
cd /path/to/Testing_automation        # (this repo)

# 2. Install root deps (Playwright test runner, TypeScript, dotenv)
npm install

# 3. Install Playwright browsers
npx playwright install

# 4. Install + build the VS Code extension (contains the bridge)
cd vscode-extension
npm install
npm run build          # bundles dist/extension.js
cd ..

# 5. Create the root .env (selects the active project)
cp .env.example .env   # default TEST_PROJECT=ftc — fine to leave as-is
```

The **web UI needs no install** — it is a zero-dependency static server.

---

## Running it (step by step)

You need **two things running**: the bridge (inside VS Code) and the web UI (a static server).

### 1. Start the bridge (VS Code Extension Host)
1. Open this repo folder in **VS Code**.
2. Make sure **GitHub Copilot** is signed in (bottom-right status, or run *GitHub Copilot: Sign In*).
3. Press **F5** (or Run → *Run Playwright Agent Extension*).
   - A second VS Code window (**Extension Development Host**) opens.
   - On startup the extension auto-starts the bridge on **`127.0.0.1:5051`**.
   - Verify: `curl http://127.0.0.1:5051/health` → `{"ok":true,"model":"…"}`.

### 2. Start the web UI
```bash
node web-ui/server.js          # → http://localhost:5173  (pass a port arg to change)
```
Open **http://localhost:5173**. The sidebar should read **“Bridge live · <model>”**. If it says the
bridge is unreachable, the Extension Host window isn't running (redo step 1).

### 3. (Optional) Run Playwright tests directly
```bash
npm test                       # runs projects' specs headless
npm run test:headed            # headed
npm run test:report            # open the last HTML report
```

> **After changing extension/bridge code** (`vscode-extension/src/*.ts`): rebuild and restart the
> Extension Host — **Shift+F5** then **F5**. Web-UI changes (`web-ui/*`) need only a browser refresh.

---

## Using the platform

1. **Create a project** — Dashboard → *New Project* (name + live `TEST_URL`). Scaffolds
   `projects/<name>/` from `projects/_template/`. (CLI equivalent: `npm run test:new-project -- <name>`.)
2. **New Run** — pick the test types (Functional/E2E, UI, API, Load, Responsible AI) and provide the
   **design source of truth**:
   - **Screenshots** — drop one or more. Multiple images become an ordered **flow** (screen 1 = start
     page; for each later screen, type the action that reaches it, e.g. *click “Learn more”*).
   - **Figma URL** and/or **local path to the app source** (strongest — agents read routes & the
     navigation graph from the code).
   - Optional API docs / dataset uploads for API & Responsible-AI runs.
3. **Watch the pipeline** — each stage streams its activity. Artifacts appear on the right.
4. **Approve gates** — when a stage produces something needing sign-off (e.g. the test cases), a
   panel pops up; review, **edit if needed**, then approve to advance.
5. **Act on the report** — at the end, review the execution report and open issues; give feedback,
   re-run the suite, or run the **Healer** — all from the report screen.

### Try it end-to-end without your own app
Point a run at a public site (e.g. `https://example.com`) with a screenshot of it as the design. To
see a **defect** get caught, edit the screenshot (change a heading/label) — the run will flag the
live-vs-design difference in `docs/issues.csv`.

---

## Project layout

```
Testing_automation/
├─ .github/
│  ├─ copilot-instructions.md      # always-on rules (design-as-truth, role boundaries, resilience)
│  ├─ agents/*.md                  # the 6 agent definitions
│  └─ skills/                      # reusable skill assets (auth, figma, selectors, traceability…)
├─ vscode-extension/               # the VS Code extension = the bridge + agent loop
│  └─ src/{extension,bridgeServer,bridge,tools}.ts
├─ web-ui/                         # standalone frontend (zero deps): index.html, app.js, styles.css, server.js
├─ projects/                       # one folder per application under test
│  ├─ _template/                   # scaffold copied for each new project
│  └─ <project>/{tests,specs,docs,codebase→,.env}
├─ playwright.config.ts            # screenshots on, per-project outputDir, JSON reporter
├─ scripts/new-project.js          # CLI project scaffolder
└─ .vscode/{launch.json,tasks.json}# F5 debug config that launches the extension
```

Each `projects/<project>/` is self-contained: `tests/`, `specs/` (strategy, memory, reports),
`docs/` (test cases, issues, `design/` images, `flow.json`), and `codebase/` (a symlink to the app
source when a local path is provided). Artifacts are never mixed across projects.

---

## Configuration

- **Bridge port** — VS Code setting `playwrightAgent.bridgePort` (default `5051`).
- **Web-UI port** — `node web-ui/server.js <port>` (default `5173`).
- **Active project** — root `.env` `TEST_PROJECT` (the UI sets this per-run; the CLI test runner uses it).
- **Per-project env** — `projects/<project>/.env`: `TEST_URL`, `TEST_AUTH_URL`, `TEST_USER`,
  `TEST_PASS`, `IDENTITY_PROVIDER`, `FIGMA_FILE_URL`.

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Web UI says **“bridge unreachable”** | The Extension Development Host window isn't running. Press **F5** in the main VS Code window. Verify `curl http://127.0.0.1:5051/health`. |
| Bridge health shows **no model** | GitHub Copilot isn't signed in / no entitlement. Sign in to Copilot; the platform has no keys of its own. |
| Repeated **“Error in input stream”** | Transient network. The turn retries in place (~45s) and design images are only sent once, so it should resume — not restart. If persistent, check your connection; large payloads on very unstable links can still fail. |
| A stage **restarted** | It resumes from already-written artifacts (idempotent). Expected on a bad connection; it won't fully redo completed work. |
| Extension/bridge code change **not taking effect** | Rebuild + restart the Extension Host: **Shift+F5** then **F5**. |
| Agent found **no `src/`** | No app source was provided; it falls back to the design/screenshots. Provide a local path in the *Application source code* field for code-driven navigation. |

---

*Built as a Novartis-branded internal QA platform. The design source of truth is always the
intended design — never the live UI.*
