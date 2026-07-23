import { Navigate } from 'react-router-dom';
import useAuth from './useAuth.js';

/** Restricts a frontend route to administrators. */
export default function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.roles?.includes('ADMIN') ? children : <Navigate to="/403" replace />;
}
