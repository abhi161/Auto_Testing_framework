// NovoTest.ai standalone frontend — talks only to the loopback bridge the VS Code extension
// starts (default http://localhost:5051). No build step; plain DOM + fetch.

const CARD_COLORS = [
  ['#6366f1', '#4338ca'],
  ['#10b981', '#047857'],
  ['#ec4899', '#a21caf'],
  ['#f59e0b', '#c2410c'],
];

// Each type declares the extra inputs the agents need for it. `needs` keys map to INPUT_DEFS below.
const TEST_TYPES = [
  { id: 'functional', label: 'Functional / E2E', desc: 'Core user flows & business logic', locked: true },
  { id: 'ui', label: 'UI Testing', desc: 'Visual/design parity vs the design source of truth', needs: ['figma'] },
  { id: 'api', label: 'API Integration', desc: 'Endpoints, contracts & integration', needs: ['apiBase', 'apiDocs', 'apiDocsFile'] },
  { id: 'load', label: 'Load Testing', desc: 'Concurrency, throughput & response times', needs: ['loadUsers', 'loadDuration'] },
  { id: 'responsible-ai', label: 'Responsible AI', desc: 'Prompt-injection, jailbreak, adversarial & groundedness', needs: ['aiEndpoint', 'aiChecks', 'aiDataset'] },
];

// Type-specific input fields (rendered only when a type that needs them is selected).
// `upload: true` renders a file picker whose contents get saved to the project's docs/ folder.
const INPUT_DEFS = {
  figma: { label: 'Figma file URL (design source of truth)', placeholder: 'https://www.figma.com/design/…', promptLabel: 'Figma design source' },
  apiBase: { label: 'API base URL', placeholder: 'https://api.your-app.com/v1', promptLabel: 'API base URL' },
  apiDocs: { label: 'API docs / OpenAPI / Confluence link (optional)', placeholder: 'https://…/openapi.json or Confluence page', promptLabel: 'API documentation link' },
  apiDocsFile: { label: '…or upload API docs (OpenAPI / Swagger / .json / .yaml / .md)', upload: true, accept: '.json,.yaml,.yml,.md,.txt', promptLabel: 'API docs file' },
  loadUsers: { label: 'Concurrent users', placeholder: 'e.g. 100', type: 'number', promptLabel: 'Load: concurrent users' },
  loadDuration: { label: 'Duration (seconds)', placeholder: 'e.g. 60', type: 'number', promptLabel: 'Load: duration (s)' },
  aiEndpoint: { label: 'Model / endpoint under test', placeholder: 'e.g. /chat or model id', promptLabel: 'Responsible-AI target' },
  aiChecks: { label: 'Checks to run', placeholder: 'prompt-injection, jailbreak, adversarial, groundedness', promptLabel: 'Responsible-AI checks', value: 'prompt-injection, jailbreak, adversarial, groundedness' },
  aiDataset: { label: 'Upload test dataset (CSV: prompt, expected/ground-truth) the agent validates against', upload: true, accept: '.csv,.json,.jsonl,.txt', promptLabel: 'Responsible-AI dataset' },
};

const state = {
  bridgeUrl: localStorage.getItem('bridgeUrl') || 'http://localhost:5051',
  stages: [],
  projects: [],
  currentProject: null, // name of the project workspace currently open
  activeRun: null, // { project, runName, prompt, stageIndex, stageStatus: {}, lastStagePrompt }
  testCasesCache: [],
};

function bridgeUrl() {
  return state.bridgeUrl.replace(/\/$/, '');
}

function relativeTime(ms) {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function badgeClass(status) {
  return `badge badge-${(status || 'pending').toLowerCase()}`;
}

// ---------- view routing ----------
// showView never triggers a ptab reload itself — callers that already know they need fresh data
// (openProjectWorkspace, the back-from-run handler below) load it explicitly exactly once. Two
// code paths both auto-reloading on every navigation to 'project' was producing duplicate rows
// in Recent Activity (both loads' results landing in the DOM back-to-back).
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== `view-${name}`));
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'dashboard') loadDashboard();
}

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});
document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.back;
    showView(target);
    if (target === 'project' && state.currentProject) {
      // Returning from a run: whatever tab is showing may now be stale (new report/issues/etc).
      const active = document.querySelector('.subtab.active')?.dataset.ptab || 'overview';
      loadPTabData(active);
    }
  });
});

// ---------- bridge health ----------
async function checkBridge() {
  const el = document.getElementById('bridgeStatus');
  try {
    const res = await fetch(`${bridgeUrl()}/health`);
    const data = await res.json();
    state.stages = data.stages || [];
    state.modelName = data.model ? data.model.name : null;
    el.textContent = data.model ? `Bridge live · ${data.model.name}` : 'Bridge live · no model';
    el.className = 'bridge-status ok';
  } catch (e) {
    el.textContent = `bridge unreachable`;
    el.className = 'bridge-status err';
  }
}

// ---------- dashboard ----------
// SVG donut ring for a pass-rate percentage.
function passRing(rate) {
  if (rate == null) {
    return `<div class="pc-ring"><svg width="46" height="46"><circle cx="23" cy="23" r="19" fill="none" stroke="var(--panel-3)" stroke-width="5"/></svg><span class="pc-ring-label" style="color:var(--faint)">—</span></div>`;
  }
  const r = 19, c = 2 * Math.PI * r, off = c * (1 - rate / 100);
  const color = rate >= 90 ? 'var(--success)' : rate >= 60 ? 'var(--warn)' : 'var(--danger)';
  // Render the progress arc EMPTY (offset = full circumference) with the real target in data-target;
  // runAnimations() sets the target after mount so the CSS transition draws the ring.
  return `<div class="pc-ring">
    <svg width="46" height="46">
      <circle cx="23" cy="23" r="${r}" fill="none" stroke="var(--panel-3)" stroke-width="5"/>
      <circle cx="23" cy="23" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" data-target="${off.toFixed(1)}"/>
    </svg>
    <span class="pc-ring-label count" style="color:${color}" data-to="${rate}" data-suffix="%">0%</span>
  </div>`;
}

// ---------- command-center animations ----------
// Count a number up from 0 to its data-to target (preserving any suffix).
function countUp(el) {
  const to = Number(el.dataset.to);
  if (!isFinite(to)) return;
  const suffix = el.dataset.suffix || '';
  const dur = 700, start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(to * eased) + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// After a render: draw rings (set real dashoffset) and count numbers up.
function runAnimations(scope) {
  const root = scope || document;
  root.querySelectorAll('circle[data-target]').forEach((c) => {
    requestAnimationFrame(() => { c.style.strokeDashoffset = c.dataset.target; });
  });
  root.querySelectorAll('.count[data-to]').forEach(countUp);
}

function renderDashStats(projects) {
  const el = document.getElementById('dashStats');
  const totalRuns = projects.reduce((s, p) => s + (p.recentRuns || 0), 0);
  const rated = projects.filter((p) => p.passRate != null);
  const avgPass = rated.length ? Math.round(rated.reduce((s, p) => s + p.passRate, 0) / rated.length) : null;
  const configured = projects.filter((p) => p.configured).length;
  const lastActivityMs = projects.reduce((max, p) => Math.max(max, p.lastRun?.finishedAt || 0), 0);
  // `num`/`suffix` drive the count-up animation; `value` is the fallback for non-numeric tiles.
  const tiles = [
    { label: 'Applications', num: projects.length, sub: `${configured} configured` },
    { label: 'Total Runs', num: totalRuns, sub: 'across all projects' },
    { label: 'Avg Pass Rate', num: avgPass, suffix: '%', value: avgPass != null ? `${avgPass}%` : '—', sub: `${rated.length} with reports`, cls: avgPass != null && avgPass >= 90 ? 'ok' : avgPass != null && avgPass < 70 ? 'warn' : '' },
    { label: 'Last Activity', value: lastActivityMs ? relativeTime(lastActivityMs) : '—', sub: 'most recent agent run' },
  ];
  el.innerHTML = tiles
    .map((t) => {
      const valHtml =
        t.num != null && isFinite(t.num)
          ? `<span class="count" data-to="${t.num}" data-suffix="${t.suffix || ''}">0${t.suffix || ''}</span>`
          : t.value;
      return `<div class="dash-stat ${t.cls || ''}">
        <div class="ds-label">${t.label}</div>
        <div class="ds-value">${valHtml}</div>
        <div class="ds-sub">${t.sub}</div>
      </div>`;
    })
    .join('');
  runAnimations(el);
}

async function loadDashboard() {
  const container = document.getElementById('projectCards');
  container.innerHTML = '<p class="muted">Loading projects…</p>';
  try {
    const res = await fetch(`${bridgeUrl()}/projects`);
    const data = await res.json();
    state.projects = data.projects || [];
    renderDashStats(state.projects);
    container.innerHTML = '';
    state.projects.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'card';
      const lastRun = p.lastRun;
      const dotClass = lastRun ? (lastRun.status === 'done' ? 'done' : lastRun.status === 'error' ? 'error' : 'idle') : 'idle';
      const statusText = lastRun
        ? `<span class="${badgeClass(lastRun.status)}">${lastRun.status}</span> <span class="muted">${relativeTime(lastRun.finishedAt)}</span>`
        : `<span class="muted">Not run yet</span>`;

      const body = document.createElement('div');
      body.className = 'card-body';
      body.innerHTML = `
        <div class="pc-top">
          <div>
            <div class="pc-name"><span class="pc-dot ${dotClass}"></span>${p.name}</div>
          </div>
          ${passRing(p.passRate)}
        </div>
        <div class="pc-sub">${p.configured ? statusText : '<span class="muted">Needs .env setup</span>'}</div>
        <div class="pc-metrics">
          <div class="pc-metric"><span class="m-val">${p.recentRuns}</span><span class="m-lab">Runs</span></div>
          <div class="pc-metric"><span class="m-val">${p.passRate != null ? p.passRate + '%' : '—'}</span><span class="m-lab">Pass rate</span></div>
          <div class="pc-metric"><span class="m-val">${lastRun ? relativeTime(lastRun.finishedAt).replace(' ago', '') : '—'}</span><span class="m-lab">Last run</span></div>
        </div>
        <div class="pc-actions">
          <button class="btn btn-ghost" data-open="${p.name}">Open</button>
          <button class="btn btn-primary" data-newrun="${p.name}">New Run →</button>
        </div>`;
      card.appendChild(body);
      container.appendChild(card);
    });

    const addCard = document.createElement('button');
    addCard.className = 'card new-project-card';
    addCard.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#i-plus"/></svg><span>New project</span>';
    addCard.addEventListener('click', openNewProjectModal);
    container.appendChild(addCard);

    container.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openProjectWorkspace(b.dataset.open)));
    container.querySelectorAll('[data-newrun]').forEach((b) =>
      b.addEventListener('click', () => {
        openProjectWorkspace(b.dataset.newrun);
        switchPTab('newrun');
      })
    );
    // Clicking the card surface (not a button) opens the workspace.
    container.querySelectorAll('.card:not(.new-project-card) .card-body').forEach((body, i) => {
      body.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openProjectWorkspace(state.projects[i].name);
      });
    });
    runAnimations(container); // draw the pass-rate rings + count metrics
  } catch (e) {
    container.innerHTML = `<p class="muted">Could not load projects: ${e.message}. Is the VS Code bridge running?</p>`;
  }
}

