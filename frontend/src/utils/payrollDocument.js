import { currentTargetMonth, formatTargetMonthLabel } from './fileCategories';
import { resolveMonthlyExpense } from './expenseApplicationImport';
import { summarizeAttendanceRows } from './timesheetImport';

const HEADER_BG = '#dce6f1';
const GRID_COL_COUNT = 7;
const ATTENDANCE_COL_COUNT = 5;
/** A4 幅（px）— html2canvas は CSS 変数/calc 非対応のため固定値でレイアウト */
const PAYROLL_PAGE_WIDTH = 794;
const PAYROLL_VTITLE_PX = 26;
const PAYROLL_DATA_COL_PX = 103;
const PAYROLL_TABLE_W = PAYROLL_VTITLE_PX + PAYROLL_DATA_COL_PX * GRID_COL_COUNT;
const PAYROLL_INFO_TABLE_W = PAYROLL_DATA_COL_PX * 3;
const TABLE_BASE_STYLE = `border-collapse:separate;border-spacing:0;table-layout:fixed;width:${PAYROLL_TABLE_W}px;`;
const TD_BASE = 'border:1px solid #000;padding:4px;text-align:center;vertical-align:middle;font-size:10px;height:24px;background:#fff;';
const COMPANY_CELL_EXTRA = 'font-size:22px;font-weight:900;padding:9px 10px;letter-spacing:0.04em;text-align:center;height:auto;';
const TITLE_CELL_STYLE = 'border:none;background:transparent;text-align:center;font-size:28px;font-weight:800;letter-spacing:0.42em;padding:10px 0;height:auto;';
const TITLE_TABLE_STYLE = `width:${PAYROLL_TABLE_W}px;margin:32px auto 14px;border-collapse:separate;border-spacing:0;`;
const REMARKS_BOX_STYLE = `display:block;box-sizing:border-box;border:1px solid #000;width:${PAYROLL_TABLE_W}px;min-height:92px;padding:6px 8px;background:#fff;`;

function tdAttr(extra = '') {
  return `style="${TD_BASE}${extra}"`;
}

/** 7列等幅グリッド（勤怠は先頭5列のみ） */
const PAYROLL_GRID_COLUMNS = [
  {
    attendance: { key: 'workDays', label: '出勤日数' },
    earning: { key: 'basicSalary', label: '基本給' },
    deduction: { key: 'deductionHealthCare', label: '健康保険（介護）' },
  },
  {
    earning: { key: 'familyAllowance', label: '家族手当' },
    deduction: { key: 'deductionPension', label: '厚生年金' },
  },
  {
    attendance: { key: 'workHours', label: '勤務時間' },
    earning: { key: 'housingAllowance', label: '住宅手当' },
    deduction: { key: 'deductionHealth', label: '健康保険（健保）' },
  },
  {
    earning: { key: 'fixedOvertimeAllowance', label: '定額残業手当' },
    deduction: { key: 'deductionEmployment', label: '雇用保険' },
  },
  { type: 'gap' },
  {
    earning: { key: 'commuterCombined', label: '通勤／定期' },
    deduction: { key: 'deductionIncomeTax', label: '所得税' },
  },
  {
    earning: { key: 'businessExpenseAllowance', label: '営業費' },
    deduction: { key: 'deductionResidentTax', label: '住民税' },
  },
];

const EARNING_KEYS = [
  'basicSalary',
  'housingAllowance',
  'familyAllowance',
  'fixedOvertimeAllowance',
  'commuterCombined',
  'businessExpenseAllowance',
];
const DEDUCTION_KEYS = [
  'deductionHealthCare',
  'deductionHealth',
  'deductionPension',
  'deductionEmployment',
  'deductionIncomeTax',
  'deductionResidentTax',
];

