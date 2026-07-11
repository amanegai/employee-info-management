/**
 * 勤務表インポート用テンプレート（xlsx）を生成します。
 * 実行: node scripts/generate-timesheet-template.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from '../frontend/node_modules/exceljs/excel.js';
import { getWeekdayJapaneseHolidayName } from './japaneseHolidays.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outputDir = join(rootDir, 'frontend', 'public', 'templates');

const TARGET_YEAR = 2026;
const TARGET_MONTH = 5;
const EMPLOYEE = {
  code: 'E2008',
  name: '周凱',
  client: 'ビットクロス株式会社',
};

const REST_HOURS = 1;

const COLORS = {
  primary: 'FF0D9488',
  primaryDark: 'FF0F766E',
  primaryLight: 'FFCCFBF1',
  titleBg: 'FF115E59',
  metaLabelBg: 'FFE2E8F0',
  metaLabelText: 'FF475569',
  metaInputBg: 'FFFFFBEB',
  metaInputText: 'FF0F172A',
  noteBg: 'FFF0FDFA',
  noteText: 'FF134E4A',
  weekend: 'FFF1F5F9',
  holiday: 'FFFFF7ED',
  input: 'FFFFFBEB',
  rest: 'FFF8FAFC',
  border: 'FFCBD5E1',
  metaBorder: 'FF94A3B8',
  label: 'FF64748B',
  white: 'FFFFFFFF',
  text: 'FF1E293B',
  hint: 'FF94A3B8',
  formula: 'FFF0FDF4',
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const HEADER_ROW = 7;
const DATA_START_ROW = 8;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function buildTimesheetFileName(employeeCode, employeeName, targetMonth) {
  const code = String(employeeCode ?? '').trim().replace(/[\\/:*?"<>|]/g, '') || 'employee';
  const name = String(employeeName ?? '').trim().replace(/[\\/:*?"<>|]/g, '') || 'name';
  const month = String(targetMonth ?? '').trim() || '0000-00';
  return `勤務表_${code}_${name}_${month}.xlsx`;
}

function thinBorder(color = COLORS.border) {
  return {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  };
}

function setCell(sheet, address, value, style = {}) {
  const cell = sheet.getCell(address);
  if (value && typeof value === 'object' && value.formula) {
    cell.value = { formula: value.formula, result: value.result ?? '' };
  } else {
    cell.value = value;
  }
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
  if (style.numFmt) cell.numFmt = style.numFmt;
  return cell;
}

function mergeAndStyle(sheet, range, value, style = {}) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(':')[0]);
  cell.value = value;
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
  if (style.numFmt) cell.numFmt = style.numFmt;
  return cell;
}

/** B2（対象年月）から年・月を取得する I 列ヘルパー式 */
const YEAR_FROM_B2 = 'IFERROR(IF(ISNUMBER($B$2),YEAR($B$2),VALUE(LEFT($B$2,FIND("年",$B$2&"年")-1))),2026)';
const MONTH_FROM_B2 = 'IFERROR(IF(ISNUMBER($B$2),MONTH($B$2),VALUE(SUBSTITUTE(MID($B$2,FIND("年",$B$2&"年")+1,LEN($B$2)),"月",""))),1)';

function timeFraction(hours, minutes = 0) {
  return (hours * 60 + minutes) / 1440;
}

function sampleDayData(day) {
  if (day === 5) return { start: timeFraction(9, 30), end: timeFraction(18, 0), remarks: '遅刻' };
  if (day === 12) return { start: timeFraction(9, 0), end: timeFraction(17, 0), remarks: '早退' };
  if (day === 19) return { start: '', end: '', remarks: '有給' };
  return { start: timeFraction(9, 0), end: timeFraction(18, 0), remarks: '' };
}

function computeHoursFromTimes(start, end, rest = REST_HOURS) {
  if (start === '' || end === '') return null;
  const hours = (end - start) * 24 - rest;
  return hours > 0 ? Math.round(hours * 10) / 10 : 0;
}

