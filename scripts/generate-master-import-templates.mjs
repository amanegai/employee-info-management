/**
 * マスタ一括登録用 Excel テンプレートを生成します。
 * 実行: node scripts/generate-master-import-templates.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from '../frontend/node_modules/exceljs/excel.js';
import { TECHNICAL_SKILL_TEMPLATE } from '../frontend/src/constants/technicalSkillTemplate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outputDir = join(rootDir, 'frontend', 'public', 'templates');

const FONT = 'Yu Gothic UI';
const SAMPLE_ROW = 5;
const DATA_START_ROW = 5;
const EMPTY_START_ROW = 6;
const EMPLOYEE_DATA_ROWS = 350;
const CLIENT_DATA_ROWS = 150;
const QUALIFICATION_DATA_ROWS = 500;
const TECHNICAL_SKILL_DATA_ROWS = 800;
const CAREER_DATA_ROWS = 800;
/** MasterExcelParser の記入例判定と同じ文字列 */
const SAMPLE_MARKER = 'これは記入例';
/** 見出し・記入例行を編集不可にするためのシート保護パスワード（利用者向けには非公開） */
const SHEET_PROTECT_PASSWORD = 'eim-template-lock';
const SAMPLE_PURPOSE =
  '参照用の記入例です。編集・削除できません。取込時は自動スキップされます。実データは6行目から記入してください。';
const SAMPLE_PURPOSE_SHORT =
  `※${SAMPLE_MARKER}です（参照専用・編集削除不可・取込時スキップ）。実データは6行目から。`;

const COLORS = {
  titleBg: 'FF115E59',
  white: 'FFFFFFFF',
  text: 'FF1E293B',
  hint: 'FF64748B',
  hintBg: 'FFF8FAFC',
  requiredBg: 'FFFEE2E2',
  requiredText: 'FFB91C1C',
  input: 'FFFFFBEB',
  border: 'FFCBD5E1',
  noteBg: 'FFF0FDFA',
  noteText: 'FF134E4A',
  zebra: 'FFF8FAFC',
  masterHeader: 'FF334155',
  sample: 'FFD1FAE5',
  sampleText: 'FF065F46',
};

const GROUP_COLORS = {
  identity: 'FF0D9488',
  personal: 'FF2563EB',
  education: 'FF7C3AED',
  language: 'FFEA580C',
  pr: 'FF059669',
  qualification: 'FFE6A800',
  technical: 'FF6F42C1',
  career: 'FF495057',
  clientBasic: 'FF0D9488',
  address: 'FF2563EB',
  company: 'FF4F46E5',
  billing: 'FFD97706',
  terms: 'FF7C3AED',
  notes: 'FF475569',
};

const TECHNICAL_SKILL_CATEGORIES = TECHNICAL_SKILL_TEMPLATE.map((c) => c.category);
const TECHNICAL_SKILL_ITEMS = TECHNICAL_SKILL_TEMPLATE.flatMap((c) => c.items);
const CAREER_PHASES = [
  '要件定義',
  '基本設計',
  '詳細設計',
  '製造',
  '単体テスト',
  '結合テスト',
  '総合テスト',
];

const LISTS = {
  workStatuses: ['稼働中', '待機中', '休業', '退職予定', '退職', '案件終了間近'],
  employeeTypes: ['正社員', '契約社員', '個人事業主', 'BP'],
  affiliationCompanies: ['ビットクロス', 'アレシス', '衆和テクノロジー'],
  departments: [
    '事業一部・開発一部',
    '事業一部・開発二部',
    '事業一部・開発三部',
    '事業二部・開発一部',
    '事業二部・開発二部',
    '事業二部・開発三部',
    '営業部',
    '人事部',
    '開発部',
    'その他',
  ],
  positions: [
    '社員',
    'リーター',
    '代理開発部長',
    '開発部長',
    '事業部長',
    '営業部長',
    '人事部長',
    '社長',
    '顧問',
  ],
  assignmentRoles: [
    'プロジェクトマネージャー',
    'プロジェクトリーダー',
    'システムエンジニア',
    'プログラマ',
  ],
  genders: ['男性', '女性', 'その他'],
  nationalities: [
    '日本',
    '中国',
    '韓国',
    '台湾',
    'ベトナム',
    'フィリピン',
    'ネパール',
    'インド',
    'インドネシア',
    'タイ',
    'マレーシア',
    'シンガポール',
    'ミャンマー',
    'バングラデシュ',
    'スリランカ',
    'パキスタン',
    'モンゴル',
    'アメリカ',
    'カナダ',
    'イギリス',
    'フランス',
    'ドイツ',
    'イタリア',
    'スペイン',
    'オーストラリア',
    'ニュージーランド',
    'ブラジル',
    'その他',
  ],
  residenceStatuses: [
    '技術・人文知識・国際業務（1年）',
    '技術・人文知識・国際業務（3年）',
    '技術・人文知識・国際業務（5年）',
    '高度人材',
    '定住',
    '永住',
  ],
  maritalStatuses: ['未婚', '既婚'],
  educationDegrees: ['学士', '修士', '博士', 'その他'],
  conversationLevels: ['A', 'B', 'C', 'D'],
  documentMarks: ['◎', '〇', '△'],
  technicalSkillLevels: ['◎', '〇', '△'],
  technicalSkillCategories: TECHNICAL_SKILL_CATEGORIES,
  technicalSkillItems: TECHNICAL_SKILL_ITEMS,
  careerPhases: CAREER_PHASES,
  clientRanks: ['S', 'A', 'B', 'C', 'D'],
  contractStatuses: ['契約中', '商談中', '取引停止', '新規'],
  contractTypes: ['派遣', '請負', '準委任', '業務委託'],
};

