import { Navigate, Outlet } from 'react-router-dom';
import { canViewEmployeeDirectory } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function EmployeeDirectoryProtectedRoute() {
  const { user } = useAuth();

  if (!canViewEmployeeDirectory(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
