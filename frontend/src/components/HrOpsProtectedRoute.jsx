import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { canManageHrOps } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function HrOpsProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!canManageHrOps(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
