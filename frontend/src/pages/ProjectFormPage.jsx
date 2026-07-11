import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import PageGuideHelpButton from '../components/guide/PageGuideHelpButton';
import ClientNamePicker from '../components/ClientNamePicker';
import { useAppMessage } from '../context/MessageContext';
import { projectStatusLabel, isSkillBasedBillingLabel, parseProjectSkills, assignmentRoleLabel, ASSIGNMENT_ROLE_LABELS } from '../utils/projectWorkflow';

function FormField({ id, label, required, hint, children, className = '' }) {
  return (
    <div className={`project-form-field ${className}`.trim()}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && <p className="project-form-field-hint mb-0">{hint}</p>}
    </div>
  );
}

const EMPTY_FORM = {
  clientId: '',
  clientName: '',
  projectName: '',
  projectText: '',
  workLocation: '',
  requiredSkills: '',
  optionalSkills: '',
  billingUnitPrice: '',
  billingPriceLabel: '',
  interviewRounds: '',
  expectedStartDate: '',
  expectedEndDate: '',
  periodNotes: '',
  projectRole: '',
  headcountRequired: '1',
  status: 'OPEN',
  notes: '',
};

function projectToForm(project) {
  return {
    clientId: project.clientId != null ? String(project.clientId) : '',
    clientName: project.clientName || '',
    projectName: project.projectName || '',
    projectText: project.projectText || '',
    workLocation: project.workLocation || '',
    requiredSkills: project.requiredSkills || '',
    optionalSkills: project.optionalSkills || '',
    billingUnitPrice: project.billingUnitPrice > 0 ? String(project.billingUnitPrice) : '',
    billingPriceLabel: project.billingPriceLabel || '',
    interviewRounds: project.interviewRounds || '',
    expectedStartDate: project.expectedStartDate || '',
    expectedEndDate: project.expectedEndDate || '',
    periodNotes: project.periodNotes || '',
    projectRole: project.projectRole || '',
    headcountRequired: String(project.headcountRequired ?? 1),
    status: project.status || 'OPEN',
    notes: project.notes || '',
  };
}

function buildPayload(form) {
  const skillBased = isSkillBasedBillingLabel(form.billingPriceLabel);
  return {
    clientId: form.clientId ? Number(form.clientId) : null,
    clientName: form.clientName.trim(),
    projectName: form.projectName.trim(),
    projectText: form.projectText.trim() || null,
    workLocation: form.workLocation.trim() || null,
    requiredSkills: form.requiredSkills.trim() || null,
    optionalSkills: form.optionalSkills.trim() || null,
    billingUnitPrice: skillBased ? null : (form.billingUnitPrice ? Number(form.billingUnitPrice) : null),
    billingPriceLabel: form.billingPriceLabel.trim() || null,
    interviewRounds: form.interviewRounds.trim() || null,
    expectedStartDate: form.expectedStartDate || null,
    expectedEndDate: form.expectedEndDate || null,
    periodNotes: form.periodNotes.trim() || null,
    projectRole: form.projectRole.trim() || null,
    headcountRequired: Number(form.headcountRequired) || 1,
    notes: form.notes.trim() || null,
  };
}

