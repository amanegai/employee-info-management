import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';
import SectionCard from '../SectionCard';
import CandidateStageProgress from '../../CandidateStageProgress';
import { canWriteProjectFeatures } from '../../../auth';
import { useAuth } from '../../../context/AuthContext';
import { useAppMessage } from '../../../context/MessageContext';
import {
  assignmentStatusClass,
  assignmentStatusLabel,
  candidateCloseReasonLabel,
  candidateStageClass,
  candidateStageLabel,
  getCandidateEndedDate,
  getCandidateMatchedDate,
  isCandidateHistory,
  isCandidateInPipeline,
} from '../../../utils/projectWorkflow';

const EMPTY_EDIT = { startDate: '', endDate: '', notes: '' };
const EMPTY_CANCEL_ACK = {
  lostNotRestored: false,
  reProposedChecked: false,
  headcountChecked: false,
  cancelReason: '',
};

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

function formatAssignmentPeriod(startDate, endDate) {
  if (!startDate && !endDate) return '—';
  if (startDate && endDate) return `${startDate} ～ ${endDate}`;
  if (startDate) return `${startDate} ～`;
  return `～ ${endDate}`;
}

function projectLinkState(employeeId) {
  return {
    from: `/employees/${employeeId}`,
    fromLabel: '案件・配属に戻る',
    employeeTab: 'projects',
  };
}

const CANCEL_CHECK_ITEMS = [
  {
    key: 'lostNotRestored',
    icon: 'bi-x-circle',
    title: '他案件の選考は自動では戻らない',
    detail: '必要なら、あらためて候補追加やマッチングを行ってください。',
  },
  {
    key: 'reProposedChecked',
    icon: 'bi-diagram-3',
    title: '再提案が必要か確認した',
    detail: '他案件への提案やマッチングが必要か判断しました。',
  },
  {
    key: 'headcountChecked',
    icon: 'bi-people',
    title: '案件の人数・状態を確認した',
    detail: '確定人数や案件の募集状態を更新する必要があるか確認しました。',
  },
];

function assignmentEditNote(assignmentStatus, employeeWorkStatus) {
  if (assignmentStatus !== 'ACTIVE') return null;
  if (employeeWorkStatus === '案件終了間近') {
    return '終了日を延ばすと、社員の「案件終了間近」表示が解除されることがあります。';
  }
  if (employeeWorkStatus === '稼働中') {
    return '終了日の変更は、間近判定や社員状態の提案に影響する場合があります。';
  }
  if (employeeWorkStatus === '待機中') {
    return '社員は現在「待機中」です。期間を変更すると、稼働開始タイミングや状態提案に影響する場合があります。';
  }
  return '配属期間の変更は、社員状態の自動提案に影響する場合があります。';
}

