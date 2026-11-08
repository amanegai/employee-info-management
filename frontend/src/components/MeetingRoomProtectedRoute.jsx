import { Navigate, Outlet } from 'react-router-dom';
import { canViewMeetingRooms } from '../auth';
import { useAuth } from '../context/AuthContext';

export default function MeetingRoomProtectedRoute() {
  const { user } = useAuth();

  if (!canViewMeetingRooms(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
