import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PermissionRoute from './auth/PermissionRoute.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AppFooter from './components/AppFooter.jsx';
import Loader from './components/Loader.jsx';
import { publicRegistrationEnabled } from './config/features.js';
import AppLayout from './layouts/AppLayout.jsx';
import maintenancePermissions from './maintenance/maintenance.permissions.js';
import historyPermissions from './history/history.permissions.js';
import dashboardPermissions from './dashboard/dashboard.permissions.js';
import administrationPermissions from './permissions/administration.permissions.js';
import companyPermissions from './permissions/company.permissions.js';
import relationsPermissions from './relations/relations.permissions.js';

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage.jsx'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage.jsx'));
const MaterialDetailPage = lazy(() => import('./pages/MaterialDetailPage.jsx'));
const MaterialEditPage = lazy(() => import('./pages/MaterialEditPage.jsx'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage.jsx'));
const MaintenanceOperationsPage = lazy(() => import('./pages/MaintenanceOperationsPage.jsx'));
const MaintenancePartsPage = lazy(() => import('./pages/MaintenancePartsPage.jsx'));
const ManufacturersPage = lazy(() => import('./pages/ManufacturersPage.jsx'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage.jsx'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const RolesPage = lazy(() => import('./pages/RolesPage.jsx'));
const PermissionsPage = lazy(() => import('./pages/PermissionsPage.jsx'));
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage.jsx'));
const RelationsPage = lazy(() => import('./pages/RelationsPage.jsx'));
const secure = (permission, page) => (
  <PermissionRoute permission={permission}>{page}</PermissionRoute>
);

/** Returns the user-facing module name for a frontend path. */
export const getModuleTitle = (pathname) => {
  if (/^\/materials\/[^/]+(?:\/edit)?$/.test(pathname)) return 'Matériels';

  return (
    {
      '/': 'Tableau de bord',
      '/login': 'Connexion',
      '/register': 'Inscription',
      '/verify-email': 'Vérification de l’email',
      '/403': 'Accès refusé',
      '/dashboard': 'Tableau de bord',
      '/relations': 'Relations des entités',
      '/categories': 'Catégories',
      '/materials': 'Matériels',
      '/maintenance': 'Maintenance',
      '/maintenance/operations': 'Opérations de maintenance',
      '/maintenance/parts': 'Pièces de maintenance',
      '/manufacturers': 'Fabricants',
      '/suppliers': 'Fournisseurs',
      '/users': 'Utilisateurs',
      '/companies': 'Sociétés',
      '/roles': 'Rôles',
      '/permissions': 'Permissions',
      '/history/fleet': 'Historique de la gestion du parc',
      '/history/maintenance': 'Historique de la maintenance',
      '/history/administration': 'Historique de l’administration',
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
      <Suspense fallback={<Loader className="app-page" label="Chargement de la page" />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route
            path="/register"
            element={
              publicRegistrationEnabled ? <RegisterPage /> : <Navigate to="/login" replace />
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route path="/403" element={<ForbiddenPage />} />
            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={secure(dashboardPermissions.read, <DashboardPage />)}
              />
              <Route
                path="/relations"
                element={secure(relationsPermissions.read, <RelationsPage />)}
              />
              <Route path="/categories" element={secure('categories.read', <CategoriesPage />)} />
              <Route path="/materials" element={secure('materials.read', <MaterialsPage />)} />
              <Route
                path="/materials/:uuid"
                element={secure('materials.read', <MaterialDetailPage />)}
              />
              <Route
                path="/materials/:uuid/edit"
                element={secure('materials.update', <MaterialEditPage />)}
              />
              <Route
                path="/maintenance"
                element={secure(maintenancePermissions.plans.read, <MaintenancePage />)}
              />
              <Route
                path="/maintenance/operations"
                element={secure(
                  maintenancePermissions.operations.read,
                  <MaintenanceOperationsPage />,
                )}
              />
              <Route
                path="/maintenance/parts"
                element={secure(maintenancePermissions.parts.read, <MaintenancePartsPage />)}
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
              <Route
                path="/users"
                element={secure(administrationPermissions.users.read, <UsersPage />)}
              />
              <Route
                path="/companies"
                element={secure(companyPermissions.read, <CompaniesPage />)}
              />
              <Route
                path="/roles"
                element={secure(administrationPermissions.roles.read, <RolesPage />)}
              />
              <Route
                path="/permissions"
                element={secure(administrationPermissions.permissions.read, <PermissionsPage />)}
              />
              <Route
                path="/history/fleet"
                element={secure(historyPermissions.fleet, <HistoryPage section="fleet" />)}
              />
              <Route
                path="/history/maintenance"
                element={secure(
                  historyPermissions.maintenance,
                  <HistoryPage section="maintenance" />,
                )}
              />
              <Route
                path="/history/administration"
                element={secure(
                  historyPermissions.administration,
                  <HistoryPage section="administration" />,
                )}
              />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      <AppFooter />
    </>
  );
}
