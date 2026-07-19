import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMinLoading } from '../hooks';
import PageLoader from './ui/PageLoader';

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const showLoader = useMinLoading(loading);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (loading || showLoader) {
    return (
      <div className="app-shell-skeleton">
        <aside className="app-shell-skeleton-sidebar" aria-hidden="true" />
        <div className="app-shell-skeleton-main">
          <div className="app-shell-skeleton-header" aria-hidden="true" />
          <div className="app-shell-skeleton-content">
            <PageLoader variant="detail" label="Chargement" />
          </div>
        </div>
      </div>
    );
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
