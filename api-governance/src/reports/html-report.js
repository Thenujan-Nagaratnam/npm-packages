function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeForScript(value) {
  var LS = String.fromCharCode(0x2028);
  var PS = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(new RegExp(LS, 'g'), '\\u2028')
    .replace(new RegExp(PS, 'g'), '\\u2029');
}

// For inline onclick="applyFilter(...)" attributes – double-quotes must be &quot;
function filterOnclick(filter) {
  return 'applyFilter(' + JSON.stringify(filter).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + ')';
}

const SCORE_BANDS = [
  { min: 90, color: '#22c55e' },
  { min: 75, color: '#3b82f6' },
  { min: 50, color: '#eab308' },
  { min: 0,  color: '#ef4444' },
];

function scoreColor(score) {
  const n = Number.isFinite(score) ? score : 0;
  return (SCORE_BANDS.find((b) => n >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1]).color;
}

function toUnifiedReport(input) {
  if (!input || typeof input !== 'object') return null;
  if (input.report && typeof input.report === 'object') return input.report;
  if (input.reportId && input.overview && input.breakdown) return input;
  return null;
}

const METHOD_COLORS = {
  GET:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.18)' },
  POST:    { color: '#4ade80', bg: 'rgba(74,222,128,0.18)' },
  PUT:     { color: '#fb923c', bg: 'rgba(251,146,60,0.18)' },
  PATCH:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.18)' },
  DELETE:  { color: '#f87171', bg: 'rgba(248,113,113,0.18)' },
  HEAD:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' },
  OPTIONS: { color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' },
};
function getMethodStyle(method) {
  return METHOD_COLORS[(method || '').toUpperCase()] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' };
}

function buildSpecSnippet(specLines, range) {
  if (!Array.isArray(specLines) || specLines.length === 0 || !range) return null;
  const startLine = (range.start && range.start.line != null) ? range.start.line + 1 : null;
  const endLine   = (range.end   && range.end.line   != null) ? range.end.line   + 1 : startLine;
  if (!startLine) return null;
  const from = Math.max(1, startLine - 2);
  const to   = Math.min(specLines.length, endLine + 2);
  const result = [];
  for (let i = from; i <= to; i++) {
    result.push({ lineNumber: i, text: specLines[i - 1] == null ? '' : String(specLines[i - 1]), highlight: i >= startLine && i <= endLine });
  }
  return result;
}

function normalizeIssues(report) {
  if (!report || !report.violationsById) return [];
  return Object.values(report.violationsById);
}

// ── CSS themes ────────────────────────────────────────────────────────────────
const CSS_THEMES = `
  /* Dark theme (default) */
  :root, .theme-dark {
    --bg-page:    #0f1117;
    --bg-surface: #161b27;
    --bg-card:    #1c2333;
    --bg-card-2:  #212840;
    --bg-input:   #151b2b;
    --bg-hover:   rgba(99,120,200,0.10);
    --bg-selected:rgba(59,96,200,0.22);
    --border:     rgba(255,255,255,0.09);
    --border-med: rgba(255,255,255,0.13);
    --fg:         #e2e8f0;
    --fg-dim:     #8892a4;
    --fg-muted:   #525f74;
    --link:       #7eb8f7;
    --focus:      #7eb8f7;
    --error:      #f87171;
    --warn:       #fbbf24;
    --info:       #38bdf8;
    --pass:       #34d399;
    --shadow:     0 4px 24px rgba(0,0,0,0.45);
    --shadow-sm:  0 2px 8px rgba(0,0,0,0.35);
    --ring-track: rgba(255,255,255,0.08);
  }

  /* Light theme */
  .theme-light {
    --bg-page:    #f0f2f5;
    --bg-surface: #ffffff;
    --bg-card:    #f7f8fa;
    --bg-card-2:  #eef0f4;
    --bg-input:   #ffffff;
    --bg-hover:   rgba(59,96,220,0.06);
    --bg-selected:rgba(59,96,220,0.10);
    --border:     rgba(0,0,0,0.09);
    --border-med: rgba(0,0,0,0.14);
    --fg:         #111827;
    --fg-dim:     #4b5563;
    --fg-muted:   #9ca3af;
    --link:       #2563eb;
    --focus:      #3b6fdc;
    --error:      #dc2626;
    --warn:       #d97706;
    --info:       #0284c7;
    --pass:       #059669;
    --shadow:     0 4px 16px rgba(0,0,0,0.10);
    --shadow-sm:  0 2px 6px rgba(0,0,0,0.07);
    --ring-track: rgba(0,0,0,0.10);
  }

  @media (prefers-color-scheme: light) {
    :root { /* apply light vars by default when OS prefers light */
      --bg-page:    #f0f2f5;
      --bg-surface: #ffffff;
      --bg-card:    #f7f8fa;
      --bg-card-2:  #eef0f4;
      --bg-input:   #ffffff;
      --bg-hover:   rgba(59,96,220,0.06);
      --bg-selected:rgba(59,96,220,0.10);
      --border:     rgba(0,0,0,0.09);
      --border-med: rgba(0,0,0,0.14);
      --fg:         #111827;
      --fg-dim:     #4b5563;
      --fg-muted:   #9ca3af;
      --link:       #2563eb;
      --focus:      #3b6fdc;
      --error:      #dc2626;
      --warn:       #d97706;
      --info:       #0284c7;
      --pass:       #059669;
      --shadow:     0 4px 16px rgba(0,0,0,0.10);
      --shadow-sm:  0 2px 6px rgba(0,0,0,0.07);
      --ring-track: rgba(0,0,0,0.10);
    }
    /* override back to dark if class set */
    .theme-dark {
      --bg-page:    #0f1117;
      --bg-surface: #161b27;
      --bg-card:    #1c2333;
      --bg-card-2:  #212840;
      --bg-input:   #151b2b;
      --bg-hover:   rgba(99,120,200,0.10);
      --bg-selected:rgba(59,96,200,0.22);
      --border:     rgba(255,255,255,0.09);
      --border-med: rgba(255,255,255,0.13);
      --fg:         #e2e8f0;
      --fg-dim:     #8892a4;
      --fg-muted:   #525f74;
      --link:       #7eb8f7;
      --focus:      #7eb8f7;
      --error:      #f87171;
      --warn:       #fbbf24;
      --info:       #38bdf8;
      --pass:       #34d399;
      --shadow:     0 4px 24px rgba(0,0,0,0.45);
      --shadow-sm:  0 2px 8px rgba(0,0,0,0.35);
      --ring-track: rgba(255,255,255,0.08);
    }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderExtLink() {
  return `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-left:3px;opacity:.65"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
}

