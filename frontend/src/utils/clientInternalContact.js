/** @param {{ id: number, employeeCode?: string, name?: string, departmentName?: string, position?: string }} employee */
export function formatInternalContactEmployeeOption(employee) {
  if (!employee) return '';
  const parts = [
    employee.employeeCode,
    employee.name,
    employee.departmentName || '—',
    employee.position || '—',
  ].filter(Boolean);
  return parts.join(' / ');
}

/** @param {Record<string, string>} row */
export function applyEmployeeToInternalContactRow(row, employee) {
  if (!employee) {
    if (!row.employeeId) {
      return row;
    }
    return {
      ...row,
      employeeId: '',
      contactName: '',
      department: '',
      position: '',
      phone: '',
      email: '',
    };
  }
  return {
    ...row,
    employeeId: String(employee.id),
    contactName: employee.name || row.contactName || '',
    department: employee.departmentName || row.department || '',
    position: employee.position || row.position || '',
    phone: employee.phone || row.phone || '',
    email: employee.email || row.email || '',
  };
}
