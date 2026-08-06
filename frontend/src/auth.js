export function hasRole(user, role) {
  return Boolean(user?.roles?.includes(role));
}

export function canViewSalary(user) {
  return (
    hasRole(user, 'ADMIN') ||
    hasRole(user, 'HR') ||
    hasRole(user, 'DIVISION_HEAD') ||
    hasRole(user, 'DEPT_HEAD') ||
    hasRole(user, 'SALES_HEAD')
  );
}

/** 給与・人事情報の編集（営業は閲覧のみ） */
export function canWriteSalary(user) {
  return (
    hasRole(user, 'ADMIN') ||
    hasRole(user, 'HR') ||
    hasRole(user, 'DIVISION_HEAD') ||
    hasRole(user, 'DEPT_HEAD')
  );
}

/** 社員情報の登録・編集（案件・配属とは別） */
export function canWrite(user) {
  return (
    hasRole(user, 'ADMIN') ||
    hasRole(user, 'HR') ||
    hasRole(user, 'DIVISION_HEAD') ||
    hasRole(user, 'DEPT_HEAD') ||
    hasRole(user, 'SALES_HEAD')
  );
}

/** 案件・配属の閲覧（人事は対象外） */
export function canViewProjectFeatures(user) {
  return Boolean(user) && !hasRole(user, 'HR');
}

/** 案件・配属・候補者の編集（人事は対象外） */
export function canWriteProjectFeatures(user) {
  return (
    hasRole(user, 'ADMIN') ||
    hasRole(user, 'DIVISION_HEAD') ||
    hasRole(user, 'DEPT_HEAD') ||
    hasRole(user, 'SALES_HEAD')
  );
}

/** ファイル管理の閲覧（全ログインユーザー） */
export function canViewFiles(user) {
  return Boolean(user);
}

/** ファイル管理の操作（アップロード・削除） */
export function canWriteFiles(user) {
  return (
    hasRole(user, 'ADMIN') ||
    hasRole(user, 'HR') ||
    hasRole(user, 'DIVISION_HEAD') ||
    hasRole(user, 'DEPT_HEAD') ||
    hasRole(user, 'SALES_HEAD')
  );
}

export function canDelete(user) {
  return hasRole(user, 'ADMIN');
}

export function canManageUsers(user) {
  return hasRole(user, 'ADMIN');
}

/** BP求援の開始・更新・終了（案件作成者／自社担当／管理者） */
export function canControlBpHelp(user, project) {
  if (!canWriteProjectFeatures(user) || !project) return false;
  if (hasRole(user, 'ADMIN')) return true;
  return user?.id === project.createdBy || user?.id === project.ownerUserId;
}

/** 臨時候補の承認・却下・顧客提出（自社担当、未設定時は作成者／管理者） */
export function canReviewBpReferral(user, project) {
  if (!canWriteProjectFeatures(user) || !project) return false;
  if (hasRole(user, 'ADMIN')) return true;
  const reviewerId = project.ownerUserId ?? project.createdBy;
  return user?.id === reviewerId;
}

export function canViewClientEvents(user) {
  return (
    hasRole(user, 'ADMIN') ||
    hasRole(user, 'HR') ||
    hasRole(user, 'SALES_HEAD') ||
    hasRole(user, 'DIVISION_HEAD') ||
    hasRole(user, 'DEPT_HEAD')
  );
}

export function canWriteClientEvents(user) {
  return canViewClientEvents(user);
}

export function canViewClientRecords(user) {
  return canViewClientEvents(user);
}

export function canWriteClientRecords(user) {
  return canViewClientRecords(user);
}

export function canViewHrOps(user) {
  return canManageHrOps(user);
}

export function canManageHrOps(user) {
  return hasRole(user, 'ADMIN') || hasRole(user, 'HR');
}

/** 会議室予約の閲覧（全ログインユーザー） */
export function canViewMeetingRooms(user) {
  return Boolean(user);
}

