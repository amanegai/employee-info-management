import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { setUnauthorizedHandler } from './api';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import WriteProtectedRoute from './components/WriteProtectedRoute';
import ProjectFeatureProtectedRoute from './components/ProjectFeatureProtectedRoute';
import ProjectWriteProtectedRoute from './components/ProjectWriteProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MessageProvider } from './context/MessageContext';
import { PageGuideProvider } from './context/PageGuideContext';
import ClientEventProtectedRoute from './components/ClientEventProtectedRoute';
import ClientRecordProtectedRoute from './components/ClientRecordProtectedRoute';
import ClientWriteProtectedRoute from './components/ClientWriteProtectedRoute';
import HrOpsProtectedRoute from './components/HrOpsProtectedRoute';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const EmployeeListPage = lazy(() => import('./pages/EmployeeListPage'));
const EmployeeDetailPage = lazy(() => import('./pages/EmployeeDetailPage'));
const EmployeeFormPage = lazy(() => import('./pages/EmployeeFormPage'));
const ProjectMatchPage = lazy(() => import('./pages/ProjectMatchPage'));
const ProjectListPage = lazy(() => import('./pages/ProjectListPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ProjectFormPage = lazy(() => import('./pages/ProjectFormPage'));
const BpHelpRequestsPage = lazy(() => import('./pages/BpHelpRequestsPage'));
const EmployeeStatusSuggestionsPage = lazy(() => import('./pages/EmployeeStatusSuggestionsPage'));
const AssignmentCancelFollowupsPage = lazy(() => import('./pages/AssignmentCancelFollowupsPage'));
const ClientEventPage = lazy(() => import('./pages/ClientEventPage'));
const ClientEventFormPage = lazy(() => import('./pages/ClientEventFormPage'));
const ClientRecordPage = lazy(() => import('./pages/ClientRecordPage'));
const ClientRecordFormPage = lazy(() => import('./pages/ClientRecordFormPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const AccountSecurityPage = lazy(() => import('./pages/AccountSecurityPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const FileManagementPage = lazy(() => import('./pages/FileManagementPage'));
const ClientListPage = lazy(() => import('./pages/ClientListPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const ClientFormPage = lazy(() => import('./pages/ClientFormPage'));
const HrOpsHubPage = lazy(() => import('./pages/HrOpsHubPage'));
const HrOpsCertificatePage = lazy(() => import('./pages/HrOpsCertificatePage'));
const HrOpsApplicationPage = lazy(() => import('./pages/HrOpsApplicationPage'));
const HrOpsApplicationReviewPage = lazy(() => import('./pages/HrOpsApplicationReviewPage'));
const HrOpsClientSendPage = lazy(() => import('./pages/HrOpsClientSendPage'));
const HrOpsPayrollPage = lazy(() => import('./pages/HrOpsPayrollPage'));
const HrOpsPlaceholderPage = lazy(() => import('./pages/HrOpsPlaceholderPage'));
const MeetingRoomCalendarPage = lazy(() => import('./pages/MeetingRoomCalendarPage'));

function PageLoader() {
  return (
    <div className="auth-loading-screen">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-3 mb-0 text-muted">読み込み中…</p>
    </div>
  );
}

function AppRoutes() {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      if (!wasAuthenticatedRef.current) return;
      wasAuthenticatedRef.current = false;
      try {
        await logout();
      } catch {
        /* session may already be expired */
      }
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    });
  }, [logout, navigate, location.pathname]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<EmployeeListPage />} />
            <Route element={<ProjectFeatureProtectedRoute />}>
              <Route path="/project-match" element={<ProjectMatchPage />} />
              <Route path="/projects" element={<ProjectListPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/bp-help-requests" element={<BpHelpRequestsPage />} />
            </Route>
            <Route path="/files" element={<FileManagementPage />} />
            <Route path="/meeting-rooms" element={<MeetingRoomCalendarPage />} />
            <Route element={<ProjectWriteProtectedRoute />}>
              <Route path="/projects/new" element={<ProjectFormPage mode="create" />} />
              <Route path="/projects/:id/edit" element={<ProjectFormPage mode="edit" />} />
              <Route path="/employee-status/suggestions" element={<EmployeeStatusSuggestionsPage />} />
              <Route path="/assignment-cancel-followups" element={<AssignmentCancelFollowupsPage />} />
            </Route>
            <Route
              path="/client-events"
              element={
                <ClientEventProtectedRoute>
                  <ClientEventPage />
                </ClientEventProtectedRoute>
              }
            />
            <Route
              path="/client-events/new"
              element={
                <ClientEventProtectedRoute>
                  <ClientWriteProtectedRoute>
                    <ClientEventFormPage mode="create" />
                  </ClientWriteProtectedRoute>
                </ClientEventProtectedRoute>
              }
            />
            <Route
              path="/client-events/:id/edit"
              element={
                <ClientEventProtectedRoute>
                  <ClientWriteProtectedRoute>
                    <ClientEventFormPage mode="edit" />
                  </ClientWriteProtectedRoute>
                </ClientEventProtectedRoute>
              }
            />
            <Route
              path="/client-records"
              element={
                <ClientRecordProtectedRoute>
                  <ClientRecordPage />
                </ClientRecordProtectedRoute>
              }
            />
            <Route
              path="/client-records/new"
              element={
                <ClientRecordProtectedRoute>
                  <ClientRecordFormPage mode="create" />
                </ClientRecordProtectedRoute>
              }
            />
            <Route
              path="/client-records/:id/edit"
              element={
                <ClientRecordProtectedRoute>
                  <ClientRecordFormPage mode="edit" />
                </ClientRecordProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ClientEventProtectedRoute>
                  <ClientListPage />
                </ClientEventProtectedRoute>
              }
            />
            <Route
              path="/clients/new"
              element={
                <ClientEventProtectedRoute>
                  <ClientWriteProtectedRoute>
                    <ClientFormPage mode="create" />
                  </ClientWriteProtectedRoute>
                </ClientEventProtectedRoute>
              }
            />
            <Route
              path="/clients/:id/edit"
              element={
                <ClientEventProtectedRoute>
                  <ClientWriteProtectedRoute>
                    <ClientFormPage mode="edit" />
                  </ClientWriteProtectedRoute>
                </ClientEventProtectedRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ClientEventProtectedRoute>
                  <ClientDetailPage />
                </ClientEventProtectedRoute>
              }
            />
            <Route element={<HrOpsProtectedRoute />}>
              <Route path="/hr-ops" element={<HrOpsHubPage />} />
              <Route path="/hr-ops/certificate" element={<HrOpsCertificatePage />} />
              <Route path="/hr-ops/application" element={<HrOpsApplicationPage />} />
              <Route path="/hr-ops/application-review" element={<HrOpsApplicationReviewPage />} />
              <Route path="/hr-ops/payroll" element={<HrOpsPayrollPage />} />
              <Route path="/hr-ops/client-send" element={<HrOpsClientSendPage />} />
              <Route path="/hr-ops/onboarding" element={<HrOpsPlaceholderPage businessId="onboarding" />} />
              <Route path="/hr-ops/offboarding" element={<HrOpsPlaceholderPage businessId="offboarding" />} />
              <Route path="/hr-ops/other" element={<HrOpsPlaceholderPage businessId="other" />} />
            </Route>
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/account/security" element={<AccountSecurityPage />} />
            <Route element={<WriteProtectedRoute />}>
              <Route path="/employees/new" element={<EmployeeFormPage mode="create" />} />
              <Route path="/employees/:id/edit" element={<EmployeeFormPage mode="edit" />} />
            </Route>
            <Route element={<AdminProtectedRoute />}>
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MessageProvider>
        <PageGuideProvider>
          <AppRoutes />
        </PageGuideProvider>
      </MessageProvider>
    </AuthProvider>
  );
}