// ---------- new project modal ----------
const newProjectBackdrop = document.getElementById('newProjectBackdrop');
const newProjectForm = document.getElementById('newProjectForm');
const newProjectError = document.getElementById('newProjectError');

function openNewProjectModal() {
  newProjectForm.reset();
  newProjectError.hidden = true;
  document.getElementById('authFields').hidden = true;
  newProjectBackdrop.hidden = false;
}
function closeNewProjectModal() {
  newProjectBackdrop.hidden = true;
}
document.getElementById('cancelNewProject').addEventListener('click', closeNewProjectModal);
newProjectBackdrop.addEventListener('click', (e) => {
  if (e.target === newProjectBackdrop) closeNewProjectModal();
});
document.getElementById('authType').addEventListener('change', (e) => {
  document.getElementById('authFields').hidden = e.target.value === 'none';
});

newProjectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  newProjectError.hidden = true;
  const fd = new FormData(newProjectForm);
  const body = Object.fromEntries(fd.entries());
  const submitBtn = newProjectForm.querySelector('button[type=submit]');
  submitBtn.disabled = true;
  try {
    const res = await fetch(`${bridgeUrl()}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not create project');
    closeNewProjectModal();
    loadDashboard();
  } catch (err) {
    newProjectError.textContent = err.message;
    newProjectError.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- project workspace ----------
function openProjectWorkspace(name) {
  const isNewProject = state.currentProject !== name;
  state.currentProject = name;
  document.getElementById('projectTitle').textContent = name;
  const p = state.projects.find((x) => x.name === name);
  document.getElementById('projectSubtitle').textContent = p?.configured ? 'Configured' : 'Needs .env setup';
  document.getElementById('newRunForm').dataset.project = name;
  if (isNewProject) {
    // Fresh project: reset the New Run form's test-type selection. Switching tabs within the
    // SAME project workspace must never wipe an in-progress form.
    selectedTestTypes = new Set(['functional']);
    renderTestTypeChips();
    renderTypeInputs();
  }
  switchPTab('overview');
  showView('project');
}

document.querySelectorAll('.subtab').forEach((btn) => {
  btn.addEventListener('click', () => switchPTab(btn.dataset.ptab));
});
document.querySelectorAll('[data-ptab-jump]').forEach((btn) => {
  btn.addEventListener('click', () => switchPTab(btn.dataset.ptabJump));
});

function switchPTab(name) {
  document.querySelectorAll('.subtab').forEach((b) => b.classList.toggle('active', b.dataset.ptab === name));
  document.querySelectorAll('.ptab-panel').forEach((p) => (p.hidden = p.id !== `ptab-${name}`));
  loadPTabData(name);
}

function loadPTabData(name) {
  const project = state.currentProject;
  if (!project) return;
  if (name === 'overview') loadOverview(project);
  else if (name === 'evidence') loadEvidence(project);
  else if (name === 'reports') loadReport(project);
  else if (name === 'testcases') loadTestCases(project);
  else if (name === 'issues') loadIssues(project);
  else if (name === 'integrations') loadIntegrations(project);
  else if (name === 'history') loadHistory(project, 'historyList');
}

// ---------- overview ----------
async function loadOverview(project) {
  const statsEl = document.getElementById('overviewStats');
  const activityEl = document.getElementById('overviewActivity');
  statsEl.innerHTML = '<p class="muted">Loading…</p>';
  activityEl.innerHTML = '';
  try {
    const [histRes, issuesRes] = await Promise.all([
      fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/history`).then((r) => r.json()),
      fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/issues`).then((r) => r.json()),
    ]);
    const runs = (histRes.runs || []).sort((a, b) => b.startedAt - a.startedAt);
    const openIssues = (issuesRes.issues || []).filter((i) => (i.Status || '').toLowerCase() !== 'closed');
    const projectMeta = state.projects.find((p) => p.name === project);

    statsEl.innerHTML = '';
    const tiles = [
      {
        label: 'Last Stage Run',
        value: runs[0] ? runs[0].status : '—',
        sub: runs[0] ? `${runs[0].stage} · ${relativeTime(runs[0].finishedAt || runs[0].startedAt)}` : 'No runs yet',
        accent: runs[0]?.status === 'done' ? 'success' : runs[0]?.status === 'error' ? 'danger' : '',
      },
      {
        label: 'Pass Rate',
        value: projectMeta?.passRate != null ? `${projectMeta.passRate}%` : '—',
        sub: projectMeta?.reportGeneratedAt
          ? `Report from ${relativeTime(projectMeta.reportGeneratedAt)} — may predate the last stage run above`
          : 'No execution report yet',
        accent: projectMeta?.passRate >= 90 ? 'success' : projectMeta?.passRate != null && projectMeta.passRate < 70 ? 'danger' : '',
      },
      { label: 'Total Runs', value: String(runs.length), sub: 'Agent stage invocations', accent: '' },
      {
        label: 'Open Issues',
        value: String(openIssues.length),
        sub: openIssues.length ? 'Needs attention' : 'Clean',
        accent: openIssues.length ? 'danger' : 'success',
      },
    ];
    tiles.forEach((t) => {
      const div = document.createElement('div');
      div.className = `stat-tile ${t.accent ? `accent-${t.accent}` : ''}`;
      div.innerHTML = `<div class="stat-label">${t.label}</div><div class="stat-value">${t.value}</div><div class="stat-sub">${t.sub}</div>`;
      statsEl.appendChild(div);
    });

    if (runs.length === 0) {
      activityEl.innerHTML = '<p class="muted">No runs yet — start one from the New Run tab.</p>';
    } else {
      runs.slice(0, 6).forEach((r) => {
        const row = document.createElement('div');
        row.className = 'history-row';
        row.innerHTML = `<span>${r.stage} — ${new Date(r.startedAt).toLocaleString()}</span><span class="${badgeClass(r.status)}">${r.status}</span>`;
        activityEl.appendChild(row);
      });
    }
  } catch (e) {
    statsEl.innerHTML = `<p class="muted">Could not load overview: ${e.message}</p>`;
  }
}

// ---------- reports (markdown render) ----------
function inlineFormat(text) {
  const frag = document.createDocumentFragment();
  // Order matters: bold (**) must be tried before italic (*) so "**x**" doesn't get eaten by
  // the single-asterisk pattern first.
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    const token = m[0];
    if (token.startsWith('**')) {
      const strong = document.createElement('strong');
      strong.textContent = token.slice(2, -2);
      frag.appendChild(strong);
    } else if (token.startsWith('`')) {
      const code = document.createElement('code');
      code.textContent = token.slice(1, -1);
      frag.appendChild(code);
    } else {
      const em = document.createElement('em');
      em.textContent = token.slice(1, -1);
      frag.appendChild(em);
    }
    last = re.lastIndex;
  }
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  return frag;
}

