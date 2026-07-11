import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { canManageUsers, canViewClientEvents, canViewClientRecords, canManageHrOps, canViewProjectFeatures, canViewFiles, canWriteProjectFeatures, canViewMeetingRooms, roleIcon, roleLabel } from '../auth';
import { useAuth } from '../context/AuthContext';
import { clearProjectMatchStorage } from '../utils/projectMatchState';
import AppMessageBar from './AppMessageBar';
import PageGuideTour from './guide/PageGuideTour';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cancelFollowupCount, setCancelFollowupCount] = useState(0);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const loadCancelFollowupCount = useCallback(async () => {
    if (!canWriteProjectFeatures(user)) {
      setCancelFollowupCount(0);
      return;
    }
    try {
      const result = await api.getCancelFollowupOpenCount();
      setCancelFollowupCount(result?.openCount ?? 0);
    } catch {
      setCancelFollowupCount(0);
    }
  }, [user]);

  useEffect(() => {
    loadCancelFollowupCount();
    const intervalId = window.setInterval(() => {
      loadCancelFollowupCount();
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [loadCancelFollowupCount]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 991.98px)').matches) {
      setSidebarExpanded(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarExpanded) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSidebarExpanded(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarExpanded]);

  async function handleLogout() {
    clearProjectMatchStorage();
    await logout();
    navigate('/login', { replace: true });
  }

  const primaryRole = user?.roles?.[0];
  const sidebarClassName = `app-sidebar${sidebarExpanded ? ' is-expanded' : ' is-collapsed'}`;

  return (
    <div className={`app-shell app-shell-with-sidebar${sidebarExpanded ? ' sidebar-is-expanded' : ''}`}>
      {sidebarExpanded && (
        <button
          type="button"
          className="app-sidebar-backdrop d-lg-none"
          aria-label="メニューを折りたたむ"
          onClick={() => setSidebarExpanded(false)}
        />
      )}
      <div className="app-sidebar-wrap">
        <aside className={sidebarClassName} aria-label="サイドメニュー">
          <div className="app-sidebar-brand">
            <div className="app-sidebar-brand-icon" aria-hidden="true">
              <i className="bi bi-people-fill" />
            </div>
            <div className="app-sidebar-brand-text">
              <span className="app-sidebar-brand-title">社員情報管理</span>
              <span className="app-sidebar-brand-sub">Talent Management</span>
            </div>
          </div>
        {user && (
          <nav id="app-sidebar-nav" className="app-sidebar-nav" aria-label="メインメニュー">
            <NavLink to="/" end title="社員一覧" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
              <i className="bi bi-list-ul" aria-hidden="true" />
              <span className="app-sidebar-nav-label">社員一覧</span>
            </NavLink>
            {canViewProjectFeatures(user) && (
              <>
                <NavLink to="/project-match" title="案件マッチング" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
                  <i className="bi bi-diagram-3" aria-hidden="true" />
                  <span className="app-sidebar-nav-label">案件マッチング</span>
                </NavLink>
                <NavLink to="/projects" title="案件管理" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
                  <i className="bi bi-briefcase" aria-hidden="true" />
                  <span className="app-sidebar-nav-label">案件管理</span>
                </NavLink>
              </>
            )}
            {canViewFiles(user) && (
              <NavLink to="/files" title="ファイル管理" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
                <i className="bi bi-folder2-open" aria-hidden="true" />
                <span className="app-sidebar-nav-label">ファイル管理</span>
              </NavLink>
            )}
            {canViewMeetingRooms(user) && (
              <NavLink to="/meeting-rooms" title="会議室予約" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
                <i className="bi bi-door-open" aria-hidden="true" />
                <span className="app-sidebar-nav-label">会議室予約</span>
              </NavLink>
            )}
            {canWriteProjectFeatures(user) && (
              <NavLink
                to="/employee-status/suggestions"
                title="状態提案"
                className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}
              >
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                <span className="app-sidebar-nav-label">状態提案</span>
              </NavLink>
            )}
            {canWriteProjectFeatures(user) && (
              <NavLink
                to="/assignment-cancel-followups"
                title="配属取消フォロー"
                className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}
              >
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span className="app-sidebar-nav-label">配属取消フォロー</span>
                {cancelFollowupCount > 0 && (
                  <span className="app-sidebar-nav-badge">{cancelFollowupCount}</span>
                )}
              </NavLink>
            )}
            {canManageHrOps(user) && (
              <NavLink to="/hr-ops" title="人事業務管理" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
                <i className="bi bi-clipboard-check" aria-hidden="true" />
                <span className="app-sidebar-nav-label">人事業務管理</span>
              </NavLink>
            )}
            {canViewClientEvents(user) && (
              <NavLink to="/clients" title="取引先管理" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
                <i className="bi bi-building" aria-hidden="true" />
                <span className="app-sidebar-nav-label">取引先管理</span>
              </NavLink>
            )}
            {canViewClientEvents(user) && (
              <NavLink to="/client-events" title="イベント参加" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
                <i className="bi bi-calendar-event" aria-hidden="true" />
                <span className="app-sidebar-nav-label">イベント参加</span>
              </NavLink>
            )}
            {canViewClientRecords(user) && (
              <NavLink to="/client-records" title="議事録・タスク" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
                <i className="bi bi-journal-check" aria-hidden="true" />
                <span className="app-sidebar-nav-label">議事録・タスク</span>
              </NavLink>
            )}
            {canManageUsers(user) && (
              <NavLink to="/users" title="ユーザー管理" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
                <i className="bi bi-person-gear" aria-hidden="true" />
                <span className="app-sidebar-nav-label">ユーザー管理</span>
              </NavLink>
            )}
          </nav>
        )}
        </aside>
        <button
          type="button"
          className="app-sidebar-edge-toggle"
          aria-label={sidebarExpanded ? 'メニューを折りたたむ' : 'メニューを展開'}
          aria-expanded={sidebarExpanded}
          aria-controls="app-sidebar-nav"
          onClick={() => setSidebarExpanded((open) => !open)}
        >
          <i className={`bi ${sidebarExpanded ? 'bi-chevron-left' : 'bi-chevron-right'}`} aria-hidden="true" />
        </button>
      </div>
      <div className="app-layout-main">
        <header className="app-layout-header app-layout-header-actions-only">
          {user && (
            <div className="app-layout-header-actions">
              <div className="app-header-user-chip" title={user.displayName || user.username}>
                <div className="app-header-user-avatar" aria-hidden="true">
                  <i className="bi bi-person-fill" />
                </div>
                <div className="app-header-user-meta">
                  <span className="app-header-user-name">{user.displayName || user.username}</span>
                  {primaryRole && (
                    <span
                      className="app-header-role-icon"
                      title={roleLabel(primaryRole)}
                      aria-label={`ロール: ${roleLabel(primaryRole)}`}
                    >
                      <i className={`bi ${roleIcon(primaryRole)}`} aria-hidden="true" />
                    </span>
                  )}
                </div>
              </div>
              <NavLink
                to="/account/security"
                className={({ isActive }) =>
                  `btn app-header-security-btn app-btn${isActive ? ' active' : ''}`
                }
                title="セキュリティ設定"
              >
                <i className="bi bi-shield-lock" aria-hidden="true" />
              </NavLink>
              <button type="button" className="btn app-header-logout-btn app-btn" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                <span className="app-header-logout-label">ログアウト</span>
              </button>
            </div>
          )}
        </header>
        <AppMessageBar />
        <PageGuideTour />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