const EMPLOYEE_GROUPS = [
  {
    title: '所属・身分',
    color: GROUP_COLORS.identity,
    columns: [
      {
        header: '社員ID',
        required: true,
        hint: '必須。btc/als/swt + 種別英字(S/K/P/B) + 5桁。例：btcS00001 / alsB00012 / swtS00001',
        width: 16,
      },
      {
        header: '社員名',
        required: true,
        hint: '必須。氏名を記入してください。',
        width: 16,
      },
      {
        header: 'フリガナ',
        hint: '全角カタカナで記入してください。',
        width: 18,
      },
      {
        header: '稼働状況',
        required: true,
        hint: '必須。一覧から選択してください。',
        width: 14,
        listKey: 'workStatuses',
      },
      {
        header: '社員種別',
        required: true,
        hint: '必須。一覧から選択してください。',
        width: 14,
        listKey: 'employeeTypes',
      },
      {
        header: '所属会社',
        required: true,
        hint: '必須。ビットクロス / アレシス / 衆和テクノロジー',
        width: 18,
        listKey: 'affiliationCompanies',
      },
      {
        header: '所属部門',
        required: true,
        hint: '必須。所属会社に対応する部門マスタ名称と完全一致させてください。',
        width: 22,
        listKey: 'departments',
      },
      {
        header: '役職',
        hint: '一覧から選択してください。空欄可。',
        width: 16,
        listKey: 'positions',
      },
      {
        header: '役割',
        hint: '案件での役割です。一覧から選択してください。空欄可。',
        width: 24,
        listKey: 'assignmentRoles',
      },
      {
        header: '終了予定日',
        hint: '稼働状況が退職予定・案件終了間近・休業のとき YYYY-MM-DD で記入。休業時は職場復帰予定日として扱います。',
        width: 16,
        date: true,
      },
    ],
  },
  {
    title: '個人情報（基本）',
    color: GROUP_COLORS.personal,
    columns: [
      {
        header: '性別',
        hint: '一覧から選択してください。空欄可。',
        width: 10,
        listKey: 'genders',
      },
      {
        header: '生年月日',
        hint: 'YYYY-MM-DD。年齢は画面で自動計算されます。',
        width: 14,
        date: true,
      },
      {
        header: '国籍',
        hint: '一覧から選択してください。日本の場合、在留関連は空欄にしてください。',
        width: 16,
        listKey: 'nationalities',
      },
      {
        header: '在留資格',
        hint: '国籍が日本以外のとき一覧から選択してください。',
        width: 32,
        listKey: 'residenceStatuses',
      },
      {
        header: '在留カード番号',
        hint: '国籍が日本以外のとき記入してください。',
        width: 18,
      },
      {
        header: '在留カード有効期限',
        hint: '国籍が日本以外のとき YYYY-MM-DD で記入してください。',
        width: 18,
        date: true,
      },
      {
        header: '結婚',
        hint: '未婚／既婚。空欄可。',
        width: 10,
        listKey: 'maritalStatuses',
      },
      {
        header: '最寄駅',
        hint: '例：品川、新宿。',
        width: 14,
      },
      {
        header: 'IT業界経験年数',
        hint: '整数（年）。例：5',
        width: 16,
        number: true,
      },
      {
        header: '来日年月',
        hint: 'YYYY-MM-DD。日本滞在年数は画面で自動計算されます。',
        width: 14,
        date: true,
      },
      {
        header: '電話番号',
        hint: '例：090-1234-5678',
        width: 16,
      },
      {
        header: 'メール',
        hint: '半角で記入してください。',
        width: 24,
      },
      {
        header: '住所',
        hint: '都道府県から記入してください。',
        width: 32,
      },
    ],
  },
  {
    title: '最終学歴',
    color: GROUP_COLORS.education,
    columns: [
      {
        header: '学位',
        hint: '学士／修士／博士／その他。空欄可。',
        width: 10,
        listKey: 'educationDegrees',
      },
      {
        header: '学校名',
        hint: '最終学歴の学校名。',
        width: 24,
      },
      {
        header: '専攻学科',
        hint: '例：情報工学科',
        width: 20,
      },
    ],
  },
  {
    title: '語学',
    color: GROUP_COLORS.language,
    columns: [
      {
        header: '日本語_会話レベル',
        hint: 'A：ネイティブ同等　B：流暢　C：一人称　D：簡単会話',
        width: 18,
        listKey: 'conversationLevels',
      },
      {
        header: '日本語_仕様書解読',
        hint: '◎：問題なし　〇：ほぼ問題なし　△：若干不足気味',
        width: 18,
        listKey: 'documentMarks',
      },
      {
        header: '日本語_仕様書作成',
        hint: '◎：問題なし　〇：ほぼ問題なし　△：若干不足気味',
        width: 18,
        listKey: 'documentMarks',
      },
      {
        header: '英語_会話レベル',
        hint: 'A：ネイティブ同等　B：流暢　C：一人称　D：簡単会話',
        width: 16,
        listKey: 'conversationLevels',
      },
      {
        header: '英語_仕様書解読',
        hint: '◎：問題なし　〇：ほぼ問題なし　△：若干不足気味',
        width: 16,
        listKey: 'documentMarks',
      },
      {
        header: '英語_仕様書作成',
        hint: '◎：問題なし　〇：ほぼ問題なし　△：若干不足気味',
        width: 16,
        listKey: 'documentMarks',
      },
    ],
  },
  {
    title: '得意分野・自己PR',
    color: GROUP_COLORS.pr,
    columns: [
      {
        header: '開発技術',
        hint: '得意な開発技術を記入してください。改行可。',
        width: 28,
        wrap: true,
      },
      {
        header: '業務知識',
        hint: '得意な業務知識を記入してください。改行可。',
        width: 28,
        wrap: true,
      },
      {
        header: '自己PR',
        hint: '自己PRを記入してください。改行可。',
        width: 40,
        wrap: true,
      },
    ],
  },
];

const EMPLOYEE_SAMPLE = {
  社員ID: 'btcS00001',
  社員名: '山田 太郎',
  フリガナ: 'ヤマダ タロウ',
  稼働状況: '待機中',
  社員種別: '正社員',
  所属会社: 'ビットクロス',
  所属部門: '事業一部・開発一部',
  役職: '社員',
  役割: 'システムエンジニア',
  性別: '男性',
  生年月日: '1995-04-12',
  国籍: '日本',
  結婚: '未婚',
  最寄駅: '品川',
  IT業界経験年数: 8,
  電話番号: '090-1234-5678',
  メール: 'taro.yamada@example.co.jp',
  住所: '東京都港区港南2-1-1',
  学位: '学士',
  学校名: '東京工業大学',
  専攻学科: '情報工学科',
  日本語_会話レベル: 'A',
  日本語_仕様書解読: '◎',
  日本語_仕様書作成: '◎',
  英語_会話レベル: 'B',
  英語_仕様書解読: '〇',
  英語_仕様書作成: '〇',
  開発技術: 'Java / Spring Boot / AWS / PostgreSQL',
  業務知識: '金融・決済システム、社内業務システムの設計・開発',
  自己PR:
    `${SAMPLE_PURPOSE_SHORT}\n要件定義から実装・テストまで一貫して担当できます。`,
};

