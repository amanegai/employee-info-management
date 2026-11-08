import { technicalSkillsToMap, mapToTechnicalSkills } from './constants/technicalSkillTemplate';

const STATUS_CLASS = {
  稼働中: 'bg-success',
  待機中: 'bg-warning text-dark',
  休業: 'bg-secondary',
  退職予定: 'bg-danger',
  退職: 'bg-dark',
  案件終了間近: 'bg-info text-dark',
};

const EVAL_CLASS = {
  S: 'bg-danger',
  A: 'bg-primary',
  B: 'bg-success',
  C: 'bg-warning text-dark',
  D: 'bg-secondary',
};

export function workStatusClass(status) {
  return STATUS_CLASS[status] || 'bg-light text-dark';
}

export function evaluationClass(evaluation) {
  if (!evaluation) return 'bg-light text-dark';
  const grade = evaluation.charAt(0);
  return EVAL_CLASS[grade] || 'bg-light text-dark';
}

export const EMPTY_DISPLAY = '-';

export const ASSIGNMENT_ROLE_LABELS = {
  PM: 'プロジェクトマネージャー',
  PL: 'プロジェクトリーダー',
  SE: 'システムエンジニア',
  PG: 'プログラマ',
};

export function assignmentRoleLabel(code) {
  if (!code?.trim()) return '';
  return ASSIGNMENT_ROLE_LABELS[code.trim().toUpperCase()] || code.trim();
}

export function formatUnitPrice(price) {
  if (price == null || price === 0) return EMPTY_DISPLAY;
  return `¥${Number(price).toLocaleString('ja-JP')}`;
}

export function formatYen(amount) {
  if (amount == null) return EMPTY_DISPLAY;
  return `${Number(amount).toLocaleString('ja-JP')} 円`;
}

export function formatJapaneseDate(dateStr) {
  if (!dateStr) return EMPTY_DISPLAY;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y) return dateStr;
  return `${y}年${m}月${d}日`;
}

function parseLocalDateParts(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).trim().split('-').map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, d || 1);
}

/** 来日年月から日本滞在年数・月数を計算 */
export function durationInJapanFromDate(arrivalDate) {
  const start = parseLocalDateParts(arrivalDate);
  if (!start) return null;

  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0 || (years === 0 && months < 0)) return null;
  return { years, months };
}

/** @deprecated 互換用。年数のみ返す */
export function yearsInJapanFromDate(arrivalDate) {
  const duration = durationInJapanFromDate(arrivalDate);
  return duration ? duration.years : null;
}

export function formatYearsInJapan(arrivalDate) {
  const duration = durationInJapanFromDate(arrivalDate);
  if (!duration) return '';
  const { years, months } = duration;
  return `${years}年${months}ヶ月`;
}

export function normalizeDepartmentId(value) {
  if (value == null || value === '') return null;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MAX_WIDTH = 400;
const PHOTO_MAX_HEIGHT = 500;

/** 社員写真ファイルをリサイズして Data URL に変換 */
export async function processEmployeePhotoFile(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('画像ファイル（JPG / PNG など）を選択してください');
  }
  if (file.size > PHOTO_MAX_BYTES) {
    throw new Error('5MB以下の画像を選択してください');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      image.src = objectUrl;
    });

    const scale = Math.min(PHOTO_MAX_WIDTH / img.width, PHOTO_MAX_HEIGHT / img.height, 1);
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const RANK_COLORS = {
  S: '#6f42c1',
  A: '#0d6efd',
  B: '#198754',
  C: '#fd7e14',
  D: '#dc3545',
};

export function rankColor(rank) {
  if (!rank) return '#6c757d';
  return RANK_COLORS[rank.charAt(0)] || '#6c757d';
}

export const EVAL_LEGEND = [
  { rank: 'S', label: '卓越した成果', color: RANK_COLORS.S },
  { rank: 'A', label: '高い成果', color: RANK_COLORS.A },
  { rank: 'B', label: '必要十分', color: RANK_COLORS.B },
  { rank: 'C', label: '改善余地', color: RANK_COLORS.C },
  { rank: 'D', label: '大幅な改善が必要', color: RANK_COLORS.D },
];

/** 一覧の evaluation（例: S3）を分解 */
export function parseEvaluation(evaluation) {
  if (!evaluation || evaluation.length < 2) return null;
  const grade = evaluation.charAt(0).toUpperCase();
  const level = Number(evaluation.charAt(1));
  if (!['S', 'A', 'B', 'C', 'D'].includes(grade) || level < 1 || level > 5) return null;
  const legend = EVAL_LEGEND.find((e) => e.rank === grade);
  return {
    grade,
    level,
    full: `${grade}${level}`,
    rankLabel: legend ? `（${legend.label}）` : '',
  };
}

export function getRankLabel(grade) {
  const item = EVAL_LEGEND.find((e) => e.rank === grade);
  return item ? `（${item.label}）` : '';
}

export const DETAIL_TABS = [
  { id: 'basic', label: '基本情報' },
  { id: 'projects', label: '案件・配属' },
  { id: 'skills', label: 'スキル・資格・経歴' },
  { id: 'attendance', label: '勤怠・評価・メモ' },
  { id: 'evaluation', label: '総合評価' },
  { id: 'salary', label: '給与・人事', salary: true },
];

export const SUMMARY_FILTERS = {
  activeCount: 'active',
  workingCount: 'working',
  standbyCount: 'standby',
  endingThisMonthCount: 'endingThisMonth',
};

export const SUMMARY_FILTER_LABELS = {
  active: '在籍社員',
  working: '稼働中',
  standby: '待機中',
  endingThisMonth: '今月終了予定',
};

