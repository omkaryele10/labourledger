/**
 * LabourLedger assessment engine.
 * Pure functions only. No DOM, no storage. Testable in Node.
 *
 * IMPORTANT: This is a drafting and audit-support tool for qualified
 * professionals. It is not legal advice. Thresholds and state rules vary.
 */

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const STATE_NOTES = {
  Maharashtra: 'Professional Tax and Labour Welfare Fund registrations commonly apply. Verify state minimum wages and Shops & Establishments rules.',
  Karnataka: 'Professional Tax, Labour Welfare Fund and Karnataka Shops & Commercial Establishments rules commonly apply.',
  Gujarat: 'Professional Tax and Labour Welfare Fund registrations commonly apply. Verify state factory and shop rules.',
  'Tamil Nadu': 'Professional Tax and Labour Welfare Fund registrations commonly apply. Verify state rules.',
  Telangana: 'Professional Tax and Labour Welfare Fund registrations commonly apply. Verify state rules.',
  Delhi: 'Delhi does not levy Professional Tax; verify Delhi Shops & Establishments and labour welfare requirements.',
  'West Bengal': 'Professional Tax and Labour Welfare Fund registrations commonly apply. Verify state rules.',
  'Uttar Pradesh': 'Labour Welfare Fund and state rules may apply. Verify current notifications.',
};

export const INDUSTRIES = [
  { id: 'manufacturing', label: 'Manufacturing / factory', hazardous: true },
  { id: 'construction', label: 'Construction / infrastructure', hazardous: true },
  { id: 'chemical', label: 'Chemicals / pharma', hazardous: true },
  { id: 'mining', label: 'Mining / extraction', hazardous: true },
  { id: 'power', label: 'Power / utilities', hazardous: true },
  { id: 'it', label: 'IT / software services', hazardous: false },
  { id: 'bfsi', label: 'Banking / financial services', hazardous: false },
  { id: 'retail', label: 'Retail / e-commerce', hazardous: false },
  { id: 'hospitality', label: 'Hospitality / food service', hazardous: false },
  { id: 'healthcare', label: 'Healthcare / diagnostics', hazardous: false },
  { id: 'education', label: 'Education / training', hazardous: false },
  { id: 'logistics', label: 'Logistics / warehousing', hazardous: false },
  { id: 'professional', label: 'Professional services', hazardous: false },
  { id: 'other', label: 'Other', hazardous: false },
];

export const CATEGORIES = [
  { id: 'wages', label: 'Wages & remuneration', weight: 30 },
  { id: 'social', label: 'Social security', weight: 20 },
  { id: 'conditions', label: 'Working conditions', weight: 20 },
  { id: 'contract', label: 'Contract labour & IR', weight: 15 },
  { id: 'poshSafety', label: 'POSH, safety & welfare', weight: 15 },
];