export default function ProjectFormPage({ mode = 'create' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showMessage } = useAppMessage();
  const savingRef = useRef(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statuses, setStatuses] = useState([]);
  const [initialStatus, setInitialStatus] = useState('OPEN');
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  const cancelPath = mode === 'edit' ? `/projects/${id}` : '/projects';
  const returnState = location.state?.from
    ? {
        from: location.state.from,
        fromLabel: location.state.fromLabel,
        matchState: location.state.matchState,
        employeeTab: location.state.employeeTab,
      }
    : undefined;

  useEffect(() => {
    if (mode !== 'create' || !location.state) return;
    setForm((prev) => ({
      ...prev,
      clientId: location.state.clientId != null ? String(location.state.clientId) : prev.clientId,
      clientName: location.state.clientName || prev.clientName,
    }));
  }, [location.state, mode]);

  const loadMeta = useCallback(async () => {
    const statusList = await api.getProjectStatuses();
    setStatuses(statusList);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadMeta();
        if (mode === 'edit' && id) {
          setLoading(true);
          const project = await api.getProject(id);
          setForm(projectToForm(project));
          setInitialStatus(project.status || 'OPEN');
        }
      } catch (e) {
        showMessage(e.message, 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, loadMeta, mode, showMessage]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    if (!form.clientId && !form.clientName.trim()) {
      showMessage('取引先を選択するか、取引先名を入力してください', 'warning');
      return;
    }
    if (!form.projectName.trim()) {
      showMessage('案件名は必須です', 'warning');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (mode === 'edit') {
        await api.updateProject(id, payload);
        if (form.status !== initialStatus) {
          await api.patchProjectStatus(id, { status: form.status });
        }
        showMessage(`「${payload.projectName}」を更新しました`, 'success');
        navigate(`/projects/${id}`, returnState ? { state: returnState } : undefined);
      } else {
        const created = await api.createProject(payload);
        showMessage(`「${created.projectName}」を登録しました`, 'success');
        navigate(`/projects/${created.id}`, returnState ? { state: returnState } : undefined);
      }
    } catch (e) {
      showMessage(e.message || '保存に失敗しました', 'danger');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center project-form-page list-page">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 mb-0 text-muted">読み込み中…</p>
      </div>
    );
  }

  const title = mode === 'edit' ? '案件編集' : '新規案件登録';
  const submitLabel = saving ? '保存中…' : mode === 'edit' ? '更新' : '登録';

  return (
    <div className="container-fluid py-4 px-3 px-lg-5 project-form-page list-page">
      <form className={saving ? 'is-saving' : ''} onSubmit={handleSubmit}>
        <header className="page-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div className="page-header-main">
            <div className="page-header-icon" aria-hidden="true">
              <i className="bi bi-briefcase-fill" />
            </div>
            <div>
              <div className="page-header-title-row">
                <h1 className="h3 mb-0">{title}</h1>
                <PageGuideHelpButton guideId="project-form" />
              </div>
              <p className="text-muted mb-0 small">案件の基本情報・条件・内容を入力してください</p>
            </div>
          </div>
          <div className="page-header-actions project-form-header-actions d-flex flex-wrap gap-2">
            <Link
              to={cancelPath}
              state={returnState}
              className="btn btn-outline-secondary app-btn project-form-action-btn"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
              キャンセル
            </Link>
            <button type="submit" className="btn btn-primary app-btn project-form-action-btn" disabled={saving}>
              {submitLabel}
            </button>
          </div>
        </header>

        <fieldset disabled={saving}>
          <div className="project-form-body">
            <section className="client-detail-card project-form-card">
              <div className="client-detail-card-header client-detail-card-header--primary">
                <i className="bi bi-info-circle" aria-hidden="true" />
                基本情報
              </div>
              <div className="client-detail-card-body">
                <FormField id="projectFormClientName" label="取引先" required className="project-form-field--client-picker">
                  <ClientNamePicker
                    value={{ clientId: form.clientId, clientName: form.clientName }}
                    onChange={({ clientId, clientName }) =>
                      setForm((prev) => ({ ...prev, clientId, clientName }))
                    }
                    required
                    disabled={saving}
                  />
                </FormField>

                <div className="project-form-primary-grid project-form-primary-grid--single">
                  <FormField id="projectFormName" label="案件名" required>
                    <input
                      id="projectFormName"
                      className="form-control"
                      value={form.projectName}
                      onChange={(e) => updateField('projectName', e.target.value)}
                      required
                    />
                  </FormField>
                </div>

                <div className="project-form-meta-grid project-form-meta-grid--pair">
                  {mode === 'edit' && (
                    <FormField id="projectFormStatus" label="ステータス">
                      <select
                        id="projectFormStatus"
                        className="form-select"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value)}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {projectStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}
                  <FormField
                    id="projectFormHeadcount"
                    label="必要人数"
                    className={mode === 'edit' ? '' : 'project-form-field--solo'}
                  >
                    <div className="input-group project-form-input-group">
                      <input
                        id="projectFormHeadcount"
                        type="number"
                        min="1"
                        className="form-control"
                        value={form.headcountRequired}
                        onChange={(e) => updateField('headcountRequired', e.target.value)}
                      />
                      <span className="input-group-text">名</span>
                    </div>
                  </FormField>
                </div>

                <FormField id="projectFormWorkLocation" label="勤務地" className="project-form-location-field">
                  <div className="input-group project-form-input-group">
                    <span className="input-group-text">
                      <i className="bi bi-geo-alt" aria-hidden="true" />
                    </span>
                    <input
                      id="projectFormWorkLocation"
                      className="form-control"
                      value={form.workLocation}
                      onChange={(e) => updateField('workLocation', e.target.value)}
                      placeholder="例：東京都港区（リモート可）"
                    />
                  </div>
                </FormField>

                <FormField id="projectFormRole" label="役割">
                  <select
                    id="projectFormRole"
                    className="form-select"
                    value={form.projectRole}
                    onChange={(e) => updateField('projectRole', e.target.value)}
                  >
                    <option value="">—</option>
                    {Object.keys(ASSIGNMENT_ROLE_LABELS).map((role) => (
                      <option key={role} value={role}>
                        {assignmentRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  id="projectFormInterviewRounds"
                  label="面談回数"
                  hint="案件票の面談回数をそのまま入力"
                >
                  <div className="input-group project-form-input-group">
                    <span className="input-group-text">
                      <i className="bi bi-chat-dots" aria-hidden="true" />
                    </span>
                    <input
                      id="projectFormInterviewRounds"
                      className="form-control"
                      value={form.interviewRounds}
                      onChange={(e) => updateField('interviewRounds', e.target.value)}
                      placeholder="例：お客様面談1回　弊社面談1回　合計2回"
                    />
                  </div>
                </FormField>
              </div>
            </section>

            <section className="client-detail-card project-form-card">
              <div className="client-detail-card-header client-detail-card-header--info">
                <i className="bi bi-calendar3" aria-hidden="true" />
                期間・スキル
              </div>
              <div className="client-detail-card-body">
                <div className="project-form-period-row">
                  <FormField id="projectFormStartDate" label="開始予定日">
                    <input
                      id="projectFormStartDate"
                      type="date"
                      className="form-control"
                      value={form.expectedStartDate}
                      onChange={(e) => updateField('expectedStartDate', e.target.value)}
                    />
                  </FormField>
                  <div className="project-form-period-sep" aria-hidden="true">
                    <i className="bi bi-arrow-right" />
                  </div>
                  <FormField id="projectFormEndDate" label="終了予定日">
                    <input
                      id="projectFormEndDate"
                      type="date"
                      className="form-control"
                      value={form.expectedEndDate}
                      onChange={(e) => updateField('expectedEndDate', e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField
                  id="projectFormPeriodNotes"
                  label="期間備考"
                  hint="案件票の期間欄の括弧内など（例：8月でも検討可能）"
                >
                  <input
                    id="projectFormPeriodNotes"
                    className="form-control"
                    value={form.periodNotes}
                    onChange={(e) => updateField('periodNotes', e.target.value)}
                    placeholder="例：8月でも検討可能"
                  />
                </FormField>

                <FormField
                  id="projectFormRequiredSkills"
                  label="必要スキル"
                  hint="カンマ区切りで入力できます"
                  className="project-form-skills-field"
                >
                  <div className="input-group project-form-input-group">
                    <span className="input-group-text">
                      <i className="bi bi-tools" aria-hidden="true" />
                    </span>
                    <input
                      id="projectFormRequiredSkills"
                      className="form-control"
                      value={form.requiredSkills}
                      onChange={(e) => updateField('requiredSkills', e.target.value)}
                      placeholder="例：Java, Spring Boot, PostgreSQL"
                    />
                  </div>
                  {parseProjectSkills(form.requiredSkills).length > 0 && (
                    <div className="project-form-skill-chips project-form-skill-preview-list" aria-label="入力中の必須スキル">
                      {parseProjectSkills(form.requiredSkills).map((skill) => (
                        <span key={skill} className="project-form-skill-chip">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </FormField>

                <FormField
                  id="projectFormOptionalSkills"
                  label="任意スキル"
                  hint="カンマ区切りで入力できます"
                  className="project-form-skills-field"
                >
                  <div className="input-group project-form-input-group">
                    <span className="input-group-text">
                      <i className="bi bi-plus-circle" aria-hidden="true" />
                    </span>
                    <input
                      id="projectFormOptionalSkills"
                      className="form-control"
                      value={form.optionalSkills}
                      onChange={(e) => updateField('optionalSkills', e.target.value)}
                      placeholder="例：AWS, Docker, Kubernetes"
                    />
                  </div>
                  {parseProjectSkills(form.optionalSkills).length > 0 && (
                    <div className="project-form-skill-chips project-form-skill-preview-list project-form-skill-chips--optional" aria-label="入力中の任意スキル">
                      {parseProjectSkills(form.optionalSkills).map((skill) => (
                        <span key={skill} className="project-form-skill-chip project-form-skill-chip--optional">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </FormField>

                <FormField
                  id="projectFormBillingUnitPrice"
                  label="請求単価"
                  hint="数値（円）または下のラベル欄に「スキル見合い」等を入力"
                >
                  <div className="input-group project-form-input-group">
                    <span className="input-group-text">
                      <i className="bi bi-currency-yen" aria-hidden="true" />
                    </span>
                    <input
                      id="projectFormBillingUnitPrice"
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control"
                      value={form.billingUnitPrice}
                      onChange={(e) => updateField('billingUnitPrice', e.target.value)}
                      placeholder="例：600000"
                      disabled={isSkillBasedBillingLabel(form.billingPriceLabel)}
                    />
                  </div>
                </FormField>

                <FormField
                  id="projectFormBillingPriceLabel"
                  label="請求単価（ラベル）"
                  hint="「スキル見合い」入力時は数値単価は使わず、マッチングでも単価条件は適用されません"
                >
                  <div className="input-group project-form-input-group">
                    <span className="input-group-text">
                      <i className="bi bi-tag" aria-hidden="true" />
                    </span>
                    <input
                      id="projectFormBillingPriceLabel"
                      className="form-control"
                      value={form.billingPriceLabel}
                      onChange={(e) => updateField('billingPriceLabel', e.target.value)}
                      placeholder="例：スキル見合い"
                    />
                  </div>
                </FormField>
              </div>
            </section>

            <section className="client-detail-card project-form-card">
              <div className="client-detail-card-header client-detail-card-header--success">
                <i className="bi bi-file-earmark-text" aria-hidden="true" />
                案件内容・備考
              </div>
              <div className="client-detail-card-body">
                <div className="project-form-content-grid">
                  <FormField id="projectFormText" label="案件内容">
                    <textarea
                      id="projectFormText"
                      className="form-control project-form-textarea"
                      rows={6}
                      value={form.projectText}
                      onChange={(e) => updateField('projectText', e.target.value)}
                      placeholder="業務内容・求める経験など"
                    />
                  </FormField>
                  <FormField id="projectFormNotes" label="備考">
                    <textarea
                      id="projectFormNotes"
                      className="form-control project-form-textarea"
                      rows={6}
                      value={form.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      placeholder="社内メモ・連絡事項など"
                    />
                  </FormField>
                </div>
              </div>
            </section>
          </div>
        </fieldset>
      </form>

      <AppFooter />
    </div>
  );
}