function renderMarkdown(md) {
  const root = document.createElement('div');
  root.className = 'md';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Table
    if (line.trim().startsWith('|') && lines[i + 1] && /^\s*\|?[\s:-]+\|/.test(lines[i + 1])) {
      const headerCells = line.split('|').map((c) => c.trim()).filter((_, idx, arr) => !(idx === 0 && arr[0] === '') && !(idx === arr.length - 1 && arr[arr.length - 1] === ''));
      i += 2;
      const bodyRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].split('|').map((c) => c.trim()).filter((_, idx, arr) => !(idx === 0 && arr[0] === '') && !(idx === arr.length - 1 && arr[arr.length - 1] === ''));
        bodyRows.push(cells);
        i++;
      }
      const wrap = document.createElement('div');
      wrap.className = 'md-table-wrap';
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      headerCells.forEach((h) => {
        const th = document.createElement('th');
        th.appendChild(inlineFormat(h));
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      bodyRows.forEach((cells) => {
        const tr = document.createElement('tr');
        cells.forEach((c) => {
          const td = document.createElement('td');
          td.appendChild(inlineFormat(c));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      root.appendChild(wrap);
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const h = document.createElement(`h${Math.min(headingMatch[1].length, 3)}`);
      h.appendChild(inlineFormat(headingMatch[2]));
      root.appendChild(h);
      i++;
      continue;
    }

    // HR
    if (/^-{3,}$/.test(line.trim())) {
      root.appendChild(document.createElement('hr'));
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const bq = document.createElement('blockquote');
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      bq.appendChild(inlineFormat(buf.join(' ')));
      root.appendChild(bq);
      continue;
    }

    // List
    if (/^[-*]\s+/.test(line.trim())) {
      const ul = document.createElement('ul');
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const li = document.createElement('li');
        li.appendChild(inlineFormat(lines[i].trim().replace(/^[-*]\s+/, '')));
        ul.appendChild(li);
        i++;
      }
      root.appendChild(ul);
      continue;
    }

    // Paragraph
    const buf = [];
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('|') && !/^#{1,6}\s/.test(lines[i]) && !/^[-*]\s+/.test(lines[i].trim()) && !lines[i].trim().startsWith('>')) {
      buf.push(lines[i].trim());
      i++;
    }
    const p = document.createElement('p');
    p.appendChild(inlineFormat(buf.join(' ')));
    root.appendChild(p);
  }

  return root;
}

async function loadReport(project) {
  const el = document.getElementById('reportContent');
  el.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const res = await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/report`);
    const data = await res.json();
    if (!data.exists) {
      el.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><use href="#i-doc"/></svg>
          <p>No execution report yet.</p>
          <p class="muted">Run the pipeline through Test Executor &amp; Analyser to generate <code>test-execution-report.md</code>.</p>
        </div>`;
      return;
    }
    el.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'report-card';
    card.appendChild(renderMarkdown(data.content));
    el.appendChild(card);
  } catch (e) {
    el.innerHTML = `<p class="muted">Could not load report: ${e.message}</p>`;
  }
}

// ---------- evidence (visual verification) ----------
function artifactUrl(project, relPath) {
  return `${bridgeUrl()}/projects/${encodeURIComponent(project)}/artifact?path=${encodeURIComponent(relPath)}`;
}

function openLightbox(src, caption) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxCaption').textContent = caption || '';
  document.getElementById('lightbox').hidden = false;
}
function closeLightbox() {
  document.getElementById('lightbox').hidden = true;
  document.getElementById('lightboxImg').src = '';
}
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox') closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('lightbox').hidden) closeLightbox();
});

async function loadEvidence(project) {
  const el = document.getElementById('evidenceContent');
  el.innerHTML = '<p class="muted">Loading test evidence…</p>';
  try {
    const res = await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/results`);
    const data = await res.json();
    if (!data.exists || !data.tests.length) {
      el.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><use href="#i-camera"/></svg>
          <p>No test evidence yet.</p>
          <p class="muted">Run the pipeline through <strong>Test Executor &amp; Analyser</strong> — every test captures a screenshot so you can see exactly what was verified.</p>
        </div>`;
      return;
    }
    el.innerHTML = '';
    el.appendChild(renderEvidenceSummary(data));
    el.appendChild(renderActOnReport(project, data));
    data.tests.forEach((t) => el.appendChild(renderEvidenceCard(project, t)));
    runAnimations(el);
  } catch (e) {
    el.innerHTML = `<p class="muted">Could not load evidence: ${e.message}</p>`;
  }
}

// After a run, let the human ACT on what they see: run the Healer, re-run the tests, or give
// feedback that re-invokes a stage. Turns the report from a dead end into a continuation point.
function renderActOnReport(project, data) {
  const failed = (data.stats && data.stats.failed) || 0;
  const bar = document.createElement('div');
  bar.className = 'act-report';
  bar.innerHTML = `<div class="ar-head">Act on these results${failed ? ` — ${failed} failing` : ''}</div><div class="ar-btns"></div><div class="ar-fb" hidden><textarea placeholder="Tell the agent what to do based on this report — e.g. 'TC-004 is a real defect, not a test bug' or 'add a test for the footer'"></textarea></div>`;
  const btns = bar.querySelector('.ar-btns');
  const fb = bar.querySelector('.ar-fb');

  const mk = (label, variant, fn) => {
    const b = makeActionButton(label, variant, fn);
    btns.appendChild(b);
    return b;
  };

  mk('🩹 Run Test Healer', failed ? 'primary' : 'ghost', () =>
    continueRun(project, 'test-healer', 'Read specs/test-analysis.md and docs/issues.csv. For each failing test decide if the Generator wrote a bad test (fix it) or it is a real defect (log/keep it). Fix test-side issues, then re-run and hand back.')
  );
  mk('↻ Re-run tests', 'ghost', () =>
    continueRun(project, 'test-executor-analyst', 'Re-run the full suite and update the execution report and evidence. Re-classify any failures.')
  );
  const fbBtn = mk('✎ Give feedback', 'ghost', () => {
    if (fb.hidden) { fb.hidden = false; fb.querySelector('textarea').focus(); fbBtn.textContent = '→ Send to Healer'; fbBtn.classList.add('primary'); return; }
    const text = fb.querySelector('textarea').value.trim();
    if (!text) { fb.querySelector('textarea').focus(); return; }
    continueRun(project, 'test-healer', `Human feedback on the last run — act on it:\n${text}\n\nThen re-run and hand back.`);
  });

  return bar;
}

// Start a run at a SPECIFIC stage (not the full pipeline) — used to continue after a finished run.
async function continueRun(project, stageId, prompt) {
  let designImages = [];
  try {
    const r = await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/design`);
    designImages = (await r.json()).images || [];
  } catch (e) {
    /* none */
  }
  const idx = Math.max(0, state.stages.findIndex((s) => s.id === stageId));
  const stageStatus = {};
  state.stages.forEach((s, i) => { if (i < idx) stageStatus[s.id] = 'done'; }); // prior stages shown complete
  state.activeRun = { project, runName: 'continue', prompt, designImages, stageIndex: idx, stageStatus, stageOutputs: {}, lastStagePrompt: null, artifacts: [] };
  document.getElementById('runTitle').textContent = `Continue: ${project}`;
  document.getElementById('runSubtitle').textContent = `PROJECT: ${project.toUpperCase()}`;
  renderPipeline();
  renderRunDesign(state.activeRun);
  document.getElementById('chatTranscript').innerHTML = '';
  renderArtifacts();
  showView('run');
  runCurrentStage(prompt);
}

function renderEvidenceSummary(data) {
  const s = data.stats;
  const rate = s.total ? Math.round((s.passed / s.total) * 100) : 0;
  const color = rate >= 90 ? 'var(--success)' : rate >= 60 ? 'var(--warn)' : 'var(--danger)';
  const R = 26, C = 2 * Math.PI * R, off = C * (1 - rate / 100);
  const wrap = document.createElement('div');
  wrap.className = 'evidence-summary';
  wrap.innerHTML = `
    <div class="es-ring">
      <div class="es-donut-wrap">
        <svg class="es-donut-ring" width="62" height="62" viewBox="0 0 62 62">
          <circle cx="31" cy="31" r="${R}" fill="none" stroke="var(--panel-3)" stroke-width="5"/>
          <circle cx="31" cy="31" r="${R}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
            transform="rotate(-90 31 31)" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-target="${off.toFixed(1)}"/>
        </svg>
        <span class="es-donut-num count" style="color:${color}" data-to="${rate}" data-suffix="%">0%</span>
      </div>
      <div class="es-metric"><span class="n count" data-to="${s.total}">0</span><span class="l">Tests</span></div>
    </div>
    <div class="es-metrics">
      <div class="es-metric pass"><span class="n count" data-to="${s.passed}">0</span><span class="l">Passed</span></div>
      <div class="es-metric fail"><span class="n count" data-to="${s.failed}">0</span><span class="l">Failed</span></div>
      <div class="es-metric"><span class="n count" data-to="${s.skipped}">0</span><span class="l">Skipped</span></div>
      <div class="es-metric"><span class="n">${s.durationMs ? (s.durationMs / 1000).toFixed(0) + 's' : '—'}</span><span class="l">Duration</span></div>
    </div>
    <div class="es-when"><span class="live-dot"></span>Captured ${data.generatedAt ? relativeTime(data.generatedAt) : '—'}</div>`;
  return wrap;
}

function renderEvidenceCard(project, t) {
  const card = document.createElement('div');
  card.className = `ev-card ${t.status}`;

  const stripe = document.createElement('div');
  stripe.className = 'ev-stripe';
  card.appendChild(stripe);

  const body = document.createElement('div');
  body.className = 'ev-body';

  // Header: TC badge + title + status + duration
  const head = document.createElement('div');
  head.className = 'ev-head';
  if (t.tcNo) {
    const tc = document.createElement('span');
    tc.className = 'ev-tc';
    tc.textContent = t.tcNo;
    head.appendChild(tc);
  }
  const title = document.createElement('span');
  title.className = 'ev-title';
  title.textContent = t.title.replace(/^[A-Z0-9-]+:\s*/, '');
  head.appendChild(title);
  const badge = document.createElement('span');
  const statusLabel = t.status === 'timedOut' ? 'timed out' : t.status;
  badge.className = badgeClass(t.status === 'timedOut' ? 'fail' : t.status === 'passed' ? 'pass' : t.status === 'failed' ? 'fail' : t.status);
  badge.textContent = statusLabel;
  head.appendChild(badge);
  if (t.durationMs != null) {
    const dur = document.createElement('span');
    dur.className = 'ev-dur';
    dur.textContent = `${(t.durationMs / 1000).toFixed(1)}s`;
    head.appendChild(dur);
  }
  body.appendChild(head);

  // Two-column grid: steps/expected (left) + screenshots (right)
  const grid = document.createElement('div');
  grid.className = 'ev-grid';

  const left = document.createElement('div');
  if (t.steps && t.steps.length) {
    const ul = document.createElement('ul');
    ul.className = 'ev-steps';
    t.steps.forEach((s) => {
      const li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    });
    left.appendChild(ul);
  } else {
    const none = document.createElement('p');
    none.className = 'muted';
    none.style.fontSize = '12px';
    none.textContent = 'No declared steps for this test case.';
    left.appendChild(none);
  }
  if (t.expected) {
    const exp = document.createElement('div');
    exp.className = 'ev-expected';
    exp.innerHTML = '<strong>Expected:</strong> ';
    exp.appendChild(document.createTextNode(t.expected));
    left.appendChild(exp);
  }
  grid.appendChild(left);

  const right = document.createElement('div');
  const shotLabel = document.createElement('div');
  shotLabel.className = 'ev-shot-label';
  shotLabel.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-camera"/></svg>Captured evidence';
  right.appendChild(shotLabel);

  if (t.screenshots && t.screenshots.length) {
    const shots = document.createElement('div');
    shots.className = 'ev-shots';
    t.screenshots.forEach((relPath) => {
      const src = artifactUrl(project, relPath);
      const shot = document.createElement('div');
      shot.className = 'ev-shot';
      shot.innerHTML = `<img loading="lazy" src="${src}" alt="${t.tcNo || t.title}" /><span class="zoom-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#i-zoom"/></svg>Enlarge</span>`;
      const cleanTitle = t.title.replace(/^[A-Z0-9-]+:\s*/, '');
      shot.addEventListener('click', () => openLightbox(src, `${t.tcNo ? t.tcNo + ' — ' : ''}${cleanTitle}`));
      shots.appendChild(shot);
    });
    right.appendChild(shots);
  } else {
    const noshot = document.createElement('div');
    noshot.className = 'ev-noshot';
    noshot.textContent = 'No screenshot captured for this test.';
    right.appendChild(noshot);
  }
  grid.appendChild(right);
  body.appendChild(grid);

  // Failure detail
  if (t.error) {
    const err = document.createElement('div');
    err.className = 'ev-error';
    err.textContent = stripAnsi(t.error).slice(0, 1200);
    body.appendChild(err);
  }
  if (t.trace) {
    const tr = document.createElement('div');
    tr.className = 'ev-trace';
    tr.innerHTML = `<a href="${artifactUrl(project, t.trace)}" download><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#i-download"/></svg>Download full Playwright trace (.zip)</a>`;
    body.appendChild(tr);
  }

  card.appendChild(body);
  return card;
}

