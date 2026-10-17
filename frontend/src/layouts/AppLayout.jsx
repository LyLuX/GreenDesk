import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../auth/useAuth.js';
import Icon from '../components/Icon.jsx';
import AppFooter from '../components/AppFooter.jsx';
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
    const menuButton = menuButtonRef.current;
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
      menuButton?.focus();
    };
  }, [isSidebarOpen]);
  useEffect(() => {
    const desktop = window.matchMedia?.('(min-width: 992px)');
    const closeOnDesktop = () => {
      if (desktop?.matches) setSidebarOpen(false);
    };
    desktop?.addEventListener('change', closeOnDesktop);
    return () => desktop?.removeEventListener('change', closeOnDesktop);
  }, []);
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setLoggingOut(true);
    await logout();
    notify('success', 'Vous avez été déconnecté avec succès.');
    navigate('/login', { replace: true });
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
      <div className="app-body">
        <div
          className={`sidebar-frame ${isSidebarOpen ? 'open' : ''}`}
          role={isSidebarOpen ? 'dialog' : undefined}
          aria-modal={isSidebarOpen || undefined}
          aria-label={isSidebarOpen ? 'Menu GreenDesk' : undefined}
        >
          <nav
            ref={sidebarRef}
            aria-label="Navigation principale"
            className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
            id="main-navigation"
          >
            <div className="sidebar-brand">
              <div className="product-mark">
                <Icon name="leaf" />
              </div>
              <div>
                <span className="brand-name d-block">GreenDesk</span>
                <span className="sidebar-caption">Gestion de parc</span>
              </div>
              <button
                aria-label="Fermer le menu"
                className="sidebar-close btn-close btn-close-white d-lg-none"
                type="button"
                onClick={() => setSidebarOpen(false)}
              />
            </div>
            <p className="sidebar-label">Espace de travail</p>
            <SidebarNavigation
              hasPermission={hasPermission}
              onNavigate={() => setSidebarOpen(false)}
            />
            <div className="sidebar-note">
              <Icon name="leaf" />
              <span>Un parc suivi. Des ressources préservées.</span>
            </div>
          </nav>
        </div>
        {isSidebarOpen && (
          <button
            aria-label="Fermer la navigation"
            className="sidebar-backdrop d-lg-none"
            type="button"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="app-workspace" inert={isSidebarOpen}>
          <header className="app-header">
            <div className="header-inner d-flex align-items-center justify-content-between gap-3">
              <div className="header-brand d-flex align-items-center gap-3">
                <button
                  ref={menuButtonRef}
                  aria-controls="main-navigation"
                  aria-expanded={isSidebarOpen}
                  className="btn btn-sm btn-outline-secondary d-lg-none"
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Icon name="menu" /> Menu
                </button>
                <div className="brand-lockup d-flex align-items-center gap-3">
                  <NavLink
                    className="flex-shrink-0"
                    to="/dashboard"
                    aria-label="Tableau de bord"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <CompanyLogo company={activeCompany} className="brand-logo" />
                  </NavLink>
                  <div className="header-brand-text">
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
              <div className="header-actions d-flex align-items-center gap-3">
                <span className="user-identity d-none d-sm-inline">
                  <span className="context-label d-block">Mon compte</span>
                  {user?.firstName} {user?.lastName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="btn btn-sm btn-outline-critical"
                >
                  <Icon name="logout" />
                  {isLoggingOut ? 'Déconnexion…' : 'Déconnexion'}
                </button>
              </div>
            </div>
          </header>
          <div className="app-content flex-grow-1" id="main-content" tabIndex={-1}>
            <Outlet />
          </div>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
