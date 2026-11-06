import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWageImpact,
  getApplicability,
  scoreAssessment,
  buildActionPlan,
  getComplianceCalendar,
  getDocumentChecklist,
  sampleAudit,
  buildAuditSummary,
  formatINR,
  formatINRShort,
  QUESTIONS,
  DEFAULT_WAGES,
} from '../assets/js/engine.js';

test('50% wage rule restructures basic pay and shows employer provision impact', () => {
  const w = calculateWageImpact({ ...DEFAULT_WAGES, monthlyCtc: 50000, basicPct: 40, hraPct: 20, employees: 50 });
  assert.equal(w.current.basic, 20000);
  assert.equal(w.current.hra, 10000);
  assert.equal(w.current.other, 20000);
  assert.equal(w.fiftyPct, 25000);
  assert.equal(w.proposed.basic, 25000);
  assert.equal(w.basicIncrease, 5000);
  assert.equal(w.allowanceReduction, 5000);
  assert.equal(w.proposed.hra, 10000);
  assert.equal(w.proposed.other, 15000);
  assert.equal(w.employeePfDelta, 0); // EPF ceiling absorbs the change
  assert.equal(w.gratuityDelta, 240.5);
  assert.equal(w.bonusDelta, 416.5);
  assert.equal(w.monthlyEmployerImpact, 657);
  assert.equal(w.annualEmployerImpact, 394200);
  assert.equal(w.compliant, false);
});

test('without the EPF ceiling, employee and employer PF both increase', () => {
  const w = calculateWageImpact({ ...DEFAULT_WAGES, monthlyCtc: 50000, basicPct: 40, hraPct: 20, employees: 50, epfCeiling: false });
  assert.equal(w.employeePfDelta, 600);
  assert.equal(w.employerPfDelta, 600);
  assert.equal(w.monthlyEmployerImpact, 1257);
  assert.equal(w.annualEmployerImpact, 754200);
  assert.equal(w.annualEmployeePfImpact, 360000);
});

test('a structure already at 50% basic is compliant and has no restructure', () => {
  const w = calculateWageImpact({ ...DEFAULT_WAGES, monthlyCtc: 30000, basicPct: 50, hraPct: 20 });
  assert.equal(w.compliant, true);
  assert.equal(w.basicIncrease, 0);
  assert.equal(w.monthlyEmployerImpact, 0);
  assert.equal(w.proposed.basic, 15000);
});

test('allowance reduction preserves CTC when basic is very low', () => {
  const w = calculateWageImpact({ ...DEFAULT_WAGES, monthlyCtc: 40000, basicPct: 10, hraPct: 10, employees: 10 });
  assert.equal(w.basicIncrease, 16000);
  assert.equal(w.allowanceReduction, 16000);
  assert.equal(w.unfundedIncrease, 0);
  assert.equal(w.proposed.basic, 20000);
  assert.equal(w.proposed.other, 16000);
});

test('applicability changes with headcount, contractors and hazardous industry', () => {
  const small = getApplicability({ employees: 5, contractors: 0, industry: 'it' });
  assert.equal(small.find((r) => r.code.includes('Code on Wages')).status, 'applies');
  assert.equal(small.find((r) => r.code.includes('POSH')).status, 'not-indicated');
  assert.equal(small.find((r) => r.code.includes('Contract labour')).status, 'not-indicated');

  const mid = getApplicability({ employees: 120, contractors: 35, industry: 'manufacturing' });
  assert.equal(mid.find((r) => r.code.includes('Social Security')).status, 'applies');
  assert.equal(mid.find((r) => r.code.includes('Industrial Relations')).status, 'applies');
  assert.equal(mid.find((r) => r.code.includes('Occupational Safety')).status, 'applies');
  assert.equal(mid.find((r) => r.code.includes('POSH')).status, 'applies');
  assert.equal(mid.find((r) => r.code.includes('Contract labour')).status, 'review');
  assert.equal(mid.find((r) => r.code.includes('standing orders')).status, 'not-indicated');

  const large = getApplicability({ employees: 350, contractors: 60, industry: 'it' });
  assert.equal(large.find((r) => r.code.includes('standing orders')).status, 'applies');
  assert.equal(large.find((r) => r.code.includes('Contract labour')).status, 'applies');
});

test('all-yes assessment scores 100 and low risk', () => {
  const answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, 'yes']));
  const s = scoreAssessment(answers);
  assert.equal(s.overall, 100);
  assert.equal(s.risk, 'low');
  assert.equal(s.completion, 100);
  assert.equal(s.findings.length, 0);
});

test('all-no assessment scores 0 and high risk', () => {
  const answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, 'no']));
  const s = scoreAssessment(answers);
  assert.equal(s.overall, 0);
  assert.equal(s.risk, 'high');
  assert.equal(s.findings.length, QUESTIONS.length);
});

test('all-partial assessment scores 50 and medium risk', () => {
  const answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, 'partial']));
  const s = scoreAssessment(answers);
  assert.equal(s.overall, 50);
  assert.equal(s.risk, 'medium');
  assert.equal(s.findings.length, QUESTIONS.length);
});

test('unanswered assessment is review-required, not falsely compliant', () => {
  const s = scoreAssessment({});
  assert.equal(s.overall, 0);
  assert.equal(s.risk, 'review');
  assert.equal(s.completion, 0);
  assert.equal(s.answered, 0);
});

test('a high-severity finding prevents a low-risk rating', () => {
  const yes = Object.fromEntries(QUESTIONS.map((q) => [q.id, 'yes']));
  const oneHigh = scoreAssessment({ ...yes, W1: 'no' });
  assert.equal(oneHigh.highCount, 1);
  assert.equal(oneHigh.risk, 'medium');
  const twoHigh = scoreAssessment({ ...yes, W1: 'no', W4: 'no' });
  assert.equal(twoHigh.highCount, 2);
  assert.equal(twoHigh.risk, 'high');
});

test('sample audit produces a realistic score, findings and action plan', () => {
  const audit = sampleAudit({ reviewerName: 'CA Test' });
  const summary = buildAuditSummary(audit);
  assert.ok(summary.assessment.overall > 70 && summary.assessment.overall < 80);
  assert.equal(summary.assessment.risk, 'high');
  assert.equal(summary.assessment.completion, 100);
  assert.equal(summary.assessment.findings.length, 8);
  assert.equal(summary.highCount, 4);
  assert.equal(summary.actions.length, 3);
  assert.ok(summary.wage.annualEmployerImpact > 0);
  assert.equal(summary.calendar.length, 8);
  assert.equal(summary.documents.length, 14);
  assert.equal(summary.matrix.length, 25);
});

test('currency formatting uses Indian grouping', () => {
  assert.equal(formatINR(1234567), '₹12,34,567');
  assert.equal(formatINRShort(1234567), '₹12.35 L');
  assert.equal(formatINRShort(12345678), '₹1.23 Cr');
});
