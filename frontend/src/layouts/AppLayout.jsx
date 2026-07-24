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
    <div className="app-shell">
      <header className="app-header">
        <div className="container-fluid d-flex align-items-center justify-content-between gap-3 px-4 pt-2">
          <NavLink className="brand-lockup d-flex align-items-center gap-3" to="/dashboard">
            <img className="brand-logo" src="/brand-logo.jpg" alt="EI BOURNAZEL Paul" />
            <span>
              <span className="brand-name d-block">GreenDesk</span>
              <span className="brand-company d-block">EI BOURNAZEL Paul</span>
            </span>
          </NavLink>
          <div className="d-flex align-items-center gap-3 text-white">
            <span className="d-none d-sm-inline small">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="btn btn-sm btn-outline-light"
            >
              {isLoggingOut ? 'Déconnexion…' : 'Déconnexion'}
            </button>
          </div>
        </div>
      </header>
      <div className="d-md-flex">
        <nav className="sidebar p-3">
          <p className="sidebar-label mb-2 px-2">Navigation</p>
          <div className="sidebar-nav">
            {navigationItems
              .filter((link) => hasPermission(link.permission))
              .map((link) => (
                <NavLink
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  key={link.path}
                  to={link.path}
                >
                  {link.label}
                </NavLink>
              ))}
          </div>
        </nav>
        <div className="app-content flex-grow-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
