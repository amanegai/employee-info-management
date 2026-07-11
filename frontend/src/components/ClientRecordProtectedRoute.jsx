import { Navigate } from 'react-router-dom';
import { canViewClientRecords } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function ClientRecordProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!canViewClientRecords(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
