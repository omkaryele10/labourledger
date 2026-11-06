import { chromium } from 'playwright';
import path from 'node:path';
import { generateLicenseKey } from '../assets/js/license.js';

const base = process.env.BASE_URL || 'http://127.0.0.1:4174';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`OK ${message}`);
}

await page.goto(`${base}/app/?onboarding=1`, { waitUntil: 'networkidle' });
await page.fill('#obFirm', 'Pilot Test & Co');
await page.fill('#obPartner', 'CA Test');
await page.click('#onboardingForm button[type=submit]');
await page.waitForSelector('.page-title');

for (let i = 1; i <= 3; i += 1) {
  await page.click('.app-topbar [data-action="new-audit"]');
  await page.waitForSelector('#clientName');
  await page.fill('#clientName', `Client ${i}`);
  await page.click('[data-action="back-dashboard"]');
  await page.waitForSelector('.page-title');
}
await page.click('.app-topbar [data-action="new-audit"]');
await page.waitForSelector('#licenseKeyModal');
check(true, 'fourth audit is gated by the free pilot');

const key = generateLicenseKey();
await page.fill('#licenseKeyModal', key);
await page.click('#licenseFormModal button[type=submit]');
await page.waitForTimeout(300);
check((await page.locator('#topbarPlan').innerText()).toUpperCase().includes('FIRM'), 'licence key activates the firm plan');
check((await page.locator('#licenseKeyModal').count()) === 0, 'activation closes the plan modal');

await page.click('.app-topbar [data-action="new-audit"]');
await page.waitForSelector('#clientName');
check(true, 'licensed firm can create a fourth audit');

await page.goto(`${base}/app/?view=settings&tab=data`, { waitUntil: 'networkidle' });
await page.waitForSelector('.settings-layout');
const downloadPromise = page.waitForEvent('download');
await page.click('[data-action="export-data"]');
const download = await downloadPromise;
const target = path.join(process.cwd(), 'labourledger', 'tests', 'out', 'backup.json');
await download.saveAs(target);
check(true, 'backup export downloads');

check(errors.length === 0, `no browser errors${errors.length ? `: ${errors.slice(0, 4).join(' | ')}` : ''}`);
await browser.close();
console.log('Monetisation flows passed.');
