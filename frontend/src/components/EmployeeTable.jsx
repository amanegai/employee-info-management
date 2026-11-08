import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  evaluationClass,
  formatEmployeeUpdatedAt,
  formatUnitPrice,
  workStatusClass,
  EMPTY_DISPLAY,
} from '../utils';

function employeeNameTitle(emp) {
  const kana = emp.nameKana ? String(emp.nameKana).trim() : '';
  return kana ? `${emp.name}（${kana}）` : emp.name;
}

function displayOrEmpty(value) {
  const text = value != null ? String(value).trim() : '';
  return text && text !== EMPTY_DISPLAY ? text : EMPTY_DISPLAY;
}

export default function EmployeeTable({
  employees,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  deletingId,
  canDelete = true,
}) {
  const navigate = useNavigate();
  const selectAllRef = useRef(null);

  const visibleIds = employees.map((emp) => emp.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = employees.length > 0 && selectedVisibleCount === employees.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;

  const colSpan = canDelete ? 11 : 10;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <div className="employee-list-table-wrap">
      <table className="table table-hover table-striped align-middle mb-0 employee-list-table">
        <colgroup>
          <col className="employee-list-col-checkbox" />
          <col className="employee-list-col-person" />
          <col className="employee-list-col-company" />
          <col className="employee-list-col-dept" />
          <col className="employee-list-col-position" />
          <col className="employee-list-col-type" />
          <col className="employee-list-col-status" />
          <col className="employee-list-col-price" />
          <col className="employee-list-col-eval" />
          <col className="employee-list-col-audit" />
          {canDelete && <col className="employee-list-col-action" />}
        </colgroup>
        <thead className="table-light">
          <tr>
            <th className="employee-list-checkbox-col text-center">
              <input
                ref={selectAllRef}
                type="checkbox"
                className="form-check-input"
                checked={allSelected}
                disabled={loading || employees.length === 0}
                aria-label="表示中の社員をすべて選択"
                onChange={(e) => onToggleSelectAll(e.target.checked)}
              />
            </th>
            <th className="text-start">社員</th>
            <th className="text-center">所属会社</th>
            <th className="text-center">所属部門</th>
            <th className="text-center">役職</th>
            <th className="text-center">社員種別</th>
            <th className="text-center">稼働状況</th>
            <th className="text-center">請求単価</th>
            <th className="text-center">評価</th>
            <th className="text-center">最終更新</th>
            {canDelete && <th className="employee-list-action-col text-center">操作</th>}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={colSpan} className="text-center text-muted py-4">
                読み込み中…
              </td>
            </tr>
          )}
          {!loading && employees.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="text-center text-muted py-4">
                該当する社員がいません
              </td>
            </tr>
          )}
          {!loading &&
            employees.map((emp) => {
              const nameTitle = employeeNameTitle(emp);
              const kana = emp.nameKana ? String(emp.nameKana).trim() : '';
              const code = emp.employeeCode ? String(emp.employeeCode).trim() : '';
              const companyLabel = displayOrEmpty(emp.affiliationCompany);
              const departmentLabel = displayOrEmpty(emp.departmentName);
              const positionLabel = displayOrEmpty(emp.position);
              const updatedAt = formatEmployeeUpdatedAt(emp.updatedAt);
              const updater = emp.updatedByName || '';
              return (
                <tr
                  key={emp.id}
                  className="employee-row-clickable"
                  onClick={() =>
                    navigate(`/employees/${emp.id}`, {
                      state: { from: '/employees', fromLabel: '一覧に戻る' },
                    })
                  }
                  title="クリックで詳細を表示"
                >
                  <td
                    className="employee-list-checkbox-col text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedIds.has(emp.id)}
                      aria-label={`${emp.employeeCode} ${emp.name} を選択`}
                      onChange={() => onToggleSelect(emp.id)}
                    />
                  </td>
                  <td className="employee-list-cell-stack text-start">
                    <div className="employee-list-cell-primary employee-list-name-line" title={nameTitle}>
                      <span className="employee-list-name">{emp.name}</span>
                      {kana ? <span className="employee-list-kana">（{kana}）</span> : null}
                    </div>
                    {code ? (
                      <div className="employee-list-cell-secondary" title={code}>
                        {code}
                      </div>
                    ) : null}
                  </td>
                  <td className="text-center employee-list-cell-text" title={companyLabel}>
                    {companyLabel}
                  </td>
                  <td className="text-center employee-list-cell-text" title={departmentLabel}>
                    {departmentLabel}
                  </td>
                  <td className="text-center employee-list-cell-text" title={positionLabel}>
                    {positionLabel}
                  </td>
                  <td className="text-center">
                    <span className="badge rounded-pill text-bg-light border">{emp.employeeType}</span>
                  </td>
                  <td className="text-center">
                    <span className={`badge status-badge ${workStatusClass(emp.workStatus)}`}>
                      {emp.workStatus}
                    </span>
                  </td>
                  <td className="unit-price text-center">{formatUnitPrice(emp.unitPrice)}</td>
                  <td className="text-center">
                    <span className={`badge eval-badge ${evaluationClass(emp.evaluation)}`}>
                      {emp.evaluation || EMPTY_DISPLAY}
                    </span>
                  </td>
                  <td className="employee-list-cell-stack text-center">
                    <div
                      className="employee-list-cell-primary employee-list-cell-audit-time"
                      title={emp.updatedAt || ''}
                    >
                      {updatedAt || '—'}
                    </div>
                    <div
                      className="employee-list-cell-secondary"
                      title={updater || '最終更新者未設定'}
                    >
                      {updater || '—'}
                    </div>
                  </td>
                  {canDelete && (
                    <td
                      className="employee-list-action-col text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={deletingId === emp.id}
                        aria-label={`${emp.employeeCode} ${emp.name} を削除`}
                        onClick={() => onDelete?.(emp)}
                      >
                        <i className="bi bi-trash" aria-hidden="true" />
                        {deletingId === emp.id ? '削除中…' : '削除'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