const QUALIFICATION_GROUPS = [
  {
    title: '保有資格',
    color: GROUP_COLORS.qualification,
    columns: [
      {
        header: '社員ID',
        required: true,
        hint: '必須。「社員」シートの社員IDと完全一致させてください。',
        width: 16,
      },
      {
        header: '資格内容',
        required: true,
        hint: '必須。資格名・取得時期など。1行につき1件。',
        width: 56,
        wrap: true,
      },
    ],
  },
];

const QUALIFICATION_SAMPLE = {
  社員ID: 'btcS00001',
  資格内容: `基本情報技術者試験（2020年春取得）　${SAMPLE_PURPOSE_SHORT}`,
};

const TECHNICAL_SKILL_GROUPS = [
  {
    title: '関連技術',
    color: GROUP_COLORS.technical,
    columns: [
      {
        header: '社員ID',
        required: true,
        hint: '必須。「社員」シートの社員IDと完全一致させてください。',
        width: 16,
      },
      {
        header: 'カテゴリ',
        required: true,
        hint: '必須。一覧から選択（OS／開発言語／DB 等）。「関連技術一覧」シートも参照可。',
        width: 28,
        listKey: 'technicalSkillCategories',
      },
      {
        header: '項目名',
        required: true,
        hint: '必須。カテゴリに属する技術名。一覧または「関連技術一覧」から選択。',
        width: 28,
        listKey: 'technicalSkillItems',
      },
      {
        header: 'レベル',
        required: true,
        hint: '必須。◎：問題なし　〇：ほぼ問題なし　△：若干不足気味',
        width: 12,
        listKey: 'technicalSkillLevels',
      },
    ],
  },
];

const TECHNICAL_SKILL_SAMPLE = {
  社員ID: 'btcS00001',
  カテゴリ: '開発言語',
  項目名: 'Java',
  レベル: '◎',
};

const CAREER_GROUPS = [
  {
    title: '期間・案件',
    color: GROUP_COLORS.career,
    columns: [
      {
        header: '社員ID',
        required: true,
        hint: '必須。「社員」シートの社員IDと完全一致させてください。',
        width: 16,
      },
      {
        header: '開始日',
        hint: 'YYYY-MM-DD。例：2022-07-01',
        width: 14,
        date: true,
      },
      {
        header: '終了日',
        hint: 'YYYY-MM-DD。継続中は空欄可。',
        width: 14,
        date: true,
      },
      {
        header: '月数',
        hint: '整数。空欄可。',
        width: 10,
        number: true,
      },
      {
        header: '期間（表示用）',
        hint: '未記入時は開始〜終了から自動生成。例：2022/07～2023/06',
        width: 20,
      },
      {
        header: '組織/案件名',
        hint: '所属組織または案件名。',
        width: 28,
      },
      {
        header: '作業場所',
        hint: '例：東京 / 中国 / リモート',
        width: 16,
      },
      {
        header: '役割',
        hint: '例：PG / SE / PL',
        width: 12,
      },
    ],
  },
  {
    title: '業務内容・技術',
    color: GROUP_COLORS.technical,
    columns: [
      {
        header: '業務内容',
        hint: '担当業務の概要。改行可。',
        width: 40,
        wrap: true,
      },
      {
        header: 'OS/DB',
        hint: '使用した OS・DB。改行可。',
        width: 20,
        wrap: true,
      },
      {
        header: '使用言語',
        hint: '使用した開発言語。改行可。',
        width: 20,
        wrap: true,
      },
      {
        header: 'FW/MW/ツール',
        hint: 'フレームワーク・ミドルウェア・ツール。改行可。',
        width: 24,
        wrap: true,
      },
      {
        header: '担当工程',
        hint: 'カンマ区切り。例：要件定義,基本設計,製造,単体テスト',
        width: 36,
        wrap: true,
      },
    ],
  },
];

const CAREER_SAMPLE = {
  社員ID: 'btcS00001',
  開始日: '2022-07-01',
  終了日: '2023-06-30',
  月数: 12,
  '期間（表示用）': '2022/07～2023/06',
  '組織/案件名': '○○銀行 勘定系刷新',
  作業場所: '東京',
  役割: 'SE',
  業務内容:
    `${SAMPLE_PURPOSE_SHORT}\n要件定義〜結合テストを担当。バッチ改修および画面改修。`,
  'OS/DB': 'Linux / Oracle',
  使用言語: 'Java',
  'FW/MW/ツール': 'Spring Boot / MyBatis',
  担当工程: '要件定義,基本設計,詳細設計,製造,単体テスト,結合テスト',
};

const CLIENT_SAMPLE = {
  取引先名: '株式会社サンプル商事',
  重要度: 'A',
  契約状況: '契約中',
  郵便番号: '100-0004',
  住所: '東京都千代田区大手町1-1-1',
  代表電話: '03-1234-5678',
  FAX: '03-1234-5679',
  会社URL: 'https://www.sample-shoji.example.co.jp',
  業種: '情報通信業',
  代表者名: '佐藤 一郎',
  資本金: '3,000万円',
  従業員数: '120名',
  設立日: '2005-04-01',
  法人番号: '1234567890123',
  請求書送付先: '経理部 請求担当（本社3階）',
  経理担当者名: '鈴木 花子',
  経理担当者所属: '経理部',
  経理担当者電話: '03-1234-5680',
  経理担当者メール: 'keiri@sample-shoji.example.co.jp',
  取引上限: '500万円',
  与信メモ: '取引実績良好。与信審査済み。',
  契約形態: '派遣',
  取引開始日: '2018-04-01',
  契約更新日: '2026-04-01',
  契約満了日: '2027-03-31',
  支払サイト: '月末締め翌月末払い',
  支払方法: '銀行振込',
  自社主担当: '田中 次郎',
  備考: SAMPLE_PURPOSE_SHORT,
};