function stripAnsi(s) {
  return String(s).replace(/\[[0-9;]*m/g, '');
}

// ---------- test cases ----------
async function loadTestCases(project) {
  const el = document.getElementById('testCasesTable');
  el.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const res = await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/testcases`);
    const data = await res.json();
    state.testCasesCache = data.testCases || [];
    renderTestCasesTable(state.testCasesCache);
  } catch (e) {
    el.innerHTML = `<p class="muted">Could not load test cases: ${e.message}</p>`;
  }
}

function renderTestCasesTable(rows) {
  const el = document.getElementById('testCasesTable');
  if (rows.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><use href="#i-list"/></svg>
        <p>No test cases yet.</p>
        <p class="muted">These appear once the Test Planner writes <code>docs/actualtestcases.csv</code>.</p>
      </div>`;
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'data-table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = '<thead><tr><th>Test Case No.</th><th>Summary</th><th>Type</th><th>Expected outcome</th></tr></thead>';
  const tbody = document.createElement('tbody');
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    const tcNo = document.createElement('td');
    tcNo.textContent = r['Test Case No.'] || '';
    const summary = document.createElement('td');
    summary.textContent = r['Test Case/Summary'] || '';
    const type = document.createElement('td');
    const typeBadge = document.createElement('span');
    typeBadge.className = 'badge badge-pending';
    typeBadge.textContent = r['Test Type'] || '—';
    type.appendChild(typeBadge);
    const expected = document.createElement('td');
    expected.className = 'cell-truncate';
    expected.title = r['Expected outcome'] || '';
    expected.textContent = r['Expected outcome'] || '';
    tr.append(tcNo, summary, type, expected);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  el.innerHTML = '';
  el.appendChild(wrap);
}

document.getElementById('testCaseSearch').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const filtered = !q
    ? state.testCasesCache
    : state.testCasesCache.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
  renderTestCasesTable(filtered);
});

// ---------- issues ----------
// ---------- integrations ----------
const INTEGRATIONS = [
  { key: 'figma', name: 'Figma', desc: 'Design source of truth', color: '#a259ff', abbr: 'Fi', placeholder: 'https://www.figma.com/design/…' },
  { key: 'confluence', name: 'Confluence', desc: 'API docs & specs', color: '#1868db', abbr: 'Cf', placeholder: 'https://…confluence…/page', soon: true },
  { key: 'jira', name: 'Jira', desc: 'Tickets → test scope', color: '#0052cc', abbr: 'Ji', placeholder: 'https://…atlassian.net/browse/PROJ', soon: true },
  { key: 'apiDocs', name: 'API Docs / OpenAPI', desc: 'Endpoint contracts', color: '#16a34a', abbr: 'Api', placeholder: 'https://…/openapi.json' },
];

async function loadIntegrations(project) {
  const grid = document.getElementById('integGrid');
  const status = document.getElementById('integStatus');
  status.textContent = '';
  let saved = {};
  try {
    saved = await (await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/integrations`)).json();
  } catch (e) {
    /* none */
  }
  grid.innerHTML = INTEGRATIONS.map(
    (it) => `<div class="integ-card">
      <div class="ic-head">
        <div class="ic-icon" style="background:${it.color}">${it.abbr}</div>
        <div><div class="ic-name">${it.name}</div><div class="ic-desc">${it.desc}</div></div>
      </div>
      <input type="text" data-key="${it.key}" placeholder="${it.placeholder}" value="${(saved[it.key] || '').replace(/"/g, '&quot;')}" />
      ${it.soon ? '<span class="ic-soon">Live pull coming via MCP</span>' : ''}
    </div>`
  ).join('');

  document.getElementById('integSave').onclick = async () => {
    const payload = {};
    grid.querySelectorAll('input[data-key]').forEach((i) => { if (i.value.trim()) payload[i.dataset.key] = i.value.trim(); });
    status.textContent = 'Saving…';
    try {
      await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      status.textContent = 'Saved ✓';
    } catch (e) {
      status.textContent = 'Save failed: ' + e.message;
    }
  };
}

async function loadIssues(project) {
  const el = document.getElementById('issuesTable');
  el.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const res = await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/issues`);
    const data = await res.json();
    const rows = data.issues || [];
    if (rows.length === 0) {
      el.innerHTML = `
        <div class="empty-state success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><use href="#i-check"/></svg>
          <p>No application defects logged.</p>
          <p class="muted">The issues register stays empty until the Executor/Healer confirm a real app or design defect.</p>
        </div>`;
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'data-table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = '<thead><tr><th>Issue ID</th><th>Test Case</th><th>Category</th><th>Severity</th><th>Summary</th><th>Status</th></tr></thead>';
    const tbody = document.createElement('tbody');
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      const cells = [r['Issue ID'], r['Test Case No.'], r['Failure Category']];
      cells.forEach((v) => {
        const td = document.createElement('td');
        td.textContent = v || '';
        tr.appendChild(td);
      });
      const sev = document.createElement('td');
      const sevBadge = document.createElement('span');
      sevBadge.className = badgeClass(r['Severity']);
      sevBadge.textContent = r['Severity'] || '—';
      sev.appendChild(sevBadge);
      tr.appendChild(sev);
      const summary = document.createElement('td');
      summary.className = 'cell-truncate';
      summary.title = r['Summary'] || '';
      summary.textContent = r['Summary'] || '';
      tr.appendChild(summary);
      const status = document.createElement('td');
      const statusBadge = document.createElement('span');
      statusBadge.className = badgeClass(r['Status']);
      statusBadge.textContent = r['Status'] || '—';
      status.appendChild(statusBadge);
      tr.appendChild(status);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    el.innerHTML = '';
    el.appendChild(wrap);
  } catch (e) {
    el.innerHTML = `<p class="muted">Could not load issues: ${e.message}</p>`;
  }
}

