import * as XLSX from 'xlsx';

const EXPENSE_APPLICATION_FILENAME_PATTERN =
  /^申請書_(E\d{3,})_([^_]+)_経費申請_(\d{4}-\d{2})$/i;

const PARSEABLE_EXTENSIONS = new Set(['xlsx', 'xls']);

function sanitizeNamePart(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ');
}

export function buildExpenseApplicationFileName(employeeCode, employeeName, targetMonth) {
  const code = sanitizeNamePart(employeeCode) || 'employee';
  const name = sanitizeNamePart(employeeName) || 'name';
  const month = String(targetMonth ?? '').trim() || '0000-00';
  return `申請書_${code}_${name}_経費申請_${month}.xlsx`;
}

export function isExpenseApplicationFileName(fileName) {
  const baseName = String(fileName ?? '').replace(/\.[^.]+$/, '');
  return EXPENSE_APPLICATION_FILENAME_PATTERN.test(baseName);
}

export function isExpenseApplicationParseableFile(fileName) {
  const ext = String(fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
  return PARSEABLE_EXTENSIONS.has(ext);
}

export function parseExpenseApplicationFileName(fileName) {
  const baseName = String(fileName ?? '').replace(/\.[^.]+$/, '');
  const match = baseName.match(EXPENSE_APPLICATION_FILENAME_PATTERN);
  if (!match) return null;
  return {
    employeeCode: match[1].toUpperCase(),
    employeeName: match[2],
    targetMonth: match[3],
  };
}

function parseAmount(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const cleaned = String(value).replace(/[¥￥,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function sheetToRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
}

function findExpenseSheetName(workbook, exactNames, keyword) {
  const names = workbook.SheetNames.map((name) => String(name).trim());
  for (const exactName of exactNames) {
    const match = names.find((name) => name === exactName);
    if (match) return match;
  }
  for (const name of names) {
    const rows = sheetToRows(workbook.Sheets[name]);
    if (findHeaderRowIndex(rows) >= 0) {
      return name;
    }
  }
  return (
    names.find((name) => {
      const normalized = String(name).trim();
      return normalized.includes(keyword) && !normalized.includes('会議');
    }) ?? null
  );
}

function parseTargetMonthFromRows(rows) {
  for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
    const row = rows[i] ?? [];
    const line = row.map((cell) => String(cell ?? '')).join(' ');
    const jp = line.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
    if (jp) {
      return `${jp[1]}-${String(Number(jp[2])).padStart(2, '0')}`;
    }
  }
  return '';
}

function parseEmployeeNameFromRows(rows) {
  for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
    const row = rows[i] ?? [];
    for (let j = 0; j < row.length - 1; j += 1) {
      const label = String(row[j] ?? '').trim();
      if (label === '氏名') {
        const value = String(row[j + 1] ?? '').trim();
        if (value) return value;
      }
    }
  }
  return '';
}

function findHeaderRowIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const joined = (rows[i] ?? []).map((cell) => String(cell ?? '')).join(' ');
    if (joined.includes('経費種別') && joined.includes('経費')) {
      return i;
    }
  }
  return -1;
}

function mapExpenseHeaderRow(headerRow) {
  const mapping = { expenseType: -1, amount: -1 };
  headerRow.forEach((cell, index) => {
    const text = String(cell ?? '').trim();
    if (!text) return;
    if (text.includes('経費種別')) mapping.expenseType = index;
    if (text === '経費' || (text.includes('経費') && !text.includes('種別'))) {
      mapping.amount = index;
    }
  });
  return mapping;
}

function findAmountInRow(row, preferredIndex) {
  if (preferredIndex >= 0 && row[preferredIndex] != null && row[preferredIndex] !== '') {
    const amount = parseAmount(row[preferredIndex]);
    if (amount > 0) return amount;
  }
  for (let i = row.length - 1; i >= 0; i -= 1) {
    const amount = parseAmount(row[i]);
    if (amount > 0) return amount;
  }
  return 0;
}

function parseTransportSheet(rows) {
  const headerIndex = findHeaderRowIndex(rows);
  if (headerIndex < 0) {
    throw new Error('交通費シートに表ヘッダ（経費種別・経費）が見つかりません');
  }

  const mapping = mapExpenseHeaderRow(rows[headerIndex] ?? []);
  if (mapping.expenseType < 0 || mapping.amount < 0) {
    throw new Error('交通費シートの列（経費種別・経費）を特定できません');
  }

  let periodicPassAllowance = 0;
  let individualTotal = 0;
  let transportGrandTotal = 0;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const joined = row.map((cell) => String(cell ?? '')).join('');
    if (!joined.trim()) continue;

    if (joined.includes('総会計')) {
      transportGrandTotal = findAmountInRow(row, mapping.amount);
      continue;
    }

    const expenseType = String(row[mapping.expenseType] ?? '').trim();
    const amount = findAmountInRow(row, mapping.amount);
    if (!expenseType || amount <= 0) continue;

    if (expenseType.includes('定期券')) {
      periodicPassAllowance += amount;
    } else if (expenseType.includes('個別交通費')) {
      individualTotal += amount;
    }
  }

  let commuterIndividualAllowance =
    transportGrandTotal > 0 ? transportGrandTotal - periodicPassAllowance : individualTotal;

  if (commuterIndividualAllowance < 0) {
    throw new Error('交通費の総会計が定期券より小さい値になっています');
  }

  const warnings = [];
  if (
    transportGrandTotal > 0 &&
    individualTotal > 0 &&
    Math.abs(commuterIndividualAllowance - individualTotal) > 1
  ) {
    warnings.push(
      `個別交通費の合計（${individualTotal.toLocaleString()}）と総会計−定期券（${commuterIndividualAllowance.toLocaleString()}）が一致しません。総会計ベースで通勤手当を算出します。`
    );
  }

  return {
    periodicPassAllowance,
    commuterIndividualAllowance,
    transportGrandTotal,
    warnings,
  };
}