const CLIENT_GROUPS = [
  {
    title: '基本',
    color: GROUP_COLORS.clientBasic,
    columns: [
      {
        header: '取引先名',
        required: true,
        hint: '必須。正式な会社名を記入してください。',
        width: 28,
      },
      {
        header: '重要度',
        hint: 'S／A／B／C／D。空欄可。',
        width: 10,
        listKey: 'clientRanks',
      },
      {
        header: '契約状況',
        hint: '空欄の場合は「商談中」として登録します。',
        width: 12,
        listKey: 'contractStatuses',
      },
    ],
  },
  {
    title: '所在地・連絡先',
    color: GROUP_COLORS.address,
    columns: [
      {
        header: '郵便番号',
        hint: '例：100-0001',
        width: 12,
      },
      {
        header: '住所',
        hint: '本社所在地。',
        width: 36,
      },
      {
        header: '代表電話',
        hint: '例：03-1234-5678',
        width: 16,
      },
      {
        header: 'FAX',
        hint: '例：03-1234-5679',
        width: 16,
      },
      {
        header: '会社URL',
        hint: '例：https://example.co.jp',
        width: 28,
      },
    ],
  },
  {
    title: '企業概要',
    color: GROUP_COLORS.company,
    columns: [
      {
        header: '業種',
        hint: '例：情報通信業',
        width: 16,
      },
      {
        header: '代表者名',
        hint: '代表取締役名など。',
        width: 16,
      },
      {
        header: '資本金',
        hint: '例：3,000万円',
        width: 14,
      },
      {
        header: '従業員数',
        hint: '例：120名',
        width: 12,
      },
      {
        header: '設立日',
        hint: 'YYYY-MM-DD',
        width: 14,
        date: true,
      },
      {
        header: '法人番号',
        hint: '13桁。例：1234567890123',
        width: 18,
      },
    ],
  },
  {
    title: '請求・与信',
    color: GROUP_COLORS.billing,
    columns: [
      {
        header: '請求書送付先',
        hint: '請求書の送付先住所または部署。',
        width: 28,
      },
      {
        header: '経理担当者名',
        hint: '取引先の経理担当者名。',
        width: 16,
      },
      {
        header: '経理担当者所属',
        hint: '経理担当者の所属部署。',
        width: 16,
      },
      {
        header: '経理担当者電話',
        hint: '経理担当者の電話番号。',
        width: 16,
      },
      {
        header: '経理担当者メール',
        hint: '経理担当者のメールアドレス。',
        width: 24,
      },
      {
        header: '取引上限',
        hint: '例：500万円',
        width: 14,
      },
      {
        header: '与信メモ',
        hint: '与信情報・審査メモなど。改行可。',
        width: 28,
        wrap: true,
      },
    ],
  },
  {
    title: '取引条件',
    color: GROUP_COLORS.terms,
    columns: [
      {
        header: '契約形態',
        hint: '派遣／請負／準委任／業務委託。空欄可。',
        width: 12,
        listKey: 'contractTypes',
      },
      {
        header: '取引開始日',
        hint: 'YYYY-MM-DD',
        width: 14,
        date: true,
      },
      {
        header: '契約更新日',
        hint: 'YYYY-MM-DD',
        width: 14,
        date: true,
      },
      {
        header: '契約満了日',
        hint: 'YYYY-MM-DD',
        width: 14,
        date: true,
      },
      {
        header: '支払サイト',
        hint: '例：月末締め翌月末払い',
        width: 22,
      },
      {
        header: '支払方法',
        hint: '例：銀行振込',
        width: 14,
      },
      {
        header: '自社主担当',
        hint: '自社の主担当者名。',
        width: 16,
      },
    ],
  },
  {
    title: '備考',
    color: GROUP_COLORS.notes,
    columns: [
      {
        header: '備考',
        hint: '社内メモ・連絡事項など。改行可。',
        width: 40,
        wrap: true,
      },
    ],
  },
];

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function flattenColumns(groups) {
  const columns = [];
  groups.forEach((group) => {
    group.columns.forEach((col) => {
      columns.push({ ...col, groupTitle: group.title, groupColor: group.color });
    });
  });
  return columns;
}

function thinBorder(color = COLORS.border) {
  return {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  };
}