// ---------- new run ----------
let uploadedText = '';
let designImages = []; // { name, dataUrl }
let selectedTestTypes = new Set(['functional']);

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Flow builder: each design image is a SCREEN. Screen 1 is the start page; each later screen has a
// "reached by" action (click a link, submit a form) so the agent knows how to navigate to it.
function renderDesignPreviews() {
  const el = document.getElementById('designPreviews');
  el.innerHTML = '';
  if (!designImages.length) return;
  const multi = designImages.length > 1;
  if (multi) {
    const hint = document.createElement('div');
    hint.className = 'flow-hint';
    hint.innerHTML = 'This is a <b>user journey</b>, top to bottom. Screen&nbsp;1 is the start page (opens the URL). For every step below, write the <b>action</b> that moves to the next screen — the next screenshot is what should appear after it.';
    el.appendChild(hint);
  }
  const esc = (s) => (s || '').replace(/"/g, '&quot;');
  designImages.forEach((img, i) => {
    // Connector BETWEEN screen i-1 and screen i: the action that navigates from the previous
    // screen to this one. Rendering it between the cards makes the flow direction literal.
    if (i > 0) {
      const conn = document.createElement('div');
      conn.className = 'flow-connector';
      conn.innerHTML = `
        <span class="fc-arrow">↓</span>
        <span class="fc-label">then do:</span>
        <input class="fc-action" placeholder="e.g. click the “Learn more” link · fill email + click Sign in" value="${esc(img.reachedBy)}" />
        <span class="fc-arrow">↓</span>`;
      const act = conn.querySelector('.fc-action');
      act.addEventListener('input', (e) => (img.reachedBy = e.target.value));
      el.appendChild(conn);
    }
    const card = document.createElement('div');
    card.className = 'screen-card';
    const isFirst = i === 0;
    const isLast = i === designImages.length - 1;
    card.innerHTML = `
      <div class="sc-top">
        <span class="sc-num">${i + 1}</span>
        <img class="sc-thumb" src="${img.dataUrl}" alt="${img.name}" />
        <div class="sc-meta">
          <input class="sc-name" placeholder="Screen name (e.g. Home)" value="${esc(img.screenName)}" />
          <span class="sc-role">${isFirst ? 'Start page — opens the app URL' : 'Reached by the action above'}</span>
        </div>
        <div class="sc-actions">
          ${multi ? `<button class="sc-mv" data-mv="up" title="Move up" ${isFirst ? 'disabled' : ''}>▲</button>
          <button class="sc-mv" data-mv="down" title="Move down" ${isLast ? 'disabled' : ''}>▼</button>` : ''}
          <button class="rm" title="Remove">✕</button>
        </div>
      </div>`;
    card.querySelector('.sc-thumb').addEventListener('click', () => openLightbox(img.dataUrl, img.screenName || img.name));
    card.querySelector('.sc-name').addEventListener('input', (e) => (img.screenName = e.target.value));
    card.querySelector('.rm').addEventListener('click', () => {
      designImages.splice(i, 1);
      renderDesignPreviews();
    });
    card.querySelectorAll('.sc-mv').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.mv === 'up' ? -1 : 1;
        const j = i + dir;
        if (j < 0 || j >= designImages.length) return;
        [designImages[i], designImages[j]] = [designImages[j], designImages[i]];
        renderDesignPreviews();
      });
    });
    el.appendChild(card);
  });
}

function renderTestTypeChips() {
  const el = document.getElementById('testTypeChips');
  el.innerHTML = '';
  TEST_TYPES.forEach((t) => {
    const label = document.createElement('label');
    label.className = `chip ${selectedTestTypes.has(t.id) ? 'selected' : ''} ${t.locked ? 'locked' : ''}`;
    label.title = t.desc;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = t.id;
    input.checked = selectedTestTypes.has(t.id);
    if (t.locked) input.disabled = true;
    const text = document.createElement('span');
    text.textContent = t.locked ? `${t.label} (always on)` : t.label;
    label.appendChild(input);
    label.appendChild(text);
    if (!t.locked) {
      label.addEventListener('click', (e) => {
        e.preventDefault();
        if (selectedTestTypes.has(t.id)) selectedTestTypes.delete(t.id);
        else selectedTestTypes.add(t.id);
        renderTestTypeChips();
        renderTypeInputs();
      });
    }
    el.appendChild(label);
  });
}

// Uploaded type files (API docs, RAI dataset): key -> { name, content }.
let typeUploads = {};

// Show the extra inputs each selected test type needs (Figma for UI, API base/docs for API, etc.),
// preserving any values the user already typed.
function renderTypeInputs() {
  const el = document.getElementById('typeInputs');
  if (!el) return;
  const prev = {};
  el.querySelectorAll('input[data-key]:not([type=file])').forEach((i) => (prev[i.dataset.key] = i.value));
  const keys = [];
  TEST_TYPES.forEach((t) => {
    if (selectedTestTypes.has(t.id)) (t.needs || []).forEach((k) => keys.includes(k) || keys.push(k));
  });
  el.hidden = keys.length === 0;
  el.innerHTML = keys
    .map((k) => {
      const d = INPUT_DEFS[k];
      if (d.upload) {
        const have = typeUploads[k] ? `<span class="ti-file">📎 ${typeUploads[k].name}</span>` : '';
        return `<label class="type-input">${d.label}<input type="file" data-key="${k}" accept="${d.accept || ''}" />${have}</label>`;
      }
      const val = prev[k] != null ? prev[k] : d.value || '';
      return `<label class="type-input">${d.label}<input type="${d.type || 'text'}" data-key="${k}" placeholder="${d.placeholder || ''}" value="${String(val).replace(/"/g, '&quot;')}" /></label>`;
    })
    .join('');
  // File inputs: read content into typeUploads on change.
  el.querySelectorAll('input[type=file][data-key]').forEach((inp) => {
    inp.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      typeUploads[inp.dataset.key] = { name: f.name, content: await f.text() };
      renderTypeInputs();
    });
  });
}

renderTestTypeChips();
renderTypeInputs();

document.getElementById('designUpload').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    if (!file.type.startsWith('image/')) continue;
    // Each image becomes a SCREEN in the flow. First screen = the start page; the rest need a
    // navigation action so the agent knows how to reach them.
    const isFirst = designImages.length === 0;
    designImages.push({
      name: file.name,
      dataUrl: await fileToDataUrl(file),
      screenName: isFirst ? 'Home' : `Screen ${designImages.length + 1}`,
      reachedBy: isFirst ? '' : '',
    });
  }
  renderDesignPreviews();
  e.target.value = '';
});

document.getElementById('docUpload').addEventListener('change', async (e) => {
  const list = document.getElementById('uploadedFiles');
  list.innerHTML = '';
  uploadedText = '';
  for (const file of e.target.files) {
    const li = document.createElement('li');
    li.innerHTML = `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-doc"/></svg>`;
    li.appendChild(document.createTextNode(file.name));
    list.appendChild(li);
    if (/\.(txt|md|csv|json)$/i.test(file.name)) {
      uploadedText += `\n\n--- ${file.name} ---\n${await file.text()}`;
    } else {
      uploadedText += `\n\n--- ${file.name} ---\n[binary/unsupported for inline parsing — reference by filename; ask the Context Analyst to read it from docs/ if you copy it there]`;
    }
  }
});

document.getElementById('resetRunForm').addEventListener('click', () => {
  const form = document.getElementById('newRunForm');
  const project = form.dataset.project;
  form.reset();
  form.dataset.project = project;
  document.getElementById('uploadedFiles').innerHTML = '';
  document.getElementById('designPreviews').innerHTML = '';
  uploadedText = '';
  designImages = [];
  typeUploads = {};
  selectedTestTypes = new Set(['functional']);
  renderTestTypeChips();
  renderTypeInputs();
});

