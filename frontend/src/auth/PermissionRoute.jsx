import { Navigate } from 'react-router-dom';
import useAuth from './useAuth.js';
export default function PermissionRoute({ permission, children }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? children : <Navigate to="/403" replace />;
}
