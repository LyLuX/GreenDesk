import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PermissionRoute from './auth/PermissionRoute.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AdminRoute from './auth/AdminRoute.jsx';
import MaterialManufacturerCell from './components/MaterialManufacturerCell.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ReferencePage from './pages/ReferencePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import MaterialDetailPage from './pages/MaterialDetailPage.jsx';
import MaterialEditPage from './pages/MaterialEditPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import MaintenanceOperationsPage from './pages/MaintenanceOperationsPage.jsx';
import MaintenancePartsPage from './pages/MaintenancePartsPage.jsx';
import ManufacturersPage from './pages/ManufacturersPage.jsx';
import SuppliersPage from './pages/SuppliersPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import PermissionsPage from './pages/PermissionsPage.jsx';
import { formatCurrency } from './utils/formatters.js';
const secure = (permission, page) => (
  <PermissionRoute permission={permission}>{page}</PermissionRoute>
);
const adminOnly = (page) => <AdminRoute>{page}</AdminRoute>;
const table = (keys) => [
  ...keys.map(([key, label, render]) => ({ key, label, ...(render ? { render } : {}) })),
  {
    key: 'active',
    label: 'Statut',
    render: (value) => (
      <span className={`status-badge ${value ? '' : 'inactive'}`}>
        {value ? 'Actif' : 'Inactif'}
      </span>
    ),
  },
];

/** Returns the user-facing module name for a frontend path. */
export const getModuleTitle = (pathname) => {
  if (/^\/materials\/[^/]+(?:\/edit)?$/.test(pathname)) return 'Matériels';

  return (
    {
      '/': 'Tableau de bord',
      '/login': 'Connexion',
      '/register': 'Inscription',
      '/403': 'Accès refusé',
      '/dashboard': 'Tableau de bord',
      '/categories': 'Catégories',
      '/materials': 'Matériels',
      '/maintenance': 'Maintenance',
      '/maintenance/operations': 'Opérations de maintenance',
      '/maintenance/parts': 'Pièces de maintenance',
      '/manufacturers': 'Fabricants',
      '/suppliers': 'Fournisseurs',
      '/users': 'Utilisateurs',
      '/roles': 'Rôles',
      '/permissions': 'Permissions',
    }[pathname] ?? 'Page introuvable'
  );
};

/** Updates the browser title whenever navigation changes. */
function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `GreenDesk | ${getModuleTitle(pathname)}`;
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <DocumentTitle />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/403" element={<ForbiddenPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={secure('dashboard.read', <DashboardPage />)} />
            <Route path="/categories" element={secure('categories.read', <CategoriesPage />)} />
            <Route
              path="/materials"
              element={secure(
                'materials.read',
                <ReferencePage
                  title="Matériels"
                  resource="materials"
                  createPermission="materials.create"
                  updatePermission="materials.update"
                  deletePermission="materials.delete"
                  fields={[
                    { name: 'name', label: 'Nom', required: true },
                    {
                      name: 'manufacturerUuid',
                      label: 'Fabricant',
                      relation: 'manufacturer',
                      optionsResource: 'manufacturers',
                    },
                    {
                      name: 'categoryUuid',
                      label: 'Catégorie',
                      relation: 'category',
                      optionsResource: 'categories',
                    },
                    { name: 'model', label: 'Modèle' },
                    { name: 'serialNumber', label: 'Numéro de série' },
                    { name: 'purchaseDate', label: 'Date d’achat', type: 'date' },
                    { name: 'commissionedAt', label: 'Mise en service', type: 'date' },
                    { name: 'retiredAt', label: 'Sortie de service', type: 'date' },
                    { name: 'notes', label: 'Notes', multiline: true },
                    { name: 'unit', label: 'Unité', required: true },
                    {
                      name: 'purchasePrice',
                      label: 'Prix achat',
                      type: 'number',
                      valueType: 'number',
                      step: '0.01',
                      min: '0',
                      required: true,
                    },
                  ]}
                  columns={table([
                    ['name', 'Nom'],
                    [
                      'manufacturer',
                      'Fabricant',
                      (value) => <MaterialManufacturerCell manufacturer={value} />,
                    ],
                    ['unit', 'Unité'],
                    ['purchasePrice', 'Achat', formatCurrency],
                  ])}
                  filters={[
                    {
                      name: 'active',
                      label: 'Statut',
                      options: [
                        { value: 'true', label: 'Actif' },
                        { value: 'false', label: 'Inactif' },
                      ],
                    },
                    {
                      name: 'manufacturerUuid',
                      label: 'Fabricant',
                      optionsResource: 'manufacturers',
                    },
                    { name: 'categoryUuid', label: 'Catégorie', optionsResource: 'categories' },
                  ]}
                  pagination
                  detailPath={(row) => `/materials/${row.uuid}`}
                />,
              )}
            />
            <Route
              path="/materials/:uuid"
              element={secure('materials.read', <MaterialDetailPage />)}
            />
            <Route
              path="/materials/:uuid/edit"
              element={secure('materials.update', <MaterialEditPage />)}
            />
            <Route path="/maintenance" element={secure('maintenance.read', <MaintenancePage />)} />
            <Route
              path="/maintenance/operations"
              element={secure('maintenance.read', <MaintenanceOperationsPage />)}
            />
            <Route
              path="/maintenance/parts"
              element={secure('maintenance.read', <MaintenancePartsPage />)}
            />
            <Route
              path="/manufacturers"
              element={secure('manufacturers.read', <ManufacturersPage />)}
            />
            <Route path="/suppliers" element={secure('suppliers.read', <SuppliersPage />)} />
            <Route path="/brands" element={<Navigate to="/manufacturers" replace />} />
            <Route
              path="/maintenance/manufacturers"
              element={<Navigate to="/manufacturers" replace />}
            />
            <Route path="/maintenance/suppliers" element={<Navigate to="/suppliers" replace />} />
            <Route path="/users" element={adminOnly(<UsersPage />)} />
            <Route path="/roles" element={adminOnly(<RolesPage />)} />
            <Route path="/permissions" element={adminOnly(<PermissionsPage />)} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
