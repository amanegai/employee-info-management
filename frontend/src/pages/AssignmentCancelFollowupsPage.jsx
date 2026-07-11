import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import ListSectionBar from '../components/ListSectionBar';
import { canManageUsers, canWriteProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';
import PageHeader from '../components/PageHeader';

const EMPTY_RESOLVE = { notes: '', reProposedInOtherProject: false, reMatched: false };

const PAGE_PATH = '/assignment-cancel-followups';
const PAGE_LABEL = '配属取消フォローに戻る';

const NAV_STATE = {
  from: PAGE_PATH,
  fromLabel: PAGE_LABEL,
};

const FOLLOWUP_SUMMARY = '他案件への再提案・マッチングが必要か確認してください。';

const PLACEHOLDER_PROJECT = '（案件名未設定）';
const PLACEHOLDER_CLIENT = '（取引先未設定）';

function displayProjectName(name, projectId) {
  if (!name || name === PLACEHOLDER_PROJECT) return `案件 #${projectId}`;
  return name;
}

function displayClientName(name) {
  if (!name || name === PLACEHOLDER_CLIENT) return null;
  return name;
}

function formatFollowupSummary(notes) {
  if (!notes) return FOLLOWUP_SUMMARY;
  if (notes.includes('LOST選考') || notes.includes('配属取消')) {
    return FOLLOWUP_SUMMARY;
  }
  return notes;
}

export default function AssignmentCancelFollowupsPage() {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canEdit = canWriteProjectFeatures(user);
  const isAdmin = canManageUsers(user);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [resolvingItem, setResolvingItem] = useState(null);
  const [resolveForm, setResolveForm] = useState(EMPTY_RESOLVE);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setFollowups(await api.getCancelFollowups({ status: 'OPEN' }));
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openResolve(item) {
    setResolvingItem(item);
    setResolveForm(EMPTY_RESOLVE);
  }

  async function handleResolveSubmit(e) {
    e.preventDefault();
    if (!resolvingItem) return;
    setProcessingId(resolvingItem.id);
    try {
      await api.resolveCancelFollowup(resolvingItem.id, resolveForm);
      showMessage('フォロータスクを完了しました');
      setResolvingItem(null);
      await loadData();
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDismiss(id) {
    if (!window.confirm('このフォロータスクを管理者として無視しますか？')) return;
    setProcessingId(id);
    try {
      await api.dismissCancelFollowup(id);
      showMessage('フォロータスクを無視しました');
      await loadData();
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page cancel-followup-page">
      <PageHeader
        guideId="assignment-cancel-followups"
        icon="bi-exclamation-triangle"
        iconClassName="cancel-followup-page-icon"
        title="配属取消フォロー"
        lead="配属取消後、再提案・マッチングの確認が必要なタスクです。"
      />

      <section className="table-section list-section-panel cancel-followup-panel">
        <ListSectionBar icon="bi-bell" title="未完了タスク" count={followups.length} hideCount={loading} />
        {loading ? (
          <div className="page-state-panel">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : followups.length === 0 ? (
          <div className="page-state-panel cancel-followup-empty">
            <span className="cancel-followup-empty-icon" aria-hidden="true">
              <i className="bi bi-check2-circle" />
            </span>
            <p className="mb-0">未完了の配属取消フォローはありません。</p>
          </div>
        ) : (
          <div className="cancel-followup-list" data-guide="cancel-followup-list">
            {followups.map((item) => {
              const clientName = displayClientName(item.clientName);
              return (
                <article
                  key={item.id}
                  className={`cancel-followup-card${item.overdue ? ' is-overdue' : ''}`}
                >
                  <div className="cancel-followup-top">
                    <div className="cancel-followup-head">
                      <Link
                        to={`/employees/${item.employeeId}`}
                        state={NAV_STATE}
                        className="cancel-followup-employee-link"
                      >
                        {item.employeeName}
                      </Link>
                      <span className="cancel-followup-head-sep" aria-hidden="true">
                        ·
                      </span>
                      {item.projectId ? (
                        <Link
                          to={`/projects/${item.projectId}`}
                          state={NAV_STATE}
                          className="cancel-followup-project-link"
                        >
                          {displayProjectName(item.projectName, item.projectId)}
                        </Link>
                      ) : (
                        <span className="cancel-followup-project-empty">—</span>
                      )}
                      {clientName && <span className="cancel-followup-client">{clientName}</span>}
                    </div>

                    {canEdit && (
                      <div className="cancel-followup-action-buttons">
                        <button
                          type="button"
                          className="btn btn-sm btn-success app-btn cancel-followup-action-btn"
                          disabled={processingId === item.id}
                          onClick={() => openResolve(item)}
                        >
                          <i className="bi bi-check-lg" aria-hidden="true" />
                          完了
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary app-btn cancel-followup-action-btn"
                            disabled={processingId === item.id}
                            onClick={() => handleDismiss(item.id)}
                          >
                            <i className="bi bi-x-lg" aria-hidden="true" />
                            無視
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="cancel-followup-bottom">
                    <p className="cancel-followup-summary">{formatFollowupSummary(item.notes)}</p>
                    <div className="cancel-followup-meta-row">
                      <span className="cancel-followup-meta-chip">
                        <i className="bi bi-calendar-x" aria-hidden="true" />
                        取消 {item.createdAt?.slice(0, 10) || '—'}
                      </span>
                      <span
                        className={`cancel-followup-meta-chip${item.overdue ? ' is-overdue' : ''}`}
                      >
                        <i className="bi bi-alarm" aria-hidden="true" />
                        期限 {item.dueDate || '—'}
                        {item.overdue && <span className="cancel-followup-overdue-label">期限超過</span>}
                      </span>
                      <span className="cancel-followup-meta-chip">
                        <i className="bi bi-person" aria-hidden="true" />
                        担当 {item.assignedToDisplayName || '—'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {resolvingItem && (
        <>
          <div
            className="modal fade show d-block assignment-modal-root assignment-modal-edit-root"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered assignment-modal-dialog">
              <div className="modal-content assignment-modal-content">
                <form onSubmit={handleResolveSubmit}>
                  <div className="modal-header assignment-modal-header assignment-modal-header-edit">
                    <div className="assignment-modal-header-main">
                      <span className="assignment-modal-header-icon" aria-hidden="true">
                        <i className="bi bi-check2-circle" />
                      </span>
                      <div>
                        <h2 className="modal-title h5 mb-0">フォロー完了</h2>
                        <p className="assignment-modal-subtitle mb-0">
                          {resolvingItem.employeeName}
                          {' · '}
                          {displayProjectName(resolvingItem.projectName, resolvingItem.projectId)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      aria-label="閉じる"
                      onClick={() => setResolvingItem(null)}
                    />
                  </div>
                  <div className="modal-body assignment-modal-body">
                    <div className="assignment-modal-note">
                      <i className="bi bi-info-circle" aria-hidden="true" />
                      <span className="assignment-modal-note-text">
                        {formatFollowupSummary(resolvingItem.notes)}
                      </span>
                    </div>
                    <div className="cancel-followup-resolve-checks">
                      <label className="cancel-followup-resolve-check">
                        <input
                          type="checkbox"
                          checked={resolveForm.reProposedInOtherProject}
                          onChange={(e) =>
                            setResolveForm({ ...resolveForm, reProposedInOtherProject: e.target.checked })
                          }
                        />
                        <span>他案件へ再提案済</span>
                      </label>
                      <label className="cancel-followup-resolve-check">
                        <input
                          type="checkbox"
                          checked={resolveForm.reMatched}
                          onChange={(e) => setResolveForm({ ...resolveForm, reMatched: e.target.checked })}
                        />
                        <span>再マッチング実施済</span>
                      </label>
                    </div>
                    <div className="assignment-modal-field mb-0">
                      <label htmlFor="resolveNotes" className="form-label assignment-modal-label">
                        <i className="bi bi-chat-left-text" aria-hidden="true" />
                        備考（任意）
                      </label>
                      <textarea
                        id="resolveNotes"
                        className="form-control"
                        rows={2}
                        value={resolveForm.notes}
                        onChange={(e) => setResolveForm({ ...resolveForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-footer assignment-modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary app-btn"
                      onClick={() => setResolvingItem(null)}
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success app-btn"
                      disabled={processingId === resolvingItem.id}
                    >
                      {processingId === resolvingItem.id ? '保存中…' : '完了にする'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      <AppFooter />
    </div>
  );
}
