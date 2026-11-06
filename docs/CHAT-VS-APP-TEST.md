# Chat Model vs LabourLedger — controlled comparison

**Date:** 6 November 2026  
**Purpose:** Test whether a general chat model (a proxy for ChatGPT/Claude) produces a better client-ready labour-code audit than LabourLedger, using the same client facts.

**Caveat:** This environment does not have logged-in ChatGPT or Claude accounts. The test used three independent general-purpose LLM subagents with the same prompt and facts. Treat this as a proxy, not a formal benchmark of OpenAI/Anthropic models. A real pilot should repeat the test with the firm's own ChatGPT/Claude workflow.

---

## Test design

- Same client: Sahyadri Precision Components Pvt Ltd, Pune, 120 employees, 35 contract workers, ₹42 crore turnover, FY 2026–27.
- Same facts: average monthly CTC ₹42,000; basic 38%, HRA 22%, other allowances 40%; PF/ESI registered; bonus applicable; EPF ceiling applied; POSH policy/ICC exist but annual report unfiled; overtime records incomplete; contractor records partial; standing orders not certified; works committee not constituted; equal-remuneration policy missing; maternity records incomplete.
- Chat side: three independent runs, asked to produce a client-ready "Labour Code Readiness Assessment" with applicability, 50% wage calculation, 25-point gap assessment, findings/citations, 30/60/90 plan, calendar, checklist, disclaimer.
- App side: LabourLedger generated the sample audit and a 7-page white-label PDF from its deterministic engine.

---

## Correct core arithmetic (verified by the tested engine)

| Item | Correct value |
|---|---:|
| Current basic (38% × ₹42,000) | ₹15,960 |
| 50% wage floor | ₹21,000 |
| Basic increase | ₹5,040 |
| Allowance reduction to keep CTC neutral | ₹5,040 |
| Employer PF delta (EPF ceiling ₹15,000) | ₹0 |
| Gratuity provision delta (4.81% of basic increase) | ₹242.42 / month |
| Bonus provision delta (8.33% of basic increase) | ₹419.83 / month |
| Indicative annual employer impact (120 employees) | **₹9,53,640** |
| Employee PF impact (ceiling) | ₹0 |

Note: the 50% test depends on whether HRA/other allowances are genuinely excluded components. If they are ordinary wages, the client may already meet the test. The app now flags this caveat in the report.

---

## What the three chat runs produced

| Item | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Overall risk | High | High | High |
| Current basic | ₹15,960 | ₹15,960 | ₹15,960 |
| Proposed basic | ₹21,000 | ₹21,000 | ₹21,000 |
| Basic increase | ₹5,040 | ₹5,040 | ₹5,040 |
| Gratuity impact | ₹3.49 L | **₹41.87 L** | ₹3.49 L |
| Bonus impact | Nil (claim) | Nil (claim) | ₹6.05 L upper bound |
| Total core impact | ₹7.68 L base / ₹32.87 L aggregate | **₹41.87 L** | **₹3.49 L–₹9.54 L** |
| 25-point assessment | Yes | Yes | Yes |
| Citations | Present, some questionable | Present, some questionable | Present, some questionable |
| White-label PDF | No | No | No |
| Page layout / cover | No | No | No |
| Audit trail / saved answers | No | No | No |
| Local client data | No | No | No |

### Key errors found

