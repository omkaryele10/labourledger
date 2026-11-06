import { chromium } from 'playwright';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://127.0.0.1:4174';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

await page.goto(`${base}/`, { waitUntil: 'networkidle' });
console.log('TITLE', await page.title());
console.log('H1', (await page.locator('h1').first().innerText()).slice(0, 120));
console.log('CALC', await page.locator('#calcImpact').innerText());
await page.screenshot({ path: path.join('labourledger', 'tests', 'landing.png') });

await page.goto(`${base}/app/?onboarding=1`, { waitUntil: 'networkidle' });
console.log('ONBOARD', await page.locator('#onboardingForm').count());
await page.fill('#obFirm', 'Deshmukh & Associates');
await page.fill('#obPartner', 'CA R. Deshmukh');
await page.fill('#obDesignation', 'Partner — Labour & Employment');
await page.fill('#obMembership', 'ICAI M.No. 123456');
await page.fill('#obEmail', 'r@example.com');
await page.fill('#obPhone', '+91 98220 00000');
await page.fill('#obAddress', 'Pune');
await page.click('#onboardingForm button[type=submit]');
await page.waitForTimeout(400);
console.log('PAGE', await page.locator('.page-title').innerText());
await page.screenshot({ path: path.join('labourledger', 'tests', 'dashboard.png') });
console.log('ERRORS', JSON.stringify(errors));

await browser.close();