export const QUESTIONS = [
  {
    id: 'W1', cat: 'wages', severity: 'high',
    text: 'Are basic pay, dearness allowance and retaining allowance at least 50% of total remuneration for all employees?',
    guidance: 'Map every remuneration component. If excluded components (HRA, allowances, bonus, etc.) exceed 50% of total remuneration, the excess is treated as wages.',
    citation: 'Code on Wages, 2019 — s. 2(y) and the 50% proviso',
    action: 'Re-run the salary structure and payroll mapping for every grade. Document the restructured basic/DA and the treatment of excluded allowances.',
  },
  {
    id: 'W2', cat: 'wages', severity: 'high',
    text: 'Are all employees paid at least the applicable central or state minimum wage for their skill category?',
    guidance: 'Check the current state notification for the scheduled employment, skill level and zone. Minimum wage compliance is separate from the 50% rule.',
    citation: 'Code on Wages, 2019 — minimum wages provisions; state notifications',
    action: 'Obtain the current state minimum wage notification and reconcile every employee and contractor category against it.',
  },
  {
    id: 'W3', cat: 'wages', severity: 'medium',
    text: 'Are wages paid within the prescribed wage period, through a permitted mode, with a documented wage period?',
    guidance: 'The employer must fix a wage period (daily, weekly, fortnightly or monthly) and pay within the prescribed time. Keep bank/electronic payment evidence.',
    citation: 'Code on Wages, 2019 — payment of wages provisions',
    action: 'Document the wage period and payment cut-off. Retain bank advice and payroll sign-off for the last 12 months.',
  },
  {
    id: 'W4', cat: 'wages', severity: 'high',
    text: 'Is overtime paid at not less than twice the normal rate of wages, and is overtime properly authorised and recorded?',
    guidance: 'Overtime must be based on the normal rate and recorded. Do not average it away or pay it as an informal allowance.',
    citation: 'Code on Wages, 2019 — overtime provisions',
    action: 'Introduce an overtime authorisation and calculation sheet. Recalculate the last three months and pay any shortfall.',
  },
  {
    id: 'W5', cat: 'wages', severity: 'medium',
    text: 'Is statutory bonus computed for eligible employees at the minimum 8.33% (subject to the applicable ceiling and maximum 20%)?',
    guidance: 'Bonus eligibility, ceiling and calculation basis must be documented. Verify whether the employee is covered by the bonus provisions and whether a higher rate applies.',
    citation: 'Code on Wages, 2019 — bonus provisions',
    action: 'Prepare a bonus eligibility register with wage ceiling, days worked and calculation. Reconcile with the annual payroll.',
  },
  {
    id: 'W6', cat: 'wages', severity: 'medium',
    text: 'Is there a documented equal-remuneration policy and no gender-based discrimination in wages or recruitment for the same or similar work?',
    guidance: 'Review grade-wise pay bands, hiring offers and promotion data. Keep a written policy and a grievance route.',
    citation: 'Code on Wages, 2019 — equal remuneration provisions',
    action: 'Adopt an equal-remuneration policy and run a grade-wise pay-gap review. Document the rationale for any differential.',
  },
  {
    id: 'S1', cat: 'social', severity: 'high',
    text: 'Is the establishment registered under the EPF scheme (where applicable) and are monthly contributions deposited with correct employee/employer shares?',
    guidance: 'Check registration, UAN coverage, monthly ECR filing and challans. The wage definition for PF may be affected by the 50% rule; confirm the applicable ceiling and transition.',
    citation: 'Code on Social Security, 2020 — provident fund provisions',
    action: 'Reconcile PF coverage, ECR and challans. Identify any employee/contractor omitted from PF and regularise.',
  },
  {
    id: 'S2', cat: 'social', severity: 'high',
    text: 'Is the establishment registered under ESI (where applicable) and are contributions deposited for all covered employees?',
    guidance: 'Check the state-wise ESI applicability threshold, employee coverage and monthly contribution. Contractors may have separate obligations.',
    citation: 'Code on Social Security, 2020 — ESI provisions',
    action: 'Reconcile ESI coverage against the payroll. Register or add omitted employees and clear contribution gaps.',
  },
  {
    id: 'S3', cat: 'social', severity: 'high',
    text: 'Is gratuity provided or funded for eligible employees with at least five years of continuous service, with a documented valuation?',
    guidance: 'Check the gratuity policy, actuarial valuation or provision, and payment records. Verify the treatment of fixed-term employees and continuous service.',
    citation: 'Code on Social Security, 2020 — gratuity provisions',
    action: 'Prepare a gratuity liability schedule and reconcile it with payroll and finance. Document the funding/provision policy.',
  },
  {
    id: 'S4', cat: 'social', severity: 'medium',
    text: 'Is there a documented employee compensation policy for employment injury and occupational disease?',
    guidance: 'Confirm the applicable scheme, reporting route and insurance. Keep incident and claim records.',
    citation: 'Code on Social Security, 2020 — employee compensation provisions',
    action: 'Adopt an employment-injury compensation procedure and verify insurance/ESI coverage.',
  },
  {
    id: 'S5', cat: 'social', severity: 'high',
    text: 'Are contractor workmen covered by PF/ESI where applicable, and are principal-employer records maintained?',
    guidance: 'The principal employer must verify contractor registrations, contributions and wage records. Do not rely only on contractor declarations.',
    citation: 'Code on Social Security, 2020; contract labour provisions',
    action: 'Collect contractor PF/ESI registrations and challans. Audit the last three months of contractor payroll.',
  },
  {
    id: 'C1', cat: 'conditions', severity: 'high',
    text: 'Are daily working hours limited to 8 and weekly hours to 48, with prescribed rest intervals and overtime records?',
    guidance: 'Check attendance, shift rosters, rest intervals and overtime. Exemptions or higher limits must be notified and documented.',
    citation: 'Occupational Safety, Health and Working Conditions Code, 2020 — working hours',
    action: 'Review shift rosters and attendance for the last three months. Regularise hours and rest intervals.',
  },
  {
    id: 'C2', cat: 'conditions', severity: 'high',
    text: 'Are weekly offs, annual leave, sick leave and casual leave granted and recorded for every employee?',
    guidance: 'Leave records must reconcile with attendance and payroll. Check carry-forward, encashment and leave refusal cases.',
    citation: 'Occupational Safety, Health and Working Conditions Code, 2020 — leave provisions',
    action: 'Reconcile leave registers with attendance and payslips. Regularise leave balances and encashment.',
  },
  {
    id: 'C3', cat: 'conditions', severity: 'high',
    text: 'Are maternity benefits (including 26 weeks where applicable), nursing breaks and related protections provided and recorded?',
    guidance: 'Check eligibility, payment, leave records and return-to-work protections. Do not rely on informal arrangements.',
    citation: 'Code on Social Security, 2020 — maternity benefit provisions',
    action: 'Review maternity cases and policy. Document payments, leave and return-to-work protections.',
  },
  {
    id: 'C4', cat: 'conditions', severity: 'medium',
    text: 'Are appointment letters, service records, job descriptions and statutory notices issued and maintained for all employees?',
    guidance: 'Sample the personnel files. Check signatures, wage details, designation, location and date of joining.',
    citation: 'Labour Codes, 2020 — documentation and records obligations',
    action: 'Run a personnel-file audit and issue missing appointment letters and service records.',
  },
  {
    id: 'C5', cat: 'conditions', severity: 'medium',
    text: 'Are welfare facilities, drinking water, sanitation, restrooms and workplace safety arrangements documented and inspected?',
    guidance: 'Check the establishment type and state rules. Keep inspection checklists and closure evidence.',
    citation: 'Occupational Safety, Health and Working Conditions Code, 2020 — welfare and safety',
    action: 'Complete a workplace welfare and safety walkthrough. Record observations and closure dates.',
  },
  {
    id: 'I1', cat: 'contract', severity: 'high',
    text: 'Is contract labour registered/licensed where 50 or more contract workers are engaged (or the applicable state threshold is met)?',
    guidance: 'Check principal-employer registration and contractor licences. The threshold and core-activity restrictions vary by state and establishment.',
    citation: 'Occupational Safety, Health and Working Conditions Code, 2020 — contract labour; state rules',
    action: 'Map contractor headcount and licences. Register the principal employer and require valid contractor licences.',
  },
  {
    id: 'I2', cat: 'contract', severity: 'high',
    text: 'Are contractor registers, wage records, attendance and principal-employer records maintained and reconciled?',
    guidance: 'The principal employer should be able to trace contractor wages, hours, PF/ESI and statutory payments.',
    citation: 'Contract labour provisions; Code on Social Security, 2020',
    action: 'Create a contractor compliance file with registers, challans and wage records. Audit monthly.',
  },
  {
    id: 'I3', cat: 'contract', severity: 'medium',
    text: 'Is a grievance redressal committee constituted and functioning (where the applicable worker threshold is met)?',
    guidance: 'Check constitution, meetings, complaint log and closure. The threshold is generally 20 or more workers; verify state rules.',
    citation: 'Industrial Relations Code, 2020 — grievance redressal',
    action: 'Constitute or reconstitute the grievance committee. Start a dated complaint register and review meetings.',
  },
  {
    id: 'I4', cat: 'contract', severity: 'high',
    text: 'Is a works committee constituted and meeting where 100 or more workers are employed?',
    guidance: 'Check composition, minutes and worker representation. Verify the applicable threshold for the establishment.',
    citation: 'Industrial Relations Code, 2020 — works committee',
    action: 'Constitute the works committee and schedule quarterly meetings with minutes.',
  },
  {
    id: 'I5', cat: 'contract', severity: 'high',
    text: 'Are certified standing orders in place and displayed where 300 or more workers are employed?',
    guidance: 'Check certification, display, acknowledgment and updates after any change in conditions. Verify the threshold and state rules.',
    citation: 'Industrial Relations Code, 2020 — standing orders',
    action: 'Draft/certify standing orders and display them. Obtain employee acknowledgments.',
  },
  {
    id: 'P1', cat: 'poshSafety', severity: 'high',
    text: 'Is a POSH policy in place and is an Internal Committee constituted with the prescribed composition (10 or more employees)?',
    guidance: 'Check the policy, ICC members, external member, terms, contact details and awareness. The ICC must be properly constituted.',
    citation: 'POSH Act, 2013 — ss. 4, 19',
    action: 'Reconstitute the ICC if needed and publish the policy, ICC contacts and complaint route.',
  },
  {
    id: 'P2', cat: 'poshSafety', severity: 'high',
    text: 'Is the POSH annual report prepared and submitted to the District Officer within the prescribed timeline?',
    guidance: 'Check the calendar-year report, ICC data, case numbers and submission proof. Verify the state-specific filing window.',
    citation: 'POSH Act, 2013 — s. 21',
    action: 'Prepare the annual POSH report and retain the submission acknowledgment.',
  },
  {
    id: 'P3', cat: 'poshSafety', severity: 'medium',
    text: 'Are POSH awareness sessions and manager/ICC training conducted and recorded?',
    guidance: 'Keep attendance, content, dates and feedback. Training should cover prevention, reporting and confidentiality.',
    citation: 'POSH Act, 2013 — awareness and training obligations',
    action: 'Schedule annual awareness sessions and maintain attendance and content records.',
  },
  {
    id: 'P4', cat: 'poshSafety', severity: 'high',
    text: 'Is a safety committee constituted, a safety officer appointed where applicable, and an accident register maintained with reportable incidents notified?',
    guidance: 'Check the establishment type and state thresholds. Keep accident reports, investigation notes and closure evidence.',
    citation: 'Occupational Safety, Health and Working Conditions Code, 2020 — safety committee and accidents',
    action: 'Constitute the safety committee, appoint the safety officer and open a dated accident register.',
  },
];

