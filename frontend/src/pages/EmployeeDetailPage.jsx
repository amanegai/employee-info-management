import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import DetailActionBar from '../components/detail/DetailActionBar';
import DetailTabs from '../components/detail/DetailTabs';
import BasicTab from '../components/detail/tabs/BasicTab';
import SkillsTab from '../components/detail/tabs/SkillsTab';
import AttendanceTab from '../components/detail/tabs/AttendanceTab';
import EvaluationTab from '../components/detail/tabs/EvaluationTab';
import ProjectsTab from '../components/detail/tabs/ProjectsTab';
import SalaryTab from '../components/detail/tabs/SalaryTab';
import AlignedJapaneseName from '../components/AlignedJapaneseName';
import AppFooter from '../components/AppFooter';
import EmployeeResumeModal from '../components/detail/EmployeeResumeModal';
import EmployeeAppealModal from '../components/detail/EmployeeAppealModal';
import EmployeePersonalSummaryModal from '../components/detail/EmployeePersonalSummaryModal';
import { useAppMessage } from '../context/MessageContext';
import { canDelete, canWrite } from '../auth';
import { useAuth } from '../context/AuthContext';
import PageGuideHelpButton from '../components/guide/PageGuideHelpButton';
import { currentTargetMonth } from '../utils/fileCategories';
import { canShowPersonalSummary } from '../utils/personalInfoSummary';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || '/employees';
  const backLabel = location.state?.fromLabel || '一覧に戻る';
  const matchState = location.state?.matchState;

  function navigateBack() {
    if (backPath === '/project-match' && matchState) {
      navigate('/project-match', { state: { matchState } });
      return;
    }
    if (location.state?.fromImport) {
      navigate('/employees', { state: { refreshList: true } });
      return;
    }
    navigate(backPath);
  }
  const { showMessage } = useAppMessage();
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'basic');
  const [deleting, setDeleting] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);
  const [showPersonalSummary, setShowPersonalSummary] = useState(false);
  const [attendanceMonths, setAttendanceMonths] = useState([]);
  const [attendanceMonth, setAttendanceMonth] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEmployee(await api.getEmployeeDetail(id));
    } catch (e) {
      setError(e.message);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.pathname, location.state?.activeTab]);

  useEffect(() => {
    if (activeTab !== 'attendance' || !id) return undefined;
    let cancelled = false;
    api.getEmployeeAttendanceMonths(id)
      .then((months) => {
        if (cancelled) return;
        setAttendanceMonths(months ?? []);
        setAttendanceMonth((prev) => prev || currentTargetMonth());
      })
      .catch(() => {
        if (!cancelled) setAttendanceMonths([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, activeTab, employee?.attendance?.periodLabel]);

  useEffect(() => {
    if (activeTab !== 'attendance' || !id || !attendanceMonth) return undefined;
    let cancelled = false;
    setAttendanceLoading(true);
    api.getEmployeeAttendance(id, attendanceMonth)
      .then((data) => {
        if (!cancelled) setAttendanceData(data);
      })
      .catch(() => {
        if (!cancelled) setAttendanceData(null);
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, activeTab, attendanceMonth]);

  async function handleDelete() {
    if (!window.confirm(`${employee?.name} を削除しますか？`)) return;
    setDeleting(true);
    try {
      await api.deleteEmployee(id);
      navigate(backPath, { replace: true });
    } catch (e) {
      showMessage(e.message, 'danger');
    } finally {
      setDeleting(false);
    }
  }

  function handleResume() {
    setShowResume(true);
  }

  function handleAppeal() {
    setShowAppeal(true);
  }

  function handlePersonalSummary() {
    setShowPersonalSummary(true);
  }

  function renderTab() {
    if (!employee) return null;
    switch (activeTab) {
      case 'basic':
        return <BasicTab employee={employee} />;
      case 'projects':
        return <ProjectsTab employeeId={Number(id)} employeeWorkStatus={employee.workStatus} />;
      case 'skills':
        return <SkillsTab employee={employee} />;
      case 'attendance':
        return (
          <AttendanceTab
            employee={{
              ...employee,
              attendance: attendanceData ?? (attendanceLoading ? employee.attendance : attendanceData),
            }}
            attendanceMonths={attendanceMonths}
            selectedMonth={attendanceMonth}
            onMonthChange={setAttendanceMonth}
            loading={attendanceLoading}
          />
        );
      case 'evaluation':
        return <EvaluationTab employee={employee} />;
      case 'salary':
        return <SalaryTab employee={employee} active={activeTab === 'salary'} />;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 detail-page">
        <div className="page-state-panel">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-3 mb-0">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="container-fluid py-5 detail-page">
        <div className="alert alert-danger">{error || '社員が見つかりません'}</div>
        <button type="button" className="btn btn-outline-secondary app-btn" onClick={navigateBack}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
          {backLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 detail-page">
      <header className="page-header mb-3">
        <div className="page-header-main">
          <div className="page-header-icon" aria-hidden="true">
            <i className="bi bi-person-vcard-fill" />
          </div>
          <div>
            <div className="page-header-title-row">
              <h1 className="h3 mb-0">社員情報詳細</h1>
              <PageGuideHelpButton guideId="employee-detail" />
            </div>
            <div className="page-header-employee-identity">
              <AlignedJapaneseName
                name={employee.name}
                kana={employee.personal?.furigana}
                nameClassName="page-header-employee-name"
                kanaClassName="page-header-employee-kana"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="detail-toolbar-panel">
        <DetailTabs activeTab={activeTab} onChange={setActiveTab} />
        <DetailActionBar
          onEdit={() =>
            navigate(`/employees/${id}/edit`, {
              state: { from: backPath, fromLabel: backLabel, matchState },
            })
          }
          onDelete={handleDelete}
          onBack={navigateBack}
          backLabel={backLabel}
          onResume={handleResume}
          onAppeal={handleAppeal}
          onPersonalSummary={handlePersonalSummary}
          showPersonalSummary={canShowPersonalSummary(employee.workStatus)}
          deleting={deleting}
          canEdit={canWrite(user)}
          canDelete={canDelete(user)}
        />
      </div>

      <div className="detail-content detail-content-panel">{renderTab()}</div>

      <AppFooter />

      {showResume && (
        <EmployeeResumeModal employee={employee} onClose={() => setShowResume(false)} />
      )}

      {showAppeal && (
        <EmployeeAppealModal employee={employee} onClose={() => setShowAppeal(false)} />
      )}

      {showPersonalSummary && (
        <EmployeePersonalSummaryModal
          employee={employee}
          onClose={() => setShowPersonalSummary(false)}
        />
      )}
    </div>
  );
}