const EMPLOYEE_LIST_CSV_HEADERS = [
  '社員ID',
  '社員名',
  '所属会社',
  '所属部門',
  '役職',
  '社員種別',
  '稼働状況',
  '請求単価',
  '評価',
  '最終更新',
  '更新者',
];

export function formatEmployeeUpdatedAt(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (!text) return '';
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return text.replace('T', ' ').slice(0, 16);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function escapeCsvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildEmployeeListCsv(employees) {
  const rows = employees.map((emp) => [
    emp.employeeCode,
    emp.name,
    emp.affiliationCompany,
    emp.departmentName,
    emp.position,
    emp.employeeType,
    emp.workStatus,
    emp.unitPrice ?? 0,
    emp.evaluation,
    formatEmployeeUpdatedAt(emp.updatedAt),
    emp.updatedByName || '',
  ]);
  return [EMPLOYEE_LIST_CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
}

function csvExportFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `社員一覧_${stamp}.csv`;
}

/** 一覧表示中の社員データを CSV ファイルとしてダウンロード */
export function exportEmployeesToCsv(employees) {
  const csv = buildEmployeeListCsv(employees);
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = csvExportFilename();
  link.click();
  URL.revokeObjectURL(url);
}

/** 配下に開発部などを持つ事業部（親部門）を選択肢から除外する */
export function excludeParentDepartments(departments) {
  if (!departments?.length) return [];
  const parentIds = new Set(
    departments
      .map((d) => d.parentId)
      .filter((id) => id != null && id !== '')
      .map(Number)
  );
  return departments.filter((d) => !parentIds.has(Number(d.id)));
}

/** 事業部選択時は配下の開発部 ID も含めて返す */
export function resolveDepartmentFilterIds(departmentId, departments) {
  if (!departmentId) return null;
  const id = Number(departmentId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const children = (departments || [])
    .filter((d) => Number(d.parentId) === id)
    .map((d) => d.id);
  return children.length > 0 ? [id, ...children] : [id];
}

export function filterEmployeesByDepartmentScope(employees, departmentScope) {
  if (!departmentScope?.length) return employees ?? [];
  const scopeSet = new Set(departmentScope);
  return (employees ?? []).filter(
    (emp) => emp.departmentId == null || scopeSet.has(emp.departmentId)
  );
}

/** サマリーカードと同じ条件で一覧を絞り込む（API未対応時も動作） */
export function filterBySummary(employees, summaryFilter) {
  if (!summaryFilter || !employees?.length) return employees ?? [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return employees.filter((emp) => {
    switch (summaryFilter) {
      case 'active':
        return emp.workStatus !== '退職';
      case 'working':
        return emp.workStatus === '稼働中';
      case 'standby':
        return emp.workStatus === '待機中';
      case 'endingThisMonth':
        // 一覧 API の summaryFilter と同条件。配属終了日は API 側で判定するため、
        // クライアントでは在籍中のみ通し、詳細絞り込みは API 結果を信頼する。
        return emp.workStatus !== '退職' && emp.workStatus !== '休業';
      default:
        return true;
    }
  });
}

export const EVAL_CATEGORIES = [
  { code: 'BASIC', label: '基本業務能力', headerColor: '#0d6efd', icon: 'bi-list-check' },
  { code: 'TECH', label: '技術スキル', headerColor: '#198754', icon: 'bi-pc-display' },
  { code: 'COMM', label: 'コミュニケーション', headerColor: '#fd7e14', icon: 'bi-chat-dots' },
  { code: 'PROJECT', label: 'プロジェクト遂行力', headerColor: '#6f42c1', icon: 'bi-diagram-3' },
  { code: 'COMPLIANCE', label: '勤怠・コンプライアンス', headerColor: '#dc3545', icon: 'bi-person-check' },
  { code: 'CUSTOMER', label: '顧客評価', headerColor: '#0a4a7a', icon: 'bi-people-fill' },
  { code: 'LEARNING', label: '学習・成長', headerColor: '#0dcaf0', icon: 'bi-mortarboard' },
];

export const RANK_OPTIONS = ['S', 'A', 'B', 'C', 'D'];

/** 詳細画面サンプル（E001）と同一の評価項目テンプレート（コメントは初期表示用） */
export const DEFAULT_EVALUATION_ITEMS = [
  { categoryCode: 'BASIC', itemName: '業務理解力', rankGrade: '', comment: '新規業務でもキャッチアップが早く、要件の意図を正確に把握している。' },
  { categoryCode: 'BASIC', itemName: '論理的思考力', rankGrade: '', comment: '問題整理・説明が明確で、レビュー時の指摘も論理的。' },
  { categoryCode: 'BASIC', itemName: '問題発見力', rankGrade: '', comment: '仕様漏れに気づくこともあるが、テスト設計視点の強化が今後の課題。' },
  { categoryCode: 'BASIC', itemName: '作業スピード', rankGrade: '', comment: '工数見積に対して余裕を持って完了できる。' },
  { categoryCode: 'BASIC', itemName: '正確性', rankGrade: '', comment: 'ケアレスミスが極めて少なく、品質が安定している。' },
  { categoryCode: 'TECH', itemName: '設計力（基本設計）', rankGrade: '', comment: '業務フロー・画面設計の粒度が適切で、顧客レビューもスムーズ。' },
  { categoryCode: 'TECH', itemName: '設計力（詳細設計）', rankGrade: '', comment: 'クラス・IF設計は十分。再利用性の観点向上に期待。' },
  { categoryCode: 'TECH', itemName: '実装スキル', rankGrade: '', comment: 'コーディングが安定。レビュー修正が少ない。' },
  { categoryCode: 'TECH', itemName: 'テストスキル', rankGrade: '', comment: '基本ケースは網羅。境界値・異常系の考慮に余地あり。' },
  { categoryCode: 'TECH', itemName: 'インフラ理解', rankGrade: '', comment: 'AWS基本サービスを理解。環境構築を独力で実施可能。' },
  { categoryCode: 'TECH', itemName: 'セキュリティ意識', rankGrade: '', comment: 'ログマスキング・権限設計など実装レベルで配慮。' },
  { categoryCode: 'TECH', itemName: 'ドキュメント作成能力', rankGrade: '', comment: 'レビュー資料・手順書は読みやすい。図表活用が今後の改善点。' },
  { categoryCode: 'COMM', itemName: '報連相', rankGrade: '', comment: '報告タイミングが適切で、PMが状況を把握しやすい。' },
  { categoryCode: 'COMM', itemName: '社内コミュニケーション', rankGrade: '', comment: '情報共有は十分。より能動的な発信に期待。' },
  { categoryCode: 'COMM', itemName: '顧客折衝能力', rankGrade: '', comment: 'スケジュール調整も冷静。顧客からの信頼が厚い。' },
  { categoryCode: 'COMM', itemName: '協調性', rankGrade: '', comment: '多様なメンバーと協力し、雰囲気作りに貢献。' },
  { categoryCode: 'COMM', itemName: 'チーム貢献度', rankGrade: '', comment: '担当外のサポート・レビュー支援も積極的。' },
  { categoryCode: 'PROJECT', itemName: '自主性', rankGrade: '', comment: '指示待ちではなく、自らタスクを見つけて動ける。' },
  { categoryCode: 'PROJECT', itemName: 'タスク遂行能力', rankGrade: '', comment: '並行タスクの優先付けが上手で、漏れが少ない。' },
  { categoryCode: 'PROJECT', itemName: '進捗管理', rankGrade: '', comment: '報告は適切。課題発生時のリスク提示をより早く。' },
  { categoryCode: 'PROJECT', itemName: '課題解決力', rankGrade: '', comment: '技術課題を自力で調査し、代替案を提示できる。' },
  { categoryCode: 'PROJECT', itemName: 'リスク管理', rankGrade: '', comment: 'リスク認識はある。早期共有・記録の徹底が必要。' },
  { categoryCode: 'PROJECT', itemName: 'リーダーシップ', rankGrade: '', comment: 'サブリーダーとしてメンバーをフォロー。今後の成長に期待。' },
  { categoryCode: 'COMPLIANCE', itemName: '出勤状況', rankGrade: '', comment: '遅刻・欠勤がほぼなく、事前連絡も適切。' },
  { categoryCode: 'COMPLIANCE', itemName: '納期遵守', rankGrade: '', comment: '遅延がほぼなく、余裕を持って完了することが多い。' },
  { categoryCode: 'COMPLIANCE', itemName: 'セキュリティ遵守', rankGrade: '', comment: '機密情報の取扱いに注意深く、意識が高い。' },
  { categoryCode: 'COMPLIANCE', itemName: '作業報告・記録', rankGrade: '', comment: 'JIRA/Redmineへの記録は十分。コメント粒度の向上に期待。' },
  { categoryCode: 'CUSTOMER', itemName: '顧客満足度', rankGrade: '', comment: '指名での評価あり。継続希望の声が強い。' },
  { categoryCode: 'CUSTOMER', itemName: '品質への信頼度', rankGrade: '', comment: '成果物への信頼が高く、重大なクレームなし。' },
  { categoryCode: 'CUSTOMER', itemName: '顧客との関係性', rankGrade: '', comment: '日常コミュニケーションが良好で、相談しやすい。' },
  { categoryCode: 'LEARNING', itemName: '新技術の習得意欲', rankGrade: '', comment: 'AWS・AI関連などの勉強会に積極的に参加。' },
  { categoryCode: 'LEARNING', itemName: '自己研鑽・資格取得', rankGrade: '', comment: '情報処理安全確保支援士を取得。' },
  { categoryCode: 'LEARNING', itemName: '改善提案・フィードバック反映', rankGrade: '', comment: 'レビュー指摘の吸収は早い。提案の幅拡大に期待。' },
];

const DEFAULT_EVALUATION_COMMENT_BY_KEY = new Map(
  DEFAULT_EVALUATION_ITEMS.map((item) => [`${item.categoryCode}:${item.itemName}`, item.comment])
);

const RANK_SCORE = { S: 5, A: 4, B: 3, C: 2, D: 1 };
const EVAL_GRADES = ['D', 'C', 'B', 'A', 'S'];

export function calculateEvaluationFromItems(items) {
  if (!items?.length) return null;

  const byCategory = {};
  for (const item of items) {
    if (!item?.rankGrade) continue;
    const letter = item.rankGrade.trim().substring(0, 1).toUpperCase();
    const score = RANK_SCORE[letter];
    if (!score) continue;
    if (!byCategory[item.categoryCode]) byCategory[item.categoryCode] = [];
    byCategory[item.categoryCode].push(score);
  }

  const categoryScores = Object.entries(byCategory)
    .map(([categoryCode, scores]) => ({
      categoryCode,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .filter((cs) => cs.averageScore > 0);

  if (!categoryScores.length) return null;

  const overallAvg =
    categoryScores.reduce((sum, cs) => sum + cs.averageScore, 0) / categoryScores.length;

  const clamped = Math.max(1, Math.min(5, overallAvg));
  const index = Math.round(((clamped - 1) / 4) * 24);
  const gradeIdx = Math.floor(Math.max(0, Math.min(24, index)) / 5);
  const level = (Math.max(0, Math.min(24, index)) % 5) + 1;
  const evaluation = `${EVAL_GRADES[gradeIdx]}${level}`;

  return { evaluation, grade: evaluation.charAt(0), averageScore: overallAvg };
}

export function periodLabelToMonth(value) {
  if (!value) return '';
  const match = value.match(/(\d{4})年(\d{1,2})月/);
  if (!match) return '';
  return `${match[1]}-${match[2].padStart(2, '0')}`;
}

export function monthToPeriodLabel(value) {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!year || !month) return '';
  return `${year}年${Number(month)}月`;
}

export function periodLabelToSlashDisplay(value) {
  if (!value) return '';
  const match = value.match(/(\d{4})年(\d{1,2})月/);
  if (!match) return '';
  return `${match[1]}/${Number(match[2])}`;
}

export function slashDisplayToPeriodLabel(value) {
  if (!value || !String(value).trim()) return '';
  const trimmed = String(value).trim();
  const slashMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})$/);
  if (slashMatch) {
    const month = Number(slashMatch[2]);
    if (month < 1 || month > 12) return null;
    return `${slashMatch[1]}年${month}月`;
  }
  const jpMatch = trimmed.match(/^(\d{4})年(\d{1,2})月$/);
  if (jpMatch) {
    const month = Number(jpMatch[2]);
    if (month < 1 || month > 12) return null;
    return `${jpMatch[1]}年${month}月`;
  }
  return null;
}

export function applyEvaluationToForm(form) {
  const calc = calculateEvaluationFromItems(form.evaluationItems);
  const hasRankedItems = (form.evaluationItems ?? []).some((item) => item.rankGrade?.trim());
  return {
    ...form,
    evaluation: hasRankedItems ? calc?.evaluation ?? form.evaluation ?? '' : '',
    overallEvaluation: {
      ...form.overallEvaluation,
      overallRank: hasRankedItems ? calc?.grade ?? form.overallEvaluation?.overallRank ?? '' : '',
    },
  };
}

export function createDefaultEvaluationItems() {
  return DEFAULT_EVALUATION_ITEMS.map((item) => ({ ...item }));
}

function applyDefaultEvaluationComments(items) {
  return items.map((item) => {
    if (item.comment?.trim()) {
      return item;
    }
    const defaultComment = DEFAULT_EVALUATION_COMMENT_BY_KEY.get(
      `${item.categoryCode}:${item.itemName}`
    );
    return defaultComment ? { ...item, comment: defaultComment } : item;
  });
}

export function hasEmployeeEvaluation(detail) {
  if (!detail) return false;
  if (detail.evaluation?.trim()) return true;
  if (detail.evaluationCalculated) return true;
  const items = flattenEvaluationCategories(detail.evaluationCategories);
  return items.some((item) => item.rankGrade?.trim());
}

export function mergeEvaluationItems(existingItems, { fillDefaultComments = false } = {}) {
  const items = (existingItems || []).map((item) => ({ ...item }));
  const existingKeys = new Set(items.map((item) => `${item.categoryCode}:${item.itemName}`));

  for (const template of DEFAULT_EVALUATION_ITEMS) {
    const key = `${template.categoryCode}:${template.itemName}`;
    if (!existingKeys.has(key)) {
      items.push({ ...template });
      existingKeys.add(key);
    }
  }

  const categoryOrder = EVAL_CATEGORIES.map((c) => c.code);
  const templateOrder = new Map(
    DEFAULT_EVALUATION_ITEMS.map((item, index) => [`${item.categoryCode}:${item.itemName}`, index])
  );

  const sorted = items.sort((a, b) => {
    const catDiff =
      categoryOrder.indexOf(a.categoryCode) - categoryOrder.indexOf(b.categoryCode);
    if (catDiff !== 0) return catDiff;
    return (
      (templateOrder.get(`${a.categoryCode}:${a.itemName}`) ?? 999) -
      (templateOrder.get(`${b.categoryCode}:${b.itemName}`) ?? 999)
    );
  });

  return fillDefaultComments ? applyDefaultEvaluationComments(sorted) : sorted;
}

export function getEvaluationItemsByCategory(items, categoryCode) {
  return (items || []).filter((item) => item.categoryCode === categoryCode);
}

export const NEEDS_END_DATE = ['退職予定', '案件終了間近', '休業'];

/** 終了予定日フィールドの表示ラベル（稼働状況別） */
export function endDateFieldLabel(workStatus) {
  if (workStatus === '休業') return '職場復帰予定日';
  if (workStatus === '案件終了間近') return '所属案件終了予定日';
  return '終了予定日';
}

/**
 * 退社日に応じた稼働状況。
 * 当日を含む到達後は「退職」、未到達は「退職予定」。
 */
export function workStatusFromResignationDate(resignationDate, today = new Date()) {
  const value = String(resignationDate ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayText = `${y}-${m}-${d}`;
  return value <= todayText ? '退職' : '退職予定';
}

export function buildResignationSaveConfirmMessage(resignationDate) {
  const nextStatus = workStatusFromResignationDate(resignationDate);
  if (!nextStatus) {
    return '退社日をクリアして保存します。よろしいですか？';
  }
  return [
    '退社日を保存します。',
    nextStatus === '退職'
      ? '・退社日に到達しているため、稼働状況を「退職」に更新します。'
      : '・退社日未到達のため、稼働状況を「退職予定」に更新します。',
    'よろしいですか？',
  ].join('\n');
}

const EMPTY_PERSONAL = {
  gender: '',
  birthDate: '',
  nationalityId: '',
  residenceStatusId: '',
  residenceCardNumber: '',
  residenceCardExpiry: '',
  phone: '',
  email: '',
  address: '',
  education: '',
  nearestStation: '',
  photoUrl: '',
  furigana: '',
  maritalStatus: '',
  itIndustryYears: '',
  japanArrivalDate: '',
  educationDegree: '',
  schoolName: '',
  major: '',
  japaneseLevel: '',
  japaneseConversation: '',
  japaneseReading: '',
  japaneseWriting: '',
  englishLevel: '',
  englishConversation: '',
  englishReading: '',
  englishWriting: '',
  technicalLevel: '',
  specialtyDev: '',
  specialtyBusiness: '',
  selfPr: '',
};

export const EMPTY_CAREER = {
  period: '',
  organization: '',
  roleOverview: '',
  startDate: '',
  endDate: '',
  months: '',
  workplace: '',
  role: '',
  osDb: '',
  languages: '',
  fwTools: '',
  phases: [],
};

/** 開始/終了日から自動生成された period はタイトルに重複表示しない */
export function buildAutoCareerPeriod(c) {
  if (!c?.startDate) return '';
  return c.endDate ? `${c.startDate}～${c.endDate}` : `${c.startDate}～`;
}

/** 職務経歴を新しい順（開始日・終了日の降順）に並べ替え */
export function sortCareersByNewestFirst(careers) {
  if (!careers?.length) return [];
  return [...careers].sort((a, b) => {
    const aStart = String(a?.startDate ?? '').trim();
    const bStart = String(b?.startDate ?? '').trim();
    if (aStart !== bStart) {
      if (!aStart) return 1;
      if (!bStart) return -1;
      return bStart.localeCompare(aStart);
    }
    const aEnd = String(a?.endDate ?? '').trim();
    const bEnd = String(b?.endDate ?? '').trim();
    if (aEnd === bEnd) return 0;
    if (!aEnd) return -1;
    if (!bEnd) return 1;
    return bEnd.localeCompare(aEnd);
  });
}

export function getCareerTitleSuffix(c) {
  if (c?.startDate || c?.endDate) return '';
  const period = String(c?.period ?? '').trim();
  if (!period) return '';
  return ` — ${period}`;
}

export const CAREER_PHASE_OPTIONS = [
  '要件定義',
  '基本設計',
  '詳細設計',
  '製造',
  '単体テスト',
  '結合テスト',
  '総合テスト',
  '保守・運用',
];

/** 旧データ互換（履歴書出力用） */
export const CAREER_PHASE_ALIASES = {
  実装: '製造',
  保守運用: '保守・運用',
};

export const LANGUAGE_LEVEL_OPTIONS = ['A', 'B', 'C', 'D'];
export const SKILL_MARK_OPTIONS = ['◎', '〇', '△'];
export const TECHNICAL_SKILL_MARK_OPTIONS = SKILL_MARK_OPTIONS;
export const MARITAL_STATUS_OPTIONS = ['未婚', '既婚'];
export const EDUCATION_DEGREE_OPTIONS = ['学士', '修士', '博士', 'その他'];

/** 国籍名からマスタIDへ変換（履歴書インポート用） */
export function resolveNationalityIdFromName(name, nationalities = []) {
  const text = name?.trim();
  if (!text || !nationalities.length) return '';
  const normalized = text.toLowerCase();
  const aliases = {
    日本国: '日本',
    japan: '日本',
    中国籍: '中国',
    china: '中国',
    中華人民共和国: '中国',
    韓国籍: '韓国',
    korea: '韓国',
    大韓民国: '韓国',
  };
  const target = aliases[normalized] || aliases[text] || text;
  const exact = nationalities.find((n) => n.name === target || n.name.toLowerCase() === normalized);
  if (exact) return String(exact.id);
  const other = nationalities.find((n) => n.name === 'その他');
  return other ? String(other.id) : '';
}

const EMPTY_ATTENDANCE = {
  attendanceRate: '',
  lateEarlyCount: '',
  paidLeaveRemaining: '',
  periodLabel: '',
  workDays: '',
  workHours: '',
};

const EMPTY_EVAL_HISTORY = {
  yearLabel: '',
  statusText: '',
  nextEvaluationNote: '',
};

const EMPTY_OVERALL = {
  overallRank: '',
  rankLabel: '',
  continuationText: '',
  evaluationDate: '',
  evaluatorName: '',
  evaluatorDepartment: '',
  overallComment: '',
};

const EMPTY_SALARY = {
  basicSalaryMonthly: '',
  commuterAllowance: '',
  annualSalary: '',
  bonus: '',
  overtimeRate: '',
  paymentDay: '',
  billingUnitPrice: '',
  housingAllowance: '',
  familyAllowance: '',
  fixedOvertimeAllowance: '',
  deductionHealthCare: '',
  deductionHealth: '',
  deductionPension: '',
  deductionEmployment: '',
  deductionIncomeTax: '',
  deductionResidentTax: '',
};

const EMPTY_HR = {
  hireDate: '',
  resignationDate: '',
  contractStartDate: '',
  contractEndDate: '',
  socialInsuranceStatus: '',
  employmentInsuranceNo: '',
  pensionNo: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  paidLeaveStartDate: '',
};

export const EMPTY_EMPLOYEE_FORM = {
  employeeCode: '',
  name: '',
  departmentId: '',
  affiliationCompany: 'ビットクロス',
  position: '',
  assignmentRole: '',
  employeeType: '',
  workStatus: '',
  unitPrice: '',
  evaluation: '',
  endDate: '',
  version: null,
  personal: { ...EMPTY_PERSONAL },
  skills: [],
  technicalSkills: {},
  qualifications: [],
  careers: [],
  attendance: { ...EMPTY_ATTENDANCE },
  evaluationHistory: { ...EMPTY_EVAL_HISTORY },
  memo: '',
  evaluationItems: createDefaultEvaluationItems(),
  overallEvaluation: { ...EMPTY_OVERALL },
  salary: { ...EMPTY_SALARY },
  hr: { ...EMPTY_HR },
};

/** @deprecated use EMPTY_EMPLOYEE_FORM */
export const EMPTY_FORM = EMPTY_EMPLOYEE_FORM;

function flattenEvaluationCategories(categories) {
  if (!categories?.length) return [];
  return categories.flatMap((cat) =>
    (cat.items || []).map((item) => ({
      categoryCode: cat.code,
      itemName: item.itemName,
      rankGrade: item.rankGrade,
      comment: item.comment || '',
    }))
  );
}

export function detailToForm(detail) {
  return {
    employeeCode: detail.employeeCode ?? '',
    name: detail.name ?? '',
    departmentId:
      detail.departmentId != null && detail.departmentId > 0 ? String(detail.departmentId) : '',
    affiliationCompany: detail.affiliationCompany ?? 'ビットクロス',
    position: detail.position ?? '',
    assignmentRole: detail.assignmentRole ?? '',
    employeeType: detail.employeeType ?? '',
    workStatus: detail.workStatus ?? '',
    unitPrice: detail.unitPrice != null && detail.unitPrice !== 0 ? String(detail.unitPrice) : '',
    evaluation: detail.evaluation ?? '',
    endDate: detail.endDate ?? '',
    version: detail.version ?? null,
    personal: detail.personal
      ? {
          gender: detail.personal.gender ?? '',
          birthDate: detail.personal.birthDate ?? '',
          nationalityId:
            detail.personal.nationalityId != null ? String(detail.personal.nationalityId) : '',
          residenceStatusId:
            detail.personal.residenceStatusId != null
              ? String(detail.personal.residenceStatusId)
              : '',
          residenceCardNumber: detail.personal.residenceCardNumber ?? '',
          residenceCardExpiry: detail.personal.residenceCardExpiry ?? '',
          phone: detail.personal.phone ?? '',
          email: detail.personal.email ?? '',
          address: detail.personal.address ?? '',
          education: detail.personal.education ?? '',
          nearestStation: detail.personal.nearestStation ?? '',
          photoUrl: detail.personal.photoUrl ?? '',
          furigana: detail.personal.furigana ?? '',
          maritalStatus: detail.personal.maritalStatus ?? '',
          itIndustryYears:
            detail.personal.itIndustryYears != null ? String(detail.personal.itIndustryYears) : '',
          japanArrivalDate: detail.personal.japanArrivalDate ?? '',
          educationDegree: detail.personal.educationDegree ?? '',
          schoolName: detail.personal.schoolName ?? '',
          major: detail.personal.major ?? '',
          japaneseLevel: detail.personal.japaneseLevel ?? '',
          japaneseConversation: detail.personal.japaneseConversation ?? '',
          japaneseReading: detail.personal.japaneseReading ?? '',
          japaneseWriting: detail.personal.japaneseWriting ?? '',
          englishLevel: detail.personal.englishLevel ?? '',
          englishConversation: detail.personal.englishConversation ?? '',
          englishReading: detail.personal.englishReading ?? '',
          englishWriting: detail.personal.englishWriting ?? '',
          technicalLevel: detail.personal.technicalLevel ?? '',
          specialtyDev: detail.personal.specialtyDev ?? '',
          specialtyBusiness: detail.personal.specialtyBusiness ?? '',
          selfPr: detail.personal.selfPr ?? '',
        }
      : { ...EMPTY_PERSONAL },
    skills: (detail.skills || []).map((s) => ({
      skillName: s.skillName,
      level: s.level,
      experienceYears: s.experienceYears,
    })),
    technicalSkills: technicalSkillsToMap(detail.technicalSkills),
    qualifications: (detail.qualifications || []).map((q) => ({ description: q.description })),
    careers: sortCareersByNewestFirst(
      (detail.careers || []).map((c) => ({
        period: c.period ?? '',
        organization: c.organization ?? '',
        roleOverview: c.roleOverview ?? '',
        startDate: c.startDate ?? '',
        endDate: c.endDate ?? '',
        months: c.months != null ? String(c.months) : '',
        workplace: c.workplace ?? '',
        role: c.role ?? '',
        osDb: c.osDb ?? '',
        languages: c.languages ?? '',
        fwTools: c.fwTools ?? '',
        phases: c.phases ? c.phases.split(',').filter(Boolean) : [],
      }))
    ),
    attendance: detail.attendance
      ? {
          attendanceRate: String(detail.attendance.attendanceRate ?? ''),
          lateEarlyCount: String(detail.attendance.lateEarlyCount ?? ''),
          paidLeaveRemaining: String(detail.attendance.paidLeaveRemaining ?? ''),
          periodLabel: detail.attendance.periodLabel ?? '',
          workDays:
            detail.attendance.workDays != null && detail.attendance.workDays !== 0
              ? String(detail.attendance.workDays)
              : '',
          workHours:
            detail.attendance.workHours != null && detail.attendance.workHours !== 0
              ? String(detail.attendance.workHours)
              : '',
        }
      : { ...EMPTY_ATTENDANCE },
    evaluationHistory: detail.evaluationHistory
      ? {
          yearLabel: detail.evaluationHistory.yearLabel ?? '',
          statusText: detail.evaluationHistory.statusText ?? '',
          nextEvaluationNote: detail.evaluationHistory.nextEvaluationNote ?? '',
        }
      : { ...EMPTY_EVAL_HISTORY },
    memo: detail.memo ?? '',
    evaluationItems: mergeEvaluationItems(flattenEvaluationCategories(detail.evaluationCategories), {
      fillDefaultComments: !hasEmployeeEvaluation(detail),
    }),
    overallEvaluation: detail.overallEvaluation
      ? {
          overallRank: detail.overallEvaluation.overallRank ?? '',
          rankLabel: detail.overallEvaluation.rankLabel ?? '',
          continuationText: detail.overallEvaluation.continuationText ?? '',
          evaluationDate: detail.overallEvaluation.evaluationDate ?? '',
          evaluatorName: detail.overallEvaluation.evaluatorName ?? '',
          evaluatorDepartment: detail.overallEvaluation.evaluatorDepartment ?? '',
          overallComment: detail.overallEvaluation.overallComment ?? '',
        }
      : { ...EMPTY_OVERALL },
    salary: detail.salary
      ? {
          basicSalaryMonthly:
            detail.salary.basicSalaryMonthly != null ? String(detail.salary.basicSalaryMonthly) : '',
          commuterAllowance:
            detail.salary.commuterAllowance != null ? String(detail.salary.commuterAllowance) : '',
          annualSalary: detail.salary.annualSalary != null ? String(detail.salary.annualSalary) : '',
          bonus: detail.salary.bonus != null ? String(detail.salary.bonus) : '',
          overtimeRate: detail.salary.overtimeRate != null ? String(detail.salary.overtimeRate) : '',
          paymentDay: detail.salary.paymentDay ?? '',
          billingUnitPrice:
            detail.salary.billingUnitPrice != null ? String(detail.salary.billingUnitPrice) : '',
          housingAllowance:
            detail.salary.housingAllowance != null ? String(detail.salary.housingAllowance) : '',
          familyAllowance:
            detail.salary.familyAllowance != null ? String(detail.salary.familyAllowance) : '',
          fixedOvertimeAllowance:
            detail.salary.fixedOvertimeAllowance != null ? String(detail.salary.fixedOvertimeAllowance) : '',
          deductionHealthCare:
            detail.salary.deductionHealthCare != null ? String(detail.salary.deductionHealthCare) : '',
          deductionHealth:
            detail.salary.deductionHealth != null ? String(detail.salary.deductionHealth) : '',
          deductionPension:
            detail.salary.deductionPension != null ? String(detail.salary.deductionPension) : '',
          deductionEmployment:
            detail.salary.deductionEmployment != null ? String(detail.salary.deductionEmployment) : '',
          deductionIncomeTax:
            detail.salary.deductionIncomeTax != null ? String(detail.salary.deductionIncomeTax) : '',
          deductionResidentTax:
            detail.salary.deductionResidentTax != null ? String(detail.salary.deductionResidentTax) : '',
        }
      : { ...EMPTY_SALARY },
    hr: detail.hr
      ? {
          hireDate: detail.hr.hireDate ?? '',
          resignationDate: detail.hr.resignationDate ?? '',
          contractStartDate: detail.hr.contractStartDate ?? '',
          contractEndDate: detail.hr.contractEndDate ?? '',
          socialInsuranceStatus: detail.hr.socialInsuranceStatus ?? '',
          employmentInsuranceNo: detail.hr.employmentInsuranceNo ?? '',
          pensionNo: detail.hr.pensionNo ?? '',
          emergencyContactName: detail.hr.emergencyContactName ?? '',
          emergencyContactPhone: detail.hr.emergencyContactPhone ?? '',
          emergencyContactRelation: detail.hr.emergencyContactRelation ?? '',
          paidLeaveStartDate: detail.hr.paidLeaveStartDate ?? '',
        }
      : { ...EMPTY_HR },
  };
}

/** 社員種別・所属会社・所属部門・稼働状況・社員IDの必須チェック（新規登録・編集保存時） */
export function validateEmployeeCoreFields(form, { requireEmployeeCode = true } = {}) {
  const missing = [];
  if (requireEmployeeCode && !form.employeeCode?.trim()) missing.push('社員ID');
  if (!form.affiliationCompany?.trim()) missing.push('所属会社');
  if (!form.employeeType?.trim()) missing.push('社員種別');
  if (!form.departmentId?.trim() || Number(form.departmentId) <= 0) missing.push('所属部門');
  if (!form.workStatus?.trim()) missing.push('稼働状況');
  if (missing.length === 0) return null;
  return `${missing.join('、')}は必須です`;
}

/** 履歴書インポート用：総合評価なしで保存 */
export function formToImportSavePayload(form, employeeCode) {
  return formToSavePayload({
    ...form,
    employeeCode,
    evaluation: '',
    overallEvaluation: { ...EMPTY_OVERALL },
    evaluationItems: [],
  });
}

export function formToSavePayload(form) {
  const withEval = applyEvaluationToForm(form);
  const validItems = withEval.evaluationItems.filter((item) => item.rankGrade);
  const evaluation = validItems.length > 0 ? withEval.evaluation?.trim() || '' : '';
  const overallEvaluation =
    validItems.length > 0
      ? {
          ...withEval.overallEvaluation,
          overallRank: withEval.overallEvaluation.overallRank?.trim() || null,
        }
      : {
          ...EMPTY_OVERALL,
          continuationText: withEval.overallEvaluation?.continuationText?.trim() || null,
          evaluationDate: withEval.overallEvaluation?.evaluationDate || null,
          evaluatorName: withEval.overallEvaluation?.evaluatorName?.trim() || null,
          evaluatorDepartment: withEval.overallEvaluation?.evaluatorDepartment?.trim() || null,
          overallComment: withEval.overallEvaluation?.overallComment?.trim() || null,
          overallRank: null,
          rankLabel: null,
        };
  return {
    employeeCode: withEval.employeeCode.trim(),
    name: withEval.name.trim(),
    departmentId: normalizeDepartmentId(withEval.departmentId),
    affiliationCompany: withEval.affiliationCompany || 'ビットクロス',
    position: withEval.position || '',
    assignmentRole: withEval.assignmentRole?.trim() || null,
    employeeType: withEval.employeeType || '',
    workStatus: withEval.workStatus || '',
    unitPrice: Number(withEval.unitPrice) || 0,
    evaluation,
    endDate: withEval.endDate || null,
    version: withEval.version != null ? Number(withEval.version) : null,
    personal: {
      ...withEval.personal,
      nationalityId:
        withEval.personal.nationalityId !== '' && withEval.personal.nationalityId != null
          ? Number(withEval.personal.nationalityId)
          : null,
      residenceStatusId:
        withEval.personal.residenceStatusId !== '' && withEval.personal.residenceStatusId != null
          ? Number(withEval.personal.residenceStatusId)
          : null,
      residenceCardNumber: withEval.personal.residenceCardNumber?.trim() || null,
      residenceCardExpiry: withEval.personal.residenceCardExpiry || null,
      itIndustryYears:
        withEval.personal.itIndustryYears !== ''
          ? Number(withEval.personal.itIndustryYears)
          : null,
    },
    skills: withEval.skills.map((s) => ({
      skillName: s.skillName,
      level: Number(s.level) || 1,
      experienceYears: Number(s.experienceYears) || 0,
    })),
    technicalSkills: mapToTechnicalSkills(withEval.technicalSkills),
    qualifications: withEval.qualifications,
    careers: withEval.careers.map((c) => ({
      period: c.period,
      organization: c.organization,
      roleOverview: c.roleOverview,
      startDate: c.startDate || null,
      endDate: c.endDate || null,
      months: c.months !== '' ? Number(c.months) : null,
      workplace: c.workplace || null,
      role: c.role || null,
      osDb: c.osDb || null,
      languages: c.languages || null,
      fwTools: c.fwTools || null,
      phases: c.phases?.length ? c.phases.join(',') : null,
    })),
    attendance: {
      attendanceRate: Number(withEval.attendance.attendanceRate) || 0,
      lateEarlyCount: Number(withEval.attendance.lateEarlyCount) || 0,
      paidLeaveRemaining: Number(withEval.attendance.paidLeaveRemaining) || 0,
      periodLabel: withEval.attendance.periodLabel || null,
      workDays: Number(withEval.attendance.workDays) || 0,
      workHours: Number(withEval.attendance.workHours) || 0,
    },
    evaluationHistory: withEval.evaluationHistory,
    memo: withEval.memo || null,
    evaluationItems: validItems,
    overallEvaluation,
    salary: {
      basicSalaryMonthly: Number(withEval.salary?.basicSalaryMonthly) || 0,
      commuterAllowance: Number(withEval.salary?.commuterAllowance) || 0,
      annualSalary: Number(withEval.salary?.annualSalary) || 0,
      bonus: Number(withEval.salary?.bonus) || 0,
      overtimeRate: Number(withEval.salary?.overtimeRate) || 0,
      paymentDay: withEval.salary?.paymentDay || null,
      billingUnitPrice: Number(withEval.salary?.billingUnitPrice) || 0,
      housingAllowance: Number(withEval.salary?.housingAllowance) || 0,
      familyAllowance: Number(withEval.salary?.familyAllowance) || 0,
      fixedOvertimeAllowance: Number(withEval.salary?.fixedOvertimeAllowance) || 0,
      deductionHealthCare: Number(withEval.salary?.deductionHealthCare) || 0,
      deductionHealth: Number(withEval.salary?.deductionHealth) || 0,
      deductionPension: Number(withEval.salary?.deductionPension) || 0,
      deductionEmployment: Number(withEval.salary?.deductionEmployment) || 0,
      deductionIncomeTax: Number(withEval.salary?.deductionIncomeTax) || 0,
      deductionResidentTax: Number(withEval.salary?.deductionResidentTax) || 0,
    },
    hr: {
      hireDate: withEval.hr?.hireDate || null,
      resignationDate: withEval.hr?.resignationDate || null,
      contractStartDate: withEval.hr?.contractStartDate || null,
      contractEndDate: withEval.hr?.contractEndDate || null,
      socialInsuranceStatus: withEval.hr?.socialInsuranceStatus || null,
      employmentInsuranceNo: withEval.hr?.employmentInsuranceNo || null,
      pensionNo: withEval.hr?.pensionNo || null,
      emergencyContactName: withEval.hr?.emergencyContactName || null,
      emergencyContactPhone: withEval.hr?.emergencyContactPhone || null,
      emergencyContactRelation: withEval.hr?.emergencyContactRelation || null,
      // 有給起算は入社日基準のため UI から廃止。保存時はクリアする。
      paidLeaveStartDate: null,
    },
  };
}

/** @deprecated use detailToForm */
export function employeeToForm(employee) {
  return detailToForm(employee);
}
