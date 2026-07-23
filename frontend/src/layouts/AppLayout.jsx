import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../auth/useAuth.js';
const links = [
  { path: '/dashboard', label: 'Tableau de bord', permission: 'dashboard.read' },
  { path: '/materials', label: 'Matériels', permission: 'materials.read' },
  { path: '/categories', label: 'Catégories', permission: 'categories.read' },
  { path: '/properties', label: 'Propriétés', permission: 'properties.read' },
];
export default function AppLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
        <strong>GreenDesk</strong>
        <div className="flex items-center gap-3">
          <span>
            {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>
      <div className="md:flex">
        <nav className="flex gap-4 border-b bg-white p-4 md:block md:min-h-screen md:w-52">
          {links
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
