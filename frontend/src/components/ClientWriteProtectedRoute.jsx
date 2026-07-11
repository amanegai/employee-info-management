import { Navigate } from 'react-router-dom';
import { canWriteClientEvents } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function ClientWriteProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!canWriteClientEvents(user)) {
    return <Navigate to="/clients" replace />;
  }

  return children;
}