export default function ProjectsTab({ employeeId, employeeWorkStatus = '' }) {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canEdit = canWriteProjectFeatures(user);
  const [assignments, setAssignments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [openFollowups, setOpenFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [cancelingAssignment, setCancelingAssignment] = useState(null);
  const [cancelAck, setCancelAck] = useState(EMPTY_CANCEL_ACK);
  const [editError, setEditError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        api.getEmployeeAssignments(employeeId),
        api.getEmployeeCandidates(employeeId),
      ];
      if (canEdit) {
        requests.push(api.getEmployeeCancelFollowups(employeeId, { status: 'OPEN' }));
      }
      const results = await Promise.all(requests);
      setAssignments(results[0]);
      setCandidates(results[1]);
      setOpenFollowups(canEdit ? results[2] ?? [] : []);
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [employeeId, showMessage, canEdit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pipelineCandidates = candidates
    .filter((c) => isCandidateInPipeline(c.stage))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const historyCandidates = candidates
    .filter((c) => isCandidateHistory(c.stage))
    .sort((a, b) => {
      const ended = getCandidateEndedDate(b).localeCompare(getCandidateEndedDate(a));
      if (ended !== 0) return ended;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  const activeCandidateCount = pipelineCandidates.length;
  const nextPlanned = assignments.find((a) => a.status === 'PLANNED' && a.primary);

  function openEdit(assignment) {
    setEditingAssignment(assignment);
    setEditError('');
    setEditForm({
      startDate: assignment.startDate || '',
      endDate: assignment.endDate || '',
      notes: assignment.notes || '',
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingAssignment) return;
    setEditError('');
    setSaving(true);
    try {
      await api.updateAssignment(editingAssignment.id, editForm);
      showMessage('配属情報を更新しました');
      setEditingAssignment(null);
      await loadData();
    } catch (err) {
      setEditError(err.message || '保存に失敗しました');
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  function openCancel(assignment) {
    setCancelingAssignment(assignment);
    setCancelError('');
    setCancelAck(EMPTY_CANCEL_ACK);
  }

  const cancelAckComplete =
    cancelAck.lostNotRestored && cancelAck.reProposedChecked && cancelAck.headcountChecked;

  async function handleCancelSubmit(e) {
    e.preventDefault();
    if (!cancelingAssignment || !cancelAckComplete) return;
    setCancelError('');
    setSaving(true);
    try {
      await api.cancelAssignment(cancelingAssignment.id, {
        cancelReason: cancelAck.cancelReason.trim() || 'MANUAL',
      });
      showMessage('配属を取消し、フォロータスクを作成しました');
      setCancelingAssignment(null);
      await loadData();
    } catch (err) {
      setCancelError(err.message || '取消に失敗しました');
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  const cancelAckCount = [
    cancelAck.lostNotRestored,
    cancelAck.reProposedChecked,
    cancelAck.headcountChecked,
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="page-state-panel">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <>
      {openFollowups.length > 0 && (
        <div className="cancel-followup-banner mb-3" role="status">
          <div className="cancel-followup-banner-icon" aria-hidden="true">
            <i className="bi bi-exclamation-triangle-fill" />
          </div>
          <div className="cancel-followup-banner-body">
            <strong>配属取消フォローが {openFollowups.length} 件未完了です</strong>
            <p className="mb-0 small">
              LOST選考は自動復元されません。再提案・案件マッチングの実施状況を確認してください。
            </p>
          </div>
          <Link to="/project-match" className="btn btn-sm btn-warning app-btn cancel-followup-banner-action">
            再提案する
          </Link>
        </div>
      )}

      {(activeCandidateCount > 0 || nextPlanned) && (
        <div className="employee-project-hints mb-3">
          {activeCandidateCount > 0 && (
            <span className="employee-project-hint-badge">
              <i className="bi bi-diagram-3" aria-hidden="true" />
              選考中 {activeCandidateCount} 件
            </span>
          )}
          {nextPlanned && (
            <span className="employee-project-hint-badge is-planned">
              <i className="bi bi-calendar-check" aria-hidden="true" />
              次配属 {nextPlanned.startDate} 開始予定（{nextPlanned.projectName}）
            </span>
          )}
        </div>
      )}

      <SectionCard title="配属履歴" icon="bi-briefcase-fill" variant="indigo">
        {assignments.length === 0 ? (
          <p className="text-muted mb-0">配属履歴がありません。</p>
        ) : (
          <ul className="assignment-history-list">
            {assignments.map((assignment) => {
              const clientLabel = displayClientName(assignment.clientName);
              const editable = ['PLANNED', 'ACTIVE'].includes(assignment.status);
              return (
                <li key={assignment.id} className="assignment-history-item">
                  <div className="assignment-history-body">
                    <div className="assignment-history-head">
                      <Link
                        to={`/projects/${assignment.projectId}`}
                        state={projectLinkState(employeeId)}
                        className="assignment-history-project-link"
                      >
                        {displayProjectName(assignment.projectName, assignment.projectId)}
                      </Link>
                      <div className="assignment-history-badges">
                        <span className={`assignment-status ${assignmentStatusClass(assignment.status)}`}>
                          {assignmentStatusLabel(assignment.status)}
                        </span>
                        {assignment.primary && (
                          <span className="assignment-primary-badge">主配属</span>
                        )}
                      </div>
                    </div>
                    {clientLabel && (
                      <div className="assignment-history-client">
                        <i className="bi bi-building" aria-hidden="true" />
                        {clientLabel}
                      </div>
                    )}
                    <div className="assignment-history-period">
                      <i className="bi bi-calendar3" aria-hidden="true" />
                      {formatAssignmentPeriod(assignment.startDate, assignment.endDate)}
                    </div>
                    {assignment.notes && (
                      <div className="assignment-history-notes">{assignment.notes}</div>
                    )}
                  </div>
                  {canEdit && editable && (
                    <div className="assignment-history-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary app-btn assignment-history-action-btn"
                        disabled={saving}
                        onClick={() => openEdit(assignment)}
                      >
                        <i className="bi bi-pencil-square" aria-hidden="true" />
                        編集
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger app-btn assignment-history-action-btn"
                        disabled={saving}
                        onClick={() => openCancel(assignment)}
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                        取消
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="選考中案件" icon="bi-people-fill" variant="amber" className="mt-3">
        {pipelineCandidates.length === 0 ? (
          <p className="text-muted mb-0">進行中の選考はありません。</p>
        ) : (
          <div className="employee-candidate-table-wrap">
            <table className="table table-hover align-middle mb-0 employee-candidate-table project-workflow-table">
              <colgroup>
                <col className="employee-candidate-col-project" />
                <col className="employee-candidate-col-progress" />
                <col className="employee-candidate-col-score" />
                <col className="employee-candidate-col-date" />
              </colgroup>
              <thead className="table-light">
                <tr>
                  <th className="employee-candidate-th-text">案件</th>
                  <th className="employee-candidate-th-progress">選考進捗</th>
                  <th className="employee-candidate-th-meta">スコア</th>
                  <th className="employee-candidate-th-meta">更新日</th>
                </tr>
              </thead>
              <tbody>
                {pipelineCandidates.map((candidate) => (
                  <tr key={candidate.id} className="employee-candidate-row">
                    <td className="employee-candidate-cell-project">
                      <Link
                        to={`/projects/${candidate.projectId}`}
                        state={projectLinkState(employeeId)}
                        className="employee-candidate-project-link"
                      >
                        {displayProjectName(candidate.projectName, candidate.projectId)}
                      </Link>
                      {displayClientName(candidate.clientName) && (
                        <div className="employee-candidate-client">{displayClientName(candidate.clientName)}</div>
                      )}
                    </td>
                    <td className="employee-candidate-cell-progress">
                      <CandidateStageProgress stage={candidate.stage} compact />
                    </td>
                    <td className="employee-candidate-cell-meta">
                      {candidate.matchScore != null ? (
                        <span className="employee-candidate-score">{candidate.matchScore}%</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="employee-candidate-cell-meta">
                      {candidate.updatedAt?.slice(0, 10) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="選考案件履歴" icon="bi-clock-history" variant="slate" className="mt-3">
        {historyCandidates.length === 0 ? (
          <p className="text-muted mb-0">選考案件の履歴はありません。</p>
        ) : (
          <div className="employee-candidate-table-wrap">
            <table className="table table-hover align-middle mb-0 employee-candidate-table employee-candidate-history-table project-workflow-table">
              <colgroup>
                <col className="employee-candidate-col-project" />
                <col className="employee-candidate-col-matched" />
                <col className="employee-candidate-col-result" />
                <col className="employee-candidate-col-ended" />
                <col className="employee-candidate-col-score" />
              </colgroup>
              <thead className="table-light">
                <tr>
                  <th className="employee-candidate-th-text">案件</th>
                  <th className="employee-candidate-th-meta">マッチング日</th>
                  <th className="employee-candidate-th-meta">結果</th>
                  <th className="employee-candidate-th-meta">終了日</th>
                  <th className="employee-candidate-th-meta">スコア</th>
                </tr>
              </thead>
              <tbody>
                {historyCandidates.map((candidate) => {
                  const closeDetail = candidateCloseReasonLabel(candidate.closeReason);
                  return (
                    <tr key={candidate.id} className="employee-candidate-row employee-candidate-history-row">
                      <td className="employee-candidate-cell-project">
                        <Link
                          to={`/projects/${candidate.projectId}`}
                          state={projectLinkState(employeeId)}
                          className="employee-candidate-project-link"
                        >
                          {displayProjectName(candidate.projectName, candidate.projectId)}
                        </Link>
                        {displayClientName(candidate.clientName) && (
                          <div className="employee-candidate-client">{displayClientName(candidate.clientName)}</div>
                        )}
                      </td>
                      <td className="employee-candidate-cell-meta">
                        {getCandidateMatchedDate(candidate) || '—'}
                      </td>
                      <td className="employee-candidate-cell-result">
                        <span className={`project-candidate-stage ${candidateStageClass(candidate.stage)}`}>
                          {candidateStageLabel(candidate.stage)}
                        </span>
                        {closeDetail && candidate.stage !== 'CONFIRMED' && (
                          <div className="employee-candidate-close-reason">{closeDetail}</div>
                        )}
                      </td>
                      <td className="employee-candidate-cell-meta">
                        {getCandidateEndedDate(candidate) || '—'}
                      </td>
                      <td className="employee-candidate-cell-meta">
                        {candidate.matchScore != null ? (
                          <span className="employee-candidate-score">{candidate.matchScore}%</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {editingAssignment && (
        <>
          <div
            className="modal fade show d-block assignment-modal-root assignment-modal-edit-root"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered assignment-modal-dialog">
              <div className="modal-content assignment-modal-content">
                <form onSubmit={handleSaveEdit}>
                  <div className="modal-header assignment-modal-header assignment-modal-header-edit">
                    <div className="assignment-modal-header-main">
                      <span className="assignment-modal-header-icon" aria-hidden="true">
                        <i className="bi bi-pencil-square" />
                      </span>
                      <div>
                        <h2 className="modal-title h5 mb-0">配属編集</h2>
                        <p className="assignment-modal-subtitle mb-0">
                          {displayProjectName(editingAssignment.projectName, editingAssignment.projectId)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      aria-label="閉じる"
                      onClick={() => setEditingAssignment(null)}
                    />
                  </div>
                  <div className="modal-body assignment-modal-body">
                    {editError && (
                      <div className="assignment-modal-feedback assignment-modal-feedback-error" role="alert">
                        <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
                        <span>{editError}</span>
                      </div>
                    )}
                    <div className="assignment-modal-summary">
                      <div className="assignment-modal-summary-item">
                        <span className="assignment-modal-summary-label">状態</span>
                        <span className={`assignment-status ${assignmentStatusClass(editingAssignment.status)}`}>
                          {assignmentStatusLabel(editingAssignment.status)}
                        </span>
                      </div>
                      {displayClientName(editingAssignment.clientName) && (
                        <div className="assignment-modal-summary-item">
                          <span className="assignment-modal-summary-label">取引先</span>
                          <span className="assignment-modal-summary-value">{displayClientName(editingAssignment.clientName)}</span>
                        </div>
                      )}
                      <div className="assignment-modal-summary-item">
                        <span className="assignment-modal-summary-label">現在の期間</span>
                        <span className="assignment-modal-summary-value">
                          {formatAssignmentPeriod(editingAssignment.startDate, editingAssignment.endDate)}
                        </span>
                      </div>
                    </div>
                    {(() => {
                      const editNote = assignmentEditNote(editingAssignment.status, employeeWorkStatus);
                      if (!editNote) return null;
                      return (
                        <div className="assignment-modal-note">
                          <i className="bi bi-info-circle" aria-hidden="true" />
                          <span className="assignment-modal-note-text">{editNote}</span>
                        </div>
                      );
                    })()}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label htmlFor="editStartDate" className="form-label assignment-modal-label">
                          <i className="bi bi-calendar-event" aria-hidden="true" />
                          開始日
                        </label>
                        <input
                          id="editStartDate"
                          type="date"
                          className="form-control"
                          value={editForm.startDate}
                          onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="editEndDate" className="form-label assignment-modal-label">
                          <i className="bi bi-calendar-x" aria-hidden="true" />
                          終了日
                        </label>
                        <input
                          id="editEndDate"
                          type="date"
                          className="form-control"
                          value={editForm.endDate}
                          onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                        />
                      </div>
                      <div className="col-12">
                        <label htmlFor="editNotes" className="form-label assignment-modal-label">
                          <i className="bi bi-chat-left-text" aria-hidden="true" />
                          備考
                        </label>
                        <textarea
                          id="editNotes"
                          className="form-control"
                          rows={3}
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          placeholder="配属に関するメモ（任意）"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer assignment-modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary app-btn"
                      onClick={() => setEditingAssignment(null)}
                    >
                      キャンセル
                    </button>
                    <button type="submit" className="btn btn-primary app-btn" disabled={saving}>
                      <i className="bi bi-check-lg" aria-hidden="true" />
                      {saving ? '保存中…' : '保存'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {cancelingAssignment && (
        <>
          <div
            className="modal fade show d-block assignment-modal-root assignment-modal-cancel-root"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered assignment-modal-dialog">
              <div className="modal-content assignment-modal-content">
                <form onSubmit={handleCancelSubmit}>
                  <div className="modal-header assignment-modal-header assignment-modal-header-cancel">
                    <div className="assignment-modal-header-main">
                      <span className="assignment-modal-header-icon" aria-hidden="true">
                        <i className="bi bi-exclamation-triangle-fill" />
                      </span>
                      <div>
                        <h2 className="modal-title h5 mb-0">配属取消確認</h2>
                        <p className="assignment-modal-subtitle mb-0">
                          {displayProjectName(cancelingAssignment.projectName, cancelingAssignment.projectId)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      aria-label="閉じる"
                      onClick={() => setCancelingAssignment(null)}
                    />
                  </div>
                  <div className="modal-body assignment-modal-body">
                    {cancelError && (
                      <div className="assignment-modal-feedback assignment-modal-feedback-error" role="alert">
                        <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
                        <span>{cancelError}</span>
                      </div>
                    )}
                    <div className="assignment-modal-warning">
                      <strong>配属を取り消すと、他案件の選考は自動では元に戻りません。</strong>
                      <span>下の 3 点を確認してから実行してください。取消後はフォロータスクが作成されます。</span>
                    </div>
                    <div className="assignment-cancel-progress" aria-live="polite">
                      確認済 {cancelAckCount} / {CANCEL_CHECK_ITEMS.length}
                    </div>
                    <div className="assignment-cancel-checklist">
                      {CANCEL_CHECK_ITEMS.map((item) => {
                        const checked = cancelAck[item.key];
                        return (
                          <label
                            key={item.key}
                            className={`assignment-cancel-check-item${checked ? ' is-checked' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="assignment-cancel-check-input"
                              checked={checked}
                              onChange={(e) =>
                                setCancelAck({ ...cancelAck, [item.key]: e.target.checked })
                              }
                              required
                            />
                            <span className="assignment-cancel-check-icon" aria-hidden="true">
                              <i className={`bi ${item.icon}`} />
                            </span>
                            <span className="assignment-cancel-check-text">
                              <strong>{item.title}</strong>
                              <span>{item.detail}</span>
                            </span>
                            <span className="assignment-cancel-check-mark" aria-hidden="true">
                              <i className={`bi ${checked ? 'bi-check-circle-fill' : 'bi-circle'}`} />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="assignment-modal-field">
                      <label htmlFor="cancelReason" className="form-label assignment-modal-label">
                        <i className="bi bi-chat-left-text" aria-hidden="true" />
                        取消理由（任意）
                      </label>
                      <input
                        id="cancelReason"
                        type="text"
                        className="form-control"
                        value={cancelAck.cancelReason}
                        onChange={(e) => setCancelAck({ ...cancelAck, cancelReason: e.target.value })}
                        placeholder="例: 顧客都合、スケジュール変更"
                      />
                    </div>
                  </div>
                  <div className="modal-footer assignment-modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary app-btn"
                      onClick={() => setCancelingAssignment(null)}
                    >
                      戻る
                    </button>
                    <button
                      type="submit"
                      className="btn btn-danger app-btn"
                      disabled={saving || !cancelAckComplete}
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                      {saving ? '処理中…' : '取消してフォロー作成'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </>
  );
}