function metaBorder(color = COLORS.metaBorder) {
  return thinBorder(color);
}

function applyMetaSection(sheet, { monthLabel, employee, fillSample }) {
  mergeAndStyle(sheet, 'A1:G1', '勤 務 表', {
    font: { name: 'Yu Gothic UI', size: 22, bold: true, color: { argb: COLORS.white } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      bottom: { style: 'medium', color: { argb: COLORS.primaryDark } },
    },
  });
  sheet.getRow(1).height = 40;

  const labelStyle = {
    font: { name: 'Yu Gothic UI', size: 10, bold: true, color: { argb: COLORS.metaLabelText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.metaLabelBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: metaBorder(),
  };
  const valueStyle = {
    font: { name: 'Yu Gothic UI', size: 11, color: { argb: COLORS.metaInputText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.metaInputBg } },
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
    border: metaBorder(),
  };

  setCell(sheet, 'A2', '対象年月', labelStyle);
  mergeAndStyle(sheet, 'B2:D2', monthLabel, {
    font: { name: 'Yu Gothic UI', size: 12, bold: true, color: { argb: COLORS.primaryDark } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.metaInputBg } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: metaBorder(),
    numFmt: '@',
  });
  setCell(sheet, 'E2', '提出日', labelStyle);
  mergeAndStyle(sheet, 'F2:G2', '', valueStyle);

  setCell(sheet, 'A3', '氏名', labelStyle);
  mergeAndStyle(sheet, 'B3:D3', fillSample ? employee.name : '', {
    ...valueStyle,
    font: { ...valueStyle.font, bold: true },
  });
  setCell(sheet, 'E3', '取引先', labelStyle);
  mergeAndStyle(sheet, 'F3:G3', fillSample ? employee.client : '', valueStyle);

  sheet.getRow(2).height = 28;
  sheet.getRow(3).height = 28;

  mergeAndStyle(
    sheet,
    'A4:G4',
    '入力のヒント：対象年月は「2026年3月」形式（文字）で入力。出勤日は開始・終了時刻（休憩1h）。有給・遅刻・早退は備考欄へ。',
    {
      font: { name: 'Yu Gothic UI', size: 9, color: { argb: COLORS.noteText } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.noteBg } },
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 },
      border: {
        top: { style: 'thin', color: { argb: COLORS.primaryLight } },
        left: { style: 'medium', color: { argb: COLORS.primary } },
        bottom: { style: 'thin', color: { argb: COLORS.primaryLight } },
        right: { style: 'thin', color: { argb: COLORS.primaryLight } },
      },
    },
  );
  sheet.getRow(4).height = 32;

  mergeAndStyle(sheet, 'A5:G5', '', {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } },
  });
  sheet.getRow(5).height = 8;
}

