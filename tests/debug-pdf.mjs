import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'log') console.log('PAGE', m.text()); });
await page.goto('http://127.0.0.1:4174/app/?onboarding=1', { waitUntil: 'networkidle' });
await page.fill('#obFirm', 'Deshmukh & Associates');
await page.click('#onboardingForm button[type=submit]');
await page.waitForSelector('.page-title');
await page.click('[data-action="load-sample"]');
await page.waitForSelector('.editor-layout');
await page.evaluate(() => {
  const api = window.jspdf.jsPDF.API;
  const orig = api.splitTextToSize;
  api.splitTextToSize = function (text, width) {
    const result = orig.call(this, text, width);
    if (String(text).startsWith('The client shows')) {
      console.log('SPLIT width=' + width + ' lines=' + result.length + ' lens=' + result.map((l) => l.length).join(','));
      console.log('FONT ' + this.internal.getFontSize() + ' ' + this.internal.getFont().fontName);
    }
    return result;
  };
});
const download = page.waitForEvent('download');
await page.locator('[data-action="download-pdf"]').first().click();
await download;
await browser.close();
