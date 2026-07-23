import { Navigate, useLocation } from 'react-router-dom';
import useAuth from './useAuth.js';
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();
  if (isInitializing)
    return (
      <main className="loading-page d-grid place-items-center text-body-secondary" role="status">
        Chargement de la session…
      </main>
    );
  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}
