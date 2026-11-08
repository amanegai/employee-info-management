import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ListSectionBar from '../components/ListSectionBar';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import {
  findDepartmentIdByName,
  resolveDepartmentIdForRole,
  roleBadgeClass,
  roleDepartmentMode,
  roleDepartmentPairHint,
  roleFixedDepartmentName,
  roleIcon,
  roleLabel,
  USER_ROLE_OPTIONS,
} from '../auth';
import { useAppMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  username: '',
  password: '',
  displayName: '',
  email: '',
  role: 'DEPT_HEAD',
  departmentId: '',
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
  return {
    username: user.username,
    password: '',
    displayName: user.displayName || '',
    email: user.email || '',
    role: user.roles?.[0] || 'DEPT_HEAD',
    departmentId: user.departmentId != null ? String(user.departmentId) : '',
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

  const departmentMode = useMemo(() => roleDepartmentMode(form.role), [form.role]);
  const fixedDepartmentName = useMemo(() => roleFixedDepartmentName(form.role), [form.role]);
  const fixedDepartment = useMemo(() => {
    if (!fixedDepartmentName) return null;
    return departments.find((d) => d.name === fixedDepartmentName) ?? null;
  }, [departments, fixedDepartmentName]);
  const selectedRoleOption = useMemo(
    () => USER_ROLE_OPTIONS.find((o) => o.value === form.role),
    [form.role],
  );

  useEffect(() => {
    if (!modalOpen || departmentMode !== 'fixed' || !fixedDepartment) return;
    const nextId = String(fixedDepartment.id);
    if (form.departmentId !== nextId) {
      setForm((prev) => ({ ...prev, departmentId: nextId }));
    }
  }, [modalOpen, departmentMode, fixedDepartment, form.departmentId]);

  function handleRoleChange(role) {
    const mode = roleDepartmentMode(role);
    let departmentId = '';
    if (mode === 'fixed') {
      const id = findDepartmentIdByName(departments, roleFixedDepartmentName(role));
      departmentId = id != null ? String(id) : '';
    }
    setForm((prev) => ({ ...prev, role, departmentId }));
  }

  async function handleEmployeeLookup() {
    const code = form.employeeCodeQuery.trim();
    if (!code) {
      showMessage('社員番号を入力してください', 'warning');
      return;
    }
    setEmployeeLookupLoading(true);
    try {
      const list = await api.searchEmployees({ employeeCode: code });
      const exact = (list ?? []).find(
        (emp) => String(emp.employeeCode).toLowerCase() === code.toLowerCase()
      );
      if (!exact) {
        showMessage(`社員番号「${code}」は見つかりませんでした`, 'danger');
        return;
      }
      setForm((prev) => ({
        ...prev,
        employeeId: String(exact.id),
        employeeLabel: `${exact.employeeCode} ${exact.name}`,
        employeeCodeQuery: '',
      }));
      showMessage(`「${exact.employeeCode} ${exact.name}」を連携しました`);
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setEmployeeLookupLoading(false);
    }
  }

  function clearEmployeeLink() {
    setForm((prev) => ({
      ...prev,
      employeeId: '',
      employeeLabel: '',
      employeeCodeQuery: '',
    }));
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userList, master] = await Promise.all([api.listUsers(), api.getMaster()]);
      setUsers(userList);
      setDepartments(master.departments ?? []);
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
    setModalOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setForm(userToForm(user));
    setPasswordVisible(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setPasswordVisible(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        roles: [form.role],
        departmentId: resolveDepartmentIdForRole(form.role, form.departmentId, departments),
        employeeId: form.employeeId ? Number(form.employeeId) : null,
        enabled: form.enabled,
      };
      if (form.password.trim()) {
        payload.password = form.password;
      } else if (!editingUser) {
        throw new Error('パスワードを入力してください');
      }
      if (departmentMode === 'fixed' && !payload.departmentId) {
        throw new Error(`「${fixedDepartmentName}」がマスタに登録されていません`);
      }
      if (departmentMode === 'select' && !payload.departmentId) {
        throw new Error('所属部門を選択してください');
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
      showMessage(err.message, 'danger');
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
                          {(user.roles ?? []).map((role) => (
                            <span
                              key={role}
                              className={`user-mgmt-role-badge ${roleBadgeClass(role)}`}
                              title={roleLabel(role)}
                            >
                              <i className={`bi ${roleIcon(role)}`} aria-hidden="true" />
                              {roleLabel(role)}
                            </span>
                          ))}
                        </div>
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
                        権限・所属
                      </h3>
                      <div
                        className={`user-form-grid${
                          departmentMode !== 'none' ? ' user-form-grid-2' : ''
                        }`}
                      >
                        <div className="user-form-field">
                          <label htmlFor="userRole" className="form-label user-form-label">
                            ロール
                          </label>
                          <div className="user-form-select-wrap">
                            {selectedRoleOption && (
                              <i
                                className={`bi ${roleIcon(form.role)} user-form-select-icon`}
                                aria-hidden="true"
                              />
                            )}
                            <select
                              id="userRole"
                              className="form-select user-form-select-with-icon user-form-control-paired"
                              value={form.role}
                              onChange={(e) => handleRoleChange(e.target.value)}
                              required
                            >
                              {USER_ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {selectedRoleOption && (
                            <p className="user-form-role-hint">
                              <span className={`user-mgmt-role-badge ${roleBadgeClass(form.role)}`}>
                                <i className={`bi ${roleIcon(form.role)}`} aria-hidden="true" />
                                {selectedRoleOption.label}
                              </span>
                              {departmentMode === 'fixed' && roleDepartmentPairHint(form.role) ? (
                                <> — {roleDepartmentPairHint(form.role)} に固定</>
                              ) : departmentMode === 'select' ? (
                                <> — 所属部門の指定が必要です</>
                              ) : (
                                <> の権限が付与されます</>
                              )}
                            </p>
                          )}
                        </div>
                        {departmentMode === 'fixed' && (
                          <div className="user-form-field user-form-field-animated">
                            <div className="user-form-dept-label-row">
                              <span className="user-form-dept-label-text">所属部門</span>
                              <span className="user-form-label-badge">
                                <i className="bi bi-link-45deg" aria-hidden="true" />
                                ロール連動
                              </span>
                            </div>
                            {fixedDepartment ? (
                              <div className="user-form-dept-binding" aria-label={roleDepartmentPairHint(form.role)}>
                                <span className={`user-mgmt-role-badge ${roleBadgeClass(form.role)}`}>
                                  <i className={`bi ${roleIcon(form.role)}`} aria-hidden="true" />
                                  {selectedRoleOption?.label}
                                </span>
                                <i className="bi bi-arrow-right user-form-dept-binding-arrow" aria-hidden="true" />
                                <span className="user-form-dept-binding-dept">
                                  <i className="bi bi-building" aria-hidden="true" />
                                  {fixedDepartment.name}
                                </span>
                              </div>
                            ) : (
                              <div className="user-form-callout user-form-callout-warning">
                                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                                <p className="user-form-callout-text mb-0">
                                  マスタに「{fixedDepartmentName}」がありません。部門マスタを確認してください。
                                </p>
                              </div>
                            )}
                          </div>
                        )}
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
                            <div className="d-flex gap-2">
                              <div className="user-form-input-wrap flex-grow-1">
                                <i className="bi bi-search user-form-input-icon" aria-hidden="true" />
                                <input
                                  id="userEmployeeCode"
                                  type="text"
                                  className="form-control user-form-input-with-icon"
                                  value={form.employeeCodeQuery}
                                  onChange={(e) =>
                                    setForm({ ...form, employeeCodeQuery: e.target.value })
                                  }
                                  placeholder="社員番号で検索（例: btcS00001）"
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
                          )}
                          <p className="user-form-role-hint mb-0 mt-1">
                            一般社員ロールでは MyPage 表示のため連携を推奨します。業務ロールでも連携できます。
                          </p>
                        </div>
                        {departmentMode === 'select' && (
                          <div className="user-form-field user-form-field-animated">
                            <label htmlFor="userDepartment" className="form-label user-form-label">
                              所属部門
                              <span className="user-form-label-required">必須</span>
                            </label>
                            <div className="user-form-input-wrap">
                              <i className="bi bi-building user-form-input-icon" aria-hidden="true" />
                              <select
                                id="userDepartment"
                                className="form-select user-form-input-with-icon"
                                value={form.departmentId}
                                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                                required
                              >
                                <option value="">選択してください</option>
                                {departments.map((dept) => (
                                  <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>

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
