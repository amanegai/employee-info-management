import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageHeader from '../components/PageHeader';
import ListSectionBar from '../components/ListSectionBar';
import ProjectCandidateTable from '../components/ProjectCandidateTable';
import ProjectStatusBadge from '../components/ProjectStatusBadge';
import ProjectInfoSummaryModal from '../components/detail/ProjectInfoSummaryModal';
import { canControlBpHelp, canWriteProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';
import BpHelpReferralPanel from '../components/BpHelpReferralPanel';
import {
  candidateStageLabel,
  formatProjectBillingPrice,
  isMatchableProject,
  parseProjectSkills,
  assignmentRoleLabel,
  formatProjectHeadcountDisplay,
  isHeadcountUnlimited,
} from '../utils/projectWorkflow';

const EMPTY_CONFIRM = { startDate: '', endDate: '', notes: '' };

function formatDateTime(value) {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 16);
}

function formatDate(value) {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 10).replace(/-/g, '/');
}

function ProjectDetailSkillList({ items, variant = 'required' }) {
  if (!items?.length) return null;
  return (
    <ul className={`project-detail-skill-list project-detail-skill-list--${variant}`}>
      {items.map((skill) => (
        <li key={skill} className="project-detail-skill-list-item">
          <span className="project-detail-skill-list-marker" aria-hidden="true">
            {variant === 'required' ? '●' : '○'}
          </span>
          <span className="project-detail-skill-list-text">{skill}</span>
        </li>
      ))}
    </ul>
  );
}

function formatPeriodDuration(start, end) {
  if (!start || !end) return null;
  const startDate = new Date(start.slice(0, 10));
  const endDate = new Date(end.slice(0, 10));
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const diffDays = Math.round((endDate - startDate) / 86400000);
  if (diffDays < 0) return null;
  if (diffDays < 30) return `${diffDays}日間`;
  const months = Math.round(diffDays / 30);
  if (months < 12) return `約${months}ヶ月`;
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  if (remainMonths === 0) return `約${years}年`;
  return `約${years}年${remainMonths}ヶ月`;
}

