import { formatJapaneseDate } from '../utils';
import { renderHtmlToPdfBlob } from './htmlToPdf';

export const CERTIFICATE_TYPES = [
  { value: 'ENROLLMENT', label: '在籍証明書', icon: 'bi-person-check', desc: '在籍状況を証明' },
  { value: 'EMPLOYMENT', label: '就労証明書', icon: 'bi-briefcase', desc: '就労内容を証明' },
  { value: 'CAREER', label: '経歴証明書', icon: 'bi-journal-text', desc: '職務経歴を証明' },
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

function certificateTitle(type) {
  return CERTIFICATE_TYPES.find((item) => item.value === type)?.label ?? '証明書';
}

function buildEnrollmentBody(employee, options) {
  const p = employee.personal ?? {};
  const hr = employee.hr ?? {};
  const hireDate = hr.hireDate ? formatJapaneseDate(hr.hireDate) : '—';
  const purpose = options.purpose?.trim() || '下記のとおり証明いたします。';

  return `
    <p class="cert-body">${escapeHtml(purpose)}</p>
    <table class="cert-table">
      <tr><th>氏名</th><td>${escapeHtml(employee.name)}</td></tr>
      <tr><th>社員番号</th><td>${escapeHtml(employee.employeeCode)}</td></tr>
      <tr><th>所属</th><td>${escapeHtml(employee.departmentName || '—')}</td></tr>
      <tr><th>役職</th><td>${escapeHtml(employee.position || '—')}</td></tr>
      <tr><th>入社年月日</th><td>${escapeHtml(hireDate)}</td></tr>
      <tr><th>在籍状況</th><td>現在、当社に在籍しております。</td></tr>
    </table>
    <p class="cert-note">上記の事実に相違ないことを証明します。</p>
  `;
}

function buildEmploymentBody(employee, options) {
  const p = employee.personal ?? {};
  const hr = employee.hr ?? {};
  const hireDate = hr.hireDate ? formatJapaneseDate(hr.hireDate) : '—';
  const purpose = options.purpose?.trim() || '下記のとおり就労していることを証明いたします。';

  return `
    <p class="cert-body">${escapeHtml(purpose)}</p>
    <table class="cert-table">
      <tr><th>氏名</th><td>${escapeHtml(employee.name)}</td></tr>
      <tr><th>生年月日</th><td>${escapeHtml(p.birthDate ? formatJapaneseDate(p.birthDate) : '—')}</td></tr>
      <tr><th>所属</th><td>${escapeHtml(employee.departmentName || '—')}</td></tr>
      <tr><th>入社年月日</th><td>${escapeHtml(hireDate)}</td></tr>
      <tr><th>就労内容</th><td>${escapeHtml(employee.position || employee.employeeType || '—')}</td></tr>
    </table>
    <p class="cert-note">上記のとおり就労していることを証明します。</p>
  `;
}

function buildCareerBody(employee, options) {
  const careers = (employee.careers ?? []).slice(0, 5);
  const purpose = options.purpose?.trim() || '下記のとおり経歴を証明いたします。';
  const rows = careers.length
    ? careers
        .map(
          (c) =>
            `<tr><td>${escapeHtml(c.startDate ? formatJapaneseDate(c.startDate) : c.period || '—')}</td><td>${escapeHtml(c.organization || '—')}</td><td>${escapeHtml(c.roleOverview || '—')}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="3">登録された職務経歴がありません。</td></tr>';

  return `
    <p class="cert-body">${escapeHtml(purpose)}</p>
    <p class="cert-subject"><strong>対象者：</strong>${escapeHtml(employee.name)}（${escapeHtml(employee.employeeCode || '—')}）</p>
    <table class="cert-table cert-table-career">
      <thead><tr><th>期間</th><th>所属・プロジェクト</th><th>業務内容</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="cert-note">上記の経歴に相違ないことを証明します。</p>
  `;
}

function buildCertificateBody(employee, options) {
  switch (options.certificateType) {
    case 'EMPLOYMENT':
      return buildEmploymentBody(employee, options);
    case 'CAREER':
      return buildCareerBody(employee, options);
    case 'ENROLLMENT':
    default:
      return buildEnrollmentBody(employee, options);
  }
}

const DOCUMENT_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: "Yu Mincho", "Yu Mincho Demibold", "Hiragino Mincho ProN", "MS PMincho", serif;
    color: #1a1a1a;
    margin: 0;
    font-size: 15px;
    line-height: 1.9;
    letter-spacing: 0.04em;
    padding: 16px;
    background: #fff;
  }
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 52px;
  }
  h1 {
    text-align: center;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.25em;
    margin: 0 0 36px;
  }
  .cert-meta {
    text-align: right;
    margin-bottom: 28px;
    font-size: 14px;
  }
  .cert-body { margin: 0 0 20px; }
  .cert-subject { margin: 0 0 16px; }
  .cert-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 14px;
  }
  .cert-table th,
  .cert-table td {
    border: 1px solid #334155;
    padding: 10px 12px;
    vertical-align: top;
  }
  .cert-table th {
    width: 28%;
    background: #f8fafc;
    font-weight: 600;
    text-align: left;
  }
  .cert-table-career th { text-align: center; }
  .cert-note { margin: 28px 0 48px; }
  .cert-footer {
    text-align: right;
    margin-top: 48px;
    line-height: 2;
  }
  .cert-company { font-size: 16px; font-weight: 600; }
  .cert-recipient {
    margin-bottom: 24px;
    font-size: 14px;
  }
  @media print {
    body { padding: 0; }
    .page { padding: 24px; }
  }
`;

export function buildCertificateHtml(employee, options = {}) {
  const title = certificateTitle(options.certificateType);
  const companyName = options.companyName?.trim() || '（会社名を入力）';
  const issuerName = options.issuerName?.trim() || '人事部';
  const issueDate = creationDateLabel(options.issueDate);
  const recipient = options.recipient?.trim();

  const recipientBlock = recipient
    ? `<div class="cert-recipient">${escapeHtml(recipient)}　殿</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} - ${escapeHtml(employee.name)}</title>
  <style>${DOCUMENT_STYLES}</style>
</head>
<body>
  <div class="page">
    ${recipientBlock}
    <h1>${escapeHtml(title)}</h1>
    <div class="cert-meta">発行日：${escapeHtml(issueDate)}</div>
    ${buildCertificateBody(employee, options)}
    <div class="cert-footer">
      <div class="cert-company">${escapeHtml(companyName)}</div>
      <div>${escapeHtml(issuerName)}</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildCertificateFileName(employee, options = {}) {
  const code = employee?.employeeCode?.trim() || 'employee';
  const title = certificateTitle(options.certificateType);
  return `${code}_${title}.pdf`;
}

export async function saveCertificateToFiles(api, employee, options = {}) {
  const html = buildCertificateHtml(employee, options);
  const fileName = buildCertificateFileName(employee, options);
  const pdfBlob = await renderHtmlToPdfBlob(html, { selector: '.page' });
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
  return api.uploadFile(file, {
    category: 'CERTIFICATE',
    description: `${employee.name} ${certificateTitle(options.certificateType)}`,
  });
}
