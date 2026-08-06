import { Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { canReviewBpReferral, canWriteProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';
import { excludeParentDepartments } from '../utils';
import BpHelpReferralProgress, { bpReferralStatusLabel } from './BpHelpReferralProgress';

const DEFAULT_BP_DEPARTMENT_ID = 9; // 営業部
const RESUME_PURGED_STATUSES = new Set(['REJECTED', 'CLIENT_REJECTED', 'DECLINED', 'WITHDRAWN']);

function isResumePurged(status) {
  return RESUME_PURGED_STATUSES.has(status);
}

function formatDateTime(value) {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 16);
}

function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return '—';
  const size = Number(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function emptyForm() {
  return { candidateName: '', bpCompanyName: '', note: '', resume: null };
}

function emptyHireForm(project, departments = []) {
  const hasDefault = departments.some((d) => Number(d.id) === DEFAULT_BP_DEPARTMENT_ID);
  return {
    departmentId: hasDefault
      ? String(DEFAULT_BP_DEPARTMENT_ID)
      : departments[0]
        ? String(departments[0].id)
        : '',
    startDate: project?.expectedStartDate || '',
    endDate: project?.expectedEndDate || '',
    notes: '',
  };
}

export default function BpHelpReferralPanel({ project, enabled, onProjectChanged }) {
  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canSubmit = canWriteProjectFeatures(user) && enabled;
  const canReview = canReviewBpReferral(user, project);
  const fileInputRef = useRef(null);

  const [referrals, setReferrals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [hireTarget, setHireTarget] = useState(null);
  const [hireForm, setHireForm] = useState(() => emptyHireForm(project));

  const loadReferrals = useCallback(async () => {
    if (!project?.id) return;
    try {
      setReferrals(await api.getBpHelpReferrals(project.id));
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [project?.id, showMessage]);

  useEffect(() => {
    setLoading(true);
    loadReferrals();
  }, [loadReferrals]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const master = await api.getMaster();
        if (cancelled) return;
        setDepartments(excludeParentDepartments(master?.departments ?? []));
      } catch {
        /* 部門マスタが取れなくても採用自体は可能 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.candidateName.trim()) {
      showMessage('候補者名を入力してください', 'danger');
      return;
    }
    if (!form.resume) {
      showMessage('履歴書ファイルを選択してください', 'danger');
      return;
    }
    setSaving(true);
    try {
      await api.submitBpHelpReferral(project.id, {
        candidateName: form.candidateName.trim(),
        bpCompanyName: form.bpCompanyName.trim() || null,
        note: form.note.trim() || null,
        resume: form.resume,
      });
      setForm(emptyForm());
      if (fileInputRef.current) fileInputRef.current.value = '';
      showMessage('臨時候補を提出しました。案件担当へ通知されます');
      await loadReferrals();
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(referral) {
    if (!window.confirm(`${referral.candidateName} を社内承認しますか？`)) return;
    setSaving(true);
    try {
      await api.approveBpHelpReferral(referral.id);
      showMessage('臨時候補を承認しました');
      await loadReferrals();
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(referral) {
    const note = window.prompt(
      `${referral.candidateName} を却下します（履歴書ファイルも削除されます）。理由（任意）:`
    );
    if (note === null) return;
    setSaving(true);
    try {
      await api.rejectBpHelpReferral(referral.id, { note: note.trim() || null });
      showMessage('臨時候補を却下しました');
      await loadReferrals();
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitToClient(referral) {
    if (!window.confirm(`${referral.candidateName} を顧客へ提出済みにしますか？`)) return;
    setSaving(true);
    try {
      await api.submitBpHelpReferralToClient(referral.id);
      showMessage('顧客提出済に更新しました');
      await loadReferrals();
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleAdvance(referral, stage, promptInterviewAt = false) {
    let interviewAt = null;
    if (promptInterviewAt) {
      const value = window.prompt('面談予定日（任意, YYYY-MM-DD）:', referral.interviewAt || '');
      if (value === null) return;
      interviewAt = value.trim() || null;
    }
    setSaving(true);
    try {
      await api.advanceBpHelpReferralStage(referral.id, { stage, interviewAt });
      showMessage(`${bpReferralStatusLabel(stage)} に更新しました`);
      await loadReferrals();
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(referral, stage) {
    const label = bpReferralStatusLabel(stage);
    const note = window.prompt(
      `${referral.candidateName} を「${label}」にします（履歴書ファイルも削除されます）。理由（任意）:`
    );
    if (note === null) return;
    setSaving(true);
    try {
      await api.advanceBpHelpReferralStage(referral.id, { stage, note: note.trim() || null });
      showMessage(`${label} に更新しました`);
      await loadReferrals();
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  function openHire(referral) {
    setHireTarget(referral);
    setHireForm(emptyHireForm(project, departments));
  }

  function cancelHire() {
    setHireTarget(null);
  }

  async function handleHireSubmit(e) {
    e.preventDefault();
    if (!hireTarget) return;
    if (!hireForm.startDate.trim()) {
      showMessage('配属開始日は必須です', 'danger');
      return;
    }
    if (!hireForm.departmentId) {
      showMessage('所属部門を選択してください', 'danger');
      return;
    }
    if (!window.confirm(
      `${hireTarget.candidateName} を採用確定します。\n`
      + 'BP社員登録・履歴書紐付け・配属作成を一括で行います。よろしいですか？'
    )) return;
    setSaving(true);
    try {
      const result = await api.hireBpHelpReferral(hireTarget.id, {
        startDate: hireForm.startDate.trim(),
        endDate: hireForm.endDate.trim() || null,
        notes: hireForm.notes.trim() || null,
        departmentId: Number(hireForm.departmentId),
      });
      showMessage(
        `採用確定しました（社員番号: ${result.hiredEmployeeCode || '—'}）。詳細は社員画面で補完できます。`
      );
      setHireTarget(null);
      await loadReferrals();
      // 採用で社員・配属・案件人数／ステータスが変わるため、親の案件詳細も再取得する
      if (onProjectChanged) {
        await onProjectChanged();
      }
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw(referral) {
    if (!window.confirm(
      `${referral.candidateName} の提出を取り下げますか？\n履歴書ファイルも削除されます。`
    )) return;
    setSaving(true);
    try {
      await api.withdrawBpHelpReferral(referral.id);
      showMessage('臨時候補を取り下げました');
      await loadReferrals();
    } catch (err) {
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(referral) {
    try {
      await api.downloadFile(referral.resumeFileId, referral.resumeFileName || 'resume');
    } catch (err) {
      showMessage(err.message, 'danger');
    }
  }

  function renderCardActions(referral) {
    const isMine = user?.id === referral.submittedBy;
    const hiringThis = hireTarget?.id === referral.id;
    // 採用フォーム表示中は、そのカードの操作ボタンを隠す
    if (hiringThis) return null;

    return (
      <div className="bp-referral-card-actions">
        {canReview && referral.status === 'PENDING' && (
          <>
            <button type="button" className="btn btn-success btn-sm app-btn" disabled={saving} onClick={() => handleApprove(referral)}>承認</button>
            <button type="button" className="btn btn-outline-danger btn-sm app-btn" disabled={saving} onClick={() => handleReject(referral)}>却下</button>
          </>
        )}
        {canReview && referral.status === 'APPROVED' && (
          <button type="button" className="btn btn-primary btn-sm app-btn" disabled={saving} onClick={() => handleSubmitToClient(referral)}>顧客へ提出</button>
        )}
        {canReview && referral.status === 'SUBMITTED' && (
          <button type="button" className="btn btn-warning btn-sm app-btn" disabled={saving} onClick={() => handleAdvance(referral, 'INTERVIEW_SCHEDULED', true)}>面談調整へ</button>
        )}
        {canReview && referral.status === 'INTERVIEW_SCHEDULED' && (
          <>
            <button type="button" className="btn btn-warning btn-sm app-btn" disabled={saving} onClick={() => handleAdvance(referral, 'INTERVIEWING')}>面談結果待ち</button>
            <button type="button" className="btn btn-success btn-sm app-btn" disabled={saving} onClick={() => openHire(referral)}>採用確定</button>
            <button type="button" className="btn btn-outline-danger btn-sm app-btn" disabled={saving} onClick={() => handleClose(referral, 'CLIENT_REJECTED')}>不採用</button>
            <button type="button" className="btn btn-outline-secondary btn-sm app-btn" disabled={saving} onClick={() => handleClose(referral, 'DECLINED')}>辞退</button>
          </>
        )}
        {canReview && referral.status === 'INTERVIEWING' && (
          <>
            <button type="button" className="btn btn-success btn-sm app-btn" disabled={saving} onClick={() => openHire(referral)}>採用確定</button>
            <button type="button" className="btn btn-outline-danger btn-sm app-btn" disabled={saving} onClick={() => handleClose(referral, 'CLIENT_REJECTED')}>不採用</button>
            <button type="button" className="btn btn-outline-secondary btn-sm app-btn" disabled={saving} onClick={() => handleClose(referral, 'DECLINED')}>辞退</button>
          </>
        )}
        {isMine && referral.status === 'PENDING' && (
          <button type="button" className="btn btn-outline-secondary btn-sm app-btn" disabled={saving} onClick={() => handleWithdraw(referral)}>取下げ</button>
        )}
      </div>
    );
  }

  return (
    <div className="bp-referral-panel mt-4">
      <div className="bp-referral-panel-head">
        <h3 className="bp-referral-panel-title">
          <i className="bi bi-file-earmark-person" aria-hidden="true" />
          臨時候補（履歴書）
        </h3>
        <p className="bp-referral-panel-lead mb-0">
          提出 → 担当確認 → 顧客提出 → 面談 → 採用確定（その時点でBP社員登録）の流れで管理します。
        </p>
      </div>

      {canSubmit && (
        <form className="bp-referral-form" onSubmit={handleSubmit}>
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label small mb-1" htmlFor="bp-referral-name">候補者名</label>
              <input
                id="bp-referral-name"
                className="form-control form-control-sm"
                value={form.candidateName}
                onChange={(e) => setForm((prev) => ({ ...prev, candidateName: e.target.value }))}
                placeholder="例: 山田 太郎"
                disabled={saving}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-1" htmlFor="bp-referral-company">BP会社</label>
              <input
                id="bp-referral-company"
                className="form-control form-control-sm"
                value={form.bpCompanyName}
                onChange={(e) => setForm((prev) => ({ ...prev, bpCompanyName: e.target.value }))}
                placeholder="例: ○○テクノ"
                disabled={saving}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small mb-1" htmlFor="bp-referral-note">伝言・補足</label>
              <input
                id="bp-referral-note"
                className="form-control form-control-sm"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="例: Java 5年、来週面談可"
                disabled={saving}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-1" htmlFor="bp-referral-file">履歴書</label>
              <input
                id="bp-referral-file"
                ref={fileInputRef}
                type="file"
                className="form-control form-control-sm"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={(e) => setForm((prev) => ({ ...prev, resume: e.target.files?.[0] || null }))}
                disabled={saving}
                required
              />
            </div>
          </div>
          <div className="bp-referral-form-actions">
            <button type="submit" className="btn btn-primary btn-sm app-btn" disabled={saving}>
              <i className="bi bi-upload" aria-hidden="true" />
              履歴書を提出
            </button>
            {form.resume && (
              <span className="bp-referral-file-chip">
                <i className="bi bi-paperclip" aria-hidden="true" />
                {form.resume.name}
                <span className="text-muted">（{formatFileSize(form.resume.size)}）</span>
              </span>
            )}
          </div>
        </form>
      )}

      {!enabled && (
        <p className="small text-muted mb-3">求援公開中のみ、臨時候補を提出できます。</p>
      )}

      {loading ? (
        <div className="page-state-panel py-3">
          <div className="spinner-border spinner-border-sm text-primary" role="status" />
        </div>
      ) : referrals.length === 0 ? (
        <div className="bp-referral-empty">まだ臨時候補はありません。</div>
      ) : (
        <ul className="bp-referral-timeline">
          {referrals.map((referral) => {
            const hiringThis = hireTarget?.id === referral.id;
            return (
              <li
                key={referral.id}
                className={`bp-referral-card${hiringThis ? ' is-hiring' : ''}`}
              >
                <div className="bp-referral-card-main">
                  <div className="bp-referral-card-top">
                    <strong className="bp-referral-name">{referral.candidateName}</strong>
                  </div>
                  <BpHelpReferralProgress status={referral.status} compact />
                  <div className="bp-referral-card-meta">
                    {referral.bpCompanyName && <span>{referral.bpCompanyName}</span>}
                    <span>提出: {referral.submittedByName || '—'}</span>
                    <span>{formatDateTime(referral.submittedAt)}</span>
                    {referral.interviewAt && <span>面談: {referral.interviewAt}</span>}
                  </div>
                  {referral.note && <p className="bp-referral-note mb-0">{referral.note}</p>}
                  {referral.reviewNote && (
                    <p className="bp-referral-review-note mb-0">却下理由: {referral.reviewNote}</p>
                  )}
                  {referral.closeReason && referral.status !== 'REJECTED' && (
                    <p className="bp-referral-review-note mb-0">{referral.closeReason}</p>
                  )}
                  {referral.hiredEmployeeId && (
                    <p className="bp-referral-hired mb-0">
                      社員:
                      <Link to={`/employees/${referral.hiredEmployeeId}`}>
                        {referral.hiredEmployeeCode || referral.hiredEmployeeName || referral.hiredEmployeeId}
                      </Link>
                    </p>
                  )}
                  {isResumePurged(referral.status) ? (
                    <p className="bp-referral-file-purged mb-0">
                      <i className="bi bi-shield-lock" aria-hidden="true" />
                      履歴書は削除済み（個人情報保護のため）
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-link btn-sm bp-referral-file-link"
                      onClick={() => handleDownload(referral)}
                    >
                      <i className="bi bi-download" aria-hidden="true" />
                      {referral.resumeFileName || '履歴書'}
                      <span className="text-muted">（{formatFileSize(referral.resumeSizeBytes)}）</span>
                    </button>
                  )}

                  {hiringThis && (
                    <form className="bp-referral-hire-form" onSubmit={handleHireSubmit}>
                      <div className="bp-referral-hire-head">
                        <strong>採用確定</strong>
                        <span className="text-muted small">BP社員登録 + 履歴書紐付け + 配属</span>
                      </div>
                      <div className="bp-referral-hire-summary">
                        <span>
                          <em>候補</em>
                          {referral.candidateName}
                        </span>
                        <span>
                          <em>BP会社</em>
                          {referral.bpCompanyName || '（未記入）'}
                        </span>
                      </div>
                      <div className="row g-2">
                        <div className="col-12">
                          <label className="form-label small mb-1" htmlFor={`bp-hire-dept-${referral.id}`}>
                            所属部門
                          </label>
                          <select
                            id={`bp-hire-dept-${referral.id}`}
                            className="form-select form-select-sm"
                            value={hireForm.departmentId}
                            onChange={(e) => setHireForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                            required
                            disabled={saving}
                          >
                            <option value="">選択してください</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-6">
                          <label className="form-label small mb-1" htmlFor={`bp-hire-start-${referral.id}`}>
                            配属開始日
                          </label>
                          <input
                            id={`bp-hire-start-${referral.id}`}
                            type="date"
                            className="form-control form-control-sm"
                            value={hireForm.startDate}
                            onChange={(e) => setHireForm((prev) => ({ ...prev, startDate: e.target.value }))}
                            required
                            disabled={saving}
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label small mb-1" htmlFor={`bp-hire-end-${referral.id}`}>
                            配属終了日
                          </label>
                          <input
                            id={`bp-hire-end-${referral.id}`}
                            type="date"
                            className="form-control form-control-sm"
                            value={hireForm.endDate}
                            onChange={(e) => setHireForm((prev) => ({ ...prev, endDate: e.target.value }))}
                            disabled={saving}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label small mb-1" htmlFor={`bp-hire-notes-${referral.id}`}>
                            配属備考
                          </label>
                          <input
                            id={`bp-hire-notes-${referral.id}`}
                            className="form-control form-control-sm"
                            value={hireForm.notes}
                            onChange={(e) => setHireForm((prev) => ({ ...prev, notes: e.target.value }))}
                            placeholder="任意"
                            disabled={saving}
                          />
                        </div>
                      </div>
                      <p className="bp-referral-hire-hint mb-0">
                        氏名・BP会社・履歴書は臨時候補の情報を引き継ぎます。詳細（連絡先・スキル等）は採用後に社員画面で補完してください。
                      </p>
                      <div className="bp-referral-hire-actions">
                        <button type="submit" className="btn btn-success btn-sm app-btn" disabled={saving}>
                          採用確定
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm app-btn"
                          disabled={saving}
                          onClick={cancelHire}
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  )}
                </div>
                {renderCardActions(referral)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
