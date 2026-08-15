import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from '../components/Loader.jsx';
import { rememberReturnLocation } from './return-location.js';
import useAuth from './useAuth.js';
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing, isLoggingOut } = useAuth();
  const location = useLocation();
  const returnLocation = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (!isInitializing && !isAuthenticated && !isLoggingOut) {
      rememberReturnLocation(returnLocation);
    }
  }, [isAuthenticated, isInitializing, isLoggingOut, returnLocation]);

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
        !isLoggingOut
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
