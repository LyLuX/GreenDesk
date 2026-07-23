import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../auth/useAuth.js';
import { navigationItems } from '../navigation.js';
export default function AppLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
        <strong>GreenDesk</strong>
        <div className="flex items-center gap-3">
          <span>
            {user?.firstName} {user?.lastName}
          </span>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Déconnexion…' : 'Déconnexion'}
          </button>
        </div>
      </header>
      <div className="md:flex">
        <nav className="flex gap-4 border-b bg-white p-4 md:block md:min-h-screen md:w-52">
          {navigationItems
            .filter((link) => hasPermission(link.permission))
            .map((link) => (
              <NavLink className="block py-2" key={link.path} to={link.path}>
                {link.label}
              </NavLink>
            ))}
        </nav>
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
