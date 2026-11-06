import {
  createAuditRecord,
  sampleAudit as makeSampleAudit,
  QUESTIONS,
  DOCUMENTS,
  DEFAULT_CLIENT,
  DEFAULT_WAGES,
  todayISO,
} from './engine.js';
import { CONFIG } from './config.js';

export const STORAGE_KEY = 'labourledger_state_v1';
export const LICENSE_KEY = 'labourledger_license_v1';

export const DEFAULT_DISCLAIMER = `LabourLedger is a document automation and audit-support tool for qualified professionals. It does not provide legal advice, a legal opinion, or a guarantee of compliance. Applicability, thresholds, state rules and statutory interpretations vary and must be verified against the latest official notifications and the client's specific facts. The signing professional remains responsible for the final report and the advice given to the client.`;

export const DEFAULT_SETTINGS = {
  firm: {
    name: '',
    partner: '',
    designation: '',
    membership: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo: '',
    accent: '#102A43',
  },
  reviewer: {
    name: '',
    designation: '',
    membership: '',
  },
  disclaimer: DEFAULT_DISCLAIMER,
  auditPrefix: 'LLA',
  nextNumber: 1,
  createdAt: new Date().toISOString(),
};

export function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function deepMerge(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    if (override && typeof override === 'object') {
      for (const key of Object.keys(override)) {
        out[key] = key in base ? deepMerge(base[key], override[key]) : override[key];
      }
    }
    return out;
  }
  return override === undefined ? base : override;
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function auditNumber(prefix = 'LLA', nextNumber = 1) {
  return `${prefix || 'LLA'}-${String(Math.max(1, Number(nextNumber) || 1)).padStart(4, '0')}`;
}

export function freshState() {
  return {
    version: 1,
    settings: structuredCloneSafe(DEFAULT_SETTINGS),
    audits: [],
    activeAuditId: null,
    onboardingComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function safeStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__labourledger_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    // Private mode / blocked storage. The app still works for this session.
  }
  return null;
}

export function loadState(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    const state = freshState();
    state.settings = deepMerge(DEFAULT_SETTINGS, parsed.settings || {});
    state.audits = Array.isArray(parsed.audits) ? parsed.audits.filter(Boolean) : [];
    state.onboardingComplete = Boolean(parsed.onboardingComplete);
    state.activeAuditId = parsed.activeAuditId || null;
    state.audits = state.audits.map((audit) => normalizeAudit(audit));
    return state;
  } catch {
    return freshState();
  }
}

export function normalizeAudit(audit) {
  const base = createAuditRecord({});
  return {
    ...base,
    ...audit,
    client: { ...DEFAULT_CLIENT, ...(audit.client || {}) },
    wages: { ...DEFAULT_WAGES, ...(audit.wages || {}) },
    answers: { ...base.answers, ...(audit.answers || {}) },
    documents: { ...base.documents, ...(audit.documents || {}) },
    reviewer: { ...base.reviewer, ...(audit.reviewer || {}) },
  };
}

export function saveState(state, storage = safeStorage()) {
  try {
    state.updatedAt = new Date().toISOString();
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadLicense(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(LICENSE_KEY);
    if (!raw) return { key: '', trialExpiry: '' };
    const parsed = JSON.parse(raw);
    return { key: String(parsed.key || ''), trialExpiry: String(parsed.trialExpiry || '') };
  } catch {
    return { key: '', trialExpiry: '' };
  }
}

export function saveLicense(data, storage = safeStorage()) {
  try {
    storage?.setItem(LICENSE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function createAudit(settings, seed = null) {
  const audit = createAuditRecord(settings);
  const number = auditNumber(settings.auditPrefix, settings.nextNumber);
  return normalizeAudit({
    ...audit,
    ...seed,
    id: newId(),
    number,
    createdAt: todayISO(),
    updatedAt: new Date().toISOString(),
    client: { ...audit.client, ...(seed?.client || {}) },
    wages: { ...audit.wages, ...(seed?.wages || {}) },
    answers: { ...audit.answers, ...(seed?.answers || {}) },
    documents: { ...audit.documents, ...(seed?.documents || {}) },
    reviewer: { ...audit.reviewer, ...(seed?.reviewer || {}) },
  });
}

export function sampleAudit(settings) {
  const demo = makeSampleAudit(settings);
  return normalizeAudit({
    ...demo,
    id: newId(),
    number: auditNumber(settings.auditPrefix, settings.nextNumber),
    createdAt: todayISO(),
    updatedAt: new Date().toISOString(),
    reviewer: {
      name: settings.reviewer?.name || settings.firm?.partner || CONFIG.demo.partner,
      designation: settings.reviewer?.designation || settings.firm?.designation || CONFIG.demo.designation,
      membership: settings.reviewer?.membership || settings.firm?.membership || CONFIG.demo.membership,
    },
  });
}

export function duplicateAudit(audit, settings) {
  return normalizeAudit({
    ...structuredCloneSafe(audit),
    id: newId(),
    number: auditNumber(settings.auditPrefix, settings.nextNumber),
    status: 'draft',
    createdAt: todayISO(),
    updatedAt: new Date().toISOString(),
  });
}

export function auditDisplayName(audit) {
  return audit?.client?.name?.trim() || 'Untitled client';
}

export function sortAudits(audits) {
  return [...audits].sort((a, b) => {
    const aDate = a.updatedAt || a.createdAt || '';
    const bDate = b.updatedAt || b.createdAt || '';
    return String(bDate).localeCompare(String(aDate));
  });
}

export function exportState(state) {
  return JSON.stringify(
    {
      app: 'LabourLedger',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      audits: state.audits,
    },
    null,
    2
  );
}

export function importState(json, currentState = freshState()) {
  const parsed = JSON.parse(json);
  if (!parsed || !Array.isArray(parsed.audits)) throw new Error('This file does not contain LabourLedger audits.');
  return {
    ...currentState,
    settings: deepMerge(DEFAULT_SETTINGS, parsed.settings || currentState.settings),
    audits: parsed.audits.map(normalizeAudit),
    onboardingComplete: true,
  };
}
