import {
  formatINR,
  formatINRShort,
  formatDate,
  riskLabel,
  todayISO,
} from './engine.js';

const NAVY = [16, 42, 67];
const INK = [11, 27, 43];
const BRASS = [176, 131, 60];
const BRASS_LIGHT = [233, 199, 126];
const MUTED = [94, 113, 131];
const LINE = [220, 227, 232];
const PAPER = [247, 244, 236];
const SAGE = [47, 107, 94];
const RED = [180, 35, 24];
const AMBER = [181, 71, 8];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

function hexToRgb(hex) {
  const clean = String(hex || '#102A43').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return NAVY;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function safePart(value) {
  return String(value || 'report')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'report';
}

function initials(name) {
  const stop = new Set(['&', 'and', 'pvt', 'ltd', 'llp', 'inc', 'co', 'company', 'the', 'of']);
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter((p) => {
      const key = p.toLowerCase().replace(/[^a-z]/g, '');
      return key && !stop.has(key);
    });
  if (!parts.length) return 'LL';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function severityColor(severity) {
  return severity === 'high' ? RED : severity === 'medium' ? AMBER : MUTED;
}

function drawFooterAll(doc, audit, settings, draft) {
  const total = doc.getNumberOfPages();
  const firmName = settings?.firm?.name || 'LabourLedger';
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    if (i === 1) continue;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, 283, PAGE_W - MARGIN, 283);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(`Confidential — prepared for ${audit.client.name || 'the client'}`, MARGIN, 288);
    doc.text(`${firmName}  ·  ${draft ? 'DRAFT  ·  ' : ''}Page ${i} of ${total}`, PAGE_W - MARGIN, 288, { align: 'right' });
  }
}

function drawHeader(doc, audit, settings, draft) {
  const firmName = settings?.firm?.name || 'LabourLedger';
  doc.setFillColor(...BRASS);
  doc.rect(0, 0, PAGE_W, 2.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.setTextColor(...INK);
  doc.text(firmName, MARGIN, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...MUTED);
  doc.text('Labour Code Readiness Assessment', PAGE_W - MARGIN, 11, { align: 'right' });
  doc.setDrawColor(...LINE);
  doc.line(MARGIN, 15, PAGE_W - MARGIN, 15);
  if (draft) {
    doc.setFillColor(255, 250, 235);
    doc.roundedRect(PAGE_W - MARGIN - 22, 18, 22, 6, 1.5, 1.5, 'F');
    doc.setTextColor(...AMBER);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.text('DRAFT', PAGE_W - MARGIN - 11, 22.2, { align: 'center' });
  }
}

function addPage(doc, audit, settings, draft) {
  doc.addPage();
  drawHeader(doc, audit, settings, draft);
  return 24;
}

function ensure(doc, y, needed, audit, settings, draft) {
  if (y + needed <= 276) return y;
  return addPage(doc, audit, settings, draft);
}

function sectionLabel(doc, text, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...BRASS);
  doc.text(String(text).toUpperCase(), MARGIN, y);
  return y + 4;
}

function sectionTitle(doc, title, y, size = 18) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(String(title), CONTENT_W);
  doc.text(lines, MARGIN, y);
  return y + lines.length * (size * 0.42) + 3;
}

function body(doc, text, y, { size = 8.5, color = MUTED, width = CONTENT_W, leading = 4.1 } = {}) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(String(text || ''), width);
  doc.text(lines, MARGIN, y);
  return y + lines.length * leading;
}

function rule(doc, y, color = LINE) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
}

