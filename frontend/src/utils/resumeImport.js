import * as XLSX from 'xlsx';

import {
  CAREER_PHASE_OPTIONS,
  CAREER_PHASE_ALIASES,
  EMPTY_EMPLOYEE_FORM,
  resolveNationalityIdFromName,
  sortCareersByNewestFirst,
} from '../utils';
import {
  TECHNICAL_SKILL_TEMPLATE,
  technicalSkillKey,
} from '../constants/technicalSkillTemplate';

const SKILL_MARKS = new Set(['◎', '〇', '○', '◯', '△']);
const ITEM_COLUMNS = [4, 8, 12, 16, 20, 24, 28, 32, 36];
const CAREER_PHASE_COLUMNS = [
  { col: 32, phase: '要件定義' },
  { col: 33, phase: '基本設計' },
  { col: 34, phase: '詳細設計' },
  { col: 35, phase: '製造' },
  { col: 36, phase: '単体テスト' },
  { col: 37, phase: '結合テスト' },
  { col: 38, phase: '総合テスト' },
  { col: 39, phase: '保守・運用' },
];

function isResumeSheetName(name) {
  const normalized = normalizeSheetName(name);
  return /技術.*歴/.test(normalized);
}

const EXCLUDED_SHEET_PATTERN = /記入例|サンプル|sample|example/i;

const CATEGORY_BY_NORMALIZED = new Map(
  TECHNICAL_SKILL_TEMPLATE.map(({ category }) => [normalizeLabel(category), category])
);

const ITEM_CATEGORY = new Map();
const CANONICAL_ITEM = new Map();
TECHNICAL_SKILL_TEMPLATE.forEach(({ category, items }) => {
  items.forEach((item) => {
    ITEM_CATEGORY.set(normalizeLabel(item), category);
    CANONICAL_ITEM.set(normalizeLabel(item), { category, itemName: item });
  });
});

/** Excel 上の表記ゆれ → テンプレート項目名 */
const ITEM_ALIASES = {
  swi: 'swift',
  'linix/unixコマンド': 'Linux/Unixコマンド',
  linixunixコマンド: 'Linux/Unixコマンド',
};

function normalizeLabel(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/\n/g, '')
    .replace(/　/g, '');
}

function normalizeSheetName(name) {
  return String(name ?? '').replace(/\s+/g, '');
}

function normalizeSkillMark(value) {
  const mark = String(value ?? '').trim();
  if (mark === '○' || mark === '◯') return '〇';
  return mark;
}

function sheetToGrid(sheet) {
  const ref = sheet['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const grid = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row = [];
    for (let c = 0; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      row.push(cell?.v ?? '');
    }
    grid.push(row);
  }
  return applyMergedCells(sheet, grid);
}

function applyMergedCells(sheet, grid) {
  const merges = sheet['!merges'];
  if (!merges?.length) return grid;

  for (const { s, e } of merges) {
    const value = grid[s.r]?.[s.c];
    if (value == null || value === '') continue;
    for (let r = s.r; r <= e.r; r += 1) {
      if (!grid[r]) grid[r] = [];
      for (let c = s.c; c <= e.c; c += 1) {
        if (grid[r][c] == null || grid[r][c] === '') {
          grid[r][c] = value;
        }
      }
    }
  }
  return grid;
}

function gridCell(grid, row, col) {
  const rowData = grid[row - 1];
  if (!rowData) return '';
  const value = rowData[col - 1];
  if (value == null) return '';
  return value;
}

/** 「8年4ヶ月」など → DB 用の年数（整数）。月は切り捨て。 */
function parseItIndustryYears(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.max(0, Math.trunc(value)));
  }
  const text = String(value).trim();
  if (!text) return '';
  const matched = text.match(/(\d+)\s*年/);
  if (matched) return matched[1];
  if (/^\d+$/.test(text)) return text;
  return '';
}

