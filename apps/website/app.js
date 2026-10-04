// ─────────────────────────────────────────────────────────────────────────────
// Automation OS Control Panel — Main Application JS
// Vanilla ES module. All data comes from real API calls.
// ─────────────────────────────────────────────────────────────────────────────

const API = window.NEWS_API_BASE || 'http://localhost:3000';
const N8N = window.N8N_BASE || 'http://localhost:5678';

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  currentView: 'dashboard',
  feed: { page: 1, filters: { search: '', category: '', severity: '' } },
  executions: { page: 1, module: '', status: '' }
};

const ITEMS_PER_PAGE = 10;
const EXEC_PER_PAGE  = 15;

// ── Navigation ───────────────────────────────────────────────────────────────
function navigate(view) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const viewEl = document.getElementById(`view-${view}`);
  const navEl  = document.getElementById(`nav-${view}`);
  if (viewEl) viewEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  // Titles
  const titles = {
    dashboard: 'Dashboard',
    automations: 'Automations',
    executions: 'Executions',
    'execution-detail': 'Execution Detail',
    news: 'News Feed',
    story: 'Story',
    settings: 'Settings'
  };
  document.getElementById('topbar-title').textContent = titles[view] || view;
  state.currentView = view;

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  // Load data for the view
  switch (view) {
    case 'dashboard':    loadDashboard();    break;
    case 'automations':  loadModules();      break;
    case 'executions':   loadExecutions();   break;
    case 'news':         loadFeed();         break;
    case 'settings':     loadSettings();     break;
  }
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function checkHealth(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Status dot helper ─────────────────────────────────────────────────────────
function setStatusDot(elId, ok) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = `status-dot ${ok ? 'ok' : 'error'}`;
}

function setStatValue(id, value, cls = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  if (cls) el.className = `stat-value ${cls}`;
}

// ── Badge helpers ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    success: 'badge-success', partial: 'badge-partial', failure: 'badge-failure',
    running: 'badge-running', pending: 'badge-pending'
  };
  const cls = map[status] || 'badge-pending';
  const icons = { success: '✓', partial: '⚠', failure: '✗', running: '●', pending: '○' };
  return `<span class="badge ${cls}">${icons[status] || ''} ${status}</span>`;
}

function moduleBadge(status) {
  return status === 'active'
    ? `<span class="badge badge-active">● Active</span>`
    : `<span class="badge badge-soon">Coming Soon</span>`;
}

