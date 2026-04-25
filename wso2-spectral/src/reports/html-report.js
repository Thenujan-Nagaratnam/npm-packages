function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function toUnifiedReport(input) {
  if (!input || typeof input !== 'object') return null;
  if (input.report && typeof input.report === 'object') return input.report;
  if (input.reportId && input.overview && input.breakdown) return input;
  return null;
}

function normalizeIssueRows(report) {
  const map = report && report.violationsById && typeof report.violationsById === 'object'
    ? report.violationsById
    : {};
  return Object.values(map).map((item, index) => {
    const severity = item.severity || 'info';
    const path = item.displayPath || (Array.isArray(item.pathSegments) ? item.pathSegments.join(' > ') : 'Unknown path');
    return {
      id: item.id || `${item.rule || 'unknown'}:${index}`,
      rule: item.rule || 'unknown-rule',
      message: item.message || 'No message provided',
      severity,
      line: item.line || 0,
      endpoint: item.endpoint || 'global',
      method: item.method || 'GLOBAL',
      path,
      description: item.description || '',
      fixSuggestion: item.fixSuggestion || '',
      breakdownKeys: Array.isArray(item.breakdownKeys) ? item.breakdownKeys : [],
    };
  });
}

function buildHtmlReport(payload, metadata) {
  const report = toUnifiedReport(payload);
  if (!report) {
    throw new Error('buildHtmlReport expects a unified report payload (or an object containing report)');
  }

  const reportTitle = metadata && metadata.title ? metadata.title : (report.title || 'WSO2 Spectral Report');
  const generatedAt = metadata && metadata.generatedAt ? metadata.generatedAt : new Date().toISOString();
  const rows = normalizeIssueRows(report);
  const categories = report.breakdown && Array.isArray(report.breakdown.categories) ? report.breakdown.categories : [];

  const data = {
    report,
    rows,
    categories,
  };


  const scoreValue = report.overview && report.overview.score != null ? Number(report.overview.score) : 0;
  const grade = scoreValue >= 90 ? 'A' : scoreValue >= 75 ? 'B' : scoreValue >= 60 ? 'C' : scoreValue >= 40 ? 'D' : 'F';
  // Thresholds: A≥90 green, B≥75 blue, C≥60 amber, D≥40 orange, F<40 red
  // Must match the client-side scoreColor() function exactly.
  const gradeColor = scoreValue >= 90 ? '#10B981' : scoreValue >= 75 ? '#38BDF8' : scoreValue >= 60 ? '#EAB308' : scoreValue >= 40 ? '#F97316' : '#F43F5E';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:          #0C0C10;
      --surface:     #141418;
      --surface-2:   #1C1C24;
      --surface-3:   #22222C;
      --border:      #282836;
      --border-2:    #343448;
      --text:        #E8E8F2;
      --text-2:      #9090B0;
      --text-3:      #525268;
      --accent:      #7C3AED;
      --accent-lt:   #A78BFA;
      --accent-bg:   rgba(124,58,237,0.10);
      --success:     #10B981;
      --success-bg:  rgba(16,185,129,0.10);
      --warn:        #F59E0B;
      --warn-bg:     rgba(245,158,11,0.10);
      --danger:      #F43F5E;
      --danger-bg:   rgba(244,63,94,0.10);
      --info:        #38BDF8;
      --info-bg:     rgba(56,189,248,0.10);
      --hint:        #A855F7;
      --hint-bg:     rgba(168,85,247,0.10);
      --shadow:      0 4px 24px rgba(0,0,0,0.50);
      --shadow-sm:   0 2px 8px  rgba(0,0,0,0.35);
      --r:           10px;
      --r-sm:        6px;
    }

    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
    }

    /* ── Page shell ─────────────────────────────────────────── */
    .page { max-width: 1440px; margin: 0 auto; padding: 20px; }

    /* ── Top header bar ─────────────────────────────────────── */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r);
      margin-bottom: 18px;
      box-shadow: var(--shadow-sm);
    }
    .topbar-left { display: flex; align-items: center; gap: 10px; }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
      flex-shrink: 0;
    }
    .brand-name {
      font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; color: var(--text-2);
    }
    .topbar-divider { color: var(--border-2); font-size: 16px; user-select: none; }
    .topbar-label { font-size: 12px; color: var(--text-3); }
    .topbar-right { font-size: 11px; color: var(--text-3); font-family: ui-monospace, monospace; }

    /* ── Overview row ───────────────────────────────────────── */
    .overview {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 14px;
      margin-bottom: 18px;
      align-items: start;
    }

    .grade-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-top: 3px solid ${gradeColor};
      border-radius: var(--r);
      padding: 20px 24px;
      text-align: center;
      min-width: 136px;
      box-shadow: var(--shadow-sm);
    }
    .grade-label {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.12em; color: var(--text-3); margin-bottom: 8px;
    }
    .grade-letter {
      font-size: 58px; font-weight: 900; line-height: 1;
      color: ${gradeColor};
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .grade-score {
      margin-top: 6px; font-size: 13px; font-weight: 600; color: var(--text-2);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .metric-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 16px 18px;
      box-shadow: var(--shadow-sm);
    }
    .metric-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-3); margin-bottom: 10px;
    }
    .metric-value {
      font-size: 30px; font-weight: 800; color: var(--text); line-height: 1;
    }


    /* ── Section shell ──────────────────────────────────────── */
    .section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r);
      overflow: hidden;
      margin-bottom: 16px;
      box-shadow: var(--shadow-sm);
    }
    .section-header {
      display: flex; align-items: center; gap: 6px;
      padding: 11px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }
    .section-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.10em; color: var(--text-2);
    }

    /* ── Breakdown grid ─────────────────────────────────────── */
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      padding: 14px;
    }
    .bucket {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-left: 3px solid var(--warn);
      border-radius: var(--r-sm);
      padding: 12px 14px;
    }
    .bucket.pass { border-left-color: var(--success); }
    .bucket-id {
      font-size: 10px; font-family: ui-monospace, monospace;
      color: var(--text-3); margin-bottom: 3px;
    }
    .bucket-title {
      font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px;
    }
    .bucket-desc {
      font-size: 11px; color: var(--text-3); margin-bottom: 8px; line-height: 1.4;
    }
    .bucket-bar {
      height: 3px; background: var(--border-2); border-radius: 2px;
      margin-bottom: 8px; overflow: hidden;
    }
    .bucket-bar-fill { height: 100%; border-radius: 2px; background: var(--warn); }
    .bucket.pass .bucket-bar-fill { background: var(--success); }
    .bucket-footer {
      display: flex; justify-content: space-between; align-items: center; gap: 8px;
    }
    .bucket-stats { font-size: 11px; color: var(--text-3); }
    .link-btn {
      border: 1px solid var(--border-2); border-radius: 4px;
      background: transparent; color: var(--accent-lt);
      cursor: pointer; font-size: 11px; padding: 3px 9px;
      font-family: inherit; transition: background 0.12s, border-color 0.12s;
    }
    .link-btn:hover { background: var(--accent-bg); border-color: var(--accent-lt); }

    /* ── AI Readiness: summary strip ───────────────────────── */
    .ai-summary-strip {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 1px; background: var(--border);
      border-bottom: 1px solid var(--border);
    }
    .ai-strip-seg {
      background: var(--surface-2); padding: 10px 14px 10px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .ai-strip-top { display: flex; justify-content: space-between; align-items: baseline; }
    .ai-strip-name { font-size: 10px; color: var(--text-3); line-height: 1.3; }
    .ai-strip-pct { font-size: 15px; font-weight: 900; font-family: ui-monospace, monospace; flex-shrink: 0; }
    .ai-strip-bar { height: 3px; background: var(--border-2); border-radius: 2px; overflow: hidden; }
    .ai-strip-fill { height: 100%; border-radius: 2px; }

    /* ── AI Readiness accordion ─────────────────────────────── */
    .ai-accordion { display: flex; flex-direction: column; gap: 8px; padding: 14px; }
    .ai-dim { border: 1px solid var(--border); border-radius: var(--r-sm); overflow: hidden; background: var(--surface-2); }
    .ai-dim-header {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 14px 16px; cursor: pointer; user-select: none;
    }
    .ai-dim-header:hover { background: var(--surface-3); }
    .ai-dim-score { font-size: 22px; font-weight: 900; min-width: 58px; line-height: 1; padding-top: 2px; font-family: ui-monospace, monospace; flex-shrink: 0; }
    .ai-dim-meta { flex: 1; min-width: 0; }
    .ai-dim-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 3px; display: flex; align-items: center; gap: 7px; }
    .ai-dim-icon { display: flex; align-items: center; opacity: 0.7; flex-shrink: 0; }
    .ai-dim-desc { font-size: 12px; color: var(--text-3); margin-bottom: 8px; line-height: 1.4; }
    .ai-dim-tags { display: flex; gap: 5px; flex-wrap: wrap; }
    .ai-dim-tag {
      font-size: 11px; color: var(--text-2);
      border: 1px solid var(--border-2); border-radius: 4px;
      padding: 1px 8px 1px 6px; background: var(--surface);
      display: inline-flex; align-items: center; gap: 5px;
    }
    .ai-tag-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
    .ai-dim-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; padding-top: 2px; }
    .ai-dim-issue-count { font-size: 11px; color: var(--text-3); white-space: nowrap; }
    .ai-dim-chevron { display: flex; align-items: center; color: var(--text-3); transition: transform 0.18s ease; }
    .ai-dim-chevron.open { transform: rotate(90deg); }
    .ai-dim-body { border-top: 1px solid var(--border); padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 8px; }

    /* Why it matters — collapsible disclosure */
    .ai-why-details { }
    .ai-why-summary {
      font-size: 11px; font-weight: 600; color: var(--accent-lt);
      cursor: pointer; list-style: none; user-select: none;
      margin-bottom: 0; display: inline-flex; align-items: center; gap: 4px;
    }
    .ai-why-summary::-webkit-details-marker { display: none; }
    .ai-why-arrow { display: inline-block; transition: transform 0.15s; font-style: normal; }
    details[open] .ai-why-arrow { transform: rotate(90deg); }
    .ai-why {
      margin-top: 6px; font-size: 12px; color: var(--text-2); line-height: 1.65;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-sm); padding: 10px 14px;
    }

    /* Sub-bucket rows */
    .ai-sub { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 12px 14px; }
    .ai-sub-top { display: flex; align-items: baseline; margin-bottom: 2px; }
    .ai-sub-score { font-size: 16px; font-weight: 900; min-width: 52px; font-family: ui-monospace, monospace; flex-shrink: 0; }
    .ai-sub-name { font-size: 13px; font-weight: 700; color: var(--text); flex: 1; }
    .ai-sub-status { font-size: 12px; font-weight: 600; white-space: nowrap; }
    .ai-sub-status.passing { color: var(--success); }
    .ai-sub-status.issues  { color: var(--warn); }
    .ai-sub-desc { font-size: 11px; color: var(--text-3); margin: 2px 0 10px 52px; line-height: 1.4; }
    .ai-bar-row { display: flex; align-items: center; gap: 10px; }
    .ai-bar { flex: 1; height: 4px; background: var(--border-2); border-radius: 2px; overflow: hidden; }
    .ai-bar-fill { height: 100%; border-radius: 2px; }
    .ai-view-btn { font-size: 11px; color: var(--accent-lt); background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; white-space: nowrap; }
    .ai-view-btn:hover { text-decoration: underline; }
    @media (max-width: 900px) { .ai-summary-strip { grid-template-columns: repeat(2, 1fr); } }

    /* ── Issue Explorer toolbar ─────────────────────────────── */
    .toolbar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }
    .toolbar input, .toolbar select {
      height: 30px;
      border: 1px solid var(--border-2); border-radius: var(--r-sm);
      padding: 0 10px;
      background: var(--surface); color: var(--text);
      font-size: 12px; font-family: inherit; outline: none;
      transition: border-color 0.12s;
    }
    .toolbar input:focus, .toolbar select:focus { border-color: var(--accent-lt); }
    .toolbar input::placeholder { color: var(--text-3); }
    .toolbar select option { background: var(--surface-2); }
    .chip {
      border: 1px solid var(--border-2); border-radius: var(--r-sm);
      padding: 4px 11px; background: var(--surface);
      cursor: pointer; font-size: 11px; font-weight: 600;
      color: var(--text-2); font-family: inherit;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
    }
    .chip:hover { border-color: var(--accent-lt); color: var(--text); }
    .chip.active { background: var(--accent-bg); color: var(--accent-lt); border-color: var(--accent); }

    /* ── Issue list / detail pane ───────────────────────────── */
    .issues-layout {
      display: grid;
      grid-template-columns: 5fr 4fr;
      min-height: 520px;
    }
    .issue-list {
      border-right: 1px solid var(--border);
      overflow-y: auto;
      max-height: 620px;
    }
    .group-header {
      padding: 6px 14px;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-3);
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0;
    }
    .issue-btn {
      display: block; width: 100%; text-align: left;
      border: none; border-bottom: 1px solid var(--border);
      background: transparent;
      padding: 10px 12px 10px 15px;
      cursor: pointer; color: var(--text);
      border-left: 3px solid transparent;
      transition: background 0.10s;
      font-family: inherit;
    }
    .issue-btn:hover { background: var(--surface-2); }

    /* severity left-border colours */
    .issue-btn.sev-error { border-left-color: var(--danger); }
    .issue-btn.sev-warn  { border-left-color: var(--warn);   }
    .issue-btn.sev-info  { border-left-color: var(--info);   }
    .issue-btn.sev-hint  { border-left-color: var(--hint);   }

    /* active (selected) states */
    .issue-btn.active                { background: var(--accent-bg);  border-left-color: var(--accent-lt); }
    .issue-btn.active.sev-error      { background: var(--danger-bg);  border-left-color: var(--danger); }
    .issue-btn.active.sev-warn       { background: var(--warn-bg);    border-left-color: var(--warn);   }
    .issue-btn.active.sev-info       { background: var(--info-bg);    border-left-color: var(--info);   }
    .issue-btn.active.sev-hint       { background: var(--hint-bg);    border-left-color: var(--hint);   }

    .issue-msg {
      font-size: 12px; font-weight: 600; color: var(--text);
      margin-bottom: 3px;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .issue-path {
      font-size: 11px; color: var(--text-3);
      font-family: ui-monospace, monospace;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* ── Detail pane ────────────────────────────────────────── */
    .detail-pane {
      padding: 16px;
      overflow-y: auto;
      max-height: 620px;
    }
    .detail-empty {
      height: 100%; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: var(--text-3); font-size: 13px; gap: 6px; text-align: center;
    }
    .detail-empty-icon { font-size: 28px; opacity: 0.4; }

    .detail-title {
      font-size: 14px; font-weight: 700; color: var(--text);
      line-height: 1.4; margin-bottom: 10px;
    }
    .detail-sep {
      border: none; border-top: 1px solid var(--border); margin: 12px 0;
    }
    .dfield { margin-bottom: 10px; }
    .dfield-key {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.10em; color: var(--text-3); margin-bottom: 4px;
    }
    .dfield-val {
      font-size: 12px; color: var(--text); line-height: 1.5;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--r-sm); padding: 7px 10px;
    }
    .dfield-val code {
      font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px;
    }
    .fix-block {
      background: rgba(16,185,129,0.07);
      border: 1px solid rgba(16,185,129,0.22);
      border-radius: var(--r-sm); padding: 10px 12px; margin-bottom: 10px;
    }
    .fix-block .dfield-key { color: var(--success); }
    .fix-block .dfield-val {
      background: transparent; border: none; padding: 4px 0 0; color: #a7f3d0;
    }

    /* ── Severity badges ────────────────────────────────────── */
    .badge {
      display: inline-flex; align-items: center; gap: 5px;
      border-radius: 4px; padding: 2px 8px;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge::before {
      content: ''; width: 5px; height: 5px; border-radius: 50%;
      background: currentColor; flex-shrink: 0;
    }
    .badge.error { color: var(--danger); background: var(--danger-bg); border: 1px solid rgba(244,63,94,0.30); }
    .badge.warn  { color: var(--warn);   background: var(--warn-bg);   border: 1px solid rgba(245,158,11,0.30); }
    .badge.info  { color: var(--info);   background: var(--info-bg);   border: 1px solid rgba(56,189,248,0.30); }
    .badge.hint  { color: var(--hint);   background: var(--hint-bg);   border: 1px solid rgba(168,85,247,0.30); }

    /* ── Responsive ─────────────────────────────────────────── */
    @media (max-width: 1100px) {
      .overview            { grid-template-columns: 1fr; }
      .metrics-grid        { grid-template-columns: repeat(2, 1fr); }
      .issues-layout       { grid-template-columns: 1fr; }
      .issue-list          { border-right: none; border-bottom: 1px solid var(--border); max-height: 320px; }
      .breakdown-grid      { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      .page                { padding: 12px; }
      .overview            { grid-template-columns: 1fr; }
      .metrics-grid        { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Top bar -->
    <div class="topbar">
      <div class="topbar-left">
        <span class="status-dot"></span>
        <span class="brand-name">WSO2 Spectral</span>
        <span class="topbar-divider">|</span>
        <span class="topbar-label">Governance &amp; Security Report</span>
      </div>
      <span class="topbar-right">report&nbsp;${escapeHtml(report.reportId || 'n/a')}</span>
    </div>

    <!-- Overview -->
    <div class="overview">
      <div class="grade-card">
        <div class="grade-label">API Score</div>
        <div class="grade-letter">${escapeHtml(grade)}</div>
        <div class="grade-score">${escapeHtml(String(scoreValue))}&thinsp;/&thinsp;100</div>
      </div>
      <div>
        <h1 style="font-size:22px;font-weight:800;color:var(--text);line-height:1.2;margin-bottom:4px;">${escapeHtml(reportTitle)}</h1>
        <div style="font-size:11px;color:var(--text-3);margin-bottom:14px;">Generated&nbsp;${escapeHtml(generatedAt)}</div>
        <div class="metrics-grid">
          <div class="metric-card" style="border-top:3px solid ${gradeColor};">
            <div class="metric-label">Score</div>
            <div class="metric-value" style="color:${gradeColor};">${escapeHtml(String(report.overview && report.overview.score != null ? report.overview.score : 0))}<span style="font-size:14px;font-weight:600;color:var(--text-3);margin-left:4px;">/100</span></div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Passed Checks</div>
            <div class="metric-value" style="color:var(--success);">${escapeHtml(String(report.overview && report.overview.passedChecks != null ? report.overview.passedChecks : 0))}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Checks</div>
            <div class="metric-value">${escapeHtml(String(report.overview && report.overview.totalChecks != null ? report.overview.totalChecks : 0))}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Issues</div>
            <div class="metric-value" style="color:${rows.length > 0 ? 'var(--danger)' : 'var(--success)'};">${escapeHtml(String(rows.length))}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Breakdown -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">${escapeHtml(report.breakdown && report.breakdown.title ? report.breakdown.title : 'Breakdown')}</span>
      </div>
      <div id="breakdown" class="breakdown-grid"></div>
    </div>

    <!-- Issue Explorer -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">Issue Explorer</span>
      </div>
      <div class="toolbar">
        <button class="chip active" data-sev="all"   id="sev-all">All</button>
        <button class="chip"        data-sev="error" id="sev-error">Errors</button>
        <button class="chip"        data-sev="warn"  id="sev-warn">Warnings</button>
        <select id="groupBy">
          <option value="none">No grouping</option>
          <option value="rule">Group by rule</option>
          <option value="endpoint">Group by endpoint</option>
        </select>
        <select id="breakdownFilter"><option value="">All categories</option></select>
        <input id="search" type="text" placeholder="Search rules, messages, paths…" style="flex:1;min-width:180px;" />
      </div>
      <div class="issues-layout">
        <div class="issue-list" id="issueList"></div>
        <div class="detail-pane" id="detailPane">
          <div class="detail-empty">
            <div class="detail-empty-icon">&#9741;</div>
            <div>Select an issue to view details</div>
          </div>
        </div>
      </div>
    </div>

  </div>
  <script>
    const DATA = ${serializeForScript(data)};
    const state = { severity: 'all', search: '', groupBy: 'none', breakdownKey: '', selectedId: null };

    const byId = new Map(DATA.rows.map((row) => [row.id, row]));

    function scoreColor(pct) {
      if (pct >= 90) return '#10B981';
      if (pct >= 75) return '#38BDF8';
      if (pct >= 60) return '#EAB308';
      if (pct >= 40) return '#F97316';
      return '#F43F5E';
    }

    function esc(v) {
      return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function field(key, val) {
      return '<div class="dfield"><div class="dfield-key">' + key + '</div><div class="dfield-val">' + val + '</div></div>';
    }

    function filteredRows() {
      const q = state.search.trim().toLowerCase();
      return DATA.rows.filter((row) => {
        if (state.severity !== 'all' && row.severity !== state.severity) return false;
        if (state.breakdownKey && !(row.breakdownKeys || []).includes(state.breakdownKey)) return false;
        if (!q) return true;
        return (row.rule + ' ' + row.message + ' ' + row.path + ' ' + row.endpoint).toLowerCase().includes(q);
      });
    }

    function grouped(rows) {
      if (state.groupBy === 'none') return [{ key: 'All issues', rows }];
      const m = new Map();
      for (const row of rows) {
        const key = state.groupBy === 'rule' ? row.rule : (row.method + ' ' + row.endpoint);
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(row);
      }
      return Array.from(m.entries()).map(([key, groupRows]) => ({ key, rows: groupRows }));
    }

    function renderBreakdown() {
      const container = document.getElementById('breakdown');
      if (!container) return;
      if (!Array.isArray(DATA.categories) || DATA.categories.length === 0) {
        container.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:var(--text-3);">No category breakdown available for this report.</div>';
        return;
      }

      // AI Readiness: accordion with dimensions + sub-buckets
      const hasDimensions = DATA.categories.some((c) => Array.isArray(c.subBuckets));
      if (hasDimensions) {
        container.className = '';

        // Inline SVG icons per dimension
        const dimIcons = {
          discovery:  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
          contract:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
          resilience: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>',
          security:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        };
        const chevronSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

        // ── 1. Summary strip ──────────────────────────────────────
        const stripHtml = '<div class="ai-summary-strip">' + DATA.categories.map((dim) => {
          const pct   = Number(dim.passPercentage != null ? dim.passPercentage : (dim.status === 'passed' ? 100 : 0));
          const color = scoreColor(pct);
          return '<div class="ai-strip-seg">' +
            '<div class="ai-strip-top">' +
              '<span class="ai-strip-name">' + esc(dim.label) + '</span>' +
              '<span class="ai-strip-pct" style="color:' + color + ';">' + pct + '%</span>' +
            '</div>' +
            '<div class="ai-strip-bar"><div class="ai-strip-fill" style="width:' + pct + '%;background:' + color + ';"></div></div>' +
          '</div>';
        }).join('') + '</div>';

        // ── 2. Accordion ──────────────────────────────────────────
        const accordionHtml = '<div class="ai-accordion">' + DATA.categories.map((dim, dimIdx) => {
          const pct   = Number(dim.passPercentage != null ? dim.passPercentage : (dim.status === 'passed' ? 100 : 0));
          const color = scoreColor(pct);
          const icon  = dimIcons[dim.id] || dimIcons.security;
          const isOpen = dimIdx === 0;

          // Sort sub-buckets: failing first, then ascending passPercentage
          const sortedBuckets = (dim.subBuckets || []).slice().sort((a, b) => {
            const aFail = a.status !== 'passed' ? 0 : 1;
            const bFail = b.status !== 'passed' ? 0 : 1;
            if (aFail !== bFail) return aFail - bFail;
            const aPct = Number(a.passPercentage != null ? a.passPercentage : (a.status === 'passed' ? 100 : 0));
            const bPct = Number(b.passPercentage != null ? b.passPercentage : (b.status === 'passed' ? 100 : 0));
            return aPct - bPct;
          });

          // Tags with colored dots (use original order for tags display)
          const tags = sortedBuckets.map((s) => {
            const sPct     = Number(s.passPercentage != null ? s.passPercentage : (s.status === 'passed' ? 100 : 0));
            const dotColor = s.status === 'passed' ? '#10B981' : scoreColor(sPct);
            return '<span class="ai-dim-tag"><span class="ai-tag-dot" style="background:' + dotColor + ';"></span>' + esc(s.label) + '</span>';
          }).join('');

          // Issue count summary for collapsed header
          const totalIssues = (dim.subBuckets || []).reduce((sum, s) => sum + (Number(s.total) || 0), 0);
          const issueLabel  = totalIssues > 0 ? (totalIssues + ' issue' + (totalIssues !== 1 ? 's' : '')) : 'All passing';

          // Sub-bucket rows
          const subRows = sortedBuckets.map((sub) => {
            const subPct   = Number(sub.passPercentage != null ? sub.passPercentage : (sub.status === 'passed' ? 100 : 0));
            const subColor = scoreColor(subPct);
            const subKey   = esc(sub.viewIssuesFilter && sub.viewIssuesFilter.key || '');
            const statusHtml = sub.status === 'passed'
              ? '<span class="ai-sub-status passing">&#10003; passing</span>'
              : '<span class="ai-sub-status issues">' + esc(sub.total) + ' issue' + (sub.total !== 1 ? 's' : '') + '</span>';
            const viewBtn = sub.status !== 'passed'
              ? '<button class="link-btn" data-cat="' + subKey + '">View issues</button>'
              : '';
            return '<div class="ai-sub">' +
              '<div class="ai-sub-top">' +
                '<span class="ai-sub-score" style="color:' + subColor + ';">' + subPct + '%</span>' +
                '<span class="ai-sub-name">' + esc(sub.label) + '</span>' +
                statusHtml +
              '</div>' +
              '<div class="ai-sub-desc">' + esc(sub.description) + '</div>' +
              '<div class="ai-bar-row">' +
                '<div class="ai-bar"><div class="ai-bar-fill" style="width:' + subPct + '%;background:' + subColor + ';"></div></div>' +
                viewBtn +
              '</div>' +
            '</div>';
          }).join('');

          // "Why this matters" as collapsible <details>
          const whyHtml = dim.whyItMatters
            ? '<details class="ai-why-details"><summary class="ai-why-summary"><i class="ai-why-arrow">&#8250;</i> Why this matters</summary><div class="ai-why">' + esc(dim.whyItMatters) + '</div></details>'
            : '';

          return '<div class="ai-dim" data-dim-id="' + esc(dim.id) + '">' +
            '<div class="ai-dim-header" data-toggle="' + esc(dim.id) + '">' +
              '<span class="ai-dim-score" style="color:' + color + ';">' + pct + '%</span>' +
              '<div class="ai-dim-meta">' +
                '<div class="ai-dim-title"><span class="ai-dim-icon" style="color:' + color + ';">' + icon + '</span>' + esc(dim.label) + '</div>' +
                '<div class="ai-dim-desc">' + esc(dim.description) + '</div>' +
                '<div class="ai-dim-tags">' + tags + '</div>' +
              '</div>' +
              '<div class="ai-dim-right">' +
                '<span class="ai-dim-issue-count">' + esc(issueLabel) + '</span>' +
                '<span class="ai-dim-chevron' + (isOpen ? ' open' : '') + '" data-chevron="' + esc(dim.id) + '">' + chevronSvg + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="ai-dim-body" id="dim-body-' + esc(dim.id) + '"' + (isOpen ? '' : ' style="display:none;"') + '>' +
              whyHtml +
              subRows +
            '</div>' +
          '</div>';
        }).join('') + '</div>';

        container.innerHTML = stripHtml + accordionHtml;

        // Accordion toggle — rotate chevron
        container.querySelectorAll('[data-toggle]').forEach((hdr) => {
          hdr.addEventListener('click', (e) => {
            // Prevent <details> clicks from bubbling into the accordion toggle
            if (e.target.closest('details')) return;
            const id      = hdr.getAttribute('data-toggle');
            const body    = document.getElementById('dim-body-' + id);
            const chevron = container.querySelector('[data-chevron="' + id + '"]');
            if (!body) return;
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : '';
            if (chevron) chevron.classList.toggle('open', !open);
          });
        });
      } else {
        // OWASP / REST: flat bucket cards
        container.className = 'breakdown-grid';
        container.innerHTML = DATA.categories.map((cat) => {
          const total  = Number(cat.total || 0);
          const passed = total === 0;
          const pct    = Math.min(Number(cat.percentage || 0), 100);
          const barW   = passed ? 100 : pct;
          const catKey = esc(cat.viewIssuesFilter && cat.viewIssuesFilter.key || '');
          const btn    = passed ? '' : '<button class="link-btn" data-cat="' + catKey + '">View issues</button>';
          return '<div class="bucket ' + (passed ? 'pass' : '') + '">' +
            '<div class="bucket-id">' + esc(cat.id || '') + '</div>' +
            '<div class="bucket-title">' + esc(cat.label || '') + '</div>' +
            (cat.description ? '<div class="bucket-desc">' + esc(cat.description) + '</div>' : '') +
            '<div class="bucket-bar"><div class="bucket-bar-fill" style="width:' + barW + '%"></div></div>' +
            '<div class="bucket-footer">' +
              '<span class="bucket-stats">' + esc(total) + ' issue' + (total !== 1 ? 's' : '') + ' &bull; ' + esc(pct) + '%</span>' +
              btn +
            '</div>' +
          '</div>';
        }).join('');
      }

      container.querySelectorAll('[data-cat]').forEach((el) => {
        el.addEventListener('click', () => {
          state.breakdownKey = el.getAttribute('data-cat') || '';
          const select = document.getElementById('breakdownFilter');
          if (select) select.value = state.breakdownKey;
          renderIssues();
        });
      });
    }

    function renderIssues() {
      const rows = filteredRows();
      if (!state.selectedId || !byId.has(state.selectedId) || !rows.find((r) => r.id === state.selectedId)) {
        state.selectedId = rows.length > 0 ? rows[0].id : null;
      }

      const list   = document.getElementById('issueList');
      const detail = document.getElementById('detailPane');
      if (!list || !detail) return;

      const groups = grouped(rows);
      list.innerHTML = groups.map((group) => {
        const items = group.rows.map((row) =>
          '<button class="issue-btn sev-' + esc(row.severity) + ' ' + (state.selectedId === row.id ? 'active' : '') + '" data-id="' + esc(row.id) + '">' +
            '<div class="issue-msg">' + esc(row.message) + '</div>' +
            '<div class="issue-path">' + esc(row.path) + '</div>' +
          '</button>'
        ).join('');
        return '<div>' +
          (state.groupBy === 'none' ? '' : '<div class="group-header">' + esc(group.key) + ' <span style="opacity:.55;">(' + group.rows.length + ')</span></div>') +
          items +
        '</div>';
      }).join('') || '<div style="padding:16px;font-size:12px;color:var(--text-3);">No issues match your filters.</div>';

      list.querySelectorAll('[data-id]').forEach((el) => {
        el.addEventListener('click', () => {
          state.selectedId = el.getAttribute('data-id');
          renderIssues();
        });
      });

      const sel = state.selectedId ? byId.get(state.selectedId) : null;
      if (!sel) {
        detail.innerHTML = '<div class="detail-empty"><div class="detail-empty-icon">&#9741;</div><div>Select an issue to view details</div></div>';
        return;
      }

      detail.innerHTML =
        '<div class="detail-title">' + esc(sel.message) + '</div>' +
        '<span class="badge ' + esc(sel.severity) + '">' + esc(sel.severity) + '</span>' +
        '<hr class="detail-sep" />' +
        field('Rule', '<code>' + esc(sel.rule) + '</code>') +
        field('Endpoint', '<code>' + esc(sel.method + ' ' + sel.endpoint) + '</code>') +
        field('Path', '<code>' + esc(sel.path) + '</code>') +
        (sel.description ? field('Description', esc(sel.description)) : '') +
        (sel.fixSuggestion
          ? '<div class="fix-block"><div class="dfield-key">&#10003;&nbsp; Fix Suggestion</div><div class="dfield-val">' + esc(sel.fixSuggestion) + '</div></div>'
          : '');
    }

    function bindControls() {
      const filter = document.getElementById('breakdownFilter');
      if (filter) {
        const hasDimensions = Array.isArray(DATA.categories) && DATA.categories.some((c) => Array.isArray(c.subBuckets));
        const flatOptions = hasDimensions
          ? DATA.categories.flatMap((dim) => (dim.subBuckets || []).map((sub) => ({
              key: sub.viewIssuesFilter && sub.viewIssuesFilter.key || '',
              label: dim.label + ' › ' + sub.label,
            })))
          : (Array.isArray(DATA.categories) ? DATA.categories : []).map((cat) => ({
              key: cat.viewIssuesFilter && cat.viewIssuesFilter.key || '',
              label: cat.label || cat.id || '',
            }));
        const opts = ['<option value="">All categories</option>'].concat(
          flatOptions.map((o) => '<option value="' + esc(o.key) + '">' + esc(o.label) + '</option>')
        );
        filter.innerHTML = opts.join('');
        filter.addEventListener('change', (e) => { state.breakdownKey = e.target.value || ''; renderIssues(); });
      }

      ['all', 'error', 'warn'].forEach((sev) => {
        const el = document.getElementById('sev-' + sev);
        if (!el) return;
        el.addEventListener('click', () => {
          state.severity = sev;
          document.querySelectorAll('[data-sev]').forEach((btn) => btn.classList.remove('active'));
          el.classList.add('active');
          renderIssues();
        });
      });

      const search = document.getElementById('search');
      if (search) search.addEventListener('input', (e) => { state.search = e.target.value || ''; renderIssues(); });
      const groupBy = document.getElementById('groupBy');
      if (groupBy) groupBy.addEventListener('change', (e) => { state.groupBy = e.target.value || 'none'; renderIssues(); });
    }

    bindControls();
    renderBreakdown();
    renderIssues();
  </script>
</body>
</html>`;
}

module.exports = {
  buildHtmlReport,
};