function renderGradeRing(score, ringColor, size) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const inner = Math.round(size * 0.72);
  const fontSz = Math.round(size * 0.215);
  return `<div style="width:${size}px;height:${size}px;margin:0 auto 8px;border-radius:50%;background:radial-gradient(circle at center,var(--bg-surface) 55%,transparent 56%),conic-gradient(${ringColor} calc(${pct}*1%),var(--ring-track) 0);display:flex;align-items:center;justify-content:center;position:relative">
  <div style="position:absolute;width:${inner}px;height:${inner}px;border-radius:50%;border:1px solid var(--border);background:var(--bg-surface)"></div>
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;line-height:1">
    <div style="font-size:${fontSz}px;font-weight:900;color:${ringColor};line-height:1">${pct}%</div>
  </div>
</div>`;
}

function renderDimScore(score, ringColor, size) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;position:relative;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;line-height:1;flex-shrink:0;background:conic-gradient(${ringColor} ${pct}%,var(--ring-track) 0)">
  <div style="position:absolute;inset:3px;border-radius:50%;background:var(--bg-card)"></div>
  <span style="position:relative;z-index:1;color:${ringColor}">${pct}%</span>
</div>`;
}

function renderScorePill(pct, color) {
  return `<span style="display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:700;line-height:1;color:${color};background:${color}22;border:1px solid ${color}44;flex-shrink:0">${pct}%</span>`;
}

function renderSubScorePill(pct, color) {
  return `<span style="display:inline-flex;align-items:center;height:18px;border-radius:999px;padding:0 7px;font-size:10px;font-weight:700;color:${color};background:${color}1e;border:1px solid ${color}38;flex-shrink:0">${pct}%</span>`;
}

function tagStyle() {
  return 'font-size:11px;color:var(--link);border:1px solid var(--border-med);border-radius:4px;padding:3px 9px;background:var(--bg-card-2);display:inline-flex;align-items:center;gap:4px;text-decoration:none;cursor:pointer;transition:background .12s,border-color .12s,color .12s;white-space:nowrap';
}

// ── Overview ──────────────────────────────────────────────────────────────────

function renderOverview(report) {
  const ov = report.overview;
  const score = Math.max(0, Math.min(100, Math.round(ov.score)));
  const ringColor = scoreColor(score);

  const passedChecks = ov.passedChecks || 0;
  const totalChecks  = ov.totalChecks  || 0;
  const passedRatio  = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
  const passedColor  = scoreColor(passedRatio);

  let errorCount = 0, warningCount = 0, endpointsAffected = 0;
  (ov.metrics || []).forEach((m) => {
    if (m.id === 'errors')    errorCount = m.value;
    if (m.id === 'warnings')  warningCount = m.value;
    if (m.id === 'endpoints') endpointsAffected = m.value;
  });

  const endpointsColor = endpointsAffected > 0 ? 'var(--warn)' : 'var(--pass)';
  const errColor       = errorCount   > 0 ? 'var(--error)' : 'var(--pass)';
  const warnColor      = warningCount > 0 ? 'var(--warn)'  : 'var(--pass)';

  const metricCards = [
    { label: 'Passed Checks', desc: 'Completed checks out of the total checks run',
      valueHtml: `<span style="color:${passedColor}">${passedChecks}<span style="color:var(--fg-dim);font-size:18px;font-weight:600">/${totalChecks}</span></span>`, linkFilter: null },
    { label: 'Affected Endpoints', desc: 'Endpoints impacted by one or more findings',
      valueHtml: `<span style="color:${endpointsColor}">${endpointsAffected}</span>`, linkFilter: endpointsAffected > 0 ? '__endpoints__' : null },
    { label: 'Errors', desc: 'Issues that require immediate attention',
      valueHtml: `<span style="color:${errColor}">${errorCount}</span>`, linkFilter: errorCount > 0 ? '__severity__:error' : null },
    { label: 'Warnings', desc: 'Potential risks and improvement opportunities',
      valueHtml: `<span style="color:${warnColor}">${warningCount}</span>`, linkFilter: warningCount > 0 ? '__severity__:warn' : null },
  ];

  const cardsHtml = metricCards.map((m) => `
<div class="metric-card">
  <div class="metric-label">${escapeHtml(m.label)}</div>
  <div class="metric-desc">${escapeHtml(m.desc)}</div>
  <div class="metric-value-row">
    <div class="metric-value">${m.valueHtml}</div>
    ${m.linkFilter ? `<a href="#" onclick="${filterOnclick(m.linkFilter)};return false" class="view-link">View issues</a>` : ''}
  </div>