document.getElementById('newRunForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const project = form.dataset.project;
  const fd = new FormData(form);
  const runName = fd.get('runName');
  const appUrl = fd.get('appUrl');
  const codePath = (fd.get('repo') || '').trim(); // local path to the app source (or a repo URL for reference)
  const userPrompt = fd.get('prompt');
  const submitBtn = form.querySelector('button[type=submit]');
  // Collect the type-specific TEXT inputs (file inputs are handled separately via typeUploads).
  const typeInputs = {};
  document.querySelectorAll('#typeInputs input[data-key]:not([type=file])').forEach((i) => {
    if (i.value.trim()) typeInputs[i.dataset.key] = i.value.trim();
  });

  // Upload the design source-of-truth images to the project first; the bridge then feeds them to
  // the model as vision parts on every stage of this run.
  let savedDesign = [];
  if (designImages.length) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading design…';
    try {
      const r = await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: designImages }),
      });
      const d = await r.json();
      savedDesign = d.images || [];
    } catch (err) {
      // Non-blocking: surface it in the toolbar and continue (don't hang the page on alert()).
      submitBtn.textContent = 'Design upload failed — starting anyway…';
      console.warn('design upload failed:', err.message);
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Start Job Execution →';
  }

  // Upload type files (API docs, RAI dataset) to the project's docs/ so the agent can read them.
  const uploadPathByKey = {};
  const uploadKeys = Object.keys(typeUploads);
  if (uploadKeys.length) {
    try {
      const r = await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: uploadKeys.map((k) => ({ name: typeUploads[k].name, content: typeUploads[k].content })) }),
      });
      const paths = (await r.json()).paths || [];
      uploadKeys.forEach((k, i) => (uploadPathByKey[k] = paths[i]));
    } catch (err) {
      console.warn('type-file upload failed:', err.message);
    }
  }

  const typeLabels = TEST_TYPES.filter((t) => selectedTestTypes.has(t.id)).map((t) => t.label);
  // Type-specific inputs → labelled prompt lines the agents can use.
  const typeInputLines = Object.entries(typeInputs).map(([k, v]) => `${INPUT_DEFS[k]?.promptLabel || k}: ${v}`);
  Object.entries(uploadPathByKey).forEach(([k, p]) => {
    if (p) typeInputLines.push(`${INPUT_DEFS[k]?.promptLabel || k}: uploaded to ${p} — read it with read_file when you need it.`);
  });

  // Build the FLOW block: each uploaded screen (in order) with the action that reaches it. This is
  // how the agent knows two screenshots are sequential pages (page 1 → action → page 2), not
  // design-vs-live. Save it to docs/design/flow.json too, for the record.
  let flowBlock = null;
  if (savedDesign.length) {
    const steps = designImages.map((s, i) => ({
      screen: s.screenName || `Screen ${i + 1}`,
      design: `docs/design/${savedDesign[i]}`,
      reachedBy: i === 0 ? 'Start page — open the application URL' : s.reachedBy || '(no action given — infer from the design/link labels)',
    }));
    try {
      await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [{ name: 'flow.json', content: JSON.stringify({ steps }, null, 2) }] }),
      });
    } catch (err) {
      /* non-fatal */
    }
    flowBlock =
      `User flow (design source of truth — ${steps.length} screen${steps.length === 1 ? '' : 's'}). Each screen has a design image (attached, model can see it); the LIVE app is validated AGAINST each screen's design as you navigate. NONE of these images is the live app.\n` +
      steps.map((s, i) => `  ${i + 1}. Screen "${s.screen}" — reached by: ${s.reachedBy}. Design: ${s.design}`).join('\n') +
      `\nGenerate ONE Playwright flow that opens the start page, validates it against screen 1, then performs each navigation action and validates the resulting page against that screen's design. Deviations are defects. Do not pre-declare deviations before running.`;
  }

  const prompt = [
    `Requested test types: ${typeLabels.join(', ')}`,
    appUrl ? `Application URL to test (validate the live app against the design): ${appUrl}` : null,
    codePath
      ? `Application source code: available at codebase/ (linked from ${codePath}). Analyze it FIRST — routes, components, links and handlers are the navigation graph; the design/screenshots anchor each screen's expected look.`
      : null,
    ...typeInputLines,
    flowBlock,
    `Task: ${userPrompt}`,
    uploadedText ? `Uploaded reference documents:${uploadedText}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  startRun(project, runName, prompt, savedDesign, codePath);
});

// ---------- run view ----------
function startRun(project, runName, prompt, designImageNames = [], codePath = '') {
  state.activeRun = {
    project,
    runName,
    prompt,
    codePath, // local app-source path; re-sent each stage so the bridge keeps codebase/ linked
    designImages: designImageNames, // filenames in docs/design/, sent to every stage as vision
    stageIndex: 0,
    stageStatus: {},
    stageOutputs: {}, // stage id -> its final answer text, carried forward into later stages' prompts
    lastStagePrompt: null,
    artifacts: [], // { path, content, kind } — files the agent writes this run
  };
  document.getElementById('runTitle').textContent = `Run: ${runName}`;
  document.getElementById('runSubtitle').textContent = `PROJECT: ${project.toUpperCase()}`;
  renderPipeline();
  renderRunDesign(state.activeRun);
  document.getElementById('chatTranscript').innerHTML = '';
  renderArtifacts();
  showView('run');
  runCurrentStage(prompt);
}

// Show the design source-of-truth image(s) the agents are testing against, so the human SEES the
// baseline (click to enlarge).
function renderRunDesign(run) {
  const el = document.getElementById('runDesign');
  const imgs = run.designImages || [];
  if (!imgs.length) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const thumbs = imgs
    .map((name) => {
      const src = artifactUrl(run.project, `docs/design/${name}`);
      return `<div class="rd-thumb" data-src="${src}" data-name="${name}"><img loading="lazy" src="${src}" alt="${name}"/></div>`;
    })
    .join('');
  el.innerHTML = `<div class="rd-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-image"/></svg>Design source of truth</div><div class="rd-thumbs">${thumbs}</div>`;
  el.querySelectorAll('.rd-thumb').forEach((t) => t.addEventListener('click', () => openLightbox(t.dataset.src, `Design source: ${t.dataset.name}`)));
}

const STAGE_ICON = {
  pending: '<use href="#i-dot"/>',
  running: '<use href="#i-dot"/>',
  done: '<use href="#i-check"/>',
  error: '<use href="#i-x"/>',
};

// Horizontal pipeline stepper with connectors + traveling pulse on the active edge.
function renderPipeline() {
  const el = document.getElementById('pipeline');
  const run = state.activeRun;
  el.innerHTML = '';
  state.stages.forEach((s, i) => {
    const status = run.stageStatus[s.id] || (i === run.stageIndex ? 'running' : 'pending');
    const isActive = i === run.stageIndex;
    const step = document.createElement('div');
    step.className = `step ${status} ${isActive ? 'active' : ''}`;
    step.innerHTML = `<span class="step-node"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">${STAGE_ICON[status]}</svg></span><span class="step-label">${s.label}</span>`;
    el.appendChild(step);
    if (i < state.stages.length - 1) {
      const conn = document.createElement('div');
      const prevDone = run.stageStatus[s.id] === 'done';
      const feedsActive = i + 1 === run.stageIndex;
      conn.className = `step-connector ${prevDone ? 'filled' : ''} ${feedsActive ? 'active' : ''}`;
      el.appendChild(conn);
    }
  });
}

// ---------- artifacts panel (the "second screen") ----------
function artifactKind(path) {
  if (/\.spec\.ts$|\.ts$/.test(path)) return 'spec';
  if (/\.csv$/.test(path)) return 'csv';
  if (/\.md$/.test(path)) return 'md';
  if (/\.json$/.test(path)) return 'json';
  return 'file';
}

function addArtifact(path, content) {
  const run = state.activeRun;
  if (!run) return;
  const name = path.split('/').pop();
  const existing = run.artifacts.find((a) => a.path === path);
  if (existing) {
    existing.content = content; // a later write to the same file updates it
  } else {
    run.artifacts.push({ path, name, content, kind: artifactKind(path) });
  }
  renderArtifacts(path);
}

function renderArtifacts(selectPath) {
  const run = state.activeRun;
  const list = document.getElementById('artifactsList');
  const count = document.getElementById('artCount');
  if (!run) return;
  count.textContent = run.artifacts.length || '';
  list.innerHTML = '';
  run.artifacts.forEach((a) => {
    const item = document.createElement('div');
    item.className = 'art-item' + (a.path === selectPath ? ' active' : '');
    item.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-doc"/></svg><span class="art-name">${a.name}</span><span class="art-kind">${a.kind}</span>`;
    item.addEventListener('click', () => previewArtifact(a.path));
    list.appendChild(item);
  });
  if (selectPath) previewArtifact(selectPath);
}

function previewArtifact(path) {
  const run = state.activeRun;
  const a = run && run.artifacts.find((x) => x.path === path);
  const prev = document.getElementById('artifactsPreview');
  document.querySelectorAll('.art-item').forEach((el) => el.classList.remove('active'));
  const idx = run.artifacts.findIndex((x) => x.path === path);
  const itemEl = document.querySelectorAll('.art-item')[idx];
  itemEl && itemEl.classList.add('active');
  if (!a) return;
  prev.innerHTML = '';
  if (a.kind === 'md') {
    prev.appendChild(renderMarkdown(a.content));
  } else if (a.kind === 'csv') {
    prev.appendChild(renderCsvPreview(a.content));
  } else {
    const pre = document.createElement('pre');
    pre.textContent = a.content;
    prev.appendChild(pre);
  }
}