async function buildWorkbook({ employee, fillSample, targetYear, targetMonth }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '社員情報管理';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('勤務表', {
    views: [{ state: 'frozen', ySplit: DATA_START_ROW - 1, xSplit: 0, activeCell: 'C8' }],
  });

  sheet.columns = [
    { key: 'day', width: 12 },
    { key: 'dow', width: 10 },
    { key: 'monthMid', width: 10 },
    { key: 'monthEnd', width: 10 },
    { key: 'metaLabel', width: 11 },
    { key: 'hours', width: 14 },
    { key: 'remarks', width: 24 },
  ];

  const monthLabel = `${targetYear}年${targetMonth}月`;
  applyMetaSection(sheet, { monthLabel, employee, fillSample });

  const helperStyle = {
    font: { name: 'Yu Gothic UI', size: 9, color: { argb: COLORS.hint } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } },
  };
  setCell(sheet, 'I1', {
    formula: YEAR_FROM_B2,
    result: targetYear,
  }, helperStyle);
  setCell(sheet, 'I2', {
    formula: MONTH_FROM_B2,
    result: targetMonth,
  }, helperStyle);
  sheet.getColumn('I').hidden = true;

  const tableHeaderStyle = {
    font: { name: 'Yu Gothic UI', size: 10, bold: true, color: { argb: COLORS.white } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: thinBorder(COLORS.primaryDark),
  };

  ['日', '曜日', '開始', '終了', '休憩(h)', '勤務時間(h)', '備考'].forEach((title, index) => {
    setCell(sheet, `${String.fromCharCode(65 + index)}${HEADER_ROW}`, title, tableHeaderStyle);
  });
  sheet.getRow(HEADER_ROW).height = 24;

  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const MAX_DAY_ROWS = 31;
  const lastDataRow = DATA_START_ROW + MAX_DAY_ROWS - 1;

  for (let i = 0; i < MAX_DAY_ROWS; i += 1) {
    const dataRow = DATA_START_ROW + i;
    const dayIndex = i + 1;
    const inMonth = dayIndex <= daysInMonth;
    const dow = inMonth ? new Date(targetYear, targetMonth - 1, dayIndex).getDay() : 0;
    const isWeekend = inMonth && (dow === 0 || dow === 6);
    const holidayName = inMonth ? getWeekdayJapaneseHolidayName(targetYear, targetMonth, dayIndex) : null;
    const isHoliday = Boolean(holidayName);
    const isNonWorkday = isWeekend || isHoliday;

    const sample = fillSample && inMonth && !isNonWorkday ? sampleDayData(dayIndex) : { start: '', end: '', remarks: '' };

    let rowFill = COLORS.white;
    if (isWeekend) rowFill = COLORS.weekend;
    else if (isHoliday) rowFill = COLORS.holiday;

    const rowStyle = {
      font: { name: 'Yu Gothic UI', size: 11, color: { argb: COLORS.text } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: thinBorder(),
    };

    const dayFormula = `IF(${dayIndex}<=DAY(EOMONTH(DATE($I$1,$I$2,1),0)),${dayIndex},"")`;
    setCell(sheet, `A${dataRow}`, {
      formula: dayFormula,
      result: inMonth ? dayIndex : undefined,
    }, rowStyle);

    const dowFormula = `IF(A${dataRow}="","",CHOOSE(WEEKDAY(DATE($I$1,$I$2,A${dataRow}),1),"日","月","火","水","木","金","土"))`;
    setCell(sheet, `B${dataRow}`, {
      formula: dowFormula,
      result: inMonth ? WEEKDAYS[dow] : undefined,
    }, {
      ...rowStyle,
      font: {
        ...rowStyle.font,
        bold: isNonWorkday,
        color: { argb: isNonWorkday ? COLORS.label : COLORS.text },
      },
    });

    let remarks = sample.remarks;
    if (isWeekend) remarks = '休日';
    else if (isHoliday) remarks = `祝日（${holidayName}）`;

    const start = isNonWorkday ? '' : sample.start;
    const end = isNonWorkday ? '' : sample.end;

    setCell(sheet, `C${dataRow}`, start, {
      ...rowStyle,
      numFmt: 'h:mm',
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: isNonWorkday ? rowFill : COLORS.input } },
    });
    setCell(sheet, `D${dataRow}`, end, {
      ...rowStyle,
      numFmt: 'h:mm',
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: isNonWorkday ? rowFill : COLORS.input } },
    });
    setCell(sheet, `E${dataRow}`, REST_HOURS, {
      ...rowStyle,
      numFmt: '0.0',
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rest } },
      font: { ...rowStyle.font, color: { argb: COLORS.label } },
    });

    const hoursFormula = `IF(AND(C${dataRow}<>"",D${dataRow}<>""),MAX(0,ROUND((D${dataRow}-C${dataRow})*24-E${dataRow},1)),"")`;
    const hoursResult = start !== '' && end !== '' ? computeHoursFromTimes(start, end, REST_HOURS) : '';
    setCell(sheet, `F${dataRow}`, { formula: hoursFormula, result: hoursResult }, {
      numFmt: '0.0',
      font: { name: 'Yu Gothic UI', size: 11, bold: true, color: { argb: COLORS.primaryDark } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.formula } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: thinBorder(),
    });

    if (isNonWorkday && inMonth) {
      const weekendFormula = `IF(A${dataRow}="","",IF(OR(WEEKDAY(DATE($I$1,$I$2,A${dataRow}),1)=1,WEEKDAY(DATE($I$1,$I$2,A${dataRow}),1)=7),"休日",""))`;
      setCell(sheet, `G${dataRow}`, isWeekend
        ? { formula: weekendFormula, result: '休日' }
        : remarks, {
        ...rowStyle,
        alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
      });
    } else {
      setCell(sheet, `G${dataRow}`, remarks, {
        ...rowStyle,
        alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
      });
    }

    sheet.getRow(dataRow).height = 22;
  }

  mergeAndStyle(
    sheet,
    `A${lastDataRow + 2}:G${lastDataRow + 2}`,
    '記入例：開始 9:00 / 終了 18:00 → 勤務時間 8.0h（休憩1h）。「日」は対象年月(B2)から自動表示。',
    {
      font: { name: 'Yu Gothic UI', size: 9, color: { argb: COLORS.hint } },
      alignment: { horizontal: 'left' },
    },
  );

  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };

  return { workbook };
}