export const DOCUMENTS = [
  { id: 'wage-register', label: 'Wage register', detail: 'Employee-wise wages, deductions and net pay.', citation: 'Code on Wages, 2019 — registers' },
  { id: 'attendance', label: 'Attendance register', detail: 'Daily attendance, shifts, rest intervals and overtime.', citation: 'OSH Code, 2020 — working hours' },
  { id: 'leave-register', label: 'Leave register', detail: 'Annual, sick, casual, maternity and encashment records.', citation: 'OSH Code, 2020 — leave' },
  { id: 'overtime', label: 'Overtime register', detail: 'Authorisation, hours and 2x rate calculation.', citation: 'Code on Wages, 2019 — overtime' },
  { id: 'bonus', label: 'Bonus register', detail: 'Eligibility, ceiling, days worked and payment.', citation: 'Code on Wages, 2019 — bonus' },
  { id: 'pf-esi', label: 'PF / ESI challans', detail: 'Monthly ECR, challans and employee coverage.', citation: 'Code on Social Security, 2020' },
  { id: 'gratuity', label: 'Gratuity policy / valuation', detail: 'Eligibility, provision and payment records.', citation: 'Code on Social Security, 2020 — gratuity' },
  { id: 'contractor', label: 'Contractor compliance file', detail: 'Licences, registers, wages, PF/ESI and principal-employer records.', citation: 'Contract labour provisions' },
  { id: 'standing-orders', label: 'Certified standing orders', detail: 'Certification, display and employee acknowledgment.', citation: 'Industrial Relations Code, 2020' },
  { id: 'grievance', label: 'Grievance / works committee records', detail: 'Constitution, minutes and complaint closure.', citation: 'Industrial Relations Code, 2020' },
  { id: 'posh', label: 'POSH policy and ICC file', detail: 'Policy, ICC composition, complaints and annual report.', citation: 'POSH Act, 2013' },
  { id: 'safety', label: 'Safety committee / accident register', detail: 'Constitution, inspections, incidents and closure.', citation: 'OSH Code, 2020' },
  { id: 'appointment', label: 'Appointment letters / service records', detail: 'Signed terms, designation, wage details and joining date.', citation: 'Labour Codes, 2020 — records' },
  { id: 'notices', label: 'Statutory notices and abstracts', detail: 'Displayed notices, abstracts and registrations.', citation: 'Labour Codes, 2020 — display' },
];

