/** 社員ID規則（画面・インポート共通） */
export const EMPLOYEE_CODE_PREFIX_BTC = 'btc';
export const EMPLOYEE_CODE_PREFIX_ALS = 'als';
export const EMPLOYEE_CODE_PREFIX_SWT = 'swt';

export const AFFILIATION_COMPANY_BITCROSS = 'ビットクロス';
export const AFFILIATION_COMPANY_ALESIS = 'アレシス';
export const AFFILIATION_COMPANY_SHUWA = '衆和テクノロジー';

export const AFFILIATION_COMPANIES = [
  AFFILIATION_COMPANY_BITCROSS,
  AFFILIATION_COMPANY_ALESIS,
  AFFILIATION_COMPANY_SHUWA,
];

export const DEPT_ALESIS = 'アレシス';
export const DEPT_SONOTA = 'その他';
export const DEPT_KAIHATSU = '開発部';
export const DEPT_EIGYO = '営業部';

export const EMPLOYEE_TYPE_LETTER = {
  正社員: 'S',
  契約社員: 'K',
  個人事業主: 'P',
  BP: 'B',
};

const CODE_PATTERN = /^(btc|als|swt)([SKPB])(\d{5})$/;

const COMPANY_PREFIX = {
  [AFFILIATION_COMPANY_BITCROSS]: EMPLOYEE_CODE_PREFIX_BTC,
  [AFFILIATION_COMPANY_ALESIS]: EMPLOYEE_CODE_PREFIX_ALS,
  [AFFILIATION_COMPANY_SHUWA]: EMPLOYEE_CODE_PREFIX_SWT,
};

const ALS_SWT_DEPTS = new Set([DEPT_KAIHATSU, DEPT_EIGYO]);

export function normalizeAffiliationCompany(company) {
  if (!company || !AFFILIATION_COMPANIES.includes(company)) {
    return AFFILIATION_COMPANY_BITCROSS;
  }
  return company;
}

export function isBitcrossCompany(company) {
  return normalizeAffiliationCompany(company) === AFFILIATION_COMPANY_BITCROSS;
}

/** @deprecated 部門名ではなく所属会社で判定する */
export function isAlesisDepartment(name) {
  return name === DEPT_ALESIS;
}

export function isSonotaDepartment(name) {
  return name === DEPT_SONOTA;
}

export function requiredPrefixForCompany(company) {
  return COMPANY_PREFIX[normalizeAffiliationCompany(company)] || EMPLOYEE_CODE_PREFIX_BTC;
}

/** @deprecated use requiredPrefixForCompany */
export function requiredPrefixForDepartment(departmentName) {
  if (!departmentName) return null;
  return isAlesisDepartment(departmentName) ? EMPLOYEE_CODE_PREFIX_ALS : EMPLOYEE_CODE_PREFIX_BTC;
}

export function isFixedDepartmentType(employeeType) {
  return employeeType === '個人事業主' || employeeType === 'BP';
}

export function canChangeEmployeeDepartment(employeeType) {
  return employeeType === '正社員' || employeeType === '契約社員';
}

export function isDepartmentAllowedForType(employeeType, departmentName, company) {
  if (!employeeType || !departmentName) return false;
  const affiliation = normalizeAffiliationCompany(company);
  if (affiliation === AFFILIATION_COMPANY_ALESIS || affiliation === AFFILIATION_COMPANY_SHUWA) {
    return ALS_SWT_DEPTS.has(departmentName);
  }
  if (isAlesisDepartment(departmentName)) return false;
  if (isFixedDepartmentType(employeeType)) {
    return isSonotaDepartment(departmentName);
  }
  if (employeeType === '正社員' || employeeType === '契約社員') {
    return !isSonotaDepartment(departmentName);
  }
  return false;
}

export function filterDepartmentsForEmployeeType(departments, employeeType, company) {
  if (!departments?.length) return [];
  const affiliation = normalizeAffiliationCompany(company);
  const byCompany = departments.filter(
    (d) => normalizeAffiliationCompany(d.company) === affiliation
  );
  if (!employeeType) return byCompany;
  return byCompany.filter((d) => isDepartmentAllowedForType(employeeType, d.name, affiliation));
}

export function isCrossCompanyTransfer(fromCompany, toCompany) {
  return normalizeAffiliationCompany(fromCompany) !== normalizeAffiliationCompany(toCompany);
}

export function departmentOptionLabel(department) {
  if (!department) return '';
  const company = department.company || AFFILIATION_COMPANY_BITCROSS;
  return `${department.name}（${company}）`;
}

export function validateEmployeeCode(code, employeeType, departmentName, company) {
  const normalized = (code ?? '').trim();
  if (!normalized) return '社員IDは必須です';
  const match = CODE_PATTERN.exec(normalized);
  if (!match) {
    return '社員IDは btc/als/swt + 種別英字(S/K/P/B) + 5桁数字 で入力してください（例：btcS00001）';
  }
  const expectedLetter = EMPLOYEE_TYPE_LETTER[employeeType];
  if (!expectedLetter) return '社員種別が不正です';
  if (match[2] !== expectedLetter) {
    return `社員IDの4文字目は社員種別「${employeeType}」に対応する「${expectedLetter}」である必要があります`;
  }
  if (!company) return '所属会社は必須です';
  const affiliation = normalizeAffiliationCompany(company);
  const expectedPrefix = requiredPrefixForCompany(affiliation);
  if (match[1] !== expectedPrefix) {
    return `所属会社「${affiliation}」のとき、社員IDは ${expectedPrefix} で始まる必要があります`;
  }
  if (!isDepartmentAllowedForType(employeeType, departmentName, affiliation)) {
    if (!isBitcrossCompany(affiliation)) {
      return 'アレシス・衆和テクノロジーの所属部門は「開発部」「営業部」のみです';
    }
    if (isFixedDepartmentType(employeeType)) {
      return '個人事業主・BP の所属部門は「その他」のみ選択できます';
    }
    return '正社員・契約社員の所属部門に「その他」は選択できません';
  }
  return null;
}

export function formatRecommendHint(recommend) {
  if (!recommend?.employeeCode) return '';
  if (recommend.latestEmployeeCode) {
    return `推奨（欠番優先）: ${recommend.employeeCode} ／ 同種の最新: ${recommend.latestEmployeeCode}`;
  }
  return `推奨（欠番優先）: ${recommend.employeeCode}`;
}
