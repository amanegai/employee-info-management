/** 給与明細送付メール（経理担当 → 社員）の定型文 */

export const PAYROLL_MAIL_COMPANY = 'Bitcross';

export const PAYROLL_MAIL_SIGNATURE = `************************************************************
ビットクロス株式会社
総務部　芦茜（ろ あかね）
〒110-0003　東京都台東区根岸3丁目1-22 立花ビル台東根岸6F
TEL：03-6206-0212
FAX：03-6206-0466
Personal Mail：xi.lu@bitcross.co.jp
経理共用Mail：keiri@bitcross.co.jp
************************************************************`;

export function formatPayrollMailMonthSuffix(targetMonth) {
  if (!targetMonth) return '';
  const [year, month] = String(targetMonth).split('-');
  if (!year || !month) return '';
  return `${year}${month}月分`;
}

export function buildPayrollMailSubject(targetMonth) {
  const suffix = formatPayrollMailMonthSuffix(targetMonth);
  return suffix
    ? `【${PAYROLL_MAIL_COMPANY}：給与明細のご送付】${suffix}`
    : `【${PAYROLL_MAIL_COMPANY}：給与明細のご送付】`;
}

export function buildPayrollMailBody(employeeName, extraMessage = '') {
  const name = String(employeeName ?? '').trim() || '（社員名）';
  const lines = [
    `${name}さん`,
    '',
    'お疲れさまです、経理担当です！',
    '',
    '今月の給与明細を添付でお送りします。',
    'もし内容に気になる点などありましたら、お気軽にご連絡ください。',
    '',
    'よろしくお願いします！',
  ];

  const trimmedExtra = String(extraMessage ?? '').trim();
  if (trimmedExtra) {
    lines.push('', trimmedExtra);
  }

  lines.push('', PAYROLL_MAIL_SIGNATURE);
  return lines.join('\n');
}