export const DEFAULT_WAGES = {
  monthlyCtc: 50000,
  basicPct: 40,
  hraPct: 20,
  employees: 50,
  pfRegistered: true,
  esiRegistered: true,
  bonusApplicable: true,
  epfCeiling: true,
  includeGratuity: true,
  includeBonus: true,
};

export const DEFAULT_CLIENT = {
  name: '',
  state: 'Maharashtra',
  industry: 'manufacturing',
  employees: 50,
  contractors: 0,
  turnover: '',
  contactName: '',
  contactEmail: '',
  auditPeriod: 'FY 2026–27',
};

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function toNumber(value, fallback = 0) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(value, { decimals = 0 } = {}) {
  const n = toNumber(value);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(n);
  } catch {
    return `₹${n.toFixed(decimals)}`;
  }
}

export function formatINRShort(value) {
  const n = toNumber(value);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)} K`;
  return formatINR(n);
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function stateNote(state) {
  return STATE_NOTES[state] || 'Verify state minimum wages, Professional Tax, Labour Welfare Fund and state-specific establishment rules.';
}

export function industryLabel(id) {
  return INDUSTRIES.find((i) => i.id === id)?.label || 'Other';
}

export function isHazardousIndustry(id) {
  return Boolean(INDUSTRIES.find((i) => i.id === id)?.hazardous);
}

/**
 * Indicative 50% wage-rule and statutory-cost model.
 * monthlyCtc is the average monthly CTC per employee, before employer PF/gratuity.
 */
export function calculateWageImpact(wages = {}) {
  const w = { ...DEFAULT_WAGES, ...wages };
  const monthlyCtc = Math.max(0, toNumber(w.monthlyCtc, 0));
  const employees = Math.max(1, Math.round(toNumber(w.employees, 1)));
  const basicPct = clamp(toNumber(w.basicPct, 40), 0, 100);
  const hraPct = clamp(toNumber(w.hraPct, 20), 0, 100 - basicPct);
  const otherPct = Math.max(0, 100 - basicPct - hraPct);

  const currentBasic = round2(monthlyCtc * basicPct / 100);
  const currentHra = round2(monthlyCtc * hraPct / 100);
  const currentOther = round2(monthlyCtc - currentBasic - currentHra);
  const fiftyPct = round2(monthlyCtc * 0.5);
  const compliant = currentBasic + 0.005 >= fiftyPct;
  const newBasic = compliant ? currentBasic : fiftyPct;
  const basicIncrease = round2(Math.max(0, newBasic - currentBasic));
  const allowanceReduction = round2(Math.min(basicIncrease, currentHra + currentOther));
  const unfundedIncrease = round2(Math.max(0, basicIncrease - allowanceReduction));

  let remainingReduction = allowanceReduction;
  const reduceOther = Math.min(currentOther, remainingReduction);
  remainingReduction = round2(remainingReduction - reduceOther);
  const reduceHra = Math.min(currentHra, remainingReduction);
  const newOther = round2(currentOther - reduceOther);
  const newHra = round2(currentHra - reduceHra);

  const epfCeiling = Boolean(w.epfCeiling);
  const pfCurrentBase = epfCeiling ? Math.min(currentBasic, 15000) : currentBasic;
  const pfNewBase = epfCeiling ? Math.min(newBasic, 15000) : newBasic;
  const pfRegistered = Boolean(w.pfRegistered);
  const employeePfDelta = pfRegistered ? round2((pfNewBase - pfCurrentBase) * 0.12) : 0;
  const employerPfDelta = pfRegistered ? round2((pfNewBase - pfCurrentBase) * 0.12) : 0;

  const includeGratuity = Boolean(w.includeGratuity);
  const gratuityDelta = includeGratuity ? round2((newBasic - currentBasic) * 0.0481) : 0;
  const includeBonus = Boolean(w.includeBonus) && Boolean(w.bonusApplicable);
  const bonusDelta = includeBonus ? round2((newBasic - currentBasic) * 0.0833) : 0;

  const monthlyEmployerImpact = round2(unfundedIncrease + employerPfDelta + gratuityDelta + bonusDelta);
  const monthlyEmployeePfImpact = employeePfDelta;
  const annualEmployerImpact = round2(monthlyEmployerImpact * employees * 12);
  const annualEmployeePfImpact = round2(monthlyEmployeePfImpact * employees * 12);

  return {
    monthlyCtc, employees, basicPct, hraPct, otherPct,
    compliant,
    current: {
      basic: currentBasic, hra: currentHra, other: currentOther,
      basicPct, hraPct, otherPct,
      pfBase: round2(pfCurrentBase),
    },
    proposed: {
      basic: newBasic, hra: newHra, other: newOther,
      basicPct: monthlyCtc ? round2((newBasic / monthlyCtc) * 100) : 0,
      hraPct: monthlyCtc ? round2((newHra / monthlyCtc) * 100) : 0,
      otherPct: monthlyCtc ? round2((newOther / monthlyCtc) * 100) : 0,
      pfBase: round2(pfNewBase),
    },
    fiftyPct,
    basicIncrease,
    allowanceReduction,
    unfundedIncrease,
    employeePfDelta,
    employerPfDelta,
    gratuityDelta,
    bonusDelta,
    monthlyEmployerImpact,
    monthlyEmployeePfImpact,
    annualEmployerImpact,
    annualEmployeePfImpact,
    assumptions: [
      'Monthly CTC is the average fixed remuneration per employee, before employer PF and gratuity.',
      epfCeiling ? 'EPF is modelled on the ₹15,000 statutory wage ceiling.' : 'EPF is modelled on full basic wages without the statutory ceiling.',
      'Gratuity is provided at 4.81% of basic; bonus at 8.33% where applicable. These are incremental provisions, not necessarily cash paid in the year.',
      'The model keeps CTC neutral where possible by reducing other allowances; any unfunded balance is shown as employer cost.',
      'State minimum wages, PF/ESI thresholds and statutory bonus eligibility must be verified against current notifications.',
      'The 50% test assumes HRA and other allowances are excluded components under s. 2(y). If they are ordinary wages, the client may already meet the test; verify the classification before restructuring.',
    ],
  };
}

export function getApplicability(client = {}, overrides = {}) {
  const employees = Math.max(0, Math.round(toNumber(client.employees, 0)));
  const contractors = Math.max(0, Math.round(toNumber(client.contractors, 0)));
  const hazardous = isHazardousIndustry(client.industry);
  const rows = [
    {
      code: 'Code on Wages, 2019',
      status: 'applies',
      reason: 'Applies to all employees in organised and unorganised sectors. The 50% wage definition and minimum-wage obligations need a payroll review.',
      action: 'Validate wage structure, minimum wages, overtime and bonus.',
    },
    {
      code: 'Code on Social Security, 2020',
      status: employees >= 10 ? 'applies' : 'review',
      reason: employees >= 10
        ? 'PF/ESI/gratuity obligations are likely to apply at this headcount. Confirm scheme thresholds and state coverage.'
        : 'The establishment is below the common 10-employee threshold; voluntary coverage and state rules still need review.',
      action: 'Reconcile PF/ESI coverage and gratuity provision.',
    },
    {
      code: 'Industrial Relations Code, 2020',
      status: employees >= 20 ? 'applies' : 'review',
      reason: employees >= 20
        ? 'Grievance redressal machinery is likely to apply. Works committee (100+) and standing orders (300+) need a separate check.'
        : 'Below the common grievance-committee threshold; verify state rules and any voluntary machinery.',
      action: 'Constitute grievance/works committees and review standing orders.',
    },
    {
      code: 'Occupational Safety, Health and Working Conditions Code, 2020',
      status: hazardous || employees >= 10 ? 'applies' : 'review',
      reason: hazardous
        ? 'Hazardous activity can attract OSH obligations regardless of headcount. Safety committee, working hours and accident reporting need review.'
        : employees >= 10
          ? 'Working hours, welfare and safety obligations are likely to apply at this headcount.'
          : 'Small establishment; verify state-specific OSH and welfare requirements.',
      action: 'Review working hours, safety committee and accident register.',
    },
    {
      code: 'POSH Act, 2013',
      status: employees >= 10 ? 'applies' : 'not-indicated',
      reason: employees >= 10
        ? 'An Internal Committee and POSH policy are mandatory at 10 or more employees.'
        : 'Below the 10-employee threshold; a local committee may still be required by state rules.',
      action: 'Constitute the ICC and file the annual POSH report.',
    },
    {
      code: 'Contract labour obligations',
      status: contractors >= 50 ? 'applies' : contractors > 0 ? 'review' : 'not-indicated',
      reason: contractors >= 50
        ? 'Principal-employer registration and contractor licensing are likely at 50+ contract workers. State thresholds may differ.'
        : contractors > 0
          ? 'Contract workers are engaged but below the common 50-worker threshold; verify state rules and core-activity restrictions.'
          : 'No contract workers reported.',
      action: 'Verify principal-employer registration, contractor licences and records.',
    },
    {
      code: 'Certified standing orders',
      status: employees >= 300 ? 'applies' : 'not-indicated',
      reason: employees >= 300
        ? 'Certified standing orders are likely required at 300+ workers under the Industrial Relations Code.'
        : 'Below the common 300-worker threshold; verify any state-specific requirement.',
      action: 'Draft, certify and display standing orders.',
    },
  ];
  return rows.map((row) => ({
    ...row,
    status: ['applies', 'review', 'not-indicated'].includes(overrides[row.code])
      ? overrides[row.code]
      : row.status,
    overridden: ['applies', 'review', 'not-indicated'].includes(overrides[row.code]),
  }));
}

const ANSWER_VALUES = { yes: 100, partial: 50, no: 0 };

export function scoreAssessment(answers = {}) {
  const categories = CATEGORIES.map((cat) => {
    const qs = QUESTIONS.filter((q) => q.cat === cat.id);
    const answered = qs.filter((q) => answers[q.id] && answers[q.id] !== 'na');
    const values = answered.map((q) => ANSWER_VALUES[answers[q.id]] ?? 0);
    const score = values.length ? round2(values.reduce((a, b) => a + b, 0) / values.length) : null;
    return { ...cat, score, answered: answered.length, total: qs.length };
  });

  const available = categories.filter((c) => c.score !== null);
  const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
  const overall = totalWeight
    ? round2(available.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight)
    : 0;

  const respondedCount = QUESTIONS.filter((q) => ['yes', 'partial', 'no', 'na'].includes(answers[q.id])).length;
  const completion = round2((respondedCount / QUESTIONS.length) * 100);

  const findings = [];
  for (const q of QUESTIONS) {
    const answer = answers[q.id];
    if (!answer || answer === 'na' || answer === 'yes') continue;
    let severity = q.severity;
    if (answer === 'partial') {
      severity = severity === 'high' ? 'medium' : 'low';
    }
    findings.push({
      id: q.id,
      category: CATEGORIES.find((c) => c.id === q.cat)?.label || q.cat,
      question: q.text,
      answer,
      severity,
      citation: q.citation,
      action: q.action,
    });
  }
  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.id.localeCompare(b.id));
  const highCount = findings.filter((f) => f.severity === 'high').length;
  let risk = 'review';
  if (completion >= 80) {
    if (highCount >= 2 || overall < 50) risk = 'high';
    else if (highCount === 1 || overall < 75) risk = 'medium';
    else risk = 'low';
  }

  return {
    overall,
    risk,
    highCount,
    completion,
    answered: respondedCount,
    total: QUESTIONS.length,
    categories,
    findings,
  };
}

export function buildActionPlan(assessment) {
  const high = assessment.findings.filter((f) => f.severity === 'high');
  const medium = assessment.findings.filter((f) => f.severity === 'medium');
  const low = assessment.findings.filter((f) => f.severity === 'low');
  const pack = (items, fallback) => (items.length ? items.slice(0, 5).map((f) => f.action) : [fallback]);
  return [
    {
      label: 'Next 30 days',
      focus: 'Stop the bleeding: wage structure, PF/ESI, POSH, safety.',
      actions: pack(high, 'Close all high-severity findings and create an evidence file.'),
    },
    {
      label: 'Next 60 days',
      focus: 'Fix documentation and committee machinery.',
      actions: pack(medium, 'Complete policy, committee and register remediation.'),
    },
    {
      label: 'Next 90 days',
      focus: 'Institutionalise monitoring and audit readiness.',
      actions: pack(low, 'Run a mock inspection and set a quarterly compliance review.'),
    },
  ];
}

export function getComplianceCalendar(client = {}) {
  const state = client.state || 'your state';
  return [
    { when: 'Monthly, by the 15th', item: 'Deposit PF and ESI contributions; retain ECR/challans.', owner: 'Payroll', critical: true },
    { when: 'Monthly', item: 'Update wage, attendance, overtime and leave registers; reconcile with payslips.', owner: 'HR / Payroll', critical: true },
    { when: 'Quarterly', item: `Review ${state} Professional Tax / Labour Welfare Fund returns and contractor compliance.`, owner: 'Finance / HR', critical: false },
    { when: 'Annually', item: 'Prepare and file the POSH annual report with the District Officer.', owner: 'ICC / HR', critical: true },
    { when: 'Annually', item: 'Complete bonus calculation and payment for eligible employees.', owner: 'Finance / HR', critical: true },
    { when: 'Annually', item: 'Review gratuity valuation/provision and PF/ESI annual returns.', owner: 'Finance', critical: true },
    { when: 'Event-based', item: 'Apply for/renew principal-employer registration and contractor licences.', owner: 'Compliance', critical: true },
    { when: 'Event-based', item: 'Report reportable accidents and occupational diseases; update the accident register.', owner: 'Safety / HR', critical: true },
  ];
}

export function getDocumentChecklist() {
  return DOCUMENTS.map((d) => ({ ...d }));
}

export function buildAuditSummary(audit) {
  const wage = calculateWageImpact(audit.wages);
  const applicability = getApplicability(audit.client, audit.applicability || {});
  const assessment = scoreAssessment(audit.answers);
  const actions = buildActionPlan(assessment);
  const findings = assessment.findings;
  const matrix = QUESTIONS.map((q) => {
    const answer = audit.answers?.[q.id] || 'na';
    let severity = '—';
    if (answer === 'no') severity = q.severity;
    if (answer === 'partial') severity = q.severity === 'high' ? 'medium' : 'low';
    return {
      id: q.id,
      category: CATEGORIES.find((c) => c.id === q.cat)?.label || q.cat,
      question: q.text,
      answer,
      status: answer === 'yes' ? 'Compliant' : answer === 'partial' ? 'Partial' : answer === 'no' ? 'Gap' : 'Not assessed',
      severity,
      citation: q.citation,
    };
  });
  return {
    wage,
    applicability,
    assessment,
    actions,
    matrix,
    keyFindings: findings.slice(0, 4),
    highCount: findings.filter((f) => f.severity === 'high').length,
    mediumCount: findings.filter((f) => f.severity === 'medium').length,
    lowCount: findings.filter((f) => f.severity === 'low').length,
    documents: getDocumentChecklist(),
    calendar: getComplianceCalendar(audit.client),
    stateNote: stateNote(audit.client.state),
  };
}

export function riskLabel(risk) {
  return { low: 'Low', medium: 'Medium', high: 'High', review: 'Review required' }[risk] || 'Review required';
}

export function riskClass(risk) {
  return { low: 'risk-low', medium: 'risk-medium', high: 'risk-high', review: 'risk-review' }[risk] || 'risk-review';
}

export function createAuditRecord(settings = {}) {
  return {
    id: uid(),
    createdAt: todayISO(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    client: { ...DEFAULT_CLIENT },
    wages: { ...DEFAULT_WAGES },
    answers: Object.fromEntries(QUESTIONS.map((q) => [q.id, 'na'])),
    documents: Object.fromEntries(DOCUMENTS.map((d) => [d.id, false])),
    notes: '',
    reviewer: {
      name: settings.reviewerName || '',
      designation: settings.reviewerDesignation || '',
      membership: settings.reviewerMembership || '',
    },
  };
}

export function sampleAudit(settings = {}) {
  const base = createAuditRecord(settings);
  const yes = ['W1', 'W2', 'W3', 'W5', 'S1', 'S2', 'S3', 'C1', 'C2', 'C4', 'C5', 'P1', 'P3', 'P4', 'I2', 'I3'];
  const partial = ['W6', 'S5', 'C3', 'S4'];
  const no = ['W4', 'I1', 'I4', 'P2'];
  const answers = { ...base.answers };
  yes.forEach((id) => { answers[id] = 'yes'; });
  partial.forEach((id) => { answers[id] = 'partial'; });
  no.forEach((id) => { answers[id] = 'no'; });
  answers.I5 = 'na';
  return {
    ...base,
    status: 'in-review',
    client: {
      name: 'Sahyadri Precision Components Pvt Ltd',
      state: 'Maharashtra',
      industry: 'manufacturing',
      employees: 120,
      contractors: 35,
      turnover: '₹42 crore',
      contactName: 'R. Deshmukh',
      contactEmail: 'r.deshmukh@example.com',
      auditPeriod: 'FY 2026–27',
    },
    wages: {
      monthlyCtc: 42000,
      basicPct: 38,
      hraPct: 22,
      employees: 120,
      pfRegistered: true,
      esiRegistered: true,
      bonusApplicable: true,
      epfCeiling: true,
      includeGratuity: true,
      includeBonus: true,
    },
    answers,
    documents: {
      'wage-register': true, attendance: true, 'leave-register': true,
      overtime: false, bonus: true, 'pf-esi': true, gratuity: true,
      contractor: false, 'standing-orders': false, grievance: true,
      posh: true, safety: true, appointment: true, notices: false,
    },
    notes: 'Management wants a board-ready readiness assessment before the next customer audit.',
  };
}
