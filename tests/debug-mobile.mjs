import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await context.newPage();
await page.goto('http://127.0.0.1:4174/app/?onboarding=1', { waitUntil: 'networkidle' });
await page.fill('#obFirm', 'Deshmukh & Associates');
await page.click('#onboardingForm button[type=submit]');
await page.waitForSelector('.page-title');
await page.click('[data-action="load-sample"]');
await page.waitForSelector('.editor-layout');
const result = await page.evaluate(() => ({
  inner: innerWidth,
  doc: document.documentElement.scrollWidth,
  body: document.body.scrollWidth,
  main: document.querySelector('.app-main').getBoundingClientRect().width,
  content: document.querySelector('.app-content').getBoundingClientRect().width,
  layout: document.querySelector('.editor-layout').getBoundingClientRect().width,
  panel: document.querySelector('.form-panel').getBoundingClientRect().width,
  grid: document.querySelector('.form-grid').getBoundingClientRect().width,
  input: document.querySelector('.input').getBoundingClientRect().width,
  overflow: [...document.querySelectorAll('*')]
    .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
    .slice(0, 12)
    .map((el) => `${el.tagName}.${String(el.className).slice(0, 60)} right=${Math.round(el.getBoundingClientRect().right)}`),
}));
console.log(result);
await browser.close();
