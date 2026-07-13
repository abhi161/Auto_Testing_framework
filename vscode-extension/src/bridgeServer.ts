import * as http from 'http';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { runAgentStageForProject, PIPELINE_STAGES, LogEvent, DesignImage } from './bridge';
import { workspaceRoot } from './tools';

// Loopback-only HTTP+NDJSON bridge so a standalone web UI (any browser, any port) can drive the
// .github/agents pipeline through the Copilot model this VS Code window has access to — without
// the UI living inside VS Code. Binds to 127.0.0.1 only; never reachable from the network.

let _server: http.Server | null = null;
let _cts: vscode.CancellationTokenSource | null = null;

function setCors(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function writeJson(res: http.ServerResponse, status: number, obj: unknown) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function pickModel(): Promise<vscode.LanguageModelChat | null> {
  let models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  if (models.length === 0) models = await vscode.lm.selectChatModels({});
  return models[0] ?? null;
}

function projectsDir(): string {
  return path.join(workspaceRoot(), 'projects');
}

// Deliver the application's source code to the agents. The agent tools are sandboxed to the
// workspace root, so an external checkout is reached by symlinking it in at
// projects/<project>/codebase/. The Context Analyst then scans that path (its existing `src/`
// analysis) to build the routes table + navigation graph — the code IS the flow graph, which is
// how many screens get linked without Figma/manual wiring. No path given → agents fall back to the
// design/UI. In a real deployment where this framework lives inside the app repo, the app's `src/`
// is already in the workspace and no linking is needed.
function ensureCodebaseLink(project: string, codePath: unknown, log: (e: LogEvent) => void): void {
  const target = typeof codePath === 'string' ? codePath.trim() : '';
  if (!target) return; // no code provided this run — leave any existing codebase/ untouched
  const link = path.join(projectsDir(), project, 'codebase');
  try {
    const resolved = path.resolve(target);
    if (!fs.existsSync(resolved)) {
      log({ type: 'text', text: `\n[codebase] path not found: ${target} — falling back to design/UI.\n` });
      return;
    }
    // Refresh: drop any stale link/dir so we always point at the current target.
    try {
      const st = fs.lstatSync(link);
      if (st.isSymbolicLink() || st.isDirectory()) fs.rmSync(link, { recursive: true, force: true });
    } catch {
      /* nothing there yet */
    }
    // On Windows a 'dir' symlink needs Developer Mode or admin; a 'junction' needs neither and works
    // for absolute directory targets (which `resolved` is). Use junction on win32, dir elsewhere.
    fs.symlinkSync(resolved, link, process.platform === 'win32' ? 'junction' : 'dir');
    log({ type: 'text', text: `\n[codebase] linked ${target} → projects/${project}/codebase — app source is available to the agents.\n` });
  } catch (e: any) {
    log({ type: 'text', text: `\n[codebase] could not link source (${e.message}) — falling back to design/UI.\n` });
  }
}

function runsDirFor(project: string): string {
  const dir = path.join(projectsDir(), project, 'specs', 'runs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function lastRunFor(project: string): { status: string; stage: string; finishedAt?: number } | null {
  const dir = path.join(projectsDir(), project, 'specs', 'runs');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) return null;
  const runs = files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.startedAt - a.startedAt);
  if (runs.length === 0) return null;
  const r: any = runs[0];
  return { status: r.status, stage: r.stage, finishedAt: r.finishedAt };
}

function reportSummaryFor(project: string): { passRate: number | null; generatedAt: number | null } {
  const reportPath = path.join(projectsDir(), project, 'specs', 'test-execution-report.md');
  if (!fs.existsSync(reportPath)) return { passRate: null, generatedAt: null };
  const content = fs.readFileSync(reportPath, 'utf-8');
  const m = content.match(/Pass Rate\s*\*{0,2}\s*\|\s*\*{0,2}(\d+(?:\.\d+)?)\s*%/i);
  const generatedAt = fs.statSync(reportPath).mtimeMs;
  return { passRate: m ? Number(m[1]) : null, generatedAt };
}

