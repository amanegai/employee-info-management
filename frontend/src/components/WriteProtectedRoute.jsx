import { Navigate, Outlet } from 'react-router-dom';
import { canWrite } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function WriteProtectedRoute() {
  const { user } = useAuth();

  if (!canWrite(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