/** 会議室予約の作成・変更（全ログインユーザー） */
export function canWriteMeetingRoomReservations(user) {
  return Boolean(user);
}

/** 会議室マスタの管理（管理者のみ） */
export function canManageMeetingRooms(user) {
  return hasRole(user, 'ADMIN');
}

/** 会議室予約の編集・取消（予約者本人または管理者のみ） */
export function canModifyMeetingRoomReservation(user, reservation) {
  if (!user || !reservation) return false;
  return Boolean(reservation.ownedByCurrentUser) || canManageMeetingRooms(user);
}

export const USER_ROLE_OPTIONS = [
  { value: 'ADMIN', label: '管理者' },
  { value: 'HR', label: '人事' },
  { value: 'DIVISION_HEAD', label: '事業部長' },
  { value: 'DEPT_HEAD', label: '部長' },
  { value: 'SALES_HEAD', label: '営業' },
];

export const HR_DEPARTMENT_NAME = '人事部';
export const SALES_DEPARTMENT_NAME = '営業部';

/** @returns {'none' | 'fixed' | 'select'} */
export function roleDepartmentMode(role) {
  if (role === 'HR' || role === 'SALES_HEAD') return 'fixed';
  if (role === 'DIVISION_HEAD' || role === 'DEPT_HEAD') return 'select';
  return 'none';
}

export function roleFixedDepartmentName(role) {
  if (role === 'HR') return HR_DEPARTMENT_NAME;
  if (role === 'SALES_HEAD') return SALES_DEPARTMENT_NAME;
  return null;
}

export function roleNeedsDepartment(role) {
  return roleDepartmentMode(role) !== 'none';
}

export function findDepartmentIdByName(departments, name) {
  if (!name || !departments?.length) return null;
  const dept = departments.find((d) => d.name === name);
  return dept?.id ?? null;
}

export function resolveDepartmentIdForRole(role, departmentId, departments) {
  const mode = roleDepartmentMode(role);
  if (mode === 'none') return null;
  if (mode === 'fixed') {
    const fixedId = findDepartmentIdByName(departments, roleFixedDepartmentName(role));
    return fixedId ?? null;
  }
  if (departmentId) return Number(departmentId);
  return null;
}

/** ロールと固定所属部門の組み合わせ説明（UI 用） */
export function roleDepartmentPairHint(roleKey) {
  const deptName = roleFixedDepartmentName(roleKey);
  if (!deptName) return null;
  return `${roleLabel(roleKey)} ↔ ${deptName}`;
}

export function filterTabsByRole(tabs, user) {
  let result = tabs;
  if (!canViewSalary(user)) {
    result = result.filter((tab) => !tab.salary);
  }
  if (!canViewProjectFeatures(user)) {
    result = result.filter((tab) => tab.id !== 'projects');
  }
  return result;
}

export function roleLabel(role) {
  switch (role) {
    case 'ADMIN':
      return '管理者';
    case 'HR':
      return '人事';
    case 'USER':
      return '一般';
    case 'DIVISION_HEAD':
      return '事業部長';
    case 'DEPT_HEAD':
      return '部長';
    case 'SALES_HEAD':
      return '営業';
    default:
      return role;
  }
}

export function roleIcon(role) {
  switch (role) {
    case 'ADMIN':
      return 'bi-shield-lock-fill';
    case 'HR':
      return 'bi-person-vcard-fill';
    case 'USER':
      return 'bi-person-fill';
    case 'DIVISION_HEAD':
      return 'bi-building-fill';
    case 'DEPT_HEAD':
      return 'bi-diagram-3-fill';
    case 'SALES_HEAD':
      return 'bi-briefcase-fill';
    default:
      return 'bi-person-fill';
  }
}

export function roleBadgeClass(role) {
  switch (role) {
    case 'ADMIN':
      return 'user-mgmt-role-admin';
    case 'HR':
      return 'user-mgmt-role-hr';
    case 'USER':
      return 'user-mgmt-role-user';
    case 'DIVISION_HEAD':
      return 'user-mgmt-role-division';
    case 'DEPT_HEAD':
      return 'user-mgmt-role-dept';
    case 'SALES_HEAD':
      return 'user-mgmt-role-sales';
    default:
      return 'user-mgmt-role-user';
  }
}

