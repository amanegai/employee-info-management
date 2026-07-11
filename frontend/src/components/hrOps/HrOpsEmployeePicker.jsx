import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import {
  filterDepartmentsByScope,
  filterEmployeesByUserScope,
  resolveSearchDepartmentScope,
} from '../../auth';
import { useAuth } from '../../context/AuthContext';
import { useAppMessage } from '../../context/MessageContext';
import { excludeParentDepartments, filterEmployeesByDepartmentScope } from '../../utils';

export default function HrOpsEmployeePicker({ value, onChange, disabled = false }) {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const [master, setMaster] = useState(null);
  const [departmentId, setDepartmentId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const visibleDepartments = useMemo(
    () => excludeParentDepartments(filterDepartmentsByScope(master?.departments ?? [], user)),
    [master, user]
  );

  const loadEmployees = useCallback(async () => {
    if (!user) return;
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
      setEmployees(result);
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

  function handleDepartmentChange(nextDepartmentId) {
    setDepartmentId(nextDepartmentId);
    onChange('');
  }

  return (
    <>
      <div className="mb-3">
        <label className="form-label" htmlFor="hrOpsDepartmentId">
          部署
        </label>
        <select
          id="hrOpsDepartmentId"
          className="form-select"
          value={departmentId}
          onChange={(e) => handleDepartmentChange(e.target.value)}
          disabled={disabled || loading || !master}
        >
          <option value="">すべての部署</option>
          {visibleDepartments.map((dept) => (
            <option key={dept.id} value={String(dept.id)}>
              {dept.name}
            </option>
          ))}
        </select>
        {!loading && departmentId && (
          <p className="form-text mb-0 mt-1">{employees.length} 名が対象</p>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="hrOpsEmployeeId">
          対象社員 <span className="text-danger">*</span>
        </label>
        <select
          id="hrOpsEmployeeId"
          className="form-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
        >
          <option value="">{loading ? '読み込み中…' : '社員を選択してください'}</option>
          {employees.map((emp) => (
            <option key={emp.id} value={String(emp.id)}>
              {emp.name}
              {emp.employeeCode ? `（${emp.employeeCode}）` : ''}
              {emp.departmentName ? ` — ${emp.departmentName}` : ''}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
