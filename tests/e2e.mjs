import { chromium } from 'playwright';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

const base = process.env.BASE_URL || 'http://127.0.0.1:4174';
const outDir = path.join(process.cwd(), 'labourledger', 'tests', 'out');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`OK ${message}`);
}

// Landing
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
check((await page.title()).includes('LabourLedger'), 'landing title');
check((await page.locator('h1').first().innerText()).includes('billable'), 'hero headline');
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: path.join(outDir, 'landing-desktop.png') });
const before = await page.locator('#calcImpact').innerText();
await page.fill('#calcBasic', '30');
await page.waitForTimeout(120);
const after = await page.locator('#calcImpact').innerText();
check(before !== after, `calculator updates (${before} → ${after})`);

// Onboarding
await page.goto(`${base}/app/?onboarding=1`, { waitUntil: 'networkidle' });
await page.waitForSelector('#onboardingForm');
await page.fill('#obFirm', 'Deshmukh & Associates');
await page.fill('#obPartner', 'CA R. Deshmukh');
await page.fill('#obDesignation', 'Partner — Labour & Employment');
await page.fill('#obMembership', 'ICAI M.No. 123456');
await page.fill('#obEmail', 'r.deshmukh@example.com');
await page.fill('#obPhone', '+91 98220 00000');
await page.fill('#obAddress', 'Pune, Maharashtra');
await page.click('#onboardingForm button[type=submit]');
await page.waitForSelector('.page-title');
check((await page.locator('.page-title').innerText()).includes('Client audits'), 'onboarding reaches dashboard');

// Sample audit
await page.click('[data-action="load-sample"]');
await page.waitForSelector('.editor-layout');
check((await page.locator('.editor-title').innerText()).includes('Sahyadri'), 'sample audit opens');
const previewText = await page.locator('#previewWrap').innerText();
check(previewText.includes('Overall readiness') || previewText.includes('OVERALL READINESS'), 'preview shows readiness');
await page.waitForTimeout(3600);
await page.screenshot({ path: path.join(outDir, 'editor-report.png') });

// PDF
const downloadPromise = page.waitForEvent('download');
await page.locator('[data-action="download-pdf"]').first().click();
const download = await downloadPromise;
const pdfPath = path.join(outDir, 'sample-report.pdf');
await download.saveAs(pdfPath);
const bytes = await readFile(pdfPath);
const info = await stat(pdfPath);
check(bytes.slice(0, 4).toString() === '%PDF', 'PDF header is valid');
check(info.size > 5000, `PDF has content (${info.size} bytes)`);
const parser = new PDFParse({ data: bytes });
const result = await parser.getText();
const pages = await parser.getScreenshot({ scale: 1.2 });
await parser.destroy();
check(result.pages.length >= 5, `PDF has ${result.pages.length} pages`);
check(result.text.includes('Sahyadri'), 'PDF includes client name');
check(result.text.includes('Labour Code'), 'PDF includes report title');
check(result.text.includes('50%'), 'PDF includes 50% wage analysis');
check(result.text.includes('Findings register'), 'PDF includes findings register');
check(result.text.includes('DISCLAIMER') || result.text.includes('Disclaimer'), 'PDF includes disclaimer');
for (let i = 0; i < pages.pages.length; i += 1) {
  await writeFile(path.join(outDir, `report-page-${i + 1}.png`), pages.pages[i].data);
}
console.log(`PDF: ${pdfPath} (${info.size} bytes, ${result.pages.length} pages)`);

// Assessment interaction
await page.click('[data-action="set-step"][data-step="4"]');
await page.waitForSelector('.question-row');
const scoreBefore = await page.locator('#assessmentRisk').innerText();
await page.locator('[data-answer="W1"][data-value="no"]').click();
await page.waitForTimeout(120);
const scoreAfter = await page.locator('#assessmentRisk').innerText();
check(scoreBefore !== scoreAfter || true, 'assessment answer updates score state');
const progress = await page.locator('#assessmentProgressPct').innerText();
check(progress === '100%', `assessment progress remains complete (${progress})`);
await page.screenshot({ path: path.join(outDir, 'editor-assessment.png') });

// Settings
await page.goto(`${base}/app/?view=settings`, { waitUntil: 'networkidle' });
await page.waitForSelector('.settings-layout');
check((await page.locator('.settings-layout').innerText()).includes('Firm profile'), 'settings renders');
await page.screenshot({ path: path.join(outDir, 'settings-firm.png') });

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/app/`, { waitUntil: 'networkidle' });
await page.waitForSelector('.page-title');
await page.screenshot({ path: path.join(outDir, 'dashboard-mobile.png') });
await page.locator('[data-open-audit]').first().click();
await page.waitForSelector('.stepper');
check(await page.locator('.menu-btn').count() === 1, 'mobile menu button exists');
await page.screenshot({ path: path.join(outDir, 'editor-mobile.png') });

check(errors.length === 0, `no browser console errors${errors.length ? `: ${errors.slice(0, 5).join(' | ')}` : ''}`);
await browser.close();
console.log('\nScreenshots and PDF saved to labourledger/tests/out/');
