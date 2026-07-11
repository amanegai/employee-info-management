export const FILE_CATEGORIES = [
  { value: 'TIMESHEET', label: '勤務表' },
  { value: 'CERTIFICATE', label: '証明書' },
  { value: 'CONTRACT', label: '契約書類' },
  { value: 'PAYROLL', label: '給与関連' },
  { value: 'APPLICATION', label: '申請書' },
  { value: 'OTHER', label: 'その他' },
];

export function fileCategoryLabel(value) {
  return FILE_CATEGORIES.find((item) => item.value === value)?.label ?? value ?? '—';
}

export function formatTargetMonthLabel(value) {
  if (!value) return '—';
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  return `${year}年${Number(month)}月`;
}

export function currentTargetMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

/** 直近 N か月（YYYY-MM、新しい順） */
export function recentTargetMonths(count = 12) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${date.getFullYear()}-${month}`);
  }
  return months;
}
