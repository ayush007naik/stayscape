import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    return (
      <div className="container page">
        <div className="empty-state">
          <h2>Hosts only</h2>
          <p>This area is available to host accounts. Log in with a host account to continue.</p>
        </div>
      </div>
    );
  }

  return children;
}