function escapeHtml(value) {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatYenCell(value) {
  const num = Number(value) || 0;
  return num > 0 ? num.toLocaleString() : '';
}

function formatYenTotal(value) {
  const num = Number(value) || 0;
  return num.toLocaleString();
}

function formatHours(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return escapeHtml(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function formatPayrollText(value) {
  if (value == null || value === '') return '-';
  const text = String(value).trim();
  return text || '-';
}

function formatPayrollPeriodLabel(targetMonth) {
  if (!targetMonth) return '—';
  const [year, month] = targetMonth.split('-');
  if (!year || !month) return formatTargetMonthLabel(targetMonth);
  return `${year}年${month}月`;
}

function resolvePayrollDepartmentName(employee) {
  const name = employee?.departmentName?.trim();
  if (!name) return '-';
  const parts = name.split('・').map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : name;
}

function getFieldValue(form, key, section) {
  if (key === 'workDays') return form.workDays !== '' ? form.workDays : '';
  if (key === 'workHours') return form.workHours !== '' ? formatHours(form.workHours) : '';
  if (section === 'attendance') return '';
  return formatYenCell(form[key]);
}

export function periodLabelToTargetMonth(periodLabel) {
  const match = String(periodLabel ?? '').match(/(\d{4})年(\d{1,2})月/);
  if (!match) return null;
  return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}`;
}

export function isPayrollAttendanceMonthMatched(employee, targetMonth) {
  if (!employee?.attendance || !targetMonth) return false;
  const attendanceMonth = periodLabelToTargetMonth(employee.attendance.periodLabel);
  if (attendanceMonth) return attendanceMonth === targetMonth;
  return targetMonth === currentTargetMonth();
}

export function resolvePayrollWorkMetrics(employee, targetMonth) {
  if (!employee?.attendance || !targetMonth) {
    return { workDays: '', workHours: '' };
  }
  if (!isPayrollAttendanceMonthMatched(employee, targetMonth)) {
    return { workDays: '', workHours: '' };
  }

  const att = employee.attendance;
  let workDays = att.workDays != null && Number(att.workDays) !== 0 ? String(att.workDays) : '';
  let workHours = att.workHours != null && Number(att.workHours) !== 0 ? String(att.workHours) : '';

  if (!workDays && !workHours && att.dailyRecords?.length) {
    const monthRecords = att.dailyRecords.filter((row) => String(row.date ?? '').startsWith(targetMonth));
    const summarized = summarizeAttendanceRows(monthRecords);
    if (summarized.workDays != null) workDays = String(summarized.workDays);
    if (summarized.workHours != null) workHours = String(summarized.workHours);
  }

  return { workDays, workHours };
}

export const PAYROLL_EARNING_FIELDS = [
  { key: 'basicSalary', label: '基本給' },
  { key: 'housingAllowance', label: '住宅手当' },
  { key: 'familyAllowance', label: '家族手当' },
  { key: 'fixedOvertimeAllowance', label: '定額残業手当' },
  { key: 'commuterCombined', label: '通勤／定期' },
  { key: 'businessExpenseAllowance', label: '営業費' },
];
export const PAYROLL_DEDUCTION_FIELDS = [
  { key: 'deductionHealthCare', label: '健康保険（介護）' },
  { key: 'deductionHealth', label: '健康保険（健保）' },
  { key: 'deductionPension', label: '厚生年金' },
  { key: 'deductionEmployment', label: '雇用保険' },
  { key: 'deductionIncomeTax', label: '所得税' },
  { key: 'deductionResidentTax', label: '住民税' },
];

export function buildPayrollNo(targetMonth, employeeCode) {
  const ym = (targetMonth || '').replace('-', '');
  const digits = (employeeCode || '').replace(/\D/g, '');
  const suffix = digits.slice(-3).padStart(3, '0');
  return `${ym}${suffix}`;
}

export function payrollFileMatchesEmployee(fileName, employee) {
  if (!fileName || !employee) return false;
  const code = employee.employeeCode?.trim();
  const name = employee.employeeName?.trim() || employee.name?.trim();
  const lower = fileName.toLowerCase();
  if (code && lower.includes(code.toLowerCase())) return true;
  if (name && fileName.includes(name)) return true;
  return false;
}

export function calcPayrollTotals(form) {
  const earnings = EARNING_KEYS.map((key) => Number(form[key]) || 0);
  const deductions = DEDUCTION_KEYS.map((key) => Number(form[key]) || 0);
  const grossPay = earnings.reduce((sum, v) => sum + v, 0);
  const totalDeduction = deductions.reduce((sum, v) => sum + v, 0);
  return {
    grossPay,
    totalDeduction,
    netPay: grossPay - totalDeduction,
  };
}

export function buildPayrollFormFromEmployee(employee, targetMonth) {
  const salary = employee?.salary ?? {};
  const metrics = resolvePayrollWorkMetrics(employee, targetMonth);
  const expense = resolveMonthlyExpense(employee, targetMonth);
  const periodicPassAllowance = Number(expense?.periodicPassAllowance) || 0;
  const commuterIndividual = Number(expense?.commuterIndividualAllowance) || 0;
  const businessExpenseAllowance = Number(expense?.businessExpenseAllowance) || 0;
  const commuterCombined = periodicPassAllowance + commuterIndividual;

  return {
    targetMonth: targetMonth || '',
    companyName: 'ビットクロス株式会社',
    payrollNo: buildPayrollNo(targetMonth, employee?.employeeCode),
    workDays: metrics.workDays,
    workHours: metrics.workHours,
    basicSalary: String(salary.basicSalaryMonthly ?? ''),
    housingAllowance: String(salary.housingAllowance ?? ''),
    familyAllowance: String(salary.familyAllowance ?? ''),
    fixedOvertimeAllowance: String(salary.fixedOvertimeAllowance ?? ''),
    periodicPassAllowance: String(periodicPassAllowance),
    commuterAllowance: String(commuterIndividual),
    commuterCombined: String(commuterCombined),
    businessExpenseAllowance: String(businessExpenseAllowance),
    deductionHealthCare: String(salary.deductionHealthCare ?? ''),
    deductionHealth: String(salary.deductionHealth ?? ''),
    deductionPension: String(salary.deductionPension ?? ''),
    deductionEmployment: String(salary.deductionEmployment ?? ''),
    deductionIncomeTax: String(salary.deductionIncomeTax ?? ''),
    deductionResidentTax: String(salary.deductionResidentTax ?? ''),
    remarks: '',
  };
}

const PAYROLL_STYLES = `
  * { box-sizing: border-box; }
  html, body {
    width: ${PAYROLL_PAGE_WIDTH}px;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: "MS PGothic", "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", sans-serif;
    color: #000;
    font-size: 12px;
    line-height: 1.35;
    background: #fff;
  }
  .payroll-page {
    width: ${PAYROLL_PAGE_WIDTH}px;
    max-width: ${PAYROLL_PAGE_WIDTH}px;
    margin: 0 auto;
    padding: 18px 22px 32px;
  }
  .payroll-company-box {
    border: 1px solid #000;
    text-align: center;
    padding: 9px 10px;
    font-size: 22px;
    font-weight: 900;
    color: #000;
    letter-spacing: 0.04em;
    background: #fff;
    width: ${PAYROLL_TABLE_W}px;
  }
  .payroll-header-table {
    width: ${PAYROLL_TABLE_W}px;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
  }
  .payroll-header-table td {
    border: 1px solid #000;
    border-top: none;
    padding: 5px 8px;
    vertical-align: middle;
    font-size: 11px;
  }
  .payroll-header-table-narrow {
    width: ${PAYROLL_INFO_TABLE_W}px;
    max-width: ${PAYROLL_INFO_TABLE_W}px;
  }
  .payroll-header-table-narrow td {
    border-top: 1px solid #000;
  }
  .payroll-info-label {
    width: ${PAYROLL_DATA_COL_PX}px;
    background: ${HEADER_BG};
    text-align: center;
  }
  .payroll-info-value {
    text-align: center;
    background: #fff;
  }
  .payroll-info-gap {
    height: 22px;
  }
  .payroll-title {
    text-align: center;
    font-size: 28px;
    font-weight: 800;
    color: #000;
    letter-spacing: 0.42em;
    margin: 32px auto 14px;
    padding: 10px 0;
    font-family: inherit;
    width: ${PAYROLL_TABLE_W}px;
    display: block;
  }
  .payroll-block-table {
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    margin-bottom: 12px;
    width: ${PAYROLL_TABLE_W}px;
  }
  .payroll-block-table td {
    border: 1px solid #000;
    padding: 4px 4px;
    vertical-align: middle;
    height: 24px;
    font-size: 10px;
    text-align: center;
    overflow: hidden;
  }
  .payroll-vtitle {
    width: ${PAYROLL_VTITLE_PX}px;
    min-width: ${PAYROLL_VTITLE_PX}px;
    max-width: ${PAYROLL_VTITLE_PX}px;
    writing-mode: vertical-rl;
    text-orientation: upright;
    font-weight: 700;
    font-size: 11px;
    line-height: 1.15;
    background: #fff;
    padding: 6px 2px;
    letter-spacing: 0.05em;
  }
  .payroll-head {
    background: ${HEADER_BG};
    line-height: 1.2;
    padding: 4px 2px;
  }
  .payroll-amount,
  .payroll-total-value,
  .payroll-net-value {
    background: #fff;
    text-align: center;
  }
  .payroll-empty {
    background: #fff;
  }
  .payroll-block-table--with-net td.payroll-att-col-last {
    border-top: none;
    border-bottom: none;
  }
  .payroll-total-label {
    background: ${HEADER_BG};
    font-weight: 700;
    font-size: 11px;
  }
  .payroll-total-value {
    font-weight: 700;
    font-size: 12px;
  }
  .payroll-net-cell {
    padding: 0;
    vertical-align: middle;
    background: #fff;
    width: ${PAYROLL_DATA_COL_PX * 2}px;
  }
  .payroll-net-inner {
    width: 100%;
    min-height: 72px;
    padding: 10px 8px;
    text-align: center;
  }
  .payroll-net-label {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .payroll-net-value {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.1;
  }
  .payroll-remarks {
    border: 1px solid #000;
    width: ${PAYROLL_TABLE_W}px;
    min-height: 92px;
    padding: 6px 8px;
    background: #fff;
  }
  .payroll-remarks-label {
    font-weight: 700;
    font-size: 11px;
    margin-bottom: 6px;
  }
  .payroll-remarks-body {
    min-height: 60px;
    font-size: 11px;
  }
  @media print {
    .payroll-page {
      padding: 8mm 10mm;
      width: 210mm;
      max-width: none;
    }
  }
`;

/** 勤怠・支給・控除で同一7列グリッドを共有し、列位置を揃える */
function buildColgroup() {
  const dataCols = Array.from(
    { length: GRID_COL_COUNT },
    () => `<col style="width:${PAYROLL_DATA_COL_PX}px" />`
  ).join('');
  return `
    <colgroup>
      <col style="width:${PAYROLL_VTITLE_PX}px" />
      ${dataCols}
    </colgroup>`;
}

function verticalTitleHtml(text) {
  return escapeHtml(String(text ?? ''));
}

function getColumnsForSection(section) {
  const colCount = section === 'attendance' ? ATTENDANCE_COL_COUNT : GRID_COL_COUNT;
  return PAYROLL_GRID_COLUMNS.slice(0, colCount);
}

function buildHeaderSection(employee, form, periodLabel) {
  const detailRows = [
    ['部門名', resolvePayrollDepartmentName(employee)],
    ['役職', formatPayrollText(employee.position)],
    ['給与NO', formatPayrollText(form.payrollNo)],
    ['名前', formatPayrollText(employee.name)],
  ];
  const detailBody = detailRows
    .map(
      ([label, value]) => `
    <tr>
      <td class="payroll-info-label" ${tdAttr(`width:${PAYROLL_DATA_COL_PX}px;background:${HEADER_BG};`)}>${label}</td>
      <td class="payroll-info-value" ${tdAttr()}>${escapeHtml(value)}</td>
    </tr>`
    )
    .join('');

  return `
    <table class="payroll-company-table" style="${TABLE_BASE_STYLE}margin-bottom:0;">
      <tr>
        <td class="payroll-company-box" ${tdAttr(COMPANY_CELL_EXTRA)}>${escapeHtml(form.companyName?.trim() || 'ビットクロス株式会社')}</td>
      </tr>
    </table>
    <table class="payroll-header-table" style="${TABLE_BASE_STYLE}margin-bottom:0;">
      <tr>
        <td class="payroll-info-label" ${tdAttr(`width:${PAYROLL_DATA_COL_PX}px;background:${HEADER_BG};border-top:none;`)}>対象月</td>
        <td class="payroll-info-value" ${tdAttr('border-top:none;')}>${escapeHtml(`${periodLabel} 分`)}</td>
      </tr>
    </table>
    <table class="payroll-header-table payroll-header-table-narrow" style="${TABLE_BASE_STYLE}width:${PAYROLL_INFO_TABLE_W}px;margin-top:22px;">
      ${detailBody}
    </table>`;
}

function renderGridCell(column, section, rowKind, form, colIndex, colCount) {
  const isAttLastCol = section === 'attendance' && colIndex === colCount - 1;
  const cellClass = isAttLastCol ? ' payroll-att-col-last' : '';

  if (column.type === 'gap') {
    return `<td class="payroll-empty${cellClass}" ${tdAttr()}>&nbsp;</td>`;
  }

  const field = column[section];
  if (!field) {
    return `<td class="payroll-empty${cellClass}" ${tdAttr()}>&nbsp;</td>`;
  }

  if (rowKind === 'head') {
    return `<td class="payroll-head${cellClass}" ${tdAttr(`background:${HEADER_BG};`)}>${escapeHtml(field.label)}</td>`;
  }

  if (rowKind === 'value') {
    const display = getFieldValue(form, field.key, section);
    return `<td class="payroll-amount${cellClass}" ${tdAttr()}>${escapeHtml(String(display))}</td>`;
  }

  return `<td class="payroll-empty${cellClass}" ${tdAttr()}>&nbsp;</td>`;
}

function buildGridBlock({ title, section, form, emptyRowCount, totalLabel, totalValue, withNet = false, netPay = 0 }) {
  const columns = getColumnsForSection(section);
  const colCount = columns.length;
  const hasTotal = Boolean(totalLabel);
  const bodyRowCount = 2 + emptyRowCount + (hasTotal ? 1 : 0);
  const headCells = columns
    .map((col, index) => renderGridCell(col, section, 'head', form, index, colCount))
    .join('');
  const valueCells = columns
    .map((col, index) => renderGridCell(col, section, 'value', form, index, colCount))
    .join('');
  const fillerRows = Array.from({ length: emptyRowCount }, () => {
    const cells = columns
      .map((col, index) => renderGridCell(col, section, 'empty', form, index, colCount))
      .join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  const totalRow = hasTotal
    ? `
    <tr>
      <td class="payroll-total-label" colspan="${colCount - 1}" ${tdAttr(`background:${HEADER_BG};font-weight:700;font-size:11px;`)}>${totalLabel}</td>
      <td class="payroll-total-value" ${tdAttr('font-weight:700;font-size:12px;')}>${escapeHtml(formatYenTotal(totalValue))}</td>
    </tr>`
    : '';

  const netCell = withNet
    ? `
        <td class="payroll-net-cell" rowspan="${bodyRowCount}" colspan="2" ${tdAttr(`width:${PAYROLL_DATA_COL_PX * 2}px;padding:0;`)}>
          <div class="payroll-net-inner">
            <div class="payroll-net-label">差引支給額</div>
            <div class="payroll-net-value">${escapeHtml(formatYenTotal(netPay))}</div>
          </div>
        </td>`
    : '';

  const tableClass = withNet ? 'payroll-block-table payroll-block-table--with-net' : 'payroll-block-table payroll-block-table--standard';

  return `
    <table class="${tableClass}" style="${TABLE_BASE_STYLE}margin-bottom:12px;">
      ${buildColgroup()}
      <tr>
        <td class="payroll-vtitle" rowspan="${bodyRowCount}" ${tdAttr(`width:${PAYROLL_VTITLE_PX}px;font-weight:700;font-size:11px;padding:6px 2px;`)}>${verticalTitleHtml(title)}</td>
        ${headCells}
        ${netCell}
      </tr>
      <tr>${valueCells}</tr>
      ${fillerRows}
      ${totalRow}
    </table>`;
}

export function buildPayrollHtml(employee, form) {
  const { grossPay, totalDeduction, netPay } = calcPayrollTotals(form);
  const periodLabel = formatPayrollPeriodLabel(form.targetMonth);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>給与明細書 - ${escapeHtml(employee.name)} ${escapeHtml(periodLabel)}</title>
  <style>${PAYROLL_STYLES}</style>
</head>
<body>
  <div class="payroll-page">
    ${buildHeaderSection(employee, form, periodLabel)}

    <table class="payroll-title-wrap" data-payroll-no-border="true" style="${TITLE_TABLE_STYLE}" aria-label="給与明細書">
      <tr>
        <td class="payroll-title-cell" style="${TITLE_CELL_STYLE}">給 与 明 細 書</td>
      </tr>
    </table>

    ${buildGridBlock({ title: '勤怠', section: 'attendance', form, emptyRowCount: 2, withNet: true, netPay })}
    ${buildGridBlock({ title: '支給', section: 'earning', form, emptyRowCount: 1, totalLabel: '総支給額', totalValue: grossPay })}
    ${buildGridBlock({ title: '控除', section: 'deduction', form, emptyRowCount: 2, totalLabel: '総控除額', totalValue: totalDeduction })}

    <div class="payroll-remarks payroll-remarks-box" style="${REMARKS_BOX_STYLE}">
      <div class="payroll-remarks-label">備考</div>
      <div class="payroll-remarks-body">${escapeHtml(form.remarks?.trim() || '')}</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildPayrollFileName(employee, targetMonth) {
  const code = employee?.employeeCode?.trim() || 'employee';
  return `${code}_${targetMonth}_給与明細書.pdf`;
}

import { renderElementToPdfBlob, renderHtmlToPdfBlob } from './htmlToPdf';

export async function savePayrollToFiles(api, employee, form, previewIframe) {
  const fileName = buildPayrollFileName(employee, form.targetMonth);
  const previewRoot = previewIframe?.contentDocument?.querySelector('.payroll-page');
  const pdfBlob = previewRoot
    ? await renderElementToPdfBlob(previewRoot, { width: PAYROLL_PAGE_WIDTH, margin: [8, 10, 8, 10] })
    : await renderHtmlToPdfBlob(buildPayrollHtml(employee, form), {
        selector: '.payroll-page',
        width: PAYROLL_PAGE_WIDTH,
        margin: [8, 10, 8, 10],
      });
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
  const code = employee?.employeeCode?.trim() || '';
  const name = employee?.name?.trim() || '';
  return api.uploadFile(file, {
    category: 'PAYROLL',
    targetMonth: form.targetMonth,
    employeeId: employee?.id,
    description: `[emp:${employee?.id}] [${code}] ${name} ${formatTargetMonthLabel(form.targetMonth)} 給与明細書`,
  });
}
