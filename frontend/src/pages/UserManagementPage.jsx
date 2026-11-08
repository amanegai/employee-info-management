import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ListSectionBar from '../components/ListSectionBar';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import {
  findDepartmentIdByName,
  isSideAssignmentRoleAllowed,
  primaryRoleDisallowsSideAssignments,
  resolveDepartmentIdForRole,
  roleBadgeClass,
  roleDepartmentMode,
  roleFixedDepartmentName,
  roleIcon,
  roleLabel,
  roleShowsAffiliationCompany,
  SIDE_ASSIGNMENT_ROLE_OPTIONS,
  USER_ROLE_OPTIONS,
} from '../auth';
import { useAppMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';
import {
  AFFILIATION_COMPANIES,
  AFFILIATION_COMPANY_BITCROSS,
} from '../utils/employeeCode';

function emptyAssignment(primary = true) {
  return {
    role: 'DEPT_HEAD',
    departmentId: '',
    affiliationCompany: AFFILIATION_COMPANY_BITCROSS,
    primary,
  };
}

const EMPTY_FORM = {
  username: '',
  password: '',
  displayName: '',
  email: '',
  assignments: [emptyAssignment(true)],
  employeeId: '',
  employeeLabel: '',
  employeeCodeQuery: '',
  enabled: true,
};

function userToForm(user) {
  const linked =
    user.employeeId != null
      ? `${user.employeeCode || ''} ${user.employeeName || ''}`.trim()
      : '';
  let assignments = (user.assignments ?? []).map((a, index) => ({
    role: a.role || 'DEPT_HEAD',
    departmentId: a.departmentId != null ? String(a.departmentId) : '',
    affiliationCompany: roleShowsAffiliationCompany(a.role)
      ? a.affiliationCompany || AFFILIATION_COMPANY_BITCROSS
      : '',
    primary: Boolean(a.primary) || (index === 0 && !(user.assignments ?? []).some((x) => x.primary)),
  }));
  if (assignments.length === 0) {
    const role = user.roles?.[0] || 'DEPT_HEAD';
    assignments = [
      {
        role,
        departmentId: user.departmentId != null ? String(user.departmentId) : '',
        affiliationCompany: roleShowsAffiliationCompany(role)
          ? user.affiliationCompany || AFFILIATION_COMPANY_BITCROSS
          : '',
        primary: true,
      },
    ];
  }
  return {
    username: user.username,
    password: '',
    displayName: user.displayName || '',
    email: user.email || '',
    assignments,
    employeeId: user.employeeId != null ? String(user.employeeId) : '',
    employeeLabel: linked,
    employeeCodeQuery: '',
    enabled: user.enabled,
  };
}

export default function UserManagementPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const { showMessage } = useAppMessage();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [employeeLookupLoading, setEmployeeLookupLoading] = useState(false);
  const [employeeLookupResults, setEmployeeLookupResults] = useState([]);
  const [employeeLookupError, setEmployeeLookupError] = useState('');
  const [employeeLookupHint, setEmployeeLookupHint] = useState('');
  const [formError, setFormError] = useState('');
  const [companyOptions, setCompanyOptions] = useState(AFFILIATION_COMPANIES);

  useEffect(() => {
    if (!modalOpen || departments.length === 0) return;
    setForm((prev) => {
      let changed = false;
      const nextAssignments = prev.assignments.map((row) => {
        const mode = roleDepartmentMode(row.role);
        if (mode !== 'fixed') return row;
        const fixedName = roleFixedDepartmentName(row.role);
        const company = roleShowsAffiliationCompany(row.role) ? row.affiliationCompany : null;
        const id = findDepartmentIdByName(departments, fixedName, company);
        const nextId = id != null ? String(id) : '';
        if (row.departmentId === nextId) return row;
        changed = true;
        return { ...row, departmentId: nextId };
      });
      return changed ? { ...prev, assignments: nextAssignments } : prev;
    });
  }, [modalOpen, departments]);

  function clearEmployeeLookupUi() {
    setEmployeeLookupResults([]);
    setEmployeeLookupError('');
    setEmployeeLookupHint('');
  }

  function updateAssignment(index, patch) {
    setForm((prev) => {
      let assignments = prev.assignments.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if (!next.primary && patch.role != null && !isSideAssignmentRoleAllowed(next.role)) {
          next.role = 'DEPT_HEAD';
        }
        if (patch.role != null || patch.affiliationCompany != null) {
          const mode = roleDepartmentMode(next.role);
          if (mode === 'fixed') {
            const id = findDepartmentIdByName(
              departments,
              roleFixedDepartmentName(next.role),
              roleShowsAffiliationCompany(next.role) ? next.affiliationCompany : null,
            );
            next.departmentId = id != null ? String(id) : '';
          } else if (mode === 'none') {
            next.departmentId = '';
            if (!roleShowsAffiliationCompany(next.role)) {
              next.affiliationCompany = '';
            }
          }
          if (roleShowsAffiliationCompany(next.role) && !next.affiliationCompany) {
            next.affiliationCompany = AFFILIATION_COMPANY_BITCROSS;
          }
        }
        return next;
      });

      const primary = assignments.find((a) => a.primary) || assignments[0];
      if (primary && primaryRoleDisallowsSideAssignments(primary.role) && assignments.length > 1) {
        assignments = assignments.filter((a) => a.primary).map((a) => ({ ...a, primary: true }));
      }
      return { ...prev, assignments };
    });
  }

  function addAssignment() {
    setForm((prev) => {
      const primary = prev.assignments.find((a) => a.primary) || prev.assignments[0];
      if (primary && primaryRoleDisallowsSideAssignments(primary.role)) {
        return prev;
      }
      return {
        ...prev,
        assignments: [...prev.assignments, emptyAssignment(false)],
      };
    });
  }

  const primaryAssignment = useMemo(
    () => form.assignments.find((a) => a.primary) || form.assignments[0],
    [form.assignments],
  );
  const canAddSideAssignment = useMemo(
    () => !primaryRoleDisallowsSideAssignments(primaryAssignment?.role),
    [primaryAssignment],
  );

  function removeAssignment(index) {
    setForm((prev) => {
      if (prev.assignments.length <= 1) return prev;
      const removed = prev.assignments[index];
      let assignments = prev.assignments.filter((_, i) => i !== index);
      if (removed.primary && assignments.length > 0) {
        assignments = assignments.map((row, i) => ({ ...row, primary: i === 0 }));
      }
      return { ...prev, assignments };
    });
  }

  function setPrimaryAssignment(index) {
    setForm((prev) => {
      let assignments = prev.assignments.map((row, i) => ({ ...row, primary: i === index }));
      const primary = assignments[index];
      if (primary && primaryRoleDisallowsSideAssignments(primary.role) && assignments.length > 1) {
        assignments = [{ ...primary, primary: true }];
      }
      return { ...prev, assignments };
    });
  }

  function departmentsForAssignment(row) {
    if (!roleShowsAffiliationCompany(row.role) || !row.affiliationCompany) {
      return departments;
    }
    const company = row.affiliationCompany;
    return departments.filter((d) => normalizeCompany(d.company) === normalizeCompany(company));
  }

  function normalizeCompany(value) {
    return (value || '').trim();
  }

  async function handleEmployeeLookup() {
    const keyword = form.employeeCodeQuery.trim();
    clearEmployeeLookupUi();
    if (!keyword) {
      setEmployeeLookupError('社員番号または氏名を入力してください');
      return;
    }
    setEmployeeLookupLoading(true);
    try {
      const list = await api.searchEmployees({ keyword });
      const results = list ?? [];
      if (results.length === 0) {
        setEmployeeLookupError(`「${keyword}」に該当する社員が見つかりませんでした`);
        return;
      }
      if (results.length === 1) {
        const emp = results[0];
        setForm((prev) => ({
          ...prev,
          employeeId: String(emp.id),
          employeeLabel: `${emp.employeeCode} ${emp.name}`,
          employeeCodeQuery: '',
        }));
        setEmployeeLookupHint(`「${emp.employeeCode} ${emp.name}」を連携しました`);
        return;
      }
      setEmployeeLookupResults(results);
      setEmployeeLookupHint(`${results.length}件見つかりました。一覧から選択してください`);
    } catch (err) {
      setEmployeeLookupError(err.message || '検索に失敗しました');
    } finally {
      setEmployeeLookupLoading(false);
    }
  }

  function selectEmployeeLink(emp) {
    setForm((prev) => ({
      ...prev,
      employeeId: String(emp.id),
      employeeLabel: `${emp.employeeCode} ${emp.name}`,
      employeeCodeQuery: '',
    }));
    clearEmployeeLookupUi();
    setEmployeeLookupHint(`「${emp.employeeCode} ${emp.name}」を連携しました`);
  }

  function clearEmployeeLink() {
    setForm((prev) => ({
      ...prev,
      employeeId: '',
      employeeLabel: '',
      employeeCodeQuery: '',
    }));
    clearEmployeeLookupUi();
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userList, master] = await Promise.all([api.listUsers(), api.getMaster()]);
      setUsers(userList);
      setDepartments(master.departments ?? []);
      setCompanyOptions(
        master.affiliationCompanies?.length ? master.affiliationCompanies : AFFILIATION_COMPANIES,
      );
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreateModal() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setPasswordVisible(false);
    setFormError('');
    clearEmployeeLookupUi();
    setModalOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setForm(userToForm(user));
    setPasswordVisible(false);
    setFormError('');
    clearEmployeeLookupUi();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setPasswordVisible(false);
    setFormError('');
    clearEmployeeLookupUi();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (!form.assignments?.length) {
        throw new Error('本職または兼職を1つ以上設定してください');
      }
      const primaryCount = form.assignments.filter((a) => a.primary).length;
      if (primaryCount !== 1) {
        throw new Error('本職を1つ指定してください');
      }
      const primaryRow = form.assignments.find((a) => a.primary);
      if (primaryRoleDisallowsSideAssignments(primaryRow?.role) && form.assignments.length > 1) {
        throw new Error('管理者・一般社員の本職では兼職を設定できません');
      }
      const invalidSide = form.assignments.find(
        (a) => !a.primary && !isSideAssignmentRoleAllowed(a.role),
      );
      if (invalidSide) {
        throw new Error('兼職ロールは事業部長・部長・営業のみ選択できます');
      }

      const assignments = form.assignments.map((row) => {
        const showCompany = roleShowsAffiliationCompany(row.role);
        const mode = roleDepartmentMode(row.role);
        const departmentId = resolveDepartmentIdForRole(
          row.role,
          row.departmentId,
          departments,
          showCompany ? row.affiliationCompany : null,
        );
        if (mode === 'fixed' && !departmentId) {
          throw new Error(
            `「${roleFixedDepartmentName(row.role)}」がマスタに登録されていません` +
              (showCompany && row.affiliationCompany ? `（${row.affiliationCompany}）` : ''),
          );
        }
        if (mode === 'select' && !departmentId) {
          throw new Error('事業部長・部長には所属部門が必要です');
        }
        if (showCompany && !row.affiliationCompany) {
          throw new Error('所属会社を選択してください');
        }
        return {
          role: row.role,
          departmentId,
          affiliationCompany: showCompany ? row.affiliationCompany : null,
          primary: Boolean(row.primary),
        };
      });

      const seenKeys = new Set();
      for (const row of assignments) {
        const key = [
          row.role || '',
          row.affiliationCompany || '',
          row.departmentId != null ? String(row.departmentId) : '',
        ].join('|');
        if (seenKeys.has(key)) {
          throw new Error(
            '本職・兼職の内容が重複しています（同じ会社・ロール・部門は設定できません）',
          );
        }
        seenKeys.add(key);
      }

      const payload = {
        username: form.username.trim(),
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        assignments,
        employeeId: form.employeeId ? Number(form.employeeId) : null,
        enabled: form.enabled,
      };
      if (form.password.trim()) {
        payload.password = form.password;
      } else if (!editingUser) {
        throw new Error('パスワードを入力してください');
      }
      if (editingUser) {
        await api.updateUser(editingUser.id, payload);
        showMessage(`「${payload.username}」を更新しました`);
      } else {
        await api.createUser(payload);
        showMessage(`「${payload.username}」を登録しました`);
      }
      closeModal();
      await loadData();
      if (editingUser?.username === currentUser?.username) {
        await refreshUser();
      }
    } catch (err) {
      setFormError(err.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`「${user.username}」を削除しますか？`)) return;
    try {
      await api.deleteUser(user.id);
      showMessage(`「${user.username}」を削除しました`);
      await loadData();
    } catch (err) {
      showMessage(err.message, 'danger');
    }
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page">
      <PageHeader
        guideId="user-management"
        icon="bi-person-gear"
        title="ユーザー管理"
        lead="ログインアカウントと権限の管理"
      >
        <Link to="/admin/master-import" className="btn btn-outline-secondary app-btn">
          <i className="bi bi-database-up" aria-hidden="true" />
          マスタ一括登録
        </Link>
        <Link to="/admin/audit-logs" className="btn btn-outline-secondary app-btn">
          <i className="bi bi-journal-text" aria-hidden="true" />
          監査ログ
        </Link>
        <button type="button" className="btn btn-primary app-btn" onClick={openCreateModal}>
          <i className="bi bi-person-plus-fill" aria-hidden="true" />
          新規ユーザー
        </button>
      </PageHeader>

      <section className="table-section list-section-panel user-management-section" aria-label="ユーザー一覧">
        <div className="list-section-inner">
          <ListSectionBar
            icon="bi-people-fill"
            title="ユーザー一覧"
            count={users.length}
            hideCount={loading}
          />

        {loading ? (
          <div className="page-state-panel">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-3 mb-0">読み込み中…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="page-state-panel">
            <i className="bi bi-person-x page-state-panel-icon" aria-hidden="true" />
            <p className="mb-0">登録されているユーザーがありません。</p>
          </div>
        ) : (
          <div className="user-mgmt-table-wrap user-mgmt-table-wrap-inset">
            <table className="table table-hover align-middle mb-0 user-mgmt-table">
              <thead>
                <tr>
                  <th>ユーザー名</th>
                  <th>表示名</th>
                  <th>メール</th>
                  <th>ロール</th>
                  <th>所属会社</th>
                  <th>所属部門</th>
                  <th>連携社員</th>
                  <th>2FA</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.username === currentUser?.username;
                  return (
                    <tr key={user.id} className={isSelf ? 'user-mgmt-row-self' : undefined}>
                      <td>
                        <div className="user-mgmt-user-cell">
                          <div className="user-mgmt-user-card">
                            <span className="user-mgmt-avatar" aria-hidden="true">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                            <div className="user-mgmt-user-text">
                              <span className="user-mgmt-username">{user.username}</span>
                              {isSelf && <span className="user-mgmt-self-tag">自分</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={user.displayName ? 'user-mgmt-display-name' : 'user-mgmt-empty'}>
                          {user.displayName || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={user.email ? 'user-mgmt-email' : 'user-mgmt-empty'}>
                          {user.email ? (
                            <>
                              <i className="bi bi-envelope user-mgmt-email-icon" aria-hidden="true" />
                              {user.email}
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="user-mgmt-role-list">
                          {(user.assignments?.length
                            ? user.assignments
                            : (user.roles ?? []).map((role) => ({ role, primary: true }))
                          ).map((assignment, idx) => (
                            <span
                              key={`${assignment.role}-${idx}`}
                              className={`user-mgmt-role-badge ${roleBadgeClass(assignment.role)}`}
                              title={
                                assignment.affiliationCompany
                                  ? `${roleLabel(assignment.role)} / ${assignment.affiliationCompany}`
                                  : roleLabel(assignment.role)
                              }
                            >
                              <i className={`bi ${roleIcon(assignment.role)}`} aria-hidden="true" />
                              {roleLabel(assignment.role)}
                              {assignment.primary ? '（本職）' : '（兼職）'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={user.affiliationCompany ? 'user-mgmt-dept' : 'user-mgmt-empty'}>
                          {user.affiliationCompany || '—'}
                          {(user.assignments?.length ?? 0) > 1 && (
                            <span className="user-mgmt-self-tag ms-1">
                              +{user.assignments.length - 1}兼職
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={user.departmentName ? 'user-mgmt-dept' : 'user-mgmt-empty'}>
                          {user.departmentName ? (
                            <>
                              <i className="bi bi-building user-mgmt-dept-icon" aria-hidden="true" />
                              {user.departmentName}
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={user.employeeId ? 'user-mgmt-dept' : 'user-mgmt-empty'}>
                          {user.employeeId ? (
                            <>
                              <i className="bi bi-person-badge user-mgmt-dept-icon" aria-hidden="true" />
                              {user.employeeCode || '—'}
                              {user.employeeName ? ` ${user.employeeName}` : ''}
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={`user-mgmt-mfa ${user.totpEnabled ? 'is-enabled' : 'is-disabled'}`}>
                          {user.totpEnabled ? '有効' : '無効'}
                        </span>
                      </td>
                      <td>
                        <span className={`user-mgmt-status ${user.enabled ? 'is-active' : 'is-inactive'}`}>
                          <span className="user-mgmt-status-dot" aria-hidden="true" />
                          {user.enabled ? '有効' : '無効'}
                        </span>
                      </td>
                      <td>
                        <div className="user-mgmt-actions">
                          <button
                            type="button"
                            className="user-mgmt-action-btn user-mgmt-action-edit"
                            onClick={() => openEditModal(user)}
                            title="編集"
                            aria-label={`${user.username} を編集`}
                          >
                            <i className="bi bi-pencil-square" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="user-mgmt-action-btn user-mgmt-action-delete"
                            disabled={isSelf}
                            onClick={() => handleDelete(user)}
                            title={isSelf ? '自分自身は削除できません' : '削除'}
                            aria-label={`${user.username} を削除`}
                          >
                            <i className="bi bi-trash3" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </section>

      {modalOpen && (
        <>
          <div
            className={`modal fade show d-block user-management-modal-root user-form-modal-root${
              editingUser ? ' user-form-modal-root-edit' : ' user-form-modal-root-create'
            }`}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="userFormModalTitle"
          >
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable user-form-modal-dialog">
              <div className="modal-content user-form-modal-content">
                <form onSubmit={handleSubmit}>
                  <div
                    className={`modal-header user-form-modal-header${
                      editingUser ? ' user-form-modal-header-edit' : ' user-form-modal-header-create'
                    }`}
                  >
                    <div className="user-form-modal-header-main">
                      <span className="user-form-modal-header-icon" aria-hidden="true">
                        <i className={`bi ${editingUser ? 'bi-person-gear' : 'bi-person-plus-fill'}`} />
                      </span>
                      <div className="user-form-modal-header-text">
                        <h2 className="modal-title h5 mb-0" id="userFormModalTitle">
                          {editingUser ? 'ユーザー編集' : '新規ユーザー'}
                        </h2>
                        <p className="user-form-modal-subtitle mb-0">
                          {editingUser
                            ? `@${editingUser.username}${form.displayName ? ` · ${form.displayName}` : ''}`
                            : 'ログインアカウントと権限を設定します'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      aria-label="閉じる"
                      onClick={closeModal}
                    />
                  </div>

                  <div className="modal-body user-form-modal-body">
                    <section className="user-form-section" aria-labelledby="userFormSectionBasic">
                      <h3 className="user-form-section-title" id="userFormSectionBasic">
                        <i className="bi bi-person-vcard" aria-hidden="true" />
                        基本情報
                      </h3>
                      <div className="user-form-grid user-form-grid-2">
                        <div className="user-form-field">
                          <label htmlFor="userUsername" className="form-label user-form-label">
                            ユーザー名
                            {editingUser && (
                              <span className="user-form-label-badge">
                                <i className="bi bi-lock-fill" aria-hidden="true" />
                                変更不可
                              </span>
                            )}
                          </label>
                          <div className={editingUser ? 'user-form-input-wrap is-readonly' : undefined}>
                            {editingUser && (
                              <i className="bi bi-at user-form-input-icon" aria-hidden="true" />
                            )}
                            <input
                              id="userUsername"
                              type="text"
                              className={`form-control${editingUser ? ' user-form-input-with-icon' : ''}`}
                              value={form.username}
                              onChange={(e) => setForm({ ...form, username: e.target.value })}
                              readOnly={Boolean(editingUser)}
                              placeholder={editingUser ? undefined : '例: tanaka.j'}
                              required
                              autoComplete="username"
                            />
                          </div>
                        </div>
                        <div className="user-form-field">
                          <label htmlFor="userDisplayName" className="form-label user-form-label">
                            表示名
                          </label>
                          <input
                            id="userDisplayName"
                            type="text"
                            className="form-control"
                            value={form.displayName}
                            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                            placeholder="例: 田中 太郎"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="user-form-section" aria-labelledby="userFormSectionContact">
                      <h3 className="user-form-section-title" id="userFormSectionContact">
                        <i className="bi bi-envelope" aria-hidden="true" />
                        連絡先
                      </h3>
                      <div className="user-form-field">
                        <label htmlFor="userEmail" className="form-label user-form-label">
                          メール
                          <span className="user-form-label-optional">任意</span>
                        </label>
                        <div className="user-form-input-wrap">
                          <i className="bi bi-envelope user-form-input-icon" aria-hidden="true" />
                          <input
                            id="userEmail"
                            type="email"
                            className="form-control user-form-input-with-icon"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="通知メールの送信先"
                            autoComplete="email"
                          />
                        </div>
                      </div>
                      <div className="user-form-callout">
                        <i className="bi bi-info-circle" aria-hidden="true" />
                        <p className="user-form-callout-text mb-0">
                          ログインユーザー向けのシステム通知（配属取消フォロー等）の送信先です。
                          イベント参加リマインドは参加者の社員メールを使用します。
                        </p>
                      </div>
                    </section>

                    <section className="user-form-section" aria-labelledby="userFormSectionSecurity">
                      <h3 className="user-form-section-title" id="userFormSectionSecurity">
                        <i className="bi bi-shield-lock" aria-hidden="true" />
                        セキュリティ
                      </h3>
                      <div className="user-form-field">
                        <label htmlFor="userPassword" className="form-label user-form-label">
                          パスワード
                          {editingUser ? (
                            <span className="user-form-label-optional">変更時のみ入力</span>
                          ) : (
                            <span className="user-form-label-required">必須</span>
                          )}
                        </label>
                        <div className="user-form-input-wrap user-form-password-wrap">
                          <i className="bi bi-key user-form-input-icon" aria-hidden="true" />
                          <input
                            id="userPassword"
                            type={passwordVisible ? 'text' : 'password'}
                            className="form-control user-form-input-with-icon user-form-password-input"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required={!editingUser}
                            autoComplete="new-password"
                            placeholder={editingUser ? '空欄のままなら変更しません' : '8文字以上を推奨'}
                          />
                          <button
                            type="button"
                            className="user-form-password-toggle"
                            onClick={() => setPasswordVisible((v) => !v)}
                            aria-label={passwordVisible ? 'パスワードを隠す' : 'パスワードを表示'}
                            tabIndex={-1}
                          >
                            <i className={`bi ${passwordVisible ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </section>

                    <section className="user-form-section" aria-labelledby="userFormSectionAccess">
                      <h3 className="user-form-section-title" id="userFormSectionAccess">
                        <i className="bi bi-sliders" aria-hidden="true" />
                        権限・所属（本職／兼職）
                      </h3>
                      <p className="user-form-role-hint mb-2">
                        跨会社の兼職は権限側のみ設定します。閲覧範囲は各行の和集合です。
                      </p>
                      <div className="d-flex flex-column gap-3 mb-3">
                        {form.assignments.map((row, index) => {
                          const mode = roleDepartmentMode(row.role);
                          const showCompany = roleShowsAffiliationCompany(row.role);
                          const fixedName = roleFixedDepartmentName(row.role);
                          const deptOptions = departmentsForAssignment(row);
                          const fixedDept = fixedName
                            ? deptOptions.find((d) => d.name === fixedName) ?? null
                            : null;
                          return (
                            <div
                              key={`assignment-${index}`}
                              className="user-form-status-card"
                              style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}
                            >
                              <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                                <div className="d-flex align-items-center gap-2">
                                  <span className={`user-mgmt-role-badge ${roleBadgeClass(row.role)}`}>
                                    <i className={`bi ${roleIcon(row.role)}`} aria-hidden="true" />
                                    {row.primary ? '本職' : `兼職 ${index}`}
                                  </span>
                                  <label className="form-check-label d-flex align-items-center gap-1 mb-0">
                                    <input
                                      type="radio"
                                      className="form-check-input"
                                      name="primaryAssignment"
                                      checked={Boolean(row.primary)}
                                      onChange={() => setPrimaryAssignment(index)}
                                    />
                                    本職にする
                                  </label>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  disabled={form.assignments.length <= 1}
                                  onClick={() => removeAssignment(index)}
                                >
                                  削除
                                </button>
                              </div>
                              <div className="user-form-grid user-form-grid-2">
                                <div className="user-form-field">
                                  <label className="form-label user-form-label" htmlFor={`userRole-${index}`}>
                                    ロール
                                  </label>
                                  <select
                                    id={`userRole-${index}`}
                                    className="form-select"
                                    value={row.role}
                                    onChange={(e) => updateAssignment(index, { role: e.target.value })}
                                    required
                                  >
                                    {(row.primary ? USER_ROLE_OPTIONS : SIDE_ASSIGNMENT_ROLE_OPTIONS).map(
                                      (option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </div>
                                {showCompany && (
                                  <div className="user-form-field">
                                    <label
                                      className="form-label user-form-label"
                                      htmlFor={`userCompany-${index}`}
                                    >
                                      所属会社
                                      <span className="user-form-label-required">必須</span>
                                    </label>
                                    <select
                                      id={`userCompany-${index}`}
                                      className="form-select"
                                      value={row.affiliationCompany}
                                      onChange={(e) =>
                                        updateAssignment(index, { affiliationCompany: e.target.value })
                                      }
                                      required
                                    >
                                      {companyOptions.map((company) => (
                                        <option key={company} value={company}>
                                          {company}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                {mode === 'fixed' && (
                                  <div className="user-form-field" style={{ gridColumn: '1 / -1' }}>
                                    {fixedDept ? (
                                      <div className="user-form-dept-binding">
                                        <span className="user-form-dept-binding-dept">
                                          <i className="bi bi-building" aria-hidden="true" />
                                          {fixedDept.name}
                                          {showCompany && row.affiliationCompany
                                            ? `（${row.affiliationCompany}）`
                                            : ''}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="user-form-callout user-form-callout-warning">
                                        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                                        <p className="user-form-callout-text mb-0">
                                          マスタに「{fixedName}」がありません。
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {mode === 'select' && (
                                  <div className="user-form-field" style={{ gridColumn: showCompany ? undefined : '1 / -1' }}>
                                    <label
                                      className="form-label user-form-label"
                                      htmlFor={`userDept-${index}`}
                                    >
                                      所属部門
                                      <span className="user-form-label-required">必須</span>
                                    </label>
                                    <select
                                      id={`userDept-${index}`}
                                      className="form-select"
                                      value={row.departmentId}
                                      onChange={(e) =>
                                        updateAssignment(index, { departmentId: e.target.value })
                                      }
                                      required
                                    >
                                      <option value="">選択してください</option>
                                      {deptOptions.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                          {dept.name}
                                          {dept.company ? `（${dept.company}）` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm mb-3"
                        onClick={addAssignment}
                        disabled={!canAddSideAssignment}
                        title={
                          canAddSideAssignment
                            ? undefined
                            : '管理者・一般社員の本職では兼職を追加できません'
                        }
                      >
                        <i className="bi bi-plus-lg" aria-hidden="true" /> 兼職を追加
                      </button>
                      {!canAddSideAssignment && (
                        <p className="user-form-role-hint mb-3">
                          本職が管理者または一般社員の場合、兼職は追加できません。
                        </p>
                      )}
                      <div className="user-form-grid user-form-grid-2">
                        <div className="user-form-field" style={{ gridColumn: '1 / -1' }}>
                          <label htmlFor="userEmployeeCode" className="form-label user-form-label">
                            連携社員（MyPage）
                            <span className="user-form-label-optional">任意</span>
                          </label>
                          {form.employeeId ? (
                            <div className="user-form-dept-binding" aria-label="連携社員">
                              <span className="user-form-dept-binding-dept">
                                <i className="bi bi-person-badge" aria-hidden="true" />
                                {form.employeeLabel || form.employeeId}
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary ms-2"
                                onClick={clearEmployeeLink}
                              >
                                解除
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="d-flex gap-2">
                                <div className="user-form-input-wrap flex-grow-1">
                                  <i className="bi bi-search user-form-input-icon" aria-hidden="true" />
                                  <input
                                    id="userEmployeeCode"
                                    type="text"
                                    className="form-control user-form-input-with-icon"
                                    value={form.employeeCodeQuery}
                                    onChange={(e) => {
                                      setForm({ ...form, employeeCodeQuery: e.target.value });
                                      clearEmployeeLookupUi();
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void handleEmployeeLookup();
                                      }
                                    }}
                                    placeholder="社員番号・氏名の一部で検索"
                                  />
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-outline-primary app-btn"
                                  onClick={handleEmployeeLookup}
                                  disabled={employeeLookupLoading}
                                >
                                  {employeeLookupLoading ? '検索中…' : '検索'}
                                </button>
                              </div>
                              {employeeLookupResults.length > 0 && (
                                <div className="user-form-employee-results" role="listbox">
                                  {employeeLookupResults.map((emp) => (
                                    <button
                                      key={emp.id}
                                      type="button"
                                      className="user-form-employee-result"
                                      onClick={() => selectEmployeeLink(emp)}
                                    >
                                      <span className="user-form-employee-result-main">
                                        {emp.employeeCode} {emp.name}
                                      </span>
                                      <span className="user-form-employee-result-meta">
                                        {[emp.affiliationCompany, emp.departmentName]
                                          .filter(Boolean)
                                          .join(' / ') || '—'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          {employeeLookupError && (
                            <p className="user-form-inline-error" role="alert">
                              <i className="bi bi-exclamation-circle" aria-hidden="true" />
                              <span>{employeeLookupError}</span>
                            </p>
                          )}
                          {!employeeLookupError && employeeLookupHint && (
                            <p className="user-form-inline-ok" role="status">
                              <i className="bi bi-check-circle" aria-hidden="true" />
                              <span>{employeeLookupHint}</span>
                            </p>
                          )}
                          <p className="user-form-role-hint mb-0 mt-1">
                            社員番号・氏名の一部で曖昧検索できます。一般社員ロールでは MyPage のため連携を推奨します。
                          </p>
                        </div>
                      </div>
                    </section>

                    {formError && (
                      <p className="user-form-inline-error" role="alert">
                        <i className="bi bi-exclamation-circle" aria-hidden="true" />
                        <span>{formError}</span>
                      </p>
                    )}

                    <div className="user-form-status-card">
                      <div className="user-form-status-text">
                        <span className="user-form-status-title">アカウント状態</span>
                        <span className="user-form-status-desc">
                          {form.enabled
                            ? '有効 — ログインとシステム利用が可能です'
                            : '無効 — ログインできません'}
                        </span>
                      </div>
                      <label className="user-form-switch" htmlFor="userEnabled">
                        <input
                          id="userEnabled"
                          type="checkbox"
                          className="user-form-switch-input"
                          checked={form.enabled}
                          disabled={editingUser?.username === currentUser?.username}
                          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                        />
                        <span className="user-form-switch-track" aria-hidden="true">
                          <span className="user-form-switch-thumb" />
                        </span>
                        <span className="user-form-switch-label">
                          {form.enabled ? '有効' : '無効'}
                        </span>
                      </label>
                      {editingUser?.username === currentUser?.username && (
                        <p className="user-form-status-note mb-0">
                          <i className="bi bi-info-circle" aria-hidden="true" />
                          自分自身のアカウントは無効にできません
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer user-form-modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary app-btn"
                      onClick={closeModal}
                    >
                      キャンセル
                    </button>
                    <button type="submit" className="btn btn-primary app-btn" disabled={saving}>
                      {saving ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          保存中…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-lg" aria-hidden="true" />
                          {editingUser ? '変更を保存' : 'ユーザーを登録'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show user-form-modal-backdrop" />
        </>
      )}

      <AppFooter />
    </div>
  );
}
