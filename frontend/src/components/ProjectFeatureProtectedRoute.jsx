import { Navigate, Outlet } from 'react-router-dom';
import { canViewProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function ProjectFeatureProtectedRoute() {
  const { user } = useAuth();

  if (!canViewProjectFeatures(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
