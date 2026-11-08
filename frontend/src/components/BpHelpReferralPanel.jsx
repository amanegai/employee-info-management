import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { canReviewBpReferral, canWriteProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';
import { excludeParentDepartments } from '../utils';
import {
  AFFILIATION_COMPANY_BITCROSS,
  DEPT_SONOTA,
  departmentOptionLabel,
  filterDepartmentsForEmployeeType,
  formatRecommendHint,
  normalizeAffiliationCompany,
  validateEmployeeCode,
} from '../utils/employeeCode';
import BpHelpReferralProgress, { bpReferralStatusLabel } from './BpHelpReferralProgress';

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

function bpDepartmentsAll(departments = []) {
  const companies = [
    ...new Set(departments.map((d) => normalizeAffiliationCompany(d.company))),
  ];
  return companies.flatMap((company) =>
    filterDepartmentsForEmployeeType(departments, 'BP', company)
  );
}

function emptyHireForm(project, departments = []) {
  const options = bpDepartmentsAll(departments);
  const sonota = options.find(
    (d) =>
      d.name === DEPT_SONOTA &&
      normalizeAffiliationCompany(d.company) === AFFILIATION_COMPANY_BITCROSS
  );
  const departmentId = sonota
    ? String(sonota.id)
    : options[0]
      ? String(options[0].id)
      : '';
  const selected = options.find((d) => String(d.id) === departmentId);
  return {
    affiliationCompany: selected
      ? normalizeAffiliationCompany(selected.company)
      : AFFILIATION_COMPANY_BITCROSS,
    departmentId,
    employeeCode: '',
    gender: '',
    birthDate: '',
    japanArrivalDate: '',
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
  const [hireCodeHint, setHireCodeHint] = useState('');

  const bpDepartments = useMemo(() => bpDepartmentsAll(departments), [departments]);

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
    const next = emptyHireForm(project, departments);
    setHireTarget(referral);
    setHireForm(next);
    void refreshHireCodeHint(next.departmentId, next.affiliationCompany);
  }

  function cancelHire() {
    setHireTarget(null);
    setHireCodeHint('');
  }

  async function refreshHireCodeHint(departmentId, affiliationCompany) {
    if (!departmentId) {
      setHireCodeHint('');
      return;
    }
    const company =
      affiliationCompany ||
      normalizeAffiliationCompany(
        bpDepartments.find((d) => String(d.id) === String(departmentId))?.company
      );
    try {
      const recommend = await api.recommendEmployeeCode('BP', Number(departmentId), company);
      setHireCodeHint(formatRecommendHint(recommend));
    } catch {
      setHireCodeHint('');
    }
  }

  async function handleHireSubmit(e) {
    e.preventDefault();
    if (!hireTarget) return;
    if (!hireForm.employeeCode.trim()) {
      showMessage('社員IDは必須です', 'danger');
      return;
    }
    if (!hireForm.startDate.trim()) {
      showMessage('配属開始日は必須です', 'danger');
      return;
    }
    if (!hireForm.departmentId) {
      showMessage('所属部門を選択してください', 'danger');
      return;
    }
    const dept = bpDepartments.find((d) => String(d.id) === String(hireForm.departmentId));
    const company = normalizeAffiliationCompany(dept?.company || hireForm.affiliationCompany);
    const codeError = validateEmployeeCode(hireForm.employeeCode, 'BP', dept?.name, company);
    if (codeError) {
      showMessage(codeError, 'danger');
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
        employeeCode: hireForm.employeeCode.trim(),
        gender: hireForm.gender.trim() || null,
        birthDate: hireForm.birthDate.trim() || null,
        japanArrivalDate: hireForm.japanArrivalDate.trim() || null,
      });
      showMessage(
        `採用確定しました（社員番号: ${result.hiredEmployeeCode || '—'}）。詳細は社員画面で補完できます。`
      );
      setHireTarget(null);
      setHireCodeHint('');
      await loadReferrals();
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
                          <label className="form-label small mb-1" htmlFor={`bp-hire-code-${referral.id}`}>
                            社員ID
                          </label>
                          <input
                            id={`bp-hire-code-${referral.id}`}
                            className="form-control form-control-sm"
                            value={hireForm.employeeCode}
                            onChange={(e) => setHireForm((prev) => ({ ...prev, employeeCode: e.target.value.trim() }))}
                            placeholder="例：btcB00001"
                            required
                            disabled={saving}
                          />
                          {hireCodeHint && <p className="small text-muted mb-0 mt-1">{hireCodeHint}</p>}
                        </div>
                        <div className="col-12">
                          <label className="form-label small mb-1" htmlFor={`bp-hire-dept-${referral.id}`}>
                            所属部門（会社別）
                          </label>
                          <select
                            id={`bp-hire-dept-${referral.id}`}
                            className="form-select form-select-sm"
                            value={hireForm.departmentId}
                            onChange={(e) => {
                              const departmentId = e.target.value;
                              const selected = bpDepartments.find((d) => String(d.id) === departmentId);
                              const affiliationCompany = normalizeAffiliationCompany(selected?.company);
                              setHireForm((prev) => ({ ...prev, departmentId, affiliationCompany }));
                              void refreshHireCodeHint(departmentId, affiliationCompany);
                            }}
                            required
                            disabled={saving}
                          >
                            <option value="">選択してください</option>
                            {bpDepartments.map((d) => (
                              <option key={d.id} value={d.id}>{departmentOptionLabel(d)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-4">
                          <label className="form-label small mb-1" htmlFor={`bp-hire-gender-${referral.id}`}>性別</label>
                          <select
                            id={`bp-hire-gender-${referral.id}`}
                            className="form-select form-select-sm"
                            value={hireForm.gender}
                            onChange={(e) => setHireForm((prev) => ({ ...prev, gender: e.target.value }))}
                            disabled={saving}
                          >
                            <option value="">未設定</option>
                            <option value="男性">男性</option>
                            <option value="女性">女性</option>
                            <option value="その他">その他</option>
                          </select>
                        </div>
                        <div className="col-4">
                          <label className="form-label small mb-1" htmlFor={`bp-hire-birth-${referral.id}`}>生年月日</label>
                          <input
                            id={`bp-hire-birth-${referral.id}`}
                            type="date"
                            className="form-control form-control-sm"
                            value={hireForm.birthDate}
                            onChange={(e) => setHireForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                            disabled={saving}
                          />
                        </div>
                        <div className="col-4">
                          <label className="form-label small mb-1" htmlFor={`bp-hire-arrival-${referral.id}`}>来日年月</label>
                          <input
                            id={`bp-hire-arrival-${referral.id}`}
                            type="date"
                            className="form-control form-control-sm"
                            value={hireForm.japanArrivalDate}
                            onChange={(e) => setHireForm((prev) => ({ ...prev, japanArrivalDate: e.target.value }))}
                            disabled={saving}
                          />
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
                        社員IDは手動入力です。姓名・性別・生年月日・来日年月が一致する社員がいる場合は登録できません。
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
