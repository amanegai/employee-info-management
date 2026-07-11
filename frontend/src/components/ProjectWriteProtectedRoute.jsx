import { Navigate, Outlet } from 'react-router-dom';
import { canWriteProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function ProjectWriteProtectedRoute() {
  const { user } = useAuth();

  if (!canWriteProjectFeatures(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
