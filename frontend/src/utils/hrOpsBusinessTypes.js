export const HR_OPS_CATEGORIES = [
  { id: 'documents', label: '書類作成', icon: 'bi-file-earmark-text' },
  { id: 'operations', label: '書類送付', icon: 'bi-send-check' },
  { id: 'procedures', label: '手続き', icon: 'bi-folder2-open' },
];

export const HR_OPS_BUSINESS_TYPES = [
  {
    id: 'certificate',
    category: 'documents',
    label: '証明書作成',
    description: '在籍証明書・就労証明書・経歴証明書など各種証明書を作成します',
    icon: 'bi-file-earmark-text',
    route: '/hr-ops/certificate',
    tone: 'primary',
    available: true,
  },
  {
    id: 'application-review',
    category: 'documents',
    label: '申請書確認',
    description: '社員が提出した育児休業申出書（.docx）を確認・修正し、PDF保存と稼働状況を更新します',
    icon: 'bi-file-earmark-check',
    route: '/hr-ops/application-review',
    tone: 'success',
    available: true,
  },
  {
    id: 'application',
    category: 'documents',
    label: '各種申請書作成',
    description: '住所変更届・休暇申請書などの申請書類を作成します',
    icon: 'bi-file-earmark-ruled',
    route: '/hr-ops/application',
    tone: 'success',
    available: true,
  },
  {
    id: 'payroll',
    category: 'procedures',
    label: '給与明細書作成',
    description: '社員詳細の給与情報から給与明細書を作成し、ファイル管理に保存できます',
    icon: 'bi-cash-stack',
    route: '/hr-ops/payroll',
    tone: 'warning',
    available: true,
  },
  {
    id: 'client-send',
    category: 'operations',
    label: '関連書類送付',
    description: '給与明細書・勤務表・報告書類をファイル管理から選び、取引先や社員へメール送付します',
    icon: 'bi-envelope-paper',
    route: '/hr-ops/client-send',
    tone: 'accent',
    available: true,
  },
  {
    id: 'onboarding',
    category: 'procedures',
    label: '入社手続',
    description: '入社に必要な書類・手続きを行います',
    icon: 'bi-person-plus',
    route: '/hr-ops/onboarding',
    tone: 'warning',
    available: false,
  },
  {
    id: 'offboarding',
    category: 'procedures',
    label: '退社手続',
    description: '退職に伴う書類・手続きを行います',
    icon: 'bi-person-dash',
    route: '/hr-ops/offboarding',
    tone: 'warning',
    available: false,
  },
  {
    id: 'other',
    category: 'procedures',
    label: 'その他業務',
    description: '上記以外の人事業務を行います',
    icon: 'bi-three-dots',
    route: '/hr-ops/other',
    tone: 'neutral',
    available: false,
  },
];

export function findHrOpsBusinessType(id) {
  return HR_OPS_BUSINESS_TYPES.find((item) => item.id === id) ?? null;
}

export function groupHrOpsBusinessTypes() {
  return HR_OPS_CATEGORIES.map((category) => ({
    ...category,
    items: HR_OPS_BUSINESS_TYPES.filter((item) => item.category === category.id),
  }));
}

