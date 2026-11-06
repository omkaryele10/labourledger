import { CONFIG } from './config.js';
import {
  STATES,
  INDUSTRIES,
  QUESTIONS,
  CATEGORIES,
  calculateWageImpact,
  getApplicability,
  scoreAssessment,
  buildAuditSummary,
  buildActionPlan,
  riskLabel,
  riskClass,
  formatINR,
  formatINRShort,
  formatDate,
  stateNote,
  industryLabel,
  todayISO,
} from './engine.js';
import {
  loadState,
  saveState,
  loadLicense,
  saveLicense,
  createAudit,
  sampleAudit,
  duplicateAudit,
  sortAudits,
  auditDisplayName,
  exportState,
  importState,
  freshState,
  normalizeAudit,
  DEFAULT_DISCLAIMER,
} from './store.js';
import {
  isValidKey,
  formatKey,
  startTrial,
  getLicenseState,
  verifyGumroadLicense,
} from './license.js';
import { generateAuditPdf } from './pdf.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ESC[char]);
const attr = (value) => esc(value).replace(/`/g, '&#96;');

let state = loadState();
let licenseData = loadLicense();
let licenseState = getLicenseState({ key: licenseData.key, trialExpiry: licenseData.trialExpiry });
let view = 'dashboard';
let activeId = null;
let step = 1;
let settingsTab = 'firm';
let search = '';
let saveTimer = null;
let confirmCallback = null;
let pendingSeed = null;
let pendingSample = false;
let pendingUpgrade = false;

const appMain = $('#appMain');
const modalRoot = $('#modalRoot');
const toastRoot = $('#toastRoot');
const appShell = $('#appShell');

const isPro = () => licenseState.pro;
const freeLeft = () => Math.max(0, CONFIG.freeAudits - state.audits.length);
const activeAudit = () => state.audits.find((a) => a.id === activeId) || null;
const firm = () => state.settings.firm || {};
const reviewer = () => state.settings.reviewer || {};

function initials(name) {
  const stop = new Set(['&', 'and', 'pvt', 'ltd', 'llp', 'inc', 'co', 'company', 'the', 'of']);
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter((p) => {
      const key = p.toLowerCase().replace(/[^a-z]/g, '');
      return key && !stop.has(key);
    });
  if (!parts.length) return 'LL';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function planLabel() {
  if (isPro() && licenseState.plan === 'pro') return 'Firm licence';
  if (licenseState.plan === 'trial') return `Trial · ${licenseState.daysLeft}d`;
  return 'Free pilot';
}

function planNote() {
  if (isPro() && licenseState.plan === 'pro') return 'Unlimited audits';
  if (licenseState.plan === 'trial') return 'Full access during trial';
  return `${freeLeft()} of ${CONFIG.freeAudits} audits left`;
}

function statusLabel(status) {
  return { draft: 'Draft', 'in-review': 'In review', final: 'Final' }[status] || 'Draft';
}

function setPath(obj, path, value) {
  const parts = String(path).split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cursor = cursor[parts[i]];
    if (!cursor || typeof cursor !== 'object') return;
  }
  cursor[parts[parts.length - 1]] = value;
}

function getPath(obj, path) {
  return String(path).split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function readValue(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number') {
    const n = parseFloat(el.value);
    return Number.isFinite(n) ? n : 0;
  }
  return el.value;
}

function persist() {
  state.activeAuditId = view === 'editor' ? activeId : null;
  state.settings.nextNumber = Math.max(1, Number(state.settings.nextNumber) || 1);
  state.settings.auditPrefix = state.settings.auditPrefix || 'LLA';
  const ok = saveState(state);
  if (!ok) toast('Storage is blocked in this browser. Export a backup from Settings.', 'error');
  return ok;
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    persist();
    const save = $('#saveState');
    if (save) save.textContent = 'Saved';
  }, 240);
}

function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`.trim();
  el.textContent = message;
  toastRoot.appendChild(el);
  window.setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    window.setTimeout(() => el.remove(), 220);
  }, 3400);
}

function openModal(html, { wide = false } = {}) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" style="${wide ? 'width:min(100%,760px)' : ''}" role="dialog" aria-modal="true" data-modal-panel>
        ${html}
      </div>
    </div>`;
  const first = modalRoot.querySelector('input, select, textarea, button');
  if (first) window.setTimeout(() => first.focus(), 30);
}

function closeModal() {
  modalRoot.innerHTML = '';
  confirmCallback = null;
}

function confirmDialog(title, message, label, callback) {
  confirmCallback = callback;
  openModal(`
    <div class="modal-header">
      <div>
        <h3 style="font-size:19px;">${esc(title)}</h3>
        <p class="muted small" style="margin-top:6px; line-height:1.55;">${esc(message)}</p>
      </div>
      <button class="modal-close" data-action="close-modal" type="button" aria-label="Close">×</button>
    </div>
    <div class="modal-footer" style="padding-top:20px;">
      <button class="btn btn-ghost btn-sm" data-action="close-modal" type="button">Cancel</button>
      <button class="btn btn-danger btn-sm" data-action="confirm-yes" type="button">${esc(label)}</button>
    </div>`);
}

function syncUrl() {
  const params = new URLSearchParams();
  if (view === 'editor' && activeId) {
    params.set('view', 'editor');
    params.set('id', activeId);
  } else if (view === 'settings') {
    params.set('view', 'settings');
    params.set('tab', settingsTab);
  }
  const query = params.toString();
  history.replaceState({}, '', `${location.pathname}${query ? `?${query}` : ''}`);
}

function navigate(next, options = {}) {
  view = next;
  if (next === 'editor') {
    activeId = options.id || activeId;
    step = options.step || 1;
  }
  if (next === 'settings') {
    settingsTab = options.tab || settingsTab || 'firm';
  }
  render();
  syncUrl();
  window.scrollTo({ top: 0, behavior: 'instant' });
  closeMenu();
}

function render() {
  renderShell();
  if (view === 'editor' && activeAudit()) renderEditor();
  else if (view === 'settings') renderSettings();
  else renderDashboard();
}

function renderShell() {
  const f = firm();
  const plan = planLabel();
  $('#navAuditCount').textContent = String(state.audits.length);
  $('#sidebarPlan').textContent = plan;
  $('#sidebarPlanNote').textContent = planNote();
  $('#topbarPlan').textContent = plan;
  $('#topbarPlan').className = `badge ${isPro() ? 'badge-sage' : 'badge-brass'}`;
  $('#sidebarFirm').textContent = f.name || 'Add your firm';
  $('#sidebarRole').textContent = f.partner || 'CA / HR practice';
  const avatar = $('#sidebarAvatar');
  if (isPro() && f.logo) {
    avatar.innerHTML = `<img src="${attr(f.logo)}" alt="">`;
    avatar.style.background = '#fff';
  } else {
    avatar.textContent = initials(f.name);
    avatar.style.background = '';
  }
  $$('.nav-item[data-nav]').forEach((el) => {
    el.classList.toggle('active', el.dataset.nav === (view === 'editor' ? 'audits' : view));
  });
  const kicker = view === 'editor' ? 'Client audit' : view === 'settings' ? 'Workspace' : 'Workspace';
  const title = view === 'editor' ? (activeAudit()?.client?.name || 'New audit') : view === 'settings' ? 'Settings' : 'Client audits';
  $('#topbarKicker').textContent = kicker;
  $('#topbarTitle').textContent = title;
}

function openMenu() {
  appShell.classList.add('sidebar-open');
}

function closeMenu() {
  appShell.classList.remove('sidebar-open');
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */

function renderDashboard() {
  const audits = sortAudits(state.audits);
  const summaries = audits.map((audit) => ({ audit, summary: buildAuditSummary(audit) }));
  const count = audits.length;
  const highRisk = summaries.filter((x) => x.summary.assessment.risk === 'high').length;
  const scored = summaries.filter((x) => x.summary.assessment.completion >= 80);
  const avg = scored.length ? Math.round(scored.reduce((sum, x) => sum + x.summary.assessment.overall, 0) / scored.length) : 0;
  const totalImpact = summaries.reduce((sum, x) => sum + x.summary.wage.annualEmployerImpact, 0);
  const setupNeeded = !firm().name || !reviewer().name;

  const rows = summaries.length
    ? summaries.map(({ audit, summary }) => {
        const name = auditDisplayName(audit);
        const score = Math.round(summary.assessment.overall);
        return `<div class="audit-row" data-open-audit="${attr(audit.id)}" tabindex="0" role="button" aria-label="Open audit for ${attr(name)}">
          <div class="audit-client">
            <span class="audit-avatar">${esc(initials(name))}</span>
            <div class="audit-client-text">
              <div class="audit-client-name">${esc(name)}</div>
              <div class="audit-client-meta">${esc(audit.number)} · ${esc(industryLabel(audit.client.industry))}</div>
            </div>
          </div>
          <div class="audit-state">${esc(audit.client.state)}</div>
          <div class="audit-headcount">${esc(audit.client.employees)} emp</div>
          <div class="audit-score">
            <span class="score-mini" style="--score:${score}"></span>
            <span>${summary.assessment.completion >= 80 ? `${score}/100` : '—'}</span>
          </div>
          <div class="audit-wage">${esc(formatINRShort(summary.wage.annualEmployerImpact))}</div>
          <div><span class="badge ${summary.assessment.risk === 'high' ? 'risk-high' : summary.assessment.risk === 'medium' ? 'risk-medium' : summary.assessment.risk === 'low' ? 'risk-low' : 'risk-review'}">${esc(riskLabel(summary.assessment.risk))}</span></div>
          <div class="audit-actions">
            <button class="row-action" data-action="duplicate-audit" data-id="${attr(audit.id)}" type="button" title="Duplicate" aria-label="Duplicate audit">
              <svg viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" stroke-width="1.4"/></svg>
            </button>
            <button class="row-action" data-action="delete-audit" data-id="${attr(audit.id)}" type="button" title="Delete" aria-label="Delete audit">
              <svg viewBox="0 0 16 16" fill="none"><path d="M2.5 4h11M6 2h4M4 4l.7 9.2A1.5 1.5 0 0 0 6.2 14h3.6a1.5 1.5 0 0 0 1.5-1.4L12 4M6.5 7v4M9.5 7v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>`;
      }).join('')
    : `<div class="empty">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16H5V4Z" stroke="currentColor" stroke-width="1.7"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></div>
        <h3 style="font-size:19px;">Start with a real client file</h3>
        <p class="muted small" style="max-width:390px;">Add a client, map the wage structure and complete the 25-point assessment. The first three audits are free.</p>
        <div style="display:flex; gap:7px; flex-wrap:wrap; justify-content:center; margin-top:5px;">
          <button class="btn btn-primary" data-action="new-audit" type="button">Create an audit</button>
          <button class="btn btn-ghost" data-action="load-sample" type="button">Open the sample</button>
        </div>
      </div>`;

  appMain.innerHTML = `
    ${setupNeeded ? `<div class="setup-banner"><div><b>Finish your firm profile.</b> Add your firm name, reviewer and logo so the report is client-ready.</div><button class="btn btn-soft btn-sm" data-action="open-settings" type="button">Open settings</button></div>` : ''}
    <div class="page-head">
      <div>
        <h1 class="page-title">Client audits</h1>
        <p class="page-sub">${firm().name ? esc(firm().name) : 'Add your firm profile'} · ${count} audit${count === 1 ? '' : 's'} · local-only data</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" data-action="load-sample" type="button">Sample audit</button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-card"><div class="metric-label">Audits</div><div class="metric-value">${count}</div><div class="metric-note">${isPro() ? 'Unlimited on firm licence' : `${freeLeft()} free left`}</div></div>
      <div class="metric-card"><div class="metric-label">High risk</div><div class="metric-value">${highRisk}</div><div class="metric-note">Needs partner review</div></div>
      <div class="metric-card"><div class="metric-label">Average score</div><div class="metric-value">${scored.length ? `${avg}` : '—'}</div><div class="metric-note">Across completed audits</div></div>
      <div class="metric-card"><div class="metric-label">Wage impact</div><div class="metric-value">${esc(formatINRShort(totalImpact))}</div><div class="metric-note">Indicative annual provision</div></div>
    </div>

    <section class="audit-card">
      <div class="audit-card-head">
        <h2>Recent audits</h2>
        <div class="audit-tools">
          <input class="search-input" id="auditSearch" type="search" placeholder="Search client, state or number" aria-label="Search audits" value="${attr(search)}">
        </div>
      </div>
      ${count ? `<div class="audit-row audit-row-head" aria-hidden="true"><div>Client</div><div>State</div><div>Headcount</div><div>Score</div><div>Wage impact</div><div>Risk</div><div></div></div>` : ''}
      <div id="auditRows">${rows}</div>
    </section>`;
}

