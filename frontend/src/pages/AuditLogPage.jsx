import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import ListSectionBar from '../components/ListSectionBar';

const ACTION_LABELS = {
  LOGIN: 'ログイン',
  MFA_VERIFY: '二段階認証',
  MFA_RECOVERY_USED: '復旧コード使用',
  MFA_ENABLE: '二段階認証有効化',
  MFA_DISABLE: '二段階認証無効化',
  MFA_RECOVERY_REGENERATE: '復旧コード再発行',
  USER_CREATE: 'ユーザー作成',
  USER_UPDATE: 'ユーザー更新',
  USER_DELETE: 'ユーザー削除',
  EMPLOYEE_CREATE: '社員登録',
  EMPLOYEE_UPDATE: '社員更新',
  EMPLOYEE_DELETE: '社員削除',
  CONFIRM_HIRE: '採用確定',
  SUGGESTION_APPLY: '状態提案適用',
  SUGGESTION_DISMISS: '状態提案無視',
  ASSIGNMENT_CANCEL: '配属取消',
  STATUS_MAINTENANCE: '状態メンテナンス',
};

const ACTION_TONES = {
  LOGIN: 'auth',
  MFA_VERIFY: 'auth',
  MFA_RECOVERY_USED: 'auth',
  MFA_ENABLE: 'auth',
  MFA_DISABLE: 'auth',
  MFA_RECOVERY_REGENERATE: 'auth',
  USER_CREATE: 'user',
  USER_UPDATE: 'user',
  USER_DELETE: 'user',
  EMPLOYEE_CREATE: 'employee',
  EMPLOYEE_UPDATE: 'employee',
  EMPLOYEE_DELETE: 'employee',
  CONFIRM_HIRE: 'project',
  SUGGESTION_APPLY: 'status',
  SUGGESTION_DISMISS: 'status',
  ASSIGNMENT_CANCEL: 'project',
  STATUS_MAINTENANCE: 'status',
};

function formatDateTime(value) {
  if (!value) return '—';
  const normalized = value.replace('T', ' ').slice(0, 19);
  const [date, time] = normalized.split(' ');
  if (!date || !time) return normalized;
  return `${date.replace(/-/g, '/')} ${time}`;
}

function formatEntity(entityType, entityId) {
  if (!entityType) return '—';
  const labels = {
    auth_user: 'ユーザー',
    employee: '社員',
    user: 'ユーザー',
    project: '案件',
    candidate: '候補者',
    assignment: '配属',
    suggestion: '状態提案',
  };
  const label = labels[entityType] || entityType;
  return entityId ? `${label} #${entityId}` : label;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (actionFilter) params.action = actionFilter;
      setLogs(await api.listAuditLogs(params));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page audit-log-page">
      <PageHeader
        guideId="audit-log"
        icon="bi-journal-text"
        iconClassName="audit-log-page-icon"
        title="操作監査ログ"
        lead="ログイン・権限変更・社員操作など重要操作の記録"
      >
        <Link to="/users" className="btn btn-outline-secondary app-btn">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          ユーザー管理に戻る
        </Link>
      </PageHeader>

      <section className="table-section list-section-panel audit-log-section">
        <ListSectionBar icon="bi-clock-history" title="ログ一覧" count={logs.length} hideCount={loading} />

        <div className="list-section-body audit-log-body">
          <div className="audit-log-toolbar">
            <div className="audit-log-filter">
              <label htmlFor="auditActionFilter" className="audit-log-filter-label">
                <i className="bi bi-sliders" aria-hidden="true" />
                操作種別
              </label>
              <select
                id="auditActionFilter"
                className="form-select form-select-sm audit-log-filter-select"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">すべて</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm app-btn audit-log-refresh-btn"
              onClick={loadData}
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise" aria-hidden="true" />
              更新
            </button>
          </div>

          {loading ? (
            <div className="page-state-panel audit-log-state">
              <div className="spinner-border text-primary" role="status" />
              <p className="mb-0 text-muted small">ログを読み込んでいます…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="page-state-panel audit-log-state">
              <i className="bi bi-inbox audit-log-empty-icon" aria-hidden="true" />
              <p className="mb-0 text-muted">該当する監査ログがありません。</p>
            </div>
          ) : (
            <div className="audit-log-table-wrap">
              <table className="table align-middle mb-0 audit-log-table">
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>ユーザー</th>
                    <th>操作</th>
                    <th>対象</th>
                    <th>詳細</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const tone = ACTION_TONES[log.action] || 'default';
                    return (
                      <tr key={log.id}>
                        <td className="audit-log-time">
                          <span className="audit-log-time-date">{formatDateTime(log.occurredAt)}</span>
                        </td>
                        <td>
                          <span className="audit-log-user">
                            <i className="bi bi-person-circle" aria-hidden="true" />
                            {log.username}
                          </span>
                        </td>
                        <td>
                          <span className={`audit-log-action-badge audit-log-action-badge--${tone}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="audit-log-entity">{formatEntity(log.entityType, log.entityId)}</td>
                        <td className="audit-log-detail">{log.detail || '—'}</td>
                        <td className="audit-log-ip">
                          <code>{log.ipAddress || '—'}</code>
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

      <AppFooter />
    </div>
  );
}