async function writeWorkbook(filePath, options) {
  const { workbook } = await buildWorkbook(options);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const distPath = filePath.replace(`${join('frontend', 'public')}`, join('frontend', 'dist'));
  const targets = [filePath, distPath];

  for (const target of targets) {
    try {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, buffer);
    } catch (error) {
      if (error?.code === 'EBUSY') {
        console.warn(`Skipped locked file: ${target}`);
      } else {
        throw error;
      }
    }
  }
}

mkdirSync(outputDir, { recursive: true });

const targetMonth = `${TARGET_YEAR}-${pad2(TARGET_MONTH)}`;
const sampleFileName = buildTimesheetFileName(EMPLOYEE.code, EMPLOYEE.name, targetMonth);
const templatePath = join(outputDir, '勤務表_テンプレート.xlsx');
const samplePath = join(outputDir, sampleFileName);

const buildOptions = {
  employee: EMPLOYEE,
  targetYear: TARGET_YEAR,
  targetMonth: TARGET_MONTH,
};

await writeWorkbook(templatePath, { ...buildOptions, fillSample: false });
try {
  await writeWorkbook(samplePath, { ...buildOptions, fillSample: true });
} catch (error) {
  if (error?.code === 'EBUSY') {
    console.warn(`Skipped locked file: ${samplePath}`);
  } else {
    throw error;
  }
}

writeFileSync(
  join(outputDir, 'README.txt'),
  [
    '勤務表インポート用テンプレート',
    '',
    '1. 勤務表_テンプレート.xlsx をコピーして編集してください。',
    '2. 上部に氏名・取引先・対象年月を入力してください（社員番号は不要）。',
    '3. 日別行：日｜曜日｜開始｜終了｜休憩(h)｜勤務時間(h)｜備考',
    '4. 休憩は1時間固定。勤務時間は開始・終了から自動計算されます。',
    '5. 日付は「日」のみ表示（対象年月から自動生成）。土日・平日祝日も自動表示。',
    '6. ファイル名：勤務表_社員ID_氏名_年-月.xlsx（例：勤務表_E2008_周凱_2026-03.xlsx）',
    '7. ファイル管理で分類「勤務表」を選び、対象年月を指定してアップロード。',
    '',
    '備考に「遅刻」「早退」と記載すると遅刻・早退件数にカウントされます。',
  ].join('\n'),
  'utf8',
);

console.log(`Generated:\n- ${templatePath}\n- ${samplePath}`);
