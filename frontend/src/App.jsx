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
import MaterialEditPage from './pages/MaterialEditPage.jsx';
import BrandsPage from './pages/BrandsPage.jsx';
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
                {
                  name: 'brandUuid',
                  label: 'Marque',
                  relation: 'brand',
                  optionsResource: 'brands',
                },
                {
                  name: 'categoryUuid',
                  label: 'Catégorie',
                  relation: 'category',
                  optionsResource: 'categories',
                },
                {
                  name: 'propertyUuid',
                  label: 'Propriété',
                  relation: 'property',
                  optionsResource: 'properties',
                },
                { name: 'model', label: 'Modèle' },
                { name: 'serialNumber', label: 'Numéro de série' },
                { name: 'year', label: 'Année', type: 'number', valueType: 'number', min: '1900' },
                { name: 'purchaseDate', label: 'Date d’achat', type: 'date' },
                {
                  name: 'currentValue',
                  label: 'Valeur actuelle',
                  type: 'number',
                  valueType: 'number',
                  step: '0.01',
                  min: '0',
                },
                {
                  name: 'engineHours',
                  label: 'Heures moteur',
                  type: 'number',
                  valueType: 'number',
                  step: '0.1',
                  min: '0',
                },
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
                ['brand', 'Marque', (value) => value?.name ?? '—'],
                ['unit', 'Unité'],
                ['purchasePrice', 'Achat', formatCurrency],
                ['salePrice', 'Vente', formatCurrency],
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
                { name: 'brandUuid', label: 'Marque', optionsResource: 'brands' },
                { name: 'categoryUuid', label: 'Catégorie', optionsResource: 'categories' },
                { name: 'propertyUuid', label: 'Propriété', optionsResource: 'properties' },
              ]}
              pagination
              detailPath={(row) => `/materials/${row.uuid}`}
            />,
          )}
        />
        <Route path="/materials/:uuid" element={secure('materials.read', <MaterialDetailPage />)} />
        <Route
          path="/materials/:uuid/edit"
          element={secure('materials.update', <MaterialEditPage />)}
        />
        <Route path="/brands" element={secure('brand.read', <BrandsPage />)} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
