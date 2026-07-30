import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from '../components/Loader.jsx';
import useAuth from './useAuth.js';
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing, isLoggingOut } = useAuth();
  const location = useLocation();
  if (isInitializing)
    return (
      <main className="loading-page d-grid align-items-center justify-content-center">
        <Loader label="Chargement de la session" />
      </main>
    );
  return isAuthenticated ? (
    (children ?? <Outlet />)
  ) : (
    <Navigate
      to="/login"
      replace
      state={{
        from: `${location.pathname}${location.search}${location.hash}`,
        ...(!isLoggingOut && {
          notification: {
            type: 'error',
            message: 'Vous devez être connecté pour accéder à cette page.',
          },
        }),
      }}
    />
  );
}