function SubsectionTitle({ icon, children }) {
  return (
    <div className="project-detail-subsection-title">
      {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      {children}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const backPath = location.state?.from || '/projects';
  const backLabel = location.state?.fromLabel || '案件一覧';
  const matchState = location.state?.matchState;
  const returnState = location.state?.from
    ? {
        from: location.state.from,
        fromLabel: location.state.fromLabel,
        matchState: location.state.matchState,
        employeeTab: location.state.employeeTab,
      }
    : undefined;

  function navigateBack() {
    if (backPath.startsWith('/employees/') && location.state?.employeeTab) {
      navigate(backPath, { state: { activeTab: location.state.employeeTab } });
      return;
    }
    if (backPath === '/project-match' && matchState) {
      navigate('/project-match', { state: { matchState } });
      return;
    }
    navigate(backPath);
  }

  const { user } = useAuth();
  const { showMessage } = useAppMessage();
  const canEdit = canWriteProjectFeatures(user);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmForm, setConfirmForm] = useState(EMPTY_CONFIRM);
  const [confirmError, setConfirmError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showProjectSummary, setShowProjectSummary] = useState(false);
  const [bpHelpNote, setBpHelpNote] = useState('');
  const [bpHelpSlots, setBpHelpSlots] = useState('');
  const [bpHelpSaving, setBpHelpSaving] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProject(id);
      setProject(data);
      setBpHelpNote(data.bpHelpNote || '');
      setBpHelpSlots(
        data.bpHelpSlotsNeeded != null && data.bpHelpSlotsNeeded !== undefined
          ? String(data.bpHelpSlotsNeeded)
          : ''
      );
      if (data.bpHelpRequested) {
        try {
          await api.markProjectNotificationsRead(id);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [id, showMessage]);

  /** 既に画面表示中のとき用。スピナーで画面を潰さず人数／ステータス／候補者を取り直す */
  const refreshProjectQuietly = useCallback(async () => {
    try {
      const data = await api.getProject(id);
      setProject(data);
      setBpHelpNote(data.bpHelpNote || '');
      setBpHelpSlots(
        data.bpHelpSlotsNeeded != null && data.bpHelpSlotsNeeded !== undefined
          ? String(data.bpHelpSlotsNeeded)
          : ''
      );
    } catch (e) {
      showMessage(e.message, 'danger');
    }
  }, [id, showMessage]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  async function handleStageAction(candidate, action) {
    if (action.action === 'confirm') {
      setConfirmTarget(candidate);
      setConfirmError('');
      setConfirmForm({
        startDate: project?.expectedStartDate || '',
        endDate: project?.expectedEndDate || '',
        notes: '',
      });
      return;
    }
    setSaving(true);
    try {
      await api.patchCandidateStage(candidate.id, { stage: action.stage });
      showMessage(`${candidate.employeeName} を「${candidateStageLabel(action.stage)}」に更新しました`);
      await loadProject();
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(candidate) {
    if (!window.confirm(`${candidate.employeeName} を不採用にしますか？`)) return;
    setSaving(true);
    try {
      await api.rejectCandidate(candidate.id, {});
      showMessage(`${candidate.employeeName} を不採用にしました`);
      await loadProject();
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw(candidate) {
    if (!window.confirm(`${candidate.employeeName} の提案を撤回しますか？`)) return;
    setSaving(true);
    try {
      await api.withdrawCandidate(candidate.id, {});
      showMessage(`${candidate.employeeName} の提案を撤回しました`);
      await loadProject();
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmSubmit(e) {
    e.preventDefault();
    if (!confirmTarget) return;
    setConfirmError('');
    setSaving(true);
    try {
      await api.confirmCandidate(confirmTarget.id, confirmForm);
      showMessage(`${confirmTarget.employeeName} の採用を確定しました`);
      setConfirmTarget(null);
      setConfirmForm(EMPTY_CONFIRM);
      await loadProject();
    } catch (err) {
      setConfirmError(err.message || '採用確定に失敗しました');
      showMessage(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestBpHelp() {
    if (!window.confirm('社内要員が不足しているため、他の営業へBP求援を出しますか？\n通知がリアルタイムで配信されます。')) {
      return;
    }
    setBpHelpSaving(true);
    try {
      const slots = bpHelpSlots.trim() ? Number(bpHelpSlots) : null;
      const updated = await api.requestBpHelp(project.id, {
        note: bpHelpNote.trim() || null,
        slotsNeeded: Number.isFinite(slots) && slots > 0 ? slots : null,
      });
      setProject(updated);
      showMessage('BP求援を公開し、他の営業へ通知しました');
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setBpHelpSaving(false);
    }
  }

  async function handleCancelBpHelp() {
    if (!window.confirm('BP求援を終了しますか？関連する未読通知も閉じます。')) return;
    setBpHelpSaving(true);
    try {
      const updated = await api.cancelBpHelp(project.id);
      setProject(updated);
      setBpHelpNote('');
      setBpHelpSlots('');
      showMessage('BP求援を終了しました');
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setBpHelpSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-4 px-3 px-lg-5">
        <div className="page-state-panel">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container-fluid py-4 px-3 px-lg-5">
        <p className="text-muted">案件が見つかりません。</p>
        <button type="button" className="btn btn-outline-secondary app-btn" onClick={navigateBack}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
          {backLabel}
        </button>
      </div>
    );
  }

  const candidates = project.candidates ?? [];
  const skills = parseProjectSkills(project.requiredSkills);
  const optionalSkills = parseProjectSkills(project.optionalSkills);
  const periodDuration = formatPeriodDuration(project.expectedStartDate, project.expectedEndDate);
  const canMatch = isMatchableProject(project.status);
  const canOperateBpHelp = canControlBpHelp(user, project);

  function handleOpenMatch() {
    navigate('/project-match', {
      state: { focusProjectId: project.id },
    });
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 list-page">
      <PageHeader
        guideId="project-detail"
        icon="bi-briefcase-fill"
        title={project.projectName}
        lead={project.clientName}
        className="mb-3"
      >
        <div className="project-page-crosslinks d-flex flex-wrap gap-2">
          {canMatch && (
            <button
              type="button"
              className="btn btn-warning app-btn"
              data-guide="project-match-link"
              onClick={handleOpenMatch}
            >
              <i className="bi bi-diagram-3" aria-hidden="true" />
              案件マッチング
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline-primary app-btn"
            onClick={() => setShowProjectSummary(true)}
          >
            <i className="bi bi-card-text" aria-hidden="true" />
            案件情報サマリ
          </button>
          {canEdit && (
            <Link
              to={`/projects/${project.id}/edit`}
              state={returnState}
              className="btn btn-outline-primary app-btn"
            >
              <i className="bi bi-pencil-square" aria-hidden="true" />
              編集
            </Link>
          )}
          <button type="button" className="btn btn-outline-secondary app-btn" onClick={navigateBack}>
            <i className="bi bi-arrow-left" aria-hidden="true" />
            {backLabel}
          </button>
        </div>
      </PageHeader>

      <section className="table-section list-section-panel project-detail-info-panel">
        <ListSectionBar icon="bi-file-earmark-text" title="案件情報" hideCount />
        <div className="list-section-body list-section-body-padded">
          <div className="project-detail-kpi-strip" aria-label="案件サマリー">
            <div className="project-detail-kpi-item">
              <span className="project-detail-kpi-label">ステータス</span>
              <div className="project-detail-kpi-value">
                <ProjectStatusBadge status={project.status} />
              </div>
            </div>
            <div className="project-detail-kpi-divider" aria-hidden="true" />
            <div className="project-detail-kpi-item project-detail-kpi-item--metric">
              <span className="project-detail-kpi-label">請求単価</span>
              <div className="project-detail-kpi-value project-detail-kpi-value--price">
                {formatProjectBillingPrice(project.billingUnitPrice, project.billingPriceLabel)}
              </div>
            </div>
            <div className="project-detail-kpi-divider" aria-hidden="true" />
            <div className="project-detail-kpi-item project-detail-kpi-item--metric">
              <span className="project-detail-kpi-label">確定 / 必要</span>
              <div className="project-detail-kpi-value project-detail-kpi-value--headcount">
                <span className="project-detail-metric-value">{project.headcountFilled}</span>
                <span className="project-detail-metric-sep">/</span>
                <span className="project-detail-metric-total">
                  {isHeadcountUnlimited(project) ? '∞' : project.headcountRequired}
                </span>
                {!isHeadcountUnlimited(project) && (
                  <span className="project-detail-metric-unit">名</span>
                )}
              </div>
            </div>
          </div>

          <div className="project-detail-dual-panels">
            <section className="project-detail-section-panel project-detail-section-panel--client">
              <h3 className="project-detail-section-heading">
                <i className="bi bi-building" aria-hidden="true" />
                取引先・勤務
              </h3>
              <div className="project-detail-section-body">
                <div className="project-detail-fact-grid">
                  <div className="project-detail-fact-card">
                    <div className="project-detail-fact-icon" aria-hidden="true">
                      <i className="bi bi-building" />
                    </div>
                    <div className="project-detail-fact-content">
                      <span className="project-detail-fact-label">取引先</span>
                      <span className="project-detail-fact-value">
                        {project.clientId ? (
                          <Link to={`/clients/${project.clientId}`} className="client-detail-entity-link">
                            {project.clientName || '—'}
                            <i className="bi bi-box-arrow-up-right client-detail-entity-link-icon" aria-hidden="true" />
                          </Link>
                        ) : (
                          project.clientName || '—'
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="project-detail-fact-card">
                    <div className="project-detail-fact-icon project-detail-fact-icon--owner" aria-hidden="true">
                      <i className="bi bi-person-badge" />
                    </div>
                    <div className="project-detail-fact-content">
                      <span className="project-detail-fact-label">自社担当</span>
                      <span className="project-detail-fact-value">{project.ownerDisplayName || '—'}</span>
                    </div>
                  </div>
                  <div className="project-detail-fact-card">
                    <div className="project-detail-fact-icon project-detail-fact-icon--location" aria-hidden="true">
                      <i className="bi bi-geo-alt" />
                    </div>
                    <div className="project-detail-fact-content">
                      <span className="project-detail-fact-label">勤務地</span>
                      <span className="project-detail-fact-value">{project.workLocation || '—'}</span>
                    </div>
                  </div>
                  <div className="project-detail-fact-card">
                    <div className="project-detail-fact-icon project-detail-fact-icon--role" aria-hidden="true">
                      <i className="bi bi-person-workspace" />
                    </div>
                    <div className="project-detail-fact-content">
                      <span className="project-detail-fact-label">役割</span>
                      <span className="project-detail-fact-value">
                        {assignmentRoleLabel(project.projectRole) || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="project-detail-fact-card">
                    <div className="project-detail-fact-icon project-detail-fact-icon--interview" aria-hidden="true">
                      <i className="bi bi-chat-dots" />
                    </div>
                    <div className="project-detail-fact-content">
                      <span className="project-detail-fact-label">面談回数</span>
                      <span className="project-detail-fact-value">{project.interviewRounds || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="project-detail-section-panel project-detail-section-panel--schedule">
              <h3 className="project-detail-section-heading">
                <i className="bi bi-calendar3" aria-hidden="true" />
                期間・履歴
              </h3>
              <div className="project-detail-section-body project-detail-schedule-body">
                <div className="project-detail-period-card">
                  <div className="project-detail-period-col">
                    <span className="project-detail-period-badge project-detail-period-badge--start">
                      開始予定
                    </span>
                    <time className="project-detail-period-date" dateTime={project.expectedStartDate || undefined}>
                      {formatDate(project.expectedStartDate)}
                    </time>
                  </div>

                  <div className="project-detail-period-bridge" aria-hidden="true">
                    {periodDuration && (
                      <span className="project-detail-period-duration">{periodDuration}</span>
                    )}
                    <span className="project-detail-period-arrow">
                      <i className="bi bi-arrow-right" />
                    </span>
                  </div>

                  <div className="project-detail-period-col project-detail-period-col--end">
                    <span className="project-detail-period-badge project-detail-period-badge--end">
                      終了予定
                    </span>
                    <time className="project-detail-period-date" dateTime={project.expectedEndDate || undefined}>
                      {formatDate(project.expectedEndDate)}
                    </time>
                  </div>
                </div>

                {project.periodNotes?.trim() && (
                  <div className="project-detail-period-note">
                    <span className="project-detail-period-note-label">
                      <i className="bi bi-info-circle" aria-hidden="true" />
                      備考
                    </span>
                    <p className="project-detail-period-note-value mb-0">{project.periodNotes.trim()}</p>
                  </div>
                )}

                <div className="project-detail-audit-grid">
                  <div className="project-detail-audit-chip">
                    <span className="project-detail-audit-chip-label">
                      <i className="bi bi-plus-circle" aria-hidden="true" />
                      登録
                    </span>
                    <span className="project-detail-audit-chip-value">{formatDateTime(project.createdAt)}</span>
                  </div>
                  <div className="project-detail-audit-chip">
                    <span className="project-detail-audit-chip-label">
                      <i className="bi bi-arrow-repeat" aria-hidden="true" />
                      更新
                    </span>
                    <span className="project-detail-audit-chip-value">{formatDateTime(project.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="project-detail-skills-section">
            <SubsectionTitle icon="bi-tools">必要スキル</SubsectionTitle>
            {skills.length ? (
              <ProjectDetailSkillList items={skills} variant="required" />
            ) : (
              <p className="project-detail-skills-empty mb-0">必要スキルは未登録です。</p>
            )}
          </div>

          <div className="project-detail-skills-section">
            <SubsectionTitle icon="bi-plus-circle">任意スキル</SubsectionTitle>
            {optionalSkills.length ? (
              <ProjectDetailSkillList items={optionalSkills} variant="optional" />
            ) : (
              <p className="project-detail-skills-empty mb-0">任意スキルは未登録です。</p>
            )}
          </div>

          <div className="project-detail-content-panels">
            <div className="project-detail-content-panel project-detail-content-panel--body">
              <SubsectionTitle icon="bi-file-text">案件内容</SubsectionTitle>
              {project.projectText ? (
                <div className="project-detail-text-content">{project.projectText}</div>
              ) : (
                <p className="project-detail-text-empty mb-0">案件内容は未登録です。</p>
              )}
            </div>
            <div className="project-detail-content-panel project-detail-content-panel--notes">
              <SubsectionTitle icon="bi-journal-text">備考</SubsectionTitle>
              {project.notes ? (
                <div className="project-detail-notes">{project.notes}</div>
              ) : (
                <p className="project-detail-text-empty mb-0">備考は未登録です。</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={`table-section list-section-panel mt-3 bp-help-panel${project.bpHelpRequested ? ' is-active' : ''}`}>
        <ListSectionBar
          icon="bi-people"
          title="BP求援"
          hideCount
        />
        <div className="list-section-body list-section-body-padded">
          {project.bpHelpRequested ? (
            <div className="bp-help-active-banner mb-3">
              <i className="bi bi-broadcast" aria-hidden="true" />
              <div>
                <strong>求援公開中</strong>
                <div className="small text-muted">
                  依頼者: {project.bpHelpRequesterName || '—'}
                  {project.bpHelpRequestedAt ? ` / ${formatDateTime(project.bpHelpRequestedAt)}` : ''}
                  {project.bpHelpSlotsNeeded != null ? ` / 不足 ${project.bpHelpSlotsNeeded}名` : ''}
                </div>
                {project.bpHelpNote && <div className="mt-1">{project.bpHelpNote}</div>}
              </div>
            </div>
          ) : (
            <p className="text-muted small mb-3">
              社内マッチングで人員が足りない・適者がいない場合、他の営業へBP候補の協力を依頼できます。依頼すると通知ベルとBP求援一覧に表示されます。
            </p>
          )}
          {canOperateBpHelp && canMatch && (
            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label small mb-1" htmlFor="bp-help-slots">不足人数</label>
                <input
                  id="bp-help-slots"
                  type="number"
                  min="1"
                  className="form-control form-control-sm"
                  value={bpHelpSlots}
                  onChange={(e) => setBpHelpSlots(e.target.value)}
                  placeholder="例: 2"
                  disabled={bpHelpSaving}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small mb-1" htmlFor="bp-help-note">依頼メモ</label>
                <input
                  id="bp-help-note"
                  type="text"
                  className="form-control form-control-sm"
                  value={bpHelpNote}
                  onChange={(e) => setBpHelpNote(e.target.value)}
                  placeholder="例: Java経験3年以上、来月開始希望"
                  disabled={bpHelpSaving}
                />
              </div>
              <div className="col-md-4 d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-warning btn-sm app-btn"
                  disabled={bpHelpSaving}
                  onClick={handleRequestBpHelp}
                >
                  <i className="bi bi-megaphone" aria-hidden="true" />
                  {project.bpHelpRequested ? '求援を更新して再通知' : 'BP求援を出す'}
                </button>
                {project.bpHelpRequested && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm app-btn"
                    disabled={bpHelpSaving}
                    onClick={handleCancelBpHelp}
                  >
                    求援を終了
                  </button>
                )}
              </div>
            </div>
          )}
          {!canOperateBpHelp && project.bpHelpRequested && (
            <p className="small mb-0 text-muted">協力会社から候補が得られたら、下の臨時候補から履歴書を提出してください。</p>
          )}
          <BpHelpReferralPanel
            project={project}
            enabled={Boolean(project.bpHelpRequested)}
            onProjectChanged={refreshProjectQuietly}
          />
        </div>
      </section>

      <section className="table-section list-section-panel mt-3" data-guide="project-candidates">
        <ListSectionBar icon="bi-people-fill" title="候補者" count={candidates.length} />
        {candidates.length === 0 ? (
          <div className="page-state-panel">
            <p className="mb-0">候補者がいません。案件マッチングから追加してください。</p>
            {canMatch && (
              <button
                type="button"
                className="btn btn-outline-primary app-btn mt-3"
                onClick={handleOpenMatch}
              >
                案件マッチングへ
              </button>
            )}
          </div>
        ) : (
          <div className="list-section-body list-section-body-padded">
            <ProjectCandidateTable
              candidates={candidates}
              canEdit={canEdit}
              saving={saving}
              onStageAction={handleStageAction}
              onReject={handleReject}
              onWithdraw={handleWithdraw}
            />
          </div>
        )}
      </section>

      {showProjectSummary && (
        <ProjectInfoSummaryModal project={project} onClose={() => setShowProjectSummary(false)} />
      )}

      {confirmTarget && (
        <>
          <div className="modal fade show d-block project-confirm-modal-root" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={handleConfirmSubmit}>
                  <div className="modal-header">
                    <h2 className="modal-title h5 mb-0">採用確定 — {confirmTarget.employeeName}</h2>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="閉じる"
                      onClick={() => setConfirmTarget(null)}
                    />
                  </div>
                  <div className="modal-body">
                    {confirmError && (
                      <div className="assignment-modal-feedback assignment-modal-feedback-error" role="alert">
                        <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
                        <span>{confirmError}</span>
                      </div>
                    )}
                    <p className="small text-muted">
                      他案件の進行中選考は自動的に LOST になります。配属は PLANNED として登録されます。
                    </p>
                    <div className="mb-3">
                      <label htmlFor="confirmStartDate" className="form-label">
                        配属開始日
                      </label>
                      <input
                        id="confirmStartDate"
                        type="date"
                        className="form-control"
                        value={confirmForm.startDate}
                        onChange={(e) => setConfirmForm({ ...confirmForm, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="confirmEndDate" className="form-label">
                        配属終了日
                      </label>
                      <input
                        id="confirmEndDate"
                        type="date"
                        className="form-control"
                        value={confirmForm.endDate}
                        onChange={(e) => setConfirmForm({ ...confirmForm, endDate: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="confirmNotes" className="form-label">
                        備考
                      </label>
                      <textarea
                        id="confirmNotes"
                        className="form-control"
                        rows={2}
                        value={confirmForm.notes}
                        onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary app-btn" onClick={() => setConfirmTarget(null)}>
                      キャンセル
                    </button>
                    <button type="submit" className="btn btn-success app-btn" disabled={saving}>
                      {saving ? '確定中…' : '採用確定'}
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