</div>`).join('');

  const subtitle = report.overview && report.overview.subtitle ? report.overview.subtitle : '';

  return `<div class="overview-row">
  <div class="grade-card">
    <div class="grade-label">API Score</div>
    ${renderGradeRing(score, ringColor, 132)}
  </div>
  <div class="meta-block">
    <div>
      <h1 class="report-title">${escapeHtml(report.title || '')}</h1>
      ${subtitle ? `<div class="report-subtitle">${escapeHtml(subtitle)}</div>` : ''}
    </div>
    <div class="metrics-grid">${cardsHtml}</div>
  </div>
</div>`;
}

// ── Breakdown card (shared between all report types) ─────────────────────────

function renderBreakdownCard(cat, reportId) {
  const pct = Math.max(0, Math.min(100, Math.round(cat.percentage || 0)));
  const ringColor = scoreColor(pct);
  const hasFindings = (cat.errors || 0) > 0 || (cat.warnings || 0) > 0 || (cat.infos || 0) > 0;

  // Issue count line (bottom-right)
  let issueHtml;
  if (!hasFindings) {
    issueHtml = '<span style="color:var(--fg-dim)">All passing</span>';
  } else {
    const parts = [];
    if (cat.errors   > 0) parts.push(`<span style="color:var(--error)"><a href="#" onclick="${filterOnclick('__severity__:error:' + cat.viewIssuesFilter.key)};return false" style="color:inherit;text-decoration:underline;text-underline-offset:2px">${cat.errors} error${cat.errors !== 1 ? 's' : ''}</a></span>`);
    if (cat.warnings > 0) parts.push(`<span style="color:var(--warn)"><a href="#" onclick="${filterOnclick('__severity__:warn:' + cat.viewIssuesFilter.key)};return false" style="color:inherit;text-decoration:underline;text-underline-offset:2px">${cat.warnings} warning${cat.warnings !== 1 ? 's' : ''}</a></span>`);
    if ((cat.infos||0) > 0) parts.push(`<span style="color:var(--info)"><a href="#" onclick="${filterOnclick('__severity__:info:' + cat.viewIssuesFilter.key)};return false" style="color:inherit;text-decoration:underline;text-underline-offset:2px">${cat.infos} info${cat.infos !== 1 ? 's' : ''}</a></span>`);
    issueHtml = parts.join('<span style="color:var(--border-med)"> · </span>');
  }

  // Tags row (bottom-left) — AI uses sub-bucket tags, others use category/endpoint/rule tags
  let tagsHtml = '';
  if (reportId === 'ai-readiness') {
    tagsHtml = (cat.subBuckets || []).map((sb) => {
      const sbPct = Math.max(0, Math.min(100, Math.round(sb.percentage || 0)));
      return `<a href="#" onclick="${filterOnclick(sb.viewIssuesFilter.key)};return false" style="${tagStyle()}" title="${escapeHtml(sb.description || sb.label)}">${escapeHtml(sb.label)} (${sbPct}%)</a>`;
    }).join('');
  } else {
    const tags = [
      { label: cat.id, filter: cat.viewIssuesFilter.key, tooltip: cat.description || cat.label },
      ...(cat.affectedEndpoints > 0 ? [{ label: `${cat.affectedEndpoints} endpoint${cat.affectedEndpoints !== 1 ? 's' : ''}`, filter: '__endpoints__:' + cat.viewIssuesFilter.key, tooltip: cat.label }] : []),
      ...((cat.topRules || []).slice(0, 2).map((r) => ({ label: r, filter: cat.viewIssuesFilter.key, tooltip: r }))),
    ];
    tagsHtml = tags.map((t) => `<a href="#" onclick="${filterOnclick(t.filter)};return false" style="${tagStyle()}" title="${escapeHtml(t.tooltip)}">${escapeHtml(t.label)}</a>`).join('');
  }

  const docsHtml = cat.docsUrl
    ? `<a href="${escapeHtml(cat.docsUrl)}" target="_blank" rel="noopener" style="font-size:11px;font-weight:500;color:var(--link);display:inline-flex;align-items:center;border:1px solid var(--border-med);border-radius:4px;padding:2px 7px;text-decoration:none">Docs${renderExtLink()}</a>`
    : '';

  return `<div class="breakdown-card">
  <div style="padding:14px">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
      ${renderScorePill(pct, ringColor)}
      <span style="font-size:13px;font-weight:700;color:var(--fg)">${escapeHtml(cat.label)}</span>
      ${docsHtml}
    </div>
    ${cat.description ? `<div style="font-size:11px;color:var(--fg-dim);line-height:1.5;margin-bottom:10px">${escapeHtml(cat.description)}</div>` : '<div style="margin-bottom:10px"></div>'}
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div style="display:flex;gap:5px;flex-wrap:wrap">${tagsHtml}</div>
      <div style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;white-space:nowrap;flex-shrink:0">${issueHtml}</div>
    </div>
  </div>
