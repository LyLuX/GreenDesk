import { Route, Routes } from 'react-router-dom';
import PermissionRoute from './auth/PermissionRoute.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ReferencePage from './pages/ReferencePage.jsx';
import MaterialDetailPage from './pages/MaterialDetailPage.jsx';
import { formatCurrency } from './utils/formatters.js';
const secure = (permission, page) => (
  <ProtectedRoute>
    <PermissionRoute permission={permission}>{page}</PermissionRoute>
  </ProtectedRoute>
);
const table = (keys) => [
  ...keys.map(([key, label, render]) => ({ key, label, ...(render ? { render } : {}) })),
  { key: 'active', label: 'Statut', render: (value) => (value ? 'Actif' : 'Inactif') },
];
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={secure('dashboard.read', <DashboardPage />)} />
        <Route
          path="/categories"
          element={secure(
            'categories.read',
            <ReferencePage
              title="Catégories"
              resource="categories"
              createPermission="categories.create"
              updatePermission="categories.update"
              disablePermission="categories.disable"
              fields={[
                { name: 'name', label: 'Nom', required: true },
                { name: 'description', label: 'Description' },
              ]}
              columns={table([
                ['name', 'Nom'],
                ['description', 'Description'],
              ])}
            />,
          )}
        />
        <Route
          path="/properties"
          element={secure(
            'properties.read',
            <ReferencePage
              title="Propriétés"
              resource="properties"
              createPermission="properties.create"
              updatePermission="properties.update"
              disablePermission="properties.disable"
              fields={[
                { name: 'name', label: 'Nom', required: true },
                { name: 'type', label: 'Type', required: true },
                { name: 'unit', label: 'Unité' },
              ]}
              columns={table([
                ['name', 'Nom'],
                ['type', 'Type'],
                ['unit', 'Unité'],
              ])}
            />,
          )}
        />
        <Route
          path="/materials"
          element={secure(
            'materials.read',
            <ReferencePage
              title="Matériaux"
              resource="materials"
              createPermission="materials.create"
              updatePermission="materials.update"
              disablePermission="materials.disable"
              fields={[
                { name: 'name', label: 'Nom', required: true },
                { name: 'reference', label: 'Référence' },
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
                {
                  name: 'salePrice',
                  label: 'Prix vente',
                  type: 'number',
                  valueType: 'number',
                  step: '0.01',
                  min: '0',
                  required: true,
                },
              ]}
              columns={table([
                ['name', 'Nom'],
                ['reference', 'Référence'],
                ['unit', 'Unité'],
                ['purchasePrice', 'Achat', formatCurrency],
                ['salePrice', 'Vente', formatCurrency],
              ])}
            />,
          )}
        />
        <Route path="/materials/:uuid" element={secure('materials.read', <MaterialDetailPage />)} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
