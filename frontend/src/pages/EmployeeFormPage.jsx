import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import AppFooter from '../components/AppFooter';
import DetailTabs from '../components/detail/DetailTabs';
import FormActionBar from '../components/detail/FormActionBar';
import BasicFormTab from '../components/form/tabs/BasicFormTab';
import SkillsFormTab from '../components/form/tabs/SkillsFormTab';
import AttendanceFormTab from '../components/form/tabs/AttendanceFormTab';
import EvaluationFormTab from '../components/form/tabs/EvaluationFormTab';
import SalaryFormTab from '../components/form/tabs/SalaryFormTab';
import ProjectsTab from '../components/detail/tabs/ProjectsTab';
import {
  EMPTY_EMPLOYEE_FORM,
  buildResignationSaveConfirmMessage,
  detailToForm,
  formToSavePayload,
  validateEmployeeCoreFields,
  workStatusFromResignationDate,
} from '../utils';
import {
  canChangeEmployeeDepartmentAndRole,
  canEditResignationDate,
  canEditWorkStatus,
  canWriteSalary,
} from '../auth';
import { useAuth } from '../context/AuthContext';
import { useAppMessage } from '../context/MessageContext';
import PageGuideHelpButton from '../components/guide/PageGuideHelpButton';
import { formatRecommendHint, validateEmployeeCode } from '../utils/employeeCode';
import {
  clearEmployeeImportPrefill,
  readEmployeeImportPrefill,
} from '../utils/employeeImportPrefill';

function resolveCreateInitial(locationState) {
  if (locationState?.prefillForm) {
    return {
      form: locationState.prefillForm,
      fromImport: Boolean(locationState.fromImport),
    };
  }
  const stashed = readEmployeeImportPrefill();
  if (stashed) {
    return { form: stashed, fromImport: true };
  }
  return {
    form: EMPTY_EMPLOYEE_FORM,
    fromImport: Boolean(locationState?.fromImport),
  };
}

export default function EmployeeFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || '/employees';
  const backLabel = location.state?.fromLabel || '一覧に戻る';
  const navState = location.state?.from
    ? { from: location.state.from, fromLabel: location.state.fromLabel }
    : undefined;
  const { showMessage } = useAppMessage();
  const { user } = useAuth();
  const salaryReadOnly = !canWriteSalary(user);
  const canChangeDeptRole = canChangeEmployeeDepartmentAndRole(user);
  const canEditResignation = canEditResignationDate(user);
  const isEdit = mode === 'edit';

  const [boot] = useState(() =>
    isEdit
      ? { form: EMPTY_EMPLOYEE_FORM, fromImport: false }
      : resolveCreateInitial(location.state)
  );
  const [master, setMaster] = useState(null);
  const [form, setForm] = useState(() => boot.form);
  const [initialResignationDate, setInitialResignationDate] = useState(
    () => boot.form?.hr?.resignationDate ?? ''
  );
  const [initialWorkStatus, setInitialWorkStatus] = useState(() => boot.form?.workStatus ?? '');
  const [fromImport] = useState(() => boot.fromImport);
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [codeHint, setCodeHint] = useState('');
  const statusEditable = canEditWorkStatus(user, initialWorkStatus || form.workStatus);

  const requestCodeHint = useCallback(async (employeeType, departmentId, affiliationCompany) => {
    if (isEdit) return;
    if (!employeeType?.trim() || !departmentId || Number(departmentId) <= 0 || !affiliationCompany) {
      setCodeHint('');
      return;
    }
    try {
      const recommend = await api.recommendEmployeeCode(
        employeeType,
        Number(departmentId),
        affiliationCompany
      );
      setCodeHint(formatRecommendHint(recommend));
    } catch {
      setCodeHint('');
    }
  }, [isEdit]);

  useEffect(() => {
    (async () => {
      try {
        setMaster(await api.getMaster());
      } catch (e) {
        setLoadError(e.message);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit && form.employeeType && form.departmentId && form.affiliationCompany) {
      void requestCodeHint(form.employeeType, form.departmentId, form.affiliationCompany);
    }
  }, [isEdit, form.employeeType, form.departmentId, form.affiliationCompany, requestCodeHint]);

  const loadEmployee = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    setLoadError('');
    try {
      const detail = await api.getEmployeeDetail(id);
      const nextForm = detailToForm(detail);
      setForm(nextForm);
      setInitialResignationDate(nextForm.hr?.resignationDate ?? '');
      setInitialWorkStatus(nextForm.workStatus ?? '');
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  async function handleSubmit() {
    setFormError('');
    const coreError = validateEmployeeCoreFields(form);
    if (coreError) {
      showMessage(coreError, 'danger');
      setFormError(coreError);
      setActiveTab('basic');
      return;
    }
    if (!isEdit) {
      const dept = (master?.departments ?? []).find((d) => String(d.id) === String(form.departmentId));
      const codeError = validateEmployeeCode(
        form.employeeCode,
        form.employeeType,
        dept?.name,
        form.affiliationCompany
      );
      if (codeError) {
        showMessage(codeError, 'danger');
        setFormError(codeError);
        setActiveTab('basic');
        return;
      }
    }

    let submitForm = form;
    const nextResignation = String(form.hr?.resignationDate ?? '').trim();
    const prevResignation = String(initialResignationDate ?? '').trim();
    const resignationChanged = canEditResignation && nextResignation !== prevResignation;
    if (resignationChanged) {
      const confirmed = window.confirm(buildResignationSaveConfirmMessage(nextResignation));
      if (!confirmed) return;
      if (nextResignation) {
        const nextStatus = workStatusFromResignationDate(nextResignation);
        if (nextStatus) {
          submitForm = { ...form, workStatus: nextStatus };
          setForm(submitForm);
        }
      }
    }

    setSaving(true);
    try {
      const payload = formToSavePayload(submitForm);
      if (isEdit) {
        await api.updateEmployee(id, payload);
        navigate(`/employees/${id}`, { replace: true, state: navState });
      } else {
        clearEmployeeImportPrefill();
        const created = await api.createEmployee(payload);
        navigate(`/employees/${created.id}`, {
          replace: true,
          state: fromImport
            ? { fromImport: true, from: '/employees', fromLabel: '社員一覧に戻る' }
            : { from: '/employees', fromLabel: '一覧に戻る' },
        });
      }
    } catch (e) {
      const conflict =
        e instanceof ApiError && e.status === 409
          ? '他のユーザーにより更新されています。最新データを再読み込みしてから保存してください'
          : e.message;
      showMessage(conflict, 'danger');
      setFormError(conflict);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    clearEmployeeImportPrefill();
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
          <BasicFormTab
            form={form}
            master={master}
            isEdit={isEdit}
            onChange={setForm}
            codeHint={codeHint}
            canChangeDeptRole={canChangeDeptRole}
            canEditResignation={canEditResignation}
            canEditStatus={statusEditable}
            onRequestCodeHint={requestCodeHint}
          />
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
        <button type="button" className="btn btn-outline-secondary app-btn" onClick={() => navigate('/employees')}>
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
          onBack={() => {
            clearEmployeeImportPrefill();
            navigate(backPath);
          }}
          backLabel={backLabel}
        />
      </div>

      <div className="detail-content detail-content-panel">
        {fromImport && (
          <div className="alert alert-warning py-2 mb-3" role="status">
            履歴書を取り込みました。社員ID・社員種別・所属部門を入力し、推奨番号を参考にして登録してください。
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