function listProjects() {
  const dir = projectsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== '_template')
    .map((e) => {
      const runsDir = path.join(dir, e.name, 'specs', 'runs');
      const recentRuns = fs.existsSync(runsDir) ? fs.readdirSync(runsDir).filter((f) => f.endsWith('.json')).length : 0;
      const configured = fs.existsSync(path.join(dir, e.name, '.env'));
      const report = reportSummaryFor(e.name);
      return {
        name: e.name,
        recentRuns,
        configured,
        lastRun: lastRunFor(e.name),
        passRate: report.passRate,
        reportGeneratedAt: report.generatedAt,
      };
    });
}

// Minimal RFC4180-ish CSV parser: handles quoted fields, embedded commas/newlines, "" escapes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function readCsvAsObjects(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) return [];
  const rows = parseCsv(fs.readFileSync(filePath, 'utf-8'));
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  return body
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const RUN_RETENTION = 30; // keep the most recent N stage records; prune older so runs/ can't grow forever

function saveRun(project: string, run: unknown, id: string) {
  const dir = runsDirFor(project);
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(run, null, 2));
  // Retention: prune oldest run records beyond RUN_RETENTION (by filename timestamp, which is the id).
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort(); // run-<ms>.json sorts chronologically
    for (const f of files.slice(0, Math.max(0, files.length - RUN_RETENTION))) {
      fs.unlinkSync(path.join(dir, f));
    }
  } catch {
    /* pruning is best-effort */
  }
}

// Serialize a CSV cell (RFC4180): quote if it contains comma/quote/newline; double internal quotes.
function csvCell(v: string): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// Deterministic issue reconciliation: collapse duplicate defects so the log stays a living register
// rather than an append-only pile. Two rows are the "same defect" if they share Test Case No. +
// Failure Category; we keep the most recent (later rows win) and preserve the header + column order.
function reconcileIssues(project: string): void {
  const file = path.join(projectsDir(), project, 'docs', 'issues.csv');
  if (!fs.existsSync(file)) return;
  const rows = readCsvAsObjects(file);
  if (rows.length === 0) return;
  const header = Object.keys(rows[0]);
  const byKey = new Map<string, Record<string, string>>();
  for (const r of rows) {
    const key = `${(r['Test Case No.'] || '').trim()}|${(r['Failure Category'] || '').trim()}`;
    byKey.set(key, r); // later occurrence overwrites earlier → keeps the freshest
  }
  const deduped = [...byKey.values()];
  if (deduped.length === rows.length) return; // nothing to collapse
  const out = [header.map(csvCell).join(',')].concat(deduped.map((r) => header.map((h) => csvCell(r[h])).join(',')));
  fs.writeFileSync(file, out.join('\n') + '\n');
}

const PROJECT_NAME_RE = /^[a-z][a-z0-9-]{1,30}$/;

function createProject(body: any): { name: string } {
  const name = String(body.name || '').trim().toLowerCase();
  if (!PROJECT_NAME_RE.test(name)) {
    throw new Error('Project name must be lowercase letters, digits, hyphens, starting with a letter (2-31 chars).');
  }

  const dir = projectsDir();
  const templateDir = path.join(dir, '_template');
  const newDir = path.join(dir, name);

  if (fs.existsSync(newDir)) {
    throw new Error(`Project "${name}" already exists.`);
  }
  if (!fs.existsSync(templateDir)) {
    throw new Error('projects/_template is missing — cannot scaffold a new project.');
  }

  fs.cpSync(templateDir, newDir, { recursive: true });

  const envLines = [
    `TEST_URL=${body.testUrl || ''}`,
    `TEST_AUTH_URL=${body.testAuthUrl || ''}`,
    `TEST_USER=${body.testUser || ''}`,
    `TEST_PASS=${body.testPass || ''}`,
    `IDENTITY_PROVIDER=${body.identityProvider || ''}`,
  ];
  if (body.figmaUrl) envLines.push(`FIGMA_FILE_URL=${body.figmaUrl}`);
  fs.writeFileSync(path.join(newDir, '.env'), envLines.join('\n') + '\n');

  return { name };
}

