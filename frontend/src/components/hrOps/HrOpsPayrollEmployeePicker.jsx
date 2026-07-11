import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import {
  filterDepartmentsByScope,
  filterEmployeesByUserScope,
  resolveSearchDepartmentScope,
} from '../../auth';
import { useAuth } from '../../context/AuthContext';
import { useAppMessage } from '../../context/MessageContext';
import { excludeParentDepartments, filterEmployeesByDepartmentScope, workStatusClass } from '../../utils';

function employeeInitial(name) {
  const trimmed = String(name ?? '').trim();
  return trimmed ? trimmed.charAt(0) : '?';
}

export default function HrOpsPayrollEmployeePicker({ value, onChange, disabled = false, embedded = false }) {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const [master, setMaster] = useState(null);
  const [departmentId, setDepartmentId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const visibleDepartments = useMemo(
    () => excludeParentDepartments(filterDepartmentsByScope(master?.departments ?? [], user)),
    [master, user]
  );

  const loadEmployees = useCallback(async () => {
    if (!user || !departmentId) {
      setEmployees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const departments = master?.departments ?? [];
      const deptScope = resolveSearchDepartmentScope(user, departments, departmentId);
      if (deptScope && deptScope.length === 0) {
        setEmployees([]);
        return;
      }
      const data = await api.searchEmployees({
        departmentId: deptScope?.length === 1 ? deptScope[0] : undefined,
      });
      let result =
        deptScope && deptScope.length > 1
          ? filterEmployeesByDepartmentScope(data, deptScope)
          : data;
      result = filterEmployeesByUserScope(result, user, departments);
      setEmployees(result.filter((emp) => emp.workStatus !== '退職'));
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [user, master, departmentId, showMessage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const masterData = await api.getMaster();
        if (!cancelled) setMaster(masterData);
      } catch (e) {
        if (!cancelled) showMessage(e.message, 'danger');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showMessage]);

  useEffect(() => {
    if (!master || !user) return;
    loadEmployees();
  }, [master, user, loadEmployees]);

  useEffect(() => {
    if (value) return;
    setDepartmentId('');
    setQuery('');
  }, [value]);

  const filteredEmployees = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return employees;
    return employees.filter((emp) => {
      const haystack = [emp.name, emp.employeeCode, emp.position, emp.departmentName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [employees, query]);

  function handleDepartmentChange(nextDepartmentId) {
    setDepartmentId(nextDepartmentId);
    setQuery('');
    onChange('');
  }

  return (
    <div className={`payroll-employee-picker${embedded ? ' is-embedded' : ''}`}>
      <div className="payroll-picker-step">
        <div className="payroll-picker-step-label">
          {!embedded && <span className="payroll-picker-step-no">1</span>}
          部署を選択
        </div>
        <select
          id="payrollDepartmentId"
          className="form-select payroll-picker-select"
          value={departmentId}
          onChange={(e) => handleDepartmentChange(e.target.value)}
          disabled={disabled || !master}
        >
          <option value="">部署を選択してください</option>
          {visibleDepartments.map((dept) => (
            <option key={dept.id} value={String(dept.id)}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      <div className={`payroll-picker-step${!departmentId ? ' is-disabled' : ''}`}>
        <div className="payroll-picker-step-label">
          {!embedded && <span className="payroll-picker-step-no">2</span>}
          対象社員を選択
        </div>

        {!departmentId ? (
          <div className="payroll-picker-placeholder">
            <i className="bi bi-building" aria-hidden="true" />
            <p className="mb-0">先に部署を選択してください</p>
          </div>
        ) : (
          <>
            <div className="payroll-picker-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                className="form-control"
                placeholder="氏名・社員番号で検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={disabled || loading}
              />
            </div>

            {loading ? (
              <div className="payroll-picker-loading">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
                <span>社員を読み込み中…</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="payroll-picker-placeholder">
                <i className="bi bi-person-x" aria-hidden="true" />
                <p className="mb-0">該当する社員がいません</p>
              </div>
            ) : (
              <div className="payroll-employee-grid" role="listbox" aria-label="対象社員">
                {filteredEmployees.map((emp) => {
                  const selected = String(emp.id) === value;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`payroll-employee-card${selected ? ' is-selected' : ''}`}
                      onClick={() => onChange(String(emp.id))}
                      disabled={disabled}
                    >
                      <span className="payroll-employee-card-avatar" aria-hidden="true">
                        {employeeInitial(emp.name)}
                      </span>
                      <span className="payroll-employee-card-body">
                        <strong>{emp.name}</strong>
                        <span className="payroll-employee-card-meta">
                          {emp.employeeCode}
                          {emp.position ? ` · ${emp.position}` : ''}
                        </span>
                        {emp.workStatus && (
                          <span className={`badge status-badge payroll-employee-card-status ${workStatusClass(emp.workStatus)}`}>
                            {emp.workStatus}
                          </span>
                        )}
                      </span>
                      {selected && <i className="bi bi-check-circle-fill payroll-employee-card-check" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && departmentId && (
              <p className="payroll-picker-count mb-0">{filteredEmployees.length} 名表示</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