function parseBusinessSheet(rows) {
  const headerIndex = findHeaderRowIndex(rows);
  if (headerIndex < 0) {
    throw new Error('営業費シートに表ヘッダ（経費種別・経費）が見つかりません');
  }

  const mapping = mapExpenseHeaderRow(rows[headerIndex] ?? []);
  if (mapping.amount < 0) {
    throw new Error('営業費シートの経費列を特定できません');
  }

  let businessGrandTotal = 0;
  let detailTotal = 0;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const joined = row.map((cell) => String(cell ?? '')).join('');
    if (!joined.trim()) continue;

    if (joined.includes('総会計')) {
      businessGrandTotal = findAmountInRow(row, mapping.amount);
      continue;
    }

    const expenseType = mapping.expenseType >= 0 ? String(row[mapping.expenseType] ?? '').trim() : '';
    const amount = findAmountInRow(row, mapping.amount);
    if (amount <= 0) continue;
    if (!expenseType || expenseType.includes('営業') || expenseType.includes('会議')) {
      detailTotal += amount;
    }
  }

  const businessExpenseAllowance = businessGrandTotal > 0 ? businessGrandTotal : detailTotal;
  const warnings = [];
  if (businessGrandTotal > 0 && detailTotal > 0 && Math.abs(businessGrandTotal - detailTotal) > 1) {
    warnings.push(
      `営業費明細合計（${detailTotal.toLocaleString()}）と総会計（${businessGrandTotal.toLocaleString()}）が一致しません。総会計を採用します。`
    );
  }

  return { businessExpenseAllowance, warnings };
}

export async function parseExpenseApplicationFile(file) {
  const fileMeta = parseExpenseApplicationFileName(file.name);
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const transportSheetName = findExpenseSheetName(workbook, ['交通費'], '交通');
  const businessSheetName = findExpenseSheetName(workbook, ['営業費'], '営業');

  if (!transportSheetName) {
    throw new Error('交通費シートが見つかりません');
  }
  if (!businessSheetName) {
    throw new Error('営業費シートが見つかりません');
  }

  const transportRows = sheetToRows(workbook.Sheets[transportSheetName]);
  const businessRows = sheetToRows(workbook.Sheets[businessSheetName]);

  const transport = parseTransportSheet(transportRows);
  const business = parseBusinessSheet(businessRows);

  const targetMonthFromSheet =
    parseTargetMonthFromRows(transportRows) || parseTargetMonthFromRows(businessRows);
  const employeeNameFromSheet =
    parseEmployeeNameFromRows(transportRows) || parseEmployeeNameFromRows(businessRows);

  const targetMonth = fileMeta?.targetMonth || targetMonthFromSheet;
  if (!targetMonth) {
    throw new Error('対象年月をファイル名または Excel から読み取れません');
  }

  if (fileMeta?.targetMonth && targetMonthFromSheet && fileMeta.targetMonth !== targetMonthFromSheet) {
    throw new Error(
      `ファイル名の対象月（${fileMeta.targetMonth}）と Excel 内の年月（${targetMonthFromSheet}）が一致しません`
    );
  }

  return {
    fileName: file.name,
    employeeCode: fileMeta?.employeeCode ?? '',
    employeeName: fileMeta?.employeeName || employeeNameFromSheet || '',
    targetMonth,
    periodicPassAllowance: transport.periodicPassAllowance,
    commuterIndividualAllowance: transport.commuterIndividualAllowance,
    businessExpenseAllowance: business.businessExpenseAllowance,
    transportGrandTotal: transport.transportGrandTotal,
    warnings: [...transport.warnings, ...business.warnings],
  };
}

export async function buildExpenseUpdatesForFiles(files) {
  const updates = [];
  const warnings = [];

  for (const file of files) {
    if (!isExpenseApplicationParseableFile(file.name)) {
      warnings.push({ fileName: file.name, message: 'Excel 以外のため経費反映をスキップします' });
      continue;
    }
    if (!isExpenseApplicationFileName(file.name)) {
      warnings.push({
        fileName: file.name,
        message: 'ファイル名が「申請書_社員ID_氏名_経費申請_年-月.xlsx」形式ではありません',
      });
      continue;
    }

    try {
      const parsed = await parseExpenseApplicationFile(file);
      if (!parsed.employeeCode && !parsed.employeeName) {
        warnings.push({ fileName: file.name, message: '社員IDまたは氏名を特定できません' });
        continue;
      }
      parsed.warnings.forEach((message) => {
        warnings.push({ fileName: file.name, message });
      });
      updates.push({
        fileName: parsed.fileName,
        employeeCode: parsed.employeeCode,
        employeeName: parsed.employeeName,
        targetMonth: parsed.targetMonth,
        periodicPassAllowance: parsed.periodicPassAllowance,
        commuterIndividualAllowance: parsed.commuterIndividualAllowance,
        businessExpenseAllowance: parsed.businessExpenseAllowance,
      });
    } catch (error) {
      warnings.push({
        fileName: file.name,
        message: error.message || '経費申請書の解析に失敗しました',
      });
    }
  }

  return { updates, warnings };
}

export function resolveMonthlyExpense(employee, targetMonth) {
  const list = employee?.monthlyExpenses ?? [];
  if (!targetMonth) return list[0] ?? null;
  return list.find((item) => item.targetMonth === targetMonth) ?? null;
}

export function resolveLatestMonthlyExpense(employee) {
  const list = employee?.monthlyExpenses ?? [];
  return list.length > 0 ? list[0] : null;
}
