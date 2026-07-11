import { formatJapaneseDate } from '../utils';
import { renderHtmlToPdfBlob } from './htmlToPdf';

export const APPLICATION_TYPES = [
  { value: 'ADDRESS_CHANGE', label: '住所変更届', icon: 'bi-house-door', desc: '住所の変更を届出' },
  { value: 'LEAVE', label: '休暇申請書', icon: 'bi-calendar-x', desc: '休暇取得を申請' },
  { value: 'GENERAL', label: '汎用申請書', icon: 'bi-file-earmark-text', desc: '自由形式の申請' },
];

function escapeHtml(value) {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function creationDateLabel(dateStr) {
  if (dateStr) return formatJapaneseDate(dateStr);
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

function applicationTitle(type) {
  return APPLICATION_TYPES.find((item) => item.value === type)?.label ?? '申請書';
}

function buildAddressChangeBody(employee, options) {
  const p = employee.personal ?? {};
  return `
    <p class="app-intro">下記のとおり住所変更の届出をいたします。</p>
    <table class="app-table">
      <tr><th>氏名</th><td>${escapeHtml(employee.name)}</td></tr>
      <tr><th>社員番号</th><td>${escapeHtml(employee.employeeCode || '—')}</td></tr>
      <tr><th>所属</th><td>${escapeHtml(employee.departmentName || '—')}</td></tr>
      <tr><th>旧住所</th><td>${escapeHtml(p.address || '—')}</td></tr>
      <tr><th>新住所</th><td>${escapeHtml(options.newAddress?.trim() || '（新住所を入力）')}</td></tr>
      <tr><th>変更予定日</th><td>${escapeHtml(options.effectiveDate ? formatJapaneseDate(options.effectiveDate) : '—')}</td></tr>
      <tr><th>備考</th><td>${escapeHtml(options.remarks?.trim() || '—')}</td></tr>
    </table>
  `;
}

function buildLeaveBody(employee, options) {
  return `
    <p class="app-intro">下記のとおり休暇取得を申請いたします。</p>
    <table class="app-table">
      <tr><th>氏名</th><td>${escapeHtml(employee.name)}</td></tr>
      <tr><th>社員番号</th><td>${escapeHtml(employee.employeeCode || '—')}</td></tr>
      <tr><th>所属</th><td>${escapeHtml(employee.departmentName || '—')}</td></tr>
      <tr><th>休暇種別</th><td>${escapeHtml(options.leaveType?.trim() || '有給休暇')}</td></tr>
      <tr><th>期間</th><td>${escapeHtml(options.leavePeriod?.trim() || '—')}</td></tr>
      <tr><th>理由</th><td>${escapeHtml(options.reason?.trim() || '—')}</td></tr>
      <tr><th>備考</th><td>${escapeHtml(options.remarks?.trim() || '—')}</td></tr>
    </table>
  `;
}

function buildGeneralBody(employee, options) {
  return `
    <p class="app-intro">${escapeHtml(options.subject?.trim() || '下記のとおり申請いたします。')}</p>
    <table class="app-table">
      <tr><th>氏名</th><td>${escapeHtml(employee.name)}</td></tr>
      <tr><th>社員番号</th><td>${escapeHtml(employee.employeeCode || '—')}</td></tr>
      <tr><th>所属</th><td>${escapeHtml(employee.departmentName || '—')}</td></tr>
      <tr><th>申請内容</th><td>${escapeHtml(options.content?.trim() || '—')}</td></tr>
      <tr><th>備考</th><td>${escapeHtml(options.remarks?.trim() || '—')}</td></tr>
    </table>
  `;
}

function buildApplicationBody(employee, options) {
  switch (options.applicationType) {
    case 'ADDRESS_CHANGE':
      return buildAddressChangeBody(employee, options);
    case 'LEAVE':
      return buildLeaveBody(employee, options);
    case 'GENERAL':
    default:
      return buildGeneralBody(employee, options);
  }
}

const DOCUMENT_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: "Yu Gothic UI", "Meiryo", sans-serif;
    color: #1a1a1a;
    margin: 0;
    font-size: 14px;
    line-height: 1.8;
    padding: 16px;
    background: #fff;
  }
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 48px;
  }
  h1 {
    text-align: center;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.15em;
    margin: 0 0 32px;
  }
  .app-meta {
    text-align: right;
    margin-bottom: 24px;
  }
  .app-intro { margin: 0 0 16px; }
  .app-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 32px;
  }
  .app-table th,
  .app-table td {
    border: 1px solid #334155;
    padding: 10px 12px;
    vertical-align: top;
  }
  .app-table th {
    width: 26%;
    background: #f8fafc;
    font-weight: 600;
    text-align: left;
  }
  .app-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 48px;
    font-size: 13px;
  }
  @media print {
    body { padding: 0; }
    .page { padding: 24px; }
  }
`;

export function buildApplicationHtml(employee, options = {}) {
  const title = applicationTitle(options.applicationType);
  const companyName = options.companyName?.trim() || '（会社名を入力）';
  const submitDate = creationDateLabel(options.submitDate);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} - ${escapeHtml(employee.name)}</title>
  <style>${DOCUMENT_STYLES}</style>
</head>
<body>
  <div class="page">
    <div class="app-meta">提出日：${escapeHtml(submitDate)}</div>
    <div class="app-meta" style="text-align:left;margin-bottom:8px;">${escapeHtml(companyName)}　人事部　御中</div>
    <h1>${escapeHtml(title)}</h1>
    ${buildApplicationBody(employee, options)}
    <div class="app-footer">
      <span>所属：${escapeHtml(employee.departmentName || '—')}</span>
      <span>氏名：${escapeHtml(employee.name)}</span>
    </div>
  </div>
</body>
</html>`;
}

export function buildApplicationFileName(employee, options = {}) {
  const code = employee?.employeeCode?.trim() || 'employee';
  const title = applicationTitle(options.applicationType);
  return `${code}_${title}.pdf`;
}

export async function saveApplicationToFiles(api, employee, options = {}) {
  const html = buildApplicationHtml(employee, options);
  const fileName = buildApplicationFileName(employee, options);
  const pdfBlob = await renderHtmlToPdfBlob(html, { selector: '.page' });
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
  return api.uploadFile(file, {
    category: 'OTHER',
    description: `${employee.name} ${applicationTitle(options.applicationType)}`,
  });
}
