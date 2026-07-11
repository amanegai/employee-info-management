import * as XLSX from 'xlsx';
import { countWorkdaysInMonth } from './japaneseHolidays';

const COLUMN_ALIASES = {
  date: ['日付', '日期', 'date', '勤務日', '稼働日', '日'],
  employeeName: ['氏名', '社員名', '名前', 'name', 'employee', '社員'],
  employeeCode: ['社員番号', '社員コード', 'code', 'employee code', 'id'],
  clientName: ['取引先', '客户', 'client', 'クライアント', 'プロジェクト', '案件'],
  startTime: ['開始', '開始時刻', '出勤', 'start', '始業'],
  endTime: ['終了', '終了時刻', '退勤', 'end', '終業'],
  restTime: ['休憩', '休息', '休憩時間', '休憩(h)', 'rest'],
  workHours: ['勤務時間', '勤務時間(h)', '稼働時間', '時間', 'hours', '工数', 'h'],
  remarks: ['備考', '备注', 'remarks', 'メモ', 'note'],
  attendanceRate: ['出勤率', 'attendance rate', 'attendance%'],
  lateEarlyCount: ['遅刻・早退', '遅刻早退', '遅刻', '早退', 'late', 'early'],
  paidLeaveRemaining: ['有給残', '有給残数', 'paid leave', '有休残'],
};

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function detectColumnKey(header) {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(normalizeHeader(alias)))) {
      return key;
    }
  }
  return null;
}

function formatCellValue(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' && value > 20000 && value < 60000) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  return String(value).trim();
}

