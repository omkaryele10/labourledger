import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateLicenseKey,
  isValidKey,
  formatKey,
  startTrial,
  trialDaysLeft,
  getLicenseState,
} from '../assets/js/license.js';

test('generated LabourLedger keys validate and format', () => {
  let i = 0;
  const seq = [0.11, 0.27, 0.41, 0.58, 0.63, 0.72, 0.84, 0.91, 0.95, 0.99];
  const key = generateLicenseKey(() => seq[i++ % seq.length]);
  assert.match(key, /^LL-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(isValidKey(key), true);
  assert.equal(formatKey(key.replace(/-/g, '')), key);
});

test('tampered keys fail', () => {
  const key = generateLicenseKey(() => 0.42);
  const tampered = key.slice(0, -1) + (key.endsWith('A') ? 'B' : 'A');
  assert.equal(isValidKey(tampered), false);
  assert.equal(isValidKey('LL-AAAAA-AAAAA-AAAAA'), false);
  assert.equal(isValidKey(''), false);
});

test('trial and expiry states are correct', () => {
  const now = Date.parse('2026-11-06T12:00:00Z');
  const expiry = startTrial(now, 7);
  assert.equal(trialDaysLeft(expiry, now), 7);
  assert.equal(getLicenseState({ trialExpiry: expiry, now }).plan, 'trial');
  assert.equal(getLicenseState({ trialExpiry: '2026-11-13T12:00:00Z', now: Date.parse('2026-11-20T12:00:00Z') }).pro, false);
});

test('a valid key activates the firm licence', () => {
  const key = generateLicenseKey(() => 0.5);
  const state = getLicenseState({ key, now: Date.now() });
  assert.equal(state.pro, true);
  assert.equal(state.plan, 'pro');
});
