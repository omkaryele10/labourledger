# LabourLedger

**White-label Labour Code readiness assessments for Indian CA, HR and labour-law firms.**

LabourLedger turns a client’s payroll data and HR answers into a client-ready report: applicability under the four Labour Codes, the 50% wage-rule cost impact, a 25-point gap assessment, a findings register, a 90-day action plan, a compliance calendar, a document checklist, citations and a reviewer sign-off block.

It is a drafting and audit-support tool for qualified professionals. It is not legal advice.

---

## Why this exists

The four Labour Codes came into force on 21 November 2025. CA firms are being asked to audit clients against a new wage definition, new registers, POSH reporting, contract-labour records and social-security obligations. Most firms still build the report in Word/Excel, two days per client.

The product is built for the firm, not the client:

- the firm keeps the judgement and signs the report;
- the app does the structure, arithmetic, citations and formatting;
- the report carries the firm’s logo, reviewer and disclaimer;
- client data stays in the firm’s browser.

---

## Features

- **Client audit workspace** — multiple clients, status, search, duplicate, delete.
- **Applicability matrix** — Code on Wages, Social Security, Industrial Relations, OSH, POSH, contract labour, standing orders; firm override with a recorded position.
- **50% wage engine** — current vs proposed basic, CTC-neutral allowance reduction, PF, gratuity, bonus, annual employer impact, employee PF impact.
- **25-point assessment** — wages, social security, working conditions, contract labour/IR, POSH/safety; weighted category scores, completion and risk.
- **White-label PDF** — cover, executive summary, applicability, wage analysis, full 25-point matrix, findings register, 30/60/90 plan, calendar, document checklist, sources, disclaimer, reviewer sign-off.
- **Firm profile** — logo, brand colour, reviewer name/designation/membership, disclaimer.
- **Local-first** — browser storage, JSON backup/import, no cloud database.
- **Licence** — 3-audit free pilot; offline firm licence; 7-day trial; no per-client fee.

---

## Run locally

```powershell
python -m http.server 4174 --bind 127.0.0.1 --directory labourledger
```

Open `http://127.0.0.1:4174/`.

The app is at `/app/`.

---

## Tests

```powershell
node --test labourledger/tests/*.test.mjs
node labourledger/tests/e2e.mjs
node labourledger/tests/flows.mjs
```

- Engine tests cover the 50% wage rule, PF ceiling/no-ceiling, allowance reduction, applicability thresholds, scoring, risk override, currency and the sample audit.
- E2E covers landing, calculator, onboarding, sample audit, 7-page PDF, assessment interaction, settings and mobile.
- Flows cover the free-audit gate, licence activation, fourth audit and backup export.

Generated evidence lives in `labourledger/tests/out/`.

---

## Architecture

- Static HTML/CSS/JS. No backend and no build step.
- `assets/js/engine.js` — pure assessment and wage engine.
- `assets/js/store.js` — localStorage state, audit CRUD, backup/import.
- `assets/js/license.js` — offline key validation, trial.
- `assets/js/pdf.js` — jsPDF report generator.
- `assets/js/app.js` — workspace UI.
- `assets/vendor/jspdf.umd.min.js` — PDF engine.
- `sample-report.pdf` — generated sample for sales.

---

## Pricing / monetisation

- **Free pilot:** 3 audits.
- **Per report:** ₹999.
- **Firm licence:** ₹9,999/year, unlimited audits, white-label, updates, export.

Set the checkout URL in `assets/js/config.js`:

```js
checkoutUrl: 'https://your-checkout-link'
```

Until then, `orderUrl` opens a licence-request issue. Replace it before launch.

Generate licence keys with:

```powershell
node labourledger/tools/make-license.mjs 10
```

---

## Deploy

The user wants the project under the `omkaryele10` Vercel account, not the Relish Infosoft team.

```powershell
vercel login
# sign in as omkaryele10, or set a token:
$env:VERCEL_TOKEN='...'
vercel link --yes --project labourledger --scope omkaryele10
vercel --prod
```

Deploy from the `labourledger` directory (or pass it as the project path). The `vercel.json` in this folder handles clean URLs, redirects, security headers and asset caching.

---

## Legal and delivery guardrails

- The report says, in the app and in the PDF, that it is a drafting/audit-support tool and not legal advice.
- State rules, thresholds and notifications vary. The report includes a state note and asks the firm to verify before issue.
- The 50% wage model assumes HRA/other allowances are excluded components; the report flags the alternative classification.
- The signing professional remains responsible for the final report.
- Before selling, have a labour-law professional review the citation set, the wage assumptions and the disclaimer.

---

## Known limitations (v1)

- State-specific registers and forms are flagged, not fully generated.
- The model is indicative, not an actuarial or payroll-system calculation.
- No multi-user sync; data is per browser/device. Use JSON export for backup.
- No client portal or e-signature.
- Licence keys are offline and can be shared; upgrade to Gumroad/online verification if volume justifies it.