// ---- Test execution evidence (visual verification) ----

// Pull "TC-DEMO-001" style ids out of a test title so results can be joined to the declared
// test cases in docs/actualtestcases.csv.
function extractTcNo(title: string): string | null {
  const m = title.match(/\b([A-Z]{2,}-[A-Z0-9]+-\d+)\b/) || title.match(/\b(TC[-_ ]?\d+)\b/i);
  return m ? m[1] : null;
}

function splitSteps(stepsCell: string): string[] {
  if (!stepsCell) return [];
  // CSV step cells look like "1. Navigate to /login. 2. Fill #username. 3. Click submit."
  return stepsCell
    .split(/\s*\d+\.\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Flatten the Playwright JSON reporter tree into one evidence record per test, joined to its
// declared steps + expected outcome from the test-case CSV.
function readTestResults(project: string) {
  const projDir = path.join(projectsDir(), project);
  const jsonPath = path.join(projDir, 'test-results.json');
  if (!fs.existsSync(jsonPath)) return { exists: false, generatedAt: null, stats: null, tests: [] };

  let report: any;
  try {
    report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch {
    return { exists: false, generatedAt: null, stats: null, tests: [] };
  }

  const csvByTc = new Map<string, Record<string, string>>();
  for (const row of readCsvAsObjects(path.join(projDir, 'docs', 'actualtestcases.csv'))) {
    const tc = (row['Test Case No.'] || '').trim();
    if (tc) csvByTc.set(tc, row);
  }

  const specs: any[] = [];
  const walk = (suite: any, file?: string) => {
    (suite.specs || []).forEach((sp: any) => specs.push({ ...sp, file: sp.file || file || suite.file }));
    (suite.suites || []).forEach((s: any) => walk(s, file || suite.file));
  };
  (report.suites || []).forEach((s: any) => walk(s, s.file));

  const tests = specs.map((sp) => {
    const t = (sp.tests || [])[0] || {};
    const result = (t.results || [])[t.results ? t.results.length - 1 : 0] || {};
    const tcNo = extractTcNo(sp.title);
    const csv = tcNo ? csvByTc.get(tcNo) : undefined;

    const screenshots = (result.attachments || [])
      .filter((a: any) => a.contentType === 'image/png' && a.path)
      .map((a: any) => path.relative(projDir, a.path));
    const trace = (result.attachments || []).find((a: any) => a.name === 'trace' && a.path);

    return {
      tcNo,
      title: sp.title,
      file: sp.file ? path.basename(sp.file) : null,
      line: sp.line,
      status: result.status || (sp.ok ? 'passed' : 'unknown'),
      durationMs: result.duration ?? null,
      error: (result.errors && result.errors[0]?.message) || null,
      screenshots,
      trace: trace ? path.relative(projDir, trace.path) : null,
      steps: csv ? splitSteps(csv['Test Steps'] || '') : [],
      expected: csv ? csv['Expected outcome'] || '' : '',
      testType: csv ? csv['Test Type'] || '' : '',
    };
  });

  const stats = report.stats || {};
  return {
    exists: true,
    generatedAt: fs.statSync(jsonPath).mtimeMs,
    stats: {
      total: tests.length,
      passed: tests.filter((t) => t.status === 'passed').length,
      failed: tests.filter((t) => ['failed', 'timedOut'].includes(t.status)).length,
      skipped: tests.filter((t) => t.status === 'skipped').length,
      durationMs: stats.duration ?? null,
      startTime: stats.startTime ?? null,
    },
    tests,
  };
}

// Serve a file strictly within projects/<project>/ (screenshots, traces, report). The relative
// path is resolved and re-checked so it can never escape the project directory.
function serveArtifact(project: string, relPath: string, res: http.ServerResponse) {
  const projDir = path.join(projectsDir(), project);
  const resolved = path.resolve(projDir, relPath);
  if (resolved !== projDir && !resolved.startsWith(projDir + path.sep)) {
    writeJson(res, 400, { error: 'path escapes project directory' });
    return;
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    writeJson(res, 404, { error: 'artifact not found' });
    return;
  }
  const ext = path.extname(resolved).toLowerCase();
  const mime =
    ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.zip' ? 'application/zip' : ext === '.md' ? 'text/markdown' : 'application/octet-stream';
  setCors(res);
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(resolved).pipe(res);
}

// ---- Design source-of-truth images ----
function designDir(project: string): string {
  const dir = path.join(projectsDir(), project, 'docs', 'design');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function mimeFor(ext: string): string {
  const e = ext.toLowerCase();
  return e === '.jpg' || e === '.jpeg' ? 'image/jpeg' : e === '.webp' ? 'image/webp' : 'image/png';
}

// Save uploaded design images (base64 data URLs) into docs/design/ and return their filenames.
function saveDesignImages(project: string, images: any[]): string[] {
  const dir = designDir(project);
  const saved: string[] = [];
  (images || []).forEach((img, i) => {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(img.dataUrl || '');
    if (!m) return;
    const ext = m[1] === 'image/jpeg' ? '.jpg' : m[1] === 'image/webp' ? '.webp' : '.png';
    const base = (img.name || `design-${i + 1}`).replace(/[^a-z0-9._-]/gi, '_').replace(/\.[^.]+$/, '');
    const file = `${base}${ext}`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(m[2], 'base64'));
    saved.push(file);
  });
  return saved;
}

function listDesignImages(project: string): string[] {
  const dir = path.join(projectsDir(), project, 'docs', 'design');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
}

// Load named design images from docs/design/ as vision parts for the model.
function loadDesignImages(project: string, names: string[]): DesignImage[] {
  const dir = path.join(projectsDir(), project, 'docs', 'design');
  const out: DesignImage[] = [];
  for (const name of names || []) {
    const safe = path.basename(name);
    const p = path.join(dir, safe);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      out.push({ mime: mimeFor(path.extname(safe)), base64: fs.readFileSync(p).toString('base64'), name: safe });
    }
  }
  return out;
}

export function startBridgeServer(port: number): Promise<{ port: number }> {
  return new Promise((resolve, reject) => {
    if (_server) {
      resolve({ port });
      return;
    }

    const server = http.createServer(async (req, res) => {
      if (req.method === 'OPTIONS') {
        setCors(res);
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', 'http://localhost');

      try {
        if (url.pathname === '/health' && req.method === 'GET') {
          const model = await pickModel().catch(() => null);
          writeJson(res, 200, {
            ok: true,
            model: model ? { id: model.id, name: model.name } : null,
            stages: PIPELINE_STAGES.map((s) => ({ id: s.id, label: s.label })),
          });
          return;
        }

        if (url.pathname === '/models' && req.method === 'GET') {
          let models: vscode.LanguageModelChat[] = [];
          try {
            models = await vscode.lm.selectChatModels({});
          } catch {
            models = [];
          }
          writeJson(res, 200, {
            models: models.map((m) => ({ id: m.id, name: m.name, vendor: m.vendor, family: m.family })),
          });
          return;
        }

        if (url.pathname === '/projects' && req.method === 'GET') {
          writeJson(res, 200, { projects: listProjects() });
          return;
        }

        if (url.pathname === '/projects' && req.method === 'POST') {
          const body = await readBody(req);
          try {
            const created = createProject(body);
            writeJson(res, 201, created);
          } catch (err: any) {
            writeJson(res, 400, { error: err.message ?? String(err) });
          }
          return;
        }

        const historyMatch = url.pathname.match(/^\/projects\/([^/]+)\/history$/);
        if (historyMatch && req.method === 'GET') {
          const project = decodeURIComponent(historyMatch[1]);
          const dir = runsDirFor(project);
          const runs = fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.json'))
            .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
            .sort((a, b) => b.startedAt - a.startedAt);
          writeJson(res, 200, { runs });
          return;
        }

        const testcasesMatch = url.pathname.match(/^\/projects\/([^/]+)\/testcases$/);
        if (testcasesMatch && req.method === 'GET') {
          const project = decodeURIComponent(testcasesMatch[1]);
          const file = path.join(projectsDir(), project, 'docs', 'actualtestcases.csv');
          writeJson(res, 200, { testCases: readCsvAsObjects(file), csv: fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '' });
          return;
        }
        // Human-edited test cases from the approval gate → overwrite docs/actualtestcases.csv.
        if (testcasesMatch && req.method === 'POST') {
          const project = decodeURIComponent(testcasesMatch[1]);
          const body = await readBody(req);
          const file = path.join(projectsDir(), project, 'docs', 'actualtestcases.csv');
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, (body.csv || '').replace(/\r\n/g, '\n'), 'utf-8');
          writeJson(res, 200, { ok: true, testCases: readCsvAsObjects(file) });
          return;
        }

        // Project-level integrations (Figma / Confluence / Jira links). Scaffolding for future MCP
        // pulls; for now just persisted to projects/<project>/integrations.json.
        const integMatch = url.pathname.match(/^\/projects\/([^/]+)\/integrations$/);
        if (integMatch) {
          const project = decodeURIComponent(integMatch[1]);
          const file = path.join(projectsDir(), project, 'integrations.json');
          if (req.method === 'GET') {
            writeJson(res, 200, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : {});
            return;
          }
          if (req.method === 'POST') {
            const body = await readBody(req);
            fs.writeFileSync(file, JSON.stringify(body, null, 2));
            writeJson(res, 200, { ok: true });
            return;
          }
        }

        const issuesMatch = url.pathname.match(/^\/projects\/([^/]+)\/issues$/);
        if (issuesMatch && req.method === 'GET') {
          const project = decodeURIComponent(issuesMatch[1]);
          const file = path.join(projectsDir(), project, 'docs', 'issues.csv');
          writeJson(res, 200, { issues: readCsvAsObjects(file) });
          return;
        }

        const reportMatch = url.pathname.match(/^\/projects\/([^/]+)\/report$/);
        if (reportMatch && req.method === 'GET') {
          const project = decodeURIComponent(reportMatch[1]);
          const file = path.join(projectsDir(), project, 'specs', 'test-execution-report.md');
          if (!fs.existsSync(file)) {
            writeJson(res, 200, { exists: false, content: null });
            return;
          }
          writeJson(res, 200, { exists: true, content: fs.readFileSync(file, 'utf-8') });
          return;
        }

        const resultsMatch = url.pathname.match(/^\/projects\/([^/]+)\/results$/);
        if (resultsMatch && req.method === 'GET') {
          const project = decodeURIComponent(resultsMatch[1]);
          writeJson(res, 200, readTestResults(project));
          return;
        }

        const artifactMatch = url.pathname.match(/^\/projects\/([^/]+)\/artifact$/);
        if (artifactMatch && req.method === 'GET') {
          const project = decodeURIComponent(artifactMatch[1]);
          const relPath = url.searchParams.get('path') || '';
          serveArtifact(project, relPath, res);
          return;
        }

        const designMatch = url.pathname.match(/^\/projects\/([^/]+)\/design$/);
        if (designMatch && req.method === 'GET') {
          writeJson(res, 200, { images: listDesignImages(decodeURIComponent(designMatch[1])) });
          return;
        }
        if (designMatch && req.method === 'POST') {
          const project = decodeURIComponent(designMatch[1]);
          const body = await readBody(req);
          const saved = saveDesignImages(project, body.images || []);
          writeJson(res, 201, { images: saved });
          return;
        }

        // Generic text-file upload (API docs / OpenAPI, Responsible-AI datasets, etc.) → docs/.
        const uploadMatch = url.pathname.match(/^\/projects\/([^/]+)\/upload$/);
        if (uploadMatch && req.method === 'POST') {
          const project = decodeURIComponent(uploadMatch[1]);
          const body = await readBody(req);
          const dir = path.join(projectsDir(), project, 'docs');
          fs.mkdirSync(dir, { recursive: true });
          const paths: string[] = [];
          for (const f of body.files || []) {
            const safe = String(f.name || 'upload.txt').replace(/[^a-z0-9._-]/gi, '_');
            fs.writeFileSync(path.join(dir, safe), String(f.content ?? ''), 'utf-8');
            paths.push(`docs/${safe}`);
          }
          writeJson(res, 201, { paths });
          return;
        }

        if (url.pathname === '/chat' && req.method === 'POST') {
          const body = await readBody(req);
          await handleChat(body, res);
          return;
        }

        writeJson(res, 404, { error: `Unknown route ${req.method} ${url.pathname}` });
      } catch (err: any) {
        console.error(`[playwright-agent-bridge] handler error: ${err.message}`);
        try {
          writeJson(res, 500, { error: err.message ?? String(err) });
        } catch {
          /* response already started; nothing more we can do */
        }
      }
    });

    server.on('error', (err) => {
      console.error(`[playwright-agent-bridge] server error: ${err.message}`);
      reject(err);
    });

    // Bind to loopback only — this never gets exposed to the network.
    server.listen(port, '127.0.0.1', () => {
      _server = server;
      console.log(`[playwright-agent-bridge] listening on http://127.0.0.1:${port}`);
      vscode.window.setStatusBarMessage(`$(rocket) Playwright Agent bridge: http://localhost:${port}`, 8000);
      resolve({ port });
    });
  });
}

export function stopBridgeServer(): Promise<void> {
  return new Promise((resolve) => {
    _cts?.cancel();
    if (!_server) {
      resolve();
      return;
    }
    _server.close(() => {
      console.log('[playwright-agent-bridge] stopped');
      _server = null;
      resolve();
    });
  });
}

async function handleChat(body: any, res: http.ServerResponse): Promise<void> {
  const { project, stage, prompt, designImages, codePath } = body;
  if (!project || !prompt) {
    writeJson(res, 400, { error: 'project and prompt are required' });
    return;
  }
  if (!stage) {
    writeJson(res, 400, { error: 'stage is required (one of ' + PIPELINE_STAGES.map((s) => s.id).join(', ') + ')' });
    return;
  }

  setCors(res);
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
  });

  const send = (event: string, data: Record<string, unknown> = {}) => {
    res.write(JSON.stringify({ event, ...data }) + '\n');
  };

  const id = `run-${Date.now()}`;
  const run: any = { id, project, stage, prompt, startedAt: Date.now(), status: 'running', output: '' };

  _cts?.cancel();
  _cts = new vscode.CancellationTokenSource();
  const log = (evt: LogEvent) => {
    run.output += evt.text;
    send('log', evt);
  };

  // The design source of truth: explicit filenames from the request, or every image already in
  // docs/design/ if the caller didn't specify (so it's always in context for UI runs).
  const imageNames = Array.isArray(designImages) && designImages.length ? designImages : listDesignImages(project);
  const images = loadDesignImages(project, imageNames);

  try {
    send('start', { id });
    ensureCodebaseLink(project, codePath, log); // make the app source readable if a local path was given
    run.output = await runAgentStageForProject(project, stage, prompt, log, _cts.token, images);
    run.status = 'done';
    run.finishedAt = Date.now();
    saveRun(project, run, id);
    reconcileIssues(project); // dedup the defect log so repeated runs don't pile up the same issue
    // Send the clean final answer (not the raw tool-call/result noise) back to the client so it
    // can carry it into the NEXT stage's prompt — without this, every stage starts from zero
    // context and re-reads the same files the previous stage already verified.
    send('done', { id, output: run.output });
  } catch (err: any) {
    run.status = 'error';
    run.error = err.message ?? String(err);
    run.finishedAt = Date.now();
    saveRun(project, run, id);
    send('error', { message: run.error });
  } finally {
    res.end();
  }
}