function formatTimeCellValue(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    const h = value.getHours();
    const m = value.getMinutes();
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${Number(match[1])}:${match[2]}`;
  return text;
}

function mapHeaders(headers) {
  const mapping = {};
  headers.forEach((header, index) => {
    const key = detectColumnKey(header);
    if (key && mapping[key] == null) {
      mapping[key] = index;
    }
  });
  return mapping;
}

function rowToRecord(row, mapping) {
  const get = (key) => {
    const index = mapping[key];
    if (index == null) return '';
    return formatCellValue(row[index]);
  };
  const rawStart = row[mapping.startTime];
  const rawEnd = row[mapping.endTime];
  return {
    date: get('date'),
    employeeName: get('employeeName'),
    employeeCode: get('employeeCode'),
    clientName: get('clientName'),
    startTime: mapping.startTime != null ? formatTimeCellValue(rawStart) : '',
    endTime: mapping.endTime != null ? formatTimeCellValue(rawEnd) : '',
    restTime: get('restTime'),
    workHours: get('workHours'),
    remarks: get('remarks'),
    attendanceRate: get('attendanceRate'),
    lateEarlyCount: get('lateEarlyCount'),
    paidLeaveRemaining: get('paidLeaveRemaining'),
  };
}

function parseTargetMonthLabel(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const jp = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (jp) return `${jp[1]}-${String(jp[2]).padStart(2, '0')}`;
  const iso = text.match(/(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  return '';
}

function parseTimesheetMeta(rows) {
  const meta = { employeeCode: '', employeeName: '', clientName: '', targetMonth: '' };
  for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
    const row = rows[i] ?? [];
    for (let j = 0; j < row.length - 1; j += 1) {
      const label = normalizeHeader(row[j]);
      const value = formatCellValue(row[j + 1]);
      if (!value) continue;
      if (label.includes('社員番号') || label.includes('社員id')) meta.employeeCode = value;
      if (label.includes('氏名') || label.includes('社員名')) meta.employeeName = value;
      if (label.includes('取引先') || label.includes('クライアント')) meta.clientName = value;
      if (label.includes('対象年月')) {
        const raw = row[j + 1];
        meta.targetMonth = parseTargetMonthLabel(raw instanceof Date ? raw : value)
          || parseTargetMonthLabel(value);
      }
    }
  }
  return meta;
}

function enrichRecordWithMeta(record, meta) {
  return {
    ...record,
    employeeCode: record.employeeCode || meta.employeeCode,
    employeeName: record.employeeName || meta.employeeName,
    clientName: record.clientName || meta.clientName,
  };
}

function parseTimeToHours(value) {
  if (value instanceof Date) {
    return value.getHours() + value.getMinutes() / 60 + value.getSeconds() / 3600;
  }
  if (typeof value === 'number' && value >= 0 && value < 2) {
    return Math.round(value * 24 * 1000) / 1000;
  }
  const text = String(value ?? '').trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    return Number(match[1]) + Number(match[2]) / 60;
  }
  const num = parseFloat(text.replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function computeWorkHoursFromTimes(startTime, endTime, restTime = 1) {
  const start = parseTimeToHours(startTime);
  const end = parseTimeToHours(endTime);
  if (start == null || end == null || end <= start) return 0;
  const rest = parseWorkHours(restTime) || 1;
  return Math.max(0, Math.round((end - start - rest) * 10) / 10);
}

function resolveRecordDate(record, targetMonth) {
  const rawDate = String(record.date ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
  const day = parseInteger(rawDate);
  if (day == null || !targetMonth) return '';
  const [year, month] = targetMonth.split('-');
  if (!year || !month) return '';
  const maxDay = new Date(Number(year), Number(month), 0).getDate();
  if (day < 1 || day > maxDay) return '';
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function finalizeRecord(record, meta, targetMonth, rowDayIndex) {
  const enriched = enrichRecordWithMeta(record, meta);
  const month = targetMonth || meta.targetMonth;
  let date = resolveRecordDate(enriched, month);
  if (!date && rowDayIndex && month) {
    date = resolveRecordDate({ date: rowDayIndex }, month);
  }
  let workHours = enriched.workHours;
  if (!parseWorkHours(workHours)) {
    const computed = computeWorkHoursFromTimes(enriched.startTime, enriched.endTime, enriched.restTime || 1);
    if (computed > 0) workHours = String(computed);
  }
  return { ...enriched, date, workHours };
}

function isImportableTimesheetRow(record) {
  if (!record.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(record.date))) return false;
  const hours = parseWorkHours(record.workHours);
  const hasHours = hours > 0;
  const remark = String(record.remarks ?? '').trim();
  if (!hasHours && !remark) return false;
  if (!hasHours && /休日|休み|祝日/.test(remark)) return false;
  return true;
}

function sheetToRecords(sheet, fallbackTargetMonth = '') {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows.length) return { records: [], headers: [], mapping: {}, meta: {} };

  const meta = parseTimesheetMeta(rows);
  const targetMonth = meta.targetMonth || fallbackTargetMonth;

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rows.length, 15); i += 1) {
    const mapping = mapHeaders(rows[i]);
    if (mapping.date != null && (mapping.startTime != null || mapping.workHours != null || mapping.remarks != null)) {
      headerRowIndex = i;
      break;
    }
    if (Object.keys(mapping).length >= 2) {
      headerRowIndex = i;
    }
  }

  const headers = rows[headerRowIndex].map((cell) => String(cell ?? '').trim());
  const mapping = mapHeaders(headers);
  const records = rows
    .slice(headerRowIndex + 1)
    .map((row, index) => finalizeRecord(rowToRecord(row, mapping), meta, targetMonth, index + 1))
    .filter(isImportableTimesheetRow);

  return { records, headers, mapping, meta };
}

export async function parseTimesheetFile(file, fallbackTargetMonth = '') {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('シートが見つかりません');
  }
  const { records, headers, mapping, meta } = sheetToRecords(
    workbook.Sheets[sheetName],
    fallbackTargetMonth || extractTargetMonthFromFilename(file.name),
  );
  if (!records.length) {
    throw new Error('取り込めるデータ行がありません。ヘッダー行を確認してください。');
  }
  return {
    fileName: file.name,
    sheetName,
    records,
    headers,
    mapping,
    meta,
    importedAt: new Date().toISOString(),
  };
}

const EMPLOYEE_CODE_FILENAME_PATTERN = /(?:^|[^A-Z0-9])(E\d{3,})(?:[^A-Z0-9]|$)/i;
const OLD_TIMESHEET_FILENAME_PATTERN = /^勤務表_(E\d{3,})_(.+)_(\d{4}-\d{2})$/i;
const NEW_TIMESHEET_FILENAME_PATTERN = /^勤務表_(.+)_(\d{4}-\d{2})$/i;

export function sanitizeTimesheetNamePart(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ');
}

/** 勤務表ファイル名: 勤務表_社員ID_氏名_年-月.xlsx */
export function buildTimesheetFileName(employeeCode, employeeName, targetMonth) {
  const code = sanitizeTimesheetNamePart(employeeCode) || 'employee';
  const name = sanitizeTimesheetNamePart(employeeName) || 'name';
  const month = String(targetMonth ?? '').trim() || '0000-00';
  return `勤務表_${code}_${name}_${month}.xlsx`;
}

export function extractEmployeeNameFromFilename(fileName) {
  const baseName = String(fileName ?? '').replace(/\.[^.]+$/, '');
  const oldMatch = baseName.match(OLD_TIMESHEET_FILENAME_PATTERN);
  if (oldMatch) return oldMatch[2];
  const newMatch = baseName.match(NEW_TIMESHEET_FILENAME_PATTERN);
  if (newMatch) return newMatch[1];
  return null;
}

export function extractEmployeeCodeFromFilename(fileName) {
  const baseName = String(fileName ?? '').replace(/\.[^.]+$/, '');
  const oldMatch = baseName.match(OLD_TIMESHEET_FILENAME_PATTERN);
  if (oldMatch) return oldMatch[1].toUpperCase();
  const match = baseName.match(EMPLOYEE_CODE_FILENAME_PATTERN);
  if (match) return match[1].toUpperCase();
  const loose = baseName.match(/(E\d+)/i);
  return loose ? loose[1].toUpperCase() : null;
}

export function extractTargetMonthFromFilename(fileName) {
  const baseName = String(fileName ?? '').replace(/\.[^.]+$/, '');
  const oldMatch = baseName.match(OLD_TIMESHEET_FILENAME_PATTERN);
  if (oldMatch) return oldMatch[3];
  const newMatch = baseName.match(NEW_TIMESHEET_FILENAME_PATTERN);
  if (newMatch) return newMatch[2];
  const monthMatch = baseName.match(/(\d{4}-\d{2})/);
  return monthMatch ? monthMatch[1] : null;
}

export function timesheetFileMatchesEmployee(fileName, employee) {
  if (!employee) return true;
  const code = extractEmployeeCodeFromFilename(fileName);
  if (code && employee.employeeCode && code === employee.employeeCode.toUpperCase()) {
    return true;
  }
  const nameFromFile = extractEmployeeNameFromFilename(fileName);
  const employeeName = String(employee.employeeName ?? employee.name ?? '').trim();
  if (nameFromFile && employeeName && nameFromFile === employeeName) {
    return true;
  }
  const base = String(fileName ?? '').toLowerCase();
  const employeeCode = String(employee.employeeCode ?? '').toLowerCase();
  const nameLower = employeeName.toLowerCase();
  if (employeeCode && base.includes(employeeCode)) return true;
  if (nameLower && base.includes(nameLower)) return true;
  return false;
}

function parseInteger(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).replace(/[%％日物件]/g, '').trim();
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function countBusinessDaysInMonth(year, month) {
  return countWorkdaysInMonth(year, month);
}

function isLateEarlyRemarks(remarks) {
  return /遅刻|早退|迟到/.test(String(remarks ?? ''));
}

function parseDatePartsFromIso(date) {
  const [y, m, d] = String(date ?? '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function isWeekdayDateParts(parts) {
  const dow = new Date(parts.y, parts.m - 1, parts.d).getDay();
  return dow !== 0 && dow !== 6;
}

/** 欠勤・休日・祝日は出勤日に含めない */
function isUnpaidAbsenceRemarks(remarks) {
  return /欠勤|旷工|缺席/.test(String(remarks ?? ''));
}

/** 備考に有給系の記載があるか */
export function isPaidLeaveRemarks(remarks) {
  const text = String(remarks ?? '');
  if (/祝日|休日|休み/.test(text)) return false;
  return /有給|年休|带薪|特別休暇|慶弔休暇/.test(text);
}

function hasWorkTimeRange(row) {
  const start = String(row?.startTime ?? '').trim();
  const end = String(row?.endTime ?? '').trim();
  return Boolean(start) && Boolean(end);
}

/** 実勤務：開始・終了時刻あり、かつ備考に有給系の記載なし */
export function isActualWorkDay(row) {
  if (!row || isUnpaidAbsenceRemarks(row.remarks)) return false;
  if (isPaidLeaveRemarks(row.remarks)) return false;
  return hasWorkTimeRange(row);
}

/** 平日有給（出勤率分子のみ。実勤務には含めない） */
export function isPaidLeaveAttendanceDay(row) {
  if (!row || isUnpaidAbsenceRemarks(row.remarks)) return false;
  if (!isPaidLeaveRemarks(row.remarks)) return false;
  const parts = parseDatePartsFromIso(row.date);
  return parts ? isWeekdayDateParts(parts) : false;
}

/** 出勤率の分子：実勤務 + 平日有給 */
export function isAttendanceDay(row) {
  return isActualWorkDay(row) || isPaidLeaveAttendanceDay(row);
}

export function countAttendanceDays(rows) {
  return (rows ?? []).filter(isAttendanceDay).length;
}

export function countActualWorkDays(rows) {
  return (rows ?? []).filter(isActualWorkDay).length;
}

export function summarizeAttendanceBreakdown(rows) {
  const actualWorkDays = countActualWorkDays(rows);
  const paidLeaveDays = (rows ?? []).filter(isPaidLeaveAttendanceDay).length;
  const total = actualWorkDays + paidLeaveDays;
  return { total, actualWorkDays, paidLeaveDays };
}

function parseWorkHours(value) {
  const hours = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(hours) ? Math.round(hours * 10) / 10 : 0;
}

function filterRecordsForTargetMonth(records, targetMonth) {
  if (!targetMonth) return records;
  return records.filter((row) => row.date && String(row.date).startsWith(targetMonth));
}

function parseRestHours(value) {
  const hours = parseWorkHours(value);
  return hours > 0 ? hours : null;
}

export function summarizeAttendanceRows(rows) {
  const workDays = countAttendanceDays(rows);
  const workHours = rows.reduce((sum, row) => sum + (Number(row.workHours) || 0), 0);
  return {
    workDays: workDays > 0 ? workDays : null,
    workHours: workHours > 0 ? Math.round(workHours * 10) / 10 : null,
  };
}

export function buildDailyRecordsFromParsed(records, targetMonth) {
  return filterRecordsForTargetMonth(records, targetMonth)
    .filter((row) => row.date)
    .map((row) => ({
      date: row.date,
      clientName: row.clientName || '',
      startTime: formatTimeCellValue(row.startTime),
      endTime: formatTimeCellValue(row.endTime),
      restTime: parseRestHours(row.restTime),
      workHours: parseWorkHours(row.workHours),
      remarks: row.remarks || '',
      lateEarly: isLateEarlyRemarks(row.remarks) || parseInteger(row.lateEarlyCount) === 1,
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function computeAttendanceFromRecords(records, targetMonth) {
  const monthRecords = filterRecordsForTargetMonth(records, targetMonth);
  let lateEarlyCount = 0;
  let explicitRate = null;
  let explicitLate = null;
  let explicitPaidLeave = null;

  for (const row of monthRecords) {
    if (isLateEarlyRemarks(row.remarks)) lateEarlyCount += 1;

    const rowRate = parseInteger(row.attendanceRate);
    // 集計行のみ（日付なし）の明示出勤率を採用。日別行の誤マッピングを避ける
    if (rowRate != null && !String(row.date ?? '').trim()) {
      explicitRate = Math.max(0, Math.min(100, rowRate));
    }

    const rowLate = parseInteger(row.lateEarlyCount);
    if (rowLate != null) explicitLate = Math.max(0, rowLate);

    const rowPaidLeave = parseInteger(row.paidLeaveRemaining);
    if (rowPaidLeave != null) explicitPaidLeave = Math.max(0, rowPaidLeave);
  }

  const dailyRecords = buildDailyRecordsFromParsed(monthRecords, targetMonth);
  const { workDays, workHours } = summarizeAttendanceRows(dailyRecords);

  let attendanceRate = explicitRate;
  if (attendanceRate == null) {
    const [yearText, monthText] = String(targetMonth ?? '').split('-');
    const year = Number.parseInt(yearText, 10);
    const month = Number.parseInt(monthText, 10);
    const businessDays = year && month ? countBusinessDaysInMonth(year, month) : 0;
    const daysForRate = countAttendanceDays(dailyRecords);
    attendanceRate = businessDays > 0
      ? Math.min(100, Math.round((daysForRate * 100) / businessDays))
      : (daysForRate > 0 ? 100 : 0);
  }

  const computedLate = dailyRecords.filter((row) => row.lateEarly).length;

  return {
    attendanceRate,
    lateEarlyCount: explicitLate ?? (lateEarlyCount > 0 ? lateEarlyCount : computedLate),
    paidLeaveRemaining: explicitPaidLeave,
    workDays,
    workHours,
    dailyRecords,
  };
}

const PARSEABLE_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);

export function isTimesheetParseableFile(fileName) {
  const ext = String(fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
  return PARSEABLE_EXTENSIONS.has(ext);
}

export async function buildAttendanceUpdatesForFiles(files, targetMonth) {
  const updates = [];
  const warnings = [];

  for (const file of files) {
    if (!isTimesheetParseableFile(file.name)) {
      warnings.push({ fileName: file.name, message: 'Excel/CSV 以外のため勤怠反映をスキップします' });
      continue;
    }

    let employeeCode = extractEmployeeCodeFromFilename(file.name);
    let employeeName = extractEmployeeNameFromFilename(file.name);
    try {
      const parsed = await parseTimesheetFile(file, targetMonth);
      if (!employeeName) {
        employeeName = parsed.meta?.employeeName
          || parsed.records.map((row) => row.employeeName).find(Boolean)
          || null;
      }
      if (!employeeCode) {
        employeeCode = parsed.records.map((row) => row.employeeCode).find(Boolean) ?? null;
        if (employeeCode) employeeCode = employeeCode.toUpperCase();
      }
      if (!employeeCode && !employeeName) {
        warnings.push({ fileName: file.name, message: 'ファイル名または内容から氏名を特定できません' });
        continue;
      }

      const metrics = computeAttendanceFromRecords(parsed.records, targetMonth);
      updates.push({
        fileName: file.name,
        employeeCode: employeeCode ?? '',
        employeeName: employeeName ?? '',
        attendanceRate: metrics.attendanceRate,
        lateEarlyCount: metrics.lateEarlyCount,
        paidLeaveRemaining: metrics.paidLeaveRemaining,
        workDays: metrics.workDays,
        workHours: metrics.workHours,
        dailyRecords: metrics.dailyRecords,
      });
    } catch (error) {
      warnings.push({
        fileName: file.name,
        message: error.message || '勤務表の解析に失敗しました',
      });
    }
  }

  return { updates, warnings };
}