function solid(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function styleCell(cell, style = {}) {
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
  if (style.numFmt) cell.numFmt = style.numFmt;
}

function addMasterSheet(workbook, lists) {
  const sheet = workbook.addWorksheet('マスタ', { state: 'hidden' });
  const keys = Object.keys(lists);
  keys.forEach((key, index) => {
    const col = index + 1;
    const values = lists[key];
    const header = sheet.getCell(1, col);
    header.value = key;
    header.font = { name: FONT, size: 9, bold: true, color: { argb: COLORS.white } };
    header.fill = solid(COLORS.masterHeader);
    values.forEach((value, i) => {
      const cell = sheet.getCell(i + 2, col);
      cell.value = value;
      cell.font = { name: FONT, size: 10 };
    });
    sheet.getColumn(col).width = Math.max(14, ...values.map((v) => String(v).length + 2));
  });
  return { sheet, keys };
}

function listFormula(keys, listKey) {
  const col = keys.indexOf(listKey) + 1;
  if (col <= 0) throw new Error(`未知のリスト: ${listKey}`);
  const letter = colLetter(col);
  const count = LISTS[listKey].length;
  return `マスタ!$${letter}$2:$${letter}$${count + 1}`;
}

function addDataValidations(sheet, columns, keys, dataEndRow) {
  columns.forEach((col, index) => {
    if (!col.listKey) return;
    const letter = colLetter(index + 1);
    sheet.dataValidations.add(`${letter}${DATA_START_ROW}:${letter}${dataEndRow}`, {
      type: 'list',
      allowBlank: true,
      formulae: [listFormula(keys, col.listKey)],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: '入力エラー',
      error: '一覧から選択してください。',
    });
  });
}

function parseSampleValue(col, value) {
  if (value == null || value === '') return null;
  if (col.date) {
    const [year, month, day] = String(value).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  if (col.number) return Number(value);
  return value;
}

function fillSampleRow(sheet, columns, sample) {
  columns.forEach((col, index) => {
    const cell = sheet.getCell(SAMPLE_ROW, index + 1);
    const value = parseSampleValue(col, sample[col.header]);
    if (value != null) cell.value = value;
    styleCell(cell, {
      font: { name: FONT, size: 10, color: { argb: COLORS.sampleText } },
      fill: solid(COLORS.sample),
      alignment: {
        horizontal: 'left',
        vertical: col.wrap ? 'top' : 'middle',
        wrapText: Boolean(col.wrap),
      },
      border: thinBorder(),
      numFmt: col.date ? 'yyyy-mm-dd' : col.number ? '0' : undefined,
    });
    cell.protection = { locked: true };
  });
  sheet.getRow(SAMPLE_ROW).height = 42;
  const noteCell = sheet.getCell(SAMPLE_ROW, 1);
  noteCell.note = {
    texts: [
      {
        font: { name: FONT, size: 9 },
        text: SAMPLE_PURPOSE,
      },
    ],
  };

  // パーサーが記入例行を確実に識別できるよう、非表示列に識別文字列を入れる
  const markerCol = columns.length + 1;
  const markerCell = sheet.getCell(SAMPLE_ROW, markerCol);
  markerCell.value = SAMPLE_PURPOSE_SHORT;
  markerCell.protection = { locked: true };
  sheet.getColumn(markerCol).hidden = true;
  sheet.getColumn(markerCol).width = 2;
}

async function protectDataEntrySheet(sheet, columnCount, dataEndRow) {
  // 既定はロック。入力可能な実データ行だけ解除する
  for (let r = EMPTY_START_ROW; r <= dataEndRow; r += 1) {
    for (let c = 1; c <= columnCount; c += 1) {
      sheet.getCell(r, c).protection = { locked: false };
    }
  }
  for (let r = 1; r <= SAMPLE_ROW; r += 1) {
    for (let c = 1; c <= columnCount + 1; c += 1) {
      sheet.getCell(r, c).protection = { locked: true };
    }
  }

  await sheet.protect(SHEET_PROTECT_PASSWORD, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
    sort: false,
    insertRows: false,
    deleteRows: false,
    insertColumns: false,
    deleteColumns: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
  });
}

async function protectReadOnlySheet(sheet) {
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.protection = { locked: true };
    });
  });
  await sheet.protect(SHEET_PROTECT_PASSWORD, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
    sort: false,
    insertRows: false,
    deleteRows: false,
    insertColumns: false,
    deleteColumns: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
  });
}