function gridText(grid, row, col) {
  const value = gridCell(grid, row, col);
  if (value instanceof Date) return value;
  return String(value).trim();
}

function formatIsoDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = String(parsed.m).padStart(2, '0');
      const day = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${month}-${day}`;
    }
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ymd = text.match(/^(\d{4})[\/\.年](\d{1,2})(?:[\/\.月](\d{1,2}))?/);
  if (ymd) {
    const month = ymd[2].padStart(2, '0');
    const day = (ymd[3] || '01').padStart(2, '0');
    return `${ymd[1]}-${month}-${day}`;
  }
  return '';
}

function parseAgeToBirthDate(ageText) {
  const match = String(ageText).match(/(\d+)/);
  if (!match) return '';
  const age = Number(match[1]);
  if (!Number.isFinite(age) || age <= 0) return '';
  const year = new Date().getFullYear() - age;
  return `${year}-01-01`;
}

function resolveCategory(label) {
  const normalized = normalizeLabel(label);
  if (CATEGORY_BY_NORMALIZED.has(normalized)) {
    return CATEGORY_BY_NORMALIZED.get(normalized);
  }
  for (const [key, category] of CATEGORY_BY_NORMALIZED.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }
  return '';
}

function isGridResume(grid) {
  const title = normalizeLabel(gridText(grid, 1, 1));
  const furiganaLabel = normalizeLabel(gridText(grid, 3, 1));
  return (title.includes('技術') && /歴/.test(title)) || furiganaLabel === 'フリガナ';
}

function countSkillMarks(grid) {
  let count = 0;
  for (let row = 14; row <= 48; row += 1) {
    for (const col of ITEM_COLUMNS) {
      const itemName = gridText(grid, row, col);
      const level = normalizeSkillMark(gridText(grid, row + 1, col));
      if (itemName && SKILL_MARKS.has(level)) count += 1;
    }
  }
  return count;
}

function countCareerRows(grid) {
  const startRow = findCareerDataStartRow(grid);
  let count = 0;
  for (let row = startRow; row <= grid.length; row += 1) {
    const marker = gridText(grid, row, 1);
    if (marker === '備考' || String(marker).includes('備考')) break;
    const startDate = formatIsoDate(gridCell(grid, row, 2));
    const roleOverview = gridText(grid, row, 9);
    if (startDate || roleOverview) count += 1;
  }
  return count;
}

function findResumeSheet(workbook) {
  const names = workbook.SheetNames;
  if (!names.length) {
    throw new Error('シートが見つかりません');
  }

  for (const name of names) {
    const normalized = normalizeSheetName(name);
    if (EXCLUDED_SHEET_PATTERN.test(normalized)) continue;
    if (isResumeSheetName(name)) {
      return workbook.Sheets[name];
    }
  }

  let bestSheet = null;
  let bestScore = -1;
  for (const name of names) {
    const normalized = normalizeSheetName(name);
    if (EXCLUDED_SHEET_PATTERN.test(normalized)) continue;

    const sheet = workbook.Sheets[name];
    const grid = sheetToGrid(sheet);
    if (!isGridResume(grid)) continue;

    const score =
      (gridText(grid, 4, 4) ? 100 : 0) +
      countSkillMarks(grid) * 3 +
      countCareerRows(grid) * 5;

    if (score > bestScore) {
      bestScore = score;
      bestSheet = sheet;
    }
  }

  if (bestSheet) return bestSheet;

  if (names.length === 1) {
    return workbook.Sheets[names[0]];
  }

  throw new Error('技術者履歴書シートが見つかりません');
}

function resolveItemName(rawName) {
  const trimmed = String(rawName ?? '').trim();
  const normalized = normalizeLabel(trimmed);
  const aliasTarget = ITEM_ALIASES[normalized.toLowerCase()];
  if (aliasTarget) {
    const aliasMatch = CANONICAL_ITEM.get(normalizeLabel(aliasTarget));
    if (aliasMatch) return aliasMatch;
  }

  const direct = CANONICAL_ITEM.get(normalized);
  if (direct) return direct;

  for (const [key, value] of CANONICAL_ITEM) {
    if (key.toLowerCase() === normalized.toLowerCase()) return value;
  }

  return { category: null, itemName: trimmed };
}

function parseTechnicalSkillsFromGrid(grid) {
  const skills = {};
  let currentCategory = '';

  for (let row = 14; row <= 48; row += 1) {
    const categoryLabel = gridText(grid, row, 1);
    if (categoryLabel) {
      const resolved = resolveCategory(categoryLabel);
      if (resolved) currentCategory = resolved;
    }

    for (const col of ITEM_COLUMNS) {
      const itemName = gridText(grid, row, col).trim();
      if (!itemName || itemName.includes('その他')) continue;

      const level = normalizeSkillMark(gridText(grid, row + 1, col));
      if (!SKILL_MARKS.has(level)) continue;

      const { category: itemCategory, itemName: canonicalName } = resolveItemName(itemName);
      const category =
        currentCategory || itemCategory || ITEM_CATEGORY.get(normalizeLabel(itemName)) || 'その他';
      skills[technicalSkillKey(category, canonicalName)] = level;
    }
  }

  return skills;
}

function parseCareerPhasesFromGrid(grid, row) {
  const phases = [];
  for (const { col, phase } of CAREER_PHASE_COLUMNS) {
    const mark = gridText(grid, row, col);
    if (mark === '●' || mark === '○' || mark === '◯' || mark === '〇') {
      const mapped = CAREER_PHASE_ALIASES[phase] || phase;
      if (CAREER_PHASE_OPTIONS.includes(mapped) && !phases.includes(mapped)) {
        phases.push(mapped);
      }
    }
  }
  return phases;
}

function findLanguageColumns(grid, headerRow) {
  let readCol = 9;
  let writeCol = 14;
  for (let col = 1; col <= 30; col += 1) {
    const header = normalizeLabel(gridText(grid, headerRow, col));
    if (header.includes('仕様書解読') || header === '読解') readCol = col;
    if (header.includes('仕様書作成') || header === '作成') writeCol = col;
  }
  return { readCol, writeCol };
}

function isLanguageReadingWritingLevel(value) {
  const text = normalizeSkillMark(String(value ?? '').trim());
  if (!text) return false;
  if (/^[A-D]$/.test(text)) return true;
  if (['良', '可', '不可'].includes(text)) return true;
  return SKILL_MARKS.has(text);
}

function readLanguageLevel(grid, row, col) {
  const value = normalizeSkillMark(gridText(grid, row, col));
  if (isLanguageReadingWritingLevel(value)) return value;
  return '';
}

function isPlaceholderCareerRow(grid, row) {
  const roleOverview = gridText(grid, row, 9);
  const workplace = gridText(grid, row, 20);
  const role = gridText(grid, row, 22);
  if (roleOverview === '業務内容') return true;
  if (workplace === '作業場所' && role === '役割') return true;
  return false;
}
function findCareerDataStartRow(grid) {
  for (let row = 54; row <= 70; row += 1) {
    const header = gridText(grid, row, 9);
    if (String(header).includes('業務内容')) {
      for (let dataRow = row + 1; dataRow <= row + 10; dataRow += 1) {
        const indexVal = gridCell(grid, dataRow, 1);
        const startDate = formatIsoDate(gridCell(grid, dataRow, 2));
        if (typeof indexVal === 'number' || startDate) {
          return dataRow;
        }
      }
      return row + 1;
    }
  }
  return 60;
}

function parseCareersFromGrid(grid) {
  const careers = [];
  const startRow = findCareerDataStartRow(grid);

  for (let row = startRow; row <= grid.length; row += 1) {
    const marker = gridText(grid, row, 1);
    if (marker === '備考' || String(marker).includes('備考')) break;

    if (isPlaceholderCareerRow(grid, row)) continue;

    const startDate = formatIsoDate(gridCell(grid, row, 2));
    const endDate = formatIsoDate(gridCell(grid, row, 5));
    const roleOverview = gridText(grid, row, 9);
    const monthsRaw = gridCell(grid, row, 7);

    if (!startDate && !roleOverview) continue;
    if (!startDate) continue;

    careers.push({
      period: '',
      organization: '',
      roleOverview,
      startDate,
      endDate,
      months: monthsRaw !== '' && monthsRaw != null ? String(monthsRaw) : '',
      workplace: gridText(grid, row, 20),
      role: gridText(grid, row, 22),
      osDb: gridText(grid, row, 23),
      languages: gridText(grid, row, 25),
      fwTools: gridText(grid, row, 28),
      phases: parseCareerPhasesFromGrid(grid, row),
    });
  }

  return sortCareersByNewestFirst(careers);
}

function parseGridResume(grid, nationalities = []) {
  const name = gridText(grid, 4, 4);
  if (!name) {
    throw new Error('氏名が読み取れません。技術者履歴書テンプレート（.xlsx）か確認してください');
  }

  const japaneseConversation = gridText(grid, 10, 4);
  const englishConversation = gridText(grid, 11, 4);
  const { readCol, writeCol } = findLanguageColumns(grid, 9);
  const nationalityName = gridText(grid, 4, 10);

  return {
    ...EMPTY_EMPLOYEE_FORM,
    name,
    evaluation: '',
    departmentId: '',
    position: '',
    employeeType: '',
    workStatus: '',
    personal: {
      ...EMPTY_EMPLOYEE_FORM.personal,
      furigana: gridText(grid, 3, 4),
      gender: gridText(grid, 4, 8),
      nationalityId: resolveNationalityIdFromName(nationalityName, nationalities),
      birthDate: parseAgeToBirthDate(gridText(grid, 4, 12)),
      maritalStatus: gridText(grid, 4, 14),
      nearestStation: gridText(grid, 4, 16),
      itIndustryYears: parseItIndustryYears(gridCell(grid, 4, 25)),
      japanArrivalDate: formatIsoDate(gridCell(grid, 4, 32)),
      educationDegree: gridText(grid, 5, 4),
      schoolName: gridText(grid, 5, 12),
      major: gridText(grid, 5, 25),
      japaneseLevel: japaneseConversation,
      japaneseConversation,
      japaneseReading: readLanguageLevel(grid, 10, readCol),
      japaneseWriting: readLanguageLevel(grid, 10, writeCol),
      englishLevel: englishConversation,
      englishConversation,
      englishReading: readLanguageLevel(grid, 11, readCol),
      englishWriting: readLanguageLevel(grid, 11, writeCol),
      specialtyDev: gridText(grid, 50, 4),
      specialtyBusiness: gridText(grid, 51, 4),
      selfPr: gridText(grid, 52, 4),
    },
    technicalSkills: parseTechnicalSkillsFromGrid(grid),
    qualifications: gridText(grid, 6, 4) ? [{ description: gridText(grid, 6, 4) }] : [],
    careers: parseCareersFromGrid(grid),
  };
}

/**
 * 技術者履歴書 Excel（.xlsx）を社員フォームデータに変換
 * @param {File} file
 * @param {Array<{id:number,name:string}>} [nationalities]
 * @returns {Promise<object>}
 */
export async function parseResumeXlsxToForm(file, nationalities = []) {
  if (!file) {
    throw new Error('ファイルが選択されていません');
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
    throw new Error('Excel ファイル（.xlsx / .xls）を選択してください');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = findResumeSheet(workbook);
  const grid = sheetToGrid(sheet);

  if (!isGridResume(grid)) {
    throw new Error('対応していない Excel 形式です。技術者履歴書テンプレート（.xlsx）をご利用ください');
  }

  return parseGridResume(grid, nationalities);
}