1. **Run 2: 12× gratuity error.** It calculated `₹5,040 × 15/26 × 12 × 120 = ₹41,87,077`. The correct annual gratuity accrual is `₹5,040 × 15/26 × 120 = ₹3,48,923`. The `× 12` double-counts the monthly increase. This is a material error in a client-facing report.
2. **Run 1: contract-labour threshold confusion.** It says 35 workers exceed the 20-worker threshold and treats contract labour as applicable, without clearly separating the legacy CLRA threshold from the OSH Code's 50-worker threshold. That changes the registration conclusion.
3. **Run 1: inflated aggregate.** It adds leave-with-wages and illustrative overtime to the wage impact, producing ₹32.87 lakh. Those may be real exposures, but they are not comparable to the core 50% restructuring cost without explicit scope and assumptions.
4. **Run 2: "contingent" framing is useful, but the number is still wrong.** It correctly notes that if "other allowances" are ordinary wages the structure may already comply, but then computes a ₹41.87 lakh gratuity impact on a stress case. A partner could repeat the wrong number.
5. **Citation inconsistency across runs.** Section references differ (e.g., standing orders cited as s.6 in one run, s.28 in another; wages definition cited as s.2(88) vs s.2(y)). At least one is wrong. The app avoids exact-section overclaiming by citing the Act/chapter and the specific s.2(y) 50% proviso.
6. **No deliverable.** All three outputs are Markdown text. A CA still has to put them into the firm's template, add a cover, logo, page numbers, reviewer block and disclaimer.
7. **No state of record.** The chat has no saved answer set, evidence checklist, document status, version, reviewer sign-off or audit trail.

---

## Where chat is genuinely better

- **Nuance on allowance classification.** Run 2 caught the contingent nature of the 50% test better than the app's original default. The app now adds this caveat.
- **Narrative quality.** The chat reports read like a partner's memo. A good model can handle unusual fact patterns and explain trade-offs.
- **One-off speed and cost.** For a single client, a capable CA with a good prompt can get a useful draft quickly and cheaply.
- **Flexibility.** Chat can answer follow-up questions and draft client emails around the report.

---

## Where LabourLedger wins

- **Deterministic arithmetic.** The engine is unit-tested; the same inputs produce the same numbers. Chat runs disagreed by a factor of 12 on gratuity.
- **Consistency.** Three chat runs produced different findings counts, costs and section references. The app is reproducible.
- **A real deliverable.** 7-page white-label PDF with cover, firm logo, reviewer block, 25-point matrix, findings register, 30/60/90 plan, calendar, document checklist, sources and disclaimer.
- **Evidence and audit trail.** Every answer and document status is saved locally. The report can be regenerated.
- **Privacy.** Client payroll data stays in the browser; it is not sent to a chat provider.
- **Firm economics.** One workflow across 20–80 clients, not one prompt per client.

---

## Scorecard (directional, not scientific)

Scale: 1 = poor, 5 = strong.

| Criterion | LabourLedger | Chat run 1 | Chat run 2 | Chat run 3 |
|---|---:|---:|---:|---:|
| Arithmetic accuracy | **5** | 3 | 1 | 4 |
| Applicability / threshold accuracy | **4** | 3 | 4 | 4 |
| Citation discipline | **4** | 2 | 3 | 3 |
| 25-point coverage | **5** | 4 | 4 | 5 |
| Findings / risk quality | **4** | 4 | 4 | 5 |
| Actionability | **4** | 4 | 4 | 4 |
| White-label deliverable | **5** | 1 | 1 | 1 |
| Consistency / determinism | **5** | 2 | 1 | 2 |
| Privacy / audit trail | **5** | 1 | 1 | 1 |
| **Total / 45** | **41** | **24** | **23** | **29** |

---

## Verdict

**For a one-off draft, a strong chat model is competitive and can be more nuanced.** It is not reliably better: in this test, one run produced a 12× gratuity error, and all runs disagreed on citations and cost scope. None produced a client-ready, white-label document with an audit trail.

**For a CA firm producing audits across a client base, LabourLedger wins — but only because it is a workflow, not a chat wrapper.** If the product is sold as “AI writes your audit,” it loses to ChatGPT/Claude. If it is sold as the deterministic calculation, evidence and white-label report system, chat is a feature, not a substitute.

**Next validation step:** run the same test with a real CA firm using its own ChatGPT/Claude + Word workflow. Measure time to client-ready PDF, number of corrections before sign-off, and whether the firm would put its name on the output. That is the only test that matters.
