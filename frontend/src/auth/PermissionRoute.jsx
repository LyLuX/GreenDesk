import { Navigate } from 'react-router-dom';
import useAuth from './useAuth.js';
export default function PermissionRoute({ permission, children }) {
  const { hasPermission } = useAuth();
  return (Array.isArray(permission) ? permission : [permission]).some((item) =>
    hasPermission(item),
  ) ? (
    children
  ) : (
    <Navigate to="/403" replace />
  );
}
