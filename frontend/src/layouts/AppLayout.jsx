import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../auth/useAuth.js';
import CompanyLogo from '../components/CompanyLogo.jsx';
import CompanySwitcher from '../components/CompanySwitcher.jsx';
import SidebarNavigation from '../components/SidebarNavigation.jsx';
import useNotification from '../notifications/useNotification.js';
import { lockPageScroll } from '../utils/page-scroll-lock.js';

const focusableElements = (container) =>
  [...(container?.querySelectorAll('a[href], button:not([disabled])') ?? [])].filter(
    (element) => !element.closest('[hidden]'),
  );

export default function AppLayout() {
  const {
    user,
    logout,
    hasPermission,
    companies = [],
    activeCompany,
    selectCompany = () => false,
  } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!isSidebarOpen) return undefined;
    const releaseScrollLock = lockPageScroll();
    sidebarRef.current?.querySelector('.sidebar-close')?.focus();
    const handleDrawerKeydown = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusableElements(sidebarRef.current);
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', handleDrawerKeydown);
    return () => {
      releaseScrollLock();
      window.removeEventListener('keydown', handleDrawerKeydown);
      menuButtonRef.current?.focus();
    };
  }, [isSidebarOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setLoggingOut(true);
    await logout();
    notify('success', 'Vous avez été déconnecté avec succès.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner container-fluid d-flex align-items-center justify-content-between gap-3 px-3 px-sm-4 py-2">
          <div className="header-brand d-flex align-items-center gap-3">
            <button
              ref={menuButtonRef}
              aria-controls="main-navigation"
              aria-expanded={isSidebarOpen}
              className="btn btn-sm btn-outline-light d-md-none"
              type="button"
              onClick={() => setSidebarOpen(true)}
            >
              Menu
            </button>
            <div className="brand-lockup d-flex align-items-center gap-2 gap-sm-3">
              <NavLink
                className="flex-shrink-0"
                to="/dashboard"
                aria-label="Tableau de bord"
                onClick={() => setSidebarOpen(false)}
              >
                <CompanyLogo company={activeCompany} className="brand-logo" />
              </NavLink>
              <div className="header-brand-text">
                <span className="brand-name d-block">GreenDesk</span>
                <CompanySwitcher
                  companies={companies}
                  activeCompany={activeCompany}
                  onSelect={(uuid) => {
                    if (selectCompany(uuid)) window.location.reload();
                  }}
                />
              </div>
            </div>
          </div>
          <div className="header-actions d-flex align-items-center gap-3 text-white">
            <span className="d-none d-sm-inline small">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="btn btn-sm btn-outline-critical"
            >
              {isLoggingOut ? 'Déconnexion…' : 'Déconnexion'}
            </button>
          </div>
        </div>
      </header>
      <div className="app-body d-md-flex">
        <nav
          ref={sidebarRef}
          aria-label="Navigation principale"
          className={`sidebar p-3 ${isSidebarOpen ? 'open' : ''}`}
          id="main-navigation"
        >
          <div className="mb-2 d-flex align-items-center justify-content-between gap-2 px-2">
            <p className="sidebar-label mb-0">Navigation</p>
            <button
              aria-label="Fermer le menu"
              className="sidebar-close btn-close d-md-none"
              type="button"
              onClick={() => setSidebarOpen(false)}
            />
          </div>
          <SidebarNavigation
            hasPermission={hasPermission}
            onNavigate={() => setSidebarOpen(false)}
          />
        </nav>
        {isSidebarOpen && (
          <button
            aria-label="Fermer la navigation"
            className="sidebar-backdrop d-md-none"
            type="button"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="app-content flex-grow-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