function checkIcon(status) {
  return status === 'pass' ? '✓' : status === 'fail' ? '✗' : '○';
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(startIso, endIso) {
  if (!startIso || !endIso) return '—';
  const ms = new Date(endIso) - new Date(startIso);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
  return `${Math.round(ms/60000)}m`;
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatSeverity(severity) {
  if (!severity) return '';
  const s = severity.toLowerCase();
  const icons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
  return `<span class="severity-${s}">${icons[s] || ''} ${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  // 1. Backend health
  const backendOk = await checkHealth(`${API}/health`);
  setStatValue('stat-backend', backendOk ? 'Online' : 'Offline');
  setStatusDot('status-dot-sidebar', backendOk);
  document.getElementById('status-label-sidebar').textContent = backendOk ? 'Backend online' : 'Backend offline';
  if (!backendOk) return; // Don't try other calls if backend is down

  // 2. n8n health
  const n8nOk = await checkHealth(`${N8N}/healthz`).catch(() => false);
  setStatValue('stat-n8n', n8nOk ? 'Online' : 'Offline');

  // 3. Modules
  try {
    const data = await apiFetch('/api/modules');
    const activeCount = data.modules.filter(m => m.status === 'active').length;
    setStatValue('stat-active-modules', `${activeCount} / ${data.modules.length}`);
  } catch {
    setStatValue('stat-active-modules', '—');
  }

  // 4. Recent executions
  try {
    const data = await apiFetch('/api/executions?limit=5', {
      headers: { 'Authorization': getAuthHeader() }
    });
    const execs = data.executions || [];
    setStatValue('stat-recent-executions', execs.length);
    renderDashExecutions(execs);
  } catch {
    setStatValue('stat-recent-executions', '—');
    document.getElementById('dash-executions-container').innerHTML =
      `<div class="empty-state">Authentication required to view executions.</div>`;
  }

  // 5. Recent news
  try {
    const data = await apiFetch('/api/news?limit=3');
    renderDashNews(data.items || []);
  } catch {
    document.getElementById('dash-news-container').innerHTML =
      `<div class="error-state">Failed to load news feed.</div>`;
  }
}

function renderDashExecutions(execs) {
  const el = document.getElementById('dash-executions-container');
  if (!execs.length) {
    el.innerHTML = `<div class="empty-state">No executions yet.</div>`;
    return;
  }
  el.innerHTML = execs.map(e => renderExecutionRow(e)).join('');
}

function renderDashNews(items) {
  const el = document.getElementById('dash-news-container');
  if (!items.length) {
    el.innerHTML = `<div class="empty-state">No news items yet. Run the pipeline first.</div>`;
    return;
  }
  el.innerHTML = items.map(renderFeedCard).join('');
}

// ── MODULES ───────────────────────────────────────────────────────────────────
async function loadModules() {
  const grid = document.getElementById('module-grid');
  grid.innerHTML = `<div class="loading-state">Loading modules…</div>`;
  try {
    const data = await apiFetch('/api/modules');
    grid.innerHTML = data.modules.map(renderModuleCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="error-state">Failed to load modules: ${escapeHtml(err.message)}</div>`;
  }
}

function renderModuleCard(mod) {
  const activeClass = mod.status === 'active' ? 'active-module' : '';
  const scheduleHtml = mod.schedule ? `<span class="tag">⏱ ${mod.schedule}</span>` : '';
  const capHtml = (mod.capabilities || []).slice(0, 3)
    .map(c => `<span class="tag">${escapeHtml(c)}</span>`).join('');

  return `
    <div class="module-card ${activeClass}">
      <div class="module-card-header">
        <span class="module-card-name">${escapeHtml(mod.name)}</span>
        ${moduleBadge(mod.status)}
      </div>
      <p class="module-card-desc">${escapeHtml(mod.description)}</p>
      <div class="module-card-meta">
        ${scheduleHtml}
        ${capHtml}
      </div>
      ${mod.status === 'active' ? `<div style="margin-top:0.25rem;"><span class="mono" style="color:var(--text-muted);">v${escapeHtml(mod.version)}</span></div>` : ''}
    </div>
  `;
}

// ── EXECUTIONS ────────────────────────────────────────────────────────────────
async function loadExecutions() {
  const container = document.getElementById('executions-container');
  container.innerHTML = `<div class="loading-state">Loading…</div>`;

  const offset = (state.executions.page - 1) * EXEC_PER_PAGE;
  let url = `/api/executions?limit=${EXEC_PER_PAGE}&offset=${offset}`;
  if (state.executions.module) url += `&module=${encodeURIComponent(state.executions.module)}`;
  if (state.executions.status) url += `&status=${encodeURIComponent(state.executions.status)}`;

  try {
    const data = await apiFetch(url, { headers: { 'Authorization': getAuthHeader() } });
    const execs = data.executions || [];

    if (!execs.length) {
      container.innerHTML = `<div class="empty-state">No executions found.</div>`;
    } else {
      container.innerHTML = execs.map(e => renderExecutionRow(e, true)).join('');
    }

    // Pagination
    const pg = document.getElementById('exec-pagination');
    pg.style.display = 'flex';
    document.getElementById('exec-page-info').textContent = `Page ${state.executions.page}`;
    document.getElementById('exec-btn-prev').disabled = state.executions.page <= 1;
    document.getElementById('exec-btn-next').disabled = execs.length < EXEC_PER_PAGE;
  } catch (err) {
    container.innerHTML = `<div class="error-state">Failed to load executions: ${escapeHtml(err.message)}</div>`;
  }
}

function renderExecutionRow(exec, clickable = false) {
  const duration = fmtDuration(exec.startedAt, exec.completedAt);
  const onClick = clickable ? `onclick="window.app.viewExecution('${escapeHtml(exec.id)}')"` : '';
  return `
    <div class="execution-row" ${onClick}>
      <span class="exec-id mono">${escapeHtml(exec.id)}</span>
      <span class="exec-mod">${escapeHtml(exec.module)}</span>
      ${statusBadge(exec.status)}
      <span class="exec-time">${fmtTime(exec.startedAt)}</span>
      <span class="exec-duration">${duration}</span>
    </div>
  `;
}

// ── EXECUTION DETAIL ──────────────────────────────────────────────────────────
async function viewExecution(id) {
  // Show detail view
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-execution-detail').classList.add('active');
  document.getElementById('nav-executions').classList.add('active');
  document.getElementById('topbar-title').textContent = 'Execution Detail';
  state.currentView = 'execution-detail';

  const container = document.getElementById('execution-detail-container');
  document.getElementById('exec-detail-title').textContent = id;
  container.innerHTML = `<div class="loading-state">Loading execution ${id}…</div>`;

  try {
    const exec = await apiFetch(`/api/executions/${encodeURIComponent(id)}`, {
      headers: { 'Authorization': getAuthHeader() }
    });
    container.innerHTML = renderExecutionDetail(exec);
  } catch (err) {
    container.innerHTML = `<div class="error-state">Failed to load execution: ${escapeHtml(err.message)}</div>`;
  }
}

function renderExecutionDetail(exec) {
  const result = exec.result || {};
  const ver = exec.verification;
  const notifs = exec.notifications || [];

  const checksHtml = ver
    ? ver.checks.map(c => `
        <div class="check-row ${c.status}">
          <span class="check-icon">${checkIcon(c.status)}</span>
          <span class="check-name">${escapeHtml(c.name.replace(/_/g, ' '))}</span>
          ${c.detail ? `<span class="check-detail">${escapeHtml(c.detail)}</span>` : ''}
        </div>`).join('')
    : `<div class="check-row skip"><span class="check-icon">○</span><span class="check-name">No verification data</span></div>`;

  const verSummaryHtml = ver
    ? `<div style="margin-bottom:0.75rem; font-size:0.825rem; color:var(--text-secondary);">
         ${statusBadge(ver.passed ? 'success' : 'failure')}
         &nbsp; ${ver.passCount} passed &bull; ${ver.failCount} failed &bull; ${ver.skipCount} skipped
       </div>`
    : '';

  const notifHtml = notifs.map(n => `
    <div class="detail-row">
      <span class="detail-key">${escapeHtml(n.channel)}</span>
      <span class="detail-val">${statusBadge(n.status === 'sent' ? 'success' : n.status === 'failed' ? 'failure' : 'pending')}
        ${n.detail ? `<span class="mono" style="font-size:0.72rem; color:var(--text-muted); margin-left:0.5rem;">${escapeHtml(n.detail)}</span>` : ''}
        ${n.count ? `<span class="mono" style="font-size:0.72rem; color:var(--text-muted);"> (${n.count})</span>` : ''}
      </span>
    </div>`).join('') || `<div class="detail-row"><span class="detail-key">No notification data</span></div>`;

  return `
    <div class="detail-grid">
      <!-- Meta -->
      <div class="detail-section">
        <div class="detail-section-title">Execution Metadata</div>
        <div class="detail-row"><span class="detail-key">ID</span><span class="detail-val mono">${escapeHtml(exec.id)}</span></div>
        <div class="detail-row"><span class="detail-key">Module</span><span class="detail-val">${escapeHtml(exec.module)}</span></div>
        <div class="detail-row"><span class="detail-key">Status</span><span class="detail-val">${statusBadge(exec.status)}</span></div>
        <div class="detail-row"><span class="detail-key">Started</span><span class="detail-val">${fmtTime(exec.startedAt)}</span></div>
        <div class="detail-row"><span class="detail-key">Completed</span><span class="detail-val">${fmtTime(exec.completedAt)}</span></div>
        <div class="detail-row"><span class="detail-key">Duration</span><span class="detail-val mono">${fmtDuration(exec.startedAt, exec.completedAt)}</span></div>
        ${exec.error ? `<div class="detail-row"><span class="detail-key">Error</span><span class="detail-val" style="color:var(--accent-red);">${escapeHtml(exec.error)}</span></div>` : ''}
      </div>

      <!-- Results -->
      <div class="detail-section">
        <div class="detail-section-title">Pipeline Result</div>
        <div class="detail-row"><span class="detail-key">Collected</span><span class="detail-val mono">${result.items_collected ?? '—'}</span></div>
        <div class="detail-row"><span class="detail-key">Deduplicated</span><span class="detail-val mono">${result.items_deduplicated ?? '—'}</span></div>
        <div class="detail-row"><span class="detail-key">Validated</span><span class="detail-val mono">${result.items_validated ?? '—'}</span></div>
        <div class="detail-row"><span class="detail-key">AI Analyzed</span><span class="detail-val mono">${result.items_analyzed ?? '—'}</span></div>
        <div class="detail-row"><span class="detail-key">Persisted</span><span class="detail-val mono">${result.items_persisted ?? '—'}</span></div>
        <div class="detail-row"><span class="detail-key">Notified</span><span class="detail-val mono">${result.items_notified ?? '—'}</span></div>
      </div>
    </div>

    <!-- Verification -->
    <div class="detail-section" style="margin-bottom: var(--gap);">
      <div class="detail-section-title">Verification</div>
      ${verSummaryHtml}
      <div class="verification-checks">${checksHtml}</div>
    </div>

    <!-- Notifications -->
    <div class="detail-section">
      <div class="detail-section-title">Notifications</div>
      ${notifHtml}
    </div>
  `;
}

// ── NEWS FEED ─────────────────────────────────────────────────────────────────
function buildApiUrl(base, filters, page) {
  let url;
  if (filters.search) {
    url = new URL(`${base}/api/news/search`);
    url.searchParams.set('query', filters.search);
  } else {
    url = new URL(`${base}/api/news`);
  }
  if (filters.category) url.searchParams.set('category', filters.category);
  if (filters.severity)  url.searchParams.set('severity', filters.severity);
  url.searchParams.set('page', page);
  url.searchParams.set('limit', ITEMS_PER_PAGE);
  return url.toString();
}

async function loadFeed() {
  const container = document.getElementById('feed-container');
  const statusEl  = document.getElementById('feed-status');
  container.innerHTML = '';
  statusEl.innerHTML  = 'Loading news…';

  try {
    const url = buildApiUrl(API, state.feed.filters, state.feed.page);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();

    if ((data.items || []).length === 0) {
      statusEl.innerHTML = 'No news found matching your filters.';
    } else {
      statusEl.innerHTML = '';
      container.innerHTML = (data.items || []).map(renderFeedCard).join('');
    }

    document.getElementById('page-info').textContent = `Page ${state.feed.page}`;
    document.getElementById('btn-prev').disabled = state.feed.page <= 1;
    document.getElementById('btn-next').disabled = (data.items || []).length < ITEMS_PER_PAGE;
  } catch (err) {
    statusEl.innerHTML = `<span style="color:var(--accent-red);">Error loading feed: ${escapeHtml(err.message)}</span>`;
  }
}

function renderFeedCard(item) {
  const published  = item.item.publishedAt ? new Date(item.item.publishedAt).toLocaleString() : 'Unknown';
  const severityHtml = formatSeverity(item.analysis?.severity);
  const tagsHtml   = (item.analysis?.tags || []).slice(0, 5)
    .map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <a href="#" onclick="window.app.viewStory('${escapeHtml(item.item.id)}'); return false;">
            ${escapeHtml(item.item.title)}
          </a>
        </h3>
        <div>${severityHtml}</div>
      </div>
      <div class="card-meta">${escapeHtml(item.item.source)} &bull; ${published}</div>
      <div class="card-summary">${escapeHtml(item.analysis?.summary || 'No summary available.')}</div>
      <div class="tags">${tagsHtml}</div>
    </div>
  `;
}

async function viewStory(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-story').classList.add('active');
  document.getElementById('nav-news').classList.add('active');
  document.getElementById('topbar-title').textContent = 'Story';
  state.currentView = 'story';

  const container = document.getElementById('story-container');
  container.innerHTML = `<div class="loading-state">Loading story…</div>`;

  try {
    const res = await fetch(`${API}/api/news/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    container.innerHTML = renderStoryDetail(data);
  } catch (err) {
    container.innerHTML = `<div class="error-state">Error loading story: ${escapeHtml(err.message)}</div>`;
  }
}

