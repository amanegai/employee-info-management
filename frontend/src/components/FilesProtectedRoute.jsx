import { Navigate, Outlet } from 'react-router-dom';
import { canViewFiles } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function FilesProtectedRoute() {
  const { user } = useAuth();

  if (!canViewFiles(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
