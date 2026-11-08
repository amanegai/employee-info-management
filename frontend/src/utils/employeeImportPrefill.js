/** 履歴書インポートのプレフィル（history state は容量制限があるため sessionStorage 経由） */
export const EMPLOYEE_IMPORT_PREFILL_KEY = 'employeeImportPrefill';
export const EMPLOYEE_IMPORT_BATCH_KEY = 'employeeImportBatch';

export function stashEmployeeImportPrefill(form) {
  if (!form) return;
  sessionStorage.setItem(EMPLOYEE_IMPORT_PREFILL_KEY, JSON.stringify(form));
}

/** 参照のみ（Strict Mode 二重マウントでも消えない） */
export function readEmployeeImportPrefill() {
  const raw = sessionStorage.getItem(EMPLOYEE_IMPORT_PREFILL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearEmployeeImportPrefill() {
  sessionStorage.removeItem(EMPLOYEE_IMPORT_PREFILL_KEY);
}

/**
 * 履歴書確認画面用バッチ
 * @param {Array<{ localId: string, fileName: string, form?: object, parseError?: string }>} items
 */
export function stashEmployeeImportBatch(items) {
  if (!items?.length) return;
  sessionStorage.setItem(EMPLOYEE_IMPORT_BATCH_KEY, JSON.stringify(items));
}

export function readEmployeeImportBatch() {
  const raw = sessionStorage.getItem(EMPLOYEE_IMPORT_BATCH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearEmployeeImportBatch() {
  sessionStorage.removeItem(EMPLOYEE_IMPORT_BATCH_KEY);
}