function renderCsvPreview(text) {
  const wrap = document.createElement('div');
  wrap.className = 'md-table-wrap';
  const rows = text.replace(/\r/g, '').split('\n').filter((r) => r.trim());
  // reuse the existing CSV parser semantics loosely — split on commas outside quotes
  const parse = (line) => {
    const out = []; let f = '', q = false;
    for (let i = 0; i < line.length; i++) { const c = line[i];
      if (q) { if (c === '"') { if (line[i+1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(f); f = ''; } else f += c; }
    out.push(f); return out;
  };
  const table = document.createElement('table');
  rows.forEach((r, i) => {
    const cells = parse(r);
    const tr = document.createElement('tr');
    cells.forEach((c) => { const cell = document.createElement(i === 0 ? 'th' : 'td'); cell.textContent = c; tr.appendChild(cell); });
    table.appendChild(tr);
  });
  wrap.appendChild(table);
  return wrap;
}

function addBubble(role, text) {
  const transcript = document.getElementById('chatTranscript');
  const div = document.createElement('div');
  div.className = `bubble ${role}`;
  div.textContent = text;
  transcript.appendChild(div);
  transcript.scrollTop = transcript.scrollHeight;
  return div;
}

function startAgentTurn(stageLabel, timeLabel) {
  const transcript = document.getElementById('chatTranscript');
  const wrap = document.createElement('div');
  wrap.className = 'agent-turn';
  const meta = document.createElement('div');
  meta.className = 'meta';
  const nameSpan = document.createElement('span');
  nameSpan.textContent = stageLabel;
  const timeSpan = document.createElement('span');
  timeSpan.className = 'time';
  timeSpan.textContent = timeLabel;
  meta.appendChild(nameSpan);
  meta.appendChild(timeSpan);
  const segments = document.createElement('div');
  segments.className = 'segments';
  wrap.appendChild(meta);
  wrap.appendChild(segments);
  transcript.appendChild(wrap);
  transcript.scrollTop = transcript.scrollHeight;
  return segments;
}

// Human-readable one-line label for a tool call, so the activity log reads like a story instead
// of a dump of raw JSON tool invocations.
function toolLabel(name, input) {
  const base = (p) => (p ? String(p).split('/').pop() : '');
  switch (name) {
    case 'read_file': return { verb: 'Read', target: input.path || '' };
    case 'write_file': return { verb: 'Wrote', target: input.path || '' };
    case 'list_dir': return { verb: 'Listed', target: (input.path || '.') + '/' };
    case 'run_command': return { verb: 'Ran', target: input.command || '' };
    default: return { verb: name, target: JSON.stringify(input || {}).slice(0, 80) };
  }
}

function appendSegment(segmentsEl, evt) {
  const type = evt.type;
  const last = segmentsEl.lastElementChild;
  if (type === 'text') {
    if (last && last.classList.contains('seg-text')) {
      last.textContent += evt.text;
    } else {
      const p = document.createElement('div');
      p.className = 'seg seg-text';
      p.textContent = evt.text;
      segmentsEl.appendChild(p);
    }
  } else if (type === 'tool_call') {
    // Collapsed, expandable tool step — no more inline wall of file contents.
    const { verb, target } = toolLabel(evt.name, evt.input || {});
    const step = document.createElement('div');
    step.className = 'seg tool-step';
    step.innerHTML = `
      <div class="tool-step-head">
        <span class="tool-step-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#i-tool"/></svg></span>
        <span class="tool-step-verb">${verb}</span>
        <span class="tool-step-target">${target.replace(/</g, '&lt;')}</span>
        <span class="tool-step-caret">›</span>
      </div>
      <div class="tool-step-body">(running…)</div>`;
    step.querySelector('.tool-step-head').addEventListener('click', () => step.classList.toggle('open'));
    segmentsEl.appendChild(step);
    // A write_file is a deliverable → surface it in the Artifacts panel with its full content.
    if (evt.name === 'write_file' && evt.input && evt.input.path) {
      addArtifact(evt.input.path, evt.input.content || '');
      step.querySelector('.tool-step-icon').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#i-doc"/></svg>';
    }
  } else if (type === 'tool_result') {
    // Attach the result to the most recent tool step's (collapsed) body.
    const steps = segmentsEl.querySelectorAll('.tool-step');
    const step = steps[steps.length - 1];
    if (step) {
      const body = step.querySelector('.tool-step-body');
      body.textContent = evt.text || '(no output)';
      if (/^ERROR:/.test(evt.text || '')) step.classList.add('err');
      else step.classList.add('ok');
    }
  }
  document.getElementById('chatTranscript').scrollTop = 1e9;
}

// Text segments stream in as raw tokens (so the "typing" feel is live), which means any markdown
// the model wrote (tables, bold, etc.) shows up as literal pipe/asterisk characters while
// streaming. Once the stage finishes, re-parse each text segment through the same markdown
// renderer the Reports tab uses so the final result reads as real formatting, not raw syntax.
function finalizeSegments(segmentsEl) {
  segmentsEl.querySelectorAll('.seg-text').forEach((el) => {
    const raw = el.textContent;
    const rendered = renderMarkdown(raw);
    el.innerHTML = '';
    el.classList.add('md');
    while (rendered.firstChild) el.appendChild(rendered.firstChild);
  });
}

// Transient failures worth auto-retrying rather than surfacing as a stage failure: client network
// blips (wifi/VPN/sleep-wake) AND transient Copilot model-stream errors ("Error in input stream",
// premature stream end, rate-limit hiccups) which are not our bug and usually succeed on retry.
function isTransientNetworkError(message) {
  return /Failed to fetch|NetworkError|ERR_NETWORK|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION|input stream|stream error|stream ended|premature|response ended|ECONNRESET|rate.?limit|429|temporarily/i.test(
    message || ''
  );
}

const MAX_AUTO_RETRIES = 2;

async function streamStageRequest(run, stage, userPrompt, segmentsEl) {
  const res = await fetch(`${bridgeUrl()}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: run.project,
      stage: stage.id,
      prompt: userPrompt,
      designImages: run.designImages || [],
      codePath: run.codePath || '',
    }),
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'request failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';
  let sawDone = false;
  let output = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = carry.indexOf('\n')) >= 0) {
      const line = carry.slice(0, idx);
      carry = carry.slice(idx + 1);
      if (!line.trim()) continue;
      const evt = JSON.parse(line);
      if (evt.event === 'log') {
        appendSegment(segmentsEl, evt);
      } else if (evt.event === 'error') {
        throw new Error(evt.message);
      } else if (evt.event === 'done') {
        sawDone = true;
        output = evt.output || '';
      }
    }
  }
  if (!sawDone) throw new Error('Connection closed before the stage finished (likely a network blip).');
  return output;
}

async function runCurrentStage(userPrompt) {
  const run = state.activeRun;
  const stage = state.stages[run.stageIndex];
  if (!stage) {
    addBubble('system', 'Pipeline complete. Check the Reports, Test Cases, and Issues tabs in the project workspace.');
    return;
  }
  run.stageStatus[stage.id] = 'running';
  run.lastStagePrompt = userPrompt;
  renderPipeline();

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
    const now = new Date().toLocaleTimeString();
    const timeLabel = attempt === 0 ? now : `${now} · retry ${attempt}/${MAX_AUTO_RETRIES}`;
    const segmentsEl = startAgentTurn(stage.label, timeLabel);
    const turnEl = segmentsEl.closest('.agent-turn');
    turnEl && turnEl.classList.add('streaming'); // pulse the avatar while the stage streams
    try {
      const output = await streamStageRequest(run, stage, userPrompt, segmentsEl);
      turnEl && turnEl.classList.remove('streaming');
      finalizeSegments(segmentsEl);
      run.stageStatus[stage.id] = 'done';
      run.stageOutputs[stage.id] = output;
      lastError = null;
      break;
    } catch (e) {
      turnEl && turnEl.classList.remove('streaming');
      lastError = e;
      if (attempt < MAX_AUTO_RETRIES && isTransientNetworkError(e.message)) {
        addBubble('system warn', `Network hiccup (${e.message}) — retrying stage automatically…`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      break;
    }
  }

  renderPipeline();
  if (lastError) {
    run.stageStatus[stage.id] = 'error';
    renderPipeline();
    addBubble('system fail', `Stage FAILED: ${lastError.message}`);
    renderActionBar(run, stage, true);
  } else {
    addBubble('system', `Stage complete.`);
    renderActionBar(run, stage, false);
  }
}

// ---------- human-in-the-loop action bar ----------
// Every stage completion (success or failure) surfaces explicit clickable decisions instead of
// relying on the human remembering to type "proceed"/"retry" — the free-text input still works
// for follow-up questions, but the gate itself is a real UI control now.
function makeActionButton(label, variant, onClick) {
  const btn = document.createElement('button');
  btn.className = `action-btn ${variant}`;
  btn.textContent = label;
  btn.addEventListener('click', () => {
    btn.closest('.action-bar')?.remove();
    onClick();
  });
  return btn;
}

function renderActionBar(run, stage, failed) {
  const transcript = document.getElementById('chatTranscript');
  const bar = document.createElement('div');
  bar.className = 'action-bar';

  if (failed) {
    bar.appendChild(makeActionButton('↻ Retry stage', 'primary', () => handleCommand('retry')));
    bar.appendChild(makeActionButton('Skip anyway →', 'warn', () => handleCommand('proceed')));
  } else if (stage.id === 'test-executor-analyst') {
    // The executor just ran the tests — visual evidence now exists. Make viewing it the primary,
    // most prominent action so the user immediately SEES what was verified.
    bar.appendChild(
      makeActionButton('📸 View visual evidence →', 'primary', () => {
        openProjectWorkspace(run.project);
        switchPTab('evidence');
      })
    );
    bar.appendChild(makeActionButton('⚠ Issues found — run Test Healer', 'ghost', () => handleCommand('proceed')));
    bar.appendChild(makeActionButton('✓ Finish run', 'ghost', () => handleCommand('finish')));
  } else if (stage.id === 'test-healer') {
    bar.appendChild(makeActionButton('↻ Re-verify with Test Executor & Analyser →', 'primary', () => handleCommand('proceed')));
  } else if (stage.id === 'test-planner') {
    // HUMAN-IN-THE-LOOP GATE: the planner just produced the test cases. The human must review and
    // approve the ACTUAL cases before any tests get generated — this is where a person catches a
    // test case that was fabricated or misread the design.
    renderTestCaseApprovalGate(run);
    return; // gate renders its own controls
  } else {
    const next = state.stages[run.stageIndex + 1];
    bar.appendChild(makeActionButton(next ? `Proceed to ${next.label} →` : 'Proceed →', 'primary', () => handleCommand('proceed')));
  }

  transcript.appendChild(bar);
  transcript.scrollTop = transcript.scrollHeight;
}

// Human approval gate: shows the generated test cases in a reviewable panel with Approve / Request
// Changes. Approve advances to the Generator; Request Changes re-runs the Planner with the feedback.
// Human approval popout: pauses the pipeline and pops a modal showing the artifact (the test cases
// the Planner just wrote). Nothing proceeds until the human approves; "Request changes" re-runs the
// Planner with feedback.
async function renderTestCaseApprovalGate(run) {
  addBubble('system', 'Test cases ready — waiting for your review & approval.');

  let cases = [];
  let csv = '';
  try {
    const r = await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(run.project)}/testcases`);
    const d = await r.json();
    cases = d.testCases || [];
    csv = d.csv || '';
  } catch (e) {
    /* leave empty */
  }

  const renderTable = (rows) =>
    rows.length
      ? `<div class="approval-count">${rows.length} test case${rows.length === 1 ? '' : 's'} proposed — derived from the design source of truth</div>
       <table><thead><tr><th>No.</th><th>Summary</th><th>Type</th><th>Expected outcome</th></tr></thead><tbody>${rows
         .map(
           (c) =>
             `<tr><td class="agc-no">${c['Test Case No.'] || ''}</td><td>${(c['Test Case/Summary'] || '').replace(/</g, '&lt;')}</td><td><span class="badge badge-pending">${c['Test Type'] || '—'}</span></td><td>${(c['Expected outcome'] || '').replace(/</g, '&lt;')}</td></tr>`
         )
         .join('')}</tbody></table>`
      : `<div class="approval-count">No <code>docs/actualtestcases.csv</code> rows found — the Planner may not have written them.</div>`;

  openApprovalModal({
    heading: 'Review test cases before generating tests',
    sub: 'Derived from the design. The pipeline is paused — approve, edit them yourself, or request changes to re-run the Planner.',
    content: renderTable(cases),
    approveLabel: '✓ Approve & generate tests →',
    editable: { csv, project: run.project }, // enables the "Edit" button
    onApprove: () => handleCommand('proceed'),
    onRequestChanges: (feedback) => {
      addBubble('user', feedback);
      runCurrentStage(`${run.lastStagePrompt}\n\n---\nHuman review feedback — revise the test cases accordingly and rewrite docs/actualtestcases.csv:\n${feedback}`);
    },
  });
}

// Generic approval popout used by any gated stage. `editable` (optional) adds an inline CSV editor
// so the human can amend the artifact directly before approving.
function openApprovalModal({ heading, sub, content, approveLabel, onApprove, onRequestChanges, editable }) {
  const backdrop = document.getElementById('approvalBackdrop');
  const contentEl = document.getElementById('approvalContent');
  document.getElementById('approvalHeading').textContent = heading;
  document.getElementById('approvalSub').textContent = sub;
  contentEl.innerHTML = content;
  const fb = document.getElementById('approvalFeedback');
  const fbText = document.getElementById('approvalFeedbackText');
  const actions = document.getElementById('approvalActions');
  fb.hidden = true;
  fbText.value = '';
  actions.innerHTML = '';
  let editing = false;

  const close = () => { backdrop.hidden = true; };

  const requestBtn = makeActionButton('✎ Request changes', 'ghost', () => {
    if (fb.hidden) {
      fb.hidden = false;
      fbText.focus();
      requestBtn.textContent = 'Send feedback & re-run';
      requestBtn.classList.remove('ghost');
      requestBtn.classList.add('warn');
      return;
    }
    const text = fbText.value.trim();
    if (!text) { fbText.focus(); return; }
    close();
    onRequestChanges(text);
  });

  const approveBtn = makeActionButton(approveLabel, 'primary', async () => {
    // If the human edited the CSV, save it before proceeding.
    if (editing) {
      const csv = contentEl.querySelector('.approval-edit')?.value ?? '';
      try {
        await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(editable.project)}/testcases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv }),
        });
        addBubble('system', 'Your edited test cases were saved.');
      } catch (e) {
        addBubble('system fail', 'Could not save edited test cases: ' + e.message);
        return;
      }
    }
    close();
    onApprove();
  });

  actions.appendChild(requestBtn);

  if (editable) {
    const editBtn = makeActionButton('✏ Edit', 'ghost', () => {
      editing = !editing;
      if (editing) {
        contentEl.innerHTML = `<div class="approval-count">Edit the test cases (CSV). Keep the header row. This overwrites docs/actualtestcases.csv on approve.</div><textarea class="approval-edit" spellcheck="false">${(editable.csv || '').replace(/</g, '&lt;')}</textarea>`;
        editBtn.textContent = '↩ Back to view';
        approveBtn.textContent = '✓ Save & generate tests →';
      } else {
        contentEl.innerHTML = content;
        editBtn.textContent = '✏ Edit';
        approveBtn.textContent = approveLabel;
      }
    });
    actions.appendChild(editBtn);
  }

  actions.appendChild(approveBtn);
  backdrop.hidden = false;
}

