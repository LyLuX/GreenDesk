import { NavLink, Route, Routes } from 'react-router-dom';
import ReferencePage from './pages/ReferencePage.jsx';
import { navigationItems } from './navigation.js';
const columns = (fields) => [
  ...fields.map(([key, label]) => ({ key, label })),
  { key: 'active', label: 'Statut', render: (row) => (row.active ? 'Actif' : 'Inactif') },
];
export default function App() {
  return (
    <>
      <nav className="flex gap-5 bg-slate-900 px-6 py-4 text-white">
      {navigationItems.map((item) => <NavLink key={item.path} to={item.path}>{item.label}</NavLink>)}
      </nav>
      <Routes>
        <Route
          path="/categories"
          element={
            <ReferencePage
              title="Catégories"
              path="/categories"
              fields={[
                ['name', 'Nom', true],
                ['description', 'Description'],
              ].map(([name, label, required]) => ({ name, label, required }))}
              columns={columns([
                ['name', 'Nom'],
                ['description', 'Description'],
              ])}
            />
          }
        />
        <Route
          path="/properties"
          element={
            <ReferencePage
              title="Propriétés"
              path="/properties"
              fields={[
                { name: 'name', label: 'Nom', required: true },
                { name: 'type', label: 'Type', required: true },
                { name: 'unit', label: 'Unité' },
              ]}
              columns={columns([
                ['name', 'Nom'],
                ['type', 'Type'],
                ['unit', 'Unité'],
              ])}
            />
          }
        />
        <Route
          path="/materials"
          element={
            <ReferencePage
              title="Matériaux"
              path="/materials"
              fields={[
                { name: 'name', label: 'Nom', required: true },
                { name: 'reference', label: 'Référence' },
                { name: 'unit', label: 'Unité', required: true },
                { name: 'purchasePrice', label: 'Prix achat', type: 'number', required: true },
                { name: 'salePrice', label: 'Prix vente', type: 'number', required: true },
              ]}
              columns={columns([
                ['name', 'Nom'],
                ['reference', 'Référence'],
                ['unit', 'Unité'],
                ['purchasePrice', 'Achat'],
                ['salePrice', 'Vente'],
              ])}
            />
          }
        />
        <Route
          path="*"
          element={<ReferencePage title="Catégories" path="/categories" fields={[]} columns={[]} />}
        />
      </Routes>
    </>
  );
}