function filterAuditRows() {
  const term = search.trim().toLowerCase();
  $$('#auditRows [data-open-audit]').forEach((row) => {
    row.style.display = !term || row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
}

/* ------------------------------------------------------------------ */
/* Editor                                                             */
/* ------------------------------------------------------------------ */

function renderEditor() {
  const audit = activeAudit();
  if (!audit) {
    navigate('dashboard');
    return;
  }
  const summary = buildAuditSummary(audit);
  const status = audit.status || 'draft';
  const statusClass = status === 'final' ? 'badge-sage' : status === 'in-review' ? 'badge-brass' : 'badge';

  appMain.innerHTML = `
    <div class="editor-head">
      <button class="icon-btn" data-action="back-dashboard" type="button" aria-label="Back to audits">
        <svg viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="editor-head-copy">
        <div class="editor-title" id="editorTitle">${esc(auditDisplayName(audit))}</div>
        <div class="editor-meta">
          <span>${esc(audit.number)}</span><span>·</span>
          <span>${esc(audit.client.auditPeriod || 'Audit period')}</span><span>·</span>
          <span class="badge ${statusClass}" id="editorStatus">${esc(statusLabel(status))}</span>
          <span class="muted" id="saveState">Saved</span>
        </div>
      </div>
      <div class="editor-actions">
        <button class="btn btn-ghost btn-sm" data-action="save-audit" type="button">Save</button>
        <button class="btn btn-primary btn-sm" data-action="download-pdf" type="button">Download PDF</button>
        <button class="icon-btn" data-action="open-audit-more" type="button" aria-label="More actions">
          <svg viewBox="0 0 16 16" fill="none"><circle cx="3.5" cy="8" r="1.1" fill="currentColor"/><circle cx="8" cy="8" r="1.1" fill="currentColor"/><circle cx="12.5" cy="8" r="1.1" fill="currentColor"/></svg>
        </button>
      </div>
    </div>

    <div class="editor-layout">
      <section class="form-panel">
        <div class="stepper" role="tablist" aria-label="Audit steps">
          ${[
            [1, 'Client'], [2, 'Wages'], [3, 'Applicability'], [4, 'Assessment'], [5, 'Report'],
          ].map(([n, label]) => `<button type="button" class="${step === n ? 'active' : ''}" data-action="set-step" data-step="${n}" role="tab" aria-selected="${step === n}"><span class="step-num">${n}</span><span class="step-label">${label}</span></button>`).join('')}
        </div>
        <div class="form-body" id="formBody">
          ${step === 1 ? clientStep(audit) : step === 2 ? wagesStep(audit, summary) : step === 3 ? applicabilityStep(audit, summary) : step === 4 ? assessmentStep(audit, summary) : reportStep(audit, summary)}
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost btn-sm" data-action="prev-step" type="button" ${step === 1 ? 'disabled' : ''}>Back</button>
          <div class="form-actions-right">
            <button class="btn btn-ghost btn-sm" data-action="save-audit" type="button">Save</button>
            ${step < 5 ? `<button class="btn btn-primary btn-sm" data-action="next-step" type="button">Continue</button>` : `<button class="btn btn-primary btn-sm" data-action="download-pdf" type="button">Download report</button>`}
          </div>
        </div>
      </section>

      <aside class="report-preview" id="previewWrap">
        ${previewHTML(audit, summary)}
      </aside>
    </div>`;
  renderShell();
}

function clientStep(audit) {
  return `
    <div class="form-section">
      <div class="form-section-head">
        <div><h2>Client profile</h2><p>The entity, the state and the headcount drive applicability and wage assumptions.</p></div>
        <span class="badge badge-brass">Step 1</span>
      </div>
      <div class="form-grid">
        <div class="field span-2"><label for="clientName">Client / entity name</label><input class="input" id="clientName" data-bind="client.name" value="${attr(audit.client.name)}" placeholder="Sahyadri Precision Components Pvt Ltd" autocomplete="off"></div>
        <div class="field"><label for="clientState">State</label><select class="select" id="clientState" data-bind="client.state">${STATES.map((s) => `<option value="${attr(s)}" ${audit.client.state === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
        <div class="field"><label for="clientIndustry">Industry</label><select class="select" id="clientIndustry" data-bind="client.industry">${INDUSTRIES.map((i) => `<option value="${i.id}" ${audit.client.industry === i.id ? 'selected' : ''}>${esc(i.label)}</option>`).join('')}</select></div>
        <div class="field"><label for="clientEmployees">Employees</label><input class="input" id="clientEmployees" type="number" min="0" step="1" data-bind="client.employees" value="${attr(audit.client.employees)}"></div>
        <div class="field"><label for="clientContractors">Contract workers</label><input class="input" id="clientContractors" type="number" min="0" step="1" data-bind="client.contractors" value="${attr(audit.client.contractors)}"></div>
        <div class="field"><label for="clientTurnover">Annual turnover (optional)</label><input class="input" id="clientTurnover" data-bind="client.turnover" value="${attr(audit.client.turnover)}" placeholder="₹42 crore"></div>
        <div class="field"><label for="auditPeriod">Audit period</label><input class="input" id="auditPeriod" data-bind="client.auditPeriod" value="${attr(audit.client.auditPeriod)}" placeholder="FY 2026–27"></div>
        <div class="field"><label for="contactName">Client contact</label><input class="input" id="contactName" data-bind="client.contactName" value="${attr(audit.client.contactName)}" placeholder="R. Deshmukh"></div>
        <div class="field"><label for="contactEmail">Contact email</label><input class="input" id="contactEmail" type="email" data-bind="client.contactEmail" value="${attr(audit.client.contactEmail)}" placeholder="r.deshmukh@example.com"></div>
      </div>
      <p class="hint" style="margin-top:12px;">${esc(stateNote(audit.client.state))}</p>
    </div>`;
}

function wagesStep(audit, summary) {
  return `
    <div class="form-section">
      <div class="form-section-head">
        <div><h2>Wage structure</h2><p>Average monthly CTC per employee, before employer PF and gratuity. The engine models the 50% rule and statutory provisions.</p></div>
        <span class="badge badge-brass">Step 2</span>
      </div>
      <div class="form-grid">
        <div class="field"><label for="monthlyCtc">Average monthly CTC</label><div class="input-group"><span class="prefix">₹</span><input class="input" id="monthlyCtc" type="number" min="0" step="1000" data-bind="wages.monthlyCtc" value="${attr(audit.wages.monthlyCtc)}"></div></div>
        <div class="field"><label for="wagesEmployees">Employees covered</label><input class="input" id="wagesEmployees" type="number" min="1" step="1" data-bind="wages.employees" value="${attr(audit.wages.employees)}"></div>
        <div class="field"><label for="basicPct">Basic pay (% of CTC)</label><input class="input" id="basicPct" type="number" min="0" max="100" step="1" data-bind="wages.basicPct" value="${attr(audit.wages.basicPct)}"></div>
        <div class="field"><label for="hraPct">HRA (% of CTC)</label><input class="input" id="hraPct" type="number" min="0" max="100" step="1" data-bind="wages.hraPct" value="${attr(audit.wages.hraPct)}"></div>
        <div class="field"><label for="epfCeiling">EPF wage ceiling</label><select class="select" id="epfCeiling" data-bind="wages.epfCeiling"><option value="true" ${audit.wages.epfCeiling ? 'selected' : ''}>Apply ₹15,000 ceiling</option><option value="false" ${!audit.wages.epfCeiling ? 'selected' : ''}>No ceiling (full basic)</option></select></div>
        <div class="field"><label for="pfRegistered">PF registration</label><select class="select" id="pfRegistered" data-bind="wages.pfRegistered"><option value="true" ${audit.wages.pfRegistered ? 'selected' : ''}>Registered</option><option value="false" ${!audit.wages.pfRegistered ? 'selected' : ''}>Not registered / not applicable</option></select></div>
        <div class="field"><label for="esiRegistered">ESI registration</label><select class="select" id="esiRegistered" data-bind="wages.esiRegistered"><option value="true" ${audit.wages.esiRegistered ? 'selected' : ''}>Registered</option><option value="false" ${!audit.wages.esiRegistered ? 'selected' : ''}>Not registered / not applicable</option></select></div>
        <div class="field"><label for="bonusApplicable">Statutory bonus</label><select class="select" id="bonusApplicable" data-bind="wages.bonusApplicable"><option value="true" ${audit.wages.bonusApplicable ? 'selected' : ''}>Applicable</option><option value="false" ${!audit.wages.bonusApplicable ? 'selected' : ''}>Not applicable</option></select></div>
      </div>
      <div class="field-row" style="margin-top:12px;">
        <label class="checkbox"><input type="checkbox" data-bind="wages.includeGratuity" ${audit.wages.includeGratuity ? 'checked' : ''}> Include gratuity provision</label>
        <label class="checkbox"><input type="checkbox" data-bind="wages.includeBonus" ${audit.wages.includeBonus ? 'checked' : ''}> Include bonus provision</label>
      </div>
      <div class="report-callout" style="margin-top:12px;"><b>Allowance classification matters.</b> This model conservatively treats HRA and other allowances as excluded components under s. 2(y). If they are ordinary wages, the 50% test may already be met. Verify the classification before recommending a restructure.</div>
      <div id="wageSummary" style="margin-top:12px;">${wageSummaryHTML(summary)}</div>
    </div>`;
}

function wageSummaryHTML(summary) {
  const w = summary.wage;
  return `<div class="wage-summary">
    <div class="wage-summary-head">
      <div><span class="badge ${w.compliant ? 'risk-low' : 'risk-high'}">${w.compliant ? '50% rule satisfied' : 'Restructure required'}</span><h3>${w.compliant ? 'No basic-pay correction indicated' : `Basic pay needs to rise to ${formatINR(w.proposed.basic)}`}</h3></div>
      <div class="wage-big">${formatINRShort(w.annualEmployerImpact)}<small>annual employer impact</small></div>
    </div>
    <div class="wage-grid">
      <div><span>Current basic</span><b>${formatINR(w.current.basic)}</b></div>
      <div><span>Proposed basic</span><b>${formatINR(w.proposed.basic)}</b></div>
      <div><span>Employee PF / month</span><b>${formatINR(w.employeePfDelta)}</b></div>
      <div><span>Gratuity + bonus / month</span><b>${formatINR(w.gratuityDelta + w.bonusDelta)}</b></div>
    </div>
    <p class="hint" style="margin-top:9px;">Indicative model. EPF ceiling, state minimum wages, bonus eligibility and PF/ESI coverage must be verified before use.</p>
  </div>`;
}

function applicabilityStep(audit, summary) {
  const rows = summary.applicability.map((row) => {
    const status = audit.applicability?.[row.code] || row.status;
    const label = status === 'applies' ? 'Applies' : status === 'review' ? 'Review' : 'Not indicated';
    const cls = status === 'applies' ? 'risk-high' : status === 'review' ? 'risk-medium' : 'risk-review';
    return `<div class="applicability-row">
      <div>
        <h3>${esc(row.code)}</h3>
        <p>${esc(row.reason)}</p>
        <div class="action-line">Action: ${esc(row.action)}</div>
      </div>
      <select class="select" style="min-width:128px; min-height:32px; font-size:11px;" data-applicability="${attr(row.code)}">
        <option value="applies" ${status === 'applies' ? 'selected' : ''}>Applies</option>
        <option value="review" ${status === 'review' ? 'selected' : ''}>Review</option>
        <option value="not-indicated" ${status === 'not-indicated' ? 'selected' : ''}>Not indicated</option>
      </select>
      <span class="badge ${cls}" style="grid-column: 2; justify-self: end;">${esc(label)}</span>
    </div>`;
  }).join('');
  return `<div class="form-section">
    <div class="form-section-head">
      <div><h2>Applicability</h2><p>Indicative based on headcount, contractors, industry and state. The firm makes the final call.</p></div>
      <span class="badge badge-brass">Step 3</span>
    </div>
    <div class="applicability-list">${rows}</div>
    <p class="hint" style="margin-top:12px;">Thresholds shown are common central thresholds. State rules, notifications and establishment classifications can change the position. Record your override and verify before issue.</p>
  </div>`;
}

function assessmentStep(audit, summary) {
  const assessment = summary.assessment;
  const categories = CATEGORIES.map((cat) => {
    const qs = QUESTIONS.filter((q) => q.cat === cat.id);
    const catScore = assessment.categories.find((c) => c.id === cat.id);
    return `<div class="category-block" data-category="${cat.id}">
      <div class="category-block-head">
        <h3>${esc(cat.label)}</h3>
        <span class="category-score" data-category-score="${cat.id}">${catScore?.score === null || catScore?.score === undefined ? 'Not assessed' : `${Math.round(catScore.score)} / 100`}</span>
      </div>
      <div class="question-list">
        ${qs.map((q) => `<div class="question-row" data-question="${q.id}">
          <div class="question-text"><span class="qid">${q.id}</span><span>${esc(q.text)}</span></div>
          <div class="question-guidance">${esc(q.guidance)} <span style="color:var(--brass-dark);">${esc(q.citation)}</span></div>
          <div class="answer-group" role="group" aria-label="${attr(q.id)} answer">
            ${[['yes', 'Yes'], ['partial', 'Partial'], ['no', 'No'], ['na', 'N/A']].map(([value, label]) => `<button type="button" class="answer-btn ${audit.answers[q.id] === value ? `selected ${value}` : ''}" data-answer="${q.id}" data-value="${value}">${label}</button>`).join('')}
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  return `<div class="form-section">
    <div class="form-section-head">
      <div><h2>25-point assessment</h2><p>Answer each question against the client's evidence. The score is weighted by category.</p></div>
      <span class="badge badge-brass">Step 4</span>
    </div>
    <div class="assessment-top">
      <div class="progress-wrap">
        <div class="progress-label"><span id="assessmentProgressLabel">${assessment.answered} of ${assessment.total} answered</span><span id="assessmentProgressPct">${Math.round(assessment.completion)}%</span></div>
        <div class="progress-bar"><span id="assessmentProgressBar" style="width:${assessment.completion}%"></span></div>
      </div>
      <span class="badge ${assessment.risk === 'high' ? 'risk-high' : assessment.risk === 'medium' ? 'risk-medium' : assessment.risk === 'low' ? 'risk-low' : 'risk-review'}" id="assessmentRisk">${esc(riskLabel(assessment.risk))}</span>
    </div>
    ${categories}
  </div>`;
}

function reportStep(audit, summary) {
  const assessment = summary.assessment;
  const draft = assessment.completion < 80;
  return `<div class="form-section">
    <div class="form-section-head">
      <div><h2>Report &amp; sign-off</h2><p>Add the reviewer. The report uses your firm profile, logo and disclaimer.</p></div>
      <span class="badge badge-brass">Step 5</span>
    </div>
    ${draft ? `<div class="report-callout"><b>Draft report.</b> The assessment is ${Math.round(assessment.completion)}% complete. You can generate a draft, but the PDF will be marked as a draft until the assessment is complete.</div>` : ''}
    <div class="form-grid" style="margin-top:12px;">
      <div class="field"><label for="reviewerName">Reviewer name</label><input class="input" id="reviewerName" data-bind="reviewer.name" value="${attr(audit.reviewer.name)}" placeholder="CA R. Deshmukh"></div>
      <div class="field"><label for="reviewerDesignation">Designation</label><input class="input" id="reviewerDesignation" data-bind="reviewer.designation" value="${attr(audit.reviewer.designation)}" placeholder="Partner — Labour & Employment"></div>
      <div class="field"><label for="reviewerMembership">Membership / registration</label><input class="input" id="reviewerMembership" data-bind="reviewer.membership" value="${attr(audit.reviewer.membership)}" placeholder="ICAI M.No. 123456"></div>
      <div class="field"><label for="auditStatus">Status</label><select class="select" id="auditStatus" data-bind="status">${['draft', 'in-review', 'final'].map((s) => `<option value="${s}" ${audit.status === s ? 'selected' : ''}>${s === 'in-review' ? 'In review' : s === 'final' ? 'Final' : 'Draft'}</option>`).join('')}</select></div>
      <div class="field span-2"><label for="auditNotes">Partner notes (internal, not in the PDF)</label><textarea class="textarea" id="auditNotes" data-bind="notes" placeholder="Key judgement calls, client-specific caveats, follow-up items.">${esc(audit.notes)}</textarea></div>
    </div>

    <div class="form-section" style="margin-top:22px;">
      <div class="form-section-head"><div><h2>Evidence checklist</h2><p>What the firm has actually seen. Unchecked items become follow-ups in the report.</p></div><span class="badge" id="docProgress">${Object.values(audit.documents || {}).filter(Boolean).length} of ${summary.documents.length}</span></div>
      <div class="doc-list">
        ${summary.documents.map((doc) => `<label class="doc-item"><input type="checkbox" data-doc="${doc.id}" ${audit.documents?.[doc.id] ? 'checked' : ''}><span><b>${esc(doc.label)}</b><small>${esc(doc.detail)}</small></span></label>`).join('')}
      </div>
    </div>

    <div class="report-callout" style="margin-top:18px;">
      <b>Report contents:</b> cover, executive summary, applicability matrix, 50% wage analysis, category scores, findings register, 30/60/90 plan, compliance calendar, document checklist, assumptions and sources.
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:16px;">
      <button class="btn btn-primary" data-action="download-pdf" type="button">Download white-label PDF</button>
      <button class="btn btn-ghost" data-action="save-audit" type="button">Save audit</button>
    </div>
  </div>`;
}

function previewHTML(audit, summary) {
  const score = Math.round(summary.assessment.overall);
  const risk = summary.assessment.risk;
  const f = firm();
  const logo = isPro() && f.logo
    ? `<img src="${attr(f.logo)}" alt="" style="width:20px;height:20px;object-fit:contain;background:#fff;border-radius:3px;">`
    : `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#B0833C"/><path d="M18 15h23a5 5 0 0 1 5 5v29H23a5 5 0 0 1-5-5V15Z" fill="none" stroke="#102A43" stroke-width="3" stroke-linejoin="round"/><path d="M25 24h14M25 30h14M25 36h8" stroke="#102A43" stroke-width="3.2" stroke-linecap="round"/></svg>`;
  return `<div class="preview-toolbar"><span>Report preview</span><div style="display:flex; gap:4px;"><button class="icon-btn" data-action="download-pdf" type="button" title="Download PDF" aria-label="Download PDF"><svg viewBox="0 0 16 16" fill="none"><path d="M8 1v9m0 0l3-3m-3 3L5 7M2 12.5V14h12v-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>
  <div class="preview-cover">
    <div class="preview-cover-band">
      <div class="preview-cover-brand">${logo}<span>${esc(f.name || 'Your firm')}</span></div>
      <div class="preview-cover-title">Labour Code Readiness Assessment</div>
      <div class="preview-cover-sub">Confidential · Prepared for the board</div>
    </div>
    <div class="preview-cover-body">
      <div class="preview-client-label">Prepared for</div>
      <div class="preview-client-name">${esc(auditDisplayName(audit))}</div>
      <div class="preview-meta"><span>${esc(audit.client.auditPeriod || 'Audit period')}</span><span>${esc(audit.number)}</span></div>
      <div class="preview-score-row">
        <div class="score-ring" style="width:54px;height:54px;background:conic-gradient(var(--brass) ${score}%, #e8e1d2 0);"><b style="font-size:15px;">${score}</b></div>
        <div class="preview-score-copy"><span>Overall readiness</span><b>${esc(riskLabel(risk))} · ${summary.assessment.findings.length} gaps</b><small style="display:block; margin-top:2px; color:var(--muted); font-size:8px;">${summary.assessment.completion}% assessed</small></div>
      </div>
      <div class="preview-metrics">
        <div class="preview-metric"><span>Codes</span><b>4</b></div>
        <div class="preview-metric"><span>Wage impact</span><b>${esc(formatINRShort(summary.wage.annualEmployerImpact))}</b></div>
        <div class="preview-metric"><span>Actions</span><b>${summary.assessment.findings.length}</b></div>
      </div>
      <div class="preview-footer"><span>${esc(audit.reviewer.name || 'Reviewer')}</span><span>Page 1</span></div>
    </div>
  </div>
  <div class="preview-summary">
    ${summary.assessment.categories.map((cat) => `<div class="preview-cat"><span>${esc(cat.label)}</span><div class="mini-bar"><i style="width:${cat.score || 0}%"></i></div><b>${cat.score === null ? '—' : Math.round(cat.score)}</b></div>`).join('')}
    <div class="preview-summary-foot"><span>${summary.highCount} high · ${summary.mediumCount} medium</span><span>${esc(riskLabel(risk))}</span></div>
  </div>`;
}

function refreshEditor() {
  const audit = activeAudit();
  if (!audit) return;
  audit.updatedAt = new Date().toISOString();
  const summary = buildAuditSummary(audit);
  const preview = $('#previewWrap');
  if (preview) preview.innerHTML = previewHTML(audit, summary);
  const wage = $('#wageSummary');
  if (wage) wage.innerHTML = wageSummaryHTML(summary);
  const assessment = summary.assessment;
  const label = $('#assessmentProgressLabel');
  if (label) label.textContent = `${assessment.answered} of ${assessment.total} answered`;
  const pct = $('#assessmentProgressPct');
  if (pct) pct.textContent = `${Math.round(assessment.completion)}%`;
  const bar = $('#assessmentProgressBar');
  if (bar) bar.style.width = `${assessment.completion}%`;
  const risk = $('#assessmentRisk');
  if (risk) {
    risk.className = `badge ${assessment.risk === 'high' ? 'risk-high' : assessment.risk === 'medium' ? 'risk-medium' : assessment.risk === 'low' ? 'risk-low' : 'risk-review'}`;
    risk.textContent = riskLabel(assessment.risk);
  }
  assessment.categories.forEach((cat) => {
    const el = document.querySelector(`[data-category-score="${cat.id}"]`);
    if (el) el.textContent = cat.score === null ? 'Not assessed' : `${Math.round(cat.score)} / 100`;
  });
  const status = $('#editorStatus');
  if (status) {
    status.className = `badge ${audit.status === 'final' ? 'badge-sage' : audit.status === 'in-review' ? 'badge-brass' : ''}`;
    status.textContent = statusLabel(audit.status);
  }
  const docProgress = $('#docProgress');
  if (docProgress) {
    docProgress.textContent = `${Object.values(audit.documents || {}).filter(Boolean).length} of ${summary.documents.length}`;
  }
  const title = $('#editorTitle');
  if (title) title.textContent = auditDisplayName(audit);
  const save = $('#saveState');
  if (save) save.textContent = 'Saving…';
  scheduleSave();
}

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

function renderSettings() {
  const tabs = [
    ['firm', 'Firm profile', '<path d="M4 20h16M6 20V8l6-4 6 4v12M10 20v-6h4v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'],
    ['report', 'Report & reviewer', '<path d="M6 3h9l4 4v14H6V3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15 3v5h4M9 13h6M9 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'],
    ['license', 'Licence', '<path d="M12 3l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'],
    ['data', 'Data', '<path d="M4 6c0 1.6 3.6 3 8 3s8-1.4 8-3-3.6-3-8-3-8 1.4-8 3Zm0 0v12c0 1.6 3.6 3 8 3s8-1.4 8-3V6M4 12c0 1.6 3.6 3 8 3s8-1.4 8-3" stroke="currentColor" stroke-width="1.5"/>'],
  ];
  appMain.innerHTML = `
    <div class="page-head">
      <div><h1 class="page-title">Settings</h1><p class="page-sub">Firm profile, report defaults, licence and local data.</p></div>
      <div class="page-actions"><button class="btn btn-ghost btn-sm" data-action="back-dashboard" type="button">Back to audits</button></div>
    </div>
    <div class="settings-layout">
      <nav class="settings-nav" aria-label="Settings sections">
        ${tabs.map(([id, label, icon]) => `<button type="button" class="${settingsTab === id ? 'active' : ''}" data-action="settings-tab" data-tab="${id}"><svg viewBox="0 0 24 24" fill="none">${icon}</svg>${label}</button>`).join('')}
      </nav>
      <div class="settings-content">${settingsTabHTML()}</div>
    </div>`;
}

function settingsTabHTML() {
  if (settingsTab === 'report') return reportSettingsHTML();
  if (settingsTab === 'license') return licenseSettingsHTML();
  if (settingsTab === 'data') return dataSettingsHTML();
  return firmSettingsHTML();
}

function firmSettingsHTML() {
  const f = firm();
  return `<section class="settings-card">
    <div class="settings-card-head"><div><h2>Firm profile</h2><p>This appears on the report cover and header.</p></div></div>
    <div class="settings-card-body">
      <div class="form-grid">
        <div class="field"><label>Firm name</label><input class="input" data-setting="firm.name" value="${attr(f.name)}" placeholder="Deshmukh & Associates"></div>
        <div class="field"><label>Partner / signatory</label><input class="input" data-setting="firm.partner" value="${attr(f.partner)}" placeholder="CA R. Deshmukh"></div>
        <div class="field"><label>Designation</label><input class="input" data-setting="firm.designation" value="${attr(f.designation)}" placeholder="Partner — Labour & Employment"></div>
        <div class="field"><label>Membership / registration</label><input class="input" data-setting="firm.membership" value="${attr(f.membership)}" placeholder="ICAI M.No. 123456"></div>
        <div class="field"><label>Email</label><input class="input" type="email" data-setting="firm.email" value="${attr(f.email)}" placeholder="r.deshmukh@example.com"></div>
        <div class="field"><label>Phone</label><input class="input" type="tel" data-setting="firm.phone" value="${attr(f.phone)}" placeholder="+91 98220 00000"></div>
        <div class="field span-2"><label>Address</label><input class="input" data-setting="firm.address" value="${attr(f.address)}" placeholder="Pune, Maharashtra"></div>
        <div class="field span-2"><label>Website</label><input class="input" data-setting="firm.website" value="${attr(f.website)}" placeholder="deshmukhassociates.example"></div>
        <div class="field span-2"><label>Logo (used on the report)</label><div class="logo-row"><div class="logo-preview">${f.logo ? `<img src="${attr(f.logo)}" alt="Logo preview">` : 'No logo'}</div><div style="display:flex; gap:7px; flex-wrap:wrap;"><label class="btn btn-ghost btn-sm" style="margin:0;">Upload logo<input id="logoInput" type="file" accept="image/png,image/jpeg,image/webp" class="sr-only"></label>${f.logo ? `<button class="btn btn-danger btn-sm" data-action="remove-logo" type="button">Remove</button>` : ''}</div></div><p class="hint" style="margin-top:6px;">PNG, JPG or WebP, under 1.5 MB. Transparent PNG works best on the navy cover.</p></div>
        <div class="field"><label>Brand colour</label><div class="color-row"><input type="color" data-setting="firm.accent" value="${attr(f.accent || '#102A43')}"><span class="hint">Used in the report accent.</span></div></div>
      </div>
      <div class="settings-actions"><button class="btn btn-primary btn-sm" data-action="save-settings" type="button">Save firm profile</button></div>
    </div>
  </section>`;
}

function reportSettingsHTML() {
  const r = reviewer();
  return `<section class="settings-card">
    <div class="settings-card-head"><div><h2>Report &amp; reviewer</h2><p>Defaults for new audits. You can override the reviewer on each audit.</p></div></div>
    <div class="settings-card-body">
      <div class="form-grid">
        <div class="field"><label>Reviewer name</label><input class="input" data-setting="reviewer.name" value="${attr(r.name)}" placeholder="CA R. Deshmukh"></div>
        <div class="field"><label>Designation</label><input class="input" data-setting="reviewer.designation" value="${attr(r.designation)}" placeholder="Partner — Labour & Employment"></div>
        <div class="field"><label>Membership / registration</label><input class="input" data-setting="reviewer.membership" value="${attr(r.membership)}" placeholder="ICAI M.No. 123456"></div>
        <div class="field"><label>Audit number prefix</label><input class="input" data-setting="auditPrefix" value="${attr(state.settings.auditPrefix)}" maxlength="5"></div>
        <div class="field span-2"><label>Report disclaimer</label><textarea class="textarea" data-setting="disclaimer">${esc(state.settings.disclaimer)}</textarea><p class="hint">This is printed in the report. It should match the firm's professional standards and engagement terms.</p></div>
      </div>
      <div class="settings-actions"><button class="btn btn-primary btn-sm" data-action="save-settings" type="button">Save report defaults</button><button class="btn btn-ghost btn-sm" data-action="reset-disclaimer" type="button">Reset disclaimer</button></div>
    </div>
  </section>`;
}

function licenseSettingsHTML() {
  return `<section class="settings-card">
    <div class="settings-card-head"><div><h2>Licence</h2><p>One firm licence. No per-client fee.</p></div><span class="badge ${isPro() ? 'badge-sage' : 'badge-brass'}">${esc(planLabel())}</span></div>
    <div class="settings-card-body">
      <div class="license-box">
        <div><h3>${isPro() ? (licenseState.plan === 'trial' ? `Trial · ${licenseState.daysLeft} days left` : 'Firm licence active') : 'Free pilot'}</h3><p>${isPro() ? 'Unlimited audits, white-label report, reviewer sign-off and data export.' : '3 audits included. Upgrade for unlimited client work.'}</p></div>
        ${!isPro() ? '<button class="btn btn-primary btn-sm" data-action="open-plan" type="button">Upgrade</button>' : ''}
      </div>
      ${!licenseData.trialExpiry && !isPro() ? `<div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" data-action="start-trial" type="button">Start 7-day trial</button><p class="hint" style="margin-top:5px;">No card. Full access on this device.</p></div>` : ''}
      <div style="margin-top:22px;">
        <h3 style="font-size:13px;">${isPro() ? 'Your licence key' : 'Activate a licence'}</h3>
        <p class="hint" style="margin-top:3px;">${isPro() ? 'This device is activated. Keep the key safe.' : 'Paste the key you received after purchase.'}</p>
        <form class="license-form" id="licenseForm">
          <input class="input" id="licenseKeyInput" name="licenseKey" placeholder="LL-XXXXX-XXXXX-XXXXX" value="${isPro() ? attr(licenseData.key) : ''}" autocomplete="off" spellcheck="false">
          <button class="btn btn-primary btn-sm" type="submit">${isPro() ? 'Verify' : 'Activate'}</button>
        </form>
        <div class="license-status" id="licenseStatus"></div>
        ${isPro() && licenseState.plan === 'pro' ? '<button class="btn btn-ghost btn-sm" data-action="deactivate-license" type="button" style="margin-top:9px;">Deactivate this device</button>' : ''}
      </div>
    </div>
  </section>`;
}

function dataSettingsHTML() {
  return `<section class="settings-card">
    <div class="settings-card-head"><div><h2>Local data</h2><p>Everything is stored in this browser. Export a backup before changing devices.</p></div><span class="badge">${state.audits.length} audit${state.audits.length === 1 ? '' : 's'}</span></div>
    <div class="settings-card-body">
      <div class="settings-actions">
        <button class="btn btn-primary btn-sm" data-action="export-data" type="button">Export backup (.json)</button>
        <label class="btn btn-ghost btn-sm" style="margin:0;">Import backup<input id="importFile" type="file" accept="application/json,.json" class="sr-only"></label>
        <button class="btn btn-danger btn-sm" data-action="reset-data" type="button">Reset all data</button>
      </div>
      <p class="hint" style="margin-top:12px;">The export contains client names, wage data, assessment answers and notes. Keep it confidential. Importing replaces the audits and settings in this browser.</p>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ */
/* Onboarding & plan                                                  */
/* ------------------------------------------------------------------ */

function showOnboarding() {
  openModal(`
    <div class="modal-header">
      <div>
        <div class="brand" style="font-size:16px;"><span class="brand-mark" style="width:26px;height:26px;"><svg viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="currentColor"/><path d="M18 15h23a5 5 0 0 1 5 5v29H23a5 5 0 0 1-5-5V15Z" fill="none" stroke="#F7F4EC" stroke-width="3" stroke-linejoin="round"/><path d="M25 24h14M25 30h14M25 36h8" stroke="#B0833C" stroke-width="3.2" stroke-linecap="round"/><path d="M35 43l4 4 9-11" fill="none" stroke="#E9C77E" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>LabourLedger</div>
        <h2 class="onboard-title">Put your firm on the report.</h2>
        <p class="onboard-sub">Add your firm and reviewer once. Every audit will use your brand. No account, no cloud database.</p>
      </div>
      <button class="modal-close" data-action="close-modal" type="button" aria-label="Close">×</button>
    </div>
    <form id="onboardingForm">
      <div class="modal-body">
        <div class="form-grid">
          <div class="field span-2"><label for="obFirm">Firm name *</label><input class="input" id="obFirm" name="firmName" required value="${attr(firm().name)}" placeholder="Deshmukh & Associates"></div>
          <div class="field"><label for="obPartner">Partner / signatory</label><input class="input" id="obPartner" name="partner" value="${attr(firm().partner)}" placeholder="CA R. Deshmukh"></div>
          <div class="field"><label for="obDesignation">Designation</label><input class="input" id="obDesignation" name="designation" value="${attr(firm().designation)}" placeholder="Partner — Labour & Employment"></div>
          <div class="field"><label for="obMembership">Membership / registration</label><input class="input" id="obMembership" name="membership" value="${attr(firm().membership)}" placeholder="ICAI M.No. 123456"></div>
          <div class="field"><label for="obEmail">Firm email</label><input class="input" id="obEmail" name="email" type="email" value="${attr(firm().email)}" placeholder="r.deshmukh@example.com"></div>
          <div class="field"><label for="obPhone">Phone</label><input class="input" id="obPhone" name="phone" type="tel" value="${attr(firm().phone)}" placeholder="+91 98220 00000"></div>
          <div class="field"><label for="obAddress">City / address</label><input class="input" id="obAddress" name="address" value="${attr(firm().address)}" placeholder="Pune, Maharashtra"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" data-action="load-sample" type="button">Load a sample audit</button>
        <button class="btn btn-primary btn-sm" type="submit">Create my workspace</button>
      </div>
    </form>`);
}

function showPlanModal() {
  const trialUsed = Boolean(licenseData.trialExpiry);
  const buyUrl = CONFIG.checkoutUrl || CONFIG.orderUrl;
  const buyLabel = CONFIG.checkoutUrl ? 'Buy the firm licence' : 'Request a licence';
  openModal(`
    <div class="modal-header">
      <div><span class="eyebrow">LabourLedger licence</span><h2 style="font-family:var(--display); font-size:28px; font-weight:600; letter-spacing:-.04em; margin-top:7px;">One firm. Unlimited client audits.</h2><p class="muted small" style="margin-top:5px;">No per-client fee. No monthly subscription.</p></div>
      <button class="modal-close" data-action="close-modal" type="button" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <div class="plan-grid">
        <div class="plan-box"><div class="plan-name">Free pilot</div><div class="plan-price">₹0</div><ul><li>3 full audits</li><li>White-label PDF</li><li>Wage impact model</li></ul></div>
        <div class="plan-box featured"><div class="plan-name">Firm licence</div><div class="plan-price">₹${CONFIG.launchPrice.toLocaleString('en-IN')}</div><ul><li>Unlimited audits</li><li>Logo, brand colour &amp; reviewer</li><li>Rule updates &amp; export</li></ul></div>
      </div>
      ${isPro() ? `<div class="license-box" style="margin-top:12px;"><div><h3>${licenseState.plan === 'trial' ? `Trial · ${licenseState.daysLeft} days left` : 'Firm licence active'}</h3><p>${licenseState.plan === 'trial' ? 'Lock in the licence to keep access after the trial.' : 'This device is activated.'}</p></div><span class="badge ${licenseState.plan === 'trial' ? 'badge-brass' : 'badge-sage'}">${esc(planLabel())}</span></div>` : ''}
      <div style="display:flex; flex-direction:column; gap:7px; margin-top:14px;">
        ${buyUrl ? `<a class="btn btn-primary btn-block" href="${attr(buyUrl)}" target="_blank" rel="noopener">${esc(buyLabel)} →</a>` : '<p class="hint">Checkout is being connected. Add a payment link in <code>assets/js/config.js</code>.</p>'}
        ${!trialUsed && !isPro() ? '<button class="btn btn-ghost btn-block" data-action="start-trial" type="button">Start 7-day trial — no card</button>' : ''}
      </div>
      <p class="hint" style="margin-top:8px;">${CONFIG.checkoutUrl ? 'Secure checkout opens in a new tab. You will receive a licence key.' : 'Pilot requests are handled manually while checkout is connected. You can start the trial immediately.'} Prices exclusive of GST.</p>
      <div style="margin-top:18px; padding-top:16px; border-top:1px solid var(--line);">
        <h3 style="font-size:13px;">Already have a key?</h3>
        <form class="license-form" id="licenseFormModal">
          <input class="input" id="licenseKeyModal" name="licenseKey" placeholder="LL-XXXXX-XXXXX-XXXXX" autocomplete="off" spellcheck="false">
          <button class="btn btn-primary btn-sm" type="submit">Activate</button>
        </form>
        <div class="license-status" id="licenseStatusModal"></div>
      </div>
    </div>`);
}

function showAuditMore() {
  const audit = activeAudit();
  if (!audit) return;
  openModal(`
    <div class="modal-header"><div><h3 style="font-size:19px;">Audit actions</h3><p class="muted small" style="margin-top:4px;">${esc(audit.number)} · ${esc(auditDisplayName(audit))}</p></div><button class="modal-close" data-action="close-modal" type="button" aria-label="Close">×</button></div>
    <div class="modal-body" style="display:grid; gap:7px;">
      <button class="btn btn-ghost btn-block" data-action="download-pdf" type="button">Download white-label PDF</button>
      <button class="btn btn-ghost btn-block" data-action="duplicate-current" type="button">Duplicate audit</button>
      <button class="btn btn-ghost btn-block" data-action="mark-final" type="button">${audit.status === 'final' ? 'Reopen as in-review' : 'Mark as final'}</button>
      <button class="btn btn-danger btn-block" data-action="delete-current" type="button">Delete audit</button>
    </div>`);
}

/* ------------------------------------------------------------------ */
/* Actions                                                            */
/* ------------------------------------------------------------------ */

function newAudit(seed = null) {
  if (!isPro() && state.audits.length >= CONFIG.freeAudits) {
    showPlanModal();
    return;
  }
  const audit = createAudit(state.settings, seed);
  state.settings.nextNumber = Math.max(1, Number(state.settings.nextNumber) || 1) + 1;
  state.audits.push(audit);
  activeId = audit.id;
  view = 'editor';
  step = seed ? 2 : 1;
  persist();
  render();
  syncUrl();
  toast('New audit created.');
}

function loadSample() {
  if (!isPro() && state.audits.length >= CONFIG.freeAudits) {
    closeModal();
    showPlanModal();
    return;
  }
  const sample = sampleAudit(state.settings);
  if (!state.settings.firm.name) {
    state.settings.firm = {
      ...state.settings.firm,
      name: CONFIG.demo.firmName,
      partner: CONFIG.demo.partner,
      designation: CONFIG.demo.designation,
      membership: CONFIG.demo.membership,
      email: CONFIG.demo.email,
      phone: CONFIG.demo.phone,
      address: CONFIG.demo.address,
      website: CONFIG.demo.website,
      accent: '#102A43',
    };
    state.settings.reviewer = {
      name: CONFIG.demo.partner,
      designation: CONFIG.demo.designation,
      membership: CONFIG.demo.membership,
    };
  }
  state.onboardingComplete = true;
  state.audits.push(sample);
  state.settings.nextNumber = Math.max(Number(state.settings.nextNumber) || 1, state.audits.length + 1);
  activeId = sample.id;
  view = 'editor';
  step = 5;
  persist();
  closeModal();
  render();
  syncUrl();
  toast('Sample audit loaded. Make it yours.', 'success');
}

function downloadPdf() {
  const audit = activeAudit();
  if (!audit) return;
  const summary = buildAuditSummary(audit);
  const draft = summary.assessment.completion < 80;
  const go = () => {
    try {
      generateAuditPdf(audit, summary, state.settings, {
        isPro: isPro(),
        draft,
        save: true,
      });
      if (audit.status === 'draft') audit.status = 'in-review';
      persist();
      renderEditor();
      closeModal();
      toast(draft ? 'Draft PDF downloaded.' : 'Report downloaded.', 'success');
    } catch (error) {
      console.error(error);
      toast('Could not create the PDF. Reload and try again.', 'error');
    }
  };
  if (draft) {
    confirmDialog(
      'Generate a draft report?',
      `The assessment is ${Math.round(summary.assessment.completion)}% complete. The PDF will be watermarked as a draft and should not be issued to the client.`,
      'Generate draft',
      go
    );
  } else {
    go();
  }
}

function activateLicenseFrom(inputId, statusId) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  const key = formatKey(input?.value || '');
  if (!isValidKey(key)) {
    if (status) {
      status.className = 'license-status err';
      status.textContent = 'That key does not look right. Check the format and try again.';
    }
    return;
  }
  licenseData.key = key;
  saveLicense(licenseData);
  licenseState = getLicenseState({ key: licenseData.key, trialExpiry: licenseData.trialExpiry });
  persist();
  closeModal();
  render();
  toast('Firm licence activated.', 'success');
  if (CONFIG.gumroadProductId) {
    verifyGumroadLicense(key, CONFIG.gumroadProductId).then((result) => {
      if (!result.ok) toast(result.message, 'error');
    });
  }
}

function startTrialAction() {
  if (licenseData.trialExpiry) {
    toast('The trial has already been used on this device.', 'error');
    return;
  }
  licenseData.trialExpiry = startTrial(Date.now(), CONFIG.trialDays);
  saveLicense(licenseData);
  licenseState = getLicenseState({ key: licenseData.key, trialExpiry: licenseData.trialExpiry });
  closeModal();
  render();
  toast(`Trial started — ${CONFIG.trialDays} days.`, 'success');
}

function exportData() {
  const blob = new Blob([exportState(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `labourledger-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup downloaded.', 'success');
}

function handleLogoFile(file) {
  if (!file) return;
  if (file.size > 1.5 * 1024 * 1024) {
    toast('Logo must be under 1.5 MB.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result);
    const img = new Image();
    img.onload = () => {
      state.settings.firm.logo = dataUrl;
      state.settings.firm.logoWidth = img.naturalWidth;
      state.settings.firm.logoHeight = img.naturalHeight;
      persist();
      renderSettings();
      renderShell();
      toast('Logo updated.', 'success');
    };
    img.onerror = () => toast('Could not read that image.', 'error');
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

/* ------------------------------------------------------------------ */
/* Event handlers                                                     */
/* ------------------------------------------------------------------ */

function handleClick(event) {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    event.preventDefault();
    if (nav.dataset.nav === 'settings') navigate('settings');
    else navigate('dashboard');
    return;
  }

  const row = event.target.closest('[data-open-audit]');
  const actionEl = event.target.closest('[data-action]');
  const answerEl = event.target.closest('[data-answer]');

  if (answerEl) {
    const audit = activeAudit();
    if (!audit) return;
    audit.answers[answerEl.dataset.answer] = answerEl.dataset.value;
    const group = answerEl.closest('.answer-group');
    if (group) {
      group.querySelectorAll('.answer-btn').forEach((btn) => {
        btn.classList.remove('selected', 'yes', 'partial', 'no', 'na');
        if (btn === answerEl) btn.classList.add('selected', answerEl.dataset.value);
      });
    }
    refreshEditor();
    return;
  }

  if (actionEl) {
    const action = actionEl.dataset.action;
    if (action === 'close-modal') {
      if (actionEl.classList.contains('modal-backdrop') && event.target.closest('[data-modal-panel]')) return;
      closeModal();
      return;
    }
    event.preventDefault();

    switch (action) {
      case 'new-audit':
        closeModal();
        newAudit();
        break;
      case 'back-dashboard':
        navigate('dashboard');
        break;
      case 'open-settings':
        closeModal();
        navigate('settings');
        break;
      case 'open-plan':
        closeModal();
        showPlanModal();
        break;
      case 'load-sample':
        loadSample();
        break;
      case 'set-step':
        step = Math.min(5, Math.max(1, Number(actionEl.dataset.step) || 1));
        renderEditor();
        window.scrollTo({ top: 0, behavior: 'instant' });
        break;
      case 'next-step':
        persist();
        step = Math.min(5, step + 1);
        renderEditor();
        window.scrollTo({ top: 0, behavior: 'instant' });
        break;
      case 'prev-step':
        persist();
        step = Math.max(1, step - 1);
        renderEditor();
        window.scrollTo({ top: 0, behavior: 'instant' });
        break;
      case 'save-audit':
        persist();
        toast('Audit saved.', 'success');
        break;
      case 'download-pdf':
        downloadPdf();
        break;
      case 'duplicate-audit':
        duplicateById(actionEl.dataset.id);
        break;
      case 'delete-audit':
        confirmDelete(actionEl.dataset.id);
        break;
      case 'duplicate-current': {
        const audit = activeAudit();
        if (audit) duplicateById(audit.id);
        break;
      }
      case 'delete-current': {
        const audit = activeAudit();
        if (audit) confirmDelete(audit.id);
        break;
      }
      case 'mark-final': {
        const audit = activeAudit();
        if (audit) {
          audit.status = audit.status === 'final' ? 'in-review' : 'final';
          persist();
          closeModal();
          renderEditor();
          toast(audit.status === 'final' ? 'Marked final.' : 'Reopened for review.');
        }
        break;
      }
      case 'open-audit-more':
        showAuditMore();
        break;
      case 'confirm-yes':
        if (typeof confirmCallback === 'function') confirmCallback();
        break;
      case 'open-menu':
        openMenu();
        break;
      case 'close-menu':
        closeMenu();
        break;
      case 'settings-tab':
        settingsTab = actionEl.dataset.tab;
        renderSettings();
        syncUrl();
        break;
      case 'save-settings':
        persist();
        renderShell();
        toast('Settings saved.', 'success');
        break;
      case 'start-trial':
        startTrialAction();
        break;
      case 'deactivate-license':
        confirmDialog('Deactivate this device?', 'You can reactivate later with the same key.', 'Deactivate', () => {
          licenseData.key = '';
          saveLicense(licenseData);
          licenseState = getLicenseState({ key: '', trialExpiry: licenseData.trialExpiry });
          closeModal();
          render();
          toast('Licence removed from this device.');
        });
        break;
      case 'export-data':
        exportData();
        break;
      case 'reset-data':
        confirmDialog('Reset all data?', 'This deletes every audit and setting in this browser. Export a backup first.', 'Reset everything', () => {
          const lic = { ...licenseData };
          state = freshState();
          licenseData = lic;
          activeId = null;
          view = 'dashboard';
          persist();
          closeModal();
          render();
          showOnboarding();
          toast('All data reset.');
        });
        break;
      case 'remove-logo':
        state.settings.firm.logo = '';
        delete state.settings.firm.logoWidth;
        delete state.settings.firm.logoHeight;
        persist();
        renderSettings();
        renderShell();
        toast('Logo removed.');
        break;
      case 'reset-disclaimer':
        state.settings.disclaimer = DEFAULT_DISCLAIMER;
        persist();
        renderSettings();
        toast('Disclaimer reset.');
        break;
      default:
        break;
    }
    return;
  }

  if (row && !event.target.closest('button, a, input, select, textarea')) {
    const id = row.dataset.openAudit;
    view = 'editor';
    activeId = id;
    step = 1;
    render();
    syncUrl();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function handleField(event) {
  const el = event.target;
  if (el.id === 'auditSearch') {
    search = el.value;
    filterAuditRows();
    return;
  }
  if (el.matches('[data-bind]')) {
    const audit = activeAudit();
    if (!audit) return;
    let value = readValue(el);
    if (el.tagName === 'SELECT' && (value === 'true' || value === 'false')) {
      value = value === 'true';
    }
    setPath(audit, el.dataset.bind, value);
    if (el.dataset.bind === 'client.employees') {
      audit.wages.employees = Math.max(1, Number(value) || 1);
      const we = document.getElementById('wagesEmployees');
      if (we) we.value = audit.wages.employees;
    }
    audit.updatedAt = new Date().toISOString();
    refreshEditor();
    return;
  }
  if (el.matches('[data-setting]')) {
    const value = readValue(el);
    setPath(state.settings, el.dataset.setting, value);
    persist();
    renderShell();
    if (el.dataset.setting.startsWith('reviewer.')) {
      const audit = activeAudit();
      if (audit) {
        audit.reviewer = { ...audit.reviewer, ...state.settings.reviewer };
        refreshEditor();
      }
    }
    if (el.dataset.setting.startsWith('firm.') || el.dataset.setting === 'disclaimer') {
      const audit = activeAudit();
      if (audit) refreshEditor();
    }
    return;
  }
  if (el.matches('[data-applicability]')) {
    const audit = activeAudit();
    if (!audit) return;
    audit.applicability = { ...(audit.applicability || {}), [el.dataset.applicability]: el.value };
    audit.updatedAt = new Date().toISOString();
    const row = el.closest('.applicability-row');
    const badge = row?.querySelector('.badge');
    if (badge) {
      const status = el.value;
      badge.className = `badge ${status === 'applies' ? 'risk-high' : status === 'review' ? 'risk-medium' : 'risk-review'}`;
      badge.textContent = status === 'applies' ? 'Applies' : status === 'review' ? 'Review' : 'Not indicated';
    }
    refreshEditor();
    return;
  }
  if (el.matches('[data-doc]')) {
    const audit = activeAudit();
    if (!audit) return;
    audit.documents = { ...(audit.documents || {}), [el.dataset.doc]: el.checked };
    audit.updatedAt = new Date().toISOString();
    refreshEditor();
  }
}

function handleChange(event) {
  const el = event.target;
  if (el.id === 'logoInput') {
    handleLogoFile(el.files?.[0]);
    return;
  }
  if (el.id === 'importFile') {
    const file = el.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = importState(String(reader.result), state);
        activeId = null;
        view = 'dashboard';
        persist();
        render();
        toast('Backup imported.', 'success');
      } catch (error) {
        toast(error.message || 'Could not import that file.', 'error');
      }
    };
    reader.readAsText(file);
    return;
  }
  if (el.matches('[data-bind], [data-setting], [data-applicability], [data-doc]')) {
    handleField(event);
  }
}

function handleSubmit(event) {
  if (event.target.id === 'onboardingForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    const name = String(data.get('firmName') || '').trim();
    if (!name) return;
    state.settings.firm = {
      ...state.settings.firm,
      name,
      partner: String(data.get('partner') || '').trim(),
      designation: String(data.get('designation') || '').trim(),
      membership: String(data.get('membership') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      address: String(data.get('address') || '').trim(),
    };
    state.settings.reviewer = {
      name: state.settings.firm.partner,
      designation: state.settings.firm.designation,
      membership: state.settings.firm.membership,
    };
    state.onboardingComplete = true;
    persist();
    closeModal();
    if (pendingSample) {
      pendingSample = false;
      loadSample();
    } else if (pendingSeed) {
      const seed = pendingSeed;
      pendingSeed = null;
      newAudit(seed);
    } else {
      render();
      toast('Workspace ready. Create your first audit.', 'success');
    }
    if (pendingUpgrade) {
      pendingUpgrade = false;
      window.setTimeout(() => showPlanModal(), 120);
    }
    return;
  }
  if (event.target.id === 'licenseForm' || event.target.id === 'licenseFormModal') {
    event.preventDefault();
    activateLicenseFrom(
      event.target.id === 'licenseFormModal' ? 'licenseKeyModal' : 'licenseKeyInput',
      event.target.id === 'licenseFormModal' ? 'licenseStatusModal' : 'licenseStatus'
    );
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeModal();
    closeMenu();
  }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open-audit]')) {
    event.preventDefault();
    view = 'editor';
    activeId = event.target.dataset.openAudit;
    step = 1;
    render();
    syncUrl();
  }
}

function duplicateById(id) {
  const audit = state.audits.find((a) => a.id === id);
  if (!audit) return;
  if (!isPro() && state.audits.length >= CONFIG.freeAudits) {
    showPlanModal();
    return;
  }
  const copy = duplicateAudit(audit, state.settings);
  state.settings.nextNumber = Math.max(1, Number(state.settings.nextNumber) || 1) + 1;
  state.audits.push(copy);
  activeId = copy.id;
  view = 'editor';
  step = 1;
  persist();
  closeModal();
  render();
  syncUrl();
  toast('Audit duplicated.');
}

function confirmDelete(id) {
  confirmDialog('Delete this audit?', 'This cannot be undone.', 'Delete audit', () => {
    state.audits = state.audits.filter((a) => a.id !== id);
    if (activeId === id) {
      activeId = null;
      view = 'dashboard';
    }
    persist();
    closeModal();
    render();
    syncUrl();
    toast('Audit deleted.');
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                               */
/* ------------------------------------------------------------------ */

function readSeed(params) {
  if (!params.has('ctc') && !params.has('basic')) return null;
  return {
    wages: {
      monthlyCtc: Number(params.get('ctc')) || 50000,
      basicPct: Number(params.get('basic')) || 40,
      hraPct: Math.max(0, Math.min(60, 100 - (Number(params.get('basic')) || 40))),
      employees: Number(params.get('employees')) || 50,
      epfCeiling: params.get('ceiling') !== 'no',
    },
  };
}

function boot() {
  const params = new URLSearchParams(location.search);
  pendingSeed = readSeed(params);
  pendingSample = params.get('sample') === '1';
  const routeView = params.get('view');
  const routeId = params.get('id');
  const forceOnboarding = params.get('onboarding') === '1';
  const forceUpgrade = params.get('upgrade') === '1';
  pendingUpgrade = forceUpgrade;

  if (routeView === 'settings') {
    view = 'settings';
    settingsTab = params.get('tab') || 'firm';
  } else if (routeView === 'editor' && state.audits.some((a) => a.id === routeId)) {
    view = 'editor';
    activeId = routeId;
  } else {
    view = 'dashboard';
  }

  render();

  if (forceOnboarding || !state.onboardingComplete) {
    showOnboarding();
  } else if (forceUpgrade) {
    pendingUpgrade = false;
    showPlanModal();
  } else if (pendingSample) {
    loadSample();
  } else if (pendingSeed) {
    const seed = pendingSeed;
    pendingSeed = null;
    newAudit(seed);
  }

  if (pendingSeed || pendingSample || forceUpgrade || forceOnboarding) {
    window.setTimeout(() => syncUrl(), 0);
  }
}

document.addEventListener('click', handleClick);
document.addEventListener('input', handleField);
document.addEventListener('change', handleChange);
document.addEventListener('submit', handleSubmit);
document.addEventListener('keydown', handleKeydown);
window.addEventListener('beforeunload', () => persist());

boot();
