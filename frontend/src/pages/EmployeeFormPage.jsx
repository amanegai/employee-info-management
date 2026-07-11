import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import AppFooter from '../components/AppFooter';
import DetailTabs from '../components/detail/DetailTabs';
import FormActionBar from '../components/detail/FormActionBar';
import BasicFormTab from '../components/form/tabs/BasicFormTab';
import SkillsFormTab from '../components/form/tabs/SkillsFormTab';
import AttendanceFormTab from '../components/form/tabs/AttendanceFormTab';
import EvaluationFormTab from '../components/form/tabs/EvaluationFormTab';
import SalaryFormTab from '../components/form/tabs/SalaryFormTab';
import ProjectsTab from '../components/detail/tabs/ProjectsTab';
import { EMPTY_EMPLOYEE_FORM, detailToForm, formToSavePayload, validateEmployeeCoreFields } from '../utils';
import { canWriteSalary } from '../auth';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';
import PageGuideHelpButton from '../components/guide/PageGuideHelpButton';

export default function EmployeeFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || '/';
  const backLabel = location.state?.fromLabel || '一覧に戻る';
  const navState = location.state?.from
    ? { from: location.state.from, fromLabel: location.state.fromLabel }
    : undefined;
  const { showMessage } = useAppMessage();
  const { user } = useAuth();
  const salaryReadOnly = !canWriteSalary(user);
  const isEdit = mode === 'edit';

  const [master, setMaster] = useState(null);
  const [form, setForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setMaster(await api.getMaster());
      } catch (e) {
        setLoadError(e.message);
        return;
      }
      if (!isEdit) {
        try {
          const { employeeCode } = await api.getNextEmployeeCode();
          setForm((prev) => ({ ...prev, employeeCode }));
        } catch {
          /* 採番 API 失敗時もフォームは利用可能 */
        }
      }
    })();
  }, [isEdit]);

  const loadEmployee = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    setLoadError('');
    try {
      const detail = await api.getEmployeeDetail(id);
      setForm(detailToForm(detail));
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  const fromImport = Boolean(location.state?.fromImport);

  async function handleSubmit() {
    setFormError('');
    const coreError = validateEmployeeCoreFields(form);
    if (coreError) {
      showMessage(coreError, 'danger');
      setFormError(coreError);
      setActiveTab('basic');
      return;
    }
    setSaving(true);
    try {
      const payload = formToSavePayload(form);
      if (isEdit) {
        await api.updateEmployee(id, payload);
        navigate(`/employees/${id}`, { replace: true, state: navState });
      } else {
        const created = await api.createEmployee(payload);
        navigate(`/employees/${created.id}`, { replace: true });
      }
    } catch (e) {
      showMessage(e.message, 'danger');
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (isEdit) {
      navigate(`/employees/${id}`, { state: navState });
    } else {
      navigate(backPath);
    }
  }

  function renderTab() {
    switch (activeTab) {
      case 'basic':
        return (
          <BasicFormTab form={form} master={master} isEdit={isEdit} onChange={setForm} />
        );
      case 'skills':
        return <SkillsFormTab form={form} onChange={setForm} />;
      case 'attendance':
        return <AttendanceFormTab form={form} onChange={setForm} />;
      case 'evaluation':
        return <EvaluationFormTab form={form} onChange={setForm} />;
      case 'projects':
        return isEdit ? (
          <ProjectsTab employeeId={Number(id)} employeeWorkStatus={form.workStatus} />
        ) : (
          <p className="text-muted mb-0">社員登録後に案件・配属情報を確認できます。</p>
        );
      case 'salary':
        return <SalaryFormTab form={form} onChange={setForm} readOnly={salaryReadOnly} />;
      default:
        return null;
    }
  }

  const subtitle = isEdit
    ? [form.employeeCode, form.name].filter(Boolean).join('　') || '—'
    : '新規入力';

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted detail-page">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 mb-0">読み込み中…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container-fluid py-5 detail-page">
        <div className="alert alert-danger">{loadError}</div>
        <button type="button" className="btn btn-outline-secondary app-btn" onClick={() => navigate('/')}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
          一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 detail-page">
      <header className="page-header mb-3">
        <div className="page-header-main">
          <div className="page-header-icon" aria-hidden="true">
            <i className={`bi ${isEdit ? 'bi-pencil-square' : 'bi-person-plus-fill'}`} />
          </div>
          <div>
            <div className="page-header-title-row">
              <h1 className="h3 mb-0">{isEdit ? '社員情報編集' : '新規社員登録'}</h1>
              <PageGuideHelpButton guideId="employee-form" />
            </div>
            <p className="text-muted mb-0 small">{subtitle}</p>
          </div>
        </div>
      </header>

      <div className="detail-toolbar-panel">
        <DetailTabs activeTab={activeTab} onChange={setActiveTab} />
        <FormActionBar
          isEdit={isEdit}
          saving={saving}
          onCancel={handleCancel}
          onBack={() => navigate(backPath)}
          backLabel={backLabel}
        />
      </div>

      <div className="detail-content detail-content-panel">
        {fromImport && (
          <div className="alert alert-warning py-2 mb-3" role="status">
            履歴書を取り込みました。社員種別・所属部門・稼働状況を入力して保存してください。
          </div>
        )}
        {formError && (
          <div className="alert alert-danger py-2 mb-3" role="alert">
            {formError}
          </div>
        )}
        <form
          id="employee-form"
          className="detail-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {renderTab()}
        </form>
      </div>

      <AppFooter />
    </div>
  );
}
