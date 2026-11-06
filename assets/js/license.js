/**
 * LabourLedger offline license + trial logic.
 * Keys look like: LL-7KQ2M-9XW4A-3F8RT
 * The final group is a checksum of the first two groups plus a salt.
 * This stops casual sharing, not a determined attacker.
 * For stronger validation, connect CONFIG.gumroadProductId.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SALT = 'labourledger-2026-v1';
const KEY_RE = /^LL-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;

function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function encodeBase32(num, length = 5) {
  let n = num >>> 0;
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out = ALPHABET[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return out;
}

export function checksumFor(payload) {
  return encodeBase32(fnv1a(`${payload}:${SALT}`), 5);
}

export function normalizeKey(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^LL/, '');
}

export function isValidKey(input) {
  const raw = String(input || '').trim().toUpperCase();
  if (!KEY_RE.test(raw)) return false;
  const parts = raw.split('-');
  const payload = `${parts[1]}${parts[2]}`;
  return checksumFor(payload) === parts[3];
}

export function formatKey(input) {
  const body = normalizeKey(input).slice(0, 15);
  if (body.length !== 15) return input;
  return `LL-${body.slice(0, 5)}-${body.slice(5, 10)}-${body.slice(10, 15)}`;
}

export function generateLicenseKey(randomFn) {
  const rnd = randomFn || (() => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] / 0xffffffff;
    }
    return Math.random();
  });
  let payload = '';
  for (let i = 0; i < 10; i += 1) {
    payload += ALPHABET[Math.floor(rnd() * ALPHABET.length) % ALPHABET.length];
  }
  return `LL-${payload.slice(0, 5)}-${payload.slice(5, 10)}-${checksumFor(payload)}`;
}

export function startTrial(now = Date.now(), days = 7) {
  const start = new Date(now);
  start.setDate(start.getDate() + days);
  return start.toISOString();
}

export function trialDaysLeft(trialExpiry, now = Date.now()) {
  if (!trialExpiry) return 0;
  const ms = new Date(trialExpiry).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

export function getLicenseState({ key = '', trialExpiry = '', now = Date.now() } = {}) {
  if (isValidKey(key)) {
    return { pro: true, plan: 'pro', daysLeft: null, reason: 'license' };
  }
  const days = trialDaysLeft(trialExpiry, now);
  if (days > 0) {
    return { pro: true, plan: 'trial', daysLeft: days, reason: 'trial' };
  }
  return { pro: false, plan: 'free', daysLeft: 0, reason: 'free' };
}

export async function verifyGumroadLicense(licenseKey, productId, fetchImpl = fetch) {
  if (!productId) return { ok: false, message: 'No product configured.' };
  if (!licenseKey) return { ok: false, message: 'Enter a license key.' };
  try {
    const body = new URLSearchParams({
      product_id: productId,
      license_key: licenseKey.trim(),
      increment_uses_count: 'false',
    });
    const res = await fetchImpl('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();
    if (!data.success) return { ok: false, message: data.message || 'That key was not recognized.' };
    if (data.purchase?.refunded || data.purchase?.chargebacked) {
      return { ok: false, message: 'That purchase was refunded.' };
    }
    return { ok: true, message: 'License verified.' };
  } catch {
    return { ok: false, message: 'Could not reach the license server. Your offline key still works.' };
  }
}
