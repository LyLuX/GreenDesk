import {
  createMaintenancePart,
  deleteMaintenancePart,
  listMaintenanceParts,
  updateMaintenancePart,
} from '../api/maintenance.api.js';
import MaintenanceCatalogPage from './MaintenanceCatalogPage.jsx';

const fields = [
  { name: 'name', label: 'Désignation', required: true },
  { name: 'manufacturer', label: 'Fabricant' },
  { name: 'reference', label: 'Référence fabricant', required: true },
  { name: 'supplierReference', label: 'Référence fournisseur' },
  { name: 'unit', label: 'Unité', required: true, defaultValue: 'pièce' },
];

/** Dedicated exact maintenance-part management page. */
export default function MaintenancePartsPage() {
  return (
    <MaintenanceCatalogPage
      title="Pièces de maintenance"
      subtitle="Références exactes à associer aux plans et à commander"
      singular="Pièce"
      singularWithArticle="la pièce"
      fields={fields}
      columns={[
        { key: 'name', label: 'Désignation' },
        { key: 'manufacturer', label: 'Fabricant' },
        { key: 'reference', label: 'Référence fabricant' },
        { key: 'supplierReference', label: 'Référence fournisseur' },
        { key: 'unit', label: 'Unité' },
        {
          key: 'active',
          label: 'Statut',
          render: (value) => (
            <span className={`status-badge ${value ? '' : 'inactive'}`}>
              {value ? 'Active' : 'Inactive'}
            </span>
          ),
        },
      ]}
      listItems={listMaintenanceParts}
      createItem={createMaintenancePart}
      updateItem={updateMaintenancePart}
      deleteItem={deleteMaintenancePart}
    />
  );
}