export function hasDataScopeRestriction(user) {
  return (
    hasRole(user, 'DIVISION_HEAD') ||
    hasRole(user, 'DEPT_HEAD') ||
    hasRole(user, 'SALES_HEAD')
  );
}

export function hasFullEmployeeAccess(user) {
  return hasRole(user, 'ADMIN') || hasRole(user, 'HR');
}

/** @returns {number[]|null} null = 全社員閲覧可 */
export function resolveVisibleDepartmentIds(user, departments) {
  if (!user || hasFullEmployeeAccess(user)) return null;
  if (hasRole(user, 'SALES_HEAD')) {
    return (departments ?? []).map((d) => d.id);
  }
  const deptId = Number(user.departmentId);
  if (!Number.isFinite(deptId) || deptId <= 0) return [];
  if (hasRole(user, 'DIVISION_HEAD')) {
    return resolveDepartmentFilterIds(String(deptId), departments) ?? [deptId];
  }
  if (hasRole(user, 'DEPT_HEAD')) {
    return [deptId];
  }
  return null;
}

/** 検索時の部門条件をユーザー管轄内に制限する */
export function resolveSearchDepartmentScope(user, departments, selectedDepartmentId) {
  const userScope = resolveVisibleDepartmentIds(user, departments);
  let deptScope = resolveDepartmentFilterIds(selectedDepartmentId, departments);
  if (userScope === null) {
    return deptScope;
  }
  const allowed = new Set(userScope);
  if (deptScope) {
    deptScope = deptScope.filter((id) => allowed.has(id));
    return deptScope.length > 0 ? deptScope : [];
  }
  return null;
}

export function filterDepartmentsByScope(departments, user) {
  const scope = resolveVisibleDepartmentIds(user, departments);
  if (scope === null) return departments ?? [];
  const allowed = new Set(scope);
  return (departments ?? []).filter((d) => allowed.has(d.id));
}

export function filterEmployeesByUserScope(employees, user, departments) {
  const scope = resolveVisibleDepartmentIds(user, departments);
  if (scope === null) return employees ?? [];
  return filterEmployeesByDepartmentScope(employees, scope);
}

/** @returns {number[]|null} null = 全部門へ登録可 */
export function resolveAssignableDepartmentIds(user, departments) {
  if (!user || hasFullEmployeeAccess(user)) return null;
  if (hasRole(user, 'SALES_HEAD')) {
    return resolveVisibleDepartmentIds(user, departments);
  }
  const deptId = Number(user.departmentId);
  if (!Number.isFinite(deptId) || deptId <= 0) return [];
  if (hasRole(user, 'DIVISION_HEAD')) {
    const children = (departments || [])
      .filter((d) => Number(d.parentId) === deptId)
      .map((d) => d.id);
    return children.length > 0 ? children : [deptId];
  }
  if (hasRole(user, 'DEPT_HEAD')) {
    return [deptId];
  }
  return null;
}

export function filterAssignableDepartmentsByScope(departments, user) {
  const scope = resolveAssignableDepartmentIds(user, departments);
  if (scope === null) return departments ?? [];
  const allowed = new Set(scope);
  return (departments ?? []).filter((d) => allowed.has(d.id));
}

function resolveDepartmentFilterIds(departmentId, departments) {
  if (!departmentId) return null;
  const id = Number(departmentId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const children = (departments || [])
    .filter((d) => Number(d.parentId) === id)
    .map((d) => d.id);
  return children.length > 0 ? [id, ...children] : [id];
}

function filterEmployeesByDepartmentScope(employees, departmentScope) {
  if (!departmentScope?.length) return [];
  const scopeSet = new Set(departmentScope);
  return (employees ?? []).filter(
    (emp) => emp.departmentId == null || scopeSet.has(emp.departmentId)
  );
}
