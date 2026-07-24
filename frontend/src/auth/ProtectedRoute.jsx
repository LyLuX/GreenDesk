import { Navigate, useLocation } from 'react-router-dom';
import Loader from '../components/Loader.jsx';
import useAuth from './useAuth.js';
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();
  if (isInitializing)
    return (
      <main className="loading-page d-grid place-items-center">
        <Loader label="Chargement de la session" />
      </main>
    );
  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}