</div>`;
}

// ── Breakdown section ─────────────────────────────────────────────────────────

function renderBreakdown(report) {
  const bd = report.breakdown;
  const isAi = report.reportId === 'ai-readiness';
  const cats = bd.categories || [];

  // For OWASP/REST sort by severity; for AI keep backend order
  const ordered = isAi ? cats : [...cats].sort((a, b) => {
    const pa = a.errors > 0 ? 0 : a.warnings > 0 ? 1 : 2;
    const pb = b.errors > 0 ? 0 : b.warnings > 0 ? 1 : 2;
    return pa - pb || b.errors - a.errors || b.warnings - a.warnings || b.total - a.total;
  });

  const badge = ordered.length === 0
    ? 'No findings'
    : `${ordered.length} ${report.reportId === 'owasp' ? 'areas' : isAi ? 'dimensions' : 'themes'}`;

  const cardsHtml = ordered.map((c) => renderBreakdownCard(c, report.reportId)).join('');

  return `<div class="section">
  <div class="section-header">
    <div>
      <div class="section-title">${escapeHtml(bd.title || '')}</div>
      ${bd.subtitle ? `<div class="section-subtitle">${escapeHtml(bd.subtitle)}</div>` : ''}
    </div>
    <div class="section-badge">${escapeHtml(badge)}</div>
  </div>
  <div class="cards-grid">${cardsHtml}</div>
</div>`;
}

// ── Issue Explorer ────────────────────────────────────────────────────────────

function renderIssueExplorer(report, specLines) {
  const ie = report.issueExplorer || {};
  const issues = normalizeIssues(report);
  const filterOptions = ie.breakdownFilterOptions || [];

  const issueCardsHtml = issues.map((issue, idx) => {
    const sev = (issue.severity || '').toLowerCase();
    const borderColor = sev === 'error' ? 'var(--error)' : sev === 'warn' ? 'var(--warn)' : 'var(--info)';
    return `<div id="card_${idx}" onclick="selectIssue(${idx})" class="issue-card" style="border-left-color:${borderColor}" data-severity="${escapeHtml(sev)}" data-path="${escapeHtml(issue.displayPath || '')}" data-message="${escapeHtml(issue.message || '')}" data-breakdown="${escapeHtml((issue.breakdownKeys||[]).join(','))}" data-endpoint="${escapeHtml(issue.endpoint || '')}">
  <div style="font-size:12px;font-weight:500;line-height:1.35;color:var(--fg)">${escapeHtml(issue.message || '')}</div>
  <div style="font-size:11px;color:var(--fg-dim);font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">${escapeHtml(issue.displayPath || issue.endpoint || '')}</div>