async function buildDataSheet(workbook, sheetName, title, groups, dataRows, lists, sample, options = {}) {
  const columns = flattenColumns(groups);
  const lastCol = colLetter(columns.length);
  const dataEndRow = DATA_START_ROW + dataRows - 1;
  const xSplit = options.xSplit ?? Math.min(2, columns.length);
  const freezeY = options.freezeY ?? 4;

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', xSplit, ySplit: freezeY, activeCell: 'A6' }],
  });
  const keys = options.masterKeys ?? addMasterSheet(workbook, lists).keys;

  sheet.properties.defaultRowHeight = 20;
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };

  sheet.mergeCells(`A1:${lastCol}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  styleCell(titleCell, {
    font: { name: FONT, size: 16, bold: true, color: { argb: COLORS.white } },
    fill: solid(COLORS.titleBg),
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
  });
  sheet.getRow(1).height = 28;
  for (let c = 1; c <= columns.length; c += 1) {
    sheet.getCell(1, c).fill = solid(COLORS.titleBg);
    sheet.getCell(1, c).border = thinBorder('FF0F766E');
  }

  let colIndex = 1;
  groups.forEach((group) => {
    const start = colIndex;
    const end = colIndex + group.columns.length - 1;
    const startLetter = colLetter(start);
    const endLetter = colLetter(end);
    if (start !== end) {
      sheet.mergeCells(`${startLetter}2:${endLetter}2`);
    }
    const cell = sheet.getCell(2, start);
    cell.value = group.title;
    styleCell(cell, {
      font: { name: FONT, size: 10, bold: true, color: { argb: COLORS.white } },
      fill: solid(group.color),
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    for (let c = start; c <= end; c += 1) {
      sheet.getCell(2, c).fill = solid(group.color);
      sheet.getCell(2, c).font = { name: FONT, size: 10, bold: true, color: { argb: COLORS.white } };
      sheet.getCell(2, c).border = thinBorder(group.color);
      sheet.getCell(2, c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    colIndex = end + 1;
  });
  sheet.getRow(2).height = 22;

  columns.forEach((col, index) => {
    const headerCell = sheet.getCell(3, index + 1);
    headerCell.value = col.required ? `${col.header}*` : col.header;
    styleCell(headerCell, {
      font: {
        name: FONT,
        size: 10,
        bold: true,
        color: { argb: col.required ? COLORS.requiredText : COLORS.white },
      },
      fill: solid(col.required ? COLORS.requiredBg : col.groupColor),
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: thinBorder(),
    });

    const hintCell = sheet.getCell(4, index + 1);
    hintCell.value = col.hint;
    styleCell(hintCell, {
      font: { name: FONT, size: 8, color: { argb: COLORS.hint } },
      fill: solid(COLORS.hintBg),
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: thinBorder(),
    });

    const column = sheet.getColumn(index + 1);
    column.width = col.width;
    for (let r = EMPTY_START_ROW; r <= dataEndRow; r += 1) {
      const cell = sheet.getCell(r, index + 1);
      styleCell(cell, {
        font: { name: FONT, size: 10, color: { argb: COLORS.text } },
        fill: solid(r % 2 === 0 ? COLORS.zebra : COLORS.input),
        alignment: {
          horizontal: 'left',
          vertical: col.wrap ? 'top' : 'middle',
          wrapText: Boolean(col.wrap),
        },
        border: thinBorder(),
        numFmt: col.date ? 'yyyy-mm-dd' : col.number ? '0' : undefined,
      });
    }
  });
  sheet.getRow(3).height = 24;
  sheet.getRow(4).height = 48;
  fillSampleRow(sheet, columns, sample);

  addDataValidations(sheet, columns, keys, dataEndRow);
  sheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: columns.length },
  };

  await protectDataEntrySheet(sheet, columns.length, dataEndRow);
  return sheet;
}

/** 関連技術のカテゴリ×項目名の対応表（記入時の参照用） */
async function buildTechnicalSkillRefSheet(workbook) {
  const sheet = workbook.addWorksheet('関連技術一覧', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 28;

  const headers = ['カテゴリ', '項目名'];
  headers.forEach((header, index) => {
    const cell = sheet.getCell(1, index + 1);
    cell.value = header;
    styleCell(cell, {
      font: { name: FONT, size: 10, bold: true, color: { argb: COLORS.white } },
      fill: solid(GROUP_COLORS.technical),
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: thinBorder(),
    });
  });
  sheet.getRow(1).height = 22;

  let row = 2;
  TECHNICAL_SKILL_TEMPLATE.forEach((group) => {
    group.items.forEach((item) => {
      const catCell = sheet.getCell(row, 1);
      const itemCell = sheet.getCell(row, 2);
      catCell.value = group.category;
      itemCell.value = item;
      [catCell, itemCell].forEach((cell) => {
        styleCell(cell, {
          font: { name: FONT, size: 10, color: { argb: COLORS.text } },
          fill: solid(row % 2 === 0 ? COLORS.zebra : COLORS.white),
          border: thinBorder(),
          alignment: { vertical: 'middle' },
        });
      });
      row += 1;
    });
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 2 },
  };
  await protectReadOnlySheet(sheet);
  return sheet;
}

function addGuideParagraph(sheet, row, text, style = {}) {
  sheet.mergeCells(`A${row}:B${row}`);
  const cell = sheet.getCell(row, 1);
  cell.value = text;
  styleCell(cell, {
    font: {
      name: FONT,
      size: style.size ?? 10,
      bold: Boolean(style.bold),
      color: { argb: style.color ?? COLORS.text },
    },
    fill: style.fill ? solid(style.fill) : undefined,
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true, indent: style.indent ?? 0 },
  });
  sheet.getRow(row).height = style.height ?? 20;
  return row + 1;
}

function addChoiceTable(sheet, startRow, title, values) {
  let row = addGuideParagraph(sheet, startRow, title, {
    bold: true,
    size: 11,
    color: COLORS.titleBg,
    height: 22,
  });
  values.forEach((value, index) => {
    sheet.getCell(row, 1).value = index + 1;
    sheet.getCell(row, 2).value = value;
    ['A', 'B'].forEach((letter) => {
      const cell = sheet.getCell(`${letter}${row}`);
      styleCell(cell, {
        font: { name: FONT, size: 10, color: { argb: COLORS.text } },
        fill: solid(index % 2 === 0 ? COLORS.hintBg : COLORS.white),
        border: thinBorder(),
        alignment: { vertical: 'middle' },
      });
    });
    sheet.getRow(row).height = 18;
    row += 1;
  });
  return row + 1;
}

async function buildEmployeeGuideSheet(workbook) {
  const sheet = workbook.addWorksheet('記入説明', { views: [{ showGridLines: false }] });
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 72;

  sheet.mergeCells('A1:B1');
  const title = sheet.getCell('A1');
  title.value = '社員マスタ登録テンプレート　記入説明';
  styleCell(title, {
    font: { name: FONT, size: 16, bold: true, color: { argb: COLORS.white } },
    fill: solid(COLORS.titleBg),
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
  });
  sheet.getRow(1).height = 30;

  let row = 3;
  row = addGuideParagraph(sheet, row, '使い方', { bold: true, size: 13, color: COLORS.titleBg, height: 24 });
  const steps = [
    '1. 各データシートの5行目（緑色）は「参照用の記入例」です。シート保護により編集・削除できません。取込時は自動スキップされます。',
    '2. 「社員」「保有資格」「関連技術」「職務経歴」はすべて必須シートです。実データは6行目から記入します。「社員」は1行＝1名、子シートは社員IDで紐づけます（データが無ければ空のまま可）。',
    '3. 赤い見出し（項目名の末尾が *）は必須です。社員ID、社員名、稼働状況、社員種別、所属会社、所属部門は必ず記入してください。',
    '4. 社員IDは btc/als/swt + 種別英字(S/K/P/B) + 5桁です。例：btcS00001 / alsB00012 / swtS00001。自動採番はありません。',
    '5. 所属会社はビットクロス(btc)／アレシス(als)／衆和テクノロジー(swt)。アレシス・衆和の部門は開発部・営業部のみ。ビットクロスの個人事業主・BPは「その他」のみです。',
    '6. 黄色のセル（6行目以降）だけが入力欄です。選択肢がある項目は、セルの▼から選んでください。',
    '7. 日付は YYYY-MM-DD（例：2020-04-01）で記入してください。Excelの日付形式でも構いません。',
    '8. 所属部門は所属会社に対応する部門マスタ名称と完全に一致させてください。一致しない場合は取り込めません。',
    '9. 姓名・性別・生年月日・来日年月が既存と一致する場合は重複エラーです（空欄同士も一致とみなします）。',
    '10. 本ファイルは管理者のみが利用する一括登録用です。必ず本テンプレートを使用し、記入後は管理者画面から取り込んでください。',
  ];
  steps.forEach((text) => {
    row = addGuideParagraph(sheet, row, text, { height: 28, fill: COLORS.noteBg, color: COLORS.noteText });
  });

  row += 1;
  row = addGuideParagraph(sheet, row, '5行目（記入例）の用途', {
    bold: true,
    size: 13,
    color: COLORS.titleBg,
    height: 24,
  });
  const samplePurposeRules = [
    '用途：記入フォーマットの見本です。項目の書き方・選択肢の使い方を確認するための参照行です。',
    '保護：見出し（1〜4行目）と記入例（5行目）はロックされています。内容の変更・行削除はできません。',
    '取込：システムは「これは記入例」を含む行を自動スキップします。記入例を実データとして登録しません。',
    '入力：必ず6行目以降の黄色セルに実データを記入してください。空の行は取り込まれません。',
  ];
  samplePurposeRules.forEach((text) => {
    row = addGuideParagraph(sheet, row, text, { height: 28, fill: COLORS.sample, color: COLORS.sampleText });
  });

  row += 1;
  row = addGuideParagraph(sheet, row, 'シート構成', {
    bold: true,
    size: 13,
    color: COLORS.titleBg,
    height: 24,
  });
  const sheetMap = [
    '「社員」……基本情報（1行＝1名）。必須シートです。',
    '「保有資格」……資格情報（1行＝1資格）。必須シート。社員ID必須。同一社員で複数行可。実データが無ければ空のままで可。',
    '「関連技術」……技術レベル（1行＝カテゴリ＋項目名＋レベル）。必須シート。社員ID必須。「関連技術一覧」で組み合わせを確認できます。',
    '「職務経歴」……職歴（1行＝1案件）。必須シート。社員ID必須。同一社員で複数行可。実データが無ければ空のままで可。',
    '「関連技術一覧」……カテゴリと項目名の対応表（参照専用・編集不可。取込対象外）。',
    '「記入説明」……本シート（参照専用・編集不可。取込対象外）。',
  ];
  sheetMap.forEach((text) => {
    row = addGuideParagraph(sheet, row, text, { height: 26, fill: COLORS.noteBg, color: COLORS.noteText });
  });

  row += 1;
  row = addGuideParagraph(sheet, row, '画面との対応', {
    bold: true,
    size: 13,
    color: COLORS.titleBg,
    height: 24,
  });
  const mappings = [
    '5行目の緑色の行は参照用記入例です。実在の社員ではありません。',
    '「社員」シートの列は、社員情報詳細の「基本情報」タブに対応しています。',
    '「保有資格」「関連技術」「職務経歴」は「スキル・資格・経歴」タブに対応しています。',
    '含めない項目：社員写真（画面で後から登録）、年齢（生年月日から自動計算）、日本滞在年数（来日年月から自動計算）、スキル評価（スキル名・レベル・経験年数）、給与、配属、評価。',
    '在留資格・在留カード番号・在留カード有効期限は、国籍が日本以外のときだけ記入してください。',
    '終了予定日は、稼働状況が退職予定・案件終了間近・休業のとき記入します。休業の場合は画面上「職場復帰予定日」として表示されます。',
  ];
  mappings.forEach((text) => {
    row = addGuideParagraph(sheet, row, text, { height: 28 });
  });

  row += 1;
  row = addGuideParagraph(sheet, row, '関連技術・職務経歴の記入ポイント', {
    bold: true,
    size: 13,
    color: COLORS.titleBg,
    height: 24,
  });
  const skillTips = [
    '関連技術のレベル　◎：問題なし　〇：ほぼ問題なし　△：若干不足気味',
    'カテゴリと項目名は画面の関連技術マトリクスと同じ一覧です。組み合わせが不正な行は取り込めません。',
    '職務経歴の担当工程はカンマ区切りで記入してください（例：要件定義,基本設計,製造,単体テスト）。',
    '子シートに書いた社員IDが「社員」シートに存在しない場合、その行はエラーになります。',
  ];
  skillTips.forEach((text) => {
    row = addGuideParagraph(sheet, row, text, { height: 26 });
  });

  row += 1;
  row = addGuideParagraph(sheet, row, '語学レベルの目安', {
    bold: true,
    size: 13,
    color: COLORS.titleBg,
    height: 24,
  });
  row = addGuideParagraph(sheet, row, '会話レベル　A：ネイティブ同等　B：流暢　C：一人称　D：簡単会話', {
    height: 22,
  });
  row = addGuideParagraph(sheet, row, '仕様書解読／仕様書作成　◎：問題なし　〇：ほぼ問題なし　△：若干不足気味', {
    height: 22,
  });

  row += 1;
  row = addChoiceTable(sheet, row, '選択肢：稼働状況', LISTS.workStatuses);
  row = addChoiceTable(sheet, row, '選択肢：社員種別', LISTS.employeeTypes);
  row = addChoiceTable(sheet, row, '選択肢：所属会社', LISTS.affiliationCompanies);
  row = addChoiceTable(sheet, row, '選択肢：所属部門', LISTS.departments);
  row = addChoiceTable(sheet, row, '選択肢：役職', LISTS.positions);
  row = addChoiceTable(sheet, row, '選択肢：役割', LISTS.assignmentRoles);
  row = addChoiceTable(sheet, row, '選択肢：性別', LISTS.genders);
  row = addChoiceTable(sheet, row, '選択肢：国籍', LISTS.nationalities);
  row = addChoiceTable(sheet, row, '選択肢：在留資格', LISTS.residenceStatuses);
  row = addChoiceTable(sheet, row, '選択肢：結婚', LISTS.maritalStatuses);
  row = addChoiceTable(sheet, row, '選択肢：学位', LISTS.educationDegrees);
  row = addChoiceTable(sheet, row, '選択肢：会話レベル', LISTS.conversationLevels);
  row = addChoiceTable(sheet, row, '選択肢：関連技術レベル', LISTS.technicalSkillLevels);
  row = addChoiceTable(sheet, row, '選択肢：関連技術カテゴリ', LISTS.technicalSkillCategories);
  addChoiceTable(sheet, row, '選択肢：担当工程', LISTS.careerPhases);
  await protectReadOnlySheet(sheet);
}

async function buildClientGuideSheet(workbook) {
  const sheet = workbook.addWorksheet('記入説明', { views: [{ showGridLines: false }] });
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 72;

  sheet.mergeCells('A1:B1');
  const title = sheet.getCell('A1');
  title.value = '取引先マスタ登録テンプレート　記入説明';
  styleCell(title, {
    font: { name: FONT, size: 16, bold: true, color: { argb: COLORS.white } },
    fill: solid(COLORS.titleBg),
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
  });
  sheet.getRow(1).height = 30;

  let row = 3;
  row = addGuideParagraph(sheet, row, '使い方', { bold: true, size: 13, color: COLORS.titleBg, height: 24 });
  const steps = [
    '1. 「取引先」シートの5行目（緑色）は「参照用の記入例」です。シート保護により編集・削除できません。取込時は自動スキップされます。',
    '2. 実データは6行目から、1行につき1社を記入します。4行目は項目の説明です。',
    '3. 赤い見出し（項目名の末尾が *）は必須です。取引先名は必ず記入してください。',
    '4. 黄色のセル（6行目以降）だけが入力欄です。選択肢がある項目は、セルの▼から選んでください。',
    '5. 日付は YYYY-MM-DD（例：2018-04-01）で記入してください。Excelの日付形式でも構いません。',
    '6. 契約状況を空欄にした場合は「商談中」として登録します。',
    '7. 取引先コードは登録時にシステムが自動採番します。本テンプレートには含めません。',
    '8. 本ファイルは管理者のみが利用する一括登録用です。記入後は管理者画面から取り込んでください。',
  ];
  steps.forEach((text) => {
    row = addGuideParagraph(sheet, row, text, { height: 28, fill: COLORS.noteBg, color: COLORS.noteText });
  });

  row += 1;
  row = addGuideParagraph(sheet, row, '5行目（記入例）の用途', {
    bold: true,
    size: 13,
    color: COLORS.titleBg,
    height: 24,
  });
  const samplePurposeRules = [
    '用途：記入フォーマットの見本です。項目の書き方・選択肢の使い方を確認するための参照行です。',
    '保護：見出し（1〜4行目）と記入例（5行目）はロックされています。内容の変更・行削除はできません。',
    '取込：システムは「これは記入例」を含む行を自動スキップします。記入例を実データとして登録しません。',
    '入力：必ず6行目以降の黄色セルに実データを記入してください。空の行は取り込まれません。',
  ];
  samplePurposeRules.forEach((text) => {
    row = addGuideParagraph(sheet, row, text, { height: 28, fill: COLORS.sample, color: COLORS.sampleText });
  });

  row += 1;
  row = addGuideParagraph(sheet, row, '画面の取引先基本情報との対応', {
    bold: true,
    size: 13,
    color: COLORS.titleBg,
    height: 24,
  });
  const mappings = [
    '5行目の緑色の行は参照用記入例です。実在の取引先ではありません。',
    '本テンプレートの列は、取引先管理詳細の「取引先基本情報」で入力できる項目に対応しています。',
    '含めない項目：関連案件数、登録日、最終更新日（画面で自動表示）、取引先コード（自動採番）。',
    '「取引先側案件担当者」「自社担当者情報」は基本情報とは別ブロックのため、本テンプレートには含めていません。',
    '所在地の表示用テキストは、郵便番号と住所から登録時に自動で組み立てます。',
  ];
  mappings.forEach((text) => {
    row = addGuideParagraph(sheet, row, text, { height: 28 });
  });

  row += 1;
  row = addChoiceTable(sheet, row, '選択肢：重要度', LISTS.clientRanks);
  row = addChoiceTable(sheet, row, '選択肢：契約状況', LISTS.contractStatuses);
  addChoiceTable(sheet, row, '選択肢：契約形態', LISTS.contractTypes);
  await protectReadOnlySheet(sheet);
}

async function writeWorkbook(fileName, builder) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '社員情報管理システム';
  workbook.created = new Date();
  workbook.modified = new Date();
  await builder(workbook);
  const filePath = join(outputDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const employeePath = await writeWorkbook('社員マスタ_登録テンプレート.xlsx', async (workbook) => {
    const employeeLists = {
      workStatuses: LISTS.workStatuses,
      employeeTypes: LISTS.employeeTypes,
      affiliationCompanies: LISTS.affiliationCompanies,
      departments: LISTS.departments,
      positions: LISTS.positions,
      assignmentRoles: LISTS.assignmentRoles,
      genders: LISTS.genders,
      nationalities: LISTS.nationalities,
      residenceStatuses: LISTS.residenceStatuses,
      maritalStatuses: LISTS.maritalStatuses,
      educationDegrees: LISTS.educationDegrees,
      conversationLevels: LISTS.conversationLevels,
      documentMarks: LISTS.documentMarks,
      technicalSkillLevels: LISTS.technicalSkillLevels,
      technicalSkillCategories: LISTS.technicalSkillCategories,
      technicalSkillItems: LISTS.technicalSkillItems,
      careerPhases: LISTS.careerPhases,
    };
    const { keys: masterKeys } = addMasterSheet(workbook, employeeLists);

    await buildDataSheet(
      workbook,
      '社員',
      '社員マスタ登録　　5行目＝参照用記入例（編集・削除不可／取込スキップ）　　実データは6行目から',
      EMPLOYEE_GROUPS,
      EMPLOYEE_DATA_ROWS,
      employeeLists,
      EMPLOYEE_SAMPLE,
      { masterKeys }
    );
    await buildDataSheet(
      workbook,
      '保有資格',
      '保有資格　　社員IDで紐づけ　　5行目＝参照用記入例（編集・削除不可）　　実データは6行目から（1行＝1資格）',
      QUALIFICATION_GROUPS,
      QUALIFICATION_DATA_ROWS,
      employeeLists,
      QUALIFICATION_SAMPLE,
      { masterKeys, xSplit: 1 }
    );
    await buildDataSheet(
      workbook,
      '関連技術',
      '関連技術　　社員IDで紐づけ　　5行目＝参照用記入例（編集・削除不可）　　「関連技術一覧」参照可',
      TECHNICAL_SKILL_GROUPS,
      TECHNICAL_SKILL_DATA_ROWS,
      employeeLists,
      TECHNICAL_SKILL_SAMPLE,
      { masterKeys, xSplit: 1 }
    );
    await buildDataSheet(
      workbook,
      '職務経歴',
      '職務経歴　　社員IDで紐づけ　　5行目＝参照用記入例（編集・削除不可）　　実データは6行目から（1行＝1案件）',
      CAREER_GROUPS,
      CAREER_DATA_ROWS,
      employeeLists,
      CAREER_SAMPLE,
      { masterKeys, xSplit: 1 }
    );
    await buildTechnicalSkillRefSheet(workbook);
    await buildEmployeeGuideSheet(workbook);
    await protectReadOnlySheet(workbook.getWorksheet('マスタ'));
    workbook.views = [{ activeTab: 0 }];
  });

  const clientPath = await writeWorkbook('取引先マスタ_登録テンプレート.xlsx', async (workbook) => {
    await buildDataSheet(
      workbook,
      '取引先',
      '取引先マスタ登録　　5行目＝参照用記入例（編集・削除不可／取込スキップ）　　実データは6行目から',
      CLIENT_GROUPS,
      CLIENT_DATA_ROWS,
      {
        clientRanks: LISTS.clientRanks,
        contractStatuses: LISTS.contractStatuses,
        contractTypes: LISTS.contractTypes,
      },
      CLIENT_SAMPLE
    );
    await buildClientGuideSheet(workbook);
    await protectReadOnlySheet(workbook.getWorksheet('マスタ'));
    workbook.views = [{ activeTab: 0 }];
  });

  console.log(employeePath);
  console.log(clientPath);
}

await main();
