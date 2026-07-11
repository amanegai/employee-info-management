/**
 * 東京・協会けんぽ（令和6年度）等を参考にした給与控除の簡易自動計算。
 * 住民税は市区町村決定額のため自動算出しません。
 */

const TOKYO_RATES = {
  healthTotal: 0.0991,
  nursingTotal: 0.0159,
  pensionTotal: 0.183,
  employmentEmployee: 0.0055,
};

/** 標準報酬月額等級（報酬月額の下限〜上限、標準報酬月額） */
const STANDARD_GRADES = [
  [63000, 73000, 68000],
  [73000, 83000, 78000],
  [83000, 93000, 88000],
  [93000, 101000, 98000],
  [101000, 107000, 104000],
  [107000, 114000, 110000],
  [114000, 122000, 118000],
  [122000, 130000, 126000],
  [130000, 138000, 134000],
  [138000, 146000, 142000],
  [146000, 155000, 150000],
  [155000, 165000, 160000],
  [165000, 175000, 170000],
  [175000, 185000, 180000],
  [185000, 195000, 190000],
  [195000, 210000, 200000],
  [210000, 230000, 220000],
  [230000, 250000, 240000],
  [250000, 270000, 260000],
  [270000, 290000, 280000],
  [290000, 310000, 300000],
  [310000, 330000, 320000],
  [330000, 350000, 340000],
  [350000, 370000, 360000],
  [370000, 395000, 380000],
  [395000, 425000, 410000],
  [425000, 455000, 440000],
  [455000, 485000, 470000],
  [485000, 515000, 500000],
  [515000, 545000, 530000],
  [545000, 575000, 560000],
  [575000, 605000, 590000],
  [605000, 635000, 620000],
  [635000, 665000, 650000],
  [665000, 695000, 680000],
  [695000, 730000, 710000],
  [730000, 770000, 750000],
  [770000, 810000, 790000],
  [810000, 855000, 830000],
  [855000, 905000, 880000],
  [905000, 955000, 930000],
  [955000, 1005000, 980000],
  [1005000, 1055000, 1030000],
  [1055000, 1115000, 1090000],
  [1115000, 1175000, 1150000],
  [1175000, 1235000, 1210000],
  [1235000, 1295000, 1270000],
  [1295000, 1355000, 1330000],
];

function roundYen(value) {
  return Math.round(Number(value) || 0);
}

export function calcStandardRemuneration(monthlyReward) {
  const amount = Math.max(0, Math.floor(Number(monthlyReward) || 0));
  if (amount < STANDARD_GRADES[0][0]) {
    return STANDARD_GRADES[0][2];
  }
  for (const [min, max, standard] of STANDARD_GRADES) {
    if (amount >= min && amount < max) return standard;
  }
  return STANDARD_GRADES[STANDARD_GRADES.length - 1][2];
}

export function calcAgeFromBirthDate(birthDate, referenceDate = new Date()) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function calcTaxableMonthlyPay(grossPay, socialDeduction) {
  return Math.max(0, grossPay - socialDeduction);
}

/** 源泉徴収税額表（月額表・甲・0人）の簡易近似 */
function calcWithholdingTaxMonthly(taxablePay, dependents = 0) {
  const pay = Math.max(0, Math.floor(Number(taxablePay) || 0));
  if (pay <= 88000) return 0;
  const baseDeduction = dependents * 1610;
  const adjusted = Math.max(0, pay - baseDeduction);

  const brackets = [
    [89000, 130],
    [90000, 180],
    [91000, 230],
    [92000, 290],
    [93000, 340],
    [94000, 390],
    [95000, 440],
    [96000, 490],
    [97000, 540],
    [98000, 590],
    [99000, 640],
    [100000, 720],
    [150000, 1020],
    [200000, 2520],
    [250000, 5020],
    [300000, 7520],
    [350000, 10220],
    [400000, 13220],
    [450000, 16720],
    [500000, 20720],
    [550000, 25220],
    [600000, 30220],
    [650000, 35720],
    [700000, 41720],
    [750000, 48220],
    [800000, 55220],
  ];

  let tax = 130;
  for (let i = brackets.length - 1; i >= 0; i -= 1) {
    if (adjusted >= brackets[i][0]) {
      tax = brackets[i][1];
      break;
    }
  }

  if (adjusted > 500000) {
    tax = roundYen(20720 + (adjusted - 500000) * 0.2042);
  } else if (adjusted > 450000) {
    tax = roundYen(16720 + (adjusted - 450000) * 0.2042);
  } else if (adjusted > 400000) {
    tax = roundYen(13220 + (adjusted - 400000) * 0.2042);
  }

  return Math.max(0, tax);
}

export function calcGrossMonthlyPay(salary) {
  return [
    salary?.basicSalaryMonthly,
    salary?.housingAllowance,
    salary?.familyAllowance,
    salary?.fixedOvertimeAllowance,
    salary?.commuterAllowance,
  ].reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export function calcPayrollDeductions({ salary, personal, hr, preserveResidentTax = true }) {
  const grossPay = calcGrossMonthlyPay(salary);
  if (grossPay <= 0) {
    return null;
  }

  const standard = calcStandardRemuneration(grossPay);
  const age = calcAgeFromBirthDate(personal?.birthDate);
  const insured = hr?.socialInsuranceStatus !== '未加入' && hr?.socialInsuranceStatus !== '適用除外';

  let deductionHealth = 0;
  let deductionHealthCare = 0;
  let deductionPension = 0;
  let deductionEmployment = 0;

  if (insured) {
    deductionHealth = roundYen((standard * TOKYO_RATES.healthTotal) / 2);
    if (age != null && age >= 40 && age < 65) {
      deductionHealthCare = roundYen((standard * TOKYO_RATES.nursingTotal) / 2);
    }
    deductionPension = roundYen((standard * TOKYO_RATES.pensionTotal) / 2);
  }

  deductionEmployment = roundYen(grossPay * TOKYO_RATES.employmentEmployee);

  const socialDeduction =
    deductionHealth + deductionHealthCare + deductionPension + deductionEmployment;
  const taxablePay = calcTaxableMonthlyPay(grossPay, socialDeduction);
  const deductionIncomeTax = calcWithholdingTaxMonthly(taxablePay, 0);

  return {
    deductionHealthCare,
    deductionHealth,
    deductionPension,
    deductionEmployment,
    deductionIncomeTax,
    deductionResidentTax: preserveResidentTax ? Number(salary?.deductionResidentTax) || 0 : 0,
    meta: {
      grossPay,
      standardRemuneration: standard,
      age,
      insured,
    },
  };
}
