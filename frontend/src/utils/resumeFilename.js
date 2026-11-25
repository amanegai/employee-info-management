import {
  AFFILIATION_COMPANY_ALESIS,
  AFFILIATION_COMPANY_BITCROSS,
  AFFILIATION_COMPANY_SHUWA,
  EMPLOYEE_CODE_PREFIX_ALS,
  EMPLOYEE_CODE_PREFIX_BTC,
  EMPLOYEE_CODE_PREFIX_SWT,
  EMPLOYEE_TYPE_LETTER,
  isDevDepartmentWithoutDivision,
  isBitcrossCompany,
} from './employeeCode';

const CODE_PATTERN = /^(btc|als|swt)([SKPB])(\d{5})$/i;

/** {社員ID}_技術者履歴書_{YYYY-MM-DD}_{所属部門}.xlsx */
const FILENAME_PATTERN =
  /^(.+?)_技術者履歴書_(\d{4}-\d{2}-\d{2})_(.+)\.(xlsx|xls)$/i;

const PREFIX_COMPANY = {
  [EMPLOYEE_CODE_PREFIX_BTC]: AFFILIATION_COMPANY_BITCROSS,
  [EMPLOYEE_CODE_PREFIX_ALS]: AFFILIATION_COMPANY_ALESIS,
  [EMPLOYEE_CODE_PREFIX_SWT]: AFFILIATION_COMPANY_SHUWA,
};

const LETTER_TYPE = Object.fromEntries(
  Object.entries(EMPLOYEE_TYPE_LETTER).map(([type, letter]) => [letter, type]),
);

function stripExtension(name) {
  return String(name ?? '').replace(/\.(xlsx|xls)$/i, '');
}

/**
 * @param {string} fileName
 * @returns {{
 *   complete: boolean,
 *   employeeCode: string,
 *   affiliationCompany: string,
 *   employeeType: string,
 *   hireDate: string,
 *   departmentName: string,
 *   missing: string[],
 * }}
 */
export function parseResumeFilename(fileName) {
  const raw = String(fileName ?? '').trim();
  const base = stripExtension(raw);
  const missing = [];
  const empty = {
    complete: false,
    employeeCode: '',
    affiliationCompany: '',
    employeeType: '',
    hireDate: '',
    departmentName: '',
    missing,
  };

  const matched = FILENAME_PATTERN.exec(raw) || FILENAME_PATTERN.exec(`${base}.xlsx`);
  if (!matched) {
    missing.push('ファイル名形式');
    return empty;
  }

  const employeeCode = matched[1].trim();
  const hireDate = matched[2];
  const departmentName = matched[3].trim();

  const codeMatch = CODE_PATTERN.exec(employeeCode);
  if (!codeMatch) {
    missing.push('社員ID');
  }

  const prefix = codeMatch ? codeMatch[1].toLowerCase() : '';
  const letter = codeMatch ? codeMatch[2].toUpperCase() : '';
  const affiliationCompany = PREFIX_COMPANY[prefix] || '';
  const employeeType = LETTER_TYPE[letter] || '';

  if (!affiliationCompany) missing.push('所属会社');
  if (!employeeType) missing.push('社員種別');
  if (!hireDate) missing.push('入社日');
  if (!departmentName) missing.push('所属部門');

  // BTC: 開発系は事業部付きのみ（事業部単体は可。開発部のみは不可）
  if (
    affiliationCompany &&
    isBitcrossCompany(affiliationCompany) &&
    departmentName &&
    isDevDepartmentWithoutDivision(departmentName)
  ) {
    missing.push('所属部門');
  }

  // 日付妥当性
  if (hireDate) {
    const [y, m, d] = hireDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (
      !Number.isFinite(y) ||
      dt.getFullYear() !== y ||
      dt.getMonth() !== m - 1 ||
      dt.getDate() !== d
    ) {
      missing.push('入社日');
    }
  }

  const uniqueMissing = [...new Set(missing)];
  return {
    complete: uniqueMissing.length === 0,
    employeeCode: codeMatch ? `${prefix}${letter}${codeMatch[3]}` : employeeCode,
    affiliationCompany,
    employeeType,
    hireDate,
    departmentName,
    missing: uniqueMissing,
  };
}

/**
 * 所属会社内で部門名から ID を解決する
 * @returns {number|null}
 */
export function resolveDepartmentIdByName(departments, departmentName, affiliationCompany) {
  if (!departmentName || !departments?.length) return null;
  const company = (affiliationCompany || '').trim();
  const exact = departments.find(
    (d) =>
      d.name === departmentName &&
      (!company || (d.company || '').trim() === company),
  );
  if (exact) return exact.id;
  const byName = departments.find((d) => d.name === departmentName);
  return byName?.id ?? null;
}
