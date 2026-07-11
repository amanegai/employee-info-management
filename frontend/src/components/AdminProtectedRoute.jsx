import { Navigate, Outlet } from 'react-router-dom';
import { canManageUsers } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function AdminProtectedRoute() {
  const { user } = useAuth();

  if (!canManageUsers(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