function drawCover(doc, audit, summary, settings, draft) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  doc.setFillColor(...BRASS);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  const firm = settings?.firm || {};
  const logo = firm.logo;
  let brandY = 26;
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', MARGIN, 18, 26, 18, undefined, 'FAST');
      brandY = 42;
    } catch {
      brandY = 26;
    }
  }
  if (!logo) {
    doc.setFillColor(...BRASS);
    doc.roundedRect(MARGIN, 18, 18, 18, 3, 3, 'F');
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(initials(firm.name), MARGIN + 9, 29.5, { align: 'center' });
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(firm.name || 'Your firm', logo ? MARGIN : MARGIN + 24, logo ? 44 : 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(190, 200, 209);
  doc.text([firm.address, firm.email, firm.phone].filter(Boolean).join('  ·  '), logo ? MARGIN : MARGIN + 24, logo ? 49 : 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...BRASS_LIGHT);
  doc.text('CONFIDENTIAL  ·  PREPARED FOR THE BOARD', MARGIN, 74);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(33);
  doc.setTextColor(255, 255, 255);
  doc.text('Labour Code', MARGIN, 96);
  doc.text('Readiness Assessment', MARGIN, 112);

  doc.setDrawColor(...BRASS);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 122, MARGIN + 56, 122);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(190, 200, 209);
  doc.text('Prepared for', MARGIN, 136);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  const clientLines = doc.splitTextToSize(audit.client.name || 'Client name', CONTENT_W - 50);
  doc.text(clientLines, MARGIN, 144);

  const metaY = 164;
  const meta = [
    ['Assessment period', audit.client.auditPeriod || '—'],
    ['Report date', formatDate(todayISO())],
    ['Audit reference', audit.number || '—'],
    ['Prepared by', audit.reviewer?.name || settings?.reviewer?.name || firm.partner || firm.name || '—'],
  ];
  meta.forEach(([label, value], index) => {
    const yy = metaY + index * 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(150, 165, 180);
    doc.text(label, MARGIN, yy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(255, 255, 255);
    doc.text(String(value), MARGIN + 38, yy);
  });

  // Score block
  const boxX = PAGE_W - MARGIN - 58;
  const boxY = 150;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX, boxY, 58, 58, 3, 3, 'F');
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.text('OVERALL READINESS', boxX + 5, boxY + 8);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(String(Math.round(summary.assessment.overall)), boxX + 5, boxY + 26);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('/ 100', boxX + 28, boxY + 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...severityColor(summary.assessment.risk === 'high' ? 'high' : summary.assessment.risk === 'medium' ? 'medium' : 'low'));
  doc.text(riskLabel(summary.assessment.risk).toUpperCase(), boxX + 5, boxY + 35);
  doc.setDrawColor(...LINE);
  doc.line(boxX + 5, boxY + 39, boxX + 53, boxY + 39);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(`${summary.assessment.findings.length} gaps  ·  ${summary.assessment.completion}% assessed`, boxX + 5, boxY + 45);
  doc.text(`${formatINRShort(summary.wage.annualEmployerImpact)} wage impact`, boxX + 5, boxY + 50);

  // Bottom
  doc.setDrawColor(60, 80, 100);
  doc.line(MARGIN, 258, PAGE_W - MARGIN, 258);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(150, 165, 180);
  const disclaimer = settings?.disclaimer || 'This report is a professional drafting aid. It does not constitute legal advice.';
  const dLines = doc.splitTextToSize(disclaimer, CONTENT_W - 28);
  doc.text(dLines.slice(0, 4), MARGIN, 266);
  doc.setTextColor(...BRASS_LIGHT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.text(draft ? 'DRAFT — NOT FOR CLIENT ISSUE' : 'REVIEWED FOR CLIENT ISSUE', PAGE_W - MARGIN, 252, { align: 'right' });
}

function drawExecSummary(doc, audit, summary, settings, draft) {
  let y = addPage(doc, audit, settings, draft);
  y = sectionLabel(doc, '01  Executive summary', y + 2);
  y = sectionTitle(doc, 'What the assessment found.', y + 4);

  const assessment = summary.assessment;
  const wage = summary.wage;
  const color = severityColor(assessment.risk === 'high' ? 'high' : assessment.risk === 'medium' ? 'medium' : 'low');

  // Summary strip
  const stripY = y + 4;
  doc.setFillColor(...PAPER);
  doc.roundedRect(MARGIN, stripY, CONTENT_W, 26, 2, 2, 'F');
  const cells = [
    ['OVERALL SCORE', `${Math.round(assessment.overall)}/100`],
    ['RISK', riskLabel(assessment.risk)],
    ['HIGH FINDINGS', String(summary.highCount)],
    ['WAGE IMPACT', formatINRShort(wage.annualEmployerImpact)],
  ];
  cells.forEach(([label, value], index) => {
    const x = MARGIN + 5 + index * (CONTENT_W / 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(...MUTED);
    doc.text(label, x, stripY + 7);
    doc.setFontSize(12);
    doc.setTextColor(index === 1 ? color[0] : INK[0], index === 1 ? color[1] : INK[1], index === 1 ? color[2] : INK[2]);
    doc.text(String(value), x, stripY + 17);
  });
  y = stripY + 34;

  const readiness = assessment.risk === 'high' ? 'weak' : assessment.risk === 'medium' ? 'moderate' : assessment.risk === 'low' ? 'strong' : 'unclear';
  const narrative = assessment.completion < 80
    ? `The assessment is ${assessment.completion}% complete and should be treated as a draft. Based on the answers recorded, the client shows ${readiness} readiness. The missing answers are themselves a follow-up item: the firm should obtain the underlying evidence before issuing a final view.`
    : `The client shows ${readiness} readiness across the four Labour Codes. ${summary.highCount} high-severity finding${summary.highCount === 1 ? '' : 's'} and ${summary.mediumCount} medium-severity finding${summary.mediumCount === 1 ? '' : 's'} require partner attention. ${wage.compliant ? 'The current basic-pay structure meets the 50% test on the data provided.' : `The current basic-pay structure requires correction to at least ${formatINR(wage.proposed.basic)} per month; the indicative annual employer impact is ${formatINR(wage.annualEmployerImpact)}.`}`;
  y = body(doc, narrative, y, { size: 8.6, leading: 4.4 });
  y += 3;

  // Key exposures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text('Priority exposures', MARGIN, y);
  y += 5;

  const key = summary.keyFindings.slice(0, 3);
  if (!key.length) {
    y = body(doc, 'No high or medium findings were recorded. Maintain the evidence file and monitor updates.', y, { size: 8.2 });
  } else {
    key.forEach((finding, index) => {
      const qLines = doc.splitTextToSize(finding.question, CONTENT_W - 30);
      const aLines = doc.splitTextToSize(finding.action, CONTENT_W - 30);
      const height = 7 + qLines.length * 3.7 + aLines.length * 3.4;
      y = ensure(doc, y, height + 4, audit, settings, draft);
      doc.setFillColor(...severityColor(finding.severity));
      doc.rect(MARGIN, y - 2, 2, Math.min(height, 20), 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...INK);
      doc.text(`${index + 1}. ${qLines[0]}`, MARGIN + 5, y + 1);
      qLines.slice(1).forEach((line, i) => doc.text(line, MARGIN + 5, y + 1 + (i + 1) * 3.7));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.3);
      doc.setTextColor(...MUTED);
      const actionY = y + 1 + qLines.length * 3.7 + 1;
      doc.text(aLines.slice(0, 2), MARGIN + 5, actionY);
      doc.setTextColor(...severityColor(finding.severity));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.text(finding.severity.toUpperCase(), PAGE_W - MARGIN, y + 1, { align: 'right' });
      y = actionY + Math.min(aLines.length, 2) * 3.4 + 4;
    });
  }

  // What this means
  y += 2;
  y = ensure(doc, y, 38, audit, settings, draft);
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, CONTENT_W, 30, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(...BRASS_LIGHT);
  doc.text('WHAT THIS MEANS', MARGIN + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(230, 236, 241);
  const meaning = 'The 50% wage rule is a payroll-design issue, not a formatting issue. Before the client signs off on the assessment, the firm should reconcile the wage structure, PF/ESI coverage, the POSH file and the contract-labour records against the evidence. The remediation plan in this report sequences the work.';
  const mLines = doc.splitTextToSize(meaning, CONTENT_W - 10);
  doc.text(mLines, MARGIN + 5, y + 13);
  y += 36;
  return y;
}

function drawApplicability(doc, audit, summary, settings, draft, y) {
  y = ensure(doc, y, 60, audit, settings, draft);
  y = sectionLabel(doc, '02  Scope & applicability', y + 2);
  y = sectionTitle(doc, 'Which obligations likely apply.', y + 4, 17);
  y = body(doc, 'Applicability is indicative. It is based on the client profile, headcount, contractor count and industry. State rules, notifications and establishment classifications can change the position. The engagement team records its override in the audit file.', y + 1, { size: 8.2 });
  y += 3;

  const cols = [
    { key: 'code', label: 'Code / obligation', width: 54 },
    { key: 'status', label: 'Position', width: 22 },
    { key: 'reason', label: 'Why / what to verify', width: 98 },
  ];
  y = drawTable(doc, y, cols, summary.applicability.map((row) => ({
    code: row.code,
    status: row.status === 'applies' ? 'Applies' : row.status === 'review' ? 'Review' : 'Not indicated',
    reason: `${row.reason} ${row.action ? `Action: ${row.action}` : ''}`,
  })), audit, settings, draft);
  y += 2;

  y = ensure(doc, y, 32, audit, settings, draft);
  doc.setFillColor(...PAPER);
  doc.roundedRect(MARGIN, y, CONTENT_W, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(...BRASS);
  doc.text('STATE NOTE', MARGIN + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(...MUTED);
  const note = summary.stateNote || 'Verify state minimum wages, Professional Tax, Labour Welfare Fund and establishment rules.';
  doc.text(doc.splitTextToSize(note, CONTENT_W - 10), MARGIN + 5, y + 12);
  y += 32;
  return y;
}

function drawTable(doc, y, columns, rows, audit, settings, draft, { fontSize = 7.4, headerFill = NAVY } = {}) {
  const drawHead = (yy) => {
    doc.setFillColor(...headerFill);
    doc.rect(MARGIN, yy, CONTENT_W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(255, 255, 255);
    let x = MARGIN + 2;
    columns.forEach((col) => {
      doc.text(col.label.toUpperCase(), x, yy + 4.6);
      x += col.width;
    });
    return yy + 7;
  };

  y = ensure(doc, y, 12, audit, settings, draft);
  y = drawHead(y);
  rows.forEach((row, index) => {
    const cellLines = columns.map((col) => doc.splitTextToSize(String(row[col.key] ?? ''), col.width - 4));
    const rowH = Math.max(...cellLines.map((lines) => lines.length)) * 3.6 + 3.6;
    if (y + rowH > 274) {
      y = addPage(doc, audit, settings, draft);
      y = drawHead(y);
    }
    if (index % 2 === 1) {
      doc.setFillColor(250, 251, 249);
      doc.rect(MARGIN, y, CONTENT_W, rowH, 'F');
    }
    let x = MARGIN + 2;
    columns.forEach((col, colIndex) => {
      doc.setFont('helvetica', colIndex === 0 ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(...(colIndex === 0 ? INK : MUTED));
      doc.text(cellLines[colIndex], x, y + 4.2);
      x += col.width;
    });
    doc.setDrawColor(...LINE);
    doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);
    y += rowH;
  });
  return y + 1;
}

function drawWage(doc, audit, summary, settings, draft, y) {
  const w = summary.wage;
  y = ensure(doc, y, 70, audit, settings, draft);
  y = sectionLabel(doc, '03  Wage restructuring', y + 2);
  y = sectionTitle(doc, 'The 50% rule, quantified.', y + 4, 17);
  y = body(doc, 'The model keeps the client’s CTC neutral where possible by reducing other allowances. Any unfunded balance and the incremental PF, gratuity and bonus provisions are shown as employer impact. The numbers are indicative and must be reconciled with payroll and state notifications.', y + 1, { size: 8.2 });
  y += 3;

  const rows = [
    { item: 'Basic pay', current: formatINR(w.current.basic), proposed: formatINR(w.proposed.basic) },
    { item: 'HRA', current: formatINR(w.current.hra), proposed: formatINR(w.proposed.hra) },
    { item: 'Other allowances', current: formatINR(w.current.other), proposed: formatINR(w.proposed.other) },
    { item: 'Monthly CTC', current: formatINR(w.monthlyCtc), proposed: formatINR(w.monthlyCtc) },
  ];
  y = drawTable(doc, y, [
    { key: 'item', label: 'Component', width: 66 },
    { key: 'current', label: 'Current', width: 54 },
    { key: 'proposed', label: 'Proposed', width: 54 },
  ], rows, audit, settings, draft);
  y += 3;

  const impactRows = [
    { item: 'Basic pay increase', value: formatINR(w.basicIncrease) },
    { item: 'Allowance reduction to keep CTC neutral', value: formatINR(w.allowanceReduction) },
    { item: 'Employer PF delta (monthly)', value: formatINR(w.employerPfDelta) },
    { item: 'Gratuity provision delta (monthly)', value: formatINR(w.gratuityDelta) },
    { item: 'Bonus provision delta (monthly)', value: formatINR(w.bonusDelta) },
    { item: 'Indicative annual employer impact', value: formatINR(w.annualEmployerImpact) },
    { item: 'Employee PF impact (monthly)', value: formatINR(w.employeePfDelta) },
  ];
  y = drawTable(doc, y, [
    { key: 'item', label: 'Impact line', width: 112 },
    { key: 'value', label: 'Amount', width: 62 },
  ], impactRows, audit, settings, draft);
  y += 3;

  y = ensure(doc, y, 40, audit, settings, draft);
  doc.setFillColor(...PAPER);
  doc.roundedRect(MARGIN, y, CONTENT_W, 34, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(...BRASS);
  doc.text('ASSUMPTIONS', MARGIN + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  const assumptions = w.assumptions.slice(0, 4).map((a, i) => `${i + 1}. ${a}`).join('  ');
  doc.text(doc.splitTextToSize(assumptions, CONTENT_W - 10).slice(0, 4), MARGIN + 5, y + 12);
  y += 40;
  return y;
}

function drawAssessment(doc, audit, summary, settings, draft, y) {
  const assessment = summary.assessment;
  y = ensure(doc, y, 60, audit, settings, draft);
  y = sectionLabel(doc, '04  Assessment results', y + 2);
  y = sectionTitle(doc, 'Where the gaps are.', y + 4, 17);

  const bars = assessment.categories;
  const barX = MARGIN + 58;
  const barW = 90;
  bars.forEach((cat) => {
    const yy = y + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...INK);
    doc.text(cat.label, MARGIN, yy + 3);
    doc.setFillColor(236, 230, 217);
    doc.roundedRect(barX, yy, barW, 4.5, 2, 2, 'F');
    if (cat.score !== null) {
      doc.setFillColor(...(cat.score >= 75 ? SAGE : cat.score >= 50 ? AMBER : RED));
      doc.roundedRect(barX, yy, (barW * cat.score) / 100, 4.5, 2, 2, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(cat.score === null ? 'Not assessed' : `${Math.round(cat.score)} / 100`, PAGE_W - MARGIN, yy + 3.2, { align: 'right' });
    y += 8;
  });
  y += 4;

  y = ensure(doc, y, 20, audit, settings, draft);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text('25-point assessment matrix', MARGIN, y);
  y += 5;
  y = body(doc, 'Every requirement is shown with the client’s answer and the resulting gap severity. “Not assessed” items are follow-ups, not clean results.', y, { size: 7.6 });
  y += 1;
  y = drawTable(doc, y, [
    { key: 'id', label: 'ID', width: 10 },
    { key: 'question', label: 'Requirement', width: 116 },
    { key: 'status', label: 'Status', width: 22 },
    { key: 'severity', label: 'Gap', width: 26 },
  ], summary.matrix.map((row) => ({
    id: row.id,
    question: row.question,
    status: row.status,
    severity: row.severity === '—' ? '—' : row.severity.toUpperCase(),
  })), audit, settings, draft, { fontSize: 6.4 });
  y += 5;

  y = ensure(doc, y, 20, audit, settings, draft);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text('Findings register', MARGIN, y);
  y += 5;
  y = body(doc, 'Severity reflects the potential exposure if the gap is not remediated. Partial answers are treated as medium or low depending on the underlying requirement.', y, { size: 7.6 });
  y += 2;

  if (!assessment.findings.length) {
    y = body(doc, 'No gaps recorded. Maintain the evidence file and review the position when rules or headcount change.', y, { size: 8 });
    return y;
  }

  const dividerX = MARGIN + 104;
  assessment.findings.forEach((finding, index) => {
    const questionLines = doc.splitTextToSize(finding.question, 74);
    const actionLines = doc.splitTextToSize(finding.action, 66);
    const citeLines = doc.splitTextToSize(finding.citation, 74);
    const rowH = Math.max(questionLines.length * 3.6 + citeLines.length * 3.2, actionLines.length * 3.4) + 7;
    if (y + rowH > 272) {
      y = addPage(doc, audit, settings, draft);
    }
    doc.setFillColor(...severityColor(finding.severity));
    doc.rect(MARGIN, y, 2, rowH - 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...severityColor(finding.severity));
    doc.text(finding.severity.toUpperCase(), MARGIN + 4, y + 4);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.text(finding.id, MARGIN + 4, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...INK);
    doc.text(questionLines, MARGIN + 23, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(...MUTED);
    doc.text(citeLines, MARGIN + 23, y + 4 + questionLines.length * 3.6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(actionLines, dividerX + 3, y + 4);

    doc.setDrawColor(...LINE);
    doc.line(dividerX, y, dividerX, y + rowH - 1);
    doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);
    y += rowH;
  });
  return y + 2;
}

function drawActions(doc, audit, summary, settings, draft, y) {
  y = ensure(doc, y, 60, audit, settings, draft);
  y = sectionLabel(doc, '05  Remediation plan', y + 2);
  y = sectionTitle(doc, 'The next 90 days.', y + 4, 17);

  summary.actions.forEach((phase) => {
    y = ensure(doc, y, 30, audit, settings, draft);
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(255, 255, 255);
    doc.text(phase.label, MARGIN + 4, y + 5.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(190, 205, 218);
    doc.text(phase.focus, PAGE_W - MARGIN - 4, y + 5.2, { align: 'right' });
    y += 11;
    phase.actions.forEach((action, i) => {
      const lines = doc.splitTextToSize(action, CONTENT_W - 12);
      y = ensure(doc, y, lines.length * 3.6 + 2, audit, settings, draft);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.6);
      doc.setTextColor(...BRASS);
      doc.text(`${i + 1}.`, MARGIN + 2, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(...MUTED);
      doc.text(lines, MARGIN + 7, y + 2);
      y += lines.length * 3.6 + 2;
    });
    y += 4;
  });

  y = ensure(doc, y, 60, audit, settings, draft);
  y = sectionLabel(doc, '06  Compliance calendar', y + 2);
  y = sectionTitle(doc, 'What recurs, and when.', y + 4, 16);
  y = drawTable(doc, y + 1, [
    { key: 'when', label: 'When', width: 38 },
    { key: 'item', label: 'Item', width: 104 },
    { key: 'owner', label: 'Owner', width: 32 },
  ], summary.calendar.map((row) => ({ when: row.when, item: row.item, owner: row.owner })), audit, settings, draft);
  y += 4;
  return y;
}

function drawClosing(doc, audit, summary, settings, draft, y) {
  y = ensure(doc, y, 70, audit, settings, draft);
  y = sectionLabel(doc, '07  Evidence & sign-off', y + 2);
  y = sectionTitle(doc, 'The file behind the opinion.', y + 4, 16);

  y = drawTable(doc, y + 1, [
    { key: 'doc', label: 'Document', width: 64 },
    { key: 'status', label: 'Status', width: 24 },
    { key: 'why', label: 'Purpose', width: 86 },
  ], summary.documents.map((docItem) => ({
    doc: docItem.label,
    status: audit.documents?.[docItem.id] ? 'Provided' : 'Open',
    why: docItem.detail,
  })), audit, settings, draft);
  y += 4;

  y = ensure(doc, y, 44, audit, settings, draft);
  y = sectionLabel(doc, 'Sources', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.9);
  doc.setTextColor(...MUTED);
  const sources = [
    'Code on Wages, 2019',
    'Code on Social Security, 2020',
    'Industrial Relations Code, 2020',
    'Occupational Safety, Health and Working Conditions Code, 2020',
    'Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013',
    'State minimum wage, Professional Tax, Labour Welfare Fund and establishment notifications (verify at issue)',
  ];
  sources.forEach((source, index) => {
    doc.text(`• ${source}`, MARGIN, y + 4 + index * 3.6);
  });
  y += sources.length * 3.6 + 8;

  y = ensure(doc, y, 30, audit, settings, draft);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(...BRASS);
  doc.text('DISCLAIMER', MARGIN, y);
  y += 4;
  y = body(doc, settings?.disclaimer || 'This report is a professional drafting aid and does not constitute legal advice.', y, { size: 6.9, leading: 3.5 });

  y += 10;
  y = ensure(doc, y, 40, audit, settings, draft);
  doc.setDrawColor(...LINE);
  doc.line(MARGIN, y + 16, MARGIN + 75, y + 16);
  doc.line(PAGE_W - MARGIN - 75, y + 16, PAGE_W - MARGIN, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...MUTED);
  doc.text('Reviewed by', MARGIN, y + 21);
  doc.text('Date', PAGE_W - MARGIN - 75, y + 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...INK);
  doc.text(audit.reviewer?.name || settings?.reviewer?.name || '—', MARGIN, y + 11);
  doc.text(formatDate(todayISO()), PAGE_W - MARGIN - 75, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...MUTED);
  const reviewerLine = [audit.reviewer?.designation, audit.reviewer?.membership].filter(Boolean).join('  ·  ');
  if (reviewerLine) doc.text(reviewerLine, MARGIN, y + 26);
}

export function generateAuditPdf(audit, summary, settings, { isPro = false, draft = false, save = true } = {}) {
  const jsPDF = globalThis.jspdf?.jsPDF;
  if (!jsPDF) throw new Error('PDF engine not loaded.');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  // Standard PDF fonts do not include the rupee glyph. Normalise it before
  // both measurement and drawing so wrapped lines and rendered glyphs agree.
  const clean = (value) => String(value ?? '').replace(/₹/g, 'Rs. ').replace(/‑/g, '-');
  const rawText = doc.text.bind(doc);
  doc.text = (text, x, y, options, transform) => rawText(
    Array.isArray(text) ? text.map(clean) : clean(text),
    x,
    y,
    options,
    transform
  );
  const rawSplit = doc.splitTextToSize.bind(doc);
  doc.splitTextToSize = (text, size, options) => rawSplit(clean(text), size, options);

  drawCover(doc, audit, summary, settings, draft);

  let y = drawExecSummary(doc, audit, summary, settings, draft);
  y = drawApplicability(doc, audit, summary, settings, draft, y);
  y = drawWage(doc, audit, summary, settings, draft, y);
  y = drawAssessment(doc, audit, summary, settings, draft, y);
  y = drawActions(doc, audit, summary, settings, draft, y);
  y = drawClosing(doc, audit, summary, settings, draft, y);

  drawFooterAll(doc, audit, settings, draft);

  if (save) {
    const filename = `LabourCode-Readiness-${safePart(audit.client.name)}-${safePart(audit.number)}.pdf`;
    doc.save(filename);
  }
  return doc;
}

export function pdfFilename(audit) {
  return `LabourCode-Readiness-${safePart(audit.client.name)}-${safePart(audit.number)}.pdf`;
}
