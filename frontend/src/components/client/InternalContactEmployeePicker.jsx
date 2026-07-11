import { useMemo, useState } from 'react';

function employeeInitial(name) {
  const t = String(name ?? '').trim();
  return t ? t.charAt(0) : '?';
}

/**
 * @param {object} props
 * @param {Array<{ id: number, employeeCode?: string, name?: string, departmentName?: string, position?: string }>} props.employees
 * @param {string} props.value employeeId or ''
 * @param {string[]} props.reservedEmployeeIds selected in other担当 rows
 * @param {(employeeId: string) => void} props.onSelect
 */
export default function InternalContactEmployeePicker({
  employees,
  value,
  reservedEmployeeIds = [],
  onSelect,
}) {
  const [query, setQuery] = useState('');
  const reservedSet = useMemo(
    () => new Set(reservedEmployeeIds.map(String)),
    [reservedEmployeeIds]
  );

  const filteredEmployees = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return employees;
    return employees.filter((emp) => {
      const haystack = [emp.name, emp.employeeCode, emp.departmentName, emp.position]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [employees, query]);

  const manualSelected = !value;

  return (
    <div className="client-internal-contact-employee-picker">
      <div className="client-internal-contact-employee-picker-toolbar">
        <div className="client-internal-contact-employee-picker-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="氏名・社員番号・部署で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="社員を検索"
          />
        </div>
        {query ? (
          <button
            type="button"
            className="btn btn-link btn-sm client-internal-contact-employee-picker-clear"
            onClick={() => setQuery('')}
          >
            検索をクリア
          </button>
        ) : null}
      </div>

      <p className="client-form-contact-field-hint mb-2">
        選択可能：営業部の社員、または代理部長相当以上。他の担当者で選んだ社員はここでは選べません。
      </p>

      <div
        className="client-internal-contact-employee-picker-grid"
        role="listbox"
        aria-label="社員を選択"
      >
        <button
          type="button"
          role="option"
          aria-selected={manualSelected}
          className={`client-internal-contact-employee-card client-internal-contact-employee-card--manual${manualSelected ? ' is-selected' : ''}`}
          onClick={() => onSelect('')}
        >
          <span className="client-internal-contact-employee-card-avatar" aria-hidden="true">
            <i className="bi bi-pencil-square" />
          </span>
          <span className="client-internal-contact-employee-card-body">
            <strong>手入力</strong>
            <span className="client-internal-contact-employee-card-meta">社員マスタ未連携</span>
          </span>
          {manualSelected ? (
            <i className="bi bi-check-circle-fill client-internal-contact-employee-card-check" aria-hidden="true" />
          ) : null}
        </button>

        {employees.length === 0 ? (
          <p className="client-internal-contact-employee-picker-empty">選択可能な社員がありません。</p>
        ) : filteredEmployees.length === 0 ? (
          <p className="client-internal-contact-employee-picker-empty">検索条件に一致する社員がいません。</p>
        ) : (
          filteredEmployees.map((emp) => {
            const id = String(emp.id);
            const selected = value === id;
            const reserved = reservedSet.has(id) && !selected;
            const meta = [emp.employeeCode, emp.departmentName, emp.position].filter(Boolean).join(' · ');

            return (
              <button
                key={emp.id}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={reserved}
                disabled={reserved}
                title={reserved ? '他の担当者で選択済みです' : undefined}
                className={`client-internal-contact-employee-card${selected ? ' is-selected' : ''}${reserved ? ' is-reserved' : ''}`}
                onClick={() => {
                  if (reserved) return;
                  onSelect(selected ? '' : id);
                }}
              >
                <span className="client-internal-contact-employee-card-avatar" aria-hidden="true">
                  {employeeInitial(emp.name)}
                </span>
                <span className="client-internal-contact-employee-card-body">
                  <strong>{emp.name}</strong>
                  <span className="client-internal-contact-employee-card-meta">{meta || '—'}</span>
                </span>
                {reserved ? (
                  <span className="client-internal-contact-employee-card-reserved">選択済</span>
                ) : null}
                {selected ? (
                  <i
                    className="bi bi-check-circle-fill client-internal-contact-employee-card-check"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
