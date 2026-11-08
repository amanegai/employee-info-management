import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { evaluationClass, formatUnitPrice, workStatusClass, EMPTY_DISPLAY } from '../utils';

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

  const colSpan = canDelete ? 12 : 11;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <div className="employee-list-table-wrap">
      <table className="table table-hover table-striped align-middle text-center mb-0 employee-list-table">
        <colgroup>
          <col className="employee-list-col-checkbox" />
          <col className="employee-list-col-id" />
          <col className="employee-list-col-name" />
          <col className="employee-list-col-kana" />
          <col className="employee-list-col-company" />
          <col className="employee-list-col-dept" />
          <col className="employee-list-col-position" />
          <col className="employee-list-col-type" />
          <col className="employee-list-col-status" />
          <col className="employee-list-col-price" />
          <col className="employee-list-col-eval" />
          {canDelete && <col className="employee-list-col-action" />}
        </colgroup>
        <thead className="table-light">
          <tr>
            <th className="employee-list-checkbox-col">
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
            <th>社員ID</th>
            <th>社員名</th>
            <th>社員名カナ</th>
            <th>所属会社</th>
            <th>所属部門</th>
            <th>役職</th>
            <th>社員種別</th>
            <th>稼働状況</th>
            <th>請求単価</th>
            <th>評価</th>
            {canDelete && <th className="employee-list-action-col">操作</th>}
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
            employees.map((emp) => (
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
                  className="employee-list-checkbox-col"
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
                <td className="employee-list-cell-text text-muted small" title={emp.employeeCode || ''}>
                  {emp.employeeCode || '—'}
                </td>
                <td className="employee-list-cell-text fw-semibold" title={emp.name}>
                  {emp.name}
                </td>
                <td className="employee-list-cell-text text-muted" title={emp.nameKana || ''}>
                  {emp.nameKana || '—'}
                </td>
                <td className="small employee-list-cell-text" title={emp.affiliationCompany || ''}>
                  {emp.affiliationCompany || '—'}
                </td>
                <td className="small employee-list-cell-text" title={emp.departmentName}>{emp.departmentName}</td>
                <td className="employee-list-cell-text" title={emp.position}>
                  {emp.position || EMPTY_DISPLAY}
                </td>
                <td>
                  <span className="badge rounded-pill text-bg-light border">{emp.employeeType}</span>
                </td>
                <td>
                  <span className={`badge status-badge ${workStatusClass(emp.workStatus)}`}>
                    {emp.workStatus}
                  </span>
                </td>
                <td className="unit-price">{formatUnitPrice(emp.unitPrice)}</td>
                <td>
                  <span className={`badge eval-badge ${evaluationClass(emp.evaluation)}`}>
                    {emp.evaluation || EMPTY_DISPLAY}
                  </span>
                </td>
                {canDelete && (
                  <td
                    className="employee-list-action-col"
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
            ))}
        </tbody>
      </table>
    </div>
  );
}
