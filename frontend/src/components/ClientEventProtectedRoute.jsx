import { Navigate } from 'react-router-dom';
import { canViewClientEvents } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function ClientEventProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!canViewClientEvents(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