// Every stage after the first carries forward what the PREVIOUS stage actually found/produced,
// instead of resending the bare original task prompt. Without this, each stage has zero memory
// of what already ran and re-reads .env/copilot-instructions.md/project-memory.md/etc. from
// scratch every single time — which is exactly what made every transcript open with "I'll start
// by reading the necessary configuration files..." regardless of how many stages came before it.
function buildCarryOverPrompt(run, fromStage) {
  let output = run.stageOutputs[fromStage.id];
  if (!output) return run.prompt; // first stage, or the prior stage produced no captured output
  // Cap the carried-forward output so a verbose stage (e.g. a 20KB strategy dump) doesn't balloon
  // the next stage's request into an "Error in input stream". The next agent re-reads the actual
  // artifacts from disk anyway; this is just a summary hand-off.
  const CARRY_CAP = 4000;
  if (output.length > CARRY_CAP) output = '…[earlier detail truncated]\n' + output.slice(-CARRY_CAP);
  return `${run.prompt}\n\n---\nPrevious stage (${fromStage.label}) already ran; its summary/handoff:\n${output}\n---\nBuild on the above and the artifacts on disk — don't re-derive facts already verified unless something looks stale or wrong.`;
}

function proceedFromCurrentStage() {
  const run = state.activeRun;
  const currentStage = state.stages[run.stageIndex];
  if (currentStage && run.stageStatus[currentStage.id] === 'error') {
    addBubble('system warn', `Skipping ${currentStage.label} despite failure — its artifacts may not exist for later stages.`);
  }
  if (currentStage?.id === 'test-healer') {
    // The Healer's own instructions require it to always hand back to the Executor for
    // re-verification — this is a loop, not a straight line through the stage array.
    const execIdx = state.stages.findIndex((s) => s.id === 'test-executor-analyst');
    run.stageIndex = execIdx >= 0 ? execIdx : run.stageIndex + 1;
  } else {
    run.stageIndex += 1;
  }
  renderPipeline();
  const prompt = currentStage ? buildCarryOverPrompt(run, currentStage) : run.prompt;
  runCurrentStage(prompt);
}

function handleCommand(text) {
  const run = state.activeRun;
  const cmd = text.trim().toLowerCase();

  if (cmd === 'retry') {
    runCurrentStage(run.lastStagePrompt ?? run.prompt);
    return;
  }
  if (cmd === 'proceed') {
    proceedFromCurrentStage();
    return;
  }
  if (cmd === 'finish') {
    addBubble('system', 'Run marked complete. Check the Reports, Test Cases, and Issues tabs in the project workspace for results.');
    return;
  }
  // Anything else is a follow-up question to the current stage, not a pipeline command.
  runCurrentStage(text);
}

document.getElementById('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  addBubble('user', text);
  input.value = '';
  document.querySelectorAll('.action-bar').forEach((b) => b.remove());
  handleCommand(text);
});

// ---------- history (project-scoped) ----------
async function loadHistory(project, targetElId) {
  const el = document.getElementById(targetElId);
  if (!project) {
    el.innerHTML = '<p class="muted">Open a project first.</p>';
    return;
  }
  el.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const res = await fetch(`${bridgeUrl()}/projects/${encodeURIComponent(project)}/history`);
    const data = await res.json();
    el.innerHTML = '';
    const runs = (data.runs || []).sort((a, b) => b.startedAt - a.startedAt);
    runs.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'history-row';
      row.innerHTML = `
        <span>${r.stage} — ${new Date(r.startedAt).toLocaleString()}</span>
        <span class="${badgeClass(r.status)}">${r.status}</span>`;
      el.appendChild(row);
    });
    if (!runs.length) el.innerHTML = '<p class="muted">No runs yet for this project.</p>';
  } catch (e) {
    el.innerHTML = `<p class="muted">Could not load history: ${e.message}</p>`;
  }
}

// ---------- settings ----------
document.getElementById('bridgeUrlInput').value = state.bridgeUrl;
document.getElementById('saveBridgeUrl').addEventListener('click', () => {
  const val = document.getElementById('bridgeUrlInput').value.trim();
  if (val) {
    state.bridgeUrl = val;
    localStorage.setItem('bridgeUrl', val);
    checkBridge();
  }
});

// ---------- expand/collapse all tool steps ----------
document.getElementById('expandAllTools').addEventListener('click', () => {
  const steps = document.querySelectorAll('#chatTranscript .tool-step');
  const anyClosed = [...steps].some((s) => !s.classList.contains('open'));
  steps.forEach((s) => s.classList.toggle('open', anyClosed));
});

// ---------- theme ----------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.classList.toggle('active', b.dataset.themeSet === theme));
}
document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.themeSet)));
applyTheme(localStorage.getItem('theme') || 'dark');

// ---------- boot ----------
checkBridge();
showView('dashboard');
setInterval(checkBridge, 15000);