</div>`;
  }).join('');

  const filterOptionsHtml = filterOptions.map((o) => `<option value="${escapeHtml(o.key)}">${escapeHtml(o.label)}</option>`).join('');

  const issueDataJson = serializeForScript(issues.map((issue) => ({
    id: issue.id,
    rule: issue.rule,
    message: issue.message,
    description: issue.description,
    fixSuggestion: issue.fixSuggestion,
    severity: issue.severity,
    endpoint: issue.endpoint,
    method: issue.method,
    displayPath: issue.displayPath,
    line: issue.line,
    range: issue.range,
    breakdownKeys: issue.breakdownKeys || [],
    snippetLines: buildSpecSnippet(specLines, issue.range),
  })));

  return `<div class="section" id="issueExplorerSection">
  <div class="section-header">
    <div>
      <div class="section-title">${escapeHtml(ie.title || 'Issue Explorer')}</div>
      <div class="section-subtitle">${escapeHtml(ie.subtitle || 'Browse, filter and inspect all violations in detail')}</div>
    </div>
    <div class="section-badge" id="issueCountBadge">${issues.length} issue${issues.length !== 1 ? 's' : ''}</div>
  </div>

  <div style="position:relative;overflow-x:hidden">
    <div id="explorerBlock" class="explorer-block">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-row">
          <button onclick="setFilter('all')"   id="chip_all"   class="chip chip-active">All</button>
          <button onclick="setFilter('error')" id="chip_error" class="chip"><span class="chip-dot" style="background:var(--error)"></span>Errors</button>
          <button onclick="setFilter('warn')"  id="chip_warn"  class="chip"><span class="chip-dot" style="background:var(--warn)"></span>Warnings</button>
          <button onclick="setFilter('info')"  id="chip_info"  class="chip"><span class="chip-dot" style="background:var(--info)"></span>Info</button>
          <div class="toolbar-sep"></div>
          <select id="groupBySelect" onchange="setGroupBy(this.value)" class="ctrl-select">
            <option value="none">No grouping</option>
            <option value="rule">Group by rule</option>
            <option value="endpoint">Group by endpoint</option>
          </select>
          ${filterOptionsHtml ? `<select id="categorySelect" onchange="setCategoryFilter(this.value)" class="ctrl-select"><option value="">All categories</option>${filterOptionsHtml}</select>` : ''}
          <div class="toolbar-sep"></div>
          <div class="search-wrap">
            <span class="search-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <input id="searchInput" oninput="applyFilters()" placeholder="Search rules, messages, paths…" class="search-input">
          </div>
        </div>
        <div id="activeFilterRow" style="display:none;margin-top:6px">
          <span id="activeFilterPill" class="active-filter-pill"></span>
          <button onclick="clearActiveFilter()" class="clear-filter-btn">Clear</button>
        </div>
      </div>

      <!-- List -->
      <div class="explorer-body">
        <div id="issueCardsBody" class="issue-cards-body">
          ${issueCardsHtml}
        </div>
        <div id="tableFooter" class="table-footer">Showing ${issues.length} of ${issues.length} issues</div>
      </div>
    </div>

    <!-- Detail overlay -->
    <div id="detailColumn" class="detail-column">
      <div style="overflow:hidden;flex:1;display:flex;flex-direction:column">
        <div class="detail-header">
          <span class="detail-header-title">Issue Detail</span>
          <div style="display:flex;align-items:center;gap:10px">
            <span id="detailCounter" style="font-size:12px;color:var(--fg-dim)"></span>
            <button onclick="closeDetail()" class="close-btn" aria-label="Close">&#xd7;</button>
          </div>
        </div>
        <div id="detailBody" class="detail-body"></div>
      </div>
    </div>
  </div>

  <script>
  (function() {
    var allIssues = ${issueDataJson};
    var METHOD_COLORS = ${serializeForScript(METHOD_COLORS)};
    var sevFilter = 'all', catFilter = '', groupBy = 'none', activeFilter = null, selectedIdx = null;

    function esc(s) {
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function getMethodStyle(m) {
      return METHOD_COLORS[(m||'').toUpperCase()] || { color:'#94a3b8', bg:'rgba(148,163,184,.18)' };
    }

    function matchActive(issue, filter) {
      if (!filter) return true;
      var sev = (issue.severity||'').toLowerCase();
      var keys = issue.breakdownKeys || [];
      if (filter === '__endpoints__') return issue.endpoint && issue.endpoint !== 'global';
      if (filter.startsWith('__endpoints__:')) { var k=filter.slice(14); return keys.some(function(x){return x===k;}) && issue.endpoint && issue.endpoint !== 'global'; }
      if (filter.startsWith('__severity__:error:')) { var k=filter.slice(19); return sev==='error' && keys.some(function(x){return x===k;}); }
      if (filter.startsWith('__severity__:warn:'))  { var k=filter.slice(18); return (sev==='warn'||sev==='warning') && keys.some(function(x){return x===k;}); }
      if (filter.startsWith('__severity__:info:'))  { var k=filter.slice(18); return sev==='info' && keys.some(function(x){return x===k;}); }
      if (filter==='__severity__:error') return sev==='error';
      if (filter==='__severity__:warn')  return sev==='warn'||sev==='warning';
      if (filter==='__severity__:info')  return sev==='info';
      return keys.some(function(x){return x===filter;});
    }

    window.applyFilters = function() {
      var search = (document.getElementById('searchInput').value||'').toLowerCase();
      var cards = document.querySelectorAll('#issueCardsBody .issue-card');
      var visible = 0;
      cards.forEach(function(card, i) {
        var issue = allIssues[i]; if (!issue) return;
        var sev = (issue.severity||'').toLowerCase();
        var ok = (sevFilter==='all' || sev===sevFilter || (sevFilter==='warn' && (sev==='warn'||sev==='warning')))
          && (!catFilter || (issue.breakdownKeys||[]).some(function(k){return k===catFilter;}))
          && matchActive(issue, activeFilter)
          && (!search || (issue.message||'').toLowerCase().includes(search) || (issue.displayPath||'').toLowerCase().includes(search) || (issue.rule||'').toLowerCase().includes(search));
        card.style.display = ok ? '' : 'none';
        if (ok) visible++;
      });
      document.getElementById('tableFooter').textContent = 'Showing '+visible+' of '+allIssues.length+' issues';
      document.getElementById('issueCountBadge').textContent = visible+' issue'+(visible!==1?'s':'');
    };

    window.setFilter = function(f) {
      sevFilter = f;
      ['all','error','warn','info'].forEach(function(id) {
        var el = document.getElementById('chip_'+id); if (!el) return;
        var active = id === f;
        el.className = 'chip' + (active ? ' chip-active' : '');
      });
      applyFilters();
    };

    window.setGroupBy = function(v) { groupBy = v; applyFilters(); };
    window.setCategoryFilter = function(v) { catFilter = v; applyFilters(); };

    window.applyFilter = function(filter) {
      activeFilter = filter;
      document.getElementById('activeFilterRow').style.display = '';
      document.getElementById('activeFilterPill').textContent = 'Filtered: '+filter;
      var cat = document.getElementById('categorySelect');
      if (cat) { cat.value = ''; }
      applyFilters();
      var sec = document.getElementById('issueExplorerSection');
      if (sec) sec.scrollIntoView({ behavior:'smooth' });
    };

    window.clearActiveFilter = function() {
      activeFilter = null;
      document.getElementById('activeFilterRow').style.display = 'none';
      applyFilters();
    };

    window.selectIssue = function(idx) {
      selectedIdx = idx;
      var issue = allIssues[idx]; if (!issue) return;

      document.querySelectorAll('#issueCardsBody .issue-card').forEach(function(c, i) {
        c.style.background = i===idx ? 'var(--bg-selected)' : 'var(--bg-card)';
      });

      var col = document.getElementById('detailColumn');
      col.style.transform = 'translateX(0)'; col.style.opacity = '1'; col.style.pointerEvents = 'auto';
      document.getElementById('explorerBlock').style.marginRight = 'calc(min(42%, 560px) + 10px)';

      var visible = Array.from(document.querySelectorAll('#issueCardsBody .issue-card')).filter(function(c){return c.style.display!=='none';});
      var pos = visible.indexOf(document.getElementById('card_'+idx));
      document.getElementById('detailCounter').textContent = (pos+1)+' of '+visible.length;

      var sev = (issue.severity||'').toLowerCase();
      var sevColor = sev==='error' ? 'var(--error)' : (sev==='warn'||sev==='warning') ? 'var(--warn)' : 'var(--info)';
      var sevLabel = sev==='warn' ? 'warn' : sev;

      var methodHtml = '';
      if (issue.method && issue.method !== 'GLOBAL') {
        var ms = getMethodStyle(issue.method);
        methodHtml = '<span style="display:inline-flex;align-items:center;height:18px;border-radius:4px;padding:0 7px;font-size:10px;font-weight:700;color:'+ms.color+';background:'+ms.bg+'">'+esc(issue.method)+'</span>';
      }

      var lineDisplay = issue.line > 0
        ? 'Line '+issue.line+(issue.range&&issue.range.end&&issue.range.end.line!=null&&(issue.range.end.line+1)!==issue.line ? '-'+(issue.range.end.line+1) : '')
        : 'No line info';

      var yamlHtml = '';
      if (issue.snippetLines && issue.snippetLines.length > 0) {
        var lines = issue.snippetLines.map(function(sl) {
          return '<div style="display:flex;background:'+(sl.highlight?'rgba(239,68,68,.14)':'transparent')+';padding:1px 0"><span style="flex:0 0 38px;text-align:right;padding-right:10px;border-right:1px solid var(--border);margin-right:10px;color:var(--fg-muted)">'+sl.lineNumber+'</span><span style="white-space:pre;color:var(--fg)">'+esc(sl.text)+'</span></div>';
        }).join('');
        yamlHtml = detailSection('Spec snippet','<div style="background:var(--bg-page);border:1px solid var(--border-med);border-radius:6px;overflow:auto;font-family:monospace;font-size:11.5px;max-height:220px">'+lines+'</div>',true);
      }

      var endpointHtml = (issue.endpoint && issue.endpoint !== 'global')
        ? detailSection('Endpoint','<div class="detail-value" style="display:inline-flex;align-items:center;gap:8px;font-family:monospace;font-size:11px">'+methodHtml+'<span>'+esc(issue.endpoint)+'</span></div>')
        : '';

      function detailSection(label, content, raw) {
        return '<div class="detail-section"><div class="detail-label">'+label+'</div>'+(raw ? content : '<div class="detail-value">'+content+'</div>')+'</div>';
      }

      var html =
        '<div class="rule-title">'+esc(issue.rule||'')+'</div>'
        +'<div><span class="sev-pill" style="color:'+sevColor+';background:'+sevColor+'2e;border:1px solid '+sevColor+'50"><span class="sev-dot" style="background:'+sevColor+'"></span>'+esc(sevLabel)+'</span></div>'
        +detailSection('Message','<div class="msg-box">'+esc(issue.message||'')+'</div>',true)
        +(issue.description ? detailSection('Description',esc(issue.description)) : '')
        +(issue.fixSuggestion ? detailSection('Suggestion','<div class="suggestion-box">'+esc(issue.fixSuggestion)+'</div>',true) : '')
        +endpointHtml
        +detailSection('Path','<span style="font-family:monospace;font-size:11px;word-break:break-all">'+esc(issue.displayPath||'')+'</span>')
        +detailSection('Location','<span style="font-family:monospace;font-size:11px">'+esc(lineDisplay)+'</span>')
        +yamlHtml;

      document.getElementById('detailBody').innerHTML = html;
    };

    window.closeDetail = function() {
      selectedIdx = null;
      var col = document.getElementById('detailColumn');
      col.style.transform = 'translateX(102%)'; col.style.opacity = '0'; col.style.pointerEvents = 'none';
      document.getElementById('explorerBlock').style.marginRight = '0';
      document.querySelectorAll('#issueCardsBody .issue-card').forEach(function(c){ c.style.background = 'var(--bg-card)'; });
    };

    function detailSection(label, content, raw) {
      return '<div class="detail-section"><div class="detail-label">'+label+'</div>'+(raw ? content : '<div class="detail-value">'+content+'</div>')+'</div>';
    }
  })();
  </script>
</div>`;
}

// ── Theme toggle button ───────────────────────────────────────────────────────

function renderTopBar(report) {
  const generatedAt = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const score = Math.max(0, Math.min(100, Math.round((report.overview && report.overview.score) || 0)));
  const ringColor = scoreColor(score);

  return `<div class="topbar">
  <div class="topbar-left">
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
      <rect width="32" height="32" rx="7" fill="#7C3AED"/>
      <path d="M8 10h10M8 16h16M8 22h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
    </svg>
    <span class="topbar-brand">API Governance</span>
    <span class="topbar-divider">·</span>
    <span class="topbar-title">${escapeHtml(report.title || 'API Governance Report')}</span>
  </div>
  <div class="topbar-right">
    <span class="topbar-score-pill" style="color:${ringColor};background:${ringColor}1e;border:1px solid ${ringColor}44">${score}%</span>
    <span class="topbar-meta">Generated ${escapeHtml(generatedAt)}</span>
    <button id="themeToggle" onclick="toggleTheme()" title="Toggle light/dark theme" class="theme-btn">🌙</button>
  </div>
</div>
<script>
(function(){
  function getTheme(){return localStorage.getItem('report-theme')||'auto';}
  function applyTheme(t){
    var root=document.documentElement;
    root.classList.remove('theme-dark','theme-light');
    if(t==='dark'){root.classList.add('theme-dark');}
    else if(t==='light'){root.classList.add('theme-light');}
    var btn=document.getElementById('themeToggle');
    if(btn) btn.textContent = t==='dark'?'☀️':t==='light'?'🌙':'🌓';
  }
  window.toggleTheme=function(){
    var cur=getTheme();
    var next=cur==='dark'?'light':cur==='light'?'auto':'dark';
    localStorage.setItem('report-theme',next);
    applyTheme(next);
  };
  applyTheme(getTheme());
})();
</script>`;
}

// ── Main entry point ──────────────────────────────────────────────────────────

function generateHtmlReport(reportOrInput, options) {
  options = options || {};
  const specContent = options.specContent || '';
  const specLines = specContent ? specContent.split('\n') : [];

  const report = toUnifiedReport(reportOrInput);
  if (!report) return '<p>Invalid report data.</p>';

  const topBarHtml    = renderTopBar(report);
  const overviewHtml  = renderOverview(report);
  const breakdownHtml = renderBreakdown(report);
  const explorerHtml  = renderIssueExplorer(report, specLines);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(report.title || 'API Governance Report')}</title>
<style>
${CSS_THEMES}

*,*::before,*::after{box-sizing:border-box}
body{
  margin:0;padding:24px;
  background:var(--bg-page);
  color:var(--fg);
  font-family:"Inter","Segoe UI",system-ui,Arial,sans-serif;
  font-size:13px;line-height:1.5;
  transition:background .2s,color .2s;
}
a{color:var(--link);text-decoration:none}
a:hover{text-decoration:underline}
button,select,input{font-family:inherit}

/* Layout */
.page{max-width:1280px;margin:0 auto;display:flex;flex-direction:column;gap:24px}

/* Topbar */
.topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow-sm);gap:12px;flex-wrap:wrap}
.topbar-left{display:flex;align-items:center;gap:10px;min-width:0}
.topbar-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
.topbar-brand{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-dim);white-space:nowrap}
.topbar-divider{color:var(--border-med);font-size:16px;user-select:none}
.topbar-title{font-size:13px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topbar-score-pill{display:inline-flex;align-items:center;height:22px;padding:0 10px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.topbar-meta{font-size:11px;color:var(--fg-muted);white-space:nowrap;font-family:monospace}
.theme-btn{width:30px;height:30px;border-radius:7px;border:1px solid var(--border-med);background:var(--bg-card);color:var(--fg-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;transition:background .12s,border-color .12s}
.theme-btn:hover{background:var(--bg-hover);border-color:var(--focus)}

/* Overview */
.overview-row{
  background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;
  box-shadow:var(--shadow);padding:16px;
  display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:stretch;
}
.grade-card{padding:6px 2px;text-align:center;min-width:178px;display:flex;flex-direction:column;justify-content:center}
.grade-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--fg-dim);margin-bottom:6px}
.meta-block{display:flex;flex-direction:column;gap:12px}
.report-title{margin:0 0 4px;font-size:18px;font-weight:700;color:var(--fg);line-height:1.2;letter-spacing:-.01em}
.report-subtitle{font-size:13px;color:var(--fg-dim);line-height:1.35}
.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.metric-card{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;flex-direction:column;min-height:90px}
.metric-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--fg-dim);margin-bottom:4px}
.metric-desc{font-size:11px;line-height:1.25;color:var(--fg-dim);min-height:24px;margin-bottom:8px}
.metric-value-row{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:auto}
.metric-value{font-size:26px;font-weight:800;line-height:1;display:flex;align-items:baseline;gap:4px}
.view-link{font-size:11px;font-weight:600;color:var(--link);white-space:nowrap;margin-bottom:2px;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.view-link:hover{opacity:.8}
a[onclick]{cursor:pointer}
a[onclick]:hover{color:var(--fg)!important;border-color:var(--focus)!important;background:var(--bg-hover)!important;text-decoration:none!important}

/* Section */
.section{margin-bottom:4px}
.section-header{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:14px;margin-bottom:18px;border-bottom:2px solid var(--border)}
.section-title{font-size:16px;font-weight:700;color:var(--fg);letter-spacing:-.01em;line-height:1.2}
.section-subtitle{font-size:12px;color:var(--fg-dim);line-height:1.5;margin-top:4px}
.section-badge{font-size:13px;font-weight:600;color:var(--fg-dim);white-space:nowrap;flex-shrink:0}

/* Breakdown cards */
.cards-grid{display:grid;grid-template-columns:repeat(2,minmax(300px,1fr));gap:10px}
.breakdown-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-sm);overflow:hidden;transition:box-shadow .15s}
.breakdown-card:hover{box-shadow:var(--shadow)}

/* Issue Explorer */
.explorer-block{border:1px solid var(--border);border-radius:8px;background:var(--bg-page);overflow:hidden;display:flex;flex-direction:column;height:min(76vh,920px);min-height:520px;transition:margin-right 180ms ease}
.explorer-body{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;border-top:1px solid var(--border)}
.toolbar{border-bottom:1px solid var(--border);padding:10px 14px;display:flex;flex-direction:column;gap:6px;background:var(--bg-surface);flex-shrink:0}
.toolbar-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.toolbar-sep{width:1px;height:20px;background:var(--border);flex-shrink:0}

/* Chips */
.chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 11px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border-med);background:var(--bg-card);color:var(--fg-dim);transition:background .12s,color .12s,border-color .12s}
.chip:hover{background:var(--bg-hover);color:var(--fg);border-color:var(--focus)}
.chip-active{border-color:var(--focus)!important;background:var(--bg-hover)!important;color:var(--fg)!important}
.chip-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block}

/* Controls */
.ctrl-select{height:26px;border:1px solid var(--border-med);border-radius:6px;background:var(--bg-card);color:var(--fg);padding:0 8px;font-size:11px}
.search-wrap{position:relative;flex:1;min-width:160px}
.search-icon{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--fg-dim);pointer-events:none;display:flex;align-items:center}
.search-input{width:100%;height:30px;padding:0 10px 0 30px;border:1px solid var(--border-med);border-radius:7px;background:var(--bg-input);color:var(--fg);font-size:12px;outline:none}
.search-input:focus{border-color:var(--focus)}
.search-input::placeholder{color:var(--fg-muted)}
.active-filter-pill{display:inline-flex;align-items:center;height:22px;padding:0 9px;border:1px solid var(--focus);border-radius:999px;background:var(--bg-hover);color:var(--fg);font-size:10px;font-weight:700;letter-spacing:.02em;text-transform:uppercase}
.clear-filter-btn{margin-left:6px;font-size:11px;color:var(--link);background:none;border:none;cursor:pointer;padding:0}

/* Issue cards */
.issue-cards-body{flex:1;overflow-y:auto;padding:8px}
.issue-card{width:100%;border:1px solid var(--border);border-radius:8px;display:flex;flex-direction:column;padding:10px 12px;margin-bottom:7px;cursor:pointer;background:var(--bg-card);border-left-width:3px;box-shadow:var(--shadow-sm);transition:background .12s,box-shadow .12s}
.issue-card:hover{background:var(--bg-hover);box-shadow:var(--shadow)}
.table-footer{padding:6px 12px;font-size:11px;color:var(--fg-dim);border-top:1px solid var(--border);background:var(--bg-surface);flex-shrink:0}

/* Detail panel */
.detail-column{position:absolute;top:0;right:0;width:min(42%,560px);min-width:380px;height:min(76vh,920px);min-height:520px;overflow:hidden;display:flex;flex-direction:column;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;box-shadow:-8px 0 32px rgba(0,0,0,.25),var(--shadow);transform:translateX(102%);opacity:0;pointer-events:none;transition:transform 180ms ease,opacity 140ms ease;z-index:5}
.detail-header{background:var(--bg-card);border-bottom:1px solid var(--border);padding:11px 12px 11px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.detail-header-title{font-size:13px;font-weight:700;color:var(--fg);letter-spacing:.01em}
.close-btn{height:24px;min-width:24px;border:1px solid var(--border-med);border-radius:4px;background:transparent;color:var(--fg-dim);cursor:pointer;font-size:14px;line-height:1;padding:0}
.close-btn:hover{color:var(--fg);background:var(--bg-hover)}
.detail-body{padding:12px;display:flex;flex-direction:column;gap:9px;flex:1;overflow-y:auto}

/* Detail internals */
.rule-title{font-size:13px;font-weight:800;color:var(--fg);letter-spacing:-.02em;line-height:1.2}
.sev-pill{display:inline-flex;align-items:center;gap:6px;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.sev-dot{width:5px;height:5px;border-radius:50%;display:inline-block;flex-shrink:0}
.detail-section{display:flex;flex-direction:column;gap:4px}
.detail-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--fg-dim)}
.detail-value{font-size:12px;color:var(--fg);word-break:break-word;line-height:1.45;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);padding:7px 9px}
.msg-box{border:1px solid var(--border);border-radius:6px;padding:7px 9px;font-size:12px;background:var(--bg-card);color:var(--fg);line-height:1.45}
.suggestion-box{border:1px solid var(--pass)44;border-radius:6px;padding:8px 10px;font-size:12px;background:var(--pass)12;color:var(--pass);line-height:1.45}

@media(max-width:900px){
  .overview-row{grid-template-columns:1fr}
  .metrics-grid{grid-template-columns:repeat(2,1fr)}
  .cards-grid{grid-template-columns:1fr}
}

@media print{
  /* Reset to white background and black text for all themes */
  :root,.theme-dark,.theme-light{
    --bg-page:#fff;--bg-surface:#fff;--bg-card:#f7f8fa;--bg-card-2:#eef0f4;
    --border:rgba(0,0,0,0.15);--border-med:rgba(0,0,0,0.20);
    --fg:#111;--fg-dim:#444;--fg-muted:#777;
    --link:#1a56db;--shadow:none;--shadow-sm:none;
    --error:#b91c1c;--warn:#b45309;--info:#0369a1;--pass:#047857;
    --ring-track:rgba(0,0,0,0.12);
  }

  /* Hide interactive chrome */
  .topbar,#themeToggle,.filter-bar,.issue-detail-panel,
  button,input,select{display:none!important}

  /* Remove fixed positioning and overflow clipping */
  body,html{overflow:visible!important}
  .page{padding:0;max-width:100%}

  /* Reset any slide-in panel transforms */
  .list-panel{margin-right:0!important;transform:none!important}

  /* Prevent cards breaking across pages */
  .breakdown-card,.metric-card,.issue-row{break-inside:avoid;page-break-inside:avoid}

  /* Force page break before major sections */
  .breakdown-section,.explorer-section{break-before:page;page-break-before:page}

  /* Expand collapsed details */
  details{display:block!important}
  details>summary{display:none}

  /* Make links print their URL */
  a[href]::after{content:" (" attr(href) ")";font-size:10px;color:var(--fg-muted)}
  a[onclick]::after{content:none}

  /* Ensure code snippets are visible */
  .spec-snippet{border:1px solid var(--border);background:var(--bg-card)!important;color:var(--fg)!important}
  .spec-line-highlight{background:rgba(234,179,8,0.18)!important}
}
</style>
</head>
<body>
<div class="page">
  ${topBarHtml}
  ${overviewHtml}
  ${breakdownHtml}
  ${explorerHtml}
</div>
</body>
</html>`;
}

module.exports = { generateHtmlReport, buildHtmlReport: generateHtmlReport };
