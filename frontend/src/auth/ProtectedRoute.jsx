import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from '../components/Loader.jsx';
import { rememberReturnLocation } from './return-location.js';
import useAuth from './useAuth.js';
import { hasPendingSecurityLogout } from './security-logout.js';
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing, isLoggingOut } = useAuth();
  const location = useLocation();
  const returnLocation = `${location.pathname}${location.search}${location.hash}`;
  const shouldRememberDestination = !isLoggingOut && !hasPendingSecurityLogout();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated && shouldRememberDestination) {
      rememberReturnLocation(returnLocation);
    }
  }, [isAuthenticated, isInitializing, shouldRememberDestination, returnLocation]);

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
      state={
        shouldRememberDestination
          ? {
              from: returnLocation,
              notification: {
                type: 'error',
                message: 'Vous devez être connecté pour accéder à cette page.',
              },
            }
          : undefined
      }
    />
  );
}