function renderStoryDetail(item) {
  const published = item.item.publishedAt ? new Date(item.item.publishedAt).toLocaleString() : 'Unknown';
  const severityHtml = formatSeverity(item.analysis?.severity);
  const tagsHtml = (item.analysis?.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const keyPointsHtml = (item.analysis?.keyPoints || []).map(kp => `<li>${escapeHtml(kp)}</li>`).join('');
  const entitiesHtml = (item.analysis?.entities || []).map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('');
  const techHtml = (item.analysis?.technologies || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const relatedHtml = (item.item.relatedSources || []).map(s => `<li>${escapeHtml(s)}</li>`).join('');

  return `
    <article class="card">
      <div class="card-header">
        <h2 class="card-title">${escapeHtml(item.item.title)}</h2>
        <div>${severityHtml}</div>
      </div>
      <div class="story-meta">
        <span><strong>Source:</strong> <a href="${escapeHtml(item.item.url)}" target="_blank" rel="noopener">${escapeHtml(item.item.source)}</a></span>
        <span><strong>Published:</strong> ${published}</span>
        <span><strong>Evidence:</strong> ${item.validation?.status || 'unknown'}</span>
      </div>
      ${item.analysis?.summary ? `<div class="story-section"><h3>Summary</h3><p>${escapeHtml(item.analysis.summary)}</p></div>` : ''}
      ${keyPointsHtml ? `<div class="story-section"><h3>Key Points</h3><ul>${keyPointsHtml}</ul></div>` : ''}
      ${entitiesHtml || techHtml ? `
        <div class="story-section">
          <h3>Entities &amp; Technologies</h3>
          <div class="tags" style="margin-bottom:0.5rem;">${entitiesHtml}</div>
          <div class="tags">${techHtml}</div>
        </div>` : ''}
      ${tagsHtml ? `<div class="story-section"><h3>Tags</h3><div class="tags">${tagsHtml}</div></div>` : ''}
      ${relatedHtml ? `<div class="story-section"><h3>Also Reported By</h3><ul>${relatedHtml}</ul></div>` : ''}
    </article>
  `;
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
async function loadSettings() {
  const container = document.getElementById('settings-container');
  container.innerHTML = `<div class="loading-state">Checking service status…</div>`;

  const [backendOk, n8nOk] = await Promise.all([
    checkHealth(`${API}/health`),
    checkHealth(`${N8N}/healthz`).catch(() => false)
  ]);

  let modulesStatus = '—'; let telegramStatus = 'Unknown';
  try {
    const data = await apiFetch('/api/modules');
    modulesStatus = `${data.modules.length} registered`;
    const cyberMod = data.modules.find(m => m.id === 'cybersecurity-news');
    // Telegram configured if the module is active — we check via the execution data if available
    telegramStatus = 'Check execution verification';
  } catch { modulesStatus = 'Unavailable'; }

  container.innerHTML = `
    <div class="settings-grid">
      <div class="setting-card">
        <div class="setting-card-header">
          <span class="setting-name">Backend API</span>
          <span class="badge ${backendOk ? 'badge-success' : 'badge-failure'}">${backendOk ? '● Online' : '✗ Offline'}</span>
        </div>
        <p class="setting-desc">Automation OS backend — <span class="mono">${API}</span></p>
      </div>
      <div class="setting-card">
        <div class="setting-card-header">
          <span class="setting-name">n8n Orchestrator</span>
          <span class="badge ${n8nOk ? 'badge-success' : 'badge-failure'}">${n8nOk ? '● Online' : '✗ Offline'}</span>
        </div>
        <p class="setting-desc">n8n automation engine — <span class="mono">${N8N}</span></p>
      </div>
      <div class="setting-card">
        <div class="setting-card-header">
          <span class="setting-name">Modules</span>
          <span class="badge badge-success">Loaded</span>
        </div>
        <p class="setting-desc">${escapeHtml(modulesStatus)}</p>
      </div>
      <div class="setting-card">
        <div class="setting-card-header">
          <span class="setting-name">Telegram</span>
          <span class="badge badge-pending">Check executions</span>
        </div>
        <p class="setting-desc">Credentials are managed via <span class="mono">TELEGRAM_BOT_TOKEN</span> and <span class="mono">TELEGRAM_CHAT_ID</span> environment variables. Check execution verification to see if configured.</p>
      </div>
      <div class="setting-card">
        <div class="setting-card-header">
          <span class="setting-name">AI Model</span>
          <span class="badge badge-active">Active</span>
        </div>
        <p class="setting-desc">Local inference via Ollama. Model: <span class="mono">qwen2.5:3b</span></p>
      </div>
      <div class="setting-card">
        <div class="setting-card-header">
          <span class="setting-name">Database</span>
          <span class="badge ${backendOk ? 'badge-success' : 'badge-failure'}">${backendOk ? 'Connected' : 'Unknown'}</span>
        </div>
        <p class="setting-desc">PostgreSQL. Secrets managed via <span class="mono">DATABASE_URL</span>. Never exposed via the API.</p>
      </div>
    </div>
    <div style="margin-top:1.5rem; padding: 1rem 1.25rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-md); font-size:0.825rem; color:var(--text-muted);">
      ⚠ Secrets are managed via environment variables and are never visible or editable through this panel.
      To update credentials, edit your <span class="mono">.env</span> file and restart the service.
    </div>
  `;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function getAuthHeader() {
  // Token is supplied via query param for dev convenience — never committed
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || localStorage.getItem('automata_token') || '';
  return token ? `Bearer ${token}` : '';
}

// ── Wire up events ────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {

  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view) navigate(view);
    });
  });

  // Dashboard links
  document.getElementById('dash-executions-link').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('executions');
  });
  document.getElementById('dash-news-link').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('news');
  });

  // Mobile menu toggle
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Execution back button
  document.getElementById('exec-detail-back').addEventListener('click', () => navigate('executions'));

  // Execution filters
  document.getElementById('exec-filter-module').addEventListener('change', (e) => {
    state.executions.module = e.target.value;
    state.executions.page = 1;
    loadExecutions();
  });
  document.getElementById('exec-filter-status').addEventListener('change', (e) => {
    state.executions.status = e.target.value;
    state.executions.page = 1;
    loadExecutions();
  });
  document.getElementById('exec-refresh-btn').addEventListener('click', () => loadExecutions());

  // Execution pagination
  document.getElementById('exec-btn-prev').addEventListener('click', () => {
    if (state.executions.page > 1) { state.executions.page--; loadExecutions(); }
  });
  document.getElementById('exec-btn-next').addEventListener('click', () => {
    state.executions.page++;
    loadExecutions();
  });

  // News feed filters
  let searchTimeout;
  document.getElementById('filter-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.feed.filters.search = e.target.value.trim();
      state.feed.page = 1;
      loadFeed();
    }, 300);
  });
  document.getElementById('filter-category').addEventListener('change', (e) => {
    state.feed.filters.category = e.target.value;
    state.feed.page = 1;
    loadFeed();
  });
  document.getElementById('filter-severity').addEventListener('change', (e) => {
    state.feed.filters.severity = e.target.value;
    state.feed.page = 1;
    loadFeed();
  });
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (state.feed.page > 1) { state.feed.page--; loadFeed(); }
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    state.feed.page++;
    loadFeed();
  });

  // Story back button
  document.getElementById('btn-back').addEventListener('click', () => navigate('news'));

  // Global app interface for inline onclick usage
  window.app = { viewStory, viewExecution };

  // Initial page load
  navigate('dashboard');
});
