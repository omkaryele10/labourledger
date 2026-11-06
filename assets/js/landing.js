import { calculateWageImpact, formatINR, formatINRShort } from './engine.js';

const ctc = document.getElementById('calcCtc');
const basic = document.getElementById('calcBasic');
const employees = document.getElementById('calcEmployees');
const ceiling = document.getElementById('calcCeiling');
const impact = document.getElementById('calcImpact');
const newBasic = document.getElementById('calcNewBasic');
const employeePf = document.getElementById('calcEmployeePf');
const status = document.getElementById('calcStatus');
const cta = document.getElementById('calcCta');

function update() {
  if (!ctc || !basic || !employees || !ceiling) return;
  const result = calculateWageImpact({
    monthlyCtc: Number(ctc.value) || 0,
    basicPct: Number(basic.value) || 0,
    hraPct: Math.max(0, Math.min(60, 100 - (Number(basic.value) || 0))),
    employees: Number(employees.value) || 1,
    epfCeiling: ceiling.value === 'yes',
    pfRegistered: true,
    bonusApplicable: true,
    includeGratuity: true,
    includeBonus: true,
  });

  impact.textContent = formatINRShort(result.annualEmployerImpact);
  newBasic.textContent = formatINR(result.proposed.basic);
  employeePf.textContent = formatINR(result.employeePfDelta);
  status.textContent = result.compliant ? 'Already at 50%+' : 'Restructure required';
  status.style.color = result.compliant ? '#8fd3bd' : '#e9c77e';

  const params = new URLSearchParams({
    onboarding: '1',
    ctc: String(ctc.value),
    basic: String(basic.value),
    employees: String(employees.value),
    ceiling: ceiling.value,
  });
  cta.href = `/app/?${params.toString()}`;
}

[ctc, basic, employees, ceiling].forEach((el) => {
  if (el) {
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
});

update();
