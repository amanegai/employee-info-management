import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import ListSectionBar from '../components/ListSectionBar';
import { canManageUsers, canWriteProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';
import { workStatusClass } from '../utils';
import {
  formatStatusSuggestionEndDate,
  formatStatusSuggestionReason,
} from '../utils/statusSuggestionDisplay';
import PageHeader from '../components/PageHeader';

const EMPLOYEE_LINK_STATE = {
  from: '/employee-status/suggestions',
  fromLabel: '状態変更提案に戻る',
};

export default function EmployeeStatusSuggestionsPage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canEdit = canWriteProjectFeatures(user);
  const isAdmin = canManageUsers(user);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setSuggestions(await api.getStatusSuggestions({ status: 'PENDING' }));
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRunMaintenance() {
    setRunning(true);
    try {
      const result = await api.runStatusMaintenance();
      showMessage(
        `メンテナンス完了: 提案 ${result.suggestionsCreated} 件 / 適用 ${result.statusChangesApplied} 件 / 配属更新 ${result.assignmentsUpdated} 件`
      );
      await loadData();
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setRunning(false);
    }
  }

  async function handleApply(id) {
    setProcessingId(id);
    try {
      await api.applyStatusSuggestion(id);
      showMessage('状態提案を適用しました');
      await loadData();
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDismiss(id) {
    setProcessingId(id);
    try {
      await api.dismissStatusSuggestion(id);
      showMessage('状態提案を無視しました');
      await loadData();
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page status-suggestion-page">
      <PageHeader
        guideId="status-suggestions"
        icon="bi-arrow-repeat"
        iconClassName="status-suggestion-page-icon"
        title="状態変更提案"
        lead="社員状態の変更候補を確認し、適用または無視してください。"
      >
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary app-btn status-suggestion-maint-btn"
            data-guide="status-suggestion-maint"
            disabled={running}
            onClick={handleRunMaintenance}
          >
            <i className="bi bi-play-fill" aria-hidden="true" />
            {running ? '実行中…' : 'メンテナンス実行'}
          </button>
        )}
      </PageHeader>

      <section className="table-section list-section-panel status-suggestion-panel">
        <ListSectionBar icon="bi-bell" title="未処理提案" count={suggestions.length} hideCount={loading} />
        {loading ? (
          <div className="page-state-panel">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="page-state-panel status-suggestion-empty">
            <span className="status-suggestion-empty-icon" aria-hidden="true">
              <i className="bi bi-check2-circle" />
            </span>
            <p className="mb-0">未処理の状態変更提案はありません。</p>
          </div>
        ) : (
          <div className="status-suggestion-list" data-guide="status-suggestion-list">
            {suggestions.map((item) => (
              <article key={item.id} className="status-suggestion-card">
                <Link
                  to={`/employees/${item.employeeId}`}
                  state={EMPLOYEE_LINK_STATE}
                  className="status-suggestion-employee-link"
                >
                  {item.employeeName}
                </Link>

                <div className="status-suggestion-flow" aria-label="状態変更">
                  <span className={`badge status-badge ${workStatusClass(item.currentWorkStatus)}`}>
                    {item.currentWorkStatus}
                  </span>
                  <span className="status-suggestion-flow-arrow" aria-hidden="true">
                    <i className="bi bi-arrow-right" />
                  </span>
                  <span className={`badge status-badge ${workStatusClass(item.suggestedStatus)}`}>
                    {item.suggestedStatus}
                  </span>
                </div>

                <p className="status-suggestion-reason">
                  {formatStatusSuggestionReason(item.reason, item)}
                </p>

                <div className="status-suggestion-card-meta">
                  {item.suggestedEndDate ? (
                    <span className="status-suggestion-meta-item">
                      <i className="bi bi-calendar-event" aria-hidden="true" />
                      {formatStatusSuggestionEndDate(item.suggestedEndDate, item.suggestedStatus)}
                    </span>
                  ) : null}
                  <time className="status-suggestion-date" dateTime={item.createdAt?.slice(0, 10)}>
                    {item.createdAt?.slice(0, 10) || '—'}
                  </time>
                </div>

                {canEdit && (
                  <div className="status-suggestion-action-buttons">
                    <button
                      type="button"
                      className="btn btn-sm btn-success app-btn status-suggestion-action-btn"
                      disabled={processingId === item.id}
                      onClick={() => handleApply(item.id)}
                    >
                      <i className="bi bi-check-lg" aria-hidden="true" />
                      適用
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary app-btn status-suggestion-action-btn"
                      disabled={processingId === item.id}
                      onClick={() => handleDismiss(item.id)}
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" />
                      無視
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <AppFooter />
    </div>
  );
}
