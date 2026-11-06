import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freshState,
  createAudit,
  sampleAudit,
  duplicateAudit,
  sortAudits,
  exportState,
  importState,
  normalizeAudit,
  DEFAULT_SETTINGS,
} from '../assets/js/store.js';

test('fresh state has default settings and no audits', () => {
  const state = freshState();
  assert.equal(state.audits.length, 0);
  assert.equal(state.settings.firm.name, '');
  assert.equal(state.settings.auditPrefix, 'LLA');
});

test('createAudit uses the configured number and defaults', () => {
  const settings = { ...DEFAULT_SETTINGS, nextNumber: 7 };
  const audit = createAudit(settings);
  assert.equal(audit.number, 'LLA-0007');
  assert.equal(audit.status, 'draft');
  assert.equal(audit.client.state, 'Maharashtra');
  assert.equal(Object.keys(audit.answers).length, 25);
});

test('sample audit is complete enough to produce a report', () => {
  const audit = sampleAudit(DEFAULT_SETTINGS);
  assert.ok(audit.client.name.includes('Sahyadri'));
  assert.equal(audit.status, 'in-review');
  assert.equal(Object.values(audit.answers).filter((a) => a !== 'na').length, 24);
  assert.equal(audit.answers.I5, 'na');
  assert.ok(Object.values(audit.documents).filter(Boolean).length > 5);
});

test('duplicate gets a new id and number', () => {
  const settings = { ...DEFAULT_SETTINGS, nextNumber: 3 };
  const audit = sampleAudit(settings);
  const copy = duplicateAudit(audit, settings);
  assert.notEqual(copy.id, audit.id);
  assert.equal(copy.number, 'LLA-0003');
  assert.equal(copy.status, 'draft');
});

test('export/import round-trips audits and settings', () => {
  const state = freshState();
  state.settings.firm.name = 'Test & Co';
  state.audits.push(sampleAudit(state.settings));
  const json = exportState(state);
  const imported = importState(json, freshState());
  assert.equal(imported.settings.firm.name, 'Test & Co');
  assert.equal(imported.audits.length, 1);
  assert.equal(imported.audits[0].client.name, 'Sahyadri Precision Components Pvt Ltd');
});

test('normalizeAudit fills missing answer and document keys', () => {
  const audit = normalizeAudit({ id: 'x', client: { name: 'A' }, answers: { W1: 'yes' }, documents: { posh: true } });
  assert.equal(audit.answers.W1, 'yes');
  assert.equal(audit.answers.W2, 'na');
  assert.equal(audit.documents.posh, true);
  assert.equal(audit.documents['wage-register'], false);
});

test('sortAudits puts the most recently updated first', () => {
  const a = { id: 'a', updatedAt: '2026-01-01T00:00:00Z' };
  const b = { id: 'b', updatedAt: '2026-02-01T00:00:00Z' };
  assert.deepEqual(sortAudits([a, b]).map((x) => x.id), ['b', 'a']);
});
