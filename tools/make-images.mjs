import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const logoSvg = await readFile(path.join(root, 'labourledger/assets/img/logo.svg'), 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });

async function icon(size, file) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:#102A43;display:grid;place-items:center;">
    <div style="width:${Math.round(size * 0.78)}px;height:${Math.round(size * 0.78)}px;">${logoSvg.replace('<svg ', `<svg style="width:100%;height:100%;display:block;" `)}</div>
  </body></html>`);
  await page.screenshot({ path: path.join(root, 'labourledger/assets/img', file) });
  await page.close();
}

await icon(192, 'icon-192.png');
await icon(512, 'icon-512.png');

const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.setContent(`<!doctype html><html><head><style>
  *{box-sizing:border-box} body{margin:0;width:1200px;height:630px;background:#F7F4EC;color:#0B1B2B;font-family:Arial,Helvetica,sans-serif;overflow:hidden}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(11,27,43,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(11,27,43,.05) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,black,transparent 85%)}
  .wrap{position:relative;width:100%;height:100%;padding:56px 64px;display:grid;grid-template-columns:1.06fr .94fr;gap:44px;align-items:center}
  .brand{display:flex;align-items:center;gap:14px;font-size:25px;font-weight:800;letter-spacing:-1px}
  .brand svg{width:50px;height:50px}
  .eyebrow{margin-top:50px;color:#8C6528;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase}
  h1{font-family:Georgia,serif;font-weight:600;font-size:64px;line-height:.98;letter-spacing:-3px;margin:18px 0 0}
  h1 em{font-style:normal;background:#F3E8D4;padding:0 6px}
  p{margin:20px 0 0;font-size:19px;line-height:1.5;color:#5E7183;max-width:520px}
  .cover{position:relative;background:#102A43;border-radius:6px;padding:30px;color:#fff;box-shadow:16px 18px 0 -1px #EFE9DB,0 40px 80px -30px rgba(11,27,43,.45);transform:rotate(-2deg)}
  .cover .top{display:flex;justify-content:space-between;align-items:center;color:rgba(255,255,255,.55);font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase}
  .cover .top svg{width:24px;height:24px}
  .cover h2{font-family:Georgia,serif;font-weight:600;font-size:31px;line-height:1.05;letter-spacing:-1px;margin:24px 0 0}
  .cover .sub{color:rgba(255,255,255,.45);font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-top:7px}
  .client{margin-top:24px;padding-top:14px;border-top:1px solid rgba(255,255,255,.15);font-size:13px;font-weight:700}
  .client small{display:block;margin-top:3px;color:rgba(255,255,255,.4);font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
  .score{display:flex;gap:14px;align-items:center;margin-top:18px;padding:13px;border-radius:6px;background:rgba(255,255,255,.07)}
  .num{width:58px;height:58px;border-radius:50%;background:conic-gradient(#B0833C 75%,rgba(255,255,255,.12) 0);display:grid;place-items:center;position:relative}
  .num:before{content:'';position:absolute;inset:5px;border-radius:50%;background:#102A43}
  .num b{position:relative;font-size:19px}
  .score span{display:block;color:rgba(255,255,255,.45);font-size:8px;text-transform:uppercase;letter-spacing:1px;font-weight:800}
  .score strong{display:block;margin-top:3px;font-size:12px}
  .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:14px;background:rgba(255,255,255,.14);border-radius:5px;overflow:hidden}
  .metric{background:#102A43;padding:9px}
  .metric span{display:block;color:rgba(255,255,255,.42);font-size:7px;text-transform:uppercase;letter-spacing:1px;font-weight:800}
  .metric b{display:block;margin-top:3px;font-size:10px}
  .badge{position:absolute;right:32px;bottom:34px;background:#B0833C;color:#102A43;padding:11px 15px;border-radius:6px;font-size:12px;font-weight:800;box-shadow:0 16px 30px -16px rgba(11,27,43,.5)}
</style></head><body><div class="grid"></div><div class="wrap">
  <div>
    <div class="brand">${logoSvg.replace('<svg ', '<svg style="width:50px;height:50px;" ')} LabourLedger</div>
    <div class="eyebrow">For CA, HR &amp; labour-law firms</div>
    <h1>The audit is billable. The drafting is <em>killing your margin.</em></h1>
    <p>White-label Labour Code readiness reports — applicability, 50% wage impact, 25-point assessment and a 90-day plan.</p>
  </div>
  <div class="cover">
    <div class="top"><span>Deshmukh &amp; Associates</span><span>CONFIDENTIAL</span></div>
    <h2>Labour Code Readiness Assessment</h2>
    <div class="sub">Prepared for the board</div>
    <div class="client">Sahyadri Precision Components Pvt Ltd<small>FY 2026–27 · LLA-0001</small></div>
    <div class="score"><div class="num"><b>75</b></div><div><span>Overall readiness</span><strong>High risk · 8 gaps</strong></div></div>
    <div class="metrics"><div class="metric"><span>Codes</span><b>4</b></div><div class="metric"><span>Wage impact</span><b>Rs. 9.54 L</b></div><div class="metric"><span>Actions</span><b>8</b></div></div>
  </div>
</div></body></html>`);
await og.screenshot({ path: path.join(root, 'labourledger/assets/img/og.png') });
await og.close();
await browser.close();
console.log('Created LabourLedger icons and OG image');
